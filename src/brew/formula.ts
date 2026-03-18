import type { BrewInfoV2, FormulaInfo, OutdatedInfo } from "./types.ts";
import { brewExec, brewExecJson, brewExecLines, clearCache } from "./executor.ts";

export async function listInstalled(): Promise<FormulaInfo[]> {
  const result = await brewExecJson<BrewInfoV2>(
    ["info", "--installed", "--json=v2"],
  );
  return result.formulae;
}

export async function info(name: string): Promise<FormulaInfo> {
  const result = await brewExecJson<BrewInfoV2>(
    ["info", name, "--json=v2"],
  );
  if (result.formulae.length === 0) {
    throw new Error(`Formula not found: ${name}`);
  }
  return result.formulae[0]!;
}

export async function install(name: string): Promise<string> {
  clearCache("info");
  const output = await brewExec(["install", name], { timeout: 300_000 });
  clearCache();
  return output;
}

export async function uninstall(name: string): Promise<string> {
  const output = await brewExec(["uninstall", name]);
  clearCache();
  return output;
}

export async function upgrade(name?: string): Promise<string> {
  const args = name ? ["upgrade", name] : ["upgrade"];
  const output = await brewExec(args, { timeout: 600_000 });
  clearCache();
  return output;
}

export async function deps(name: string): Promise<string[]> {
  return brewExecLines(["deps", name]);
}

export async function depsTree(name: string): Promise<string> {
  return brewExec(["deps", "--tree", name]);
}

export async function depsInstalled(name: string): Promise<string[]> {
  return brewExecLines(["deps", "--installed", name]);
}

export async function uses(name: string): Promise<string[]> {
  return brewExecLines(["uses", "--installed", name]);
}

export async function pin(name: string): Promise<void> {
  await brewExec(["pin", name]);
  clearCache();
}

export async function unpin(name: string): Promise<void> {
  await brewExec(["unpin", name]);
  clearCache();
}

export async function update(): Promise<string> {
  return brewExec(["update"], { timeout: 120_000 });
}

export async function outdated(): Promise<OutdatedInfo> {
  return brewExecJson<OutdatedInfo>(["outdated", "--json=v2"]);
}

export async function leaves(): Promise<string[]> {
  return brewExecLines(["leaves"]);
}
