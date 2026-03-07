import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free Content Alignment Checker — Test Brand Consistency | Brandalyze",
  description:
    "Check if your new content matches your brand voice. Paste brand samples and new text to get an AI-powered alignment score with actionable feedback.",
  keywords: [
    "content alignment checker",
    "brand alignment tool",
    "brand consistency checker",
    "brand voice comparison",
    "content brand match",
    "brand alignment score",
    "writing consistency tool",
    "brand messaging checker",
    "content tone matcher",
  ],
  openGraph: {
    title: "Free Content Alignment Checker — Test Brand Consistency",
    description:
      "Compare new content against your brand samples. Get an instant alignment score and AI feedback.",
    type: "website",
    url: "https://brandalyze.io/content-alignment-checker",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Content Alignment Checker — Test Brand Consistency",
    description:
      "Compare new content against your brand samples. Get an instant alignment score and AI feedback.",
  },
  alternates: {
    canonical: "https://brandalyze.io/content-alignment-checker",
  },
};

export default function ContentAlignmentCheckerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
