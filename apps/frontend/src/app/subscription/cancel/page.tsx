"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, CreditCard02, MessageCircle01 } from "@untitledui/icons";

export default function SubscriptionCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">
          {/* Cancel Icon */}
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-yellow-600" />
          </div>

          {/* Cancel Message */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Subscription Cancelled
          </h1>
          
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
            No worries! Your payment has been cancelled and you haven&apos;t been charged.
          </p>

          {/* What Happened */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              What happened?
            </h2>
            <div className="text-left space-y-3 text-gray-600 dark:text-gray-400">
              <p>• You cancelled the checkout process</p>
              <p>• No payment was processed</p>
              <p>• You can still use the free plan with 3 daily analyses</p>
              <p>• You can upgrade anytime from the pricing page</p>
            </div>
          </div>

          {/* Free Plan Reminder */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Continue with Free Plan
            </h3>
            <div className="text-left space-y-2 text-gray-600 dark:text-gray-400">
              <p>• 3 brand analyses per day</p>
              <p>• Up to 5 brand samples</p>
              <p>• Basic AI feedback</p>
              <p>• Community support</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button
              onClick={() => router.push("/brand-voice-checker")}
              className="flex items-center justify-center px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Try Free Plan
              <ArrowLeft className="ml-2 w-4 h-4 rotate-180" />
            </button>
            
            <button
              onClick={() => router.push("/pricing")}
              className="flex items-center justify-center px-8 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <CreditCard02 className="mr-2 w-4 h-4" />
              View Pricing Again
            </button>
          </div>

          {/* Help Section */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <MessageCircle01 className="w-6 h-6 text-purple-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Need Help?
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              If you experienced any issues during checkout or have questions about our plans, we&apos;re here to help.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:dom@brandalyze.com"
                className="inline-flex items-center justify-center px-6 py-2 text-purple-600 hover:text-purple-700 transition-colors"
              >
                Email Support
              </a>
              
              <button
                onClick={() => router.push("/pricing")}
                className="inline-flex items-center justify-center px-6 py-2 text-purple-600 hover:text-purple-700 transition-colors"
              >
                View Plan Comparison
              </button>
            </div>
          </div>

          {/* Bottom Message */}
          <div className="mt-8">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              You can upgrade to a paid plan anytime from your account dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
