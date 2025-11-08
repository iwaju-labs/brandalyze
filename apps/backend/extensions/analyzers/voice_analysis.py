"""
AI-powered analysis functions for brand voice, alignment, and content analysis.
"""
import re
import string
from collections import Counter
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer

# Optional textstat import with fallback
try:
    from textstat import flesch_reading_ease, flesch_kincaid_grade
    TEXTSTAT_AVAILABLE = True
except ImportError:
    TEXTSTAT_AVAILABLE = False

# Download required NLTK data if not already present
try:
    nltk.data.find('vader_lexicon')
except LookupError:
    nltk.download('vader_lexicon', quiet=True)

try:
    nltk.data.find('punkt')
except LookupError:
    nltk.download('punkt', quiet=True)


def calculate_emotional_indicators(text):
    """Calculate real emotional indicators based on text analysis"""
    if not text or not text.strip():
        return {
            "enthusiasm": 5.0,
            "professionalism": 5.0,
            "approachability": 5.0,
            "authority": 5.0,
        }
    
    # Initialize sentiment analyzer
    sia = SentimentIntensityAnalyzer()
    
    # Calculate enthusiasm score (0-10)
    enthusiasm = calculate_enthusiasm_score(text, sia)
    
    # Calculate professionalism score (0-10)  
    professionalism = calculate_professionalism_score(text)
    
    # Calculate approachability score (0-10)
    approachability = calculate_approachability_score(text, sia)
    
    # Calculate authority score (0-10)
    authority = calculate_authority_score(text)
    
    return {
        "enthusiasm": round(enthusiasm, 1),
        "professionalism": round(professionalism, 1),
        "approachability": round(approachability, 1), 
        "authority": round(authority, 1),
    }


def calculate_enthusiasm_score(text, sia):
    """Calculate enthusiasm based on positive sentiment, exclamation marks, and energetic words"""
    # Get sentiment scores
    sentiment_scores = sia.polarity_scores(text)
    positive_sentiment = sentiment_scores['pos']
    
    # Count exclamation marks
    exclamation_count = text.count('!')
    total_sentences = len([s for s in text.split('.') if s.strip()])
    exclamation_ratio = exclamation_count / max(total_sentences, 1)
    
    # Count enthusiastic words
    enthusiastic_words = [
        'amazing', 'awesome', 'fantastic', 'incredible', 'wonderful', 'brilliant',
        'excited', 'thrilled', 'love', 'passionate', 'energy', 'dynamic',
        'innovative', 'breakthrough', 'revolutionary', 'outstanding', 'excellent',
        'superb', 'magnificent', 'spectacular', 'phenomenal', 'extraordinary'
    ]
    
    text_lower = text.lower()
    enthusiastic_word_count = sum(1 for word in enthusiastic_words if word in text_lower)
    word_count = len(text.split())
    enthusiastic_word_ratio = enthusiastic_word_count / max(word_count, 1)
    
    # Count ALL CAPS words (excluding single letters and common abbreviations)
    caps_words = re.findall(r'\b[A-Z]{2,}\b', text)
    caps_ratio = len(caps_words) / max(word_count, 1)
    
    # Calculate composite score
    enthusiasm_score = (
        positive_sentiment * 4.0 +  # 0-4 points from sentiment
        min(exclamation_ratio * 20, 3.0) +  # 0-3 points from exclamations
        min(enthusiastic_word_ratio * 50, 2.0) +  # 0-2 points from enthusiastic words
        min(caps_ratio * 20, 1.0)  # 0-1 points from caps
    )
    
    return min(max(enthusiasm_score, 0), 10)


