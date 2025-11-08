import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Brand Voice Analysis - Brandalyze | AI-Powered Content Analysis",
  description: "Analyze your content for brand voice consistency. Upload your brand samples and get instant AI-powered feedback on tone, messaging alignment, and brand coherence.",
  robots: {
    index: false, // Analysis page should be private/gated
    follow: true,
  },
  alternates: {
    canonical: "https://brandalyze.io/analyze",
  },
};

export default function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
