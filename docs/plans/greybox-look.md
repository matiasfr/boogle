# From Ring Island to the causeway

**Start at the Stack line.** From Ring Island's west platform, keep the railhead against open water and let one broken crown on the nearest stack catch the light. Ride toward it before dressing the far stacks. This is the first transition from finished art to blockout, uses Ring's existing rock vocabulary and tests near-to-far continuity before the harder two-level station or the long White Wall.

## Build cards in recommended order

Each numbered row is one builder's visual slice. The middle column describes existing massing. The last column specifies two matched before/after frames and the question to answer at normal game FOV. Files named under ownership are in `src/content/levels/` unless noted. Author each area's rock in its own `dev/prefab/cliff-kit-<area>.ts` and regenerate its own level data. A single integration owner handles shared generator registration. Keep the existing walk, collision, rail clearance and feature residency as the footprint.

| Step and ownership | What a rider meets today | Dress and check | Proof pair |
|---|---|---|---|
| 1. Stack line and High Gorge, gorge.ts | Isolated supports across the sea give way to broad stacked slabs at the halt and a pick on the rim. | Borrow Ring's bedded faces. Spend the largest pieces on the first stack's waterline and the cut facing the train. Keep darker packed earth on the rim, a few grass tufts on the cap and bare stone below. Check the pick against uninterrupted ground and the train against sky. | Ring west frame outward / Gorge platform toward stair and rim, then rim at eye height toward the pick |
| 2. Incline, West landing and Bell Rock, leg2.ts | A bore and stair connect a low deck with the bay's upper line. From below the stacked decks can read as one block. | Frame the bore in two rock shoulders. Carry warm timber along the upper lip and cool stone around the lower mouth. Use the existing shore pigment below and a grass cap above. Keep the stair and lower seed stand clear of crates. | Incline train exiting bore / lower stair looking up at bay train |
| 3. Canopy, leg3.ts | The train enters a cleft below the mother trunks. The halt and cloth occupy a much smaller scale than the canopy. | Cluster existing foliage high on the trunk masses so daylight separates the crowns. Break the cleft's entrance with kit ledges. Use timber and a repeated roof colour on existing town volumes, with the platform edge left visible through the trees. | Train entering cleft / halt toward cloth |
| 4. Cave line and Saltpan, leg4.ts | The West hood compresses the view before the low Saltpan stop. The open flat is the contrast with the cave mouth. | Keep the aperture full size. Put kit on its exterior shoulders and one short interior return. Carry a muted salt-coloured band around the flat, darker wet shore below it and sparse vegetation only at its outer edge. Check the running rail against both light and shade. | Under hood toward daylight / Saltpan platform across pan |
| 5. Port Quay, leg4.ts after step 4 | Platforms, buffer ends and the breakwater make the harbour shape. | Retain that low silhouette. Echo Home's freight timber, crates and roof pigment on the existing town masses. Put bedded rock at the outer toe of the breakwater and keep the dock face straight. Leave sky between the train and the freight roofs. | From arriving car across quay / buffers looking back to platforms |
| 6. White Wall, leg5.ts | Six chalk islets and the deep span read as a distant continuous wall. Close collision masses sit beneath backdrop art. | Use the existing stepped horizon as the outline. Fit kit to the nearest exposed foot and give the rim a broken pale edge. Grass sits in sheltered hollows. Compare the near/far handoff from the moving train for double silhouettes or popping. | First south islet looking along line / deep span beneath wall |
| 7. Lantern Notch, leg6.ts | The halt frames a large opening and a small lantern stand. | Arrange broad kit courses around the existing opening. Keep its sky hole clean and the ground leading to the post darker than the post. Limit plants to either shoulder and use the existing light rig. | Canopy-side approach / halt toward lantern |
| 8. Causeway and Original Island, leg6.ts after step 7 | The low crossing leads to an arrival platform and meeting marker. | Let water show between existing bents. Use Ring's weathered rock and shore band at the abutment, then pick up the island's existing ground colour. Keep the landing modest enough that the marker reads at walking distance. | Bell-side outward ride / arrival platform toward marker |

