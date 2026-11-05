# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision index](../proposals/boogle-2.md#current-decision-index).

**Updated:** 5 November 2026, evening, by the Claude orchestrator session. The owner sees the same status on the [Line Map board](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

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
| `tunables-build` | First proof: haul yield (shared), exposure (local), one spring; fixing review P1 (refuse old tabs on migrated rooms) and P2 (defer shared URL edits until the room is ready) | world-inputs rerun, full bot, then merge |
| `track-layer-machine` | Rail wheels, pale spokes and coupling rods done; solo passes; co-op full run failed a clock-drift check under load | Owner question on stock-to-rail mapping (below) before the gantry mechanism; quiet co-op rerun |
| `deck-sitting` | Train cars lose chairs; riders sit on the deck. The track layer keeps its chairs | Conflicts with `track-layer-machine` in `src/proto/place/seat.ts`; merge one after the other |
| `next-destinations` and the `destinations-*` panel | Research plus brainstorm: destinations after the starter island, upgrades instead of eras | Panel round 2, then a brief |
| `chop-animation-timing` | Another session ("Asset placement and editor evaluation") retuning the axe. It has the generated chop references | Merge through the coordinator |
| `color-defaults` | Another session ("Port Ultra Water…"): lit signs, round 2 lights at gain 0.12, readable names. Reviewed and ready | Owner's timing call: before or after the replay |

## Merge queue

Ship each with `npm run ship-branch`, in this order:

1. `slice2-supply`, once it passes.
2. `tunables-build`.
3. `deck-sitting`.
4. `track-layer-machine`, which rebases over the deck seats.
5. `color-defaults`, whenever the owner chooses.

Hold everything while the owner plays.

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

1. **Track layer: how does a rail pick map to stock?** Today the track commits a rail pair every 3 m (0.6 s at cruise), while stock counts down more slowly. The options:
   - **Lays track panels (recommended):** each pick-and-lay places a prefabricated track panel covering several metres, timed to the stock, as real track-laying machines do.
   - **Representative picks:** one pick per stock decrement, with today's other drops kept.
   - **Pause:** wait for a fuller stock and choreography decision.
2. **Colour defaults:** merge before or after the replay? Recommended: after.
3. **Brief questions** in money, cart first and first evening.
4. **Suspect copy:**
   - `SHOP.kept[0]` says "the hat" for any item;
   - "Chops trees, breaks rocks, and more" appears before rocks exist in T1.
5. **Museum:** inspect the miniature, the crystal specimen, or both. **Worktree cleanup:** about 280 old worktrees.

## Next moves

- Merge each branch as it passes, in queue order.
- Write the destinations brief when its panel finishes.
- Start slice 3 after slice 2.
- Refresh the replay guide before the replay.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage.
