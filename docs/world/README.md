# Connected world study

Open [world-map.html](world-map.html) directly, or serve it at `/docs/world/world-map.html` with the existing local Vite server. It is an offline, self-contained SVG planning page; it imports no game code and makes no network requests. The coordinator can publish the file as a Claude Artifact without adding dependencies. It deliberately omits document wrapper tags.

The owner’s **6 November: Visualize in 2D HTML first** call authorizes this study. Review it with the owner before turning its proposed content into an in-game greybox. It serves DESIGN.md’s **Understandable at a glance**, **Telegraph everything** and **Show, don’t tell**. It changes no player-facing game behavior, so the as-built game-design chapters remain unchanged.

## Read the map

- **Whole world, version 2:** Line 1 → Split-rock Works at the existing quarry `(98,52)` → Ring Island at the existing FAR anchor `(330,-1120)` → High Gorge **or** Canopy Town → inhabited port → Original Island. High Gorge is the default later hypothesis; the selector substitutes Canopy and removes the copper-lift dependency. All new jobs, footprints and links remain proposals.
- **Earlier proposal:** switches the proposed geography, links, gates, upgrades and selector records to the older Chalksound → Kiln Harbour → Suspended Coast → High Port spine. Current source geometry and the roundhouse remain shared. This is a comparison layer, not two cumulative campaigns. Historical eras are available only in that comparison. Turning it off restores version 2 and the chosen Gorge/Canopy alternative.
- **Home island:** the complete current Place slice, including Far Head and the pier. **T1 → T3** frames the opening at a closer scale.
- Drag to pan; wheel, pinch or buttons zoom; arrow keys pan when the SVG is focused. Reset returns to the selected preset. Tap or focus a marker/line and press Enter for details; the selector provides every record even when labels collide or a layer is hidden. Hover gives a brief name/status; selection gives the full details.
- Layer switches show terrain height zones, rails/walks, gates, ability dependencies and the earlier proposal’s historical era themes. Ability links describe access relationships, not validated jumps or flights. Local views show the proposed Works shipments and off-line roundhouse spur; other proposed links appear only when selected. The whole-world view shows the active proposal and one later alternative, never both mandatory routes.
- Solid, dashed and dotted outlines distinguish **exists**, **planned** and **proposed**; text repeats status. Rail paths use rust, walking paths sand and ability paths purple. Proposed main rail paths are dashed; optional links are lighter and dotted. Thin leaders attach displaced labels to their actual positions. Terrain bands are sampled at 0, 10, 24 and 40 m elevation.

“Exists” means authored geometry or behavior in this checkout, not completed construction in a live room. The cove is the shore of the default terrain. The FAR shard is existing scenery; Ring Island’s walkable landing and steel works are proposed. Prototype jump/hook/glide markers and Q gates do **not** establish T3 production entitlements. Split-rock Works requires starter movement only; optional later ability routes need an entitlement audit.

The roundhouse keeps the map’s proposed site `(-144,-66)` and 34 m footprint; the research supplies no surveyed site. Its smallest first proof is one **off-line** turntable, two snap positions, one engine, one wagon, one free guaranteed fitting, one existing connected route and one visible delivery consequence. Normal service keeps running; seed the route only in an isolated test. No purchase UI, new resources or fleet scarcity. Compare the same ride before/after; a two-profile choice waits until the physical workshop earns it. The original island’s redesign and placement remain proposed, distinct from classic geometry and from the starter.

## One editable data block

The first script, `#world-data`, is strict JSON. Edit it as data; renderer code follows the page markup. Read/copy the block from the repository file when iterating. There is no download button or browser export handler: downloads do not work in the published Artifact. Browser interactions do not persist edits or write back to the repository.

