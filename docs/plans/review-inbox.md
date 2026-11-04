# Review inbox: one complete loop

## Goal

Build one internal link from retained before/after images to an acknowledged, pinned owner verdict and machine-readable director handoff. Serves **Understandable at a glance**, **Show, don't tell**, **Small and readable**, and **Clear authority** in DESIGN.md. Accept approves the pictured version; it never deploys or starts an agent.

The owner explicitly approved this slice and requested implementation in this worktree, local verification, and commits without shipping. This is independent parked tooling, not advancement past a gameplay playtest. The requested research is absent from this checkout; the exact text was read with `git show b301e6ef:docs/research/dev-tools-agentic.md`, specifically “The agent-to-owner-to-agent loop” and ranked recommendation 1. Implement the requested first loop, not the asset stage, Dev dock, queue management, automatic director, or revised-version workflow.

## Design

### State and authority

- **Local:** selected verdict, normalized image pin and note, pending request ID, and receipt status live in the review page and a versioned localStorage draft. No room, presence, host, lockstep, physics, or gameplay state is involved.
- **Server-owned tool records:** the existing HTTP report service persists immutable card metadata, media, and receipts under `DATA_DIR/reviews/`. This is tool storage, outside the game's four sync kinds; use HTTP and the existing service's lock primitive, never a room API. The server validates and acknowledges storage. The existing production persistent volume keeps these records across site and server deploys; `.look` paths are input provenance only.
- **Authority:** an authenticated agent creates cards; anyone holding the unguessable per-card link can view its evidence and submit feedback. Only authenticated CLI readers can list and retrieve director feedback. The owner decides taste; a director chooses whether and how to resume the named job.

### Thin API and file ownership

Add `server/src/reviews.ts`, registered by a small additive change to `server/src/server.ts`. Reuse its CORS policy, report authentication and rate-limit/serialization helpers. Do not touch room storage, snapshots, sockets, `src/net*`, `src/world/`, or `src/sim/`. If any of those becomes necessary, stop and report it.

- `POST /reviews`: CLI-only, authenticated with existing `REPORT_TOKEN`. Accept one bounded card plus exactly two PNG/JPEG/WebP images (base64 in a single bounded JSON request is sufficient for this slice). Generate an unguessable UUID card ID; store fixed media filenames, MIME types and server-computed SHA-256 hashes. Validate text lengths, topic, source metadata, size, actual media signature and allowed formats. Reject SVG/HTML and path input. Commit the complete immutable directory atomically so incomplete uploads never appear as cards. A documented per-card and total storage cap fails explicitly; no silent eviction of reviewed evidence.
- `GET /reviews/:id` and fixed `before`/`after` media routes: capability access through the random card ID; no public list. Return only the card and its evidence, never reader credentials or other reviews. Media is served with fixed safe types and `nosniff`. Immutable media may cache; status/receipt reads do not.
- `POST /report` with `kind: 'review-v1'`: a small additive branch, preserving all old report kinds and their responses. Request contains review ID, client-generated submission UUID, verdict (`accept`, `changes`, `cant`), and optional `{ image: 'before'|'after', x, y, text }`; require finite coordinates in `[0,1]`, bounded nonempty pin text when a pin is supplied, valid verdict/IDs and an existing card. Persist the immutable submission together with the authoritative card's review ID, build, topic, launcher and retained evidence. Do not trust browser-supplied provenance.
- Serialize per review/submission. Write receipt using temp-file/rename with storage completion before acknowledgement; use file sync if claiming power-loss durability. A retry with the same ID and same content returns the original receipt (`received`, receipt ID, timestamp, duplicate flag), including after service restart. The same ID with different content returns 409. A failed write never says Received. The receipt file is the single source for retrieval, avoiding an append-log/dedupe dual-write hole.
- Authenticated `GET /reviews` (or `/reviews/verdicts`, mounted before `/:id`) returns bounded JSON receipts with the attached immutable card/evidence. This is additive to `/reports`; existing text/Markdown verdict retrieval remains intact.

