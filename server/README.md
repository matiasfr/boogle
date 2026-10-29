# Boogle server

One small Node 20+ service (Express + the official `peer` package) that gives the P2P game the few things WebRTC can't do alone:

| Endpoint | Purpose |
|---|---|
| `/peerjs` | PeerJS signaling (WebSocket + REST), via `ExpressPeerServer`. Discovery disabled. Logs connect/disconnect counts only. |
| `GET /rooms/:roomId/snapshot` | Stored garden snapshot (200 JSON) or 404. |
| `PUT /rooms/:roomId/snapshot` | Body `{ tick: number, writerId: string, data: any }`. Stored unless the stored tick is higher (409 with the current tick). Max 256 KB (413). `roomId` must match `^[a-z0-9-]{1,32}$` (400). 30 PUTs/min/IP (429). Max `MAX_ROOMS` rooms (507). |
| `POST /report` | Problem reports from players' browsers (`src/features/telemetry.js`): one `{ room, kind, detail, tick?, build?, ua? }` or an array of up to 10. `kind` is `error`, `desync`, `snapshot` or `connect`; `detail` is a string (cut to 500 chars) or a flat object of strings/numbers/booleans (12 keys, strings cut to 200). Other fields are dropped; no IP or headers are kept. Accepts `text/plain` (what `navigator.sendBeacon` sends) or JSON. 204 stored, 400 invalid, 413 over 8 KB, 429 over `REPORT_RATE_PER_MIN`, 507 when today's file is full. |
| `GET /reports?day=YYYY-MM-DD` | That UTC day's reports as JSON lines (default today; empty if none). Only exists when `REPORT_TOKEN` is set (404 otherwise) and needs `Authorization: Bearer <REPORT_TOKEN>` (401). |
| `GET /ice` | `{ iceServers: [...] }` with Google STUN, plus TURN if configured. |
| `GET /healthz` | `ok` |

Snapshots are one JSON file per room in `DATA_DIR`, written atomically (temp file + rename). Reports are appended, one JSON line each with a server timestamp `at`, to `DATA_DIR/reports/YYYY-MM-DD.jsonl`. No database. CORS applies to every endpoint.

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
| `TURN_TTL` | `86400` | Lifetime in seconds of ephemeral TURN credentials. |

## Run locally

```sh
cd server
npm ci
npm run dev        # node --watch, http://localhost:9000
npm test
```

## Deploy to Fly.io

```sh
cd server
fly launch --no-deploy --copy-config --name <your-unique-app-name>   # edit app name in fly.toml
fly volumes create boogle_data --size 1 --region iad
fly secrets set ALLOWED_ORIGINS=https://<your-site-origin>
# optional, to read reports over HTTP:
fly secrets set REPORT_TOKEN=$(openssl rand -hex 16)
# optional TURN:
fly secrets set TURN_URLS=turn:turn.example.com:3478 TURN_USERNAME=... TURN_CREDENTIAL=...
fly deploy
curl https://<app>.fly.dev/healthz
```

Keep it on a single machine: the volume is per-machine and signaling state is in memory. `fly.toml` sets `min_machines_running = 1` and disables auto-stop so WebSockets stay up. Render/Railway work too (Dockerfile, mount a disk at `/data`, set `DATA_DIR=/data`).

## Getting TURN

Without TURN, players behind strict NATs or school/corporate networks can't connect. Options:

- **Cloudflare Calls TURN**: create a TURN key in the dashboard; it issues short-lived credentials via API, so mint them there and set the result as `TURN_URLS`/`TURN_USERNAME`/`TURN_CREDENTIAL`, or run a small proxy. Generous free tier.
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
