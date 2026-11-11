> **Status: plan, design-reviewed (2026-11-10).** Nothing built. Written on top of v25 (request stops, shipped as
> #1409); every line number and shape below is v25's. Since then #1411 added the passenger car, built and switched off,
> to `train-view.ts`: step 4b keeps it per train. Recommended sequencing:
> **generic lines and the second tracks ship as `WORLD_NS` v26; Ring Island build 1 follows as v27, on top.** The
> designer's review (last section) is folded into the design and steps: the corrected waits and a wait bound
> (findings 1 and 9), the serving train's lamp (2), the platform plaques and Far Head's chained lever (3, 4), the
> plank crossings (5), the laying machine laying pairs (8) and the records to amend (7).

# Generic lines: data-driven lines, double track, many trains

**Goal.** Make a line a row of data in the sim, not an index 0 or 1, and run more than one train on it: each line has
two tracks, one per direction, trains turn back at the ends, and a spacing rule keeps them apart. Today's lines 1 and 2
get their second tracks in the same `WORLD_NS` bump, and line 2 gets a second train. Serves DESIGN.md's core loop ("the
rail builds the world": every later area becomes one more catalog row, built from line 1 and line 2's components) and
**7. Telegraph everything** / **11. Show, don't tell** (a train you can see coming on your side, a second one already
on its way). It bends nothing; one decision's wording (two handles a lever) is superseded, see open question 2.

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
  `extends: 1` means). Not installing them now is a logged New call (design review, call 29).

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
  `headTicks = floor(cycleTicks · headPct / (100 · trains))`, `cycleTicks` the non-stop round trip from the catalog
  (two `trainLegTicks` end to end plus two `dwellTicks`) and `headPct` a room tunable, `railTrainHeadPct`, default 75
  (appended to `src/tunables/catalog.ts` and `src/sim/tune.ts` as v25's `railFoot*` were; owner call "Anything playtests
  could tune is tunable"). A line with one train has no hold, and the train carrying the footing wagon is never held
  while the pier still owes footings (design review, finding 9). Line 2: a 92.8 s cycle to the pier, so two trains
  leave an end no closer than about 35 s apart (before the pier: 72 s and 27 s); evenly spread they pass each platform
  each way every 46 s.

A train held by any of these stands at a stop with its doors open (anyone can board), shows the hold on its lamp,
the halt's departure board shows the held departure (view), and it leaves the tick the block clears. No player action
affects spacing.

**The wait bound.** Spacing decides how long a player waits for a train their way, and that is what the train count
is sized by (design review, finding 1): no wait for a train your way over about a minute. Two trains on line 2 give
about 23 s on average and about 58 s at worst (bunched to the hold limit), plus about 11 s for each request stop the
train ahead makes; v25's early turn-back gave about 14–23 s typical and about 50 s worst. Step 4a's random-ask test
measures the worst wait per (halt, direction) and fails over 60 s on line 2. Ring Island's extension takes line 2's
cycle to roughly 170 s, where two trains would leave waits up to about 100 s, so v27 sets line 2's `trains` from this
bound (probably 3; open question 5).

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
  already standing at that platform, leaving that way, waits a full dwell from now (v25's rule, unchanged). **The
  serving train shows it** (design review, finding 2): the adapter computes `trainServes` from the mirrored rows and
  lights v25's amber stop lamp on that train as soon as it is named, for lever asks as well as cord asks, so a train
  that runs through is visibly dark and the lit one behind it is yours. The assignment only moves back (when a train
  passes the point it could brake for), so the lamp doesn't flicker between trains.
- **No ask for a platform no train will stand at.** v25's `reqIndex` maps any ask at an end halt to its way out. With
  a platform for each direction that would let Far Head's up lever (before the pier opens, when trains cross over
  short of it) call a down train to the other platform, so `rail.call` refuses a lever ask whose `dir` is an open
  end's way in, and the view chains that lever with its plaque until the pier opens (finding 4).
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
for its own direction (open question 2), keeping v25's enamel plaque naming the end it goes to (**Village**, **Pier**,
**Far Head**; draft words, the owner's to change). The aboard cord keeps its prompt and adds `train` to what it sends.
No pad slot, key or guide row changes.

## Migrating lines 1 and 2

All of it is one `WORLD_NS` bump, v26 (step 4); steps 2 and 3 before it are views and positions only.

- **The second track bed.** 4 m left of today's track, from merge to merge: line 1 s 36–182 m, line 2 s 34–556 m.
  Track 0 (up) runs on it. The laying machine lays a pair per panel (decision: "the laying effort stays the same"), so
  every bill and panel count is unchanged; the gantry visibly sets both tracks of each panel (owner call "Machines
  show their work physically"; design review, finding 8), a view change with no count behind it. Line 1's ridge
  trestle (s 50–114) and line 2's sea trestle widen to the 7.6 m formation.
- **The turntable (both lines, s 0–4 m).** Untouched. Each line's two tracks merge at a stub turnout past its Village
  platform (line 1 s 36, line 2 s 34); from there one terminal track runs to the platform and on to the table, as
  today. The table keeps one track, as the blockout found it must.
- **The Village platform (line 1, s 6–32, on the left).** Untouched, for the same reason: the second track starts past
  it at the merge, so the Q1 frame's side never has to give room. Both Village halts stay one platform each (terminal
  tracks), the stubs bend "stations get two platforms" at the ends only (a logged New call, design review, call 20).
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
two in one branch and one bump, at the price of one very large review. v27 also sets line 2's train count from the
wait bound (probably a third train) and turns the island halt's end into the first loop.

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

- [x] **1. Lines as data (no behaviour change, no bump).** Create `src/sim/railway-lines.ts` with `RAIL_LINES` (line 1
  and line 2 with v25's stops, halts, path, `speed: 200`, `accel: 3.5`, `trains: 1` each), `RAIL_TRAINS` and
  `RAIL_HALTS`; each halt's two platforms equal its v25 `LINE_HALTS` spot for now. In `railway-train.ts` derive
  `TRAIN_STOPS`, `LINE_HALTS`, `TRAIN_HOME` and `trainStopsOf` from it, and make `profile` and its callers take the
  line's `{ speed, accel }`. `railway-line-path.ts`'s `railLinePoint` reads `RAIL_LINES[line].path` (delete `PATHS`).
  Test: new `test/railway-lines.test.ts` asserts the derived tables equal v25's literals (stops, halts, homes, path)
  and that every halt's `opens` slot exists; `test/railway-train.test.ts` unchanged and green. `npm run check`.
  *Built (2026-11-10):* `RailLineDef` gained `home` (the halt its first train stands at, which `RAIL_TRAINS` needs
  until step 4a places trains by circuit); `trainStopsOf(line, laid)` takes the count of complete QJob slots or v25's
  boolean, so callers are unchanged; `LINE_HALTS` maps `RAIL_HALTS` to v25's flat `{ x, z, y, reach }` shape (the
  up platform) under v25's six-halt tuple type; `trainArrives(row, line?)` and `trainNextStop(…, kin)` take the line's
  kinematics, defaulting to `TRAIN`.
- [x] **2. The double formation, drawn (view only, no bump).** In the line views (`src/proto/place/rail.ts`'s deck and
  rails, `line2-view.ts`'s panels, the line 1 view) draw the up track 4 m left from merge to merge, the stub turnouts
  at line 1 s 36 and 182 and line 2 s 34 and 556, Far Head's crossover at s 490–512, and the 7.6 m deck on both
  trestles; the laying gantry sets both tracks of each panel as it goes. Add the up platforms at Quarry and Far Head
  (Level findings), with no lever yet, and a plank crossing over both tracks at each platform pair's halt end (the
  walk from today's platform to the up one). Trains stay on today's track. Remove lines 1 and 2's survey beds from the greybox and regenerate
  `world-blockout` (`LIVE_SECOND_TRACK` becomes the built bed: the generator reads it from `RAIL_LINES`). Checks:
  `npm run level-check` (dev/level/timber-track.ts must accept the new platforms against both tracks; extend it to
  check track 0's rails), `npm run perf` before and after (doubled rails and sleepers), looks at phone width:
  `--rail-seed trains-on` at the Village merges, Quarry, Far Head's crossover, the line 1 ridge trestle and the pier
  root; the bot through T1 (layout change).
  *Built (2026-11-10):* the clashes the first attempt found (the survey had no pillars, gates or frame footprints)
  were settled by the orchestrator's calls in [agent-calls](../agent-calls.md): p2 and its walk stand 11 m left at
  s 89.5 (`LINE2_HOOK` moved with it; at 9.5 m the walk had no room, and at s 92 t0 fell within two jumps of p2's top;
  the review then found the walk's raised end within two jumps of t0, so it now rises round p2's far side, the level
  model stands on the walk too, and `test/line2-hook-pin.test.ts` ties `LINE2_HOOK` to the drawn device),
  both gates span both tracks (slab 10.4 m, centred 2 m left), Quarry's up platform is s 154–174.5, clear of the Q4
  frame, with no ramp off that end, p1's lip ends at the wider deck's edge (5.8 m), and the survey now checks pillars,
  gates and frames. Differences from the text above: the formation's merges and crossover live in
  `src/proto/place/layout.ts` (`FORMATION`, `upLat`, `crossLat`) until 4a moves them into `RailHalt.end`, and the
  blockout generator still reads `LIVE_SECOND_TRACK` from its own survey (its line-2 left side now reports only the
  turntable and the pier rack, both outside the formation); the greybox no longer draws lines 1 and 2's survey beds.
  The gantry carries both pairs of a double panel in one trip (seats today's pair, crosses, sets the up pair) on a
  7.0 m beam; no frame needed stepping out (each frame's near face stands 2.5 m from the up track's centre). The
  plank crossings are at Quarry s 146.8, ending on a pad at the up platform's start-ramp foot, and Far Head s 538.5,
  by today's platform's end ramp; the ridge trestle's left
  lamps moved to the formation's edge. Level-check covers track 0's rails, the up platforms, the crossings and the
  gates' jambs.
- [x] **3. The six bents, wide and on the bow (positions and view, no bump).** `CROSSING_BENTS` 200 cm west,
  `CROSSING_FOOT_OFF` 330, the bent caps at the 4% heights in `crossing-view.ts` (bent k's deck at
  `2430 − 4·(distance from bent 1)`/100, bent 6 about 1960 cm). Test: `test/railway-works-layout.test.ts` gains the
  socket spacing and the 4% check. Looks before and after: `--rail-seed crossing-done` from Home's hilltop, the
  telescope and the Split-rock finale's last frame; `npm run loop -- node crossing` unchanged (same 12 footings);
  `npm run checkpoints -- crossing-done`.
  *Built (2026-11-10):* bent 6 is 2030 cm, not about 1960: ring-island ruling 5 measures the bow from the pier head
  (24.3 m at bent 1, 4% after it), which supersedes world-blockout's "about 19.6 m". The heights are an integer table,
  `CROSSING_DECK_Y` in `railway-works-layout.ts` (view-only layout, like the bents), and the centres are 2 m west on
  the crossing's perpendicular (the greybox's `lat −2`), rounded to the cm grid, not a flat 200 cm in x. No sim value
  moved: the sim sets pier footings at `PIER_FRAME` and counts them (`Works.pierSet`); no system, op or save reads
  `CROSSING_BENTS` or `CROSSING_FOOT_OFF` (only the crossing view, the finale's constants and the jump-ins' facing).
  The bents carry no deck or rails yet, so nothing is laid on them (ruling 11's one laid track arrives with Ring
  Island's deck). The finale's pull-out rises with the decks (34 m to 27 m, from 28 m to 13 m), and the greybox's
  `bents` mark moved with bent 1. Checks: the stills from the pier head and the side, the finale's late frame from
  `crossing-finishing` (the last bents at the frame's foot, ring, shard and rockets above), `npm run checkpoints --
  crossing-done` ok. `playthrough --from trains-on --to pier` passes (no recovery). It first stopped after Q6 laid,
  on main too: since step 2 the up track's bed stands about 0.36 m over the unbanked ground beside Far Head's
  turnout (s 536–556), too high to walk up, and the B8 bot's straight line from the Q6 frame to s 546 crossed it. The
  bot now walks the frame's side to s 557, past the merge, and steps up there. *Resolved (orchestrator, 10
  November: nobody should have to jump onto the bed):* `terrain.ts` banks the ground along the up track's centre with
  the same strip as today's track (4 m, fading to 8) wherever it runs 0.6 m or more out. It grades heights only, and
  skips cells under 4.5 m and cells more than 3 m under the rail (after review: it had raised single cells by up to
  7.3 m beside the quarry trestle's abutments), so the starter tree catalog is unchanged. Ground just outside the up
  bed that sat 0.25–0.9 m under its top went from 59 m to 1 m of line 1's formation and from 210 m to 10 m of line
  2's; what remains is at trestle and ramp ends, where today's side is as high or higher (one exception, line 2 s
  307: 0.89 m against 0.54 m, at the deck's end), and by the Village merge (0.25–0.29 m, today's side 0.18 m).
  Level-check: 0 problems, progression and the walking flood unchanged. The straight walk from the Q6 frame onto s
  546 now arrives; the segment passes with the bot's route kept.
- [x] **4a. The trains (sim and server; v26, with 4b).** New `src/sim/railway-trains.ts`: `circuitCm`, `cycleTicks`,
  `headTicks`, `blockFree`, `trainServes`, `trainStepLine(w, line, tick)`. In `railway-train.ts` delete `trainWayOut`
  and LOOK's branches of `trainNextStop`; it takes `track` and a `reasons(stop, dir)` callback. In `railway-world.ts`:
  `Train.track` for `sweep`, the `Line` component, `RAIL_TRAINS` rows spawned, `railwayView`'s `trains`/`lines`,
  `railwayCheck` counts and the new invariants (below). In `railway-systems.ts`: `boilerFit` places trains by circuit,
  `rail.call` splits lever and rider asks, `trainStep` loops `RAIL_TRAINS`, kit and wagon sums over line 2's trains;
  `replan`'s calls to `trainAlong`, `trainSpeed` and `trainArrives` pass the slot as the line number (step 1 review)
  and must pass `RAIL_TRAINS[slot].line` once a line has several trains;
  `railway-line2.ts` the same. Catalog: line 2 `trains: 2`; halts' up and down platforms and `end`s from Level
  findings. Tunable `railTrainHeadPct` (default 75). `railway-server.ts`: `rail.call` validates `train` and the
  platform for `dir`, and refuses a lever ask for an open end's way in; `nearTrain` per slot.
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
  that started together to within one dwell of half a cycle after three laps; the wagon train is never held while the
  pier owes footings; opening the pier mid-run moves no train's pose; the end block holds one train; the same random
  run reports the **worst wait for a train each way at every halt** and fails over 600 ticks on line 2; round-trip
  through `railwayView` and the replicated components (`test/railway-replicate.test.ts`). Server:
  `server/test/railway-line-host.test.ts` gains a refused malformed `train`, a rider's ask from the wrong train and
  Far Head's up lever refused before the pier opens. `npm run loop -- run` (supply by train changed; report the
  footing laps' time against the 10 November pair's 1:45); `npm run check`; `npm run check:full` (server and
  `src/world`).
  *Built (2026-11-10, on its branch, not shipped: v26 ships with 4b after review):* three trains, slots [line 1 at
  Camp on the down track, line 2 at the Village up, line 2 at Far Head down], from `trainPlaces` (train k at the open
  halt nearest `home + k·C/n`; ends only on their way out). `circuitCm` and `trainPlaces` live in `railway-lines.ts`
  beside `RAIL_TRAINS`, which derives from them; `trainStepLine` takes a `TrainIO` (arrive, standing holds, headway
  exemption) from `railway-systems.ts`, so the trains module imports no systems. Numbers: line 2's cycle is 924 ticks (92.4 s)
  with the pier open, 722 ticks (72.2 s) before (the plan's 928/348 were estimates); line 2's Village start signal is 4440 cm, not
  4400, so the signal stands `sepCm` past the stub's stop. Lever asks are `Line.req`, rider asks `Train.req` with
  `train`; a rider's ask to an end halt and an open end's way-in lever are refused; the turnback keeps only riders'
  asks for the new way (`reqOnly`); commissioning no longer asks the Village. `trainServes` keeps a stop for a train
  already braking for it (rounding had let the replan run past it). The spacing invariant is sampled per tick in tests
  (`trainSpacing`); `validateRailway` checks the tick-free ones. Headway: at the default 75% two trains settle to
  `headTicks`, within a dwell, and to half a cycle only at 100% (both tested). The server also had to pass `train`
  through `railwayRequestEdit`, and `railTrainHeadPct` is in the world host's rail tune keys. **Worst wait (owner
  call):** 600 ticks flat is not reachable on line 2 with request stops at any headPct tried (75/90/100): the worst
  waits are about half a cycle plus about 11 s per request stop served meanwhile (Pier down 71 s, Quarry down 61 s at
  q6-done, 75%). The test bounds a wait by 600 + 110 ticks per middle-halt stop the line's trains made during it and
  prints every halt and direction; a third train or a higher hold is the lever if the owner wants 60 s flat. Far
  Head's up and down platforms overlap (about 10 m apart, reach 12.6 m), so the up-lever refusal is tested from the
  down platform's far edge. A train bound for Far Head lengthens to the pier when Q6 completes (4b's crossover
  easing). Shims for 4b: `line2.train` is an alias of `trains`, `sweep` reads became `track` in `halts-view.ts`, the
  look bots and evals and `dev/peer-test/ws-railway.ts` (whose request stop now reads `Line.req` and any line-2
  train), and the adapter's `line2.lines`; the aboard cord sends no `train` yet and the lever lamp reads train asks
  until 4b. The wagon couples to whichever line-2 train reaches the Village first, so the loop's `table` check and
  the works host test look for any wagon train; `dev/look/bots/railway-works.ts` still reads `train[1]` (4b's bot).
  `npm run loop -- run`: every player count finishes; the crossing (table turned to the twelfth pier footing) takes
  3:20 alone, 2:59 for two, 2:52 for three or four, against the 10 November pair's 1:45 observed (the loop does not
  ride and walks every footing; its 2:59 for two is the number to watch when 4b's bot runs it).
  *Amended (2026-11-10, after the independent review of 4a; orchestrator's call in
  [agent-calls](../agent-calls.md)):* **the one-minute design bound is not met by two trains under heavy random
  asks.** The review's long fuzz (lever and rider asks, the pier opening at a random tick, save/restore round trips)
  found line 2's worst wait per halt and direction at 91–97 s at the default 75% hold over 5 seeds × 40,000 ticks
  (81–95 s at 100%, 70–84 s at 50%, 85–93 s at 0%), so the headway percent is not the lever; 4b's rerun of the folded
  fuzz: 92–96 s at 75%, 74–81 s at 0%, mean 43–46 s over about 320 served asks. The 600 + 110-a-stop bound passed
  almost anything, so the test is now a flat regression bound of 1,050 ticks on line 2 that prints the table (3,000
  ticks a seed in `npm run check`; `FUZZ_TICKS=40000` for the long run). At a playtest-like rate (one lever ask every
  60–90 s, `FUZZ_LIGHT=1`) the worst is 59–70 s and the mean 27–29 s over 31 asks a seed. Meeting a minute is v27's,
  with its third train or an even-spacing hold. Also fixed after the review: a train held at Far Head's old signal when
  Q6 opens the pier runs signal to signal (at = to = −1), which the validator had refused (P1; it now refuses only a
  halt-to-same-halt leg, and still any leg of no length); a train bound for Far Head as its end when the pier opens
  still makes that stop once (P3a).
- [x] **4b. The trains (client and bot; v26, with 4a).** `src/adapters/railway.ts`: `railTrainsOf`, the mirrored
  `lines`, every `line2.train[k]` read moved to per-train reads. `train-view.ts`: one train mesh per `RAIL_TRAINS`
  slot, posed on its line at `trainAlong`, offset 4 m left on track 0, easing across each turnout and crossover over
  its 20 m (Local); the amber stop lamp on the train `trainServes` names (and on a train whose rider asked), the hold
  lamp on a held train; the cord prompt and `rail.call` with `train`. `halts-view.ts`, `halt-map.ts`,
  `request-lever.ts`: a lever per platform, one handle each, plaqued with its end, its lamp per `(halt, dir)` from
  `Line.req`; Far Head's up lever chained until the pier opens; the departure board shows a held departure; the island
  map draws all three trains. `footing-view.ts`, `roundhouse-view.ts`, `hook-shot.ts`, `glide.ts`,
  `tools.ts`, `railway-marks.ts`: the per-train reads. Bot (`dev/look/bots/railway.ts`, `railway-works.ts`) and loop
  graph (`dev/loop/graph.ts`): board and request against the platform for the direction it wants, crossing at the
  plank crossing. Peer test
  (`dev/peer-test/ws-railway.ts`): two line-2 trains mirrored on three tabs, a lever ask served by the nearer train
  only. Checks: `npm run test:net`; `npm run checkpoints`; `npm run playthrough -- --from trains-on --to pier`, then
  `--players 2 --to Q6` (hashes agree); looks: `--players 2 --rail-seed trains-on` with one player at Quarry's up
  platform pulling the lever (the next up train stops, the other passes the down platform) and
  `--eval dev/look/evals/railway-request-stop.ts` updated for two trains; a still of the two trains passing on the sea
  trestle. Ship 4a + 4b together with `npm run ship`, not mid-session.
  *Built (2026-11-10, on its branch, not shipped: 4a + 4b go to an independent review first; not tested on a device):*
  every 4a shim is gone (`line2.train`, `line2.lines`, the lever lamp reading train asks, `train[1]` in the works bot);
  the adapter's inspect has top-level `trains` and `lines`, and `railTrainsOf`, `railTrainAsked`, `railTrainHeld` and
  `railServing` are the per-train reads. `train-view.ts` builds one three-car train per slot (the wagon a car of its
  own that follows whichever train has it); a train on track 0 eases its lateral over the 20 m turnouts and Quarry's
  crossover, latched as it nears the crossover so opening the pier mid-run moves no pose (`poseCarOnLine` takes a
  `lat(s)`). The amber lamp shows a lever ask its train serves and a rider's ask it can still brake for (dark for a
  rider's ask too late to serve, the review's P3c); a red hold lamp beside it shows a train standing past its dwell at a
  signal or headway hold. Levers: one handle a platform direction; up platforms' levers stand at the end nearer the
  plank crossing; an open end's way-in lever is chained (padlocked, no prompt, plaqued "Pier") until the pier opens.
  Departure boards and the island map draw each train, a held train with a red badge. Bots board the standing train of
  the line and cross the plank crossing to an up platform; the loop graph gets a per-platform lever cue; the peer test
  mirrors both line-2 trains on three tabs and checks the serving train is the one that stops. Departures from the
  plan: no third folk driver (the line's first train keeps the seat); up platforms have no signal head or board of their
  own; `halt-map.ts` needed no change (the boards are `island-boards.ts`); `footing-view.ts`, `hook-shot.ts`, `glide.ts`
  and `tools.ts` had no per-train reads to move. **The two trains do not pass on the sea trestle:** from `trains-on`
  they meet at s ≈ 270 m on land by the rim table (headless, every ≈ 36 s at 269–272 m); from `q6-done` at 546 and
  256 m; the still (`dev/look/evals/railway-trains-pass.ts`) shows them there. Checks: `npm run check`,
  `check:full`, `test:net` (131), `checkpoints` (12 seeds); peer request stop served and stood by train 2 on server and
  all tabs; `playthrough --from trains-on --to pier` passes (Far Head +3:59, the warped bot boarding late); the seeded
  wagon half (`railway-works-bot.ts`, `wagon-on`) reaches the crossing in 20:02 game time from the seed against
  main's 22:47 (64b2026d, same seed and bot; the beats split differently: footings at the pier 9:31 then 10:31 to the
  crossing here, 20:36 then 2:11 on main, cause not traced); `npm run loop -- run`: crossing 3:20 alone, 2:55 for two (4a's 2:59), 2:52, 2:47. Not verified: **the two-player
  `--to Q6` run fails at "walked the hook walkway" identically on main 64b2026d**, so two-player hashes over v26 are
  unproven by it (the peer test's are); the amber lamp lit is seen through inspect only, not in a still; the other
  train passing the down platform dark is logged, not shot.
  *Amended (2026-11-10, after the whole-branch review of v26; not shipped, not tested on a device):* **P2-1:** a train
  held at a stub end's signal stood on the drawn turnout (the signal was 10 m past the merge, the turnout 20 m and a
  train reaches 9 m behind its along), so the train leaving the end drove through it. Each end now carries its
  `edgeCm` (the merge plus a stub's `TURNOUT_CM`, 20 m, which `layout.ts` draws) and `signalCm` (outside that by an
  inbound train's lead, `TRAIN_EXTENT`: 6.2 m ahead, 9.0 m behind, tested against the cars), and a train is in a
  block while any of it is: the Village's signal is at 63 m (was 44.4), the pier's at 529.8 m (was 546), Far Head's
  crossover's at 483.8 m (was 480). **P2-2:** a train already on Far Head's crossover when Q6 opens the pier ran on up
  track 0 while the view drew it crossed over (a latch a restore lost); now a track-0 train whose nose is past the
  crossover's start turns back at Far Head (`Train.turn`, cleared on arrival) and the view draws the crossover from
  the rows alone. **P3:** every train has a folk driver (one a slot). The reviewer's tests are in
  `test/review-v26.test.ts` (its every-tick save check 500 ticks a seed in check, `SAVE_TICKS=2500` for the review's
  length; it passes at both). Waits after the move (`FUZZ_TICKS=40000`): heavy random asks unchanged, worst 91.8–96.0
  s at 75% and 73.5–80.9 s at 0%, means 45.9 and 42.9 s; playtest-like rate worst 70.4 and 69.7 s, means 29.3 and
  28.5 s (31 asks a seed). A train held at a stub signal doesn't arise at the Village in play with two trains (none in
  12,000 ticks, with or without a rider asking at every halt), so the look (`dev/look/evals/railway-signal-hold.ts`,
  `q6-done`, `--real`) shows the pier's: the up train stands short of the turnout while the other leaves on the down
  track past it; the Village case is the reviewer's headless test. Far Head's lever overlap stays as logged.
- [ ] **5. Docs.** The trains section of `docs/game-design/place.md` (two trains on line 2, both tracks, holds, who
  serves a request and its lamp, no early turn-back), the atlas railway story (`docs/atlas/stories/railway.json`: a
  lever ask through `Line.req` to the serving train), `world-blockout.md`'s "Double track" ("today's lines stay single
  track" becomes history; its "every terminus turns a train back without reversing" and 35 m scissors describe future
  lines, not lines 1 and 2's stubs) and this plan's status. Dated amendment notes, not rewrites (design review,
  finding 7), once the owner or orchestrator confirms open questions 2 and 4: the Ring Island decision's build numbers
  (v26/v27 become v27/v28), ruling 11's one-track-first stage (both tracks are laid together on the new bents) and the
  late game's answer 2 (two handles). Every call the designer logged stays in `docs/agent-calls.md`.

## What players see

- **Two tracks everywhere a train runs**, laid in pairs as the machine goes; the platforms at Quarry and Far Head on
  both sides, one lever each.
- **A second train on line 2.** It wakes with the first when the boiler is fitted, at Far Head while the first is at
  the Village, and they pass each other mid-line on the sea trestle, each on its own track. A train that comes up
  behind another waits at the platform or at the signal before the end with its lamp lit, and goes the moment the line
  clears. At a halt on line 2 a train your way comes every 46 s or so when the two are spread (about 23 s on
  average, about a minute at worst when they bunch), against about 93 s with one train and no turn-back.
- **Trains turn back at the ends instead of shuttling on one track:** they run into the terminal track at the Village
  and the pier, stand, and leave on the other track; at Far Head before the pier opens they cross over in front of
  you. They never turn round mid-line any more. **No train turns on a loop in v26**: none of lines 1 and 2's ends has
  the room (Level findings). The first loop is Ring Island's halt in v27, where the train swings round the island's
  shore and comes back facing home.
- **Your stop is your stop.** Pull the lever on the platform plaqued with where you're going, and the next train
  your way that can still stop for you lights its amber lamp and stops; a train too close to stop runs through dark.
  Ring the cord aboard and your own train stops, not the one ahead. To ride the other way, cross on the planks at the
  platform end. Far Head's up lever hangs chained, plaqued "Pier", until the pier is laid.

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
- **Frames beside the up track** (Level findings): Q2–Q6's frames stand 3.5 m from it. No train runs there while
  anyone feeds one (Q2–Q5 finish before the boiler fit, and no train passes Far Head's crossover on the up track until
  Q6 opens the pier; design review, finding 6), so this is clearance, not traffic: step 2's look checks each frame's
  near face, and one that is too wide steps out 1 m.
- **Crossing two running tracks** to reach the up platform: the plank crossing gives the walk a place; being bumped
  by a train there is slapstick (DESIGN 10), and the bot proves the crossing in 4b.
- **Performance:** doubled rails, sleepers and decks on both lines and a third train mesh; `npm run perf` in steps 2
  and 4b, phone tier included. The trains add no tick work worth measuring (three rows, a few comparisons each).
- **Mixed builds:** none in development; a v25 tab after v26 ships gets the update notice.
- **Ring Island's brief** assumes the pier and bents are single until its build ("the reverse pull-out"); v27's plan
  updates R1–R3 to start from v26 (an extended line 2 row, a loop at the island halt).

## Open questions

The designer's five owner questions, which cover this plan's own; every other New call (terminal stubs, no loop until
v27, future rows with their areas) is logged in [agent-calls](../agent-calls.md) and builds on its recommendation.

1. **Drop the early turn-back (LOOK) now that each track runs one way?** Recommended: **yes**. Two trains give about
   a 23 s average wait (about 58 s worst) against LOOK's 14–23 s (about 50 s worst); a mid-line turn would need
   crossovers and two-way signalling everywhere.
2. **One lever per platform, for that platform's direction, instead of the two-handled lever (the late game's answer
   2, 10 November)?** Recommended: **yes**, each plaqued with the end it goes to: it still means "the next train my
   way", without sending you across both tracks to catch it. **Answered (owner, 10 November): "One lever per platform side".**
3. **Line 2's second train: from the boiler fit, with the first?** Recommended: **yes**; they pass on the sea trestle
   about 20 s after the wake. The alternative, a reward when Q6 opens the pier, adds a gate and a parked train to
   explain.
4. **Ship double track and the trains as v26 on their own, with Ring Island build 1 as v27?** Recommended: **yes**:
   two resets instead of one, but Ring Island is written once, on two tracks, and each reset stays reviewable.
5. **Size each line's trains by a wait target, no wait for a train your way over about a minute?** Recommended:
   **yes**, which keeps line 2 at two trains in v26 and gives it a third when Ring Island extends it in v27.

## Design review (designer, 2026-11-10)

**Read:** DESIGN.md; owner-calls; decisions.md's index and the 10 November entries (double track, block out the whole
map, Ring Island, the late game's five answers, stop on request) and 9 November "Home gets one coherent station";
direction.md; playtests.md's 9 and 10 November entries; find-the-fun step 2; the game-direction skill; world-blockout
("The rail network", "Double track", "What a generic data-driven line needs from the sim"); ring-island ("Shape",
build 1, the grind budget); agent-calls' 10 November rulings; v25's `railway-train.ts`, `railway-systems.ts`
(`boilerFit`, `serviceOf`, `replan`, `trainStep`) and works-late-game step 1, from the v25 copies; research
rail-network-depth, train-riding, train-ride-feel (top blocks), route-contract and progression-flow-layout (the rules
as lenses). **Ported from Place:** nothing gameplay-side (the gauge and deck drawing in `src/proto/place/rail.ts` are a
view), so no port check applies.

**Couldn't see or run** (this run's permissions): no stills (the Village merges, Quarry's two platforms, Far Head's
crossover, the widened trestles and pier root are unseen), no `npm run loop`, `node dev/playtest/cli.ts`,
`npm run level-check` or bot run. The level numbers below are the plan's own measurements and my arithmetic from v25's
`TRAIN` and stop table (3.5 cm/tick², 200 cm/tick, 5 s dwell; stops 17, 174, 524 and 730 m). Every reach and order
claim stays unproven until step 2's level-check and 4a's `npm run loop -- run` run.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Every corridor double track, 4 m centres, one direction a track; lines 1 and 2 widened in one bump | Decided | decisions.md 2026-11-10, "the railway is double track" |
| 2 | The laying machine lays a pair a panel; every bill and panel count unchanged | Decided | same entry ("the laying effort stays the same") |
| 3 | Trains stop only on request (lever at the halt, cord aboard); cargo and wagon stops need none | Decided | decisions.md 2026-11-10, "trains stop on request" |
| 4 | The turntable keeps one track; line trains never turn on it | Decided | decisions.md 9 November, "Home gets one coherent station" |
| 5 | Junctions are walk-between platforms; no through-running, shared track or transfer rule | Decided | blockout ruling 6 (orchestrator, 10 November, agent-calls `open`) |
| 6 | No player-operated signals, switches or dispatch; spacing is automatic | Decided | DESIGN core loop ("no routing or quotas"); rail-network-depth rec 2 agrees |
| 7 | Cruise stays 20 m/s, 3.5 cm/tick², per line in the catalog | Decided | train-ride-feel; Ring Island's longer boiler (decisions 10 November) is the first change |
| 8 | The six bents widen to the 7.6 m deck and redraw to the 4% bow before v26 | Decided | rulings 2 and 11 (orchestrator, 10 November). **Supersedes ruling 11's "one track laid, the second bed empty until line 2's widening bump"**: log it (finding 7) |
| 9 | No v26 ship while the owner is mid-session | Decided | owner-calls, "Nothing waits on a world bump" |
| 10 | Line 1 keeps one train; line 2 runs two | New (line 2) / Default (line 1) | Recommended. Line 1 is 193 m, both halts ends, 41 s a cycle: one train is enough. Line 2: owner question 3 |
| 11 | Line 2's second train wakes with the first at the boiler fit, spread round the circuit (Village up, Far Head down) | New | Recommended: the wait halves from the first ride, and the two passing on the sea trestle about 20 s after the wake is the "life happening" moment of round 4. A pier-opening reward adds a gate nobody asked for |
| 12 | Block rule: `sepCm` 2740 (train plus 20 m), checked at planning; a hold ends at a halt and lengthens when the leader moves on | Default | Engineering-safe; players see it only as an occasional unrequested stop at a middle halt with the hold lamp. Tunable |
| 13 | End blocks: one train in each end's turnout-to-stop block; the follower waits at a signal 10 m outside the merge, doors open | Default | Every signal position lands on land (line 2 s 44 and 480, after Q6 546; line 1 never needs one): nobody stepping off is stranded |
| 14 | Headway hold at the ends: `headPct` 75 of an even split (line 2: 35 s, 27 s before the pier); none with one train | Default | Spreads trains without a timetable. Make `headPct` a room tunable (owner call "Anything playtests could tune is tunable") |
| 15 | A held train stands doors open, the hold shown on its lamp | Default | Telegraph (7). Add the held departure to the halt's departure board (owner call "Signs in the world"): Default, mine |
| 16 | A lever ask is served by the nearest train that way that can still brake; a train too close runs through | Default | Matches v25's "too late" rule. **The serving train must light its stop lamp** (finding 2) |
| 17 | A rider's ask belongs to their own train only | Default | Fixes "the train ahead takes your stop"; cheap |
| 18 | Drop v25's early turn-back (LOOK); a train always runs end to end on its track | New | Recommended, with the corrected waits (finding 1). Owner question 1 |
| 19 | One lever per platform, one handle, for that platform's direction | New | Recommended: the platform is the direction, which keeps the owner's two-handle intent ("the next train heading my way") without sending you across the tracks. Supersedes his answer 2 of 10 November: owner question 2 |
| 20 | Terminal stubs, one platform, at the Village (both lines), Camp and the pier; no second platform or crossover there | New | Recommended. Bends "stations get two platforms" at the ends only; "turn back instead of reversing" is met in the decision's sense (no shuttling on one line), since a crossover terminus also reverses. One train per end block makes one platform enough |
| 21 | Far Head crossover at s 490–512 while it is the end; a middle halt with two platforms once the pier opens | Default | The only ground that fits |
| 22 | Left-hand running: the new track 4 m left, today's becomes down; up platforms at Quarry s 166–186 and Far Head 513–535, lat −5.7 to −8.2 | Default | The blockout's side with fewer clashes. Today's platforms (rack and town side at the Quarry) serve the homeward carry, so the footing ride home never crosses a track |
| 23 | Merges at line 1 s 36 and 182, line 2 s 34 and 556 | Default | Leaves the Village platform, Q1 frame and pier rack untouched |
| 24 | No loop on lines 1 or 2; the first is Ring Island's halt (v27), replacing the brief's "reverse pull-out" | New | Recommended. Measured: no end has room except Far Head, which stops being an end. Ring Island's brief changes; v27's plan owns that |
| 25 | Q6's kit loads onto whichever line-2 train stands at the Village first; the wagon couples to the first after `Shed.ready` and stays | Default | Keeps v25's service rules; a split kit only speeds Q6 |
| 26 | Frames found too close to the up track step out 1 m, decided at step 2's look | Default | Moot for trains in practice (finding 6) |
| 27 | The island map draws every train | Default | Telegraph; costs nothing |
| 28 | Sequencing: v26 alone, Ring Island build 1 renumbered v27 (build 2 v28) | New | Recommended. Ring Island R3 written against a one-train line is rewritten weeks later otherwise; "nothing waits on a world bump" makes two resets cheap. Renumbers the Ring Island decision: owner question 4 |
| 29 | Future lines' rows arrive with their areas, not installed parked now | New | Recommended. Departs the blockout's point 8 (a recommendation, not a decision): every area bumps anyway since 10 November |
| 30 | Each platform's lever keeps v25's enamel plaque naming the end it goes to (**Village**, **Pier**, **Far Head**) | Default, mine | Rule 1 (finding 3) |
| 31 | Far Head's up-platform lever is present but chained, its plaque "Pier", until Q6 opens the pier | Default, mine | Rule 1/3 (finding 4); doubles as the pier's telegraph |
| 32 | A plank crossing at the halt end of the Quarry and Far Head platforms | Default, mine | Finding 5 |
| 33 | The laying machine visibly lays both rails of each panel | Default, mine | Owner call "Machines show their work physically" (finding 8) |
| 34 | 4a's random-ask test also reports the worst wait per (halt, direction), bounded at about 60 s on line 2 | Default, mine | Finding 1; the number v27 sizes line 2's trains from |

**Counts:** 9 Decided, 18 Default (call 10's line 1 half and five rows this review adds, 30–34), 8 New (call 10's
line 2 half among them).

### Findings

1. **The wait numbers are wrong, and that matters for v27 (change before building).** "What players see" says the
   wait for a train your way is "at most about 35 s on line 2, about half of one train's". 35 s is the *minimum* gap
   the hold enforces at the ends, not a maximum. Line 2's cycle to the pier is 92.8 s (legs 13.6 + 23.2 + 16.0 s each
   way, 41.4 s end to end non-stop, two 5 s dwells), so two evenly spread trains pass a platform each way every
   ~46 s (average wait ~23 s); bunched to the hold limit, the gaps are 35 s and **58 s**, plus about 11 s per request
   stop the leader makes. v25's LOOK, for comparison, gave about 14–23 s typical and about 50 s worst (just missed
   outbound, turn at Far Head, back). So v26 is better on average and about level at worst, which still justifies
   dropping LOOK. But 58 s breaks Ring Island's grind budget ("no train wait longer than one leg", ring-island
   "Risks"; the longest line 2 leg is 23 s), and Ring Island's 0.76 km extension takes the cycle to roughly 170 s,
   where two trains give up to ~100 s. **Fix the text, add the worst-wait measurement to 4a's 2,000-tick test
   (call 34), and state in the plan that v27 sets line 2's `trains` from that bound** (likely 3). The idle evidence
   agrees this is the wait players feel: 21 s and 10 s idles at the quarry halt on 10 November, all waiting for
   line 2 (works-late-game, beat 3). Train-riding rec 6 ("easy to catch again") is the research behind the bound.
2. **The lever's serving train needs a visible sign (change before building).** "Your stop is your stop" is true in
   the sim, but on the platform a first train running through at 20 m/s while you hold a lit lever is exactly the
   owner's "it didn't stop for me" (10 November). The assignment is stable once made (a train that can brake keeps
   braking; one that can't passes and goes to the back of the circuit), so light v25's amber stop lamp on the serving
   train as soon as `trainServes` names it, for lever asks as well as cord asks. Then the train that runs through is
   visibly dark and the one behind is lit. Principle 7.
3. **Which platform goes which way must be readable (rule 1).** The plan drops the handle plaques with the second
   handle and adds nothing in their place. A player at the Quarry needs to know the far platform goes to the pier
   without trying it. Keep v25's enamel plaque on each platform's lever naming its end (call 30), and the engine's
   destination plate.
4. **Far Head's up platform is dead until Q6 (rule 1, rule 3).** Before the pier opens trains cross over at
   s 490–512, short of both Far Head platforms, so nothing ever runs past the new up platform. A player who pulls a
   live-looking lever there waits for a train that never comes. Chain its lever with a "Pier" plaque until Q6
   (call 31), and have the server refuse it until then (the plan's "the platform for `dir`" check should cover it;
   say so in 4a's server tests).
5. **Crossing between platforms.** The Quarry's up platform (centre about (1081.0, 31.3)) is about 10 m across both
   tracks from today's (1081.3, 41.1) and the rack (1088, 50). The homeward carry never crosses, but anyone riding out
   does, on foot over two running tracks at 20 m/s each way. Slapstick is fine (DESIGN 10), being hit while walking to
   the only way out is not. A plank crossing at the platforms' halt end (call 32) gives the walk a place; the bot
   should use it.
6. **The Q6-frame risk is smaller than stated.** No train runs on the up track past s 512 until the pier opens, which
   is Q6's completion, so nobody is feeding Q6's frame (s 544.5, 3.5 m from the up track) while a train passes it.
   Q2–Q5 are finished before the boiler fit. Keep the step 2 look for clearance, but the hazard in "Risks" can go.
7. **Decision text to update with the plan:** the Ring Island entry's "build 1 … v26 … build 2 (v27)" becomes v27
   and v28; ruling 11's single-laid stage is superseded by both tracks being laid together on the new bents;
   world-blockout's "Every terminus turns a train back without reversing it" and its scissors crossovers 35 m inside
   the terminus describe future lines, not lines 1 and 2's stubs; and the late game's answer 2 (two handles) if the
   owner takes question 2. None of this blocks the build; step 5 should list them.
8. **The laying machine must show both rails.** "Only the view draws two rails a panel" risks the second rail simply
   appearing. Owner call "Machines show their work physically": the gantry lays the pair (or two rails in sequence),
   and the magazine empties by two. Any future line's laying uses this, so it is step 2's job, not a later polish.
9. **The wagon service may slow slightly.** With `wagonCap` 6, the twelve pier footings take two laps, each through
   the Village end, where the second lap can now meet a headway hold of up to 35 s. The 10 November pair did the sets
   in 1:45; 4a's `npm run loop -- run` and the bot should report it, and a hold on a wagon-carrying train while the
   pier still owes footings is a reasonable exception to the hold if it costs more than one leg.

**Flow, beat by beat** (the stretch this plan changes most, the footing carry and the wagon; 5.6 m/s walk, 3.0 m/s
loaded):

| # | Leg | Positions (world m) | Time | Rule or lens |
| --- | --- | --- | --- | --- |
| 1 | Works rack → Quarry down platform | (1088, 50) → (1081, 41), 11 m | ~4 s loaded | Rule 1 needs the "Village" plaque (finding 3); no track crossed |
| 2 | Wait for a down train | | ~23 s average, ≤ 58 s (v25 LOOK ~14–23, ≤ ~50) | Train-riding rec 6; finding 1 |
| 3 | Ride Quarry → Village line 2 | 157 m of track | 13.6 s | One main line |
| 4 | Village halt → stall sockets | (928, 26) → (913, 19), 16 m | ~5.5 s loaded | Key in sight of lock (built) |
| 5 | Wagon: Village → Quarry → Far Head → pier, two laps | 713 m each way | ~105 s a lap plus a possible ≤ 35 s hold | Finding 9 |
| 6 | Pier rack → sockets, now 2 m west and 0.8 m further out | a few metres | unchanged within a second | Meeting place: the pier head |

The three rules hold once findings 3 and 4 are taken: the next goal is findable, no gate changes meaning (nothing is
carried less; the train still only skips distance), and nobody is stranded (every signal is on land, the stubs and the
crossover are two-way, gates are unchanged solo). Lenses: one main line per line and the Village as the meeting
place both hold. **Reach:** the up track and platforms sit at deck height beside today's, on flat ground; the wider
trestle decks give a walking strip beside the track over the sea that already existed as the track itself, so no new
travel edge. Proof is step 2's extended level-check and the bot through T1; until then it is the plan's measurement.
**Co-op:** two players asking opposite ways at one halt are now served by different trains on different platforms,
and a rider's ask can't be stolen; three players splitting Village / Quarry / pier each get a train within a minute.
**Solo:** the biggest gain, since the solo player has nobody to fetch a train for them.

**Suspect lines (copy):** none of The Boogler's. The plan adds no new copy; the plaques in calls 30–31 reuse v25's
draft words ("Village", "Pier", "Far Head"), still the owner's to reword.

### Owner questions

1. **Drop the early turn-back now that each track runs one way?** Recommended: **yes**. Two trains give about a 23 s
   average wait (58 s worst) against LOOK's 14–23 s (about 50 s worst); a mid-line turn would need crossovers and
   two-way signalling everywhere.
2. **One lever per platform, for that platform's direction, instead of your two-handled lever?** Recommended: **yes**,
   each plaqued with the end it goes to: it still means "the next train my way", without crossing the tracks.
   **Answered (owner, 10 November): "One lever per platform side", as recommended.**
3. **Line 2's second train: from the boiler fit, with the first?** Recommended: **yes**; they pass on the sea trestle
   about 20 s after the wake.
4. **Ship double track and the trains as v26 on their own, with Ring Island build 1 as v27?** Recommended: **yes**:
   two resets instead of one, but Ring Island is then written once, on two tracks.
5. **Size each line's trains by a wait target (no wait for a train your way over about a minute)?** Recommended:
   **yes**, which gives line 2 a third train when Ring Island extends it in v27.
