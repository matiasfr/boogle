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

Needs Node 22 or newer. Other scripts: `npm run check` (lint, unit tests, build), `npm run build` (production bundle in `dist/`), `npm run preview` (serve the build), `npm run ship` (ship your commits to `main` through a PR that merges itself; see [CONTRIBUTING.md](CONTRIBUTING.md)). Pick a room with `/?room=my-friends` (letters, digits and dashes; defaults to `beach`).

## Code layout

`index.html` holds only the markup; the game lives in `src/`:

- `main.js`: boot and the frame loop. `loop.js`: `onFrame`/`onStart` hooks. `features/`: self-contained features (splashes, the Boogler, mushrooms, ...), each auto-loaded with its own CSS and DOM.
- `constants.js`, `math.js`: shared tuning values, math and noise helpers. `style.css`: base styles.
- `render/`: renderer, camera, lights, sky, sea shader, props (palms/rocks/clouds), particles, splashes and the shared audio context.
- `physics/`: cannon-es world, materials and step hooks; the ball and its ownership rules; thrown-item flights.
- `player/`: the local player and camera, avatar meshes, hands and hotbar, input and the control registry, HUD.
- `netplay/`: `net.js` (presence, remote players and interpolation) and its pure helpers. `net/peer-room.js` is the PeerJS transport (see [src/net/README.md](src/net/README.md)).
- `adapters/`: game-side halves of the lockstep rules (terrain mesh, gifts, mushroom garden). `boogler/`: The Boogler NPC, his talk and friendship.
- `world/`: shared deterministic state, edit sync and snapshots (see [src/world/README.md](src/world/README.md)). `sim/`: pure simulation logic (mushrooms, gifts, RNG) with unit tests in `test/`.
- [src/README.md](src/README.md) maps every folder.

## Multiplayer

### Playing with friends

- **Quick try:** `npm run dev` uses PeerJS's free public signaling server. Share the same `?room=` name with friends.
- **Our server:** copy `.env.example` to `.env` and set `VITE_BOOGLE_SERVER` to your deployed `server/` URL (see [server/README.md](server/README.md)). The game then uses our signaling server and fetches TURN settings from `/ice`.
- **Local two-tab test:** run `cd server && npm run dev`, set `VITE_BOOGLE_SERVER=http://localhost:9000`, run `npm run dev`, and open two tabs. Add `?netdebug=1` to the URL for connection logs.

Boogle uses [PeerJS](https://peerjs.com) (WebRTC) for networking: one player's browser hosts the island and everyone else connects to it (see PLAN.md, "Key decision"). `npm run test:net` runs a multiplayer test with 3 headless browsers and a local PeerJS server.

### How sync works

- Each client publishes one presence object about 20 times a second (`SEND_MS = 50`): name, color, position, yaw, movement state.
- Remote players are drawn 120 ms in the past (`INTERP_MS`) and interpolated between snapshots.
- The ball has a single owner at a time. The owner simulates it and adds it to their presence. Ownership uses an epoch counter: the highest epoch wins, and ties go to the larger peer ID. Grabbing the ball or walking into a slow ball claims it.

## Controls

WASD move · Space jump · Mouse look · Click use what you hold (hold to charge a throw) · E interact. H, Esc or the menu button: menu and all controls; Menu on a gamepad. Touch devices get a stick and buttons. It is generated from the control registry in `src/player/controls.js`, so a new control describes itself there.

## Deploying

Every merge to `main` builds and deploys to GitHub Pages at https://boogle.club/ (custom domain, set in the repo's Pages settings) via `.github/workflows/deploy.yml`, which runs lint, then `npm run build` (base `/`; a fork without a custom domain sets `BASE: /<repo>/`). You can also run it by hand from the Actions tab. The repo's Pages source must be set to "GitHub Actions".

To use our own signaling server, set a repo variable named `VITE_BOOGLE_SERVER` (Settings, Secrets and variables, Actions, Variables) to the server URL, or run `gh variable set VITE_BOOGLE_SERVER --body https://your-app.fly.dev`, then re-run the workflow. Unset, the build uses PeerJS's public server.

## Roadmap

See [PLAN.md](PLAN.md).
