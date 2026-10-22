"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type Preference = Theme | "system";
const ThemeContext = createContext<{ theme: Theme; preference: Preference; setPreference: (value: Preference) => void }>({
  theme: "dark", preference: "system", setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [preference, setPreferenceState] = useState<Preference>("system");

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    function apply() {
      let saved: string | null = null;
      try { saved = localStorage.getItem("foxey-theme"); } catch {}
      const choice = saved === "light" || saved === "dark" ? saved : "system";
      const resolved = choice === "system" ? (media.matches ? "dark" : "light") : choice;
      document.documentElement.dataset.theme = resolved;
      setPreferenceState(choice);
      setTheme(resolved);
    }
    apply();
    media.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    window.addEventListener("foxey-theme-change", apply);
    return () => {
      media.removeEventListener("change", apply);
      window.removeEventListener("storage", apply);
      window.removeEventListener("foxey-theme-change", apply);
    };
  }, []);

  function setPreference(value: Preference) {
    const resolved = value === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : value;
    try { localStorage.setItem("foxey-theme", value); } catch {}
    document.documentElement.dataset.theme = resolved;
    setPreferenceState(value);
    setTheme(resolved);
  }

  return <ThemeContext.Provider value={{ theme, preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }

export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <label className="theme-control">
      <span aria-hidden="true">◐</span>
      <span className="sr-only">Color theme</span>
      <select aria-label="Color theme" value={preference} onChange={(event) => setPreference(event.target.value as Preference)}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
