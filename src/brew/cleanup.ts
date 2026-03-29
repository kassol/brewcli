import { brewExec, clearCache } from "./executor.ts";

export async function cleanAll(dryRun = false): Promise<string> {
  const cleanupArgs = dryRun
    ? ["cleanup", "--prune=all", "--dry-run"]
    : ["cleanup", "--prune=all"];
  const removeArgs = dryRun
    ? ["autoremove", "--dry-run"]
    : ["autoremove"];

  const cleanupOut = await brewExec(cleanupArgs, { timeout: 120_000 });
  const removeOut = await brewExec(removeArgs, { timeout: 120_000 });
  if (!dryRun) clearCache();

  const parts = [cleanupOut, removeOut].filter(Boolean);
  return parts.join("\n");
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
