import { join } from "path";
import { homedir } from "os";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { detectColorScheme, type ColorScheme } from "./theme.ts";

export interface AppConfig {
  theme?: "dark" | "light";
}

let configDir = join(homedir(), ".config", "brewcli");

/** Test helper: override config directory. */
export function _setConfigDir(dir: string): void {
  configDir = dir;
}

function configPath(): string {
  return join(configDir, "config.json");
}

export function loadConfig(): AppConfig {
  try {
    const raw = readFileSync(configPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const config: AppConfig = {};
    if (parsed.theme === "dark" || parsed.theme === "light") {
      config.theme = parsed.theme;
    }
    return config;
  } catch {
    return {};
  }
}

export function saveConfig(config: AppConfig): void {
  try {
    mkdirSync(configDir, { recursive: true });
    writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`brewcli: failed to save config: ${e}\n`);
  }
}

export function getTheme(): ColorScheme {
  // Priority: env > config > detect
  const env = process.env["BREWCLI_THEME"];
  if (env === "light") return "light";
  if (env === "dark") return "dark";

  const config = loadConfig();
  if (config.theme) return config.theme;

  return detectColorScheme();
}

export function setTheme(scheme: ColorScheme): void {
  const config = loadConfig();
  config.theme = scheme;
  saveConfig(config);
}
