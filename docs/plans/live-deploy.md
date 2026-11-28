# Live deploy

## Rollout order

Ship steps 1–6 together on `codex/live-deploy` with the world-bump gate intact. A page open before this release may need one manual Reload. After this release has deployed and run on production, ship step 7 from `codex/live-deploy-gate`. See `d-2026-11-28-live-deploy-one-reload`.

## What happens today

Pages and Fly publish independently. Pages uses the newest first-parent code commit from dev/client-build.ts for VITE_BUILD. The manifest already pairs that client build with dev/server-build.ts's server source commit. Docs still publish under the same game identity. Fly rebuilds only for its source paths. The automerge workflow can dispatch the two jobs separately. A green health check only proves the process answers.

On 27 November, [server workflow 46070187874](https://github.com/matiasfr/boogle/actions/runs/46070187874) took 29m19s from creation to completion, including 15m19s for test and 13m55s for deploy. These are workflow times. They do not measure the interruption of a player's socket.

Local baseline at d2ba9d24f: production Vite bundle, headless full Chromium on Windows, visible page, local HTTP and WebSocket, two successive createService instances on one port and volume. The probe clicked Jump in, waited for welcome, called the same saving close used by SIGTERM, changed BOOGLE_BUILD and started the second listener. Both servers used today's code. Service workers were blocked. The probe changed the served manifest and dispatched visibilitychange while the page was visible to exercise the real update check without waiting five minutes.

| Trace relative to saving shutdown | First run | Second run |
| --- | ---: | ---: |
| Close resolved on host | 113 ms | 6 ms |
| New listener ready | 316 ms | 24 ms |
| Browser observed restart bye | 118 ms | 54 ms |
| Browser observed socket close | 207 ms | 122 ms |
| Same page welcomed by replacement | 1124 ms | 923 ms |

Both socket URLs advertised aaaaaaa11111 after replacement. The browser displayed “Boogle was updated – reload for the latest version” and recorded one main-frame navigation including initial load. Browser callbacks and host events can be scheduled in different orders. These observations establish behavior, not a timing budget. This measured a local service handover, not process startup, image distribution, a device, or compatibility of arbitrary code revisions.

The update feature polls on start, every five minutes and on return to visibility. Hiding after detection normally reloads, with guards against a reload loop and reclaiming an account in use elsewhere. Nothing forces a visible old tab forward. ws-room retries after a graceful bye with jitter (500–1500 ms); ordinary losses have their own backoff. A successful welcome can therefore describe a new host while the tab is still running yesterday's code.

Fly sends SIGTERM with ten seconds to stop the single volume-backed machine. index.ts calls service.close. Hosted rooms send a restart bye, close the world with saving enabled and close clients with 1012. Room shutdown waits within bounds for outstanding writes and reports failure. The store serializes per room and renames a temporary file into place. Reopening a saved room restores the server checkpoint; a new namespace addresses a different save. Preserve the failed-load and verified-checkpoint guards. A failed close cannot be counted as a successful handover.

A stale local POST /jump returned 409 and the current namespace rail-v76. The old splash offers “Try again”, “From the beginning” and “The shared island” and then waits indefinitely. It runs before the ordinary update feature. Room reset's existing reload depends on a changed birth ID and storage, and clears room progress. Inventing a new birth to update an ordinary page would turn a code deploy into a player reset.

## Recommended implementation

Use the manifest's existing pair as the release identity. Enforce the server component in admission and converge all pages onto the advertised client component. A site-only change can reuse the same server artifact. Scheduling two separate hosting providers in one workflow cannot make their public cutovers atomic. Keep one room authority and its existing disk handover. A second live authority would require volume transfer, writer fencing and another recovery protocol.

1. In vite.config.ts, dev/client-build.ts and dev/server-build.ts expose the immutable client build, required server build and world namespace to both boot and the manifest. Keep docs-only identity stable. Verify docs, client-only, server-source and namespace changes against the two workflows and automerge dispatch. Match full IDs for admission and retain short IDs for display.
2. In server/src/host/rooms.ts and src/net/ws-room.ts validate the expected server build and namespace before loading a room or admitting an op, including reconnects. Expose the authoritative tuple on a no-store endpoint. Reject mismatch with an explicit retryable update result. Recheck on each socket so a readiness query cannot race a restart. For site-only changes where both clients match the same server, continue polling the published client build. No stale page may issue commands across an incompatible server boundary.
3. In server/src/host/hosted-room.ts and the world close path seal input first, finish accepted work, flush the last verified checkpoint and request outcomes, then close. Test an accepted action immediately before sealing and a refused action immediately after. Duplicate requests on ordinary reconnect must resolve with the original outcome. On checkpoint failure prohibit a claimed successful cutover and retain the last good save. Check SIGTERM and the Fly deadline separately from image build time.
4. Share a bounded-backoff release check between src/boot/jump-in.ts, src/features/updates.ts and room connection recovery. A mismatch pauses input, explains the update, and retries until the published page expects the listening host. Reload automatically at the first safe point with a bounded foreground grace, preserving the room address, including private invites. Recheck on resume. Avoid an endless reload on a cached shell and avoid a permanent same-target latch after a failed reload. Test both deployment orders, rollback, skipped intermediate releases, temporary endpoint failure and a displaced tab. Jump retry must not allocate twice. Never replay pending commands into a new namespace.
5. For a wipe give a brief shared heads-up, seal the old room and finish its accepted work there. Start everyone in the new namespace with the normal first visit. A migration needs per-schema transforms, replay and conservation proofs, and a rollback policy. It conflicts with the 8 November new-save decision and the 13 November reset call. Ordinary deploys retain the room's birth and use the existing recent-return behavior.
6. In a local test harness serve two different production bundles, two server identities, and a single persistent test volume. Use two independent browser principals. Record both page builds, host ID, namespace, room birth, checkpoint sequence and authoritative held stock before and after. Make a known accepted operation from tab A at cutover, and compare both replicas and disk against the exact expected result. Repeat with a real namespace bump: inspect the old final checkpoint before cleanup, require a new birth and fresh stock, then accept a distinct operation visible exactly once to both tabs. Include a quiet tab, an actively submitting tab and a jump-in opened during skew. Break admission and final-save ordering separately to demonstrate the assertions fail. Capture trace and player-facing stills; run node dev/ship-check.ts.
7. Only after the proofs, remove dev/world-bump-gate.ts and the exit-9 retry in dev/ship-queue.sh. Update the historical decision annotations, current rules, owner calls, mixed-builds contract and owning game-design section. Keep the narrow admission exception explicit. The 27 November instruction to deploy with players on came from the task brief; its named decision anchor was absent on this checkout of origin/main. Reconcile that entry before implementing the final step.

## Design review (2026-11-27)

| Player-facing call | Kind | Basis |
| --- | --- | --- |
| Docs merges leave the page alone | Decided | 27 November docs-only deploy decision |
| Same-world recent returns resume, including a friend who reconnects later | Decided | 14 November recent-reload decision |
| A wipe begins a new save and first visit for everyone | Decided | 8 November new-save and 9 November room-reset decisions |
| Deploy while people play and converge them on the same release | Decided | Owner, 27 November, quoted in brief |
| Brief update or new-world heads-up, automatic return at a safe boundary, same behavior solo and with friends | Default | Keep one shared notice and reuse drop-in recovery. Working labels “Updating Boogle” and “A new island is starting” are placeholders for the owner. |

Findings: indefinite quiet-time waiting strands an active player, so step 4 bounds the grace. The jump-in splash runs before gameplay, so step 4 starts recovery in boot. Showing a new-island notice on ordinary deploys would misrepresent progress, so steps 3 and 5 distinguish room birth from release identity. The state-ownership audit supports the single server writer. The 14 November session's twelve reloads in 88 minutes argue for retaining docs-only identity. No Boogler dialogue changes.

## Owner question

**Answered 27 November 2026.** The owner said “Take your recommendation”. A legacy tab may need one manual Reload to install recovery. Ship client support first with the wipe gate intact. Subsequent supported pages recover automatically.

**Must wait for the owner. May the first rollout require one manual reload for a continuously visible tab already running the old page?** Recommend yes, limited to installing the recovery-capable client. Ship the client support first with the wipe gate intact; keep legacy connections out of incompatible rooms. Every subsequent supported page should recover automatically. The existing visible page only offers a button, its jump-in refusal waits for a click, and a service worker can be disabled. No later server message on the current protocol can safely force all of those pages to navigate and preserve same-world progress. A one-time exception changes the requested guarantee for actual players; the implementation must not silently assume it.
## Local handover proof

Two isolated Chromium profiles entered the same room through production Vite bundles. Each bundle used its own full release identity, and the third compiled a real namespace bump. Service workers were enabled. Each replacement service reopened the same test volume. The harness inspected both mounted railway mirrors and the authority, submitted ordinary railway requests on tab A's room socket, and read the saved account stock directly from the final checkpoint. Periodic saves were set to ten minutes to exercise shutdown's final write.

| Cutover | Both pages and room | Accepted work and disk |
| --- | --- | --- |
| A, v77 | Build e1ea031b6073, birth 51a9e242c223, both saw zero logs | A woke the machine and chopped one log (request 3). |
| A to B, Pages first | Both automatically loaded 6962aa27cefe, v77, same birth. While only Pages was new, a visibility check left A connected and playable. | Final checkpoint 405 held exactly one log. B restored the accepted A request. Both replicas and the authority read one. B's next chop raised it to two. |
| B to C, host first | Both automatically loaded e6197b1054fd, v78, birth 700fabe4aa88. A new jump-in tab that opened during skew recovered into its allocated room. | Final v77 checkpoint 439 held both logs. Both v78 replicas and the authority started at zero, then agreed on exactly one after a new wake and chop. |

During the wipe, both a legacy handshake and one explicitly naming v77 were refused before a v78 room loaded. The modal named the new island on the loading screen. [Wipe heads-up](live-deploy/wipe.png)

Negative controls: disabling the admission comparison in an isolated fixture yielded welcome where the test required update. Running the same two-tab proof with final checkpointing disabled left zero logs where disk had to hold one. Both checks passed with the production paths enabled.

A site-only update and a rollback returned the player to active play with the same room birth. A temporary manifest outage and stale HTML kept the page from navigating prematurely. A displaced tab stayed displaced. A docs edit inside the server image paths, followed by a client-only edit, retained the original server source stamp. Both workflows and the ship classifier use the same prose boundary.

Implementation refinements: retained the existing host checkpoint drain, added an explicit input seal, and checked host identity before sending socket authentication on reconnect as well as at admission. A Pages-first release lets the existing room continue until Fly is ready. A namespace change uses the usual first-visit card. This was a local graceful service replacement; Fly rollout, a forced process kill, storage failure during a Fly deployment and physical devices were outside the browser proof.
