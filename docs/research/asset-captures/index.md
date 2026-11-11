# Main prop reference captures — 5 November 2026

17 assets, each with four individual 640 × 400 views, a 1280 × 280 identity sheet, a 1280 × 440 two-part close-up panel, and one 640 × 400 context JPEG. These are existing game geometry references, not generated concepts or approved replacement designs.

## Capture method and limits

- Used the existing broker and same-origin /character/ stage. Buddy/conductor and recovery rack use their catalogue entries. Other assets use static copies of their actual factory/scene geometry in that stage; no game source, source assets, dialogue or saved owner state changed.
- Front = local +Z, Side = +X, Back = −Z; Three-quarter adds elevation. The bench is oriented toward its seat. Each asset keeps one camera distance, FOV (25°), viewport and pose across its four identity views. Scale is consistent **within** each asset, not between differently sized assets. Source dimensions below are the ruler.
- Flat neutral studio: hemisphere 2, directional key 0.8, shadows/grid/floor hidden. Built stage assets retain their materials. Scene copies preserve geometry, base/vertex colours and maps, with neutral roughness 0.85 and metalness 0; custom rust/grain/emission nodes are not reproduced. Context retains the game renderer. These are geometry/identity references, not a material-match test.
- Scene setup uses the existing trains development stage, completed forge and a closed quarry gate in a disposable solo run. The cart, boiler and locomotive were arranged for inspection. Buddy/cap, both axes and recovery rack context are staged reference placements; workshop context is a shell-hidden cutaway. No bot progression or owner round-4 replay is established.
- Native stage bounds are used for Buddy/rack. Other measured bounds come from visible vertex positions after instance extraction and orientation. Bounds include the captured pose and attachments; they are **not collider dimensions**. Stock, helper labels and unrelated surrounding pieces are excluded as described per asset.
- [capture-records.json](capture-records.json) retains exact captured bounds, framing and inspection draw counts. Counts belong to unbatched inspection copies and the stage output pass, **not gameplay performance**. Shared-machine timing/frame-rate logs were not used as evidence. Motion, smoothness and performance need a quiet rerun if requested; not tested on a device.

## Verification and provenance

Visual question: do fixed-scale front/side/back/three-quarter views expose the complete silhouette, and do close-ups show the parts a modeller needs to preserve? Three visual rounds corrected floor clipping, multi-worker extraction, gate earthworks/chest-stand contamination, front orientation and context occlusion. All 17 final sheets and parts panels, plus their context images, were opened with view_image in grouped inspection boards. The final source tree produced healthy WebGPU captures, with no page/console/graphics errors.

The full platform is necessarily small in its fixed-scale end views; use the individual Side and parts panel. The worker's gameplay context has real step occlusion. Staged axe context shows the tool clearly as a display, not an animation. No suspect Boogler lines were identified or edited. No bot or scenario was run; no bot failures are claimed.

- [Final views manifest](../../../.look/evidence/1793907382004-59284/evidence.json) — all final identity/parts images; most contexts.
- [Earlier context manifest](../../../.look/evidence/1793906950895-51938/evidence.json) — selected axe, bench and platform contexts, same game source tree.
- [Second visual round](../../../.look/evidence/1793907222437-56393/evidence.json) — retained inspection history, not selected final images.
- Setup failures retained: [invalid one-frame request](../../../.look/evidence/1793906534428-47489/evidence.json), [missing action clock](../../../.look/evidence/1793906758636-50762/evidence.json), [cross-frame attribute attempt 1](../../../.look/evidence/1793906800176-51061/evidence.json), [attempt 2](../../../.look/evidence/1793906866713-51493/evidence.json). These were capture setup failures, not bot results.

Broker evidence is local and ignored by Git; the launcher handoff carries it. Final capture action and extracted originals are also copied beside the final manifest. Checked-in PNGs are losslessly recompressed; context JPEGs use quality 87. The four reused contexts are named in capture-records.json. npm run inflight was not run because it unconditionally fetches origin, forbidden by this task's local-only network boundary. No push or ship.

Validation: `npm run check` passed under Node 26.13.0 (lint, typecheck, unit tests, registry, level audit, asset validation and production build). The capture source was commit `10dc567b81367d792e8a0bb59668e5d2101e3a66`, tree `24b663e2825c029d4e4746182acc77df33643d1b`; only this documentation/capture bundle was added afterwards. Image dimensions/decoding and every index link were checked locally. The 119 images total 1,994,605 bytes.

