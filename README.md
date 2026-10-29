# Boogle

One island, one beach ball, and everyone who has the page open.

Boogle is a small multiplayer browser game built with [three.js](https://threejs.org) and [cannon-es](https://github.com/pmndrs/cannon-es). Everything lives in a single file, `index.html`, migrated unchanged from the original claude.ai artifact.

## Run it locally

The page loads three.js and cannon-es from jsDelivr as ES modules, so serve it over HTTP instead of opening the file directly:

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

## Multiplayer today

The networking code (search `// ---- networking` in `index.html`) picks a transport at startup:

| Where it runs | Transport | Who you can play with |
|---|---|---|
| Inside the claude.ai artifact viewer | `window.claude.use('room')` presence | Anyone with the artifact open |
| Anywhere else (localhost, a static host) | `BroadcastChannel('boogle-local-room')` | Other tabs in the **same browser** only |

So until PeerJS networking from [PLAN.md](PLAN.md) (Phase 1) lands, playing with friends off claude.ai doesn't work. Open two tabs to test multiplayer locally.

### How sync works

- Each client publishes one presence object about 20 times a second (`SEND_MS = 50`): name, color, position, yaw, movement state.
- Remote players are drawn 120 ms in the past (`INTERP_MS`) and interpolated between snapshots.
- The ball has a single owner at a time. The owner simulates it and adds it to their presence. Ownership uses an epoch counter: the highest epoch wins, and ties go to the larger peer ID. Grabbing the ball or walking into a slow ball claims it.

## Controls

WASD move · Space jump/swim · Shift sprint · Click grab, hold to charge, release to throw · R bring the ball back · H hide help. Touch devices get a stick and Grab/Jump buttons.

## Roadmap

See [PLAN.md](PLAN.md).
