import { describe, test, expect } from "bun:test";
import type {
  FormulaInfo,
  CaskInfo,
  ServiceInfo,
  SearchResult,
  OutdatedInfo,
  BrewInfoV2,
} from "../../src/brew/types.ts";

// Type-level tests: ensure our types match the actual brew JSON output

describe("BrewInfoV2 type compatibility", () => {
  test("can parse real brew info --json=v2 output", async () => {
    const proc = Bun.spawn(["brew", "info", "--installed", "--json=v2"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    const parsed = JSON.parse(stdout) as BrewInfoV2;

    expect(parsed).toHaveProperty("formulae");
    expect(parsed).toHaveProperty("casks");

    if (parsed.formulae.length > 0) {
      const f: FormulaInfo = parsed.formulae[0]!;
      // Verify key fields exist at runtime
      expect(typeof f.name).toBe("string");
      expect(typeof f.full_name).toBe("string");
      expect(typeof f.desc).toBe("string");
      expect(typeof f.pinned).toBe("boolean");
      expect(typeof f.outdated).toBe("boolean");
      expect(typeof f.deprecated).toBe("boolean");
      expect(typeof f.disabled).toBe("boolean");
      expect(typeof f.keg_only).toBe("boolean");
      expect(f.versions).toHaveProperty("stable");
      expect(Array.isArray(f.dependencies)).toBe(true);
      expect(Array.isArray(f.build_dependencies)).toBe(true);
      expect(Array.isArray(f.installed)).toBe(true);
      expect(Array.isArray(f.conflicts_with)).toBe(true);
    }

    if (parsed.casks.length > 0) {
      const c: CaskInfo = parsed.casks[0]!;
      expect(typeof c.token).toBe("string");
      expect(typeof c.full_token).toBe("string");
      expect(typeof c.desc).toBe("string");
      expect(typeof c.version).toBe("string");
      expect(typeof c.outdated).toBe("boolean");
      expect(Array.isArray(c.name)).toBe(true);
    }
  });
});

describe("OutdatedInfo type compatibility", () => {
  test("can parse real brew outdated --json=v2 output", async () => {
    const proc = Bun.spawn(["brew", "outdated", "--json=v2"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    const parsed = JSON.parse(stdout) as OutdatedInfo;
    expect(parsed).toHaveProperty("formulae");
    expect(parsed).toHaveProperty("casks");
    expect(Array.isArray(parsed.formulae)).toBe(true);
    expect(Array.isArray(parsed.casks)).toBe(true);
  });
});

describe("SearchResult type", () => {
  test("matches expected shape", () => {
    const result: SearchResult = {
      name: "git",
      type: "formula",
      installed: true,
    };
    expect(result.name).toBe("git");
    expect(result.type).toBe("formula");
    expect(result.installed).toBe(true);
  });

  test("optional fields work", () => {
    const result: SearchResult = {
      name: "git",
      type: "formula",
      installed: false,
      desc: "Distributed VCS",
      version: "2.43.0",
    };
    expect(result.desc).toBe("Distributed VCS");
    expect(result.version).toBe("2.43.0");
  });
});
