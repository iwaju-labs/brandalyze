console.log('Brandalyze Twitter content script loaded');

// Wait for shared utilities to be available
function waitForBrandalyzeUtils() {
  return new Promise((resolve) => {
    if (globalThis.BrandalyzeUtils) {
      resolve();
      return;
    }
    
    const checkInterval = setInterval(() => {
      if (globalThis.BrandalyzeUtils) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      console.error('BrandalyzeUtils not available after 5 seconds');
      resolve();
    }, 5000);
  });
}

// Wait for Chrome extension API to be available
function waitForChromeAPI() {
  return new Promise((resolve, reject) => {
    const maxRetries = 10;
    let attempts = 0;
    
    function checkAPI() {
      attempts++;
      
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        resolve();
        return;
      }
      
      if (attempts >= maxRetries) {
        reject(new Error('Chrome extension API not available after retries'));
        return;
      }
      
      setTimeout(checkAPI, 100);
    }
    
    checkAPI();
  });
}

let sessionId;
let processedTweets = new Set();

// Enhanced tweet processing with better selectors
async function processTweets() {
  console.log('Processing tweets...');
  
  // First check if we're on a profile page
  const currentProfile = getCurrentProfileHandle();
  
  if (!currentProfile) {
    console.log('Not on a profile page or unable to detect profile handle');
    return;
  }
  
  // Additional validation: ensure we're actually on a profile page, not just any page with the handle in URL
  const isProfilePage = globalThis.location.pathname === `/${currentProfile}` || 
                       globalThis.location.pathname.startsWith(`/${currentProfile}/`) ||
                       document.querySelector('[data-testid="UserName"]');
  
  if (!isProfilePage) {
    console.log(`Not on a profile page for @${currentProfile}`);
    return;
  }
  
  console.log(`✅ On profile page: @${currentProfile}`);
  
  // Look for profile analysis section or add one
  // Wait a bit for the page to fully load
  setTimeout(() => {
    const editProfileButton = document.querySelector('[data-testid="editProfileButton"]');
    const existingAnalyzeButton = document.querySelector('.brandalyze-analyze-profile-btn');
    
    if (editProfileButton && !existingAnalyzeButton) {
      console.log('Found edit profile button, adding analyze button...');
      addProfileAnalysisButton(null, currentProfile);
    } else if (!editProfileButton && !existingAnalyzeButton) {
      console.log('Edit profile button not found - may not be your own profile or page not fully loaded');
      // Try alternative detection methods for other people's profiles
      const profileHeader = document.querySelector('[data-testid="UserName"]')?.closest('[data-testid="UserCell"]') || 
                           document.querySelector('[data-testid="UserDescription"]')?.parentElement;
      
      if (profileHeader) {
        // This might be someone else's profile, still add the analyze button
        console.log('Adding analyze button to profile header');
        addProfileAnalysisButton(profileHeader, currentProfile);
      }
    } else if (existingAnalyzeButton) {
      console.log('Analyze button already exists');
    }
  }, 2000);
  
  // For individual tweets, only process if we want individual tweet analysis too
  if (shouldProcessIndividualTweets()) {
    await processIndividualTweets();
  }
}

// Get the current profile handle from the URL or page
function getCurrentProfileHandle() {
  // Extract from URL: twitter.com/username or x.com/username
  const pathSegments = globalThis.location.pathname.split('/').filter(segment => segment);
  
  // Exclude system pages and paths that are not user profiles
  const systemPaths = [
    'home', 'explore', 'notifications', 'messages', 'search', 
    'settings', 'i', 'login', 'signup', 'tos', 'privacy',
    'compose', 'bookmarks', 'lists', 'communities', 'verify'
  ];
  
  if (pathSegments.length > 0 && !systemPaths.includes(pathSegments[0])) {
    const handle = pathSegments[0];
    
    // Additional validation: handle should not contain dots, be too short, or be system-like
    if (handle.length >= 1 && handle.length <= 15 && 
        !handle.includes('.') && 
        !handle.startsWith('_') &&
        !/^(api|www|app|mail|support|help|admin|root)$/i.test(handle)) {
      console.log(`Detected profile handle from URL: @${handle}`);
      return handle;
    }
  }
  
  // Try to extract from page elements as fallback
  const profileLink = document.querySelector('[data-testid="UserName"] a[href*="/"]');
  if (profileLink) {
    const href = profileLink.getAttribute('href');
    const match = href.match(/\/([^\/]+)$/);
    if (match && !systemPaths.includes(match[1])) {
      console.log(`Detected profile handle from DOM: @${match[1]}`);
      return match[1];
    }
  }
  
  console.log('No valid profile handle detected');
  return null;
}

