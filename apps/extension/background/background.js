// API CONFIG - Environment-aware API URLs
const DEV_API_BASE_URL = "http://localhost:8000/api";
const PROD_API_BASE_URL = "https://brandalyze.onrender.com/api";

// OAuth-style Extension Authentication Class
class ExtensionAuth {
  constructor() {
    this.authState = {
      isAuthenticated: false,
      extensionToken: null,
      userInfo: null,
      apiUrl: PROD_API_BASE_URL,
      lastChecked: null,
      cacheTimeout: 60 * 60 * 1000, // 1 hour cache
    };
  }
  getAppUrl() {
    // Determine if we should use dev or prod based on stored preference or default to prod
    return this.authState.apiUrl === DEV_API_BASE_URL
      ? "http://localhost:3000"
      : "https://brandalyze.io";
  }

  getApiUrl() {
    return this.authState.apiUrl;
  }
  async detectEnvironment() {
    // Force production environment
    this.authState.apiUrl = PROD_API_BASE_URL;
    return PROD_API_BASE_URL;
  }
  async initiateAuth() {
    try {
      // Detect environment based on open tabs
      await this.detectEnvironment();

      // Get the extension ID dynamically
      const extensionId = chrome.runtime.id;

      const appUrl = this.getAppUrl();
      const authUrl = `${appUrl}/extension-auth?source=chrome&extension_id=${extensionId}`;

      console.log(`Initiating OAuth auth with: ${authUrl}`);
      console.log(
        `Environment detected: ${
          this.authState.apiUrl === DEV_API_BASE_URL
            ? "Development"
            : "Production"
        }`
      );

      // Create tab and monitor for auth completion
      const tab = await chrome.tabs.create({ url: authUrl });

      // Set up a listener to monitor for auth completion
      this.monitorAuthTab(tab.id);

      return true;
    } catch (error) {
      console.error("Failed to initiate auth:", error);
      return false;
    }
  }

