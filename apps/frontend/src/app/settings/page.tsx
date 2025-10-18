"use client";

import { useState, useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "../../../lib/api"
import toast from "react-hot-toast";
import { 
  CreditCard02, 
  Trash01, 
  LinkExternal01, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  User01,
  Infinity
} from "@untitledui/icons";

interface SubscriptionInfo {
  tier: string;
  status: string;
  trial_active: boolean;
  trial_days_left: number;
  next_billing_date: string | null;
}

export default function SettingsPage() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  useEffect(() => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    fetchSubscriptionInfo();
  }, [isSignedIn, router]);

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await authenticatedFetch("/payments/billing-info/", getToken);
      setSubscription(response.data.subscription);
    } catch (error) {
      console.error("Failed to fetch subscription info:", error);
      toast.error("Failed to load subscription information");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      await authenticatedFetch("/payments/cancel/", getToken, {
        method: "POST"
      });
      
      toast.success("Subscription cancelled successfully");
      setShowCancelDialog(false);
      
      // Refresh subscription info
      await fetchSubscriptionInfo();
      
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
      toast.error("Failed to cancel subscription");
    } finally {
      setIsCanceling(false);
    }
  };

  const openCustomerPortal = async () => {
    try {
      const response = await authenticatedFetch("/payments/portal/", getToken, {
        method: "POST"
      });
      
      window.open(response.data.portal_url, '_blank');
      
    } catch (error) {
      console.error("Failed to open customer portal:", error);
      toast.error("Failed to open billing portal");
    }
  };
  if (!isSignedIn) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const isPaidPlan = subscription?.tier === 'pro' || subscription?.tier === 'enterprise';

  return (
    <div className="min-h-screen bg-white dark:bg-black py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Account Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage your subscription and account preferences
          </p>
        </div>

        {/* Subscription Section */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center mb-4">
            <CreditCard02 className="w-6 h-6 text-purple-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Subscription
            </h2>
          </div>

          {subscription && (
            <div className="space-y-4">
              {/* Current Plan */}
              <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                  <div className="flex items-center">
                    <span className="text-lg font-medium text-gray-900 dark:text-white capitalize">
                      {subscription.tier} Plan
                    </span>
                    {subscription.trial_active && (
                      <span className="ml-3 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                        Trial Active
                      </span>
                    )}
                    {subscription.status === 'active' && !subscription.trial_active && (
                      <span className="ml-3 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </span>
                    )}
                  </div>
                  
                  {subscription.trial_active && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center mt-1">
                      <Clock className="w-4 h-4 mr-1" />
                      {subscription.trial_days_left} days left in trial
                    </p>
                  )}
                  
                  {subscription.next_billing_date && !subscription.trial_active && (
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex space-x-3">
                  {subscription.tier === 'free' ? (
                    <button
                      onClick={() => router.push('/pricing')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Upgrade Plan
                    </button>
                  ) : (
                    <>
                      {isPaidPlan && (
                        <button
                          onClick={openCustomerPortal}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex items-center"
                        >
                          <LinkExternal01 className="w-4 h-4 mr-2" />
                          Manage Billing
                        </button>
                      )}
                      
                      <button
                        onClick={() => setShowCancelDialog(true)}
                        className="px-4 py-2 bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded-lg font-medium transition-colors flex items-center"
                      >
                        <Trash01 className="w-4 h-4 mr-2" />
                        Cancel Subscription
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Plan Features */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Daily Analyses</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {subscription.tier === 'free' ? '3' : subscription.tier === 'pro' ? '50' : '∞'}
                  </p>
                </div>
                
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Brand Samples</h3>
                  <p className="text-2xl font-bold text-purple-600">
                    {subscription.tier === 'free' ? '5' : <Infinity />}
                  </p>
                </div>
                
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Support</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {subscription.tier === 'free' ? 'Community' : subscription.tier === 'pro' ? 'Priority' : 'Dedicated'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Section */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <User01 className="w-6 h-6 text-purple-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Profile
            </h2>
          </div>
          
          <button
            onClick={() => router.push('/user-profile')}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors flex items-center"
          >
            <LinkExternal01 className="w-4 h-4 mr-2" />
            Manage Profile
          </button>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cancel Subscription
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to cancel your subscription? You will immediately lose access to:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>Unlimited brand samples</li>
                <li>Advanced AI insights</li>
                <li>Priority support</li>
                {subscription?.tier === 'enterprise' && (
                  <>
                    <li>Custom AI models</li>
                    <li>API access</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                disabled={isCanceling}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={isCanceling}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {isCanceling ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Trash01 className="w-4 h-4 mr-2" />
                )}
                {isCanceling ? 'Canceling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
