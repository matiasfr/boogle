# Candidate A — R3 modelling brief

**Status, reconciled 17 November:** candidate A shipped in #1995; checkpoint/evidence in #1999 ([plan](../../plans/rider-coach.md)). This is the 16 November modelling reference, not a separate final-art approval. Principles: Show, don't tell; Understandable at a glance.

## Authority and axes

[Plan and both reviews](../../plans/rider-coach.md) govern. [Chosen look](../rider-coach/closed.png) supplies identity, not dimensions. Period inference: British narrow-gauge light railway, approximately 1870–1900, not a historical reconstruction. Blockout source inspected at `2565b85c9`: `src/prefab/builders/coach-parts.ts`, `src/place/folk.ts` COACH_SEATS, `src/place/look-kit.ts` wheels and `src/entities/railway/cars.ts`. [Retained blockout](blockout.png) is the unmodified committed counts/8/c0-v0 still, 1200 × 800.

Metres; game +Y up, +Z along coach toward engine, X across track. Origin rail-line/deck midpoint. Recipe converts `(x,y,z)` to Blender `(x,-z,y)`; Y-up GLB. Geometry envelope x ±0.80, z ±1.45, crown y2.05, measured deck y0.70. The roof envelope excludes deployed steps; they intentionally project only at rest. Dimensions below are modelling proposals inside those binding bounds unless identified as blockout measurements. Painted labels are illustrative; this table and the measured layout govern contradictions.

## Named parts / recipe parameters

| Part / count | Dimensions or bounds (m) | Treatment |
| --- | --- | --- |
| coach_shell / 1 | body W1.52 × L2.82, x ±.76 z ±1.41, y.70–1.93 | Merge stationary shell, benches, rails, panels, end details and handles |
| roof / 1 within shell | W1.60 L2.90; crown2.05 eave1.93; thickness .06 | Circular transverse arc R2.7267, rise .12; 12 broad transverse segments, no ribs, pots or lamps; .04 overhang each end/side |
| side panels / 4 each side | each bay .60 pitch, visible inset .48 × .38; y.78–1.16 | Relief .018; end bays are door lower panels; four broad panels, no thin planking |
| waist rail / 2 | L2.80, height .08 at y1.16–1.24, thickness .04 | Brown rail, narrow cream lining on its upper face |
| windows / 4 each side | clear along Z .54 × height .63; centres z −.90,−.30,.30,.90; sill1.24, header1.87 | Unglazed, no transparency plane, sill .32 above seat; bay posts .06 along Z, wall thickness .04 |
| door leaves / 2 each side | .56 along Z ×1.17 high, y.70–1.87 at z ±.90 | Outer window bays double as doors, matching panel relief; no extra bay. Closed leaf in static shell, reserve separate named nodes if opening is animated |
| handles / 4 | lever .09 × .035 × .035 at y1.20 | Brass, broad single form, no keyhole |
| ends / 2 | W1.52 × height1.23 at z ±1.41 | Solid lower panel, central .50 × .40 unglazed inspection opening y1.35–1.75, brown corner posts; no end balcony |
| benches / 2 | .35 wide ×2.40 long ×.06 seat thickness, x centre ±.535, seat top.92 | Blockout bench x.36–.71 and mirrored; supports beneath, no cushions |
| running boards / 2 | .08 wide ×2.80 long ×.04 thick, x .72–.80 and mirrored, y.55–.59 | Visual ledge only; no player access, no collider |
| coach_step_LF/LR/RF/RR / 4 | tread .56 along Z ×.24 extension ×.04 thick; pivot (±.76,.57,±.90) | Separate rigid meshes; longitudinal hinge. Stowed vertical up, outside bound ≤.80; down horizontal outward to ±1.00. ±90° rotation mirrored by side. No collider |
| underframe / 1 | W1.40 ×L2.90 ×H.18, centre y.49 | Blockout measurement; preserve frame position, separate node if existing prefab integration needs it |
| deck / 1 | W1.60 ×L2.90 ×H.12, centre y.64 | Blockout measurement, top.70; concealed by shell |
| wheels / 4, existing kit | centres x ±.50, z ±1.10, y.37; R.22 | Blockout actually calls wheels(TRAILER.hz,.22), retaining 2.20 axle pitch. Reuse existing rotating batch; do not export duplicate wheels |
| headstocks / 2 | use existing train kit connection landmarks | Preserve .50 body-to-body gap. No invented buffer discs/chains in the painting become new coupling geometry; kit owns slack and coupling behaviour |

No lamp pots: they break both the plan and the walkable crown. Roof is a continuous convex surface, no gutters or lips that catch feet. Maximum transverse tangent about17.1°; low crown is walkable in intent. Keep R2b's existing envelope collider; modeller must inspect visual-to-collider separation and player footing on the final build, not infer physics from this art.

## Livery and budget

Use linear `Col` vertex colours as passenger-car.py does; one shared kit paint, no textures or glass material. R3 honey `#b98a52`, brown `#5c4530`, iron `#2f3131`, red `#a33a2c` are already the plan palette; blockout uses honey/iron. Reuse passenger-car brass `#d9a23a` and cream `#f3e6c8` sparingly. Honey lower body, red upper window framing, brown recessed panels/rails, dark iron roof/chassis; cream broad lining, brass handles. Do not copy the players' car's brighter upgrade red indiscriminately.

