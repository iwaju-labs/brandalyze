"use client";

import { useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { authenticatedFetch } from "../../../lib/api";
import toast from "react-hot-toast";
import {
  CheckCircle,
  CreditCard02,
  Zap,
  Laptop02,
  ArrowRight,
  Building07,
} from "@untitledui/icons";

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
      "Manual Input for brand samples",
      "Community support",
    ],
    buttonText: "Get Started Free",
    popular: false,
    stripeId: null,
    icon: Laptop02,
  },
  {
    name: "Pro",
    price: 9.49,
    billing: "month",
    description: "For independent creators and agencies",
    features: [
      "50 analyses per day",
      "Unlimited brand samples",
      "Advanced AI insights",
      "Access to the browser extension",
      "Social-media profile analysis",
      "Audit history dashboard",
      "Analytics and trends",
      "Export results to CSV/JSON",
      "Priority support",
      "7-day free trial",
    ],
    buttonText: "Start Free Trial",
    popular: true,
    stripeId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    icon: Zap,
  },
  {
    name: "Enterprise",
    price: null,
    billing: null,
    description: "For large teams and organizations",
    features: [
      "Unlimited analyses",
      "Unlimited brand samples",
      "Custom AI models",
      "Dedicated support",
      "API access",
      "Multi-account support",
      "Export results to CSV/JSON/PDF",
      "Everything in previous tiers",
    ],
    buttonText: "Contact Us",
    popular: false,
    stripeId: null,
    icon: Building07,
  },
];

