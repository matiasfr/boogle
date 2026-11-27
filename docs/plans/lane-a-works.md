> **27 November 2026.** Planner, against main `3eaea2137` (world v75), for [course-change](course-change.md#lane-a-know-where-the-work-is)'s Lane A; rebased onto `0c3423506` (Lane B's plan and the contribution clock; none of the files measured here changed). A0 in build detail; A1 to A3 as the one view-only branch after it; A4 as the list of every step type with its board line drafted. Nothing here waits for the owner. Design review [near the end](#design-review-2026-11-27); [open questions](#open-questions) last.

# Lane A: know where the work is

**Goal.** From anywhere, with no words read, a player can see where the room's work is and get there: one read over accepted railway state names the room's works (A0), a plume and pennant stand over it (A1), every station's board says what it needs and gives (A2), and Home's departures name the train that goes there (A3). Serves DESIGN.md **7. Telegraph everything**, **8. Enjoyable alone and together** (the drop-in guest first, as changed on 27 November) and **11. Show, don't tell** (where the work is, is always shown), under [the course change](../decisions-core-loop.md#d-2026-11-27-course-change) rules 1, 2 and 4. It bends none.

**Research.** [wordless-onboarding](../research/wordless-onboarding.md): recommendation 4, "lures beat arrows: a tall landmark seen from the start", is A1; recommendation 9, "the world itself plus one shared gauge", is A2's needs; recommendation 7, late joiners arrive near the action, is A3's facing. [ui-patterns](../research/ui-patterns.md): pick a side per piece of information; the works lives in the world (A1, A2), and Pause repeats A2 as an overlay because Pause is already the overlay. [progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) rule 1, "the next goal can be found", is what A0's test proves for every seed.

## What the code does today

The next step is worked out separately in each view and nowhere in the sim:

- **The leg view** (`src/entities/route-greybox/leg-view.ts`): `note()` (line 1354) walks `STEEL_OBJECTIVES` (line 148), `LEG_OBJECTIVES` (line 120) and `leg2Objective()` (line 1327) to one text and writes it only to the play record (`playObjective`). It says nothing until the stack line is reached.
- **The Home route** has no objective of its own. Its "where's the work" cues each decide alone: the forge call's plume (`src/entities/railway/forge-call.ts`, used by `boiler-view.ts` and `breaker-view.ts`) while a part waits on the pedestal; the halt maps' gold marks (`halts-view.ts` line 832: the seams while the breaker is out, the kiln until lit, `footingMark()` in `footing-cues.ts` for the stall then the pier); each frame's own sign (have/need per material); and `worksStage(w)` in `src/sim/railway-queries-works.ts`, a label read only by dev tools and `test/railway-works.test.ts`.
- **The loop graph** (`dev/loop/graph.ts`, `NODES`) is the one place that lists every step in order with its place, but it is dev-only and reads marks, not state.

## Design

### A0: the room's works

**Sync kind.** None of its own: a pure derived read of Server state (the railway), run on the server's world or on a client's mirror (`adapter.read.world()`). No state, no command, no wire, no save, no `WORLD_NS` bump. It is cosmetic to the rules: nothing in `src/sim` or `src/world` reads it, so it can never refuse or allow an action.

**File and function.** A new file `src/sim/railway-queries-room.ts`, beside `railway-queries-route.ts` and `railway-queries-works.ts`, with the header comment those files carry (one line per export). It is under `LOCKSTEP_FILES` (`src/sim/**`), so it keeps that lint: integers, `+ - * /`, no `Math.hypot`, no trig (distances are compared squared). It imports only `src/sim` and `src/ecs` (as its neighbours do).

```ts
/** A step of the route, as dev/loop/graph.ts names its node. */
export type WorksSite = 'wake' | 'T1' | 'T2' | 'T3' | 'forge' | 'Q1' | /* … every id in WORKS_STEPS … */ 'arrive';
/** A4's grammar: the kind of step, which says how the board draws its needs. */
export type WorksKind =
  | 'wake' | 'bill' | 'beam' | 'part' | 'boiler' | 'strike' | 'kiln' | 'footing' | 'cradle'
  | 'table' | 'install' | 'gate' | 'key' | 'barrier' | 'plug' | 'brace' | 'arrive';
export type WorksNeed = {
  what: 'logs' | 'stone' | 'rails' | 'beam' | 'boiler' | 'footings' | 'steel' | 'key' | 'train';
  have: number;
  of: number;
};
export type WorksGift =
  | { what: 'halt'; line: number; stop: number } // a stretch or section: the halt it opens
  | { what: 'opens'; site: WorksSite } // a key, gate, part or strike: the step it lets go ahead
  | { what: 'ability'; id: 'axe' | 'hook' } // the forge's proper axe, the hook shot
  | { what: 'trains' } | { what: 'footings' } | { what: 'wagon' } | { what: 'longer-boiler' } | { what: 'ending' };
export type RoomWorks = {
  site: WorksSite;
  kind: WorksKind;
  /** World cm: the active work target. Terrain-snapped sites without a catalog height use y = 0. */
  at: { x: number; y: number; z: number };
  /** One row per material still owed, in the frame sign's own have/of; empty for a press, take or strike. */
  needs: readonly WorksNeed[];
  gives: WorksGift;
  /** The rail ops that advance it (a view's thanks attribute accepted actions by these). */
  ops: readonly string[];
  /** The served halt nearest `at` (squared distance, every line's open stops), or null while no train runs. */
  halt: { line: number; stop: number } | null;
  /** The arrival is accepted: the route is finished and there is no works. */
  done: boolean;
};
export const WORKS_STEPS: readonly WorksStep[]; // the route in order: { site, kind, at, ops, gives, done(w), needs(w) }
export function roomWorks(w: World): RoomWorks;
```

`World` matches `legRow` and its neighbours and accepts the views' `ReadWorld` mirror too. The upgrade post is the one place the loop graph computes from view geometry. The query pins its rounded x/z (95,270 and 1,448 cm) and uses `SHED_TABLE.y`; the graph test checks all three coordinates.

**The ladder.** `WORKS_STEPS` follows the loop graph's route with the order rules below. `roomWorks` names the first step whose `done(w)` is false. Each place matches the corresponding loop graph node, using its catalog wherever the graph names one (`LINE1_STATIONS`, `LINE2_STATIONS`, `LINE2_FORGE`, `WORKS_SEAMS`, `legFrame`, `RAIL_GATES[…].at`, `RAIL_GRANTS[…].at`, `RAIL_ARRIVAL` and the rest).

The graph checks the catalog anchors. At runtime, `bents` follows the active jib as the railhead advances. A grounded boiler returns to the `boiler` pickup step at its accepted coordinates, with `rail.boilerTake`. Once held, the step returns to the fit at the old train. `T3` keeps its site and bill, but follows an available or grounded beam at its accepted coordinates with `rail.beamTake`. Once held, the target returns to the frame. Resolve these positions before choosing the nearest halt.

Accepted hand-ins fill their needs immediately. A fitted boiler waiting for the cart, or a full stretch or section waiting for its lay, stays current with no advancing ops. If T3 still needs logs after the beam is allocated, only `rail.deposit` advances it.

| Steps, in order | done when | kind | needs (have of) |
| --- | --- | --- | --- |
| `wake` | `rail.awake >= 0` | wake | none |
| `T1`, `T2`, `T3` | `job(k).completion` | bill; T3 beam | the station's logs (and T2's stone) as its frame's sign counts them (`delivered`, `stoneDelivered` of the bill); T3 also `beam` 0 or 1 (`allocated` during lay, `used` on completion) |
| `forge` | `forge.lit >= 0` | bill | 56 logs as its frame's sign counts them |
| `Q1` to `Q5` | `qjob(k).completion` | bill | logs and rails (`delivered`, `railDelivered` of the bill) |
| `lever` (after Q3), `hook` then `sea` (after Q4) | `rail.lever`, `rail.hook`, `rail.sea` | gate; hook key | none (the sea switch: `key` 0 or 1, the hook) |
| `boiler`, `trains` | `boiler.state` is `held` or `fitted`; `rail.trains >= 0` | boiler | `trains`: `boiler` 1 of 1 as soon as fitted, even while the cart returns |
| `breaker`, `slab`, `throat` | `works.breaker >= 2`; `seams & SEAM_STALL`; `seams & SEAM_THROAT` | part; strike | none |
| `kiln` | `works.lit >= 0` | kiln | `WORKS.kilnLogs` logs, `WORKS.kilnStone` stone (`works.logs`, `works.stone`) |
| `stall` | `shed.stall >= WORKS.stall` | footing | 2 footings |
| `cradle` | `shed.fitted >= 0` | cradle | 8 rails (`shed.cradleRails`) |
| `Q6` | `qjob(5).completion` | bill | as Q1 |
| `table`, `upgrade` | `shed.table !== 0 \|\| shed.ready >= 0`; `shed.ready >= 0` | table; install | none |
| `crossing` | `works.crossing >= 0` | footing | `WORKS.pier` footings (`works.pierSet`) |
| `Q7` | `qjob(6).completion` | bill | as Q1 |
| `bents`, `brace`, `weights`, `rivet` | `aperture.set >= WORKS.ring`; `brace !== BRACE.RAISED`; `cw >= WORKS.counterweight`; `joined >= 0` | footing; brace; footing; strike | 14 and 4 footings |
| `steelworks` | `steel.lit >= 0` | bill | `STEEL.logs` logs, `STEEL.rails` rails (`steel.logs`, `steel.rails`) |
| `install` | `line(LINE2).boiler >= 2` | install | `steel` 0 or 1 (`shed.steel > 0`) |
| `stack-1` to `stack-4` | `legRow(stack).laid >= n` | bill | the open section's logs and rails (`legRow.logs`, `.rails` of `RAIL_LEGS[k].sections[laid]`) |
| `pick`, `incline-gate`, `incline-1`, `incline-2`, `seeds`, `bay-1`, `bay-2` | the grant's or gate's bit in `routeRow`; the leg's `laid` | key; barrier; bill | sections as above; a barrier: `key` 1 of 1 once its grant is held |
| the fork: `plug-gate`, `cave-1..3`; `canopy-gate`, `canopy-1..3`, `cloth` | as above | plug; barrier; bill; key | as above |
| `wall-1..5`, `deep-gate`, `wall-6`, `notch-gate`, `notch-1`, `lantern`, `causeway-gate`, `causeway-1`, `arrive` | as above; `arrive`: `routeRow.arrived >= 0` | bill; barrier; key; arrive | `arrive`: `train` 0 or 1 (`routeRow.reached >= 0`) |

