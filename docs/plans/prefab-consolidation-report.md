# Prefab catalogue consolidation

Measured baseline: local origin/main and initial HEAD `90bf3cabe`. Sync kind **Local**; no state, IDs, op meaning, sim/net/server or WORLD_NS changes. DESIGN.md: **Small and readable**.

## Totals

| Measure | Before | After | Ceiling |
| --- | --- | --- | --- |
| Records | 193 | 193 | 200 |
| Compiled JSON bytes (all files) | 347058 | 243652 | 350000 |
| Free bytes | 2942 | 106348 |  |
| Levels | 12 | 12 |  |

Saved **103406 bytes**: **58,281** from shared data/default omission and **45,125** from compact placement-row formatting. Reprinting the new data with the old canonical whitespace alone is **288,777 bytes**, so structural consolidation alone clears the 40 kB target. No complete records were identical after excluding their key, so none were removed. The seven remaining record slots are still insufficient for the remaining plan. Neither budget assertion changed.

## Per-area definitions

Source-module ownership; standalone sorted canonical definition bytes, excluding catalogue wrapper indentation. These do not sum to physical file bytes; the next table accounts for every physical byte. Halts owns all 12 shared halt records; generated placements are in halt-kit.json.

| Area / src/content/prefabs module | Records before / after | Definition bytes before | After |
| --- | --- | --- | --- |
| bell-rock | 1 / 1 | 4823 | 4823 |
| curio | 25 / 25 | 6670 | 6670 |
| greybox | 6 / 6 | 2377 | 2377 |
| halts | 12 / 12 | 2414 | 2414 |
| house | 27 / 27 | 7212 | 7212 |
| museum | 29 / 29 | 7613 | 7613 |
| railway | 2 / 2 | 2442 | 2442 |
| rooms | 64 / 64 | 16245 | 15439 |
| shop | 17 / 17 | 6017 | 6017 |
| town | 1 / 1 | 762 | 762 |
| workshop-kit | 9 / 9 | 3011 | 3011 |

## Per-area compiled files

| Artifact under content/built | Before bytes | After bytes | Saved |
| --- | --- | --- | --- |
| levels/bell.json | 49952 | 22105 | 27847 |
| levels/gorge.json | 65550 | 45654 | 19896 |
| levels/halt-kit.json | 31188 | 31188 | 0 |
| levels/house.json | 3930 | 2179 | 1751 |
| levels/museum.json | 4402 | 2500 | 1902 |
| levels/room-house.json | 24395 | 13629 | 10766 |
| levels/room-museum.json | 38199 | 21455 | 16744 |
| levels/room-shop.json | 27415 | 15179 | 12236 |
| levels/shop.json | 2523 | 1427 | 1096 |
| levels/west.json | 16752 | 7488 | 9264 |
| levels/workshop-kit.json | 1517 | 950 | 567 |
| levels/workshop.json | 359 | 296 | 63 |
| prefabs.json | 80876 | 79602 | 1274 |

## Top 15 records before consolidation

Standalone canonical bytes, the same convention as the budget test.

| Record | Before bytes | After bytes |
| --- | --- | --- |
| greybox.bell-rock | 4823 | 4823 |
| railway.car-bench | 1870 | 1870 |
| greybox.pad | 864 | 864 |
| town.workshop-chair | 762 | 762 |
| town.shop-stand-0 | 613 | 613 |
| town.shop-stand-3 | 612 | 612 |
| town.shop-stand-4 | 612 | 612 |
| town.shop-stand-1 | 610 | 610 |
| town.shop-stand-2 | 610 | 610 |
| town.house-board | 605 | 605 |
| railway.machine-chair | 572 | 572 |
| town.room-plot-board | 496 | 496 |
| town.museum-label-specimen | 429 | 429 |
| town.room-house-shell | 421 | 421 |
| town.museum-label-table | 419 | 419 |

## Duplication measured and removed