## Assets

### Buddy with conductor cap

Sources: [assets/src/buddy.py](../../../assets/src/buddy.py), [assets/src/conductor-cap.py](../../../assets/src/conductor-cap.py), [character/buddy-preview.ts](../../../character/buddy-preview.ts).

Code dimensions (metres): Buddy head centre y=1.36; head radii 0.29 × 0.27 × 0.27; unposed crown 1.63. Cap drum radii 0.270/0.252, height 0.175; peak extension 0.105. The cap is the separate conductor-cap GLB attached to Head, not the older built-in hat.

Captured visual bounds, X × Y × Z: **0.908 × 1.633 × 0.706 m**.

Character parts: Round head, oval eyes, short limbs and broad feet; navy drum, brass band, short peak and raised badge.

Actual /character/ Buddy + conductor attachment at Idle_Loop t=0. Context is a static baked stage figure placed beside the gift shelf for comparison, not an earned/equipped gameplay proof.

[Identity sheet](buddy-conductor/sheet.png) · [Part close-ups](buddy-conductor/parts.png) · [Context](buddy-conductor/context.jpg) · [Front](buddy-conductor/front.png) · [Side](buddy-conductor/side.png) · [Back](buddy-conductor/back.png) · [Three-quarter](buddy-conductor/three-quarter.png)

### Starter axe

Sources: [src/proto/place/axe-models.ts](../../../src/render/axe-models.ts).

Code dimensions (metres): Shaft 0.07 × 0.64 × 0.07; cheek width 0.25, height 0.18, depth 0.085; bevel 0.008.

Captured visual bounds, X × Y × Z: **0.110 × 0.688 × 0.277 m**.

Character parts: Dark flared cheek, metal eye and plain wood shaft.

Plain starter variant, without the multi-tool pick. +Y follows the shaft; blade faces −Z, so Side reveals the broad cheek. Context is a clearly staged tool display beside the gift shelf, not a swing or grip validation.

[Identity sheet](axe-starter/sheet.png) · [Part close-ups](axe-starter/parts.png) · [Context](axe-starter/context.jpg) · [Front](axe-starter/front.png) · [Side](axe-starter/side.png) · [Back](axe-starter/back.png) · [Three-quarter](axe-starter/three-quarter.png)

### Proper axe

Sources: [src/proto/place/axe-models.ts](../../../src/render/axe-models.ts).

Code dimensions (metres): Shaft 0.07 × 0.80 × 0.07; cheek width 0.36, height 0.24, depth 0.10; gold edge 0.118 × 0.26 × 0.025.

Captured visual bounds, X × Y × Z: **0.125 × 0.866 × 0.391 m**.

Character parts: Larger pale steel cheek, gold cutting strip, metal eye and wood handle.

Plain proper variant, without the multi-tool pick. Context is a staged tool display beside the gift shelf, not a swing or grip validation.

[Identity sheet](axe-proper/sheet.png) · [Part close-ups](axe-proper/parts.png) · [Context](axe-proper/context.jpg) · [Front](axe-proper/front.png) · [Side](axe-proper/side.png) · [Back](axe-proper/back.png) · [Three-quarter](axe-proper/three-quarter.png)

### Cart

Sources: [src/proto/place/depot.ts](../../../src/proto/place/depot.ts), [src/proto/place/layout.ts](../../../src/place/layout.ts).

Code dimensions (metres): Deck 1.5 × 0.12 × 2.7; deck top y=0.55. Sideboards 0.08 thick × 0.32 high; wheel radius 0.20, thickness 0.08. Rear pushbar y=1.05, z=−1.45.

Captured visual bounds, X × Y × Z: **1.580 × 1.080 × 2.840 m**.

Character parts: Low wood tray, four dark wheels and pale rear pushbar.

Empty cart, actual cart root from cartFolk(). Context looks down on its track to avoid the adjacent shelter. The detached-looking pushbar is present in the current model; no support geometry was invented.

[Identity sheet](cart/sheet.png) · [Part close-ups](cart/parts.png) · [Context](cart/context.jpg) · [Front](cart/front.png) · [Side](cart/side.png) · [Back](cart/back.png) · [Three-quarter](cart/three-quarter.png)

### Delivery rack

Sources: [src/proto/place/depot.ts](../../../src/proto/place/depot.ts).

