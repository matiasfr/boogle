# Entity architecture: what to copy, and what to change in the plan

_2026-11-01. How Unity, Unreal, Godot, PlayCanvas and Needle define an object's lifecycle and tick order, how networked
games split state from view, how long migrations finish, and what an update call costs in a browser. For the builders of
[entity-architecture.md](../plans/entity-architecture.md), steps 7 to 18. Code and plan read at `54f5e2d4`. It builds on
[engine-architecture.md](engine-architecture.md) (layering, budgets, drift, review) and
[coop-physics-vehicles-netcode.md](coop-physics-vehicles-netcode.md) (ownership and authority) and doesn't repeat them. The
owner has decided to migrate, so this doesn't re-argue that._

Markers: **[V]** read the primary source, or the file at this commit. **[F]** fetched, but through a translation, an
abstract or a secondary write-up. **[S]** search result or community source only. **[M]** measured here. Web pages went
through a fetch tool that extracts passages, so [V] means the relevant passages. Of the 72 source rows in
[notes/entity-architecture/](notes/entity-architecture/), 53 are [V], 10 [F], 5 [S] and 4 couldn't be read.

## Summary

The direction holds. Every engine I read keeps objects with a lifecycle apart from services, runs phases around physics, and
orders by something like a number per kind. Walking hooks per kind, a pool as one entity, no scene tree and the ball first all
stand. Seven details should change before step 10:

1. **The entity shape can't express the ball.** `defineKind` allows one order per phase. The ball needs `world` -300 and
   -280, and two pre-step slots with the player's intent between them. Declare hooks as rows on the kind.
2. **`preStep` is not `FixedUpdate`, and the fixed step is missing.** `FixedUpdate` is `onPreStep`, which runs 0 to 4 times a
   frame. The player's controller and the ball's surf live there, no step moves them, and moving them silently changes their
   order.
3. **Dispatch isn't worth designing around.** A call costs 10 to 15 ns. Thirty kinds and 300 entities with two hooks each cost
   about 17 µs, under 2 % of today's frame. A draw call costs about 200 update calls.
4. **Pass `ctx`, not `(dt, now)`.** Seven hooks read `elapsed`, including the camera, and the plan's signature drops it.
5. **The first three migrated objects never die,** so the lifecycle goes unexercised until step 14. Migrate `ping.ts` with the
   ball.
6. **The ratchet comes too late.** The rule reaches AGENTS.md at step 11 and lint at step 15, at about 160 merges a day. Every
   source on finishing migrations says stop new usage first.
7. **`ball.disp` is gameplay state, not view.** It belongs in `state.ts`, and importers should import that, not `index.ts`.

To act on this, read this summary, "Rows" in section 2, and the last two lists. The rest is the evidence.

## 1. Lifecycle

| | Create, then ready | Made mid-frame, first tick | Destroy |
|---|---|---|---|
| **Unity** | Awake, then Start once Awake has run on every object in the scene [V] | From Update: Awake and Start before the end of the frame; Start just before its first Update [V] | After the current Update loop, before rendering [V] |
| **Unreal** | `SpawnActor` runs construction through BeginPlay; `SpawnActorDeferred` lets you set up first [V] | Ticks register in BeginPlay [V]; `TG_NewlySpawned` catches them [V], re-run after each group [S] | Out of the level's actor array at once; EndPlay; memory at the next GC [V] |
| **Godot** | `_enter_tree` parent first, `_ready` children first [V] | The loop runs over a copy of the group, so this frame or next [V] | `queue_free`: end of frame after deferred calls, safe to repeat [V]; flushed after both the physics and idle passes [V] |
| **PlayCanvas** | `initialize` when enabled, `postInitialize` when all have initialized [V] | `create` initializes at once; updates this frame if ahead of the loop index [V] | At once, or at the end of the outermost script loop if one is running [V] |
| **Needle** (three.js, Rapier) | awake, onEnable, start, in passes [V] | Queued for the next frame's lifecycle pass [V] | Filtered out in each pass [V] |

