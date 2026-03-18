# BrewCLI UX Improvements Design

**Date:** 2026-03-18
**Status:** Draft
**Scope:** Theme persistence, action discoverability, modal overlay, notification system

---

## Problem Statement

Four usability issues affecting the BrewCLI experience:

1. **Theme not persisted** — `t` key toggles theme at runtime, but preference is lost on restart.
2. **Actions not discoverable** — List views support `d` to uninstall, but users don't know without reading docs or pressing `?`.
3. **Modal dialogs transparent** — ConfirmDialog (and other modals) lack background fill; underlying text bleeds through.
4. **Notifications too subtle** — Notification in StatusBar right side, 3-second auto-dismiss, easy to miss.

---

## 1. Theme Persistence

### Design

New module `src/config.ts` manages a JSON config file at `~/.config/brewcli/config.json`.

**Config structure:**

```json
{
  "theme": "dark"
}
```

**Public API:**

```typescript
interface AppConfig {
  theme?: "dark" | "light";
}

function loadConfig(): AppConfig;           // Read file; return {} if missing/corrupt
function saveConfig(config: AppConfig): void; // Write file; auto-create directory; silent on failure (stderr log only)
function getTheme(): ColorScheme;           // Priority: env > config > detect
function setTheme(scheme: ColorScheme): void; // Write to config; silent on failure
```

**Theme resolution priority chain (highest to lowest):**

1. `BREWCLI_THEME` environment variable (explicit override for CI/scripting — existing behavior preserved)
2. `config.json` `theme` field (interactive user preference)
3. `COLORFGBG` terminal detection (existing `detectColorScheme()`)
4. Default `"dark"`

Rationale: `BREWCLI_THEME` stays highest because it's the documented escape hatch for non-interactive environments. A user who sets it in their shell profile expects it to win over any GUI toggle.

### Error Handling

`saveConfig` and `setTheme` are fire-and-forget. On failure (permissions, disk full, read-only FS), they log to stderr and return silently. No user-facing notification — the toggle still works for the current session, it just won't persist. This avoids coupling `config.ts` to the React notification system.

### Changes

- New file: `src/config.ts`
- `useTheme.tsx`: Initialize with `getTheme()` instead of `detectColorScheme()`; call `setTheme()` on toggle.
- `theme.ts`: Keep `detectColorScheme()` as fallback — no changes.

### Theme Color Token Additions

The ModalBox (section 3) needs `base` and `crust` colors not currently in the palette. Add them to the theme:

```typescript
// Catppuccin Mocha (dark)
base: "#1E1E2E",   // main background
crust: "#11111B",  // darkest, used for shadows

// Catppuccin Latte (light)
base: "#EFF1F5",   // main background
crust: "#DCE0E8",  // darkest, used for shadows
```

Update `Colors` interface, `darkColors`, and `lightColors` in `theme.ts`.

### Tests

- `tests/config.test.ts`: Read/write config, priority chain, auto-create directory, corrupt file degradation.

---

## 2. Action Discoverability — StatusBar Key Hints

### Design

Add a contextual key hints bar to StatusBar, similar to htop or midnight commander bottom bars.

**StatusBar layout change:**

```
Before: [mode-hints]                      [notification] [Working...] [page] [theme]
After:  [page-hints]                                     [Working...] [page] [theme]
```

The existing `keyHints: Record<string, string>` (keyed by mode: normal/search/detail/confirm/help/input) is replaced by per-page, per-focus hint arrays. Notifications move to a top-center Toast (see section 4).

### StatusBar Changes

Remove: `notification` prop, `keyHints` map.
Add: `hints: Array<{ key: string; label: string }>` prop.
Keep: `loading`, `page` props.
Remove: `colorScheme` prop — StatusBar already has `useTheme()`, so it reads `colorScheme` directly from the hook instead of receiving it as a prop.

Each page provides its own hints based on current state and focus area.

**Hints per page (main focus) — verified against actual key bindings:**

