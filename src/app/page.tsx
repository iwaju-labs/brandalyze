import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Brandalyze - Something New is Coming",
  description:
    "Brandalyze is being rebuilt from the ground up. Stay tuned.",
  openGraph: {
    title: "Brandalyze - Something New is Coming",
    description: "Brandalyze is being rebuilt from the ground up. Stay tuned.",
    type: "website",
    url: "https://brandalyze.io",
  },
  alternates: {
    canonical: "https://brandalyze.io",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black text-gray-900 dark:text-white transition-colors flex items-center justify-center">
      <main className="text-center px-4 max-w-2xl mx-auto">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-4">
          <span className="text-gray-900 dark:text-white">brandalyze</span>
          <span className="text-purple-600 dark:text-purple-400">.</span>
        </h1>

        <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 font-mono mb-8">
          something new is coming.
        </p>

        <p className="text-gray-500 dark:text-gray-400 mb-12 max-w-md mx-auto">
          I&apos;m rebuilding Brandalyze from the ground up. If you&apos;re an existing user, your account is safe.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="https://x.com/_dngi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors font-mono"
          >
            follow updates @_dngi
          </Link>
        </div>
      </main>
    </div>
  );
}