Babylon has scene observables around physics and render, and no object lifecycle [V].

**Write this contract at the top of `src/entity/entity.ts`:**

- **`spawn(e)` takes a finished entity** and adds its mesh (unless already parented) and bodies now. Unreal needs a deferred
  spawn because BeginPlay runs before the caller can set anything; Boogle doesn't. Set the pose in the factory, because an
  entity can be drawn before its first hook.
- **First hook:** the next walk of that row to start after the spawn; the walker caches the length first (Nystrom) [V]. That
  may be later this frame or next frame. Promise no more; Godot and PlayCanvas don't.
- **`despawn(e)` is idempotent** and sets `e.alive = false` at once. Walkers skip dead entities, as PlayCanvas and Needle do
  [V]; otherwise every hook must check, and agents will forget. Teardown stays at the end of the phase as planned: the engines
  differ and all of these work. A despawn between frames or in a fixed-step hook waits for the next flush.
- **`alive` is a plain field.** Unity's overloaded `==` for destroyed objects is its stated regret; afresh it would be a
  `destroyed` property [V]. In JS the memory stays valid, so a stale reference is a silent zombie.
- **Register per kind, at module top level, never per instance.** `onPreStep`, `addPresenceField` and `onRemotePresence` have
  no unregister, so a spawn path that calls them leaks.
- **No `start` and no `enable` for now.** Two-stage init exists because scene files create objects in no dependable order. The
  ES module graph and `onStart` do that job here once cycles are gone, and `createBody` before Rapier is ready is already safe
  (`src/physics/backend-rapier.ts:83`) [V]. When streaming arrives, add `active` as list membership, as PlayCanvas does [V].

**Lazy code.** A dynamic `import()` resolves in a microtask, which waits for the stack to empty, so a lazy module's `defineKind`
and `spawn` always land between frames. The real hazard is registering from inside a hook: `onFrame` sorts the live list
(`src/loop.ts:110-113`) while `runFrame` walks it by index, so a hook could repeat or be skipped [V]. Add a dev assert: `onFrame`
throws if `currentFrame() !== 0`.

**Errors.** A hook that always throws skips every later hook and render on every frame while the loop keeps going
(`src/loop.ts:121-127`, `three/src/renderers/common/Animation.js:75,93`): a frozen game. PlayCanvas catches and disables the
script, in debug builds only [V]. Needle wraps lifecycle calls per script, and the per-frame step only in debug [V]. I'd catch
per row, `reportError` and turn the row off: at this merge rate a missing kind beats a frozen game. With the alive check it costs
about 3 ns an entity [M]. My judgement; the engines differ.

## 2. Tick ordering

| | Around physics | Between kinds | Between instances | Unit of ordering |
|---|---|---|---|---|
| **Unity** | `FixedUpdate` 0, 1 or more times a frame, then `Update`, `LateUpdate` [V] | Script Execution Order per class; lower runs first; equal is non-deterministic [V] | Can't be controlled [V] | A component, and an object has several |
| **Unreal** | Groups: PrePhysics, DuringPhysics, PostPhysics, PostUpdateWork [V] | Group, then prerequisites [V] | Prerequisites [V] | A tick function; a component can hold two (`PostPhysicsTickFunction`) [V] |
| **Godot** | `_physics_process` before every step, `_process` after [V] | `process_priority` ints [V] | The same; ties in tree order [V] | A node |
| **PlayCanvas** | `update`, `postUpdate` [V] | Creation order [V] | Creation order [V] | A script |
| **Needle** | earlyUpdate, update, lateUpdate, *then* physics, onBeforeRender [V] | List order [V] | List order [V] | A component |
| **Boogle** | Pre-step section; `onPreStep`, `onPostStep` per step; `world`, `update`, `late` [V] | `order`; ties by import [V] | n/a | A hook |

