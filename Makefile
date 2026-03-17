.PHONY: dev build install clean typecheck test

dev:
	bun run src/index.tsx

build:
	bun build --compile src/index.tsx --outfile brewcli --external react-devtools-core

install: build
	cp brewcli /usr/local/bin/brewcli

clean:
	rm -f brewcli

typecheck:
	bunx tsc --noEmit

test:
	bun test --timeout 60000
