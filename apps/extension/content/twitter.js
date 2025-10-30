console.log("Brandalyze Twitter content script loaded");

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
      console.error("BrandalyzeUtils not available after 5 seconds");
      resolve();
    }, 5000);
  });
}

let sessionId;

// Enhanced tweet processing with better selectors
async function processTweets() {
  console.log("🐦 Processing tweets...");
  console.log("🔍 Current URL:", window.location.href);
  console.log("🔍 Current pathname:", window.location.pathname);

  // First check if we're on a profile page
  const currentProfile = getCurrentProfileHandle();

  if (!currentProfile) {
    console.log("❌ Not on a profile page or unable to detect profile handle");
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

  console.log("🔍 Profile validation:");
  console.log(
    "  - URL match:",
    globalThis.location.pathname === `/${currentProfile}` ||
      globalThis.location.pathname.startsWith(`/${currentProfile}/`)
  );
  console.log("  - UserName element:", !!userNameElement);
  console.log("  - UserDescription element:", !!userDescElement);
  console.log("  - Final isProfilePage:", isProfilePage);

  if (!isProfilePage) {
    console.log(`❌ Not on a profile page for @${currentProfile}`);
    return;
  }

  console.log(`✅ On profile page: @${currentProfile}`);

  // Look for profile analysis section or add one
  // Wait a bit for the page to fully load
  setTimeout(() => {
    console.log("🔄 Attempting to add analyze button...");
    addAnalyzeButtonToProfile(currentProfile);
  }, 2000);
}

// Simplified function to add analyze button to profile
function addAnalyzeButtonToProfile(handle) {
  console.log(`🔍 Trying to add analyze button for @${handle}`);

  // Check if button already exists
  if (document.querySelector(".brandalyze-analyze-profile-btn")) {
    console.log("✅ Analyze button already exists");
    return;
  }

  // Simple strategy: Look for the specific edit profile button
  const editProfileButton = document.querySelector(
    'a[href="/settings/profile"][data-testid="editProfileButton"]'
  );

  if (editProfileButton) {
    console.log(
      "📝 Found edit profile button, adding analyze button to the left..."
    );
    console.log("🔍 Edit button container:", editProfileButton.parentElement);

    // Insert analyze button directly before the edit profile button
    insertAnalyzeButton(editProfileButton.parentElement, handle);
    return;
  }

  console.log("❌ Edit profile button not found");
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
      console.log(`Detected profile handle from URL: @${handle}`);
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
      console.log(`Detected profile handle from DOM: @${match[1]}`);
      return match[1];
    }
  }

  console.log("No valid profile handle detected");
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
  console.log(`✅ Added native-style profile analysis button for @${handle}`);
}

// Handle profile analysis with loading states
async function handleProfileAnalysis(handle, button) {
  setAnalyzeButtonLoading(button, true);

  try {
    // Extract bio information from the current page
    const extractedBio = extractProfileBioFromPage(handle);
    console.log(`🔍 Extracted profile bio for @${handle}:`, extractedBio);

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
    console.error("Profile analysis error:", error);
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
  console.log(`🔍 Extracting profile bio for @${handle}`);

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

    console.log("✅ Extracted profile info:", profileInfo);
    return profileInfo;
  } catch (error) {
    console.error("⚠️ Error extracting profile bio:", error);
    return profileInfo; // Return what we have
  }
}

