# Live session tooling report

Built `npm run session`: one detached browser and local stack per harness checkout, a token-protected
loopback endpoint in `.look/session.json`, and short command clients. The daemon rejects overlapping
commands, releases held keys on failure, closes after 30 idle minutes, and closes a command that hangs
for two minutes. `stop` waits for cleanup. The server dependency graph loads only in the daemon.

`warp.ts` now exposes `pause()` and `step(seconds)`. Steps use fixed 60 Hz page time, draw every frame
in a session, and finish paused. `observe.ts` exposes current visible DOM lines without inflating its
historical time-shown counters. Stack startup now reports Vite's actual error and removes its temporary
server save directory when Vite fails. No gameplay, sync contract or game-design changes; no new tests.
Principle served: DESIGN.md 11, **Show, don't tell**.

## Commands and example

Run from this checkout. `--root` selects the build served; the session address, stills and `--at` save
lookup belong to the harness checkout. Page-code files passed to `eval` resolve from the caller's cwd.

| Command after `npm run session --` | Meaning |
| --- | --- |
| `start [--at "beat"] [--query 'proto=place&fresh=1'] [--room name] [--root dir]` | Boot once, return when ready; `--at list` lists existing playthrough saves |
| `eval 'return window.__warp.now()'` or `eval path/to/body.ts` | Evaluate a page-code body; supports top-level await and a returned JSON value |
| `step 1` | Advance one second without input |
| `keys KeyW,ShiftLeft 1` | Hold real keyboard input for one game second, then release |
| `press` | Interact (`KeyE`) for 0.1 seconds |
| `look 20 -10` | Relative right/up angles in degrees; this turns right and down, advancing one frame |
| `still first` | Print a PNG path under `.look/session/` |
| `state` / `state --blind` | Current objective, offered prompt and visible DOM text; blind omits position |
| `reload` | Reload the same context/room; keep storage and remove the initial `fresh=1` reset |
| `stop` | Close browser, stack and endpoint; safe when already stopped |

Example director run (instructions, **not a completed playtest**):

```sh
npm run session -- start --query 'proto=place&fresh=1'
npm run session -- still first
npm run session -- state --blind
# Open first-still.png. Only after discovering movement in the on-screen controls:
npm run session -- keys KeyW 0.5
npm run session -- still second
npm run session -- state --blind
# Continue from each new screenshot, following playtester.md, for 30 decision steps.
npm run session -- stop
```

## Attempted playtest log

Budget: 30 decision steps. **0 completed.** The sandbox blocked startup before Chromium launched.
I read the tooling and required repo guidance while building this; a director should use a fresh agent
context with [playtester.md](playtester.md) for an independent first visit.

```text
00 | start --query 'proto=place&fresh=1' | no image | I see a startup error, not the game; I think the director must run the playtest outside this restriction; because Vite cannot write its temporary config into the shared node_modules target (EPERM).
```

Actual error, now surfaced by the session CLI:

```text
Error: vite did not start: failed to load config from .../live-session/vite.config.ts
Error: EPERM: operation not permitted, open '.../live-session/node_modules/.vite-temp/vite.config.ts.timestamp-....mjs'
```

The linked dependency directory belongs to another checkout and was left alone. No dependency installs,
external network calls, broker changes, pushes or ships. `dev/codex/see.ts` also starts this Vite stack
and its existing broker handles one-shot captures, not a persistent session, so it is not a fallback
for this failure. Cleanup was observed: no session address remained and `stop` said `already stopped`.
No PNGs were produced or inspected. There are no gameplay findings, misunderstandings or unnoticed
features to report; the 30-step screenshot run is left to the director as requested.

## Timing and checks

Each command prints its Node process wall time to stderr (including imports; excluding npm startup).
The early failure originally waited for Vite's startup deadline; the improved failure path stops when
Vite exits. The last blocked startup measured 0.611 s inside the command before the timing counter was
expanded to include module loading. This is a failure-path measurement, not a successful boot time.

| Measured command | Node seconds | Whole shell command seconds |
| --- | ---: | ---: |
| `stop` with no session | 0.091 | 0.174 |
| `state --blind` with no session (expected failure) | 0.085 | 0.169 |
| Successful boot, eval, step, keys, press, look, still, state, reload | Unmeasured: startup blocked | Unmeasured |

Formatted changed files with `npx prettier --write`; changed TypeScript also passed ESLint.
`npm run check` passed lint, typecheck, **292/292 unit tests**, registry, five level checks and assets,
then failed at `vite build` with the same `.vite-temp` permission error.
`npm run check -- -- --configLoader native` forwards the supported native config loader to the final
build and passed the full pipeline without writing that temporary config into shared dependencies.
It printed `registry: ok (16 presence keys, 11 message types, 16 ops, 10 states)`,
`assets: 4 fresh, 590.2 KB in all`, and a successful production build.

## Limits and remaining verification

- This pauses the **page clock**, not the server, network callbacks, audio, workers or another player.
  Server-owned world changes can arrive while the agent thinks. It is not a deterministic multiplayer replay.
- CSS transitions/animations are suppressed by the existing warp mechanism. Fixed-step screenshots
  cannot establish real-time feel, smoothness or sound. No real-time motion was observed here.
- Blind state reports current DOM text, not canvas signs, hidden state or observer history. Screenshots
  remain authoritative for world signs, occlusion and interpretation. The brief forbids `eval`, coordinates,
  debug helpers, source code and saved beats; blind mode is a protocol, not a security boundary.
- `look` changes the normal player camera's relative angles; it is not a physical mouse-drag test.
  `keys` uses Playwright keyboard down/up events. Durations are limited to 60 seconds and rounded up to a frame.
- An `eval` awaiting a paused timer will wait forever unless its code also steps/resumes the warp clock;
  the command deadline then closes the session. After normal commands the page is paused again.
- Reload keeps what the game saves, not arbitrary transient state or the exact pose. `--at` restores the
  existing playthrough helper's local-storage snapshot and pose, not a complete server-world snapshot.
  Stop deletes this stack's temporary server storage and browser context; a new start is a new visit.
- Successful browser startup, idle timeout, input duration, pause invariance, screenshot freshness,
  blind-text accuracy, saved-beat restore and reload persistence still require live verification.
