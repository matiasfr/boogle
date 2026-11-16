> **Status: owner questions answered 2026-11-15 ([decision](../decisions-core-loop.md#d-2026-11-15-grant-queue-answered)); building.** The queue for Grant's
> 14 November playtest ([rows G1 to G36](round-4-notes.md#grants-playtest-14-november-his-granola-call-ranked-queued-15-november),
> [log](../playtests.md#2026-11-14-grant-solo-his-granola-notes)). Base: `bff2e6203`.

# Grant's 14 November notes: the queue

Owner, 15 November: "Run an agent to analyze this again and plan a queue of changes and design problems to attack in
the backlog. The model should be able to start tackling the main design issues directly." And: "Grant is an expert
game designer, do not disregard his ideas just because there is previous decisions in the repo."
([owner call](../agents/owner-calls.md#grants-ideas-are-weighed-on-merit)).

Ranks are the tracker's. Within a rank, items are in the order to pick them. "Who" is from `npm run models`
(withCodex). A recommendation here is not an owner decision.

## The queue, in order

| # | Item | Rank | Rows | Principle | Already decided? | Next step | Who |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **D1. What next after Far Head and the pier** | P1 | G1, G4, part of G11 and G23 | 7, 11 | Yes, in favour: signs before hovering text; words and beacons sparingly; the marker only "where nothing else works" (10 November); the boiler stays the first chosen upgrade (9 November) | Built on a branch, not shipped (15 November): both cuts, the crane's hold, the little guys, the rack's board and the capped repeat call ([as built](forge-call-handoff.md#as-built-15-november-2026)). Left: the 6 m reach and the 380 cm/s haul (sim work), and the owner's words for the rack and Sleeves | Implementer agent, fable medium; visual review by a fresh subagent |
| 2 | **D3. The Boogler's reveal** | P1 | G2 | 7 | The statue is the owner's 14 November call ([rail](../decisions-rail.md#d-2026-11-14-the-boogler-s-statue-replaces-the-clock)); the ending is meeting The Boogler ([core loop](../decisions-core-loop.md#current-rules), "The ending") | Owner question 1 | Owner; then implementer agent |
| 3 | **D2. Decisions on the first line** | P2, Grant's biggest | G5, G6, G8, G9, G21, G23, part of G7 | 6, 11, the core loop | Partly against: "no sway, and so no jump spill" (1 November); the glider at Far Head (3 and 8 November); "no routing or quotas" (DESIGN). In favour: "make it a player choice to upgrade" (9 November); danger is open | Designer-reviewed, ready with changes. The 2D page from [first-line-decisions](../brainstorms/first-line-decisions.md), listing each haul's short and long way; the prototype waits for owner questions 2 and 3 | 2D page: Codex, gpt-6.1-sol high; the prototype's plan: planner agent; its sim work: Codex, gpt-6-astra high |
| 4 | **C1. The Detail ladder hunts and hitches** | P2 | G3, G36 | (technical) Small and readable | No decision needed | Fix both faults in `src/features/adaptive-res.ts`: stop stepping down on a machine at p50 6.2 ms, and remove the 260 to 330 ms frame when sun shadows switch (see Corrections) | Codex, gpt-6.1-sol high |
| 5 | **D4. The first five minutes** | P2 | G10, G11, G16 | 11 | "Where your axe comes from" was answered on 5 November ([core loop](../decisions-core-loop.md#current-rules)); Grant's version changes it | Owner question 5; then a light brainstorm | Codex, gpt-6.1-sol high (brainstorm) |
| 6 | **C2. Depots say what they are** | P2 | G7, G8 (the sign) | 11 | Yes: signs in the world; the cart is one full shipment ([level-pacing-1114](level-pacing-1114.md), problem 3) | [x] Built and inspected on a local branch, not shipped (15 November): matching existing boards verified from arrival; full-cart unload lands before departure. [Stills, motion sheet, checks and copy](grant-c2-depots.md) | Implementer agent, fable medium |
| 7 | **D5. Trains arrive all at once** | P2 | G19 (owner rows 11, 39) | 7 | Planned: [train-progression](train-progression.md), with three owner questions open there | Nothing new; Grant's row is added evidence | As that plan says |
| 8 | **C5. One unit for what you carry** | P2 | G14 | 11 ("what's on screen is true") | [Carried-resource display](../game-design/place.md#carried-resource-display) is as built; no decision picks counts over squares | A short plan: counts everywhere, squares gone, or the reverse; a small ruling logged in agent-calls | Designer agent, then implementer agent |
| 9 | **C7. Hook and glider controls** ✓ | P2 (G26 P3) | G17, G18, G26 | 11 | Owner approved 15 November; [Jump is the glider's button](../agents/owner-calls.md#jump-is-the-gliders-button) | Built and checked on `t3/grant-c7-controls`, not shipped: Interact hooks, F/RB prompt persists, Jump closes and teaches the glider, upward aiming stays above the platform. Keyboard/pad/touch handler checks, motion sheets, camera before/after, teach and touch stills, owning tests, `check` and T1 route: [evidence](grant-c7-evidence.md) | Implementation sub-agent |
| 10 | **C3, C4, C6. Three small world fixes** | P2 | G12, G13, G15 | 11 | No decision needed | The forge's board and deposit face the arriving train; every station's sign carries its own number; a ladder out of the water at the diving helmet | Implementer agent, fable medium |
| 11 | **C8. The P3 batch** | P3 | G20, G22, G24, G25, G27 to G35 | 11, 10 | G22: Pause already opens on the wardrobe (10 November); he did not find it. G29 is in [terrain-clean](terrain-clean.md). G30, G31 and G34 are the owner's own rows | One batch after the items above; G24 keeps Sleeves' line | Codex, gpt-6.1-sol medium |

## Owner questions

At most five. Each has a recommended answer first; none is recorded as his call.

1. **The statue gives The Boogler away (G2).** Recommended: take Grant's idea. Until the room has met The Boogler,
   the footing on the green carries a scaffold and a sheeted shape that the builders say he commissioned and they
   ran out of materials for; the stone statue stands once he has been met. This keeps your 14 November statue and
   moves when it appears. Alternative: keep the statue as it is and accept that the ending is not a reveal of his
   looks. The builders' words would be yours. Answer (owner, 15 November): Scaffold, yes. Keep the statue asset; no meeting logic now, document the swap for later. Built on a branch, not shipped: the scaffold and sheet stand, the statue is kept behind `BOOGLER_STATUE_UNVEILED`, the swap is documented in [place](../game-design/place.md); the notice's two lines are drafts for the owner.
2. **May a flagged prototype, in its own room, try the first-line decisions (G5, G6, G21, G8)?** Recommended: yes, in
   this order: the heavy load in three variants (the designer's strongest: the one choice remade every trip), then
   pick your edge (1 log a chop and 8 on the back, then a whetstone or a sling first). It reopens the 1 November
   "no sway, no jump spill" for one variant, and the pick would come before the boiler, which your 9 November call
   made the first chosen upgrade; both only in the prototype room. The depot stake is held back: the cart already
   unloads 7 m from the open frame, so placing it saves no walking; Grant's "earned" is answered by the forge crew
   handing the depot over and by its sign (C2), and placing is tried only if the 2D page shows a better spot. Nothing reaches the live room until you have played
   it. Alternative: the 2D page only. Answer (owner, 15 November): Yes, built into the main game, not a prototype branch; its own room briefly only if the change is big. Heavy load first.
3. **The glider: take it sealed on the first climb, and it opens at Far Head (G9, your row 31)?** Recommended: yes.
   Your spacing holds (no gliding before Far Head) and the second climb goes. It changes one rule and needs a world
   bump. The seal that shipped is what Grant met, and he still asked for this. Alternative: keep the seal.
   Answer (owner, 15 November): No. The glider must be usable when you get it. Redesign the order of hook, summit, glider and the gate instead; anything may move.
4. **Far Head's shot: may it grow from 5 s to about 8.5 s, ending on a cut to the forge casting the boiler (D1)?**
   Recommended: yes. The designer's review found the Act 2 card would cover a cut placed inside today's 5 s, and
   that a longer shot changes the 11 November reading "trimmed to 5 s, never a second move after it". Until you
   answer, no cut is built there: the forge's whistle sounds as the camera hands back. The pier has no camera shot
   today, so its cut is new and is built as a default. Answer (owner, 15 November): Yes, longer is fine.
5. **The start: the camp's resident hands you the axe, and the engine starts when the last log is in (G10).**
   Recommended: brainstorm it. Grant's order gives the first conversation a job and makes the first whistle the
   payoff of the first bill; it changes the 5 November answer on where the axe comes from. Alternative: keep the
   order and only fix the dead beat after the wake. Answer (owner, 15 November): Yes, take the recommendation.

## Suspect copy and words wanted, for the owner (nothing reworded)

- Words wanted for D1: a line for Sleeves at the pedestal while a part waits, and the forge rack's reason when it
  gives no rails. Neither is built until he writes or picks them.

- "Wake it up" (the track layer's prompt). Grant: not what you do to a train; his suggestion is "Start engine".
  My view: the machine is asleep and the scene shows a wake, so the line fits; the dead beat after it is the fault
  (D4). His to pick.
- "Sealed until the line reaches Far Head" (the glider). Marked as draft copy in level-pacing-1114; refused 4 times.
- "Your back is full". Refused 6 times, beside G14's counts that did not match.
- "Station 1" on later stations' signs (G13); to be checked in the build, it may be a bug and not copy.
- "Take it: $0" (the free shop). Shown 4 times, never pressed; he liked the shop's jokes.
- Sleeves' "The log cart will bring the heavy conversation": keep. Grant liked it and could not get past it (G24),
  which is a fault in how lines advance, not in the line.

## Corrections to the tracker's rows, from the raw log

- **G1.** He did not wander: after the pier he rode a train straight back to the village and came off it 8 m from
  the breaker (34:14), then passed it again at 10 m (36:07). Its prompt was never shown.
- **G4.** Of the 7 min 5 s from Far Head to trains, about 2 min was the glider climb and flight, which he liked.
  The hunting was about 4 min: he reached the forge at 24:52, stood 7 m from the boiler, pressed at the rail rack
  and left without seeing it. The haul was 62 s.
- **G3.** "Every shadow switch logged a 250 to 330 ms frame (24 long frames)" is not what the log shows. The 24
  marks are 12 hitches, each logged twice (the slow frame and the frame after it), of 259 to 327 ms. There were 43
  switches between rungs 1 and 2, so 12 of 43 hitched, and none after 17:45; the 21 switches between rungs 0 and 1
  never hitched. That fits a pipeline compiled on first use per view. In his Station 2 window four hitched (5:27,
  5:38, 6:14, 6:25); the 4:46 step did not.
- **G6.** T2 laid to T3 funded was 2 min 22 s; the 93 s is from the beam's deposit to funded.
- **G7.** At 20:06 he took rails from the forge until "Your back is full"; the log's one "forgeTake, not yet"
  refusal is that same second. The depot's rails were first taken at 22:55.
- **G2.** The only statue of The Boogler in the code stands on the Round's green in Home's town
  (`TOWN_STATUE`), not on a road to Bell Rock. The row keeps Grant's wording.

- **G7, from the designer's review.** The cart's rack already stands 7 m from the open frame. He walked to the
  forge for rails because the rail depot had no board, not because it was far.
- **D1's facts, from the designer's review.** The boiler's prompt is offered within 3.6 m (4.2 m is the server's
  allowance); the boiler's plume rises from the forge's chimney about 15 m from the pedestal, and only the
  breaker's rises from the pedestal; Far Head's shot and the pier show each sound two whistles of their own.

## Not done here

The initial planning pass changed no game code and dispatched nothing; implementation status is now in the queue above. The designer agent reviewed both design docs ("ready with
changes"; its sections are in each doc) and logged seven proposed calls in [agent-calls](../agent-calls.md). The 2D
page for D2 is not made.
