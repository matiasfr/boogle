# Current-client Place cleanup — 5 November 2026

Inventory and disposition for the owner's **No old builds in development** call. DESIGN.md: **Small and readable**. These are compatibility removals; current gameplay and The Boogler's copy stay unchanged. Root's single `WORLD_NS` break covers the changed snapshots and presence meanings.

| Machinery | Decision | Reason |
| --- | --- | --- |
| `coop-identity.ts` versioned tag | Simplify | Stable `placeCoop` names participation and carries the bounded authority-election tick. `currentCoopPeer` checks that tick; it no longer identifies a build. |
| `coop.ts`, `pair.ts`, `depot.ts` rail/ride/recall capabilities | Cut | All clients use automatic rails, queued recall and the existing ride bonus. Rider presence becomes boolean Owner state. Remove old immediate `cartCall` and mixed-room completion snapshots. |
| `coop.ts` missing deposit request/destination fallbacks | Cut | Current requests/replies already carry IDs and destinations. Keep exact matching, validation, rejection and departure refunds. |
| `run.ts` duplicate `run` snapshot and `coop.ts` fallback/nudge | Cut | `trackPanelsV1.motion` is the current single machine snapshot; current panel clients never use the old head correction. |
| `chop.ts` old felled-ID/yaw reader and writer | Cut | Accepted `treeHarvestV1` records already hold every worked/felled tree, including yaw, revision and payout. Keep rock/trunk reset and bounded tree validation. |
| `coop.ts` revision-zero personal-shoulder adoption/presence fallback | Cut | Current pickups save accepted holder/revision in `bigCargoV1`. Keep those records, current reload, orphan recovery, Drop validation and compare-and-swap retries. |
| `cargo.ts` reconstruction when `trainCargoV1` is missing | Cut | Only old saves lacked the owned cargo ledger. Keep current in-flight cargo ownership and settlement. |
| `job.ts` shape-based `finds` history migration | Cut | Current saves have separate `goldFinds` and `secretFinds`; keep both bounded readers. |
| `depot.ts` optional fields and predicted speed for old snapshots | Simplify | Current fields are required; malformed speed safely reads as zero. |
| `track-layer-mixed.ts`, `mixedSeats`, missing-cart-capability/retired-message and historical-shoulder eval branches | Cut | They exist only to prove old builds/saves. Retain current harvest, request/retry, cargo conservation, malformed election ticks, seats, release and departure checks. |
| `?proto=place`, `?classic=1`, village/comparison routes | Keep | Active authored prototypes, headless world scenarios and current full-route bots use them. They select different gameplay, not an old binary; archiving them is outside this compatibility cleanup. |
| `legacyStations`, `legacyFlights`, shared authored source helpers | Keep | Page-lifetime prototype owners and owned production views are both current consumers. Their names describe ownership, not migration. |
| Generation/revision counters, freshness and peer participation | Keep | Current authority election, duplicate prevention, stale-snapshot rejection and room safety. |
| Current personal save keys and `V1` slice labels | Keep | Static identifiers carry no version/migration chain. No extra version bump or old-key search is introduced. |

Historical dated evidence in `docs/game-design/place.md` remains historical; its compatibility assertions do not describe the current implementation. No suspect Boogler copy was removed or rewritten.
