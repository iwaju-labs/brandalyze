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
    });
    const data = await response.json();
    if (response.ok && data.success && data.data) {
      return {
        email: data.data.email,
        subscriptionTier: data.data.subscription_tier,
        extensionEnabled: data.data.extension_enabled,
      };
    } else if (
      response.status === 403 &&
      data.error?.code === "EXTENSION_REQUIRES_PAID_PLAN"
    ) {
      return {
        email: "Unknown user",
        subscriptionTier: "free",
        extensionEnabled: false,
        requiresUpgrade: true,
        error: data.error.message,
      };
    }
    console.log("❌ Backend auth failed:", response.status, data);
  } catch (e) {
    console.error("❌ Fetch error:", e.message);
  }
  return {
    email: "Unknown user",
    subscriptionTier: "unknown",
    extensionEnabled: false,
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
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // Get user's configured Twitter handle
    const result = await chrome.storage.local.get(["twitterHandle"]);
    const handle = result.twitterHandle;
    
    const url = handle ? `https://x.com/${handle}` : "https://x.com/explore";
    await chrome.tabs.update(tab.id, { url });
    globalThis.close();
  } catch (error) {
    console.error("Failed to navigate to Twitter:", error);
  }
}

// Navigate to LinkedIn profile section
async function navigateToLinkedIn() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // Get user's configured LinkedIn handle
    const result = await chrome.storage.local.get(["linkedinHandle"]);
    const handle = result.linkedinHandle;
    
    const url = handle ? `https://linkedin.com/in/${handle}` : "https://linkedin.com/feed";
    await chrome.tabs.update(tab.id, { url });
    globalThis.close();
  } catch (error) {
    console.error("Failed to navigate to LinkedIn:", error);
  }
}