`order` is Unity's Script Execution Order with Godot's integers, and Gregory's few dependency buckets are the same idea [V].

**Is per-kind enough?** Between kinds, yes. Per-instance isn't needed: Unity ships without it, and a kind that needs it can sort
its own list or be one entity holding a list. **But one number per kind per phase isn't enough.** `src/main.ts:47-50` runs
`updateRemotes, resolveBallOwner, updateIntent, prepareBall`, and these depend on each other: `releaseBall` writes `me.holding`,
`updateIntent` reads it and writes `me.yaw`, and `prepareBall` reads both through `carryPosition` [V]. `world` has the same pattern
at -300, -290, -280, and step 11 says to keep those orders. Every engine above makes the unit finer than the object.

**Rows.** Keep `GameEntity`, and move the hooks from the instance to the kind:

```ts
export interface GameEntity {
  readonly id: string; // local only, never a network id
  readonly kind: string;
  alive: boolean;
  mesh?: Object3D;
  bodies?: readonly Body[];
  dispose?(): void;
}
type Row<E> = { phase: EntityPhase; order: number; run(e: E, ctx: FrameCtx): void };
export function defineKind<E extends GameEntity>(kind: string, rows: Row<E>[]): void;

// src/entities/ball/index.ts: all of the ball's timing, in one table
defineKind<Ball>('ball', [
  { phase: 'prePhysics', order: -90, run: resolveOwner }, // sync.ts
  { phase: 'prePhysics', order: -70, run: followCarryOrPose }, // state.ts, after the player's intent at -80
  { phase: 'fixedPre', order: 20, run: surf }, // state.ts
  { phase: 'postPhysics', order: -300, run: settle }, // state.ts
  { phase: 'postPhysics', order: -280, run: walkInClaim }, // state.ts
  { phase: 'update', order: -300, run: syncMesh }, // view.ts
]);
```

A kind can use a phase twice. `state.ts` and `view.ts` never meet on one object. Rows are literals the registry and atlas can read.
No instance can lack a hook, so there's no `update?`. Rows register once, so nothing leaks. At 30 kinds it was also the fastest shape
measured and boxed nothing [M]; at 4 kinds it wasn't, by a few ns. If the owner prefers methods, the cheaper fix is Unity's: two
kinds, `ball` and `ball-carry`.

**The fixed step.** The plan says the pre-step section matches Unity's `FixedUpdate`. It runs once a frame, like Unreal's
`TG_PrePhysics`. The match for `FixedUpdate` and `_physics_process` is `onPreStep`. A frame hook named `preStep` beside `onPreStep`
invites forces at the wrong rate, the mistake in [engine-architecture.md](engine-architecture.md) check 6. Call them `prePhysics`
and `postPhysics`, and add `fixedPre` and `fixedPost` rows whose `ctx.dt` is `FIXED`.

`onPreStep` runs in registration order (`src/physics/engine.ts:15`). `src/main.ts:34` installs the player's controller after every
eager module, so moving it to module level changes its place relative to `feel.ts`, `platforms.ts` and the mushrooms [V]. I didn't
test which pairs depend on it. Pin today's order in numbers, in its own commit, before anything moves. The owner has just said
today's direct controller is right (decision log, 2026-11-02).

**No prerequisites.** Unreal needs them inside groups that may tick in parallel [V]; Boogle has one thread, and numbers scan
statically. Ties stay legal (check 7).

## 3. Entity or service

The rule holds. Row by row:

