# Co-op route verification: seated route passed; standing cargo edge repaired

## Standing follow-up, 4 November: fixed an idle knock-off; jumps can still miss

Branch `codex/coop-standing-ride`, starting at `f87e0704`. Reproduced **one genuine no-input knock-off from a settled cargo crate**, repaired it in **`9927155c`**, then tested both lines with two standing peers at **1x**, on the same car and neighbouring cars. The four final 100-second cases have **zero uncommanded knock-offs for either player**. They also have **three missed jump landings for P2**. This is not a claim that jumping in place on a moving train always returns you to its deck, or that tonight's human replay is certified safe.

The existing seated continuous-route pass remains below. These new runs are **staged diagnoses**, not another fresh progression route. They do not establish the cause or exact count of the 3 November losses.

### Setup, inputs and counting

Used only the launcher's broker: `node .look/see-client.ts look --players 2 --real`, the existing `--eval` seam, curves and video. The diagnostic invokes the existing co-op train stage, then places each player once on a stopped train. After initial contact, there are **no position/velocity writes, recovery actions, Sit presses, train calls or train-speed changes from the diagnostic**. P1 stands; P2 uses ordinary movement input and jump press/release, walking short fore/aft paths inside the deck and pausing before jumping. The separate edge case holds both players motionless. Initial placement is not real-input boarding evidence. These are bot inputs through the game's controls, not physical gamepad/touch-device tests.

Same-car cases start both on car 1; neighbouring cases use cars 1 and 2, including the loaded rear car on line 1. Jumps can transfer between cars: that is recorded, not silently treated as continuous contact with the original car. Every final arrangement exercised departure, curves, bridge travel and a station arrival; line 2 traversed the sea trestle to Far Head. All reached the unchanged **20 m/s** train cruise. Repeated station stops and sampled train distances are retained in the results.

Each peer is observed for approximately **100.00 seconds**; captures continue to 105 seconds. Contact is checked every **25 ms**, with ordinary state samples every 250 ms and immediate logs on observed transitions. An off interval lasting more than two seconds is classified separately from short contact gaps. A loss immediately following a recorded jump is a **missed jump landing**, not an idle knock-off. The reproduced idle failure had reattached for almost three seconds after its last jump and had no movement input. No post-loss rescue extends ride exposure: a fallen player's remaining window is observation on the ground, not time aboard.

[Every observed contact loss, with player, time, world position, signed train speed, body speed and off duration](../../.look/evidence/1793827548915-69397/standing-events.md). [Machine-readable results](../../.look/evidence/1793827548915-69397/standing-results.json), [reproduction eval](../../.look/evidence/1793827548915-69397/standing.ts), [analysis](../../.look/evidence/1793827548915-69397/analyze.ts). Rates below use the explicitly measured observation window, not an inferred human riding-time denominator.

### Final measurements

All rows use the final game code from `9927155c`. The two early post-fix captures precede that commit but contain the same changed source; subsequent captures are clean commit `9927155c`, tree `41ad975599f827a80faa86d4cfa49b8e274ea20b`. The trusted harness was clean `f87e0704`. No source changed during any run. The documentation commit follows these measurements.

**P1: zero raw contact losses, zero knock-offs, zero jumps in every row.** P1's knock-off rate is **0.00/player-minute** over the four-case **400-second** matrix. P2's uncommanded knock-off rate is also **0.00/player-minute** over its 400-second observation window. Do not count time after a missed jump as successfully riding.

| Final case / manifest                                                                       | Seconds per peer | P2 raw losses (per minute) | P2 jump inputs | P2 uncommanded knock-offs | P2 missed jump landings |
| ------------------------------------------------------------------------------------------- | ---------------- | -------------------------- | -------------- | ------------------------- | ----------------------- |
| [Line 1, same car](../../.look/evidence/1793827371397-69234/evidence.json)                  | 100              | 4 (2.40)                   | 4              | 0                         | 1                       |
| [Line 1, neighbouring cars](../../.look/evidence/1793826790064-68671/evidence.json)         | 100              | 5 (3.00)                   | 4              | 0                         | 1                       |
| [Line 2, same car](../../.look/evidence/1793827548915-69397/evidence.json)                  | 100              | 11 (6.60)                  | 7              | 0                         | 0                       |
| [Line 2, neighbouring cars](../../.look/evidence/1793827143010-69089/evidence.json)         | 100              | 6 (3.60)                   | 6              | 0                         | 1                       |
| [Focused idle crate margin, line 1](../../.look/evidence/1793826983105-68888/evidence.json) | 100 additional   | 0 (0.00)                   | 0              | 0                         | 0                       |

P2's four-case total is **26 raw losses / 6.667 observation minutes = 3.90/minute**: 22 jump-related transitions (including recontact/bounce transitions) and four brief non-jump gaps, with **three** jump departures that did not return. No water samples were recorded in the final matrix. The earlier line-2 same-car jump miss did enter water; absence of final-run water is not a general dry-landing guarantee.

