# Boiler, saddle and cart art — 5 November

> **Verdict:** Presentation pass on the boiler, saddle and cart before the round-4 replay.
> **Top recommendations:** none; presentation work record before the round-4 replay.
> **Status:** reference.

Owner-authorized presentation work before the round-4 replay, on this worktree only; coordinator reviews and merges. Principles: **Telegraph everything** and **Show, don't tell**. No gameplay, collision, placement, cargo capacity, unlock, copy or motion-authority changes.

## Measured brief

Question: do the boiler's two bands explain its empty receiver, and does the cart read as a connected, low push cart with real supported cargo at play distance?

References opened: `/Users/matiasfranco/Developer/boogle-daily/.look/previz/boiler-cart/shot-{1..6}.png` and `board.md`; the four `docs/research/asset-captures/{boiler,pedestal,first-train,cart}/parts.png` captures. Generated views guide broad bevels, material blocks and joints; code and capture dimensions govern size. The sheet's pedestal is too narrow, its cart shows two lanes instead of the game's four logs per row, and its train roof supports vary across views. Keep measured envelopes and cargo positions.

| Part | Measured contract and source |
| --- | --- |
| Boiler | `carry-models.ts`: barrel radius .55, length 1.5; band radius .57, width .14, centres Z ±.5; chimney .16/.2 radius, .5 high, centre [0,.62,-.4]. Bounds 1.14 × 1.44 × 1.5 m. |
| Pedestal | `props.ts`: eight-sided .6 m high plinth, radii 1.15/1.3; centre remains BY+.3. |
| Train shell | `look-kit.ts`: chassis 1.6 × .2 × 3 at Y .6; cab 1.5 × 1.18 × 1 at [0,.82,-1]; roof 1.72 × .1 × 1.2 at [0,2,-1]; bumper 1.4 × .32 × .24 at [0,.36,1.58]. Boiler centre [0,1.2,.5], rotated π about Y. |
| Cart | `layout.ts` / `depot.ts`: half-width .75, half-length 1.35, deck top .55; wheel radius .2 at X ±.5, Y .2, Z ±1; grip centre [0,1.05,-1.45]. Existing load: four log centres X ±.15/±.45, bottom row Y .70, Z 0. |

Axes: metres, +Y up, +Z longitudinal; game `(x,y,z)` → Blender `(x,-z,y)`, Y-up GLB export. Boiler pivot remains barrel centre; other pivots retain the existing code origins. Inferred choices: 10–30 mm bevels, solid saddle feet, roof supports within the old envelope, connected short handle uprights, shallow cross-bearers around the existing logs. No rivets, gauges, grain textures, new lights or post effects.

Canonical recipe: `assets/src/boiler-cart.py`, with shared boiler/band/saddle constants. Fixed shell pieces merge by material; existing train wheels and rods remain game-owned. Declared motion: rigid shells only; cart travels with its existing car, boiler follows existing carry/fit transforms. Sparse Local motes use the existing particle pool while waiting on the pedestal, with no bobbing or pre-wake chimney smoke. No lockstep math is changed.

Initial ceilings: 3,000 triangles and four main material draws per shell; one pedestal draw; 100 KiB total compressed kit. Geometry is closed solids, with intentionally separate intersecting construction parts. Retain recipe/build hashes, decoded bounds/topology, baseline/final manifests, matched Buddy stage views and close/play-distance game views. Shared-machine timings and frame numbers are not performance evidence. One initial build and at most two diagnosed repairs.

## Evidence and assessment

Baseline commit: `6a46755d6136e0f51b73d2fdb6f12a9371333291`. Final recipe is revision 2, after two diagnosed repairs. No further art iteration is authorized in this pass.

| Rigid part | Triangles before → after | Main draws before → after | Shadow draws before → after |
| --- | --- | --- | --- |
| Boiler | 176 → 368 | 4 → 3 | 4 → 3 |
| Pedestal | 32 → 92 | 1 → 1 | 1 → 1 |
| Train shell, excluding unchanged wheels/rods | 336 → 1,100 | 6 → 3 | 4 → 3 |
| Empty cart, excluding unchanged cargo | 208 → 1,336 | 8 → 4 | 1 → 4 |
| Total | 752 → 2,896 | 19 → 11 | 10 → 11 |

Before numbers are exact Three primitive index counts and mesh/shadow code paths at the baseline. After numbers are decoded built-GLB counts and actual backend draw attribution in the three close views. These are per-prop counts, not a matched whole-scene or performance comparison. Motes share the existing particle draw. The entire kit is 33,508 bytes, seven materials, no textures or animation clips. Roundtrip inspection reports zero degenerate triangles, invalid normals, boundary edges and non-manifold edges for all final parts. Intersecting closed construction pieces are intentional; this is no collision-hull replacement. Quantized boiler dimensions are 1.1400 × 1.4400 × 1.5000 m; cart 1.5800 × 1.0802 × 2.8400 m. The pedestal bevel trims its extreme corners to 2.5686 m inside the original 2.6 m envelope. Train-shell bounds exclude its existing wheels.

