"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ThemeToggle } from "../theme/theme-toggle";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Settings01, ChevronDown } from "@untitledui/icons";
import { AdminLink } from "./admin-link";

export const Navbar = () => {
  const [toolsOpen, setToolsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-8">
          {/* Free Tools Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setToolsOpen(!toolsOpen)}
              className="flex items-center gap-1 text-neutral-500 dark:text-neutral-300 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
            >
              free tools
              <ChevronDown className={`w-4 h-4 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
            </button>
            {toolsOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2 z-50">
                <Link
                  href="/brand-voice-checker"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  onClick={() => setToolsOpen(false)}
                >
                  Brand Voice Checker
                </Link>
                <Link
                  href="/content-alignment-checker"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  onClick={() => setToolsOpen(false)}
                >
                  Content Alignment Checker
                </Link>
                <Link
                  href="/tweet-audit"
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                  onClick={() => setToolsOpen(false)}
                >
                  Tweet Audit Tool
                </Link>
              </div>
            )}
          </div>
          <Link
            href="/history"
            className="text-neutral-500 dark:text-neutral-300 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            history
          </Link>
          <Link
            href="/analytics"
            className="text-neutral-500 dark:text-neutral-300 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            analytics
          </Link>
          <Link
            href="/pricing"
            className="text-neutral-500 dark:text-neutral-300 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            pricing
          </Link>
          <Link 
            href="https://chromewebstore.google.com/detail/brandalyze-social-media-b/chnffppbmnlchenodfkbldobgmfgpbph"
            className="text-neutral-500 dark:text-neutral-300 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
          >
            download extension
          </Link> 
        </div>
        <div className="flex items-center space-x-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button suppressHydrationWarning className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Sign Up/Sign In
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
              userProfileMode="navigation"
              userProfileUrl="/user-profile"            />
            </div>
                <AdminLink />
                <Link
                  href="/settings"
                  className="text-black dark:text-white hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                >
                  <Settings01 size={20}/>
                </Link>
          </SignedIn>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
};
