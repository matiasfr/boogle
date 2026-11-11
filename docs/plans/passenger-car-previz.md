> **Status: Four (the knifeboard) built, and picked by the owner on 10 November 2026: "Four seats (built)".** Six is not built; had he picked it,
> the recipe, seats and exits would change; the car's size, the stowaway's rule and the layout tests would not. Decision: "2026-11-10, the passenger car is redesigned with benches" in the
> [decision log](../decisions.md).

# Passenger car previz

The owner, 10 November: "we should redesign the train cart for sitting to accomodate more players, maybe benches
accordingly? even if it's the first passenger car before any upgrades it should look better".

Today each train has one passenger car, the place-kit flatbed with two of the track layer's low stools down the middle
(`train-view.ts`, `seat.ts` `lowStoolMesh`; [place](../game-design/place.md), the train seating paragraph). It seats
two, riders facing across the car, and the stowaway sits on the deck 0.62 m to its owner's right. The cargo car has no
seats and stays as it is.

This is a blockout of primitives in the asset stage, done the way the [engine previz](engine-previz.md) was: two
candidates, each coupled 0.6 m behind the built engine A, by a halt deck, with the real Buddy seated and standing.

## Where to see it

The asset stage (`npm run dev`, then `/character/`), category **previz**: `car-four` and `car-six`. `&carView=halt`
(the first car; every seat but one taken, and that seat's rider on the halt deck beside it, getting on), `upgraded`
(the same with the upgrade), `plan` (from above, every seat and every stowaway) or `plan-upgraded`. For example
`/character/?asset=code:car-four&carView=halt&reference=1&bounds=0&light=production`.

- Real sizes: rails at ±0.5 m, the halt deck's top 0.72 m over the rail line and its edge 1.65 m from the track
  (`halts-view.ts`), the car's deck 0.7 m (`TRAILER`), engine A from its built GLB (`engine_body`, rods, doors,
  boiler, lashing, stool) 0.6 m ahead, the kit's flatbed and wheel.
- The riders are the stage's Buddy: seated ones in the game's seated pose (`Driving_Loop`, played, as a seated player
  is drawn), placed as a seat registration would place them (capsule centre at seat top + 0.63 m, the drawn body
  0.55 m under it, `SEATED_DROP`); the standing one is the stage's reference Buddy. The stowaway is the game's own part list (`cosmetic-parts.ts`, `critter`).
- Code: `character/car-previz-parts.ts` (the part lists, seats, pets and exits, no three.js; `carProblems` checks the
  coplanar rule and that the fittings stay on the deck) and `character/car-previz.ts` (the scenes). The stage gains a
  `stagedBuddy` factory so a preview can place more than one Buddy. The game imports none of it.

## The bench rule

Both cars keep today's flatbed: **3.2 m long, 2.2 m wide, deck top 0.7 m**. The benches use the stool's numbers so the
game's seated pose fits them unchanged: the seat top is **0.32 m over the deck** (`MACHINE_CHAIR_SEAT`), the rider's
capsule centre 0.63 m above it (`SEATED_HIPS`), the anchor 0.1 m behind the seat's front edge, feet on the deck. Seats
are 0.95–1.3 m apart: Buddy is 0.91 m across the arms and his collider 0.9 m. Like today's stools the benches have no
solid; you walk through them and Sit snaps you on.

## The candidates

