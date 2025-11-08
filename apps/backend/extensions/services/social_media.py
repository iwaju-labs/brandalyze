"""
Social media data processing services for content extracted via DOM.
"""

from utils.exceptions import (
    PlatformUnsupportedError
)


def process_extracted_social_media_data(extracted_data, platform="twitter"):
    """Process social media data extracted from DOM by content scripts"""
    if platform.lower() in ["twitter", "x"]:
        return process_twitter_extracted_data(extracted_data)
    elif platform.lower() == "linkedin":
        return process_linkedin_extracted_data(extracted_data)
    else:
        raise PlatformUnsupportedError(
            f"PLATFORM_NOT_SUPPORTED - Platform {platform} is not yet supported"
        )


def process_twitter_extracted_data(extracted_data):
    """Process Twitter/X data extracted from DOM"""
    try:
        # Handle both profile and posts data
        if 'bio' in extracted_data:
            # Profile data
            return {
                'type': 'profile',
                'handle': extracted_data.get('handle', ''),
                'display_name': extracted_data.get('display_name', ''),
                'bio': extracted_data.get('bio', ''),
                'location': extracted_data.get('location', ''),
                'followers_count': extracted_data.get('followers_count', 0),
                'following_count': extracted_data.get('following_count', 0),
                'verified': extracted_data.get('verified', False),
                'source': 'twitter_dom'
            }
        elif 'posts' in extracted_data:
            # Posts data
            posts = []
            for post in extracted_data.get('posts', []):
                posts.append({
                    'text': post.get('text', ''),
                    'date': post.get('date', ''),
                    'engagement': post.get('engagement', 0),
                    'metrics': post.get('metrics', {}),
                    'source': 'twitter_dom'
                })
            return {
                'type': 'posts',
                'posts': posts,
                'source': 'twitter_dom'
            }
        else:
            return extracted_data
    except Exception as e:
        print(f"⚠️ Error processing Twitter extracted data: {str(e)}")
        return extracted_data


def process_linkedin_extracted_data(extracted_data):
    """Process LinkedIn data extracted from DOM"""
    try:
        # Handle LinkedIn profile data structure
        if 'headline' in extracted_data or 'bio' in extracted_data:
            # Profile data
            return {
                'type': 'profile',
                'handle': extracted_data.get('handle', ''),
                'display_name': extracted_data.get('display_name', ''),
                'headline': extracted_data.get('headline', ''),
                'bio': extracted_data.get('bio', ''),
                'location': extracted_data.get('location', ''),
                'connections_count': extracted_data.get('connections_count', 0),
                'company': extracted_data.get('company', ''),
                'industry': extracted_data.get('industry', ''),
                'source': 'linkedin_dom'
            }
        elif 'posts' in extracted_data:
            # Posts data (future use)
            posts = []
            for post in extracted_data.get('posts', []):
                posts.append({
                    'text': post.get('text', ''),
                    'date': post.get('date', ''),
                    'engagement': post.get('engagement', 0),
                    'metrics': post.get('metrics', {}),
                    'source': 'linkedin_dom'
                })
            return {
                'type': 'posts',
                'posts': posts,
                'source': 'linkedin_dom'
            }
        else:
            return extracted_data
    except Exception as e:
        print(f"⚠️ Error processing LinkedIn extracted data: {str(e)}")
        return extracted_data
