"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookieBanner() {
    const [showBanner, setShowBanner] = useState<boolean>(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        if (!consent) {
            setShowBanner(true);
        } else if (consent === 'accepted') {
            // Enable Umami tracking
            enableUmamiTracking();
        }
    }, []);

    const enableUmamiTracking = () => {
        // Umami automatically tracks when script is loaded
        // You can optionally dispatch a custom event
        if (globalThis.window !== undefined) {
            const umami = (globalThis as unknown as { umami?: { track: (event: string) => void } }).umami;
            if (umami) {
                umami.track('consent-accepted');
            }
        }
    };

    const handleAccept = () => {
        localStorage.setItem('cookie-consent', 'accepted');
        setShowBanner(false);
        enableUmamiTracking();
    };

    const handleDecline = () => {
        localStorage.setItem('cookie-consent', 'declined');
        setShowBanner(false);
        
        // Disable Umami tracking by removing data-website-id attribute
        if (globalThis.window !== undefined) {
            const umamiScript = document.querySelector('script[data-website-id]');
            if (umamiScript) {
                umamiScript.remove();
            }
        }
    };

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:max-w-md z-[100] bg-white dark:bg-gray-900 border-2 border-black dark:border-white rounded-xl shadow-[8px_8px_0_0_#9333EA] p-6">
            <div className="flex flex-col gap-4">
                <div>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">
                        We use cookies to analyze site traffic and improve your experience. No personal data is collected.
                        <Link href="/privacy" className="underline ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
                            Learn more
                        </Link>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleDecline}
                        className="flex-1 px-4 py-2 text-sm font-medium border-2 border-black dark:border-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-mono"
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        className="flex-1 px-4 py-2 text-sm font-medium bg-purple-600 text-white border-2 border-purple-600 rounded-lg hover:bg-purple-700 transition-colors font-mono"
                    >
                        Accept
                    </button>
                </div>
            </div>
        </div>
    );
}