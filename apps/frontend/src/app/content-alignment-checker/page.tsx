import type { Metadata } from "next";
import Link from "next/link";

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

const useCases = [
  {
    title: "Marketing Teams",
    description:
      "Verify that every campaign asset matches your established brand voice before launch.",
  },
  {
    title: "Content Agencies",
    description:
      "Deliver on-brand work to clients by checking alignment against their approved samples.",
  },
  {
    title: "Startup Founders",
    description:
      "Maintain a consistent voice as your team grows and more people create content.",
  },
  {
    title: "Copywriters",
    description:
      "Score your drafts against existing brand material to catch tone drift early.",
  },
];

const faqs = [
  {
    question: "What is a content alignment checker?",
    answer:
      "A content alignment checker compares new writing against established brand samples and scores how closely they match in tone, style, and messaging. It helps catch off-brand content before publishing.",
  },
  {
    question: "How does the alignment score work?",
    answer:
      "You provide brand samples (existing on-brand content) and new text. Our AI compares them and returns a 0-100 alignment score with detailed feedback explaining where the new text matches or deviates from your brand voice.",
  },
  {
    question: "How many brand samples should I provide?",
    answer:
      "We recommend 2-5 samples of your best on-brand content. More samples give the AI a clearer picture of your voice. Free accounts support up to 5 samples per analysis.",
  },
  {
    question: "Is the content alignment checker free?",
    answer:
      "Yes. Free accounts get daily analyses with up to 5 brand samples. Sign up is instant and no credit card is required. Upgrade to Pro for unlimited analyses.",
  },
  {
    question: "What types of content can I compare?",
    answer:
      "Any text-based content: social posts, blog drafts, email campaigns, ad copy, website pages, press releases, and more. The brand samples and new text can be different content types.",
  },
];

export default function ContentAlignmentCheckerPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <main className="mx-auto max-w-4xl px-4 py-16">
        {/* Headline */}
        <section className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            {"Free Content Alignment Checker"}
            <span className="text-purple-600 dark:text-purple-400">.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-mono">
            Score how closely your new content matches your brand voice.
          </p>
        </section>

        {/* Tool Preview */}
        <section className="mb-16">
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
              <h2 className="text-lg font-semibold">Content Alignment</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Paste your brand samples and the new text you want to check.
            </p>
            <div className="space-y-4">
              <div>
                <p className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Brand Samples
                </p>
                <textarea
                  disabled
                  placeholder="Paste examples of your brand's writing style..."
                  className="w-full h-24 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 resize-none cursor-not-allowed"
                />
              </div>
              <div>
                <p className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  New Content to Check
                </p>
                <textarea
                  disabled
                  placeholder="Paste the new text you want to check for brand alignment..."
                  className="w-full h-24 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 resize-none cursor-not-allowed"
                />
              </div>
              {/* Score preview */}
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="w-16 h-16 rounded-full border-4 border-purple-200 dark:border-purple-800 flex items-center justify-center">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">--</span>
                </div>
                <div>
                  <p className="font-semibold">Alignment Score</p>
                  <p className="text-sm text-gray-500">Sign up to see your score</p>
                </div>
              </div>
              <Link
                href="/sign-up"
                className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                Sign Up Free to Check Content Alignment
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
              <h3 className="font-semibold mb-2">Add Brand Samples</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Paste 2-5 examples of on-brand content: marketing copy, social posts, emails, or blog excerpts.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">2</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Paste New Content</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add the new text you want to compare. It can be a draft, a deliverable from a writer, or any content to verify.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">3</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Get Your Score</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive a 0-100 alignment score with AI-generated feedback explaining exactly where the content matches or deviates.
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
            Ready to check your content alignment?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
            Create a free account and start comparing content against your brand voice in seconds. No credit card required.
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
            name: "Content Alignment Checker",
            description:
              "Free AI-powered content alignment checker. Compare new writing against brand samples and get an alignment score.",
            url: "https://brandalyze.io/content-alignment-checker",
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
