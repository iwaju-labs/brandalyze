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

          if (verifyResponse.data?.user_id) {
            // Send token directly to extension using chrome.runtime.sendMessage
            try {
              // @ts-expect-error - chrome.runtime exists when extension is installed
              if (typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage) {
                // @ts-expect-error - chrome.runtime exists
                chrome.runtime.sendMessage(
                  extensionId,
                  {
                    action: 'storeExtensionToken',
                    token: token
                  },
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (response: any) => {
                    console.log('Extension response:', response);
                    // @ts-expect-error - chrome.runtime exists
                    if (chrome.runtime.lastError) {
                      // @ts-expect-error - chrome.runtime exists
                      console.error('Chrome runtime error:', chrome.runtime.lastError);
                      // Show error with manual token option
                      showManualTokenScreen(token);
                    } else if (response && response.success) {
                      // Show success screen
                      showSuccessScreen();
                    } else {
                      showManualTokenScreen(token);
                    }
                  }
                );
              } else {
                // Chrome APIs not available, show manual token screen
                showManualTokenScreen(token);
              }
            } catch (err) {
              console.error('Failed to send message to extension:', err);
              showManualTokenScreen(token);
            }

            function showSuccessScreen() {
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
            }

            function showManualTokenScreen(token: string) {
              document.body.innerHTML = `
                <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                  <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                    <div class="text-center">
                      <div class="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                      </div>
                      <h1 class="text-xl font-semibold text-gray-900 mb-2">Manual Setup Required</h1>
                      <p class="text-gray-600 mb-4 text-sm">Copy this token and paste it in the extension console:</p>
                      <div class="bg-gray-50 p-3 rounded border border-gray-200 mb-4">
                        <code class="text-xs break-all select-all">${token}</code>
                      </div>
                      <ol class="text-left text-sm text-gray-600 mb-4 space-y-2">
                        <li>1. Open extension popup</li>
                        <li>2. Right-click → Inspect</li>
                        <li>3. Go to Console tab</li>
                        <li>4. Paste: <code class="bg-gray-100 px-1 rounded">chrome.runtime.sendMessage({action: 'storeExtensionToken', token: '${token}'})</code></li>
                      </ol>
                      <button 
                        onclick="navigator.clipboard.writeText('${token}'); this.textContent='Copied!'; setTimeout(() => this.textContent='Copy Token', 2000)"
                        class="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded font-medium transition-colors mb-2"
                      >
                        Copy Token
                      </button>
                    </div>
                  </div>
                </div>
              `;
            }
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
