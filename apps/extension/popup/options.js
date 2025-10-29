// Options page JavaScript for Brandalyze Extension Settings

// Global variables
let currentUser = null;
let currentPlatform = null;

// DOM helper functions
function getElement(id) {
    return document.getElementById(id);
}

function showElement(element) {
    if (element) element.classList.remove('hidden');
}

function hideElement(element) {
    if (element) element.classList.add('hidden');
}

function setText(element, text) {
    if (element) element.textContent = text;
}

// Helper function to get tier classes
function getSubscriptionTierClasses(tier) {
    const tierLower = tier?.toLowerCase();
    if (tierLower === 'pro') {
        return 'bg-blue-100 text-blue-800 border-blue-200';
    } else if (tierLower === 'enterprise') {
        return 'bg-purple-100 text-purple-800 border-purple-200';
    }
    return 'bg-gray-100 text-gray-600 border-gray-200';
}

// Helper function to set button state
function setButtonState(button, disabled, text) {
    if (button) {
        button.disabled = disabled;
        button.textContent = text;
    }
}

// Fetch user info from backend after authentication
async function fetchUserInfo(apiUrl, jwt) {
    try {
        const response = await fetch(`${apiUrl}/extension/auth/verify/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
            }
        });
        const data = await response.json();
        if (response.ok && data.success && data.data) {
            return {
                email: data.data.email,
                subscriptionTier: data.data.subscription_tier,
                extensionEnabled: data.data.extension_enabled
            };
        } else if (response.status === 403 && data.error?.code === 'EXTENSION_REQUIRES_PAID_PLAN') {
            return {
                email: 'Unknown user',
                subscriptionTier: 'free',
                extensionEnabled: false,
                requiresUpgrade: true,
                error: data.error.message
            };
        }
        console.log('❌ Backend auth failed:', response.status, data);
    } catch (e) {
        console.error('❌ Fetch error:', e.message);
    }
    return {
        email: 'Unknown user',
        subscriptionTier: 'unknown',
        extensionEnabled: false
    };
}

// Open Brandalyze app for sign in
async function openBrandalyzeApp() {
    try {
        await chrome.runtime.sendMessage({
            action: 'openBrandalyzeApp'
        });
        globalThis.close();
    } catch (error) {
        console.error('Failed to open Brandalyze app:', error);
        alert('Please manually navigate to Brandalyze and sign in.');
    }
}

// Platform detection function
async function detectCurrentPlatform() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab.url;
        
        if (url.includes('twitter.com') || url.includes('x.com')) {
            return {
                platform: 'twitter',
                displayName: 'Twitter/X',
                handleKey: 'twitterHandle'
            };
        } else if (url.includes('linkedin.com')) {
            return {
                platform: 'linkedin',
                displayName: 'LinkedIn',
                handleKey: 'linkedinHandle'
            };
        }
        return null;
    } catch (error) {
        console.error('Platform detection error:', error);
        return null;
    }
}

// Main DOMContentLoaded handler
document.addEventListener('DOMContentLoaded', async () => {
    // Get all DOM elements
    const elements = {
        statusDot: getElement('statusDot'),
        statusText: getElement('statusText'),
        userEmail: getElement('userEmail'),
        subscriptionInfo: getElement('subscriptionInfo'),
        subscriptionTier: getElement('subscriptionTier'),
        upgradeNotice: getElement('upgradeNotice'),
        upgradeLink: getElement('upgradeLink'),
        loading: getElement('loading'),
        authenticatedContent: getElement('authenticatedContent'),
        unauthenticatedContent: getElement('unauthenticatedContent'),
        signInBtn: getElement('signInBtn'),
        cacheText: getElement('cacheText'),
        refreshAuthBtn: getElement('refreshAuthBtn'),
        twitterHandle: getElement('twitterHandle'),
        linkedinHandle: getElement('linkedinHandle'),
        saveAllHandlesBtn: getElement('saveAllHandlesBtn'),        
        analyzeProfileBtn: getElement('analyzeProfileBtn'),
        testAnalysisBtn: getElement('testAnalysisBtn'),
        viewLastAnalysisBtn: getElement('viewLastAnalysisBtn'),        
        analysisResults: getElement('analysisResults'),
        analysisContent: getElement('analysisContent'),
        platformInfo: getElement('platformInfo'),
        handleError: getElement('handleError'),
        handleSuccess: getElement('handleSuccess')
    };

    // Utility functions
    function showLoading() {
        showElement(elements.loading);
    }

    function hideLoading() {
        hideElement(elements.loading);
    }

    function clearMessages() {
        setText(elements.handleError, '');
        setText(elements.handleSuccess, '');
        hideElement(elements.handleError);
        hideElement(elements.handleSuccess);
    }

    // Update platform info display
    function updatePlatformInfo(platformInfo) {
        currentPlatform = platformInfo;
        
        if (platformInfo) {
            setText(elements.platformInfo, 
                `Currently detected platform: ${platformInfo.displayName}. ` +
                `You can analyze profiles and content on this platform.`
            );
        } else {
            setText(elements.platformInfo, 
                'No supported platform detected. Navigate to Twitter/X or LinkedIn to enable platform-specific features.'
            );
        }
    }

    // Load all saved handles
    async function loadAllHandles() {
        try {
            const result = await chrome.storage.local.get(['twitterHandle', 'linkedinHandle']);
            
            if (result.twitterHandle && elements.twitterHandle) {
                elements.twitterHandle.value = result.twitterHandle;
            }
            
            if (result.linkedinHandle && elements.linkedinHandle) {
                elements.linkedinHandle.value = result.linkedinHandle;
            }
        } catch (error) {
            console.error('Failed to load handles:', error);
        }
    }

    // Save all handles
    async function saveAllHandles() {
        clearMessages();
        
        const handles = {};
        let hasValidHandle = false;
        
        // Twitter handle validation
        if (elements.twitterHandle) {
            const twitterVal = elements.twitterHandle.value.trim().replace(/^@/, '');
            if (twitterVal) {
                if (!/^\w{1,15}$/.test(twitterVal)) {
                    setText(elements.handleError, 'Invalid Twitter handle format (1-15 characters, letters/numbers/underscore only)');
                    showElement(elements.handleError);
                    return;
                }
                handles.twitterHandle = twitterVal;
                hasValidHandle = true;
            }
        }
        
        // LinkedIn handle validation
        if (elements.linkedinHandle) {
            const linkedinVal = elements.linkedinHandle.value.trim().replace(/^(https?:\/\/)?(www\.)?linkedin\.com\/in\//, '');
            if (linkedinVal) {
                handles.linkedinHandle = linkedinVal;
                hasValidHandle = true;
            }
        }
        
        if (!hasValidHandle) {
            setText(elements.handleError, 'Please enter at least one handle');
            showElement(elements.handleError);
            return;
        }
        
        try {
            await chrome.storage.local.set(handles);
            setText(elements.handleSuccess, 'All handles saved successfully!');
            showElement(elements.handleSuccess);
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                hideElement(elements.handleSuccess);
            }, 3000);
        } catch (error) {
            setText(elements.handleError, 'Failed to save handles');
            showElement(elements.handleError);
            console.error('Save handles error:', error);
        }
    }    
    
    // Test analysis function
    async function testAnalysis() {
        clearMessages();
        
        if (!currentPlatform) {
            setText(elements.handleError, 'Please navigate to a supported platform (Twitter/X or LinkedIn) to test analysis');
            showElement(elements.handleError);
            return;
        }
        
        const handleKey = currentPlatform.handleKey;
        const result = await chrome.storage.local.get([handleKey]);
        const handle = result[handleKey];
        
        if (!handle) {
            setText(elements.handleError, `Please configure your ${currentPlatform.displayName} handle first`);
            showElement(elements.handleError);
            return;
        }
        
        // Show loading state
        showLoading();
        setButtonState(elements.testAnalysisBtn, true, 'Testing...');
        
        try {
            // Test with a sample post analysis first
            const testContent = currentPlatform.platform === 'twitter' 
                ? `Sample tweet about business innovation and growth strategies #business #innovation`
                : `Professional post about industry insights and market trends`;
                
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeContent',
                data: {
                    content: testContent,
                    platform: currentPlatform.platform
                }
            });
            
            if (response.success) {
                const score = Math.round(response.data.alignment_score * 100);
                setText(elements.handleSuccess, 
                    `✅ Test successful! Extension is working properly. ` +
                    `Sample content alignment: ${score}%. Ready to analyze @${handle} profile.`
                );
                showElement(elements.handleSuccess);
                
                // Auto-hide success message after 5 seconds
                setTimeout(() => {
                    hideElement(elements.handleSuccess);
                }, 5000);
            } else {
                throw new Error(response.error || 'Test analysis failed');
            }        
        } catch (error) {
            console.error('Test analysis error:', error);
            let errorMessage = 'Test failed. Please check your setup.';
            
            if (error.message.includes('EXTENSION_REQUIRES_PAID_PLAN')) {
                errorMessage = 'Testing requires Pro or Enterprise subscription';
            } else if (error.message.includes('sign in')) {
                errorMessage = 'Please sign in to Brandalyze to test analysis';
            } else if (error.message.includes('NO_BRAND_FOUND')) {
                errorMessage = 'No brand found. Create a brand at Brandalyze first.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setText(elements.handleError, errorMessage);
            showElement(elements.handleError);
        } finally {
            hideLoading();
            setButtonState(elements.testAnalysisBtn, false, 'Test Analysis');
        }
    }

    // View last analysis function
    async function viewLastAnalysis() {
        clearMessages();
        
        try {
            const result = await chrome.storage.local.get(['lastAnalysis']);
            const analysis = result.lastAnalysis;
            
            if (!analysis) {
                setText(elements.handleError, 'No analysis results found. Run an analysis first.');
                showElement(elements.handleError);
                return;
            }
            
            // Check if analysis is recent (within 24 hours)
            const analysisAge = Date.now() - analysis.timestamp;
            const hoursAgo = Math.round(analysisAge / (1000 * 60 * 60));
              let content = `
                <div class="space-y-3">
                    <div class="flex justify-between items-center">
                        <strong>@${analysis.handle} Analysis</strong>
                        <span class="text-xs text-gray-500">${hoursAgo}h ago</span>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">Platform:</span>
                            <span class="font-medium">${analysis.platform || 'Unknown'}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Posts Analyzed:</span>
                            <span class="font-medium">${analysis.posts_analyzed || 0}</span>
                        </div>
                    </div>
            `;
            
            // Check if this is voice analysis or alignment analysis
            if (analysis.voice_analysis) {
                // Voice Analysis Display
                const voice = analysis.voice_analysis;
                content += `
                    <div class="bg-white p-3 rounded border">
                        <div class="text-center mb-3">
                            <div class="text-2xl font-bold text-green-600">${Math.round(analysis.confidence_score * 100)}%</div>
                            <div class="text-sm text-gray-600">Analysis Confidence</div>
                        </div>
                        <div class="space-y-2 text-sm">
                            <div><strong>Tone:</strong> ${voice.tone}</div>
                            <div><strong>Style:</strong> ${voice.style}</div>
                        </div>
                    </div>
                    
                    <div class="bg-blue-50 p-3 rounded border">
                        <strong class="text-sm text-blue-900">Content Themes:</strong>
                        <ul class="text-sm text-blue-800 mt-1 space-y-1">`;
                for (const theme of voice.content_themes.slice(0, 3)) {
                    content += `<li>• ${theme}</li>`;
                }
                content += `</ul></div>
                    
                    <div class="bg-green-50 p-3 rounded border">
                        <strong class="text-sm text-green-900">Communication Patterns:</strong>
                        <ul class="text-sm text-green-800 mt-1 space-y-1">`;
                for (const pattern of voice.communication_patterns.slice(0, 3)) {
                    content += `<li>• ${pattern}</li>`;
                }
                content += `</ul></div>`;
                
                // Add brand recommendations
                if (analysis.brand_recommendations && analysis.brand_recommendations.length > 0) {
                    content += `
                        <div class="bg-yellow-50 p-3 rounded border">
                            <strong class="text-sm text-yellow-900">Brand Recommendations:</strong>
                            <ul class="text-sm text-yellow-800 mt-1 space-y-1">`;
                    for (const rec of analysis.brand_recommendations.slice(0, 2)) {
                        content += `<li>• ${rec}</li>`;
                    }
                    content += `</ul></div>`;
                }
            } else {
                // Legacy Brand Alignment Display
                content += `
                    <div class="bg-white p-3 rounded border">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">${Math.round(analysis.average_score * 100)}%</div>
                            <div class="text-sm text-gray-600">Brand Alignment Score</div>
                        </div>
                    </div>
                `;
            }
              // Add insights if available (for legacy alignment analysis)
            if (!analysis.voice_analysis && analysis.overall_insights && analysis.overall_insights.length > 0) {
                content += `
                    <div>
                        <strong class="text-sm">Key Insights:</strong>
                        <ul class="text-sm text-gray-600 mt-1 space-y-1">`;
                for (const insight of analysis.overall_insights) {
                    content += `<li>• ${insight}</li>`;
                }
                content += `</ul></div>`;
            }
            
            content += `</div>`;
            
            elements.analysisContent.innerHTML = content;
            showElement(elements.analysisResults);
            
            // Scroll to results
            elements.analysisResults.scrollIntoView({ behavior: 'smooth' });
            
        } catch (error) {
            console.error('Error viewing last analysis:', error);
            setText(elements.handleError, 'Failed to load analysis results');
            showElement(elements.handleError);
        }
    }

    // Analyze profile function
    async function analyzeProfile() {
        clearMessages();
        
        if (!currentPlatform) {
            setText(elements.handleError, 'Please navigate to a supported platform to analyze profiles');
            showElement(elements.handleError);
            return;
        }
        
        const handleKey = currentPlatform.handleKey;
        const result = await chrome.storage.local.get([handleKey]);
        const handle = result[handleKey];
        
        if (!handle) {
            setText(elements.handleError, `Please configure your ${currentPlatform.displayName} handle first`);
            showElement(elements.handleError);
            return;
        }
        
        // Show loading state
        showLoading();
        setButtonState(elements.analyzeProfileBtn, true, 'Analyzing...');
        
        try {
            // Call backend analysis API through background script
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeProfile',
                data: {
                    handle: handle,
                    platform: currentPlatform.platform,
                    posts_count: 10
                }
            });
              if (response.success) {
                const analysisData = response.data;
                
                // Handle voice analysis vs alignment analysis
                if (analysisData.voice_analysis) {
                    // Voice analysis response
                    setText(elements.handleSuccess, 
                        `✅ Voice analysis completed! Confidence: ${Math.round(analysisData.confidence_score * 100)}%. ` +
                        `Tone: ${analysisData.voice_analysis.tone}`
                    );
                } else {
                    // Legacy alignment analysis response
                    setText(elements.handleSuccess, 
                        `✅ Analysis completed! ${analysisData.posts_analyzed} posts analyzed. ` +
                        `Average brand alignment: ${Math.round(analysisData.average_score * 100)}%`
                    );
                }
                
                showElement(elements.handleSuccess);
                
                // Store analysis result for potential display
                await chrome.storage.local.set({
                    lastAnalysis: {
                        ...analysisData,
                        timestamp: Date.now()
                    }
                });
                
                // Show insights if available
                if (analysisData.overall_insights && analysisData.overall_insights.length > 0) {
                    setTimeout(() => {
                        setText(elements.handleSuccess, 
                            elements.handleSuccess.textContent + '\n' + 
                            analysisData.overall_insights.slice(0, 2).join('. ')
                        );
                    }, 1000);
                }
                
                // Auto-hide success message after 8 seconds
                setTimeout(() => {
                    hideElement(elements.handleSuccess);
                }, 8000);
            } else {
                throw new Error(response.error || 'Analysis failed');
            }        
        } catch (error) {
            console.error('Profile analysis error:', error);
            let errorMessage = 'Failed to analyze profile';
            
            // Provide specific error messages based on backend response
            if (error.message.includes('EXTENSION_REQUIRES_PAID_PLAN')) {
                errorMessage = 'Profile analysis requires Pro or Enterprise subscription';
            } else if (error.message.includes('DAILY_LIMIT_EXCEEDED')) {
                errorMessage = 'Daily analysis limit reached. Upgrade for higher limits.';
            } else if (error.message.includes('NO_BRAND_FOUND')) {
                errorMessage = 'No brand found. Please create a brand at Brandalyze first.';
            } else if (error.message.includes('sign in')) {
                errorMessage = 'Authentication failed. Please sign in to Brandalyze.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            setText(elements.handleError, errorMessage);
            showElement(elements.handleError);
        } finally {
            hideLoading();
            setButtonState(elements.analyzeProfileBtn, false, 'Analyze Current Profile');
        }
    }

    // Check authentication
    async function checkAuth() {
        showLoading();
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'checkClerkAuth'
            });
            
            if (response.success) {
                updateAuthUI(response.data);
            } else {
                updateAuthUI({ isAuthenticated: false });
                console.error('Auth check failed:', response.error);
            }
        } catch (error) {
            hideLoading();
            updateAuthUI({ isAuthenticated: false });
            console.error('Auth check error:', error);
        }
    }

    // Force refresh authentication
    async function forceRefreshAuth() {
        showLoading();
        setText(elements.cacheText, 'Refreshing...');
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'forceAuthRefresh'
            });
            
            if (response.success) {
                updateAuthUI(response.data);
            } else {
                updateAuthUI({ isAuthenticated: false });
                console.error('Force refresh failed:', response.error);
            }
        } catch (error) {
            hideLoading();
            updateAuthUI({ isAuthenticated: false });
            console.error('Force refresh error:', error);
        }
    }

    // Update authentication UI
    function updateAuthUI(authState) {
        hideLoading();
        
        // Show cache status
        if (authState.lastChecked) {
            const age = Math.round((Date.now() - authState.lastChecked) / 1000);
            setText(elements.cacheText, `Auth cached (${age}s ago)`);
        } else {
            setText(elements.cacheText, 'Fresh auth check');
        }
        
        if (authState.isAuthenticated && authState.userData) {
            // Authenticated state
            if (elements.statusDot) elements.statusDot.className = 'status-dot authenticated';
            setText(elements.statusText, 'Authenticated');
            
            // Handle user info
            if (authState.apiUrl && authState.jwt) {
                fetchUserInfo(authState.apiUrl, authState.jwt).then(userInfo => {
                    setText(elements.userEmail, userInfo.email);
                    updateSubscriptionUI(userInfo);
                });
            }
            
            showElement(elements.authenticatedContent);
            hideElement(elements.unauthenticatedContent);
            
            // Load handles and detect platform
            loadAllHandles();
            detectCurrentPlatform().then(updatePlatformInfo);
        } else {
            // Unauthenticated state
            if (elements.statusDot) elements.statusDot.className = 'status-dot unauthenticated';
            setText(elements.statusText, 'Not authenticated');
            setText(elements.userEmail, 'Please sign in to continue');
            
            hideElement(elements.authenticatedContent);
            showElement(elements.unauthenticatedContent);
        }
    }    
    
    // Update subscription UI and disable features for free users
    function updateSubscriptionUI(userInfo) {
        updateSubscriptionDisplay(userInfo);
        updateFeatureAccess(userInfo);
    }

    // Helper function to update subscription display
    function updateSubscriptionDisplay(userInfo) {
        if (userInfo.subscriptionTier && elements.subscriptionTier) {
            setText(elements.subscriptionTier, userInfo.subscriptionTier);
            
            let tierClasses = getSubscriptionTierClasses(userInfo.subscriptionTier);
            elements.subscriptionTier.className = `inline-block px-3 py-1 rounded text-sm font-medium uppercase border ${tierClasses}`;
            showElement(elements.subscriptionInfo);
        }
    }

    // Helper function to update feature access
    function updateFeatureAccess(userInfo) {
        const isFreeUser = userInfo.requiresUpgrade || userInfo.subscriptionTier?.toLowerCase() === 'free';
        
        if (isFreeUser) {
            showElement(elements.upgradeNotice);
            disableFeaturesForFreeUser();
        } else {
            hideElement(elements.upgradeNotice);
            enableFeaturesForPaidUser();
        }
    }    
    
    // Helper function to disable features for free users
    function disableFeaturesForFreeUser() {
        setButtonState(elements.saveAllHandlesBtn, true, 'Pro Feature - Save All Handles');
        setButtonState(elements.analyzeProfileBtn, true, 'Pro Feature - Analyze Profile');
        setButtonState(elements.testAnalysisBtn, true, 'Pro Feature - Test Analysis');
        
        if (elements.twitterHandle) elements.twitterHandle.disabled = true;
        if (elements.linkedinHandle) elements.linkedinHandle.disabled = true;
    }

    // Helper function to enable features for paid users
    function enableFeaturesForPaidUser() {
        setButtonState(elements.saveAllHandlesBtn, false, 'Save All Handles');
        setButtonState(elements.analyzeProfileBtn, false, 'Analyze Current Profile');
        setButtonState(elements.testAnalysisBtn, false, 'Test Analysis');
        
        if (elements.twitterHandle) elements.twitterHandle.disabled = false;
        if (elements.linkedinHandle) elements.linkedinHandle.disabled = false;
    }
    
    // Event listeners
    if (elements.signInBtn) elements.signInBtn.addEventListener('click', openBrandalyzeApp);
    if (elements.refreshAuthBtn) elements.refreshAuthBtn.addEventListener('click', forceRefreshAuth);
    if (elements.saveAllHandlesBtn) elements.saveAllHandlesBtn.addEventListener('click', saveAllHandles);    
    if (elements.analyzeProfileBtn) elements.analyzeProfileBtn.addEventListener('click', analyzeProfile);
    if (elements.testAnalysisBtn) elements.testAnalysisBtn.addEventListener('click', testAnalysis);
    if (elements.viewLastAnalysisBtn) elements.viewLastAnalysisBtn.addEventListener('click', viewLastAnalysis);
    
    if (elements.upgradeLink) {
        elements.upgradeLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'http://localhost:3000/pricing' });
            globalThis.close();
        });
    }
    
    // Auto-save handles on Enter key
    if (elements.twitterHandle) {
        elements.twitterHandle.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !elements.saveAllHandlesBtn.disabled) {
                saveAllHandles();
            }
        });
    }
    
    if (elements.linkedinHandle) {
        elements.linkedinHandle.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !elements.saveAllHandlesBtn.disabled) {
                saveAllHandles();
            }
        });
    }    // Initial setup
    const platformInfo = await detectCurrentPlatform();
    updatePlatformInfo(platformInfo);
    await checkAuth();
    await loadRecentAnalyses(); // Load recent analyses
    
    // Recent Analyses Management
    async function loadRecentAnalyses() {
        try {
            const stored = await chrome.storage.local.get(['recentAnalyses']);
            const recentAnalyses = stored.recentAnalyses || [];
            
            const noAnalysesMessage = getElement('noAnalysesMessage');
            const recentAnalysesList = getElement('recentAnalysesList');
            
            if (recentAnalyses.length === 0) {
                showElement(noAnalysesMessage);
                hideElement(recentAnalysesList);
                return;
            }
            
            hideElement(noAnalysesMessage);
            showElement(recentAnalysesList);
            
            recentAnalysesList.innerHTML = recentAnalyses.map(analysis => {
                const date = new Date(analysis.timestamp).toLocaleDateString();
                const time = new Date(analysis.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                let resultSummary = '';
                if (analysis.type === 'voice_analysis' && analysis.result.voice_analysis) {
                    const confidence = Math.round((analysis.result.confidence_score || 0) * 100);
                    resultSummary = `Voice Analysis - ${confidence}% confidence`;
                } else if (analysis.result.alignment_score !== undefined) {
                    const score = Math.round(analysis.result.alignment_score * 100);
                    resultSummary = `Brand Alignment - ${score}%`;
                } else {
                    resultSummary = 'Analysis completed';
                }
                
                return `
                    <div class="border border-gray-200 rounded-lg p-4 bg-white">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex items-center gap-2">
                                <div class="text-sm font-medium text-gray-800">@${analysis.handle}</div>
                                <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">${analysis.platform}</span>
                            </div>
                            <div class="text-xs text-gray-500">${date} ${time}</div>
                        </div>
                        <div class="text-sm text-gray-600 mb-3">${resultSummary}</div>
                        <button 
                            class="text-xs text-blue-600 hover:text-blue-800 underline" 
                            onclick="viewAnalysisDetails(${analysis.id})"
                        >
                            View Details
                        </button>
                    </div>
                `;
            }).join('');
            
        } catch (error) {
            console.error('Failed to load recent analyses:', error);
        }    }

    async function clearAnalysisHistory() {
        if (confirm('Are you sure you want to clear all analysis history?')) {
            try {
                await chrome.storage.local.remove(['recentAnalyses']);
                await loadRecentAnalyses();
            } catch (error) {
                console.error('Failed to clear history:', error);
            }
        }
    }    // Add event listener for clear history button
    if (getElement('clearHistoryBtn')) {
        getElement('clearHistoryBtn').addEventListener('click', clearAnalysisHistory);
    }
});

