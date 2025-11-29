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
        gap: 6px;
        padding: 8px 14px;
        border-radius: 20px;
        border: none;
        font-size: 13px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        cursor: pointer;
        z-index: 10000;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      }

      .brandalyze-audit-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }

      .brandalyze-audit-btn:active {
        transform: translateY(0);
      }

      .brandalyze-audit-btn:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .brandalyze-audit-idle {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
      }

      .brandalyze-audit-analyzing {
        background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
        color: white;
      }

      .brandalyze-audit-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
      }

      .brandalyze-audit-error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
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
        transform: translateY(10px) scale(0.95);
      }

      .brandalyze-audit-btn-visible {
        opacity: 1;
        transform: translateY(0) scale(1);
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
   * Position button near compose field
   */
  function positionButton(button, composeField) {
    if (!composeField || !composeField.element) return;

    const rect = composeField.element.getBoundingClientRect();
    const buttonWidth = 120;
    const buttonHeight = 36;
    const margin = 10;

    // Position below the compose field, right-aligned
    let top = rect.bottom + margin;
    let left = rect.right - buttonWidth;

    // Ensure button stays within viewport
    if (top + buttonHeight > window.innerHeight) {
      top = rect.top - buttonHeight - margin;
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
   * Show the audit button
   */
  function showButton(composeField) {
    if (isAnalyzing) return;

    currentComposeField = composeField;

    if (!auditButton) {
      auditButton = createButton();
      document.body.appendChild(auditButton);
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
   * Hide the audit button
   */
  function hideButton() {
    if (!auditButton || isAnalyzing) return;

    auditButton.classList.remove("brandalyze-audit-btn-visible");
    auditButton.classList.add("brandalyze-audit-btn-enter");

    setTimeout(() => {
      if (auditButton && !isAnalyzing) {
        auditButton.remove();
        auditButton = null;
        currentComposeField = null;
      }
    }, 200);
  }

  /**
   * Handle audit button click
   */
  async function handleAuditClick(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!currentComposeField || isAnalyzing) return;

    // Check subscription access first
    const hasAccess =
      await globalThis.BrandalyzeUtils?.checkSubscriptionAccess();
    if (!hasAccess) {
      alert(
        "Post audits require a Pro or Enterprise subscription. Upgrade to access this feature."
      );
      return;
    }

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
        throw new Error(response?.error || "Audit failed");
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