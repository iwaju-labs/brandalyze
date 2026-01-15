import json

print("Merging labeled tweets back into full dataset...")

# Load the full original dataset
with open('merged-viral-tweets.json', 'r', encoding='utf-8') as f:
    full_data = json.load(f)
print(f"✓ Loaded {len(full_data)} tweets from merged dataset")

# Load the labeled tweets
with open('labeled-viral-tweets.json', 'r', encoding='utf-8') as f:
    labeled_data = json.load(f)
print(f"✓ Loaded {len(labeled_data)} labeled tweets")

# Create a mapping of tweet ID to labels
labels_map = {}
for tweet in labeled_data:
    labels_map[tweet['id']] = tweet['labels']

print(f"✓ Created labels mapping for {len(labels_map)} tweets")

# Apply labels to the full dataset
labeled_count = 0
for tweet in full_data:
    if tweet['id'] in labels_map:
        tweet['labels'] = labels_map[tweet['id']]
        labeled_count += 1

print(f"✓ Applied {labeled_count} labels to full dataset")

# Save the merged result
with open('labeled-viral-tweets.json', 'w', encoding='utf-8') as f:
    json.dump(full_data, f, indent=2, ensure_ascii=False)

print(f"✓ Saved complete dataset with labels")
print(f"\nSummary:")
print(f"  Total tweets: {len(full_data)}")
print(f"  Labeled: {labeled_count}")
print(f"  Remaining: {len(full_data) - labeled_count}")
