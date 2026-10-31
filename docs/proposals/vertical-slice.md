# Vertical slice: eras 1–2 (the wood age → steam wagons)

*Proposal and build spec, 31 October 2026. Round 7 decisions folded in, 1 November 2026.*

- **Design source.** The design direction comes from the Boogle 2.0 design thread: the eras, the mayor, opening days, feel-first venues, rides, story gags, and the [story-and-finale](story-and-finale.md) proposal. That thread is authoritative on design.
- **What it builds on.** The **0.1 groundwork already on `main`**: identity, roster, piles, the haul stack, work sites, palm log sources, machine runs and the offline helper bank ([docs/game-design/haul.md](../game-design/haul.md), [docs/plans/0.1-groundwork.md](../plans/0.1-groundwork.md)).
- **Status.** Nothing in this spec is built yet. It is written so that `/feature` can turn each milestone into a plan.

## 1. What the slice must prove

One evening, on today's island, with two to four friends:

1. **The loop feels good with no explanation.** You shake palms, haul logs, and watch the first section of rail get laid.
2. **Opening day lands.** Anyone can kick it off, and the group watches The Boogler make a fool of himself. Afterwards the island has visibly changed: era 2 is here.
3. **Riding feels good.** The steam wagon chuffs along the new rails, and friends hop on just to ride it.
4. **A venue pulls people in without gating anything.** The soapbox run is fun on its own.

**Playtest questions:**
- Did anyone ride the wagon twice for no reason?
- Did the opening day get a laugh?
- Did anyone race the soapbox run while others hauled, and did that feel fine?
- Did someone who never hauled still feel part of it?

That last question is SETTLED's "every system ignorable" rule, which this slice keeps.

## 2. How the design maps onto what's built

| Design-thread idea | What exists (0.1) | The slice adds |
| --- | --- | --- |
| Era 1, the wood age (the castaway camp look) | The wood age: palms give logs, three sections from the court toward the lighthouse | The era 1 identity: driftwood huts, a campfire, The Boogler's crate stall (props only). The game keeps calling it **the wood age**. |
| Laying track | Work sites (Track ring + Helper ring) and the scripted machine run, which lays sleepers and rails | Unchanged: **rails from the start**. Era 1's machine gets a hand-cranked look (crank-crank-clunk). |
| Opening day: watch **and** play | Machine runs: anyone presses Start, everyone sees the same run | An opening-day trigger **any player can start, from the first moment**, then a scripted ceremony after the last section |
| The Boogler as mayor | The Boogler is a Host NPC with lines and a friendship ladder | In era 2 he elects himself mayor: sash, town hall crate with a top hat, ceremony lines |
| Era 2, steam wagons | The age changes after the last section; no iron sources yet | Era 2 props (bazaar stalls, bunting) and a **timetabled steam wagon** on the laid rails |
| Ride-only, timetabled trains | Scripted runs as pure functions of tick (`runAt`) | `wagonAt(tick)`: position along the laid sections as a pure function, so it costs nothing on the network |
| Play is the material | Only hauling feeds sites | **Not in this slice.** No prize piles: venues give personal rewards only. A later mini-games pass revisits how play feeds the haul. |
| Feel first | `/look`, scenarios, the feel pass | A feel pass and a `/look` motion sheet for every milestone, before rewards |
| Personal rewards | Contribution tiers (shown only to you) | One era hat, earned by finishing the soapbox run once (Local, in localStorage) |
| Running gags | The Boogler's lines are data | Gag step 1–2 (below) |

**Rules from SETTLED that this slice keeps:** mini-games never gate progress, nothing decays, and the beach ball never produces income.

## 3. The beats of the evening

1. **Arrive (era 1, the wood age).** The castaway camp look: driftwood huts, a campfire, The Boogler's crate stall, the court. The first work site sign by the court shows "Rail 1 of 3".
2. **Haul.** Shake a palm and logs fly onto your back; pour them into the Track ring.
3. **Lay.** The ring fills and someone starts the machine: a hand-cranked contraption, crank-crank-clunk, laying sleepers and rails over 50 s. Sections 1 and 2 go the same way.
4. **The last section is laid.** The opening-day call goes out: a bell rings at the lighthouse, the departures-board sign says "OPENING DAY. All welcome. Free hat (there is no hat)", and a glow marks the platform by the lighthouse.
5. **Opening day.** Any player at the platform can start it with the Interact button, straight away, alone or not. Starting it rings the bell for a short countdown (about 10 s, so friends can run over), then a 40 s scripted ceremony:
   - The Boogler climbs the crate, declares himself mayor ("One to zero") and puts on the sash.
   - He gives a one-word speech: "Behold."
   - The steam wagon, already fired up, bursts the ribbon early and tows the bunting up the hill.
   - Physics props (the ribbon, the bunting, his top hat) do the comedy. No scripted outcome beyond that.
