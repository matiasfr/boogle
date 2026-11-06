# Plan: replication with prediction replaces lockstep

> **Status: plan, 6 November 2026, not started.** Owner decision of 6 November: replication with prediction replaces
> lockstep, aiming for "the most responsive game feel" in casual co-op, where exploits don't matter. Code read at
> `2e6cdd63`. Nothing here is built or measured yet. Numbers marked *estimate* are worked out from today's state sizes;
> the proof slice (section 5) measures them. Related calls: server physics only for shared objects
> ([shared-physics](../research/shared-physics.md)), one fixed clock, entity storage still paused
> ([ecs-evaluation](../research/ecs-evaluation.md)), and no compatibility code (bump `WORLD_NS`).

## Result

- **The server is the only simulator of shared rules.** Each fixed step it applies the actions players sent, and it runs
  the timed rules every N steps. Then it sends each client the **components that changed** in the area around that
  client. Clients keep a mirror of what they were sent. They never run shared ticks, compare hashes or recover from
  desyncs.
- **Your own actions show on the next frame.** The client runs the *same* rule function the server uses (today's
  `railApply`) on a scratch copy of its mirror. Each action carries a sequence number. Each server packet says "applied
  up to seq N", so the client drops confirmed actions, replays the rest on the new mirror, and **eases** any difference
  (no snaps). Corrections happen only on real conflicts, like two players taking the last log.
- **Three sync kinds: Local, Owner, Server.** Server replaces both Host and Lockstep. Shared schedules stay pure
  functions of a replicated start tick.
- **Cross-browser bit-exact maths goes when the last lockstep state goes.** That includes the hash checks, desync
  recovery, `DELAY`/`LAG` stamping and the trig ban in client code. Rules stay *pure*: a function of state, action, tick
  and seed. That keeps the journal replay, tests and schedules working.
- **The order of work:** the clock and the replication core first. Then the proof, Place's trees, rocks and log piles in
  the railway room. Then the rest of the railway, then classic gifts/stacks/piles/sites, then the deletions. Each
  slice ends playable on main.
- **Proof bars:** the actor sees the result next frame. Others see it within *actor one-way + observer one-way + 50 ms*.
  Under 100 kbit/s per client at 5× churn, excluding presence. No visible snap.

```
 you press chop                                    server (60 Hz step; rules every 6 = 10 Hz)
   |  predict: railApply on a copy -> next frame       |
   |---- a:{seq 41, op rail.chop, id 17} ------------->| apply at next step, journal it
   |                                                   | diff components -> per-client packet (20 Hz)
   |<--- s:{ack 41, tree17:{left 9, work 6}, you:{carry 3}} ---> other clients apply on arrival
   |  drop seq<=41, replay seq>41, ease any difference
```

| Who sees your chop | Lockstep today | Replication, others | Prediction, you |
|---|---|---|---|
| Delay | one-way + ~400 ms (`DELAY` 3 ticks + `LAG` 1.5 ticks at 100 ms) | RTT + up to 50 ms (send interval) | next frame |
| At 100 ms RTT | ~450 ms | ~125–150 ms | ~16 ms |

## 1. Architecture

### One fixed clock (prerequisite, from the 6 November Process call)

The server steps at **60 Hz**. Server physics only steps shared objects. Each step runs these phases:

1. **Actions:** apply what arrived, in arrival order.
2. **Physics:** shared objects only.
3. **Rules:** every **6** steps, so rule ticks stay **10 Hz / 100 ms**. Every tick-denominated tuning (`wakeTicks`,
   `departureTicks`, regrowth, laying speed) keeps its meaning. Production-core's pure rule functions port unchanged.

Clients run the same 60 Hz fixed step for their own body (Owner) and estimate the server tick from packet stamps.
That estimate is only needed to predict tick-gated rules (wake delays) and to evaluate schedules. Unity separates
`SimulationTickRate` from `NetworkTickRate` the same way [U1], and replicon replicates on server-tick change at 64 Hz
by default [B1].

### Change tracking and delta encoding