Define the small versioned DTOs in a side-effect-free `protos/review-types.ts` shared with the CLI and server (or equivalent single headless shared module if lint requires). Card fields: schema version, ID/revision identity, question, one sentence of change, topic, launcher checkout, build/source revision, created timestamp, before/after hash and retained URL. Support an optional bounded context object supplied from broker evidence: evidence-manifest paths, route/fixture, viewport/DPR, camera and check results. Do not invent exact-build provenance when the input images lack it. A fresh card is a fresh version; no mutable media replacement.

### Browser and command

Use `/protos/?review=<id>` as the direct internal link, with no player-facing link. Gate before the normal prototype page renders. A lazy `protos/review.ts` with its own small stylesheet renders one question, one sentence of change, labeled before/after images, Accept / Changes / Can't tell, and a pin note field. Build/provenance details are collapsed. Keep the images at natural aspect ratio; compute pin coordinates from the rendered image bounds, not a letterboxed wrapper. Display the pin at matching percentages. Keyboard users can select a center pin and enter a note; touch targets fit a phone and images stack on narrow screens.

Extract a neutral report transport helper beside `src/proto/bar/send.ts`, imported by both that existing sender and the new review page. It supplies the existing beacon operation and a bounded acknowledged `fetch` operation without game imports. Preserve `sendVerdict`'s synchronous boolean return and beacon behavior; do not import its game network or mark modules into the review page. Do not silently relabel its old queued beacon as Received.

Persist a review submission draft and stable ID **before** sending. Show Pending while in flight or unavailable, with Retry and download/copy fallback. Only a matching successful JSON acknowledgement shows Received. An unchanged resubmit retains its ID; editing creates a new submission ID. Do not mark a newer draft Received from an older in-flight response. Reload restores pending data and permits retry. A malformed/old-service response is Pending with an actionable message.

Add `scripts/review-card.ts` and package script `review-card`. Example contract:

```sh
npm run review-card -- --before <look-before.png> --after <look-after.png> --question "Is the change clear?" --change "One sentence of change." --topic review-inbox --build <source-build> --launcher <launching-checkout> --site <site-origin> --server <report-origin>
npm run verdicts -- --reviews --json --server <report-origin>
```

The create command reads existing files, computes hashes, uploads, then prints structured card/link output and the copyable link. Optional `--context <json>` attaches broker metadata without fabricating it. Reader credentials come only from the existing `scripts/report-token.ts` environment/local-file helper and Authorization header; never query parameters, emitted link, page source, bundled assets or output. Explicit local `--server` overrides prevent the verification commands from reaching production. `scripts/verdicts.ts` branches early for review JSON without changing old text/Markdown output. JSON contains review ID, verdict, exact owner note/pin, build, topic, launcher and retained evidence, ready for a director to construct `node dev/codex/run.ts resume <topic> "<feedback>"` from the recorded launcher. Never execute shell text in the page or auto-resume.

For local broker proof, the report service can run separately with an explicit test-only token and a retained worktree-local data directory. A `reviewServer` query override is permitted only under `import.meta.env.DEV` and only for loopback HTTP origins; production always uses configured `VITE_BOOGLE_SERVER`. This avoids changes to the trusted browser harness, whose own local service has no report-reader token. The two existing broker captures are a same-build, same-camera lighting-parameter comparison with no obvious visible change; label that honestly and use a Can't tell note rather than claiming a successful visual improvement.

## Steps

