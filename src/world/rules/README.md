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
// Imports allowed: ../grid.js, ../terrain-logic.js, ../../sim/*, ./<earlier rule>.js (constants only).
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
  lint allows only `../grid.js`, `../terrain-logic.js`, `../../sim/*` and sibling rules (no
  three.js, DOM, timers or `performance`).
- `apply` returns its result (changed cells, the item taken); effects go in the adapter's `onApplied(e, tick, result)`.
- Changing what a state's `serialize` writes means a new `version` and a `migrate[v]` step for older saves
  (`../README.md`, "Contract"); saves from before the change must keep loading (`test/fixtures/snap-pre-version.json`
  is one, checked by `test/world-snapshots.test.mjs`).
- Append new modules to the end of `RULES` in `index.js`. Its order is the wire order: states snapshot, load and
  hash in it, so reordering it desyncs rooms where peers run different builds.

- Every module that registers ops also exports `edits`, one generator per op (below). The replay test fails on a
  registered op without one.

## Edit generators and invariants

`test/world-replay.test.mjs` runs a host and two clients on the real rules and the home land, feeds them a seeded
stream of every registered op, kills the host midway, adds a late joiner after a flatten, reloads a JSON snapshot in a
fresh tab, and requires every peer to hash every state the same at every shared tick, every invariant to hold, and a
second run with the same seed to give the same result. It fails when a registered op has no generator, or when no
edit of that op was ever accepted. So a module with ops exports:

```js
import { JUNK, bad } from './edit-gen.js';
// r: the peer's seeded stream { int(lo, hi), pick(a), chance(p), next() }; view: { rules, land, tick } of that peer.
export const edits = {
  'thing.poke': (r, view) => (r.chance(JUNK) ? bad(r, 'thing.poke') : { op: 'thing.poke', i: r.int(200, 240), j: 210 }),
};
// Optional: null while the state is sane, else a message. api is this module's, rules all of this peer's.
export function invariants(api, rules) {
  return api.thing.total() >= 0 ? null : 'negative total';
}
```

- Most generated edits should be ones the host accepts, built from that peer's state (a cell that is sand, an item
  that exists); about a fifth (`JUNK`) come from the shared `bad(r, op)`: wrong types, missing fields, cells off the
  grid, oversized payloads. Return `null` when there is nothing sensible to do yet.
- Edits are JSON-safe, with integer `i`/`j` and no `p` (sync adds it).
- Invariants check what would silently break: conserved quantities, unique ids, caps, spacing.

## env keys

| Key | Set by | Used by |
|---|---|---|
| `canPlantAt(i, j)` | `src/mushroom-garden.js` (dry land, nothing over the spot) | `mush.plant` validate (`plantOk`); `gift.toss` seeds (`rules.mushrooms.plantOk`) |

## Template

```js
// <What the system is.> Lockstep: runs the same on every peer (see ./README.md).
import { createThing } from '../../sim/thing.js';
import { JUNK, bad } from './edit-gen.js';

export const name = 'thing';

export function install(sync, land) {
  const thing = createThing({ n: land.n });
  sync.registerOp('thing.poke', { validate: (e, ctx) => thing.check(e, ctx.tick) === null, apply: thing.poke });
  sync.registerState('thing', { serialize: thing.serialize, load: thing.load, hash: thing.hash });
  sync.onTick((t) => thing.tick(t), 'thing');
  return { thing };
}

// For the replay test (see "Edit generators and invariants").
export const edits = {
  'thing.poke': (r, view) => (r.chance(JUNK) ? bad(r, 'thing.poke') : { op: 'thing.poke', i: r.int(200, 240), j: 210 }),
};
```

Then append `thing` to `RULES` in `index.js`, and read `rules.thing` from `../game-world.js` in the adapter.

## Modules

| Module | Ops | State | API |
|---|---|---|---|
| `terrain.js` | `dig`, `pile`, `flatten` | `terrain` | `{ state, lastLoaded() }`: the sand layer (`../terrain-logic.js`) and the cells the last load changed |
| `mushrooms.js` | `mush.plant`, `mush.water` | `mushrooms` | `{ garden, plantOk(i, j, env), plant(i, j) }` |
| `gifts.js` | `fruit.drop`, `gift.take`, `gift.toss` | `gifts` | `{ gifts }`: palms, washed-up and thrown items over `land.layout`; exports `SEEDS`, `LOST` |
| `proto.js` | none | `proto` | `{ proto }`: the prototype flag bitmask (`../../sim/proto.js`), all on until the adapter sets this tab's URL flags |
| `water.js` | `slosh` | `water` | `{ water, region, regionKey, simTerrain, stepOnce(), stepMs() }`: the water sim over the home square, its ground copy (every terrain op's changed cells) and the sea pin; exports `WATER_SIM` |
| `edit-gen.js` | none | none | Not a rules module (not in `RULES`): `JUNK` and `bad(r, op)` for the modules' `edits` generators |