### Reproduced cause and repair

In the [pre-fix neighbouring-car run](../../.look/evidence/1793826350746-67670/evidence.json), P2 jumped at **78.001 s**, reattached at **78.529 s**, then stood without input. At **81.401 s**, it lost the rear car at **(975.134, 32.221, -111.178)**, train speed **20.000 m/s**, body speed **18.634 m/s**, car-local **(0.714, 1.371, -1.534)**. It landed beside the line at approximately **(976.638, 30.655, -123.588)**. This is **one real knock-off / 100 s = 0.60/minute for P2** (0.74/minute if censored at the 81.401-second terminal loss); P1 had zero. This is a current-build defect, not an attribution of the historical 19 marks.

The existing idle hold used the flatbed bounds. A crate's top ends inside those bounds, so the spherical player could creep across its rounded edge while still inside the flatbed guard. `rail.ts` now asks the car for the supporting cargo footprint; `train-load.ts` derives it from the same highest settled crate used for support height. The **existing** idle inset and correction speed apply to that footprint. Movement and jump inputs still release the hold. No train speed, pacing, copy, save, presence or lockstep state changed; this remains Owner player physics. The owning behavior is updated in [place](../game-design/place.md).

The focused post-fix case stages P2 at **local x=0.71, z=-1.50**, near the reproduced margin. The existing correction settles it to about **z=-1.29**, safely inside the crate top. It remains attached through loaded travel, unloading, return and loading again: **zero contact losses for both peers over 100 s each**. The walking/jumping rear-car repeat also has zero uncommanded losses, but its earlier missed jump limits its later ride coverage; the motionless edge case supplies the missing focused check.

### Missed jumps remain visible failures

These final departures follow intentional jump inputs with movement released; each remained off for the rest of its observation window. They are not removed from the report merely because capture health passed. Airborne carry retains momentum rather than following every train turn or acceleration; no speculative sticky-jump change is made.

| Final case           | Player / departure time | World position x, y, z    | Train speed | Body speed |
| -------------------- | ----------------------- | ------------------------- | ----------- | ---------- |
| Line 1, same car     | P2, 50.030 s            | 975.405, 31.686, -111.903 | 20.000 m/s  | 20.353 m/s |
| Line 1, neighbouring | P2, 50.051 s            | 975.172, 31.796, -107.362 | 20.000 m/s  | 20.420 m/s |
| Line 2, neighbouring | P2, 78.027 s            | 1078.346, 25.686, 37.617  | 20.000 m/s  | 21.153 m/s |

The ledger also retains the earlier missed jumps: line 1 near Camp at **(979.030, 31.686, -145.598), 14.607 m/s** and line 2 at **(980.761, 19.824, 30.586), 20 m/s**, followed by water. Thus the checked-in fix addresses standing on cargo, **not all ways to lose a train**.

### What the 3 November sessions actually count

Read both supplied JSONLs under `/Users/matiasfranco/Developer/boogle-daily/.look/playtest/`; [extracted events and input buckets](../../.look/evidence/1793827548915-69397/historical.json) are retained beside the current evidence. The named sessions contain **12 + 7 = 19 `off` marks**, but three of Matias's occur **before train unlock**. The marks report carrier contact, not confirmed accidental ejections.

| Session / player            | Unlock to last event       | All off marks | Post-unlock off marks | Post-unlock raw marks/minute | In a jump-input bucket |
| --------------------------- | -------------------------- | ------------- | --------------------- | ---------------------------- | ---------------------- |
| `mw1l43s5-eyp2cnmq`, Matias | 912.4–1139.9 s; 3.792 min  | 12            | 9                     | 2.37                         | 8 of 9                 |
| `mw1l0y9o-1aphq1mf`, Grant  | 1060.0–1283.2 s; 3.720 min | 7             | 7                     | 1.88                         | 3 of 7                 |

Inputs are aggregated into roughly five-second buckets; positions are coarse samples, and these off marks do not record train speed. Even a bucket without a jump cannot distinguish walking off, a brief contact bounce and an accidental knock-off. **A verified historical real-knock-off rate cannot be recovered from these JSONLs alone.** Comparing their raw 2.37/1.88 marks per minute directly with the new zero uncommanded rate would mix definitions. The final deliberate-jump P2 raw rate is 3.90/minute, despite zero uncommanded losses. Preserve the owners' qualitative complaint; do not relabel the 19 marks as 19 proven accidental ejections or claim a quantified reduction from that number.

### Cart, lag and visual evidence

The existing [cart trip](../../.look/evidence/1793827781245-71558/evidence.json) and [shorter visual repeat](../../.look/evidence/1793827930086-72376/evidence.json) use `place-coop.ts`, `pair=trip&tripVideo=1`, two peers and `--real`. P2 presses Whistle and Load, then is staged aboard; both record 12 rails delivered. P2 has **zero lost-contact samples out of 340 / 339**, at 20 ms intervals during the roughly 6.8-second measured loaded trips, with peak **13 m/s**. P1 watches rather than riding. The shorter repeat's maximum sampled cart disagreement is **0.248 m**. This does not test the instant of fitting a boiler while someone rides the cart. The proposed cart-to-train upgrade remains unchecked/unbuilt in `round-4-notes.md`; no combined transformation/transfer was exercised.

