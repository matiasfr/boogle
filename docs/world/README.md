# Connected world study

Open [world-map.html](world-map.html) directly, or serve it at `/docs/world/world-map.html` with the existing local Vite server. It is an offline, self-contained SVG planning page; it imports no game code and makes no network requests. The coordinator can publish the file as a Claude Artifact without adding dependencies. It deliberately omits document wrapper tags.

The owner’s **6 November: Visualize in 2D HTML first** call authorizes this study. Review it with the owner before turning its proposed content into an in-game greybox. It serves DESIGN.md’s **Understandable at a glance**, **Telegraph everything** and **Show, don’t tell**. It changes no player-facing game behavior, so the as-built game-design chapters remain unchanged.

## Read the map

- **Whole world:** the newer material-spine research, plus optional Canopy, Observatory and return links. Every future footprint and connection is a proposal. This is not proof of eight hours of content.
- **Home island:** the complete current Place slice, including Far Head and the pier. **T1 → T3** frames the opening at a closer scale.
- Drag to pan; wheel, pinch or buttons zoom; arrow keys pan when the SVG is focused. Reset returns to the selected preset. Tap or focus a marker/line and press Enter for details; the selector provides every record even when labels collide or a layer is hidden. Hover gives a brief name/status; selection gives the full details.
- Layer switches show terrain height zones, rails/walks, gates, ability dependencies and historical era themes. Ability links describe access relationships, not validated jumps or flight trajectories. Local views hide proposed rail links unless selected so the current slice stays readable; the whole-world view shows all links.
- Solid, dashed and dotted outlines distinguish **exists**, **planned** and **proposed**; text repeats status. Rail paths use rust, walking paths sand and ability paths purple. Proposed main rail paths are dashed; optional links are lighter and dotted. Thin leaders attach displaced labels to their actual positions. Terrain bands are sampled at 0, 10, 24 and 40 m elevation.

“Exists” means authored geometry or behavior in this checkout, not completed construction in a live room. The cove is the `terrain=cove` pilot region, not default terrain. The FAR shard is existing distant scenery; the Suspended Coast landing around it is proposed. The roundhouse is owner-directed, but its mapped site and footprint are proposed. The original island’s **redesign and placement** are proposed, distinct from the existing classic map and from the starter.

## One editable data block

The first script, `#world-data`, is strict JSON. Edit it as data; renderer code follows the page markup. **Download map data** exports that exact block; browser interactions do not persist edits or write back to the repository.

| Field | Contract |
| --- | --- |
| `version`, `date`, `sourceCommit`, `sourceHashes` | Snapshot provenance. Refresh when re-extracting source, not merely moving a proposed island. Hashes cover six geometry source files, not every transitive dependency. |
| `units`, `axes`, `origin` | One unit is one metre. Arrays use `[x,z]`, with north at negative z. Coordinates are Place-local. Current game placement adds `origin.x=1000`, `origin.z=0`. |
| `views` | `[minX,minZ,width,height]` camera presets. They never rescale geography. |
| `terrain` | Derived SVG contours for the **default** terrain’s sampled 2 m grid. Each occupied cell uses its lower-left height; shoreline uncertainty is up to a cell diagonal. These are visualization data, not greybox collision. |
| `places` | Stable `id`, `name`, `at`, `status`, `description`, `source`. `scale` is `world`, `local` (default), or `both`. `labelAt` changes the label only. `radii` are future elliptical footprint assumptions; `radius`, `bounds`, `footprint` describe local reference geometry. |
| `lines` | Stable ID, name, status, `kind` (`rail`/`foot`), `points`, description and source. Future links also have `from`, `to`, `material`, `optional`, speed and acceleration. Endpoints must match their named places. |
| `gates` | Position, status and plain `requires` text. These are dependency notes, not executable conditions or shared game state. |
| `abilities` | Acquisition position and `routes` polylines showing routes/dependencies opened. Current unlock positions are extracted; later upgrade placements are proposals. |

When moving a place, move all attached line endpoints and related gates/ability routes explicitly. Length and timing recompute from future route polylines. Keep stable IDs so later exports and review notes can refer to the same place. A label collision hides only its text; markers and the selector remain available.