- [x] **Card 1, Stack line and High Gorge.** Keep the clipped outlines, the rail bore and both sandstone cuts. On the approaching south stack retain the kit down to the eastern waterline. The rest of the perimeter uses the existing bedded backing face. The rim and pickup plinth share packed-earth pigment. Four small tufts flank the pickup without adding bodies. These twelve blade triangles share the backdrop draw. Their base is the same 85 m plane as the cap at all distances; the separate far-ground grid at steps 1, 2 and 4 does not own the cap.

**Trim decision.** Retain the 18 draws / 42,000 triangles desktop and 8 / 18,000 phone allowances. At the original halt, #2559 measured 188 → 194 draws and 433,150 → 533,254 triangles for its whole change. For this card, switch only the two instanced batches off and back on at a fixed camera. At both the halt and platform the two original batches contain 97,944 triangles. After trimming they submit 13,156, saving 84,788 triangles. The earth recolour adds zero triangles and the tufts add 12. At the historical halt this puts the full change at approximately +15,328 triangles over the pre-kit view (100,104 − 84,788 + 12), within the shared +70,000 allowance. That last figure is derived from the historical comparison. Current counts below are the contribution of the kit batches, including both faces and caps.

| Camera | Desktop before → after, draws / triangles | Phone before → after, draws / triangles |
|---|---|---|
| Platform toward rim | 2 / 97,944 → 2 / 13,156 | 2 / 97,944 → 2 / 13,156 |
| Original halt | 2 / 97,944 → 2 / 13,156 | 2 / 97,944 → 2 / 13,156 |

**Reference stills for the following cards.** Use seed `stack-laid-4`, fixed authored daylight, default FOV and the listed world-space eye → target in metres. Desktop is 1200 × 750. Portrait uses a 390 × 844 touch viewport, lowest Detail and 0.6 resolution on the desktop GPU. These are fixed views at platform or coach-eye height. Train positions can vary. Quiet-machine frame timing is deferred; not tested on a device.

| Read | Eye → target | Matched stills |
|---|---|---|
| Ring west frame outward | (1406.63,10.5,−820.04) → (1403,10,−860) | [Before](greybox-look/card1-before-ring.jpg) · [After](greybox-look/card1-after-ring.jpg) |
| Ring, from track at coach height | (1414.16,10,−819.23) → (1388.6,7.68,−892.63) | [Before](greybox-look/card1-before-ring-car.jpg) · [After](greybox-look/card1-after-ring-car.jpg) |
| Gorge approach, from track at coach height | (−31.19,6,−1926.27) → (−90.54,5,−1979.68) | [Before](greybox-look/card1-before-gorge-car.jpg) · [After](greybox-look/card1-after-gorge-car.jpg) |
| Arrival looking along the train | (−35,6,−1949) → (−103,19,−1988) | [Before](greybox-look/card1-before-arrival.jpg) · [After](greybox-look/card1-after-arrival.jpg) |
| Historical halt | (−132.55,5.5,−1999.03) → (−76,34,−2019) | [Before](greybox-look/card1-before-halt.jpg) · [After](greybox-look/card1-after-halt.jpg) |
| Platform toward stair and rim | (−105.7,6,−1987.3) → (−72,85,−2035) | [Before](greybox-look/card1-before-platform.jpg) · [After](greybox-look/card1-after-platform.jpg) |
| Rim toward powered pick | (−77,86.6,−2028) → (−74.35,85.65,−2032.62) | [Before](greybox-look/card1-before-rim.jpg) · [After](greybox-look/card1-after-rim.jpg) · [Portrait](greybox-look/card1-after-phone-rim.jpg) |

The platform frames the stair against sandstone. The pick sits 8 m inland by route decision 92, so the lip occludes it from the platform. The additional rim pose shows the yellow post against earth. The arrival still shows sky between the walls and stone behind the near locomotive. From Ring the local architecture fills the view along the rails; the water gap reads closer to the Gorge.

