# Turnouts: real points wherever tracks merge or cross

> **Status: step 1 built (14 November 2026): J1, the spur's turnout, static.** Checkpoint A is next; nothing else is
> built. Written on `origin/main` at 9036299a8. It builds on the view-only track tidy pass (one sleeper set through
> overlaps, one track kit, the stall road seated: PR 1793, `yard-track.ts` and `home-yard.ts`) and does not redo it;
> step 1 extends that pass's shared timbers rather than drawing through `track.ts` (see step 1's departures).

## Goal

Every place two tracks meet reads as a built junction: continuous stock rails, blades, a frog, check rails, long
timbers and a lever, generated from the two track centrelines so no junction is hand placed. Serves **11. Show, don't
tell** (the blades show which road the next train takes) and **7. Telegraph everything**; no principle is bent.

The owner's words (14 November 2026, looking at the Roundhouse review stills): "I could see the rails kind of
intersecting and merging, and I'm wondering if we can make that more seamless or more realistic, like real rails merge,
so it could look a lot nicer and feel more immersive." Earlier the same day: "it looks a little bit messy with the rails
and not as polished as I would like."

Binding owner calls ([owner-calls](../agents/owner-calls.md)): "Place for the look, not the cost; terrain may change",
"Playtest before bespoke functionality" (so: no new mechanic, no player-thrown points; look work continues), "Block out
spacing first, details later" (so: boxes and kit rails at true positions first, a modelled frog casting later),
"Development is live" (each step ships to the live game, no flag).

**Research:** none of the docs in [docs/research/README.md](../research/README.md) covers turnouts.
[home-station-layout](../research/home-station-layout.md) set the station's arcs (heads R 18, spur and leg R 15); the
plan keeps them. The proportions below are general railway practice from memory, not checked against a source.
Not a port from Place: no fit check is owed.

**The rail route:** no beat of `npm run loop` is touched (no bill, supply, cue or rule changes), so no node was read.

## What is there today (measured on 9036299a8)

Seen in `.look/roundhouse-review-1114/` (`late-spur-points`, `late-topdown-throat`, `late-throat-eye-level`,
`late-table-close`, `late-buffers`, `early-spur-points`): two plain tracks are overlaid at each junction. Sleepers of
both tracks interleave, in two looks (the lines' kit sleepers from `track.ts`, plain brown boxes from
`home-station-view.ts`); the four rails run through each other with no blades, frog or check rails; the diverging
track's rails start with square ends about 2 m past the toe (`track.ts` draws the up rails only where the offset is
over 0.12 m). A lever box already stands at the spur and at each end of the leg.

### How track is data

- **Lines:** `src/place/layout.ts` `LINES.north` / `LINES.east`, 1 m samples; Home's first metres are arcs and
  straights from `src/place/home-station.ts` `HEADS`. The sim keeps a 10 m copy (`RAIL_LINES[].path`) for the
  near-train check only.
- **The second track** is not a second spline: it is a lateral offset from the line, `upLat(f, s)` and
  `crossLat(f, s)` in `layout.ts` (4 m left, a smoothstep over 20 m at each merge). `track.ts` draws it; `train-view.ts`
  (`latOf`) and `line2-path.ts` (`line2Lat`) pose trains with the same functions.
- **The sim knows a junction only as** `RailHalt.end` (`railEnd(kind, mergeCm, side)` in `src/sim/railway-lines.ts`:
  `stub` or `crossover`, where the merge is, a 20 m block edge `TURNOUT_CM`) and a train's `track` (0 up, 1 down). It
  never sees the lateral shape.
- **Home's spur and leg** are arcs in `home-station.ts` (`SPUR`, `LEG`), drawn by `home-station-view.ts` `track()`.
  The table and stall anchors are pinned by the sim in centimetres (`SHED_TABLE`, `SHED_STALL`).

### Every place two tracks meet

Measured from the data by a script (centre separation against distance from the toe; gauge 1.0 m between rail centres,
sleepers 2.3 m). "Frog" is where the two inner rails cross (separation = gauge); "clear" is where the two sleeper sets
stop overlapping. World metres (x, z). Radii of the line turnouts are `npm run level-check`'s.

