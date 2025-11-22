# Profile & Post Audit Feature - Implementation Plan

## Overview
Transform Brandalyze into a workflow-integrated tool with real-time brand voice auditing. This feature evaluates content as users write it and provides X/Twitter algorithm optimization tips.

---

## Architecture

### Core Components

1. **Backend Services** (`apps/backend/audits/`)
   - Embedding generation and storage
   - Cosine similarity calculation
   - Brand voice scoring engine
   - Historical tracking and analytics
   - X algorithm compliance checker

2. **Extension Integration** (`apps/extension/`)
   - Floating "Audit Post" button overlay
   - Content capture from text fields
   - Real-time analysis UI
   - Rewrite suggestion interface

3. **Frontend Dashboard** (`apps/frontend/`)
   - Historical audit tracking
   - Trend visualization
   - Drift alerts management
   - Performance correlation charts

---

## Implementation Steps

### Phase 1: Backend Foundation

#### Step 1.1: Database Models
Create new Django app for audits:

```bash
cd apps/backend
python manage.py startapp audits
```

Models needed:
- `BrandVoiceProfile` - Store user's baseline voice embeddings
- `PostAudit` - Individual audit records
- `AuditMetrics` - Detailed scoring breakdown
- `DriftAlert` - Track voice inconsistencies
- `XAlgorithmCheck` - Platform-specific optimization checks

#### Step 1.2: Embedding Service
Set up vector embedding generation:
- Choose embedding model (sentence-transformers, OpenAI, etc.)
- Create service class for embedding generation
- Implement caching strategy
- Store embeddings efficiently (PostgreSQL with pgvector or separate vector DB)

#### Step 1.3: Scoring Engine
Build the core analysis system:
- Cosine similarity calculator
- Tone matching algorithm
- Vocabulary consistency checker
- Emotional alignment analyzer
- Phrase deviation detector
- Style deviation metrics

#### Step 1.4: X Algorithm Analyzer
Create platform-specific optimization checker:
- Media presence detection
- Caption quality scoring
- Engagement trigger identification
- Content theme classification
- Timing/structure analysis

### Phase 2: Browser Extension Enhancement

#### Step 2.1: Content Detection
- DOM observer for text fields
- Platform detection (LinkedIn, X, Instagram, etc.)
- Text extraction utilities
- Context preservation

#### Step 2.2: Floating Button UI
- Inject button overlay
- Position management
- Show/hide logic based on focus
- Visual states (idle, analyzing, complete)

#### Step 2.3: Audit Panel
- Slide-in analysis panel
- Real-time score display
- Metric breakdown visualization
- Rewrite suggestion interface
- X optimization tips display

#### Step 2.4: API Integration
- POST audit request to backend
- Handle authentication tokens
- Streaming responses for large content
- Error handling and retry logic

### Phase 3: Frontend Dashboard

#### Step 3.1: Audit History Page
- List view of all audited posts
- Filter by platform, date, score
- Search functionality
- Export capabilities

#### Step 3.2: Analytics Dashboard
- Brand voice consistency trends
- Score distribution charts
- Platform performance comparison
- Time-series analysis
- Drift pattern visualization

#### Step 3.3: Drift Alerts
- Alert notification system
- Threshold configuration
- Alert history
- Remediation suggestions

#### Step 3.4: Profile Management
- View current brand voice profile
- Refresh/retrain profile option
- Sample content management
- Profile version history

### Phase 4: Advanced Features

#### Step 4.1: Rewrite Engine
- Integration with LLM (OpenAI, Claude, etc.)
- Prompt engineering for brand voice
- Multi-option generation
- Side-by-side comparison

#### Step 4.2: Inline Suggestions
- Grammarly-style highlighting
- Specific phrase recommendations
- Click-to-replace functionality
- Explanation tooltips

#### Step 4.3: Team Features
- Shared brand voice profiles
- Team audit history
- Collaborative editing
- Permission management

---

## Testing Framework Setup

### Backend Testing

