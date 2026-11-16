> **Status: proposed (2026-11-16).** Light brainstorm: one agent, three lenses; no game changes or new binding calls.
> Supersedes the recommendation, not the historical record, of [first-line-decisions](first-line-decisions.md).
> Only one candidate survives the filters below. Draft names are design labels, not approved player copy.

# First-line choice

## Pitch

**Build movement versus hauling first.** After Station 1, choose the room's existing double jump early, or a
12-comfort carry allowance (draft “sling”). Keep today's **2 logs per chop**, every bill and the ordinary ground
route. Place one clearly visible double-jump crossing on the timber approach used during Stations 2–3. One choice
lets you cross it with a normal load; the other lets you make fewer ground trips. Both work alone. No second part
arrives automatically at Station 2: the ordinary jump grant after Station 3 and pack at the forge eventually resolve
the missing capability. This is a choice of **how to play two stations**, not permanent character classes.

Serves DESIGN **8, Enjoyable alone and together**, **7, Telegraph everything**, and **11, Show, don't tell**.
Grant enjoyed movement, walked 93% of his session, and asked for decisions ([original analysis](first-line-decisions.md#what-the-data-says),
[14 November log](../playtests.md#2026-11-14-grant-solo-his-granola-notes)). The owner made this work P1 on
[16 November](../decisions-process.md#d-2026-11-16-focus-choice-and-payoff). **Bounded main-game build recommended**,
subject to the explicit early-jump rule change below; no prototype branch, sealed glider or extra material bill.

## Gut question

Within five minutes of the pick, can someone explain both what their choice let them do and what they gave up?

## Best suggestions

1. **Movement versus hauling** — **play designer**, backed by systems reuse and a visible creative payoff.
   A movement pick must open a path the carry pick cannot use; a larger number alone repeats the failed fork.
   Show the crossing and a full normal bundle beside the rewards before the pick. The crossing or 12-unit delivery
   explains the choice without dialogue. As in *Breath of the Wild*, movement has value outside the optimal haul
   (analogy only). Show where the missing capability will eventually arrive.

   [Page](../world/first-line-decisions.html), switch **“New proposal: early double jump or carry allowance”**:

   | Haul | Today | Early jump | Early carry | What actually differs |
   | --- | --- | --- | --- | --- |
   | T1, 24 logs | 12 chops, 3 trips, 16.4 s | same | same | No opening slowdown |
   | T2, 32 logs + 8 stone | 16 chops, 5 trips, 43.2 s | 16 chops, 5 trips, **30.1 s** | 16 chops, 4 trips, **35.9 s** | A new crossing versus one fewer log trip |
   | T3, 40 logs; beam separate | 20 chops, 5 trips, 85.0 s | 20 chops, 5 trips, **74.8 s** | 20 chops, 4 trips, **69.0 s** | Crossing again versus one fewer log trip |

   **Only bills, chops and baseline distances are sourced measurements/data.** Jump-route times are explicit,
   editable **design targets**, 2 s at T2 and 7 s at T3 each way, against the graph's 3.638 s and 8.022 s.
   They are not surveyed shortcuts or completion times. Pickup, jumping animation, building and navigation are
   excluded. T3's beam is a separate 12.5 s row. The 5.8 s difference is not itself the felt choice.
   With deliberate maximum heavy loads, early carry models **33.9 / 72.5 s** at T2/T3; normal carry at T3 is
   faster, **69.0 s**. Early jump can stay normal (**30.1 / 74.8 s**), since heavy returns lose the crossing.
   Neither capability wins both stations even when players choose normal loads. This cannot prove fun.

   **Build this first. What would make me wrong:** there is no readable, forgiving double-jump crossing near both
   approaches without a terrain rebuild; ordinary jump already crosses it; the new jump bypasses later progression;
   or players only report the faster load, not a different way of playing. Then cut this fork, rather than lower the
   baseline yield or add a bill to make the choice look important. Actual routes may overturn the time ordering.

## Three lenses and rejected alternatives

Three avenues per lens, not nine promised features:

| Lens | First | Second | Third |
| --- | --- | --- | --- |
| Play designer | Capability versus capacity, above | Keep one tool edge through two stations | One material with competing uses |
| Systems architect | Reuse jump and carry queries | Expose the free Q6/Works order | Use the future garage's per-line configuration |
| Creative director | Show two usable approaches before choosing | Show pier access versus an operating Works | Show a growing house versus a working source upgrade |

**Lasting whetstone/sling: reject the stat-only form.** The original page gives **3.4 s** at T2 (**7.1 s** heavy)
and **16.0 s** at T3 against today, whichever part came first. Delaying the second grant through T3, with the
original 1-log start, gives sling about **11.2 s** over whetstone on T3 too (85.0 versus 73.8 s at normal load).
Sling wins both; charging for the second part adds work. The capability fork changes the verb and avoids the extra
12 T1 chops.

**Logs into rails: reject an added fuel tax.** At the page's editable **1 log/rail**, Q1–Q5 require
**6 + 12 + 12 + 16 + 24 = 70 extra logs**, **18 chops, 6 trips, about 79 s** normal (about 74 s with deliberate
heavy loads), using the proper axe and pack. Unlimited regrowing trees mean this is another bill, not scarce
allocation. Track “now” or rails “later” still has one mandatory eventual destination for each unit. A fixed budget
with alternative recipes needs replacement bills, another resource path and a supply model, absent here. Grant's
forge objection is valid; show its process without claiming a resource decision merely because logs enter a furnace.

**Where first: Q6/pier versus Works — useful clarity, reject as the answer.** The owner explicitly leaves these
in either order ([15 November](../decisions-core-loop.md#d-2026-11-15-works-flow)). The graph gives Q6 **32 logs +
32 rails**, four train-fed carries, about **14 s** handling/walking, versus the kiln's **16 logs + 16 stone**, two
normal carries, about **59 s** before strike, travel and machinery. Sources: `npm run loop -- node Q6` and
`-- node kiln`, [graph](../../dev/loop/graph.ts), [Works flow](../plans/works-flow.md#what-a-first-timer-sees-in-order-main-today-with-d1).
These extend the page's method, not observed times. Pier-first reveals the crossing but cannot build it without
Works footings. Equal cues improve exploration; there is no competing connected-place benefit. High Gorge/Canopy
reordering instead breaks the fixed Alpha order and exceeds the first half hour.

**Forge/boiler investment for the town — good later, reject for this deadline.** The garage's first 20 m/s install
and longer boiler are free teaching beats, not priced alternatives; the Quick/Strong trade begins at stage 4
([garage choices](../plans/garage-choices.md#2-what-the-player-chooses-and-when)). The first Village plot needs
**8 delivered timber + 300 Boogles**; its plan estimates about **5.5 minutes** of initial fares, already beyond
five minutes from a fresh boiler fit, before construction ([slice 5](../plans/slice5-town-economy.md#design-review-designer-2026-11-11)).
House versus source upgrade lacks a specified early source benefit and price. Don't invent a free 300 (fares only),
log price or different first buy. Early people/goods needs modeling: if goods stake plot 1 in one load and extra
seats find no demand, one setting wins. Coordinate later with those builds; #1 needs neither.

## Shape

**Sync:** **Server**, persistent room progression, not Lockstep or a Host field. The older brief and DESIGN's sync
table predate the [current sync contract](../agents/sync.md#pick-a-sync-kind-for-each-piece-of-state).
First accepted pick sets one room edge; repeated/raced commands cannot grant both. Everyone inherits it.
Movement uses the existing player system; reward models, sound and rejected-pick return are Local views.

**Smallest first build:** one shared choice at the completed T1, one crossing used on both next approaches, no new
economy or train operation. Reuse `Rail.jump`, the existing jump action/reveal and carry/heavy-load arithmetic.
Likely owners: [railway-components.ts](../../src/sim/railway-components.ts) (edge fact),
[railway-sys-line1.ts](../../src/sim/railway-sys-line1.ts) (pick),
[railway-queries.ts](../../src/sim/railway-queries.ts) (12 comfort until the ordinary pack),
[railway-server.ts](../../src/world/railway-server.ts) and
[railway-intents.ts](../../src/adapters/railway-intents.ts) (command and validation near the new choice),
[tools.ts](../../src/entities/railway/tools.ts) (reuse rewards), and
`src/content/prefabs/railway.ts` plus one new `src/content/levels/first-line-choice.ts` (draft file: crossing and choice
placements; compiled output required). Update [Place](../game-design/place.md). Keep later pickups idempotent;
map remaining command-type owners before building. This is a small gameplay slice, not a two-file fix.

**Fit and ordering:** the P1 row authorizes design exploration, not these new rule values. Hard prerequisite is an
explicit exception to the early-jump order; geometry feasibility and avoidance of later gate bypasses need the first
build's proof. No asset work, town buy, garage trade, engine-library move or owner playtest is a prerequisite.

### Decisions touched

Labels distinguish existing authority from recommendations; **New** remains proposed here.

| Call | Kind | Entry / effect |
| --- | --- | --- |
| Main game, heavy load retained, glider usable immediately | **Decided** | [Grant queue answered](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered); [fly first](../decisions-core-loop.md#d-2026-11-15-fly-first). No reopening of the glider order |
| Shared room capabilities, including solo | **Decided** | [6 November](../decisions-rewards.md#d-2026-11-06-economy-principles-amended); DESIGN 6 and 8; no splitting tools between players |
| No added logs, keep 2/chop and today's ground route | **Default** | This recommendation avoids the old brief's proposed 1/chop; [owner's material-grind concern](../agents/owner-calls.md#how-the-owner-works). No current bill changes |
| An exclusive power pick after T1 | **New** | Changes [“boiler first”](../decisions-core-loop.md#d-2026-11-09-the-boiler-fit-is-the-first) as the first chosen upgrade; boiler remains the first train install |
| Double jump may be chosen before T3 | **New** | Explicitly changes [9 November loop orders](../decisions-core-loop.md#d-2026-11-09-loop-orders), not a geometry loophole. Grant's ideas are weighed on merit |
| Carry 12 as the alternative; absent edge resumes at existing later grants | **New** | New progression shape, not the decided 16-pack grant; preserve [simple back bundle](../decisions-rewards.md#d-2026-11-01-carrying-is-a-simple-back-bundle) |
| 2 s / 7 s log approaches, first accepted pick wins, one crossing | **Default** | Editable proposed layout targets and cheapest shared-pick behavior; numbers require geometry evidence |
| Garage and town prices/first grants remain owned by their active plans | **Decided** | [Garage answers](../decisions-core-loop.md#d-2026-11-15-garage-choices); [300-Boogle first house](../decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered). No claim those views are built |

## Done means

Future builder's evidence, not work completed by this brainstorm:

- `look --rail-seed awake --eval <setup>`: setup completes T1 through accepted commands, leaving both choices
  untaken (no post-T1 seed exists today). Frame the choice, ground route and crossing together, understandable
  without new dialogue.
- Two matched `--eval` setups, pick jump or carry through accepted commands, then exercise T2 and T3: capture an
  8-log crossing, a 12-log ground delivery and an overfilled attempted crossing/drop. Measure actual round trips,
  jump time and distances; replace the route targets. A miss lands safely on the ground route, losing no resources.
  No precision jump or stranding. Evidence shows play differences, not just a faster stopwatch.
- At the same checkpoint, two peers race the pick, then reload/join: one saved room choice, no double grant,
  no lost later grant. Inspect the normal hook/glider/gate chain for bypasses. Sync proof needs a targeted contract
  check; neither a still nor this calculator establishes it. Owner feedback may change the design, never gates work.

## Open questions

1. **Recommended: choose early double jump versus carry 12 after T1.** May this replace the whetstone/sling order,
   explicitly changing both “jump after T3” and “boiler is first chosen upgrade”? Alternative: keep those calls;
   retire the stat fork and scope a non-ability route choice separately. Answer: ___
2. **Recommended: missing jump arrives at its ordinary post-T3 pickup; pack 16 arrives at the forge as today.**
   Keep this as two stations with different play, rather than a permanent lockout or a second purchase? Answer: ___
3. **Recommended: one forgiving crossing on the timber approach, useful at both stations.** Is that small geometry
   addition worth making the movement choice tangible, rather than accepting a stat-only fork? Answer: ___
4. **Recommended: commit through T3; no free swapping at the T1 stand.** Keep the consequence for two stations,
   rather than letting a player switch to whichever option serves the current load? Answer: ___

## Parked

- A limited shared material budget with genuinely alternative recipes, replacing bills rather than adding logs.
- House versus source upgrade, modeled with actual first-buy timing and a specified source benefit.
- A second connected place with its own immediate benefit; not just choosing which mandatory errand comes first.

No player-facing copy added. The Boogler's copy stays untouched; no new suspect line was found by this design pass.
