import React, { createContext, useContext, useState, useMemo, useCallback } from "react";
import type { Colors, ColorScheme } from "../theme.ts";
import { darkColors, lightColors, detectColorScheme } from "../theme.ts";

interface ThemeContextValue {
  colors: Colors;
  colorScheme: ColorScheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(detectColorScheme);

  const toggleTheme = useCallback(() => {
    setColorScheme((s) => (s === "dark" ? "light" : "dark"));
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