```python
# apps/backend/audits/tests/test_scoring_engine.py
import pytest
from audits.services.scoring import BrandVoiceScorer

@pytest.fixture
def sample_profile():
    return {
        'tone_embedding': [...],
        'vocabulary': ['authentic', 'innovative', ...],
        'style_metrics': {...}
    }

@pytest.fixture
def sample_post():
    return "This is a test post that needs auditing..."

def test_calculate_brand_voice_score(sample_profile, sample_post):
    scorer = BrandVoiceScorer(sample_profile)
    score = scorer.calculate_score(sample_post)
    assert 0 <= score <= 100
    assert 'tone_match' in score.breakdown
    assert 'vocabulary_consistency' in score.breakdown

def test_identify_out_of_brand_phrases(sample_profile, sample_post):
    scorer = BrandVoiceScorer(sample_profile)
    deviations = scorer.find_deviations(sample_post)
    assert isinstance(deviations, list)
```

### Extension Testing

```javascript
// apps/extension/src/tests/contentDetection.test.ts
import { detectTextFields, shouldShowAuditButton } from '../services/contentDetection';

describe('Content Detection', () => {
  test('detects LinkedIn post box', () => {
    document.body.innerHTML = '<div class="ql-editor" contenteditable="true"></div>';
    const fields = detectTextFields();
    expect(fields.length).toBe(1);
    expect(fields[0].platform).toBe('linkedin');
  });

  test('detects Twitter compose box', () => {
    document.body.innerHTML = '<div data-testid="tweetTextarea_0"></div>';
    const fields = detectTextFields();
    expect(fields.length).toBe(1);
    expect(fields[0].platform).toBe('twitter');
  });
});
```

### E2E Testing

```typescript
// apps/frontend/tests/e2e/audit-workflow.spec.ts
import { test, expect } from '@playwright/test';

test('complete audit workflow', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Navigate to test post
  await page.click('[data-testid="new-audit"]');
  
  // Enter content
  await page.fill('[data-testid="post-content"]', 'Test content here...');
  
  // Trigger audit
  await page.click('[data-testid="audit-button"]');
  
  // Wait for results
  await expect(page.locator('[data-testid="audit-score"]')).toBeVisible();
  
  // Check score is valid
  const score = await page.locator('[data-testid="audit-score"]').textContent();
  expect(parseInt(score)).toBeGreaterThanOrEqual(0);
  expect(parseInt(score)).toBeLessThanOrEqual(100);
});
```

---

## API Endpoints Design

### POST `/api/audits/analyze`
Request:
```json
{
  "content": "Post text to analyze...",
  "platform": "twitter",
  "context": {
    "has_media": true,
    "is_thread": false
  }
}
```

Response:
```json
{
  "audit_id": "uuid",
  "score": 87,
  "breakdown": {
    "tone_match": 90,
    "vocabulary_consistency": 85,
    "emotional_alignment": 88,
    "style_deviation": 5
  },
  "deviations": [
    {
      "phrase": "synergy",
      "reason": "Not in brand vocabulary",
      "suggestion": "collaboration"
    }
  ],
  "x_optimization": {
    "has_media": true,
    "caption_quality": 85,
    "engagement_triggers": ["question", "emoji"],
    "tips": [
      "Consider pinning this post for visibility",
      "Good use of media - keep it up"
    ]
  }
}
```

### GET `/api/audits/history`
Query params: `platform`, `start_date`, `end_date`, `min_score`

### GET `/api/audits/trends`
Returns time-series data for analytics dashboard

### POST `/api/audits/rewrite`
Request:
```json
{
  "content": "Original text...",
  "target_score": 90,
  "preserve_meaning": true
}
```

### GET `/api/audits/drift-alerts`
Returns active drift alerts

---

## Useful Code Snippets

### Embedding Generation Service

```python
# apps/backend/audits/services/embeddings.py
from sentence_transformers import SentenceTransformer
from typing import List
import numpy as np

class EmbeddingService:
    def __init__(self, model_name='all-MiniLM-L6-v2'):
        self.model = SentenceTransformer(model_name)
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embedding vector for text"""
        return self.model.encode(text, convert_to_numpy=True)
    
    def calculate_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Calculate cosine similarity between two embeddings"""
        dot_product = np.dot(embedding1, embedding2)
        norm_product = np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
        return float(dot_product / norm_product)
    
    def generate_profile_embedding(self, samples: List[str]) -> np.ndarray:
        """Generate average embedding from multiple samples"""
        embeddings = [self.generate_embedding(sample) for sample in samples]
        return np.mean(embeddings, axis=0)
```