Code dimensions (metres): Log bearers 1.6 × 0.16 × 0.20 at z=±1.1; posts 0.14 × 1.3 × 0.14 at x=±0.8. Rail bay offset +2 X; rail bearers 1.6 × 0.24 × 0.24; stops 0.12 × 0.6 × 0.16.

Captured visual bounds, X × Y × Z: **3.730 × 1.300 × 2.440 m**.

Character parts: Tall log cradle beside lower rail bearers; deliberately unequal bay heights.

Empty rackLook assembly, including both bays. Stock and floating service label excluded from isolation; actual rack location retained in context.

[Identity sheet](delivery-rack/sheet.png) · [Part close-ups](delivery-rack/parts.png) · [Context](delivery-rack/context.jpg) · [Front](delivery-rack/front.png) · [Side](delivery-rack/side.png) · [Back](delivery-rack/back.png) · [Three-quarter](delivery-rack/three-quarter.png)

### Boiler

Sources: [src/proto/place/carry-models.ts](../../../src/render/carry-models.ts), [src/proto/place/props.ts](../../../src/proto/place/props.ts).

Code dimensions (metres): Barrel radius 0.55, length 1.50. Bands radius 0.57, width 0.14 at z=±0.5. Stack top/bottom radius 0.16/0.20, height 0.50, centre y=0.62/z=−0.4.

Captured visual bounds, X × Y × Z: **1.140 × 1.440 × 1.500 m**.

Character parts: Faceted red barrel, two brass bands and short dark chimney.

Actual pedestal boiler in context. The locomotive is separately displayed with its boiler installed; these are staged reference states, not simultaneous progression evidence.

[Identity sheet](boiler/sheet.png) · [Part close-ups](boiler/parts.png) · [Context](boiler/context.jpg) · [Front](boiler/front.png) · [Side](boiler/side.png) · [Back](boiler/back.png) · [Three-quarter](boiler/three-quarter.png)

### Boiler pedestal

Sources: [src/proto/place/props.ts](../../../src/proto/place/props.ts).

Code dimensions (metres): Octagonal cylinder: top radius 1.15, bottom radius 1.30, height 0.60.

Captured visual bounds, X × Y × Z: **2.600 × 0.600 × 2.600 m**.

Character parts: Low tapered stone plinth with eight broad faces.

Isolated stand only; context retains the boiler and forge apron.

[Identity sheet](pedestal/sheet.png) · [Part close-ups](pedestal/parts.png) · [Context](pedestal/context.jpg) · [Front](pedestal/front.png) · [Side](pedestal/side.png) · [Back](pedestal/back.png) · [Three-quarter](pedestal/three-quarter.png)

### First train locomotive

Sources: [src/proto/place/look-kit.ts](../../../src/place/look-kit.ts), [src/proto/place/rail.ts](../../../src/proto/place/rail.ts), [src/proto/wagon/look.ts](../../../src/render/wagon-look.ts), [assets/src/place-kit.py](../../../assets/src/place-kit.py).

Code dimensions (metres): Physical footprint 1.6 × 3.0, rideable top 1.75. Frame 1.6 × 0.20 × 3; cab 1.5 × 1.18 × 1; roof 1.72 × 0.10 × 1.2. Wheel radius 0.36.

Captured visual bounds, X × Y × Z: **1.720 × 1.920 × 3.300 m**.

Character parts: Red cab, flat dark roof, red/gold boiler, brass saddles, side rods and dark wheels.

L1.train.tr.cars[0] at the first stop. Includes its four wheels extracted from the scene-global train wheel batch. Boiler made visible for the complete-locomotive reference.

[Identity sheet](first-train/sheet.png) · [Part close-ups](first-train/parts.png) · [Context](first-train/context.jpg) · [Front](first-train/front.png) · [Side](first-train/side.png) · [Back](first-train/back.png) · [Three-quarter](first-train/three-quarter.png)

### Passenger wagon

Sources: [src/proto/place/look-kit.ts](../../../src/place/look-kit.ts), [src/proto/place/rail.ts](../../../src/proto/place/rail.ts), [src/proto/wagon/look.ts](../../../src/render/wagon-look.ts), [assets/src/place-kit.py](../../../assets/src/place-kit.py).

Code dimensions (metres): Physical footprint 2.2 × 3.2, rideable deck top 0.70; wheel radius 0.22. Uses flat_deck and flat_black kit geometry.

Captured visual bounds, X × Y × Z: **3.130 × 1.900 × 3.200 m**.

