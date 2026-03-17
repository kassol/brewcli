# BrewCLI

Interactive Homebrew TUI built with Bun, TypeScript, and Ink.

`brewcli` aims to make common and awkward Homebrew workflows fast from the terminal: installed package browsing, dependency tracing, outdated package management, cask operations, services, taps, and maintenance tasks.

## Highlights

- Fast TUI workflow with keyboard-first navigation
- Formula and cask management from a single interface
- Separate outdated view with version diff and batch upgrade actions
- Formula intent filter: `all` / `intentional` / `dependency`
- Package detail view with info, dependency tree, and reverse dependency list
- Services and taps management pages
- Cleanup and maintenance page with dry-run previews
- Built-in SWR-style cache with TTL, background refresh, refreshing state, and manual refresh
- Compiles to a single binary with Bun

## Stack

- Bun
- TypeScript (strict)
- Ink + React 19
- Homebrew CLI JSON/text output
- bun:test

## Current Feature Set

### Pages

- `Dashboard` - formulae/casks/outdated/services/taps/cache overview
- `Formulae` - list, filter, sort, intentional/dependency toggle, install state, pin state
- `Casks` - list, filter, sort, upgrade state
- `Outdated` - installed -> available version comparison for formulae and casks
- `Detail` - package metadata, dependency tree, reverse dependencies
- `Services` - start, stop, restart
- `Taps` - list and remove taps
- `Cleanup` - cleanup, autoremove, doctor, cache size preview

### Interaction

- `/` global search
- `?` keyboard help overlay
- `Tab`, `h`, `l` focus switching
- `j`, `k`, `g`, `G` list navigation
- `r` manual refresh
- Background refresh indicator when cached data expires

## Caching Model

`brewcli` uses a module-level SWR-style cache in `src/hooks/useAsync.ts`.

- Cached data is shown immediately when available
- Stale data triggers background refresh while UI stays usable
- Pages display `refreshing...` while background refresh is running
- Manual refresh is available with `r`
- Mutating actions call `invalidateCache()` so mounted views re-fetch automatically

This keeps expensive Homebrew queries responsive without hiding freshness state.

## Development

### Requirements

- macOS with Homebrew installed
- Bun 1.3+

### Install dependencies

```bash
bun install
```

### Run locally

```bash
bun run dev
```

### Typecheck

```bash
make typecheck
```

### Test

```bash
make test
```

### Build a single binary

```bash
make build
./brewcli
```

### Install locally

```bash
make install
```

## Project Structure

```text
src/
  brew/         Homebrew command abstraction
  components/   Reusable TUI components
  hooks/        Async data and terminal hooks
  pages/        Route-level screens
tests/
  brew/         brew abstraction tests
  components/   component logic tests
  hooks/        cache and async tests
```

## Quality Gates

- `bunx tsc --noEmit`
- `bun test --timeout 60000`
- Bun single-binary build

At the moment the project has `74` passing tests.

## Roadmap

- Better install flows for search results and tap creation
- Multi-select upgrades from the outdated page
- More complete package detail metadata
- Additional pure logic tests around cache invalidation and refresh timing

## Contributing

See `CONTRIBUTING.md`.

## License

MIT
