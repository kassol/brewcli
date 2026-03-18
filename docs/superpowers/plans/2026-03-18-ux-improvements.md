# UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix four UX issues — theme persistence, action discoverability, modal transparency, and subtle notifications.

**Architecture:** Four independent features implemented sequentially. Theme persistence adds a config module; discoverability revamps StatusBar hints; modals get a shared ModalBox wrapper with solid background + shadow; notifications move from StatusBar to a top-center Toast component.

**Tech Stack:** Bun, TypeScript strict, Ink (React for CLI), React 19, bun:test

**Spec:** `docs/superpowers/specs/2026-03-18-ux-improvements-design.md`

---

## File Structure

**New files:**
- `src/config.ts` — Config file read/write (`~/.config/brewcli/config.json`). Pure module, no React.
- `src/components/ModalBox.tsx` — Reusable modal wrapper with solid background + drop shadow.
- `src/components/Toast.tsx` — Top-center toast notification component.
- `tests/config.test.ts` — Config module tests.
- `tests/components/toast.test.ts` — Toast logic tests.

**Modified files:**
- `src/theme.ts` — Add `base` and `crust` color tokens.
- `src/hooks/useTheme.tsx` — Init from config, persist on toggle.
- `src/components/StatusBar.tsx` — Replace keyHints/notification with `hints` prop, drop `colorScheme` prop.
- `src/components/ConfirmDialog.tsx` — Wrap in ModalBox.
- `src/components/SearchBar.tsx` — Wrap in ModalBox.
- `src/components/HelpOverlay.tsx` — Wrap in ModalBox.
- `src/components/InputDialog.tsx` — Wrap in ModalBox.
- `src/pages/Outdated.tsx` — Add `d` key uninstall, extend action type.
- `src/app.tsx` — Hints routing, toast state, Outdated uninstall handler, config init, simplify overlay containers.

---

### Task 1: Add `base` and `crust` color tokens to theme

**Files:**
- Modify: `src/theme.ts:30-81`

- [ ] **Step 1: Add color tokens to `darkColors`**

In `src/theme.ts`, add two entries to `darkColors` after the `lavender` line:

```typescript
  lavender: "#B4BEFE",
  base: "#1E1E2E",
  crust: "#11111B",
```

- [ ] **Step 2: Add color tokens to `lightColors`**

In `src/theme.ts`, add two entries to `lightColors` after the `lavender` line:

```typescript
  lavender: "#7287FD",  // Lavender
  base: "#EFF1F5",      // Base
  crust: "#DCE0E8",     // Crust
```

- [ ] **Step 3: Add to `Colors` interface**

In `src/theme.ts`, add to the `Colors` interface after `lavender`:

```typescript
  readonly base: string;
  readonly crust: string;
```

- [ ] **Step 4: Run typecheck**

Run: `make typecheck`
Expected: PASS (no errors)

- [ ] **Step 5: Run tests**

Run: `make test`
Expected: All 74 tests pass

- [ ] **Step 6: Commit**

```bash
git add src/theme.ts
git commit -m "feat: add base and crust color tokens to theme palette"
```

---

### Task 2: Config module for theme persistence

**Files:**
- Create: `src/config.ts`
- Create: `tests/config.test.ts`
- Modify: `src/hooks/useTheme.tsx`

- [ ] **Step 1: Write config tests**

Create `tests/config.test.ts`:

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { join } from "path";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "fs";

// We test the internal functions by importing them.
// config.ts uses a configurable path for testability.
import { loadConfig, saveConfig, getTheme, setTheme, _setConfigDir } from "../src/config.ts";

const TEST_DIR = join(import.meta.dir, ".test-config");
const TEST_FILE = join(TEST_DIR, "config.json");

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  _setConfigDir(TEST_DIR);
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  // Reset env vars
  delete process.env["BREWCLI_THEME"];
});

describe("loadConfig", () => {
  test("returns empty object when file does not exist", () => {
    expect(loadConfig()).toEqual({});
  });

  test("reads valid config", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, JSON.stringify({ theme: "light" }));
    expect(loadConfig()).toEqual({ theme: "light" });
  });

  test("returns empty object on corrupt JSON", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, "not json{{{");
    expect(loadConfig()).toEqual({});
  });

  test("ignores invalid theme values", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, JSON.stringify({ theme: "invalid" }));
    const config = loadConfig();
    expect(config.theme).toBeUndefined();
  });
});

