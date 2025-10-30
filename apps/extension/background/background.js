console.log(
  "Brandalyze extension background script loaded with Clerk integration"
);

// API CONFIG - Environment-aware API URLs
const DEV_API_BASE_URL = "http://localhost:8000/api";
const PROD_API_BASE_URL = "https://brandalyze.onrender.com/api";

// AUTH STATE MANAGEMENT - Optimized for stored tokens
let authState = {
  isAuthenticated: false,
  clerkToken: null,
  userData: null,
  currentApiUrl: DEV_API_BASE_URL,
  lastChecked: null,
  cacheTimeout: 60 * 60 * 1000, // 1 hour cache for valid stored tokens
  activeBrandalyzeTabs: new Set(),
};

chrome.runtime.onStartup.addListener(checkClerkAuth);
chrome.runtime.onInstalled.addListener(checkClerkAuth);

chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed/updated:", details.reason);

  if (details.reason === "install") {
    chrome.tabs.create({
      url: "popup/popup.html",
    });
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background received message:", request);

  switch (request.action) {
    case "checkClerkAuth":
      getAuthState()
        .then((response) => sendResponse({ success: true, data: response }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
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
        console.log("🔍 Processing LinkedIn profile analysis request");
        handleLinkedInProfileAnalysis(request.data, request.platform)
          .then((response) => {
            console.log("✅ LinkedIn analysis response:", response);
            const responseData = { success: true, results: response };
            console.log("📤 Sending back to content script:", responseData);
            sendResponse(responseData);
          })
          .catch((error) => {
            console.error("❌ LinkedIn analysis error:", error);
            const errorData = { success: false, message: error.message };
            console.log("📤 Sending error back to content script:", errorData);
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
      console.log("Forcing auth refresh...");
      invalidateAuthCache();
      checkClerkAuth()
        .then((response) => sendResponse({ success: true, data: response }))
        .catch((error) =>
          sendResponse({ success: false, error: error.message })
        );
      return true;

    case "updateStoredToken":
      // Handle token updates from the main site
      console.log("Updating stored token from main site...");
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

// Listen for tab updates to invalidate cache when user navigates away from Brandalyze
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // If user navigates away from Brandalyze, invalidate auth cache
  if (
    changeInfo.url &&
    !changeInfo.url.includes("localhost:3000") &&
    !changeInfo.url.includes("brandalyze.io")
  ) {
    const brandalyzeTabs = authState.activeBrandalyzeTabs || new Set();
    if (brandalyzeTabs.has(tabId)) {
      brandalyzeTabs.delete(tabId);
      if (brandalyzeTabs.size === 0) {
        console.log("All Brandalyze tabs closed, invalidating auth cache");
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
      console.log("Last Brandalyze tab closed, invalidating auth cache");
      invalidateAuthCache();
    }
  }
});

// Check Clerk authentication - prioritize stored token, fallback to main app
async function checkClerkAuth() {
  try {
    // First check if we have a stored Clerk token
    const result = await chrome.storage.local.get([
      "clerkToken",
      "userData",
      "currentApiUrl",
      "tokenExpiry",
    ]);

    if (result.clerkToken) {
      console.log("Found stored token, checking validity...");

      // Check if token is expired (if we have expiry info)
      if (result.tokenExpiry && Date.now() > result.tokenExpiry) {
        console.log("Stored token expired, will fetch new one");
      } else {
        // Verify the stored token is still valid
        const isValid = await verifyClerkToken(
          result.clerkToken,
          result.currentApiUrl || DEV_API_BASE_URL
        );
        if (isValid) {
          // Token is valid, use it immediately
          authState.isAuthenticated = true;
          authState.clerkToken = result.clerkToken;
          authState.jwt = result.clerkToken;
          authState.userData = result.userData;
          authState.currentApiUrl = result.currentApiUrl || DEV_API_BASE_URL;
          authState.apiUrl = authState.currentApiUrl;
          console.log("✅ Using valid stored token - no fetch needed");
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
    console.log("Attempting to fetch token from main Brandalyze app...");
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
        console.log(
          `✅ Fetched and stored new token from main app (${tokenData.environment})`
        );
        return authState;
      }
    }

    console.log("❌ No valid authentication found");
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
      url: ["http://localhost:3000/*", "https://brandalyze.io/*"],
    });

    console.log(
      `Found ${tabs.length} Brandalyze tabs:`,
      tabs.map((t) => t.url)
    );

    if (tabs.length === 0) {
      console.log("No Brandalyze app tabs found");
      return null;
    }

    // Try to execute script in the first Brandalyze tab to get Clerk token
    const tabId = tabs[0].id;
    const tabUrl = tabs[0].url;

    console.log(`Executing script in tab: ${tabUrl}`);

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        console.log("Script executing in Brandalyze app context");
        console.log("Current URL:", window.location.href);

        // This function runs in the context of the Brandalyze app
        // Try to get the Clerk session token using different methods

        // Method 1: Check if window.Clerk is available and has a session
        console.log("Checking window.Clerk...");
        console.log("window.Clerk exists:", !!window.Clerk);
        if (window.Clerk) {
          console.log("Clerk object:", window.Clerk);
          console.log("Clerk.session exists:", !!window.Clerk.session);
        }

        if (window.Clerk && window.Clerk.session) {
          try {
            console.log("Found Clerk session, trying to get token...");
            const session = window.Clerk.session;
            console.log("Session object:", session);
            if (session.getToken) {
              const token = session.getToken();
              console.log(
                "Got token from Clerk.session:",
                token ? "YES" : "NO"
              );
              if (token) return token;
            }
          } catch (e) {
            console.log("Failed to get token from Clerk.session:", e);
          }
        }

        // Method 2: Check localStorage for Clerk session data
        console.log("Checking localStorage...");
        const allKeys = Object.keys(localStorage);
        console.log("All localStorage keys:", allKeys);

        try {
          const clerkKeys = allKeys.filter(
            (key) => key.includes("clerk") || key.includes("__session")
          );

          console.log("Found Clerk keys in localStorage:", clerkKeys);

          // Check the values of these keys
          for (const key of clerkKeys) {
            const value = localStorage.getItem(key);
            console.log(`${key}:`, value);
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

        // Method 3: Check cookies for Clerk session
        console.log("Checking cookies...");
        console.log("document.cookie:", document.cookie);
        try {
          const cookies = document.cookie.split(";");
          console.log("All cookies:", cookies);

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
                console.log("Found JWT-like cookie:", name);
                console.log("Returning token from cookie:", name);
                return value;
              }
            }
          }
        } catch (e) {
          console.log("Failed to check cookies:", e);
        }

        // Method 4: Check if there's a way to get session from the app
        console.log("Checking for other authentication methods...");

        // Sometimes the session might be in a different format
        const possibleSessionKeys = Object.keys(localStorage).filter(
          (key) =>
            key.toLowerCase().includes("session") ||
            key.toLowerCase().includes("token") ||
            key.toLowerCase().includes("auth")
        );
        console.log("Possible session keys:", possibleSessionKeys);

        for (const key of possibleSessionKeys) {
          const value = localStorage.getItem(key);
          console.log(`${key}:`, value);
          if (
            value &&
            typeof value === "string" &&
            value.includes(".") &&
            value.split(".").length === 3
          ) {
            console.log("Found potential JWT in:", key);
            return value;
          }
        }

        console.log("No token found in any method");
        return null;
      },
    });

    console.log("Script execution results:", results);
    const token = results[0]?.result;
    console.log("Extracted token:", token ? "FOUND" : "NOT FOUND");
    console.log("Token length:", token ? token.length : 0);
    console.log(
      "First 50 chars of token:",
      token ? token.substring(0, 50) + "..." : "N/A"
    );

    if (token) {
      console.log("Token found, determining API URL...");
      // Determine environment and API URL based on tab URL
      const isLocalhost = tabUrl.includes("localhost:3000");
      const tokenData = {
        token: token,
        environment: isLocalhost ? "development" : "production",
        apiUrl: isLocalhost ? DEV_API_BASE_URL : PROD_API_BASE_URL,
      };
      console.log(
        "Token data prepared:",
        tokenData.environment,
        tokenData.apiUrl
      );
      return tokenData;
    }

    return null;
  } catch (error) {
    console.error("Failed to get Clerk token from main app:", error);
    return null;
  }
}

