# BrewCLI UX Improvements Design

**Date:** 2026-03-18
**Status:** Draft
**Scope:** Theme persistence, action discoverability, modal overlay, notification system

---

## Problem Statement

Four usability issues affecting the BrewCLI experience:

1. **Theme not persisted** — `T` key toggles theme at runtime, but preference is lost on restart.
2. **Actions not discoverable** — List views support `d` to uninstall, but users don't know without reading docs or pressing `?`.
3. **Modal dialogs transparent** — ConfirmDialog (and other modals) lack background fill; underlying text bleeds through.
4. **Notifications too subtle** — Toast in StatusBar right side, 3-second auto-dismiss, easy to miss.

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
function saveConfig(config: AppConfig): void; // Write file; auto-create directory
function getTheme(): ColorScheme;           // Priority: config > env > detect
function setTheme(scheme: ColorScheme): void; // Write to config
```

**Theme resolution priority chain (highest to lowest):**

1. `config.json` `theme` field
2. `BREWCLI_THEME` environment variable (backward compatible)
3. `COLORFGBG` terminal detection (existing `detectColorScheme()`)
4. Default `"dark"`

### Changes

- `useTheme.tsx`: Initialize with `getTheme()` instead of `detectColorScheme()`; call `setTheme()` on toggle.
- `theme.ts`: Keep `detectColorScheme()` as fallback — no changes.
- Error handling: Config file read/write failures silently degrade (stderr log), no impact on normal operation.

### Tests

- `tests/config.test.ts`: Read/write config, priority chain, auto-create directory, corrupt file degradation.

---

## 2. Action Discoverability — StatusBar Key Hints

### Design

Add a contextual key hints bar to StatusBar, similar to htop or midnight commander bottom bars.

**StatusBar layout change:**

```
Before: [page-name]                               [notification] [Working...]
After:  [page-name]  [d]Uninstall [i]Detail [u]Upgrade          [Working...]
```

Notifications move to a top-center Toast (see section 4). StatusBar space is freed for hints.

### StatusBar Changes

New prop: `hints: Array<{ key: string; label: string }>`

Each page provides its own hints based on current state and focus area.

**Hints per page (main focus):**

| Page      | Hints                                           |
|-----------|-------------------------------------------------|
| Dashboard | `[?]Help [T]Theme [q]Quit`                      |
| Formulae  | `[d]Uninstall [i]Detail [p]Pin [t]Filter [/]Search` |
| Casks     | `[d]Uninstall [i]Detail [/]Search`              |
| Outdated  | `[u]Upgrade [U]Upgrade All [i]Detail [d]Uninstall` |
| Services  | `[s]Start [x]Stop [r]Restart`                   |
| Taps      | `[d]Remove [a]Add`                              |
| Cleanup   | `[Enter]Run [d]Dry Run`                         |

When sidebar is focused, show navigation hints instead: `[j/k]Navigate [Enter]Select [Tab]Main`.

**Rendering style:**

- Key portion (`[d]`) in bold + accent color
- Label portion in dim color
- Separated by spaces
- Truncate from right when terminal width is insufficient (prioritize leftmost/most common operations)

### New Feature: Outdated Page Uninstall

The Outdated page currently lacks an uninstall action. Add `d` key binding to Outdated.tsx that triggers `onAction({ type: "uninstall", name })`, consistent with Formulae/Casks pages.

### Changes

- `StatusBar.tsx`: Add `hints` prop, render hint items, remove `notification` prop.
- `app.tsx`: Pass `hints` array to StatusBar based on current page and focus.
- `Outdated.tsx`: Add `d` key handler for uninstall action.
- `app.tsx`: Add Outdated uninstall handler (same pattern as Formulae).

### Tests

- StatusBar hint rendering and truncation logic.
- Outdated page uninstall action dispatch.

---

## 3. Modal Overlay — Solid Background + Drop Shadow

### Design

New component `src/components/ModalBox.tsx` wraps modal content with a solid background and terminal-style drop shadow.

**Problem root cause:** Ink's `position="absolute"` does not occlude underlying renders. The Box is transparent by default, so text from the layer below bleeds through the dialog.

**Solution:** Fill the dialog area with `backgroundColor` on every text line, and add a 1-character offset shadow block.

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
╰──────────────────────────────────────────────────╯▒
 ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒
```