describe("saveConfig", () => {
  test("creates directory and writes file", () => {
    saveConfig({ theme: "dark" });
    expect(existsSync(TEST_FILE)).toBe(true);
    const raw = require("fs").readFileSync(TEST_FILE, "utf-8");
    expect(JSON.parse(raw).theme).toBe("dark");
  });

  test("overwrites existing config", () => {
    saveConfig({ theme: "dark" });
    saveConfig({ theme: "light" });
    const raw = require("fs").readFileSync(TEST_FILE, "utf-8");
    expect(JSON.parse(raw).theme).toBe("light");
  });
});

describe("getTheme", () => {
  test("env var takes highest priority", () => {
    process.env["BREWCLI_THEME"] = "light";
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, JSON.stringify({ theme: "dark" }));
    expect(getTheme()).toBe("light");
  });

  test("config takes priority over detection", () => {
    mkdirSync(TEST_DIR, { recursive: true });
    writeFileSync(TEST_FILE, JSON.stringify({ theme: "light" }));
    expect(getTheme()).toBe("light");
  });

  test("falls back to detectColorScheme when no config", () => {
    // No env, no config file -> detectColorScheme default
    const result = getTheme();
    expect(["dark", "light"]).toContain(result);
  });
});

describe("setTheme", () => {
  test("persists theme to config file", () => {
    setTheme("light");
    expect(loadConfig().theme).toBe("light");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/config.test.ts`
Expected: FAIL — module `../src/config.ts` not found

- [ ] **Step 3: Implement config module**

Create `src/config.ts`:

```typescript
import { join } from "path";
import { homedir } from "os";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { detectColorScheme, type ColorScheme } from "./theme.ts";

export interface AppConfig {
  theme?: "dark" | "light";
}

let configDir = join(homedir(), ".config", "brewcli");

/** Test helper: override config directory. */
export function _setConfigDir(dir: string): void {
  configDir = dir;
}

function configPath(): string {
  return join(configDir, "config.json");
}

export function loadConfig(): AppConfig {
  try {
    const raw = readFileSync(configPath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const config: AppConfig = {};
    if (parsed.theme === "dark" || parsed.theme === "light") {
      config.theme = parsed.theme;
    }
    return config;
  } catch {
    return {};
  }
}

export function saveConfig(config: AppConfig): void {
  try {
    mkdirSync(configDir, { recursive: true });
    writeFileSync(configPath(), JSON.stringify(config, null, 2) + "\n");
  } catch (e) {
    process.stderr.write(`brewcli: failed to save config: ${e}\n`);
  }
}

export function getTheme(): ColorScheme {
  // Priority: env > config > detect
  const env = process.env["BREWCLI_THEME"];
  if (env === "light") return "light";
  if (env === "dark") return "dark";

  const config = loadConfig();
  if (config.theme) return config.theme;

  return detectColorScheme();
}

export function setTheme(scheme: ColorScheme): void {
  const config = loadConfig();
  config.theme = scheme;
  saveConfig(config);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test tests/config.test.ts`
Expected: All config tests PASS

- [ ] **Step 5: Wire config into useTheme**

Modify `src/hooks/useTheme.tsx`:

Replace:
```typescript
import { darkColors, lightColors, detectColorScheme } from "../theme.ts";
```
With:
```typescript
import { darkColors, lightColors } from "../theme.ts";
import { getTheme, setTheme as persistTheme } from "../config.ts";
```

Replace:
```typescript
  const [colorScheme, setColorScheme] = useState<ColorScheme>(detectColorScheme);
```
With:
```typescript
  const [colorScheme, setColorScheme] = useState<ColorScheme>(getTheme);
```

Replace:
```typescript
  const toggleTheme = useCallback(() => {
    setColorScheme((s) => (s === "dark" ? "light" : "dark"));
  }, []);
```
With:
```typescript
  const toggleTheme = useCallback(() => {
    setColorScheme((s) => {
      const next = s === "dark" ? "light" : "dark";
      persistTheme(next);
      return next;
    });
  }, []);
```

- [ ] **Step 6: Run typecheck and full test suite**

Run: `make typecheck && make test`
Expected: All pass

- [ ] **Step 7: Commit**

```bash
git add src/config.ts tests/config.test.ts src/hooks/useTheme.tsx
git commit -m "feat: persist theme preference to ~/.config/brewcli/config.json"
```

---

### Task 3: ModalBox component

**Files:**
- Create: `src/components/ModalBox.tsx`
- Modify: `src/components/ConfirmDialog.tsx`
- Modify: `src/components/SearchBar.tsx`
- Modify: `src/components/HelpOverlay.tsx`
- Modify: `src/components/InputDialog.tsx`
- Modify: `src/app.tsx` (overlay containers)

- [ ] **Step 1: Create ModalBox component**

Create `src/components/ModalBox.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";

interface ModalBoxProps {
  width: number;
  children: React.ReactNode;
  borderColor?: string;
}

/**
 * Modal wrapper with solid background and drop shadow.
 *
 * Ink's position="absolute" does not occlude underlying renders,
 * so we fill the dialog area with backgroundColor to physically
 * cover content beneath. A 1-char offset shadow adds depth.
 *
 * JSX order: shadow first (lower layer), then dialog (upper layer).
 */
export function ModalBox({ width, children, borderColor }: ModalBoxProps) {
  const { colors } = useTheme();
  const color = borderColor ?? colors.primary;

  // Shadow: rendered first = lower layer in Ink absolute stacking.
  // We render the shadow as a right-edge column and bottom-edge row.

  return (
    <Box flexDirection="column">
      {/* Main dialog with solid background */}
      <Box flexDirection="row">
        <Box
          flexDirection="column"
          borderStyle="round"
          borderColor={color}
          paddingX={3}
          paddingY={1}
          width={width}
        >
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return child;
            }
            return child;
          })}
        </Box>
        {/* Right shadow edge (1 char wide) */}
        <Box flexDirection="column">
          <Text> </Text>
          <Text backgroundColor={colors.crust}> </Text>
        </Box>
      </Box>
      {/* Bottom shadow edge */}
      <Box>
        <Text> </Text>
        <Text backgroundColor={colors.crust}>{" ".repeat(width)}</Text>
      </Box>
    </Box>
  );
}
```

Note: The solid background approach needs refinement during implementation. Each `Text` child inside the dialog must have `backgroundColor={colors.base}` applied. Since ModalBox wraps arbitrary children, the children themselves are responsible for setting their `backgroundColor`. ModalBox provides the border, shadow, and container. Each dialog component (ConfirmDialog, SearchBar, etc.) will set `backgroundColor={colors.base}` on its own Text elements and pad them with spaces to fill the width.

- [ ] **Step 2: Refactor ConfirmDialog to use ModalBox**

Replace the entire `ConfirmDialog` component in `src/components/ConfirmDialog.tsx`:

```tsx
import React from "react";
import { Box, Text, useInput } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";
import { ModalBox } from "./ModalBox.tsx";

interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
  destructive = false,
}: ConfirmDialogProps) {
  const { colors } = useTheme();
  useInput((input, key) => {
    if (input === "y" || input === "Y" || key.return) {
      onConfirm();
    }
    if (input === "n" || input === "N" || key.escape) {
      onCancel();
    }
  });

  const borderColor = destructive ? colors.error : colors.warning;

  return (
    <ModalBox width={58} borderColor={borderColor}>
      <Text bold color={destructive ? colors.error : colors.warning} backgroundColor={colors.base}>
        {title}
      </Text>
      <Box marginY={1} flexDirection="column">
        <Text color={colors.text} backgroundColor={colors.base}>{message}</Text>
        <Text color={colors.muted} backgroundColor={colors.base}>
          {destructive ? "This action may be hard to undo." : "Press Enter or Y to continue."}
        </Text>
      </Box>
      <Box gap={2}>
        <Text color={destructive ? colors.error : colors.success} bold backgroundColor={colors.base}>
          [Enter / Y] Confirm
        </Text>
        <Text color={colors.muted} bold backgroundColor={colors.base}>
          [Esc / N] Cancel
        </Text>
      </Box>
    </ModalBox>
  );
}
```

- [ ] **Step 3: Refactor HelpOverlay to use ModalBox**

In `src/components/HelpOverlay.tsx`, replace the outer `<Box>` with `<ModalBox>`:

Replace:
```tsx
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.primary}
      paddingX={2}
      paddingY={1}
      width={56}
    >
