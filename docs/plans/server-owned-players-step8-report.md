# Step 8: delete the lead tab

## Rebased verification — 2026-11-13 follow-up

This section supersedes the old-base verification below. Branch: `codex/server-players-step-8-2`.
Rebased implementation/report tip: `aaa38c94d`; this follow-up is a separate report-only commit.
Base: local `origin/main` at `3dcf42653685b02fe644cb09e8817404cc8df822` (v43). Runtime stays **v44**.
The original branch `codex/server-players-step-8` and tip `bc86b179b` are preserved. No push or ship.

The orchestrator reported an independent review of `bc86b179b` with no defects. Rebase completed with
**zero conflicts**. `git range-diff 40de3b82..bc86b179b 3dcf42653..aaa38c94d` marks all four patches `=`:
`96cddfa32` (runtime), `f2ef50856` (tooling), `c3d1a1d09` (docs), `aaa38c94d` (original report).
No runtime fix or conflict resolution was needed. Main's workshop/shop/curio/museum conversions are
preserved. No town room files, prefab files or `dev/lint/prefab-debt.json` differ from the rebase base.
No debt regeneration was needed; the baseline failure is resolved by integrating main's content.
The reviewed implementation still changes 52 files, +288/-337 lines, with zero whole-file deletions;
including the original report, the rebased four commits change 53 files, +585/-337 lines.

### Fresh checks on the rebased tree

- `npm run check`: **pass in full**, including build; 1,909 unit passes, 0 failures, 1 existing TODO (1,910 total).
- `npm --prefix server test`: **370/370 pass**.
- Direct worktree `npm run test:net`: **190/190 pass**.
- `npm run registry`: **pass against origin/main**, without alternate base or allowance changes.
- `node dev/ship-check.ts origin/main HEAD`: **pass against origin/main**: registry, 37 lint files, typecheck, 607 assertions in 61 affected test files.
- Requested scenarios, each through `npm run scenario -- <name>` on fresh local stacks: **10/10 pass** — smoke, second-tab, reconnect-edit, roster, shared-kinds, world-inputs, boogler-tag, boogler-talk-pad, interact, one-hand. Some ran under shared-machine load; their timings are not performance/feel evidence.
- `npm run review-stamp -- . --no-fetch`: **`bde8e0c97749`**, unchanged by the rebase (15 classified files).
- `git range-diff`: identical reviewed patches; no source changes after checks began. Ran `npx prettier --write` on the follow-up report before commit; repository `.prettierignore` excludes
  Markdown, so its established prose layout is retained. Its affected registry/document check was rerun.

New logs: `.look/step8-2-check.log`, `step8-2-server.log`, `step8-2-net.log`, `step8-2-registry.log`,
`step8-2-ship-check.log`, `step8-2-stamp.log`, and `step8-2-scenario-results.txt` under `.look/`.
Each fresh scenario's `verdict.json` and screenshots are in `.look/step8-2-scenarios/<name>/`.
The old source/build captures below are historical, not evidence for this rebased tree.

### Exactly why the network suite changed from 191 to 190

At join, `dev/peer-test/ws-run.ts` used to have two checks:
`no page is the lockstep host` (`snaps.every(s => !s.host)`) and
`only the first page is the lead` (`snaps.map(s => s.lead).join() === 'true,false,false'`).
The snapshot returned no `host` property, so the first assertion was vacuously true; it is removed.
The obsolete lead election check is replaced by **`every page follows the server`**, awaiting every
page's server clock. Thus those two join checks become one meaningful check: net **-1**.

The other replacements do not change the count: `B becomes the lead within 2 s` becomes
`the remaining tabs still follow the server`; `hiding the first tab moves the lead` becomes
`the other tabs receive the first tab hiding`. The seat invariant is retained with its label changed
from `a hidden tab and a new lead do not free seats` to `a hidden tab does not free seats`.
Departure visibility, surviving seats, reconnect, restart and shared-state checks remain exercised.

### Fresh prototype look

