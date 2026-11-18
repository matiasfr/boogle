> **Status: planned 18 November 2026 (design sub-agent); sitting 1 (G27) built 18 November.** Four items are ready in three sittings (G27,
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

- **Today:** not found. No placed seat bench stands on a cliff: the halts' benches are 3 m
  (`src/prefab/builders/halt-parts.ts`), the museum's and the workshop's are indoors. "Bench" may be a terrain bench,
  the graded shelves of [terrain-clean](terrain-clean.md) (the canyon climb, the west descent, the top of the
  climb). His session is gone from the endpoint, so his position cannot be pulled.
- **Waits on the owner** (question 1). If it is a terrain shelf, it folds into [start-area](start-area.md) or
  terrain-clean.

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
3. **G20 and G22's hint, two small view changes.** `src/render/place-tree-view.ts`,
   `src/entities/railway/sources.ts`, `src/render/reward-reveal.ts`, `src/entities/railway/reward.ts`,
   `src/entities/railway/crates-view.ts` (and `secrets-view.ts`, after sitting 1). Seeds `awake`; bot
   `dev/look/bots/railway.ts` (it chops the first trees and opens Station 1's box). Shares `place-tree-view.ts` with
   the tree-culling fix (`99164fbb4`) and world streaming, and `sources.ts` with the capacities work: rebase first.
   If it runs long, split G22's hint into its own sitting.

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
| Departure ease 20 to 50 ticks, as a room tune | New | G32; waits on the owner |

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

1. **G28: which bench did Grant mean?** Recommended: ask Grant for a screenshot or the spot; until then G28 leaves
   the batch. If it is a terrain shelf on the canyon climb, it joins [start-area](start-area.md).
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

- Draft: "Change what you wear in Pause" (G22's hint), new UI copy, not built yet.
- No character line is changed. Sleeves' "The log cart will bring the heavy conversation" stays as he wrote it.
