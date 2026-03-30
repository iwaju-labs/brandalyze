"use client";

import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function UmamiScript() {
    const [hasConsent, setHasConsent] = useState<boolean>(false);

    useEffect(() => {
        const consent = localStorage.getItem('cookie-consent');
        setHasConsent(consent === 'accepted');
    }, []);

    if (!hasConsent) return null;

    return (
        <Script
            src="https://cloud.umami.is/script.js"
            data-website-id="93f69958-ca6f-4bee-974d-7b8da4f6e8ee"
            strategy="afterInteractive"
        />
    );
}
