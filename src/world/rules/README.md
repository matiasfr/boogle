# World rules: the lockstep half of each system

As of v39 (13 November 2026), only the classic roster and eight haul tune keys remain here.
The live roster and rail tuning are Server kind. Gifts, stacks, piles, sites, sources, bank and opening
are retired, including their ops, ticks and saved shapes; their old playable prototypes are removed.
The classic transport and its recipe below remain until server-owned-state step 9.

A **rules module** holds everything about one system that every peer must compute bit for bit: its ops (validate and
apply), its state (serialize, load, hash), its sim ticks, and sim-side listeners. Its **adapter** keeps everything
else (meshes, sounds, input, inventory), reading the rules' API and reacting through `onApplied`, `onAfterTick` and
`onSnapshot`. The sync contract those use is in `../README.md`.

## Adding a lockstep system

The sim, rules and adapter have distinct owners; registration also updates the typed API:

1. `src/sim/<x>.ts` plus `test/<x>.test.ts`: the pure logic (typed arrays, integers, seeded `mulberry32`), with a
   test that the same inputs give the same hash and that serialize/load round-trips.
2. `src/world/rules/<x>.ts`, from the template below: `install(sync, land, rules)` registers its ops, state and ticks
   and returns an API. It exports `edits` (a generator per op) and optionally `invariants`, for the replay test.
3. One line appended to `RULES` in `index.ts`. States snapshot, load and hash in its order; a reordered registry
   needs a dated `WORLD_NS` break during development.
   Add its API to `Rules` in `src/world/rules/types.ts` too (see `TuneApi`).
4. `src/features/<x>.ts`, the adapter. It imports `rules` from `../world/game-world.ts` **first** (so the rules are
   registered before anything else), reads `rules.<x>`, sends `submitEdit`, and reacts in `onApplied`,
   `onAfterTick` and `onSnapshot`. Host-only facts that validate needs go in through `setEnv` (below, "env keys").
   If other modules (hands) must import the adapter, put it in `src/adapters/<x>.ts` instead, with a thin
   feature file, since features cannot import each other.

Update the system's `docs/game-design/` chapter (new system: add a chapter and index line), and its atlas story for a new sync system or big feature. Run `npm run check`. Run `check:full` locally only when touching `src/net*`, `src/world/sync.ts`, `src/world/game-world.ts` or `server/`. New tests are for lockstep determinism, conservation and validation; UI, features, tuning and feel use `look`, with a new scenario only for a sync contract (see AGENTS.md's entity-core exception). Notes:

- A system on the ground (markers, castles) stores grid cells `g = i*n + j`. The ground is fixed (digging was removed
  2026-10-30) and is not a lockstep input: `land` holds only `n` and the gifts `layout`. A height that validate needs
  comes in through `setEnv`.
- `setEnv` is only for validate facts the rules cannot compute (what the render side sees: trees, props). Anything
  derivable from `land` and the rules' state is checked in validate directly.