**Lagged-peer riding is untested.** The trusted broker has no per-peer latency or CPU-throttle option, and no replacement harness, direct Chromium or artificial busy-loop was introduced. Physical devices, human boarding, a fresh standing progression route, crowd sizes above two and real-time subjective smoothness remain unverified.

Visual questions: do standing riders remain on the sampled moving decks through curves/bridges/stops, does the idle crate-edge rider settle safely, and does the cart carry its rider through delivery? Opened **every successful train run's motion PNG**, plus:

- Exploratory line 1: `p2-standing-l1-same-still.png` (camera had stopped following; not rider proof).
- Pre-fix paired line 1: `standing-l1-paired-curves.png`, `jump-01..03.png` at video 78 s and `landing-01..03.png` at 79 s. Trees obscure part of the latter sequence; telemetry establishes the missed landing.
- Pre-fix neighbouring line 1: `p2-standing-l1-adjacent-still.png`, `edge-01..03.png` at 81 s. The rider is visibly at the cargo margin as the train curves; the terminal contact loss is in the log.
- Pre-fix line 2: `p2-standing-l2-same-still.png`; post-fix line 2: both `p2-fixed-l2-*-still.png` images. The final same-car image shows both players dry together aboard; the neighbouring end image shows only P1 aboard after P2's missed jump.
- Focused repair: `fixed-crate-edge-curves.png`, `edge-fixed-01..03.png` extracted at 10 s. The rider remains at the cargo edge across consecutive frames as scenery passes; the motion sheet shows continued travel and cargo changes. Curves are P1's motion, while the per-peer log supplies P2's attachment evidence.
- Both cart motion sheets and P2 end stills, the first cart curves, and the shorter repeat's `cart-01..03.png` at 5 s. The repeat clearly shows the standing rider and loaded cart moving toward the rack. The first long capture's post-delivery camera callbacks fight and show under-terrain views; its P1 curves describe the stationary observer, not cart speed. Those frames are not treated as rider-loss evidence.

All extracted sequences used `ffmpeg` on broker videos and were opened with `view_image`. Stills, curves and consecutive frames do **not** verify real-time feel. All completed captures report WebGPU, advancing completed frames and no page/console/graphics errors; that is capture health, not a whole-ride success verdict.

### Attempts, checks and scope

- `look --at list` initially found no saved checkpoints. No continuous playthrough was run for this diagnostic task.
- [Initial setup failure](../../.look/evidence/1793825845469-66777/evidence.json): waited for nonexistent `tr.running`; failed before riding. Corrected to the existing progression state.
- [Exploratory run](../../.look/evidence/1793825985707-67031/evidence.json): no sustained loss, but an early-ack barrier allowed P2 to start about 15 s before P1. Excluded from the paired final matrix; the barrier was corrected. Its P2 end camera also stopped early.
- [Paired pre-fix line 1](../../.look/evidence/1793826159472-67376/evidence.json), [rear-car reproduction](../../.look/evidence/1793826350746-67670/evidence.json), and [pre-fix line 2](../../.look/evidence/1793826528599-67881/evidence.json) all completed capture but retain the losses described above. No failed riding behavior was patched out of the measurement.
- Required Prettier and `npm run check` passed on Node 26; the golden physics replay matches all **1108 frames** within **0.01**. [Trusted `world-inputs`](../../.look/evidence/1793827897087-71989/evidence.json) passed every fixture assertion, with WebGPU and no graphics errors; it produced no PNG and does not itself test Place riding. No new unit tests or scenarios, no `check:full`-triggering source changes.
- Production changes are limited to `rail.ts`, `train-load.ts` and the owning game-design paragraph, committed as `9927155c`; this report is a separate documentation commit. DESIGN.md: **Cooperation is automatic, not negotiated** and **Slapstick over precision**. No copy was altered and no suspect copy lines were identified.
- **Departure from the brief:** `npm run inflight` was run at startup and fetched origin before its network behavior was noticed. That violated the local-only network restriction and was disclosed immediately. No further nonlocal network commands, push or ship were run. All edits stayed in this worktree on its branch; no source changed during a broker run.

## Earlier continuous seated-route pass

4 November 2026, `boogle-codex/coop-train-detach`, branch `codex/coop-train-detach`, starting at `eb06d7eb`. **Passed a fresh continuous two-player long route**, including P2 reload after Q2 and P1 leave/rejoin after Q4, through Q6 to both peers dry at Far Head. This supersedes the transport blocker below. The reproduced cause was the bot accepting momentary deck contact, then approaching Q6 from the village. No production game, pacing or copy change is retained. This does **not** explain away the owner's 19 historical knockoffs; standing, crowded-deck and human-input cases still need tonight's replay.

