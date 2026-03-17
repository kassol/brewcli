import { describe, test, expect } from "bun:test";

// Test the pad utility function used by Table
// We extract and test the logic since testing React components requires a render environment

function pad(text: string, width: number, align: "left" | "right" = "left"): string {
  if (text.length >= width) return text.slice(0, width);
  const padding = " ".repeat(width - text.length);
  return align === "right" ? padding + text : text + padding;
}

describe("pad", () => {
  test("left-pads text to desired width", () => {
    expect(pad("hello", 10)).toBe("hello     ");
  });

  test("right-pads text to desired width", () => {
    expect(pad("hello", 10, "right")).toBe("     hello");
  });

  test("truncates text that exceeds width", () => {
    expect(pad("hello world", 5)).toBe("hello");
  });

  test("returns text unchanged when exact width", () => {
    expect(pad("hello", 5)).toBe("hello");
  });

  test("handles empty string", () => {
    expect(pad("", 5)).toBe("     ");
  });

  test("handles zero width", () => {
    expect(pad("hello", 0)).toBe("");
  });
});

// Test scroll offset calculation logic
function calcScrollOffset(
  selectedIndex: number,
  dataLength: number,
  visibleRows: number,
): number {
  if (dataLength <= visibleRows) return 0;
  const half = Math.floor(visibleRows / 2);
  if (selectedIndex <= half) return 0;
  if (selectedIndex >= dataLength - visibleRows + half) {
    return Math.max(0, dataLength - visibleRows);
  }
  return selectedIndex - half;
}

describe("calcScrollOffset", () => {
  test("returns 0 when all data fits", () => {
    expect(calcScrollOffset(0, 5, 10)).toBe(0);
    expect(calcScrollOffset(3, 5, 10)).toBe(0);
  });

  test("returns 0 at the beginning", () => {
    expect(calcScrollOffset(0, 100, 20)).toBe(0);
    expect(calcScrollOffset(5, 100, 20)).toBe(0);
  });

  test("centers cursor in middle of list", () => {
    const offset = calcScrollOffset(50, 100, 20);
    expect(offset).toBe(40); // 50 - 10 = 40
  });

  test("stops at end of list", () => {
    const offset = calcScrollOffset(99, 100, 20);
    expect(offset).toBe(80); // 100 - 20 = 80
  });

  test("handles single visible row", () => {
    const offset = calcScrollOffset(5, 10, 1);
    expect(offset).toBe(5);
  });
});
