"use client"

import { UserButton, SignInButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export const Navbar = () => {
  const { isSignedIn } = useUser();

  return (
    <nav className="border-b bg-white px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">
          brandalyze.
        </Link>
        
        <div className="flex items-center space-x-4">
          {isSignedIn ? (
            <>
              <Link href="/upload" className="text-gray-600 hover:text-gray-900">
                Upload
              </Link>
              <Link href="/analyze" className="text-gray-600 hover:text-gray-900">
                Analyze
              </Link>
              <UserButton />
            </>
          ) : (
            <SignInButton mode="modal">
              <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
                Sign In
              </button>
            </SignInButton>
          )}
        </div>
      </div>
    </nav>
  );
};
