# Rule branch rebase

1. Extract the queue's local rebase, including its docs union, so a builder can exercise the same operation. Abort the whole rebase on an unexpected conflict or failed recorder.
2. Resolve a version collision only for a single increment and its appended history comments. Keep main's history and renumber the branch entry. Git can silently coalesce identical increments. Inspect all namespace and pin inputs at a pin conflict, including cleanly merged files.
3. Run the owning recorders. Compare base, incoming, reviewed and generated values recursively, including ordered keys and array positions. Require the ordinary three-way result for observable values. Allow the recorder to refresh a known hash slot, including in a stage supplied by one side. Treat host packets and checkpoint documents conservatively, refusing ambiguous overlapping payload changes. Normalize the allocated namespace only in its recorded slots.
4. Preserve the pre-rebase review using a worktree-local receipt bound to the resulting diff and its base. Keep fixtures in the normal stamp so subsequent hand edits invalidate the receipt.
5. Test classification, allocation, refusal and stamp binding. Use throwaway local rule branches to compare a tool rebase with a direct build, then run the local ship check.

## As built

| Pin | Recorder |
| --- | --- |
| railway-golden.json | `GOLDEN=1` on every railway-golden shard, serially because they update one file |
| railway-ops-golden.json | `GOLDEN=1` on railway-ops.test.ts |
| railway-m12-trace.json | `M12_RECORD=1` on railway-m12.test.ts |
| railway-tick-order-heads.json | `TICK_ORDER_HEADS=1` on railway-tick-order.test.ts |
| rail-schema.json | `GOLDEN=1` on railway-schema.test.ts |
| world-host-trace.jsonl.gz | `HOST_TRACE_RECORD=1` on the server's world-host-trace.test.ts |

The decision's stamp suggestion needed one adjustment. A patch ID includes fixtures and the namespace history. Dropping those paths would also excuse a later hand edit. The resolver saves the old ID in the worktree's Git metadata only after verifying the regenerated data and comparing the remaining non-doc patches. The receipt applies to one resulting commit and merge base. A fresh clone computes the ordinary stamp.

The resolver also checks pins changed by both sides that Git merged cleanly, including identical version headers. The host trace must retain its record count. The comparison verifies the checksum of each full checkpoint envelope and checks snapshot byte counts against the serialized envelopes before comparing the payloads. Ambiguous array edits, simultaneous incompatible key order changes and non-increment namespace edits go back to the builder.

## Local proof

In a standalone clone under `.look/`, two branches independently advanced v87 to v88 and tightened the accepted ranges for railway regrowth and glide sink. Each recorded the host, schema and stage fixtures using the production tests. Both runs passed 270 tests. A separate overlapping source edit returned exit 2 and restored its original clean tip.

Replaying the glide branch onto the regrowth branch allocated v89. The resulting Git tree and the independent direct-build tree were both `e2f4087331c581c51ebd220dc8b10adf69c31e7e`. All 270 affected tests passed on that tree with recording disabled. The review ID stayed `aaed9afd88a3`. Successive committed edits to the golden, the rule and the schema assertion returned `9cd697664c9b`, `7ca8a953672b` and `bd6e035562b6`.

A second run changed the incoming regrowth default as well as its range. Git reported conflicts in both the compressed host trace and the namespace. The resolver ran only the host recorder. The resulting v89 tree again matched a direct build (`c71c3beefdac84b7228a968d428c3249ccaba4f8`). In a separate schema collision, the genuine recorder disagreed with both reviewed component kinds. The tool identified `/components/0/kind`, returned 2 and restored the original clean tip.

### Multi-commit replay

A conflict in a known pin or the namespace takes the replayed commit's copy until Git finishes applying the branch. The resolver then allocates the version and runs the required recorders on the complete rule set. Its three inputs are the original merge base, the target tip and the original branch tip. The receipt still requires matching patch IDs for the remaining non-doc paths. Two synthetic repositories compare the complete resulting tree with a direct build. One delays the host recording until the second commit and the other records it in both commits.

On 28 November, a detached copy of Part 7 at `37fffd90f` replayed all ten commits onto `377072db0` (main with the v88 conversions). The v89 golden recorder passed all 271 tests. The original hash check refused the new `stack-rails` witness, exactly where a squashed copy with the same tree had stopped. Only the target supplied this stage. Its tick stayed at 13164, its stage hash changed from 1619678958 to 174967943 and its after hash from 3898472269 to 3458877112. The tool returned 2 and restored the clean detached tip at `37fffd90f`.

The orchestrator's call (the heartbeat, 28 November; not an owner decision) permits fresh hashes when the stage's name, position and tick survive the merge. Regression tests use those exact values, remove the stage and move its tick by one. Only the unchanged stage with fresh hashes passes. Refusals report the path and the base, target, branch and recorded values.

With that correction, a fresh detached copy of the ten Part 7 commits rebased onto main at `6e2267183`. It allocated v89, regenerated and verified all six pins, and preserved review stamp `9a95e5fc1e11`. The resulting tree was `01da492f9e930b438f00b06d112cb2ac0b7e5bff`. With recording off, the copy's ship check passed registry, lint, typecheck and its 218 affected test files (2,257 passed, one skipped, one TODO, zero failures).
