"use client";

import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export const Navbar = () => {
  const { isSignedIn } = useUser();
  return (
    <nav className="navbar-bg px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">        <Link href="/" className="text-xl font-bold">
          <span className="navbar-text">brandalyze</span>
          <span className="landing-purple-primary">.</span>
        </Link>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          {isSignedIn ? (
            <>              <Link
                href="/analyze"
                className="navbar-link font-medium"
              >
                Analyze
              </Link>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <button className="rounded bg-purple-600 hover:bg-purple-700 px-4 py-2 text-white font-medium transition-colors">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </nav>
  );
};
