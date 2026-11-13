> **Status: planned (2026-11-12).** Base `origin/main` at `add1b4264` (`WORLD_NS` v32). Step 0 is separable and first.
> No `WORLD_NS` bump, no new wire op, no new lockstep op. Not built, not run: every claim below is from reading main.

# Room fast-forward

**What the live room can do today (main, v32).** The shared `boogle` room can already build greybox leg 1 past the
rivet. There is no "closed" bit: `Route` is `{ grants, gates, arrived }` (`src/sim/railway-components.ts:348`), and a
leg opens by `legReached` = `legBuilt(k)` and, for leg 0, `Aperture.joined >= 0`
(`src/sim/railway-queries-route.ts:38-41`; `legBuilt`, `src/sim/railway-lines.ts:578`; leg 0 `stack` is the only built
leg). The server accepts `rail.legStock` (`src/world/railway-server.ts:133`) and the view is on main
(`src/entities/route-greybox/leg-view.ts`). The "closed in the shared room, open in jump-in rooms" bit of
[greybox-route](greybox-route.md) (line 961) was never built (its line 1136 says so). So the owner can playtest leg 1
in the live room without a jump room, but only once that room has struck the rivet, which is hours of play: that is
what fast-forward is for.

## Goal

The owner moves the room he is in to a named stage, on the server, for everyone in it. Owner, 12 November: "In
general, I'm not a fan of the jump-in rooms as separate rooms. We should just have a live game and then we should maybe
have a mechanism to fast-forward progress for testing in the game to move the server in the same room". Serves **How we
work: playtest constantly**, **8. Enjoyable alone and together** (friends are already in the room) and **Clear
authority** (the server decides and does it). It bends **9. Leave something for the next visitor** and the 2026-11-09
decision "playtest jump-ins (a requirement)" (`docs/decisions-process.md:107`: "The shared `boogle` world and its saves
are never touched"): see Safety and owner question 1.

**Research.** [dev-menu-plan](../research/dev-menu-plan.md): uses Source's `sv_cheats` (the authority that executes
enforces the gate), Caves of Qud (exact ids, bounded choices, a confirmation for a destructive command) and Factorio
(no second simulation: the seed is the real rules' output). Departs from "Keep cheats in disposable tests", on the
owner's word above. [playtest-telemetry](../research/playtest-telemetry.md): one new session field.

## What exists

- **Building a seed** is from nothing only: `buildSeedWorld(stage)` (`src/sim/railway-seeds.ts:95`) starts at
  `createRailway()` and drives sessions `a` and `b` through accepted ops, asserting exact counts (`need`). 44 stages.
- **Applying a seed** is a whole-world replace, never a merge: `server/src/seeds/build.ts:29` loads the snapshot into a
  host (`world().load(json, railwayCheck)`, all or nothing) and saves it as a room doc `{ tick, data }`. Production
  serves prebuilt docs for `OFFERED_STAGES` only (`server/src/seeds/prebuild.ts`, `JUMP_BUILD=prebuilt`).
- **Jump-ins**: `POST /jump` (`server/src/jump.ts`) names a new room `<stage>-<6 chars>`, writes the doc
  `store.create` and a sidecar `DATA_DIR/jumps/<room>.json`; `seedRoom` refuses a loaded room or one with a save. The
  client: `?from=` (`src/boot/jump-in.ts`), Pause → More → Jump in (`src/features/jump-in.ts`), the landing
  (`src/entities/railway/arrival.ts:86-92`), `seed` on `GET /rooms/:id/host` (`src/netplay/room-seed.ts`).
- **Replacing a live room's save already exists**: `POST /admin/rooms/:id/restore` (`server/src/admin.ts`) backs the
  save up, takes the room offline (`roomHost.offline`, `server/src/host/rooms.ts:213`: everyone gets `bye`, reconnects
  in 0.5 to 1.5 s and takes the snapshot as a late join) and writes a doc. Bearer `REPORT_TOKEN`, HTTP only.
- **Tooling**: look's `--rail-seed`, `npm run checkpoints`, playthrough `--from/--to` (`dev/look/segments.ts`), and the
  `hud-glance` and arrival scenarios and `src/boot/device-entry.ts`, which use the real `?from=`.

## Options

| | What it is | Verdict |
| --- | --- | --- |
| (a) Replace | The server writes the stage's seed doc over the room's save through the restore path | **Recommended** |
| (b) Simulate | Tick the room faster with scripted inputs | Honest but slow: the bot's full route is about 1,700 s of wall clock at 5x warp (`dev/look/playthrough.ts:9`), `deck-laid` needs `--wall 2700`, and it needs a browser per bot on the server. The same states build in 0.1 to 5.7 s as seeds. Rejected |
| (c) Replay ops | Run the seed's ops on the live world | The builders assume an empty world; on a played one their ops are refused (bills filled, trees cut) and `need` throws. Needs a delta builder per stage. Rejected |

(a) reuses two proven paths (the seed doc and admin restore), adds no op and no state, and its resync is the late join.
An in-process swap that keeps sockets open was considered and dropped: clients' prediction, request epochs and tick
order assume a join.

**What (a) does to what is in the room** (for the owner, one line each):
- Everything built, stocked or earned in the room becomes the stage's: progress past the stage is lost, less is gained.
- The old save is kept as a backup first, so the room can be put back (operator restore).
- What anyone carries (logs, stone, rails, leg kit, a held beam) is gone: account rows are the seed's, real players
  start new ones on their next action.
- Trains, their riders and loads, the cart and the wagon restart where the seed has them; someone riding is set down.
- The town economy (yards, towns, the strongbox's Boogles) becomes the seed's figures.
- Wardrobe finds stay: claims are personal and keyed by the room id, which does not change.
- Everyone sees a reconnect of about a second, then lands at the stage's spot with one line of text.
- Players who are away find the room at the new stage when they return, with the same line once.

## Design

**Sync kinds.** The world change is the railway's **Server** kind through its save: no lockstep op, no `rules/types.ts`
entry, no `edits` or `invariants`, no `env` fact. The record of an advance is room metadata over HTTP (`advanced` on
`GET /rooms/:id/host`), as `seed` is. The line of text, the landing and the Dev control are **Local**. Authority: the
server alone; a client only asks over HTTPS with the key.

**Server.** New `server/src/advance.ts`, `addAdvance(app, cfg, { store, roomHost, jumps, keep, limit })`:
`POST /admin/rooms/:id/advance` with body `{ stage, confirm }`.
1. 404 unless `ADVANCE_KEY` (a new Fly secret, 32+ characters) is set; 401 unless `Authorization: Bearer` equals it or
   `REPORT_TOKEN` (`crypto.timingSafeEqual`, as `server.ts:324`); the rate limiter runs before the comparison.
2. 400 for a room id that is not a current railway id, or a stage that fails `isSeedStage`; 503 `stage not built` as
   `/jump`. 409 unless `confirm` equals the room's plain name (a typed confirmation; for `boogle` the control spells
   out that it is the shared island).
3. Forward-only against the record: 409 when the room's last recorded stage is later in `SEED_STAGES`. Going back is
   the operator's `npm run server -- restore <room>` of the backup, never a stage pick. A room never advanced has no
   record, so the server cannot tell how far play took it: the control says "replaces this room's progress".
4. `jumps.docFor(stage)` (exported from `addJump`), then `roomHost.offline(id, …)`: `keep(id, true)` (admin's backup,
   exported), `store.write(id, { tick, writerId: SERVER_ID, data, updatedAt: now })` (now, for the away credit, as
   `jump.ts`), then the record. 409 `busy` when the room is closing.
5. The record: `DATA_DIR/advances/<room>.json` `{ stage, at, build, backup, players }` (the latest) and one appended
   line in `DATA_DIR/advances/log.jsonl`, plus `cfg.log`. It is a separate directory from `jumps/` so the jump sweep,
   which deletes idle jump rooms, can never index an advanced room. `GET /rooms/:id/host` gains
   `advanced: { stage, at }`.

Not reachable by a room message: nothing is added to `RAIL_ACTIONS`, the ws wire or the room interface.

**Client.** `src/netplay/room-seed.ts` gains `roomAdvanced()` (not memoized; fetched on every room-ready, so a
reconnect sees it). `src/features/fast-forward.ts` (new, Local): when `advanced.at` is newer than
`boogle.advance.seen.v1:<room>`, it shows the line, calls the arrival's landing, and stores `at`. The line (UI text,
not The Boogler's; the designer words it): "This room was moved forward to <label>. Everything here changed for
everyone." Landing: `src/entities/railway/arrival.ts` exports `landAt(land)` (its existing jump landing, with the
surface check and the 1.4 m step aside) and drops the saved pose; without a `land` the saved pose stands.
Playdata: `src/proto/playdata/record.ts` adds `advanced` beside `seed`; `dev/playtest/summary.ts` prints
"Fast-forwarded to "<label>"".

