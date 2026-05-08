"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

const THEMES = [
  { label: "ProofPlay", value: "proofplay" },
  { label: "Arcade", value: "arcade" },
  { label: "Field Guide", value: "field-guide" },
] as const;

type ThemeValue = (typeof THEMES)[number]["value"];

const STORAGE_KEY = "proofplay-theme";

export default function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeValue>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleChange = (value: ThemeValue) => {
    setTheme(value);
    window.localStorage.setItem(STORAGE_KEY, value);
    applyTheme(value);
  };

  return (
    <label className="inline-flex items-center gap-1.5 rounded-full border-2 border-[var(--color-primary-900)] bg-white/85 px-2.5 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_var(--color-primary-900)] backdrop-blur-sm">
      <Palette size={compact ? 12 : 14} className="shrink-0" />
      <span className={compact ? "sr-only" : "hidden sm:inline"}>Theme</span>
      <select
        value={theme}
        onChange={(event) => handleChange(event.target.value as ThemeValue)}
        className="max-w-28 bg-transparent text-[11px] font-bold outline-none sm:max-w-none sm:text-xs"
        aria-label="Theme"
      >
        {THEMES.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function applyTheme(theme: ThemeValue) {
  const root = document.documentElement;

  if (theme === "proofplay") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

function getStoredTheme(): ThemeValue {
  if (typeof window === "undefined") return "proofplay";

  const savedTheme = window.localStorage.getItem(STORAGE_KEY);
  const matchedTheme = THEMES.find((item) => item.value === savedTheme);
  if (!matchedTheme) window.localStorage.setItem(STORAGE_KEY, "proofplay");

  return matchedTheme?.value ?? "proofplay";
}