### Brand Voice Scoring Engine

```python
# apps/backend/audits/services/scoring.py
from typing import Dict, List
import re
from collections import Counter

class BrandVoiceScorer:
    def __init__(self, profile_data: Dict):
        self.profile_embedding = profile_data['embedding']
        self.vocabulary = set(profile_data['vocabulary'])
        self.tone_markers = profile_data['tone_markers']
        self.style_patterns = profile_data['style_patterns']
    
    def calculate_score(self, content: str) -> Dict:
        """Calculate comprehensive brand voice score"""
        embedding_service = EmbeddingService()
        content_embedding = embedding_service.generate_embedding(content)
        
        # Tone match (40% weight)
        tone_score = embedding_service.calculate_similarity(
            self.profile_embedding, 
            content_embedding
        ) * 100
        
        # Vocabulary consistency (30% weight)
        vocab_score = self._calculate_vocabulary_score(content)
        
        # Emotional alignment (20% weight)
        emotion_score = self._calculate_emotional_score(content)
        
        # Style consistency (10% weight)
        style_score = self._calculate_style_score(content)
        
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
            }
        }
    
    def _calculate_vocabulary_score(self, content: str) -> float:
        """Check vocabulary alignment with brand"""
        words = re.findall(r'\b\w+\b', content.lower())
        brand_words = [w for w in words if w in self.vocabulary]
        if not words:
            return 0
        return (len(brand_words) / len(words)) * 100
    
    def find_deviations(self, content: str) -> List[Dict]:
        """Identify out-of-brand phrases"""
        deviations = []
        sentences = content.split('.')
        
        for sentence in sentences:
            # Check for corporate jargon
            jargon = ['synergy', 'leverage', 'circle back', 'touch base']
            for word in jargon:
                if word in sentence.lower():
                    deviations.append({
                        'phrase': word,
                        'context': sentence.strip(),
                        'reason': 'Corporate jargon detected',
                        'severity': 'medium'
                    })
        
        return deviations
```

### X Algorithm Checker

```python
# apps/backend/audits/services/x_algorithm.py
from typing import Dict, List
import re

class XAlgorithmChecker:
    def __init__(self):
        self.high_performing_themes = [
            'stripe_screenshots', 'payments', 'follower_achievements',
            'shitposts', 'ragebait', 'build_in_public'
        ]
        self.engagement_triggers = [
            'question', 'controversial', 'achievement', 'number', 'emoji'
        ]
    
    def analyze(self, content: str, context: Dict) -> Dict:
        """Analyze content against X algorithm best practices"""
        tips = []
        score = 100
        
        # Check for media
        has_media = context.get('has_media', False)
        if not has_media:
            tips.append({
                'type': 'warning',
                'message': 'Add an image or screenshot - posts with media perform better',
                'impact': 'high'
            })
            score -= 20
        
        # Check caption quality
        if not content or len(content) < 10:
            tips.append({
                'type': 'error',
                'message': 'Caption too short or missing - X heavily penalizes bad captions',
                'impact': 'critical'
            })
            score -= 30
        
        # Check for engagement triggers
        triggers_found = []
        if '?' in content:
            triggers_found.append('question')
        if any(emoji in content for emoji in '😂🔥💯🚀'):
            triggers_found.append('emoji')
        if re.search(r'\d+[xX]', content):
            triggers_found.append('multiplier')
        
        if not triggers_found:
            tips.append({
                'type': 'suggestion',
                'message': 'Add engagement triggers: questions, emojis, or achievements',
                'impact': 'medium'
            })
            score -= 10
        
        # Check for relatability
        if any(word in content.lower() for word in ['authentic', 'honest', 'real', 'truth']):
            tips.append({
                'type': 'success',
                'message': 'Good - relatable and authentic content performs well',
                'impact': 'positive'
            })
        
        # Check theme alignment
        theme_detected = self._detect_theme(content)
        if theme_detected:
            tips.append({
                'type': 'success',
                'message': f'High-performing theme detected: {theme_detected}',
                'impact': 'positive'
            })
        
        return {
            'score': max(0, score),
            'tips': tips,
            'triggers_found': triggers_found,
            'theme': theme_detected,
            'recommendation': self._generate_recommendation(score, tips)
        }
    
    def _detect_theme(self, content: str) -> str:
        """Detect if content matches high-performing themes"""
        lower_content = content.lower()
        if any(word in lower_content for word in ['payment', 'revenue', 'mrr', '$']):
            return 'payments'
        if any(word in lower_content for word in ['follower', 'subscriber', 'grew']):
            return 'follower_achievements'
        if 'building' in lower_content or '#buildinpublic' in lower_content:
            return 'build_in_public'
        return None
    
    def _generate_recommendation(self, score: int, tips: List[Dict]) -> str:
        """Generate overall recommendation"""
        if score >= 80:
            return "Great! This post follows X algorithm best practices."
        elif score >= 60:
            return "Good post, but could be optimized further."
        else:
            return "Consider revising - this post may underperform."
```

