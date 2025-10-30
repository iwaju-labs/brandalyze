// Content script for the main Brandalyze site to sync authentication tokens
console.log('Brandalyze token sync script loaded');

// Function to get the current Clerk token
function getCurrentClerkToken() {
    try {
        if (typeof window !== 'undefined' && window.Clerk && window.Clerk.session) {
            const session = window.Clerk.session;
            if (session && typeof session.getToken === 'function') {
                return session.getToken();
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting Clerk token:', error);
        return null;
    }
}

// Function to sync token with extension
async function syncTokenWithExtension() {
    try {
        const token = getCurrentClerkToken();
        if (token) {
            const apiUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:8000/api' 
                : 'https://brandalyze.onrender.com/api';
                
            await chrome.runtime.sendMessage({
                action: 'updateStoredToken',
                data: {
                    token: token,
                    apiUrl: apiUrl
                }
            });
            console.log('Token synced with extension');
        }
    } catch (error) {
        console.error('Failed to sync token with extension:', error);
    }
}

// Sync token when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for Clerk to initialize
        setTimeout(syncTokenWithExtension, 2000);
    });
} else {
    // Page already loaded
    setTimeout(syncTokenWithExtension, 2000);
}

// Listen for Clerk authentication events
if (typeof window !== 'undefined') {
    // Check for Clerk initialization
    const checkClerkAndSync = () => {
        if (window.Clerk && window.Clerk.session) {
            syncTokenWithExtension();
            
            // Listen for auth state changes
            window.Clerk.addListener('session.updated', () => {
                console.log('Clerk session updated, syncing token...');
                setTimeout(syncTokenWithExtension, 1000);
            });
            
            window.Clerk.addListener('user.updated', () => {
                console.log('Clerk user updated, syncing token...');
                setTimeout(syncTokenWithExtension, 1000);
            });
        } else {
            // Retry after a short delay
            setTimeout(checkClerkAndSync, 1000);
        }
    };
    
    checkClerkAndSync();
}

// Periodically sync token (every 5 minutes)
setInterval(syncTokenWithExtension, 5 * 60 * 1000);