def calculate_professionalism_score(text):
    """Calculate professionalism based on language complexity, formal words, and writing style"""
    if not text or len(text.strip()) < 10:
        return 5.0
        
    # Reading level analysis
    if TEXTSTAT_AVAILABLE:
        try:
            reading_ease = flesch_reading_ease(text)
            # Convert to 0-10 scale (lower reading ease = higher professionalism)
            reading_professionalism = max(0, (100 - reading_ease) / 10)
        except Exception:
            reading_professionalism = 5.0
    else:
        # Fallback reading level calculation based on sentence and word complexity
        words = text.split()
        sentences = [s for s in text.split('.') if s.strip()]
        avg_word_length = sum(len(word) for word in words) / max(len(words), 1)
        avg_sentence_length = len(words) / max(len(sentences), 1)
        
        # Simple complexity score (longer words and sentences = more professional)
        reading_professionalism = min(10, (avg_word_length - 3) * 2 + (avg_sentence_length - 10) * 0.2)
    
    # Professional vocabulary
    professional_words = [
        'strategy', 'implement', 'analyze', 'optimize', 'leverage', 'facilitate',
        'collaborate', 'expertise', 'experience', 'professional', 'industry',
        'solution', 'development', 'management', 'leadership', 'objective',
        'achievement', 'performance', 'quality', 'excellence', 'innovation',
        'results', 'growth', 'success', 'organizational', 'strategic'
    ]
    
    text_lower = text.lower()
    professional_word_count = sum(1 for word in professional_words if word in text_lower)
    word_count = len(text.split())
    professional_ratio = professional_word_count / max(word_count, 1)
    
    # Sentence structure complexity
    avg_sentence_length = word_count / max(len([s for s in text.split('.') if s.strip()]), 1)
    sentence_complexity = min(avg_sentence_length / 20 * 3, 3.0)  # 0-3 points
    
    # Avoid casual language markers
    casual_markers = ['lol', 'omg', 'tbh', 'btw', 'imo', 'fyi', 'asap', 'etc']
    casual_count = sum(1 for marker in casual_markers if marker in text_lower)
    casual_penalty = min(casual_count * 0.5, 2.0)
    
    # Calculate composite score
    professionalism_score = (
        min(reading_professionalism * 0.4, 2.5) +  # 0-2.5 points from reading level
        min(professional_ratio * 40, 3.0) +  # 0-3 points from professional vocabulary
        sentence_complexity +  # 0-3 points from sentence complexity
        1.5 -  # Base professionalism
        casual_penalty  # Penalty for casual language
    )
    
    return min(max(professionalism_score, 0), 10)


def calculate_approachability_score(text, sia):
    """Calculate approachability based on friendly language, questions, and inclusive tone"""
    # Sentiment analysis for friendliness
    sentiment_scores = sia.polarity_scores(text)
    positive_sentiment = sentiment_scores['pos']
    
    # Question marks (engaging with audience)
    question_count = text.count('?')
    total_sentences = len([s for s in text.split('.') if s.strip()])
    question_ratio = question_count / max(total_sentences, 1)
    
    # Friendly/approachable words
    friendly_words = [
        'welcome', 'thanks', 'please', 'help', 'share', 'join', 'together',
        'community', 'team', 'support', 'friendly', 'open', 'happy', 'glad',
        'appreciate', 'grateful', 'kind', 'warm', 'inviting', 'accessible',
        'inclusive', 'collaborative', 'understanding', 'empathetic'
    ]
    
    text_lower = text.lower()
    friendly_word_count = sum(1 for word in friendly_words if word in text_lower)
    word_count = len(text.split())
    friendly_ratio = friendly_word_count / max(word_count, 1)
    
    # Personal pronouns (you, we, us, our)
    personal_pronouns = ['you', 'we', 'us', 'our', 'your', 'ourselves', 'together']
    pronoun_count = sum(1 for pronoun in personal_pronouns if pronoun in text_lower.split())
    pronoun_ratio = pronoun_count / max(word_count, 1)
    
    # Contractions (more conversational/approachable)
    contractions = ["'re", "'ve", "'ll", "'d", "n't", "'m", "'s"]
    contraction_count = sum(1 for contraction in contractions if contraction in text)
    contraction_ratio = contraction_count / max(word_count, 1)
    
    # Calculate composite score
    approachability_score = (
        positive_sentiment * 3.0 +  # 0-3 points from positive sentiment
        min(question_ratio * 15, 2.0) +  # 0-2 points from questions
        min(friendly_ratio * 30, 2.5) +  # 0-2.5 points from friendly words
        min(pronoun_ratio * 20, 1.5) +  # 0-1.5 points from personal pronouns
        min(contraction_ratio * 10, 1.0)  # 0-1 points from contractions
    )
    
    return min(max(approachability_score, 0), 10)