### Extension: Content Detection

```typescript
// apps/extension/src/services/contentDetection.ts
interface TextFieldInfo {
  element: HTMLElement;
  platform: string;
  type: 'post' | 'comment' | 'dm' | 'bio';
}

export class ContentDetector {
  private platformSelectors = {
    twitter: {
      post: '[data-testid="tweetTextarea_0"]',
      comment: '[data-testid="tweetTextarea_0"][aria-label*="reply"]'
    },
    linkedin: {
      post: '.ql-editor[contenteditable="true"]',
      comment: '.comments-comment-texteditor'
    },
    instagram: {
      caption: 'textarea[aria-label*="caption"]',
      comment: 'textarea[aria-label*="comment"]'
    }
  };
  
  detectActiveField(): TextFieldInfo | null {
    const activeElement = document.activeElement as HTMLElement;
    
    for (const [platform, selectors] of Object.entries(this.platformSelectors)) {
      for (const [type, selector] of Object.entries(selectors)) {
        if (activeElement.matches(selector)) {
          return {
            element: activeElement,
            platform,
            type: type as 'post' | 'comment' | 'dm' | 'bio'
          };
        }
      }
    }
    
    return null;
  }
  
  extractContent(field: TextFieldInfo): string {
    if (field.element.tagName === 'TEXTAREA') {
      return (field.element as HTMLTextAreaElement).value;
    }
    return field.element.innerText || '';
  }
  
  hasMedia(field: TextFieldInfo): boolean {
    const container = field.element.closest('[role="dialog"], .composer, form');
    if (!container) return false;
    
    const mediaSelectors = [
      'img[src]',
      'video[src]',
      '[data-testid*="media"]',
      '.uploaded-image'
    ];
    
    return mediaSelectors.some(selector => container.querySelector(selector) !== null);
  }
}
```

### Extension: Floating Button