**Control.** Dev dock → **Room** tab (`src/debug/dev/room.ts`): a "Fast-forward this room" group listing `JUMPS` rows
after the room's recorded stage, the count of other players, a key field (kept in `sessionStorage` on that device,
never in a URL, an invite or a report) and the typed room name. Agent API: `boogle.dev.run('room', 'advance',
{ stage, confirm })`. CLI: `npm run server -- advance <room> <stage>` (`dev/server-admin.ts`). No action id, pad slot,
key, touch button or guide row: Dev DOM only (`freeSlots()` untouched). No URL flag: a link that mutates a room on load
is what this plan avoids.

**`?from=` and the bot.** Keep, as test tooling: `SEED_STAGES`, the builders, `server/src/seeds/`, `POST /jump`,
`?from=` (the scenarios and device tests need an isolated room on the real server), `--rail-seed`, `--from/--to`,
`npm run checkpoints`. Bots and looks need isolation and a fresh deterministic start; a shared live room gives neither.
Delete: the Pause → More → Jump in row list and its "opens a new private room" copy (the Dev Room group replaces it);
`docs/game-design/dev-menu.md`'s "Jump in" becomes "Fast-forward" with a short "Test rooms" note. Keep in jump rooms:
the "This room started at …" header, the arrival line and the three-day sweep. Rename nothing (`JUMPS` stays the stage
catalog with labels and landings; `railway-jump.ts` is a hotspot).

