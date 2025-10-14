"""Embedding generation and vector storage"""
import openai
import numpy as np
from typing import List, Optional
import time
from functools import lru_cache

class EmbeddingGenerator:
    def __init__(self, api_key: str, model: str = "text-embedding-3-small"):
        try:
            self.client = openai.OpenAI(api_key=api_key)
        except TypeError:
            # Fallback for older OpenAI versions
            openai.api_key = api_key
            self.client = openai
        self.model = model
        self.request_times = []
    
    def _check_rate_limit(self, max_per_hour: int = 10):
        current_time = time.time()
        self.request_times = [t for t in self.request_times if current_time - t < 3600]

        if len(self.request_times) >= max_per_hour:
            sleep_time = 3600 - (current_time - self.request_times[0])
            time.sleep(sleep_time)

        self.request_times.append(current_time)

    def generate_embedding(self, text: str, max_per_hour: int = 50) -> Optional[List[float]]:
        """Generate embedding for text with rate limiting"""
        try:
            self._check_rate_limit(max_per_hour)

            response = self.client.embeddings.create(
                model=self.model,
                input=text.strip()
            )
            return response.data[0].embedding
        
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return None

    @lru_cache(maxsize=100)    
    def generate_cached_embedding(self, text: str) -> Optional[List[float]]:
        """cached version for repeated text"""
        return self.generate_embedding(text)
    
def cosine_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """Calculate cosine similarity between two embeddings"""
    vec1 = np.array(embedding1)
    vec2 = np.array(embedding2)

    dot_product = np.dot(vec1, vec2)
    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)

    if norm1 == 0 or norm2 == 0:
        return 0.0
        
    return dot_product / (norm1 * norm2)
    
def calculate_brand_alignment_score(new_text_embedding: List[float], brand_embeddings: List[List[float]]) -> float:
    """Calculate alignment score (0-100) between new text and brand samples"""
    if not brand_embeddings:
        return 50.0
        
    similaritites = [
        cosine_similarity(new_text_embedding, brand_emb)
        for brand_emb in brand_embeddings
    ]

    avg_similarity = sum(similaritites) / len(similaritites)
    # convert similarity from [-1, 1] to [0, 100]
    return round((avg_similarity + 1) * 50, 1)