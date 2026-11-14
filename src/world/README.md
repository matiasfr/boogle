# World: server state and client mirrors

Railway state, rail tuning, roster and seats are Server kind. Since v40, no lockstep state or classic edit transport
remains. Clients mirror the server and may predict declared railway actions; a client predicting nothing is correct.
The Boogler uses Server legs and a saved pose. Player movement and seat pose remain Owner kind.

Players step 6 makes the 10 Hz brain authoritative against baked land, with independent decision RNG and bounded
presence inputs. It saves only position/facing and publishes a global `booglerLeg` on decisions, never each tick.
It pauses with no connected players. `/rooms/:id/host` exposes pose/leg and elapsed tick cost.

## Pieces

| File | Owns |
| --- | --- |
| `sync.ts` | Room clock, server state registration, checkpoint integrity and save guards. Its only wire message is the server clock `w:c`. |
| `server-ops.ts`, `rules/` | Authenticated server command validation/application; durable roster and tune commits. See `rules/README.md`. |
| `namespace.ts` | `WORLD_NS` and `worldRoomId(room)`. A dated namespace break resets changed wire/save shapes and local progress, without migration. |
| `game-world.ts` | Static land and read-only roster/railway mirrors. No client state registration. |
| `replicate*.ts`, `room-clock.ts` | Component schemas, changed-row replication, complete client mirrors, prediction hooks and the 60 Hz room clock. |
| `railway-server.ts`, `railway-replicate.ts`, `railway-predict.ts` | Server railway rules and projections, published client state and bounded local action prediction. |
| `classic-replicate.ts` | Server roster and rail-tune projections/mirrors; the filename is historical, not a classic transport. |
| `seat-replicate.ts` | Transient global seat occupancy rows keyed by seat id; complete client mirrors keyed by pid and seat. |
| `grid.ts` | Pure grid constants. |
| `background.ts`, `clock-worker.ts` | Bounded elapsed time shared by visible frames and hidden-tab heartbeats. |

Pure logic lives in `../sim/`; view and input adapters live in `../adapters/` and `../features/`.

## Contract (`sync.ts`)

```ts
TICK_MS                 // 100 ms; one rule tick per six steps of the 60 Hz room clock
roomStep()              // host step or client's estimate; -1 before hearing the server
stepWorld(ms)           // server/local simulation only; clients use updateWorld(dtSeconds)
onStep(fn)              // server callback after each step, for replication flushes
world.tick              // authoritative server tick; client estimate for presentation
world.seed              // persisted room seed

registerState(key, {
  serialize() {},       // JSON-safe checkpoint value
  load(json) {},        // replace state; throw on malformed data
  hash() {},            // deterministic uint32 for checkpoint integrity, not peer comparison
}, { server: true })    // duplicate keys and client registration fail
onTick(fn, label?)      // server/local rule ticks, in registration order
registry()             // { states }, in checkpoint order
snapshot()             // { tick, seed, epochMs, data }; server-owned checkpoint state
```

The host advances ticks and runs registered rules; clients estimate time from `w:c { ht }` received only from
`SERVER_ID`. A client cannot elect a host, run shared ticks or write a checkpoint. Legacy/malformed client `w:*`
messages do not enter the command path. Commands use the railway session's `r:*` messages and `s` replication
packets with ordered request identities and receipts. Queuing a request does not prove acceptance.

`attachWorld(room, { roomId })` attaches a client's clock. The server passes `{ host: true, recovery }`.
`onSnapshot(fn)` retains its existing name: on a host it signals completed startup/load; on a client it signals
the first accepted clock after attachment/reconnection. Authoritative view rebuilds follow complete replication
packets, not this clock notification.

## Checkpoints and verified saves

The current recovery envelope contains a checkpoint, its state hash, namespace/catalog and an envelope checksum.
There is no edit tail, sequence watermark or client hash. Recovery verifies the envelope, exact registered state
keys, every state load and the loaded checkpoint hash before readiness. `badSave` prevents a failed-load fresh
fallback from being persisted. A fatal command or rule failure stops further saves and publication; a previously
started atomic write owns an immutable earlier checkpoint and may finish.

`recovery.write` must reject refused writes and I/O errors, and resolve only after atomic replacement succeeds.
`whenDurable()` drains the write and rejects on failure. Durable command acknowledgements wait for their checkpoint;
the host checks fatal status before and after draining older writes. Periodic checkpoints run every two seconds
on the server, with a save on close. Non-durable actions can therefore roll back by up to the checkpoint interval.

- `saveNow(force?)` starts a safe host save; `force` also saves unchanged state at its newer tick.
- `worldStatus()` reports readiness, `badSave`, `loadErrors`, `recoveryError`, pending writes and checkpoint bytes.
- The full recovery envelope is capped at **128,000 UTF-8 bytes** (`MAX_RECOVERY_BYTES`). Oversize or corrupt data
  fails closed and does not overwrite the last good file.
- `profileTicks()` measures rule/view handlers and checkpoint hashing until `stop()` returns `{ rows, kinds }`.

These are current-checkpoint integrity guards, not old-save compatibility. A shape change takes a dated
`WORLD_NS` break. Process-crash recovery is the guarantee; disk loss and power-loss flush guarantees are outside it.

## Server replay and prediction

`test/world-replay.test.ts` compares server replay state for fixed inputs; sync/host tests cover clock, checkpoint,
join, reconnect and replica convergence. No classic trace oracle or cross-client lockstep remains.
`railway-predict.ts` still calls shared `railApply` on a clone, so rule ordering, seeded choices and the arithmetic
used by predicted actions must agree with server rules. Authoritative replicas correct disagreements; they do not
make arbitrary divergent prediction acceptable. See `docs/agents/lockstep.md` for the retained conservative math guard.

## The land as data

`home-land.json` contains the static grid size and legacy scenery layout (tree/perch cells), used by the server and
Node tools. `dev/scenarios/world-inputs.ts` checks it against the running game. Grid cells use
`x = i*CELL - HALF`, `z = HALF - j*CELL`; base terrain heights are quantized to centimetres.

All 30 rail tune keys are checkpointed in `railTune`, projected as global `tuneValue`/`tuneRev` rows and mirrored on
clients. The eight haul keys retired at v40. Roster uses durable `who.set` and global `player` rows keyed by stable
roster ordinal; clients never allocate ordinals. The seven classic gameplay states retired at v39.