## Steps

- [ ] **0. Pin that the route is open in the shared room** (separable; build first). Decided, relayed by the
  orchestrator and not yet in `docs/decisions-rail.md`: owner, 12 November, "Yes, I think it should. In general, we
  should consider this like a live service game …", corrected by him to "we shouldn't consider this like a liver
  service game*"; the decision stands either way (the route opens in the shared live room; development happens on the
  live game). No rule changes: nothing closes it on main. Add to `test/railway-route-rules.test.ts`: "the route has no
  closed bit: any room at the rivet has leg 0 open" (`buildSeedWorld('ring-joined')`: `legOpen(w, 0)`, `rail.legStock`
  accepted for a carrier, `Route`'s fields exactly `grants, gates, arrived`), and to
  `server/test/railway-ring-host.test.ts`: a host for `railwayRoomId('boogle')` loaded from the `ring-joined` doc
  accepts `rail.legStock`. Record the decision (both quotes) in `docs/decisions-rail.md`, strike greybox-route line
  961's "closed in the shared room". **No bump**: no shape changes, so it neither needs v34 nor conflicts with v33 or
  v34; it can land before or after them. What a live room at the rivet sees on load: leg 0's frame and rack at the
  stack line's first section, open at once, the fleet's opening kit loading from the rivet (gate 5). A room riveted
  before v32 does not exist: v32 reset every world. Proof: the two tests; `npm run loop -- node` for the rivet beat.
- [ ] **1. Server endpoint.** `server/src/advance.ts`, wiring in `server/src/server.ts` (`ADVANCE_KEY`,
  `advanceRatePerMin`, default 6), `docFor` exported from `jump.ts`, `keep` from `admin.ts`, `advanced` on the host
  status. `server/test/advance.test.ts`: no key set → 404; no or wrong bearer → 401 and the save's bytes unchanged and
  no `bye` sent; unknown stage 400; old-namespace id 400; wrong `confirm` 409; earlier stage 409; busy 409; over the
  rate 429; success → backup exists, the doc equals the seed's, `updatedAt` is now, the record and log line exist, a
  connected test peer got `bye` and its rejoin snapshot hashes to the seed; a jump sweep leaves the room. In
  `server/test/malformed-messages.test.ts`: a room message `{ op: 'rail.advance', stage }` and one with `t: 'advance'`
  are refused and the world hash is unchanged; `RAIL_ACTIONS` holds no advance op.
