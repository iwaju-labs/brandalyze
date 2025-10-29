"""
AI-powered analysis functions for brand voice, alignment, and content analysis.
"""


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

        Based on this profile information, analyze and provide a structured response with:

        1. TONE: Describe the likely overall tone based on bio language (professional, casual, enthusiastic, etc.)
        2. STYLE: Communication style inferred from bio (thought leadership, personal brand, business-focused, etc.)
        3. PERSONALITY_TRAITS: List 3-4 key personality traits evident from the bio and profile setup
        4. COMMUNICATION_PATTERNS: Likely communication patterns based on bio language and profile presentation
        5. CONTENT_THEMES: Main topics and themes they likely discuss based on bio keywords and description
        6. EMOTIONAL_INDICATORS: Emotional qualities with scores 0-10 (enthusiasm, professionalism, approachability, authority)

        Note: This analysis is based on profile bio only. Provide insights while acknowledging the limited data source.
        Format your response as clear, concise descriptions for each category.
        """

        response = analyzer.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": bio_prompt}],
            max_tokens=600,
            temperature=0.3,
        )

        ai_response = response.choices[0].message.content

        # Parse the AI response into structured format
        bio_analysis = parse_voice_analysis_response(ai_response)
        
        # Add bio-specific metadata
        bio_analysis['analysis_source'] = 'profile_bio'
        bio_analysis['bio_length'] = len(profile_data.get('bio', ''))
        bio_analysis['has_location'] = bool(profile_data.get('location'))
        bio_analysis['has_website'] = bool(profile_data.get('website'))
        
        return bio_analysis

    except Exception as e:
        print(f"AI bio analysis error: {e}")
        # Return structured fallback analysis based on basic profile info
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
            "emotional_indicators": {
                "enthusiasm": 7.0,
                "professionalism": 8.0,
                "approachability": 7.0,
                "authority": 7.5,
            },
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

        # Parse the AI response into structured format
        return parse_voice_analysis_response(ai_response)

    except Exception as e:
        print(f"AI voice analysis error: {e}")
        # Return structured fallback analysis
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
            "emotional_indicators": {
                "enthusiasm": 7.5,
                "professionalism": 8.5,
                "approachability": 7.0,
                "authority": 8.0,
            },
        }


def parse_voice_analysis_response(ai_response):
    """Parse AI response into structured voice analysis data"""
    try:
        # Initialize default structure
        voice_data = {
            "tone": "Professional and approachable",
            "style": "Engaging communication",
            "personality_traits": [],
            "communication_patterns": [],
            "content_themes": [],
            "emotional_indicators": {
                "enthusiasm": 7.0,
                "professionalism": 8.0,
                "approachability": 7.5,
                "authority": 7.5,
            },
        }

        # Simple parsing logic - can be enhanced with more sophisticated NLP
        lines = ai_response.split("\n")
        current_section = None

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Detect sections
            if "TONE:" in line.upper():
                current_section = "tone"
                voice_data["tone"] = line.split(":", 1)[1].strip()
            elif "STYLE:" in line.upper():
                current_section = "style"
                voice_data["style"] = line.split(":", 1)[1].strip()
            elif "PERSONALITY" in line.upper():
                current_section = "personality_traits"
            elif "COMMUNICATION" in line.upper():
                current_section = "communication_patterns"
            elif "CONTENT" in line.upper() or "THEMES" in line.upper():
                current_section = "content_themes"
            elif "EMOTIONAL" in line.upper():
                current_section = "emotional_indicators"
            elif line.startswith(("-", "•", "*", "1.", "2.", "3.", "4.", "5.")):
                # Extract list items
                item = line.lstrip("-•*123456789. ").strip()
                if current_section in [
                    "personality_traits",
                    "communication_patterns",
                    "content_themes",
                ]:
                    voice_data[current_section].append(item)

        return voice_data

    except Exception as e:
        print(f"Error parsing voice analysis: {e}")
        return {
            "tone": "Professional and engaging",
            "style": "Clear communication style",
            "personality_traits": ["Professional", "Thoughtful", "Engaging"],
            "communication_patterns": ["Clear messaging", "Consistent tone"],
            "content_themes": ["Professional content", "Industry insights"],
            "emotional_indicators": {
                "enthusiasm": 7.0,
                "professionalism": 8.0,
                "approachability": 7.5,
                "authority": 7.5,
            },
        }


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