Repair ledger: r0's chassis hid the saddle bottoms and its cart deck hid the bearer bases. R1 recessed the interior surfaces within existing outer bounds, exposing both, without changing prop origins, cargo transforms or collision. R1 inspection found thin-bevel degenerates and coincident joined edges. R2 thickened the recessed plate and overlapped construction joins by 2–4 mm; the measured topology defects are now zero and the U openings remain clear. No custom motion was added. Build used Blender 5.2.1 LTS / Node 24.11.1; final checks use Node 26.13.0. Recipe has no imported helper dependency. Source/build/tool/lockfile hashes and retained revisions are in `.look/boiler-cart/numbers.json` and the review evidence bundle. Service cost is zero; token cost is unavailable. Shared-machine elapsed times are deliberately not performance evidence.

Opened all six previz images, all four real part close-ups, r0 four-view clay/parts/wire/material sheets for each prop, and both repaired train/cart sheets. Opened every final stage and close/play-distance game still listed below, the fitted train, the boiler mote sheet and four consecutive encoded mote frames, and the carry/control consecutive and full-cycle sheets plus four encoded carry frames. Observations: the red barrel and golden bands retain the previz identity; the pedestal remains wider/taller than the generated sheet because measured source wins. Both empty U receivers and the roof supports read clearly. The fitted boiler aligns with them. The cart grip is connected, its empty bearers remain visible, and one-log/24-log views retain physical counted cargo. Motes are tiny and sparse; they are subtle at play distance.

| Final evidence | Broker manifest |
| --- | --- |
| Boiler, pedestal, close/motes and attributed draws | [manifest](../../.look/evidence/1793910006462-15251/evidence.json) |
| Boiler and pedestal beside Buddy | [manifest](../../.look/evidence/1793910007649-15299/evidence.json) |
| Train close and attributed draws | [manifest](../../.look/evidence/1793910025037-15759/evidence.json) |
| Train shell beside Buddy; game owns wheels/rods | [manifest](../../.look/evidence/1793910041571-16016/evidence.json) |
| Cart one-log close and attributed draws | [manifest](../../.look/evidence/1793910057813-16275/evidence.json) |
| Empty cart beside Buddy | [manifest](../../.look/evidence/1793910073529-16750/evidence.json) |
| Boiler play distance | [manifest](../../.look/evidence/1793910088786-16936/evidence.json) |
| Train play distance | [manifest](../../.look/evidence/1793910119616-17767/evidence.json) |
| Cart play distance, 24 counted logs | [manifest](../../.look/evidence/1793910144812-15250/evidence.json) |
| Boiler fitted in the unchanged receiver transform | [manifest](../../.look/evidence/1793910180205-19738/evidence.json) |
| Played carry cycle | [manifest](../../.look/evidence/1793910104536-17254/evidence.json) |
| Buddy raw Walk_Loop control | [manifest](../../.look/evidence/1793910153227-18716/evidence.json) |

The carried boiler stays rigid and readable through the sampled cycle. The played adapter flagged one initial lowerarm_r rotation jump of .673 rad; raw Buddy control flagged none. Carry offsets, pose and animation code are unchanged. The initial carry blend, actual hand contact and real-time feel need a quiet owner rerun; frame numbers/wall times under this shared load are not cadence evidence. Train/cart rigid shells have no authored animation; their game-owned travel, wheels and rods were retained, not retuned or independently proven smooth. No new sync scenario is warranted by this presentation-only diff.

The baseline full solo bot reached every expected beat with no errors, but its manifest was invalidated by adding this brief during the run. It is not a clean baseline verification. Three capture setup failures were retained: treating a plain position as a Three vector; searching the carried boiler under its pre-carry name; and passing typed arrays between stage/game realms. The final fixtures correct these, and all listed final captures pass WebGPU health. Final `npm run check` and the committed-tree solo replay are recorded in the review/launcher handoff; do not infer their results from the earlier baseline. No Boogler lines were edited or identified as suspect. No ROM data was used.

Owner question for the replay: does the empty golden receiver make the boiler's destination obvious at normal play distance? Stop here for that judgment; not tested on a device.

Process departure: `npm run inflight` was run before recognizing its unconditional origin fetch, violating this task's local-only network boundary. No further external network operations are permitted; no push or ship.
