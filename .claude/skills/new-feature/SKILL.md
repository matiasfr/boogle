---
name: new-feature
description: Scaffold a new plug-in feature in src/features/ (auto-loaded, own CSS and DOM, frame hooks from src/loop.js). Use when adding a self-contained feature to the game.
argument-hint: '<name> [what it does]'
---

Create the feature `$0` (kebab-case file name). Description: $ARGUMENTS

AGENTS.md has the rules; this is the order to apply them in.

1. Say which DESIGN.md principle the feature serves (and any it bends; ask before bending one).
2. Pick a sync kind for each piece of state (AGENTS.md, "Pick a sync kind"). Lockstep: follow the four-file recipe in
   `src/world/rules/README.md` instead of steps 3-4, then come back for 5-6.
3. Copy the shape of a small plug-in: `src/features/honk.js` (an action + room messages), `src/features/bump.js` (an
   action on Owner state), `src/features/gifts.js` (interactables + a lockstep adapter). Create `src/features/$0.js`
   with a header comment saying what it does, which sync kind each piece of state uses and the principle it serves;
   `import './$0.css'` only if it needs styles; DOM built in JS; `onFrame`/`onStart` from `src/loop.js`.
4. Wire it through the registries, not new listeners: `registerAction` for any key/pad/touch control (pick from
   `freeSlots()`), `registerInteractable` for things the interact button acts on, `emit` for particles,
   `addPresenceField`/`addHostField` for shared values (getter returns `null` when off).
5. Pure logic worth a test goes in `src/sim/$0.js` with `test/$0.test.mjs`. Don't import another feature; move shared
   code into `src/`. Hotspot files (`src/main.js`, `src/style.css`, `index.html`): a line or two at most. Tick or add
   a PLAN.md item if it is on the roadmap, and update its section of `docs/game-design.md` (AGENTS.md).
6. `npm run check` (`check:full` for lockstep or net changes). For anything visible, `/look` it. Tell the user how to
   try it (`npm run dev`, two tabs with the same `?room=`).
