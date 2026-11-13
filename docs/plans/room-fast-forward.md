> **Status: planned (2026-11-12).** Base `origin/main` at `add1b4264` (`WORLD_NS` v32). Step 0 is separable and first.
> No `WORLD_NS` bump, no new wire op, no lockstep op. Nothing here was built or run: every claim is from reading main.

# Room fast-forward

**What the live room can do today (main, v32).** The shared `boogle` room can already build greybox leg 1 past the
rivet. There is no "closed" bit: `Route` is `{ grants, gates, arrived }` (`src/sim/railway-components.ts:348`), and
leg 0 opens by `legReached` = `legBuilt(0)` and `Aperture.joined >= 0` (`src/sim/railway-queries-route.ts:38-41`;
`legBuilt`, `src/sim/railway-lines.ts:578`; leg 0, `stack`, is the only built leg). The server accepts `rail.legStock`
(`src/world/railway-server.ts:133`) and the view is on main (`src/entities/route-greybox/leg-view.ts`). The "closed in
the shared room, open in jump-in rooms" bit of [greybox-route](greybox-route.md) (line 961) was never built (its line
1136). So leg 1 can be playtested in the live room with no jump room, but only once that room has struck the rivet,
which is hours of play: that gap is what fast-forward closes.

## Goal

The owner moves the room he is in to a named stage, on the server, for everyone in it. Owner, 12 November: "In
general, I'm not a fan of the jump-in rooms as separate rooms. We should just have a live game and then we should maybe
have a mechanism to fast-forward progress for testing in the game to move the server in the same room". Serves **How we
work: playtest constantly**, **8. Enjoyable alone and together** and **Clear authority**. It bends **9. Leave something
for the next visitor** and the 2026-11-09 decision "playtest jump-ins (a requirement)" (`docs/decisions-process.md:107`:
"The shared `boogle` world and its saves are never touched"): its goal stands, its separate room is what the owner
reversed, and what protects the shared save now is owner question 1.
**Research.** [dev-menu-plan](../research/dev-menu-plan.md): uses Source's `sv_cheats` (the executing authority enforces
the gate) and Caves of Qud (exact ids, confirm a destructive command); departs from "Keep cheats in disposable tests".

## What exists

- **Building a seed** is from nothing only: `buildSeedWorld(stage)` (`src/sim/railway-seeds.ts:95`) starts at
  `createRailway()` and drives sessions `a` and `b` through accepted ops, asserting exact counts (`need`).
- **Applying a seed** is a whole-world replace, never a merge: `server/src/seeds/build.ts:29` loads the snapshot into a
  host (all or nothing, through `railwayCheck`) and saves a room doc `{ tick, data }`; production serves prebuilt docs
  for `OFFERED_STAGES` only. `POST /jump` (`server/src/jump.ts`) puts the doc in a new room `<stage>-<6 chars>` with a
  sidecar in `DATA_DIR/jumps/`; `seedRoom` refuses a loaded room or one with a save. Client: `?from=`
  (`src/boot/jump-in.ts`), Pause → More → Jump in (`src/features/jump-in.ts`), the landing
  (`src/entities/railway/arrival.ts:86-92`), `seed` on `GET /rooms/:id/host` (`src/netplay/room-seed.ts`).
- **Replacing a live room's save exists**: `POST /admin/rooms/:id/restore` (`server/src/admin.ts`, bearer
  `REPORT_TOKEN`) backs the save up, takes the room offline (`roomHost.offline`, `server/src/host/rooms.ts:213`:
  everyone gets `bye`, reconnects in 0.5 to 1.5 s and takes the snapshot as a late join) and writes a doc.

## Options

- **(a) Replace (recommended).** The server writes the stage's seed doc over the room's save through the restore path:
  two proven paths, no op, no state, and the resync is the late join. (A swap in process, sockets open, was dropped.)
- **(b) Simulate.** Honest but slow: the bot's full route is about 1,700 s of wall clock at 5x warp
  (`dev/look/playthrough.ts:9`), `deck-laid` needs `--wall 2700`, and it needs a browser per bot on the server. The
  same states build as seeds in 0.1 to 5.7 s ([playtest-jump-in](playtest-jump-in.md)). Rejected.
- **(c) Replay the seed's ops on the live world.** The builders assume an empty world: on a played one their ops are
  refused (bills filled, trees cut) and `need` throws. It needs a delta builder per stage. Rejected.

**What (a) does to the room and the people in it** (one line each, for the owner):
- Everything built, stocked or earned becomes the stage's: progress past the stage is lost (the old save is
  backed up first, so the operator can put the room back).
