"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "../../../lib/api";

export default function ExtensionAuthPage() {
  const { getToken } = useAuth();
  const { isSignedIn, isLoaded } = useUser();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleExtensionAuth = async () => {
      if (!isLoaded) return;

      if (!isSignedIn) {
        const currentUrl = encodeURIComponent(globalThis.location.href);
        globalThis.location.href = `/sign-in?redirect_url=${currentUrl}`;
        return;
      }

      const extensionId = searchParams.get("extension_id");
      
      if (!extensionId) {
        console.error("No extension ID provided");
        document.body.innerHTML = `
          <div class="min-h-screen bg-gray-50 flex items-center justify-center">
            <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
              <div class="text-center">
                <h1 class="text-xl font-semibold text-red-600 mb-2">Invalid Request</h1>
                <p class="text-gray-600 mb-4">Missing extension ID. Please try again from the extension.</p>
              </div>
            </div>
          </div>
        `;
        return;
      }

      try {
        const response = await authenticatedFetch(
          "/extension/auth/generate-token/",
          getToken,
          { method: "POST" }
        );

        if (response.data?.token) {
          // Redirect to extension callback with token
          const callbackUrl = `chrome-extension://${extensionId}/auth-callback.html?token=${response.data.token}`;
          globalThis.location.href = callbackUrl;
        } else {
          throw new Error("No token received from server");
        }
      } catch (error) {
        console.error("Extension auth failed:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to connect to extension. Please ensure you have a Pro or Enterprise subscription.";
        document.body.innerHTML = `
          <div class="min-h-screen bg-gray-50 flex items-center justify-center">
            <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
              <div class="text-center">
                <h1 class="text-xl font-semibold text-red-600 mb-2">Connection Error</h1>
                <p class="text-gray-600 mb-4">${errorMessage}</p>
                <a href="/pricing" class="inline-block bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                  View Pricing
                </a>
              </div>
            </div>
          </div>
        `;
      }
    };

    handleExtensionAuth();
  }, [getToken, isLoaded, isSignedIn, searchParams]);
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
