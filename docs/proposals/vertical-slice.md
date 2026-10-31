# Vertical slice: eras 1–2 (castaway camp → steam wagons)

*Proposal and build spec, 31 October 2026.*

- **Design source.** The design direction comes from the Boogle 2.0 design thread: the eras, the mayor, opening days, feel-first venues, rides, story gags, and the [story-and-finale](story-and-finale.md) proposal. That thread is authoritative on design.
- **What it builds on.** The **0.1 groundwork already on `main`**: identity, roster, piles, the haul stack, work sites, palm log sources, machine runs and the offline helper bank ([docs/game-design/haul.md](../game-design/haul.md), [docs/plans/0.1-groundwork.md](../plans/0.1-groundwork.md)).
- **Status.** Nothing in this spec is built yet. It is written so that `/feature` can turn each milestone into a plan.

## 1. What the slice must prove

One evening, on today's island, with two to four friends:

1. **The loop feels good with no explanation.** You shake palms, haul logs, and watch the first section of track get laid.
2. **Opening day lands.** The group triggers it together and watches The Boogler make a fool of himself. Afterwards the island has visibly changed: era 2 is here.
3. **Riding feels good.** The steam wagon chuffs along the new road, and friends hop on just to ride it.
4. **Venues pull people in without gating anything.** Court ball and the soapbox run are fun on their own, and they feed the loop on the side.

**Playtest questions:**
- Did anyone ride the wagon twice for no reason?
- Did the opening day get a laugh?
- Did anyone play court ball while others hauled, and did that feel fine?
- Did someone who never hauled still feel part of it?

That last question is SETTLED's "every system ignorable" rule, which this slice keeps.

## 2. How the design maps onto what's built

| Design-thread idea | What exists (0.1) | The slice adds |
| --- | --- | --- |
| Era 1, castaway camp | The wood age: palms give logs, three sections from the court toward the lighthouse | The era 1 identity: driftwood huts, a campfire, The Boogler's crate stall (props only) |
| Laying track | Work sites (Track ring + Helper ring) and the scripted machine run | Era 1's machine is a hand-cranked **plank layer**: the laid sections read as a plank road the wagon can drive |
| Opening day: watch **and** play | Machine runs: anyone presses Start, everyone sees the same run | A group trigger (everyone on the platform plus a honk chord) and a scripted ceremony after the last section |
| The Boogler as mayor | The Boogler is a Host NPC with lines and a friendship ladder | In era 2 he elects himself mayor: sash, town hall crate with a top hat, ceremony lines |
| Era 2, steam wagons | The age changes after the last section; no iron sources yet | Era 2 props (bazaar stalls, bunting) and a **timetabled steam wagon** on the laid road |
| Ride-only, timetabled trains | Scripted runs as pure functions of tick (`runAt`) | `wagonAt(tick)`: position along the laid sections as a pure function, so it costs nothing on the network |
| Play is the material | Only hauling feeds sites | Venue rounds drop a **prize pile** of the age's material at the venue. It feeds the haul, never gates, and is optional. |
| Feel first | `/look`, scenarios, the feel pass | A feel pass and a `/look` motion sheet for every milestone, before rewards |
| Personal rewards | Contribution tiers (shown only to you) | One era hat, earned by playing either venue once (Local, in localStorage) |
| Running gags | The Boogler's lines are data | Gag step 1–2 (below) |

**Two rules from SETTLED that this slice keeps:** mini-games never gate progress, and nothing decays. **One rule it bends:** "the beach ball never produces income". Court ball's prize pile is income from a ball game. See decision 1.

## 3. The beats of the evening

1. **Arrive (era 1).** The castaway camp: driftwood huts, a campfire, The Boogler's crate stall, the court. The first work site sign by the court shows "Plank road 1 of 3".
2. **Haul.** Shake a palm and logs fly onto your back; pour them into the Track ring. Friends play court ball nearby; a round ends and a small pile of logs drops at the court ("prize pile"). Anyone can haul it.
3. **Lay.** The ring fills and someone starts the plank layer: a hand-cranked contraption, crank-crank-clunk, laying planks over 50 s. Sections 1 and 2 go the same way.
4. **The last section is laid.** The opening-day call goes out: a bell rings at the lighthouse, the departures-board sign says "OPENING DAY. All welcome. Free hat (there is no hat)", and a glow marks the platform by the lighthouse.
5. **Opening day.** It needs everyone on the platform, or a honk chord from three or more players to start it anyway; one lonely player can start it alone after 20 s. Then a 40 s scripted ceremony:
   - The Boogler climbs the crate, declares himself mayor ("One to zero") and puts on the sash.
   - He gives a one-word speech: "Behold."
   - The steam wagon, already fired up, bursts the ribbon early and tows the bunting up the hill.
   - Physics props (the ribbon, the bunting, his top hat) do the comedy. No scripted outcome beyond that.
6. **Era 2.** Props swap over: bazaar stalls with bunting, the town hall crate with a top hat, the plank road as a dirt-and-plank road. The steam wagon runs on a timetable between the court and the lighthouse. The soapbox run opens on the lighthouse path.
7. **Play on.** Ride the wagon, race the soapbox run, earn the era hat. Iron sources don't exist yet, so the slice ends here.

## 4. Milestones

Each milestone is one PR with `npm run check` passing, a scenario or a `/look` sheet, and the DESIGN.md principle it serves named in the commit. They're ordered so that feel lands before rewards.

### S1. Era state and era props (Telegraph everything; Leave something for the next visitor)

- **The era is derived, not stored.** It comes from the state that already exists, the laid sections and the age (`sites`), plus one new flag for whether opening day has happened. No new conserved quantity.
- **Era props.** Era 1 and era 2 prop sets (huts and campfire; bazaar stalls, bunting, the town hall crate), swapped by era. They're Local renders that read the lockstep era.
- **Files:**
  - `src/sim/era.ts`, a pure function from (age, sections laid, opening done) to the era, with its test;
  - `src/features/era-props.ts`.
