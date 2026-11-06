# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision index](../proposals/boogle-2.md#current-decision-index).

**Updated:** 5 November 2026, night, by the Claude orchestrator session (it also took over the closed axe session's work). Public copy: https://boogle.club/development/ The owner sees the same status on the [Line Map board](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

## Links

- [Owner calls](owner-calls.md), [decision index](../proposals/boogle-2.md#current-decision-index), [direction](../direction.md)
- [Production core](../plans/production-core.md), [slice 3 plan](../research/slice3-plan-2.md), [room-owned time plan](../research/room-time-plan-2.md)
- [Round 4 tracker](../plans/round-4-notes.md), [playtests](../playtests.md), [replay guide](https://claude.ai/artifact/TAb4PhNz2E9g1DiZD5bHoF)
- Briefs:
  - proposed: [money](../brainstorms/money.md), [cart first](../brainstorms/cart-first.md), [first evening](../brainstorms/first-evening.md);
  - approved: [recovery rack](../brainstorms/recovery-rack.md), [signposts](../brainstorms/signposts.md);
  - building: [tunables](../brainstorms/tunables.md), [cart whistle](../brainstorms/cart-whistle.md).

## Running

Each job's branch is `codex/<topic>`, its worktree is `../boogle-codex/<topic>`, and its reports are in `boogle-daily/.look/codex/<topic>/` (the inherited `glb-delivery-audit` reports in `boogle/.look/codex/`).

| Job | Status | Blocker or next step |
| --- | --- | --- |
| `slice2-supply` | Reviewed (recovery-budget P2 fixed), net proof fixed (tests now retry on `busy` like the real client), rebased over the look-dev tool. Squashed; history on `codex/slice2-supply-history` | Shipping; confirm it lands |
| `track-layer-machine` | Whole-panel commits (track, colliders and stock in one event), closure panels at stations, rigid hoist, instanced magazine: 13,550 triangles at 12 panels, 37 draws | Independent review `track-panels-review` running; merge if clean |
| `terrain-pilot` | Cove behind `?terrain=cove`: slide fixed, banded cliff. Round 3 queued (brief in the coordinator's scratchpad, recorded below): Odyssey base, tunable procedural Sunshine strata, Ultra Water demo sand bands | Wedge board and real-time sand clip, then owner verdict |
| `glb-delivery-audit` | Inherited from the axe session: two owner-approved service-worker fixes (don't cache HTML/navigation; copy older cache hits forward with waitUntil) | Owner said ship when it lands, after coordinator review |

## Merge queue

1. `slice2-supply` (shipping).
2. `glb-delivery-audit`, when it lands.
3. `track-layer-machine`, after a clean review.
4. `terrain-pilot`, after the owner's verdict on round 3.

Hold everything while the owner plays. `ship-branch` now reruns cancelled CI runs itself (twice at most); a branch containing a merge commit must be squashed onto main first, or the rebase replays old conflicts.

## Merged today

Fixes and features:

- the co-op seat and rider fixes;
- GPU recovery;
- water and sky speed;
- the evening look, behind a flag;
- the boiler, saddle and cart art pass;
- deck sitting;
- the tunables first proof (reload old tabs).

Docs and pages:

- the recovery rack asset;
- the orchestrate skill;
- the public status page;
- the slice 3 and room-time plans;
- the tuning and destinations research;
- the money, cart first, recovery rack, first evening and tunables briefs.

## Queued

- **Deeper simplify batch:** 11 items from the first `/simplify` pass (targeted host messages, one compatibility fingerprint, seat deck velocity, one remote rider blend, feel spring capture, pigment applied once, frozen-sky looks table, one tuning gate, hash reuse, `dev/economy` campaign kit, small reuse). Brief in the coordinator's scratchpad (`simplify-deep.txt`). Start after slice 2 lands; it touches `chop.ts` after the axe glint.
- **Particles:** distinct wood chips and dust, then shapes, rotation and curves in `src/render/particle-pool.ts`. Libraries stay references only.
- **Q6 co-op grounding:** P2 landing beside Q6 failed once on slice 2 and once on the track layer, with no branch cause. Investigate on main on a quiet machine.
- **Full visual-pipeline pass:** after the look-dev loop (merged: 3×3 key/fill wedge in about a second warm), in the research's order: calibration, materials, lighting and sky, shadows, water, post and grade.
- **Slice 3:** starts after slice 2 merges, and stops at the owner's first-path verdict.
- **Room-owned time:** after T1; the evening look is on main behind `?evening=1`.
- **Ground-contact root cause:** near T3; needs a quiet machine.
- **Quiet-machine timing reruns:** the 5.4% render cost and the 568-draw peak.
- **Framework and tool upgrades:** last, because they touch everything.
- **Replay guide refresh:** for today's merges, before the replay.
- **Brainstorm panels:** gate puzzles, telescope build-out, jump upgrades.
- **Native GIF test:** the owner runs `.look/motion-gif/CODEX-PROMPT.md` in the Codex app; results arrive in `.look/motion-gif/STATUS.md`.

## Open owner questions

1. **Colour defaults:** merge before or after the replay? Recommended: after.
2. **Brief questions** in money, cart first and first evening.
3. **Suspect copy:**
   - `SHOP.kept[0]` says "the hat" for any item;
   - "Chops trees, breaks rocks, and more" appears before rocks exist in T1.
4. **Museum:** inspect the miniature, the crystal specimen, or both. **Worktree cleanup:** about 280 old worktrees.

## Next moves

- Merge each branch as it passes, in queue order.
- Write the destinations brief when its panel finishes.
- Start slice 3 after slice 2.
- Refresh the replay guide before the replay.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage.
