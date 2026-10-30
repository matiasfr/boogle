# World: shared, deterministic island state

Everything players can change and everyone must agree on (terrain edits, water, weather, tide) lives behind this module. It follows DESIGN.md: **sync edits, not state**, Lockstep math (integers for conserved quantities), fixed order, host-authoritative.

## Pieces

| File | Owns |
|---|---|
| `sync.js` | Tick clock, edit pipeline (submit → host stamps → everyone applies in order), state registry, snapshots + hashes, late-join and persistence. |
| `rules/` | The lockstep half of each system (ops, state, sim ticks), one module per system, installed in `RULES` order. See `rules/README.md`. |
| `game-world.js` | The island's `land` and the rules installed on the real sync (`rules.terrain`, ...). Adapters import it first. |
| `terrain-edits.js` | Phase 3 adapter: the sand layer (`rules/terrain.js`: dig/pile/flatten on the base heightfield) to mesh/physics/water height texture, plus the shovel. |
| `../sim/water.js` | Phase 4: pure integer column water simulation (no three.js, no DOM). |
| `../sim/mushrooms.js` | Mushroom patch: buried seeds, watering, growth ticks (ops `mush.plant`, `mush.water`, state `mushrooms`). |
| `../sim/gifts.js` | Island gifts: fruit on the palms, things washing up on the beach, thrown things and perched ones (ops `fruit.drop`, `gift.take`, `gift.toss`, state `gifts`). |

`src/sim/*` modules are pure functions over typed arrays so they can run in Node tests and, later, a Web Worker. Rendering and input code adapts them to the game.

## Adding a lockstep system

Four files, nothing else edited (AGENTS.md, "Features plug in"):

1. `src/sim/<x>.js` plus `test/<x>.test.mjs`: the pure logic (typed arrays, integers, seeded RNG).
2. `src/world/rules/<x>.js`: `install(sync, land, rules, opts)` registers its ops, state and ticks on the `sync` it is
   given and returns an API (`rules/README.md` has the contract and a template). It also exports `edits`, a seeded
   generator per op for the replay test (`test/world-replay.test.mjs`), and optionally `invariants`.
3. One appended line in `RULES` (`rules/index.js`). Append only: its order is the wire order.
4. `src/features/<x>.js`: the adapter. It reads `rules.<x>` from `game-world.js`, sends `submitEdit`, and reacts
   through `onApplied`, `onAfterTick` and `onSnapshot`. Host-only facts that validate needs go in through `setEnv`.

`registerOp`, `registerState` and `onTick` are lint-banned outside `src/world/rules/` and `game-world.js`.
`game-world.js` is the only place that installs the rules on the real sync; tests install them on their own sync
instances (`test/helpers/net.mjs`).

## Contract (`sync.js`)

```js
// Rules modules get registerOp/registerState/onTick through install(sync, ...); adapters import the rest.
import { TICK_MS, world, submitEdit, onApplied, onAfterTick, onSnapshot, setEnv } from './world/sync.js';

TICK_MS                      // 100: sim runs at 10 ticks/s
world.tick                   // integer, current sim tick (same on every client once synced)
world.seed                   // integer room seed (for seeded RNG via mulberry32 in src/sim/rng.js)

registerOp(op, {
  validate(edit, ctx) { },   // host only: return true to accept. ctx = { from, tick, env }. Reject out-of-range, rate abuse.
  apply(edit, tick) { },     // everyone: mutate registered state. Must be deterministic (integers only). May return a result.
})                           // registering an op or state key twice throws (order is wire order)
registerState(key, {
  serialize() { },           // -> JSON-safe value (use arrays of ints / base64 of typed arrays)
  load(json) { },            // replace state from a snapshot; may throw on bad data (the state then starts fresh)
  hash() { },                // -> uint32 of the state, for desync detection
  version: 0,                // bump when serialize's format changes, and add the step that converts older saves:
  migrate: { },              // { [v]: json => json }, json at v-1 -> json at v; loads run them in order from the saved
})                           // version (snapshot.vers[key], missing = 0) up to this one
onTick(fn, label?)           // fn(tick) every sim tick, in registration order, after that tick's edits are applied
onAfterTick(fn, label?)      // fn(tick) after every onTick handler, before the host hashes (render work)
onApplied(fn, label?)        // fn(edit, tick, result) after an edit is applied (render hooks: rebuild mesh, splash, sounds);
                             // result is what apply returned. A throwing listener is logged and the next one still runs.
                             // label: the handler's name in `npm run perf -- --sim` (ms per tick)

submitEdit({ op, i, j, ...args })  // any client. `i, j` are integer grid cells. `p` (player selfId) is added by sync.
                                   // Returns true if queued, not applied: the host may reject it, and edits held
                                   // while reconnecting can be dropped (see sync.js header). Use onApplied for
                                   // anything irreversible.
setEnv(partial)              // host-only facts for validate (ctx.env), e.g. a render-side check; may differ per machine,
                             // so never read it in apply or ticks. A missing fact makes validate throw: the edit is rejected.
registry()                   // { ops, states }: registered keys in order
```

Edits arrive at every client as `{ op, i, j, p, ...args }` and are applied at the host-assigned tick, so all clients apply the same edits in the same order on the same tick. Ties within a tick are ordered by the host's sequence number.

Grid cells use the heightfield indexing from `src/terrain.js`: `heights[i][j]` is world `x = i*CELL - HALF`, `z = HALF - j*CELL`.

Integer units: heights and water depths are stored in **centimetres** (`Int16`/`Int32`). Base terrain is quantized once with `Math.round(h * 100)`.

### Ordering inside one tick
1. Apply that tick's edits (host sequence order).
2. Run `onTick` handlers in registration order (e.g. water flow first, then systems that read water).
3. Run `onAfterTick` handlers in registration order.

Shared logic must not use `Math.random`, `Date.now`, or float math that differs between browsers (`Math.sin`, `cos`, `pow`, `exp`, `log`, `atan2`, `hypot`); conserved quantities stay integers. See DESIGN.md, "Determinism from day one". Wall-clock time enters only through the tick number (and `world.epochMs` for offline growth, which the host fixes).

## Status

Networked. Message types, host migration and persistence are documented at the top of `sync.js`. Extra exports: `attachWorld(room, { roomId, serverUrl })` (called from `src/net.js`), `onSnapshot(fn)` (state was replaced from a snapshot: rebuild meshes), `onDesync(fn)` (a hash check failed: `{ tick, keys }`), `onSnapFail(fn)` (a snapshot from a peer, localStorage or the server could not be loaded, or one state in it: `{ from, reason }`, `from` = `'state'` with reason `'<key> load'` or `'<key> newer'`), `worldStatus()` (debug; `loadErrors` counts states that failed to load and started fresh, `newerSave` is true once a state saved by a newer build was skipped, after which this tab never persists), `profileTicks()` (`npm run perf -- --sim` only: times every op apply, `onApplied`/`onTick` handler and state hash until `stop()`, which restores them and returns one `{ label: ms }` row per tick). Without a room it runs locally (edits apply next tick). Clients run ~2-3 ticks behind the host, and edits apply 3 ticks after the host stamps them.
