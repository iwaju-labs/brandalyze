"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useUser, useAuth, SignedIn, SignedOut } from "@clerk/nextjs";
import {
  analyzeBrandVoice,
  saveBrandVoiceAnalysis,
  authenticatedFetch,
  type BrandVoiceAnalysisResponse,
} from "../../../lib/api";
import toast from "react-hot-toast";
import Link from "next/link";
import { FullPageLoader, LoadingSpinner, InlineLoader } from "@/components/ui/loading-spinner";

// ---- types ----

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

// ---- static content ----

const useCases = [
  { title: "Content Marketers", description: "Ensure every blog post, email, and social caption sounds like your brand before publishing." },
  { title: "Freelance Writers", description: "Quickly learn a new client's brand voice by analyzing their existing content samples." },
  { title: "Social Media Managers", description: "Keep tone consistent across multiple platforms and team members." },
  { title: "Brand Managers", description: "Audit agency deliverables and user-generated content for voice alignment." },
];

const faqs = [
  { question: "What is a brand voice checker?", answer: "A brand voice checker analyzes your writing to identify tone, style, and personality traits. It helps you understand how your content sounds and whether it stays consistent with your brand identity." },
  { question: "How does the brand voice analysis work?", answer: "Paste samples of your brand's writing (marketing copy, social posts, emails). Our AI extracts tone, style, personality traits, and emotional indicators, then gives you a confidence score and actionable recommendations." },
  { question: "Is the brand voice checker free?", answer: "Yes. Free accounts get daily analyses. Sign up takes seconds and no credit card is required. Upgrade to Pro for unlimited analyses and advanced features." },
  { question: "What kind of content can I analyze?", answer: "Any text content works: social media posts, blog articles, email newsletters, ad copy, website copy, press releases, and more." },
  { question: "How is this different from a grammar checker?", answer: "Grammar checkers fix spelling and syntax. A brand voice checker analyzes the personality, tone, and emotional feel of your writing to ensure it matches your brand identity." },
];

const ALL_INDICATORS = [
  "enthusiasm", "professionalism", "approachability", "authority",
  "empathy", "authenticity", "inclusivity", "curiosity",
  "innovation", "clarity", "urgency", "storytelling",
  "humor", "optimism", "sincerity", "boldness",
];

// ---- helpers ----

function getBrandSampleLimit(subscription: UsageInfo["subscription"]) {
  switch (subscription.tier) {
    case "pro":
    case "enterprise":
      return null;
    default:
      return 5;
  }
}

// ---- tool (authenticated) ----

