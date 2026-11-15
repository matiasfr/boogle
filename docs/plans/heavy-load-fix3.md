# Heavy-load local drop repair — 15 November 2026

Authorized implementation on `heavy-load-fix3`, based on `526db96dd`, with review `73add587f`
cherry-picked as `29fb761d0`. Commit only; no push or ship.

## Chosen design

Serve **Small and readable**, **Communal world, personal things** and **Telegraph everything**:
dropping cannot remove somebody else's work-site stock or teleport materials into a store.
Keep 128 piles, at most eight small pieces per pile (one for a footing), and derive each client's
small-piece draw capacity as `128 * 8 = 1,024`. Exact-position local top-ups remain allowed.

A full table with full piles cannot accept another conserved piece. Merely merging nearby piles or
naming a frame/rack/cart is insufficient: those can also be full, absent or inaccessible on foot.
Instead reserve one free pile slot per **excess carried piece**, summed over all accounts, including
disconnected ones. The invariant is `pile count + total excess <= 128`. No stored reservation row:
derive it from existing inventories, comfort and piles, identically for prediction and after reload.
Each excess piece can therefore be dropped separately, in any material order, at any allowed local
drop point. A drop consuming a new slot must preserve the remaining reservations; a local top-up
consumes no slot. Extra pickup stops at the space that can be reserved, while comfortable pickup
remains available. At saturation, optional overfill is unavailable until a pile is collected or used.
Comfort/max remain 8/12 and 16/24; ordinary play below saturation is unchanged.

This is deliberately conservative: reserve one slot per piece rather than infer locations or future
material grouping. It guarantees mobility recovery without a new op, target, store or remote mutation.
Whole-back Drop can stop at comfort when ordinary storage is full; the heavy player is then mobile.
Existing validated position, request cadence and entity-id exhaustion rules still apply to commands.

## Implementation and acceptance

1. Share pile count/piece bounds; derive reservations in the existing queries; apply them in every
   pickup through `free`, and in Drop. Remove all overflow recovery writes. Validate the same invariant
   on checkpoint load. Update the existing unshipped v48 domain note, with no migration.
2. Keep aged recovery separate from Drop; do not recover rails into a forge that would exceed 4,096.
   Preserve the pile for a later pulse. Other recovery stores are already bounded by conservation.
3. Rewrite old recycling assertions as locality/refusal/reservation assertions, preserving conservation,
   replay, prediction (including temporary ids), mixed-kind and replication coverage. Exercise saturated
   slots, partial top-ups, mixed overloaded accounts, contested pickups and reload.
4. Run the earlier reviews, railway goldens, server tests, network checks, level-check, loop and
   checkpoints. Inspect the live maximum-pile draw repro and the existing heavy-load recovery probe.
   Record actual results and limits below. No fixture refresh without explaining changed inputs.

## Risks and scope

All cargo remains Server state; apply has no effects, time source or new transport. The maximum-pile
bound comes from the owner's brief and the review's measured 1,025th-log rendering loss. No materials,
terrain, colliders, bills or Boogler dialogue change. Reservation queries scan bounded piles and the
existing account table only on pickups/drops. They do not add tick work. This replaces the prior
overflow policy; historical review reports remain unchanged. The saturation trade-off is logged in
`docs/agent-calls.md` for the owner to revisit.

## Results

Pending implementation and verification.
