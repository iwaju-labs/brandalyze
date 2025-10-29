"""
Social media API services for fetching posts and data from different platforms.
"""

def extract_social_media_posts(handle, platform="twitter", posts_count=10):
    """Extract recent posts from social media platform using APIs"""
    if platform.lower() == "twitter":
        return fetch_twitter_posts_via_api(handle, posts_count)
    elif platform.lower() == "linkedin":
        return fetch_linkedin_posts_via_api(handle, posts_count)
    else:
        raise Exception(
            f"PLATFORM_NOT_SUPPORTED - Platform {platform} is not yet supported"
        )


def extract_social_media_profile(handle, platform="twitter"):
    """Extract profile bio and information from social media platform using APIs"""
    if platform.lower() == "twitter":
        return fetch_twitter_profile_via_api(handle)
    elif platform.lower() == "linkedin":
        return fetch_linkedin_profile_via_api(handle)
    else:
        raise Exception(
            f"PLATFORM_NOT_SUPPORTED - Platform {platform} is not yet supported"
        )


def fetch_twitter_posts_via_api(handle, posts_count=10):
    """Fetch recent tweets using X API v2"""
    try:
        import tweepy
        from django.conf import settings
        
        # Clean the handle (remove @ if present)
        handle = handle.lstrip('@')
        
        print(f"🔍 Fetching {posts_count} tweets for @{handle} via X API")
        
        # Check if API credentials are configured
        bearer_token = getattr(settings, 'X_API_BEARER_TOKEN', None)
        if not bearer_token:
            raise Exception("X_API_NOT_CONFIGURED - X API Bearer Token not configured in settings")
        
        # Initialize Tweepy client with Bearer Token (for app-only authentication)
        client = tweepy.Client(bearer_token=bearer_token)
        
        try:
            # First, get the user ID from the username
            user_response = client.get_user(username=handle, user_fields=['public_metrics'])
            
            if not user_response.data:
                raise Exception(f"USER_NOT_FOUND - Twitter user @{handle} not found")
            
            user = user_response.data
            user_id = user.id
            
            print(f"✅ Found user @{handle} (ID: {user_id})")
            
            # Fetch recent tweets from the user
            tweets_response = client.get_users_tweets(
                id=user_id,
                max_results=min(posts_count, 100),  # API allows max 100 per request
                tweet_fields=['created_at', 'public_metrics', 'context_annotations', 'lang'],
                exclude=['retweets', 'replies']  # Focus on original content
            )
            
            if not tweets_response.data:
                raise Exception(f"NO_TWEETS_FOUND - No recent tweets found for @{handle}")
            
            # Parse tweets into our standard format
            posts_data = parse_x_api_tweets(tweets_response.data)
            
            print(f"✅ Successfully fetched {len(posts_data)} tweets for @{handle}")
            return posts_data
        except tweepy.TooManyRequests as e:
            raise Exception("X_API_RATE_LIMIT - API rate limit exceeded. Please try again in a few minutes. Free tier has limited requests per hour.")
        except tweepy.Unauthorized as e:
            raise Exception("X_API_UNAUTHORIZED - Invalid API credentials or insufficient permissions")
        except tweepy.Forbidden as e:
            raise Exception(f"X_API_FORBIDDEN - Access denied. User @{handle} may have protected tweets or account suspended")
        except tweepy.NotFound as e:
            raise Exception(f"USER_NOT_FOUND - Twitter user @{handle} not found")
        except Exception as e:
            if str(e).startswith(('X_API_', 'USER_', 'NO_TWEETS_')):
                raise e
            else:
                raise Exception(f"X_API_ERROR - {str(e)}")
        
    except ImportError:
        raise Exception("TWEEPY_NOT_INSTALLED - Tweepy library not installed")
    except Exception as e:
        error_msg = str(e)
        print(f"❌ X API error: {error_msg}")
        
        if error_msg.startswith(("X_API_", "TWITTER_", "USER_", "NO_TWEETS_", "TWEEPY_")):
            raise e
        else:
            raise Exception(f"X_API_ERROR - {error_msg}")


def fetch_twitter_profile_via_api(handle):
    """Fetch Twitter user profile information using X API v2"""
    try:
        import tweepy
        from django.conf import settings
        
        # Clean the handle (remove @ if present)
        handle = handle.lstrip('@')
        
        print(f"🔍 Fetching profile info for @{handle} via X API")
        
        # Check if API credentials are configured
        bearer_token = getattr(settings, 'X_API_BEARER_TOKEN', None)
        if not bearer_token:
            raise Exception("X_API_NOT_CONFIGURED - X API Bearer Token not configured in settings")
        
        # Initialize Tweepy client with Bearer Token (for app-only authentication)
        client = tweepy.Client(bearer_token=bearer_token)
        
        try:
            # Get the user profile with comprehensive fields
            user_response = client.get_user(
                username=handle, 
                user_fields=[
                    'description',      # Bio text
                    'public_metrics',   # Followers, following, etc.
                    'created_at',       # Account creation date
                    'location',         # Location if set
                    'url',              # Website URL if set
                    'verified',         # Verification status
                    'profile_image_url' # Profile image
                ]
            )
            
            if not user_response.data:
                raise Exception(f"USER_NOT_FOUND - Twitter user @{handle} not found")
            
            user = user_response.data
            
            print(f"✅ Found profile for @{handle} (ID: {user.id})")
            
            # Parse profile data into our standard format
            profile_data = parse_x_api_profile(user)
            
            print(f"✅ Successfully fetched profile data for @{handle}")
            return profile_data
            
        except tweepy.TooManyRequests as e:
            raise Exception("X_API_RATE_LIMIT - API rate limit exceeded. Please try again in a few minutes. Free tier has limited requests per hour.")
        except tweepy.Unauthorized as e:
            raise Exception("X_API_UNAUTHORIZED - Invalid API credentials or insufficient permissions")
        except tweepy.Forbidden as e:
            raise Exception(f"X_API_FORBIDDEN - Access denied. User @{handle} may have protected profile or account suspended")
        except tweepy.NotFound as e:
            raise Exception(f"USER_NOT_FOUND - Twitter user @{handle} not found")
        except Exception as e:
            if str(e).startswith(('X_API_', 'USER_')):
                raise e
            else:
                raise Exception(f"X_API_ERROR - {str(e)}")
        
    except ImportError:
        raise Exception("TWEEPY_NOT_INSTALLED - Tweepy library not installed")
    except Exception as e:
        error_msg = str(e)
        print(f"❌ X API profile error: {error_msg}")
        
        if error_msg.startswith(("X_API_", "TWITTER_", "USER_", "TWEEPY_")):
            raise e
        else:
            raise Exception(f"X_API_ERROR - {error_msg}")


