.PHONY: dev build install clean typecheck test

dev:
	bun run src/index.tsx

build:
	NODE_ENV=production bun build --compile --target=bun src/index.tsx --outfile brewcli

install: build
	cp brewcli /usr/local/bin/brewcli

clean:
	rm -f brewcli

typecheck:
	bunx tsc --noEmit

test:
	bun test --timeout 60000
