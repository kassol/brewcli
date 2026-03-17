import { describe, test, expect } from "bun:test";
import * as formula from "../../src/brew/formula.ts";

describe("formula.listInstalled", () => {
  test("returns array of installed formulae", async () => {
    const result = await formula.listInstalled();
    expect(Array.isArray(result)).toBe(true);
    // Should have at least a few formulae on any dev machine
    expect(result.length).toBeGreaterThan(0);
  });

  test("each formula has required fields", async () => {
    const result = await formula.listInstalled();
    const f = result[0]!;
    expect(f).toHaveProperty("name");
    expect(f).toHaveProperty("full_name");
    expect(f).toHaveProperty("desc");
    expect(f).toHaveProperty("versions");
    expect(f).toHaveProperty("dependencies");
    expect(f).toHaveProperty("installed");
    expect(f).toHaveProperty("pinned");
    expect(f).toHaveProperty("outdated");
    expect(typeof f.name).toBe("string");
    expect(typeof f.pinned).toBe("boolean");
    expect(typeof f.outdated).toBe("boolean");
    expect(Array.isArray(f.dependencies)).toBe(true);
    expect(Array.isArray(f.installed)).toBe(true);
  });

  test("installed info has expected structure", async () => {
    const result = await formula.listInstalled();
    const f = result[0]!;
    expect(f.installed.length).toBeGreaterThan(0);
    const inst = f.installed[0]!;
    expect(inst).toHaveProperty("version");
    expect(inst).toHaveProperty("installed_on_request");
    expect(inst).toHaveProperty("installed_as_dependency");
    expect(typeof inst.version).toBe("string");
    expect(typeof inst.installed_on_request).toBe("boolean");
  });
});

describe("formula.info", () => {
  test("returns info for a known formula", async () => {
    // 'bun' should be installed since we're using it
    const installed = await formula.listInstalled();
    if (installed.length === 0) return; // skip if nothing installed

    const name = installed[0]!.name;
    const info = await formula.info(name);
    expect(info.name).toBe(name);
    expect(info).toHaveProperty("desc");
    expect(info).toHaveProperty("homepage");
  });

  test("throws for non-existent formula", async () => {
    expect(
      formula.info("this-formula-does-not-exist-xyz123"),
    ).rejects.toThrow();
  });
});

describe("formula.deps", () => {
  test("returns dependency list", async () => {
    const installed = await formula.listInstalled();
    // Find a formula that has dependencies
    const withDeps = installed.find((f) => f.dependencies.length > 0);
    if (!withDeps) return; // skip

    const deps = await formula.deps(withDeps.name);
    expect(Array.isArray(deps)).toBe(true);
    expect(deps.length).toBeGreaterThan(0);
  });
});

describe("formula.depsTree", () => {
  test("returns tree output as string", async () => {
    const installed = await formula.listInstalled();
    const withDeps = installed.find((f) => f.dependencies.length > 0);
    if (!withDeps) return; // skip

    const tree = await formula.depsTree(withDeps.name);
    expect(typeof tree).toBe("string");
    expect(tree.length).toBeGreaterThan(0);
  });
});

describe("formula.uses", () => {
  test("returns array of dependents", async () => {
    const installed = await formula.listInstalled();
    if (installed.length === 0) return;

    // Find a common dependency (like openssl or ca-certificates)
    const common = installed.find((f) =>
      ["ca-certificates", "openssl@3", "openssl", "readline", "xz", "zlib"].includes(f.name),
    );
    if (!common) return;

    const uses = await formula.uses(common.name);
    expect(Array.isArray(uses)).toBe(true);
  });
});

describe("formula.outdated", () => {
  test("returns outdated info with formulae and casks arrays", async () => {
    const result = await formula.outdated();
    expect(result).toHaveProperty("formulae");
    expect(result).toHaveProperty("casks");
    expect(Array.isArray(result.formulae)).toBe(true);
    expect(Array.isArray(result.casks)).toBe(true);
  });
});

describe("formula.leaves", () => {
  test("returns array of leaf packages", async () => {
    const result = await formula.leaves();
    expect(Array.isArray(result)).toBe(true);
  });
});