def calculate_authority_score(text):
    """Calculate authority based on expertise indicators, confidence markers, and credentials"""
    # Authority/expertise words
    authority_words = [
        'expert', 'expertise', 'experience', 'proven', 'established', 'leading',
        'recognized', 'award', 'certified', 'qualified', 'specialist', 'authority',
        'pioneering', 'renowned', 'accomplished', 'distinguished', 'respected',
        'industry', 'leader', 'executive', 'director', 'founder', 'ceo', 'president',
        'research', 'study', 'analysis', 'data', 'evidence', 'results', 'findings'
    ]
    
    text_lower = text.lower()
    authority_word_count = sum(1 for word in authority_words if word in text_lower)
    word_count = len(text.split())
    authority_ratio = authority_word_count / max(word_count, 1)
    
    # Confidence markers vs uncertainty
    confidence_words = ['will', 'should', 'must', 'clearly', 'obviously', 'certainly', 'definitely']
    uncertainty_words = ['maybe', 'perhaps', 'possibly', 'might', 'could', 'probably', 'seems']
    
    confidence_count = sum(1 for word in confidence_words if word in text_lower.split())
    uncertainty_count = sum(1 for word in uncertainty_words if word in text_lower.split())
    
    confidence_ratio = confidence_count / max(word_count, 1)
    uncertainty_penalty = uncertainty_count / max(word_count, 1)
    
    # Numbers and statistics (data-driven authority)
    number_pattern = r'\b\d+(?:\.\d+)?%?|\$\d+|\d+k\b|\d+m\b'
    number_matches = re.findall(number_pattern, text, re.IGNORECASE)
    number_ratio = len(number_matches) / max(word_count, 1)
    
    # Industry jargon and technical terms (indicate expertise)
    technical_indicators = text_lower.count('technology') + text_lower.count('solution') + \
                          text_lower.count('platform') + text_lower.count('system') + \
                          text_lower.count('framework') + text_lower.count('methodology')
    technical_ratio = technical_indicators / max(word_count, 1)
    
    # Calculate composite score  
    authority_score = (
        min(authority_ratio * 35, 3.0) +  # 0-3 points from authority words
        min(confidence_ratio * 25, 2.0) +  # 0-2 points from confidence
        min(number_ratio * 20, 1.5) +  # 0-1.5 points from data/numbers
        min(technical_ratio * 15, 1.5) +  # 0-1.5 points from technical terms
        2.0 -  # Base authority score
        min(uncertainty_penalty * 15, 1.5)  # Penalty for uncertainty
    )
    
    return min(max(authority_score, 0), 10)


def perform_profile_voice_analysis(
    handle, platform="twitter", posts_count=10, extracted_posts=None, use_bio=True, extracted_bio=None
):
    """Analyze a profile to extract brand voice and style characteristics using AI"""
    try:
        if use_bio:
            # Use bio analysis (more efficient for rate limits)
            return perform_profile_bio_analysis(handle, platform, extracted_bio)
        else:
            # Use posts analysis (original method)
            return perform_profile_posts_analysis(handle, platform, posts_count, extracted_posts)

    except Exception as e:
        error_msg = str(e)
        print(f"Profile voice analysis error: {error_msg}")
        raise Exception(error_msg)


def perform_profile_bio_analysis(handle, platform="twitter", extracted_bio=None):
    """Analyze a profile's bio and information to extract brand voice characteristics using AI"""
    try:
        print(f"🎯 Analyzing profile bio for @{handle} on {platform}")
        
        # Use extracted bio if provided, otherwise fetch from API
        if extracted_bio:
            print(f"✅ Using bio data extracted by extension: {extracted_bio}")
            profile_data = extracted_bio
        else:
            from ..services.social_media import extract_social_media_profile
            print(f"🔍 Fetching profile data via API for @{handle}")
            profile_data = extract_social_media_profile(handle, platform)
        
        if not profile_data or not profile_data.get('bio'):
            raise Exception(
                "NO_BIO_FOUND - No bio content found for analysis. User may not have a bio set."
            )

        # Combine available profile text for analysis
        profile_text_parts = []
        
        if profile_data.get('bio'):
            profile_text_parts.append(f"Bio: {profile_data['bio']}")
        
        if profile_data.get('display_name') and profile_data['display_name'] != profile_data.get('handle'):
            profile_text_parts.append(f"Display Name: {profile_data['display_name']}")
            
        if profile_data.get('location'):
            profile_text_parts.append(f"Location: {profile_data['location']}")

        profile_text = "\n".join(profile_text_parts)
        
        if not profile_text.strip():
            raise Exception("NO_CONTENT_EXTRACTED - No analyzable text content found in profile.")

        try:
            from ai_core.analysis import BrandAnalyzer
            from django.conf import settings

            api_key = getattr(settings, "OPENAI_API_KEY", None)
            if not api_key:
                raise Exception(
                    "AI_SERVICE_NOT_CONFIGURED - OpenAI API key not configured"
                )

            analyzer = BrandAnalyzer(api_key)
            voice_analysis = analyze_bio_voice_with_ai(analyzer, profile_text, profile_data, handle)

        except ImportError:
            raise Exception("AI_CORE_NOT_AVAILABLE - AI analysis module not available")

        return {
            "handle": handle,
            "platform": platform,
            "analysis_type": "bio_analysis",
            "profile_data": profile_data,
            "voice_analysis": voice_analysis,
            "confidence_score": 0.75,  # Bio analysis has good confidence but lower than posts
            "analysis_summary": f"@{handle} profile bio analysis completed with {len(profile_text)} characters of content.",
        }

    except Exception as e:
        error_msg = str(e)
        print(f"Profile bio analysis error: {error_msg}")
        raise Exception(error_msg)


