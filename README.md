# Boogle

One island, one beach ball, and everyone who has the page open.

Boogle is a small multiplayer browser game built with [three.js](https://threejs.org) and [cannon-es](https://github.com/pmndrs/cannon-es). It is bundled with [Vite](https://vite.dev).

**Contributing?** Read [DESIGN.md](DESIGN.md) (the principles that decide design arguments) and [PLAN.md](PLAN.md) (what we're building next).

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
- `net.js`: presence build/apply, remote players and interpolation. `net/peer-room.js` is the transport (see `net/README.md`); right now it is a solo-only stub until the PeerJS version lands.
- `hud.js`, `input.js`: HUD, roster and lobby; keyboard, mouse, touch and pointer lock.

## Multiplayer

Boogle uses [PeerJS](https://peerjs.com) (WebRTC) for networking: one player's browser hosts the island and everyone else connects to it. See [PLAN.md](PLAN.md) for the design.

> **Status:** the PeerJS transport is Phase 1 of the plan and not written yet. `src/net/peer-room.js` is a stub that runs the island solo; the presence and ball-ownership code in `src/net.js` is already written against its interface.

### How sync works

- Each client publishes one presence object about 20 times a second (`SEND_MS = 50`): name, color, position, yaw, movement state.
- Remote players are drawn 120 ms in the past (`INTERP_MS`) and interpolated between snapshots.
- The ball has a single owner at a time. The owner simulates it and adds it to their presence. Ownership uses an epoch counter: the highest epoch wins, and ties go to the larger peer ID. Grabbing the ball or walking into a slow ball claims it.

## Controls

WASD move · Space jump/swim · Shift sprint · Click grab, hold to charge, release to throw · R bring the ball back · H hide help. Touch devices get a stick and Grab/Jump buttons.

## Roadmap

See [PLAN.md](PLAN.md).