function BrandVoiceCheckerTool() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [brandSamples, setBrandSamples] = useState<string[]>([""]);
  const [voiceAnalysisName, setVoiceAnalysisName] = useState("");
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>(["enthusiasm", "professionalism", "approachability", "authority"]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [useForAudits, setUseForAudits] = useState(false);
  const [result, setResult] = useState<BrandVoiceAnalysisResponse | null>(null);
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
    setIsAnalyzing(true);
    setResult(null);
    try {
      const response = await analyzeBrandVoice(filtered, selectedIndicators, voiceAnalysisName || "Brand Voice Analysis", getToken);
      if (response.success && response.data) {
        setResult(response.data);
        toast.success("Brand voice analysis complete.");
        await fetchUsage();
      } else {
        throw new Error(response.message || "Analysis failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to analyze brand voice.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      const response = await saveBrandVoiceAnalysis(
        {
          name: voiceAnalysisName || "Brand Voice Analysis",
          voice_analysis: result.voice_analysis,
          emotional_indicators: result.emotional_indicators,
          brand_recommendations: result.brand_recommendations,
          confidence_score: result.confidence_score,
          samples_analyzed: result.samples_analyzed,
          total_text_length: result.total_text_length,
          brand_samples: brandSamples.filter((s) => s.trim()),
          use_for_audits: useForAudits,
        },
        getToken
      );
      if (response.success) {
        toast.success("Brand voice analysis saved.");
      } else {
        throw new Error(response.message || "Save failed");
      }
    } catch {
      toast.error("Failed to save brand voice analysis.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {user?.firstName || "User"}!</h1>
          <p className="mt-2 text-gray-500">Analyze your brand samples to extract voice characteristics.</p>
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
          {/* Analysis Name */}
          <div>
            <label htmlFor="voice-analysis-name" className="block text-lg font-medium mb-2">Analysis Name</label>
            <p className="text-sm text-gray-500 mb-4">Give this analysis a name for easy reference</p>
            <input
              id="voice-analysis-name"
              type="text"
              value={voiceAnalysisName}
              onChange={(e) => setVoiceAnalysisName(e.target.value)}
              placeholder="e.g., My Brand Voice, Q1 2026 Campaign..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-neutral-50 dark:bg-neutral-800 dark:text-white"
              maxLength={100}
            />
          </div>

          {/* Brand Samples */}
          <div>
            <div className="block text-lg font-medium mb-2">Brand Samples</div>
            <p className="text-sm text-gray-500 mb-4">Add 2-5 examples of your brand writing (marketing copy, social posts, emails)</p>
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

          {/* Emotional Indicators */}
          <div>
            <div className="block text-lg font-medium mb-2">Emotional Indicators (select up to 4)</div>
            <p className="text-sm text-gray-500 mb-4">Choose which emotional aspects to analyze in your brand voice</p>
            <div className="flex flex-wrap gap-2">
              {ALL_INDICATORS.map((indicator) => (
                <button
                  key={indicator}
                  onClick={() => {
                    if (selectedIndicators.includes(indicator)) {
                      setSelectedIndicators(selectedIndicators.filter((i) => i !== indicator));
                    } else if (selectedIndicators.length < 4) {
                      setSelectedIndicators([...selectedIndicators, indicator]);
                    }
                  }}
                  disabled={!selectedIndicators.includes(indicator) && selectedIndicators.length >= 4}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    selectedIndicators.includes(indicator)
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  } ${!selectedIndicators.includes(indicator) && selectedIndicators.length >= 4 ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {indicator}
                </button>
              ))}
            </div>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || brandSamples.filter((s) => s.trim()).length === 0 || usageInfo?.usage.remaining_today === 0}
            className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
              isAnalyzing || usageInfo?.usage.remaining_today === 0
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl"
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Analyzing Brand Voice...</span>
              </div>
            ) : "Analyze Brand Voice"}
          </button>

          {/* Result */}
          {result && (
            <div className="mt-8 bg-white dark:bg-inherit border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Brand Voice Analysis</h3>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Confidence</div>
                  <div className="text-lg font-semibold text-purple-600">{Math.round(result.confidence_score * 100)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold mb-2">Tone</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">{result.voice_analysis.tone}</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Style</h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">{result.voice_analysis.style}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Personality Traits</h4>
                <div className="flex flex-wrap gap-2">
                  {result.voice_analysis.personality_traits?.map((trait, i) => (
                    <span key={i} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">{trait}</span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Communication Patterns</h4>
                <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                  {result.voice_analysis.communication_patterns?.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Content Themes</h4>
                <div className="flex flex-wrap gap-2">
                  {result.voice_analysis.content_themes?.map((theme, i) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">{theme}</span>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Emotional Indicators</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(result.emotional_indicators || {}).map(([key, value]) => (
                    <div key={key} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-center">
                      <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{key}</div>
                      <div className="text-xl font-bold text-purple-600">{typeof value === "number" ? value.toFixed(1) : value}</div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.min((typeof value === "number" ? value : 0) * 10, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {result.brand_recommendations?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Recommendations</h4>
                  <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                    {result.brand_recommendations.map((rec, i) => <li key={i}>{rec}</li>)}
                  </ul>
                </div>
              )}

              {result.can_save ? (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                  <div className="flex items-center gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useForAudits}
                        onChange={(e) => setUseForAudits(e.target.checked)}
                        className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Use this voice analysis for post audits</span>
                    </label>
                  </div>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                      isSaving ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 text-white"
                    }`}
                  >
                    {isSaving ? <><LoadingSpinner size="sm" /><span>Saving...</span></> : "Save Brand Voice Analysis"}
                  </button>
                </div>
              ) : (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                  <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      <strong>Upgrade to Pro</strong> to save your brand voice analysis and use it for post audits.
                    </p>
                    <Link href="/pricing" className="inline-block mt-2 text-purple-600 hover:text-purple-700 underline text-sm">View pricing plans</Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ---- marketing page (unauthenticated) ----

function BrandVoiceMarketingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <main className="mx-auto max-w-4xl px-4 py-16">
        <section className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-6">
            {"Free Brand Voice Checker"}
            <span className="text-purple-600 dark:text-purple-400">.</span>
          </h1>
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-mono">
            Analyze your writing instantly. Understand your tone, style, and personality traits.
          </p>
        </section>

        <section className="mb-16">
          <div className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-8 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
              <h2 className="text-lg font-semibold">Brand Voice Assessment</h2>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Paste your brand content samples below to analyze your voice characteristics.</p>
            <div className="space-y-4">
              <textarea disabled placeholder="Paste your brand content here (e.g., social posts, marketing copy, emails)..." className="w-full h-32 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-400 resize-none cursor-not-allowed" />
              <div className="flex flex-wrap gap-2">
                {["enthusiasm", "professionalism", "approachability", "authority"].map((indicator) => (
                  <span key={indicator} className="px-3 py-1 rounded-full text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">{indicator}</span>
                ))}
              </div>
              <Link href="/sign-up" className="block w-full py-3 px-6 rounded-lg font-semibold text-center bg-purple-600 hover:bg-purple-700 text-white transition-colors">
                Sign Up Free to Analyze Your Brand Voice
              </Link>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10 font-mono">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Paste Your Content", desc: "Add 2-5 samples of your brand writing: social posts, emails, ad copy, or blog excerpts." },
              { step: "2", title: "AI Analyzes Your Voice", desc: "Our AI identifies tone, style, personality traits, and emotional indicators in your writing." },
              { step: "3", title: "Get Actionable Insights", desc: "Receive a confidence score, brand recommendations, and a detailed voice profile you can save." },
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
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to check your brand voice?</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-lg mx-auto">Create a free account and start analyzing your brand voice in seconds. No credit card required.</p>
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
            name: "Brand Voice Checker",
            description: "Free AI-powered brand voice checker. Analyze your writing for tone, style, and personality traits.",
            url: "https://brandalyze.io/brand-voice-checker",
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

// ---- root export ----

export default function BrandVoiceCheckerPage() {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <SignedIn>
        <BrandVoiceCheckerTool />
      </SignedIn>
      <SignedOut>
        <BrandVoiceMarketingPage />
      </SignedOut>
    </Suspense>
  );
}
