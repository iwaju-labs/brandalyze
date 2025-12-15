from typing import Dict, List, Optional
import re
from utils.prompt_loader import load_data_list


class XAlgorithmChecker:
    """
    Platform-specific optimization checker for X/Twitter
    Based on algorithm insights and best practices
    """
    
    def __init__(self):
        self.high_performing_themes = load_data_list('x_high_performing_themes.txt')
        self.engagement_triggers = load_data_list('x_engagement_triggers.txt')
        self.authentic_words = load_data_list('authentic_words.txt')
        self.humor_indicators = load_data_list('humor_indicators.txt')
    
    def analyze(self, content: str, context: Dict) -> Dict:
        """
        Analyze content against X algorithm best practices
        
        Args:
            content: Post text
            context: Dict with keys like 'has_media', 'is_thread', etc.
        
        Returns:
            Dict with score, tips, and recommendations
        """
        tips = []
        score = 100
        
        # 1. Check for media (critical for visibility)
        has_media = context.get('has_media', False)
        if not has_media:
            tips.append({
                'type': 'warning',
                'message': 'Add an image or screenshot - posts with media perform significantly better',
                'impact': 'high',
                'priority': 1
            })
            score -= 20
        else:
            tips.append({
                'type': 'success',
                'message': 'Good! Media detected - this helps with visibility',
                'impact': 'positive',
                'priority': 5
            })
        
        # 2. Caption quality (X heavily penalizes bad/missing captions)
        if not content or len(content.strip()) < 10:
            tips.append({
                'type': 'error',
                'message': 'Caption too short or missing - X heavily penalizes bad captions',
                'impact': 'critical',
                'priority': 1
            })
            score -= 30
# apps/backend/audits/services/x_algorithm.py
        elif len(content.strip()) < 50:
            tips.append({
                'type': 'warning',
                'message': 'Caption is quite short - consider adding more context',
                'impact': 'medium',
                'priority': 2
            })
            score -= 10
        
        # 3. Check for engagement triggers
        triggers_found = []
        
        if '?' in content:
            triggers_found.append('question')
            tips.append({
                'type': 'success',
                'message': 'Question detected - encourages replies',
                'impact': 'positive',
                'priority': 4
            })
        
        # Emoji detection
        emoji_pattern = re.compile(r'[\U0001F300-\U0001F9FF]')
        if emoji_pattern.search(content):
            triggers_found.append('emoji')
        
        # Number/achievement pattern (e.g., "10x", "5 ways", "$1000")
        if re.search(r'\d+[xX]|\d+\s*ways|\$\d+|#\d+', content):
            triggers_found.append('number')
            tips.append({
                'type': 'success',
                'message': 'Numbers/metrics detected - concrete data performs well',
                'impact': 'positive',
                'priority': 4
            })
        
        if not triggers_found:
            tips.append({
                'type': 'suggestion',
                'message': 'Add engagement triggers: questions, emojis, numbers, or achievements',
                'impact': 'medium',
                'priority': 2
            })
            score -= 10
        
        # 4. Check for relatability/authenticity
        if any(word in content.lower() for word in self.authentic_words):
            tips.append({
                'type': 'success',
                'message': 'Relatable/authentic language detected - this resonates well',
                'impact': 'positive',
                'priority': 4
            })
        
        # 5. Check theme alignment (high-performing content types)
        theme_detected = self._detect_theme(content)
        if theme_detected:
            tips.append({
                'type': 'success',
                'message': f'High-performing theme detected: {theme_detected}',
                'impact': 'positive',
                'priority': 5
            })
        
        # 6. Pinning recommendation
        if context.get('is_thread', False) or has_media:
            tips.append({
                'type': 'suggestion',
                'message': 'Consider pinning this post - it can push it to For You Page',
                'impact': 'medium',
                'priority': 3
            })
        
        # 7. Length check (not too long)
        if len(content) > 280:
            tips.append({
                'type': 'info',
                'message': 'Long post - make sure opening line is strong to maintain attention',
                'impact': 'low',
                'priority': 3
            })
        
        # Sort tips by priority
        tips.sort(key=lambda x: x['priority'])
        
        return {
            'x_score': max(0, min(100, score)),
            'optimization_tips': tips,
            'triggers_found': triggers_found,
            'theme': theme_detected,
            'recommendation': self._generate_recommendation(score, tips)
        }
    
    def _detect_theme(self, content: str) -> Optional[str]:
        """Detect if content matches high-performing themes"""
        lower_content = content.lower()
        
        # Shitpost/humor detection (check first - entertainment is prioritized in Dec 2025 algorithm)
        humor_count = sum(1 for word in self.humor_indicators if word in lower_content)
        if humor_count >= 2:
            return 'shitpost'
        
        # Meme format detection
        if re.search(r'pov:|nobody:|me:|when you|that moment when|mfw|tfw', lower_content, re.IGNORECASE):
            return 'meme_format'
        
        # Payments/revenue theme
        if any(word in lower_content for word in ['payment', 'revenue', 'mrr', 'arr', '$', 'paid', 'stripe']):
            if 'screenshot' in lower_content or 'dashboard' in lower_content:
                return 'stripe_screenshots'
            return 'payments'
        
        # Follower achievements
        if any(word in lower_content for word in ['follower', 'subscriber', 'grew', 'reached', 'milestone']):
            return 'follower_achievements'
        
        # Build in public
        if any(phrase in lower_content for phrase in ['building', 'build in public', '#buildinpublic', 'shipping']):
            return 'build_in_public'
        
        # Engagement bait indicators
        if any(word in lower_content for word in ['unpopular opinion', 'hot take', 'controversial', 'ratio', 'based']):
            return 'engagement_bait'
        
        return None
    
    def _generate_recommendation(self, score: int, tips: List[Dict]) -> str:
        """Generate overall recommendation based on score"""
        if score >= 80:
            return "Excellent! This post follows X algorithm best practices and should perform well."
        elif score >= 60:
            return "Good post, but could be optimized further. Check the tips above."
        elif score >= 40:
            return "This post needs improvement. Address the warnings to increase visibility."
        else:
            return "Consider revising this post - it may significantly underperform. Fix critical issues first."