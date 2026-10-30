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
   - per-frame work via `onFrame(fn, { phase, order })`, startup via `onStart(fn)`;
   - something players act on with the interact button (E, pad B, the touch action button) registers a provider with `registerInteractable(fn)` from `src/hands.js`: `fn()` returns the targets in reach now (`[]` for none), each `{ id, verb, at, r?, run | blocked, show? }`. The contract is at the top of `src/hands.js`. Don't add another key for it.
4. Bigger logic goes in its own module (`src/<name>.js`, or `src/sim/<name>.js` if it is pure shared logic with a unit test in `test/`). Shared state first picks a sync kind from DESIGN.md's table ("Pick how each feature shares state"), then uses its API: Owner is `addPresenceField` + `onRemotePresence`, Host is `addHostField` (both in `src/net.js`, smoothed with `createSnaps` from `src/snaps.js`), and Lockstep is `registerOp`/`registerState`/`onTick` in `src/world/sync.js` and must be deterministic. Physics is never Lockstep.
5. Don't edit `src/main.js`, `src/style.css` or `index.html` beyond a line or two. Add or tick a PLAN.md item if the feature is on the roadmap.
6. Run `npm run check`, then tell the user how to try it (`npm run dev`, two tabs).