After step 1 establishes the reference still, steps 2, 3, 4, 6 and 7 may author their local files in parallel. Steps 5 and 8 follow their same-file predecessors. Integrate shared registry and generated catalogue changes serially. Take platform proofs seated at player height and repeat the approach on the train. Check the existing level validation and rail clearance for every slice. Match seed, pose, detail and daylight. Inspect in portrait too, particularly the Bell stair and the Notch opening.

## Cost envelope

Proposed **incremental** counts over the matching greybox camera, both colour and shadow passes, for all visible dressing combined. The tighter phone target preserves the dominant silhouette and shore value break, then sheds small vegetation, loose props and distant shadows first. Use existing sea, sky, fog, palettes and shared materials throughout. Mount near detail with its area and retain one coarse far outline. Avoid area-specific water or sky passes.

| Step | Desktop extra draws / triangles | Phone extra draws / triangles |
|---|---:|---:|
| Stack and Gorge | 18 / 42,000 | 8 / 18,000 |
| Incline and Bell | 18 / 36,000 | 8 / 15,000 |
| Canopy | 24 / 52,000 | 10 / 20,000 |
| Cave and Saltpan | 14 / 28,000 | 6 / 12,000 |
| Port Quay | 18 / 34,000 | 8 / 14,000 |
| White Wall | 16 / 40,000 | 6 / 15,000 |
| Notch | 12 / 24,000 | 6 / 10,000 |
| Causeway and arrival | 12 / 22,000 | 6 / 9,000 |

Across adjacent areas keep a single census camera within the cliff plan's +30 draws / +70,000 triangles. For **each row**, aim for CPU and GPU separately below 16.7 ms and no more than +1 ms in either p95 over a matched quiet baseline. These are planning allowances. At Port the historical quiet desktop mean was 11.63 ms CPU and 8.01 ms GPU, p95 14.09 and 9.66. Other route camera timings are unmeasured here. On HOTBOX ignore the roughly 18.2 ms callback interval. Alternate main and build three times on quiet hardware with identical settings. Record average and p95 for each clock independently. Report overlapping views at their actual combined cost.

The Windows phone profile already reached 14.153 ms CPU and 12.665 ms GPU at spawn and 11.785 / 9.822 at the head. That is profile evidence on a desktop GPU. M4 iPad Pro is the target floor and phones are best effort. The existing Detail ladder lowers resolution to 0.6?, simplifies the sea, drops sun shadows and finally disables MSAA on reload. Give the approach a readable silhouette on each rung. For verification, compare the same arrival in portrait, then measure on hardware when available. **Not tested on a device.** [Port profile](../reports/port-quay-frame-profile.md) · [streaming checkpoint B](world-streaming.md) · [cliff kit budgets and step 11](cliff-kit-everywhere.md).

## Design review (2026-11-27)

| Call | Kind | Basis |
|---|---|---|
| Dress the established playable footprint, including both branch orders. | Decided | [Greybox route, 11 November](greybox-route.md). Port needs the same local arrival cues when a player reaches it before Canopy. |
| Use the cliff kit and cooler packed-earth pigment at the path edge. | Decided | [Terrain ruling, 14 November](../decisions-look.md). |
| Give the existing arrival landmark first visual emphasis in each card, beginning at the Stack line. | Default | Each proof pair tests a distance read and a working-distance read. Pigment and foliage can change independently of collision. |

**Finding affecting step 8.** The landing already frames the lighthouse and green island beyond two pale decks. Limit step 8 to the approach and abutment so the lighthouse keeps its place on the skyline.

**Finding affecting step 2.** At lower Bell the stair, station board and bright markers compete in one view. Step 2 puts texture on the rock shoulders and keeps the working platform quiet.

**Decided.** The 11 November greybox direction and the 14 November terrain ruling establish the playable footprint and the packed-earth/kit treatment. Preserve every existing stand-in, including Gorge vertical play, salt sliding, crystal collars, Canopy's town, glide and ending. Keep the owner's story, names, characters and The Boogler's lines. Use the built Home and Ring kit as reference. New art derives from the game's own assets. [Route](greybox-route.md) · [look decisions](../decisions-look.md) · [owner calls](../agents/owner-calls.md).

