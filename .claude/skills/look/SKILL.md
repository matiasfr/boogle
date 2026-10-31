---
name: look
description: Validate a feature in the running game - see stills and motion, and write scenario checks that assert on game state. Use after any visual, feel, water, physics or multiplayer change, and to close the loop on your own work.
---

# Look and validate

Unit tests cover pure logic. For "does it actually work in the running game" (things that happen over time, flicker, objects that move or vanish, two players seeing the same thing) use the headless harness in `dev/look/` and `dev/scenarios/`. It starts Vite and a local signaling server, drives Chromium (Playwright), and cleans up after itself. Output goes to `.look/` (gitignored). **Always open the PNGs with Read and look at them**; numbers alone miss things. A visible change puts a still on its PR: `scripts/pr-shot.sh <png>...` uploads it and prints the Markdown (AGENTS.md, "Shipping").

## 1. Inspect: `npm run look`

```
npm run look -- --view hill                           # preset: hill | shore | court | overview | garden
npm run look -- --cam -10,12,-14 --look -22,3.5,-21   # any pose (metres, y up); --fov 60
npm run look -- --view shore --eval setup.js --warm 5 --region 0.3,0.3,0.4,0.4
```

Writes `<name>-still.png`, `<name>-motion.png` (contact sheet: `--frames 8` over `--seconds 2`, timestamped),
`<name>-heat.png` (per-pixel temporal stddev: bright = changing) and prints a **motion score** (mean stddev 0-255,
over `--region x,y,w,h` as fractions of the frame, default whole frame). A calm still scene scores under 1; flicker
and popping show up as bright speckle or edges in the heatmap. `--eval file.js` runs a page-code body before the
camera is placed (see below). `--hud` keeps the HUD in the picture. Add views to the `VIEWS` table in
`dev/look/lib.mjs`. `--url` uses an already running game. Headless software rendering runs about 10 fps, so the sim
(10 ticks/s) is slow to warm up: `--warm 10` or more.

**Graphics backend.** Runs use three's WebGL 2 backend by default (the harness loads the page with `?gfx=webgl2`, as CI does; `?dpr=fixed` keeps adaptive resolution off, also
always passed);
`--webgpu --gpu` uses the real WebGPU backend on this Mac's GPU, at about 60 fps. Check visual work on both. Every
run prints `renderer backend: ...` and `gfx errors: ...`; any entry there (a `THREE.` console error, such as a
material "not compatible" with the node renderer) is a bug to fix. Ready-made evals: `dev/look/evals/sunset.js`,
`night.js`, `particles.js`. `npm run hitches` (real GPU) lists frame stalls over a tour of the island. Rendering rules:
`src/render/README.md`.

## 2. Validate: scenarios (`npm run scenario -- <name>`, `npm run scenarios` for all)

A scenario is `dev/scenarios/<name>.mjs`: `export default { about, async run(t) {...} }`. It sets up a situation in
the real game, captures images, and asserts on state. Prints PASS/FAIL per check with image paths; exit code 1 on any
failure. Not part of `npm run check` (they take 15-80 s each); run the one for your feature, and all of them before
risky shared changes. CI runs `world-inputs`, `smoke` and `two-player-edit` on every PR and the rest nightly
(`.github/workflows/scenarios-nightly.yml`, which also runs `smoke` on WebGPU); a failing leg's images and a
Playwright trace per player (`<player>-trace.zip`; open with `npx playwright show-trace <zip>`: every action, console
line, request and DOM snapshot) are its `scenario-<name>` artifact. `--no-trace` skips tracing (about 5% slower with it). So local runs
are optional; on a slow sandbox, push and read CI.
`--url <game>` runs against a running or deployed build instead of a local stack; there are no
`/src/` modules to import on a built site, so such scenarios use window handles only (`window.boogle.sync`, from
`src/features/debug-handle.js`). `smoke` is one: `.github/workflows/smoke.yml` runs it nightly on the live site.
`reconnect-edit` (stalls the host tab, tosses while the client reconnects) is another, kept out of the nightly run: run it
after changing held edits in `src/world/sync.js`, reconnects in `src/net/peer-room.js` or `src/netplay/net.js` attach/fail.

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

Player (`Game`) API, from `dev/look/lib.mjs`:
- `g.eval(fn | 'async body with return')` runs in the page; game modules via `await import('/src/...')`; state handles
  `window.boogle` (me, ball, world, remotes, net, camera), `window.__water`. Return JSON-able values.
- `g.waitFor(expr | fn, { timeout })` polls until truthy; returns ms or -1. Use it instead of fixed sleeps.
- `g.view('hill' | { cam, look }, fov)` freezes the camera (`?debugcam=1`, `src/debug/debug-cam.js`).
- `g.key('KeyQ', holdMs)`, `g.down/up(code)`, `g.click(x, y)` send real input events (throw is click-hold).
- `g.still(label)`, `g.motion(label, { frames, seconds, region })` -> `{ score, sheet, heat }`, `g.fps()`.
- `t.check(label, ok, detail)`, `t.sleep(ms)`, `t.open({ name, room, size, hud, touch })`.
- `touch: true` starts a phone client (`body.touch`, the touch buttons); pair it with `size: [844, 390]`, or
  `[390, 844]` for portrait, and `hud: true` so the buttons stay in the pictures. See `dev/scenarios/hotbar.mjs`.

Rules of thumb: keep scenarios short; wait on state, not time; assert on what the player would notice (it exists,
moved, synced, is visible in a region, is not flickering); keep thresholds loose (they guard against regressions,
not tune the look); put the image paths in check details so a failure is diagnosable. Prefer submitting edits through
`submitEdit` over aiming the mouse. Real-time motion scores depend on the machine, so compare before/after on the
same machine, never against absolute numbers from elsewhere.

## 3. Render and sim cost: `npm run perf`

About a minute, or more on a loaded machine. Prints draw calls, shadow-pass calls, triangles, geometries and shader
programs, for the island as entered and with a fully grown garden (`dev/look/perf.mjs`; `-- --url` for a running
game). The counts are exact; headless fps is not, so it isn't reported. Then ms per lockstep tick (avg, p95, max), per op, `onApplied`/`onTick`
handler and state hash, on the idle island and with busy water (beach flooded, a channel being dug): name your
handler with `onTick(fn, 'label')`. Those are wall-clock times on a software-rendering machine: compare before/after
on the same machine. `-- --render` or `-- --sim` runs one half. Run it before and after anything that adds meshes,
lights or per-tick sim work, and compare.

## 4. Clips and videos

Recording video clips and GIFs, and cutting them into trailers: see the `video` skill (`npm run clip`,
`npm run reel`).

## Loop for a feature
Write or extend a scenario that fails without your feature, implement, run it, Read the stills/sheets/heatmaps,
fix what looks wrong, repeat. Commit the scenario with the feature.
