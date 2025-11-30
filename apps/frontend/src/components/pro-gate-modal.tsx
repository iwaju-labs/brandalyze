"use client";

import { useRouter } from "next/navigation";
import { LockKeyholeCircle, Zap, ArrowRight } from "@untitledui/icons";

interface ProGateModalProps {
  featureName: string;
}

export function ProGateModal({ featureName }: ProGateModalProps) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-md" />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl max-w-md w-full mx-4 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mb-6">
            <LockKeyholeCircle className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Pro Feature
          </h2>

          <p className="text-gray-600 dark:text-gray-300 mb-6">
            <span className="font-medium">{featureName}</span> is available on the Pro plan. Upgrade to unlock this feature and more.
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={() => router.push("/pricing")}
              className="w-full py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center"
            >
              <Zap className="w-5 h-5 mr-2" />
              Upgrade to Pro
              <ArrowRight className="w-5 h-5 ml-2" />
            </button>

            <button
              onClick={() => router.back()}
              className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-xl font-medium transition-colors"
            >
              Go Back
            </button>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
            Start with a 7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
