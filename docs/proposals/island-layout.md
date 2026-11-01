# Island layout: options for eras 1–2, and a rough archipelago

*Proposal, 1 November 2026. Draft options for the director to react to; nothing here is decided until
[boogle-2.md](boogle-2.md) says so. Serves DESIGN.md 7 (telegraph everything) and 8 (designed for drop-in), and the
owner's "solo first". "Rec n" cites the numbered recommendations in
[level-design.md](../research/level-design.md), "What this means for Boogle".*

## The tools

- **The lab** (interactive, private to the owner): https://claude.ai/artifact/BQuFyGfrXwuzSm9KeKq1fT. Home scale:
  the real 2 m heightmap with shading and contours; drag the rail stations, the lighthouse and the windmill farm (their
  hills and fields move with them); section lengths and wagon ride times from `wagonAt`'s timetable; walk-second rings
  at 5, 8, 10, 15 and 25 s (recs 1, 2, 7) from any spot; the ground you can't see from spawn; and a **Research checks**
  panel that tests the layout against recs 2, 5–10, 11 and 16. Archipelago scale: placeholder islands, fog rings,
  sight lines from spawn and the order connections reach them. Options side by side with Pick buttons, and **Copy
  layout**. Picks and edits live in the browser under `boogle-layout-v1`; keep that key.
