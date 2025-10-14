"use client";

import Link from 'next/link';

interface FooterProps {
  className?: string;
  variant?: 'default' | 'landing';
}

export function Footer({ className = "", variant = "default" }: FooterProps) {
  const isLanding = variant === 'landing';
  
  return (
    <footer className={`footer-bg relative z-30 border-t backdrop-blur-sm ${className}`}>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="text-center">
          <div className="mb-4">
            <Link href="/" className="inline-block">
              <span className={`text-2xl font-bold ${isLanding ? 'landing-text-primary' : 'navbar-text'}`}>
                brandalyze
              </span>
              <span className="landing-purple-primary">.</span>
            </Link>
          </div>
          <p className={`text-sm mb-4 font-mono ${isLanding ? 'landing-text-secondary' : 'navbar-link'}`}>
            {">"} AI-powered brand voice consistency analysis
          </p>
          <div className={`flex items-center justify-center space-x-6 text-xs ${isLanding ? 'landing-text-muted' : 'navbar-link'}`}>
            <span>© {new Date().getFullYear()} IWAJU LABS</span>
            <span>•</span>
            <Link href="/privacy" className="hover:opacity-80 transition-opacity">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:opacity-80 transition-opacity">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
