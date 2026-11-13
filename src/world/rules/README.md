# World rules: server registrations

Roster, railway tuning and seats are Server kind. The server validates and applies commands, checkpoints durable state and
projects values onto the railway replication stream. Clients read mirrors. The classic registrations, haul keys,
edit generators and lockstep transport retired at v40; they are not recipes for new shared state.

## Contract

`roster.ts` exports `installServer(sync, ops, replication, now)`; `tune.ts` exports
`installRailTune(sync, ops, replication)`. Seats use `installSeats(ops, replication, now)` without checkpoint registration.
The host calls them before the railway registration and projections.
`SyncView` in `types.ts` exposes the world clock, `registerState(..., { server: true })`, `onTick` and `onSnapshot`.
Checkpoint order is deterministic; clients install none of these state owners.

Commands use `ops.define(op, { validate, apply, durable? })` from `../server-ops.ts`. The request coordinator supplies
authenticated session/player identities, tick and Actor facts; tune validation receives `protoRoom` and
`tuneController` directly. A lead tab has no tuning authority. Apply changes state and returns a result; effects
belong to accepted receipts, replicated events or declared prediction. A thrown apply is fatal, never a safe refusal.
Durable commands hold their receipt until a safe checkpoint succeeds.

Register checkpoint handlers with JSON-safe `serialize`, strict `load` and deterministic `hash`. The hash verifies
the server checkpoint, not client agreement. A failed state load cannot be saved as fresh state. Projections use
`replication.define` and touch changed rows; clients publish only complete packet sets. A saved shape, catalog or
wire change uses a dated `WORLD_NS` reset during development, without migration.

Rules keep headless pure logic in `../../sim/`. Runtime imports here remain limited by
`docs/agents/lint-boundaries.md`; command/replicator imports are types. Shared railway prediction and server replay
still require ordered deterministic rule evaluation; the existing conservative math lint remains in force.

## Adding server state

Follow the existing server command, checkpoint and projection boundary rather than building another transport.
Keep validation separate from mutation, bind identity on the server, and choose whether an action waits or belongs
to the declared prediction subset. Thresholds and shared outcomes remain authoritative. A client with prediction
disabled must still converge through replication.

Test pure rule validation, conservation, ordered replay and serialize/load integrity. Test a changed sync contract
through the real host and two client mirrors, including late join/reconnect and failed saves. Views and feel use
the existing look/bot harness. Update the owning game-design chapter for player-visible changes.

## Modules

| Module | Commands | Checkpoint state | Projection |
| --- | --- | --- | --- |
| `roster.ts` | Durable `who.set` | `roster`: stable ordinals, names and colours, cap 256 | Global `player` rows |
| `tune.ts` | `tune.set`, durable `tune.commit` | `railTune`: 30 rail keys and revision | Global `tuneValue`, `tuneRev` rows |
| `seats.ts` | Transient `seat.sit`, `seat.stand` | None | Global `seat` rows keyed by seat id, with occupant pid |

The railway's rule ticks and action set live in `../railway-server.ts`; its state is also registered Server kind.
`../README.md` owns the clock and checkpoint contract. The Boogler remains a lead-tab Host field.

Seat commands bind the socket's pid, validate opaque ids, choose the first free requested chair, and rate-limit
accepted sits to one per 400 ms of host time. `taken` and `rate` are nonfatal receipt reasons; the command adapter
preserves them without reopening its session. Clients predict sitting and standing immediately; only `taken` steps a
predicted rider off, while `rate` holds the pose until the once-a-second reconcile retries, including alternates.
Actual departure after the reconnect grace releases the pid, and pause clears every chair. Occupancy is transient:
a restart starts empty, and seated clients reclaim. Remote riders require both the Server row and Owner
`placeSeatPose` to name the chair. v41 removed the lead's seat grants and seat-request presence; no seat is saved.
