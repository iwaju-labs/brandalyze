# Audit History Dashboard

## Overview

The Audit History Dashboard is a frontend page that displays all post audits performed via the browser extension. Users can view, filter, search, and export their audit history.

## Location

- **URL**: `/audits`
- **File**: `apps/frontend/src/app/audits/page.tsx`
- **Nav Link**: Added to navbar

## Features

### 1. Audit List View
- Displays audits in a collapsible card format
- Shows platform icon, brand name, timestamp, content preview, and score
- Score is color-coded: green (80+), yellow (60-79), red (<60)
- Click to expand for full details

### 2. Expanded Audit Details
When an audit card is expanded, it shows:
- **Metrics Grid**: Tone Match, Vocabulary, Emotional Alignment, Style Deviation
- **AI Feedback**: GPT-generated analysis of hook/body/closer (for X posts)
- **X Algorithm Tips**: Platform-specific optimization suggestions
- **Deviations**: Detected brand voice inconsistencies
- **Full Content**: Complete post text

### 3. Filtering
- **Platform**: All, X/Twitter, LinkedIn, Other
- **Minimum Score**: Any, 80+, 60+, 40+
- **Search**: Client-side search by content or brand name
- Active filters shown with badge count
- Clear all filters button

### 4. Export
- **CSV**: Spreadsheet format with all audit data
- **JSON**: Full data export including nested metrics
- Exports only currently filtered results

## API Integration

Uses existing backend endpoint:
```
GET /api/audits/history?platform=twitter&min_score=60&limit=100
```

---

# Analytics Dashboard

## Overview

The Analytics Dashboard provides visual insights into brand voice performance over time with charts and statistics.

## Location

- **URL**: `/analytics`
- **File**: `apps/frontend/src/app/analytics/page.tsx`

## Features

### 1. Overview Cards
- **Total Audits**: Count for selected period
- **Average Score**: Overall average with min/max range
- **7-Day Trend**: Score change vs previous week (up/down/stable indicator)
- **Recent Average**: Last 7 days average with previous comparison

### 2. Score Trend Chart
- Bar chart showing daily average scores
- Hover tooltips with exact values and audit counts
- Date range labels

### 3. Score Distribution
- Horizontal bar chart with 5 buckets (0-20, 20-40, 40-60, 60-80, 80-100)
- Shows count and percentage for each range
- Color-coded (red to green)

### 4. Platform Performance
- Cards showing each platform's audit count and average score
- Sorted by usage

### 5. Brand Performance
- Cards showing each brand's audit count and average score
- Top 10 brands displayed

### 6. Period Selector
- Last 7 days
- Last 30 days (default)
- Last 60 days
- Last 90 days

## API Endpoint

```
GET /api/audits/analytics?days=30&brand_id=1
```

Response:
```json
{
  "period": { "days": 30, "start_date": "...", "end_date": "..." },
  "overall": { "total_audits": 45, "avg_score": 72.5, "min_score": 35, "max_score": 95 },
  "trend": { "direction": "up", "change": 5.2, "recent_avg": 75, "previous_avg": 69.8 },
  "score_trend": [{ "date": "2025-11-01", "avg_score": 70, "count": 3 }, ...],
  "platform_stats": [{ "platform": "twitter", "count": 30, "avg_score": 74 }, ...],
  "score_distribution": { "0-20": 2, "20-40": 5, "40-60": 10, "60-80": 18, "80-100": 10 },
  "brand_stats": [{ "brand_id": 1, "brand_name": "My Brand", "count": 25, "avg_score": 76 }, ...]
}
```

---

# Brand Profiles Management

## Overview

The Brands page allows users to view, create, edit, and delete their brand voice profiles and associated samples.

## Location

- **URL**: `/brands`
- **File**: `apps/frontend/src/app/brands/page.tsx`

## Features

### 1. Brand List
- Expandable cards showing each brand
- Displays: name, description, sample count, total text length, last updated date
- Expand to view all samples

### 2. Create Brand
- Modal form with name (required) and description (optional)
- Validates unique name per user

### 3. Edit Brand
- Inline editing of name and description
- Save/Cancel buttons

### 4. Delete Brand
- Confirmation modal with warning about permanent deletion
- Deletes all associated samples and audit history

### 5. Sample Management
- View all samples for a brand (expanded view)
- Delete individual samples
- Shows sample text, length, file type, and creation date

## API Endpoints

```
GET    /api/brands/           - List all brands
POST   /api/brands/           - Create new brand
PATCH  /api/brands/{id}/      - Update brand
DELETE /api/brands/{id}/      - Delete brand
DELETE /api/samples/{id}/     - Delete sample
```

---

# Navigation

All three pages are accessible from the main navigation bar:
- **audits** - Audit History
- **analytics** - Analytics Dashboard
- **brands** - Brand Profiles

Each page requires Clerk authentication and redirects to `/sign-in` if not authenticated.
