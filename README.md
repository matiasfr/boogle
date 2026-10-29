# Boogle

One island, one beach ball, and everyone who has the page open.

Boogle is a small multiplayer browser game built with [three.js](https://threejs.org) and [cannon-es](https://github.com/pmndrs/cannon-es). Everything currently lives in a single file, `index.html`.

## Run it locally

The page loads three.js and cannon-es from jsDelivr as ES modules, so serve it over HTTP instead of opening the file directly:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Multiplayer

Boogle uses [PeerJS](https://peerjs.com) (WebRTC) for networking: one player's browser hosts the island and everyone else connects to it. See [PLAN.md](PLAN.md) for the design.

> **Status:** the PeerJS transport is Phase 1 of the plan and not written yet. `index.html` still contains the networking code from the original prototype, which will be replaced.

### How sync works

- Each client publishes one presence object about 20 times a second (`SEND_MS = 50`): name, color, position, yaw, movement state.
- Remote players are drawn 120 ms in the past (`INTERP_MS`) and interpolated between snapshots.
- The ball has a single owner at a time. The owner simulates it and adds it to their presence. Ownership uses an epoch counter: the highest epoch wins, and ties go to the larger peer ID. Grabbing the ball or walking into a slow ball claims it.

## Controls

WASD move · Space jump/swim · Shift sprint · Click grab, hold to charge, release to throw · R bring the ball back · H hide help. Touch devices get a stick and Grab/Jump buttons.

## Roadmap

See [PLAN.md](PLAN.md).
