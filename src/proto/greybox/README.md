# Greybox

A dev-only blockout of a map layout from [docs/world/map-prototypes.html](../../../docs/world/map-prototypes.html),
added to today's world at the real scale, to walk, look and ride round before anything is dressed. New areas after
Ring Island start here, greybox-first.

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

The panel (bottom left, in the HUD, so captures leave it out) has views, go-to for every place (moves your own body)
and rides along the lines at the economy model's 20 m/s, x1 or x4, with the model's ride time. `window.__greybox`
drives the same from a look eval: `view(id)`, `pose(cam, look)`, `ride(route, speed)`, `go(place)`, `free()`,
`labels(on)`, `fog(mode)`, `viewPose(id)`, `refresh()`, `state()`. Under the look harness some meshes' first draws
never appear (7 November); call `refresh()` in the look action, after warm-up, before judging a still:

```sh
npm run look -- --query 'greybox=sickle&labels=0' --cam 812,8,22 --look -829,60,-331 --action refresh.ts --name spawn
# refresh.ts: (window as any).__greybox.refresh(); await new Promise((r) => setTimeout(r, 400)); export {};
```

The review views as a shot list are `dev/look/beats/sickle-greybox.ts`; frozen shots can't refresh after warm-up, so
check their cells against a look still.

## What it reads from the JSON

Everything the page draws, plus optional greybox fields the page ignores:

- **Land:** `top` (metres), `geology` (a note), `shelf` `{ w, kind: sand|rock }` (the shallow shelf under the water,
  so the sea lightens toward the shore), `tint` (cliff colour), `module` (lands sharing one kit mesh, like the chalk
  islets), `clip` `{ by, gap }` (split by a terrain line, like the Gorge), `tier` (a terrace on another land),
  `existing` (already built: nothing drawn), `walk: false` with `horizon` (a far backdrop).
- **Terrain:** `forest` with `h` (crown tops), `gorge` (the split), `pier` (breakwaters on the page).
- **`landmarks`:** `crane`, `arch` (with `lantern`), `pinnacle`, `waterfall`, `saltworks`, `lamps` (along a line).
- **`harbour`:** breakwater, quay, warehouses, moorings, head light, mouth.
- **`backdrop`:** the mainland's city (towers, lighthouse, smoke).
- **`ambient`:** boat routes, there and back, cosmetic.

Heights it can't find come from today's ground: Home's terrain, the classic island and Ring Island's cones.

## Files

`index.ts` the entry (flags, views, rides, panel, labels, the one late hook) · `build.ts` meshes and solids ·
`ground.ts` heights, decks and line profiles · `map-data.ts` the JSON's types and the page's geometry · `page.ts`
the raw import · `greybox.css`.
