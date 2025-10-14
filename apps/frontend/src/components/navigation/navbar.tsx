"use client";

import Link from "next/link";

export const Navbar = () => {
  return (
    <nav className="navbar-bg px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {" "}
        <Link href="/" className="text-xl font-bold">
          <span className="navbar-text">brandalyze</span>
          <span className="landing-purple-primary">.</span>
        </Link>
        <div className="flex items-center space-x-4">
        </div>
      </div>
    </nav>
  );
};
