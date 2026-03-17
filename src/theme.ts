// Color theme and style constants

export const colors = {
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
