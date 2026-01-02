"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { authenticatedFetch, authenticatedFetchStream, analyzeBrandVoice, saveBrandVoiceAnalysis, type BrandVoiceAnalysisResponse } from "../../../lib/api";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  AlignLeft,
  CheckCircle,
  Edit01,
  Plus,
  Save01,
  Microphone01,
} from "@untitledui/icons";
import { Link } from "react-aria-components";
import UsageDashboard from "@/components/dashboard/usage-dashboard";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { FullPageLoader, LoadingSpinner, InlineLoader } from "@/components/ui/loading-spinner";

// Markdown component definitions
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-3 mt-4 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-2 mt-3 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
      {children}
    </p>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900 dark:text-white">
      {children}
    </strong>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-gray-700 dark:text-gray-300 leading-relaxed">
      {children}
    </li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-purple-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isInline = !className;
    return isInline ? (
      <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-sm font-mono text-gray-800 dark:text-gray-200">
        {children}
      </code>
    ) : (
      <code className="block bg-gray-200 dark:bg-gray-700 p-3 rounded text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
        {children}
      </code>
    );
  },
};

interface BrandAnalysisResult {
  alignment_score: number;
  feedback: string;
  brand_samples_analyzed: number;
  analysis_successful?: boolean;
  error?: string;
}

export interface BrandAnalysisResponse {
  brand_analysis: BrandAnalysisResult;
  input_info: {
    new_text_length: number;
    brand_samples_count: number;
    analysis_type: string;
  };
  usage_info?: {
    analyses_remaining_today: number | null;
    subscription_tier: string;
  };
}

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