- What anyone carries (logs, stone, rails, leg kit, a held beam) is gone; real players' account rows start again.
- Trains, their riders and loads, the cart and the wagon restart where the seed has them; someone riding is set down.
- The town economy (yards, towns, the strongbox's Boogles) becomes the seed's figures.
- Wardrobe finds stay: claims are personal and keyed by the room id, which does not change.
- Everyone present reconnects for about a second, then lands at the stage's spot with one line of text; players who
  are away find the room at the new stage when they return, with the same line once.

## Design

**Sync kinds.** The world change is the railway's **Server** kind, through its save: no lockstep op, no
`rules/types.ts` entry, no `edits`, `invariants` or `env`. The record of an advance is room metadata over HTTP, as
`seed` is. The line, the landing and the Dev control are **Local**. Authority: the server; a client only asks.

**Server and safety.** New `server/src/advance.ts`: `POST /admin/rooms/:id/advance`, body `{ stage, confirm }`.
1. Who: 404 unless `ADVANCE_KEY` (a new Fly secret) is set; 401 unless the bearer equals it or `REPORT_TOKEN`
   (`crypto.timingSafeEqual`, as `server.ts:324`); rate-limited before the comparison. Never an account: a pid is
   chosen by the client. Never a room message: nothing joins `RAIL_ACTIONS`, the ws wire or the room interface.
2. What: 400 for an id that is not a current railway room or a stage failing `isSeedStage`; 503 `stage not built` as
   `/jump`; 409 unless `confirm` equals the room's plain name (for `boogle` the control says it is the shared island).
3. Forward-only against the record: 409 when the room's last recorded stage is later in `SEED_STAGES`; going back is
   the operator's `npm run server -- restore <room>`. Play is not recorded, so the control says "replaces progress".
4. Do: `jumps.docFor(stage)` (exported), then `roomHost.offline`: admin's `keep(id, true)` (exported),
   `store.write(id, { tick, writerId: SERVER_ID, data, updatedAt: now })` (now, for the away credit), the record.
5. Record: `DATA_DIR/advances/<room>.json` `{ stage, at, build, backup, players }`, a line in `advances/log.jsonl`
   and `cfg.log` (not `jumps/`: its sweep deletes what it indexes); `GET /rooms/:id/host` gains `advanced`.

**Client.** `src/netplay/room-seed.ts` gains `roomAdvanced()` (fetched on every room-ready, so a reconnect sees it).
New `src/features/fast-forward.ts`: when `advanced.at` is newer than `boogle.advance.seen.v1:<room>` it shows the
line, lands the player and stores `at`. The line (UI text, never The Boogler's): "This room was moved forward to
<label>. Everything here changed for everyone." `src/entities/railway/arrival.ts` exports `landAt(land)`: its jump
landing (surface check, 1.4 m aside), dropping the saved pose; with no `land` the saved pose stands. Playdata:
`src/proto/playdata/record.ts` adds `advanced` beside `seed`; `dev/playtest/summary.ts` prints it. A tab on an older
build reconnects and plays on with no line; no compatibility code.

**Control.** Dev dock → **Room** (`src/debug/dev/room.ts`): "Fast-forward this room", listing `JUMPS` rows after the
recorded stage, the count of other players, a key field (`sessionStorage`; never in a URL, invite or report) and the
typed room name; also `boogle.dev.run('room', 'advance', { stage, confirm })` and `npm run server -- advance <room>
<stage>`. No action id, pad slot, key, touch button or guide row; no URL flag (a link must not change a room on load).

**`?from=` and the bot.** Kept as test tooling, because bots and looks need isolation and a deterministic fresh start:
`SEED_STAGES`, the builders, `server/src/seeds/`, `POST /jump`, `?from=`, `--rail-seed`, `--from/--to`, `npm run
checkpoints`, and jump rooms' header, arrival line and three-day sweep. Deleted: the Pause → More → Jump in row list
and its copy; dev-menu.md's "Jump in" becomes "Fast-forward" plus a "Test rooms" note. Renamed: nothing.

## Steps

- [ ] **0. The route is open in the shared room: pin it** (separable, first). Decided, relayed by the orchestrator, not
  yet in the decision log. Owner, 12 November: "Yes, I think it should. In general, we should consider this like a
  live service game …"; his correction: "we shouldn't consider this like a liver service game*". The decision is the
  same either way. No rule changes: nothing closes it on main. Add to `test/railway-route-rules.test.ts`: "no closed
  bit: any room at the rivet has leg 0 open" (`buildSeedWorld('ring-joined')`: `legOpen(w, 0)`, `rail.legStock`
  accepted, `Route`'s fields exactly `grants, gates, arrived`); to `server/test/railway-ring-host.test.ts`: a host for
  `railwayRoomId('boogle')` loaded from that doc accepts `rail.legStock`. Record the decision with both quotes in
  `docs/decisions-rail.md`; strike greybox-route line 961. **No bump**: no shape changes, so it neither needs v34 nor
  adds a reset, and lands before or after v33 and v34. A live room at the rivet sees, on load: leg 0's frame and rack
  at the stack line's first section, open at once, the opening kit loading. No room was riveted before v32.
- [ ] **1. Server endpoint.** `server/src/advance.ts`; `server/src/server.ts` (`ADVANCE_KEY`, `advanceRatePerMin` 6);
  exports from `jump.ts` and `admin.ts`; `advanced` on the host status. `server/test/advance.test.ts`: key unset 404;
  missing or wrong bearer 401 with the save's bytes unchanged and no `bye`; unknown stage 400; old-namespace id 400;
  wrong `confirm` 409; earlier stage 409; closing 409; over the rate 429; success: a backup, the doc equals the
  seed's, the record and log line, a connected peer got `bye` and its rejoin snapshot hashes to the seed, and a jump
  sweep leaves the room. `server/test/malformed-messages.test.ts`: `{ op: 'rail.advance', stage }` and `{ t:
  'advance' }` over the socket are refused with the world hash unchanged.
- [ ] **2. CLI.** `dev/server-admin.ts advance` (prints the backup and the restore command). Proof: a local advance.
- [ ] **3. Line, landing, playdata.** The Client paragraph's files. Proof: `dev/peer-test/ws-railway.ts` gains
  "advance: both peers rejoin and their mirrored hashes equal the seed's"; a `/look` still of the line.
- [ ] **4. Dev Room control; delete the Jump in list.** `src/debug/dev/room.ts`, `src/features/jump-in.ts`,
  `docs/game-design/dev-menu.md`. Proof: a `/look` still; the API with no key returns the refusal, nothing changes.
- [ ] **Checkpoint** (after 4): `npm run check:full`, `npm run checkpoints`, step 3's peer test, a wrong key on staging.

## Level findings and risks

- **Level findings**: nothing is placed, so `npm run level-check` was not run; landings are `JUMPS`' checked `land`s.
- **Room safety**: "Save or serve unverified state": the doc passes `okDoc` and the host's all-or-nothing load, as
  restore's does. A server file importing new shared code needs the three image lists (`test/server-image.test.ts`).
- **Unverified**: that a client holding a higher tick rejoins cleanly onto the seed's lower tick (steps 1, 3 test it).
- **The key in a browser**: hence a separate `ADVANCE_KEY`. **Backups**: only the newest 30 are kept, across all rooms.
- **In flight**: `greybox/leg1-step5` edits `railway-seeds.ts`, `railway-jump.ts` and `world-host.ts` (its `gorge-*`
  stages become targets with no work here). `npm run inflight` named no other branch on these files.
- **Performance**: no meshes, lights or tick work; an advance is one file write and a room reload.

## Designer calls

1. The line's wording, and the Room group's labels and its warning for `boogle`.
2. Landing: everyone at the stage's spot (recommended: the ground changes under saved poses) or only the asker.
3. `?from=` stays linkable for people (recommended, undocumented) or becomes harness-only; the list offers `JUMPS`
   rows (recommended: production prebuilds only those) or every `SEED_STAGES` entry.

## Owner questions

1. **Who may fast-forward, and which rooms?** Recommended: only a holder of the dev key, in any room including the
   shared `boogle` island, behind the typed confirmation and the automatic backup. Or: never the shared island.
2. **Does it move everyone without asking?** Recommended: yes, showing him the count of others first; they get the one
   line. Or: refused while anyone else is in the room.
3. **Is going back allowed?** Recommended: not in the game, only by restoring the backup from the command line. Or:
   any stage may be picked, earlier ones included.

## Design review (designer, 2026-11-12)

**Verdict: cleared to build in the order below, with three changes.** Nothing is placed or gated, so the level review
is short: landings are `JUMPS`' probed `land`s, and no stills were taken (there is no new place to look at). Research:
[dev-menu-plan](../research/dev-menu-plan.md) is followed (the authority enforces the gate, exact ids, a typed confirm);
its "Keep cheats in disposable tests" is departed from on the owner's 13 November word, which is his to give.

**Is it in scope under "Playtest before bespoke functionality"?** Step 0: yes, now; it is the build the 13 November
route decision is waiting for. Steps 1 to 4: in scope because the owner asked for the mechanism by name on 13 November
(after that call), and it is tooling, not a mechanic. But it does **not** get him to the playtest sooner: Pause → More →
Jump in → "Ring joined" already puts him at the rivet in one tap, and with no closed bit that room builds leg 1 today
(playdata, 12 November: `ring-joined-*` rooms were opened). What it changes is which room he tests in. So it must not
run ahead of the pre-playtest list, and the old way in is not deleted before the new one works for him (change 3).

| # | Call | Kind | Source or ruling |
| --- | --- | --- | --- |
| 1 | The greybox route is open in the shared room; a room at the rivet sees leg 0's frame and rack at once | Decided | [13 November](../decisions-rail.md#d-2026-11-13-greybox-route-open-in-the-shared-room) |
| 2 | The owner's way to a later stage is a fast-forward of the room he is in; the Jump in list goes | Decided | owner-calls, "One live game" (13 November) |
| 3 | A fast-forward replaces the whole world: progress past the stage, everything carried and the account rows are lost; wardrobe finds stay | New | Accepted as what "replace" means; the cost on the shared island is owner question 1 |
| 4 | The line | Default | Ruled: "The shared island was moved forward to <label> for testing. The world changed for everyone, and what you carried is gone." (a private room: "This room was moved…"). The plan's "Everything here changed for everyone" does not say what the reader lost. Plain UI text, in the words of today's "A test room, started at <label>. The shared island is unchanged." |
| 5 | The control's labels and warning | Default | Group "Fast-forward this room"; button "Replace this room with <label>". On `boogle`: "This is the shared island. Everyone who plays here gets this world, and N others are here now. Anything built past <label> and everything carried is lost. A backup is kept." Never "forward" alone: a played room with no record can go back in effect |
| 6 | Who lands at the stage's spot | New | Everyone who was in the room before the advance, once, present or away. A row with no `land` uses the usual spawn, not the saved pose (change 2) |
| 7 | Who is told and landed | New | Only a device that has been in this room before the advance. A first-time visitor gets the normal arrival and no line (change 1) |
| 8 | `?from=` for people | Default | The URL keeps working, with no gate, and is in no menu or player-facing doc; no new rows are made for people. A gate would be bespoke work for nothing, and the three-day sweep already clears the rooms. The 9 November goal is met by fast-forwarding a room; friends join it by its normal invite |
| 9 | What the list offers | Default | `JUMPS` rows only: they have labels and probed landings and are the ones production prebuilds. `ring-joined` is a row; the `gorge-*` stages join as rows when they ship |
| 10 | A fresh start stays one tap away | Default | 9 November: "starting from the beginning stays one tap away". Deleting the list deletes "From the beginning" (`start` is not a seed stage). Dev → Room keeps one "New empty room" row that opens a fresh private room and replaces nothing |
| 11 | Typed room name, the count of others shown, the key kept in `sessionStorage`, no URL flag | Default | As planned (dev-menu-plan: confirm a destructive command) |
| 12 | Forward-only against the record; back is the operator's restore | Default until answered | Owner question 3; the conservative option, so it builds |
| 13 | A tab on an older build plays on with no line; the away credit starts from the advance | Default | As planned |

**Changes before building**

1. **A first-time visitor must not get the line or the landing** (step 3). As written, any device with no
   `advance.seen` entry is told "This room was moved forward" and dropped at a mid-game platform, for ever after one
   advance of the shared island: a new player's first sight would be a testing notice in place of the arrival. Show and
   land only when this device has a saved pose or visit in the room older than `advanced.at`. Playdata has first-time
   phones on `boogle` on 12 and 13 November.
2. **No `land` means the usual spawn** (step 3). "Just woke" and "Trains running" have no `land`; a saved pose in a
   replaced world can be on a deck that is no longer there. Flow rule 3 (nobody is stranded).
3. **Split step 4.** The Dev → Room control builds now. Deleting the Jump in list waits until he has fast-forwarded a
   room himself with the key in his hands, and it keeps call 10's fresh-start row.

**Cleared before the owner answers:** step 0 (both tests and the record); step 1 with the shared island refused (400
for `railwayRoomId('boogle')` unless a server setting `ADVANCE_SHARED` is on, off by default, with a test); steps 2
and 3; step 4's control. **Waits:** turning `ADVANCE_SHARED` on (question 1), setting `ADVANCE_KEY` on production (his
or the operator's act), and deleting the Jump in list (change 3). Question 2's recommended behaviour builds, since
until question 1 is answered the others in a room are friends he invited.

**Owner questions (his to answer; recommendations only)**

1. **Who, and which rooms?** Recommended: the key holder only, any room including the shared island, behind the typed
   name and the backup. His words are "move the server in the same room" and "changes go on the live game"; the shared
   island's progress is already reset by each `WORLD_NS` bump (v33 and v34 are coming); visitors there so far stay
   under four minutes. Cost to weigh: principle 9, and 9 November's "never touched", which this ends.
2. **Move everyone without asking?** Recommended: yes, with the count shown to him first and the line for them.
   Refusing while anyone is present would let one idle tab block his playtest.
3. **Going back?** Recommended: not in the game; the operator restores the backup. Only the newest 30 backups are
   kept across all rooms, so "back" is not guaranteed for long, and the control should say so.

**Suspect copy:** none of The Boogler's is touched.
