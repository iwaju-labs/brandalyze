// Debug utility loaded from shared.js
debug.log("Audit panel loaded");

(function () {
  "use strict";

  let panelElement = null;
  let isOpen = false;

  /**
   * Inject panel styles
   */
  function injectStyles() {
    const styles = document.createElement("style");
    styles.id = "brandalyze-panel-styles";
    styles.textContent = `
        .brandalyze-panel-overlay {
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

        .brandalyze-panel-overlay.visible {
            opacity: 1;
            visibility: visible;
        }

        .brandalyze-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: 400px;
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

        .brandalyze-panel.open {
            transform: translate(0);
        }

        
      /* Dark mode */
      .brandalyze-panel.dark {
        background: rgb(21, 32, 43);
        color: rgb(247, 249, 249);
      }

      .brandalyze-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgb(239, 243, 244);
      }

      .brandalyze-panel.dark .brandalyze-panel-header {
        border-bottom-color: rgb(56, 68, 77);
      }

      .brandalyze-panel-title {
        font-size: 20px;
        font-weight: 700;
        margin: 0;
      }

      .brandalyze-panel-close {
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
      }

      .brandalyze-panel-close:hover {
        background: rgb(239, 243, 244);
      }

      .brandalyze-panel.dark .brandalyze-panel-close:hover {
        background: rgb(39, 51, 64);
      }

      .brandalyze-panel-close svg {
        width: 20px;
        height: 20px;
      }

      .brandalyze-panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }

      /* Score Section */
      .brandalyze-score-section {
        text-align: center;
        padding: 24px 0;
        border-bottom: 1px solid rgb(239, 243, 244);
        margin-bottom: 20px;
      }

      .brandalyze-panel.dark .brandalyze-score-section {
        border-bottom-color: rgb(56, 68, 77);
      }

      .brandalyze-score-circle {
        width: 120px;
        height: 120px;
        border-radius: 50%;
        margin: 0 auto 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }

      .brandalyze-score-circle svg {
        position: absolute;
        top: 0;
        left: 0;
        transform: rotate(-90deg);
      }

      .brandalyze-score-circle .score-bg {
        stroke: rgb(239, 243, 244);
      }

      .brandalyze-panel.dark .brandalyze-score-circle .score-bg {
        stroke: rgb(56, 68, 77);
      }

      .brandalyze-score-circle .score-fill {
        stroke-dasharray: 339.292;
        stroke-dashoffset: 339.292;
        transition: stroke-dashoffset 1s ease-out;
      }

      .brandalyze-score-value {
        font-size: 36px;
        font-weight: 700;
        z-index: 1;
      }

      .brandalyze-score-label {
        font-size: 14px;
        color: rgb(83, 100, 113);
      }

      .brandalyze-panel.dark .brandalyze-score-label {
        color: rgb(139, 152, 165);
      }

      .brandalyze-score-status {
        margin-top: 8px;
        font-size: 16px;
        font-weight: 600;
      }

      .brandalyze-score-status.excellent { color: rgb(0, 186, 124); }
      .brandalyze-score-status.good { color: rgb(29, 155, 240); }
      .brandalyze-score-status.needs-work { color: rgb(255, 173, 31); }
      .brandalyze-score-status.poor { color: rgb(244, 33, 46); }

      /* Metrics Grid */
      .brandalyze-metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 24px;
      }

      .brandalyze-metric-card {
        background: rgb(247, 249, 249);
        border-radius: 12px;
        padding: 14px;
        transition: all 0.2s ease;
      }

      .brandalyze-metric-card.expanded {
        grid-column: 1 / -1;
      }

      .brandalyze-panel.dark .brandalyze-metric-card {
        background: rgb(39, 51, 64);
      }

      .brandalyze-metric-label {
        font-size: 12px;
        color: rgb(83, 100, 113);
        margin-bottom: 4px;
      }

      .brandalyze-panel.dark .brandalyze-metric-label {
        color: rgb(139, 152, 165);
      }

      .brandalyze-metric-value {
        font-size: 24px;
        font-weight: 700;
      }

      .brandalyze-metric-bar {
        height: 4px;
        background: rgb(207, 217, 222);
        border-radius: 2px;
        margin-top: 8px;
        overflow: hidden;
      }

      .brandalyze-panel.dark .brandalyze-metric-bar {
        background: rgb(56, 68, 77);
      }

      .brandalyze-metric-bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.5s ease-out;
      }

      /* Metric Header with Tooltip */
      .brandalyze-metric-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 4px;
      }

      .brandalyze-metric-tooltip-trigger {
        cursor: help;
        opacity: 0.6;
        transition: opacity 0.2s;
      }

      .brandalyze-metric-tooltip-trigger:hover {
        opacity: 1;
      }

      /* Metric Improvement Expand */
      .brandalyze-metric-expand {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: rgb(29, 155, 240);
        cursor: pointer;
        margin-top: 10px;
        padding: 6px 10px;
        background: rgba(29, 155, 240, 0.08);
        border-radius: 6px;
        transition: background 0.2s, color 0.2s;
      }

      .brandalyze-metric-expand:hover {
        background: rgba(29, 155, 240, 0.15);
        color: rgb(26, 140, 216);
      }

      .brandalyze-panel.dark .brandalyze-metric-expand {
        background: rgba(29, 155, 240, 0.15);
      }

      .brandalyze-panel.dark .brandalyze-metric-expand:hover {
        background: rgba(29, 155, 240, 0.25);
      }

      .brandalyze-metric-expand svg {
        transition: transform 0.2s;
        flex-shrink: 0;
      }

      .brandalyze-metric-expand.expanded svg {
        transform: rotate(180deg);
      }

      .brandalyze-metric-improvements {
        margin-top: 10px;
        padding: 10px 12px;
        background: rgba(29, 155, 240, 0.05);
        border-radius: 8px;
        border-left: 3px solid rgb(29, 155, 240);
        max-height: 150px;
        overflow-y: auto;
      }

      .brandalyze-panel.dark .brandalyze-metric-improvements {
        background: rgba(29, 155, 240, 0.12);
      }

      .brandalyze-improvements-summary {
        font-size: 11px;
        font-weight: 600;
        color: rgb(29, 155, 240);
        margin-bottom: 6px;
        line-height: 1.3;
      }

      .brandalyze-improvements-list {
        margin: 0;
        padding-left: 14px;
        font-size: 11px;
        line-height: 1.4;
        color: rgb(83, 100, 113);
      }

      .brandalyze-panel.dark .brandalyze-improvements-list {
        color: rgb(170, 184, 194);
      }

      .brandalyze-improvements-list li {
        margin-bottom: 5px;
        padding-left: 2px;
      }

      .brandalyze-improvements-list li:last-child {
        margin-bottom: 0;
      }

      .brandalyze-improvements-list li::marker {
        color: rgb(29, 155, 240);
      }

      .brandalyze-metric-card.has-improvements {
        cursor: default;
      }

      /* Section Headers */
      .brandalyze-section {
        margin-bottom: 24px;
      }

      .brandalyze-section-header {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Deviations */
      .brandalyze-deviation {
        background: rgb(254, 249, 217);
        border-left: 3px solid rgb(255, 173, 31);
        border-radius: 0 8px 8px 0;
        padding: 12px;
        margin-bottom: 8px;
      }

      .brandalyze-panel.dark .brandalyze-deviation {
        background: rgb(51, 45, 30);
      }

      .brandalyze-deviation-phrase {
        font-weight: 600;
        margin-bottom: 4px;
      }

      .brandalyze-deviation-reason {
        font-size: 13px;
        color: rgb(83, 100, 113);
        margin-bottom: 4px;
      }

      .brandalyze-panel.dark .brandalyze-deviation-reason {
        color: rgb(139, 152, 165);
      }

      .brandalyze-deviation-suggestion {
        font-size: 13px;
        color: rgb(0, 186, 124);
      }

      /* X Tips */
      .brandalyze-tip {
        display: flex;
        gap: 12px;
        padding: 12px;
        background: rgb(247, 249, 249);
        border-radius: 8px;
        margin-bottom: 8px;
      }

      .brandalyze-panel.dark .brandalyze-tip {
        background: rgb(39, 51, 64);
      }

      .brandalyze-tip-icon {
        flex-shrink: 0;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .brandalyze-tip-icon.success { background: rgb(209, 250, 229); color: rgb(0, 186, 124); }
      .brandalyze-tip-icon.warning { background: rgb(254, 243, 199); color: rgb(255, 173, 31); }
      .brandalyze-tip-icon.error { background: rgb(254, 226, 226); color: rgb(244, 33, 46); }
      .brandalyze-tip-icon.info { background: rgb(219, 234, 254); color: rgb(29, 155, 240); }
      .brandalyze-tip-icon.suggestion { background: rgb(243, 232, 255); color: rgb(147, 51, 234); }

      .brandalyze-panel.dark .brandalyze-tip-icon.success { background: rgb(30, 70, 50); }
      .brandalyze-panel.dark .brandalyze-tip-icon.warning { background: rgb(51, 45, 30); }
      .brandalyze-panel.dark .brandalyze-tip-icon.error { background: rgb(70, 30, 30); }
      .brandalyze-panel.dark .brandalyze-tip-icon.info { background: rgb(30, 50, 70); }
      .brandalyze-panel.dark .brandalyze-tip-icon.suggestion { background: rgb(49, 30, 63); }

      .brandalyze-tip-content {
        flex: 1;
      }

      .brandalyze-tip-message {
        font-size: 14px;
        line-height: 1.4;
      }

      .brandalyze-tip-impact {
        font-size: 12px;
        color: rgb(83, 100, 113);
        margin-top: 4px;
      }

      .brandalyze-panel.dark .brandalyze-tip-impact {
        color: rgb(139, 152, 165);
      }

      /* Empty State */
      .brandalyze-empty {
        text-align: center;
        padding: 24px;
        color: rgb(83, 100, 113);
      }

      .brandalyze-panel.dark .brandalyze-empty {
        color: rgb(139, 152, 165);
      }

      /* AI Feedback Section */
      .brandalyze-ai-feedback {
        background: linear-gradient(135deg, rgb(239, 246, 255) 0%, rgb(243, 232, 255) 100%);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
      }

      .brandalyze-panel.dark .brandalyze-ai-feedback {
        background: linear-gradient(135deg, rgb(30, 41, 59) 0%, rgb(49, 30, 63) 100%);
      }

      .brandalyze-ai-feedback-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
        font-weight: 600;
        font-size: 14px;
      }

      .brandalyze-ai-feedback-content {
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
      }

      /* AI Metrics Grid (structured feedback) */
      .brandalyze-ai-metrics {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 12px;
      }

      .brandalyze-ai-metric-item {
        background: rgba(255, 255, 255, 0.6);
        border-radius: 8px;
        padding: 12px;
      }

      .brandalyze-panel.dark .brandalyze-ai-metric-item {
        background: rgba(0, 0, 0, 0.2);
      }

      .brandalyze-ai-metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;
      }

      .brandalyze-ai-metric-label {
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: rgb(83, 100, 113);
      }

      .brandalyze-panel.dark .brandalyze-ai-metric-label {
        color: rgb(139, 152, 165);
      }

      .brandalyze-ai-metric-score {
        font-weight: 700;
        font-size: 14px;
      }

      .brandalyze-ai-metric-feedback {
        font-size: 12px;
        line-height: 1.4;
        color: rgb(15, 20, 25);
      }

      .brandalyze-panel.dark .brandalyze-ai-metric-feedback {
        color: rgb(231, 233, 234);
      }

      .brandalyze-ai-suggestion {
        background: rgba(147, 51, 234, 0.1);
        border-left: 3px solid rgb(147, 51, 234);
        padding: 12px;
        border-radius: 0 8px 8px 0;
        font-size: 13px;
        line-height: 1.5;
      }

      .brandalyze-ai-suggestion strong {
        color: rgb(147, 51, 234);
      }

      /* Panel Footer */
      .brandalyze-panel-footer {
        padding: 16px 20px;
        border-top: 1px solid rgb(239, 243, 244);
        display: flex;
        gap: 12px;
      }

      .brandalyze-panel.dark .brandalyze-panel-footer {
        border-top-color: rgb(56, 68, 77);
      }

      .brandalyze-btn {
        flex: 1;
        padding: 12px 16px;
        border-radius: 9999px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: background-color 0.2s;
        border: none;
      }

      .brandalyze-btn-primary {
        background: rgb(29, 155, 240);
        color: white;
      }

      .brandalyze-btn-primary:hover {
        background: rgb(26, 140, 216);
      }

      .brandalyze-btn-secondary {
        background: transparent;
        border: 1px solid rgb(207, 217, 222);
        color: inherit;
      }

      .brandalyze-panel.dark .brandalyze-btn-secondary {
        border-color: rgb(56, 68, 77);
      }

      .brandalyze-btn-secondary:hover {
        background: rgb(239, 243, 244);
      }

      .brandalyze-panel.dark .brandalyze-btn-secondary:hover {
        background: rgb(39, 51, 64);
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * get score color based on value
   */
  function getScoreColor(score) {
    if (score >= 80) return "rgb(0, 186, 124)"; // green
    if (score >= 60) return "rgb(29, 155, 240)"; // blue
    if (score >= 40) return "rgb(255, 173, 31)"; // yellow
    return "rgb(244, 33, 46)";
  }

  function getScoreStatus(score) {
    if (score >= 80) return { text: "Excellent", class: "excellent" };
    if (score >= 60) return { text: "Good", class: "good" };
    if (score >= 40) return { text: "Needs Work", class: "needs-work" };
    return { text: "Poor", class: "poor" };
  }

  /**
   * Detect dark mode
   */
  function isDarkMode() {
    const bgColor = getComputedStyle(document.body).backgroundColor;
    if (bgColor) {
      const rgb = bgColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        const brightness =
          (Number.parseInt(rgb[0], 10) +
            Number.parseInt(rgb[1], 10) +
            Number.parseInt(rgb[2], 10)) /
          3;
        return brightness < 128;
      }
    }
    return false;
  }

  /**
   * Format AI feedback with structured display for HOOK/BODY/MEDIA/CLOSER format
   */
  function formatAiFeedback(feedback) {
    if (!feedback) return "";

    // Check if feedback follows the structured format
    const hookMatch = feedback.match(/HOOK:\s*(\d+)\s*\/\s*10\s*-\s*([^\n]+)/i);
    const bodyMatch = feedback.match(/BODY:\s*(\d+)\s*\/\s*10\s*-\s*([^\n]+)/i);
    const mediaMatch = feedback.match(
      /MEDIA:\s*(\d+)\s*\/\s*10\s*-\s*([^\n]+)/i
    );
    const closerMatch = feedback.match(
      /CLOSER:\s*(\d+)\s*\/\s*10\s*-\s*([^\n]+)/i
    );
    const suggestionMatch = feedback.match(/SUGGESTION:\s*([^\n]+)/i);

    // If structured format detected, render as cards
    if (hookMatch || bodyMatch || closerMatch) {
      const items = [];

      if (hookMatch) {
        items.push(createFeedbackItem("Hook", hookMatch[1], hookMatch[2]));
      }
      if (bodyMatch) {
        items.push(createFeedbackItem("Body", bodyMatch[1], bodyMatch[2]));
      }
      if (mediaMatch) {
        items.push(createFeedbackItem("Media", mediaMatch[1], mediaMatch[2]));
      }
      if (closerMatch) {
        items.push(
          createFeedbackItem("Closer", closerMatch[1], closerMatch[2])
        );
      }

      let html =
        '<div class="brandalyze-ai-metrics">' + items.join("") + "</div>";

      if (suggestionMatch) {
        html += `<div class="brandalyze-ai-suggestion">
          <strong>Suggestion:</strong> ${escapeHtml(suggestionMatch[1].trim())}
        </div>`;
      }

      return html;
    }

    // Fallback to plain text display
    return `<div class="brandalyze-ai-feedback-content">${escapeHtml(
      feedback
    )}</div>`;
  }

  /**
   * Create a feedback item for the structured AI analysis
   */
  function createFeedbackItem(label, score, feedback) {
    const numScore = Number.parseInt(score, 10);
    let color = "rgb(244, 33, 46)";
    if (numScore >= 7) {
      color = "rgb(0, 186, 124)";
    } else if (numScore >= 5) {
      color = "rgb(255, 173, 31)";
    }
    return `
      <div class="brandalyze-ai-metric-item">
        <div class="brandalyze-ai-metric-header">
          <span class="brandalyze-ai-metric-label">${escapeHtml(label)}</span>
          <span class="brandalyze-ai-metric-score" style="color: ${color}">${numScore}/10</span>
        </div>
        <div class="brandalyze-ai-metric-feedback">${escapeHtml(
          feedback.trim()
        )}</div>
      </div>
    `;
  }

  /**
   * Create the panel HTML
   */
  function createPanel(data) {
    injectStyles();

    const audit = data.audit || data;
    const metrics = audit.metrics || {};
    const score = Math.round(audit.score || 0);
    const scoreStatus = getScoreStatus(score);
    const scoreColor = getScoreColor(score);
    const deviations = metrics.deviations || [];
    const xOptimization = metrics.x_optimization || {};
    const tips = xOptimization.optimization_tips || xOptimization.tips || [];
    const aiFeedback = metrics.ai_feedback || null;
    const improvementSuggestions = metrics.improvement_suggestions || {};
    const dark = isDarkMode();
    const contentType = metrics.content_type || 'standard';
    
    // Use different labels for shitpost vs standard content
    const metricLabels = contentType === 'shitpost' 
      ? { tone: 'Personality', vocabulary: 'Entertainment', emotion: 'Authenticity', style: 'Engagement' }
      : { tone: 'Tone Match', vocabulary: 'Vocabulary', emotion: 'Emotion', style: 'Style' };

    // Calculate score circle offset
    const circumference = 339.292;
    const offset = circumference - (score / 100) * circumference;

    const overlay = document.createElement("div");
    overlay.className = "brandalyze-panel-overlay";
    overlay.addEventListener("click", closePanel);

    const panel = document.createElement("div");
    panel.className = `brandalyze-panel${dark ? " dark" : ""}`;
    panel.innerHTML = `
      <div class="brandalyze-panel-header">
        <h2 class="brandalyze-panel-title">Audit Results</h2>
        <button class="brandalyze-panel-close" aria-label="Close">
          <!-- Close/X icon for panel header -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <div class="brandalyze-panel-body">
        <!-- Score Section -->
        <div class="brandalyze-score-section">
          <div class="brandalyze-score-circle">
            <!-- Circular progress indicator for main brand voice score -->
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle class="score-bg" cx="60" cy="60" r="54" fill="none" stroke-width="8"/>
              <circle class="score-fill" cx="60" cy="60" r="54" fill="none" stroke-width="8" 
                      stroke="${scoreColor}" stroke-linecap="round"
                      style="stroke-dashoffset: ${offset}"/>
            </svg>
            <span class="brandalyze-score-value">${score}</span>
          </div>
          <div class="brandalyze-score-label">${contentType === 'shitpost' ? 'Shitpost Score' : 'Brand Voice Score'}</div>
          <div class="brandalyze-score-status ${scoreStatus.class}">${
      scoreStatus.text
    }</div>
        </div>

        <!-- Metrics Grid -->
        <div class="brandalyze-metrics-grid">
          ${createMetricCard(
            metricLabels.tone,
            metrics.tone_match,
            getScoreColor(metrics.tone_match),
            metrics.metric_tips?.tone_tip,
            improvementSuggestions?.tone
          )}
          ${createMetricCard(
            metricLabels.vocabulary,
            metrics.vocabulary_consistency,
            getScoreColor(metrics.vocabulary_consistency),
            metrics.metric_tips?.vocabulary_tip,
            improvementSuggestions?.vocabulary
          )}
          ${createMetricCard(
            metricLabels.emotion,
            metrics.emotional_alignment,
            getScoreColor(metrics.emotional_alignment),
            metrics.metric_tips?.emotion_tip,
            improvementSuggestions?.emotion
          )}
          ${createMetricCard(
            metricLabels.style,
            100 - (metrics.style_deviation || 0),
            getScoreColor(100 - (metrics.style_deviation || 0)),
            metrics.metric_tips?.style_tip,
            improvementSuggestions?.style
          )}
        </div>

        <!-- Deviations Section -->
        ${
          deviations.length > 0
            ? `
          <div class="brandalyze-section">
            <div class="brandalyze-section-header">
              <!-- Warning triangle icon for deviations section -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(255, 173, 31)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
                <path d="M12 9v4"/>
                <path d="M12 17h.01"/>
              </svg>
              Deviations Found
            </div>
            ${deviations
              .map(
                (d) => `
              <div class="brandalyze-deviation">
                <div class="brandalyze-deviation-phrase">"${escapeHtml(
                  d.phrase || d.text || ""
                )}"</div>
                <div class="brandalyze-deviation-reason">${escapeHtml(
                  d.reason || d.message || ""
                )}</div>
                ${
                  d.suggestion
                    ? `<div class="brandalyze-deviation-suggestion">Try: "${escapeHtml(
                        d.suggestion
                      )}"</div>`
                    : ""
                }
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }

        <!-- X Algorithm Tips -->
        ${
          tips.length > 0
            ? `
          <div class="brandalyze-section">
            <div class="brandalyze-section-header">
              <!-- X/Twitter logo icon for algorithm tips section -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Algorithm Tips
            </div>
            ${tips
              .map(
                (tip) => `
              <div class="brandalyze-tip">
                <div class="brandalyze-tip-icon ${tip.type || "info"}">
                  ${getTipIcon(tip.type)}
                </div>
                <div class="brandalyze-tip-content">
                  <div class="brandalyze-tip-message">${escapeHtml(
                    tip.message
                  )}</div>
                  ${
                    tip.impact
                      ? `<div class="brandalyze-tip-impact">Impact: ${tip.impact}</div>`
                      : ""
                  }
                </div>
              </div>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }

        <!-- AI Feedback Section -->
        ${
          aiFeedback
            ? `
          <div class="brandalyze-section">
            <div class="brandalyze-section-header">
              <!-- Lightbulb icon for AI analysis section -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(147, 51, 234)" stroke-width="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
              AI Analysis
            </div>
            <div class="brandalyze-ai-feedback">
              ${formatAiFeedback(aiFeedback)}
            </div>
          </div>
        `
            : ""
        }

        ${
          deviations.length === 0 && tips.length === 0 && !aiFeedback
            ? `
          <div class="brandalyze-empty">
            <!-- Check circle icon for empty state (no issues found) -->
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 12px;">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>Great job! No issues found.</div>
          </div>
        `
            : ""
        }
      </div>

      <div class="brandalyze-panel-footer">
        <button class="brandalyze-btn brandalyze-btn-secondary" id="brandalyze-copy-results">
          Copy Results
        </button>
        <button class="brandalyze-btn brandalyze-btn-primary" id="brandalyze-close-panel">
          Done
        </button>
      </div>
    `;

    // Add event listeners
    panel
      .querySelector(".brandalyze-panel-close")
      .addEventListener("click", closePanel);
    panel
      .querySelector("#brandalyze-close-panel")
      .addEventListener("click", closePanel);
    panel
      .querySelector("#brandalyze-copy-results")
      .addEventListener("click", () => copyResults(data));

    // Add expand/collapse listeners for improvement sections
    panel.querySelectorAll('.brandalyze-metric-expand').forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        const metricKey = trigger.dataset.metric;
        const improvements = document.getElementById(`improvements-${metricKey}`);
        const card = trigger.closest('.brandalyze-metric-card');
        if (improvements) {
          const isExpanded = improvements.style.display !== 'none';
          improvements.style.display = isExpanded ? 'none' : 'block';
          trigger.classList.toggle('expanded', !isExpanded);
          if (card) {
            card.classList.toggle('expanded', !isExpanded);
          }
        }
      });
    });

    // Store references
    panelElement = { overlay, panel };

    return panelElement;
  }

  /**
   * Create a metric card HTML
   */
  function createMetricCard(label, value, color, tip = null, suggestion = null) {
    const displayValue = Math.round(value || 0);
    const metricKey = label.toLowerCase().replace(/\s+/g, '_');
    const hasImprovements = suggestion && suggestion.improvements && suggestion.improvements.length > 0 && displayValue < 85;
    
    const tooltipHtml = tip
      ? `
      <div class="brandalyze-metric-tooltip-trigger" title="${escapeHtml(tip)}">
        <!-- Info/help icon for metric tooltip triggers -->
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
      </div>
    `
      : "";
    
    const improvementsHtml = hasImprovements
      ? `
      <div class="brandalyze-metric-expand" data-metric="${metricKey}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 9l6 6 6-6"/>
        </svg>
        How to improve
      </div>
      <div class="brandalyze-metric-improvements" id="improvements-${metricKey}" style="display: none;">
        <div class="brandalyze-improvements-summary">${escapeHtml(suggestion.summary || '')}</div>
        <ul class="brandalyze-improvements-list">
          ${suggestion.improvements.map(imp => `<li>${escapeHtml(imp)}</li>`).join('')}
        </ul>
      </div>
    `
      : "";
    
    return `
      <div class="brandalyze-metric-card ${hasImprovements ? 'has-improvements' : ''}">
        <div class="brandalyze-metric-header">
          <div class="brandalyze-metric-label">${label}</div>
          ${tooltipHtml}
        </div>
        <div class="brandalyze-metric-value" style="color: ${color}">${displayValue}</div>
        <div class="brandalyze-metric-bar">
          <div class="brandalyze-metric-bar-fill" style="width: ${displayValue}%; background: ${color}"></div>
        </div>
        ${improvementsHtml}
      </div>
    `;
  }

  /**
   * Get icon for tip type
   */
  function getTipIcon(type) {
    switch (type) {
      case "success":
        // Checkmark icon for success tips
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 13l4 4L19 7"/></svg>';
      case "warning":
        // Exclamation icon for warning tips
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v2m0 4h.01"/></svg>';
      case "error":
        // X/close icon for error tips
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>';
      case "info":
        // Info circle icon for info tips
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
      case "suggestion":
        // Chat bubble icon for suggestion tips
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 11h.01"/><path d="M16 11h.01"/><path d="M8 11h.01"/></svg>';
      default:
        // Default info icon
        return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>';
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Copy results to clipboard
   */
  function copyResults(data) {
    const audit = data.audit || data;
    const metrics = audit.metrics || {};
    const text = `Brand Voice Score: ${Math.round(audit.score || 0)}%
Tone Match: ${Math.round(metrics.tone_match || 0)}%
Vocabulary: ${Math.round(metrics.vocabulary_consistency || 0)}%
Emotion: ${Math.round(metrics.emotional_alignment || 0)}%
Style: ${Math.round(100 - (metrics.style_deviation || 0))}%`;

    navigator.clipboard.writeText(text).then(() => {
      const btn = document.querySelector("#brandalyze-copy-results");
      if (btn) {
        const originalText = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => {
          btn.textContent = originalText;
        }, 2000);
      }
    });
  }

  /**
   * Open the panel with data
   */
  function openPanel(data) {
    if (isOpen) {
      closePanel();
    }

    const { overlay, panel } = createPanel(data);
    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    // Trigger animations
    requestAnimationFrame(() => {
      overlay.classList.add("visible");
      panel.classList.add("open");
    });

    isOpen = true;

    // Prevent body scroll
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

    // Restore body scroll
    document.body.style.overflow = "";
  }

  // Expose API
  globalThis.BrandalyzeAuditPanel = {
    open: openPanel,
    close: closePanel,
    isOpen: () => isOpen,
  };
})();