| Page      | Hints                                                         |
|-----------|---------------------------------------------------------------|
| Dashboard | `[?]Help [t]Theme [q]Quit`                                    |
| Formulae  | `[d]Uninstall [Enter]Detail [u]Upgrade [p]Pin [v]View [/]Filter` |
| Casks     | `[d]Uninstall [Enter]Detail [u]Upgrade [/]Filter`             |
| Outdated  | `[u]Upgrade [U]Upgrade All [Enter]Detail [d]Uninstall`        |
| Services  | `[s]Start/Stop [R]Restart [r]Refresh`                         |
| Taps      | `[d]Remove [a]Add [r]Refresh`                                 |
| Cleanup   | `[p]Preview [c]Cleanup [a]Autoremove Preview [A]Autoremove [D]Doctor` |

When sidebar is focused, show navigation hints instead: `[j/k]Navigate [Enter]Select [Tab]Main`.

When mode is not `normal` (e.g. confirm, search, help, input), override with mode-specific hints:
- confirm: `[y/Enter]Confirm [n/Esc]Cancel`
- search: `[Enter]Select [Esc]Close [Up/Down]Navigate`
- help: `[Esc]Close [?]Close`
- input: `[Enter]Submit [Esc]Cancel`

**Rendering style:**

- Key portion (`[d]`) in bold + accent color
- Label portion in dim color
- Separated by spaces
- Truncate from right when terminal width is insufficient (prioritize leftmost/most common operations)

### New Feature: Outdated Page Uninstall

The Outdated page currently lacks an uninstall action. Add `d` key binding to Outdated.tsx.

The `OutdatedAction` type union needs a new variant: `{ type: "uninstall"; name: string; pkgType: "formula" | "cask" }`. The handler in `app.tsx` routes to `brew.formula.uninstall()` or `brew.cask.uninstall()` based on `pkgType`, same pattern as the Detail page uninstall handler.

### Changes

- `StatusBar.tsx`: Replace `keyHints` map and `notification` prop with `hints` prop; keep `colorScheme` display.
- `app.tsx`: Compute `hints` array based on current page, focus, and mode; pass to StatusBar.
- `Outdated.tsx`: Add `d` key handler for uninstall; extend `OutdatedAction` type.
- `app.tsx`: Add Outdated uninstall handler.

### Tests

- StatusBar hint rendering and truncation logic.
- Outdated page uninstall action dispatch.

---

## 3. Modal Overlay — Solid Background + Drop Shadow

### Design

New component `src/components/ModalBox.tsx` wraps modal content with a solid background and terminal-style drop shadow.

**Problem root cause:** Ink's `position="absolute"` does not occlude underlying renders. The Box is transparent by default, so text from the layer below bleeds through the dialog.

**Solution:** Fill the dialog area with `backgroundColor` on every text line, and render a drop shadow using JSX ordering.

```typescript
interface ModalBoxProps {
  width: number;
  children: React.ReactNode;
  borderColor?: string;
}
```

**Visual structure:**

```
╭──────────────────────────────────────────────────╮
│                                                  │
│   Uninstall Formula                              │
│                                                  │
│   Uninstall wget? This will remove the package   │
│   and may leave orphaned dependencies.           │
│   This action may be hard to undo.               │
│                                                  │
│   [Enter / Y] Confirm    [Esc / N] Cancel        │
│                                                  │
╰──────────────────────────────────────────────────╯░
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

**Implementation details:**

- **Dialog body:** Every `Text` line within the dialog gets `backgroundColor={colors.base}`, padded with spaces to fill the full width. This physically covers underlying content.
- **Drop shadow:** Rendered as space characters with `backgroundColor={colors.crust}`. JSX render order: shadow Box first, then dialog Box (later JSX = higher layer in Ink's absolute stacking). The shadow is offset by (1, 1) — one character right and one row down from the dialog's position.
- **Padding:** `paddingX={3}`, `paddingY={1}` (increased from current paddingX=2).
- **Background and shadow colors** follow the active theme (dark/light) via `colors.base` and `colors.crust` (see section 1 for new color tokens).

### Scope

All modal-type overlays use `<ModalBox>`:

- `ConfirmDialog` (mode=confirm)
- `SearchBar` (mode=search)
- `HelpOverlay` (mode=help)
- `InputDialog` (mode=input)

### Changes

- New file: `src/components/ModalBox.tsx`
- `src/theme.ts`: Add `base` and `crust` color tokens (see section 1).
- `ConfirmDialog.tsx`: Wrap content in `<ModalBox>`, remove own border/padding.
- `SearchBar.tsx`: Wrap in `<ModalBox>`.
- `HelpOverlay.tsx`: Wrap in `<ModalBox>`.
- `InputDialog.tsx`: Wrap in `<ModalBox>`.
- `app.tsx`: Modal container boxes can be simplified since ModalBox handles positioning.

### Tests

- ModalBox rendering with different widths and border colors.

---

## 4. Notification System — Top-Center Toast

### Design

Replace the StatusBar notification with a dedicated top-center Toast component.

**New component: `src/components/Toast.tsx`**

```typescript
interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error" | "info";
  timestamp: number;
}

