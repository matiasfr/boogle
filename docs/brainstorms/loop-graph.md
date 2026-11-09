> **Status: building (approved, owner, 2026-11-09: "let's do all 3"; designer-reviewed). Open questions build on their recommended answers.**

# Loop graph

**Pitch.** The rail loop gets one machine-readable form. A typed graph lists every beat, gate, ability and bill of the production route with what it requires, what it costs and which in-world cue telegraphs it. A headless run plays that graph through the real rules in Node, with no browser or GPU. One trace table, keyed by graph node, compares the prediction, the bot and human sessions. Agents read about 200 lines instead of the plans plus a 2,075-line bot, and check a loop change in seconds instead of joining the bot queue (44 runs on one slot on 9 November). Internal tooling; serves **Telegraph everything** (7) and **Light tests, real playtests**.

Owner's words it answers (9 November, [playtests](../playtests.md)): the order played "was never demanded"; "nothing told him to fill the kiln"; "the flow bottleneck for the game is coming back for the 40 rails at far ahead".

**Gut question.** Before anyone plays a loop change, can an agent say which beat will grind and which has no cue, and be right when the owner plays it?

## Best suggestions

1. **One graph module that imports the layout constants** (systems). Bills, counts and positions come from `src/sim/railway-line-layout.ts`, `railway-line2-layout.ts` and `railway-works-layout.ts`; only `requires` and `cue` are typed by hand. A test fails on any rail action or mark name no node covers, so it cannot drift silently.
2. **The run is the judge, the solver proposes** (systems, design). A solver enumerates the orders the graph allows; each is played through `railApply` and `railTick`, behind the host's `railValid` reach check with a stub actor. An order the graph allows and the rules refuse is a graph bug, reported.
3. **Grind per beat** (design): carries × metres per node, for 1 to 4 players. Straight-line distance at first, labelled as such, then calibrated against walked distance from human sessions.
4. **Undemanded orders** (design): steps the rules accept in any order where the design names one. This is the boiler and station 6 slip.
5. **A cue per node, or it is listed** (creative). An empty cue is "nothing told him to fill the kiln". Cues are checked in the game, never filled from memory.
6. **Confusion ranked per beat** (creative): presses with nothing in reach, refusals, and prompts shown against pressed, which `dev/playtest/summary.ts` already counts, grouped by node.
7. **Generate the hand lists** (systems): `RAILWAY_BEATS` in `dev/playtest/beats.ts` and `BEATS`/`RAIL_STOPS` in `dev/look/segments.ts` derive from the graph. `RAILWAY_BEATS` already lacks the Works marks.

**Tension.** Requirements and cues cannot be derived, so part of the graph is authored and can be wrong. Recommendation: accept that, and let the coverage test and the run catch it.

## Shape

- **Sync:** none. Lives in `dev/`, imports `src/sim` read-only, no runtime import, no `WORLD_NS` risk.
- **Reuses:** `createRailwayWorld`, `railApply`, `railTick`; the `act`/`advance` helpers in `test/helpers/railway-q2.ts`, `railway-trains.ts` and `railway-works.ts`; `railValid` in `src/world/railway-server.ts`; `parseSession` and `summarize` in `dev/playtest/`; the bot's `session.jsonl`, already in the upload format; the marks in `src/adapters/railway-marks.ts`.
- **Builds, in order:**
  1. `dev/loop/graph.ts` and `npm run loop`: the graph, the solver, grind per beat, nodes with no cue, undemanded orders. The beat lists generated from it.
  2. `npm run loop -- run`: the headless run for 1 to 4 players, walk ticks from graph distances, cart and train time from the sim.
  3. `npm run loop -- trace`: one table per node for prediction, bot run and human session, with deltas and the confusion rank.
  4. Retire the headless ball and player runs (owner, 9 November: "vestigial").
- **Risks:** straight-line distance understates real walking (hook walkway, sea); ability gates are not in the sim and live only in the graph; refactoring test helpers touches tests; human sessions carry mark names, not node ids, so the map is by pattern and older sessions must still read.

## Done means

No browser: this is tooling with no player-visible change.