The four order rules (each a design call, reviewed below):

1. **A part on the forge's pedestal is the works.** From the boiler fit, the breaker and the Works chain (`breaker` to `cradle`) come before `Q6`, which comes before the `table` that needs it. This is the order the forge call already whistles.
2. **The hook is named just before the sea switch,** the first step that needs it, not after Q2.
3. **The steel loop (`steelworks`, `install`) is named after the rivet only while the stack line is not done** (the leg view's own rule today). Once the stack is laid it is skipped whether or not it was finished: nothing on the route needs it.
4. **At the fork after `bay-2`, a branch begun is finished first** (the canopy barrier open: the Canopy branch; the plug open: the cave branch); **with neither begun, the cave branch** (its first frame and stocked rack stand at the West landing, 15 m from the dock where a guest lands). When both barriers are open, the cave branch keeps the default priority until complete. The gate bits carry no opening order.

Folded into their next step, not sites of their own: the great beam (into `T3`), the pier show (none: `Q6`'s completion), High Gorge's step-off (into `pick`), the steel kit's ride and the steel's ride home (into `steelworks` and `install`), and the ride to the Original Island (into `arrive`). Never sites: the optional nodes (`jump`, `axe`, `pack`, `yoke`, `glider`), trade picks, town buys and the garage's Quick or Strong. After the arrival `roomWorks` returns the `arrive` step with `done: true`.

**`gives`.** Static per step: a section gives the halt reached by its new track (matching `leg` slot and section in `RAIL_HALTS`); a Q stretch gives the line 2 halt it opens, if any, else `opens` the next work step. A key gives `opens` its barrier, and a gate gives `opens` the stretch behind it. `forge` gives the proper axe, `hook` the hook, `trains` trains, `kiln` footings, `cradle`, `table` and `upgrade` the wagon, `install` the longer boiler, and `arrive` the ending.

**`halt`.** The halt nearest `at` by squared world distance among every line's open stops (`trainStops(w, line)`, a prefix of `RAIL_LINES[line].halts`; each halt's `platforms[0]`), or null while `rail.trains < 0`. Passed heads closed in both directions remain in that prefix and are excluded with `trainPassesBy`.

### How each objective source maps onto it

| Today | Becomes |
| --- | --- |
| `STEEL_OBJECTIVES.kit`, `.feed` | `steelworks` |
| `STEEL_OBJECTIVES.cast`, `.install` | `install` |
| `LEG_OBJECTIVES.first`, `.next(n, of)` | `stack-1`, `stack-n` |
| `.open` | `pick` |
| `.gate`, `.incline` | `incline-gate`, `incline-1` and `incline-2` |
| `.seeds`, `.bay` | `seeds`, `bay-1` and `bay-2` |
| the inline "Build the line to Canopy Town or the cave line to Port Quay" | `plug-gate` (rule 4) |
| the inline "Ride to Bell Rock and build the line to Canopy Town", `.canopyGate`, `.canopy`, `.cloth` | `canopy-gate`, `canopy-1..3`, `cloth` |
| `.plug`, `.cave` | `plug-gate`, `cave-1..3` |
| `.wall`, `.deepSpan` | `wall-1..6`, `deep-gate` |
| `.notchGate`, `.notch`, `.lantern`, `.causewayGate`, `.causeway` | `notch-gate`, `notch-1`, `lantern`, `causeway-gate`, `causeway-1` |
| `.island`, `.arrived` | `arrive` (`done` false, then true) |
| the forge call (boiler, breaker) | `boiler`, `breaker`: A1 draws no second plume there |
| the halt maps' gold marks: the seams, the kiln, `footingMark` | `slab`, `throat`, `kiln`, `stall`, `crossing`; they stay as they are (A4 may fold them into A2's board) |
| `worksStage(w)` | unchanged; its label is for dev tools, and `roomWorks` does not replace it |

