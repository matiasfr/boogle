# World: shared, deterministic island state

Everything players can change and everyone must agree on (items, piles) lives behind this module. It follows DESIGN.md: **sync edits, not state**, Lockstep math (integers for conserved quantities), fixed order, host-authoritative.

## Pieces

| File | Owns |
|---|---|
| `sync.ts` | Tick clock, edit pipeline (submit → host stamps → everyone applies in order), state registry, snapshots, hashes, late join and the host's saves; the host is our server (`server/src/host/world-host.ts`) (wire messages and save rules at its top). |
| `rules/` | The lockstep half of each system (ops, state, ticks), one module per system, installed in `RULES` order. **Adding a lockstep system: `rules/README.md`.** |
| `namespace.ts` | `WORLD_NS` and `worldRoomId(room)`: the id a room's world lives under (host id, saves). Bumped on a clean break; a bump also resets players' local progress: `src/player/world-reset.ts`. |
| `game-world.ts` | The island's `land` and the rules installed on the real sync (`rules.gifts`, ...), and the railway mirror. Adapters import it first. |
| `replicate*.ts`, `room-clock.ts` | Replication (docs/plans/replication.md): component schemas, the server's touched-entity diff and per-client send, the client mirror and prediction hooks; the one 60 Hz room clock. |
| `railway-server.ts`, `railway-replicate.ts` | The railway as Server kind: the host's rules (actions applied on arrival, a server state saved with the checkpoint) and its projections; the client mirror, a world published whole (`confirmed()`) that views and the predictor read. |
| `grid.ts` | Pure, lockstep: grid constants. |
| `background.ts`, `clock-worker.ts` | One bounded elapsed-time clock shared by visible frames and hidden-tab heartbeats; independent of the physics frame clamp. |

Pure sim logic lives in `../sim/` (gifts, piles, ...); the game side of lockstep state in `../adapters/`
and `../features/`. `registerOp`, `registerState` and `onTick` are lint-banned outside `rules/` and `game-world.ts`;
tests install the rules on their own sync instances (`test/helpers/net.ts`).

## Contract (`sync.ts`)

```js
// Rules modules get registerOp/registerState/onTick through install(sync, ...); adapters import the rest.
import { TICK_MS, world, submitEdit, onApplied, onRejected, onAfterTick, onSnapshot, setEnv } from './world/sync.ts';

TICK_MS                      // 100: sim runs at 10 ticks/s, one tick per 6 steps of the 60 Hz room clock (room-clock.ts)
roomStep()                   // the room clock in 60 Hz steps: tick * 6 + phase on the host; a client's estimate of it
stepWorld(ms)                // host (and local) only: advance the room clock; world-host.ts drives it from a 60 Hz timer
onStep(fn)                   // host: fn(step) after every step (replication's end-of-step flush)
world.tick                   // integer, current sim tick (same on every client once synced)
world.seed                   // integer room seed (for seeded RNG via mulberry32 in src/sim/rng.ts)

registerOp(op, {
  hostOnly: false,           // true: only the host's own submit is stamped (a broadcast edit can't be replayed by a client)
  validate(edit, ctx) { },   // host only: return true to accept. ctx = { from, tick, env }. Reject out-of-range, rate abuse.
  apply(edit, tick) { },     // everyone: mutate registered state, deterministically. No effects: return a result instead.
})                           // registering an op or state key twice throws (order is wire order)
registerState(key, {
  serialize() { },           // -> JSON-safe value (use arrays of ints / base64 of typed arrays)
  load(json) { },            // replace state from a snapshot; may throw on bad data (the state then starts fresh)
  hash() { },                // -> uint32 of the state, for desync detection
})                           // shape changes use a dated WORLD_NS break during development
onTick(fn, label?)           // fn(tick) every sim tick, in registration order, after that tick's edits are applied
onAfterTick(fn, label?)      // fn(tick) after every onTick handler, before the host hashes (render work)
onApplied(fn, label?)        // fn(edit, tick, result) after an edit is applied (render hooks: rebuild mesh, splash, sounds);
                             // result is what apply returned. Runs on every peer: effects for the submitter only check
                             // edit.p === room.selfId ('local' with no room; src/adapters/gifts.ts). Not replayed after
                             // a snapshot load, so onSnapshot rebuilds the view. A throwing listener is logged.
                             // label: the handler's name in `npm run perf -- --sim` (ms per tick)

submitEdit({ op, i, j, ...args })  // any client. `i, j` are integer grid cells. Sync adds `p` (the session's selfId),
                                   // and the host adds `u` (the player's pid, from the room's pidOf: the server
                                   // binds it when the tab connects; an edit's own u is dropped). Edits from a
                                   // session with no pid are rejected.
                                   // Returns true if queued, not applied: the host may reject it, and edits held
                                   // while reconnecting can be dropped (see sync.ts header). Use onApplied for
                                   // anything irreversible.
setPid(pid)                  // this tab's player id (src/player/identity.ts), for edits it stamps itself (local)
onRejected(fn)              // fn({op, requestId}) for a host admission refusal; returns unsubscribe, never success
pidOf(selfId)                // a session's pid, or null
setEnv(partial)              // host-only facts for validate (ctx.env), e.g. a render-side check; may differ per machine,
                             // so never read it in apply or ticks. A missing fact makes validate throw: the edit is rejected.
registry()                   // { ops, states }: registered keys in order
```

Edits arrive at every client as `{ op, i, j, p, ...args }` and are applied at the host-assigned tick, so all clients apply the same edits in the same order on the same tick. Ties within a tick are ordered by the host's sequence number.