  async monitorAuthTab(tabId) {
    const checkAuthCompletion = async () => {
      try {
        // Inject script to check for auth code in the page
        const results = await chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: () => {
            // Look for auth success indicators
            const successElements = document.querySelectorAll(
              '[class*="green"], [class*="success"]'
            );
            const authCodeElements = document.querySelectorAll(
              '[class*="auth"], [class*="code"]'
            );

            // Check if page shows success message
            const hasSuccessMessage = Array.from(successElements).some(
              (el) =>
                el.textContent.toLowerCase().includes("success") ||
                el.textContent.toLowerCase().includes("connected")
            );

            // Look for auth code in the page
            const authCodeMatch = document.body.textContent.match(
              /Auth Code: ([a-zA-Z0-9-]+)/
            );

            return {
              hasSuccess: hasSuccessMessage,
              authCode: authCodeMatch ? authCodeMatch[1] : null,
            };
          },
        });

        const result = results[0]?.result;

        if (result?.hasSuccess && result?.authCode) {
          console.log(
            "Auth success detected, processing auth code:",
            result.authCode
          );
          const success = await this.handleAuthCallback(result.authCode);

          if (success) {
            // Close the auth tab
            chrome.tabs.remove(tabId);
            return true;
          }
        }

        // Continue monitoring if auth not complete
        setTimeout(checkAuthCompletion, 2000);
      } catch (error) {
        console.log("Auth monitoring error:", error);
        // Tab might be closed or inaccessible, stop monitoring
      }
    };

    // Start monitoring after a short delay
    setTimeout(checkAuthCompletion, 3000);
  }
  async handleAuthCallback(authCode) {
    try {
      console.log("Exchanging auth code for extension token...");

      const response = await fetch(
        `${this.getApiUrl()}/extension/auth/exchange-code/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ auth_code: authCode }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data.extension_token) {
        throw new Error("Invalid response from auth exchange");
      }

      const { extension_token, user_info, expires_at } = data.data;

      // Store long-lived token
      await chrome.storage.local.set({
        extensionToken: extension_token,
        userInfo: user_info,
        tokenExpiry: new Date(expires_at).getTime(),
        lastAuth: Date.now(),
        apiUrl: this.getApiUrl(),
      });

      this.authState = {
        isAuthenticated: true,
        extensionToken: extension_token,
        userInfo: user_info,
        apiUrl: this.getApiUrl(),
        lastChecked: Date.now(),
      };

      console.log("Extension authentication successful!");
      return true;
    } catch (error) {
      console.error("Auth exchange failed:", error);
      return false;
    }
  }

  async checkAuth() {
    try {
      // Check cache first
      const now = Date.now();
      if (
        this.authState.lastChecked &&
        now - this.authState.lastChecked < this.authState.cacheTimeout &&
        this.authState.isAuthenticated
      ) {
        return this.authState;
      }

      // Check stored token
      const stored = await chrome.storage.local.get([
        "extensionToken",
        "userInfo",
        "tokenExpiry",
        "apiUrl",
      ]);

      if (stored.extensionToken) {
        // Check if token is expired
        if (stored.tokenExpiry && Date.now() > stored.tokenExpiry) {
          console.log("Extension token expired");
          await this.clearAuth();
          return { isAuthenticated: false };
        }

        // Validate token with backend
        const isValid = await this.validateToken(
          stored.extensionToken,
          stored.apiUrl
        );

        if (isValid) {
          this.authState = {
            isAuthenticated: true,
            extensionToken: stored.extensionToken,
            userInfo: stored.userInfo,
            apiUrl: stored.apiUrl || PROD_API_BASE_URL,
            lastChecked: now,
          };
          return this.authState;
        } else {
          console.log("Extension token validation failed");
          await this.clearAuth();
        }
      }

      return { isAuthenticated: false };
    } catch (error) {
      console.error("Auth check failed:", error);
      return { isAuthenticated: false };
    }
  }

  async validateToken(token, apiUrl = null) {
    try {
      const url = apiUrl || this.getApiUrl();
      const response = await fetch(`${url}/extension/auth/verify-token/`, {
        method: "POST",
        headers: {
          Authorization: `ExtensionToken ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Update user info if provided
          if (data.data) {
            this.authState.userInfo = data.data;
            await chrome.storage.local.set({ userInfo: data.data });
          }
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("Token validation failed:", error);
      return false;
    }
  }

  async clearAuth() {
    await chrome.storage.local.remove([
      "extensionToken",
      "userInfo",
      "tokenExpiry",
      "lastAuth",
    ]);

    this.authState = {
      isAuthenticated: false,
      extensionToken: null,
      userInfo: null,
      apiUrl: this.authState.apiUrl, // Preserve API URL preference
      lastChecked: null,
    };
  }

  async makeAuthenticatedRequest(endpoint, options = {}) {
    if (!this.authState.isAuthenticated || !this.authState.extensionToken) {
      throw new Error("Not authenticated");
    }

    const headers = {
      Authorization: `ExtensionToken ${this.authState.extensionToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    };

    return fetch(`${this.getApiUrl()}${endpoint}`, {
      ...options,
      headers,
    });
  }
}

// Create global instance
const extensionAuth = new ExtensionAuth();

// LEGACY AUTH STATE - Keep for backward compatibility during transition
let authState = {
  isAuthenticated: false,
  clerkToken: null,
  userData: null,
  currentApiUrl: PROD_API_BASE_URL,
  lastChecked: null,
  cacheTimeout: 60 * 60 * 1000, // 1 hour cache for valid stored tokens
  activeBrandalyzeTabs: new Set(),
};

chrome.runtime.onStartup.addListener(checkClerkAuth);
chrome.runtime.onInstalled.addListener(checkClerkAuth);

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.tabs.create({
      url: "popup/popup.html",
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    // NEW OAuth-style authentication actions
    case "checkExtensionAuth":
      extensionAuth
        .checkAuth()
        .then((response) => sendResponse({ success: true, data: response }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "initiateAuth":
      extensionAuth
        .initiateAuth()
        .then((success) => sendResponse({ success }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "handleAuthCallback":
      extensionAuth
        .handleAuthCallback(request.authCode)
        .then((success) => sendResponse({ success }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "clearAuth":
      extensionAuth
        .clearAuth()
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    // Store extension token - NEW TOKEN-BASED AUTH
    case "storeExtensionToken":
      storeExtensionToken(request.token)
        .then((response) => sendResponse(response))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    // Get auth state - reads from storage, returns user info
    case "getAuthState":
      chrome.storage.local.get(['extensionToken', 'userInfo', 'currentApiUrl', 'lastSynced'])
        .then((stored) => {
          console.log('getAuthState - stored data:', stored);
          if (stored.extensionToken && stored.userInfo) {
            console.log('getAuthState - returning authenticated with userInfo:', stored.userInfo);
            sendResponse({ 
              success: true, 
              data: {
                isAuthenticated: true,
                userInfo: stored.userInfo,
                apiUrl: stored.currentApiUrl,
                lastSynced: stored.lastSynced
              }
            });
          } else {
            sendResponse({ success: true, data: { isAuthenticated: false } });
          }
        })
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    // Legacy: Clerk session sync
    case "syncClerkSession":
      syncClerkSession(request.data)
        .then((response) => sendResponse({ success: true, data: response }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    // LEGACY actions - maintain backward compatibility during transition
    case "checkClerkAuth":
      // Try new auth first, fallback to legacy
      extensionAuth
        .checkAuth()
        .then((newAuthResponse) => {
          if (newAuthResponse.isAuthenticated) {
            sendResponse({ success: true, data: newAuthResponse });
          } else {
            // Fallback to legacy auth
            getAuthState()
              .then((response) =>
                sendResponse({ success: true, data: response })
              )
              .catch((error) =>
                sendResponse({ success: false, error: error.message })
              );
          }
        })
        .catch((error) => {
          // If new auth fails, try legacy
          getAuthState()
            .then((response) => sendResponse({ success: true, data: response }))
            .catch((legacyError) =>
              sendResponse({ success: false, error: legacyError.message })
            );
        });
      return true;

    case "analyzeContent":
      handleContentAnalysis(request.data)
        .then((response) => sendResponse({ success: true, data: response }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    case "analyzeProfile":
      // Handle both Twitter and LinkedIn profile analysis
      if (request.platform === "linkedin") {
        handleLinkedInProfileAnalysis(request.data, request.platform)
          .then((response) => {
            const responseData = { success: true, results: response };
            sendResponse(responseData);
          })
          .catch((error) => {
            console.error("❌ LinkedIn analysis error:", error);
            const errorData = { success: false, message: error.message };
            sendResponse(errorData);
          });
      } else {
        handleProfileAnalysis(request.data)
          .then((response) => sendResponse({ success: true, data: response }))
          .catch((error) =>
            sendResponse({ success: false, error: error.message })
          );
      }
      return true;

    case "analyzeContentAlignment":
      handleContentAlignmentAnalysis(request.data)
        .then((response) => sendResponse({ success: true, data: response }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "openBrandalyzeApp":
      openBrandalyzeApp()
        .then(() => sendResponse({ success: true }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    case "forceAuthRefresh":
      console.log("Forcing auth refresh - clearing all tokens...");
      // Clear all stored auth data
      chrome.storage.local.remove([
        "extensionToken",
        "userInfo",
        "clerkToken",
        "userData",
        "tokenExpiry",
        "tokenValidatedAt",
        "lastSynced"
      ])
        .then(() => {
          // Clear in-memory state
          invalidateAuthCache();
          authState.extensionToken = null;
          authState.userInfo = null;
          authState.clerkToken = null;
          authState.userData = null;
          
          // Redirect to extension-auth page for fresh token
          const appUrl = authState.currentApiUrl === DEV_API_BASE_URL
            ? "http://localhost:3000"
            : "https://brandalyze.io";
          const extensionId = chrome.runtime.id;
          const authUrl = `${appUrl}/extension-auth?source=refresh&extension_id=${extensionId}`;
          
          chrome.tabs.create({ url: authUrl });
          
          sendResponse({ 
            success: true, 
            data: { isAuthenticated: false, message: "Redirecting to authentication..." }
          });
        })
        .catch((error) => {
          console.error("Failed to clear auth data:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    case "updateStoredToken":
      // Handle token updates from the main site
      updateStoredToken(request.data)
        .then((response) => sendResponse({ success: true, data: response }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;
    default:
      console.warn("Unknown action:", request.action);
      sendResponse({ success: false, error: "Unknown action" });
  }
});

// Handle messages from external websites (brandalyze.io)
chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  console.log("External message received:", request, "from:", sender.url);
  
  // Only allow messages from brandalyze.io domains
  const allowedOrigins = [
    "http://localhost:3000",
    "https://brandalyze.io",
    "https://www.brandalyze.io"
  ];
  
  const senderOrigin = new URL(sender.url).origin;
  if (!allowedOrigins.includes(senderOrigin)) {
    console.error("Message from unauthorized origin:", senderOrigin);
    sendResponse({ success: false, error: "Unauthorized origin" });
    return;
  }
  
  // Handle the same actions as internal messages
  switch (request.action) {
    case "storeExtensionToken":
      console.log("Storing extension token from external website");
      storeExtensionToken(request.token)
        .then((response) => {
          console.log("Token stored successfully:", response);
          sendResponse(response);
        })
        .catch((error) => {
          console.error("Failed to store token:", error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
      
    default:
      console.warn("Unknown external action:", request.action);
      sendResponse({ success: false, error: "Unknown action" });
  }
});

// Listen for tab updates to invalidate cache when user navigates away from Brandalyze
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // If user navigates away from Brandalyze, invalidate auth cache
  if (
    changeInfo.url &&
    !changeInfo.url.includes("localhost:3000") &&
    !changeInfo.url.includes("brandalyze.io") &&
    !changeInfo.url.includes("www.brandalyze.io")
  ) {
    const brandalyzeTabs = authState.activeBrandalyzeTabs || new Set();
    if (brandalyzeTabs.has(tabId)) {
      brandalyzeTabs.delete(tabId);
      if (brandalyzeTabs.size === 0) {
        invalidateAuthCache();
      }
    }
  }
});

// Track Brandalyze tabs
chrome.tabs.onRemoved.addListener((tabId) => {
  const brandalyzeTabs = authState.activeBrandalyzeTabs || new Set();
  if (brandalyzeTabs.has(tabId)) {
    brandalyzeTabs.delete(tabId);
    if (brandalyzeTabs.size === 0) {
      invalidateAuthCache();
    }
  }
});

// Check Clerk authentication - prioritize stored token, fallback to main app
async function checkClerkAuth() {
  try {
    // First check if we have an extension token (long-lived, preferred)
    const result = await chrome.storage.local.get([
      "extensionToken",
      "userInfo",
      "clerkToken",
      "userData",
      "currentApiUrl",
      "tokenExpiry",
      "tokenValidatedAt",
    ]);

    // Check for extension token first (90-day token, no expiry check needed)
    if (result.extensionToken && result.userInfo) {
      console.log("Found stored extension token, using it");
      authState.isAuthenticated = true;
      authState.extensionToken = result.extensionToken;
      authState.userInfo = result.userInfo;
      authState.userData = result.userInfo; // Map userInfo to userData for compatibility
      authState.currentApiUrl = result.currentApiUrl || PROD_API_BASE_URL;
      authState.apiUrl = authState.currentApiUrl;
      authState.jwt = result.extensionToken; // Use extension token as JWT
      return authState;
    }

    // Fallback to Clerk token if no extension token
    if (result.clerkToken) {
      console.log("Found stored token, checking validity...");

      // Check if token is expired (if we have expiry info)
      if (result.tokenExpiry && Date.now() > result.tokenExpiry) {
        console.log("Stored token expired, will fetch new one");
      } else {
        // Verify the stored token is still valid
        const isValid = await verifyClerkToken(
          result.clerkToken,
          result.currentApiUrl || PROD_API_BASE_URL
        );
        if (isValid) {
          // Token is valid, use it immediately
          authState.isAuthenticated = true;
          authState.clerkToken = result.clerkToken;
          authState.jwt = result.clerkToken;
          authState.userData = result.userData;
          authState.currentApiUrl = result.currentApiUrl || PROD_API_BASE_URL;
          authState.apiUrl = authState.currentApiUrl;
          return authState;
        } else {
          console.log("Stored token invalid, will fetch new one");
        }
      }

      // Clear invalid/expired token
      await clearAuthData();
    } else {
      console.log("No stored token found, will fetch from main app");
    }

    // Only fetch from main app if we don't have a valid stored token
    const tokenData = await getClerkTokenFromBrandalyzeApp();
    if (tokenData && tokenData.token) {
      // Verify the new token
      const isValid = await verifyClerkToken(tokenData.token, tokenData.apiUrl);

      if (isValid) {
        // Get user data using the verified token
        const userData = await fetchUserDataFromBrands(
          tokenData.token,
          tokenData.apiUrl
        );

        // Calculate token expiry (24 hours from now)
        const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

        // Store the new token for future use
        await chrome.storage.local.set({
          clerkToken: tokenData.token,
          currentApiUrl: tokenData.apiUrl,
          userData: userData,
          tokenExpiry: tokenExpiry,
        });

        authState.isAuthenticated = true;
        authState.clerkToken = tokenData.token;
        authState.jwt = tokenData.token;
        authState.apiUrl = tokenData.apiUrl;
        authState.currentApiUrl = tokenData.apiUrl;
        authState.userData = userData;
        return authState;
      }
    }

    authState.isAuthenticated = false;
    return authState;
  } catch (error) {
    console.error("Clerk auth check failed", error);
    authState.isAuthenticated = false;
    return authState;
  }
}

async function getClerkTokenFromBrandalyzeApp() {
  try {
    console.log("Looking for Brandalyze app tabs...");

    // Look for open Brandalyze tabs (dev and prod)
    const tabs = await chrome.tabs.query({
      url: [
        "http://localhost:3000/*",
        "https://localhost:3000/*",
        "https://brandalyze.io/*",
        "https://www.brandalyze.io/*",
        "http://brandalyze.io/*",
        "http://www.brandalyze.io/*",
      ],
    });

    // Check if any Brandalyze tabs were found
    if (!tabs || tabs.length === 0) {
      console.log("No Brandalyze app tabs found");
      return null;
    }

    const tabId = tabs[0].id;
    const tabUrl = tabs[0].url;

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (window.Clerk && window.Clerk.session) {
          try {
            const session = window.Clerk.session;
            if (session.getToken) {
              const token = session.getToken();
              if (token) return token;
            }
          } catch (e) {
            console.log("Failed to get token from Clerk.session:", e);
          }
        }

        const allKeys = Object.keys(localStorage);

        try {
          const clerkKeys = allKeys.filter(
            (key) => key.includes("clerk") || key.includes("__session")
          );

          // Check the values of these keys
          for (const key of clerkKeys) {
            const value = localStorage.getItem(key);
            if (value) {
              try {
                const parsed = JSON.parse(value);
                // Look for JWT tokens in the parsed data
                if (parsed.jwt || parsed.token) {
                  return parsed.jwt || parsed.token;
                }
                // Check nested objects
                if (
                  parsed.session &&
                  (parsed.session.jwt || parsed.session.token)
                ) {
                  return parsed.session.jwt || parsed.session.token;
                }
              } catch (parseError) {
                // If not JSON, check if it looks like a JWT
                if (value.includes(".") && value.split(".").length === 3) {
                  return value;
                }
              }
            }
          }
        } catch (e) {
          console.log("Failed to check localStorage:", e);
        }

        try {
          const cookies = document.cookie.split(";");

          for (let cookie of cookies) {
            const [name, value] = cookie.trim().split("=");
            console.log(`Cookie: ${name} = ${value}`);
            if (
              name &&
              (name.includes("__session") || name.includes("clerk")) &&
              value
            ) {
              // Check if it looks like a JWT
              if (value.includes(".") && value.split(".").length === 3) {
                return value;
              }
            }
          }
        } catch (e) {
          console.log("Failed to check cookies:", e);
        }

        const possibleSessionKeys = Object.keys(localStorage).filter(
          (key) =>
            key.toLowerCase().includes("session") ||
            key.toLowerCase().includes("token") ||
            key.toLowerCase().includes("auth")
        );

        for (const key of possibleSessionKeys) {
          const value = localStorage.getItem(key);
          console.log(`${key}:`, value);
          if (
            value &&
            typeof value === "string" &&
            value.includes(".") &&
            value.split(".").length === 3
          ) {
            return value;
          }
        }

        return null;
      },
    });

    const token = results[0]?.result;

    if (token) {
      console.log("Token found, determining API URL...");
      // Determine environment and API URL based on tab URL
      const isLocalhost = tabUrl.includes("localhost:3000");
      const tokenData = {
        token: token,
        environment: isLocalhost ? "development" : "production",
        apiUrl: isLocalhost ? DEV_API_BASE_URL : PROD_API_BASE_URL,
      };
      return tokenData;
    }

    return null;
  } catch (error) {
    console.error("Failed to get Clerk token from main app:", error);
    return null;
  }
}

async function verifyClerkToken(token, apiUrl = PROD_API_BASE_URL) {
  try {
    // Try the specified API URL first
    let response;
    try {
      console.log(`Trying API: ${apiUrl}/brands/`);
      response = await fetch(`${apiUrl}/brands/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        authState.currentApiUrl = apiUrl;
        return true;
      } else {
        const errorText = await response
          .text()
          .catch(() => "Could not read error");
        console.log("API response error:", errorText);
      }
    } catch (error) {
      console.log(`API ${apiUrl} not accessible:`, error.message);
    }

    // If first API fails, try the other one
    const fallbackUrl =
      apiUrl === DEV_API_BASE_URL ? PROD_API_BASE_URL : DEV_API_BASE_URL;
    try {
      response = await fetch(`${fallbackUrl}/brands/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        authState.currentApiUrl = fallbackUrl;
        await chrome.storage.local.set({ currentApiUrl: fallbackUrl });
        console.log(`Switched to ${fallbackUrl} API`);
        return true;
      }
    } catch (error) {
      console.log(`Fallback API ${fallbackUrl} not accessible:`, error.message);
    }

    return false;
  } catch (error) {
    console.error("Token verification failed:", error);
    return false;
  }
}

async function clearAuthData() {
  await chrome.storage.local.remove([
    "clerkToken",
    "userData",
    "currentApiUrl",
    "tokenExpiry",
  ]);
  authState.isAuthenticated = false;
  authState.clerkToken = null;
  authState.userData = null;
  authState.currentApiUrl = PROD_API_BASE_URL;
}

// Fetch user data by making a brands request and extracting user info from the auth verification
async function fetchUserDataFromBrands(token, apiUrl) {
  try {
    // Make request to brands endpoint - this will trigger middleware to process JWT and create/update user
    await fetch(`${apiUrl}/brands/`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }).catch(() => {}); // Ignore errors, we just want to trigger middleware

    // Even if this fails, the middleware will have processed the token and created/updated the user
    // Now make a request to extension auth verify to get user data
    const authResponse = await fetch(`${apiUrl}/extension/auth/verify/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.success && authData.data) {
        return {
          userId: authData.data.user_id,
          email: authData.data.email,
          username: authData.data.username,
          subscriptionTier: authData.data.subscription_tier,
          fullName: authData.data.email || "Unknown User", // Use email as display name
        };
      }
    }

    // Fallback: extract basic info from JWT
    return extractUserDataFromJWT(token);
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    // Fallback: extract basic info from JWT
    return extractUserDataFromJWT(token);
  }
}

