import { describe, test, expect } from "bun:test";
import * as tap from "../../src/brew/tap.ts";

describe("tap.list", () => {
  test("returns array of taps", async () => {
    const result = await tap.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test("each tap has slash-separated format", async () => {
    const result = await tap.list();
    // Taps follow user/repo format
    for (const t of result) {
      expect(t).toContain("/");
    }
  });
});

describe("tap.info", () => {
  test("returns tap info as string", async () => {
    const taps = await tap.list();
    if (taps.length === 0) return;

    const info = await tap.info(taps[0]!);
    expect(typeof info).toBe("string");
    expect(info.length).toBeGreaterThan(0);
  });
});
