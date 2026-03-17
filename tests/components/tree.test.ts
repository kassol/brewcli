import { describe, test, expect } from "bun:test";
import { parseDepsTree } from "../../src/components/Tree.tsx";

describe("parseDepsTree", () => {
  test("parses empty string to empty array", () => {
    expect(parseDepsTree("")).toEqual([]);
  });

  test("parses single root node", () => {
    const output = "git\n";
    const result = parseDepsTree(output);
    expect(result.length).toBe(1);
    expect(result[0]!.label).toBe("git");
  });

  test("parses simple tree with one level of children", () => {
    const output = `git
    gettext
    pcre2
    curl`;
    const result = parseDepsTree(output);
    expect(result.length).toBe(1);
    expect(result[0]!.label).toBe("git");
    expect(result[0]!.children?.length).toBe(3);
    expect(result[0]!.children![0]!.label).toBe("gettext");
    expect(result[0]!.children![1]!.label).toBe("pcre2");
    expect(result[0]!.children![2]!.label).toBe("curl");
  });

  test("parses nested tree", () => {
    const output = `git
    curl
        openssl@3
            ca-certificates
        zstd`;
    const result = parseDepsTree(output);
    expect(result.length).toBe(1);
    const git = result[0]!;
    expect(git.label).toBe("git");
    expect(git.children?.length).toBe(1);

    const curl = git.children![0]!;
    expect(curl.label).toBe("curl");
    expect(curl.children?.length).toBe(2);

    const openssl = curl.children![0]!;
    expect(openssl.label).toBe("openssl@3");
    expect(openssl.children?.length).toBe(1);
    expect(openssl.children![0]!.label).toBe("ca-certificates");

    const zstd = curl.children![1]!;
    expect(zstd.label).toBe("zstd");
  });

  test("parses multiple root nodes", () => {
    const output = `git
    curl
python@3.12
    mpdecimal
    openssl@3`;
    const result = parseDepsTree(output);
    expect(result.length).toBe(2);
    expect(result[0]!.label).toBe("git");
    expect(result[1]!.label).toBe("python@3.12");
    expect(result[0]!.children?.length).toBe(1);
    expect(result[1]!.children?.length).toBe(2);
  });

  test("handles brew deps --tree format with connectors", () => {
    // brew deps --tree output uses tree-drawing characters
    const output = `git
├── gettext
│   └── libunistring
├── pcre2
└── curl
    ├── brotli
    └── openssl@3`;
    const result = parseDepsTree(output);
    expect(result.length).toBe(1);
    const git = result[0]!;
    expect(git.label).toBe("git");
    // The children should be parsed even with tree connectors
    expect(git.children!.length).toBeGreaterThan(0);
  });

  test("handles whitespace-only lines gracefully", () => {
    const output = `git
    curl

    openssl`;
    const result = parseDepsTree(output);
    expect(result.length).toBe(1);
  });
});
