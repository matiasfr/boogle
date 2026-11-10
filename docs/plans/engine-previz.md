> **Status: previz, waiting for the owner (10 November 2026).** Nothing in the game changes. Per the decisions "the
> train engine pass starts with a previz the owner approves" and "the train engine's cab fits Buddy", the build waits
> for his answer. Revised the same day so Buddy fits the cab.

# Train engine previz

The owner, 10 November: "whenever we do the pass on the train engine, send me a previz before we build it, we'll want
to evluate for scale, detail, and upgradability", then "for the engine block out we can use the asset viewier or a
simplified view, doesnt need to be in the game", then "I actually think they should be big enough for the Buddy to fit
in the cabin, even though the little guys will drive". Codex is out until 12 November, so this is a blockout made of
primitives in the asset stage, not painted concepts. The queue line is "P2, Train engine visual pass" ("it looks a bit
lackluster", and the P3 z-fighting where the red body meets its dark base).

## Where to see it

The asset stage (`npm run dev`, then `/character/`), category **previz**, four entries: `engine-a`, `engine-b`,
`engine-c` and `engine-today`. `&engineView=cab` (side view, the platform side's cab wall left out, Buddy and the
driver inside), `halt` (coupled to the real flatbed, Buddy in the cab), `states` (the upgrade states side by side) or
`turn` (the engine alone by a halt deck). For example
`/character/?asset=code:engine-a&engineView=cab&reference=1&bounds=0&light=production`.

- Every scene is at the real sizes: rails at ±0.5 m (gauge 1.0 m, `rail.ts`), the halt deck's top 0.72 m over the
  rail line with its near edge 1.65 m from the track's centre (`halts-view.ts`, `lat` 2.9, `hw` 1.25), the real
  flatbed (`place-kit` `flat_deck`, `flat_black`, `wheel`) coupled 0.6 m behind the engine's frame, today's gap
  (`cars.ts`).
- Same flat palette as the game (`look-kit.ts` red, black, brass; the gold rope), no textures, production lighting.
- The driver is a stand-in at the little guy's measured size (0.99 m standing, hat 0.58 m wide, from
  [home-station](home-station.md)); folk.ts's own model needs the world to build.
- Code: `character/engine-previz-parts.ts` (the part lists, no three.js, with `coplanarFaces`) and
  `character/engine-previz.ts` (the scenes). Inspection only; the game imports neither. No collider, `src/sim`,
  `src/net`, `src/world` or `server/` change.

## Buddy in the cab

**Buddy, measured** in the asset stage from the game's body in its idle pose (its skinned vertices, hat and gear
off): **1.59 m tall, 0.91 m across the arms** (shoulders and arms together; the arms hang at his sides), 0.71 m front
to back. His collider is 1.7 m tall and 0.9 m across (`PLAYER_R` 0.45, `HEAD_OFFSET` 0.8), so the cab is sized for the
collider where it is the larger.

**The cab rule**, the same for all three (`CAB_FIT` in the parts file):

- Floor on the footplate. Roof underside 1.9 m over the floor: 0.2 m over the collider, 0.31 m over his head.
- Inside, 1.79–1.88 m wide: Buddy (0.91 m) and the driver's hat (0.58 m) side by side with 0.1 m between and at each
  wall.
- A doorway in each side wall at the back of the cab, 1.0 m wide (the collider is 0.9 m) and 1.78 m high, with
  a step halfway between the halt deck and the floor; the boiler's back end stands between the doorways as the
  backhead, and the driver stands at it.
- 1.45 m long inside the walls: a 0.15 m post, the doorway, 0.3 m of wall ahead of it.

Today's cab is solid, 1.0 m long, and its roof is 1.95 m over the rail; Buddy does not fit it.

**Where proportions were kept and where not.** Each engine is scaled **1.25×** as a whole (the size Home station's
layout recommends; its tests are sized up to 1.5×), except the gauge: the wheels stay on the rails at ±0.5 m, their
radius scaled. Then the cab is fitted to Buddy, and that breaks proportion in two places:

- **The cab is taller than its engine's proportions.** Kept in proportion, the cab would need the whole engine about
  2× (6–8.4 m long, past what every halt, gate and test allows). At 1.25× the roof stands 0.05–0.22 m above the
  chimney top, where on today's engines it stands below it.
