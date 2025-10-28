// LinkedIn content script for Brandalyze
console.log('Brandalyze LinkedIn content script loaded');

// Track processed posts to avoid duplicates
const processedPosts = new Set();

function processLinkedInPosts() {
  // LinkedIn post selectors (multiple variants to handle different layouts)
  const postSelectors = [
    '.feed-shared-update-v2',
    '.occludable-update',
    '[data-urn*="urn:li:activity"]',
    '.relative.feed-shared-update-v2__content-wrapper'
  ];
  
  let posts = [];
  postSelectors.forEach(selector => {
    posts.push(...document.querySelectorAll(selector));
  });
  
  posts.forEach(post => {
    try {
      // Create unique identifier for this post
      const postId = post.dataset.urn || 
                    post.querySelector('[data-urn]')?.dataset.urn || 
                    post.innerHTML.substring(0, 100);
      
      if (processedPosts.has(postId)) return;
      processedPosts.add(postId);
      
      // Skip if button already exists
      if (post.querySelector('.brandalyze-btn')) return;
      
      // Extract content to verify this is a content post
      const content = BrandalyzeUtils.extractContent(post);
      if (!content || content.length < 10) return;
      
      // Create analyze button
      const button = BrandalyzeUtils.createAnalyzeButton(() => {
        analyzeLinkedInPost(post, button);
      });
      
      // Find the best place to insert the button
      const actionBar = post.querySelector('.feed-shared-social-action-bar, .social-actions-bar');
      const actionsContainer = post.querySelector('.feed-shared-social-counts-bar, .social-counts-bar');
      const contentFooter = post.querySelector('.feed-shared-footer, .update-components-footer');
      
      if (actionBar) {
        actionBar.appendChild(button);
      } else if (actionsContainer) {
        actionsContainer.appendChild(button);
      } else if (contentFooter) {
        contentFooter.appendChild(button);
      } else {
        // Fallback: append to the post itself
        post.style.position = 'relative';
        button.style.position = 'absolute';
        button.style.top = '10px';
        button.style.right = '10px';
        button.style.zIndex = '10';
        post.appendChild(button);
      }
      
    } catch (error) {
      console.error('Error processing LinkedIn post:', error);
    }
  });
}

async function analyzeLinkedInPost(postElement, button) {
  try {
    BrandalyzeUtils.setButtonLoading(button, true);
    
    const content = BrandalyzeUtils.extractContent(postElement);
    const sessionId = BrandalyzeUtils.generateSessionId();
    
    console.log('Analyzing LinkedIn post:', content.substring(0, 100));
    
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'analyzeContent',
        data: {
          content: content,
          platform: 'linkedin',
          sessionId: sessionId
        }
      }, resolve);
    });
    
    if (response.success) {
      BrandalyzeUtils.showAnalysisResult(response.data, button);
    } else {
      alert('Analysis failed: ' + (response.error || 'Unknown error'));
    }
    
  } catch (error) {
    console.error('Analysis error:', error);
    alert('Analysis failed: ' + error.message);
  } finally {
    BrandalyzeUtils.setButtonLoading(button, false);
  }
}

// Initialize and observe for new content
function initializeLinkedInScript() {
  // Initial processing
  setTimeout(processLinkedInPosts, 2000);
  
  // Watch for new posts (LinkedIn loads content dynamically)
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && (
            node.matches('.feed-shared-update-v2, .occludable-update') ||
            node.querySelector('.feed-shared-update-v2, .occludable-update')
          )) {
            shouldProcess = true;
          }
        });
      }
    });
    
    if (shouldProcess) {
      setTimeout(processLinkedInPosts, 1000);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('LinkedIn content script initialized');
}

// Start the script
initializeLinkedInScript();

console.log('LinkedIn content script initialized');
