// Profile Analysis Panel - Sidebar UI for post selection and results
// Debug utility loaded from shared.js
debug.log("Profile analysis panel loaded");

(function () {
  "use strict";

  let panelElement = null;
  let isOpen = false;
  let currentView = "selection"; // "selection" or "results"
  let selectedPosts = [];
  let currentHandle = null;
  let currentCallback = null;

  /**
   * Inject panel styles
   */
  function injectStyles() {
    if (document.getElementById("brandalyze-profile-panel-styles")) return;

    const styles = document.createElement("style");
    styles.id = "brandalyze-profile-panel-styles";
    styles.textContent = `
      .brandalyze-profile-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10001;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.3s ease, visibility 0.3s ease;
      }

      .brandalyze-profile-overlay.visible {
        opacity: 1;
        visibility: visible;
      }

      .brandalyze-profile-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 420px;
        max-width: 100vw;
        height: 100vh;
        background: rgb(255, 255, 255);
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
        z-index: 10002;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        display: flex;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }

      .brandalyze-profile-panel.open {
        transform: translateX(0);
      }

      /* Dark mode */
      .brandalyze-profile-panel.dark {
        background: rgb(21, 32, 43);
        color: rgb(247, 249, 249);
      }

      .brandalyze-profile-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgb(239, 243, 244);
      }

      .brandalyze-profile-panel.dark .brandalyze-profile-header {
        border-bottom-color: rgb(56, 68, 77);
      }

      .brandalyze-profile-title {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .brandalyze-profile-close {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: none;
        background: transparent;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
        color: inherit;
      }

      .brandalyze-profile-close:hover {
        background: rgb(239, 243, 244);
      }

      .brandalyze-profile-panel.dark .brandalyze-profile-close:hover {
        background: rgb(39, 51, 64);
      }

      .brandalyze-profile-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      .brandalyze-profile-subtitle {
        color: rgb(83, 100, 113);
        font-size: 14px;
        margin-bottom: 16px;
        line-height: 1.4;
      }

      .brandalyze-profile-panel.dark .brandalyze-profile-subtitle {
        color: rgb(139, 152, 165);
      }

      .brandalyze-selection-count {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: rgb(247, 249, 249);
        border-radius: 12px;
        margin-bottom: 16px;
        font-weight: 600;
      }

      .brandalyze-profile-panel.dark .brandalyze-selection-count {
        background: rgb(39, 51, 64);
      }

      .brandalyze-selection-count .count {
        color: rgb(29, 155, 240);
      }

      .brandalyze-post-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .brandalyze-post-item {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: rgb(247, 249, 249);
        border-radius: 12px;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
        border: 2px solid transparent;
      }

      .brandalyze-profile-panel.dark .brandalyze-post-item {
        background: rgb(39, 51, 64);
      }

      .brandalyze-post-item:hover {
        background: rgb(239, 243, 244);
      }

      .brandalyze-profile-panel.dark .brandalyze-post-item:hover {
        background: rgb(47, 59, 72);
      }

      .brandalyze-post-item.selected {
        border-color: rgb(29, 155, 240);
        background: rgb(239, 248, 255);
      }

      .brandalyze-profile-panel.dark .brandalyze-post-item.selected {
        background: rgb(25, 45, 65);
      }

      .brandalyze-post-checkbox {
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        border: 2px solid rgb(207, 217, 222);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        margin-top: 2px;
      }

      .brandalyze-profile-panel.dark .brandalyze-post-checkbox {
        border-color: rgb(56, 68, 77);
      }

      .brandalyze-post-item.selected .brandalyze-post-checkbox {
        background: rgb(29, 155, 240);
        border-color: rgb(29, 155, 240);
      }

      .brandalyze-post-checkbox svg {
        opacity: 0;
        color: white;
      }

      .brandalyze-post-item.selected .brandalyze-post-checkbox svg {
        opacity: 1;
      }

      .brandalyze-post-content {
        flex: 1;
        min-width: 0;
      }

      .brandalyze-post-text {
        font-size: 14px;
        line-height: 1.4;
        color: rgb(15, 20, 25);
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .brandalyze-profile-panel.dark .brandalyze-post-text {
        color: rgb(247, 249, 249);
      }

      .brandalyze-post-date {
        font-size: 12px;
        color: rgb(83, 100, 113);
        margin-top: 4px;
      }

      .brandalyze-profile-panel.dark .brandalyze-post-date {
        color: rgb(139, 152, 165);
      }

      .brandalyze-profile-footer {
        padding: 16px 20px;
        border-top: 1px solid rgb(239, 243, 244);
        display: flex;
        gap: 12px;
      }

      .brandalyze-profile-panel.dark .brandalyze-profile-footer {
        border-top-color: rgb(56, 68, 77);
      }

      .brandalyze-profile-btn {
        flex: 1;
        padding: 12px 16px;
        border-radius: 9999px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 0.2s, opacity 0.2s;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .brandalyze-profile-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .brandalyze-profile-btn-primary {
        background: rgb(29, 155, 240);
        color: white;
      }

      .brandalyze-profile-btn-primary:hover:not(:disabled) {
        background: rgb(26, 140, 216);
      }

      .brandalyze-profile-btn-secondary {
        background: transparent;
        border: 1px solid rgb(207, 217, 222);
        color: inherit;
      }

      .brandalyze-profile-panel.dark .brandalyze-profile-btn-secondary {
        border-color: rgb(56, 68, 77);
      }

      .brandalyze-profile-btn-secondary:hover {
        background: rgb(239, 243, 244);
      }

      .brandalyze-profile-panel.dark .brandalyze-profile-btn-secondary:hover {
        background: rgb(39, 51, 64);
      }

      /* Loading State */
      .brandalyze-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
      }

      .brandalyze-loading-spinner {
        width: 40px;
        height: 40px;
        border: 3px solid rgb(239, 243, 244);
        border-top-color: rgb(29, 155, 240);
        border-radius: 50%;
        animation: brandalyze-spin 1s linear infinite;
        margin-bottom: 16px;
      }

      .brandalyze-profile-panel.dark .brandalyze-loading-spinner {
        border-color: rgb(56, 68, 77);
        border-top-color: rgb(29, 155, 240);
      }

      @keyframes brandalyze-spin {
        to { transform: rotate(360deg); }
      }

      .brandalyze-loading-text {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
      }

      .brandalyze-loading-subtext {
        font-size: 14px;
        color: rgb(83, 100, 113);
      }

      .brandalyze-profile-panel.dark .brandalyze-loading-subtext {
        color: rgb(139, 152, 165);
      }

      /* Results View */
      .brandalyze-results-section {
        margin-bottom: 24px;
      }

      .brandalyze-results-header {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .brandalyze-voice-card {
        background: rgb(247, 249, 249);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
      }

      .brandalyze-profile-panel.dark .brandalyze-voice-card {
        background: rgb(39, 51, 64);
      }

      .brandalyze-voice-label {
        font-size: 12px;
        color: rgb(83, 100, 113);
        margin-bottom: 4px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .brandalyze-profile-panel.dark .brandalyze-voice-label {
        color: rgb(139, 152, 165);
      }

      .brandalyze-voice-value {
        font-size: 16px;
        font-weight: 600;
        color: rgb(15, 20, 25);
      }

      .brandalyze-profile-panel.dark .brandalyze-voice-value {
        color: rgb(247, 249, 249);
      }

      .brandalyze-traits-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .brandalyze-trait-tag {
        background: rgb(239, 243, 244);
        color: rgb(83, 100, 113);
        padding: 6px 12px;
        border-radius: 9999px;
        font-size: 13px;
        font-weight: 500;
      }

      .brandalyze-profile-panel.dark .brandalyze-trait-tag {
        background: rgb(56, 68, 77);
        color: rgb(139, 152, 165);
      }

      .brandalyze-indicator-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .brandalyze-indicator-item {
        background: rgb(247, 249, 249);
        border-radius: 12px;
        padding: 12px;
      }

      .brandalyze-profile-panel.dark .brandalyze-indicator-item {
        background: rgb(39, 51, 64);
      }

      .brandalyze-indicator-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .brandalyze-indicator-name {
        font-size: 13px;
        color: rgb(83, 100, 113);
        text-transform: capitalize;
      }

      .brandalyze-profile-panel.dark .brandalyze-indicator-name {
        color: rgb(139, 152, 165);
      }

      .brandalyze-indicator-score {
        font-size: 14px;
        font-weight: 700;
      }

      .brandalyze-indicator-bar {
        height: 4px;
        background: rgb(207, 217, 222);
        border-radius: 2px;
        overflow: hidden;
      }

      .brandalyze-profile-panel.dark .brandalyze-indicator-bar {
        background: rgb(56, 68, 77);
      }

      .brandalyze-indicator-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.5s ease-out;
      }

      .brandalyze-confidence-section {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        background: rgb(247, 249, 249);
        border-radius: 12px;
      }

      .brandalyze-profile-panel.dark .brandalyze-confidence-section {
        background: rgb(39, 51, 64);
      }

      .brandalyze-confidence-value {
        font-size: 28px;
        font-weight: 700;
      }

      .brandalyze-confidence-bar-container {
        flex: 1;
      }

      .brandalyze-confidence-label {
        font-size: 13px;
        color: rgb(83, 100, 113);
        margin-bottom: 6px;
      }

      .brandalyze-profile-panel.dark .brandalyze-confidence-label {
        color: rgb(139, 152, 165);
      }

      .brandalyze-confidence-bar {
        height: 6px;
        background: rgb(207, 217, 222);
        border-radius: 3px;
        overflow: hidden;
      }

      .brandalyze-profile-panel.dark .brandalyze-confidence-bar {
        background: rgb(56, 68, 77);
      }

      .brandalyze-empty-posts {
        text-align: center;
        padding: 32px;
        color: rgb(83, 100, 113);
      }

      .brandalyze-profile-panel.dark .brandalyze-empty-posts {
        color: rgb(139, 152, 165);
      }

      .brandalyze-empty-posts svg {
        margin-bottom: 12px;
        opacity: 0.5;
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Detect dark mode
   */
  function isDarkMode() {
    const bgColor = getComputedStyle(document.body).backgroundColor;
    if (bgColor) {
      const rgb = bgColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const brightness = (Number.parseInt(rgb[0], 10) + Number.parseInt(rgb[1], 10) + Number.parseInt(rgb[2], 10)) / 3;
        return brightness < 128;
      }
    }
    return false;
  }

  /**
   * Escape HTML
   */
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
  }

  /**
   * Get score color
   */
  function getScoreColor(score) {
    if (score >= 80) return "rgb(0, 186, 124)";
    if (score >= 60) return "rgb(29, 155, 240)";
    if (score >= 40) return "rgb(255, 173, 31)";
    return "rgb(244, 33, 46)";
  }

  /**
   * Create selection view HTML
   */
  function createSelectionView(posts, dark) {
    if (!posts || posts.length === 0) {
      return `
        <div class="brandalyze-empty-posts">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <div style="font-weight: 600; margin-bottom: 4px;">No posts found</div>
          <div style="font-size: 13px;">Scroll down to load more posts, then try again.</div>
        </div>
      `;
    }

    return `
      <div class="brandalyze-profile-subtitle">
        Select posts to include in your voice analysis. Choose posts that best represent your typical voice.
      </div>
      <div class="brandalyze-profile-hint" style="font-size: 12px; color: rgb(83, 100, 113); margin-bottom: 12px; padding: 8px 12px; background: rgb(239, 243, 244); border-radius: 8px;">
        Only posts currently visible on your profile are shown. Replies and reposts are excluded.
      </div>
      <div class="brandalyze-selection-count">
        <span>Selected</span>
        <span><span class="count" id="brandalyze-selected-count">0</span> / Available Posts (10 max)</span>
      </div>
      <div class="brandalyze-post-list" id="brandalyze-post-list">
        ${posts.map((post, idx) => `
          <div class="brandalyze-post-item" data-post-idx="${idx}">
            <div class="brandalyze-post-checkbox">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <path d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div class="brandalyze-post-content">
              <div class="brandalyze-post-text">${escapeHtml(post.text)}</div>
              ${post.timestamp ? `<div class="brandalyze-post-date">${new Date(post.timestamp).toLocaleDateString()}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  /**
   * Create loading view HTML
   */
  function createLoadingView() {
    return `
      <div class="brandalyze-loading">
        <div class="brandalyze-loading-spinner"></div>
        <div class="brandalyze-loading-text">Analyzing Profile</div>
        <div class="brandalyze-loading-subtext">This may take a few seconds...</div>
      </div>
    `;
  }

  /**
   * Create results view HTML
   */
  function createResultsView(data, dark) {
    const voice = data.voice_analysis || {};
    const confidence = Math.round((data.confidence_score || 0) * 100);
    const confidenceColor = getScoreColor(confidence);
    const postsAnalyzed = data.posts_analyzed || 0;
    const analysisType = data.analysis_type || "bio_analysis";

    let html = "";

    // Analysis summary
    if (data.analysis_summary) {
      html += `
        <div class="brandalyze-results-section">
          <div class="brandalyze-voice-card" style="background: linear-gradient(135deg, rgb(239, 248, 255) 0%, rgb(243, 232, 255) 100%);">
            <div style="font-size: 14px; line-height: 1.5; color: rgb(15, 20, 25);">${escapeHtml(data.analysis_summary)}</div>
          </div>
        </div>
      `;
    }

    // Tone and Style
    html += `
      <div class="brandalyze-results-section">
        <div class="brandalyze-results-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(29, 155, 240)" stroke-width="2">
            <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
            <path d="M19 10v2a7 7 0 01-14 0v-2"/>
            <path d="M12 19v3m-4 0h8"/>
          </svg>
          Voice Profile
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="brandalyze-voice-card">
            <div class="brandalyze-voice-label">Tone</div>
            <div class="brandalyze-voice-value">${escapeHtml(voice.tone || "Professional")}</div>
          </div>
          <div class="brandalyze-voice-card">
            <div class="brandalyze-voice-label">Style</div>
            <div class="brandalyze-voice-value">${escapeHtml(voice.style || "Thoughtful")}</div>
          </div>
        </div>
      </div>
    `;

    // Personality Traits
    if (voice.personality_traits && voice.personality_traits.length > 0) {
      html += `
        <div class="brandalyze-results-section">
          <div class="brandalyze-results-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(147, 51, 234)" stroke-width="2">
              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            Personality Traits
          </div>
          <div class="brandalyze-traits-list">
            ${voice.personality_traits.map(trait => `<span class="brandalyze-trait-tag">${escapeHtml(trait)}</span>`).join("")}
          </div>
        </div>
      `;
    }

    // Emotional Indicators
    if (voice.emotional_indicators && Object.keys(voice.emotional_indicators).length > 0) {
      html += `
        <div class="brandalyze-results-section">
          <div class="brandalyze-results-header">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(255, 173, 31)" stroke-width="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            Emotional Indicators
          </div>
          <div class="brandalyze-indicator-grid">
            ${Object.entries(voice.emotional_indicators).map(([name, score]) => {
              const percentage = Math.round(score * 10);
              const color = getScoreColor(percentage);
              return `
                <div class="brandalyze-indicator-item">
                  <div class="brandalyze-indicator-header">
                    <span class="brandalyze-indicator-name">${escapeHtml(name)}</span>
                    <span class="brandalyze-indicator-score" style="color: ${color}">${percentage}%</span>
                  </div>
                  <div class="brandalyze-indicator-bar">
                    <div class="brandalyze-indicator-fill" style="width: ${percentage}%; background: ${color}"></div>
                  </div>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `;
    }

    // Confidence Score
    html += `
      <div class="brandalyze-results-section">
        <div class="brandalyze-results-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(0, 186, 124)" stroke-width="2">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          Confidence
        </div>
        <div class="brandalyze-confidence-section">
          <div class="brandalyze-confidence-value" style="color: ${confidenceColor}">${confidence}%</div>
          <div class="brandalyze-confidence-bar-container">
            <div class="brandalyze-confidence-label">
              Based on ${analysisType === "combined_analysis" ? `bio + ${postsAnalyzed} posts` : analysisType === "posts_analysis" ? `${postsAnalyzed} posts` : "bio data"}
            </div>
            <div class="brandalyze-confidence-bar">
              <div class="brandalyze-indicator-fill" style="width: ${confidence}%; background: ${confidenceColor}"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Create the panel
   */
  function createPanel(handle, posts) {
    injectStyles();

    const dark = isDarkMode();
    selectedPosts = [];
    currentView = "selection";

    const overlay = document.createElement("div");
    overlay.className = "brandalyze-profile-overlay";
    overlay.addEventListener("click", closePanel);

    const panel = document.createElement("div");
    panel.className = `brandalyze-profile-panel${dark ? " dark" : ""}`;
    panel.innerHTML = `
      <div class="brandalyze-profile-header">
        <h2 class="brandalyze-profile-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Profile Analysis
        </h2>
        <button class="brandalyze-profile-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="brandalyze-profile-body" id="brandalyze-panel-body">
        ${createSelectionView(posts, dark)}
      </div>
      <div class="brandalyze-profile-footer" id="brandalyze-panel-footer">
        <button class="brandalyze-profile-btn brandalyze-profile-btn-secondary" id="brandalyze-skip-selection">
          Bio Only
        </button>
        <button class="brandalyze-profile-btn brandalyze-profile-btn-primary" id="brandalyze-analyze-selected" disabled>
          Analyze Selected
        </button>
      </div>
    `;

    // Event listeners
    panel.querySelector(".brandalyze-profile-close").addEventListener("click", closePanel);

    // Post selection handlers
    setupPostSelection(panel, posts);

    // Button handlers
    panel.querySelector("#brandalyze-skip-selection").addEventListener("click", () => {
      if (currentCallback) {
        showLoading();
        currentCallback([]);
      }
    });

    panel.querySelector("#brandalyze-analyze-selected").addEventListener("click", () => {
      if (currentCallback && selectedPosts.length > 0) {
        showLoading();
        currentCallback(selectedPosts);
      }
    });

    panelElement = { overlay, panel };
    return panelElement;
  }

  /**
   * Setup post selection interactions
   */
  function setupPostSelection(panel, posts) {
    const postList = panel.querySelector("#brandalyze-post-list");
    if (!postList) return;

    const maxSelection = 10;

    postList.addEventListener("click", (e) => {
      const postItem = e.target.closest(".brandalyze-post-item");
      if (!postItem) return;

      const idx = Number.parseInt(postItem.dataset.postIdx, 10);
      const isSelected = postItem.classList.contains("selected");

      if (isSelected) {
        postItem.classList.remove("selected");
        selectedPosts = selectedPosts.filter((p) => p.idx !== idx);
      } else if (selectedPosts.length < maxSelection) {
        postItem.classList.add("selected");
        selectedPosts.push({ ...posts[idx], idx });
      }

      updateSelectionCount();
    });
  }

  /**
   * Update selection count display
   */
  function updateSelectionCount() {
    const countEl = document.getElementById("brandalyze-selected-count");
    const analyzeBtn = document.getElementById("brandalyze-analyze-selected");

    if (countEl) {
      countEl.textContent = selectedPosts.length;
    }

    if (analyzeBtn) {
      analyzeBtn.disabled = selectedPosts.length === 0;
      const postLabel = selectedPosts.length === 1 ? "Post" : "Posts";
      analyzeBtn.textContent = selectedPosts.length > 0 
        ? `Analyze ${selectedPosts.length} ${postLabel}`
        : "Analyze Selected";
    }
  }

  /**
   * Show loading state
   */
  function showLoading() {
    currentView = "loading";
    const body = document.getElementById("brandalyze-panel-body");
    const footer = document.getElementById("brandalyze-panel-footer");

    if (body) {
      body.innerHTML = createLoadingView();
    }

    if (footer) {
      footer.style.display = "none";
    }
  }

  /**
   * Show results
   */
  function showResults(data) {
    currentView = "results";
    const dark = isDarkMode();
    const body = document.getElementById("brandalyze-panel-body");
    const footer = document.getElementById("brandalyze-panel-footer");

    if (body) {
      body.innerHTML = createResultsView(data, dark);
    }

    if (footer) {
      footer.style.display = "flex";
      footer.innerHTML = `
        <button class="brandalyze-profile-btn brandalyze-profile-btn-secondary" id="brandalyze-save-profile">
          Save Analysis
        </button>
        <button class="brandalyze-profile-btn brandalyze-profile-btn-primary" id="brandalyze-done-profile">
          Done
        </button>
      `;

      footer.querySelector("#brandalyze-done-profile").addEventListener("click", closePanel);
      footer.querySelector("#brandalyze-save-profile").addEventListener("click", () => saveAnalysis(data));
    }
  }

  /**
   * Save analysis to storage
   */
  async function saveAnalysis(data) {
    try {
      const handle = data.handle || currentHandle || "unknown";
      const storageKey = `twitter_profile_analysis_${handle}`;

      const analysisRecord = {
        profile_handle: handle,
        analysis_data: data,
        analyzed_at: new Date().toISOString(),
        platform: "twitter",
        profile_url: globalThis.location.href,
      };

      await chrome.storage.local.set({ [storageKey]: analysisRecord });

      // Update saved analyses list
      const savedResult = await chrome.storage.local.get("saved_analyses");
      const currentSaved = savedResult.saved_analyses || [];

      const existingIndex = currentSaved.findIndex((item) => item.storage_key === storageKey);
      const listItem = {
        storage_key: storageKey,
        platform: "twitter",
        handle: handle,
        analyzed_at: analysisRecord.analyzed_at,
        profile_url: analysisRecord.profile_url,
      };

      if (existingIndex >= 0) {
        currentSaved[existingIndex] = listItem;
      } else {
        currentSaved.unshift(listItem);
      }

      await chrome.storage.local.set({ saved_analyses: currentSaved });

      // Update button
      const saveBtn = document.getElementById("brandalyze-save-profile");
      if (saveBtn) {
        saveBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          Saved!
        `;
        saveBtn.style.background = "rgb(0, 186, 124)";
        saveBtn.style.color = "white";
        saveBtn.style.borderColor = "rgb(0, 186, 124)";

        setTimeout(() => {
          saveBtn.textContent = "Save Analysis";
          saveBtn.style.background = "";
          saveBtn.style.color = "";
          saveBtn.style.borderColor = "";
        }, 2000);
      }

      debug.log(`Profile analysis saved: ${storageKey}`);
    } catch (error) {
      debug.error("Error saving profile analysis:", error);
    }
  }

  /**
   * Open the panel for post selection
   */
  function openForSelection(handle, posts, onConfirm) {
    if (isOpen) {
      closePanel();
    }

    currentHandle = handle;
    currentCallback = onConfirm;

    const { overlay, panel } = createPanel(handle, posts);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    requestAnimationFrame(() => {
      overlay.classList.add("visible");
      panel.classList.add("open");
    });

    isOpen = true;
    document.body.style.overflow = "hidden";
  }

  /**
   * Open the panel with results directly
   */
  function openWithResults(data) {
    if (isOpen) {
      closePanel();
    }

    injectStyles();

    const dark = isDarkMode();

    const overlay = document.createElement("div");
    overlay.className = "brandalyze-profile-overlay";
    overlay.addEventListener("click", closePanel);

    const panel = document.createElement("div");
    panel.className = `brandalyze-profile-panel${dark ? " dark" : ""}`;
    panel.innerHTML = `
      <div class="brandalyze-profile-header">
        <h2 class="brandalyze-profile-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Profile Analysis
        </h2>
        <button class="brandalyze-profile-close" aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="brandalyze-profile-body" id="brandalyze-panel-body">
        ${createResultsView(data, dark)}
      </div>
      <div class="brandalyze-profile-footer" id="brandalyze-panel-footer">
        <button class="brandalyze-profile-btn brandalyze-profile-btn-secondary" id="brandalyze-save-profile">
          Save Analysis
        </button>
        <button class="brandalyze-profile-btn brandalyze-profile-btn-primary" id="brandalyze-done-profile">
          Done
        </button>
      </div>
    `;

    panel.querySelector(".brandalyze-profile-close").addEventListener("click", closePanel);
    panel.querySelector("#brandalyze-done-profile").addEventListener("click", closePanel);
    panel.querySelector("#brandalyze-save-profile").addEventListener("click", () => saveAnalysis(data));

    panelElement = { overlay, panel };

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    requestAnimationFrame(() => {
      overlay.classList.add("visible");
      panel.classList.add("open");
    });

    isOpen = true;
    currentView = "results";
    document.body.style.overflow = "hidden";
  }

  /**
   * Close the panel
   */
  function closePanel() {
    if (!panelElement || !isOpen) return;

    const { overlay, panel } = panelElement;

    overlay.classList.remove("visible");
    panel.classList.remove("open");

    setTimeout(() => {
      overlay.remove();
      panel.remove();
      panelElement = null;
    }, 300);

    isOpen = false;
    currentView = "selection";
    selectedPosts = [];
    currentHandle = null;
    currentCallback = null;

    document.body.style.overflow = "";
  }

  // Expose API
  globalThis.BrandalyzeProfilePanel = {
    openForSelection,
    openWithResults,
    showResults,
    showLoading,
    close: closePanel,
    isOpen: () => isOpen,
  };
})();
