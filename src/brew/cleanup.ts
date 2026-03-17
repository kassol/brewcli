import { brewExec, clearCache } from "./executor.ts";

export async function cleanup(dryRun = false): Promise<string> {
  const args = dryRun ? ["cleanup", "--dry-run"] : ["cleanup"];
  const output = await brewExec(args, { timeout: 120_000 });
  if (!dryRun) clearCache();
  return output;
}

export async function autoremove(dryRun = false): Promise<string> {
  const args = dryRun ? ["autoremove", "--dry-run"] : ["autoremove"];
  const output = await brewExec(args, { timeout: 120_000 });
  if (!dryRun) clearCache();
  return output;
}

export async function cacheSize(): Promise<string> {
  const output = await brewExec(["--cache"]);
  const cachePath = output.trim();

  try {
    const proc = Bun.spawn(["du", "-sh", cachePath], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    await proc.exited;
    return stdout.split("\t")[0]?.trim() ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function doctor(): Promise<string> {
  return brewExec(["doctor"], { noThrow: true, timeout: 120_000 });
}
