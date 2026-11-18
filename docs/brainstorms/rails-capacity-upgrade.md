# Brainstorm: the rails' own capacity upgrade

> **Status: proposed (2026-11-18).** Light mode: one agent, three lenses (play, systems, creative). Seed: the
> [backlog row](../backlog.md) "The rails' own capacity upgrade: rails start at 8 on everyone's back, and a later
> upgrade raises them", on the owner's "8, own upgrade later"
> ([17 November answers](../decisions-core-loop.md#d-2026-11-17-separate-capacities-answers), question 3). Nothing is
> built. Every name and every player-facing word below is a marked placeholder, `[like this]`, and is the owner's to set.

## Pitch

Once Station 4's (Q1's) bill is in, the forge's little guy knocks a `[rail yoke]` together beside the forge rail rack
(road 2's outer side, 6.8 m from Q1's frame). Whoever takes it takes it for the room: every back carries 16 rails from
then on, and the rails' row of squares grows from 8 to 16. That makes Q2's and Q3's forge hauls one trip each instead
of two. It serves **11. Show, don't tell** (you see the forge make the thing that fixes the walk you just did twice) and
**8. Enjoyable alone and together**: it is almost entirely a solo relief (see the figures). It bends no principle.

**Gut question:** after Q1, does a solo player feel the Q3 haul become "one more walk" instead of "this again"?

## What rails at 8 cost today, and what the upgrade buys back

**Figures used:** today's loop graph on `origin/main` (`npm run loop`), which already has the forge rack at its new spot
on road 2's outer side ([forge-rack-move](../plans/forge-rack-move.md), sim point `(91855, 1574)` cm in
`src/sim/railway-line2-layout.ts`). I re-ran the graph with `RAILWAY_CAPACITY.rails` set to 12 and to 16 in a scratch
edit (reverted, not committed). Grind is loaded straight-line metres for the busiest player, one way. Time is that
distance there and back at 5.6 m/s, the method behind the plan's "68 s". The plan's figures (190 m, Q3 114 m,
Q2 46 m) are from before the rack moved. Today's graph has Q3 at 2 × 110 m and Q2 at 2 × 44 m, so the cost to repay is
**184 m, about 66 s solo**.

Metres saved against rails at 8, by when the upgrade arrives:

| Upgrade arrives | Rails cap | 1 player | 2 players | 3 players |
| --- | ---: | ---: | ---: | ---: |
| Q1's bill in (before Q2's rails) | 16 | 184 m, **66 s** | 16 m, 6 s | 3 m, 1 s |
| Q1's bill in | 12 | 178 m, 64 s | 13 m, 5 s | 3 m, 1 s |
| Q2's bill in (before Q3's rails) | 16 | 139 m, 50 s | 16 m, 6 s | 3 m, 1 s |
| After Q5 (with the trains) | 16 | 16 m, 6 s | 6 m, 2 s | 3 m, 1 s |

Per beat at 1 player, 8 → 16: Q3 223 → 113, Q2 109 → 64, Q5 50 → 40, steel works 20 → 13, Q6 20 → 14, Q4 10 → 7,
Q7 17 → 14. Q1 (6 rails) and the cradle (8) don't change.

What this shows:

- **12 and 16 differ by only 6 m.** Q2's and Q3's 12-rail bills already fit in one carry at 12. The extra 4 only
  shortens 3 m train and cart carries. So the amount is about consistency and the look, not time.
- **Co-op barely gains.** Two players already split Q2's and Q3's two rail carries between them, so the busiest
  player's load doesn't move. The upgrade is a solo fix. That argues for a small reward on an existing beat, not a new
  bill or a new chore.
- **It has to come before Q2's or Q3's rails.** After Q5 it is worth 6 s.
- **These are straight-line figures.** Q3's detour is uncalibrated (n 0). Humans walk Q2 at ×7.54 the prediction
  (n 2). So the real solo saving at Q2 is likely bigger than 45 m. The plan should measure it with a bot run.

## Where it sits among line 2's rewards

Today's order, from the loop graph and the code: forge's 24 logs → the pack frame (little guy) · forge lit (56 logs) →
the proper axe on the pedestal (short cut) and the rack starts pouring · **Q1 laid → the depot cart starts serving Q2**
(`src/sim/town-facts.ts` `depot`) · Q2 laid → the hook · Q3 laid → the quarry lever · Q4 → the sea mount · Q5 → Far
Head and the boiler cast · boiler fit → trains and the breaker cast · Q6 → the pier.

