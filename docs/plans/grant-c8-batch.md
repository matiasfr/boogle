> **Status: planned 18 November 2026 (design sub-agent); sittings 1 (G27), 2 (G25's look) and 3 (G20, G22's hint) built 18 November.** Four items are ready in three sittings (G27,
> G25's look, G20, G22's hint); G24 and G30 are already answered on main; G28, G31, G32 and G34 wait on the owner or
> are his own rows. Checked against `origin/main` at `df94d5816` (world v60). Source: [queue](grant-1114-queue.md)
> C8, rows G20 to G34 in [round-4-notes](round-4-notes.md#grants-playtest-14-november-his-granola-call-ranked-queued-15-november).

# Grant's P3 batch (C8)

Grant played build `4174823c` on 14 November (01:01 to 01:38 UTC on the 15th). His session has aged off the playtest
endpoint (`node dev/playtest/cli.ts mwh4pmui-mpbh7trk`: "no session ... among the newest 200"), and his Granola
transcript is not searchable from here, so the facts below come from the tracker's rows and the code. Owner call
"[Grant's ideas are weighed on merit](../agents/owner-calls.md#grants-ideas-are-weighed-on-merit)" applies: where an
idea meets a decision, it is worked out and put to the owner, and the decision holds until he answers.

**"The owner's own rows."** The tracker marks G30, G31 and G34 as the same note as one of Matias's own rows (the 14
November evening row "bell floats on water", row 32 and row 37 of his 14 November solo session). Those rows carry the
status and the work; this batch does not take them over. It reports where each stands and asks only what is open.

