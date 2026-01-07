# Tweet Labeling Guide - CLI Labeling Interface

## Overview
This comprehensive guide walks you through labeling the viral tweet dataset using an interactive CLI tool. You'll be adding three types of labels to each tweet:

1. **Post Format** - Type of content (informative, shitpost, entertaining, educational, etc.)
2. **Hook Quality** - Effectiveness of the opening line
3. **Closer Type** - How the tweet ends (CTA, question, statement, etc.)

The labeled dataset will be used to train ML models that analyze tweet effectiveness and integrate into the Brandalyze audit system.

## Quick Start

1. Navigate to the ml_data directory: `cd apps/backend/ml_data`
2. Run the labeling tool: `python label_tweets.py`
3. Label tweets one by one following the prompts
4. Press 'q' to quit anytime - progress is auto-saved

## Dataset Structure

The `merged-viral-tweets.json` file contains 6,993 tweets with this structure:

```json
{
  "id": "1234567890",
  "text": "The full tweet text...",
  "author": {
    "userName": "handle",
    "name": "Display Name",
    "description": "Bio text...",
    "followersCount": 50000,
    "verified": false
  },
  "likeCount": 5000,
  "retweetCount": 500,
  "replyCount": 100,
  "viewCount": 100000,
  "bookmarkCount": 250,
  "viralityTier": "very-viral",
  "viralityScore": 5000
}
```

After labeling, a `labels` field is added:

```json
{
  "labels": {
    "format": "informative",
    "hookQuality": "strong",
    "closerType": "question"
  }
}
```

## Setup: The Labeling Tool

Create `label_tweets.py` in the `apps/backend/ml_data/` directory with the following code:

```python
# label_tweets.py
import json
from pathlib import Path

def load_dataset():
    """Load the merged viral tweets dataset"""
    with open('merged-viral-tweets.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def save_labeled_data(data):
    """Save progress after each labeled tweet"""
    with open('labeled-viral-tweets.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def label_tweet(tweet):
    """Interactive labeling for a single tweet"""
    print("\n" + "="*80)
    print(f"Tweet ID: {tweet['id']}")
    print(f"Author: @{tweet['author']['userName']} ({tweet['likeCount']:,} likes)")
    print(f"Virality: {tweet['viralityTier']}")
    print("-"*80)
    print(tweet['text'])
    print("-"*80)
    
    # Post Format
    print("\nPost Format:")
    print("1. Informative  2. Educational  3. Entertaining")
    print("4. Shitpost     5. Inspirational  6. Story/Thread")
    print("7. Opinion      8. News          9. Question")
    format_label = input("Select format (1-9): ").strip()
    
    # Hook Quality
    print("\nHook Quality:")
    print("1. Strong  2. Medium  3. Weak  4. No Hook")
    hook_label = input("Select hook quality (1-4): ").strip()
    
    # Closer Type
    print("\nCloser Type:")
    print("1. CTA  2. Question  3. Statement  4. Cliffhanger  5. None")
    closer_label = input("Select closer type (1-5): ").strip()
    
    # Skip option
    skip = input("\nSkip this tweet? (y/n): ").strip().lower()
    
    if skip == 'y':
        return None
    
    format_map = {
        '1': 'informative', '2': 'educational', '3': 'entertaining',
        '4': 'shitpost', '5': 'inspirational', '6': 'story',
        '7': 'opinion', '8': 'news', '9': 'question'
    }
    hook_map = {'1': 'strong', '2': 'medium', '3': 'weak', '4': 'none'}
    closer_map = {'1': 'cta', '2': 'question', '3': 'statement', '4': 'cliffhanger', '5': 'none'}
    
    tweet['labels'] = {
        'format': format_map.get(format_label, 'unknown'),
        'hookQuality': hook_map.get(hook_label, 'unknown'),
        'closerType': closer_map.get(closer_label, 'unknown')
    }
    
    return tweet

def main():
    data = load_dataset()
    labeled_count = sum(1 for t in data if 'labels' in t)
    
    print(f"Total tweets: {len(data)}")
    print(f"Already labeled: {labeled_count}")
    print(f"Remaining: {len(data) - labeled_count}")
    
    for i, tweet in enumerate(data):
        if 'labels' in tweet:
            continue
        
        labeled = label_tweet(tweet)
        if labeled:
            data[i] = labeled
            labeled_count += 1
            save_labeled_data(data)
            print(f"\n✓ Saved ({labeled_count}/{len(data)})")
        
        cont = input("\nContinue? (Enter to continue, 'q' to quit): ").strip()
        if cont.lower() == 'q':
            break

if __name__ == '__main__':
    main()
```

