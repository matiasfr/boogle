# Boogle

One island, one beach ball, and everyone who has the page open.

Boogle is a small multiplayer browser game built with [three.js](https://threejs.org) and [cannon-es](https://github.com/pmndrs/cannon-es). It is bundled with [Vite](https://vite.dev).

**Contributing?** Start with [CONTRIBUTING.md](CONTRIBUTING.md), then read [DESIGN.md](DESIGN.md) (the principles that decide design arguments) and [PLAN.md](PLAN.md) (what we're building next).

## Run it locally

```sh
npm install
npm run dev
# then open the URL Vite prints (http://localhost:5173)
```

Other scripts: `npm run build` (production bundle in `dist/`), `npm run preview` (serve the build), `npm run lint`, `npm run format`. Pick a room with `/?room=my-friends` (letters, digits and dashes; defaults to `beach`).

## Code layout

`index.html` holds only the markup; the game lives in `src/`:

- `main.js`: boot and the frame loop. `style.css`: all styles.
- `constants.js`, `math.js`: shared tuning values, math and noise helpers.
- `terrain.js`, `water-render.js`, `scene.js`, `props.js`: heightfield and mesh, sea shader, renderer/camera/lights/sky, palms/rocks/clouds.
- `physics.js`: cannon-es world, materials, ground body and the buoyancy/movement step hooks.
- `ball.js`, `player.js`, `avatars.js`: the ball and its ownership rules, the local player and camera, avatar meshes.
- `net.js`: presence build/apply, remote players and interpolation. `net/peer-room.js` is the transport (see `net/README.md`); see the protocol notes at the top of that file.
- `hud.js`, `input.js`: HUD, roster and lobby; keyboard, mouse, touch and pointer lock.

## Multiplayer

### Playing with friends

- **Quick try:** `npm run dev` uses PeerJS's free public signaling server. Share the same `?room=` name with friends.
- **Our server:** copy `.env.example` to `.env` and set `VITE_BOOGLE_SERVER` to your deployed `server/` URL (see [server/README.md](server/README.md)). The game then uses our signaling server and fetches TURN settings from `/ice`.
- **Local two-tab test:** run `cd server && npm run dev`, set `VITE_BOOGLE_SERVER=http://localhost:9000`, run `npm run dev`, and open two tabs. Add `?netdebug=1` to the URL for connection logs.


Boogle uses [PeerJS](https://peerjs.com) (WebRTC) for networking: one player's browser hosts the island and everyone else connects to it. See [PLAN.md](PLAN.md) for the design.

> **Status:** working. `src/net/peer-room.js` implements the host-peer room; `npm run test:net` runs a 22-check multiplayer test (3 headless browsers + a local PeerJS server).

### How sync works

- Each client publishes one presence object about 20 times a second (`SEND_MS = 50`): name, color, position, yaw, movement state.
- Remote players are drawn 120 ms in the past (`INTERP_MS`) and interpolated between snapshots.
- The ball has a single owner at a time. The owner simulates it and adds it to their presence. Ownership uses an epoch counter: the highest epoch wins, and ties go to the larger peer ID. Grabbing the ball or walking into a slow ball claims it.

## Controls

WASD move · Space jump/swim · Shift sprint · Click grab, hold to charge, release to throw · R bring the ball back · H hide help. Touch devices get a stick and Grab/Jump buttons.

## Deploying

Every push to `main` builds and deploys to GitHub Pages (https://matiasfr.github.io/boogle/) via `.github/workflows/deploy.yml`, which runs lint, then `BASE=/boogle/ npm run build`. You can also run it by hand from the Actions tab. The repo's Pages source must be set to "GitHub Actions".

To use our own signaling server, set a repo variable named `VITE_BOOGLE_SERVER` (Settings, Secrets and variables, Actions, Variables) to the server URL, or run `gh variable set VITE_BOOGLE_SERVER --body https://your-app.fly.dev`, then re-run the workflow. Unset, the build uses PeerJS's public server.

## Roadmap

See [PLAN.md](PLAN.md).