export default function BrandAnalysis() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [brandSamples, setBrandSamples] = useState<string[]>([""]);
  const [newTextForComparison, setNewTextForComparison] = useState("");
  const [brandAnalysisResult, setBrandAnalysisResult] =
    useState<BrandAnalysisResponse | null>(null);
  const [streamingFeedback, setStreamingFeedback] = useState<string>("");
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [activeTab, setActiveTab] = useState<"voice" | "alignment">("voice");
  
  // Voice assessment state
  const [voiceAnalysisName, setVoiceAnalysisName] = useState("");
  const [voiceAnalysisResult, setVoiceAnalysisResult] = useState<BrandVoiceAnalysisResponse | null>(null);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [isSavingVoice, setIsSavingVoice] = useState(false);
  const [useForAudits, setUseForAudits] = useState(false);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([
    "enthusiasm", "professionalism", "approachability", "authority"
  ]);

  const fetchUsageInfo = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/user/usage", getToken);
      // Authenticated endpoints wrap response in { success: true, data: {...} }
      setUsageInfo(response.data);
    } catch (error) {
      console.error("Failed to fetch usage info:", error);
      toast.error("Failed to load usage information");
    } finally {
      setIsLoadingUsage(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    } else if (isLoaded && isSignedIn && user) {
      fetchUsageInfo();
    }
  }, [isLoaded, isSignedIn, router, user, fetchUsageInfo]);

  if (!isLoaded) {
    return <FullPageLoader />;
  }

  if (!isSignedIn) {
    return <FullPageLoader text="Redirecting to sign in..." />;
  }
  const handleBrandComparison = async () => {
    if (usageInfo && usageInfo.usage.remaining_today === 0) {
      toast.error(
        "Daily analysis limit reached! Please upgrade or try again tomorrow",
        {
          duration: 600,
          icon: <AlertTriangle />,
          style: {
            background: "#fefe2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          },
        }
      );
    }

    const filteredSamples = brandSamples.filter(
      (sample) => sample.trim().length > 0
    );
    if (filteredSamples.length === 0) {
      toast.error("Please add at least one brand sample", {
        icon: <AlignLeft />,
        style: {
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fed7aa",
        },
      });
      return;
    }
    if (!newTextForComparison.trim()) {
      toast.error("Please enter text to analyze", {
        icon: <Edit01 />,
        style: {
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fed7aa",
        },
      });
      return;
    }
    setIsAnalyzing(true);

    try {
      const response = await authenticatedFetchStream(
        "/analyze/brand-alignment",
        getToken,
        {
          method: "POST",
          body: JSON.stringify({
            text: newTextForComparison,
            brand_samples: filteredSamples,
          }),
        }
      );

      // Check if this is an error response
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[DEBUG] Non-OK response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `Backend error: ${response.status} ${response.statusText}: ${errorText}`
        );
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Initialize with empty result to show progress
      setBrandAnalysisResult(null);
      setStreamingFeedback("");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split by newlines to process complete JSON lines
        const lines = buffer.split("\n");
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            try {
              // Skip empty lines
              if (trimmedLine.length === 0) continue;

              const streamData = JSON.parse(trimmedLine);

              // Check for errors first
              if (streamData.error) {
                console.error("Analysis error from backend:", streamData.error);
                toast.error(`Analysis failed: ${streamData.error}`);
                continue;
              }

              // Update streaming feedback in real-time
              if (streamData.ai_feedback) {
                setStreamingFeedback(streamData.ai_feedback);
              }

              // If this looks like a complete result, set the full result
              if (
                streamData.ai_feedback &&
                streamData.alignment_score !== undefined
              ) {
                setBrandAnalysisResult({
                  brand_analysis: {
                    alignment_score: streamData.alignment_score || 0,
                    feedback: streamData.ai_feedback,
                    brand_samples_analyzed:
                      streamData.brand_samples_analyzed ||
                      brandSamples.filter((s) => s.trim()).length,
                    analysis_successful: true,
                  },
                  input_info: {
                    new_text_length: newTextForComparison.length,
                    brand_samples_count: brandSamples.filter((s) => s.trim())
                      .length,
                    analysis_type: "brand_alignment",
                  },
                });
              }
            } catch (error) {
              // Log the actual content that failed to parse
              if (trimmedLine.length > 0) {
                console.error("[DEBUG] Failed to parse JSON line:", {
                  line: trimmedLine,
                  error: error,
                  lineLength: trimmedLine.length,
                  rawLine: JSON.stringify(line),
                  buffer: JSON.stringify(buffer),
                });
              }
            }
          }
        }
      }

      // Handle any remaining buffer content
      let finalResult = null;
      if (buffer.trim()) {
        try {
          const finalData = JSON.parse(buffer.trim());
          finalResult = {
            brand_analysis: {
              alignment_score: finalData.alignment_score || 0,
              feedback: finalData.ai_feedback || streamingFeedback,
              brand_samples_analyzed:
                finalData.brand_samples_analyzed ||
                brandSamples.filter((s) => s.trim()).length,
              analysis_successful: true,
            },
            input_info: {
              new_text_length: newTextForComparison.length,
              brand_samples_count: brandSamples.filter((s) => s.trim()).length,
              analysis_type: "brand_alignment",
            },
          };
          setBrandAnalysisResult(finalResult);
        } catch (error) {
          console.warn("[DEBUG] Failed to parse final JSON:", buffer, error);
          // If we have streaming feedback but couldn't parse final JSON, create a result anyway
          if (streamingFeedback) {
            finalResult = {
              brand_analysis: {
                alignment_score: 0,
                feedback: streamingFeedback,
                brand_samples_analyzed: brandSamples.filter((s) => s.trim())
                  .length,
                analysis_successful: true,
              },
              input_info: {
                new_text_length: newTextForComparison.length,
                brand_samples_count: brandSamples.filter((s) => s.trim())
                  .length,
                analysis_type: "brand_alignment",
              },
            };
            setBrandAnalysisResult(finalResult);
          }
        }
      }

      await fetchUsageInfo();

      // Show success toast with the final result
      const resultToCheck = finalResult || brandAnalysisResult;
      if (resultToCheck) {
        toast.success(
          `Analysis complete - Alignment: ${resultToCheck.brand_analysis.alignment_score}/100`,
          {
            icon: <CheckCircle />,
          }
        );
      } else if (streamingFeedback) {
        toast.success("Analysis complete", {
          icon: <CheckCircle />,
        });
      }
    } catch (error) {
      console.error("Brand analysis failed:", error);
      if (error instanceof Error && error.message.includes("rate limit")) {
        toast.error(
          "Daily analysis limit reached. Please upgrade your plan or try again tomorrow."
        );
      } else {
        toast.error("Failed to analyze brand alignment");
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addBrandSample = () => {
    if (!usageInfo) return;

    const limit = getBrandSampleLimit(usageInfo.subscription);
    if (limit && brandSamples.length >= limit) {
      toast.error(
        `Free plan limited to ${limit} brand samples. Upgrade for unlimited samples`,
        {
          duration: 6000,
          icon: <AlertTriangle />,
          style: {
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          },
        }
      );
      return;
    }

    setBrandSamples([...brandSamples, ""]);
  };

  const updateBrandSample = (index: number, value: string) => {
    const updated = [...brandSamples];
    updated[index] = value;
    setBrandSamples(updated);
  };

  const removeBrandSample = (index: number) => {
    setBrandSamples(brandSamples.filter((_, i) => i !== index));
  };

  const getBrandSampleLimit = (subscription: UsageInfo["subscription"]) => {
    switch (subscription.tier) {
      case "free":
        return 5;
      case "pro":
      case "enterprise":
        return null;
      default:
        return 5;
    }
  };

  const handleVoiceAnalysis = async () => {
    if (usageInfo?.usage.remaining_today === 0) {
      toast.error(
        "Daily analysis limit reached! Please upgrade or try again tomorrow",
        {
          duration: 6000,
          icon: <AlertTriangle />,
          style: {
            background: "#fef2f2",
            color: "#b91c1c",
            border: "1px solid #fecaca",
          },
        }
      );
      return;
    }

    const filteredSamples = brandSamples.filter(
      (sample) => sample.trim().length > 0
    );
    if (filteredSamples.length === 0) {
      toast.error("Please add at least one brand sample", {
        icon: <AlignLeft />,
        style: {
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fed7aa",
        },
      });
      return;
    }

    setIsAnalyzingVoice(true);
    setVoiceAnalysisResult(null);

    try {
      const response = await analyzeBrandVoice(
        filteredSamples,
        selectedIndicators,
        voiceAnalysisName || "Brand Voice Analysis",
        getToken
      );

      if (response.success && response.data) {
        setVoiceAnalysisResult(response.data);
        toast.success("Brand voice analysis completed!", {
          icon: <CheckCircle />,
        });
        await fetchUsageInfo();
      } else {
        throw new Error(response.message || "Analysis failed");
      }
    } catch (error) {
      console.error("Voice analysis failed:", error);
      if (error instanceof Error && error.message.includes("limit")) {
        toast.error(
          "Daily analysis limit reached. Please upgrade or try again tomorrow."
        );
      } else {
        toast.error("Failed to analyze brand voice");
      }
    } finally {
      setIsAnalyzingVoice(false);
    }
  };

  const handleSaveVoiceAnalysis = async () => {
    if (!voiceAnalysisResult) return;

    setIsSavingVoice(true);

    try {
      const response = await saveBrandVoiceAnalysis(
        {
          name: voiceAnalysisName || "Brand Voice Analysis",
          voice_analysis: voiceAnalysisResult.voice_analysis,
          emotional_indicators: voiceAnalysisResult.emotional_indicators,
          brand_recommendations: voiceAnalysisResult.brand_recommendations,
          confidence_score: voiceAnalysisResult.confidence_score,
          samples_analyzed: voiceAnalysisResult.samples_analyzed,
          total_text_length: voiceAnalysisResult.total_text_length,
          brand_samples: brandSamples.filter((s) => s.trim()),
          use_for_audits: useForAudits,
        },
        getToken
      );

      if (response.success) {
        toast.success("Brand voice analysis saved successfully!", {
          icon: <CheckCircle />,
        });
      } else {
        throw new Error(response.message || "Save failed");
      }
    } catch (error) {
      console.error("Failed to save voice analysis:", error);
      toast.error("Failed to save brand voice analysis");
    } finally {
      setIsSavingVoice(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {" "}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.firstName || "User"}!
          </h1>
          <p className="mt-2 text-gray-500">
            Analyze how well your content aligns with your brand voice.
          </p>

          {/** Usage Dashboard */}
          {isLoadingUsage ? (
            <InlineLoader text="Loading usage information..." size="sm" />
          ) : (
            usageInfo?.usage.remaining_today === 0 && <UsageDashboard />
          )}
        </div>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Brand Voice Analysis
            </h2>
            <p className="text-gray-500 mb-6">
              Analyze your brand samples to extract voice characteristics, or check content alignment.
            </p>
          </div>
          {/* Tab Navigation */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab("voice")}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "voice"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <Microphone01 className="w-4 h-4" />
                Brand Voice Assessment
              </button>
              <button
                onClick={() => setActiveTab("alignment")}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === "alignment"
                    ? "border-purple-500 text-purple-600 dark:text-purple-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                <AlignLeft className="w-4 h-4" />
                Content Alignment
              </button>
            </nav>
          </div>

          {/* Brand Samples Section - Shared between tabs */}
          <div>
            <div className="block text-lg font-medium text-foreground mb-2">
              Brand Samples
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Add 2-5 examples of your brand&apos;s writing style (marketing
              copy, social posts, etc.)
            </p>
            {brandSamples.map((sample, index) => (
              <div key={`sample-${index}`} className="mb-4">
                <div className="flex items-start space-x-2">
                  <div className="flex-1">
                    <textarea
                      value={sample}
                      onChange={(e) =>
                        updateBrandSample(index, e.target.value)
                      }
                      placeholder={`Brand sample ${index + 1}...`}
                      className="w-full h-24 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-neutral-50 dark:bg-neutral-500"
                      maxLength={2000}
                    />
                    <div className="text-xs text-gray-400 mt-1">
                      {sample.length}/2000 characters
                    </div>
                  </div>
                  {brandSamples.length > 1 && (
                    <button
                      onClick={() => removeBrandSample(index)}
                      className="p-2 text-red-500 hover:text-red-700"
                    >
                      x
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(() => {
              if (!usageInfo) return null;

              const limit = getBrandSampleLimit(usageInfo.subscription);
              const canAddMore = !limit || brandSamples.length < limit;

              return canAddMore ? (
                <button
                  onClick={addBrandSample}
                  className="flex flex-row px-4 py-2 text-purple-600 border border-purple-600 rounded-md hover:bg-purple-50 dark:hover:bg-purple-900/20"
                >
                  <Plus /> Add Brand Sample
                </button>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-md border">
                  <AlertTriangle className="inline w-4 h-4 mr-2 text-yellow-500" />
                  Free plan limited to {limit} samples.
                  <Link
                    href="/pricing"
                    className="text-purple-600 hover:text-purple-700 ml-1 underline"
                  >
                    Upgrade for unlimited samples
                  </Link>
                </div>
              );
            })()}
          </div>

          {/* Voice Assessment Tab Content */}
          {activeTab === "voice" && (
            <div className="space-y-6">
              {/* Voice Analysis Name */}
              <div>
                <label
                  htmlFor="voice-analysis-name"
                  className="block text-lg font-medium text-foreground mb-2"
                >
                  Analysis Name
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Give this brand voice analysis a name for easy reference
                </p>
                <input
                  id="voice-analysis-name"
                  type="text"
                  value={voiceAnalysisName}
                  onChange={(e) => setVoiceAnalysisName(e.target.value)}
                  placeholder="e.g., My Brand Voice, Q1 2026 Campaign..."
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-neutral-50 dark:bg-neutral-500 dark:text-white"
                  maxLength={100}
                />
              </div>

              {/* Emotional Indicators Selection */}
              <div>
                <label className="block text-lg font-medium text-foreground mb-2">
                  Emotional Indicators (select up to 4)
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Choose which emotional aspects to analyze in your brand voice
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "enthusiasm", "professionalism", "approachability", "authority",
                    "empathy", "authenticity", "inclusivity", "curiosity",
                    "innovation", "clarity", "urgency", "storytelling",
                    "humor", "optimism", "sincerity", "boldness"
                  ].map((indicator) => (
                    <button
                      key={indicator}
                      onClick={() => {
                        if (selectedIndicators.includes(indicator)) {
                          setSelectedIndicators(selectedIndicators.filter(i => i !== indicator));
                        } else if (selectedIndicators.length < 4) {
                          setSelectedIndicators([...selectedIndicators, indicator]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedIndicators.includes(indicator)
                          ? "bg-purple-600 text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                      } ${
                        !selectedIndicators.includes(indicator) && selectedIndicators.length >= 4
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      disabled={!selectedIndicators.includes(indicator) && selectedIndicators.length >= 4}
                    >
                      {indicator}
                    </button>
                  ))}
                </div>
              </div>

              {/* Analyze Voice Button */}
              <button
                onClick={handleVoiceAnalysis}
                disabled={
                  isAnalyzingVoice ||
                  brandSamples.filter((s) => s.trim()).length === 0 ||
                  usageInfo?.usage.remaining_today === 0
                }
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  isAnalyzingVoice || usageInfo?.usage.remaining_today === 0
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl"
                }`}
              >
                {isAnalyzingVoice ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Analyzing Brand Voice...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Microphone01 className="w-5 h-5" />
                    Analyze Brand Voice
                  </div>
                )}
              </button>

              {/* Voice Analysis Result */}
              {voiceAnalysisResult && (
                <div className="mt-8 bg-white dark:bg-inherit border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Brand Voice Analysis
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Confidence</div>
                        <div className="text-lg font-semibold text-purple-600">
                          {Math.round(voiceAnalysisResult.confidence_score * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Voice Characteristics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Tone</h4>
                      <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        {voiceAnalysisResult.voice_analysis.tone}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Style</h4>
                      <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
                        {voiceAnalysisResult.voice_analysis.style}
                      </p>
                    </div>
                  </div>

                  {/* Personality Traits */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Personality Traits</h4>
                    <div className="flex flex-wrap gap-2">
                      {voiceAnalysisResult.voice_analysis.personality_traits?.map((trait, i) => (
                        <span key={i} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Communication Patterns */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Communication Patterns</h4>
                    <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                      {voiceAnalysisResult.voice_analysis.communication_patterns?.map((pattern, i) => (
                        <li key={i}>{pattern}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Content Themes */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Content Themes</h4>
                    <div className="flex flex-wrap gap-2">
                      {voiceAnalysisResult.voice_analysis.content_themes?.map((theme, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Emotional Indicators */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Emotional Indicators</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(voiceAnalysisResult.emotional_indicators || {}).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md text-center">
                          <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{key}</div>
                          <div className="text-xl font-bold text-purple-600">{typeof value === 'number' ? value.toFixed(1) : value}</div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                            <div
                              className="bg-purple-600 h-2 rounded-full"
                              style={{ width: `${Math.min((typeof value === 'number' ? value : 0) * 10, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Brand Recommendations */}
                  {voiceAnalysisResult.brand_recommendations?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Recommendations</h4>
                      <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                        {voiceAnalysisResult.brand_recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Save Button for Pro+ */}
                  {voiceAnalysisResult.can_save && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <div className="flex items-center gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={useForAudits}
                            onChange={(e) => setUseForAudits(e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            Use this voice analysis for post audits
                          </span>
                        </label>
                      </div>
                      <button
                        onClick={handleSaveVoiceAnalysis}
                        disabled={isSavingVoice}
                        className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                          isSavingVoice
                            ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl"
                        }`}
                      >
                        {isSavingVoice ? (
                          <>
                            <LoadingSpinner size="sm" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save01 className="w-5 h-5" />
                            Save Brand Voice Analysis
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Upgrade prompt for free users */}
                  {!voiceAnalysisResult.can_save && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <p className="text-sm text-purple-800 dark:text-purple-200">
                          <strong>Upgrade to Pro</strong> to save your brand voice analysis and use it for post audits.
                        </p>
                        <Link
                          href="/pricing"
                          className="inline-block mt-2 text-purple-600 hover:text-purple-700 underline text-sm"
                        >
                          View pricing plans
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Alignment Tab Content */}
          {activeTab === "alignment" && (
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="new-content-textarea"
                  className="block text-lg font-medium text-foreground mb-2"
                >
                  New Content to Analyze
                </label>
                <p className="text-sm text-gray-500 mb-4">
                  Enter the new content you want to check for brand alignment
                </p>

                <textarea
                  id="new-content-textarea"
                  value={newTextForComparison}
                  onChange={(e) => setNewTextForComparison(e.target.value)}
                  placeholder="Enter your new content here..."
                  className="w-full h-32 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-neutral-50 dark:bg-neutral-500 dark:text-white"
                  maxLength={5000}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-500">
                    {newTextForComparison.length.toLocaleString()} / 5,000
                    characters
                  </span>
                  <span className="text-sm text-gray-500">
                    {
                      newTextForComparison
                        .trim()
                        .split(/\s+/)
                        .filter((word) => word.length > 0).length
                    }{" "}
                    words
                  </span>
                </div>
              </div>
              <button
                onClick={handleBrandComparison}
                disabled={
                  isAnalyzing ||
                  brandSamples.filter((s) => s.trim()).length === 0 ||
                  !newTextForComparison.trim() ||
                  usageInfo?.usage.remaining_today === 0
                }
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 ${
                  isAnalyzing || usageInfo?.usage.remaining_today === 0
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl"
                }`}
              >
                {isAnalyzing ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Analyzing Brand Alignment...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <AlignLeft className="w-5 h-5" />
                    Analyze Brand Alignment
                  </div>
                )}
              </button>
              {/* Streaming feedback display */}
              {isAnalyzing && streamingFeedback && (
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">
                      Analysis in Progress
                    </h4>
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {streamingFeedback}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
              {brandAnalysisResult && (
                <div className="mt-8 bg-white dark:bg-inherit border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      Brand Alignment Analysis
                    </h3>
                    <div className="flex items-center space-x-2">
                      {(() => {
                        const score =
                          brandAnalysisResult.brand_analysis.alignment_score;
                        let scoreColorClasses = "";
                        if (score >= 70) {
                          scoreColorClasses = "bg-green-100 text-green-800";
                        } else if (score >= 50) {
                          scoreColorClasses = "bg-yellow-100 text-yellow-800";
                        } else {
                          scoreColorClasses = "bg-red-100 text-red-800";
                        }
                        return (
                          <div
                            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${scoreColorClasses}`}
                          >
                            {score}
                          </div>
                        );
                      })()}
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-300">
                          Alignment Score
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-gray-300">
                          out of 100
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {brandAnalysisResult.input_info.brand_samples_count}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        Brand Samples
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {brandAnalysisResult.input_info.new_text_length.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-300">
                        Characters Analyzed
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-300 mb-3">
                      AI Feedback
                    </h4>
                    <div className="bg-gray-50 dark:bg-black text-black dark:text-white p-4 rounded-md prose prose-gray max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {brandAnalysisResult.brand_analysis.feedback}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