- **Check:** a scenario that loads a fixture world in each era and takes stills.

### S2. Rail spike: the timetabled steam wagon, riding feel first (Toys before chores; Slapstick over precision)

- **The wagon's position is a pure function of time.** `wagonAt(tick)` in `src/sim/wagon.ts` returns the wagon's position along the laid sections, using integer distance along the route and stops with dwell times. It's the same on every tab, so there's no network traffic and no ownership. It's Lockstep without state, like `runAt`. Test: it's deterministic and covers only laid sections.
- **The render** is a brass steam wagon with two crate trailers: puffs, a whistle at stops, the chuff rate tied to speed, soot on whoever rides up front.
- **Riding:**
  - stand on a trailer and you're carried, via a kinematic platform in Rapier;
  - the camera settles in;
  - you can look around while riding;
  - jump off at speed and you get a short tumble.

  No new control; the Interact button isn't needed either.
- **Feel targets:** no jolt on boarding, sway on the plank joints, slow enough to hop on and off.
- **Checks:**
  - a `/look` motion sheet of a ride;
  - a two-tab scenario: both tabs report the same wagon position for the same tick, with zero messages;
  - `npm run perf` before and after.

### S3. Opening day: triggered together, then watched (Cooperation is automatic; Telegraph everything)

- **Trigger.** An op, `open.start {}`, which the host validates. It starts when every online player is in the platform ring, or a honk chord from three or more players goes off there (the existing chord detector), or one player has been alone in the ring for 20 s.
- **The scene.** A scripted run (`OPENING_DAY`, about 40 s) through `runAt`, so a late joiner sees the same moment. The comedy objects (the ribbon, bunting, the top hat) are Local physics props spawned by the run, so each tab's slapstick may differ a little. That's fine because they're cosmetic.
- **The Boogler's part.** He's a Host NPC, so the host walks him to the crate and plays his lines on the run's phases.
- **Files:**
  - `src/world/rules/opening.ts` (flag and op);
  - `src/features/opening-day.ts`;
  - the ceremony lines in The Boogler's line data.
- **Check:** a scenario where two tabs both see the run start at the same tick, and the era flips to 2 afterwards.

### S4. The mayor (Leave something for the next visitor)

- **What changes:** a mayor's sash on The Boogler, a "mayor" flag his lines can read, the town hall crate with a top hat as his spot, and new bark lines that mention the road and the wagon.
- **What stays:** his personal friendship ladder, unchanged.
- **Files:** the Boogler's model, his lines, and `src/boogler/` brain hooks (he goes to the town hall at dusk).

### S5. Two feel-first venues (Toys before chores; The ball stays the star)

- **Court ball** (era 1):
  - **Rule:** keep the ball off your side of the sand.
  - **Feel:** a big squash on every bump, sand puffs, the score as sand pips rather than numbers.
  - **Rounds:** a round starts when two or more players stand on opposite halves, and ends at 5 points.
  - **Sync:** score and round are Host values; the ball stays Owner.
- **Soapbox run** (era 2):
  - **Rule:** race down the lighthouse path; the muddy shortcut is fastest.
  - **Vehicles:** coconut-wheeled carts, Owner kind (feel numbers in [vehicles.md](vehicles.md), adapted to Rapier).
  - **Feel:** drift sparks, dust, a time shown as a plank tally.
  - **The Puff Boost** (The Boogler launches you) comes later.
- **Prize pile.** At the end of a round, the host submits `pile.drop` of the age's material at the venue. It's small: about a third of what a minute of hauling gives. That way playing feeds the haul, but hauling stays the main way.
- **Files:**
  - `src/features/court-ball.ts`;
  - `src/features/soapbox.ts` plus its Owner vehicle;
  - `src/sim/venue.ts` for round rules, with a test.
- **Check:**
  - a `/look` sheet of each;
  - a scenario where a round's end drops one pile, once, on every tab.

### S6. The era hat and the gags (Communal world, personal rewards)

- **The era hat.** Play any venue once and you get the castaway straw hat. Its era-2 version is a brass-goggled cap. It's Local (localStorage, keyed by pid) and shown through a presence field.
- **Gags, steps 1–2:**
  - Gary's soggy business card washes up at the camp in era 1;
  - a "Back in 5 minutes" sign on the dock appears in era 2;
  - Oyijon's first coconut letter ("carry them the usual way");
  - the speech goes from none (knocked off the crate) to one word.

### S7. Playtest and log (How we work)

- Two to four friends, one evening; log it with `/playtest-notes`.
- Answer the questions in section 1 before starting era 3.

## 5. Out of scope

- Eras 3 and later, iron sources, and new islands.
- The som shop and knacks.
- More venues: coconut shy, rodeo and haggle come after the playtest.
- The mainland, the departures board as fast travel, and painted art in-engine.

## 6. Decisions needed

1. **Court ball pays a prize pile, but SETTLED says the ball never produces income.** Options:
   - (a) court ball pays only the hat and personal rewards, and only the soapbox run drops a prize pile;
   - (b) allow the court's prize pile as a stated exception, since it's a round's result rather than ball impacts;
   - (c) no prize piles at all, so venues are purely personal.
2. **Era naming.** The game and SETTLED call it the "wood age"; this thread calls it "castaway camp → steam wagons". Should the UI say "castaway camp"?
3. **Who starts opening day alone?** After 20 s alone, or only when the whole online group is present?
4. **The plank road.** Is the laid wood-age track a plank road that the wagon drives (matching the era-2 painting), or rails from the start?
