"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "../../../lib/api";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import toast from "react-hot-toast";
import {
  Users01,
  BarChart02,
  Settings01,
  SearchMd,
  FilterFunnel01,
  Edit01,
  RefreshCw01,
  Clock,
  CreditCard02,
  Eye,
  XClose,
  TrendUp01,
  File06,
  Target04,
  Activity,
  AlertTriangle,
  CheckCircle,
  Server01,
  Zap,
} from "@untitledui/icons";

type AdminTab = "users" | "health";

interface User {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  subscription: {
    tier: string;
    is_active: boolean;
    payment_status: string;
    stripe_customer_id: string;
    stripe_subscription_id: string;
    trial_start: string | null;
    trial_end: string | null;
    is_trial_active: boolean;
    subscription_start: string;
    subscription_end: string | null;
    next_billing_date: string | null;
  };
}

interface AdminStats {
  total_users: number;
  subscription_breakdown: {
    free: number;
    pro: number;
    enterprise: number;
  };
  active_paid_subscriptions: number;
  active_trials: number;
}

interface UserUsageData {
  user: {
    id: number;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    date_joined: string;
    last_login: string | null;
  };
  subscription: {
    tier: string;
    is_active: boolean;
    payment_status: string;
    is_trial_active: boolean;
    trial_end: string | null;
    next_billing_date: string | null;
  };
  usage: {
    total_audits: number;
    avg_score: number;
    audits_today: number;
    audits_this_week: number;
    audits_this_month: number;
    total_analyses: number;
    analyses_today: number;
    analyses_this_week: number;
    analyses_this_month: number;
    analyses_success_rate: number;
    brands_count: number;
    total_samples: number;
    last_activity: string | null;
  };
  platform_breakdown: Array<{ platform: string; count: number }>;
  brands: Array<{
    id: number;
    name: string;
    sample_count: number;
    audit_count: number;
    avg_score: number;
    created_at: string;
  }>;
  recent_audits: Array<{
    id: number;
    brand_name: string;
    platform: string;
    score: number;
    content_preview: string;
    created_at: string;
  }>;
  daily_usage_trend: Array<{ date: string; audit_count: number }>;
  analysis_logs: Array<{
    id: number;
    success: boolean;
    text_length: number;
    alignment_score: number | null;
    created_at: string;
    error_message: string | null;
  }>;
}

interface SystemHealthData {
  status: "healthy" | "warning" | "degraded" | "critical";
  timestamp: string;
  database: {
    status: "up" | "down";
    response_time_ms: number | null;
    error: string | null;
  };
  api_metrics: {
    last_hour: {
      total_requests: number;
      error_count: number;
      error_rate_percent: number;
      avg_response_time_ms: number;
      p95_response_time_ms: number;
    };
    last_24h: {
      total_requests: number;
      error_count: number;
      error_rate_percent: number;
      avg_response_time_ms: number;
    };
  };
  error_breakdown: Array<{ status_code: number; count: number }>;
  slow_endpoints: Array<{
    endpoint: string;
    method: string;
    avg_time_ms: number;
    request_count: number;
  }>;
  endpoint_errors: Array<{
    endpoint: string;
    method: string;
    error_count: number;
  }>;
  hourly_trend: Array<{
    hour: string;
    requests: number;
    errors: number;
    avg_response: number;
  }>;
  recent_errors: Array<{
    endpoint: string;
    method: string;
    status_code: number;
    error_preview: string;
    timestamp: string;
  }>;
  platform_stats: {
    total_users: number;
    active_subscriptions: number;
    audits_today: number;
    audits_this_week: number;
    analyses_today: number;
    analyses_this_week: number;
    analyses_success_today: number;
  };
  external_services: Record<string, {
    status: "up" | "down";
    response_time_ms: number | null;
    error: string | null;
  }>;
}