// Get user data from API using the token
async function getUserDataFromAPI(token, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/extension/auth/verify/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data) {
        // Extract user data from API response
        return {
          userId: data.data.user_id,
          email: data.data.email || "Unknown", // Backend should provide email
          username: data.data.username,
          subscriptionTier: data.data.subscription_tier,
          fullName: data.data.username || "Unknown User",
        };
      }
    }

    // Fallback: try to extract from JWT if API fails
    return extractUserDataFromJWT(token);
  } catch (error) {
    console.error("Failed to get user data from API:", error);
    // Fallback: try to extract from JWT
    return extractUserDataFromJWT(token);
  }
}

// Profile analysis handler - simple version with basic 401 retry
async function handleProfileAnalysis(analysisData) {
  try {
    // Ensure we have authentication - check for extension token first
    await checkClerkAuth();
    
    if (!authState.isAuthenticated) {
      throw new Error("Please sign in to Brandalyze first");
    }

    // Determine which token to use (prioritize extension token)
    const useExtensionToken = authState.extensionToken && authState.userInfo;
    const authHeader = useExtensionToken
      ? `ExtensionToken ${authState.extensionToken}`
      : `Bearer ${authState.clerkToken}`;

    const requestBody = {
      handle: analysisData.handle,
      platform: analysisData.platform || "twitter",
      posts_count: analysisData.posts_count || 10,
      extracted_posts: analysisData.extractedPosts || null, // Include extracted posts
      extracted_bio: analysisData.extractedBio || null, // Include extracted bio data
      use_bio: analysisData.use_bio !== undefined ? analysisData.use_bio : true, // Default to bio analysis for better rate limits
    };

    // Make the API request
    const response = await fetch(
      `${authState.currentApiUrl}/extension/analyze/profile/voice/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      }
    );

    // If 401, try refreshing auth once
    if (response.status === 401) {
      await checkClerkAuth();

      if (authState.isAuthenticated) {
        // Re-determine auth header after refresh
        const retryUseExtensionToken = authState.extensionToken && authState.userInfo;
        const retryAuthHeader = retryUseExtensionToken
          ? `ExtensionToken ${authState.extensionToken}`
          : `Bearer ${authState.clerkToken}`;

        const retryResponse = await fetch(
          `${authState.currentApiUrl}/extension/analyze/profile/voice/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: retryAuthHeader,
            },
            body: JSON.stringify(requestBody),
          }
        );
        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));

          // Return structured error for frontend
          throw new Error(
            errorData.message ||
              `Profile analysis failed: ${retryResponse.status}`
          );
        }

        const data = await retryResponse.json();

        // Check if the backend returned an error in the data
        if (!data.success && data.message) {
          throw new Error(data.message);
        }

        return data.data || data;
      }
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ API Error:", errorData);

      // Return structured error for frontend
      throw new Error(
        errorData.message || `Profile analysis failed: ${response.status}`
      );
    }

    const data = await response.json();

    // Check if the backend returned an error in the data
    if (!data.success && data.message) {
      throw new Error(data.message);
    }

    return data.data || data;
  } catch (error) {
    console.error("Profile analysis error:", error);
    throw error;
  }
}

