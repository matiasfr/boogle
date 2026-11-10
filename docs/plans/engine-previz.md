> **Status: previz, waiting for the owner (10 November 2026).** Nothing in the game changes. Per the decision "the
> train engine pass starts with a previz the owner approves", the build waits for his answer.

# Train engine previz

The owner, 10 November: "whenever we do the pass on the train engine, send me a previz before we build it, we'll want
to evluate for scale, detail, and upgradability", then "for the engine block out we can use the asset viewier or a
simplified view, doesnt need to be in the game". Codex is out until 12 November, so this is a blockout made of
primitives in the asset stage, not painted concepts. The queue line is "P2, Train engine visual pass" ("it looks a bit
lackluster", and the P3 z-fighting where the red body meets its dark base).

## Where to see it

The asset stage (`npm run dev`, then `/character/`), category **previz**, four entries: `engine-a`, `engine-b`,
`engine-c` and `engine-today`. `&engineView=turn` (the engine alone by a halt deck), `halt` (coupled to the real
flatbed) or `states` (the upgrade states side by side). For example
`/character/?asset=code:engine-a&engineView=halt&reference=1&bounds=0&light=production`.

- Every scene is at the real sizes: rails at ±0.5 m (gauge 1.0 m, `rail.ts`), the halt deck's top 0.72 m over the
  rail line with its near edge 1.65 m from the track's centre (`halts-view.ts`, `lat` 2.9, `hw` 1.25), Buddy standing
  on it, and the real flatbed (`place-kit` `flat_deck`, `flat_black`, `wheel`) coupled 0.6 m behind the engine's frame,
  today's gap (`cars.ts`).
- Same flat palette as the game (`look-kit.ts` red, black, brass; the gold rope), no textures, production lighting.
- Code: `character/engine-previz-parts.ts` (the part lists, no three.js) and `character/engine-previz.ts` (the scenes).
  Inspection only; the game imports neither. No collider, `src/sim`, `src/net`, `src/world` or `server/` change.

## The candidates

| | A · Stubby toy | B · Longer, proper boiler | C · Tank engine | Today |
| --- | --- | --- | --- | --- |
| Idea | Today's footprint, chunkier: two big drivers, a short fat boiler, tall chimney | A proper long boiler with a steam dome, three drivers and a pony truck, red valance | Side tanks either side of a slimmer boiler, coal bunker, cowcatcher | `train_shell` + `boiler` |
| Body (w × l) | 1.6 × 3.0 m | 1.7 × 4.2 m | 1.7 × 3.6 m | 1.6 × 3.0 m |
| Over buffers | 3.5 m | 4.7 m | 4.1 m (4.35 m with the cowcatcher) | 3.2 m |
| Cab roof / boiler top / chimney top | 2.09 / 2.00 / 2.46 m | 2.19 / 2.10 / 2.60 m | 2.09 / 1.82 / 2.36 m | 2.05 / 1.75 / 2.07 m |
| Drivers | 2 per side, r 0.38 m | 3 per side r 0.36 m + pony r 0.24 m | 3 per side, r 0.32 m | 2 per side, r 0.36 m |
| Body triangles | 552 | 576 | 756 | |
| Boiler part triangles | 624 | 664 | 624 | |

Buddy is about 1.2 m tall, so on the deck his head is near the cab roof of every candidate; today's engine is about
his height above the deck.

**Draw calls and triangles per state**, as a built engine would have them: one merged, vertex-coloured mesh per
module, the wheels in the existing kit wheel batch (no new draw). Lashing 588 triangles (two rope rings and a knot),
speed parts 824–888. The steam puffs here are three spheres (672 triangles) standing in for the game's existing
chimney particles, so they cost nothing new.

| State | Modules (draws) | A | B | C |
| --- | --- | --- | --- | --- |
| Old train (base) | body, rods (2) | 576 | 600 | 780 |
| Boiler fitted | + boiler, lashing (4) | 1,788 | 1,852 | 1,992 |
| Speed (parked) | + speed (5) | 2,612 | 2,740 | 2,840 |
| Second engine (parked) | two boiler-fitted engines (8) | 3,576 | 3,704 | 3,984 |

All small: one fitted engine stays under 2,000 triangles in four draws.

## How the upgrades attach

The states come from the plans: [boiler-first-choice](boiler-first-choice.md) (the boiler is the first choice, fitted
at the old train's saddles; the mark is "the gold rope it was hauled on stays lashed round the fitted boiler, two gold
rings and a knot", a few centimetres off the surface) and the [upgrade-choices](../brainstorms/upgrade-choices.md)
parked list ("a second engine per line, then train speed"). Each is a separate mesh on the engine, so a state is which
meshes are shown:

- **Old train**: body only, its red and brass dulled to rust; the two empty brass saddles show where the boiler goes.
  On C the empty slot between the tanks says it most plainly.
- **Boiler fitted**: the boiler is one part (barrel, smokebox, door, chimney, dome), the same part that is hauled on
  the rope and arcs into the saddles; the lashing is its own mesh, 3 cm clear of the barrel; steam from the chimney.
- **Speed** (parked idea, shown for how it would read): a brass stripe down the footplate, a brass band on the
  smokebox, a second dome and a brass chimney ring (B adds brass handrails).
- **Second engine** (parked idea): two fitted engines coupled nose to tail.

**Z-fighting, fixed by construction.** Today's shell (`assets/src/boiler-cart.py`, `train_shell`) has the red cab box
and the dark chassis box both 1.0 m deep at z −1, so their faces share the planes z −1.5 and z −0.5: that is the
flicker the owner saw. In the candidates no two faces facing the same way share a plane: parts either sink 2–8 cm into
each other or stand a few centimetres proud. `coplanarFaces` in `engine-previz-parts.ts` checks every box and cylinder
end; all three candidates report none (it caught four while this was made).

## What it means for the build

- A keeps today's footprint (`LOCO` 0.8 × 1.5), so `TRAIN_OFFSETS`, the halts' stop marks and the layout test stay as
  they are; only `LOCO.top` (the rideable boiler top, 1.75 m today) would rise to about 2.0 m with the bigger boiler.
- B and C are longer: `LOCO.hz` and `TRAIN_OFFSETS` change, which moves where trains stand at every halt and the
  checks in `test/railway-works-layout.test.ts`.
- C's boiler sits low between the tanks, so the fit shows less from the side once it is in (only the dome, chimney
  and lashing rise above the tanks), though the missing boiler reads best of the three before it.
- All three need a recipe in `assets/src/` (the asset-author skill), front/side/back reference sheets and the close-ups
  the owner call "Previz before modelling" asks for, after he picks.

## Recommendation

**A, the stubby toy**, with B's red valance and pony truck as optional detail: it fixes "lackluster" and the
z-fighting at today's footprint, so no stop, collider or layout moves, and its big separate boiler makes the fit read
at a glance.

## Open question for the owner

Which candidate (A, B or C), or which parts of each? The previz images are in the handover, not in the repo
(`.look/engine-previz/`).

Not tested on a device.
