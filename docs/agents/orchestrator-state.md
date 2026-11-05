# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision index](../proposals/boogle-2.md#current-decision-index).

**Updated:** 5 November 2026, late evening, by the Claude orchestrator session. Public copy: https://boogle.club/development/ The owner sees the same status on the [Line Map board](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

## Links

- [Owner calls](owner-calls.md), [decision index](../proposals/boogle-2.md#current-decision-index), [direction](../direction.md)
- [Production core](../plans/production-core.md), [slice 3 plan](../research/slice3-plan-2.md), [room-owned time plan](../research/room-time-plan-2.md)
- [Round 4 tracker](../plans/round-4-notes.md), [playtests](../playtests.md), [replay guide](https://claude.ai/artifact/TAb4PhNz2E9g1DiZD5bHoF)
- Briefs:
  - proposed: [money](../brainstorms/money.md), [cart first](../brainstorms/cart-first.md), [first evening](../brainstorms/first-evening.md);
  - approved: [recovery rack](../brainstorms/recovery-rack.md), [signposts](../brainstorms/signposts.md);
  - building: [tunables](../brainstorms/tunables.md), [cart whistle](../brainstorms/cart-whistle.md).

## Running

Each job's branch is `codex/<topic>`, its worktree is `../boogle-codex/<topic>`, and its reports are in `boogle-daily/.look/codex/<topic>/`.

| Job | Status | Blocker or next step |
| --- | --- | --- |
| `slice2-supply` | Fixing two review findings (arrival restored under new track, a flaky fixture clock), plus owner changes: regrowth only slow, tunable regrowth and rack timers, the owner-chosen `recovery-rack.glb` | Full solo and co-op bots, then merge |
| `track-layer-machine` | Rail wheels, pale spokes and coupling rods done. Now building the panel-laying mechanism (owner, 5 November: lay prefabricated track panels, one per stock unit) | Solo, two-player boarding and real-time capture; then merge after `deck-sitting` |
| `upgrade-economy` | Upgrade tree and progression economy research, now sorting upgrades into kinds and reconciling with the destinations research and the places panel | Then one progression brief |
| `chop-animation-timing` | Another session ("Asset placement and editor evaluation") retuning the axe. It has the generated chop references | Merge through the coordinator |
| `color-defaults` | Another session ("Port Ultra Water…"): lit signs, round 2 lights at gain 0.12, readable names. Reviewed and ready | Owner's timing call: before or after the replay |

## Merge queue

Ship each with `npm run ship-branch`, in this order:

1. `slice2-supply`, once it passes.
2. `track-layer-machine`, after its panel-laying mechanism.
3. `color-defaults`, whenever the owner chooses.

Hold everything while the owner plays.

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