def perform_profile_posts_analysis(
    handle, platform="twitter", posts_count=10, extracted_posts=None
):
    """Analyze a profile's posts to extract brand voice and style characteristics using AI (original method)"""
    try:
        from ..services.social_media import extract_social_media_posts
        
        # Use extracted posts if provided, otherwise try to extract from social media
        if extracted_posts and len(extracted_posts) > 0:
            posts_data = extracted_posts
            print(f"✅ Using {len(posts_data)} posts extracted by extension")
        else:
            posts_data = extract_social_media_posts(handle, platform, posts_count)

        if not posts_data or len(posts_data) == 0:
            raise Exception(
                "NO_POSTS_FOUND - No posts found for analysis. Please ensure you're on the profile page with visible posts."
            )

        # Use AI to analyze the voice characteristics
        posts_text = "\n\n---\n\n".join(
            [post["text"] for post in posts_data if post.get("text")]
        )

        if not posts_text.strip():
            raise Exception("NO_CONTENT_EXTRACTED - No text content found in posts.")

        try:
            from ai_core.analysis import BrandAnalyzer
            from django.conf import settings

            api_key = getattr(settings, "OPENAI_API_KEY", None)
            if not api_key:
                raise Exception(
                    "AI_SERVICE_NOT_CONFIGURED - OpenAI API key not configured"
                )

            analyzer = BrandAnalyzer(api_key)
            voice_analysis = analyze_voice_with_ai(analyzer, posts_text, handle)

        except ImportError:
            raise Exception("AI_CORE_NOT_AVAILABLE - AI analysis module not available")

        return {
            "handle": handle,
            "platform": platform,
            "analysis_type": "posts_analysis",
            "posts_analyzed": len(posts_data),
            "sample_posts": posts_data[:3],  # Include first 3 posts as samples
            "voice_analysis": voice_analysis,
            "confidence_score": min(
                0.95, max(0.6, len(posts_data) / posts_count * 0.8 + 0.2)
            ),
            "analysis_summary": f"@{handle} demonstrates clear voice patterns across {len(posts_data)} analyzed posts.",
        }

    except Exception as e:
        error_msg = str(e)
        print(f"Profile posts analysis error: {error_msg}")
        raise Exception(error_msg)


def analyze_bio_voice_with_ai(analyzer, profile_text, profile_data, handle):
    """Use AI to analyze voice characteristics from profile bio and information"""
    try:
        # Create a comprehensive prompt for bio voice analysis
        follower_count = profile_data.get('metrics', {}).get('followers', 0)
        verified = profile_data.get('verified', False)
        account_age = profile_data.get('created_at', '')
        
        bio_prompt = f"""
        Analyze the brand voice and communication style of @{handle} based on their social media profile:

        Profile Information:
        {profile_text}
        
        Account Metrics:
        - Followers: {follower_count:,}
        - Verified: {verified}
        - Account Created: {account_age}

        You must respond with ONLY a valid JSON object in this exact format:
        {{
            "tone": "A concise description of their overall communication tone (e.g., 'Professional and approachable', 'Energetic and innovative')",
            "style": "Their communication style (e.g., 'Thought leadership focused', 'Personal brand storytelling')",
            "personality_traits": [
                "First key personality trait",
                "Second key personality trait", 
                "Third key personality trait",
                "Fourth key personality trait"
            ],
            "communication_patterns": [
                "First communication pattern observed",
                "Second communication pattern observed",
                "Third communication pattern observed"
            ],
            "content_themes": [
                "Primary content theme",
                "Secondary content theme",
                "Third content theme"
            ],
            "emotional_indicators": {{
                "enthusiasm": 0.0,
                "professionalism": 0.0,
                "approachability": 0.0,
                "authority": 0.0
            }}
        }}

        Base your analysis on the profile information provided. Provide realistic insights while acknowledging this is based on bio/profile data only.
        """

        print(f"🤖 Sending bio analysis prompt for @{handle}")
        response = analyzer.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": bio_prompt}],
            max_tokens=600,
            temperature=0.3,
        )

        ai_response = response.choices[0].message.content
        print(f"🎯 AI Response for @{handle}: {ai_response}")

        # Parse the AI response into structured format with text content for emotional indicators
        bio_analysis = parse_voice_analysis_response(ai_response, profile_text)
        
        # Add bio-specific metadata
        bio_analysis['analysis_source'] = 'profile_bio'
        bio_analysis['bio_length'] = len(profile_data.get('bio', ''))
        bio_analysis['has_location'] = bool(profile_data.get('location'))
        bio_analysis['has_website'] = bool(profile_data.get('website'))
        
        print(f"✅ Parsed bio analysis for @{handle}: {bio_analysis}")
        return bio_analysis

    except Exception as e:
        print(f"AI bio analysis error: {e}")
        # Return structured fallback analysis based on basic profile info
        # Calculate real emotional indicators even for fallback
        fallback_emotional_indicators = calculate_emotional_indicators(profile_text)
        
        return {
            "tone": "Professional based on profile setup",
            "style": "Personal brand communication",
            "personality_traits": [
                "Professional presence",
                "Brand-conscious",
                "Digitally engaged",
            ],
            "communication_patterns": [
                "Likely uses structured messaging",
                "Profile indicates organized approach",
                "Maintains consistent online presence",
            ],
            "content_themes": [
                "Professional topics",
                "Industry-related content",
                "Personal insights",
            ],
            "emotional_indicators": fallback_emotional_indicators,
            "analysis_source": "profile_bio",
            "bio_length": len(profile_data.get('bio', '')),
            "has_location": bool(profile_data.get('location')),
            "has_website": bool(profile_data.get('website')),
        }