**Implementation details:**

- Dialog body: Every `Text` line within the dialog gets `backgroundColor={colors.base}`, padded with spaces to fill the full width. This physically covers underlying content.
- Drop shadow: A second Box offset by (1, 1) rendered behind the dialog using `backgroundColor={colors.crust}` (darkest theme color). Shadow characters fill the right edge and bottom edge.
- Padding: `paddingX={3}`, `paddingY={1}` (increased from current paddingX=2).
- Background and shadow colors follow the active theme (dark/light).

### Scope

All modal-type overlays will use `<ModalBox>`:

- `ConfirmDialog` (mode=confirm)
- `SearchBar` (mode=search)
- `HelpOverlay` (mode=help)
- `InputDialog` (mode=input, if exists)

### Changes

- New file: `src/components/ModalBox.tsx`
- `ConfirmDialog.tsx`: Wrap content in `<ModalBox>`, remove own border/padding.
- `SearchBar.tsx`: Wrap in `<ModalBox>`.
- `HelpOverlay.tsx`: Wrap in `<ModalBox>`.
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

- `position="absolute"`, top-center, `marginTop={1}` (below any title bar area)
- Single-line display with rounded border
- Solid `backgroundColor` fill (same technique as ModalBox)
- Type icons: `✓` (success/green), `✗` (error/red), `i` (info/blue)

**Behavior:**

- success/info: 3-second auto-dismiss
- error: 5-second auto-dismiss (more reading time for errors)
- Queue: Show at most 1 toast at a time; new notification replaces current and resets timer
- No manual dismiss (not worth the interaction complexity in TUI)

### State Management Changes (app.tsx)

- Remove: `notification: string | null` state
- Add: `toasts: ToastMessage[]` state
- Change `notify` signature: `notify(text: string, type?: "success" | "error" | "info")`
- Update all existing `notify()` call sites to include type parameter:
  - Success operations: `notify("... completed", "success")`
  - Error catches: `notify("Error: ...", "error")`
  - Pin/unpin: `notify("Pinned ...", "success")`

### StatusBar Cleanup

- Remove `notification` prop from StatusBar
- Remove notification rendering logic from StatusBar.tsx
- StatusBar now handles: page label + key hints + loading indicator

### Changes

- New file: `src/components/Toast.tsx`
- `app.tsx`: Replace notification state with toast state, update notify function and all call sites.
- `StatusBar.tsx`: Remove notification prop and rendering.

### Tests

- Toast rendering for each type (success, error, info).
- Auto-dismiss timing logic.
- Queue replacement behavior.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `src/config.ts` | **New** | Config file read/write for theme persistence |
| `src/components/ModalBox.tsx` | **New** | Solid-background modal wrapper with drop shadow |
| `src/components/Toast.tsx` | **New** | Top-center toast notification component |
| `src/hooks/useTheme.tsx` | Modify | Use config for init/persist |
| `src/components/StatusBar.tsx` | Modify | Add hints prop, remove notification prop |
| `src/components/ConfirmDialog.tsx` | Modify | Wrap in ModalBox |
| `src/components/SearchBar.tsx` | Modify | Wrap in ModalBox |
| `src/components/HelpOverlay.tsx` | Modify | Wrap in ModalBox |
| `src/pages/Outdated.tsx` | Modify | Add `d` key uninstall action |
| `src/app.tsx` | Modify | Config init, hints routing, toast state, Outdated handler |
| `tests/config.test.ts` | **New** | Config module tests |
| `tests/components/toast.test.ts` | **New** | Toast component tests |

---

## Out of Scope

- Notification history / log
- Keyboard shortcut customization
- Config file migration tooling
- Animated transitions for toast appear/disappear
