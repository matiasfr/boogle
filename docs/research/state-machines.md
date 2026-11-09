# State machines: transitions, recovery and acceptance

> **Verdict:** State machine transitions and recovery audit ledger.
> **Top recommendations:** none; audit ledger of state transitions and recovery.
> **Status:** reference. See [state-ownership-audit](state-ownership-audit.md).

_6 November 2026. Audit baseline `816068efcb6d5a9088c001001bec3fe2f8a18e3b`; current worktree only. This document is the inventory and finding ledger. Source links refer to this branch. The initial audit used no external network; the review follow-up fetched origin/main as explicitly requested. No running-game observations._

Use [the ownership audit (#899)](state-ownership-audit.md#complete-player-facing-state-inventory) for ownership and persistence classifications. Its historical findings are leads, not current reproductions. This audit keeps existing owners and distinguishes queued intent, accepted work, applied state and durable checkpoints.

## Scope and evidence standard

A finding is **confirmed** only after an executed regression or reproduced exact-code trace. Static risks remain **suspected**, with no speculative fix. Each fixed issue records its failing-before/passing-after test and commit. Architecture or policy changes remain **open-needs-owner-call**. Tests explicitly requested for this audit take precedence over the usual feature test diet. No changes to gameplay feel, visuals, copy, reserved route-repair files, wire shapes or save schemas are planned.

The initial documentation commit (`ced49a0a`) precedes all fixes. Verification uses installed Node 26.13.0; the initial shell selected Node 24. `npm run inflight` is not run because it fetches externally; only local Git state is inspected. This inventory covers the requested owners and additional recovery, request, input and clock machines found along their paths. It does not claim an exhaustive enumeration of every decorative prototype's animation states.

## Machine inventory

| Machine family                                           | Owners                                                                                                                                                                                              | Audit coverage                                |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Transport, reconnect, room join/lead/presence            | [transport](../../src/net/ws-room.ts#L58), [netplay](../../src/netplay/net.ts#L350)                                                                                                                 | Inspected; localhost session regressions      |
| Hosted rooms, asynchronous load/save/unload              | [rooms](../../server/src/host/rooms.ts#L33), [hosted room](../../server/src/host/hosted-room.ts#L81), [world host](../../server/src/host/world-host.ts#L81), [store](../../server/src/store.ts#L67) | Inspected; server suite                       |
| World role, admission, tick/apply, snapshot and recovery | [sync](../../src/world/sync.ts#L128), [rules contract](../../src/world/rules/README.md#contract)                                                                                                    | Inspected; reconnect/conservation regressions |
| Place election, adoption, requests and local save/load   | [co-op](../../src/proto/place/coop.ts#L143), [job](../../src/proto/place/job.ts#L63)                                                                                                                | Inspected; exact module reset regression      |
| Boot, loading, frame and feature startup                 | [main](../../src/main.ts#L95), [loop](../../src/loop.ts#L153), [boot](../../src/boot/index.ts#L11)                                                                                                  | Inspected; existing loading tests             |
| Player movement, held item and interactions              | [player](../../src/entities/player/state.ts#L78), [hands](../../src/player/hands.ts#L81), [held](../../src/features/held.ts#L56)                                                                    | Code trace; no playtest                       |
| Entity lifecycle and changing physics authority          | [walker](../../src/entity/walker.ts#L63), [owner sync](../../src/netplay/owner-sync.ts#L58)                                                                                                         | Inspected; existing walker tests              |

### World attachment and synchronization

Owners: [role and flags](../../src/world/sync.ts#L156), [attachment](../../src/world/sync.ts#L884), [clock](../../src/world/sync.ts#L399), [snapshot receipt](../../src/world/sync.ts#L527).

States: local; client waiting; client ready; disconnected client; host loading; host ready; recovery blocked. `connected`, `ready`, `awaiting`, `hostId`, `asm`, queued edits and the attachment generation form overlapping substates. Invariants: only host stamps identities; clients accept pinned-host traffic; a client starts from an authoritative snapshot; failed-load fallback cannot be persisted or served; completed old recovery writes cannot publish into a new attachment.

| From           | Event/trigger             | Guard                            | To                            | Side effects                                                                                                              |
| -------------- | ------------------------- | -------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Any            | attach room               | caller supplies role             | host loading / client waiting | detach listeners; clear held/queued work; install room callbacks                                                          |
| Host loading   | read current save         | valid snapshot/state             | host ready                    | restore tick and states; notify snapshot listeners                                                                        |
| Host loading   | corrupt ordinary save     | parse/load error                 | bad-save fallback             | suppress save and snapshot serving; record failure                                                                        |
| Client waiting | complete snapshot chunks  | valid payload from accepted host | client ready                  | replace state, pending queue and clock; notify listeners                                                                  |
| Client ready   | hash mismatch / late edit | resync throttle elapsed          | awaiting resync               | request snapshot; retain current state until replacement                                                                  |
| Client         | disconnect / reconnect    | connection callback              | disconnected / client waiting | reconnect clears host pin, pending hashes and chunk assembly; requests snapshot and retries; held intents drain over time |
| Any attached   | detach                    | none                             | local                         | unsubscribe callbacks; increment async attachment fence                                                                   |

### World admission, application and durability

Owners: [admission](../../src/world/sync.ts#L238), [held intents](../../src/world/sync.ts#L292), [apply](../../src/world/sync.ts#L347), [recovery](../../src/world/sync.ts#L682), [ordinary persistence](../../src/world/sync.ts#L823).

States: intent; disconnected held intent; validated/stamped future edit; production replacement pending; published edit; applied edit; checkpointed state; recovery error. Invariants: `submitEdit=true` means queued, not applied; effects follow apply; recovery freezes ticking/publication during replacement and records the accepted future tail; an ordinary snapshot is not an acceptance durability receipt.

| From                | Event/trigger         | Guard                                                        | To                  | Side effects                                     |
| ------------------- | --------------------- | ------------------------------------------------------------ | ------------------- | ------------------------------------------------ |
| Intent              | submit while offline  | bounded held queue                                           | held                | retain age; no accepted effect                   |
| Held                | connected update      | not expired; release slot available                          | transmitted         | send one intent; drop expired/replaced backlog   |
| Intent              | host admission        | registered op, valid identity/coordinates, validate succeeds | stamped             | assign tick/sequence; batch publication          |
| Stamped             | flush ordinary room   | batch nonempty                                               | published           | broadcast ordered edits                          |
| Stamped             | flush production room | budget fits; no pending/error                                | replacement pending | atomically write checkpoint plus future tail     |
| Replacement pending | write resolves        | same attachment                                              | published           | unfreeze; broadcast accepted batch               |
| Replacement pending | write rejects         | same attachment                                              | recovery error      | mark unready; no accepted publication            |
| Published           | due tick              | ordered by tick then sequence                                | applied             | apply state; notify accepted effects; tick rules |
| Applied             | periodic/forced save  | ready, no bad save; production barrier idle                  | checkpointed        | ordinary store write or durable replacement      |

### WebSocket transport and outer connection retries

Owners: [socket state](../../src/net/ws-room.ts#L58), [open/receive/close](../../src/net/ws-room.ts#L104), [heartbeat/teardown](../../src/net/ws-room.ts#L214), [outer retry](../../src/netplay/net.ts#L313), [connect](../../src/netplay/net.ts#L350). States: initial joining, connected/listed, reconnect backoff, stopped/fatal, closed; outer `net.state` is connecting/live/solo, with nullable room and one retry timer. Invariants: stale socket callbacks cannot mutate the replacement socket; fatal identity/browser refusals do not create takeover retry loops; closed rooms stop timers; outer retries only run while solo with no room.

| From             | Event/trigger                    | Guard                       | To                 | Side effects                                                |
| ---------------- | -------------------------------- | --------------------------- | ------------------ | ----------------------------------------------------------- |
| Initial          | open + welcome/list              | current socket              | connected          | resolve room; populate peer list; flush outbox/presence     |
| Connected        | close/heartbeat timeout          | not fatal/closed            | backoff            | connection false; mark peers expected back; schedule reopen |
| Backoff          | timer                            | still live room instance    | reconnecting       | replace socket; retain session credentials                  |
| Any socket       | stale callback                   | socket differs from current | unchanged          | ignore callback                                             |
| Joining/live     | full/taken/elsewhere/fatal error | refusal code                | stopped            | reject or notify error; outer owner closes/detaches         |
| Outer connecting | join rejected                    | retryable error             | solo               | clear remotes; schedule 4s full-room or bounded 5–30s retry |
| Outer solo       | retry timer                      | no room; still solo         | connecting attempt | invoke connect; successful join clears retry counters       |
| Any room         | close                            | once                        | closed             | cancel reconnect/heartbeat and dispose listeners            |

### Session presence, lead and grace

Owners: [server session lifecycle](../../server/src/host/hosted-room.ts#L81), [binding and join](../../server/src/host/hosted-room.ts#L286), [peer table](../../src/net/peer-table.ts#L89), [presence interpretation](../../src/netplay/net.ts#L237), [field deletion](../../src/netplay/presence-fields.ts#L20). States: active visible/hidden; disconnected grace; removed; retired by takeover. Lead is an orthogonal oldest-visible selection, not the lockstep server host. Invariants: one current socket per session; the session retains its pid/key; old socket close cannot remove its replacement; missing/null presence means off; sequence ordering/tombstones prevent stale resurrection.

| From           | Event/trigger                 | Guard                            | To                 | Side effects                                                              |
| -------------- | ----------------------------- | -------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| Absent         | join                          | room capacity and valid identity | active             | welcome/list; broadcast join; request world snapshot                      |
| Active/grace   | same-session reconnect        | same bound pid/key               | active replacement | inherit presence; replace socket; invalidate old callback                 |
| Active/grace   | same session, changed pid/key | binding mismatch                 | unchanged          | refuse newcomer with existing `taken` response (G1)                       |
| Active         | newer session for same pid    | same key                         | retired            | tell older tab elsewhere; remove old presence; elect lead                 |
| Active         | disconnect                    | current socket                   | grace              | retain slot/presence briefly; lead reevaluation                           |
| Grace          | grace deadline                | no successful rejoin             | removed            | peer departure; free slot; client removal hooks                           |
| Visible/hidden | presence visibility changes   | increasing transport sequence    | new visibility     | lead broadcast; Owner fields updated; missing field clears receiver state |
| Client listed  | older/duplicate presence      | nonincreasing sequence/tombstone | unchanged          | ignore stale update                                                       |

### Server room allocation and unload

Owner: [rooms.ts](../../server/src/host/rooms.ts#L33), [upgrade and close gates](../../server/src/host/rooms.ts#L129). States: absent, allocated/loading, active, empty retained, closing, blocked-after-save-failure. Invariants: an unloading room retains its slot until its save drains; join cannot create a second authority over a closing slot; failed close never silently reloads potentially stale disk state.

| From            | Event/trigger        | Guard                                                     | To              | Side effects                                    |
| --------------- | -------------------- | --------------------------------------------------------- | --------------- | ----------------------------------------------- |
| Absent          | upgrade              | allowed room; room budget available; service not stopping | allocated       | create hosted room/world                        |
| Allocated/empty | join                 | not closing/blocked                                       | active          | attach session                                  |
| Active          | last session expires | zero retained clients                                     | empty           | start idle lifetime                             |
| Empty           | sweep                | idle threshold; not configured-retained room              | closing         | close room; retain map slot while awaiting save |
| Closing         | join                 | closing flag                                              | closing         | reject upgrade; no replacement authority        |
| Closing         | save resolves        | same closing slot                                         | absent          | remove room from map                            |
| Closing         | save rejects         | failure                                                   | blocked         | retain failure/slot until service restart       |
| Any allocated   | service shutdown     | stopping set first                                        | closing/blocked | await all closes; report aggregate failures     |

### Save scheduling, startup and durable replacement

Owners: [classic world host](../../server/src/host/world-host.ts#L81), [write/close](../../server/src/host/world-host.ts#L127), [disk replacement](../../server/src/store.ts#L67), [railway readiness](../../server/src/host/world-host.ts#L391), [railway close](../../server/src/host/world-host.ts#L547). States: unloaded, restoring, running clean/dirty, write queued/in flight, drained, storage failure. Ordinary saves are asynchronous behind a synchronous storage facade; production recovery has a stricter publication barrier described above. Invariants: per-key disk writes serialize temp-file/rename; close awaits the latest write; an older completion cannot clear a newer error; storage failure does not overwrite a failed-load fallback.

| From                 | Event/trigger                     | Guard                                        | To              | Side effects                                                       |
| -------------------- | --------------------------------- | -------------------------------------------- | --------------- | ------------------------------------------------------------------ |
| Unloaded             | room creation                     | saved document available or genuinely absent | restoring       | read, register rules, load state                                   |
| Restoring production | checkpoint + offline-resume drain | durable success                              | running         | enable requests/ticks; no fresh fallback on failure                |
| Running dirty        | changed-save interval             | ready and safe                               | write queued    | capture immutable JSON; enqueue disk save                          |
| Running unchanged    | periodic tick save / close        | forced                                       | write queued    | persist current clock even if state hash unchanged                 |
| Write queued         | predecessor completes             | per-key serialization                        | writing         | write temp file then rename                                        |
| Writing              | error                             | latest sequence                              | storage failure | retain error; later write can retry; close reports failure         |
| Running              | close                             | once                                         | draining        | stop tick timer; force final save; detach and await pending writes |
| Production starting  | joining client's snapshot request | not running                                  | starting        | send `r:state:starting`; client must retry (G4)                    |

### Classic source conservation and rule phases

Owners: [source admission/apply](../../src/world/rules/sources.ts#L45), [source charges/refill](../../src/sim/sources.ts#L36), [pile transfer](../../src/world/rules/piles.ts#L34), [site lifecycle](../../src/world/rules/sites.ts#L44). Source states: available charges, admitted but not yet consumed, depleted, refilled. Destination capacity is a separate mutable state; admission does not reserve it. Invariants: each consumed source charge places exactly one yield; rejected or no-longer-placeable work changes neither source nor destination; integer transfers conserve material. Piles already recheck actual transferable amounts during apply.

| From           | Event/trigger                           | Guard                                  | To               | Side effects                                    |
| -------------- | --------------------------------------- | -------------------------------------- | ---------------- | ----------------------------------------------- |
| Available      | `src.take` admission                    | charge and total capacity              | queued           | stamp intent; no depletion yet                  |
| Queued         | apply                                   | charge and current stack+pile capacity | consumed         | decrement one charge; place entire yield        |
| Queued         | apply after another edit fills capacity | capacity insufficient                  | source unchanged | null result, no successful-transfer effect (G2) |
| Depleted       | section completion / seeded trickle     | refill schedule                        | available        | clear spent count; increment revision           |
| Any source age | age changes                             | new age                                | new-age sources  | reset spent map                                 |

### Production railway session and request receipts

Owner: [railway request coordinator](../../server/src/host/railway-requests.ts#L25), [apply settlement](../../server/src/host/railway-requests.ts#L36), [receive/admission](../../server/src/host/railway-requests.ts#L67). States: absent, opening, ready with next request token, pending bounded requests, completed persisted outcome; availability starting/storage gates all work. Invariants: player comes from authenticated `pidOf`; sid and epoch gate the session; next token is monotone; retries return existing outcomes; terminal replies follow application of a durably accepted stamp, not queue admission.

| From          | Event/trigger             | Guard                            | To        | Side effects                                                          |
| ------------- | ------------------------- | -------------------------------- | --------- | --------------------------------------------------------------------- |
| Absent        | `r:open`                  | available; session edit accepted | opening   | queue `rail.session`; repeated same-session open says starting        |
| Opening       | matching `onApplied`      | success                          | ready     | record epoch/next; send session response                              |
| Opening       | matching apply failure    | failed result                    | absent    | invalid response; remove opening session                              |
| Ready         | expected request token    | bounded window; valid session    | pending   | queue material edit or durable rejection; advance next only if queued |
| Pending       | duplicate request/status  | same token still pending         | pending   | busy response; no second mutation                                     |
| Completed     | replay/status             | persisted outcome found          | completed | replay terminal result                                                |
| Ready/pending | out-of-order future token | within window / outside window   | unchanged | busy / snapshot-required; do not invent acceptance                    |
| Pending       | matching applied result   | authenticated token              | completed | remove pending; emit terminal receipt                                 |
| Any session   | actual departure/takeover | matching sid                     | absent    | retire session; presence gaps alone do not retire it                  |

### Place authority election

Owners: [generation and readiness](../../src/proto/place/coop.ts#L143), [election](../../src/proto/place/coop.ts#L384), [authority-change handling](../../src/proto/place/coop.ts#L1115), [connection/visibility](../../src/proto/place/coop.ts#L1220). States: no eligible remote/self authority; follower of oldest visible recently heard participant; re-aged candidate after reconnect/visibility change. Invariants: all peers with the same eligible peer set use the same age then peer-id ordering; this is a browser authority, separate from server lead. It does **not** promise consensus during a presence partition.

| From          | Event/trigger                      | Guard                                          | To                          | Side effects                                              |
| ------------- | ---------------------------------- | ---------------------------------------------- | --------------------------- | --------------------------------------------------------- |
| Self/follower | presence update                    | participant identity; visible; heard within 5s | elected oldest              | update peer election data                                 |
| Follower      | old authority stale/hidden/removed | election changes                               | self/new follower           | cancel outstanding authority-specific harvest/cargo work  |
| Any           | connection lost                    | callback false                                 | unsynced, re-aged candidate | clear pending authority work; await fresh synchronization |
| Hidden        | visible again                      | visibility event                               | re-aged candidate           | advertise new election age                                |
| Self          | periodic update                    | ready                                          | self                        | advance owned state and emit periodic snapshot            |

### Place snapshot adoption and reset

Owners: [full adoption](../../src/proto/place/coop.ts#L181), [reconciliation and admission](../../src/proto/place/coop.ts#L352), [arrival](../../src/proto/place/coop.ts#L1093). States: loading with optional waiting snapshot; arrived-unsynced; synchronized follower; reset/new generation. Invariants: generation is local to the current authority session, not persisted or globally monotone. A reset clears the pre-arrival waiting snapshot; arrival independently ignores a waiting snapshot older than the local reset. An unsynced tab must still adopt its current authority's snapshot even when that generation is lower (a partitioned local reset may never have reached the authority). Once synchronized, the existing lower-generation guard applies. Matching-generation reconciliation preserves ongoing local presentation until drift thresholds require rebuild.

| From         | Event/trigger                           | Guard                                             | To                            | Side effects                                             |
| ------------ | --------------------------------------- | ------------------------------------------------- | ----------------------------- | -------------------------------------------------------- |
| Synchronized | snapshot                                | generation older than current                     | unchanged                     | discard stale state after synchronization                |
| Loading      | snapshot                                | valid accepted sender                             | loading with waiting snapshot | queue until arrival; generation checked at arrival       |
| Loading      | arrival                                 | scenery/physics/world ready                       | unsynced or synchronized      | replay queued snapshot through generation guard          |
| Unsynced     | initial snapshot                        | authority empty; local save nonempty; not forced  | awaiting adoption decision    | offer local snapshot to authority                        |
| Unsynced     | initial/reconnect snapshot              | otherwise, including a lower authority generation | synchronized                  | adopt authority generation; full restore; rebuild; save  |
| Synchronized | periodic same-generation snapshot       | drift below thresholds                            | synchronized                  | reconcile trains and mutable values                      |
| Synchronized | newer/forced snapshot or repeated drift | generation accepted                               | synchronized                  | clear trips/moments/incoming work; full rebuild and save |
| Any          | reset                                   | newer generation                                  | reset generation              | clear waiting snapshot and pending requests; startOver   |

### Place cargo, harvest and deposit requests

Owners: [cargo retries](../../src/proto/place/coop.ts#L472), [harvest reservation](../../src/proto/place/coop.ts#L643), [deposit pending](../../src/proto/place/coop.ts#L673), [receipts](../../src/proto/place/coop.ts#L767), [deposit handling](../../src/proto/place/coop.ts#L875). These are three related machines, not a general exactly-once protocol. States: idle, reserved/pending, retrying, accepted, cancelled/refunded. Invariants: cargo retries retain original revision/generation/authority; harvest receipt matching precedes award and consumes pending before awarding; deposit timeout alone is not proof of rejection and must not refund.

| From              | Event/trigger                                    | Guard                                   | To                | Side effects                                           |
| ----------------- | ------------------------------------------------ | --------------------------------------- | ----------------- | ------------------------------------------------------ |
| Cargo idle        | claim/drop request                               | valid revision/generation/authority     | cargo pending     | send request; remember expected state                  |
| Cargo pending     | one-second retry                                 | same authority/revision/generation      | pending           | resend identical request                               |
| Cargo pending     | authoritative state / election / reset           | matching result or invalidated epoch    | settled/cancelled | clear request; reconcile shared cargo                  |
| Harvest idle      | strike request                                   | capacity reserved                       | harvest pending   | retain request/tree/generation/authority               |
| Harvest authority | request replay                                   | same last request                       | unchanged         | replay cached receipt                                  |
| Harvest pending   | receipt                                          | matching request/tree/generation/sender | settled           | clear pending, release reservation, then award         |
| Harvest pending   | disconnect/election/reset                        | invalidated authority                   | cancelled         | release pending reservation                            |
| Deposit idle      | send                                             | local contribution available            | pending           | record contribution and destination                    |
| Deposit pending   | accepted stock / rejection / actual peer removal | corresponding result                    | settled/refunded  | clear pending; only proven rejection/departure refunds |

### Place local save/load

Owner: [slice registry and save](../../src/proto/place/job.ts#L63), [forget/restore](../../src/proto/place/job.ts#L93). States: registered slices, capture in progress, persisted, restoring shared then personal, saving disabled. Invariants: JavaScript localStorage calls are synchronous (no overlapping promises inside this owner); exceptions are caught; Start fresh disables future saves before removal, so pagehide cannot recreate forgotten state. Atomic restoration across independent slice setters is not implemented.

| From       | Event/trigger      | Guard             | To                      | Side effects                                                              |
| ---------- | ------------------ | ----------------- | ----------------------- | ------------------------------------------------------------------------- |
| Registered | save               | saving enabled    | persisted or failed     | gather shared/personal slices; JSON encode; setItem; catch storage errors |
| Persisted  | restore            | parse succeeds    | restoring               | apply shared, then personal setters                                       |
| Restoring  | all setters return | valid known data  | restored                | return success                                                            |
| Restoring  | setter throws      | catch             | failed/possibly partial | return false; no transaction rollback                                     |
| Any        | forget saves       | user starts fresh | saving disabled         | remove keys; later save calls no-op                                       |

### Boot, interactivity and retry budgets

Owners: [entry](../../src/boot/index.ts#L11), [startup barriers](../../src/main.ts#L95), [failure](../../src/boot/failure.ts#L6), [timeline](../../src/boot/timeline.ts#L119), [splash disposal](../../src/boot/splash.ts#L120), [asset fetch](../../src/boot/asset-fetch.ts#L14), [chunk reload](../../src/boot/chunk-reload.ts#L9). States: importing, assets pending, warming, rendering, interactive; terminal failed; bounded retry/reload. Invariants: first diagnostic completion is not proof of interactivity; one warmup deadline bounds shader/GPU waiting; repeated failure cannot schedule unbounded page reloads; splash completion is idempotent.

| From               | Event/trigger            | Guard                              | To                     | Side effects                                            |
| ------------------ | ------------------------ | ---------------------------------- | ---------------------- | ------------------------------------------------------- |
| Importing          | main dependencies settle | success                            | assets pending/warming | await sky and avatar then warm shaders                  |
| Warming            | compile or 16s deadline  | first settles                      | rendering              | start frame loop; await RAF/GPU or remaining deadline   |
| Rendering          | startup render barrier   | fulfilled                          | interactive            | mark interactive; dismiss splash; enable entry          |
| Any startup        | fatal rejection          | boot failure handler               | failed                 | disable Enter; show failure; dismiss splash             |
| Diagnostic pending | interactive+room or 20s  | first completion                   | diagnostic done        | record metrics; does not resolve interactive itself     |
| Fetching           | HTTP 503                 | fewer than two retries             | backoff/fetching       | cancel response body; delay 500/1500ms                  |
| Chunk failure      | recognized early error   | age <60s; session reload budget <2 | reload scheduled       | one 500/1500ms reload; storage failure prevents looping |
| Splash active      | done                     | not already done                   | stopping/disposed      | unsubscribe; next RAF exits; bounded removal timer      |

### Service worker, frame clocks and feature startup

Owners: [SW registration](../../src/boot/sw.ts#L22), [worker lifecycle](../../src/boot/sw-worker.ts#L40), [loop registration](../../src/loop.ts#L153), [world clock handoff](../../src/world/background.ts#L7). States: SW not registered/installing/active; features registered/started; visible frame versus hidden worker clock. Invariants: service worker registration waits actual interactivity as well as diagnostics; feature modules and service hooks live for the page; world elapsed time has one cursor so a late inactive callback cannot double-count it.

| From                | Event/trigger                 | Guard                           | To           | Side effects                          |
| ------------------- | ----------------------------- | ------------------------------- | ------------ | ------------------------------------- |
| SW waiting          | diagnostic done + interactive | registration supported/enabled  | installing   | register worker                       |
| Installing          | precache tasks settle         | install handler                 | installed    | await allSettled results              |
| Installed           | activate                      | worker event                    | active       | remove obsolete caches; claim clients |
| Active              | fetch                         | cache policy allows             | active       | cache hit or network response         |
| Feature registered  | runStart                      | normal single main call         | started      | invoke setup callbacks                |
| Feature late-loaded | onStart registration          | already started                 | started      | invoke immediately                    |
| Visible clock       | document hidden               | worker available                | hidden clock | worker advances same cursor           |
| Either clock        | stale/inactive callback       | inactive or timestamp <= cursor | unchanged    | ignore; no elapsed-time theft         |
| Active clock        | elapsed time                  | later timestamp                 | advanced     | cap catchup at 5s in <=0.4s chunks    |

### Player movement and input gates

Owners: [state fields](../../src/player/state.ts#L6), [entry/input](../../src/entities/player/state.ts#L78), [jump/steer](../../src/entities/player/state.ts#L143), [contact/respawn](../../src/entities/player/state.ts#L246), [input flags](../../src/player/input-state.ts#L7). States are orthogonal: not entered/entered; grounded/coyote/airborne/swimming; jump queued/held/rising/released; seated/conversation-held/knocked-down. This is Owner physics, not deterministic world state. Invariants: enter once creates body before callbacks; one jump consumes queue/coyote; modal/conversation input suppression does not pause the shared world; water and contact state come from local physics.

| From            | Event/trigger                          | Guard                                 | To                | Side effects                                                |
| --------------- | -------------------------------------- | ------------------------------------- | ----------------- | ----------------------------------------------------------- |
| Not entered     | enterIsland                            | not already entered                   | entered           | create body; teleport; invoke entry hooks; publish presence |
| Grounded/coyote | jump press                             | queued window and coyote remain       | airborne          | set upward velocity; consume queue/coyote; count launch     |
| Airborne rising | release/vertical apex                  | deliberate jump                       | released/falling  | apply existing short-hop/fall shaping                       |
| Airborne        | support contact                        | walkable normal and contact freshness | grounded          | renew coyote and steering grace                             |
| Land/air        | sampled water depth crosses zero       | body exists                           | swimming / dry    | buoyancy/drag and swim input gates                          |
| Moving          | held conversation / knockdown          | flags active                          | suppressed intent | clear wish and queued jump                                  |
| Any entered     | fall below respawn bound / Get unstuck | body exists                           | spawn             | teleport and zero velocity                                  |

### Held items, throws, interactions and modal ownership

Owners: [inventory](../../src/player/inventory.ts#L16), [hands](../../src/player/hands.ts#L81), [throw](../../src/player/throw.ts#L22), [held presentation](../../src/features/held.ts#L56), [modal](../../src/player/modal.ts#L15), [conversation](../../src/player/conversation.ts#L131). States: empty/holding; charge idle/charging/release-suppressed; target absent/blocked/actionable; modal closed/open; conversation closed/open. Invariants: one hand slot; ball ownership loss clears held ball; a release cannot throw twice after charging clears; interact cannot execute mid-throw; queued toss is not durable delivery; held toy persistence is intentionally visit-local.

| From                    | Event/trigger                | Guard                       | To                        | Side effects                                           |
| ----------------------- | ---------------------------- | --------------------------- | ------------------------- | ------------------------------------------------------ |
| Empty/holding           | take                         | known carryable or ball     | holding new item          | let old item go; increment version; notify hand change |
| Holding ball            | ownership lost               | no longer mine+held         | empty                     | cancel impossible charge through hand change           |
| Holding                 | use/toss press               | throwable                   | charging                  | set charge start; clear suppression                    |
| Charging                | release                      | not suppressed              | idle/empty or thrown ball | cancel charge before launch; failed queue restores toy |
| Release suppressed      | release after grab           | suppression set             | idle                      | consume suppression without throw                      |
| Target actionable       | interaction press            | entered, body, not charging | target-dependent          | run target; invalidate pick cache                      |
| Target blocked/absent   | press                        | no runnable target          | unchanged                 | no action; preserve blocked-target priority            |
| Modal closed            | open                         | no other modal              | modal open                | release input; divert pad/keys; exit pointer lock      |
| Conversation closed     | talk                         | no modal/conversation       | conversation open         | hold movement; install talk input                      |
| Modal/conversation open | close                        | active                      | closed                    | relinquish input/held state                            |
| Held presentation       | inventory/remote-held change | different item id           | new mesh/label            | replace hand mesh; update UI from inventory version    |

### Entity lifetime and changing physics ownership

Owners: [entity shell](../../src/entity/entity.ts#L63), [walker spawn/despawn](../../src/entity/walker.ts#L63), [teardown flush](../../src/entity/walker.ts#L109), [Owner arbitration](../../src/netplay/owner-sync.ts#L58). Entity states: unspawned, live, dead awaiting flush, disposed. Physics authority states: unowned, local sim/held ghost, remote-following, orphan grace. Invariants: dead entities stop walking immediately; detach precedes dispose; teardown can safely enqueue more teardown; authority claims order by epoch then peer id and release before following another owner. This eventual Owner arbitration is not a lockstep consensus protocol.

| From            | Event/trigger               | Guard                                                            | To             | Side effects                                         |
| --------------- | --------------------------- | ---------------------------------------------------------------- | -------------- | ---------------------------------------------------- |
| Unspawned       | spawn                       | not previously spawned                                           | live           | attach owned resources; register walker              |
| Live            | despawn                     | not already dead                                                 | dead pending   | mark dead immediately; skip future methods           |
| Dead pending    | end-of-phase flush          | queued teardown                                                  | disposed       | detach resources then invoke dispose; isolate errors |
| Live walk       | spawn during walk           | cached walk length                                               | live next walk | avoid unbounded recursive same-walk execution        |
| Unowned/remote  | local claim                 | object-specific grab/adopt rule                                  | local          | epoch+1; load pose; set sim/ghost; publish presence  |
| Local           | higher winning remote claim | epoch or tie-break wins                                          | remote         | onRelease; ghost mode; follow snapshots              |
| Remote          | missing claim/removal       | no local owner                                                   | orphan grace   | clear old samples; wait for eligible adopter         |
| Orphan grace    | resolve                     | 600ms grace + 1500ms join wait; lowest visible peer; tab visible | local          | object adopts orphan                                 |
| Any local owner | release                     | mine                                                             | unowned/ghost  | release callback; clear mine; publish off            |

## Findings

- **Historical protection verified:** `serveSnapshot` now checks `badSave` ([sync.ts](../../src/world/sync.ts#L514)); the older audit's missing guard is not a new finding.

| Finding                                                          | Priority / impact                                                                        | Reproduced evidence                                                                                                                                                                                                                            | Status / regression                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1: public session id bypasses its bound pid/key                 | P1: another socket can replace a player and act under their identity                     | Four real localhost socket traces: active and grace sessions, each with changed pid or changed key, received `welcome` before the fix; expected `taken`. Valid original reconnect remains allowed.                                             | **Fixed in `ffa405f8`.** `a live/grace session id cannot replace its bound pid/key`, [test](../../server/test/host.test.ts#L62).                                                                                            |
| F2: two admitted source takes consume an unplaceable yield       | P1: lost shared source material; rare saturated classic world                            | Stack has one yield of room, all 128 piles full. Two takes pass admission; before fix both charges disappear but only one yield is placed (`0 !== 1` remaining charge).                                                                        | **Fixed in `23700980`; namespace isolation completed in `43df1067` (`v12`).** `concurrent source takes preserve charges when destination capacity disappears before apply`, [test](../../test/world-rules.test.ts#L25).     |
| F3: queued pre-arrival snapshot undoes Start over                | P1: discarded shared progress resurrects / new reset diverges                            | Execute actual compiled co-op module with inert presentation dependencies: same authority sends `snap(gen0)`, then `reset(gen1)`, then client `arrived()`. Before fix generation returns to 0 and old awake state returns.                     | **Corrected in `5874b674`; the overly broad guard in `98427224` is superseded.** `a snapshot queued before arrival cannot undo a later reset from the same authority`, [test](../../test/place-coop-snapshot.test.ts#L120). |
| F4: reconnect ahead of booting authority does not retry snapshot | P2: stale world / stalled client until server catches up or another subsystem repairs it | Reconnect a previously synced client ahead of replacement host; proactive join snapshot occurs during recovery write and is refused; finish startup and tick 3s. Before fix no new snapshot loads; after fix retry restores current authority. | **Fixed in `c2f8c267`.** `reconnect replaces a client ahead of a restarted host before waiting for its old tick`, [test](../../test/world-sync.test.ts#L209).                                                               |

F4 reachability qualification: ordinary [server join](../../server/src/host/hosted-room.ts#L350) already requests a snapshot, so this is **not** a claim that every restart stalls. [Production startup](../../server/src/host/world-host.ts#L515) answers `starting` instead of serving while recovery is incomplete. Core sync previously kept `ready=true, awaiting=false`, ignored hashes below its old tick and never retried. The regression includes that early refused snapshot and a deferred startup write. The production adapter may independently request resync; duration of a player-visible stall was not measured.

### Suspected and owner-call items

| Item                                                              | Evidence and limit                                                                                                                                                                                                                                       | Status / next decision                                                                                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Presence partitions can create two Place authorities              | [Election](../../src/proto/place/coop.ts#L384) excludes stale/hidden peers; [cargo gate](../../src/proto/place/coop.ts#L535) is stricter than every deposit/harvest path. No two-tab partition/material-loss schedule reproduced.                        | **Suspected**; converting authority or conservation belongs to the existing production-core owner plan, not a temporary extra authority. |
| Queued Place snapshot loses original force/source metadata        | `waiting` retains a snapshot; [arrival](../../src/proto/place/coop.ts#L1093) replays through the current path with force false. F3 is fixed independently; no remaining wrong-authority or false-nonempty-offer trace reproduced.                        | **Suspected**; add a concrete election/reset schedule before changing adoption policy.                                                   |
| Deposit message generation/deduplication differs from harvest     | [Deposit handling](../../src/proto/place/coop.ts#L875) lacks the same receipt map/generation contract. Reliable WebSocket ordering is not evidence of duplicate delivery.                                                                                | **Suspected**; need actual retry/double-send path and conservation witness; do not add wire protocol speculatively.                      |
| Partial local restoration after a slice throws                    | [Restore](../../src/proto/place/job.ts#L110) catches around sequential setters; earlier setters may already have applied. No current valid saved document causing the failure reproduced.                                                                | **Suspected**; decide atomic restore/error UX only after identifying an actual failing slice.                                            |
| Duplicate/out-of-order world batches outside transport guarantees | [Receipt](../../src/world/sync.ts#L616) appends valid future stamps without a general seen-sequence set. Existing WebSocket is ordered and host-origin messages cannot be forged through ordinary client relay. No real duplicate batch path reproduced. | **Suspected**, not a confirmed desync; no generic dedupe framework added.                                                                |
| Reserved route files and old personal-save findings               | The prior ownership audit lists `finds` collision and reward-save ordering. Reserved `tech.ts`, `tech-layout.ts`, flags and prototype index were left untouched; current reproduction was not attempted here.                                            | **Suspected / unverified**, not carried forward as confirmed findings.                                                                   |
| Ordinary accepted work is not crash-durable before checkpoint     | Ordinary world publication intentionally precedes asynchronous persistence; production recovery has a stronger durable-tail barrier. This is a documented contract, not a newly reproduced corruption bug.                                               | **open-needs-owner-call** if stronger ordinary-room durability is desired; reuse the existing production-core direction.                 |

## Issue groups

Tracked as G1 [#1062](https://github.com/matiasfr/boogle/issues/1062), G2 [#1063](https://github.com/matiasfr/boogle/issues/1063), G3 [#1064](https://github.com/matiasfr/boogle/issues/1064), G4 [#1065](https://github.com/matiasfr/boogle/issues/1065); suspected and owner-call items [#1066](https://github.com/matiasfr/boogle/issues/1066).

| Group / title                                                    | Findings         | Impact                                           | Minimal fix outline                                                                                            |
| ---------------------------------------------------------------- | ---------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| G1 — Bind reconnects to the existing session identity            | F1               | Player replacement / unauthorized shared actions | Check active or grace record's pid/key before takeover, capacity or presence mutation; reuse existing refusal. |
| G2 — Recheck source destinations before consuming a charge       | F2               | Shared material lost                             | Recompute stack/pile capacity in apply; return null before depletion when entire yield cannot fit.             |
| G3 — Retire queued snapshots on reset without blocking reconnect | F3 and review R2 | Pre-reset progress restored / reconnect softlock | Clear waiting on reset and reject stale waiting at arrival; preserve lower-generation adoption while unsynced. |
| G4 — Restart snapshot acquisition when a room reconnects         | F4               | Stale/stalled shared world                       | Reuse `becomeClient`; clear old chunk/hash state; request snapshot and keep bounded retries active.            |

Four issue groups and both review corrections are fixed; remaining items lack reproduction or need an ownership/policy decision. **The source fix changes an existing op's apply meaning even though its shape is unchanged.** Review R1 therefore adds `WORLD_NS = 'v12'`, the next version after freshly fetched `origin/main`'s `v11`, with the dated 2026-11-06 history line. No migration or compatibility fence is added. No gameplay tuning, rendering, Boogler copy, or reserved-file edits.

## Review follow-up — 6 November 2026

| Review item                                                                  | Status                  | Fresh evidence                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1: changed `src.take` apply meaning lacked room isolation                   | **Fixed in `43df1067`** | `WORLD_NS` bumped from main's `v11` to `v12`; dated history records that a charge is spent only when the whole handful fits. Registry passes. No mixed-build compatibility test or migration was added.                                                                             |
| R2: broad generation guard strands a rejoining tab after a partitioned reset | **Fixed in `5874b674`** | Actual co-op module: synchronize at gen 0, disconnect/re-age, locally Start over to gen 1 while sends are dropped, reconnect to gen-0 authority. Before: gen remains 1. After: adopts 0, sends a gen-0 cart recall, ignores the abandoned gen-1 reply, and accepts the gen-0 reply. |

The original `a snapshot queued before arrival cannot undo a later reset from the same authority` test was rerun red with the original adoption restored but no waiting cleanup, then green with the narrow fix. The new `a partitioned reset reconnect adopts the lower authority generation and accepts its recall reply` test was red against `98427224`'s broad guard, then green with the correction. The current-snapshot control also passes. Independent review found no blockers. Logs: `.look/state-machines/review-followup/{partition-before,queued-reset-before,regressions-after}.txt`.

After both correction commits, `git fetch origin main` and `git rebase origin/main` completed: main is `816068efcb6d5a9088c001001bec3fe2f8a18e3b`, and the branch was already based on it, so no commits were rewritten. No amendments, push or ship. Fetching origin/main is the explicit follow-up exception to the original local-only network restriction.

**Fresh follow-up checks:** `npm run check` passes with **392/392 unit tests**, zero lint problems, typecheck, registry, level checks, asset validation and build. The explicit `npm run registry` also passes (28 presence keys, 14 message types, 16 ops, 9 states). All three Place snapshot tests and the source conservation/replay tests pass. There are no remaining failures in the executed checks. Logs are `review-followup/check.txt`, `review-followup/registry-final.txt` and `review-followup/regressions-after.txt` under `.look/state-machines/`; the [current evidence manifest](../../.look/state-machines/evidence.json) identifies this revision. The earlier 77-server/196-network results below are historical and were not rerun for this follow-up. Browser/device behavior remains unverified.

## Verification and limits

Initial state: clean branch `codex/state-machines`, baseline above. Required review and feature-fix maps and triggered safety contracts read. Independent code review found no correctness blocker in G1/G2/G4; it narrowed the real reconnect trace as recorded above. G3 review confirmed the test executes the original whole co-op module rather than a copied transition function; presentation is stubbed and no rendering claim follows.

Red/green logs are retained in `.look/state-machines/`: `session-binding-{before,after}.txt` (4 failing → 4 passing); `source-capacity-{before,after}.txt` (loss case fails → passes plus spill control/replay); `place-snapshot-{before,after}.txt` (reset case fails → 2 passing); `reconnect-{before,after}.txt` (startup reconnect fails → 34 sync/recovery tests passing). The local [evidence manifest](../../.look/state-machines/evidence.json) records log hashes, commands, commits and limits; [handoff](../../.look/state-machines/handoff.md) is the short artifact index. These ignored local evidence artifacts must accompany the checkout handoff.

**Earlier evidence, not a claim about the follow-up revision:** `npm run check:full` passed: lint/typecheck, **391/391 unit tests**, registry, level/assets/build, **77/77 server tests**, and **196/196 localhost network checks**. The final reconnect test was then strengthened to explicitly defer replacement-host startup and refuse the proactive join snapshot; its red/green was repeated and the final **`npm run check` passed**, again with 391/391 unit tests and zero lint problems. All changed files were passed to `npx prettier --write`; the Markdown file required `--ignore-path /dev/null` because the repository normally excludes Markdown. All 104 source/document links resolved and line anchors were within their files. No performance conclusion follows from the network harness; an eight-peer load benchmark was not run because no presence payload, cadence, relay or room-capacity behavior changed.

| Commit     | Change                                                         |
| ---------- | -------------------------------------------------------------- |
| `ced49a0a` | Initial audit documentation before fixes                       |
| `ffa405f8` | G1: bind reconnects to existing player and secret              |
| `23700980` | G2: preserve unplaceable source charges                        |
| `98427224` | G3: reject stale initial Place snapshots                       |
| `c2f8c267` | G4: restart snapshot acquisition on reconnect                  |
| `787106ab` | Complete initial 17-machine audit and evidence                 |
| `43df1067` | Review R1: bump namespace for changed source semantics         |
| `5874b674` | Review R2: preserve queued-reset safety and reconnect adoption |

No images opened. No visual question or gameplay-feel change was part of this correctness task; no observation against visuals is claimed. The headless localhost room/network harness runs actual transport/sync without a rendered game. A full co-op gameplay bot, `world-inputs` browser scenario, GPU smoke, and device playtest remain unverified; `checks-for` suggested the first two, but this worker has no launcher browser broker and the user explicitly says it cannot see the running game. No push or ship. The review follow-up fetched origin/main only as explicitly requested; gameplay/network tests use localhost.