## Current evidence and exact boundary

[Passing manifest](../../.look/evidence/1793824428206-60849/evidence.json), [full report](../../.look/evidence/1793824428206-60849/run/report.txt), [checkpoints](../../.look/evidence/1793824428206-60849/run/checkpoints.json), [paired final state](../../.look/evidence/1793824428206-60849/run/final-state.json). Tested clean **`0e99f253`**, tree **`8d8c8dc6f61c2f984d5c310b94b7fe1338e33196`**; trusted launcher harness `eb06d7eb`. No source changed during execution. Documentation commits follow this tested code.

```sh
node .look/see-client.ts playthrough --players 2 --long --warp-speed 2 --query 'proto=place&shot=play'
```

**785.395 wall seconds; all 22 checkpoints released.** Both interruption entry paths said `already playing`, retained identities and restored one partner. Leave/rejoin means navigation away for five seconds, not the menu Leave button. No staged save, skip, relocation or recovery advanced this route. All four telemetry segments report zero water falls and no errors. Read the complete report, including each segment's missing beats; those lists reset on navigation and are not whole-route absence claims.

The passenger checks now observe each player, not just the train:

- P1 began at Quarry, sat at **350.2 s**, arrived **aboard and dry at Far Head at 396.3 s**, then disembarked before checkpoint 20 at **397.1 s**.
- P2 began at Camp, sat at **497.3 s**, arrived aboard line 1 at Village at **516.5 s**, walked to the line 2 platform, waited **81.7 s**, sat at **605.7 s**, and arrived aboard and dry at Far Head at **641.3 s**. Its checkpoint 20 was **642.1 s**.
- Q6's **32 logs / 32 rails** were carried from the train-supplied rack. P2's Q6 carry phase took **28.7 s**. Both ended at checkpoint 22, P1 **538.9 s**, P2 **715.4 s**. These are resumed per-page bot clocks, not a shared elapsed timeline.

Four `no way yet` planner warnings remain: one per peer near T2 and one per peer approaching the final platform. Each subsequently arrived; there were **zero `NEVER` failures, zero refused recoveries**, and no detachment during the monitored rides. Internal replanning and harvest retries are not individually counted, so this is not a retry-free navigation claim.

## Cause: contact was counted as a ride

The old solo and co-op routes used the same helper. It stopped steering at the first `carry.on === car.platform`, logged `aboard`, and later checked the train's stop. A brief brush at the platform edge satisfied it. Neither route pressed **Sit**. Solo's historical completion therefore did not prove that its boarding validation was sound; its later walking could conceal a missed ride. Co-op then tried the Far Head rack from the village.

There is no separate **Board** interaction in this build. Boarding is a jump onto the deck; **Sit** is the existing interaction once aboard. Real jump/Interact input in staged diagnoses retained a seated passenger solo and with a partner present. The final fresh route exercised both peers' real Sit presses and arrivals, at their actual stations. The helper now aims inside the deck, checks Sit/Stand up, monitors carrier contact throughout travel, requires the correct destination plus dry contact within 12 m of its platform, then stands and jumps onto the platform. The ride checkpoint cannot pass merely because an empty train arrived. Peers use different interior approach points.

Read the train/platform ride handling, place movement, co-op correction code, and the intended behavior in `docs/game-design/place.md`. No game detach after an actual Sit press was reproduced, so no speculative movement or synchronization patch is retained. The game's `ride`/`off` marks remain instantaneous carrier-contact observations, including the boarding jump; they are not trip-completion evidence. No new state owner, event delivery, lockstep math, wire shape or save field is introduced.

Q6 now uses the nearest station from the player's actual location, including the Camp→Village transfer. Its rail supply waits for the train's rack unloading; an empty rack no longer sends the bot walking back to the forge while the kit is arriving. Disembarkation uses the ordinary jump over the platform lip because the static ground planner excludes moving bodies. A settled-ground check now accepts small contact velocity while requiring actual ground contact and no swimming; the old exact nonpositive vertical velocity rejected dry landings.

## Water: the recovery action was never pressed

The old failed session's four `recovered` marks only meant `me.swimming` became false (`src/proto/playdata/record.ts`), not that **Back up the path** ran. Its trace shows that prompt, then the forbidden-recovery callback throwing; no recovery Interact followed. The bot left W held while failure capture continued, moving the avatar through repeated buoyancy transitions. This happened in the historical **1x** run, so acceleration is not required for that failure.

At the reported **(1200, -0.3, -55)**, a real recovery press in separate **1x solo and co-op diagnoses** placed the player at **(1204.626, 24.850, -47.914)**, dry and grounded for **15 seconds**. In the co-op diagnosis the partner stayed elsewhere. The final [recovery manifest](../../.look/evidence/1793824369221-60547/evidence.json) additionally invokes the bot's deliberate recovery refusal, verifies W/Shift were released, then presses the actual game prompt and samples the dry landing. That validates the bot cleanup and the unchanged game's recovery at the reported location; it is **diagnosis, never route evidence**.

