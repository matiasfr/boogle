# Greybox

A dev-only walkable blockout of a map layout from [docs/world/map-prototypes.html](../../../docs/world/map-prototypes.html),
added to today's world at the real scale, to walk, look and ride round before anything is dressed. New areas after
Ring Island start here, greybox-first.

The live game also draws a separate, non-walkable, merged silhouette of this map
(`src/entities/sickle-backdrop/`), with no review tools. It shares the pure parser in `src/sickle/map-data.ts`;
the local `map-data.ts` re-exports it for existing tools. Dev `?greybox=` replaces that horizon with this full blockout.

The production pier photo still uses `greybox=sickle` to show the northward view toward Ring Island. Job D's
`railway-photo.ts` frame `pier` is reached through the accepted-seed real-input bot, not a greybox teleport.

- **The fog.** With the greybox on, the fog runs to 3.6 km (the crossing's range, owner, 7 November), so the islands
  read at the real scale; the live game keeps its own. `index.ts` writes it late each frame, outside caves.
- **Dev server only.** `src/features/proto-greybox.ts` loads it when `import.meta.env.DEV` and `?greybox=` are both
  present, so a production build has no greybox code and players never see it. It adds meshes and static solids to
  the scene and nothing else: no ops, no state, no saves, no sim.
- **One source.** It reads the page's `#map-data` JSON (`page.ts`, a `?raw` import), so the 2D page and the 3D
  blockout always agree. Change a position, an outline, a line or a height in the JSON and both follow. The geometry
  helpers in `map-data.ts` copy the page's own, so outlines match the drawn map; `map-data.ts` is pure and loads in
  Node with the page's text (`parseMapPage`).

## Use it

`npm run dev`, then for example
http://localhost:5173/?greybox=sickle&room=greybox-sickle (any option id from the JSON works; `sickle` is the default).
Use a room of your own (`room=`), so you don't fly about in front of other people.

| Flag                         | Does                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `&gbview=<id>`               | Hold the camera at a named view (the panel lists them; Free camera gives it back) |
| `&gbcam=x,y,z&gblook=x,y,z`  | Hold it anywhere, world metres (the panel's readout prints the current pose)       |
| `&gbfog=game\|off\|<m>`      | Greybox fog is 3.6 km by default; `game` shows the live game's own (1.5 km), `off` none, or a range |
| `&pick=A\|B`                 | Colour lines for the first branch first (A) or the second (B)                      |
| `&labels=0`                  | Start with labels and station markers hidden                                       |
| `&gbcliff=<hex>`             | Override the cliff tint (e.g. `d9d4c8`, chalk white)                               |
| `&gbrider=1\|0\|bare`        | Default `1`: train, seated Buddy, play-height camera, sleepers/rails and poles every 25 m. `0`: old overview camera. `bare`: seated rider without furniture. See [train-ride-feel](../../../docs/research/train-ride-feel.md). |

The panel (bottom left, in the HUD, so captures leave it out) has views, go-to for every place (moves your own body)
and rides along the lines at the economy model's 20 m/s, x1 or x4, with the model's ride time. Three more rides (`rides.ts`, on Place's real rails, at their own speeds) give the 2D economy model its legs: the depot **cart** trip (camp, turntable and forge stop, Q4 rack, 9 m/s), the **line 2 train** (Village, quarry stop, Far Head stop, pier, 20 m/s) and the **boiler** walk (Far Head, apron, camp, about 5.6 m/s). `window.__greybox`
drives the same from a look eval: `view(id)`, `pose(cam, look)`, `ride(route, speed)`, `go(place)`, `free()`,
`labels(on)`, `fog(mode)`, `viewPose(id)`, `refresh()`, `state()`, `lineHeights()`. Under the look harness some meshes' first draws
never appear (7 November); call `refresh()` in the look action, after warm-up, before judging a still:

```sh
npm run look -- --query 'greybox=sickle&labels=0' --cam 812,8,22 --look -829,60,-331 --action refresh.ts --name spawn
# refresh.ts: (window as any).__greybox.refresh(); await new Promise((r) => setTimeout(r, 400)); export {};
```

The review views as a shot list are `dev/look/beats/sickle-greybox.ts`; frozen shots can't refresh after warm-up, so
check their cells against a look still.

## Ring Island's near view (`?ring=greybox`)

`ring.ts`, through `src/features/ring-greybox.ts`, in any build: the Meet laid out at the 10 November rulings
([ring-island](../../../docs/brainstorms/ring-island.md)), hand-placed rather than read from the JSON. The bow at 4%
to the railhead (bent 13), the 17 m gap, the folk's orange half-crossing with its raised leaf, the brace platform
beside the leaf, the hook ring, the 50° sea stairs standing in for ladders, the island halt and its turning loop, a
sand shore band and the path to the summit lookout. The live cones (Place's `buildFar`) become trimesh solids, so the
island is walkable. Local static colliders only; no ops, state, saves or sim. `window.__ring` has the layout and named
`views` (`pier`, `gap`, `halt`, `lookout`). It doesn't combine with `?blockout=world`, whose `ringx` still draws the
old 7% bow and Ring top.

The halt also has the junction-stations first proof ([brief](../../../docs/brainstorms/junction-stations.md), "Built"):
the leaning station house at its north-west corner with a walkable 5 by 4 m room, a bench facing a window that the lean
points at the shard, a plank crossing and terrace at platform height, and LOOK UP painted on both edges in line 2's
colour. `ring-house.ts` holds its pure numbers and colliders (read by `test/ring-house.test.ts`); `&house=0` leaves it
out. `dev/look/evals/ring-house.ts` walks it by real input.

## What it reads from the JSON

Everything the page draws, plus optional greybox fields the page ignores:

- **Land:** `top` (metres), `geology` (a note), `shelf` `{ w, kind: sand|rock }` (the shallow shelf under the water,
  so the sea lightens toward the shore), `tint` (cliff colour), `module` (lands sharing one kit mesh, like the chalk
  islets), `clip` `{ by, gap }` (split by a terrain line, like the Gorge), `tier` (a terrace on another land),
  `existing` (already built: nothing drawn), `walk: false` with `horizon` (a far backdrop).
- **Lines:** optional `heights`, one deck height per `pts` vertex, in metres above sea; `null` keeps the station/terrain height. Sickle sea links use 4 m decks, with sampled clearance approaches to unchanged stations. The five formerly straight links bend about 20° at 68% of the chord; the south White Wall line follows the chalk's bay-side foot. Review rides still start at cruise and stop abruptly; the panel separately reports model acceleration, boarding and dwell.
- **Terrain:** `forest` with `h` (crown tops), `gorge` (the split), `pier` (breakwaters on the page).
- **`landmarks`:** `crane`, `arch` (with `lantern`), `pinnacle`, `waterfall`, `saltworks`, `lamps` (along a line).
- **`harbour`:** breakwater, quay, warehouses, moorings, head light, mouth, and `seabed` `{ quay, basin, mouth }` (metres below
  the sea: the basin's floor, built as a mesh because the water colours by the depth of what lies under it).
- `works` marks show Split-rock and the Roundhouse. The crossing's first six bents along `ringx` (20–120 m north of the
  pier head, 4 m decks) stand in the production world itself once twelve footings are set (Split-rock J5); the
  greybox draws nothing for them, so `greybox=sickle` shows them against the rest of the crossing's survey.
- **`common.works`** (line 2's production railway; Place-local metres like the rest): `{ id, name, at, kind, line?, s?, off?, note? }`
  for the forge, Q1 to Q6 frames, the pack chest, the quarry lever and sea switch, the boiler, the old train and the
  halts. `s` is metres along Place's real rails (`l1` = `LINES.north`, `l2` = `LINES.east`) and `off` the mark's side
  offset. They are thin, labelled, **non-solid** posts, and the unlaid `l2b` stretch (Split-rock to the pier) is a
  **non-solid survey line** (pink, stakes every 20 m), never solids, so the real track laid there never meets a greybox
  solid. The page ignores `works`, and the 2D economy prototype may read it. Go-to takes any of them by id or name
  (`go('Q4')`, `go('Far Head')`, `go('pier')`). `test/greybox-works.test.ts` pins them to the railway catalog and the rails.
- **`backdrop`:** the mainland's city (towers, lighthouse, smoke).
- **`ambient`:** boat routes, there and back, cosmetic.

Heights it can't find come from today's ground: Home's terrain, the classic island and Ring Island's cones.

## Files

`index.ts` the entry (flags, views, rides, panel, labels, the one late hook) · `build.ts` meshes and solids · `rides.ts` the line-2 rides ·
`ground.ts` heights, decks and line profiles · `map-data.ts` the JSON's types and the page's geometry · `page.ts`
the raw import · `greybox.css` · `blockout.ts` the live client's `?blockout=world` (any build, through
`src/features/world-blockout.ts`): the same meshes and solids with `review: false`, no panel, labels, rides or fog.

## The whole map ([world-blockout](../../../docs/plans/world-blockout.md))

- **Halts.** Every stop in `src/sim/railway-world-lines.ts` (the future lines as train services, generated from the JSON by
  `dev/level/world-blockout.ts`) gets a solid 40 m platform outside each of its two tracks, top 0.9 m over the deck.
- **Double track.** Future decks are the 7.6 m `FORMATION` with two track beds (one merged `track-beds` mesh), each line
  end a crossover (an X of beds) or a solid 40 m turning loop. Rides and the rider's sleepers use the left-hand track.
  Lines 1 and 2's second track is built (generic-lines step 2): the live railway draws it, so the greybox no longer
  draws their survey bed; `LIVE_SECOND_TRACK` stays the blockout page's record of that side's clashes.
- **The full loop** (panel ride `loop`, `__greybox.ride('loop', 4)`): line 2's real rails from the Village halt (`=l2`),
  then `ringx`, `ledge`, and `wall-n`, `wall-s`, `lift`, `salt-quay`, `seacave` backwards (`~id`), 8.7 km.
