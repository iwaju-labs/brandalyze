"""
Twitter Account Verification Script
Filters seed account list based on follower count, engagement, and activity
Can be run with Apify Twitter Profile Scraper or standalone
"""

import json
import csv
from typing import List, Dict, Optional
from dataclasses import dataclass, asdict
from pathlib import Path


@dataclass
class AccountStats:
    username: str
    followers: int
    following: int
    tweets_count: int
    verified: bool
    created_at: str
    description: str
    location: str
    website: str
    latest_tweet_date: Optional[str] = None
    avg_likes: Optional[float] = None
    avg_retweets: Optional[float] = None
    engagement_rate: Optional[float] = None
    is_valid: bool = False
    validation_notes: str = ""


class AccountVerifier:
    def __init__(
        self,
        min_followers: int = 10000,
        min_tweets: int = 100,
        min_engagement_rate: float = 0.01,  # 1%
        max_days_inactive: int = 30
    ):
        self.min_followers = min_followers
        self.min_tweets = min_tweets
        self.min_engagement_rate = min_engagement_rate
        self.max_days_inactive = max_days_inactive

    def validate_account(self, account_data: Dict) -> AccountStats:
        """
        Validate account based on criteria
        
        Expected account_data structure from Apify Twitter Profile Scraper:
        {
            "username": "...",
            "followers": 12345,
            "following": 678,
            "tweets": 5000,
            "verified": true,
            "created": "...",
            "description": "...",
            "location": "...",
            "url": "..."
        }
        """
        username = account_data.get("username", "")
        followers = account_data.get("followers", 0)
        tweets_count = account_data.get("tweets", 0)
        
        stats = AccountStats(
            username=username,
            followers=followers,
            following=account_data.get("following", 0),
            tweets_count=tweets_count,
            verified=account_data.get("verified", False),
            created_at=account_data.get("created", ""),
            description=account_data.get("description", ""),
            location=account_data.get("location", ""),
            website=account_data.get("url", "")
        )
        
        validation_issues = []
        
        # Check follower count
        if followers < self.min_followers:
            validation_issues.append(f"followers={followers} < {self.min_followers}")
        
        # Check tweet count
        if tweets_count < self.min_tweets:
            validation_issues.append(f"tweets={tweets_count} < {self.min_tweets}")
        
        # Mark as valid if no issues
        stats.is_valid = len(validation_issues) == 0
        stats.validation_notes = "; ".join(validation_issues) if validation_issues else "PASS"
        
        return stats

    def process_apify_results(self, json_file_path: str) -> List[AccountStats]:
        """
        Process Apify Twitter Scraper Unlimited results JSON
        
        Expected structure: array of tweet objects with author data
        """
        with open(json_file_path, 'r', encoding='utf-8') as f:
            tweets = json.load(f)
        
        results = []
        seen_usernames = set()
        
        for tweet in tweets:
            # Extract author data from tweet
            author = tweet.get('author', {})
            username = author.get('userName', '')
            
            # Skip duplicates (since we're getting 1 tweet per account, shouldn't happen)
            if username in seen_usernames:
                continue
            seen_usernames.add(username)
            
            # Transform to expected format
            account_data = {
                'username': username,
                'followers': author.get('followers', 0),
                'following': author.get('following', 0),
                'tweets': author.get('statusesCount', 0),
                'verified': author.get('isVerified', False),
                'created': author.get('createdAt', ''),
                'description': author.get('description', ''),
                'location': author.get('location', ''),
                'url': author.get('url', '')
            }
            
            stats = self.validate_account(account_data)
            results.append(stats)
        
        return results

    def export_results(self, results: List[AccountStats], output_path: str):
        """Export validation results to CSV"""
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            if not results:
                return
            
            writer = csv.DictWriter(f, fieldnames=asdict(results[0]).keys())
            writer.writeheader()
            for result in results:
                writer.writerow(asdict(result))

    def get_valid_usernames(self, results: List[AccountStats]) -> List[str]:
        """Return list of valid usernames"""
        return [r.username for r in results if r.is_valid]


def load_seed_accounts(file_path: str = "account_seed_list.txt") -> List[str]:
    """Load account list from text file"""
    with open(file_path, 'r') as f:
        return [line.strip() for line in f if line.strip()]


def main():
    """
    Usage:
    1. Run Apify Twitter Profile Scraper with account_seed_list.txt
    2. Download results as JSON
    3. Run this script with path to JSON file
    4. Get filtered list of valid accounts
    """
    
    # Example: process Apify results
    verifier = AccountVerifier(
        min_followers=10000,
        min_tweets=100,
        min_engagement_rate=0.01,
        max_days_inactive=30
    )
    
    # Update this path to your Apify results file
    apify_results_file = "viral-tweet-dataset-phase1.json"
    
    if Path(apify_results_file).exists():
        print(f"Processing {apify_results_file}...")
        results = verifier.process_apify_results(apify_results_file)
        
        # Export all results
        verifier.export_results(results, "account_verification_results.csv")
        
        # Get valid accounts
        valid_accounts = verifier.get_valid_usernames(results)
        
        print(f"\n✓ Total accounts processed: {len(results)}")
        print(f"✓ Valid accounts: {len(valid_accounts)}")
        print(f"✗ Invalid accounts: {len(results) - len(valid_accounts)}")
        
        # Save valid accounts to file
        with open("verified_accounts.txt", "w") as f:
            f.write("\n".join(valid_accounts))
        
        print(f"\nValid accounts saved to verified_accounts.txt")
        print(f"Full results saved to account_verification_results.csv")
    else:
        print(f"Error: {apify_results_file} not found")
        print("\nTo use this script:")
        print("1. Go to Apify and use 'Twitter Profile Scraper' actor")
        print("2. Upload account_seed_list.txt as input")
        print("3. Download results as JSON")
        print("4. Save as 'apify_profile_results.json' in this directory")
        print("5. Run this script again")


if __name__ == "__main__":
    main()
