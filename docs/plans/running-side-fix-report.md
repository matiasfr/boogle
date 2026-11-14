# Running-side review fixes (14 November 2026)

Local follow-up to d63d726cf and the independent running-side step 4 review. No push or ship; shared v45 stays open.

## Departure origin (P1 one)

`Train.origin` is one Server-owned integer: the far-end stop in centimetres, or zero. Its catalog halt can be recovered
from that coordinate, including the Railhead's head table. The sim sets it on arrival/initial placement at a far end,
retains it through departures, replans and signal holds, and clears it at the next halt or an outward redirection.
The component schema already owns wire projection, saves and hashes: no extra packet or compatibility path.
The view's `left`/`LeftFrom` memory and the body path's tab-local merge smoothing are gone.

The first regression run failed all four cases (the reviewer late-view case gave -4 m instead of 0).
The repaired suite also checks malformed origins; targeted train/check/replication/view/ring tests passed 178/178.

Fixture changes are limited to their changed meaning:

- `rail-schema.json`: Train adds `origin:int`; its recorded namespace advances from v37 to the already-open v45.
- `railway-golden.json`: all 47 stage/after hashes change because every world has the new Train field; seed ticks do not.
- `railway-ops-golden.json`: 277 world hashes change; operation inputs, return values and counts do not.
- `railway-tick-order.json`: 2,700 hashes change; system sequences and tick indices do not.
- `railway-tick-order-heads.json`: 14,400 hashes change; the 12 headway cases, sequences and tick indices do not.
- `railway-m12-trace.json`: 82 mirror hashes and 1,244 hash marks change; view reads and events do not.
- Synthetic placement helpers explicitly set/clear origin when they place a train or change its direction. The
  intentionally bad end-block fixture still reaches its end-block refusal rather than failing the new row check first.

Departure from step 4: its knowingly tab-local workaround is replaced with replicated state, as authorized by this
fix brief. This is part of the existing v45 history entry, with no additional namespace bump.