// Get saved Twitter handle from extension storage
async function getSavedTwitterHandle() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['twitterHandle'], (result) => {
      resolve(result.twitterHandle || '');
    });
  });
}

// Extract profile bio and information from current Twitter profile page
function extractProfileBioFromPage(handle) {
  console.log(`🔍 Extracting profile bio for @${handle}`);
  
  const profileInfo = {
    handle: handle,
    display_name: '',
    bio: '',
    location: '',
    website: '',
    verified: false,
    followers_count: 0,
    following_count: 0,
    tweets_count: 0
  };

  try {
    // Extract display name
    const displayNameElement = document.querySelector('[data-testid="UserName"] div[dir="ltr"] span');
    if (displayNameElement) {
      profileInfo.display_name = displayNameElement.textContent.trim();
    }

    // Extract bio/description
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    if (bioElement) {
      profileInfo.bio = bioElement.textContent.trim();
    }

    // Extract location
    const locationElement = document.querySelector('[data-testid="UserLocation"]');
    if (locationElement) {
      profileInfo.location = locationElement.textContent.trim();
    }

    // Extract website
    const websiteElement = document.querySelector('[data-testid="UserUrl"] a');
    if (websiteElement) {
      profileInfo.website = websiteElement.href || websiteElement.textContent.trim();
    }

    // Check if verified
    const verifiedElement = document.querySelector('[data-testid="UserName"] svg');
    if (verifiedElement) {
      profileInfo.verified = true;
    }

    // Extract follower/following counts from profile stats
    const statsElements = document.querySelectorAll('a[href*="/following"], a[href*="/verified_followers"]');
    statsElements.forEach(element => {
      const text = element.textContent.toLowerCase();
      const numberMatch = text.match(/([\d,]+)/);
      if (numberMatch) {
        const number = parseInt(numberMatch[1].replace(/,/g, ''));
        if (text.includes('following')) {
          profileInfo.following_count = number;
        } else if (text.includes('followers')) {
          profileInfo.followers_count = number;
        }
      }
    });

    // Try to extract tweet count from user stats
    const tweetCountElement = document.querySelector('[data-testid="UserName"]')?.closest('div')?.querySelector('div:last-child');
    if (tweetCountElement) {
      const tweetText = tweetCountElement.textContent;
      const tweetMatch = tweetText.match(/([\d,]+)\s*Tweets?/i);
      if (tweetMatch) {
        profileInfo.tweets_count = parseInt(tweetMatch[1].replace(/,/g, ''));
      }
    }

    console.log('✅ Extracted profile info:', profileInfo);
    return profileInfo;

  } catch (error) {
    console.error('⚠️ Error extracting profile bio:', error);
    return profileInfo; // Return what we have
  }
}

// Add profile analysis button to the profile header - styled like Twitter's native buttons
function addProfileAnalysisButton(profileHeader, handle) {
  // Look for the Edit Profile button specifically using the data-testid
  const editProfileButton = document.querySelector('[data-testid="editProfileButton"]');
  
  if (!editProfileButton) {
    console.log('Edit profile button not found, trying alternative selectors...');
    // Try alternative approaches for finding button container
    const buttonContainer = profileHeader.querySelector('[data-testid="UserActions"]') || 
                           document.querySelector('[data-testid="UserActions"]') ||
                           profileHeader.querySelector('[role="button"]')?.closest('div');
    
    if (!buttonContainer) {
      console.log('Could not find any button container for profile analysis button');
      return;
    }
    
    insertAnalyzeButton(buttonContainer, handle);
    return;
  }
  
  // Get the parent container of the edit profile button
  const buttonContainer = editProfileButton.parentElement;
  
  if (!buttonContainer) {
    console.log('Could not find edit profile button container');
    return;
  }
  
  // Check if our button already exists
  if (buttonContainer.querySelector('.brandalyze-analyze-profile-btn')) {
    console.log('Analyze profile button already exists');
    return;
  }
  
  insertAnalyzeButton(buttonContainer, handle);
}

