console.log('Brandalyze shared utilities loaded');

globalThis.BrandalyzeUtils = {
  // Check if user has required subscription for extension features
  checkSubscriptionAccess: async function() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'checkClerkAuth'
      });
      
      if (response.success && response.data.isAuthenticated) {
        // Check if user has Pro or Enterprise subscription
        const authState = response.data;
        if (authState.apiUrl && authState.jwt) {
          try {
            const authResponse = await fetch(`${authState.apiUrl}/extension/auth/verify/`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authState.jwt}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (authResponse.ok) {
              const authData = await authResponse.json();
              if (authData.success && authData.data) {
                const tier = authData.data.subscription_tier?.toLowerCase();
                return tier === 'pro' || tier === 'enterprise';
              }
            }
          } catch (error) {
            console.log('Error checking subscription:', error);
          }
        }
      }
      
      return false; // Default to no access for free users
    } catch (error) {
      console.log('Error checking auth:', error);
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