- **Export:** `node dev/layout/export.ts` writes `.look/layout/island.json` (the heightmap without the movable POIs,
  each POI's footprint, ROUTE, palms, spawn, court, run speeds, wagon timings, fog). The lab inlines it.
- **Walk it:** `?room=proto-layout&layout=lighthouse-line` loads
  [dev/layouts/lighthouse-line.json](../../dev/layouts/lighthouse-line.json) and moves the lighthouse, the windmill
  farm and the three wood-age sections there, in greybox, with a tag naming the layout. Without the flag nothing
  changes.

### How `?layout=` stays safe ([src/island/layout.ts](../../src/island/layout.ts))

1. POI sites are moved before the terrain is built, in place, so their content modules see the new spot.
2. ROUTE positions are moved in place. The rules read a section's age and the section count, never its position, so
   hashes and saves are unchanged; `wagonAt` builds its line on first use, after the move.
3. The land the rules run on (palm cells, the frisbee perch) is pinned to `src/world/home-land.json`, as the server
   has it ([src/features/walk-layout.ts](../../src/features/walk-layout.ts)), so a moved POI can't move a log source.
4. Spawn, the court and the garden never move (HOME_KEEP). Only the first three sections (era 1) apply in the game;
   era 2 sections and islands are for the lab.
5. No server change; any room works, but a `proto-` room keeps the real island's save out of it.

## What the numbers say

All times are walk-seconds at 5.6 m/s (rec 1). Home is small: every option keeps everything within 25 s of spawn
(rec 2), and the eighth-nearest palm to any era 1 site is 4 to 8 s away, so haul distance doesn't separate them. What
separates them is where the line runs and what it points at.

| | As built | A. Lighthouse line | B. West cove line | C. East bay line |
|---|---|---|---|---|
| Research checks passed | 5 of 9 | 8 of 9 | 5 of 9 | 8 of 9 |
| First station from spawn (rec 7: ≤ 10 s) | 4 s | 5 s | 3 s | 3 s |
| Era 1 line from the court's centre (rec 8: 20–40 m) | 15 m | 23 m | 11 m | 20 m |
| Era 1 stations seen from spawn (recs 6, 8) | 4 of 4 | 4 of 4 | 2 of 4 | 4 of 4 |
| Line ends on a shore facing the next island (rec 9) | no | yes, 21° off | no, inland | yes, 18° off |
| Mine Isle off home's shore (rec 10: 150–300 m) | — | 157 m | 165 m | 162 m |
| Fills the empty walk to the lighthouse (rec 3) | yes | yes | no | no |
| Ride, era 1 / eras 1–2, end to end | 39 s | 36 / 129 s | 39 / 70 s | 34 / 76 s |
| Era 2 crosses water | — | no | 11 m trestle | 16 m causeway |

The one check every option misses is the mainland (recs 5, 6, 11): see the archipelago below.

## The options

### A. Lighthouse line, with a bay-shore era 2 (recommended)

Era 1 is ROUTE as built, with station 0 moved 8 m north, 23 m from the court: up the middle to the lighthouse foot.
Era 2 turns east along the bay's north shore, past the windmill farm, and ends on the east shore aimed at Mine Isle.

- **Recs 3, 5, 8:** the line fills the 15 s empty walk to the lighthouse that the 29 October playtest felt, and it ends
  at home's weenie, as rec 8 describes the line ("heads to the lighthouse and stays in view").
- **Recs 9, 10:** era 2's last section ends on a shore 21° off Mine Isle, 157 m away, so the next era's trestle
  continues the line.
- **Rec 14:** era 1 barely moves from what's built, so home stays learned.
- **Solo:** era 1 hauls are 4–5 s; era 2's far sites are 11–17 s from the nearest palms, so era 2 wants the wagon to
  carry freight (rec 15) or new sources out east.
- **Weakness, seen in the stills:** from the court the line runs straight away from you, so the three signs stack into
  one cluster under the lighthouse. Rec 8 asks for trains passing *through* the view. Worth testing station 0 further
  east (about (20, 0)) so the first section angles across the view.

### B. West cove line

Era 1 climbs west over home's hill to the cove; era 2 crosses it on a trestle to the west point, where the lighthouse
moves.

- Misses recs 6 and 8: home's hill hides half the stations from spawn, and the line crowds the court (11 m).
- Misses rec 9: the line ends inland. Kept as the contrast.

### C. East bay line

Era 1 leaves the court's east side along the beach to the east bay; era 2 crosses the bay mouth on a 16 m causeway to
the windmill farm (nudged 8 m south-east) and ends aimed at Mine Isle, 162 m off.

- **Recs 8, 9:** the line runs across the view from the court, beside the sea, and every era ends at a crossing you
  could see before it was built: the bay in era 2, Mine Isle in era 3.
- **Misses rec 3:** the walk to the lighthouse stays empty, and the line doesn't lead to the weenie.
- **Costs:** the era 2 causeway needs a water-crossing rail piece the rails don't have yet.

### Walked in greybox

- `.look/court-lighthouse-line-eye-still.png` (A, eye level at the court): the Section 1 sign stands straight ahead
  under the lighthouse; the line reads as a goal, but the later signs hide behind the first.
- `.look/court-lighthouse-line-still.png` (A, above the court): the three sites climb in a straight row to the
  lighthouse hill, windmills off to the right.
- `.look/court-eastbay-high-still.png` (C, above the court): the sites run up the beach east of the garden with the
  sea beside them and the windmill farm across the bay.

## The archipelago (rough)

Placeholders to argue about, not a map. Distances from spawn; fog starts at 110 m and closes at 520 m
(`FOG_NEAR`, `FOG_FAR`). Positions for A and C (B mirrors them west).

| Era | Island | Link | From | From spawn |
|---|---|---|---|---|
| 3 | Mine Isle | iron trestle, ~160 m | home's east shore | in view, hazy |
| 4 | Gary's Yard | steel bridge, ~145 m | Mine Isle | in view, hazy |
| 5 | Melon Isle | concrete causeway | home's north shore | past the fog |
| 6 | Outer Isles | electric viaduct | home's west shore | past the fog |
| 7 | The Flats | reclaimed land | Gary's Yard | past the fog |
| 8 | Mainland port city | maglev bridge | The Flats | coast 976 m, past the fog |

Findings:

- **Rec 10 and the fog agree:** an island 150–300 m off home's shore sits 250–400 m from spawn, inside the 520 m fog,
  hazy from the beach and clear from the lighthouse deck.
- **Rec 16 (one or two unreached islands in view):** with eras 3–6 all near home, four islands were in view at once.
  Here eras 5–6 sit past the fog; they could also rise out of the sea with their era, as boogle-2.md has new islands
  doing.
- **Recs 5, 6, 11 (the mainland as the global landmark, seen from spawn):** no placement fixes this. A 650 m city
  1.6 km out is past `FOG_FAR`, so it needs a skyline drawn through the fog (an unfogged, exaggerated silhouette or
  impostor), which belongs with "cheap distant islands" in
  [boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md).
- **Rec 15:** the later islands are sized for the vehicle that reaches them; the lab shows radii, not content.

## Recommendation

A, the lighthouse line with a bay-shore era 2: it is the line rec 8 describes, fills home's emptiest walk (rec 3),
ends era 2 on a shore aimed at Mine Isle 157 m off (recs 9, 10) and keeps era 1 almost as built (rec 14). Test it
with station 0 angled across the court's view; take C if a water crossing in era 2 matters more than the lighthouse
walk.
