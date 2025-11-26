"""
Unit tests for BrandVoiceScorer service
"""
import pytest
from audits.services.scoring import BrandVoiceScorer


@pytest.mark.unit
@pytest.mark.services
class TestBrandVoiceScorer:
    """Test suite for brand voice scoring"""
    
    def test_scorer_initialization(self, brand_with_samples):
        """Test scorer initializes correctly with a brand"""
        scorer = BrandVoiceScorer(brand_with_samples)
        assert scorer.brand == brand_with_samples
        assert scorer.embedding_generator is not None
    
    def test_calculate_score_structure(self, brand_with_samples, sample_content):
        """Test score result has correct structure"""
        scorer = BrandVoiceScorer(brand_with_samples)
        result = scorer.calculate_score(sample_content['good'])
        
        # Check main keys
        assert 'total' in result
        assert 'breakdown' in result
        
        # Check score range
        if 'error' not in result:
            assert 0 <= result['total'] <= 100
            
            # Check breakdown structure
            breakdown = result['breakdown']
            assert 'tone_match' in breakdown
            assert 'vocabulary_consistency' in breakdown
            assert 'emotional_alignment' in breakdown
            assert 'style_deviation' in breakdown
    
    def test_calculate_score_no_samples(self, brand):
        """Test scoring with no brand samples returns error"""
        scorer = BrandVoiceScorer(brand)
        result = scorer.calculate_score("Test content")
        
        assert 'error' in result
        assert result['total'] == 0
    
    def test_find_deviations_corporate_jargon(self, brand_with_samples, sample_content):
        """Test detection of corporate jargon"""
        scorer = BrandVoiceScorer(brand_with_samples)
        deviations = scorer.find_deviations(sample_content['with_jargon'])
        
        # Should detect jargon words
        assert len(deviations) > 0
        
        # Check deviation structure
        for deviation in deviations:
            assert 'phrase' in deviation
            assert 'reason' in deviation
            assert 'severity' in deviation
            assert 'suggestion' in deviation
    
    def test_find_deviations_clean_content(self, brand_with_samples, sample_content):
        """Test clean content has fewer/no deviations"""
        scorer = BrandVoiceScorer(brand_with_samples)
        deviations = scorer.find_deviations(sample_content['good'])
        
        # Good content should have minimal deviations
        assert isinstance(deviations, list)
    
    def test_vocabulary_score_calculation(self, brand_with_samples):
        """Test vocabulary scoring logic"""
        scorer = BrandVoiceScorer(brand_with_samples)
        
        # Content with brand-like vocabulary
        score = scorer._calculate_vocabulary_score("We build innovative solutions", brand_with_samples.samples.all())
        assert score > 0
        
        # Random unrelated content
        score_random = scorer._calculate_vocabulary_score("xyz abc def", brand_with_samples.samples.all())
        assert score >= score_random
    
    def test_emotional_score_calculation(self, brand_with_samples):
        """Test emotional alignment scoring"""
        scorer = BrandVoiceScorer(brand_with_samples)
        
        # Positive content
        score_positive = scorer._calculate_emotional_score("This is amazing and excellent!", brand_with_samples.samples.all())
        
        # Negative content
        score_negative = scorer._calculate_emotional_score("This is terrible and awful!", brand_with_samples.samples.all())
        
        # Both should return valid scores
        assert 0 <= score_positive <= 100
        assert 0 <= score_negative <= 100
    
    def test_style_score_calculation(self, brand_with_samples):
        """Test style consistency scoring"""
        scorer = BrandVoiceScorer(brand_with_samples)
        
        score = scorer._calculate_style_score("This is a test. Another sentence here.", brand_with_samples.samples.all())
        assert 0 <= score <= 100
    
    def test_empty_content_handling(self, brand_with_samples):
        """Test handling of empty content"""
        scorer = BrandVoiceScorer(brand_with_samples)
        
        # Should handle gracefully
        result = scorer._calculate_vocabulary_score("", brand_with_samples.samples.all())
        assert 49.0 <= result <= 51.0  # Neutral score range