The leg view's texts go to the play record keyed by site in A1 to A3's step 1 below, and `LEG_OBJECTIVES`, `STEEL_OBJECTIVES`, `steelStep` and `leg2Objective` are deleted there. A0 itself touches no view.

### Who reads it

- **A1, the works signal** (`src/entities/railway/works-signal.ts`, new): `at`, `site`, `done`.
- **A2, the station board** (`src/entities/railway/works-board.ts`, new, and Pause): `site`, `kind`, `needs`, `gives`, `ops` (thanks), `done`.
- **A3, the train to the works** (the board's departure row, the engines' pennant, the landing): `halt`.
- **The play record** (`playObjective`): `site`, so `objective` marks run from the wake, not from the stack line.

Every reader calls `roomWorks(adapter.read.world())` at the head of its frame or on a changed world revision, as the leg view reads rows today, and keeps nothing from a world.

### A1 to A3: the view branch

All Local, reading A0. No state, wire, save or command.

- **A1, the works signal.** One plume and one pennant. The plume is the forge call's: export `PLUME` and `STEAM` from `forge-call.ts` and draw a column of the same puffs, material, height (62 m) and lean, rising from `at`, with `fog: false` on its material so it reads past the fog's 180 m start out to the farthest works (3.0 km). The pennant is a gold flag (`GOLD_ROPE`'s gold, the works' gold of [works-signposting-2](works-signposting-2.md)) on a thin mast 6 m over `at`, with no collider. When the site moves, the old column thins out over 2 s while the new one rises; a restore, a late join or a reload shows it whole at once, as the forge call does. No plume of its own where the forge call is already up (`boiler`, `breaker`); the pennant still flies. Nothing while `done`. No sound: the forge call keeps the whistle.
- **A2, the station board.** One board design, drawn by `works-board.ts` with `signBoard` (`src/render/sign-board.ts`) and the bills' own icons (the stock signs' log, stone and rail glyphs, the gold footing and boiler outlines): four rows, the works' name, its needs as icon and `have / of`, what it gives, and the names of who gave. It hangs on posts that already stand wherever one exists: the halt map displays (`haltDisplays` in `halt-map.ts`: Village, Camp, Quarry, Far Head, the Pier, the stack heads, High Gorge) and the row lines' departure boards (`leg-view.ts`, every built leg halt). New posts: one in Home's hall (`HALL`, `src/place/home-station.ts`), and one on the dock (the West landing's board, standing from the start, at world (808.2, 13.5): see [Level findings](#level-findings)). The thanks come from [Lane B](lane-b.md#reads-for-lane-as-board)'s `worksThanks(w)` (durable Server state: everyone who gave at Home or fed a leg frame since the last lay, first-sight order) once its step 2 is on main, for a works that is a route section; Lane B's `giftQueued` and `giftAboard` add a fifth row, "On the way", while `giftRides(w)`. For any other works (the Home route's bills, the kiln, the footings), and for every works before Lane B's step 2 lands, the thanks are the names this page saw: `adapter.onAccepted` events whose `op` is in the works' `ops`, while that site is the works. Either way names come through the roster, unranked, no counts, at most six; a new site clears the Local list. Pause's first page shows the same rows, above the existing name and Live count.
- **A3, the train to the works.** The board's last row names the train: the line and the halt nearest the works (`halt`), "walk" while it is null or while the works is within 150 m of this board. Every train on `halt.line` wears the same gold pennant on its engine's roof. A fresh player and a late joiner already land on the dock facing inland; the dock board stands in that view, so the landing's yaw stays as the 15 November start-area S3 call set it. A reload that falls back to a halt landing faces that halt's board instead of the track; a reload to its remembered spot keeps its own facing.

## Steps

Each step leaves `node dev/ship-check.ts` green. The checkpoint, its full check, bots and `test:net` are the course change's, not these steps' ("Build more, test less").

### A0 (one branch, `src/sim`: an independent review before merge)

- [x] **1. The query.** Create `src/sim/railway-queries-room.ts` as [Design, A0](#a0-the-rooms-works) says: the types, `WORKS_STEPS` (route order, places checked against `dev/loop/graph.ts`), `roomWorks(w)` with the four order rules, and the private `nearestHalt(w, at)`. Import nothing from `dev/`, `src/entities` or `src/world`. Verify: `node dev/ship-check.ts`.
- [x] **2. The test, in two existing files.** A0 is lockstep code by `LOCKSTEP_FILES`, so a test file of its own would be allowed; none is needed, because the golden shards already build every seed once.
  - `test/helpers/railway-golden.ts` (the shared body of `test/railway-golden-<n>.test.ts`): in `goldenShard`, beside `verdicts`, record `roomWorks(built)` per stage (on the built world, before the tick pass), and add per stage `seed stage <stage>: the room's works is <site>`, asserting `done` is false except at `arrived`, `site` equals the pinned table below, `at` equals the step's catalog place, every `needs` row has `0 <= have <= of` (a full frame still laying, as at `q5-finishing`, reads `have === of`), and `halt` is null exactly while `rail.trains < 0` and otherwise one of that line's open stops. In shard 0 also: a fresh `createRailway()` world names `wake`. The pinned table is a `const WORKS_AT: Record<SeedStage, WorksSite>` in the helper; the golden fixture JSON is not touched (owner call "Seed-only goldens").
  - `test/loop-graph.test.ts`: every `WORKS_STEPS` site is a `NODES` id and its `at` equals that node's `at` (x and z; y where the node has one), and every non-optional `NODES` id is either a `WORKS_STEPS` site or one of the folded ids (`beam`, `pier`, `gorge`, `steelkit`, `steelhome`). No order check: the order rules and the fork move steps against `NODES` on purpose, and the seed table pins the order.
  - Verify: `node --test test/railway-golden-*.test.ts test/loop-graph.test.ts`, and `node dev/ship-check.ts`.

The pinned table (each row run on main `3eaea2137` with a scratch copy of this ladder over `buildSeedWorld`):

| Seeds | Site |
| --- | --- |
| a fresh world | `wake` |
| `awake` | `T1` |
| `t1-pack-first`, `t1-jump-first` | `T2` |
| `forge-frame-last`, `forge-lit-last` | `forge` |
| `q1-last` | `Q1` |
| `q1-done`, `q2-stocked`, `q2-arriving` | `Q2` |
| `hook-taken`, `q3-stocked`, `glide-earned` | `Q3` |
| `q3-done`, `hook-earned` | `lever` |
| `q4-stocked`, `q4-arriving` | `Q4` |
| `q4-done`, `q5-arriving`, `q5-shelved` | `sea` |
| `sea-open`, `q5-stocked`, `q5-carry`, `q5-finishing` | `Q5` |
| `q5-done`, `boiler`, `boiler-camp` | `boiler` |
| `trains-on`, `freight-running`, `fares-running`, `house-ready`, `house-built`, `sack-waiting`, `yard-ready`, `yard-built`, `q6-stocked`, `q6-finishing`, `q6-done`, `works-arrive` | `breaker` |
| `works-open`, `works-stocked` | `kiln` |
| `works-lit` | `stall` |
| `stall-done` | `cradle` |
| `cradle-fitted` | `table` |
| `wagon-on`, `yard-wagon`, `crossing-finishing` | `crossing` |
| `crossing-done` | `Q7` |
| `deck-laid`, `yard-deck` | `bents` |
| `gap-footed`, `leaf-raised` | `brace` |
| `ring-joined`, `steel-kit`, `gorge-open`, `gorge-mid` | `steelworks` |
| `steel-lit`, `steel-home` | `install` |
| `boiler-long` | `stack-1` |
| `gorge-reached` | `pick` |
| `incline-open` | `incline-1` |
| `incline-mid` | `incline-2` |
| `bell-reached` | `seeds` |
| `bay-open` | `bay-1` |
| `bay-mid`, `trade-ready`, `trade-fitted` | `bay-2` |
| `bay-reached` | `plug-gate` |
| `canopy-open`, `trade-held` | `canopy-1` |
| `canopy-mid` | `canopy-2` |
| `canopy-reached` | `cloth` |
| `cave-first-open`, `cave-open` | `cave-1` |
| `cave-mid` | `cave-2` |
| `cave-first-reached` | `canopy-gate` |
| `port-reached`, `quay-garage` | `wall-1` |
| `wall-mid` | `wall-3` |
| `wall-deep` | `deep-gate` |
| `wall-closed`, `notch-open` | `notch-gate` |
| `notch-reached` | `lantern` |
| `causeway-open` | `causeway-1` |
| `island-reached` | `arrive` |
| `arrived` | `arrive`, `done` |

The table applies the steel folds (`steelkit` into `steelworks` and `steelhome` into `install`) to the scratch run. The review fix moves `boiler-camp` from `trains` to `boiler` because that seed drops the part at camp.

**A0's proofs:** the two test files above, and its independent review. **Model rows** (`npm run models`): the build is "Implementation from a brief or an approved plan", Codex `gpt-6.2-sol` medium; the review is "Independent review before merge of src/sim", a fresh `gpt-6.2-astra` medium delegate with none of the builder's context, one failing test per suspected defect. Ship with `npm run ship`.

### A1 to A3 (one branch after A0 is on main, view only: one look and one review)

- [ ] **1. The play record reads A0.** In `leg-view.ts` delete `LEG_OBJECTIVES`, `STEEL_OBJECTIVES`, `steelStep`, `leg2Objective` and `note`'s ladder; `note` becomes `playObjective(WORKS_LINES[site].objective)` on a site change. Create `src/entities/railway/works-lines.ts` with, per site, the board's drafted words (name, gives) and the play record's objective line (today's texts moved over word for word where one exists, drafted for the rest), headed "Drafted for the owner's edit; none is The Boogler's" and with each drafted line marked `draft:` as the flow decision's rule 6 asks. Mount `createWorksSignal` and `createWorksBoard` (steps 2 and 3) from the railway's works seam (`railway/works-live.ts`), as the leg view is (docs/agents/plugins.md for the lifecycle). Verify: `node dev/ship-check.ts`.
- [ ] **2. A1, the signal.** `src/entities/railway/works-signal.ts`: the column and pennant above, `export { PLUME, STEAM }` from `forge-call.ts` (no other change there), and the pennant as its own `createPennant(owner)` export, which [Lane B](lane-b.md)'s step 4 hangs on Home's log bin once this is on main. Verify by the step's look below.
- [ ] **3. A2, the board.** `src/entities/railway/works-board.ts`: the four rows, painted on the halt displays (`halts-view.ts` gains one face per display, below its map) and the leg view's departure boards (one more face each), on a new post in the hall (`home-station-view.ts`) and a new post on the dock (`src/place/` scenery beside the shore path, with its collider as the hall's furniture has, and the level check's own line for it: see [Level findings](#level-findings)); Pause's first page (`src/features/pause.ts`). The thanks and the On-the-way row as [Design](#a1-to-a3-the-view-branch) says: Lane B's reads where they are on main, `adapter.onAccepted` for the rest.
- [ ] **4. A3, the train.** The board's train row from `halt`; the pennant on every engine of `halt.line` (`train-view.ts`); a halt-landing return faces that halt's board (`src/place/return-spot.ts`, the yaw its fallback already computes, aimed at the board's post instead of the track).

**The branch's proofs** (the greybox tier: one look, one review, no frame-time reading or rejoin proof):
- **One look, from Home's dock and from Ring Island**: `npm run look` stills at `--rail-seed canopy-mid` (the works 1.5 km from the dock, 1.95 km from Ring Island), `--rail-seed works-open` (the kiln, 336 m from the dock) and `--rail-seed q5-stocked` (Q5, where the loop measures the second-worst detour), each from the dock's landing at the player's eye and from Ring Island's halt, plus one still of the dock board and of Pause at phone width (390 × 844). The main session reads them ("Visual review" row: Claude Opus medium).
- **A fresh bot reaches the works from the dock using only what the board names**: `dev/look/evals/railway-works-board.ts`, from the dock at `--rail-seed canopy-mid` and at `works-open`, reading only the board's rows (the halt it names, the works' name), riding with the existing bot's ride helpers (`dev/look/bots/railway.ts`) and walking to the pennant, then feeding one load; no teleport, no direct op.
- **One review**, where `npm run review-stamp` asks.
- **Model rows**: the build is "Player-visible implementation", Codex `gpt-6.2-astra` medium; the look is the main session's.

### A4 (design first, then view work: no build in this plan)

The list below is the deliverable; its verdicts are reviewed with this plan. A step that cannot be said as needs and gives is changed or cut. The board lines are drafted placeholders for the owner's words ("The works", "Needs", "Gives", "Thanks" are the course change's placeholders); `[log]` and the like are the bills' icons.

| Step type | Steps | Board line (draft, owner's edit) | Verdict |
| --- | --- | --- | --- |
| Wake | `wake` | **The camp's track layer** · Needs: someone to wake it · Gives: your first axe | Fits |
| Bill | `T1`, `T2`, `Q1` to `Q7`, `forge`, every route section, `steelworks` | **Station 4** · Needs: [log] 18 / 32 · [rail] 2 / 6 · Gives: the line to the Quarry | Fits |
| Great beam | `T3` | **Station 3** · Needs: [log] 20 / 32 · [beam] 0 / 1 · Gives: the line to the forge | Fits |
| Boiler | `boiler`, `trains` | **The boiler** · Needs: [boiler] 0 / 1 to the old train · Gives: trains on both lines | Fits |
| Part | `breaker` | **The breaker** · Needs: someone to carry it to Split-rock · Gives: the slab split | Fits (a type the course change's list lacks) |
| Strike | `slab`, `throat`, `rivet` | **The stall slab** · Needs: one strike of the breaker · Gives: room for the stall | Fits |
| Kiln | `kiln` | **The kiln** · Needs: [log] 4 / 16 · [stone] 9 / 16 · Gives: footings | Fits |
| Footing | `stall`, `crossing`, `bents`, `weights` | **The pier crossing** · Needs: [footing] 5 / 12 · Gives: the line to the Railhead | Fits |
| Cradle | `cradle` | **The cradle** · Needs: [rail] 3 / 8 · Gives: the footing wagon | Fits |
| Table | `table`, `upgrade`, `install` | **The Roundhouse table** · Needs: a turn of the handle · Gives: the wagon on line 2 (`install`: Needs [steel] 0 / 1 · Gives: the longer boiler) | Fits |
| Gate | `lever`, `sea` | **The sea switch** · Needs: [key] the hook shot · Gives: the sea road to Station 8 | Fits |
| Key | `hook`, `pick`, `seeds`, `cloth`, `lantern` | **The powered pick** · Needs: someone to take it · Gives: opens the incline's barrier | Fits |
| Barrier | `incline-gate`, `canopy-gate`, `deep-gate`, `notch-gate`, `causeway-gate` | **The incline's barrier** · Needs: [key] the powered pick (held) · Gives: the incline's first frame lays | Fits |
| Plug | `plug-gate` | **The sea-cave plug** · Needs: [key] the powered pick (held) · Gives: the cave line | Fits (a barrier with its own model) |
| Brace | `brace` | **The raised leaf** · Needs: one knock of the pawl · Gives: the leaf comes down | Fits |
| Arrive | `arrive` | **The Original Island** · Needs: a train there, then everyone to the meeting post · Gives: the ending | Fits |
| Waits | the steel kit's ride, the steel's ride home, the island ride | (no line of their own) | **Changed** in A0: folded into the next doable step |
| Shows and step-offs | the pier show, High Gorge's step-off | (no line of their own) | **Changed** in A0: folded |
| The halt maps' gold marks | seams, kiln, footings | — | **A4 question**: once the board stands at every halt, the marks say the same thing twice; recommended to keep them through the checkpoint and judge them in the first guest session's stills |

Each A4 row's next step, as one backlog line: *"A4: every step reads as needs and gives on the board; two kinds folded in A0, the halt maps' gold marks judged after the first guest session."* A change A4 makes to a step's rules (none is proposed) would be the planner's (`npm run models`: "Planning high-risk work", Claude Opus high); a wording pass on these lines is the owner's.

## Level findings

`npm run level-check` on main `3eaea2137`: exit 0, 29 reports, all `ok` (classic and its four layouts, place, ring, both rotundas, route leg 2, track continuity). It has no rule for a signal, a board or a facing, so the planned positions were measured with a scratch script over the loop graph's places (`NODES`), `src/place/layout.ts` (`LANDING`) and `src/place/terrain.ts` (`H`):

1. **A1 places nothing a player must reach.** Mast and plume have no collider, so nothing in the world gets blocked or reached early. Every site with a catalog height is above the sea (lowest `arrive`, 2.3 m; highest `pick`, 85 m); the station frames without one stand on Home's ground.
2. **The signal's reach.** The farthest works from the dock is `lantern`, 2,618 m; from Ring Island, `lantern`, 3,043 m. The fog runs from 180 m to 3,600 m (`FOG_NEAR`, `FOG_FAR`), so at 3 km a fogged column is 84% fog colour: hence `fog: false`. A 62 m column at 3 km stands about 1.2° high, about 20 px on a 1080 px screen at the default field of view; the look judges it.
3. **The dock board.** It stands at world (808.2, 13.5), 8 m ahead of the landing (801, 10) on its existing facing (yaw −π/2 − 0.45), on the landing pad's ground (3.00 m; the pad is flat to 9 m, then rises to 3.13 m at 10 m). It is 3.5 m north of the shore path's first leg (centre z 10, 3 m wide), so 2.0 m clear of its edge, and 9.7 m from the cave line's first frame and plug (810, 23), 27 m and 21 m from the two West landing halts. It is inside `coveProtection`'s 16 m landing disc and the trees' 9 m protected circle, which keep generated scenery away, not placed posts. Not measured: whether the landing's own clearance check (saves reject "scenery obstructing the landing") reaches 8 m. Step 3 confirms it still passes with the post standing, moves the post along the same facing if not, and gives the level check one line for it: "dock board: on the pad, clear of the shore path and the landing".
4. **The hall board and Lane B's rack.** Lane B's [watch item](lane-b.md#reads-for-lane-as-board) asks that Home's board be in sight of the Village rack (`HALT_YARDS[0]`, (905, 1)). The hall (`HALL`, world (909.8, 11.0)) is 11.1 m from it; the look's hall still is taken from the rack.
5. **A3 moves no landing.** The fresh landing keeps its place and yaw; the halt-landing return's yaw changes, not its position.
6. **Nothing is reachable before its ability.** A0 and A1 to A3 change no collider but the dock post, which gates nothing.

## Risks

- **Room safety.** No "Don't" in docs/agents/room-safety.md applies: no command, apply, presence, transport or save change. A0 cannot refuse or allow anything.
- **Mixed builds.** None: no wire, state or catalog change, no `WORLD_NS` bump. An older page just lacks the views.
- **Hotspots.** `leg-view.ts` (1,566 lines) and `halts-view.ts` (958) are shared with the lap ([greybox-lap](greybox-lap.md), in flight by the course change; `npm run inflight` lists nothing unmerged on wip/, ship/ or claude/ today) and [port-quay-roundhouse](port-quay-roundhouse.md) steps 1 and 2 (building). The view branch rebases on whichever lands first. If the lap adds steps to the route, they join `WORKS_STEPS` and the pinned table in the same branch that adds them.
- **Drift.** `WORKS_STEPS` and `dev/loop/graph.ts` both list the route. The loop-graph test's cross-check is the guard: a node added to one and not the other fails it.
- **Performance.** A0 runs once per frame per reader on a mirror; it is a short ladder of row reads, well under the views' own reads. A1 adds one instanced mesh (33 puffs) and two small meshes, one draw each, no shadows, as the forge call does; A2 adds one canvas texture per board face, repainted on a change. Report `npm run perf` at the branch's look if a still looks heavy; it is not a reason to cut ([owner call](../agents/owner-calls.md#performance-guides-not-gates)).

## Design review (2026-11-27)

Reread from the top. Sources read this session: DESIGN.md's principle list, [course-change](course-change.md), the two 27 November decisions, the owner-calls index, the research above, the loop (`npm run loop`, every beat), the code named in this plan, and the level check. No Place port.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | One works at a time, the first unfinished step of the route in its built order | Decided | [course change](../decisions-core-loop.md#d-2026-11-27-course-change) rules 1 and 2 |
| 2 | Optional abilities, trade picks, town buys and the garage's Quick or Strong are never the works | Decided | DESIGN.md 3 (side activities never required); the course change's rule 1 (the picks already built stay as built) |
| 3 | A part on the forge's pedestal is the works: the breaker and the Works chain before Q6 | New | Recommend: the forge call already whistles for it, so a second plume at Q6 would contradict it; it keeps a guest's first job after the trains on Home, 122 to 336 m from the dock, against Q6's 604 m. The seeds keep their Q6-first order; the ladder names the same steps in either order |
| 4 | At the fork after the bay cut: a begun branch first; with neither begun, the cave line | New | Recommend: its first frame and stocked rack stand 15 m from the dock, so a guest's nearest help is that work; the rules keep both branches open, only the signal picks |
| 5 | The hook is named just before the sea switch | Default | The first step that needs it; the Q3 seeds read Q3, not the hook |
| 6 | The steel loop is named only while the stack line is not done | Default | The leg view's rule as shipped; A4 can cut it from the ladder if the first sessions never do it |
| 7 | Waits, shows and step-offs fold into their next doable step | Default | A board never names a step with nothing to do |
| 8 | The seeds before the bay cut | Default | [greybox-leg2](greybox-leg2.md) objective order as built |
| 9 | After the arrival there is no works; the signal stands down | Default | The ring is finished; the lap adds no step |
| 10 | The signal is the forge call's 62 m column with fog off, a gold pennant on a 6 m mast, a 2 s hand-over, no sound | Default | The course change's call 6; gold is the works' colour since works-signposting-2 |
| 11 | No plume of its own where the forge call is up; the pennant still flies | Default | Avoids two columns on one pedestal |
| 12 | The board's thanks: Lane B's durable `worksThanks` for a route section once it is on main; otherwise the names this page saw give to the current works; unranked, at most six | New | Recommend: Lane B's record covers its gifts and leg feeds only; for the rest a Local list is honest with no state change, and a late joiner sees fewer names there. Thanks stay unranked ([Thanks](../decisions-core-loop.md#d-2026-11-02-thanks)) |
| 13 | The dock carries a station board from the start, in the landing's existing view; the landing's yaw is unchanged | New | Recommend: the hall is 109 m from the landing, too far to read on landing; the board stands as the West landing's, the halt Home's other lines leave from. The 5 November removal of the fork boards was of wayfinding posts, not a station board; the course change's rule 2 allows a board at every station |
| 14 | A reload to its remembered spot keeps its facing; a halt-landing return faces that halt's board | New | Recommend: turning a player who reloaded mid-carry is disorienting. This narrows the course change's "a reload stands facing the board" to the reload that lands at a halt |
| 15 | The board's train row: the served halt nearest the works by straight line, "walk" under 150 m or before trains run; every engine on that line wears the pennant | Default | Cheap to tune after the bot's proof |
| 16 | The board lines and objective lines in `works-lines.ts`, and A4's drafted lines | Default | Placeholders for his words (the course change's question 3); none is The Boogler's |
| 17 | A4's verdicts: every step type fits; waits and shows folded; the halt maps' gold marks judged after the first guest session | Default | A4's one design review is this one |

**Counts:** Decided 2, Default 10, New 5 (calls 3, 4, 12, 13, 14).

**Findings.**

1. **The first guest meets the board before the works.** A guest lands facing the dock board, which names Station 1 in a fresh room. In a running room it names whatever the works is, often 1 to 2 km off. That is the drop-in case the checkpoint measures, so the bot's proof starts at the dock at `canopy-mid`, not at Home's hall. Changed: A1 to A3's proofs.
2. **Co-op split.** Two players can work two steps at once (Q6 beside the breaker, both branches of the fork). The board names one; the other still lays, with its own frame sign and the existing halt marks. Nothing refuses it. No change.
3. **Solo.** A solo player gets the same ladder. Calls 3 and 4 put solo work near Home where the route allows it. No change.
4. **A late joiner** gets the signal whole on the first frame (A1's restore) and sees fewer thanks (call 12). No change.
5. **The loop's evidence.** `npm run loop`'s calibrated beats (T1, T2, Q1, Q2, Q5, the beam) show the largest detours at Q2 (×7.5) and Q5 (×6.8), where players searched for the next thing. Those are A1's first test, so the look includes `--rail-seed q5-stocked` from the dock as a third still. Changed: A1 to A3's proofs list it.

Flow rules: (1) the next goal can be found: A0's test proves a site at every seed, and A1 shows it; (2) gates keep their meaning: no gate changes; (3) nobody is stranded: no one-way changes. Every Default and New call above is logged in [agent-calls](../agent-calls.md) and proceeds.

## Open questions

None waits on the owner. Each proceeds on its recommendation:

1. **Breaker before Q6** (call 3). Recommended yes; reversible by moving one row of `WORKS_STEPS`.
2. **Cave before Canopy at the fork** (call 4). Recommended yes; one constant.
3. **The board's words**: his to reword in `works-lines.ts`; the build ships the drafts.

## Suspect or placeholder lines

None of The Boogler's copy is touched. The leg view's objective texts move to `works-lines.ts` word for word; several already read "(placeholder)" (the White Wall, the deep span, the Notch, the lantern, the causeway, the island) and stay so marked for his edit.