- Bell's main authored frame occurred **35 times**, West's **19 times**, Gorge's main frame **65 times**, its incline frame **6 times**, and Bell's two secondary frames **12 times each**. Each repeated frame now has one artifact-local operand definition referenced by placements/marks. Definitions contain original authored expressions, never evaluated numbers. The pool does not rewrite arithmetic or native math operation order.
- Room hulls/poles repeated w/d/high/rise in **39** records beside the three visual shell specs. Compiled hull recipes now reference their shell record; the loader uses that visual spec for collider dimensions. The compiler checks all four authored operands agree before removing copies. IDs, 39 separate shape records, and order remain intact.
- Gorge boxes repeated **43** solid=true flags; absent solid already means solid in boxPrefab. The compiler drops these only in Gorge boxes. Loader round-trip tests prove solid and decoration outputs stay exact.
- Generated level placements now serialize as one sorted JSON row per placement, without rounding or changing their objects. Room shells already reference one shell definition per room; their many verbose wrappers account for much of the saved space. No new runtime generator or placement-ID convention was introduced.
- The independent reviews' earlier Pier/display duplication has already been addressed by step 10b: the current source has 12 shared halt definitions, one HALT_PIER authority and generated kit placements. It is not counted as new savings here; halt-kit.json is unchanged. Post dimensions already feed both visuals and collider authoring from POSTS. No further halt rewrite is needed for the byte target.
- Smaller nested repeated vectors/arithmetic remain within the now-shared frames. Their overlapping byte counts are not added as separate savings.

## Every record

