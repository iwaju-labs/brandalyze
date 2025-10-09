import { Navbar } from '@/components/navigation/navbar';
import { SignInButton, SignUpButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <main className="mx-auto max-w-7xl px-4 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Keep Your Brand Voice{' '}
            <span className="text-blue-600">Consistent</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Analyze your content against your brand guidelines and get real-time 
            feedback on tone, style, and messaging consistency.
          </p>
          
          <div className="mt-10 flex items-center justify-center gap-x-6">
            {userId ? (
              <Link
                href="/upload"
                className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <button className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 hover:cursor-pointer">
                    Get Started
                  </button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <button className="text-sm hover:cursor-pointer hover:bg-neutral-300/30 font-semibold leading-6 outline-1 text-gray-900 rounded-md p-2">
                    Sign In <span aria-hidden="true"> &#x2192; </span>
                  </button>
                </SignInButton>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
