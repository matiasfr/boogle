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
"The shared `boogle` world and its saves are never touched"). Its goal (reach a stage without replaying) stands; its
mechanism (a separate room) is what the owner reversed. What protects the shared save now: owner question 1.

**Research.** [dev-menu-plan](../research/dev-menu-plan.md): uses Source's `sv_cheats` (the authority that executes
enforces the gate), Caves of Qud (exact ids, bounded choices, confirm a destructive command) and Factorio (no second
simulation). Departs from "Keep cheats in disposable tests", on the owner's word above.

## What exists

- **Building a seed** is from nothing only: `buildSeedWorld(stage)` (`src/sim/railway-seeds.ts:95`) starts at
  `createRailway()` and drives sessions `a` and `b` through accepted ops, asserting exact counts (`need`).
- **Applying a seed** is a whole-world replace, never a merge: `server/src/seeds/build.ts:29` loads the snapshot into a
  host (`world().load(json, railwayCheck)`, all or nothing) and saves a room doc `{ tick, data }`. Production serves
  prebuilt docs for `OFFERED_STAGES` only (`server/src/seeds/prebuild.ts`).
- **Jump-ins**: `POST /jump` (`server/src/jump.ts`) names a new room `<stage>-<6 chars>`, creates its save from the doc
  and writes a sidecar `DATA_DIR/jumps/<room>.json`; `seedRoom` refuses a loaded room or one with a save. Client:
  `?from=` (`src/boot/jump-in.ts`), Pause → More → Jump in (`src/features/jump-in.ts`), the landing
  (`src/entities/railway/arrival.ts:86-92`), `seed` on `GET /rooms/:id/host` (`src/netplay/room-seed.ts`).
- **Replacing a live room's save exists**: `POST /admin/rooms/:id/restore` (`server/src/admin.ts`) backs the save up,
  takes the room offline (`roomHost.offline`, `server/src/host/rooms.ts:213`: everyone gets `bye`, reconnects in 0.5 to
  1.5 s and takes the snapshot as a late join) and writes a doc. Bearer `REPORT_TOKEN`, HTTP only.
- **Tooling**: look's `--rail-seed`, `npm run checkpoints`, playthrough `--from/--to` (`dev/look/segments.ts`); the
  `hud-glance` scenario and `src/boot/device-entry.ts` use the real `?from=`.

## Options

- **(a) Replace (recommended).** The server writes the stage's seed doc over the room's save through the restore path.
  Two proven paths, no op, no state; the resync is the late join. Swapping in process with sockets open was dropped:
  clients' prediction, request epochs and tick order assume a join.
- **(b) Simulate.** Honest but slow: the bot's full route is about 1,700 s of wall clock at 5x warp
  (`dev/look/playthrough.ts:9`), `deck-laid` needs `--wall 2700`, and it needs a browser per bot on the server. The
  same states build as seeds in 0.1 to 5.7 s ([playtest-jump-in](playtest-jump-in.md)). Rejected.
- **(c) Replay the seed's ops on the live world.** The builders assume an empty world: on a played one their ops are
  refused (bills filled, trees cut) and `need` throws. It needs a delta builder per stage. Rejected.