- [ ] **2. CLI.** `dev/server-admin.ts advance <room> <stage>` (sends `confirm` itself; prints the backup's name and
  the restore command), `server/README.md` "Operator tools". Proof: against a local server, `rooms` shows the new tick.
- [ ] **3. Client line, landing, playdata.** `roomAdvanced()`, `src/features/fast-forward.ts`, `landAt`,
  `record.ts`, `summary.ts`. Proof: `dev/peer-test/ws-railway.ts` gains "advance: both peers rejoin and their mirrored
  hashes equal the seed's"; a `/look` still of the line after a local advance to `hook-earned`.
- [ ] **4. Dev Room control**, and delete the Jump in row list. `src/debug/dev/room.ts`, `src/features/jump-in.ts`,
  `docs/game-design/dev-menu.md`. Proof: a `/look` still of the group; `boogle.dev.run('room', 'advance', …)` without
  a key returns the refusal and changes nothing.
- [ ] **Checkpoint** (after 4): `npm run check:full`; two peers in one local room advanced to `ring-joined`
  both land, hashes agree (the step 3 peer test); `npm run checkpoints`; on staging, a wrong key against `boogle` answers 401.

## Level findings

Nothing is placed. Landings are `JUMPS`' existing `land` values, each already checked with a still for a first
arrival; `npm run level-check` was not run. New here: landing players who were elsewhere, with friends on the spot;
step 3's still covers one case, the designer rules on the rest (call 2).

## Risks

- **Room safety**: "Save or serve unverified state" (the doc goes through `okDoc` and the host's all-or-nothing load,
  as restore does); a new server file importing shared code needs the three image lists (`test/server-image.test.ts`).
- **Mixed builds**: none added. The doc is built by the serving image for its own `RAILWAY_PLAY_NS` (the manifest's
  `ns` check); a tab without step 3 reconnects and plays on, with no line. No compatibility code.
- **The key in a browser**: hence a separate `ADVANCE_KEY` that can do nothing else, in `sessionStorage`.
- **Backups**: `.backups` keeps the newest 30 across all rooms, so an advance's backup can age out.
- **Unverified**: that a client holding a higher tick for the room rejoins cleanly onto the seed's lower tick. Restore
  has the same shape; step 1's rejoin test and step 3's peer test are where it shows.
- **Hotspots / in flight**: `greybox/leg1-step5` edits `src/sim/railway-seeds.ts`, `src/world/railway-jump.ts` and
  `server/src/host/world-host.ts` (adds `gorge-*` stages and two rows: they become fast-forward targets with no work
  here); `spacing/six-hold` (v34) touches the host tests. `npm run inflight` showed no other branch on these files.
- **Performance**: no meshes, lights or tick work. An advance is one file write and a room reload.

## Designer calls

1. The line's wording, and the Room group's labels and warning for `boogle`.
2. Landing: everyone lands at the stage's spot (recommended, since ground changes under saved poses) or only the asker.
3. Whether `?from=` stays linkable for people or becomes harness-only (recommended: stays, undocumented for players).
4. Whether the list offers every `SEED_STAGES` entry or only `JUMPS` rows (recommended: `JUMPS`, as production
   prebuilds only those).

## Owner questions

1. **Who may fast-forward, and which rooms?** Recommended: only someone holding the dev key, in any room including the
   shared `boogle` island, behind the typed confirmation and an automatic backup. Alternative: never the shared island
   (the 9 November rule stands as written), and he plays in a named room.
2. **Does it move everyone without asking?** Recommended: yes, with the count of others shown before he confirms; they
   get the one line. Alternative: refuse while anyone else is in the room.
3. **Is going back allowed?** Recommended: not in the game; only by restoring the backup from the command line.
   Alternative: any stage may be picked, earlier ones included.
