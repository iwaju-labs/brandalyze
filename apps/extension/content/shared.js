// Debug logging utility
let DEBUG_MODE = false;

if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.get(['debugMode'], (result) => {
    DEBUG_MODE = result.debugMode || false;
  });

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
    console.error('[Brandalyze]', ...args);
  },
  info: (...args) => {
    if (DEBUG_MODE) console.info('[Brandalyze]', ...args);
  }
};

if (typeof globalThis !== 'undefined') {
  globalThis.BrandalyzeDebug = debug;
}

debug.log('Brandalyze shared utilities loaded');

// Track if we've already shown the refresh notification
let contextInvalidatedNotificationShown = false;

globalThis.BrandalyzeUtils = {
  // Check if error is due to extension context being invalidated
  isContextInvalidated: function(error) {
    if (!error) return false;
    const message = error.message || error.toString();
    return message.includes('Extension context invalidated') ||
           message.includes('context invalidated') ||
           message.includes('Receiving end does not exist');
  },

  // Show refresh notification to user
  showRefreshNotification: function() {
    if (contextInvalidatedNotificationShown) return;
    contextInvalidatedNotificationShown = true;

    const notification = document.createElement('div');
    notification.id = 'brandalyze-refresh-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      max-width: 320px;
      animation: slideIn 0.3s ease-out;
    `;

    notification.innerHTML = `
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px;">🔄</span>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Brandalyze Updated</div>
          <div style="opacity: 0.9; font-size: 13px; margin-bottom: 12px;">
            Please refresh this page to continue using the extension.
          </div>
          <button id="brandalyze-refresh-btn" style="
            background: white;
            color: #6366f1;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            font-size: 13px;
          ">Refresh Page</button>
          <button id="brandalyze-dismiss-btn" style="
            background: transparent;
            color: white;
            border: 1px solid rgba(255,255,255,0.3);
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            margin-left: 8px;
          ">Dismiss</button>
        </div>
      </div>
    `;

    document.body.appendChild(notification);

    document.getElementById('brandalyze-refresh-btn').addEventListener('click', () => {
      globalThis.location.reload();
    });

    document.getElementById('brandalyze-dismiss-btn').addEventListener('click', () => {
      notification.remove();
    });

    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
        contextInvalidatedNotificationShown = false;
      }
    }, 30000);
  },

  // Safe wrapper for chrome.runtime.sendMessage
  sendMessage: async function(message) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (error) {
      if (this.isContextInvalidated(error)) {
        debug.warn('Extension context invalidated, showing refresh notification');
        this.showRefreshNotification();
        return { success: false, error: 'Extension updated. Please refresh the page.' };
      }
      throw error;
    }
  },

  // Check if user has required subscription for extension features
  checkSubscriptionAccess: async function() {
    try {
      const response = await this.sendMessage({
        action: 'getAuthState'
      });
      
      if (response.success && response.data.isAuthenticated && response.data.userInfo) {
        const tier = response.data.userInfo.subscription_tier?.toLowerCase();
        return tier === 'pro' || tier === 'enterprise';
      }
      
      return false;
    } catch (error) {
      if (this.isContextInvalidated(error)) {
        this.showRefreshNotification();
        return false;
      }
      debug.log('Error checking auth:', error);
      return false;
    }
  },

  // Enhanced content extraction
  extractContent: function(element) {
    if (!element) return '';
    
    // Try to find the main text content, excluding metadata
    let content = '';
    
    // Look for specific content areas first
    const textElements = element.querySelectorAll('[data-testid="tweetText"], .feed-shared-text, .msg-s-message-list__event, p, span');
    
    if (textElements.length > 0) {
      content = Array.from(textElements)
        .map(el => el.textContent?.trim())
        .filter(text => text && text.length > 10)
        .join(' ');
    }
    
    // Fallback to full text content
    if (!content || content.length < 10) {
      content = element.textContent || element.innerText || '';
    }
    
    return content.trim();
  },

  // Create enhanced analyze button with loading states
  createAnalyzeButton: function(onClick) {
    const button = document.createElement('button');
    button.innerHTML = `
      <span class="btn-text">📊 Analyze</span>
      <span class="btn-loading" style="display: none;">⏳ Analyzing...</span>
    `;
    button.className = 'brandalyze-btn';
    button.style.cssText = `
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      margin: 4px;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.05)';
      button.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = 'none';
    });
    
    if (onClick) {
      button.addEventListener('click', onClick);
    }
    
    return button;
  },

  // Button state management
  setButtonLoading: function(button, loading) {
    const textSpan = button.querySelector('.btn-text');
    const loadingSpan = button.querySelector('.btn-loading');
    
    if (loading) {
      textSpan.style.display = 'none';
      loadingSpan.style.display = 'inline';
      button.disabled = true;
      button.style.opacity = '0.7';
    } else {
      textSpan.style.display = 'inline';
      loadingSpan.style.display = 'none';
      button.disabled = false;
      button.style.opacity = '1';
    }
  },

  // Show analysis results popup
  showAnalysisResult: function(result, targetElement) {
    const popup = document.createElement('div');
    popup.className = 'brandalyze-result-popup';
    popup.style.cssText = `
      position: absolute;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      max-width: 320px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;

    const scoreColor = result.alignment_level === 'high' ? '#10b981' : 
                      result.alignment_level === 'medium' ? '#f59e0b' : '#ef4444';
    
    popup.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: ${scoreColor};"></div>
        <strong>Brand Alignment: ${Math.round(result.alignment_score * 100)}%</strong>
      </div>
      <div style="margin-bottom: 12px;">
        <strong>Key Insights:</strong>
        <ul style="margin: 8px 0; padding-left: 20px;">
          ${result.key_insights.map(insight => `<li>${insight}</li>`).join('')}
        </ul>
      </div>
      <button onclick="this.parentElement.remove()" style="
        background: #f3f4f6; 
        border: none; 
        padding: 6px 12px; 
        border-radius: 6px; 
        cursor: pointer;
        font-size: 12px;
      ">Close</button>
    `;

    // Position popup near the target element
    document.body.appendChild(popup);
    const rect = targetElement.getBoundingClientRect();
    popup.style.left = Math.min(rect.right + 10, window.innerWidth - 340) + 'px';
    popup.style.top = rect.top + 'px';

    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (popup.parentElement) popup.remove();
    }, 10000);
  },  // Platform detection
  getCurrentPlatform: function() {
    const hostname = globalThis.location.hostname;
    if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      return 'twitter';
    } else if (hostname.includes('linkedin.com')) {
      return 'linkedin';
    }
    return 'unknown';
  },

  // Generate session ID
  generateSessionId: function() {
    return 'ext_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
};