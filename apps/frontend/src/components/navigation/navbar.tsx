"use client"

import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export const Navbar = () => {
  const { isSignedIn } = useUser();

  return (
    <nav className="border-b bg-background px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-xl font-bold text-foreground">
          brandalyze.
        </Link>
        
        <div className="flex items-center space-x-4">
          <ThemeToggle />
          {isSignedIn ? (
            <>
              <Link href="/upload" className="text-muted-foreground hover:text-foreground">
                Upload
              </Link>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <button className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </nav>
  );
};
