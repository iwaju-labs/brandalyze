"use client";

import Link from "next/link";

interface FooterProps {
  readonly className?: string;
}

export function Footer({ className = "" }: Readonly<FooterProps>) {
  return (
    <footer
      className={`bg-white dark:bg-black relative z-30 border-t border-gray-200 dark:border-gray-800 transition-colors ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                brandalyze
              </span>
              <span className="text-purple-600 dark:text-purple-400">.</span>
            </Link>
            <p className="text-sm font-mono text-gray-600 dark:text-gray-400 mb-4">
              {">"} AI-powered brand voice consistency analysis
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              © {new Date().getFullYear()} IWAJU LABS
            </p>
          </div>

          {/* Product Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/brand-voice-checker"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Features
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="https://chromewebstore.google.com/detail/brandalyze-social-media-b/chnffppbmnlchenodfkbldobgmfgpbph"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Chrome Extension
                </Link>
              </li>
            </ul>
          </div>

          {/* Free Tools Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Free Tools
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/brand-voice-checker"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Brand Voice Checker
                </Link>
              </li>
              <li>
                <Link
                  href="/content-alignment-checker"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Content Alignment Checker
                </Link>
              </li>
              <li>
                <Link
                  href="/tweet-audit"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Tweet Audit Tool
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/blog"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <span className="text-sm text-gray-400 dark:text-gray-600">
                  Testimonials
                </span>
              </li>
              <li>
                <Link
                  href="mailto:dom@brandalyze.io"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Support
                </Link>
              </li>
              <li>
                <Link
                  href="https://gist.github.com/kiing-dom/ca57c5dc495013ae82e4e3a52075bcfd"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Changelog
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
              Legal
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/privacy"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-xs text-gray-500 dark:text-gray-500">
              contact:{" "}
              <Link
                href="mailto:dom@brandalyze.io"
                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                dom@brandalyze.io
              </Link>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Made with 💜 by{" "}
              <Link
                href="https://x.com/_dngi"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                @_dngi
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
