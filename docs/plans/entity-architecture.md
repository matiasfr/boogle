# Plan: stricter flags and a game-entity architecture

> **Status: approved, Parts 1 to 4 done (2026-11-02); Part 5 open.** Design cites [the entity research](../research/entity-architecture.md). Code read at `main` `8c4232d6`. This overrides the advice in
> [boogle-2-architecture-fit.md](boogle-2-architecture-fit.md) to hold foundation work until after the vertical slice.
> It doesn't change "instance pools, no ECS library" in [architecture.md](architecture.md). It also overrides "don't
> propose untangling the knot before the slice" in [engine-architecture.md](../research/engine-architecture.md), check 9.
> That report argues for cheap rules now and against large refactors (Tony Hawk's move to components took two years). The
> owner heard this and chose to migrate now, so step 12 is a checkpoint: the owner plays the result before the rest moves.

## Goal

Turn on every requested compiler flag, give gameplay objects one shape and lifecycle (`GameEntity`), and make the
boundaries between simulation, game objects, presentation and infrastructure lint-enforced. Serves DESIGN.md,
"Understandable at a glance" and "Small and readable". Bends nothing in the play principles; no player-visible change
and no wire change.

## Where we are

**Sound today, keep as is:** `src/sim/` and `src/world/rules/` import no three.js, physics or DOM code, and lint enforces
it. `src/world/*.ts` imports no three.js, render, physics, player or feature code. Rapier stays behind `engine.ts`.

**The real problems:**

- At least 12 runtime import cycles, all through `net.ts`, `player.ts`, `hud.ts`, `hands.ts`, `input.ts`, `throw.ts`,
  `ball.ts`, with the two adapters caught in two of them. This counts only what `main.ts` statically reaches, so it
  excludes `src/features/`.
- 23 files build a physics body and a mesh by hand, each with its own setup and teardown.
- `main.ts` calls the ball and player by name before the physics step, so core objects aren't plug-ins.
- `ball.ts` sits in `physics/` but holds a canvas texture, the mesh, input-related calls and netcode.
- `net.ts` knows about avatars, the HUD and the local player. `Remote` mixes network state with display objects.
- `server/` isn't in `tsconfig.json`'s `include`, so its 12 files are only checked when something imports them, and CI
  never runs `npm run typecheck`.

**`onFrame` is already an update loop.** `main.ts` runs the pre-step work, the physics step, then the `world`, `update`
and `late` phases, then render. The pre-step section runs once a frame, like Unreal's `TG_PrePhysics`. The match for Unity's
`FixedUpdate` is `onPreStep`, which runs 0 to 4 times a frame. The numeric `order` is Unity's Script Execution Order. The gap
is that nothing owns an object's state, body, mesh and lifetime.

## Design

### Layers

| Layer | Lives in | May import |
| --- | --- | --- |
| Simulation | `src/sim/`, `src/world/rules/` | Itself only (already enforced) |
| Infrastructure | `src/loop.ts`, `src/entity/`, `src/net/`, `src/netplay/`, `src/world/`, `src/physics/`, core of `src/render/`, `src/ui/` | Simulation, other infrastructure |
| Game objects | `src/entities/`, `src/player/`, `src/boogler/`, `src/adapters/`, `src/pois/` | Simulation, infrastructure |
| Presentation | `view.ts` files beside each object, HUD | Reads game objects; nothing in a `state.ts` imports it |
| Features | `src/features/` | Anything except other features |

`src/island/` terrain, `src/constants.ts` and the math modules count as shared infrastructure.

### The entity

```ts
// src/entity/entity.ts
export interface GameEntity {
  readonly id: string; // local only, never a network id
  readonly kind: string;
  alive: boolean;
  mesh?: Object3D;
  bodies?: readonly Body[]; // from engine.ts, never RAPIER.RigidBody
  fixedPre?(ctx: FrameCtx): void; // each physics step, 0 to 4 times a frame; ctx.dt is FIXED
  fixedPost?(ctx: FrameCtx): void;
  prePhysics?(ctx: FrameCtx): void; // once a frame, before the step: intent, remote poses
  postPhysics?(ctx: FrameCtx): void; // once a frame, after it: reactions to physics
  update?(ctx: FrameCtx): void; // visual sync
  lateUpdate?(ctx: FrameCtx): void; // just before render
  dispose?(): void;
}

// One order per method a kind uses. Literal, so the registry can read it. Module top level only.
export function defineKind(kind: string, orders: Partial<Record<EntityPhase, number>>): void;
export function spawn<T extends GameEntity>(entity: T): T;
export function despawn(entity: GameEntity): void;
```

**The owner chose methods on the entity (2026-11-02), the Unity shape,** over the research's timing rows per kind. Where an
object needs two slots in one phase, it becomes two kinds, as a Unity object has several components: the ball needs
`postPhysics` at -300 and -280, and `prePhysics` on either side of the player's intent, so it's `ball` and `ball-carry`, sharing
one `state.ts`.

Differences from the first proposal:

- **`bodies`, not `RAPIER.RigidBody`:** keeps Rapier behind the facade, and some objects own several bodies.
- **`ctx`, not `dt`:** seven hooks read `elapsed`, including the camera, and moving an `onFrame` hook becomes a copy.
- **`alive`:** a stale reference is otherwise a silent zombie. Walkers skip dead entities, so hooks don't have to check.

**Lifecycle contract, at the top of `entity.ts`:**

- `spawn(e)` takes a finished entity and adds its mesh and bodies now. Set the pose in the factory. It throws if the entity has a
  method its kind declares no order for, which would otherwise never run.
- First call: the next walk of that phase to start after the spawn, this frame or next. Walkers cache the length first.
- `despawn(e)` is idempotent and sets `alive = false` at once. Teardown runs at the end of the phase, and `dispose` last.
- `defineKind` and anything with no unregister (`onPreStep`, `addPresenceField`, `onRemotePresence`) run once per kind at module
  top level, never per instance.
- No `start` and no `enable`: the module graph and `onStart` do that job now the cycles are gone. Add `active` with streaming.
- A method that throws: catch, `reportError`, and turn off that kind's phase. A missing kind beats a frozen game.

**How it runs.** Each kind registers one hook per phase it uses, through the same ordered lists in `src/loop.ts`, and that hook
walks the kind's entities. So entities interleave correctly with the camera and other systems, the profiler shows one line per
kind and phase, and the documented order table still applies. `loop.ts` gains `prePhysics`, `fixedPre` and `fixedPost`. Dispatch
isn't worth optimizing: 300 entities of 30 kinds cost about 17 µs a frame, under 2 % of today's, and one draw call costs about
200 update calls.

### File shape for one object

```
src/entities/ball/
  index.ts   builds the entities and spawns them; its methods call the three parts. Only a glob in main.ts imports it
  state.ts   body, authority (mine, held), `pose` (today's disp), claim and throw, surf; no scene, DOM or HUD imports
  view.ts    mesh, texture, smoothing
  sync.ts    who owns it, per-peer claims and snapshots, the `b` field, the wire shape
  headless.ts  spawns state and sync with no view, for `npm run sim`; index.ts imports it and adds the view (step 17)
```

Importers use `state.ts`, or they'd pull in the view and the DOM. Rules: one writer of `pose` per frame; view reads state and
never writes it; state never imports view; an authority flip is one code path. Small objects can stay in one file until they
have a reason to split. Large ones move as one blob first, then split, so a feel regression is easy to bisect.

### What is not an entity

- **Lockstep state:** stays in `src/sim/` and `src/world/rules/`. An adapter or view reads it. Sync kinds are unchanged,
  and physics is still never Lockstep.
- **Anything in the hundreds or thousands:** mushrooms, gifts, critters, fish and particles stay in instance pools. A
  pool is at most one entity. The reason is draw calls, not update calls.
- **Engine services:** see below.

### Entity or system

The rule follows the standard engines: **if it's something in the world or on screen with its own lifetime, it's an
entity. If it's a service other things call, it's a system on `onFrame`.**

| Thing | Unity | Unreal | Godot | Boogle |
| --- | --- | --- | --- | --- |
| Camera | [Camera component](https://docs.unity3d.com/2023.2/Documentation/Manual/class-Camera.html) | [`APlayerCameraManager`, an Actor](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/APlayerCameraManager?lang=en-US) | [`Camera3D` node](https://docs.godotengine.org/en/stable/classes/class_camera3d.html) | Entity |
| HUD screen | [UI Document component](https://docs.unity3d.com/6000.0/Documentation/Manual/UIE-create-ui-document-component.html) | UMG widgets on the Player Controller, not Actors ([`AHUD`](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AHUD) is a canvas Actor) | [`CanvasLayer` node](https://docs.godotengine.org/en/4.4/classes/class_canvaslayer.html) | Entity |
| Sky | [Global `RenderSettings`](https://docs.unity3d.com/ScriptReference/RenderSettings.html) | `ASkyAtmosphere`, an Actor | [`WorldEnvironment` node](https://docs.godotengine.org/en/stable/classes/class_worldenvironment.html) | Entity, as ours owns meshes and lights |
| Engine services | [PlayerLoop systems](https://docs.unity3d.com/ScriptReference/LowLevel.PlayerLoop.html) | [`UTickableWorldSubsystem`](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UTickableWorldSubsystem) | [Servers](https://docs.godotengine.org/en/stable/tutorials/performance/using_servers.html) | System on `onFrame` |

- **Entities, beyond gameplay objects:** the camera; each UI screen (pause, hotbar, interact prompt, first-run card,
  welcome-back), with widgets staying plain DOM; sky and day-night; the sea surface; clouds; the throw preview; each critter
  pool. Their `mesh` and `bodies` are often empty.
- **Systems that stay on `onFrame`:** the particle simulation behind `emit()`, the lights pool, the glTF animation mixer,
  the presence send, the lockstep tick driver, gamepad polling and adaptive resolution.
- **Deviation:** Boogle has no scene tree or editor, so a feature file spawns its entities directly, and `order` replaces
  engine tick groups. A feature stays the plug-in unit.
- **Prototypes:** keep using `onFrame` directly until they're promoted.

### Wire and sync

No wire change. Presence keys (`b`, `g` and the rest), ops and states keep their names and shapes, so there is no
`WORLD_NS` bump. `addPresenceField` and `addHostField` keep literal keys so `npm run registry` still sees them.

### Boundaries in lint

Added as each step makes them pass, in `eslint.config.js`:

- `src/net/`, `src/netplay/`, `src/world/`: no `three`, `render/`, `player/`, `entities/`, `boogler/` or `features/`.
- `src/physics/`: no `player/`, `netplay/`, `entities/` or `features/`.
- `src/entities/*/state.ts`: no `render/`, `ui/` or `player/hud.ts`, and no `document` or `window`.
- `npm run registry` carries an import-knot ratchet ([engine-architecture.md](../research/engine-architecture.md), check 9):
  today's two strongly connected components are allow-listed and a new member fails. It uses `dev/scan/read.ts`, with no
  new dependency, and its allow-list shrinks to empty in Part 3.

## Steps

Each step is one PR that leaves `npm run check` green and ships with `npm run ship`. Steps 2-3 can run in parallel by
folder; later steps run in order, because they share files.

### Part 1: flags

- [x] **1. Free flags.** `tsconfig.json`: add `noImplicitOverride`, `noFallthroughCasesInSwitch` and an explicit
      `useUnknownInCatchVariables` (0 errors). Add `server/**/*.ts` to `include` (0 errors). Add `npm run typecheck` to CI's
      `client` job: until now only `npm run check` ran it, so a branch that skipped `ship` was never type-checked. Verify:
      `npm run check`, `npm --prefix server test`.
- [x] **2. `noUncheckedIndexedAccess` in the lockstep code.** `src/sim/` (126 errors), `src/world/rules/` (32), then the
      other 2 in `src/world/` by hand. Add a real guard only where a value can truly be missing, and never change a
      result. Verify: `npx tsc --noEmit --noUncheckedIndexedAccess | grep -E '^src/(sim|world)'` is empty,
      `test/world-replay.test.ts` passes, `npm run check:full`, `/code-review`.
- [x] **3. The same flag everywhere else, one PR per group:**
      - Core: `src/loop.ts` 11, `net/` 1, `netplay/` 35, `physics/` 32, `player/` 29, `render/` 55, `ui/` 1, `boot/` 2.
        Add `check:full` and `check:gpu`.
      - Game: `features/` 300, `pois/` 219, `boogler/` 73, `island/` 71, `adapters/` 59, `guest/` 149, `debug/` 36.
      - Prototypes: `proto/` 557, `protos/` 20.
      - Tooling: `dev/` 265, `test/` 205, `atlas/` 51, `scripts/` 1, `server/` 2.
      - Fix rule: `!` where the index is loop-bounded or a fixed tuple (it's erased at build, so no hot-path cost); a real
        guard where the index or key comes from the wire, a save, user input or a lookup. Don't reword or remove any
        Boogler line.
- [x] **4. Flip it.** Add `noUncheckedIndexedAccess` to `tsconfig.json`, and fix whatever parallel work added since. Verify:
      `npm run check`.

### Part 2: foundation

- [x] **5. Research.** `docs/research/entity-architecture.md`, by deep-research subagent, with sources and numbered
      recommendations. [engine-architecture.md](../research/engine-architecture.md) already covers layering, budgets and
      review, so this doesn't repeat it. Questions: object lifecycle and tick ordering in Unity, Unreal and Godot, and in web
      engines (PlayCanvas, Needle); how to split state and view in networked games (Photon Fusion, Unreal replication);
      how to migrate incrementally without a long freeze; costs in a browser's frame budget. Done: the direction holds, and
      its details are folded into this plan.
- [x] **6. Record the decision.** `docs/proposals/boogle-2.md`, with notes in `boogle-2-architecture-fit.md` and
      `engine-architecture.md`. The binding AGENTS.md rule ("new gameplay objects are entities") lands with step 11, once
      `spawn` exists.

### Part 3: untangle infrastructure

Do this before the entity work: it's what delivers the separation.

- [x] **7. Make `net.ts` infrastructure.** ([#427](https://github.com/matiasfr/boogle/pull/427)) `src/netplay/net.ts` ends with no value import from `three`, `render/`,
      `physics/` or `player/`. No wire change, and frame orders stay as they are.
      - `Remote` becomes an `interface` holding network fields only. `src/entities/remote-player/index.ts` adds `avatar`,
        `body`, `label`, `labelText`, `target`, `yaw`, `speed`, `prevPos` and `ride` with `declare module` (erased at build).
        Features keep reading `r.avatar` and `r.target` unchanged, so this needs no churn in their files. Those fields are a
        bridge: they go when remote players become entities in step 14.
      - Add `onPeerAdded(r)` and `onPeerRemoved(r)`, fired synchronously when a peer's `Remote` is created and removed, and
        one for a peer leaving the island. The new module sets up its fields there and takes over `dropRemoteBody`.
      - Move into the new module: the `riding` field and its hook, `placeRider`, `updateRemotes`, avatar and label
        creation, and the update -280 hook. `main.ts` calls `updateRemotes` from there (one line).
      - Replace the `me` reads with `setLocalPresence(source)`, which `player.ts` registers. Presence output is unchanged.
      - Replace `renderPeople()` and `dom.netEl` with a new `onPeopleChanged(fn)` and the existing `onNetState(fn)`. `hud.ts`
        subscribes.
      - Move `SUN_DIR` out of `src/constants.ts`, so `net.ts` doesn't reach three through it.
      - Add the lint rule for `src/netplay/`. `src/player/identity.ts` is exempt: it imports only `src/sim/` and `src/net/`.
      - Verify: `check:full`, `check:gpu`, `npm run load` before and after, a `/look` still of a remote avatar, `/code-review`.
- [x] **8. Break the big knot.** ([#450](https://github.com/matiasfr/boogle/pull/450)) Move `me`, `cam` and pose helpers to `src/player/state.ts`, `dom` to `src/player/dom.ts`, and
      `input` and `inputState` to `src/player/input-state.ts`. Old paths re-export them. `enterIsland` calls a new `peopleChanged()`
      from `net.ts`. Those three leaf modules make the graph one-way. Evaluation order is the risk: compare actions,
      interactables and frame hooks before and after, built and dev. Verify: scenarios, `/look` of carrying and throwing.
- [x] **9. Empty the knot ratchet's allow-list.** ([#455](https://github.com/matiasfr/boogle/pull/455)) Includes `src/pois/caves/{index,decor}.ts`, by moving the shared ambient code to
      `ambient.ts`.

### Part 4: entities

- [x] **10. Entity core.** ([#467](https://github.com/matiasfr/boogle/pull/467))
      - First, in its own commit: pin today's `onPreStep` and `onPostStep` order in numbers, before anything moves. They run in
        registration order today, and `main.ts:34` installs the player's controller last.
      - Check the API on paper against the player, the Boogler, `hut-build.ts` and the mushroom stall before freezing it.
      - `src/entity/entity.ts` as designed, with the lifecycle contract as its header comment.
      - `src/loop.ts`: `prePhysics`, `fixedPre` and `fixedPost` phases, and a dev assert that `onFrame` throws if called mid-frame.
        `main.ts` fills `ctx` before `prePhysics` (it fills it after the step today).
      - Tools: `dev/scan/read.ts` and `dev/registry/scan.ts` read kind orders so clashes still fail; `dev/look/hitches.ts` and `prof`
        name each kind and phase (`hitches` keys on `url:line`, so kinds would otherwise share a row).
      - Tests (owner's exception to the test diet, 2026-11-02; add it to AGENTS.md): spawn and despawn during a walk, double
        despawn, a throwing method. One Node test imports every `src/entities/*/state.ts`.
        Each test file opens with a comment marking it as this exception: it exists so agents can catch walker ordering bugs
        they can't see in a still, and it's no precedent for testing features.
      - No gameplay objects yet. Verify: `npm run check`, then `hitches` and `perf` unchanged.
- [x] **11. The ball and `ping`, as the worked examples.** ([#482](https://github.com/matiasfr/boogle/pull/482), [#483](https://github.com/matiasfr/boogle/pull/483), the ratchet in the PR that ticks this.) Still to do: the fresh-agent test in the last line, which the coordinator runs before step 12.
      - `src/physics/ball.ts` becomes `src/entities/ball/`, as kinds `ball` and `ball-carry`. Surf and friction leave
        `physics.ts:197-235` for a `fixedPre` method, with `document.hidden` passed in. `resolveBallOwner` and `prepareBall` leave
        `main.ts`. `bump.ts`'s write to `pose` goes through a state function, and `placeBall`'s mesh write becomes a `snap` counter.
      - `src/features/ping.ts` too: the ball, player and Boogler never despawn, so this exercises the lifecycle.
      - Keep the orders. Update 22 importers plus `dev/` paths and doc citations (`npm run atlas -- --check`).
      - Ratchet now, not at the end: lint rules for `addBody`, `scene.add` and `onFrame`, using ESLint bulk suppressions for today's
        offenders, and `npm run registry` prints the count left. Add the `src/physics/` and `state.ts` rules (allow type imports).
      - The binding rule goes in AGENTS.md, a few lines pointing at the ball, and `/new-feature` changes in the same PR.
      - Verify: `check:full`, `check:gpu`, a `/look` motion sheet of a thrown ball, two-tab ownership hand-off, and lines of code no
        more than about 1.3 times today's. Then give a fresh agent the docs and a small new object: did it land in one PR, pass
        lint first time and match the ball? If not, fix the API before step 12.
- [x] **12. The local player, as one blob.** ([#510](https://github.com/matiasfr/boogle/pull/510)) `player.ts` and its part of `installStepHooks` become one entity with no behaviour
      change. The camera becomes its own kind at -200. Remove `updateIntent` from `main.ts`. Keep the `me` export path stable. Verify:
      as step 11, with `/look` of movement, swimming and respawn. The owner's call (2026-11-02): don't stop here, the owner plays
      at the end. Still to do: split its state and view, and the camera's.
- [x] **13. The Boogler, as one blob.** `src/boogler/boogler.ts` (726 lines) becomes an entity, staying in its folder, host field
      `g` unchanged, `lines.ts` untouched. Verify: `/look`, and talking and riding work. Still to do: split its state and view.
- [x] **14. Remaining game objects, one PR per group:** ([#497](https://github.com/matiasfr/boogle/pull/497), [#499](https://github.com/matiasfr/boogle/pull/499), [#501](https://github.com/matiasfr/boogle/pull/501), [#504](https://github.com/matiasfr/boogle/pull/504), [#505](https://github.com/matiasfr/boogle/pull/505), [#506](https://github.com/matiasfr/boogle/pull/506), [#507](https://github.com/matiasfr/boogle/pull/507), [#508](https://github.com/matiasfr/boogle/pull/508), [#512](https://github.com/matiasfr/boogle/pull/512), [#514](https://github.com/matiasfr/boogle/pull/514), [#515](https://github.com/matiasfr/boogle/pull/515), [#516](https://github.com/matiasfr/boogle/pull/516), [#517](https://github.com/matiasfr/boogle/pull/517))
      - Remote players: `updateRemotes` and their `onPreStep` target at `physics.ts:123-135` move. Part of the `declare module` bridge
        remains on `Remote` (`avatar`, `target`, `yaw`, `speed`, `ride`, `player`) because about 15 files read it. `installStepHooks` and its call in `main.ts` went.
      - `src/pois/` windmills, lighthouse and caves. Static scenery uses `spawn` for lifecycle only, which is what chunk
        streaming will need for islands.
      - `src/features/track-machine.ts`, `src/features/hut-build.ts`, and the `src/adapters/mushroom-garden.ts` stall.
      - World presentation: sky and day-night, sea surface, clouds, throw preview, critter pools.
      - Other non-prototype files that still own a body or mesh and a frame hook, plus the remaining feature hooks, sorted by the
        rule in "Entity or system". Verify each with `/look`.
      - Last: `first-run` and `welcome-back`, which gain a real lifetime, then `hud`, `pause`, `hotbar` and `prompt`, one entity per
        screen. If the migration runs long, leave these on the allow-list.
- [x] **15. Close out.** Delete the remaining suppressions and any that are left stale. What remains is on purpose: `src/pois/` (20), which the home redesign replaces, and `src/player/player.ts` (2), its body and avatar arriving at `enterIsland`. Update `src/loop.ts`'s order table and
      comments, `src/render/README.md` if it changed, and `src/README.md`. Verify: `npm run check`, `npm run perf`, `npm run hitches`.

**Waiting:** the player's and Boogler's state and view splits (steps 12 and 13, "still to do") wait for the owner's playthrough.

**Pause or stop when:** the owner reports a feel regression twice in one object (fix the pattern first); the suppression count hasn't
fallen in two weeks of active work (finish, or call the rest legacy until touched); or the slice needs the hands. With the ratchet in
place, a pause after any PR is clean: new code is entities, old code is listed. One owner runs Part 4.

### Part 5: a headless engine for agents

Boogle has no level editor and doesn't need one. This part gives agents headless versions of what an editor gives humans.
Step 16 can start at any time, one PR per guard. Steps 17-21 follow step 12, because they need the state and view split.

- [ ] **16. Guards.** (Done: assets check, lint boundaries, knot ratchet and nightly counts, [#414](https://github.com/matiasfr/boogle/pull/414), [#416](https://github.com/matiasfr/boogle/pull/416), [#417](https://github.com/matiasfr/boogle/pull/417), [#426](https://github.com/matiasfr/boogle/pull/426). Hook objects stay out of the counts: unstable on software rendering.) At over 900 commits a week, mechanical checks do the work review can't. These follow
      [engine-architecture.md](../research/engine-architecture.md), "Recommendations".
      - `npm run assets -- --check` in CI's `client` job (`typecheck` went in with step 1).
      - Freeze three boundaries in ESLint: `src/world/` and `src/net/` stay headless; `src/proto/` and `src/debug/` stay lazy;
        one socket, one audio context, one loop.
      - The import-knot ratchet in `npm run registry`.
      - Nightly counts on SwiftShader as a JSON artifact: draw calls, shadow draws, shader programs, first-load gzip, hook
        objects. Counts only, since headless times mean nothing. Nobody has tried this in Actions yet.
      - Live error triage: group `/report` errors and desyncs by build, and open an issue when a build brings a new one.
      - Visual diffs: compare stills at fixed poses, advisory only.
      - Dropped: automatic rollback (owner, 2026-11-02: not a live service yet; revisit before public playtests).
      - Dropped: `max-lines`, `complexity` and a duplication tool. The report lists file length under "Don't flag" (DESIGN.md
        chose plain modules), and its reviewer reads for duplicate paths (check 10).
- [x] **17. Headless runtime.** ([#519](https://github.com/matiasfr/boogle/pull/519), [#520](https://github.com/matiasfr/boogle/pull/520), [#522](https://github.com/matiasfr/boogle/pull/522)) `npm run sim -- <name>` ([dev/sim/README.md](../../dev/sim/README.md)) runs entity state and Rapier in Node with no scene code or GPU. Works: the same Rapier WASM,
      the real ground, the ball at about 800x real time and within 1 mm of the browser on land, the lockstep rules, and a two-process ball hand-off through a real local server.
      An entity joins by having a `headless.ts`, with its view left to `index.ts` as its own kind. Not yet: the player (one blob with its mesh, so `me.body` is null), every other
      entity, most features, and static colliders other than the ground, which are built with what draws them.
- [x] **18. Replication component.** `sync.ts` minus the ball's wire shape: the claim rule, latest claim and snapshots per peer, the
      orphan pick, the mode switch, and sampling into `pose` with the extrapolation cap. `held`, carry, surf and respawn stay with the
      object, and `snap` is an additive field. Entity `id` isn't a network id. Presence keys stay literal. Verify: `check:full`,
      `check:gpu`, two-tab ownership hand-off, `/code-review`.
- [x] **19. Inspector.** A typed `inspect()` listing entities, their state and per-kind cost, working in the browser and
      headless, with `npm run inspect` on top. It replaces reads of the `window.boogle` grab bag, which move over as agents
      touch them.
- [ ] **20. Blueprints and a level validator.** Typed blueprints for reusable objects and levels, building on `Site`, stamps
      and layout files. A check in `npm run check` catches unreachable areas, overlaps, bad slopes and budget overruns.
      Cites `docs/research/level-design.md`.
- [ ] **21. Input replay.** Record a session's inputs to a file, replay them headless on a new build, and compare state.
- [ ] **22. Runtime systems, only when the game needs them.**
      - Streaming and LOD: design before era 3 starts ([architecture.md](architecture.md), phase 4).
      - Animation state machine: with the hero character.
      - Audio mixer in core: with music.

**Not building:** a visual editor, visual scripting, a material or node-graph UI, a full ECS, a plug-in marketplace, or
console and native export.

## Risks

- **Frame order is behaviour.** The table in `src/loop.ts` encodes real dependencies, and `onPreStep` and `onPostStep` have no
  numbers until step 10 pins them. Keep every order when moving a hook, and change it only in its own commit.
- **Player feel.** The owner has just said today's direct controller is right, and it runs in the fixed step, so step 12 is the riskiest
  move. That's why it goes as one blob, with its order pinned first.
- **Frame budget.** The lowest target device is now an M4 iPad Pro (decision log), and whether the 4 ms budget stands is
  open (ledger AR-3). `hitches` fails over 3.2 KB of hook objects a frame. Walking entities must add no objects a frame, and step
  10 has to show it.
- **Lockstep.** Steps 2-4 touch `src/sim/` and rules. A changed guard can alter a result and desync a room. The replay
  test and the server sharing this code are the checks.
- **`!` dilutes the flag.** Most of the 2,334 fixes will be `!`. The lasting value is in new code and in wire and save data.
- **Churn and conflicts.** Step 3 touches about 207 files, and later moves touch 18 to 63 importers each. Only
  `claude/concept-images` is in flight today, so now is cheap, but other agents should run `npm run inflight` and avoid
  overlapping folders while Parts 1 and 3 land.
- **Tooling coupling.** `dev/` scenarios import `/src/...` paths directly (`player.ts` 21 times, `ball.ts` 8), and 21 docs
  cite these files. Each move updates them. Keeping `src/player/player.ts` as the player's composition point limits this.
- **Lazy loading.** Eager rules still apply: anything registering sync state stays eager. A lazy `spawn` lands between frames by
  language rules. The real hazard is registering from inside a hook, which step 10's dev assert catches.
- **Owner gate.** Steps touching `src/netplay/`, `src/world/`, `src/sim/`, `server/`, `eslint.config.js` or `package*.json`
  wait for the owner's approval if shipped by anyone else's account.
- **Opportunity cost.** This delays the vertical slice's find-the-fun work. Parts 1 and 3 can pause cleanly between PRs; so
  can Part 4 after step 12.

## Decided by the owner (2026-11-01 and 02)

1. **Prototypes (12,845 lines, 44 `onFrame` calls)** get the flag fixes, and become entities only when promoted to the real
   game.
2. **`onFrame` follows the standard engines**, not the current code: services stay on it, and anything in the world or on
   screen becomes an entity ("Entity or system"). Step 5's research can revise where individual things land.
3. **Entities have methods** (`update` and the rest), not the research's timing rows per kind. A second slot in a phase means a second
   kind.
4. **The entity loop gets a few unit tests,** an exception to the test diet.
5. **No automatic rollback yet.**
