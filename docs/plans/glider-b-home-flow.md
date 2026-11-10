> **Status: planned (2026-11-09).** One implementer, one sitting. Base: `origin/main` at `146c5af8` or later. This is the
> next `WORLD_NS` batch (v22 → v23, shared with Split-rock J5 if J5 needs one; see "Rebasing onto J5").

# Glider piece B and the Home flow fixes

## Goal

Make the glider real in the production railway. It waits sealed on Needle Bell's summit, wakes when Q5 is laid, and is
granted to the whole room by a `rail.glide` take there. The first flight then carries you down toward the forge, where
the boiler's plume is already calling. In the same batch, two Home flow fixes: the depot cart carries 24 rails, so Q5's
rails come in one trip, and the production bot plays in the order a player does.

Principles served: **7. Telegraph everything** (the device is seen sealed on the first climb, woken on Q5's completion
edge, then taken), and **8. Enjoyable alone and together** (one shared grant: the finder gets the card, everyone else
the flourish). Nothing bends.

**Sources.**
- [glider-placement](../brainstorms/glider-placement.md), with its design review: piece B, calls 1–25, findings 1, 2, 5,
  6 and 10.
- [home-flow](../reviews/home-flow.md): findings 1 (the cart's rails), 2 (the glider's landing faces the forge) and 4
  (the bot's order).
- [agent-calls](../agent-calls.md): the home-flow rows (the cart's rails, the landing facing the forge, the bot's order)
  and the glider-placement rows (its calls 4–33). _(Designer, 9 November: was "rows 15, 18, 20 and 24–47"; rows are
  newest first and shift, and 34–47 were town and place-retirement calls.)_
- Owner calls: "Nothing waits for a playtest", with its `WORLD_NS` mid-session safety note; "Pick and log, don't ask";
  "Input gets instant feedback"; "Anything playtests could tune is tunable"; and "No old builds in development".

**Research.**
- [botw-glide-target](../research/botw-glide-target.md), recommendations 1–3: the new tunables default to its 10 m/s
  forward, 3.2 m/s sink, 18/12 m/s² and 360°/s with a 0.12 s time constant, unchanged from piece A.
- [ability-upgrades](../research/ability-upgrades.md): the glider is a boolean, and each later upgrade (G1, G2) adds its
  own field.
- [route-contract](../research/route-contract.md), recommendation 1: reaching a place early is fine, but funding or
  opening a step early is not. Finding 10's test enforces that.
- [progression-flow-layout](../research/progression-flow-layout.md), rule 1 (the next goal can be found): the take faces
  the forge plume, and the first landing is the boiler's apron.

The plan departs from the research in one place. The brief asks that the summit's locator "reads at phone size" from
Far Head, but call 12 keeps it as faint as the jump device's. See open question 2.

**Already shipped, don't redo.** Home flow findings 2 and 3's steam plume and forge whistle shipped in J4 (#1261), as
`src/entities/railway/forge-call.ts`, used by `boiler-view.ts` and `breaker-view.ts`. Piece A (#1247) shipped the
movement: `glide-step.ts`, `glide.ts`, `glide-view.ts`, `move-order.ts`, presence `railwayGlide`, the `glide` action
on LB/Q/touch, the folded roll on every back and the carry rule. It is gated on `inspect().glide`, which only the dev
grant `&railGlide=1` sets.

**Out of scope.**
- The upgrades (G1, G2).
- The return of the glide secrets (F2).
- The load-scaled sink.
- Moving the double jump (job E).
- A visible Split-rock cleft from the rim (a New call; open question 1).
- J5's own work.

## Design

### Sync kind of each piece

| State | Kind and API | Authority | Notes |
| --- | --- | --- | --- |
| `Rail.glide: boolean` (the room has the glider) | **Server**: a field on the replicated `rail` component (`src/sim/railway-world.ts`), read through the mirror and `adapter.inspect().glide` | Server; granted only by `rail.glide` | Saved with the world, inherited on join and reconnect. Not a tier (finding 2) |
| `rail.glide` (take the device) | **Server action**, predicted: `RAIL_PREDICTED` in `src/world/railway-predict.ts` | Server rule (`qCompleted ≥ 5 && !glide`); server reach check | Like `rail.pack`: the card plays on the press from the prediction. A refusal comes back as `onCorrected` |
| Glide flight | **Owner** (piece A, unchanged): physics in `glide.ts`, presence `railwayGlide` (`true` or `null`) | This tab | No change except where the numbers come from |
| Glide numbers | **`rules.tune`** (the existing Lockstep tune state): eight new `railGlide*` keys, read through `railMovement` | Room-wide value, read by each tab's Owner movement | Like `railJump*`. Production rooms accept them through `RAIL_TUNE_KEYS` |
| The device sealed, woken and taken; the faint locator; the card; the partner flourish; the first-fall teach pulse; sounds | **Local**, from accepted (and own predicted) state | — | The woken show and the card play only on a live edge or event. A restore snaps to state |
| Cart rails per trip (24) | **Server rule constant** `CART.rails` (`src/sim/railway-cart.ts`) | Server | A rule number, not a shape change. Saves stay valid. It rides the batch's bump |
| Bot route order | Dev tooling (`dev/look/bots/railway.ts`) | — | `&botOrder=legacy` keeps today's order |

The railway isn't lockstep (Server kind since v14). There's no `src/world/rules/types.ts` entry, no `rules/index.ts`
line and no `edits` generator for `rail.glide`. The tune state is lockstep, but its replay `edits` already come from
`TUNABLES`, so the new keys are covered automatically. The invariant is `railwayCheck` in `src/sim/railway-line2.ts`:
`glide` before Q5 is a load error. There's no `env` fact: reach is judged from the action's own `at` through `Actor`,
as for `rail.seaSwitch`.

### Exact names

- **Op:** `rail.glide` (no fields). System `const glide = defineSystem('rail.glide', { reads: [QJob], writes: [Rail],
  phase: 'act', order: 40 }, …)`. It returns 0 if `qCompleted(w) < 5 || rail.glide`; otherwise it sets
  `rail.glide = true` and returns 1. Its entry in `OPS` is `'rail.glide': [glide]`. Use order 40 because the Works block
  ends at 39; check that J5 hasn't taken 40 before you rebase.
- **Field:** `Rail` gets `glide: 'bool'` (the default is false). The read model gets `line2.glide` (type `RailLine2` in
  `src/sim/railway-line2.ts`, beside `hook: boolean`). Set it in `railwayView`'s `line2` block and in
  `refreshRailway`'s `Object.assign(l2, …)`.
- **Invariant:** `if (l.glide && line2Completed(s) < 5) throw new Error('railway: glide before Q5');`, next to the hook's
  check at `railway-line2.ts:234`.
- **Device anchor:** `LINE2_GLIDE = { x: 101600, z: -450, y: 10240 } as const` in `src/sim/railway-line2-layout.ts`,
  beside `LINE2_SEA`. That's world (1016, 102.4, −4.5) on the 10 × 8 m summit pad (local x 10–20, z −10 to −2). It
  stands 4.5 m from the sea switch handle (11.8, −6), 6.7 m from the summit ring (22.2, −7), and clear of `t5`'s landing on
  the east side (call 15). _(Designer, 9 November: was z −880, which put the drum against Needle Bell's top rock drum,
  centred at (16, −11) with a radius of about 1.6 m at deck height, and under the orange summit vane's mast. See the
  design review, finding 1.)_
- **Server validation** (`src/world/railway-server.ts`):
  - Add `'rail.glide'` to `RAIL_ACTIONS`.
  - In `railValid`: `case 'rail.glide': return height(LINE2_GLIDE.y) && near(LINE2_GLIDE.x, LINE2_GLIDE.z, 320);`.
    That's the same shape as `rail.seaSwitch`: within 2.6 m of deck height and 3.2 m across. A player at Needle Bell's
    foot, on a slab below or at Far Head is refused.
  - Readiness (Q5 laid, not yet taken) is the rule's job, not `railValid`'s.
- **Adapter** (`src/adapters/railway.ts`):
  - Add `'rail.glide'` to the no-field union in `RailwayIntent`, to `intentOf`'s no-field list and to `NOT_MATERIAL`.
  - Add `claimGlide: () => submit({ op: 'rail.glide' })` beside `claimHook`.
  - In `buildState`, set `glide: s.line2!.glide`. That replaces piece A's constructor option `glide`; delete the option
    and its doc comment.
- **Marks:**
  - `'rail.glide': 'glider gained'` in `src/adapters/railway-marks.ts`.
  - `['gained the glider', /^glider gained$/]` in `dev/playtest/beats.ts`, next to the hook's row.
- **Tunables.** Append these, in this order, after `railBeamGraceS` (the order is hashed). All are integers:

  | Key | Default | Min–max | Unit | Catalog id | `railMovement` field |
  | --- | --- | --- | --- | --- | --- |
  | `railGlideSpeed` | 1000 | 300–2000 | cm/s | `railway.glideSpeed` | `glideSpeed` = v / 100 |
  | `railGlideSink` | 320 | 50–1500 | cm/s | `railway.glideSink` | `glideSink` = v / 100 |
  | `railGlideAccel` | 1800 | 200–6000 | cm/s² | `railway.glideAccel` | `glideAccel` = v / 100 |
  | `railGlideBrake` | 1200 | 100–6000 | cm/s² | `railway.glideBrake` | `glideBrake` = v / 100 |
  | `railGlideOver` | 800 | 100–6000 | cm/s² | `railway.glideOver` | `glideOver` = v / 100 |
  | `railGlideTurnTau` | 120 | 20–1000 | ms | `railway.glideTurnTau` | `glideTurnTau` = v / 1000 |
  | `railGlideTurnMax` | 360 | 45–1080 | degrees per second | `railway.glideTurnMax` | `glideTurnMax` = v × π / 180 |
  | `railGlideDeploy` | 100 | 10–1000 | ms | `railway.glideDeploy` | `glideDeploy` = v / 1000 |

  - **Where they go:** `TUNABLES` in `src/sim/tune.ts`, `supply` in `src/tunables/catalog.ts` (with `at: 'next owner
    glide step'`), and `RAIL_TUNE_KEYS` in `server/src/host/world-host.ts`.
  - **`RailwayMovement`:** add the eight fields, and compare them in `sameMovement`.
  - **The catalog's owner column:** add an optional `owner` to the `supply` entries. Use
    `owner: railway.owner ?? (…existing ternary…)` and set it to `src/entities/railway/glide-step.ts` for these eight.
  - **Reading them:** `glide.ts` drops its `tech-layout.ts` import (it was only there for `MOVE`) and passes
    `adapter.inspect()` to `stepGlide`. `GlideMove` is structurally a subset of the inspect object, because `buildState`
    spreads `...moves`.
- **Cart:** `CART.rails: 16 → 24` in `src/sim/railway-cart.ts`. 24 equals `LINE2_FORGE.rackMax`, so one full rack fills
  a cart. Q4 still takes only its 16 (`cartWants` clips to what's owed). With `CART.load = 24`, the first trip brings
  Q5's whole bill.

### Controls and interaction

There are no new controls.
- The `glide` action already exists (piece A): LB, Q, touch "Glide", in group `move`. It registers once the room has
  the glider, and the row is already in `docs/game-design/controls.md`. `npm run registry -- --json` already lists LB as
  taken, so no pad slot is claimed.
- The take is the Interact button: interactable id `railway-glide-device`, verb **Take it**, at the device's top (as
  `railway-hook-device`).
- There's no new presence key and no new message.

### The device, the grant and the first landing (Local)

New `src/entities/railway/glide-device-view.ts` exports `createRailwayGlideDevice(adapter, owner, deps)`. Build it on
the pattern of `sea-gate-view.ts`, with the same `Deps` (layout, land, shapes, flat, partMat, glow) plus `youGot`.
`line2-view.ts` creates it beside `seaGate` and calls it in five one-line places: `accepted`, `targets`, `update`, and
`inspect` under the key `glideDevice`.

- **Sealed** (Q5 not laid):
  - Place's device drum (the `DRUM` parts from `src/proto/place/tech.ts`) at `LINE2_GLIDE`, with a cylinder collider
    through `land.addStatic`.
  - A short mast carrying a folded canopy vane in dark cloth (`#3d3c38`), with its long axis pointing at the forge
    (heading −x).
  - No ring, no core, no locator, and no target. The player sees it on the first climb, beside the sea switch.
- **Woken** (`line2Completed ≥ 5 && !glide`):
  - The vane takes the teal and cream of the worn roll.
  - Place's ring, second ring and core light up and turn.
  - A faint locator shaft goes up: radius 0.1, 50 m tall, `opacity 0.1`, additive, `readableUnlit` (Place's
    `shaftMat`, call 12).
  - On the live edge only (the `completed` count going from 4 to 5 while `ready`, seen in this session), the vane
    unfurls once over 0.6 s and `playMark('glider woken', { authority: 'local' })` fires. On restore it snaps to woken.
    No summit cinematic (call 13).
  - The **Take it** target appears within 3 m across and 2.2 m in height. It calls `adapter.claimGlide()`.
- **Taken** (`glide`):
  - The rings, core, locator and vane are hidden. The drum stays.
  - On your own accepted `rail.glide` (predicted, so it arrives on the press):
    - `placeSound('pickupGlider', x, z)`.
    - `youGot({ key: 'glide', name: GLIDE_REWARD.name, line: GLIDE_REWARD.line, model: new THREE.Mesh(merged(GLIDE_REWARD.parts), partMat), from: ring position })`.
  - Everyone else gets nothing here: their flourish is `ability-arrival.ts`.
- **`inspect()` → `glideDevice: { x, y, z, available, woken, taken, locator }`.**
- **Facing the forge** (Home flow finding 2): the hook lands you on the summit's east side. Walking to the device faces
  you west, over the device and the switch toward the forge, where J4's 62 m plume stands over the boiler that Q5 just
  cast. The natural step-off heads for the forge apron. From 102.4 m, a full-stick glide covers about 250–260 m: over the
  forge and the village and down into the cove (a swim). The first flight lands on the apron only if you let go over
  it: letting go of the stick there stops you in about 0.8 s, and you sink at 3.2 m/s onto a broad, dry landing about
  26 s after the step-off (call 14). _(Designer, 9 November, finding 3: the landing was stated without that caveat.)_

**Supporting changes.**
- **The card** (`src/entities/railway/reward-data.ts`): `GLIDE_REWARD = { name: 'The glider', line: 'Open it in the
  air.', parts: [...] }`. The parts are Place's `WORN_SHAPE.glide` with TEAL `#39e6c6` and BRASS `#c79a3e`, typed
  `Parameters<typeof merged>[0]`. The copy is Place's (call 11); it isn't The Boogler's.
- **The partner flourish** (`src/entities/railway/ability-arrival.ts`):
  - Add `{ key: 'glide', op: 'rail.glide', cue: 'pickupGlider', has: (s) => s.glide, badge: true }` to `ABILITIES`.
  - In `reward.ts`, `axeModel` returns a `GLIDE_REWARD` mesh for `'glide'`. Wrap it there (`key === 'glide' ? …`), not in
    `tools.ts`.
  - In `onCorrected`, `seen.forget('glide')` for a corrected `rail.glide` (as the wake does for `multi-axe`).
- **The first-fall teach** (call 10), in `ability-arrival.ts`:
  - The trigger is a new record key `'glide-taught'`. It fires when you own the glider, are airborne, falling faster than
    4 m/s, the canopy is shut, no card is busy and `glide-taught` hasn't been seen.
  - It shows the existing chip with the **Glide action's** glyph (LB, Q, touch "Glide") for `TEACH_S`, placed at
    Buddy's back (feet + 1.2 m). It ends early when the canopy opens or you land. _(Designer, 9 November, finding 2: was
    `glyph('jump')`. At Q5 every room still has the double jump, so Jump spends the air jump first and opens the canopy
    only on a second press. Switch the teach to Jump when job E moves the double jump.)_
  - The canopy's state comes from a new export in `glide.ts`: `export const railwayGlideOpen = () => active?.open() ??
    false`. If lint-boundaries refuses that import, pass it as an `env.glideOpen` getter from `reward.ts`.
  - The finder's take marks `glide-taught` as unseen (the teach is for the finder too). A friend's flourish doesn't mark
    it.
- **The dev grant goes:**
  - Delete `glide: import.meta.env.DEV && query.get('railGlide') === '1'` from `src/entities/railway/index.ts`. The
    `query` variable stays for `railLag`.
  - The seeds replace it (`glide-earned`).
  - Update the comments in `glide.ts` and `dev/look/bots/railway-glide.ts` that name `&railGlide=1`.

### Prediction, restore, mixed builds

- **Prediction:**
  - `rail.glide` joins `RAIL_PREDICTED`. The client runs the same `glide` system on its mirror clone, so the card,
    sound and ownership come on the press (owner call "Input gets instant feedback").
  - If the server refuses (reach, or a lost race at the summit's edge), `onCorrected` brings `inspect().glide` back to
    false. `createHookLatch` drops ownership 2 s later, which closes the canopy, and the `railwayGlide` presence returns
    `null`. The card already shown stays: that's accepted, and it's as rare as a refused pack.
  - A second player's take in the same packet is a `noop`, so no card for them; they get the flourish.
- **Restore** (reload, rejoin, late join, server restart):
  - `Rail.glide` comes back from the save and the snapshot. `glide.ts` owns at once (`ready && glide`) and registers
    the action. The roll shows on every back.
  - The device snaps to taken. No card plays on restore.
  - A player whose browser has no `seen` record gets the late flourish once, on their first landing (existing
    `ability-arrival` behaviour).
  - The woken show plays only on a live edge, never on the first build.
- **Mixed builds** (owner call "No old builds in development"): no fences, migrations or capability checks.
  - The new op, the new replicated field and the eight catalog entries are a clean break: `WORLD_NS` v22 → v23, in the
    same commit as the `Rail.glide` reshape, with a dated history line.
  - A pre-bump tab may hit bugs, and that's accepted. The server still validates `rail.glide` like every op (unknown or
    malformed input is a recorded rejection, never a crash).
  - The cart change alone wouldn't need a bump; it rides this one.

### The bot (Home flow finding 4, glider finding 1)

`dev/look/bots/railway.ts`:

1. **The assertion at about line 1404.**
   - Today it is `require(!registry().ops.some((op) => /^rail\.(glide|train)/.test(op)), 'no later railway ability is
     installed')`. `registry()` lists lockstep ops, and the railway's actions are Server-kind `RAIL_ACTIONS`, so
     `rail.glide` would never appear there and the check would pass vacuously.
   - Replace it with `require(!read().glide && !read().glider.owned, 'the glider is not granted after line one')`, and
     drop the `registry` import if it's then unused.
   - At the first summit visit (after `checkpoint('needle bell summit')`), add
     `require(!!v2().glideDevice && !v2().glideDevice.available && !v2().glideDevice.woken && !read().glide, 'the
     summit glider is sealed before Q5')`.
2. **The pack at the forge.** In the forge loop (`for (let load = 0; l2().forge.used < 56; load++)`), once
   `l2().forge.used >= 24 && !l2().pack`:
   - Walk to `read().reward.tools.packChest`, `bot.use(…, /^Open/)` and `bot.work(() => l2().pack)`.
   - Dismiss the card, `require(read().carryMax === 16)`, then `checkpoint('pack')`.
   - From then on, the line-two fills and `takeRails` use `read().carryMax` instead of the literal 8.
   - The block after the quarry lever (pack, call the cart, board, ride to Q4) runs only under `&botOrder=legacy`.
     The default walks from the lever to Q4 with `toQ4()` and waits there for the cart's loads.
3. **The sea switch on the first climb.** In the `k === 1` branch, after the `hookDrop` early exits and before
   `downFromNeedleBell`:
   - Walk to `v2().sea`, wait for `railway-sea-switch`, `bot.use(…, /^Pull$/)`, then `bot.work(() => l2().seaOpen)`
     and wait for the gate's collider to go.
   - `checkpoint('sea gate')`. Copy this from `seaToFarHead` lines 266–272.
   - The route end then calls `seaToFarHead({ …, quarryFrom: 172 }, 'q5')`, which skips the second climb. Under
     `botOrder=legacy` it keeps `'sea'`.
4. **The glide home.** Add a new export, `glideHome({ bot, checkpoint, walkQuarry }, from: 'far-head' | 'village')`,
   next to `seaToFarHead`.
   - **Getting up:** from Far Head, `walkQuarry(546, 92)`. From the village, walk to the deck at s = 84, then
     `walkQuarry(84, 92)`. Then `approachNeedleBell` and `climbNeedleBell`.
   - **The take:** `require(v2().glideDevice.available && v2().glideDevice.woken)`. Walk to the device,
     `bot.use(…, /^Take it$/)`, `bot.work(() => read().glide)`, dismiss the card, then `checkpoint('glider taken')`.
   - **The flight:** face `LINE2_BOILER` in metres (919, 18.15, 5.4) and hold W off the west edge. Once airborne and
     falling, use the Glide action (`triggerAction('glide', 'down')`, then `'up'`), and re-face the pedestal every
     100 ms.
   - **Samples:** 3 s into the hold, require `|vy + 3.2| < 0.3` and horizontal speed `10 ± 0.5`.
   - **The landing:** release W within 9 m of the pedestal, then wait for `me.coyote > 0`. Require `!me.swimming`,
     landing within 14 m of the pedestal, `read().glider.flights === 1` and no recovery. Note the flight's seconds,
     then `checkpoint('glided home')`.
   - **Route end:** `seaToFarHead(…)`, then `glideHome(…, 'far-head')`, then
     `boilerToPier({ bot, checkpoint, walkQuarry }, 'boiler')`. Under `botOrder=legacy`, skip the glide and keep
     `boilerToPier(…)` from `'far-head'`.
5. **The co-op friend** (the `second` branch):
   - Wait for and checkpoint `'pack'` before `'quarry gate open'`, matching the leader. Legacy keeps today's order.
   - After `'Q5 laid'`, wait for `read().glide`, then require `read().reward.arrival.seen.includes('glide')`,
     `!read().reward.showing` and `read().glider.owned`. Then `checkpoint('glider taken')`.
6. **Segments and seeds.**
   - `dev/look/segments.ts`: add `glider: 'glided home'` to `RAIL_STOPS`, after `Q5`.
   - `dev/look/rail-seed.ts`: add three stages.
     - `glide-earned`: `railwayAtQ5('q5-done')`, then `act(w, 'a', 'rail.glide')`.
     - `q5-shelved` (look-only): `railwayAtQ5('q4-done')`, advanced until the cart's `DROP` with `depotRails === 24`.
     - `q5-arriving` (look-only): the cart on its `RUN` to `CART_ROAD.rackCm(4)` with `rails === 24`. Add it to the
       `q2-arriving`/`q4-arriving` block with `k = 4`.
   - `dev/look/evals/railway-b5b8-bot.ts`: accept `railFrom=glide`, which runs `glideHome(…, 'village')` and then
     `boilerToPier(…, 'boiler')`. That's the seeded half from `--rail-seed q5-done`.

## Steps

Branch `claude/glider-b-home-flow` from `origin/main`. Each step leaves `npm run check` green, and each is one commit.

- [x] **1. The cart carries 24 rails.** _(Built: `CART.rails = 24`. Beyond the plan, five Q4 assertions that read
  `CART.rails` as "Q4's rails" now read Q4's bill (16): `test/railway-cart.test.ts` (`Q4_RAILS`), the Q4 test in
  `test/railway-line2.test.ts` and the pack/cart test in `server/test/railway-line-host.test.ts`. The `railwayAtQ5`
  helper waits for 24 shelf rails. The Q5 test hand-stocks 8 forge rails before the shelf's 16, so 8 are left to
  return on funding, and checks the cart rests with no second trip. `cart-view.ts` sizes from `CART.rails`.)_
  - `src/sim/railway-cart.ts`: `CART.rails: 24`, and update the comment ("the cart holds 24 rails: one shipment covers
    Q5", Home flow finding 1).
  - `test/railway-line2.test.ts`: rewrite `'Q5: behind the sea gate; two cart trips bring its rails, never minted'` as
    **`'Q5: behind the sea gate; one cart trip brings all 24 of its rails, never minted'`**.
    - After `untilUnload(w, 4, () => l().depotRails === 24)`, expect `shelfOut === 24` and `depot === 24`.
    - Two backs of 8 plus 8 come from the shelf. Q5 funds with no second trip.
    - Keep the leftover-returns-to-forge check by stocking 8 rails by hand first.
  - Update `"the away credit runs Q5's cart too…"`: change its message to "one shipment".
  - `test/railway-cart.test.ts`: add **`'one cart load of rails fills from one full forge rack and covers Q5's rail
    bill'`**. It asserts `CART.rails <= LINE2_FORGE.rackMax`, `CART.rails >= LINE2_STATIONS[4].bill[1]`, and that a Q4
    cart still takes only 16.
  - Verify: `node --test test/railway-line2.test.ts test/railway-cart.test.ts test/railway-away.test.ts`, then `npm
    run check`.
- [x] **2. `Rail.glide` and `rail.glide`, with the bump.** _(Built as planned; order 40 was free. The host test uses
  `pidOf: (sid) => sid` so the second session is a second player, and also refuses a take from the sea switch handle
  4.5 m off. The malformed-document case is in both the forge-stage list and the new glider test at `q4-done`.)_
  - In `src/sim/`:
    - `railway-world.ts`: the field, `railwayView` and `refreshRailway`.
    - `railway-line2.ts`: the `glide` type and the invariant.
    - `railway-line2-layout.ts`: `LINE2_GLIDE`.
    - `railway-systems.ts`: the `glide` system, its `OPS` entry, and the header comment's op list.
  - `src/world/railway-server.ts`: `RAIL_ACTIONS` and `railValid`.
  - `src/world/railway-predict.ts`: `RAIL_PREDICTED`.
  - `src/world/namespace.ts`: `WORLD_NS = 'v23'`, with the history line `// v23 (2026-11-DD): the glider's rules
    (piece B): rail.glide, a glide field on rail, eight railGlide* tunables; the depot cart holds 24 rails.` (it names
    step 3's tunables, which land in the same batch).
  - Tests:
    - `test/railway-line2.test.ts`: **`'the glider: sealed until Q5, one shared take after, kept through load; it opens
      no Works step early'`**.
      - At `railwayAtQ5('q5-finishing')`, `rail.glide` returns 0.
      - After `finishQ(w, 4)`, `a`'s take returns 1 and `b`'s returns 0.
      - `restore(w)` keeps `glide`.
      - With the glider, `rail.strike` (ids 0, 1), `rail.kiln` and `rail.footTake` still return 0 at `q5-done`
        (finding 10).
    - `'malformed line-two documents fail atomically'`: add a document with `line2.glide = true` at Q4. It throws
      `railway: glide before Q5` and leaves the world unchanged.
    - `test/railway-replicate.test.ts`: add `'rail.glide'` to the fuzzed no-field ops (line 194, `int(5)` → `int(6)`).
    - `server/test/railway-line-host.test.ts`: **`'line host: the glider judged on the summit device, only after Q5;
      one shared take survives a restart'`**, modelled on the summit-pull test.
      - Refused at `q5-finishing` even at the device.
      - At `q5-done`: refused at the sea switch's ground projection (y 20 m) and at the hook device. Accepted at
        `LINE2_GLIDE`.
      - A second session's take is a noop.
      - After an orderly restart, `railway.line2.glide === true`.
  - Verify: `node --test test/railway-line2.test.ts test/railway-replicate.test.ts`, `npm --prefix server test`, then
    `npm run check`.
- [x] **3. The glide tunables.** _(Built as planned. The catalog's `owner` override is `'owner' in railway`, since
  `supply` is `as const`. Beyond the plan, three hand-written `RailwayMovement` literals (`test/railway-adapter.test.ts`,
  `test/railway-replicate.test.ts`, `dev/peer-test/ws-page.ts`) spread `railMovement` of the defaults. `npm run tune --
  list` shows the eight. The `railGlide=1` look was queued behind two long playthroughs on the shared GPU and stopped
  before it ran; the same flight numbers, now from the tunables, are Proof 4's.)_
  - `src/sim/tune.ts`: the eight keys, appended.
  - `src/tunables/catalog.ts`: the eight `supply` entries and the `owner` override.
  - `server/src/host/world-host.ts`: `RAIL_TUNE_KEYS`.
  - `src/adapters/railway.ts`: `railMovement`, `RailwayMovement` and `sameMovement`.
  - `src/entities/railway/glide.ts`: read `adapter.inspect()` and drop the `tech-layout.ts` import.
  - Test: `test/tune.test.ts` **`'the glider tunables: appended after the railway keys, defaulting to the BotW
    target'`**. It checks that the indices follow `railBeamGraceS`, the defaults are as in the table, and `okTune`
    refuses 0 and the bounds ± 1.
  - Verify:
    - `npm run tune -- list` shows the eight keys.
    - `npm run look -- --rail-seed q5-done --query railGlide=1 --eval dev/look/evals/railway-glide-first.ts --until
      window.__placeDone --action dev/look/evals/railway-glide-first-act.ts --video --seconds 14`, run before step 4
      removes the dev grant. The flight matches piece A's: sink 3.2 ± 0.3 m/s, 10 ± 0.5 m/s at full stick.
    - `npm run check`.
- [x] **4. Adapter, device, grant, flourish and teach.** _(Built as planned. The card's parts are Place's worn glide
  shape typed `Part[]`; `inspect` also reports `unfurling`. The teach's chip is `glyph('glide')`, empty on touch like the
  jump teach. After Proof 1 the sealed drum lost its brass cap and the mast turned the vane's dark cloth (it read as a
  switch with a lever). After Proof 4 the forge plume parts around the sight line from the camera to Buddy
  (`forge-call.ts`, a logged default): the first flight comes down the column and spent 11 s inside it.)_
  - `src/adapters/railway.ts`: the intent, `intentOf`, `NOT_MATERIAL`, `claimGlide`, `glide` from state, and remove
    the option.
  - `src/adapters/railway-marks.ts` and `dev/playtest/beats.ts`: the mark and its beat.
  - `src/entities/railway/index.ts`: remove the dev grant.
  - New `src/entities/railway/glide-device-view.ts`.
  - `src/entities/railway/line2-view.ts`: five hunks.
  - `src/entities/railway/reward-data.ts`: `GLIDE_REWARD`.
  - `src/entities/railway/ability-arrival.ts`: the `glide` entry, the correction and `glide-taught`.
  - `src/entities/railway/reward.ts`: the `axeModel` wrap.
  - `src/entities/railway/glide.ts`: `railwayGlideOpen`.
  - `test/railway-marks.test.ts`: add `'glide'` to the `ops` list.
  - Verify: `npm run check`. Then the stills in Proofs 1–3 and the grant video (Proof 4), each opened and looked at.
- [x] **5. Seeds, evals and the glider look.** _(Built as planned. The grant's take and flight are the bot's own
  `takeGlider` and `glideToBoiler` (exported from `bots/railway.ts`), so the look and the route fly the same path. With
  `--players 2` player 2 checks the flourish, no card and the roll, then watches the leader's canopy. The wake eval
  needs `--real`: a warped warm-up runs the page's waits in game time while the server ticks in real time.)_
  - `dev/look/rail-seed.ts`: `glide-earned`, `q5-shelved` and `q5-arriving`.
  - `dev/look/bots/railway-glide.ts`:
    - `stage()` accepts either a granted room (`glide-earned`) or `glideTake=1` at `q5-done`. With `glideTake=1` it
      stands you 2.5 m east of the device facing it, as staging only.
    - The act half presses Interact, dismisses the card, steps off west, and flies to the forge apron as in bot step 4.
    - It writes `__glideResult` with `seconds`, `sinkMean`, `speedMax`, `landing { x, z, dry, toPedestal }`, `card` and
      `flights`.
  - `dev/look/evals/railway-glide-first.ts`: update its usage comment.
  - Verify: `npm run checkpoints -- awake q5-done trains-on glide-earned q5-shelved q5-arriving`, then Proofs 4–6.
- [x] **6. The bot.** _(Built as planned, with the glide home split into exported `takeGlider` and `glideToBoiler`
  for the look; the samples are every 100 ms at full stick from 3 s after opening to the let-go, checked as the mean
  sink and the top speed. The seeded half `railFrom=glide` passed with no recovery: glider taken at 39.2 s, glided home
  at 68.7 s, the flight 27.9 s, 4.0 m from the pedestal, dry. The `--to Q2`, `--to hook` and `--to Q5` playthroughs
  were folded into the long run, which passes each of those checkpoints.)_ Bot items 1–6 above, in `dev/look/bots/railway.ts`, `dev/look/segments.ts` and
  `dev/look/evals/railway-b5b8-bot.ts`.
  - Verify the seeded half: `npm run look -- --rail-seed q5-done --query 'railFrom=glide&railStop=glided home' --eval
    dev/look/evals/railway-b5b8-bot.ts --until window.__railStop`. It must pass with no recovery.
  - Then `npm run playthrough -- --to Q2` (the pack before Q1), `npm run playthrough -- --to hook` (the sealed check),
    and `npm run playthrough -- --to Q5` (the switch on the first climb, one Q5 cart trip).
- [ ] **7. Record.**
  - `docs/game-design/place.md`: a new section, "Production glider (9 November 2026, piece B)", after "Production Q5,
    the sea gate and Far Head". It covers the device, the grant, the teach, the landing toward the forge, the tunables,
    the cart's 24 rails, `WORLD_NS` and "Not tested on a device". In the Q5 section, edit the cart's 16 to 24.
  - `docs/agent-calls.md`: add the PR to the Where column of the rows this batch builds (the cart's rails, the landing
    facing the forge, the bot's order and the glider-placement calls it implements); their status stays `open` until
    the owner sees them. The plan's own calls are already logged by the design review. _(Designer, 9 November: was
    "mark rows 15, 18 and 20 as built"; "built" isn't a status in agent-calls, and row numbers shift.)_
  - Add an "As built" block to this plan.
  - `docs/agents/orchestrator-state.md`: move "Glider piece B" and "Home flow fixes" out of Queued.
  - Verify: `npm run check`.
- [ ] **8. Rebase, prove and ship.** Follow "Rebasing onto J5" below, then Proofs 7–11, then `npm run ship`.

### Rebasing onto J5

J5 (Split-rock crossing) is being built now. The orchestrator note says J5 stops if it needs a `WORLD_NS` bump (it may
add a sim hold on `rail.turn`).

**Where the two meet:**
- `src/world/namespace.ts`
- `src/sim/railway-systems.ts`: a different system and `OPS` line.
- `src/world/railway-server.ts`, if J5 validates its hold.
- `dev/look/bots/railway.ts`: J5 appends `splitRockToCrossing` after `boilerToPier` at the route's end.
- `docs/game-design/place.md`, the plan record and `docs/agent-calls.md`.

This batch doesn't touch `view.ts`, `train-view.ts` or `halts-view.ts`. Before step 8, `git fetch origin`, then:

1. **J5 merged with no bump:** `git rebase origin/main`. Keep v23. At the route's end the order is `seaToFarHead`,
   `glideHome`, `boilerToPier(…, 'boiler')`, then J5's `splitRockToCrossing`.
2. **J5 finished on its branch and needs a bump** (stopped, or holding a bump commit): rebase onto J5's tip with
   `git rebase --onto <J5 tip> origin/main`.
   - Resolve `namespace.ts` to **one** `v23` with one dated history line naming both changes: "v23 (2026-11-DD): the
     glider's rules (piece B) … ; Split-rock J5: … the hold on rail.turn …".
   - If J5's branch already has its v23 line, extend that line and drop this batch's own.
   - Rerun step 2's tests, `test/railway-works.test.ts` and `server/test/railway-works-host.test.ts`.
   - Ship both in **one** `npm run ship`, so main deploys once and the owner sees one reset. Tell the orchestrator that
     J5 ships inside this batch.
3. **J5 still being built:** don't ship a bump that J5 would have to follow with another. Hand the finished branch to
   the orchestrator as "ready, waiting to share J5's bump". If J5 then lands without a bump, take case 1. If it lands
   with one, take case 2. Nothing else waits on this branch.
4. **J5 has already shipped its own bump to main** (v23 live): rebase and take v24, a second reset. Ship it only with
   no owner session live (open question 3).

**Before any ship with a bump:** run `npm run playtest` (`node dev/playtest/cli.ts`). If the newest non-automated
session is still live (its last event within the last 10 minutes), don't ship; wait and check again. If the CLI can't
find playwright, run `npm ci` in the main checkout (orchestrator note). Report the check's output in the ship message.

## Proofs

All looks are opened and looked at. Report what each one shows.

1. **Sealed still:** `npm run look -- --rail-seed hook-earned --cam 1021.5,104.6,-1 --look 1016,103.2,-4.5 --name
   glide-sealed`. A dark drum and vane beside the switch, with no ring or shaft. `glideDevice.available` is false.
   It must not read as a second, broken switch: on 8 November players pressed Pull 18 times at this spot. If it does,
   drop the brass cap or darken the drum; don't add a prompt or a sign. _(Designer, 9 November, finding 4.)_
2. **Take-faces-forge still:** `npm run look -- --rail-seed q5-done --cam 1018.6,104.3,-4.5 --look 919,30,5.4 --name
   glide-heading`. The device in the foreground and the forge plume beyond it, along the step-off line.
3. **Woken still**, desktop and phone size. New eval `dev/look/evals/railway-glide-wake.ts` waits for
   `line2View.glideDevice.woken` on a live edge, then sets `__placeDone`.
   - `npm run look -- --real --rail-seed q5-finishing --eval dev/look/evals/railway-glide-wake.ts --until
     window.__placeDone --cam 1379,27.5,-180 --look 1016,120,-8.8 --name glide-woken`
   - Repeat with `--size 844x390`.
   - Report honestly whether the locator reads at 400 m (open question 2).
4. **Grant moment** (motion): `npm run look -- --rail-seed q5-done --query glideTake=1 --eval
   dev/look/evals/railway-glide-first.ts --until window.__placeDone --action dev/look/evals/railway-glide-first-act.ts
   --video --seconds 40`.
   - The press, then on the next frame the card "The glider" / "Open it in the air.", the sound and the roll on your
     back.
   - Then the step-off, the canopy open within 0.1 s, the 5.2 m camera, and, letting go over it, the landing on the
     forge apron. Holding the stick instead carries you about 250 m, into the cove; the as-built note says so
     (designer, 9 November, finding 3).
   - Report `__glideResult`: about 26 s, sink 3.2 ± 0.3 m/s, 10 ± 0.5 m/s, dry, under 14 m from the pedestal.
   - Look at consecutive frames of the take and the landing (owner call "Review motion").
5. **Co-op grant:** Proof 4 with `--players 2`. Player 2 gets the flourish (teal puff, `pickupGlider`, the glider
   badge) and no card. Each sees the other's roll, and the leader's open canopy comes through `railwayGlide`.
6. **Cart-rails still:** `npm run look -- --rail-seed q5-shelved --cam <shelf + (6, 2, 4)> --look <shelf> --name
   cart-24-rails`. Read the shelf position from `line2View.shelf` in a first run's inspect. The shelf shows 24 rails
   in three rows beside 24 logs. Also check `line2View.cart` at `--rail-seed q5-arriving`: 24 rails drawn aboard.
7. **`npm run check`**, then **`npm run check:full`**. This includes `npm --prefix server test` and **`npm run
   test:net`**: this batch touches `server/` and the railway's wire.
8. **Routed checks:** `npm run checks-for -- --run`, which includes two peers through T2 and `npm run scenario --
   world-inputs`.
9. **Restore:** `npm run look -- --rail-seed glide-earned --eval dev/look/evals/railway-glide-first.ts --until
   window.__placeDone`. The glider is owned within 2 s, the roll shows, the device shows taken, and no card plays. The
   server restart is covered by step 2's host test.
10. **Performance:** `npm run perf -- --render` before (on `origin/main`) and after. Report draw calls and triangles.
    Expect at most six more draws with the summit in view and none elsewhere. No tick work is added beyond one system.
11. **The long production playthrough to the pier**, once, as the last pass: `npm run playthrough -- --long --stall
    6000`. _(Done 9 November: `gb-long2` passed; numbers in "As built".)_
    - Must pass with the new checkpoints in order: `pack` (before `Q1 funded`), `sea gate` (on the first climb, after
      `needle bell summit`), `Q5 laid`, `glider taken`, `glided home`, `boiler` … `pier`, plus J5's if rebased.
    - Report the Q5 rim wait (it was 216 s server time; expect 80–125 s, about 66 s of outbound cart plus what's left
      of its return from Q4; designer, 9 November, finding 5), the glide segment's time, and the total against
      `x1-long`'s 118 game-minutes.

## Done means (in order)

1. Steps 1–7 are committed on `claude/glider-b-home-flow`, each with `npm run check` green.
2. All the named tests pass:
   - `test/railway-line2.test.ts` (the glider test, the 24-rail Q5 test and the malformed-document case).
   - `test/railway-cart.test.ts`.
   - `test/railway-replicate.test.ts`.
   - `test/railway-marks.test.ts`.
   - `test/tune.test.ts`.
   - `server/test/railway-line-host.test.ts`.
3. `npm run checkpoints -- awake q5-done trains-on glide-earned q5-shelved q5-arriving` builds.
4. Proofs 1–6 and 9 were run and looked at, with what each one shows written into the as-built block.
5. The seeded half `railFrom=glide` passes with no recovery.
6. `npm run check:full` (including `npm run test:net`) and `npm run checks-for -- --run` pass. The perf delta is
   reported.
7. The branch is rebased per "Rebasing onto J5", and exactly one `WORLD_NS` bump is in the shipped batch.
8. The long playthrough to the pier passes on the rebased branch. _(Done 9 November: `gb-long2`, see "As built",
   Proof 11.)_
9. The records are written: place.md, agent-calls, this plan and the orchestrator state.
10. `npm run playtest` shows no live owner session, then `npm run ship`. Report only what was verified, with "Not tested
    on a device".

## Calls this plan logs (in `docs/agent-calls.md`, as defaults)

- `rail.glide` is predicted, like `rail.pack`, so the card comes on the press. A refusal leaves the card, and the latch
  drops ownership 2 s later.
- The dev grant `&railGlide=1` is removed; the seeds replace it.
- `LINE2_GLIDE` is at (1016, 102.4, −4.5), with the vane pointing at the forge (corrected from −8.8 by the design
  review).
- The glide tunables: eight integer `railGlide*` keys at the BotW defaults.
- The production bot glides home from Needle Bell after Q5 by default. `&botOrder=legacy` keeps today's order: the pack
  after the lever, the cart ride, the second climb and the walk home.
- The bot's "no later ability" assertion becomes a state assertion, because `registry()` never listed the railway's
  Server-kind ops.

## Risks

- **Room safety (the "Don't" list).**
  - Keep `glide` a pure state flip that returns 1. The card, sound and flourish play only from accepted or predicted
    events in the views, never in the system.
  - Never treat `claimGlide()`'s queued result as the grant.
  - `railwayGlide` must return `null` whenever the canopy shuts, including on a refusal.
  - Don't patch actions by string id: `glide` stays registered by `glide.ts`.
  - No `Math.random` or wall clock in the sim. The device's sparkles and unfurl are Local.
  - The `LOCKSTEP_FILES` math rules apply to the new system: no floats, only a boolean.
- **Hotspots:**
  - `src/sim/railway-systems.ts` (1,518 lines; J5 may edit it).
  - `src/adapters/railway.ts`.
  - `src/entities/railway/line2-view.ts` (1,115 lines; keep its hunks to one line each and put the logic in
    `glide-device-view.ts`).
  - `dev/look/bots/railway.ts` (1,894 lines; J5 appends to the route's end).
  - `src/world/namespace.ts`, `docs/game-design/place.md` and `docs/agent-calls.md`.
  - Rebase onto main right before step 8.
- **Mixed builds:** the change is additive on the wire (a new op, a new field, appended tunables) with a clean
  `WORLD_NS` break and no compatibility code. Never ship the bump while the owner is mid-session. Never two resets in
  one day if a shared bump is possible.
- **Tunable order:** `TUNABLES` order is hashed, so append and never reorder. Keep the `Tune` catalog and
  `RAIL_TUNE_KEYS` in step: a key missing from `RAIL_TUNE_KEYS` silently can't be set in production rooms.
- **The bot's new route can fail in new places:**
  - The pack's 16-log fills change walking paths.
  - The glide can clip Needle Bell's flank or the forge chimney. If it does, the eval reports where; move the
    step-off line rather than the tuning.
  - The landing must miss the boiler on its pedestal: release the stick 9 m short.
  - Keep `botOrder=legacy` working for the cart-ride and second-climb checks.
- **The cart at Q5** stands about 0.18 m taller (a third row of rails). Only the legacy cart ride boards it, and that's
  at Q4, where it holds 16 or fewer. A cart now waits at the forge for 24 rails when the rack was raided by hand. At
  2 rails a second that's at most 12 s.
- **Performance:** one device (about 5 meshes and an additive shaft) on the summit, and no per-frame allocation.
  `npm run perf` covers it. Warm the woken materials behind loading as piece A did for the canopy, so the wake edge
  doesn't hitch.
- **The first fall is 102 m.** Without the teach pulse, a player who presses nothing falls the whole way (finding 6).
  The pulse is the mitigation; the fall arrival handles the landing.

## Open questions

1. **Frame Split-rock's walk-in cleft so it's visible from the Q5 rim (Home flow finding 1, a New call)?** Recommended:
   yes, as its own small placement job after J5 lands, owned by the Split-rock plan, not this batch. With 24 rails the
   rim wait drops to about one cart cycle, so the cleft becomes a side pull rather than a fix.
2. **The woken locator from Far Head.** Call 12 says as faint as the jump device's (opacity 0.1). The brief's "Woken"
   check wants it to read at phone size from 400 m. Recommended: keep opacity 0.1. If Proof 3 shows it unreadable, widen
   the shaft (radius 0.1 → 0.5 m) rather than brighten it. The forge plume, not the summit, is the main pull home after
   Q5.
3. **If J5 has already shipped its own `WORLD_NS` bump before this batch is ready**, ship this one as v24 (a second
   reset that day) or hold it for the next batch? Recommended: ship v24 as soon as no owner session is live; nothing
   waits.
4. **Building piece B makes the summit return live** (glider call 1, a New call still open in agent-calls). Recommended:
   proceed. Moving it to Far Head's pad later is one constant (`LINE2_GLIDE`) and a seed.

## As built

Built 9 November on the implementer's branch; steps 1–7 as ticked above. Every still and sheet below was opened and
looked at. Not tested on a device.

- **Proof 1, sealed** (`.look/glide-sealed-still.png`, `hook-earned`): first pass, the brass cap and a pale mast beside
  the live switch read as a second switch with a lever. Rebuilt dark all over (no cap, the mast in the vane's cloth);
  second pass it reads as an unlit dark post beside the only bright, pressable thing, the switch. Its silhouette still
  echoes the switch's drum; the owner may want to look.
- **Proof 2, take faces the forge** (`.look/glide-heading-still.png`, `q5-done`, from 1020.5, 105.2, −3 toward the
  plume): the woken device in the foreground, teal vane open, rings and core lit, the faint shaft above. The forge
  plume shows as a white puff just over the summit pad's west edge; the forge itself is below the edge until you step
  to it. The plan's camera (2 m from the drum, looking 37° down) was all drum and is not kept.
- **Proof 3, woken from Far Head** (`.look/glide-woken-still.png`, `glide-woken-phone-still.png`, live edge from
  `q5-finishing`, `--real`): the device woke on the live edge (`unfurling` seen, then woken). From 400 m the locator
  does **not** read at desktop size (a barely visible line over Needle Bell's flag at 3× zoom) or at 844×390 (nothing).
  The forge plume does read from Far Head at desktop size. Open question 2 stays the owner's: widen the shaft
  (radius 0.1 → 0.5) or the designer's summit bell note.
- **Proof 4, the grant** (`.look/glide-grant-realtime.webm`, `glideTake=1`): the press, Buddy turns and lifts the
  prize in a starburst over the device, the roll on the back, the walk to the step-off, the canopy, the glide over the
  village and the landing beside the boiler. `__glideResult`: 28.0 s, sink 3.2 m/s, top speed 10.0 m/s (51 samples at
  full stick), let go at 9.7 s from the step-off, landed dry 4.3 m from the pedestal, card shown, one flight. The card's
  text sits in the HUD, which looks hide; `reward.showing` was true. First pass: 11 s of the 28 s flight were inside the
  forge plume's opaque puffs with Buddy hidden (the column stands on the pedestal the glide aims at). The plume now
  parts around the sight line from the camera to Buddy (`forge-call.ts`, logged in agent-calls); second pass Buddy and
  the canopy stay in view all the way down, the column whole around them. Holding full stick instead carries you about
  250 m, past the forge into the cove (a swim): the first flight lands on the apron only if you let go over it.
- **Proof 5, co-op** (`.look/glide-grant-coop-realtime.webm`, `--players 2`): player 2 got the flourish
  (`arrival.seen` has `glide`), no card, owned it and drew two rolls; it saw the leader's open canopy through presence.
  The leader's video shows the partner's roll from the take on.
- **Proof 6, cart rails** (`.look/cart-24-rails-still.png`, `q5-shelved`; `.look/cart-24-aboard-still.png`,
  `q5-arriving`): the shelf holds 24 rails in layers beside the 24-log rack (`shelf.shown` 24), half behind a frame post
  from the plan's angle; the cart crosses the gorge bridge with a deep stack of rails aboard, `cart.rails` 24, no logs.
- **Proof 9, restore** (`.look/glide-restore-still.png`, `glide-earned`): owned within 2 s, the folded roll on Buddy's
  back, the device dark and taken (no vane, mast or lights), no card.
- **Proof 11, the long playthrough** (`.look/playthrough/gb-long2/`, rebased on `origin/main` at `c481d37f`, WORLD_NS
  v22 → v23, run at a 1-minute load of about 26 after the machine's restart): verdict `pass`, "everything it expected
  came", 0 errors. Checkpoints in order: `pack` (15:26) before `Q1 funded` (17:05); `needle bell summit` (26:04), then
  `sea gate` (26:05) on the first climb; `Q4 laid`, `Q5 funded`, `Q5 laid` (1:04:01), `Far Head`, `glider taken`
  (1:06:42), `glided home` (1:07:11), `boiler`, `TRAINS`, `Q6 laid`, `pier` (1:20:32), then J5's `breaker`, `stall
  open`, `throat open`, `kiln lit`, `first footing`, `stall built`, `cradle fitted`, `table turned`, `wagon coupled`,
  `footings at the pier`, `crossing footed` (2:41:12). Times are the warped game clock unless named.
  - The Q5 rim wait (Q4 laid → Q5 funded): ticks 3776 → 4743, **96.7 s of server time** (was 216 s; expected 80–125
    s). It is 12 min 31 s on the warped clock, and the bot stands still for most of it at the Q5 frame.
  - The glide segment: `glider taken` → `glided home`, **29.5 game-seconds** (26.5 s from the canopy opening to the
    landing at the forge, 923, 5).
  - The total: **80.5 game-minutes to the pier** against `x1-long`'s 118 (161 game-minutes to J5's `crossing footed`;
    27 min of wall clock).
- **Review fixes (9 November, after Proof 11):** the adapter's `holds` now covers `rail.glide`, so a take lost to a
  friend within one round trip settles as a noop with no correction and the reward plays once (the replicate test races
  it, failing before the fix); the late joiner sees the glider taken; host tests cover the device's reach edges and all
  eight glide tunables from a proto room's controller; the forge plume no longer draws at NaN scale with no body. None
  of these touch the route, its rules or the bot, so the long run was not repeated.

## Design review (designer, 2026-11-09)

Read against DESIGN.md (3, 6, 7, 8, 10, 11), [owner-calls](../agents/owner-calls.md) (Nothing waits for a playtest; Pick
and log; Input gets instant feedback; Anything playtests could tune is tunable; No old builds; Tune for 1–3), the
[decision index](../decisions.md#current-decision-index) and its routed entries (Design Table 1 November, "the glider
matches Breath of the Wild"; 1 November, glide is an unlock; 5 November, "a construction job between hook and glider";
6 November, all progression shared; 7 November, co-op abilities option E; 8 November, the glider deferred, not cut;
9 November, pick and log), [direction](../direction.md), [playtests](../playtests.md) (8 November solo runs),
[find-the-fun](find-the-fun.md) (rules for every prototype), [glider-placement](../brainstorms/glider-placement.md) and its
review, [home-flow](../reviews/home-flow.md), and the research index's _Puzzles, abilities and traversal_ and _World,
places and level design_ sections: [progression-flow-layout](../research/progression-flow-layout.md),
[route-contract](../research/route-contract.md), [level-design](../research/level-design.md),
[botw-glide-target](../research/botw-glide-target.md), [ability-upgrades](../research/ability-upgrades.md),
[wordless-onboarding](../research/wordless-onboarding.md). Code read: `src/sim/railway-cart.ts`, `cartWants` and
`cartStep` in `src/sim/railway-systems.ts`, `src/sim/railway-line2-layout.ts`, `src/proto/place/tech-layout.ts` (PADS,
`ringAt`), `src/proto/place/tech.ts` (DRUM, shaft, the sea switch), `src/proto/place/land.ts` (`buildSpire`),
`src/entities/railway/glide.ts`. Playtest data: `node dev/playtest/cli.ts` (owner session `mw8n0kbk`, 8 November).

**Fit and order (game-direction check).** The outcome is the owner's 9 November seed: a movement find on the earlier
side, about 25 minutes into a roughly six-hour game, with room to upgrade. It's within approved scope (glider deferred,
not cut, 8 November; piece B was the second half of the reviewed brainstorm). The cart and bot changes are the logged
home-flow defaults. Disposition: **build with changes** (findings 1–3). Nothing here needs the owner before building; the
`WORLD_NS` bump follows the standing reset call and the live-session check the plan already has.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The glider waits sealed on Needle Bell's summit, wakes when Q5 is laid, and you hook back up to take it | New (logged) | agent-calls, glider-placement call 1. **Proceed** (open question 4): one constant and a seed to move it |
| 2 | Q3, Q4 and Q5's construction stand between the hook and the glider | Decided | 5 November, "a construction job between hook and glider" |
| 3 | One room-wide boolean, saved and inherited on join; the finder gets the card, everyone else the flourish | Decided | 6 November, all progression shared; 7 November, option E; boolean per glider-placement finding 2 |
| 4 | The take needs Q5 laid and the glider not yet taken; heard within 3.2 m across and 2.6 m of deck height | Default | Same shape as `rail.seaSwitch`. A simultaneous second take is a noop and gets the flourish |
| 5 | The device stands at (1016, 102.4, −4.5) | Default | **Corrected from −8.8** (finding 1). 4.5 m from the switch, 6.7 m from the ring, clear of the rock and the orange vane |
| 6 | Sealed: a dark drum with a folded canopy vane on a short mast pointing at the forge; no ring, core, locator or prompt | Default | DESIGN 7 tease on the first climb. Must not read as a second switch (finding 4) |
| 7 | Woken: teal and cream vane, rings and core turning, a faint locator (radius 0.1, 50 m, opacity 0.1) | Default | glider-placement call 12; 3 November "heavy-handed" shafts. Open question 2 below |
| 8 | The wake plays once on the live 4 → 5 edge (0.6 s unfurl); a restore snaps; no summit cinematic | Default | glider-placement call 13 |
| 9 | "Take it" on Interact, target within 3 m across and 2.2 m height | Default | Matches `railway-hook-device` |
| 10 | Taken: rings, core, locator and vane hidden; the drum stays | Default | Reads as spent, as the hook device does |
| 11 | Card "The glider" / "Open it in the air.", `pickupGlider` sound, roll on the back | Default | glider-placement call 11; Place's copy, not The Boogler's |
| 12 | The card and sound come on the press (predicted); a refusal leaves the card and the latch drops ownership 2 s later | Decided / Default | Decided: "Input gets instant feedback" (6 November). Default: keeping the card on a refusal |
| 13 | First fall after the take: a chip pulses a glyph at Buddy's back while falling faster than 4 m/s with the canopy shut; ends on open or landing; finder only | Default | glider-placement call 10. **Use the Glide action's glyph, not Jump** (finding 2) |
| 14 | The take faces the forge; the first flight heads for the boiler's apron, about 26 s | New (logged) / Default | home-flow finding 2 (New), glider-placement call 14. Holds for a player who lets go over the apron; full stick overshoots (finding 3) |
| 15 | Eight `railGlide*` tunables at the BotW target (10 m/s, 3.2 m/s, 18/12/8 m/s², 0.12 s, 360°/s, 0.1 s), room-wide | Decided | Design Table, 1 November; "Anything playtests could tune is tunable"; botw-glide-target recs 1–3. The min–max ranges are Default |
| 16 | The depot cart carries 24 rails, so Q5's first shipment funds it | Default (logged) | home-flow finding 1. Chosen over cutting Q5's bill to 16, which would change the stretch's look and lay |
| 17 | Side effects of 24: away credit moves up to 24 rails a cart trip; a cart waits at the forge up to 12 s for a hand-raided rack | Default | Both capped by the bill. Small, logged |
| 18 | The bot plays in a player's order: pack at the forge, the switch on the first climb, glide home after Q5; `&botOrder=legacy` keeps today's | Default (logged) | home-flow finding 4; glider-placement finding 1 |
| 19 | The dev grant `&railGlide=1` goes; seeds replace it | Default | No old builds; one path to the grant |
| 20 | Q5's completion wakes the summit and casts the boiler on one edge; the player picks which first | Default (logged) | glider-placement call 13; progression-flow-layout lens 7's "two pulls and a choice" |
| 21 | The glider opens no Works step early; reaching places early is fine | New (logged) | glider-placement call 17; route-contract rec 1; the plan's sim test proves it |
| 22 | `WORLD_NS` v23 shared with J5, or v24 the same day, never during a live owner session | Decided | "No old builds" (reset without asking unless the owner is playing); "Nothing waits for a playtest", its `WORLD_NS` note |
| 23 | Framing Split-rock's cleft from the rim stays out of this batch | New (logged) | home-flow finding 1. Open question 1: yes, later, owned by Split-rock |

**Counts:** Decided 5 (2, 3, 15, 22, and the instant-feedback half of 12), Default 15, New 4 (1, 14, 21 and 23, all
already logged and recommended by earlier reviews; none is new in this plan).

### Flow: the plan's stretch, leg by leg

Positions from `railway-line2-layout.ts`, `tech-layout.ts` and the map data; walks at 5.6 m/s; cart times from
`railway-cart.ts` (legs of 24.8 s and 33.3 s, 3 s load, 3 s leave, 2.2 s drop).

| Leg | Beat to beat | ≈ s | What pulls you on | Rule or lens |
| --- | --- | --- | --- | --- |
| A | Q4 laid → Q5 funded (the rim wait) | about 66 s of outbound cart, plus whatever is left of its return from Q4: 80–125 s (was 216 s) | The cart's run; Needle Bell over the rim; chopping at the rim is now pointless, as the cart brings all 24 logs | Lens 6. Still the longest wait on Home; the cleft (open question 1) is the side pull |
| B | Q5 laid → Far Head | 33 lay + 46–55 | The trestle, lamps and rockets | 7 ✓ |
| C | Far Head → Needle Bell's foot | about 454 m back along line 2: 81 s | J4's 62 m plume over the forge (rule 1 ✓); Needle Bell on the way; the summit's wake, only if seen (open question 2) | 1 ✓ via the plume, not the locator |
| D | Foot → summit | 12–20 s of pulls (home-flow leg 11) | The rings, then the woken device | 4 ✓ |
| E | Summit: land east, walk 3–4 m west to the device, take | 3–5 | The device in front, the plume beyond | 7 ✓: ends facing the next goal |
| F | Step off → landing | about 26 s (bot, letting go 9 m short); full stick runs about 250 m and lands in the cove | The plume below; all of Home in view | 1 ✓; see finding 3 |
| G | Apron → boiler | 0–10 | The pedestal | ✓ |

Far Head to the boiler by way of the glider is about 130 s, against about 100 s walking straight home. That's fine: it's
a detour with a payoff, not a shortcut, and lens 6 doesn't apply. A player who skips the glider still has the plume.

**The three firm rules.**
1. **The next goal can be found.** Yes. From Far Head the plume carries rule 1; the glider is optional at Home (call
   21), so the faint locator doesn't need to carry it. From the take, the plume is on the step-off line (Proof 2).
2. **A gate keeps its meaning.** Yes. The beam and boiler keep the canopy shut (piece A). From the summit a 260–320 m
   glide reaches Split-rock's bowl (about 190 m) and the quarry ledges, all travel; the plan's test proves strike, kiln
   and foot take still return 0 with the glider. Far Head (about 400 m) and Ring Island are out of reach. `npm run
   level-check` has no glide envelope, so the sim test is the proof, which is the right one for work edges.
3. **Nobody is stranded.** Yes. A player who never opens it falls 102 m into the fall arrival. The grant is room-wide and
   can't be lost. A refusal arrives within a round trip, well before anyone steps off. A friend elsewhere gets the
   flourish and the glider wherever they stand.

**Lenses.** Lens 4 (tease the lock, key in sight): the sealed drum on the first climb. Lens 7 (end a beat facing the
next): the take faces the plume. Lens 8 (somewhere to meet): the summit pad fits two or three; stepping off together is
the co-op moment, and a friend who stayed home sees the canopies come in over the forge. No lens is broken in a way a
player would lose the thread.

**Sightlines and stills.** Taken with `npm run look` from the main checkout, which is at the same commit:
- `.look/gb-summit-device-spot-still.png` (`hook-earned`, Proof 1's original camera): the planned spot is filled by the
  spire's pale top drum and its mast. The switch stands at the left.
- `.look/gb-summit-top-still.png` (top-down, `hook-earned`): the deck, the switch at (11.8, −6), the ring east, and the
  rock drum and orange vane on the deck's north edge, where −8.8 lands. The south half of the deck is clear.
- The `q5-done` heading still from the corrected spot was queued behind other runs and isn't in yet.

What I couldn't see: the device itself (it isn't built), the plume from the summit, the woken locator from Far Head or
from line 2, a phone view, and co-op.

### Findings

1. **The device anchor is inside Needle Bell's top rock. Fixed in the plan.** `buildSpire`'s top drum is centred at
   local (16, −11) and is about 1.6 m in radius at deck height (102.4 m). It rises about 2 m through the deck, and
   the orange summit vane's mast stands on it. At (16, −8.8), the device's 0.72 m collider reaches z −9.52 and meets the
   rock's face at about −9.45. The top-down still shows the spot pressed against the rock. Moved to z −4.5: open deck,
   4.5 m from the switch, 6.7 m from the ring, and about 2.1 m off the step-off line to the forge, so the switch sits in
   the near view and the plume beyond. Proofs 1 and 2's cameras and the logged call follow. If Proof 1 shows a
   problem there, any spot on the deck's south half works, as long as the step-off still faces the forge.
2. **Teach the Glide glyph, not Jump, while the double jump is still on line 1.** At Q5 every room has the air jump,
   and Jump opens the canopy only once that's spent (`glide.ts`). A first-timer who follows a Jump glyph gets a double
   jump, keeps falling with the chip still up, and has to press again. The Glide action's own glyph (LB, Q, touch
   "Glide") opens it in one press. Switch the teach to Jump when job E moves the double jump. This changes glider-placement
   call 10's glyph; it's logged as a Default.
3. **The first landing is the apron only if you let go.** A full-stick flight toward the plume runs about 250 m: over
   the forge at about 70 m up, over the village, and down past the dock into the cove (a swim, call 14). The bot proves
   the apron is reachable by letting go 9 m short and then sinking about 16 s straight down. A player sees the plume
   pass under them. That's acceptable: the plume is the cue, a sea landing is a swim, and walking back is about 25 s.
   But Proof 4 and the as-built note should say "lets go over the apron" rather than "the first flight lands on the
   apron". Add one sample to the glide eval: where a full-stick hold toward the pedestal comes down.
4. **The summit is where the owner got confused on 8 November.** The owner session there shows Pull pressed 18 times on
   4 showings and a 7 s idle at (1012, −4), beside the switch. The sealed glider uses the same DRUM mesh as the switch.
   With no prompt (as planned), the dark folded vane on its mast, and finding 1's 4.5 m of separation, it should read as
   "something that isn't awake yet". Proof 1 must check it doesn't read as a second, broken switch. If it does, drop the
   brass cap or darken the drum. Don't add a prompt or a sign.
5. **The rim wait estimate.** One Q5 shipment is about 66 s of outbound cart after it reaches the camp, so expect 80–125
   s at the rim, not "about one cart cycle, 125 s". This is a report expectation, not a call.
6. **The agent-calls references were wrong. Fixed in the plan.** "Rows 15, 18, 20 and 24–47" pointed at the wrong rows
   (rows are newest first and shift; 34–47 are town calls), and "built" isn't an agent-calls status. Sources and step 7
   now name the rows by content and keep the status `open`.
7. **Suspect copy:** none. The card is Place's, and no Boogler or Sleeves lines change. Sleeves's `needle` lines
   ("Needle Bell's switch is up the hook rings") stay true.

### Open questions, answered

1. **Frame Split-rock's cleft from the rim?** Recommended: yes, later, as a small placement job owned by the Split-rock
   plan after J5. With 24 rails the wait is 80–125 s, still the longest standing on Home, so the side pull is still
   worth having. Not in this batch.
2. **The woken locator from Far Head.** Recommended: keep radius 0.1 and opacity 0.1, and don't widen it. At 400 m a
   0.2 m shaft is under a pixel, and a 1 m one about two pixels: neither reads, and wider is the heavy-handed shaft the 3
   November testers disliked. Rule 1 doesn't need it (the plume carries the way home), and the walk home passes under
   Needle Bell, where the turning rings and core read at 100 m. If Proof 3 shows nothing from line 2 near Q3 either, add
   one Local bell note from the summit on the wake edge, about 2 s after the forge whistle so the two don't collide.
   It's Needle Bell's name paying off, and it was parked in the brainstorm. Logged as a Default.
   **Superseded, 10 November** (the owner's co-op playtest, a P1: the glider woke about 10 minutes in, neither player
   took it and the owner didn't know it existed; Ring Island's build needs every group to have it). The locator is
   now radius 0.45 m, 70 m tall, breathing at opacity 0.2–0.32, so it reads as a few pixels from the village and
   line 2 (about 110 m; Far Head is still out of reach). The wake edge flares it for 4 s and shows the room's moment
   banner (draft copy, the owner's to reword), and the halts' map displays mark the summit with a teal canopy until
   it is taken. The hook rings read from the foot, so no sign was added. The bell note stays parked.
   [place](../game-design/place.md), the glider section.
3. **If J5 has already shipped v23.** This is decided, not an owner question: "No old builds" lets agents reset without
   asking unless the owner is playing. Ship v24 once `npm run playtest` shows no live session.
4. **The summit return goes live.** Recommended: proceed. It's the logged New call (glider-placement call 1), it's
   reversible (one constant and a seed), and Far Head's pad stays the fallback.

### Owner questions (none block the build)

1. **Is the summit return, with a hook climb back after Q5, the place you want the glider found?** Recommended: yes. It's
   about 25 minutes in, the only Home spot high enough for a first flight worth having, and it faces the forge.
   Alternative: Far Head's 32 m pad, with no climb but a flight about a third as long. _(Built on the default, yes; the
   call is logged in agent-calls as glider-placement call 1 and stays open for the owner.)_
