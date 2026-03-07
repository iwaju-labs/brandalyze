import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Brand Voice Checker — Analyze Your Writing Instantly | Brandalyze",
  description:
    "Check your brand voice for free. Paste your content and get instant AI-powered feedback on tone, personality traits, style consistency, and emotional indicators.",
  keywords: [
    "brand voice checker",
    "brand voice tool",
    "brand voice analyzer",
    "tone analyzer",
    "brand tone checker",
    "free brand voice analysis",
    "brand consistency checker",
    "writing tone checker",
    "brand personality analyzer",
  ],
  openGraph: {
    title: "Free Brand Voice Checker — Analyze Your Writing Instantly",
    description:
      "Paste your brand content and get instant AI feedback on tone, style, and personality traits. Free to use.",
    type: "website",
    url: "https://brandalyze.io/brand-voice-checker",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Brand Voice Checker — Analyze Your Writing Instantly",
    description:
      "Paste your brand content and get instant AI feedback on tone, style, and personality traits. Free to use.",
  },
  alternates: {
    canonical: "https://brandalyze.io/brand-voice-checker",
  },
};

export default function BrandVoiceCheckerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
