# Continuous co-op route: reached Q2; reload coordinator blocked

4 November 2026. Worktree `boogle-codex/coop-route-run`, branch `codex/coop-route-run`, starting at `e89d523a`. **Partial, not a passed first-chop-to-pier replay.** No push or ship. The earlier launcher rejection is superseded by the executed runs below.

## Execution result

[Furthest route manifest](../../.look/evidence/1793817561909-59663/evidence.json), [full report](../../.look/evidence/1793817561909-59663/run/report.txt), [checkpoints](../../.look/evidence/1793817561909-59663/run/checkpoints.json). Read this report and every failed attempt's report in full, including their unmarked beats, stalls and errors.

Two peers started fresh together, chopped and carried through T1–T3, opened the first path, gained double jump and the axe, built and lit the forge, gained the pack, and completed Q1 and Q2. **Last released checkpoint: 12, Q2**, at **368.576 wall seconds**, approximately **721 game seconds after bot start**. Player 2 then actually reloaded at 1x. The run ended at **461.711 wall seconds** because the coordinator waited 90 seconds for `#enter:not([disabled])` to become visible. The returning game was already playing, so that button stayed hidden.

The report says `reload false` because the coordinator never completed its post-reload branch. This does **not** mean navigation never happened: there is a new P2 telemetry session, the final P2 still is in the game, the same player ID is retained, and each final state sees one remote. No hook task, Q3, Q4, leave/rejoin, train unlock/ride, Q6 or pier ending ran. There was no recovery teleport, staged save or debug skip in any continuous attempt.

**Split-plan departure:** station bills alternated, but P2 continued from F1 into F2 before releasing the forge-frame checkpoint. P1's later F2 phase consequently did no work. The final bot change bounds each call to its original bill specification; that last boundary correction has **not** had a continuous rerun. Do not claim the requested forge split was verified.

## Agreement and nobody stranded at the stop

Compared both complete `p1-last-state.json` and `p2-last-state.json` files after the reload timeout:

- Stations agree exactly: line 1 stage 3/open; line 2 stage 2/not open. T1 **24 logs**, T2 **32 logs / 8 stone**, T3 **40 logs / 1 beam**; Q1 **16 logs / 6 rails**, Q2 **24 logs / 12 rails**; Q3–Q6 empty.
- Rack agrees: on, approximately **(1021.14, 27.41)**, **16 logs / 0 rails**.
- Shared rewards agree: multi-axe, axe, pack, depot and double jump; no trains, hook, glider or gates. Score **$7,800 / 192 logs / 18 rails / 8 stone / 276 metres**.
- Both parked trains agree exactly: positions **207 / 524**, targets **1 / 2**, neither running. This is **not** the required moving-train agreement check.
- Both retain their checkpoint player IDs and see one remote. The bot's station contribution counters are positive: **84 / 76**; these are score deltas, not a complete material-conservation ledger.
- Both final avatars stand dry near Q2: P1 **(946.67, 18.61, 32.02)**, P2 **(947.71, 18.46, 30.00)**. Every telemetry segment reports **zero water falls**. Nobody is visibly stranded at this stop; nobody reached the pier. Personal cosmetics correctly differ. Both final `ended` and `atPier` are false.

Visual question: do both players remain dry with the same earned progress after the interruption? Opened `run/end-still.png` and `run/p2-end-still.png`: both are together beside the completed Q2 frame and track, both wear the pack, and both HUDs show 192 logs/$7,800. The prototype panel and bot text obscure part of P1's view; P2's view clearly shows both avatars. No claim about real-time feel, sound, mobile/device play, remote-network latency or human pacing.

## Fixes and validation

Separate local commits: **`01259888`** (game fix) and **`920747b8`** (bot corrections). Both name their DESIGN.md principle in the body.