async function verifyClerkToken(token, apiUrl = DEV_API_BASE_URL) {
  console.log("Starting token verification...");
  console.log("API URL:", apiUrl);
  console.log("Token length:", token.length);

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

      console.log("API response status:", response.status);
      console.log("API response ok:", response.ok);

      if (response.ok) {
        authState.currentApiUrl = apiUrl;
        console.log("Token verification successful!");
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
  authState.currentApiUrl = DEV_API_BASE_URL;
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
    console.log("🔍 Starting profile analysis:", analysisData);

    // Ensure we have authentication
    if (!authState.isAuthenticated || !authState.clerkToken) {
      console.log("⚠️ Not authenticated, checking auth...");
      await checkClerkAuth();
      if (!authState.isAuthenticated) {
        throw new Error("Please sign in to Brandalyze first");
      }
    }

    console.log("✅ Authentication OK, making API request...");
    console.log(
      "🔗 API URL:",
      `${authState.currentApiUrl}/extension/analyze/profile/voice/`
    );
    const requestBody = {
      handle: analysisData.handle,
      platform: analysisData.platform || "twitter",
      posts_count: analysisData.posts_count || 10,
      extracted_posts: analysisData.extractedPosts || null, // Include extracted posts
      extracted_bio: analysisData.extractedBio || null, // Include extracted bio data
      use_bio: analysisData.use_bio !== undefined ? analysisData.use_bio : true, // Default to bio analysis for better rate limits
    };
    console.log("📤 Request body:", requestBody);

    // Make the API request
    const response = await fetch(
      `${authState.currentApiUrl}/extension/analyze/profile/voice/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authState.clerkToken}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("📥 Response status:", response.status);

    // If 401, try refreshing auth once
    if (response.status === 401) {
      console.log("🔄 Got 401, refreshing auth and retrying once...");
      await checkClerkAuth();

      if (authState.isAuthenticated) {
        const retryResponse = await fetch(
          `${authState.currentApiUrl}/extension/analyze/profile/voice/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authState.clerkToken}`,
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
        console.log("✅ Analysis completed after retry:", data);

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
    console.log("✅ Analysis completed:", data);

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
    console.log("🔍 Starting LinkedIn profile analysis:", profileData);

    // Ensure we have authentication
    if (!authState.isAuthenticated || !authState.clerkToken) {
      console.log("⚠️ Not authenticated, checking auth...");
      await checkClerkAuth();
      if (!authState.isAuthenticated) {
        throw new Error("Please sign in to Brandalyze first");
      }
    }

    console.log("✅ Authentication OK, making API request...");

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

    console.log("📤 LinkedIn analysis request:", requestBody);

    // Make the API request
    const response = await fetch(
      `${authState.currentApiUrl}/extension/analyze/profile/voice/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authState.clerkToken}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("📥 Response status:", response.status);

    // If 401, try refreshing auth once
    if (response.status === 401) {
      console.log("🔄 Got 401, refreshing auth and retrying once...");
      await checkClerkAuth();

      if (authState.isAuthenticated) {
        const retryResponse = await fetch(
          `${authState.currentApiUrl}/extension/analyze/profile/voice/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authState.clerkToken}`,
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
        console.log("✅ LinkedIn analysis completed (retry):", retryData);
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
    console.log("✅ LinkedIn analysis completed:", data);

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
    console.log("🔍 Starting content alignment analysis:", analysisData);

    // Ensure we have authentication
    if (!authState.isAuthenticated || !authState.clerkToken) {
      console.log("⚠️ Not authenticated, checking auth...");
      await checkClerkAuth();
      if (!authState.isAuthenticated) {
        throw new Error("Please sign in to Brandalyze first");
      }
    }

    console.log("✅ Authentication OK, making API request...");
    console.log(
      "🔗 API URL:",
      `${authState.currentApiUrl}/extension/analyze/content/alignment/`
    );

    const requestBody = {
      content: analysisData.content,
      type: analysisData.type || "brand",
      brand_id: analysisData.brand_id,
      reference_handle: analysisData.reference_handle,
      platform: analysisData.platform || "twitter",
    };
    console.log("📤 Request body:", requestBody);

    const response = await fetch(
      `${authState.currentApiUrl}/extension/analyze/content/alignment/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authState.clerkToken}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    console.log("📥 Response status:", response.status);

    // If 401, try refreshing auth once
    if (response.status === 401) {
      console.log("🔄 Got 401, refreshing auth and retrying once...");
      await checkClerkAuth();

      if (authState.isAuthenticated) {
        const retryResponse = await fetch(
          `${authState.currentApiUrl}/extension/analyze/content/alignment/`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${authState.clerkToken}`,
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
        console.log("✅ Analysis completed after retry:", data);
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
    console.log("✅ Analysis completed:", data);
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
      url: ["http://localhost:3000/*", "https://brandalyze.io/*"],
    });

    if (tabs.length > 0) {
      // Focus existing tab
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Determine which URL to open based on current API preference
      let appUrl;
      if (authState.currentApiUrl === DEV_API_BASE_URL) {
        appUrl = "http://localhost:3000/sign-in";
      } else {
        appUrl = "https://brandalyze.io/sign-in";
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
      console.log("JWT payload:", payload); // Debug log

      // Try multiple ways to get email from Clerk JWT
      let email = "Unknown";

      // Direct email field
      if (payload.email) {
        email = payload.email;
      }
      // Primary email address
      else if (payload.primary_email_address_id && payload.email_addresses) {
        const primaryEmail = payload.email_addresses.find(
          (e) => e.id === payload.primary_email_address_id
        );
        if (primaryEmail) email = primaryEmail.email_address;
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

// Update stored token when provided by main site
async function updateStoredToken(tokenData) {
  try {
    if (!tokenData.token) {
      throw new Error("No token provided");
    }

    // Verify the new token
    const isValid = await verifyClerkToken(
      tokenData.token,
      tokenData.apiUrl || DEV_API_BASE_URL
    );
    if (!isValid) {
      throw new Error("Invalid token provided");
    }

    // Calculate token expiry (24 hours from now as default)
    const tokenExpiry = Date.now() + 24 * 60 * 60 * 1000;

    // Store the new token
    await chrome.storage.local.set({
      clerkToken: tokenData.token,
      currentApiUrl: tokenData.apiUrl || DEV_API_BASE_URL,
      tokenExpiry: tokenExpiry,
    });

    // Update auth state
    authState.isAuthenticated = true;
    authState.clerkToken = tokenData.token;
    authState.jwt = tokenData.token;
    authState.currentApiUrl = tokenData.apiUrl || DEV_API_BASE_URL;
    authState.apiUrl = authState.currentApiUrl;
    authState.lastChecked = Date.now();

    console.log("Successfully updated stored token");
    return authState;
  } catch (error) {
    console.error("Failed to update stored token:", error);
    throw error;
  }
}
