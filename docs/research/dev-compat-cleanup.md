# Development compatibility cleanup — 5 November 2026

Owner call: [No old builds in development](../agents/owner-calls.md). Starting tree: local `origin/main` at `a2df1b35`, including Slice 3. No fetch, push or ship; `inflight` was not run because it fetches, contrary to this job's local-network-only constraint.

## Inventory and decisions

| Area | Decision | Reason |
| --- | --- | --- |
| Frozen v0/previous-supply recovery, source-hash verifier, historical fixtures | Cut | Only loads or replays retired builds. See [state inventory](dev-compat-state.md). |
| State versions, migrations and newer-save admission | Simplify | Load the current shape; retain corrupt-save refusal, verified checkpoints and deterministic replay. One `WORLD_NS` break replaces migration. |
| Peer capability gates and versioned Place identity | Simplify | Current peers use one contract; retain participant/election, bounds, ownership, receipt and generation checks. See [peer inventory](dev-compat-peers.md). |
| Tunables compatibility catalog and room `tc` parameter | Cut | Current builds share one definition; keep pinned values, revisions, controller authorization and validation. See [catalog inventory](dev-compat-catalog.md). |
| Registry mixed-build comparison | Cut | Current-tree collisions and architectural debt ratchets remain. |
| Boogler `pts`/learned-to-`met` inference; home-app old-default rewrite | Cut | One-off localStorage migrations. Current memory validation, saved destination, cookie fallback and all dialogue stay. |
| Reward claim helper reproducing the retired `t1v02` room encoding | Simplify | Claims now use the current railway room id; atomic profile writes and current-world idempotency remain. |
| `flLast` / `kdLast` stale-repeat guards | Cut | Explicitly supported pre-b0a3a7b tabs that never cleared presence. Current senders clear it; finite bounds checks remain. |
| Previous-build SW cache retention and deploy asset backfill | Cut | Exists solely to keep old binaries loading. Current immutable cache reuse and bounded startup retry remain. See [asset inventory](dev-compat-assets.md). |
| Explicit Place, classic and other live prototype routes | Keep | Current authored gameplay and verification routes, not archived binaries; retiring prototypes is a separate owner decision. |
| Build diagnostics and update/reload notice | Keep | Identify the current running tree and bring a tab up to date; do not preserve old protocol behaviour. |
| Retired `playtest` report POST parser/types | Cut | Current telemetry and `/playdata` cover current clients. Stored report reading and all current endpoint validation stay. See [report inventory](dev-compat-reports.md). |
| Current save format discriminators, safe loads, profile atomicity and storage-unavailable handling | Keep | Reject malformed data and preserve recoverability; no migration chain. |
| Host election/handoff, request revisions, idempotency, current replay and namespace routing | Keep | Current room correctness and safety, including classic/production room separation. |

The Boogler's copy is unchanged. His parked copy remains parked; no suspect dialogue was found in the removed compatibility code. Current lockstep arithmetic, rates, schedules and gameplay values are unchanged. Runtime validation is not compatibility debt.

## Verification

Pending final-tree checks and broker evidence. Visual question: do current players and the constructed railway remain visible and coherent at the played bot checkpoints, without missing geometry or error overlays? Stills cannot establish real-time feel or smoothness. Not tested on a device.