// LinkedIn profile analysis handler using DOM-extracted data
async function handleLinkedInProfileAnalysis(profileData, platform) {
  try {
    // Ensure we have authentication - check for extension token first
    await checkClerkAuth();
    
    if (!authState.isAuthenticated) {
      throw new Error("Please sign in to Brandalyze first");
    }

    // Determine which token to use (prioritize extension token)
    const useExtensionToken = authState.extensionToken && authState.userInfo;
    const authHeader = useExtensionToken
      ? `ExtensionToken ${authState.extensionToken}`
      : `Bearer ${authState.clerkToken}`;

    // Process LinkedIn profile data for analysis
    const requestBody = {
      handle: profileData.handle,
      platform: "linkedin",
      extracted_bio: {
        bio: profileData.bio || profileData.headline || "",
        display_name: profileData.display_name,
        location: profileData.location,
        company: profileData.company,
        industry: profileData.industry,
        connections_count: profileData.connections_count || 0,
        headline: profileData.headline,
      },
      use_bio: true, // LinkedIn profiles use bio/headline analysis
      posts_count: 0, // No posts analysis for LinkedIn DOM extraction
    };

    // Make the API request
    const response = await fetch(
      `${authState.currentApiUrl}/extension/analyze/profile/voice/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      }
    );

    // If 401, try refreshing auth once
    if (response.status === 401) {
      await checkClerkAuth();

      if (authState.isAuthenticated) {
        // Re-determine auth header after refresh
        const retryUseExtensionToken = authState.extensionToken && authState.userInfo;
        const retryAuthHeader = retryUseExtensionToken
          ? `ExtensionToken ${authState.extensionToken}`
          : `Bearer ${authState.clerkToken}`;

        const retryResponse = await fetch(
          `${authState.currentApiUrl}/extension/analyze/profile/voice/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: retryAuthHeader,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `LinkedIn analysis failed: ${retryResponse.status}`
          );
        }

        const retryData = await retryResponse.json();
        return retryData.data || retryData;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `LinkedIn analysis failed: ${response.status}`
      );
    }

    const data = await response.json();

    // Check if the backend returned an error in the data
    if (!data.success && data.message) {
      throw new Error(data.message);
    }

    return data.data || data;
  } catch (error) {
    console.error("LinkedIn profile analysis error:", error);
    throw error;
  }
}

