// Clean popup.js without duplicates and simplified complexity

// Global variables
let currentUser = null;
let currentPlatform = null;

// Fetch user info from backend after authentication
async function fetchUserInfo(apiUrl, jwt) {
  try {
    const response = await fetch(`${apiUrl}/extension/auth/verify/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
    });    const data = await response.json();
    
    if (response.ok && data.success && data.data) {
      return {
        email: data.data.email || "Unknown user",
        displayName: data.data.display_name || data.data.email || "Unknown user",
        subscriptionTier: data.data.subscription_tier || "free",
        extensionEnabled: data.data.extension_enabled || false,
        requiresUpgrade: !data.data.extension_enabled
      };    } else {
      console.log("Backend response unsuccessful:", { status: response.status, ok: response.ok, data }); // Debug log
      return {
        email: "Unknown user",
        displayName: "Unknown user",
        subscriptionTier: "unknown",
        extensionEnabled: false,        requiresUpgrade: true
      };
    }
  } catch (e) {
    console.error("❌ Fetch error:", e.message);
  }
  return {
    email: "Unknown user",
    displayName: "Unknown user",
    subscriptionTier: "unknown",
    extensionEnabled: false,
    requiresUpgrade: true
  };
}

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

// Check if there's a saved analysis for the current platform
async function checkSavedAnalysis(platform) {
  try {
    const stored = await chrome.storage.local.get("saved_analyses");
    const savedAnalyses = stored.saved_analyses || [];

    // Find the most recent analysis for this platform
    const platformAnalysis = savedAnalyses
      .filter((item) => item.platform === platform)
      .sort((a, b) => new Date(b.analyzed_at) - new Date(a.analyzed_at))[0];

    return !!platformAnalysis; // Return true if analysis exists
  } catch (error) {
    console.error("Error checking saved analysis:", error);
    return false;
  }
}

// Update content alignment section visibility and functionality
async function updateContentAlignmentSection(platformInfo) {
  const contentSection = getElement("contentAlignmentSection");
  const noAnalysisWarning = getElement("noAnalysisWarning");
  const analyzeContentBtn = getElement("analyzeContentBtn");
  const contentToAnalyze = getElement("contentToAnalyze");

  if (!platformInfo) {
    // Hide content alignment section if not on a supported platform
    hideElement(contentSection);
    return;
  }

  // Show content alignment section for supported platforms
  showElement(contentSection);

  // Check if there's a saved analysis for this platform
  const hasAnalysis = await checkSavedAnalysis(platformInfo.platform);

  if (hasAnalysis) {
    // Hide warning - analysis is available
    hideElement(noAnalysisWarning);

    // Enable content analysis if user has paid plan (will be handled by updateFeatureAccess)
    if (
      analyzeContentBtn &&
      !analyzeContentBtn.textContent.includes("Pro Feature")
    ) {
      analyzeContentBtn.disabled = false;
      setText(analyzeContentBtn, "Check Alignment");
    }
    if (
      contentToAnalyze &&
      !contentToAnalyze.placeholder.includes("Pro feature")
    ) {
      contentToAnalyze.disabled = false;
      contentToAnalyze.placeholder =
        "Enter your post content to check alignment...";
    }
  } else {
    // Show warning - no analysis available
    showElement(noAnalysisWarning);

    // Disable content analysis regardless of subscription
    if (analyzeContentBtn) {
      analyzeContentBtn.disabled = true;
      setText(analyzeContentBtn, "Analyze Profile First");
    }
    if (contentToAnalyze) {
      contentToAnalyze.disabled = true;
      contentToAnalyze.placeholder = "Profile analysis required first...";
    }
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
        displayName: "Twitter/X",
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
    openOptionsBtn: getElement("openOptionsBtn"),    handleError: getElement("handleError"),
    handleSuccess: getElement("handleSuccess"),    // Platform navigation section
    platformNavigationSection: getElement("platformNavigationSection"),
    profileAnalysisSection: getElement("profileAnalysisSection"),
    // Content alignment elements
    contentToAnalyze: getElement("contentToAnalyze"),
    alignmentType: getElement("alignmentType"),
    referenceHandle: getElement("referenceHandle"),
    analyzeContentBtn: getElement("analyzeContentBtn"),
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

  function clearMessages() {
    setText(elements.handleError, "");
    setText(elements.handleSuccess, "");
    hideElement(elements.handleError);
    hideElement(elements.handleSuccess);
  }

  // Update platform indicator and content alignment section
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

    // Update content alignment section based on platform and available analyses
    await updateContentAlignmentSection(platformInfo);
  }

  // Analyze content alignment
  async function analyzeContentAlignment() {
    clearMessages();

    const content = elements.contentToAnalyze?.value?.trim();
    if (!content) {
      setText(elements.handleError, "Please enter content to analyze");
      showElement(elements.handleError);
      return;
    }

    const alignmentType = elements.alignmentType?.value || "profile";
    const referenceHandle = elements.referenceHandle?.value?.trim();

    if (alignmentType === "profile" && !referenceHandle) {
      setText(
        elements.handleError,
        "Please enter a reference handle for profile comparison"
      );
      showElement(elements.handleError);
      return;
    }

    // Show loading state
    showLoading();
    setText(elements.analyzeContentBtn, "Analyzing...");
    if (elements.analyzeContentBtn) elements.analyzeContentBtn.disabled = true;

    try {
      const response = await chrome.runtime.sendMessage({
        action: "analyzeContentAlignment",
        data: {
          content: content,
          type: alignmentType,
          reference_handle: referenceHandle,
          platform: currentPlatform?.platform || "twitter",
        },
      });

      if (response.success) {
        const data = response.data;
        let successMessage = `Alignment: ${Math.round(
          data.alignment_score * 100
        )}% (${data.alignment_level})`;

        setText(elements.handleSuccess, successMessage);
        showElement(elements.handleSuccess);

        // Store analysis result
        await chrome.storage.local.set({
          lastContentAnalysis: {
            ...response.data,
            timestamp: Date.now(),
          },
        });

        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          hideElement(elements.handleSuccess);
        }, 3000);
      } else {
        throw new Error(response.error || "Analysis failed");
      }
    } catch (error) {
      console.error("Content alignment analysis error:", error);
      let errorMessage = "Failed to analyze content alignment";

      if (error.message.includes("EXTENSION_REQUIRES_PAID_PLAN")) {
        errorMessage = "Analysis requires Pro or Enterprise subscription";
      } else if (error.message.includes("DAILY_LIMIT_EXCEEDED")) {
        errorMessage = "Daily analysis limit reached";
      } else if (error.message.includes("NO_BRAND_FOUND")) {
        errorMessage = "Please create a brand in Brandalyze first";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setText(elements.handleError, errorMessage);
      showElement(elements.handleError);
    } finally {
      hideLoading();
      setText(elements.analyzeContentBtn, "Check Alignment");
      if (elements.analyzeContentBtn)
        elements.analyzeContentBtn.disabled = false;
    }
  }

  // Check authentication - optimized to use cache when possible
  async function checkAuth() {
    // Only show loading for fresh auth checks
    const startTime = Date.now();

    try {
      const response = await chrome.runtime.sendMessage({
        action: "checkClerkAuth",
      });

      // Only show loading spinner if this takes more than 100ms (i.e., fresh check)
      if (Date.now() - startTime > 100) {
        showLoading();
      }

      if (response.success) {
        updateAuthUI(response.data);
      } else {
        updateAuthUI({ isAuthenticated: false });
        console.error("Auth check failed:", response.error);
      }
    } catch (error) {
      hideLoading();
      updateAuthUI({ isAuthenticated: false });
      console.error("Auth check error:", error);
    }
  }

  // Force refresh authentication
  async function forceRefreshAuth() {
    showLoading();
    setText(elements.cacheText, "Refreshing...");

    try {
      const response = await chrome.runtime.sendMessage({
        action: "forceAuthRefresh",
      });

      if (response.success) {
        updateAuthUI(response.data);
      } else {
        updateAuthUI({ isAuthenticated: false });
        console.error("Force refresh failed:", response.error);
      }
    } catch (error) {
      hideLoading();
      updateAuthUI({ isAuthenticated: false });
      console.error("Force refresh error:", error);
    }
  }

  // Update authentication UI - simplified and efficient
  function updateAuthUI(authState) {
    hideLoading();

    // Show cache status for debugging
    if (authState.lastChecked) {
      const age = Math.round((Date.now() - authState.lastChecked) / 1000);
      setText(elements.cacheText, `Cached (${age}s ago)`);    } else {
      setText(elements.cacheText, "Fresh check");
    }
    
    if (authState.isAuthenticated && authState.userData) {
      // Authenticated - fetch user details from backend API
      if (authState.apiUrl && authState.jwt) {
        // Show loading while fetching user info
        setText(elements.userEmail, "Loading...");
        
        fetchUserInfo(authState.apiUrl, authState.jwt).then((userInfo) => {
          currentUser = userInfo;
          // Prefer displayName over email for user display
          const displayText = userInfo.displayName || userInfo.email;
          setText(elements.userEmail, displayText);
          updateSubscriptionUI(userInfo);
        }).catch((error) => {
          console.error("Failed to fetch user info:", error);
          setText(elements.userEmail, "Error loading user info");
        });
      } else {
        setText(elements.userEmail, "Authentication incomplete");
      }

      showElement(elements.authenticatedContent);
      hideElement(elements.unauthenticatedContent);
      detectCurrentPlatform().then(updatePlatformIndicator);
    } else {
      // Not authenticated
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
      showElement(elements.upgradeNotice);      // Hide platform navigation for free users
      hideElement(elements.platformNavigationSection);
      hideElement(elements.profileAnalysisSection);

      // Disable content analysis for free users
      if (elements.analyzeContentBtn) {
        elements.analyzeContentBtn.disabled = true;
        elements.analyzeContentBtn.className =
          elements.analyzeContentBtn.className.replace(
            "bg-blue-500 hover:bg-blue-600",
            "bg-gray-400 cursor-not-allowed"
          );
        setText(elements.analyzeContentBtn, "Pro Feature");
      }

      if (elements.contentToAnalyze) {
        elements.contentToAnalyze.disabled = true;
        elements.contentToAnalyze.placeholder = "Pro feature - upgrade to use";
      }    } else {
      hideElement(elements.upgradeNotice);      // Show platform navigation for paid users
      showElement(elements.platformNavigationSection);
      showElement(elements.profileAnalysisSection);

      // Enable features for paid users - but check if analysis is available
      // This will be further refined by updateContentAlignmentSection
      if (elements.analyzeContentBtn) {
        elements.analyzeContentBtn.disabled = false;
        elements.analyzeContentBtn.className =
          elements.analyzeContentBtn.className.replace(
            "bg-gray-400 cursor-not-allowed",
            "bg-blue-500 hover:bg-blue-600"
          );
        setText(elements.analyzeContentBtn, "Check Alignment");
      }

      if (elements.contentToAnalyze) {
        elements.contentToAnalyze.disabled = false;
        elements.contentToAnalyze.placeholder =
          "Enter your post content to check alignment...";
      }
    }

    // Update content alignment section after subscription check
    updateContentAlignmentSection(currentPlatform);
  }

  // Event listeners
  if (elements.signInBtn)
    elements.signInBtn.addEventListener("click", openBrandalyzeApp);
  if (elements.refreshAuthBtn)
    elements.refreshAuthBtn.addEventListener("click", forceRefreshAuth);
  if (elements.openOptionsBtn)
    elements.openOptionsBtn.addEventListener("click", openOptionsPage);
  if (elements.analyzeContentBtn)
    elements.analyzeContentBtn.addEventListener(
      "click",
      analyzeContentAlignment
    );

  // Navigation button event listeners
  if (elements.goToTwitterBtn)
    elements.goToTwitterBtn.addEventListener("click", navigateToTwitter);
  if (elements.goToLinkedInBtn)
    elements.goToLinkedInBtn.addEventListener("click", navigateToLinkedIn);

  // Toggle reference handle visibility based on alignment type
  if (elements.alignmentType) {
    elements.alignmentType.addEventListener("change", () => {
      const alignmentType = elements.alignmentType.value;
      if (alignmentType === "profile") {
        showElement(elements.referenceHandle);
      } else {
        hideElement(elements.referenceHandle);
        if (elements.referenceHandle) elements.referenceHandle.value = "";
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