**What (a) does to the room and the people in it** (one line each, for the owner):
- Everything built, stocked or earned becomes the stage's: progress past the stage is lost, earlier progress is gained.
- The old save is backed up first, so the operator can put the room back.
- What anyone carries (logs, stone, rails, leg kit, a held beam) is gone; real players' account rows start again.
- Trains, their riders and loads, the cart and the wagon restart where the seed has them; someone riding is set down.
- The town economy (yards, towns, the strongbox's Boogles) becomes the seed's figures.
- Wardrobe finds stay: claims are personal and keyed by the room id, which does not change.
- Everyone present sees about a second of reconnecting, then lands at the stage's spot with one line of text.
- Players who are away find the room at the new stage when they return, with the same line once.

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
3. Forward-only against the record: 409 when the room's last recorded stage is later in `SEED_STAGES`. Going back is
   the operator's `npm run server -- restore <room>`. A room never advanced has no record, and the server cannot tell
   how far play took it, so the control always says "replaces this room's progress".
4. Do: `jumps.docFor(stage)` (exported), then `roomHost.offline`: admin's `keep(id, true)` (exported),
   `store.write(id, { tick, writerId: SERVER_ID, data, updatedAt: now })` (now, for the away credit), the record.
5. Record: `DATA_DIR/advances/<room>.json` `{ stage, at, build, backup, players }`, a line appended to
   `advances/log.jsonl`, and `cfg.log`. Not `jumps/`: the jump sweep deletes what it indexes. `GET /rooms/:id/host`
   gains `advanced: { stage, at }`.

**Client.** `src/netplay/room-seed.ts` gains `roomAdvanced()` (fetched on every room-ready, so a reconnect sees it).
New `src/features/fast-forward.ts`: when `advanced.at` is newer than `boogle.advance.seen.v1:<room>` it shows the
line, lands the player and stores `at`. The line (UI text, never The Boogler's): "This room was moved forward to
<label>. Everything here changed for everyone." `src/entities/railway/arrival.ts` exports `landAt(land)`: its jump
landing (surface check, 1.4 m aside), dropping the saved pose; with no `land` the saved pose stands. Playdata:
`src/proto/playdata/record.ts` adds `advanced` beside `seed`; `dev/playtest/summary.ts` prints it. A tab on an older
build reconnects and plays on with no line; no compatibility code.

**Control.** Dev dock → **Room** (`src/debug/dev/room.ts`): "Fast-forward this room", listing `JUMPS` rows after the
recorded stage, the count of other players, a key field (`sessionStorage`; never in a URL, invite or report) and the
typed room name. Agent API `boogle.dev.run('room', 'advance', { stage, confirm })`; CLI `npm run server -- advance
<room> <stage>`. No action id, pad slot, key, touch button or guide row (`freeSlots()` untouched). No URL flag: a link
that changes a room on load is a hazard.

**`?from=` and the bot.** Kept as test tooling, because bots and looks need isolation and a deterministic fresh start:
`SEED_STAGES`, the builders, `server/src/seeds/`, `POST /jump`, `?from=`, `--rail-seed`, `--from/--to`, `npm run
checkpoints`, and in jump rooms the "This room started at …" header, the arrival line and the three-day sweep.
Deleted: the Pause → More → Jump in row list and its copy; `docs/game-design/dev-menu.md`'s "Jump in" section becomes
"Fast-forward" plus a short "Test rooms" note. Renamed: nothing (`JUMPS` stays the stage catalog; it is a hotspot).

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
- [ ] **2. CLI.** `dev/server-admin.ts advance`, printing the backup and the restore command; `server/README.md`.
  Proof: against a local server, `npm run server -- rooms` shows the new tick.
- [ ] **3. Line, landing, playdata.** The Client paragraph's files. Proof: `dev/peer-test/ws-railway.ts` gains
  "advance: both peers rejoin and their mirrored hashes equal the seed's"; a `/look` still of the line.
- [ ] **4. Dev Room control; delete the Jump in list.** `src/debug/dev/room.ts`, `src/features/jump-in.ts`,
  `docs/game-design/dev-menu.md`. Proof: a `/look` still; the API with no key returns the refusal, nothing changes.
- [ ] **Checkpoint** (after 4): `npm run check:full`, `npm run checkpoints`, step 3's peer test, and on staging a
  wrong key against `boogle` answers 401.

## Level findings

Nothing is placed, so `npm run level-check` was not run. Landings are `JUMPS`' existing `land` values, each checked
with a still for a first arrival; landing people who were elsewhere is new (designer call 2).

## Risks

- **Room safety**: "Save or serve unverified state": the doc passes `okDoc` and the host's all-or-nothing load, as
  restore's does. A server file importing new shared code needs the three image lists (`test/server-image.test.ts`).
- **Unverified**: that a client holding a higher tick rejoins cleanly onto the seed's lower tick. Restore has the same
  shape; steps 1 and 3 test it.
- **The key in a browser**: hence a separate `ADVANCE_KEY` that does nothing else. **Backups**: `.backups` keeps the
  newest 30 across all rooms, so an advance's backup ages out.
- **In flight**: `greybox/leg1-step5` edits `railway-seeds.ts`, `railway-jump.ts` and `world-host.ts` (its `gorge-*`
  stages become targets with no work here). `npm run inflight` named no other branch on these files.
- **Performance**: no meshes, lights or tick work; an advance is one file write and a room reload.

## Designer calls

1. The line's wording, and the Room group's labels and its warning for `boogle`.
2. Landing: everyone at the stage's spot (recommended: the ground changes under saved poses) or only the asker.
3. `?from=` stays linkable for people (recommended, undocumented) or becomes harness-only.
4. The list offers `JUMPS` rows (recommended: production prebuilds only those) or every `SEED_STAGES` entry.

## Owner questions

1. **Who may fast-forward, and which rooms?** Recommended: only a holder of the dev key, in any room including the
   shared `boogle` island, behind the typed confirmation and the automatic backup. Alternative: never the shared
   island (the 9 November rule as written); he plays in a named room.
2. **Does it move everyone without asking?** Recommended: yes, showing him the count of others first; they get the one
   line. Alternative: refused while anyone else is in the room.
3. **Is going back allowed?** Recommended: not in the game; only by restoring the backup from the command line.
   Alternative: any stage may be picked, earlier ones included.