// Content analysis handler using Clerk token and main brand alignment API
async function handleContentAnalysis(analysisData) {
  try {
    // Ensure we have authentication
    if (!authState.isAuthenticated || !authState.clerkToken) {
      await checkClerkAuth();
      if (!authState.isAuthenticated) {
        throw new Error("Please sign in to Brandalyze first");
      }
    }

    // Use the main brand alignment API with Clerk token
    // This will automatically use the user's first brand
    const response = await fetch(
      `${authState.currentApiUrl}/analyze/brand-alignment/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authState.clerkToken}`,
        },
        body: JSON.stringify({
          text: analysisData.content,
          brand_samples: [], // Backend will fetch user's brand samples automatically
          platform: analysisData.platform || "extension",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `Analysis failed: ${response.status}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Analysis error:", error);
    throw error;
  }
}

// Content alignment analysis handler - simple version with 401 retry
async function handleContentAlignmentAnalysis(analysisData) {
  try {
    // Ensure we have authentication - check for extension token first
    console.log("⚠️ Checking auth for content alignment...");
    await checkClerkAuth();
    
    if (!authState.isAuthenticated) {
      throw new Error("Please sign in to Brandalyze first");
    }

    // Determine which token to use (prioritize extension token)
    const useExtensionToken = authState.extensionToken && authState.userInfo;
    const authHeader = useExtensionToken
      ? `ExtensionToken ${authState.extensionToken}`
      : `Bearer ${authState.clerkToken}`;

    const requestBody = {
      content: analysisData.content,
      type: analysisData.type || "brand",
      brand_id: analysisData.brand_id,
      reference_handle: analysisData.reference_handle,
      platform: analysisData.platform || "twitter",
    };

    const response = await fetch(
      `${authState.currentApiUrl}/extension/analyze/content/alignment/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(requestBody),
      }
    );

    // If 401, try refreshing auth once
    if (response.status === 401) {
      await checkClerkAuth();

      if (authState.isAuthenticated) {
        // Re-determine auth header after refresh
        const retryUseExtensionToken = authState.extensionToken && authState.userInfo;
        const retryAuthHeader = retryUseExtensionToken
          ? `ExtensionToken ${authState.extensionToken}`
          : `Bearer ${authState.clerkToken}`;

        const retryResponse = await fetch(
          `${authState.currentApiUrl}/extension/analyze/content/alignment/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: retryAuthHeader,
            },
            body: JSON.stringify(requestBody),
          }
        );

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Content alignment analysis failed: ${retryResponse.status}`
          );
        }

        const data = await retryResponse.json();
        return data.data || data;
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ API Error:", errorData);
      throw new Error(
        errorData.message ||
          `Content alignment analysis failed: ${response.status}`
      );
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    console.error("Content alignment analysis error:", error);
    throw error;
  }
}

async function openBrandalyzeApp() {
  try {
    // Check if Brandalyze app is already open
    const tabs = await chrome.tabs.query({
      url: [
        "http://localhost:3000/*",
        "https://localhost:3000/*",
        "https://brandalyze.io/*",
        "https://www.brandalyze.io/*",
        "http://brandalyze.io/*",
        "http://www.brandalyze.io/*",
      ],
    });

    if (tabs.length > 0) {
      // Focus existing tab
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Determine which URL to open based on current API preference
      let appUrl;
      if (authState.currentApiUrl === PROD_API_BASE_URL) {
        appUrl = "https://brandalyze.io/sign-in";
      } else {
        appUrl = "http://localhost:3000/sign-in";
      }

      await chrome.tabs.create({ url: appUrl });
    }
  } catch (error) {
    console.error("Failed to open Brandalyze app:", error);
    throw error;
  }
}

// Extract user data from Clerk JWT token
function extractUserDataFromJWT(token) {
  try {
    const tokenParts = token.split(".");
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));

      // Try multiple ways to get email from Clerk JWT
      let email = "Unknown";

      // Direct email field
      if (payload.email) {
        email = payload.email;
      }
      // Email address field
      else if (payload.email_address) {
        email = payload.email_address;
      }
      // Primary email address
      else if (payload.primary_email_address_id && payload.email_addresses) {
        const primaryEmail = payload.email_addresses.find(
          (e) => e.id === payload.primary_email_address_id
        );
        if (primaryEmail) {
          email = primaryEmail.email_address;
        }
      }
      // First email in array
      else if (payload.email_addresses && payload.email_addresses.length > 0) {
        email =
          payload.email_addresses[0].email_address ||
          payload.email_addresses[0].email;
      }
      // Alternative email fields
      else if (payload.primary_email_address) {
        email = payload.primary_email_address;
      }
      // Email addresses as string
      else if (payload.emailAddresses) {
        email = payload.emailAddresses;
      }

      const userData = {
        email: email,
        userId: payload.sub || payload.user_id || payload.id,
        firstName: payload.given_name || payload.first_name,
        lastName: payload.family_name || payload.last_name,
        fullName:
          payload.name ||
          `${payload.given_name || payload.first_name || ""} ${
            payload.family_name || payload.last_name || ""
          }`.trim() ||
          "Unknown User",
      };

      console.log("Extracted user data:", userData); // Debug log
      return userData;
    }
  } catch (error) {
    console.error("Failed to decode JWT:", error);
  }

  return {
    email: "Unknown",
    userId: null,
    firstName: null,
    lastName: null,
    fullName: "Unknown User",
  };
}

