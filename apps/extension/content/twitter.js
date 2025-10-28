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
  
  // First check if we're on the correct user's profile
  const currentProfile = getCurrentProfileHandle();
  const savedHandle = await getSavedTwitterHandle();
  
  if (!savedHandle) {
    console.log('No Twitter handle saved in extension settings');
    return;
  }
  
  if (!currentProfile || currentProfile.toLowerCase() !== savedHandle.toLowerCase()) {
    console.log(`Not on target profile. Current: ${currentProfile}, Target: ${savedHandle}`);
    return;
  }
  
  console.log(`On target profile: @${currentProfile}`);
  
  // Check if we're on a profile page (not timeline/search/etc)
  if (!globalThis.location.pathname.includes(`/${savedHandle}`)) {
    console.log('Not on profile page');
    return;
  }
  
  // Look for profile analysis section or add one
  const profileHeader = document.querySelector('[data-testid="UserName"]')?.closest('[data-testid="UserCell"]') || 
                       document.querySelector('[data-testid="UserDescription"]')?.parentElement;
  
  if (profileHeader && !profileHeader.querySelector('.brandalyze-profile-analysis')) {
    addProfileAnalysisButton(profileHeader, savedHandle);
  }
  
  // For individual tweets, only process if we want individual tweet analysis too
  // (This can be removed if we only want profile-level analysis)
  if (shouldProcessIndividualTweets()) {
    await processIndividualTweets();
  }
}

// Get the current profile handle from the URL or page
function getCurrentProfileHandle() {
  // Extract from URL: twitter.com/username or x.com/username
  const pathSegments = globalThis.location.pathname.split('/').filter(segment => segment);
  if (pathSegments.length > 0 && !['home', 'explore', 'notifications', 'messages', 'search'].includes(pathSegments[0])) {
    return pathSegments[0];
  }
  
  // Try to extract from page elements
  const profileLink = document.querySelector('[data-testid="UserName"] a[href*="/"]');
  if (profileLink) {
    const href = profileLink.getAttribute('href');
    const match = href.match(/\/([^\/]+)$/);
    if (match) return match[1];
  }
  
  return null;
}

// Get saved Twitter handle from extension storage
async function getSavedTwitterHandle() {
  try {
    const result = await chrome.storage.local.get(['twitterHandle']);
    return result.twitterHandle || null;
  } catch (error) {
    console.error('Failed to get saved handle:', error);
    return null;
  }
}

// Add profile analysis button to the profile header
function addProfileAnalysisButton(profileHeader, handle) {
  const analysisContainer = document.createElement('div');
  analysisContainer.className = 'brandalyze-profile-analysis';
  analysisContainer.style.cssText = `
    margin: 12px 0;
    padding: 16px;
    border: 1px solid #e1e8ed;
    border-radius: 12px;
    background: #f7f9fa;
  `;
  
  const button = globalThis.BrandalyzeUtils.createAnalyzeButton(async function() {
    await handleProfileAnalysis(handle, button);
  });
  button.innerHTML = `
    <span class="btn-text">📊 Analyze Profile Brand Alignment</span>
    <span class="btn-loading" style="display: none;">⏳ Analyzing recent posts...</span>
  `;
  button.style.width = '100%';
  button.style.marginBottom = '8px';
  
  const description = document.createElement('div');
  description.style.cssText = `
    font-size: 12px;
    color: #657786;
    text-align: center;
  `;
  description.textContent = 'Analyze the last 10 posts for brand alignment';
  
  analysisContainer.appendChild(button);
  analysisContainer.appendChild(description);
  
  // Insert after the profile description or follow button
  const insertPoint = profileHeader.querySelector('[data-testid="UserDescription"]') || 
                     profileHeader.querySelector('[data-testid="UserActions"]') ||
                     profileHeader;
  
  insertPoint.parentNode.insertBefore(analysisContainer, insertPoint.nextSibling);
  console.log('Added profile analysis button');
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

// Handle profile analysis (analyze last 10 posts)
async function handleProfileAnalysis(handle, button) {
  globalThis.BrandalyzeUtils.setButtonLoading(button, true);
    try {
    // Wait for chrome extension API to be available with retry mechanism
    await waitForChromeAPI();
    
    // Send profile analysis request to background script
    const response = await new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({
          action: 'analyzeProfile',
          data: {
            handle: handle,
            platform: 'twitter',
            sessionId: sessionId
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
      alert('Profile analysis failed: ' + errorMsg);
    }
    
  } catch (error) {
    console.error('Profile analysis error:', error);
    alert('Profile analysis failed: ' + error.message);
  } finally {
    globalThis.BrandalyzeUtils.setButtonLoading(button, false);
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

  const averageScore = result.average_score || 0;
  const scoreColor = averageScore >= 0.7 ? '#10b981' : 
                    averageScore >= 0.4 ? '#f59e0b' : '#ef4444';
  
  popup.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">@${result.handle || 'Profile'} Brand Analysis</h3>
      <button onclick="this.closest('.brandalyze-profile-result-popup').remove()" style="
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
      ">×</button>
    </div>
    
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 16px; background: #f7f9fa; border-radius: 12px;">
      <div style="width: 12px; height: 12px; border-radius: 50%; background: ${scoreColor};"></div>
      <div>
        <div style="font-weight: 600; font-size: 16px;">Average Brand Alignment: ${Math.round(averageScore * 100)}%</div>
        <div style="color: #657786; font-size: 12px;">Based on ${result.posts_analyzed || 0} recent posts</div>
      </div>
    </div>
    
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
    
    <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e1e8ed; text-align: center;">
      <button onclick="this.closest('.brandalyze-profile-result-popup').remove()" style="
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
  overlay.onclick = () => {
    document.body.removeChild(overlay);
    document.body.removeChild(popup);
  };

  document.body.appendChild(overlay);
  document.body.appendChild(popup);

  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (popup.parentElement) {
      document.body.removeChild(overlay);
      document.body.removeChild(popup);
    }
  }, 30000);
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