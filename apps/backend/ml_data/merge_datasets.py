"""
Merge and deduplicate tweet datasets, add virality tiers
"""

import json
from typing import Dict, List


def add_virality_tier(tweet: Dict) -> Dict:
    """Add virality tier based on like count"""
    likes = tweet.get('likeCount', 0)
    
    if likes >= 10000:
        tier = 'ultra-viral'
    elif likes >= 5000:
        tier = 'highly-viral'
    elif likes >= 2000:
        tier = 'very-viral'
    elif likes >= 1000:
        tier = 'viral'
    elif likes >= 500:
        tier = 'semi-viral'
    else:
        tier = 'standard'
    
    tweet['viralityTier'] = tier
    tweet['viralityScore'] = likes  # Keep original for reference
    
    return tweet


def merge_and_deduplicate(
    file1: str = "viral-tweet-dataset-phase1.json",
    file2: str = "viral-tweets-phase2.json",
    output_file: str = "merged-viral-tweets.json"
):
    """Merge two tweet datasets and remove duplicates"""
    
    print(f"Loading {file1}...")
    with open(file1, 'r', encoding='utf-8') as f:
        tweets1 = json.load(f)
    
    print(f"Loading {file2}...")
    with open(file2, 'r', encoding='utf-8') as f:
        tweets2 = json.load(f)
    
    print(f"\nPhase 1 tweets: {len(tweets1)}")
    print(f"Phase 2 tweets: {len(tweets2)}")
    print(f"Total before dedup: {len(tweets1) + len(tweets2)}")
    
    # Deduplicate by tweet ID
    unique_tweets = {}
    
    for tweet in tweets1 + tweets2:
        tweet_id = tweet.get('id')
        if tweet_id and tweet_id not in unique_tweets:
            # Add virality tier
            tweet = add_virality_tier(tweet)
            unique_tweets[tweet_id] = tweet
    
    # Convert back to list
    merged_tweets = list(unique_tweets.values())
    
    # Sort by virality (highest first)
    merged_tweets.sort(key=lambda t: t.get('likeCount', 0), reverse=True)
    
    # Save merged dataset
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(merged_tweets, f, indent=2, ensure_ascii=False)
    
    # Stats
    print(f"\n✓ Unique tweets after dedup: {len(merged_tweets)}")
    print(f"✓ Duplicates removed: {len(tweets1) + len(tweets2) - len(merged_tweets)}")
    
    # Virality tier breakdown
    tier_counts = {}
    for tweet in merged_tweets:
        tier = tweet.get('viralityTier', 'unknown')
        tier_counts[tier] = tier_counts.get(tier, 0) + 1
    
    print("\nVirality tier breakdown:")
    for tier in ['ultra-viral', 'highly-viral', 'very-viral', 'viral', 'semi-viral', 'standard']:
        count = tier_counts.get(tier, 0)
        if count > 0:
            print(f"  {tier}: {count} tweets")
    
    # Account distribution
    account_counts = {}
    for tweet in merged_tweets:
        username = tweet.get('author', {}).get('userName', 'unknown')
        account_counts[username] = account_counts.get(username, 0) + 1
    
    print(f"\n✓ Unique accounts: {len(account_counts)}")
    print(f"✓ Avg tweets per account: {len(merged_tweets) / len(account_counts):.1f}")
    
    # Top contributors
    top_accounts = sorted(account_counts.items(), key=lambda x: x[1], reverse=True)[:10]
    print("\nTop 10 accounts by tweet count:")
    for username, count in top_accounts:
        print(f"  @{username}: {count} tweets")
    
    print(f"\n✓ Saved to {output_file}")


if __name__ == "__main__":
    merge_and_deduplicate()