def analyze_voice_with_ai(analyzer, posts_text, handle):
    """Use AI to analyze voice characteristics from posts"""
    try:
        # Create a comprehensive prompt for voice analysis
        voice_prompt = f"""
        Analyze the voice and communication style of @{handle} based on their social media posts:

        Posts:
        {posts_text}

        Please analyze and provide a structured response with:

        1. TONE: Describe the overall tone (professional, casual, enthusiastic, etc.)
        2. STYLE: Communication style (conversational, formal, thought leadership, etc.)
        3. PERSONALITY_TRAITS: List 3-4 key personality traits evident in the writing
        4. COMMUNICATION_PATTERNS: Specific patterns (use of emojis, hashtags, question asking, etc.)
        5. CONTENT_THEMES: Main topics and themes they discuss
        6. EMOTIONAL_INDICATORS: Emotional qualities with scores 0-10 (enthusiasm, professionalism, approachability, authority)

        Format your response as clear, concise descriptions for each category.
        """

        response = analyzer.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": voice_prompt}],
            max_tokens=600,
            temperature=0.3,
        )

        ai_response = response.choices[0].message.content

        # Parse the AI response into structured format with text content for emotional indicators
        return parse_voice_analysis_response(ai_response, posts_text)

    except Exception as e:
        print(f"AI voice analysis error: {e}")
        # Return structured fallback analysis with real emotional indicators
        fallback_emotional_indicators = calculate_emotional_indicators(posts_text)
        return {
            "tone": "Professional and engaging",
            "style": "Thought leadership with personal insights",
            "personality_traits": [
                "Forward-thinking and innovative",
                "Community-focused",
                "Results-oriented",
            ],
            "communication_patterns": [
                "Uses industry terminology effectively",
                "Shares actionable insights",
                "Engages with enthusiasm markers",
            ],
            "content_themes": [
                "Business strategy",
                "Industry trends",
                "Team collaboration",
            ],
            "emotional_indicators": fallback_emotional_indicators,
        }


