# Running-side second review fixes (14 November 2026)

Follow-up to d1e1eb0b6 and review-running-side-5. No push or ship. The three first-round P1 fixes remain.

## P1: retained block protection

This was a Server signalling defect, not just view geometry. `endMoved` left the accepted departure on its old
physical path, while `blockFree` and `planLeg` immediately discarded the old block/signal. A leg could also pass
through that former end without ending inside it. The accepted row now derives its retained end block, including
an inbound `turn` committed before arrival sets `origin`. Planning and tick spacing checks include it until the
whole `TRAIN_EXTENT` clears. Old signals remain available as legal holds. No new field or namespace bump.

The reviewer deck test failed first (2.204 m penetration with zero headway); the normal-headway port now passes
with 1.790 m minimum clearance over 300 ticks. Fourteen transition sweeps each run 1,000 ticks, restore rows after
40, check spacing, compare drawn decks before the waiter releases and assert eventual clearance/release:
Q6, Q7, bents 1–7, rivet, Ring Island / stack 1, stack 2–4. The old waiter releases one tick after clearance in
every case. Separate assertions cover inbound `turn` arrivals and legs crossing the whole old block.
The focused block suite passes 17/17; the combined initial origin/path/review set passed 16/16.

The seed golden changes only 15 downstream stage entries: q6-done, works-arrive/open/stocked, deck-laid,
gap-footed, leaf-raised, ring-joined, steel-kit/lit/home, boiler-long and gorge-open/mid/reached. Q6+ no longer releases
a competing train into its old occupied block; later head/wagon availability shifts deterministically. The schema,
seed inputs and WORLD_NS stay v45. Regenerated stage/after hashes and any resulting seed-tick shifts belong to
this rule change, not a hash-only schema update. The 103 golden tests pass. Other fixtures remain untouched so far.
