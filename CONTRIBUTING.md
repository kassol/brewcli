# Contributing

Thanks for taking a look at `brewcli`.

## Development Flow

1. Install dependencies with `bun install`
2. Run the app with `bun run dev`
3. Run `make typecheck`
4. Run `make test`
5. Build with `make build` when changes affect packaging

## Expectations

- Keep Homebrew access inside `src/brew/`
- Prefer pure logic and testable helpers over ad hoc branching in pages
- Preserve keyboard-first UX
- Keep types strict; do not introduce `any`
- Add or update tests when behavior changes

## Project Notes

- UI state lives in `src/app.tsx`
- Data loading goes through `src/hooks/useAsync.ts`
- Mutations should invalidate cached data after success
- Long-running Homebrew commands should keep the UI responsive

## Pull Request Checklist

- Code is formatted and readable
- Typecheck passes
- Tests pass
- New behavior is documented in `README.md` or `AGENTS.md` when needed
