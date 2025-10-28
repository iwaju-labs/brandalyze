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

document.addEventListener('DOMContentLoaded', async () => {
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    const userEmail = document.getElementById('userEmail');
    const subscriptionInfo = document.getElementById('subscriptionInfo');
    const subscriptionTier = document.getElementById('subscriptionTier');
    const upgradeNotice = document.getElementById('upgradeNotice');
    const upgradeLink = document.getElementById('upgradeLink');
    const loading = document.getElementById('loading');
    const authenticatedContent = document.getElementById('authenticatedContent');
    const unauthenticatedContent = document.getElementById('unauthenticatedContent');
    const signInBtn = document.getElementById('signInBtn');
    const twitterHandle = document.getElementById('twitterHandle');
    const saveHandleBtn = document.getElementById('saveHandleBtn');
    const analyzeProfileBtn = document.getElementById('analyzeProfileBtn');
    const handleError = document.getElementById('handleError');
    const handleSuccess = document.getElementById('handleSuccess');

    let currentUser = null;

    // Show loading state
    function showLoading() {
        loading.classList.add('show');
    }

    // Hide loading state
    function hideLoading() {
        loading.classList.remove('show');
    }

    // Clear messages
    function clearMessages() {
        handleError.textContent = '';
        handleSuccess.textContent = '';
    }    // Update UI based on authentication state
    function updateAuthUI(authState) {
        hideLoading();
          console.log('🔐 Auth check:', authState.isAuthenticated ? 'authenticated' : 'not authenticated');
        console.log('📧 Has apiUrl/jwt:', !!(authState.apiUrl && authState.jwt));
        
        if (authState.isAuthenticated && authState.userData) {
            currentUser = authState.userData;
            
            statusDot.className = 'status-dot authenticated';
            statusText.textContent = 'Authenticated';
              // Show user email from backend if possible
            let email = 'Unknown user';
            if (authState.apiUrl && authState.jwt) {
                console.log('📞 Calling backend for user email...');
                fetchUserInfo(authState.apiUrl, authState.jwt).then(userInfo => {
                    console.log('✅ Got user info:', userInfo);
                    userEmail.textContent = userInfo.email;
                    
                    // Show subscription tier
                    if (userInfo.subscriptionTier) {
                        subscriptionTier.textContent = userInfo.subscriptionTier;
                        subscriptionTier.className = `subscription-tier ${userInfo.subscriptionTier}`;
                        subscriptionInfo.style.display = 'block';
                    }
                    
                    // Show upgrade notice if needed
                    if (userInfo.requiresUpgrade) {
                        upgradeNotice.style.display = 'block';
                        // Disable extension features
                        twitterHandle.disabled = true;
                        saveHandleBtn.disabled = true;
                        analyzeProfileBtn.disabled = true;
                    } else {
                        upgradeNotice.style.display = 'none';
                        // Enable extension features
                        twitterHandle.disabled = false;
                        saveHandleBtn.disabled = false;
                        analyzeProfileBtn.disabled = false;
                    }
                });
            } else {
                console.log('⚠️ Using fallback email extraction');
                if (currentUser.email && currentUser.email !== 'Unknown') {
                    email = currentUser.email;
                } else if (currentUser.primary_email_address) {
                    email = currentUser.primary_email_address;
                } else if (currentUser.fullName && currentUser.fullName !== 'Unknown User') {
                    email = currentUser.fullName;
                }
                userEmail.textContent = email;
            }
            
            authenticatedContent.style.display = 'block';
            unauthenticatedContent.style.display = 'none';
            
            // Load saved handle
            loadSavedHandle();
        } else {
            console.log('Not authenticated or no user data'); // Debug log
            statusDot.className = 'status-dot unauthenticated';
            statusText.textContent = 'Not authenticated';
            userEmail.textContent = 'Please sign in to continue';
            
            authenticatedContent.style.display = 'none';
            unauthenticatedContent.style.display = 'block';
        }
    }

    // Load saved Twitter handle
    async function loadSavedHandle() {
        try {
            const result = await chrome.storage.local.get(['twitterHandle']);
            if (result.twitterHandle) {
                twitterHandle.value = result.twitterHandle;
                analyzeProfileBtn.style.display = 'block';
            }
        } catch (error) {
            console.error('Failed to load saved handle:', error);
        }
    }

    // Save Twitter handle
    async function saveHandle() {
        clearMessages();
        
        const handle = twitterHandle.value.trim().replace(/^@/, '');
        
        if (!handle) {
            handleError.textContent = 'Please enter a Twitter handle';
            return;
        }
        
        if (!/^[a-zA-Z0-9_]{1,15}$/.test(handle)) {
            handleError.textContent = 'Invalid Twitter handle format';
            return;
        }
        
        try {
            await chrome.storage.local.set({ twitterHandle: handle });
            handleSuccess.textContent = 'Handle saved successfully!';
            analyzeProfileBtn.style.display = 'block';
        } catch (error) {
            handleError.textContent = 'Failed to save handle';
            console.error('Save handle error:', error);
        }
    }

    // Analyze Twitter profile
    async function analyzeProfile() {
        const handle = twitterHandle.value.trim().replace(/^@/, '');
        
        if (!handle) {
            handleError.textContent = 'Please enter a Twitter handle first';
            return;
        }
        
        try {
            // Open Twitter profile page
            const twitterUrl = `https://twitter.com/${handle}`;
            await chrome.tabs.create({ url: twitterUrl });
            
            // Close popup
            globalThis.close();
        } catch (error) {
            handleError.textContent = 'Failed to open Twitter profile';
            console.error('Open profile error:', error);
        }
    }

    // Check authentication status
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

    // Open Brandalyze app for sign in
    async function openBrandalyzeApp() {
        try {
            await chrome.runtime.sendMessage({
                action: 'openBrandalyzeApp'
            });
            
            // Close popup after opening app
            globalThis.close();
        } catch (error) {
            console.error('Failed to open Brandalyze app:', error);
            alert('Please manually navigate to Brandalyze and sign in.');
        }
    }    // Event listeners
    signInBtn.addEventListener('click', openBrandalyzeApp);
    saveHandleBtn.addEventListener('click', saveHandle);
    analyzeProfileBtn.addEventListener('click', analyzeProfile);
    upgradeLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Open Brandalyze pricing page
        chrome.tabs.create({ url: 'http://localhost:3000/pricing' });
        globalThis.close();
    });
    
    // Save handle on Enter key
    twitterHandle.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveHandle();
        }
    });

    // Initial auth check
    await checkAuth();
});