| Plan's row | Finding |
|---|---|
| Camera | Holds. PlayCanvas's docs use a following camera as the `postUpdate` example [V] |
| HUD | Holds for a screen, not a widget. **The Unreal cell misleads:** `AHUD` is a canvas-drawing Actor whose page doesn't mention widgets [V]; real UI is UMG, where `UUserWidget` is a UObject chain, not an Actor, owned by the Player Controller [V]. Unity's UI Toolkit is one `UIDocument` hosting a virtual tree, built to drop the cost of a GameObject per element [V]. Only Godot makes every control a node |
| Sky | Holds. **Fill the cell:** `ASkyAtmosphere` is a placeable Actor derived from `AInfo`, as are `ASkyLight` and `AVolumetricCloud` [V]. **Fix a link:** Godot's points to `Node`, not [`WorldEnvironment`](https://docs.godotengine.org/en/stable/classes/class_worldenvironment.html) |
| Engine services | Holds. Unreal's subsystems give managed lifetimes without crowding engine classes [V]; Godot's servers hold hot data with nodes as interfaces [V] |
| A pool is one entity | Holds: `MultiMeshInstance3D` is one node [V]. **The stated reason is wrong** (section 6) |
| Particle sim, lights, mixer, presence send, tick driver, gamepad, resolution | Fit the rule. Not checked one by one |

**Where experienced teams regret objects:** UI elements, which Unity's newer UI system exists partly to remove [V]. Managers: `AInfo`
holds Unreal's manager-style Actors, `AGameModeBase` among them [V], and subsystems are the newer home; Godot warns that autoloads bring
global state and fit only systems managing their own data [V]; Overwatch ended with about 40 % singleton components [F]. Too many
templates: Dungeon Siege reached over 7,300 object types on a system designed for under 100 [V], so watch the kind count.

**A fear that doesn't transfer:** Unity's 10,000 Update calls were slow because of native-to-managed calls, safe iteration and validity
checks [V]. JavaScript has no such boundary. Godot puts the limit at tens of thousands of nodes [V].

**UI.** One entity per screen; widgets stay plain DOM. `first-run.ts` and `welcome-back.ts` gain a real lifetime, so their hooks stop when
the card is done. `hud.ts`, `pause.ts`, `hotbar.ts` and `prompt.ts` live for the session and gain only a row, so do them last in step 14,
and leave them on the allow-list first if the migration runs long.

## 4. State, view and sync

- **Fusion:** `FixedUpdateNetwork` changes state; `Render` runs after all steps and lerps between two snapshots [V]. One machine has State
  Authority per object, and proxies lag behind [V]. `NetworkRigidbody` can move an optional child in `Render` while the root stays
  physics-correct, off by default [V].
- **Unreal:** each machine holds a role for the actor: authority, autonomous proxy, simulated proxy [V]. That's `if (ball.mine)`.
- **Unity Netcode:** `NetworkRigidbody` makes the body kinematic on every non-authoritative instance, which is `setBallMode('ghost')`, and
  authority mirrors a separate `NetworkTransform` [V]. Pose sync is reusable and apart from game scripts.
- **Overwatch:** components hold data; effects queue and resolve once a frame [F]. Killcam needed a second world, which broke global access
  [F].
- **Source:** a teleport carries `EF_NOINTERP`, "don't interpolate the next frame" [V].

**An owner-synced physics object.** The plan's three files are right. These lines move:

| Today in `src/physics/ball.ts` | Goes to | Why |
|---|---|---|
| `e, myE, mine, held`; claim, release, grab, throw, place, respawn | `state.ts` | Authority and rules |
| `disp` (p, q, v), renamed `pose` | `state.ts` | Gameplay reads it: reach, walk-in claim, `impact.ts`, `ping.ts`, `hands.ts`. `bump.ts:48` writes it [V] |
| Surf and friction, `src/physics/physics.ts:197-235` | `state.ts`, a `fixedPre` row | The plan misses these, and the `src/physics/` lint rule needs them gone |
| `document.hidden`, `:232` | Passed in from `net` | The `state.ts` lint rule forbids it |
| `resolveBallOwner`, per-peer claims, `orphanSince`, snapshots, the `b` field, `BallWire` | `sync.ts` | It only reads wire data. State says what ownership *means* (`setMotion`); sync says *who* |
| Mesh, texture, smoothing | `view.ts` | |
| `placeBall` writing `mesh.position`, `:160` | A `snap` counter in state that view reads | The one state-to-view write |

