> **Status: plan, part built (2026-11-10; amended the same day for the owner's four answers and for v26 as merged).**
> Ring Island build 1, "the line reaches the island", `WORLD_NS` v27. On main: step 0, R1, R2a, R2b, R2c. v26 is on
> main (#1467), and R3a–R5 below are rewritten against its code, not its plan. **The owner overruled R1's turning loop**
> ("Ring Island while it's the end of the line: Buffers about 15 m past the halt, with a crossover before it"): step
> R1b amends the layout, R2d the near view, and R3a is a buffer terminus with a crossover, written as Far Head's end is.
> **Cleared to build now:** R1b (alone, no bump, independent sim review), then R2d. R3a–R5 wait only for R1b on main:
> the designer read the amendment's calls (40–52) and ruled on the Pier, 10 November
> ([the Pier at v27](#design-review-the-pier-at-v27-designer-2026-11-10)). **The Pier's platform and rack stand east
> of the down track from the day the halt drops in at Q6, so nothing is lifted or moved when Q7 is laid** (calls
> 53–61 replace call 48); R4a's pier hunk no longer waits. The first review, of the plan before the amendment, is
> [below it](#design-review-designer-2026-11-10).
>
> **Owner's answers of 11 November** ([decision](../decisions-rail.md#d-2026-11-11-ring-island-views-open-calls-answered)):
> keep trains visible while actions wait on the server; the plan's two prompts ("Knock out the pawl", "Hang the weight");
> "Station 7" and the "Ring Island" lever plaque, and the jump-in labels, kept as built; the halt map's smaller names
> and Ring Island from the Pier laid (as the designer recommended); the glide-only secret boxes stay at the Pier laid.
> Queued, not built: the trains fix and the two prompts. The halt map (calls 66 to 70) is built, 11 November.

# Ring Island build 1: the line reaches the island

**Goal.** Line 2 runs on from the pier head over seven more bents, bowing down at 4%, to meet the island folk's
orange half-crossing. One player glides the gap and braces their raised leaf, the jib hangs four footings on its
counterweight, the leaf drops onto the bents, anyone strikes the gold rivet and the whole room gets the shot; then
trains run to the island halt and turn back at its buffers, over the crossover on the Way. Serves **7. Telegraph everything** (the raised leaf reads from
Home and the telescope before you reach it; every new step has a cue in the world) and **8. Enjoyable alone and
together** (the glide and the railhead face each other across the gap; brace and counterweight in either order; the
shot is the room's). The missed glide and the swim round are **10. Slapstick over precision**. It bends nothing; one
budget in the brief can't hold as written (design review call 26).

**The owner's answers (10 November 2026), binding here.** His words, and what each changes:

1. "Ring Island while it's the end of the line: Buffers about 15 m past the halt, with a crossover before it".
   Overrules calls 12 and 15, the brief's "the island halt is the first turning loop" and R1's `RING_LOOP` as part of
   line 2. Steps R1b, R2d and R3a; no loop leg, no `railLoopSpeed`, no train is ever turned round.
2. "Get unstuck on the island before the Meet: It returns you to your own side (the Pier halt)". Call 31's target is
   the Pier halt for all of build 1, as R2b built it (`ringUnstuckHome`); R4b no longer re-points it at the railhead's
   land pad.
3. "The raised drawbridge seen from Home: Leave it at true scale". The leaf is 17 × 7.6 m in the near and the far
   view; no step scales, thickens or lengthens it for the view from Home, and Level finding 5's 8 px there is accepted.
4. "The Pier and the Railhead after the Meet: The Railhead stays as the Meet's halt; the Pier becomes a homeward-only
   stop". Call 14 stands. The Pier's up platform (`RING_PIER_UP`) is not built and no up train stops there (call 43).
5. The names "Rivet" and "RINGWORKS" are kept.

**Source of truth.** [ring-island](../brainstorms/ring-island.md): Shape (R1–R5), Done means, "The layout,
greyboxed", "Rulings (10 November, greybox)", and the design review's "Calls in build 1", ranked findings 1–7 and the
orchestrator's acceptance of all five recommendations; all binding. The greybox (`?ring=greybox`,
`src/proto/greybox/ring.ts`, `RING_LAYOUT`). [generic-lines](generic-lines.md): sequencing (v26 alone, this as v27),
the state shape (catalog rows, halts, `RailEnd`), the wait bound that sizes line 2's trains, the pier's
second track deferred to v27. [agent-calls](../agent-calls.md) rows for 10 November (ring-island rulings 1–6, review
findings 1–5, defaults row 77). [decisions](../decisions.md#current-decision-index): 10 November "the railway is double
track", "Ring Island", "trains stop on request", "Turn the table only when ready", "shared moments play for everyone",
"the sea is rebuilt small"; 9 November "a cinematic can't be interrupted by accident".
[rail-map](rail-map.md)'s design review (finding 2, call 14, "The station plan"): why buffers, the stop mark at u 448,
the long train (8.2 m ahead of the passenger car's centre, 12.7 m behind), the passenger car at least 14.7 m from any
buffers. [junction-stations](../brainstorms/junction-stations.md): the station house at the halt's north-west corner
and the way between the platforms at their north end (its greybox step A, on main since #1479:
`src/proto/greybox/ring-house.ts`'s `CONCOURSE` and `HOUSE`). **v26 as merged** is the code:
`src/sim/railway-lines.ts`, `railway-train.ts`, `railway-trains.ts`, and `layLine2`'s Q6 hunk in `railway-systems.ts`.

**Read for this.** AGENTS.md's table rows: owner-calls (the orchestrator makes design calls; nothing waits for a
playtest; no `WORLD_NS` bump mid-session; signs in the world; port from Place only what still fits), DESIGN.md,
`npm run map -- --kind lockstep-system` (its must-reads: src/sim, src/world AGENTS, lockstep, room-safety's "Don't",
mixed-builds, sync's "Pick a sync kind", rules README contract), plugins (entities), rendering (coast texture),
registries (prompts), verification. Code: `src/sim/railway-lines.ts`, `railway-works-layout.ts`,
`railway-line2-layout.ts`, `railway-systems.ts` (`footTake`, `footSet`, `strike`, the `OPS` table, `railApply`'s
first-non-zero dispatch), `railway-world.ts` (`Works`, `Train`), `src/world/railway-server.ts` (the reach `switch`),
`railway-predict.ts`, `railway-jump.ts`, `src/render/water/coast.ts` and `shore-providers.ts`,
`src/proto/place/land.ts` (`buildFar`), `src/entities/lookout/` (buoys, telescope), `src/entities/railway/`
(`hook-shot.ts`, `hook-view.ts`, `glide.ts`, `arrival.ts`, `shared-moment.ts`, `crossing-view.ts`), the bot's
`railway-glide.ts`, `dev/economy/place-level.ts` (the ability envelopes), `dev/loop/`.
**Port from Place:** the designer's fit check ran in the design review ("Ported from Place, piece by piece"): keep
the buoys (they gain a job), `buildFar` as the far view (with the leaf added to the far view), the telescope, the
glide. Nothing else comes over.

**Research.** [route-contract](../research/route-contract.md): travel edges never supply work edges; used for the brace
(accepted only once the gap is footed), the hook (the pull always ends on our pad) and the early swim (nothing on the
island works). [friction-without-failure](../research/friction-without-failure.md) rec 1 (a nearby, loss-free
recovery): the sea ramps and the hook back. [shared-moments-and-events](../research/shared-moments-and-events.md) rec
3 (waiting at the spot is rewarded): the joint is where the room meets; departs from its "late joiners get the missed
beat on arrival" in favour of the decided "on their own first crossing" (call 11). [botw-glide-target](../research/botw-glide-target.md):
10 m/s and 3.2 m/s are the envelopes' numbers. [train-riding](../research/train-riding.md) rec 6: the wait bound that
sets line 2's third train. [level-design](../research/level-design.md)'s lesson "anything seen from far away must be
drawn bigger than its true scale": **departed from for the leaf**, on the owner's answer 3.

**Not in this plan.** Build 2 (v28: the steel works, the longer boiler, the saddle, threading, the shard's one
reaction, `Aperture.threaded`); the branch lines and their platforms (build 1 only leaves room west of the halt);
retiring `?ring=greybox` (a follow-up once R4 ships: delete `src/proto/greybox/ring.ts`,
`src/features/ring-greybox.ts` and step 0's eval in one PR; `RING_LOOP` and `RING_PIER_UP` leave the layout with it,
once the rail map's tools stop reading them). Any turning loop (the first that stays is a later stage's).

## Design

### Sync kinds and authority

| Piece | Kind | Authority | API / where |
| --- | --- | --- | --- |
| Q7 (the laying job over the six built bents) | Server | server | one more `QJob` slot (6), `LINE2_STATIONS[6]`, train-fed like Q6 |
| The bent footings, the railhead rack, the counterweight, the leaf (`Aperture`) | Server | server | new component `Aperture`, systems in new `src/sim/railway-ring.ts`, replicated like `Works` |
| The moving railhead halt and its lever, the island halt and its crossover end, the homeward-only Pier | Server | server | line 2's catalog row in `src/sim/railway-lines.ts` (v26's `RailHalt` with four optional fields), opened by `ringOpen(w)` |
| The rivet | Server | server | `WORKS_SEAMS` row 2 under the existing `rail.strike` |
| Line 2's third train | Server | server | the catalog's `trains: 3` (v26's block rule, end blocks and headway hold, unchanged) |
| Your body, the glide, the hook back | Owner | you | today's `glide.ts`, `hook-shot.ts`; one more hook ring in `hook-view.ts` |
| Island near view and colliders, the folk's stub, leaf, hinge pier, brace platform, halt, buffers and crossover, path, lookout | Local | each tab | new `src/entities/ring-island/` (static geometry, static colliders, a shore provider) |
| The far leaf | Local | each tab | new `src/entities/ring-island-far/` |
| The leaf's swing, the rivet's glint, buoy lifts, bents rising, the Meet shot, the first-crossing pull-out | Local, from accepted state | each tab | the railway adapter's accepted edges (`onAccepted`), snapped on restore |
| The staring rota's swap | Shared schedule (no state) | pure function of the railway room tick | `floor(tick / 450)` |
| "You glided the gap", "you got the Meet shot" | Local memory | you | localStorage per room, like the Boogler's memory |

Nothing here is Lockstep: there is no `src/world/rules/` file, `Rules` entry, `edits` generator or `env` fact. The
railway is Server-kind (sync.md); its sim is in `src/sim/`, so its math follows lockstep.md (integer cm and ticks,
`+ - * /`, no trig). New invariants go in `validateRailway`; the random-sequence check is a seeded `mulberry32` op
fuzz in `test/railway-ring.test.ts`.

### R1: the layout (`src/sim/railway-ring-layout.ts`, pure, integer cm)

Coordinates are the greybox's: `u` metres out from the pier head (ruling 5's datum: `HEAD` (1402.0, −372), heading
x +0.0272 per metre of −z), `lat` metres east of line 2's track. In cm: `ringAt(ucm, latcm) -> { x, z }`
(integer, `Math.round` of `+ - * /` only). Every deck is the 7.6 m double formation (lat −5.8..+1.8, tracks at lat 0
(down, track 1) and −4 (up, track 0), left-hand running per generic lines).

```ts
export const RING_S_HEAD = 74200; // line 2's s at the pier head (Q6's toCm); s = RING_S_HEAD + 100 * u
export const ringDeckY: (ucm: number) => number; // 2430 to u 20 m, then 2430 - (4 * (ucm - 2000)) / 100, floored at 800
export const RING_BENTS: readonly { x: number; z: number; y: number }[]; // bents 7..13 (u 140..260), centres at lat -2
export const RING_PATH: readonly number[]; // x, z cm every 10 m from u 10 to the island halt's north end (u 468)
export const RING_LOOP: { x: number; z: number; r: number; neckCm: number; loopCm: number }; // overruled (R1b): not on line 2
/** k = bents footed past bent 6 (0..7): where line 2 ends while the gap is open. */
export const RING_HEAD: readonly {
  s: number; mergeCm: number; // the end stop and its stub merge 20 m short
  platform: RailPlatform;     // the railhead platform's middle (lat +1.8..+6.3, 25 m long, deck + 90 cm)
  rack: { x; z; y; reach };   // the railhead rack, at u - 18, lat +4.8
  jib: { x; z; y; reach };    // the jib's foot (rail.footSet site 3), at u - 3, lat +3.6; rack to jib 15 m
  ramp: { foot: XZ; flights: ... }; // the railhead's sea ramp (ruling 2's "last bent"), slipway at u - 28..-22, lat 14
}[]; // 8 rows: u 120, 140, ..., 260
/** The side walkway the railhead platform leaves behind as it moves: lat +1.8..+6.3, from u 100 to RING_HEAD[k]'s
 * end; each bent adds 20 m and none is ever removed (design review finding 2). */
export const RING_WALK: (k: number) => { u0: number; u1: number; lat0: number; lat1: number };
export const RING_GAP = { hinge: 27700, leaf: 1700, toe: 26000 }; // the leaf 17 m, toe on bent 13
export const RING_BRACE = { x, z, y: 800, reach: 400 };        // the gold strut's foot, brace platform, u 284.5, lat +3.4
export const RING_BRACE_PLATFORM = { u0: 28400, u1: 29400, lat0: 220, lat1: 1020, y: 800 }; // design review finding 1
export const RING_HOOK = { u: 27600, lat: 1200, y: 1750, pad: { u: 25820, lat: 500 } };      // design review finding 1
export const RING_RIVET = { x, z, y: 1500, reach: 500 }; // the joint at the toe, u 259.5, lat -2, just over the deck
export const RING_HALT = { u0: 42800, u1: 46800, y: 800, up: RailPlatform /* west, lat -9.3..-5.8 */, down: RailPlatform /* east, lat +1.8..+5.3 */ };
export const RING_JOINT_UP = RailPlatform; // the west platform at the last bent, opened on joined (call 14)
export const RING_PIER_UP = RailPlatform;  // not built (owner's answer 4): the Pier is homeward-only
export const RING_Q7_FRAME = { x, z }; // the pier's east edge, lat +4.5: s 720 as built; s 710 from R3b (call 55)
export const RING_RECOVERY: readonly { x; y; z }[]; // dry spots, never water (Level findings)
export const RING_BUOYS: readonly ({ head: number } | { joined: true } | { start: true })[]; // per buoy 1..7
export const RING_RAMPS: readonly { foot: XZ; flights: ... }[]; // the hinge pier's (ruling 2); the railhead's is RING_HEAD[k].ramp
```

`RING_BUOYS`: buoys 1–2 lifted from the start of v27 (call 23); buoy 3 (about u 156) when the railhead reaches bent 8
(`head >= 2`); buoy 4 (about u 218) at bent 11 (`head >= 5`); buoys 5–7 (past the gap) on `joined`.

The bow: `ringDeckY` reproduces `CROSSING_DECK_Y` for bents 1–6 (test), gives 19.5, 18.7, 17.9, 17.1, 16.3, 15.5 and
14.7 m for bents 7–13, 14.0 m at the hinge and 8.0 m from u 428 through the halt and on to the buffers. The brace platform is
at **8.0 m**, 7.6 m under the take-off (the railhead platform's end, 15.6 m) and about 6 m under the hinge deck, from
u 284 to 294 (design review finding 1: lower and farther than the greybox's 10.0 m from u 276.5, so the double jump
falls short and every glide that starts with a jump lands). Steps climb from its far end (u 294) to the folk's deck by
about u 304.

### R1b: buffers and a crossover (amends R1; pure layout, no rule, no bump)

"Buffers about 15 m past the halt, with a crossover before it" (owner). Far Head's shape, as v26 merged it
(`end('crossover', 49000, 1)` in `railway-lines.ts`, the track drawn by `FORMATION.quarry.crossover: [490, 512]`): a
facing crossover short of the platforms carries up trains onto the down track, they stand at the down (east)
platform, and they leave on the down track. One new export in `src/sim/railway-ring-layout.ts`, integer cm:

```ts
export const RING_END = {
  u: 44800, //                       the stop mark: the platforms' middle (rail-map, "The station plan")
  s: 119000, //                      RING_S_HEAD + u: the island halt's `s` in line 2's row
  cross: { u0: 39500, u1: 41700 }, // the crossover on the Way, up track (lat -4) to down (lat 0): 22 m, as Far Head's
  mergeCm: 113700, //                RING_S_HEAD + cross.u0: its RailEnd.mergeCm
  bufferU: 48300, //                 RING_HALT.u1 + 1500: both tracks' buffer faces
  buffers: [
    { ...ringAt(48300, -400), y: 940 }, // up track:   (141113, -85493); y = deck 800 + 140, as the railhead's buffer
    { ...ringAt(48300, 0), y: 940 }, //    down track: (141513, -85482)
  ],
  board: { ...ringAt(48450, -200), y: 890 }, // the end board, 1.5 m behind the faces: (141317, -85638)
  bed: { u0: 46800, u1: 48350, lat0: -580, lat1: 180, y: 800 }, // the run-off: the formation carried on, level
  cut: 750, //                       the ground's cap under `bed` (its 0.5 m slab's underside): R2d's ground.ts
} as const;
```

**Why these numbers** (the test holds each to v26's own constants, so a longer train or turnout fails it):

| Number | Value | From |
| --- | --- | --- |
| Buffer faces | u 483.0 | `RING_HALT.u1` (468) + 15 m, the owner's number |
| Stop mark | u 448 (s 1190 m) | The 40 m platforms' middle; one mark for both tracks (rail-map call 11) |
| Crossover | u 395–417 | 22 m, `FORMATION.quarry.crossover`'s length and at least `TURNOUT_CM` (2000); ends 11 m short of the platforms (u 428) and 10.5 m short of the level (u 427.5) |
| Standing train, today's | u 439.0–454.2 | `TRAIN_EXTENT` (620 ahead, 900 behind): 22.0 m clear of the crossover, 28.8 m short of the buffers |
| Standing train, the longest planned | u 435.3–456.2 | Rail-map's long train (820 ahead with the longer boiler, 1270 behind with three cargo cars): **18.3 m clear of the crossover**, 26.8 m short of the buffers, inside the platforms; the passenger car 35 m from the buffers (at least 14.7) |
| End block | s 1137–1190 m | From the crossover's start to the stop, both tracks (53 m; Far Head's is 34 m) |
| Signal | s 1130.8 m (u 388.8) | `mergeCm − TRAIN_EXTENT.aheadCm`, as `end()` computes it: a held train's nose is at the crossover's first point, its tail (u 379.8; the long train's, from u 386.8, u 374.1) 97 m past the hinge and 124 m past the Railhead's stop |

**Unchanged:** `RING_PATH` (it ends at u 468; no train's `along` passes u 448, and views draw the last 15 m of rail
straight from `ringAt`), `ringDeckY` (level at 8.0 m from u 427.5; the crossover is on the 4% grade, 9.3 m down to
8.4 m), `RING_HALT`, `RING_HEAD`, `RING_END_BRAKE_CMS2`, everything at the gap. `RING_LOOP` and `RING_PIER_UP` stay
exported and unchanged, each with its comment rewritten ("overruled, 10 November: not part of line 2" and "not built:
the Pier is homeward-only"), because `src/entities/ring-island/{view,ground}.ts`, `test/ring-island-ground.test.ts`,
`dev/level/rail-network.ts` and `dev/level/rail-map.ts` import them; R2d drops the near view's use, the rail map's
tools are that job's.

**Nothing in R1b is west of lat −5.8.** The station house's greybox landed while this was written (#1479,
`src/proto/greybox/ring-house.ts`): the house at u 474, lat −16 on a terrace (`CONCOURSE.terrace`: u 468–477.5, lat −20
to −9.3, at platform height), and the way between the platforms a plank crossing over both tracks at their north end
(`CONCOURSE.crossing`: u 468–471.5, lat −9.3 to +5.3). The run-off's rails pass under those planks, as rails do at
every plank crossing; no train reaches them (the long train's nose stops at u 456.2, 11.8 m short), and the buffer
faces stand 11.5 m beyond.

### R2: the island near view, default on (Local)

- **`src/entities/ring-island/`** (`index.ts`, `view.ts`, `ground.ts`, `shore.ts`, `state.ts`), spawned on
  `productionRailway` unless `?ring=greybox` or `?blockout=world` is on (they draw their own). `buildFar`'s cones stay
  as the far view; the near view draws over them, matching their surface.
  - `ground.ts`: the island's heights on a 2 m grid over its waterline box (about 720 × 720 m, 361² cells): the max of
    the four cones' surfaces (`RING_CONES`), graded to a fill under the halt (u 428–468) and, as built, capped under the loop's deck (Level
    finding 8; R2d removes that cap and cuts the run-off instead), clamped to the sea bed off the shore. One static `heightfield` collider (`addStatic`), and
    `islandH(x, z)` for recovery and the saved pose.
  - `shore.ts`: `registerShoreProvider({ id: 'ring', bounds, extent: 1024, bedAt: gridBedAt(...) })` (needs R2a).
  - `view.ts`: geometry merged per colour (the greybox's builders, as an entity view): their stub (the Pilgrims' Way,
    u 277–470, laid double track, truss posts), the hinge pier, the brace platform at R1's numbers with the gold strut
    and one waving folk, the hinge pier's ramp out of the sea, the raised leaf (a pivot group the R4 leaf view
    turns, its empty bracket and painted outline), the island halt's two platforms with the RINGWORKS board, the
    fingerpost (emblems only, names left for the owner), the low map table, the 40 m loop deck (as built; R2d replaces
    it with the run-off, the buffers and the end board), the path to the summit
    lookout, the lookout, the steel stack under a tarp, the drop hammer (Local loop: lift 0.6 s, drop, thump, 2.4 s
    cycle, sound within 120 m), the prophecy mural on the works wall, the shore's sand band. Colliders: decks, ramps,
    platforms, the leaf as a kinematic body. No hook ring on the folk's side (ruling 1).
  - `state.ts`: a Local pose record other views write, `ringIslandPose = { leaf: number /* degrees up, 78 raised */,
    bracket: 0..4, braced: boolean }`, read by `view.ts` each frame; R4 writes it, so R4 never edits R2's files.
  - Mounted (meshes added, colliders built) once the camera is within 500 m of the hinge or the halt, or once the
    railway state has Q7 laid; unmounted past 650 m with Q7 unlaid (hysteresis). The pier head is 277 m from the hinge.
- **Recovery and saved pose** (`src/entities/railway/arrival.ts`, one hunk): `posePolicy` and `getUnstuck` accept a
  pose on the island (`islandH` where Place's `H` is sea), and `consider` adds `RING_RECOVERY`. **Before the Meet,
  Get unstuck from anywhere past the gap (u > 262, or on the island) puts you on the Pier halt's deck** (owner, 10
  November: "It returns you to your own side (the Pier halt)"; design review finding 3, call 31). That is what R2b
  built (`ringUnstuckHome` in `state.ts`), and it stays so through v27: no later step moves the target to the railhead.
  After `joined`, the nearest `RING_RECOVERY` point as above. Line 2's path points past the built deck (beyond `RING_HEAD[head]`'s u before
  `joined`) are never recovery candidates: `laidPath()` stops at the railhead.
- **R2a, the coast** (`src/render/water/coast.ts`): see "The sea's shore texture" under Risks for the option and why.
- **R2c, the far leaf** (`src/entities/ring-island-far/`): always on in the production railway, a 17 × 7.6 m orange
  plate (**true scale, and it stays so**: owner, 10 November, "Leave it at true scale") and its pier at the hinge in the readable-glow orange, its angle read from `ringIslandPose.leaf`. A toe pennant
  only if the proof look fails at Home (call 20). The glow fades with distance to the near leaf's own orange by 500 m,
  so the swap to the near view at the mount distance doesn't pop (design review finding 8).
- **R2d, the terminus drawn** (`src/entities/ring-island/view.ts` and `ground.ts`; no bump): the loop's deck, its
  neck and the ground cap under them go; the formation runs on level from u 468 to u 483.5 (`RING_END.bed`) with both
  tracks' rails to the buffer faces, two buffer stops and the end board (blank: its words are the owner's), and the
  Way's deck gains the crossover's rails between u 395 and u 417 (the up track's lateral eased from −4 to 0 with
  `ease`, as `crossLat` does at Far Head). `ground.ts` caps the ground at `RING_END.cut` (7.5 m) under the bed with
  the fill's 1 in 1.5 banks: a cutting up to 1.5 m deep over the last 8 m (Level finding 15), instead of the loop's
  12 m. The plank crossing at the platforms' north end and the house are junction-stations' to bring into the near
  view; R2d leaves their ground (`CONCOURSE.terrace`) as it is.

### R3: rules, v27 (Server)

Written against v26 as merged. What v26 gives, by name: a halt's `end` is `end(kind, mergeCm, side)`, which derives
`edgeCm` (the merge, less a stub's `TURNOUT_CM`) and `signalCm` (`edgeCm` less `TRAIN_EXTENT`'s leading reach);
`endBlocks(line, stops)` reads the **last open halt's** `end` for the far block (`from: edgeCm`, `to` the stop); a
train arriving on track 0 at the last open stop flips to track 1 in `trainStepLine`; `blockFree` keeps one train in or
bound for each end block; `headTicks` spaces departures from an end. The `turn` field marks a train that was past a
crossover when the line was extended beyond it (set in `layLine2` when Q6 opens the pier), so it still turns back
there. `circuitCm` says "a stub or crossover turns in place and adds no length". So **a buffer terminus with a
crossover needs no new train rule**: it is a catalog row.

**The catalog (line 2's row, `railway-lines.ts`).** `path` gains `RING_PATH` (its index stays `s / 1000`); `trains: 3`;
two halts appended after Pier, so halt ids 0–5 keep their meaning and the new ones are 6 and 7:

| Halt | `s` | `opens` | `platforms` [up, down] | `end` | New fields |
| --- | --- | --- | --- | --- | --- |
| Pier (edited) | 72650 | 5 | `both(PIER_EAST)`: the east platform, `{ x: 140549, z: -35859, y: 2502, reach: 1260 }` (call 53: today's point mirrored across the track at s 730, 2.9 m east of the path point (140259, −35846); pinned within 2 cm by the test) | `end('stub', 55600, 1)`, kept: it is the end between Q6 and Q7 | `only: -1` |
| Railhead | `RING_HEAD[0].s` (85200) | 6 (Q7) | `[RING_JOINT_UP, RING_HEAD[0].platform]` | `end('stub', RING_HEAD[0].mergeCm, 1)`: merge 83200, edge 81200, signal 80580 | `heads: RING_HEAD.map((h) => h.s)`, `brake: RING_END_BRAKE_CMS2 / 100` (2 cm a tick²) |
| Ring Island | `RING_END.s` (119000) | 6 | `[RING_HALT.up, RING_HALT.down]` | `end('crossover', RING_END.mergeCm, 1)`: merge and edge 113700, signal 113080 | `ring: true` |

`RailHalt` gains four optional fields, all read by the pure train code (no world access):

- `ring?: true`: the halt opens only once the rivet is struck (`joined`), on top of its `opens` slot.
- `heads?: readonly number[]`: the stop's `s` per railhead (`RING_HEAD[k].s`, 85200 to 99200 in steps of 2000). Its
  `end` is written for `heads[0]` and moves with the stop.
- `only?: -1`: while it is not the open end, only down trains stop there (the owner's "homeward-only stop").
- `brake?: number` (cm a tick²): a leg ending here going +s brakes at this rate, not the line's `accel` (Level
  finding 14's eased end stop, in the row rather than in a train field).

`railway-ring-layout.ts` imports only the `RailPlatform` **type** from `railway-lines.ts`, so the value import the other
way is not a cycle. New export `haltPlatform(id, way, head = 0)`: a halt's platform for a way, `RING_HEAD[head].platform`
for the `heads` halt's down side (the server's reach check and the lever's view read it).

**Stops (`railway-train.ts`).** `trainStopsOf(line, laid, ring = { head: 0, joined: false })`: a halt is open when
`opens < done` and, if `ring`, `ring.joined`; a `heads` halt's stop is `heads[ring.head]`. Open stops stay a prefix of
the halts (Village, Quarry, Far Head; + Pier at Q6; + Railhead at Q7; + Ring Island at the rivet), which `endBlocks`
relies on (`halts[last]`). v26's boolean argument is kept as its shim and means "Q6 is laid" (`true` is 6, no longer
"every slot"), because `railway-systems.ts`, `railway-world.ts` and `adapters/railway.ts` still pass
`completed >= LINE2_STATIONS.length` until R3b gives them the count. In v27 the stops are 1700, 17400, 52400, 72650,
99200 and 119000: 1173 m end to end, `cycleTicks` 1388 (138.8 s) with no change to its formula.

**The island terminus.** With Ring Island the last open stop, `endBlocks` gives the far block s 113700–119000 and the
signal at 113080 (already at least `sepCm` short of the stop, so `min(signalCm, s1 − sepCm)` keeps it). An up train
plans its leg to 119000 only when `blockFree` finds no other train in or bound for that block, else it holds at the
signal (`to: -1`); it arrives, `trainStepLine` flips it to track 1 and drops its riders' up asks (`reqOnly`); it
dwells, waits out `headTicks` since `left1`, and leaves homeward. v26's `call` already refuses an open end's way-in
lever, so the west (up) lever is refused and the view chains it with the branch's plaque (rail-map call 14), as Far
Head's up lever is before Q6. Before the rivet the halt is not an open stop, so both levers are refused
(`halt.stop >= n`). **`turn` is not set anywhere new in v27 for this end**: Ring Island stays the end. It is the
field a later stage uses when line 2 runs on past the island, by the same `endMoved` below.

**When the end moves on (`endMoved`, `railway-trains.ts`).** v26's Q6 hunk in `layLine2`, made a function:
`endMoved(io, line, oldLast, tick)`, for every train of the line running on track 0 to `oldLast`: if its nose
(`trainAlong + TRAIN_EXTENT.aheadCm`) is past the old end's `edgeCm` (a crossover's first point, or a stub's turnout:
it is already on the terminal track) it gets `turn: true` and turns back there as at an end; otherwise it runs on, and
unless the halt is `only` it gets the one stop there v26 gives (`reqAdd(req, oldLast, 1, n)`), since its riders could
not ask for an end. A train standing at the old end has already flipped to track 1 and leaves homeward as from a middle
halt. R3b calls it three times: at Q6 (Far Head, as today, same results), at Q7 (the Pier: no courtesy stop, it is
`only`) and at the rivet (the Railhead, at `heads[7]`). `validateRailTrains`'s rule for `turn` already fits all three
(`halts[to].end` exists, `to` is no longer an end).

**When the railhead moves a bent (`stopMoved`, `railway-trains.ts`).** v26's invariants say a standing train's `from`
is its halt's stop and a running train's `dest` is its `to`'s stop, so the old plan's "advancing `head` changes only the
stop table" would fail `validateRailTrains`. `stopMoved(io, line, k, tick)`, called when `head` advances: a train
standing at halt `k` becomes a train standing at a signal (`at: -1, to: -1`, v26's "no halt": it keeps its pose, has
no dwell left and leaves homeward when its way is clear); a train running to `k` is replanned from its pose now to the
new stop, as `replan` writes a leg (`from: pose.s, v0: pose.v, dest, depart: tick`), 20 m further on. No pose jumps
(`trainAlong` is continuous across both). `endBlocks` shifts the last halt's `edgeCm` and `signalCm` by
`stops[last] − halts[last].s`, which is 0 for every fixed halt, so the railhead's block and signal follow it (at
bent 13: merge 97200, edge 95200, signal 94580).

**The eased end stop (`brake`).** v26's `profile(dist, v0, kin)` brakes at `kin.accel` (3.5 cm a tick², 3.5 m/s²).
`TrainKin` gains `brake?: number`; `profile` uses `b = kin.brake ?? kin.accel` for the braking distance and the last
phase, and takes its three existing branches untouched when `b === kin.accel` (v26's legs stay bit-identical: a test).
New `stopKin(line, to, track)` returns the line's kin with the halt's `brake` when `track === 0`; `trainAlong`,
`trainSpeed` and `trainArrives` pass the row's `to` and `track` (the pose still reads only the row and the catalog);
every braking distance to a halt (`reachable`, `trainCanBrake`'s callers in `planLeg`, `trainServes`,
`trainRequestable`) reads that halt's rate, so the planner never commits to a stop the eased leg can't make. It applies
to every up arrival at the Railhead, before and after the Meet (call 46); down trains and every other halt keep 3.5.

**The homeward-only Pier (`only`).** While the Pier is not the open end: `trainReasons` never gives an up train a
reason to stop there, `trainRequestable` skips it for an up train's riders (they are offered the Railhead), and
`validateRailTrains` refuses a line or rider ask for its up way. v26's `call` in `railway-systems.ts` refuses the lever
ask (R3b's hunk). The wagon never needs an up stop there: Q7 opens only once the pier is footed.

**The Pier's one platform (ruled, calls 53–61).** It stands **east of the down track from Q6 on**: s 719–741, centre
lat +2.9, deck lat +1.65 to +4.15, top 25.02 m. Trains only ever stand at it on the down track (lat 0): while the Pier
is the end, up trains come in over the stub onto that track, as today; after Q7 only down trains call. So the platform,
its lever (one handle, plaqued **Village**, at the north end: s 739.6, lat +2.45) and its board are the same before and
after Q7, and nothing at the halt changes when Q7 is laid except that the up track (lat −4) appears on the far side of
the down track, 5.65 m from the platform's edge, with no platform, lever or lamp of its own. The pier rack is on that
platform's seaward edge (`PIER_RACK` mirrored: 3.5 m east at s 733, about (140594, −36208); footings at lat +2.9 to
+4.1, a 1.25 m aisle on the track side, as today's). **Nothing is lifted at Q7 and no cargo moves.** The rack is empty
by then in any case: `validateRailway` holds `pierRack + pierSet <= 12` and `crossing >= 0` only with `pierSet === 12`,
and Q7 opens on `crossing >= 0`; the ring's footings unload only at the Railhead. It stays standing, empty (no yard at
the Pier: owner).

**Three trains.** `trainPlaces` as merged can put two trains on one spot when a line has three: over line 2's first
stops (C = 101400) train 1 and train 2 are both nearest Far Head's down track (16900 cm against 18100 for Quarry). It
takes the nearest place **not already taken**, so the three stand at the Village (up), Far Head (down) and Quarry
(down); `RAIL_TRAINS` has four rows (a save break, inside v27's). Three trains on the 1388-tick circuit are 462 ticks
apart evenly, which is what v26's two are on the pier's 924: v26 measured worst waits of 91–97 s there and its test
bounds them at 105 s (`WAIT_BOUND` 1050), not 60. So three trains keep v26's service over a line half as long again;
they are not expected to reach the one-minute bound, and the old plan's "under 600 ticks with 3 trains" is dropped
(call 47, open question 1). Both the collision and the 462 ticks are worked from the code by hand, not run: R3a's tests
pin the first and print the waits.

**`Aperture`** (kind `'aperture'`, one row, replicated; `src/sim/railway-ring.ts`):

| Field | Type | Meaning |
| --- | --- | --- |
| `set` | int 0..14 | bent footings set past bent 6; `head = floor(set / 2)` |
| `rack` | int 0..6 | footings on the railhead rack |
| `cw` | u8 0..4 | counterweight footings hung |
| `brace` | u8 | 1 raised on the pawl (default), 2 braced, 0 down (brief's encoding) |
| `joined` | int | tick the rivet was struck, −1 not yet |

**Ops** (all additive; existing systems already refuse the new ids):
- `rail.footTake { rack: 2 }`: a footing off the railhead rack (`ringFootTake`, appended after `footTake` in `OPS`).
- `rail.footSet { site: 3 }`: the railhead jib. While `set < 14` it sets the next bent's footing (needs Q7 complete);
  then, while `cw < 4`, it hangs a counterweight footing (`ringFootSet`). One site, its meaning by state (call 7).
  The second footing of a bent advances `head` and calls `stopMoved` for the Railhead; hanging the fourth with
  `brace === 2` sets `brace = 0` (down).
- `rail.brace { revision }` (new op, `brace`): accepted only when `set === 14`, `brace === 1` and `revision === 1`
  (the brace the actor saw); sets `brace = 2`, or `0` if `cw === 4` (call 9).
- `rail.strike { id: 2 }` (`ringStrike`): needs `Works.breaker === 2`, `brace === 0` and `joined < 0`; sets
  `joined = tick`, which opens the island halt and the joint's up platform, and calls `endMoved` for the Railhead.
- The wagon: after Q7 is laid and the pier is footed, the line's end is the railhead; the wagon unloads there into
  `Aperture.rack` (cap `WORKS.wagonCap`), owed `14 + 4 − set − cw − rack − aboard − carried`. In v26's terms:
  `serviceOf` gains the Railhead (stop 4, going up, a wagon with footings aboard) beside its Pier row (`k === 3`),
  `wagonArrives` unloads at `row.at === 4`, and the Quarry's load reads `pierOwed + ringOwed`. `headExempt` is true
  for the wagon's train while the pier **or the ring** owes footings (v26's pier exception, extended); `blockFree`
  (`sepCm` and the end block) still holds it, since that is safety, not spacing.
- `WORKS.total` 14 → **32** (call 18); the kiln's one fill casts them, no second bill.

**Server** (`railway-server.ts`): `rail.call` at the Railhead reaches from `haltPlatform(6, way, head)`; reach checks
for `footTake` rack 2 and `footSet` site 3 against the current `RING_HEAD[head]` rack and jib, `rail.brace` against `RING_BRACE`, `strike` id 2 against `RING_RIVET`; `rail.brace`
joins the op allow-list; malformed fields refused (`railInt(e.rack, 2)`, `railInt(e.site, 3)`, `railInt(e.id, 2)`,
`e.revision === 1`). Prediction (`railway-predict.ts`): rack 2 and site 3 as racks 0–1 and sites 0–2 are; `rail.brace`
and strike id 2 as the seams are.

**Invariants** (`validateRailway`): `0 <= set <= 14`; `0 <= cw <= 4`; `brace` is 0, 1 or 2; `cw > 0` or `brace !== 1`
only with `set === 14` (no counterweight or brace before the gap is footed); `brace === 0` only with `cw === 4`, and
`cw === 4` with a driven brace is always `brace === 0`; `joined >= 0` only with `brace === 0`; island halt open iff `joined >= 0`; a train standing at the Railhead stands at
`heads[head]`; `rack <= wagonCap`;
footings conserved: `WORKS.total = uncast + Works.rack + pierRack + pierSet + stall + cradle + aboard + carried +
Aperture.rack + set + cw`.

**Seeds** (new `src/sim/railway-seed-ring.ts`, stages appended in `railway-seeds.ts`): `deck-laid` (crossing done, Q7
laid, railhead at bent 6, the wagon at the Village with 6 footings racked at the Works), `gap-footed` (`set = 14`,
railhead at bent 13, nothing on its rack), `leaf-raised` (`gap-footed` plus 4 footings on the railhead rack, the wagon
away), `ring-joined` (leaf down, `joined` set, three trains running to the island). `JUMPS` rows for `deck-laid` and
`ring-joined` (`railway-jump.ts`).

### R4: views (Local, from accepted state)

Each piece is its own entity, auto-loaded by `main.ts`'s glob, so no step edits another's files; each reads
`inspectRailway()` and the adapter's accepted edges, snaps on restore and plays effects only from `onAccepted`.

- **The line out** (`crossing-view.ts`, `pier-view.ts`, `train-view.ts`, `halts-view.ts` hunks): Q7's double deck laid
  panel by panel over bents 1–6 by the machine; the pier's second track (no up platform: owner's answer 4; its one platform and the
  rack stand east of the down track from Q6, calls 53–54); a train on the up track eased across the island's crossover as it is across
  Far Head's; the request levers of halts 6 and 7.
- **The railhead** (`src/entities/ring-railhead/`): bents 7–13, each rising when its second footing is set (the jib
  swings the bent's prefabricated span out and drops it on its caps: owner call "machines show their work
  physically"), the railhead platform, rack and jib moving out with `head` (its lever is `halts-view.ts`'s, R4a), the next bent's stake and socket
  glowing at the jib while `set < 14`; each footing set drops visibly into one of the next bent's two sockets, and the
  span comes down on the second. **The railhead platform never leaves a player over the sea** (design review finding
  2): its 20 m behind the new railhead stays as the side walkway (`RING_WALK`), and the rack, jib and lever slide
  forward along it over about 3 s with no collider while they move (the rack's footings ride with it); the railhead's
  sea ramp (`RING_HEAD[head].ramp`) moves with it, from bent 6 on. With bent 13: the hook pile and its gold land pad,
  the take-off rail along the platform's last 5 m, and the joint's west platform (`RING_JOINT_UP`) with its plank
  crossing. Both tracks' rails are laid to every railhead: the stub's turnout is a pair of points 40 to 20 m short of
  the stop, and the up track's last 20 m ends at its own buffer, so nothing has to appear when the rivet makes the
  line a through one (call 51). Buoys lift (`lookout/view.ts` hunk: splash, the crane's little guy bows). The pile's ring
  joins `hook-view.ts`'s rings (hunk) once `set === 14`.
- **The leaf** (`src/entities/ring-leaf/`): the brace prompt **only** once `set === 14` (gold strut lit, the folk waves
  with an elbow); counterweight footings on the jib's hook dipping the leaf a quarter each once braced, creaking on
  the pawl before; the bracket's painted outline lit while a footing is on the railhead rack; the jib prompt only with
  a footing on your back and on the rack's side (call 22); the swing down (2.5 s, ease-in, a thump and a splash);
  the rivet's gold glint and prompt only once `brace === 0`. Writes `ringIslandPose`. The leaf's kinematic body never
  pins anyone: a player under its toe's landing (bent 13's deck end, u 255–260) is lifted or shoved clear with a tumble
  before it settles (design review finding 4). The folk waving on the brace platform is one of the lookers, never
  Rivet.
- **The Meet** (`src/entities/ring-meet/`, `shared-moment.ts` gains `'the meet'`): on the `joined` live edge, every page
  plays one 6 s shot (the leaf settled, the rivet's glint, the camera running along the joined line to the halt, the
  RINGWORKS board and the buffers under the shard; `createCameraPullOut`, one highlighted skip), with the banner. Never on restore. Each player's
  first ride over the joint plays a 5 s pull-out (local memory per room); a player who missed the Meet gets the Meet
  shot's framing then instead (call 11).
- **The island's folk** (`src/entities/ring-folk/`): 4 lookers on the rota, heads back, swapped by Hooter's whistle
  every 45 s (the shared schedule), a nod at a player who stands still within 8 m looking up over 50° for 1.5 s;
  Rivet, Squint and Hooter with Talk lines, each line tied to its fact (call 29, "Copy"); hard hats; the rivet toss.

### Controls

No new action. The brace, the jib and the rivet are Interact prompts (`registerInteractable`), shown only when usable
(Turn the table's rule): **Knock out the pawl**, **Hang the weight**, **Set the footing** (today's words), **Strike the
rivet**. No pad slot, key, touch control or guide row changes.

## Steps

Shipping: step 0, R1, R2a, R2b and R2c are on main. **R1b ships alone, now, with no `WORLD_NS` bump** and an
independent review (it is `src/sim`); R2d ships alone after it, no bump. R3a–R5 are one branch and one ship, the v27
bump, after R1b is on main and never mid-session; each is reviewed on its own (R3 headless, by the independent sim
reviewer per `npm run models`). Each step leaves `npm run check` green.

**Files per step** (no file is in two unbuilt steps; R1b and R2d amend files that built steps R1 and R2b created):

| Step | Creates | Edits |
| --- | --- | --- |
| 0 (built) | `dev/look/evals/ring-greybox.ts` | none |
| R1 (built) | `src/sim/railway-ring-layout.ts`, `test/railway-ring-layout.test.ts`, `dev/level/ring.ts` | `dev/level/check.ts` (one hunk) |
| **R1b** | none | `src/sim/railway-ring-layout.ts`, `test/railway-ring-layout.test.ts`, `dev/level/ring.ts` |
| R2a (built) | `test/coast-regions.test.ts` | `src/render/water/coast.ts` |
| R2b (built) | `src/entities/ring-island/{index,view,ground,shore,state}.ts`, `test/ring-island-ground.test.ts`, `dev/look/evals/ring-island-walk.ts` | `src/entities/railway/arrival.ts` (one hunk) |
| R2c (built) | `src/entities/ring-island-far/{index,view}.ts` | none |
| **R2d** | none | `src/entities/ring-island/view.ts`, `ground.ts`, `test/ring-island-ground.test.ts` |
| R3a | none | `src/sim/railway-lines.ts`, `railway-train.ts`, `railway-trains.ts`, `test/railway-lines.test.ts`, `test/railway-train.test.ts`, `test/railway-trains.test.ts` |
| R3b | `src/sim/railway-ring.ts`, `src/sim/railway-seed-ring.ts`, `test/railway-ring.test.ts`, `server/test/railway-ring-host.test.ts` | `src/sim/railway-systems.ts` (hunks below), `railway-world.ts`, `railway-line2.ts`, `railway-works-layout.ts`, `railway-line2-layout.ts`, `railway-ring-layout.ts` (`RING_Q7_FRAME` only; R1b is on main by then), `railway-seeds.ts`, `src/world/railway-jump.ts`, `railway-server.ts`, `railway-predict.ts`, `namespace.ts`, `src/adapters/railway.ts`, `test/railway-jump.test.ts`, `test/railway-line2.test.ts`, and the tests that pin the pier rack's or the frame's place (`test/railway-works-layout.test.ts`, `test/greybox-works.test.ts`, `test/crossing-show.test.ts`, `test/railway-ring-layout.test.ts`) |
| R4a | none | `src/entities/railway/crossing-view.ts`, `pier-view.ts`, `train-view.ts`, `halts-view.ts`, `halt-map.ts`, `line2-view.ts` |
| R4b | `src/entities/ring-railhead/{index,view}.ts` | `src/entities/lookout/view.ts`, `src/entities/railway/hook-view.ts` (one hunk each) |
| R4c | `src/entities/ring-leaf/{index,view}.ts` | none |
| R4d | `src/entities/ring-meet/{index,view}.ts` | `src/entities/railway/shared-moment.ts` (the union) |
| R4e | `src/entities/ring-folk/{index,view,lines}.ts` | none |
| R5 | `dev/look/bots/railway-ring.ts`, `dev/look/evals/ring-glide.ts` | `dev/look/bots/railway.ts`, `dev/look/segments.ts` (or wherever `RAIL_STOPS` lives), `dev/loop/graph.ts` |
| R6 | `docs/game-design/ring-island.md` | `docs/game-design.md` (index line), `docs/brainstorms/ring-island.md` (status), `docs/atlas/stories/railway.json`, this plan's status |

**Not this plan's files, and who has them.** `src/proto/greybox/ring.ts` (`?ring=greybox`): junction-stations' greybox
step B was waiting for this answer and draws the terminus there (its step A, the station house, merged as #1479
while this was written, so nothing holds it but R1b); what it must move is listed under R1b. `dev/level/rail-network.ts` and `dev/level/rail-map.ts`: the rail map's
job replaces their `ring-loop` track and its join with the crossover from `RING_END`.

- [x] **0. The greybox's owed and untested items (no game code, no bump).** New eval `dev/look/evals/ring-greybox.ts`,
  run as `npm run look -- --query ring=greybox --rail-seed crossing-done --eval dev/look/evals/ring-greybox.ts`. It
  does, by real input, writing `__ringResult`: (a) **walk the last bent's ramp**: teleport swimming at its slipway foot
  (u 232, lat 14), walk up the three flights to the railhead platform, assert no jump was pressed and it arrives
  within 10 s; (b) the same at the hinge pier's ramp to the brace platform; (c) **a swimmer walking out**: start 6 m
  out from each slipway's foot, swim in, assert `me.swimming` ends on the slipway and the walk continues; (d) **the hook
  from the water**: swimming within 16 m of the hook pile's foot, press Hook; expected refused (`hook-shot.ts`'s
  `canPress` needs `!me.swimming`), recorded; (e) the hook from the brace platform's four corners (all four connect
  and land on the pad); (f) a sprint plus double jump off the railhead platform's end straight down the lane, twice:
  the second jump pressed at the first's apex, and pressed late, while falling, about 1.0 s after take-off (record
  each landing's u; the design review's model predicts about u 276.4 and u 279.3, plus up to 0.9 m with the coyote
  grace, so on the greybox both land); (g) a glide after a sprint jump and air jump, and (g2) a glide opened straight
  off the edge with no jump (record both landings). These run on the greybox as it stands (platform u 276.5–289 at
  10.0 m); R1 moves it, and if (f)'s late press lands more than 0.3 m past the prediction, R1 moves the platform and
  the ring out by the difference (logged). Stills, re-shot after the landing fix (2347c882): `views.bentRamp`
  and `views.hingeRamp` (the greybox's `__ring.views`), `views.gap`, `views.hook`. **The raised leaf from Home and the
  telescope:** `npm run look -- --query ring=greybox --rail-seed crossing-done --cam 1015,104,-6 --look 1408,25,-649`
  (Home's summit) and `npm run look -- --query 'ring=greybox&shot=play' --rail-seed crossing-done --eval
  dev/look/evals/lookout.ts` at zoom 1 and 2, at phone size (`--size 844x390`). Done: results and
  stills logged in the ring-island brief's greybox section by R6; (f) confirms the design review's ruling on Level
  finding 1 (R1 need not wait for it). Checks: `npm run check`. Proof look: the eval's `gap` still.
  *Built 10 November 2026* (`dev/look/evals/ring-greybox.ts`, no game code; loads 8–26 on the 1-minute average, all under 30;
  not tested on a device). The crossing-done seed has neither the double jump nor the glider, so the eval takes each at its
  device with a real Interact first (staging teleports only). Results, by real input: (a) bent ramp walked in 11.2 s over
  52.6 m of walking at 5.6 m/s (no jump pressed; **over the 10 s bound by walking**); (b) hinge ramp
  7.2 s, 36.5 m, on the brace platform; (c) both swimmers walk out onto the slipway and up the first flight; (d) Hook
  from the water is refused (`pulls` 0, no pick), as the plan expects; (e) **cannot be tested: the greybox ring is
  scenery, not a `HookRing` (hook rings are Place's fixed pads), so Hook from all four corners connects to nothing**
  (eye distances to the greybox ring 12.7, 9.9, 20.9, 19.1 m): R4b's real ring is where (e) gets measured. (f) take-off
  at u 259.7, 9.5 m/s: apex press lands at **u 276.4** (prediction 276.4; the near edge is 276.5, so it falls through
  the platform's level on the edge, a splash in one run and a landing in another); late press (1.0 s, vy -15.4)
  ~~lands at u 281.3 against 279.3~~. **Re-measured 10 November (R1 review):** the eval read "landing" as the body's
  centre falling through the platform's standing height, which on a deck comes 0.2–0.45 s after touchdown with the
  body still sprinting; it now reads the first ground contact (`landU`, `ringonly=f` runs the item alone; load 12.5,
  one run, not tested on a device). On the u-260 basis: the apex press splashes at **u 276.4** (prediction 276.4); the
  late press lands at **u 278.7 against 279.3**, 0.6 m short of the model, on the gold strut's 0.5 m block (u
  277.8–279.2, lat 2.7–4.1, the lane's lat 4.0), which a landing 0.5 m higher reaches about that much sooner; presses
  at 0.7, 0.85 and 1.15 s first touch at u 277.6, 278.3 and 278.1. Nothing lands past the prediction, so R1 moves
  nothing (the 2.0 m was the measurement, not the jump), and the model stays an upper bound. (g) After a sprint
  jump and air jump the canopy opens by Jump; full stick carries to u 303 (past the 12.5 m platform) and a splash at
  u 310; let go at u 280 it lands on the platform at u 284.1. (g2) Off the edge with no jump: full stick lands on the
  platform at u 277.35; the stick let go at u 270 falls short at u 274.2 (a splash). Stills in `.look/`: `ring-main`
  (the `gap` view), `ring-bentRamp`, `ring-hingeRamp`, `ring-hook`, `ring-home` (Home's summit: the leaf is not told
  from the Way at 8 px, and the lookout tower hides part of the line), `ring-scope1` and `ring-scope2` (at
  844x390 the orange leaf reads as an upright orange slab, about 13 px at zoom 1 and about 26 px at zoom 2).
- [x] **1. R1, the layout (no sim rule, no bump).** Create `src/sim/railway-ring-layout.ts` with everything under
  "R1" above, integer cm, importing only `./railway-works-layout.ts` and the `RailPlatform` type from
  `./railway-lines.ts`. Numbers: the greybox's `RING_LAYOUT` with ruling 5's datum and the design review's ruling on
  Level finding 1 (the brace platform at 8.0 m from u 284 to 294, its gold strut's foot at u 284.5, the hook ring at
  u 276, the hinge pier's ramp moved with the platform), `RING_WALK` and the per-railhead ramp. Test
  `test/railway-ring-layout.test.ts`: `ringDeckY` equals `CROSSING_DECK_Y` at bents 1–6 and is 4% (±1 cm) between
  every pair of bents, 800 from u 428; `RING_PATH` starts within 1 cm of line 2's last path point carried 10 m on and
  its spacing is 1000 ± 5 cm; each `RING_HEAD[k]` rack is within 1500 cm of its jib; `RING_HEAD[k].s` is 2000 apart;
  every `RING_RECOVERY` point stands on a planned deck or on island ground over 50 cm above the sea; the hook ring is
  within 2300 cm of all four brace-platform corners at eye height; every `RING_WALK(k)` covers `RING_WALK(k − 1)`.
  New `dev/level/ring.ts`, called from `dev/level/check.ts` (one hunk) as its own report "Ring Island (planned)": it
  asserts with the place model's own envelopes (`GLIDE`, `MOVE`, `WALKABLE_NY`) and **one new one, the late double
  jump**: the farthest a sprint double jump lands on a surface `drop` below, over every second-press time, stepped at
  1/240 s with the controller's numbers (jump 7.6 m/s, gravity 18 m/s² ×0.5 while rising under 1.6 m/s and ×1.7
  falling, the air jump setting `vy` to at least 6.8 m/s even while falling, 9.5 m/s across), plus 0.1 s of coyote
  grace and `PLAYER_R`. `COURSE_DOUBLE` presses at the apex and is about 3 m short of that here, so it can't prove a
  "falls short" (design review finding 1). Assertions: the late double jump from the railhead platform's end falls at
  least 1.5 m short of the brace platform (expected 21.8 m against 24 m), and so does one from a stopped train's cab
  roof at the end stop, measured on the diagonal that clears the leaf; a glide after a sprint jump and air jump reaches
  the near edge on the conservative budget (expected 28.1 m); a glide after one sprint jump reaches it raw (33.9 m);
  at `head <= 5` no glide reaches anything on the folk's side (at `head` 6 a sprint jump, air jump and glide can reach
  the brace platform, 45 m raw against 44 m: reported, not failed, since nothing there works before `set === 14`);
  the hook ring is in range from every corner; every ramp flight is at most 30° and every slipway at most 15°; no hook
  target on the folk's side within 24 m of our deck; nothing standable over the railhead platform's last 30 m stands
  more than 1.6 m above it (the jib's mast and arm are out of a double jump's 3.03 m reach); each recovery point is
  dry. Proof: `npm run level-check` prints the report (no player-visible change, no look).
  *Built (2026-11-10):* every assertion passes on the reviewed numbers. The stepped envelope (the controller's own
  numbers, which match the plan's) gives the late double jump 21.8 m with grace and body (best press 1.10 s), 2.2 m
  short of the platform; the cab roof (u 253.8 m, 18.5 m) 23.3 m against 30.3 m round the leaf's east side; glides
  after both jumps 28.0 m conservative, after one 33.8 m raw, straight off 23.8 m (a splash); head 6 reaches the brace
  platform from the cab roof (55.3 against 50.2 m, reported); hook corners 14.9, 11.3, 21.9, 19.7 m. Departures, for
  review: `ringAt` uses unit axes (true cm, as `CROSSING_BENTS` stand; the greybox's `at` drifts 4 cm by bent 6 and
  17 cm by the halt); `RING_PATH` runs from u 8 m (s 750 m), not u 10, so a point's index stays s / 1000
  (`railLinePoint`) and it ends exactly at u 468 m; its first chord from line 2's last point is 11.55 m, not 10 (line 2
  ends at s 740 m, 3.55 m short of the pier head: the pier's datum offset), so the test holds that chord to 10–12 m and
  every other to 1000 ± 5 cm; rack to jib is 1504.8 cm at the plan's lats (4.8 and 3.6; the greybox's mast stands at
  5.4), held at 1510; `RING_WALK` starts at u 95 m, not 100, so the first railhead platform's back 5 m stays walkway;
  railheads 0–6 get a fourth flight (at most 28.5°), bent 13 keeps the greybox's three; the train's end stop is 10 m
  short of the railhead (nose about 1 m off the buffer, wagon by the rack). Added: `RING_RAILHEAD_KIT`,
  `RING_PLATFORM_LAT`, `RING_STEPS`, `RING_FORMATION`. Found for R3a: the greybox's loop neck runs 12 m on from the
  halt's north end and then 30 m back south to the loop's west point beside the halt (`neckCm` 4262).
  *Review fixes (2026-11-10):* a braking train's kept carry crossed the gap (Level finding 14), so the end stop eases
  in at `RING_END_BRAKE_CMS2` 200 (no approach cap needed: `RING_END_APPROACH` 2000, the line's speed) and the report
  steps every standable top of the train through the braking (worst the chimney, 1.6 m short; cab roof 3.2, boiler
  1.7, running board 2.3, wagon 14.5); the reviewer's `test/railway-ring-reach-review.test.ts` passes on it. The
  hook ring's x, z derive from its u, lat and the report measures in world cm as the test does; the report's air jump
  and glider read the railway tunables' defaults (sprint, coyote and the fall cap stay literals: they are unexported
  literals in `state.ts`); the island's cones moved to `src/proto/greybox/ring-cones.ts`, read by the greybox, the
  test and the report.
- [x] **1b. R1b, buffers and a crossover (pure layout amendment; no rule, no `WORLD_NS` bump; ships alone;
  independent review, since it is `src/sim`).** Owner, 10 November 2026: "Ring Island while it's the end of the line:
  Buffers about 15 m past the halt, with a crossover before it".
  - `src/sim/railway-ring-layout.ts`: add `RING_END` exactly as under "R1b" above (computed with `ringAt` and
    `RING_S_HEAD`, never typed-in world cm); rewrite the comments on `RING_LOOP` and `RING_PIER_UP` (both stay exported
    and unchanged); the header comment's "the halts, the loop" becomes "the halts, the island's buffers and
    crossover". No other export changes value. It still imports only `./railway-works-layout.ts` and the
    `RailPlatform` type.
  - `test/railway-ring-layout.test.ts`: one new test, "the island ends in buffers 15 m past the platforms, a crossover
    before them", importing `TURNOUT_CM` and `TRAIN_EXTENT` from `railway-lines.ts`, `TRAIN` from `railway-train.ts`
    and `FORMATION` from `src/proto/place/layout.ts`, with `LONG = { aheadCm: 820, behindCm: 1270 }` (rail-map's long
    train). It asserts: `bufferU === RING_HALT.u1 + 1500` and both `buffers` equal `ringAt(bufferU, -400)` and
    `ringAt(bufferU, 0)` at y 940; `u` is the platforms' middle and `s === RING_S_HEAD + u`; `mergeCm ===
    RING_S_HEAD + cross.u0`; the crossover is as long as Far Head's (`(FORMATION.quarry.crossover[1] −
    FORMATION.quarry.crossover[0]) * 100`) and at least `TURNOUT_CM`, and ends at or before `RING_HALT.u0`; for
    `TRAIN_EXTENT` and for `LONG` (which must be at least `TRAIN_EXTENT` each way) the standing train's tail is at
    least 500 cm past `cross.u1`, its nose at least 1470 cm short of `bufferU`, and both lie inside `RING_HALT.u0..u1`;
    the held train's tail (`mergeCm − aheadCm − behindCm`) is at least `TRAIN.sepCm` past `RING_HEAD[7].s` and at
    least 2000 cm past `RING_S_HEAD + RING_GAP.hinge`; `mergeCm − aheadCm <= s − TRAIN.sepCm` (so `endBlocks` keeps
    the catalog's signal); `ringDeckY` is 800 over all of `bed`; nothing in `RING_END` has a lat under −580. The
    literals (141113, −85493), (141513, −85482) and (141317, −85638) are pinned once, within 1 cm. The existing pier
    test keeps its `RING_PIER_UP` line (the constant stays).
  - `dev/level/ring.ts`: the "the loop: ... (a shape for R3a to settle)" fact goes; a new section **"The island
    terminus (buffers and a crossover)"** prints and asserts, from `RING_END`, `RING_HALT`, `TURNOUT_CM`,
    `TRAIN_EXTENT`, `TRAIN.sepCm` and the same `LONG`:
    - assert: buffer faces 15.0 m past the platforms on both tracks; print their world positions;
    - assert: the crossover is 22 m, at least a turnout, and ends 11.0 m short of the platforms; print its deck
      heights (9.3 m to 8.4 m, on the 4% grade) and its eased shift's steepest angle;
    - assert, for today's train and the long one: tail clear of the crossover by at least 5 m (expected 22.0 and
      18.3 m), nose at least 14.7 m short of the buffers (28.8 and 26.8 m), all of it beside the platforms;
    - assert: a train held at the signal (u 388.8; the long train's u 386.8) has its tail at least 20 m past the hinge
      (expected 102.8 and 97.1 m) and at least `sepCm` past the Railhead's stop;
    - print the ground under `bed` every 2 m of u at lat −5.8, −4, 0 and +1.8 (`ringHeight`), and assert the cut to
      `RING_END.cut` is nowhere over 2.0 m (expected: none to about u 475, 1.5 m at the faces);
    - assert: no `RING_END` geometry inside `CONCOURSE.terrace` grown by 1 m (imported from
      `src/proto/greybox/ring-house.ts`, which is pure), and the buffer faces at least 10 m past `CONCOURSE.crossing`
      (expected 11.5 m);
    - **the easing stop and the jump reach, at the new end** (facts, with one assertion): the railhead's seven braking
      rows are unchanged (`RING_HEAD` and `RING_END_BRAKE_CMS2` did not move) and still asserted; for the island's
      stop, braking at the line's own 3.5 m/s², print per standable top the farthest a late double jump with the kept
      carry lands (`brakingCarry`'s stepping, aimed along the track at the platform's height) and assert only that it
      is **short of the buffer faces** (expected: the chimney, u 477.2 at 6.7 m/s, 5.8 m short); print the late
      double jump from the platforms' north end on the level (16.7 m, to u 484.7: over the buffers onto open ground,
      reported, nothing there is gated).
  - **`?ring=greybox` must move** (`src/proto/greybox/ring.ts`; junction-stations' step B, not this step's file): the
    whole "The loop" block (the 36-segment deck, its legs, and the two links from the halt's end to its mouth) and
    `RING_LAYOUT.loop` go; the halt's deck and both tracks run on from u 468 to u 483.5; two buffer stops at u 483 on
    lat 0 and −4 and the end board at u 484.5, lat −2; the crossover's rails on the Way, u 395–417; the fill under the
    halt is cut, not raised, north of u 476. It must not move `CONCOURSE` or `HOUSE` (the terrace, the plank crossing at
    u 468–471.5 and the house, on main since #1479): the rails run under the crossing's planks.
  - Checks: `npm run check`; `npm run level-check` (the new section prints, "ring (planned): ok"). Proof: the report
    (no player-visible change, no look).
  *Built 10 November 2026* (`RING_END` with every number derived from `RING_HALT`, `RING_FORMATION`, `RING_S_HEAD`
  and `ringAt`; no other export changed value; no hash, golden, fixture or `WORLD_NS` moved; not tested on a device).
  Measured by `npm run level-check` ("ring (planned): ok", "track continuity: ok"): buffer faces at u 483.0, 15.0 m
  past the platforms, up (1411.1, 9.4, −854.9) and down (1415.1, 9.4, −854.8), the blank board (1413.2, 8.9, −856.4);
  the crossover u 395–417 (s 1137–1159 m), 22.0 m, 11.0 m short of the platforms, deck 9.3 to 8.4 m, steepest angle
  15.3° and tightest radius 24.5 m (3-point, 2 m arms; Far Head's live one 15.3° and 24.3 m), 32.4 m on the
  continuity report's 5 m resample, worst kink 0.07°, both straight tracks 0.00°, steepest grade 4.00%; today's train
  u 439.0–454.2 (22.0 m clear of the crossover, 28.8 m short of the buffers), the long one u 435.3–456.2 (18.3 and
  26.8 m); held at the signal (s 1130.8 m) the tails are 102.8 and 97.1 m past the hinge, 129.8 and 124.1 m past the
  Railhead's stop. The ground under the run-off rises through the cut level (7.5 m) from about u 476; the cutting is
  1.3 m at u 482 and **1.6 m at the bed's end (u 483.5, lat −5.8)**, not the 1.5 m estimated at the faces (under
  2.0). The end is 2.5 m clear of the station house's terrace grown by 1 m, westmost lat −5.8; the faces 11.5 m past
  the plank crossing. From a train braking at 3.5 m/s² into u 448 the worst late double jump is the chimney's, u 477.1
  (6.7 m/s, 6.4 m before the stop), 5.9 m short of the faces; from the platforms' north end on the level 16.6 m, to
  u 484.6. **Departures:** `FORMATION` is `src/place/layout.ts`'s (the step's `src/proto/place/layout.ts` does not
  exist); the report reuses the continuity report's `measure` on the island's three tracks (the down and up tracks
  from u 385 to the faces and the crossover), which the step did not name; `dev/level/rail-network.ts`'s `ring-loop`
  track is still listed there (the rail map's job).

- [x] **2a. R2a, the coast in regions (no bump).** `coast.ts`: providers group into regions (a provider whose bounds,
  grown by `MARGIN`, overlap another's joins its region; home and place are one region today). Each region bakes at
  `max(1, side / 1024)` m a texel with its own margin of open sea, and the regions pack as rows of one RG16F texture
  under the 2048 cap; `at(xz)` picks the region whose rect holds `xz` (two `select`s for two regions, a small uniform
  array) and does **one** texture read; outside every region it reads the nearest region's open-sea margin. The CPU
  `sampleAt` uses the same pick. `inspect()` reports each region's rect, cell and `bakeMs`. Test
  `test/coast-regions.test.ts`: with today's two providers the texture, transform and every sampled `bed`/`normal`
  equal today's (byte for byte); with a fake 700 m provider 1.5 km away there are two regions, both at 1 m a texel,
  and a point between them reads open sea. Checks: `npm run check`, `npm run perf` before and after at
  `--rail-seed crossing-done` (no frame-time change expected; report `bakeMs` and texture bytes). Proof look: the pier
  head toward Far Head's shore, `--rail-seed crossing-done`, identical to before.
  *Built 10 November.* Two departures from the text above, both forced by its own invariants: Home and Place are 485 m
  apart, so grown by `MARGIN` they don't overlap; a region also joins when one rect over both costs at most 1.5× their
  texels apart (`JOIN`; Home + Place 1.16×, an island 1.5 km off 1.7×). And the cell is `max(1, side / 2048)`, not
  `/ 1024`, which would put today's 2015 m region at 1.97 m and break "Home and Place unchanged". The shader picks among
  up to four regions (more merge the nearest pair). Home + Place: one region, 2015 × 780, 6,286,800 bytes before and
  after, byte for byte (test). Bake in Node under load 12–22 (not a benchmark): 584–772 ms before, 577–669 ms after;
  with a stand-in 700 m island the old union went to 1.46 m a texel (1509 × 2048, 12.4 MB, 1.2–1.5 s), the regions keep
  both at 1 m (2015 × 1720, 13.9 MB, 0.84–1.1 s). Rows cost the full width, so the island adds 7.6 MB, not the 3.4 MB
  estimated under Risks. Proof look identical; `npm run perf` not run (load over 6).
- [x] **2b. R2b, the island near view, default on (no bump).** Create `src/entities/ring-island/` as under "R2" above,
  reading R1's layout; arrival.ts's one hunk for recovery and the saved pose. Before and after, `npm run perf` at the
  pier head and at the island halt (desktop and phone tier), budget: no more than 14 draws and 1 ms CPU added at the
  pier head with the near view mounted. Test (node): `ground.ts`'s heights equal `ringHeight` within 5 cm off the fills
  and stay 50 cm under every planned deck. Eval `dev/look/evals/ring-island-walk.ts` (`--rail-seed crossing-done`):
  teleport onto the island's south shore, walk up onto the halt by its ramp, along the path to the summit lookout,
  asserting grounded and never swimming; reload the page there and check the saved pose restores on the island; Get
  unstuck from the brace platform's edge and from the island halt both land on bent 6's deck (before v27: our side,
  call 31), and Get unstuck from the sea beside the island's shore lands dry. Checks: `npm run check`, `npm run
  level-check`. Proof look: from the island halt's west platform toward the shard and the ring
  (`--rail-seed crossing-done --eval dev/look/evals/ring-island-walk.ts`, its halt still).
  *Built 10 November 2026* (`src/entities/ring-island/`, arrival.ts, `test/ring-island-ground.test.ts`, the eval; loads
  10–27 on the 1-minute average, all under 30; **not tested on a device**). The ground is a 376 × 361 grid at 2 m
  (x 970–1720, z −1480 to −760), the cones carried on below their −4 m base to the −7.5 m bed; the halt's fill is
  7.4 m (u 427–469, lat −10.3..+6.3, a 1 in 1.5 embankment) and the loop and its neck are capped at 6.5 m within 3.5 m
  of their centrelines. Test: off the fills every node equals `ringHeight` and the triangles between stay within 5 cm
  (away from apexes and ridges, where a 2 m triangle can't follow the max of two cones); every deck sampled (the Way,
  both platforms, the brace platform, the loop and neck) has 60 cm or more under it. Eval (`--until` re-imports it
  after a real reload): shore to the west platform by its ramp in 8.5 s, then 378 m of path to the summit lookout in
  70 s, never swimming, longest airborne 0.05 s; the pose saved beside the lookout restores there on the island after
  the reload; Get unstuck from the brace platform's edge, the island halt and the sea off the shore all land dry and
  standing on our side. Draws at the pier head with the near view mounted: +6 (5 and the toe pennant), desktop and
  844x390 alike (the far leaf's 3 hide meanwhile); the near view's walkers read 0.002–0.005 ms a frame, CPU timing
  under load, not evidence; `npm run perf` not run (load over 6). Coast: 2015 × 1740, 14,024,400 bytes, bakeMs 540
  at both sizes. **Departures:** (1) **Get unstuck lands on the Pier halt's deck, not bent 6's**: before Q7 no collider
  stands on bents 1–6 (crossing-view draws their caps only), so "bent 6's deck" would drop you in the sea; the target
  is crossing-done's jump-in landing (`ringUnstuckHome` in `state.ts`, which R4b points at the land pad). (2) The near
  view mounts by the body's distance too (a restored pose lands before the camera follows) and is built while the game
  loads, so its colliders exist the frame you arrive. (3) Saved poses stand on ground, never decks (Place's policy), so
  the reload is beside the lookout, not on it. (4) The test file is new (the step names a test, the files table none).
  (5) Additions beyond R2's list: a works yard deck east of the halt carrying the steel, hammer and the mural wall,
  and a short ramp up onto the summit lookout (its rim is 1.5 m over the slope). (6) The far leaf (R2c) reads
  `ringIslandNear.mounted` through its `setNearViewMounted` seam; `TOE_PENNANT` is on (owner, 10 November, P3) and
  the near leaf carries the same pennant in `LEAF_ORANGE`. Not built: the leaf's `braced` read (R4c's), any hook ring,
  any prompt. Stills in `.look/`: `ring-island-walk-still` (halt), `ring-island-pier-still` (the foam lip and
  shallows round the island), `ring-island-handout-still` and `ring-island-handin-still` (512 and 492 m: the far leaf,
  then the near one, never both).
- [x] **2c. R2c, the far leaf (no bump).** `src/entities/ring-island-far/` as under "R2"; it is drawn whenever the near
  view is not mounted. Checks: `npm run check`, `npm run perf` (two draws). Proof look: through the telescope at zoom 2,
  phone size (`--size 844x390`), `--rail-seed crossing-done --query shot=play --eval dev/look/evals/lookout.ts`: the orange leaf reads
  raised against the ring. (Home's summit and the finale's last frame are R6's stills; the finale is re-shot only
  after its rockets fix lands, review finding 7.)
  *Built 10 November 2026* (`src/entities/ring-island-far/{index,view}.ts`; `npm run check` green; not tested on a device).
  Leaf plate 17 x 7.6 x 0.5 m turned 78 degrees about the hinge's deck edge, grey hinge pier: 2 draws; the toe pennant
  (`TOE_PENNANT`, off) is a third (cream mast and flag, 12 m mast, 10 x 5 m flag). Glow orange `#ff8a1f` lerps to the near
  orange `LEAF_ORANGE` (`#e0701c`, exported for R2b) between 900 m and 500 m. Departures: the angle is a constant
  (`ringIslandPose` is not on main); visibility is a seam, `setNearViewMounted(fn | null)` in `ring-island-far/view.ts` (default never mounted, so the far leaf is always drawn until R2b's near view registers its own "is mounted" and owns the 500/650 m hysteresis); the glow ramp is
  500 to 900 m, not 650, so the exit swap at 650 m is a 0.3 colour step. Not measured: frame time (load about 6, bot queue
  not shown empty), `npm run perf`. Stills (`.look/`, 844x390; stitched `far-leaf-four.png`): the leaf reads as a raised
  orange slab on a grey pier at telescope zoom 2 (about 26 px), with and without the pennant; from Home's summit it is
  still a few-pixel orange tick behind the lookout tower and rock, the pennant adds a cream speck. Owner picks the pennant.
- [x] **2d. R2d, the terminus drawn (near view; no bump; after R1b).** `src/entities/ring-island/view.ts`: delete the
  "the loop and its neck" block and its `RING_LOOP` import; draw `RING_END.bed` as deck with both tracks' rails from
  the halt's north end to the buffer faces, the two buffer stops (the railhead kit's shape, static colliders), the end
  board at `RING_END.board` (blank face: its words are the owner's), and the crossover's rails on the Way between
  `RING_END.cross.u0` and `u1` (the up track's lateral eased from −4 to 0, rails only, no collider change).
  `ground.ts`: remove `loopNeck`, `loopOut` and `ISLAND_LOOP_GRADE`; cap the ground at `RING_END.cut / 100` (7.5 m)
  inside `bed` with the fill's 1 in 1.5 fall outside it (the banks reach lat −8.5 at most, north of u 478).
  `test/ring-island-ground.test.ts`: the loop's "60 cm under the deck" samples go; the same check runs over `bed`, and
  a new one holds every node inside `CONCOURSE.terrace` grown by 1 m to today's height (the house's ground must not
  move). Checks: `npm run check`, `npm run level-check`, `npm run perf` at the island halt before and
  after (the loop's 36 deck segments and posts go: fewer triangles expected, same draws). Proof look:
  `npm run look -- --rail-seed crossing-done --eval dev/look/evals/ring-island-walk.ts`, its halt still, and one from
  the east platform's north end toward the buffers and the shard.
  > **Built (11 November).** The loop block, `loopNeck`, `loopOut` and `ISLAND_LOOP_GRADE` are gone; the view draws the
  > run-off deck (u 470–483.5), rails to the faces under both lanes, two timber stops, a blank end board and the
  > crossover's rails (1 m steps, eased as `crossLat`). `ground.ts` cuts the cones to `RING_END.cut` under `bed` with the
  > fill's 1 in 1.5, **the cut capped at 2 m (`ISLAND_CUT_MAX`) and gone within 3 m of the bed**: the plan's plain
  > `min(cone, cap + fall × d)` slices the whole hillside (the cone climbs steeper than 1 in 1.5), and the cone is 9.4 m at
  > the bed's end, so 1.5 m was too shallow. The terrace test holds every node in `CONCOURSE.terrace` grown by 1 m to the
  > uncapped ground; three nodes at lat −8.9 to −9.0 rise 0.03–0.75 m from the loop's old neck cap (still 0.65 m under the
  > platforms' 8.9 m). A 2 m triangle across the bed's edge can reach into its slab (never over its top); the test says so.
  > Proof (`--rail-seed ring-joined`; trains run to the island there): a line-2 train's cars through the crossover (116
  > samples, u 393–408) ride within −1 to +4 cm of the drawn rails' lateral (`crossLat`'s curve), so the rails sit under
  > them; stills `r2d-end-still.png` (the run-off: no ground through deck or rails) and `r2d-train-still.png` (a train past
  > the crossover on the down lane, standing short of the platforms). A train at the buffers or the plank crossing was
  > not framed: the stop mark leaves the nose 28.8 m short (level-check), by numbers only.

- [x] **3a. R3a, the catalog, the buffer terminus, the moving end and three trains (v27 branch, after R1b is on
  main).** Everything under "R3" above up to `Aperture`; the sim's three train files and their tests only.
  > **Split (orchestrator call, 10 November 2026).** R3a as written was not inert: `trains: 3` gives `RAIL_TRAINS` a
  > fourth row, a fourth `Train` entity in the world, and every ops-stream hash in `test/railway-ops.test.ts` changes
  > (measured: opening 572735742 against the golden's 1598632334), so it could not land before the `WORLD_NS` bump.
  > **R3a-1 (built here):** the rules only, with no catalog row using them, proven inert by the railway goldens, ops,
  > schema, tick-order, census and replay tests passing unchanged with `GOLDEN` unset and no fixture regenerated.
  > Tests run on a test-local catalog, `test/helpers/railway-v27-line.ts` (`V27_LINE2`: the row below, held in the
  > test), with a pure `TrainIO` over plain rows. **R3a-2 (moved to R3b):** the catalog row (`RING_PATH`, `trains: 3`,
  > the Pier's east platform and `only`, halts 6 and 7, the eight-halt `LINE_HALTS` cast), with the bump and the
  > golden regeneration. What R3a-1 built, against the bullets below: every `line` argument of the pure train code is
  > a `LineRef` (a catalog index or a fixture `RailLineDef`; `TrainIO<L>` is generic over it), so `cycleTicks`,
  > `headTicks`, `blockFree` and `trainStepLine` changed type only, no rule; `trainPassesBy(line, k, dir, n)` is the
  > `only` test, read by `trainReasons`, `trainServes`, `trainRequestable`, `validateRailTrains` and **`planLeg`'s
  > holds** (found by the long fuzz: a held up train stood at the Pier after Q7 until holds skipped a refused way);
  > `validateRailTrains` is split into `trainRowBroken`, `lineReqOk` and `lineBlocksBroken`, and `trainSpacing` into
  > `lineSpacing`, so the fixture runs the same checks; `railEnd` is exported. **Three trains at today's hold miss the wait bound** (call 47; see R3b for the ruling).
  > **After the independent review (ship, no P1; 10 November):** its tests are kept: `test/railway-r3a-differential.test.ts`
  > runs the branch's train rules beside a frozen copy of main's (`test/helpers/main-rail/`) on the live catalog, row
  > for row, query for query and check for check: the inertness proof. **R3b deletes both at the bump** (the catalog
  > row changes the rules on purpose). `test/railway-r3a-adversarial.test.ts` stays. Its five findings, fixed:
  > `trainPlaces` never places a train where its way out is refused (it put an up train at the Pier at Q7 stages) and
  > throws rather than stack two when places run out (every stage of every catalog line is placed at load, so a room
  > never meets it); a train left at the old railhead stop by `stopMoved` leaves as from that end (headway hold,
  > `left1`, the lever's way-home ask dropped: `endStanding`); `trainRequestable`'s count form reads a `heads` halt at
  > its last head, the same offer as the stops form; a catalog row passed as an object resolves to its own slots
  > (`lineIndex`). Also: a leg that ends at a halt refusing its way (held short of a busy railhead, never replanned
  > off the Pier) stands at no halt, as at a signal, and the load check refuses an up train standing at an `only`
  > halt, so the save gate refuses what the rules never produce.
  > **On M8b's load check (rebased after #1532):** `checkTrains` (`src/sim/railway-check-trains.ts`) calls
  > `lineReqOk`, `trainRowBroken` and `lineBlocksBroken`, one copy of the train conditions, so the world check refuses
  > v27's too; the throw-site corpus counts `trainRowBroken`'s messages (87 sites), the refused-way rider ask is listed
  > unreachable until R3b's row makes a halt `only` (R3b turns it, the up-at-`only` stand and the refused lever ask
  > into bad worlds on the catalog), and all 34 seed stages pass both checks.
  - `railway-lines.ts`: `RailHalt`'s four optional fields; line 2's row (the path, `trains: 3`, the Pier's `only`
    and its platform moved to the east side, call 53: the row's comment becomes "s 719-741 m, lat +2.9, east of the
    down track; the pier rack stands on it", the Railhead and Ring Island rows); `haltPlatform`; `trainPlaces` takes the nearest place not already taken. The
    header's "no imports but the works layout" gains the ring layout.
  - `railway-train.ts`: `trainStopsOf(line, laid, ring?)` with the boolean shim meaning Q6; `LINE_HALTS`'s six-halt
    tuple cast becomes an eight-halt one (callers in the adapter and views index it, so it stays a tuple);
    `TrainKin.brake`, `profile`'s two-rate branch, `stopKin`; the row's `to` and `track` passed to the kin in
    `trainAlong`, `trainSpeed` and `trainArrives`; per-halt braking distances in `reachable` and `trainCanBrake`;
    `trainRequestable(row, line, stops, tick)` taking the open stops (a number is still accepted as v26's `n`, for
    `train-view.ts` until R4a) and skipping an `only` halt the wrong way.
  - `railway-trains.ts`: `endBlocks`' shift for a `heads` halt; `trainReasons` and `trainServes` honouring `only` and
    the halt's `brake`; `endMoved` and `stopMoved` (both take `Pick<TrainIO, 'row' | 'set' | 'stops'>`);
    `validateRailTrains` refusing an ask for an `only` halt's closed way. `cycleTicks`, `circuitCm`, `headTicks`,
    `blockFree` and `trainStepLine` are not edited.
  - Tests. `test/railway-lines.test.ts`: halt ids 0–5 unchanged in name and `s`, ids 0–4 in their down platform too;
    the Pier's platform (both ways) is 290 ± 2 cm **east** of line 2's path at s 730 m (x greater than the path's) and
    1260 in reach; ids 6 and 7 appended
    with every number from the ring layout; `opens` is −1 or a slot up to 6; `trainStopsOf(1, true)` is still the
    four v26 stops and `trainStopsOf(1, 7, { head: k, joined })` gives `RING_HEAD[k].s` and the island only when
    joined; `RAIL_TRAINS` has four rows on four different (stop, track) places; the Railhead's and the island's `end`
    equal the R1b numbers (edge 113700, signal 113080). `test/railway-train.test.ts`: every v26 leg (`trainLegTicks`,
    `trainLegAlong`, `trainLegSpeed` over a sweep of `dist` and `v0`) is unchanged with no `brake`; with `brake` 2 a
    leg never decelerates harder than 2 cm a tick², never passes its stop, and is continuous at its phase joins;
    an up train's riders are offered the Railhead, not the Pier. `test/railway-trains.test.ts`: an up train into the
    open island crosses nothing (its pose is the row's), stands at 119000, flips to track 1 and leaves; a second up
    train holds at 113080 until the first is out of the block, and `trainSpacing` holds every tick; `endMoved` at Far
    Head reproduces v26's Q6 results row for row (the existing Q6 tests, now through the function); at the Pier a
    train past s 53600 turns back there and one short of it runs to the Railhead with no Pier stop; at the Railhead on
    the rivet one past the stub's edge turns back and one short of it gets its one stop and runs on to the island;
    `stopMoved` over all seven advances moves no pose (`trainAlong` equal the tick before and after), leaves a
    standing train at `at: -1` and a running one bound for the new stop, and every row passes `validateRailTrains`;
    no up train ever stands at the Pier once Q7 is laid, under random asks; v26's fuzz (random lever and rider asks,
    restores) on line 2 with the island open and three trains holds `sepCm` and one train per end block, **reports
    the worst wait each way at every halt and bounds it by v26's `WAIT_BOUND` (1050 ticks)** (call 47; if it fails,
    the catalog goes to four trains: a logged Default).
  - Checks: `npm run check`. Proof: headless, no look.
- [x] **3b. R3b, the Meet's rules, the adapter and the bump (v27).**
  > **Gains R3a-2 (orchestrator call, 10 November 2026; R3a's split above):** line 2's catalog row in
  > `src/sim/railway-lines.ts` exactly as `test/helpers/railway-v27-line.ts`'s `V27_LINE2` holds it (`RING_PATH`,
  > `trains: 3`, the Pier's east platform and `only: -1`, the Railhead and Ring Island rows), the eight-halt
  > `LINE_HALTS` cast, `RAIL_TRAINS`' four rows, and R3a's catalog tests moved off the fixture onto the catalog (halt ids
  > 0–5 in name and `s`, the Pier 290 ± 2 cm east, the R1b ends, four trains on four places); then the `WORLD_NS` bump
  > and `GOLDEN=1` regeneration in this step's own review, never mid-session. The fixture helper goes once the catalog
  > holds the row. **Train count and the hold (call 47; orchestrator, 10 November, on the R3a review).** The owner's decision
  > is "3 for now": **the plan keeps three trains and fixes the headway hold.** The cause is the hold, not the count:
  > `headTicks` is sized off the non-stop cycle (138.8 s) and is only a minimum since the last departure from that
  > end, so trains that bunch under demand never re-spread; the round trip under heavy asks is about 217–221 s.
  > Measured with the reviewer's script (`waits.ts eff`/`base`/`hold` in the session scratchpad; fixture line,
  > 40,000 ticks, lever asks 5% and rider asks 3% a tick, R3a's tip after the review fixes; the reviewer's own runs
  > on 3f2423111 gave 103.5 s worst for the best fix):
  >
  > | Variant | Worst | Runs over 105 s | Round trip |
  > | --- | --- | --- | --- |
  > | 3 trains, today's hold (75%) | 137.9 s | 8 of 10 | 217.4 s |
  > | 3 trains, hold 100% of the non-stop cycle | 131.5 s | 4 of 5 | 217.4 s |
  > | 3 trains, headway 75% of a stop-counting cycle | 122.8 s | 4 of 10 | 217.4 s |
  > | 3 trains, headway 100% of a stop-counting cycle | 89.1 s | 0 of 10 | 218.6 s |
  > | **3 trains, balanced hold at the ends** | **88.7 s** | **0 of 10** | 221.4 s |
  > | 3 trains, balanced, a tenth of the asks | 87.1 s | 0 of 5 | 172.4 s |
  > | 4 trains, today's hold (10 seeds) | 105.8 s | 1 of 10 | 216.8 s |
  >
  > R3a's own long fuzz (with rider asks, restores, a legal start: `FUZZ_TICKS=40000
  > FUZZ_SEEDS=c0ffee,777,15a4d,5eed,bee FUZZ_TRAINS=3|4 node --test --test-name-pattern="fixture fuzz"
  > test/railway-trains.test.ts`): three trains at today's hold worst 130.5 s, 10 of 10 over; four 98.4 s, 0 of 10.
  > **Balanced hold preferred** (a train ready to leave an end waits while the gap to the train ahead round the circuit
  > is shorter than the gap behind it): it reacts to the spacing the rows already hold (`trainPose`, as `blockFree`
  > reads; no new state, nothing per peer), costs nothing when the trains are already even (light play), and needs no
  > estimate of a demand-dependent round trip, which a stop-counting headway must make from asks that change every
  > tick. It needs a cap (the script's: at most 60 s past the dwell) and must not hold a train another train waits
  > behind at the end's signal, or it can hold the end block; the wagon's `headExempt` still applies. Build it as a
  > per-line rule (a catalog field on line 2's v27 row) or at the bump, so v26's lines do not change early. **The
  > margin is thin and the goal is not met:** the reviewer's best was 103.5 s against the 105 s bound, the one-minute
  > goal (train-riding rec 6) is not reached by any variant under these asks, and these asks are far heavier than a
  > playtest's. Four trains at today's hold are not safely under (1 of 10 over at 105.8 s).
  >
  > **Split (implementer, 11 November 2026): R3b-1 built, inert; R3b-2 (the bump) not started.** R3b-1, proven inert
  > by the goldens, ops, schema and census tests passing with `GOLDEN` unset and nothing regenerated:
  > - **The balanced hold** as a catalog field, `RailLineDef.balance` (the cap in ticks past the dwell), read by
  >   `balancedHold` in `railway-trains.ts` at both ends after the headway check: hold while the gap ahead round the
  >   circuit is shorter than the gap behind; never past the cap, never the wagon while `headExempt`, never while another
  >   train waits behind at that end's signal. No catalog row sets it yet; the fixture (`V27_LINE2`) has `balance: 600`.
  >   **Measured** (`FUZZ_TICKS=40000 FUZZ_SEEDS=c0ffee,777,15a4d,5eed,bee`, the fixture fuzz, three trains): worst lever
  >   wait **87.7 s** (Quarry up, seed 5eed), 0 of 10 runs over 105 s, per seed 80.1, 77.2, 82.1, 87.7 and 82.4 s; the 75% and 0% runs
  >   give identical waits (the balanced hold binds before the headway hold). The one-minute goal is not met.
  > - `Q6 = 5` and `pierLaid(completed)` in `railway-line2-layout.ts`; the sim's and the adapter's "Q6 is laid" read them
  >   (`stopsOf`, `footSet` site 2, `layLine2`'s breaker and pier opening, the old `trainStops` and `validateRailway`,
  >   the adapter's `railStopsNow`); `layLine2`'s Q6 hunk is `endMoved(trainMoveIO(w), LINE2, 2, tick)`
  >   (`trainMoveIO` in `railway-sys-trains.ts`). Not yet changed: `railway-line2.ts`'s and `railway-check-line2.ts`'s
  >   `CART_ROAD.rackCm(LINE2_STATIONS.length - 1)` (the cart's farthest rack: R3b-2 decides it is Q6's).
  > - The R3a delta review's two P3s: `checkTrains` throws any `trainRowBroken` message; a note at `railway-train.ts`'s
  >   load-time catalog check.
  > **Open for R3b-2, found while reading:** (1) where Q7's kit unloads (Q6's unloads at Far Head, stop 2, hard-coded
  > in `trainIO.arrive`; `kitOwed`, `serviceOf` and the kit load in `standing` name slot 5): the plan gives Q7 `feed:
  > 'train'` and a frame at the Pier but no unload stop; the Pier (stop 3, while it is the end) is the obvious reading,
  > an orchestrator call. (2) Q7 needs a seventh depot output (`Rail.out6`, `DEPOT_OUT`). (3) The plan's file names are
  > v26's monolith: `railway-systems.ts`'s hunks are now in `railway-sys-trains.ts` (`serviceOf`, `wagonArrives`,
  > `headExempt`, `call`), `railway-sys-works.ts` (`footSet`, the `OPS` entries), `railway-sys-line2.ts` (`layLine2`);
  > `railway-world.ts`'s are in `railway-components.ts` (`RAIL_COMPONENTS`, `DEPOT_OUT`), `railway-check.ts`
  > (`ARCHETYPES`, counts) and a new `railway-check-ring.ts`; the adapter's `inspect()` still builds on the read model,
  > so `ring` goes in from rows (`read.world()`), not through `Railway`.
  >
  > **Design review (designer, 11 November 2026): the three gaps R3b-1 found.** All Defaults; they proceed
  > ([agent-calls](../agent-calls.md), Rail, 2026-11-11).
  > - **Call 62.** Q7's kit unloads at the Pier (stop 3, the line's end while Q7 is laid), onto the rack and shelf on
  >   Q7's deck (s 703–713), into `Rail.depot`/`depotRails`. Each train-fed job's kit unloads at its own halt; Far
  >   Head's service stop and unload are Q6's only. `kitOwed`, the kit load in `standing`, `line2KitOwed` and
  >   `serviceOf` read the active train-fed job, not slot 5. A test holds that Q7's kit passes Far Head and
  >   `rail.depot` rises only at the Pier.
  > - **Call 63.** Q7's kit is its bill, 20 logs and 20 rails, one trip. `LINE2_KIT` (32/32) stays as the kit car's
  >   capacity; `line2KitOwed`'s literal 32 becomes the job's bill; the loop graph's "kit equals bill" check covers Q7.
  > - **Call 64.** `Rail.out6` is a counter like `out5` (logs issued to Q7, capped at its bill) in `DEPOT_OUT`; nothing
  >   drawn, no place at the depot.
  > - **Call 65.** The footing wagon loads no ring footings until Q7 is laid (`ringOwed` is 0 before then), so nothing
  >   but the pier's twelve reaches the Pier's rack. The first ring footing's arrival after Q7 is reported from `npm run
  >   loop -- run` (designer's P2: more than about 90 s with nothing to do is reported, not fixed).
  > - **P3s.** The Village's `kitWaitTicks` hold and the "forge lit" test follow the active job too; `line2-view.ts`
  >   and the station-6 shelf and sign are checked for a hard-coded index; the stale "Q1 to Q6" and "the Q6 kit"
  >   comments are fixed.
  >
  > **Built (implementer, 11 November 2026): R3b-2, the v27 bump, on `ring/r3b2-v27`; not shipped.** Calls 62–65 as
  > ruled. Goldens regenerated for v27 only, in their own commit (sha256 prefixes before → after: rail-schema
  > 9634e4f9a18e → ba204ca72414, railway-golden 99561d1faba0 → d71c55559890, ops 38998c3aab0f → 49d76f3ef3de,
  > tick-order 0cf57d3dcca6 → a91a19d2f390, heads 57719fe3a0db → 24508229e4c9). **Measured** (the real v27 line 2):
  > the fixture fuzz (`FUZZ_TICKS=40000`, seeds c0ffee, 777, 15a4d, 5eed, bee, 75% and 0%) worst lever wait 87.7 s,
  > 0 of 10 over 105 s; the world fuzz worst 66.0 s and 66.2 s, means 24.0 s and 23.6 s. `npm run loop -- run`
  > (straight-line / calibrated): 1 player 34:01 / 40:09, 2 players 30:39 / 36:36, 3 players 30:25 / 34:46, 4 players
  > 29:12 / 32:51; the bents node 5:43–6:21, Q7 1:15–1:45. **Call 65's report:** in the seed sim Q7 is laid 84 s after
  > `crossing-done`; the first ring footings reach the railhead 141.9 s after Q7 is laid (more than 90 s with nothing
  > to do, reported, not fixed); later loads come 116 s and 122 s apart; set 14 at 380 s after Q7. **Deviations:** the
  > rule file is `railway-sys-ring.ts` (the census wants `railway-sys-*`); `gap-footed` leaves 4 footings on the
  > ring rack (the loads come 6 + 6 + 6, no op empties it); R5's loop-graph nodes (Q7, bents, brace, weights, rivet)
  > went in now so the graph test stays green; the read model gained `ring` (plan's `railwayView.ring`); the views
  > keep six frames and read `pierLaid`, and so does `secrets-view.ts`'s "end of the run" (found on the rebase: with
  > Q7 it would have waited for Q7; R4a or the designer may move it). The P3 index checks: the kit hold already reads
  > the active job; `line2-view.ts`'s `stations[5]` is the Pier's own job (Q6), correct as written.
  >
  > **After review (11 November 2026): the hold's cap from arrival, in the same bump.** The reviewer's design: a new
  > `Train.arrived` (int, set at the stand transition, at most `depart` in `trainRowBroken`) that `balancedHold` reads
  > for its cap in place of `depart`. A lever ask restarts only the dwell, and the dwell check still runs before the
  > hold, so the worst hold with one ask is dwell + cap + one asker's dwell (70 s on line 2), down from 130 s. The
  > reviewer's tests (`test/railway-r3b2-review.test.ts`) are cherry-picked and the griefing tests follow. Goldens
  > regenerated again in a fixtures-only commit (rail-schema 8f61ba5dd2c6, railway-golden 88e85b2a4f2a, ops
  > f4d3d311c6dc, tick-order 965b6000fe5b, heads 8965a94360c8). The fuzz waits and the loop totals are unchanged to the
  > tenth of a second (no run's worst wait was a restarted cap). The adapter's `ring` stays on the read model (review
  > P3-3): `buildState` reads the predicted view, whose world can be absent, so rows there would mean choosing between
  > predicted and confirmed, not a like-for-like swap; M12b's.

  New `src/sim/railway-ring.ts`: `Aperture`,
  `ringHead`, `ringOpen` (`{ head, joined }` for `trainStopsOf`), `ringOwed`, `ringFootTake`, `ringFootSet`, `brace`,
  `ringStrike`; the last three build the three-function train io over the `Train` rows (as `trainIO` does) for
  `stopMoved` and `endMoved`.
  - `railway-systems.ts`, hunks only: the `OPS` table (`'rail.footTake': [footTake, ringFootTake]`, `'rail.footSet':
    [footSet, ringFootSet]`, `'rail.strike': [strike, ringStrike]`, `'rail.brace': [brace]`); `stopsOf` becomes
    `trainStopsOf(k, qCompleted(w), ringOpen(w))`; `layLine2`'s Q6 hunk becomes `endMoved(io, LINE2, 2, tick)` and
    Q7's completion calls `endMoved(io, LINE2, 3, tick)`; `serviceOf`, `wagonArrives` and `headExempt` as under "R3";
    `call` refuses the up way at an `only` halt that is not the open end.
  - **Q6 is no longer the last job.** v26 writes "Q6 is laid" as `LINE2_STATIONS.length` (or "the Pier is the last halt") in more than a dozen places; adding Q7
    as `LINE2_STATIONS[6]` silently turns each into "Q7 is laid". New export `Q6 = 5` (and `pierLaid(completed) =>
    completed > Q6`) in `railway-line2-layout.ts`; this step fixes the sim's and the adapter's:
    `railway-systems.ts` (`stopsOf`; `footSet`'s `qCompleted(w) < LINE2_STATIONS.length`; `layLine2`'s two
    `k === LINE2_STATIONS.length - 1`, the breaker's cast and the pier's opening), `railway-world.ts`
    (`validateRailway`'s `trainStopsOf(..., line2Completed(n) >= LINE2_STATIONS.length)`, and `DEPOT_OUT` gains Q7's
    row), `railway-line2.ts` (`CART_ROAD.rackCm(LINE2_STATIONS.length - 1)`; `trainStops` already says `>= 6` and
    gains the ring), `src/adapters/railway.ts` (`stopsOf`). `test/railway-line2.test.ts`'s
    `LINE2_STATIONS.length === 6` becomes 7. The views' six are R4a's.
  - `src/adapters/railway.ts` (moved here from R4a, so the client's stop table changes in the same step as the
    server's): the `stopsOf` fix, `Aperture` and halts 6 and 7 mirrored into `inspect()` (`ring = { head, set, rack,
    cw, brace, joined }`), the `ring` accepted edges (`footSet` site 3, `brace`, strike id 2), and `rail.brace` in its
    action union and allow-list.
  - `railway-world.ts`: `Aperture` in `ARCHETYPES`, `railwayView.ring`, `railwayCheck`'s count, the invariants.
    `railway-works-layout.ts`: `WORKS.total: 32`, `ring: 14, counterweight: 4`, `WORKS_SEAMS` row 2 from `RING_RIVET`;
    **`PIER_RACK` moves to the east side** (call 54): 3.5 m east of the real rail at s 733 m by the same
    least-displacement construction its comment describes, about `{ x: 140594, z: -36208 }`, `y` and `reach`
    unchanged. `railway-server.ts`'s reach check, `dev/level/rail-network.ts`, `dev/loop/` and the works bot read the
    constant and follow it. `railway-ring-layout.ts` (one constant, after R1b is on main): **`RING_Q7_FRAME` moves
    from s 720 to s 710 m**, still lat +4.5 (call 55: about `{ x: 140793, z: -33866 }`, 4.5 m east of the path point
    (140343, −33848)), so the frame (2 m across, 2.6 m along: lat +3.5 to +5.5, s 708.7–711.3) stands 1.7 m south of
    the foot of the Pier platform's ramp (s 713–719) and not in its south end; its test line and comment follow.
    `railway-jump.ts`: the landings of `q6-done`, `crossing-finishing` and `crossing-done` move onto the east
    platform's south end (call 57): s 720.5 m, lat +2.9, about `near(PIER_STOP, 3.2, 6.4, 25.0, CROSSING_BENTS[0])`,
    its `y` the deck top measured with a still (today's two spots, lat +3 and +4 at deck height, are inside the new
    platform and rack). `ringUnstuckHome` copies `crossing-done`'s landing, so Get unstuck from past the gap follows.
    `railway-line2-layout.ts`: `Q7` (`bill: [20, 20]`, `fromCm: 74200`, `toCm: 86200`, `panels: 20`, `crate`, `depot`,
    `shelf`, `feed: 'train'`, frame at `RING_Q7_FRAME`, `Line2StationId` gains `'Q7'`), opening once
    `Works.crossing >= 0`. Server, prediction, seeds and jump rows as under "R3". `namespace.ts`: `WORLD_NS = 'v27'`
    with the dated line ("Ring Island build 1: Q7, the bents to the gap, `Aperture`, the Railhead and Ring Island
    halts (buffers and a crossover), the Pier homeward-only, line 2's third train; no migration").
  - Tests (`test/railway-ring.test.ts`): each op refused before its gate (brace and counterweight before `set === 14`,
    strike before `brace === 0`, site 3 before Q7) and accepted after; brace then four weights, and four weights then
    brace, both end with `brace === 0` on the last accepted op; a repeat brace or strike moves nothing; `head`
    advances on each bent's second footing **with a train standing at the Railhead and another running to it, and
    `validateRailway` passes on the same tick**; the island halt opens on `joined` and only then, with a train in each
    of the three cases of `endMoved`; the Pier's up lever is refused once Q7 is laid and accepted while it is the end;
    footing conservation over a seeded 5,000-op random run of footTake, footSet, brace, strike and wagon ticks across
    1–3 accounts; **`Works.pierRack` is 0 from the twelfth pier footing on, through that whole run** (no wagon arrival
    or op puts a ring footing on the pier rack: the cargo guarantee behind call 54); an account leaving keeps
    `Aperture`; round-trip through `railwayView` and the replicated
    components; each seed stage passes `validateRailway`. `server/test/railway-ring-host.test.ts`: reach refused off
    the current railhead (the lever too, from `haltPlatform`), malformed `rack`/`site`/`id`/`revision` refused without
    a throw, a stale brace refused.
  - Checks: `npm run loop -- run` (rail rules change: Q7, the ring's footings, the wagon's end; report the wagon
    laps' time), `npm run checkpoints`, `npm run check`, `npm run check:full`, `npm run test:net` (the adapter),
    `test/server-image.test.ts` green with no list edits (both new files are under `src/sim/`). Proof: headless, no
    look.
- [x] **4a. R4a, the line goes out (views).** (built 11 November 2026, branch `ring/r4a-views`; see the note under this step)
  > **Flag (R3a, 10 November 2026):** `src/entities/railway/halt-map.ts:39` takes the last `LINE_HALTS` entry as the
  > Pier (`LINE_HALTS[LINE_HALTS.length - 1]`); once R3b appends halts 6 and 7 that is Ring Island. Find the Pier by
  > name or id there, and check `halts-view.ts`'s `chained` (its `filter(...).length - 1`) and `train-view.ts`'s
  > `trainRequestable(..., n, ...)` (pass the open stops) for the same assumption.

  `crossing-view.ts`: Q7's double deck over bents 1–6, laid panel by
  panel; its `open()` reads `pierLaid`. `pier-view.ts`: the pier's up track from the old merge (s 556) to the pier
  head, laid when Q7 completes; **no up platform** (owner's answer 4). **The Pier as ruled (calls 53–61), all of it in
  place from Q6, none of it changed by Q7:**
  - `halt-map.ts`'s Pier row: `lat: -2.9` becomes `lat: +2.9` (s 719–741 unchanged). `makeHalt` mirrors the rest by
    `sign`: the deck at lat +1.65 to +4.15 on its piles, the shelter and bench on its seaward back edge (s 721.2–729.2),
    the board in the shelter facing the rails, the signal mast (s 740.2) and the one-handle lever (s 739.6, lat +2.45,
    plaqued **Village**) at the north end, the one ramp up from the trestle's deck at the landward end (s 713–719).
    The lever is not touched when Q7 is laid (the plan's earlier "shows only the homeward handle once Q7 is laid" is
    void: it has one handle from the start, the end's way out).
  - `crossing-view.ts`: the rack's row is on the east platform's seaward edge (it reads `PIER_RACK` and the line's
    yaw; only its comment's lats change, to +2.9 to +4.1). The pier head's side deck shrinks to **the pad**: s 741–746,
    lat +1.8 to +5.3, at the trestle's deck height, carrying the jib (`PIER_FRAME`, unchanged: s 742.3, lat +3.5); the
    platform's north end stands 0.68 m above it (a drop going out, a plain jump coming back; a footing is set from the
    platform's last 3 m, which are inside `PIER_FRAME`'s reach). A **piled deck for Q7's frame**, s 703–713, lat +1.8
    to +6.0, at the trestle's deck height, joined to the trestle and to the ramp's foot, with the frame's depot rack
    and shelf on it. A **plank footway on Q7's deck**, lat +1.8 to +3.3 (1.5 m), from the pad (u 4) to where
    `RING_WALK` begins (u 95), laid with Q7's panels (view and collider; the sim never reads it), and a finger board on
    a post at the pad's north-east corner pointing out along it, lettered **Railhead** (a placeholder, as the plaque).
  - The pier's west side gets nothing: once Q7 is laid the deck runs to lat −5.8 with the up track at −4 and open sea
    beyond, as the trestle's edges are today. The old merge's turnout (s 556–576) is relaid by the machine as plain
    double track with Q7's first panel (call 61).
  - Whatever draws the pier's rails and deck must be in this step: `track.ts` and `src/place/layout.ts`'s
    `FORMATION.quarry.to` (556) are not in this step's file list above and `pier-view.ts` today holds only the
    rockets. The implementer adds them to the step (an engineering gap, flagged by the design review).

  `train-view.ts`: four trains; `pierOpen`
  reads `pierLaid`; the `crossing` predicate (`row.turn || !pierOpen()`, one crossover a line) becomes "on track 0,
  and either `row.turn` or the crossover's halt is the open end", for Far Head's and for the island's
  (`RING_END.cross`, lateral eased as `crossLat`); past s 55600 a train's lateral comes from the open end's `RailEnd`
  (a stub's turnout over `TURNOUT_CM` before its merge, shifted with the railhead), not from `FORMATION`; the wagon's
  unload at `row.at === 4`; `trainRequestable` passed the open stops. `halts-view.ts`: its `PIER` test reads
  `pierLaid`; the request levers, plaques and prompts of halts 6 and 7 from `haltPlatform` (the Railhead's sliding
  with `head` over about 3 s, no prompt while it moves; the island's west lever chained and plaqued with the branch,
  its east lever live from `joined`; the Railhead's west lever chained until `joined`); the Pier's lever is unchanged
  (above). `halt-map.ts`: the Pier is found by name, not as the last halt; the two new
  halts on the map. `line2-view.ts`: `active < 0` no longer means Q6's index. Every train's folk driver (v26 gives
  one a slot): check the fourth. Checks: `npm run check`, `npm run perf` at the pier head, `npm run checkpoints --
  deck-laid`. Proof look: `npm run look -- --rail-seed deck-laid` from the pier head along the laid double deck to the
  bent-6 railhead; the Pier's east platform from the trestle's approach and from above, before and after
  (`--rail-seed crossing-finishing`, the cameras of the design review's stills: `--cam 1403.4,26.4,-322 --look
  1402,25,-372` and `--cam 1402.6,46,-338 --look 1402.3,24,-360`), and at `deck-laid` an up train passing the Pier on
  the far track while the camera stands on the platform; an eval there walks a footing from the rack to the jib without
  stepping on the track, and lands `crossing-done`'s jump-in standing on the platform, not in it; and `--rail-seed ring-joined` from the island's east platform as an up train comes over the
  crossover and stands short of the buffers.
  > **Built (implementer, 11 November 2026): R4a, the views of v27, on `ring/r4a-views`; not shipped.** What stands:
  > the Pier east (`halt-map.ts` row at lat +2.9, found by name; the apron shrunk to the pad, s 741-746; Q7's piled deck,
  > s 703-713, with the frame, rack, shelf and box on it; the finger board "Railhead" once Q7 starts), Q7's double deck laid
  > a panel at a time and the pier's up track dropped in from the old merge when Q7 is done (`ring-deck.ts`, held by
  > `pier-view.ts`; `track.ts` gained `retire`), trains posed on line 2's ring path past the pier head
  > (`line2-path.ts`) with their up-track lateral read from the room's rows (the Pier's stub, the railhead's stub sliding
  > with `head`, Far Head's and the island's crossovers; the Q7-turned train no longer takes Far Head's crossover),
  > the Q7 kit unloading at its own halt, `trainRequestable` given the open stops, the Railhead's and Ring Island's levers
  > (`halts-view.ts`: chained until the rivet, a chained plaque naming the halt that opens next, no prompt while the
  > railhead's slides), `PIER_LAND` standing on the platform (the pad is 0.7 m under it, no longer under it). New reads go
  > through the facade (`test/railway-r4a-views.test.ts`: each read against the inspection it replaces at the five ring
  > seeds over 300 frames, and the lateral's no-jump sweeps).
  > **Deviations, for the owner or the designer:** (1) the laying machine does not travel out onto the deck: it stays
  > parked at the pier head while Q7's deck drops in (the machine's track and panel view are Place's six stretches; a
  > seventh needs `place/layout.ts`'s line past s 743, which the layout does not hold). (2) The up track's relay waits for
  > Q7's completion, not its first panel (call 61): the trains' lateral is the sim's, and the sim's end moves only then.
  > (3) The halt displays' map keeps v26's six stops: with the Railhead and Ring Island the 320 x 256 faces cannot place
  > their names ("Pier" covers the Railhead's ring; "Village" covers Camp's), so `island-map-labels` goes red. It needs
  > bigger cells, a second inset or a re-fit, a designer's call. (4) Files outside the list were touched for what v27 broke
  > or needs: `shelf-view.ts` (read `quarry.stations[6].side`, which does not exist: the shelf view threw while Q7 was
  > active), `crates-view.ts` (`rewardSeat` read `stations[6].s`: the boxes view threw at mount), `stations.ts` and
  > `spatial-station.ts` (a frame on a deck: `FrameAt.y`), `look-kit.ts` (36 train wheels for four trains), `track.ts`.
  > (5) The railhead rack's wagon hop is wired (`footPlaces({ ring })`, `footFlying().toRing`) but R4b mounts the place.
  > **For the owner (answered 11 November: "Keep" the jump-in labels; "Keep both" for the "Station 7" board and the "Ring Island" lever plaque):** the jump-in labels "Deck laid" and "Ring joined" exist (`src/world/railway-jump.ts:103, 109`); the
  > frame's board reads "Station 7" (a label the plan does not name); the island's west lever is plaqued "Ring Island",
  > not a branch emblem. Unchecked: the eval that walks a footing from the rack to the jib (not written), `npm run perf` at the
  > pier head, a train at the island's crossover.
- [x] **4b. R4b, the railhead and the gap.** (built 11 November 2026, branch `ring/r4b-railhead`; see the note under this step) `src/entities/ring-railhead/` as under "R4"; `lookout/view.ts` lifts buoys
  by `RING_BUOYS`; `hook-view.ts` adds the pile's ring once `set === 14`. Before and after stills of the finished bow
  from Home's summit and the telescope, logged (brief risk "the bow changes a finished view"). Checks: `npm run check`,
  `npm run perf` at the railhead, `npm run level-check`. Test (in the eval below or a node test of the view's
  colliders): a player standing on the railhead platform's back half while `head` advances is still standing on the
  walkway afterwards, never in the sea; Get unstuck from the brace platform before `joined` lands on the Pier halt's
  deck (owner's answer 2: this step does not touch `ringUnstuckHome`).
  Proof look: `--rail-seed gap-footed` from the take-off (the greybox's `views.gap` camera, moved with the platform):
  the brace platform, the gold strut and the waving folk straight ahead and 7.6 m down, the leaf on your left.
  > **Built (implementer, 11 November 2026): R4b, the railhead and the gap, on `ring/r4b-railhead`; not shipped.** What
  > stands: bents 7-13 each standing on its second footing, the span (planks, stringers, both tracks' rails, the side
  > walkway) dropping on it, the railhead platform, rack, jib, buffers and the stub's crossover sliding out with it at 7 m/s
  > (`railhead-view.ts`, `railhead-shape.ts`; the platform's collider only while it is where the sim has it, the walkway
  > under its old place always), the gap as stakes, glowing sockets and a striped beam, the footing's rope from the jib into
  > its socket, the prompts at the rack (rack 2) and the jib (site 3) and the wagon's ring hop (`footPlaces({ ring })`),
  > with bent 13 the hook pile and pad, the take-off rail and the joint's west platform with its plank crossing, the island's
  > hook ring joining `hook-view.ts`'s rings at `set === 14` (`setIslandRing`), the lookout's buoys lifting by `RING_BUOYS`.
  > Test: `test/railway-r4b-views.test.ts`. **The P1 (trains over open water at ring-joined):** the near view of the island
  > was never kept mounted (nothing set `ringIslandNear.keep`, which R4a's note says it did), so past 650 m there was no
  > Way at all, and the leaf stayed raised after the rivet; the railhead view now sets `keep` from Q7 and lays the leaf flat on
  > `joined` until R4c swings it. **Deviations:** (1) the view is `src/entities/railway/railhead-view.ts`, mounted by
  > `works-live.ts` beside the crossing, not `src/entities/ring-railhead/`: it needs the adapter's actions and accepted
  > edges, which only the railway view holds (R4c-R4e will want the same seam). (2) The kit slides when the bent has
  > stood (about 3.8 s after the second footing is set), not at once with the sim's head: the prompts at the rack and
  > jib wait for it. (3) The crane's little guy does not bow at a lifted buoy. (4) Not run: `npm run perf` at the railhead,
  > the before and after stills of the finished bow from Home's summit and the telescope, the eval that drops a player on the
  > platform while `head` advances (the walkway's cover is a test of the numbers). R4a's P3 (old merge sleepers kept after
  > the relay) is fixed in `track.ts`; its P2 (the laying machine travelling out onto the deck) is not, it is Place's six
  > stretches. `dev/look/ring-mid-seed.ts`: `--rail-seed ring-set-N` (N 0-14), a look save with N footings set.
- [~] **4c. R4c, the leaf.** (views and prompts built 11 November 2026, branches `ring/r4c-leaf` and `ring/r4c-prompts`: the swing, the single writer of `ringIslandPose`, the brace and counterweight prompts, the player under the toe; the two-player proof, the toe with others watching and `test:net` on 11 November; left: splash, creak, bracket outline, rivet glint) `src/entities/ring-leaf/` as under "R4". Checks: `npm run check`, `npm run test:net` (the leaf's
  state mirrored on three tabs). Proof look (Done means): `npm
  run look -- --players 2 --rail-seed leaf-raised`, one player braced on the island side, the other hanging the last
  counterweight footing: the leaf swings down onto the bents on both pages. Also in the eval: a third player standing on
  bent 13's deck end at u 258 as the leaf lands ends on top of it or beside it, never inside it.
  > **Built (implementer, 11 November 2026): R4c prompts, on `ring/r4c-prompts`; not shipped.** (1) The brace prompt: verb
  > "Pull" (the lever's, reused) at the gold strut (`RING_BRACE`, the server's own reach test), offered only while
  > `set === 14` and `brace === 1` (`braceOffered`, `leaf-shape.ts`; `leaf-view.ts` `targets()`, via `works-live.ts`).
  > (2) The jib's prompt stays "Set the footing" and now also offers a counterweight footing while `cw < 4` once the gap is
  > footed (`jibOffered`; `railhead-view.ts`). "Knock out the pawl" and "Hang the weight" are not used: owner to choose. **Answered 11 November: use the plan's two labels** ("Knock out the pawl" for the brace, "Hang the weight" for the counterweight; orchestrator's reading); built 11 November (Copy table).
  > (3) The player under the toe: while the leaf is coming down (35 degrees or less) the local player within 1.4 m of the
  > toe's edge or under it (u 258.6 to 261 m, on the deck) is walked back along the deck at 6 m/s, away from the hinge
  > (`toeShove`); no tumble, no lift; once settled nobody is moved. Others' pages shove their own player. Tests:
  > `test/railway-r4c-leaf.test.ts` (windows over every set, brace and cw; the seeds; the shove). Looks:
  > `dev/look/evals/railway-leaf-act.ts` (`--rail-seed leaf-raised`, real prompts: pull, then four rack-to-jib trips;
  > `--query leafdo=under` steps onto u 259.4 as the last footing hangs). **Not done:** the two-page and three-page
  > looks, `test:net`, the tumble, splash, creak, outline, glint. Not tested on a device.
  > **Proved with more than one player (11 November 2026, branch `worktree-agent-a00c6f3ef6bd6dc01`; not shipped).**
  > (1) Two players: the brace from one and the counterweight from another, brace first, weights first and a same-moment
  > race in both arrival orders, each page landing the leaf once on the server's row, nothing corrected
  > (`test/railway-r4c-leaf-coop.test.ts`, real requests and adapters at 0-200 ms); each judged at its own actor's spot on
  > the real host (`server/test/railway-ring-host.test.ts`, "one player braces, another hangs"). (2) A third player under
  > the toe and a fourth on the deck: on their own pages never inside the plate, still on the deck, the one on the deck
  > never moved; a remote has no body for the leaf to hit (presence poses only), so others see only where the avatar is
  > drawn. That **failed** with the shove from 35 degrees: at 200 ms one way the remote was drawn inside the plate for
  > about 160 ms of a brace-last swing on every other page. Fixed in views: the shove starts at 60 degrees, and only on
  > the last swing (`falling`), never on a counterweight's dip (the look showed the dip walking someone off the toe with
  > the leaf metres up). (3) A page joining mid-swing snaps to the landed leaf, no swing replayed. `test:net`
  > (`railwayLeaf` in `dev/peer-test/ws-railway.ts`): the row on three tabs at 0, 100 and 200 ms raised, braced and
  > dipped, down and joined; a late joiner while braced and half hung, a reload while down (nothing replayed), a restart
  > once joined. Two-page look: `npm run look -- --players 2 --real --rail-seed leaf-raised --eval
  > dev/look/evals/railway-leaf-coop.ts --action dev/look/evals/railway-leaf-coop-hang.ts --seconds 3 --frames 8`:
  > player 1's sheet has the leaf down from 19.5 degrees onto the bents by 2.1 s with player 2 at the buffer short of
  > the toe; player 2's still has the landed leaf ahead, both tracks on to the island. The third player is in the unit
  > model, not rendered. Not tested on a device.
  > **Review fixes (11 November, same branch):** the leaf's rest read `read.ready()`, which is also false with a full
  > pending window or the link down, so a landed leaf rose and landed again (and a landing could stop walking you
  > clear); it now latches the first readiness (`first-ready.ts`, shared with `train-view.ts`), and so do
  > `railhead-view.ts` (bents 7 to 13 and their colliders un-decked), `crossing-view.ts` (the pier decks lifted) and
  > `cart-view.ts` (the cart hidden), which had the same read. The multi-player tests now drive the real
  > `createRailwayLeaf` and live in `test/railway-r4c-leaf.test.ts`. A restore (reconnect, hard reset) snaps the leaf to
  > its rest with no walk back; a landed plate lies 0.68 m below the toe deck's top, so it is never inside anyone there.
  > **Leftovers:** P2, the toe pennant (`ring-island/view.ts` `buildLeaf`: a 12 m mast and a 10 by 5 m flag past the toe)
  > has no collider and sweeps through anyone on the railhead deck (u 248 to 260) as the leaf comes down, then lies
  > about 1 m inside that deck with the flag reaching past its edge; it was the pale band in the two-page sheet. P3,
  > `toeShove` (`leaf-shape.ts`) has no sideways bound: anyone at deck height in the toe's span along the line is
  > walked back, whatever their lateral offset.
- [x] **4d. R4d, the Meet and the first crossing.** `src/entities/ring-meet/` and the union in `shared-moment.ts`.
  Checks: `npm run check`, `npm run test:net`. Proof look (Done means): the same two-page room, then strike: the
  rivet glints, the 6 s shot plays on both pages, uninterruptible but for the one skip, `inspectRailway().ring.joined`
  set; a third page joining after gets the snapped state, no shot, then the Meet framing on its own first crossing.
  > **Built (implementer, 11 November 2026): R4d, on `feature/ring-r4d`; not shipped, browser proof not taken.**
  > (1) `src/entities/ring-meet/view.ts` (the view) and `shape.ts` (pure decisions), mounted by `works-live.ts` beside the
  > leaf because it needs the adapter's accepted edges; there is no `index.ts` (nothing for the glob to spawn).
  > (2) The rivet: a brass stud in the joint at bent 13's toe, dull until the leaf is down (`brace === 0`), then gold,
  > pulsing, with gold motes rising (`goldMote`, within 160 m of the camera) until struck; the prompt "Strike the rivet"
  > only with the leaf down, `joined < 0`, the breaker in hand (the rule's `Works.breaker === 2`) and no boiler on your
  > back, inside `RING_RIVET.reach` (the server's own test). (3) On the accepted `rail.strike` id 2 (`meetOffered`): the
  > clang, a thump and a burst of gold at the stud on every page, and `playSharedMoment('the meet')`: the banner ("Ring
  > Island" over "The line has arrived", 4.5 s) and the 6 s shot, from back along the bents above the leaf, running
  > along the joined line to the halt, looking at the RINGWORKS board and the buffers (`MEET_SHOT`). The shot is
  > `createCameraPullOut`'s: only the one skip ends it. Never from a restore: the frame the first whole state arrives
  > (`createFirstReady`, not `read.ready()`) places the stud and drops any shot. A refused prediction takes the shot back
  > unless the rivet is struck anyway (`meetKept`: a same-moment race keeps it). (4) The first crossing: a standing rider
  > (`carry.on`) crossing u 259.5 m toward the island with the rivet struck gets, once per player per room, the 5 s
  > pull-out (`CROSSING_SHOT`) if they saw the Meet, or the Meet's framing for 5 s if they did not (joined late, seated,
  > reduced motion); memory is `createSeen('boogle.ring-meet.v0')` (now exported from `ability-arrival.ts` with a store
  > name), marked only when a shot was actually queued. **Reads:** the `Aperture` row (`set`, `brace`, `joined`), `Works`
  > (`breaker`) and `Boiler` (`state`, `holder`) through `adapter.read.world()`, re-read at the head of `update`, `accepted`,
  > `corrected`, `targets` and `restore`; "`inspectRailway().ring.joined`" is `aperture(world).joined >= 0` here. Nothing
  > reads `inspectRailwayLegacy`. No sim rule, wire or `WORLD_NS` change. Tests: `test/railway-r4d-meet.test.ts` (the
  > offer, the race, the late-join framing, the crossing once, the prompt and glint windows, the shots' geometry).
  > **Not done:** the breaker's swing at the rivet (the prompt strikes at once; the Works' swing is `breaker-view.ts`'s),
  > the browser proof (two pages, strike, third page), `test:net`. Not tested on a device.
- [x] **4e. R4e, the island's folk.** `src/entities/ring-folk/` as under "R4", lines in `lines.ts` (Copy, below).
  Checks: `npm run check`, `npm run perf` at the island halt. Proof look (Done means): `--rail-seed ring-joined`, the
  camera in the island square: four lookers stand upright facing the shard; the whistle swaps two of them for the two
  who rested. (The staring-up pose and the nod were overruled by the owner, 11 November: see the Built note.)
  > **Built (implementer, 11 November 2026): R4e, on `feature/ring-r4e` (sits on `feature/ring-r4d`); not shipped, browser proof
  > not taken.** (1) `src/entities/ring-folk/`: `shape.ts` (pure: the rota, stations, lane and walk, the facts that
  > pick a line), `lines.ts` (the Copy table verbatim), `view.ts` (the figures), mounted by `works-live.ts` beside the Meet
  > (no `index.ts`, it needs the adapter). (2) Seven figures from the village folk kit (`place/folk.ts`: a `looker` job,
  > `addLooker` and capacity +8, nothing else): six crew in orange hard hats and Hooter in blue. The island's square is the
  > works yard east of the halt, between the tarped steel and the drop hammer (no layout constant named a square). Four
  > crew stand at four posts, upright and turned to face the shard (`FACE_AT`, `RING_SHARD`), two rest on the lane south of the tarp. `shiftAt(tick)` is
  > `floor(tick / 450)` on `adapter.read.tick()`: at each whistle two post-holders hand over to the two who rested
  > (everyone stands at most two shifts and every crew member gets turns; the rota repeats every 6). Hooter's whistle
  > (`machine-sfx` `whistle`) sounds at the clock's edge only when the page saw the previous shift; a first read, a remount
  > or a stall that skipped shifts snaps with no whistle and no walk. (3) **11 November, owner (seeing the first stills, where the lookers leaned and tipped their heads back): "why are the little guys leaning over, they can just be standing", then "they can just be facing the shard maybe".** The orchestrator's reading, recorded as its own: the folk stand upright like the village folk, no body lean and no head tipped back, turned (yaw only) to face the shard. That replaces "stare straight up"; two earlier tries (the whole body tipped 54 degrees, which read as lying down, then an upright body with the head tipped back on a new head pivot and a hat split from the coat) were built and reverted: the kit is as it was. **The nod is dropped:** with no head pivot the kit's only bob is its talking gesture, which reads as a raised hand. The resting crew still turn to face a player nearby. Logged in `docs/decisions-rail.md`. (4) Talk with Rivet (gold hat), Squint
  > and Hooter; lines from `linesFor(who, facts)`: "arrived wet" is a swim in the last 60 s (local clock), "glided the gap"
  > and "swam over" are per-player per-room memory (`createSeen('boogle.ring-folk.v0')`, written from where the player
  > swims or glides: `swamToIsland`, `glidingTheGap`), "first ride" reads the Meet's `crossing` memory, the co-op line counts
  > `accounts(world)` and waits for `joined`. **Reads:** `Aperture.joined` and the accounts through `adapter.read.world()`
  > (inside `facts()`, re-read per Talk), `adapter.read.tick()`, `createFirstReady`; no world kept. No sim rule, wire or
  > `WORLD_NS` change. Tests: `test/railway-r4e-folk.test.ts` (13). Look: `dev/look/evals/ring-folk.ts`. **Not done:** the
  > browser proof, `npm run perf` at the halt (owed at the checkpoint), "the rivet toss" (the plan gives it no trigger or
  > copy), Hooter's line spoken as a bark at the whistle (it is a Talk line only). Not tested on a device.

### Design review: the halt map at eight stops (designer, 2026-11-11)

For step 4a's "the two new halts on the map", which R4a left out (`ring/r4a-views`, deviation 3: `island-map-labels`
goes red). A ruling for the builder; calls 66–70 are logged in [agent-calls](../agent-calls.md) and the build proceeds
on them.

**What was measured.** The game's own `fitMap` and `mapLabels`, run on eight stops built from `line2-path.ts`, for all
six displays, both layouts and all eight railheads (scripts outside the repo; stills were mock-ups drawn from those
boxes in a system font, not the game). Not done: an in-game look, a device.

- The failing names are a symptom of scale, not of two more names. The sea line is 465 m of straight track north of the
  Pier; with it the map spans 858 m, not 393, and every face's scale drops from 0.33–0.52 px/m to 0.21–0.31. At 0.21
  Village, Camp and Quarry sit 32–37 px apart while each stop keeps a 21 px circle clear and a name is 22 px tall and
  50–134 px wide.
- The Pier is the island's northmost point, so it sits one pad (28 px) from the face's edge on every face, on whichever
  side north falls. Nothing fits past it without shrinking the island.

| Option | Result | Verdict |
| --- | --- | --- |
| Re-fit to true scale, today's sizes | 4 or 5 of 6 faces fail at the first and last railheads (33 failing faces over the eight) | No |
| The same, one name dropped (no Railhead) | 3 faces still fail ("Village" covers Camp) | No: the count of names is not the cause |
| The same, names allowed further out with leader strokes | Passes most faces, but the leaders cross at Village, Camp and Quarry and a name no longer sits by its stop | No |
| Abbreviations | Not available: stop names stay as they are | No |
| An inset for the sea leg, island unchanged | A two-name inset needs about 165 × 90 px; even 150 × 60 is free on only 9 of the 11 v26 faces, in a different corner each time | No: it costs island scale as well, and adds a frame and a second "Pier" |
| A band along one edge for the sea leg | The six island names stop placing once the face loses 48 px (1 to 3 faces fail; 3 at 56 px) | No |
| The sea leg drawn short, in line | Three stops in a row need about 86 px past the Pier; that returns to within a fifth of true scale, and needs a not-to-scale mark | No: little gained for a map that is no longer true |
| **Re-fit to true scale, every mark at 0.7 of today's size** | Passes every face, both layouts, all eight railheads, seven names and eight, with today's label rules and no leaders | **Yes** |

**Ruling.**

1. **Until the Pier is laid the map is v26's, unchanged** (six stops, today's sizes, the pier stretch dashed and its
   name dim). Most of the game is played on this map and it loses nothing.
2. **From the Pier laid (Q6), every display re-fits to the whole of line 2 at true scale**, out to Ring Island: the sea
   line dashed, Ring Island dim at its end. Track, dots, rings, names and train markers are drawn at 0.7 of today's
   size (a name 0.06 of the face's height, was 0.085). The boards already redraw at that moment.
3. **The Railhead is on the map only once it is a stop.** No dot and no name before Q7 is laid (seven names). From Q7
   laid it is a lit, named stop at the end of the solid track, and it moves out with `head`: one redraw per bent
   footed, no animation. The dashed line beyond it shortens toward the dim Ring Island, so every display in the game
   shows how far the line has got. Until Q7 completes the solid track ends at the Pier.
4. **On `joined`** the line is solid to Ring Island and its name lights. The Railhead stays where the last bent put it.
5. Nothing else changes: face size and place, the turn of each face, the colours, the blink, the Works and glider
   marks (they are placed by world position, which a true-scale map keeps right; an inset or a shortened leg would
   not).

**Why, against DESIGN.md and the decisions.** The owner's map decision (9 November) asks for both lines "where they
really run" and every station named; this is the only option measured that keeps both. Show, don't tell ("what's on
screen is true"): the crossing's real length and the railhead's real place are on the face, with no symbol to learn.
Telegraph everything: the next connection is on every board from the moment it becomes the goal, and the solid line
growing toward it is the build's progress (sea-crossings: keep the destination in view). The cost is type size, which
is the phone question: with the whole face in view in portrait a name is about 19 CSS px (26 today), still above body
text. That is an estimate and the look below must confirm it. Bigger cells are an engineering choice the builder may
take if the stills show soft letters (sizes are fractions of the face, so the design does not change).

**Calls.**

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| – | Both lines where they really run, every station named, unlaid track dashed and its station dim | Decided | Owner, 9 November ("Halt boards show the island map") |
| – | The Railhead stays a stop after the Meet; stop names as they are | Decided | Owner, 10 November ("The Railhead stays as the Meet's halt") |
| 66 | From the Pier laid, the displays re-fit to all of line 2 at true scale, sea line included; before that the map is v26's | New | Recommended: the island keeps the whole face for as long as there is nothing past the Pier to show |
| 67 | On the re-fitted map every mark is 0.7 of today's size | Default | The largest size that passes both layouts at every railhead; 0.8 passes the live layout and fails one Home-island face at railheads 4–7. Raise it if a label fix clears that face |
| 68 | No Railhead dot or name before Q7 is laid; from then a lit named stop that moves with `head` | New | Recommended: the name on the finger board and the levers is on the map when a train can take you there, and not before, when nothing stands there |
| 69 | Ring Island shows dim from the Pier laid, not from the first board | Default | The ring is already on the horizon; the map names it when it is next |
| 70 | Solid track ends at the Pier until Q7 completes, then at the railhead's stop; one redraw per railhead, no animation | Default | Follows the sim's end (R4a deviation 2) |

**Acceptance.**

- `test/island-map-labels.test.ts` and `test/island-map-labels-b.test.ts` (helper `test/helpers/island-labels.ts`)
  pass with these cases, each for every display: the Pier unlaid (six names, today's sizes); the Pier laid and Q7 not
  (seven names); Q7 laid at each of the eight railheads (eight names); joined. In each: every name placed once, on the
  face, clear of every other name and of every stop's ring and standing train. Add: no two stops of different names
  closer than a ring plus a dot. The counts stay 6 and 5 displays. The helper reads the sizes the boards use, not its
  own copy.
- A test that a train's marker on line 2 follows the path past the Pier: `pathAt` at the Railhead's and Ring Island's
  `s` gives their stops' points, at railheads 0 and 7.
- `npm run check`.
- Proof look, `npm run look`, standing 1.5 m in front of the face at eye height, at the Camp, Village line 2 and Pier
  displays, each at `--size 390x844` and at the default size: `--rail-seed trains-on` (v26's map, as today),
  `q6-done` (seven names, dashed sea line), `deck-laid` (the Railhead lit at the first railhead), `ring-joined` (all
  lit). Every name reads in the portrait stills without zooming; a train standing at the Pier and one at the Railhead
  are two markers. Read the stills and say what could not be seen. If a name does not read in portrait, stop and
  report: the fallback is a designer's call, not smaller type.
- `docs/game-design/place.md`, "Departure boards at the halts", says what the map now shows and when it changes.

**Owner questions.**

1. Names on the map get 30% smaller once the line heads out to sea, so the whole crossing fits at true scale.
   Recommended: yes; the other way to fit it is an inset that shrinks the island anyway.
2. Should Ring Island be on the map from the first board, dim? Recommended: no, from the Pier laid, so the early map
   keeps today's size.

**Answers (owner, 11 November 2026).** 1: "Yes, smaller is fine". 2: "From the Pier laid". Both are the recommendations, so
nothing in this review changes: calls 66, 67 and 69 are confirmed
([decision](../decisions-rail.md#d-2026-11-11-ring-island-views-open-calls-answered)). Calls 68 and 70 were not put to
him and stay open in [agent-calls](../agent-calls.md). The build (not started) proceeds on all five.

**Built (11 November 2026, branch `worktree-agent-ac35c61470c137016`).** Calls 66 to 70 as recommended (68 and 70 are
still unanswered by the owner). `halt-map.ts` builds the map per stage (`haltMap(layout, {open, head})`), the boards refit
and redraw when the stage changes, `island-map.ts` has `MAP_CELL` and `MAP_SEA_SCALE`.
- [x] Map by stage: v26's until the Pier is laid, then all of line 2 at true scale at 0.7, the Railhead from Q7, solid to Ring Island when joined.
- [x] `island-map-labels` tests for every display at every stage (5, 6, 7, 7 names: the design counted stops, not names, as Village is shared) and the ring-plus-dot gap between stops of different names.
- [x] `pathAt` test at the Railhead's and Ring Island's `s`, railheads 0 and 7 (`test/island-map-path.test.ts`).
- [x] `npm run check`.
- [x] `place.md`, "Departure boards at the halts".
- [ ] The in-game proof look (`npm run look`, the 3D face at 1.5 m): not taken, the machine was at load 140; the map texture was drawn by the game's own `drawMapBase` in a browser canvas instead.

- [ ] **5. R5, the bot and the loop graph.** The works bot's pier carries (`dev/look/bots/railway-works.ts`) and the
  loop graph's `crossing` node are re-run with the rack on the east platform (call 54): the bot no longer crosses the
  track, and `npm run loop -- node crossing` reports the new carry (expected 5–9 m, was 11 m).
  `dev/look/bots/railway-ring.ts` (registered in `bots/railway.ts`): from
  `deck-laid`, waits for the wagon, carries rack to jib 14 times, rides each new railhead; from `gap-footed`, glides
  the gap (reusing `railway-glide.ts`'s flight), braces, hooks back to the pad; hangs four weights; strikes; rides
  from the railhead to the island halt, over the crossover to the stop short of the buffers, and back to the Pier,
  **standing over the bow** (review finding 6), logging any fall, and the seconds it stands at the railhead between wagon loads (finding 5: over 60 s a load, the ring's
  railhead rack and the wagon's load go to 9, a logged Default). `RAIL_STOPS` gain `deck-laid`, `gap-footed`,
  `leaf-raised`, `ring-joined`, `ring-ride`. New eval `dev/look/evals/ring-glide.ts` (from
  `railway-glide-first.ts`): a sprint double jump misses into the sea with the second press at the apex and pressed
  late, a glide after one jump lands on the brace platform dry, the hook back connects from the platform, a missed
  glide swims to the hinge pier's ramp and walks out. `dev/loop/graph.ts`: nodes `Q7`, `bents` (14 footings, wagon, cue: the next bent's
  stake and socket), `gap` (glide, cue: the gold strut and the waving folk), `brace` (cue: the gold strut),
  `counterweight` (4 footings, cue: the bracket's lit outline), `rivet` (cue: the glint), `ring` (first ride), with
  their order facts. Checks: `npm run loop -- run` (no softlock, no "NO CUE" among the new nodes), `npm run playthrough
  -- --from deck-laid --to gap-footed`, `--from gap-footed --to ring-joined`, `--players 2 --from leaf-raised --to
  ring-joined` (hashes agree), `npm run perf` on the stub and at the island halt. Proof look (Done means):
  `--rail-seed gap-footed --eval dev/look/evals/ring-glide.ts`, its landing still. Then `npm run ship` for R3a–R5
  together, not mid-session.
- [ ] **6. R6, docs.** New `docs/game-design/ring-island.md` (what exists: the Meet, the rules, the numbers, the folk)
  and its index line; the brief's status (build 1 built, the greybox findings answered: step 0's results); the atlas
  railway story (a footing set at the railhead jib through `Aperture` to the leaf); this plan's status. Stills: the
  raised leaf from Home's summit, the telescope and (after its rockets fix) the Split-rock finale's last frame, at
  phone size (Done means). The calls the designer accepted are logged by the designer at review, not here.

## Calls

Every gameplay call this plan makes, for the designer's review. **Kind:** Decided (cited), Default (implied, made
concrete), New (this plan's).

| # | Call | Kind | Why |
| --- | --- | --- | --- |
| 1 | Sequence: Q7 lays the double deck over the six footed bents (u 0–120); then the 14 footings extend the line bent by bent, each pair raising one bent with its span, and the railhead (halt, lever, rack, jib) moves out 20 m with each; then the gap, brace and counterweight, then the rivet | New | Matches the brief's seed order (`deck-laid` before `gap-footed`), "the railhead halt moves", "the wagon delivers to wherever the line ends" and "no second laying job"; the six built bents carry no deck today |
| 2 | Q7: 20 logs + 20 rails, 20 panels, train-fed like Q6, its frame on the pier's east edge (lat +4.5; at s 710, not s 720: call 55); opens once the pier is footed | New | 120 m at Q6's rate (32 a material for 196 m) is about 20 |
| 3 | The brace platform moves from u 276.5–289 at 10.0 m to **u 284–294 at 8.0 m**, its gold strut's foot to u 284.5, and the hook ring from u 270 to **u 276** (the planner proposed u 280–290 at 10.0 m and the ring at u 272) | New | Design review finding 1: a late-pressed double jump reaches 20.7 m at 10.0 m, so u 280 didn't separate it; at 8.0 m and 24 m out the double jump falls 2.2 m short and every glide that starts with a jump lands; the ring stays within 22.0 m of every corner |
| 4 | The bow's numbers: bents 7–13 at 19.5, 18.7, 17.9, 17.1, 16.3, 15.5, 14.7 m; hinge 14.0; the halt and its run-off 8.0 | Decided | Ruling 5 |
| 5 | The 14 bent footings and the 4 counterweight footings come by the wagon to the railhead rack (cap 6, three loads); rack to jib 15 m; each footing carried by hand once | Default | Review call 19 and finding 6; the grind budget's "twice" and "60 m" hold |
| 6 | `WORKS.total` 14 → **32** (14 + 14 + 4); the kiln's one fill casts them | Default | Corrects the logged "34" (agent-calls row 77), which counted the cradle's two footings that the 10 November late-game answer removed |
| 7 | One footing site at the railhead jib: it sets bents until the gap is footed, then hangs counterweights | New | One prompt, one place; the order follows from state |
| 8 | Four counterweight footings; once braced the leaf dips a quarter (19.5°) per footing; on the pawl it creaks and strains | Decided | Review recommendation 5 |
| 9 | Brace and counterweight in either order, each accepted only once the gap is footed; the leaf is down when both are done; the rivet needs it down | Decided | Review recommendation 2 |
| 10 | Line 2 runs **3 trains** in v27 (R3a's test may push it to 4) | Default | generic-lines call 34. Amended by call 47: v26 as merged bounds waits at 105 s, not 60 |
| 11 | The Meet shot is 6 s, the room's, on the `joined` edge; each player's first ride over the joint is a 5 s pull-out; whoever missed the Meet gets its framing then | Decided | Review finding 3 and call 11 |
| 12 | ~~The loop runs at 10 m/s (`railLoopSpeed` tunable), 2.5 m/s² sideways on its 40 m radius~~ | **Overruled by the owner, 10 November 2026** | "Ring Island while it's the end of the line: Buffers about 15 m past the halt, with a crossover before it". There is no loop, no `railLoopSpeed` and no loop leg (call 40) |
| 13 | The near view mounts within 500 m of the hinge or the halt, or once Q7 is laid; unmounts past 650 m | Default | Review call 24 |
| 14 | After the rivet the railhead stays a halt, with a new up platform on the last bent's west side (lat −9.6..−5.8) and a plank crossing at its end; before, it is a stub end with one platform | **Decided (owner, 10 November 2026)** | "The Railhead stays as the Meet's halt". Its plaque's name after the Meet is still his to give (open question 2) |
| 15 | ~~At the island halt a train on the up track always stands at the west platform (the end); round the loop, it stops at the east platform only on request~~ | **Overruled by the owner, 10 November 2026** | The same answer as call 12: with a facing crossover before the halt every train stands at the east platform (call 40) |
| 16 | Buoys 1–2 start lifted; buoy 3 lifts at bent 8, buoy 4 at bent 11, buoys 5–7 on the rivet | Default | Review call 23, with R1's positions (buoy 3 at about u 156, 4 at u 218) |
| 17 | The staring rota: 4 lookers, a swap every 45 s from the railway room clock (all pages see the same swap); a nod after 1.5 s standing still within 8 m, looking up over 50° | Default | Review call 27; the clock makes it the same in co-op |
| 18 | The hook does not work from the water (today's rule); a swimmer comes out by the ramps | Default | `hook-shot.ts`; ruling 1's "a swimmer within 17 m is in reach too, if the hook works from the water" is answered no |
| 19 | The drop hammer cycles every 2.4 s, heard within 120 m; steel under a tarp and the mural at the halt | Decided | Review recommendation 4 |
| 20 | The far leaf is drawn in the readable-glow orange; a toe pennant only if R2c's look fails | New | Level finding 5: 8 px tall from Home's summit at phone size |
| 21 | Accepted: from the island side, a partly lowered leaf (39° or 19.5°) is a walkable ramp up to a toe 5 m over our railhead | Default | Only after the brace, so after the gap is footed; slapstick, and the joint is walked anyway once down |
| 22 | The jib's prompt shows only with a footing on your back near it; the bracket's outline lights while a footing is on the railhead rack; the rivet's gold only once the leaf is down | Decided | "Turn the table only when ready"; review finding 2 |
| 23 | Pacing: Q7 about 3 min, the 14 footings about 6 min (three wagon laps of about 2 min, 8 s a set), gap and brace about 1 min, counterweight and rivet about 1 min, the first ride about 40 s: **about 12 minutes** of the six hours | Default | Review "Pacing" (10–15 min) |
| 24 | `rail.brace { revision }` names the brace state the actor saw (1); a stale or repeat press is refused | Default | Brief's Shape (gate-puzzles' revision rule) |
| 25 | `Aperture.threaded` is not added in v27 | New | Build 2 bumps anyway; no unused field |
| 40 | Ring Island's halt ends in buffers on both tracks 15 m past the platforms (u 483) with an end board behind them, and a facing crossover on the Way before it (u 395–417); every train stands at the east platform; the west lever is chained and plaqued with the branch | Decided (owner, 10 November 2026) | "Ring Island while it's the end of the line: Buffers about 15 m past the halt, with a crossover before it". The east platform follows from a crossover that leads up trains onto the down track, as Far Head's does; the chained west lever and its plaque are rail-map call 14. **Build agent, note:** the plaque reads "Ring Island" as built and the owner kept it on 11 November ("Keep both"), so "emblem, no name" no longer applies to the lever's plaque |
| 41 | Trains stand with the passenger car at the platforms' middle (u 448), 35 m from the buffers; no train is ever turned, so the engine is always at the island end | Default (reviewed) | Rail-map, "The station plan" (calls 11–13); the alignment itself is the owner's "trains may be longer than platforms; the passenger cars align", and "never turned" follows from his buffers answer |
| 42 | The 15 m past the platforms is in a cutting up to 1.5 m deep at the buffers, not on a fill | Default (reviewed; was New) | Level finding 15: the cone rises through the 8.0 m deck from about u 478. The loop it replaces cut 12 m. Ground shaping with no rule on it; a 1.5 m wall is under the 1.68 m jump and the 1 in 1.5 banks are walkable, so nobody is held in the cut |
| 43 | The Pier is homeward-only from the moment Q7 is laid (not only after the Meet): no up train stops there, it has no up lever, its up platform is never built | Decided (owner), the timing a Default (reviewed) | "The Pier becomes a homeward-only stop"; rail-map call 29 (the recommendation he took) says after Q7, when the Pier stops being the end and the ring's footings go to the railhead. The timing also follows from the track: from Q7 an up train is on the far track, with no platform beside it |
| 44 | When the line's end moves on (Q7 laid; the rivet struck), a train already past the old end's turnout turns back there as before; a train short of it runs on to the new end. On the rivet it makes one stop at the Railhead on the way; at Q7 it makes none at the Pier | Default | v26's rule at Far Head when Q6 opens the pier, reused; the Pier has no up platform to stop at |
| 45 | When a bent's second footing moves the railhead out 20 m, a train standing at the old spot stays where it is and leaves for home with no further dwell; a train on its way runs the 20 m further | Default | v26's invariants (a standing train stands at its halt's stop); nobody waits longer and the next train stops at the new spot |
| 46 | Every up train eases into the Railhead at 2 m/s², after the Meet as well as before | Default | One rule in the catalog instead of a per-train state; costs an up stop there about 2 s once the gap is closed |
| 47 | Three trains are kept; their worst wait is bounded by what v26 measured and tests (105 s), not by one minute | Decided (owner, 10 November 2026) | "3 for now" (rail rules: "Line 2 runs three trains for now when it reaches Ring Island; worst wait about 105 s") |
| 48 | ~~Once the pier is double track its one platform stands on the east side of the down track (s 719–741, lat +2.9, mirrored), and today's platform and the pier rack, which stand where the up track goes, are lifted when Q7 completes~~ | **Replaced by calls 53–61 (designer, 10 November 2026)** | The side is kept (east); the lift at Q7 is not: the platform and rack are built east from Q6, so nothing a player stands on or uses is taken away |
| 49 | Before the Meet, Get unstuck from past the gap or the island puts you on the Pier halt's deck, through all of build 1 | Decided (owner, 10 November 2026) | "It returns you to your own side (the Pier halt)". Replaces call 31's "the railhead's land pad" from R4b on |
| 50 | The raised leaf is drawn at true scale (17 × 7.6 m) from every distance | Decided (owner, 10 November 2026) | "Leave it at true scale". The far leaf's brighter orange and the toe pennant he turned on the same day are not scale and stay |
| 51 | Both tracks are laid to every railhead; the up track's last 20 m ends at its own buffer until the rivet | Default | So no rail appears from nowhere when the stub becomes a through line |
| 52 | The island's end board is blank until the owner gives its words | Default | Rail-map: board words are placeholders for the owner |
| 53 | The Pier's one platform stands **east of the down track from the day the halt drops in (Q6)**: s 719–741, centre lat +2.9 (deck +1.65 to +4.15), 1.65 m from the down track's centre and 5.65 m from the up track's; nothing of it changes when Q7 is laid | New (designer, ruled; proceeds) | East is the down platform's side at every halt on line 2 (Quarry, Far Head, the Railhead, Ring Island). An island between the tracks needs more than their 4 m; a west platform would serve the track no train stops on; a board and step alone would be the only halt without a deck. Built east from Q6, it is never the thing in the up track's way |
| 54 | The pier rack stands on that platform's seaward edge (3.5 m east at s 733), so a footing goes rack to jib along the east side without crossing the track: 5–9 m, was 11 m across it. Nothing is lifted at Q7; the rack is empty by rule before Q7 opens and stays standing | New (designer, ruled; proceeds) | Never lose a player's cargo: the surest way is to move nothing. It shortens the pier's twelve carries by a few metres each ("wary of material grinds") and takes footing carriers off the track before three trains run |
| 55 | Q7's frame stands at s 710, lat +4.5 on its own piled deck (s 703–713) below the platform's ramp, not at s 720; the kit's two carries are about 12 m, not 7 | Default | At s 720 the frame (lat +3.5 to +5.5) stands in the platform's south end. South of the ramp's foot is the first clear place on the east side; the west side is the up track's and puts the standing train between the kit and the frame |
| 56 | The pier head's side deck shrinks to a pad (s 741–746, lat +1.8 to +5.3) for the jib; the platform's north end is a 0.68 m step above it; a footing can be set from the platform's last 3 m | Default | The platform covers the rest of today's apron (s 729–741) |
| 57 | The jump-in landings at the Pier (`q6-done`, `crossing-finishing`, `crossing-done`) and so Get unstuck's "your own side" are the platform's south end (s 720.5, lat +2.9), facing the crossing | Default | Today's spots are inside the new platform and rack. From there the lever home, the rack and the line out are all in front of you |
| 58 | A 1.5 m plank footway on Q7's deck, east side (lat +1.8 to +3.3), from the pad to where the railhead's walkway begins (u 95), and a finger board on the pad pointing out along it, lettered **Railhead** | Default | The Pier is where Get unstuck puts you and no train goes outward from it (calls 43, 49), so the way back to the work is a walk of 117–257 m; without a footway it is on a deck whose edge is 1.3 m from the down track's centre, with three trains running |
| 59 | The Pier's lever: one handle, plaqued **Village**, at the platform's north end (s 739.6), the same before and after Q7 | Decided (owner, 10 November 2026), its place a Default | "One lever per platform side"; an end's lever asks for the way out, and a homeward-only stop's only way is the same way |
| 60 | Nothing is added to say "up trains don't stop here": the up track is the far one, across the down track, with no platform, lever, lamp or board beside it | Default | Signs in the world before words: the absence of a platform is the sign. A word goes on only if a session shows someone waiting there for a train out |
| 61 | When Q7 completes, the old merge's turnout on Far Head (s 556–576) is relaid by the machine as plain double track | Default | "Track has no visible kinks"; a turnout that leads nowhere would read as a way to somewhere |

### Copy (drafts for the owner; none of The Boogler's)

| Where | Draft | Note |
| --- | --- | --- |
| Halt plaques | **Railhead**, **Ring Island**; the island's chained west lever: plaqued **Ring Island** as built (was: the branch's emblem, no name; call 40) | The Railhead's name after the Meet is the owner's (open question 2). Owner, 11 November: "Keep both" (the lever plaque and Station 7's board) |
| Q7's frame board | **Station 7** (as built; the plan named no label) | Owner, 11 November: "Keep both" |
| Jump-in rows | **Deck laid** / *Q7 laid over the six bents; the wagon brings the ring's footings*; **Ring joined** / *The leaf is down and riveted; trains run to Ring Island* (as built in `src/world/railway-jump.ts`; the first draft was "The deck is laid" and "Ring Island joined") | Owner, 11 November: "Keep" |
| Prompts | **Knock out the pawl**, **Hang the weight**, **Strike the rivet** | **Set the footing** is today's. Owner, 11 November: "Use the plan's two labels ("Knock out the pawl", "Hang the weight")". Orchestrator's reading: the brace prompt (R4c built "Pull") becomes "Knock out the pawl" and the counterweight prompt (R4c built "Set the footing") becomes "Hang the weight". **Built 11 November** (`BRACE_VERB`, `jibVerb` in `leaf-shape.ts`): the jib still says "Set the footing" for a bent's footing before the gap is footed; "Pull" and "Set the footing" elsewhere are unchanged. "Strike the rivet" is R4d's |
| Meet banner | **Ring Island** over *The line has arrived*, 4.5 s | Like "Next stop: Ring Island" |
| Board at the halt | **RINGWORKS** | Kept (owner, 10 November) |
| End board behind the buffers | blank | The owner's words (call 52) |
| Rivet (High Looker) | "Don't look at me. Look up. Thank you. Now you can look at me." (any time); "We set every bolt a little wrong. Out of respect." (any time); "Your railway bowed on the way in. Good manners." (after `joined`); **new, before `joined`:** "You're early. The railway isn't. Look up while you drip." | Suspect: "drip" assumes you swam; tie it to "arrived wet" (local: last swim within 60 s) |
| Squint | "I've watched the south for the whistling thing my whole life. Also I watched you." (any time); "You fell out of the sky." (only if you glided the gap, local memory); **new, if you swam over and never glided:** "I watched you swim the whole way. Very slowly. Very bravely."; "It was bigger in the picture. It's fine. Pictures are always bigger." (after your first ride); co-op: "Two of you? The picture only had one box." (after `joined`, two or more in the room) | |
| Hooter | "Shift change! Eyes up!" / "Nobody blink!" / "Shift change! Same eyes." (with the whistle, rotating) | |
| Fingerpost | emblems only (the Gorge's fork, Canopy's tree); names left blank for the owner | Ruling 4 |

**Suspect lines for the owner:** the two new early-arrival lines (above); "The picture only had one box" in a room
of three or four. The name **Rivet** beside "Strike the rivet" is no longer one: he kept it (10 November).

## Level findings

`npm run level-check` on main passes (9 reports, place progression all passed), but its terrain grid stops at
Far Head: it sees none of Ring Island, so R1 adds `dev/level/ring.ts`. The findings below are its envelopes
(`dev/economy/place-level.ts`: sprint 9.5 m/s, fall gravity 30.6 m/s², `COURSE_DOUBLE`, `GLIDE(drop) = (drop − 2) ×
3.125 × 0.8 − 2.8`, hook 24 m, walk limit 56°, the swimmer's 0.56 m) applied to the planned positions (the greybox
with ruling 5's datum), as R1's report will reproduce them. Step 0 checks the first and third by real input. **Updated
by the design review (10 November):** `COURSE_DOUBLE` presses the air jump at the first jump's apex, but the air jump
sets `vy` to 6.8 m/s even while falling, so a late press goes about 3 m farther over a drop; rows 1, 2, 4, 6, 9 and 10
carry the review's numbers and rows 12–13 are new. The planner's original numbers are in the review's finding 1.

**For the buffers and crossover (rows 15–21, 10 November).** `npm run level-check` was run on main at bd34b181 with
this amendment's branch: 11 reports, "ring (planned): ok", every R1 assertion passing with the numbers in R1's built
note (late double jump 2.2 m short; the chimney 1.6 m short off a braking train). **The tool cannot take planned
positions**: its ring report reads `src/sim/railway-ring-layout.ts` as built, and `RING_END` is not in it until R1b.
So rows 15–20 were computed with the report's own functions (`ringAt`, `ringDeckY`, `ringHeight`, `lateDouble`,
`CARRY`, the engine's standable tops) and v26's constants (`TURNOUT_CM` 2000, `TRAIN_EXTENT` 620 and 900,
`TRAIN.sepCm` 2740) on R1b's numbers, in a scratch script under the level-check's loader; R1b's report section
reproduces and asserts them. The same run's "Track continuity" report still lists `ring-loop [v27]` as track that
would fail (a 165.3° reversal at the neck, a 12.4° mismatch onto the circle): the finding the owner's answer closes.

| # | Planned | Found | Proposed |
| --- | --- | --- | --- |
| 1 | **The gap**: take-off at the railhead platform's end (u 260, 15.6 m), brace platform from u 276.5 at 10.0 m (greybox) | At the greybox's 5.6 m drop a sprint double jump pressed at the apex reaches 16.4 m (17.4 m with coyote grace), and **pressed late, while falling, 19.3 m (20.2 m with grace, 20.7 m with the body)**: the planner's u 280 (20 m) is inside it. A glide opened straight off the edge reaches 17.5 m, so at that height no near edge separates "any glide lands" from "no double jump lands" | **Ruled (design review finding 1): the platform at 8.0 m from u 284 to 294** (24 m out, a 7.6 m drop). Late double jump with grace and body 21.8 m: **2.2 m short**. Glides: after a sprint jump and air jump 42.5 m raw, 28.1 m conservative (4.1 m spare); after one sprint jump 33.9 m raw (9.9 m spare); straight off the edge 23.7 m raw (lands on the edge or just misses: a splash, accepted). Call 3 |
| 2 | Hook ring at u 270, lat 12, 17.5 m (ruling 1) | Corners of the greybox platform: 13.3, 9.2, 22.3, 20.1 m (in range). With the platform at 8.0 m from u 284 to 294, the ring at u 272 leaves the far west corner 25.3 m from eye height (**out of range**); with the ring at **u 276** (lat 12, 17.5 m): near west 14.9, near east 11.4, far west 22.0, far east 19.7 m. The pile stands 1 m short of the hinge and 10 m east of the hinge pier, east of the glide lane; no collider above 3 m | Ring to u 276 (call 3); the pile's 3 m top can be glided onto: from there you jump in or hook home (accepted, slapstick) |
| 3 | The hook from the water | `hook-shot.ts`'s `canPress` needs `!me.swimming`, and a pull cancels while swimming: **no hook from the sea** | Call 18; the ramps are the way out. Step 0 records it, R5's eval relies on the ramp |
| 4 | Missed glide or double jump (splash about u 280–283, lat 5) | About 12–14 m to the hinge pier's ramp foot (4–5 s at 3.1 m/s), then 8 m up two flights (about 4 s). Jumping in at the railhead and swimming round: about 32 m (10 s) plus the climb, about 14 s against the glide's 3 s (ruling 2's accepted slow way) | None; R5's eval walks it |
| 5 | The raised leaf, 17 m, from afar (hinge at (1408, −649)) | From the pier head 277 m: 23 px tall on a 390 px phone view; telescope at 612 m (8.7° right of its aim, in view): 13 px at zoom 1, 26 px at zoom 2; **Home's summit 753 m: 8 px; the village 812 m: 8 px** (4 px wide) | R2c's far leaf in readable-glow orange; toe pennant if the look fails (call 20) |
| 6 | Bents 7–13 decks and the railhead | 19.5 … 14.7 m at u 140 … 260, 4% (ruling 5). The planner's "60+ m" was wrong: at `head` 6 (bent 12, platform end u 240 at 16.4 m) a sprint jump, air jump and glide reach the brace platform (45 m raw against 44 m; 38.8 against 40 m at the greybox's numbers, inside the grace). At `head <= 5` nothing on the folk's side is in reach (64 m or more) | Accepted as early access (like row 7): the brace is refused and shows no prompt before `set === 14`, there is no hook ring yet, and Get unstuck brings you back (call 31). R1's report prints it and asserts only `head <= 5` |
| 7 | **Early access by swimming** | The stub meets the island's shore at u 439 (8.0 m deck); the halt's south half (u 428–439) stands over 1.6–2.4 m of water (the fill), its north half on 2–6 m ground; the west platform's ramp reaches the slope. **From the shore, any swimmer walks up onto the halt, along the Way to the hinge and down the steps to the brace platform at any time after R2b ships** | Accepted (brief, review call 16): the brace is refused before the gap is footed, the rivet before the leaf is down, the halt opens on `joined`, and no prompt shows early (call 22). No travel edge supplies a footing |
| 8 | The island halt's loop, centre (1462, −822), r 40, deck 8.0 m | Ground under the ring from the sea bed up to **7.1 m on its west arc**, 0.4 m under the deck's underside and one jump (1.68 m) below its top: the loop's track can be walked onto from the island there | **Superseded (owner, 10 November): no loop.** R2b built the grade; R2d removes it with the deck (rows 15–20 replace this row) |
| 9 | Ramps: the railhead's (slipway at u − 28..−22, lat 14, moving with the railhead from bent 6; at bent 13 u 232–238) and the hinge pier's (moved with the platform: slipway u 287.5–293.5, lat 16, two flights up 8.0 m) | Both feet stand in 6 m of water; slipways 15°, flights at most 30° (`rampGrades` in the greybox); the hinge pier's foot stays on its far east side, so the swim from the railhead (about 32 m) goes round. Without the moving ramp, a fall off bents 7–12 has no way out of the sea nearer than Far Head's shore (about 2 min) | The railhead's ramp moves with the head (call 29); piles under each slipway foot (view); step 0 walks both |
| 10 | Recovery points | Today's Get unstuck searches Place's `H`, which is sea here, then the nearest path point: on the island it would put you back on Far Head or the pier. Saved poses off Place's grid aren't kept (`posePolicy` uses `insidePlace`). Nearest-dry alone would keep an early arrival on an island with no way home but the swim | `RING_RECOVERY`: the brace platform (u 289, lat 6, 8.0 m deck), the island halt's west platform (8.9 m), the halt's east platform (8.9 m), the path's foot on the slope (about 3 m ground), the summit lookout (66.3 m). Before `joined`, Get unstuck from past the gap puts you on the Pier halt's deck instead (owner, 10 November: "It returns you to your own side (the Pier halt)"; call 49); line 2's path points past the built deck are never candidates. R2b's arrival.ts hunk, built |
| 11 | Railhead platform (25 m × 4.5 m, beside the track) | Rack, jib and lever at u − 18, − 3 and − 22, lat +4.8, +3.6, +2.8: all off the track, room for three players and the wagon's unload (review finding 6) | None |
| 12 | The railhead platform moving out 20 m with `head` (design review) | It stands beside the formation, over open sea (lat +1.8..+6.3). Moved as one piece, anyone on its back 20 m when a bent's second footing goes in drops about 15–20 m into the sea | It stays behind as the side walkway (`RING_WALK`) and only the rack, jib and lever slide on (call 28). The walkway also keeps walkers beside the track rather than on it once three trains run over the stub |
| 13 | Other launch points at the gap (design review) | The jib's mast (9 m) and arm (8.5 m up) are out of a double jump's 3.03 m; the rack's 1.6 m top is 42 m back. A stopped train's cab roof (about 3.5 m over the rail) stands on the track with the raised leaf ahead, so a jump from it has to go diagonally, about 29 m to the platform's near edge, against about 23.6 m for a late double jump off a braking train | Nothing to change; R1's report checks the roof from the end stop's real position |
| 14 | A braking train's kept carry (R1 review, P1) | Leaving a moving deck keeps its speed through the air (`platforms.ts` `carryStep`), and line 2 brakes at 3.5 m/s²: a late double jump from the cab roof at about 8 m/s some 10 m before the stop is 0.2 m short, from the chimney 2.9 m over, from the boiler's front 1.3 m over | **Ruled (orchestrator, 10 November, agent-calls): the platform stays; the end stop eases in at no more than 2 m/s²** (`RING_END_BRAKE_CMS2`, R3a). R1's report steps every standable top (cab roof, chimney, boiler top, running board, both flatbeds, the wagon's deck) at every 10 cm of the braking: worst the chimney, 1.6 m short at 5.1 m/s, 6.5 m before the stop; 2.0 m/s² is the largest that keeps 1.5 m |
| 15 | **The run-off and buffers**: both tracks level at 8.0 m from u 468 to faces at u 483 | Ground under the formation (lat −5.8 to +1.8): 5.6–6.1 m at u 468, 6.4–6.9 at u 472, 7.2–7.7 at u 476, 8.0–8.5 at u 480, **8.5–9.0 m at u 483**. The cone comes through the deck's underside (7.5 m) at about u 475 and through its top at about u 479. Behind the faces it is 8.9–9.4 m at u 485, level with the platforms (8.9 m) | A cutting up to 1.5 m deep over the last 8 m (call 42, `RING_END.cut`, R2d's `ground.ts`); the way between the platforms is the greybox's plank crossing at u 468–471.5, short of the cutting. The loop's alternative cut 12 m |
| 16 | **The crossover**, u 395–417 on the Way | Over open sea (no cone under it before u 417), on the 4% grade, deck 9.3 m down to 8.4 m; the same 4 m shift over 22 m as Far Head's (the continuity report gives that one 15.3° and a 24.3 m radius, with no kink over 2°). It ends 11 m short of the platforms and 10.5 m short of where the grade levels | None. It is tighter than a real 1:8 turnout, as every turnout on lines 1 and 2 is (reported by the continuity report, not failed) |
| 17 | **A train standing at the stop mark** (u 448) | Today's train (620 ahead, 900 behind): u 439.0–454.2, 22.0 m clear of the crossover, 28.8 m short of the buffers. The long train (820, 1270): u 435.3–456.2, **18.3 m clear**, 26.8 m short, inside the 40 m platforms; the passenger car 35 m from the buffers | None; R1b asserts 5 m and 14.7 m |
| 18 | **The signal** before the island's block | s 1130.8 m (u 388.8), from `end()`: a held train's nose is at the crossover's first point and its tail at u 379.8 (long train: u 386.8 and u 374.1), 97–103 m past the hinge and at least 124 m past the Railhead's stop (u 250), against `sepCm` 27.4 m. `s − sepCm` is 1162.6 m, so `endBlocks` keeps the catalog's signal | None |
| 19 | **The easing stop and the jump reach at the new end** | At the gap nothing moved: the railhead's end stops are R1's and its seven braking rows still pass (the chimney worst, 1.6 m short at 2.0 m/s²). At the island a train brakes at the line's own 3.5 m/s² into u 448: a late double jump with the kept carry lands at most at **u 477.2** (the chimney, 6.7 m/s, 6.4 m before the stop; cab roof 475.4, boiler front 476.7, running board 475.2), on the run-off's deck, **5.8 m short of the buffer faces**. From the platforms' north end a late double jump on the level reaches 16.7 m (u 484.7), over the buffers onto the ground behind them | No easing at the island: everything in reach is open ground you can walk to, and the island's one op (`rail.brace`) is 160 m back. R1b prints these and asserts only "short of the buffers" from a train |
| 20 | **The station house's corner** (the greybox's `CONCOURSE` and `HOUSE`, on main since #1479: terrace u 468–477.5, lat −20 to −9.3; house at u 474, lat −16; plank crossing u 468–471.5 over both tracks) | R1b places nothing west of lat −5.8. R2d's cutting banks at 1 in 1.5 reach lat −8.1 at most (at the faces, u 483), 1.2 m short of the terrace's line and 5.5 m north of its end; the crossing's planks lie over the run-off's rails 11.5 m short of the buffers, where no train runs; the west platform's built ramp (u 462.5–465.5, lat −9.1 out to −18.8) is not touched | R1b's report and R2d's ground test assert the terrace grown by 1 m |
| 21 | **The Pier once it is double track** | Today's Pier platform is centred 2.9 m **west** of the track (x 139969 against the track's 140260 at z −35833) and the pier rack 3.5 m west; v27's up track runs 4 m west, through both. The old plan added an up platform at lat −6.9 and never said where the down one went | **Ruled (designer, 10 November; calls 53–61).** East, from Q6: platform s 719–741 at lat +1.65 to +4.15 (top 25.02 m), its ramp s 713–719, the rack on its seaward edge at s 729.1–736.9, the lever at s 739.6; the jib's pad s 741–746; Q7's frame moved to s 710 (lat +3.5 to +5.5, 1.7 m south of the ramp's foot) on a deck s 703–713. After Q7 the pier at the halt is 9.95 m wide (lat −5.8 to +4.15; 11.1 m at the pad), the up track's centre 5.65 m from the platform's edge. **Not level-checked** (`npm run level-check` reads the built layout; `dev/level/timber-track.ts` checks halts against rails and sleepers and will read the moved row once R4a edits it): R4a's eval walks rack to jib and lands the jump-in on the platform |

## Risks

- **The sea's shore texture.** Adding the island's provider stretches today's single union (home and Place, 2016 ×
  660 texels at 1 m, 6.3 MB) to about 2166 × 1960 m: 1.06 m a texel, about 15 MB and three times the bake. Options:
  (a) one union, coarser cell: no code, but each later area widens it (Canopy alone, 1.6 km west, takes Home's foam
  past 1.5 m a texel); (b) **regions packed in one texture, picked by position, one read**: the island adds about
  0.9 M texels (3.4 MB) at 1 m, Home and Place unchanged; (c) no foam lip on the island: refused by the logged Default
  "every island a player lands on keeps the foam lip and cyan shallows". **Picked (b)** (step R2a): it keeps the owner's
  must-keeps at 1 m on every island you land on, its cost grows with land rather than with the sea between, and the
  water shader still makes one coast read. It is the sea owner's call (agent-calls, 10 November): open question 6.
- **Hotspot files.** `src/sim/railway-systems.ts` (1,650 lines): R3b's hunks are the `OPS` table, `stopsOf`, the
  wagon's three rows, `call`'s one refusal and `layLine2`'s Q6 hunk turned into two `endMoved` calls; all new rules are
  in `railway-ring.ts` and `railway-trains.ts`. `src/adapters/railway.ts` (1,276): R3b's (moved from R4a).
  `src/proto/greybox/ring.ts` was edited by the station-house job today (#1479) and its step B edits it next: this plan edits it nowhere. `railway-world.ts` (701): `Aperture` registration, the view and invariants. Every view piece is its
  own entity, so `src/entities/railway/view.ts` is untouched.
- **Room safety ("Don't").** No effect in a system: the leaf's thump and splash, the rivet's clang, the buoys' splash,
  the shot and the first-crossing pull-out play from the adapter's accepted edges, never in `apply` or on restore.
  `submitEdit` is not success: footings leave your back on prediction, return on `onCorrected`. No `Math.random`, wall
  clock or per-peer counter in `railway-ring.ts`; the rota reads the room tick, the hammer and lookers' sway are Local.
  Verified-save guards untouched. New shared files are under `src/sim/` (already in the server image); no server import
  reaches `src/entities/`.
- **Mixed builds.** R1b and R2d change no wire and no save (a layout constant and a Local view). v27 is a clean break
  (`Aperture`, the catalog row, a fourth train row, `WORKS.total`; no new train field: the eased stop is the catalog's
  `brake`) in one bump with a dated line, no migration; the wire is additive (`rail.brace`, rack 2, site 3, seam 2), refused cleanly by v26 rules.
  Not shipped mid-session, nor before v26.
- **Early access.** Finding 7: accepted. Swimming never sets a footing; the brace is the only island-side op and needs
  the gap footed.
- **The grind budget.** Footings: each carried by hand once, 15 m. Q7's kit: two carries of 7 m (Q6's pattern). Train
  waits: the brief's "no train wait longer than one leg" cannot hold with request stops on a line whose longest leg is
  about 14–20 s (open question 2); the plan holds v26's 60 s bound for riders and exempts the wagon's train from the
  headway hold while the ring owes footings.
- **Riders.** Standing over the bow at 20 m/s, and over the island's crossover: a 4 m sideways shift in 22 m, taken
  while braking at 3.5 m/s² for a stop 31 m past its end, so entered at about 19 m/s and left at about 15, where Far
  Head's (12 m from its stop) is entered at about 15 and left at about 9. Riders are carried in the deck's frame, so
  this is a camera whip, not a throw, but it is faster than anything v26 does. R5 stands a rider through it; if it
  reads badly the fix is one number, `brake: 2` on the island's row (entered at about 15, left at about 11), not a
  move of the crossover. The joint's west platform keeps players off the track at the railhead after the rivet.
- **Performance.** The near view (about a dozen draws merged per colour, a 361² heightfield), the far leaf (two draws),
  the bents and railhead (instanced), the folk (4–7 figures): `npm run perf` in R2a, R2b, R2c, R4a, R4b, R4e and R5,
  desktop and phone tier. The coast's bake time at load is reported in R2a.
- **The bow and the horizon.** The finished bents are already on the bow (generic-lines step 3); R4b's before and
  after stills of the new bents from Home are logged; the finale is re-shot after its rockets fix (finding 7).
- **v26 as merged, against what this plan assumed** (read on main at bd34b181; each is fixed in the text above):
  - `RailHalt.opens` is a QJob slot number and `trainStopsOf(line, laid)` takes a count or a boolean, not the plan's
    `RailOpen` union and `{ laid, head, joined }`; `stopsOf` passes the boolean `qCompleted(w) >=
    LINE2_STATIONS.length`, which Q7 would turn into "Q7 laid" (more than a dozen such places, listed in R3b and R4a).
  - `endBlocks` reads the last open halt's static `end`; nothing in v26 moves an end with a stop (`heads` and the
    shift are new), and `validateRailTrains` ties a standing train to its halt's stop, so a moving stop needs
    `stopMoved`.
  - There is no "pseudo-track 2" and no loop leg in v26: `track` is 0 or 1, `circuitCm` and `cycleTicks` add nothing
    for a turn-back, and `RailEnd.kind` 'loop' is a type with no code behind it. None is needed now.
  - `turn` exists only for a train caught past Far Head's crossover when Q6 opens the pier; it is set in `layLine2`
    (`railway-systems.ts`), not in the trains module. `endMoved` moves that hunk, behaviour unchanged.
  - One `accel` is both speeding up and braking in `profile`; the eased end stop had no way to be written (`brake`).
  - `trainPlaces` collides with three trains on line 2 (two at Far Head); v26's worst-wait test is 1050 ticks, not 600.
  - `LINE_HALTS` is cast to a six-halt tuple; `serviceOf` and `wagonArrives` name the Pier as stop 3;
    `train-view.ts` assumes one crossover a line and reads `FORMATION` (`src/proto/place/layout.ts`) for where the
    tracks part.
- **`stopMoved` and `endMoved` are the risky new sim code** (P1 for the sim reviewer): a train standing at the
  railhead as a bent goes in, and a train on the stub as the rivet is struck, are both likely in play (the wagon's
  train is there by design). R3b's tests put a train in each case on the same tick as the op.
- **The Pier at v27 (was the plan's P1; ruled, design review of 10 November).** Today's platform and rack stand where
  the up track goes. Ruled: both are built on the east side from Q6 (calls 53–54), so Q7 lays the up track through
  open deck and nothing is lifted. What that costs: two sim constants (the Pier's `RailPlatform` in R3a, `PIER_RACK`
  in R3b), `RING_Q7_FRAME` moved 10 m landward (R3b), three jump-in landings (R3b), one sign in `halt-map.ts` and the
  apron, frame deck and footway in `crossing-view.ts` (R4a), four tests that pin the old places, the works bot's
  carry and the loop graph's number (R5). All of it is inside v27's bump: the platform and the rack are server reach
  checks, so they ship with it and never ahead of it. No second bump, no migration. It changes a beat that is live
  today (the pier's twelve carries no longer cross the track): R4a's before and after stills show it.
- **The cut and the house share a hillside.** R2d's cutting stops 1.2 m short of the station house's terrace; if the
  house's production build moves that ground, R2d's terrace test is the tripwire.

## Open questions

The old list's seven were answered by the design review (finding 1, calls 6, 14, 26 and 27), by the owner on 10
November (the loop, Get unstuck, the leaf's scale, the Pier and the Railhead, the names) and by v26 landing; the coast
option was built (R2a). What is left:

1. **Is one minute flat still wanted on line 2 once it reaches the island?** (owner) Three trains keep v26's measured
   service (worst waits about 91–97 s under heavy asks, bounded at 105 s), not one minute; a fourth train is one
   number in the catalog and brings the even gap from 46 s to 35 s. Recommended: ship three, read R3a's printed worst
   waits, and add the fourth only if he asks for the minute (call 47).
   **Answer (owner, 10 November): "3 for now".**
2. **The Railhead's name after the Meet.** (owner) He kept it as the Meet's halt; "Railhead" stops being true when the
   line runs through. Placeholder until he names it.
3. **Which side is the Pier's platform once the pier is double track?** (designer) Today's platform and rack stand
   where the up track goes. Recommended: mirror the platform to the east side of the down track and lift the rack when
   Q7 completes (call 48, Level finding 21); it needs Q7's frame clear of the platform's south end and a ruling on what
   a player standing on the old platform sees happen. Blocks only R4a's pier hunk.
   **Answer (designer, 10 November 2026): east, and from Q6, not from Q7.** The platform and the rack are built on the
   east side when the halt drops in, so there is no old platform to stand on and nothing to see happen; Q7's frame
   moves to s 710 (calls 53–61, [the review](#design-review-the-pier-at-v27-designer-2026-11-10)). Nothing waits.
4. **The toe pennant and "true scale".** (owner, only if he sees it differently) The pennant he turned on the same day
   (a 12 m mast on the leaf's toe) is kept as a marker, not as scale; it is one constant (`TOE_PENNANT`) if he meant
   the leaf bare.
5. **`npm run inflight`** (10 November): one unmerged branch, `ship/matias-franco-0f2b6e5`, touching only
   `docs/brainstorms/express-train.md`; none touches this plan's files. The station-house greybox merged as #1479
   during this amendment; its step B owns `src/proto/greybox/ring.ts` next, which is why this plan leaves that file
   to it.

## Design review: the Pier at v27 (designer, 2026-11-10)

Asked for by the owner ("start pier platform design review", 10 November 2026). It covers the plan's open item (call
48, Level finding 21, open question 3) and the amendment's calls 41–52, which the first review below never saw. Its
rulings are applied in the plan's body above (R3's catalog and "The Pier's one platform", steps 3a, 3b, 4a and 5,
Calls 41–61, Level finding 21, Risks, open question 3), so the plan can be built without this section.

Read: [DESIGN](../../DESIGN.md) (7, 8, 10); [owner calls](../agents/owner-calls.md) ("Pick and log, don't ask",
"Nothing waits on a world bump", "Signs in the world before hovering text", "Machines show their work physically",
"Wary of material grinds", "Tune for 1–3 players"); the [rail rules](../decisions-rail.md#current-rules) and the
entries this rests on: the Pier homeward-only and the Railhead kept (rail map), buffers and a crossover and Get unstuck
to the Pier halt (Ring Island), "3 for now", yards ("none at the Pier for now"), the track rules (a track that ends has
buffers; no visible kinks; trains may be longer than platforms, the passenger cars align), request stops and one lever
per platform side, four or more waiting little guys; [the brief](../brainstorms/ring-island.md);
[generic-lines](generic-lines.md) ("Migrating": "widens the pier and moves the rack and halt then"; levers; the stop
mark). Research tops: [route-contract](../research/route-contract.md) (travel never supplies work),
[progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses) (rules 1–3, lens 6),
[level-design](../research/level-design.md), [train-riding](../research/train-riding.md).
Code read: `src/sim/railway-lines.ts` (the Pier's row), `railway-works-layout.ts` (`PIER_STOP`, `PIER_RACK`,
`PIER_FRAME`), `railway-ring-layout.ts` (`RING_Q7_FRAME`, `RING_PIER_UP`, `RING_WALK`), `railway-works.ts` and
`railway-sys-works.ts` and `railway-sys-trains.ts` (the pier rack's invariants and the wagon's unload),
`src/place/layout.ts` (`FORMATION`, `UP_HALTS`), `src/place/spatial-station.ts` (a frame's footprint),
`src/entities/railway/halts-view.ts`, `halt-map.ts`, `up-platforms.ts`, `crossing-view.ts` (the rack on the halt's
deck, the apron and the jib), `track.ts` (the trestle's 3.6 m deck), `src/world/railway-jump.ts` and
`src/entities/ring-island/state.ts` (where Get unstuck lands).

### The Pier today, measured

Lateral metres are east of line 2's track (the down track once the pier is double); `s` is metres along line 2.

| Thing | Where | Source |
| --- | --- | --- |
| The trestle's deck | lat −1.8 to +1.8 (3.6 m), one track at lat 0, rails end s 742 | `track.ts` `DECK_W` |
| The Pier platform | s 719–741, lat −4.15 to −1.65 (centre −2.9, **west**), top 25.02 m; one ramp s 713–719 | `halt-map.ts`, `halts-view.ts` |
| Its shelter, bench and board | on its seaward (west) back edge, s 721.2–729.2 | `halts-view.ts` |
| Its lever and signal mast | north end, s 739.6 and s 740.2, on the track side | `halts-view.ts` |
| The pier rack | six footings in a row, s 729.1–736.9, lat −4.1 to −2.9 (`PIER_RACK` 3.5 m **west**) | `crossing-view.ts` |
| The apron and the jib | s 729–746, lat +1.8 to +5.3, at deck height; the jib (`PIER_FRAME`) at s 742.3, lat +3.5 (**east**) | `crossing-view.ts` |
| The stop | s 726.5: the train stands s 717.5–732.7, on the one track | `PIER_STOP_CM`, `TRAIN_EXTENT` |
| The jump-in and Get unstuck landing | s 730.5, lat +3, on the apron at deck height | `railway-jump.ts` |
| Q7's frame, as R1 built it | s 720, lat +4.5: a frame is 2 m across and 2.6 m along | `RING_Q7_FRAME`, `spatial-station.ts` |
| v27's up track | lat −4 (rails −4.5 and −3.5; the formation's edge −5.8) | R1, generic lines |

So the up track passes through the west platform's deck (−4.15 to −1.65) and the rack's row (−4.1 to −2.9), as the
planner found. The footing carry today goes from the rack on the west side across the track, in front of the engine,
to the jib on the east side: 11 m (`npm run loop -- node crossing`).

**Stills** (`.look/` in this review's worktree, `--rail-seed crossing-finishing` unless said; 960×600):
`pier-approach-still.png` (from the trestle at s 693: the platform and its shelter stand left of the track, a train
on the pier, the ring and the shard dead ahead over it), `pier-platform-north-still.png` (from the platform at s 722:
the bench and board on the left, the rack's footings along the seaward edge, the lever, the track layer parked at the
rails' end with the jib's mast right of it, the apron low on the east side), `pier-east-back-still.png` (from beyond
the pier head looking back: the apron is a clear tan deck the length of the halt's north half with only the jib on
it, the platform and rack white on the far side of the track), `pier-above-still.png` (plan view: shelter roof and
platform west of the rails, apron east, the first bents' frames beyond the track layer) and
`pier-east-phone-still.png` (844×390, `crossing-done`, from deck height where the east platform will stand: the ring,
the shard and the island fill the middle of the frame; the track layer and the jib stand across the line out).
**What the stills show for the ruling:** the east side is open deck and sea, with nothing to clear but the jib, which
stays; everything that has to go is on the west. **Not seen:** the raised leaf from the Pier. At `crossing-done` the
parked track layer and the jib cover the line to the hinge from deck height, and at 844×390 no orange can be picked
out beside them; the machine goes out with Q7, so R4a's `deck-laid` still is where that sightline is judged.

**`npm run level-check`** on this branch (main at 353d7a6b): 11 reports, "ring (planned): ok", "track continuity: ok".
It has no finding on the Pier: the ring report reads the built layout, which plans no pier platform, and the
continuity report's only pier rows are the join at the pier head (0.04 m, 3.9°). The ring's remaining "would fail"
rows are the loop's, which R1b's buffers close. Nothing here is level-checked until R4a moves the halt's row.

### The ruling

**The platform stands east of the down track, and it stands there from Q6, when the halt first drops in.** The
planner's side is right; the timing is not. Lifting a platform and a rack at Q7 means a deck someone may be standing
on is taken away, a rack is moved, and the review has to say where cargo goes. Building them east in the first place
means Q7 lays the up track through deck nobody uses, and there is nothing to rule about cargo.

| Option | Verdict |
| --- | --- |
| **East of the down track** (lat +1.65 to +4.15) | **Taken.** It is where the down platform stands at every other halt on line 2 (Quarry, Far Head, the Railhead, Ring Island: left-hand running puts the homeward track on the east). The trains that stop here are always on that track: while the Pier is the end they come in over the stub onto it, and afterwards only homeward trains call. The east side already holds the jib, so rack, platform and jib share one side |
| West of the up track (lat −8.2 to −5.7) | No. It would serve the one track no train stops on, and put the up track between riders and their train |
| An island between the tracks | No. The tracks are 4 m apart; a 2.5 m deck with a train each side needs about 7.5 m, and widening the formation on the pier alone would put a kink in both tracks at each end |
| No platform, a board and a step | No. Every halt is a deck you wait on; the wagon's rack needs one; and the stop that Get unstuck returns you to should look like a stop |

**Measurements, once the pier is double.**

| Thing | Where |
| --- | --- |
| Down track, up track | lat 0 and lat −4; the formation lat −5.8 to +1.8 (7.6 m) |
| The platform | s 719–741 (22 m), lat +1.65 to +4.15, top 25.02 m; its edge 1.65 m from the down track's centre (as every halt) and 5.65 m from the up track's |
| The pier's width at the halt | 9.95 m (lat −5.8 to +4.15); 11.1 m at the jib's pad |
| The rack | s 729.1–736.9, lat +2.9 to +4.1 on the platform's seaward edge; a 1.25 m aisle on the track side, as today |
| Ramp, shelter, board, lever | the ramp s 713–719; the shelter s 721.2–729.2 on the back edge; the lever s 739.6, lat +2.45; all mirrored by `makeHalt` from the row's `lat` |
| The jib's pad | s 741–746, lat +1.8 to +5.3, 0.68 m below the platform's north end |
| Q7's frame | s 710, lat +3.5 to +5.5, on a deck s 703–713 |
| Where a standing train is | s 717.5–732.7 on lat 0: its passenger car (s 726.5) at the platform's middle third, its wagon at the landward end by the ramp |

**The rack and cargo.** Nothing is lifted, so nothing can be lost. The rule also holds by the sim's own invariants,
which is worth a test: `pierRack + pierSet <= 12`, the crossing is done only at `pierSet === 12`, and Q7 opens on the
crossing, so the pier rack is empty for all of Q7 and after; the ring's eighteen footings unload only at the Railhead.
A footing on a player's back is on their back and is not the platform's. The empty rack stays standing (what looks
solid is solid; no yard at the Pier, owner). R3b's fuzz asserts `pierRack === 0` from the twelfth footing on.

**The carry changes, on a beat that is live today.** Rack to jib is 5–9 m along the east side instead of 11 m across
the track; a footing can be set from the platform's last 3 m. That is a New call (54): it shortens the pier's twelve
carries a little and takes the walk off the rails. It is one constant to put back.

**Which way it faces, the lever, asking for a train home.** The platform faces west across the down track. Its lever
is the one it has today, one handle plaqued **Village** at the north end, the end a homeward train comes in from, and
it is the same lever before and after Q7: while the Pier is the end it asks for the way out, which is home, and
afterwards home is the only way. A rider aboard a homeward train asks as at any halt. Little guys wait only here, so
"four or more stop a train" needs nothing new. Nothing at the halt changes on the day Q7 is laid.

**The up train that doesn't stop.** It runs on the far track, 5.65 m from the platform's edge with the down track
between, past a side of the pier that has no platform, no lever, no lamp and no board. That absence is the sign, and
it is the same one every through track gives. No word is added (call 60). The one thing a player at the Pier may want
that the halt doesn't give is a train **out**: finding 1.

**Get unstuck.** Its landing before the Meet is the owner's ("your own side (the Pier halt)") and is today on the
apron at deck height, inside where the platform and rack will be. It moves to the platform's south end (s 720.5,
lat +2.9), facing the crossing: the lever home is 19 m ahead on the left, the rack beside you, the line out beyond.

**Sightlines.** From the east platform the island, the ring and the shard are straight ahead and a train standing at
the platform is on your left, clear of that view; from today's west platform the standing train is on the same side as
the view of the bents (the approach still). The jib's mast (s 742.3, lat +3.5) is about 3° right of the line to the
hinge from the platform's middle, and its arm reaches north-west across it about 14° above eye level, so by the numbers the
leaf (1° left, under 1° up at 290 m) is seen under the arm, left of the mast. That is worked, not seen: in the phone
still the track layer parked at the rails' end covers it, and it stays parked there until Q7 takes it out. The ring
and the shard, which are what the halt faces, read clearly at phone size.

**Room.** The platform is the standard 2.5 × 22 m deck every halt has, and the 1.25 m aisle past the rack is the one
in play today; three players and a wagon's unload fit as they do now. The east side adds the pad and Q7's deck. A
phone sees the same halt as every other; nothing here adds a prompt or a control.

**Cost.** Two sim constants, one moved frame, three landings, one sign flipped in the halt's row, the apron, a frame
deck and a footway in `crossing-view.ts`, four tests, the works bot's carry (Risks, "The Pier at v27"). All inside
v27's bump; no second bump. R1b and R2d are untouched.

### Flow

| Leg | From → to | Length | Time |
| --- | --- | --- | --- |
| 1 | Train at the Pier → the rack (wagon's unload) | on the platform | 0–2 s |
| 2 | Rack → jib, twelve times | 5–9 m (was 11 m, across the track) | 2–3 s at the footing's 3 m/s |
| 3 | Kit car → Q7's frame, twice | about 12 m (the plan's s 720 gave 7 m) | 2–4 s |
| 4 | Get unstuck's landing → the lever home | 19 m | 3 s |
| 5 | Get unstuck's landing → the Railhead's platform | 117 m at bent 6, 257 m at bent 13 | 21–46 s walk; no train goes out from here |

The three rules hold: the next goal is in sight from the landing (the jib, then the line out and the finger board);
the gate keeps its meaning (nothing here is a travel edge onto work: the rack and jib are the work, and they are
refused as today); nobody is stranded (one side, one walking line from the ramp to the railhead, never over a rail).
Lens 6, a world that shortens behind you, is bent at leg 5: finding 1.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 40 | The island's buffers, crossover, east platform and chained west lever | Decided | Owner, 10 November ("Buffers about 15 m past the halt, with a crossover before it"); rail-map call 14 |
| 41 | The passenger car at the platforms' middle (u 448), 35 m from the buffers; the engine always at the island end | Default | The alignment is the owner's ("the passenger cars align"); the mark is rail-map's station plan. Accepted |
| 42 | The run-off in a cutting up to 1.5 m deep | Default (was New) | Ground shaping, no rule on it; under the 1.68 m jump, banks walkable. Accepted |
| 43 | The Pier homeward-only from Q7 | Decided; the timing a Default | Owner ("the Pier becomes a homeward-only stop"). From Q7 the up track has no platform, so the timing is also what the track allows. Accepted |
| 44 | When the end moves on: a train past the old turnout turns back there, one short of it runs on; one stop at the Railhead on the rivet, none at the Pier at Q7 | Default | v26's rule at Far Head, reused. Accepted |
| 45 | When the railhead moves a bent: a standing train stays and leaves for home with no more dwell; one on its way runs 20 m further | Default | Nobody waits longer. Riders aboard stay aboard; a player about to board sees it leave early, and the next stops at the new spot. Accepted |
| 46 | Every up train eases into the Railhead at 2 m/s², before and after the Meet | Default | Level finding 14 needs it before; after, it costs about 2 s a stop and saves a per-train state. Accepted |
| 47 | Three trains, worst wait about 105 s | Decided | Owner, 10 November ("3 for now") |
| 48 | Lift today's platform and rack at Q7 | Replaced | By 53 and 54 |
| 49 | Get unstuck before the Meet: the Pier halt | Decided | Owner, 10 November |
| 50 | The leaf at true scale | Decided | Owner, 10 November |
| 51 | Both tracks laid to every railhead; the up track's last 20 m ends at its own buffer | Default | "A track that ends has buffers" (owner) covers the buffer; laying both is the planner's. Accepted |
| 52 | The end board is blank | Default | The words are the owner's. Accepted |
| 53 | The Pier's platform east of the down track, from Q6 | **New** | **Recommendation: build it. Proceeds, logged** |
| 54 | The rack on that platform; the carry no longer crosses the track; nothing lifted at Q7 | **New** | **Recommendation: build it. Proceeds, logged** |
| 55 | Q7's frame at s 710 | Default | Clear of the platform's south end |
| 56 | The apron becomes the jib's pad; a 0.68 m step | Default | Follows from 53 |
| 57 | Landings and Get unstuck on the platform's south end | Default | Follows from 53; the owner's target (the Pier halt) is unchanged |
| 58 | A footway from the pad to the railhead's walkway, and a finger board | Default | Finding 1 |
| 59 | One lever, plaqued Village, unchanged by Q7 | Decided; its place a Default | Owner ("one lever per platform side") |
| 60 | No added sign for the non-stopping up train | Default | Signs in the world: the missing platform is the sign |
| 61 | The old merge's turnout relaid plain at Q7 | Default | "No visible kinks" |

Count: **6 decided** (40, 43, 47, 49, 50, 59), **13 default** (41, 42, 44, 45, 46, 51, 52, 55, 56, 57, 58, 60, 61),
**2 new** (53, 54); 48 is replaced. Neither New call waits for the owner: both are a placement and a carry length,
one constant each to put back, and neither is direction, new scope or irreversible.

### Findings

1. **No train goes out from the place Get unstuck puts you (lens 6; not blocking).** Two owner answers meet at the
   Pier: Get unstuck returns you there, and from Q7 it is homeward-only. So the way back to the railhead is a walk of
   117 m (21 s) at bent 6, up to 257 m (46 s) at bent 13, and between the pier head and u 95, where the railhead's
   walkway begins, the only place to walk is Q7's deck, whose east edge is 1.3 m from the down track's centre, with
   three trains running. No session has reached past the pier, so there is no evidence either way; it is a recovery
   path, not the main line, and a 46 s walk after asking to be unstuck is acceptable. The cheap part is taken (call
   58): a 1.5 m footway on the deck's east side from the pad to u 95 and a finger board pointing out along it, so
   the walk is one line on one side and off the rails. If the bot or a session shows people waiting at the Pier for a
   train out, the next step is the owner's (a request stop on the up track would need the platform he ruled out).
2. **Q7's frame stood in the platform's south end (folded: call 55).** At s 720, lat +4.5 it overlaps the deck from
   lat +3.5 to +4.15 over s 719–721.3 and its feeder reaches under the shelter. At s 710 it is the first thing you
   meet at the ramp's foot. The kit's two carries grow from 7 m to about 12 m.
3. **The landings were inside the new platform (folded: call 57).** `q6-done` (lat +4) and `crossing-done` (lat +3)
   land at deck height where the platform's piles and the rack will be; `halts-view.ts` shoves a trapped body clear,
   but a jump-in should not start with a shove.
4. **R4a has no file that draws the pier's track (engineering, for the implementer).** `pier-view.ts` holds the Q6
   rockets; the rails and deck are `track.ts`'s from `FORMATION.quarry.to` in `src/place/layout.ts`. Flagged in the
   step.
5. **Not seen.** The east side as it will be: nothing is built there, so the leaf-under-the-jib sightline and the
   0.68 m step with a footing on your back are worked from numbers. R4a's eval and stills are where they are checked.

### Cleared to build

- **R3a: now** (after R1b is on main, as before). Its one pier item, the platform's constant, is ruled.
- **R3b, R4a–R4e, R5:** cleared on design. R4a's pier hunk no longer waits.

### Owner questions

None. Nothing here is direction, unapproved scope or irreversible; calls 53–58, 60 and 61 are for
[agent-calls](../agent-calls.md) (rows given to the orchestrator; this review does not edit that file).

## Design review (designer, 2026-11-10)

> **Amended after this review, 10 November 2026.** The review below is kept as written. Since then the owner answered
> its questions and the rail map's: the loop is gone ("Buffers about 15 m past the halt, with a crossover before it"),
> so its calls 12 and 15, leg 10 of the flow table and finding 6 no longer apply; call 14 is confirmed ("The Railhead
> stays as the Meet's halt; the Pier becomes a homeward-only stop"), which also takes the Pier's up platform out of
> call 27; call 31's target is the Pier halt ("It returns you to your own side (the Pier halt)"); call 20's leaf stays
> at true scale ("Leave it at true scale"); the names in call 37 and finding 7 are kept. The plan's own
> [Calls](#calls) 40–52 carry the changes and have not been through this review.

Read: [DESIGN](../../DESIGN.md) (7, 8, 10, 11); [owner calls](../agents/owner-calls.md) ("The orchestrator makes design
calls too" #1396, "Nothing waits for a playtest", "Nothing waits on a world bump", "Port from Place only what still
fits", "Signs in the world", "Machines show their work physically", "Wary of material grinds"); the
[decision index](../decisions.md#current-decision-index) and its 10 November entries (Ring Island, the railway is
double track, trains stop on request, Turn the table only when ready, shared moments play for everyone, the sea is
rebuilt small) and 9 November (a cinematic can't be interrupted by accident); the [brief](../brainstorms/ring-island.md)
with its rulings and the first review; [generic-lines](generic-lines.md) (the wait bound, "Migrating", sequencing);
[agent-calls](../agent-calls.md)' 10 November rows; [direction](../direction.md); the
[round 4 notes](round-4-notes.md) (10 November co-op, ranked); find-the-fun 7–10 via the first review. Research tops:
[route-contract](../research/route-contract.md), [progression-flow-layout](../research/progression-flow-layout.md),
[level-design](../research/level-design.md), [friction-without-failure](../research/friction-without-failure.md),
[train-riding](../research/train-riding.md), [botw-glide-target](../research/botw-glide-target.md). Code read: the
controller's jump (`src/entities/player/state.ts`: `JUMP`, coyote 0.1 s, 9.5 m/s sprint, air accel 14), the air jump
(`src/proto/place/moves.ts` `secondJump`: `vy = max(vy, 6.8)`), `MOVE` (`tech-layout.ts`), `dev/economy/place-level.ts`
(`COURSE_DOUBLE`, `GLIDE`), `PLAYER_R`, the greybox's railhead, jib, pile and brace platform
(`src/proto/greybox/ring.ts`), `src/physics/platforms.ts` (carry includes the deck's yaw), `arrival.ts` (Get unstuck),
`WORKS` and the kiln's `worksTick`, `TRAIN`. Tools: `npm run level-check` (9 reports, all passed, none sees the
island), `npm run loop -- node crossing` (12 × 11 m carries by wagon), `node dev/playtest/cli.ts` (no session has
reached past the pier), and a stepped jump model (1/240 s, the controller's numbers) for every envelope below.

**Not seen:** `npm run look` fails in this worktree as it did for the first review (`express` isn't installed, and
the main checkout's `node_modules` lacks it too), so there are no stills from the take-off, the platform or Home. Every
distance comes from the greybox's data and the model, and step 0 is where they meet real input.

**Ported from Place**, piece by piece (owner call "Port from Place only what still fits"): the buoys keep a job (lifted
per stretch); `buildFar` stays the far view with the leaf added; the telescope is needed for call 12's read; the glide
is this area's main-line use; the double jump and coyote grace come with the controller and are the reason for
finding 1. Get unstuck's nearest-path search is Place's, and finding 3 changes it here. Nothing else comes over.

### Flow, beat to beat

| Leg | From → to | Length | Time |
| --- | --- | --- | --- |
| 1 | Village or Works → pier halt | 700–900 m | 35–45 s ride |
| 2 | Pier halt → Q7's frame (pier head's east edge) | about 20 m | 4 s walk; two kit carries of 7 m |
| 3 | Pier head → the railhead (bent 6 → bent 13, u 120 → 260) | 120–260 m | 6–13 s ride after Q7, or 21–46 s on the walkway |
| 4 | Rack → jib, 18 times | 15 m | 5 s at the footing's 3 m/s |
| 5 | Waiting for the wagon's next load, twice | — | about 70 s each (finding 5) |
| 6 | Take-off → brace platform | 24–30 m | about 3 s glide |
| 7 | Brace platform → land pad (hook) | about 30 m | 2–3 s pull |
| 8 | Brace platform → the rivet (steps up at its far end, back along their deck, over the lowered leaf) | about 64 m | 11–12 s walk |
| 9 | The joint → island halt | 168–208 m | about 14 s ride (wait up to 60 s), or 30–37 s walk |
| 10 | Round the loop | 251 m at 10 m/s | 25 s |

The three rules: **the next goal can be found** (the next bent's glowing stake and socket, the gold strut and the
waving folk, the bracket's lit outline, the glint: each in sight from where the last beat ends); **the gate keeps its
meaning** once finding 1 lands (a glide, a swim or an early arrival reaches the platform, but the brace is refused
until the gap is footed and no ring hooks onto their side); **nobody is stranded** only with findings 2 and 3 (as
planned, the moving platform can drop you in the sea, and an early arrival's only way home is a long swim). The
lenses hold: key and lock in sight (rack to jib 15 m; the platform 24 m ahead of the take-off); one main line; the
world shortens behind you (the halt moves out, trains cover legs 3 and 9); the beat ends facing the next (the Meet shot
ends on the halt, the steel under its tarp and the mural); the joint is where the room meets. The walk-seconds guide
holds everywhere except leg 5, which is waiting, not walking.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Sequence: Q7 over bents 1–6, then 14 footings bent by bent with the railhead moving out, then gap, brace and counterweight, then the rivet | Default | Follows the brief's Shape and seeds; Q7's span (u 0–120) is the planner's concrete pick |
| 2 | Q7: 20 logs + 20 rails, 20 panels, train-fed, frame at s 720 lat +4.5, opens once the pier is footed | Default | A bill size and a placement, cheap to change |
| 3 | Brace platform at 8.0 m, u 284–294; strut foot u 284.5; hook ring u 276 | New | Finding 1. **Recommendation: take it.** Replaces the planner's u 280–290 at 10.0 m |
| 4 | The bow's heights | Decided | Ruling 5 (orchestrator, #1396) |
| 5 | Wagon to the railhead rack (cap 6, three loads), rack to jib 15 m, each footing carried once | Default | First review call 19 (accepted); grind budget's "twice" and "60 m" hold |
| 6 | `WORKS.total` 32 | Default | **32 is right**: `WORKS.total` is 14 today (pier 12 + stall 2; the owner's 10 November late-game answer 1 took the cradle's 2), plus 14 + 4. The logged 34 (agent-calls row 77) added the cradle's 2. The kiln at one footing per 8 s takes about 2.4 min more to cast the extra 18 |
| 7 | One site at the jib: bents, then counterweights | New | Recommended: one prompt, one place, its meaning from state |
| 8 | Four counterweight footings, a quarter dip each once braced, creak before | Decided | First review rec 5 (orchestrator, #1396) |
| 9 | Brace and counterweight in either order, both after the gap is footed; rivet needs the leaf down | Decided | First review rec 2 (orchestrator, #1396) |
| 10 | Line 2 runs 3 trains, sized by the minute (R3a's test may make it 4) | Default | generic-lines call 34 |
| 11 | The Meet: 6 s for the room on `joined`; first ride a 5 s pull-out; a late friend gets the framing then | Decided | First review rec 3; 10 November shared moments; 9 November cinematics |
| 12 | Loop at 10 m/s (`railLoopSpeed`) | Default | Keep 10 m/s, **for a different reason** (finding 6): carry rides in the deck's frame, yaw included, so riders aren't thrown sideways; the case is camera spin (14°/s against 29°/s at 20 m/s, train-riding rec 10) and 25 s of the ring sweeping past (rec 2, a ride is a stage) |
| 13 | Near view mounts within 500 m or once Q7 is laid; off past 650 m | Default | First review call 24 |
| 14 | The railhead stays a halt after the Meet, with a west up platform on the last bent and a plank crossing | New | **Recommendation: keep it.** The striker is standing there when the Meet ends and should ride to the island; v26 gives each direction its own platform; it costs nothing unless asked. Draw the platform with bent 13 and chain its lever until `joined` (call 32). Its plaque "Railhead" stops being true then: copy for the owner |
| 15 | Island halt: up-track trains always stand at the west platform; after the loop, the east platform on request | New | Recommended |
| 16 | Buoys 1–2 start lifted, 3 at bent 8, 4 at bent 11, 5–7 on the rivet | Default | First review call 23 |
| 17 | Rota: 4 lookers, swap every 45 s on the room clock; nod at 8 m, 50° up, 1.5 s still | Default | First review call 27 |
| 18 | No hook from the water; out by the ramps | Default | `hook-shot.ts` |
| 19 | Drop hammer every 2.4 s within 120 m; steel under a tarp; mural | Decided | First review rec 4 |
| 20 | Far leaf in a brighter orange; toe pennant only if the look fails | Default | Finding 8: the glow fades to the near leaf's orange by 500 m, so the swap doesn't pop |
| 21 | A partly lowered leaf is walkable from the island side down to its toe | Default | Travel only; the toe is 4 m over our platform, out of a double jump from below |
| 22 | Jib, bracket outline and rivet show only when usable | Decided | Turn the table only when ready (10 November) |
| 23 | Pacing about 12 minutes | Default | Inside the first review's 10–15 min; finding 5 watches the waits |
| 24 | `rail.brace { revision }`, stale or repeat refused | Default | Gate-puzzles' revision rule |
| 25 | `Aperture.threaded` not added in v27 | Engineering | Not a gameplay call |
| 26 | Train waits: v26's one-minute bound for riders replaces the brief's "no train wait longer than one leg"; the wagon's train is never held by the headway rule while footings are owed (the block rule still applies) | New | **Recommendation: yes.** "One leg" was written for v25's early turn-back, which generic lines removed (its call 18); with request stops and a 1.2 km line the minute is the bound the train count is sized by. The brief's Done means ("no train wait over one leg") is amended by R6 |
| 27 | The pier's second track, up platform and moved rack in v27 | Decided | 10 November "the railway is double track": the width "carries over bridges, cuttings and the pier crossing" and "each track carries one direction ... not passing rules"; a single-track pier between two double sections would need the passing rules that decision ruled out. Generic lines' "Migrating" deferred it here on purpose. In scope; stills before and after, like the bow |
| 28 | The railhead platform stays behind as a side walkway; rack, jib and lever slide on over about 3 s | Default | Finding 2 |
| 29 | The railhead's sea ramp moves with the railhead from bent 6 | Default | Ruling 2's "the last bent", read as whichever bent is last; finding 2 |
| 30 | The hook pile, pad and take-off rail appear with bent 13; the ring hooks only once `set === 14` | Default | The plan's R4b, unlisted |
| 31 | Before the Meet, Get unstuck from past the gap puts you on our side (bent 6's deck before v27; then the railhead's land pad); path points past the built deck are never recovery targets | New | **Recommendation: yes.** Finding 3. It only ever carries you back toward the work, so it skips none (route contract) |
| 32 | The island halt's levers and the joint's west-platform lever are chained, with no prompt, until `joined` | Default | generic-lines call 31's pattern; only when ready |
| 33 | The landing leaf lifts or shoves a player clear, never pins | Default | Finding 4 |
| 34 | Each footing visibly seats in one of the next bent's two sockets; the span drops on the second | Default | Machines show their work physically |
| 35 | The leaf's swing 2.5 s ease-in with thump and splash; the Meet banner 4.5 s | Default | Motion and timing, tunable |
| 36 | Steps from the brace platform's far end up to their deck; about 11 s from the brace to the rivet | Default | Follows from call 3 |
| 37 | The waving folk on the brace platform is a looker, never Rivet; Rivet keeps to the square | Default | Keeps the name Rivet away from the rivet's prompt (owner question 5) |
| 38 | The folk's lines tied to facts: "arrived wet" is a swim within the last 60 s; "glided the gap" is local memory; the co-op line counts the room | Default | First review's suspect-lines note |
| 39 | At `head` 6 a sprint jump, air jump and glide can reach the brace platform early | Default | Accepted as early access, like the swim (Level finding 7): nothing there works or prompts, and call 31 brings you back |

Count: **7 decided, 25 default, 6 new** (38 gameplay calls; call 25 is engineering). The plan listed 25; 14 were
unlisted (26–39).

### Findings, ranked

1. **The double jump crosses the planner's u 280; lower the platform too. Change before building (R1, folded).** The
   level model's `COURSE_DOUBLE` presses the air jump at the first jump's apex, but `secondJump` sets `vy` to at least
   6.8 m/s even while falling. Over a drop, a press about 1.0 s after take-off (the natural "I'm short" press) goes
   about 3 m farther:

   | Drop to the platform | Double jump, apex | Late press | + grace + body | Glide, straight off | Glide after one jump | Glide after both, conservative |
   | --- | --- | --- | --- | --- | --- | --- |
   | 5.6 m (10.0 m deck) | 16.4 m | 19.3 m | 20.7 m | 17.5 m | 27.6 m | 23.1 m |
   | 7.6 m (8.0 m deck) | 17.2 m | 20.5 m | 21.8 m | 23.7 m | 33.9 m | 28.1 m |

   At 10.0 m no near edge works: one 2 m past the late double jump (u 283) leaves the conservative glide 0.1 m to
   spare and a glide straight off the edge 5 m short. A deeper drop helps the glide about five times as much as the jump
   (3.1 m per metre of drop against about 0.6). So: **the platform at 8.0 m from u 284 to 294**, the strut's foot at u 284.5, the
   ring at u 276 (all four corners within 22.0 m), the hinge pier's ramp with it. Margins: the late double jump falls
   2.2 m short; a glide after any jump lands with 4–10 m spare. **Is 2 m enough?** Yes, against this envelope: to come
   close takes a full sprint from the very edge, all of the coyote grace and a well-timed late press, and a miss costs a
   splash and a 5 s swim to the ramp. A moving train doesn't change it: trains reach the take-off only as they brake to
   the end stop, standing on the track with the raised leaf straight ahead, so a jump off the cab roof (about 3.5 m
   higher, plus a braking train's carry) has to go diagonally, about 29 m against its 23.6 m reach. Nothing standable on
   the railhead platform is high enough to launch from (Level finding 13). The cost: the platform is 6 m under the
   hinge deck, not "about 4 m" (first review finding 1); the strut reads taller from the take-off, which helps. R1's
   report gets a stepped late-double-jump envelope. Beyond this plan: Home's level-check uses `COURSE_DOUBLE` for its
   jump course; that is safe where it proves a gap *can* be crossed, but it would be optimistic in any "can't reach"
   assertion (for the level tool's owner).
2. **The moving railhead drops players into the sea. Change before building (R1, R4b, folded).** The railhead
   platform stands beside the formation over open sea. Moved 20 m as one piece when a bent's second footing goes in,
   anyone on its back 20 m (the rack is there, at u − 18) falls 15–20 m into the water, a few seconds from a ramp that
   only exists at bent 13. The platform stays behind as a walkway (`RING_WALK`); only the rack, jib and lever slide on.
   The walkway is also where people walk to the railhead once three trains run over the stub, beside the track
   rather than on it (first review finding 6). The railhead's sea ramp moves with the railhead from bent 6, so a fall
   at any railhead is a short swim, not two minutes to Far Head (friction-without-failure rec 1).
3. **An early arrival has no way home but a long swim. Change before building (R2b, folded).** Nearest-dry Get
   unstuck keeps anyone on the island there, and before bent 13 there is no hook ring, and no ramp on our side beyond
   the railhead's. Swimmers chose the swim, but a glider at `head` 6 (now possible, call 39) didn't. Before `joined`,
   Get unstuck from past the gap returns you to our side (call 31). Also, line 2's path points past the built deck must
   never be recovery targets, or Get unstuck could place you over open sea (the 9 November "nine recoveries in a row
   put him back in the sea").
4. **The leaf lands on whoever stands at bent 13's end (R4c, folded).** The rivet is struck there and the jib's user
   stands 3 m away, so in co-op someone is often there as the last weight goes on. A kinematic leaf must lift or shove
   them clear with a tumble (slapstick), never pin them. R4c's eval checks it.
5. **About 70 s of idle at the railhead between wagon loads, twice (pacing, R5, folded).** 18 footings in loads of 6:
   about 50 s of setting, then the wagon's lap (about 2 min) with nothing to do but ride along. That is the one leg over
   the "something to do every 10–20 s" guide, at the point in the game where players were already lost (10 November
   P1). Not blocking: R5 logs it, and over 60 s a load the ring's rack and the wagon's load go to 9 (two loads; a logged
   Default). The early peek at `head` 6 (call 39) is an unplanned thing to do while waiting.
6. **The loop's reason is wrong; its number is right (call 12).** `platforms.ts` carries a rider in the deck's frame,
   yaw included, so 2.5 m/s² sideways isn't what throws people (the open "came off moving trains" P1 is a separate
   bug). Keep 10 m/s for camera spin and the view. R5's standing rider over the bow and round the loop stays.
7. **Copy (for the owner; none is The Boogler's, and none is changed here).** Suspect lines: Rivet's "You're early.
   The railway isn't. Look up while you drip." ("drip" assumes a swim: tied to arriving wet, call 38; a glider who
   arrives early at `head` 6 gets neither early line, which is fine); Squint's "I watched you swim the whole way. Very
   slowly. Very bravely." ("the whole way" is an exaggeration if you swam 17 m from the railhead, possibly the joke);
   "Two of you? The picture only had one box." with three players (owner to give a count-aware variant); the
   character **Rivet** beside **Strike the rivet** (they are 180 m apart, so no prompt clash; it's only a doubled word
   in the area's copy: keep it unless the owner renames); the halt plaque **Railhead** after the Meet, when it's no
   longer the railhead (call 14).
8. **The far leaf shouldn't pop (R2c, folded).** A brighter far leaf swapped for the near one at 500 m would visibly
   change colour from the pier head's approach; fade the glow out with distance instead. From Home the lowered leaf is
   seen end-on along the line and vanishes, so the change reads as "the upright is gone", which is enough.

**The swimmer who reaches the island early** (planner's question 6): accepted as built. They find the rota, the hammer,
the mural, the steel under its tarp and the raised leaf facing home, with no prompts and nothing gold; the two early
lines; and call 31 to get home. Nothing there supplies work.

### Cleared to build

- **Step 0: now**, with (f) extended to the late press and (g2) added (folded).
- **R1: now**, on the numbers above; it need not wait for step 0, whose (f) only confirms them.
- **R2a: now, on design.** The coast option is the sea owner's engineering call (open question 6), not the owner's.
- **R2b: now**, after R1 and R2a, with call 31's recovery (folded).
- **R2c: now**, after R1, with the fade (folded).
- **R3a, R3b, R4a–R4e and R5:** cleared on design; they wait only for v26 on main (sequencing) and never ship
  mid-session.

Nothing waits for the owner: no step is direction, unapproved scope or irreversible.

### Owner questions

1. **Should only a glide cross the gap?** Recommended: **yes**, with the brace platform at 8.0 m from u 284 to 294 and
   the hook ring at u 276. The alternative is to leave the greybox's platform (10.0 m from u 276.5) and accept the
   double jump as a third way across, alongside the glide and the swim. The work gate holds either way, but then the
   glider's one main-line use is optional.
2. **Before the Meet, does Get unstuck from the island take you back to our railhead?** Recommended: **yes**, so an
   early arrival never faces a two-minute swim home.
3. **Is the train-wait budget the minute rather than "one leg"?** Recommended: **the minute** for riders, and the
   wagon's train is never held while the ring owes footings.
4. **Does the railhead stay a halt after the Meet (west platform added), and what does its plaque say then?**
   Recommended: **keep it**; the name is yours ("Railhead" is a placeholder once the line runs through).
5. **Do you keep the name Rivet for the foreman, beside the gold rivet you strike?** Recommended: **keep it** (they are
   never in the same place), and reword the early-arrival and co-op lines as you like.