Using the look skill and restarted broker, the visual question is: does `?proto=net` boot with its
per-tab Boogler and allow both connected tabs to sit in the same locally named diagnostic seat without
Server arbitration? The disposable `.look/step8-2-prototype.ts` eval uses the production `registerSeat`,
`seatMesh` and `sitDown` APIs to stage a stool near each tab's Boogler. It is a capture fixture, not a new
level or authored prop. Both tabs intentionally use the same seat id; each stool is positioned locally.
The eval requires `productionRailway === false`, no railway mirror or command session, a moving Boogler
in each tab, a successful sit, no pending claim and an empty Server occupancy map.

[Fresh broker manifest](../../.look/evidence/1794631511766-14780/evidence.json): pass, clean worker
commit `aaa38c94dc56bf86a886843c45d2492871aee3d6`, tree `9d6c0d5b46e45e8efd80c266608e453164488501`,
unchanged before/after. The harness identity is recorded separately in the manifest.
Opened both [first-tab still](../../.look/evidence/1794631511766-14780/step8-2-prototype-still.png) and
[second-tab still](../../.look/evidence/1794631511766-14780/p2-step8-2-prototype-still.png).
Each shows its local Buddy seated on its diagnostic stool and The Boogler nearby. The stool and seated
pose read clearly in each local view; the other tab's diagnostic stool is deliberately not shared.
Logs show one connected peer per tab, `serverMirror:false`, `commandSession:false`, the same
`prototype-local-proof` seat id in both tabs, `pending:null`, `occupants:{}`, and independent sampled
Boogler positions/movement. Capture health passed WebGPU, advancing frames and zero page/console/graphics
errors. These stills establish startup and visible local seating, not smoothness or a final chair layout.

No new gameplay defect was found. Remaining limits: the prototype fixture demonstrates the Local code
path, not an authored prototype chair layout or subjective feel. No new three-player first-tab-close
mid-ride or device session was requested/run in this follow-up; **not tested on a device**. Checkpoint C's
device proof remains open. Earlier look-lab and guest limitations are historical and were not rerun;
only the ten scenarios requested here are claimed freshly verified. No external fetch was needed;
local `origin/main` was used, and review-stamp used `--no-fetch`.

## Original implementation and pre-rebase evidence (historical)

2026-11-13. Local review work on `codex/server-players-step-8`. No push or ship.
Implementation tip: `f0f1b09ebe7bc6176fd31e3559b2313d8eb7a847`; the report follows in a docs-only commit.
Starting local `origin/main`: `40de3b82cea04e05a298b85f3d665096d1d44957`, verified WORLD_NS v43.
Runtime is now v44. Implementation is complete; verification limits below keep Checkpoint C open.

## Change and authority

Removed server election state, welcome/message/status lead fields, client election callbacks,
`addHostField`, the Host presence wrapper, lead-change resend, pre-entry lead presence,
telemetry's lead role, debug displays and lead-only tooling/test expectations. WORLD_NS v44 has
a dated history entry for removing wire fields/messages. Existing namespace admission cleanly
refuses v43 before welcome; no migration or alternate transport was added. Legacy raw and wrapped
client lead messages are ignored by production rooms without disrupting heartbeats or shared state.

Steps 6 and 7 left no production Host registration. Their remaining-use lists named election,
presence bookkeeping, diagnostics and tooling, all removed here. Seats and The Boogler already use
Server authority alongside railway, roster and rail tuning. Owner presence remains, including
body/seat pose and `bg: [act, wary]`. Joining first grants no authority. Initial/reconnect presence
and hidden-tab liveness remain; only election-specific resend and heartbeat behavior were removed.

Effective prototype pages keep **Local unarbitrated seats and a separate Boogler per tab**, including
local reactions. Their existing production/session gate already selected that path; comments and
current docs now make it explicit. The retired `?proto=place` alias still opens the production game
and therefore uses Server authority. No new prototype command boundary was added.

