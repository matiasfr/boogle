# Plan: persistent player accounts

## Goal

Let a player keep one identity across browsers and devices by saving a short PIN, while continuing to let friends play without registering. Accounts identify people; each room keeps its own progress, wallet, upgrades and saves. Serves DESIGN.md **6. Communal world, personal things**, **8. Enjoyable alone and together**, **Clear authority** and **Small and readable**.

> **Status, 18 November 2026 against main 12c244db:** Steps 1–4 are on main (#1868, #1871, #1873, #1875), with browser-proof/startup fixes (#1879, #1884, #1887) and the review fixes (#2153). Checkpoint A passed through the trusted broker and its fresh review ran ([17 November](#step-5-runner-evidence-17-november-2026)). Checkpoint B's browser and load proofs are on main (#2187, [18 November](#checkpoint-b-run-18-november-2026)): `net` 237/237, before/after load, room isolation, storage denial, expired session, lost create response, the Account visual review and the atlas check. `net-roadmap.md` section 1 is written as built and the server image manifests were checked (step 5 below). Step 5 stays open: a clean `npm run check` exit on the final tree, the owner's read of three Account copy/state notes, and the backlog row; not tested on a device.

## Owner answers (15 November 2026)

Put to the owner as four questions with the plan's recommendations (question 5 is the orchestrator's, not his). His picks:

1. **Sign-in: a short PIN instead of the 26-character code** (he chose "Short PIN instead" over the recommended code). Orchestrator's reading: the code becomes a short PIN that is easy to type, sized for a casual game under [don't over-engineer against attackers](../agents/owner-calls.md): simple server-side rate limits on sign-in, nothing heavier. Immediate guest play stays; password and email recovery stay out. Confirmed later on 15 November: PIN alone, five digits, generated and unique; see the decision below.
2. **Fresh identity at the cutover: yes** (recommended). One `WORLD_NS` bump at the authentication cutover, server-issued pids, no import of old browser pids.
3. **First slice carries identity only** (recommended). Nickname, colour, wardrobe and finds, settings, conversations and recent position stay on the device for now.
4. **Lost PIN with every device signed out: a new account** (recommended), with clear copy before dismissal; a still-signed-in device can replace the PIN and sign the others out. Email recovery waits for demand.

