# World rules: the lockstep half of each system

Every lockstep system (terrain, mushrooms, gifts, proto, water) lives here (B1, docs/tech-plan.md). Adding one is the
four-file recipe in `../README.md`, "Adding a lockstep system".

A **rules module** holds everything about one system that every peer must compute bit for bit: its ops (validate and
apply), its state (serialize, load, hash), its sim ticks, and sim-side listeners. Its **adapter** (the old file in
`src/world/` or `src/features/`) keeps everything else: meshes, sounds, input, inventory and other effects, reading the
rules' API and reacting through `onApplied`, `onAfterTick` and `onSnapshot`.

## Contract

```js
// src/world/rules/<name>.js
// Imports allowed: ../grid.js, ../terrain-logic.js, ../legacy-grid.js, ../../sim/*, ./<earlier rule>.js (constants only).
export const name = 'terrain'; // key in the rules handle; equals its state key when it has one
export function install(sync, land, rules, opts) {
  // register ops, state, ticks and sim listeners on `sync`; return the API adapters and later rules use
  return api;
}
```

| Input | What it is | Where it may be read |
|---|---|---|
| `sync` | `{ world, registerOp, registerState, onTick, onApplied, onSnapshot }`. No `submitEdit`: rules react to edits, they never make them. Call `sync.registerOp(...)`, do not destructure it. | install |
| `land` | `{ n, base, layout }`: grid size, base heights (`Int16Array`, cm, index `i*n+j`) and `layout` (`trees`, `shore`, `perches`). Static, the same on every peer. `layout` is filled before tick 1, so do not read it at install. | anywhere |
| `rules` | The APIs of the modules before this one in `RULES`, keyed by `name`. | anywhere |
| `opts` | `{ clock: () => ms }`, for stats only. It never feeds state. | stats |
| `ctx.env` | Host-only facts handed to `validate(edit, { from, tick, env })`. They may differ per machine, so never use them in apply or ticks. A missing one makes validate throw, and the edit is rejected. | validate only |

Rules:

- Lockstep math only (DESIGN.md, "Determinism from day one"): the determinism lint covers this folder, and its import
  lint allows only `../grid.js`, `../terrain-logic.js`, `../legacy-grid.js`, `../../sim/*` and sibling rules (no
  three.js, DOM, timers or `performance`).
- `apply` returns its result (changed cells, the item taken); effects go in the adapter's `onApplied(e, tick, result)`.
- Append new modules to the end of `RULES` in `index.js`. Its order is the wire order: states snapshot, load and
  hash in it, so reordering it desyncs rooms where peers run different builds.

- Coming in B2: every module that registers ops also exports `edits = { [op]: (r, view) => edit | null }`, a seeded
  generator of valid (and some invalid) edits for the replay test, which fails on a registered op with no generator.
  Optional `invariants(api)` returns `null` or a message. See docs/tech-plan.md, B2.

## env keys

| Key | Set by | Used by |
|---|---|---|
| `canPlantAt(i, j)` | `src/mushroom-garden.js` (dry land, nothing over the spot) | `mush.plant` validate (`plantOk`); `gift.toss` seeds (`rules.mushrooms.plantOk`) |

## Template

```js
// <What the system is.> Lockstep: runs the same on every peer (see ./README.md).
import { createThing } from '../../sim/thing.js';

export const name = 'thing';

export function install(sync, land) {
  const thing = createThing({ n: land.n });
  sync.registerOp('thing.poke', { validate: (e, ctx) => thing.check(e, ctx.tick) === null, apply: thing.poke });
  sync.registerState('thing', { serialize: thing.serialize, load: thing.load, hash: thing.hash });
  sync.onTick((t) => thing.tick(t), 'thing');
  return { thing };
}
```

Then append `thing` to `RULES` in `index.js`, and read `rules.thing` from `../game-world.js` in the adapter.

## Modules

| Module | Ops | State | API |
|---|---|---|---|
| `terrain.js` | `dig`, `pile`, `flatten` | `terrain` | `{ state, lastLoaded() }`: the sand layer (`../terrain-logic.js`) and the cells the last load changed |
| `mushrooms.js` | `mush.plant`, `mush.water` | `mushrooms` | `{ garden, plantOk(i, j, env), plant(i, j) }`; exports `migrateGarden` |
| `gifts.js` | `fruit.drop`, `gift.take`, `gift.toss` | `gifts` | `{ gifts }`: palms, washed-up and thrown items over `land.layout`; exports `migrateGifts`, `SEEDS`, `LOST` |
| `proto.js` | none | `proto` | `{ proto }`: the prototype flag bitmask (`../../sim/proto.js`), all on until the adapter sets this tab's URL flags |
| `water.js` | `slosh` | `water` | `{ water, region, regionKey, simTerrain, stepOnce(), stepMs() }`: the water sim over the home square, its ground copy (every terrain op's changed cells) and the sea pin; exports `WATER_SIM` |
