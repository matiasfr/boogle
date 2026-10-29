# Research: netcode for browser physics games

*Research notes, October 2026. Multi-source web research with each claim checked by three independent verifiers; only claims that survived are kept here. Background for the networking rows of [DESIGN.md](../../DESIGN.md) ("Clear authority") and [src/net/README.md](../../src/net/README.md).*

**Bottom line for Boogle:** our current split is the one the evidence supports. Keep cannon-es physics **host-authoritative** and stream its state to peers. Keep the shared world sim (water, terrain, tide) on **integers with a fixed tick**, and treat native trig as off-limits there, the same as `Math.random()`. Don't try lockstep or rollback on top of cannon-es.

## What held up

### 1. Native trig differs between browsers (high confidence)

`Math.sin`, `Math.cos`, `Math.tan` and the inverse functions are not required by the JS spec to be bit-exact, and Firefox and Chrome really do return different results (Firefox uses the platform libm; V8 has changed implementations more than once). Real simulations have diverged between browsers because of it.

- Any float physics in plain JS, cannon-es included, can drift between peers. Running it on every client and hoping it stays in sync will fail.
- In the deterministic sim, avoid trig entirely or use integer/fixed-point tables. Today the only trig near `src/sim` and `src/world` is cosmetic: the placement ring in `terrain-edits.js` and the moon's lit fraction in `sky-clock.js`.
- Polyfills such as `trigfills` (2017) make results match, but at roughly 9 to 10 significant digits, and they do not transparently fix an existing engine. Not worth pulling in.

Sources: [Rapier determinism docs](https://www.rapier.rs/docs/user_guides/rust/determinism), [trigfills](https://classic.yarnpkg.com/en/package/trigfills).

### 2. WASM physics is a better lockstep candidate, but unproven (medium)

The NetplayJS author reports that WASM float math is cross-platform deterministic apart from NaN bit patterns, so Ammo.js or Rapier would be better than cannon-es for lockstep or rollback. However:

- The claim that Rapier's JS build is bit-identical across browsers was **rejected 0–3** by verifiers despite its docs, and so was the claim that snapshot hashes match across machines. Treat it as something to test, not a guarantee.
- Determinism also requires the same engine version and parameters, and bodies, colliders and joints added and removed in exactly the same order.

If we ever want rollback, the first step is a cross-browser snapshot-hash test (Chrome, Firefox, Safari; x86 and ARM), not a rewrite.

Sources: [NetplayJS](https://www.npmjs.com/package/netplayjs), [Rapier determinism docs](https://www.rapier.rs/docs/user_guides/rust/determinism).

### 3. NetplayJS is the closest existing design (high)

NetplayJS does rollback netcode over peer-to-peer WebRTC, with lockstep for state that can't be rewound. It doesn't require deterministic game code: by default the host sends authoritative state to correct drift. That "everyone predicts, the host corrects" hybrid is the pattern that fits non-deterministic JS physics.

It is a reference design for us, not a dependency. It needs serializable game state, fits lightweight frameworks better than engines with their own entity systems, brings its own signaling server, and its maintenance status is unclear (latest 0.4.1). We already have our own room layer on PeerJS.

Source: [NetplayJS](https://www.npmjs.com/package/netplayjs).

### 4. Transport choice matters only under packet loss (low)

In one informal benchmark on localhost, WebSocket, unreliable WebRTC and unreliable WebTransport performed about the same at 0% loss. At 15% loss, WebSocket fell behind because TCP blocks on every lost packet, and the UDP-style channels didn't.

- This supports sending frequent physics state over **unreliable** PeerJS data channels and keeping reliable channels for edits.
- Caveats: Go servers on localhost, not browser to browser; no numbers or run counts; nothing about NAT traversal or TURN fallback, which are the real concerns for a player-hosted game. WebTransport needs a server, so a browser host can't offer it.

Source: [Sh3b0/realtime-web](https://github.com/Sh3b0/realtime-web).

## Not verified (inference only)

Nothing survived verification on snapshot interpolation buffers, client-side prediction and reconciliation, per-object ownership, delta snapshots and quantization, or the frameworks Colyseus, Geckos.io, Croquet/Multisynq and Lance.gg. The classic references ([Gaffer on Games](https://gafferongames.com/post/snapshot_interpolation), [Gabriel Gambetta](https://gabrielgambetta.com/client-side-prediction-server-reconciliation.html), [Unity distributed authority](https://mp-docs.dl.it.unity3d.com/netcode/2.2.0/terms-concepts/distributed-authority/)) were found but yielded no checked claims, most likely because they couldn't be fetched. Read them directly before designing in these areas.

## Open questions

- Is Rapier's WASM build bit-identical across Chrome, Firefox and Safari on x86 and ARM? A snapshot-hash test would settle it.
- For 2 to 8 friends, how do host-authoritative snapshot interpolation and per-object ownership (each client simulates what it's touching) compare on felt latency and bandwidth?
- Which compression gives the most over PeerJS unreliable channels: quantized positions, smallest-three quaternions, dirty-body bitmasks?
- How often do PeerJS connections fall back to TURN in real friend groups, and what does that add compared with a hosted server?
