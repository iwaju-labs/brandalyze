export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white">
      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            <span className="text-gray-900 dark:text-white">
              Simple Pricing
            </span>
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the plan that works best for your brand consistency needs.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-gray-50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Starter
            </h3>
            <div className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              Free
            </div>
            <ul className="text-left space-y-3 mb-8 text-gray-600 dark:text-gray-400">
              <li>• Up to 5 brand samples</li>
              <li>• 3 analyses per day</li>
              <li>• Basic AI feedback</li>
              <li>• Community support</li>
            </ul>
            <button className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors">
              Get Started
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-purple-50 dark:bg-purple-900/20 backdrop-blur-sm border-2 border-purple-500 rounded-lg p-8 text-center relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-purple-600 text-white px-3 py-1 text-sm font-medium rounded-full">
                Most Popular
              </span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Professional
            </h3>
            <div className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              $19<span className="text-lg font-normal">/mo</span>
            </div>
            <ul className="text-left space-y-3 mb-8 text-gray-600 dark:text-gray-400">
              <li>• Unlimited brand samples</li>
              <li>• 50 analyses per day</li>
              <li>• Advanced AI feedback</li>
              <li>• Priority email support</li>
              <li>• Export reports</li>
            </ul>
            <button className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors">
              Start Free Trial
            </button>
          </div>

          {/* Enterprise Plan */}
          <div className="bg-gray-50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-lg p-8 text-center">
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Enterprise
            </h3>
            <div className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">
              $99<span className="text-lg font-normal">/mo</span>
            </div>
            <ul className="text-left space-y-3 mb-8 text-gray-600 dark:text-gray-400">
              <li>• Everything in Pro</li>
              <li>• Unlimited analyses</li>
              <li>• Custom integrations</li>
              <li>• Priority support</li>
              <li>• Team management</li>
            </ul>
            <button className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors">
              Get Started
            </button>
          </div>
        </div>
        <div className="mt-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            All paid plans include 14-day free trial. No credit card required.
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Questions? Email me at hello@brandalyze.com
          </p>
        </div>
      </main>
    </div>
  );
}
