# Boogle server

One small Node 24 service (Express + `ws`): Boogle's game server. It hosts every room and runs its world.

| Endpoint | Purpose |
|---|---|
| `GET /rooms/:roomId/snapshot` | The room's world as the server last saved it, `{ tick, writerId: 'server', data, updatedAt }` (200 JSON), or 404. |
| `GET /rooms/:roomId/host` | `{ mode: 'server', boot, tick, players, max, noSave }` for a room this server hosts (404 otherwise). `noSave`: the world holds a state saved by a newer build, so the server stopped saving (deploy the server). |
| `/room/:roomId?self=<id>&b=<build>` | WebSocket (subprotocol `boogle.1`) into a hosted room; wire in `src/net/ws-wire.ts`. Refusals: `peer` 4000 (not hosted here), `bad` 4400, `full` 4008; a second socket for the same `self` replaces the first (4009). 20 upgrades/min/IP. |
| `POST /report` | Problem reports from players' browsers (`src/features/telemetry.js`): one `{ room, kind, detail, tick?, build?, ua? }` or an array of up to 10. `kind` is `error`, `desync`, `snapshot` or `connect`; `detail` is a string (cut to 500 chars) or a flat object of strings/numbers/booleans (12 keys, strings cut to 200). Other fields are dropped; no IP or headers are kept. Accepts `text/plain` (what `navigator.sendBeacon` sends) or JSON. 204 stored, 400 invalid, 413 over 8 KB, 429 over `REPORT_RATE_PER_MIN`, 507 when today's file is full. |
| `GET /reports?day=YYYY-MM-DD` | That UTC day's reports as JSON lines (default today; empty if none). Only exists when `REPORT_TOKEN` is set (404 otherwise) and needs `Authorization: Bearer <REPORT_TOKEN>` (401). |
| `GET /healthz` | `ok` |

**Hosting rooms** (`SERVER_ROOMS`, `src/host/`; design: `docs/plans/server-host.md`). Production hosts every room (`SERVER_ROOMS=*` in `fly.toml`), so this is how every game is played; `npm run dev` runs the same service in-process (`vite.config.js`, saves in `.boogle-data/`). For each hosted room the server runs the game's lockstep world itself (`src/world/sync.ts` and every rules module on the land in `src/world/home-land.json`), from start to shutdown with or without players, saving it every `SERVER_SAVE_MS` as `writerId: 'server'`. Tabs join over `/room/:id`; the server relays presence and messages, picks the lead (the oldest visible tab) (`w:edit`, `w:need` and `w:id` go to its sync only). `SIGTERM` says `bye`, saves and closes the sockets with 1012.

Snapshots are one JSON file per room in `DATA_DIR`, written atomically (temp file + rename). Reports are appended, one JSON line each with a server timestamp `at`, to `DATA_DIR/reports/YYYY-MM-DD.jsonl`; the first report of each UTC day deletes files older than 30 days. No database. CORS applies to every endpoint.

## Environment variables

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `9000` | Listen port. |
| `DATA_DIR` | `./data` | Where room snapshot files live (use a persistent volume in production). |
| `ALLOWED_ORIGINS` | `*` | Comma-separated allowed browser origins. Set this in production. |
| `MAX_ROOMS` | `1000` | Max distinct rooms stored. New rooms beyond this get 507; existing rooms keep updating. |
| `REPORT_RATE_PER_MIN` | `12` | Per-IP token bucket for `POST /report` (the client batches, so one POST carries several reports). |
| `REPORT_MAX_BYTES_PER_DAY` | `5242880` | Cap on each day's report file (5 MB); further reports that day get 507. |
| `REPORT_TOKEN` | unset | Enables `GET /reports` for whoever sends this bearer token. Unset: reports are write-only (read them on the volume). |
| `TRUST_PROXY` | `1` | Express `trust proxy` (hops, `true`, or `false`). `1` suits Fly/Render/Railway; needed so the rate limit sees the real client IP. |
| `SERVER_ROOMS` | `*` | Rooms this server hosts (above): `*` for every valid room id (production, `npm run dev` and the test harnesses), or a comma-separated list (loaded at start and kept).  |
| `ROOM_IDLE_MS` | `600000` | With `*`: a room nobody has been in this long is saved and unloaded (it loads again on the next join). |
| `MAX_HOSTED_ROOMS` | `20` | With `*`: rooms loaded at once; a join past it gets `full` with `rooms: true`. |
| `MAX_PLAYERS` | `8` | Players per hosted room (the server is not one). A reconnecting player is always let back in. |
| `SERVER_SAVE_MS` | `2000` | How often a hosted room saves its world (when it changed). |

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

Keep it on a single machine: the volume is per-machine and signaling state is in memory. `fly.toml` sets `min_machines_running = 1` and disables auto-stop so WebSockets stay up. Render/Railway work too (Dockerfile, mount a disk at `/data`, set `DATA_DIR=/data`).

## Continuous deploy

`.github/workflows/deploy-server.yml` runs the server tests, builds the image and then `flyctl deploy` (one machine) from the repo root on every push to `main` that touches `server/` or what the image carries (`src/world/`, `src/sim/`, `src/net/ids.ts`, `src/net/ws-wire.ts`), on merged PRs that touch them (dispatched by `automerge.yml`), and by hand from the Actions tab. It then polls `https://<app>.fly.dev/healthz` for up to two minutes. Without a `FLY_API_TOKEN` secret the deploy job is skipped (grey, not red), so forks stay green.

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

