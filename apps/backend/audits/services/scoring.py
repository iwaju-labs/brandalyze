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
        self.humor_indicators = load_data_list('humor_indicators.txt')
    
    def calculate_score(self, content: str) -> Dict:
        """
        Calculate comprehensive brand voice score
        Routes to appropriate scoring method based on content type
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
        
        content_type = self._detect_content_type(content)

        if content_type == 'shitpost':
            return self._calculate_shitpost_score(content, brand_samples, brand_embeddings, content_embedding)
        else:
            return self._calculate_standard_score(content, brand_samples, brand_embeddings, content_embedding)
        
    def _detect_content_type(self, content: str) -> str:
        """detect if post is a shitpost or a standard post"""
        lower_content = content.lower()

        # Strong shitpost-specific slang (not common in professional content)
        shitpost_slang = [
            'ratio', 'based', 'unhinged', 'chaotic', 'cursed', 'blessed',
            'delulu', 'no cap', 'bussin', 'periodt', 'chronically online',
            'touch grass', 'down bad', 'down horrendous', 'caught in 4k',
            'main character', 'npc', 'side quest', 'rent free', 'goated',
            'ate and left no crumbs', 'understood the assignment', 'it\'s giving',
            'slay', 'dead', 'screaming', 'crying', 'sobbing', 'deceased',
            'emotional damage', 'woke up and chose violence'
        ]
        slang_count = sum(1 for slang in shitpost_slang if slang in lower_content)

        # Meme format patterns (high confidence shitpost indicators)
        meme_patterns = r'^(pov:|nobody:|me:|mfw|tfw|when you|that moment when)'
        if re.search(meme_patterns, lower_content.strip(), re.IGNORECASE):
            return 'shitpost'
        
        # Multiple shitpost slang terms is a strong signal
        if slang_count >= 2:
            return 'shitpost'
        
        # Single slang term with absurdist/meme structure
        if slang_count >= 1 and re.search(r'(lmao|lol|bruh|💀|😭|🤣)', lower_content):
            return 'shitpost'
        
        return 'standard'
    
    def _calculate_standard_score(self, content: str, brand_samples, brand_embeddings, content_embedding) -> Dict:
        """Standard scoring for professional/normal content"""
        tone_score = calculate_brand_alignment_score(content_embedding, brand_embeddings)
        vocab_score = self._calculate_vocabulary_score(content, brand_samples)
        emotion_score = self._calculate_emotional_score(content, brand_samples)
        style_score = self._calculate_style_score(content, brand_samples)

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
            'content_type': 'standard',
            'metric_tips': self._generate_metric_tips(breakdown),
            'content_embedding': content_embedding
        }
    
    def _calculate_shitpost_score(self, content: str, brand_samples, brand_embeddings, content_embedding) -> Dict:
        """Shitpost-specific scoring focused on entertainment value"""
        
        entertainment_score = self._calculate_entertainment_score(content)
        personality_score = self._calculate_personality_fit(content, brand_samples, brand_embeddings, content_embedding)
        authenticity_score = self._calculate_authenticity_score(content)
        engagement_score = self._calculate_engagement_potential(content)

        total_score = (
            entertainment_score * 0.35 +
            personality_score * 0.25 +
            authenticity_score * 0.25 +
            engagement_score * 0.15
        )

        breakdown = {
            'tone_match': round(personality_score, 2),
            'vocabulary_consistency': round(entertainment_score, 2),
            'emotional_alignment': round(authenticity_score, 2),
            'style_deviation': round(100 - engagement_score, 2)
        }

        return {
            'total': round(total_score, 2),
            'breakdown': breakdown,
            'content_type': 'shitpost',
            'metric_tips': self._generate_shitpost_tips(breakdown),
            'content_embedding': content_embedding
        }
    
    def _calculate_entertainment_score(self, content: str) -> float:
        """Score based on humor density and creativity"""
        lower_content = content.lower()
        
        # Humor indicator density
        humor_count = sum(1 for word in self.humor_indicators if word in lower_content)
        humor_density = min(humor_count / 3, 1.0) * 40  # Max 40 points from density
        
        # Creativity bonus - unexpected combinations, originality
        creativity_bonus = 0
        
        # Absurdist elements
        if re.search(r'[a-z][A-Z][a-z][A-Z]', content):  # Random caps
            creativity_bonus += 15
        if re.search(r'[!?]{3,}', content):  # Excessive punctuation
            creativity_bonus += 10
        
        # Meme format recognition
        if re.search(r'pov:|nobody:|me:|mfw|tfw', lower_content):
            creativity_bonus += 20
        
        # Self-aware/meta humor
        if any(word in lower_content for word in ['posting', 'tweet', 'algorithm', 'viral', 'ratio']):
            creativity_bonus += 15
        
        return min(100, humor_density + creativity_bonus)
    
    def _calculate_personality_fit(self, content: str, brand_samples, brand_embeddings, content_embedding) -> float:
        """Check if humor style matches brand personality"""
        # Use embedding similarity but with humor-focused framing
        humor_prompt = f"The humor style and comedic energy of: {content}"
        humor_embedding = self.embedding_generator.generate_embedding(humor_prompt)
        
        if not humor_embedding or not brand_embeddings:
            return 60.0  # Neutral-ish default
        
        # Compare against brand samples' energy/vibe
        similarities = [cosine_similarity(humor_embedding, emb) for emb in brand_embeddings]
        avg_similarity = sum(similarities) / len(similarities)
        
        # Convert to 0-100 scale
        return min(100, max(0, (avg_similarity + 1) * 50))
    
    def _calculate_authenticity_score(self, content: str) -> float:
        """Detect if humor feels natural vs forced"""
        lower_content = content.lower()
        score = 70  # Start with decent baseline
        
        # Penalize over-engineering (cramming too many trendy phrases)
        trendy_phrases = ['no cap', 'fr fr', 'bussin', 'slay', 'ate', 'periodt']
        trendy_count = sum(1 for phrase in trendy_phrases if phrase in lower_content)
        if trendy_count > 3:
            score -= (trendy_count - 3) * 10  # Penalty for trying too hard
        
        # Reward natural flow - shorter sentences in shitposts are better
        words = content.split()
        if len(words) < 20:
            score += 15  # Brevity bonus
        
        # Penalize overly long "shitposts" - real ones are punchy
        if len(words) > 50:
            score -= 20
        
        return min(100, max(0, score))
    
    def _calculate_engagement_potential(self, content: str) -> float:
        """Estimate likelihood of engagement"""
        lower_content = content.lower()
        score = 50
        
        # Controversy/hot take indicators
        if any(word in lower_content for word in ['unpopular opinion', 'hot take', 'controversial', 'fight me']):
            score += 25
        
        # Relatable content
        if any(word in lower_content for word in ['when you', 'that feeling', 'we all', 'everyone']):
            score += 20
        
        # Question or call for engagement
        if '?' in content:
            score += 15
        
        # Quotable/screenshot-worthy (strong one-liner)
        sentences = [s.strip() for s in re.split(r'[.!?]+', content) if s.strip()]
        if len(sentences) == 1 and len(content) < 100:
            score += 15  # Punchy one-liner bonus
        
        return min(100, max(0, score))
    
    def _generate_shitpost_tips(self, breakdown: Dict) -> Dict[str, str]:
        """Generate tips specific to shitpost content"""
        tips = {}
        
        # Entertainment (mapped to vocabulary_consistency in breakdown)
        entertainment = breakdown['vocabulary_consistency']
        if entertainment < 50:
            tips['vocabulary_tip'] = "Needs more comedic punch. Try adding unexpected elements, absurdist humor, or a stronger punchline."
        elif entertainment < 70:
            tips['vocabulary_tip'] = "Decent humor but could hit harder. Consider a more unexpected angle or sharper delivery."
        elif entertainment < 85:
            tips['vocabulary_tip'] = "Good entertainment value. A small twist or callback could make it even better."
        else:
            tips['vocabulary_tip'] = "Great comedic execution. This should land well."
        
        # Personality fit (mapped to tone_match)
        personality = breakdown['tone_match']
        if personality < 50:
            tips['tone_tip'] = "This humor style doesn't match your brand's usual vibe. Stay consistent with your comedic voice."
        elif personality < 70:
            tips['tone_tip'] = "Somewhat on-brand. Try matching the energy level of your previous shitposts."
        elif personality < 85:
            tips['tone_tip'] = "Good personality fit. This feels like your brand's humor."
        else:
            tips['tone_tip'] = "Perfect brand personality match. Authentically your voice."
        
        # Authenticity (mapped to emotional_alignment)
        authenticity = breakdown['emotional_alignment']
        if authenticity < 50:
            tips['emotion_tip'] = "Feels forced or try-hard. Let the humor come naturally instead of cramming in trendy phrases."
        elif authenticity < 70:
            tips['emotion_tip'] = "Slightly overengineered. Simplify and let the joke breathe."
        elif authenticity < 85:
            tips['emotion_tip'] = "Feels genuine. Good natural delivery."
        else:
            tips['emotion_tip'] = "Effortlessly funny. This feels authentically you."
        
        # Engagement (mapped to style_deviation, inverted)
        engagement = 100 - breakdown['style_deviation']
        if engagement < 50:
            tips['style_tip'] = "Low engagement potential. Add a hook, question, or controversial element to spark reactions."
        elif engagement < 70:
            tips['style_tip'] = "Moderate engagement potential. A punchier closer could help drive comments."
        elif engagement < 85:
            tips['style_tip'] = "Good engagement potential. Should get solid reactions."
        else:
            tips['style_tip'] = "High engagement potential. This should spark conversation."
        
        return tips
    
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