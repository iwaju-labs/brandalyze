# Tweet Labeling Guide

## Overview
This guide covers how to label the viral tweet dataset for ML model training. You'll be adding labels for:
1. **Post Format** - Type of content (informative, shitpost, entertaining, educational, etc.)
2. **Hook Quality** - Effectiveness of the opening line
3. **Closer Type** - How the tweet ends (CTA, question, statement, etc.)

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

## Labeling Approach

### Option 1: Manual Labeling Interface (Recommended)

Create a simple web interface to label tweets one by one:

```python
# label_tweets.py
import json
from pathlib import Path

def load_dataset():
    with open('merged-viral-tweets.json', 'r', encoding='utf-8') as f:
        return json.load(f)

def save_labeled_data(data):
    with open('labeled-viral-tweets.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def label_tweet(tweet):
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
            save_labeled_data(data)
            print(f"\n✓ Saved ({labeled_count + 1}/{len(data)})")
        
        cont = input("\nContinue? (Enter to continue, 'q' to quit): ").strip()
        if cont.lower() == 'q':
            break

if __name__ == '__main__':
    main()
```

### Option 2: Batch CSV Export

Export to CSV for spreadsheet labeling:

```python
# export_for_labeling.py
import json
import csv

def export_to_csv(input_file='merged-viral-tweets.json', output_file='tweets_to_label.csv'):
    with open(input_file, 'r', encoding='utf-8') as f:
        tweets = json.load(f)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'tweet_id', 'author', 'text', 'likes', 'virality_tier',
            'format', 'hook_quality', 'closer_type', 'notes'
        ])
        
        for tweet in tweets:
            writer.writerow([
                tweet['id'],
                tweet['author']['userName'],
                tweet['text'][:200],  # Truncate for readability
                tweet['likeCount'],
                tweet['viralityTier'],
                '',  # format - to be filled
                '',  # hook_quality - to be filled
                '',  # closer_type - to be filled
                ''   # notes - optional
            ])
    
    print(f"✓ Exported {len(tweets)} tweets to {output_file}")

if __name__ == '__main__':
    export_to_csv()
```

Then import labeled CSV back:

```python
# import_labels.py
import json
import csv

def import_labels(csv_file='tweets_labeled.csv', json_file='merged-viral-tweets.json'):
    # Load existing dataset
    with open(json_file, 'r', encoding='utf-8') as f:
        tweets = json.load(f)
    
    # Create lookup by ID
    tweet_map = {t['id']: t for t in tweets}
    
    # Read labels from CSV
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            tweet_id = row['tweet_id']
            if tweet_id in tweet_map and row['format']:
                tweet_map[tweet_id]['labels'] = {
                    'format': row['format'],
                    'hookQuality': row['hook_quality'],
                    'closerType': row['closer_type'],
                    'notes': row.get('notes', '')
                }
    
    # Save updated dataset
    with open('labeled-viral-tweets.json', 'w', encoding='utf-8') as f:
        json.dump(list(tweet_map.values()), f, indent=2, ensure_ascii=False)
    
    labeled_count = sum(1 for t in tweet_map.values() if 'labels' in t)
    print(f"✓ Imported labels for {labeled_count} tweets")

if __name__ == '__main__':
    import_labels()
```

### Option 3: Sample Subset

Label a representative sample instead of all 6,993 tweets:

```python
# create_sample.py
import json
import random

def create_stratified_sample(n_per_tier=200):
    with open('merged-viral-tweets.json', 'r', encoding='utf-8') as f:
        tweets = json.load(f)
    
    # Group by virality tier
    by_tier = {}
    for tweet in tweets:
        tier = tweet['viralityTier']
        if tier not in by_tier:
            by_tier[tier] = []
        by_tier[tier].append(tweet)
    
    # Sample from each tier
    sample = []
    for tier, tier_tweets in by_tier.items():
        n = min(n_per_tier, len(tier_tweets))
        sample.extend(random.sample(tier_tweets, n))
    
    random.shuffle(sample)
    
    with open('sample-for-labeling.json', 'w', encoding='utf-8') as f:
        json.dump(sample, f, indent=2, ensure_ascii=False)
    
    print(f"✓ Created sample of {len(sample)} tweets")
    for tier, tier_tweets in by_tier.items():
        sampled = min(n_per_tier, len(tier_tweets))
        print(f"  {tier}: {sampled} tweets")

if __name__ == '__main__':
    create_stratified_sample(n_per_tier=200)
```

## Label Definitions

### Post Format Categories

- **informative**: Facts, data, insights, "did you know" style
- **educational**: How-to, tutorials, explanations, teaching
- **entertaining**: Funny, witty, memes, pop culture
- **shitpost**: Low-effort humor, absurdist, intentionally chaotic
- **inspirational**: Motivational, uplifting, success stories
- **story**: Personal anecdotes, narrative threads
- **opinion**: Hot takes, controversial statements, perspectives
- **news**: Breaking news, announcements, updates
- **question**: Asking audience for input/engagement

### Hook Quality Levels

- **strong**: Immediately grabs attention, makes you want to read more
- **medium**: Decent opening, but not remarkable
- **weak**: Generic or boring opening line
- **none**: No clear hook, jumps straight into content

### Closer Types

- **cta**: Call to action (follow, RT, click link, etc.)
- **question**: Ends with a question to audience
- **statement**: Declarative ending, conclusion
- **cliffhanger**: "Thread below 🧵" or "More in replies"
- **none**: No clear closer, just ends

## Recommended Workflow

1. **Start Small**: Label 100-200 tweets to validate your taxonomy
2. **Check Consistency**: Review early labels, adjust definitions if needed
3. **Batch Sessions**: Label in focused 30-60 minute sessions
4. **Track Progress**: Save after each tweet to avoid losing work
5. **Quality Over Quantity**: Better to have 500 well-labeled tweets than 5,000 inconsistent ones

## Minimum Training Data

For ML models, aim for:
- **Post Format**: 50-100 examples per category (450-900 total)
- **Hook Quality**: 100+ examples per level (400+ total)
- **Closer Type**: 50+ examples per type (250+ total)

A well-labeled sample of 1,000-1,500 tweets should be sufficient for initial model training.

## Next Steps After Labeling

1. Split labeled data into train/validation/test sets (70/15/15)
2. Train classification models (likely using transformers or lightweight LLMs)
3. Evaluate model performance on test set
4. Integrate models into Brandalyze audit system
5. Collect user feedback and iterate
