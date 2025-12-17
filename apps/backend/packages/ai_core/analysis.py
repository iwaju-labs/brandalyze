import openai
import json
from typing import Dict, List, Any
from .embeddings import EmbeddingGenerator, calculate_brand_alignment_score
import os
import sys

# Add backend directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from utils.prompt_loader import load_prompt, format_prompt

class BrandAnalyzer:
    def __init__(self, api_key: str):
        try:
            # Initialize OpenAI client with minimal parameters
            self.client = openai.OpenAI(api_key=api_key)
        except Exception as e:
            print(f"Error initializing OpenAI client: {e}")
            # Fallback for older OpenAI versions
            openai.api_key = api_key
            self.client = openai
        self.embedding_generator = EmbeddingGenerator(api_key)

    def analyze_brand_alignment(self,
                                new_text: str,
                                brand_samples: List[str],
                                max_requests_per_hour: int = 10) -> Dict[str, Any]:
        """
        Analyze how well the new text aligns with brand voice samples
        """
        try:
            new_text_embedding = self.embedding_generator.generate_embedding(
                new_text, max_requests_per_hour
            )

            if not new_text_embedding:
                return {"error": "Failed to generate embedding for new text"}

            brand_embeddings = []
            for sample in brand_samples:
                embedding = self.embedding_generator.generate_embedding(
                    sample, max_requests_per_hour
                )

                if embedding:
                    brand_embeddings.append(embedding)
                
            if not brand_embeddings:
                return {"error": "Failed to generate brand embeddings"}
            
            alignment_score = calculate_brand_alignment_score(
                new_text_embedding, brand_embeddings
            )

            # For non-streaming analysis, we'll return a placeholder for feedback
            # The actual feedback will be generated via streaming in the view
            return {
                "alignment_score": alignment_score,
                "brand_samples_analyzed": len(brand_embeddings),
                "analysis_successful": True
            }
        
        except Exception as e:
            return {"error": f"Analysis failed: {str(e)}"}
    
    def _generate_feedback_sync(self, new_text: str, brand_samples: List[str], score: float) -> Dict[str, Any]:
        """Generate AI feedback synchronously (for non-streaming use)"""
        brand_context = "\n".join([f"Brand Sample {i+1}: {sample[:200]}..."
                                   for i, sample in enumerate(brand_samples[:3])])
        
        # Load and format prompt template
        prompt_template = load_prompt('brand_alignment_analysis.txt')
        prompt = format_prompt(
            prompt_template,
            brand_context=brand_context,
            new_text=new_text,
            score=score
        )

        ai_feedback = ""

        try:
            with self.client.chat.completions.stream(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3
            ) as stream:

                for event in stream:
                    if event.type == "message.delta" and event.delta:
                        delta_text = event.delta.get("content", "")
                        ai_feedback += delta_text

            return {
                "ai_feedback": ai_feedback.strip(),
                "tone_analysis": self._extract_tone_score(score),
                "suggestions_count": ai_feedback.count("\n") + 1
            }
        except Exception as e:
            return {
                "ai_feedback": f"AI feedback unavailable {str(e)}",
                "tone_analysis": self._extract_tone_score(score), 
                "suggestions_count": 0
            }
        
    def _generate_feedback_stream(self, new_text: str, brand_samples: List[str], score: float):
        """Generate AI feedback about brand alignment"""
        brand_context = "\n".join([f"Brand Sample {i+1}: {sample[:200]}..."
                                   for i, sample in enumerate(brand_samples[:3])])
        
        # Load and format prompt template
        prompt_template = load_prompt('brand_alignment_analysis.txt')
        prompt = format_prompt(
            prompt_template,
            brand_context=brand_context,
            new_text=new_text,
            score=score
        )

        ai_feedback = ""        
        try:
            stream = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3,
                stream=True
            )

            for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    delta_text = chunk.choices[0].delta.content
                    ai_feedback += delta_text

                    yield json.dumps({
                        "ai_feedback": ai_feedback.strip(),
                        "tone_analysis": self._extract_tone_score(score),
                        "suggestions_count": ai_feedback.count("\n") + 1
                    }) + "\n"
        except Exception as e:
            yield json.dumps({
                "ai_feedback": f"AI feedback unavailable {str(e)}",
                "tone_analysis": self._extract_tone_score(score),
                "suggestions_count": 0
            }) + "\n"
    
    def _extract_tone_score(self, alignment_score: float) -> str:
        """Convert alignment score to tone description"""
        if alignment_score >= 85:
            return "Excellent brand alignment"
        elif alignment_score >= 70:
            return "Good brand alignment"
        elif alignment_score >= 55:
            return "Moderate brand alignment"
        elif alignment_score >= 40:
            return "Poor brand alignment"
        else:
            return "Very poor brand alignment"