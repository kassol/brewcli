// Brew CLI executor with caching

export class BrewError extends Error {
  constructor(
    public readonly command: string,
    public readonly exitCode: number,
    public readonly stderr: string,
  ) {
    super(`brew ${command} failed (exit ${exitCode}): ${stderr.trim()}`);
    this.name = "BrewError";
  }
}

interface CacheEntry {
  data: string;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 30_000; // 30s

export function clearCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export async function brewExec(
  args: string[],
  options?: { timeout?: number; noThrow?: boolean },
): Promise<string> {
  const proc = Bun.spawn(["brew", ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = options?.timeout ?? 60_000;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      proc.kill();
      reject(new BrewError(args.join(" "), -1, `Timed out after ${timeout}ms`));
    }, timeout);
  });

  try {
    const [stdout, stderr, exitCode] = await Promise.race([
      Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
      ]),
      timeoutPromise,
    ]) as [string, string, number];

    if (exitCode !== 0 && !options?.noThrow) {
      throw new BrewError(args.join(" "), exitCode, stderr);
    }

    return stdout;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function brewExecCached(
  args: string[],
  ttl = DEFAULT_TTL,
): Promise<string> {
  const key = args.join("\0");
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }
  const data = await brewExec(args);
  cache.set(key, { data, expiry: Date.now() + ttl });
  return data;
}

export async function brewExecJson<T>(
  args: string[],
  ttl?: number,
): Promise<T> {
  const raw = ttl != null ? await brewExecCached(args, ttl) : await brewExec(args);
  return JSON.parse(raw) as T;
}

export async function brewExecLines(args: string[]): Promise<string[]> {
  const raw = await brewExec(args);
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