- **Game: show the partner's earned pack chest.** `forgeBillFromPeer()` previously advanced the bill without creating the chest. It now grants the waiting pack unless it is already waiting or owned. Existing shared authority/message/persistence shapes stay unchanged; the added chest is local presentation of the accepted bill. No gameplay, pacing, bill, progression or copy change. Owning behavior is recorded in `docs/game-design/place.md`. DESIGN.md: **Cooperation is automatic, not negotiated**.
- **Bot: wait for landing and allow deliveries to settle.** A short walk can end mid-hop, making the next ground route incorrectly request recovery. Co-op walking now waits for a real dry landing. The bill loop now yields 100 game milliseconds between retries so network receipts/flight callbacks can execute, and fails explicitly on exhausted retries instead of printing false success. The furthest run completed T2 and continued through Q2 with these fixes. Its F1→F2 spill exposed the final original-bill guard described above. No fixture relocation or game movement changes. DESIGN.md: **Small and readable**.
- [Final pack-event capture](../../.look/evidence/1793818284255-73025/evidence.json): staged event-handler probe, **not route evidence**. One received bill creates one chest; repeating the bill does not duplicate it; receiving it after owning the pack does not respawn it. Opened `pack-bill-checked-still.png`: one iron-banded chest beside the forge receiver, partly crossed by scaffold rails. WebGPU, **60.7 completed frames/s** in the one-second health sample, no page/console/gfx errors. The live Q2 route also acquired the pack on both peers. The probe source is retained beside this evidence as `check-pack-chest.ts`.
- [Trusted world-inputs](../../.look/evidence/1793818144016-68740/evidence.json): all fixture assertions passed, WebGPU, zero graphics errors. It checks the core world inputs, not the Place route.
- Required `npx prettier --write` completed on all changed files, explicitly overriding the Markdown ignore for the two documents. Final `npm run check` passed: lint, TypeScript, **298/298 unit tests**, registry, level checks, assets and production build. Its log is retained beside the final pack manifest as `check.txt`. No new unit tests or scenarios; `check:full` is not triggered by these paths.

## Time warp and limits

The command used the existing broker, with `--players 2 --long --warp-speed 2 --query 'proto=place&shot=play'` for the furthest run. The first attempt requested 5x. The long-run limits remain **30 minutes work / 35 minutes broker / 36 minutes client**; none was reached. Navigation ran at 1x.

- **Furthest 2x segment:** server and both pages achieved **2.00x**, approximately **721.82 game seconds / 360.91 wall seconds**. Peak clock deficits: server **0.003 s**, P1 **52.541 s**, P2 **3.940 s**. Peak world-tick deficits: **30.648 / 3.781 game seconds**. Maximum read skew **15.341 wall seconds**, maximum sampled tick gap **20**; final sampled ticks **7278 / 7279**. Clocks caught up before reload, so the one-game-second final-deficit gate did not reject it, but the **DRIFT warning is material**. Requested or average 2x does not establish stable acceleration or real-time smoothness.
- **Initial 5x segment:** server/pages averaged 5.00x; P1's peak clock deficit was **236.054 game seconds**, world deficit **80.844 s**. Final ticks agreed at **6780**. Lowering to 2x reduced but did not remove long path-planning stalls. Other agents were also using local browser tooling during this session; no exclusive-machine performance claim.

## All continuous attempts, including failures

| Manifest                                                                      | Result                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [1793815961447-95903](../../.look/evidence/1793815961447-95903/evidence.json) | 5x, 143.586 wall s. Through checkpoint 7/F1, then `Missing earned pack chest`. Both shared states matched at that stop. Reproduced the game bug fixed above.                                                                     |
| [1793816184610-1408](../../.look/evidence/1793816184610-1408/evidence.json)   | 2x, 9.939 wall s. Before wake; P2 planned mid-hop and requested forbidden recovery. No first chop.                                                                                                                               |
| [1793816297227-3556](../../.look/evidence/1793816297227-3556/evidence.json)   | 2x, 9.141 wall s. Waiting only at startup did not fix the next-leg mid-hop failure. Replaced that attempt with the per-leg dry-landing wait.                                                                                     |
| [1793816379711-6780](../../.look/evidence/1793816379711-6780/evidence.json)   | 2x, 375.869 wall s. T1 complete; T2 at 31/32 logs and 8/8 stone on both peers. False bot “full,” then 600-game-second timeout/`NEVER: T2 completed`. Peak P2 clock deficit 3.812 s; final ticks equal at 7368.                   |
| [1793816825954-29483](../../.look/evidence/1793816825954-29483/evidence.json) | 181.404 wall s. Initial page already playing; hidden Jump in button caused the 180-second setup timeout. No peer-pair route and no end still produced.                                                                           |
| [1793817133703-41592](../../.look/evidence/1793817133703-41592/evidence.json) | 2x, 373.703 wall s. Speculative provisional-full wait still stopped at T2 31/32; same 600-second failure. Removed that change and made the retry loop yield. Peak P2 deficit 4.272 s; final ticks 7326 equal.                    |
| [1793817561909-59663](../../.look/evidence/1793817561909-59663/evidence.json) | 2x, 461.711 wall s. Through Q2; actual P2 reload restored the player/game, but coordinator timed out on hidden Jump in. F1/F2 split deviation disclosed above. No game page/console/gfx errors; failure is the harness selector. |

