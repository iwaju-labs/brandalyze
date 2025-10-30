// LinkedIn Content Script for Profile DOM Extraction
(function () {
  "use strict";

  console.log("🟦 Brandalyze LinkedIn content script loaded");

  let analyzeButton = null;
  let buttonAddedToProfile = false;

  // LinkedIn profile detection
  function isLinkedInProfile() {
    const currentUrl = globalThis.location.href;
    const profileUrlPattern = /linkedin\.com\/in\/[^/]+\/?$/;

    // Check if we're on a profile page (not settings, activity, etc.)
    const isProfile = profileUrlPattern.test(currentUrl);
    const notSettingsOrOtherPages =
      !currentUrl.includes("/edit/") &&
      !currentUrl.includes("/activity/") &&
      !currentUrl.includes("/recent-activity/") &&
      !currentUrl.includes("/details/");

    return isProfile && notSettingsOrOtherPages;
  }

  // Extract LinkedIn profile data from DOM
  function extractProfileData() {
    try {
      console.log("🔍 Extracting LinkedIn profile data...");

      // Get profile handle from URL
      const urlMatch = globalThis.location.href.match(
        /linkedin\.com\/in\/([^/?]+)/
      );
      const handle = urlMatch ? urlMatch[1] : "";      // Extract display name - try multiple selectors
      let displayName = "";
      const nameSelectors = [
        "h1.text-heading-xlarge",
        "h1[data-generated-suggestion-target]",
        ".pv-text-details__left-panel h1",
        ".ph5 h1",
        ".pv-top-card--list h1"
      ];
      for (const selector of nameSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          displayName = element.textContent.trim();
          break;
        }
      }

      // Extract headline/title - try multiple selectors
      let headline = "";
      const headlineSelectors = [
        ".text-body-medium.break-words",
        ".pv-text-details__left-panel .text-body-medium",
        ".pv-top-card--list .text-body-medium",
        ".ph5 .text-body-medium",
        ".pv-text-details__left-panel .pv-entity__summary-info"
      ];
      for (const selector of headlineSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          headline = element.textContent.trim();
          break;
        }
      }

      // Extract location - try multiple selectors
      let location = "";
      const locationSelectors = [
        ".pv-text-details__left-panel .text-body-small.inline.t-black--light.break-words",
        ".text-body-small.inline.t-black--light.break-words",
        ".pv-text-details__left-panel .text-body-small",
        ".ph5 .text-body-small",
        ".pv-top-card--list .text-body-small"
      ];
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim() && !element.textContent.includes('connections')) {
          location = element.textContent.trim();
          break;
        }
      }

      // Extract about/bio section - comprehensive approach
      let bio = "";
      const bioSelectors = [
        // Direct selectors for bio content
        ".pv-shared-text-with-see-more span.visually-hidden",
        ".visually-hidden",
        ".pv-shared-text-with-see-more .inline-show-more-text",
        ".pv-about__summary-text .visually-hidden",
        ".pv-about__summary-text span",
        // Alternative selectors
        "#about ~ * .visually-hidden",
        "[data-field='summary'] .visually-hidden",
        ".pv-about-section .visually-hidden"
      ];
      
      for (const selector of bioSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element?.textContent?.trim();
          if (text && text.length > 50) { // Bio should be substantial
            bio = text;
            break;
          }
        }
        if (bio) break;
      }

      // Extract connections count - try multiple approaches
      let connectionsCount = 0;
      const connectionSelectors = [
        '.pv-text-details__left-panel .t-black--light.t-normal a span[aria-hidden="true"]',
        '.pv-text-details__left-panel a[href*="connections"] span',
        '.pv-top-card--list a[href*="connections"] span',
        '.ph5 a[href*="connections"] span',
        '.text-body-small a span[aria-hidden="true"]'
      ];
      
      for (const selector of connectionSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          const connectionsText = element.textContent.trim();
          const connectionsMatch = connectionsText.match(/([0-9,]+)/);
          if (connectionsMatch) {
            connectionsCount = Number.parseInt(
              connectionsMatch[1].replaceAll(",", ""),
              10
            );
            if (connectionsCount > 0) break;
          }
        }
      }      // Extract current company/position - try multiple approaches
      let company = "";
      const companySelectors = [
        '.pvs-entity__caption-wrapper .t-14.t-normal span[aria-hidden="true"]',
        '.pv-entity__summary-info .pv-entity__summary-info-v2',
        '.experience-section .pv-entity__summary-info',
        '.pv-profile-section .pv-entity__summary-info-v2',
        '.pvs-list__item .t-14 span[aria-hidden="true"]',
        '#experience ~ * .pvs-entity__caption-wrapper span'
      ];
      
      for (const selector of companySelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim()) {
          company = element.textContent.trim();
          break;
        }
      }

      // Extract industry - try multiple approaches  
      let industry = "";
      const industrySelectors = [
        '[data-field="industry"] .pv-entity__summary-info-v2',
        '.pv-text-details__left-panel .text-body-small',
        '.pv-top-card--list .text-body-small',
        '.ph5 .text-body-small'
      ];
      
      for (const selector of industrySelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent?.trim() && element.textContent.toLowerCase().includes('industry')) {
          industry = element.textContent.trim();
          break;
        }
      }      const profileData = {
        handle: handle,
        display_name: displayName,
        headline: headline,
        bio: bio,
        location: location,
        connections_count: connectionsCount,
        company: company,
        industry: industry,
        url: globalThis.location.href,
        extracted_at: new Date().toISOString(),
      };

      console.log("✅ LinkedIn profile data extracted:");
      console.log("🔍 Handle:", handle);
      console.log("👤 Display Name:", displayName);
      console.log("📄 Headline:", headline);
      console.log("📝 Bio (length):", bio.length, "chars");
      console.log("📍 Location:", location);
      console.log("🔗 Connections:", connectionsCount);
      console.log("🏢 Company:", company);
      console.log("🏭 Industry:", industry);
      console.log("📊 Full data:", profileData);
      
      return profileData;
    } catch (error) {
      console.error("❌ Error extracting LinkedIn profile data:", error);
      return null;
    }
  }

  // Create analyze button for LinkedIn
  function createLinkedInAnalyzeButton() {
    const button = document.createElement("button");
    button.innerHTML = `
            <span class="artdeco-button__text">
                Analyze Profile
            </span>
        `;
    button.className =
      "artdeco-button artdeco-button--2 artdeco-button--primary ember-view pvs-profile-actions__action";
    button.id = "brandalyze-analyze-btn-linkedin";
    button.style.cssText = `
            margin-left: 8px;
            margin-top: 4px;
            background-color: #0a66c2;
            border: 1px solid #0a66c2;
            color: white;
            border-radius: 2px;
            font-weight: 600;
            font-size: 16px;
            line-height: 1.25;
            padding: 8px 16px;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

    // Hover effects
    button.onmouseenter = () => {
      button.style.backgroundColor = "#004182";
      button.style.borderColor = "#004182";
    };
    button.onmouseleave = () => {
      button.style.backgroundColor = "#0a66c2";
      button.style.borderColor = "#0a66c2";
    };

    // Click handler
    button.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Extract profile data
      const profileData = extractProfileData();
      if (!profileData) {
        showNotification(
          "Failed to extract profile data. Please try again.",
          "error"
        );
        return;
      }

      // Update button state
      const originalText = button.querySelector(
        ".artdeco-button__text"
      ).textContent;
      button.querySelector(".artdeco-button__text").textContent =
        "Analyzing...";
      button.disabled = true;
      button.style.opacity = "0.7";

      try {
        // Send message to background script for analysis
        const response = await chrome.runtime.sendMessage({
          action: "analyzeProfile",
          platform: "linkedin",
          data: profileData,
        });
        console.log("🔍 Full response from background:", response);

        if (response && response.success) {
          showNotification(
            "Analysis completed! Check the extension popup for results.",
            "success"
          );

          // Store results for popup display
          const analysisData = {
            type: "voice",
            platform: "linkedin",
            results: response.results || response.data, // Handle both structures
            timestamp: Date.now(),
          };

          console.log("📦 Storing analysis data:", analysisData);

          await chrome.storage.local.set({
            lastAnalysis: analysisData,
          });

          // Debug: Verify what was actually stored
          const stored = await chrome.storage.local.get("lastAnalysis");
          console.log("✅ Verified stored data:", stored);
        } else {
          const errorMsg =
            response?.message || "Analysis failed. Please try again.";
          showNotification(errorMsg, "error");
        }
      } catch (error) {
        console.error("❌ Analysis error:", error);
        showNotification(
          "Network error. Please check your connection and try again.",
          "error"
        );
      } finally {
        // Reset button state
        button.querySelector(".artdeco-button__text").textContent =
          originalText;
        button.disabled = false;
        button.style.opacity = "1";
      }
    };

    return button;
  }

  // Add analyze button to LinkedIn profile
  function addAnalyzeButtonToLinkedIn() {
    if (buttonAddedToProfile || !isLinkedInProfile()) {
      return;
    }

    // Wait for profile actions container to load
    const actionContainer = document.querySelector(
      ".pv-s-profile-actions, .pvs-profile-actions__action, .ph5.pb5"
    );
    if (!actionContainer) {
      return;
    }

    // Check if button already exists
    if (document.getElementById("brandalyze-analyze-btn-linkedin")) {
      buttonAddedToProfile = true;
      return;
    }

    // Create and add the button
    analyzeButton = createLinkedInAnalyzeButton();

    // Find the best place to insert the button
    const messageButton = actionContainer.querySelector(
      'button[aria-label*="Message"], .pv-s-profile-actions__message'
    );
    const connectButton = actionContainer.querySelector(
      'button[aria-label*="Connect"], .pv-s-profile-actions__connect'
    );

    if (messageButton) {
      messageButton.parentNode.insertBefore(
        analyzeButton,
        messageButton.nextSibling
      );
    } else if (connectButton) {
      connectButton.parentNode.insertBefore(
        analyzeButton,
        connectButton.nextSibling
      );
    } else {
      actionContainer.appendChild(analyzeButton);
    }

    buttonAddedToProfile = true;
    console.log("✅ LinkedIn analyze button added");
  }

  // Show notification
  function showNotification(message, type = "info") {
    // Remove existing notifications
    const existingNotification = document.getElementById(
      "brandalyze-notification-linkedin"
    );
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create notification
    const notification = document.createElement("div");
    notification.id = "brandalyze-notification-linkedin";
    notification.textContent = message;

    const bgColor =
      type === "success" ? "#10B981" : type === "error" ? "#EF4444" : "#3B82F6";

    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: ${bgColor};
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            max-width: 350px;
            animation: slideInRight 0.3s ease-out;
        `;

    // Add slide-in animation
    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = "slideInRight 0.3s ease-out reverse";
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  // Initialize and monitor for changes
  function init() {
    // Initial setup
    if (isLinkedInProfile()) {
      console.log("🟦 LinkedIn profile detected, adding analyze button...");
      setTimeout(() => addAnalyzeButtonToLinkedIn(), 1000);
    }

    // Monitor for navigation changes (LinkedIn SPA)
    let currentUrl = globalThis.location.href;
    const observer = new MutationObserver(() => {
      if (globalThis.location.href !== currentUrl) {
        currentUrl = globalThis.location.href;
        buttonAddedToProfile = false;

        if (isLinkedInProfile()) {
          console.log(
            "🟦 Navigated to LinkedIn profile, adding analyze button..."
          );
          setTimeout(() => addAnalyzeButtonToLinkedIn(), 1500);
        }
      } else if (isLinkedInProfile() && !buttonAddedToProfile) {
        // Try to add button if it's missing on current profile
        addAnalyzeButtonToLinkedIn();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Also check periodically for button placement
    setInterval(() => {
      if (
        isLinkedInProfile() &&
        !document.getElementById("brandalyze-analyze-btn-linkedin")
      ) {
        buttonAddedToProfile = false;
        addAnalyzeButtonToLinkedIn();
      }
    }, 3000);
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
