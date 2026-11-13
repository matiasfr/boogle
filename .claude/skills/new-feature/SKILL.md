---
name: new-feature
description: Scaffold a new plug-in feature in src/features/ (auto-loaded, own CSS and DOM, entities from src/entity/entity.ts). Use when adding a self-contained feature to the game.
argument-hint: '<name> [what it does]'
---

Create the feature `$0` (kebab-case file name). Description: $ARGUMENTS

docs/agents/plugins.md has the rules; this is the order to apply them in.

1. Say which DESIGN.md principle the feature serves (and any it bends; ask before bending one).
2. Pick a sync kind for each piece of state (docs/agents/sync.md, "Pick a sync kind"). Lockstep: follow the four-file recipe in
   `src/world/rules/README.md` instead of steps 3-4, then come back for 5-6.
3. Copy the shape of a small plug-in: `src/features/ping.ts` (a thing in the world, an action + room messages),
   `src/features/honk.ts` (an action + room messages),
   `src/features/gifts.ts` (interactables + a lockstep adapter). Create `src/features/$0.ts` (TypeScript, strict; docs/agents/typescript.md)
   with a header comment saying what it does, which sync kind each piece of state uses and the principle it serves;
   `import './$0.css'` only if it needs styles; DOM built in JS; `onStart` from `src/loop.ts`.
   A thing in the world or on screen with its own lifetime is an entity (`src/entity/entity.ts`): `defineKind` and `spawn`,
   copying `src/features/ping.ts` (many short-lived ones, in this file) or `src/entities/ball/` (long-lived, its own folder:
   `index.ts`, `state.ts`, `view.ts`, `sync.ts`). Lint fails a new `onFrame`, `addBody` or `scene.add` outside the services
   on the allow-list in `dev/lint/policy.ts`.
   New placed world content starts with `npm run prefab:new -- <area>.<name>`: put records and placements in
   `src/content/`, procedural visuals in `src/prefab/builders/`, and call `src/prefab/instantiate.ts` under the owner's
   `OwnedView`. Colliders and seats come from the record. Run `npm run prefabs` and commit the JSON artifacts.
   Never grow `dev/lint/prefab-debt.json`; file entries and per-file violation counts only shrink. Lower the count
   when removing legacy imports/calls. New prefab-folder wrappers cannot import the creation APIs either.
4. Wire it through the registries, not new listeners: `registerAction` for any key/pad/touch control (on a slot from
   `npm run registry -- --json`; one must stay unclaimed for `src/features/updates.ts`, so if that's the only one free,
   stop and report that there's no slot: no key-only controls), `registerInteractable` for things the interact button acts on, `emit` for particles,
   `addPresenceField`/`addHostField` for shared values (getter returns `null` when off).
5. Pure logic worth a test goes in `src/sim/$0.ts` with `test/$0.test.ts`. Don't import another feature; move shared
   code into `src/`. Hotspot files (`src/main.ts`, `src/style.css`, `index.html`): a line or two at most. Tick or add
   a box in docs/plans/find-the-fun.md if it's listed there, and update or add its file in `docs/game-design/` (AGENTS.md).
6. `npm run check` (`check:full` for lockstep or net changes). For anything visible, `/look` it. Tell the user how to
   try it (`npm run dev`, two tabs with the same `?room=`).
