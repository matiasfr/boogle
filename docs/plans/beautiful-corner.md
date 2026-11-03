# Plan: a beautiful corner

> **Approved by the owner, 3 November 2026.** Both recommendations accepted: Station 3's first walkable crossing and great-beam delivery; one finished job plus one measured reuse, then stop. This work is limited to steps 1–2. Round 4 notes do not exist yet: the owner plays tonight. Step 1 is baseline and audit only; every player-visible change goes behind new `&corner=1`, leaving the default round unchanged. List real contact/material-travel bugs with evidence rather than fixing them, except tiny fixes invisible to pacing. No approval to graduate Round 4 or add progression.

## Goal and scope

Make one complete, freely playable construction job beautiful, then measure reuse at a second arrangement. Serve DESIGN.md **Toys before chores**, **Telegraph everything**, **Show, don't tell** and **Small and readable**. No principle bends.

**Approved target: Round 4's first-path finale, line 1 Station 3:** approach/source, frame, great-beam delivery, machine, whole gorge crossing, landings and walk home/look-back. Preserve camera, controls, route, costs, speed and rewards. Station 2 now takes **32 logs + 8 stone**; Station 3 takes **40 logs + the great beam** and completes the trestle and run home. The old Station-2/24-log/54-m brief no longer describes this job. The measured footprint is recorded below.

