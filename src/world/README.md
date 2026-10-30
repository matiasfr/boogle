# World: shared, deterministic island state

Everything players can change and everyone must agree on (mushrooms, items, weather, tide) lives behind this module. It follows DESIGN.md: **sync edits, not state**, Lockstep math (integers for conserved quantities), fixed order, host-authoritative.

## Pieces

| File | Owns |
|---|---|
| `sync.js` | Tick clock, edit pipeline (submit → host stamps → everyone applies in order), state registry, snapshots, hashes, late join, host migration and persistence (wire messages and save rules at its top). |
| `rules/` | The lockstep half of each system (ops, state, ticks), one module per system, installed in `RULES` order. **Adding a lockstep system: `rules/README.md`.** |
| `game-world.js` | The island's `land` and the rules installed on the real sync (`rules.mushrooms`, ...). Adapters import it first. |
| `grid.js` | Pure, lockstep: grid constants. |
| `background.js`, `clock-worker.js` | Keep the world ticking while the tab is hidden. |

Pure sim logic lives in `../sim/` (mushrooms, gifts, ...); the game side of lockstep state in `../adapters/`
and `../features/`. `registerOp`, `registerState` and `onTick` are lint-banned outside `rules/` and `game-world.js`;
tests install the rules on their own sync instances (`test/helpers/net.mjs`).

## Contract (`sync.js`)

```js
// Rules modules get registerOp/registerState/onTick through install(sync, ...); adapters import the rest.
import { TICK_MS, world, submitEdit, onApplied, onAfterTick, onSnapshot, setEnv } from './world/sync.js';

TICK_MS                      // 100: sim runs at 10 ticks/s
world.tick                   // integer, current sim tick (same on every client once synced)
world.seed                   // integer room seed (for seeded RNG via mulberry32 in src/sim/rng.js)

registerOp(op, {
  validate(edit, ctx) { },   // host only: return true to accept. ctx = { from, tick, env }. Reject out-of-range, rate abuse.
  apply(edit, tick) { },     // everyone: mutate registered state, deterministically. No effects: return a result instead.
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
                             // result is what apply returned. Runs on every peer: effects for the submitter only check
                             // edit.p === room.selfId ('local' with no room; src/adapters/gifts.js). Not replayed after
                             // a snapshot load, so onSnapshot rebuilds the view. A throwing listener is logged.
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

Grid cells use the heightfield indexing from `src/adapters/terrain.js`: `heights[i][j]` is world `x = i*CELL - HALF`, `z = HALF - j*CELL`.

Integer units: base heights are stored in **centimetres** (`Int16`). Base terrain is quantized once with `Math.round(h * 100)`.

### Ordering inside one tick
1. Apply that tick's edits (host sequence order).
2. Run `onTick` handlers in registration order (a system that reads another's state registers after it).
3. Run `onAfterTick` handlers in registration order.

Lockstep math only (AGENTS.md; DESIGN.md, "Determinism from day one"). Wall-clock time enters only through the tick number (and `world.epochMs` for offline growth, which the host fixes).

## Other exports

Networked through `attachWorld(room, { roomId, serverUrl })` (called from `src/netplay/net.js`); without a room it
runs locally (edits apply next tick). Clients run ~2-3 ticks behind the host; edits apply 3 ticks after the host stamps
them.

- `onSnapshot(fn)`: state was replaced from a snapshot; rebuild meshes.
- `onDesync(fn)`: a hash check failed, `{ tick, keys }`.
- `onSnapFail(fn)`: a snapshot from a peer, localStorage or the server could not be loaded, or one state in it:
  `{ from, reason }`; `from: 'state'` with reason `'<key> load'` (that state started fresh) or `'<key> newer'`.
- `worldStatus()`: debug. `loadErrors` counts states that started fresh; `newerSave` is true once a state saved by a
  newer build was skipped (here or by the host whose snapshot this tab loaded), after which this tab never persists.
- `profileTicks()`: `npm run perf -- --sim` only. Times every op apply, handler and state hash until `stop()`, which
  returns `{ rows, kinds }` (one `{ label: ms }` row per tick; each label's registry: `'sim'`, `'applied'` or `'view'`).
