// Get debug utility (loaded before this script via manifest)
const debug = globalThis.BrandalyzeDebug || { log: () => {}, warn: () => {}, error: console.error, info: () => {} };

debug.log("Brandalyze Twitter content script loaded");

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
      debug.error("BrandalyzeUtils not available after 5 seconds");
      resolve();
    }, 5000);
  });
}

let sessionId;

// Enhanced tweet processing with better selectors
async function processTweets() {
  debug.log("Processing tweets...");
  debug.log("Current URL:", globalThis.location.href);
  debug.log("Current pathname:", globalThis.location.pathname);

  // First check if we're on a profile page
  const currentProfile = getCurrentProfileHandle();

  if (!currentProfile) {
    debug.log("Not on a profile page or unable to detect profile handle");
    // Remove any existing button since we're not on a profile page
    const existingButton = document.querySelector(".brandalyze-analyze-profile-btn");
    if (existingButton) {
      debug.log("Removing analyze button (not on profile page)");
      existingButton.remove();
      currentButtonHandle = null;
    }
    return;
  }

  // Additional validation: ensure we're actually on a profile page
  const userNameElement = document.querySelector('[data-testid="UserName"]');
  const userDescElement = document.querySelector(
    '[data-testid="UserDescription"]'
  );
  const isProfilePage =
    globalThis.location.pathname === `/${currentProfile}` ||
    globalThis.location.pathname.startsWith(`/${currentProfile}/`) ||
    userNameElement ||
    userDescElement;

  debug.log("Profile validation:");
  debug.log(
    "  - URL match:",
    globalThis.location.pathname === `/${currentProfile}` ||
      globalThis.location.pathname.startsWith(`/${currentProfile}/`)
  );
  debug.log("  - UserName element:", !!userNameElement);
  debug.log("  - UserDescription element:", !!userDescElement);
  debug.log("  - Final isProfilePage:", isProfilePage);

  if (!isProfilePage) {
    debug.log(`Not on a profile page for @${currentProfile}`);
    // Remove any existing button since we're not on a valid profile page
    const existingButton = document.querySelector(".brandalyze-analyze-profile-btn");
    if (existingButton) {
      debug.log("Removing analyze button (not on valid profile page)");
      existingButton.remove();
      currentButtonHandle = null;
    }
    return;
  }

  debug.log(`On profile page: @${currentProfile}`);

  // Look for profile analysis section or add one  // Wait a bit for the page to fully load
  setTimeout(async () => {
    debug.log("Attempting to add analyze button...");
    await addAnalyzeButtonToProfile(currentProfile);
  }, 2000);
}

// Track if button is being added to prevent race conditions
let isAddingButton = false;
let currentButtonHandle = null;

// Simplified function to add analyze button to profile
async function addAnalyzeButtonToProfile(handle) {
  debug.log(`Trying to add analyze button for @${handle}`);

  // Prevent concurrent button additions
  if (isAddingButton) {
    debug.log("Button addition already in progress");
    return;
  }

  // Check if button already exists for this handle
  const existingButton = document.querySelector(".brandalyze-analyze-profile-btn");
  if (existingButton && currentButtonHandle === handle) {
    debug.log("Analyze button already exists for this profile");
    return;
  }

  // Remove existing button if it's for a different profile
  if (existingButton && currentButtonHandle !== handle) {
    debug.log(`Removing button for old profile @${currentButtonHandle}`);
    existingButton.remove();
    currentButtonHandle = null;
  }

  isAddingButton = true;

  // Simple strategy: Look for the specific edit profile button
  const editProfileButton = document.querySelector(
    'a[href="/settings/profile"][data-testid="editProfileButton"]'
  );
  if (editProfileButton) {
    debug.log("Found edit profile button, checking subscription access...");
    
    // Check if user has subscription access before adding analyze button
    const hasAccess = await globalThis.BrandalyzeUtils.checkSubscriptionAccess();
    if (!hasAccess) {
      debug.log("User does not have Pro/Enterprise subscription - analyze button not shown");
      isAddingButton = false;
      return;
    }
    
    debug.log("User has subscription access, adding analyze button");
    debug.log("Edit button container:", editProfileButton.parentElement);    // Insert analyze button directly before the edit profile button
    insertAnalyzeButton(editProfileButton.parentElement, handle);
    currentButtonHandle = handle;
    isAddingButton = false;
    return;
  }

  debug.log("Edit profile button not found");
  isAddingButton = false;
}

