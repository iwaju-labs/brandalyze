"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { authenticatedFetch } from "../../../lib/api";

export default function ExtensionAuthPage() {
  const { getToken } = useAuth();
  const { isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    const handleExtensionAuth = async () => {
      // Wait for user data to load
      if (!isLoaded) return;

      // Check if user is signed in
      if (!isSignedIn) {
        // Redirect to sign in with return URL
        const currentUrl = encodeURIComponent(globalThis.location.href);
        globalThis.location.href = `/sign-in?redirect_url=${currentUrl}`;
        return;
      }
      try {
        const response = await authenticatedFetch(
          "/extension/auth/create/",
          getToken,
          { method: "POST" }
        );

        if (response.data?.auth_code) {
          // Show success message with auth code that extension can detect
          document.body.innerHTML = `
                        <div class="min-h-screen bg-gray-50 flex items-center justify-center">
                            <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                                <div class="text-center">
                                    <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                        <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                                        </svg>
                                    </div>
                                    <h1 class="text-xl font-semibold text-green-600 mb-2">
                                        Authentication Successful!
                                    </h1>
                                    <p class="text-gray-600 mb-4">
                                        Your extension should now be connected. This tab will close automatically.
                                    </p>
                                    <div class="text-xs text-gray-500 mb-4 p-2 bg-gray-100 rounded font-mono">
                                        Auth Code: ${response.data.auth_code}
                                    </div>
                                    <button onclick="globalThis.close()" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded">
                                        Close Tab
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
          // Auto-close after 5 seconds
          setTimeout(() => {
            globalThis.close();
          }, 5000);
        } else {
          console.error("No auth code received:", response);
          // Show error message to user
          document.body.innerHTML = `
                        <div class="min-h-screen bg-gray-50 flex items-center justify-center">
                            <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                                <div class="text-center">
                                    <h1 class="text-xl font-semibold text-red-600 mb-2">
                                        Authentication Failed
                                    </h1>
                                    <p class="text-gray-600 mb-4">
                                        Unable to connect to the extension. Please try again.
                                    </p>
                                    <button onclick="globalThis.close()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
        }
      } catch (error) {
        console.error("Extension auth failed:", error);
        // Show error message to user
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to connect to extension. Please ensure you have a Pro or Enterprise subscription.";
        document.body.innerHTML = `
                    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
                        <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                            <div class="text-center">
                                <h1 class="text-xl font-semibold text-red-600 mb-2">
                                    Connection Error
                                </h1>
                                <p class="text-gray-600 mb-4">
                                    ${errorMessage}
                                </p>
                                <button onclick="globalThis.close()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                `;
      }
    };

    handleExtensionAuth();
  }, [getToken, isLoaded, isSignedIn]);
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4">
            <div className="w-full h-full border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Connecting to Extension
          </h1>
          <p className="text-gray-600">
            Please wait while we link your account to the browser extension...
          </p>
        </div>
      </div>
    </div>
  );
}
