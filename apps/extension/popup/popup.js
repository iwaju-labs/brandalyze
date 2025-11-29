// Clean popup.js - centralized auth via background script

// Global variables
let currentUser = null;
let currentPlatform = null;

// Open Brandalyze app for sign in
async function openBrandalyzeApp() {
  try {
    await chrome.runtime.sendMessage({
      action: "openBrandalyzeApp",
    });
    globalThis.close();
  } catch (error) {
    console.error("Failed to open Brandalyze app:", error);
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
    console.error("Platform detection error:", error);
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
    console.error("Failed to navigate to Twitter:", error);
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
    console.error("Failed to navigate to LinkedIn:", error);
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
      hideLoading();
      updateAuthUI({ isAuthenticated: false });
      console.error("Auth check error:", error);
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
      console.error("Auth initiation error:", error);
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
        console.error('Force refresh failed:', response.error);
      }
    } catch (error) {
      hideLoading();
      updateAuthUI({ isAuthenticated: false });
      console.error("Force refresh error:", error);
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
      const displayText = userInfo.display_name || userInfo.email;
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
    } else {
      hideElement(elements.upgradeNotice);
      // Show platform navigation for paid users
      showElement(elements.platformNavigationSection);
      showElement(elements.profileAnalysisSection);
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