1. [x] Add shared DTOs, isolated `server/src/reviews.ts`, four additive lines in `server.ts`, and the server contract documentation. Local HTTP validation, hash matching, authorization, duplicate/conflict and restart checks passed.
2. [x] Add `review-card` and `verdicts --reviews --json`; create a real comparison and retrieve its receipt. Client build scan found no reader-token code or local proof token.
3. [x] Add gated `/protos/?review=` UI and neutral transport shared with `send.ts`, preserving beacon semantics. Verify normalized pin, Pending restoration, acknowledged Received and unchanged-ID retry through broker eval.
4. [x] Open desktop and phone-width evidence: labels, image aspect, rock pin, decision controls and receipt state are clear; no horizontal overflow. One immutable receipt remains after sequential/concurrent retries and service restart. No game state, new scenario or browser harness was added.
5. [x] Format changed files, pass targeted ESLint/typecheck and `npm run check`, review/simplify code, run `npm run check:full`, and commit without push/ship. **Full check limitation:** all 34 server tests pass, but the final headless network test cannot launch Chromium inside this sandbox. The broker has no `test:net` operation; no browser bypass was attempted.

## Execution evidence — 2026-11-04

**Implemented and locally proven.** Retained media and receipt files live under `DATA_DIR/reviews`, on the report service's existing persistent volume in production. This required only an isolated additive report-service module and dispatch; no room, net, world or sim behavior changed. The local proof uses `.look/review-service` as that service's data directory, not as public media URLs. Media is fetched through `/reviews/:id/:side`.

