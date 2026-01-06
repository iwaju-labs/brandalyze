"""
Generate Phase 1 Apify input from seed list with viral filter
"""

def generate_phase1_input(
    seed_file: str = "account_seed_list.txt",
    min_likes: int = 500,
    output_file: str = "phase1_expanded_input.json"
):
    import json
    
    # Load accounts
    with open(seed_file, 'r') as f:
        accounts = [line.strip() for line in f if line.strip()]
    
    # Generate search terms with viral filter
    search_terms = [
        f"from:{account} -filter:replies -filter:retweets min_faves:{min_likes}"
        for account in accounts
    ]
    
    # Create config
    config = {
        "searchTerms": search_terms,
        "sort": "Top",
        "tweetLanguage": "en"
    }
    
    # Save
    with open(output_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"✓ Generated Phase 1 config for {len(accounts)} accounts")
    print(f"✓ Min likes threshold: {min_likes}")
    print(f"✓ Saved to {output_file}")
    print(f"\nEstimated cost: ${len(accounts) * 0.016:.2f}")

if __name__ == "__main__":
    generate_phase1_input()
