"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "../../../lib/api";
import { trackPageVisit } from "@/lib/onboarding-api";
import toast from "react-hot-toast";
import { ProGateModal } from "@/components/pro-gate-modal";
import {
  SearchMd,
  FilterLines,
  Download01,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  XClose,
  File02,
  Trash01,
  User01,
} from "@untitledui/icons";

interface AuditMetrics {
  tone_match: number;
  vocabulary_consistency: number;
  emotional_alignment: number;
  style_deviation: number;
  deviations: Array<{
    phrase: string;
    reason: string;
    severity: string;
  }>;
  x_optimization: {
    score: number;
    tips: Array<{
      type: string;
      message: string;
      impact: string;
    }>;
  } | null;
  ai_feedback: string | null;
}

interface Audit {
  id: number;
  brand: number;
  brand_name: string;
  content: string;
  platform: string;
  platform_display: string;
  score: number;
  created_at: string;
  context: Record<string, unknown>;
  metrics: AuditMetrics;
}

interface ProfileAnalysis {
  id: number;
  handle: string;
  platform: string;
  platform_display: string;
  confidence_score: number;
  voice_analysis: {
    tone?: string;
    style?: string;
    content_themes?: string[];
    communication_patterns?: string[];
  };
  emotional_indicators: Record<string, number>;
  brand_recommendations: string[];
  post_analyzed: number;
  bio_used: boolean;
  created_at: string;
}

interface Filters {
  platform: string;
  minScore: string;
  search: string;
}

type TabType = "audits" | "analyses";

