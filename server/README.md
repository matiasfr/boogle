# Boogle server

One small Node 26 service (Express + `ws`): Boogle's game server. It hosts every room and runs its world.

| Endpoint                            | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /rooms/:roomId/snapshot`       | The room's world as the server last saved it, `{ tick, writerId: 'server', data, updatedAt }` (200 JSON), or 404.                                                                                                                                                                                                                                                                                                                                              |
| `GET /rooms/:roomId/host`           | `{ mode: 'server', boot, tick, players, max, noSave }` for a room this server hosts (404 otherwise). `noSave`: loading the saved world failed; the server must not publish or save the fresh fallback as verified state.                                                                                                                                                                                                                                               |
| `/room/:roomId?self=<id>&b=<build>` | WebSocket (subprotocol `boogle.1`) into a hosted room; wire in `src/net/ws-wire.ts`. Refusals: `peer` 4000 (not hosted here), `bad` 4400, `full` 4008; a second socket for the same `self` replaces the first (4009). 20 upgrades/min/IP.                                                                                                                                                                                                                      |
| `POST /report` | Problem reports from players' browsers (`src/features/telemetry.ts`): one `{ room, kind, detail, tick?, build?, ua? }` or an array of up to 10. `kind` is `error`, `desync`, `snapshot` or `connect`. Detail is a string (cut to 500 chars) or a flat object of strings/numbers/booleans (12 keys, strings cut to 200). Other fields are dropped; no IP or headers are kept. Accepts `text/plain` or JSON. 204 stored, 400 invalid, 413 over 8 KB, 429 over `REPORT_RATE_PER_MIN`, 507 when today's file is full. |
| `GET /reports?day=YYYY-MM-DD`       | That UTC day's reports as JSON lines (default today; empty if none). Only exists when `REPORT_TOKEN` is set (404 otherwise) and needs `Authorization: Bearer <REPORT_TOKEN>` (401).                                                                                                                                                                                                                                                                            |
| `POST /playdata`                    | Playtest data from `?proto=` pages (`src/proto/playdata/record.ts`, `server/src/playdata.ts`): `{ s: session, card, n, now, ev: [{ t, k, ...flat primitives }] }`, up to 500 events. Accepts `text/plain` or JSON. `card` is any short id (`[a-z0-9-]`, 40 chars). Control characters in strings are stripped. 204 stored, 400 invalid, 413 over 64 KB, 429 over `PLAY_RATE_PER_MIN` or `PLAY_NEW_SESSIONS_PER_HOUR`, 507 session full. No IP or headers kept. |
| `GET /playdata?limit=N`             | Newest sessions first, `{ id, card, bytes, first, last, meta }` (default 50, at most 200). Same token rule as `GET /reports`. Read with `npm run playtest`.                                                                                                                                                                                                                                                                                                    |
| `GET /playdata/:session`            | One session as JSON lines, a line per batch. Same token rule.                                                                                                                                                                                                                                                                                                                                                                                                  |
| `POST /jump` | A playtest jump-in (`server/src/jump.ts`, docs/plans/playtest-jump-in.md): `{ stage, ns }` (`text/plain` or JSON, 1 KB) makes a fresh private room seeded at that stage (`src/world/railway-jump.ts`; `start` is an unseeded one) and answers `{ room, stage }` with the room's plain name, e.g. `hook-earned-k3x9qa`. The server names the room; a body with any other field gets 400, an unknown stage 400, `ns` not this server's `RAILWAY_PLAY_NS` 409 `{ error: 'world changed', ns }`, over `JUMP_RATE_PER_MIN`, `JUMP_MAX_PER_DAY` or `JUMP_MAX_PER_ADDRESS_DAY` 429, a stage with no prebuilt seed under `JUMP_BUILD=prebuilt` 503, past `JUMP_MAX_ROOMS` 507. The seed is written as the room's first save, never over one: a loaded room, one with a save, or a name that isn't a jump room's (such as `boogle`) is refused. `GET /rooms/:roomId/host` then carries `seed: { stage, at }`. |
| `GET /healthz`                      | `ok`                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**Hosting rooms** (`SERVER_ROOMS`, `src/host/`; design: `docs/plans/server-host.md`). Production hosts every room (`SERVER_ROOMS=*` in `fly.toml`), so this is how every game is played; `npm run dev` runs the same service in-process (`vite.config.ts`, saves in `.boogle-data/`). For each hosted room the server runs the game's lockstep world itself (`src/world/sync.ts` and every rules module on the land in `src/world/home-land.json`), from start to shutdown with or without players, saving it every `SERVER_SAVE_MS` as `writerId: 'server'`. Tabs join over `/room/:id`; the server relays presence and messages, picks the lead (the oldest visible tab) (`w:edit` and `w:need` go to its sync only; the `pid` in the upgrade URL is the player, stamped on its edits; a newer socket with the same pid and `key` closes the older with 4010, and one with another key while that pid is in the room is refused with 4011). `SIGTERM` says `bye`, saves and closes the sockets with 1012.

Snapshots are one JSON file per room in `DATA_DIR`, written atomically (temp file + rename). Reports are appended, one JSON line each with a server timestamp `at`, to `DATA_DIR/reports/YYYY-MM-DD.jsonl`; the first report of each UTC day deletes files older than 30 days. A jump room's stage is a sidecar, `DATA_DIR/jumps/<roomId>.json` (`{ stage, at, build }`), outside the world; the image prebuilds the offered seeds into `server/seeds/` (`server/src/seeds/prebuild.ts`, a `RUN` line in the Dockerfile). Playtest data is one JSON-lines file per session in `DATA_DIR/playdata/`; past the caps below the sessions written to longest ago are deleted, sessions that look played (a name, over a minute, not an automated browser) only after all the others. No database. CORS applies to every endpoint.

## Internal review cards

`/protos/?review=<uuid>` opens one retained comparison; no player navigation links to it. The link is a capability: anyone who has it can read that card and submit a verdict. It contains no report-reader token. Production uses the page's configured `VITE_BOOGLE_SERVER`; a `reviewServer` loopback HTTP override exists only in development for broker verification.

- `POST /reviews` requires the existing report token, a 6/minute/IP limit and a single global upload slot **before** its 4.1 MiB JSON parser. An absolute 15-second upload deadline prevents a trickling client holding the slot. Fields are `question`, `change`, `topic`, `build`, `launcher`, optional `context`, and base64 `before`/`after`. The immutable version-1 card carries SHA-256 hashes. Uploads accept only non-interlaced 8-bit PNG captures, 1.5 MiB each, at most 2048 pixels per side and 2,097,152 pixels total. CRC/chunks, exact inflated data size and pixels must decode in a worker (5-second timeout, 64 MiB JS heap), outside the room-host thread. This uses pngjs 7, already used by capture tooling, added as a server runtime dependency so Docker can decode without root dev dependencies. JPEG/WebP upload is deliberately excluded; existing retained files remain readable.
- `GET /reviews/:id` and `GET /reviews/:id/before|after` use the card capability. These reads and authenticated listing share 60/minute/IP and four concurrent responses (30-second deadline), returning 429 when busy. Images stream with backpressure and a 32 KiB stream buffer, fixed content types, `nosniff` and immutable private caching. Metadata is uncached.
- `POST /report` additionally accepts `{ kind: 'review-v1', reviewId, submissionId, verdict: 'accept'|'changes'|'cant', pin?: { image: 'before'|'after', x, y, text } }`. IDs are UUIDv4; coordinates are normalized 0–1; pin text is 1–2000 characters. Existing report body/rate limits apply. Response: `{ status: 'received', reviewId, submissionId, at, duplicate }`. Same ID/content returns the original receipt even at capacity; changed content at that ID returns 409. There are 19 link-holder receipts plus one reserved authenticated owner receipt (20 total); the owner submits through the CLI below, never a token in the page. New receipts store only submission/status/time, joined to their immutable card when retrieved. Legacy copied-card receipts remain readable. File/directory sync precedes acknowledgement.
- `GET /reviews?limit=10&after=<cursor>&review=<optional-id>` requires the report token and returns `{ receipts, next }`, with authoritative card/build/topic/evidence attached to at most 20 receipts. Pass the returned `next` cursor for another page; null means done. Pagination follows immutable IDs, not date order. It is distinct from `/reports`.
- `DELETE /reviews/:id` requires the report token and removes the complete card/media/receipt directory. Optional `?receipts=N` rejects with 409 if feedback arrived since archival; the archive CLI always uses this condition. This is intentional deletion, never automatic eviction.

Cards, media and receipts are under `DATA_DIR/reviews/`, on the existing `/data` volume, independent of deploys and report-log pruning. New writes stop with 507 at 30 cards, 100 MiB total review files (including legacy records and abandoned temporary directories), or when they would leave less than 128 MiB free for rooms and other service data. The reserve is headroom, not a separate filesystem quota; other writers can still consume it. One process owns the volume. Existing records above the new caps are preserved; archive/delete them to make room. Disk/volume loss is outside the durability guarantee. Abandoned `.upload-*` temporary directories need operator cleanup after a crash; they count against the byte budget.

Create a card from captures already produced by `dev/look`:

```sh
npm run --silent review-card -- --before .look/before-still.png --after .look/after-still.png --question "Is the change clear?" --change "One sentence of change." --topic review-inbox --build <source-revision> --launcher <launching-checkout> --site https://boogle.club/ --server https://boogle-server.fly.dev --context .look/comparison-context.json
npm run --silent review-card -- --submit downloaded-note.json --server https://boogle-server.fly.dev
npm run --silent review-card -- --archive <review-id> --out <new-local-directory> --server https://boogle-server.fly.dev
# Add --delete only to archive and then remove the server copy after hash verification.
npm run --silent review-card -- --archive <review-id> --out <another-new-directory> --delete --server https://boogle-server.fly.dev
```

Read retained receipts through authenticated `GET /reviews` above, or archive a card with its receipts using `review-card --archive`.

`--context` is optional JSON for route, camera, checks and broker manifests; do not imply exact-build reproduction without evidence. Credentials come only from `REPORT_TOKEN` or the existing local token-file lookup, never the link. The create command checks returned hashes against input bytes. The browser persists its pending submission before sending; only a matching server receipt changes Pending to Received. An unchanged retry keeps the ID across reloads; editing creates a new ID. Download note is the fallback when storage or connectivity is unavailable.

A director reads the JSON, preserves the owner's words and evidence, then uses `node dev/codex/run.ts resume <topic> "<feedback>"` from the recorded launcher once that named job is idle. If its checkout/build is gone or changed, start a new explicitly based job. Neither acceptance nor the page executes an agent or deploys anything. Production deploy/restart, CORS and physical-phone access need live verification; local proof does not establish them.

## Environment variables

| Var                          | Default     | Meaning                                                                                                                                                                |
| ---------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                       | `9000`      | Listen port.                                                                                                                                                           |
| `DATA_DIR`                   | `./data`    | Where room snapshot files live (use a persistent volume in production).                                                                                                |
| `ALLOWED_ORIGINS`            | `*`         | Comma-separated allowed browser origins. Set this in production.                                                                                                       |
| `MAX_ROOMS`                  | `1000`      | Max distinct rooms stored. New rooms beyond this get 507; existing rooms keep updating.                                                                                |
| `REPORT_RATE_PER_MIN`        | `12`        | Per-IP token bucket for `POST /report` (the client batches, so one POST carries several reports).                                                                      |
| `REPORT_MAX_BYTES_PER_DAY`   | `5242880`   | Cap on each day's report file (5 MB); further reports that day get 507.                                                                                                |
| `REPORT_TOKEN`               | unset       | Enables `GET /reports` for whoever sends this bearer token. Unset: reports are write-only (read them on the volume).                                                   |
| `ADVANCE_KEY` | unset | Enables room replacement for this bearer only; `REPORT_TOKEN` cannot authorize it. |
| `ADVANCE_SHARED` | off | `1` permits replacing the shared `boogle` island behind `ADVANCE_KEY`. |
| `REPLACE_RATE_PER_MIN` | `6` | Per-IP replacement requests; a fixed server-wide 24/minute token bucket also applies. Both run before authentication. |
| `PLAY_RATE_PER_MIN`          | `240`       | Per-IP token bucket for `POST /playdata` (a tab sends a batch every 5 s; friends may share an IP).                                                                     |
| `PLAY_NEW_SESSIONS_PER_HOUR` | `40`        | New sessions per IP per hour on `POST /playdata`; each page load is one.                                                                                               |
| `PLAY_MAX_SESSION_BYTES`     | `4194304`   | Cap on one session's file (4 MB); further batches get 507.                                                                                                             |
| `PLAY_MAX_TOTAL_BYTES`       | `209715200` | Cap on all sessions (200 MB; the volume is 1 GB); the oldest go first.                                                                                                 |
| `PLAY_MAX_SESSIONS`          | `2000`      | Cap on the number of sessions; the oldest go first.                                                                                                                    |
| `JUMP_RATE_PER_MIN`          | `6`         | Per-IP token bucket for `POST /jump`.                                                                                                                                  |
| `JUMP_MAX_PER_DAY`           | `500`       | Jump-ins per UTC day, all addresses together; only one that succeeds counts; further ones get 429.                                                                     |
| `JUMP_MAX_PER_ADDRESS_DAY`   | `30`        | Jump-ins per UTC day from one address (IPv4, or an IPv6 /64); further ones get 429.                                                                                    |
| `JUMP_BUILD`                 | `any`       | Where seeds come from: `any` builds a missing one in a worker thread (local, tests), `prebuilt` serves only the image's `server/seeds/` (the image sets it; 503 otherwise).    |
| `JUMP_IDLE_DAYS`             | `3`         | A jump room nobody has touched this long is deleted, with its sidecar (at boot and before each jump).                                                                  |
| `JUMP_MAX_ROOMS`             | `200`       | Jump rooms at once; past it `POST /jump` gets 507, so jump-ins can't fill `MAX_ROOMS`.                                                                                 |
| `TRUST_PROXY`                | `1`         | Express `trust proxy` (hops, `true`, or `false`). `1` suits Fly/Render/Railway; needed so the rate limit sees the real client IP.                                      |
| `SERVER_ROOMS`               | `*`         | Rooms this server hosts (above): `*` for every valid room id (production, `npm run dev` and the test harnesses), or a comma-separated list (loaded at start and kept). |
| `ROOM_IDLE_MS`               | `600000`    | With `*`: a room nobody has been in this long is saved and unloaded (it loads again on the next join).                                                                 |
| `MAX_HOSTED_ROOMS`           | `20`        | With `*`: rooms loaded at once; a join past it gets `full` with `rooms: true`.                                                                                         |
| `UPGRADES_PER_MIN`           | `20`        | Room sockets opened per IP per minute; past it a 429.                                                                                                                  |
| `MAX_PLAYERS`                | `8`         | Players per hosted room (the server is not one). A reconnecting player is always let back in.                                                                          |
| `SERVER_SAVE_MS`             | `2000`      | How often a hosted room saves its world (when it changed).                                                                                                             |

## Save inventory and automatic cleanup

Each boot logs one `save inventory <digest>` line before any room is loaded. `GET /admin/saves` returns a fresh
inventory with the same `Authorization: Bearer <REPORT_TOKEN>` guard as reports (404 if the token is unset, 401
for missing or wrong credentials). It reports current room counts/bytes and idle counts, old classic and railway
namespaces with their newest modification times, old temporary files, directory sizes and unknown
names. It uses directory entries and file metadata only, never save contents, and does not follow symlinks.

`files` lists obsolete-namespace saves and their temp files older than an hour. Bare room IDs are **current**, because
the generic room host still writes them. `currentRooms` reports explicit `SERVER_ROOMS` entries, which are also
protected even when their names resemble an older namespace. `legacyFiles` and legacy counts now remain empty/zero;
a bare filename alone cannot prove a save is unused.
`digest` is the first 16 hex characters of SHA-256 over sorted `files` joined by newlines; `digestWithLegacy` includes
both sorted lists. Current rooms, including idle ones, are never candidates. `reports/`, `playdata/`, `reviews/` and
`.trash/` are only measured by the inventory. Current-namespace temp files are also protected, regardless of age.
Unknown entries are reported. Inventory failure is logged without stopping boot or running cleanup.

Cleanup is **enabled by default**, following the owner's 8 November approval. After inventory and before loading any
rooms, obsolete classic and railway namespace saves and their stale temp files move to
`DATA_DIR/.trash/<UTC ISO stamp with - for :>-<unique suffix>/files/` (`2026-10-31T00-00-00.000Z-a1B2c3`, a name
Windows accepts; older colon-form folders are still recognised and expire the same way). There is no digest gate or
legacy opt-in. Each run logs one
`save cleanup:` line with moved counts/bytes by reason, purged folder count, skipped count, unknown names and errors.
Unknown root entries, symlinks, `reports/`, `playdata/` and `reviews/` stay in place.

Every move rechecks the filename, file type, temp age and live-room ownership under the store's per-room writer lock.
Current namespace files, bare room files, explicitly configured room files and their temp writes never move, even
when idle or stale. This protection also applies inside trash during purging. Admission, Store writes and inventory
share `server/src/room-ids.ts`: the wildcard host refuses an obsolete namespace and Store refuses writing it;
an explicit `SERVER_ROOMS` entry is retained by all three. A moved room is forgotten by the store so obsolete saves
no longer occupy `MAX_ROOMS`. Each trash run has an atomic `manifest.json` recording
`{ at, ns, rail, files: [{ name, bytes, reason }] }`, where reason is `old-ns`, `legacy` or `tmp`. The next entry is
recorded before its rename; payloads live under `files/`, separate from audit metadata. After an interrupted run,
compare source and destination to resolve any pending entry.

At boot, UTC-stamped trash run folders **strictly older than seven days** are permanently purged. Newer folders stay.
Folders with current/live files or unexpected entries, non-stamped folders and symlinks are kept and reported.
`SAVE_CLEANUP=off` is an emergency kill switch for both moving and purging; unset (or any other value) enables both.
`GET /admin/saves` remains read-only and includes `lastCleanup`: the current process's latest boot result
(`at`, `enabled`, `trash`, `moved`, `purged`, `skipped`, `unknown`, `errors`), or null if inventory failed.
Per-file cleanup failures are recorded and do not stop boot. A second boot with no new eligible files moves nothing
and creates no new trash folder. See [the plan](../docs/plans/world-version-and-save-reset.md).

## Operator tools

Room saves are managed on the running server, with no deploy (`server/src/admin.ts`). Listing, backups, resets,
restores and pin releases use `Authorization: Bearer <REPORT_TOKEN>`, 404 while the token is unset. Replacement
uses its own `ADVANCE_KEY` and never accepts `REPORT_TOKEN` in its place.

```sh
npm run server -- rooms                    # saved rooms, who is in them, and the backups kept
npm run server -- reset <room> | --all     # back the save up, then start the room fresh
npm run server -- backup <room> | --all    # keep a copy of the save as it is now
npm run server -- restore <room> [backup]  # put a backup back (default: that room's newest)
npm run server -- replace <room> <stage> [--override] # print losses/count, then type the room name
npm run server -- release <backup>        # release a pin into ordinary backup retention
```

`<room>` is the name in the URL (`?room=`), matching its classic and its railway room, or a full id from `rooms`.
`BOOGLE_SERVER` picks the server (default production); the token comes from `REPORT_TOKEN` or `.env.local`.
`replace` reads `ADVANCE_KEY` from the environment and needs no report token. It uses the current railway
namespace, reads the public host status for the player count, and requires the exact plain room name at its
prompt. `--override` explicitly permits replacing an occupied room; `--force` belongs to reset/restore only.

Each room's save carries `born`, the id of its world, sent to every joiner in `welcome`. A reset gives the room a new
one and a restore brings the backup's back; a client that last joined a different world there starts the player over
(the fall and the card, that room's local progress and The Boogler's memory forgotten: `src/features/room-reset.ts`). Saves from before `born`
read as `0`.

| Endpoint | Does |
| --- | --- |
| `GET /admin/rooms` | `{ ns, rail, rooms: [{ id, bytes, savedAt, loaded, players, tick? }], backups: [{ name, room, bytes, pinned? }] }`: current-namespace saves and the backups, newest first. |
| `POST /admin/rooms/:id/backup` | Copies the room's last checkpoint (up to `SERVER_SAVE_MS` old) to `DATA_DIR/.backups/<id>@<UTC stamp>.json`. 404 without a save. |
| `POST /admin/rooms/:id/reset` | Closes the room without saving, moves its save into `.backups/`, and lets the next join start a fresh world. |
| `POST /admin/rooms/:id/restore?backup=<name>` | Saves the room's last verified checkpoint before closing, backs it up, then restores the chosen backup, including a pin, with its original birth id. 404 no such backup, 422 not a room save; a failed/fatal close aborts. |
| `POST /admin/backups/:name/release` | Releases a pinned backup into the ordinary newest-30 retention pool. |
| `POST /admin/rooms/:id/replace` | Bearer `ADVANCE_KEY`; JSON `{ stage, confirm, override? }`. Replaces a current railway room with an existing `SEED_STAGES` recipe after validation, countdown, verified close and pinned backup. |

Reset and restore answer 409 while players are in the room unless `?force=1`; with it everyone gets `bye`, the socket
closes with 1012 and their tab reconnects into the new world. Joins are refused until the files have changed, so a
reconnect never loads the old save. Only current room ids are accepted (400 otherwise). The newest 30 backups are
kept, across all rooms; boot cleanup measures `.backups/` and never moves it. A backup restores only into its own room
id, so a `WORLD_NS` bump leaves older backups unusable.

Replacement is a whole new world birth. It resets carried/account state and everything personal to that room,
including wardrobe finds; a server backup restores the old world, not browser state already cleared. The CLI
prints all four loss categories from [the plan](../docs/plans/room-fast-forward.md#what-a-replacement-loses-shown-in-the-control-and-printed-by-the-cli-before-it-runs).
The last recorded stage sets the forward-only check; it does not measure played progress.
Every occupied room requires `override: true`: the authenticated HTTP key does not prove which socket, if any,
belongs to the caller. A never-visited empty room is initialized and checkpointed before replacement so its first
world has a pinned recovery point too. Shutdown aborts a pending countdown before any replacement begins.

The replacement endpoint returns 404 with no configured key; 401 for missing/wrong bearer; 400 for invalid room,
stage or body; 403 for the shared island unless `ADVANCE_SHARED=1`; 409 for missing/wrong typed confirmation,
an earlier recorded stage, a busy room or players present without `override: true`; 429 for the rate or capacity limits;
503 for an unavailable seed; 422 if the target fails validation; and 500 for a failed close or write.
Connected clients receive `{ t: 'replacing', label, seconds }` before a 10-second countdown, including clients
joining during it. Empty rooms skip the countdown. The notification renderer and Dev dock control are separate
client work; the room interface supplies the event and exact plan text hook.
The server admits at most two replacement jobs at once, including preparation and countdown. Checkpoint
validation also has a process-wide two-worker cap shared with restore; excess work gets 429 without a queue.
Worker capacity is released only after the worker terminates, including failures and timeouts.

On success the response identifies the pinned backup and restore command. Pins live under
`DATA_DIR/.backups/pinned/` and survive normal pruning until released. The `replacements/` journal is reconciled
at boot and before replacement: an unchanged birth means the save rename did not land; a changed birth completes
the record. An interrupted countdown is cancelled on shutdown/restart; it never resumes a delayed replacement.
`GET /rooms/:id/host` reports `replaced: { stage, at, born }` for the recorded replacement.
Releasing a pin immediately applies the newest-30 ordinary-backup retention, ordered by timestamp across rooms.
Ordinary backup creation uses the same pruning rule; other pins are never candidates for deletion.

Replacement and restore abort when the current loaded host cannot produce a verified checkpoint (including fatal
command status). An operator repairing such a room must first take it through the existing reset workflow, then
restore the selected valid pin; the failed world's fallback is never saved as its recovery point.

Local invocation (the server must have the same key; choose a disposable room):

```sh
export BOOGLE_SERVER=http://127.0.0.1:9000
export ADVANCE_KEY=local-replace-key
npm run server -- replace test-room awake --override
curl -X POST "$BOOGLE_SERVER/admin/rooms/rail-v40-test-room/replace" \
  -H "Authorization: Bearer $ADVANCE_KEY" -H 'Content-Type: application/json' \
  --data '{"stage":"awake","confirm":"test-room","override":true}'
