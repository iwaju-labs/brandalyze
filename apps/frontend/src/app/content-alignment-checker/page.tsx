"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useUser, useAuth, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import {
  authenticatedFetch,
  authenticatedFetchStream,
} from "../../../lib/api";
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

interface BrandAlignmentResult {
  brand_analysis: {
    alignment_score: number;
    feedback: string;
    brand_samples_analyzed: number;
    analysis_successful?: boolean;
    error?: string;
  };
  input_info: {
    new_text_length: number;
    brand_samples_count: number;
    analysis_type: string;
  };
}

const useCases = [
  { title: "Marketing Teams", description: "Verify that every campaign asset matches your established brand voice before launch." },
  { title: "Content Agencies", description: "Deliver on-brand work to clients by checking alignment against their approved samples." },
  { title: "Startup Founders", description: "Maintain a consistent voice as your team grows and more people create content." },
  { title: "Copywriters", description: "Score your drafts against existing brand material to catch tone drift early." },
];

const faqs = [
  { question: "What is a content alignment checker?", answer: "A content alignment checker compares new writing against established brand samples and scores how closely they match in tone, style, and messaging. It helps catch off-brand content before publishing." },
  { question: "How does the alignment score work?", answer: "You provide brand samples (existing on-brand content) and new text. Our AI compares them and returns a 0-100 alignment score with detailed feedback explaining where the new text matches or deviates from your brand voice." },
  { question: "How many brand samples should I provide?", answer: "We recommend 2-5 samples of your best on-brand content. More samples give the AI a clearer picture of your voice. Free accounts support up to 5 samples per analysis." },
  { question: "Is the content alignment checker free?", answer: "Yes. Free accounts get daily analyses with up to 5 brand samples. Sign up is instant and no credit card is required. Upgrade to Pro for unlimited analyses." },
  { question: "What types of content can I compare?", answer: "Any text-based content: social posts, blog drafts, email campaigns, ad copy, website pages, press releases, and more. The brand samples and new text can be different content types." },
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

function getBrandSampleLimit(subscription: UsageInfo["subscription"]) {
  switch (subscription.tier) {
    case "pro":
    case "enterprise":
      return null;
    default:
      return 5;
  }
}

function ContentAlignmentCheckerTool() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [brandSamples, setBrandSamples] = useState<string[]>([""]);
  const [newText, setNewText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [streamingFeedback, setStreamingFeedback] = useState("");
  const [result, setResult] = useState<BrandAlignmentResult | null>(null);
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

  const addSample = () => {
    if (!usageInfo) return;
    const limit = getBrandSampleLimit(usageInfo.subscription);
    if (limit && brandSamples.length >= limit) {
      toast.error(`Free plan limited to ${limit} brand samples. Upgrade for unlimited samples.`);
      return;
    }
    setBrandSamples([...brandSamples, ""]);
  };

  const updateSample = (index: number, value: string) => {
    const updated = [...brandSamples];
    updated[index] = value;
    setBrandSamples(updated);
  };

  const removeSample = (index: number) => {
    setBrandSamples(brandSamples.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (usageInfo?.usage.remaining_today === 0) {
      toast.error("Daily analysis limit reached. Please upgrade or try again tomorrow.");
      return;
    }
    const filtered = brandSamples.filter((s) => s.trim().length > 0);
    if (filtered.length === 0) {
      toast.error("Please add at least one brand sample.");
      return;
    }
    if (!newText.trim()) {
      toast.error("Please enter text to analyze.");
      return;
    }
    setIsAnalyzing(true);
    setResult(null);
    setStreamingFeedback("");

    try {
      const response = await authenticatedFetchStream(
        "/analyze/brand-alignment",
        getToken,
        {
          method: "POST",
          body: JSON.stringify({ text: newText, brand_samples: filtered }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status} ${response.statusText}: ${errorText}`);
      }
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let latestFeedback = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            if (data.error) { toast.error(`Analysis failed: ${data.error}`); continue; }
            if (data.ai_feedback) { latestFeedback = data.ai_feedback; setStreamingFeedback(data.ai_feedback); }
            if (data.ai_feedback && data.alignment_score !== undefined) {
              setResult({
                brand_analysis: {
                  alignment_score: data.alignment_score || 0,
                  feedback: data.ai_feedback,
                  brand_samples_analyzed: data.brand_samples_analyzed || filtered.length,
                  analysis_successful: true,
                },
                input_info: {
                  new_text_length: newText.length,
                  brand_samples_count: filtered.length,
                  analysis_type: "brand_alignment",
                },
              });
            }
          } catch {
            // partial line
          }
        }
      }

      if (buffer.trim()) {
        try {
          const finalData = JSON.parse(buffer.trim());
          setResult({
            brand_analysis: {
              alignment_score: finalData.alignment_score || 0,
              feedback: finalData.ai_feedback || latestFeedback,
              brand_samples_analyzed: finalData.brand_samples_analyzed || filtered.length,
              analysis_successful: true,
            },
            input_info: {
              new_text_length: newText.length,
              brand_samples_count: filtered.length,
              analysis_type: "brand_alignment",
            },
          });
        } catch {
          if (latestFeedback) {
            setResult({
              brand_analysis: {
                alignment_score: 0,
                feedback: latestFeedback,
                brand_samples_analyzed: filtered.length,
                analysis_successful: true,
              },
              input_info: {
                new_text_length: newText.length,
                brand_samples_count: filtered.length,
                analysis_type: "brand_alignment",
              },
            });
          }
        }
      }

      await fetchUsage();
      toast.success("Analysis complete.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze brand alignment.");
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
          <p className="mt-2 text-gray-500">Compare new content against your brand samples to get an alignment score.</p>
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
            <div className="block text-lg font-medium mb-2">Brand Samples</div>
            <p className="text-sm text-gray-500 mb-4">Add 2-5 examples of your on-brand writing (marketing copy, social posts, emails)</p>
            {brandSamples.map((sample, index) => (
              <div key={`sample-${index}`} className="mb-4">
                <div className="flex items-start space-x-2">
                  <div className="flex-1">
                    <textarea
                      value={sample}
                      onChange={(e) => updateSample(index, e.target.value)}
                      placeholder={`Brand sample ${index + 1}...`}
                      className="w-full h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-neutral-50 dark:bg-neutral-800 dark:text-white"
                      maxLength={2000}
                    />
                    <div className="text-xs text-gray-400 mt-1">{sample.length}/2000 characters</div>
                  </div>
                  {brandSamples.length > 1 && (
                    <button onClick={() => removeSample(index)} className="p-2 text-red-500 hover:text-red-700">x</button>
                  )}
                </div>
              </div>
            ))}
            {(() => {
              if (!usageInfo) return null;
              const limit = getBrandSampleLimit(usageInfo.subscription);
              const canAdd = !limit || brandSamples.length < limit;
              return canAdd ? (
                <button onClick={addSample} className="px-4 py-2 text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20">
                  + Add Brand Sample
                </button>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  Free plan limited to {limit} samples.{" "}
                  <Link href="/pricing" className="text-purple-600 underline">Upgrade for unlimited</Link>
                </div>
              );
            })()}
          </div>

          <div>
            <label htmlFor="new-content" className="block text-lg font-medium mb-2">New Content to Check</label>
            <p className="text-sm text-gray-500 mb-4">Enter the new text you want to check for brand alignment</p>
            <textarea
              id="new-content"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Enter your new content here..."
              className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-neutral-50 dark:bg-neutral-800 dark:text-white"
              maxLength={5000}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">{newText.length.toLocaleString()} / 5,000 characters</span>
              <span className="text-sm text-gray-500">{newText.trim().split(/\s+/).filter((w) => w.length > 0).length} words</span>
            </div>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || brandSamples.filter((s) => s.trim()).length === 0 || !newText.trim() || usageInfo?.usage.remaining_today === 0}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
              isAnalyzing || usageInfo?.usage.remaining_today === 0
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl"
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Analyzing Brand Alignment...</span>
              </div>
            ) : "Analyze Brand Alignment"}
          </button>

          {isAnalyzing && streamingFeedback && (
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-2" />
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">Analysis in Progress</h4>
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{streamingFeedback}</ReactMarkdown>
              </div>
            </div>
          )}

          {result && (
            <div className="mt-8 bg-white dark:bg-inherit border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Brand Alignment Analysis</h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${scoreColor(result.brand_analysis.alignment_score)}`}>
                    {result.brand_analysis.alignment_score}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Alignment Score</div>
                    <div className="text-lg font-semibold">out of 100</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{result.input_info.brand_samples_count}</div>
                  <div className="text-sm text-gray-500">Brand Samples</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.input_info.new_text_length.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Characters Analyzed</div>
                </div>
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-3">AI Feedback</h4>
                <div className="bg-gray-50 dark:bg-black text-black dark:text-white p-4 rounded-md prose prose-gray max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{result.brand_analysis.feedback}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function ContentAlignmentMarketingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <main className="mx-auto max-w-4xl px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            {"Free Content Alignment Checker"}
            <span className="text-purple-600 dark:text-purple-400">.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-mono">
            Score how closely your new content matches your brand voice.
          </p>
        </section>

        <section className="mb-16">
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" /></svg>
              <h2 className="text-lg font-semibold">Content Alignment</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Paste your brand samples and the new text you want to check.</p>
            <div className="space-y-4">
              <div>
                <p className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Brand Samples</p>
                <textarea disabled placeholder="Paste examples of your brand's writing style..." className="w-full h-24 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 resize-none cursor-not-allowed" />
              </div>
              <div>
                <p className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">New Content to Check</p>
                <textarea disabled placeholder="Paste the new text you want to check for brand alignment..." className="w-full h-24 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 resize-none cursor-not-allowed" />
              </div>
              <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="w-16 h-16 rounded-full border-4 border-purple-200 dark:border-purple-800 flex items-center justify-center">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">--</span>
                </div>
                <div>
                  <p className="font-semibold">Alignment Score</p>
                  <p className="text-sm text-gray-500">Sign up to see your score</p>
                </div>
              </div>
              <Link href="/sign-up" className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-purple-600 hover:bg-purple-700 text-white transition-colors">
                Sign Up Free to Check Content Alignment
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 font-mono">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Add Brand Samples", desc: "Paste 2-5 examples of on-brand content: marketing copy, social posts, emails, or blog excerpts." },
              { step: "2", title: "Paste New Content", desc: "Add the new text you want to compare. It can be a draft, a deliverable from a writer, or any content to verify." },
              { step: "3", title: "Get Your Score", desc: "Receive a 0-100 alignment score with AI-generated feedback explaining exactly where the content matches or deviates." },
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to check your content alignment?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">Create a free account and start comparing content against your brand voice in seconds. No credit card required.</p>
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
            name: "Content Alignment Checker",
            description: "Free AI-powered content alignment checker. Compare new writing against brand samples and get an alignment score.",
            url: "https://brandalyze.io/content-alignment-checker",
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

export default function ContentAlignmentCheckerPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <SignedIn>
        <ContentAlignmentCheckerTool />
      </SignedIn>
      <SignedOut>
        <ContentAlignmentMarketingPage />
      </SignedOut>
    </Suspense>
  );
}