- **A component schema, language-neutral and storage-neutral.** For example,
  `defineReplicated('tree', { left: 'u8', work: 'u8', fallYaw: 'q16', fell: 'bool' })`. One schema drives the codec,
  the save rows and the client mirror. It works the same whether storage ends up bitECS or in-house tables (the
  ECS decision stays paused; this layer doesn't wait for it).
- **First version, diff by projection:** after each server step that changed anything, a per-state *projection* maps
  rules state to `(kind, id) → fields`, for example tree *k* from `Railway.sources[k]`, `work[k]` and `falls`. The
  server compares each component with the last one it recorded and stamps a **change tick** on the ones that differ.
  This leaves the rules and production-core slice 4 untouched. It is Unreal's polling mode [E1]. At ~520 railway
  entities (388 trees, 3 rocks, ≤128 piles, accounts, stations) it costs microseconds. **Later, push:** once storage is
  chosen, `touched()` per component marks changes directly (Iris dirty tracking [E1], Unity change versions,
  ecs-evaluation's build E).
- **What goes on the wire:** only changed fields of changed components, plus despawn tombstones. One JSON packet per
  client per send, `{ t:'s', tk, ack, rej?, ids?, c:[[kind,id,{field:value}]], x:[[kind,id]] }`. The codec boundary is
  schema-driven, so the planned binary `boogle.2` codec ([net-roadmap](net-roadmap.md) phase 6) swaps in without
  touching features. Switch when measured traffic passes half the bar. That codec should quantize, and delta-encode
  against a baseline, as Gaffer measured [G1].

### Send rate

**20 Hz** (every 3 steps), the same as presence's `SEND_MS`. Discrete state is **applied on arrival**, not put through
an interpolation buffer. A felled tree doesn't need 100 ms of `INTERP_MS`. Only continuous Server values (shared
physics poses) are interpolated, like Unity's interpolated ghosts [U2] and Source's interpolation delay [V1]. A client
with nothing changed and no ack outstanding gets no packet. Presence stays separate at first.

### Reliability and ordering over our WebSocket

The socket is TCP: reliable and ordered. So the server keeps **"sent up to change tick T" per client per cell** and
sends everything changed since then. That needs no acked baselines, because nothing is lost. Gaffer's and Source's
acked baselines exist because UDP drops packets [G1][V1]. A slow socket is handled by skipping sends while
`bufferedAmount` is over a threshold. The next send carries the latest values, so backlog **coalesces** instead of
queueing, which edit streams can't do. If net-roadmap phase 7 moves to datagrams, keep T per *acked* packet instead,
which is Gaffer's scheme.

### Relevancy for 3,000 entities and many islands

Every replicated entity has a **cell** on a 2D grid (64 m to start), plus one **global** cell for roster, stations,
line progress and tune. A client subscribes to the cells within a radius of its last accepted presence position, plus
global. Per-cell change lists are built **once per step and shared by all clients in the cell**. That is the
Replication Graph's lesson: per-actor, per-client relevancy checks became Fortnite's server bottleneck
([shared-state-at-scale](../research/shared-state-at-scale.md); Iris filtering [E1]; Unity's per-connection relevancy
and importance [U2]). When a client enters a cell, T is reset to 0, so it gets the cell whole. On leaving, the client
drops that cell's mirror. One island fits in a handful of cells, so the proof slice subscribes everyone to everything.
It still goes through `cellOf`, so multi-island needs no protocol change.

### Late join

1. On join, the server sends the global cell and the subscribed cells as one ordinary `s` packet with T = 0, chunked
   under the room's 16 KB message cap.
2. Deltas follow on the same ordered socket.

There's no `pend` queue and no hash handshake. Today's fresh railway state serializes to **6.5 KB of JSON**, measured
for this plan from `installPlayableRailwayRules`. At its caps it stays under 60 KB.

### Persistence

- **Proof slice:** keep railway's recovery envelope (`sync.ts`, `RecoveryEnvelope`, checkpoint + tail), with
  accepted **actions** as the tail. Before a step's packet goes out, its accepted actions are appended to the journal.
  So every confirmed action survives a crash, which keeps production-core approval 3 at the cost of one append per
  step. The checkpoint is still rewritten every 2 s when changed.
- **From slice R4, or when multi-island arrives:** SQLite (net-roadmap phase 2), with **one row per cell plus a global
  row**. Every 2 s, write the cells whose change tick moved, in one transaction, plus an append-only action journal
  truncated at each checkpoint. Recovery loads the rows and replays the journal through the pure rules.
- **The 60 KB budget becomes a per-row budget:** a cell at its caps ≤ 16 KB, global ≤ 16 KB. `test/world-size.test.ts`
  changes to fill one cell and the global row. The whole-world cap goes; it only existed for the pagehide upload,
  which the server host removed.

## 2. Prediction and reconciliation

**The mechanism** (Gambetta's server reconciliation [G2]; lightyear's state rollback "only on mismatch" [B2]; Unity's
owner-predicted ghosts [U2]):

- The client keeps a **confirmed mirror**: the server's components rebuilt into today's state shapes (`Railway`), so
  views keep reading what they read now.
- It also keeps a **pending list**: actions with seq > ack.
- **Predicted state** = a clone of the confirmed mirror with the pending actions replayed through the rule's own apply
  function, at the estimated tick. It is rebuilt only when a packet arrives or an action is added; the `Railway` clone
  is ~6 KB. Views read predicted state.
- **IDs:** today's `(epoch, request)` pair from `r:session` / `r:edit` becomes the general action id. That is the
  epoch per session plus a rising seq. The server already keeps per-player outcomes (`railOutcome`), so a resent action
  never applies twice. Each packet carries `ack` (highest seq applied for this client) and `rej` (seq + reason) for
  refused ones.
- **Predicted spawns** (a dropped pile) get a temporary id `p:<epoch>:<seq>:<k>`. The packet's `ids` maps it to the
  server id, so the view re-keys its object without rebuilding it. Prior art: Unity's predicted spawning, lightyear's
  prespawn matching [B2], replicon's `Signature` [B1].
- **Pending-action cap:** `RAILWAY_WINDOW` (8) becomes general. An action that would exceed it waits; it is not
  predicted.

**Gentle correction.** After a rebuild, views compare the newly predicted values with what they are showing. Then:

| Difference | What the player sees (≤ 300 ms, eased) |
|---|---|
| None (expected for nearly every action) | nothing |
| Fewer logs than predicted (someone took part of the pile) | the extra logs on your back lift off and arc to where they really went: the other player's back or the pile |
| Your action refused (the last log was taken) | your stack eases back down. The log you didn't get flies to whoever did (**Show, don't tell**; no text) |
| Predicted pile drop refused | the pile shrinks while the logs return to your back |
| Predicted tree fall reversed (rare) | the fall eases back up, with a small shake |
| Moving value off by more than 2 m, or off-screen | snap, unseen |

