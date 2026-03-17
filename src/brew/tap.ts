import { brewExec, brewExecLines, clearCache } from "./executor.ts";

export interface TapInfo {
  name: string;
  remote: string;
  formulae: number;
  casks: number;
  installed: string[];
}

export async function list(): Promise<string[]> {
  return brewExecLines(["tap"]);
}

export async function info(name: string): Promise<string> {
  return brewExec(["tap-info", name]);
}

export async function tap(name: string, url?: string): Promise<string> {
  const args = url ? ["tap", name, url] : ["tap", name];
  const output = await brewExec(args, { timeout: 120_000 });
  clearCache();
  return output;
}

export async function untap(name: string): Promise<string> {
  const output = await brewExec(["untap", name]);
  clearCache();
  return output;
}