| Record | Before standalone bytes | After |
| --- | --- | --- |
| greybox.bell-rock | 4823 | 4823 |
| greybox.box | 355 | 355 |
| greybox.collider | 261 | 261 |
| greybox.decoration | 208 | 208 |
| greybox.pad | 864 | 864 |
| greybox.sign-post | 342 | 342 |
| greybox.sign-post-high | 347 | 347 |
| railway.car-bench | 1870 | 1870 |
| railway.halt-bench | 174 | 174 |
| railway.halt-canopy | 241 | 241 |
| railway.halt-deck | 172 | 172 |
| railway.halt-display | 178 | 178 |
| railway.halt-lever | 246 | 246 |
| railway.halt-mast | 237 | 237 |
| railway.halt-parts | 146 | 146 |
| railway.halt-ramp | 144 | 144 |
| railway.halt-road-plaque | 190 | 190 |
| railway.halt-shelter | 243 | 243 |
| railway.halt-signal | 180 | 180 |
| railway.halt-solid | 263 | 263 |
| railway.machine-chair | 572 | 572 |
| town.curio-bay | 393 | 393 |
| town.curio-dust-skirt | 180 | 180 |
| town.curio-gift-aviator | 259 | 259 |
| town.curio-gift-beanie | 259 | 259 |
| town.curio-gift-bucket | 258 | 258 |
| town.curio-gift-critter | 260 | 260 |
| town.curio-gift-diving | 257 | 257 |
| town.curio-gift-egg | 252 | 252 |
| town.curio-gift-festival | 263 | 263 |
| town.curio-gift-glasses | 260 | 260 |
| town.curio-gift-goggles | 259 | 259 |
| town.curio-gift-hardhat | 256 | 256 |
| town.curio-gift-hat | 253 | 253 |
| town.curio-gift-headphones | 266 | 266 |
| town.curio-gift-lampcap | 260 | 260 |
| town.curio-gift-mossscarf | 260 | 260 |
| town.curio-gift-overalls | 263 | 263 |
| town.curio-gift-pennant | 260 | 260 |
| town.curio-gift-raincoat | 263 | 263 |
| town.curio-gift-scarf | 256 | 256 |
| town.curio-gift-scope | 256 | 256 |
| town.curio-gift-strawhat | 262 | 262 |
| town.curio-gift-teacup | 259 | 259 |
| town.curio-gift-whistle | 259 | 259 |
| town.curio-shelf | 397 | 397 |
| town.house-bed | 363 | 363 |
| town.house-board | 605 | 605 |
| town.house-cabinet | 370 | 370 |
| town.house-cabinet-pulls | 218 | 218 |
| town.house-chair | 366 | 366 |
| town.house-chair-trim | 212 | 212 |
| town.house-desk | 365 | 365 |
| town.house-drawers | 206 | 206 |
| town.house-filed | 202 | 202 |
| town.house-floor | 202 | 202 |
| town.house-lamp | 200 | 200 |
| town.house-later-bridge | 216 | 216 |
| town.house-later-mug | 210 | 210 |
| town.house-later-rail | 212 | 212 |
| town.house-later-train | 214 | 214 |
| town.house-leaf | 200 | 200 |
| town.house-mat | 198 | 198 |
| town.house-mug | 198 | 198 |
| town.house-plant | 360 | 360 |
| town.house-postbox | 368 | 368 |
| town.house-quilt | 202 | 202 |
| town.house-rug | 198 | 198 |
| town.house-sign | 340 | 340 |
| town.house-step | 200 | 200 |
| town.house-stove | 363 | 363 |
| town.house-stove-trim | 212 | 212 |
| town.house-window-box | 212 | 212 |
| town.museum-alcove-back | 344 | 344 |
| town.museum-alcove-left | 347 | 347 |
| town.museum-alcove-right | 348 | 348 |
| town.museum-apron | 172 | 172 |
| town.museum-bench | 337 | 337 |
| town.museum-bits | 195 | 195 |
| town.museum-cabinet-trim | 186 | 186 |
| town.museum-column-0 | 356 | 356 |
| town.museum-column-1 | 356 | 356 |
| town.museum-column-2 | 354 | 354 |
| town.museum-column-3 | 354 | 354 |
| town.museum-cornice | 176 | 176 |
| town.museum-cushion-0 | 195 | 195 |
| town.museum-cushion-1 | 195 | 195 |
| town.museum-drawer-0 | 191 | 191 |
| town.museum-drawer-1 | 190 | 190 |
| town.museum-drawer-2 | 190 | 190 |
| town.museum-floor | 172 | 172 |
| town.museum-label-specimen | 429 | 429 |
| town.museum-label-table | 419 | 419 |
| town.museum-plinth | 335 | 335 |
| town.museum-pool | 172 | 172 |
| town.museum-reflector-0 | 199 | 199 |
| town.museum-reflector-1 | 198 | 198 |
| town.museum-relief | 176 | 176 |
| town.museum-sign | 344 | 344 |
| town.museum-specimen | 180 | 180 |
| town.museum-spire | 172 | 172 |
| town.museum-table | 331 | 331 |
| town.room-house-hulls-0 | 257 | 234 |
| town.room-house-hulls-1 | 257 | 234 |
| town.room-house-hulls-2 | 257 | 234 |
| town.room-house-hulls-3 | 257 | 234 |
| town.room-house-hulls-4 | 257 | 234 |
| town.room-house-hulls-5 | 257 | 234 |
| town.room-house-hulls-6 | 257 | 234 |
| town.room-house-hulls-7 | 257 | 234 |
| town.room-house-poles-0 | 257 | 234 |
| town.room-house-poles-1 | 257 | 234 |
| town.room-house-poles-2 | 257 | 234 |
| town.room-house-poles-3 | 257 | 234 |
| town.room-house-poles-4 | 257 | 234 |
| town.room-house-proxy-0 | 221 | 221 |
| town.room-house-proxy-1 | 221 | 221 |
| town.room-house-proxy-2 | 221 | 221 |
| town.room-house-proxy-3 | 221 | 221 |
| town.room-house-proxy-4 | 221 | 221 |
| town.room-house-proxy-5 | 221 | 221 |
| town.room-house-proxy-6 | 221 | 221 |
| town.room-house-shell | 421 | 421 |
| town.room-museum-hulls-0 | 254 | 236 |
| town.room-museum-hulls-1 | 254 | 236 |
| town.room-museum-hulls-2 | 254 | 236 |
| town.room-museum-hulls-3 | 254 | 236 |
| town.room-museum-hulls-4 | 254 | 236 |
| town.room-museum-hulls-5 | 254 | 236 |
| town.room-museum-hulls-6 | 254 | 236 |
| town.room-museum-hulls-7 | 254 | 236 |
| town.room-museum-poles-0 | 254 | 236 |
| town.room-museum-poles-1 | 254 | 236 |
| town.room-museum-poles-2 | 254 | 236 |
| town.room-museum-poles-3 | 254 | 236 |
| town.room-museum-poles-4 | 254 | 236 |
| town.room-museum-proxy-0 | 218 | 218 |
| town.room-museum-proxy-1 | 218 | 218 |
| town.room-museum-proxy-2 | 218 | 218 |
| town.room-museum-proxy-3 | 218 | 218 |
| town.room-museum-proxy-4 | 218 | 218 |
| town.room-museum-proxy-5 | 218 | 218 |
| town.room-museum-proxy-6 | 218 | 218 |
| town.room-museum-shell | 418 | 418 |
| town.room-plot-board | 496 | 496 |
| town.room-shop-hulls-0 | 253 | 232 |
| town.room-shop-hulls-1 | 253 | 232 |
| town.room-shop-hulls-2 | 253 | 232 |
| town.room-shop-hulls-3 | 253 | 232 |
| town.room-shop-hulls-4 | 253 | 232 |
| town.room-shop-hulls-5 | 253 | 232 |
| town.room-shop-hulls-6 | 253 | 232 |
| town.room-shop-hulls-7 | 253 | 232 |
| town.room-shop-poles-0 | 253 | 232 |
| town.room-shop-poles-1 | 253 | 232 |
| town.room-shop-poles-2 | 253 | 232 |
| town.room-shop-poles-3 | 253 | 232 |
| town.room-shop-poles-4 | 253 | 232 |
| town.room-shop-proxy-0 | 217 | 217 |
| town.room-shop-proxy-1 | 217 | 217 |
| town.room-shop-proxy-2 | 217 | 217 |
| town.room-shop-proxy-3 | 217 | 217 |
| town.room-shop-proxy-4 | 217 | 217 |
| town.room-shop-proxy-5 | 217 | 217 |
| town.room-shop-proxy-6 | 217 | 217 |
| town.room-shop-shell | 386 | 386 |
| town.shop-awning | 170 | 170 |
| town.shop-counter | 336 | 336 |
| town.shop-counter-detail | 186 | 186 |
| town.shop-floor | 168 | 168 |
| town.shop-front-box | 338 | 338 |
| town.shop-front-table | 341 | 341 |
| town.shop-hangers | 172 | 172 |
| town.shop-highlight | 176 | 176 |
| town.shop-rail | 401 | 401 |
| town.shop-rug | 164 | 164 |
| town.shop-sign | 342 | 342 |
| town.shop-stand-0 | 613 | 613 |
| town.shop-stand-1 | 610 | 610 |
| town.shop-stand-2 | 610 | 610 |
| town.shop-stand-3 | 612 | 612 |
| town.shop-stand-4 | 612 | 612 |
| town.shop-step | 166 | 166 |
| town.workshop-anvil | 373 | 373 |
| town.workshop-bellows | 372 | 372 |
| town.workshop-bench | 369 | 369 |
| town.workshop-chair | 762 | 762 |
| town.workshop-chimney | 378 | 378 |
| town.workshop-floor | 206 | 206 |
| town.workshop-lanterns | 212 | 212 |
| town.workshop-logs | 367 | 367 |
| town.workshop-rails | 366 | 366 |
| town.workshop-tub | 368 | 368 |

