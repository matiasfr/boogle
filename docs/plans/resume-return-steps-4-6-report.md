# Return spot, steps 4 and 6

Step 4 adds a Local return search: hold each candidate in place, wait for its nearby route and Ring Island mounts
and one completed physics step, then check its exact surface and free nearby rings. It tries the remembered spot
(unless the last ride was over 25 m away), two distinct nearest halts, and finally Home. Unchecked halts probe
3, 4.5, 6 and 8 m rings for the highest standable surface at the first usable ring. Each candidate has a 2.5 s
wall-clock limit; held bodies never become saved standing spots. Expired, disabled or malformed records go Home;
a room with no v1 record retains its jump-in landing. Yaw and camera pitch are restored on placement.

Route and Ring Island mount notifications reach arrival through the railway view, resetting physics readiness.
Home's terrain is built synchronously by `buildLand(owner)` (its collision tiles in `buildMesh`) and stays until
that view owner is disposed; it needs no distance-residency signal. Plan departure: `routeAreasPending` lives in
`route-greybox/state.ts`, since the entity contract forbids consumers importing `index.ts`, whose public exports
are also frozen by prefab lint. No allowance, server, sync, world, net, wire or namespace change was needed.

The search exposes `arrival.settling()` for step 5, which remains unbuilt. No cover hold or late-placement fade was
added: this batch cannot claim the candidate moves stay hidden, or that peers never see intermediate placement.
Those presentation proofs belong to the separately requested step 5 job.

Tests exercise exact and nearby placement, missing decks and first/second halt fallback, distant train/water
observations, unchecked halt rings, distinct halts, all-failed and unsettled timeout paths, expired/disabled/bad
records, and room/world reset clearing. The existing real Rapier surface and stale-broad-phase checks remain.
The eval now asserts Gorge return distance below 2 m and has a seated departing-train reload mode. Browser
execution and image observations are reported with this run's broker manifests, not inherited from earlier evidence.
