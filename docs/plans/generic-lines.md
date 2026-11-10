> **Status: plan for review (2026-11-10).** Nothing built. Written on top of v25 (request stops,
> `ship/matias-franco-15a4214`, shipping now); every line number and shape below is v25's. Recommended sequencing:
> **generic lines and the second tracks ship as `WORLD_NS` v26; Ring Island build 1 follows as v27, on top.**

# Generic lines: data-driven lines, double track, many trains

**Goal.** Make a line a row of data in the sim, not an index 0 or 1, and run more than one train on it: each line has
two tracks, one per direction, trains turn back at the ends, and a spacing rule keeps them apart. Today's lines 1 and 2
get their second tracks in the same `WORLD_NS` bump, and line 2 gets a second train. Serves DESIGN.md's core loop ("the
rail builds the world": every later area becomes one more catalog row, built from line 1 and line 2's components) and
**7. Telegraph everything** / **11. Show, don't tell** (a train you can see coming on your side, a second one already
on its way). It bends nothing; one decision's wording (two handles a lever) is superseded, see open question 3.

**Read for this.** [decisions](../decisions.md#decided), 10 November: "the railway is double track", "block out the
whole map", Ring Island, "trains stop on request", the late game's five answers (two-handled levers);
[world-blockout](world-blockout.md), "What a generic data-driven line needs from the sim", "Double track" and "Rulings
(10 November)" (the 4% grade, conflict 11's widened bents); [ring-island](../brainstorms/ring-island.md), "Shape" and
build 1; [works-late-game](works-late-game.md), step 1 (request stops); the v25 sim (`src/sim/railway-train.ts`,
`railway-systems.ts`'s `rail.call`, `serviceOf`, `replan`, `trainStep`, `railway-world.ts`'s `Train`,
`src/world/railway-server.ts`'s `nearTrain`); [sync](../agents/sync.md), [room-safety](../agents/room-safety.md),
[mixed-builds](../agents/mixed-builds.md), [lockstep](../agents/lockstep.md).

**Research.** [rail-network-depth](../research/rail-network-depth.md): uses its recommendation 2 (junctions as safe
authored constructions with automatic signals) and its "the railway runs itself, no dispatching job": spacing here is
automatic block signals, no player ever routes a train. [train-riding](../research/train-riding.md) recommendation 6
("a ride must be leavable at any moment and easy to catch again"): a second train halves the wait. The playtests agree:
"felt at the whims of if a train happened to show up" (round 5) and "lots of trains running: there was life happening"
(round 4). [train-ride-feel](../research/train-ride-feel.md): 20 m/s stays the cruise. Departs from nothing.

**Not in this plan.** The future lines' own rows (each arrives with its area's build), through-running between lines,
signals or switches a player operates, the express ladder (speed stays per line, 20 m/s), and the turning loop's sim
(first needed at Ring Island's halt, v27; see "Turnbacks").

## The state shape

The railway is **Server-kind** state (since v14, R1a: `src/world/railway-server.ts` applies, `railway-replicate.ts`
sends changed components, the adapter mirrors). Nothing here is lockstep: there are no `src/world/rules/` files, no
`edits` generators and no `Rules` entry. The sim is still in `LOCKSTEP_FILES` (`src/sim/`), so its math follows
[lockstep](../agents/lockstep.md): integer centimetres and ticks, `+ - * /`, `Math.sqrt`, `floor`/`ceil`/`round`, no
trig, no wall clock. Authority: the server, for every row below. Cosmetic (Local): every pose, the lateral offset onto a
track, turnout curves, the platform you see, sounds.

### 1. Line ids and the catalog

New `src/sim/railway-lines.ts` (pure, no imports but `./railway-works-layout.ts`), the only place a line is defined:

```ts
export type RailEndKind = 'stub' | 'crossover' | 'loop';
/** Where a line turns back: a stub (the two tracks merge into one terminal track at `mergeCm`), a crossover (a facing
 * crossover at `mergeCm`, used while this halt is the open end), or (v27+) a balloon loop of `loopCm`. */
export type RailEnd = { kind: RailEndKind; mergeCm: number; loopCm?: number };
export type RailPlatform = { x: number; z: number; y: number; reach: number }; // world cm, as LINE_HALTS
export type RailHalt = {
  name: string;
  s: number; //            cm along the line where a train stands (today's TRAIN_STOPS entry)
  opens: number; //        the QJob slot whose completion opens it; -1 open from the start (the pier: 5, Q6)
  /** [up, down]: the platform a train going +s (track 0) and -s (track 1) stands at; an end halt's two are equal. */
  platforms: readonly [RailPlatform, RailPlatform];
  /** Set on a halt that can be the line's open end: how it turns trains back. */
  end?: RailEnd;
};
export type RailLineDef = {
  id: string; //           'line1', 'line2'; stable, never reused
  name: string;
  path: readonly number[]; // x, z world cm every 10 m (today's PATHS in railway-line-path.ts, moved here)
  halts: readonly RailHalt[]; // in s order
  trains: number; //       how many trains run on it
  speed: number; //        cm a tick (TRAIN.speed today: 200)
  accel: number; //        cm a tick² (TRAIN.accel today: 3.5)
};
export const RAIL_LINES: readonly RailLineDef[];       // [line1, line2]: catalog order is the line index
export const RAIL_TRAINS: readonly { line: number; home: number }[]; // derived: one entry per train, line order
export const RAIL_HALTS: readonly (RailHalt & { line: number; stop: number })[]; // derived flat list: the halt id
```

- **Any number of lines and halts.** A line's index is its catalog position; a halt's id (`rail.call`'s `id`) is its
  position in `RAIL_HALTS`, which for v26 is exactly v25's `LINE_HALTS` order (Village, Camp, Village line 2, Quarry,
  Far Head, Pier). A train's `slot` is its position in `RAIL_TRAINS`. All three are fixed by catalog order, so
  registration and replication stay deterministic; reordering is a `WORLD_NS` break.
- **v25's tables become views of the catalog**, so callers keep working while they migrate: `TRAIN_STOPS[l]` =
  `RAIL_LINES[l].halts.map((h) => h.s)`, `LINE_HALTS` = `RAIL_HALTS`, `trainStopsOf(line, laid)` = the halts whose
  `opens` slot is complete (generalising v25's `BEFORE_PIER`), `railLinePoint(line, cm)` reads `RAIL_LINES[line].path`.
- **Per-line speed.** `profile`, `trainLegTicks`, `trainLegAlong`, `trainLegSpeed` and `reachable` in
  `railway-train.ts` take a `{ speed, accel }` (default `TRAIN`), and every caller passes the line's. The longer boiler
  (Ring Island build 2) changes line 2's `speed` only.
- **Future lines.** `src/sickle/world-lines.ts` keeps the eight future lines as client data. Each area's build moves
  its row into `RAIL_LINES` in its own bump (Ring Island v27 appends the `ring` halts to line 2's row, which is what
  `extends: 1` means). Not installing them now is open question 2.

### 2. Two tracks per line, one direction each

Every line has track 0 (**up**: +s, away from Home) and track 1 (**down**: −s, towards Home). **Left-hand running**,
as the blockout's greybox rides: the new track is laid 4 m to the left of today's (the blockout's chosen side for both
lines), so today's track becomes track 1 (down) and the new one track 0 (up). Today's platforms, all on the right of
today's track except the two Village ones and the pier, keep serving the down track; the up track gets new platforms
outside it (Level findings).

In the sim a track is only a direction: `s` stays the line's centreline cm for both, and the 4 m is the view's lateral
offset. The row stores `track` instead of v25's `sweep` (`sweep = track ? -1 : 1` wherever a sign is needed).

**The circuit.** For ordering and spacing only, `circuitCm(line, open, track, s)` maps a train to one number around
its line: up track `c = s − s0`, down track `c = 2·(sEnd − s0) − (s − s0)`, where `s0`/`sEnd` are the open ends' stops
and `C = 2·(sEnd − s0)` (a stub or crossover turns in place, so it adds no length). Pure and recomputed from the open
halts each decision. Positions are never stored as `c`, so opening the pier (which moves `sEnd`) can't move a train:
the pose still reads only `track`, `from`, `v0`, `dest` and `depart`, as v25's comment on `dest` intends.

### 3. Trains as a list, each with its own leg row

`Train` (`src/sim/railway-world.ts`) stays one component keyed by `slot`, now one row per `RAIL_TRAINS` entry
(3 in v26: line 1's one, line 2's two). Fields, v25's with two changes:

| Field | Type | Meaning |
| --- | --- | --- |
| `slot` | int | position in `RAIL_TRAINS` (its line is `RAIL_TRAINS[slot].line`, never stored) |
| `phase` | u8 | `STAND` / `RUN` |
| `at`, `to` | int | halt index on its line it stands at or last left / its leg ends at; **−1 a signal** (below) |
| `track` | u8 | **new**, replaces `sweep`: 0 up, 1 down; standing at an end, the track it leaves on |
| `depart`, `from`, `v0`, `dest` | int | v25's leg: start tick, start cm, start speed, end cm |
| `req` | int | **its riders' asks only** (v25's digit encoding, `reqIndex(stop, dir, n)`, unchanged) |
| `logs`, `rails`, `wagon`, `foot` | int/bool | cargo, per train (the kit and the footing wagon ride one train each) |

New component **`Line`** (kind `'line'`, keyed by `slot` = line index, replicated, one row per `RAIL_LINES` entry):

| Field | Type | Meaning |
| --- | --- | --- |
| `slot` | int | line index |
| `req` | int | **the halts' lever asks** on this line, same digits as `Train.req` |
| `left0`, `left1` | int | tick a train last left the start end / the far end (−1 never), for the headway hold |

The read model (`railwayView`) gains `trains: RailTrain[]` (by slot, each with `line`) and `lines: { req, left0, left1 }[]`,
and loses `line2.train`; a helper `railTrainsOf(s, line)` replaces every `line2.train[k]` read. `railwayCheck` counts
`[Train, RAIL_TRAINS.length]` and `[Line, RAIL_LINES.length]` and adds `[Line]` to `ARCHETYPES`.

**Starting.** `rail.boilerFit` (v25: all trains wake at the fit) places each line's trains spread round its circuit:
train `k` of a line of `n` at the open halt nearest `c = k·C/n`, standing, on the track whose way out is inward; for
line 2 that is the Village (up) and Far Head (down, its end until the pier opens). They wake together after
`TRAIN.wakeTicks`.

### 4. Spacing: block signals in integer cm and ticks

Two rules, both checked whenever a train plans a leg (leaving a stop, or `replan` mid-run), never per frame:

- **The block rule (safety).** A train may plan a leg only to a `dest` whose circuit position is at least
  `TRAIN.sepCm` behind the circuit position of the train ahead of it on its line, measured now. `sepCm = 2740`: the
  train's length (`RIDER_SPAN` 740, the footing wagon's tail) plus 20 m. The train ahead only moves forward round the
  circuit, so a gap that holds at planning time holds for the whole leg; `replan` may only shorten a leg that has a
  reason (as v25), and may now **lengthen** a leg that ends at a stop with no reason (a hold), from its pose now, when
  the train ahead has moved on. Nobody overtakes, so "the train ahead" is just the next in circuit order.
- **End blocks (the turnback reservation).** Each open end's stub or crossover is one block from its `mergeCm` to the
  end stop, both tracks: a train may plan a leg into an end block only while no other train of its line is in it. A
  train that can't enter waits at the block's **signal**, a stop with no halt (`at`/`to` = −1) 1000 cm outside
  `mergeCm` on the inbound track, or at a halt short of it. The far end's block uses `RailHalt.end` of the line's last
  open halt, so line 2's moves from Far Head's crossover to the pier's stub when Q6 opens the pier.
- **The headway hold (spreading, so trains don't bunch).** A train standing at an end leaves no earlier than
  `left + headTicks`, where `left` is that end's `Line.left0/left1` and
  `headTicks = floor(cycleTicks · TRAIN.headPct / (100 · trains))`, `cycleTicks` the non-stop round trip from the
  catalog (two `trainLegTicks` end to end plus two `dwellTicks`) and `TRAIN.headPct = 75`. A line with one train has no
  hold. Line 2: about 92 s a cycle to the pier, so a train leaves an end at most every 35 s (before the pier: 72 s and
  27 s).

A train held by any of these stands at a stop with its doors open (anyone can board), shows the hold on its lamp
(view), and leaves the tick the block clears. No player action affects spacing.

### 5. Turnbacks: crossovers and loops at line ends

Trains stop at both ends of their line (v25 already does), dwell `TRAIN.dwellTicks`, and leave on the other track: at
a stub the two tracks merge into one terminal track before the end halt and the train reverses out of it (push-pull,
as today's trains already run back); at a crossover the inbound train crosses to the end platform's track before it
stands. In the sim both are the same: an end block and a flip of `track` at the end stop. The catalog's kind tells the
view what to draw.

**v25's early turn-back (LOOK) goes.** With one track a direction and turnouts only at the ends, a train can't turn
back mid-line, so `trainWayOut` and the "farthest asked the other way" branch of `trainNextStop` are deleted: a train's
direction is its track, and it always runs end to end. Two trains on line 2 replace what LOOK bought (open question 1
weighs this).

**Loops.** No end of lines 1 and 2 has room for one (measured below), so v26 ships none. The shape already allows it:
`RailEnd.kind = 'loop'` with `loopCm`, and a train on a loop is a leg on a pseudo-track 2 (far end) or 3 (start end)
whose `from`/`dest` are cm round the loop, with the loop's length added to `C`. That code, its tests and its view land
with the first loop, Ring Island's halt in v27, where the island has room and the brief's "reverse pull-out" becomes a
loop.

### 6. Junctions between lines

Walk-between platforms only (blockout, "Junctions"; ruling 6): two lines that meet share no track and no rows; a
junction is a catalog fact for the boards, `RAIL_JUNCTIONS: { name, halts: number[] }[]` (v26: the Village, halts 0
and 2). No through-running, no shared block, no transfer rule. The halt boards' island map draws every line's trains.

### 7. Request stops with several trains

Two kinds of ask, kept apart so neither can be stolen:

- **A lever ask** (`rail.call { id, dir }`, from a platform): sets the digit for `(halt, dir)` in that line's
  `Line.req`. It is served by **the next train in that direction that can still brake for it**:
  `trainServes(w, line, stop, dir, tick)` returns the train with the smallest circuit distance to that stop's circuit
  position whose braking distance at its speed now (`v²/(2·accel)`) fits in that distance; ties can't happen (no two
  trains share a position). Only that train counts the digit as a reason to stop (`trainNextStop`'s `reasons` gain
  `(stop, dir) => reqHas(line.req, …) && trainServes(…) === slot`), so a train already too close runs through and the
  one behind stops. Recomputed at every decision, so if the first train can't brake by the time the ask lands, the
  next one takes it. Served (the train stands there, leaving that way): the digit clears from `Line.req`. A train
  already standing at that platform, leaving that way, waits a full dwell from now (v25's rule, unchanged).
- **A rider's ask** (`rail.call { id, dir, train }`, aboard): the new `train` field names the slot. The server checks
  the actor is aboard that train (`nearTrain(w, slot, tick, actor)`, v25's rule per train), that the halt is on its
  line and that `dir` is its direction; the digit goes in that `Train.req`. Only that train serves it, so the train
  ahead can't take your stop and leave you riding through.

`trainRequestable(row, line, n, tick)` keeps its meaning per train; the cord prompt reads the rider's own train.

### 8. Services with several trains

`serviceOf(w, slot, r)` already takes the row; it changes to read the train's line and drop the "the other way" turn
logic. `depotNeed`, `trainOwed`, the forge-rack reclaim (`railway-systems.ts` 608–613) and `railway-predict.ts`'s kit
rails sum over **all of line 2's trains** instead of reading slot 1. The Q6 kit loads onto whichever line-2 train
stands at the Village first while it is owed; the footing wagon couples to the first line-2 train standing at the
Village after `Shed.ready` and stays on it (`wagon` per row already). Line 1 carries nothing.

### Controls

No new action. The halt lever keeps its action and prompt (`request-lever.ts`); each platform's lever has one handle
for its own direction (open question 3). The aboard cord keeps its prompt and adds `train` to what it sends. No pad
slot, key or guide row changes.

## Migrating lines 1 and 2

All of it is one `WORLD_NS` bump, v26 (step 4); steps 2 and 3 before it are views and positions only.

- **The second track bed.** 4 m left of today's track, from merge to merge: line 1 s 36–182 m, line 2 s 34–556 m.
  Track 0 (up) runs on it. The laying machine lays a pair per panel (decision: "the laying effort stays the same"), so
  every bill and panel count is unchanged; only the view draws two rails a panel. Line 1's ridge trestle (s 50–114) and
  line 2's sea trestle widen to the 7.6 m formation.
- **The turntable (both lines, s 0–4 m).** Untouched. Each line's two tracks merge at a stub turnout past its Village
  platform (line 1 s 36, line 2 s 34); from there one terminal track runs to the platform and on to the table, as
  today. The table keeps one track, as the blockout found it must.
- **The Village platform (line 1, s 6–32, on the left).** Untouched, for the same reason: the second track starts past
  it at the merge, so the Q1 frame's side never has to give room. Both Village halts stay one platform each (terminal
  tracks), the stub's one bend of "stations get two platforms" (open question 4).
- **The pier rack (line 2, s 732–734, left).** Untouched in v26: line 2's far tracks merge at s 556, at the pier's
  root on Far Head, so the pier (556–742) stays one terminal track and the rack, halt, frame and track layer stand
  where they are. Ring Island build 1 (v27), which continues line 2 double over the bents, widens the pier and moves
  the rack and halt then (the left platform at lat −6.9, the rack 2 m beyond it; both measured below).
- **Far Head while it is the end.** Before Q6 opens the pier, Far Head (52400) is line 2's end: a facing crossover at
  s 490–512, short of its platforms, turns trains back onto the down track and today's platform. After the pier opens
  it is a middle halt with two platforms and the crossover is unused.
- **The six built bents.** Widened to the 7.6 m double deck **and** redrawn to the 4% bow (24.3 m at the pier head,
  about 19.6 m at bent 6, ruling 2), in one redraw before v26 (step 3), so the finished bents change once and Ring
  Island build 1 only adds the seven new ones, the stub and the leaf. The footing sockets move with the deck:
  `CROSSING_BENTS` centres 200 cm west (the formation's middle), `CROSSING_FOOT_OFF` 250 → 330. No saved field holds a
  socket position (`Works.pierSet` counts), so this is not a shape change.
- **One `WORLD_NS` bump.** v26 carries the new `Line` component, `Train.track` for `sweep`, the third train row, the
  `rail.call` `train` field and the request split. Dated history line in `src/world/namespace.ts`. The world starts
  fresh; there is no save migration ([mixed builds](../agents/mixed-builds.md)). Not shipped mid-session.

## Sequencing: v26 alone, Ring Island as v27

**Recommendation: generic lines and the second tracks ship as v26; Ring Island build 1 ships as v27 on top.**

Why: Ring Island's R3 (the moving railhead, Q7, the island halt, line 2's appended stops) is written against line 2's
stop list, its one train and its turn-back. Built on v25's shape it would be written once and rewritten for this plan
weeks later; built on v26 it is a catalog row and a few halts. The bents and the pier crossing then go double the first
time (ruling 11's "no single-track exception" holds fully, with no "one track laid, the other's bed empty" stage and
no turnout at the pier head). And each reset stays reviewable: v26 changes how trains run and nothing else a player
builds; v27 adds the area. Ring Island's R1 (layout) and R2 (the near-LOD, Local) don't touch the sim and can be built
in parallel with this plan; only its R3 and R5 wait for v26.

The risk: **two resets instead of one** (the 10 November decision allowed sharing a bump "if they are ready
together"). Each costs every room its progress; the `crossing-done` and `trains-on` jump-ins keep it to a click, and
v26 needs re-proving only the train beats. If v26 slips, Ring Island's R3 slips with it; the fallback is to bundle the
two in one branch and one bump, at the price of one very large review.

## Mixed builds, room safety and lockstep

- **Mixed builds** ([mixed-builds](../agents/mixed-builds.md), dev phase): the shape changes (`Line`, `track`, train
  count, the request split) are a clean break, one `WORLD_NS` bump in the same commit, with no compatibility code,
  version fence or save migration. `rail.call`'s `train` field is additive on the wire; the server validates it
  (`railInt(e.train, RAIL_TRAINS.length - 1)` when present) and a malformed value is refused, never thrown.
- **Room safety** ([room-safety](../agents/room-safety.md), "Don't"): effects stay out of the systems (the bell, the
  lamp and the cord's sound play from the prediction or the mirrored change in the adapter, never in `apply`); the
  lever's prediction remains "queued, not done" (`rail.call` is not predicted today and stays unpredicted: the route
  decision waits for acceptance); no wall clock or per-peer counter in `trainStep`, `trainServes` or the headway (all
  from the tick and rows); verified-save guards untouched. **New shared file:** `src/sim/railway-lines.ts` is under
  `src/sim/`, which `server/Dockerfile`, `dev/server-build.ts` and `deploy-server.yml` already carry whole, so
  `test/server-image.test.ts` passes without edits; if any server import reaches `src/sickle/`, all three need it
  listed (this plan avoids that).
- **Lockstep math** ([lockstep](../agents/lockstep.md)): `circuitCm`, the block test, `headTicks` and `trainServes` are
  integer cm and ticks; the brake distance is `v * v / (2 * accel)` (no `**`); `cycleTicks` uses `Math.ceil`. The
  determinism lint covers `src/sim/`.
- **Hotspots.** `railway-systems.ts` (about 1,590 lines) and `src/adapters/railway.ts` (about 1,200): the new rules go
  in a new `src/sim/railway-trains.ts` (the per-line train step, blocks, headway, service assignment), with
  `trainStep` in `railway-systems.ts` reduced to a loop over `RAIL_TRAINS` calling it. Only step 4 edits the sim.

## Steps

Each step leaves `npm run check` green and ships on its own except 4a and 4b, which ship together as the v26 bump.

- [ ] **1. Lines as data (no behaviour change, no bump).** Create `src/sim/railway-lines.ts` with `RAIL_LINES` (line 1
  and line 2 with v25's stops, halts, path, `speed: 200`, `accel: 3.5`, `trains: 1` each), `RAIL_TRAINS` and
  `RAIL_HALTS`; each halt's two platforms equal its v25 `LINE_HALTS` spot for now. In `railway-train.ts` derive
  `TRAIN_STOPS`, `LINE_HALTS`, `TRAIN_HOME` and `trainStopsOf` from it, and make `profile` and its callers take the
  line's `{ speed, accel }`. `railway-line-path.ts`'s `railLinePoint` reads `RAIL_LINES[line].path` (delete `PATHS`).
  Test: new `test/railway-lines.test.ts` asserts the derived tables equal v25's literals (stops, halts, homes, path)
  and that every halt's `opens` slot exists; `test/railway-train.test.ts` unchanged and green. `npm run check`.
- [ ] **2. The double formation, drawn (view only, no bump).** In the line views (`src/proto/place/rail.ts`'s deck and
  rails, `line2-view.ts`'s panels, the line 1 view) draw the up track 4 m left from merge to merge, the stub turnouts
  at line 1 s 36 and 182 and line 2 s 34 and 556, Far Head's crossover at s 490–512, and the 7.6 m deck on both
  trestles; a laid panel shows two tracks. Add the up platforms at Quarry and Far Head (Level findings), with no lever
  yet. Trains stay on today's track. Remove lines 1 and 2's survey beds from the greybox and regenerate
  `world-blockout` (`LIVE_SECOND_TRACK` becomes the built bed: the generator reads it from `RAIL_LINES`). Checks:
  `npm run level-check` (dev/level/timber-track.ts must accept the new platforms against both tracks; extend it to
  check track 0's rails), `npm run perf` before and after (doubled rails and sleepers), looks at phone width:
  `--rail-seed trains-on` at the Village merges, Quarry, Far Head's crossover, the line 1 ridge trestle and the pier
  root; the bot through T1 (layout change).
- [ ] **3. The six bents, wide and on the bow (positions and view, no bump).** `CROSSING_BENTS` 200 cm west,
  `CROSSING_FOOT_OFF` 330, the bent caps at the 4% heights in `crossing-view.ts` (bent k's deck at
  `2430 − 4·(distance from bent 1)`/100, bent 6 about 1960 cm). Test: `test/railway-works-layout.test.ts` gains the
  socket spacing and the 4% check. Looks before and after: `--rail-seed crossing-done` from Home's hilltop, the
  telescope and the Split-rock finale's last frame; `npm run loop -- node crossing` unchanged (same 12 footings);
  `npm run checkpoints -- crossing-done`.
- [ ] **4a. The trains (sim and server; v26, with 4b).** New `src/sim/railway-trains.ts`: `circuitCm`, `cycleTicks`,
  `headTicks`, `blockFree`, `trainServes`, `trainStepLine(w, line, tick)`. In `railway-train.ts` delete `trainWayOut`
  and LOOK's branches of `trainNextStop`; it takes `track` and a `reasons(stop, dir)` callback. In `railway-world.ts`:
  `Train.track` for `sweep`, the `Line` component, `RAIL_TRAINS` rows spawned, `railwayView`'s `trains`/`lines`,
  `railwayCheck` counts and the new invariants (below). In `railway-systems.ts`: `boilerFit` places trains by circuit,
  `rail.call` splits lever and rider asks, `trainStep` loops `RAIL_TRAINS`, kit and wagon sums over line 2's trains;
  `railway-line2.ts` the same. Catalog: line 2 `trains: 2`; halts' up and down platforms and `end`s from Level
  findings. `railway-server.ts`: `rail.call` validates `train` and the platform for `dir`; `nearTrain` per slot.
  `railway-predict.ts`: the kit sum. `namespace.ts`: `WORLD_NS = 'v26'` with the dated line. Seeds
  (`railway-seeds.ts`, `railway-seed-route.ts`, `railway-seed-works.ts`) rebuilt for three trains.
  **Invariants** (in `validateRailway`): every train's `track` is 0 or 1; trains of a line are at least `sepCm` apart
  in circuit order at every tick a test samples; at most one train in each end block; `Line.req` and `Train.req` pass
  `reqValid`; a rider digit only on its train's direction; at most one train with `wagon`; kit and footings conserved
  as today with the sums. **Unit tests** (`test/railway-train.test.ts`, rewritten where LOOK was tested;
  `test/railway-trains.test.ts` new): two trains never closer than `sepCm` over 2,000 ticks of random lever asks
  (seeded `mulberry32`); a lever ask goes to the next train that can brake and the one too close runs through; a
  rider's ask is never served by the train ahead; a train held at a signal leaves the tick the block clears and a held
  leg lengthens without a pose jump (`trainAlong` continuous across the replan); the headway hold spaces two trains
  that started together to within one dwell of half a cycle after three laps; opening the pier mid-run moves no
  train's pose; the end block holds one train; round-trip through `railwayView` and the replicated components
  (`test/railway-replicate.test.ts`). Server: `server/test/railway-line-host.test.ts` gains a refused malformed
  `train` and a rider's ask from the wrong train. `npm run loop -- run` (supply by train changed); `npm run check`;
  `npm run check:full` (server and `src/world`).
- [ ] **4b. The trains (client and bot; v26, with 4a).** `src/adapters/railway.ts`: `railTrainsOf`, the mirrored
  `lines`, every `line2.train[k]` read moved to per-train reads. `train-view.ts`: one train mesh per `RAIL_TRAINS`
  slot, posed on its line at `trainAlong`, offset 4 m left on track 0, easing across each turnout and crossover over
  its 20 m (Local); the hold lamp on a held train; the cord prompt and `rail.call` with `train`. `halts-view.ts`,
  `halt-map.ts`, `request-lever.ts`: a lever per platform, one handle each, its lamp per `(halt, dir)` from `Line.req`;
  the island map draws all three trains. `footing-view.ts`, `roundhouse-view.ts`, `hook-shot.ts`, `glide.ts`,
  `tools.ts`, `railway-marks.ts`: the per-train reads. Bot (`dev/look/bots/railway.ts`, `railway-works.ts`) and loop
  graph (`dev/loop/graph.ts`): board and request against the platform for the direction it wants. Peer test
  (`dev/peer-test/ws-railway.ts`): two line-2 trains mirrored on three tabs, a lever ask served by the nearer train
  only. Checks: `npm run test:net`; `npm run checkpoints`; `npm run playthrough -- --from trains-on --to pier`, then
  `--players 2 --to Q6` (hashes agree); looks: `--players 2 --rail-seed trains-on` with one player at Quarry's up
  platform pulling the lever (the next up train stops, the other passes the down platform) and
  `--eval dev/look/evals/railway-request-stop.ts` updated for two trains; a still of the two trains passing on the sea
  trestle. Ship 4a + 4b together with `npm run ship`, not mid-session.
- [ ] **5. Docs.** The trains section of `docs/game-design/place.md` (two trains on line 2, both tracks, holds, who
  serves a request, no early turn-back), the atlas railway story (`docs/atlas/stories/railway.json`: a lever ask
  through `Line.req` to the serving train), `world-blockout.md`'s "Double track" ("today's lines stay single track"
  becomes history) and this plan's status. Every call the designer logged stays in `docs/agent-calls.md`.

## What players see

- **Two tracks everywhere a train runs**, laid in pairs as the machine goes; the platforms at Quarry and Far Head on
  both sides, one lever each.
- **A second train on line 2.** It wakes with the first when the boiler is fitted, at Far Head while the first is at
  the Village, and they pass each other mid-line on the sea trestle, each on its own track. A train that comes up
  behind another waits at the platform or at the signal before the end with its lamp lit, and goes the moment the line
  clears. At a halt the wait for a train your way is at most about 35 s on line 2, about half of one train's.
- **Trains turn back at the ends instead of shuttling on one track:** they run into the terminal track at the Village
  and the pier, stand, and leave on the other track; at Far Head before the pier opens they cross over in front of
  you. They never turn round mid-line any more. **No train turns on a loop in v26**: none of lines 1 and 2's ends has
  the room (Level findings). The first loop is Ring Island's halt in v27, where the train swings round the island's
  shore and comes back facing home.
- **Your stop is your stop.** Pull the lever and the next train your way that can still stop for you does; ring the
  cord aboard and your own train stops, not the one ahead.

## Level findings

Measured on today's terrain and props with the blockout's own method (`lineAt`, `railY`, `H`, the sim's prop
positions; sampled every 0.5–2 m) on the planned positions, before review. `npm run level-check` passes on today's
layout (9 reports, rail grades north 26.5%, east 22.5%); it can't yet see the second track, so step 2 extends
`dev/level/timber-track.ts` to check track 0 and the new platforms, and these numbers are what it must reproduce.

| Planned | Where | Found |
| --- | --- | --- |
| Line 1 up track, s 36–182 | 4 m left | On the ground within 0.3 m of rail height except the ridge trestle: the bed is on the trestle from s 50 to about **s 114** (the existing trestle's abutment is at about 112, so the widened deck's runs 2 m further); clear of every prop (nearest over 6 m) |
| Line 2 up track, s 34–556 | 4 m left | On the ground within 0.6 m of rail height everywhere off the trestles. **The Q2–Q6 frames stand 7.5 m left of today's track, so 3.5 m from the new one** (Q2 s 40.5, Q3 120.5, Q4 178.5, Q5 284.5, Q6 544.5); the hook pillar 4.25 m at s 93. The frames are clear of a car (1.1 m half-width) only if their near face is over 1.2 m from their centre: step 2's look checks each, and a frame that is too wide steps out 1 m |
| Village merges, line 1 s 36, line 2 s 34 | turnout | Ground within 0.3 m; past both Village platforms (s 8–30 and 6–28), the turntable (0–4) and the breaker stand (0.6 m from where a bed at s 6 would be) |
| Camp merge, line 1 s 182 | turnout | Ground within 0.3 m; before the Camp platform (195–219, right) and the T1 frame (191, right) |
| Pier root merge, line 2 s 556 | turnout | On Far Head's land; the pier (556–742), its rack (0.69 m from where a left bed would run at s 733), halt and frame untouched |
| Up platforms, Quarry (s 166–186) and Far Head (513–535) | lat −5.7 to −8.2 | Ground within 0.3 m of the deck over the whole platform; centres (1081.0, 31.3) and (1358.5, −171.9), deck 24.3 m |
| Far Head crossover, s 490–512 | both tracks | Within the Q5 stretch's ground (left bed within 0.6 m) |
| The six bents, 200 cm west | sea | Open water (floor −6 m) at every bent; no prop within 8 m |
| Pier, v27 (for Ring Island) | lat −6.9, s 700–741 | Over the sea at the pier's height (24.3 m): a platform there needs the pier widened west by about 6 m |
| **Loops, rejected** | | Line 1's Camp end, radius 15 or 20 m either side: the ridge falls away **32.5 m** (and a building on the right). Line 2's Far Head, right (east) side, radius 20–25 m: **flat within 0.4 m** at centre about (1408, −181), but Far Head is an end only before the pier opens; the pier end is a pier. The Village is the turntable and the town |

Nothing here is reachable earlier than today: the new track and platforms sit beside tracks players already walk, at
the same heights, and add no ledge or shortcut (the up platforms are at deck height on flat ground, beside today's).

## Risks

- **Room safety:** the "Don't" items above; none is new, and the one shared-file rule is already met.
- **Size of 4a + 4b.** v25 was 51 files; this is similar. 4a is headless and reviewed alone (the independent sim
  review per `npm run models`, a failing test per suspected defect); 4b is reviewed against a running 4a.
- **Bunching and holds.** If request stops pile onto the lead train, the follower waits behind it; the headway hold at
  the ends and the lengthening replan keep that short, and the 2,000-tick test measures the worst hold. A hold over
  one leg is a finding (Ring Island's grind rule: "no train wait longer than one leg").
- **Riders standing on a held train** see it stop between halts only at a signal before an end; the brake is the
  normal 3.5 cm/tick², gentler than v25's replans, which matters while "two came off moving trains" is open (P1).
- **Frames beside the up track** (Level findings): players feed Q6's frame from the train-fed rack while trains run,
  so they stand 3.5 m from a running track; a train is solid and can bump them (slapstick, DESIGN 10, but not a hazard
  the frame should invite). Step 2's look decides whether Q6's frame steps out.
- **Performance:** doubled rails, sleepers and decks on both lines and a third train mesh; `npm run perf` in steps 2
  and 4b, phone tier included. The trains add no tick work worth measuring (three rows, a few comparisons each).
- **Mixed builds:** none in development; a v25 tab after v26 ships gets the update notice.
- **Ring Island's brief** assumes the pier and bents are single until its build ("the reverse pull-out"); v27's plan
  updates R1–R3 to start from v26 (an extended line 2 row, a loop at the island halt).

## Open questions

1. **Drop the early turn-back (LOOK)?** Recommended: **yes**. With a track a direction and turnouts only at the ends a
   train can't turn mid-line; two trains on line 2 halve the wait instead, and line 1's two halts are both ends.
2. **Install the future lines' rows now, parked and unlaid (the blockout's point 8), or each with its area?**
   Recommended: **each with its area.** Every area bumps `WORLD_NS` for its own jobs anyway, the future lines' data
   is still moving (the 10 November rulings changed three of them), and dormant rows cost replication and invariants
   for nothing.
3. **One lever per platform, one handle each, instead of one two-handled lever at a middle halt** (supersedes the
   late game's answer 2, 10 November)? Recommended: **yes**: with a platform for each direction 10 m apart across
   both tracks, a handle for the other direction would send you across the tracks to catch the train you called.
4. **Terminal stubs at the Village and the pier, one platform each, rather than two platforms and a crossover at every
   end?** Recommended: **yes for v26**: it leaves the turntable, the Village platform and the pier rack exactly where
   they are; the pier gets its second platform when Ring Island makes it a middle halt.
5. **When does line 2's second train appear?** Recommended: **with the first, when the boiler is fitted**, so the
   wait halves from the moment trains run; the alternative is a reward when Q6 opens the pier (the line doubles its
   length and its service), at the cost of a second gate and a parked train to explain.
