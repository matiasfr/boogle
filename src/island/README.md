# The island and its points of interest

The ground is a pure function, composed in layers, so a point of interest (POI) can be added, moved or removed
without touching anything else on the island.

| Layer | File | What it does |
|---|---|---|
| Natural shape | `shape.js` | The original island ("home", around the origin) joined to the mainland to the north, plus the north-west massif. Home ground within `HOME_KEEP` m of the origin is exactly what it always was. |
| Stamps | `stamps.js` | Shapes (disc, box, path) with an effect (`set`, `add`, `min`, `max`) and/or paint. Each POI's stamps reshape only the ground around it. |
| Sites | `src/pois/<name>/site.js` | Where a POI is, its stamps and its keep-out discs. Read before the terrain is built. |
| Content | `src/pois/<name>/index.js` | Meshes, colliders, lights and per-frame updates; registers `onStart`/`onFrame` like a feature. Loaded by `src/features/pois.js`. |

`index.js` here composes the sites (folder order, alphabetical) into `island`: `heightAt(x, z)`, `paintAt(x, z)`,
`keepOut` and `keptOut(x, z, pad)`. `src/terrain.js` builds the heightfield and the mesh from it; `src/props.js`
keeps trees and rocks out of keep-out discs and pushes them into `obstacles`, which the Boogler walks around.

## Add a POI

1. `src/pois/<name>/site.js`:

   ```js
   export default {
     name: 'Bandstand',
     x: 40, z: -150,            // world metres (+z is south, towards home)
     dir: [0, 1],               // local forward (+z); local +x is to its right
     stamps: [
       { shape: 'disc', r: 9, fade: 6, set: 'ground' },              // flatten to the natural height here
       { shape: 'disc', r: 9, fade: 1, paint: '#c8b48a', strength: 0.6 },
     ],
     keepOut: [{ r: 11 }],      // no trees or rocks, the Boogler walks around (local x, z, r)
   };
   ```

2. `src/pois/<name>/index.js` builds the content in `onStart` (after the terrain and props exist), using
   `groundHeight`, `siteFrame(site)` from `stamps.js` for local-to-world placement, and `addPart`/`mergeParts` from
   `src/props.js` to merge small parts into one draw call.
3. `npm run island-map` writes `.look/island-map.png`: the composed island, keep-out discs in red. Check the POI sits
   where you meant, then look at it in the game (`npm run look -- --cam x,y,z --look x,y,z`).

Remove a POI by deleting its folder. Move one by changing `x`, `z`, `dir` in its site.

## Rules

- **Same ground everywhere.** Stamps and shapes use plain arithmetic and `Math.sqrt` (no trig), and the heights are
  quantized to centimetres once (`src/world/terrain-edits.js`), so every client builds the same heightfield.
- **Home is special.** The shared water sim, sand digging and beach gifts only run inside `HOME` (`src/constants.js`):
  the original island's square. Keep POIs out of it unless they mean to change home.
- **Changing the grid** (`GRID_RES`, `HALF`) moves every saved cell. Saves from the old 129-cell grid are migrated by
  `src/world/legacy-grid.js`; a future grid change needs the same treatment.
- Stamps change the base ground, not player edits: sand dug or piled on top keeps its depth.
