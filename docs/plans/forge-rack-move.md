# The forge's rail rack off Home's island

_Plan, 17 November 2026. Backlog row: "The forge's rail rack off Home's island" (P3, scoped). Not built. Measured
from the code at `9c81f0ed`. Between that commit and `origin/main` at `84f53530`, none of the files this plan touches
changed except `docs/backlog.md` and `docs/agent-calls.md`._

## Goal

The owner, 17 November: "Right now it's kind of in the middle of the station and I don't think I like it there." Move
the forge's rail rack off the island apron, so the island stays open for passengers. Move the sim's pinned rack point
with the drawing in the same change.

This serves the station feeling "inviting and open". That is the owner's 14 November call on the hall's front, as
recorded on `HALL` in `src/place/home-station.ts` and in `docs/game-design/place.md`. It also serves Understandable at
a glance, and DESIGN.md 11 (Show, don't tell): the forge pours straight across the station onto the rack, and the cart
loads beside it.

**Where it goes: the owner's fallback, because the forge yard does not fit.** He approved the forge yard first: "the
forge yard on road 1's forge side, beside the goods dock and the boiler's pedestal". The fallback was "only if the forge
yard truly doesn't fit: road 2's outer side beside the cart's forge stop". Measured, the yard does not fit as the forge
stands (see "Why not the forge yard"), so this plan builds the fallback. The rack's new centre, square to the station's
axis:

- **Axis (a −2.95, c 11.2); Place-local (−81.45, 15.74); world (918.55, 15.74); sim `(91855, 1574)` cm.**
- It stands on road 2's outer (south) side, abeam the cart's forge stop (road 2's s 0, axis a −2.93) and the forge's
  furnace mouth (axis a −2.96). Mouth, cart and rack lie on one line across the station.

Axis coordinates are the ones `home-station.ts` defines: `a` is metres along the axis (road 1's `s` abeam), and `c` is
metres across it from road 1's centre toward road 2. Road 2's centre is at c 7.60. The island's apron spans c 1.65 to
5.95 and a −5.53 to −2.23.

## Design

### Sync kinds and authority (nothing new)

| Piece | Kind | API / owner | Changes here |
| --- | --- | --- | --- |
| The forge rack's count (`Forge.rack`), its pours, takes, recovery and the away credit | Server | Existing `rail.forgeTake` and forge ticks in `src/sim/railway-*.ts`, replicated as today | None. No position is saved anywhere |
| Who is in reach of the rack | Server | `src/world/railway-server.ts:266` `near(LINE2_FORGE.rackX, LINE2_FORGE.rackZ, 340)` on the actor's position | The constant moves (`src/sim/railway-line2-layout.ts`); the code doesn't |
| The view's "Take rails" offer, within 3 m of the same point | Local, mirrors the server | `src/entities/railway/line2-view.ts:1335, 1342` | None (it reads the moved constant) |
| Drawn rack: posts, collider, stacked rails, board, pour and take flights, cradle motes | Local (cosmetic) | `opening-models.ts`, `opening-view.ts`, `line2-view.ts`, `works-view.ts` | Moves with `PROPS.rack`; flight timing, board placement and post grounding change (steps 1 and 2) |
| Prediction and correction | Declared prediction, as today | `src/world/railway-predict.ts` predicts `rail.forgeTake`; a refusal flies the rails back to `rackFrom` | None (`rackFrom` moves with the drawing) |

No new command, state key, projection, presence field, message or registration. The server still owns rule ticks
and saves; the client predicts nothing new. No client lead, classic edit generator or client state registration.

**Version bump: none.** Per [mixed-builds](../agents/mixed-builds.md), `WORLD_NS` bumps when ops, states or catalog
entries are removed or reshaped. This change moves one reach constant. No op, field, state shape, save key or catalog
entry changes:

- Saves hold the rack's count, not its place.
- Piles players dropped near the old rack keep their saved positions.
- An old tab offers "Take rails" at the old spot and the server refuses it. That is accepted in the dev phase (owner
  call "No old builds in development"), and the update notice brings the tab current.
- Replay fixtures and server tests apply `rail.forgeTake` straight through the rules, without positions (`act` helpers
  in `test/railway-*.test.ts` and `server/test/railway-away.test.ts`), so they don't move.
- `src/sim/railway-line2-layout.ts` is already in the server image, and no new import is added.
- [lockstep](../agents/lockstep.md) is not triggered: the integer constant is read only by the server's reach check,
  never by a tick or a prediction.

### Measured clearances at the chosen spot

The rack's footprint, square to the axis (`yaw = rad(90 − AXIS.bearing)`): the 2.7 m beams run along the axis
(a −4.30 to −1.60, posts ±1.25 plus 0.1), and the 2.6 m rails lie across it (c 9.90 to 12.50).

| Neighbour | Clearance | Note |
| --- | --- | --- |
| Road 2's sleeper ends (c 8.75) | 1.15 m | It was 0.53 m on the apron side |
| The cart at its forge stop (c 7.60 ± `CART.hx` 0.75) | 1.55 m | `home-cart` operating minimum 0.25 m; measured 1.5499 m. You can walk between them |
| A standing line 2 train (tail at road 2 s 5.55, a 2.62) | 4.22 m | `home-cart` standing minimum 0.25 m; measured 4.2167 m |
| Road 1's sleeper ends (c 1.15) | 8.75 m | Two tracks and the island between |
| The island's road 2 edge (c 5.95) | 3.95 m | Nothing stands on the island any more |
| The hall's south-back corner (wall a −6.53, eave a −6.13, south wall c 10.3) | 2.23 m to the wall, 1.83 m to the eave | The lane behind the hall to road 2's buffer stays open |
| Road 2's buffer (a −5.53; its beam to c 8.75) | 1.68 m corner to corner | |
| The board crossing (a −0.93 to 0.67, c 5.95 to 9.35) | 0.87 m corner to corner | No overlap in either axis |
| The walk from the crossing's far end to the open stall's door | 1.75 m from the rack's east edge at c 9.9, 2.4 m at c 11.2 | The walk heads away from the rack |
| The spur lever (road 2 s 4, 2.4 m out: a 1.07, c ≈ 10.0) | ≈ 2.4 m | |
| Q1's frame (a 2.60, c 15.10) | 6.8 m centre to centre, ≈ 4.9 m from the rack's corner | Level check: no overlap |
| The forge's furnace mouth (a −2.96, c −5.02) | 16.2 m | The pour flight crosses road 1's stub, the apron and road 2's stub |
| The forge's walls and foundation apron | > 12 m | |
| The pedestal and the boiler's pickup (a 6.07, c −3.51; 6.6 m server reach) | 17.3 m | No overlap with any pedestal prompt |
| The dock (a 8.08, c −3.37) / the crane (a 11.99, c −3.41) | 18.3 m / 20.9 m | |
| The goods door (a −8.9 to −7.4, c −2.7) | ≈ 14.8 m | Reached round the hall's back |
| Ground under it | falls 0.17 m (18.21 to 18.05) | Two feet would float 5.6 and 12.1 cm. Step 1 grounds each post |

### Why not the forge yard (what "truly doesn't fit" rests on)

Rails fly out of the forge's furnace mouth: local (−87, 0.5), mid south wall, axis (a −2.96, c −5.02). The forge
(10 × 8 m at (−87, −3), turned 20° to the station) sits close to road 1, and its foundation apron reaches 0.8 m past the
walls (`housePlan` hulls; `workshop.ts`). The rack needs 2.7 × 2.6 m. Where it could go on road 1's forge side:

1. **In front of the mouth, between the forge and road 1's buffer stub.** There are 2.82 m (world z) from the foundation
   apron's edge to road 1's sleeper ends at the mouth, and less further east. That leaves 0.22 m in all, no way to it
   except across the stub, and it blocks the strip people walk from the goods door to the pedestal. Doesn't fit.
2. **Between the forge's south-east corner and the pedestal.** The foundation's corner is at (a 2.05, c −1.81), 0.66 m
   off road 1's sleepers; the pedestal's plinth edge is at a ≈ 4.8. That gap of about 2.7 m is the only walk into the
   yard. Doesn't fit.
3. **Behind the pedestal line** (open ground near a 5 to 9, c −6 to −9). It fits on the ground, with 1 to 2 m lanes,
   but:
   - It is out of the mouth's line. The straight flight from the mouth to it passes through the forge from its south
     wall out of its east wall.
   - It sits on the hoist's three little guys (`part-hoist.ts` spots at (a 7.47, c −6.28) and (a 4.63, c −6.25)).
   - It sits inside the boiler's 6.6 m pickup reach. While the breaker waits there, the cradle asks for the rack's
     rails, and a back with rails can't shoulder the breaker (`rail.boilerTake` needs an empty back).
   - It adds to a pedestal that the forge-made-rewards plan (building) also gives the proper axe.

   Making it work means the forge's outlet faces the yard, which is a change to the forge (its mouth, the workshop's
   furnace axis and its guard) that this plan doesn't own. That is the owner question below.

The fallback avoids all of this. It is in the mouth's line, beside the cart's forge stop, on line 2's and the Works'
side where the rails are used, and away from every pedestal prompt.

### The cart's forge stop stays at road 2's s 0

The cart's road reaches road 2 only: the leg joins road 2 at s 26, and road 1 has no link. Its stop is pinned in the
rules (`CART_ROAD.forgeCm` 20632, the away credit's trip time, the phases). Moving it would mean new track and a rules
change. It doesn't need to move: the rack now stands 3.6 m from it on road 2's other side (the existing
`dist(roadAt(1, 0), PROPS.rack) < 4` assertion holds), the same distance as from the apron today. The cart's rail load
stays a server count with no drawn transfer; the rack's stack visibly drops beside it.

### Every reader of the rack's position

Found by grepping for `rackX`, `rackZ`, `PROPS.rack`, `layout.RACK`, `RACK`, `rackModel`, `forgeRack` and "forge rack"
across `src`, `dev`, `test`, `server` and `docs`:

| Reader | What it does | Action |
| --- | --- | --- |
| `src/place/home-station.ts` `PROPS.rack` | The drawn centre and yaw | **Edit** (step 1) |
| `src/sim/railway-line2-layout.ts` `LINE2_FORGE.rackX/rackZ` | The sim point | **Edit** (step 1) |
| `src/world/railway-server.ts:266` | 3.4 m server reach | Reads the constant |
| `src/entities/railway/line2-view.ts:234-280` | Drawn stack (`RX/RZ/RY` from `layout.RACK`), `rackSlot`, `rackFrom`, the rack board | Comment (step 1); board placement (step 2) |
| `src/entities/railway/line2-view.ts:806-818, 917-922` | The take flight (rack to back) and the correction flight (back to `rackFrom`) | Follow `rackFrom` |
| `src/entities/railway/line2-view.ts:1100-1116` | The pour flight from `mouth.position` to `rackSlot` (dur 0.55, apex 1.1) | **Retime** (step 2) |
| `src/entities/railway/line2-view.ts:1335, 1342` | The view's 3 m offer, from the sim point | Reads the constant |
| `src/entities/railway/line2-view.ts:1432` | `forgeRack` in the view's debug read (bots, evals) | Follows |
| `src/place/layout.ts:619` `RACK = PROPS.rack` | Re-export | Follows |
| `src/place/opening-models.ts:35-55` `rackModel` | Posts and beams | **Edit**: each post reaches its own ground (step 1) |
| `src/entities/railway/opening-view.ts:113-121` | The rack's collider (turned box, 1.35 × 0.45 × 1.3) and `foot()` footprint | Follows |
| `src/entities/railway/works-view.ts:343-357` | Picks the cradle bill's side by distance to the rack | Follows. The same side (turn +10) stays nearer: 26.2 against 29.9 m (was 32.0 against 35.5) |
| `src/entities/railway/works-view.ts:605-620` | Cradle gold motes, spread ±1.1 m in world x | **Edit**: spread along the rack's length (step 2) |
| `src/place/meadow-field.ts:271` `[PROPS.rack, 3.5]` | Grass cleared round it | Follows (look at it in a still) |
| `src/entities/railway/boiler-view.ts:602-603` | A comment, "the forge rack 4.5 m off" | Comment (step 1) |
| `src/entities/railway/forge-finish.ts:162-163` | A comment, "walled off by the rack", from Place | Stale before and after; leave |
| `dev/level/home-cart.ts:115-123` + `home-cart-pins.json` | "forge rack full" clearance pins | **Re-pin** (step 1) |
| `dev/level/grounding-props.ts:108` | Grounds `rackModel()`'s posts | Passes after step 1's post change |
| `dev/level/machine-clearance.ts:198` | Machine clearance against the rack posts | Passed on the trial |
| `dev/economy/place-level.ts:196` | "the forge rack" open/reachable check | Passed on the trial |
| `dev/level/rail-map.ts:803-848, 902-906` | Name and text ("on the island's apron") + `docs/world/rail-map.html` | **Edit text, regenerate** (step 1) |
| `dev/level/home-station-page.ts:92` | `docs/world/home-layout.html` data | **Regenerate** (step 1) |
| `dev/loop/graph.ts:235-237`, `dev/loop/run.ts:216` | Hand-carry distances and the loop walk | Follow (Q1 rails 1x12 to 1x7) |
| `dev/look/bots/railway.ts:548, 1761` | Use the rack as a hub waypoint (Far Head to the boiler; to the pack chest) | **Edit**: an apron waypoint (step 3) |
| `dev/look/bots/railway.ts:1814-1821`, `railway-works.ts:190-198` | Take rails at the rack | Follow (`view().forgeRack`) |
| `dev/look/evals/railway-q6-forge.ts:33` | Reads `forgeRack` | Follows |
| `dev/look/evals/honest-feedback.ts:59` | A comment with "(915.5, 10)" | Comment (step 1) |
| `test/home-station.test.ts:337, 418-455` | The cart's "beside the forge rack"; the apron-lane test | **Rewrite** (step 1) |
| `test/home-cart.test.ts` | 5 cm drift detection on "forge rack full" | Unchanged; passes with new pins |
| `test/railway-works-layout.test.ts:127` | `RACK` kept apart from `SHELF`, `CRANE`, `DOCK` | Passed on the trial |
| `docs/game-design/place.md:122, 211` | Where the rack stands | **Edit** (step 1) |
| Away credit, recovery, the shelf and depot cart, Q6/Q7 and steel train kits (`railway-sys-*.ts`) | Counts only | None |
| Camera cuts, prompts' text, cut framings | None frame the rack | None |

## Steps

Each step leaves `node dev/ship-check.ts` green. The full check and bots are Checkpoint R's.

- [ ] **1. Move the rack: drawing, sim point, grounding, tests, pins and pages in one change.**
  - `src/place/home-station.ts`:
    - `PROPS.rack: { ...axisPoint(-2.95, 11.2), yaw: rad(90 - AXIS.bearing) }`. Its comment: road 2's outer side,
      abeam the cart's forge stop and the forge's mouth, 1.15 m off road 2's sleeper ends, 1.55 m off the cart, off the
      island (owner, 17 November; the fallback of the backlog row's answer 1).
    - Rewrite the `PROPS` docblock's first clause and the `ISLAND` comment (drop "the forge rack stands on it").
    - `CART_FORGE`'s comment: "beside the rack on road 2's outer side".
  - `src/sim/railway-line2-layout.ts`: `rackX: 91855, rackZ: 1574`, commented as the world centimetres of
    `PROPS.rack` (pinned by the test below).
  - `src/place/opening-models.ts` `rackModel()`: each post reaches its own ground. For post `(dx, dz)`:
    - its foot is at `fx = RX + dx·cos(yaw) + dz·sin(yaw)`, `fz = RZ − dx·sin(yaw) + dz·cos(yaw)`;
    - `drop = Math.max(0, RY − H(fx, fz))`;
    - geometry `BoxGeometry(0.2, 1.8 + drop, 0.2)`, `position.set(dx, 0.9 − drop / 2, dz)`.

    Keep the name `rack/support-post`. Beams, `RY` and the rail slots are unchanged, so `line2-view.ts`'s
    `RY = land.H(RX, RZ)` still matches. (This module is three.js scenery, not `src/sim`; `grounding-props.ts`
    injects `H`.)
  - `src/entities/railway/line2-view.ts:234-235`: the comment says the drawn rack and the sim's point are the same
    point.
  - `test/home-station.test.ts`: replace the test at 418 with **"the forge rack stands off the island on road 2's
    outer side, abeam the cart's forge stop and the forge's mouth"**. From the rotated posts and rail ends, as the old
    test builds them:
    - square to the axis (a extent < 2.71);
    - every post and rail end `c ≥ ROAD_GAP + 1.15 + 1.0` (off road 2's sleepers) and `≥ ROAD_GAP + CART.hx + 1.5`
      (off the cart);
    - nothing on the island: `c > ISLAND_C + ISLAND.width / 2`;
    - `a_min ≥ HALL.a + HALL.d / 2 + 0.4 + 1.5` (the lane past the hall's eave);
    - at least 0.8 m from the board crossing's rectangle (`CROSSING`, `c0`/`c1`);
    - `|a − toAxis(roadAt(1, 0)).a| < 0.1` and `|a − toAxis({ x: FORGE.x, z: FORGE.z + FORGE.d / 2 − 0.5 }).a| < 0.1`;
    - the sim point agrees: `dist({ x: LINE2_FORGE.rackX / 100 − 1000, z: LINE2_FORGE.rackZ / 100 }, PROPS.rack) < 0.01`.

    Add **"the island stays open: no yard prop stands on it"**: every `PROPS` entry's axis point is outside the
    island's rectangle (`ISLAND_A.buffers` to `ISLAND_A.foot`, `|c − ISLAND_C| ≤ ISLAND.width / 2`). In the crossing
    test, assert that the straight walk from the boards to the stall door stays ≥ 1.5 m from the rack's footprint
    rectangle (measured 1.75 m). Line 337's assertion stays (3.6 m < 4).
  - `dev/level/home-cart-pins.json`: `"standing/forge rack full"` 5.1467 → 4.216716236680483 and
    `"operating/forge rack full"` 1.0301 → 1.549900101272085 (the trial's measurements; re-read them from
    `npm run level-check`'s Home cart line).
  - `dev/level/rail-map.ts`:
    - line 809's name: "The forge rack (rails; Home, road 2's south side by the buffers)";
    - line 848's text: the rack stands on road 2's south side, abeam the cart's forge stop and the forge's mouth, X m
      behind the last cargo car, on the cars' side, so rails go from rack to car without crossing a track.

    Then regenerate `docs/world/rail-map.html` (`node --import ./dev/sim/hooks.ts dev/level/rail-map.ts`) and
    `docs/world/home-layout.html` (`node --import ./dev/sim/hooks.ts dev/level/home-station-page.ts`).
  - Comments: `boiler-view.ts:602-603` (the rack is across the station now, 17 m off) and
    `dev/look/evals/honest-feedback.ts:59` (918.6, 15.7).
  - `docs/game-design/place.md`:
    - line 211: replace the 14 November rack sentence with where it stands now and why (owner, 17 November). The island
      is clear; the sim's point moved with the drawing (`LINE2_FORGE` 91855, 1574), with no save or version change.
    - line 122: "the buffers beside the forge rack" stays true; keep it.
  - **Verify:**
    - `node --import ./dev/sim/hooks.ts --test test/home-station.test.ts test/home-cart.test.ts test/rail-map.test.ts test/railway-works-layout.test.ts`;
    - `npm run level-check`: production grounding 0 problems, Home cart 0 failures, "the forge rack" ok;
    - `npm run loop -- node Q1`: carries `1x41, 1x7`;
    - `node dev/ship-check.ts`;
    - stills 1 and 2 below.
- [ ] **2. Dress the new place (view only).**
  - `src/entities/railway/line2-view.ts`:
    - The pour flight (about line 1104): name `POUR_FLIGHT = { dur: 0.9, apex: 2.4 }` and use it in place of
      `dur: 0.55, apex: 1.1`. Over the 16.2 m flight the rails pass about 3 m over the apron and 2.2 m over the cart at
      its forge stop, not 1.4 m.
    - The rack board (lines 262-270): stand it 2.3 m off the rack's end nearer the pedestal, along the rack's length.
      Its position is `RX + AXIS.d.x·2.3`, `RZ + AXIS.d.z·2.3` (`home.AXIS`; the end toward the crossing, a −0.65),
      turned to face the pedestal as now (`Math.atan2(dx, dz)` to `LINE2_BOILER`). Today's rule, "2.3 m toward the
      pedestal", would put it between the cart and the rack, 0.5 m off road 2's sleepers.
  - `src/entities/railway/works-view.ts:343, 620`: spread the cradle motes along the rack's length:
    `forgeRack.x + r·cos(yaw)`, `forgeRack.z − r·sin(yaw)` with `r = (Math.random() − 0.5)·2.2` and
    `yaw = layout.RACK.yaw`.
  - **Verify:** stills 3 (real-time video), 4 and 5; `node dev/ship-check.ts`.
- [ ] **3. The bots stop using the rack as a hub.** In `dev/look/bots/railway.ts:548` and `:1761`, replace
  `walk(view().forgeRack…, 3)` with a walk to a Home apron point: `const HOME_APRON = toWorld(axisPoint(-3.9, ISLAND_C))`
  from `src/place/home-station.ts`, which is the old rack's lane, where those legs passed through before. `walk` would
  route round the forge, but a detour across road 2 is pointless. Leave the real takes (`:1814`,
  `railway-works.ts:191`). **Verify:** `node dev/ship-check.ts`; the bot legs at the checkpoint.
- [ ] **Checkpoint R (after step 3).**
  - `npm run check`.
  - `npm run playthrough -- --long`, at least through the boiler pickup. It covers the pack chest waypoint, Q1's rails
    from the rack and the Far Head to boiler leg.
  - `npm run playthrough -- --eval dev/look/evals/railway-works-bot.ts` through "cradle fitted".
  - `npm run loop -- run`.
  - `test:net` is not needed: no wire, transport or presence change.
  - Then update the backlog row and ship (`npm run ship`). The PR carries stills 1 and 3.

**Stills a builder takes (`npm run look`, `--rail-seed` as given).** In this plan's headless captures the pause menu
covered the left 45% of the frame. Frame subjects right of centre, or dismiss it.

1. Top-down of the station (`q2-stocked`, `--cam 905,55,26 --look 913,18,10`). Is the island clear, with the rack on
   road 2's south side, abeam the cart's stop?
2. The player's eye from the apron (`q5-done`, rack full: `--cam 914.6,19.6,6.8 --look 918.6,18.8,15.7`). Do the
   stacked rails sit on the beams, the posts reach the ground and the grass clear, and does the rack read as the
   station's goods corner?
3. The pour (`q4-stocked` or any beat where the forge pours with the cart at its forge stop). From the island looking
   at the forge mouth, `--video --seconds 6`. Do the rails arc from the mouth over road 1, the apron and the cart onto
   the rack, readable and not through anything?
4. The rack board (`boiler`). From the pedestal and from the island, is the boiler glyph readable, facing the pedestal,
   off the rack's east end?
5. Cradle motes (`stall-done`). Gold motes along the rack's length.
6. First sight from the forge's frame (`awake`/`q1-done`, `--cam 922,19.6,-12.5 --look 918.6,18.8,15.7`). Is the rack
   in sight past the forge's south-east corner? (Measured: the line passes east of the corner and 2.9 m from the
   pedestal.)

## Level findings

The level check ran on the planned position in a scratch checkout of `9c81f0ed`, with only `PROPS.rack` and the sim
point moved, and was compared with a baseline run of the same commit:

1. **Production grounding: two problems.** `rack/foot-1` floats 5.6 cm and `rack/foot-3` floats 12.1 cm (the ground
   falls 0.17 m across the footprint). **Fixed in step 1** (each post reaches its own ground). No spot on road 2's south
   side within 1.8 m of the hall's eave is flat to 5 cm.
2. **Home cart pins: two problems.** "standing/forge rack full" 5.147 → 4.217 m and "operating/forge rack full" 1.030
   → 1.550 m. Both are well above their 0.25 m minimums. **Re-pinned in step 1.**
3. **Everything else unchanged:** the forge rack's open and reachable check, machine clearance, overlaps, track and
   path grades.
4. **Unit tests that fail on the trial:** the home-station rack test, the home-cart pins test and the rail map's
   currency test, all rewritten or regenerated in step 1. `railway-works-layout` passed.
5. **Gating:** the rack is not behind any ability. It is reachable on foot from spawn before and after; road 2's stub
   at a −3 is ground-level track with no standing train. Nothing becomes reachable early.

## Risks

- **In flight:** `npm run inflight` lists nothing. But the forge-made-rewards plan is building (backlog P2; branch
  `plan/forge-made-rewards` and its T3 worktree, which `inflight` doesn't list). It edits `line2-view.ts` (board marks,
  `forge-rewards`, a cut) and `railway-line2-layout.ts` (adds `LINE2_AXE` next to `LINE2_FORGE`). Hunks are independent
  but adjacent in `railway-line2-layout.ts`. Rebase and keep both. It also edits `meadow-field.ts` beside
  `[PROPS.rack, 3.5]`, which this plan does not touch.
- **Hotspot files:** `line2-view.ts` (1,400+ lines, many hands), `test/home-station.test.ts`, `docs/game-design/place.md`.
- **Room safety:** nothing from "Don't" applies. No apply change, no effects in apply, no presence, no saves, and no new
  server import.
- **Mixed builds:** no `WORLD_NS` bump (see Design). Old tabs see a refused "Take rails" at the old spot until they
  update. Accepted.
- **Performance:** no meshes, lights or tick work added (the same posts, beams and 48-instance rail batch, moved; two
  posts lengthened). No `npm run perf` needed.
- **Pacing:** the walk from the forge side to the rack crosses road 1, the apron and road 2's stub. From the pedestal
  it is 17.3 m (was 13.0 m); from the mouth it is 16.2 m. The rack is nearer line 2's work: Q1's frame 6.8 m (was
  12.2 m), the cradle bill 26 m (was 32 m). The loop's Q1 node drops from 1x12 to 1x7. No bill or rule changes.

## Open questions

1. **The forge yard as you pictured it needs a change to the forge.** The forge's furnace mouth faces the station, so a
   rack in the yard behind the pedestal would have rails flying through the forge's walls. It would also sit inside the
   boiler's and breaker's pickup reach. Making it fit means turning the forge's outlet to face the yard (its mouth, the
   workshop's furnace and guard). *Recommended: build your fallback, road 2's south side, as this plan does.* It stays
   in the mouth's line, beside the cart, and nearer where rails are used. Ask for the forge-yard version as its own plan
   if you prefer it after seeing stills 1 and 3.

## Design review (2026-11-17)

Run by the plan's author with what it read while planning: DESIGN.md; owner-calls (index; "Place for the look", "Block
out spacing", "A well-designed town", "Machines show their work physically", "Gameplay shapes the environment", "The
right solution over less work", "Performance guides", "Build more, test less"); decisions-rail Current rules; direction;
the playtests log; the design-work rules; and the research below.

**Research:**
- [home-station-layout](../research/home-station-layout.md) recommended crane, dock, forge rack and pedestal all on
  road 1's forge side. This plan departs from it on measured space: the forge's foundation leaves 2.8 m before road 1,
  and its outlet faces the station. The home-station plan had already departed by putting the rack on the apron.
- [level-design](../research/level-design.md) (walk-seconds; something to do every 10 to 20 s) is used below.
- [progression-flow-layout](../research/progression-flow-layout.md) (the three rules) is used below.
- [route-contract](../research/route-contract.md): no travel or work edge changes.

**Calls:**

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The rack leaves the island; the island stays open | Decided | Owner, 17 November (backlog row); 14 November "inviting and open" (`HALL`, place.md) |
| 2 | The sim's pinned point moves with the drawing in one change | Decided | Owner's answer 2 in the backlog row |
| 3 | Road 2's south side beside the cart's forge stop, because the forge yard doesn't fit as the forge stands | Decided (his fallback), on our measurement | The backlog row's answer 1. The "doesn't fit" ruling is logged in agent-calls; open question 1 |
| 4 | The exact spot: axis (a −2.95, c 11.2), abeam the cart's stop and the mouth, 1.15 m off road 2's sleepers, 1.83 m off the hall's eave | Default | Placement. Agent-calls |
| 5 | Square to the station's axis, rails across the roads | Default | Kept from `638e493f` (14 November) |
| 6 | Reach unchanged: server 3.4 m, offer 3 m, from the rack's centre | Default | Unchanged tunables |
| 7 | The cart's forge stop stays at road 2's s 0, 3.6 m from the rack | Default | The cart's road reaches only road 2. Agent-calls |
| 8 | The pour flight 0.9 s with a 2.4 m apex (was 0.55 s, 1.1 m) | Default | So rails clear the cart and heads over 16 m. Agent-calls |
| 9 | The rack board 2.3 m off the rack's east end, facing the pedestal | Default | Out of the cart-to-rack gap. Agent-calls |
| 10 | Cradle motes spread along the rack's length | Default | Cosmetic. Agent-calls (with 9) |
| 11 | Pacing follows: Q1 rails 12 → 7 m, cradle walk 32 → 26 m, pedestal to rack 13 → 17 m | Default | A consequence of 3 and 4. No bill changes |

Counts: **3 decided, 8 default, 0 new.**

**Findings:**

1. **One yard for what the forge makes is not met (call 3).** The rack and the pedestal end up on opposite sides of the
   station. The fallback's gains, measured:
   - no overlap with the boiler's, breaker's or axe's pickups. While the breaker waits, the cradle asks for the rack's
     rails, and a back with rails can't shoulder it;
   - rails wait on the side of line 2 and the Works, which use them;
   - the cart loads beside the rack.

   Judged on what is right for the game, not on size ("The right solution over less work"). Kept as open question 1;
   it does not block the build.
2. **The pour flight was tuned for 9.9 m.** At 16.2 m, 0.55 s reads as a blur and skims the cart's load at 1.4 m.
   *Changed step 2* (call 8; still 3 checks it).
3. **The board's placement rule breaks at the new spot.** It would stand between the cart and the rack, 0.5 m off road
   2's sleepers. *Changed step 2* (call 9).
4. **Grounding (level finding 1).** *Changed step 1* (posts reach the ground).
5. **The bot used the rack as the station's hub.** Two waypoints would now send it across road 2 for nothing. *Changed
   step 3.*
6. **Flow (rules 1 to 3 hold).**
   - The next goal can be found. The rack is seen from the forge frame past the forge's corner (still 6), and the pour
     arcs across the station to it the moment the forge lights: the forge-to-rack link, shown.
   - No gate changes meaning.
   - Nobody is stranded: the stub at a −3 is ground-level, with no standing train.
   - Lens, a straight line: from the pedestal the island deck's 0.72 m side is in the way, so people go round by the
     apron or the board crossing. That is about 3 s at 5.6 m/s, and the apron route is the old lane.
7. **Walk-seconds** (5.6 m/s): forge frame to rack ≈ 28 m (5 s); rack to Q1's frame 6.8 m (1.2 s); rack to cradle
   bill 26 m (4.7 s); pedestal to rack 17.3 m (3.1 s). All within "something to do every 10 to 20 s".
8. **Co-op and solo.**
   - The rack's 3 m prompt ring is now on open ground, roomier than the 4.3 m apron for two or three players taking at
     once.
   - The cart-to-rack gap (1.55 m) lets one player pass while another takes.
   - Solo is unchanged.
   - A late joiner sees the stack where the pour lands.
9. **Sightline from the island.** The rack now closes the view across road 2 at the hall's back corner. That is a
   medium shape beside the buffers rather than in the walking line, which is the owner's ask. Still 2 judges it.

**Owner questions:** open question 1 above (recommended: build the fallback).

Logged in [agent-calls](../agent-calls.md) (Rail): the "doesn't fit" ruling and the spot (calls 3 and 4); the cart stop
and the flight (calls 7 and 8); the board and the motes (calls 9 and 10).
