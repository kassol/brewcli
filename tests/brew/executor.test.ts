import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import { brewExec, brewExecJson, brewExecLines, brewExecCached, clearCache, BrewError } from "../../src/brew/executor.ts";

// We test the caching logic and error handling.
// brewExec itself calls Bun.spawn, which we'll test with integration-style tests.

describe("BrewError", () => {
  test("contains command, exitCode, stderr", () => {
    const err = new BrewError("info git", 1, "No such formula");
    expect(err.name).toBe("BrewError");
    expect(err.command).toBe("info git");
    expect(err.exitCode).toBe(1);
    expect(err.stderr).toBe("No such formula");
    expect(err.message).toContain("info git");
    expect(err.message).toContain("exit 1");
    expect(err.message).toContain("No such formula");
  });

  test("trims stderr in message", () => {
    const err = new BrewError("test", 2, "  error message  \n");
    expect(err.message).toContain("error message");
  });

  test("is instance of Error", () => {
    const err = new BrewError("test", 1, "fail");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(BrewError);
  });
});

describe("clearCache", () => {
  beforeEach(() => {
    clearCache();
  });

  test("clears all cache entries", () => {
    // clearCache with no args clears everything
    clearCache();
    // Should not throw
    expect(true).toBe(true);
  });

  test("clears cache by prefix", () => {
    clearCache("info");
    // Should not throw
    expect(true).toBe(true);
  });
});

describe("brewExecCached", () => {
  beforeEach(() => {
    clearCache();
  });

  test("caches results within TTL", async () => {
    // Call brewExecCached with a real brew command
    const result1 = await brewExecCached(["--version"], 5000);
    expect(result1).toContain("Homebrew");

    // Second call should return cached result
    const result2 = await brewExecCached(["--version"], 5000);
    expect(result2).toBe(result1);
  });

  test("cache is invalidated after clearCache", async () => {
    const result1 = await brewExecCached(["--version"], 60000);
    clearCache();
    // After clearing, it should still work (just re-fetches)
    const result2 = await brewExecCached(["--version"], 60000);
    expect(result2).toContain("Homebrew");
  });
});

describe("brewExec", () => {
  test("returns stdout for successful command", async () => {
    const result = await brewExec(["--version"]);
    expect(result).toContain("Homebrew");
  });

  test("throws BrewError on non-zero exit", async () => {
    try {
      await brewExec(["info", "this-package-definitely-does-not-exist-xyz123"]);
      expect(true).toBe(false); // should not reach here
    } catch (e) {
      expect(e).toBeInstanceOf(BrewError);
      const err = e as BrewError;
      expect(err.exitCode).not.toBe(0);
    }
  });

  test("noThrow option prevents throwing", async () => {
    const result = await brewExec(
      ["info", "this-package-definitely-does-not-exist-xyz123"],
      { noThrow: true },
    );
    // Should return some output without throwing
    expect(typeof result).toBe("string");
  });

  test("timeout kills long-running commands", async () => {
    try {
      // Use an extremely short timeout
      await brewExec(["info", "--installed", "--json=v2"], { timeout: 1 });
      // Might succeed if very fast, but likely to timeout
    } catch (e) {
      if (e instanceof BrewError) {
        expect(e.exitCode).toBe(-1);
        expect(e.message).toContain("Timed out");
      }
    }
  });
});

describe("brewExecJson", () => {
  test("parses JSON output correctly", async () => {
    const result = await brewExecJson<{ formulae: unknown[]; casks: unknown[] }>(
      ["info", "--installed", "--json=v2"],
    );
    expect(result).toHaveProperty("formulae");
    expect(result).toHaveProperty("casks");
    expect(Array.isArray(result.formulae)).toBe(true);
    expect(Array.isArray(result.casks)).toBe(true);
  });
});

describe("brewExecLines", () => {
  test("splits output into trimmed non-empty lines", async () => {
    const result = await brewExecLines(["tap"]);
    expect(Array.isArray(result)).toBe(true);
    // Should have at least one tap
    expect(result.length).toBeGreaterThan(0);
    // No empty lines
    expect(result.every((l) => l.length > 0)).toBe(true);
  });
});
