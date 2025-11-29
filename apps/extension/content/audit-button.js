console.log("Brandalyze audit button loaded");

(function () {
  "use strict";

  let auditButton = null;
  let currentComposeField = null;
  let isAnalyzing = false;

  // Button states
  const BUTTON_STATES = {
    idle: {
      text: "Audit Post",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>`,
      class: "brandalyze-audit-idle",
    },
    analyzing: {
      text: "Analyzing...",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" class="brandalyze-spin">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="32" stroke-linecap="round"/>
      </svg>`,
      class: "brandalyze-audit-analyzing",
    },
    success: {
      text: "View Results",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 13l4 4L19 7"/>
      </svg>`,
      class: "brandalyze-audit-success",
    },
    error: {
      text: "Retry",
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4v5h5M20 20v-5h-5M20.49 9A9 9 0 005.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 0118.36 9"/>
      </svg>`,
      class: "brandalyze-audit-error",
    },
  };

  /**
   * Detect if X/Twitter is in dark mode
   */
  function isDarkMode() {
    // X uses background color to indicate theme
    const bgColor = getComputedStyle(document.body).backgroundColor;
    if (bgColor) {
      const rgb = bgColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const brightness = (Number.parseInt(rgb[0], 10) + Number.parseInt(rgb[1], 10) + Number.parseInt(rgb[2], 10)) / 3;
        return brightness < 128;
      }
    }
    // Fallback: check for dark mode class or data attribute
    return document.documentElement.style.colorScheme === 'dark' ||
           document.body.classList.contains('dark') ||
           document.querySelector('[data-theme="dark"]') !== null;
  }

  /**
   * Inject required CSS styles
   */
  function injectStyles() {
    if (document.getElementById("brandalyze-audit-styles")) return;

    const styles = document.createElement("style");
    styles.id = "brandalyze-audit-styles";
    styles.textContent = `
      .brandalyze-audit-btn {
        position: fixed;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 0 16px;
        height: 36px;
        border-radius: 9999px;
        font-size: 15px;
        font-weight: 700;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        cursor: pointer;
        z-index: 10000;
        transition: background-color 0.2s ease;
        border: none;
        min-width: 100px;
      }

      /* Light mode (default) */
      .brandalyze-audit-idle {
        background-color: rgb(29, 155, 240);
        color: rgb(255, 255, 255);
      }
      .brandalyze-audit-idle:hover {
        background-color: rgb(26, 140, 216);
      }

      .brandalyze-audit-analyzing {
        background-color: rgb(29, 155, 240);
        color: rgb(255, 255, 255);
        opacity: 0.8;
      }

      .brandalyze-audit-success {
        background-color: rgb(0, 186, 124);
        color: rgb(255, 255, 255);
      }
      .brandalyze-audit-success:hover {
        background-color: rgb(0, 166, 111);
      }

      .brandalyze-audit-error {
        background-color: rgb(244, 33, 46);
        color: rgb(255, 255, 255);
      }
      .brandalyze-audit-error:hover {
        background-color: rgb(220, 30, 41);
      }

      /* Dark mode variants */
      .brandalyze-dark .brandalyze-audit-idle {
        background-color: rgb(239, 243, 244);
        color: rgb(15, 20, 25);
      }
      .brandalyze-dark .brandalyze-audit-idle:hover {
        background-color: rgb(215, 219, 220);
      }

      .brandalyze-dark .brandalyze-audit-analyzing {
        background-color: rgb(239, 243, 244);
        color: rgb(15, 20, 25);
        opacity: 0.8;
      }

      .brandalyze-dark .brandalyze-audit-success {
        background-color: rgb(0, 186, 124);
        color: rgb(255, 255, 255);
      }

      .brandalyze-dark .brandalyze-audit-error {
        background-color: rgb(244, 33, 46);
        color: rgb(255, 255, 255);
      }

      .brandalyze-audit-btn:disabled {
        cursor: not-allowed;
      }

      .brandalyze-spin {
        animation: brandalyze-spin 1s linear infinite;
      }

      @keyframes brandalyze-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      .brandalyze-audit-btn-enter {
        opacity: 0;
        transform: scale(0.95);
      }

      .brandalyze-audit-btn-visible {
        opacity: 1;
        transform: scale(1);
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Create the audit button element
   */
  function createButton() {
    injectStyles();

    const button = document.createElement("button");
    button.id = "brandalyze-audit-btn";
    button.className =
      "brandalyze-audit-btn brandalyze-audit-idle brandalyze-audit-btn-enter";

    updateButtonState(button, "idle");

    button.addEventListener("click", handleAuditClick);

    return button;
  }

  /**
   * Update button visual state
   */
  function updateButtonState(button, state) {
    const config = BUTTON_STATES[state];
    if (!config) return;

    button.innerHTML = `${config.icon}<span>${config.text}</span>`;
    button.className = `brandalyze-audit-btn ${config.class}`;
    button.disabled = state === "analyzing";
  }

  /**
   * Position button near compose field, avoiding overlap with platform buttons
   */
  function positionButton(button, composeField) {
    if (!composeField || !composeField.element) return;

    const rect = composeField.element.getBoundingClientRect();
    const buttonWidth = button.offsetWidth || 120;
    const buttonHeight = 36;
    const margin = 12;

    // Find the compose container/dialog to position relative to
    const container = composeField.element.closest('[role="dialog"], [data-testid="tweetButtonInline"], .share-box, form') 
                   || composeField.element.parentElement;
    
    // Find X/Twitter's Post button to avoid overlap
    const postButton = container?.querySelector('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
    const replyButton = container?.querySelector('[data-testid="replyButton"]');
    const platformButton = postButton || replyButton;
    
    let top, left;
    
    if (platformButton) {
      // Position to the left of the Post/Reply button
      const btnRect = platformButton.getBoundingClientRect();
      top = btnRect.top + (btnRect.height - buttonHeight) / 2; // Vertically center with Post button
      left = btnRect.left - buttonWidth - margin;
      
      // If too far left, position above the compose area instead
      if (left < margin) {
        top = rect.top - buttonHeight - margin;
        left = rect.right - buttonWidth;
      }
    } else {
      // Fallback: position above compose field, right-aligned
      top = rect.top - buttonHeight - margin;
      left = rect.right - buttonWidth;
      
      // If no room above, position below
      if (top < margin) {
        top = rect.bottom + margin;
      }
    }

    // Ensure button stays within viewport
    if (top + buttonHeight > window.innerHeight) {
      top = window.innerHeight - buttonHeight - margin;
    }
    if (top < margin) {
      top = margin;
    }
    if (left < margin) {
      left = margin;
    }
    if (left + buttonWidth > window.innerWidth - margin) {
      left = window.innerWidth - buttonWidth - margin;
    }

    button.style.top = `${top}px`;
    button.style.left = `${left}px`;
  }

  /**
   * Handle scroll/resize to reposition button
   */
  function handleReposition() {
    if (auditButton && currentComposeField) {
      positionButton(auditButton, currentComposeField);
    }
  }

  // Throttled reposition for performance
  let repositionTimeout = null;
  function throttledReposition() {
    if (repositionTimeout) return;
    repositionTimeout = setTimeout(() => {
      handleReposition();
      repositionTimeout = null;
    }, 16); // ~60fps
  }

  // Add scroll/resize listeners
  window.addEventListener('scroll', throttledReposition, true);
  window.addEventListener('resize', throttledReposition);

  /**
   * Show the audit button
   */
  function showButton(composeField) {
    if (isAnalyzing) return;

    currentComposeField = composeField;

    if (!auditButton) {
      auditButton = createButton();
      document.body.appendChild(auditButton);
    }

    // Apply dark mode class based on current theme
    if (isDarkMode()) {
      auditButton.classList.add("brandalyze-dark");
    } else {
      auditButton.classList.remove("brandalyze-dark");
    }

    positionButton(auditButton, composeField);
    updateButtonState(auditButton, "idle");

    // Animate in
    requestAnimationFrame(() => {
      auditButton.classList.remove("brandalyze-audit-btn-enter");
      auditButton.classList.add("brandalyze-audit-btn-visible");
    });
  }

  /**
   * Hide the audit button immediately or with animation
   */
  function hideButton(immediate = false) {
    if (!auditButton || isAnalyzing) return;

    if (immediate) {
      // Immediate removal without animation
      auditButton.remove();
      auditButton = null;
      currentComposeField = null;
    } else {
      // Animated removal
      auditButton.classList.remove("brandalyze-audit-btn-visible");
      auditButton.classList.add("brandalyze-audit-btn-enter");

      setTimeout(() => {
        if (auditButton && !isAnalyzing) {
          auditButton.remove();
          auditButton = null;
          currentComposeField = null;
        }
      }, 150); // Reduced from 200ms
    }
  }

  // Watch for compose dialog closing
  const dialogObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if a dialog or compose container was removed
          if (node.matches?.('[role="dialog"]') || 
              node.querySelector?.('[data-testid="tweetTextarea_0"]')) {
            hideButton(true); // Immediate hide
          }
        }
      }
    }
  });

  // Start observing for dialog removals
  dialogObserver.observe(document.body, { childList: true, subtree: true });

  /**
   * Handle audit button click
   */
  async function handleAuditClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!currentComposeField || isAnalyzing) return;

    // Extract content
    const content =
      globalThis.BrandalyzeComposeDetector?.extractContent(currentComposeField);
    if (
      !globalThis.BrandalyzeComposeDetector?.isContentReady(
        currentComposeField,
        content
      )
    ) {
      alert(
        "Please enter more content before auditing (minimum 20 characters)."
      );
      return;
    }

    // Get context
    const context =
      globalThis.BrandalyzeComposeDetector?.detectContext(
        currentComposeField
      ) || {};

    isAnalyzing = true;
    updateButtonState(auditButton, "analyzing");

    try {
      // Send audit request to background script
      const response = await chrome.runtime.sendMessage({
        action: "auditPost",
        data: {
          content,
          platform: currentComposeField.platform,
          context,
        },
      });

      if (response && response.success) {
        updateButtonState(auditButton, "success");
        showAuditResults(response.data);
      } else {
        const errorMsg = typeof response?.error === 'string' 
          ? response.error 
          : JSON.stringify(response?.error || "Audit failed");
        
        console.error("Audit failed:", errorMsg, response);
        
        // Check for specific error types
        if (errorMsg.includes("No brand found")) {
          alert("Please analyze a profile first to set up your brand voice before auditing posts.\n\nVisit a social profile and click 'Analyze Profile' in the Brandalyze extension.");
          updateButtonState(auditButton, "idle");
          return;
        } else if (errorMsg.includes("UPGRADE_REQUIRED") || errorMsg.includes("Pro")) {
          alert("Post audits require a Pro subscription. Upgrade to access this feature.");
          updateButtonState(auditButton, "idle");
          return;
        }
        
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error("Audit error:", error);
      updateButtonState(auditButton, "error");

      // Reset to idle after 3 seconds
      setTimeout(() => {
        if (auditButton) {
          updateButtonState(auditButton, "idle");
        }
      }, 3000);
    } finally {
      isAnalyzing = false;
    }
  }

  /**
   * Show audit results (placeholder - will be expanded)
   */
  function showAuditResults(data) {
    // This will be implemented in Step 2.3 (Audit Panel)
    console.log("Audit results:", data);

    // For now, show a simple notification
    const score = data?.audit?.score || data?.score || 0;
    const message = `Brand Voice Score: ${Math.round(score)}%`;

    // Simple notification (will be replaced with panel)
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10001;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;
    notification.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">${message}</div>
      <div style="font-size: 12px; color: #666;">Full results coming in Step 2.3</div>
    `;
    document.body.appendChild(notification);

    setTimeout(() => notification.remove(), 5000);
  }

  // Expose API
  globalThis.BrandalyzeAuditButton = {
    showButton,
    hideButton,
    updateButtonState,
  };
})();