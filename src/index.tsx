import { APP_DESCRIPTION, APP_NAME, APP_VERSION } from "./meta.ts";

function printHelp(): void {
  process.stdout.write(`${APP_NAME} ${APP_VERSION}\n`);
  process.stdout.write(`${APP_DESCRIPTION}\n\n`);
  process.stdout.write(`Usage:\n`);
  process.stdout.write(`  ${APP_NAME}           Start the interactive TUI\n`);
  process.stdout.write(`  ${APP_NAME} --help    Show help\n`);
  process.stdout.write(`  ${APP_NAME} --version Show version\n\n`);
  process.stdout.write(`Keyboard-first Homebrew management for formulae, casks, services, taps, updates, and maintenance.\n`);
}

function restoreTerminal(): void {
  process.stdout.write("\x1b[?25h");
  process.stdout.write("\x1b[?1049l");
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    process.stdout.write(`${APP_NAME} ${APP_VERSION}\n`);
    process.exit(0);
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write(`${APP_NAME} requires an interactive terminal. Use --help for usage.\n`);
    process.exit(1);
  }

  process.env.DEV = "false";

  const React = (await import("react")).default;
  const { render } = await import("ink");
  const { App } = await import("./app.tsx");

  process.stdout.write("\x1b[?1049h");
  process.stdout.write("\x1b[?25l");

  const { waitUntilExit } = render(React.createElement(App));

  process.on("exit", restoreTerminal);
  process.on("SIGINT", () => {
    restoreTerminal();
    process.exit(0);
  });

  await waitUntilExit();
  restoreTerminal();
}

main().catch((error) => {
  restoreTerminal();
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
