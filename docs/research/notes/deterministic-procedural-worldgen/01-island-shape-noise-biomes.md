# Island shape, layered noise and biomes (Red Blob Games, Minecraft 1.18, No Man's Sky)

## How do proven generators turn noise into an island with a coast, hills and biomes?

### Takeaway
Every reference pipeline is "a few low-frequency fields, shaped by a falloff toward the edge, then remapped through hand-tuned curves": Red Blob's elevation = fbm blended with 1 - distance; Minecraft 1.18's continentalness/erosion/peaks-and-valleys fed through splines; biome = table lookup on two or more fields. The shaping curves, not the noise, carry the art direction.

### Cited Findings
- Red Blob "terrain from noise": elevation is a sum of octaves at doubling frequency with falling amplitude, normalised, e.g. `e = 1*noise(1x) + 0.5*noise(2x) + 0.25*noise(4x)` divided by 1.75; octaves are decorrelated with different seeds or offsets — [Red Blob Games, Making maps with noise](https://www.redblobgames.com/maps/terrain-from-noise/)
- Redistribution: `elevation = pow(e, exponent)`; exponents above 1 push middle elevations down and flatten valleys — [Red Blob Games](https://www.redblobgames.com/maps/terrain-from-noise/)
- Island shaping: compute a distance `d` (square bump `1-(1-nx²)(1-ny²)` or Euclidean² `min(1,(nx²+ny²)/√2)`) and blend `e = lerp(e, 1-d, mix)` with mix in 0..1; water level assumed at 0.5 — [Red Blob Games](https://www.redblobgames.com/maps/terrain-from-noise/)
- Biomes: a second noise field gives moisture; elevation (as temperature proxy) and moisture index a Whittaker-style lookup table; the author stresses thresholds are "example threshold numbers" to tune — [Red Blob Games](https://www.redblobgames.com/maps/terrain-from-noise/)
- Terraces: `round(e*n)/n` quantises elevation into levels; ridged noise `2*(0.5-abs(0.5-noise))` gives ridges — [Red Blob Games](https://www.redblobgames.com/maps/terrain-from-noise/)
- Object placement suggestion: keep cells that are local maxima of high-frequency noise within radius R, but Poisson disc or jittered grids distribute better — [Red Blob Games](https://www.redblobgames.com/maps/terrain-from-noise/)
- Polygon map generator (mapgen2): land/water = noise minus a term growing with distance from centre so the boundary is water; ocean = water connected to the map edge, lakes = water not connected; elevation = breadth-first distance from the coast, rescaled (ocean -1..0, land 0..1), "deterministic, with no noise" — [Red Blob Games, Polygon map generation](https://www.redblobgames.com/maps/polygon-map-generation/)
- mapgen2 moisture = decreasing with BFS distance from lakes and rivers; biome from Whittaker diagram indexed by temperature (elevation, latitude) and moisture; author calls this simple and notes it can't model a desert river — [Red Blob Games, Polygon map generation](https://www.redblobgames.com/maps/polygon-map-generation/)
- Red Blob's later view: distance-from-coast elevation gives "simplistic symmetric volcanic-style islands"; later experiments grew rivers from the coast first and fit elevation to the drainage network (author: "I failed" at fully matching) — [Red Blob Games, Elevation from rivers](https://www.redblobgames.com/x/1724-elevation-from-rivers); [Red Blob Games, Procedural river growing](https://redblobgames.com/x/1723-procedural-river-growing)
- mapgen2 seed UI: a seed plus parameters in the share URL reproduces a map; holding up-arrow scans many seeds — [Red Blob Games, mapgen2](https://www.redblobgames.com/maps/mapgen2/)
- Minecraft Java 1.18+: three 2D noise maps (continentalness, erosion, peaks-and-valleys) are mapped through splines to a terrain height offset and vertical stretch factor; higher continentalness raises terrain, higher erosion lowers and flattens it; PV = 1-|3|weirdness|-2| — [Minecraft Wiki, World generation](https://minecraft.wiki/w/World_generation)
- Continentalness bands go from mushroom fields (-1.2..-1.05) through deep ocean, ocean, coast, near/mid/far inland; non-inland biomes (beach/ocean) depend only on continentalness and temperature — [Minecraft Wiki](https://minecraft.wiki/w/World_generation)
- Biome selection: each biome occupies intervals in a 6D parameter space; outside all intervals "the game uses the closest biome interval" — [Minecraft Wiki](https://minecraft.wiki/w/World_generation)
- Aquifers: noise below 0.4 is empty, above 0.8 is flooded, in between uses a local fluid level per 16x40x16 cell — i.e. water placement is itself a deterministic function of noise and position — [Minecraft Wiki](https://minecraft.wiki/w/World_generation)
- Generation runs in fixed stages (structure starts, biomes, terrain, features, light ...), and chunks can be frozen at early stages — [Minecraft Wiki](https://minecraft.wiki/w/World_generation)
- Community explanations of Kniberg's talk: "use a spline function" to give the noise result the desired shape — [Flauschbert devlog](https://flauschbert.itch.io/minecraftian-voxel-engine-demo/devlog/549859/minecraftian-voxel-engine-1-terrain-height-generation)
- No Man's Sky (Innes McKendrick, GDC 2017): true erosion simulation was infeasible because terrain is generated locally at runtime, so they used procedural approximations of erosion's results; linear additive density shapes mountains; "Perlin worms" carve caves; generation runs on CPU on PC and compute shaders on PS4 — [GDC 2017 notes, Blather Rinse Repeat](https://blather-rinse-repeat.blogspot.com/2018/11/gdc-2017-part-ii-main-conference-notes.html); talk listing [GDC Vault](https://gdcvault.com/play/1024265/Continuous-World-Generation-in-No)
- Sean Murray's GDC 2017 "Building Worlds Using Math(s)" covers generating realistic and alien terrains "with mathematics and no artistic input" — [GDC Vault](https://gdcvault.com/play/1024514/)
- Erosion-like noise via derivatives: a Shadertoy-derived technique uses analytic derivatives of fbm to steer another noise layer into gullies running downhill — [runevision gist](https://gist.github.com/runevision/c867c458f06284ad4c0f8aa3b974bc59); Galin et al.'s review notes erosion effects can be approximated by warping along the slope direction (secondary summary) — [search summary of Galin et al. review](https://wenku.csdn.net/doc/3h4apwpp1n)

### Inferences
- For a 129x129 island, the Minecraft idea scales down to: one "continentalness" field (radial falloff + low-frequency wobble) deciding sea/beach/land, one "roughness" field deciding flat beach vs bumpy dune/hill, and a hand-authored piecewise-linear spline (integer lookup table) from those to height. Piecewise-linear tables are exactly reproducible in integers.
- Red Blob's `pow` and `sqrt` in the distance function can be avoided by working with squared distance and a lookup table, which keeps the pipeline integer.
- NMS's lesson is that fake erosion (shaping functions) is acceptable when sim is too costly; but at 16k cells Boogle can afford a real (cheap) erosion pass.

### Gaps
- No primary transcript of Sean Murray's talk; claims that NMS uses "uber noise" or slope-damped derivatives could not be verified, so they are not stated.
- I did not watch Henrik Kniberg's video directly; spline details come from the Minecraft Wiki and a devlog.
