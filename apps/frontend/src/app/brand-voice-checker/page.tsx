import type { Metadata } from "next";
import Link from "next/link";

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

const useCases = [
  {
    title: "Content Marketers",
    description:
      "Ensure every blog post, email, and social caption sounds like your brand before publishing.",
  },
  {
    title: "Freelance Writers",
    description:
      "Quickly learn a new client's brand voice by analyzing their existing content samples.",
  },
  {
    title: "Social Media Managers",
    description:
      "Keep tone consistent across multiple platforms and team members.",
  },
  {
    title: "Brand Managers",
    description:
      "Audit agency deliverables and user-generated content for voice alignment.",
  },
];

const faqs = [
  {
    question: "What is a brand voice checker?",
    answer:
      "A brand voice checker analyzes your writing to identify tone, style, and personality traits. It helps you understand how your content sounds and whether it stays consistent with your brand identity.",
  },
  {
    question: "How does the brand voice analysis work?",
    answer:
      "Paste samples of your brand's writing (marketing copy, social posts, emails). Our AI extracts tone, style, personality traits, and emotional indicators, then gives you a confidence score and actionable recommendations.",
  },
  {
    question: "Is the brand voice checker free?",
    answer:
      "Yes. Free accounts get daily analyses. Sign up takes seconds and no credit card is required. Upgrade to Pro for unlimited analyses and advanced features.",
  },
  {
    question: "What kind of content can I analyze?",
    answer:
      "Any text content works: social media posts, blog articles, email newsletters, ad copy, website copy, press releases, and more.",
  },
  {
    question: "How is this different from a grammar checker?",
    answer:
      "Grammar checkers fix spelling and syntax. A brand voice checker analyzes the personality, tone, and emotional feel of your writing to ensure it matches your brand identity.",
  },
];

export default function BrandVoiceCheckerPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <main className="mx-auto max-w-4xl px-4 py-16">
        {/* Headline */}
        <section className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            {"Free Brand Voice Checker"}
            <span className="text-purple-600 dark:text-purple-400">.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-mono">
            Analyze your writing instantly. Understand your tone, style, and personality traits.
          </p>
        </section>

        {/* Tool Preview */}
        <section className="mb-16">
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
              <h2 className="text-lg font-semibold">Brand Voice Assessment</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Paste your brand content samples below to analyze your voice characteristics.
            </p>
            <div className="space-y-4">
              <textarea
                disabled
                placeholder="Paste your brand content here (e.g., social posts, marketing copy, emails)..."
                className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 resize-none cursor-not-allowed"
              />
              <div className="flex flex-wrap gap-2">
                {["enthusiasm", "professionalism", "approachability", "authority"].map((indicator) => (
                  <span
                    key={indicator}
                    className="px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  >
                    {indicator}
                  </span>
                ))}
              </div>
              <Link
                href="/sign-up"
                className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                Sign Up Free to Analyze Your Brand Voice
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 font-mono">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">1</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Paste Your Content</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add 2-5 samples of your brand writing: social posts, emails, ad copy, or blog excerpts.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">2</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">AI Analyzes Your Voice</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Our AI identifies tone, style, personality traits, and emotional indicators in your writing.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">3</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Get Actionable Insights</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive a confidence score, brand recommendations, and a detailed voice profile you can save.
              </p>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 font-mono">
            Who Is This For?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {useCases.map((useCase) => (
              <div
                key={useCase.title}
                className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <h3 className="font-semibold mb-2">{useCase.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {useCase.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 font-mono">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-6"
              >
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-12 px-6 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-purple-50 dark:bg-purple-900/10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to check your brand voice?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
            Create a free account and start analyzing your brand voice in seconds. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center px-8 py-4 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors text-lg"
          >
            Get Started Free
            <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
        </section>
      </main>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Brand Voice Checker",
            description:
              "Free AI-powered brand voice checker. Analyze your writing for tone, style, and personality traits.",
            url: "https://brandalyze.io/brand-voice-checker",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            provider: {
              "@type": "Organization",
              name: "Brandalyze",
              url: "https://brandalyze.io",
            },
          }),
        }}
      />
    </div>
  );
}
