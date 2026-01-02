"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { authenticatedFetch, listBrandVoiceAnalyses, deleteBrandVoiceAnalysis, type BrandVoiceAnalysisListItem } from "../../../lib/api";
import toast from "react-hot-toast";
import { ProGateModal } from "@/components/pro-gate-modal";
import {
  BarChart02,
  TrendUp01,
  TrendDown01,
  Target04,
  Calendar,
  ChevronDown,
  Microphone01,
  Trash01,
} from "@untitledui/icons";

interface AnalyticsData {
  period: {
    days: number;
    start_date: string;
    end_date: string;
  };
  overall: {
    total_audits: number;
    avg_score: number;
    min_score: number;
    max_score: number;
  };
  trend: {
    direction: "up" | "down" | "stable";
    change: number;
    recent_avg: number;
    previous_avg: number;
  };
  score_trend: Array<{
    date: string;
    avg_score: number;
    count: number;
  }>;
  platform_stats: Array<{
    platform: string;
    count: number;
    avg_score: number;
  }>;
  score_distribution: Record<string, number>;
  brand_stats: Array<{
    brand_id: number;
    brand_name: string;
    count: number;
    avg_score: number;
  }>;
}

export default function AnalyticsPage() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [brandVoiceAnalyses, setBrandVoiceAnalyses] = useState<BrandVoiceAnalysisListItem[]>([]);
  const [isLoadingVoiceAnalyses, setIsLoadingVoiceAnalyses] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/user/usage", getToken);
      setSubscriptionTier(response.data?.subscription?.tier || "free");
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      setSubscriptionTier("free");
    }
  }, [getToken]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch(
        `/audits/analytics?days=${days}`,
        getToken
      );
      setAnalytics(response);
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, days]);

  const fetchBrandVoiceAnalyses = useCallback(async () => {
    try {
      setIsLoadingVoiceAnalyses(true);
      const response = await listBrandVoiceAnalyses(getToken);
      if (response.success && response.data) {
        setBrandVoiceAnalyses(response.data.analyses);
      }
    } catch (error) {
      console.error("Failed to fetch brand voice analyses:", error);
    } finally {
      setIsLoadingVoiceAnalyses(false);
    }
  }, [getToken]);

  const handleDeleteVoiceAnalysis = async (analysisId: number) => {
    if (!confirm("Are you sure you want to delete this brand voice analysis?")) {
      return;
    }
    
    setDeletingId(analysisId);
    try {
      const response = await deleteBrandVoiceAnalysis(analysisId, getToken);
      if (response.success) {
        setBrandVoiceAnalyses(brandVoiceAnalyses.filter(a => a.id !== analysisId));
        toast.success("Brand voice analysis deleted");
      }
    } catch (error) {
      console.error("Failed to delete voice analysis:", error);
      toast.error("Failed to delete brand voice analysis");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    fetchSubscription();
    fetchAnalytics();
    fetchBrandVoiceAnalyses();
  }, [isSignedIn, router, fetchAnalytics, fetchSubscription, fetchBrandVoiceAnalyses]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case "twitter":
        return "X / Twitter";
      case "linkedin":
        return "LinkedIn";
      default:
        return platform.charAt(0).toUpperCase() + platform.slice(1);
    }
  };

  if (!isSignedIn) {
    return null;
  }

  if (isLoading || subscriptionTier === null) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (subscriptionTier === "free") {
    return (
      <div className="min-h-screen bg-white dark:bg-black">
        <ProGateModal featureName="Analytics Dashboard" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Track your brand voice performance over time
            </p>
          </div>

          {/* Period Selector */}
          <div className="mt-4 md:mt-0 relative">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="appearance-none px-4 py-2 pr-10 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {!analytics || analytics.overall.total_audits === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <BarChart02 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No audit data yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Start auditing posts using the browser extension to see analytics
            </p>
          </div>
        ) : (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total Audits */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Total Audits
                  </span>
                  <Calendar className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {analytics.overall.total_audits}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  in the last {days} days
                </div>
              </div>

              {/* Average Score */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Average Score
                  </span>
                  <Target04 className="w-5 h-5 text-gray-400" />
                </div>
                <div
                  className={`text-3xl font-bold ${getScoreColor(
                    analytics.overall.avg_score
                  )}`}
                >
                  {analytics.overall.avg_score}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Range: {analytics.overall.min_score} - {analytics.overall.max_score}
                </div>
              </div>

              {/* Trend */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    7-Day Trend
                  </span>
                  {analytics.trend.direction === "up" ? (
                    <TrendUp01 className="w-5 h-5 text-green-500" />
                  ) : analytics.trend.direction === "down" ? (
                    <TrendDown01 className="w-5 h-5 text-red-500" />
                  ) : (
                    <BarChart02 className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div
                  className={`text-3xl font-bold ${
                    analytics.trend.direction === "up"
                      ? "text-green-600 dark:text-green-400"
                      : analytics.trend.direction === "down"
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {analytics.trend.change >= 0 ? "+" : ""}
                  {analytics.trend.change}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  vs previous 7 days
                </div>
              </div>

              {/* Recent Average */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Recent Avg (7d)
                  </span>
                  <BarChart02 className="w-5 h-5 text-gray-400" />
                </div>
                <div
                  className={`text-3xl font-bold ${getScoreColor(
                    analytics.trend.recent_avg
                  )}`}
                >
                  {analytics.trend.recent_avg}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Previous: {analytics.trend.previous_avg}
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Score Trend Chart */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Score Trend
                </h3>
                {analytics.score_trend.length > 0 ? (
                  <div className="h-64 relative">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-xs text-gray-500">
                      <span>100</span>
                      <span>75</span>
                      <span>50</span>
                      <span>25</span>
                      <span>0</span>
                    </div>
                    {/* Chart area */}
                    <div className="ml-10 h-56 flex items-end gap-1">
                      {analytics.score_trend.map((point, idx) => (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center group"
                        >
                          <div className="relative w-full">
                            <div
                              className="w-full bg-purple-500 dark:bg-purple-400 rounded-t transition-all hover:bg-purple-600 dark:hover:bg-purple-300"
                              style={{
                                height: `${(point.avg_score / 100) * 200}px`,
                              }}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {point.avg_score} ({point.count} audits)
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* X-axis */}
                    <div className="ml-10 flex justify-between text-xs text-gray-500 mt-2">
                      <span>
                        {analytics.score_trend[0]?.date
                          ? new Date(analytics.score_trend[0].date).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )
                          : ""}
                      </span>
                      <span>
                        {analytics.score_trend[analytics.score_trend.length - 1]?.date
                          ? new Date(
                              analytics.score_trend[analytics.score_trend.length - 1].date
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-gray-500">
                    Not enough data for trend chart
                  </div>
                )}
              </div>

              {/* Score Distribution */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Score Distribution
                </h3>
                <div className="space-y-4">
                  {Object.entries(analytics.score_distribution).map(
                    ([range, count]) => {
                      const total = analytics.overall.total_audits;
                      const percentage = total > 0 ? (count / total) * 100 : 0;
                      const colors: Record<string, string> = {
                        "0-20": "bg-red-500",
                        "20-40": "bg-orange-500",
                        "40-60": "bg-yellow-500",
                        "60-80": "bg-lime-500",
                        "80-100": "bg-green-500",
                      };
                      return (
                        <div key={range}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 dark:text-gray-300">
                              {range}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {count} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors[range]} transition-all`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            {/* Platform & Brand Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Platform Stats */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Platform Performance
                </h3>
                {analytics.platform_stats.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.platform_stats.map((platform) => (
                      <div
                        key={platform.platform}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {getPlatformLabel(platform.platform)}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {platform.count} audits
                          </div>
                        </div>
                        <div
                          className={`text-2xl font-bold ${getScoreColor(
                            platform.avg_score
                          )}`}
                        >
                          {platform.avg_score}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No platform data available
                  </div>
                )}
              </div>

              {/* Brand Stats */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Brand Performance
                </h3>
                {analytics.brand_stats.length > 0 ? (
                  <div className="space-y-4">
                    {analytics.brand_stats.map((brand) => (
                      <div
                        key={brand.brand_id}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {brand.brand_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {brand.count} audits
                          </div>
                        </div>
                        <div
                          className={`text-2xl font-bold ${getScoreColor(
                            brand.avg_score
                          )}`}
                        >
                          {brand.avg_score}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    No brand data available
                  </div>
                )}
              </div>
            </div>

            {/* Brand Voice Analyses Section */}
            <div className="mt-8">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Microphone01 className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Saved Brand Voice Analyses
                  </h3>
                </div>
                {isLoadingVoiceAnalyses ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : brandVoiceAnalyses.length > 0 ? (
                  <div className="space-y-4">
                    {brandVoiceAnalyses.map((analysis) => (
                      <div
                        key={analysis.id}
                        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {analysis.name}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Created {new Date(analysis.created_at).toLocaleDateString()}
                              {analysis.use_for_audits && (
                                <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">
                                  Used for audits
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Confidence</div>
                              <div className="font-semibold text-purple-600">
                                {Math.round(analysis.confidence_score * 100)}%
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteVoiceAnalysis(analysis.id)}
                              disabled={deletingId === analysis.id}
                              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                              title="Delete analysis"
                            >
                              {deletingId === analysis.id ? (
                                <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <Trash01 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                            <div className="text-xs text-gray-500">Tone</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {analysis.voice_analysis?.tone || "N/A"}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                            <div className="text-xs text-gray-500">Style</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {analysis.voice_analysis?.style || "N/A"}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                            <div className="text-xs text-gray-500">Samples</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {analysis.samples_analyzed}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900 p-2 rounded">
                            <div className="text-xs text-gray-500">Characters</div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {analysis.total_text_length.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        {/* Emotional Indicators */}
                        {analysis.emotional_indicators && Object.keys(analysis.emotional_indicators).length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(analysis.emotional_indicators).map(([key, value]) => (
                              <span
                                key={key}
                                className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded text-xs"
                              >
                                {key}: {typeof value === 'number' ? value.toFixed(1) : value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Microphone01 className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No saved brand voice analyses yet
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      Create one from the Analyze page
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
