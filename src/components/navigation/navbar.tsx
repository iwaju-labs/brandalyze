"use client";

import Link from "next/link";
import { ThemeToggle } from "../theme/theme-toggle";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";

export const Navbar = () => {
  return (
    <nav className="relative z-50 bg-white dark:bg-black px-4 py-3 border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold text-gray-900 dark:text-white"
        >
          <span>brandalyze</span>
          <span className="text-purple-600 dark:text-purple-400">.</span>
        </Link>
        <div className="flex items-center space-x-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button suppressHydrationWarning className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div suppressHydrationWarning>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8",
                    userButtonPopoverMain: "bg-white dark:bg-black dark:text-white",
                    userButtonPopoverCard: "bg-white dark:bg-black border border-gray-200 dark:border-gray-700",
                    userButtonPopoverActions: "bg-white dark:bg-black",
                    userButtonPopoverActionButton: "text-gray-900 dark:text-white [&_*]:text-gray-900 [&_*]:dark:text-white",
                    userPreviewSecondaryIdentifier: "dark:text-white",
                  },
                }}
              />
            </div>
          </SignedIn>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};
