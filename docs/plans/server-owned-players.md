# Plan: seats and The Boogler decided on the server; the lead tab deleted

> **Status:** steps 1 and 2 built, 13 November 2026: [shadow seats, v40](server-owned-players-step1-report.md), [server authority, v41](server-owned-players-step2-report.md). Step 2 is committed for review, not shipped; Checkpoint S remains open because the trusted broker predates the current network/world-input harness and cannot close the first tab mid-look. [Step 3 land](server-owned-players-step3-report.md) is built. [Step 4 extraction](server-owned-players-step4-report.md) preserves main exactly; its client 10 Hz/continuous-leg conversion remains incomplete. [Step 5 shadow](server-owned-players-step5-report.md) is built: deterministic 10 Hz decisions and continuous travel run only on the server, with measured divergence and no authority flip. Steps 6 through 8 remain planned. Original inventory read at `f33cc6949`. It follows [server-owned-state](server-owned-state.md) (steps 1 to 5 and 9 landed; its "Later" items (i) and (ii)). Owner calls behind it: [Engine foundations first](../agents/owner-calls.md) and the 13 November answer "seats and The Boogler off the lead tab come right after" ([decision](../decisions-process.md#d-2026-11-13-server-owned-state-answered)). That plan's checkpoints A and B are still open (harness limits); this plan does not close them.

## Goal

Seat occupancy and The Boogler's decisions move from the lead tab to the server, and the lead tab (`addHostField`, the server's lead election) is deleted, so no client has to compute anything for the others. Serves DESIGN.md **Clear authority** and **Server hosts every room**, and principle 8's "joining, leaving, reconnecting must remain reliable". It bends nothing, but DESIGN.md's sync table and authority table still name the Host kind and the lead tab: the owner commits that text (step 8 drafts it).

**Research:** [engine-long-term](../research/engine-long-term.md) (target rows "Other server-owned gameplay: seat occupancy, NPC decisions; explicit transient/persistent flags" and "server owns scarce/shared outcomes and seats"; this plan does that authority move before stage G's storage move, as server-owned-state did for the classic states); [engine-portability](../research/engine-portability.md) (the seat and Host-field census); [coop-glitches](../research/coop-glitches.md) (seated carry: the ordering fix at `seat.ts` order 21 is kept untouched); [net-roadmap](net-roadmap.md) phase 3 ("Host kind goes away: everything it did becomes Server kind"). Departs from engine-long-term only in order (authority first, on today's closures).

## 1. Inventory: what the lead owns today

### Seats

| Piece | Where | Kind today |
| --- | --- | --- |
| `placeSeatGrants`: `{ [seatId]: { peer, ticket } }` | `addHostField` at `src/entities/railway/seat.ts:191`; computed by `assign()` (181-188) calling `assignSeats` (`seat-claims.ts:13-33`) | Host: only the lead publishes |
| `placeSeatRequest`: `{ id, ticket }` | `addPresenceField`, `seat.ts:189`; read by the lead at 195-201 | Owner, input to the lead |
| `placeSeatPose`: seat id or null | `seat.ts:190`; read at 202-208 to draw a remote rider in the chair | Owner (stays) |
| Follower copy `grants`, `readGrants` | `seat.ts:54`, 191-194; `seat-claims.ts:36-53` | Local copy of the lead's answer |
| `seatVerdict`, `CLAIM_GRACE_MS` 2 s | `seat-claims.ts:9`, 61-80; used at `seat.ts:236-256` | Local: hold, move to the granted chair, or step off |
| Stand-up on lead change | `seat.ts:224-228` (`standUp('lead change')`) | The known symptom |
| Stand-up on any connection change | `seat.ts:215-223` (`reset()` whenever state or prev is not `live`) | Also stands a rider up on a blip |

Readers: `seatHeld` (`view.ts:166`, the track layer's hands give up a taken chair), `seated()` (`view.ts:87,115`, `render/camera-pull-out.ts:68`), `seatState()` (diagnostics; `dev/look/bots/railway.ts:1146-1172` and four `dev/look/evals/*` read `grants` or `sitting`), `withSeatTargets` (`view.ts:610`). Seats are registered by views with open-ended string ids: `machine-deck-0/1` (`track-machine.ts:119`), `railway:train<slot>-1-seat<0..3>` (`train-view.ts:190`), prefab placement ids such as the workshop chair (`src/prefab/instantiate.ts:183-197`). `available()` is a view fact (the car is drawn). **The server knows no seat, group or seat position today.**

Breaks on lead change: every seated rider on every tab stands up, including when the lead only moved because the lead tab was hidden for 5 s (`leadHiddenMs`, `hosted-room.ts:117,242-253`), so one player switching windows unseats the others. Until the new lead publishes, sitters wait on the 2 s grace.

### The Boogler

| Piece | Where | Kind today |
| --- | --- | --- |
| `g`: `{ p: [x, z], r, w, m }` (pose, walking, mode) | `addHostField('g', publish, hear)` at `src/boogler/boogler.ts:317`; `publish` 301-303, `hear` 305-315 | Host |
| The brain: `think(dt)`, `pickTarget`, `tryStep`, `headFor`, `pathClear`, `blocked`, `fleeFrom`, `visitors`, `findStart`, `sim`, `trip`, `rng` | `boogler.ts:80-298`; run every frame by `updateBoogler` when `solo || isLead() || stale` (654-669) | Lead only (or every tab when the lead is silent 3 s, `STALE_MS`) |
| `bg`: `[act, wary, ev, evN]` per player | `addPresenceField('bg')` at `src/boogler/play.ts:305`; the lead's `visitors()` reads `act`, `wary` (`boogler.ts:202-207`); every tab plays `ev` when `evN` changes (`play.ts:83-91`) | Owner; two fields are lead inputs, two are a one-off event carried as a counter |
| Talk, presents, memory, ride timer, launch | `play.ts`, `talk.ts`, `lines.ts`, `memory.ts`, `dialogue.ts` | Local and personal (localStorage `boogle.boogler`); nothing is accepted by anyone |
| Terrain he walks on | `groundHeight` (`src/island/heights.ts`), `blockedAt` (`src/entities/props/state.ts:31`), `island.keepOut`, `MAINLAND` | Client-only: `src/island/index.ts` uses `import.meta.glob`, so the server cannot build it |

Readers of his pose (`boogler.disp`, `boogler.center`, `boogler.body`): `hud.ts`, `fx.ts`, `play.ts` (distance, riding, launch direction), the dialogue camera, `dev/scenarios/shared-kinds.ts`.

Breaks on lead change: the new lead takes over "from where he is on screen" with `walking = false`, `wait = 0.6` and a fresh `trip` and RNG (`boogler.ts:661-668`), so he stops mid-walk and forgets where he was going; followers clear their snapshots when the source peer changes (309-312) and snap if he is over 6 m off (680). A hidden lead tab stops running frames, so he freezes for everyone until the lead moves (5 s) or each follower's 3 s stale timer starts walking **its own** copy, which then disagrees between tabs and jumps back when a lead publishes.

### The lead itself

Server: `lead`, `pickLead`, `checkLead`, `leadHiddenMs`, the `lead` in `welcome`, the `{ t: 'lead' }` message and `status().lead` (`server/src/host/hosted-room.ts:38,117,162,235-253,274,322,325,358,418-419,436,447,463`). Client: `ws-room.ts:57,65,100-103,120,153-154,310,313-315` (`isLead`, `onLeadChange`); `net.ts:130-140` (`isLead`, `addHostField`), 408-411 (presence resend on lead change), 421 (the lead sends presence even before entering); `presence-fields.ts:33-44` (`hostField`). Diagnostics only: `features/telemetry.ts:81` (`role`), `debug/netdebug.ts:25`, `debug/dev/room.ts:15-16`. Tools and tests: `dev/lint/policy.ts:536`, `dev/scan/read.ts:47,408`, `dev/scan/task-routes.ts:400`, `dev/registry/scan.ts:9`, `dev/scenarios/shared-kinds.ts:18`, `dev/scenarios/lib/world.ts:13-16`, `dev/peer-test/ws-page.ts:97,132,185`, `dev/peer-test/ws-run.ts:71-85,169-172`, `server/test/host.test.ts:168-186`, `test/presence-fields.test.ts`, `test/atlas.test.ts:21,306,336`, `test/registry.test.ts:19,87`, `test/seat-claims.test.ts`.

**After this plan nothing is lead-owned.** The two Host fields are the only users of `addHostField`; tuning already ignores the lead (`src/net/README.md`). The lead, its wire message and every reader above can be deleted (step 8). One exception to decide: prototype pages (owner question 3).

## 2. Target design

### (a) Seats: a transient Server component, pose stays Owner

- **State (server, not saved):** one occupant per seat and one seat per player, keyed by **pid** (so a reconnect keeps the chair). Replicated as `seat { pid: 'str' }`, entity id = the seat id string, `GLOBAL_CELL`; at most one row per player. Not passed to `registerState`: a restart or a paused room starts with empty chairs.
- **Ops** on the existing boundary (`ops.define`, `r:edit`, receipts `ack`/`rej`/`ok`): `seat.sit { id, alt? }` grants the first free chair of `[id, ...alt]` (`alt`: up to 7 other reachable chairs of the same group, nearest first; this is today's "the wanted chair, else another free one of the same group", with the group named by the client because the server has no catalogue); a player already seated moves. `seat.stand {}` frees the player's chair. The server frees a chair when the player's session departs after the reconnect grace (`world.depart`), and clears all on `pause()`.
- **Prediction:** sit on the press, as today (`occupy` at once). The receipt answers it: accepted and the row names my chair (hold) or another chair (slide over, today's `move`); refused (every chair taken) steps you off onto the exit (today's `release`, `onRefused`). Standing is immediate and is never refused.
- **Reconcile (replaces the 2 s grace and both stand-ups):** once a second while live, with a whole mirror and no sit pending: seated here but no row, send `seat.sit` for this chair again (covers a server restart, a reconnect and a sit sent while the request window was full); a row but not seated here, send `seat.stand`; the row names another chair, slide to it or stand.
- **Owner:** the body (position, `riding`) and `placeSeatPose`. **13 November follow-up correction:** the server row keeps a remote rider drawn seated even when presence goes quiet; Owner freshness never stands up a confirmed rider. A fresh Owner seated pose can bridge a rate-refused re-sit while the row is absent, only if no server occupant, competing fresh pose or local predicted sitter holds that chair. Otherwise the server row wins. Standing clears the Owner field immediately; friends stop the confirmed seated pose when the row clears.
- **Solo, offline, prototype pages:** no session, so sitting stays local and unarbitrated (as offline today).

**Real choice, seat validation.**

| Option | Cost | Risk | A player notices |
| --- | --- | --- | --- |
| **S1 (recommended): opaque seat ids.** The server checks the id's shape, that it is free, one seat per pid and a rate limit; it cannot check reach | About 60 lines of rule, one op pair | A hostile client can hold one chair it is not standing at (others cannot sit there; its avatar is drawn there if the client knows that chair). One chair per hostile player, freed when they leave | Nothing |
| S2: a server seat catalogue (ids, groups and positions derived from train rows, the machine and prefab placements) so reach is checked | A pure catalogue the server and views share, train positions evaluated on the server, prefab placements made server-readable; several sittings | Duplicates what the prefab and content-data plan (option 2) will own; must match the views or honest sits are refused | Nothing, unless it disagrees with a view |

S2 belongs with prefab data. Exploits do not matter (owner, 6 November), and S1's harm is bounded.

### (b) The Boogler: a Server entity

**Real choice, where his movement comes from.**

| Option | Cost | Risk | A player notices |
| --- | --- | --- | --- |
| A: the server simulates his pose every rule tick and replicates it (10 Hz), clients interpolate as followers do today | Smallest code move (`think` nearly verbatim) | A row that changes every tick forces a packet to every client 10 times a second while he walks, and each packet republishes the railway world (`railway-replicate.ts` `onPacket` clones) and runs every adapter's settle. He is shown about 100 ms later than today | Slightly laggier Boogler under a rider; possible frame cost on phones |
| **B (recommended): the server decides legs, clients compute the pose.** The server replicates one row per decision: where the walk starts, where it ends, the tick it started, speed, mode, who he looks at. Pose is a pure function of the leg and the room tick, on server and client | A closed-form walk function plus the brain restructured from "every frame" to "on events"; about 250 lines new, with test vectors | The function must reproduce today's motion (turn rate 3.2 rad/s, speed scaled by the cosine of the heading error); a mismatch is visible as a different walk | Nothing if the function matches. No packets while he walks; smooth at any frame rate; a late joiner sees him exactly where others do |
| C: the server walks a baked waypoint graph (no heights on the server) | Smallest server data | Changes his documented wandering (discrete spots, no free directions) | Yes: he paces between fixed points |

B is the house rule already ("shared schedules stay pure functions of a replicated start tick", 6 November; the railway's jobs and trains). His walk is a straight line to the target with a speed that depends only on how far he has turned, so the closed form is exact, not an approximation.

- **Where his behaviour ticks:** on the server at the 10 Hz rule tick (`sync.onTick`), only while the room simulates (he stands still in an empty, paused room). Each tick the brain evaluates his pose from the current leg, reads the players near him and writes a new leg only when something changes: arrival, a wait ending, a talker starting or stopping, a rider getting on or off, a wary player coming within 9 m (re-evaluated every 8 ticks while fleeing, today's 0.8 s).
- **Deterministic:** the brain uses seeded `mulberry32` (seeded from the world seed and the tick it wakes at) and a tick counter; no wall clock. It uses native trig, so it lives outside the guarded rule paths (see Risks): no client predicts or decides anything from it.
- **What clients do:** compute `booglerPose(leg, tickNow)` every frame with the presentation clock the trains use (`railwayRead().tickNow()`), ease from the shown pose when a new leg arrives (snap if over 6 m, today's rule), and turn him toward the `look` player's displayed position while he idles (Local, cosmetic). His kinematic body, the ball bouncing off him, standing on him, the launch, the hat, the HUD and the effects are unchanged and Local.
- **What he walks on:** a baked file the server loads once, pinned from the running game the way `src/world/home-land.json` is: the island's base heights (409 by 409, whole centimetres), the obstacle discs, the POI keep-out discs and the mainland box. The brain takes the land as injected functions, so the client's solo copy uses its own live terrain.
- **Solo and offline:** the tab runs the same brain module locally at 10 Hz against its own terrain and shows it through the same walk function; when the server's row arrives it eases over.
- **Saved:** his position and facing only (`registerState('boogler', ..., { server: true })`), so a deploy does not move him (owner question 2).

**Real choice, how talk, presents and rides reach the server.** There is no "tag" interaction in the code: "tag" is his name tag (HUD, Local). What exists is talk, a present, riding with its puff and launch, and wary.

| Piece | Today | Recommended | Why |
| --- | --- | --- | --- |
| Talking, riding, wary (continuous facts the brain reads) | `bg[0]`, `bg[1]` in presence | **Stay Owner presence** (`bg` becomes `[act, wary]`); the server brain reads them from the presence it already relays, next to the pose it already reads for the railway (`hosted-room.ts` `positions()`) | They have a current value and heal by themselves on a lost packet, a reconnect or a restart. As commands they would need a stop command that can be lost, leaving him frozen facing someone who left. He already only attends a talker within 5 m and a rider within 1.6 m of the pose others see |
| Present reaction, puff (one-off shared outcomes) | `bg[2]`, `bg[3]`: an event smuggled as a counter in presence; any value plays on every tab | **Server commands with receipts:** `boogler.gift { kind }` and `boogler.puff {}`; the server checks reach against his pose and a per-player rate, derives the reaction from the catalogue's `taste` (the client cannot claim "love" for a disliked present), and sends one replicated event to everyone else | One-off events are not presence state; this is the only part a hostile client can use to spam others |
| The talk itself, memory, the grudge, the ride timer, the launch | Local, personal | **Unchanged, Local** | Per-account progress is out of scope; only you see your talk |

The giver and the rider play their reaction on the press as today; the command only shares it. A refusal means friends do not see the hearts; nothing is taken back (the talk, the memory and the emptied hand are personal).

**His copy.** No line moves, changes or goes on the wire. `src/boogler/lines.ts`, `talk.ts` and `barks.ts` stay client-side and untouched; the server imports `src/sim/gift-catalog.ts` (already in the server image) for `taste` and `key` only and never sends text. Suspect lines: none found for this plan (searched `barks.ts`, the gift catalogue and `lines.ts` for seats, trains, hosts, freezing). The two present lines (seed, frisbee) may be unreachable since the gift sources were retired at v39; that was not verified here and nothing changes them.

## 3. Design summary for the implementer

- **Sync kinds:** `seat` rows: Server, transient. The Boogler's leg and saved pose: Server. `placeSeatPose`, `bg`, the body: Owner. Sit prediction, his display easing, idle look-at, reactions on the press: Local. Authority for both: the server. No lockstep entry, state hash on clients, `edits` generator or `env` fact is added.
- **New shared files** (all under `src/world` or `src/sim`, which `server/Dockerfile`, `dev/server-build.ts` and `deploy-server.yml` already copy whole; `test/server-image.test.ts` proves reach):
  - `src/sim/seats.ts`: `createSeats()`, `SEAT_ID = /^[A-Za-z0-9:/._-]{1,64}$/`, `pickSeat(s, pid, ids)`, `sit(s, pid, id)`, `stand(s, pid)`, `releasePid(s, pid)`, `clear(s)`, `seatOf(s, pid)`, `occupant(s, id)`, `invariants(s)` (the two maps are inverse; one seat per pid).
  - `src/world/rules/seats.ts`: `installSeats(ops, replication, now)` defining `seat.sit` and `seat.stand`, `SEAT_SIT_MS = 400` (host clock, per pid, spent only by an accepted sit, the roster's pattern), returning `{ seats, release(pid), clear(), rows() }`.
  - `src/world/seat-replicate.ts`: `SEAT = defineReplicated('seat', { pid: 'str' })`, `projectSeats(replication, api)`, `createSeatMirror(mirror)` with `occupant(id)`, `seatOf(pid)`, `onChange(fn)`, published at whole packet ends like the roster mirror.
  - `src/world/boogler-walk.ts`: `type BooglerLeg = { x0, z0, yaw0, x1, z1, start, speed, mode, look }` (centimetres, milliradians, rule tick, cm/s, `MODE`, pid or `''`), `booglerPose(leg, tick)` returning `{ x, z, yaw, walking }`, `booglerLegEnd(leg)`; constants `TURN`, `SPEED`, `FLEE_SPEED`, `RIDDEN_SPEED` move here from `boogler.ts`. Speed 0 is standing. The leg ends 0.3 m short of the picked target, as today.
  - `src/world/boogler-brain.ts`: `createBooglerBrain({ land, rng, start })` with `tick(t, visitors): BooglerLeg | null` (a new leg, or null for no change), `leg()`, `pose(t)`, `serialize()`, `load()`; `type BooglerLand = { height(x, z), blocked(x, z, pad), keepOut, mainland }`; `type BooglerVisitor = { pid, x, z, act, wary }`. It holds today's `pickTarget`, `tryStep`, `headFor`, `pathClear`, `blocked`, `fleeFrom`, `findStart` and every constant with the same values.
  - `src/world/rules/boogler.ts`: `installBoogler(sync, ops, replication, { land, visitors, now })`: the tick, `registerState('boogler')` (step 6), `boogler.gift` and `boogler.puff` (step 7).
  - `src/world/boogler-replicate.ts`: `BOOGLER_LEG = defineReplicated('booglerLeg', { x0: 'int', z0: 'int', yaw0: 'int', x1: 'int', z1: 'int', start: 'int', speed: 'u16', mode: 'u8', look: 'str' })`, one row id 0, `GLOBAL_CELL`; `createBooglerMirror(mirror)` with `leg()`, `onLeg(fn)`, `onReact(fn)` (reads `p.ev` entries whose `op` is `boogler.react`; the railway adapter skips events that are not rail intents, `railway-session.ts:305-308`: confirm before relying on it).
  - `src/world/boogler-land.json` and `src/world/heights.ts` (`heightIn` moved from `src/island/ground.ts`, which re-exports it).
- **Client sends** through `railwayCommands()?.act(op, fields)` (`src/entities/railway/state.ts:9`), receipts through `onAccepted(fn, 'command')` and `onRefused(fn, 'command')`, as `src/features/identity.ts:44` does for `who.set`. Commands share the session's eight-request window with rail actions.
- **Controls:** none change. `place-sit`, `place-stand` and his Talk target keep their ids, verbs and order; no action, pad slot, key, touch button or guide row is added.
- **Rail route:** no beat's bill, supply or cue changes. Commands are recorded on the railway account's request sequence (`api.record`), so checkpoints S and B run `npm run loop -- run`.

## 4. Steps

Each step is one sitting, ships on its own and leaves `node dev/ship-check.ts` green. "High-risk" (server, sync, world or net) means: read `src/world/README.md`, `src/net/README.md` and [room-safety](../agents/room-safety.md) first, and an independent review before it ships. A `WORLD_NS` bump takes a dated history line in `src/world/namespace.ts` and never ships mid-session. Steps reviewed together may ship as one batch sharing one bump.

- [x] **1. Seat rule and ops on the server, in shadow** (high-risk; no bump, no new replicated kind). Create `src/sim/seats.ts`, `src/world/rules/seats.ts`; edit `server/src/host/world-host.ts` (`installSeats` beside the roster; `depart(sid)` calls `release(pid)` when `!requests.active(pid)`; `pause()` calls `clear()`; `status()` gains `seats: rows()`). Edit `src/entities/railway/seat.ts` only to also send `seat.sit` (with `alt`) from `sitDown` and `seat.stand` from `standUp` when a session exists; the lead still decides and receipts are ignored. Tests first: `test/seats.test.ts` (first free of the list, never displaces, one seat per pid, moving frees the old chair, bad ids and over-long lists refused, invariants after 5,000 seeded sit/stand/release calls); `server/test/seats-host.test.ts` through the real host (two players ask for one chair and the second gets the alternate; a third with no alternate is `rej refused`; a duplicate request applies once; `seat.stand` frees; departure after the grace frees and a reconnect inside it keeps the chair; sits faster than `SEAT_SIT_MS` are refused without spending; a pid cannot free another's chair; nothing reaches the checkpoint). Room safety: apply returns a result and plays nothing; the shadow sends are never treated as done. Mixed builds: an old server refuses the unknown op and the client ignores it. **Acceptance (design review, finding 1):** a refusal carries its reason (`taken` when every chair of the list is occupied, `rate` inside `SEAT_SIT_MS`); a rate-limit refusal never stands a player up; host test: two sits 100 ms apart on a free chair leave the player seated and in the row (in shadow: in `status().seats`) within the next reconcile.
- [x] **2. Flip seats to the server** (high-risk; bump **v41**: a new replicated kind and two presence keys removed). Create `src/world/seat-replicate.ts`; edit `src/world/railway-replicate.ts` (add `SEAT` to the mirror's schemas and hash list, expose `seats`), `server/src/host/world-host.ts` (`projectSeats`), `src/entities/railway/seat.ts`: delete `placeSeatGrants`, `placeSeatRequest`, `assign`, `requests`, `grants`, `serial`, `heardAt`, the `onLeadChange` stand-up and the stand-up in `reset()`; add the pending request, the receipt handlers and the once-a-second reconcile from section 2; `seatHeld(id)` reads the mirror; remote riders use `seats.occupant(id) === r.pid && pr.placeSeatPose === id`; `seatState()` returns `{ pending, sitting, occupants, lastRelease }`. Delete `src/entities/railway/seat-claims.ts` and `test/seat-claims.test.ts`. Update `dev/look/bots/railway.ts:1146-1148` and the evals that read `grants`. Update `docs/game-design/place.md` ("You can sit", the lead-change sentence) and `multiplayer.md`. Tests first: extend `server/test/seats-host.test.ts` (two real client mirrors agree on occupants; a late joiner sees the row; a server restart leaves no row and the re-claim seats the rider again; a refused re-claim stands them up). Then one look: two players, one chair contested, both stills opened. Room safety: prediction stays reversible until the receipt; a timeout is never read as success (the reconcile asks again); `placeSeatPose` still returns null when you stand. **Acceptance (design review, findings 1 and 2):** only a `taken` refusal steps you off; a `rate` refusal holds the predicted seat and the reconcile asks again; the re-claim after a reconnect or a server restart sends the alternates (`alt`) too, so a rider whose chair was taken in the gap slides to a free one instead of standing up (host test).
- [ ] **Checkpoint S** (after 2; a bump): `npm run check:full`, `npm run test:net`, `npm run loop -- run`, the two-player seat eval (`dev/look/evals/railway-passenger-car-two.ts`) with the first tab closed mid-ride (the old lead leaving) and the rider still seated.
- [x] **3. His land for the server** (high-risk for the server image; no bump). Create `src/world/heights.ts`; edit `src/island/ground.ts` (re-export). Extend `dev/scenarios/world-inputs.ts` to pin `src/world/boogler-land.json` (`UPDATE_FIXTURE=1` writes it; otherwise the scenario compares): `{ n, heights: base64 Int16 centimetres, obstacles: [[x, z, r]], keepOut: [[x, z, r]], mainland }`, read from the running game's `baseCm`, `obstacles`, `island.keepOut` and `MAINLAND`. Edit `server/src/host/land.ts`: `loadBooglerLand()` returning a `BooglerLand` (bucketed `blocked` copied from `blockedAt`). Test: `server/test/boogler-land.test.ts` (loads; a known meadow point is dry and clear, a sea point is not; `height` equals `heightIn` on sampled cells). About 450 KB on the server only; the client bundle never imports it.
- [ ] **4. The headless brain and walk function; the deciding tab uses them** (high-risk: world; no bump, `g` unchanged on the wire). Create `src/world/boogler-walk.ts`, `src/world/boogler-brain.ts`. Edit `src/boogler/boogler.ts`: when `simulating`, run the brain at 10 Hz on a local tick with the client's own land and show `booglerPose`; `publish` still sends the pose it shows, so followers are unchanged. Delete the old `think` and its helpers from `boogler.ts`. Tests first: `test/boogler-walk.test.ts` (the closed form equals a 1 ms stepped integration of today's rule within 1 cm and 5 mrad for heading errors of 0, 60, 120 and 180 degrees at all three speeds; `booglerLegEnd` is the first tick at the target; test vectors written out for other clients); `test/boogler-brain.test.ts` (same seed and visitors give the same legs; over 20,000 ticks he is never on blocked or wet ground and no leg crosses an obstacle; a talker within 5 m stops him; a rider speeds him to 2.3 m/s; a wary visitor within 9 m makes him flee away from them; he returns toward home from 60 m). Then one look: solo, he potters, attends a talk and carries a rider; compare a short clip with main.
- [x] **5. The server runs the brain, in shadow** (high-risk; no bump, nothing replicated or saved). Create `src/world/rules/boogler.ts` (tick only); edit `server/src/host/hosted-room.ts` (`positions()` rows gain `act` and `wary` from `d.bg`, validated as two small integers) and `world-host.ts` (`installBoogler` with `loadBooglerLand()`, visitors from positions fresher than 2 s; `status()` gains `boogler: leg()`). Test: `server/test/boogler-host.test.ts` (he walks with nobody near; fake presence with `bg` talk stops him and with wary makes him flee; a paused room does not advance him; malformed `bg` is ignored). Report the step meter before and after (`/rooms/:id/status`). [Built report](server-owned-players-step5-report.md): the existing endpoint is `/rooms/:id/host`; continuous travel and independent RNG are shadow-only, with the lead unchanged until step 6.
- [ ] **6. Flip The Boogler's movement** (high-risk; bump **v42**: a new replicated kind and a new saved state). Create `src/world/boogler-replicate.ts`; edit `src/world/railway-replicate.ts` (schema, hash list, expose `boogler`), `src/world/rules/boogler.ts` (projection touched only when the leg changes; `registerState('boogler', { serialize: [x, z, yaw], load, hash }, { server: true })`), `src/boogler/boogler.ts`: delete `addHostField('g')`, `publish`, `hear`, `snaps`, `src`, `STALE_MS`, the `isLead()` branch; live tabs show the mirror's leg, tabs with no session keep the local brain from step 4. Update `dev/scenarios/shared-kinds.ts` and `docs/game-design/boogler.md` ("Wander", "Known issues"). Tests first: extend `server/test/boogler-host.test.ts` (two client mirrors compute the same pose at the same tick; a late joiner agrees; a restart restores his place; a failed load is not saved as fresh state). Then one look: two players, the first tab closes while he walks and he keeps walking on the second. **Acceptance (design review, findings 3 and 4):** opening your own talk stops him on your screen at once (Local: hold him where he is shown and turn him to you, then ease to the server's leg when it arrives); on load a saved spot that is blocked, wet or off the current baked land falls back to `findStart` (host test); a room reset and a `WORLD_NS` bump return him to his start (host test). [Step 6 implementation and proof limits](server-owned-players-step6-report.md): runtime built; Checkpoint B remains open for the recorded browser coverage gaps.
- [ ] **Checkpoint B** (after 6; a bump): `npm run check:full`, `npm run test:net`, `npm run loop -- run`, packet bytes from `test/replicate-budget.test.ts`, the step meter, one two-player look of a ride and a talk, and one solo look of a player stepping onto him mid-walk (the leg changes at that moment; the ease must not slide him out from under the rider). Reaction delays are judged against "Reaction budgets" below.
- [ ] **7. Present and puff reactions as server commands** (high-risk; bump **v43**: `bg` reshaped). Edit `src/world/rules/boogler.ts` (`boogler.gift { kind }`: a catalogue index that is not `key`, the actor within 5.6 m of his pose, one per 1,500 ms per pid; `boogler.puff {}`: the actor within 2.6 m, one per 2,000 ms; each emits `{ op: 'boogler.react', pid, kind }` to everyone but the actor, with `kind` 2, 4, 5 or 6), `src/boogler/play.ts` (`emit` plays locally and calls `act`; `bg` becomes `[act, wary]`; delete `ev`, `evN`, `seen`, `playRemoteEvents` and the two retired branches of `play`, keeping the reserved numbers in the `EV` comment; remote reactions come from `onReact`), `docs/game-design/boogler.md`. Tests first in `server/test/boogler-host.test.ts`: the reaction follows the catalogue's taste whatever the client claims; a key item, an unknown kind, too far and too fast are each `rej refused` and emit nothing; the actor gets no echo; a duplicate request emits once. Then one look: the second player sees the hearts. Room safety: the emit is the server's replicated output, not an effect in apply; the giver's local reaction never replays on the receipt. **Acceptance (design review, finding 5):** a friend's puff ends at the launch (it plays for the time that remains, not a full 750 ms from arrival); refused presents and puffs are counted in the room status; assume one giftable kind in play, the seed (taste "like", so hearts), and use a seed bag for the look; the grumpy face and the squish are proven in the host test only (no item in play has those tastes); the frisbee stays a valid kind on the server; correct `docs/game-design/gifts.md` to say the frisbee has no source today (a doc line; his copy is untouched).
- [ ] **8. Delete `addHostField` and the lead** (high-risk: net; bump **v44**, a server-to-client message removed). Delete: `addHostField`, `isLead` and the two lead lines in `src/netplay/net.ts`; `hostField` in `presence-fields.ts` and its tests; `isLead`, `onLeadChange`, `lead`, `setLead` and the `lead` case in `src/net/ws-room.ts`; `lead`, `pickLead`, `checkLead`, `leadHiddenMs`, the welcome's `lead`, the `lead` message and `status().lead` in `hosted-room.ts`; the `role` field's lead value in `features/telemetry.ts` (send `client`), the lead text in `debug/netdebug.ts` and `debug/dev/room.ts`; the `addHostField` entries in `dev/lint/policy.ts`, `dev/scan/read.ts`, `dev/scan/task-routes.ts`, `dev/registry/scan.ts`; the lead checks in `dev/peer-test/ws-page.ts`, `ws-run.ts` (steps 1 and 6 become "no tab is special; the others see it leave"), `dev/scenarios/lib/world.ts`, `server/test/host.test.ts`, `test/atlas.test.ts`, `test/registry.test.ts`. Docs: `docs/agents/sync.md` (remove the Host kind), `.claude/rules/state-consumers.md`, `src/net/README.md`, `src/world/rules/README.md`, `docs/game-design/net.md`, the atlas story for sync kinds, and a drafted DESIGN.md sync and authority table in `docs/plans/server-owned-players-step8-report.md` for the owner to commit. Proof: `rg "isLead|onLeadChange|addHostField|hostField" src server dev test` finds nothing; `npm run registry` shows `g`, `placeSeatGrants` and `placeSeatRequest` free.
- [ ] **Checkpoint C** (after 8): `npm run check:full`, `npm run test:net`, a two-device play of join, sit, ride, talk, the first device leaving, a reconnect and a server restart.

### Reaction budgets (proof; design review)

Judge steps 2, 6 and 7 and checkpoints B and C against these. The plan's paths (uplink, up to 100 ms for the rule tick, downlink: about 150 to 250 ms) fit all of them once step 6's local talk stop is in.

| Reaction | Budget | Reads as broken |
| --- | --- | --- |
| Anything on the presser's own screen (sit, stand, hearts, puff, the talk box, him stopping for your talk) | The same frame; never waits for the server | Over 100 ms |
| A friend's hearts or grumpy face on your screen | 250 ms after their press | Over about 500 ms |
| A friend's puff on your screen | Starts at least 350 ms before the launch and ends with it | The rider flies off before he has puffed |
| Him stopping for a friend's talk; speeding up under a rider | 300 ms | Over about 600 ms |
| Him fleeing a wary player | 1 s (today's re-check is 0.8 s) | Over 2 s |

## 5. Hostile clients and rate limits

| Case | What stops it |
| --- | --- |
| Taking an occupied chair | `pickSeat` only returns a free chair or the caller's own; nothing displaces an occupant |
| Freeing or moving someone else | Ops act on the socket-bound pid (`e.u`); no op names another player |
| Sitting from far away | Not refused under S1 (the server has no seat positions). Bounded: one chair per player, freed on leave. Closed by S2 with prefab data |
| Spamming sit and stand | `SEAT_SIT_MS` 400 ms per pid on the host clock for accepted sits; stand is never limited (nobody is trapped) but only succeeds when seated; the room's 50 messages a second bucket and the eight-request window apply first |
| Made-up seat ids, huge lists | `SEAT_ID` shape, at most 8 ids, at most one row per pid, so the table cannot grow past the player cap |
| Forged present or puff | Reach against the server's own pose for him and the actor's `at`; the reaction is derived from the catalogue; per-pid rates 1,500 and 2,000 ms; malformed input is a recorded refusal, never a throw |
| Forged `bg` (pretend to talk, ride or be wary) | The brain only heeds it within 5 m, 1.6 m or 9 m of that player's relayed pose, and a wary claim only makes him flee from the claimant. A player can still chase him by claiming wary: accepted (it is what a wary player does) |
| Forged position | Out of scope (movement validation); the same trust the railway's `Actor` has |
| Replays and reordering | The existing `(epoch, request)` refusals (`order`, `session`); a duplicate applies once |

## 6. What a player sees or feels changing (for the designer)

1. A seated rider is no longer stood up when another player's tab leaves, hides or reconnects.
2. A seated rider stays seated through their own short disconnect and through a server restart (today both stand you up). Owner question 4.
3. Losing a race for a chair is answered in one round trip by the server (slide to the neighbour or step off), instead of after the lead's next presence packet; the same outcomes as today.
4. The Boogler no longer stops, forgets his trip, freezes or jumps when the first player leaves or hides their tab, and he is in the same place on every screen, including for someone who just joined.
5. He stands still while nobody is in the room and is where you left him after a deploy (today he restarts near the spawn with each new lead). Owner question 2.
6. His walk between decisions is computed, so it is smooth at any frame rate; the path, speeds and turn rate are today's. While idle, the direction he looks at a moving player is computed per screen and may differ by a few degrees between players.
7. Hearts, the grumpy face and the puff still show on your press; friends see them one server round trip later instead of with your next presence packet.
8. Unchanged: every line he says, the talk box, presents and tastes, the ride timer and launch, wary and forgiveness, the Sit and Stand up prompts and their order, seat positions and exits, the seated pose.

## Level findings

None. Nothing is placed or moved; no `npm run level-check` run applies.

## Risks

- **Room safety "Don't":** no effects in apply (steps 1, 7); a queued sit is not a seat (the receipt and the row are); nothing new is saved by clients, and the failed-load guard covers the new `boogler` state (step 6); `placeSeatPose` and `bg` still return null when off; no `Math.random` or wall clock in the brain or the seat rule (host-clock rate limits live in validation, the roster's pattern); new shared files sit in directories the image already copies.
- **Native trig in server-run code.** `boogler-walk.ts` and `boogler-brain.ts` use `sin`, `cos` and `atan2`, which the lint bans under `src/sim` and `src/world/rules`. They are placed in `src/world` beside `railway-server.ts`, outside the guarded paths, because no client predicts or decides from them: the server's legs are the only authority and clients only draw. `docs/agents/lockstep.md` gets one sentence saying so in step 4. The reviewer should confirm this reading; the alternative is a trig-free walk (turn in place, then walk straight), which changes how he moves.
- **Terrain drift:** the server's baked land can fall behind the client's island until `world-inputs` (daily on the Mac) fails and it is re-pinned; meanwhile he may clip a new prop. The classic island rarely changes.
- **Hotspots:** `server/src/host/world-host.ts`, `hosted-room.ts`, `src/entities/railway/seat.ts`, `src/world/railway-replicate.ts`, `src/netplay/net.ts`, `src/net/ws-room.ts`. `npm run inflight` (13 November) showed no branch touching them.
- **Mixed builds:** dev phase, no compatibility code. Bumps v41 (step 2), v42 (6), v43 (7), v44 (8); shadow steps 1, 3, 4 and 5 need none.
- **Request window:** sit, stand, gift and puff share eight in-flight requests with rail actions; all four are rare and rate-limited, and the reconcile resends a sit that could not be queued.
- **Performance:** no meshes, lights or client tick work added; the per-frame snapshot interpolation is replaced by one closed-form evaluation. Server: one brain tick per awake room per rule tick (a target pick samples at most 12 lines of 22 points) and at most one row per player for seats. Report the step meter (step 5) and packet bytes (checkpoint B); a cost is reported, not a reason to cut.
- **Solo and live use different terrain sources** (live island on the client, baked on the server): the same brain, so behaviour matches, but a solo tab that goes live eases him to the server's place.

## Out of scope

Shared physical props (the ball, the great beam on server Rapier); movement validation (comparing `at` with relayed pose); per-account progress (his memory of you, finds, wardrobe, station claims), so `wary` stays a fact your browser states; a server seat catalogue (S2); inventory on the server (a present is checked against the catalogue, not against what you hold); the storage move onto an ECS library; closing server-owned-state's checkpoints A and B.

## Open questions for the owner

**Answered by design defaults (design review, 13 November 2026); none waits for the owner.** Each is logged in [agent-calls](../agent-calls.md). The owner still commits the DESIGN.md text step 8 drafts.

- 1: legs (B). Architecture is the agents' call, and it is how trains and jobs already work.
- 2: saved, yes. An empty world is paused (DESIGN.md 9), and "where you left him" matches everything else in the room.
- 3: local on prototype pages. Prototypes do not shape core code.
- 4: stay seated, yes. Reconnecting must remain reliable (DESIGN.md 8); the re-claim sends the alternates.
- 5: presence for talking, riding and wary, commands for presents and puffs. Continuous facts heal by themselves; one-offs need a receipt.

The questions as asked:

1. **His movement: the server sends legs and every screen computes the walk (option B), or the server sends his position ten times a second (option A)?** Recommended: B. No steady traffic, identical on every screen, and it is how trains and jobs already work; A is the fallback if the walk function cannot be made to match.
2. **Is he saved?** Recommended: yes, position and facing only. He stays put across deploys and stands still while the room is empty; otherwise every server restart drops him back near the spawn.
3. **Prototype pages (`?proto=...`) have no server command boundary. Seats there unarbitrated and a Boogler per tab, or wire both into the generic host?** Recommended: local on prototype pages. They are not the game, and it lets the lead be deleted outright.
4. **Stay seated through your own reconnect and a server restart?** Recommended: yes (the re-claim in section 2). The conservative alternative keeps today's stand-up on any disconnect.
5. **Talking, riding and wary stay presence facts the server reads, with only presents and puffs as commands?** Recommended: yes. Commands for continuous facts add a lost-stop failure and buy nothing until his memory is per account.

**Not read or run:** the bodies of `replicate-server.ts` and `replicate-client.ts` beyond their contracts; `talk.ts`, `dialogue.ts`, `fx.ts`, `hud.ts` and `lines.ts` beyond searches; `rooms.ts`; the railway system bodies; prefab id character sets (the `SEAT_ID` pattern must be checked against them in step 1). No test, bot, perf or level run was made; `npm run inflight` and reads only. No fit check applies (not a Place port). `npm run map -- --kind plan` is not a kind the tool knows; the AGENTS.md table rows were followed instead.

## Design review (designer, 2026-11-13)

**Verdict: build with changes.** Nothing here needs the owner before building. One change is required before step 1 (finding 1); four more are required in the steps that own them (findings 2 to 5). 30 gameplay calls: 7 decided, 21 default, 2 new.

**Read:** DESIGN.md; owner-calls; the routing table and the Current rules for characters, controls, rail, rewards and process (searched for The Boogler and seats); `docs/game-design/boogler.md`, `gifts.md`, `mushrooms.md`, `retired-classic-copy.md`, `island.md` (lines 14 to 23); `src/entities/railway/seat-claims.ts`, `seat.ts:170-260`, `src/boogler/boogler.ts:196-298` (`think`), `src/boogler/play.ts:56-92,225-310`, `src/sim/gift-catalog.ts`; the reconnect grace in `server/src/host/hosted-room.ts:109`. **Not read or run:** the research docs' top blocks (only the index; the plan's own citations of engine-long-term and coop-glitches were not opened), `talk.ts`, `lines.ts`, `fx.ts` bodies, find-the-fun (a search found no Boogler or seat rule in it), no look, loop, bot or playtest-data run. No level review: nothing is placed, moved or gated. No fit check: not a Place port.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| S1 | One seat per player; a sitter is never displaced | Default | As built (`seat-claims.ts`, "never time a held seat out"); kept |
| S2 | A contested chair goes to the request that reaches the server first (today: the lower peer id among requests the lead hears in the same pass) | Default | Fairer and explainable; see "Seat rules" below |
| S3 | The loser slides to the first free chair of the list their own screen sent, nearest first, up to 7 (today: the group's registration order) | Default | Nearest is the better neighbour; same outcome on a four-seat car |
| S4 | Sit and stand show on the press; the receipt only corrects | Decided | [Input gets instant feedback](../agents/owner-calls.md) (6 November) |
| S5 | Another player's tab leaving, hiding or reconnecting never stands you up | Decided | DESIGN.md 8 ("joining, leaving, reconnecting must remain reliable"); [13 November](../decisions-process.md#d-2026-11-13-server-owned-state-answered) |
| S6 | You stay seated through your own reconnect and a server restart, by re-claiming once a second (question 4) | Default | Yes. Add the alternates to the re-claim (finding 2) |
| S7 | A chair is freed when its player's session departs after the 1.5 s reconnect grace; every chair is cleared when the room pauses | Default | The grace is short enough that no ghost holds a stool anyone notices |
| S8 | Opaque seat ids: the server cannot refuse a sit from far away | Default | Harm is one chair per hostile player in a game tuned for one to three friends ([Tune for 1-3 players](../agents/owner-calls.md)); the plan's "exploits do not matter (6 November)" citation was not opened |
| S9 | `SEAT_SIT_MS` 400 ms between accepted sits per player | Default | Keep the number; **finding 1** changes what a refusal for it does |
| S10 | A friend is drawn in a chair only when the server row and their own pose both name it | Default | Standing shows at presence speed; sitting shows after the row arrives (one round trip, fine) |
| S11 | Prototype pages and offline: seats local and unarbitrated, a Boogler per tab (question 3) | Default | [Prototypes are temporary](../agents/owner-calls.md): no core reshaping around them |
| B1 | The server sends legs; every screen computes the walk (question 1, option B) | Default | Agents own architecture ([The codebase is the agents' to own](../agents/owner-calls.md)); the feel test is the step 4 clip against main |
| B2 | His brain runs on the server at 10 Hz, so stopping for a talk, speeding up under a rider and fleeing arrive one server round trip plus up to 100 ms after the cause. Today the solo player is the lead and gets these in the same frame | **New** | Acceptable for the ride and the flee; **not** for the talk on the talker's own screen (finding 3) |
| B3 | He stands still while the room is empty | Decided | DESIGN.md 9 ("An empty world is paused") and "Server hosts every room"; [rewards, 10 November](../decisions-rewards.md#d-2026-11-10-open-calls-answered-riders-and-boogles) ("nothing runs while the room is empty") |
| B4 | His position and facing are saved; a deploy or restart leaves him where he was (question 2) | Default | Yes. Revalidate the spot on load (finding 4) |
| B5 | A room reset or a `WORLD_NS` bump puts him back at his start | Decided | [A room reset starts the game over too, The Boogler included](../decisions-controls.md#d-2026-11-09-a-room-reset-starts-the-game); [a world wipe is a new save](../decisions-process.md#d-2026-11-08-a-world-wipe-is-a-new). The plan does not say it: finding 4 |
| B6 | His wander is seeded from the world seed and the tick he wakes at | Default | Invisible; nobody can tell a seeded wander from today's |
| B7 | While idle, the server names who he looks at and each screen turns him toward that player | Default | A few degrees of difference between screens is not noticeable |
| B8 | A new leg eases from where he is shown and snaps past 6 m, including while someone stands on him | Default | Today's follower rule. Check it under a rider (finding 5) |
| B9 | With no session the tab runs the same brain locally and eases to the server's place on joining | Default | He lives 800 m from the landing; nobody is watching at join |
| B10 | Talking, riding and wary stay presence; the server reads them (question 5) | Default | They heal by themselves; a lost stop command would leave him frozen at a player who left |
| B11 | Presents and puffs become server commands; the shared reaction comes from the catalogue's taste, not the client's claim | Default | Same mapping as `play.ts:259` (love or like: hearts; dislike: grumpy; otherwise the small squish) |
| B12 | Present within 5.6 m, one per 1,500 ms per player; puff within 2.6 m, one per 2,000 ms | Default | 2 m and 1 m of slack over the client's 3.6 m talk and 1.6 m ride ranges covers the easing; a ride cannot puff twice inside 2 s (3.5 s patience, 1.5 s when wary, plus the 750 ms puff and a flight) |
| B13 | The giver and the rider see and hear their reaction on the press | Decided | Input gets instant feedback (6 November) |
| B14 | A refused present or puff means friends see nothing; nothing is taken back | Default | Right for a cosmetic. Count refusals so a wrong range shows up (finding 5) |
| B15 | Friends see hearts, the grumpy face and the puff one server round trip later than today | **New** | Fine within the budget below; the puff must still end at the launch, not 750 ms after it arrives (finding 5) |
| B16 | No line of his moves, changes or goes on the wire | Decided | [Keep The Boogler's copy](../agents/owner-calls.md) |
| B17 | The two retired reaction branches (old pet, old celebration) stop playing; their numbers stay reserved | Decided | [No old builds in development](../agents/owner-calls.md); `boogler.md` "Known issues" keeps the numbers |
| B18 | He walks the server's baked copy of the island and may clip a new prop until it is re-pinned | Default | The classic island rarely changes; a clip is a P3 |
| B19 | The server accepts the frisbee as a present kind although nothing gives one | Default | Keep it accepted, so the line works the day a frisbee source returns |

Unchanged and not counted: his speeds (1.5, 2.3, 3.4 m/s), turn rate, the 5, 7 and 9 m ranges, trip odds, ride patience, launch, forgiveness, the Sit and Stand up prompts, exits and the seated pose.

### How late a reaction may be

| Reaction | Budget | Reads as broken |
| --- | --- | --- |
| Anything on the presser's own screen (sit, stand, hearts, puff, the talk box, him stopping for your talk) | The same frame; never waits for the server | Over 100 ms |
| A friend's hearts or grumpy face on your screen | 250 ms after their press | Over about 500 ms: the talk has moved on and the hearts have no cause |
| A friend's puff on your screen | Must start at least 350 ms before the launch (within about 400 ms of the rider's press) and end with the launch | The rider flies off before he has puffed |
| Him stopping for a friend's talk; speeding up under a rider | 300 ms | Over about 600 ms he has walked a metre with a talk open |
| Him fleeing a wary player | 1 s (today's re-check is 0.8 s) | Over 2 s |

The plan's paths fit these on a normal connection (uplink, up to 100 ms for the rule tick, downlink: about 150 to 250 ms), except the first row for the talk (finding 3).

### Rulings asked for

**Section 6, the eight changes.** 1, 2, 4 and 8: acceptable, and 1 and 4 are the fixes the owner asked for. 3: acceptable; who wins changes slightly (S2), the outcomes do not. 5: acceptable (B3, B4). 6: acceptable only if the step 4 clip shows the same walk; the per-screen idle look is fine. 7: acceptable inside the budget above, with the puff fix. None changes his wander, wariness, ride or launch rules. The one change to how he **feels** is B2: a solo player on boogle.club is the lead today, so he reacts to them in the same frame; after step 6 he reacts a round trip later. That is why finding 3 is required.

**The five owner questions.** None is a real owner question; all five are defaults the build proceeds on, logged below.

1. Legs or 10 Hz pose: architecture, the agents' call. B.
2. Saved, and still in an empty room: standing still is already decided (B3). It also fits him: nobody is there to see him live on, and the only thing a player can observe is where he is when they return. "Where you left him" is the honest answer for a paused world and matches every other thing in the room. Saved, yes. If the owner later wants him to have "been somewhere", that is one line (re-pick a spot near home after a long pause) and a character quirk, which is his to choose ([11 November](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)); not built now.
3. Prototype pages: local. Covered by the prototypes call.
4. Stay seated through your own reconnect and a restart: yes; DESIGN.md 8 points the same way.
5. Presence for the continuous facts, commands for the one-offs: yes.

What does wait for the owner is already in the plan: he commits the DESIGN.md sync and authority tables that step 8 drafts.

**Seat rules in a contested moment.** Three differences from today, all fine for a co-op game of one to three:

- Ties go to whoever's request reaches the server first, not the lower peer id. Nobody could have predicted the old rule; the new one is "I pressed first".
- The loser slides to the nearest free chair on their own screen, not the first registered one.
- A sitter is still never displaced, and a third player at the machine's two stools still steps off, as today. The passenger car has four seats ([rail, 10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-older-calls)), so with up to four players nobody is refused there.

Opaque ids change nothing between honest players. The rate limit does, as planned: finding 1.

**Are his present reactions still reachable?** Checked in code at this commit:

- **Seed: reachable.** The stand's Take is local (`src/adapters/mushrooms.ts:364`, `take('seeds')`) and did not go with the gift state. The stand is on the classic island's Home, the island he lives on, so anyone who can talk to him can bring him a bag. Not checked by walking there.
- **Frisbee: unreachable.** `src/adapters/gifts.ts` is gone and nothing in `src` takes a frisbee (`rg "'frisbee'"` finds only the catalogue and the throw profile). The lighthouse still names `FRISBEE_SPOT` with nothing on it.
- **Ball: reachable** (his refusal line; the ball is picked up as before).

The plan should assume: one giftable kind in play today (the seed, taste "like", so hearts), the ball's refusal, and the frisbee kept valid on the server (B19). Step 7's look uses a seed bag. "Dislike" and "meh" have no item in the catalogue today, so the grumpy face and the squish cannot be produced by a present in play; test them in the host test only.

**Suspect lines for the owner (nothing changed):**

- `src/sim/gift-catalog.ts:24`, the frisbee line ("A frisbee! A plate that flies! ..."): cannot be heard, no frisbee exists. Already kept by `retired-classic-copy.md`; listed again because that file does not say it is unreachable.
- `docs/game-design/gifts.md` says "the seed stand and The Boogler's gift dialogue still use it" without saying the frisbee has no source. A doc line, not his copy; step 7 should correct it.

### Findings

1. **Required before step 1: a rate-limit refusal must never stand a player up.** The plan sits you on the press and steps you off on "refused". Sit, hop off (Jump stands you), sit again inside 400 ms is an ordinary thing to do in a slapstick game, and the slide to a neighbour is itself a second sit. As written the second sit is refused "without spending" and the player is thrown onto the exit from a free chair. Step 1 defines the op and its tests, so fix it there: the refusal carries its reason; only "every chair taken" steps you off; a rate refusal holds the predicted seat and the once-a-second reconcile asks again. Add the host test: two sits 100 ms apart on a free chair leave the player seated and in the row within the next reconcile.
2. **Step 2: the re-claim sends the alternates too.** After a restart or a reconnect, a friend may have taken your chair in the gap. Re-claiming only that chair stands you up beside three free seats; with `alt` you slide over, as in a first sit.
3. **Step 6: your own talk stops him on your screen at once.** Today the solo player and the lead see him stop in the frame they press Talk. After step 6 he walks on for a round trip plus a tick (up to about 0.4 m at 1.5 m/s) with the talk box open and the camera framing him. Followers already see this today, so it is not broken, but it moves the common case (one player on the live site) the wrong way against "Input gets instant feedback", which the owner made the acceptance test for netcode work. Required: when you open a talk, your screen holds him where he is shown and turns him to you (Local, like the idle look), then eases to the server's leg when it arrives. No such need for the ride (he is under you either way) or the flee.
4. **Step 6: his saved spot is checked and can be wiped.** (a) On load, a saved position that is blocked, wet or off the land in the current baked file falls back to `findStart`; otherwise a re-pinned island can leave him inside a prop for good. (b) State and test that a room reset and a `WORLD_NS` bump return him to his start (B5), since "saved" is new for him.
5. **Step 7 and checkpoint B, three small ones.** (a) A friend's puff ends at the launch: play it for the time that remains, not a full 750 ms from arrival. (b) Refused presents and puffs are counted in the room status, so a range that is too tight (his shown pose eases behind the server's) is seen instead of silently costing friends their hearts. (c) Checkpoint B's ride look includes a solo player stepping onto him mid-walk: the leg changes at that moment (the mode becomes ridden), and the ease must not slide him out from under the rider.

**What a player could feel that the plan does not list.** No new stall was found: sitting, standing, presents and the puff never wait for the server. When the eight-request window is full of rail actions, a sit is still shown at once and only its row is late; friends see you standing in the car until the reconcile lands, which is acceptable. While your own connection is down he finishes his leg and stands (or the local brain walks him), then eases or snaps back on reconnect: acceptable, and better than today's per-tab disagreement.

### Owner questions

None. For the owner's information, not his decision: the frisbee line cannot be heard today, and his saved position is new (B4).

### Rows for docs/agent-calls.md (status `open`; the orchestrator files them)

For "Architecture, tools and prototype lifecycle":

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-13 | Default: The Boogler's movement is sent as legs and computed on every screen; talking, riding and wary stay presence the server reads; presents and puffs are server commands; prototype pages and offline keep local seats and a Boogler per tab | [server-owned-players](plans/server-owned-players.md#design-review-designer-2026-11-13), calls B1, B10, B11, S11 | designer (server-owned players review) | Architecture is the agents' call; continuous facts heal by themselves, one-offs need a receipt; prototypes do not shape core code | open |
| 2026-11-13 | Default: seats on the server: one per player, nobody displaced, the first request to arrive wins a contested chair, the loser slides to the nearest free one or steps off, opaque seat ids with no reach check, 400 ms between accepted sits (a rate refusal never stands you up), you stay seated through your own reconnect and a server restart, a chair frees 1.5 s after its player goes | [server-owned-players](plans/server-owned-players.md#design-review-designer-2026-11-13), calls S1 to S10 | designer (server-owned players review) | Same outcomes as today for honest players; ties become "pressed first"; the hostile case costs one chair | open |

For "Characters, cosmetics and story":

| Date | Call | Where | By | Why this pick | Status |
| --- | --- | --- | --- | --- | --- |
| 2026-11-13 | New: The Boogler's reactions to players come from the server (10 Hz), so he stops for a friend's talk, speeds up under a rider and flees up to about 300 ms later than on today's lead tab; your own talk stops him on your screen at once. Friends see hearts and the puff one round trip later, and the puff still ends at the launch | [server-owned-players](plans/server-owned-players.md#design-review-designer-2026-11-13), calls B2, B15 | designer (server-owned players review) | The price of no lead tab; kept inside stated budgets, with the presser's screen never waiting | open |
| 2026-11-13 | Default: The Boogler's position and facing are saved: he is where you left him after a deploy or an empty room, returns to his start on a room reset or world bump, and moves to a clear spot if the saved one is no longer clear. His wander is seeded per room; who he looks at while idle is picked by the server and turned per screen | [server-owned-players](plans/server-owned-players.md#design-review-designer-2026-11-13), calls B4 to B9 | designer (server-owned players review) | An empty world is paused (DESIGN.md 9); "where you left him" matches everything else in the room; a "he has been somewhere" quirk is the owner's to add | open |
| 2026-11-13 | Default: presents within 5.6 m, one per 1,500 ms; puffs within 2.6 m, one per 2,000 ms; a refusal only means friends miss the reaction; the frisbee stays a valid present kind although nothing gives one today (its line is unreachable; the seed and the ball's refusal are reachable) | [server-owned-players](plans/server-owned-players.md#design-review-designer-2026-11-13), calls B12, B14, B19 | designer (server-owned players review) | Slack over the client ranges covers the easing; keeping the frisbee valid costs nothing and keeps his line working when a source returns | open |