// Get the current profile handle from the URL or page
function getCurrentProfileHandle() {
  // Extract from URL: twitter.com/username or x.com/username
  const pathSegments = globalThis.location.pathname
    .split("/")
    .filter((segment) => segment);

  // Exclude system pages and paths that are not user profiles
  const systemPaths = new Set([
    "home",
    "explore",
    "notifications",
    "messages",
    "search",
    "settings",
    "i",
    "login",
    "signup",
    "tos",
    "privacy",
    "compose",
    "bookmarks",
    "lists",
    "communities",
    "verify",
  ]);
  if (pathSegments.length > 0 && !systemPaths.has(pathSegments[0])) {
    const handle = pathSegments[0];

    // Additional validation: handle should not contain dots, be too short, or be system-like
    if (
      handle.length >= 1 &&
      handle.length <= 15 &&
      !handle.includes(".") &&
      !/^(api|www|app|mail|support|help|admin|root)$/i.test(handle)
    ) {
      debug.log(`Detected profile handle from URL: @${handle}`);
      return handle;
    }
  }

  // Try to extract from page elements as fallback
  const profileLink = document.querySelector(
    '[data-testid="UserName"] a[href*="/"]'
  );
  if (profileLink) {
    const href = profileLink.getAttribute("href");
    const match = href.match(/\/([^/]+)$/);
    if (match && !systemPaths.has(match[1])) {
      debug.log(`Detected profile handle from DOM: @${match[1]}`);
      return match[1];
    }
  }

  debug.log("No valid profile handle detected");
  return null;
}

