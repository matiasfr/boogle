# Boogle server

One small Node 24 service (Express + the official `peer` package) that gives the P2P game the few things WebRTC can't do alone:

| Endpoint | Purpose |
|---|---|
| `/peerjs` | PeerJS signaling (WebSocket + REST), via `ExpressPeerServer`. Discovery disabled. Logs connect/disconnect counts only. |
| `GET /rooms/:roomId/snapshot` | Stored garden snapshot (200 JSON) or 404. |
| `PUT /rooms/:roomId/snapshot` | Body `{ tick: number, writerId: string, data: any }`. Stored unless the stored tick is higher (409 with the current tick). Max 256 KB (413). `roomId` must match `^[a-z0-9-]{1,32}$` (400). 30 PUTs/min/IP (429). Max `MAX_ROOMS` rooms (507). A room the server hosts answers `409 { error: 'server-hosted', tick }` and writes nothing. |
| `POST /rooms/:roomId/handoff` | A demoted peer host's last save, same body (max 1 MB), sharing PUT's rate limit. A hosted room adopts it when it loads cleanly (else 400), is newer than the hosted world and arrives within `ADOPT_WINDOW_MS` of the server starting (else `409 { adopted: false, tick }`): `200 { adopted: true, tick }`, and every connected tab is re-sent the world. Any other room stores it like a PUT. |
| `GET /rooms/:roomId/host` | `{ mode: 'server', boot, tick, players, max, noSave }` for a hosted room, else `{ mode: 'peer' }`. `noSave`: the world holds a state saved by a newer build, so the server stopped saving (deploy the server). |
| `/room/:roomId?self=<id>&b=<build>` | WebSocket (subprotocol `boogle.1`) into a hosted room; wire in `src/net/ws-wire.ts`. Refusals: `peer` 4000 (not hosted here), `bad` 4400, `full` 4008; a second socket for the same `self` replaces the first (4009). 20 upgrades/min/IP. |
| `POST /report` | Problem reports from players' browsers (`src/features/telemetry.js`): one `{ room, kind, detail, tick?, build?, ua? }` or an array of up to 10. `kind` is `error`, `desync`, `snapshot` or `connect`; `detail` is a string (cut to 500 chars) or a flat object of strings/numbers/booleans (12 keys, strings cut to 200). Other fields are dropped; no IP or headers are kept. Accepts `text/plain` (what `navigator.sendBeacon` sends) or JSON. 204 stored, 400 invalid, 413 over 8 KB, 429 over `REPORT_RATE_PER_MIN`, 507 when today's file is full. |
| `GET /reports?day=YYYY-MM-DD` | That UTC day's reports as JSON lines (default today; empty if none). Only exists when `REPORT_TOKEN` is set (404 otherwise) and needs `Authorization: Bearer <REPORT_TOKEN>` (401). |
| `GET /ice` | `{ iceServers: [...] }` with Google STUN, plus TURN if configured. |
| `GET /healthz` | `ok` |

**Hosting rooms** (`SERVER_ROOMS`, `src/host/`; design: `docs/plans/server-host.md`). For each listed room the server runs the game's lockstep world itself (`src/world/sync.ts` and every rules module on the land in `src/world/home-land.json`), from start to shutdown with or without players, saving it every `SERVER_SAVE_MS` as `writerId: 'server'`. Tabs join over `/room/:id`; the server relays presence and messages, picks the lead (the oldest visible tab) and holds the room's PeerJS host id (registrations get `ID-TAKEN`), so no browser can host it too. `SIGTERM` says `bye`, saves and closes the sockets with 1012. Rooms not listed work as before: PeerJS with a browser host.

Snapshots are one JSON file per room in `DATA_DIR`, written atomically (temp file + rename). Reports are appended, one JSON line each with a server timestamp `at`, to `DATA_DIR/reports/YYYY-MM-DD.jsonl`; the first report of each UTC day deletes files older than 30 days. No database. CORS applies to every endpoint.

## Environment variables