G33 (running uphill is faster, he liked it) and G35 (the free shop's "$0" never pressed) need nothing, as the queue says.

## The ten items

### G20. Chop progress on the tree, with a wood-chop effect, instead of the bar

- **He saw:** a bar for chop progress; wants the trunk to split or narrow, with chips.
- **Today:** there is no chop bar, on main or in his build. Each hit cuts a notch that widens with accepted work
  (`src/render/place-tree-view.ts`, the `cut` term in the tree pose: `t.work / 15` scales a 0.5 m box), the tree
  shakes and nine chips fly (`src/entities/railway/sources.ts`, `accepted()`, `pieces.chips(at, 9)`), and logs arc to
  your back. The "bar" is most likely the carry row filling. Since separate capacities (`dfc720ef8`, v60) a tree takes
  10 hits at 1 a hit, and the notch tracks pieces taken (`src/sim/railway-sys-line1.ts`, chop: `t.work`), so the
  on-tree read matters more than it did.
- **Smallest change:** make the notch a bite, not a box on the bark: it cuts into the trunk (depth with `cut`, a
  darker inner face) so the trunk reads narrower at the cut, and the felling hit shows the split. Chips grow with
  `cut` (9 to 14). View only: `src/render/place-tree-view.ts`, `src/entities/railway/sources.ts`.
- **Proof:** stills of one tree at 0, 5 and 9 of 10 pieces from the player's eye (`--rail-seed awake`), plus the
  chop motion sheet the capacities checkpoint used.
- **Calls:** Default (the notch's depth and the chip count; cheap to retune). Decided around it: 1 a hit (17
  November, [separate capacities](../decisions-core-loop.md#d-2026-11-17-separate-capacities)).
- **Ready.**

### G22. A wardrobe, and a purpose for the cosmetics

- **He said:** the hard hat, overalls and diving helmet have no clear purpose; he wants to change them without going
  back to the island.
- **Today:** Pause opens on **You**, where every slot cycles what you own (owner, 10 November,
  [dress Buddy from Pause](../decisions-characters.md#d-2026-11-10-dress-buddy-from-pause-you-is);
  `src/entities/wardrobe/index.ts`, `src/player/you-editor.ts`). It was in his build; he did not find it. Nothing on
  the item card says so (`src/render/reward-reveal.ts`, `Got` has `name` and `line` only).
- **Smallest change (the "where"):** the first wearable you get, from any source, shows one more line on its card
  naming Pause, with the input's glyph. Draft UI copy for the owner: "Change what you wear in Pause". Shown once.
  View only: `src/render/reward-reveal.ts` (a `hint` field), `src/entities/railway/reward.ts`,
  `src/entities/railway/crates-view.ts`, `src/entities/finds/secrets-view.ts`.
- **Proof:** a still of the first card with the hint (the lookout's or Station 1's hat, whichever comes first) and of
  the second card without it.
- **The "purpose":** new gameplay, so a proposal only. Recommended: keep wearables cosmetic. DESIGN 6 makes them
  personal finds, and a stat would make them a chore to manage. Their purpose is being seen: by friends, and in
  the reveal. Park Grant's purpose idea for a brainstorm after the economy rows. Owner question 4.
- **Calls:** Default (the hint, shown once). New (the cosmetics stay cosmetic, a recommendation).
- **The hint is ready; the purpose waits on the owner.**

### G24. Sleeves' lines loop

- **He saw:** he could not get past "The log cart will bring the heavy conversation" (Talk pressed 4 times, 12:02
  to 12:36, idle 50 s). He liked the line; keep it.
- **Today:** Sleeves steps through three lines per stage and starts again at the first
  (`src/entities/railway/greeter.ts`, `open()`, `cursor`). That was true in his build too. A Talk press during
  typing finishes the line instead of advancing (`src/place/talk.ts`, `skip: finish`), so four presses may have been
  two lines. Since 15 and 16 November an unread bubble shows over Sleeves while he has lines you have not heard
  (`lateUpdate`, `cue.update(... cursor < lines.length)`; `35a18b61c`, #1906).
- **Change:** none. The lines stay as written (owner, 16 November:
  [Sleeves' lines are his copy](../decisions-characters.md#d-2026-11-16-sleeves-lines-stay-placeholders)). The gap
  behind "could not get past" is what to do next after the forge. That is the boiler-guide row (P2) and D1.
- **Already answered by #1906; fold what is left into the boiler-guide row.**

### G25. The glider: its look before and after, its speed, updrafts

- **He said:** the glider looks too different before and after you take it; gliding seems slower than running; ideas:
  a bird flying by, updrafts over the water to reach the other island.
- **Today:** the summit shows faint turning rings, a core and a vane (`src/entities/railway/glide-device-view.ts`),
  the card shows a flat teal wing (`src/entities/railway/reward-data.ts`, `GLIDE_REWARD.parts`), your back carries
  the folded roll (`src/entities/railway/glide-view.ts`, `gear.makeGear().pack`), and the air shows the canopy. That
  makes four looks. The glider is now usable from the first climb (`97a1b62f0`, 15 November). Glide 10 m/s forward
  and 3.2 m/s down (`src/place/tech-layout.ts`; room tunes `railGlideSpeed`/`railGlideSink`); sprint is 9.5 m/s, walk
  5.6 m/s (`src/entities/player/state.ts`).
- **Smallest change (look):** the summit drum holds the actual folded roll in the rings' light, and the card's model
  is the same roll (built from the same gear), so what you take is what you wear. View only:
  `src/entities/railway/glide-device-view.ts`, `src/entities/railway/reward-data.ts` (also drawn on friends' cards,
  `src/entities/railway/ability-arrival.ts`).
- **Proof:** stills of the summit at `--rail-seed hook-taken` (the roll waiting) and `glide-earned` (gone, on your
  back), and the card; `dev/look/bots/railway-glide.ts` still passes (it reads `glideDevice.available/woken/taken`).
- **Speed:** a feel verdict, his. A glide that is only 5% faster than a sprint reads as slow, but it also sinks, so
  it earns height, not time. Recommended: no change until he has flown it on main. Owner question 3.
- **Updrafts and the bird:** new scope. Updrafts break the glide's "no lift" rule
  ([botw-glide-target](../research/botw-glide-target.md)) and, over water to the other island, let movement supply
  a route ([route contract](../research/route-contract.md)). Recommended: park both in `docs/ideas.md`.
- **Calls:** Default (one look across summit, card, back). New (speed stays; updrafts and the bird parked).
- **The look is ready; speed and updrafts wait on the owner.**

### G27. The first crate on the road: jump and Open reach the scarf without the climb

- **He saw:** at 2:09 a single jump and E opened the lookout's mossy scarf from the ground ("Matias tried a fix;
  not enough").
- **Today:** the lookout's box is 2.54 m up (`src/place/tech-layout.ts`, pad `lookout` top 20.0 over ground 17.46).
  The fix (`35f55a6a8`, 9 November) is `src/player/reach.ts`, `inReach()`: your feet may be `0.6 + 0.3 × distance`
  below the box. One jump peaks about 1.68 m up (7.6 m/s, gravity 18, the apex float), so at the apex your feet are
  about 0.86 m under the box, inside the allowance from 0.9 m out. Standing on the ground is refused, which is all
  the fix's eval tests (`dev/look/evals/secret-reach.ts`). `npm run level-check` (run 18 November) passes "lookout
  is out of reach: the lookout's secret needs the second jump", because it checks landing on the pad, not Open in
  mid-air.
- **Smallest change:** a box on a ledge (`SECRETS` row with `y !== null`) gets no slope allowance and at most 0.3 m
  below. Ground boxes keep today's rule. View only, personal Local: `src/player/reach.ts`,
  `src/entities/finds/secrets-view.ts` (passes the ledge flag), `test/reach.test.ts`,
  `dev/look/evals/secret-reach.ts` (adds a mid-jump sample beside each raised box).
- **Proof:** `test/reach.test.ts` cases (feet at the single-jump apex beside the lookout: refused; on the pad:
  offered), and the eval's printout for every raised box. Check the hook boxes (firstpull, nook, loft, alcove) and the
  tower's plinths still open from their slabs.
- **Calls:** Default (0.3 m below, no slope, for raised boxes only). Decided around it: a box on a ledge isn't in
  reach from the ground (owner, 10 November, the comment in `reach.ts`).
- **Ready.**

### G28. The bench on the cliff edge is too big and has no clear purpose

- **Found (owner, 19 November 2026, with a phone screenshot, [still](grant-c8-batch/g28-bench.jpg)):** "This is the bench Grant complained about being to big. Or one of them at least". It is north of the Round, at the top of the dirt path that climbs the grassy hill toward the sea, past the works yard: a tall cut face of bare tan earth on the hill's west side with a small brown object on the shelf above it. Orchestrator's reading, not his words: a terrain bench (a graded shelf from [terrain-clean](terrain-clean.md)) whose cut is oversized for the hill, not a seat; "or one of them" means other shelves may share it.
- **Next (was):** a small view job: find the shelf from the still's spot, say what the brown object is, and shrink the cut (lower the shelf, soften the face) so it reads as part of the hill; then check the other terrain benches for the same. Terrain only, no rule; under terrain-clean's rules if it changes a walk collider.
- **Where it is (builder, 19 November, matched in the running game):** the **quarry path's first bend**, south of the
  Round, not north. The phone camera stands over the green's north edge looking south: Fine Prices is the ring's 190°
  slot, so the dirt path between the works yard and the shop is the quarry path out of the 130° mouth. Its west
  descent drops from (-78, 108) at 17.5 m to a 12 m landing at local (-70, 146), world (930, 146), turns east down to
  (-50, 150) at 8 m and on into the gorge. That cuts a trench up to 6 m deep through the 18 m shoulder, and on the
  bend's seaward (south) side stood the cut in the still: bare tan earth from the tread at 11.4 m up to 18.6 m in 2.5
  to 3 m (about 71°), about 20 m long, 9.4 m at its tallest by the gorge (8.8 m to 18.0 m in one 2 m cell). The
  shelf on top was the cart's level pad, 6 m deep (7 to 13 m from the path's centre line). It faces the Round, which is
  why it reads from the town. [Before, phone angle](grant-c8-batch/g28-phone-angle-before-after.jpg) (left);
  [before, close](grant-c8-batch/g28-close-before.jpg).
- **The brown object is the bank cart:** a static wooden cart (a 2.4 by 4 m bed on two dark wheels), one of the
  opening's props in `openingStops()` (`src/place/opening-stops.ts`, beside the lookout deck, the flag and the arches),
  at `BANK_CART` in `src/place/layout.ts`. Nothing uses it; you cannot press it. Grant's "bench ... no clear purpose"
  may well be the cart itself: from the path it is a brown slab on a cliff edge, bench-shaped. Owner question 1 asks.
- **How the ground there is made:** `src/place/terrain.ts`. `bake()` lays every path's graded strip (`PATHS`, inner 4.8
  m and outer 7.7 m for a plain path since terrain-clean step 5) before the tree-catalog snapshot; after it, step 6's
  bench profile `QUARRY_WEST_BENCH` (`src/place/path-benches.ts`) cuts the same descent again (inner 4.9, outer 7.8,
  a 2.9 m shoulder), and `gradeSupport(BANK_CART …, soft 0.5)` levels the cart's pad with half a metre of fade (step
  6 narrowed it from 3 m so it stopped lifting the tread). The 2.9 m shoulder on a 6 to 10 m cut, and the pad's sharp
  edge on top of it, made the cliff and the shelf.
- **Who reads those heights:** only the client. `terrain.ts` is Local ("nothing here reaches the sim"); `server/`,
  `src/sim`, `src/world` and `src/net` import none of it (the server's Dockerfile copies only `town-plan`,
  `home-station` and `rotunda` from `src/place`; the Boogler's pinned land bake is the old island grid, not Place).
  The harvest catalog reads `catalogClearMask`, snapshotted before these edits: all 350 trees and the 32 hidden
  locally are identical (`WORLD_NS` v50's pin holds). Level-check's grounding audit and the static props stand on `H`
  and move with it. A saved pose is browser storage and restores onto the current ground through `createPosePolicy(H…)`
  (terrain-clean's "existing ground snap"), so a player saved on the old shelf lands on the slope, not inside it.
  No server, sim or saved-world reader, so the build is in scope. **One wall, a client golden:**
  `test/coast-regions.test.ts` pins the water shore's baked bytes (`COAST_BASELINE.texture` and `.sampled`), and the
  shore bake keeps every terrain height up to 25 m (`src/render/water/coast.ts`), so any regrade moves them. Its two
  tests failed on the builder's commit. The test's comment says to print and update the pins after an intentional
  terrain change; the orchestrator reprinted them on the rebased branch and updated the two pins in the ship
  (`PRINT_COAST_BASELINE=1`): texture `ed69c3bf51851763f63cf691032122b25d776f16a34eae6abf0c15179fec41e4`, sampled
  `c122e3f04c01f51b76f06f86d5ba8727790c55e44cbe3fbfd3b2d78d5ed4872e` (width 2015, height 780 unchanged).
- **Built (`claude/g28-cliff-bench`):** two inputs, no special case for one spot. (1) `strip()` takes an optional
  batter: a cut's shoulder widens to 1.2 m per metre of cut, up to 8 m past the tread's inner edge, fading out over
  the 4 m beyond the gorge's walls so they keep their cliffs; only the quarry west bench uses it. (2) The cart moves to
  the crest past the new slope, (-59, 163) at 17.7 m (was (-62, 157) at 18.6 m), turned lengthwise along the crest,
  with a 3 m support fade now that it is 15 m from the tread. Through the old cart spot the ground now climbs 11.1 m to
  17.7 m over about 6.5 m (about 45° on average) as grass; the trench's west wall goes 12 m to 18.7 m over 8 m.
  Unwalkable ground over the bend (1 m map, local x -84 to -44, z 126 to 174): 304 cells on main, 176 on the branch.
  155 grid cells move: lowered up to 8.63 m, raised up to 1.74 m (the cart's new seat). The tread, its width and
  its landings are unchanged. [After, phone angle](grant-c8-batch/g28-phone-angle-before-after.jpg) (right);
  [after, close](grant-c8-batch/g28-close-after.jpg); [the walk](grant-c8-batch/g28-walk.jpg) (the game's own input,
  W held and steered at the waypoints, (-77, 114) down round the bend to (-49, 147) in 10 s, the body 0.45 to 0.50
  m over the ground all the way: no stall, drop or sinking).
- **Left as it is:** where the east leg nears the gorge (local x -60 to -51, z 156 to 158) the cut is 9 to 10 m deep and
  the 8 m cap leaves a strip about 5 m tall at about 60° (12.1 m to 16.6 m at x -60); on main it was 9.2 m in one
  cell. A 10 m cap narrows it but adds as much steep ground on the seaward side, so it was not taken. The knob inside
  the hairpin keeps a 7.8 m face over 8 m of path at the gorge corner (10.7 m over 28 m on main).
- **Checks:** `npm run level-check` exit 0 before and after: production grounding 5,247 placements, 0 problems; drawn
  z-fighting 152 likely / 62 joints / 609 hidden before and after; machine clearance and timber against track 0
  problems; one fewer cell reachable only by the second jump's hop (438 to 437, now walkable). Far ground (`LEVELS`
  in `src/place/far-ground.ts`): over every 4 m or 8 m block the change touches, the coarse ground stands at most
  1.58 m and 3.80 m above the full grid (main, same blocks: 3.15 m and 7.81 m); over the cart's seat at most 0.30 m.
- **Other benches like it** (same measure on main, every path's graded ground: per path sample and side out to 16 m,
  the rise steeper than walkable, counted only where the path's strips lowered the ground by 2 m or more; G28's own is
  7.2 m under the cart and 9.4 m at its tallest, so this lists 5 m and up). Not changed here; a list for the owner.
  These four are the ones outside the gorge's own walls:
  1. **The camp path's climb round the ridge to the machine,** world (951.8, -177.1): 19.7 m on its south side over
     97 m of path, and 11.5 m on its north side at (937.2, -172.8) over 28 m: a trench of tan walls on both sides at
     the top of the walk. [Still](grant-c8-batch/g28-other-camp-ridge.jpg).
  2. **The quarry path's climb out of the gorge's east side,** world (993.8, 151.3), at the 8 m landing near (-10, 150):
     15.6 m over 38 m, a tan canyon. [Still](grant-c8-batch/g28-other-quarry-east.jpg).
  3. **The shore ramp up from the dock,** world (814.4, 12.6): 11.7 m on its north side over 15 m, an orange cut beside
     "Line to Bell Rock". [Still](grant-c8-batch/g28-other-shore-ramp.jpg).
  4. **The quarry path's climb onto the table,** world (1020.0, 160.0) and (1024.4, 154.8): 8.7 m and 8.3 m on both
     sides over about 21 m, the cutting the opening's east arch spans. [Still](grant-c8-batch/g28-other-quarry-table.jpg).

  Also over 5 m but inside or against the gorge's walls, where the path descends a cliff by design: the camp path's
  footbridge descent, world (958.0, -88.8), 27.6 m, and (939.9, -79.8), 14.8 m; the quarry path's footbridge, (981.6,
  120.3), 22.7 m, and (958.8, 129.2), 14.3 m; one sample at the camp path's ridge bend, (918.0, -165.0), 7.0 m.
  The batter built here would soften 1, 2 and 4 if the owner wants it (the gorge fade keeps the cliffs that are the
  gorge's).

### G30. The crate with a bell floats by the water

- **Already fixed** (16 November, with the owner's evening row): the post stands on the bank (`5dd5c855e`) and the
  crate moved to the flat bank at (-36, -80.6) (`b05328e01`). Nothing to do; the owner's row is where it is ticked.

### G31. The track layer for the double track runs too fast

- **The owner's row 32.** Today line 2 lays at 100 to 180% of 5 m/s (`src/sim/railway-line2-layout.ts`, `speed`:
  Q4 160%, Q5 to Q7 180%, so 8 to 9 m/s). His row was answered on 14 November by `d45f406e9` (the hand swings to the
  up track instead of popping), which was in Grant's build. "Keep laying speed" was then confirmed on 16 November
  ([archive row](../decisions-archive.md), "the track layer gets a second hand"; confirmed in
  [batch 2](../decisions-rail.md#d-2026-11-16-batch2-bulk-confirmed)).
- **Decided: speed stays.** Grant's note after the swing fix is new evidence, so it goes to the owner with G32
  (question 2). Nothing is built here.
- [x] **Answered with G32 (owner, 18 November: "Departure 20 → 50 ticks (about 5 s)"; built 19 November, world
  v63).** Cruise and laying speed are unchanged; only the start eases longer. See G32.

### G32. Couldn't catch the track-laying train to ride it; the bridge is narrow

- **Today:** you may ride the machine ([place](../game-design/place.md), "You can ride it or stand on the fresh
  track"). On line 2 it eases from a stop to its cruise over `departureTicks` (20 ticks, 2 s;
  `src/sim/railway-line-schedule.ts`, `lineLayDistance()`), and then runs at 8 to 9 m/s. A sprint (9.5 m/s) closes
  only 0.5 to 1.5 m/s on it. Nothing waits for a rider.
- **Smallest change:** no code. `railDepartureTicks` is a room tune (`src/sim/tune.ts`; "next funded station",
  `src/tunables/catalog.ts`): raising it from 20 to 50 ticks gives a player at the frame about 5 s of slow start to
  step aboard. Cruise speed is kept, as decided. Changing the default in `src/sim/tune.ts` would be sim and
  mixed-builds work, so a planner would have to check it. The narrow bridge: no fall was recorded; not measured.
- **Calls:** New (a longer departure ease, so the layer can be boarded). **Waits on the owner** (question 2).
- [x] **Built, 19 November 2026 (world v63), on the owner's pick of 18 November**
  ([entry](../decisions-rail.md#d-2026-11-18-decisions-page-rail)): `railDepartureTicks` defaults to 50
  (`src/sim/tune.ts`), and `LINE_TIMING` (`src/sim/railway-line.ts`) now reads that default instead of its own 20,
  so the seeds and a fresh world's job rows agree with the server. The tune was always one value for every laying
  job, so it eases **both lines' layer**: T1 to T3 and Q1 to Q7. Nothing else reads it: the passenger and freight
  trains (`TrainKin` accel), the footing wagon (a line 2 train), the depot cart (`CART`), the Works shunter and leg 2's
  ns and bay trains have their own kinematics, and the greybox legs lay on `LEG_TUNE.layTicks`. World v63 because
  the tune is saved with every value and the job rows carry the default timing (the schema golden pins it).
  *Measured:* every stretch lays exactly 10 ticks (1 s) longer: T1 89 → 99 lay ticks, T2 75 → 85, T3 179 → 189,
  Q1 77 → 87, Q2 140 → 150, Q3 100 → 110, Q4 142 → 152, Q5 296 → 306, Q6 225 → 235, Q7 140 → 150. In its first
  5 s a line 2 layer covers two thirds of 5 s at its cruise (16.7 to 30 m) and only then cruises; on Q5 to Q7
  (9 m/s) it reaches 5.6 m/s after about 2 s instead of under 1 s. The whole route in
  `npm run loop -- run` (sim time, walking stand-ins): 1 player 38:56 → 39:03, 2 players 35:28 → 35:33, 3 players
  34:33 → 34:40. The footing wagon's 16 trips from `wagon-on` to `ring-joined` keep their stops and spacing, all
  shifted +20 ticks before Q7 and +10 after, as do the pier's and the railhead's rack fills, the ring footings set
  and the Works' 28 casts: no wait grows trip over trip. The gates: pier twelve 112 s both; ring eighteen 193.2 →
  192.2 s; first ring footings on the railhead rack 65.2 s both; leg 2's waits identical on all four seeds (worst
  settled 1,061, growing 1,201 against 1,350 and 1,600); line 2 lever waits move by about a second each way.
  *Proof look:* `dev/look/evals/departure-ease.ts` on `--rail-seed q5-carry`, real time: the last logs fund Q5,
  a player waiting 3 m behind the layer (placed there; the bot's planner is slow round the frame) runs and jumps on
  ordinary input and is aboard 23 ticks into laying, the layer then at 6.4 m/s, still aboard 4 s later
  (`docs/world/grant-c8/g32-departure-ease-boarding.png`). Not tested on a device; boarding by a person at a
  sprint not tried.

### G34. Presses just out of reach

- **The owner's row 37:** "No job. Reach or buffering of Chop is a feel question." Today Chop is offered within
  3.2 m (`src/entities/railway/sources.ts`, `targets()`), and a press with nothing in reach does nothing. At 1 a hit
  there are now 10 presses a tree, so more presses fall early.
- **Not built here; his row.** Question 5 asks whether to open it.

## Build sittings, in order

Each is view only, under an hour, three to five files, with no world bump. Checks for every sitting:
`node dev/ship-check.ts origin/main HEAD`, plus the sitting's own.

1. [x] **G27, the lookout's scarf.** `src/player/reach.ts`, `src/entities/finds/secrets-view.ts`, `test/reach.test.ts`,
   `dev/look/evals/secret-reach.ts`. Checks: `npm run level-check` (its secret-reach rows; no position moves).
   Walk-through: `dev/look/evals/secret-reach.ts` and `dev/look/evals/railway-finds.ts`; the railway bot opens no
   secret. Shares `secrets-view.ts` with sitting 3 and with the prefab-records work (`06d54cc17`).
   *As built, 18 November 2026:* `inReach()` takes an optional `ledge`, the height a raised box is opened from; with it
   your feet may be at most 0.3 m under that, no slope; without it (ground boxes, the bay, every other caller) the rule
   is unchanged. One departure: the tower's two boxes stand on 1 m plinths, so their ledge is the plinth's foot (the
   slab, taken from the record's geometry), not the box's base; a 0.3 m limit under the box itself would have refused
   them from their slabs. So from t0's and the nook's slabs Open is now offered right up to the plinth, and walking
   into a plinth's long side bumps its box open (before, neither under 1.33 m). The view's inspection gains `ledges`
   (the box's own `inspect()` is unchanged: the secrets golden stays). Today the ground round the lookout's block is
   about 17.05, not 17.46, and a real jump lifts the feet 1.55 m; from 3 m out the old rule offered the box at the
   jump's top and the new one doesn't (`secret-reach.ts` `spot=jump`; stills in `docs/world/grant-c8/`).
2. **G25's look, the glider as one thing.** `src/entities/railway/glide-device-view.ts`,
   `src/entities/railway/reward-data.ts`, perhaps `src/entities/railway/glide-view.ts` (to share the roll). Seeds
   `hook-taken`, `glide-earned` (`src/sim/railway-seeds.ts`); bots `dev/look/bots/railway-glide.ts` and
   `takeGlider()` in `dev/look/bots/railway.ts`. Shares `reward-data.ts` with friends' cards
   (`ability-arrival.ts`, the cutscenes-for-everyone row).
   *As built, 18 November 2026:* the roll's parts moved out of `makeGear()` into `GLIDER_ROLL` in
   `src/render/gear-models.ts` (the roll's builder lives there, not in `glide-view.ts`), and `GLIDE_REWARD.parts` is
   that list, so the finder's card, a friend's card (`reward.ts` builds both from it) and the away friend's flourish
   badge are the roll. On the summit the mast, the vane and the core are gone; the roll, at its worn size, turns at
   the rings' height where the core was, on the drum's existing part material, and hides with the rings on the take.
   Summit draws 6 to 4 (drum, two rings, roll; was drum, mast, vane, two rings, core). Seen: the roll in the rings at
   `hook-taken`, the card, the roll on the back after landing, the empty drum at `glide-earned`
   (`docs/world/grant-c8/g25-one-glider.png`); the take-and-glide bot passed (card, 28.1 s home, dry, 4.9 m from the
   pedestal). Not seen: a friend's card (same parts, `reward.ts`'s flat-shaded material), reduced motion, phone width.
3. [x] **G20 and G22's hint, two small view changes.** `src/render/place-tree-view.ts`,
   `src/entities/railway/sources.ts`, `src/render/reward-reveal.ts`, `src/entities/railway/reward.ts`,
   `src/entities/railway/crates-view.ts` (and `secrets-view.ts`, after sitting 1). Seeds `awake`; bot
   `dev/look/bots/railway.ts` (it chops the first trees and opens Station 1's box). Shares `place-tree-view.ts` with
   the tree-culling fix (`99164fbb4`) and world streaming, and `sources.ts` with the capacities work: rebase first.
   If it runs long, split G22's hint into its own sitting.
   *As built, 18 November 2026:* **G20.** An ordinary tree with accepted work draws a bitten trunk (a new instanced
   batch in `createTreeView`): the band 0.94 to 1.3 m above its foot opened on the last stroke's side (two of six faces),
   bark wrapping the opening's edges, and a dark heart (a second batch) behind it, shrinking toward a point behind the
   axis so it draws back from about 8 cm at the first hit to 60% of the trunk's radius at the ninth. The felled trunk
   tips and lies with its bite; chips go 9 + 5 × work/15 (9 to 14). Hardwoods and the great tree keep the old notch; a
   refused stroke keeps its scuff. The bite's constants live inside `createTreeView` and its geometry is merged by
   hand, because `test/prefab-scenery-review.test.ts` evaluates that function from source with only `THREE`,
   `createTreeRoots` and `fitInstanceBounds` bound; the trunk keeps its literal `CylinderGeometry(0.28, 0.46, 5, 6)`,
   which `test/home-cart.test.ts` pins. Batching, bounds and sleep unchanged; no per-frame allocation. At a stand of
   three Home trees with two part-cut (`awake`, camera over the stand): 182 to 186 draw calls, 616,395 to 674,003
   triangles (the two batches in the main and shadow passes; zero-scale slots for every tree, as the notch and stump
   batches already have; drawn only once some tree has been cut, until the next refit). **G22's hint.** `Got.hint`;
   `reward-reveal.ts` owns the copy (`WEAR_HINT`) and `withWearHint`, which gives the hint to the first wearable's card
   and records it with `createSeen('boogle.wear-hint.v0')` (per railway room and player, as the other seen-once
   moments). The station hat, scarf and boxes go through it in `reward.ts` (`crates-view.ts` unchanged: it is handed
   the wrapped queue); the secret boxes reach the queue through `railwayYouGot`, whose box cards are recognised by
   their rarity mark, so `secrets-view.ts` is unchanged (its golden and `test/reach.test.ts` evaluate it from source
   with fixed bindings). The glyph is `glyph('pause')`: Esc, the pad's menu button (Menu, Options, +), none on touch.
   The shop's "Take it" card (`town/shop.ts`) does not carry the hint: out of this sitting's files.
   Seen: the bite at 0, 5 and 9 of 10 from chopping distance and 8 m back, side-on and the felling
   (`docs/world/grant-c8/g20-*.png`); the hat's card with the hint and the scarf's without
   (`docs/world/grant-c8/g22-*.png`); `playthrough --to t1-done` passed (the hat's card read "… Change what you wear
   in Pause Esc"). Not seen: the hint on a secret box's or a crate's card, the pad glyph on a card (checked as markup
   only), a friend's view of a bitten tree, reduced motion, phone width.

`npm run level-check` on main, 18 November: exit 0, 21 reports; track continuity ok; the 15 planned-track reports
are all on tracks that are never drawn or not built yet (line 1 and 2 kinks, Ring v27, the bay), none near these
items. This plan moves nothing in the world.

## Design review (2026-11-18)

Run on this plan by its author, as the design-review skill says. Reread from the top; sources as cited above.

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| 1 a hit; the notch tracks pieces taken | Decided / open default | [separate capacities](../decisions-core-loop.md#d-2026-11-17-separate-capacities); agent-calls, call 16 |
| The notch bites into the trunk; chips 9 to 14 with the cut | Default | G20; DESIGN 11, the tree shows its own progress |
| Pause opens on You; every slot cycles what you own | Decided | [10 November](../decisions-characters.md#d-2026-11-10-dress-buddy-from-pause-you-is) |
| The first wearable's card names Pause, once (draft copy) | Default | G22; helper text once, where the world cannot say it |
| Wearables stay cosmetic; a "purpose" waits for a brainstorm | New | DESIGN 6 personal finds; recommended |
| Sleeves' lines unchanged; they cycle | Decided | [16 November](../decisions-characters.md#d-2026-11-16-sleeves-lines-stay-placeholders) |
| One glider look: the roll on the summit, on the card, on your back | Default | G25; DESIGN 11, what's on screen is true |
| Glide speed stays 10 m/s | New | his verdict; recommended until he flies it |
| Updrafts and the bird parked | New | no-lift rule; route contract |
| A raised box opens only from within 0.3 m below, no slope | Default | G27; extends the 10 November rule |
| Line 2's laying speed stays | Decided | confirmed 16 November (batch 2) |
| Departure ease 20 to 50 ticks, as a room tune | Decided | G32; the owner's pick of 18 November, built on v63 |

**Findings.**
1. *First meeting (G27):* the lookout is the first secret on the road, and 2:09 is before the double jump, so the scarf
   came before its gate. That breaks rule 2 of the [route contract](../research/route-contract.md): movement may skip
   distance, never the work. Sitting 1 is the fix; it changed nothing else in this plan.
2. *Proof gap:* level-check's "out of reach" passes because it tests landing, not Open in mid-air. Sitting 1 adds a
   mid-jump sample to the eval, so this proof is no longer only on paper.
3. *Co-op:* the glider roll and the wearable hint are personal or derived from a shared fact, so they show the same
   for a friend who arrives late. The departure ease applies to every rider. No solo-only rule is added.
4. *Learning without being told:* G22's hint is helper text; DESIGN 11 allows it sparingly, and it shows once.
5. *Feel calls kept out:* glide speed, laying speed, the departure ease and Chop buffering are his. None is built.

## Owner questions

At most five; each has a recommended answer first. None is recorded as his call.

1. **G28: which bench did Grant mean?** Answered 19 November: the owner's screenshot (above). Was: ask Grant for a screenshot or the spot; until then G28 leaves
   the batch. If it is a terrain shelf on the canyon climb, it joins [start-area](start-area.md). Built on
   `claude/g28-cliff-bench`: the cut leans back as grass and the bank cart sits on the crest. Still open: was his
   "bench" the cart itself (a brown slab on the edge, with no use)? Recommended: keep it on the crest as built; if he
   meant the cart, remove it from the opening's props. And should the other four benches in G28's list get the same
   batter? Recommended: yes for the camp ridge climb and the quarry table cutting, after a look at each.
2. **G31 and G32: line 2's laying.** Laying speed stays (your 16 November confirmation). Should the layer start
   slower, so a player at the frame can step aboard? Recommended: yes, set the room tune `railDepartureTicks` from 20
   to 50 (about 5 s of slow start), with no code change, and play it once.
3. **G25: is the glide too slow?** It flies 10 m/s against a 9.5 m/s sprint. Recommended: keep it until you have
   flown the first-climb glider on main; it is a room tune (`railGlideSpeed`) if you want to try 12. Park updrafts
   and the bird in ideas.
4. **G22: what are the cosmetics for?** Recommended: they stay cosmetic, personal finds (DESIGN 6); build only the
   Pause hint now; any purpose goes to a brainstorm after the economy rows.
5. **G34 (your row 37): should Chop wait for you?** At 1 a hit a tree takes 10 presses, and early presses do nothing.
   Recommended: open row 37 as a small job: a press up to 0.25 s or 1 m early swings when you come into reach, as a
   tunable.

## Suspect copy, for the owner

- Draft: "Change what you wear in Pause" (G22's hint), new UI copy, built 18 November (sitting 3) and still draft for the owner to reword.
- No character line is changed. Sleeves' "The log cart will bring the heavy conversation" stays as he wrote it.
