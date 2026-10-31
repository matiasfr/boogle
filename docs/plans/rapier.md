# Plan: physics on Rapier

> **Status: approved direction (2026-10-31), not started.** Part of [architecture.md](architecture.md), phase 2.
> Why: cannon-es allocates about 60 KB of JS garbage per frame inside `world.step` (measured with
> `npm run hitches -- --allocs`, [game-loop.md](game-loop.md) step 2), has no continuous collision (the fall-speed cap
> and fall-through net in `src/physics/physics.js` exist for that), and is pure JS on the main thread. Rapier
> (`@dimforge/rapier3d-compat`) runs in WASM: no JS garbage per step, continuous collision, faster narrowphase, and it
> can run in a worker later (game-loop.md step 7). Each step is one PR that leaves `main` green; physics feel is the
> risk, so nothing changes for players until step 4.

## What uses physics today (2026-10-31)

About 15 modules. The heaviest are `src/physics/physics.js` (world, ground, player controller, fall net),
`src/physics/ball.js`, `src/adapters/mushroom-garden.js` (growing colliders, bounce), `src/player/player.js`,
`src/pois/windmills/`, `src/pois/caves/`, `src/pois/lighthouse/`, `src/guest/`, `src/boogler/` and
`src/physics/flight.js`. They use spheres, boxes, cylinders, a heightfield, two trimeshes and one convex polyhedron;
dynamic, kinematic and static bodies; collision groups and masks (`GROUP` in `physics.js`); non-colliding bodies
(`collisionResponse = false`); four contact materials; `preStep`/`postStep` listeners in nine modules;
`world.contacts` (ground and impact checks); one `raycastClosest`; and `interpolatedPosition` for drawing.

## What maps to what

| cannon-es | Rapier |
|---|---|
| `world.step(FIXED, dt, 4)` with its own accumulator and `interpolatedPosition` | our accumulator in the facade: fixed 60 Hz steps, `prev`/`cur` per body, drawn at `lerp(prev, cur, alpha)` |
| `preStep` / `postStep` events | facade hooks run around each fixed step, in registration order (same contract) |
| `ContactMaterial(a, b, { friction, restitution })` | friction and restitution per collider, with combine rules (`Max` for bouncy mushrooms) |
| `collisionFilterGroup` / `Mask` | `InteractionGroups` (16-bit membership and filter) |
| `collisionResponse = false` | sensor colliders, intersection events |
| `world.contacts` | `contactPairsWith` / the event queue (contact and force events) |
| `raycastClosest` | `castRay` |
| `Heightfield`, `Trimesh`, `ConvexPolyhedron` | `heightfield` (check row/column order and scale), `trimesh`, `convexHull` |
| fall-speed cap, fall-through net | continuous collision (CCD) on fast bodies; keep the net as a safety until proven unneeded |

Physics stays Owner and Host state (DESIGN.md, "Physics is never lockstep"): each tab runs its own engine and sends
numbers, so tabs on cannon-es and tabs on Rapier can share a room while the flag is in use. Rapier's cross-platform
determinism doesn't change that rule.

## Steps

### 0. Spike and measure (no merge needed)

A branch that loads Rapier and steps a copy of the island's colliders: bundle cost (`rapier3d-compat` inlines its
WASM; compare gzip size against three's 310 KB), init time on the Mac and on a phone, step time and allocations against
cannon-es for the same scene. **Stop and ask** if the bundle grows by more than ~400 KB gzipped or init takes more than
a second on a phone. The alternative is the non-compat package with a separate `.wasm` file, loaded behind the
splash screen.

### 1. A physics facade, still on cannon-es

`src/physics/engine.ts` (TypeScript, per AGENTS.md): the only module that imports a physics library. It covers bodies
and shapes, positions and velocities, kinematic moves, groups, `onPreStep` / `onPostStep`, contact queries, one
raycast and the interpolated pose. Port every module above onto it, one folder per PR, with no behavior change
(scenarios, `/look` motion sheets and `npm run perf` before and after). ESLint bans `cannon-es` outside the facade.

### 2. A Rapier backend behind `?physics=rapier`

The same facade on Rapier, chosen at load. CCD on the ball, the player and thrown items. Scenarios run on both
backends locally; CI stays on the default.

### 3. Tune the feel

Side by side: jump arc, ground snapping, ball bounce and roll, mushroom bounce, the Boogler ride and launch, windmill
pushes, cave floors. Motion sheets from `/look` for each, compared frame by frame against cannon-es. Feel numbers move
into the facade's backend file, with their cannon-es values noted.

### 4. Switch the default, then remove cannon-es

Rapier becomes the default; `?physics=cannon` stays for a week of playtests (docs/playtests.md), then cannon-es and its
backend are removed along with the fall-speed cap. Done when `hitches --allocs` shows nothing from physics and the
playtests don't notice a feel regression.

### 5. Later: physics in a worker

Rapier's world moves into a worker with shared memory for poses (game-loop.md step 7). This needs cross-origin
isolation headers, so it waits for the hosting decision in architecture.md.
