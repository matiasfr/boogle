---
name: look
description: Inspect a feature in the running game with targeted stills and real-time motion; use scenario assertions for sync contracts. Use after visual, feel, physics or multiplayer changes to close the loop on your work.
---

# Look and validate

Use `dev/look/` for visual evidence and `dev/scenarios/` for assertions on sync contracts. The harness starts Vite and a local game server, drives Chromium and cleans up after itself. Output goes to `.look/` (gitignored). Open the generated images and watch real-time recordings when judging motion. A visible change puts an inspected still on its PR (`scripts/pr-shot.sh <png>...`; AGENTS.md, "Shipping"). Evidence and measurement rationale: `docs/research/visual-validation.md`.

Before capturing, name one question, the action that reveals it, the camera/device that frames it, and the expected visible result. A generic island capture only checks startup. Report the observation separately from the command's exit status; never call a low pixel-change score a visual pass.

## 1. Inspect: `npm run look`

In Codex, use `--query 'proto=place'` rather than `BOOGLE_QUERY=`, since its rules don't see past an environment variable (AGENTS.md, "Codex").

```
npm run look -- --view hill                           # startup/capture check only
npm run look -- --cam -10,12,-14 --look -22,3.5,-21 --question "Does the feature read from here?"
# setup.ts and action.ts are task-specific page-code bodies:
npm run look -- --eval setup.ts --action action.ts --video --seconds 5 --question "Does the action visibly complete?"
npm run look -- --heatmap --region 0.3,0.3,0.4,0.4 --question "Does this stationary prop flicker?"
```

Default outputs are `<name>-still.png` and `<name>-motion.png` (8 timestamped screenshots over 2 seconds). A sheet shows coarse poses; it can miss brief glitches and does not prove smoothness. Use `--video` for `<name>-realtime.webm`, recorded after warm-up without advancing a fake clock. Playback answers the visible-motion question; recording overhead and encoded frame cadence mean it is not a performance benchmark. Use the live game and `npm run hitches` for frame stalls.

`--eval setup.ts` runs before camera placement and warm-up. `--action action.ts` runs after warm-up and after video starts; it should initiate the action and return so the sheet samples the action too. Page-code bodies may use top-level await, end in `export {};`, and must not contain a top-level return (Node strips the types before evaluation). Ready-made setup files: `dev/look/evals/sunset.ts`, `night.ts`, `particles.ts`. Use a camera that keeps the action in view, `--hud` for UI, `--name` for distinct captures, and `--url` for an existing game.

**Warm-ups run warped by default** (dev/look/warp.ts, about 35x solo, one frame in 30 drawn): `--warm` and an eval's own waits cost almost nothing, then the capture runs at real speed, and a page error stops it at once. `--until "window.__placeDone"` ends the warm-up when a page expression is true, and `PLAY ...`-style console lines print as they happen. `--real` keeps the warm-up in real time; external `--url` sites always are. Two local players default to a measured 10x cap and an accelerated server (below). Warping is not for judging feel or frame rate.