For existing lines, `points` are all 1 m samples from `LINES.north/east`, and `length` retains the source’s declared arc length (221 / 743 m). Do not drag or stretch these to fit a composition. Stations are the actual construction-frame positions from `frameBesideLine`, including its 5.4 m offset, converted back to Place-local coordinates. T1/T2/T3 rail attachments are s=191/150/116 m; the frame itself is offset along and beside the line. Town radius, forge footprint, turntable, paths and headland anchors come from `layout.ts`. Cove bounds come from `cove.ts`; its center is only a region label.

## Refresh current geometry

Start with `npm run map -- src/proto/place` and the applicable AGENTS routes. Read the relevant exported tables and current as-built chapter. Source is authoritative over this snapshot. An offline Node inspection can import the data owners directly:

```sh
node --input-type=module -e "const l = await import('./src/proto/place/layout.ts'); const t = await import('./src/proto/place/tech-layout.ts'); console.log(JSON.stringify({origin:l.ORIGIN,lines:l.LINES,links:l.LINKS,paths:l.PATHS,forge:l.FORGE,devices:t.DEVICES,gates:t.GATES},null,2))"
```

Convert Float32Array samples to ordinary `[x,z]` arrays; preserve every sample and round only at serialization (this snapshot uses 0.001 m). Read each frame through `frameBesideLine(station, line, dir)` and subtract ORIGIN. Preserve foot-path heights while calculating length, even though the map stores only the top-down projection. Take `SHORE_PATH` from `shore-layout.ts` and the acquisition points from `DEVICES` in `tech-layout.ts`; do not infer them from the old six-era schedule.

To regenerate terrain contours, import `terrain.ts` with its default Node query. For each threshold 0/10/24/40 m, mark cells whose lower-left `heights[at(i,j)]` sample reaches the threshold. Emit clockwise boundary edges only where an adjacent cell is outside, join them into closed rings, remove collinear vertices and convert grid indices with `cellX/cellZ`. Store the resulting SVG path using even-odd fill. This preserves holes and gorge branches without tracing a screenshot. The cove is separately annotated because the default import does not activate it. Refresh source SHA-256 hashes and `sourceCommit` together with all derived records.

## Travel estimates

Foot time is route length / **5.6 m/s**, a planning assumption from island-layout/vast-world-scale research, not a newly verified player-speed contract. Authored footpath lengths include elevation; rail and future links use plan distance. Slopes, carry penalties, rests and local detours are omitted. Future water links have a walking estimate **only after a walkable deck is built**. Unbuilt-water access is explicitly unresolved; no ferry, swimming requirement or teleport is assumed.

Train time uses a rest-to-rest trapezoidal/triangular estimate:

```text
if D >= v²/a: T = D/v + v/a
otherwise:   T = 2 sqrt(D/a)
```

Current tuning is 20 m/s, 3.5 m/s², 5 s dwell, from `TUNE`. Current Line 1 passenger endpoints are s=14 and s=207, not its full 221 m geometry. Line 2 stops at s=17,174,524; the remaining pier is not passenger service. Its time includes one intermediate dwell. Future speeds (20–50 m/s) and acceleration (3 m/s²) are hypotheses; intermediate stops are not authored. Waiting, access walks, transfers, curves, congestion and service frequency are omitted. Consequently these are useful scale comparisons, **not a working timetable or door-to-door promises**.

The first proposed outward route is about 1.25 km, close to the owner’s 1.2 km / 20 m/s crossing anchor. Longer links are deliberately visible for review, particularly the last approach and optional return ring; do not treat their ride lengths as accepted. Timings are per selected link, not an aggregated journey through all gates.

## Research and authority

Read [DESIGN](../../DESIGN.md), the [current decision index](../proposals/boogle-2.md#current-decision-index) and applicable [owner calls](../agents/owner-calls.md). In particular:

- Materials replace global eras; abilities are iteratively upgraded. The hook remains a pull, not a swing. Main-area components improve several systems; smaller places hold discovery and abilities.
- [Next destinations](../research/next-destinations.md): the material-spine recommendation supplies this sketch’s named destinations and sequence. Canopy and the observatory are optional. The original island, not High Port or the starter, is the ending. Spatial coordinates here are new proposals, not extracted from that report.
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

No game mechanics, game map UI, state ownership, lockstep math, assets or network behavior change in this task. `npm run inflight` was not run because its implementation fetches origin and the brief permits only local-server network access; cached refs and the clean starting branch were inspected instead. No push or ship is authorized.
