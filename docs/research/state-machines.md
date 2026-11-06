# State machines: transitions, recovery and acceptance

_6 November 2026. Audit baseline `816068efcb6d5a9088c001001bec3fe2f8a18e3b`; current worktree only. This document is the inventory and finding ledger. Source links refer to this branch. No external network or running-game observations._

Use [the ownership audit (#899)](state-ownership-audit.md#complete-player-facing-state-inventory) for ownership and persistence classifications. Its historical findings are leads, not current reproductions. This audit keeps existing owners and distinguishes queued intent, accepted work, applied state and durable checkpoints.

## Scope and evidence standard

A finding is **confirmed** only after an executed regression or reproduced exact-code trace. Static risks remain **suspected**, with no speculative fix. Each fixed issue records its failing-before/passing-after test and commit. Architecture or policy changes remain **open-needs-owner-call**. Tests explicitly requested for this audit take precedence over the usual feature test diet. No changes to gameplay feel, visuals, copy, reserved route-repair files, wire shapes or save schemas are planned.

The initial documentation commit precedes all fixes. Inventory and evidence below are expanded during the audit. Local dependencies are installed; Node 26 is available, although the initial shell selected Node 24. `npm run inflight` is not run because it fetches externally; only local Git state is inspected.

## Machine inventory

| Machine family | Owners | Audit coverage |
| --- | --- | --- |
| Transport, reconnect, room join/lead/presence | [transport](../../src/net/ws-room.ts), [netplay](../../src/netplay/net.ts) | In progress |
| Hosted rooms, asynchronous load/save/unload | [rooms](../../server/src/host/rooms.ts), [hosted room](../../server/src/host/hosted-room.ts), [world host](../../server/src/host/world-host.ts), [store](../../server/src/store.ts) | In progress |
| World role, admission, tick/apply, snapshot and recovery | [sync](../../src/world/sync.ts#L128), [rules contract](../../src/world/rules/README.md#contract) | Inspected; probes pending |
| Place election, adoption, requests and local save/load | [co-op](../../src/proto/place/coop.ts), [job](../../src/proto/place/job.ts) | In progress |
| Boot, loading, frame and feature startup | [main](../../src/main.ts), [loop](../../src/loop.ts), [boot](../../src/boot) | In progress |
| Player movement, held item and interactions | [player](../../src/entities/player/state.ts), [hands](../../src/player/hands.ts), [held](../../src/features/held.ts) | In progress |
| Entity lifecycle and changing physics authority | [walker](../../src/entity/walker.ts), [owner sync](../../src/netplay/owner-sync.ts#L58) | In progress |

### World attachment and synchronization

Owners: [role and flags](../../src/world/sync.ts#L156), [attachment](../../src/world/sync.ts#L884), [clock](../../src/world/sync.ts#L399), [snapshot receipt](../../src/world/sync.ts#L527).

States: local; client waiting; client ready; disconnected client; host loading; host ready; recovery blocked. `connected`, `ready`, `awaiting`, `hostId`, `asm`, queued edits and the attachment generation form overlapping substates. Invariants: only host stamps identities; clients accept pinned-host traffic; a client starts from an authoritative snapshot; failed-load fallback cannot be persisted or served; completed old recovery writes cannot publish into a new attachment.

| From | Event/trigger | Guard | To | Side effects |
| --- | --- | --- | --- | --- |
| Any | attach room | caller supplies role | host loading / client waiting | detach listeners; clear held/queued work; install room callbacks |
| Host loading | read current save | valid snapshot/state | host ready | restore tick and states; notify snapshot listeners |
| Host loading | corrupt ordinary save | parse/load error | bad-save fallback | suppress save and snapshot serving; record failure |
| Client waiting | complete snapshot chunks | valid payload from accepted host | client ready | replace state, pending queue and clock; notify listeners |
| Client ready | hash mismatch / late edit | resync throttle elapsed | awaiting resync | request snapshot; retain current state until replacement |
| Client | disconnect / reconnect | connection callback | disconnected / connected | reconnect clears host pin and pending hashes; held intents drain over time |
| Any attached | detach | none | local | unsubscribe callbacks; increment async attachment fence |

### World admission, application and durability

Owners: [admission](../../src/world/sync.ts#L238), [held intents](../../src/world/sync.ts#L292), [apply](../../src/world/sync.ts#L347), [recovery](../../src/world/sync.ts#L682), [ordinary persistence](../../src/world/sync.ts#L823).

States: intent; disconnected held intent; validated/stamped future edit; production replacement pending; published edit; applied edit; checkpointed state; recovery error. Invariants: `submitEdit=true` means queued, not applied; effects follow apply; recovery freezes ticking/publication during replacement and records the accepted future tail; an ordinary snapshot is not an acceptance durability receipt.

| From | Event/trigger | Guard | To | Side effects |
| --- | --- | --- | --- | --- |
| Intent | submit while offline | bounded held queue | held | retain age; no accepted effect |
| Held | connected update | not expired; release slot available | transmitted | send one intent; drop expired/replaced backlog |
| Intent | host admission | registered op, valid identity/coordinates, validate succeeds | stamped | assign tick/sequence; batch publication |
| Stamped | flush ordinary room | batch nonempty | published | broadcast ordered edits |
| Stamped | flush production room | budget fits; no pending/error | replacement pending | atomically write checkpoint plus future tail |
| Replacement pending | write resolves | same attachment | published | unfreeze; broadcast accepted batch |
| Replacement pending | write rejects | same attachment | recovery error | mark unready; no accepted publication |
| Published | due tick | ordered by tick then sequence | applied | apply state; notify accepted effects; tick rules |
| Applied | periodic/forced save | ready, no bad save; production barrier idle | checkpointed | ordinary store write or durable replacement |

## Findings

- **Historical protection verified:** `serveSnapshot` now checks `badSave` ([sync.ts](../../src/world/sync.ts#L514)); the older audit's missing guard is not a new finding.
- **Suspected — source capacity race:** [source apply](../../src/world/rules/sources.ts#L55) consumes a charge before checking the destination after other admitted edits apply. Reproduction pending; no fix yet.

## Issue groups

Confirmed groups and their priority will be entered here after reproduction, before their implementation commits. Shared progress loss/duplication and room failure precede desync, softlocks and cosmetics.

## Verification and limits

Initial state: clean branch `codex/state-machines`, baseline above. Required review and feature-fix maps and triggered safety contracts read. No images opened, no bots run, no claim about visuals or real-time feel. Final check results and commit list will replace this provisional verification entry.