Q1's completion already has the cart, and Q2's completion has the hook. **Q1's funding** (its 16 logs and 6 rails in,
the machine starting the stretch) is the one free beat before both rail hauls. It also has a precedent: the keener edge
arrives at Station 3's funding, not its completion ([separate-capacities](../plans/separate-capacities.md)). The little
guy builds while the machine lays Q1's stretch. When it is laid, the yoke waits at the rack where Q2's rails are taken.

## Candidate grants

| | A. The forge makes it at Q1's funding (recommended) | B. The track crew leaves it at Q2's funding | C. The forge's own small bill at the rack |
| --- | --- | --- | --- |
| Who gives it | The forge's little guy (the pack's errand, reused) | A track-machine folk, at Q2's frame | The little guy, once the rack's frame takes a log bill (e.g. 8 logs) |
| Where, which bill | Beside the forge rail rack. Q1's (Station 4's) bill in | Q2's (Station 5's) frame. Its bill in, before the hook at its completion | The rack, any time after the forge is lit and before Q2 |
| Foreshadowed | Q1's board shows the outline mark ([rewards rule](../decisions-rewards.md#d-2026-11-17-forge-made-rewards)) | Q2's board | The rack's board |
| On your back | `[an iron yoke across the pack frame's shoulders]`: rails hang in two stacks, and the row of squares grows to 16 | `[a rail sling]` | as A |
| Name (placeholder) | `[Rail yoke]` | `[Rail sling]`, but "carry sling" is already Canopy Town's later back-capacity grant ([campaign outline](../plans/campaign-outline.md)) | `[Rail yoke]` |
| Solo time back (16) | 66 s | 50 s | 66 s, less the new bill's walk |
| Fit | Forge-made, like the pack; the rack is the rails' source; key in sight of the lock | A station grant but not forge-made; Q2's 45 m still walked twice | Most like the pack, but adds a chore the owner is [wary of](../agents/owner-calls.md#grinds), for a solo-only gain |

## Shape (for the plan)

- **Sync:** existing Server state on the railway world, replicated and predicted like `rail.pack`. Shared and the
  room's, so late joiners have it ([shared progression](../agents/owner-calls.md#shared-wallet), DESIGN.md 6).
- **As a pickup (recommended, like the pack):** a new op `rail.<name>` and a new `bool` on `Rail`
  (`src/sim/railway-components.ts`, next to `pack`). That changes the **wire** (op union and list in
  `src/adapters/railway-intents.ts:37,186`, server op list and reach in `src/world/railway-server.ts:120,268`, prediction
  list in `src/world/railway-predict.ts:68`, `railway-effects.ts:110`, `railway-marks.ts:26`). It changes the **save**:
  `Rail` gains a field, so `test/fixtures/rail-schema.json` changes. It needs a **`WORLD_NS` bump, v60 → v61**: a
  reshaped state, per [mixed-builds](../agents/mixed-builds.md). Rules: a system like `pack`
  (`src/sim/railway-sys-line2.ts:303`), ready when Q1's job has started (the `keenEdge` pattern in
  `src/sim/railway-queries.ts`). `capacityOf`'s RAILS branch reads the flag, and `RAILWAY_CAPACITY` gains the 16.
- **Derived instead (no pickup):** only `capacityOf` and save validation change. No op, no field, no fixture change, and
  mixed-builds requires no bump: old saves stay valid, since 8 ≤ 16. It is cheaper, but it is the "gift out of nowhere"
  the owner disliked on 17 November.
- **Unchanged at 16:** `MAX_KIND_CAPACITY` stays 16 and `MAX_ACCEPTED` stays 48, so no wire bound moves. 24 would move
  both and overflow the 320 px tag. The cradle clamp in `forgeTake` still holds.
- **Reused:** the little guy's errand and display (`src/entities/railway/forge-rewards.ts`), a new kind in
  `reward-glyph.ts`, Q1's board marks (`stations.ts` `RewardMark`), the opener's card and friends' cards through
  `ability-arrival.ts`, and the squares' grown-row hold (`src/features/haul-stack.ts`). The rails' instanced cap in
  `src/render/carry-models.ts` grows with the constant. The seeds, the bot and the loop graph's `carryOf`
  (`dev/loop/graph.ts:1028`) gain the step.
- **Risks:** a back can now hold 48 pieces, so the still decides where the yoke's rails seat beside the bundle and the
  stone. The bot's Q2 to Q7 rail loops get shorter.

## Done means

