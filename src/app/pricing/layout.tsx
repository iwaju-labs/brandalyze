import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing Plans - Brandalyze | AI Brand Voice Analysis Tool",
  description: "Choose the perfect plan for your brand analysis needs. Start with our free tier or upgrade to Pro for unlimited analyses. Affordable pricing for businesses of all sizes.",
  keywords: [
    "brand analysis pricing",
    "AI tool subscription",
    "marketing software pricing",
    "brand voice analysis cost",
    "content marketing tool pricing",
    "free brand analysis trial"
  ],
  openGraph: {
    title: "Pricing Plans - Brandalyze | AI Brand Voice Analysis Tool",
    description: "Choose the perfect plan for your brand analysis needs. Start with our free tier or upgrade to Pro for unlimited analyses.",
    type: "website",
    url: "https://brandalyze.io/pricing",
  },
  twitter: {
    title: "Pricing Plans - Brandalyze | AI Brand Voice Analysis Tool",
    description: "Choose the perfect plan for your brand analysis needs. Start with our free tier or upgrade to Pro for unlimited analyses.",
  },
  alternates: {
    canonical: "https://brandalyze.io/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