**Research:** [net-roadmap, section 1](net-roadmap.md#1-stable-player-identity-done-2026-10-31) supplies the pid seam and newer-tab-wins rule; [ideas, Multiplayer](../ideas.md#multiplayer) supplies the owner's 10 November device/password/code options and room-as-save intent. [Engine long-term, per-account row](../research/engine-long-term.md#target-architecture-one-page-contract) supports separate account records and credentials outside ECS; it is research, not adopted authority. This plan takes that separation, not its proposed general migration framework. [Sync](../agents/sync.md) is current: Local, Owner and Server, with no client lockstep or lead-tab host. DESIGN.md's older sync table and the roadmap's SQLite room-storage phase do not require rebuilding either here.

## Current evidence and scope

Opened the required briefs, owner calls, decision topic rules, planner format, tool/check contracts and nested instructions for `server/`, `src/net/`, `src/netplay/`, `src/world/`, `src/features/`, plus the player state-consumer rules. Focused source reads establish:

- `src/player/identity.ts` creates a 10-character `boogle.pid` and 24-character `boogle.key` in localStorage. `adoptPid(pid)` stores only a pid for the next load: it is not authentication and cannot transfer a credential safely.
- `src/netplay/net.ts` passes those values to `createWsRoom`; `src/net/ws-wire.ts` currently puts both in the socket URL. `server/src/host/rooms.ts` validates their shapes; `hosted-room.ts` compares keys only with live/grace-period occupants. An absent player's pid has no durable proof of ownership.
- `hosted-room.ts` binds command identity through `pidOf`, implements same-room takeover with `ELSEWHERE`, and separately uses a configured key for tuning authority. `src/features/identity.ts` publishes pid and sends `who.set`; no gameplay consumer needs an account ID.
- `server/src/store.ts` stores room documents. It is not an account store. `src/player/pause-pages.ts` provides a lazy Local page pattern; `you-editor.ts` keeps nickname/colour locally. Arrival memory and wardrobe are also local; merely sharing a pid does not synchronize them.
- [Direction](../direction.md) was reviewed on 8 November and is stale for this task. The 14 November account commitment and current source govern scope. The latest [playtest](../playtests.md#2026-11-14-owner-solo-the-whole-built-route-wake-to-high-gorge-and-the-powered-pick) describes reload/travel problems, not account testing. [Recent return](resume-where-you-were.md) remains a separate owner of spawn policy.

**Disposition:** proceed with this bounded account plan for review. Prerequisites already present: pid consumers, socket binding, same-room takeover and a durable server volume. Missing: persistent credential verification and account UI. No engine replacement, whole-room SQLite conversion, email service or gameplay playtest is a prerequisite. The smallest proof is two isolated browser stores authenticating to one pid, followed by a server restart and a room-progress isolation check.

## Design

### Short PIN: owner decision, 15 November 2026

| Option        | Benefit                                          | Cost / verdict                                                                                                   |
| ------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| PIN alone     | One field on every device; no account-name rules | Must be unique across accounts. **Decided: a generated five-digit PIN.**                                         |
| Name plus PIN | PINs can repeat for different names              | Requires a unique login name, name rules and two remembered fields, separate from the local display name. Defer. |

**Owner decision, 15 November 2026:** sign-in is a server-generated **five-digit decimal PIN alone**, displayed as five digits, e.g. `04217`, with leading zeroes kept. The owner confirmed "Oh yeah, it should just be pin alone.", then, after eight versus six digits was discussed, "Okay, let's do 6 digits then.", and finally "Actually, 5 digits." Accept spaces and hyphens, then require exactly five ASCII digits. A unique digest index and generation inside the transaction prevent collisions; retry a collision with a fresh random PIN. Do not accept a player-chosen PIN or use the mutable display name for lookup.

There are 100,000 values, so with about 100 accounts one random guess in 1,000 opens some account (about 1.7 hours on average at the 10/minute/address limit); this trade-off is accepted because an account carries identity only, under the owner's "don't over-engineer against attackers" call.

The PIN is a reusable private secret; subsequent visits use a separate 256-bit device session. Basic validation, no credential logging and a simple per-address sign-in limit (10 attempts/minute, including successful attempts) meet the owner's **Don't over-engineer against attackers** [call](../agents/owner-calls.md). Use the existing limiter for other account requests too (60/minute/address). No CAPTCHA, identity provider, email, recovery service, distributed throttling or account-lockout machinery. A short PIN and its digest do not promise resistance to determined guessing or a stolen database.

### Identity and authority

| Data                                                                             | Kind / owner                                          | API and lifetime                                                                                                                                                  |
| -------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account profile `{version: 1, accountId, pid}` and PIN digest                    | Server service, outside room ECS                      | New `account-store.ts`; durable independently of room namespace. One account owns exactly one unique pid.                                                         |
| Guest principal and device session digest                                        | Server service                                        | New `accounts.ts`; durable device authentication. A guest becomes an account without changing its authenticated pid.                                              |
| Session token, pending form, sign-in display                                     | Local                                                 | New `src/player/account.ts`; one versioned credential record in localStorage, memory-only if storage is blocked. Never presence, replay, telemetry or room saves. |
| Public pid, current player name/colour, avatar                                   | Existing Server roster / Owner presence / Local views | Keep `identity.pid`, `pidOf`, `who.set` and existing presence. Account IDs and secrets never enter the roster or ECS.                                             |
| Room wallet, rails, upgrades, cargo, player/seat rows                            | Existing Server room state                            | Existing commands/checkpoints; no account snapshot, merge or cross-room transfer.                                                                                 |
| Nickname, colour, settings, wardrobe/finds, conversation and recent-visit memory | Existing Local owners                                 | No cross-device promise in this first slice. Clear identity-sensitive visit state when switching people; never upload it as proof of account ownership.           |

Account authentication grants **no** operator, tuning, room-owner, reset or restore power. A future room-host feature can store an explicit `ownerAccountId` on room metadata; disconnecting a phone must not change it. That feature, membership/invites and reset UI remain outside this plan. Never choose the first arrival as owner or reinterpret a PIN as an operator key.

### Durable records and the development cutover

Add a small `accounts.sqlite` on the existing data volume using Node's built-in SQLite, behind `createAccountStore`. Do not convert `store.ts` or room checkpoints. Tables: `principals(pid PRIMARY KEY)`, `accounts(account_id PRIMARY KEY, pid UNIQUE, pin_hash UNIQUE, version)`, and `sessions(token_hash PRIMARY KEY, pid, expires_at)`, with foreign keys and transactions. Store only SHA-256 digests of PIN/session secrets; device tokens are 256 random bits encoded as 64 lowercase hex characters. Retain expired/revoked session rows (revocation sets expiry to zero), so a known token can never register again or change principal. All random/time/I/O work stays in the service, outside deterministic rules. Return success only after the transaction commits. Unsupported account format or read failure fails authentication closed; do not silently initialize over an unreadable account database. Initialize schema version 1 only for a new file; no migration framework.

A raw legacy pid/key cannot prove historical ownership while offline. At the authentication cutover, bump `WORLD_NS` once with a dated entry and start freshly registered server principals; do not build an unauthenticated “claim any old pid” endpoint or a legacy localStorage/save migration. The old browser pid is replaced by the server-issued pid at this clean development break. From then on, promoting a verified guest preserves that exact pid; signing in elsewhere resolves to it. This explicitly separates retaining the **pid abstraction** from promising to import unsafe old identities. Room resets are allowed; they must not delete the new account database. Owner answer 2 accepts this consequence.

A new guest generates and stores its device token before registration; `POST /account/guest` atomically maps that token digest to a new server pid, returning the existing mapping on retry. It never accepts a caller-selected pid. Register guests too so an unauthenticated client cannot spoof an absent account through the guest path. An expired or revoked known token is rejected, never re-registered or rebound; a fresh token is needed for a new guest. A sign-in token already bound to another principal is also rejected. If persistent storage fails, say “this visit only” and keep the token in memory; never claim this browser will remember it.

### Small service contract

All endpoints use the configured game-server origin over HTTPS (loopback HTTP in development), bounded JSON and `Cache-Control: no-store`. Use Authorization bearer tokens for HTTP and the existing allowed-origin policy; account routes reject unapproved origins and never log credentials. Start with a simple per-address limiter consistent with the existing upgrade limiter. No cookies or third-party-cookie dependency.

| Endpoint (new)             | Accepted request / authoritative result                                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /account/guest`      | Random device token; create/reuse its guest principal and session, return `{pid, expiresAt}`.                                                                                                                                       |
| `GET /account/session`     | Device bearer; return verified `{pid, accountId?}` or a typed unauthenticated result.                                                                                                                                               |
| `POST /account/create`     | Verified guest bearer; generate a unique five-digit PIN and atomically link its pid, return PIN once plus account identity. Repeated creation returns `409 already_account`, without revealing the PIN or creating another account. |
| `POST /account/sign-in`    | `{pin}` plus a fresh, locally saved random device bearer; resolve the PIN's unique digest and create/reuse that session for the account pid. Repeating the same token/PIN is idempotent.                                            |
| `POST /account/rotate-pin` | Verified account session; replace PIN digest and revoke other sessions atomically. Return replacement PIN once; keep caller session. Step 2 also closes revoked sockets.                                                            |
| `POST /account/sign-out`   | Revoke the caller session and close its sockets; idempotent. Local client forgets it and reloads into a new guest.                                                                                                                  |

Session lifetime: 90 days, extended on successful authenticated use; an expired/revoked session must sign in again using a fresh device token. Service restart preserves sessions. If a create/rotate response is lost, GET session establishes whether an account exists; rotate explicitly to obtain a new PIN. A timeout never means success and the UI never invents the lost PIN. If sign-in succeeds but local persistence fails, offer the authenticated identity for this visit only. Step 1 adds these HTTP operations; step 2 owns socket revocation and admission, and performs the single cutover bump. No room wire or namespace changes in step 1.

Do not silently turn an existing account into a guest on transient connection/storage failure. Retain its identity and show reconnect/sign-in as appropriate; “Play as a guest” is an explicit identity switch. Profile editing/cloud cosmetics are deferred; account ID and pid form the version-1 profile.

### Socket admission and switching people

Replace URL pid/key with a bounded first WebSocket authentication frame carrying the device session token. Until verification completes (five-second timeout), allow no presence, game messages, room creation/load or command delivery. Resolve pid server-side; never trust a frame's claimed actor. Send the existing room greeting only after binding the verified principal. Keep the room API above transport unchanged where possible, adding an authentication provider to `createWsRoom` and explicit auth failures.

Different device tokens for one account are the same person. In one room, the newer authenticated connection wins, closes the older one with `ELSEWHERE`, and retires it so it cannot reconnect in a tug-of-war. Remove the browser-key-equality requirement for these verified connections; a stolen public pid alone must fail. Preserve server session epochs, stale-command rejection, grace cleanup and accepted-receipt semantics. Across different rooms, the same account may play concurrently; progress remains separate.

Keep `TUNE_CONTROLLER_KEY` as a separately verified operator capability, never derive it from account identity. Update the existing dev tuning client's authentication path explicitly; do not accidentally let every account tune, or silently remove that tool.

`identity.ts` remains the single public pid owner. Add `prepareAccount()` in `account.ts` and await it from `src/boot/index.ts` before importing `main.ts`, so identity-keyed caches cannot initialize under the old pid. Bound its request to five seconds with an explicit retry/error state that preserves the saved credential. Prepare authentication before starting the production room and publishing pid; replace `adoptPid(pid)` with an authenticated identity installation operation that writes the complete credential record and reloads. Do not change the exported live identity while old command queues or presence are active. Switching account or signing out closes the old room, discards its unsent commands/predictions, clears transient carry/seat/input state, and reloads. Ordinary reload of the same identity preserves its existing room-local return policy. Route `arrival.ts`'s existing `startFresh()` through explicit sign-out/new-guest handling too, so its promise to start as someone new stays true without deleting the account or resetting the room; update its account-specific warning. Leave/menu navigation alone does not sign out. Signing into an existing account does not merge the previous guest's belongings or visit memory.

### Player flow

Add a lazy **Account** page under Pause → Options using `pausePages`, with guest/account status, **Save PIN**, **Sign in**, **Replace PIN**, and **Sign out** as applicable. No mandatory start screen or new gameplay button/key/pad slot. Use existing modal focus, menu actions, controller navigation and touch buttons; typing is a normal text field with numeric input mode (not a number field, to preserve leading zeroes). Display the generated five-digit PIN only in the explicit reveal/save result, masked otherwise; never auto-copy it or include it in screenshots/telemetry. Explain that a lost PIN means a new account before the player dismisses it. Copy is plain account UI, not dialogue for The Boogler.

## Steps

Each numbered implementation step is a reviewable commit and leaves `node dev/ship-check.ts` green. Checkpoints A and B own broader proofs; do not repeat the full route per step. Model assignments refer to the named rows of `npm run models`; rerun that command at dispatch. References to `withCodex` and the Fable planning row in the historical evidence below describe 14 November, not the current single routing table.

- [x] **0. Trace the current identity and write this plan.** Tier: documentation. Files: `docs/plans/accounts.md` only. Models row: **Planning complex work**, executed by this requested Codex planner. Verify the cited seams and links; format and run the task's required `npm run check`. Validation results are recorded below.
- [x] **1. Build durable principals and account operations.** Tier: high risk, server/persistence. Files: new `server/src/account-store.ts`, `server/src/accounts.ts`, `server/test/accounts.test.ts`; edit `server/src/server.ts`, `server/README.md`, and image manifests only as their import closure requires (`server/Dockerfile`, `dev/server-build.ts`, `.github/workflows/deploy-server.yml`). Implement `createAccountStore`, `registerGuest`, `createAccount`, `signIn`, `resolveSession`, `rotatePin`, `revokeSession` and the HTTP routes with the transactions and failure behavior above, using the confirmed five-digit PIN-alone decision. Models row: **High-risk implementation** (currently Astra high). Checks: step gate plus focused server tests explicitly requested in the 15 November brief: persistence/restart, duplicate requests, promotion, PIN uniqueness/rotation, expiry/revocation, token rebinding rejection, rollback/storage failure, bounded input/origins and simple sign-in limiting. Checkpoint A later exercises socket integration. No UI unit suite or new generic auth framework.
- [x] **2. Bind room admission to verified principals.** Tier: high risk, transport/server. Files: `src/net/ws-room.ts`, `src/net/ws-wire.ts`, `server/src/host/rooms.ts`, `server/src/host/hosted-room.ts`, new `src/net/account-wire.ts` for shared shapes; `src/world/namespace.ts` dated bump; `src/net/README.md`; explicit shared-file image entries above. Replace URL secrets and live-key comparisons with the auth frame and resolved pid. Preserve newer-connection takeover and operator tuning capability, updating `dev/tune.ts` and its transport caller if needed. Models row: **High-risk implementation**. Checks: step gate; **checkpoint A** below, before this boundary is considered ready. Shipped in #1871.
- [x] **3. Resolve browser identity before room startup.** Tier: high risk, identity/transport integration. Files: new `src/player/account.ts`; `src/player/identity.ts`, `src/netplay/net.ts`, `src/features/identity.ts`, `src/player/arrival.ts`, `src/player/world-reset.ts`; `src/boot/index.ts` before its dynamic `main.ts` import. Store a complete credential record, preserve accounts through room resets, await resolution, handle revoked/offline/memory-only states and switch via close/reload. Keep local visit data from following a different person; do not change same-person spawn policy. Models row: **High-risk implementation**. Checks: step gate; checkpoint B verifies two separate browser stores, storage denial, account switch and namespace reset. Shipped in #1873.
- [x] **4. Add the optional Account page and truthful copy.** Tier: player-visible Local UI. Files: new `src/player/account-page.ts` and `account-page.css`, `src/player/pause-pages.ts`; extend the existing takeover message in `src/features/identity.ts` to mention another device. Update `docs/game-design/social.md`, `docs/game-design/first-run.md` and `docs/atlas/stories/join.json` (the existing join story). Models rows: **Player-visible implementation** and **Visual review**, resolved through `npm run models` at dispatch rather than the retired Fable assignments. Checks: step gate, then B. No DOM unit tests; no game-design claim until behavior exists. Keep The Boogler's copy unchanged. Shipped in #1875.
- [ ] **5. Close the account checkpoint and update completion marks.** Tier: networking proof and documentation. Files: extend existing `dev/peer-test/ws-run.ts` and its helpers for the new room admission contract; update `docs/plans/accounts.md` with evidence, `docs/plans/net-roadmap.md` section 1 with as-built behavior and `docs/backlog.md` status only when actually complete. Models row: **Runner** (currently Sol medium); boundary changes require **Independent review before merge** / **Code review before shipping** (currently Astra high, fresh context). Checks: B below, review resulting manifests and final diff. This planning task commits only on its branch: no push or ship; later implementation follows its own authorization.
  - As of main 12c244db: the harness is extended (`dev/peer-test/ws-accounts.ts`, `ws-account-browser.ts`, the broker's host-only skips) and the dev scenarios `account-rooms.ts` and `account-look.ts` are added; Checkpoint A and B's proofs are recorded below (#2153, #2187). `net-roadmap.md` section 1 now describes the code on main, not this plan.
  - Manifests, 18 November: the account code's shared imports are `src/net/account-wire.ts` (from `server/src/host/rooms.ts`), `ws-wire.ts` and `ids.ts`; none of the three imports anything, and `account-store.ts` and `accounts.ts` import only Node built-ins, Express and each other. `server/Dockerfile` (the `src/net` COPY line), `dev/server-build.ts`'s file list and `.github/workflows/deploy-server.yml`'s `paths` each list all three. Node's SQLite is built in, so no package is added. Checked by reading those files, not by building or deploying an image.
  - `npm run check` exited 0 on the final tree (18 November, the garage moment's checkpoint run on HOTBOX, on main `12c244db4` plus one dev eval line and docs: lint, typecheck, 2,166 unit tests with 2,165 passing and 1 todo, level, assets, prefabs and the build; recorded by the orchestrator from that run's report, #2197). Step 5 stays unticked only for the owner's read of the three Account page notes; the backlog row leaves with it.

### Checkpoint A: authenticated room boundary

Use the existing network harness through `node .look/see-client.ts net` (no flags); extend its room-interface cases before launching a trusted broker that includes those reviewed cases. Never bypass a broker rejection. Cover two tokens mapping to one pid and takeover, retired/revoked session rejection, unauthenticated/forged pid rejection while the real owner is absent, malformed auth frame, bounded auth timeout, server restart preserving identity, and guest-promotion retries producing one account. Reuse the existing server fixture and temp volume; no broad new harness or speculative attack tests. Verify operator tuning still requires its separate capability. Run the required server/image checks through the repository gate for the affected import closure. Bound implementation commands with `timeout` (for example 600 seconds for checks and net, 180 seconds for a focused look); a timeout is a failed/incomplete proof, never acceptance. A fresh review covers identity binding, transactions and fail-closed errors; no account code merges without it.

As built, 18 November 2026: the fresh review ran and found two P3 defects, each with a failing test; both are fixed on
`claude/accounts-checkpoint-a-fixes` and shipped in #2153. (1) The server relayed a presence frame's
`pid` as the sender wrote it, so a modified client could show another player's stack and effects on its own avatar;
`hosted-room.ts` now stamps the verified principal into `d.pid` before storing, so the relay, a late joiner's list and a
resumed socket all carry it (test: "relayed presence never names a principal other than the verified sender"). (2) A
tab still verifying its session saved the credential it read after the request returned, undoing a newer sign-in or
sign-out from another tab; `account.ts` now skips that save while the tab is switching or once storage no longer holds
the token it read (test: "a tab still verifying its session never writes over a newer sign-in from another tab").

### Checkpoint B: complete player flow and room isolation

Run `npm run checks-for`, `npm run check` and broker `net` for the final implementation tree. The networking contracts also call for the existing rendered `smoke` scenario and before/after eight-player `npm run load` check: use trusted broker support or have the coordinating runner run the existing harness, never launch Chromium directly from a worker. If unavailable, explicitly leave those proofs unverified. Load timings need a quiet machine; correctness findings remain useful. Run `npm run atlas -- --check` for the updated join story; stale unrelated citations are advisory. Use a focused broker `look` action sequence at an existing safe checkpoint; no full-route playthrough or perf run. Visual question: can a guest find Account, save a five-digit PIN and distinguish signed-in, unavailable and replaced-device states on desktop and a narrow touch viewport without obscuring the menu or exposing secrets? Frame the Pause → Options → Account action, capture only fake/non-secret form states, open the PNGs, and iterate up to three rounds. Check controller focus and touch reach; a resized viewport is **not tested on a device**.

In two isolated browser stores, create on A, sign in on B, reload B and restart the local server: the same verified pid returns. Rejoin the same room and verify its existing progress remains; join another room and verify no wallet, rails, upgrades, cargo or room save was imported. Reset one room and verify account/session records survive. Exercise expired session, lost create response, localStorage denial, sign-out and switch-back without guest/account inventory merging. State which cases the existing broker can execute; any missing case remains unverified until a reviewed harness/launcher supports it. Newly added harness tests are justified by the authentication/sync contract, not UI coverage. Preserve receipts, checkpoint guards and existing same-room replacement assertions. Timing under machine load is not evidence, and no real-time feel claim follows from these checks.

## Level findings and risks

No world placements, geometry, new simulation ticks or gameplay controls; level checks are not a planning prerequisite. No ROM material is used. No Boogler dialogue was changed or found suspect in the focused reads; this was not a dialogue audit.

- A reusable short PIN is a private sign-in secret. A lost PIN means a new account; a still-signed-in device can explicitly replace it. Rotation invalidates other sessions; step 2 must also close their active sockets.
- Client localStorage is readable by same-origin scripts. This consciously small bearer-token design needs ordinary secret hygiene and the existing trusted script surface, not a promise of protection from a compromised page.
- Auth failures cannot enter a room under a claimed pid, save a fallback world, clear a valid room or grant reset rights. Do not move account I/O into `apply`, prediction or deterministic replay.
- A room reset must not remove `accounts.sqlite`; account backup/restore is separate from room admin operations. Initial deployment needs the account file on the existing persistent volume. No cloud deployment was inspected or changed here.
- Changing people is not merging people. Local cosmetics/finds and recent positions do not automatically travel across devices; cloud personal progress requires separate scope. Room progress never travels with the account.
- Auth storage/wire changes use the development clean break, not compatibility branches, localStorage migration or mixed-build tests. Re-read the current namespace at implementation time; do not reserve a version number in this plan.
- Hotspots are room admission, `hosted-room.ts`, `net.ts` and identity startup. Preserve account-independent operator authorization, stale-session rejection and room command receipt rules.

## Planning validation (14 November, historical)

- [x] Required briefs, current source seams, nested instructions and model rows inspected; three sign-in options compared.
- [x] Local branch-overlap check completed. `npm run inflight` failed opening `FETCH_HEAD` before fetching; no retry because non-local network is prohibited. Local unmerged branches overlap future implementation: `codex/room-fast-forward-server`, `codex/server-players-step-8`, `codex/slice2-supply-history`. None touches this new plan. Their activity/remote status is unverified.
- [x] Final validation: Prettier (explicit ignore override because the repository ignores Markdown), scoped lint, local link targets and final diff passed. Both full `npm run check` runs exited 0 within their 600-second bounds. Rebased tree: **2,154 tests passed, zero gating failures, one existing TODO** (`railway-install` longer-fleet wait bound: 1,146 ticks against 1,050; not fixed by this docs-only task). Registry, level, assets, prefabs and production build passed. First run before rebase: 2,137 pass and the same TODO. Logs: `.look/accounts-check.log` and `.look/accounts-check-rebased.log`. These are correctness results, not performance evidence.
- [x] Committed on `codex/accounts-plan` and rebased onto locally available `origin/main` (`cb76b4a1e`); no push or ship. The shared local ref advanced during this job; its geometry-tooling changes do not alter the identity seams. Remote freshness unverified because this task cannot fetch.

At the planning handoff: opened images **0**, browser/bot/scenario/performance runs **0**, deliberately unnecessary for a documentation-only change. No visual verdict, bot failure or timing measurement was claimed. Account functionality was then unimplemented and **not tested on a device**. The launcher owned `handoff.md`/`evidence.json`; no browser evidence manifest was invented for that plan.

## Owner answers (15 November 2026)

Put to the owner as four questions with the plan's recommendations (question 5 is the orchestrator's, not his). His picks:

1. **Sign-in: a short PIN instead of the 26-character code** (he chose "Short PIN instead" over the recommended code). Orchestrator's reading: the code becomes a short PIN that is easy to type, sized for a casual game under [don't over-engineer against attackers](../agents/owner-calls.md): simple server-side rate limits on sign-in, nothing heavier. Immediate guest play stays; password and email recovery stay out. Confirmed later on 15 November: PIN alone, five digits, generated and unique; see the decision below.
2. **Fresh identity at the cutover: yes** (recommended). One `WORLD_NS` bump at the authentication cutover, server-issued pids, no import of old browser pids.
3. **First slice carries identity only** (recommended). Nickname, colour, wardrobe and finds, settings, conversations and recent position stay on the device for now.
4. **Lost PIN with every device signed out: a new account** (recommended), with clear copy before dismissal; a still-signed-in device can replace the PIN and sign the others out. Email recovery waits for demand.

### Questions as asked

## Step 1 validation (15 November 2026)

Built initially on the previous eight digit recommendation under the brief's explicit authorization; the owner subsequently confirmed PIN alone with five digits on 15 November 2026, and generation and validation now follow that decision. Durable principals, promotion, session resolution, sign-in, PIN replacement and revocation now have transactional SQLite storage and bounded HTTP routes. Existing room admission is unchanged; step 2 has not started. No shared import/image manifest changes were needed because the image already includes `server/src` and Node's SQLite is built in.

- Seven focused tests in `server/test/accounts.test.ts` pass: persistence/reopening, HTTP service restart, duplicate registration/create/sign-in, unique PIN assignment and collision retry, leading zeroes, token-binding rejection, sliding expiry, durable revocation, transactional rollback, unreadable/unsupported storage, bounded JSON/origins and sign-in rate limiting.
- The focused account tests plus existing `server/test/server.test.ts` and `test/server-image.test.ts`: **24 tests passed**, no failures/skips. Image import closure and package resolution are verified; no Docker image was built or deployed.
- `node dev/ship-check.ts origin/main HEAD`: registry, four changed TypeScript files linted, typecheck and **172 tests across 20 selected files passed**. `git diff --check` passed. `checks-for` was inspected; the owner's step/checkpoint rule keeps its broader browser/network proofs at checkpoints A/B.
- Unverified here: independent pre-merge review, authenticated socket takeover/revocation, real cross-device/browser UI, room-progress isolation, device behavior and checkpoints A/B. No browser, bot, load or visual run was needed for this HTTP/storage-only step. No namespace bump, push, ship, main edit or ROM material.

## Sign-in decision closed (15 November 2026)

**Settled: five digits, generated and unique, with PIN-alone lookup**, displayed as five digits with leading zeroes kept. The other three owner answers above are also settled. Before assigning step 2, the orchestrator should recheck current branch ownership around room admission and identity startup.

## Step 2 implementation and evidence (15 November 2026)

Implemented first-frame socket authentication against the durable account service. The frame is limited to 1 KiB
and five seconds; URL pid/key admission is removed. The server supplies the principal, preserves same-connection
reconnect and newer-connection takeover, and retains `taken` for another principal reusing a connection ID.
Timeouts/storage failures use retryable restart closes; revoked/expired credentials get an explicit authentication
refusal. Rotation and sign-out detach matching live sockets after the account transaction commits, across rooms.
The operator capability is checked independently; `dev/tune.ts --controller` supplies it from `TUNE_CONTROLLER_KEY`.
PIN generation/parsing are untouched by this step; the owner's five-digit change arrived from the separate job on main.

The single cutover is `WORLD_NS` **v47 -> v48**, dated 15 November, in its own commit. The host golden was compared
field by field before replacement: all 8,596 ordered records keep the same inputs, simulation state, state hashes,
messages and replica packets. Only 205 checkpoint namespace/checksum pairs and 2,518 serialized-byte counters differ.
The account database remains outside room reset/cleanup.

**Minimum client prerequisite:** `src/player/account.ts`, `identity.ts`, boot and the net caller now obtain a guest
session before main initializes identity-keyed caches. A version-1 token is saved before registration, retained on
failure, and verified on reload; inaccessible storage uses memory for this visit. No legacy pid is imported. The
existing loading error/reload route handles unavailable authentication. This is not completion of step 3: account
switching, explicit browser sign-out/Start fresh integration, identity-sensitive visit cleanup and richer account
status/recovery remain there; optional Account UI remains step 4. The headless room caller and live smoke probe use
the same admission boundary. Existing room tests seed named principals in their temporary account volumes; the new
authentication proofs use actual HTTP guest/account operations, not those fixture identities.

**Checkpoint A evidence:** `server/test/account-admission.test.ts` runs the shared cases in
`dev/peer-test/ws-accounts.ts`: duplicate guest/promotion/sign-in requests, absent-owner forgery, early/malformed/
oversized auth input, the timeout bound, two tokens for one pid, retirement, foreign connection-ID refusal, live
and grace reconnect, cross-room rotation/sign-out closure, restart and durable revocation. Separate socket proofs
check account versus operator authority and the real `createWsRoom` reconnect with voice presence, followed by
fatal sign-out without a retry loop. Existing seat, receipt, voice, save and server tests are retained.

The step gate, owning server suite and focused net/image tests run with Node 26 and bounded commands; local logs:
`.look/step-gate.log`, `.look/server-tests.log`, `.look/account-admission.log`, `.look/net-image-tests.log`, and
`.look/namespace-trace-diff.log`. The final handoff supplies the exact exit codes and commit IDs.

**Still unverified:** the trusted browser `npm run test:net` run. `timeout 600 node .look/see-client.ts net` exits 1
because this T3 worktree has no `.look/see-client.ts` or broker configuration. No browser was launched to bypass it.
The harness has been extended, but its reviewed broker launch/restart must happen in the coordinating session.
Fresh independent review is also outstanding; this implementation sub-agent did not delegate one. Accordingly step
2's readiness checkbox and Checkpoint A remain open. Rendered smoke, before/after load, full browser identity and
room-isolation flows are not claimed; not tested on a device. Nothing was pushed, shipped or submitted as a PR.

## Step 5 checkpoint evidence (15 November 2026)

Steps 1–4 are live in #1868, #1871, #1873 and #1875. Their implementation checkboxes above are complete;
Checkpoint A, Checkpoint B and step 5 remain open until the proofs below are finished.

**A — verified in this worktree:** Node 26.13.0 ran `node --test server/test/account-admission.test.ts`:
3 passed, zero failures/skips. Its shared `ws-accounts.ts` cases cover first-frame admission, unknown/revoked
credentials, absent-owner forgery, malformed/early/oversized input, timeout, two tokens for one pid,
newer-connection takeover/retirement, same-connection reconnect, cross-room revocation, promotion retries
and restart durability. The other two tests verify independent operator authority and real-client voice-presence
reconnect followed by fatal sign-out. `node --test server/test/accounts.test.ts server/test/server.test.ts
test/server-image.test.ts`: 24 passed, zero failures/skips. No production authentication behavior changed here.

**B — coverage added, browser execution unverified:** `ws-run.ts` now runs `ws-account-browser.ts` before
opening the ordinary room pages, so its browser queue lease is released before the next suite acquires one.
The probe bundles the production `src/player/account.ts` and `createWsRoom` in `account-page.ts` against the
fixture server. Two independent browser contexts register separate guests; A promotes, B signs in, A is retired,
B reloads and survives server restart, signs out and switches back, then A rotates the PIN and B's stored
revoked credential is refused without silently becoming a guest. A visit-memory sentinel checks person cleanup.
The probe bundles successfully. These are account/sync checks, not Account-menu or whole-game visual evidence.
PIN handoff exists only in runner memory; no secret is put in URLs, assertions, evidence, telemetry or screenshots.
Browser exceptions are replaced with a fixed message before the runner logs them.

**Local gates:** `npm run checks-for` selects `npm run check`. Scoped lint and typecheck pass.
`npm run atlas -- --check` exits 0, with existing unrelated stale citations/text warnings; the join story is unchanged.
`npm run check` passed (exit 0): 2,189 unit tests passed, zero failures, one existing TODO; registry,
level, asset, prefab and production-build checks passed. The final-tree rerun is also reported at handoff.

**Parent follow-up:** `node .look/see-client.ts net` exits 1 (`MODULE_NOT_FOUND`: this worktree has no
`.look/see-client.ts`). Accordingly `npm run test:net` has **not passed** here; do not launch Chromium directly
to bypass the broker. Review the new harness and restart the trusted broker/launcher before running net locally.
The parent must also complete/record the existing rendered smoke, quiet-machine before/after eight-player load,
Account menu desktop/narrow-touch/controller review with secret-free captures, room-progress isolation and
room-reset account survival, storage denial, expired-session and lost-create-response browser cases.
No device was tested. No new screenshots or browser manifests were fabricated; no independent review is claimed.
The backlog remains building because these checkpoint proofs are outstanding. Nothing was pushed or shipped.

## Step 5 runner evidence (17 November 2026)

Runner job on `claude/accounts-step5` from main `6ddfe5d2`, Node 26.13.0, Windows. The trusted broker was started
from `boogle-trusted` (`dev/codex/look-broker.ts` against this worktree, as `dev/codex/run.ts` does) and every
browser run went through it and the machine-wide bot queue. No Chromium was launched outside the broker. Machine
load before the browser runs: heartbeat `9.9 of 20` logical CPUs busy (quiet, at most 12). Logs are local in
`.look/` (`net-1.log`, `smoke-1.log`, `server-accounts.log`, `check-1.log`, `check-2.log`, `rest-*.log`).

### Checkpoint A: authenticated room boundary

`node .look/see-client.ts net` on the clean main tree (commit/tree `6ddfe5d2`/`70f6ecb3`, trusted harness
`f0437a04`; evidence `.look/evidence/1794977990955-32168`): **174 PASS, 0 FAIL**, then exit 1 when the harness
aborted at the railway jump-in "replace" section (see the harness gap below). The admission suite in
`dev/peer-test/ws-accounts.ts` ran first, over real HTTP principals and real sockets:

- [x] Guest-registration and promotion retries keep one principal and one account (`409 already_account` on repeat).
- [x] Unauthenticated or forged pid while the real owner is absent: a pid in the URL or the frame, an unknown token
      and a presence frame before auth are all refused, with no welcome/list/message. "No room created" is
      asserted only by the server suite (`server/test/account-admission.test.ts` passes `rooms`); `ws-run.ts` does
      not pass it, so the broker run does not prove it.
- [x] Malformed and oversized auth frames are refused (`CLOSE.BAD`).
- [x] Auth timeout: a silent socket closes retryably (`CLOSE.RESTART`) between 5.0 and 7.0 s, never admitted.
- [x] Two device tokens resolve to one pid; the newer connection wins (`ELSEWHERE`), the retired connection cannot
      take it back and another principal cannot reuse its connection ID (`TAKEN`).
- [x] Same-connection reconnect live and during grace.
- [x] Retired/revoked sessions: PIN rotation closes the other device's sockets in every room (`CLOSE.AUTH`), keeps the
      caller, and the revoked token can neither join nor re-register as a guest.
- [x] Server restart preserves principal, session and durable revocation; sign-out closes its sockets, is idempotent
      and the signed-out token cannot reconnect.

The same broker run's two-store browser probe (`ws-account-browser.ts`, production `account.ts` and `createWsRoom`)
passed all ten of its checks: separate guests per store, promotion on A and sign-in on B, former-person visit memory
cleared, A retired, B reload, restart survival, sign-out to a distinct guest, switch-back, and revocation stopping B
with an authentication refusal rather than silently becoming a guest.

Server suite (`node --test test/account-admission.test.ts test/accounts.test.ts` in `server/`): **11 of 12 pass**,
including operator tuning needing its separate capability, real-client voice-presence reconnect, rollback on failed
writes, fail-closed unreadable stores, origin/size/rate limits, expiry surviving restart and **room reset/obsolete-save
cleanup preserving accounts without admin rights**. The failing one, `SIGKILL retains committed guests ...`, is a
Windows portability gap in the test, not a server defect: a child that kills itself with SIGKILL reports
`{status: 1, signal: null}` on Windows, so `assert.equal(child.signal, 'SIGKILL')` cannot hold before any durability
assertion runs. Crash durability is therefore **unverified on Windows** (Linux CI runs it). Not fixed: it is outside
this job's harness scope.

Still open for A: the fresh independent review of identity binding, transactions and fail-closed errors that the
checkpoint requires before it counts as ready. This runner did not perform or claim one.

### Harness gap found and fixed in `dev/peer-test/`

Under the broker the game server runs out of process, so `serve()` returns `roomHost: () => undefined`. The jump-in
"replace" section, `railwayRequestStop` and `railwayLeaf` step or read the in-process room host, so broker `net`
always aborted with "the server never hosted room ... within 15 s". `Ctx.hostOnly(section)` now marks each of those
sections. Under the broker (only with `--url`) it prints a `SKIP` line and the section is not run; the replace skip
starts at the first room-host call, so its two session/seat checks still run. Skipped checks never enter the results,
and the summary says so: `PASS: n/n checks passed; 34 skipped (broker: no in-process room host: jump-in replace,
request stop, leaf)`. The broker keeps that line in its `output.txt`. `HOST_ONLY` in `ws-run.ts` lists each section's
check count (14, 11 and 9); every standalone run recounts them and adds a failing check if a count goes stale.

Standalone `npm run test:net` with the change: **208/208, exit 0, no `SKIP` lines** (`.look/net-standalone-2.log`);
the run before the counts were filled in also passed all 208 checks and reported exactly 14, 11 and 9. The broker
runs the **trusted** checkout's harness, so a broker run showing the skipped count is unverified until this is
reviewed, merged and the trusted checkout updated. A fresh review confirmed CI coverage is intact.

### Checkpoint B: complete player flow and room isolation

- [x] `npm run checks-for` selects `npm run check`.
- [ ] `npm run check`: lint and typecheck pass; unit tests **2,142 pass, 0 fail, 1 cancelled, 65 skipped, 1 todo** in
      both runs. The cancelled test is `test/bot-queue.test.ts` "a short job queued after a long one takes the freed
      slot first", a timing flake against its 5 s limit (5.05–5.6 s; 2 of 3 isolated reruns passed; it uses its own
      temp queue directory). Because `check` stops at the first failing step, the rest ran directly: `registry`,
      `level-check`, `assets -- --check`, `prefabs -- --check` and `build` all exit 0. Not a clean `check` exit.
- [x] Broker `net` on the final tree: **proved 18 November** ([18 November run](#checkpoint-b-run-18-november-2026)). Before that: **not proved**. The broker run above used main's old harness, exited 1 and never
      reached its summary. The trusted broker runs the trusted checkout's harness, so the updated harness cannot run
      through it until merged and the trusted checkout updated.
- [x] Rendered `smoke` through the broker: 7/7 pass, WebGPU, no gfx errors, 27.9 s, load 6.88 → 9.54 (evidence
      `.look/evidence/1794978165398-29712`). Both stills opened: two avatars at the station, HUD showing "shared state:
      server replication" and "room server rtt 1 ms".
- [x] Before/after eight-player `npm run load`: **proved 18 November** ([18 November run](#checkpoint-b-run-18-november-2026)). Before that: **unverified**. It needs `WS_LOAD=1`, which broker `net` refuses, and
      running it directly would launch Chromium outside the broker. No figures were taken; the orchestrator runs it on
      a quiet machine.
- [x] **Proved 18 November** ([18 November run](#checkpoint-b-run-18-november-2026)). Browser room-progress isolation (rejoin keeps progress; another room imports no wallet, rails, upgrades, cargo
      or save): **unverified in the browser**; no reviewed harness case exists. Room reset preserving account and
      session records is covered by the server suite above.
- [x] Storage denial, expired session and lost create response in the browser: **proved 18 November** ([18 November run](#checkpoint-b-run-18-november-2026)); before that **unverified** (expiry and
      lost-response recovery via `GET /account/session` are covered only at the server/HTTP level).
- [x] Account page visual review (desktop, narrow touch, controller focus): **run 18 November** ([18 November run](#checkpoint-b-run-18-november-2026)), with three copy/state notes for the owner; not tested on a device.
- [x] `npm run atlas -- --check`: **exit 0 on 18 November**, no warning on the join story ([18 November run](#checkpoint-b-run-18-november-2026)).

Not tested on a device. No timing here is performance evidence beyond the quiet-machine load reading noted.
Step 5 stays unticked: the load proof, browser room isolation, the Account visual review and the independent review
remain.

## Checkpoint B run, 18 November 2026

Runner job on `claude/accounts-checkpoint-b` from main `ad7405c3` (tree `0116360f`, includes #2153), Node 26.13.0,
HOTBOX (Windows, 20 logical CPUs), Playwright's full Chromium. Every browser run went through the machine-wide bot
queue; one browser run of this job at a time. Load is busy logical CPUs out of 20 (bench quiet limit 12). Logs are local
in `.look/`; stills are in `docs/reports/accounts-checkpoint-b/`. Crash durability on Windows was not repeated.

1. **`net` on the final tree: proved.** `npm run test:net` with this tree's merged harness and the in-process server,
   queued through the bot queue (the trusted broker was not used; the standalone run is the one with no host-only
   skips): **237/237, exit 0, no `SKIP` lines**, including the account admission suite and the two-store browser probe
   (`.look/net-final.log`). Load before the run 0.5.
2. **Before/after eight-player load: proved for correctness; timings comparable.** `npm run load` fails on Windows
   before it starts (`'WS_LOAD' is not recognized`: the script's POSIX env prefix under npm's cmd shell;
   `.look/load-after-npm-windows.log`), so both sides ran `WS_LOAD=1 node dev/peer-test/ws-run.ts` directly. "Before" is
   `bfab475f`, the parent of #1868, in a scratch detached worktree under `.look/` (removed afterwards). A sampler logged
   load every 15 s.

   | Run | Checks | 8 pages at 20 Hz for 20 s: server CPU, presence | Machine load |
   | --- | --- | --- | --- |
   | Before `bfab475f` | 226/226, exit 0 | 5.3% of one core, 100% | pre 5.1, post 2.3; 33 samples median 0.9, max 7.2 (quiet) |
   | After `ad7405c3`, run 3 | 273/273, exit 0 | 7.0% of one core, 100% | window 18:30:07–18:30:27 UTC; samples 1.2 and 1.8 inside it (quiet); 20/20 from 18:30:30 for a minute, after it |
   | After, run 1 | 273/273, exit 0 | 5.1%, 100% | 20/20 just before it queued, window unsampled: **under load, not evidence** |
   | After, run 2 | 273/273, exit 0 | 9.8%, 100% | 20/20 for two minutes mid-run, window unsampled: **under load, not evidence** |

   The railway load rows (2, 4, 6 players, normal and 5x churn, 0/100/200 ms) conserve material and agree on every
   mirror on both sides with zero corrections. At 0 ms: confirm p50 16–17 ms before and after; others' p95 32–33 ms;
   server step mean 0.050–0.079 ms before, 0.051–0.083 ms after; 6 players at 5x churn send 67.8 kbit/s before and
   69.5 after. The after side runs 47 more checks (account admission and browser suites). One quiet run per side: the
   7.0% against 5.3% is within the spread of the three after runs and is not a regression claim either way.
   Logs: `.look/load-before.log`, `.look/load-after-1.log`, `.look/load-after-2.log`, `.look/load-after-3.log`, each
   with its `.samples`.
3. **Browser room-progress isolation: proved.** New dev scenario `dev/scenarios/account-rooms.ts` (not in the nightly
   list), real game and account server, isolated browser stores (`.look/account-rooms-1.log`, 21/21, load 1.6 → 0.7).
   A jumps into a room seeded at `house-ready` (wallet 168, lever/sea/hook/glide and trains, forge lit), chops two logs
   onto their back, saves a PIN and rejoins: wallet, milestones, works and the back are unchanged. A guest control's
   fresh room reads wallet 0, no milestones, forge unlit. B (another store) signs in with the PIN in a third fresh
   room: same pid, and that room equals the control's fresh room with an empty back, so no wallet, rails, works,
   cargo or save came with the account. A keeps playing its room meanwhile. B then walks into A's room and finds its
   progress and the account's two logs; A is told it is playing elsewhere.
4. **Storage denial, expired session, lost create response: proved** (same scenario). localStorage denied: a verified
   guest joins the room, `persistent` false, Account says "This sign-in lasts for this visit only", and a reload keeps
   the identity through the tab store; both stores denied: the game still boots into the room as an in-memory guest.
   Expired: the scenario sets the session's `expires_at` in the past in the stack's `accounts.sqlite`; the next load
   keeps the same pid and account, is `revoked`, joins no room and says "Sign-in expired or was replaced. Your saved
   identity was kept."; signing in with the PIN restores the same pid in the room. Lost create: the request reaches the
   server (200) and the reply is cut; the page recovers Signed in from GET session, shows no PIN, says "Could not show
   the PIN. If this account was saved, use Replace PIN; otherwise reload to retry.", and Replace PIN then shows a fresh
   PIN once, gone on dismissal. Room reset keeping accounts stays covered by the server suite only.
5. **Account page visual review: run** (`dev/scenarios/account-look.ts`, `.look/account-look-1.log`, 10/10, load 1.0 →
   3.4). Desktop 1200 × 800 with a controller: RB from You to Options, Down reaches Account
   (Resume → Back → Controls → Graphics → Account), A opens it with focus on Save PIN, Down walks its buttons; the
   reveal focuses "I saved my PIN" with the lost-PIN warning (checked in the DOM, never captured). Narrow touch 390 ×
   844: every control is 50 px tall and on screen; the card clears the touch buttons. Stills opened:
   `desk-guest-controller-focus.png`, `desk-signin-refused.png` (made-up `00000`, field cleared), `desk-signed-in.png`,
   `phone-guest.png`, `phone-replaced-by-other-device.png`, `desk-expired-session.png`. Clear: the guest and signed-in
   states are distinct and focus is visible. What reads wrong, for the owner (copy is not changed here):
   - Replaced or expired, the primary action is **Reload to retry**, but a reload stays refused; the way back is Sign in
     with the new PIN (`src/player/account-page.ts:134`).
   - Signed in, the page still offers **Sign in** beside Replace PIN and Sign out, which reads as if the player were
     signed out; it switches accounts (`account-page.ts:135`).
   - With an expired session the world behind the card is the classic island (palms, lighthouse), not the room's
     railway, while the card's title still names the room (`desk-expired-session.png`). It may be the intended solo
     fallback (`src/netplay/net.ts:333`, first-run.md "Revoked sessions retain their saved identity but cannot join a
     room"), but the player is not told they are somewhere else.
   The refusal message under the form is plain body text with no error styling; readable, not urgent.
6. **`npm run atlas -- --check`: exit 0**; no warning on `docs/atlas/stories/join.json` (stale citations only in the
   railway, railway-recovery and opening stories) (`.look/atlas-check.log`).

Still unverified: a clean `npm run check` exit on this tree (not run in this job); real-time feel and performance
(nothing here is a timing claim beyond the load table); the resized viewports are **not tested on a device**. No
defect in game or server code was found; the Windows `npm run load` script is a tooling gap (`package.json:20`).
Harness added for review: `dev/scenarios/account-rooms.ts`, `dev/scenarios/account-look.ts`, and `t.dataDir` in
`dev/scenarios/run.ts` (the stack's data directory, for the expiry case).