export default function HistoryPage() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabType>("audits");
  const [audits, setAudits] = useState<Audit[]>([]);
  const [analyses, setAnalyses] = useState<ProfileAnalysis[]>([]);
  const [filteredAudits, setFilteredAudits] = useState<Audit[]>([]);
  const [filteredAnalyses, setFilteredAnalyses] = useState<ProfileAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>({
    platform: "all",
    minScore: "",
    search: "",
  });

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/user/usage", getToken);
      setSubscriptionTier(response.data?.subscription?.tier || "free");
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      setSubscriptionTier("free");
    }
  }, [getToken]);

  const fetchAudits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.platform !== "all") {
        params.append("platform", filters.platform);
      }
      if (filters.minScore) {
        params.append("min_score", filters.minScore);
      }
      params.append("limit", "100");

      const queryString = params.toString();
      const url = `/audits/history${queryString ? `?${queryString}` : ""}`;

      const response = await authenticatedFetch(url, getToken);
      setAudits(response.audits || []);
    } catch (error) {
      console.error("Failed to fetch audits:", error);
      toast.error("Failed to load audit history");
    }
  }, [getToken, filters.platform, filters.minScore]);

  const fetchAnalyses = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.platform !== "all") {
        params.append("platform", filters.platform);
      }
      params.append("limit", "100");

      const queryString = params.toString();
      const url = `/extension/analysis/history/${queryString ? `?${queryString}` : ""}`;

      const response = await authenticatedFetch(url, getToken);
      setAnalyses(response.analyses || []);
    } catch (error) {
      console.error("Failed to fetch analyses:", error);
      toast.error("Failed to load profile analyses");
    }
  }, [getToken, filters.platform]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchAudits(), fetchAnalyses()]);
    setIsLoading(false);
  }, [fetchAudits, fetchAnalyses]);

  useEffect(() => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    fetchSubscription();
    fetchData();
    
    // Track page visit for onboarding mission
    trackPageVisit("audit_history", getToken).catch(() => {
      // Silently ignore tracking errors
    });
  }, [isSignedIn, router, fetchData, fetchSubscription, getToken]);

  // Client-side search filtering for audits
  useEffect(() => {
    if (!filters.search.trim()) {
      setFilteredAudits(audits);
    } else {
      const searchLower = filters.search.toLowerCase();
      setFilteredAudits(
        audits.filter(
          (audit) =>
            audit.content.toLowerCase().includes(searchLower) ||
            audit.brand_name.toLowerCase().includes(searchLower)
        )
      );
    }
  }, [audits, filters.search]);

  // Client-side search filtering for analyses
  useEffect(() => {
    if (!filters.search.trim()) {
      setFilteredAnalyses(analyses);
    } else {
      const searchLower = filters.search.toLowerCase();
      setFilteredAnalyses(
        analyses.filter((analysis) =>
          analysis.handle.toLowerCase().includes(searchLower)
        )
      );
    }
  }, [analyses, filters.search]);

  const deleteAudit = async (auditId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(auditId);
    try {
      await authenticatedFetch(`/audits/${auditId}/delete/`, getToken, {
        method: "DELETE",
      });
      setAudits((prev) => prev.filter((a) => a.id !== auditId));
      toast.success("Audit deleted");
    } catch (error) {
      console.error("Failed to delete audit:", error);
      toast.error("Failed to delete audit");
    } finally {
      setDeletingId(null);
    }
  };

  const deleteAnalysis = async (analysisId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(analysisId);
    try {
      await authenticatedFetch(`/extension/analysis/${analysisId}/delete/`, getToken, {
        method: "DELETE",
      });
      setAnalyses((prev) => prev.filter((a) => a.id !== analysisId));
      toast.success("Analysis deleted");
    } catch (error) {
      console.error("Failed to delete analysis:", error);
      toast.error("Failed to delete analysis");
    } finally {
      setDeletingId(null);
    }
  };

  const clearAllAudits = async () => {
    try {
      await authenticatedFetch("/audits/clear-all/", getToken, {
        method: "DELETE",
      });
      setAudits([]);
      setShowClearConfirm(false);
      toast.success("All audits cleared");
    } catch (error) {
      console.error("Failed to clear audits:", error);
      toast.error("Failed to clear audits");
    }
  };

  const clearAllAnalyses = async () => {
    try {
      await authenticatedFetch("/extension/analysis/clear-all/", getToken, {
        method: "DELETE",
      });
      setAnalyses([]);
      setShowClearConfirm(false);
      toast.success("All analyses cleared");
    } catch (error) {
      console.error("Failed to clear analyses:", error);
      toast.error("Failed to clear analyses");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "twitter":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case "linkedin":
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        );
      default:
        return <File02 className="w-4 h-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const exportToCSV = () => {
    if (activeTab === "audits") {
      if (filteredAudits.length === 0) {
        toast.error("No audits to export");
        return;
      }

      const headers = [
        "Date",
        "Platform",
        "Brand",
        "Score",
        "Tone Match",
        "Vocabulary",
        "Emotional",
        "Style Deviation",
        "Content",
      ];

      const rows = filteredAudits.map((audit) => [
        new Date(audit.created_at).toISOString(),
        audit.platform,
        audit.brand_name,
        audit.score.toFixed(1),
        audit.metrics?.tone_match?.toFixed(1) || "",
        audit.metrics?.vocabulary_consistency?.toFixed(1) || "",
        audit.metrics?.emotional_alignment?.toFixed(1) || "",
        audit.metrics?.style_deviation?.toFixed(1) || "",
        `"${audit.content.replace(/"/g, '""')}"`,
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brandalyze-audits-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      if (filteredAnalyses.length === 0) {
        toast.error("No analyses to export");
        return;
      }

      const headers = [
        "Date",
        "Platform",
        "Handle",
        "Confidence",
        "Tone",
        "Style",
        "Bio Used",
      ];

      const rows = filteredAnalyses.map((analysis) => [
        new Date(analysis.created_at).toISOString(),
        analysis.platform,
        analysis.handle,
        (analysis.confidence_score * 100).toFixed(1),
        analysis.voice_analysis?.tone || "",
        analysis.voice_analysis?.style || "",
        analysis.bio_used ? "Yes" : "No",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `brandalyze-analyses-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast.success("Exported successfully");
  };

  const exportToJSON = () => {
    const data = activeTab === "audits" ? filteredAudits : filteredAnalyses;
    if (data.length === 0) {
      toast.error(`No ${activeTab} to export`);
      return;
    }

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brandalyze-${activeTab}-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Exported successfully");
  };

  const clearFilters = () => {
    setFilters({
      platform: "all",
      minScore: "",
      search: "",
    });
  };

  const hasActiveFilters =
    filters.platform !== "all" || filters.minScore !== "" || filters.search !== "";

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
        <ProGateModal featureName="History" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            History
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            View your past post audits and profile analyses
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab("audits")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "audits"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <File02 className="w-4 h-4" />
              Post Audits
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">
                {audits.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("analyses")}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "analyses"
                ? "border-purple-600 text-purple-600 dark:text-purple-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            <div className="flex items-center gap-2">
              <User01 className="w-4 h-4" />
              Profile Analyses
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs">
                {analyses.length}
              </span>
            </div>
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <SearchMd className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={
                  activeTab === "audits"
                    ? "Search by content or brand..."
                    : "Search by handle..."
                }
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-lg border transition-colors ${
                hasActiveFilters
                  ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
              }`}
            >
              <FilterLines className="w-5 h-5 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 px-1.5 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                  {[
                    filters.platform !== "all",
                    filters.minScore !== "",
                    filters.search !== "",
                  ].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Export Dropdown */}
            <div className="relative group">
              <button className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Download01 className="w-5 h-5 mr-2" />
                Export
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>
              <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={exportToCSV}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                >
                  Export CSV
                </button>
                <button
                  onClick={exportToJSON}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                >
                  Export JSON
                </button>
              </div>
            </div>

            {/* Clear All Button */}
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash01 className="w-5 h-5 mr-2" />
              Clear All
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-4 items-end">
                {/* Platform Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Platform
                  </label>
                  <select
                    value={filters.platform}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, platform: e.target.value }))
                    }
                    className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Platforms</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    {activeTab === "audits" && <option value="other">Other</option>}
                  </select>
                </div>

                {/* Min Score Filter (audits only) */}
                {activeTab === "audits" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Minimum Score
                    </label>
                    <select
                      value={filters.minScore}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, minScore: e.target.value }))
                      }
                      className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Any Score</option>
                      <option value="80">80+</option>
                      <option value="60">60+</option>
                      <option value="40">40+</option>
                    </select>
                  </div>
                )}

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <XClose className="w-4 h-4 mr-1" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {activeTab === "audits"
              ? `${filteredAudits.length} audit${filteredAudits.length !== 1 ? "s" : ""} found`
              : `${filteredAnalyses.length} analys${filteredAnalyses.length !== 1 ? "es" : "is"} found`}
          </p>
        </div>

        {/* Audits List */}
        {activeTab === "audits" && (
          <>
            {filteredAudits.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <File02 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No audits found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {hasActiveFilters
                    ? "Try adjusting your filters or search query"
                    : "Start auditing posts using the browser extension"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAudits.map((audit) => (
                  <div
                    key={audit.id}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Audit Header */}
                    <div
                      onClick={() =>
                        setExpandedItem(expandedItem === audit.id ? null : audit.id)
                      }
                      className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          {/* Meta Info */}
                          <div className="flex items-center gap-3 mb-2">
                            <span className="flex items-center text-gray-600 dark:text-gray-400">
                              {getPlatformIcon(audit.platform)}
                              <span className="ml-1 text-sm">{audit.platform_display}</span>
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">|</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {audit.brand_name}
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">|</span>
                            <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              {formatDate(audit.created_at)}
                            </span>
                          </div>

                          {/* Content Preview */}
                          <p className="text-gray-900 dark:text-white line-clamp-2">
                            {audit.content}
                          </p>
                        </div>

                        {/* Score & Actions */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-3 py-1.5 rounded-lg font-bold text-lg ${getScoreBg(
                              audit.score
                            )} ${getScoreColor(audit.score)}`}
                          >
                            {Math.round(audit.score)}
                          </div>
                          <button
                            onClick={(e) => deleteAudit(audit.id, e)}
                            disabled={deletingId === audit.id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash01 className="w-4 h-4" />
                          </button>
                          {expandedItem === audit.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedItem === audit.id && audit.metrics && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {audit.metrics.tone_match?.toFixed(0) || "-"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Tone Match
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {audit.metrics.vocabulary_consistency?.toFixed(0) || "-"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Vocabulary
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {audit.metrics.emotional_alignment?.toFixed(0) || "-"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Emotional
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {audit.metrics.style_deviation?.toFixed(0) || "-"}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Style Deviation
                            </div>
                          </div>
                        </div>

                        {/* AI Feedback */}
                        {audit.metrics.ai_feedback && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                              AI Feedback
                            </h4>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
                              {audit.metrics.ai_feedback}
                            </p>
                          </div>
                        )}

                        {/* X Optimization Tips */}
                        {audit.metrics.x_optimization && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                              X Algorithm Optimization
                            </h4>
                            <div className="space-y-2">
                              {audit.metrics.x_optimization.tips?.map((tip, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-start p-3 rounded-lg ${
                                    tip.type === "success"
                                      ? "bg-green-50 dark:bg-green-900/20"
                                      : tip.type === "error"
                                      ? "bg-red-50 dark:bg-red-900/20"
                                      : "bg-yellow-50 dark:bg-yellow-900/20"
                                  }`}
                                >
                                  {tip.type === "success" ? (
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
                                  ) : tip.type === "error" ? (
                                    <XClose className="w-5 h-5 text-red-600 dark:text-red-400 mr-2 flex-shrink-0" />
                                  ) : (
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0" />
                                  )}
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {tip.message}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Deviations */}
                        {audit.metrics.deviations && audit.metrics.deviations.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                              Brand Voice Deviations
                            </h4>
                            <div className="space-y-2">
                              {audit.metrics.deviations.map((deviation, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-start p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                                >
                                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2 flex-shrink-0" />
                                  <div>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      &quot;{deviation.phrase}&quot;
                                    </span>
                                    <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                      - {deviation.reason}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Full Content */}
                        <div className="mt-4">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                            Full Content
                          </h4>
                          <p className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 whitespace-pre-wrap">
                            {audit.content}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Analyses List */}
        {activeTab === "analyses" && (
          <>
            {filteredAnalyses.length === 0 ? (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                <User01 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No profile analyses found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {hasActiveFilters
                    ? "Try adjusting your filters or search query"
                    : "Analyze profiles using the browser extension"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAnalyses.map((analysis) => (
                  <div
                    key={analysis.id}
                    className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    {/* Analysis Header */}
                    <div
                      onClick={() =>
                        setExpandedItem(expandedItem === analysis.id ? null : analysis.id)
                      }
                      className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                          {/* Meta Info */}
                          <div className="flex items-center gap-3 mb-2">
                            <span className="flex items-center text-gray-600 dark:text-gray-400">
                              {getPlatformIcon(analysis.platform)}
                              <span className="ml-1 text-sm">{analysis.platform_display}</span>
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">|</span>
                            <span className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              {formatDate(analysis.created_at)}
                            </span>
                          </div>

                          {/* Handle */}
                          <p className="text-gray-900 dark:text-white font-medium">
                            @{analysis.handle}
                          </p>
                          {analysis.voice_analysis?.tone && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {analysis.voice_analysis.tone} tone, {analysis.voice_analysis.style} style
                            </p>
                          )}
                        </div>

                        {/* Confidence & Actions */}
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-3 py-1.5 rounded-lg font-bold text-lg ${getScoreBg(
                              analysis.confidence_score * 100
                            )} ${getScoreColor(analysis.confidence_score * 100)}`}
                          >
                            {Math.round(analysis.confidence_score * 100)}%
                          </div>
                          <button
                            onClick={(e) => deleteAnalysis(analysis.id, e)}
                            disabled={deletingId === analysis.id}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash01 className="w-4 h-4" />
                          </button>
                          {expandedItem === analysis.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedItem === analysis.id && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                        {/* Voice Analysis */}
                        {analysis.voice_analysis && (
                          <div className="py-4">
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Tone
                                </div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {analysis.voice_analysis.tone || "-"}
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  Style
                                </div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {analysis.voice_analysis.style || "-"}
                                </div>
                              </div>
                            </div>

                            {/* Content Themes */}
                            {analysis.voice_analysis.content_themes &&
                              analysis.voice_analysis.content_themes.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                    Content Themes
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {analysis.voice_analysis.content_themes.map((theme, idx) => (
                                      <span
                                        key={idx}
                                        className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm"
                                      >
                                        {theme}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {/* Communication Patterns */}
                            {analysis.voice_analysis.communication_patterns &&
                              analysis.voice_analysis.communication_patterns.length > 0 && (
                                <div className="mb-4">
                                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                    Communication Patterns
                                  </h4>
                                  <ul className="space-y-1">
                                    {analysis.voice_analysis.communication_patterns.map(
                                      (pattern, idx) => (
                                        <li
                                          key={idx}
                                          className="text-sm text-gray-600 dark:text-gray-400 flex items-start"
                                        >
                                          <span className="mr-2">-</span>
                                          {pattern}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        )}

                        {/* Emotional Indicators */}
                        {analysis.emotional_indicators &&
                          Object.keys(analysis.emotional_indicators).length > 0 && (
                            <div className="mb-4">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Emotional Indicators
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(analysis.emotional_indicators).map(
                                  ([key, value]) => (
                                    <div
                                      key={key}
                                      className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center"
                                    >
                                      <div className="text-xl font-bold text-purple-600">
                                        {typeof value === "number" ? Math.round(value * 100) : value}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                        {key.replace(/_/g, " ")}
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Brand Recommendations */}
                        {analysis.brand_recommendations &&
                          analysis.brand_recommendations.length > 0 && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                                Brand Recommendations
                              </h4>
                              <ul className="space-y-2">
                                {analysis.brand_recommendations.map((rec, idx) => (
                                  <li
                                    key={idx}
                                    className="text-sm text-gray-700 dark:text-gray-300 flex items-start"
                                  >
                                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                        {/* Analysis Info */}
                        <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          {analysis.bio_used && (
                            <span className="flex items-center">
                              <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                              Bio analyzed
                            </span>
                          )}
                          {analysis.post_analyzed > 0 && (
                            <span>{analysis.post_analyzed} posts analyzed</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Clear All {activeTab === "audits" ? "Audits" : "Analyses"}?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete all your{" "}
              {activeTab === "audits" ? "post audits" : "profile analyses"}. This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={activeTab === "audits" ? clearAllAudits : clearAllAnalyses}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