| Var | Default | Meaning |
|---|---|---|
| `PORT` | `9000` | Listen port. |
| `DATA_DIR` | `./data` | Where room snapshot files live (use a persistent volume in production). |
| `ALLOWED_ORIGINS` | `*` | Comma-separated allowed browser origins. Set this in production. |
| `MAX_ROOMS` | `1000` | Max distinct rooms stored. New rooms beyond this get 507; existing rooms keep updating. |
| `PUT_RATE_PER_MIN` | `30` | Per-IP token bucket for snapshot PUTs. |
| `REPORT_RATE_PER_MIN` | `12` | Per-IP token bucket for `POST /report` (the client batches, so one POST carries several reports). |
| `REPORT_MAX_BYTES_PER_DAY` | `5242880` | Cap on each day's report file (5 MB); further reports that day get 507. |
| `REPORT_TOKEN` | unset | Enables `GET /reports` for whoever sends this bearer token. Unset: reports are write-only (read them on the volume). |
| `TRUST_PROXY` | `1` | Express `trust proxy` (hops, `true`, or `false`). `1` suits Fly/Render/Railway; needed so the rate limit sees the real client IP. |
| `PEER_ALIVE_TIMEOUT` | `60000` | ms before an idle signaling socket is considered dead (PeerJS clients heartbeat every ~5 s). |
| `TURN_URLS` | unset | Comma-separated TURN URLs, e.g. `turn:turn.example.com:3478,turns:turn.example.com:5349`. |
| `TURN_USERNAME`, `TURN_CREDENTIAL` | unset | Static TURN credentials (used with `TURN_URLS`). |
| `TURN_SECRET` | unset | coturn `static-auth-secret`. Instead of static creds, `/ice` returns ephemeral ones: username `${expiryUnix}:boogle`, credential = base64 HMAC-SHA1(username, secret). Used only if static username/credential are not both set. |
| `CF_TURN_KEY_ID`, `CF_TURN_API_TOKEN` | unset | Cloudflare TURN key. `/ice` mints credentials from Cloudflare's API (cached, re-minted at half of `TURN_TTL`) and adds them; on API failure it serves STUN only. |
| `SERVER_ROOMS` | unset | Comma-separated rooms this server hosts (above). Unset: none; every room is PeerJS. |
| `MAX_PLAYERS` | `8` | Players per hosted room (the server is not one). A reconnecting player is always let back in. |
| `SERVER_SAVE_MS` | `2000` | How often a hosted room saves its world (when it changed). |
| `ADOPT_WINDOW_MS` | `600000` | How long after the server starts a hosted room adopts a newer handoff (the peer host it took over from). |
| `TURN_TTL` | `86400` | Lifetime in seconds of ephemeral TURN credentials (TURN_SECRET and Cloudflare). |

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
# optional TURN:
fly secrets set TURN_URLS=turn:turn.example.com:3478 TURN_USERNAME=... TURN_CREDENTIAL=...
cd .. && fly deploy . --config server/fly.toml --dockerfile server/Dockerfile
curl https://<app>.fly.dev/healthz
```

Keep it on a single machine: the volume is per-machine and signaling state is in memory. `fly.toml` sets `min_machines_running = 1` and disables auto-stop so WebSockets stay up. Render/Railway work too (Dockerfile, mount a disk at `/data`, set `DATA_DIR=/data`).

## Continuous deploy

`.github/workflows/deploy-server.yml` runs the server tests, builds the image and then `flyctl deploy` (one machine) from the repo root on every push to `main` that touches `server/` or what the image carries (`src/world/`, `src/sim/`, `src/net/ids.ts`, `src/net/ws-wire.ts`), on merged PRs that touch them (dispatched by `automerge.yml`), and by hand from the Actions tab. It then polls `https://<app>.fly.dev/healthz` for up to two minutes. Without a `FLY_API_TOKEN` secret the deploy job is skipped (grey, not red), so forks stay green.

Human checklist, once:

1. [ ] `cd server && fly launch --no-deploy --copy-config --name <your-unique-app-name>`, then put that name in `fly.toml` (or set a `FLY_APP` repo variable to it).
2. [ ] `fly volumes create boogle_data --size 1 --region iad` (one volume, same region as `primary_region`).
3. [ ] `fly secrets set ALLOWED_ORIGINS=https://<you>.github.io`, plus TURN (`TURN_URLS` with `TURN_USERNAME`/`TURN_CREDENTIAL`, or `TURN_SECRET`) and `REPORT_TOKEN` if your server has `/report`.
4. [ ] `fly tokens create deploy` and save it as the `FLY_API_TOKEN` repo secret: `gh secret set FLY_API_TOKEN`.
5. [ ] Run the workflow once (`gh workflow run deploy-server.yml`) and check `curl https://<app>.fly.dev/healthz` says `ok`.
6. [ ] Point the game at it: `gh variable set VITE_BOOGLE_SERVER --body https://<app>.fly.dev` (read by `deploy.yml`), then re-run the Pages deploy.

## Getting TURN

Without TURN, players behind strict NATs or school/corporate networks can't connect. Options:

- **Cloudflare TURN** (what Boogle uses): in the dashboard, Realtime → TURN Server → Create, then `fly secrets set CF_TURN_KEY_ID=<Turn Token ID> CF_TURN_API_TOKEN=<API Token>`. The server mints short-lived credentials itself. Generous free tier.
- **Metered** (free tier) or **Twilio Network Traversal**: copy the TURN URLs and a static username/credential into the three `TURN_*` vars.
- **Self-hosted coturn**: set `use-auth-secret` and `static-auth-secret=<secret>` in `turnserver.conf`, and set `TURN_URLS` and `TURN_SECRET=<secret>` here. Credentials are then ephemeral and never stored.

## Client config

```js
import Peer from 'peerjs';

const SERVER = { host: 'boogle-server.fly.dev', port: 443, secure: true };
// local dev: { host: 'localhost', port: 9000, secure: false }

const base = `${SERVER.secure ? 'https' : 'http'}://${SERVER.host}:${SERVER.port}`;

// ICE servers (fall back to STUN if the server is unreachable)
let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
try { iceServers = (await (await fetch(`${base}/ice`)).json()).iceServers; } catch {}

const peer = new Peer(id, {
  host: SERVER.host,
  port: SERVER.port,
  path: '/peerjs',
  secure: SERVER.secure,
  config: { iceServers },
});

// Snapshots
await fetch(`${base}/rooms/${room}/snapshot`, {
  method: 'PUT',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ tick, writerId: peer.id, data }),
}); // 200 ok, 409 { tick } if stale, 429 if too frequent
const res = await fetch(`${base}/rooms/${room}/snapshot`); // 200 { tick, writerId, data, updatedAt } or 404
```

Reading reports:

```sh
curl -H "Authorization: Bearer $REPORT_TOKEN" "https://<app>.fly.dev/reports?day=2026-10-29" | jq -c 'select(.kind=="connect")'
```

Fetch `/ice` again before each new connection attempt if you use `TURN_SECRET` (credentials expire after `TURN_TTL`).