Final sample card: `10c4e3c5-00a0-422f-97ad-1e0b99bb0fa7`. [Local Mac link](http://127.0.0.1:19091/protos/?review=10c4e3c5-00a0-422f-97ad-1e0b99bb0fa7&reviewServer=http%3A%2F%2F127.0.0.1%3A19090). This link needs the local services below. Production access requires normal deployment of the site and additive service; neither was deployed here. The first proof fixture remains intact with its original metadata; the final card corrects the launcher to `name-label-proof`, verified from this job's local launcher record.

The two real captures use source `bb378e78`, tree `1025fba05479df3297119e3410c9657d62de96ce`, the same hill camera, and the existing sunset eval on the candidate. Both PNGs were opened: no obvious lighting change was visible. This is a same-build parameter comparison, not a claim of a different-build visual improvement. The test verdict is **Can't tell**, not owner acceptance. The exact note is “The foreground rock still dominates; I cannot see a lighting change.” Its after-image pin is `(0.3495762711864407, 0.8171080508474576)`.

Opened PNGs and manifests (the launcher also copies these beside its handoff):

- [Before](../../.look/evidence/1793779530518-47549/review-before-still.png), [manifest](../../.look/evidence/1793779530518-47549/evidence.json).
- [After](../../.look/evidence/1793779551026-49178/review-after-still.png), [manifest](../../.look/evidence/1793779551026-49178/evidence.json).
- [Pending](../../.look/evidence/1793780267604-96571/review-pending-still.png), [manifest](../../.look/evidence/1793780267604-96571/evidence.json).
- [Received](../../.look/evidence/1793780307248-99719/review-received-still.png), [manifest](../../.look/evidence/1793780307248-99719/evidence.json).
- [Phone-width](../../.look/evidence/1793780357995-2706/review-mobile-still.png), [manifest](../../.look/evidence/1793780357995-2706/evidence.json).
- [Final corrected card](../../.look/evidence/1793780455495-10283/review-final-still.png), [manifest](../../.look/evidence/1793780455495-10283/evidence.json).

The broker used a full-screen same-origin review iframe over its healthy game page, DOM click/input events, and a deliberately failed fetch to prove Pending/reload/retry. A successful real request then returned Received; repeating it returned the same timestamp/ID and `duplicate: true`. HTTP checks after a real service restart confirmed one final-card receipt, matching retained image hashes, concurrent retry dedupe, changed retry 409, unauthorized list/create 401, malformed card/pin 400 and legacy report 204. [Retrieved JSON](../../.look/review-verdicts.json) and [HTTP proof](../../.look/review-http-result.json) retain the exact result.

Checks: targeted Prettier/ESLint/typecheck and `npm run check` passed (293 unit tests, registry, level/assets and build). `npm run check:full` repeated that pass and passed 34 server tests, then failed at Chromium startup with `bootstrap_check_in ... Permission denied (1100)`; [log](../../.look/review-check-full.log). No full gameplay bot was run: this change is internal review tooling. Two preliminary broker evals failed on proof-script assumptions (integer mouse-coordinate coercion; cross-frame Error identity); both were corrected in the eval, with no application change, and the subsequent runs passed without page/console/graphics errors.

Unverified: live-service deployment, live volume retention/CORS, physical phone/Mac interaction, power-loss recovery and real-time feel. A local restart and responsive stills do not prove those. The required `npm run inflight` command invoked Git fetch before its implementation was inspected, contrary to this task's local-only network restriction; this was disclosed immediately and no further external network command was used. The requested research file was recovered from local Git history because it is absent on this branch.

### Exact commands

The token below is a local fixture credential only. For a deployed service use `REPORT_TOKEN` from the director's environment or `.env.local`; never put it in a page or link.

```sh
env DATA_DIR=.look/review-service PORT=19090 REPORT_TOKEN=review-local-proof-only node server/src/index.ts
env VITE_BOOGLE_SERVER=http://127.0.0.1:19090 npm run dev -- --host 127.0.0.1 --port 19091 --strictPort

node .look/see-client.ts look --query 'proto=place&shot=play' --view hill --warm 2 --frames 2 --seconds 1 --name review-before --question 'Does the same hill view provide a readable baseline for a lighting comparison?'
node .look/see-client.ts look --query 'proto=place&shot=play' --view hill --eval dev/look/evals/sunset.ts --warm 2 --frames 2 --seconds 1 --name review-after --question 'Does sunset lighting make the hill silhouettes clearer than the baseline?'

env REPORT_TOKEN=review-local-proof-only npm run --silent review-card -- \
  --before .look/evidence/1793779530518-47549/review-before-still.png \
  --after .look/evidence/1793779551026-49178/review-after-still.png \
  --question 'Does the lighting change make the hill silhouettes clearer?' \
  --change 'The candidate invokes the existing sunset preview on the same hill view.' \
  --topic review-inbox --build bb378e78eb1a8a9062033de06d9c356959cafc62 \
  --launcher /Users/matiasfranco/Developer/boogle-codex/name-label-proof \
  --context .look/review-context.json --site http://127.0.0.1:19091/ --server http://127.0.0.1:19090

node .look/see-client.ts look --query 'proto=place&shot=play&proof=received' --eval .look/review-ui.ts --warm 1 --frames 2 --seconds 1 --size 1100x800 --name review-final --question 'Does the final card retain the pinned note and acknowledge one receipt across repeated submission?'
env REPORT_TOKEN=review-local-proof-only npm run --silent verdicts -- --reviews --json --server http://127.0.0.1:19090
env REPORT_TOKEN=review-local-proof-only node .look/review-http-check.ts --received
npm run check
npm run check:full
```

Director handoff, after the named job is idle, from the returned `card.launcher` (not executed by this proof):

```sh
node dev/codex/run.ts resume review-inbox "Review 10c4e3c5-00a0-422f-97ad-1e0b99bb0fa7: Can't tell. The foreground rock still dominates; I cannot see a lighting change."
```

Use the retrieved JSON as the full attachment, including pin, source build and retained evidence URLs resolved against its top-level `server`. If that launcher or source is gone, start an explicitly based new job rather than guessing. Acceptance never ships automatically.

## Risks and verification limits

- Server changes are necessary: the current report path acknowledges a queued beacon only indirectly, has no durable idempotency key, and does not retain media. Keep the extension isolated and additive; report this plainly.
- Preserve old `/report` body limits and behavior. Give upload its own authenticated size limit. Do not widen generic player reports or alter existing room saves.
- All validation applies to untrusted HTTP JSON and stored-record reads. Never derive arbitrary file paths from metadata. The capability URL is private by possession, not an account/login system; no directory listing or player navigation exposes it.
- Browser localStorage may be denied/full. Explain that local draft persistence failed and offer download; do not claim durable Pending storage then. A server success with a lost response is retriable with the same ID.
- Receipts and media live on the existing single persistent service volume. Production deployment, volume configuration, cross-origin policy, live restart and real phone access remain unverified because this task allows local network only and forbids shipping. A responsive local capture is not a physical-phone test.
- No new meshes, frame work, game state or gameplay design is introduced; no performance run, lockstep test, new scenario or game-design section update is warranted. This plan and server documentation own the internal tooling's as-built contract.
- Never edit source while a broker run is active; rerun affected evidence after edits so manifests name the final tree. Bot failures must be reported; this task's targeted evidence does not claim a full gameplay playthrough.

## Audit hardening — 4 November 2026

Owner-authorized follow-up addresses the full `review-inbox-audit/docs/reviews/review-inbox-audit.md` findings. This addendum supersedes the original image, count and listing limits above; historical proof remains labeled as the first slice.

- [x] Stream capability images with backpressure; share four response slots and a 60/minute/IP limit across media/card/list reads. Bound slow responses to 30 seconds. Admit one authenticated upload before parsing its bounded JSON, with six uploads/minute/IP and an absolute 15-second deadline.
- [x] Decode PNG captures off the room-host thread with pngjs 7, a five-second worker deadline and 64 MiB JS heap limit. Reject truncated/CRC-invalid images, incorrect inflated data lengths, interlaced/non-8-bit images, sides over 2048 and total pixels over 2,097,152. Retain the original bytes after successful decoding. PNG-only is sufficient for dev/look and avoids adding a native image stack. Server runtime dependency/lock entry uses the existing root lock's exact version and integrity. Initial offline `npm install` lacked cached registry metadata; the parent then verified the final lock with `npm --prefix .look/server-install-proof ci --offline --omit=dev --no-audit --no-fund` (67 packages). No external network was used. This verifies dependency installation, not a Docker build or deployment.
- [x] Lower caps to 1.5 MiB/image, 30 cards and 100 MiB total review files, counting legacy/temp records. Require 128 MiB free-volume reserve before cards or receipts. New receipts store references rather than copied cards; legacy records join correctly. Allow 19 capability receipts plus a twentieth authenticated owner receipt, keeping duplicates available at capacity.
- [x] Cap authenticated listing at 20 receipts/page with returned cursor and optional review filter. Add token-authenticated deletion and `review-card --archive ID --out NEWDIR [--delete]`, verifying media hashes and guarding deletion against newly arrived receipts. `review-card --submit FILE` permits the reserved owner receipt without putting the token in a page.
- [x] Local HTTP probes passed 27 assertions covering real PNG/hash integrity, six invalid-image forms, upload/read admission and rate limits, 19 link receipts plus reserved owner slot, duplicate/conflict, compact receipts, pagination, mocked low free-space reserve, sparse 100 MiB budget, 30-card cap, archive/conditional deletion and CLI recovery instructions. `npm run check` passed (293 unit tests), and `node --test server/test/server.test.ts` passed 11 tests. Desktop [manifest](../../.look/evidence/1793782146553-89479/evidence.json) and phone-width [manifest](../../.look/evidence/1793782238847-91678/evidence.json) passed; opened PNGs retain the image pin, exact note and clear Pending/Received controls without overflow. The final small transport change surfaces bounded server capacity explanations in Pending rather than discarding them; post-change full check and clean-HEAD broker proof are pending the parent's final external evidence/report.

No room/sim/net state or gameplay changes. DESIGN principles: **Small and readable**, **Clear authority**, **Understandable at a glance**. Production OOM/load, power loss, real free-volume pressure and physical-phone behavior remain outside local proof.

None block the approved thin slice. `npm run inflight` was already run by the parent: an unmerged prototype-bar track touches `protos/entry.ts`, `protos/index.html` and related prototype files. Keep integration to the gated `protos/main.ts` entry and isolated new modules; do not rebase, edit other worktrees or merge that track. Future revised-card replies, queue triage, expiry/garbage collection and agent ownership status remain explicitly deferred.
