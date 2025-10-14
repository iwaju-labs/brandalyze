import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import AsciiGifEffect from '@/components/effects/ascii-gif-effect';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { Zap, BarChart02, Target01 } from '@untitledui/icons';

export default async function HomePage() {
  const { userId } = await auth();
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white relative overflow-hidden transition-colors">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      
      {/* ASCII Effect Background covering the entire hero - only in dark mode */}
      <div className="absolute inset-0 z-0 dark:block hidden">
        <AsciiGifEffect className="opacity-15" />
      </div>
      
      {/* Dark overlay with gradient for better text readability - only in dark mode */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 z-10 dark:block hidden" />
      
      <main className="relative z-20 mx-auto max-w-7xl px-4 py-16 min-h-screen flex items-center">
        <div className="text-center w-full">          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-sm font-mono rounded-full border border-purple-500/30 mb-6">
              AI-Powered Brand Analysis
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-gray-900 dark:text-white">brandalyze</span>
              <span className="text-purple-600 dark:text-purple-400">.</span>
            </h1>
              <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4 font-mono">
              {">"} Ensure your content stays on-brand
            </p>
            
            <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Upload your brand samples, analyze new content, and get AI-powered feedback 
              on tone, style, and messaging consistency. Keep your brand voice unified across all channels.
            </p>
          </div>

          <div className="space-y-6">            {userId ? (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/analyze"
                  className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25"
                >
                  Launch Analyzer →
                </Link>
                <Link
                  href="/analyze"
                  className="w-full sm:w-auto px-8 py-4 border border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-semibold rounded-lg transition-all duration-200"
                >
                  View Dashboard
                </Link>
              </div>
            ) : (              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6 max-w-md mx-auto shadow-2xl">
                  <div className="text-center mb-4">
                    <div className="inline-block px-3 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-mono rounded-full border border-purple-500/30 mb-2">
                      LAUNCHING SOON
                    </div>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Early Access</h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                      Be the first to know when we launch. Get exclusive early access, beta features, and special pricing.
                    </p>
                  </div>
                  <a
                    href="https://tally.so/r/mYaP4Q"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg hover:shadow-purple-500/25"
                  >
                    Join Waitlist →
                  </a>
                </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <SignUpButton mode="modal">
                    <button className="w-full sm:w-auto px-8 py-4 bg-purple-500/20 border border-purple-500/50 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30 font-semibold rounded-lg transition-all duration-200">
                      Try Demo
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button className="w-full sm:w-auto px-8 py-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold transition-all duration-200">
                      Sign In →
                    </button>
                  </SignInButton>
                </div>
              </div>
            )}
          </div>          {/* Feature highlights */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
              <div className="flex justify-center mb-3">
                <Zap className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2 font-mono">AI Analysis</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Advanced AI compares your content against brand samples using semantic understanding
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
              <div className="flex justify-center mb-3">
                <BarChart02 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2 font-mono">Alignment Score</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Get precise 0-100 brand alignment scores with detailed feedback and reasoning
              </p>
            </div>
            <div className="text-center p-6 bg-gray-50 dark:bg-gray-900/30 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800 transition-colors">
              <div className="flex justify-center mb-3">
                <Target01 className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-gray-900 dark:text-white font-semibold mb-2 font-mono">Actionable Insights</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                Receive specific suggestions to improve brand consistency and messaging
              </p>
            </div>
          </div>          {/* Tech stack indicator */}
          <div className="mt-16 text-center">
            <p className="text-gray-500 dark:text-gray-500 text-xs font-mono mb-2">POWERED BY</p>
            <div className="flex items-center justify-center space-x-6 text-gray-600 dark:text-gray-600">
              <span className="text-sm">OpenAI GPT-4</span>
              <span className="text-gray-400 dark:text-gray-800">•</span>
              <span className="text-sm">Next.js</span>
              <span className="text-gray-400 dark:text-gray-800">•</span>
              <span className="text-sm">Django</span>
              <span className="text-gray-400 dark:text-gray-800">•</span>
              <span className="text-sm">Three.js</span>
            </div>
          </div>
        </div>
      </main>      {/* Footer */}
      <footer className="relative z-30 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-black/50 backdrop-blur-sm transition-colors">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <div className="text-center">
            <div className="mb-4">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">brandalyze</span>
              <span className="text-purple-600 dark:text-purple-400">.</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 font-mono">
              {">"} AI-powered brand voice consistency analysis
            </p>
            <div className="flex items-center justify-center space-x-6 text-gray-500 dark:text-gray-500 text-xs">
              <span>© 2025 Brandalyze</span>
              <span>•</span>
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
