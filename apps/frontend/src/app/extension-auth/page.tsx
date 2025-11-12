"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "../../../lib/api";

function ExtensionAuthContent() {
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
          const token = response.data.token;
          
          // Verify the token with the extension
          const verifyResponse = await authenticatedFetch(
            "/extension/auth/verify-token/",
            getToken,
            {
              method: "POST",
              headers: { "Authorization": `ExtensionToken ${token}` },
            }
          );

          if (verifyResponse.data?.valid) {
            // Show success screen
            document.body.innerHTML = `
              <div class="min-h-screen bg-gray-50 flex items-center justify-center">
                <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                  <div class="text-center">
                    <div class="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                      <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <h1 class="text-xl font-semibold text-green-600 mb-2">Authentication Successful!</h1>
                    <p class="text-gray-600 mb-4">Your Brandalyze extension is now connected.</p>
                    <p class="text-sm text-gray-500 mb-6">This tab will close automatically in <span id="countdown">5</span> seconds.</p>
                    <button 
                      onclick="window.close()" 
                      class="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-medium transition-colors"
                    >
                      Close Tab Now
                    </button>
                  </div>
                </div>
              </div>
            `;

            // Send token to extension via chrome-extension URL
            const callbackUrl = `chrome-extension://${extensionId}/auth-callback.html?token=${token}`;
            const iframe = document.createElement("iframe");
            iframe.style.display = "none";
            iframe.src = callbackUrl;
            document.body.appendChild(iframe);

            // Countdown timer
            let countdown = 5;
            const countdownElement = document.getElementById("countdown");
            const timer = setInterval(() => {
              countdown--;
              if (countdownElement) {
                countdownElement.textContent = countdown.toString();
              }
              if (countdown <= 0) {
                clearInterval(timer);
                globalThis.close();
              }
            }, 1000);
          } else {
            throw new Error("Token verification failed");
          }
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

export default function ExtensionAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4">
                <div className="w-full h-full border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Loading...
              </h1>
            </div>
          </div>
        </div>
      }
    >
      <ExtensionAuthContent />
    </Suspense>
  );
}