# Use the exact restore command printed in the response, with REPORT_TOKEN set.
```

The sample room id uses v40; use the running build's current railway namespace if it changes.

## Run locally

```sh
cd server
npm ci
npm run dev        # node --watch, http://localhost:9000
npm test
```

## Deploy to Fly.io

The image is built from the repo root (`server/Dockerfile` copies `src/world`, `src/sim` and the shared net modules beside `server/`; check it with `docker build -f server/Dockerfile .`).

```sh
cd server
fly launch --no-deploy --copy-config --name <your-unique-app-name>   # edit app name in fly.toml
fly volumes create boogle_data --size 1 --region iad
fly secrets set ALLOWED_ORIGINS=https://<your-site-origin>
# optional, to read reports over HTTP:
fly secrets set REPORT_TOKEN=$(openssl rand -hex 16)
cd .. && fly deploy . --config server/fly.toml --dockerfile server/Dockerfile
curl https://<app>.fly.dev/healthz
```

Keep it on a single machine: the volume is per-machine and the hosted rooms live in memory. `fly.toml` sets `min_machines_running = 1` and disables auto-stop so WebSockets stay up. Render/Railway work too (Dockerfile, mount a disk at `/data`, set `DATA_DIR=/data`).

## Continuous deploy

`.github/workflows/deploy-server.yml` runs the server tests, builds the image and then `flyctl deploy` (one machine) from the repo root on every push to `main` that touches `server/` or what the image carries (`src/world/`, `src/sim/`, `src/net/ids.ts`, `src/net/ws-wire.ts`), on merged PRs that touch them (dispatched by `automerge.yml`), and by hand from the Actions tab. Before deploying, it boots the built image with an empty data dir and requires `/version` to answer (`scripts/server-boot-check.sh`, also in CI). It then polls `https://<app>.fly.dev/healthz` for up to two minutes. Without a `FLY_API_TOKEN` secret the deploy job is skipped (grey, not red), so forks stay green.

