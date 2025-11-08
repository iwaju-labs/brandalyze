"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { authenticatedFetch } from "../../../lib/api";
import toast from "react-hot-toast";
import { CreditCard02, BarChart02, AlertTriangle } from "@untitledui/icons";

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

export default function UsageDashboard() {
  const { getToken } = useAuth();
  const [usageInfo, setUsageInfo] = useState<UsageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsageInfo = useCallback(async () => {
    try {
      const response = await authenticatedFetch("/user/usage", getToken);
      setUsageInfo(response.data);
    } catch (error) {
      console.error("Failed to fetch usage info:", error);
      toast.error("Failed to load usage information");
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchUsageInfo();
  }, [fetchUsageInfo]);

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!usageInfo) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
      <div className="flex items-center mb-4">
        <BarChart02 className="mr-2 text-purple-600" />
        <h2 className="text-xl font-semibold">Usage & Subscription</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {usageInfo.subscription.tier.charAt(0).toUpperCase() + 
             usageInfo.subscription.tier.slice(1)}
          </div>
          <div className="text-sm text-gray-500">Current Plan</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {usageInfo.usage.today_count}
          </div>
          <div className="text-sm text-gray-500">Analyses Today</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {usageInfo.usage.remaining_today === null 
              ? "∞" 
              : usageInfo.usage.remaining_today}
          </div>
          <div className="text-sm text-gray-500">Remaining</div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold mb-3">Plan Limits</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Daily Analyses:</span>
            <span className="font-medium">
              {usageInfo.subscription.daily_limit === null 
                ? "Unlimited" 
                : usageInfo.subscription.daily_limit}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Brand Samples:</span>
            <span className="font-medium">
              {usageInfo.subscription.tier === 'free' ? "5" : "Unlimited"}
            </span>
          </div>
        </div>
      </div>

      {usageInfo.subscription.tier === 'free' && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You&apos;re on the free plan.
              <a
                href="/pricing"
                className="text-yellow-900 dark:text-yellow-100 underline font-semibold hover:text-yellow-700"
              >
              {" "}Upgrade for unlimited analyses
              </a>
            </p>
          </div>
        </div>
      )}

      {usageInfo.subscription.tier === 'free' && (
        <div className="mt-4">
          <a
            href="/pricing"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <CreditCard02 className="mr-2 w-4 h-4" />
            Upgrade Plan
          </a>
        </div>
      )}
    </div>
  );
}