The [Round 4 record](../game-design/place.md#the-run) owns the baseline: satisfying manual work → walkable shortcut → tool/carry/depot relief → trains later. Materials and upgrades replace global eras; abilities replace curios. Preserve downstream forge, exploration, cargo and trains. The default entry already enables throwaway co-op; preserve it. This art target proves neither durable multiplayer nor production readiness. Those and prototype retirement remain separate work after Round 4.

## Settled direction and dependencies

The first [Shape of the game entries](../proposals/boogle-2.md#the-shape-of-the-game) and dated [Look calls](../proposals/boogle-2.md#look) supersede older research/plan prose.

- **Sea:** owner and Grant chose Ultra Water as the starting point, stylized alongside toon characters, retaining waves, shore response and below-water treatment. [Water graduation](water-graduation.md) owns replacing the real sea; no selective analytic corner sea. Its steps 1–3 are recorded complete, opt-in; steps 4–8 still await approval. This plan grants none of those approvals.
- **Sky:** demo sky with **AgX**, frozen late morning **`tod=0.24`**, baked once ahead of time. Rollout belongs with the real sea. Tune foliage, avatar and props under it. Neutral, the old sky and a running cycle are no longer open choices. Water-graduation's older “sky decision is open” wording predates this pick; its implementation gates still stand.
- **Terrain:** `&terrain=demo` remains a comparison. Its [report](../research/terrain-demo-validation.md#recommendation) recommends shore materials after an art pass, retaining authored inland colours and paths; that is not owner-approved adoption. Reuse the approved outcome when it lands. Keep cliff shape/collision work distinct from this shader comparison; do not duplicate shore/material ownership.
- **Craft:** retain [recommendations 3–12](../research/beautiful-corner-craft.md#numbered-recommendations-for-boogle): action/contact before detail, composition before kit finish, restrained feedback, one integrator and measured reuse. The old light/station specifics in recommendations 1–2 and local-only baseline are superseded above. Paintings remain references, not runtime evidence.

## Ordered work after approval

- [x] **1. Baseline and truthful rough action — baseline/audit only, 3 November.** Read the owner's Round 4 notes before changing choreography; those notes await tonight's playtest. Record build/settings, empty/partial/full/feed/lay/finished states and an ordinary uncut approach-to-walk-home run. Audit visible material travel and solid contacts, including the great beam; verify existing fixes before rebuilding them. Preserve state/authority and saves; cosmetics remain Local. Larger physics/sync defects need separate scope. **No sea/terrain landing required for this audit.** Findings below are not fixes or accepted polish.
- [ ] **2. Compose and fit the reusable kit.** Establish source → receiver → machine → destination sightlines, silhouettes, pivots, standing envelopes and matching collision. Reuse the existing kit/pipeline; record custom parts and rework. Rough composition can proceed independently; final bank surfaces/materials wait for step 3. No route/pacing redesign.
- [ ] **3. Integrate sea, terrain and light — dependency gate.** **Wait for the approved real-sea integration, demo-sky/AgX bake and terrain adoption outcome to land in the working build.** Comparison flags or completed water steps 1–3 alone do not clear this gate. Use their final shore/receiver data and material hooks, then finish ground, cliff, tree, avatar and machine palette/contact. Inspect banks, supports, undersides and moving-deck views; reject seams, floating contacts, lost paths or caustics through dry surfaces. **Owner review 1:** “Does this place belong together?”
- [ ] **4. Finish action, then restrained life.** Make visible feed/load/place/settle and procedural contact sound agree with actual contributions, without new verbs or changed costs. Check repetition and muted readability. Add breeze, steam or existing residents' reactions only where helpful; no mandatory effects catalogue or workforce. **Owner review 2:** “Does your work visibly become the crossing?”
- [ ] **5. Validate, reuse once and stop.** Exercise ordinary solo/existing co-op play, interruptions/return, water entry and downstream progression. Fit the kit to one temporary second arrangement; record marginal time, exceptions and rework, then return to the corner. **Owner review 3:** “Is this the quality we should reproduce elsewhere?” Stop at each review until notes arrive; completion requires accepted evidence and measured reuse.

## Evidence and limits

Codex implements and inspects through the existing broker: full place playthrough/report, named checkpoints, targeted actions, curves and consecutive video frames. Open PNGs against a stated visual question; iterate up to three rounds. Claude/owner judge real-time feel; frame inspection cannot prove smoothness. Retain manifests, build/settings, target dimensions, source rebuild results and production time. Future visible changes update owning game-design docs and run triggered checks; no new visual unit tests or harness.

**M1 Max is average; M4 iPad Pro is the floor.** Start with desktop high/mobile 0.6 world resolution and stored 4× MSAA. Target 60 Hz with measured headroom; baseline the integrated game before budgeting optional effects. [Water validation](../research/water-demo-validation.md#gpu-cost-follow-up--3-november-2026) did **not** reliably meet 8 ms high at 1920×1200. GPU spans are not summed overlapping timers or presentation latency; old mobile tables include cheaper diagnostic settings. Demo timings do not establish whole-game headroom, sustained iPad performance or underwater quality. Retire the old +2 ms water/life allowance pending this baseline.

Out of scope: new progression, eras, residents/story/copy, camera redesign, scene editor, second sea, multiplayer architecture or whole-world art rollout. Approval picks a bounded experiment, not a delivery date.

## Step 1 record — 3 November 2026

Baseline build `3e1a3034e80ce0a3708679110b84e33494151323`, tree `03846684589c873e0b35315005109a058d55e83b`. Broker WebGPU captures, 1180×820, fixed DPR, current `look=all`, existing sea/sky/Neutral, no terrain comparison. Static audit fixtures freeze the existing day at `u=0.26`; the first empty approach uses the existing `shot=opening` setup. These are desktop evidence, not the future demo-sky/AgX look or an iPad/headroom measurement. Exact command arguments and dirty/source fingerprints live in each manifest.

**Footprint:** frame world `(975.426, 30.369, -89.320)`, yaw `2.85538`; great tree `(1004, 29.763, -86)`; line chainage **116 → 30 = 86 m**, at unchanged 5 m/s. Village landing `(937.740, 18.3, -10.587)`. Receiver **2 × 2.6 m**, feeder **3.2 × 0.9 m**, frame offset **5.4 m** from track. Empty-frame solid envelope **2.2 × 2.8 m**, top **0.56 m**, separate posts to **1.52 m**; walkable trestle deck **3.6 m** wide. Preserve the source's 29 m approach, machine standing/boarding envelope and both landings. The footprint view includes the gorge and return rather than just the receiver.

All paths below are relative to the repository; `.look/` is deliberately local/ignored and the launcher copies its evidence into the handoff.

| Evidence | Capture / manifest directory under `.look/evidence/` | Observation |
| --- | --- | --- |
| Full baseline bot | `1793736149748-30231/evidence.json`, `run/report.txt`, `run/saves/` | Finished: zero `NEVER:` lines, zero errors; 33 min game / 125 s wall. Great beam shouldered 5:33, T3 lays 5:42, path opens 5:59. Solo run does not mark “did something together”. |
| Empty approach, before | `1793736267951-32455/corner-before-approach-still.png` | Receiver and red machine separate; feeder is a thin dark strip. Source is to the right, outside this approach framing; destination is beyond the machine. |
| Partial, 20 logs | `1793736397330-35191/corner-baseline-partial-still.png` | Stack reads above the frame; feeder remains exposed. |
| Full, 40 logs + beam | `1793736409984-35314/corner-baseline-full-still.png` | Beam end intersects the upper pile. Deliberately held audit state, normally very brief before automatic feed. |
| Feed and start of lay | `1793736411162-35319/corner-baseline-feed-motion.png`, `corner-baseline-feed-realtime.webm`, curves PNG/CSV | Stack drains into arcing/tumbling pieces; machine departs after about 3.6 s. The rollers are not the visible travel path. |
| Finished, same approach | `1793736412307-35334/corner-baseline-finished-still.png` | Empty frame and lit path remain; machine has gone home. |
| Uncut ordinary delivery → walk home | `1793736413541-35418/corner-baseline-walk-realtime.webm`, motion/curves PNG/CSV | Restored the bot's real “great beam shouldered” save, then normal inputs only, no delivery/path skips or recovery teleports. Arrived at the home landing in **42.2 s**; no `NEVER:` lines. 85 s recording includes the quiet end/look-back. |
| Whole footprint | `1793736494258-37239/corner-baseline-footprint-still.png` | Source ridge, crossing and both landings in one inspection view. |

Each directory has `evidence.json` and `output.txt`; all listed stills, motion sheets and walk curves were opened. Consecutive video frames extracted with ffmpeg and opened: `.look/corner-baseline-feed-consecutive.png` (six frames from 0.5 s) and `.look/corner-baseline-walk-consecutive.png` (six from 30 s). Real-time feel/smoothness, sound, touch, iPad performance and two-player agreement remain unverified. Staged empty/full captures retain unopened earlier reward boxes; they are not ordinary-play clutter evidence. `dev/look/evals/place-corner.ts` is an eval for the existing harness, not a new harness or scenario.

### Audit list — retained, not fixed

1. **Great-beam identity changes:** 10.5 m felled → 5.4 m shoulder → 2.48 m flight → 5.6 m resting. Source: `chop.ts` trunk/shoulder geometry, `stations.ts` `flyToStock` and beam mesh, `pieces.ts` `size` × `PIECE.len`. The deposit flight ends and feed begins at `st.at` (+0.12 m), versus the resting beam centre (+1.7 m): **1.58 m jump**. Source-confirmed; sparse pictures cannot measure the entire transient.
2. **Great-beam solid contact missing:** `stations.ts` creates collision for log rows only, not the deposited beam/overhangs. Its centre at +1.7 m also intersects the full pile (top +2.5752 m), confirmed in the held full-state still. Needs a coordinated beam/support/action pass after notes, not a silent collider change tonight.
3. **Normal logs grow during delivery:** `flyToStock` requests `size: [1, 2.2]`, interpolated by `updatePieces`. Existing discrepancy against “nothing scales”; left alone.
4. **Feed bypasses rollers:** `run.ts` `stepFeed` aims the arc directly at `machine.worldCradle`; the per-frame aim replaces `feederEnd`. Visible in the feed sheet and consecutive frames. Do not mistake the rough kit fit for a choreography repair.

Existing fixes retained: the low empty frame and four separate post colliders; pile collision derived from the same row spacing, removed when empty; machine-deck inward idle correction that still lets movement/jumping leave. Normal delivery and the crossing-home walk succeed. No larger physics, state, saves or co-op changes were attempted. No suspect Boogler copy was changed or identified by this audit.