| # | Junction | Toe (x, z) | Hand | Frog from toe, angle | Clear | Diverging radius | Drawn by | Who runs it |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| J1 | Spur off road 2, s 5.5 | (922.5, 10.5) | right | 5.5 m, 21.2° (1:2.6) | 8.4 m | 15 m off a straight | `home-station-view` + `track.ts` (road 2) | the shunt |
| J2 | Leg onto road 2, s 26 (body s 26 to 32) | (941.8, 3.5) | left | 4.1 m, 29.1° (1:1.8) | 6.4 m | 15 m, against road 2's 18 m the other way | same | the cart |
| J3 | Leg off line 1, s 54 (body s 54 down to 42) | (952.3, −30.0) | left | 6.2 m, 12.7° (1:4.4) | 12.1 m | 15 m for 3.3 m, then straight | same | the cart |
| J4 | Line 1 up track, Home, s 36 to 56 | (948.3, −12.5) | left | 6.5 m, 14.8° (1:3.8) | 11.1 m | 9.5 m (on line 1's 18 m curve, same way) | `track.ts` | trains |
| J5 | Line 1 up track, Camp, s 182 down to 162 | (984.9, −147.4) | right | 6.5 m, 14.8° | 11.1 m | 11.1 m | `track.ts` | trains |
| J6 | Line 2 up track, Home, s 34 to 54 | (949.7, 2.9) | left | 6.5 m, 14.8° | 11.1 m | 18.0 m | `track.ts` | trains |
| J7 | Far Head crossover, up-track end, s 490 | (1331.3, −150.8) | right | 7.2 m, 13.5° (1:4.2) | 12.2 m | 24.3 m | `track.ts` | trains |
| J8 | Far Head crossover, down-track end, s 512 | (1351.8, −159.8) | right | 7.2 m, 13.4° | 12.2 m | 24.3 m | `track.ts` | trains |
| J9 | Line 2 up track, pier root, s 556 down to 536 | (1385.5, −187.4) | right | 6.5 m, 14.8° | 11.1 m | 15.4 m | `track.ts`; `retire()` removes it at Q7 | trains |
| J10 | Railhead stub, moves with the head: merge s 832 to 972 in 20 m steps | (1404.5, −462.0) to (1408.3, −601.9) | — | not measured | — | straight deck | `railhead-view.ts` (`crossoverSpan`) | trains |
| J11 | Ring Island crossover, s 1137 to 1159 | (1412.7, −766.9) | — | not measured | — | straight | `src/entities/ring-island/view.ts` | trains |
| J12 | Stack heads 1 to 3 (merge s 1670, 2180, 2690) and High Gorge's crossover (s 3195) | on the greybox row | — | not measured | — | — | the greybox route's views (not read) | trains |
| T1 | Table rim, the spur (bearing 310° from the centre) | table (942.1, 17.1), r 4.8 | — | a butt join | — | straight 1.5 m | `home-station-view`, `roundhouse-view` | the shunt |
| T2 to T4 | Table rim, stall roads at 160°, 190° (open), 220° | rims (943.7, 21.6), (941.3, 21.8), (939.0, 20.8) | — | butt joins | — | straight 3.7 m | same | the shunt (190° only) |

**None found:** a diamond (no two tracks only cross: the leg leaves line 1 on the east and the up track on the west;
on road 2 the up track lies between the leg and road 2). Passing loops at halts (the double track runs through; the
up platforms stand on the plain up track). Leg 2 (`src/content/levels/leg2.ts` is an unlaid bed). Ring Island's balloon
loop (`RING_LOOP`, overruled 10 November, kept for tools only). The tentative lines `ns`, `bay`, `cave` have crossovers
and loops in the catalog, no track drawn and no train.

**Two clusters:** J3 and J4 share line 1 between s 36 and 54 (J4's frog near s 42.5 on the west, J3's near s 47.8 on
the east: one timbered zone about 18 m long with three tracks). J2 ends at s 32 and J6 starts at s 34: neighbours, not
overlapping.

### Do today's centrelines make valid turnouts? Yes

- **Correction, 14 November (the Quarry's bend, not a junction):** the table's 9.5 m was not the tightest drawn
  track. Between its turnouts the up track ran a flat 4 m inside line 2's bend at the Quarry (the line's own radius
  6.5 m there, s 175 to 181), which made it a bend of under 3 m; an up train's engine stood in its first car at that
  stop. It is eased in Place data (`upFull` in `src/place/layout.ts`, `src/place/track-ease.ts`): through s 156 to
  200 the up track's offset runs 3.91 to 4.35 m, so it turns no tighter than 10 m. `upLat` carries it, so anything
  generated from the two centrelines there follows; the line's own 6.5 m bend is the sim's data and is unchanged.
- **Tangent at the toe:** every junction leaves at 0.8° to 2.1° measured 0.3 m in (zero in the data: the smoothstep
  has zero slope at its start, the spur and leg are arcs tangent to their roads).
- **Proportions:** a real lead (toe to frog) is about 2 × gauge × frog number. For a 1.0 m gauge and 1:3.8 that is
  7.6 m; ours is 6.5 m. The line turnouts are sharp, toy-scale turnouts of the right shape. They reach 4 m track centres
  in 20 m, which is what 1:3.8 needs; the "two tracks nearly on top of each other for 20 m" is the true length of a
  turnout to 4 m centres, drawn without its parts. Gentler real proportions (1:6 to 1:8) would need 35 to 45 m each.
- **Outliers:** J2's frog is blunt (1:1.8) because two opposite curves part there; J1 is 1:2.6; J4 stands on a curve
  and tightens to 9.5 m (accepted in home-flip, call 14). The smoothstep keeps turning through the frog, where a real
  frog is straight.

So the overlap is a drawing problem, not an alignment one.

## Design

### (a) What a turnout is, as far as this game needs

Named for a right-hand turnout; mirror for left. `d` is metres from the toe.

- **Stock rails:** the two outer rails (the through road's far rail, the diverging road's far rail), unbroken from
  before the toe to past the frog.
- **Switch blades:** the two inner rails begin at the toe as thin tapered blades, each against a stock rail. One lies
  closed, the other stands open by the throw. A tie bar joins their tips.
- **Closure rails:** the inner rails from the blades' heels to the frog.
- **Frog (crossing vee):** where the inner rails cross. A vee whose nose points at the toe, a flangeway gap in each
  inner rail ahead of the nose, and **wing rails:** the closure rails bent to run beside the vee past the nose.
- **Check rails:** a short rail inside each stock rail, abeam the frog's nose.
- **Timbers:** from just before the toe to where each road has room for its own sleepers, one long timber per
  station under all four rails, lengths stepping up, laid square to the through road. Two headblock timbers at the toe
  run out under the lever.
- **Points lever** on the headblocks, abeam the toe, on the side away from any neighbouring track.
- **Diamond** (two tracks only cross): four frogs, check rails inside all four, no moving parts, long timbers under
  the whole crossing. None exists today; `turnout.ts` exports no diamond until one does.

Proportions (`KIT` in `src/place/turnout.ts`; real practice scaled to the 1.0 m gauge, the throw exaggerated to read):

| Part | Real practice | Here |
| --- | --- | --- |
| Lead (toe to nose) | about 2 × gauge × N | whatever the centrelines give: 4.1 to 7.2 m |
| Blade length | a quarter to a third of the lead | 0.4 × frog distance, between 1.6 and 2.4 m |
| Blade throw at the tip | about 8% of the gauge | 0.14 m |
| Flangeway | about 3% of the gauge | 0.08 m clear |
| Wing rails past the nose | about 1 m | 0.9 m, flaring 0.12 m at the end |
| Check rails | about 2.5 × gauge | 2.4 m, centred abeam the nose, 0.08 m inside the stock rail |
| Timbers | plain sleeper pitch or closer; lengths step up | the through road's own sleeper stations (1.2 m), 2.3 m stepping by 0.3 m |
| Headblocks | two timbers at the toe | the two stations nearest the toe, 1.2 m longer on the lever's side |

### (b) Geometry from the two centrelines

**New, pure, no three.js:** `src/place/turnout.ts`.

```ts
export type Centre = (d: number) => { x: number; z: number; y: number }; // world metres, d from the toe
export type RailPiece = { role: 'stock' | 'blade' | 'wing' | 'check' | 'vee'; a: XZY; b: XZY; d: number };
export type Timber = { x: number; z: number; y: number; yaw: number; len: number; d: number };
export type Turnout = {
  toe: XZY & { yaw: number }; hand: 1 | -1;
  frogD: number; frogAngle: number; clearD: number; bladeLen: number;
  /** Signed offset of the diverging centre from the through centre at d (0 at the toe). */
  offset: (d: number) => number;
  /** Timber ends across the through road at d, stepped by 0.3 m; null outside [-1.2, clearD]. */
  span: (d: number) => readonly [number, number] | null;
  rails: RailPiece[];              // what the plain track does not already draw
  blades: readonly [Blade, Blade]; // heel, tip closed, tip open; [through-side, diverging-side]
  lever: { x: number; z: number; yaw: number };
};
export function turnout(through: Centre, diverging: Centre): Turnout;
```

- `offset(d)`: the diverging point at `d` projected on the through road's normal, by 0.05 m marching.
- Toe: `d = 0`. Frog: first `d` with `|offset| >= 1.0`. Clear: first `d` with `|offset| >= 2.3` (the sleeper length). Hand: sign of `offset`.
- The generator only adds; it cuts nothing out of the plain track in the static steps (see (c) for why).

**New:** `src/place/junctions.ts`, the one list. `junctions(): Junction[]` with
`{ id, line: LineSpec['id'], s, dir: 1 | -1, kind: 'stub' | 'crossover' | 'spur', through, diverging, when? }`:
J4 to J9 are built from `FORMATION`, `upLat` and `crossLat`; J1 to J3 from `SPUR`, `LEG` and `roadAt` (J2 and J3 carry
`when: 'leg'`, shown with the leg). `line` and `s` say whose track view draws it and where its pieces fall in the
laying order. A test holds the list against the sim's catalog: every `RailHalt.end` of lines 0 and 1 that the layout
draws has a junction at its `mergeCm`.

**Records or procedural: procedural, from track data, no records.** The pieces are rails, timbers and a lever whose
every position follows from two centrelines; a record would be a second copy of the layout that goes stale when a line
moves. It adds no colliders, seats, signs or interactions, so no prefab door or debt count changes, and nothing goes in
the shared catalogue (99% full by bytes). The pieces ride the track's existing instanced batches.

**The geometry question, three options:**

- **A. Keep every centreline; generate from them (recommended).** View-only. No sim, wire or catalog change, no
  `WORLD_NS`. The data is already valid turnout geometry (above).
- **B. Reshape the up track's ease in the view** (`upLat`, `crossLat` in `src/place/layout.ts`): an arc of 22 m radius,
  7.4 m straight at 17° (1:3.3) through the frog, an arc back, in the same 20 m from the same merge. Trains read the
  same functions, so they follow; the sim is untouched (it holds the merge, the 20 m and the track index, not the
  shape). Gain: a straight frog, and J4 eases from 9.5 m to about 9.9 m. Cost: `crossingPlanks` where a board crossing
  still sits in a turnout's ease, level-check's accepted radii, the gantry's up-pair seats. Small gain; take it only if
  step 3's look shows the frog on a curve reading wrong.
- **C. Move junctions in the sim's data.** Slide J4's merge from s 36 to s 40.5 onto line 1's straight
  (`railEnd('stub', 3600, -1)` and `FORMATION.timber.from`: the block edge and signal move 4.5 m; `WORLD_NS` v45 with a
  dated history line, shipped when ready). It would put J4's frog beside J3's on a 15.4 m straight, a three-way
  junction. Flattening J2 means moving the leg, which is lifted when the cart retires (rail decision, 10 November, east
  bay). Not recommended.

### (c) Blades and the route

All of it is Local: a pure function of accepted rows, the same on every tab, with no op, state key, presence field or
message.

- **State that already exists on the client:** trains' rows (`track`, `to`, `turn`, `dest`, along) and
  `latOf`/`line2Lat` in `train-view.ts` and `line2-path.ts`: the road a train takes at a junction is whether its
  lateral is off zero just past the frog. The table's road is `shed(world).table` (drawn already). The shunt's and the
  cart's positions exist inside `roundhouse-view.ts` and `cart-view.ts` as view-local values.
- **Rule:** a junction lies for the nearest train within 60 m of its toe or standing over it; with none, it rests for
  the through road (sprung points). J1 lies for the spur while the shunt is between the table and road 2; J2 and J3 for
  the leg while the cart is on it or within 20 m.
- **State that would be needed and is not planned:** points a player throws (a lockstep row per junction, an op, a
  rule for a train meeting points set against it). That is a new mechanic; "Playtest before bespoke functionality" holds
  it.
- **Why two phases.** Drawn for the through road, a turnout needs no cut in the plain rails: the through road's inner
  rail already runs unbroken to the toe (it is the closed blade), and the open blade, the missing stock rail from the toe
  to where the plain diverging rail starts, the vee, wings and check rails are additions. Moving blades need the
  through-side blade cut out of the plain rail, and on machine-laid track those rails are the pairs the gantry carries
  (`nearestPair` in `track.ts`). So steps 1 to 5 are static for the through road, and step 6 adds the cut and the motion.

### (d) Wheels through the frog

Not seen in motion for this plan; from the code. A car is posed on a 2.2 m chord with the lateral read at each end
(`poseCarOnLine(c, line, at, 1, lat)`, `poseOnLine2`), so it follows the diverging centreline through a turnout; the
chord's error on the tightest (9.5 m) is about 6 cm. Today the rails run through each other with no gap, so no wheel
crosses one. The static steps cut nothing; step 6's cut is under a blade drawn in the same place. Two things do not ride
on rails today:

1. A train Q7 turns at the Pier eases onto the down track over the 20 m before its stop on plain double track
   (`line2Lat`, last branch): it crosses 4 m with no crossover drawn there.
2. The shunt's path is a polyline through the table's centre and the stall's door; its corners are at the rim joins.

Step 6's clip (a train leaving Home through J4) is the proof for trains.

### (e) The table's rim and the stall roads

Not turnouts; butt joins. Today the stall roads' rails stand 5 cm over the table's (`RAIL` 18.35 in
`roundhouse-view.ts`, `TABLE_RAIL + 0.05` in `home-station-view.ts`, against `tableY` 18.30), the approach sleepers stop
short of the disc at no fixed distance, and the disc has no edge. The tidy pass seats the stall road; this plan adds:

- one rail height for the deck, the spur and all three stall roads, from one constant;
- every approach rail cut on the circle r + 0.03 m, the deck's rails on r − 0.03 m, so each join is a 6 cm gap square
  to the road;
- a stone coping ring at the rim (24 boxes, top at the rails' foot), and under each road's rail ends one rim timber
  (2.3 m, square to the road, its inner edge on the coping). Adjacent stall roads are 2.48 m apart at the rim, so the
  timbers clear each other by 0.18 m;
- a test that the deck's two rest yaws equal the spur's and the open stall's bearings (they come from the same data).

The pit and bridge stay home-station's step 10.

### Sync kinds, authority, files

| Piece | Kind | Authority | Files |
| --- | --- | --- | --- |
| Turnout geometry | Local, static, cosmetic | none | `src/place/turnout.ts`, `src/place/junctions.ts` |
| Its pieces | Local, cosmetic; laid track's pieces drop with their panel as today | none | `src/entities/railway/track.ts`, `home-station-view.ts`, `src/place/look-kit.ts`, `track-chunks.ts` |
| Blades and levers | Local, derived from accepted rows | none (the rows are the server's) | new `src/entities/railway/turnout-blades.ts` |
| Rim joins | Local, static, cosmetic | none | `home-station-view.ts`, `roundhouse-view.ts` |

No lockstep, so no sim, rules or adapter file, no `src/world/rules/types.ts` entry, op, state key, `edits`, `invariants`
or `env` fact. No controls: no action id, pad slot, key, touch or guide row.

**Must not change** (lockstep.md, sync.md): `RAIL_LINES` (`mergeCm`, `TURNOUT_CM`, paths), `RailTrain.track`,
`SHED_TABLE`, `SHED_STALL`, `HEADS`, `STUB`, `trackPanels`. Nothing under `src/sim`, `src/world`, `src/net` or `server/`
is edited by any step.

**How the pieces are drawn.** Through the owning line's `buildTrack` `add()` (it takes world positions), so they join
the existing chunked kit batches, their LOD levels and the drop-in. Rails are kind `'rail'`. Timbers are a new kind
`'timber'`: the kit's sleeper mesh without the tie-plate batch (a stretched sleeper would stretch its plates), in
`KIT_SIZE`, `KIT_NAME` (`timber: 'sleeper'`), `WOOD_KINDS`, `HEAVY` and `FAR_KINDS`. A sleeper station inside a zone
becomes one timber at the same `s` and frontier; the diverging road's own sleepers inside the zone are not drawn.
Added rails go in a set `turnoutRails` that both `nearestPair` predicates exclude, so the gantry carries what it
carries today.

## Steps

Each step is view-only, leaves `node dev/ship-check.ts` green, and ships live. Builder for steps 1 and 3 to 7: the
**player-visible implementation** row of `npm run models` (implementer agent, fable medium), each with the **visual
review** row (a fresh subagent, fable medium) on its one proof look. Step 2 and the checkpoint runner: the
**implementation of an approved plan** and **runner** rows (Codex, gpt-6.1-sol medium).

- [x] **1. The proof: the spur's turnout on road 2 (J1), static.** Rebase on the tidy pass first.
  **Built 14 November 2026, with these departures** (the bullets below are the plan as written):
  - **Drawn by the yard, not `track.ts`.** The tidy pass already carries road 2's sleepers under the spur as long
    timbers and draws the spur in the kit's pieces (`yard-track.ts`), so J1's parts go into those batches:
    `yard.rail()` for each `RailPiece`, and `yard.timbers()` takes a `span` per sleeper from `turnout().span`. No
    `'timber'` piece kind, no `turnoutRails` set, no edit to `track.ts`, `look-kit.ts`, `track-chunks.ts` or
    `home-station-view.ts`. The spur's own sleepers start after the last shared timber, as they did.
  - **One rail is cut.** The spur's inner rail is the yard's, so its closure rail stops a flangeway short of road 2's
    inner rail and takes up again past it as the vee's leg (role `closure`, added to `RailPiece`); road 2's rails are
    the line's and stay whole, so the vee's other leg is road 2's rail itself and there is one `vee` piece, not two.
    Net: 15 added rail pieces (4 stock, 2 blade, 2 closure, 1 vee, 2 wing, 4 check), each wing one length.
  - **`Turnout` has no `toe`, `blades` or `lever` yet** (step 6 needs them; nothing reads them now). It has `nose`
    and `plainD` (where the diverging road's plain rails begin). `turnout()` takes the lever's side; `RailPiece` has
    `road` and `w` (a blade is 0.45 then 0.75 of a rail's width). `offset(d)` projects the diverging point at `d`;
    `span(d)` uses the diverging centre where it crosses that timber's line.
  - **Headblocks are the stations within 1.5 m behind the toe** (s 4.2 and 5.4), not "the two nearest the toe"
    (s 5.4 and 6.5): the lever stands 1.5 m behind the toe and only those reach it.
  - **Early state.** The long timbers and the spur's parts stand from the start; the two wing rails and road 2's check
    rail show with the yard's later part (`line2Completed >= 1`, as the leg does). They appear, they do not drop.
  - **The eval** has `at=spur | spur-top | spur-frog`; the other framings are added with their junctions.
  - **Render counts at Home** (`npm run perf -- --render`, from spawn): 363 calls before and 363 after in the paired
    runs, 492,980 and 495,164 triangles; a later baseline run read 385 calls and 498,266 triangles, so the scene's own
    moving parts drift more than the change. No batch is added (the pieces join the yard's rail and sleeper batches),
    so the draw count is flat by construction; about 15 × 228 triangles are added close up, less the spur's two plain
    rail lengths the turnout replaces.
  - **Seen** (`.look/turnout-j1-*.png`): from above and at eye height it reads as points. Not seen: a train running
    through the frog (line 2's train backs in and stops with its tail at the frog's edge).
  - **What the remaining junctions need that J1 did not:**
    1. *A through road the line draws and lays.* J4 to J9 have both roads in `track.ts`, panelled and dropped: there
       the plan's `'timber'` kind, the `turnoutRails` set kept out of `nearestPair`, and pieces added after the
       existing loops are still needed, and the pieces must drop with their panel rather than appear.
    2. *A cut in a line's rail.* J1 cut only the yard's rail. Where both roads are the line's, either the diverging
       rail is split across the frog (a remnant rule for the gantry's pairs) or the frog stays an uncut crossing with
       wings laid over it; decide at step 3 from the look.
    3. *A curved through road* (J4 on line 1's 18 m curve, J2 against road 2's): `turnout()` frames by finite
       differences and should hold, but it is only tested on a straight through road. Timbers square to a curving
       road fan; check they do not touch.
    4. *Left hands and `dir: -1`* (J2 to J6 leave left; J3, J5, J9 run against `s`): `hand` is carried through the
       maths, untested at -1.
    5. *Overlapping zones* (J3 with J4): the union of spans, one timber per station.
    6. *Tie plates under the turnout's own rails.* The yard plates a timber for the spur only once the roads are
       1.3 m apart; between the toe and there the spur's rails sit on bare timber.
    7. *Short kit rails.* A kit rail scaled under about 1 m squeezes its joint plates and bolts to hatch marks (seen
       at the check rails' ends). A plain rail length without hardware would fix it for every junction.
    8. *The leg (J2, J3)* still uses the tidy pass's `clearOf` square rail ends; it moves to `turnout()` in step 3.
  - Create `src/place/turnout.ts` (`KIT`, `turnout()`, as above) and `src/place/junctions.ts` with J1 only.
  - `test/turnout.test.ts`: "the toe is tangent" (under 2.5° at 0.3 m); "the frog is where the inner rails cross"
    (J1: 5.5 m ± 0.1, 21.2° ± 0.5, right hand); "a timber spans all four rails" (each rail centre at least 0.5 m
    inside its ends; lengths are 2.3 m plus whole 0.3 m steps); "the blade is shorter than the lead" (at most 2.4 m
    and half the frog distance); "check rails stand abeam the nose".
  - `src/entities/railway/track.ts`: for `spec.id === 'quarry'`, read `junctions()`; one helper for both sleeper
    loops (panelled and continuous) that emits a `'timber'` across `span(d)` instead of a sleeper inside a zone; add
    `rails` through `add()` at the piece's `s`, into `turnoutRails`; add `'timber'` to `PieceKind` (it thuds as a
    sleeper). `src/place/look-kit.ts` and `track-chunks.ts`: the `'timber'` kind as above.
  - `src/entities/railway/home-station-view.ts`: `track()` takes a first sleeper distance; the spur's sleepers start
    at `clearD`. The lever stays where it is; the headblock under it reaches it.
  - Early state: road 2 is laid only to s 7 until line 2's first stretch. The timbers and the spur-side parts are
    pre-laid (`pre`); the through road's parts past s 7 drop with their panel (designer call 1).
  - Proof look (one, per "Fast ships"): eye level at the spur, the framing of `late-spur-points.png`, at `trains-on`.
    Add `dev/look/evals/turnouts.ts` after `home-flip.ts` with `at=spur | spur-top | throat | throat-top | farhead |
    table`; the top-down and the `awake` (stub only) stills go to the reviewer with it.
  - Record `npm run perf` at Home before and after in this plan.
- [ ] **Checkpoint A: the owner and the designer see step 1's stills before the roll-out.** Nothing else waits on it.
- [ ] **2. The whole list, and the level check reads it.** `junctions.ts`: J2 to J9. `test/turnout.test.ts`: the
  tangent, frog and hand cases for each (the table above, ± 0.1 m and ± 0.5°); "every line end the layout draws has a
  junction" against `RAIL_LINES[0..1].halts[].end`; "one timber per station in a cluster" (J3 with J4).
  `dev/level/track-continuity.ts`: replace the "turnouts and crossover" lines with one row per junction (toe, hand,
  frog distance and angle, clear, tightest radius) and add the spur and leg, which the tool does not know today.
  Verify: `npm run level-check` prints the table above. No player-visible change.
- [ ] **3. Home's throat: J4, J6, then J2 and J3.** `track.ts` for both lines; the up track's sleeper loop skips
  inside a zone; `span()` takes the union where zones overlap (J3 with J4). `home-station-view.ts`: the leg's sleepers
  start at `clearD` at both ends; its turnout pieces show with the leg (`legLaid()`). Proof look: `at=throat-top` (the
  framing of `late-topdown-throat.png`); `at=throat` (of `late-throat-eye-level.png`) to the reviewer. If the frog on
  the curve reads wrong here, option B becomes a step of its own.
- [ ] **4. The lines: J5, J7, J8, J9.** `track.ts` only. J9's pieces join `merge` so `retire()` takes them at Q7. On a
  deck (`deck(s)`) no timbers: the planks already span both tracks. Proof look: `at=farhead`, the crossover from Far
  Head's platform end at eye level.
- [ ] **5. The table's rim and the stall roads (T1 to T4).** As (e): `home-station-view.ts` (the spur's end, the two
  ruin roads, the coping ring), `roundhouse-view.ts` (the open stall's road, the deck's rails, one rail height).
  `test/home-station.test.ts`: "the deck rests on the spur's and the stall's bearings"; "rim timbers clear each other".
  Proof look: `at=table`, the framing of `late-table-close.png`.
- [ ] **6. Blades that move, and levers that throw with them.** New `src/entities/railway/turnout-blades.ts`: one
  `createBoxBatch` for every junction's two blades, tie bar and lever arm, rewritten only while a junction changes
  (0.4 s ease, a clank through the existing sound helper). Pure `routeOf(junction, rows)` beside it with
  `test/turnout-route.test.ts`: "an up train within 60 m sets the stub for the up track", "no train rests it for the
  through road", "a down train trailing through sets it back", "Far Head's crossover follows `crossing()`". `track.ts`:
  cut the through-side blade out of the plain inner rail (split the piece; a remnant under 1 m joins `turnoutRails`).
  The shunt's and the cart's positions come out of their views as pure helpers over the rows they already read, not by
  one view reading another. Line levers are drawn in the batch with no collider; Home's three keep their boxes and
  gain the moving arm. Proof look: a real-time clip from the island's end ramp of a line 1 train leaving through J4.
- [ ] **7. The sea junctions: J10, J11, J12.** `railhead-view.ts` (`crossoverSpan`), `src/entities/ring-island/view.ts`
  and the greybox route's track view call `turnout()` with their own centrelines (`line2World` with `line2Lat`'s
  shapes) and draw through their own box paths; `junctions.ts` gains them so step 6's blades cover them. Read those
  three files first: this plan did not. Proof look: the railhead's points from its platform.
- [ ] **Checkpoint B (after step 7, or after step 5 if 6 and 7 wait).** Runner: Codex, gpt-6.1-sol medium. Once:
  `npm run check:full`; `npm run level-check`; `npm run perf` at Home and Far Head against step 1's numbers;
  `npm run checkpoints -- trains-on`; the track layer laying line 1's first panels over J4 (the bot segment to Q1) to
  show the gantry still seats a pair per panel; the six `at=` stills. Then "not tested on a device" or a device run.

## Level findings

`npm run level-check` on 9036299a8: `track continuity: ok (18 tracks, 7 joins)`, 13 reports, exit 0. Nothing is placed
that a player must reach and no centreline moves under option A, so there is no reach or gating finding. What it says
about the junctions:

1. J4 leaves at up to 16.7° on a 9.5 m radius ("a 1:8 turnout leaves at 7°"), J5 11.1 m, J6 18.0 m, J9 15.4 m at up to
   17.9°, the crossover 24.3 m at up to 15.3°. Reported, not failed; J4 was accepted in home-flip (call 14).
2. Fouling zones (tracks closer than 2.3 m): line 1 s 36 to 48 and s 171 to 182, line 2 s 34 to 46 and s 545 to 556.
   These are the timbered zones.
3. The tool does not know the spur or the leg (step 2 adds them).
4. If option B or C is taken, rerun it: B changes the up track's radii and the Quarry and Far Head platform clearances
   are beyond the 20 m and should not move; C moves a signal and a block edge.

## Risks

- **Room safety:** nothing from "Don't" applies; no apply, effect, presence, transport or save is touched.
- **Mixed builds:** none under A or B. C alone bumps `WORLD_NS` to v45 with a dated history line.
- **Hotspots:** `track.ts` (739 lines; piece order feeds `panelPieces`, `upRails`, `retire` and the gantry's seats: new
  pieces must not shift an existing index's meaning, so add them after the existing loops); `home-station-view.ts`
  (in flight on `ship/matias-franco-6b46d32`, the hall's posts, and in the tidy pass); `look-kit.ts`.
- **The gantry (step 6):** cutting a carried rail can leave a panel without a full pair on one side. Keep the blade at
  most 2.4 m so a 3 m piece always leaves a remnant, and prove it at checkpoint B. If it cannot be made clean, blades
  move only at J1 (pre-laid stub) and the line turnouts stay static: say so, do not cut the step silently.
- **Rendering:** no new material, light or shader; kit batches and `material()` presets as they are, nothing shared is
  mutated. The blades batch is never culled (`createBoxBatch`): it is about 50 boxes.
- **Cost per turnout, estimated, for the record (measure in step 1):** 8 added rail pieces (a stock stub, an open
  blade, two wings, two check rails, two vee legs): 1,824 triangles within 50 m, 352 to 120 m, 96 beyond (the kit rail
  is 228, 44 and 12). About 10 timbers replace about 10 sleepers and their plates and the diverging road's 9: fewer
  triangles than today. Draws: none for rails (they join the chunk's rail batch); one per 200 m chunk that holds a
  turnout for `'timber'` (line 1: one; line 2: two); one for all blades and levers in the game from step 6. Nine
  turnouts: about 16,400 triangles close up, four draws. A cost to report, not a reason to cut
  ([owner call](../agents/owner-calls.md#performance-guides-not-gates)).
- **Looks before the line is laid:** J1's frog has only its spur side until line 2's first stretch drops (call 1).

## Calls for the designer

| # | Call | Recommendation |
| --- | --- | --- |
| 1 | J1 before line 2 is laid: road 2 stops 1.5 m past the toe | Timbers and the spur side stand from the start; the through road's parts drop with their panel. The long timbers telegraph the line to come |
| 2 | Static setting until step 6 | The through road everywhere (it needs no cut) |
| 3 | Lever position | Home's three stay put until step 6, then move abeam the toe; line levers stand 2.0 m out on the side away from the other track |
| 4 | Timber ends | Stepped by 0.3 m (cut stock), not tapered |
| 5 | The leg's turnouts J2 and J3, though the leg is to be lifted | Build them: the generator covers them with no bespoke work |
| 6 | A train Q7 turns at the Pier crosses 4 m with no crossover drawn | Accept for now and log it; a drawn trailing crossover there is a later look step |
| 7 | A coping ring at the table before the pit and bridge (home-station step 10) | Yes: it is what makes the four rim joins read |

## Open questions

For the owner (three):

1. **Geometry: keep the track where it is and build the junctions on it (A)?** Recommended. The lines already part
   like sharp real turnouts; what is missing is the parts. B is a small view-only refinement held in reserve; C moves
   sim data for little gain.
2. **Blades that move by themselves for the next train, with no lever for players to throw?** Recommended: yes, as
   step 6. Player-thrown points are a new mechanic and wait for the playtest.
3. **How real: toy proportions (frogs of 1:2.6 to 1:4.4, a blade gap wide enough to see from the platform) built from
   kit rails and boxes now, a modelled frog casting later?** Recommended: yes ("Block out spacing first"). Gentler,
   truer turnouts would each need 35 to 45 m and a re-laid Home.

For the orchestrator:

4. **The tidy pass is not on a visible branch.** Step 1 assumes it has landed and that it leaves one sleeper set
   through each overlap and the spur and leg in the lines' kit. If it draws Home's track some other way, step 1's
   `home-station-view.ts` edit follows its shape; the generator and `track.ts` edits do not depend on it.
5. **`ship/matias-franco-6b46d32`** (the hall's front posts) edits `home-station-view.ts` and `home-station.ts`: land
   it before step 1.
