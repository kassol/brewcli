import { describe, test, expect } from "bun:test";
import * as service from "../../src/brew/service.ts";

describe("service.list", () => {
  test("returns array of services", async () => {
    const result = await service.list();
    expect(Array.isArray(result)).toBe(true);
  });

  test("each service has expected fields when services exist", async () => {
    const result = await service.list();
    if (result.length === 0) return; // skip if no services

    const s = result[0]!;
    expect(s).toHaveProperty("name");
    expect(s).toHaveProperty("status");
    expect(typeof s.name).toBe("string");
  });
});