Character parts: Timber deck, black underframe, small wheels, end rails and two teal-backed seats.

L1.train.tr.cars[1], the passenger wagon; includes its four shared-batch wheels. The visual envelope exceeds the collider footprint because of rails and seating.

[Identity sheet](wagon/sheet.png) · [Part close-ups](wagon/parts.png) · [Context](wagon/context.jpg) · [Front](wagon/front.png) · [Side](wagon/side.png) · [Back](wagon/back.png) · [Three-quarter](wagon/three-quarter.png)

### Village station platform

Sources: [src/proto/place/halts.ts](../../../src/proto/place/halts.ts), [src/proto/place/index.ts](../../../src/proto/place/index.ts).

Code dimensions (metres): Village platform runs s=8 to s=30: deck length 22, width 2.5, thickness 0.5. Shelter posts 3.2 high; roof 2.7 × 0.14 × 8.4; signal mast 4.4 high.

Captured visual bounds, X × Y × Z: **9.083 × 5.801 × 33.867 m**.

Character parts: Red shelter roof, yellow edge stripes, timber bench, red signal arm and three approach ramps.

Complete Village halt geometry including ramps and signal; label sprite excluded. Front is the local +Z line direction, so the platform is end-on. Side and close-ups explain the long assembly.

[Identity sheet](station-platform/sheet.png) · [Part close-ups](station-platform/parts.png) · [Context](station-platform/context.jpg) · [Front](station-platform/front.png) · [Side](station-platform/side.png) · [Back](station-platform/back.png) · [Three-quarter](station-platform/three-quarter.png)

### Station bench

Sources: [src/proto/place/halts.ts](../../../src/proto/place/halts.ts).

Code dimensions (metres): Seat 0.56 × 0.10 × 3 at y=0.42; back 0.10 × 0.50 × 3 at y=0.50. Two supports 0.50 × 0.42 × 0.16.

Captured visual bounds, X × Y × Z: **3.000 × 1.000 × 0.600 m**.

Character parts: Long simple wood seat and back, supported by two stout legs.

Four actual platform instances isolated; rotated so Front faces the seat. Context is the earlier unobstructed front-side camera from the same source tree.

[Identity sheet](bench/sheet.png) · [Part close-ups](bench/parts.png) · [Context](bench/context.jpg) · [Front](bench/front.png) · [Side](bench/side.png) · [Back](bench/back.png) · [Three-quarter](bench/three-quarter.png)

### Forge shell

Sources: [src/proto/place/forge.ts](../../../src/proto/place/forge.ts), [src/proto/place/layout.ts](../../../src/place/layout.ts), [src/proto/place/building-plans.ts](../../../src/place/building-plans.ts).

Code dimensions (metres): Wall footprint 10 × 8; wall height 4.6; roof rise 2.1. Foundation footprint in code includes an apron of 0.8 per side: 11.6 × 9.6.

Captured visual bounds, X × Y × Z: **12.400 × 10.700 × 9.135 m**.

Character parts: Timber posts and wall panels, dark pitched roof, ridge trim and tall brick chimney.

Completed construction set isolated, including chimney; surrounding crane, output stock, separate foundation/colliders and workshop furnishings are not part of this isolated shell. Context includes the surrounding forge area.

[Identity sheet](forge/sheet.png) · [Part close-ups](forge/parts.png) · [Context](forge/context.jpg) · [Front](forge/front.png) · [Side](forge/side.png) · [Back](forge/back.png) · [Three-quarter](forge/three-quarter.png)

### Forge workshop fittings

Sources: [src/proto/place/workshop.ts](../../../src/entities/town/workshop.ts).

Code dimensions (metres): Floor 9.7 × 0.05 × 7.7 at forge base +0.5. Doorway width 2.8, x=−2.9. Furnace 2.8 × 1.8 × 0.65; front guard 3.3 × 1.2 × 0.16.

Captured visual bounds, X × Y × Z: **9.700 × 2.400 × 9.550 m**.

Character parts: Left entry steps, broad floor, brick furnace, blue-grey guards and teal-backed chair.

Interior fittings without the forge shell. Context is an inspection cutaway with the shell hidden, not the normal outside gameplay camera. Neutral material copies suppress emission and weathering; use source/context for those effects.

