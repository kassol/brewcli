import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "fs";

import { loadConfig, saveConfig, getTheme, setTheme, _setConfigDir } from "../src/config.ts";

const TEST_DIR = join(import.meta.dir, ".test-config");
const TEST_FILE = join(TEST_DIR, "config.json");

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  _setConfigDir(TEST_DIR);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env["BREWCLI_THEME"];
});

describe("loadConfig", () => {
  test("returns empty object when file does not exist", () => {
    expect(loadConfig()).toEqual({});
  });

  test("reads valid config", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, JSON.stringify({ theme: "light" }));
    expect(loadConfig()).toEqual({ theme: "light" });
  });

  test("returns empty object on corrupt JSON", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, "not json{{{");
    expect(loadConfig()).toEqual({});
  });

  test("ignores invalid theme values", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, JSON.stringify({ theme: "invalid" }));
    const config = loadConfig();
    expect(config.theme).toBeUndefined();
  });
});

describe("saveConfig", () => {
  test("creates directory and writes file", () => {
    saveConfig({ theme: "dark" });
    expect(existsSync(TEST_FILE)).toBe(true);
    const raw = require("fs").readFileSync(TEST_FILE, "utf-8");
    expect(JSON.parse(raw).theme).toBe("dark");
  });

  test("overwrites existing config", () => {
    saveConfig({ theme: "dark" });
    saveConfig({ theme: "light" });
    const raw = require("fs").readFileSync(TEST_FILE, "utf-8");
    expect(JSON.parse(raw).theme).toBe("light");
  });
});

describe("getTheme", () => {
  test("env var takes highest priority", () => {
    process.env["BREWCLI_THEME"] = "light";
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, JSON.stringify({ theme: "dark" }));
    expect(getTheme()).toBe("light");
  });

  test("config takes priority over detection", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, JSON.stringify({ theme: "light" }));
    expect(getTheme()).toBe("light");
  });

  test("falls back to detectColorScheme when no config", () => {
    const result = getTheme();
    expect(["dark", "light"]).toContain(result);
  });
});

describe("setTheme", () => {
  test("persists theme to config file", () => {
    setTheme("light");
    expect(loadConfig().theme).toBe("light");
  });
});
