> **Status: proposed (2026-11-15).** Queue item D2 of [grant-1114-queue](../plans/grant-1114-queue.md). Written by
> one agent through the three lenses (play designer, systems architect, creative director), not a panel. Nothing is
> built. Every mechanic here changes a rule, so none is built on the live room without the owner (queue questions 2
> and 3).
> **2D model (16 November):** [Page](../world/first-line-decisions.html) exists: sling first saves about 3.4 s at Station 2 (7.1 s with deliberate shipped overfill), with no later order difference; route shortcuts remain unmeasured editable stand-ins.

# Decisions on the first line

Seed (Grant, 14 November, playing alone for 37 minutes; his biggest issue): the game "reads as running errands",
"I've never been able to make a decision", "it doesn't feel like I'm attaining mastery so much as being given new busy
work". He wants trade-offs between doing one thing and another that feel meaningful. His own ideas, kept as he gave
them: one log per chop at first and two from about Station 3; slower chopping at first, unlocked faster; an efficiency
boost before Station 3, not after; separate log and rail capacities with their own upgrades, or weight that slows you
when over-loaded instead of a hard cap; depots you earn and place; the glider taken now and used later.

Owner, 15 November: "Grant is an expert game designer, do not disregard his ideas just because there is previous
decisions in the repo." Owner, 9 November, on upgrades: "we should make it a player choice to upgrade, even if there's
one action, that way the player feels powerful in choosing the increased power."

## What the data says

From wake to the pier (29 minutes of play) the route offers no fork: one frame is open at a time, each bill names
exact amounts, and every bill has one source. The loop graph lists five orders the owner left free (beam or logs
first, and four others); none is shown to the player as a choice.

| Beat | Bill | Chops at 2 a chop | Trips at 8 a back | Grant's time | Choices |
| --- | --- | --- | --- | --- | --- |
| Station 1 | 24 logs | 12 | 3 | 1 min 8 s | 0 |
| Station 2 | 32 logs, 8 stone | 16 | 5 | 1 min 25 s | 0 |
| Station 3 | 40 logs, the beam | 20 | 5 and the beam | 2 min 22 s | 0 |
| The forge | 56 logs (the pack, 16, arrives after the first 24) | 28 | 5 | 2 min 36 s | 0 |

Power arrives with no alternative: the second jump, the pack and the proper axe (5 a chop) each wait as one thing to
take when a bill completes (a press, but nothing to weigh it against), and the depots and the trains simply appear. The pack came at 11:02, after the 40-log station he found a grind; his reaction was that the
fix he wanted already existed but came too late.

The game also refused the three choices he tried to make for himself: "Your back is full" 6 times (carry more),
"Sealed until the line reaches Far Head" 4 times (take the glider on the first climb), and the forge's rail rack
giving nothing when he went for rails early. He walked 93% of the session, 11.9 km, with 486 jumps: the movement is
the one thing he was playing with, and nothing rides on it.

## Pitch