6. **Era 2.** Props swap over: bazaar stalls with bunting, the town hall crate with a top hat. The steam wagon runs on a timetable on the rails between the court and the lighthouse. The soapbox run opens on the lighthouse path.
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

- **The wagon's position is a pure function of time.** `wagonAt(tick)` in `src/sim/wagon.ts` returns the wagon's position along the laid rails, using integer distance along the route and stops with dwell times. It's the same on every tab, so there's no network traffic and no ownership. It's Lockstep without state, like `runAt`. Test: it's deterministic and covers only laid sections.
- **The render** is a brass steam wagon on rails with two crate trailers: puffs, a whistle at stops, the chuff rate tied to speed, soot on whoever rides up front.
- **Riding:**
  - stand on a trailer and you're carried, via a kinematic platform in Rapier;
  - the camera settles in;
  - you can look around while riding;
  - jump off at speed and you get a short tumble.

  No new control; the Interact button isn't needed either.
- **Feel targets:** no jolt on boarding, a clack and a little sway over the rail joints, slow enough to hop on and off.
- **Checks:**
  - a `/look` motion sheet of a ride;
  - a two-tab scenario: both tabs report the same wagon position for the same tick, with zero messages;
  - `npm run perf` before and after.

### S3. Opening day: anyone starts it, everyone watches (Cooperation is automatic; Telegraph everything)

- **Trigger.** Once the age's last section is laid, the platform offers "Start opening day" (Interact, through `registerInteractable`) to any player in reach, from the first moment, with no waiting and no head count. It submits an op, `open.start {}`, which the host validates (the last section is laid; opening day hasn't happened). The first valid op wins; later ones are rejected.
- **The scene.** A scripted run (`OPENING_DAY`: about 10 s of bell countdown, then about 40 s of ceremony) through `runAt`, so a late joiner sees the same moment. The comedy objects (the ribbon, bunting, the top hat) are Local physics props spawned by the run, so each tab's slapstick may differ a little. That's fine because they're cosmetic.
- **The Boogler's part.** He's a Host NPC, so the host walks him to the crate and plays his lines on the run's phases.
- **Files:**
  - `src/world/rules/opening.ts` (flag and op);
  - `src/features/opening-day.ts`;
  - the ceremony lines in The Boogler's line data.
- **Check:** a scenario where two tabs both see the run start at the same tick, and the era flips to 2 afterwards.

### S4. The mayor (Leave something for the next visitor)

- **What changes:** a mayor's sash on The Boogler, a "mayor" flag his lines can read, the town hall crate with a top hat as his spot, and new bark lines that mention the rails and the wagon.
- **What stays:** his personal friendship ladder, unchanged.
- **Files:** the Boogler's model, his lines, and `src/boogler/` brain hooks (he goes to the town hall at dusk).

### S5. One feel-first venue: the soapbox run (Toys before chores)

- **Rule:** race down the lighthouse path; the muddy shortcut is fastest.
- **Vehicles:** coconut-wheeled carts, Owner kind (feel numbers in [vehicles.md](vehicles.md), adapted to Rapier).
- **Feel:** drift sparks, dust, a time shown as a plank tally.
- **Rewards:** personal only (the era hat in S6). No prize pile and nothing shared.
- **The Puff Boost** (The Boogler launches you) comes later.
- **Files:** `src/features/soapbox.ts` plus its Owner vehicle.
- **Check:** a `/look` sheet of a run.

**Court ball is out of this slice.** Its design waits for the mini-games pass, along with whether venues ever feed the haul.

### S6. The era hat and the gags (Communal world, personal rewards)

- **The era hat.** Finish the soapbox run once and you get the castaway straw hat. Its era-2 version is a brass-goggled cap. It's Local (localStorage, keyed by pid) and shown through a presence field.
- **Gags, steps 1–2:**
  - Gary's soggy business card washes up at the camp in era 1;
  - a "Back in 5 minutes" sign on the dock appears in era 2;
  - Oyijon's first coconut letter (its contents wait on [the fourth melon](fourth-melon.md) writing session);
  - the speech goes from none (knocked off the crate) to one word.

### S7. Playtest and log (How we work)

- Two to four friends, one evening; log it with `/playtest-notes`.
- Answer the questions in section 1 before starting era 3.

## 5. Out of scope

- Eras 3 and later, iron sources, and new islands.
- The som shop and knacks.
- All other venues and mini-games, court ball included: they get their own design pass after the playtest.
- The mainland, the departures board as fast travel, and painted art in-engine.

## 6. Decisions (round 7)

1. **Prize piles: none.** Venues give personal rewards only, so the ball stays out of the economy. Court ball's design is deferred to the mini-games pass.
2. **Era naming:** the game keeps saying **the wood age**. "Castaway camp" stays a name for the look, not for the UI.
3. **Opening day:** any player can start it from the first moment, alone or not. The bell countdown gives others a few seconds to gather.
4. **Track:** rails from the start, as the machine already lays them.

Still open: the ending, and [the fourth melon](fourth-melon.md).
