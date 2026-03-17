import { render } from "ink";
import React from "react";
import { App } from "./app.tsx";

// Enter alternate screen buffer for full-screen TUI
process.stdout.write("\x1b[?1049h");
process.stdout.write("\x1b[?25l"); // hide cursor

const { waitUntilExit } = render(<App />);

waitUntilExit().then(() => {
  process.stdout.write("\x1b[?25h"); // show cursor
  process.stdout.write("\x1b[?1049l"); // leave alt screen
});

// Handle unexpected exits
process.on("exit", () => {
  process.stdout.write("\x1b[?25h");
  process.stdout.write("\x1b[?1049l");
});

process.on("SIGINT", () => {
  process.stdout.write("\x1b[?25h");
  process.stdout.write("\x1b[?1049l");
  process.exit(0);
});
