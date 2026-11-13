# World rules: the lockstep half of each system

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
   Add its API to `Rules` in `src/world/rules/types.ts` too (see `PilesApi`).
4. `src/features/<x>.ts`, the adapter. It imports `rules` from `../world/game-world.ts` **first** (so the rules are
   registered before anything else), reads `rules.<x>`, sends `submitEdit`, and reacts in `onApplied`,
   `onAfterTick` and `onSnapshot`. Host-only facts that validate needs go in through `setEnv` (below, "env keys").
   If other modules (hands) must import the adapter, put it in `src/adapters/<x>.ts` instead, with a thin
   feature file, since features cannot import each other. Example: `src/adapters/gifts.ts`.

Update the system's `docs/game-design/` chapter (new system: add a chapter and index line), and its atlas story for a new sync system or big feature. Run `npm run check`. Run `check:full` locally only when touching `src/net*`, `src/world/sync.ts`, `src/world/game-world.ts` or `server/`. New tests are for lockstep determinism, conservation and validation; UI, features, tuning and feel use `look`, with a new scenario only for a sync contract (see AGENTS.md's entity-core exception). Notes:

- A system on the ground (markers, castles) stores grid cells `g = i*n + j`. The ground is fixed (digging was removed
  2026-10-30) and is not a lockstep input: `land` holds only `n` and the gifts `layout`. A height that validate needs
  comes in through `setEnv`.
- `setEnv` is only for validate facts the rules cannot compute (what the render side sees: trees, props). Anything
  derivable from `land` and the rules' state is checked in validate directly.
- Ids come from a counter in the state, never a per-peer one.
- Players start an action through the registries (docs/agents/registries.md, "Shared registries"); a new carried item is appended to
  `GIFTS` in `src/sim/gift-catalog.ts` (ground items store its index: reorder only with a `WORLD_NS` bump; it also needs The Boogler's `taste` and `line`), and what using it does is a case
  in `useDown` in `src/player/hands.ts`.

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
stream of every registered op, kills the host midway, adds a late joiner after a toss, reloads a JSON snapshot in a
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

**Redrawing views.** A sim state that views draw can keep a `rev` counter, bumped on every change (in its own
functions and on load) and never saved or hashed (`piles`, `sites`, `sources`). A view redraws when `rev` differs
from the one it last drew: that covers edits, ticks (freight, trickles, runs ending) and snapshots, without matching
op names.

## env keys

| Key | Set by | Server | Used by |
|---|---|---|---|
| `protoRoom` | `src/features/proto-haul.ts` (`isProtoRoom(getRoomId())`) | `isProtoRoom(roomId)` in `server/src/host/world-host.ts` | `tune.set`, `tune.commit`, `tune.fill`, `tune.reset`, `open.lay` validate |
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

This sketch shows the wiring; copy `piles.ts` for typed `SyncView`, `Land`, edit fields, generators and API. Then append `thing` to `RULES` in `index.ts`, add its API to `Rules` in `types.ts`, and read `rules.thing` from `../game-world.ts` in the adapter.

## Modules

Rail tuning is installed separately by `tune.ts`'s `installRailTune`: it registers `railTune` as Server kind and defines `tune.set`/durable `tune.commit` on `server-ops.ts`. Its 30 rail keys are projected globally by `../classic-replicate.ts`; clients mirror them and never hash or simulate them. The `tune` row below contains only the eight haul keys. Server rail validation receives `protoRoom` and `tuneController` directly in the command context; the env table above describes the retained haul path.

The railway is not a rules module: it is Server kind (`../railway-server.ts`, replicated by `../railway-replicate.ts`; docs/plans/replication.md), saved with the host's checkpoint and never registered as a lockstep op or hashed state.

| Module | Ops | State | API |
|---|---|---|---|
| `gifts.ts` | `gift.take`, `gift.toss` | `gifts` | `{ gifts }`: thrown items and the frisbee perch over `land.layout`; exports `SEEDS`, `LOST` |
| `roster.ts` | `who.set` | `roster` | `{ roster, indexOf(pid), ensure(pid), nameOf(k), colorOf(k), size() }`: every pid seen, with name and colour, by index of first sight (cap 256). Tables store players as this index; `ensure` adds one (apply only). |
| `piles.ts` | `pile.drop`, `pile.take` | `piles` | `{ piles, drop(i, j, k, n), room(k, n) }`: loose material on the ground (`../../sim/piles.ts`); `drop` returns `{ placed, ids }` |
| `stacks.ts` | none | `stacks` | `{ stacks, count(pid), kind(pid), countAt(k), kindAt(k), room(pid, k), add(pid, k, n), take(pid, n) }`: what each player carries (`../../sim/stacks.ts`), by roster index; later rules call `add`/`take` in their apply |
| `sites.ts` | `site.stock`, `site.run` | `sites` | `{ sites, onSectionDone(fn), age(), isDone(s), points(pid), room(s, ring), canRun(s), run(s, tick), helpers(), addFreight(n) }`: work sites on the preset route (`../../sim/sites.ts`, `../../sim/route.ts`), plaques, machine runs (`../../sim/scripted-run.ts`), helper freight and the age change (derived from `open`); later rules subscribe to `onSectionDone` at install |
| `sources.ts` | `src.take` | `sources` | `{ sources, charges(id), list() }`: the current age's material sources (`../../sim/sources.ts`; wood: the log bundles at the palm cells in `land.layout.trees`), stored as charges spent; refills on `sites.onSectionDone` and a seeded trickle tick |
| `bank.ts` | `bank.wake` (`hostOnly`) | `bank` | `{ bank, ms() }`: offline time already turned into helper freight (`../../sim/bank.ts`); only the host's own wake is stamped |
| `tune.ts` | `tune.set`, `tune.commit`, `tune.fill`, `tune.reset` (`proto-` rooms only, env `protoRoom`) | `tune` | `{ tune, cost(s, ring), get(key) }`: haul lockstep values (`../../sim/tune.ts`), with all resolved defaults, catalog and revision saved and hashed. `tune.commit` compares the expected revision and catalog, and returns a correlated applied/rejected result after application; admission refusal returns `w:rejected` through `onRejected`. Both value-write ops require `tuneController`. `tune.fill` fills the open Track ring (as freight); `tune.reset` empties stacks, piles, sites and bundles without undoing tuning. `stacks`, `sites` and `sources` read `rules.tune` at run time (it installs after them) |
| `opening.ts` | `open.start`, `open.here`, `open.lay` (`proto-` rooms only, env `protoRoom`) | `opening` | `{ opening, ready(), bell(tick), era(tick) }`: opening day (`../../sim/era.ts`): the tick it started, once the age's last section is laid (first start wins), and the tick everyone was at the platform (`open.here`, which ends the gathering call early, once); `bell` is its run (phase `call`, then `bell`), `era` the derived era (2 once the bell has run out). `open.lay` is the playtest shortcut that lays the rest of the route; `tune.reset` also undoes opening day |
| `edit-gen.ts` | none | none | Not a rules module (not in `RULES`): `JUNK` and `bad(r, op)` for the modules' `edits` generators |

The land (`{ n, layout }`) comes from `../home-land.json` outside the game (server, tests); see `../README.md`.