// Make viewAnalysisDetails globally accessible for HTML onclick handlers
globalThis.viewAnalysisDetails = async function(analysisId) {
    try {
        const stored = await chrome.storage.local.get(['recentAnalyses']);
        const recentAnalyses = stored.recentAnalyses || [];
        const analysis = recentAnalyses.find(a => a.id === analysisId);
        
        if (!analysis) {
            alert('Analysis not found');
            return;
        }
        
        // Create a detailed view modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            padding: 24px;
            border-radius: 12px;
            max-width: 500px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        `;
        
        let detailsHtml = '';
        if (analysis.type === 'voice_analysis' && analysis.result.voice_analysis) {
            const voice = analysis.result.voice_analysis;
            const confidence = Math.round((analysis.result.confidence_score || 0) * 100);
            
            detailsHtml = `
                <h3>@${analysis.handle} Voice Analysis</h3>
                <div>
                    <div>
                        <div>Confidence: ${confidence}%</div>
                        <div>${analysis.result.posts_analyzed || 0} posts analyzed</div>
                    </div>
                    <div>
                        <div>Tone & Style</div>
                        <div>${voice.tone || 'Not specified'}</div>
                        <div>${voice.style || 'Not specified'}</div>
                    </div>
                    ${voice.content_themes && voice.content_themes.length > 0 ? `
                        <div>
                            <div>Content Themes</div>
                            <ul>
                                ${voice.content_themes.slice(0, 3).map(theme => `<li>${theme}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            const score = Math.round((analysis.result.alignment_score || 0) * 100);
            detailsHtml = `
                <h3>@${analysis.handle} Brand Analysis</h3>
                <div>Brand Alignment: ${score}%</div>
            `;
        }
        
        content.innerHTML = `
            ${detailsHtml}
            <div style="margin-top: 24px; text-align: center;">
                <button onclick="this.closest('div').remove()">Close</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
    } catch (error) {
        console.error('Failed to view analysis details:', error);
        alert('Failed to load analysis details');
    }
};