Boogler dialogue and gift-copy files are unchanged. Suspect existing copy for the owner:
`src/sim/gift-catalog.ts:24`, the unreachable frisbee response, remains verbatim. No ROM data was used.
No prefab files or room-replacement code were edited. DESIGN.md, the eight protected instruction
locations below and multiplayer section 8.4 are unchanged; their replacements are drafted below.

## Deletions, fixtures and local commits

Against the verified starting commit, implementation changes **52 files, +288 / -337 lines**;
**zero whole files deleted**. The report adds one new file. Major deletion locations:
`server/src/host/hosted-room.ts` (37 lines), `src/net/ws-room.ts` (18), `src/netplay/net.ts` (22),
`src/netplay/presence-fields.ts` (15), and `test/presence-fields.test.ts` (32).
These are diff deletion counts, including rewritten lines, not a claim that every removed line was executable.
Full per-file counts: [numstat](../../.look/step8-numstat.txt) and [diffstat](../../.look/step8-diffstat.txt).

- `d8afe2213` — Remove client lead authority at v44 (24 files, +122/-167).
- `82b44b9dc` — Teach tooling the server-command model (20 files, +114/-129).
- `f0f1b09eb` — Document shared authority without a lead tab (8 files, +52/-41).

The final `rg 'isLead|onLeadChange|addHostField|hostField' src server dev test` has zero matches.
Registry JSON lists 19 extension presence keys; `g`, `placeSeatGrants` and `placeSeatRequest` are absent/free.
Server-host names such as `HostedRoom` are server terminology, not a remaining Host sync kind.
Historical plans, owner calls and protected draft-only instructions retain historical terminology.

Scanner and lint fixtures now use member `ops.define` and command `.act` calls. Registration restrictions
retain live `registerState`/`onTick` enforcement. Atlas types, model, lanes, badges and stories now show
Local/Owner/Server. Its internal historical `lock` lane identifier stays internal; it displays Server.
The obsolete Host fixture and publication/demotion tests are gone. Peer fixtures assert hidden-client
presence and departure behavior, not election. v43-pinned cart and namespace reset fixtures now assert
v44; the reset test also asserts that its previous namespace differs from the current one.
The message route reads the room interface section and conditionally reads room identity/admission,
keeping the required-reading budget without dropping the applicable contract.

## Verification and evidence

Tests first: the new no-lead host regressions failed before runtime removal (2 failures), then passed
10/10. The tooling tests first exposed 5 failures, then passed 37/37. The host regressions cover both
2-player departure orders and all six 3-player orders, all clients hidden, surviving seats, ticking
Boogler, persisted roster, legacy frames, and v43 refusal. Existing host/network tests cover movement,
talk intent, ride, present/puff acceptance and timing, reconnect/restart, tuning and railway state.

| Check | Verified result |
| --- | --- |
| Changed-file `npx prettier --write` | Applied; report formatted separately before commit |
| `npm run check` | Lint/typecheck and 1,907 unit tests pass, 0 failures, 1 existing TODO; stops at the advanced-main prefab debt check described below |
| `npm --prefix server test` | 370/370 pass |
| Direct worktree `npm run test:net` | 190/190 pass |
| `npm run load` | 226/226 pass, including all 18 railway load rows; materials conserved and mirrors agree |
| Level, assets, prefab freshness, build | Run separately after check stopped: all pass; prefab artifact unchanged and fresh |
| `npm run registry` | Fails only the advanced-main prefab debt comparison; recorded-base rerun passes |
| `node dev/ship-check.ts origin/main HEAD` | Fails at that same registry comparison |
| `node dev/ship-check.ts 40de3b82cea04e05a298b85f3d665096d1d44957 HEAD` | Pass: registry, 37 lint files, typecheck, 605 assertions in 61 affected test files |
| `npm run review-stamp -- . --no-fetch` | `bde8e0c97749`, 15 classified files; a fingerprint, not an independent review approval |
| Scenarios | All 29 names exercised: 27 pass after isolated reruns, guest-play internally skips, look-lab remains failed on the documented sea-depth compile race |

