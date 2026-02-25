// Clean popup.js - centralized auth via background script

// Debug utility fallback
const debug = globalThis.BrandalyzeDebug || { log: () => {}, warn: () => {}, error: console.error, info: () => {} };

// Global variables
let currentUser = null;
let currentPlatform = null;

// Check if error is due to extension context being invalidated
function isContextInvalidated(error) {
  if (!error) return false;
  const message = error.message || error.toString();
  return message.includes('Extension context invalidated') ||
         message.includes('context invalidated') ||
         message.includes('Receiving end does not exist');
}

// Show context invalidated error in popup
function showContextInvalidatedError() {
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="font-size: 32px; margin-bottom: 12px;">🔄</div>
      <h3 style="margin: 0 0 8px; color: #1f2937;">Extension Updated</h3>
      <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px;">
        The extension was recently updated. Please close and reopen this popup.
      </p>
      <button onclick="window.close()" style="
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
      ">Close</button>
    </div>
  `;
}

// Open Brandalyze app for sign in
async function openBrandalyzeApp() {
  try {
    await chrome.runtime.sendMessage({
      action: "openBrandalyzeApp",
    });
    globalThis.close();
  } catch (error) {
    if (isContextInvalidated(error)) {
      showContextInvalidatedError();
      return;
    }
    debug.error("Failed to open Brandalyze app:", error);
    alert("Please manually navigate to Brandalyze and sign in.");
  }
}

// Platform detection function
async function detectCurrentPlatform() {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    const url = tab.url;

    if (url.includes("twitter.com") || url.includes("x.com")) {
      return {
        platform: "twitter",
        displayName: "X",
        handleKey: "twitterHandle",
      };
    } else if (url.includes("linkedin.com")) {
      return {
        platform: "linkedin",
        displayName: "LinkedIn",
        handleKey: "linkedinHandle",
      };
    }
    return null;
  } catch (error) {
    debug.error("Platform detection error:", error);
    return null;
  }
}

// DOM helper functions
function getElement(id) {
  return document.getElementById(id);
}

function showElement(element) {
  if (element) element.classList.remove("hidden");
}

function hideElement(element) {
  if (element) element.classList.add("hidden");
}

function setText(element, text) {
  if (element) element.textContent = text;
}

// Open options page
function openOptionsPage() {
  chrome.tabs.create({ url: chrome.runtime.getURL("popup/options.html") });
  globalThis.close();
}

// Navigate to Twitter/X profile section
async function navigateToTwitter() {
  try {
    // Get user's configured Twitter handle
    const result = await chrome.storage.local.get(["twitterHandle"]);
    const handle = result.twitterHandle;

    const url = handle ? `https://x.com/${handle}` : "https://x.com/explore";
    await chrome.tabs.create({ url });
    globalThis.close();
  } catch (error) {
    debug.error("Failed to navigate to Twitter:", error);
  }
}

// Navigate to LinkedIn profile section
async function navigateToLinkedIn() {
  try {
    // Get user's configured LinkedIn handle
    const result = await chrome.storage.local.get(["linkedinHandle"]);
    const handle = result.linkedinHandle;

    const url = handle
      ? `https://linkedin.com/in/${handle}`
      : "https://linkedin.com/feed";
    await chrome.tabs.create({ url });
    globalThis.close();
  } catch (error) {
    debug.error("Failed to navigate to LinkedIn:", error);
  }
}

