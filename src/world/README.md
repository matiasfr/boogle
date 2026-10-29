# World: shared, deterministic island state

Everything players can change and everyone must agree on (terrain edits, water, weather, tide) lives behind this module. It follows DESIGN.md: **sync edits, not state**, Lockstep math (integers for conserved quantities), fixed order, host-authoritative.

## Pieces

| File | Owns |
|---|---|
| `sync.js` | Tick clock, edit pipeline (submit → host stamps → everyone applies in order), state registry, snapshots + hashes, late-join and persistence. |
| `terrain-edits.js` | Phase 3: dig/pile ops, integer sand layer on top of the base heightfield, updating mesh/physics/water height texture. |
| `../sim/water.js` | Phase 4: pure integer column water simulation (no three.js, no DOM). |
| `../sim/mushrooms.js` | Mushroom patch: buried seeds, watering, growth ticks (ops `mush.plant`, `mush.water`, state `mushrooms`). |
| `../sim/gifts.js` | Island gifts: fruit on the palms, things washing up on the beach, thrown things and perched ones (ops `fruit.drop`, `gift.take`, `gift.toss`, state `gifts`). |

`src/sim/*` modules are pure functions over typed arrays so they can run in Node tests and, later, a Web Worker. Rendering and input code adapts them to the game.

## Contract (`sync.js`)

```js
import { TICK_MS, world, submitEdit, registerOp, registerState, onTick, onApplied } from './world/sync.js';

TICK_MS                      // 100: sim runs at 10 ticks/s
world.tick                   // integer, current sim tick (same on every client once synced)
world.seed                   // integer room seed (for seeded RNG via mulberry32 in src/sim/rng.js)

registerOp(op, {
  validate(edit, ctx) { },   // host only: return true to accept. ctx = { from, tick }. Reject out-of-range, rate abuse.
  apply(edit, tick) { },     // everyone: mutate registered state. Must be deterministic (integers only).
})
registerState(key, {
  serialize() { },           // -> JSON-safe value (use arrays of ints / base64 of typed arrays)
  load(json) { },            // replace state from a snapshot
  hash() { },                // -> uint32 of the state, for desync detection
})
onTick(fn)                   // fn(tick) every sim tick, in registration order, after that tick's edits are applied
onApplied(fn)                // fn(edit, tick) after an edit is applied (render hooks: rebuild mesh, splash, sounds)

submitEdit({ op, i, j, ...args })  // any client. `i, j` are integer grid cells. `p` (player selfId) is added by sync.
```

Edits arrive at every client as `{ op, i, j, p, ...args }` and are applied at the host-assigned tick, so all clients apply the same edits in the same order on the same tick. Ties within a tick are ordered by the host's sequence number.

Grid cells use the heightfield indexing from `src/terrain.js`: `heights[i][j]` is world `x = i*CELL - HALF`, `z = HALF - j*CELL`.

Integer units: heights and water depths are stored in **centimetres** (`Int16`/`Int32`). Base terrain is quantized once with `Math.round(h * 100)`.

### Ordering inside one tick
1. Apply that tick's edits (host sequence order).
2. Run `onTick` handlers in registration order (e.g. water flow first, then systems that read water).

Shared logic must not use `Math.random`, `Date.now`, or float math that differs between browsers (`Math.sin`, `cos`, `pow`, `exp`, `log`, `atan2`, `hypot`); conserved quantities stay integers. See DESIGN.md, "Determinism from day one". Wall-clock time enters only through the tick number (and `world.epochMs` for offline growth, which the host fixes).

## Status

Networked. Message types, host migration and persistence are documented at the top of `sync.js`. Extra exports: `attachWorld(room, { roomId, serverUrl })` (called from `src/net.js`), `onSnapshot(fn)` (state was replaced from a snapshot: rebuild meshes), `onDesync(fn)` (a hash check failed: `{ tick, keys }`), `onSnapFail(fn)` (a snapshot from a peer, localStorage or the server could not be loaded: `{ from, reason }`), `worldStatus()` (debug). Without a room it runs locally (edits apply next tick). Clients run ~2-3 ticks behind the host, and edits apply 3 ticks after the host stamps them.
