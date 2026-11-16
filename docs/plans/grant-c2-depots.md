# C2: depots say what they are

Owner-approved implementation, 15 November 2026. Local branch `t3/grant-c2-depots`, based on fetched
`origin/main` at `9e8f9be6c`. Do not ship this branch: the handoff is a local commit.

## What changed

Fetched main already has the requested matching physical boards: `stockSign(owner, 'logs')` in
`src/entities/railway/line2-view.ts` and `stockSign(owner, 'rails')` in `shelf-view.ts`. The stock glyphs were
added in `e70e0d90a` and made boards on posts in `8d18475ec`. The baseline Q5 arrival capture confirms both
are visible beside their piles; no duplicate board or new hovering text was added.

The cart already sends steel and then timber from its load into the actual depot slots. Its fixed 0.045 s
stagger took `47 * 0.045 + 0.55 = 2.665 s` for Q5's 24 rails and 24 logs, longer than its existing 2.2 s
stop. `cart-view.ts` now caps the stagger by the existing stop duration, keeping the final landing at 2.05 s
and preserving the old rhythm for smaller loads. Waiting pieces remain on the cart; receiving piles and
their boards count them as they land. The inspection includes aboard and in-flight visual counts so the
capture can distinguish accepted stock from drawn stock.

The proof exposed a harness fault: `look.ts` wrote its seed before `launch()` acquired the bot queue. A long
queue wait aged that save, so the server's normal away credit could unload the cart before observation.
The harness now acquires the slot first and writes the seed just before opening the page. No game save or
away-credit rule changes.

No sim, net, world or ECS files changed. No delivery quantities, pickup rules, colliders or server phase
timings changed. DESIGN.md principle: **11. Show, don't tell**.

## Copy for the owner

No new words. The existing material icons, counts and service-tag wording are reused. The Boogler's copy
is untouched. The unrelated `Station 5` board in the background belongs to C4/G13, outside this item.

## Evidence and checks

All paths below are relative to this worktree. Opened and inspected:

- `.look/c2-log-board-still.png`: on the arrival side, the timber icon and **24** are unobstructed next to
  the log ends. The rail shelf remains visible to its left.
- `.look/c2-rail-board-still.png`: the same board construction carries the steel icon and **24**, beside
  the separate, full rail shelf. The log board is also visible. These two stills shared the machine; they
  are visibility evidence, not performance measurements.
- `.look/playthrough/c2-short-route/end-still.png`: the completed T1 frame and player at the end of the
  short production route. The route verdict passes with no page or graphics errors.
- `.look/c2-unload-wide-motion.png`: opened all 16 cells. The loaded cart is on the right in the first
  row; steel flies left into the shelf in the second row, then timber into the rack in the third. Both
  receivers are full before the empty cart rolls back toward the camera. The view is wide, so individual
  pieces and board figures are smaller than in the dedicated board stills.
- `.look/c2-unload-wide-still.png`: the empty cart in the foreground and both stocked depots together.
  `.look/c2-unload-wide.log` records 24 logs and 24 rails aboard at arrival; sample 17 has both receiving
  stacks at 24, no pieces aboard or in flight, and phase DROP; sample 18 starts BACK. Capture health
  passes (WebGPU, advancing completed frames, no page/console/graphics errors), not marked under load.

The first attempt, `.look/c2-unload-verdict.json`,
failed because its `q5-arriving` fixture missed the arrival; it is not proof of unloading. That fixture also carries
only rails, with inherited timber already on the depot. The later setup uses `q4-done`, taking and setting aside
its inherited timber before Q5's first shipment, through accepted commands. The next attempt,
`.look/c2-unload-shipment-verdict.json`, also failed after 419 s in the queue had aged its seed; its bounded
wait reported a split shipment. Both failed captures are retained. The same pickup/drop setup in the headless
rules reaches a 24-log/24-rail RUN, without state fabrication.
After the harness fix, `.look/c2-unload-final-motion.png` captured the full transfer but cropped out the cart
itself (and was marked under load); the wider shot above is the delivery proof. The real-time recordings
are retained, but were not watched; these are sampled-pose and phase-order observations, not a smoothness
or device-performance verdict.

Checks: 24 owning tests pass (`railway-cart.test.ts`, `railway-line2.test.ts`); `npm run loop -- run` passes;
`npm run check` passes (`.look/c2-check.log`: 2,227 unit passes, 65 skips, one TODO, 16 level reports, assets,
prefabs and build). An earlier check caught the new eval's missing command header; it was fixed before the
passing run. After the harness ordering fix and final camera edit, `npm run check -- --unit-only` also passes
with `UNIT_ONLY` selecting the two owning files plus `look-wall.test.ts`: all 27 tests, lint, types, registry,
16 level reports, assets, prefabs and build (`.look/c2-final-check.log`). `review-stamp -- . --no-fetch
--base 9e8f9be6c` reports no review stamp needed.

The reproducible capture action is `dev/look/evals/depot-arrival.ts`. It starts from the existing accepted
`q5-shelved` (boards) or `q4-done` (delivery) server seed. The delivery setup uses accepted pickup/drop commands;
it never writes shared state directly. Local relocations frame the action, then it observes the real delivery.
The arrival views are authored cameras on the approach, not a blind player test. Motion sheets establish
sampled poses; real-time smoothness and device performance remain unverified.
