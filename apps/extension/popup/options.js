
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
        const data = await response.json();        if (response.ok && data.success && data.data) {
            return {
                email: data.data.email || 'Unknown user',
                displayName: data.data.display_name || data.data.email || 'Unknown user',
                subscriptionTier: data.data.subscription_tier || 'free',
                extensionEnabled: data.data.extension_enabled || false,
                requiresUpgrade: !data.data.extension_enabled
            };        } else {
            return {
                email: 'Unknown user',
                displayName: 'Unknown user',
                subscriptionTier: 'unknown',
                extensionEnabled: false,
                requiresUpgrade: true
            };
        }
    } catch (e) {
        console.error('❌ Fetch error:', e.message);
    }
    return {
        email: 'Unknown user',
        displayName: 'Unknown user',
        subscriptionTier: 'unknown',
        extensionEnabled: false,
        requiresUpgrade: true
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
        platformInfo: getElement('platformInfo'),        handleError: getElement('handleError'),
        handleSuccess: getElement('handleSuccess'),
        recentAnalysisSection: document.querySelector('.bg-white.border.border-gray-200.rounded-lg.p-6.mt-6'),
        viewTwitterAnalysis: getElement('viewTwitterAnalysis'),
        viewLinkedInAnalysis: getElement('viewLinkedInAnalysis')
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
        
        // Show loading state
        setButtonState(elements.saveAllHandlesBtn, true, 'Saving...');
        
        const handles = {};
        let hasValidHandle = false;
        
        // Twitter handle validation
        if (elements.twitterHandle) {
            const twitterVal = elements.twitterHandle.value.trim().replace(/^@/, '');
            if (twitterVal) {
                if (!/^\w{1,15}$/.test(twitterVal)) {
                    setText(elements.handleError, 'Invalid Twitter handle format (1-15 characters, letters/numbers/underscore only)');
                    showElement(elements.handleError);
                    setButtonState(elements.saveAllHandlesBtn, false, 'Save All Handles');
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
            setButtonState(elements.saveAllHandlesBtn, false, 'Save All Handles');
            return;
        }
        
        try {
            await chrome.storage.local.set(handles);
            setText(elements.handleSuccess, 'All handles saved successfully!');
            showElement(elements.handleSuccess);
            setButtonState(elements.saveAllHandlesBtn, false, 'Save All Handles');
            
            // Auto-hide success message after 3 seconds
            setTimeout(() => {
                hideElement(elements.handleSuccess);
            }, 3000);
        } catch (error) {
            setText(elements.handleError, 'Failed to save handles');
            showElement(elements.handleError);
            setButtonState(elements.saveAllHandlesBtn, false, 'Save All Handles');
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
                action: 'getAuthState'
            });
            
            if (response.success && response.data.isAuthenticated) {
                updateAuthUI(response.data);
            } else {
                updateAuthUI({ isAuthenticated: false });
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
        
        if (authState.isAuthenticated && (authState.userInfo || authState.userData)) {
            // Authenticated state
            if (elements.statusDot) elements.statusDot.className = 'status-dot authenticated';
            setText(elements.statusText, 'Authenticated');
            
            // Use userInfo from extension token or userData from Clerk token
            const userInfo = authState.userInfo || authState.userData;
            
            if (userInfo) {
                const displayText = userInfo.display_name || userInfo.displayName || userInfo.email;
                setText(elements.userEmail, displayText);
                updateSubscriptionUI({
                    subscriptionTier: userInfo.subscription_tier || userInfo.subscriptionTier,
                    extensionEnabled: userInfo.extension_enabled || userInfo.extensionEnabled,
                    requiresUpgrade: !(userInfo.extension_enabled || userInfo.extensionEnabled)
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
        }    }    
    
    // Helper function to disable features for free users
    function disableFeaturesForFreeUser() {
        setButtonState(elements.saveAllHandlesBtn, true, 'Pro Feature - Save All Handles');
        setButtonState(elements.analyzeProfileBtn, true, 'Pro Feature - Analyze Profile');
        setButtonState(elements.testAnalysisBtn, true, 'Pro Feature - Test Analysis');
        
        if (elements.twitterHandle) elements.twitterHandle.disabled = true;
        if (elements.linkedinHandle) elements.linkedinHandle.disabled = true;
        
        // Hide recent analysis section for free users
        if (elements.recentAnalysisSection) hideElement(elements.recentAnalysisSection);
        if (elements.viewTwitterAnalysis) elements.viewTwitterAnalysis.disabled = true;
        if (elements.viewLinkedInAnalysis) elements.viewLinkedInAnalysis.disabled = true;
    }

    // Helper function to enable features for paid users
    function enableFeaturesForPaidUser() {
        setButtonState(elements.saveAllHandlesBtn, false, 'Save All Handles');
        setButtonState(elements.analyzeProfileBtn, false, 'Analyze Current Profile');
        setButtonState(elements.testAnalysisBtn, false, 'Test Analysis');
        
        if (elements.twitterHandle) elements.twitterHandle.disabled = false;
        if (elements.linkedinHandle) elements.linkedinHandle.disabled = false;
        
        // Show recent analysis section for paid users
        if (elements.recentAnalysisSection) showElement(elements.recentAnalysisSection);
        if (elements.viewTwitterAnalysis) elements.viewTwitterAnalysis.disabled = false;
        if (elements.viewLinkedInAnalysis) elements.viewLinkedInAnalysis.disabled = false;
    }
    
    // Event listeners
    if (elements.signInBtn) elements.signInBtn.addEventListener('click', openBrandalyzeApp);
    if (elements.refreshAuthBtn) elements.refreshAuthBtn.addEventListener('click', forceRefreshAuth);
    if (elements.saveAllHandlesBtn) elements.saveAllHandlesBtn.addEventListener('click', saveAllHandles);    
    if (elements.analyzeProfileBtn) elements.analyzeProfileBtn.addEventListener('click', analyzeProfile);
    if (elements.testAnalysisBtn) elements.testAnalysisBtn.addEventListener('click', testAnalysis);
    if (elements.viewLastAnalysisBtn) elements.viewLastAnalysisBtn.addEventListener('click', viewLastAnalysis);
    
    if (elements.upgradeLink) {        elements.upgradeLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: 'https://brandalyze.io/pricing' });
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
    
    // Platform Analysis Management
    async function viewPlatformAnalysis(platform) {
        try {
            // Get saved analyses for the platform
            const stored = await chrome.storage.local.get('saved_analyses');
            const savedAnalyses = stored.saved_analyses || [];
            
            // Find the most recent analysis for this platform
            const platformAnalysis = savedAnalyses
                .filter(item => item.platform === platform)
                .sort((a, b) => new Date(b.analyzed_at) - new Date(a.analyzed_at))[0];
            
            if (!platformAnalysis) {
                showPlatformAnalysisModal(platform, null);
                return;
            }
            
            // Get the full analysis data
            const analysisData = await chrome.storage.local.get(platformAnalysis.storage_key);
            const fullAnalysis = analysisData[platformAnalysis.storage_key];
            
            if (!fullAnalysis) {
                showPlatformAnalysisModal(platform, null);
                return;
            }
            
            showPlatformAnalysisModal(platform, fullAnalysis);
            
        } catch (error) {
            console.error('Failed to load platform analysis:', error);
            showPlatformAnalysisModal(platform, null, 'Failed to load analysis data');
        }
    }
    
    // Show platform analysis in a modal
    function showPlatformAnalysisModal(platform, analysisData, errorMessage = null) {
        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: white;
            border-radius: 12px;
            max-width: 600px;
            width: 90vw;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.25);
            position: relative;
        `;
        
        const platformDisplayName = platform === 'twitter' ? 'Twitter/X' : 'LinkedIn';
        const platformColor = platform === 'twitter' ? '#1d9bf0' : '#0a66c2';
        const platformIcon = platform === 'twitter' ? 
            `<svg viewBox="0 0 24 24" class="w-6 h-6 fill-current text-white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>` :
            `<svg viewBox="0 0 24 24" class="w-6 h-6 fill-current text-white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>`;
        
        let content = '';
        
        if (errorMessage) {
            content = `
                <div style="padding: 28px; text-align: center;">
                    <div style="background: ${platformColor}; color: white; padding: 16px; border-radius: 12px 12px 0 0; margin: -28px -28px 24px -28px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                        ${platformIcon}
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700;">${platformDisplayName} Analysis</h2>
                    </div>                    <div style="color: #ef4444; font-size: 16px; margin-bottom: 16px;">⚠️ Error</div>
                    <div style="color: #6b7280; margin-bottom: 24px;">${errorMessage}</div>
                    <button class="modal-close-btn" style="background: ${platformColor}; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Close</button>
                </div>
            `;
        } else if (!analysisData) {
            content = `
                <div style="padding: 28px; text-align: center;">
                    <div style="background: ${platformColor}; color: white; padding: 16px; border-radius: 12px 12px 0 0; margin: -28px -28px 24px -28px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                        ${platformIcon}
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700;">${platformDisplayName} Analysis</h2>
                    </div>                    <div style="color: #6b7280; font-size: 16px; margin-bottom: 16px;">📊 No Analysis Found</div>
                    <div style="color: #6b7280; margin-bottom: 24px;">No ${platformDisplayName} profile analysis has been run yet. Visit a profile on ${platformDisplayName} and click "Analyze Profile" to get started.</div>
                    <button class="modal-close-btn" style="background: ${platformColor}; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Close</button>
                </div>
            `;
        } else {
            // Display the analysis data
            const analysis = analysisData.analysis_data;
            const analyzedDate = new Date(analysisData.analyzed_at).toLocaleDateString();
            const analyzedTime = new Date(analysisData.analyzed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            content = `
                <div style="padding: 28px;">
                    <div style="background: ${platformColor}; color: white; padding: 16px; border-radius: 12px 12px 0 0; margin: -28px -28px 24px -28px; display: flex; align-items: center; justify-content: space-between;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${platformIcon}
                            <div>
                                <h2 style="margin: 0; font-size: 24px; font-weight: 700;">@${analysisData.profile_handle}</h2>
                                <div style="opacity: 0.9; font-size: 14px;">${platformDisplayName} Profile Analysis</div>
                            </div>
                        </div>
                        <button class="modal-close-x" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 18px;">×</button>
                    </div>
                    
                    <div style="text-align: center; margin-bottom: 20px; color: #6b7280; font-size: 14px;">
                        Analyzed on ${analyzedDate} at ${analyzedTime}
                    </div>
            `;
            
            // Display voice analysis if available
            if (analysis.voice_analysis) {
                const voice = analysis.voice_analysis;
                const confidence = Math.round((analysis.confidence_score || 0) * 100);
                const confidenceColor = confidence >= 75 ? '#10b981' : confidence >= 50 ? '#f59e0b' : '#ef4444';
                
                content += `
                    <div style="margin-bottom: 24px;">
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                            <div style="text-align: center; margin-bottom: 16px;">
                                <div style="font-size: 32px; font-weight: 700; color: ${confidenceColor};">${confidence}%</div>
                                <div style="color: #6b7280; font-size: 14px;">Analysis Confidence</div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                                <div style="text-align: center;">
                                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">TONE</div>
                                    <div style="font-weight: 600; color: #1f2937;">${voice.tone || 'Not specified'}</div>
                                </div>
                                <div style="text-align: center;">
                                    <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">STYLE</div>
                                    <div style="font-weight: 600; color: #1f2937;">${voice.style || 'Not specified'}</div>
                                </div>
                            </div>
                        </div>
                `;
                
                // Add content themes if available
                if (voice.content_themes && voice.content_themes.length > 0) {
                    content += `
                        <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                            <div style="font-weight: 600; color: #0369a1; margin-bottom: 8px; font-size: 14px;">Content Themes</div>
                            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                                ${voice.content_themes.slice(0, 5).map(theme => 
                                    `<span style="background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 12px; font-size: 12px;">${theme}</span>`
                                ).join('')}
                            </div>
                        </div>
                    `;
                }
                
                // Add communication patterns if available
                if (voice.communication_patterns && voice.communication_patterns.length > 0) {
                    content += `
                        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                            <div style="font-weight: 600; color: #166534; margin-bottom: 8px; font-size: 14px;">Communication Patterns</div>
                            <ul style="margin: 0; padding-left: 16px; color: #16a34a;">
                                ${voice.communication_patterns.slice(0, 3).map(pattern => 
                                    `<li style="font-size: 13px; margin-bottom: 4px;">${pattern}</li>`
                                ).join('')}
                            </ul>
                        </div>
                    `;
                }
                
                content += `</div>`;
            } else {
                // Legacy brand alignment display
                const score = Math.round((analysis.average_score || 0) * 100);
                const scoreColor = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                
                content += `
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; text-align: center;">
                        <div style="font-size: 32px; font-weight: 700; color: ${scoreColor}; margin-bottom: 8px;">${score}%</div>
                        <div style="color: #6b7280; font-size: 14px;">Brand Alignment Score</div>
                        <div style="color: #6b7280; font-size: 12px; margin-top: 8px;">
                            Based on ${analysis.posts_analyzed || 0} analyzed posts
                        </div>
                    </div>
                `;
            }
            
            content += `                    <div style="text-align: center; margin-top: 24px;">
                        <button class="modal-close-btn" style="background: ${platformColor}; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer;">Close</button>
                    </div>
                </div>
            `;
        }
          modal.innerHTML = content;
        overlay.appendChild(modal);
        overlay.className = 'modal-overlay';
          // Add event listeners for close buttons
        const closeButtons = modal.querySelectorAll('.modal-close-btn, .modal-close-x');
        for (const button of closeButtons) {
            button.addEventListener('click', () => {
                overlay.remove();
            });
        }
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
        
        document.body.appendChild(overlay);
    }
    
    // Add event listeners for platform analysis buttons
    const twitterAnalysisBtn = getElement('viewTwitterAnalysis');
    const linkedinAnalysisBtn = getElement('viewLinkedInAnalysis');
    
    if (twitterAnalysisBtn) {
        twitterAnalysisBtn.addEventListener('click', () => viewPlatformAnalysis('twitter'));
    }
    
    if (linkedinAnalysisBtn) {
        linkedinAnalysisBtn.addEventListener('click', () => viewPlatformAnalysis('linkedin'));
    }

    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    const contentTitle = document.getElementById('contentTitle');
    const contentSubtitle = document.getElementById('contentSubtitle');
    
    // Section content mapping
    const sectionData = {
        'account': {
            title: 'Account Status',
            subtitle: 'View your authentication status and subscription details'
        },
        'social-handles': {
            title: 'Social Media Handles',
            subtitle: 'Configure your handles for different social media platforms'
        },
        'analysis-history': {
            title: 'Analysis History',
            subtitle: 'View your most recent analyses for each platform'
        }
    };

    for (const item of navItems) {
        item.addEventListener('click', function() {
            const targetSection = this.dataset.section;
            
            // Update nav item styles
            for (const nav of navItems) {
                nav.style.background = 'transparent';
                nav.style.color = '#6b7280';
            }
            this.style.background = '#dbeafe';
            this.style.color = '#1e40af';

            // Show target section, hide others
            for (const section of contentSections) {
                section.classList.add('hidden');
            }
            const targetElement = document.getElementById(targetSection + '-section');
            if (targetElement) {
                targetElement.classList.remove('hidden');
            }

            // Update header
            if (sectionData[targetSection]) {
                contentTitle.textContent = sectionData[targetSection].title;
                contentSubtitle.textContent = sectionData[targetSection].subtitle;
            }
        });
    }
});