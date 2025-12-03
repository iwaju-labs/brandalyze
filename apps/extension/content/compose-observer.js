// Use debug utility loaded via manifest (src/debug.js)

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

    debug.log('Compose observer started');
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
      debug.log('Platform not supported for compose detection');
      return;
    }

    await waitForDependencies();
    
    if (!globalThis.BrandalyzeComposeDetector) {
      debug.error('Compose detector not loaded');
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