- **The engine is lengthened behind the cab** to give the 1.45 m cab: A by 0.25 m, B by 0.06 m, C by 0.3 m. The
  boiler and everything ahead of the cab keep their place.

## The candidates

| | A · Stubby toy | B · Longer, proper boiler | C · Tank engine | Today |
| --- | --- | --- | --- | --- |
| Idea | Chunky: two big drivers, a short fat boiler, tall chimney | A long boiler with a steam dome, three drivers, a pony truck, red valance | Side tanks either side of a slimmer boiler, coal bunker, cowcatcher | `train_shell` + `boiler` |
| Frame length (× today) | 4.00 m (1.33×) | 5.31 m (1.77×) | 4.80 m (1.60×) | 3.0 m |
| Over buffers | 4.68 m | 5.99 m | 5.74 m (with the cowcatcher) | 3.2 m |
| Width: body / roof / steps | 2.00 / 2.11 / 2.31 m | 2.13 / 2.20 / 2.40 m | 2.13 / 2.15 / 2.35 m | 1.6 / 1.72 m |
| Cab floor / roof top | 1.29 / 3.30 m | 1.29 / 3.30 m | 1.17 / 3.17 m | (solid) / 2.05 m |
| Boiler top / chimney top | 2.50 / 3.08 m | 2.63 / 3.25 m | 2.28 / 2.95 m | 1.75 / 2.07 m |
| Cab inside (w × l × h) | 1.79 × 1.45 × 1.9 m | 1.88 × 1.45 × 1.9 m | 1.83 × 1.45 × 1.9 m | — |
| Step from the halt deck to the cab floor | 0.57 m (one step at the halfway) | 0.57 m | 0.45 m | — |

**Draw calls and triangles per state**, as a built engine would have them: one merged, vertex-coloured mesh per
module, the wheels in the existing kit wheel batch (no new draw). The steam puffs here (672 triangles) stand in for the
game's chimney particles and are not counted.

| State | Draws | A | B | C |
| --- | --- | --- | --- | --- |
| Old train (base) | body, rods (2) | 684 | 708 | 888 |
| Boiler fitted | + boiler, lashing (4) | 1,896 | 1,960 | 2,100 |
| Speed (parked) | + speed (5) | 2,720 | 2,848 | 2,948 |
| Second engine (parked) | two boiler-fitted engines (8) | 3,792 | 3,920 | 4,200 |

## How the upgrades attach

