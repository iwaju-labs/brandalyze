import type { Metadata } from "next";
import Link from "next/link";

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

const useCases = [
  {
    title: "Personal Brand Builders",
    description:
      "Test every tweet against your established voice before posting to maintain audience trust.",
  },
  {
    title: "Social Media Managers",
    description:
      "Audit client posts for hook quality, format, and brand alignment before scheduling.",
  },
  {
    title: "Creators & Influencers",
    description:
      "Optimize engagement by checking hook quality and closer effectiveness on every post.",
  },
  {
    title: "Growth Marketers",
    description:
      "Get data-driven feedback on post format and optimization suggestions to increase reach.",
  },
];

const faqs = [
  {
    question: "What does the tweet audit tool check?",
    answer:
      "The tool analyzes three key areas: format type (thread, listicle, story, etc.), hook quality (how well your opening grabs attention), and closer effectiveness. If you have a saved brand voice, it also scores brand voice alignment with tone, vocabulary, and emotional consistency metrics.",
  },
  {
    question: "Do I need a saved brand voice to use the tweet audit?",
    answer:
      "No. The ML analysis (format, hook, closer) works on any tweet. Brand voice scoring is an additional layer that activates when you have a saved brand voice profile from the Brand Voice Checker.",
  },
  {
    question: "Is the tweet audit tool free?",
    answer:
      "Yes. Free accounts can audit tweets daily. Sign up is instant and no credit card is required. Pro users get unlimited audits and advanced optimization suggestions.",
  },
  {
    question: "Does it work for platforms other than X/Twitter?",
    answer:
      "The format, hook, and closer analysis works for any short-form social content. The X-specific optimization tips are tailored for Twitter/X but the general feedback applies to LinkedIn posts, Threads, and similar platforms.",
  },
  {
    question: "How does the hook quality score work?",
    answer:
      "Our ML model evaluates your opening line against patterns that drive engagement: curiosity gaps, bold claims, specificity, relatability, and pattern interrupts. You get a quality label and confidence score.",
  },
];

export default function TweetAuditPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <main className="mx-auto max-w-4xl px-4 py-16">
        {/* Headline */}
        <section className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            {"Free Tweet Audit Tool"}
            <span className="text-purple-600 dark:text-purple-400">.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-mono">
            Optimize your posts before publishing. Check format, hook quality, and brand alignment.
          </p>
        </section>

        {/* Tool Preview */}
        <section className="mb-16">
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
              <h2 className="text-lg font-semibold">Tweet Audit</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Paste your tweet or social post below to get instant feedback.
            </p>
            <div className="space-y-4">
              <textarea
                disabled
                placeholder="Paste your tweet or social post here..."
                className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 resize-none cursor-not-allowed"
                maxLength={280}
              />
              {/* Audit preview cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                  <p className="text-xs text-gray-500 mb-1">Format</p>
                  <p className="font-semibold text-gray-400">--</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                  <p className="text-xs text-gray-500 mb-1">Hook Quality</p>
                  <p className="font-semibold text-gray-400">--</p>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 text-center">
                  <p className="text-xs text-gray-500 mb-1">Closer Type</p>
                  <p className="font-semibold text-gray-400">--</p>
                </div>
              </div>
              <Link
                href="/sign-up"
                className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-purple-600 hover:bg-purple-700 text-white transition-colors"
              >
                Sign Up Free to Audit Your Posts
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
              <h3 className="font-semibold mb-2">Paste Your Post</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Drop in your tweet, thread opener, or any short-form social post you want to audit.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">2</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">ML + Brand Voice Analysis</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Our models evaluate format, hook quality, and closer type. If you have a saved brand voice, it also scores voice alignment.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">3</span>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Optimize & Post</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get specific suggestions to improve engagement, fix tone drift, and strengthen your hook before publishing.
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
            Ready to audit your posts?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">
            Create a free account and start optimizing your social posts in seconds. No credit card required.
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
            name: "Tweet Audit Tool",
            description:
              "Free AI-powered tweet audit tool. Analyze format, hook quality, closer type, and brand voice alignment before publishing.",
            url: "https://brandalyze.io/tweet-audit",
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
