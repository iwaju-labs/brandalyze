from typing import Dict, List, Optional
import re
from collections import Counter
from brands.models import Brand, BrandSample
from packages.ai_core.embeddings import EmbeddingGenerator, cosine_similarity, calculate_brand_alignment_score
from django.conf import settings
from utils.prompt_loader import load_prompt, load_data_list, format_prompt
import openai

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
        self.jargon_words = load_data_list('corporate_jargon.txt')
    
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
        
        breakdown = {
            'tone_match': round(tone_score, 2),
            'vocabulary_consistency': round(vocab_score, 2),
            'emotional_alignment': round(emotion_score, 2),
            'style_deviation': round(100 - style_score, 2)
        }
        
        return {
            'total': round(total_score, 2),
            'breakdown': breakdown,
            'metric_tips': self._generate_metric_tips(breakdown),
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
        Analyze emotional tone alignment using embeddings
        Compares emotional context via semantic similarity
        """
        # Generate embedding for the content's emotional context
        # We prepend an emotional framing prompt to focus the embedding
        emotional_prompt = f"The emotional tone and feeling of this text: {content}"
        content_emotion_embedding = self.embedding_generator.generate_embedding(emotional_prompt)
        
        if not content_emotion_embedding:
            return 50.0  # Neutral fallback
        
        # Generate emotional embeddings for brand samples
        brand_emotion_embeddings = []
        for sample in brand_samples:
            sample_prompt = f"The emotional tone and feeling of this text: {sample.text}"
            sample_embedding = self.embedding_generator.generate_embedding(sample_prompt)
            if sample_embedding:
                brand_emotion_embeddings.append(sample_embedding)
        
        if not brand_emotion_embeddings:
            return 50.0  # Neutral fallback
        
        # Calculate average similarity
        similarities = [
            cosine_similarity(content_emotion_embedding, brand_emb)
            for brand_emb in brand_emotion_embeddings
        ]
        avg_similarity = sum(similarities) / len(similarities)
        
        # Convert from [-1, 1] to [0, 100]
        score = (avg_similarity + 1) * 50
        
        return min(100, max(0, round(score, 2)))
    
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
    
    def _generate_metric_tips(self, breakdown: Dict) -> Dict[str, str]:
        """Generate improvement tips based on metric scores"""
        tips = {}
        
        # Tone match tips
        tone = breakdown['tone_match']
        if tone < 50:
            tips['tone_tip'] = "Your tone differs significantly from your brand voice. Try matching the energy, formality, and attitude of your brand samples more closely."
        elif tone < 70:
            tips['tone_tip'] = "Your tone is somewhat off-brand. Consider adjusting your writing style to better reflect your brand's personality and communication approach."
        elif tone < 85:
            tips['tone_tip'] = "Good tone alignment. Fine-tune by using similar sentence structures and expressions as your brand samples."
        else:
            tips['tone_tip'] = "Excellent tone match. Your writing captures your brand voice well."
        
        # Vocabulary tips
        vocab = breakdown['vocabulary_consistency']
        if vocab < 50:
            tips['vocabulary_tip'] = "Your word choices differ significantly from your brand vocabulary. Review your brand samples and incorporate more of those specific words and phrases."
        elif vocab < 70:
            tips['vocabulary_tip'] = "Consider using more words and phrases that appear in your brand samples. This helps maintain vocabulary consistency."
        elif vocab < 85:
            tips['vocabulary_tip'] = "Good vocabulary alignment. Try incorporating a few more brand-specific terms or expressions."
        else:
            tips['vocabulary_tip'] = "Great use of brand vocabulary. Your word choices align well with your brand voice."
        
        # Emotional alignment tips
        emotion = breakdown['emotional_alignment']
        if emotion < 50:
            tips['emotion_tip'] = "The emotional tone of your content doesn't match your brand. Consider whether your brand voice is typically enthusiastic, calm, urgent, or casual, and adjust accordingly."
        elif emotion < 70:
            tips['emotion_tip'] = "Your emotional tone could better match your brand. Try to evoke similar feelings as your brand samples."
        elif emotion < 85:
            tips['emotion_tip'] = "Good emotional alignment. Small adjustments in enthusiasm or intensity could improve this further."
        else:
            tips['emotion_tip'] = "Excellent emotional alignment. Your content evokes the right feelings for your brand."
        
        # Style tips (note: style_deviation is inverted, lower is better)
        style_score = 100 - breakdown['style_deviation']
        if style_score < 50:
            tips['style_tip'] = "Your writing style differs significantly from your brand. Check sentence length, punctuation usage, and formatting patterns in your brand samples."
        elif style_score < 70:
            tips['style_tip'] = "Consider matching your sentence structure and punctuation patterns more closely to your brand samples."
        elif style_score < 85:
            tips['style_tip'] = "Good style consistency. Minor adjustments to sentence length or punctuation could help."
        else:
            tips['style_tip'] = "Excellent style consistency. Your formatting and structure match your brand well."
        
        return tips
    
    def find_deviations(self, content: str) -> List[Dict]:
        """
        Identify specific out-of-brand phrases and patterns
        Returns list of deviations with context and suggestions
        """
        deviations = []
        
        sentences = [s.strip() for s in re.split(r'[.!?]+', content) if s.strip()]
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            
            # Check jargon
            for jargon in self.jargon_words:
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

    def generate_ai_feedback(self, content: str, platform: str = 'twitter', has_media: bool = False) -> Optional[str]:
        """
        Generate AI feedback for post optimization
        Focuses on X algorithm best practices (December 2025 Grok-powered algorithm)
        """
        if platform != 'twitter':
            return None
        
        try:
            client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
            
            # Load prompt template and format it
            prompt_template = load_prompt('x_post_optimization.txt')
            prompt = format_prompt(
                prompt_template, 
                content=content,
                has_media="Yes" if has_media else "No"
            )
            
            # Load system message
            system_message = load_prompt('x_system_message.txt')

            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": system_message
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                max_tokens=400,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating AI feedback: {e}")
            return None