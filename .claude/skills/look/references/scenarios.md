## 2. Validate: scenarios (`npm run scenario -- <name>`, `npm run scenarios` for all)

A scenario is `dev/scenarios/<name>.ts`: `export default { about, async run(t: T) {...} }` (`T` from `./run.ts`).
It sets up a situation in the real game, captures images, and asserts on state. Prints PASS/FAIL per check with image paths; exit code 1 on any
failure, including page and console errors. Follow the test diet in docs/agents/tests.md: new scenarios only for sync contracts, not routine UI, tuning or feel. Run the relevant existing scenario when it resolves a concrete concern. Rendered scenarios, including `world-inputs`, run weekly (Sundays) or on command on the owner's Mac, outside CI; `npm run check:gpu` (or `npm run ship -- --gpu`) also runs `smoke` on a Mac's GPU
(`dev/daily` on the owner Mac); a failing leg's images and a
Playwright trace per player (`<player>-trace.zip`; open with `npx playwright show-trace <zip>`: the action timeline,
console, network and errors) are retained in its run folder. `--no-trace` skips tracing. So local runs
are optional; if access blocks a required visual check, request it per docs/agents/verification.md rather than substituting CI for seeing the change.
`--url <game>` runs against a running or deployed build instead of a local stack; there are no
`/src/` modules to import on a built site, so such scenarios use window handles only (`window.boogle.sync`, from
`src/features/debug-handle.ts`). `smoke` is one: `dev/daily/jobs.ts` runs it on the live site in the weekly scenarios job; CI Smoke is browserless.
`reconnect-edit` (stalls the host tab, tosses while the client reconnects) is another, kept out of the nightly smoke (it runs in the Mac's weekly scenarios job): run it
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