## Label Definitions

Understanding these categories is crucial for consistent labeling. Read through all definitions before starting.

### Post Format Categories

**1. Informative**
- Shares facts, data, statistics, or insights
- "Did you know..." style content
- Market updates, research findings
- Example: "78% of successful startups pivoted at least once in their first year"

**2. Educational** 
- How-to guides, tutorials, explanations
- Teaches a skill or concept
- Step-by-step instructions
- Example: "How to write cold emails that actually get replies: 1) Personalize the subject..."

**3. Entertaining**
- Designed to amuse, funny observations
- Witty commentary, clever wordplay
- Pop culture references, memes
- Example: "My code in production vs in the demo"

**4. Shitpost**
- Low-effort humor, absurdist content
- Intentionally chaotic or nonsensical
- Often self-aware about being silly
- Example: "gonna tell my kids this was the founding fathers [random image]"

**5. Inspirational**
- Motivational quotes or stories
- Success narratives, overcoming obstacles
- Uplifting messages
- Example: "Failed 10 times. Got rejected 100 times. Now running a $10M company. Keep going."

**6. Story/Thread**
- Personal anecdotes, narrative storytelling
- Often multi-tweet threads
- Has a beginning, middle, end
- Example: "So this is the story of how I accidentally deleted our production database..."

**7. Opinion**
- Hot takes, controversial statements
- Personal perspectives on topics
- Debate-worthy claims
- Example: "Unpopular opinion: Most productivity advice is just procrastination in disguise"

**8. News**
- Breaking news, announcements
- Product launches, updates
- Time-sensitive information
- Example: "BREAKING: OpenAI just announced GPT-5"

**9. Question**
- Asking audience for input or opinions
- Polls, open-ended questions
- Engagement-focused
- Example: "What's the worst advice you've ever received?"

### Hook Quality Levels

**Strong Hook**
- Immediately grabs attention in first 5-10 words
- Creates curiosity or urgency
- Makes you stop scrolling
- Often starts with: numbers, questions, bold claims, "I just..." or "This is..."
- Examples:
  - "I spent $10,000 to learn this:"
  - "This changed everything:"
  - "Nobody talks about this but..."
  - "I analyzed 1,000 viral tweets and found:"

**Medium Hook**
- Decent opening but not remarkable
- Gets to the point but lacks punch
- Doesn't immediately create curiosity
- Still clear and readable
- Examples:
  - "Here are some tips for writing better:"
  - "Today I learned something interesting:"
  - "Sharing my thoughts on..."

**Weak Hook**
- Generic or boring opening
- Could apply to any topic
- Doesn't create interest
- Examples:
  - "So I was thinking..."
  - "Just wanted to share..."
  - "Random thought:"

**No Hook**
- Jumps straight into the content
- No attempt at an attention-grabbing opening
- Just states information directly
- Examples:
  - "The new iPhone is out."
  - "React 19 released today."

### Closer Types

**CTA (Call to Action)**
- Explicitly asks for engagement
- "Follow for more", "RT if you agree", "Reply with..."
- Link to product/service
- Examples:
  - "If you found this helpful, follow me for more tips like this"
  - "Click the link in my bio to learn more"
  - "RT to save for later"