Corrections are presentation, so they are Local. They are logged as `{seq, kind, size}` for the measurements.
Everything else follows Source's error smoothing [V1] and lightyear's decaying visual correction [B2].

**Predicted:** chop (tree work, yield into your carry, fall), mine (rock strokes, stone), take from a pile or rack,
drop to a pile, deposit into a station (its stock counter), pick up and put down a gift, place a track piece, pull a
lever (the lever moves), and the beam grip animation.

**Never predicted** (applied when confirmed):
- other players' actions;
- consequences behind thresholds: a bill completing, the machine starting, unlocks, the axe or upgrades, era changes;
- rewards and personal cosmetics;
- server randomness (gift contents);
- timed rule outcomes: regrowth, supply pulses, laying progress. These are computed from replicated start ticks;
- shared-physics objects (Server kind, smoothed) and creatures or NPCs;
- anything that changes another player's inventory.

Prediction checks only what the client can see. `ctx.env` facts are host-only, so a check that needs them is left to
the server, and its refusal comes back as a `rej` correction.

## 3. Sync kinds and DESIGN.md

`sync.ts`'s Lockstep API (`submitEdit`, `onApplied`, `registerOp`/`registerState`/`onTick`) gives way to Server-kind
equivalents:
- `defineReplicated(kind, schema, projection)` on the server;
- `act(op, fields)` on the client, which returns the seq;
- `onConfirmed(op, fn)`, and `onState(kind, fn)` for views.

