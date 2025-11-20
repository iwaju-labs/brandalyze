import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Navbar } from "@/components/navigation/navbar";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme/theme-provider";

import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/nextjs";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brandalyze - AI-Powered Brand Voice Analysis Tool",
  description:
    "Ensure consistent brand voice across all your content with AI-powered analysis. Get instant feedback on brand alignment, tone, and messaging consistency. Perfect for marketers, content creators, and businesses.",
  keywords: [
    "brand voice analysis",
    "AI brand consistency",
    "content marketing tool",
    "brand alignment",
    "marketing automation",
    "brand voice checker",
    "content analysis",
    "grammarly for brands",
    "AI copywriting tool",
    "marketing analytics",
  ],
  authors: [{ name: "Brandalyze" }, { name: "IWAJU LABS" }],
  creator: "Brandalyze",
  publisher: "Brandalyze",
  icons: {
    icon: [{ url: "/icon.png", sizes: "any" }],
    apple: "/icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://brandalyze.io",
    title: "Brandalyze - AI-Powered Brand Voice Analysis Tool",
    description:
      "Ensure consistent brand voice across all your content with AI-powered analysis. Get instant feedback on brand alignment, tone, and messaging consistency.",
    siteName: "Brandalyze",
    images: [
      {
        url: "https://brandalyze.io/assets/og-image.png",
        width: 1200,
        height: 630,
        alt: "Brandalyze - AI Brand Voice Analysis Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Brandalyze - AI-Powered Brand Voice Analysis Tool",
    description:
      "Ensure consistent brand voice across all your content with AI-powered analysis. Get instant feedback on brand alignment, tone, and messaging consistency.",
    images: ["https://brandalyze.io/assets/og-image.png"],
    creator: "@brandalyze",
  },
  alternates: {
    canonical: "https://brandalyze.io",
  },
  category: "Marketing Technology",
  classification: "Business Software",
  applicationName: "Brandalyze",
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://brandalyze.io"),
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Brandalyze",
    "mobile-web-app-capable": "yes",
    "theme-color": "#7c3aed",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=5"
          />
          <meta name="theme-color" content="#7c3aed" />
          <meta name="color-scheme" content="light dark" />
          <link rel="icon" href="/icon.png" type="image/png" />
          <link rel="apple-touch-icon" href="/icon.png" />
          <link rel="manifest" href="/manifest.json" />

          {/* OpenGraph Meta Tags */}
          <meta
            property="og:image"
            content="https://brandalyze.io/assets/og-image.png"
          />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta
            property="og:image:alt"
            content="Brandalyze - AI Brand Voice Analysis Tool"
          />

          {/* Twitter Meta Tags */}
          <meta
            name="twitter:image"
            content="https://brandalyze.io/assets/og-image.png"
          />
          <meta name="twitter:domain" content="brandalyze.io" />
          <meta name="twitter:url" content="https://brandalyze.io" />
          <script
            dangerouslySetInnerHTML={{
              __html: `(function() {
                  const theme = localStorage.getItem('theme') || 'light';
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                })();
              `,
            }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: "Brandalyze",
                description:
                  "AI-powered brand voice analysis tool that ensures consistent brand messaging across all your content.",
                url: "https://brandalyze.io",
                applicationCategory: "BusinessApplication",
                operatingSystem: "Web",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                  availability: "https://schema.org/InStock",
                },
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: "4.8",
                  ratingCount: "127",
                },
                author: {
                  "@type": "Organization",
                  name: "Brandalyze",
                },
              }),
            }}
          />
        </head>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning={true}
        >
          <ThemeProvider defaultTheme="light">
            <Navbar />
            {children}
            <Footer />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
              }}
            />
          </ThemeProvider>
          <Script
            defer
            src="https://cloud.umami.is/script.js"
            data-website-id="93f69958-ca6f-4bee-974d-7b8da4f6e8ee"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}
