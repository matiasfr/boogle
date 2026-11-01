# Island layout: options for eras 1–2, and a rough archipelago

*Proposal, 1 November 2026. Draft options for the director to react to; nothing here is decided until
[boogle-2.md](boogle-2.md) says so. Serves DESIGN.md 7 (telegraph everything) and 8 (designed for drop-in), and the
owner's "solo first".*

## The tools

- **The lab** (interactive, private to the owner): https://claude.ai/artifact/BQuFyGfrXwuzSm9KeKq1fT. Home scale:
  the real 2 m heightmap with shading and contours; drag the rail stations, the lighthouse and the windmill farm (their
  hills and fields move with them); section lengths and wagon ride times from `wagonAt`'s timetable; sprint-time rings
  from any spot; the ground you can't see from spawn. Archipelago scale: placeholder islands, fog rings, sight lines
  from spawn and the order connections reach them. Options side by side with Pick buttons, and **Copy layout**. Its
  picks and edits live in the browser under `boogle-layout-v1`; keep that key.
- **Export:** `node dev/layout/export.ts` writes `.look/layout/island.json` (the heightmap without the movable POIs,
  each POI's footprint, ROUTE, palms, spawn, court, run speeds, wagon timings, fog). The lab inlines it; re-run it and
  rebuild the lab when the island changes.
- **Walk it:** `?room=proto-layout&layout=east-bay` loads [dev/layouts/east-bay.json](../../dev/layouts/east-bay.json)
  and moves the lighthouse, the windmill farm and the three wood-age sections there, in greybox. A tag in the corner
  names the layout. Without the flag nothing changes.

### How `?layout=` stays safe ([src/island/layout.ts](../../src/island/layout.ts))

1. POI sites are moved before the terrain is built, in place, so their content modules see the new spot.
2. ROUTE positions are moved in place. The rules read a section's age and the section count, never its position, so
   hashes and saves are unchanged; `wagonAt` now builds its line on first use, after the move.
3. The land the rules run on (palm cells, the frisbee perch) is pinned to `src/world/home-land.json`, as the server
   has it ([src/features/walk-layout.ts](../../src/features/walk-layout.ts)), so a moved POI can't move a log source.
4. Spawn, the court and the garden never move (HOME_KEEP). Only the first three sections (era 1) apply in the game;
   era 2 sections and islands are for the lab.
5. No server change; any room works, but a `proto-` room keeps the real island's save out of it.

## What the numbers say

The home island is small: sprinting, everything on it is within about 10 s of spawn, and the eighth-nearest palm to
any era 1 site is 3 to 5 s away in every option. Haul distance doesn't separate the options; sight lines and what the
line points at do. The wagon (3 m/s, 3 s to speed up, 6 s at each stop) takes 7 to 9 s per 12–18 m section.

| | As built | A. Lighthouse line | B. West cove line | C. East bay line |
|---|---|---|---|---|
| Stations seen from spawn (2.5 m sign) | 4 of 4 | 7 of 7 | 3 of 6 | 7 of 7 |
| Longest era 1 haul (8th-nearest palm) | 3 s | 3 s | 3 s | 5 s |
| Ride, era 1 / eras 1–2, end to end | 39 s | 39 / 88 s | 39 / 70 s | 37 / 78 s |
| Era 2 crosses water | — | no | 11 m trestle | 16 m causeway |
| First new island (Mine Isle), coast from spawn | — | 279 m | 292 m | 254 m |

## The options

### A. Lighthouse line (as built, extended)

Era 1 is ROUTE as built: court to the lighthouse foot, straight up the middle. Era 2 carries on east over the plain to
the windmill farm. Mine Isle lies off the north-east coast.

- **7:** the tower is the goal you see from the court, and every station is in view. But the line never meets the
  sea, so era 2's payoff is "more track", and nothing points at Mine Isle.
- **8:** a newcomer at spawn sees the first site at once.
- **Solo:** no new work at all; the cheapest to playtest.

### B. West cove line

Era 1 climbs west over home's hill to the cove; era 2 crosses it on a trestle to the west point, and the lighthouse
moves out there as the beacon across the water.

- **7:** a bridge payoff in miniature, but home's hill hides half the stations from spawn: you can't watch the work
  from where you land.
- **8:** worst of the three for a drop-in; the work happens behind a hill.

### C. East bay line (recommended)

Era 1 leaves the court along the garden's south edge and turns up the east shore to the bay. Era 2 crosses the bay
mouth on a 16 m causeway to the windmill farm (nudged 8 m south-east), and the causeway points straight at
Mine Isle, 254 m across the water. Lighthouse unchanged, still the landmark in the middle.

- **7:** every station is in sight of spawn and the wagon runs along the shore against the sea. Each era's payoff is a
  crossing you could see before it was built: the bay in era 2, Mine Isle in era 3. The era 2 causeway rehearses the
  archipelago's rule ("see it across the water, then reach it") on home, at small scale.
- **8:** the first site is 15 m from the court; you land and see the work.
- **Solo:** hauls stay under 5 s, so one person can lay a section alone.
- **Costs:** station 0 sits at the garden's corner (nudge it 2 m south); the era 2 causeway needs a water-crossing
  piece the rails don't have yet.

Walked in greybox (`?layout=east-bay`): from the court the Section 1 sign stands just past the stall, the next two
signs run up the beach, and the windmills sit across the bay. Stills: `npm run look -- --cam 14,16,38 --look 44,1,-6`
with `BOOGLE_QUERY=layout=east-bay`.

## The archipelago (rough, the same in every option)

Placeholders to argue about, not a map. Distances from spawn; fog starts at 110 m and closes at 520 m
(`FOG_NEAR`, `FOG_FAR`).

| Era | Island | Link | From | Coast from spawn (C) |
|---|---|---|---|---|
| 3 | Mine Isle | iron trestle, ~140 m | home | 254 m, in view, hazy |
| 4 | Gary's Yard | steel bridge, ~145 m | Mine Isle | 374 m, in view, hazy |
| 5 | Melon Isle | concrete causeway, ~210 m | home | 357 m, in view, hazy |
| 6 | Outer Isles | electric viaduct, ~280 m | home | 410 m, in view, hazy |
| 7 | The Flats | reclaimed land | Gary's Yard | 567 m, past the fog |
| 8 | Mainland port city | maglev bridge | The Flats | 976 m, past the fog |

Findings:

- **Eras 3–6 fit inside today's fog** if each island's coast is within about 400 m of spawn: you see the next one
  hazy from the beach, clear from the lighthouse deck.
- **The mainland can't be "visible from the start" with today's fog.** A 650 m city 1.6 km out is past `FOG_FAR`.
  It needs a skyline drawn through the fog (an unfogged silhouette or impostor), or fog that thins toward the north.
  That belongs with the "cheap distant islands" work in
  [boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md).
- **Each link starts where the last era's line ends** (C: the farm's coast faces Mine Isle), so the line itself
  telegraphs the next era.

## Recommendation

C, the east bay line: every station in sight of spawn, the hauls short enough for one person, and each era ending at
a water crossing you could already see. A is the fallback if a water-crossing rail piece is too much for era 2.
