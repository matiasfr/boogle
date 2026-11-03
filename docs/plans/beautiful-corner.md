# Plan: a beautiful corner

> **Draft — owner approval required before implementation. Refreshed 3 November 2026.** A quality target, not approval to graduate Round 4 or add progression. Stop at the owner's playtest; graphics that leave its flow unchanged may proceed after this plan is approved.

## Goal and scope

Make one complete, freely playable construction job beautiful, then measure reuse at a second arrangement. Serve DESIGN.md **Toys before chores**, **Telegraph everything**, **Show, don't tell** and **Small and readable**. No principle bends.

**Recommend Round 4's first-path finale, line 1 Station 3:** approach/source, frame, great-beam delivery, machine, whole gorge crossing, landings and walk home/look-back. Preserve camera, controls, route, costs, speed and rewards. Station 2 now takes **32 logs + 8 stone**; Station 3 takes **40 logs + the great beam** and completes the trestle and run home. The old Station-2/24-log/54-m brief no longer describes this job. Confirm the target below, then bind its footprint to the current layout.

The [Round 4 record](../game-design/place.md#the-run) owns the baseline: satisfying manual work → walkable shortcut → tool/carry/depot relief → trains later. Materials and upgrades replace global eras; abilities replace curios. Preserve downstream forge, exploration, cargo and trains. The default entry already enables throwaway co-op; preserve it. This art target proves neither durable multiplayer nor production readiness. Those and prototype retirement remain separate work after Round 4.

## Settled direction and dependencies

The first [Shape of the game entries](../proposals/boogle-2.md#the-shape-of-the-game) and dated [Look calls](../proposals/boogle-2.md#look) supersede older research/plan prose.

- **Sea:** owner and Grant chose Ultra Water as the starting point, stylized alongside toon characters, retaining waves, shore response and below-water treatment. [Water graduation](water-graduation.md) owns replacing the real sea; no selective analytic corner sea. Its steps 1–3 are recorded complete, opt-in; steps 4–8 still await approval. This plan grants none of those approvals.
- **Sky:** demo sky with **AgX**, frozen late morning **`tod=0.24`**, baked once ahead of time. Rollout belongs with the real sea. Tune foliage, avatar and props under it. Neutral, the old sky and a running cycle are no longer open choices. Water-graduation's older “sky decision is open” wording predates this pick; its implementation gates still stand.
- **Terrain:** `&terrain=demo` remains a comparison. Its [report](../research/terrain-demo-validation.md#recommendation) recommends shore materials after an art pass, retaining authored inland colours and paths; that is not owner-approved adoption. Reuse the approved outcome when it lands. Keep cliff shape/collision work distinct from this shader comparison; do not duplicate shore/material ownership.
- **Craft:** retain [recommendations 3–12](../research/beautiful-corner-craft.md#numbered-recommendations-for-boogle): action/contact before detail, composition before kit finish, restrained feedback, one integrator and measured reuse. The old light/station specifics in recommendations 1–2 and local-only baseline are superseded above. Paintings remain references, not runtime evidence.

## Ordered work after approval

- [ ] **1. Baseline and truthful rough action.** Read the owner's Round 4 notes before changing choreography. Record build/settings, empty/partial/full/feed/lay/finished states and an ordinary uncut approach-to-walk-home run. Audit visible material travel and solid contacts, including the great beam; verify existing fixes before rebuilding them. Preserve state/authority and saves; cosmetics remain Local. Larger physics/sync defects need separate scope. **No sea/terrain landing required for this audit.**
- [ ] **2. Compose and fit the reusable kit.** Establish source → receiver → machine → destination sightlines, silhouettes, pivots, standing envelopes and matching collision. Reuse the existing kit/pipeline; record custom parts and rework. Rough composition can proceed independently; final bank surfaces/materials wait for step 3. No route/pacing redesign.
- [ ] **3. Integrate sea, terrain and light — dependency gate.** **Wait for the approved real-sea integration, demo-sky/AgX bake and terrain adoption outcome to land in the working build.** Comparison flags or completed water steps 1–3 alone do not clear this gate. Use their final shore/receiver data and material hooks, then finish ground, cliff, tree, avatar and machine palette/contact. Inspect banks, supports, undersides and moving-deck views; reject seams, floating contacts, lost paths or caustics through dry surfaces. **Owner review 1:** “Does this place belong together?”
- [ ] **4. Finish action, then restrained life.** Make visible feed/load/place/settle and procedural contact sound agree with actual contributions, without new verbs or changed costs. Check repetition and muted readability. Add breeze, steam or existing residents' reactions only where helpful; no mandatory effects catalogue or workforce. **Owner review 2:** “Does your work visibly become the crossing?”
- [ ] **5. Validate, reuse once and stop.** Exercise ordinary solo/existing co-op play, interruptions/return, water entry and downstream progression. Fit the kit to one temporary second arrangement; record marginal time, exceptions and rework, then return to the corner. **Owner review 3:** “Is this the quality we should reproduce elsewhere?” Stop at each review until notes arrive; completion requires accepted evidence and measured reuse.

## Evidence and limits

Codex implements and inspects through the existing broker: full place playthrough/report, named checkpoints, targeted actions, curves and consecutive video frames. Open PNGs against a stated visual question; iterate up to three rounds. Claude/owner judge real-time feel; frame inspection cannot prove smoothness. Retain manifests, build/settings, target dimensions, source rebuild results and production time. Future visible changes update owning game-design docs and run triggered checks; no new visual unit tests or harness.

**M1 Max is average; M4 iPad Pro is the floor.** Start with desktop high/mobile 0.6 world resolution and stored 4× MSAA. Target 60 Hz with measured headroom; baseline the integrated game before budgeting optional effects. [Water validation](../research/water-demo-validation.md#gpu-cost-follow-up--3-november-2026) did **not** reliably meet 8 ms high at 1920×1200. GPU spans are not summed overlapping timers or presentation latency; old mobile tables include cheaper diagnostic settings. Demo timings do not establish whole-game headroom, sustained iPad performance or underwater quality. Retire the old +2 ms water/life allowance pending this baseline.

Out of scope: new progression, eras, residents/story/copy, camera redesign, scene editor, second sea, multiplayer architecture or whole-world art rollout. Approval picks a bounded experiment, not a delivery date. This refresh changes documentation only.

## Owner questions

1. **Which complete job should be the target?** Recommend Station 3's first walkable crossing and great-beam delivery after Round 4 notes, replacing the obsolete Station 2 finale.
2. **Where should this pass stop?** Recommend one finished job plus one measured reuse fixture, with restrained existing life; defer a new cast, broad effects batch and further locations until acceptance.