function insertAnalyzeButton(container, handle) {
  // Create the analyze button with Twitter-like styling
  const analyzeButton = document.createElement('a');
  analyzeButton.className = 'brandalyze-analyze-profile-btn css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-6gpygo r-2yi16 r-1qi8awa r-3pj75a r-o7ynqc r-6416eg r-1ny4l3l r-1loqt21';
  analyzeButton.setAttribute('role', 'link');
  analyzeButton.setAttribute('tabindex', '0');
  
  // Copy the exact styles from edit profile button but change colors
  analyzeButton.style.cssText = `
    border-color: rgb(29, 155, 240);
    background-color: rgb(29, 155, 240);
    margin-right: 12px;
    cursor: pointer;
  `;
  
  // Create inner structure matching Twitter's button
  analyzeButton.innerHTML = `
    <div dir="ltr" class="css-146c3p1 r-bcqeeo r-qvutc0 r-1qd0xha r-q4m81j r-a023e6 r-rjixqe r-b88u0q r-1awozwy r-6koalj r-18u37iz r-16y2uox r-1777fci" style="color: rgb(255, 255, 255);">
      <span class="css-1jxf684 r-dnmrzs r-1udh08x r-1udbk01 r-3s2u2q r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3 r-a023e6 r-rjixqe">
        <span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3 btn-text">Analyze Profile</span>
        <span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3 btn-loading" style="display: none;">Analyzing...</span>
      </span>
    </div>
  `;
  
  // Add hover effect
  analyzeButton.addEventListener('mouseenter', () => {
    analyzeButton.style.backgroundColor = 'rgb(26, 140, 216)';
    analyzeButton.style.borderColor = 'rgb(26, 140, 216)';
  });
  
  analyzeButton.addEventListener('mouseleave', () => {
    analyzeButton.style.backgroundColor = 'rgb(29, 155, 240)';
    analyzeButton.style.borderColor = 'rgb(29, 155, 240)';
  });
  
  // Add click handler
  analyzeButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleProfileAnalysis(handle, analyzeButton);
  });
  
  // Insert the button before the edit profile button (or as first child)
  container.insertBefore(analyzeButton, container.firstChild);
  console.log(`✅ Added native-style profile analysis button for @${handle}`);
}

// Check if we should process individual tweets (could be a setting)
function shouldProcessIndividualTweets() {
  return false; // Disable individual tweet processing for now
}

// Process individual tweets (existing functionality)
async function processIndividualTweets() {
  // Try multiple selectors for tweets
  const tweetSelectors = [
    '[data-testid="tweet"]',
    'article[data-testid="tweet"]',
    '[data-testid="tweetText"]',
    'div[aria-label*="Tweet"]'
  ];
  
  let tweets = [];
  for (const selector of tweetSelectors) {
    tweets = document.querySelectorAll(selector);
    if (tweets.length > 0) {
      console.log(`Found ${tweets.length} tweets using selector: ${selector}`);
      break;
    }
  }
  
  if (tweets.length === 0) {
    console.log('No tweets found on page');
    return;
  }
  
  let processed = 0;
  for (const tweet of tweets) {
    try {
      processed += processSingleTweet(tweet);
    } catch (error) {
      console.error('Error processing tweet:', error);
    }
  }
  
  console.log(`Processed ${processed} new tweets`);
}

