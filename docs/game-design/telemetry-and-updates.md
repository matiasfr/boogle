# 6.15 Telemetry and updates

- **Telemetry.** Sends JS errors, desyncs (which states, which tick), snapshot load failures and connection outcomes
  (with `role` (lead or client), `transport` (8.1), `mixedBuilds` and `gfx`; a good join also sends the round trip to
  the server as `rttMs`) to `POST /report`, only when `VITE_BOOGLE_SERVER` is set. Nothing personal.
  At most 20 reports per page load, each duplicate at most twice, batched every 10 s and on pagehide with
  `sendBeacon`. A join still "connecting" after 30 s reports as stuck. Local.
  File: [src/features/telemetry.ts](../../src/features/telemetry.ts).
- **Playtest data.** Any `?proto=` or `?play` page uploads what the session did, with no prompt: only the owner and his
  friends play these and they consent. `&notrack=1` turns it off; it works in `&fresh=1` and `&coop=1`. The session (name,
  room, card, variant, flags, build, device, browser, viewport, resolution, who else is in the room), position to the
  metre once a second with activity and place, each objective change, marks (`playMark`, below), presses per action and
  which device, interact prompts shown and pressed, standing still for 5 s or more, pushing against something for 1.5 s or
  more, falling in the water and being moved far, frame times (p50, p95, worst) every 5 s with resolution steps, a
  CPU section line every 30 s, and each different error once. No audio and no typed text but the name and the verdict's
  note; no GPU time, since it needs `?prof=1`'s timestamps. Batches go every 5 s and when the tab hides (`sendBeacon`),
  with a queue of 4000 events while offline and 3.5 MB per session.
  The server (`POST /playdata`) validates and caps it: 64 KB a body, 4 MB a session, 40 new sessions per IP an hour, 200 MB
  in all with the oldest sessions deleted first, those that look played (a name, over a minute) last. `npm run playtest` lists sessions; `npm run playtest -- latest` (or an
  id, or `--compare a b`) downloads to `.look/playtest/`, prints a summary and draws a heat map.
  A prototype adds beats with `playMark('crate opened', { kind: 'hat' })`, `playObjective(text)` and `playWhere(fn)` from
  `src/proto/mark.ts`; `protoMark` and `protoCount` already reach it. Local.
  Files: [src/proto/playdata/record.ts](../../src/proto/playdata/record.ts),
  [server/src/playdata.ts](../../server/src/playdata.ts), [dev/playtest/cli.ts](../../dev/playtest/cli.ts).
- **Mixed builds.** Each tab checks `version.json` on start, every 5 min and when it comes back into view. A hidden tab
  reloads onto a newer build at once; a visible one shows "Boogle was updated – reload to stay in sync with friends"
  as a sticky notice in the notification lane ([hud.md](hud.md)) with a Reload button, and reloads the next time it is
  hidden. Each player's build rides in presence `bv`.
  Files: [src/features/updates.ts](../../src/features/updates.ts), [src/netplay/builds.ts](../../src/netplay/builds.ts).
- **Loading across a deploy.** A deploy replaces every hashed file at once, so a page mid-load could ask for one that's
  gone. Each deploy keeps what left the build in the last 30 minutes published, so it still finds them. As a fallback,
  in its first 60 s a page that can't fetch a part of the game reloads once (and not again within 60 s), rather than
  sit on the loading screen for good. After that it stays put, and the notice above covers it. Local.
  Files: [scripts/keep-old-assets.ts](../../scripts/keep-old-assets.ts),
  [src/boot/chunk-reload.ts](../../src/boot/chunk-reload.ts).
- **Desync visibility (dev).** `?netdebug=1` shows an overlay of role, hash checks and per-state status, and on a
  mismatch saves both sides' diverging state as JSON. The stub [src/features/syncsafety.ts](../../src/features/syncsafety.ts)
  loads [src/debug/netdebug.ts](../../src/debug/netdebug.ts) only with the flag; `?debugcam=1` likewise loads
  [src/debug/debug-cam.ts](../../src/debug/debug-cam.ts).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
