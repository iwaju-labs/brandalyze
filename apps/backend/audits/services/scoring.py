from typing import Dict, List, Optional
import re
from collections import Counter
from brands.models import Brand, BrandSample
from ai_core.embeddings import EmbeddingGenerator, cosine_similarity, calculate_brand_alignment_score
from django.conf import settings

class BrandVoiceScorer:
    """
    Core scoring engine for brand voice alignment
    Reuses existing ai_core infrastructure
    """

    def __init__(self, brand: Brand):
        self.brand = brand
        self.embedding_generator = EmbeddingGenerator(
            api_key=settings.OPENAI_API_KEY
        )
    
    def calculate_score(self, content: str) -> Dict:
        """
        Calculate comprehensive brand voice score
        Returns dict with total score and breakdown
        """

        brand_samples = self.brand.samples.all()

        if not brand_samples.exists():
            return {
                'error': 'No brand samples. Please add brand samples first.',
                'total': 0,
                'breakdown': {}
            }
        
        content_embedding = self.embedding_generator.generate_embedding(content)

        if not content_embedding:
            return {
                'error': 'Failed to generate embedding for content',
                'total': 0,
                'breakdown': {}
            }
        
        brand_embeddings = []
        for sample in brand_samples:
            if sample.embedding:
                brand_embeddings.append(sample.embedding)

        if not brand_embeddings:
            # Generate embeddings for samples if they don't exist
            brand_embeddings = self._generate_brand_embeddings(brand_samples)
        
        # Calculate tone match using existing function (40% weight)
        tone_score = calculate_brand_alignment_score(content_embedding, brand_embeddings)
        
        # Vocabulary consistency (30% weight)
        vocab_score = self._calculate_vocabulary_score(content, brand_samples)
        
        # Emotional alignment (20% weight)
        emotion_score = self._calculate_emotional_score(content, brand_samples)
        
        # Style consistency (10% weight)
        style_score = self._calculate_style_score(content, brand_samples)
        
        # Weighted total
        total_score = (
            tone_score * 0.4 +
            vocab_score * 0.3 +
            emotion_score * 0.2 +
            style_score * 0.1
        )
        
        return {
            'total': round(total_score, 2),
            'breakdown': {
                'tone_match': round(tone_score, 2),
                'vocabulary_consistency': round(vocab_score, 2),
                'emotional_alignment': round(emotion_score, 2),
                'style_deviation': round(100 - style_score, 2)
            },
            'content_embedding': content_embedding
        }
    
    def _generate_brand_embeddings(self, brand_samples) -> List[List[float]]:
        """Generate and cache embeddings for brand samples"""
        embeddings = []
        
        for sample in brand_samples:
            embedding = self.embedding_generator.generate_embedding(sample.text)
            if embedding:
                # Cache the embedding
                sample.embedding = embedding
                sample.save()
                embeddings.append(embedding)
        
        return embeddings
    
    def _calculate_vocabulary_score(self, content: str, brand_samples) -> float:
        """
        Check vocabulary alignment with brand
        Compares word usage patterns
        """
        # Extract words from content
        content_words = re.findall(r'\b\w+\b', content.lower())
        content_word_freq = Counter(content_words)
        
        # Build brand vocabulary from samples
        brand_words = []
        for sample in brand_samples:
            brand_words.extend(re.findall(r'\b\w+\b', sample.text.lower()))
        
        brand_word_freq = Counter(brand_words)
        
        if not content_words or not brand_words:
            return 50.0  # Neutral score if no data
        
        # Calculate overlap
        common_words = set(content_words) & set(brand_words)
        
        # Weight by frequency similarity
        score = 0
        for word in common_words:
            content_freq = content_word_freq[word] / len(content_words)
            brand_freq = brand_word_freq[word] / len(brand_words)
            # Similarity between frequencies (closer = better)
            freq_similarity = 1 - abs(content_freq - brand_freq)
            score += freq_similarity
        
        # Normalize
        if common_words:
            score = (score / len(common_words)) * 100
        else:
            score = 0
        
        return min(100, max(0, score))
    
    def _calculate_emotional_score(self, content: str, brand_samples) -> float:
        """
        Analyze emotional tone alignment
        Simple sentiment matching
        """
        # Positive/negative word lists (simplified)
        positive_words = {
            'great', 'excellent', 'amazing', 'love', 'best', 'awesome',
            'fantastic', 'wonderful', 'perfect', 'brilliant', 'outstanding'
        }
        negative_words = {
            'bad', 'terrible', 'awful', 'worst', 'hate', 'horrible',
            'poor', 'disappointing', 'weak', 'fail', 'failure'
        }
        
        def get_sentiment(text: str) -> float:
            """Returns sentiment score: positive values = positive, negative = negative"""
            words = re.findall(r'\b\w+\b', text.lower())
            pos_count = sum(1 for w in words if w in positive_words)
            neg_count = sum(1 for w in words if w in negative_words)
            total = pos_count + neg_count
            if total == 0:
                return 0  # Neutral
            return (pos_count - neg_count) / total
        
        content_sentiment = get_sentiment(content)
        
        # Average sentiment of brand samples
        brand_sentiments = [get_sentiment(sample.text) for sample in brand_samples]
        avg_brand_sentiment = sum(brand_sentiments) / len(brand_sentiments) if brand_sentiments else 0
        
        # Calculate alignment (closer sentiments = higher score)
        sentiment_diff = abs(content_sentiment - avg_brand_sentiment)
        score = (1 - sentiment_diff) * 100
        
        return min(100, max(0, score))
    
    def _calculate_style_score(self, content: str, brand_samples) -> float:
        """
        Analyze writing style consistency
        Checks: sentence length, punctuation, formatting
        """
        def analyze_style(text: str) -> Dict:
            sentences = [s.strip() for s in re.split(r'[.!?]+', text) if s.strip()]
            words = re.findall(r'\b\w+\b', text)
            
            return {
                'avg_sentence_length': len(words) / len(sentences) if sentences else 0,
                'exclamation_ratio': text.count('!') / len(text) if text else 0,
                'question_ratio': text.count('?') / len(text) if text else 0,
                'comma_ratio': text.count(',') / len(text) if text else 0,
                'uppercase_ratio': sum(1 for c in text if c.isupper()) / len(text) if text else 0
            }
        
        content_style = analyze_style(content)
        
        # Average style metrics from brand samples
        brand_styles = [analyze_style(sample.text) for sample in brand_samples]
        avg_brand_style = {}
        for key in content_style.keys():
            values = [s[key] for s in brand_styles]
            avg_brand_style[key] = sum(values) / len(values) if values else 0
        
        # Calculate similarity for each metric
        similarities = []
        for key in content_style.keys():
            if avg_brand_style[key] == 0 and content_style[key] == 0:
                similarities.append(1.0)
            elif avg_brand_style[key] == 0:
                similarities.append(0.5)
            else:
                diff = abs(content_style[key] - avg_brand_style[key]) / max(avg_brand_style[key], content_style[key])
                similarity = 1 - min(diff, 1.0)
                similarities.append(similarity)
        
        score = (sum(similarities) / len(similarities)) * 100 if similarities else 50
        return min(100, max(0, score))
    
    def find_deviations(self, content: str) -> List[Dict]:
        """
        Identify specific out-of-brand phrases and patterns
        Returns list of deviations with context and suggestions
        """
        deviations = []
        
        # Check for corporate jargon (common anti-patterns)
        jargon_words = [
            'synergy', 'leverage', 'circle back', 'touch base', 'move the needle',
            'paradigm shift', 'low-hanging fruit', 'think outside the box',
            'core competency', 'bandwidth', 'deep dive', 'drill down'
        ]
        
        sentences = [s.strip() for s in re.split(r'[.!?]+', content) if s.strip()]
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            # Check jargon
            for jargon in jargon_words:
                if jargon in sentence_lower:
                    deviations.append({
                        'phrase': jargon,
                        'context': sentence,
                        'reason': 'Corporate jargon detected',
                        'severity': 'medium',
                        'suggestion': 'Use simpler, more direct language'
                    })
            
            # Check for passive voice (simplified detection)
            passive_indicators = ['was', 'were', 'been', 'being']
            if any(indicator in sentence_lower.split() for indicator in passive_indicators):
                if 'by' in sentence_lower:
                    deviations.append({
                        'phrase': sentence[:50] + '...',
                        'context': sentence,
                        'reason': 'Possible passive voice',
                        'severity': 'low',
                        'suggestion': 'Consider using active voice for clarity'
                    })
        
        return deviations