Rules for the split:

1. **One writer of `pose` per frame:** the body when mine, snapshots when not. Route `bump.ts`'s write through a state function.
2. **View reads state and never writes it; state never imports view.**
3. **The wire shape lives in one file,** with per-peer data in a `Map` there, not on `Remote` (`BallRemote`, `:36`).
4. **An authority flip is one code path:** claim and release end in the same kinematic or dynamic switch.

**Step 18:** the replication component is `sync.ts` minus the ball's wire shape: the claim rule, the latest claim and snapshots per peer, the
orphan pick, the mode switch, and sampling into `pose` with the extrapolation cap. `held`, carry, surf and respawn stay with the object. Add
`snap` as an additive field when vehicles need it. Fiedler's split of ownership from authority stands, as in the co-op report's
recommendation 5.

**Step 17:** module-level `ball` and `me` mean one world per process, so the two-tab scenario needs two processes or workers. Killcam hit this
wall [F].

## 5. Migrating without a long freeze

- **West (Tony Hawk's):** one small component first; the old object stayed as a bridge; the skater couldn't be split piecemeal, so it became one
  blob component and was split later; two years, shipping yearly [V]. Lookups through a manager passed 5 % of CPU, so they moved to direct pointers
  [V]: no per-frame lookups by id.
- **Larson:** test on the hardest teams, not the easy ones; stop new usage with a ratchet; generate the tracking; the lead finishes the tail [V].
- **Google:** advisory deprecation rarely drives migration; prevent backsliding with allowlists pruned as users move; name an owner [V].
- **Fowler:** expand, migrate, contract; skipping contract can leave you worse off [V].
- **Shopify's Packwerk, the cautionary one:** todo files grew with every feature; stale entries weren't cleaned; fixes often added unnatural
  indirection; zero violations didn't mean isolation, and running the code was the better measure [V].
- **Stripe:** 3.7 million lines in one PR, because a hybrid meant two type systems and an interop layer [V]. Keep mechanical moves in single PRs, as
  the plan does.

**Keeping two ways from becoming permanent:**

- **Ratchet from step 11, not step 15.** Add the `addBody`, `scene.add` and `onFrame` rules then, with today's offenders suppressed by
  [ESLint's bulk suppressions](https://eslint.org/docs/latest/use/suppressions). New violations fail, and a suppression no longer needed fails the run
  until pruned, which avoids Packwerk's stale list [V]. That file sits outside the owner gate; `eslint.config.js` doesn't. Not tried here.
- **Burn-down line.** `npm run registry` prints how many files are left.
- **One owner.** Name one session or person for Part 4.
- **Each PR leaves an object entirely one way or the other,** though a blob counts as finished. Step 7's `declare module` fields on `Remote` are West's
  bridge and fine as one; add a step that removes them, or say they're permanent.

**Checkpoints:**

- **Before freezing the API in step 10:** check it on paper against the player, the Boogler, `hut-build.ts` and the mushroom stall.
- **After step 11 and `ping`, the one-obvious-way test:** give a fresh agent the docs and a small new object with dynamic instances. Did it land in one PR,
  pass lint first time, and match the ball's shape? If not, fix the API before step 12.
- **Each step:** `hitches` objects no higher; `perf` CPU within its ±15 % noise; and lines of code. If `ball.ts` plus its physics hooks grow past about 1.3
  times, the pattern is boilerplate.
- **Step 12:** the owner plays it, as planned. Move the player and the Boogler as blobs first, one PR with no behaviour change, then split later, so a feel
  regression is easy to bisect.

**Stop or pause when:** the owner reports a feel regression twice in one object (stop and fix the pattern); the suppression count hasn't fallen in two weeks of
active work (finish, or declare the rest legacy until touched); or the slice needs the hands. With the ratchet in place, any pause after a PR is clean: new
code is entities, old code is listed.

**Steps 7 and 8:** the fixes are events and getters, and Shopify found that kind of inversion could hurt readability [V]. A getter with one caller and no
direction problem should be a direct import.

## 6. Cost in a browser

Measured with [dispatch-bench.ts](notes/entity-architecture/dispatch-bench.ts) on an M1 Max in Chromium 156 and JavaScriptCore: 300 entities of 30 kinds, each
kind its own class and function, 7 fresh runs a cell [M]. Other agents were loading the machine; median spread was 4 %.
[Full tables](notes/entity-architecture/bench-results.md).

| ns per entity per frame | Chromium | JSC | V8 bytes/frame |
|---|---:|---:|---:|
| Same work written inline, no call (the floor) | 10 | 9 | 19 |
| Rows: `run(e, ctx)`, shared walker | 10.3 | 7.7 | 3 |
| Rows with alive check and try/catch | 13 | 9.4 | 4 |
| Methods, shared walker, `e.update(ctx)` | 14.3 | 9.5 | 4 |
| Methods, shared walker, `e.update(dt, now)` (the plan) | 14.7 | 9.4 | 964 |
| Methods, one walker per kind | 14.7 | 9.5 | 964 |
| Closures instead of methods | 15 | 11.3 | 963 |
| `for...of` on the array | 15.3 | 10.5 | 964 |
| `forEach` | 15 | 11.3 | 4,085 |
| Walking a `Set` | 16.3 | 11.7 | 9,604 |
| `list.filter()` each walk | 21.7 | 23.7 | 8,167 |
| The plan as a whole: a profiled hook per kind | 28 | 11.3 | 1,924 |
| A profiled hook per entity | 143 | 40 | 19,204 |
| One `performance.now()` | 125 | 38 | 16 each |

- **At Boogle's scale, the choice doesn't matter for speed.** A plan-shaped pass costs 5.9 µs at 100 entities, 8.4 at 300 and 20 at 1,000 in Chromium. Thirty
  kinds with two rows each and 300 entities with two hooks each is about 17 µs: under 2 % of today's 0.94 ms frame CPU [V], and 0.4 % of 4 ms. At ten times
  worse, once real caches and hook bodies count, it's about 170 µs.
- **A shared walker costs nothing visible.** V8's closures from one literal share feedback [V], so a factory-made walker has one megamorphic site, and it still
  matched a walker per kind. Egorov calls worrying about this usually futile [V].
- **Closures versus methods is a readability choice:** 321 versus 81 bytes per entity with three hooks [M].
- **Avoid per-entity hooks,** because of the profiler's clock read and an unreadable profile.
- **Warm-up doesn't matter:** the first 60 frames took 2.4 ms in Chromium and 1.8 ms on JSC [M].
- **The cost of an entity is what it owns:** 50 ns per mesh for `updateMatrixWorld` alone [M], about 3.3 µs per draw call (0.55 ms of render CPU over 168 draws,
  derived) [V], and physics at 0.18 ms a frame [V]. "Per-object entities would break the frame budget" should say draw calls. Logic-only entities in the hundreds
  are fine.

**What "allocate nothing" should mean:**

1. **`src/entity/` allocates zero objects per frame.** No closure per walk; no `forEach`, `filter`, `map`, spread or per-frame array; no `Set` or `Map` iteration.
   Array `for...of` is fine when warm [M]; indexed is the house style.
2. **Hooks take `ctx`.** `(dt, now)` boxes two doubles per walk on V8, and 16 to 32 bytes per call if the walker gets inlined into its caller [M]. JSC doesn't box.
   So "nothing allocates per call" isn't true of the plan's signature, though it's harmless.
3. **Hook bodies live under the existing ratchet:** 3.2 KB/frame of objects across all hooks, heading for 1 KB. V8 numbers stay reported, not budgeted.
4. **Events may allocate:** spawn, despawn, claims, joins, presence at 20 Hz. The flush allocates nothing when the queue is empty and compacts in place, keeping spawn
   order.
5. **Step 10 shows it with `hitches`:** objects unchanged within noise, and no row for the walker itself. `hitches` must be taught this first.

## 7. Agents

Weak evidence, all of it. I found no study of "one obvious way" or of lint rules directly.

- Agents follow context files well, but the files don't generally raise success and cost over 20 % more (Gloaguen, abstract) [F]. Another study finds no measurable
  correctness effect over 288 runs, and that agents fail on feature design, pattern choice and exact wiring (Khatri, abstract) [F]. A third reports 28.6 % less
  wall-clock time as an association (Lulla, abstract) [F]. They disagree.
- OpenAI reports a layered architecture enforced by custom linters and structural tests, read through a secondary article that cautions rules catch structure, not
  overengineering [F].
- Refactoring broke 15 to 30 % less often in "healthy" code, on competitive-programming Python, from authors who sell the metric (Borg) [F].

My reading: agents will do what `AGENTS.md` says, so a stale instruction is expensive. Pattern choice and wiring are where they fail, so give them one worked example, a
scaffold and a lint message that says what to do. Update `/new-feature`, which today says to copy `honk.ts` and use `onFrame` (`.claude/skills/new-feature/SKILL.md:14-17`)
[V], in the same PR as the AGENTS.md rule, and keep the rule to a few lines and a pointer to the ball.

## Recommendations, in priority order

1. **Declare hooks as rows on the kind.** Fallback: two kinds for the ball.
2. **Rename to `prePhysics` and `postPhysics`, add `fixedPre` and `fixedPost`, and pin today's `onPreStep` and `onPostStep` order in numbers,** in its own commit, before
   anything moves.
3. **Pass `ctx` to every hook.** It keeps `elapsed` and matches `onFrame`, so moving a hook is a copy.
4. **Write the lifecycle contract into `entity.ts`,** with `alive`, `bodies` and the dev assert.
5. **Teach the tools in step 10:** `dev/scan/read.ts`, `dev/look/hitches.ts`, and a `name` per row for `prof`.
6. **Ship the ratchet with step 11,** using bulk suppressions, and print the burn-down from `npm run registry`.
7. **Migrate `ping.ts` with the ball, and name remote players next.** Those test despawn and many instances. Ask the owner for a small test-diet exception for the walker's
   rules (spawn and despawn during a walk, double despawn): pure logic, and order bugs are hard to see in a still.
8. **Split the ball as in section 4.** Importers import `state.ts`; only a glob in `main.ts` imports `index.ts`.
9. **Move the player and the Boogler as blobs first,** then split.
10. **Add one Node test that imports every `src/entities/*/state.ts`.** Lint sees direct imports; this sees transitive ones (Packwerk's lesson). `src/constants.ts:26`
    (`matchMedia`) and `src/physics/physics.ts:20` (`location.search`) fail it today, which starts step 17's spike. `three` and `three/webgpu` load in Node [M], so `state.ts`
    can keep its vectors.
11. **Add the row guard:** catch, `reportError`, turn the row off.
12. **Run the one-obvious-way test after step 11,** and update `/new-feature` in the AGENTS.md PR.
13. **Keep UI to one entity per screen, last in step 14.**
14. **Don't optimize dispatch.** Change the plan's pool rationale to draw calls.

## Where the plan should change

| Where | Change | Why |
|---|---|---|
| "Where we are", last paragraph | The pre-step section is Unreal's `TG_PrePhysics`; `onPreStep` is `FixedUpdate` | It misleads builders on rate |
| "The entity" | Rows on the kind; `ctx`; `alive`; `bodies`; drop "nothing allocates per call" | Section 2. `lighthouse` and others own several bodies, and a `Body` has no group, unlike a mesh |
| "How it runs" | One hook per row, not per phase, named by kind and row | Section 2 |
| "File shape" | `disp` to state; who-owns to sync; importers use `state.ts`; say what imports `index.ts` | Otherwise importers pull in `view.ts`, the scene and the DOM |
| "What is not an entity" | The reason for pools is draw calls | Section 6 |
| "Entity or system" table | Correct the Unreal HUD cell; fill the Unreal sky cell; fix the Godot `WorldEnvironment` link | Section 3 |
| Step 7 | Say when the `declare module` fields go, or that they stay | Fowler |
| Step 10 | Add rows, fixed phases, `onPreStep` order, the contract, `ctx` filled before `prePhysics` (`src/main.ts:54-56` fills it after the step), `dev/scan/read.ts`, `dev/look/hitches.ts` | The plan names only `dev/registry/scan.ts`. `hitches` keys on `url:line` (`:194-204`), so every kind would land on one row |
| Step 11 | Add `ping.ts`, the ball's part of `installStepHooks`, `document.hidden`, the ratchet, `/new-feature`, the one-obvious-way test. Orders as rows. The `src/physics/` rule must allow type imports or wait (`physics.ts:17`). 22 importers today, not 18 | Sections 1, 2, 5, 7 |
| Step 12 | Blob first. Add the player's part of `installStepHooks` | No step moves it |
| Step 13 | Blob first (726 lines) | West |
| Step 14 | Name remote players, with their pre-step (`updateRemotes` stays a named call in `main.ts` after step 7, and no step removes it) and their `onPreStep` target at `physics.ts:123-135`; then `installStepHooks` and its call in `main.ts` go. UI last | "Replaces the four named calls" isn't delivered otherwise |
| Step 15 | Only delete the suppressions and update docs | The rules moved to step 11 |
| Step 17 | Note the Node import test, its blockers, and one world per process | Sections 4 and 5 |
| Step 18 | Scope as in section 4; `id` isn't a network id; `snap` as an additive field | Section 4 |
| "Risks", frame order | Add `onPreStep` and `onPostStep`, which have no numbers | Section 2 |
| "Risks", lazy loading | A lazy `spawn` lands between frames by language rules; the hazard is registering inside a hook | Section 1 |

**What should not change:** per-kind walking through `src/loop.ts`'s lists; no ECS; a pool as one entity; no scene tree; teardown at the end of the phase; no `start`; Part 3
before Part 4; the ball first; the owner's checkpoint at step 12; prototypes on `onFrame` until promoted; no wire change before step 18.

## Tried and not confirmed

- **Not read:** Unreal's Lyra and Common UI (empty page bodies), so how Epic structures a HUD today rests on the API pages plus a third-party plugin's description [S]. Epic's UMG
  optimization page (quoted second-hand [S]), so "engine UI is event-driven in practice" is left out. OpenAI's harness post and Valve's networking wiki page (403). Any studio
  postmortem of an incremental migration beyond West, Minecraft Bedrock's included: two searches found none.
- **Fusion:** I couldn't confirm a rule against writing networked state in `Render`, or read its authority transfer calls.
- **Unreal's `TG_NewlySpawned` re-run** comes from an old forum post; the API page confirms only that the group exists.
- **Overwatch** is a machine-summarised Chinese transcript, as in the earlier report.
- **JavaScriptCore's call inline caches:** the WebKit post's call passages were only partly read, and I took no per-call number from it.
- **The benchmark:** one machine shared with other agents, trivial hook bodies, no cache pressure from a real frame. No iPad, Safari or Android. The `jsc` shell shares Safari's
  engine, not its page environment.
- **Not reproduced:** the frozen frame from a throwing hook, and any fixed-step order dependency. Both are read from code.
- **Not tried:** rows in the real loop, bulk suppressions under the Claude Code format hook, and conflicts in `eslint-suppressions.json` at this merge rate.
- **My judgement, expect to tune:** the 1.3 times line count, the two-week stall, the row guard, the one-obvious-way test.
