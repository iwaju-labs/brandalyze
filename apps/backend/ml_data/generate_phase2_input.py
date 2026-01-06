"""
Generate Phase 2 Apify input after filtering accounts
Run this after verify_accounts.py to create the tweet collection config
"""

import json


def generate_phase2_input(
    verified_accounts_file: str = "verified_accounts.txt",
    min_likes: int = 500,
    output_file: str = "phase2_apify_input.json"
):
    """
    Generate Apify input for Phase 2 tweet collection
    
    Args:
        verified_accounts_file: Path to file with valid usernames
        min_likes: Minimum likes threshold for viral tweets
        output_file: Output JSON file path
    """
    
    # Load verified accounts
    with open(verified_accounts_file, 'r') as f:
        accounts = [line.strip() for line in f if line.strip()]
    
    # Generate search terms with min_likes filter (excludes replies)
    search_terms = [
        f"from:{account} -filter:replies min_faves:{min_likes}" 
        for account in accounts
    ]
    
    # Create Apify config (no maxItems - get all viral tweets)
    config = {
        "searchTerms": search_terms,
        "sort": "Top",
        "tweetLanguage": "en"
    }
    
    # Save to file
    with open(output_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✓ Generated Phase 2 config for {len(accounts)} accounts")
    print(f"✓ Min likes threshold: {min_likes}")
    print(f"✓ No maxItems limit - collecting ALL viral tweets")
    print(f"✓ Estimated cost: ${calculate_cost(len(accounts), 500):.2f} (assuming ~500 tweets/account)")
    print(f"✓ Saved to {output_file}")


def calculate_cost(num_accounts: int, tweets_per_account: int) -> float:
    """
    Calculate estimated Apify cost
    
    Pricing (Tier 2: 6-10 queries):
    - Query cost: $0.016 per query
    - Item cost: $0.0008 per tweet (Tier 2)
    """
    query_cost = num_accounts * 0.016
    
    # Each query includes first 40 tweets free
    paid_tweets = max(0, tweets_per_account - 40) * num_accounts
    item_cost = paid_tweets * 0.0008
    
    return query_cost + item_cost


if __name__ == "__main__":
    # Example usage - adjust parameters as needed
    generate_phase2_input(
        verified_accounts_file="verified_accounts.txt",
        min_likes=500,
        output_file="phase2_apify_input.json"
    )