Opened both end PNGs from every attempt that produced them (six pairs). Also opened the [first pack probe](../../.look/evidence/1793817101921-40918/evidence.json)'s `pack-bill-still.png` and the [second](../../.look/evidence/1793818105013-68065/evidence.json)'s `pack-bill-final-still.png`; scaffold occlusion prompted the closer final framing. Reports' “never happened” lists include optional/post-ending beats as well as required future work; no generic report summary is treated as a pass.

## Ranked remaining risk for tonight

1. **High verification gap: no completed continuous replay.** The actual game reload returned correctly at Q2, but the trusted coordinator cannot proceed past the visible-button wait. It uses the caller's `boogle-daily` harness. Fix the readiness wait in `Game.open` and the reload/rejoin branch to allow an already-playing page, review it, and relaunch the broker; a worker-only edit does not upgrade that process. Then run through hook, Q3/Q4, the required leave/rejoin, trains, Q6 and the pier. This is a tooling blocker, not evidence that players cannot reload.
2. **High unknown for replay completion: late transport/cargo and final arrival.** No moving train, pier-kit delivery, late interruption or safe end arrival was exercised here. The earlier replay-readiness cargo-loss report is historical: this starting tree already contains `trainCargoV1`/`craneCargoV1`; this task neither reproduces that old defect nor certifies the newer restoration path. Do not carry the old report forward as an unfixed-current diagnosis without rerunning it.
3. **Medium evidence limitation: exact split plan and clock health.** The original-bill guard needs a full rerun after the broker fix. Large transient warp deficits also prevent performance/pacing claims; consider 1x for the final confirmation if the long-run budget permits. Both 2x T2 stalls were bot retry failures, not proven permanent game softlocks or lost resources.
4. **Lower direct replay impact: bot navigation and presentation evidence.** Dry-landing waits resolved the opening recovery failure. The prototype/bot overlays still obscure some captures; no copy was changed or new suspect dialogue identified. Actual devices, sound and subjective feel remain for the owner.

All implementation edits stayed in this worktree/branch. No source changed during a run. Manifests retain their tested trees; the final bill-boundary guard and documentation postdate the Q2 evidence. The final pack capture includes the final code; world-inputs includes the final game code and precedes the last bot-only guard adjustment. The guard's continuous behavior remains explicitly unverified. The first client used the shell's Node 24; subsequent clients/checks used installed Node 26.13.0. The already-running trusted broker uses its caller's Node 24. `npm run inflight` was skipped because it fetches origin. No nonlocal network, push, ship, direct Chromium or replacement harness. A read-only process inspection required sandbox escalation.

## Earlier tooling report (superseded execution boundary)

4 November 2026. Branch `codex/coop-route`. No push or ship. This does **not** close risk 2 in [replay readiness](replay-readiness.md).

### Changes