function processSingleTweet(tweet) {
  // Use a unique identifier for each tweet
  const tweetId = tweet.querySelector('[href*="/status/"]')?.href || 
                 tweet.querySelector('[data-testid="User-Name"]')?.textContent + '_' + Date.now() ||
                 'tweet_' + Date.now() + '_' + Math.random();
  
  if (processedTweets.has(tweetId)) return 0;
  processedTweets.add(tweetId);
  
  // Skip retweets and replies (optional - you might want to analyze these too)
  const isRetweet = tweet.querySelector('[data-testid="socialContext"]')?.textContent?.includes('retweeted') ||
                   tweet.textContent.includes('Retweeted by');
  
  if (isRetweet) {
    console.log('Skipping retweet');
    return 0;
  }
  
  // Find the action bar - try multiple selectors
  const actionBarSelectors = [
    '[role="group"]',
    '[data-testid="reply"]',
    '.css-175oi2r.r-18u37iz.r-1h0z5md',
    'div[aria-label*="actions"]'
  ];
  
  let actionBar = null;
  for (const selector of actionBarSelectors) {
    actionBar = tweet.querySelector(selector);
    if (actionBar) break;
  }
  
  if (!actionBar) {
    console.log('No action bar found for tweet');
    return 0;
  }
  
  // Check if button already exists
  if (actionBar.querySelector('.brandalyze-btn')) {
    return 0;
  }
    // Create and add the analyze button
  const button = globalThis.BrandalyzeUtils.createAnalyzeButton(async function() {
    await handleAnalyzeClick(tweet, button);
  });
  
  // Insert button in the action bar
  actionBar.appendChild(button);
  console.log('Added analyze button to tweet');
  
  return 1;
}