[Identity sheet](workshop/sheet.png) · [Part close-ups](workshop/parts.png) · [Context](workshop/context.jpg) · [Front](workshop/front.png) · [Side](workshop/side.png) · [Back](workshop/back.png) · [Three-quarter](workshop/three-quarter.png)

### Quarry switch gate

Sources: [src/proto/place/tech.ts](../../../src/proto/place/tech.ts), [src/proto/place/tech-layout.ts](../../../src/place/tech-layout.ts).

Code dimensions (metres): Slab 6.4 × 5.4 × 0.9. Jambs 1.1 × 6.2 × 1.1; lintel 8.6 × 0.5 × 1.4, top y=6.7.

Captured visual bounds, X × Y × Z: **8.600 × 6.700 × 1.510 m**.

Character parts: Paired recessed stone leaves, vertical trims, round brass seal, teal centre and narrow horizontal seam.

Closed quarry gate: frame plus slab. Route earthworks, survey stakes and remote chest stands excluded from isolated bounds. Context includes the nearby chain/winch.

[Identity sheet](switch-gate/sheet.png) · [Part close-ups](switch-gate/parts.png) · [Context](switch-gate/context.jpg) · [Front](switch-gate/front.png) · [Side](switch-gate/side.png) · [Back](switch-gate/back.png) · [Three-quarter](switch-gate/three-quarter.png)

### Turntable

Sources: [src/proto/place/lines.ts](../../../src/proto/place/lines.ts), [src/proto/place/layout.ts](../../../src/place/layout.ts).

Code dimensions (metres): Diameter 9.6; disc thickness 0.24; rim width 0.28. Timber bar 1.5 × 0.08 × 9.3; rails 0.10 × 0.10 × 9 at x=±0.63.

Captured visual bounds, X × Y × Z: **9.600 × 0.380 × 9.600 m**.

Character parts: Low round stone disc, pale rim, brown crossbar and paired dark rails.

Exported disc group. Front/side/back are intentionally thin edge profiles; Three-quarter and details reveal the top construction.

[Identity sheet](turntable/sheet.png) · [Part close-ups](turntable/parts.png) · [Context](turntable/context.jpg) · [Front](turntable/front.png) · [Side](turntable/side.png) · [Back](turntable/back.png) · [Three-quarter](turntable/three-quarter.png)

### Little-guy hammer worker

Sources: [src/proto/place/folk.ts](../../../src/place/folk.ts).

Code dimensions (metres): Body nominally ~0.95 high. Head radii 0.27/0.25/0.26 at y=0.68; coat radii 0.23/0.26/0.20; hat dome radii 0.285/0.18/0.275 at y=0.81.

Captured visual bounds, X × Y × Z: **0.631 × 1.232 × 0.818 m**.

Character parts: Oversized head and soft hat, black eyes, rosy cheeks, small boots, coloured coat and square hammer.

One visible red worker, extracted from heads/coats/limbs/held instance slots. Captured bounds include the raised hammer. Context retains the real forge steps, which partly occlude the lower body; isolation shows the complete worker.

[Identity sheet](little-guy/sheet.png) · [Part close-ups](little-guy/parts.png) · [Context](little-guy/context.jpg) · [Front](little-guy/front.png) · [Side](little-guy/side.png) · [Back](little-guy/back.png) · [Three-quarter](little-guy/three-quarter.png)

### Recovery rack

Sources: [assets/src/recovery-rack.py](../../../assets/src/recovery-rack.py), [character/descriptors.ts](../../../character/descriptors.ts).

Code dimensions (metres): Roof width 2.04, depth 1.36; nominal peak 1.63 × 1.23 = 2.0049. Posts at x=±0.78/z=±0.48, section 0.20; bed top 0.38; logs radius 0.20, length 0.94.

Captured visual bounds, X × Y × Z: **2.040 × 1.998 × 1.360 m**.

Character parts: Asymmetric roof peak, six roof boards, four leaning posts, rear diagonal brace, broad chamfers and three exposed log ends.

Actual /character/ recovery-rack GLB. Unplaced in gameplay on this tree. Context is a labelled-by-this-index static placement beside the gift shelf for scale/material reference only; no stock, collision or gameplay integration is implied.

[Identity sheet](recovery-rack/sheet.png) · [Part close-ups](recovery-rack/parts.png) · [Context](recovery-rack/context.jpg) · [Front](recovery-rack/front.png) · [Side](recovery-rack/side.png) · [Back](recovery-rack/back.png) · [Three-quarter](recovery-rack/three-quarter.png)
