# 6.15 Telemetry and updates

- **Telemetry.** Sends JS errors, desyncs (which states, which tick), snapshot load failures and connection outcomes
  (with `hadTurn`, `role` (host, client, or server when the server hosts the room), `transport` (8.1), `mixedBuilds`
  and `gfx`; a good join also sends `links`, how many of them go through the TURN relay
  as `relayed`, and the slowest link's round trip as `rttMs`) to `POST /report`, only when `VITE_BOOGLE_SERVER` is set. Nothing personal.
  At most 20 reports per page load, each duplicate at most twice, batched every 10 s and on pagehide with
  `sendBeacon`. A join still "connecting" after 30 s reports as stuck. Local.
  File: [src/features/telemetry.js](../../src/features/telemetry.js).
- **Mixed builds.** Each tab checks `version.json` on start, every 5 min and when it comes back into view. A hidden tab
  reloads onto a newer build at once; a visible one shows "Boogle was updated – reload to stay in sync with friends"
  with a Reload button and reloads the next time it is hidden. Each player's build rides in presence `bv`.
  Files: [src/features/updates.js](../../src/features/updates.js), [src/netplay/builds.ts](../../src/netplay/builds.ts).
- **Desync visibility (dev).** `?netdebug=1` shows an overlay of role, hash checks and per-state status, and on a
  mismatch saves both sides' diverging state as JSON. The stub [src/features/syncsafety.js](../../src/features/syncsafety.js)
  loads [src/debug/netdebug.js](../../src/debug/netdebug.js) only with the flag; `?debugcam=1` likewise loads
  [src/debug/debug-cam.js](../../src/debug/debug-cam.js).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
