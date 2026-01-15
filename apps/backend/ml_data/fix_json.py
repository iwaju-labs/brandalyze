import json

# Try to read and fix the corrupted JSON
with open('labeled-viral-tweets.json', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the last complete tweet object before corruption
# We'll parse up to the last valid complete entry
try:
    data = json.loads(content)
    print(f"File is actually valid! Contains {len(data)} tweets")
except json.JSONDecodeError as e:
    print(f"JSON error at position {e.pos}: {e.msg}")
    print("\nAttempting to fix by removing incomplete last entry...")
    
    # Find the last complete tweet with labels
    # Look for the pattern of a complete tweet followed by either , or ]
    last_labels_end = content.rfind('"labels":')
    if last_labels_end == -1:
        print("No labeled tweets found!")
        exit(1)
    
    # Find the closing of that labels object
    search_from = last_labels_end
    brace_count = 0
    in_labels = False
    tweet_end = -1
    
    for i in range(search_from, len(content)):
        if content[i] == '{':
            brace_count += 1
            in_labels = True
        elif content[i] == '}':
            brace_count -= 1
            if in_labels and brace_count == 0:
                # This closes the tweet object
                tweet_end = i + 1
                break
    
    if tweet_end == -1:
        print("Could not find complete tweet structure")
        exit(1)
    
    # Now find the second-to-last complete tweet
    # Search backwards for previous "labels":
    prev_labels = content.rfind('"labels":', 0, last_labels_end - 1)
    
    if prev_labels == -1:
        print("Only one labeled tweet found, cannot remove last one")
        exit(1)
    
    # Find the end of the second-to-last tweet
    search_from_prev = prev_labels
    brace_count = 0
    in_labels = False
    prev_tweet_end = -1
    
    for i in range(search_from_prev, len(content)):
        if content[i] == '{':
            brace_count += 1
            in_labels = True
        elif content[i] == '}':
            brace_count -= 1
            if in_labels and brace_count == 0:
                prev_tweet_end = i + 1
                break
    
    # Reconstruct JSON array up to second-to-last tweet
    # Find opening bracket
    opening = content.find('[')
    if opening == -1:
        print("Could not find array opening")
        exit(1)
    
    # Take everything from opening to prev_tweet_end
    fixed_content = content[opening:prev_tweet_end] + '\n]'
    
    # Try to parse the fixed version
    try:
        fixed_data = json.loads(fixed_content)
        print(f"✓ Successfully fixed! Removed corrupted last tweet.")
        print(f"✓ File now contains {len(fixed_data)} valid tweets")
        
        # Save backup
        with open('labeled-viral-tweets-backup.json', 'w', encoding='utf-8') as f:
            f.write(content)
        print("✓ Backed up original to labeled-viral-tweets-backup.json")
        
        # Save fixed version
        with open('labeled-viral-tweets.json', 'w', encoding='utf-8') as f:
            json.dump(fixed_data, f, indent=2, ensure_ascii=False)
        print("✓ Saved fixed version to labeled-viral-tweets.json")
        
    except json.JSONDecodeError as e2:
        print(f"Fix failed: {e2}")
        print("Manual intervention required")