Earlier diagnostics staged both peers at the exact same water coordinate and launched them into each other during recovery. They are confounded collision tests, not evidence that an isolated prompt fails. A trial landing-clearance patch did not resolve that setup and was reverted. No recovery teleport or automatic-rescue behavior was added to the game. Recovery with overlapping partners or arbitrary other shoreline geometry remains unverified.

## Partner banners were visible harness-induced disconnects

A read-only peer review correlated the previous 1x run's three extra left/returned pairs with P1 main-thread stalls of **11.946, 14.595 and 14.573 seconds** during synchronous path searches. The room's five-second timeout and the co-op banner's 1.5-second grace explain the visible departures. P2 recorded three displayed left banners (8.5 seconds total) and three returned banners (8 seconds total); these were real disconnects a player could see, induced by harness load, not duplicate report entries. The previous 2x run's five pairs are consistent with the same mechanism, but its individual stalls were not separately attributed.

Path planning now yields at entry and every 128 expansions; callers await it and release forward movement while planning. In the passing run **P2's pre-reload observer has zero partner-left/returned lines**. Later banners correspond to the requested interruptions. This removes the reproduced harness starvation; it is not a general network reliability or performance claim.

## Final agreement, cargo and visuals

The paired success gate passed three consecutive samples. Both peers agree exactly on line 1 **stage 3/open**, line 2 **stage 6/open**, every paid station bill, disabled/empty Far Head rack, and shared rungs, abilities, gates and score: **$14,480 / 280 logs / 102 rails / 8 stone / 896 metres**. Both see one remote, have distinct identities, positive contribution counters **160 / 161**, empty backs, `ended=true` and `atPier=true`. Contributions are shared-score deltas, not a material-conservation ledger. Personal cosmetics differ as intended.

Both final `CARGO` records match exactly: **eight ordinary wood crates on line 1, eight ordinary stone crates on line 2, `crane=false`, `kitSent=8`**. Their logs/rails fields are zero because these are ordinary cargo, not pier-kit fill crates. The complete kit is paid into Q6 and the rack is empty. Cargo snapshots are logged at each peer's finish, not captured atomically; no reload with cargo aboard was tested.

Both trains keep running with matching targets. The final paired state has line 1/2 position gaps **0.027 / 0.020 m**, within the existing **2 m** read/wire-skew tolerance. Do not compare the sequential end-still state files as simultaneous train poses. Across the final segment, sampled maxima were **4.932 / 7.680 m**, p95 **0.222 / 0.300 m**; the later convergence gate is the final agreement evidence. The 2x clock was not perfectly maintained: measured from each segment's first paired sample, peak page deficits were **6.059 / 0.556 s** before reload and **1.683 / 0.907 s** in the final segment. This is not a stable-acceleration or human pacing measurement.

Visual question: **do both passengers finish dry together at Far Head with matching progress?** Opened the passing run's `end-still.png` and `p2-end-still.png`: both avatars are together on the Far Head platform, visibly out of water, with matching **280 logs / $14,480** HUDs. Bot overlays and the platform roof/bench obscure some detail. Also opened both end images from each failed fresh run and the diagnostic images listed below.

Motion question: **does a seated passenger remain on the moving deck through departure?** The final [1x ride diagnosis](../../.look/evidence/1793825376861-61303/evidence.json) stages the station, then uses only jump/movement/Interact. It reached Far Head aboard/dry after **36.4 s**. Opened `ride-motion-final-still.png`, `ride-motion-final-curves.png` and three consecutive frames extracted at five seconds from `ride-motion-final-realtime.webm`: the avatar remains seated on the deck with Stand up visible as track lamps pass. Curves show acceleration to **20 m/s**, flat height near **25.4 m**, and no vertical departure. The initial camera-distance spike comes from releasing the capture camera. Still frames/curves do not establish real-time smoothness or feel; this staged capture is not fresh-route evidence.

## Attempts, including failures

Three fresh continuous executions in this worktree, **two failed and the third passed**. Reports were read in full; failed-run end images were opened.

| Manifest                                                                      | Result                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [1793822897975-46704](../../.look/evidence/1793822897975-46704/evidence.json) | `9da95b4d`, **688.692 wall s**, last released checkpoint **19/trains**. Both interruptions passed. P2 arrived aboard at Village but ground-based disembarkation failed; P1 was seated at Quarry. Zero water falls. |
| [1793824154230-59370](../../.look/evidence/1793824154230-59370/evidence.json) | `7af796d4`, **121.541 wall s**, last checkpoint **3/T2**. The strict landing guard falsely rejected dry contact before T3; neither interruption ran. Both images show dry players by the frame. Zero water falls.  |
| [1793824428206-60849](../../.look/evidence/1793824428206-60849/evidence.json) | Clean `0e99f253`, **785.395 wall s**, all **22** checkpoints, both interruptions and dry pier arrivals passed.                                                                                                     |

