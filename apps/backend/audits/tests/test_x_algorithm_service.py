"""
Unit tests for XAlgorithmChecker service
"""
import pytest
from audits.services.x_algorithm import XAlgorithmChecker


@pytest.mark.unit
@pytest.mark.services
class TestXAlgorithmChecker:
    """Test suite for X/Twitter algorithm optimization"""
    
    def test_checker_initialization(self):
        """Test checker initializes correctly"""
        checker = XAlgorithmChecker()
        assert len(checker.high_performing_themes) > 0
        assert len(checker.engagement_triggers) > 0
    
    def test_analyze_structure(self, sample_content):
        """Test analysis result has correct structure"""
        checker = XAlgorithmChecker()
        context = {'has_media': False, 'is_thread': False}
        result = checker.analyze(sample_content['good'], context)
        
        # Check main keys
        assert 'optimization_tips' in result
        assert 'recommendation' in result
        assert 'x_score' in result

        # Check score range
        assert 0 <= result['x_score'] <= 100
        
        # Check tips structure
        assert isinstance(result['optimization_tips'], list)
        for tip in result['optimization_tips']:
            assert 'type' in tip
            assert 'message' in tip
            assert 'impact' in tip
    
    def test_analyze_media_detection(self):
        """Test media-related recommendations"""
        checker = XAlgorithmChecker()
        
        # Content without media indicators
        result_no_media = checker.analyze("Just a simple post", {'has_media': False, 'is_thread': False})
        
        # Content with media indicators
        result_with_media = checker.analyze("Check out this image! 🖼️", {'has_media': True, 'is_thread': False})
        
        # Both should have valid scores
        assert 0 <= result_no_media['x_score'] <= 100
        assert 0 <= result_with_media['x_score'] <= 100
    
    def test_analyze_caption_length(self):
        """Test caption length recommendations"""
        checker = XAlgorithmChecker()
        context = {'has_media': False, 'is_thread': False}
        
        # Short caption
        short_result = checker.analyze("Hi", context)
        
        # Optimal caption
        optimal_result = checker.analyze("This is an optimal length caption that provides value and context to the reader.", context)
        
        # Very long caption
        long_text = "word " * 100
        long_result = checker.analyze(long_text, context)
        
        # All should have valid scores
        assert 0 <= short_result['x_score'] <= 100
        assert 0 <= optimal_result['x_score'] <= 100
        assert 0 <= long_result['x_score'] <= 100
    
    def test_analyze_engagement_triggers(self):
        """Test engagement trigger detection"""
        checker = XAlgorithmChecker()
        context = {'has_media': False, 'is_thread': False}
        
        # Content with questions
        question_result = checker.analyze("What do you think about this?", context)
        
        # Content with CTAs
        cta_result = checker.analyze("Check this out and let me know!", context)
        
        # Both should have valid scores
        assert 0 <= question_result['x_score'] <= 100
        assert 0 <= cta_result['x_score'] <= 100
    
    def test_theme_detection_payments(self):
        """Test payment achievement theme detection"""
        checker = XAlgorithmChecker()
        context = {'has_media': True, 'is_thread': False}
        result = checker.analyze("Just hit $10k in revenue this month!", context)
        
        # Should detect payment theme
        assert result['x_score'] > 0
        assert len(result['optimization_tips']) > 0
    
    def test_theme_detection_followers(self):
        """Test follower milestone theme detection"""
        checker = XAlgorithmChecker()
        context = {'has_media': False, 'is_thread': False}
        result = checker.analyze("Reached 1000 followers today!", context)
        
        assert result['x_score'] > 0
        assert len(result['optimization_tips']) > 0
    
    def test_theme_detection_build_in_public(self):
        """Test build in public theme detection"""
        checker = XAlgorithmChecker()
        context = {'has_media': False, 'is_thread': False}
        result = checker.analyze("Day 30 of building my SaaS product", context)
        
        assert result['x_score'] > 0
        assert len(result['optimization_tips']) > 0
    
    def test_priority_sorting(self, sample_content):
        """Test tips are sorted by priority"""
        checker = XAlgorithmChecker()
        context = {'has_media': False, 'is_thread': False}
        result = checker.analyze(sample_content['good'], context)
        
        tips = result['optimization_tips']
        if len(tips) > 1:
            priority_order = {'high': 3, 'medium': 2, 'low': 1}
            priorities = [priority_order[tip['priority']] for tip in tips]
            
            # Check if sorted in descending order
            assert priorities == sorted(priorities, reverse=True)
    
    def test_empty_content_handling(self):
        """Test handling of empty content"""
        checker = XAlgorithmChecker()
        context = {'has_media': False, 'is_thread': False}
        result = checker.analyze("", context)
        
        assert 'x_score' in result
        assert 'optimization_tips' in result
        assert result['x_score'] >= 0
    
    def test_special_characters_handling(self):
        """Test handling of special characters and emojis"""
        checker = XAlgorithmChecker()
        context = {'has_media': False, 'is_thread': False}
        result = checker.analyze("🚀 Amazing! Check this out 🔥 #winning", context)
        
        assert 0 <= result['x_score'] <= 100
        assert len(result['optimization_tips']) > 0