function insertAnalyzeButton(container, handle) {
  // Create the analyze button with Twitter-like styling
  const analyzeButton = document.createElement("a");
  analyzeButton.className =
    "brandalyze-analyze-profile-btn css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-6gpygo r-2yi16 r-1qi8awa r-3pj75a r-o7ynqc r-6416eg r-1ny4l3l r-1loqt21";
  analyzeButton.setAttribute("role", "link");
  analyzeButton.setAttribute("tabindex", "0");

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
  if (!document.querySelector("#brandalyze-spinner-styles")) {
    const spinnerStyles = document.createElement("style");
    spinnerStyles.id = "brandalyze-spinner-styles";
    spinnerStyles.textContent = `
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(spinnerStyles);
  }

  // Add hover effect
  analyzeButton.addEventListener("mouseenter", () => {
    analyzeButton.style.backgroundColor = "rgb(26, 140, 216)";
    analyzeButton.style.borderColor = "rgb(26, 140, 216)";
  });

  analyzeButton.addEventListener("mouseleave", () => {
    analyzeButton.style.backgroundColor = "rgb(29, 155, 240)";
    analyzeButton.style.borderColor = "rgb(29, 155, 240)";
  });

  // Add click handler
  analyzeButton.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleProfileAnalysis(handle, analyzeButton);
  });

  // Insert the button before the edit profile button (or as first child)
  container.insertBefore(analyzeButton, container.firstChild);
  debug.log(`Added native-style profile analysis button for @${handle}`);
}

// Handle profile analysis with loading states
async function handleProfileAnalysis(handle, button) {
  setAnalyzeButtonLoading(button, true);

  try {
    // Extract bio information from the current page
    const extractedBio = extractProfileBioFromPage(handle);
    debug.log(`Extracted profile bio for @${handle}:`, extractedBio);

    // Send profile analysis request to background script
    const response = await new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(
          {
            action: "analyzeProfile",
            data: {
              handle: handle,
              platform: "twitter",
              sessionId: sessionId,
              extractedBio: extractedBio,
              use_bio: true,
            },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          }
        );
      } catch (error) {
        reject(error);
      }
    });

    if (response && response.success) {
      showProfileAnalysisResult(response.data, button);
    } else {
      const errorMsg = response ? response.error : "Unknown error";
      throw new Error(errorMsg);
    }
  } catch (error) {
    debug.error("Profile analysis error:", error);
    alert("Profile analysis failed: " + error.message);
  } finally {
    setAnalyzeButtonLoading(button, false);
  }
}

// Helper function to set loading state for the button
function setAnalyzeButtonLoading(button, loading) {
  const textSpan = button.querySelector(".btn-text");
  const loadingSpan = button.querySelector(".btn-loading");

  if (textSpan && loadingSpan) {
    if (loading) {
      textSpan.style.display = "none";
      loadingSpan.style.display = "inline";
      button.style.opacity = "0.7";
      button.style.cursor = "default";
    } else {
      textSpan.style.display = "inline";
      loadingSpan.style.display = "none";
      button.style.opacity = "1";
      button.style.cursor = "pointer";
    }
  }
}

// Extract profile bio and information from current Twitter profile page
function extractProfileBioFromPage(handle) {
  debug.log(`Extracting profile bio for @${handle}`);

  const profileInfo = {
    handle: handle,
    display_name: "",
    bio: "",
    location: "",
    website: "",
    verified: false,
    followers_count: 0,
    following_count: 0,
    tweets_count: 0,
  };

  try {
    // Extract display name
    const displayNameElement = document.querySelector(
      '[data-testid="UserName"] div[dir="ltr"] span'
    );
    if (displayNameElement) {
      profileInfo.display_name = displayNameElement.textContent.trim();
    }

    // Extract bio/description
    const bioElement = document.querySelector(
      '[data-testid="UserDescription"]'
    );
    if (bioElement) {
      profileInfo.bio = bioElement.textContent.trim();
    }

    // Extract location
    const locationElement = document.querySelector(
      '[data-testid="UserLocation"]'
    );
    if (locationElement) {
      profileInfo.location = locationElement.textContent.trim();
    }

    // Extract website
    const websiteElement = document.querySelector('[data-testid="UserUrl"] a');
    if (websiteElement) {
      profileInfo.website =
        websiteElement.href || websiteElement.textContent.trim();
    }

    // Check if verified
    const verifiedElement = document.querySelector(
      '[data-testid="UserName"] svg'
    );
    if (verifiedElement) {
      profileInfo.verified = true;
    }

    // Extract follower/following counts from profile stats
    const statsElements = document.querySelectorAll(
      'a[href*="/following"], a[href*="/verified_followers"]'
    );
    for (const element of statsElements) {
      const text = element.textContent.toLowerCase();
      const numberMatch = text.match(/([\d,]+)/);
      if (numberMatch) {
        const number = Number.parseInt(numberMatch[1].replace(/,/g, ""), 10);
        if (text.includes("following")) {
          profileInfo.following_count = number;
        } else if (text.includes("followers")) {
          profileInfo.followers_count = number;
        }
      }
    }

    debug.log("Extracted profile info:", profileInfo);
    return profileInfo;
  } catch (error) {
    debug.error("Error extracting profile bio:", error);
    return profileInfo; // Return what we have
  }
}

// Display analysis results on the page with enhanced styling and save functionality
function showProfileAnalysisResult(analysisData, targetElement) {
  try {
    debug.log("Displaying X analysis results:", analysisData);

    // Remove any existing results display
    const existingResults = document.getElementById("brandalyze-analysis-results");
    if (existingResults) {
      existingResults.remove();
    }

    // Icons (SVG paths)
    const icons = {
      x: '<svg viewBox="0 0 24 24" width="24" height="24" fill="#0f1419"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
      voice: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3zm5 10a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zM8 18h8v2H8v-2z"/></svg>',
      chart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 3v18h18v-2H5V3H3zm4 14h2v-7H7v7zm4 0h2v-10h-2v10zm4 0h2v-4h-2v4z"/></svg>',
      badge: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>',
      save: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>',
      close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 17.59 13.41 12z"/></svg>',
      check: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>'
    };

    // Create results container
    const resultsContainer = document.createElement("div");
    resultsContainer.id = "brandalyze-analysis-results";
    resultsContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 16px;
      box-shadow: rgba(101, 119, 134, 0.2) 0px 0px 15px, rgba(101, 119, 134, 0.15) 0px 0px 3px 1px;
      z-index: 10000;
      max-width: 600px;
      width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      animation: brandalyze-fade-in 0.2s ease-out;
    `;

    // Create overlay
    const overlay = document.createElement("div");
    overlay.id = "brandalyze-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.4);
      z-index: 9999;
      animation: brandalyze-fade-in 0.2s ease;
    `;

    // Add CSS animation
    if (!document.getElementById("brandalyze-animations")) {
      const style = document.createElement("style");
      style.id = "brandalyze-animations";
      style.textContent = `
        @keyframes brandalyze-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes brandalyze-fade-out {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        #brandalyze-analysis-results::-webkit-scrollbar {
          width: 8px;
        }
        #brandalyze-analysis-results::-webkit-scrollbar-track {
          background: transparent;
        }
        #brandalyze-analysis-results::-webkit-scrollbar-thumb {
          background-color: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .brandalyze-section-title {
          font-size: 20px;
          font-weight: 800;
          color: #0f1419;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brandalyze-card {
          background-color: #f7f9f9;
          border-radius: 16px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .brandalyze-tag {
          background-color: #eff3f4;
          color: #536471;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 500;
          display: inline-block;
          margin: 0 4px 4px 0;
        }
        .brandalyze-btn-primary {
          background-color: #0f1419;
          color: white;
          border: none;
          padding: 0 24px;
          height: 44px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brandalyze-btn-primary:hover {
          background-color: #272c30;
        }
        .brandalyze-btn-secondary {
          background-color: white;
          color: #0f1419;
          border: 1px solid #cfd9de;
          padding: 0 24px;
          height: 44px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .brandalyze-btn-secondary:hover {
          background-color: #eff3f4;
        }
      `;
      document.head.appendChild(style);
    }

    // Header
    let content = `
      <div style="padding: 16px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; background: white; z-index: 10; border-bottom: 1px solid #eff3f4;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
             ${icons.x}
          </div>
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #0f1419;">X Profile Analysis</h2>
        </div>
        <button id="brandalyze-close-results" style="background: none; border: none; cursor: pointer; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0f1419; transition: background 0.2s;">
          ${icons.close}
        </button>
      </div>
      <div style="padding: 16px;">
    `;

    // Voice Analysis
    if (analysisData.voice_analysis) {
      const voice = analysisData.voice_analysis;
      content += `
        <div style="margin-bottom: 24px;">
          <h3 class="brandalyze-section-title" style="color: #0f1419;">
            <span style="color: #1d9bf0;">${icons.voice}</span> Voice Analysis
          </h3>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div class="brandalyze-card">
              <div style="font-size: 13px; color: #536471; margin-bottom: 4px;">Tone</div>
              <div style="font-weight: 700; color: #0f1419; font-size: 16px;">${voice.tone || "Professional"}</div>
            </div>
            <div class="brandalyze-card">
              <div style="font-size: 13px; color: #536471; margin-bottom: 4px;">Style</div>
              <div style="font-weight: 700; color: #0f1419; font-size: 16px;">${voice.style || "Thoughtful"}</div>
            </div>
          </div>

          ${voice.personality_traits && voice.personality_traits.length > 0 ? `
          <div style="margin-bottom: 20px;">
            <div style="font-size: 14px; font-weight: 700; color: #0f1419; margin-bottom: 8px;">Personality Traits</div>
            <div>
              ${voice.personality_traits.map(trait => `<span class="brandalyze-tag">${trait}</span>`).join("")}
            </div>
          </div>` : ""}

          ${voice.emotional_indicators ? `
          <div style="margin-bottom: 20px;">
            <div style="font-size: 14px; font-weight: 700; color: #0f1419; margin-bottom: 12px;">Emotional Indicators</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              ${Object.entries(voice.emotional_indicators).map(([emotion, score]) => {
                const percentage = Math.round(score * 10);
                const color = percentage >= 80 ? "#00ba7c" : percentage >= 60 ? "#ffd400" : "#f91880";
                return `
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px;">
                      <span style="color: #536471; text-transform: capitalize;">${emotion}</span>
                      <span style="font-weight: 700; color: #0f1419;">${percentage}%</span>
                    </div>
                    <div style="background: #eff3f4; height: 4px; border-radius: 2px; overflow: hidden;">
                      <div style="background: ${color}; height: 100%; width: ${percentage}%;"></div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>` : ""}
        </div>
      `;
    }

    // Summary
    if (analysisData.analysis_summary) {
      content += `
        <div style="margin-bottom: 24px;">
          <h3 class="brandalyze-section-title">
            <span style="color: #1d9bf0;">${icons.chart}</span> Summary
          </h3>
          <div class="brandalyze-card" style="line-height: 1.5; color: #0f1419;">
            ${analysisData.analysis_summary}
          </div>
        </div>
      `;
    }

    // Confidence
    if (analysisData.confidence_score) {
      const confidence = Math.round(analysisData.confidence_score * 100);
      const color = confidence >= 75 ? "#00ba7c" : confidence >= 50 ? "#ffd400" : "#f91880";
      
      content += `
        <div style="margin-bottom: 24px;">
          <h3 class="brandalyze-section-title">
            <span style="color: #1d9bf0;">${icons.badge}</span> Confidence
          </h3>
          <div class="brandalyze-card" style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px; font-weight: 800; color: ${color};">${confidence}%</div>
            <div style="flex: 1;">
              <div style="background: #eff3f4; height: 6px; border-radius: 3px; overflow: hidden;">
                <div style="background: ${color}; height: 100%; width: ${confidence}%;"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Footer Actions
    content += `
      </div>
      <div style="padding: 16px; border-top: 1px solid #eff3f4; display: flex; justify-content: flex-end; gap: 12px; background: white; position: sticky; bottom: 0; border-radius: 0 0 16px 16px;">
        <button id="brandalyze-close-results-btn" class="brandalyze-btn-secondary">
          Close
        </button>
        <button id="brandalyze-save-analysis" class="brandalyze-btn-primary">
          ${icons.save} Save Analysis
        </button>
      </div>
    `;

    resultsContainer.innerHTML = content;

    // Add event listeners
    document.body.appendChild(overlay);
    document.body.appendChild(resultsContainer);

    // Close button handlers
    const closeButtons = [
      document.getElementById("brandalyze-close-results"),
      document.getElementById("brandalyze-close-results-btn"),
      overlay,
    ];

    closeButtons.forEach((btn) => {
      if (btn && btn !== overlay) {
        // Add hover effects for non-overlay buttons
        btn.onmouseenter = () => {
          if (btn.id === "brandalyze-close-results") {
            btn.style.background = "#eff3f4";
          }
        };
        btn.onmouseleave = () => {
          if (btn.id === "brandalyze-close-results") {
            btn.style.background = "none";
          }
        };
      }

      if (btn) {
        btn.onclick = () => {
          resultsContainer.style.animation = "brandalyze-fade-out 0.2s ease forwards";
          overlay.style.animation = "brandalyze-fade-out 0.2s ease forwards";
          setTimeout(() => {
            resultsContainer.remove();
            overlay.remove();
          }, 200);
        };
      }
    });

    // Save button handler
    const saveButton = document.getElementById("brandalyze-save-analysis");
    if (saveButton) {
      saveButton.onclick = async () => {
        try {
          // Get profile handle for storage key
          const handle = analysisData.handle || getCurrentProfileHandle() || "unknown";

          // Save to platform-specific storage
          const storageKey = `twitter_profile_analysis_${handle}`;
          const analysisRecord = {
            profile_handle: handle,
            analysis_data: analysisData,
            analyzed_at: new Date().toISOString(),
            platform: "twitter",
            profile_url: globalThis.location.href,
          };

          await chrome.storage.local.set({
            [storageKey]: analysisRecord,
          });

          // Also maintain a list of saved analyses
          const savedAnalyses = (await chrome.storage.local.get("saved_analyses")) || {};
          const currentSaved = savedAnalyses.saved_analyses || [];

          // Add or update this analysis in the list
          const existingIndex = currentSaved.findIndex(item => item.storage_key === storageKey);
          const listItem = {
            storage_key: storageKey,
            platform: "twitter",
            handle: handle,
            analyzed_at: analysisRecord.analyzed_at,
            profile_url: analysisRecord.profile_url,
          };

          if (existingIndex >= 0) {
            currentSaved[existingIndex] = listItem;
          } else {
            currentSaved.unshift(listItem); // Add to beginning
          }

          await chrome.storage.local.set({
            saved_analyses: currentSaved,
          });

          // Update button to show success
          saveButton.innerHTML = `${icons.check} Saved!`;
          saveButton.style.backgroundColor = "#00ba7c";

          setTimeout(() => {
            saveButton.innerHTML = `${icons.save} Save Analysis`;
            saveButton.style.backgroundColor = "#0f1419";
          }, 2000);

          debug.log(`X analysis saved with key: ${storageKey}`);
        } catch (error) {
          debug.error("Error saving X analysis:", error);
          saveButton.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg> Save Failed';
          saveButton.style.backgroundColor = "#f91880";

          setTimeout(() => {
            saveButton.innerHTML = `${icons.save} Save Analysis`;
            saveButton.style.backgroundColor = "#0f1419";
          }, 2000);
        }
      };
    }
  } catch (error) {
    debug.error("Error displaying X analysis results:", error);
    alert("Failed to display analysis results");
  }
}

// Initialize and observe for new content
async function initializeTwitterScript() {
  debug.log("Initializing Twitter/X content script...");

  // Wait for shared utilities
  await waitForBrandalyzeUtils();

  if (!globalThis.BrandalyzeUtils) {
    debug.error("BrandalyzeUtils still not available, cannot proceed");
    return;
  }

  sessionId = globalThis.BrandalyzeUtils.generateSessionId();
  debug.log("Generated session ID:", sessionId);

  // Initial processing with delay to ensure page is loaded
  setTimeout(() => {
    debug.log("Starting initial tweet processing...");
    processTweets();
  }, 3000);

  // Also try again after a longer delay in case the page is still loading
  setTimeout(() => {
    debug.log("Second attempt at adding analyze button...");
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
            if (
              node.querySelector('[data-testid="UserName"]') ||
              node.querySelector('[data-testid="UserDescription"]') ||
              node.querySelector('[data-testid="editProfileButton"]')
            ) {
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
        debug.log("Navigation detected, reprocessing profile...");
        setTimeout(processTweets, 2000);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  debug.log("Twitter content script initialized with observer");
}

// Wait for page to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTwitterScript);
} else {
  initializeTwitterScript();
}
