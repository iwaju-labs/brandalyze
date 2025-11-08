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
} from "@untitledui/icons";

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

export default function AdminDashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { isAdmin, isLoading: adminLoading } = useAdminStatus();
  
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);  const [showTrialFields, setShowTrialFields] = useState(false);

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
  };const handleUpdateSubscription = async (userId: number, newTier: string, isActive: boolean, subscriptionData: {
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
                          onClick={() => setEditingUser(user)}
                          className="text-purple-600 hover:text-purple-900 dark:hover:text-purple-400"
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
      </div>
    </div>
  );
}
