"use client";

import { useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "../../../lib/api";
import toast from "react-hot-toast";
import { CheckCircle, CreditCard02, Zap, Laptop02, ArrowRight, Building07 } from "@untitledui/icons";

const pricingTiers = [
  {
    name: "Free",
    price: 0,
    billing: "forever",
    description: "Perfect for trying out brand analysis",
    features: [
      "3 analyses per day",
      "5 brand samples",
      "Basic AI feedback",
      "Community support"
    ],
    buttonText: "Get Started Free",
    popular: false,
    stripeId: null,
    icon: Laptop02
  },
  {
    name: "Pro",
    price: 19,
    billing: "month",
    description: "For growing businesses and agencies",
    features: [
      "50 analyses per day",
      "Unlimited brand samples",
      "Advanced AI insights",
      "Priority support",
      "7-day free trial"
    ],
    buttonText: "Start Free Trial",
    popular: true,
    stripeId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    icon: Zap
  },
  {
    name: "Enterprise",
    price: 99,
    billing: "month", 
    description: "For large teams and organizations",
    features: [
      "Unlimited analyses",
      "Unlimited brand samples",
      "Custom AI models",
      "Dedicated support",
      "API access",
      "Team management (coming soon)"
    ],
    buttonText: "Get Started",
    popular: false,
    stripeId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    icon: Building07
  }
];

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    show: boolean;
    tier: typeof pricingTiers[0] | null;
    type: 'trial' | 'subscription';
  }>({ show: false, tier: null, type: 'subscription' });

  const handleSubscribe = async (tier: typeof pricingTiers[0]) => {
    if (!isSignedIn) {
      toast.error("Please sign in to subscribe");
      router.push("/sign-in");
      return;
    }

    if (tier.name === "Free") {
      router.push("/analyze");
      return;
    }

    // Show confirmation dialog instead of proceeding directly
    setShowConfirmDialog({
      show: true,
      tier,
      type: 'subscription'
    });
  };

  const confirmSubscription = async () => {
    const tier = showConfirmDialog.tier;
    if (!tier || !tier.stripeId) {
      toast.error("Invalid subscription plan");
      return;
    }

    setIsLoading(tier.name);
    setShowConfirmDialog({ show: false, tier: null, type: 'subscription' });

    try {
      const response = await authenticatedFetch("/payments/create-checkout-session/", getToken, {
        method: "POST",
        body: JSON.stringify({
          price_id: tier.stripeId
        })
      });

      // Redirect to Stripe Checkout
      window.location.href = response.data.checkout_url;

    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Failed to start subscription process");
    } finally {
      setIsLoading(null);
    }
  };

  const startTrial = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to start trial");
      router.push("/sign-in");
      return;
    }

    // Show confirmation dialog for trial
    setShowConfirmDialog({
      show: true,
      tier: pricingTiers.find(t => t.name === "Pro") || null,
      type: 'trial'
    });
  };

  const confirmTrial = async () => {
    setIsLoading("trial");
    setShowConfirmDialog({ show: false, tier: null, type: 'subscription' });

    try {
      await authenticatedFetch("/payments/start-trial/", getToken, {
        method: "POST"
      });

      toast.success("🎉 Free trial started! Enjoy Pro features for 7 days.");
      router.push("/analyze");

    } catch (error) {
      console.error("Trial error:", error);
      toast.error("Failed to start trial. You may have already used your trial.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Unlock the full potential of AI-powered brand analysis
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto rounded-lg">
          {pricingTiers.map((tier) => {
            const IconComponent = tier.icon;
            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl border-2 p-8 ${
                  tier.popular
                    ? "border-purple-500 shadow-2xl scale-105 bg-white dark:bg-gray-900"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-black text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <IconComponent className="w-6 h-6 text-purple-600" />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {tier.name}
                  </h3>
                  
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      ${tier.price}
                    </span>
                    {tier.price > 0 && (
                      <span className="text-gray-600 dark:text-gray-300">
                        /{tier.billing}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-300">
                    {tier.description}
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => tier.name === "Pro" ? startTrial() : handleSubscribe(tier)}
                  disabled={isLoading === tier.name || isLoading === "trial"}
                  className={`w-full py-4 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center ${
                    tier.popular
                      ? "bg-gradient-to-r from-purple-600 to-black hover:from-purple-700 hover:to-black/80 text-white shadow-lg hover:shadow-xl"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                  } ${
                    (isLoading === tier.name || isLoading === "trial")
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {(isLoading === tier.name || isLoading === "trial") ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      {tier.name === "Free" ? (
                        <>
                          <Laptop02 className="w-4 h-4 mr-2" />
                          {tier.buttonText}
                        </>
                      ) : (
                        <>
                          <CreditCard02 className="w-4 h-4 mr-2" />
                          {tier.buttonText}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            All paid plans include a 7-day free trial. Cancel anytime.
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-gray-400">
            <div className="flex items-center">
              <Laptop02 className="w-4 h-4 mr-2" />
              Secure Payments
            </div>
            <div className="flex items-center">
              <CreditCard02 className="w-4 h-4 mr-2" />
              No Setup Fees
            </div>
            <div>Cancel Anytime</div>
          </div>
          
          <div className="mt-8">
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Questions? Email me at{" "}
              <a 
                href="mailto:dom@brandalyze.io" 
                className="text-purple-600 hover:text-purple-700"
              >
                dom@brandalyze.io
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog.show && showConfirmDialog.tier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-4">
                {showConfirmDialog.type === 'trial' ? (
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                ) : (
                  <CreditCard02 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {showConfirmDialog.type === 'trial' 
                    ? 'Start Free Trial' 
                    : `Subscribe to ${showConfirmDialog.tier.name}`
                  }
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {showConfirmDialog.type === 'trial' 
                    ? 'Confirm your 7-day free trial'
                    : 'Confirm your subscription'
                  }
                </p>
              </div>
            </div>

            <div className="mb-6">
              {showConfirmDialog.type === 'trial' ? (
                <div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    You're about to start a <strong>7-day free trial</strong> of the Pro plan. You'll get:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 mb-4">
                    <li>50 analyses per day</li>
                    <li>Unlimited brand samples</li>
                    <li>Advanced AI insights</li>
                    <li>Priority support</li>
                  </ul>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No payment required. Cancel anytime during the trial.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    You're about to subscribe to the <strong>{showConfirmDialog.tier.name} plan</strong> for <strong>${showConfirmDialog.tier.price}/month</strong>.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    You'll be redirected to our secure payment processor to complete your subscription.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {showConfirmDialog.tier.features.slice(0, 4).map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmDialog({ show: false, tier: null, type: 'subscription' })}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={showConfirmDialog.type === 'trial' ? confirmTrial : confirmSubscription}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {showConfirmDialog.type === 'trial' ? (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Start Trial
                  </>
                ) : (
                  <>
                    <CreditCard02 className="w-4 h-4 mr-2" />
                    Continue to Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