Staged diagnoses, **excluded from route evidence**:

- `1793822287344-35321`: solo real Sit reached Far Head. Opened image had the wrong distant camera, so it is not visual rider proof.
- `1793822411434-35988`: co-op P1 sat and arrived; P2 missed its jump. Both images opened; not two successful passengers.
- `1793822520798-36363` and `1793822719222-38447`: overlapping-player water setup failed, including the reverted clearance experiment. Both pairs of images opened; confounded as described above.
- `1793822578476-36876` and `1793822834924-42138`: isolated solo/co-op real recovery stayed dry 15 seconds; images opened.
- `1793823648517-55858`: solo arrival succeeded but disembarkation failed before capture; no successful image.
- `1793823741480-56532`: targeted solo reached Q6 after jump disembarkation, but the unloading race caused a long forge detour. Opened ending image; its celebration camera obscures the avatar. This prompted the rack-wait fix.
- `1793824369221-60547`: final refused-recovery input cleanup and real recovery passed; both images opened. The train occludes P1, so the 15 grounded/dry samples supply the landing evidence.
- `1793825376861-61303`: final solo moving-deck diagnosis and inspected video frames/curves above.

An initial `look --at list` found no saved run; listing succeeded once checkpoints existed. No alternate harness or direct Chromium was used. Diagnostic scripts are retained under `.look/diagnosis/`; their final versions are copied alongside the final relevant manifests.

## Changes, checks and handoff

Small commits: **`9da95b4d` Require dry passenger arrivals in route verification**, **`7af796d4` Disembark onto platforms and wait for the pier kit**, **`0e99f253` Accept settled landings and release failed bot input**. Each body names a DESIGN.md principle. Only `dev/look/bot.ts`, `dev/look/bots/place.ts` and this verification document changed. The applicable principles are **Small and readable**, **Cooperation is automatic, not negotiated**, and **Designed for drop-in, drop-out**. No player-facing behavior changed, so the owning game-design behavior remains unchanged.

Required Prettier and Node 26 `npm run check` passed: lint, TypeScript, **298/298 unit tests**, registry/level/assets checks and build. [Check log](../../.look/evidence/1793824428206-60849/check.txt). Existing broker [world-inputs scenario](../../.look/evidence/1793825359209-61188/evidence.json) passed with WebGPU and no graphics errors. It checks the trusted world-input contract, not train behavior. No new tests/scenarios or unrelated `check:full` run. The final ride capture also reports no page/console/graphics errors.

**Departure:** I mistakenly ran `npm run inflight` at the start; it fetched origin, contrary to the local-network-only brief. This was disclosed immediately. No further external network, push or ship occurred. Work stayed in this worktree on its branch; old evidence was read only. Source remained unchanged during every broker run.

Stop here for the owner's replay. Still unverified: the historical 19 knockoffs, standing/crowded-deck riding, full fresh solo replay on the final bot, cargo across an interruption, arbitrary recovery locations, human discovery/pacing, sound, mobile/device behavior, remote latency and real-time feel. The launcher creates its final `handoff.md`/`evidence.json` after this worker returns; the operation manifests above already exist.

## Previous attempt: Q5 complete; passengers failed to reach Far Head

4 November 2026, rerun in `boogle-codex/coop-route-full`, branch `codex/coop-route-full`, starting at **`3791b4f6`**, the locally available `origin/main` at launch. No remote fetch under the local-network-only brief. **Partial: no honest first-chop-to-pier completion.** The entry fix, original-bill guard, real reload and real leave/rejoin all worked. The final run completed Q5, opened both lines and unlocked trains, but neither passenger reached Far Head; Q6 stayed empty. Stop here for the larger transport/navigation investigation before claiming readiness for tonight.

## Current attempts and exact boundary

Read both new `report.txt` files in full, including all four telemetry segments per run, missing beats, stalls and errors; inspected both peers' bot logs, checkpoints, final states and clock samples. Historical evidence below remains historical, not additional executions in this worktree.

| Attempt                                                                                                                                  | Tested tree and result                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [2x manifest](../../.look/evidence/1793818754845-84452/evidence.json), [report](../../.look/evidence/1793818754845-84452/run/report.txt) | Clean `3791b4f6`, tree `693137ca7f153e2b30e953aa1d1bf824ca8802b5`. **463.931 wall seconds**, checkpoint **16/Q4** released at **441.766 s**. Both interruptions succeeded. P1 landed on the first hook slab and received its personal bucket reward; the bot tried the next hook while that reward blocked actions. `NEVER: a pull to t1: picked t1, nothing`, then a cascading t2 attempt out of range. No water falls.                                             |
| Rejected client invocation                                                                                                               | `--warp-speed 1` was rejected locally (`--warp-speed must be >1 and <=50`) before browser execution. No manifest or gameplay attempt. Corrected to documented `--real`.                                                                                                                                                                                                                                                                                              |
| [1x manifest](../../.look/evidence/1793819311072-92075/evidence.json), [report](../../.look/evidence/1793819311072-92075/run/report.txt) | Clean **`1f7b1079`**, tree `ca5eea6a2d5e3cf2d0524740ce9f8f31eadfe1f3`. **1522.741 wall seconds**. Last released checkpoint **20, “ride to Far Head,” at 1372.495 s**. This checkpoint is misleading: it observes the train stop, not passenger arrival. Last completed shared work is **Q5 plus train unlock**. Q6 begins, then P2 falls into water while trying to walk to the rack; the bot throws `Co-op route needed a recovery; no fixture relocation allowed`. |

