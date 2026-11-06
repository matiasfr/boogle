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
| `track-layer-machine` | Whole panels, rigid hoist, magazine, two deck seats; review P2 (old room leads discarding deck-seat requests) fixed with `WORLD_NS` v08; stacks lowered. 14,270 triangles, 37 draws | Rebasing over slice 2 (conflicts in `look-kit.ts`, `rail.ts`); ship when clean |
| `slice3-path` | Two groundwork commits (recovery, line-one catalogs). Coordinator calls: clean break with a `WORLD_NS` bump; counted stone renewal on a slow tunable timer; build on main's track, then rebase to whole panels | Building T2, T3, beam and walk home; stops at the owner's first-path verdict |
| `terrain-pilot` | Round 3: Odyssey base, tunable Sunshine strata, Ultra Water demo sand bands. Owner flagged the facet jutting over the beach at the cliff toe (`boogle-daily/.look/codex/round1/owner-cove-facet.png`) | Check that spot (before/after from the same angle), wedge board and sand clip, then owner verdict |
| `simplify-deep` | 11 deeper cleanups, one commit each | Review, then ship |
| `audio-mix` | Research: character footsteps, jump and land; audit and loudness-normalize every sound; bus and level table as tunables | Review, then brief a build task |

## Merge queue

1. `track-layer-machine`, after its rebase.
2. `simplify-deep`, `audio-mix` as they land.
3. `slice3-path`, after its proofs (owner first-path verdict after merge).
4. `terrain-pilot`, after the owner's verdict on round 3.

Hold everything while the owner plays. `ship-branch` reruns cancelled CI runs itself (twice at most); a branch containing a merge commit must be squashed onto main first, or the rebase replays old conflicts. A 30-minute heartbeat loop runs in the coordinator session.

## Merged today

Fixes and features:

- slice 2: counted supply, slow regrowth and the recovery rack;
- service-worker fixes (pages always fresh, cached assets carried across builds);
- ship-branch reruns cancelled CI runs;
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
- the look-dev loop and terrain texturing research;
- the money, cart first, recovery rack, first evening and tunables briefs.

## Queued

- **Particles:** distinct wood chips and dust, then shapes, rotation and curves in `src/render/particle-pool.ts`. Libraries stay references only.
- **Q6 co-op grounding:** P2 landing beside Q6 failed once on slice 2 and once on the track layer, with no branch cause. Investigate on main on a quiet machine.
- **Full visual-pipeline pass:** after the look-dev loop (merged: 3×3 key/fill wedge in about a second warm), in the research's order: calibration, materials, lighting and sky, shadows, water, post and grade.
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