## Capacity recommendation

Keep **350,000 bytes** for now and recommend a separately approved record-ceiling change to **320**. Do not change either assertion in this work. This is a bloat tripwire, not a design constraint: the owner's **Place for the look, not the cost** call applies, and a measured larger design should raise the guard rather than shrink the design.

These are planning ranges, not compiled measurements; steps 11–13 have no finished records to measure. Step 11 has three PROP_BLUEPRINTS families plus authored LAND_TREES/scatter sources; its plan explicitly retains a seeded generator. Dumping evaluated random/native coordinates would defeat both size and portability. Step 12's GLB payload remains in the asset manifest, outside this catalogue; only asset IDs, shapes and attachment recipes count here. Step 13 is the largest uncertainty: lighthouse, windmills, caves, Ring Island, mushroom stall, lookout and secrets have not yet been converted.

| Remaining work | Estimated added records | Estimated bytes |
| --- | --- | --- |
| 11: trees/scattered props | 3–6 | 3–8 kB |
| 12: GLB things | 8–14 | 4–8 kB |
| 13: remaining places/props | 40–90 | 25–60 kB |
| The Round blockout (brief estimate) | shared greybox records / possibly 0 | about 3 kB |
| Rotunda kit (brief estimate) | about 8–12 | about 5 kB |
| Each further rotunda hub | reuse kit / possibly 0 | about 1.5 kB |