- `npm run loop` prints every node with its bill, distance and cue. On today's main it lists the kiln as prompt-only (no cue), reports station 6 before trains as a defect until the refusal rule lands, and names the largest grind, whichever node it is.
- `npm run loop -- run --players 2` finishes line 1, line 2 and the Works through the real rules in under ten seconds and prints time per node; a deliberately broken bill makes it report a softlock.
- `npm run loop -- trace <session>` on the 9 November sessions (`mw9papxp`, `mw9srqnz`) shows predicted, bot and human time per node, with a confusion rank per node. Which beats rank highest is a finding, not a pass test.
- A unit test fails when a rail action or mark has no node.
- `npm run check` passes with the ball and player runs gone.

## Open questions

1. Does "vestigial" also cover `npm run sim -- replay`, its golden recording and the `?record=1` recorder in the game? **Recommended: yes for replay and its recording (they compare player and ball physics); the recorder stays until you say, since it is game code.** Answer: the recommended option (owner, 2026-11-09).
2. Is straight-line distance good enough for the first grind numbers? **Recommended: yes, labelled, and calibrated against human sessions in build 3.** Answer: the recommended option (owner, 2026-11-09).
3. Should the trace reach you as a picture? **Recommended: a text table first; a strip chart on the Line Map board once the numbers are trusted.** Answer: the recommended option (owner, 2026-11-09).
4. Should a loop change have to pass `npm run loop -- run` before it ships? **Recommended: not yet; report it, and decide once it has caught something real.** Answer: the recommended option (owner, 2026-11-09).

## Parked

- An arrival sheet: one still per node from the approach, asserting its cue is in frame.
- Tunable sweeps through the headless run.
- Feeding the graph to the economy model in place of its own route inputs.
- The Boogler as a cue type once it gives directions.

## Design review (designer, 2026-11-09)

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| Q5 complete casts the boiler; the fit runs trains; Q6's kit (32 + 32) comes by train | Decided | decisions, 8 Nov (B5–B8) and 9 Nov ("Yes, boiler first") |
| Station 6 refuses hand logs, rails and forge rails until trains run | Decided | decisions, 9 Nov (station 6); [boiler-first-choice](../plans/boiler-first-choice.md) step 3, not yet on main |
| Q4 and Q5 take material before their gate; only funding and laying wait | Decided (free order) | decisions, 8 Nov, "fill a gated stretch" |
| Station 3: logs and beam in either order, any axe | Decided (free order) | decisions, 7 Nov, great beam |
| Works: slab → stall → cradle; throat before kiln; pier after Q6 | Decided | [split-rock-roundhouse](../plans/split-rock-roundhouse.md) |
| Q5's switch reached by hook pulls up Needle Bell | Decided | decisions, 8 Nov, hook shot |
| Cues: forge plume and gold motes at the cold boiler; the "Steam" card; frame shows a train | Decided (tag unbuilt) | decisions, 9 Nov; 5 Nov |
| Kiln cue: today only "Fill the kiln" to a loaded back within 4.1 m; the gold ghost is **proposed** | Default: record it as prompt-only | [works-signposting](works-signposting.md) |
| Grind for 1–4 players | Default: headline 1–3, the target | DESIGN.md |

**Findings that change the build**

1. **Each order edge carries a status and source:** `decided` (cite the entry), `free` (decided either order) or `unruled`. Only a `decided` edge the rules accept out of order is a defect (today: station 6 before trains, until step 3). `free` and `unruled` print as neutral facts; `unruled` goes on the owner's list. A blanket defect would flag the beam and gated-fill calls he chose.
2. **Each cue carries a kind and a state:** world or prompt-only; decided, on main or observed. Prompt-only reports as no cue (that catches the kiln); decided-but-unbuilt cues don't count.
3. **"Far Head's rails as the largest grind" presumes a fact.** No bill is the owner's 40 (Q5 24 + 24, Q6 32 + 32), and step 3 ends Q6's hand grind. Done means: it names the largest grind, whichever node.
4. **"Ranks station 6 and the boiler among the most confused"** is a hypothesis, not a pass condition; don't tune the scoring to make it true.
5. Home-station is proposed: encode today's Home, not layout B.

No owner questions; nothing here is direction or irreversible.
