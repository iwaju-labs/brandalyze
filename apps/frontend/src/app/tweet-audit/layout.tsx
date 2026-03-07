import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Tweet Audit Tool — Optimize Posts Before Publishing | Brandalyze",
  description:
    "Audit your tweets and social posts before publishing. Get AI-powered feedback on format, hook quality, brand voice alignment, and X/Twitter optimization tips.",
  keywords: [
    "tweet audit tool",
    "tweet analyzer",
    "twitter post checker",
    "social media post audit",
    "tweet optimizer",
    "x post analyzer",
    "social media brand voice",
    "tweet hook analyzer",
    "post engagement checker",
    "social media content checker",
  ],
  openGraph: {
    title: "Free Tweet Audit Tool — Optimize Posts Before Publishing",
    description:
      "Analyze your tweets for format, hook quality, and brand voice alignment before you post. Free to use.",
    type: "website",
    url: "https://brandalyze.io/tweet-audit",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Tweet Audit Tool — Optimize Posts Before Publishing",
    description:
      "Analyze your tweets for format, hook quality, and brand voice alignment before you post. Free to use.",
  },
  alternates: {
    canonical: "https://brandalyze.io/tweet-audit",
  },
};

export default function TweetAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
