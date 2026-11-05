# Post-look round two — 4 November 2026

**My visual pick is Drawn toys: dark ink .8, width 2, toys 1.** Round one's ranking undersold outlines on toys. The rack, boots and shop become readable drawn objects once cliff triangulation is excluded. **Keep Current as the production default:** both finalists are expensive and their fine lines crawl.

| Rank | Look                             | Worst failure                                                                      |
| ---- | -------------------------------- | ---------------------------------------------------------------------------------- |
| 1    | Drawn toys                       | Hat seams become busy, crawling wirework; substantial GPU cost.                    |
| 2    | Drawn + air (.012 haze, .45 cap) | Better distant separation, but the bridge and cliffs turn grey.                    |
| 3    | Tinted .8 / 2 px                 | Softer colour integration, less decisive toy silhouettes.                          |
| 4    | Current                          | Shop inventory merges together at normal play distance.                            |
| 5    | Haze alone                       | Depth improves without improving the nearby toys; .06/.9 washes out the town.      |
| 6    | Shade colour                     | 1.5 is restrained; 3 cools cream walls; 8 makes Buddy yellow-green and walls cyan. |

Boards: [1 Separation](post-look-round2/01-separation.png) · [2 Ink brackets](post-look-round2/02-outlines.png) · [3 Haze](post-look-round2/03-haze.png) · [4 Shade](post-look-round2/04-shade.png) · [5 Combination](post-look-round2/05-combination.png) · [6 Water](post-look-round2/06-water.png) · [7 Town motion](post-look-round2/07-motion-town.png) · [8 Shore motion](post-look-round2/08-motion-shore.png) · **[9 Final choice](post-look-round2/09-summary.png)**.

Two beats and one water check: Town uses the measured 5.2 m play-camera arm/62° FOV; close Buddy and shore are fixtures. Native crops, lossless PNG, at most three columns. Exposure/pose are fixed; live residents/water are excluded from still metrics. Motion PNGs retain video compression.

**Separation works by owner, without per-asset edits or material clones.** Place ground, spire drums and the instanced harvest-rock pool are tagged once, read by an object uniform in the existing RGBA8 coverage attachment. Future terrain owners need tags; classic merged scenery is unverified. Built rock-shaped props and trees remain toys. Ink stays on the toy side of ground contacts and sky silhouettes; coplanar contacts still lack a depth edge. Trees retain angular outlines. The water/protected-pixel guard interrupts thin lines near water; water itself receives no ink. Both finalists preserve cyan water, caustics and foam.

**The brackets are deliberately visible.** Ink uses .7/1, .8/2 and 1/3 in tint and dark; 3 px overdraws small hats. The initial .45/1 was strengthened. Shade uses 1.5/3/8, replacing the faint .5. Haze uses .0015/.18, .012/.45 and .06/.9 (density/cap); “Today” means round one's experimental setting, not the default. Static town-roof pixels changing by ≥8/255 are **4.1/8.0/11.6%** for dark ink; distant foliage **31.8/86.7/89.8%** for haze. Shade's close static wall changes **2.5/52.7/56.8%**. Repeated Current controls change **0%** at that threshold. Every cell's region and measurement is recorded in the [evidence index](post-look-round2/evidence-index.json).

**Motion:** I opened all nine boards and native consecutive strips, including f60–67 walking and f180–187 turning. Both finalists show stronger hat-seam crawl and roof-edge steps than Current at f60–63 and f180–183. Short line segments change; no whole-object popping was seen. Shore tree/trunk edges step at f60–63; excluded cliff faces do not acquire ink. Shore f180–183 retains moving caustics and baseline water/shore shimmer in all three. Camera motion is scripted, not player-input locomotion; video phases differ. Real-time feel is unverified.

**Warmed cost**, existing `measureGraphics('postLooks')`, two on/off/off/on repeats per finalist, 2 s warm-up and 3 s sampling per leg; 1440×900, DPR 1, 4× MSAA, Apple/Metal-3. No other task render overlapped. 16 complete windows, 2,881 fresh spans, no missing/stale/partial timed samples. Contention unknown; spans include GPU gaps.

| Look        | On/off mean ms | Repeat deltas ms | On p50/p95 ms   |
| ----------- | -------------- | ---------------- | --------------- |
| Drawn       | 13.507 / 7.493 | +5.967 / +6.061  | 13.459 / 14.463 |
| Drawn + air | 14.559 / 7.027 | +6.744 / +8.321  | 14.321 / 16.702 |

The combination's baseline varies; this does not isolate haze cost. [Summary](post-look-round2/cost-summary.json) / [raw samples](post-look-round2/gpu-raw.json). Mobile/Safari performance and cold stalls are unverified.

**Normal-path open item resolved:** the same unchanged run produces **14 dispatches/5 passes, 13/4 and 12/3**. Conditional particle spawning and the wet-lens dry timeout account for the changes. Round one's isolated count was timing, not a removed graph stage. Graph/target inventories match, with no comparison MRT/modules; no fix needed. [Proof](post-look-round2/default-proof.json). Production first-load membership remains **111→111** logical owners, no candidate module; hashes/bytes differ. [Inventory](post-look-round2/first-load.json).

Verification: final Place bot passed all expected beats with zero errors; crystal/co-op were unmarked, with 10m30s still and 2s pushing at 8×. [Bot manifest](../../.look/evidence/1793840033861-87161/evidence.json). `npm run check` passed (295 tests; lint, types, registries, levels, assets and build). Discarded capture/setup failures and exact manifests are recorded in the evidence index; accepted captures report no graphics errors. No new unit tests or scenarios. One departure: `npm run inflight` performed a remote fetch before its network behavior was noticed, contrary to the local-only instruction; no push or ship was run.

Gut question: **Which world would you rather walk into: Current, Drawn toys, or Drawn + air?**
