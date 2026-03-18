import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { Colors, ColorScheme } from "../theme.ts";
import { darkColors, lightColors } from "../theme.ts";
import { getTheme, setTheme as persistTheme } from "../config.ts";

interface ThemeContextValue {
  colors: Colors;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getTheme);

  const toggleTheme = useCallback(() => {
    setColorScheme((s) => {
      const next = s === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      colors: colorScheme === "light" ? lightColors : darkColors,
      colorScheme,
      toggleTheme,
    }),
    [colorScheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