| Field                                                 | Contract                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`, `date`, `sourceCommit`, `sourceHashes`     | Snapshot provenance. Refresh when re-extracting source, not merely moving a proposed island. Hashes cover six geometry source files, not every transitive dependency.                                                                                                            |
| `proposalSources`, record `proposal`, record `branch` | Source paths distinguish the singular newer report from the plural older report. `proposal` is `primary` or `earlier`; omitted means shared. `branch` is `gorge` or `canopy`; omitted means either alternative. Filter every shape, route, detail option and total consistently. |
| `units`, `axes`, `origin`                             | One unit is one metre. Arrays use `[x,z]`, with north at negative z. Coordinates are Place-local. Current game placement adds `origin.x=1000`, `origin.z=0`.                                                                                                                     |
| `views`                                               | `[minX,minZ,width,height]` camera presets. They never rescale geography.                                                                                                                                                                                                         |
| `terrain`                                             | Derived SVG contours for the **default** terrain’s sampled 2 m grid. Each occupied cell uses its lower-left height; shoreline uncertainty is up to a cell diagonal. These are visualization data, not greybox collision.                                                         |
| `places`                                              | Stable `id`, `name`, `at`, `status`, `description`, `source`. `scale` is `world`, `local` (default), or `both`. `labelAt` changes the label only. `radii` are future elliptical footprint assumptions; `radius`, `bounds`, `footprint` describe local reference geometry.        |
| `lines`                                               | Stable ID, name, status, `kind` (`rail`/`foot`), `points`, description and source. Future links also have `from`, `to`, `material`, `optional`, speed and acceleration. Endpoints must match their named places.                                                                 |
| `gates`                                               | Position, status and plain `requires` text. These are dependency notes, not executable conditions or shared game state.                                                                                                                                                          |
| `abilities`                                           | Acquisition position and `routes` polylines showing routes/dependencies opened. Current unlock positions are extracted; later upgrade placements are proposals.                                                                                                                  |

When moving a place, move all attached line endpoints and related gates/ability routes explicitly. Length and timing recompute from future route polylines. Keep stable IDs so later exports and review notes can refer to the same place. A label collision hides only its text; markers and the selector remain available.

For existing lines, `points` are all 1 m samples from `LINES.north/east`, and `length` retains the source’s declared arc length (221 / 743 m). Do not drag or stretch these to fit a composition. Stations are the actual construction-frame positions from `frameBesideLine`, including the rebased main’s **7.5 m** offset, converted to Place-local coordinates. T1/T2/T3 attachments remain s=191/150/116 m. Version 2 refreshes the shifted jump device and all source hashes/terrain data too. Town radius, forge footprint, turntable, paths and headland anchors come from `layout.ts`. Cove bounds come from `cove.ts`; its center is only a region label.

`showLocal` retains a proposed line in close views; `water:false` avoids claiming an on-land route requires a sea deck. The Works shipment overlays reuse sampled Line 2 geometry with provisional loading connectors; they are not additional parallel railways. `labelAtWorld` places a distant-view label without moving the underlying place. `compactName` abbreviates text only.

## Refresh current geometry

Start with `npm run map -- src/proto/place` and the applicable AGENTS routes. Read the relevant exported tables and current as-built chapter. Source is authoritative over this snapshot. An offline Node inspection can import the data owners directly:

```sh
node --input-type=module -e "const l = await import('./src/proto/place/layout.ts'); const t = await import('./src/proto/place/tech-layout.ts'); console.log(JSON.stringify({origin:l.ORIGIN,lines:l.LINES,links:l.LINKS,paths:l.PATHS,forge:l.FORGE,devices:t.DEVICES,gates:t.GATES},null,2))"
```

Convert Float32Array samples to ordinary `[x,z]` arrays; preserve every sample and round only at serialization (this snapshot uses 0.001 m). Read each frame through `frameBesideLine(station, line, dir)` and subtract ORIGIN. Preserve foot-path heights while calculating length, even though the map stores only the top-down projection. Take `SHORE_PATH` from `shore-layout.ts` and the acquisition points from `DEVICES` in `tech-layout.ts`; do not infer them from the old six-era schedule.

To regenerate terrain contours, import `terrain.ts` with its default Node query. For each threshold 0/10/24/40 m, mark cells whose lower-left `heights[at(i,j)]` sample reaches the threshold. Emit clockwise boundary edges only where an adjacent cell is outside, join them into closed rings, remove collinear vertices and convert grid indices with `cellX/cellZ`. Store the resulting SVG path using even-odd fill. This preserves holes and gorge branches without tracing a screenshot. The cove reshapes the shore, so contours extracted before 6 November predate it; the cove is annotated separately from `cove.ts`. Refresh source SHA-256 hashes and `sourceCommit` together with all derived records.

## Travel estimates

Foot time is route length / **5.6 m/s**, a planning assumption from island-layout/vast-world-scale research, not a newly verified player-speed contract. Authored footpath lengths include elevation; rail and future links use plan distance. Slopes, carry penalties, rests and local detours are omitted. Future water links have a walking estimate **only after a walkable deck is built**. Unbuilt-water access is explicitly unresolved; no ferry, swimming requirement or teleport is assumed.

Train time uses a rest-to-rest trapezoidal/triangular estimate:

```text
if D >= v²/a: T = D/v + v/a
otherwise:   T = 2 sqrt(D/a)
```

Current tuning is 20 m/s, 3.5 m/s², 5 s dwell, from `TUNE`. Current Line 1 passenger endpoints are s=14 and s=207, not its full 221 m geometry. Line 2 stops at s=17,174,524; the remaining pier is not passenger service. Its time includes one intermediate dwell. Future speeds (20–50 m/s) and acceleration (3 m/s²) are hypotheses; intermediate stops are not authored. Waiting, access walks, transfers, curves, congestion and service frequency are omitted. Consequently these are useful scale comparisons, **not a working timetable or door-to-door promises**.

The primary first sea route is about **751 m** from the existing pier to the horizon anchor (the drawn bend adds less than a metre). Do not stretch the map to the older 1.2 km test. The earlier proposal retains its approximately 1.25 km Chalksound crossing for comparison. All later positions, speeds and longer routes remain hypotheses. Timings are per selected link, not a whole itinerary through gates.

## Research and authority

Read [DESIGN](../../DESIGN.md), the [current decision index](../proposals/boogle-2.md#current-decision-index) and applicable [owner calls](../agents/owner-calls.md). In particular:

- Materials replace global eras; abilities are iteratively upgraded. The hook remains a pull, not a swing. Main-area components improve several systems; smaller places hold discovery and abilities.
- [Next destination](../research/next-destination.md): version 2 begins after Line 1, reuses the reachable quarry, then combines the first overseas horizon payoff with steel production on Ring Island. High Gorge and Canopy Town are substitutes. The first two shipments fund a Home ramp and near-shore deck. No crystal commodity is required. Later positions are map proposals, not coordinates from the report.
- [Next destinations](../research/next-destinations.md): the older after-the-pier spine is retained only under Earlier proposal. Its extra islands, crystal support, upgrade sites and return links do not enter the primary route’s dependencies or totals.
- [Roundhouse trains](../research/roundhouse-trains.md#recommended-smallest-first-build): the minimum workshop proof and its limits; the existing proposed map site is not presented as a research-specified coordinate.
- [Rail network depth](../research/rail-network-depth.md): Reef Junction and the Home shortcut make the choice between a new source and an improved repeat journey inspectable. Safe pockets, passing loops and automatic service remain proposals; the schematic does not demonstrate conflict-free operations.
- [Vast world scale](../research/vast-world-scale.md): scale and timing assumptions, qualified by the later 1.2 km / 20 m/s owner baseline.
- [Island layout](../proposals/island-layout.md), [six eras](../proposals/six-eras.md) and [progression paths](../proposals/progression-paths.md): historical studies. Their older lighthouse starter, miniature crossings, era locks, discovery quotas and ferries are not carried forward as requirements. Two-Bay Weave remains a working topology reference. Its old island names are not silently added as extra content or asserted to be aliases for the newer destinations. The era toggle is a historical thematic comparison only.

## Later in-game greybox

1. Review first access, destination size, number of authored experiences, optional branches and longest rides with the owner in this page. Decide the actual roundhouse site and future links. Record accepted choices in the existing decision log; changing a JSON status is not approval.
2. In a separately authorized task, export the accepted subset to a typed, versioned level-data module through Boogle’s existing TypeScript-authored level workflow. Preserve stable IDs, metre coordinates and source provenance. Add elevation profiles, coast polygons/heightfields, deck widths, gradients, safe arrivals, material supply sites and playable route bounds: the 2D file is intentionally insufficient to generate walkable terrain automatically. Reuse the current Home source rather than exporting its sampled display contours as a second geometry authority.
3. Map proposed lines to existing rail and path builders and gates to the owning progression system. Decide persistence/state ownership with the relevant AGENTS routes before introducing game state. This HTML’s UI is entirely Local, and its dependency strings must not become executable game rules. No scheduler, cargo simulation or save format is selected here.
4. Use existing level checks and broker captures, then solo/co-op playtests on the resulting greybox. Verify traversability, approach supplies, dry landings, ability ranges, rail stop access and actual ride timing. Keep content provisional until the owner judges the connected experience.

## Validation and scope

Format just these files with `npx prettier --write docs/world/world-map.html docs/world/README.md`, then run `npm run check`. Review the page at desktop and 400 px width, in light and dark mode; exercise layers, selectors, pan/zoom and reset. Browser evidence must use the already-running broker. A same-origin iframe can show this documentation page in a trusted `look --action` capture while the harness retains its game-health checks; this is document UI evidence, not a gameplay bot result. Do not launch a separate Chromium or change the harness.

No game mechanics, game map UI, state ownership, lockstep math, assets or network behavior change in this task. Version 1 used cached refs because its brief permitted only local-server network access. For version 2, the owner explicitly requested fetching and rebasing onto `origin/main`; both completed cleanly before the reconciliation, and the geometry snapshot was refreshed. No push or ship is authorized.

## Roundhouse first layout

[Roundhouse layout](roundhouse-layout.html) is the bounded 2D proof at `(-144, -66)`:
0° connects the fitting bay; −45° connects a proposed spur to Line 1. Line 2 remains
accessible through the existing town junction. The workshop never replaces that
junction. Toggle the one free wagon fitting to compare a seeded 32-unit timber
ramp kit: 24 + 8 in two trips versus 32 in one. These are research assumptions,
not today's eight-crate Place capacity or a new campaign bill.

The first `#layout-data` JSON block owns metre geometry, dimensions, views, delivery
inputs and source hashes. Both complete lines are sampled from `layout.ts` every
4 m; walking vertices and town plots retain their authored positions. Local x
adds 1000 in the game. The page shows all town growth stages, rooms and forge.
The 34 m yard, 12 m table, bay, spur and bypass are proposals. The original timber
walk crosses the yard: it is flagged, never silently moved. Construction clearance
uses a conservative two-direction swept envelope (9.1 m width, 16.73 m forward
reach, 4 m sample padding and an 18 m junction turn pocket), with building overlaps
listed for review. This is not a mesh or vertical collision audit. Ordinary roof
overhang, terrain, trees, stations and safe turnout geometry remain unsurveyed.

Controls are Local document UI; there is no game implementation, persisted state,
service assignment or dispatch action. Inspect via the existing broker's same-origin
iframe capture route described above. Owner layout review precedes a game build.