Give the first line four decisions without adding material: one pick of which power comes first, a load you
may overfill at a cost, a depot you place, and a glider you can carry off before it wakes. Each is Grant's idea or
built on one. Total logs and stations stay as they are; what changes is that the player chooses and the choice shows
in the next five minutes. Serves DESIGN.md **6, Communal world** (every pick is the room's) and **11, Show, don't
tell**; the core loop's "each connection makes the next one easier" becomes something the player does.

## Gut question

At Station 3, did the haul feel faster because of something you chose?

## Best suggestions

1. **Pick your edge** (design; Grant's G6 with the owner's 9 November seed). Start at 1 log a chop and 8 on the back.
   When Station 1 is laid the track layer sets down two parts side by side: a **whetstone** (2 logs a chop) and a
   **sling** (12 on the back). Take one; the other comes when Station 2 is laid. By Station 3 the room has both, so
   nothing is lost and the fork is an order, as [upgrade-choices](upgrade-choices.md) suggestion 4 already said. The
   pack (16) and the proper axe (5 a chop) stay where they are.

   | | Today | Whetstone first | Sling first |
   | --- | --- | --- | --- |
   | Station 1 (24 logs) | 12 chops, 3 trips | 24 chops, 3 trips | 24 chops, 3 trips |
   | Station 2 (32 logs) | 16 chops, 4 trips | 16 chops, 4 trips | 32 chops, 3 trips |
   | Station 3 (40 logs) | 20 chops, 5 trips | 20 chops, 4 trips | 20 chops, 4 trips |

   Chops are quick (`swingMs` 240; he made four in about a second), so Station 1 costs about 3 s more and Station 3
   loses a 90 m round trip, about 16 s at 5.6 m/s. The two picks are close on purpose: 16 chops (about 4 s) against
   one 40 m round trip (about 7 s) at Station 2, so the fork is worth about 3 s in a beat he played in 85 s. If a
   playtest says "can't tell", the fork does not matter and the parts simply arrive in order.
2. **Heavy load** (design; Grant's G21). The back no longer refuses. Past its number you may take up to half as much
   again (8 becomes 12, 16 becomes 24), drawn as a bundle that visibly bulges. Three variants, differing in the cost:
   - **A, slow:** walking speed falls in a line to 0.6 at a full overfill. Arithmetic says this is not a trade-off:
     per log it beats a normal load whenever the factor is above 0.5, at any distance (a round trip with the walk
     back empty at full speed: (1 + 1/f) / 1.5 against 2; chopping and unloading cost the same per log either way).
     At 0.6 it is 11% faster per log. Below 0.5 the normal load wins instead, so a speed-only cost always has one
     right answer. It is the control.
   - **B, grounded (recommended):** over the number you cannot jump, hook or glide. The short ways (the trestle's
     gaps, the cliff drops, the rings) are closed to a heavy load, so the choice is the long road with more or the
     short way with less. It puts stakes on the movement he was already playing with.
   - **C, spill:** a tumble or a hard landing scatters the extra as piles you can pick up again. Slapstick (DESIGN
     10), and the one variant that reopens the 1 November decision "no sway, and so no jump spill (nothing would warn
     you of it)". Here the bulging bundle is the warning.
   Separate capacities for logs and rails (his other form of the idea) wait until one of these is felt.
3. **Stake the depot** (design and creative; Grant's G8 and G7). The cart's depot stops appearing by itself. When
   the forge is lit its crew hands over one stake; plant it within 12 m of any laid track and the cart unloads
   there from its next trip. It can be pulled up and moved. No bill, no material. On the bridge stretch he made two
   500 m round trips to the forge for rails (20:05 and 22:15) and asked for "something to deliver to him there".
   Corrected in review: the cart already does that. Its rack stands 7 m from the open frame at every stretch from
   Q2 (loop graph), and one shipment brings Q5's whole rail bill ([level-pacing-1114](../plans/level-pacing-1114.md),
   problem 3); he walked because he did not find the rail depot, which had no sign (G7, queue item C2). So a stake
   saves no walking against today; what it adds is the placing. Mastery is knowing where the next two frames will
   stand.
4. **Take it now, use it later** (design; Grant's G9). On the first summit climb the sealed glider can be taken. It
   rides furled on the back with its three bands, one falling as each of Q3, Q4 and Q5 is laid (as the shipped seal
   does), and opens at
   Far Head wherever the carrier stands. No second climb. The glider is still usable only from Far Head, so the
   owner's spacing of 3 and 8 November holds. The seal that shipped (level-pacing-1114, option A) is what Grant met,
   and he still asked for this.
5. **Say the free orders out loud** (creative). Where the owner already left an order free (the beam or the logs,
   the lever or Q4, the summit switch or Q4), show both jobs lit at once with equal weight, so an
   existing choice reads as one. View-only; could ship without a question.

**Tensions.**

- **More choice against more grind.** The owner is wary of material grinds, and the 9 November review refused to
  put the cart back to 16 "to become a choice". None of the five adds a log to a bill. Suggestion 1 adds 12 quick
  chops to Station 1 (and 16 more to Station 2 if the sling is taken first) and removes a trip from Station 3.
- **The room's pick, made by one player.** A pick is one accepted fact for everyone (principle 6). With friends the
  first press wins. Recommendation: keep it so, and show the other part waiting so nobody thinks it is gone.
- **Stake the depot against "no routing or quotas".** DESIGN's core loop says goods ride the line automatically.
  One stake is a place, not a route or a quota, but it is the nearest of the five to that line. Recommendation: try
  it in the prototype and let the owner judge by playing.
- **Heavy load against the simple back bundle.** The 1 November decision replaced a wobbly stack. Variants A and B
  keep the bundle steady; only C brings motion back.

## Shape

- **Sync:** Lockstep, server-owned. Each pick is one room-wide accepted fact on `Rail`, like the pack and the axe
  today; the stake is one position; the heavy load is a carry rule checked where the cap is checked now. Values go
  in `TUNABLES`.
- **Reuses:** the pack's and axe's chests and flourish; the co-op ability arrival for friends who were elsewhere;
  the depot rack and the cart's trip; the glider's band view; the loop graph for the numbers.
- **Smallest first build:** (a) a 2D page from the loop graph (owner call "Visualize in 2D HTML first"): the first
  line's chops, trips and seconds today and under each variant, with pick buttons. (b) A flagged prototype in its
  own room (`?proto=edge&room=proto-edge`, since it changes lockstep numbers), spawning at the woken track layer,
  with suggestion 1 and suggestion 2's variants as `&v=slow`, `&v=grounded`, `&v=spill`. (c) Suggestions 3 and 4
  after the first verdict.
- **Risks:** the Station 2 fork may be too close to feel; a grounded load may read as a bug unless the bundle and
  the greyed jump say why; the stake needs the cart's rules reworked, which is the costliest part.

## Done means

- The 2D page shows, per station, chops, trips and predicted seconds for today and each variant, from the loop
  graph's own bills.
- In the prototype room: a still of the two parts beside the track layer after Station 1; a motion sheet of a
  12-log bundle against an 8-log one; the jump prompt greyed with its reason under variant B; counts for picks
  taken, overfills and spills in the copied playtest entry.
- One line on the protos page with the gut question above.

## Open questions

They are questions 2 and 3 of the [queue](../plans/grant-1114-queue.md#owner-questions), asked once there.

## Parked

- Logs as the forge's fuel: rails cost logs, so one material has two uses (Grant's G23, expecting mining or
  smelting). A real trade-off, and the likeliest to become a grind; model it on the 2D page first.
- Obstacles on the haul (the river, a rockfall): DESIGN leaves danger open.
- Slower chopping at first, unlocked faster (Grant): held behind suggestion 1's verdict, since both act on chopping.
- Separate log and rail capacities with their own upgrades (Grant).
- Updrafts over the water for the glider (Grant's G25).

## Design review (designer, 2026-11-15)

Checked against DESIGN.md, the Current rules of core loop and rewards, owner-calls, find-the-fun's prototype rules,
level-pacing-1114 problems 2 and 3, `npm run loop` and the sim. Facts corrected in place: station names (the repo's
"Station 6" is Q6, so the bands fall at Q3, Q4 and Q5 and the free order is the summit switch or Q4); the stake's
saving (the cart already unloads 7 m from the frame); "two picks" (it is one; the second part is forced); the chop
seconds; the assumption behind the 0.5 factor. Not looked at: stills of the haul routes, so whether any haul from
Station 1 to the forge has a jump on its short way is unmeasured.

**Numbers against the build (all hold):** 2 logs a stroke (`RAILWAY_T1.strokeYield`), 5 with the proper axe
(`railway-sys-line1.ts:76`), back 8 (`RAILWAY_T1.carry`) and 16 (`LINE2_PACK.carry`), bills 24, 32 + 8 stone,
40 + the beam, forge 24 + 32 with the pack after the first 24. The tables in "What the data says" and suggestion 1
are right. The 0.5 claim is right for a round trip walked back empty.

### Calls

| Call | Kind | Source, or the decision it would change |
| --- | --- | --- |
| The back stays one bundle for logs; no separate capacities yet | Decided | [1 November, the back bundle](../decisions-rewards.md#d-2026-11-01-the-back-bundle-stays-the-way) |
| No log is added to any bill; the cart stays at 24 | Decided | "Wary of: material grinds"; [9 November](../decisions-core-loop.md#d-2026-11-09-the-boiler-fit-is-the-first) |
| Upgrades wait in the world as a part beside the machine; one press fits it for the room | Decided | Same 9 November entry; DESIGN 6 |
| 2D page first, then `?proto=edge&room=proto-edge`, variants as `&v=` | Decided | "Visualize in 2D HTML first"; find-the-fun, rules for every prototype; "Try things early" covers a flagged room |
| Suggestion 5: both jobs of a free order lit with equal weight | Default | View-only; the five free orders are the owner's |
| Sling 12; overfill of half as much again (12, 24); stake within 12 m of laid track; slow factor 0.6 | Default | Tunables for the page and the prototype |
| With friends the first press picks for the room, the other part shown waiting | Default | DESIGN 6 |
| Start at 1 log a stroke (today 2) | New | Changes the pinned Place number; fits [3 November, trees](../decisions-core-loop.md#d-2026-11-03-trees) ("the better axe makes work faster"). Adds 12 to 28 strokes to the first two stations |
| A whetstone or sling pick after Station 1 | New | **Changes the headline of [9 November](../decisions-core-loop.md#d-2026-11-09-the-boiler-fit-is-the-first), "the boiler fit is the first upgrade a player chooses"**, which the queue's D1 relies on. The brief cites that entry only in favour. Not in the queue's questions |
| Overfilling the back at a cost (A slow, B grounded) | New | Changes the hard cap; keeps [1 November, a simple back bundle](../decisions-rewards.md#d-2026-11-01-carrying-is-a-simple-back-bundle) |
| Variant C, spill on a tumble | New | Reopens the same entry's "no sway, and so no jump spill" (queue question 2 names it) |
| A depot the player plants | New | DESIGN core loop, "automatically, with no routing or quotas"; the cart as built on 9 November |
| The glider taken sealed on the first climb | New | The 3 and 8 November spacing holds; changes the take rule and removes the second climb (queue question 3) |

### Findings

1. **Strongest for Grant's complaint: the heavy load, variants B and C.** It is the only suggestion decided again on
   every trip, with the player's own movement, and it answers his six "Your back is full" refusals directly. A is
   rightly the control: any speed-only cost has one right answer.
2. **B has no cost where the prototype spawns.** Stations 1 to 3 come before the second jump (9 November loop
   orders), and the brief measures no haul there whose short way needs a jump; "the trestle's gaps, the cliff drops,
   the rings" are line 2, where logs already arrive 7 m from the frame. Before building, the 2D page must name, per
   haul, the short way and the long way in walk-seconds; if none exists before the forge, spawn the prototype at the
   forge or Q1, or B tests nothing. B also needs a way to shed the extra (drop it as a pile), or a grounded player
   in a hollow is stranded, which is one of the three rules that do not bend.
3. **Suggestion 1 is honest but small.** The fork is worth about 3 s in an 85 s beat, and both parts are owned one
   station later. It answers G6 (power before Station 3) better than G5 (decisions). Keep it as the cheapest
   test of "choosing feels powerful", not as the answer.
4. **Weakest: the stake.** The cart's rack already follows the open frame, which is the best place for it, so a
   planted depot can only match today or do worse; moving it each stretch is a new errand. It is also the costliest
   and the nearest to "no routing". G8 is two complaints: unearned (the forge crew handing something over answers
   that, with no placing) and unsigned (C2). Recommendation: try earning and the sign first, and prototype placing
   only if the 2D page shows a spot that beats the automatic one.
5. **Suggestion 4 removes an errand; it adds no decision, and it moves the first flight.** Today the wake sends the
   player back up to a 102 m launch, which Grant liked (queue, G4 correction: about 2 min of climb and flight). A
   glider that opens "wherever the carrier stands" opens on the ground at Far Head. The brief should say where the
   first flight launches from, and that the take is the room's (DESIGN 6), not the carrier's alone.
6. **Missing.** Nothing here has a cost that is not seconds, and nothing uses the two things DESIGN leaves open:
   danger, and materials with two uses (the parked forge-fuel idea is the only real resource trade-off in the brief,
   and Grant asked for it in G23). Co-op is one line; splitting the whetstone and the sling between two friends is
   the obvious version and would break "every upgrade applies to everyone", so it needs saying either way. "Sling"
   is also the name of a later stand-in grant (Canopy Town's carry sling).

### For the owner, beyond the queue's five questions

1. May a pick come before the boiler, changing "the boiler fit is the first upgrade a player chooses" (9 November)?
   Recommended: yes in the prototype room only; the live rule stands until he has played it.
2. Starting at 1 log a stroke: fine to try, given "wary of material grinds"? Recommended: yes in the prototype; it
   costs about 3 s at Station 1.
3. Should the stake be cut from question 2's order in favour of "earned and signed"? Recommended: yes.
