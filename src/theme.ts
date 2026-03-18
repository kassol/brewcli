// Color theme and style constants

export type ColorScheme = "dark" | "light";

/**
 * Detect whether the terminal has a light background.
 *
 * Heuristics (checked in order):
 * 1. BREWCLI_THEME env – explicit override ("light" | "dark")
 * 2. COLORFGBG env – "<fg>;<bg>", bg 7 or 9-15 = light background
 * 3. Default to dark (most modern terminals)
 */
function detectColorScheme(): ColorScheme {
  const explicit = process.env["BREWCLI_THEME"];
  if (explicit === "light") return "light";
  if (explicit === "dark") return "dark";

  const colorfgbg = process.env["COLORFGBG"];
  if (colorfgbg) {
    const parts = colorfgbg.split(";");
    const bg = Number(parts[parts.length - 1]);
    // 7 = white (light), 8 = bright black (dark), 9-15 = bright colors (light)
    if (!Number.isNaN(bg) && (bg === 7 || bg >= 9)) return "light";
    if (!Number.isNaN(bg)) return "dark";
  }

  return "dark";
}

// Catppuccin Mocha (dark)
const darkColors = {
  primary: "#89B4FA",
  success: "#A6E3A1",
  warning: "#F9E2AF",
  error: "#F38BA8",
  muted: "#6C7086",
  text: "#CDD6F4",
  subtext: "#A6ADC8",
  accent: "#89DCEB",
  surface: "#313244",
  highlight: "#45475A",
  pink: "#F5C2E7",
  peach: "#FAB387",
  teal: "#94E2D5",
  lavender: "#B4BEFE",
} as const;

// Catppuccin Latte (light) – designed for white/light backgrounds
const lightColors = {
  primary: "#1E66F5",   // Blue
  success: "#40A02B",   // Green
  warning: "#DF8E1D",   // Yellow
  error: "#D20F39",     // Red
  muted: "#9CA0B0",     // Overlay 0
  text: "#4C4F69",      // Text
  subtext: "#6C6F85",   // Subtext 0
  accent: "#04A5E5",    // Sky
  surface: "#E6E9EF",   // Mantle
  highlight: "#CCD0DA", // Surface 0
  pink: "#EA76CB",      // Pink
  peach: "#FE640B",     // Peach
  teal: "#179299",      // Teal
  lavender: "#7287FD",  // Lavender
} as const;

export interface Colors {
  readonly primary: string;
  readonly success: string;
  readonly warning: string;
  readonly error: string;
  readonly muted: string;
  readonly text: string;
  readonly subtext: string;
  readonly accent: string;
  readonly surface: string;
  readonly highlight: string;
  readonly pink: string;
  readonly peach: string;
  readonly teal: string;
  readonly lavender: string;
}

export const colorScheme: ColorScheme = detectColorScheme();
export const colors: Colors = colorScheme === "light" ? lightColors : darkColors;

export const symbols = {
  pointer: ">",
  dot: "*",
  check: "[ok]",
  cross: "[x]",
  warning: "[!]",
  pin: "[pin]",
  arrow: "->",
  treeT: "+-",
  treeL: "\\-",
  treeI: "| ",
  treeSp: "  ",
  border: {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    horizontal: "-",
    vertical: "|",
  },
} as const;

export const SIDEBAR_WIDTH = 24;
export const STATUS_BAR_HEIGHT = 1;
export const MIN_TERMINAL_WIDTH = 80;
export const MIN_TERMINAL_HEIGHT = 20;
