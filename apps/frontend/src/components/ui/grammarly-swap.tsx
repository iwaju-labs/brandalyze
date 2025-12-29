"use client";

import { useState, useEffect } from "react";
import { SiGrammarly } from "react-icons/si";

export default function GrammarlySwap() {
  const [showIcon, setShowIcon] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowIcon((prev) => !prev);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-flex items-center justify-center relative w-[110px] h-[1.2em] align-middle">
      <span
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-in-out ${
          showIcon
            ? "opacity-0 scale-75 rotate-12"
            : "opacity-100 scale-100 rotate-0"
        }`}
      >
        Grammarly
      </span>
      <SiGrammarly
        className={`absolute transition-all duration-500 ease-in-out text-2xl ${
          showIcon
            ? "opacity-100 scale-100 rotate-0"
            : "opacity-0 scale-75 -rotate-12"
        }`}
      />
    </span>
  );
}