Commands used the supplied broker throughout:

```sh
node .look/see-client.ts playthrough --players 2 --long --warp-speed 2 --query 'proto=place&shot=play'
node .look/see-client.ts playthrough --players 2 --long --real --query 'proto=place&shot=play'
```

No staged save, debug skip, manual relocation or bot recovery was used to advance either route. No source changed during either run. The second manifest identifies the unchanged trusted harness at `3791b4f6` and the tested worktree at `1f7b1079`: the browser imports the changed bot from this worktree. The 30-minute work limit was not reached. The final documentation commit postdates this evidence; game and bot code do not.

## What is now verified

- **Real work by P1 on F2, twice.** P2 completes only F1, then releases the forge-frame checkpoint. After P1 collects the pack, P1 harvests trees 232, 132, 209 and 286 and completes F2 in **35.2 / 36.3 game seconds** (2x / 1x runs). Both peers' checkpoint score rises by **32 logs** between pack and forge-lit: **120→152** in the first run and **119→151** in the second. Score deltas are not a complete conservation ledger, but the separate work, bill boundary and resulting forge are observed.
- **Reload and leave/rejoin, twice.** P2 reloads after Q2; P1 navigates to `about:blank` for five seconds after Q4 and returns. Both entry paths report `already playing`, retain player identities, and restore one remote. Leave/rejoin is page navigation, not the menu Leave button.
- **Tower on the final bot.** P1 performs seven hook pulls, dismisses the slab reward, reaches the summit, gains glide and opens the sea gate. Its glide descends **77 m in 24.1 s**, ending **2 m** from the target. These are bot observations, not a real-time feel verdict. Both peers complete Q5 and unlock trains.
- **Kit transport to the rack.** Both final states report the Far Head rack at **(1364.323, -173.530)** with **32 logs / 32 rails**, while Q6 has **0 logs / 0 rails** and both player backs are empty. Both retained pre-arrival saves show **kitSent=8** and eight `fill` crates carrying **4 logs / 4 rails each** on line 2. Thus the finite kit's full contents reached the rack; no missing pier-kit quantity is observed. The saved cargo slices are from different earlier beats, not a simultaneous final cargo comparison. Final ordinary timber/stone train loads and crane ownership are **not fully audited**, and interruptions occurred before cargo transport.

## Passenger failure and agreement at the stop

The final bot logged both players aboard after their first boarding attempt. The raw telemetry is stronger evidence than that label:

- P1 session `mw2i9djg-3y90hw9r.jsonl`: `ride` at **397.2 s**, `off` at **397.3 s**, then remains near **(932, 19, 22)** while the train travels.
- P2 session `mw2i5po9-ozxndq8q.jsonl`: `ride` at **568.1 s**, `off` at **568.2 s**, also remains at the village. P2 starts walking toward Q6 after the train reaches its stop, instead of arriving on it.
- P2's bot records one water entry at **(1196.78, -0.91, -52.20)** at **753.0 s** on its resumed bot clock, then refuses its recovery callback. During failure capture the game itself records **four water entries and four `recovered` marks** between **754.9–757.4 page seconds**. Do not collapse those to “one fall” or claim the game recovered safely: the final P2 image is still in water.

Both complete final state files agree exactly on stations, rack and shared rewards: line 1 **stage 3/open**, line 2 **stage 5/open**, Q1–Q5 paid, Q6 empty; axe, multi-axe, pack, depot and trains; jump, hook, glide, quarry and sea gates; **$12,205 / 247 logs / 70 rails / 8 stone / 700 metres**. Both see one remote and retain distinct IDs. Station contribution counters are **157 / 103**, positive but based on shared score deltas, not a per-player material ledger. Personal cosmetics differ as intended.

Both trains are running. Use [paired samples](../../.look/evidence/1793819311072-92075/run/warp-2.json), not the sequential `p1-last-state.json` / `p2-last-state.json` train positions: those end captures are separated by rendering and health checks. The final three paired samples have identical targets and position gaps under **0.01 m** on both lines, at equal world ticks **15168, 15178, 15185**. Across the whole final segment, raw sampled maxima were **7.002 m / 1.334 m** (including read/network skew); p95 **0.016 m / 0.062 m**. This establishes convergence at the stop, not the unexecuted post-pier success gate.