**Question**
- Ends with a question to the audience
- Invites responses in replies
- Examples:
  - "What do you think?"
  - "Have you experienced this?"
  - "Which approach do you prefer?"

**Statement**
- Declarative ending, makes a final point
- Conclusion or summary
- No explicit ask
- Examples:
  - "That's how you do it."
  - "This is the future."
  - "Hope this helps."

**Cliffhanger**
- Promises more content elsewhere
- "Thread below 🧵", "More in replies"
- "Part 1/3" indicators
- Creates anticipation
- Examples:
  - "The rest in the thread below 👇"
  - "Will share more tomorrow"
  - "DM me for the full story"

**None**
- No clear closer
- Just ends without ceremony
- Content speaks for itself
- Common in quotes, facts, or complete thoughts

## How to Use the CLI Labeler

### First Time Setup

1. Open terminal and navigate to the directory:
   ```bash
   cd apps/backend/ml_data
   ```

2. Run the labeling tool:
   ```bash
   python label_tweets.py
   ```

3. You'll see a summary:
   ```
   Total tweets: 6993
   Already labeled: 0
   Remaining: 6993
   ```

### Labeling Process

For each tweet, the tool displays:

```
================================================================================
Tweet ID: 1234567890
Author: @username (5,000 likes)
Virality: very-viral
--------------------------------------------------------------------------------
The full tweet text appears here with all formatting preserved
--------------------------------------------------------------------------------

Post Format:
1. Informative  2. Educational  3. Entertaining
4. Shitpost     5. Inspirational  6. Story/Thread
7. Opinion      8. News          9. Question
Select format (1-9): _
```

**Step-by-step:**

1. **Read the entire tweet carefully**
2. **Identify the format** - What type of content is this?
   - Type the number (1-9) and press Enter
3. **Evaluate the hook** - How effective is the opening?
   - Type the number (1-4) and press Enter
4. **Identify the closer** - How does it end?
   - Type the number (1-5) and press Enter
5. **Skip option** - If unsure or tweet is unclear
   - Type 'y' to skip, 'n' to save the label
6. **Continue or quit**
   - Press Enter to label next tweet
   - Type 'q' and Enter to quit

### Progress Tracking

- **Auto-save**: Every labeled tweet is immediately saved to `labeled-viral-tweets.json`
- **Resume anytime**: Already-labeled tweets are skipped automatically
- **Progress counter**: Shows `✓ Saved (X/6993)` after each tweet
- **No data loss**: Safe to quit anytime with 'q' - your progress is saved

### Tips for Efficient Labeling

**Speed Tips:**
- Read the label definitions thoroughly BEFORE starting
- Label in focused 30-60 minute sessions
- Take breaks every 100 tweets to maintain quality
- Use the skip option ('y') when genuinely unsure - don't guess

**Consistency Tips:**
- If a tweet fits multiple categories, pick the PRIMARY format
- For hooks, focus on the FIRST line only, not the overall tweet
- When in doubt between two options, go with your gut instinct
- Keep definitions handy - refer back when needed

**Quality Tips:**
- First 50 tweets: Go slowly, double-check against definitions
- After 100 tweets: Review some earlier labels for consistency
- If you realize you've been inconsistent, you can re-label by editing the JSON
- Quality > Speed: It's okay to only label 20-30 tweets per session

### Monitoring Progress

Check your progress anytime:

```python
# check_progress.py
import json

with open('labeled-viral-tweets.json', 'r') as f:
    data = json.load(f)

labeled = [t for t in data if 'labels' in t]
print(f"Labeled: {len(labeled)}/{len(data)} ({len(labeled)/len(data)*100:.1f}%)")

# Count by category
formats = {}
for t in labeled:
    fmt = t['labels']['format']
    formats[fmt] = formats.get(fmt, 0) + 1

print("\nFormat distribution:")
for fmt, count in sorted(formats.items(), key=lambda x: x[1], reverse=True):
    print(f"  {fmt}: {count}")
```