- Q1's board before its bill is in: the outline mark beside the count.
- Q1 funding live: the little guy walks to the rack and knocks the yoke together, while the machine lays the stretch.
- `q1-done` from the player's eye at Q1's frame, facing the rack: the yoke is visible and offered.
- Taken: the opener's card, and a friend's card when they are free. On a reload or late join it is just there.
- At the rack before Q3, with 16 rails on: the 16-square rails row, and one trip settles Q3's 12 rails.
- `npm run loop`: Q3 at 1 player is 113, and Q2 is 64.

## Open questions

1. **Which grant?** Recommended: **A**, the forge's little guy makes it beside the rack once Q1's bill is in.
   Answer: ___
2. **How many?** Recommended: **16**, the same 8 → 16 step as logs and stone. 12 buys back only 6 m less. Answer: ___
3. **Pickup or automatic?** Recommended: **a pickup you take, like the pack** (one card for the opener, cards for
   friends, no camera cut). It costs a new op, a save field and `WORLD_NS` v61. Answer: ___
4. **Its name and look on the back?** Recommended: an iron yoke over the pack frame's shoulders with two hanging stacks.
   The name is yours; `[Rail yoke]` is only a placeholder. Answer: ___
5. **Is Canopy Town's carry sling still a separate, later step?** Recommended: **yes**, untouched; this upgrade is
   line 2's and rails only. Answer: ___

## Parked

- A third rails step with the carry sling at Canopy Town, if rails ever go past 16 (it moves the wire bound and the tag
  width).
- The little guy straightening the yoke after it lands, as parked for the pack (details phase).

## Design review (2026-11-18)

Reread from the top against DESIGN.md, [owner-calls](../agents/owner-calls.md), the Core loop and Rewards Current
rules, the forge-made-rewards decisions and plan, and the separate-capacities plan's own review. I took no stills: the
brief places one waiting prop beside an existing rack and gates nothing, so the plan's step should take them.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Rails start at 8; their own upgrade later | Decided | [17 Nov answers](../decisions-core-loop.md#d-2026-11-17-separate-capacities-answers) (3) |
| 2 | The upgrade is the room's; late joiners have it | Decided | [6 Nov, all progression shared](../decisions-rewards.md#d-2026-11-06-economy-principles-amended); DESIGN.md 6 |
| 3 | The granting station's board shows it before its bill is done | Decided | [17 Nov, forge-made rewards](../decisions-rewards.md#d-2026-11-17-forge-made-rewards) |
| 4 | Friends online see the reveal too | Decided | [17 Nov, cutscenes for everyone](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone) |
| 5 | Rails go 8 → 16 | New | Recommend 16. Line 2 is 66 s shorter solo; the gap to 12 is 6 m |
| 6 | It comes at Q1's funding, before both rail hauls | New | Recommend. The only free beat before Q2; the Station 3 precedent |
| 7 | The forge makes it (the little guy, at the rack) | New | Recommend. Extends forge-made rewards to a forge product that serves rails |
| 8 | An optional pickup, like the pack; no camera cut | Default | Pack precedent. A cut stays the axe's |
| 9 | It waits beside the forge rail rack, 6.8 m from Q1's frame | Default | A placement; key in sight of the lock |
| 10 | The rails' row grows to 16 squares, shown during the grown-row hold | Default | The separate-capacities plan's squares rules |
| 11 | `[Rail yoke]` and its look on the back | Default | Placeholders; the owner names it |
| 12 | Canopy Town's carry sling stays a separate later grant | Default | [campaign outline](../plans/campaign-outline.md) |

**Counts: 4 Decided, 3 New, 5 Default.** The orchestrator logs the Default and New rows; this brief edits no log.

**Findings.**

1. **It is a solo relief.** At 2 and 3 players it buys 6 s and 1 s, because two players already split the rail carries.
   That rules out C's extra bill, and keeps A on an existing beat (DESIGN.md 8; wary of grinds).
2. **The beat had to be found, not assumed.** Q1's completion is the depot cart's start and Q2's is the hook, so the
   grant moved to Q1's funding (calls 6 and 9).
3. **The plan's figures predate the rack move.** The brief uses today's graph: 184 m, not 190 m. Q3's detour is
   uncalibrated, so the plan should confirm the solo saving with a bot run.
4. **Level:** the route contract holds. The upgrade removes trips, not work: every rail is still carried into the
   frame. It opens no reach and moves no gate. The yoke is in sight of the rack where Q2's rails are taken. Not looked
   at in stills.
5. **Copy:** no Boogler line is touched, and none was found that mentions rails capacity.

Owner questions: the five above.
