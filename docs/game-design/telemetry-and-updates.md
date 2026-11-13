# 6.15 Telemetry and updates

- **Telemetry.** Sends JS errors and connection outcomes
  (with `role` (lead or client), `transport` (8.1), `mixedBuilds` and `gfx`; a good join also sends the round trip to
  the server as `rttMs`) to `POST /report`, only when `VITE_BOOGLE_SERVER` is set. Nothing personal.
  At most 20 reports per page load, each duplicate at most twice, batched every 10 s and on pagehide with
  `sendBeacon`. A join still "connecting" after 30 s reports as stuck. Local.
  File: [src/features/telemetry.ts](../../src/features/telemetry.ts).
- **Prototype catalog.** `/protos/` lists cards with play and variant links, recorded answers, local counters and heat
  maps of recorded sittings. Feedback comes from playtests and feedback forms; the catalog collects no notes or verdicts.
  `?trace=1` still displays recorded traces. Internal `?review=` links retain their separate review submission.
- **Playtest data.** Any effective prototype page (including the default Place entry) uploads what the session did, with no prompt: only the owner and his
  friends play these and they consent. `&notrack=1` turns it off; it works in `&fresh=1` and `&coop=1`. The session (name,
  room, card, variant, flags, build, device, browser, viewport, resolution, who else is in the room), position to the
  metre once a second with activity and place, each objective change, marks (`playMark`, below), presses per action and
  which device, interact prompts shown and pressed, standing still for 5 s or more, pushing against something for 1.5 s or
  more, falling in the water and being moved far, frame times (p50, p95, worst) every 5 s with resolution steps, a
  CPU section line every 30 s, and each different error once. No audio and no typed text but the name;
  no GPU time, since it needs `?prof=1`'s timestamps. Batches go every 5 s and when the tab hides (`sendBeacon`),
  with a queue of 4000 events while offline and 3.5 MB per session.
  The server (`POST /playdata`) validates and caps it: 64 KB a body, 4 MB a session, 40 new sessions per IP an hour, 200 MB
  in all with the oldest sessions deleted first, those that look played (a name, over a minute) last. `npm run playtest` lists sessions; `npm run playtest -- latest` (or an
  id, or `--compare a b`) downloads to `.look/playtest/`, prints a summary and draws a heat map.
  A prototype adds beats with `playMark('crate opened', { kind: 'hat' })`, `playObjective(text)` and `playWhere(fn)` from
  `src/proto/mark.ts`; `protoMark` and `protoCount` already reach it. Local.
  Production railway marks use server confirmations (including acknowledgements of predicted actions) for wake,
  chopping, material deposits, shared tools, levers, pack, cart calls and depot pickups. Consistent replicated state
  supplies funding/laying edges for T1–T3 and Q1–Q6 and forge ignition; initial snapshots and refills establish a baseline
  without claiming historical work. Marks distinguish your actions from teammates'. Hook pulls, summit/Far Head
  arrivals and cart boarding are Local/Owner observations, labelled separately from server acceptance. Refusals retain
  action and reason, including the locally blocked sea switch before Q4. Empty interact presses include the nearest
  previously shown prompt (up to 128 remembered sites), distance and last-prompt age; unknown prompts remain unknown.
  These small flat marks share the recorder's existing rate, queue and session limits and add no personal data.
  The CLI prints a railway objective timeline and refusals by kind.
  Files: [src/proto/playdata/record.ts](../../src/proto/playdata/record.ts),
  [server/src/playdata.ts](../../server/src/playdata.ts), [dev/playtest/cli.ts](../../dev/playtest/cli.ts).
- **Startup hitches.** For the first 20 seconds after loading, at most 120 invisible `startup frame` marks identify
  rendered callback intervals or CPU work over 33 ms. Each keeps current and previous CPU sections, the largest named
  work span in each callback and between callbacks, skipped draws and visibility. A long interval includes the previous
  callback's work; named spans can overlap and are never summed. These are CPU/API timings, not GPU duration or proof
  of display presentation. The opt-in startup timeline retains the same marks. Local.
  File: [src/boot/startup-frames.ts](../../src/boot/startup-frames.ts).
- **Mixed builds.** Each tab checks `version.json` on start, every 5 min and when it comes back into view. A hidden tab
  reloads onto a newer build at once; a visible one shows "Boogle was updated – reload for the latest version"
  as a sticky notice in the notification lane ([hud.md](hud.md)) with a Reload button, and reloads the next time it is
  hidden. Each player's build rides in presence `bv`.
  The notice wraps within phone safe areas and keeps a 44 px Reload button. Its borrowed D-pad glyph appears only while a gamepad is active; touch and keyboard show Reload alone, including after switching input modes.
  Files: [src/features/updates.ts](../../src/features/updates.ts), [src/netplay/builds.ts](../../src/netplay/builds.ts).
- **Loading across a deploy.** During development, deploys publish only the current build and service-worker activation
  keeps only its cache. Unchanged immutable files can be reused during installation. Old tabs may lose lazy files,
  as accepted by the owner's "No old builds in development" call. In its first 60 s a page that can't fetch a part
  of the game reloads at most twice, after 0.5 then 1.5 seconds.
  A sessionStorage budget carries across reloads and expires after 60 seconds without a retry. Evaluation errors
  do not trigger reloads, and failed imports still reject. Once exhausted the lobby explains that loading failed.
  Later in a visit it stays put, and the notice above covers it. The service worker retries HTTP 503s before returning
  uncached assets and during precache; only successful responses enter its cache. WASM retries belong to the page's
  loader so a controlling worker does not multiply the retry budget. Local.
  Files: [src/boot/sw-policy.ts](../../src/boot/sw-policy.ts), [src/boot/chunk-reload.ts](../../src/boot/chunk-reload.ts).
- **Room visibility (dev).** `?netdebug=1` shows clock readiness, role, server tick, lead, round-trip time and build.
  The classic hash comparisons and divergence dumps retired at v40; checkpoint failures remain in server diagnostics.
  The stub [src/features/syncsafety.ts](../../src/features/syncsafety.ts)
  loads [src/debug/netdebug.ts](../../src/debug/netdebug.ts) only with the flag; `?debugcam=1` likewise loads
  [src/debug/debug-cam.ts](../../src/debug/debug-cam.ts).

- **Startup recorder (opt-in diagnostic).** `&startup=1` loads a Local recorder before the game module, reusing the
  boot timeline's marks. For 90 seconds it observes existing rAF callbacks, pipeline API durations and supported
  Long Animation Frames. The bottom-left panel copies or saves JSON, with selectable text when clipboard access is
  unavailable. `&startupVideo=1` adds a tiny canvas-capture video and its presentation callbacks; that extra workload
  is explicitly labeled and is not physical screen presentation. Water visibility is a splash-removal proxy.
  No recorder module, observers, GPU hooks or DOM are installed without `startup=1`. No new upload endpoint or game
  state. Files: [startup-record.ts](../../src/debug/startup-record.ts), [cold-start procedure](../research/water-cold-start.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