// Main DOMContentLoaded handler
document.addEventListener("DOMContentLoaded", async () => {  // Get all DOM elements
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
  } // Update platform indicator
  function updatePlatformIndicator(platformInfo) {
    currentPlatform = platformInfo;

    if (platformInfo) {
      setText(
        elements.platformIndicator,
        `Currently on ${platformInfo.displayName}`
      );
      showElement(elements.platformIndicator);

      // Update analyze button text
      setText(
        elements.analyzeButtonText,
        `Analyze ${platformInfo.displayName} Profile`
      );
    } else {
      hideElement(elements.platformIndicator);
      setText(elements.analyzeButtonText, "Analyze Current Profile");
    }
  } // Analyze profile
  async function analyzeProfile() {
    clearMessages();

    if (!currentPlatform) {
      setText(
        elements.handleError,
        "Please navigate to Twitter/X or LinkedIn to analyze profiles"
      );
      showElement(elements.handleError);
      return;
    }

    const hasRecentResults = await checkForRecentAnalysis();
    if (hasRecentResults) {
      return;
    }

    // Check if user has handle configured for current platform
    const result = await chrome.storage.local.get([currentPlatform.handleKey]);
    const handle = result[currentPlatform.handleKey];

    if (!handle) {
      setText(
        elements.handleError,
        `Please configure your ${currentPlatform.displayName} handle in Settings first`
      );
      showElement(elements.handleError);
      return;
    }

    // Show loading state
    showLoading();
    setText(elements.analyzeButtonText, "Analyzing...");
    if (elements.analyzeProfileBtn) elements.analyzeProfileBtn.disabled = true;

    try {
      // Call backend analysis API
      const response = await chrome.runtime.sendMessage({
        action: "analyzeProfile",
        data: {
          handle: handle,
          platform: currentPlatform.platform,
          posts_count: 10,
        },
      });
      if (response.success) {
        // Show success message for voice analysis
        const data = response.data;
        let successMessage = "Profile voice analysis completed!";

        if (data.confidence_score) {
          successMessage += ` Confidence: ${Math.round(
            data.confidence_score * 100
          )}%`;
        } else if (data.average_score) {
          successMessage += ` Average alignment: ${Math.round(
            data.average_score * 100
          )}%`;
        }

        // Add voice analysis summary if available
        if (data.voice_analysis) {
          const voice = data.voice_analysis;
          successMessage = `Voice Analysis Complete! Tone: ${voice.tone}`;
        }

        setText(elements.handleSuccess, successMessage);
        showElement(elements.handleSuccess);

        // Store analysis result for display
        await chrome.storage.local.set({
          lastAnalysis: {
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
      console.error("Profile analysis error:", error);
      let errorMessage = "Failed to analyze profile";

      // Provide more specific error messages
      if (error.message.includes("EXTENSION_REQUIRES_PAID_PLAN")) {
        errorMessage = "Analysis requires Pro or Enterprise subscription";
      } else if (error.message.includes("DAILY_LIMIT_EXCEEDED")) {
        errorMessage = "Daily analysis limit reached. Try again tomorrow.";
      } else if (error.message.includes("NO_BRAND_FOUND")) {
        errorMessage = "Please create a brand in Brandalyze first";
      } else if (error.message.includes("sign in")) {
        errorMessage = "Please sign in to Brandalyze first";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setText(elements.handleError, errorMessage);
      showElement(elements.handleError);
    } finally {
      hideLoading();
      setText(
        elements.analyzeButtonText,
        currentPlatform
          ? `Analyze ${currentPlatform.displayName} Profile`
          : "Analyze Current Profile"
      );
      if (elements.analyzeProfileBtn)
        elements.analyzeProfileBtn.disabled = false;
    }
  }

  // check for recent analysis results
  async function checkForRecentAnalysis() {
    try {
      const result = await chrome.storage.local.get("lastAnalysis");
      const analysis = result.lastAnalysis;

      if (analysis && analysis.platform == currentPlatform?.platform) {
        const age = Date.now() - analysis.timestamp;
        const maxAge = 5 * 60 * 1000;

        if (age < maxAge) {
          displayAnalysisResults(analysis);
          return true;
        }
      }
    } catch (error) {
      console.error("Error checking recent analysis:", error);
    }

    return false;
  }

  // Display analysis results in the popup
  function displayAnalysisResults(analysis) {
    try {
      clearMessages();

      if (analysis.type === "voice" && analysis.results) {
        const results = analysis.results;
        let successMessage = "";

        if (results.voice_analysis) {
          const voice = results.voice_analysis;
          successMessage = `✅ Voice Analysis Complete!\nTone: ${voice.tone}\nStyle: ${voice.style}`;

          if (results.confidence_score) {
            successMessage += `\nConfidence: ${Math.round(
              results.confidence_score * 100
            )}%`;
          }
        } else if (results.analysis_summary) {
          successMessage = `✅ ${results.analysis_summary}`;
        } else {
          successMessage = "✅ Profile analysis completed!";
        }

        setText(elements.handleSuccess, successMessage);
        showElement(elements.handleSuccess);

        console.log("📋 Displayed LinkedIn analysis results:", results);
      } else {
        console.log("⚠️ Unknown analysis format:", analysis);
        setText(
          elements.handleSuccess,
          "✅ Analysis completed - check console for details"
        );
        showElement(elements.handleSuccess);
      }
    } catch (error) {
      console.error("Error displaying analysis results:", error);
      setText(elements.handleError, "Error displaying results");
      showElement(elements.handleError);
    }
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

    const alignmentType = elements.alignmentType?.value || "brand";
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
  async function checkAuth() {
    showLoading();
    try {
      const response = await chrome.runtime.sendMessage({
        action: "checkClerkAuth",
      });

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
  // Update authentication UI
  function updateAuthUI(authState) {
    hideLoading();

    // Show cache status
    if (authState.lastChecked) {
      const age = Math.round((Date.now() - authState.lastChecked) / 1000);
      setText(elements.cacheText, `Auth cached (${age}s ago)`);
    } else {
      setText(elements.cacheText, "Fresh auth check");
    }

    if (authState.isAuthenticated && authState.userData) {
      // Authenticated state - just show user info
      // Handle user info
      if (authState.apiUrl && authState.jwt) {
        fetchUserInfo(authState.apiUrl, authState.jwt).then((userInfo) => {
          setText(elements.userEmail, userInfo.email);
          updateSubscriptionUI(userInfo);
        });
      }

      showElement(elements.authenticatedContent);
      hideElement(elements.unauthenticatedContent);

      // Detect platform
      detectCurrentPlatform().then(updatePlatformIndicator);
    } else {
      // Unauthenticated state
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
    }
    // Handle free user restrictions
    if (
      userInfo.requiresUpgrade ||
      userInfo.subscriptionTier?.toLowerCase() === "free"
    ) {
      showElement(elements.upgradeNotice);

      // Disable features for free users
      if (elements.analyzeProfileBtn) {
        elements.analyzeProfileBtn.disabled = true;
        elements.analyzeProfileBtn.className =
          elements.analyzeProfileBtn.className.replace(
            "bg-blue-500 hover:bg-blue-600",
            "bg-gray-400 cursor-not-allowed"
          );
        setText(elements.analyzeButtonText, "Pro Feature - Analyze Profile");
      }

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
      }
    } else {
      hideElement(elements.upgradeNotice);

      // Enable features for paid users
      if (elements.analyzeProfileBtn) {
        elements.analyzeProfileBtn.disabled = false;
        elements.analyzeProfileBtn.className =
          elements.analyzeProfileBtn.className.replace(
            "bg-gray-400 cursor-not-allowed",
            "bg-blue-500 hover:bg-blue-600"
          );
        // Button text will be updated by updatePlatformIndicator
      }

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
  }  // Event listeners
  if (elements.signInBtn)
    elements.signInBtn.addEventListener("click", openBrandalyzeApp);
  if (elements.refreshAuthBtn)
    elements.refreshAuthBtn.addEventListener("click", forceRefreshAuth);
  if (elements.analyzeProfileBtn)
    elements.analyzeProfileBtn.addEventListener("click", analyzeProfile);
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
      chrome.tabs.create({ url: "http://localhost:3000/pricing" });
      globalThis.close();
    });
  }

  if (elements.analyzeContentBtn)
    elements.analyzeContentBtn.addEventListener(
      "click",
      analyzeContentAlignment
    );

  // Initial setup
  const platformInfo = await detectCurrentPlatform();
  updatePlatformIndicator(platformInfo);
  await checkAuth();
});
