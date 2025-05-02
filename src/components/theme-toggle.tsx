"use client";

import { FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setTheme("dark");
  }, []);

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 hover:scale-110 hover:shadow-md"
      aria-label="Toggle theme"
      style={{
        backgroundColor: theme === "dark" ? "#3a4353" : "#eef3f6",
        color: theme === "dark" ? "#f7fafc" : "#1a202c",
      }}
    >
      {theme === "light" && (
        <FaMoon className="h-5 w-5 transition-transform duration-300" />
      )}
      {theme === "dark" && (
        <FaSun className="h-5 w-5 transition-transform duration-300" />
      )}
    </button>
  );
}
