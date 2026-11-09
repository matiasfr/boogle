# Development compatibility cleanup — 5 November 2026

> **Verdict:** Development compatibility cleanup, runtime tree passed all checks.
> **Top recommendations:** none; record of the cleanup under the "No old builds in development" call.
> **Status:** adopted.

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

Runtime tree `610148c9` (`dd79fbe623861ec82ec297031289ededb57bff0a`) passed `npm run check` (384 unit tests plus lint, typecheck, registry, level/assets and build) and all 73 server tests. `npm run checks-for` selected these browser proofs:

- [world-inputs](../../.look/evidence/1793943246302-99653/evidence.json): pass. The trusted broker at `bf4773d9` runs classic grid/state/op/layout assertions only; the worker's production parity extension is unverified.
- [Fresh co-op through T2](../../.look/evidence/1793943330838-1632/evidence.json): pass, both players contributed (24/38), all expected beats, shared states agree, no errors. Reload/rejoin and the later co-op route are outside this segment.
- [Full solo Place](../../.look/evidence/1793943332017-1686/evidence.json): pass, all expected beats through the ending, no errors.
- [Supplemental production solo](../../.look/evidence/1793943744948-7004/evidence.json): pass through T1–T3, proper axe, unique beam, both return walks and the optional jump, no errors. The generic report's unmarked Place events are not missing production beats.

The exact checkpoint commands first stopped for missing local fixtures ([co-op](../../.look/evidence/1793943292724-874/evidence.json), [solo](../../.look/evidence/1793943298558-979/evidence.json)); fresh runs replaced them. The first supplemental production command selected classic by harness default and failed before its bot ([manifest](../../.look/evidence/1793943385413-2343/evidence.json)); explicit `classic=0` fixed the launch without source edits. No successful run changed source while in progress.

Visual question: do current players, machine and railway remain coherent at the played checkpoints, without missing geometry or error overlays? Actually opened co-op `end-still.png` and `p2-end-still.png`, full-solo `end-still.png`, and production `end-still.png`. T2 shows both avatars, a conductor hat, crate/frame and aligned laid rails. Full solo shows the equipped avatar and elevated railway; production shows the avatar, hat and jump device. No missing visible geometry or error overlay. Bot logs obscure the left/background views and the machine is not fully framed; no matched before/after or full-machine visual verdict. Stills cannot establish real-time feel or smoothness. Not tested on a device.

Nine implementation/inventory commits removed 5,361 lines and added 488 (net 4,873 fewer) across 130 files before this evidence-only update. Current runtime values/arithmetic and The Boogler's dialogue are unchanged. [Handoff](../../.look/cut-compat/handoff.md) and [aggregate evidence](../../.look/cut-compat/evidence.json) include logs and opened image copies.

`test:net`, `load` and the multi-deploy SW browser harness launch Chromium directly and have no broker operation, so they remain unverified under the explicit broker-only constraint. No new harness or bypass. No push, ship or deployment. The final documentation commit changes no tested runtime code.