- Ids come from a counter in the state, never a per-peer one.
- Players start an action through the registries (docs/agents/registries.md, "Shared registries"); a new carried item is appended to
  `GIFTS` in `src/sim/gift-catalog.ts` (ground items store its index: reorder only with a `WORLD_NS` bump; it also needs The Boogler's `taste` and `line`), and what using it does is a case
  in `useDown` in `src/player/hands.ts`. The v39 retirement preserves this catalog as character copy;
  it no longer registers ground gifts or throwing ops.

## Contract

```ts
// src/world/rules/<name>.ts
// Runtime imports: ../grid.ts, ../../sim/*, sibling rules (including types.ts).
// Server-kind registration may also import command/replicator types (docs/agents/lint-boundaries.md).
export const name = 'thing'; // key in the rules handle; equals its state key when it has one
export function install(sync, land, rules) {
  // register ops, state, ticks and sim listeners on `sync`; return the API adapters and later rules use
  return api;
}
```

| Input | What it is | Where it may be read |
|---|---|---|
| `sync` | `{ world, registerOp, registerState, onTick, onApplied, onSnapshot }`. No `submitEdit`: rules react to edits, they never make them. Call `sync.registerOp(...)`, do not destructure it. | install |
| `land` | `{ n, layout }`: grid size and `layout` (`trees`, `perches`), as typed in `types.ts`. Static, the same on every peer. `layout` is filled before tick 1, so do not read it at install. | anywhere |
| `rules` | The APIs of the modules before this one in `RULES`, keyed by `name`. | anywhere |
| `ctx.env` | Host-only facts handed to `validate(edit, { from, tick, env })`. They may differ per machine, so never use them in apply or ticks. A missing one makes validate throw, and the edit is rejected. | validate only |

Rules:

- Lockstep math only (DESIGN.md, "Determinism from day one"): the determinism lint covers this folder, and its import
  lint allows only `../grid.ts`, `../../sim/*` and sibling rules (no
  three.js, DOM, timers or `performance`).
- `apply` returns its result (changed cells, the item taken); effects go in the adapter's `onApplied(e, tick, result)`.
- Changing what `serialize` writes requires a dated `WORLD_NS` break during development. States have no version or
  migration chain. `test/world-snapshots.test.ts` checks current round-trips and malformed input.

## Edit generators and invariants

`test/world-replay.test.ts` runs a host and two clients on the real rules and the home land, feeds them a seeded
stream of every registered op, kills the host midway, adds a late joiner after an edit, reloads a JSON snapshot in a
fresh tab, and requires every peer to hash every state the same at every shared tick, every invariant to hold, and a
second run with the same seed to give the same result. It fails when a registered op has no generator, or when no
edit of that op was ever accepted. So a module with ops exports:

```ts
import { JUNK, bad } from './edit-gen.ts';
// r: the peer's seeded stream { int(lo, hi), pick(a), chance(p), next() }; view: { rules, land, tick } of that peer.
export const edits = {
  'thing.poke': (r, view) => (r.chance(JUNK) ? bad(r, 'thing.poke') : { op: 'thing.poke', i: r.int(200, 240), j: 210 }),
};
// Optional: null while the state is sane, else a message. api is this module's, rules all of this peer's.
export function invariants(api, rules) {
  return api.thing.total() >= 0 ? null : 'negative total';
}
```

- Most generated edits should be ones the host accepts, built from that peer's state (a free cell, an item
  that exists); about a fifth (`JUNK`) come from the shared `bad(r, op)`: wrong types, missing fields, cells off the
  grid, oversized payloads. Return `null` when there is nothing sensible to do yet.
- Edits are JSON-safe, with integer `i`/`j` and no `p` (sync adds it).
- Invariants check what would silently break: conserved quantities, unique ids, caps, spacing.

**Redrawing views.** A sim state that views draw can keep a `rev` counter, bumped on changes and loads,
never saved or hashed. A view redraws when `rev` differs from the one it last drew.

## env keys

| Key | Set by | Server | Used by |
|---|---|---|---|
| `protoRoom` | No browser assignment needed for admission | `isProtoRoom(roomId)` in `server/src/host/world-host.ts` | `tune.set`, `tune.commit` validate |
| `tuneController` | No browser assignment; absent means writes are refused | Explicit `TUNE_CONTROLLER_KEY` compared with the sender's bound socket key in `server/src/host/hosted-room.ts` | `tune.set`, `tune.commit` validate; a room lead has no tuning authority by election |

The server hosts rooms with no renderer (docs/plans/server-host.md), so a new key needs a "Server" source too:
`server/test/world-host.test.ts` feeds every op's generators to the server's world and fails until it does.

## Template

```ts
// <What the system is.> Lockstep: runs the same on every peer (see ./README.md).
import { createThing } from '../../sim/thing.ts';
import { JUNK, bad } from './edit-gen.ts';

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

This sketch shows the retained transport wiring; `tune.ts` has typed `SyncView`, edit fields, generators and API.
New shared state follows the Server-kind direction; step 9 removes this classic recipe.

## Modules

Rail tuning is installed separately by `tune.ts`'s `installRailTune`: it registers `railTune` as Server kind and defines `tune.set`/durable `tune.commit` on `server-ops.ts`. Its 30 rail keys are projected globally by `../classic-replicate.ts`; clients mirror them and never hash or simulate them. The `tune` row below contains only the eight haul keys. Server rail validation receives `protoRoom` and `tuneController` directly in the command context; the env table above describes the retained haul path.

The railway is not a rules module: it is Server kind (`../railway-server.ts`, replicated by `../railway-replicate.ts`; docs/plans/replication.md), saved with the host's checkpoint and never registered as a lockstep op or hashed state.

| Module | Ops | State | API |
|---|---|---|---|
| `roster.ts` | `who.set` | `roster` | Stable ordinals, names and colours (cap 256). Server-kind in railway rooms; classic registration retained for transport fixtures through step 9. |
| `tune.ts` | `tune.set`, `tune.commit` | `tune` | Eight haul keys, with unchanged defaults, catalog order and revision. Both writes require a proto room and explicit tuning controller. `tune.commit` compares the revision and returns a correlated result. |
| `edit-gen.ts` | none | none | Not a rules module (not in `RULES`): `JUNK` and `bad(r, op)` for the modules' `edits` generators |

The land (`{ n, layout }`) comes from `../home-land.json` outside the game (server, tests); see `../README.md`.
