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
| `playtest-fixes` | Owner iPhone playtest (5 November): restore the original chop swing with the new axe model; seat the conductor hat without head clipping; track layer clearance with the station building and wood pile box, plus a swept-volume check | Review stills, then ship |
| `unlit-view` | Dev `?view=unlit` (lit / unlit with tone mapping / raw base colour) and a four-place comparison board | Show the owner |
| `visual-pass-1` | Stages 0 and 1 done: fixtures, 27-cell gain × key/fill wedge, three canvas colour-space fixes (shipping). Now a spawn-view cloud brightness × warmth wedge | Owner picks gain/key cell and cloud/warmth cell; then stage 2 (materials) |

## Merge queue

Ship each branch as it passes. Run `ship-branch.sh` under Node 26 (`export PATH=~/.nvm/versions/node/v26.13.0/bin:$PATH`); the default shell Node 24 fails the level check. Hold everything while the owner plays. The 30-minute heartbeat loop runs in the coordinator session; durable notes are in `boogle-daily/.look/coordinator/resume.md`.

## Merged 5-6 November

- Slice 2 (counted supply, slow regrowth, recovery rack) and slice 3 (T2, T3, proper axe, great beam: solo 2.2 m/s, faster with a helper; stone renewal; walk home). Awaiting the owner's first-path verdict.
- Track layer (flanged wheels, whole panels, deck seats); terrain cove behind `?terrain=cove` (vista beside the town climb).
- Audio: footsteps (soft thump default), jump and landing sounds, normalized families, dB mix buses as tunables. Sound board: https://claude.ai/artifact/ResT9fCQZUTr9FvmvMKbn4
- Fixes: floating houses and lost building/tree colours; grounding (solver margin, prop and track audit); co-op train sync and harness; world clock decoupled from physics frames; network backpressure.
- Tooling: bot queue, checkpoint segments, `npm run checks-for`; CI scenarios in the Playwright container (about 1 minute); ship-branch reruns cancelled runs.
- Cleanup and performance: deep simplify batch; old-build compatibility cut (about 4,860 lines, `WORLD_NS` v10); rack and feeder draws merged (town 214 to 164 draws); unchanged instance writes skipped.
- Particles: wood chips and contact dust from the shared pool. Owner calls: no old builds in development; our own assets first; gameplay shapes the environment.

## Queued

- **Beam-drop dust:** too faint after the particles pass.
- **Visual pass stages 2-5:** materials, lighting and sky, shadows, water, post and grade, after the owner's wedge choices.
- **Terrain polish:** tiny rear specks and angular background edges in the cove.
- **Room-owned time:** after T1; the evening look is on main behind `?evening=1`.
- **Framework and tool upgrades:** last.
- **Replay guide refresh**, before the replay.
- **Brainstorm panels:** gate puzzles, telescope build-out, jump upgrades.

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
