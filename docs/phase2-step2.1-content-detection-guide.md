# Phase 2 Step 2.1: Content Detection Implementation Guide

## Overview

This guide covers implementing content detection in the browser extension for the Post Audit feature. The goal is to detect when users are composing content on social platforms and provide real-time brand voice auditing.

---

## Current Extension Architecture

```
apps/extension/
├── manifest.json          # Manifest V3 configuration
├── background/
│   └── background.js      # Service worker (auth, API calls)
├── content/
│   ├── shared.js          # Shared utilities (BrandalyzeUtils)
│   ├── twitter.js         # Twitter/X content script
│   ├── linkedin.js        # LinkedIn content script
│   └── brandalyze-sync.js # Main app sync
├── popup/
│   └── popup.html         # Extension popup
└── src/
    └── input.css          # Tailwind source
```

### Key Patterns

1. **Content scripts loaded per platform** via manifest.json
2. **Shared utilities** exposed via `globalThis.BrandalyzeUtils`
3. **Background script** handles all API calls and authentication
4. **Message passing** between content scripts and background

---

## Files to Create

### 1. Content Detection Service

Create: `apps/extension/content/compose-detector.js`

This file detects when users are composing content.

```javascript
// apps/extension/content/compose-detector.js

console.log("Brandalyze compose detector loaded");

(function() {
  "use strict";

  // Platform-specific selectors for compose fields
  const COMPOSE_SELECTORS = {
    twitter: {
      // Main compose box
      compose: '[data-testid="tweetTextarea_0"]',
      // Reply compose
      reply: '[data-testid="tweetTextarea_0_reply"]',
      // Quote tweet
      quote: '[data-testid="tweetTextarea_0_quote"]',
      // DM compose (excluded from audits)
      dm: '[data-testid="dmComposerTextInput"]'
    },
    linkedin: {
      // Main post compose
      compose: '.ql-editor[data-placeholder="What do you want to talk about?"]',
      // Alternative selector
      composeAlt: '.share-creation-state__text-editor .ql-editor',
      // Comment field
      comment: '.comments-comment-texteditor .ql-editor',
      // Article editor
      article: '.article-editor .ql-editor'
    },
    instagram: {
      // Caption field in create post
      caption: 'textarea[aria-label*="caption" i]',
      // Alternative caption selector
      captionAlt: 'textarea[placeholder*="caption" i]'
    }
  };

  // Context detection selectors
  const CONTEXT_SELECTORS = {
    twitter: {
      media: '[data-testid="attachments"]',
      mediaAlt: '[data-testid*="media"]',
      poll: '[data-testid="poll"]',
      thread: '[data-testid="addButton"]'
    },
    linkedin: {
      media: '.share-creation-state__preview',
      mediaAlt: '.feed-shared-image',
      poll: '.poll-option-input',
      article: '.article-share-box'
    },
    instagram: {
      media: 'img[alt*="Preview"]',
      video: 'video'
    }
  };

  /**
   * Detect which platform we're on
   */
  function detectPlatform() {
    const hostname = window.location.hostname;
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    }
    if (hostname.includes('linkedin.com')) {
      return 'linkedin';
    }
    if (hostname.includes('instagram.com')) {
      return 'instagram';
    }
    return null;
  }

  /**
   * Check if element is a valid compose field (not DM, not comment)
   */
  function isValidComposeField(element, platform) {
    if (!element) return false;

    // Exclude DMs on Twitter
    if (platform === 'twitter') {
      const isDM = element.closest('[data-testid="conversation"]') ||
                   element.matches(COMPOSE_SELECTORS.twitter.dm);
      if (isDM) return false;
    }

    // Exclude comments (we only audit main posts)
    if (platform === 'linkedin') {
      const isComment = element.closest('.comments-comment-box') ||
                        element.matches(COMPOSE_SELECTORS.linkedin.comment);
      if (isComment) return false;
    }

    return true;
  }

  /**
   * Find active compose field on the page
   */
  function findComposeField() {
    const platform = detectPlatform();
    if (!platform) return null;

    const selectors = COMPOSE_SELECTORS[platform];
    if (!selectors) return null;

    for (const [type, selector] of Object.entries(selectors)) {
      if (type === 'dm' || type === 'comment') continue; // Skip excluded types

      const element = document.querySelector(selector);
      if (element && isValidComposeField(element, platform)) {
        return {
          element,
          platform,
          type
        };
      }
    }

    return null;
  }

  /**
   * Extract text content from compose field
   */
  function extractContent(composeField) {
    if (!composeField || !composeField.element) return '';

    const element = composeField.element;

    // Handle textarea
    if (element.tagName === 'TEXTAREA') {
      return element.value.trim();
    }

    // Handle contenteditable (Twitter, LinkedIn)
    if (element.isContentEditable) {
      // Get text content, preserving line breaks
      let text = '';
      const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
      
      while (walk.nextNode()) {
        const node = walk.currentNode;
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.nodeName === 'BR' || node.nodeName === 'DIV') {
          text += '\n';
        }
      }
      
      return text.trim();
    }

    return element.innerText?.trim() || '';
  }

  /**
   * Detect context (has media, is thread, etc.)
   */
  function detectContext(composeField) {
    if (!composeField) return {};

    const platform = composeField.platform;
    const contextSelectors = CONTEXT_SELECTORS[platform];
    if (!contextSelectors) return {};

    // Find the compose container
    const container = composeField.element.closest('[role="dialog"], .share-box, form, .composer');

    const context = {
      has_media: false,
      is_thread: false,
      has_poll: false,
      is_article: false
    };

    if (!container) return context;

    // Check for media
    if (contextSelectors.media) {
      context.has_media = !!container.querySelector(contextSelectors.media);
    }
    if (!context.has_media && contextSelectors.mediaAlt) {
      context.has_media = !!container.querySelector(contextSelectors.mediaAlt);
    }
    if (!context.has_media && contextSelectors.video) {
      context.has_media = !!container.querySelector(contextSelectors.video);
    }

    // Check for thread (Twitter)
    if (contextSelectors.thread) {
      context.is_thread = !!container.querySelector(contextSelectors.thread);
    }

    // Check for poll
    if (contextSelectors.poll) {
      context.has_poll = !!container.querySelector(contextSelectors.poll);
    }

    // Check for article (LinkedIn)
    if (contextSelectors.article) {
      context.is_article = !!container.querySelector(contextSelectors.article);
    }

    return context;
  }

  /**
   * Get minimum content length for audit
   */
  function getMinContentLength(platform) {
    // Minimum characters required for meaningful audit
    return {
      twitter: 20,
      linkedin: 30,
      instagram: 15
    }[platform] || 20;
  }

  /**
   * Check if content is ready for audit
   */
  function isContentReady(composeField, content) {
    if (!content) return false;
    
    const minLength = getMinContentLength(composeField.platform);
    return content.length >= minLength;
  }

  // Expose API globally
  globalThis.BrandalyzeComposeDetector = {
    detectPlatform,
    findComposeField,
    extractContent,
    detectContext,
    isContentReady,
    COMPOSE_SELECTORS,
    CONTEXT_SELECTORS
  };

})();
```