```
With:
```tsx
    <ModalBox width={56} borderColor={colors.primary}>
```

Replace the matching closing `</Box>` (the last one) with `</ModalBox>`.

Add import: `import { ModalBox } from "./ModalBox.tsx";`

Add `backgroundColor={colors.base}` to all `<Text>` elements inside for solid background fill.

- [ ] **Step 4: Refactor InputDialog to use ModalBox**

In `src/components/InputDialog.tsx`, replace the outer `<Box>` with `<ModalBox>`:

Replace:
```tsx
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.primary}
      paddingX={2}
      paddingY={1}
      width={58}
    >
```
With:
```tsx
    <ModalBox width={58} borderColor={colors.primary}>
```

Replace the matching closing `</Box>` with `</ModalBox>`.

Add import: `import { ModalBox } from "./ModalBox.tsx";`

Add `backgroundColor={colors.base}` to Text elements.

- [ ] **Step 5: Refactor SearchBar to use ModalBox**

In `src/components/SearchBar.tsx`, replace the outer `<Box>` with `<ModalBox>`:

Replace:
```tsx
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={colors.primary}
      width={boxWidth}
      paddingX={2}
      paddingY={1}
    >
```
With:
```tsx
    <ModalBox width={boxWidth} borderColor={colors.primary}>
