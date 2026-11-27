> **27 November 2026.** Written by an orchestrator session with the owner in the conversation, against main `5c4ab2023` (world v75). He asked for an outside critique of the game, agreed with all of it, and said: "I want you to make a plan and alter the course of the development of the game accordingly." This is that plan. The decisions it rests on are recorded ([game](../decisions-core-loop.md#d-2026-11-27-course-change), [flow](../decisions-process.md#d-2026-11-27-flow-one-pass-then-refine)); the review of why work has been slow is its [own report](../reports/why-slow-2026-11-27.md). Nothing here waits for the owner; the [questions at the end](#open-questions) are answered or proceed.

# Course change: a railway a guest can join in two minutes

## The problem this answers

Playtesters love dropping in: the movement, the chopping, the hook and glider, the trains, the hats. They do not know how to progress, so the owner does the progression while they play around. The critique's reading of why:

- **One critical path, no guidance.** Exactly one step advances the room at any moment. It is usually far away, and the objective was taken off the screen on 3 November.
- **Every step has its own rule.** The great beam, the boiler, footings, the cradle, the table: learning one does not teach the next. The owner's own sessions stalled at the kiln, the cradle and after the finale.
- **A guest cannot read the room.** No board, map or log says where the room is or what it needs.
- **A guest cannot help from where they stand.** Useful work happens only at the frontier.
- **Towns grow as a counter.** A house gives "+1 rider / minute"; plots come in a fixed order.
- **Friends are spare hands.** Two players finish the route in 110 minutes against 120 solo.
- **The toys people hang out with are 800 m away,** and the railway's server refuses most of what they do.

## The shape, decided

1. **The rail is one guided line that closes into a ring.** No forks, no new order picks, no new economy trades. The room always knows where the work is.
2. **Towns are where choice and hanging out live.** Every building adds something to do. The room picks what goes on a plot. The toys move to town.
3. **Any work anywhere counts.** What a guest gathers near where they landed reaches the works by train, and the board thanks them by name.
4. **One grammar for every step.** A step shows what it needs, how far along it is and what it gives, in the same form everywhere.
5. **The whole map stays, as a ring.** The owner: "I do wish that the map could be kind of complete... maybe it should form a circle or we should change the geography of the island so that they're closer together." The greybox already reaches the ending and the lap closes it. Geography is judged by ride minutes and changed only where that number fails.

**Serves** DESIGN.md's core loop, 7 (Telegraph everything), 8 (Enjoyable alone and together, changed today to put the drop-in guest first) and 11 (Show, don't tell, changed today: where the work is, is always shown).

## The checkpoint: a guest helps in two minutes

Replaces "the route to the ending" (25 November), which is met but for his play. Done when:

1. **Lane A** steps 1 to 3 are on main: the works signal, the station board, the train to the works.
2. **Lane B**'s first build is on main: logs given at Home reach the works without the giver going there.
3. **Lane C**'s first build is on main: one town building that adds something to do, with the ball in town.
4. **The lap** is on main and the ride-minutes table exists.
5. **The measure reads.** `first contribution` is in the playdata, and the report shows it for every fresh session.
6. He watches a guest play without leading them. Nothing waits for that; the target it adjusts is a median under 120 seconds from landing to first accepted contribution, and a guest who can say what the room is building.

## Lane A: know where the work is

Goal: from anywhere, with no words read, a player can see where the room's work is and get there.

| Step | What | Kind | Proof |
| --- | --- | --- | --- |
| A0 | **One query for the room's works.** Today the next step is worked out in each view and only written to the play record (`LEG_OBJECTIVES`, `STEEL_OBJECTIVES` in `src/entities/route-greybox/leg-view.ts`, and the Home route's own). Make one pure read over accepted railway state: the site, its place, what it still needs, what it gives | A pure query beside the railway's other queries; no state, wire or save change; planner first because it sits in `src/sim` | Unit test over the existing stage seeds: every seed names one site |
| A1 | **The works signal.** A tall plume and pennant at that site, seen from anywhere in the room, in the forge call's steam so it reads as the same language | View only | One look from Home's dock and one from Ring Island |
| A2 | **The station board.** At Home's hall and every halt: the works' name, its needs as the bills' own icons with counts, what it gives, and the names of who gave. Also the first thing in Pause | View only | One look at phone width |
| A3 | **The train to the works.** Home's departures name which train stops nearest the works, and its engine wears the same pennant. A fresh player, a late joiner and a reload stand facing the board | View only; the landing's facing is a placement change | One look; a fresh bot reaches the works from the dock using only what the board names |
| A4 | **One grammar.** List every step type on the route (bill, great beam, boiler, footing, cradle, table, kiln, plug, barrier, gate, key). Each appears on the board as needs and gives. A step that cannot be said that way is changed or cut, one design review for the list | Design first, then view work | The list, with each step's board line |

Phase guides ([brief](../brainstorms/phase-guides.md)): wave 1 lands as characters to discover, and a guide may point. They are no longer the answer to direction, so no further wave is built as one.

**Reverses** the 3 November "no objective text box, beacon or arrow" in this form only: a thing in the world and a board at stations. There is still no screen-edge arrow or quest text over play.

