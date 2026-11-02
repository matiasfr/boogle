# Plan: stricter flags and a game-entity architecture

> **Status: approved, Part 1 done (2026-11-01).** Code read at `main` `8c4232d6`. This overrides the advice in
> [boogle-2-architecture-fit.md](boogle-2-architecture-fit.md) to hold foundation work until after the vertical slice.
> It doesn't change "instance pools, no ECS library" in [architecture.md](architecture.md).

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
and `late` phases, then render. That is the same structure as Unity's FixedUpdate, physics, Update, LateUpdate, and the
numeric `order` is its Script Execution Order. The gap is that nothing owns an object's state, body, mesh and lifetime.

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
import type { Object3D } from 'three/webgpu';
import type { Body } from '../physics/engine.ts';

export interface GameEntity {
  readonly id: string;
  readonly kind: string;
  mesh?: Object3D;
  body?: Body;
  preStep?(dt: number, now: number): void; // before physics: intent, remote poses
  postStep?(dt: number, now: number): void; // after physics: reactions to it
  update?(dt: number, now: number): void; // visual sync
  lateUpdate?(dt: number, now: number): void; // just before render
  dispose?(): void;
}

export function defineKind(kind: string, order: Partial<Record<EntityPhase, number>>): void;
export function spawn<T extends GameEntity>(entity: T): T; // adds mesh to the scene and body to the world
export function despawn(entity: GameEntity): void; // deferred to the end of the phase; removes both, then dispose()
```

Differences from the proposed interface, all deliberate:

- **`body?: Body`, not `RAPIER.RigidBody`:** keeps Rapier behind the facade. It also matches `createBody` and the existing
  `ball.body` and `me.body`.
- **`update(dt, now)`:** a superset of `update(dt)`, since many hooks read `now`. Nothing allocates per call.
- **Optional `mesh` and more phases:** some objects are invisible, and the current frame order needs all four phases.

**How it runs.** Each kind registers one hook per phase it uses, through the same ordered lists in `src/loop.ts`, and
that hook walks the kind's entities with an indexed loop. So entities interleave correctly with the camera and other
systems, the profiler shows one line per kind, and the documented order table still applies. `loop.ts` gains a
`preStep` phase, which replaces the four named calls in `main.ts` while keeping their order.

### File shape for one object

```
src/entities/ball/
  index.ts   builds the entity and spawns it; the only file that knows all three parts
  state.ts   body, ownership, claim and throw; no scene, DOM or HUD imports
  view.ts    mesh, texture, smoothing
  sync.ts    presence field and remote snapshots
