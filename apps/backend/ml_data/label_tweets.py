import json
from pathlib import Path

def load_dataset():
    """Load the dataset - resume from labeled file if it exists"""
    labeled_file = Path('labeled-viral-tweets.json')
    source_file = Path('merged-viral-tweets.json')
    
    if labeled_file.exists():
        print("Resuming from previous session...")
        with open(labeled_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    else:
        print("Starting fresh labeling session...")
        with open(source_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
def save_labeled_data(data):
    """save progress after each labeled tweet"""
    with open('labeled-viral-tweets.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def label_tweet(tweet):
    """interactive labeling for a single tweet"""
    print("\n" + "="*80)
    print(f"Tweet ID: {tweet['id']}")
    print(f"Author: @{tweet['author']['userName']} ({tweet['likeCount']:,} likes)")
    print(f"Virality: {tweet['viralityTier']}")
    
    # Determine tweet type
    tweet_type = "Tweet"
    if tweet.get('isRetweet'):
        tweet_type = "Retweet"
    elif tweet.get('isQuote'):
        tweet_type = "Quote Tweet"
    elif tweet.get('isReply'):
        tweet_type = "Reply"
    
    # Check for media
    has_media = bool(tweet.get('extendedEntities', {}).get('media', []))
    media_types = []
    if has_media:
        media_types = [m.get('type', 'unknown') for m in tweet['extendedEntities']['media']]
    media_str = f" | Media: {', '.join(media_types)}" if has_media else " | No media"
    
    print(f"Type: {tweet_type}{media_str}")
    
    # Tweet URL
    tweet_url = tweet.get('url', f"https://x.com/{tweet['author']['userName']}/status/{tweet['id']}")
    print(f"URL: {tweet_url}")
    
    print("-"*80)
    print(tweet['text'])
    print("-"*80)
    
    # Post Format with validation
    print("\nPost Format:")
    print("1. Informative  2. Educational  3. Entertaining")
    print("4. Shitpost     5. Inspirational  6. Story/Thread")
    print("7. Opinion      8. News          9. Question")
    while True:
        format_label = input("Select format (1-9): ").strip()
        if format_label in ['1', '2', '3', '4', '5', '6', '7', '8', '9']:
            break
        print("❌ Invalid input. Please enter a number between 1-9.")
    
    # Hook Quality with validation
    print("\nHook Quality:")
    print("1. Strong  2. Medium  3. Weak  4. No Hook")
    while True:
        hook_label = input("Select hook quality (1-4): ").strip()
        if hook_label in ['1', '2', '3', '4']:
            break
        print("❌ Invalid input. Please enter a number between 1-4.")
    
    # Closer Type with validation
    print("\nCloser Type:")
    print("1. CTA  2. Question  3. Statement  4. Cliffhanger  5. None")
    while True:
        closer_label = input("Select closer type (1-5): ").strip()
        if closer_label in ['1', '2', '3', '4', '5']:
            break
        print("❌ Invalid input. Please enter a number between 1-5.")
    
    # Skip option with validation
    while True:
        skip = input("\nSkip this tweet? (y/n): ").strip().lower()
        if skip in ['y', 'n']:
            break
        print("❌ Invalid input. Please enter 'y' or 'n'.")
    
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
        'format': format_map[format_label],
        'hookQuality': hook_map[hook_label],
        'closerType': closer_map[closer_label]
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
            (print(f"\n✅ saved ({labeled_count}/{len(data)})"))

        cont = input("\nContinue? (Enter to continue, 'q' to quit): ").strip()
        if cont.lower() == 'q':
            break

if __name__ == '__main__':
    main()