# Test Fixes Required

## Model Field Mismatches

### AuditMetrics
**Actual fields**: `tone_match`, `vocabulary_consistency`, `emotional_alignment`, `style_deviation`
**Tests expect**: `tone_score`, `vocabulary_score`, `emotional_score`, `style_score`

### DriftAlert  
**Actual fields**: `severity`, `message`, `acknowledged`, `acknowledged_at`, `related_audits`, `threshold_breached`
**Tests expect**: `alert_type`, `details`, `is_resolved`, `resolved_at`

### AuditUsage
**Actual fields**: `audit_count`
**Tests expect**: `audits_used`

**Actual method**: `increment_audit_count()`
**Tests expect**: `increment_usage()`

**Actual return**: `(bool, None or 0)`
**Tests expect**: `(bool, string message)`

### PostAudit
**Status**: Already has `null=True, blank=True` for score ✓

### Platform choice
**Actual**: `'twitter'`
**Tests use**: `'x'`

## URL Names Missing
Tests expect these URL names but they don't exist in `audits/urls.py`:
- `audit-analyze`
- `audit-history`  
- `audit-drift-alerts`
- `audit-usage-stats`

## X Algorithm Return Format
**Actual returns**: `{'score': ..., 'tips': ..., 'recommendation': ..., 'theme': ...}`
**Tests expect**: `{'x_score': ..., 'optimization_tips': ...}`

**Tip structure actual**: `{'impact': ..., 'message': ..., 'priority': ..., 'type': ...}`
**Tests expect**: `{'category': ..., 'message': ..., 'priority': ...}`

## Scorer Method Signatures
Tests call private methods incorrectly - they need to pass `brand_samples` parameter

## Brand Model
Tests try to create Brand with `category` field that doesn't exist
