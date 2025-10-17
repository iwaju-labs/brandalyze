"use client";

import { Moon02, Sun, Monitor01 } from "@untitledui/icons";
import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    if (theme === "dark") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("system");
    } else {
      setTheme("dark");
    }
  };

  let icon;
  if (theme === "dark") {
    icon = <Moon02 className="h-[1.2rem] w-[1.2rem]" />;
  } else if (theme === "light") {
    icon = <Sun className="h-[1.2rem] w-[1.2rem]" />;
  } else if (theme === "system") {
    icon = <Monitor01 className="h-[1.2rem] w-[1.2rem]" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors hover:cursor-pointer hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label="Toggle theme"
    >
      {icon}
    </button>
  );
}