Effects still fire from confirmed results. A predicted effect is a Local anticipation that a correction can undo,
like Unity's client anticipation [U3]. `addHostField` goes when The Boogler moves to the server (net-roadmap phase 3).

**Draft text for DESIGN.md** (not applied; the owner commits it with the first slice):

> ### Pick how each feature shares state
> Every piece of state is one of three kinds. Use the cheapest that works:
>
> | Kind | Use when | Who computes it | Math | Today |
> |---|---|---|---|---|
> | **Local** | Nobody else needs it, or it decorates | Each tab | Anything | Particles, sounds, corrections' easing |
> | **Owner** | One player drives it, or one player's physics moves it | The owner's tab; others smooth its 20 Hz presence. Hands over by epoch, and to Server when a second player acts on it | Anything | Your avatar, the ball you kicked |
> | **Server** | Shared: anything two players can both see change, persists, or two players act on | The server, on the one fixed clock; it sends each client what changed near them. Your own actions are predicted by running the same rule locally, then confirmed | Rules are pure functions (below); shared physics is server Rapier | Trees, piles, stations, gifts, The Boogler |
>
> One-off events (a honk, a ping) are messages, not state. **Physics is server-run only for objects two or more players act on**; your body is always Owner. **Shared schedules** (timetables, regrowth) are pure functions of a replicated start tick, so they cost nothing to send. **The scene graph is a view**: it reads predicted state and never feeds back.
>
> ### Rules are pure functions
> Server rules are a function of (state, action, tick, seed): no wall clock, `Math.random()` or per-peer counters, so a crash can replay the journal and a client can predict with the same code. Conserved quantities are integers. Bit-identical results across browsers are no longer required: when a prediction differs, the server wins and the client eases.
>
> ### Send actions up, changes down
> Clients send small actions with a sequence number. The server applies them, then replicates the components that changed, with the highest sequence it applied. The client shows its action at once, drops what the server confirmed, replays the rest and eases any difference.
>
> ### Clear authority
> Your movement: you. A solo-held object: its owner (epoch). Everything shared, including objects several players act on: the server. Persistence: the server, per cell, with an action journal so an accepted action survives a crash.

"Determinism from day one" and "Sync edits, not state" are replaced by the two sections above. The four-kind table
loses Host and Lockstep.

## 4. Migration

