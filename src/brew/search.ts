import type { BrewInfoV2, SearchResult } from "./types.ts";
import { brewExec, brewExecJson } from "./executor.ts";

export async function search(
  term: string,
  type?: "formula" | "cask",
): Promise<SearchResult[]> {
  if (!term.trim() || term.trim().length < 2) return [];

  const results: SearchResult[] = [];

  if (!type || type === "formula") {
    const output = await brewExec(["search", "--formulae", term], {
      noThrow: true,
    });
    const names = output
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("="));
    for (const name of names) {
      results.push({ name, type: "formula", installed: false });
    }
  }

  if (!type || type === "cask") {
    const output = await brewExec(["search", "--cask", term], {
      noThrow: true,
    });
    const names = output
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("="));
    for (const name of names) {
      results.push({ name, type: "cask", installed: false });
    }
  }

  // Try to enrich with installed status
  try {
    const installed = await brewExecJson<BrewInfoV2>(
      ["info", "--installed", "--json=v2"],
      30_000,
    );
    const installedNames = new Set([
      ...installed.formulae.map((f) => f.name),
      ...installed.casks.map((c) => c.token),
    ]);
    for (const r of results) {
      r.installed = installedNames.has(r.name);
    }
  } catch {
    // ignore enrichment errors
  }

  return results;
}

export async function infoMulti(
  names: string[],
  type: "formula" | "cask",
): Promise<BrewInfoV2> {
  if (names.length === 0) return { formulae: [], casks: [] };
  const args =
    type === "cask"
      ? ["info", "--cask", "--json=v2", ...names]
      : ["info", "--json=v2", ...names];
  return brewExecJson<BrewInfoV2>(args);
}
