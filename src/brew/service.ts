import type { ServiceInfo } from "./types.ts";
import { brewExec, brewExecJson, clearCache } from "./executor.ts";

export async function list(): Promise<ServiceInfo[]> {
  try {
    return await brewExecJson<ServiceInfo[]>(
      ["services", "list", "--json"],
    );
  } catch {
    // brew services might not be available
    return [];
  }
}

export async function start(name: string): Promise<string> {
  const output = await brewExec(["services", "start", name]);
  clearCache("services");
  return output;
}

export async function stop(name: string): Promise<string> {
  const output = await brewExec(["services", "stop", name]);
  clearCache("services");
  return output;
}

export async function restart(name: string): Promise<string> {
  const output = await brewExec(["services", "restart", name]);
  clearCache("services");
  return output;
}

export async function run(name: string): Promise<string> {
  const output = await brewExec(["services", "run", name]);
  clearCache("services");
  return output;
}