```typescript
// apps/extension/src/components/AuditButton.ts
export class AuditButton {
  private button: HTMLButtonElement;
  private targetField: HTMLElement | null = null;
  
  constructor() {
    this.button = this.createButton();
    this.attachEventListeners();
  }
  
  private createButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.id = 'brandalyze-audit-btn';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 20 20">
        <path d="M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8Z" fill="currentColor"/>
      </svg>
      <span>Audit Post</span>
    `;
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 24px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(10px);
    `;
    
    return button;
  }
  
  show(targetField: HTMLElement) {
    this.targetField = targetField;
    document.body.appendChild(this.button);
    
    // Position near the field
    const rect = targetField.getBoundingClientRect();
    this.button.style.top = `${rect.bottom + 10}px`;
    this.button.style.left = `${rect.right - this.button.offsetWidth}px`;
    
    requestAnimationFrame(() => {
      this.button.style.opacity = '1';
      this.button.style.transform = 'translateY(0)';
    });
  }
  
  hide() {
    this.button.style.opacity = '0';
    this.button.style.transform = 'translateY(10px)';
    setTimeout(() => {
      this.button.remove();
    }, 300);
  }
  
  setLoading(loading: boolean) {
    if (loading) {
      this.button.innerHTML = `
        <div class="spinner"></div>
        <span>Analyzing...</span>
      `;
      this.button.disabled = true;
    } else {
      this.button.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M10 2L12 8L18 10L12 12L10 18L8 12L2 10L8 8Z" fill="currentColor"/>
        </svg>
        <span>Audit Post</span>
      `;
      this.button.disabled = false;
    }
  }
  
  private attachEventListeners() {
    this.button.addEventListener('click', () => {
      if (this.targetField) {
        this.handleAudit();
      }
    });
  }
  
  private async handleAudit() {
    // This will be implemented with API integration
    console.log('Audit triggered');
  }
}
```

### Frontend: Audit History Component

```typescript
// apps/frontend/src/components/AuditHistory.tsx
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Audit {
  id: string;
  content: string;
  platform: string;
  score: number;
  created_at: string;
  breakdown: {
    tone_match: number;
    vocabulary_consistency: number;
    emotional_alignment: number;
    style_deviation: number;
  };
}