// Utility function to generate session ID
function generateSessionId() {
  return "ext_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
}

// Debug function to check what tabs are open
async function debugTabInfo() {
  const allTabs = await chrome.tabs.query({});
  console.log(
    "All open tabs:",
    allTabs.map((t) => ({ id: t.id, url: t.url, title: t.title }))
  );

  const brandalyzeTabs = await chrome.tabs.query({
    url: ["http://localhost:3000/*", "https://brandalyze.io/*"],
  });
  console.log(
    "Brandalyze tabs found:",
    brandalyzeTabs.map((t) => ({ id: t.id, url: t.url }))
  );

  return brandalyzeTabs;
}

// Smart auth state getter with caching - simple version
async function getAuthState() {
  const now = Date.now();

  // If we have recent cached auth state, return it
  if (
    authState.lastChecked &&
    now - authState.lastChecked < authState.cacheTimeout
  ) {
    console.log(
      "Using cached auth state (age:",
      Math.round((now - authState.lastChecked) / 1000),
      "seconds)"
    );
    return {
      ...authState,
      apiUrl: authState.currentApiUrl,
      jwt: authState.clerkToken,
      lastChecked: authState.lastChecked,
    };
  }

  // Cache is stale or doesn't exist, refresh auth
  console.log("Auth cache stale or missing, refreshing...");
  const freshAuthState = await checkClerkAuth();
  authState.lastChecked = now;

  return {
    ...freshAuthState,
    lastChecked: authState.lastChecked,
  };
}