// Display analysis results on the page with enhanced styling and save functionality
function showProfileAnalysisResult(analysisData, targetElement) {
  try {
    console.log("📊 Displaying Twitter analysis results:", analysisData);

    // Remove any existing results display
    const existingResults = document.getElementById("brandalyze-analysis-results");
    if (existingResults) {
      existingResults.remove();
    }

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
      box-shadow: 0 25px 80px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      max-width: 700px;
      width: 90vw;
      max-height: 85vh;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      border: 1px solid #e1e5e9;
      backdrop-filter: blur(10px);
      animation: brandalyze-fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
      background: rgba(0, 0, 0, 0.6);
      z-index: 9999;
      backdrop-filter: blur(2px);
      animation: brandalyze-fade-in 0.2s ease;
    `;

    // Add CSS animation
    if (!document.getElementById("brandalyze-animations")) {
      const style = document.createElement("style");
      style.id = "brandalyze-animations";
      style.textContent = `
        @keyframes brandalyze-fade-in {
          from { opacity: 0; transform: translate(-50%, -60%) scale(0.95); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes brandalyze-fade-out {
          from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          to { opacity: 0; transform: translate(-50%, -60%) scale(0.95); }
        }
        #brandalyze-analysis-results::-webkit-scrollbar {
          width: 6px;
        }
        #brandalyze-analysis-results::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        #brandalyze-analysis-results::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        #brandalyze-analysis-results::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `;
      document.head.appendChild(style);
    }

    // Format analysis results with enhanced header
    let content = `
      <div style="padding: 28px;">
        <div style="
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 24px; 
          border-bottom: 2px solid #f1f5f9; 
          padding-bottom: 20px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          margin: -28px -28px 24px -28px;
          padding: 24px 28px 20px 28px;
          border-radius: 16px 16px 0 0;
        ">
          <div>
            <h2 style="margin: 0; font-size: 24px; font-weight: 700; color: #1e293b; display: flex; align-items: center;">
              <span style="
                background: linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-right: 12px;
                font-size: 28px;
              ">🐦</span>
              Twitter Profile Analysis
            </h2>
            <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">AI-powered brand voice insights</p>
          </div>
          <button id="brandalyze-close-results" style="
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            font-size: 20px; 
            cursor: pointer; 
            color: #64748b; 
            padding: 8px 12px;
            border-radius: 8px;
            transition: all 0.2s ease;
          ">×</button>
        </div>
    `;

    // Display voice analysis if available
    if (analysisData.voice_analysis) {
      const voice = analysisData.voice_analysis;
      content += `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 18px; font-weight: 600; color: #1d9bf0; margin-bottom: 16px; display: flex; align-items: center;">
            <span style="margin-right: 8px;">🎯</span> Voice Analysis
          </h3>
          
          <!-- Tone & Style -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; padding: 16px; border-left: 4px solid #1d9bf0;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Communication Tone</div>
              <div style="font-weight: 600; color: #1e293b;">${voice.tone || "Professional"}</div>
            </div>
            <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; padding: 16px; border-left: 4px solid #10b981;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Communication Style</div>
              <div style="font-weight: 600; color: #1e293b;">${voice.style || "Thoughtful"}</div>
            </div>
          </div>

          <!-- Personality Traits -->
          ${voice.personality_traits && voice.personality_traits.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 500;">Key Personality Traits</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${voice.personality_traits.map(trait => `
                <span style="
                  background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%); 
                  color: #5b21b6; 
                  padding: 4px 12px; 
                  border-radius: 16px; 
                  font-size: 12px; 
                  font-weight: 500;
                  border: 1px solid #a78bfa;
                ">${trait}</span>
              `).join("")}
            </div>
          </div>` : ""}

          <!-- Communication Patterns -->
          ${voice.communication_patterns && voice.communication_patterns.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 500;">Communication Patterns</div>
            <div style="background: #fefce8; border-radius: 8px; padding: 12px; border-left: 3px solid #eab308;">
              ${voice.communication_patterns.map(pattern => `
                <div style="display: flex; align-items: center; margin-bottom: 4px; font-size: 13px;">
                  <span style="color: #ca8a04; margin-right: 6px;">▸</span>
                  <span style="color: #374151;">${pattern}</span>
                </div>
              `).join("")}
            </div>
          </div>` : ""}

          <!-- Content Themes -->
          ${voice.content_themes && voice.content_themes.length > 0 ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 500;">Primary Content Themes</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              ${voice.content_themes.map(theme => `
                <span style="
                  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); 
                  color: #166534; 
                  padding: 4px 12px; 
                  border-radius: 16px; 
                  font-size: 12px; 
                  font-weight: 500;
                  border: 1px solid #86efac;
                ">${theme}</span>
              `).join("")}
            </div>
          </div>` : ""}

          <!-- Emotional Indicators -->
          ${voice.emotional_indicators ? `
          <div style="margin-bottom: 16px;">
            <div style="font-size: 14px; color: #64748b; margin-bottom: 12px; font-weight: 500;">Emotional Indicators</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              ${Object.entries(voice.emotional_indicators).map(([emotion, score]) => {
                const percentage = Math.round(score * 10);
                const color = percentage >= 80 ? "#10b981" : percentage >= 60 ? "#f59e0b" : "#ef4444";
                return `
                  <div style="background: white; border-radius: 6px; padding: 12px; border: 1px solid #e5e7eb;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-size: 12px; color: #6b7280; text-transform: capitalize;">${emotion}</span>
                      <span style="font-size: 12px; font-weight: 600; color: ${color};">${percentage}%</span>
                    </div>
                    <div style="background: #f3f4f6; border-radius: 2px; height: 4px;">
                      <div style="background: ${color}; height: 100%; border-radius: 2px; width: ${percentage}%; transition: width 0.3s ease;"></div>
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>` : ""}
        </div>
      `;
    }

    // Display analysis summary if available
    if (analysisData.analysis_summary) {
      content += `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 18px; font-weight: 600; color: #1d9bf0; margin-bottom: 16px; display: flex; align-items: center;">
            <span style="margin-right: 8px;">📊</span> Analysis Summary
          </h3>
          <div style="
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); 
            border-radius: 12px; 
            padding: 20px; 
            line-height: 1.6;
            border: 1px solid #bae6fd;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          ">
            <div style="color: #0f172a; font-size: 14px;">${analysisData.analysis_summary}</div>
          </div>
        </div>
      `;
    }

    // Display confidence score if available
    if (analysisData.confidence_score) {
      const confidence = Math.round(analysisData.confidence_score * 100);
      const confidenceColor = confidence >= 75 ? "#10b981" : confidence >= 50 ? "#f59e0b" : "#ef4444";
      const confidenceLabel = confidence >= 75 ? "High Confidence" : confidence >= 50 ? "Medium Confidence" : "Low Confidence";

      content += `
        <div style="margin-bottom: 24px;">
          <h3 style="font-size: 18px; font-weight: 600; color: #1d9bf0; margin-bottom: 16px; display: flex; align-items: center;">
            <span style="margin-right: 8px;">🎖️</span> Analysis Confidence
          </h3>
          <div style="
            background: white; 
            border-radius: 12px; 
            padding: 20px;
            border: 1px solid #e5e7eb;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          ">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
              <span style="font-size: 14px; color: #64748b;">${confidenceLabel}</span>
              <span style="font-weight: 700; font-size: 18px; color: ${confidenceColor};">${confidence}%</span>
            </div>
            <div style="background: #f1f5f9; border-radius: 8px; height: 12px; overflow: hidden;">
              <div style="
                background: linear-gradient(90deg, ${confidenceColor} 0%, ${confidenceColor}dd 100%); 
                height: 100%; 
                border-radius: 8px; 
                width: ${confidence}%;
                transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              "></div>
            </div>
            <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
              Based on ${analysisData.analysis_type === "bio_analysis" ? "profile bio content" : "post content analysis"}
            </div>
          </div>
        </div>
      `;
    }

    // Add action buttons with Twitter styling
    content += `
        <div style="
          display: flex; 
          gap: 12px; 
          justify-content: flex-end; 
          border-top: 2px solid #f1f5f9; 
          padding-top: 20px; 
          margin-top: 28px;
          margin-bottom: -28px;
          margin-left: -28px;
          margin-right: -28px;
          padding-left: 28px;
          padding-right: 28px;
          padding-bottom: 28px;
          background: #f8fafc;
          border-radius: 0 0 16px 16px;
        ">
          <button id="brandalyze-save-analysis" style="
            background: linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%); 
            color: white; 
            border: none; 
            padding: 12px 24px; 
            border-radius: 10px; 
            font-weight: 600; 
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 12px rgba(29, 155, 240, 0.3);
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span>💾</span> Save Analysis
          </button>
          <button id="brandalyze-close-results-btn" style="
            background: white; 
            color: #374151; 
            border: 2px solid #e5e7eb; 
            padding: 12px 24px; 
            border-radius: 10px; 
            font-weight: 600; 
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span>✕</span> Close
          </button>
        </div>
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
            btn.style.background = "#f1f5f9";
            btn.style.color = "#374151";
          } else {
            btn.style.background = "#f9fafb";
            btn.style.borderColor = "#d1d5db";
            btn.style.transform = "translateY(-1px)";
          }
        };
        btn.onmouseleave = () => {
          if (btn.id === "brandalyze-close-results") {
            btn.style.background = "#f8fafc";
            btn.style.color = "#64748b";
          } else {
            btn.style.background = "white";
            btn.style.borderColor = "#e5e7eb";
            btn.style.transform = "translateY(0)";
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
      // Enhanced hover effects
      saveButton.onmouseenter = () => {
        saveButton.style.transform = "translateY(-2px)";
        saveButton.style.boxShadow = "0 6px 20px rgba(29, 155, 240, 0.4)";
      };
      saveButton.onmouseleave = () => {
        saveButton.style.transform = "translateY(0)";
        saveButton.style.boxShadow = "0 4px 12px rgba(29, 155, 240, 0.3)";
      };

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
          saveButton.innerHTML = '<span>✓</span> Saved!';
          saveButton.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";

          setTimeout(() => {
            saveButton.innerHTML = '<span>💾</span> Save Analysis';
            saveButton.style.background = "linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%)";
          }, 2000);

          console.log(`✅ Twitter analysis saved with key: ${storageKey}`);
        } catch (error) {
          console.error("❌ Error saving Twitter analysis:", error);
          saveButton.innerHTML = '<span>❌</span> Save Failed';
          saveButton.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";

          setTimeout(() => {
            saveButton.innerHTML = '<span>💾</span> Save Analysis';
            saveButton.style.background = "linear-gradient(135deg, #1d9bf0 0%, #1a8cd8 100%)";
          }, 2000);
        }
      };
    }
  } catch (error) {
    console.error("❌ Error displaying Twitter analysis results:", error);
    alert("Failed to display analysis results");
  }
}

// Initialize and observe for new content
async function initializeTwitterScript() {
  console.log("🐦 Initializing Twitter/X content script...");

  // Wait for shared utilities
  await waitForBrandalyzeUtils();

  if (!globalThis.BrandalyzeUtils) {
    console.error("❌ BrandalyzeUtils still not available, cannot proceed");
    return;
  }

  sessionId = globalThis.BrandalyzeUtils.generateSessionId();
  console.log("🆔 Generated session ID:", sessionId);

  // Initial processing with delay to ensure page is loaded
  setTimeout(() => {
    console.log("🚀 Starting initial tweet processing...");
    processTweets();
  }, 3000);

  // Also try again after a longer delay in case the page is still loading
  setTimeout(() => {
    console.log("🔄 Second attempt at adding analyze button...");
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
        console.log("🔄 Navigation detected, reprocessing profile...");
        setTimeout(processTweets, 2000);
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("✅ Twitter content script initialized with observer");
}

// Wait for page to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTwitterScript);
} else {
  initializeTwitterScript();
}
