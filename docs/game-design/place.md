# 6.28 Prototype: a real place (`?proto=place`)

*A throwaway greybox for [find-the-fun](../plans/find-the-fun.md), step 8: "Having found that place on foot, did you want
to connect it?" After three rounds of `?proto=net`, whose island wasn't in line with the vision and gave nothing to find
or decide, this tests a place, a choice and a real distance. Serves DESIGN.md 1 (Toys before chores) and 9 (Leave
something for the next visitor). Layout: Threefold Reach (`.look/previz/home-redesign/`, section 3). Research:
[big-walk-level-design](../research/big-walk-level-design.md) (sections 5 and 9, recs 5-7 and 10), [compounding
infrastructure](../research/compounding-infrastructure.md) (summary 1, recs 1-2), [level design](../research/level-design.md).
Without the flag nothing loads: `src/features/proto-place.ts` imports `src/proto/place/` only with it, in the room
`proto-place`.*

## The place

An island about 440 m across, 1 km east of today's, in the crossing's sea. A Y-shaped gorge, with walls about 16-30 m high
and a river at the bottom, splits it into three lobes.

- **The village:** low huts on the west lobe at 18 m, where you start.
- **The timber camp:** on the north ridge at 30 m, under a 55 m hill. The quarry: on the east table at 24 m. Each has a
  tall white smoke column you can see from the village.
- **Needle Bell:** a leaning 105 m rock spire with a lookout and an orange vane, on an islet where the gorge forks.
- **Two footbridges:** low, over the river. The north one stands under where the trestle will go.

## The run

1. **See.** You start at the village's edge, with both columns and the spire across the gorge, empty platforms and a row of
   orange stakes pointing the way each line would go.
2. **Walk.** Each route winds along the lobe, down a ramp cut into the wall, over a footbridge and up the far side. It
   passes three gold finds, and one route has a rock arch and a rim lookout, the other an old cart and an arch. No jumps
   needed.
3. **Claim.** At the camp, Interact on the tall flag: **Plant survey stake**. Nothing opens until you've walked there.
4. **Build.** A Track ring and four log bundles appear, the ring at the gorge's rim. **Take logs** gives 8 logs on your back;
   walking into the ring pours them. Each 24 logs (three trips) pays for a segment, of three per link. The machine runs
   from the camp toward the village, taking 7 s per segment: bents rise ahead of it, and the deck and rails follow.
5. **Ride.** When the line reaches the village, the camp wakes piece by piece and two trains run on two tracks, half a
   cycle apart: one each way about every 18 s. You can't walk the trestle; it has no deck to stand on.
6. **Payoff.** Crates hop onto the rear flatbed at the camp and off at the village's heap. Timber changes the village's
   north side (6 crates: halls and a 32 m clock tower; 16: more halls and a water tower). Stone changes its south side (6:
   stone streets and a 48 m keep with a gold crown; 16: more streets and a works stack). Fanfare, fireworks, kept sounds.
7. **Choose again.** The other camp has the same walk and stake. Now a cable runs from the village's heap over the gorge to
   a depot near the ring, and the connected camp's crates slide along it. **Take a load** takes 24 logs in one press.

No counters: the ring's logs, the heaps and the buildings are the readout. Falling is harmless: in the water, Interact reads
**Back up the path**. Trees and most props have no colliders. **The panel** has Start over, Skip the walk (to the next
stake) and Skip the haul (pays one segment).

## Measured

Scripted at iPad size (1366 x 1024) with real input, on a Mac:

| | north | east |
|---|---|---|
| Walk, village to camp, 5.6 m/s | 78.5 s | 79 s |
| Sprint, 9.5 m/s | 46.7 s | 44.8 s |
| Ride, stop to stop | 14.4 s | about 15 s (calculated) |

Door to door by rail, from the village fire to the camp's platform: 27.6 s, with a wait of about 5 s. By the numbers: about 6 s to
the platform, 9 s mean wait (18 s worst) and 14.4 s riding, so about 30 s on average and 38 s at worst.

Hauling, first link (hand): 23, 33 and 31 s per segment; 95 s from stake to open. Second link (depot): 13 s (crates still
arriving), 6 and 6 s; 33 s from stake to open. The whole run takes about 5.5 minutes straight through.

## How it's built

Local, apart from the back bundle. `sites` lays one fixed route in one order, so two links in the order you choose can't
be expressed in it. Which camp you claimed, the trestle, trains, crates and town are this tab's, in localStorage per room.
The back bundle and bundles' charges are the room's: `src.take` on palms moved here through `haulHooks.moved`, and pouring is
`site.stock` into the open Track ring on today's island, unseen, with its cost tuned up to 600. The hard cap is `tune.set`
(8, then 24 once a link is open). Start over is `tune.reset`.

The land is one height function on a 2 m grid, drawn as one faceted mesh and collided as one heightfield; the walls are
near-vertical grid cells. Bridges and platforms are boxes, the spire a cylinder. From the crossing: the sea, sky and far
plane (`src/proto/crossing/sea.ts`, `sky.ts`), the speed put back past the 237 m soft wall, the player's CCD off. Numbers:
`src/proto/place/layout.ts`. Look evals: `dev/look/evals/place.ts`.