**Nobody-stranded condition fails.** P1 ends dry at the village **(932.25, 18.67, 22.48)**; P2 ends in the sea **(1200.41, -0.31, -54.76)**. Both `ended` and `atPier` are false. Neither was carrying materials at the stop, but the full route and safe final arrival are not verified.

## Visual inspection and honest retries

Visual question: **do both players finish dry at Far Head with matching earned progress?** Opened `run/end-still.png` and `run/p2-end-still.png` from **both** new manifests (four PNGs total). First pair: P1 is on the hook slab holding up a bucket reward; P2 stands dry beside Q4, and both HUDs show **224 logs / $10,400**. Final pair: P1 is beside the village track; P2 is visibly in water below the trestle; both HUDs show **247 logs / $12,205**. The answer is **no**. Prototype/bot overlays obscure part of each view, but these locations and HUDs are visible. No extra staged captures are counted as route evidence.

Two actual runs, **both failed**, and **one full fresh rerun** after the small bot fix. One separate rejected CLI invocation. Internal behavior is not described as zero retries:

- First run: **2** `no way yet` warnings, **2** failed hook attempts (t1 and the subsequent t2 cascade), and **7** repeated tree selections within a bill (P1 **3**, P2 **4**).
- Final run: **3** `no way yet` warnings (including the failed Q6 approach), **0** `NEVER` hook misses, **7** repeated tree selections (P1 **3**, P2 **4**), **1** refused bot recovery request, and the **4** game water/recovery marks above. Eight double-jump gaps each logged one successful landing; both train boards had one logged attempt and then detached, with **no reboarding attempt**.
- Repeated tree selections can be extra harvest trips, not necessarily failures. The bill loop and path planner also retry internally without logging each iteration, so an exact internal retry total cannot be recovered. These runs are not evidence of retry-free navigation.

Both runs used WebGPU and reported no graphics errors. The first run had no game page/console errors beyond the failed-beat harness result. The final run's console/page-evaluation error is the explicit forbidden-recovery failure; it is not a clean command pass. All reports' “never happened” lists were read per telemetry segment; earlier segments naturally omit later events.

## Small fix and checks

**`1f7b1079` — Wait for rewards before the next bot hook.** `dev/look/bots/place.ts` now waits up to eight game seconds for the existing reward dismissal before aiming, and immediately fails a rejected co-op hook instead of continuing to another target. The first slab's new personal reward sets `inputState.held`; `fireHook` rejects held actions even when its geometry diagnostic says “nothing.” A focused read-only agent review found no blocking issue. The fresh continuous 1x run verifies the repaired tower sequence. No gameplay, pacing, copy, registrations, state ownership, wire shape or save contract changed; no game-design behavior change to document.

Required `npx prettier --write` completed on both changed files (explicit Markdown ignore override), and final Node 26 `npm run check` passed: lint, TypeScript, **298/298 unit tests**, registry, level checks, assets and production build. [Final check log](../../.look/evidence/1793819311072-92075/check.txt). No new unit tests or scenarios; no `check:full` trigger. No unrelated GPU scenario was substituted for route evidence.

## Ranked remaining work for tonight

1. **High: passenger transport and truthful arrival validation.** Both players detached immediately after boarding; identify whether boarding placement/input or moving-platform behavior causes it. The harness must require each passenger's actual dry arrival before releasing the ride checkpoint. Do not treat `train.stop===2` as a successful ride. This needs focused transport evidence and a fresh continuous rerun; it is beyond the verified small reward-wait fix.
2. **High: Q6 approach and safe recovery.** P2's planner attempted the distant rack from the village, went down the shore into water and triggered repeated game recovery marks. Fix/validate the route from the actual player position, then finish Q6 and both dry pier arrivals without debug recovery. No pacing or copy change is implied.
3. **Medium: complete cargo/end-state evidence.** The complete finite kit is present on both racks, but final ordinary cargo/crane agreement and reload with cargo aboard remain unverified. Finish the route and compare all cargo ownership alongside final stations, rack, moving trains and rewards.
4. **Evidence limits: transient departures and clocks.** At 2x, opening peak page deficits were **49.416 / 4.072 game seconds**, and P2's observer recorded **five** extra partner-left/returned pairs before the intentional reload. At 1x, page-clock deficits were zero, but opening world deficits were **14.573 / 1.761 s** and P2 recorded **three** extra partner-left/returned pairs before reload. Final-segment world deficits were **1.712 / 1.320 s**; clocks/ticks caught up at each boundary. No exclusive-machine performance, stable acceleration, human pacing, sound, mobile/device, remote-latency or real-time smoothness claim.

All work stayed on this worktree's branch. Clients used Node **26.13.0**; the first check used shell Node **24.11.1**, and the final required check uses Node 26. No external network, push, ship, direct Chromium, replacement harness or source edits during runs. `npm run inflight` was omitted because it fetches origin. The launcher supplies its own `handoff.md` / `evidence.json` after this worker returns; the linked operation manifests above already exist.

## Previous attempt: Q2; reload coordinator blocked (superseded)

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