export default function AdminDashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { isAdmin, isLoading: adminLoading } = useAdminStatus();
  
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);  const [showTrialFields, setShowTrialFields] = useState(false);
  const [viewingUsage, setViewingUsage] = useState<UserUsageData | null>(null);
  const [isLoadingUsage, setIsLoadingUsage] = useState(false);
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch stats and users in parallel
      const [statsResponse, usersResponse] = await Promise.all([
        authenticatedFetch("/payments/admin/stats/", getToken),
        authenticatedFetch(
          `/payments/admin/users/?search=${searchTerm}&tier=${tierFilter}&page=${currentPage}&per_page=20`,
          getToken
        ),
      ]);

      setStats(statsResponse.data);
      setUsers(usersResponse.data.users);
      setTotalPages(usersResponse.data.pagination.total_pages);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      toast.error("Failed to load admin dashboard");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, searchTerm, tierFilter, currentPage]);
  
  // Check admin access
  useEffect(() => {
    if (!isLoaded || adminLoading) return;
    
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    if (!isAdmin) {
      router.push("/");
      return;
    }    fetchAdminData();  }, [isLoaded, isSignedIn, isAdmin, adminLoading, router, fetchAdminData]);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAdminData();
  };

  const handleViewUsage = async (userId: number) => {
    try {
      setIsLoadingUsage(true);
      const response = await authenticatedFetch(`/payments/admin/users/${userId}/usage/`, getToken);
      setViewingUsage(response.data);
    } catch (error: unknown) {
      console.error("Failed to fetch user usage:", error);
      toast.error((error as Error).message || "Failed to load user usage data");
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const fetchHealthData = useCallback(async () => {
    try {
      setIsLoadingHealth(true);
      const response = await authenticatedFetch("/payments/admin/system-health/", getToken);
      setHealthData(response.data);
    } catch (error: unknown) {
      console.error("Failed to fetch system health:", error);
      toast.error((error as Error).message || "Failed to load system health data");
    } finally {
      setIsLoadingHealth(false);
    }
  }, [getToken]);

  const handleUpdateSubscription = async (userId: number, newTier: string, isActive: boolean, subscriptionData: {
    subscription_start?: string | null;
    subscription_end?: string | null;
    trial_start?: string | null;
    trial_end?: string | null;
  }) => {
    try {
      setIsUpdating(true);
      
      const response = await authenticatedFetch("/payments/admin/update-subscription/", getToken, {
        method: "POST",
        body: JSON.stringify({
          user_id: userId,
          tier: newTier,
          is_active: isActive,
          subscription_start: subscriptionData.subscription_start,
          subscription_end: subscriptionData.subscription_end,
          trial_start: subscriptionData.trial_start,
          trial_end: subscriptionData.trial_end,
        }),
      });toast.success(response.message);
      setEditingUser(null);
      fetchAdminData(); // Refresh data
    } catch (error: unknown) {
      console.error("Failed to update subscription:", error);
      toast.error((error as Error).message || "Failed to update subscription");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSyncStripe = async (userId: number) => {
    try {
      const response = await authenticatedFetch("/payments/admin/sync-stripe/", getToken, {
        method: "POST",
        body: JSON.stringify({ user_id: userId }),
      });

      toast.success(response.message);
      fetchAdminData(); // Refresh data
    } catch (error: unknown) {
      console.error("Failed to sync Stripe:", error);
      toast.error((error as Error).message || "Failed to sync with Stripe");
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case "free":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "pro":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "enterprise":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getStatusBadgeColor = (status: string, isActive: boolean) => {
    if (!isActive) return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "trialing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "past_due":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "canceled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings01 className="h-8 w-8 text-purple-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage user subscriptions and monitor platform usage
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            <button
              onClick={() => setActiveTab("users")}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "users"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <Users01 className="h-4 w-4" />
                Users
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("health");
                if (!healthData) fetchHealthData();
              }}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "health"
                  ? "border-purple-600 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                System Health
              </span>
            </button>
          </nav>
        </div>

        {/* Users Tab Content */}
        {activeTab === "users" && (
          <>
        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center">
                <Users01 className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_users}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center">
                <CreditCard02 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Paid Subscriptions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_paid_subscriptions}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Trials</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active_trials}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <div className="flex items-center">
                <BarChart02 className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pro Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.subscription_breakdown.pro}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <SearchMd className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by email, name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Tiers</option>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>

              <button
                onClick={handleSearch}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <FilterFunnel01 className="h-4 w-4" />
                Apply Filter
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTierBadgeColor(user.subscription.tier)}`}>
                        {user.subscription.tier}
                      </span>
                      {user.subscription.is_trial_active && (
                        <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          trial
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(user.subscription.payment_status, user.subscription.is_active)}`}>
                        {user.subscription.is_active ? user.subscription.payment_status : "inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.date_joined).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewUsage(user.id)}
                          className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                          title="View Usage"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-purple-600 hover:text-purple-900 dark:hover:text-purple-400"
                          title="Edit Subscription"
                        >
                          <Edit01 className="h-4 w-4" />
                        </button>
                        {user.subscription.stripe_customer_id && (
                          <button
                            onClick={() => handleSyncStripe(user.id)}
                            className="text-blue-600 hover:text-blue-900 dark:hover:text-blue-400"
                            title="Sync with Stripe"
                          >
                            <RefreshCw01 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {/* System Health Tab Content */}
        {activeTab === "health" && (
          <div className="space-y-6">
            {isLoadingHealth ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading system health...</span>
              </div>
            ) : healthData ? (
              <>
                {/* System Status Banner */}
                <div className={`rounded-lg p-4 flex items-center gap-4 ${
                  healthData.status === "healthy" ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" :
                  healthData.status === "warning" ? "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800" :
                  healthData.status === "degraded" ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800" :
                  "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                }`}>
                  {healthData.status === "healthy" ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : healthData.status === "warning" ? (
                    <AlertTriangle className="h-6 w-6 text-yellow-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  )}
                  <div>
                    <h3 className={`font-semibold ${
                      healthData.status === "healthy" ? "text-green-800 dark:text-green-200" :
                      healthData.status === "warning" ? "text-yellow-800 dark:text-yellow-200" :
                      "text-red-800 dark:text-red-200"
                    }`}>
                      System Status: {healthData.status.charAt(0).toUpperCase() + healthData.status.slice(1)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Last updated: {new Date(healthData.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={fetchHealthData}
                    className="ml-auto px-3 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <RefreshCw01 className="h-4 w-4" />
                    Refresh
                  </button>
                </div>

                {/* Quick Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Zap className="h-4 w-4" />
                      <span className="text-xs font-medium">Requests (1h)</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthData.api_metrics.last_hour.total_requests}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-xs font-medium">Error Rate (1h)</span>
                    </div>
                    <p className={`text-2xl font-bold ${healthData.api_metrics.last_hour.error_rate_percent > 5 ? "text-red-600" : "text-gray-900 dark:text-white"}`}>
                      {healthData.api_metrics.last_hour.error_rate_percent}%
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Avg Response</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthData.api_metrics.last_hour.avg_response_time_ms}ms</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <Server01 className="h-4 w-4" />
                      <span className="text-xs font-medium">P95 Response</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthData.api_metrics.last_hour.p95_response_time_ms}ms</p>
                  </div>
                </div>

                {/* Database & Platform Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Server01 className="h-4 w-4" />
                      Database
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Status</span>
                        <span className={`font-medium ${healthData.database.status === "up" ? "text-green-600" : "text-red-600"}`}>
                          {healthData.database.status.toUpperCase()}
                        </span>
                      </div>
                      {healthData.database.response_time_ms && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Response Time</span>
                          <span className="text-gray-900 dark:text-white">{healthData.database.response_time_ms.toFixed(2)}ms</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <BarChart02 className="h-4 w-4" />
                      Platform Activity
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Total Users</span>
                        <span className="text-gray-900 dark:text-white">{healthData.platform_stats.total_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Active Subscriptions</span>
                        <span className="text-gray-900 dark:text-white">{healthData.platform_stats.active_subscriptions}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="text-gray-600 dark:text-gray-400">Audits Today</span>
                        <span className="text-gray-900 dark:text-white">{healthData.platform_stats.audits_today}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Audits This Week</span>
                        <span className="text-gray-900 dark:text-white">{healthData.platform_stats.audits_this_week}</span>
                      </div>
                      <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                        <span className="text-gray-600 dark:text-gray-400">Analyses Today</span>
                        <span className="text-gray-900 dark:text-white">
                          {healthData.platform_stats.analyses_success_today}/{healthData.platform_stats.analyses_today}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Analyses This Week</span>
                        <span className="text-gray-900 dark:text-white">{healthData.platform_stats.analyses_this_week}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 24h Metrics */}
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Last 24 Hours</h4>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthData.api_metrics.last_24h.total_requests}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Requests</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthData.api_metrics.last_24h.error_count}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Errors</p>
                    </div>
                    <div>
                      <p className={`text-2xl font-bold ${healthData.api_metrics.last_24h.error_rate_percent > 5 ? "text-red-600" : "text-gray-900 dark:text-white"}`}>
                        {healthData.api_metrics.last_24h.error_rate_percent}%
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Error Rate</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{healthData.api_metrics.last_24h.avg_response_time_ms}ms</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Avg Response</p>
                    </div>
                  </div>
                </div>

                {/* Hourly Trend */}
                {healthData.hourly_trend.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Hourly Request Trend</h4>
                    <div className="flex items-end gap-1 h-24">
                      {healthData.hourly_trend.map((hour) => {
                        const maxRequests = Math.max(...healthData.hourly_trend.map(h => h.requests), 1);
                        const height = (hour.requests / maxRequests) * 100;
                        const errorRatio = hour.requests > 0 ? hour.errors / hour.requests : 0;
                        return (
                          <div
                            key={hour.hour}
                            className={`flex-1 rounded-t transition-colors cursor-pointer ${
                              errorRatio > 0.1 ? "bg-red-500 hover:bg-red-600" : "bg-purple-500 hover:bg-purple-600"
                            }`}
                            style={{ height: `${Math.max(height, 4)}%` }}
                            title={`${new Date(hour.hour).toLocaleTimeString()}: ${hour.requests} requests, ${hour.errors} errors`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Slow Endpoints & Error Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {healthData.slow_endpoints.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Slowest Endpoints</h4>
                      <div className="space-y-2">
                        {healthData.slow_endpoints.slice(0, 5).map((endpoint, idx) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 truncate flex-1">
                              <span className="px-1.5 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 rounded">{endpoint.method}</span>
                              <span className="text-gray-700 dark:text-gray-300 truncate">{endpoint.endpoint}</span>
                            </div>
                            <span className={`font-medium ml-2 ${endpoint.avg_time_ms > 1000 ? "text-red-600" : "text-gray-900 dark:text-white"}`}>
                              {endpoint.avg_time_ms}ms
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {healthData.error_breakdown.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Error Breakdown</h4>
                      <div className="space-y-2">
                        {healthData.error_breakdown.map((error) => (
                          <div key={error.status_code} className="flex items-center justify-between text-sm">
                            <span className={`px-2 py-0.5 rounded font-medium ${
                              error.status_code >= 500 ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            }`}>
                              {error.status_code}
                            </span>
                            <span className="text-gray-900 dark:text-white">{error.count} occurrences</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recent Errors */}
                {healthData.recent_errors.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Errors</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {healthData.recent_errors.map((error, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 rounded">{error.method}</span>
                              <span className="text-gray-700 dark:text-gray-300">{error.endpoint}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                {error.status_code}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(error.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                          {error.error_preview && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{error.error_preview}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                Failed to load system health data
              </div>
            )}
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Edit User Subscription
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {editingUser.first_name} {editingUser.last_name} ({editingUser.email})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Subscription Tier
                  </label>
                  <select
                    value={editingUser.subscription.tier}
                    onChange={(e) => setEditingUser({
                      ...editingUser,
                      subscription: { ...editingUser.subscription, tier: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingUser.subscription.is_active}
                      onChange={(e) => setEditingUser({
                        ...editingUser,
                        subscription: { ...editingUser.subscription, is_active: e.target.checked }
                      })}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subscription Start
                    </label>
                    <input
                      type="datetime-local"
                      value={editingUser.subscription.subscription_start ? 
                        new Date(editingUser.subscription.subscription_start).toISOString().slice(0, 16) : 
                        ""
                      }
                      onChange={(e) => setEditingUser({
                        ...editingUser,
                        subscription: { 
                          ...editingUser.subscription, 
                          subscription_start: e.target.value ? new Date(e.target.value).toISOString() : ""
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subscription End
                    </label>
                    <input
                      type="datetime-local"
                      value={editingUser.subscription.subscription_end ? 
                        new Date(editingUser.subscription.subscription_end).toISOString().slice(0, 16) : 
                        ""
                      }
                      onChange={(e) => setEditingUser({
                        ...editingUser,
                        subscription: { 
                          ...editingUser.subscription, 
                          subscription_end: e.target.value ? new Date(e.target.value).toISOString() : ""
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      placeholder="Leave empty for no end date"
                    />
                  </div>                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => setShowTrialFields(!showTrialFields)}
                    className="text-sm text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300"
                  >
                    {showTrialFields ? "Hide" : "Show"} Trial Settings
                  </button>
                </div>

                {showTrialFields && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Trial Start
                      </label>
                      <input
                        type="datetime-local"
                        value={editingUser.subscription.trial_start ? 
                          new Date(editingUser.subscription.trial_start).toISOString().slice(0, 16) : 
                          ""
                        }
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          subscription: { 
                            ...editingUser.subscription, 
                            trial_start: e.target.value ? new Date(e.target.value).toISOString() : ""
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Trial End
                      </label>
                      <input
                        type="datetime-local"
                        value={editingUser.subscription.trial_end ? 
                          new Date(editingUser.subscription.trial_end).toISOString().slice(0, 16) : 
                          ""
                        }
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          subscription: { 
                            ...editingUser.subscription, 
                            trial_end: e.target.value ? new Date(e.target.value).toISOString() : ""
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditingUser(null)}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>                <button
                  onClick={() => handleUpdateSubscription(
                    editingUser.id,
                    editingUser.subscription.tier,
                    editingUser.subscription.is_active,
                    editingUser.subscription
                  )}
                  disabled={isUpdating}
                  className="px-4 py-2 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Usage Modal */}
        {(viewingUsage || isLoadingUsage) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {isLoadingUsage ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600 dark:text-gray-400">Loading usage data...</span>
                </div>
              ) : viewingUsage && (
                <>
                  {/* Modal Header */}
                  <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        User Usage: {viewingUsage.user.first_name} {viewingUsage.user.last_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{viewingUsage.user.email}</p>
                    </div>
                    <button
                      onClick={() => setViewingUsage(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <XClose className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                          <BarChart02 className="h-4 w-4" />
                          <span className="text-xs font-medium">Total Audits</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{viewingUsage.usage.total_audits}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                          <Target04 className="h-4 w-4" />
                          <span className="text-xs font-medium">Total Analyses</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{viewingUsage.usage.total_analyses}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                          <File06 className="h-4 w-4" />
                          <span className="text-xs font-medium">Brands</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{viewingUsage.usage.brands_count}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                          <TrendUp01 className="h-4 w-4" />
                          <span className="text-xs font-medium">Avg Score</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{viewingUsage.usage.avg_score}</p>
                      </div>
                    </div>

                    {/* Usage This Period */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{viewingUsage.usage.audits_today}</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Audits Today</p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{viewingUsage.usage.audits_this_month}</p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">Audits This Month</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{viewingUsage.usage.analyses_today}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Analyses Today</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{viewingUsage.usage.analyses_this_month}</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400">Analyses This Month</p>
                      </div>
                    </div>

                    {/* Subscription & Activity */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Subscription</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Tier</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(viewingUsage.subscription.tier)}`}>
                              {viewingUsage.subscription.tier}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Status</span>
                            <span className="text-gray-900 dark:text-white">{viewingUsage.subscription.payment_status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Trial Active</span>
                            <span className="text-gray-900 dark:text-white">{viewingUsage.subscription.is_trial_active ? "Yes" : "No"}</span>
                          </div>
                          {viewingUsage.subscription.next_billing_date && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Next Billing</span>
                              <span className="text-gray-900 dark:text-white">
                                {new Date(viewingUsage.subscription.next_billing_date).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Activity</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Joined</span>
                            <span className="text-gray-900 dark:text-white">
                              {new Date(viewingUsage.user.date_joined).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Last Login</span>
                            <span className="text-gray-900 dark:text-white">
                              {viewingUsage.user.last_login ? new Date(viewingUsage.user.last_login).toLocaleDateString() : "Never"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Last Activity</span>
                            <span className="text-gray-900 dark:text-white">
                              {viewingUsage.usage.last_activity ? new Date(viewingUsage.usage.last_activity).toLocaleDateString() : "Never"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">Today</span>
                            <span className="text-gray-900 dark:text-white">{viewingUsage.usage.audits_today} audits</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-gray-400">This Week</span>
                            <span className="text-gray-900 dark:text-white">{viewingUsage.usage.audits_this_week} audits</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Platform Breakdown */}
                    {viewingUsage.platform_breakdown.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Platform Breakdown</h4>
                        <div className="flex flex-wrap gap-3">
                          {viewingUsage.platform_breakdown.map((platform) => (
                            <div key={platform.platform} className="bg-white dark:bg-gray-700 rounded-lg px-3 py-2 flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{platform.platform}</span>
                              <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full">
                                {platform.count}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Brands */}
                    {viewingUsage.brands.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Brands ({viewingUsage.brands.length})</h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500 dark:text-gray-400">
                                <th className="pb-2">Name</th>
                                <th className="pb-2">Samples</th>
                                <th className="pb-2">Audits</th>
                                <th className="pb-2">Avg Score</th>
                                <th className="pb-2">Created</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {viewingUsage.brands.map((brand) => (
                                <tr key={brand.id}>
                                  <td className="py-2 text-gray-900 dark:text-white font-medium">{brand.name}</td>
                                  <td className="py-2 text-gray-600 dark:text-gray-400">{brand.sample_count}</td>
                                  <td className="py-2 text-gray-600 dark:text-gray-400">{brand.audit_count}</td>
                                  <td className="py-2">
                                    <span className={`font-medium ${brand.avg_score >= 80 ? "text-green-600" : "text-gray-600"} ${brand.avg_score >= 60 && brand.avg_score < 80 ? "text-yellow-600" : ""} ${brand.avg_score < 60 ? "text-red-600" : ""}`}>
                                      {brand.avg_score}
                                    </span>
                                  </td>
                                  <td className="py-2 text-gray-600 dark:text-gray-400">
                                    {new Date(brand.created_at).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Recent Audits */}
                    {viewingUsage.recent_audits.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Recent Audits</h4>
                        <div className="space-y-3">
                          {viewingUsage.recent_audits.map((audit) => (
                            <div key={audit.id} className="bg-white dark:bg-gray-700 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{audit.brand_name}</span>
                                  <span className="text-xs bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded capitalize">
                                    {audit.platform}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm font-medium ${audit.score >= 80 ? "text-green-600" : "text-gray-600"} ${audit.score >= 60 && audit.score < 80 ? "text-yellow-600" : ""} ${audit.score < 60 ? "text-red-600" : ""}`}>
                                    {audit.score}
                                  </span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {new Date(audit.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{audit.content_preview}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Daily Usage Trend */}
                    {viewingUsage.daily_usage_trend.length > 0 && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Daily Usage (Last 30 Days)</h4>
                        <div className="flex items-end gap-1 h-24">
                          {viewingUsage.daily_usage_trend.map((day) => {
                            const maxCount = Math.max(...viewingUsage.daily_usage_trend.map(d => d.audit_count), 1);
                            const height = (day.audit_count / maxCount) * 100;
                            return (
                              <div
                                key={day.date}
                                className="flex-1 bg-purple-500 rounded-t hover:bg-purple-600 transition-colors cursor-pointer"
                                style={{ height: `${Math.max(height, 4)}%` }}
                                title={`${day.date}: ${day.audit_count} audits`}
                              />
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{viewingUsage.daily_usage_trend[0]?.date}</span>
                          <span>{viewingUsage.daily_usage_trend.at(-1)?.date}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
                    <button
                      onClick={() => setViewingUsage(null)}
                      className="w-full px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
