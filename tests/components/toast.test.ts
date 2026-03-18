import { describe, test, expect } from "bun:test";

type ToastType = "success" | "error" | "info";

function toastIcon(type: ToastType): string {
  switch (type) {
    case "success": return "\u2713";
    case "error": return "\u2717";
    case "info": return "i";
  }
}

function toastDuration(type: ToastType): number {
  return type === "error" ? 5000 : 3000;
}

const TOAST_MAX_WIDTH = 60;
const ICON_OVERHEAD = 3;

function formatToastText(text: string): string {
  const maxTextLen = TOAST_MAX_WIDTH - ICON_OVERHEAD - 4;
  if (text.length > maxTextLen) {
    return text.slice(0, maxTextLen - 3) + "...";
  }
  return text;
}

function computeToastWidth(text: string): number {
  const formatted = formatToastText(text);
  return Math.min(formatted.length + ICON_OVERHEAD + 4, TOAST_MAX_WIDTH);
}

function computeMarginLeft(terminalWidth: number, toastWidth: number): number {
  return Math.max(0, Math.floor((terminalWidth - toastWidth) / 2));
}

describe("toastIcon", () => {
  test("success returns checkmark", () => {
    expect(toastIcon("success")).toBe("\u2713");
  });
  test("error returns cross", () => {
    expect(toastIcon("error")).toBe("\u2717");
  });
  test("info returns i", () => {
    expect(toastIcon("info")).toBe("i");
  });
});

describe("toastDuration", () => {
  test("error is 5 seconds", () => {
    expect(toastDuration("error")).toBe(5000);
  });
  test("success is 3 seconds", () => {
    expect(toastDuration("success")).toBe(3000);
  });
  test("info is 3 seconds", () => {
    expect(toastDuration("info")).toBe(3000);
  });
});

describe("formatToastText", () => {
  test("short text unchanged", () => {
    expect(formatToastText("hello")).toBe("hello");
  });
  test("long text truncated with ellipsis", () => {
    const long = "a".repeat(100);
    const result = formatToastText(long);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(TOAST_MAX_WIDTH - ICON_OVERHEAD - 4);
  });
});

describe("computeToastWidth", () => {
  test("short text width includes overhead", () => {
    const w = computeToastWidth("OK");
    expect(w).toBe("OK".length + ICON_OVERHEAD + 4);
  });
  test("never exceeds max width", () => {
    const w = computeToastWidth("a".repeat(200));
    expect(w).toBeLessThanOrEqual(TOAST_MAX_WIDTH);
  });
});

describe("computeMarginLeft", () => {
  test("centers toast in terminal", () => {
    expect(computeMarginLeft(100, 40)).toBe(30);
  });
  test("handles narrow terminal", () => {
    expect(computeMarginLeft(30, 40)).toBe(0);
  });
});
