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
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="inline-block">
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                brandalyze
              </span>
              <span className="text-purple-600 dark:text-purple-400">.</span>
            </Link>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              © {new Date().getFullYear()} IWAJU LABS
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="mailto:dom@brandalyze.io"
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              dom@brandalyze.io
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
