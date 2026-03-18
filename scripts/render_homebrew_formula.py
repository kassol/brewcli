#!/usr/bin/env python3

from __future__ import annotations

import argparse
from pathlib import Path


TEMPLATE = """class Brewcli < Formula
  desc \"Interactive Homebrew TUI built with Bun, TypeScript, and Ink\"
  homepage \"https://github.com/kassol/brewcli\"
  version \"{version}\"
  license \"MIT\"

  if Hardware::CPU.arm?
    url \"{arm_url}\"
    sha256 \"{arm_sha}\"
  else
    url \"{x64_url}\"
    sha256 \"{x64_sha}\"
  end

  def install
    bin.install \"brewcli\"
  end

  test do
    output = shell_output("#{{bin}}/brewcli --version")
    assert_match \"brewcli {version}\", output
  end
end
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Render Homebrew formula for brewcli")
    parser.add_argument("--version", required=True)
    parser.add_argument("--arm-url", required=True)
    parser.add_argument("--arm-sha", required=True)
    parser.add_argument("--x64-url", required=True)
    parser.add_argument("--x64-sha", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    content = TEMPLATE.format(
        version=args.version,
        arm_url=args.arm_url,
        arm_sha=args.arm_sha,
        x64_url=args.x64_url,
        x64_sha=args.x64_sha,
    )
    Path(args.output).write_text(content)


if __name__ == "__main__":
    main()
