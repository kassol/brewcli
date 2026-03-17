import { describe, test, expect } from "bun:test";
import * as search from "../../src/brew/search.ts";

describe("search.search", () => {
  test("returns empty array for empty term", async () => {
    const result = await search.search("");
    expect(result).toEqual([]);
  });

  test("returns empty array for single-char term", async () => {
    const result = await search.search("a");
    expect(result).toEqual([]);
  });

  test("returns empty array for whitespace-only term", async () => {
    const result = await search.search("   ");
    expect(result).toEqual([]);
  });

  test("finds formulae by name", async () => {
    const result = await search.search("wget");
    expect(result.length).toBeGreaterThan(0);
    const wgetResult = result.find((r) => r.name === "wget");
    expect(wgetResult).toBeDefined();
    expect(wgetResult!.type).toBe("formula");
  }, 30_000);

  test("finds casks when searching for cask type only", async () => {
    const result = await search.search("firefox", "cask");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.type === "cask")).toBe(true);
  }, 30_000);

  test("finds formulae when searching for formula type only", async () => {
    const result = await search.search("curl", "formula");
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((r) => r.type === "formula")).toBe(true);
  }, 30_000);

  test("each result has name, type, installed fields", async () => {
    const result = await search.search("wget", "formula");
    if (result.length === 0) return;

    const r = result[0]!;
    expect(r).toHaveProperty("name");
    expect(r).toHaveProperty("type");
    expect(r).toHaveProperty("installed");
    expect(typeof r.name).toBe("string");
    expect(["formula", "cask"]).toContain(r.type);
    expect(typeof r.installed).toBe("boolean");
  }, 30_000);
});
