"use client";

import Link from "next/link";
import { ThemeToggle } from "../theme/theme-toggle";

export const Navbar = () => {
  return (
    <nav className="relative z-50 bg-white dark:bg-black px-4 py-3 border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white">
          <span>brandalyze</span>
          <span className="text-purple-600 dark:text-purple-400">.</span>
        </Link>
        <div className="flex items-center space-x-4"></div>
        <ThemeToggle />
      </div>
    </nav>
  );
};
