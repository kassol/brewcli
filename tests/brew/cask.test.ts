import { describe, test, expect } from "bun:test";
import * as cask from "../../src/brew/cask.ts";

describe("cask.listInstalled", () => {
  test("returns array of installed casks", async () => {
    const result = await cask.listInstalled();
    expect(Array.isArray(result)).toBe(true);
  });

  test("each cask has required fields", async () => {
    const result = await cask.listInstalled();
    if (result.length === 0) return; // skip if no casks installed

    const c = result[0]!;
    expect(c).toHaveProperty("token");
    expect(c).toHaveProperty("full_token");
    expect(c).toHaveProperty("name");
    expect(c).toHaveProperty("desc");
    expect(c).toHaveProperty("version");
    expect(c).toHaveProperty("installed");
    expect(c).toHaveProperty("outdated");
    expect(typeof c.token).toBe("string");
    expect(Array.isArray(c.name)).toBe(true);
    expect(typeof c.outdated).toBe("boolean");
  });
});

describe("cask.info", () => {
  test("returns info for an installed cask", async () => {
    const installed = await cask.listInstalled();
    if (installed.length === 0) return;

    const token = installed[0]!.token;
    const info = await cask.info(token);
    expect(info.token).toBe(token);
    expect(info).toHaveProperty("desc");
    expect(info).toHaveProperty("homepage");
    expect(info).toHaveProperty("version");
  });

  test("throws for non-existent cask", async () => {
    expect(
      cask.info("this-cask-does-not-exist-xyz123"),
    ).rejects.toThrow();
  });
});