The shared local `origin/main` ref advanced during this task to `7a9498ff680d86c4467fe0880aa5e3cd162070f9`
(still v43). That unrelated prefab conversion lowered `colliders/src/entities/town/curio-shelf.ts`
from 3 to 1. This branch and its original base both have 3; no count grew in this change. The default
registry gate therefore reports `1 → 3`. No debt allowance was added, no prefab was changed, and no
shared ref was reset. `npm run registry -- --base 40de3b82cea04e05a298b85f3d665096d1d44957` passes.
The branch needs integration with newer main before the default gate can be green; no such integration
or independent pre-ship model review is claimed here. The requested no-push/no-ship boundary is intact.

Initial broad checks exposed two pinned-v43 test fixtures, corrected before final unit/server passes.
The first browser launches failed in the filesystem sandbox; approved localhost retries succeeded.
The all-scenarios batch ran all 29 names but had 14 failures after exhausting the local session quota
(HTTP 429), plus an account-key conflict in room-replace. Original logs and verdict are retained.
Affected scenarios were rerun on fresh stacks; look-lab uses its documented `LOOKLAB=stills` and
`LOOKLAB=bench` modes on separate stacks to keep each under the existing session quota. No limit was
raised and no console error was suppressed. All fresh gameplay reruns passed, including room-replace;
the account-key conflict did not recur. Look-lab stills exposed the already documented
[sea-depth warm-up compile race](../../src/render/reference/frame.md#known-traa-and-the-warm-up-compile-race-on-the-seas-opaque-depth-three-r187)
in high/ultra: `Binding multisampled flag (1) doesn't match the layout's multisampled flag (0)`.
Its `high-shore-still.png` was opened and is severely washed out; no rendering fix is included.
The benchmark half passed without graphics errors but finished under load; its timings are not proof of performance or feel. This is an outstanding scenario failure, not a green suite. Guest-play internally skips without GUEST_ROM/engine;
its runner's outer PASS is not guest gameplay proof. The dino scenario mocks its hosted engine request.
An extra standalone atlas content audit still reports 22 pre-existing citation/text issues outside this
change; the atlas runtime scenario passes. No before-change load baseline was captured. The eight-player
presence measurement delivered 100% and used 8.2% of one CPU core; these machine-local timings are not a
before/after performance claim.

### Visual question, observed output and limits

Requested question: with three players, does the rider remain aboard and the shared world keep moving
when the first tab closes mid-ride? The trusted broker rejects three players (`--players must be 1 or 2`):
[rejected request](../../.look/evidence/1794628171746-50171/evidence.json). No new harness or direct Chromium
session was used to bypass that limit. This exact visual question remains unverified.

The narrower two-player question was whether talk and a mid-walk ride remain continuous without an
elected tab. The existing `boogler-authority.ts` eval stages proximity, uses production talk/contact,
asserts talk stops on the press, and waits for the Server ridden leg. The final
[look manifest](../../.look/evidence/1794629887009-66648/evidence.json) records unchanged worker commit
`f0f1b09eb` and source fingerprint `090216b42f1575ed2e30c0d620460cfe84560da9` before/after; the untracked
report was the only pending file. The trusted harness is separately pinned at `d87c05719`.
Opened: `step8-final-motion.png`, `p2-step8-final-still.png`, `step8-final-curves.png`, and
`step8-final-consecutive.png` (12 consecutive encoded frames extracted at 3.5 seconds with ffmpeg).
The rider stays over the compressed Boogler through the sampled puff onset, then launches; the
second-player still shows both players and The Boogler afterward. The later dialogue covers the
foreground in the motion sheet. The curves show the launch arc; no page/console/graphics errors.
This is sampled motion evidence, not a verdict on subjective feel or smoothness.

Also opened the earlier look's motion, both stills and consecutive-frame sheet
([manifest](../../.look/evidence/1794628191614-50618/evidence.json)); the prototype `step8-prototype-still.png`
([manifest](../../.look/evidence/1794628228543-52080/evidence.json)), which shows the island loading but
neither seat use nor a Boogler in frame; atlas `light-how.png` before/after the final caption correction,
showing the three kinds and Server replicas; and `interact/riding-still.png` from the original scenario
batch. Prototype startup is observed; cross-tab independence is established by the existing gate/code,
not a dedicated visual comparison.

The two-player place bot reached T2 with mirrored hashes agreeing at 232 server steps:
[playthrough manifest](../../.look/evidence/1794628343785-55925/evidence.json). Its report was read and
`run/end-still.png` opened: both players stand beside the completed railway. No expected beat failed
within the requested T2 segment. The 5x run reported peak clock drift before catching up; it does not
prove real-time smoothness or the full later-game route.

Logs and scenario verdicts live under `.look/step8-*`; the original batch is
`.look/step8-scenarios-final.log` and `.look/step8-scenarios-batch-verdict.json`, fresh-run verdicts under
`.look/step8-retry/`, `.look/step8-look-stills/` and `.look/step8-look-bench/`.

Checkpoint C remains open: **not tested on a device**. No two-device join/sit/ride/talk/departure/reconnect/
restart session, literal three-player mid-ride first-tab close, full long playthrough, before/after load
comparison or subjective real-time smoothness was verified. The `check:full` aggregate was not rerun;
its components were exercised separately with the current-main registry blocker stated above.
An initial `inflight --help` attempt tried its default fetch and failed at sandbox FETCH_HEAD access;
no successful fetch occurred. Later ref reads and review-stamp
used local refs only. Scenario splitting and the two-player look are the other stated proof departures.

## Draft DESIGN.md sync and authority wording — not applied

The owner sets these words. `DESIGN.md` is untouched. This replaces the four-kind draft in
[server-owned-state step 9](server-owned-state-step9-report.md#proposed-design-sync-table-owner-commits).

### Pick how each feature shares state

Every feature puts each piece of its state in one of three kinds. Use the cheapest kind that works:

| Kind | Use when | Who computes it | Math | Today |
| --- | --- | --- | --- | --- |
| **Local** | Nobody else needs the result, or it only decorates | Each tab | Anything, including `Math.random()` and the GPU | Particles, ripples, sounds, camera shake, personal conversation memory |
| **Owner** | One player drives it, or local physics moves it | The owner's tab; others smooth its broadcast pose. Shared physical ownership changes hands by epoch | Anything, including Rapier and three.js math | Player movement, seat pose, the beach ball |
| **Server** | A shared outcome needs one authority, whether transient or saved | The room server accepts authenticated commands, applies rules and publishes replicas. Clients render replicas and may predict declared actions | Deterministic rules for replay and shared prediction; presentation stays separate | Railway, roster, rail tuning, seats, The Boogler's legs and accepted reactions |

In code: Local needs no shared API. Owner uses `addPresenceField` and `onRemotePresence` in
`src/netplay/net.ts`, plus `createOwnerSync` for a physical object that changes hands. Presence goes out
at 20 Hz, latest value wins; keep fields small and smooth poses with `createSnaps`. Server commands use
`ops.define` on the server and the command adapter on the client. Complete replicated mirrors drive
views. Saved Server state uses `registerState(..., { server: true })`; transient seats are not saved.
No tab leads the room, and clients never execute authoritative shared ticks or save room state.

One-off cosmetic events such as honks and pings use `room.send` and `room.onMessage`, reliable and ordered
to every other peer, with validation and rate limits. An accepted shared outcome such as a Boogler present
or puff uses a server command and replicated event; declared local prediction plays on the press and
never repeats on confirmation. Queuing a command is not acceptance.

- **Physics stays Owner.** A physical thing can read Server state and request a shared change through a
  command. The server owns the accepted result; the client owns its immediate declared prediction.
- **Shared persistent state is Server.** Verified checkpoints preserve it across departures and restarts.
  Roster and tune commits acknowledge only after storage; ordinary checkpoints normally run every two
  seconds and on close, so non-durable actions may roll back within that window. A failed-load fallback
  never overwrites the last good checkpoint. Personal conversation memory stays localStorage.
- **Shared schedules derive from replicated facts and the room clock.** Clients compute continuous poses
  from accepted start ticks and legs; they do not elect a tab to advance them.
- **The scene graph is a view.** Render from state and never read shared authority back out of a mesh.
- **Prototype pages are temporary.** Effective prototypes keep Local unarbitrated seats and a per-tab
  Boogler. The retired `?proto=place` alias remains the production game.

### Clear authority

| Thing | Authority |
| --- | --- |
| Your player's movement and seat pose | Your client, published as Owner presence |
| The beach ball | Its current owner, with the epoch rule in `src/netplay/owner-sync.ts` |
| Railway outcomes, roster and rail tuning | The server, through authenticated commands and complete replicas |
| Seat occupancy | The server; one transient seat per player, predicted locally on the press and reconciled with receipts/rows |
| The Boogler's movement, mode and accepted present/puff reactions | The server; clients draw continuous legs and predict their own reaction effects |
| The Boogler's conversation memory, talk UI, ride timer/launch and personal held items | Your client; no dialogue text is sent by the server |
| Room persistence | The server, through verified checkpoints; seats and reaction events remain transient, while The Boogler's position/facing are saved |
| Prototype seats and Boogler | Each tab independently; no shared arbitration or server command session for these features |

### Related stale technical paragraphs for the owner

Replace the introduction under **Determinism from day one** with: “Server replay and declared shared
prediction use deterministic rules and fixed ordering. Conserved quantities remain integers. The current
conservative math guard remains on pure rules and prediction dependencies; local cosmetics and the
server-only Boogler brain do not feed client authority.” Keep the detailed arithmetic rules unless a
separate approved change narrows them.

Replace **Sync edits, not state** with **Commands and replicas**: “Clients request shared changes through
small authenticated commands. The server validates and applies them in arrival order, then publishes
changed components, receipts and accepted events. Clients read complete mirrors; optional declared
prediction reconciles with the server. They do not replay a classic edit stream or compare shared-state
hashes. Owner presence publishes current values.”

Under **Server hosts every room**, replace “it runs the lockstep world headless” with “it runs shared rules
and the room clock headless, accepts authenticated commands and publishes replicas”. Keep the existing
server-only hosting, reconnect, empty-room pause and room-interface requirements.

## Draft binding-instruction replacements — not applied

The following files stay unchanged because the owner sets their wording. These are exact replacement
paragraphs or table rows for review, not permission to reintroduce removed APIs.

### `server/AGENTS.md:6`

> Bind authenticated session/player identity and validation facts in the server command context. Commands use `ops.define`; apply changes state and returns a result. Keep deterministic ordering and ticks, never per-peer counters. Pure logic belongs in sim and registration in world/rules. Register only Server-kind checkpoint state; seats and accepted reaction events remain transient.

### `src/features/AGENTS.md`, `src/entities/AGENTS.md`, `.claude/rules/state-consumers.md`

Replace their first two safety bullets with:

> Apply changes server state and returns a result. Effects follow authoritative receipts or replicated events; declared reversible prediction may show on the press and must not repeat on confirmation. A queued command is not acceptance; a timeout is never success. Follow the feature's correction policy for refusals and unknown outcomes.

> Physics stays Owner. Owner state uses descriptive untaken presence keys, createSnaps at now - INTERP_MS (20 Hz latest wins); sweep departed peers. Return null when a field stops; missing means off. Use createOwnerSync for handoffs, preserving wire shape and holding semantics. Shared outcomes use Server commands and replicas. No tab leads the room; effective prototype seats and Boogler remain Local.

Keep their remaining message-validation, namespace, lifecycle, eager-loading, import and action-wrapper bullets.

### `.claude/agents/planner.md`

In step 1, replace “Lockstep state: also” with “Server state, rules or prediction: also”, retaining the same
world/rules and world README links. Replace the Design bullet's lockstep recipe with:

> For Server state, name the pure logic, rules, command adapter and view files; command names and validation/actor facts; checkpoint state keys or an explicit transient choice; replicated schemas/projections; accepted/refused receipt handling; declared prediction and correction behavior; and replay/invariant tests. State who owns rule ticks and saves. No client lead, classic edit generator or client state registration is introduced. Controls: action id, pad slot (check freeSlots()), key, touch, guide row.

### Root `AGENTS.md:3`

> Goofy co-op browser game: three.js WebGPU + TSL, Rapier and Vite; a WebSocket server owns shared rules, commands and replicas. Main auto-deploys to boogle.club.

### `docs/agents/safety-audit.md`

Add a dated supersession note rather than preserving the old audit's gap count as a current claim:

> 13 November update: v40 retired classic edit transport and client state registration; v44 removes Host kind and lead election. The historical counts below are not a current enforcement total. Replace the affected rows with the Server-command rules below; no full enforcement recount is claimed.

| Replacement rule | Enforcement and limits | Path reminder |
| --- | --- | --- |
| Apply changes server state; effects follow accepted receipts/events or declared reversible prediction without replay on confirmation | Headless import boundaries and command tests cover exercised cases; neither proves arbitrary apply purity or consumer behavior | W, F, E, C |
| A queued command is not acceptance; timeout is never success | Request/receipt tests cover ordering, idempotency and refusals; individual consumer acceptance/correction remains reviewed | F, E, C |
| Server commands bind identity and Actor facts, validate, apply, then project complete replicas | Command-context and host tests exercise the boundary; rule choice and new validations remain reviewed | W, H |
| Server checkpoint handlers and rule ticks stay in headless owners; clients install neither | Lint registration/import boundaries, state-registration guards and server tests; not whole-program semantic analysis | W |
| Saved Server states verify checksum, loads and hash before readiness; failed/fatal state never overwrites the last good checkpoint | Recovery and fatal-command tests cover exercised paths; preservation remains a review obligation | W, N, P, H |
| Three sync kinds: Local, Owner, Server; no Host publication or client election | API removal plus transport/host tests establish the current implementation; choosing the right kind remains reviewed | P, F, E, C |
| Replay and shared prediction retain ordered deterministic rules and the existing conservative math guard | Math lint and replay tests; lint cannot discover arbitrary semantic prediction dependencies | S, W |
| Development wire/state/catalog changes use WORLD_NS plus a dated history entry; no migrations or compatibility transport | Current-tree validation and namespace admission tests; arbitrary payload meaning remains reviewed | W, S, N, P, F, E, H, C |

Remove the obsolete Host row, classic Lockstep recipe/edits/env rows, migration/version comparison rows,
and the `registerOp` registration row. Replace the follow-up about a `submitEdit` conditional with:
“Review success effects against authoritative receipts or declared prediction; syntax alone does not prove
correct acceptance, rollback or exactly-once effects.” Keep current presence, message, import and math obligations.

### `docs/game-design/multiplayer.md` section 8.4

Proposed complete replacement:

> **8.4 Server commands, replicas and checkpoints**
>
> The server advances the room clock at 60 steps per second and registered rules at 10 ticks per second.
> Clients send authenticated `r:*` commands. The server validates and applies them in order, then publishes
> complete component packets, receipts and accepted events. Clients estimate time from server-only `w:c`,
> render complete mirrors and may predict declared actions; no classic edit replay or cross-client hash
> consensus remains. A queued command is not acceptance, and a client predicting nothing remains conformant.
>
> Saved Server states register JSON serialization, strict load and deterministic hash handlers. Recovery
> verifies the envelope checksum, exact registered state keys, every load and the loaded state hash before
> readiness. A failed-load fallback or fatal rule/command result must never replace the last good checkpoint.
> Clients never persist room state. Checkpoints normally run every two seconds and on close; durable roster
> and tune commits wait for storage, while non-durable actions may roll back within that checkpoint window.
>
> The checkpoint envelope is capped at 128,000 UTF-8 bytes. Shape/catalog/wire breaks reset WORLD_NS with
> a dated history entry, without migrations. Seats and reaction events are transient; The Boogler saves only
> his position/facing. Effective prototypes retain Local seats and a per-tab Boogler. The room and rules
> READMEs own the exact current registration, clock and persistence contracts.