export default function PricingPage() {
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{
    show: boolean;
    tier: (typeof pricingTiers)[0] | null;
    type: "trial" | "subscription";
  }>({ show: false, tier: null, type: "subscription" });
  const [hasUsedTrial, setHasUsedTrial] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSignedIn) return;

    const fetchTrialStatus = async () => {
      try {
        const response = await authenticatedFetch(
          "/payments/check-trial-status",
          getToken
        );
        setHasUsedTrial(response.data.has_used_trial);
      } catch (error) {
        console.error("Failed to fetch trial status:", error);
        setHasUsedTrial(null);
      }
    };

    fetchTrialStatus();
  }, [isSignedIn, getToken]);

  const handleSubscribe = async (tier: (typeof pricingTiers)[0]) => {
    if (!isSignedIn) {
      toast.error("Please sign in to subscribe");
      router.push("/sign-in");
      return;
    }

    if (tier.name === "Free") {
      router.push("/brand-voice-checker");
      return;
    }

    // Show confirmation dialog instead of proceeding directly
    setShowConfirmDialog({
      show: true,
      tier,
      type: "subscription",
    });
  };

  const confirmSubscription = async () => {
    const tier = showConfirmDialog.tier;
    if (!tier || !tier.stripeId) {
      toast.error("Invalid subscription plan");
      return;
    }

    setIsLoading(tier.name);
    setShowConfirmDialog({ show: false, tier: null, type: "subscription" });

    try {
      const response = await authenticatedFetch(
        "/payments/create-checkout-session/",
        getToken,
        {
          method: "POST",
          body: JSON.stringify({
            price_id: tier.stripeId,
          }),
        }
      );

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
      tier: pricingTiers.find((t) => t.name === "Pro") || null,
      type: hasUsedTrial ? "subscription" : "trial",
    });
  };
  const confirmTrial = async () => {
    setIsLoading("trial");
    setShowConfirmDialog({ show: false, tier: null, type: "subscription" });

    try {
      const response = await authenticatedFetch(
        "/payments/start-trial/",
        getToken,
        {
          method: "POST",
        }
      );

      if (response.data?.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.checkout_url;
      } else {
        toast.success("🎉 Free trial started! Enjoy Pro features for 7 days.");
        router.push("/brand-voice-checker");
      }
    } catch (error) {
      console.error("Trial error:", error);
      toast.error(
        "Failed to start trial. You may have already used your trial."
      );
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-[84vh] bg-white dark:bg-black py-4">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 mt-2">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Unlock the full potential of AI-powered brand analysis
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto items-center">
          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 rounded-lg w-full">
          {pricingTiers.map((tier) => {
            const IconComponent = tier.icon;
            return (
              <div
                key={tier.name}
                className={`relative rounded-2xl border-2 p-5 ${
                  tier.popular
                    ? "border-purple-500 shadow-2xl scale-105 bg-white dark:bg-gray-900"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-black dark:bg-purple-800 text-white px-6 py-2 rounded-full text-sm font-semibold shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <div className="w-10 h-10 bg-transparent dark:bg-transparent rounded-lg flex items-center justify-center mx-auto">
                    <IconComponent className="w-5 h-5 text-purple-600" />
                  </div>

                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    {tier.name}
                  </h3>

                  <div className="mb-3">
                    {tier.price !== null ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                          ${tier.price}
                        </span>
                        {tier.price > 0 && tier.billing && (
                          <span className="text-gray-600 dark:text-gray-300 text-sm">
                            /{tier.billing}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        Custom Pricing
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {tier.description}
                  </p>
                </div>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>{" "}
                <button
                  onClick={() => {
                    if (tier.name === "Enterprise") {
                      window.location.href = "mailto:dom@brandalyze.io?subject=Enterprise%20Plan%20Inquiry";
                      return;
                    }
                    if (tier.name === "Pro") {
                      if (hasUsedTrial) {
                        handleSubscribe(tier);
                      } else {
                        startTrial();
                      }
                    } else {
                      handleSubscribe(tier);
                    }
                  }}
                  disabled={
                    isLoading === tier.name ||
                    isLoading === "trial" ||
                    (tier.name === "Pro" && isSignedIn && hasUsedTrial === null)
                  }
                  className={`w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center text-sm ${
                    tier.popular
                      ? "bg-purple-700 dark:bg-black text-white shadow-lg hover:shadow-xl"
                      : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                  } ${
                    isLoading === tier.name ||
                    isLoading === "trial" ||
                    (tier.name === "Pro" && isSignedIn && hasUsedTrial === null)
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {" "}
                  {isLoading === tier.name || isLoading === "trial" ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Processing...
                    </div>
                  ) : tier.name === "Pro" &&
                    isSignedIn &&
                    hasUsedTrial === null ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      ...
                    </div>
                  ) : (
                    <>
                      {tier.name === "Free" ? (
                        <>
                          <Laptop02 className="w-4 h-4 mr-2" />
                          {tier.buttonText}
                        </>
                      ) : tier.name === "Enterprise" ? (
                        <>
                          <Building07 className="w-4 h-4 mr-2" />
                          {tier.buttonText}
                        </>
                      ) : (
                        <>
                          <CreditCard02 className="w-4 h-4 mr-2" />
                          {hasUsedTrial ? "Subscribe Now" : tier.buttonText}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </>
                  )}
                </button>
                {tier.name === "Pro" && !hasUsedTrial && isSignedIn && (
                  <button
                    onClick={() => handleSubscribe(tier)}
                    disabled={isLoading === tier.name}
                    className="w-full mt-2 py-2 px-6 rounded-xl font-medium transition-all duration-200 flex items-center justify-center text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <CreditCard02 className="w-4 h-4 mr-2" />
                    Skip Trial, Subscribe Now
                  </button>
                )}
              </div>
            );
          })}
          </div>

          {/* Trust Indicators - Right Side */}
          <div className="lg:w-64 flex-shrink-0 flex flex-col justify-center space-y-6">
            <div className="text-center lg:text-left">
              <p className="text-gray-500 dark:text-gray-400 mb-4 font-medium">
                All paid plans include a 7-day free trial. Cancel anytime.
              </p>

              <div className="flex flex-col gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center justify-center lg:justify-start">
                  <Laptop02 className="w-5 h-5 mr-3 text-purple-600" />
                  <span>Secure Payments</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start">
                  <CreditCard02 className="w-5 h-5 mr-3 text-purple-600" />
                  <span>No Setup Fees</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start">
                  <CheckCircle className="w-5 h-5 mr-3 text-green-500" />
                  <span>Cancel Anytime</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Questions/Issues? <br className="hidden lg:block" />
                  Email me at{" "}
                  <a
                    href="mailto:dom@brandalyze.io"
                    className="text-purple-600 hover:text-purple-700 font-medium"
                  >
                    dom@brandalyze.io
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog.show && showConfirmDialog.tier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mr-4">
                {showConfirmDialog.type === "trial" ? (
                  <Zap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                ) : (
                  <CreditCard02 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {showConfirmDialog.type === "trial"
                    ? "Start Free Trial"
                    : `Subscribe to ${showConfirmDialog.tier.name}`}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {showConfirmDialog.type === "trial"
                    ? "Confirm your 7-day free trial"
                    : "Confirm your subscription"}
                </p>
              </div>
            </div>

            <div className="mb-6">
              {showConfirmDialog.type === "trial" ? (
                <div>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    You&apos;re about to start a{" "}
                    <strong>7-day free trial</strong> of the Pro plan.
                    You&apos;ll get:
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
                    You&apos;re about to subscribe to the{" "}
                    <strong>{showConfirmDialog.tier.name} plan</strong> for{" "}
                    <br />
                    <strong>${showConfirmDialog.tier.price}/month</strong>.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    You&apos;ll be redirected to our secure payment processor to
                    complete your subscription.
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {showConfirmDialog.tier.features
                      .slice(0, 4)
                      .map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() =>
                  setShowConfirmDialog({
                    show: false,
                    tier: null,
                    type: "subscription",
                  })
                }
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={
                  showConfirmDialog.type === "trial"
                    ? confirmTrial
                    : confirmSubscription
                }
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                {showConfirmDialog.type === "trial" ? (
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
