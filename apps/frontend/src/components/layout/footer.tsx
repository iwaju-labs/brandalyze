"use client";

import Link from "next/link";

interface FooterProps {
  readonly className?: string;
}

export function Footer({ className = "" }: Readonly<FooterProps>) {
  return (
    <footer
      className={`bg-gray-50/80 dark:bg-black relative z-30 border-t border-gray-200 dark:border-gray-800 backdrop-blur-sm transition-colors ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">
          <div className="mb-4">
            <Link href="/" className="inline-block">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                brandalyze
              </span>
              <span className="text-purple-600 dark:text-purple-400">.</span>
            </Link>
          </div>
          <p className="text-sm mb-4 font-mono text-gray-600 dark:text-gray-400">
            {">"} AI-powered brand voice consistency analysis
          </p>
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500 dark:text-gray-500">
            <span>© {new Date().getFullYear()} IWAJU LABS</span>
            <span>•</span>
            <Link
              href="/privacy"
              className="hover:opacity-80 transition-opacity"
            >
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:opacity-80 transition-opacity">
              Terms of Service
            </Link>
            <span>•</span>
            <Link
              href="mailto:dom@brandalyze.io"
            >
              Support - dom@brandalyze.io
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
