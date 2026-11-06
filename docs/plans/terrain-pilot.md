# West-cove sandstone pilot

Owner approved 5 November 2026; implement on this branch only, no push/ship. Serves DESIGN.md **11. Show, don't tell**: the shore's visible form must describe its solid surface and the open route. Research/spec: [terrain-art](../research/terrain-art.md), phased plan and first pilot. Stop at owner playtest before expansion.

The supplied board is `/Users/matiasfranco/Developer/boogle-daily/.look/previz/terrain-corner/board.md`. Opened all four shots. Shot 2 owns composition, 3 owns ledge/contact detail, 4 owns front/side profiles; shot 1 supplies family consistency only. [Back/contact schematic](../research/terrain-pilot-reference.svg) fills the missing rear reference locally under the no-network constraint. It is an original construction drawing, not another generated concept or dimensional measurement. No image is a shipped texture.

Baseline capture: `.look/evidence/1793919155149-82638/evidence.json`, camera `(775,9,16)` toward `(806,3,43)`. The current shoulder is a tall unbroken diagonal face. The low shelf is -2 m at local x -214…-190, z 30…58; inland x -178 rises to 17 m. Fit one low projecting headland in front of that slope, rather than cutting the route to fit a wall.

- Protect the landing's complete 14 m fade plus a grid-cell margin; the shore climb's 14 m shoulders plus margin; other path, rail, pad and catalog envelopes. Keep IDs and original catalog snapshots.
- Shape a bounded shelf, pocket beach and backed headland on the positive-z shoulder. Use the existing 2 m finished grid for render, collision and triangle-aware sea bed. No shader displacement.
- Code-author a small bedded face/crest/foot kit and three waterline blocks; exact shared render/collision triangles, no cave or traversable undercut. Metres, Y up, world-aligned strata. Two cullable material batches; zero new textures, passes or lights.
- Local materials/water animation and static Owner collision; no lockstep/wire/save changes. Isolate altered collision behind `terrain=cove` and its own comparison room, with a shape-only variant.
- Preserve macro-shape, material and wet-contact captures; matched default/pilot counts, game-camera approach/reverse, real-time recording and curves, existing solo place bot and bounded spatial audit. Report incomplete coverage and load/device limits explicitly.

Budgets: 2,000–8,000 added render triangles (lower is fine if silhouette holds), 2–4 spatial/material draws, fewer than about 2,000 collision triangles; no timing claim under load. Owner question: **Does this shore feel like a place you want to walk into?**

## Round 3 — smooth, textured terrain

Owner's 5 November follow-up supersedes the original faceted/texture-free bullets above. Fetched and rebased onto
origin/main (`2fb424d2`); its look-development wedge is available. The requested terrain-texturing document was
not in that main revision, so the committed research on `codex/terrain-texturing` (`29f5de8f`) supplies the technique
stack and revised texture budget. No other branch was merged. Smooth previz shots 1, 3 and 4 supply design intent;
they are not texture sources or measured camera solutions.

Use a bounded one-metre sculpted patch, continuous kit normals, island-aligned triplanar rock pigment, height-blended
semantic layers and local tunables for the complete look. Retain the shared surface for collision and seabed, protected
route formation and the idle-stop correction. Three original 512² linear RGBA8 repeating pigment/data maps use
4 MiB including mipmaps, under the research's 4.33 MiB proof budget. The 1,958-triangle kit stays under its roughly
2,000-triangle collision budget; the finer retained heightfield separately adds 4,836 collision/render triangles.

Compare Ultra Water's locally inventoried `src/scene/terrain.js` with the existing swash receiver. Retain its shared
film/foam/drying clock and add damp pigment, tide recovery, footprint-faded ripples and film sheen as local settings.
The three-by-three strata/slope wedge uses `dev/look/beats/terrain-cove.ts`. Keep frozen material comparisons distinct
from real-time swash capture and solo played-route proof. Owner playtest remains the expansion gate.
