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

// Enhanced tweet processing with better selectors
async function processTweets() {
  console.log('🐦 Processing tweets...');
  console.log('🔍 Current URL:', window.location.href);
  console.log('🔍 Current pathname:', window.location.pathname);
  
  // First check if we're on a profile page
  const currentProfile = getCurrentProfileHandle();
  
  if (!currentProfile) {
    console.log('❌ Not on a profile page or unable to detect profile handle');
    return;
  }
  
  // Additional validation: ensure we're actually on a profile page
  const userNameElement = document.querySelector('[data-testid="UserName"]');
  const userDescElement = document.querySelector('[data-testid="UserDescription"]');
  const isProfilePage = globalThis.location.pathname === `/${currentProfile}` || 
                       globalThis.location.pathname.startsWith(`/${currentProfile}/`) ||
                       userNameElement ||
                       userDescElement;
  
  console.log('🔍 Profile validation:');
  console.log('  - URL match:', globalThis.location.pathname === `/${currentProfile}` || globalThis.location.pathname.startsWith(`/${currentProfile}/`));
  console.log('  - UserName element:', !!userNameElement);
  console.log('  - UserDescription element:', !!userDescElement);
  console.log('  - Final isProfilePage:', isProfilePage);
  
  if (!isProfilePage) {
    console.log(`❌ Not on a profile page for @${currentProfile}`);
    return;
  }
  
  console.log(`✅ On profile page: @${currentProfile}`);
  
  // Look for profile analysis section or add one
  // Wait a bit for the page to fully load
  setTimeout(() => {
    console.log('🔄 Attempting to add analyze button...');
    addAnalyzeButtonToProfile(currentProfile);
  }, 2000);
}

// Simplified function to add analyze button to profile
function addAnalyzeButtonToProfile(handle) {
  console.log(`🔍 Trying to add analyze button for @${handle}`);
  
  // Check if button already exists
  if (document.querySelector('.brandalyze-analyze-profile-btn')) {
    console.log('✅ Analyze button already exists');
    return;
  }
  
  // Simple strategy: Look for the specific edit profile button
  const editProfileButton = document.querySelector('a[href="/settings/profile"][data-testid="editProfileButton"]');
  
  if (editProfileButton) {
    console.log('📝 Found edit profile button, adding analyze button to the left...');
    console.log('🔍 Edit button container:', editProfileButton.parentElement);
    
    // Insert analyze button directly before the edit profile button
    insertAnalyzeButton(editProfileButton.parentElement, handle);
    return;
  }
  
  console.log('❌ Edit profile button not found');
}

