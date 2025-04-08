// components/theme-toggle.tsx
"use client";

import * as React from "react";
import { FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative rounded-md p-2 hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "light" && (
        <FaSun className={`h-5 w-5 dark:scale-0 scale-100`} />
      )}
      {theme === "dark" && (
        <FaMoon className={`h-5 w-5 scale-0 dark:scale-100`} />
      )}
    </button>
  );
}