**Whole round: `npm run playthrough`** (about a minute; --warp underneath, nothing is real time). A bot plays the round and you get time per beat, what never happened, where it stalled, and every line on screen with how long it showed, for cutting text with evidence (Show, don't tell); the full session is in `.look/playthrough/<name>/`. It prints what changed since the last run; `--full` or `report.txt` has everything. Run it after anything that changes pacing. `--name before` keeps a run; `--compare before after` sets two side by side; the bot isn't exact, so read differences under about a minute as noise and rerun before trusting a lone `NEVER`. The bot knows the way, so its times are a floor for a first-timer. The bot is `dev/look/bots/place.ts`: a new beat goes there, and a track that adds one keeps it playing. It's built on `dev/look/bot.ts`: `bot.walk` plans over the real colliders as they stand now, so a new bridge or gate needs no route code; `bot.use` walks up and presses what the game offers; `bot.until(fn, ms, what)` records a beat that never came, which fails the run. `--stall` counts only new beats and bot lines, so a loop stops early. `bot.txt` in the run's folder has all it said.

**Jump to a beat: `npm run look -- --at "path opened"`** (8 s). Starts at that beat of the last playthrough with its real state, through the game's own save, so abilities and town come along with no skip to write; `--at list` names the beats. Add `--cam`, `--action`, `--video` as usual. Run a new playthrough when the save's shape changes. A save can't hold what the game doesn't save (a train part way along).

**Frame-exact stills:** `--filmstrip N --every K` captures N images K drawn 60 Hz frames apart (K defaults to 1), paused between shots; labels show frame and elapsed game time. Use `--curves` to record the same frames. It needs warp and cannot be used with `--real`, `--url`, or `--players`.
Filmstrips show poses, not real-time feel or smoothness; the server and CSS still run on wall time.

**Motion as numbers: `--curves`** adds a plot and CSV of every frame's speed, vertical speed, height, camera distance and frame time, plus readings, while the action plays in real time. Use it for glide, hook, sprint or any camera change: `npm run look -- --at "path opened" --curves --action dev/look/evals/sprint-jump.ts --seconds 6 --frames 2`. `--curves-vs old.csv` draws an earlier run underneath; `--target glide` (or `glide-slow`, `glide-frame`) draws and scores against a reference and says when each value settled; numbers and what's unknown: `docs/research/botw-glide-target.md`, which also gives the transients to compare by hand. Frame the steady part in the last third, and `playMark` the moment the action starts so its line is on the plot.

**Before and after: `npm run before-after -- <git ref> [look options]`** runs the same capture on that commit and on this checkout and writes `<name>-before-after.png` side by side (with `--curves`, the plot overlays both). Use it with `--cam`/`--look` or `--at`, so it's one camera and one state. About 16 s.

**Two players: `BOOGLE_QUERY='proto=place&coop=1' npm run look -- --players 2 --eval dev/look/evals/place-coop.ts`.** Each page has its own browser profile, so neither takes over the other ("You're playing in another tab"); the eval runs concurrently on both with `&player=1` or `2`, their `COOP ...` lines print, and it fails if they never saw each other. Setup and warm-up default to 10x: a disposable server child scales its clocks and timers, and both pages run at the same cap. `--real` opts out; `--warp-speed N` tries another cap. All three return to 1x for captures. The run prints achieved rates, clock deficits, world-tick differences and train positions, saving raw samples in `<name>-warp.json`; a peak clock or world-tick deficit over one game second prints DRIFT, and a deficit still over one second at the end fails the run. A requested speed is not a measured speed. Add `&coopMinutes=3` for three more game minutes of trains. `node dev/codex/see.ts` supports this when the broker's checkout also has the updated look harness; an older broker rejects `--clock-url`. Details and measured limits: `dev/look/README.md`.

**Live session: `npm run session -- start [--at <beat>] [--query q]`**, then `state`, `keys KeyW 3`, `look 40 -5`, `press`, `step 2`, `still name`, `eval <code>`, `reload`, `stop`. The game stays open with its clock paused between commands, about 0.3 s each against 8 s for a fresh `look`: use it to poke at a question instead of writing a shot. It closes itself after 30 idle minutes. **First-time playtest:** follow `dev/look/playtester.md`, from a fresh agent, to test Show, don't tell from screenshots alone.

`--heatmap` requires a nonempty `--region x,y,w,h` inside 0..1, writes `<name>-heat.png` with only that region highlighted, and reports its pixel variation. `--region` alone highlights the region in the sheet and reports its variation. This is diagnostic: waves and intended motion light up too; reordering the sampled frames leaves the variance unchanged; a frozen renderer scores zero. It is useful for a specific stability question with a comparable camera/state, never a general quality threshold.

The command fails on page or console errors (including graphics errors), a non-WebGPU backend, an unavailable completed-frame counter or no completed game frames during its final one-second sample. `prof.last.frames` counts frames after the game's render call returns, not browser rAF callbacks or GPU presentation. Old deployed builds without that counter fail explicitly; use an updated build. A successful run only establishes capture health. State what the inspected evidence does and does not establish.

**Graphics backend.** The game is WebGPU only, and so is every run: Metal on a Mac, SwiftShader over
Vulkan on Linux and CI (a few fps with two tabs: PR CI runs only single-player scenarios, `world-inputs`; `smoke` runs
here, `npm run check:gpu` or `npm run ship -- --gpu`). `?dpr=fixed` (always passed) keeps adaptive resolution off. Every
run prints `renderer backend: ...` and `gfx errors: ...`; an entry there is a bug to fix. Rendering rules:
`src/render/README.md`.

To ask what's in the world rather than see it: `npm run inspect -- --browser`, or `window.boogle.inspect()` from `--eval` and `g.eval`, not reads of the rest of the `window.boogle` grab bag.

## 2. Validate: scenarios (`npm run scenario -- <name>`, `npm run scenarios` for all)

A scenario is `dev/scenarios/<name>.ts`: `export default { about, async run(t: T) {...} }` (`T` from `./run.ts`).
It sets up a situation in the real game, captures images, and asserts on state. Prints PASS/FAIL per check with image paths; exit code 1 on any
failure, including page and console errors. Follow AGENTS.md's test diet: new scenarios only for sync contracts, not routine UI, tuning or feel. Run the relevant existing scenario when it resolves a concrete concern. PR CI runs `world-inputs` (single-player only; `SCENARIO_GATE=pr` refuses a second tab), `npm run check:gpu` (or `npm run ship -- --gpu`) runs `smoke` on a Mac's GPU, and the rest run nightly
(`.github/workflows/scenarios-nightly.yml`, which also runs `smoke` on WebGPU); a failing leg's images and a
Playwright trace per player (`<player>-trace.zip`; open with `npx playwright show-trace <zip>`: the action timeline,
console, network and errors) are its `scenario-<name>` artifact. `--no-trace` skips tracing. So local runs
are optional; if access blocks a required visual check, request it per AGENTS.md rather than substituting CI for seeing the change.
`--url <game>` runs against a running or deployed build instead of a local stack; there are no
`/src/` modules to import on a built site, so such scenarios use window handles only (`window.boogle.sync`, from
`src/features/debug-handle.ts`). `smoke` is one: `.github/workflows/smoke.yml` runs it nightly on the live site.
`reconnect-edit` (stalls the host tab, tosses while the client reconnects) is another, kept out of the nightly smoke (it runs in `scenarios-nightly.yml`): run it
after changing held edits in `src/world/sync.ts`, reconnects in `src/net/ws-room.ts` or `src/netplay/net.ts` attach/fail.

```js
export default {
  about: 'a toss by B shows up for A',
  async run(t) {
    const room = 'sc' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'Alice', room });          // same room = same island, real net via local server
    const B = await t.open({ name: 'Bob', room });
    await B.eval(`window.boogle.sync.submitEdit({ op: 'gift.toss', i: 230, j: 205, k: 0, y: -1, n: 7, l: [0, 100, 0, 0, 0, 0] })`);
    const ms = await A.waitFor(`window.boogle.gifts.items.some((it) => it.src === 2 && it.i === 230)`);
    t.check("B's toss reaches A", ms >= 0, ms + ' ms');
  },
};
```

Player (`Game`) API, from `dev/look/lib.ts`:
- `g.eval(fn | 'async body with return')` runs in the page; game modules via `await import('/src/...')`; state handles
  `window.boogle` (me, ball, world, remotes, net, camera), `window.__water`. Return JSON-able values.
- `g.waitFor(expr | fn, { timeout })` polls until truthy; returns ms or -1. Use it instead of fixed sleeps.
- `g.view('hill' | { cam, look }, fov)` freezes the camera (`?debugcam=1`, `src/debug/debug-cam.ts`).
- `g.key('KeyQ', holdMs)`, `g.down/up(code)`, `g.click(x, y)` send real input events (throw is click-hold).
- `g.still(label)`, `g.motion(label, { frames, seconds, region, heatmap })` -> `{ score, hotFrac, sheet, heat }`; `heat` is null unless requested. `g.fps()` samples completed game frames; `g.healthErrors()` reports runtime/console/backend failures.
- `t.check(label, ok, detail)`, `t.sleep(ms)`, `t.open({ name, room, size, hud, touch })`.
- `touch: true` starts a phone client (`body.touch`, the touch buttons); pair it with `size: [844, 390]`, or
  `[390, 844]` for portrait, and `hud: true` so the buttons stay in the pictures. See `dev/scenarios/one-hand.ts`.

Rules of thumb: keep scenarios short; wait on state, not time; assert on what the player would notice (it exists,
moved, synced, is visible in a region, is not flickering); keep thresholds loose (they guard against regressions,
not tune the look); put the image paths in check details so a failure is diagnosable. Prefer submitting edits through
`submitEdit` over aiming the mouse for sync assertions; use real input when the question concerns controls. Pixel variation is only useful for a named region and expectation, with comparable state and capture conditions.

## 3. Render and sim cost: `npm run perf`

About a minute, or more on a loaded machine. Prints draw calls, shadow-pass calls, triangles, geometries and shader
programs, for the island as entered and with a fully grown garden (`dev/look/perf.ts`; `-- --url` for a running
game). The counts are exact; headless fps is not, so it isn't reported. Then ms per lockstep tick (avg, p95, max), per op, `onApplied`/`onTick`
handler and state hash, on the idle island and with busy water (beach flooded, a channel being dug): name your
handler with `onTick(fn, 'label')`. Those are wall-clock times on a software-rendering machine: compare before/after
on the same machine. `-- --render` or `-- --sim` runs one half. Run it before and after anything that adds meshes,
lights or per-tick sim work, and compare.

## 4. Clips and videos

Recording video clips and GIFs, and cutting them into trailers: see the `video` skill (`npm run clip`,
`npm run reel`). Those clips advance virtual time, so smooth playback is not evidence of real-time performance. For an action's timing and visible stalls, use `npm run look -- --video` or observe the running game.

## Loop for a feature
Name the visual question, set up the action and view, capture, inspect and fix what is off (up to three rounds per AGENTS.md). Include a concrete observation and any unverified behavior in the handoff. Only add a scenario when a sync contract needs one; visual changes use targeted evidence rather than another test suite.