Follow passenger-car.py's named primitive/part records, one-segment .012m bevel and weighted normals, canonical constants or hashed same-stem JSON, linear corner colours. Target the same representation: one merged static shell, optional underframe, four step nodes, existing wheel batch, one shared vertex-colour material. Guide: roughly 2–4k evaluated triangles for new fixed shell and steps, report actual triangles and compressed bytes beside passenger-car.glb; no arbitrary cap or detail added to hit a budget. Measured comparison at this checkout: passenger-car.glb is 25,832 bytes, two meshes, no embedded materials; car_fit has 2,752 indexed triangles and car_upgrade 976 (3,728 total). These are decoded GLB accessor counts, not an evaluated Blender topology report.

No textures, lettering, bolts, fine grooves, roof seams, transparent surfaces or fine piping. Each panel/frame is a closed solid; windows are actual holes, roof underside intentional shell surface only if explicitly documented.

## Seats and visibility contract

Eight seats preserve k order: `side = k % 2 ? +1 : -1`; x=`side*.535`, z=`(floor(k/2)-1.5)*.60`, yaw=`-side*pi/2`. Seat top .92, sitting root .885 (seat −.035). Export named socket landmarks `seat_0`…`seat_7` at those root coordinates and matching yaw; document seat top separately. Empty sockets can be pruned by the builder: preserve landmarks using the established attachment metadata route and verify the decoded export; do not assume empties survive. Future coach-kit reads baked node world transforms including quantization and installs anchors in the car's rail-local frame. Replace duplicated COACH_SEATS through the owning folk integration; preserve setRiders(slot,count,car), count order and existing per-train rider visibility. No new player seat interactions.

The existing hook offsets from car.top inside its mesh frame; do not add .885 to that expression blindly. Verify a world-space seated root at rail+.885 and bench top rail+.92 after the car's rock transform. One seated head per opening, alternating near/far so partial loads show on both sides. Four visible near windows is not proof of all eight: inspect opposite side. Hats .584 wide versus .60 pitch leave .016 between adjacent full diameters. At wall x.76, a circular brim centred x.535 intersects the wall over about .372m in Z, inside a .54 opening; this only explains why projection can fit, not rig clearance. Final seated hat/head heights, knees and actual mesh intersections remain unjudged. No shrinking hats or moving anchors to solve a failed build: first enlarge the clear opening vertically within the header or thin its frame.

## Platform-facing doors and smallest change

The original painted end door cannot face a side platform. At 2.90m there is no length for four windows plus separate side vestibules. Smallest correction: integrate door leaves into the first and fourth window bays on both sides. Keep all four seats and droplights, no balconies, no extra length; entry is stylized, with seat occupancy and routing requiring a built pose check. Both ends retain panelled character but replace end doors with inspection windows. This is explicitly a modelling proposal to resolve access, not a new gameplay mechanic.

Select doors by the actual halt's platform side in coach-local coordinates, never camera side or a hard-coded global X. Home outward: east/down platform; Home homeward: west/up. Pier while it is the terminal: east/down arrival platform; after Q7 the Pier is homeward-only on west/up, and riders do not board there (second review). Train orientation flips at termini, so local ±X must be derived from its current pose/platform; draw the step on the platform-facing side only while standing. Opposite side remains stowed. No step collider and no entering players. The .24 projection is a visual tread, not certification that it spans every platform gap. Check both stops and both train orientations during R3 build.

## Built inspection and R3 stills owed

Author future `assets/src/rider-coach.py` with the regular builder; no production recipe is added by this sheets task. Inspect built GLB using `node dev/assets/inspect.ts assets/built/rider-coach.glb .look/coach-r0 4 0,1,0` (new output dir). Open all clay/parts/wire/material front/side/back/three views. Report decoded world bounds, evaluated/exported triangles, byte count, material count, normals, degenerates, connected components, intentional openings, socket transforms and dependencies/hashes. Confirm no duplicate underframe/wheels, coplanar faces, extra painted window bars or roof ribs. Topology tests do not prove rider visibility.

Register the actual asset on the existing Buddy stage during the build. Fixed camera, studio and shipped light, exposure, pose/time; compare with real player and little guy meshes, players' car, both sides, roof and steps stowed/down. Inspect at game distance, with seated hats and knees, not merely an empty shell. Review actual step motion through asset-motion consecutive frames and curves; art states do not prove timing.

R3 capture matrix: Home and Pier × both platform and opposite sides × empty / part full (1,4) / full8. Beside players' car in every wide frame; one full train view, one coach-sized game camera, one detail showing hats/sills/door access. Capture terminal arrival and homeward orientation as applicable; Pier after Q7 has no rider service, so label any diagnostic occupancy. Include roof-standing player and deployed/stowed steps; R4 owns real-time boarding/alighting and multiplayer. Retain exact build SHA, seed, route, count, camera, manifest and opened-image observations. Owner question after actual build: “Does this retain candidate A's passenger-coach character while its riders read clearly from either platform?” No new approval gate for this docs task.

## Image receipt and honest limits

Built-in OpenAI image_gen generated a sheet, then a diagnosed correction, and one screenshot-based look image with two diagnosed repairs. Returned model identifier and cost unavailable. No child agents, external source art or ROM data. Exact prompts retained in prompts.json. Inputs: chosen closed.png = identity/style; blockout.png = scale/composition and actual game context. All delivered raster images opened and inspected. Generated orthos are art intent; measured-layout.svg and the dimensions above govern scale and errors. No GLB, Buddy-stage, in-game art, animation, multiplayer, device performance or owner approval is claimed.

Final look inspection: four near windows and four lower panels survive; the far four are hidden, and the painted door handles are too large and too low. Build the .09m lever at y1.20 from the table. The painting retains the cargo car and compact relative width; it cannot certify exact world-space scale. The art sheet's top labels use body rather than roof dimensions and its end underframe label is wrong; measured-layout.svg and this table correct those. No further art repair is claimed.