// Handle profile analysis (analyze last 10 posts) with auth retry
async function handleProfileAnalysis(handle, button) {
  setAnalyzeButtonLoading(button, true);
  
  let retryCount = 0;
  const maxRetries = 1;
  
  while (retryCount <= maxRetries) {
    try {
      // Wait for chrome extension API to be available with retry mechanism
      await waitForChromeAPI();
        // Extract bio information from the current page (more efficient)
      const extractedBio = extractProfileBioFromPage(handle);
      console.log(`🔍 Extracted profile bio for @${handle}:`, extractedBio);
      
      // Extract posts as fallback (for posts analysis if needed)
      const extractedPosts = extractPostsFromPage(handle, 10);
      console.log(`🔍 Extracted ${extractedPosts.length} posts from current page`);
      
      // Send profile analysis request to background script with bio analysis preferred
      const response = await new Promise((resolve, reject) => {
        try {
          chrome.runtime.sendMessage({
            action: 'analyzeProfile',
            data: {
              handle: handle,
              platform: 'twitter',
              sessionId: sessionId,
              extractedPosts: extractedPosts, // Include posts as fallback
              extractedBio: extractedBio, // Include bio information
              use_bio: true // Default to bio analysis for better rate limits
            }
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        } catch (error) {
          reject(error);
        }
      });

      if (response && response.success) {
        showProfileAnalysisResult(response.data, button);
        return; // Success, exit retry loop
      } else {
        const errorMsg = response ? response.error : 'Unknown error';
        
        // Check if it's an authentication error
        if (errorMsg.includes('401') || errorMsg.includes('sign in') || errorMsg.includes('authentication')) {
          if (retryCount < maxRetries) {
            console.log('🔄 Authentication error, getting fresh auth and retrying...');
            
            // Request fresh authentication
            await new Promise((resolve, reject) => {
              chrome.runtime.sendMessage({
                action: 'getFreshAuth'
              }, (authResponse) => {
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve(authResponse);
                }
              });
            });
            
            retryCount++;
            continue; // Retry the analysis
          }
        }
        
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      if (retryCount < maxRetries && (error.message.includes('401') || error.message.includes('sign in'))) {
        console.log('🔄 Got auth error, retrying with fresh auth...');
        retryCount++;
        continue;
      }
      
      console.error('Profile analysis error:', error);
      alert('Profile analysis failed: ' + error.message);
      break;
    }
  }
  
  setAnalyzeButtonLoading(button, false);
}

// Helper function to set loading state for the new button structure
function setAnalyzeButtonLoading(button, loading) {
  const textSpan = button.querySelector('.btn-text');
  const loadingSpan = button.querySelector('.btn-loading');
  
  if (textSpan && loadingSpan) {
    if (loading) {
      textSpan.style.display = 'none';
      loadingSpan.style.display = 'inline';
      button.style.opacity = '0.7';
      button.style.cursor = 'default';
    } else {
      textSpan.style.display = 'inline';
      loadingSpan.style.display = 'none';
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  }
}

// Show profile analysis results
function showProfileAnalysisResult(result, targetElement) {
  const popup = document.createElement('div');
  popup.className = 'brandalyze-profile-result-popup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 1px solid #e1e8ed;
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
    z-index: 10000;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    line-height: 1.4;
  `;
  
  // Check if this is an error result
  if (result.error || (result.message && result.message.includes('failed'))) {
    const errorCode = extractErrorCode(result.error || result.message);
    const errorMessage = getErrorMessage(errorCode);
    
    popup.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #dc2626;">Analysis Failed</h3>
        <button class="close-btn" style="
          background: none; 
          border: none; 
          font-size: 20px; 
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #657786;
        " title="Close">×</button>
      </div>
      
      <div style="padding: 16px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-bottom: 20px;">
        <div style="font-weight: 600; color: #dc2626; margin-bottom: 8px;">Unable to analyze @${result.handle || 'profile'}</div>
        <div style="color: #7f1d1d; margin-bottom: 12px;">${errorMessage}</div>
        <div style="color: #991b1b; font-size: 12px;">Error Code: ${errorCode}</div>
      </div>
      
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e1e8ed; text-align: center;">
        <button class="close-btn" style="
          background: #dc2626; 
          color: white;
          border: none; 
          padding: 8px 20px; 
          border-radius: 20px; 
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Close</button>
      </div>
    `;
  } else {
    // Check if this is voice analysis or legacy alignment analysis
    const isVoiceAnalysis = result.voice_analysis && result.confidence_score;
    
    let headerTitle = '';
    let scoreDisplay = '';
    let contentSections = '';
    
    if (isVoiceAnalysis) {
      // Voice Analysis Display
      const voice = result.voice_analysis;
      const confidenceScore = result.confidence_score || 0;
      const scoreColor = confidenceScore >= 0.8 ? '#10b981' : 
                        confidenceScore >= 0.6 ? '#f59e0b' : '#ef4444';
      
      headerTitle = `@${result.handle || 'Profile'} Voice Analysis`;
      
      scoreDisplay = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f7f9fa; border-radius: 12px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: ${scoreColor};"></div>
          <div>
            <div style="font-weight: 600; font-size: 16px;">Analysis Confidence: ${Math.round(confidenceScore * 100)}%</div>
            <div style="color: #657786; font-size: 12px;">Based on ${result.posts_analyzed || 0} recent posts</div>
          </div>
        </div>
      `;
      
      contentSections = `
        <div style="margin-bottom: 20px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div style="padding: 12px; background: #e3f2fd; border-radius: 8px;">
              <div style="font-weight: 600; color: #1565c0; margin-bottom: 4px;">Tone</div>
              <div style="color: #14171a;">${voice.tone || 'Not specified'}</div>
            </div>
            <div style="padding: 12px; background: #f3e5f5; border-radius: 8px;">
              <div style="font-weight: 600; color: #7b1fa2; margin-bottom: 4px;">Style</div>
              <div style="color: #14171a;">${voice.style || 'Not specified'}</div>
            </div>
          </div>
        </div>
        
        ${voice.content_themes && voice.content_themes.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1565c0;">Content Themes:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #14171a;">
              ${voice.content_themes.slice(0, 3).map(theme => `<li style="margin-bottom: 6px;">${theme}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${voice.communication_patterns && voice.communication_patterns.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #7b1fa2;">Communication Patterns:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #14171a;">
              ${voice.communication_patterns.slice(0, 3).map(pattern => `<li style="margin-bottom: 6px;">${pattern}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${result.brand_recommendations && result.brand_recommendations.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #f57c00;">Brand Recommendations:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #14171a;">
              ${result.brand_recommendations.slice(0, 2).map(rec => `<li style="margin-bottom: 6px;">${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      `;
    } else {
      // Legacy Brand Alignment Display
      const averageScore = result.average_score || 0;
      const scoreColor = averageScore >= 0.7 ? '#10b981' : 
                        averageScore >= 0.4 ? '#f59e0b' : '#ef4444';
      
      headerTitle = `@${result.handle || 'Profile'} Brand Analysis`;
      
      scoreDisplay = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f7f9fa; border-radius: 12px;">
          <div style="width: 12px; height: 12px; border-radius: 50%; background: ${scoreColor};"></div>
          <div>
            <div style="font-weight: 600; font-size: 16px;">Average Brand Alignment: ${Math.round(averageScore * 100)}%</div>
            <div style="color: #657786; font-size: 12px;">Based on ${result.posts_analyzed || 0} recent posts</div>
          </div>
        </div>
      `;
      
      contentSections = `
        ${result.insights ? `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Key Insights:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #14171a;">
              ${result.insights.map(insight => `<li style="margin-bottom: 8px;">${insight}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        ${result.recommendations ? `
          <div style="margin-bottom: 20px;">
            <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">Recommendations:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #14171a;">
              ${result.recommendations.map(rec => `<li style="margin-bottom: 8px;">${rec}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
      `;
    }

    popup.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: 600;">${headerTitle}</h3>
        <button class="close-btn" style="
          background: none; 
          border: none; 
          font-size: 20px; 
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #657786;
        " title="Close">×</button>
      </div>
      
      ${scoreDisplay}
      ${contentSections}
      
      <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e1e8ed; text-align: center;">
        <button class="close-btn" style="
          background: #1d9bf0; 
          color: white;
          border: none; 
          padding: 8px 20px; 
          border-radius: 20px; 
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Close</button>
      </div>
    `;
  }
  
  // Add close button functionality
  const closeButtons = popup.querySelectorAll('.close-btn');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (overlay && overlay.parentElement) {
        overlay.remove();
      }
      if (popup && popup.parentElement) {
        popup.remove();
      }
    });
  });
  // Add overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.4);
    z-index: 9999;
  `;
  overlay.addEventListener('click', () => {
    if (overlay && overlay.parentElement) {
      overlay.remove();
    }
    if (popup && popup.parentElement) {
      popup.remove();
    }
  });

  document.body.appendChild(overlay);
  document.body.appendChild(popup);
  
  // Store result for options page
  storeAnalysisResult(result);

  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (popup.parentElement) {
      overlay.remove();
      popup.remove();
    }
  }, 30000);
}

// Store analysis result for viewing in options page
async function storeAnalysisResult(result) {
  try {
    const analysisRecord = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: result.voice_analysis ? 'voice_analysis' : 'brand_alignment',
      handle: result.handle || 'Unknown',
      platform: 'twitter',
      result: result
    };
    
    const stored = await chrome.storage.local.get(['recentAnalyses']);
    let recentAnalyses = stored.recentAnalyses || [];
    
    // Add new result at the beginning
    recentAnalyses.unshift(analysisRecord);
    
    // Keep only the last 50 results
    if (recentAnalyses.length > 50) {
      recentAnalyses = recentAnalyses.slice(0, 50);
    }
    
    await chrome.storage.local.set({ recentAnalyses });
    console.log('Stored analysis result for options page');
  } catch (error) {
    console.error('Failed to store analysis result:', error);
  }
}

// Extract posts from the current Twitter page
function extractPostsFromPage(handle, maxPosts = 10) {
  const posts = [];
  
  try {
    // Find all tweet articles on the page
    const tweetSelectors = [
      '[data-testid="tweet"]',
      'article[data-testid="tweet"]'
    ];
    
    let tweetElements = [];
    for (const selector of tweetSelectors) {
      tweetElements = document.querySelectorAll(selector);
      if (tweetElements.length > 0) {
        console.log(`Found ${tweetElements.length} tweets using selector: ${selector}`);
        break;
      }
    }
    
    if (tweetElements.length === 0) {
      console.log('No tweets found on current page');
      return posts;
    }
    
    for (let i = 0; i < Math.min(tweetElements.length, maxPosts); i++) {
      const tweet = tweetElements[i];
      
      try {
        // Extract tweet text
        const tweetTextElement = tweet.querySelector('[data-testid="tweetText"]') ||
                                tweet.querySelector('[lang]') ||
                                tweet.querySelector('div[dir="auto"]');
        
        if (!tweetTextElement) continue;
        
        const tweetText = tweetTextElement.textContent?.trim();
        
        // Skip if it's a retweet, reply, or very short
        if (!tweetText || 
            tweetText.length < 10 || 
            tweetText.startsWith('RT @') ||
            tweet.querySelector('[data-testid="socialContext"]')?.textContent?.includes('Retweeted')) {
          continue;
        }
        
        // Extract user handle to make sure it's from the target user
        const userElement = tweet.querySelector('[data-testid="User-Name"] a') ||
                           tweet.querySelector('[href*="/' + handle + '"]');
        
        if (!userElement) continue; // Skip if we can't verify it's from the target user
        
        // Extract engagement metrics
        const metrics = {
          likes: extractMetricValue(tweet, '[data-testid="like"]'),
          retweets: extractMetricValue(tweet, '[data-testid="retweet"]'),
          replies: extractMetricValue(tweet, '[data-testid="reply"]')
        };
        
        // Extract timestamp
        const timeElement = tweet.querySelector('time');
        const date = timeElement ? timeElement.getAttribute('datetime') || timeElement.textContent : new Date().toISOString();
        
        const post = {
          text: tweetText,
          engagement: metrics.likes + metrics.retweets + metrics.replies,
          date: date.split('T')[0], // Extract date part
          metrics: metrics,
          source: 'extension_dom'
        };
        
        posts.push(post);
        console.log(`✅ Extracted post: "${tweetText.substring(0, 50)}..."`);
        
      } catch (error) {
        console.warn('Error extracting individual tweet:', error);
        continue;
      }
    }
    
    console.log(`🎯 Successfully extracted ${posts.length} posts for analysis`);
    return posts;
    
  } catch (error) {
    console.error('Error extracting posts from page:', error);
    return posts;
  }
}

// Helper function to extract numeric values from engagement elements
function extractMetricValue(tweetElement, selector) {
  try {
    const element = tweetElement.querySelector(selector);
    if (!element) return 0;
    
    const text = element.textContent || element.getAttribute('aria-label') || '';
    const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*[KMB]?/i);
    
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      const suffix = text.match(/[KMB]/i);
      
      if (suffix) {
        switch (suffix[0].toLowerCase()) {
          case 'k': value *= 1000; break;
          case 'm': value *= 1000000; break;
          case 'b': value *= 1000000000; break;
        }
      }
      
      return Math.floor(value);
    }
    
    return 0;
  } catch (error) {
    return 0;
  }
}

// Handle individual tweet analysis (legacy functionality)
async function handleAnalyzeClick(tweetElement, button) {
  globalThis.BrandalyzeUtils.setButtonLoading(button, true);
  
  try {
    const content = globalThis.BrandalyzeUtils.extractContent(tweetElement);
    
    if (!content || content.length < 10) {
      alert('No content found to analyze');
      return;
    }
      // Send analysis request to background script
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'analyzeContent',
        data: {
          content: content,
          platform: 'twitter',
          sessionId: sessionId,
          brandSamples: [] // Will be populated by background script from user's brands
        }
      }, resolve);
    });
    
    if (response.success) {
      globalThis.BrandalyzeUtils.showAnalysisResult(response.data, button);
    } else {
      alert('Analysis failed: ' + (response.error || 'Unknown error'));
    }
    
  } catch (error) {
    console.error('Analysis error:', error);
    alert('Analysis failed: ' + error.message);
  } finally {
    globalThis.BrandalyzeUtils.setButtonLoading(button, false);
  }
}

// Initialize and observe for new content
async function initializeTwitterScript() {
  console.log('Initializing Twitter script...');
  
  // Wait for shared utilities
  await waitForBrandalyzeUtils();
  
  if (!globalThis.BrandalyzeUtils) {
    console.error('BrandalyzeUtils still not available, cannot proceed');
    return;
  }
  
  sessionId = globalThis.BrandalyzeUtils.generateSessionId();
  console.log('Generated session ID:', sessionId);
  
  // Initial processing with delay to ensure page is loaded
  setTimeout(() => {
    console.log('Starting initial tweet processing...');
    processTweets();
  }, 3000);
  
  // Watch for new tweets (Twitter loads content dynamically)
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && (
            node.querySelector && (
              node.querySelector('[data-testid="tweet"]') ||
              node.getAttribute('data-testid') === 'tweet'
            )
          )) {
            shouldProcess = true;
            break;
          }
        }
      }
      if (shouldProcess) break;
    }
    
    if (shouldProcess) {
      console.log('New tweets detected, processing...');
      setTimeout(processTweets, 1000);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('Twitter content script initialized with observer');
}

// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTwitterScript);
} else {
  initializeTwitterScript();
}