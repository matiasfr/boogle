---
name: look
description: Validate a feature in the running game - see stills and motion, and write scenario checks that assert on game state. Use after any visual, feel, water, physics or multiplayer change, and to close the loop on your own work.
---

# Look and validate

Unit tests cover pure logic. For "does it actually work in the running game" (things that happen over time, flicker, objects that move or vanish, two players seeing the same thing) use the headless harness in `dev/look/` and `dev/scenarios/`. It starts Vite and a local signaling server, drives Chromium (Playwright), and cleans up after itself. Output goes to `.look/` (gitignored). **Always open the PNGs with Read and look at them**; numbers alone miss things.

## 1. Inspect: `npm run look`

```
npm run look -- --view hill                           # preset: hill | shore | court | overview
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

## 2. Validate: scenarios (`npm run scenario -- <name>`, `npm run scenarios` for all)

A scenario is `dev/scenarios/<name>.mjs`: `export default { about, async run(t) {...} }`. It sets up a situation in
the real game, captures images, and asserts on state. Prints PASS/FAIL per check with image paths; exit code 1 on any
failure. Not part of `npm run check` (they take 15-80 s each); run the one for your feature, and all of them before
risky shared changes.

```js
export default {
  about: 'a dig by B shows up for A',
  async run(t) {
    const room = 'sc' + Math.random().toString(36).slice(2, 8);
    const A = await t.open({ name: 'Alice', room });          // same room = same island, real net via local server
    const B = await t.open({ name: 'Bob', room });
    await B.eval(`const { submitEdit } = await import('/src/world/sync.js'); submitEdit({ op: 'dig', i: 70, j: 90 });`);
    const ms = await A.waitFor(`(async () => (await import('/src/world/terrain-edits.js')).terrain.delta[70*129+90] < 0)()`);
    t.check("B's dig reaches A", ms >= 0, ms + ' ms');
  },
};
```

Player (`Game`) API, from `dev/look/lib.mjs`:
- `g.eval(fn | 'async body with return')` runs in the page; game modules via `await import('/src/...')`; state handles
  `window.boogle` (me, ball, world, remotes, net, camera), `window.__water`. Return JSON-able values.
- `g.waitFor(expr | fn, { timeout })` polls until truthy; returns ms or -1. Use it instead of fixed sleeps.
- `g.view('hill' | { cam, look }, fov)` freezes the camera (`?debugcam=1`, `src/features/debug-cam.js`).
- `g.key('KeyQ', holdMs)`, `g.down/up(code)`, `g.click(x, y)` send real input events (the shovel is Q/Z/F, throw is click-hold).
- `g.still(label)`, `g.motion(label, { frames, seconds, region })` -> `{ score, sheet, heat }`, `g.fps()`.
- `t.check(label, ok, detail)`, `t.sleep(ms)`, `t.open({ name, room, size, hud })`.

Rules of thumb: keep scenarios short; wait on state, not time; assert on what the player would notice (it exists,
moved, synced, is visible in a region, is not flickering); keep thresholds loose (they guard against regressions,
not tune the look); put the image paths in check details so a failure is diagnosable. Prefer submitting edits through
`submitEdit` over aiming the mouse. Real-time motion scores depend on the machine, so compare before/after on the
same machine, never against absolute numbers from elsewhere.

## 3. Render cost: `npm run perf`

About 8 s. Prints draw calls, shadow-pass calls, triangles, geometries and shader programs, for the island as
entered and with a fully grown garden (`dev/look/perf.mjs`; `-- --url` for a running game). The counts are exact;
headless fps is not, so it isn't reported. Run it before and after anything that adds meshes or lights, and compare.

## Loop for a feature
Write or extend a scenario that fails without your feature, implement, run it, Read the stills/sheets/heatmaps,
fix what looks wrong, repeat. Commit the scenario with the feature.