**Default.** The first read at each halt is the existing route feature named in the proof pair. Reinforce it with value and negative space. The proposed dressing order and geometry allocations are reversible. This serves DESIGN's “Telegraph everything”: a rider can spot the next place, while someone carrying freight can still see the working edge. Test both views. No New gameplay call.

- How much of the Gorge gets finished first? Dress one sea-facing stack and one rim return, compare at Ring and on arrival, then repeat the treatment.
- How distinct should Saltpan and the Wall be at distance? Give Saltpan a low horizontal shore band and the Wall a broken high rim. Use the same chalk family.
- How much town detail before the town design? Roof and freight-edge treatment on existing masses only. Revisit doors, occupied interiors and inhabitants with the owner’s town design.
- Should the ending acquire a special sky or moving set piece? Keep its existing sky and meeting marker. Spend the visual budget on a clean arrival silhouette.

## Census stills

The table combines fresh captures marked below with inspected leg and cold-jump reports from main. The fresh platform probes below supplement those route views. The first Canopy and Port platform cameras intersected foreground geometry. Offset the camera behind the landing spot when repeating these views.

| Approach | What the frame shows |
|---|---|
| [Gorge halt](greybox-look/gorge-reached.jpg) and [fresh Wall-side return](greybox-look/wall-return.jpg) | A white diagonal crosses a largely unbroken dark face. On the return the parallel platform edges converge between two tall slabs. Preserve that difference between the side and end views. |
| [Bore exit](greybox-look/step4-bore-out.jpg) and [Bell lower stop](greybox-look/step4-bell-lower.jpg) | The bright opening outlines the red cab. Below, the station board overlaps the white stair and the upper deck nearly disappears against sky. |
| [Canopy from the car](greybox-look/step6-canopy-train-in-cleft.jpg) and [fresh Canopy platform](greybox-look/canopy-platform.jpg) | Pale cleft sides frame dark straight trunks. Daylight already separates the upper crown from the rail corridor. |
| [Cave hood](greybox-look/under-hood.jpg) and [Saltpan stop](greybox-look/saltpan-stop.jpg) | A flat brown soffit fills the top of the cave frame. At the stop, the train stands out against a broad green plane where the salt apron could read. |
| [Fresh quay platforms](greybox-look/quay-platforms.jpg) | A long pale ramp crosses a single ochre mass. Keep the rail and ramp legible while breaking up the mass at freight-building scale. |
| [Beneath the White Wall](greybox-look/step5-under-wall.jpg) | A straight dark lip hangs above blue water. Repeated narrow supports make the wall look thinner at close range than it does on the horizon. |
| [Fresh Notch approach](greybox-look/notch-reached.jpg) | Two pale uprights crop the sky to a vertical slot. The near post and Buddy establish the scale of the proposed rock courses. |
| [Fresh island landing](greybox-look/island-platform.jpg) | The bare platforms lead toward an already colourful beach, palms and lighthouse. Dress only the approach and its abutment. The classic island already supplies the arrival view. |

[Fresh Gorge platform, seaward](greybox-look/high-gorge-seaward.jpg). At player height the two dark slab ends almost touch the horizon. Keep the water gap when dressing their feet. On this pose the count probe reported 188 draws and 433,150 triangles with Gorge resident. This capture ran under load.

[West landing](greybox-look/west-landing.jpg). The existing timber jetty, green Home bank and shallow turquoise water already surround the pale landing. Carry the jetty timber onto its working edge, with room for the rack and board to read from the approach.

[Fresh lower Bell](greybox-look/bell-lower-live.jpg) and [fresh Saltpan flat](greybox-look/saltpan-flat.jpg). At Bell the bright interact markers, locomotive and ramp all occupy the lower station view. Concentrate detail above the work surface. At Saltpan the exposed flat fills the foreground while distant land nearly disappears into haze. A shallow colour change across the ground can identify this stop even at phone detail.