An edit with nonempty `op` and `requestId` strings of at most 80 characters receives a targeted `w:rejected`
when the host refuses admission. The edit must fit the existing message size limit. Clients accept the receipt
only from an already-pinned host and only for their own session; it cannot elect a host or advance simulation.
The server blocks client-origin receipts. Accepted edits still resolve through `onApplied`; a disconnect or lost
receipt may leave a caller's outcome unknown, so a timeout is never a success or a proved refusal.
The receipt may carry a bounded `reason`: `recovery-budget` means no stamp was issued because the durable tail
is full; `request-id-too-long` means the T1 tuning correlation exceeds 64 UTF-16 code units. Unknown reasons
are ignored. After budget pressure clears, callers may submit a new request using the current revision.

Grid cells use the heightfield indexing from `src/island/terrain.ts`: `heights[i][j]` is world `x = i*CELL - HALF`, `z = HALF - j*CELL`.

Integer units: base heights are stored in **centimetres** (`Int16`). Base terrain is quantized once with `Math.round(h * 100)`.

### Ordering inside one tick
1. Apply that tick's edits (host sequence order).
2. Run `onTick` handlers in registration order (a system that reads another's state registers after it).
3. Run `onAfterTick` handlers in registration order.

Lockstep math only (AGENTS.md; DESIGN.md, "Determinism from day one"). Wall-clock time enters only through the tick number (and `world.epochMs`, the wall time of tick 0, which a host that loaded a save compares with its clock to submit `bank.wake` for the time nobody hosted).

## Other exports

Networked through `attachWorld(room, { roomId })` (called from `src/netplay/net.ts`); the server attaches its world
with `{ host: true, storage }` (`server/src/host/world-host.ts`). Without a room it runs locally (edits apply next
tick). Tabs run ~2-3 ticks behind the server; edits apply 3 ticks after it stamps them.

- `saveNow(force?)`: the host saves now to its storage, with `force` even if no state changed since the last save (the
  tick moved on); `attachWorld(room, { saveMs })` sets how often saves happen (default 30 s; the server uses 2 s).
- `onSnapshot(fn)`: state was replaced from a snapshot; rebuild meshes.
- `onDesync(fn)`: a hash check failed, `{ tick, keys }`.
- `onSnapFail(fn)`: a snapshot from the host (`from: 'peer'`) or the host's own save (`'local'`) could not be loaded, or one state in it:
  `{ from, reason }`; `from: 'state'` with reason `'<key> load'` (that state started fresh).
- `worldStatus()`: debug. `snapBytes` is the size of the last snapshot saved or served (budget 128 KB, `MAX_RECOVERY_BYTES`, with every state
  at its caps, `test/world-size.test.ts`). `loadErrors` counts states that started fresh; `badSave` prevents a host from
  saving or serving a failed-load fallback.
- `profileTicks()`: `npm run perf -- --sim` only. Times every op apply, handler and state hash until `stop()`, which
  returns `{ rows, kinds }` (one `{ label: ms }` row per tick; each label's registry: `'sim'`, `'applied'` or `'view'`).

## Isolated production recovery

Railway rooms use `attachWorld(..., { recovery })`; ordinary rooms keep snapshot storage. `recovery.read` supplies the current envelope containing the checkpoint/hash, catalog/namespace, ordered future stamps, sequence watermark and checksum. `recovery.write` must reject refusal or I/O failure and resolve only after atomic replacement succeeds. There are no state versions or migrations: a changed shape starts a new development world through `WORLD_NS`.

Sync freezes production stamps, ticking and snapshot serving while a replacement is pending. A stamp batch is written before publication; reentrant edits submitted by a tick callback also stop advancement at that boundary. Recovery validates the whole envelope, replays its tail using the existing tick order, then checkpoints before readiness. `whenDurable()` drains the barrier and rejects on failure. `receiveEdit(edit, authenticatedSession)` exposes admission to the isolated request coordinator; admission is still not a terminal material receipt.

The complete envelope is capped at **128,000 UTF-8 bytes** (`MAX_RECOVERY_BYTES`, raised from 60,000 on 6 November), including its at-most-64 future stamps. Admission checks the serialized checkpoint and complete candidate tail before consuming a sequence number, accounting for JSON escaping, UTF-8 and maximum tick/hash/checksum widths. A full tail refuses new work with `recovery-budget`; it does not poison the room. The write boundary retains its independent size guard. Oversize, unsupported, corrupt or refused recovery stops production publication and never overwrites the last good file. The `badSave` guard also prevents serving a failed-load fallback in ordinary rooms. Process-crash durability is the guarantee; disk loss and power-loss flush guarantees are outside it.

## The land as data

`home-land.json` holds the land the rules run on: the grid size `n`, and the gifts layout (palm cells, the log spots, and perch cells). The server
and Node tests read it (`test/helpers/land.ts`); `dev/scenarios/world-inputs.ts` checks it against the running game
and rewrites it with `UPDATE_FIXTURE=1 npm run scenario -- world-inputs` when a tree, rock or POI
moves on purpose.

Playable railway uses the same complete tuning state, controller authorization and correlated receipts as classic. Its transport permits only the two supply timers in prototype rooms. Current recovery verifies the registered state, checksum, checkpoint hash and accepted tail before atomic replacement. Frozen historical verifiers and old tuning migrations were removed under the owner's 5 November no-old-builds call; the old integration record in [production-core](../../docs/plans/production-core.md#supply-branch-integration-5-november) is historical.

T1 forwards only known tuning fields, never arbitrary client padding. Its commit request IDs are preserved exactly and capped at 64 UTF-16 code units; the usual UUID fits. IDs of 65–80 units receive `request-id-too-long`; larger IDs are outside the existing receipt correlation limit and are discarded. This adds no authority and changes no accepted edit, recovery version, namespace or catalog.
