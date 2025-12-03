// LinkedIn Content Script for Profile DOM Extraction
(function () {
  "use strict";

  const debug = globalThis.BrandalyzeDebug || { log: () => {}, warn: () => {}, error: console.error, info: () => {} };

  debug.log("LinkedIn content script loaded");

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
      debug.log("Extracting LinkedIn profile data...");

      // Get profile handle from URL
      const urlMatch = globalThis.location.href.match(
        /linkedin\.com\/in\/([^/?]+)/
      );
      const handle = urlMatch ? urlMatch[1] : "";
      
      // Extract display name - try multiple selectors
      let displayName = "";
      const nameSelectors = [
        "h1.text-heading-xlarge",
        "h1[data-generated-suggestion-target]",
        ".pv-text-details__left-panel h1",
        ".ph5 h1",
        ".pv-top-card--list h1",
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
        ".pv-text-details__left-panel .pv-entity__summary-info",
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
        ".pv-top-card--list .text-body-small",
      ];
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (
          element?.textContent?.trim() &&
          !element.textContent.includes("connections")
        ) {
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
        ".pv-about-section .visually-hidden",
      ];

      for (const selector of bioSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element?.textContent?.trim();
          if (text && text.length > 50) {
            // Bio should be substantial
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
        '.text-body-small a span[aria-hidden="true"]',
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
      } // Extract current company/position - try multiple approaches
      let company = "";
      const companySelectors = [
        '.pvs-entity__caption-wrapper .t-14.t-normal span[aria-hidden="true"]',
        ".pv-entity__summary-info .pv-entity__summary-info-v2",
        ".experience-section .pv-entity__summary-info",
        ".pv-profile-section .pv-entity__summary-info-v2",
        '.pvs-list__item .t-14 span[aria-hidden="true"]',
        "#experience ~ * .pvs-entity__caption-wrapper span",
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
        ".pv-text-details__left-panel .text-body-small",
        ".pv-top-card--list .text-body-small",
        ".ph5 .text-body-small",
      ];

      for (const selector of industrySelectors) {
        const element = document.querySelector(selector);
        if (
          element?.textContent?.trim() &&
          element.textContent.toLowerCase().includes("industry")
        ) {
          industry = element.textContent.trim();
          break;
        }
      }
      const profileData = {
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

      debug.log("LinkedIn profile data extracted:", profileData);

      return profileData;
    } catch (error) {
      debug.error("Error extracting LinkedIn profile data:", error);
      return null;
    }
  }

  // Display analysis results on the page with save functionality
  function displayAnalysisResults(analysisData) {
    try {
      debug.log("Displaying analysis results:", analysisData);

      // Remove any existing results display
      const existingResults = document.getElementById(
        "brandalyze-analysis-results"
      );
      if (existingResults) {
        existingResults.remove();
      } // Create results container
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
          @keyframes brandalyze-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes brandalyze-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .brandalyze-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: white;
            animation: brandalyze-spin 0.8s linear infinite;
            margin-right: 8px;
          }
          .brandalyze-button-loading {
            pointer-events: none;
            position: relative;
            color: rgba(255, 255, 255, 0.8) !important;
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
                  background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  margin-right: 12px;
                  font-size: 28px;
                ">🔍</span>
                LinkedIn Profile Analysis
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
              hover: background: #f1f5f9;
            ">×</button>
          </div>
      `; // Display voice analysis if available
      if (analysisData.voice_analysis) {
        const voice = analysisData.voice_analysis;
        content += `
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 18px; font-weight: 600; color: #0a66c2; margin-bottom: 16px; display: flex; align-items: center;">
              <span style="margin-right: 8px;">🎯</span> Voice Analysis
            </h3>
            
            <!-- Tone & Style -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; padding: 16px; border-left: 4px solid #0a66c2;">
                <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Communication Tone</div>
                <div style="font-weight: 600; color: #1e293b;">${
                  voice.tone || "Professional"
                }</div>
              </div>
              <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; padding: 16px; border-left: 4px solid #10b981;">
                <div style="font-size: 14px; color: #64748b; margin-bottom: 4px;">Communication Style</div>
                <div style="font-weight: 600; color: #1e293b;">${
                  voice.style || "Thoughtful"
                }</div>
              </div>
            </div>

            <!-- Personality Traits -->
            ${
              voice.personality_traits && voice.personality_traits.length > 0
                ? `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 500;">Key Personality Traits</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${voice.personality_traits
                  .map(
                    (trait) => `
                  <span style="
                    background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%); 
                    color: #5b21b6; 
                    padding: 4px 12px; 
                    border-radius: 16px; 
                    font-size: 12px; 
                    font-weight: 500;
                    border: 1px solid #a78bfa;
                  ">${trait}</span>
                `
                  )
                  .join("")}
              </div>
            </div>`
                : ""
            }

            <!-- Communication Patterns -->
            ${
              voice.communication_patterns &&
              voice.communication_patterns.length > 0
                ? `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 500;">Communication Patterns</div>
              <div style="background: #fefce8; border-radius: 8px; padding: 12px; border-left: 3px solid #eab308;">
                ${voice.communication_patterns
                  .map(
                    (pattern) => `
                  <div style="display: flex; align-items: center; margin-bottom: 4px; font-size: 13px;">
                    <span style="color: #ca8a04; margin-right: 6px;">▸</span>
                    <span style="color: #374151;">${pattern}</span>
                  </div>
                `
                  )
                  .join("")}
              </div>
            </div>`
                : ""
            }

            <!-- Content Themes -->
            ${
              voice.content_themes && voice.content_themes.length > 0
                ? `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 500;">Primary Content Themes</div>
              <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                ${voice.content_themes
                  .map(
                    (theme) => `
                  <span style="
                    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); 
                    color: #166534; 
                    padding: 4px 12px; 
                    border-radius: 16px; 
                    font-size: 12px; 
                    font-weight: 500;
                    border: 1px solid #86efac;
                  ">${theme}</span>
                `
                  )
                  .join("")}
              </div>
            </div>`
                : ""
            }

            <!-- Emotional Indicators -->
            ${
              voice.emotional_indicators
                ? `
            <div style="margin-bottom: 16px;">
              <div style="font-size: 14px; color: #64748b; margin-bottom: 12px; font-weight: 500;">Emotional Indicators</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                ${Object.entries(voice.emotional_indicators)
                  .map(([emotion, score]) => {
                    const percentage = Math.round(score * 10);
                    const color =
                      percentage >= 80
                        ? "#10b981"
                        : percentage >= 60
                        ? "#f59e0b"
                        : "#ef4444";
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
                  })
                  .join("")}
              </div>
            </div>`
                : ""
            }
          </div>
        `;
      } // Display analysis summary if available
      if (analysisData.analysis_summary) {
        content += `
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 18px; font-weight: 600; color: #0a66c2; margin-bottom: 16px; display: flex; align-items: center;">
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
      } // Display confidence score if available
      if (analysisData.confidence_score) {
        const confidence = Math.round(analysisData.confidence_score * 100);
        const confidenceColor =
          confidence >= 75
            ? "#10b981"
            : confidence >= 50
            ? "#f59e0b"
            : "#ef4444";
        const confidenceLabel =
          confidence >= 75
            ? "High Confidence"
            : confidence >= 50
            ? "Medium Confidence"
            : "Low Confidence";

        content += `
          <div style="margin-bottom: 24px;">
            <h3 style="font-size: 18px; font-weight: 600; color: #0a66c2; margin-bottom: 16px; display: flex; align-items: center;">
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
                Based on ${
                  analysisData.analysis_type === "bio_analysis"
                    ? "profile bio content"
                    : "post content analysis"
                }
              </div>
            </div>
          </div>
        `;
      } // Add action buttons
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
              background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); 
              color: white; 
              border: none; 
              padding: 12px 24px; 
              border-radius: 10px; 
              font-weight: 600; 
              cursor: pointer;
              transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
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
      document.body.appendChild(resultsContainer); // Close button handlers
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
            resultsContainer.style.animation =
              "brandalyze-fade-out 0.2s ease forwards";
            overlay.style.animation = "brandalyze-fade-out 0.2s ease forwards";
            setTimeout(() => {
              resultsContainer.remove();
              overlay.remove();
            }, 200);
          };
        }
      }); // Save button handler
      const saveButton = document.getElementById("brandalyze-save-analysis");
      if (saveButton) {
        // Enhanced hover effects
        saveButton.onmouseenter = () => {
          saveButton.style.transform = "translateY(-2px)";
          saveButton.style.boxShadow = "0 6px 20px rgba(14, 165, 233, 0.4)";
        };
        saveButton.onmouseleave = () => {
          saveButton.style.transform = "translateY(0)";
          saveButton.style.boxShadow = "0 4px 12px rgba(14, 165, 233, 0.3)";
        };

        saveButton.onclick = async () => {
          try {
            // Get profile handle for storage key
            const urlMatch = globalThis.location.href.match(
              /linkedin\.com\/in\/([^/?]+)/
            );
            const handle = urlMatch ? urlMatch[1] : "unknown";

            // Save to platform-specific storage
            const storageKey = `linkedin_profile_analysis_${handle}`;
            const analysisRecord = {
              profile_handle: handle,
              analysis_data: analysisData,
              analyzed_at: new Date().toISOString(),
              platform: "linkedin",
              profile_url: globalThis.location.href,
            };

            await chrome.storage.local.set({
              [storageKey]: analysisRecord,
            });

            // Also maintain a list of saved analyses
            const savedAnalyses =
              (await chrome.storage.local.get("saved_analyses")) || {};
            const currentSaved = savedAnalyses.saved_analyses || [];

            // Add or update this analysis in the list
            const existingIndex = currentSaved.findIndex(
              (item) => item.storage_key === storageKey
            );
            const listItem = {
              storage_key: storageKey,
              platform: "linkedin",
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
            saveButton.textContent = "✓ Saved!";
            saveButton.style.background = "#10b981";

            setTimeout(() => {
              saveButton.textContent = "Save Analysis";
              saveButton.style.background = "#0a66c2";
            }, 2000);

            debug.log(`Analysis saved with key: ${storageKey}`);
          } catch (error) {
            debug.error("Error saving analysis:", error);
            saveButton.textContent = "Save Failed";
            saveButton.style.background = "#ef4444";

            setTimeout(() => {
              saveButton.textContent = "Save Analysis";
              saveButton.style.background = "#0a66c2";
            }, 2000);
          }
        };
      }
    } catch (error) {
      debug.error("Error displaying analysis results:", error);
      showNotification("Failed to display analysis results", "error");
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
      } // Update button state with spinner
      const originalText = button.querySelector(
        ".artdeco-button__text"
      ).textContent;
      const buttonText = button.querySelector(".artdeco-button__text");

      // Add loading state with spinner
      buttonText.innerHTML = `
        <div class="brandalyze-spinner"></div>
        Analyzing...
      `;
      button.disabled = true;
      button.classList.add("brandalyze-button-loading");
      button.style.backgroundColor = "#004182";
      button.style.cursor = "not-allowed";

      try {
        // Send message to background script for analysis
        const response = await chrome.runtime.sendMessage({
          action: "analyzeProfile",
          platform: "linkedin",
          data: profileData,
        });
        debug.log("Full response from background:", response);

        if (response && response.success) {
          // Display analysis results directly on the page
          displayAnalysisResults(response.results || response.data);
        } else {
          const errorMsg =
            response?.message || "Analysis failed. Please try again.";
          showNotification(errorMsg, "error");
        }
      } catch (error) {
        debug.error("Analysis error:", error);
        showNotification(
          "Network error. Please check your connection and try again.",
          "error"
        );
      } finally {
        // Reset button state
        buttonText.textContent = originalText;
        button.disabled = false;
        button.classList.remove("brandalyze-button-loading");
        button.style.backgroundColor = "#0a66c2";
        button.style.cursor = "pointer";
      }
    };

    return button;
  }  // Track if button is being added to prevent race conditions
  let isAddingButton = false;

  // Add analyze button to LinkedIn profile
  async function addAnalyzeButtonToLinkedIn() {
    if (buttonAddedToProfile || !isLinkedInProfile()) {
      return;
    }

    // Prevent concurrent button additions
    if (isAddingButton) {
      debug.log("Button addition already in progress");
      return;
    }

    // Check if button already exists
    if (document.getElementById("brandalyze-analyze-btn-linkedin")) {
      buttonAddedToProfile = true;
      return;
    }

    isAddingButton = true;

    // Check if user has subscription access before adding analyze button
    const hasAccess = await globalThis.BrandalyzeUtils.checkSubscriptionAccess();
    if (!hasAccess) {
      debug.log("User does not have Pro/Enterprise subscription - analyze button not shown");
      isAddingButton = false;
      return;
    }
    
    debug.log("User has subscription access, adding analyze button");

    // Wait for profile actions container to load
    const actionContainer = document.querySelector(
      ".pv-s-profile-actions, .pvs-profile-actions__action, .ph5.pb5"
    );
    if (!actionContainer) {
      isAddingButton = false;
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
      );    } else {
      actionContainer.appendChild(analyzeButton);
    }

    buttonAddedToProfile = true;
    isAddingButton = false;
    debug.log("LinkedIn analyze button added");
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
      debug.log("LinkedIn profile detected, adding analyze button...");
      setTimeout(async () => await addAnalyzeButtonToLinkedIn(), 1000);
    }

    // Monitor for navigation changes (LinkedIn SPA)
    let currentUrl = globalThis.location.href;
    const observer = new MutationObserver(() => {
      if (globalThis.location.href !== currentUrl) {
        currentUrl = globalThis.location.href;
        buttonAddedToProfile = false;
        if (isLinkedInProfile()) {
          debug.log("Navigated to LinkedIn profile, adding analyze button...");
          setTimeout(async () => await addAnalyzeButtonToLinkedIn(), 1500);
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
        !document.getElementById("brandalyze-analyze-btn-linkedin")      ) {
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