**A new shared file the server imports** (anything outside `server/` not already under a copied folder) goes in three places: a COPY line in `server/Dockerfile`, the path list in `dev/server-build.ts` (the build identity) and the `paths:` filter above. `test/server-image.test.ts` (in `npm run check`) walks the imports from `server/src/index.ts` and the seed prebuild and fails until all three list it; a missing one crash-looped the deployed server on 10 November.

Human checklist, once:

1. [ ] `cd server && fly launch --no-deploy --copy-config --name <your-unique-app-name>`, then put that name in `fly.toml` (or set a `FLY_APP` repo variable to it).
2. [ ] `fly volumes create boogle_data --size 1 --region iad` (one volume, same region as `primary_region`).
3. [ ] `fly secrets set ALLOWED_ORIGINS=https://<you>.github.io` and `REPORT_TOKEN` if you want to read reports over HTTP.
4. [ ] `fly tokens create deploy` and save it as the `FLY_API_TOKEN` repo secret: `gh secret set FLY_API_TOKEN`.
5. [ ] Run the workflow once (`gh workflow run deploy-server.yml`) and check `curl https://<app>.fly.dev/healthz` says `ok`.
6. [ ] Point the game at it: `gh variable set VITE_BOOGLE_SERVER --body https://<app>.fly.dev` (read by `deploy.yml`), then re-run the Pages deploy.

Reading reports:

```sh
curl -H "Authorization: Bearer $REPORT_TOKEN" "https://<app>.fly.dev/reports?day=2026-10-29" | jq -c 'select(.kind=="connect")'
```