## Lane B: any work anywhere counts

Goal: a guest who chops the nearest tree and gives the logs at the nearest station has advanced the room, and sees their name.

New gameplay, so it starts with `/brainstorm` (owner call "Brainstorm new gameplay first"), one pass. The brief answers: where a gift goes in (a gift rack at every halt), what carries it (the kit train already carries a works' kit; [cargo trains](cargo-trains.md) and the [halt yard](halt-yard.md) are planned carriers), how it shows on the board, and what a guest can give when the works wants something they cannot make (rails, footings). Then the planner (`src/sim`), then one build pass. Thanks stay unranked ([Thanks](../decisions-core-loop.md#d-2026-11-02-thanks)).

## Lane C: towns are the hangout

Goal: a returning friend finds something new to play with in town, and the room chose it.

New gameplay and a big new area, so `/brainstorm --panel`. The brief answers: a catalogue of buildings where each one adds a thing to do; how the room picks what goes on a plot; which existing toys move first. First build, small on purpose: the beach ball and a court on the Round's green (the ball is Owner state and needs no new server rule), and the first bought house offering a pick between two buildings. The frisbee, throwing and the seed stand need the railway's server to accept their edits, which is the planner's second step. The [Round](town-layout.md) is the ground this stands on.

## The map

- **The lap ships** ([greybox-lap](greybox-lap.md), in flight): the ring closes at High Gorge.
- **A ride-minutes table,** from the line catalog: minutes from Home to every town each way round, at each boiler fit. One small dev script and a table in the lap's report.
- **The rule for geography (a New call):** once the ring is closed, no town is more than four minutes from Home by the shorter way at the first fit. Where the table fails that, the line is shortened or sped up in one layout pass, on the 2D page first.
- **Geometry is then frozen.** Route geometry changes only in a batched layout pass, never as a single finding.
- **Leaving greybox** ([greybox-look](greybox-look.md)) continues one area at a time, each area one pass.

## Parked by this plan

Each is `parked by owner` in the backlog, on his "I agree with all of your feedback". Running jobs finish; nothing new starts.

| Effort | Why |
| --- | --- |
| Garage choices past the Port Quay checkpoint; the Quick or Strong trade | The trade measured hollow on the lines as built; choice moves to the towns |
| Order picks and felt inflation | Built; no new picks on the rail |
| Turnouts, the railhead traveller's owed sounds | Polish on a route guests do not yet read |
| Cargo trains as their own effort | Lane B's brief decides whether they are its carrier |
| The six-hour target | Length is what the ring takes to build. No bill grows to fill time |

## How this is run

The [flow decision](../decisions-process.md#d-2026-11-27-flow-one-pass-then-refine) in practice:

- **Three lanes, three builders.** A, B and C touch different files (views; `src/sim` trade and kit; the town). The lap and the measure are the fourth and fifth jobs. Other slots stay on P2 rows that share no file.
- **One pass each.** A1 to A3 are one branch after A0. Lane B's rules are one branch. Each gets one proof look and, where `review-stamp` asks, one review.
- **The measure first.** `first contribution` goes in before the lanes land, so the before and after are both on record.

## The measure

A playdata mark, `first contribution`: the first time this player's deposit, gift or lay is accepted, in seconds from standing up at the landing. Reported by `npm run loop -- trace` for every session that began with the fall. The playtest kit gains one instruction for the owner (do not lead) and two questions for the guest at five minutes: what is the room building, and what could you do to help.

## Design review (27 November 2026)

| # | Call | Kind |
| --- | --- | --- |
| 1 | The rail is linear and guided; choice lives in towns; any work counts; one grammar; the map stays as a ring | Decided (owner, 27 November) |
| 2 | The objective returns as a signal in the world and a station board | Decided (the critique he agreed with) |
| 3 | The six-hour target stops driving scope | Decided (the critique he agreed with; the orchestrator's reading of "question the six-hour target") |
| 4 | Target: median under 120 s from landing to first accepted contribution | New |
| 5 | No town more than four minutes from Home by the shorter way at the first fit | New |
| 6 | The signal is a plume and pennant in the forge call's steam | Default |
| 7 | Lane C's first build is the ball court and one two-way pick | Default |

Calls 4 to 7 are logged in [agent-calls](../agent-calls.md) and proceed.

## Open questions

Each proceeds on its recommendation unless it says it waits.

1. ~~Does a docs-only merge stop reloading open pages?~~ Yes (owner, 27 November, [entry](../decisions-process.md#d-2026-11-27-docs-merges-reload-nobody-daily-wipe)): the build id names the newest code commit.
2. ~~World bumps batched to one a week?~~ Daily, and only with nobody on the server, checked again in 30 to 60 minutes otherwise (owner, 27 November, same entry).
3. **The words on the board** ("The works", "Needs", "Gives", "Thanks") are placeholders for his words. The build proceeds with them.

## Suspect or placeholder lines

None of The Boogler's copy is touched. The forge foreman's lines read `owner's line: …` in [`forge-guide.ts`](../../src/entities/railway/forge-guide.ts) and, by a reading of the code and not a look at the running game, are shown to players as written. The flow decision's rule 6 covers them.
