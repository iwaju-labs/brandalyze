const debug = globalThis.BrandalyzeDebug || { log: () => {}, warn: () => {}, error: console.error, info: () => {} };
debug.log("Compose detector loaded");

(function () {
  "use strict";

  const COMPOSE_SELECTORS = {
    twitter: {
      compose: '[data-testid="tweetTextarea_0"]',
      reply: '[data-testid="tweetTextarea_0_reply"]',
      quote: '[data-testid="tweetTextarea_0_quote"]',
      dm: '[data-testid="dmComposerTextInput"]',
    },
    // add new ones when we expand
  };

  const CONTEXT_SELECTORS = {
    twitter: {
      media: '[data-testid="attachments"]',
      mediaAlt: '[data-testid*="media"]',
      poll: '[data-testid="poll"]',
      thread: '[data-testid="addButton"]',
    },
  };

  /**
   * platform detection function
   */
  function detectPlatform() {
    const hostname = globalThis.location.hostname;
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      return "twitter";
    }
    if (hostname.includes("linkedin.com")) {
      return "linkedin";
    }
    if (hostname.includes("instagram.com")) {
      return "instagram";
    }
    return null;
  }

  function isValidComposeField(element, platform) {
    if (!element) return false;

    if (platform === "twitter") {
      // Skip DMs
      const isDM =
        element.closest('[data-testid="conversation"]') ||
        element.matches(COMPOSE_SELECTORS.twitter.dm);
      if (isDM) return false;

      // Skip replies - multiple detection methods
      const container = element.closest('[role="dialog"]') || element.closest('[data-testid="primaryColumn"]');
      
      // Check for reply indicators
      const isReply = 
        // Direct reply testid
        element.closest('[data-testid="reply"]') ||
        // Inline reply indicator
        document.querySelector('[data-testid="inlineReply"]') !== null ||
        // Reply aria label on the compose field
        element.getAttribute('aria-label')?.toLowerCase().includes('reply') ||
        // "Replying to" text in the compose container
        container?.querySelector('[data-testid="Tweet-User-Avatar"]') !== null ||
        // Reply thread indicator (shows who you're replying to)
        container?.textContent?.includes('Replying to') ||
        // Check URL for reply context
        globalThis.location.pathname.includes('/status/') ||
        // Check for the reply indicator element (blue line connecting to original tweet)
        container?.querySelector('[data-testid="tweetPhoto"]')?.closest('[role="dialog"]') === container;
      
      if (isReply) return false;
    }

    return true;
  }

  /**
   * find active compose field on the page
   */
  function findComposeField() {
    const platform = detectPlatform();
    if (!platform) return null;

    const selectors = COMPOSE_SELECTORS[platform];
    if (!selectors) return null;

    for (const [type, selector] of Object.entries(selectors)) {
      // Skip DMs, comments, and replies - only audit original posts
      if (type === "dm" || type === "comment" || type === "reply") continue;

      const element = document.querySelector(selector);
      if (element && isValidComposeField(element, platform)) {
        return {
          element,
          platform,
          type,
        };
      }
    }

    return null;
  }

  /**
   * Extract content from the compose field
   */
  function extractContent(composeField) {
    if (!composeField || !composeField.element) return "";
    const element = composeField.element;

    if (element.tagName === "TEXTAREA") {
      return element.value.trim();
    }

    // handle contenteditable (twitter/x, linkedin)
    if (element.isContentEditable) {
      let text = "";
      const walk = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT
      );

      while (walk.nextNode()) {
        const node = walk.currentNode;
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.nodeName === "BR" || node.nodeName === "DIV") {
          text += "\n";
        }
      }

      return text.trim();
    }

    return element.innerText?.trim() || "";
  }

  /**
   * detect context (has media, is thread, etc)
   */
  function detectContext(composeField) {
    if (!composeField) return {};

    const platform = composeField.platform;
    const contextSelectors = CONTEXT_SELECTORS[platform];
    if (!contextSelectors) return {};

    const container = composeField.element.closest(
      '[role="dialog"], .share-box, form, .composer'
    );
    const context = {
      has_media: false,
      is_thread: false,
      has_poll: false,
      is_article: false,
    };

    if (!container) return context;

    // check for media
    if (contextSelectors.media) {
      context.has_media = !!container.querySelector(contextSelectors.media);
    }
    if (!context.has_media && contextSelectors.mediaAlt) {
      context.has_media = !!container.querySelector(contextSelectors.mediaAlt);
    }
    if (!context.has_media && contextSelectors.video) {
      context.has_media = !!container.querySelector(contextSelectors.video);
    }

    if (contextSelectors.thread) {
      context.is_thread = !!container.querySelector(contextSelectors.thread);
    }

    if (contextSelectors.poll) {
      context.has_poll = !!container.querySelector(contextSelectors.poll);
    }

    if (contextSelectors.article) {
      context.is_article = !!container.querySelector(contextSelectors.article);
    }

    return context;
  }

  /**
   * get minimum required length for meaningful audit
   */
  function getMinContentLength(platform) {
    return (
      {
        twitter: 20,
        linkedin: 30,
        instagram: 15,
      }[platform] || 20
    );
  }
  /**
   * check if content is ready for audit
   */
  function isContentReady(composeField, content) {
    if (!content) return false;

    const minLength = getMinContentLength(composeField.platform);
    return content.length >= minLength;
  }

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