| Slice | What moves | What is deleted then | Playable on main? |
|---|---|---|---|
| **R0** Clock + core | One 60 Hz server step, rules every 6. `defineReplicated`, projection diff, cells, `s`/`a` messages, client mirror and predictor, behind a per-state switch. Test harness on a toy state | nothing | unchanged |
| **R1** Proof | The railway room's `railway` state becomes Server kind as a whole. **Prediction for chop, mine, take, drop** (trees, rocks, log piles, your carry). Stations, machine, beam and line are mirrored unpredicted. Section 5 | railway's hash participation, `r:result`/`r:state` replaced by `ack`/`rej` | yes, Place only |
| **R2** Railway | Prediction for deposit, rack take, beam grip, lever, forge/depot transfers (slice 4's). Schedules read the replicated start ticks | railway's lockstep tick on clients | yes |
| **R3** Classic + others | `gifts`, `stacks`, `piles`, `sites`, `sources`, `bank`, `roster`, `tune`, `opening`, and the mushroom message toy unchanged | each state's hash as it moves | yes |
| **R4** Retire lockstep | SQLite per-cell saves + journal | `w:edits`/`w:hash`/`w:need`/`w:snap`, `DELAY`/`LAG`/`LEAD`, `onDesync`/`onSnapFail`, the held-edit queue, the `HOST_TYPES` pinning, the cross-browser trig/`**` ban for `LOCKSTEP_FILES` (a smaller lint remains for rules: no `Math.random`/`Date`), the hash parts of `world-replay.test.ts` (journal replay = live state replaces them), `addHostField` once The Boogler is a Server entity | yes |

- **A state switches as a whole, never per field.** In a room, each state key is either lockstep or Server. The server
  runs both, so a Server rule can read lockstep state, such as `railway` reading `roster` and `tune`. The other way
  round, a lockstep state learns a Server outcome only through a `hostOnly` stamped edit. Two authorities never
  hold the same material. Every slice bumps `WORLD_NS`, with no compatibility code.
- **Production-core slice 4** keeps today's lockstep plumbing and pure rule functions. That is exactly what R1 needs:
  `railApply` and `railTick` become the server rule *and* the client predictor unchanged. R0 touches `sync.ts`,
  `server/src/host` and new `src/world/replicate*`, not railway rules, so it runs alongside slice 4. R1 starts after
  slice 4 merges and rebases onto it. Slice 4's conservation, race, departure and restore checks become R1's regression
  suite. Their hash assertions turn into state-equality assertions.
- **Tests:** conservation invariants and rule unit tests stay. `world-replay` becomes "replaying the journal equals the
  live state", plus a prediction test: a random action stream from 2–6 simulated clients, each client's predicted state
  after the final ack equal to the server's.

## 5. The first proof slice (R1) in detail

**Scope:** Place's felled trees (`sources`, `work`, `falls`, hardwoods), rocks (`line` strokes and stone) and log piles
(`piles`), plus each player's carry account. The actions are `rail.chop`, `rail.mine`, `rail.take` and `rail.drop`,
predicted. The rest of `railway` is mirrored without prediction.

**Steps:**
1. Projections for tree, rock, pile, account, station, line and global.
2. `RailwayApi` reads the mirror and predicted state instead of the lockstep state.
3. The adapter's `submit` becomes `act`. The reservations logic remains as the pending list.
4. The views in `entities/railway/sources.ts` play chop effects from the predicted apply. Confirmed results only feed
   the correction comparison.
5. Easing for corrections.
6. `WORLD_NS` v13.

**How it's measured:** `npm run load` (`dev/peer-test/ws-run.ts`) with headless players chopping, taking and dropping
around one grove. That gives 2, 4 and 6 players at 0, 100 and 200 ms added latency, each way split evenly, on a
scripted 5-minute run. A 5× churn variant plays every action five times as often. Late join is measured with a 7th
client.

| Measure | How | Acceptance bar |
|---|---|---|
| Chop-to-visible, actor | input timestamp → frame where predicted tree state renders | **next frame** (≤ 17 ms + frame) at every latency |
| Chop-to-visible, others | server receipt stamp → observer frame, plus both one-way delays | ≤ actor one-way + observer one-way + **50 ms** + one frame (the brief's "RTT/2 + one tick", measured from server receipt) |
| Correction frequency | `rej` + mismatches per player-minute | **0** at 2 players apart; at 6 players crowding one pile, < 1 per player-minute at 200 ms |
| Correction size | logs moved by a correction; tree-fall reversals | ≤ the contested pile's count; zero tree reversals without a contested last stroke |
| Downlink per client | bytes of `s` packets / time, excluding presence (reported separately) | < **100 kbit/s** at 6 players, 5× churn, 200 ms (*estimate* ≈ 5–20 kbit/s normal, < 60 at 5×) |
| Late-join | bytes and ms from socket open to full mirror | < 64 KB and < 1 RTT + 100 ms (*estimate* ~7 KB fresh) |
| Save | bytes per checkpoint and per journal append; appends per minute | checkpoint < 60 KB at caps; journal append adds < 2 ms per step on the server |
| Server CPU | ms per step at 6 players, 5× churn | < 1 ms per step on the M1; on Fly `shared-cpu-1x`, measure (shared-physics flags its throttle) |
| Conservation | logs in trees + carries + piles + stations | equal before and after every run, plus crash-and-restore mid-run |

The owner then plays the proof against lockstep for a few minutes, with a friend at 100–200 ms, and judges whether
chopping and taking feel instant and corrections go unnoticed.

## 6. Risks, open questions, unverified

**Risks**
- **Two transports during migration.** Lockstep and replication share rooms until R4. A per-state switch keeps them
  apart, but cross-kind actions (a deposit while stations are lockstep) need `hostOnly` edits. R1 avoids that by
  moving all of `railway` at once.
- **Prediction needs a tick estimate.** Tick-gated rules (`wakeTicks`) predicted with a bad clock estimate mispredict.
  Rules should gate on server-replicated phase where they can.
- **Head-of-line blocking** on TCP shows up as bursts, not loss. Coalescing hides it for discrete state. Phase 7
  datagrams stay the answer for continuous state.
- **Per-cell saves and conservation:** a carry crossing cells must be one transaction. The journal makes recovery
  exact. Prove it in R4.
- **Server CPU on Fly shared-cpu** is still unmeasured (shared-physics, result 5).
- **Easing hides bugs.** Corrections are logged and counted in tests, so a systematic misprediction shows up as a
  number, not a feel.

**Questions for the owner** (recommended answer first)
1. **Keep rules at every 6 physics steps (10 Hz) for now?** *Yes.* Every tuning stays valid. Others' delay is set by the
   20 Hz send, not the rule rate. Revisit if the proof shows a rule-paced delay.
2. **Should R1 move the whole railway state at once (predicting only trees, rocks and piles), rather than carving
   trees and piles out into their own state?** *Whole state.* That gives no cross-kind transfers and no in-flight
   logs, and others see stations faster too.
3. **Should replication start on today's state objects (projections), without waiting for the entity-storage
   research?** *Yes.* The component schema is the shared contract. Storage swaps under it later.
4. **Should a correction show physically where the item went (it flies to whoever got it), with no message?** *Yes.*
   That is Show, don't tell, and slapstick suits it.
5. **Should every confirmed action still survive a server crash (journal before each packet)?** *Yes.* It costs one
   small append per step, and it keeps production-core approval 3.

**Unverified:** every timing, byte and CPU figure above except the 6.5 KB fresh railway size (estimates until R1
measures them); feel; Fly CPU; Safari and mobile; whether views can ease every correction without bespoke code per
entity. Not tested on a device.

## Sources

- [U1] Unity Netcode for Entities, ghost snapshots: per-chunk importance queue, `NetworkTickRate` vs
  `SimulationTickRate`, predicted/interpolated/owner-predicted modes.
  https://docs.unity3d.com/Packages/com.unity.netcode@1.5/manual/ghost-snapshots.html
- [U2] Unity Netcode for Entities, prediction: client ahead by a slack, rollback to the snapshot and resimulate, only
  updated ghosts roll back. https://docs.unity3d.com/Packages/com.unity.netcode@1.5/manual/intro-to-prediction.html ;
  physics: https://docs.unity3d.com/Packages/com.unity.netcode@1.5/manual/physics.html
- [U3] Unity NGO client anticipation.
  https://docs.unity3d.com/Packages/com.unity.netcode.gameobjects@2.7/manual/advanced-topics/client-anticipation.html
- [E1] Unreal Iris: dirty-state scheduling (polling in legacy mode), quantized state, filtering per connection,
  prioritization. https://dev.epicgames.com/documentation/en-us/unreal-engine/introduction-to-iris-in-unreal-engine ;
  Replication Graph: https://dev.epicgames.com/documentation/en-us/unreal-engine/replication-graph-in-unreal-engine
- [B1] bevy_replicon: tick-driven replication (64 Hz default), resend on missing ack, visibility filters, priorities,
  `Signature` prespawn matching, prediction left to libraries. https://docs.rs/bevy_replicon/latest/bevy_replicon/
- [B2] lightyear: state rollback on mismatch, visual correction that "adds and decays the difference", prespawned
  entities. https://cbournhonesque.github.io/lightyear/book/
- [V1] Valve, Source Multiplayer Networking: tick, snapshot rate, delta against acknowledged snapshot, 100 ms
  interpolation, prediction error smoothing. https://developer.valvesoftware.com/wiki/Source_Multiplayer_Networking
  (403 to our fetcher; cited from the page as known, not re-read today)
- [G1] Gaffer On Games, Snapshot Compression: quantization, smallest-three, delta against an acked baseline (the
  "order of magnitude" win), ~15 kbit/s at rest. https://gafferongames.com/post/snapshot_compression/ ; State
  Synchronization: https://gafferongames.com/post/state_synchronization/
- [G2] Gabriel Gambetta, Client-Side Prediction and Server Reconciliation (sequence numbers, replay unacked inputs).
  https://www.gabrielgambetta.com/client-side-prediction-server-reconciliation.html