The states come from the plans: [boiler-first-choice](boiler-first-choice.md) (the boiler is the first choice, fitted
at the old train's saddles; the mark is "the gold rope it was hauled on stays lashed round the fitted boiler, two gold
rings and a knot", a few centimetres off the surface) and the [upgrade-choices](../brainstorms/upgrade-choices.md)
parked list ("a second engine per line, then train speed"). Each is a separate mesh on the engine, so a state is which
meshes are shown:

- **Old train**: body only, its red and brass dulled to rust; the two empty brass saddles show where the boiler goes.
  On C the empty slot between the tanks says it most plainly.
- **Boiler fitted**: the boiler is one part (barrel, smokebox, door, chimney, dome), the same part that is hauled on
  the rope and arcs into the saddles; its back end is the backhead inside the cab. The lashing is its own mesh, clear
  of the barrel; steam from the chimney.
- **Speed** (parked idea, shown for how it would read): a brass stripe down the footplate, a brass band on the
  smokebox, a second dome and a brass chimney ring (B adds brass handrails).
- **Second engine** (parked idea): two fitted engines coupled nose to tail.

**Z-fighting, fixed by construction.** Today's shell (`assets/src/boiler-cart.py`, `train_shell`) has the red cab box
and the dark chassis box both 1.0 m deep at z −1, so their faces share the planes z −1.5 and z −0.5: that is the
flicker the owner saw. In the candidates no two faces facing the same way share a plane; `coplanarFaces` checks every
box and cylinder end, and all three report none (it caught twelve in the first walk-in cab, all fixed).

## What the larger size means in the game

Measured against the layout tests (`test/railway-works-layout.test.ts`, `test/home-station.test.ts`, which grow the
engine alone and keep the 0.6 m gap behind it) run at each candidate's frame length, and against
[home-station](home-station.md)'s clearance table and [place](../game-design/place.md)'s gate measurements.

| | A (1.33× long) | B (1.77× long) | C (1.60× long) |
| --- | --- | --- | --- |
| Train front at every stop | 1.0 m further on | 2.31 m further on | 1.8 m further on |
| Home station island deck | fits (tests pass) | **line 1's train runs off the island's deck** | **line 1's train runs off the island's deck** |
| Pier halt, clear of the parked track layer (1 m wanted) | fits (tests pass) | **0.39 m** | **0.90 m** |
| Older halts (roofs 1.95 m out, decks 20–24 m) | fits: up to 1.5× is measured clear | past the measured 1.5× | past the measured 1.5× |
| Halt deck edge (1.65 m from the track) | steps 0.49 m clear | 0.45 m clear | 0.48 m clear |
| Quarry and sea gates (headstock 5.9 m, chains 2.77 m out) | roof 2.6 m under it, chains 1.6 m clear | 2.6 m, 1.6 m | 2.7 m, 1.6 m |
| A rider standing on the cab roof | 5.0 m with the collider: 0.9 m under the headstock; **0.4 m into Home's canopy** (4.6 m) | same | 4.9 m: **0.3 m into the canopy** |
| Trestles and bridges | the trestles are 3.6 m open decks with nothing overhead; there are no tunnels on either line, and the gorge footbridges pass under the trestle, not over a line | same | same |
| Home's stall door (3.6 × 4.0 m) and the 9.6 m table | fit | fit (table 1.6× its length) | fit |

**Height.** The gate measurements and Home's canopy were sized for an engine up to 1.5× today's height (3.1 m). All
three cab roofs are taller (3.17–3.30 m), so the measured clearances above shrink by up to 0.2 m; the trains
themselves still pass everything. Only a player standing on the cab roof meets something: Home's canopy, and a jump
there or at the gates.

**The collider.** Today the engine is one solid box (`LOCO`: 1.6 × 3.0 m, its top 1.75 m, the boiler top you can
ride), shared with the classic wagon prototype. A cab Buddy walks into needs the engine's collider to become a
compound: the footplate and cab floor, three cab walls with the two doorways, the roof, the boiler. It is a client
platform (`src/physics/platforms.ts`), not simulation state. `LOCO` would split from the wagon prototype's size, and
walking about inside a moving cab (the train runs at up to 30 m/s) needs its own feel check. Whether the roof is a
place to stand is a call for the build (see the canopy above).

**WORLD_NS and layout.**

- **A**: no `WORLD_NS` bump and no layout change. `LOCO` and `TRAIN_OFFSETS` are client constants (`src/proto/wagon/
  cars.ts`, read by the views and the layout tests, not by `src/sim` or the server); the stops stay where they are and
  the front of the train moves 1.0 m further on, inside what the tests allow. A mixed-builds note: old and new clients
  would draw the train at different lengths for a moment, nothing more.
- **B and C**: a **layout change** at Home station (the island deck, or line 1's stop moved back) and at the Pier
  (the stop or the parked track layer moved, for the 1 m), and the older halts re-measured past 1.5×. Moving a stop is
  a constant in `src/sim/railway-train.ts`: a mixed-builds change for the trains' positions and a planned reset if a
  saved train can stand where the new stop no longer fits. No save shape changes, so no `WORLD_NS` bump on its own;
  the orchestrator decides with the Home station work.

## Recommendation

**A, the stubby toy**, with B's red valance and pony truck as optional detail: it is the only candidate that holds
Buddy in its cab and still fits every halt and test unchanged, and its big separate boiler makes the fit read at a
glance. The cab taller than its chimney is the price of fitting Buddy at this size.

## Open questions for the owner

1. Which candidate (A, B or C), or which parts of each?
2. The cab now stands above the chimney. Keep it, or accept a cab roof lower than Buddy's collider (he would duck,
   or the camera would)?

The previz images are in the handover, not in the repo (`.look/engine-previz-cab/`).

Not tested on a device.