def fetch_linkedin_posts_via_api(handle, posts_count=10):
    """Fetch recent LinkedIn posts using LinkedIn API"""
    try:
        # TODO: Implement LinkedIn API integration
        print(f"🔍 Fetching {posts_count} LinkedIn posts for {handle}")
        
        raise Exception("LINKEDIN_API_NOT_CONFIGURED - LinkedIn API integration not yet configured.")
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ LinkedIn API error: {error_msg}")
        
        if error_msg.startswith(("LINKEDIN_", "PLATFORM_")):
            raise e
        else:
            raise Exception(f"LINKEDIN_API_ERROR - {error_msg}")


def fetch_linkedin_profile_via_api(handle):
    """Fetch LinkedIn user profile information using LinkedIn API"""
    try:
        # TODO: Implement LinkedIn profile API integration
        print(f"🔍 Fetching LinkedIn profile for {handle}")
        
        raise Exception("LINKEDIN_API_NOT_CONFIGURED - LinkedIn profile API integration not yet configured.")
        
    except Exception as e:
        error_msg = str(e)
        print(f"❌ LinkedIn profile API error: {error_msg}")
        
        if error_msg.startswith(("LINKEDIN_", "PLATFORM_")):
            raise e
        else:
            raise Exception(f"LINKEDIN_API_ERROR - {error_msg}")


def parse_x_api_tweets(tweets_data):
    """Parse tweets from X API response into our standard format"""
    posts_data = []
    
    try:
        for tweet in tweets_data:
            # Extract data from X API response
            post_data = {
                'text': tweet.text,
                'engagement': tweet.public_metrics.get('like_count', 0) + 
                            tweet.public_metrics.get('retweet_count', 0) + 
                            tweet.public_metrics.get('reply_count', 0),
                'date': tweet.created_at.strftime('%Y-%m-%d'),
                'metrics': {
                    'likes': tweet.public_metrics.get('like_count', 0),
                    'retweets': tweet.public_metrics.get('retweet_count', 0),
                    'replies': tweet.public_metrics.get('reply_count', 0),
                    'quotes': tweet.public_metrics.get('quote_count', 0)
                },
                'source': 'x_api',
                'tweet_id': tweet.id
            }
            
            # Skip retweets if needed
            if not post_data['text'].startswith('RT @'):
                posts_data.append(post_data)
                
    except Exception as e:
        print(f"⚠️ Error parsing X API tweets: {str(e)}")
    
    return posts_data


def parse_x_api_profile(user_data):
    """Parse user profile from X API response into our standard format"""
    try:
        # Extract comprehensive profile data
        profile_data = {
            'handle': user_data.username,
            'display_name': user_data.name,
            'bio': user_data.description or '',
            'location': getattr(user_data, 'location', ''),
            'website': getattr(user_data, 'url', ''),
            'verified': getattr(user_data, 'verified', False),
            'created_at': user_data.created_at.strftime('%Y-%m-%d') if hasattr(user_data, 'created_at') and user_data.created_at else '',
            'metrics': {
                'followers': user_data.public_metrics.get('followers_count', 0),
                'following': user_data.public_metrics.get('following_count', 0),
                'tweets': user_data.public_metrics.get('tweet_count', 0),
                'listed': user_data.public_metrics.get('listed_count', 0)
            },
            'profile_image_url': getattr(user_data, 'profile_image_url', ''),
            'user_id': user_data.id,
            'source': 'x_api_profile'
        }
        
        return profile_data
        
    except Exception as e:
        print(f"⚠️ Error parsing X API profile: {str(e)}")
        # Return minimal profile data
        return {
            'handle': getattr(user_data, 'username', ''),
            'display_name': getattr(user_data, 'name', ''),
            'bio': getattr(user_data, 'description', ''),
            'location': '',
            'website': '',
            'verified': False,
            'created_at': '',
            'metrics': {
                'followers': 0,
                'following': 0,
                'tweets': 0,
                'listed': 0
            },
            'profile_image_url': '',
            'user_id': getattr(user_data, 'id', ''),
            'source': 'x_api_profile'
        }
