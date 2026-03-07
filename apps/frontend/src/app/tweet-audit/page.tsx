"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useUser, useAuth, SignedIn, SignedOut } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authenticatedFetch } from "../../../lib/api";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { FullPageLoader, LoadingSpinner, InlineLoader } from "@/components/ui/loading-spinner";

interface UsageInfo {
  subscription: {
    tier: string;
    daily_limit: number | null;
    brand_sample_limit: number | null;
    is_active: boolean;
  };
  usage: {
    today_count: number;
    remaining_today: number | null;
    date: string;
  };
}

interface TweetAnalysisResult {
  ml_analysis: {
    format: { label: string; confidence: number };
    hookQuality: { label: string; confidence: number };
    closerType: { label: string; confidence: number };
  };
  brand_voice_analysis: {
    score: number;
    breakdown: {
      tone_match: number;
      vocabulary_consistency: number;
      emotional_alignment: number;
      style_deviation: number;
    };
    metric_tips: Record<string, string>;
    deviations: string[];
    x_optimization: {
      score: number;
      suggestions: string[];
      factors: Record<string, unknown>;
    } | null;
    ai_feedback: string | null;
    improvement_suggestions: string[];
    brand_name: string;
  } | null;
  has_brand: boolean;
}

const useCases = [
  { title: "Personal Brand Builders", description: "Test every tweet against your established voice before posting to maintain audience trust." },
  { title: "Social Media Managers", description: "Audit client posts for hook quality, format, and brand alignment before scheduling." },
  { title: "Creators & Influencers", description: "Optimize engagement by checking hook quality and closer effectiveness on every post." },
  { title: "Growth Marketers", description: "Get data-driven feedback on post format and optimization suggestions to increase reach." },
];

const faqs = [
  { question: "What does the tweet audit tool check?", answer: "The tool analyzes three key areas: format type (thread, listicle, story, etc.), hook quality (how well your opening grabs attention), and closer effectiveness. If you have a saved brand voice, it also scores brand voice alignment with tone, vocabulary, and emotional consistency metrics." },
  { question: "Do I need a saved brand voice to use the tweet audit?", answer: "No. The ML analysis (format, hook, closer) works on any tweet. Brand voice scoring is an additional layer that activates when you have a saved brand voice profile from the Brand Voice Checker." },
  { question: "Is the tweet audit tool free?", answer: "Yes. Free accounts can audit tweets daily. Sign up is instant and no credit card is required. Pro users get unlimited audits and advanced optimization suggestions." },
  { question: "Does it work for platforms other than X/Twitter?", answer: "The format, hook, and closer analysis works for any short-form social content. The X-specific optimization tips are tailored for Twitter/X but the general feedback applies to LinkedIn posts, Threads, and similar platforms." },
  { question: "How does the hook quality score work?", answer: "Our ML model evaluates your opening line against patterns that drive engagement: curiosity gaps, bold claims, specificity, relatability, and pattern interrupts. You get a quality label and confidence score." },
];

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-4 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</li>,
  blockquote: ({ children }) => <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4">{children}</blockquote>,
  code: ({ children, className }) => {
    const isInline = !className;
    return isInline ? (
      <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">{children}</code>
    ) : (
      <code className="block bg-gray-200 dark:bg-gray-700 p-3 rounded text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">{children}</code>
    );
  },
};