```

Small objects can stay in one file until they have a reason to split.

### What is not an entity

- **Lockstep state:** stays in `src/sim/` and `src/world/rules/`. An adapter or view reads it. Sync kinds are unchanged,
  and physics is still never Lockstep.
- **Anything in the hundreds or thousands:** mushrooms, gifts, critters, fish and particles stay in instance pools. A
  pool is at most one entity. Per-object entities would break the frame budget.
- **Engine services:** see below.

### Entity or system

The rule follows the standard engines: **if it's something in the world or on screen with its own lifetime, it's an
entity. If it's a service other things call, it's a system on `onFrame`.**

| Thing | Unity | Unreal | Godot | Boogle |
| --- | --- | --- | --- | --- |
| Camera | [Camera component](https://docs.unity3d.com/2023.2/Documentation/Manual/class-Camera.html) | [`APlayerCameraManager`, an Actor](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/APlayerCameraManager?lang=en-US) | [`Camera3D` node](https://docs.godotengine.org/en/stable/classes/class_camera3d.html) | Entity |
| HUD | [UI Document component](https://docs.unity3d.com/6000.0/Documentation/Manual/UIE-create-ui-document-component.html) | [`AHUD`, an Actor](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/AHUD) | [`CanvasLayer` node](https://docs.godotengine.org/en/4.4/classes/class_canvaslayer.html) | Entity |
| Sky | [Global `RenderSettings`](https://docs.unity3d.com/ScriptReference/RenderSettings.html) | Not checked | [`WorldEnvironment` node](https://docs.godotengine.org/en/4.4/classes/class_node.html) | Entity, as ours owns meshes and lights |
| Engine services | [PlayerLoop systems](https://docs.unity3d.com/ScriptReference/LowLevel.PlayerLoop.html) | [`UTickableWorldSubsystem`](https://dev.epicgames.com/documentation/unreal-engine/API/Runtime/Engine/UTickableWorldSubsystem) | [Servers](https://docs.godotengine.org/en/stable/tutorials/performance/using_servers.html) | System on `onFrame` |

- **Entities, beyond gameplay objects:** the camera; the HUD and each UI screen (pause, hotbar, interact prompt, first-run
  card, welcome-back); sky and day-night; the sea surface; clouds; the throw preview; each critter pool. Their `mesh` and
  `body` are often empty, like Unreal's `AHUD`.
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
- A cycle check over all of `src/`, type imports excluded, in `npm run check` (`npm run cycles`, using `madge` as a dev
  dependency: ESLint alone can't see cycles without another plugin).

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

- [ ] **5. Research.** `docs/research/entity-architecture.md`, by deep-research subagent, with sources and numbered
      recommendations. Questions: lifecycles and tick ordering in Unity, Unreal and Godot; entity versus ECS for a small
      team; how networked games separate state from view; costs in a browser's frame budget. If it contradicts this plan,
      revise the plan and check with the owner before step 6.
- [ ] **6. Record the decision.** Binding rule in AGENTS.md ("A feature is a plug-in": new gameplay objects are entities),
      `docs/proposals/boogle-2.md`, `src/README.md`, and a status note in `boogle-2-architecture-fit.md`.

### Part 3: untangle infrastructure

Do this before the entity work: it's what delivers the separation.

- [ ] **7. Make `net.ts` infrastructure.**
      - Replace `renderPeople()` and `dom.netEl` calls with events `onPeopleChanged(fn)` and `onNetState(fn)`; `hud.ts`
        subscribes.
      - Replace direct `me` reads with a `setLocalPresence(source)` the player registers. Presence output is unchanged.
      - Move avatar creation and `animateAvatar` to `src/entities/remote-player/`, driven by peer join and leave events.
        `Remote` keeps network state only, with display objects in a map owned by the new module; update the importers.
      - Verify: `check:full`, `check:gpu`, `npm run load` before and after, a `/look` still of a remote avatar, `/code-review`.
      - Add the `src/net/`, `src/netplay/` and `src/world/` lint rule.
- [ ] **8. Break the remaining cycles.** Move shared player state (`me`, `cam` and pose helpers) to `src/player/state.ts`,
      imported by `input.ts`, `hands.ts`, `throw.ts`, `hud.ts` and `player.ts`. Have the ball's input and hand actions
      register with `registerAction` and `registerInteractable` from the ball side, so `input.ts` and `hands.ts` stop
      importing it. Have `hud.ts` read the interact target through an event or a getter that `hands.ts` registers. Verify:
      `npm run scenario -- world-inputs`, `/look` stills of carrying and throwing.
- [ ] **9. Add `npm run cycles`** to `check` once it reports zero. If `src/features/` or prototypes add cycles beyond the 12,
      fix them here. The `package.json` change goes in its own small PR.

### Part 4: entities

- [ ] **10. Entity core.** `src/entity/entity.ts` as designed, the `preStep` phase in `loop.ts`, and `dev/registry/scan.ts`
      taught to read kind orders so clashes still fail. Add no gameplay objects yet. Verify: `npm run check`, then
      `npm run hitches` and `npm run perf` unchanged.
- [ ] **11. The ball, as the worked example.** `src/physics/ball.ts` becomes `src/entities/ball/`. Keep the orders -300, -280
      and -300. Remove `resolveBallOwner` and `prepareBall` from `main.ts`. Update 18 importers plus `dev/` paths and doc
      citations (`npm run atlas -- --check`). Add the `src/physics/` and `state.ts` lint rules. Verify: `check:full`,
      `check:gpu`, a `/look` motion sheet of a thrown ball, and two-tab ownership hand-off.
- [ ] **12. The local player.** `player.ts` splits into state, controller and view, and the camera becomes its own entity
      kind at -200 (`src/player/camera.ts`). Remove `updateIntent` from `main.ts`. Keep the path of the `me` export stable from step 8. Verify: as step 11,
      with `/look` of movement, swimming and respawn. Then stop and have the owner play it before going on.
- [ ] **13. The Boogler.** `src/boogler/boogler.ts` becomes an entity, staying in its folder, host field `g` unchanged,
      `lines.ts` untouched. Verify: `/look`, and talking and riding work.
- [ ] **14. Remaining game objects, one PR per group:**
      - `src/pois/` windmills, lighthouse and caves. Static scenery uses `spawn` for lifecycle only, which is what chunk
        streaming will need for islands.
      - `src/features/track-machine.ts`, `src/features/hut-build.ts`, and the `src/adapters/mushroom-garden.ts` stall.
      - HUD and UI screens: `src/player/hud.ts`, then the pause, hotbar, prompt, first-run and welcome-back features.
      - World presentation: sky and day-night, sea surface, clouds, throw preview, critter pools.
      - Other non-prototype files that still own a body or mesh and a frame hook (21 files have both today, including the
        ones above), plus the remaining feature hooks, sorted by the rule in "Entity or system". Verify each with `/look`.
- [ ] **15. Close out.** Lint rules: outside `src/proto/` and `src/debug/`, `addBody` and `scene.add` go through `spawn`
      (allowlist the pools), and `onFrame` is allowed only in an allowlist of the systems above. Update `src/loop.ts`'s order table and comments, and
      `src/render/README.md` if it changed. Update `src/README.md`. Verify: `npm run check`, `npm run perf`, `npm run hitches`.

### Part 5: a headless engine for agents

Boogle has no level editor and doesn't need one. This part gives agents headless versions of what an editor gives humans.
Step 16 can start at any time, one PR per guard. Steps 17-21 follow step 12, because they need the state and view split.

- [ ] **16. Guards.** At over 900 commits a week, mechanical checks do the work review can't.
      - Code health: ESLint `max-lines` and `complexity` limits with today's offenders allowlisted, plus a duplication
        check. Boogler copy is exempt and never trimmed to pass.
      - Performance counts in CI: budgets for draw calls, triangles, frame hook count and bundle size. Start with a spike
        confirming the counts are stable under software rendering.
      - Automatic rollback: a failed live smoke test redeploys the last good build. It changes the deploy flow, so the
        owner approves its design first.
      - Live error triage: group `/report` errors and desyncs by build, and open an issue when a build brings a new one.
      - Visual diffs: compare stills at fixed poses, advisory only.
- [ ] **17. Headless runtime.** Run entity state and Rapier in Node, without three.js scene code or a GPU, faster than real
      time. Start with a spike confirming our Rapier build loads in Node. Add `npm run sim -- <name>` and port one multiplayer
      scenario to prove it. Compare with Unity's `-batchmode -nographics` and Godot's `--headless`.
- [ ] **18. Replication component.** An entity declares its sync kind and ownership. Extract claims and epochs from the ball
      so vehicles can share them. Presence keys stay literal so `npm run registry` sees them, and the wire doesn't change.
      Verify: `check:full`, `check:gpu`, two-tab ownership hand-off, `/code-review`.
- [ ] **19. Inspector.** A typed `inspect()` listing entities, their state and per-kind cost, working in the browser and
      headless, with `npm run inspect` on top. It replaces reads of the `window.boogle` grab bag.
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

- **Frame order is behaviour.** The table in `src/loop.ts` encodes real dependencies. Keep every order number when moving
  a hook, and change it only in its own commit.
- **Frame budget.** Target is 4 ms on a 2021 iPad, with a 4 KB per-frame allocation budget that `hitches` fails on. Entity
  iteration must allocate nothing, and step 10 has to show it.
- **Lockstep.** Steps 2-4 touch `src/sim/` and rules. A changed guard can alter a result and desync a room. The replay
  test and the server sharing this code are the checks.
- **`!` dilutes the flag.** Most of the 2,334 fixes will be `!`. The lasting value is in new code and in wire and save data.
- **Churn and conflicts.** Step 3 touches about 207 files, and later moves touch 18 to 63 importers each. Only
  `claude/concept-images` is in flight today, so now is cheap, but other agents should run `npm run inflight` and avoid
  overlapping folders while Parts 1 and 3 land.
- **Tooling coupling.** `dev/` scenarios import `/src/...` paths directly (`player.ts` 21 times, `ball.ts` 8), and 21 docs
  cite these files. Each move updates them. Keeping `src/player/player.ts` as the player's composition point limits this.
- **Lazy loading.** Eager rules still apply: anything registering sync state stays eager. `spawn` from a lazy module must
  slot in by kind order, like lazy `onFrame` hooks do.
- **Owner gate.** Steps touching `src/netplay/`, `src/world/`, `src/sim/`, `server/`, `eslint.config.js` or `package*.json`
  wait for the owner's approval if shipped by anyone else's account.
- **Opportunity cost.** This delays the vertical slice's find-the-fun work. Parts 1 and 3 can pause cleanly between PRs; so
  can Part 4 after step 12.

## Decided by the owner (2026-11-01)

1. **Prototypes (12,845 lines, 44 `onFrame` calls)** get the flag fixes, and become entities only when promoted to the real
   game.
2. **`onFrame` follows the standard engines**, not the current code: services stay on it, and anything in the world or on
   screen becomes an entity ("Entity or system"). Step 5's research can revise where individual things land.
