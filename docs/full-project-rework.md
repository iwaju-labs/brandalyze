# Brandalyze – Niche Viability Analyzer (MVP Spec)

## 🧠 Overview

reworking brandalyze to be this. i want to adjust the landing page + keep the free tools. but the rest of the codebase will largely be redundant. I think a lot of the python backend can be rewritten in js/ts too

Brandalyze is a niche analysis tool that helps creators and founders determine:

* Whether a niche is too saturated
* How difficult it is to grow in that niche
* Where the opportunities (gaps) are
* How to position themselves to win

---

## 🎯 Core Value Proposition

> “Find a niche you can actually win in.”

Users should walk away with:

* Clarity
* Confidence
* Direction

---

## 👤 Target Users

### Primary:

* Aspiring creators
* Early-stage personal brands
* Indie hackers
* Coaches / consultants

### Secondary:

* Existing creators considering a pivot

---

## ⚙️ MVP Feature Set

### Input:

* Niche keyword (string)

  * Example: "fitness for busy dads"
* Platform (optional, default = general)

  * Options: LinkedIn, X, YouTube

---

### Output:

#### 1. Saturation Score

* Scale: Low / Medium / High
* Based on:

  * Number of active creators
  * Content volume

---

#### 2. Difficulty Score

* Scale: Easy / Moderate / Hard
* Based on:

  * Strength of top competitors
  * Engagement levels
  * Barrier to entry

---

#### 3. Opportunity Score ⭐

* Scale: Low / Medium / High
* Based on:

  * Underserved subtopics
  * Weak competition areas

---

#### 4. Content Theme Breakdown

Top 3–5 dominant themes in the niche:

Example:

* Weight loss tips
* Workout routines
* Motivation
* Diet advice

---

#### 5. Gap Analysis (MOST IMPORTANT)

Identify 2–3 underserved angles:

Example:

* "No one is targeting time-poor parents specifically"
* "Very little content on 15-minute workouts"
* "Lack of beginner-friendly frameworks"

---

#### 6. Competitor Snapshot

Top 3–5 creators:

* Name
* Platform
* Estimated audience size
* Primary content angle

---

#### 7. Final Verdict

Simple, decisive output:

* ✅ Strong opportunity
* ⚠️ Viable with differentiation
* ❌ Oversaturated

- 1–2 sentence explanation

---

## 🧩 System Architecture (MVP)

### 1. Data Collection Layer

#### Sources:

* Social platforms (via scraping or APIs)
* Google search results
* Optional: Reddit / forums

#### Strategy:

* Search niche keywords
* Extract:

  * Creator names
  * Content titles
  * Engagement metrics (if available)

---

### 2. Processing Layer

#### Step 1: Keyword Expansion

* Generate related keywords
* Example:

  * "fitness for busy dads"
    → "quick workouts", "home workouts", "dad fitness"

---

#### Step 2: Relevance Filtering

* Score content based on:

  * Keyword match
  * Semantic similarity

---

#### Step 3: Clustering

Group content into themes:

* Use keyword frequency
* Topic clustering

---

#### Step 4: Metrics Calculation

##### Saturation:

* # of creators
* # of posts per theme

##### Difficulty:

* Avg engagement per post
* Follower size of top creators

##### Opportunity:

* Low competition + decent engagement zones

---

### 3. Scoring Logic (Simple Version)

#### Saturation Score:

if creators > X → High
if creators between X–Y → Medium
else → Low

---

#### Difficulty Score:

if top creators have high engagement + large audiences → Hard
if mixed → Moderate
else → Easy

---

#### Opportunity Score:

if gaps exist + engagement present → High
if gaps exist but low engagement → Medium
else → Low

---

## 🖥️ UI / UX (MVP)

### Screen 1: Input

* Text input (niche)
* Dropdown (platform)
* Button: “Analyze Niche”

---

### Screen 2: Results

Sections:

1. Summary (Scores + Verdict)
2. Theme Breakdown
3. Gap Opportunities ⭐
4. Competitors

---

## 🧪 Fake It Till You Make It (Early Version)

For V1, you can:

* Use limited datasets
* Hardcode some logic
* Enhance with GPT for summaries (optional)

BUT:
👉 Output must feel **specific and insightful**

---

## 💰 Monetization (Early)

### Option 1:

* Free: 1–2 analyses
* Paid: unlimited (€10–€20/month)

### Option 2:

* Pay-per-report (€5–€10)

---

## 🚀 Roadmap

### V1:

* Manual + semi-automated analysis
* Simple scoring

---

### V2:

* Real-time data
* Better clustering
* Saved reports

---

### V3:

* Niche tracking over time
* Alerts:

  * “This niche is getting crowded”
  * “New opportunity emerging”

---

## ⚠️ Risks

### 1. Generic Output

Fix:

* Always include specific examples

---

### 2. Data Quality

Fix:

* Start narrow (1 platform)

---

### 3. One-Time Use

Fix:

* Add tracking + updates later

---

## 🧠 Key Insight

This is NOT a data tool.

It is a:

> **Decision-making tool**

If the user can confidently answer:

> “Should I pursue this niche?”

You’ve succeeded.

---

## 🏁 MVP Success Criteria

* Users say: “This is actually useful”
* Users change direction based on output
* Users are willing to pay for more analyses

---

## 🔥 Future Vision

Brandalyze becomes:

> “The intelligence layer for personal brands”

* Content analysis
* Niche analysis
* Positioning guidance
* Growth insights

---

## ✍️ One-Liner

> “Brandalyze helps you find a niche you can actually win in—and shows you how to do it.”