# Headless runs

`npm run sim -- <name>` runs `dev/sim/<name>.ts` in Node: the game's own state and Rapier, with no browser, GPU or scene code, many times faster than real time. Use it to test gameplay without the shared Mac GPU. It isn't a replacement for `npm run look`, which is how you see a change.

`dev/sim/hooks.ts` does for Node what Vite does for the browser, with no change to game code: it loads Rapier's WASM (the same files the browser runs) and expands `import.meta.glob` and `import.meta.env`.

## Runs

- `drop`: Rapier alone, a ball dropped on a floor.