// Invalidate auth cache (call when user signs out or token becomes invalid)
function invalidateAuthCache() {
  console.log("Invalidating auth cache");
  authState.lastChecked = null;
  authState.isAuthenticated = false;
  authState.clerkToken = null;
  authState.userData = null;
}

// Update stored token when provided by main site (legacy)
async function updateStoredToken(tokenData) {
  try {
    if (!tokenData.token) {
      throw new Error("No token provided");
    }
    const isValid = await verifyClerkToken(
      tokenData.token,
      tokenData.apiUrl || PROD_API_BASE_URL
    );
    if (!isValid) {
      throw new Error("Invalid token provided");
    }

    const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    await chrome.storage.local.set({
      clerkToken: tokenData.token,
      currentApiUrl: tokenData.apiUrl || PROD_API_BASE_URL,
      tokenExpiry: tokenExpiry,
    });

    authState.isAuthenticated = true;
    authState.clerkToken = tokenData.token;
    authState.jwt = tokenData.token;
    authState.currentApiUrl = tokenData.apiUrl || PROD_API_BASE_URL;
    authState.apiUrl = authState.currentApiUrl;
    authState.lastChecked = Date.now();

    console.log("Successfully updated stored token");
    return authState;
  } catch (error) {
    console.error("Failed to update stored token:", error);
    throw error;
  }
}

