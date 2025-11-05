"use client";

import { useAuth } from "@clerk/nextjs"
import { useEffect } from "react";
import { authenticatedFetch } from "../../../lib/api";

export default function ExtensionAuthPage() {
    const { getToken } = useAuth();

    useEffect(() => {
        const handleExtensionAuth = async () => {
            try {
                // Get extension ID from URL params or use a default
                const urlParams = new URLSearchParams(window.location.search);
                const extensionId = urlParams.get('extension_id') || 'chnffppbmnlchenodfkbldobgmfgpbph';
                
                const response = await authenticatedFetch(
                    '/extension/auth/create/',
                    getToken,
                    { method: 'POST'}
                );

                if (response.data?.auth_code) {
                    // Redirect to extension with auth code
                    window.location.href = `chrome-extension://${extensionId}/auth-callback.html?code=${response.data.auth_code}`;
                } else {
                    console.error('No auth code received:', response);
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
                                    <button onclick="window.close()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Extension auth failed:', error);
                // Show error message to user
                document.body.innerHTML = `
                    <div class="min-h-screen bg-gray-50 flex items-center justify-center">
                        <div class="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
                            <div class="text-center">
                                <h1 class="text-xl font-semibold text-red-600 mb-2">
                                    Connection Error
                                </h1>
                                <p class="text-gray-600 mb-4">
                                    ${error.message || 'Failed to connect to extension. Please ensure you have a Pro or Enterprise subscription.'}
                                </p>
                                <button onclick="window.close()" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        };

        handleExtensionAuth();
    }, [getToken]);

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