- `5d7ba4da`: bridge the disposable server clock through the broker and accept explicit long playthroughs. Ordinary requests still have a seven-minute broker limit; `--long` permits 30 minutes of playthrough work, 35 minutes in the broker and 36 minutes in the client. DESIGN.md: **Server hosts every room**.
- `b00dd42f`: add the two-peer branch of the existing playthrough, using the existing Game wrapper, Place bot, observers and co-op clock diagnostics. Alternate station bills, forge bills and ability tasks; require positive material contributions from both peers. Reload player 2 after Q2; navigate player 1 away for five seconds and back after Q4, retaining identity and the surviving room. This departure is not the menu Leave button. Check both dry arrivals at Far Head, stations, rack, shared rewards and trains (2 m position tolerance over three consecutive samples). Record personal cosmetics without requiring them to match. DESIGN.md: **Designed for drop-in, drop-out**.

The route uses no debug skips, staged saves or recovery teleports. Harness checkpoint bookkeeping lives in sessionStorage; the game restores itself. Each uninterrupted warped segment records independent clocks and world ticks; navigation runs at 1x. Reports, per-peer observers/checkpoints, telemetry sessions, state snapshots and end stills are retained on route failures. The full runner and its reload/rejoin handling have **not** been exercised by the current broker.

Command, also in [tools](../agents/tools.md):

```sh
node .look/see-client.ts playthrough --players 2 --long --warp-speed 5 --query 'proto=place&shot=play'
```

### Verified extent

The existing broker rejected that full command with `Unsupported playthrough argument: --players`, before browser execution. Its process runs `/Users/matiasfranco/Developer/boogle-daily/dev/codex/look-broker.ts`, not this worktree's edited harness. Its request rejection has no execution manifest; the original response is copied beside the final opening evidence as `full-request-rejected.json`.

The broker's supported `look --players 2 --real` exercised the new bot through its first barrier, using `place-job.ts` and `coopRoute=1`. It did not release the bot into T1 work.

- [Final opening manifest](../../.look/evidence/1793813386054-61544/evidence.json): both reached the wake checkpoint at **86.1 game seconds**, **87.66 seconds** measured at **1.00x**, final world ticks **926/926**, one remote on each page, machine idle, zero station logs. No `NEVER`, page, console or graphics errors. **No first chop was verified.**
- Opened `coop-opening-final-still.png` and `p2-coop-opening-final-still.png`: both avatars stand on dry ground beside the awake machine; both show the multi-axe reward. The prototype feedback panel obscures part of the scene. This answers the opening-arrival question, not continued work or subjective feel.
- [Initial opening manifest](../../.look/evidence/1793813166713-55941/evidence.json): opened both `coop-opening-still.png` and `p2-coop-opening-still.png`. Both avatars arrived dry, but the checkpoint fired while the machine was still waking. Tightened the new bot's checkpoint to wait for idle and the multi-axe, then repeated the capture above. Initial evidence predates that correction.
- [Trusted world-inputs manifest](../../.look/evidence/1793813492774-63568/evidence.json): passed all fixture assertions, WebGPU, zero graphics errors. It does not verify the Place route.
- Final `npx prettier --write` completed on all changed code and documentation. `npm run check` passed: lint, TypeScript, **298/298 tests**, registry, level checks, assets and production build. Check log copied beside final opening evidence as `check.txt`. No new tests or scenarios; no network/world/server changes requiring `check:full`.

### Ranked remaining work

1. **Execution blocker:** review/apply the two implementation commits to the caller's trusted harness, then relaunch/resume through its updated `run.ts` so both broker and copied client refresh. Worker-only edits cannot update a running broker. No alternate browser or replacement harness was launched.
2. **Unverified route:** run the command above. Alternate work after the opening, reload/rejoin, faster-than-real-time clock health, the pier and final agreement assertions remain unexecuted. The requested 5x is a cap, not a measured result. Lower it if clock diagnostics fail; `--real --long` retains an honest 1x option.
3. **Prior cargo risk:** replay-readiness risk 1 still requires its own conservation investigation. This task made no gameplay fixes and did not reproduce or resolve in-transit kit loss. The planned interruptions precede train unlock and therefore would not establish reload safety with a pier kit aboard.

No gameplay, pacing or copy changed. No nonlocal network access, push, ship or direct Chromium use. `npm run inflight` was intentionally omitted because it fetches origin. Only a read-only process inspection used sandbox escalation. The final documentation commit changes the tree after the accepted captures; their manifests identify the exact tested implementation tree.
