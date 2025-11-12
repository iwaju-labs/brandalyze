// Content script for the main Brandalyze site to sync authentication tokens
console.log('Brandalyze token sync script loaded');

// Function to get the current Clerk session (token + user data)
async function getCurrentClerkSession() {
    try {
        if (typeof window !== 'undefined' && window.Clerk && window.Clerk.session) {
            const session = window.Clerk.session;
            const user = window.Clerk.user;
            
            if (session && typeof session.getToken === 'function') {
                const token = await session.getToken();
                
                return {
                    token: token,
                    user: {
                        id: user?.id,
                        email: user?.primaryEmailAddress?.emailAddress,
                        firstName: user?.firstName,
                        lastName: user?.lastName,
                        fullName: user?.fullName,
                        imageUrl: user?.imageUrl
                    }
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting Clerk session:', error);
        return null;
    }
}

// Function to sync session with extension
async function syncSessionWithExtension() {
    try {
        const session = await getCurrentClerkSession();
        if (session && session.token) {
            const apiUrl = window.location.hostname === 'localhost' 
                ? 'http://localhost:8000/api' 
                : 'https://brandalyze.onrender.com/api';
                
            await chrome.runtime.sendMessage({
                action: 'syncClerkSession',
                data: {
                    clerkToken: session.token,
                    clerkUser: session.user,
                    apiUrl: apiUrl,
                    syncedAt: Date.now()
                }
            });
            console.log('Clerk session synced with extension');
        }
    } catch (error) {
        console.error('Failed to sync session with extension:', error);
    }
}

// Sync session when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit for Clerk to initialize
        setTimeout(syncSessionWithExtension, 2000);
    });
} else {
    // Page already loaded
    setTimeout(syncSessionWithExtension, 2000);
}

// Listen for Clerk authentication events
if (typeof globalThis.window !== 'undefined') {
    // Check for Clerk initialization
    const checkClerkAndSync = () => {
        if (globalThis.Clerk && globalThis.Clerk.session) {
            syncSessionWithExtension();
            
            // Listen for auth state changes
            globalThis.Clerk.addListener('session.updated', () => {
                console.log('Clerk session updated, syncing...');
                setTimeout(syncSessionWithExtension, 1000);
            });
            
            globalThis.Clerk.addListener('user.updated', () => {
                console.log('Clerk user updated, syncing...');
                setTimeout(syncSessionWithExtension, 1000);
            });
        } else {
            // Retry after a short delay
            setTimeout(checkClerkAndSync, 1000);
        }
    };
    
    checkClerkAndSync();
}

// Periodically sync session (every 5 minutes)
setInterval(syncSessionWithExtension, 5 * 60 * 1000);
