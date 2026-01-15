import json
import os

print("Attempting to recover labeled tweets...")

# Read the file
with open('labeled-viral-tweets.json', 'r', encoding='utf-8') as f:
    content = f.read()

# Backup the corrupted file
with open('labeled-viral-tweets-corrupted-backup.json', 'w', encoding='utf-8') as f:
    f.write(content)
print("✓ Backed up corrupted file")

# Try to find the last valid complete tweet by parsing incrementally
# Strategy: Find all tweets with labels, keep all but the last one

valid_tweets = []
decoder = json.JSONDecoder()
content = content.strip()

# Remove opening bracket if present
if content.startswith('['):
    content = content[1:]

# Try to parse tweets one by one
remaining = content.strip()
while remaining:
    remaining = remaining.lstrip()
    
    # Stop at closing bracket
    if remaining.startswith(']'):
        break
    
    # Remove leading comma if present
    if remaining.startswith(','):
        remaining = remaining[1:].lstrip()
    
    try:
        # Try to parse one object
        obj, idx = decoder.raw_decode(remaining)
        
        # Only keep tweets that have labels
        if 'labels' in obj:
            valid_tweets.append(obj)
            print(f"\rLoaded {len(valid_tweets)} labeled tweets", end='', flush=True)
        
        # Move to next object
        remaining = remaining[idx:]
        
    except json.JSONDecodeError as e:
        print(f"\n\nStopped at position {len(content) - len(remaining)}")
        print(f"Error: {e.msg}")
        break

print(f"\n\n✓ Successfully recovered {len(valid_tweets)} labeled tweets")

if len(valid_tweets) > 0:
    # Remove the last tweet as requested
    valid_tweets = valid_tweets[:-1]
    print(f"✓ Removed last tweet as requested")
    print(f"✓ Final count: {len(valid_tweets)} tweets")
    
    # Save the fixed version
    with open('labeled-viral-tweets.json', 'w', encoding='utf-8') as f:
        json.dump(valid_tweets, f, indent=2, ensure_ascii=False)
    
    print("✓ Saved fixed file")
    
    # Show label distribution
    formats = {}
    for t in valid_tweets:
        fmt = t['labels']['format']
        formats[fmt] = formats.get(fmt, 0) + 1
    
    print("\nLabel distribution:")
    for fmt, count in sorted(formats.items(), key=lambda x: x[1], reverse=True):
        print(f"  {fmt}: {count}")
else:
    print("❌ No valid tweets recovered!")
