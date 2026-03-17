import type { BrewInfoV2, CaskInfo } from "./types.ts";
import { brewExec, brewExecJson, clearCache } from "./executor.ts";

export async function listInstalled(): Promise<CaskInfo[]> {
  const result = await brewExecJson<BrewInfoV2>(
    ["info", "--installed", "--cask", "--json=v2"],
  );
  return result.casks;
}

export async function info(token: string): Promise<CaskInfo> {
  const result = await brewExecJson<BrewInfoV2>(
    ["info", "--cask", token, "--json=v2"],
  );
  if (result.casks.length === 0) {
    throw new Error(`Cask not found: ${token}`);
  }
  return result.casks[0]!;
}

export async function install(token: string): Promise<string> {
  const output = await brewExec(["install", "--cask", token], {
    timeout: 300_000,
  });
  clearCache();
  return output;
}

export async function uninstall(token: string): Promise<string> {
  const output = await brewExec(["uninstall", "--cask", token]);
  clearCache();
  return output;
}

export async function upgrade(token?: string): Promise<string> {
  const args = token
    ? ["upgrade", "--cask", token]
    : ["upgrade", "--cask"];
  const output = await brewExec(args, { timeout: 600_000 });
  clearCache();
  return output;
}
