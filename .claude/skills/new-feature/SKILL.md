---
name: new-feature
description: Scaffold a new plug-in feature in src/features/ (auto-loaded, own CSS and DOM, frame hooks from src/loop.js). Use when adding a self-contained feature to the game.
argument-hint: '<name> [what it does]'
---

Create the feature `$0` (kebab-case file name). Description: $ARGUMENTS

1. Read DESIGN.md and say which principle the feature serves (and any it bends). If shared state is involved, read `src/world/README.md` first.
2. Look at an existing plug-in for the pattern (`src/features/boogler.js` is a good small one) and the hook docs at the top of `src/loop.js`.
3. Create `src/features/$0.js`:
   - a one-line comment saying what it does;
   - `import './$0.css';` only if it needs styles, in `src/features/$0.css`;
   - DOM created in JS (append to `.hud` or `body`), never added to `index.html`;
   - per-frame work via `onFrame(fn, { phase, order })`, startup via `onStart(fn)`.
4. Bigger logic goes in its own module (`src/<name>.js`, or `src/sim/<name>.js` if it is pure shared logic with a unit test in `test/`). Shared state goes through `registerOp`/`registerState` in `src/world/sync.js` and must be deterministic.
5. Don't edit `src/main.js`, `src/style.css` or `index.html` beyond a line or two. Add or tick a PLAN.md item if the feature is on the roadmap.
6. Run `npm run check`, then tell the user how to try it (`npm run dev`, two tabs).