Together, the first three steps plus Round/first rotunda provisionally add **40–84 kB**, leaving **22,348–66,348 bytes**, before further hubs. That fits the present byte ceiling; it is not a promise about unbuilt content. The estimated **59–122 records** would put the catalogue at **252–315**, which is why 320 is the proposed record guard. Re-measure each conversion; if step 13 or the desired kit needs more, raise the ceiling with evidence. No layout, radius or feature should be cut to meet these estimates.

## Verification and limitations

Every existing test and runtime golden is unchanged. A baseline snapshot of all 193 resolved records and all 12 resolved levels compares exactly with the final loader output, with no numeric tolerance. No fixture was regenerated. The authored-operands tripwire, existing native-math portability test and both budget assertions remain unchanged. New pure loader/compiler tests cover reference errors, exact round trips, default-solid omission and the shared visual/collider dimension source; no new UI harness, Git subprocess test or wall-clock assertion was added.

The full check passes: **1,922 active unit tests**, one existing TODO, zero failures; lint, typecheck, registry, level-check, assets, artifact freshness and build pass. Dedicated prefab runs pass **227/227**, including a one-ULP native-math run; pre-import perturbed compiler freshness passes at **193 / 12 / 243,652**. Exact native 0 and ±1 endpoints are preserved by the perturbation, as in step 10b. Final evidence and server-suite outcome are recorded below after broker verification.

Review-stamp was run with `--no-fetch --base origin/main` to obey local-only networking. It reports **no review stamp needed**: no sim/net/world/ecs/server source or associated tests changed. Debt and registration files are byte-unchanged; the ratchets pass. This stamp result is not an independent review. The diff was reread locally.

Prettier ran on every changed file, followed by the compiler to restore the canonical generated-artifact format, then `npm run check`. An initial lint run caught unused destructuring variables and a regex spacing rule; the first full check caught two TypeScript errors. They were fixed before the passing check. The first server run passed 370/371 and failed the unchanged default-CORS header assertion; the original failure log is retained and the unchanged suite is being repeated.

`npm run inflight` attempted its implicit fetch and failed on FETCH_HEAD before substantial work; it was not retried. All later Git commands use local refs, and all browser/network checks use the local broker/server. No push or ship.

Suspect placeholder copy remains unchanged: `Stall: High Gorge (placeholder)`, `Stall: Ring Island (placeholder)`, `Stall: Home (placeholder)`, `Stall: Canopy Town (placeholder)`, `Stall: Port Quay (placeholder)`, `Not connected yet`, `Market board (placeholder)`, `LINE TO BELL ROCK` / `UNDER CONSTRUCTION`; existing halt name repetition and `Village, line 2` suffix handling remain as authored. The Boogler's copy is untouched.

Not tested on a device. Real-time smoothness, Linux and independent review remain unverified.
