"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { authenticatedFetch } from "../../../../lib/api";
import toast from "react-hot-toast";
import { CheckCircle, ArrowRight, CreditCard02 } from "@untitledui/icons";

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found");
      setIsLoading(false);
      return;
    }

    fetchSubscriptionInfo();
  }, [sessionId]);

  const fetchSubscriptionInfo = async () => {
    try {
      // Fetch updated billing info to confirm subscription
      const response = await authenticatedFetch("/payments/api/billing-info/", getToken);
      setSubscriptionInfo(response.data);
      
      toast.success("Subscription activated successfully!");
    } catch (error) {
      console.error("Failed to fetch subscription info:", error);
      setError("Failed to load subscription information");
      toast.error("There was an issue confirming your subscription");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Confirming your subscription...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">✗</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Something went wrong
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Back to Pricing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to {subscriptionInfo?.subscription?.tier === 'pro' ? 'Brandalyze Pro' : 'Brandalyze Enterprise'}!
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            Your subscription has been activated successfully. You now have access to all the powerful features.
          </p>

          {/* Subscription Details */}
          {subscriptionInfo && (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center justify-center">
                <CreditCard02 className="mr-2" />
                Your Subscription
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-sm text-gray-500">Plan</span>
                  <div className="font-semibold text-gray-900 dark:text-white capitalize">
                    {subscriptionInfo.subscription.tier}
                  </div>
                </div>
                
                <div>
                  <span className="text-sm text-gray-500">Status</span>
                  <div className="font-semibold text-green-600 capitalize">
                    {subscriptionInfo.subscription.status}
                  </div>
                </div>
                
                {subscriptionInfo.subscription.next_billing_date && (
                  <div className="md:col-span-2">
                    <span className="text-sm text-gray-500">Next Billing Date</span>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {new Date(subscriptionInfo.subscription.next_billing_date).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Feature Highlights */}
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              What&apos;s included in your plan:
            </h3>
            <ul className="text-left space-y-2 text-gray-600 dark:text-gray-400">
              {subscriptionInfo?.subscription?.tier === 'pro' ? (
                <>
                  <li>• 50 brand analyses per day</li>
                  <li>• Unlimited brand samples</li>
                  <li>• Advanced AI feedback and insights</li>
                  <li>• Priority email support</li>
                  <li>• Export reports (coming soon)</li>
                </>
              ) : (
                <>
                  <li>• Unlimited brand analyses</li>
                  <li>• Unlimited brand samples</li>
                  <li>• Advanced AI feedback and insights</li>
                  <li>• Custom integrations</li>
                  <li>• Priority support</li>
                  <li>• Team management (coming soon)</li>
                </>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/analyze")}
              className="flex items-center justify-center px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Start Analyzing
              <ArrowRight className="ml-2 w-4 h-4" />
            </button>
            
            <button
              onClick={() => router.push("/user-profile")}
              className="flex items-center justify-center px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Manage Subscription
            </button>
          </div>

          {/* Support Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help getting started? 
              <a 
                href="mailto:dom@brandalyze.com" 
                className="text-purple-600 hover:text-purple-700 ml-1"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