Run with: `python check_progress.py`

### Common Edge Cases

**Thread/Long Tweet:**
- Format: Usually 'story' or 'educational'
- Closer: Often 'cliffhanger' if it says "thread below"

**Quote Tweet:**
- Format: Often 'opinion' or 'entertaining'
- Hook: Evaluate the added comment, not the quoted content

**Tweet with Image/Video:**
- Label based on the TEXT only (images not in dataset)
- If text is just "This 😂" → likely 'entertaining' or 'shitpost'

**Ambiguous Tweets:**
- Use skip option ('y') rather than guessing
- It's okay to skip 5-10% of tweets if truly unclear

**Multiple Categories:**
- Pick the DOMINANT category
- Example: Educational joke → 'educational' if teaching something, 'entertaining' if primary goal is humor

## Minimum Labeling Goals

You don't need to label all 6,993 tweets. Target these minimums for viable ML training:

### Option A: Representative Sample (Recommended)
- **Total: 1,000-1,500 tweets** 
- Ensures each format has 50-100 examples
- Manageable in 15-20 hours of labeling
- Sufficient for initial model training

### Option B: Comprehensive Dataset
- **Total: 3,000-4,000 tweets**
- 300-400 examples per format
- Higher model accuracy
- 40-60 hours of labeling work

### Option C: Full Dataset
- **Total: All 6,993 tweets**
- Maximum data for training
- Best possible model performance
- 80-100+ hours of labeling work

**Recommendation:** Start with Option A. Label 1,500 tweets, train models, evaluate performance. If accuracy is insufficient, label more.

## After Labeling: Next Steps

Once you have sufficient labeled data:

1. **Split the dataset** (70% train, 15% validation, 15% test)
2. **Train classification models** using transformers or LLMs
3. **Evaluate on test set** to measure accuracy
4. **Integrate into Brandalyze** audit system
5. **Iterate** based on user feedback

## Troubleshooting

**"File not found" error:**
- Ensure you're in `apps/backend/ml_data/` directory
- Check that `merged-viral-tweets.json` exists

**Labels showing 'unknown':**
- You typed an invalid number (not 1-9, 1-4, or 1-5)
- Re-label by editing `labeled-viral-tweets.json` or deleting the labels field

**Want to re-label a tweet:**
- Open `labeled-viral-tweets.json`
- Find the tweet by ID
- Delete or modify the `labels` field
- Run the tool again (it will skip tweets with labels)

**Lost progress:**
- Check for `labeled-viral-tweets.json` - it has your latest save
- The tool auto-saves after EVERY labeled tweet

**Need to restart:**
- Just run `python label_tweets.py` again
- It automatically skips already-labeled tweets
- Progress is never lost

## Example Labeling Session

Here's what a typical labeling session looks like:

```
$ python label_tweets.py

Total tweets: 6993
Already labeled: 0
Remaining: 6993

================================================================================
Tweet ID: 1748392847382
Author: @FluentInFinance (8,543 likes)
Virality: very-viral
--------------------------------------------------------------------------------
I spent $10,000 learning about finance.

Here are 10 lessons that changed my life:

1. Pay yourself first
2. Compound interest is magic
3. Time in market > timing market
...
--------------------------------------------------------------------------------

Post Format:
1. Informative  2. Educational  3. Entertaining
4. Shitpost     5. Inspirational  6. Story/Thread
7. Opinion      8. News          9. Question
Select format (1-9): 2

Hook Quality:
1. Strong  2. Medium  3. Weak  4. No Hook
Select hook quality (1-4): 1

Closer Type:
1. CTA  2. Question  3. Statement  4. Cliffhanger  5. None
Select closer type (1-5): 4

Skip this tweet? (y/n): n

✓ Saved (1/6993)

Continue? (Enter to continue, 'q' to quit): 
```

Good luck with your labeling! Remember: consistency and quality over speed.
