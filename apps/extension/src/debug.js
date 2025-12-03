// Debug logging utility for Brandalyze extension
// Enable debug mode by running in console: chrome.storage.local.set({debugMode: true})
// Disable with: chrome.storage.local.set({debugMode: false})

let DEBUG_MODE = false;

// Initialize debug mode from storage
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.get(['debugMode'], (result) => {
    DEBUG_MODE = result.debugMode || false;
  });

  // Listen for changes to debug mode
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.debugMode) {
      DEBUG_MODE = changes.debugMode.newValue || false;
    }
  });
}

const debug = {
  log: (...args) => {
    if (DEBUG_MODE) console.log('[Brandalyze]', ...args);
  },
  warn: (...args) => {
    if (DEBUG_MODE) console.warn('[Brandalyze]', ...args);
  },
  error: (...args) => {
    // Always show errors
    console.error('[Brandalyze]', ...args);
  },
  info: (...args) => {
    if (DEBUG_MODE) console.info('[Brandalyze]', ...args);
  }
};

// Export for use in different contexts
if (typeof globalThis !== 'undefined') {
  globalThis.BrandalyzeDebug = debug;
}
