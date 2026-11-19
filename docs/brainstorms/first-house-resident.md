> **Status: building (2026-11-19).** Light brainstorm (one pass, three lenses). Steps 1 to 3 on main (#2253); steps 4 and 5 on `claude/first-house-train-set`. Who moves in is
> decided: the retired engine driver ([entry](../decisions-characters.md#d-2026-11-19-first-house-resident)). His
> name, look, quirks and every line he says are the owner's
> ([11 November](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)): this brief
> writes no copy and no name. The build uses clearly marked placeholders, as the [boiler guide](boiler-guide.md) does.

# The first house's resident

**Seed** (backlog P1 "Home's town as the Round, first build", its next step): the first bought house gets its
resident, the retired engine driver, "with marked placeholder lines until he writes them; a short brief first (the
model-railway front room, what the player sees and when), then a build". The role comes from
[passenger-trade, section 6](passenger-trade.md#who-moves-in-roles-proposed-question-5): "a cottage whose front room
is filled by a model railway … the room's own lines as built so far … gains a piece when the route does". It is
Alternative B of the [first town as a lesson](first-town-lesson-review.md#alternatives) (F3: "the bought house has no
one in it").

## Pitch

Today the first bought house (trade plot 0, town slot `plot3` beside the hall, board "Plot 1") rises in 10 s and
stays a closed shell: `town.plot-house` is three solid boxes with no interior
(`src/content/prefabs/town-plot-house.ts`). Open its door and put the driver inside. The moment the build finishes, a
lamp comes on in the window, the door stands open, and his `…` shows to anyone within 24 m. Inside, his front room is
filled by a train set of the room's own railway: the stretches of line 1 and line 2 that are laid, little halt boards,
and the real trains running on it, read from the same shared state as the real ones. Each time the room lays a
stretch, the set gains it. It serves **DESIGN 11 (Show, don't tell)**: the board's "+1 rider / minute" becomes a
person with a lit window, and **7 (Telegraph everything)**: the line you are building, seen whole, in one room.

**Gut question:** When the first house finishes, does a player go to its door within a minute, and come out feeling
the house brought someone (and that the yard next door did not)?

## What the player sees, and when

| When | What | Source today |
| --- | --- | --- |
| Before the buy | Staked plot by the hall, board, gold ghost when the box can pay | `src/entities/town/plots.ts` |
| Hold to build | Little guys' construction beat, 10 s (`TRADE.buildTicks` 100) | `plots.ts` via `src/place/sites.ts` |
| **Build done (new)** | The house finishes with an open 2.6 m doorway (the rooms' `DOOR`) instead of a closed wall; a warm lamp comes on in the front window; the driver is already inside, beside his table, facing the door | `src/entities/town/rooms.ts`, `residents.ts` |
| **From the street (new)** | His `…` over his head at the one bubble anchor within 24 m ([owner call](../agents/owner-calls.md#npc-bubble)); through the open door, the table's green baseboard and a moving red train | `components/speech-cue/view.ts` |
| **Step in (new)** | Indoor cutaway and camera as in every room; he says his `hello` once (placeholder); `…` becomes Talk within reach | `rooms.ts`, `residents.ts` `bark`/`open` |
| **Inside (new)** | The train set: laid stretches on the real curves, a halt board at each laid halt, the trains moving. The newest stretch looks fresh (paint still bright) for a while after it is laid | new `src/entities/town/model-railway.ts` |
| **Later visits (new)** | A stretch laid since you last came is on the table; on your next visit he has one notice line about it (placeholder, keyed to the existing facts such as `pier`, `breaker`) | `town-lines.ts` `notice`, `residents.ts` |

What makes a player go to the door: the lit window and open door are the first change to a building they paid for,
right on the path from the hall; the `…` says someone is home; the moving train in the doorway rewards a look. No
HUD text.

## Best suggestions, ranked

1. **Open the house and let him be home when it finishes** (design, creative). The payoff of the town's first buy is
   a person behind a lit window, the day it stands, as already confirmed ("a bought house is walk-in from the day it
   stands", [batch 2](../decisions-rail.md#d-2026-11-16-batch2-bulk-confirmed)). Everything else builds on this.
2. **A train set, not a second map** (creative, systems). **The museum already has a live miniature of the whole
   place** with track, trains, buildings and you (`src/entities/town/museum.ts:1-8`), and Moss's lines are about it.
   The driver's table should read as a hobbyist's layout: track only, on a flat green baseboard, at a larger scale per
   metre than the museum's 1/120, with halt boards and the trains. Same reader, different thing. This is question 1.
3. **The next stretch in pencil** (design, creative). Unlaid stretches of the open line are drawn as faint pencil on
   the bare board, so the room shows where the line goes next (DESIGN 7). True information from `LINE1_STATIONS` and
   `LINE2_STATIONS`. Question 3, since the decision's words are "the lines built so far".
4. **One reader for both tables** (systems). `src/entities/town/view.ts:148-161` already yields the laid stretches
   (`rails()`) and samples the trains at 2 Hz for the museum. Lift both into one function the museum and the train set
   share, so the two can never disagree.
5. **His notices are the route's news** (design). The residents' `notice` per `Fact` (`town-lines.ts:8`) already
   fires once per player, newest first. The driver's placeholders sit on the rail facts, so a player coming home from
   the pier hears that it is on the table. Lines owner's.

**Tensions.** Moss's museum table versus the driver's: the brief recommends keeping both and making them different
things (suggestion 2), not moving the miniature. "Playtest before bespoke functionality"
([owner call](../agents/owner-calls.md#bespoke-hold)): this is a room, a resident and a view-only table, the same
class as D1 to D3 and the five residents, not a new mechanic.

## How it serves the town lesson

Lesson 4 (a house brings riders) and lesson 6 (a works building helps the line and brings no riders) are taught by
the board and the till today. With this build the two bought buildings side by side differ the way the rule does: the
house has a lit window, an open door and someone at home who cares about the railway; the yard (#2238) has a crane,
no door and nobody (review call 7, "No resident, interior or Talk at the yard"). The riders are the driver's
neighbours. Not verified in code: whether little guys walk out of the bought house's door to the platform (confirmed
as a rule in batch 2; I found no code path that does it for plot 0). If they do not, that is a later step, not this
build's.

## Shape

- **Sync kind:** Local presentation over the Server-replicated railway mirror ([sync](../agents/sync.md)). It reads
  `Plot` row 0 (`at`), the `Job` and `QJob` completions and the trains' engine poses, all already in `TownLook`
  (`town-read.ts`) or `inspectRailway()`. **No new op, wire shape, save field or `WORLD_NS` bump.** Talk memory stays
  the residents' local memory (`memory.ts`). I found no step that needs shared state.
- **Reuses:** the rooms system (doorway, cutaway, indoor camera, the 48 m draw radius, clearance through `sites.ts`),
  as D1 opened the gate cottage; the `house` kit, whose 7.4 × 7.4 footprint is the slot's (`town-plan.ts:35`); the
  residents' `CAST`, Talk, `hello` bark and `notice`; the museum's table code (`bits`, `drawRail`) and its reader.
- **Risks:** (a) the bought house is built by `plots.ts`'s own site, while walk-in rooms are built by `rooms.ts` from a
  fixed `RoomId` set; two owners of one building would double-draw it. Recommended: plot 0 becomes a room
  (`ROOM_PLOTS` gains its slot, `env.up` reads `Plot` 0 built), and `plots.ts` keeps its board, ghost and stakes for
  it but no longer draws its shell. `rooms.ts:404-408` already raises a room with a construction beat when `up` turns
  true; the builder confirms the beat and timing match `TRADE.buildTicks` and that `town-b2` evals still pass.
  (b) Naming: trade plot 0 is town slot `plot3` and board "Plot 1". (c) The table must leave the door lane and his spot
  clear and stay off the Talk reach of anything else. (d) Performance: redraw only while `near` is visible, at 10 Hz,
  as the museum does.

## Smallest first build (numbered; each step one commit, one proof)

All five steps are **view-only**: `src/entities/town`, `src/place`, `src/content`, `dev/look/evals`. None touches
`src/sim`, `src/world`, `src/net` or `server/`, so no planner is needed. The only step that could need one is the
optional later-stage seed in step 5.

1. **Open the first bought house. View-only.** Plot 0's building becomes a walk-in room on the `house` kit at its
   `townBuilding('plot3')` pose, up when `Plot` 0's `at >= 0` and the build has run; `plots.ts` stops drawing its
   closed shell and hull for that plot only (the yard unchanged). Files: `src/place/layout.ts` (`RoomId`,
   `ROOM_PLOTS`), `src/entities/town/rooms.ts`, `plots.ts`, `view.ts` (`env.up`), a `room-plot` level in
   `content/`. Proof: `npm run look -- --rail-seed house-built`, camera from the hall side at eye height, the open
   doorway in frame; then walking in, the cutaway working. `town-b2` eval at `house-ready` still shows the beat.
2. **The lamp in the window. View-only.** A warm window light on the room's `outside` group, on once the room is up.
   Files: `rooms.ts` or a small dressing in `src/entities/town/`. Proof: the same seed, a dusk still if the sky
   allows, else a day still where the window reads warm.
3. **The driver, with placeholder lines. View-only.** A sixth `ResidentId` (code id only, e.g. `driver`), a `CAST`
   spot at the back of the front room beside the table, facing the door, his own colour and voice from the existing
   kit; a `RESIDENTS` entry whose `name`, `intro`, `hello`, `ordinary`, `notice`, `asks` and `rumour` are each a
   marked placeholder saying what the line must do (for example `[owner's line: says hello and points at the table]`).
   Files: `src/entities/town/residents.ts`, `town-lines.ts`. Proof: `--rail-seed house-built`, player at the door:
   `…` from 20 m, Talk within reach, the placeholder card open.
4. **[x] The train set. View-only.** (Built: a 1.8 × 2.8 m board at 1:250, laid stretches only; [place](../game-design/place.md#the-town-you-can-go-into).) `src/entities/town/model-railway.ts`: a baseboard of about 3 × 2 m in the front room,
   laid stretches of line 1 and line 2 on their real curves, fitted to the lines' extent; a halt board at each laid
   halt; the trains from the shared sample; the newest stretch bright for a while after its completion tick (the same
   for every player). The reader is lifted from `view.ts` and shared with the museum (suggestion 4). Proof: an eval
   inside the house at `house-built` reading the table's drawn bit count, and a still over his shoulder; then the same
   at `yard-built`, where both tables show the same laid stretches.
5. **[x] The update, proven. View-only.** (Built in `test/town-plot-projection.test.ts`.) A unit test over the shared reader: two worlds, one with a later stretch laid,
   yield different stretches, and the table's bit count rises. A live look of a stretch appearing would need a seed
   with the house built and a later line stage, which is a new stage in `src/sim/railway-seed-trade.ts`: that one
   touches `src/sim` and should go through a planner, so it is left out of the first build.

Pencil stretches (suggestion 3) and the driver's rail notices (suggestion 5) ride on steps 4 and 3 if question 3 and
4 hold on their recommendations.

## Done means

- At `--rail-seed house-built`, from the hall at eye height: the house has an open door and a lit window, his `…` is
  visible, and the moving train shows through the doorway.
- Inside: the table is clear of the door lane, the driver stands beside it, Talk opens a card whose every line is a
  visible placeholder.
- The table's laid stretches match the real ones at `house-built` and `yard-built` (an eval reads both); the unit test
  shows a new stretch appear. The museum's table is unchanged.
- The yard still has no door and no resident.

## Open questions

1. **The museum already has a live miniature of the whole place. What is the driver's table?** Recommended: a train
   set of the railway only (track, halts, trains, green baseboard, bigger scale), the museum keeps its miniature.
   Alternatives: move the miniature here and leave the museum the specimen (changes Moss's lines, yours), or the same
   table twice. Answer: ___
2. **How does he arrive?** Recommended: in the first build he is simply home when the house finishes, lamp on.
   Later: he arrives on the next train with a trunk and walks to his door (passenger-trade section 1). Answer: ___
3. **Does the table show the next stretch in pencil?** Recommended: yes, the open line's next stretch only, so the
   room sees where it is going. Or only what is laid, as the decision's words say. Answer: ___
4. **His lines.** The brief says what each must do (greet and point at the table; one ordinary line or two; a notice
   per rail fact; an answer to "The Boogler?" like the others'). Recommended: build with marked placeholders until
   you write them and name him. Answer: ___
5. **Does he ever come out?** Recommended: no, he stays in his front room in this build. Later: he watches from his
   doorstep when a train passes the hall. Answer: ___

## Lines for the owner (none edited)

- Moss's museum lines are about a model on a table and may overlap with the driver's: "That's the whole place, so
  far. We add to it when you do." (`src/entities/town/town-lines.ts:127`), the `path`, `trains`, `town` and `pier`
  notices (`:131`, `:135`, `:136`, `:138`). They stay true under question 1's recommendation.
- `town` notices ("New neighbours. All employed. I checked.", `town-lines.ts:54`, and the others at `:86`, `:136`,
  `:168`) fire when a rider-bearing house is counted, the same moment the driver moves in. True as written; you may
  want one to nod at him.
- The Boogler: no line of his mentions the house, a driver or a model (grep of `src/boogler/lines.ts`).

## Parked

- He arrives by train with a trunk and walks to his door (question 2).
- A toy on the table: a button that toots the little train (Local, optional fun, DESIGN 2).
- Little guys leaving his door for the platform, if not built (batch-2 rule).
- Later lines (Ring Island and beyond) on the table as their rows exist.
- The baker and the lost-property keeper in the next houses, on the same room pattern.

## Design review (2026-11-19)

Run on this brief by its author, reread from the top. Read: DESIGN.md, owner-calls (npc-bubble, bespoke-hold), the
characters Current rules and the two entries above, the batch-2 confirmations, the lesson review, passenger-trade
sections 1 and 6, and the code named above. Not run: a look (no browser in this job), the level tools, the playtest
CLI.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The first bought house's resident is the retired engine driver, placeholder lines | Decided | [19 November](../decisions-characters.md#d-2026-11-19-first-house-resident) |
| 2 | Name, quirks and lines are the owner's; marked placeholders | Decided | [11 November](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s) |
| 3 | The bought house is walk-in from the day it stands | Decided | [batch 2](../decisions-rail.md#d-2026-11-16-batch2-bulk-confirmed) (archive row of 10 November) |
| 4 | His `…` and Talk use the one bubble, shown within 24 m | Decided | [npc-bubble](../agents/owner-calls.md#npc-bubble), [18 November](../decisions-characters.md#d-2026-11-18-decisions-page-characters) |
| 5 | He is home the moment the build finishes; no arrival by train in the first build | Default | Cheapest true version; question 2 |
| 6 | A lamp in the window comes on when he moves in | Default | Passenger-trade section 1; cheap to drop |
| 7 | He stands at the back of the front room beside the table, facing the door, and never leaves it | Default | Residents' fixed-spot rule (`residents.ts:49`); question 5 |
| 8 | The table is a railway-only train set, distinct from the museum's miniature | New | Recommend yes: two tables showing the same map would make the second room a repeat; question 1 |
| 9 | Unlaid next stretch drawn in pencil | New | Recommend yes (DESIGN 7); bends "lines built so far"; question 3 |
| 10 | The newest stretch looks fresh for a while after its completion tick | Default | Shows what changed (DESIGN 11); length a tunable |
| 11 | His notices key on the existing rail facts, once per player | Default | Residents' notice rule; lines owner's |
| 12 | Baseboard about 3 × 2 m, scale fitted to the lines' extent | Default | Fits a 7.4 m room with the door lane clear; builder measures |

**Findings.** F1: the museum's miniature already does most of what section 6 described; the brief changed suggestion
2 and added question 1 for it, rather than build a duplicate. F2: the bought house is a closed shell built outside
the rooms system; step 1 names the merge and its risk. F3: riders leaving his door is a confirmed rule with no code I
found; listed under the lesson and Parked, not added to this build. **Level design:** the house keeps its slot and
footprint; the one change to the space is an open door. Which side it opens on follows the `house` kit's +z at the
slot's yaw (−90°); I did not check that it faces the hall and the board, and the builder confirms it in step 1's
still (the walk from the hall is a few metres, not measured). No route, gate or reach changes; rules 1 to 3 are untouched. Not
seen: any still of the house, two players inside at once, phone width. **Co-op:** both players see the same table
(shared reader, completion ticks), each hears his lines once on their own; a friend arriving late finds him home.
**Solo:** unchanged. Calls 5 to 12 are logged in [agent-calls](../agent-calls.md) (characters, open).