function TweetAuditTool() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const searchParams = useSearchParams();

  const [tweetContent, setTweetContent] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<TweetAnalysisResult | null>(null);
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);

  const fetchUsage = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/user/usage", getToken);
      setUsageInfo(response.data);
    } catch {
      toast.error("Failed to load usage information");
    } finally {
      setIsLoadingUsage(false);
    }
  }, [getToken]);

  useEffect(() => { fetchUsage(); }, [fetchUsage]);

  useEffect(() => {
    const text = searchParams.get("text");
    if (text) setTweetContent(decodeURIComponent(text));
  }, [searchParams]);

  const handleAnalyze = async () => {
    if (!tweetContent.trim()) {
      toast.error("Please enter tweet content to analyze.");
      return;
    }
    setIsAnalyzing(true);
    setResult(null);

    try {
      const response = await authenticatedFetch("/audits/analyze-tweet/", getToken, {
        method: "POST",
        body: JSON.stringify({ content: tweetContent }),
      });

      if (response.success && response.ml_analysis) {
        setResult({
          ml_analysis: response.ml_analysis,
          brand_voice_analysis: response.brand_voice_analysis,
          has_brand: response.has_brand,
        });
        toast.success("Tweet analysis complete.");
      } else {
        throw new Error(response.error || "Analysis failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze tweet.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-800";
    if (score >= 50) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {user?.firstName || "User"}!</h1>
          <p className="mt-2 text-gray-500">Paste your tweet or social post to get instant ML and brand voice feedback.</p>
          {isLoadingUsage ? (
            <InlineLoader text="Loading usage information..." size="sm" />
          ) : usageInfo?.usage.remaining_today === 0 ? (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Daily analysis limit reached.{" "}
                <Link href="/pricing" className="underline font-semibold">Upgrade to Pro</Link>
                {" "}for unlimited analyses.
              </p>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="tweet-content" className="block text-lg font-medium mb-2">Tweet Content</label>
            <p className="text-sm text-gray-500 mb-4">Paste your tweet to analyze its format, hook quality, and closer type</p>
            <textarea
              id="tweet-content"
              value={tweetContent}
              onChange={(e) => setTweetContent(e.target.value)}
              placeholder="Paste your tweet here..."
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-neutral-50 dark:bg-neutral-800 dark:text-white"
              maxLength={500}
            />
            <div className="text-xs text-gray-400 mt-1">{tweetContent.length}/500 characters</div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !tweetContent.trim()}
            className="w-full py-3 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <LoadingSpinner size="sm" />
                Analyzing...
              </>
            ) : "Analyze Tweet"}
          </button>

          {result && (
            <div className="mt-8 space-y-6">
              {/* ML Analysis */}
              <div className="bg-white dark:bg-inherit border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold mb-6">Content Structure Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Post Format</div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400 capitalize">{result.ml_analysis.format.label}</div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Confidence</span>
                        <span>{(result.ml_analysis.format.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${result.ml_analysis.format.confidence * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Hook Quality</div>
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 capitalize">{result.ml_analysis.hookQuality.label}</div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Confidence</span>
                        <span>{(result.ml_analysis.hookQuality.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${result.ml_analysis.hookQuality.confidence * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Closer Type</div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400 capitalize">{result.ml_analysis.closerType.label}</div>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Confidence</span>
                        <span>{(result.ml_analysis.closerType.confidence * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div className="bg-green-600 h-2 rounded-full" style={{ width: `${result.ml_analysis.closerType.confidence * 100}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Brand Voice Analysis */}
              {result.brand_voice_analysis ? (
                <div className="bg-white dark:bg-inherit border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">Brand Voice Analysis</h3>
                    <div className="flex items-center space-x-2">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${scoreColor(result.brand_voice_analysis.score)}`}>
                        {result.brand_voice_analysis.score}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-300">Voice Score</div>
                        <div className="text-lg font-semibold">out of 100</div>
                      </div>
                    </div>
                  </div>

                  {result.brand_voice_analysis.breakdown && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-purple-600">{result.brand_voice_analysis.breakdown.tone_match}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Tone Match</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-blue-600">{result.brand_voice_analysis.breakdown.vocabulary_consistency}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Vocabulary</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-green-600">{result.brand_voice_analysis.breakdown.emotional_alignment}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Emotional</div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
                        <div className="text-2xl font-bold text-orange-600">{result.brand_voice_analysis.breakdown.style_deviation}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Style</div>
                      </div>
                    </div>
                  )}

                  {result.brand_voice_analysis.deviations && result.brand_voice_analysis.deviations.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3">Voice Deviations</h4>
                      <ul className="space-y-2">
                        {result.brand_voice_analysis.deviations.map((deviation, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="text-yellow-500 mt-0.5">!</span>
                            {deviation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.brand_voice_analysis.x_optimization && result.brand_voice_analysis.x_optimization.suggestions.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3">X Algorithm Optimization</h4>
                      <ul className="space-y-2">
                        {result.brand_voice_analysis.x_optimization.suggestions.map((tip, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="text-blue-500 mt-0.5">*</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.brand_voice_analysis.ai_feedback && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3">AI Feedback</h4>
                      <div className="bg-gray-50 dark:bg-black text-black dark:text-white p-4 rounded-md prose prose-gray max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{result.brand_voice_analysis.ai_feedback}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {result.brand_voice_analysis.improvement_suggestions && result.brand_voice_analysis.improvement_suggestions.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3">Improvement Suggestions</h4>
                      <ul className="space-y-2">
                        {result.brand_voice_analysis.improvement_suggestions.map((suggestion, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="text-green-500 mt-0.5">+</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : !result.has_brand && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>No brand voice configured.</strong> Save a brand voice analysis to get detailed voice alignment scoring on your posts.
                  </p>
                  <Link href="/brand-voice-checker" className="inline-block mt-2 text-yellow-700 hover:text-yellow-800 underline text-sm">
                    Create a brand voice analysis
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function TweetAuditMarketingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <main className="mx-auto max-w-4xl px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            {"Free Tweet Audit Tool"}
            <span className="text-purple-600 dark:text-purple-400">.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-mono">
            Optimize your posts before publishing. Check format, hook quality, and brand alignment.
          </p>
        </section>

        <section className="mb-16">
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
              <h2 className="text-lg font-semibold">Tweet Audit</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Paste your tweet or social post below to get instant feedback.</p>
            <div className="space-y-4">
              <textarea disabled placeholder="Paste your tweet or social post here..." className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 resize-none cursor-not-allowed" maxLength={280} />
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
              <Link href="/sign-up" className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-purple-600 hover:bg-purple-700 text-white transition-colors">
                Sign Up Free to Audit Your Posts
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 font-mono">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Paste Your Post", desc: "Drop in your tweet, thread opener, or any short-form social post you want to audit." },
              { step: "2", title: "ML + Brand Voice Analysis", desc: "Our models evaluate format, hook quality, and closer type. If you have a saved brand voice, it also scores voice alignment." },
              { step: "3", title: "Optimize & Post", desc: "Get specific suggestions to improve engagement, fix tone drift, and strengthen your hook before publishing." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center p-6">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 font-bold text-lg">{step}</span>
                  </div>
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 font-mono">Who Is This For?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {useCases.map((useCase) => (
              <div key={useCase.title} className="p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="font-semibold mb-2">{useCase.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{useCase.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 font-mono">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.question} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{faq.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="text-center py-12 px-6 border-2 border-purple-200 dark:border-purple-800 rounded-xl bg-purple-50 dark:bg-purple-900/10">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to audit your posts?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">Create a free account and start optimizing your social posts in seconds. No credit card required.</p>
          <Link href="/sign-up" className="inline-flex items-center px-8 py-4 rounded-lg font-semibold bg-purple-600 hover:bg-purple-700 text-white transition-colors text-lg">
            Get Started Free
            <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
          </Link>
        </section>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Tweet Audit Tool",
            description: "Free AI-powered tweet audit tool. Analyze format, hook quality, closer type, and brand voice alignment before publishing.",
            url: "https://brandalyze.io/tweet-audit",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            provider: { "@type": "Organization", name: "Brandalyze", url: "https://brandalyze.io" },
          }),
        }}
      />
    </div>
  );
}

function TweetAuditInner() {
  return (
    <>
      <SignedIn>
        <TweetAuditTool />
      </SignedIn>
      <SignedOut>
        <TweetAuditMarketingPage />
      </SignedOut>
    </>
  );
}

export default function TweetAuditPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <TweetAuditInner />
    </Suspense>
  );
}