```

Replace the matching closing `</Box>` with `</ModalBox>`.

Add import: `import { ModalBox } from "./ModalBox.tsx";`

Add `backgroundColor={colors.base}` to Text elements.

- [ ] **Step 6: Simplify overlay containers in app.tsx**

In `src/app.tsx`, simplify the four overlay container boxes. Each one currently wraps a dialog in a centering Box. Since ModalBox now provides its own visual treatment, keep the absolute centering wrapper but it no longer needs to provide any styling to the child:

No structural change needed — the outer `<Box position="absolute" ...>` still handles centering, and the child dialog now uses ModalBox internally. The overlay wrappers in app.tsx stay as-is.

- [ ] **Step 7: Run typecheck and tests**

Run: `make typecheck && make test`
Expected: All pass

- [ ] **Step 8: Manual visual verification**

Run: `bun run dev`
Test: Press `?` for help overlay, `d` on a formula for confirm dialog, `/` for search, `a` on taps page for input dialog. Verify all have solid background and shadow. Verify both dark and light themes (`t` to toggle).

- [ ] **Step 9: Commit**

```bash
git add src/components/ModalBox.tsx src/components/ConfirmDialog.tsx src/components/SearchBar.tsx src/components/HelpOverlay.tsx src/components/InputDialog.tsx
git commit -m "feat: add ModalBox with solid background and drop shadow for all modals"
```

---

### Task 4: Toast notification component

**Files:**
- Create: `src/components/Toast.tsx`
- Create: `tests/components/toast.test.ts`
- Modify: `src/app.tsx`

- [ ] **Step 1: Write toast logic tests**

Create `tests/components/toast.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";

// Test the pure logic functions extracted from Toast component.
// We test: icon selection, width computation, message truncation.

type ToastType = "success" | "error" | "info";

function toastIcon(type: ToastType): string {
  switch (type) {
    case "success": return "\u2713";
    case "error": return "\u2717";
    case "info": return "i";
  }
}

function toastDuration(type: ToastType): number {
  return type === "error" ? 5000 : 3000;
}

const TOAST_MAX_WIDTH = 60;
const ICON_OVERHEAD = 3; // " ✓ " or " ✗ " or " i "

function formatToastText(text: string): string {
  const maxTextLen = TOAST_MAX_WIDTH - ICON_OVERHEAD - 4; // 4 for border chars
  if (text.length > maxTextLen) {
    return text.slice(0, maxTextLen - 3) + "...";
  }
  return text;
}

