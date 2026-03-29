import { describe, test, expect } from "bun:test";
import * as cleanup from "../../src/brew/cleanup.ts";

describe("cleanup.cacheSize", () => {
  test("returns a string representing cache size", async () => {
    const result = await cleanup.cacheSize();
    expect(typeof result).toBe("string");
    // Should be something like "1.2G" or "234M" or "unknown"
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("cleanup.cleanAll (dry-run)", () => {
  test("dry-run returns output without actually cleaning", async () => {
    const result = await cleanup.cleanAll(true);
    expect(typeof result).toBe("string");
  }, 30_000);
});
