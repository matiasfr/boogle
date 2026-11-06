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
| (none running) | Overnight 6 November: every job finished and shipped | Owner decisions in the morning brief |

## Merge queue

Ship each branch as it passes. Run `ship-branch.sh` under Node 26 (`export PATH=~/.nvm/versions/node/v26.13.0/bin:$PATH`); the default shell Node 24 fails the level check. Hold everything while the owner plays. The 30-minute heartbeat loop runs in the coordinator session; durable notes are in `boogle-daily/.look/coordinator/resume.md`.

## Merged 5-6 November

- Slice 2 and slice 3 (T2, T3, proper axe, great beam, stone renewal, walk home); track layer; terrain cove (`?terrain=cove`); playtest fixes (original chop swing, hat seat, track layer clearance).
- Audio: footsteps (soft thump), jump and landing sounds, dB mix buses. Sound board: https://claude.ai/artifact/ResT9fCQZUTr9FvmvMKbn4
- Look: cell 5 lighting (cloud 0.8, neutral), canvas colour-space fixes, `?view=unlit` and `?view=raw`, material palette tunables (defaults unchanged), sky prototypes `?sky=summer` and `?sky=windpaint`.
- Fixes: floating houses and colours, grounding and track audit, co-op train sync, world clock, network backpressure.
- Tooling: bot queue, checkpoint segments, `npm run checks-for`, CI in the Playwright container.
- Cleanup and performance: two simplify batches, dead-code sweep, old-build compatibility cut (`WORLD_NS` v10), rack draws merged, particles (chips, dust, beam drop).
- Research and briefs: next destination, Roundhouse trains, route contract, world map (`docs/world/world-map.html`), Roundhouse layout, jump upgrades and gate puzzles briefs. Visual pages are linked from the morning brief.
- Owner calls: no old builds; our own assets first; gameplay shapes the environment; visualize in 2D HTML first.

## Queued

- **Waiting on the owner (morning brief, https://claude.ai/artifact/9SG7GBxEgoChpamS3vCuvj):** first-path verdict on slice 3; next destination (recommended Split-rock Works, then Ring Island); sky (summer or windpaint, and GOBI download); Roundhouse smallest first build; jump upgrades and gate puzzles briefs; material palettes (Fresh recommended); 25 unmerged experiment worktrees.
- **Visual pass stages 3 to 5** (lighting and sky, shadows, water, post and grade) after the palette and sky picks.
- **Room-owned time:** after T1; the evening look is on main behind `?evening=1`.
- **Brainstorm:** the telescope build-out.
- **Replay guide refresh** before the owner plays.
- **Framework and tool upgrades:** last.

## Open owner questions

1. **Look choices:** gain/key cell from the town wedge, then cloud brightness and warmth.
1. **First-path verdict** on slice 3, and the four new prompts ("Empty your back first", "A proper axe first", "Help carry", "Let go").
2. **Brief questions** in money, cart first and first evening.
3. **Suspect copy:**
   - `SHOP.kept[0]` says "the hat" for any item;
   - "Chops trees, breaks rocks, and more" appears before rocks exist in T1.
4. **Museum:** inspect the miniature, the crystal specimen, or both. **Worktree cleanup:** about 280 old worktrees.

## Next moves

- Ship playtest fixes after review; show the owner the unlit board and the wedge boards.
- Start the next queued item whenever fewer than three Codex jobs run.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage.