| | Four · knifeboard | Six · toast rack | Today |
| --- | --- | --- | --- |
| Idea | One back-to-back bench down the middle; two a side, facing out over the halt decks | Three cross benches of two, everyone facing the engine; open sides, you board into a row | Two low stools down the middle |
| Seats | **4** | **6** | 2 |
| Car length / width | 3.2 m / 2.2 m (today's deck); the upgrade's roof 3.55 × 2.55 m | same | 3.2 / 2.2 m |
| Seat spacing | 1.3 m along each side | 1.0 m across, 1.0 m row pitch | 1.6 m |
| The stowaway | **On the bench beside you, 0.62 m to your right**, today's offset at seat height; the bench is long enough for four riders and four pets | **On the deck at your feet**, under the next row's back: there's no room beside a rider (a pet 0.62 m right lands in the next rider or off the deck), and in a lap it hid its rider's chest and face | on the deck, 0.62 m right |
| Getting on at a halt | Step across the 0.55 m gap (the car's deck is 2 cm under the halt's) and sit facing the platform | Step into a row from the side, sit facing forward | the same step, then to a stool in the middle |
| Stand up puts you | 0.4 m out in front of your seat, on the deck by its edge | beside your row at the deck's edge | 0.6 m behind the stool |
| From the halt deck | The near side's riders face you | Riders show their profile | Riders face across |
| Roof top (upgrade) | 2.77 m over the rail (the cab roof is 3.30 m) | 2.77 m | — |
| Draws: first car | deck, frame, fittings: **3** (+ shadows) | **3** | 4: deck, frame, two stools |
| Draws: upgraded | + upgrade (roof, posts, lamps, trim): **4** | **4** | — |
| Triangles: fittings / upgrade | 548 / 432 | 656 / 432 | 120 (two stools) |

The wheels stay in the kit's wheel batch (no new draw). Lamps glowing at night would want an emissive part: one more
material, so one more draw, or a vertex-colour trick in the built mesh.

## The first car and the upgrade

**The first car** (`fit`, one merged vertex-coloured mesh): natural-wood seats, darker wood backs and bench ends, dark
iron legs; at each end of the deck a boarded panel to the knee and an iron-grey rail at hand height between corner
posts with wooden knobs; a board under each side of the deck so the flatbed reads as a coach, not a cart. It is meant
to look finished on its own.

**The upgrade** (shown as one state; it could be split into steps): the same fittings repainted (backs and ends red,
rails and knobs brass, the engine's paint), the corner posts carried up to a red canopy roof with a raised middle and
a cream fringe, two brass lamps hung under it, a brass line along each side board. The roof stands 1.9 m over the deck
(0.2 m over a standing Buddy's collider, the cab's headroom rule) and overhangs the deck by 0.175 m at each end, which
leaves about 0.4 m to the engine's frame.

Possible order along an upgrade path: paint and lamps first (no size change), the roof second.

## Against the halts and the layout tests

**Both candidates are today's length**, so nothing moves: `TRAIN_OFFSETS` and `TRAILER` are unchanged, and
`test/home-station.test.ts` and `test/railway-works-layout.test.ts` pass as they are, with engine A and with the
longer boiler. Measured by running both tests with the passenger car grown (scratch edit of `TRAIN_OFFSETS`, reverted):

| Growth of the passenger car | Engine A | Engine A with the longer boiler |
| --- | --- | --- |
| 0 (both candidates) | passes | passes |
| +0.1 m, forward (the engine moves on) | passes | **Home island: line 1's train runs off the deck** |
| +0.4 m, forward (a roomier six, 3.6 m) | passes (Pier track layer 1.3 m clear) | **off Home's island deck; Pier track layer 0.80 m clear** (1 m wanted) |
| +0.6 m, forward | **off Home's island deck** | fails |
| +0.2 m, backward (the cargo car moves back) | **fails**: the coupled wagon's place (`WAGON_S`, a `src/sim` constant) and Home's spur points | fails |

So a longer car spends the headroom the longer boiler already uses up (the boiler took the train to the last
centimetre of Home's island deck): either the longer boiler or a longer car, unless Home's island or line 1's stop
moves. That is why both candidates stay 3.2 m. Width: the fittings stay inside the deck's 1.1 m half-width (the side
boards 1.14 m), so the 0.51 m to the halt deck's edge is unchanged; the roof's eaves reach 1.275 m, 0.375 m clear of
the halt deck's edge, 2.48 m above the rail. Halt shelters and displays near the edge were not re-measured against
the eaves; the build checks them (and the corners on the tightest curve, where the wider roof closes on the engine).

**Height.** The roof top (2.77 m) is under every gate and canopy the engine already clears. If the roof is a deck you can
stand on, as the engine's is, a player on it stands at 4.47 m with the collider: 0.13 m under Home's canopy (4.6 m). A
roof you can't stand on (no top on its collider) avoids the question.

## Sim, world and sync

**None for either candidate.** Seats stay what they are: client registrations (`seats.registerSeat`) on the car's
platform, claimed through the lead's existing transient grants (Host kind, `placeSeatGrants`), never saved or
simulated. The new seats are new seat ids (`railway:train{k}-1-seat2…5`); old builds aren't supported for seats (the
5 November current-build-only call), so this is not a mixed-builds problem. No `WORLD_NS`, no layout, no wire change.
The stowaway's seated place is view only (Owner presentation): the knifeboard keeps its offset and lifts it to seat
height; the toast rack's place at your feet is a new seated rule in the same view code. The upgrade's state, when it's built, needs an
accepted room fact like the engine's (`trains`), which belongs to that upgrade's own plan.

## Recommendation

**Four, the knifeboard.** It doubles today's seats at today's size, keeps the stowaway rule as it is (beside you, now on
the bench), faces its riders out at the halts where they get on and off, and its single bench reads clearly from the
platform. With a room of one to four players (the campaign's range), one train seats the whole party.

Six seats more, but fits only by giving each rider no room for a pet and packing everyone shoulder to shoulder; a
roomier six needs a longer car, which the halts can't take next to the longer boiler. If the owner wants six, the
toast rack as shown is the one that fits.

## Checks

- `node -e "import('./character/car-previz-parts.ts').then(m => Object.values(m.CARS).forEach(c => console.log(c.id, m.carProblems(c))))"`: no problems for either.
- `npm run check`.
- Stills: the local look harness with `dev/look/evals/asset-stage.ts`, production light, 1280 × 800, stitched 2 × 2
  (first car at the halt, upgraded, the bench close up from the halt deck, the plan from above; and a sheet comparing
  the two). Looking at them caught two things the numbers didn't: the stage's seated Buddy floated 0.55 m over his
  seat until the game's `SEATED_DROP` was applied, and on the toast rack a stowaway in its owner's lap hid his chest
  and face, so it moved to his feet. Not stills: walking on and off (a real-time look belongs to the build), a
  second player's view, any device.

## Build (Four, the default)

- [x] The car's mesh: `assets/src/passenger-car.py` and `.json` (nodes `car_fit` and `car_upgrade`), built to `assets/built/passenger-car.glb`; loaded by `src/proto/place/car-kit.ts`; catalogued in `character/descriptors.ts`.
- [x] Seats: four, registered in `src/entities/railway/train-view.ts` (`railway:train{k}-1-seat0` to `seat3`), the stowaway on the bench via the seat's view-only `perch` (`src/proto/place/seat.ts`).
- [x] Size: still 3.2 m; `TRAIN_OFFSETS`, `TRAILER` and the layout tests unchanged.
- [x] The upgrade is built and switched off (`PASSENGER_CAR_UPGRADED` in `train-view.ts`).
- Look: `dev/look/evals/railway-passenger-car.ts`, real time, board at a halt, sit, ride, stand, walk off.