// Store and validate extension token - NEW TOKEN-BASED AUTH
async function storeExtensionToken(token) {
  try {
    if (!token) {
      throw new Error("No token provided");
    }

    // Detect environment
    const stored = await chrome.storage.local.get(['currentApiUrl']);
    const apiUrl = stored.currentApiUrl || PROD_API_BASE_URL;
    
    // Validate token with backend
    const userInfo = await validateExtensionToken(token, apiUrl);
    
    if (!userInfo) {
      throw new Error("Token validation failed");
    }

    // Store token and user info
    await chrome.storage.local.set({
      extensionToken: token,
      userInfo: userInfo,
      currentApiUrl: apiUrl,
      tokenValidatedAt: Date.now(),
      lastSynced: Date.now()
    });

    // Update in-memory state
    authState.isAuthenticated = true;
    authState.extensionToken = token;
    authState.userInfo = userInfo;
    authState.currentApiUrl = apiUrl;
    authState.apiUrl = apiUrl;
    authState.lastChecked = Date.now();

    console.log("Extension token stored and validated successfully");
    return { success: true, userInfo };
  } catch (error) {
    console.error("Failed to store extension token:", error);
    throw error;
  }
}

// Validate extension token with backend
async function validateExtensionToken(token, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/extension/auth/verify-token/`, {
      method: "POST",
      headers: {
        "Authorization": `ExtensionToken ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.data) {
      return {
        email: data.data.email || "Unknown user",
        display_name: data.data.display_name || data.data.email || "Unknown user",
        subscription_tier: data.data.subscription_tier || "free",
        extension_enabled: data.data.extension_enabled || false,
        requiresUpgrade: !data.data.extension_enabled
      };
    }
    
    return null;
  } catch (error) {
    console.error("Failed to validate extension token:", error);
    return null;
  }
}

// Legacy Clerk session sync - keeping for backward compatibility
async function syncClerkSession(sessionData) {
  try {
    if (!sessionData.clerkToken) {
      throw new Error("No Clerk token provided");
    }

    const apiUrl = sessionData.apiUrl || PROD_API_BASE_URL;
    
    const userInfo = await fetchUserInfoFromBackend(sessionData.clerkToken, apiUrl);
    
    if (!userInfo) {
      throw new Error("Failed to fetch user info from backend");
    }

    await chrome.storage.local.set({
      clerkToken: sessionData.clerkToken,
      clerkUser: sessionData.clerkUser,
      userInfo: userInfo,
      currentApiUrl: apiUrl,
      tokenExpiry: Date.now() + 24 * 60 * 60 * 1000,
      lastSynced: sessionData.syncedAt || Date.now()
    });

    authState.isAuthenticated = true;
    authState.clerkToken = sessionData.clerkToken;
    authState.jwt = sessionData.clerkToken;
    authState.userData = sessionData.clerkUser;
    authState.userInfo = userInfo;
    authState.currentApiUrl = apiUrl;
    authState.apiUrl = apiUrl;
    authState.lastChecked = Date.now();

    console.log("Clerk session synced successfully");
    return authState;
  } catch (error) {
    console.error("Failed to sync Clerk session:", error);
    throw error;
  }
}

// Legacy user info fetcher
async function fetchUserInfoFromBackend(clerkToken, apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/extension/auth/verify/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clerkToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    
    if (response.ok && data.success && data.data) {
      return {
        email: data.data.email || "Unknown user",
        display_name: data.data.display_name || data.data.email || "Unknown user",
        subscription_tier: data.data.subscription_tier || "free",
        extension_enabled: data.data.extension_enabled || false,
        requiresUpgrade: !data.data.extension_enabled
      };
    }
    
    return null;
  } catch (error) {
    console.error("Failed to fetch user info from backend:", error);
    return null;
  }
}