interface ToastProps {
  messages: ToastMessage[];
  width: number;  // terminal width, for centering
}
```

**Visual design:**

```
         ╭─ ✓ Uninstall Formula completed ─╮
         ╰──────────────────────────────────╯
```

- `position="absolute"`, top of screen, `marginTop={1}`
- **Centering:** Toast has a fixed max width of `60` characters. Horizontal centering via computed `marginLeft={Math.floor((terminalWidth - toastWidth) / 2)}`. Toast width = `min(textLength + 6, 60)` — the `+6` accounts for icon+spacing (`" ✓ "` = 3 chars) and border overhead (`"╭─ "` + `" ─╮"` = 3 chars left + right, but Ink's `borderStyle="round"` handles this automatically so only icon spacing matters in content width).
- Single-line display with rounded border
- Solid `backgroundColor={colors.base}` fill (same technique as ModalBox)
- Type icons: `✓` (success/green), `✗` (error/red), `i` (info/blue)
- Long messages truncated with `...` to fit max width

**Behavior:**

- success/info: 3-second auto-dismiss
- error: 5-second auto-dismiss (more reading time for errors)
- Queue: Show at most 1 toast at a time; new notification replaces current and resets timer
- No manual dismiss (not worth the interaction complexity in TUI)

### State Management Changes (app.tsx)

- Remove: `notification: string | null` state
- Add: `toasts: ToastMessage[]` state (array for future extensibility, but display logic only shows index 0)
- Change `notify` signature: `notify(text: string, type?: "success" | "error" | "info")`
- Update all existing `notify()` call sites to include type parameter:
  - Success operations: `notify("... completed", "success")`
  - Error catches: `notify("Error: ...", "error")`
  - Pin/unpin: `notify("Pinned ...", "success")`
  - Cleanup: `notify("Cleanup complete", "success")`, etc.

### StatusBar Cleanup

- Remove `notification` prop from StatusBar
- Remove notification rendering logic from StatusBar.tsx
- StatusBar now handles: key hints + loading indicator + page label + colorScheme indicator

### Changes

- New file: `src/components/Toast.tsx`
- `app.tsx`: Replace notification state with toast state, update notify function and all call sites.
- `StatusBar.tsx`: Remove notification prop and rendering.

### Tests

- Toast rendering for each type (success, error, info).
- Auto-dismiss timing logic — **use fake timers** (`mock.module` / timer mocks in bun:test) to avoid slow/flaky real-timer tests.
- Queue replacement behavior.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/config.ts` | **New** | Config file read/write for theme persistence |
| `src/components/ModalBox.tsx` | **New** | Solid-background modal wrapper with drop shadow |
| `src/components/Toast.tsx` | **New** | Top-center toast notification component |
| `src/theme.ts` | Modify | Add `base` and `crust` color tokens to palette and interface |
| `src/hooks/useTheme.tsx` | Modify | Use config for init/persist |
| `src/components/StatusBar.tsx` | Modify | Replace keyHints/notification with hints prop |
| `src/components/ConfirmDialog.tsx` | Modify | Wrap in ModalBox |
| `src/components/SearchBar.tsx` | Modify | Wrap in ModalBox |
| `src/components/HelpOverlay.tsx` | Modify | Wrap in ModalBox |
| `src/components/InputDialog.tsx` | Modify | Wrap in ModalBox |
| `src/pages/Outdated.tsx` | Modify | Add `d` key uninstall action, extend OutdatedAction type |
| `src/app.tsx` | Modify | Config init, hints routing, toast state, Outdated handler |
| `tests/config.test.ts` | **New** | Config module tests |
| `tests/components/toast.test.ts` | **New** | Toast component tests (fake timers) |

---

## Out of Scope

- Notification history / log
- Keyboard shortcut customization
- Config file migration tooling
- Animated transitions for toast appear/disappear