export function AuditHistory() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [filter, setFilter] = useState<string>('all');
  
  useEffect(() => {
    fetchAudits();
  }, [filter]);
  
  const fetchAudits = async () => {
    const response = await fetch(`/api/audits/history?platform=${filter}`);
    const data = await response.json();
    setAudits(data);
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setFilter('all')}>All</button>
        <button onClick={() => setFilter('twitter')}>Twitter</button>
        <button onClick={() => setFilter('linkedin')}>LinkedIn</button>
      </div>
      
      <div className="grid gap-4">
        {audits.map((audit) => (
          <Card key={audit.id} className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-gray-600 mb-2">
                  {audit.content.substring(0, 100)}...
                </p>
                <div className="flex gap-2">
                  <Badge>{audit.platform}</Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(audit.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-2xl font-bold ${getScoreColor(audit.score)}`}>
                  {audit.score}
                </div>
                <div className="text-xs text-gray-500">Brand Voice Score</div>
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
              <div>
                <div className="text-gray-500">Tone</div>
                <div className="font-semibold">{audit.breakdown.tone_match}</div>
              </div>
              <div>
                <div className="text-gray-500">Vocabulary</div>
                <div className="font-semibold">{audit.breakdown.vocabulary_consistency}</div>
              </div>
              <div>
                <div className="text-gray-500">Emotion</div>
                <div className="font-semibold">{audit.breakdown.emotional_alignment}</div>
              </div>
              <div>
                <div className="text-gray-500">Style</div>
                <div className="font-semibold">{100 - audit.breakdown.style_deviation}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

---

## Database Schema

```python
# apps/backend/audits/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import ArrayField

User = get_user_model()

class BrandVoiceProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    embedding_vector = ArrayField(models.FloatField(), size=384)
    vocabulary = ArrayField(models.CharField(max_length=100))
    tone_markers = models.JSONField(default=dict)
    style_patterns = models.JSONField(default=dict)
    sample_count = models.IntegerField(default=0)
    last_trained = models.DateTimeField(auto_now=True)
    version = models.IntegerField(default=1)
    
    class Meta:
        db_table = 'brand_voice_profiles'

class PostAudit(models.Model):
    PLATFORM_CHOICES = [
        ('twitter', 'Twitter/X'),
        ('linkedin', 'LinkedIn'),
        ('instagram', 'Instagram'),
        ('email', 'Email'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    profile = models.ForeignKey(BrandVoiceProfile, on_delete=models.CASCADE)
    content = models.TextField()
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES)
    score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)
    context = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'post_audits'
        ordering = ['-created_at']

class AuditMetrics(models.Model):
    audit = models.OneToOneField(PostAudit, on_delete=models.CASCADE)
    tone_match = models.FloatField()
    vocabulary_consistency = models.FloatField()
    emotional_alignment = models.FloatField()
    style_deviation = models.FloatField()
    deviations = models.JSONField(default=list)
    x_optimization = models.JSONField(null=True, blank=True)
    
    class Meta:
        db_table = 'audit_metrics'

class DriftAlert(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES)
    message = models.TextField()
    detected_at = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)
    related_audits = models.ManyToManyField(PostAudit)
    
    class Meta:
        db_table = 'drift_alerts'
        ordering = ['-detected_at']
```

---

## Technology Stack

### Backend
- Django REST Framework for APIs
- sentence-transformers for embeddings (or OpenAI embeddings)
- NumPy for vector operations
- Celery for async processing (optional)
- PostgreSQL with pgvector extension (or Pinecone/Weaviate)

### Extension
- TypeScript
- Webpack/Vite for bundling
- Chrome Extension APIs
- Content scripts + Background service worker

### Frontend
- Next.js (already in place)
- Recharts or Chart.js for visualizations
- TailwindCSS (already in place)
- ShadcN UI components

---

## Testing Checklist

### Backend Tests
- [ ] Embedding generation accuracy
- [ ] Cosine similarity calculations
- [ ] Brand voice scoring algorithm
- [ ] X algorithm checker logic
- [ ] Deviation detection
- [ ] API endpoint responses
- [ ] Database operations
- [ ] Edge cases (empty content, very long posts)

### Extension Tests
- [ ] Content detection across platforms
- [ ] Button positioning and visibility
- [ ] API communication
- [ ] Authentication token handling
- [ ] Error states
- [ ] Multiple fields on same page
- [ ] Performance impact

### Frontend Tests
- [ ] Audit history display
- [ ] Chart rendering
- [ ] Filtering and search
- [ ] Drift alert notifications
- [ ] Responsive design
- [ ] Loading states

### Integration Tests
- [ ] End-to-end audit flow
- [ ] Profile creation to first audit
- [ ] Drift alert triggering
- [ ] Rewrite suggestion flow
- [ ] Cross-platform consistency

---

## Performance Considerations

1. **Embedding Generation**
   - Cache embeddings for frequently used phrases
   - Use batch processing for profile training
   - Consider smaller embedding models for speed

2. **Real-time Analysis**
   - Set timeout limits (2-3 seconds max)
   - Show loading states immediately
   - Consider client-side pre-checks before API call

3. **Database**
   - Index on user_id, created_at, platform
   - Archive old audits after 6 months
   - Separate hot/cold storage

4. **Extension Impact**
   - Lazy load analysis panel
   - Debounce button visibility checks
   - Minimize DOM manipulation

---

## Monetization Strategy

### Free Tier
- 10 audits per month
- Basic scoring only
- History limited to 30 days

### Pro Tier ($15-29/month)
- Unlimited audits
- Full metrics breakdown
- Rewrite suggestions
- Drift alerts
- Full history
- X algorithm optimization tips
- Priority support

### Team Tier ($99+/month)
- All Pro features
- Shared brand profiles
- Team analytics
- Collaboration tools
- API access

---

## Next Steps

1. Set up testing framework (pytest, Jest, Playwright)
2. Create backend `audits` Django app
3. Implement embedding service
4. Build scoring engine with X algorithm checker
5. Develop extension content detection
6. Create audit button UI
7. Build API endpoints
8. Develop frontend dashboard
9. Write comprehensive tests
10. Beta test with select users

---

## Timeline Estimate

- **Phase 1 (Backend)**: 2-3 weeks
- **Phase 2 (Extension)**: 2-3 weeks
- **Phase 3 (Frontend)**: 1-2 weeks
- **Phase 4 (Advanced)**: 2-4 weeks
- **Testing & Polish**: 1-2 weeks

**Total**: 8-14 weeks for full implementation

---

## Questions to Answer Before Starting

1. Which embedding model to use? (trade-off: accuracy vs speed vs cost)
2. Store vectors in PostgreSQL (pgvector) or separate vector DB?
3. Should rewrite suggestions use OpenAI, Claude, or open-source LLM?
4. Real-time WebSocket updates or polling for drift alerts?
5. Should we support offline mode in extension?
6. What's the minimum score threshold for drift alerts?
7. How many sample posts needed for reliable brand voice profile?
