# Curio shelf and finders' bay: placement in the Home town

**Status:** building (10 November 2026): the Recommendation is approved and built on a branch, not yet shipped. Owner,
after a plan-view comparison: "Ok let's commit to A for now. no need for in game stills"
([decision](../decisions.md#decided)). Findings 1 to 4 are fixed with it. Proposal by the designer, 10 November. Owner, playing the live build on 10 November: "the
curio shelves could be positiioned much better in the town, they seem weirdly at angles and not spaced intentionally
with everything else in the town". Judged as a space, per the owner call "A well-designed town, not a view from spawn"
([owner-calls](../agents/owner-calls.md)).

Coordinates are Place-local metres (world x = local x + 1000), north is −z. Bearings are degrees clockwise from north.
A three.js `yaw` turns the piece's front (local +z) to face bearing `180° − yaw`.

## Inventory (origin/main 5a61c9fe)

| Piece | Where it's set | Position (local) | Yaw, faces | Footprint | Stands next to | Collider | Tier |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Curio shelf, live (layout A) | `SHELF`, [layout.ts:450](../../src/place/layout.ts); drawn by [curio-shelf.ts](../../src/entities/town/curio-shelf.ts) | (−90.5, 8.5), ground | −0.87, faces 230° | crown 5.9 × 1.1 m, 3.47 m tall; box collider 5.6 × 0.8 m plus a foot | 5.2 m east of the street's centreline, forge's SW corner 5.0 m, rack 5.6 m, stall outline about 8 m (read off the top-down) | Yes (`addStatic` + `addFoot`), client physics | `src/entities` + `src/proto/place`: normal review |
| Curio shelf, `?home=b` | `SHELF_B`, [home-station.ts:267](../../src/place/home-station.ts) | (−91.45, 13.31), hall floor 18.34 | −1.2217, faces 250° (the station axis) | same | Inside the hall's front, south half, 5 cm behind the front posts | Same | Same |
| Finders' bay | `FINDERS`, [tech-layout.ts:344](../../src/place/tech-layout.ts); frame merged into the shelf's mesh, colliders in curio-shelf.ts:116–123 | (−104, 7), ground | π/2, faces 90° (east, square to the street) | crown 5.9 × 1.1 m, 2.76 m tall; collider 5.6 × 0.8 m plus a foot | West edge of the street, the house's front yard (door at (−110.35, 11.55)), and **on the shore arrival path** | Yes | Same (Place's `gifts.ts` reads `FINDERS` too) |
| Trophy plinth (jump) | [trophy-plinth.ts:37](../../src/entities/railway/trophy-plinth.ts): `FINDERS.x + 1.5` | (−102.5, 7) | none | 1.5 m cap, 1.62 m to the prize | 0.35 m from the arrival path's centreline | Yes (`land.addStatic`) | `src/entities`: normal |
| Missed boxes (≤ 9) | `bayPeg`, curio-shelf.ts:253 | x −101.2 / −100.1 / −99.0, z 7 ± 1.1 | none | about 3.3 × 3.3 m block | **In the junction where the arrival path meets the street**: 0.03 m from the arrival centreline, 0.45 m from the street's | No (Open only) | View only |

Nothing here lives under `src/sim` or `src/world`, and no sim constant reads `SHELF` or `FINDERS`: no `WORLD_NS` bump.

What I looked at: a top-down at q6-done (six boxes waiting), the shore arrival at eye height, the street looking south
from the forge, and the shelf from the street (`.look/curio-top2-still.png`, `curio-arrive-still.png`,
`curio-streetn-still.png`, `curio-shelfface-still.png`). I did not look at `?home=b` or at the proposed positions.

## What's wrong, as a space

1. **The bay stands in the arrival.** The shore path's last leg runs (−105, 3) → (−98, 9) into the street. The bay's
   south end is 0.2 m from its centreline, so the first thing that faces a player coming into town is the bay's dark
   back panel standing across the sand (`curio-arrive-still.png`). Its boxes then sit in the middle of the junction and
   the trophy plinth beside them. That's the clearest "not intentional" read, and it also fails the walk-line rule.
2. **The shelf faces a spot, not the town.** Yaw −0.87 points it at Place's old `SPAWN` (−97, 14): it was aimed for a
   view from spawn. Nothing else in town stands at 230°; the street runs N–S, the forge, rack and stall are square to it.
   From the street it reads as a cabinet dropped at an angle on the grass (`curio-shelfface-still.png`).
3. **The pair don't relate.** Place's fiction is "the bay across the path from the wardrobe". Today they're 14 m apart,
   at 90° and 230°, at different setbacks (5.4 m and 5.2 m from the street but measured from different ends), on
   different z: across the path only in the loosest sense.

## What v24 changes anyway

Home station step 6 makes layout B the only layout. **The shelf moves to `SHELF_B` (owner-decided, 9 November: "move
shelf off north wall") and the stall outline goes; the bay, plinth and boxes don't move** (the plan says so:
"The finders' bay (F2) is 10 m away at (−104, 7) and does not move"). So:

- Don't polish the live shelf beyond a one-number fix. Its real home is `SHELF_B`.
- The bay's problem survives v24: the arrival path and the street don't move. **The bay's fix should be designed for B
  and work in A.**

## Recommendation: one axis, the pair facing each other across the square

In B the town has two axes: the street (N–S) and the station's axis (70°/250°), which runs from the island, through
the hall, out across the square. `SHELF_B` already faces 250° down that axis. Put the bay on **the same line, facing
back up it**: shelf and bay share a centreline across the square, the south street passes between them, and walking
out of the hall you look across at the bay square on.

| Piece | Position (local) | Yaw | How it's derived | Clearances (measured) |
| --- | --- | --- | --- | --- |
| Bay | **(−106.76, 18.88)** | **1.9199** (= `HALL.yaw`, faces 70°) | `axisPoint(toAxis(SHELF_B).a − 16.3, toAxis(SHELF_B).c)`: 16.3 m from the shelf on its centreline (c 5.50) | South path centreline 6.7 m; arrival path 11.2 m; house's SE corner 3.0 m; house door's walk line 4.4 m |
| Boxes | 3 × 3, in the bay's frame: across −1.1 / 0 / +1.1 m, out 1.5 / 2.6 / 3.7 m from its centre | — | Same fill order (middle first) | Nearest to a walk line: 3.8 m from the south path's centreline |
| Trophy plinth | **(−101.78, 17.07)**, 5.3 m out on the bay's centreline | — | Outermost, so it sits on the street's edge where people pass | Cap 2.5 m from the south path's centreline; centre 3.3 m, inside its 4.5 m `NEAR`, so walking the street still plays it |
| Shelf, B | `SHELF_B` unchanged | −1.2217 | Decided | — |
| Shelf, A (until v24) | **(−91.6, 8.5)** | **−π/2** (faces west, square to the street) | Back on the forge's west wall line (x −92), centred where it is now | Street centreline 5.8 m; forge corner 4.5 m; stall outline ≥ 5 m |

Walk-seconds at 5.6 m/s: shelf to bay 2.9 s (today 2.5 s); hall doorway to bay about 3 s.

Before and after, plan view (x east →, z south ↓, numbers are local metres):

```
BEFORE (live, layout A)                                   AFTER (B, with the bay moved)
 z                                                        z
 -4  cottage                 :  st  :    FORGE(-92..-82)   ...as before, north of the square...
  3  ==arrival==============\:  re  :                      3  ==arrival==============\:     :   hall front
  4              BAY▐        \  et  :                      7                          \:     :  /   (-95,6)
  7   HOUSE door→ BAY▐ P ▢▢▢  \ x-98:    ⟋SHELF 230°       9                   square  junction  ⟋ SHELF_B
 10              BAY▐   ▢▢▢    junction    (-90.5,8.5)    13                           :     : ⟋  (-91.4,13.3)
 14                         spawn(-97,14)                 17          ▢▢▢ P(-101.8,17.1)     :     ← one line, c 5.50,
 17                            :      :  STALL outline    19  ⟋BAY 70° ▢▢▢               :       bearing 70°/250°
 21                            :      :  (moves at v24)   21  (-106.8,18.9)              :
                          south street                                            south street
```

Why this reads as intentional: both pieces are square to the station's axis (the hall's front line), they share one
centreline, they're at the same height above the square's ground (bay 2.76 m, shelf 3.47 m on its 0.34 m slab), the
street passes between them as Place's fiction says, and nothing stands in a walk line. In co-op the square between them
is the meeting place: two players can each open their own boxes (they're personal) with room to stand around the plinth.

During A (until v24) the bay at 70° is 20° off the street. It's the one compromise; A's shelf, squared to the street,
faces west at the house rather than at the bay. Acceptable for days; not worth a second A-only bay position.

## Alternative: one finders' corner at the hall's south end (B only)

Bay outside the hall's south end wall, back to it, facing 160° (yaw 0.349), centred on the hall's axis line:
`axisPoint(HALL.a, HALL.c + HALL.w / 2 + 0.65)` ≈ (−87.7, 17.8), boxes in front toward the quiet south side.
**For:** everything curio is at the station, one walk; the hall's south half already holds the works board, so the
record of the room and your record sit together. **Against:** it's inside A's stall outline until v24, so it can't ship
before the flip; it's off every walk line, so the trophy plinth needs its `NEAR` widened or it's a detour; and it loses
"across the path" (shelf and bay back to back, not facing). Recommend the first layout.

## Calls

| Call | Kind | Source or recommendation |
| --- | --- | --- |
| Shelf in B stands in the hall's front, south of the way in, facing the square | Decided | Owner, 9 November: "move shelf off north wall" ([decisions](../decisions.md), Home station B) |
| Judge the town as a space, not from spawn; the A shelf's spawn-facing yaw goes | Decided | Owner, 9 November ([owner-calls](../agents/owner-calls.md), "A well-designed town") |
| Keep Place's "bay across the path from the wardrobe" | Default | Port check (owner call "Port from Place only what still fits"): keep. It pairs what you have with what you missed in one glance and costs nothing; the F2 rule "missed prizes wait at the bay" is already logged open in agent-calls |
| Bay on the shelf's centreline, 16.3 m out, facing 70°: (−106.76, 18.88), yaw 1.9199 | New | Recommend. It sets a rule for Home's furniture: in B, align to the station axis or the street, never to a view. Reversible (two constants) |
| Boxes 3 × 3 centred in front of the bay at 1.5 / 2.6 / 3.7 m, plinth outermost at 5.3 m | Default | Supersedes the orchestrator's "three columns past the plinth" (agent-calls, 9 November), which assumed the bay faced +x |
| Plinth's `NEAR` stays 4.5 m | Default | The new plinth is 3.3 m from the south street's centreline |
| A's shelf until v24: (−91.6, 8.5), yaw −π/2 | Default | One constant; deleted with A at step 6 |
| `SHELF_B`'s 1.4 m gap to the south wall stays, as the side way into the works-board bay | Default | It was sized for the finds board (`SHELF_SIZE.board` 4.35), cut on 9 November; the gap now needs a reason, and this is one. Rename the constant's field when built |
| Folk wander point (−104, 16) moves to (−103, 24) | Default | The old point falls inside the new box block |

## Findings to fix before building

1. **The bay, plinth and boxes are in the arrival path and the junction today** (measured above, and seen). This is the
   owner's complaint at its sharpest and it outlives v24. Fix with the bay move; it doesn't need to wait for step 6.
2. **`bayPeg` and the plinth assume the bay faces +x.** `FX + 1.5 …` and `FZ ± 1.1` are world-axis offsets; any other yaw
   puts the boxes beside the bay. Both must work in the bay's frame. `dev/look/evals/railway-finds.ts:91` has the same
   assumption in its framing.
3. **Stale text:** the decision log's Home station B entry and `home-station.md` (step 3, call 14) still say the shelf
   keeps "its finds board"; agent-calls' call 29 row still says the works board mirrors "the curio shelf on the north
   wall". The board was cut on 9 November.
4. **No check covers this.** `test/railway-works-layout.test.ts` keeps works anchors 2 m off paths, but nothing keeps
   the shelf, bay, plinth or boxes off a path centreline. Add a unit test: every footprint ≥ 2.5 m from each `PATHS`
   and shore-path centreline, and the bay's box block ≥ 3 m.

## What the build touches

- `src/proto/place/home-station.ts`: a production `FINDERS_B` (axis-derived, as `SHELF_B`), and the plinth spot.
- `src/proto/place/tech-layout.ts`: `FINDERS` takes B's value (or curio-shelf reads `FINDERS_B`; Place keeps its own
  until D1 deletes it).
- `src/proto/place/layout.ts`: A's `SHELF` to (−91.6, 8.5, −π/2).
- `src/entities/town/curio-shelf.ts`: `bayPeg` in the bay's frame.
- `src/entities/railway/trophy-plinth.ts`: the plinth's spot from the bay's frame.
- `src/proto/place/folk.ts`: one wander point.
- `dev/look/evals/railway-finds.ts`: framing in the bay's frame. Tests as in finding 4.
- Checks: `npm run look -- --rail-seed q6-done` (top-down and the arrival still above), `?home=b` the same, the finds
  eval's `findsact=bay`, and the production railway bot (`dev/look/bots/railway.ts`) to confirm no route crosses the new
  footprints. Client-side colliders only: normal review tier, no `WORLD_NS` bump, safe mid-session.

## Owner questions

1. **Bay across the square on the station's axis, or at the hall's south end?** Recommended: across the square
   ((−106.8, 18.9), facing the hall). It fixes the arrival now and keeps "across the path".
2. **Square A's shelf to the street now, or leave it until v24?** Recommended: now. It's one constant, and v24 has no date.