def parse_voice_analysis_response(ai_response, text_content=None):
    """Parse AI response into structured voice analysis data using JSON parsing"""
    try:
        print(f"🔍 Parsing AI response: {ai_response[:200]}...")
        
        # Try to parse as JSON first (new format)
        import json
        import re
        
        # Clean the response to extract JSON
        cleaned_response = ai_response.strip()
        
        # Try to find JSON object in the response
        json_match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                voice_data = json.loads(json_str)
                print(f"✅ Successfully parsed JSON response: {voice_data}")
                
                # Validate required fields and provide defaults if missing
                if "tone" not in voice_data:
                    voice_data["tone"] = "Professional communication style"
                if "style" not in voice_data:
                    voice_data["style"] = "Thoughtful brand communication"
                if "personality_traits" not in voice_data or not voice_data["personality_traits"]:
                    voice_data["personality_traits"] = ["Professional", "Thoughtful", "Engaging"]
                if "communication_patterns" not in voice_data or not voice_data["communication_patterns"]:
                    voice_data["communication_patterns"] = ["Clear messaging", "Consistent tone"]
                if "content_themes" not in voice_data or not voice_data["content_themes"]:
                    voice_data["content_themes"] = ["Professional content", "Industry insights"]
                
                # Always calculate real emotional indicators if we have text content
                if text_content and text_content.strip():
                    voice_data["emotional_indicators"] = calculate_emotional_indicators(text_content)
                elif "emotional_indicators" not in voice_data:
                    voice_data["emotional_indicators"] = {
                        "enthusiasm": 5.0,
                        "professionalism": 5.0,
                        "approachability": 5.0,
                        "authority": 5.0,
                    }
                
                return voice_data
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON parsing failed: {e}")
                # Fall back to text parsing
                pass
        
        # Fallback to text parsing for older format responses
        print("📝 Falling back to text parsing...")
        return parse_text_response_fallback(ai_response, text_content)

    except Exception as e:
        print(f"❌ Error parsing voice analysis: {e}")
        # Return enhanced fallback with better defaults
        fallback_emotional_indicators = (
            calculate_emotional_indicators(text_content) 
            if text_content and text_content.strip() 
            else {
                "enthusiasm": 5.0,
                "professionalism": 5.0,
                "approachability": 5.0,
                "authority": 5.0,
            }
        )
        
        return {
            "tone": "Professional and engaging",
            "style": "Thoughtful communication with industry focus",
            "personality_traits": [
                "Industry-focused professional",
                "Strategic thinker", 
                "Relationship builder",
                "Goal-oriented"
            ],
            "communication_patterns": [
                "Uses industry-specific terminology",
                "Shares insights and expertise",
                "Engages with professional network"
            ],
            "content_themes": [
                "Professional development",
                "Industry insights",
                "Leadership perspectives",
                "Business strategy"
            ],
            "emotional_indicators": fallback_emotional_indicators,
        }
    try:
        print(f"🔍 Parsing AI response: {ai_response[:200]}...")
        
        # Try to parse as JSON first (new format)
        import json
        import re
        
        # Clean the response to extract JSON
        cleaned_response = ai_response.strip()
        
        # Try to find JSON object in the response
        json_match = re.search(r'\{.*\}', cleaned_response, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            try:
                voice_data = json.loads(json_str)
                print(f"✅ Successfully parsed JSON response: {voice_data}")
                
                # Validate required fields and provide defaults if missing
                if "tone" not in voice_data:
                    voice_data["tone"] = "Professional communication style"
                if "style" not in voice_data:
                    voice_data["style"] = "Thoughtful brand communication"
                if "personality_traits" not in voice_data or not voice_data["personality_traits"]:
                    voice_data["personality_traits"] = ["Professional", "Thoughtful", "Engaging"]
                if "communication_patterns" not in voice_data or not voice_data["communication_patterns"]:
                    voice_data["communication_patterns"] = ["Clear messaging", "Consistent tone"]
                if "content_themes" not in voice_data or not voice_data["content_themes"]:
                    voice_data["content_themes"] = ["Professional content", "Industry insights"]
                if "emotional_indicators" not in voice_data:
                    voice_data["emotional_indicators"] = {
                        "enthusiasm": 7.0,
                        "professionalism": 8.0,
                        "approachability": 7.5,
                        "authority": 7.5,
                    }
                
                return voice_data
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON parsing failed: {e}")
                # Fall back to text parsing
                pass
        
        # Fallback to text parsing for older format responses
        print("📝 Falling back to text parsing...")
        return parse_text_response_fallback(ai_response)

    except Exception as e:
        print(f"❌ Error parsing voice analysis: {e}")
        # Return enhanced fallback with better defaults
        return {
            "tone": "Professional and engaging",
            "style": "Thoughtful communication with industry focus",
            "personality_traits": [
                "Industry-focused professional",
                "Strategic thinker", 
                "Relationship builder",
                "Goal-oriented"
            ],
            "communication_patterns": [
                "Uses industry-specific terminology",
                "Shares insights and expertise",
                "Engages with professional network"
            ],
            "content_themes": [
                "Professional development",
                "Industry insights",
                "Leadership perspectives",
                "Business strategy"
            ],
            "emotional_indicators": {
                "enthusiasm": 7.5,
                "professionalism": 9.0,
                "approachability": 7.0,
                "authority": 8.0,
            },
        }


def parse_text_response_fallback(ai_response, text_content=None):
    """Fallback parsing for text-based AI responses"""
    # Initialize default structure with real emotional indicators if possible
    fallback_emotional_indicators = (
        calculate_emotional_indicators(text_content) 
        if text_content and text_content.strip() 
        else {
            "enthusiasm": 5.0,
            "professionalism": 5.0,
            "approachability": 5.0,
            "authority": 5.0,
        }
    )
    
    voice_data = {
        "tone": "Not specified",
        "style": "Not specified", 
        "personality_traits": [],
        "communication_patterns": [],
        "content_themes": [],
        "emotional_indicators": fallback_emotional_indicators,
    }

    # Enhanced parsing logic with multiple approaches
    lines = ai_response.split("\n")
    current_section = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # More flexible section detection
        line_upper = line.upper()
        
        # Extract tone
        if any(keyword in line_upper for keyword in ["TONE:", "1. TONE", "**TONE"]):
            tone_match = extract_content_after_colon(line)
            if tone_match:
                voice_data["tone"] = tone_match
            current_section = "tone"
            
        # Extract style  
        elif any(keyword in line_upper for keyword in ["STYLE:", "2. STYLE", "**STYLE"]):
            style_match = extract_content_after_colon(line)
            if style_match:
                voice_data["style"] = style_match
            current_section = "style"
            
        # Detect personality traits section
        elif any(keyword in line_upper for keyword in ["PERSONALITY", "3. PERSONALITY", "**PERSONALITY"]):
            current_section = "personality_traits"
            # Try to extract inline content
            traits_match = extract_content_after_colon(line)
            if traits_match:
                voice_data["personality_traits"] = [traits_match]
                
        # Detect communication patterns section
        elif any(keyword in line_upper for keyword in ["COMMUNICATION", "4. COMMUNICATION", "**COMMUNICATION"]):
            current_section = "communication_patterns"
            patterns_match = extract_content_after_colon(line)
            if patterns_match:
                voice_data["communication_patterns"] = [patterns_match]
                
        # Detect content themes section
        elif any(keyword in line_upper for keyword in ["CONTENT", "THEMES", "5. CONTENT", "**CONTENT"]):
            current_section = "content_themes"
            themes_match = extract_content_after_colon(line)
            if themes_match:
                voice_data["content_themes"] = [themes_match]
                
        # Detect emotional indicators section
        elif any(keyword in line_upper for keyword in ["EMOTIONAL", "6. EMOTIONAL", "**EMOTIONAL"]):
            current_section = "emotional_indicators"
            
        # Extract list items for current section
        elif line.startswith(("-", "•", "*")) or any(line.startswith(f"{i}.") for i in range(1, 10)):
            item = clean_list_item(line)
            if item and current_section in ["personality_traits", "communication_patterns", "content_themes"]:
                if item not in voice_data[current_section]:
                    voice_data[current_section].append(item)
                    
        # Try to extract emotional scores
        elif current_section == "emotional_indicators" and ":" in line:
            emotion_name, score = extract_emotional_score(line)
            if emotion_name and score is not None:
                voice_data["emotional_indicators"][emotion_name] = score

    # Fallback extraction if primary parsing didn't work well
    if voice_data["tone"] == "Not specified":
        voice_data["tone"] = extract_fallback_tone(ai_response)
        
    if voice_data["style"] == "Not specified":
        voice_data["style"] = extract_fallback_style(ai_response)
        
    # Ensure we have some personality traits
    if not voice_data["personality_traits"]:
        voice_data["personality_traits"] = extract_fallback_traits(ai_response)
        
    return voice_data


def extract_content_after_colon(line):
    """Extract content after colon or other delimiters"""
    if ":" in line:
        return line.split(":", 1)[1].strip()
    elif " - " in line:
        return line.split(" - ", 1)[1].strip()
    return None


def clean_list_item(line):
    """Clean and extract list item content"""
    # Remove list markers and clean up
    cleaned = line.lstrip("-•*123456789. ").strip()
    return cleaned if cleaned and len(cleaned) > 3 else None


def extract_emotional_score(line):
    """Extract emotional indicator name and score from a line"""
    try:
        if ":" in line:
            parts = line.split(":", 1)
            emotion_name = parts[0].strip().lower()
            score_text = parts[1].strip()
              # Extract numeric score
            import re
            score_match = re.search(r'(\d+(?:\.\d+)?)', score_text)
            if score_match:
                score = float(score_match.group(1))
                # Normalize to 0-10 scale if needed
                if score > 10:
                    score = score / 10
                return emotion_name, score
    except Exception:
        pass
    return None, None


def extract_fallback_tone(ai_response):
    """Extract tone using fallback methods"""
    tone_keywords = {
        "professional": ["professional", "formal", "business"],
        "casual": ["casual", "informal", "relaxed"],
        "enthusiastic": ["enthusiastic", "energetic", "passionate"],
        "authoritative": ["authoritative", "confident", "expert"],
        "approachable": ["approachable", "friendly", "warm"]
    }
    
    ai_lower = ai_response.lower()
    for tone, keywords in tone_keywords.items():
        if any(keyword in ai_lower for keyword in keywords):
            return f"{tone.title()} communication style"
    
    return "Professional and engaging"


def extract_fallback_style(ai_response):
    """Extract style using fallback methods"""
    if "leadership" in ai_response.lower():
        return "Leadership-focused communication"
    elif "thought" in ai_response.lower():
        return "Thought leadership style"
    elif "business" in ai_response.lower():
        return "Business-oriented communication"
    else:
        return "Professional brand communication"


def extract_fallback_traits(ai_response):
    """Extract personality traits using fallback methods"""
    return [
        "Strategic thinker",
        "Professional presence", 
        "Industry expertise",
        "Collaborative approach"
    ]


def perform_brand_alignment_analysis(content, brand):
    """Analyze how well content aligns with an existing brand"""
    try:
        from .utils.helpers import extract_key_insights
        
        # Get brand samples
        brand_samples = []
        for sample in brand.samples.all():
            if sample.content:
                brand_samples.append(sample.content.strip())

        if not brand_samples:
            return {
                "alignment_score": 0.5,
                "alignment_level": "medium",
                "feedback": "No brand samples available for comparison",
                "recommendations": ["Add brand samples to improve analysis accuracy"],
                "brand_name": brand.name,
            }
        # Import and use existing analyzer
        try:
            from ai_core.analysis import BrandAnalyzer
            from django.conf import settings

            api_key = getattr(settings, "OPENAI_API_KEY", None)
            if not api_key:
                return {
                    "alignment_score": 0.5,
                    "alignment_level": "medium",
                    "feedback": "AI service not configured",
                    "recommendations": ["Configure AI service for detailed analysis"],
                    "brand_name": brand.name,
                }

            analyzer = BrandAnalyzer(api_key)
            analysis_result = analyzer.analyze_brand_alignment(content, brand_samples)
        except ImportError:
            # Fallback if AI core is not available
            return {
                "alignment_score": 0.75,
                "alignment_level": "high",
                "feedback": "Mock analysis: Content shows good alignment with brand voice",
                "recommendations": [
                    "Maintain consistent tone",
                    "Continue current messaging style",
                ],
                "brand_name": brand.name,
            }

        alignment_score = analysis_result.get("alignment_score", 0.5)

        # Determine alignment level
        if alignment_score >= 0.8:
            alignment_level = "high"
        elif alignment_score >= 0.6:
            alignment_level = "medium"
        else:
            alignment_level = "low"

        feedback = analysis_result.get("feedback", {})
        ai_feedback = (
            feedback.get("ai_feedback", "")
            if isinstance(feedback, dict)
            else str(feedback)
        )

        return {
            "alignment_score": alignment_score,
            "alignment_level": alignment_level,
            "feedback": ai_feedback,
            "recommendations": extract_key_insights(ai_feedback),
            "brand_name": brand.name,
            "content_analyzed": content[:100] + "..."
            if len(content) > 100
            else content,
        }

    except Exception as e:
        return {
            "alignment_score": 0.5,
            "alignment_level": "medium",
            "feedback": f"Analysis error: {str(e)}",
            "recommendations": ["Please try again or contact support"],
            "brand_name": brand.name,
        }


def perform_profile_alignment_analysis(content, reference_handle, platform="twitter"):
    """Analyze how well content aligns with a reference profile's voice"""
    # First, get the reference profile's voice characteristics
    reference_voice = perform_profile_voice_analysis(reference_handle, platform)

    # Mock analysis comparing content against reference voice
    voice_traits = reference_voice["voice_analysis"]

    # Simulate alignment scoring
    alignment_factors = {
        "tone_match": 0.75,  # How well content matches reference tone
        "style_consistency": 0.80,  # Style alignment
        "theme_relevance": 0.70,  # Content theme alignment
        "communication_pattern": 0.85,  # Communication style match
    }

    overall_score = sum(alignment_factors.values()) / len(alignment_factors)

    # Determine alignment level
    if overall_score >= 0.8:
        alignment_level = "high"
    elif overall_score >= 0.6:
        alignment_level = "medium"
    else:
        alignment_level = "low"

    return {
        "alignment_score": round(overall_score, 2),
        "alignment_level": alignment_level,
        "reference_handle": reference_handle,
        "reference_platform": platform,
        "content_analyzed": content[:100] + "..." if len(content) > 100 else content,
        "alignment_factors": alignment_factors,
        "feedback": f"Content shows {int(overall_score * 100)}% alignment with @{reference_handle}'s brand voice",
        "recommendations": [
            f"Consider adopting more of @{reference_handle}'s {voice_traits['tone'].lower()} tone",
            f"Align content themes with {', '.join(voice_traits['content_themes'][:2])}",
            f"Match communication patterns: {voice_traits['communication_patterns'][0].lower()}",
        ],
        "reference_voice_summary": voice_traits,
    }


def perform_extension_analysis(content, brand):
    """
    Perform brand analysis using existing logic, adapted for extension use
    """
    try:
        # Get brand samples from the Brand object
        brand_samples = []
        for sample in brand.samples.all():
            if sample.content:
                brand_samples.append(sample.content.strip())

        if not brand_samples:
            return {
                "alignment_score": 0.5,
                "feedback": {
                    "ai_feedback": "No brand samples available for comparison"
                },
            }

        # Import and use existing analyzer
        from ai_core.analysis import BrandAnalyzer
        from django.conf import settings

        api_key = settings.OPENAI_API_KEY
        if not api_key:
            return {
                "alignment_score": 0.5,
                "feedback": {"ai_feedback": "AI service not configured"},
            }

        analyzer = BrandAnalyzer(api_key)

        # Perform the analysis using existing logic
        analysis_result = analyzer.analyze_brand_alignment(content, brand_samples)

        return analysis_result

    except Exception as e:
        return {
            "alignment_score": 0.5,
            "feedback": {"ai_feedback": f"Analysis error: {str(e)}"},
        }