// Get the current profile handle from the URL or page
function getCurrentProfileHandle() {
  // Extract from URL: twitter.com/username or x.com/username
  const pathSegments = globalThis.location.pathname.split('/').filter(segment => segment);
  
  // Exclude system pages and paths that are not user profiles
  const systemPaths = new Set([
    'home', 'explore', 'notifications', 'messages', 'search', 
    'settings', 'i', 'login', 'signup', 'tos', 'privacy',
    'compose', 'bookmarks', 'lists', 'communities', 'verify'
  ]);
    if (pathSegments.length > 0 && !systemPaths.has(pathSegments[0])) {
    const handle = pathSegments[0];
    
    // Additional validation: handle should not contain dots, be too short, or be system-like
    if (handle.length >= 1 && handle.length <= 15 && 
        !handle.includes('.') && 
        !/^(api|www|app|mail|support|help|admin|root)$/i.test(handle)) {
      console.log(`Detected profile handle from URL: @${handle}`);
      return handle;
    }
  }
  
  // Try to extract from page elements as fallback
  const profileLink = document.querySelector('[data-testid="UserName"] a[href*="/"]');
  if (profileLink) {
    const href = profileLink.getAttribute('href');
    const match = href.match(/\/([^/]+)$/);
    if (match && !systemPaths.has(match[1])) {
      console.log(`Detected profile handle from DOM: @${match[1]}`);
      return match[1];
    }
  }
  
  console.log('No valid profile handle detected');
  return null;
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
        <span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3 btn-loading" style="display: none;">
          <span class="loading-spinner" style="
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid #ffffff;
            border-radius: 50%;
            border-top-color: transparent;
            animation: spin 1s ease-in-out infinite;
          "></span>
          Analyzing...
        </span>
      </span>
    </div>
  `;
  
  // Add CSS for spinner animation
  if (!document.querySelector('#brandalyze-spinner-styles')) {
    const spinnerStyles = document.createElement('style');
    spinnerStyles.id = 'brandalyze-spinner-styles';
    spinnerStyles.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(spinnerStyles);
  }
  
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

// Handle profile analysis with loading states
async function handleProfileAnalysis(handle, button) {
  setAnalyzeButtonLoading(button, true);
  
  try {
    // Wait for chrome extension API to be available
    await waitForChromeAPI();
    
    // Extract bio information from the current page
    const extractedBio = extractProfileBioFromPage(handle);
    console.log(`🔍 Extracted profile bio for @${handle}:`, extractedBio);
    
    // Send profile analysis request to background script
    const response = await new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({
          action: 'analyzeProfile',
          data: {
            handle: handle,
            platform: 'twitter',
            sessionId: sessionId,
            extractedBio: extractedBio,
            use_bio: true
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
    } else {
      const errorMsg = response ? response.error : 'Unknown error';
      throw new Error(errorMsg);
    }
    
  } catch (error) {
    console.error('Profile analysis error:', error);
    alert('Profile analysis failed: ' + error.message);
  } finally {
    setAnalyzeButtonLoading(button, false);
  }
}

// Helper function to set loading state for the button
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
    for (const element of statsElements) {
      const text = element.textContent.toLowerCase();
      const numberMatch = text.match(/([\d,]+)/);
      if (numberMatch) {
        const number = Number.parseInt(numberMatch[1].replace(/,/g, ''), 10);
        if (text.includes('following')) {
          profileInfo.following_count = number;
        } else if (text.includes('followers')) {
          profileInfo.followers_count = number;
        }
      }
    }

    console.log('✅ Extracted profile info:', profileInfo);
    return profileInfo;

  } catch (error) {
    console.error('⚠️ Error extracting profile bio:', error);
    return profileInfo; // Return what we have
  }
}

// Show profile analysis results in a modal
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
  
  // Check if this is voice analysis
  const isVoiceAnalysis = result.voice_analysis && result.confidence_score;
  
  let headerTitle = '';
  let scoreDisplay = '';
  let contentSections = '';
  
  if (isVoiceAnalysis) {
    // Voice Analysis Display
    const voice = result.voice_analysis;
    const confidenceScore = result.confidence_score || 0;
    let scoreColor = '#ef4444';
    if (confidenceScore >= 0.8) {
      scoreColor = '#10b981';
    } else if (confidenceScore >= 0.6) {
      scoreColor = '#f59e0b';
    }
    
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
  
  // Add close button functionality
  const closeButtons = popup.querySelectorAll('.close-btn');
  for (const btn of closeButtons) {
    btn.addEventListener('click', () => {
      if (overlay && overlay.parentElement) {
        overlay.remove();
      }
      if (popup && popup.parentElement) {
        popup.remove();
      }
    });
  }
  
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
  
  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (popup.parentElement) {
      overlay.remove();
      popup.remove();
    }
  }, 30000);
}

// Initialize and observe for new content
async function initializeTwitterScript() {
  console.log('🐦 Initializing Twitter/X content script...');
  
  // Wait for shared utilities
  await waitForBrandalyzeUtils();
  
  if (!globalThis.BrandalyzeUtils) {
    console.error('❌ BrandalyzeUtils still not available, cannot proceed');
    return;
  }
  
  sessionId = globalThis.BrandalyzeUtils.generateSessionId();
  console.log('🆔 Generated session ID:', sessionId);
  
  // Initial processing with delay to ensure page is loaded
  setTimeout(() => {
    console.log('🚀 Starting initial tweet processing...');
    processTweets();
  }, 3000);
  
  // Also try again after a longer delay in case the page is still loading
  setTimeout(() => {
    console.log('🔄 Second attempt at adding analyze button...');
    processTweets();
  }, 8000);
  
  // Watch for new tweets and navigation changes (Twitter loads content dynamically)
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    let isNavigation = false;
    
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1 && node.querySelector) {
            // Check for profile page elements that indicate navigation
            if (node.querySelector('[data-testid="UserName"]') ||
                node.querySelector('[data-testid="UserDescription"]') ||
                node.querySelector('[data-testid="editProfileButton"]')) {
              isNavigation = true;
              shouldProcess = true;
            }
          }
        }
      }
      if (shouldProcess) break;
    }
    
    if (shouldProcess) {
      if (isNavigation) {
        console.log('🔄 Navigation detected, reprocessing profile...');
        setTimeout(processTweets, 2000);
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Twitter content script initialized with observer');
}

// Wait for page to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTwitterScript);
} else {
  initializeTwitterScript();
}