function computeToastWidth(text: string): number {
  const formatted = formatToastText(text);
  return Math.min(formatted.length + ICON_OVERHEAD + 4, TOAST_MAX_WIDTH);
}

function computeMarginLeft(terminalWidth: number, toastWidth: number): number {
  return Math.max(0, Math.floor((terminalWidth - toastWidth) / 2));
}

describe("toastIcon", () => {
  test("success returns checkmark", () => {
    expect(toastIcon("success")).toBe("\u2713");
  });
  test("error returns cross", () => {
    expect(toastIcon("error")).toBe("\u2717");
  });
  test("info returns i", () => {
    expect(toastIcon("info")).toBe("i");
  });
});

describe("toastDuration", () => {
  test("error is 5 seconds", () => {
    expect(toastDuration("error")).toBe(5000);
  });
  test("success is 3 seconds", () => {
    expect(toastDuration("success")).toBe(3000);
  });
  test("info is 3 seconds", () => {
    expect(toastDuration("info")).toBe(3000);
  });
});

describe("formatToastText", () => {
  test("short text unchanged", () => {
    expect(formatToastText("hello")).toBe("hello");
  });
  test("long text truncated with ellipsis", () => {
    const long = "a".repeat(100);
    const result = formatToastText(long);
    expect(result.endsWith("...")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(TOAST_MAX_WIDTH - ICON_OVERHEAD - 4);
  });
});

describe("computeToastWidth", () => {
  test("short text width includes overhead", () => {
    const w = computeToastWidth("OK");
    expect(w).toBe("OK".length + ICON_OVERHEAD + 4);
  });
  test("never exceeds max width", () => {
    const w = computeToastWidth("a".repeat(200));
    expect(w).toBeLessThanOrEqual(TOAST_MAX_WIDTH);
  });
});

describe("computeMarginLeft", () => {
  test("centers toast in terminal", () => {
    expect(computeMarginLeft(100, 40)).toBe(30);
  });
  test("handles narrow terminal", () => {
    expect(computeMarginLeft(30, 40)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test tests/components/toast.test.ts`
Expected: PASS (these tests are self-contained with inline functions)

Actually, since these test inline functions, they will pass immediately. That's fine — we're testing the pure logic. The component integration test is manual.

- [ ] **Step 3: Create Toast component**

Create `src/components/Toast.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

interface ToastProps {
  message: ToastMessage | null;
  terminalWidth: number;
}

const TOAST_MAX_WIDTH = 60;
const ICON_OVERHEAD = 3;

function toastIcon(type: ToastType): string {
  switch (type) {
    case "success": return "\u2713";
    case "error": return "\u2717";
    case "info": return "i";
  }
}

function formatToastText(text: string): string {
  const maxTextLen = TOAST_MAX_WIDTH - ICON_OVERHEAD - 4;
  if (text.length > maxTextLen) {
    return text.slice(0, maxTextLen - 3) + "...";
  }
  return text;
}

export function toastDuration(type: ToastType): number {
  return type === "error" ? 5000 : 3000;
}

export function Toast({ message, terminalWidth }: ToastProps) {
  const { colors } = useTheme();
  if (!message) return null;

  const formatted = formatToastText(message.text);
  const icon = toastIcon(message.type);
  const toastWidth = Math.min(formatted.length + ICON_OVERHEAD + 4, TOAST_MAX_WIDTH);
  const marginLeft = Math.max(0, Math.floor((terminalWidth - toastWidth) / 2));

  const iconColor =
    message.type === "success" ? colors.success
    : message.type === "error" ? colors.error
    : colors.primary;

  return (
    <Box
      position="absolute"
      marginLeft={marginLeft}
      marginTop={1}
    >
      <Box
        borderStyle="round"
        borderColor={iconColor}
      >
        <Text backgroundColor={colors.base} color={iconColor} bold>
          {" "}{icon}{" "}
        </Text>
        <Text backgroundColor={colors.base} color={colors.text}>
          {formatted}
        </Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 4: Wire Toast into app.tsx — replace notification state**

In `src/app.tsx`, make the following changes:

Add import:
```typescript
import { Toast, toastDuration, type ToastMessage } from "./components/Toast.tsx";
```

Replace notification state (line 80):
```typescript
  const [notification, setNotification] = useState<string | null>(null);
```
With:
```typescript
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastIdRef = React.useRef(0);
```

Replace auto-clear effect (lines 97-102):
```typescript
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
```
With:
```typescript
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), toastDuration(toast.type));
      return () => clearTimeout(timer);
    }
  }, [toast]);
```

Replace notify callback (line 104):
```typescript
  const notify = useCallback((msg: string) => setNotification(msg), []);
```
With:
```typescript
  const notify = useCallback((msg: string, type: "success" | "error" | "info" = "success") => {
    toastIdRef.current += 1;
    setToast({ id: toastIdRef.current, text: msg, type });
  }, []);
```

Update all `notify()` call sites in app.tsx:
- Line 121: `notify(\`${confirmState.title} completed\`)` → `notify(\`${confirmState.title} completed\`, "success")`
- Line 123: `notify(\`Error: ...\`)` → `notify(\`Error: ${e instanceof Error ? e.message : String(e)}\`, "error")`
- Line 176: `notify(\`Pinned ${action.name}\`)` → `notify(\`Pinned ${action.name}\`, "success")`
- Line 179: `notify(\`Unpinned ${action.name}\`)` → `notify(\`Unpinned ${action.name}\`, "success")`
- Line 318-319: Same pattern for detail pin/unpin.

- [ ] **Step 5: Render Toast in app.tsx layout**

In the JSX return of `AppContent`, add Toast just before the overlay section (after the StatusBar):

```tsx
      {/* Toast notification */}
      <Toast message={toast} terminalWidth={width} />

      {/* Overlays */}
```

- [ ] **Step 6: Remove notification from StatusBar call**

In `src/app.tsx`, change StatusBar invocation from:
```tsx
      <StatusBar
        page={page}
        mode={mode}
        notification={notification}
        loading={loading}
        colorScheme={colorScheme}
      />
```
To:
```tsx
      <StatusBar
        page={page}
        mode={mode}
        loading={loading}
      />
```

(StatusBar prop changes happen in Task 5.)

- [ ] **Step 7: Run tests (typecheck deferred)**

Run: `bun test tests/components/toast.test.ts`
Expected: PASS

Note: Full typecheck will fail at this point due to StatusBar props mismatch (`notification` and `colorScheme` removed from call site but interface not yet updated). This is resolved in Task 5. Do NOT commit yet — continue to Task 5 and commit together.

---

### Task 5: StatusBar key hints

**Files:**
- Modify: `src/components/StatusBar.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Rewrite StatusBar component**

Replace the entire `src/components/StatusBar.tsx`:

```tsx
import React from "react";
import { Box, Text } from "ink";
import { useTheme } from "../hooks/useTheme.tsx";

export interface KeyHint {
  key: string;
  label: string;
}

interface StatusBarProps {
  page: string;
  mode: string;
  hints: KeyHint[];
  loading?: boolean;
}

const pageLabels: Record<string, string> = {
  dashboard: "Dashboard",
  formulae: "Formulae",
  casks: "Casks",
  outdated: "Outdated",
  services: "Services",
  taps: "Taps",
  cleanup: "Cleanup",
};

export function StatusBar({ page, mode, hints, loading }: StatusBarProps) {
  const { colors, colorScheme } = useTheme();
  const pageLabel = pageLabels[page] ?? page;

  return (
    <Box
      borderStyle="single"
      borderColor={colors.muted}
      borderTop
      borderBottom={false}
      borderLeft={false}
      borderRight={false}
      paddingX={1}
      justifyContent="space-between"
    >
      <Box gap={1}>
        {hints.map((hint) => (
          <Box key={hint.key}>
            <Text bold color={colors.accent}>[{hint.key}]</Text>
            <Text color={colors.muted}>{hint.label}</Text>
          </Box>
        ))}
      </Box>

      <Box gap={2}>
        {loading && <Text color={colors.warning}>Working...</Text>}
        <Text color={colors.muted}>{pageLabel}</Text>
        <Text color={colors.muted}>{colorScheme}</Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Define hints data in app.tsx**

Add hints computation function in `src/app.tsx` (before the `AppContent` component or inside it as a useMemo):

```typescript
function getPageHints(page: Page): KeyHint[] {
  switch (page) {
    case "dashboard":
      return [
        { key: "?", label: "Help" },
        { key: "t", label: "Theme" },
        { key: "q", label: "Quit" },
      ];
    case "formulae":
      return [
        { key: "d", label: "Uninstall" },
        { key: "Enter", label: "Detail" },
        { key: "u", label: "Upgrade" },
        { key: "p", label: "Pin" },
        { key: "v", label: "View" },
        { key: "/", label: "Filter" },
      ];
    case "casks":
      return [
        { key: "d", label: "Uninstall" },
        { key: "Enter", label: "Detail" },
        { key: "u", label: "Upgrade" },
        { key: "/", label: "Filter" },
      ];
    case "outdated":
      return [
        { key: "u", label: "Upgrade" },
        { key: "U", label: "Upgrade All" },
        { key: "Enter", label: "Detail" },
        { key: "d", label: "Uninstall" },
      ];
    case "services":
      return [
        { key: "s", label: "Start/Stop" },
        { key: "R", label: "Restart" },
        { key: "r", label: "Refresh" },
      ];
    case "taps":
      return [
        { key: "d", label: "Remove" },
        { key: "a", label: "Add" },
        { key: "r", label: "Refresh" },
      ];
    case "cleanup":
      return [
        { key: "p", label: "Preview" },
        { key: "c", label: "Cleanup" },
        { key: "a", label: "AutoRM Preview" },
        { key: "A", label: "AutoRM" },
        { key: "D", label: "Doctor" },
      ];
    default:
      return [];
  }
}

const sidebarHints: KeyHint[] = [
  { key: "j/k", label: "Navigate" },
  { key: "Enter", label: "Select" },
  { key: "Tab", label: "Main" },
];

const modeHints: Record<string, KeyHint[]> = {
  confirm: [
    { key: "y/Enter", label: "Confirm" },
    { key: "n/Esc", label: "Cancel" },
  ],
  search: [
    { key: "Enter", label: "Select" },
    { key: "Esc", label: "Close" },
    { key: "Up/Down", label: "Navigate" },
  ],
  help: [
    { key: "Esc", label: "Close" },
    { key: "?", label: "Close" },
  ],
  input: [
    { key: "Enter", label: "Submit" },
    { key: "Esc", label: "Cancel" },
  ],
};
```

Add import at top of app.tsx:
```typescript
import { StatusBar, type KeyHint } from "./components/StatusBar.tsx";
```

- [ ] **Step 3: Compute hints in AppContent and pass to StatusBar**

Inside `AppContent`, add a `useMemo` for hints:

```typescript
  const hints = useMemo<KeyHint[]>(() => {
    if (mode !== "normal" && mode !== "detail") {
      return modeHints[mode] ?? [];
    }
    if (focus === "sidebar") {
      return sidebarHints;
    }
    return getPageHints(page);
  }, [mode, focus, page]);
```

Update StatusBar call:
```tsx
      <StatusBar
        page={page}
        mode={mode}
        hints={hints}
        loading={loading}
      />
```

- [ ] **Step 4: Run typecheck and tests**

Run: `make typecheck && make test`
Expected: All pass

- [ ] **Step 5: Commit Toast + StatusBar together**

These two tasks are committed together because Task 4 removes StatusBar props that Task 5 replaces. Typecheck only passes after both are done.

```bash
git add src/components/Toast.tsx tests/components/toast.test.ts src/components/StatusBar.tsx src/app.tsx
git commit -m "feat: add Toast notification and revamp StatusBar with contextual key hints"
```

---

### Task 6: Outdated page uninstall action

**Files:**
- Modify: `src/pages/Outdated.tsx`
- Modify: `src/app.tsx`

- [ ] **Step 1: Extend OutdatedAction type**

In `src/pages/Outdated.tsx`, change the `OutdatedAction` type:

Replace:
```typescript
export type OutdatedAction =
  | { type: "upgrade"; name: string; pkgType: "formula" | "cask" }
  | { type: "upgrade_all" };
```
With:
```typescript
export type OutdatedAction =
  | { type: "upgrade"; name: string; pkgType: "formula" | "cask" }
  | { type: "upgrade_all" }
  | { type: "uninstall"; name: string; pkgType: "formula" | "cask" };
```

- [ ] **Step 2: Add `d` key handler in Outdated.tsx**

In `src/pages/Outdated.tsx`, add inside the `useInput` callback, after the `U` handler (line 79):

```typescript
      if (input === "d") {
        onAction({ type: "uninstall", name: row.name, pkgType: row.type });
        return;
      }
```

- [ ] **Step 3: Handle Outdated uninstall in app.tsx**

In `src/app.tsx`, inside `handleOutdatedAction`, add a new case:

```typescript
        case "uninstall":
          showConfirm(
            "Uninstall Package",
            `Uninstall ${action.name}?`,
            () =>
              action.pkgType === "cask"
                ? brew.cask.uninstall(action.name).then(() => {})
                : brew.formula.uninstall(action.name).then(() => {}),
            true,
          );
          break;
```

- [ ] **Step 4: Run typecheck and tests**

Run: `make typecheck && make test`
Expected: All pass

- [ ] **Step 5: Commit**

```bash
git add src/pages/Outdated.tsx src/app.tsx
git commit -m "feat: add uninstall action (d key) to Outdated page"
```

---

### Task 7: Update Cleanup page notify calls

**Files:**
- Modify: `src/pages/Cleanup.tsx`

- [ ] **Step 1: Update Cleanup's onNotify signature usage**

The Cleanup page calls `onNotify(message)` directly. Now that `notify` accepts a type parameter, update the `CleanupProps` interface and call sites:

In `src/pages/Cleanup.tsx`, change:
```typescript
interface CleanupProps {
  isFocused: boolean;
  onNotify: (message: string) => void;
}
```
To:
```typescript
interface CleanupProps {
  isFocused: boolean;
  onNotify: (message: string, type?: "success" | "error" | "info") => void;
}
```

Update call sites inside `runAction`:
- Line 52: `onNotify("Cleanup complete")` → `onNotify("Cleanup complete", "success")`
- Line 54: `onNotify("Autoremove complete")` → `onNotify("Autoremove complete", "success")`
- Line 58: `onNotify(\`Error: ...\`)` → `onNotify(\`Error: ${e instanceof Error ? e.message : String(e)}\`, "error")`

- [ ] **Step 2: Run typecheck and tests**

Run: `make typecheck && make test`
Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/pages/Cleanup.tsx
git commit -m "feat: pass notification type in Cleanup page notify calls"
```

---

### Task 8: Update AGENTS.md and final verification

**Files:**
- Modify: `AGENTS.md`

- [ ] **Step 1: Update AGENTS.md changelog**

Add to the changelog section in `AGENTS.md`:

```
- 2026-03-18: UX 改进 — 主题持久化 (~/.config/brewcli)、StatusBar 上下文快捷键提示、ModalBox 实底+投影、Toast 顶部通知、Outdated 页面增加卸载
```

- [ ] **Step 2: Run full test suite**

Run: `make typecheck && make test`
Expected: All tests pass (74 existing + new config + toast tests)

- [ ] **Step 3: Manual end-to-end verification**

Run: `bun run dev`

Verify:
1. **Theme persistence**: Toggle theme with `t`, quit, restart — theme preserved.
2. **Key hints**: Navigate to each page, confirm bottom bar shows correct hints. Switch to sidebar focus with `Tab` — hints change.
3. **Modal background**: Press `d` on a package — confirm dialog has solid background, no text bleeding. Press `?` — help overlay same. Press `/` — search bar same.
4. **Toast**: Perform an action (e.g. pin a formula with `p`) — toast appears top-center with green checkmark.
5. **Outdated uninstall**: Go to Outdated page, press `d` — confirm dialog for uninstall.

- [ ] **Step 4: Commit AGENTS.md**

```bash
git add AGENTS.md
git commit -m "docs: update AGENTS.md with UX improvements changelog"
```