// Main DOMContentLoaded handler
document.addEventListener("DOMContentLoaded", async () => {
  // Get all DOM elements
  const elements = {
    userEmail: getElement("userEmail"),
    subscriptionInfo: getElement("subscriptionInfo"),
    subscriptionTier: getElement("subscriptionTier"),
    upgradeNotice: getElement("upgradeNotice"),
    upgradeLink: getElement("upgradeLink"),
    loading: getElement("loading"),
    authenticatedContent: getElement("authenticatedContent"),
    unauthenticatedContent: getElement("unauthenticatedContent"),
    signInBtn: getElement("signInBtn"),
    cacheText: getElement("cacheText"),
    refreshAuthBtn: getElement("refreshAuthBtn"),
    platformIndicator: getElement("platformIndicator"),
    openOptionsBtn: getElement("openOptionsBtn"),
    handleError: getElement("handleError"),
    handleSuccess: getElement("handleSuccess"),
    // Platform navigation section
    platformNavigationSection: getElement("platformNavigationSection"),
    profileAnalysisSection: getElement("profileAnalysisSection"),
    // Navigation buttons
    goToTwitterBtn: getElement("goToTwitterBtn"),
    goToLinkedInBtn: getElement("goToLinkedInBtn"),
    // Recent results section
    recentResultsSection: getElement("recentResultsSection"),
    viewLastAuditBtn: getElement("viewLastAuditBtn"),
    viewLastProfileBtn: getElement("viewLastProfileBtn"),
    lastAuditLabel: getElement("lastAuditLabel"),
    lastAuditTime: getElement("lastAuditTime"),
    lastProfileLabel: getElement("lastProfileLabel"),
    lastProfileTime: getElement("lastProfileTime"),
    // Tweet audit section
    tweetTextInput: getElement("tweetTextInput"),
    tweetCharCount: getElement("tweetCharCount"),
    auditTweetBtn: getElement("auditTweetBtn"),
  };

  // Utility functions
  function showLoading() {
    showElement(elements.loading);
  }

  function hideLoading() {
    hideElement(elements.loading);
  }

  // Update platform indicator
  async function updatePlatformIndicator(platformInfo) {
    currentPlatform = platformInfo;

    if (platformInfo) {
      setText(
        elements.platformIndicator,
        `Currently on ${platformInfo.displayName}`
      );
      showElement(elements.platformIndicator);
    } else {
      hideElement(elements.platformIndicator);
    }
  }

  // Check authentication - reads from storage
  async function checkAuth() {
    const startTime = Date.now();

    try {
      const response = await chrome.runtime.sendMessage({
        action: "getAuthState",
      });

      if (Date.now() - startTime > 100) {
        showLoading();
      }

      if (response.success && response.data.isAuthenticated) {
        updateAuthUI(response.data);
      } else {
        updateAuthUI({ isAuthenticated: false });
      }
    } catch (error) {
      if (isContextInvalidated(error)) {
        showContextInvalidatedError();
        return;
      }
      hideLoading();
      updateAuthUI({ isAuthenticated: false });
      debug.error("Auth check error:", error);
    }
  }

  // Initiate authentication - opens Brandalyze extension auth page
  async function initiateAuth() {
    try {
      showLoading();
      setText(elements.cacheText, "Opening Brandalyze...");
      
      // Determine which URL to open
      const stored = await chrome.storage.local.get(['currentApiUrl']);
      const appUrl = stored.currentApiUrl === 'http://localhost:8000/api'
        ? 'http://localhost:3000'
        : 'https://brandalyze.io';
      
      // Get extension ID for callback
      const extensionId = chrome.runtime.id;
      
      // Open extension auth page with callback URL
      await chrome.tabs.create({ 
        url: `${appUrl}/extension-auth?extension_id=${extensionId}` 
      });
      
      hideLoading();
      setText(elements.cacheText, "Complete sign in on the web page");
      globalThis.close();
    } catch (error) {
      hideLoading();
      debug.error("Auth initiation error:", error);
    }
  }

  // Force refresh authentication - clear tokens and re-authenticate
  async function forceRefreshAuth() {
    showLoading();
    setText(elements.cacheText, "Clearing tokens...");

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'forceAuthRefresh'
      });
      
      if (response.success) {
        // Background script will open new auth tab
        updateAuthUI({ isAuthenticated: false });
      } else {
        debug.error('Force refresh failed:', response.error);
      }
    } catch (error) {
      if (isContextInvalidated(error)) {
        showContextInvalidatedError();
        return;
      }
      hideLoading();
      updateAuthUI({ isAuthenticated: false });
      debug.error("Force refresh error:", error);
    }
  }
  // Format time ago in human readable format
  function formatTimeAgo(timestamp) {
    const seconds = Math.round((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) {
      return `${seconds}s ago`;
    }
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h ago`;
    }
    return `${days}d ago`;
  }

  // Update authentication UI - simplified
  function updateAuthUI(authState) {
    hideLoading();

    if (authState.lastSynced) {
      setText(elements.cacheText, `Synced ${formatTimeAgo(authState.lastSynced)}`);
    } else {
      setText(elements.cacheText, `Checking...`);
    }
    
    if (authState.isAuthenticated && authState.userInfo) {
      const userInfo = authState.userInfo;
      const displayText = userInfo.display_name || userInfo.displayName || userInfo.name || userInfo.first_name || userInfo.email;
      setText(elements.userEmail, displayText);
      
      updateSubscriptionUI({
        subscriptionTier: userInfo.subscription_tier,
        extensionEnabled: userInfo.extension_enabled,
        requiresUpgrade: !userInfo.extension_enabled
      });
      
      showElement(elements.authenticatedContent);
      hideElement(elements.unauthenticatedContent);
      currentUser = userInfo;
      detectCurrentPlatform().then(updatePlatformIndicator);
    } else {
      setText(elements.userEmail, "Please sign in to continue");
      hideElement(elements.authenticatedContent);
      showElement(elements.unauthenticatedContent);
    }
  }

  // Update subscription UI and disable features for free users
  function updateSubscriptionUI(userInfo) {
    if (userInfo.subscriptionTier && elements.subscriptionTier) {
      setText(elements.subscriptionTier, userInfo.subscriptionTier);

      let tierClasses = "bg-gray-100 text-gray-600 border-gray-200";
      if (userInfo.subscriptionTier?.toLowerCase() === "pro") {
        tierClasses = "bg-blue-100 text-blue-800 border-blue-200";
      } else if (userInfo.subscriptionTier?.toLowerCase() === "enterprise") {
        tierClasses = "bg-purple-100 text-purple-800 border-purple-200";
      }

      elements.subscriptionTier.className = `inline-block px-2 py-0.5 rounded text-xs font-medium uppercase border ${tierClasses}`;
      showElement(elements.subscriptionInfo);
    }    // Handle free user restrictions (fail-closed: treat unknown as free)
    if (
      userInfo.requiresUpgrade ||
      userInfo.subscriptionTier?.toLowerCase() === "free" ||
      userInfo.subscriptionTier?.toLowerCase() === "unknown" ||
      !userInfo.subscriptionTier) {
      showElement(elements.upgradeNotice);
      // Hide platform navigation for free users
      hideElement(elements.platformNavigationSection);
      hideElement(elements.profileAnalysisSection);
      hideElement(elements.recentResultsSection);
    } else {
      hideElement(elements.upgradeNotice);
      // Show platform navigation for paid users
      showElement(elements.platformNavigationSection);
      showElement(elements.profileAnalysisSection);
      // Load and show recent results
      loadRecentResults();
    }
  }

  // Load recent audit and profile analysis results
  async function loadRecentResults() {
    try {
      const stored = await chrome.storage.local.get([
        "lastAuditResult",
        "lastProfileAnalysisResult"
      ]);

      let hasResults = false;

      // Check for last audit
      if (stored.lastAuditResult && stored.lastAuditResult.data) {
        hasResults = true;
        const audit = stored.lastAuditResult;
        const score = Math.round(audit.data.audit?.score || audit.data.score || 0);
        
        if (elements.lastAuditLabel) {
          elements.lastAuditLabel.textContent = `Post Audit (${score}%)`;
        }
        if (elements.lastAuditTime) {
          elements.lastAuditTime.textContent = formatTimeAgo(audit.timestamp);
        }
        if (elements.viewLastAuditBtn) {
          elements.viewLastAuditBtn.disabled = false;
        }
      }

      // Check for last profile analysis
      if (stored.lastProfileAnalysisResult && stored.lastProfileAnalysisResult.data) {
        hasResults = true;
        const profile = stored.lastProfileAnalysisResult;
        const handle = profile.data.handle || "Profile";
        
        if (elements.lastProfileLabel) {
          elements.lastProfileLabel.textContent = `@${handle} Analysis`;
        }
        if (elements.lastProfileTime) {
          elements.lastProfileTime.textContent = formatTimeAgo(profile.timestamp);
        }
        if (elements.viewLastProfileBtn) {
          elements.viewLastProfileBtn.disabled = false;
        }
      }

      // Show the section if we have any results
      if (hasResults) {
        showElement(elements.recentResultsSection);
      }
    } catch (error) {
      debug.error("Error loading recent results:", error);
    }
  }

  // Open panel on current tab with stored data
  async function openPanelWithData(panelType, data) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab || !tab.id) {
        debug.error("No active tab found");
        return;
      }

      // Check if we're on a supported platform
      const url = tab.url || "";
      const isTwitter = url.includes("twitter.com") || url.includes("x.com");
      const isLinkedIn = url.includes("linkedin.com");

      if (!isTwitter && !isLinkedIn) {
        // Navigate to Twitter first, then show panel
        await chrome.tabs.update(tab.id, { url: "https://x.com" });
        // Store the data to show after navigation
        await chrome.storage.local.set({ pendingPanelData: { type: panelType, data } });
        globalThis.close();
        return;
      }

      // Send message to content script to open the panel
      await chrome.tabs.sendMessage(tab.id, {
        action: panelType === "audit" ? "openAuditPanel" : "openProfilePanel",
        data: data
      });

      globalThis.close();
    } catch (error) {
      debug.error("Error opening panel:", error);
    }
  }

  // Event listeners
  if (elements.signInBtn) {
    elements.signInBtn.addEventListener("click", initiateAuth);
  }
  if (elements.refreshAuthBtn)
    elements.refreshAuthBtn.addEventListener("click", forceRefreshAuth);
  if (elements.openOptionsBtn)
    elements.openOptionsBtn.addEventListener("click", openOptionsPage);

  // Navigation button event listeners
  if (elements.goToTwitterBtn)
    elements.goToTwitterBtn.addEventListener("click", navigateToTwitter);
  if (elements.goToLinkedInBtn)
    elements.goToLinkedInBtn.addEventListener("click", navigateToLinkedIn);

  // Tweet audit event listeners
  if (elements.tweetTextInput) {
    elements.tweetTextInput.addEventListener("input", () => {
      const text = elements.tweetTextInput.value;
      const length = text.length;
      if (elements.tweetCharCount) {
        elements.tweetCharCount.textContent = `${length}/500`;
      }
      if (elements.auditTweetBtn) {
        elements.auditTweetBtn.disabled = length === 0;
      }
    });
  }

  if (elements.auditTweetBtn) {
    elements.auditTweetBtn.addEventListener("click", () => {
      const text = elements.tweetTextInput?.value?.trim();
      if (!text) return;
      
      // Encode the tweet text and open the analyze page with the tweet tab
      const encodedText = encodeURIComponent(text);
      const url = `https://brandalyze.io/analyze?tab=tweet&text=${encodedText}`;
      chrome.tabs.create({ url });
      globalThis.close();
    });
  }

  // Recent results button handlers
  if (elements.viewLastAuditBtn) {
    elements.viewLastAuditBtn.addEventListener("click", async () => {
      const stored = await chrome.storage.local.get(["lastAuditResult"]);
      if (stored.lastAuditResult && stored.lastAuditResult.data) {
        await openPanelWithData("audit", stored.lastAuditResult.data);
      }
    });
  }

  if (elements.viewLastProfileBtn) {
    elements.viewLastProfileBtn.addEventListener("click", async () => {
      const stored = await chrome.storage.local.get(["lastProfileAnalysisResult"]);
      if (stored.lastProfileAnalysisResult && stored.lastProfileAnalysisResult.data) {
        await openPanelWithData("profile", stored.lastProfileAnalysisResult.data);
      }
    });
  }

  if (elements.upgradeLink) {
    elements.upgradeLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: "https://brandalyze.io/pricing" });
      globalThis.close();
    });
  }

  // Initial setup
  const platformInfo = await detectCurrentPlatform();
  await updatePlatformIndicator(platformInfo);
  await checkAuth();
});