---

### 2. Audit Button Component

Create: `apps/extension/content/audit-button.js`

This file creates and manages the floating audit button.

```javascript
// apps/extension/content/audit-button.js

console.log("Brandalyze audit button loaded");

(function() {
  "use strict";

  let auditButton = null;
  let currentComposeField = null;
  let isAnalyzing = false;

  // Button states
  const BUTTON_STATES = {
    idle: {
      text: 'Audit Post',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>`,
      class: 'brandalyze-audit-idle'
    },
    analyzing: {
      text: 'Analyzing...',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" class="brandalyze-spin">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="32" stroke-linecap="round"/>
      </svg>`,
      class: 'brandalyze-audit-analyzing'
    },
    success: {
      text: 'View Results',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 13l4 4L19 7"/>
      </svg>`,
      class: 'brandalyze-audit-success'
    },
    error: {
      text: 'Retry',
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4v5h5M20 20v-5h-5M20.49 9A9 9 0 005.64 5.64L4 4m16 16l-1.64-1.64A9 9 0 0118.36 9"/>
      </svg>`,
      class: 'brandalyze-audit-error'
    }
  };

  /**
   * Inject required CSS styles
   */
  function injectStyles() {
    if (document.getElementById('brandalyze-audit-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'brandalyze-audit-styles';
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

    const button = document.createElement('button');
    button.id = 'brandalyze-audit-btn';
    button.className = 'brandalyze-audit-btn brandalyze-audit-idle brandalyze-audit-btn-enter';
    
    updateButtonState(button, 'idle');
    
    button.addEventListener('click', handleAuditClick);
    
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
    button.disabled = state === 'analyzing';
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
    updateButtonState(auditButton, 'idle');

    // Animate in
    requestAnimationFrame(() => {
      auditButton.classList.remove('brandalyze-audit-btn-enter');
      auditButton.classList.add('brandalyze-audit-btn-visible');
    });
  }

  /**
   * Hide the audit button
   */
  function hideButton() {
    if (!auditButton || isAnalyzing) return;

    auditButton.classList.remove('brandalyze-audit-btn-visible');
    auditButton.classList.add('brandalyze-audit-btn-enter');

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
    const hasAccess = await globalThis.BrandalyzeUtils?.checkSubscriptionAccess();
    if (!hasAccess) {
      alert('Post audits require a Pro or Enterprise subscription. Upgrade to access this feature.');
      return;
    }

    // Extract content
    const content = globalThis.BrandalyzeComposeDetector?.extractContent(currentComposeField);
    if (!globalThis.BrandalyzeComposeDetector?.isContentReady(currentComposeField, content)) {
      alert('Please enter more content before auditing (minimum 20 characters).');
      return;
    }

    // Get context
    const context = globalThis.BrandalyzeComposeDetector?.detectContext(currentComposeField) || {};

    isAnalyzing = true;
    updateButtonState(auditButton, 'analyzing');

    try {
      // Send audit request to background script
      const response = await chrome.runtime.sendMessage({
        action: 'auditPost',
        data: {
          content,
          platform: currentComposeField.platform,
          context
        }
      });

      if (response && response.success) {
        updateButtonState(auditButton, 'success');
        showAuditResults(response.data);
      } else {
        throw new Error(response?.error || 'Audit failed');
      }
    } catch (error) {
      console.error('Audit error:', error);
      updateButtonState(auditButton, 'error');
      
      // Reset to idle after 3 seconds
      setTimeout(() => {
        if (auditButton) {
          updateButtonState(auditButton, 'idle');
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
    console.log('Audit results:', data);
    
    // For now, show a simple notification
    const score = data?.audit?.score || data?.score || 0;
    const message = `Brand Voice Score: ${Math.round(score)}%`;
    
    // Simple notification (will be replaced with panel)
    const notification = document.createElement('div');
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
    updateButtonState
  };

})();
```

---

### 3. Compose Observer (Main Entry Point)

Create: `apps/extension/content/compose-observer.js`

This file ties everything together with DOM observation.

```javascript
// apps/extension/content/compose-observer.js

console.log("Brandalyze compose observer loaded");

(function() {
  "use strict";

  let observer = null;
  let checkInterval = null;
  let lastActiveField = null;
  let debounceTimer = null;

  /**
   * Wait for dependencies to load
   */
  function waitForDependencies() {
    return new Promise((resolve) => {
      const check = () => {
        if (globalThis.BrandalyzeUtils && 
            globalThis.BrandalyzeComposeDetector && 
            globalThis.BrandalyzeAuditButton) {
          resolve();
          return;
        }
        setTimeout(check, 100);
      };
      check();

      // Timeout after 10 seconds
      setTimeout(resolve, 10000);
    });
  }

  /**
   * Check for active compose field and show/hide button
   */
  function checkComposeField() {
    const composeField = globalThis.BrandalyzeComposeDetector?.findComposeField();
    
    if (composeField) {
      const content = globalThis.BrandalyzeComposeDetector.extractContent(composeField);
      
      // Only show button if there's meaningful content
      if (globalThis.BrandalyzeComposeDetector.isContentReady(composeField, content)) {
        if (lastActiveField !== composeField.element) {
          lastActiveField = composeField.element;
          globalThis.BrandalyzeAuditButton?.showButton(composeField);
        }
      } else {
        // Content not ready, hide button
        if (lastActiveField) {
          lastActiveField = null;
          globalThis.BrandalyzeAuditButton?.hideButton();
        }
      }
    } else {
      // No compose field, hide button
      if (lastActiveField) {
        lastActiveField = null;
        globalThis.BrandalyzeAuditButton?.hideButton();
      }
    }
  }

  /**
   * Debounced check
   */
  function debouncedCheck() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkComposeField, 300);
  }

  /**
   * Start observing DOM changes
   */
  function startObserving() {
    // MutationObserver for DOM changes
    observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          shouldCheck = true;
          break;
        }
        if (mutation.type === 'characterData') {
          shouldCheck = true;
          break;
        }
      }
      
      if (shouldCheck) {
        debouncedCheck();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Also listen for focus/blur events
    document.addEventListener('focusin', debouncedCheck);
    document.addEventListener('focusout', () => {
      // Delay hide to allow clicking the audit button
      setTimeout(debouncedCheck, 200);
    });

    // Input events for content changes
    document.addEventListener('input', debouncedCheck, true);

    // Periodic check as backup
    checkInterval = setInterval(checkComposeField, 2000);

    console.log('Brandalyze compose observer started');
  }

  /**
   * Stop observing
   */
  function stopObserving() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
    document.removeEventListener('focusin', debouncedCheck);
    document.removeEventListener('input', debouncedCheck, true);
  }

  /**
   * Initialize
   */
  async function init() {
    // Only run on supported platforms
    const platform = globalThis.location.hostname;
    const supported = ['twitter.com', 'x.com', 'linkedin.com', 'instagram.com'];
    
    if (!supported.some(p => platform.includes(p))) {
      console.log('Brandalyze: Platform not supported for compose detection');
      return;
    }

    await waitForDependencies();
    
    if (!globalThis.BrandalyzeComposeDetector) {
      console.error('Brandalyze: Compose detector not loaded');
      return;
    }

    startObserving();

    // Initial check
    setTimeout(checkComposeField, 1000);
  }

  // Start when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', stopObserving);

})();
```

---

## Update manifest.json

Add the new content scripts to `manifest.json`:

```json
{
  "content_scripts": [
    {
      "matches": ["https://twitter.com/*", "https://x.com/*"],
      "js": [
        "content/shared.js",
        "content/compose-detector.js",
        "content/audit-button.js",
        "content/compose-observer.js",
        "content/twitter.js"
      ],
      "css": [],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://linkedin.com/*", "https://www.linkedin.com/*"],
      "js": [
        "content/shared.js",
        "content/compose-detector.js",
        "content/audit-button.js",
        "content/compose-observer.js",
        "content/linkedin.js"
      ],
      "css": [],
      "run_at": "document_idle"
    },
    {
      "matches": ["https://www.instagram.com/*"],
      "js": [
        "content/shared.js",
        "content/compose-detector.js",
        "content/audit-button.js",
        "content/compose-observer.js"
      ],
      "css": [],
      "run_at": "document_idle"
    }
  ]
}
```

---

## Update background.js

Add the `auditPost` message handler to `background.js`:

```javascript
// Add to the message handler switch statement in background.js

case "auditPost":
  handlePostAudit(request.data)
    .then((response) => sendResponse({ success: true, data: response }))
    .catch((error) => sendResponse({ success: false, error: error.message }));
  return true;
```

Add the handler function:

```javascript
// Post audit handler
async function handlePostAudit(auditData) {
  try {
    // Ensure authentication
    await checkClerkAuth();
    
    if (!authState.isAuthenticated) {
      throw new Error("Please sign in to Brandalyze first");
    }

    // Determine auth header
    const useExtensionToken = authState.extensionToken && authState.userInfo;
    const authHeader = useExtensionToken
      ? `ExtensionToken ${authState.extensionToken}`
      : `Bearer ${authState.clerkToken}`;

    // Map platform names
    const platformMap = {
      'twitter': 'twitter',
      'x': 'twitter',
      'linkedin': 'linkedin',
      'instagram': 'other'  // Instagram not fully supported yet
    };

    const requestBody = {
      content: auditData.content,
      platform: platformMap[auditData.platform] || 'other',
      context: auditData.context || {}
    };

    // Call the audit API
    const response = await fetch(
      `${authState.currentApiUrl}/audits/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      }
    );

    // Handle 401 with retry
    if (response.status === 401) {
      await checkClerkAuth();
      
      if (authState.isAuthenticated) {
        const retryHeader = authState.extensionToken
          ? `ExtensionToken ${authState.extensionToken}`
          : `Bearer ${authState.clerkToken}`;

        const retryResponse = await fetch(
          `${authState.currentApiUrl}/audits/analyze`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: retryHeader,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error(errorData.error || `Audit failed: ${retryResponse.status}`);
        }

        return await retryResponse.json();
      }
      
      throw new Error("Authentication failed. Please sign in again.");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle upgrade required
      if (errorData.code === 'UPGRADE_REQUIRED') {
        throw new Error('Post audits require a Pro subscription. Please upgrade to continue.');
      }
      
      throw new Error(errorData.error || `Audit failed: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Post audit error:", error);
    throw error;
  }
}
```

---

## Testing Approach

### Manual Testing Checklist

1. **Twitter/X**
   - [ ] Navigate to twitter.com, compose new post
   - [ ] Type 20+ characters, verify button appears
   - [ ] Delete content below threshold, verify button hides
   - [ ] Click button, verify API call is made
   - [ ] Check that DM fields don't trigger button

2. **LinkedIn**
   - [ ] Navigate to linkedin.com, click "Start a post"
   - [ ] Type 30+ characters, verify button appears
   - [ ] Add media, verify context detection
   - [ ] Check that comment fields don't trigger button

3. **Edge Cases**
   - [ ] Rapid typing doesn't cause flickering
   - [ ] Button repositions on scroll
   - [ ] Works with multiple tabs
   - [ ] Handles page navigation (SPA)

### Console Debugging

```javascript
// Run in browser console to test detection
BrandalyzeComposeDetector.findComposeField();
BrandalyzeComposeDetector.detectPlatform();
```

---

## Platform-Specific Notes

### Twitter/X

- Uses `[data-testid="tweetTextarea_0"]` for compose
- Content is in contenteditable div
- Thread indicator: presence of add button
- Media is detected via `[data-testid="attachments"]`

### LinkedIn

- Uses Quill editor (`.ql-editor`)
- Multiple compose contexts (main feed, groups, articles)
- Poll detection via specific input class
- Comment fields should be excluded

### Instagram

- Caption is in textarea
- Only available in create post flow
- Limited support initially

---

## Next Steps (Phase 2 Continued)

1. **Step 2.2**: Floating Button UI (polish positioning, animations)
2. **Step 2.3**: Audit Panel (slide-in results display)
3. **Step 2.4**: API Integration (error handling, streaming)

---

## Troubleshooting

### Button Not Appearing

1. Check console for errors
2. Verify content scripts are loaded: `chrome://extensions` -> Details -> Content scripts
3. Confirm platform is supported
4. Check subscription status

### API Errors

1. Verify authentication: Check popup shows signed in
2. Check network tab for 401/403 errors
3. Verify backend is running (if local)
4. Check audit endpoint exists: `/api/audits/analyze`

### Selector Issues

1. Twitter/X updates selectors frequently
2. Check for updated `data-testid` attributes
3. LinkedIn uses dynamic class names, use stable selectors
