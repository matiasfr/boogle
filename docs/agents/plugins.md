Before adding or changing feature/entity lifecycle, DOM ownership or loading, read this plug-in contract.

## A feature is a plug-in

**New placed things in the world are prefab records.** Start with `npm run prefab:new -- <area>.<name>`, author
`src/content/prefabs/` and `src/content/levels/`, then instantiate through `src/prefab/instantiate.ts` under the
owning entity's `OwnedView`. Procedural visuals live in `src/prefab/builders/`; collider and seat recipes live in
the record. Commit the compiled JSON (`npm run prefabs`). Existing hand-built files are explicit shrink-only debt
in `dev/lint/prefab-debt.json`; never add an exemption or raise its violation count, and lower the count when
removing legacy imports/calls. Signs/interactions join this enforcement in prefab step 9.

`src/features/<name>.ts`, auto-loaded by `src/main.ts`. Frame work goes in an entity's methods (below), or `onFrame(fn, { phase, order })` only for a service on the allow-list; one-time setup in `onStart(fn)` (`src/loop.ts` lists phases and taken orders; features use `order` -10 and up). CSS in `src/features/<name>.css`, imported by the feature; DOM built in JS (append to `.hud` or `body`), never in `index.html`. Heavy or rarely used parts (far-off decor, dialogue, debug tools) load with a dynamic `import()` from the small eager feature file ("Lazy parts" in `src/loop.ts`); never lazy: sync ops or state, `src/world/rules/`, or anything visible in the first seconds. Hotspots (`src/main.ts`, `src/style.css`, `index.html`, `src/world/rules/index.ts`): a line or two at most. Plain modules (TypeScript); a new dependency needs a reason in the commit.

**New things in the world or on screen are entities** (`src/entity/entity.ts`): copy `src/entities/ball/` (long-lived) or `src/features/ping.ts` (short-lived). Services other things call stay on `onFrame` (the allow-list in `dev/lint/policy.ts`), and prototypes stay on it until promoted. Importing an entity: game code imports its `state.ts`; presentation code may also import its `view.ts`; only `main.ts`'s glob imports its `index.ts`. Lint fails a new `onFrame`, `addBody` or `scene.add` elsewhere; what's left of the old way is listed in `lint-suppressions.json`, which only shrinks. Never add to it. When you remove one, `npm run lint -- --prune-suppressions`.

**Owned behaviours:** share two matching implementations with the same ownership contract in `src/components/<name>/{state,view}.ts`, creating only needed files; keep a single owner's helper beside it. Cite both owners (the name-label proof serves remote-player and the arrival preview). Use typed factories with explicit dependencies and owner calls/disposal; no component walker, lookup bag, base class or registration. State stays render-free, views are browser-only, and stateless work stays a function; see [the convention and proof](../plans/entity-components.md).
