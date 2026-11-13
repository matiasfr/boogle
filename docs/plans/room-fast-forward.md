> **Status: server implementation, 2026-11-13; client work pending.** The original plan below was based on
> `origin/main` at `5b42057ad` (`WORLD_NS` v32). The [server implementation](#server-implementation-13-november)
> adapts it to v40. No `WORLD_NS` bump; one server-to-client wire message (`replacing`). Original design claims
> below are historical; the implementation section distinguishes the current scope and outstanding client work.
>
> **Amendments (13 November)**, from [dev-saves-and-stage-jumps](../research/dev-saves-and-stage-jumps.md)
> (recommendations 1 to 6), the designer's three changes and three owner calls:
> 1. The operation and control are **Replace room with stage**; the lost-state categories are listed before it runs.
> 2. A replacement is a new birth: everything personal to the room resets. "Wardrobe finds stay" is dropped (owner, 13
>    November UTC: "Yeah, wardrobe fine stay doesn't need to be a rule Especially if it's in the way of a good system";
>    "fine" is his typo for "finds").
> 3. Recovery: the target is validated in a throwaway host, the room closes with its last verified checkpoint saved,
>    the backup is pinned, the three writes have a stated failure recovery, and the restore command is recorded.
> 4. People: a broadcast and a 10 s countdown; refused by default while others are present, with an explicit override.
> 5. `ADVANCE_KEY` only (not `REPORT_TOKEN`); the shared island is refused unless `ADVANCE_SHARED` is on.
> 6. The Jump in list stays until the owner has replaced a room himself; a "New empty room" row stays after it.
> 7. The checkpoint proves replacement and restore together with two peers; the steps are re-split by kind and ordered.
> 8. A reset or a session online is never a reason to wait here (owner-calls, "Save resets never block development or
>    architecture"; the mid-session hold is retired).

# Replace room with stage (room fast-forward)

**What the live room can do today (main, v32).** The shared `boogle` room can already build greybox leg 1 past the
rivet: there is no "closed" bit. `Route` is `{ grants, gates, arrived }` (`src/sim/railway-components.ts:348`); leg 0
opens by `legBuilt(0)` and `Aperture.joined >= 0` (`src/sim/railway-queries-route.ts:38-41`); the server accepts
`rail.legStock` (`src/world/railway-server.ts:133`). Reaching the rivet takes hours of play: this plan closes that gap.

## Goal

The owner replaces the room he is in with a named stage, on the server, for everyone in it. Owner, 13 November UTC:
"In general, I'm not a fan of the jump-in rooms as separate rooms. We should just have a live game and then we should
maybe have a mechanism to fast-forward progress for testing in the game to move the server in the same room". Serves
**How we work: playtest constantly**, **8. Enjoyable alone and together** and **Clear authority**; bends **9. Leave
something for the next visitor** and 9 November's "The shared `boogle` world and its saves are never touched": the
shared save is protected by `ADVANCE_SHARED` being off until he answers owner question 1.
**Research.** [dev-saves-and-stage-jumps](../research/dev-saves-and-stage-jumps.md), adopted except as listed under
"Not adopted"; [dev-menu-plan](../research/dev-menu-plan.md) (the executing authority enforces the gate; exact ids).

## What exists, and the options

- **Options.** (a) **Replace** (recommended): the server writes the stage's seed doc over the room's save; no op, no
  world state. (b) Simulate: about 1,700 s of wall clock at 5x for the bot's full route against 0.1 to 5.7 s for a
  seed; rejected. (c) Replay the seed's ops on the live world: the builders assume an empty world; rejected.
- **Seeds** are built from nothing only (`buildSeedWorld`, `src/sim/railway-seeds.ts:95`) and applied as a whole-world
  replace, never a merge (`server/src/seeds/build.ts:29`: the snapshot loads into a real host through `railwayCheck`
  and is saved as a room doc). `POST /jump` (`server/src/jump.ts`) puts a doc in a new room only.
- **Admin restore** (`server/src/admin.ts`, bearer `REPORT_TOKEN`) refuses an occupied room without `force=1`, then
  `roomHost.offline` (`server/src/host/rooms.ts:213`) closes the room **unsaved**, `keep` **moves** the save into
  `.backups/` (the newest 30 across all rooms survive) and `store.write` puts the doc in place.
- **`born`** (`server/src/store.ts:13,35-45`): a save's birth id, sent in `welcome`. Moving the file and
  `store.forget` make the next write stamp a new one; a restore brings the backup's own id back.
- **The browser** (`src/features/room-reset.ts`): when `born` differs from the one it last joined in that room it
  reloads, and `src/boot/world-reset.ts` runs `resetForRoom` (`src/player/world-reset.ts:127`): the room's seen state,
  saved pose, wardrobe, town and finds keys, the visit marker and `boogle.boogler` (The Boogler's memory, a global key)
  go, its reward claims are pruned, and the load is a first visit (the fall and the card). A first sight is no reset.

## What a replacement loses (shown in the control and printed by the CLI before it runs)

1. **The world**: everything built, stocked or earned, the trains, cart, wagon and town economy become the stage's.
   Progress past the stage is lost: "forward" is checked against the last record, never against play.
2. **What is carried**: everything on anyone's back, and every account row.
3. **Personal to this room, in each browser that was here**: wardrobe and finds (their claims pruned), the saved
   pose, seen state, the visit marker, and The Boogler's memory of the player. Nothing puts these back.
4. **On an operator restore**: the old world returns with its old `born`. Browsers that joined the replaced world
   reset again; browsers that never joined it keep everything. Play after the replacement is discarded.

**The rule: a replacement is a new birth.** It reuses the reset an operator reset already causes; nothing is kept by
special case. The Boogler's copy is not edited: his forgetting is today's reset behaviour.

## Design

**Sync kinds.** The world change is the railway's **Server** kind, through its save: no lockstep op, no
`rules/types.ts` entry, no `edits`, `invariants` or `env`. The record is room metadata over HTTP. The notice, line,
landing and Dev control are **Local**. The countdown is a **one-off event** from the server, a new message
`{ t: 'replacing', label, seconds }` (`src/net/ws-wire.ts`; `room.onReplacing` in `src/net/ws-room.ts`): a new, unique
type for the registry; additive for mixed builds (a tab without it still reconnects); no bump; a client cannot send it.

**Server**: `server/src/replace.ts`, `POST /admin/rooms/:id/replace`, body `{ stage, confirm, override? }`.
1. **Who.** 404 unless `ADVANCE_KEY` is set; 401 unless the bearer equals it (`crypto.timingSafeEqual`), rate-limited
   first; `REPORT_TOKEN` is not accepted. Never an account (a pid is client-chosen), never a room message.
2. **Which room.** 400 for an id that is not a current railway room; 403 for `railwayRoomId('boogle')` unless
   `ADVANCE_SHARED=1`; 409 unless `confirm` equals the room's plain name.
3. **Which stage.** 400 unless `isSeedStage`; 503 `stage not built`; 409 when the room's last recorded stage is later
   in `SEED_STAGES` (the default until owner question 2); 409 `busy` while a replacement of that room is pending.
4. **People.** 409 `{ players }` when anyone else is present, unless `override` is true.
5. **Validate first.** `validateSeedDoc(doc)` in a worker (`server/src/seeds/validate.ts`): a throwaway store and
   `createRailwayWorldHost` load the doc and read back its tick and hash. A failure is 422: nothing was touched or told.
6. **Tell, then count.** Broadcast `replacing` (10 s; none when the room is empty), wait, then:
7. **Stop and save.** `roomHost.offline(id, fn, { save: true })` (a new option): joins are refused and the room closes
   **with** its last verified checkpoint saved. A close that fails or is fenced aborts with 500: nothing is replaced
   and the room reopens. Edits in flight after the close are dropped, as on any disconnect.
8. **Three writes under `store.withLock(id)`**, in order, after a journal `replacements/<room>.pending.json`
   `{ stage, backup, bornBefore, at, build, ns }`:
   a. **Backup, copied not moved**, to `.backups/pinned/<room>@<stamp>.json`, read back and parsed. Pinned backups
      are outside the newest-30 rule until `npm run server -- release <backup>`. On failure the save is intact; 500.
   b. **Save**: `store.replace(id, doc)` (new: temp file and rename over the save, stamping a new `born`). The room
      always has a whole save: the old one before the rename, the new one after.
   c. **Record**: `replacements/<room>.json` `{ stage, at, build, ns, born, bornBefore, backup, players, docHash,
      restore }` (`restore` is the exact command), a line in `replacements/log.jsonl`, `cfg.log`; the journal goes.
   **Recovery** (at boot and before any replacement): a journal whose `bornBefore` equals the save's `born` means (b)
   never landed, so the journal is deleted and the pin kept; otherwise the record is completed from the journal.
9. `GET /rooms/:id/host` gains `replaced: { stage, at, born }`. Not `jumps/`: its sweep deletes what it indexes.
10. **Restore** (`POST /admin/rooms/:id/restore`) also finds pins, saves before closing as in 7 and logs its own line.
    A backup's room id carries its namespace, so one from another `WORLD_NS` is refused as today.

**Client.** The countdown shows through the notification lane. After the close each browser that was in the room
reconnects, sees the new `born`, reloads and resets (existing code). On that reset load, when `replaced.born` is the
room's `born`: the fall is skipped (`src/features/fall.ts`, as for jump rooms), the player lands at the row's `land`
(`src/entities/railway/arrival.ts`: surface check, 1.4 m aside) and the line shows once. A row with no `land` uses
the usual spawn. A browser never in the room gets the normal arrival and no line: `roomReborn` is false for it, so no
new "seen" key is needed. Playdata: `src/proto/playdata/record.ts` adds `replaced` beside `seed`.

**Words** (UI text, never The Boogler's: the designer's of 12 November, reworded for amendments 1 and 2; call 1).
- Countdown: "This room will be replaced with <label> in 10 seconds. What you carry and your finds here will be lost."
- Line: "The shared island was replaced with <label> for testing. The world changed for everyone, and what you carried
  and found here is gone." (a private room: "This room was replaced…").
- Control: group "Replace room with stage"; button "Replace this room with <label>"; the four categories; "N others
  are here now" with a checkbox "Replace it under them"; on `boogle`, "This is the shared island. Everyone who plays
  here gets this world."

**Control.** Dev dock → **Room** (`src/debug/dev/room.ts`): `JUMPS` rows, the warning, the typed room name, the key
field (`sessionStorage`; never in a URL, invite or report) and a "New empty room" row that replaces nothing. Also
`boogle.dev.run('room', 'replace', { stage, confirm, override })` and `npm run server -- replace <room> <stage>
[--override]`. No action id, pad slot, key, touch button, guide row or URL flag.

**`?from=` and the bot.** Kept as test tooling (bots and looks need isolation and a deterministic fresh start):
`SEED_STAGES`, the builders, `server/src/seeds/`, `POST /jump`, `?from=` (in no menu or player-facing doc, no new rows
for people), `--rail-seed`, `--from/--to`, `npm run checkpoints`. The Jump in list: step 7.

## Steps

Order: 0 at any time; server 1, 2, 3, 4; client 5 after 3, 6 after 2 and 5; the checkpoint; 7 last. Each is one
sitting and leaves `node dev/ship-check.ts` green. 1 to 3 are high-risk server work (`server/AGENTS.md`).

- [x] **0. Pin that the route is open in the shared room** (tests; the decision is
  [recorded](../decisions-rail.md#d-2026-11-13-greybox-route-open-in-the-shared-room)). `test/railway-route-rules.test.ts`:
  "no closed bit: any room at the rivet has leg 0 open" (`buildSeedWorld('ring-joined')`: `legOpen(w, 0)`, `rail.legStock`
  accepted, `Route`'s fields exactly those three); `server/test/railway-ring-host.test.ts`: a `boogle` host loaded
  from that doc accepts `rail.legStock`. No bump.
- [x] **1. Recovery primitives** (server, high-risk). `store.replace`; `offline`'s `{ save: true }`; pinned backups,
  `release`, restore from a pin; the journal and its recovery; a seam `replaceFailAt: 'backup' | 'save' | 'record'`.
  `server/test/replace-recovery.test.ts`: each failure point leaves a whole, loadable save and the stated files; a pin
  survives 31 later backups; a failed close replaces nothing; `born` changes on replace and returns on restore.
- [x] **2. The endpoint** (server, high-risk). `server/src/replace.ts`, `server/src/seeds/validate.ts`,
  `server/src/server.ts` (`ADVANCE_KEY`, `ADVANCE_SHARED`, `replaceRatePerMin` 6), `replaced` on the host status.
  `server/test/replace.test.ts`: key unset 404; no bearer, a wrong one and `REPORT_TOKEN` 401 with the save's bytes
  unchanged; shared island 403, and 200 with `ADVANCE_SHARED`; unknown stage 400; wrong `confirm` 409; earlier stage
  409; occupied 409 with the count, 200 with `override`; an invalid target 422, room untouched; over the rate 429;
  success: the save equals the seed and the record names its restore command. `malformed-messages.test.ts`:
  `{ op: 'rail.replace' }`, `{ t: 'replace' }` and a client-sent `{ t: 'replacing' }` change nothing.
- [x] **3. Countdown and the wire message** (server and net, high-risk). `hosted-room.ts`, `ws-wire.ts`, `ws-room.ts`,
  `src/net/README.md`. Tests: every peer gets `replacing` before `bye`; a second request during the countdown is 409;
  a peer joining mid-countdown is told. `dev/peer-test/ws-railway.ts`: "replace: both peers are told, rejoin, and
  their mirrored hashes equal the seed's".
- [x] **4. CLI** (tooling). `dev/server-admin.ts`: `replace` (prints the four categories and the count, asks for the
  room name, prints the pin and the restore command), `release`, pins in `rooms`; `server/README.md`.
- [ ] **5. Notice, line, landing, playdata** (client view). The Client paragraph's files and `dev/playtest/summary.ts`.
  Proof: `/look` stills of the countdown and of the line after a local replacement; a no-`land` row at the spawn.
- [ ] **6. Dev → Room control** (client view). `src/debug/dev/room.ts`, `docs/game-design/dev-menu.md` (adds "Replace
  room with stage"; "Jump in" stays). Proof: a `/look` still; the API with no key is refused and changes nothing.
- [ ] **Checkpoint: replacement and restore together** (`npm run check:full`, `npm run checkpoints`, and one two-peer
  run kept as evidence with the pre-change, seed and restored hashes). A played room at a higher tick is replaced by a
  seed at a lower tick and both peers agree; a player who was away returns, resets, lands and reads the line; edits in
  flight at the close corrupt nothing; a duplicate is refused; an invalid target changes nothing; a failure injected
  after the backup leaves the old room playable; then the operator restores the pin, both peers agree on the old
  world, and the personal state is as category 4 says.
- [ ] **7. Remove the Jump in rows** (client view), once the owner has replaced a room himself: `src/features/jump-in.ts`
  keeps the jump rooms' header; "New empty room" stays in Dev → Room.

## Level findings and risks

- **Level findings**: nothing is placed, so `npm run level-check` was not run; landings are `JUMPS`' probed `land`s.
- **Room safety**: "Save or serve unverified state" is why 7 saves through the room's own close and aborts if it fails.
- **Unverified until built**: that a close with `save: true` under `offline` persists the last verified checkpoint of
  a paused or empty room; that a tab at a higher tick rejoins onto a lower one; that `ws-room.ts` ignores an unknown `t`.
- **Image and disk**: `validate.ts` needs the three image lists (`test/server-image.test.ts`); pins grow until released.
- **In flight**: `greybox/leg1-step5` (`gorge-*` rows become targets with no work here). **Performance**: none.

## Not adopted from the research

- **"No namespace bump mid-session"** (1): retired by the owner on 13 November; nothing here waits on a session.
- **"Export a copy beyond the live volume"** (2): the pin already takes the backup out of pruning; a download of world
  saves is a second endpoint to guard for a development tool. Revisit with public playtests.
- **"Agree once" for a session** (3): a habit, not a mechanism. **Snapshot identity in reports** (5): the record only.

## Design review (designer, 2026-11-12), as amended

Cleared to build in the order above. The designer's three changes are in: a first-time visitor gets the normal
arrival and no line; no `land` means the usual spawn; the control builds now and the Jump in rows go later. Calls that
stand: `JUMPS` rows only; `?from=` ungated and in no menu; a fresh start one tap away; the typed name, the count, the
key in `sessionStorage`. Replaced by the amendments: "wardrobe finds stay", "moves everyone after showing the count",
`REPORT_TOKEN` accepted, the wording. **Suspect copy:** none of The Boogler's is touched. **New designer calls:** the
three texts; whether the welcome card shows on the reset load (default: no); the countdown's length (10 s).

## Owner questions

1. **Who may replace a room, and may the shared island be replaced?** Answered by the owner, 13 November: the dev
   key holder only, any room including the shared island, behind the typed name, countdown and pinned backup.
   `ADVANCE_SHARED` may be enabled in production behind `ADVANCE_KEY`; its default stays off.
2. **Going back?** Recommended: not in the game; the operator restores the pinned backup. Or: any stage may be picked.

## Server implementation, 13 November

The server implementation targets the current v40 server-owned host. The classic lockstep transport described
in older sections is deleted; replacement uses the current checkpoint/load/hash and fatal-status guards, and
clients reconnect onto complete server-owned mirrors. It introduces no gameplay op, client authority or seat
change. No `WORLD_NS` bump is required: the persisted game/checkpoint shape and seed recipes are unchanged;
replacement records and pending journals are operator metadata outside the world document.

The existing `SEED_STAGES` builders, including `railway-seed-legs.ts`, supply the targets. The endpoint and CLI
use only `ADVANCE_KEY`; `REPORT_TOKEN` remains the separate operator restore/release credential. Any occupied
room requires explicit override because an HTTP key holder cannot authenticate a matching in-room identity.
The ordering rule compares the last replacement record, not natural progression. Interrupted countdowns are
cancelled rather than resumed after restart; only a save-write journal needs recovery.

The server exposes `replaced` status and the room countdown/text hook. Client notification rendering, reset
landing, line display, playdata and the Dev dock control remain for the client job. The full visual checkpoint
and removal of Jump in rows remain open; no server test establishes those client outcomes.

**Suspect placeholder copy for the owner**, preserved exactly from this plan:
"This room will be replaced with <label> in 10 seconds. What you carry and your finds here will be lost."
The later line is also pending client review: "The shared island was replaced with <label> for testing. The world
changed for everyone, and what you carried and found here is gone." (Private room: "This room was replaced…".)
The Boogler's copy is unchanged.

### Verification and handoff, 13 November

Server steps 0–4 and the notice text hooks are built. The full client checkpoint above remains open.
The endpoint contract, exact recovery command and local curl invocation are in
[server/README.md](../../server/README.md#operator-tools). Replaced jump rooms are removed from jump expiry,
including after journal recovery. Fresh rooms get an initial verified checkpoint to pin. Fatal/failed closes
refuse replacement and restore; shutdown checkpoints other rooms without waiting for seed preparation.
Hostile-message coverage lives in `server/test/replace-wire.test.ts` rather than `malformed-messages.test.ts`.

Checks on implementation tip `d89b4107` (rebased on already-fetched `859abbe7`, no authored prefab changes):

- `npm run check`: pass, 1,798 unit tests and one existing train-wait TODO; lint, typecheck, registry, level/assets and build pass.
- `npm --prefix server test`: 253 pass. The rebase changed no server, sim, world or net runtime files.
- `npm run test:net` directly: 152/152 pass. Both peers receive notices before replacement disconnects, observe
  the same new birth, reload to a lower seed tick, agree, then restore the pin and original birth/world hash.
  Final trace: before tick 2322/hash 2093773740, seed tick 1715/hash 4123723040, restored tick 2369/hash 2093773740.
  The bare net page reproduces production's birth-triggered reload explicitly; it installs no game features.
  Its loopback upgrade budget matches its existing load fixture so repeated reloads do not consume production's
  per-IP admission budget. Production limits are unchanged.
- `npm run checkpoints`: all 25 routed/offered seeds build through the host save path.
- `node dev/ship-check.ts`: pass, 437 assertions across 42 affected test files; 19 lint files, typecheck and registry pass.
- `npm run registry`: pass. `npm run review-stamp -- . --no-fetch`: **5d6cba7be4d4**, independently reviewed with
  no remaining actionable findings. The review's shutdown finding has a red-first, then passing regression.
- Local CLI exercised end to end: typed confirmation, replacement, pinned listing, restore to original birth, release.

[Local check evidence](../../.look/evidence/room-fast-forward-server/evidence.json) contains the logs and identities.
[Two-player T2 bot](../../.look/evidence/1794605819661-47456/evidence.json): both finish, mirrors agree at 93 sampled
server steps, no missed beats or graphics errors. Opened `run/end-still.png` and `run/p2-end-still.png`: both players
and completed rails are visible; both overlays finish at T2. This capture predates the upstream High Gorge rebase
and final test-harness corrections; it is a regression observation, not a visual proof of the replacement UI.
Warped clock drift leaves real-time smoothness unverified; no device test.

[World inputs](../../.look/evidence/1794605720611-44768/evidence.json) fails its initial gifts-layout readiness check
on the old `d87c0571` broker harness. Opened `world-inputs/inputs-final-still.png`: Home and the player render;
the log reports no graphics errors. The stale scenario's contract remains unverified. Visible countdown/line,
stage landing, returning absent-player personal-state behavior, playdata and Dev dock controls remain for the client
job. No push or ship was run.

### Security follow-up, 13 November

On `codex/room-fast-forward-server-2`, rebased onto `origin/main` `f00736aec` (v41 seats), both P2 findings
from the security/data-safety review are fixed. The original distinct-IP regression failed before the fix;
the release regression left 31 ordinary files, and a concurrent cross-room fixture left 40. All now pass.

- Replacement admission has a fixed server-wide 24/minute token bucket alongside the existing per-IP 6/minute
  default. Both run before key comparison/body parsing. At most two replacement jobs prepare/count down at once;
  excess requests get 429. A separate process-wide cap permits two validation workers across replacement and
  restore, with no queue; capacity returns only after worker termination, including error/timeout paths.
- Pin release and every ordinary-backup creation path use the same newest-30 retention, ordered by timestamp
  across rooms. Remaining pins are excluded. Concurrent releases retain the newest files deterministically.
- The v41 net checkpoint occupies a seat before replacement, then verifies empty seat rows on the new host and
  both clients; restoring the pinned save also leaves transient seats empty. No seat implementation changed and
  no additional namespace bump was needed. The curl example now names `rail-v41`.

Verification on implementation `40986242` plus the networking-doc budget correction: `npm run check` passes
(1,794 passing tests, one existing train-wait TODO), server tests 271/271, direct `npm run test:net` 191/191,
25 checkpoint seeds, ship-check 438 assertions/43 affected test files, and registry pass. Independent follow-up
review found no actionable issues; stamp **cd860a391bef**. The pre-rebase server run was interrupted; the first
v41 full check exceeded the networking-doc reading budget by 100 characters. Both are superseded by the final runs.
The release fixture now spaces ordinary backup requests by 2 ms so it creates distinct millisecond filenames.

[Fresh two-player T2 evidence](../../.look/evidence/1794608894318-27733/evidence.json) passes: both finish,
195 common server-step hashes agree, no missed beat or graphics error. Opened `run/end-still.png` and
`run/p2-end-still.png`: both players, completed rails and both T2-complete overlays are visible. The 3x warped
capture reports drift and under-load execution; timing, smoothness and device behavior remain unverified.
Two checkpoint-list attempts did not establish a visual result (broker clock-option refusal, then a queued
request invalidated by the doc correction). The later playthrough manifest confirms unchanged before/after trees.

[Follow-up check logs and provenance](../../.look/evidence/room-fast-forward-server/followup-evidence.json)
supersede the earlier v40 evidence for this fix. The client controls/countdown rendering remain outside this job.
No push or ship was run.

### Authentication-budget follow-up, 13 November

Re-review found the shared global admission bucket let unauthenticated traffic consume every operator token.
The review's simulated-clock regression was ported first and failed (the last operator attempt got 429).
Implementation `5f0db9c4` on `codex/room-fast-forward-server-2` replaces that earlier shared budget:

1. Per-IP admission runs first; refusal spends no other budget. Its default is now 30/minute so an operator
   sending 24/minute does not hit the old 6/minute IP ceiling in the review's original five-minute test.
2. The credential check compares fixed-size SHA-256 digests with `timingSafeEqual`; no secret-length or prefix
   early return, credential logging, or credential echo. Body parsing and expensive work remain later.
3. Failed credentials draw only from a 24/minute global failed-authentication bucket, returning generic 401/429.
4. Correct credentials draw only from a separate 24/minute operator bucket. The existing two replacement-job
   and two validation-worker caps remain. Every IP limiter tracks at most 1,024 addresses, evicting the least
   recently seen first.

The requested IP-first order necessarily still throttles callers sharing an exhausted IP. Isolation is across
addresses: both the original single-IP flood and 3,840 distinct-IP failed guesses preserved all 120/120 operator
attempts over five simulated minutes. The five new tests also verify budget independence, refusal accounting,
operator refill, LRU eviction, generic responses and no key logs or seed work from guesses.

Fresh verification: check passes (1,794 tests plus one existing TODO); server tests 276/276; direct test:net
191/191, including replacement/restore and empty v41 seats; `node dev/ship-check.ts origin/main HEAD` passes
438 assertions in 43 affected test files; registry passes. Independent review found no actionable issues in
this delta; stamp **c7b4f9149668**. No namespace, seat, backup, or client-control change was needed.

[New T2 manifest](../../.look/evidence/1794610273487-65077/evidence.json): clean, unchanged `5f0db9c4` throughout;
both players finish, 178 sampled steps agree, no missed beats or graphics errors. Opened `run/end-still.png`
and `run/p2-end-still.png`: both players and completed rails are visible, with T2-complete overlays. The 3x warped
run reports drift and load, so timing/feel and device behavior remain unverified. Client controls remain deferred.
[Current logs and provenance](../../.look/evidence/room-fast-forward-server/auth-evidence.json) supersede earlier
admission evidence. No push or ship was run.
