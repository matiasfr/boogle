# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision index](../decisions.md#current-decision-index).

**Updated:** 9 November 2026, 10:50 UTC (running, merged today, tidy, next moves). The queue and open questions below are from 5–6 November and may be stale. The roadmap (now, next, later) is [direction.md](../direction.md), not this file. Public copy: https://boogle.club/development/ The owner sees the same status on the [Line Map board](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

## Links

- [Owner calls](owner-calls.md), [decision index](../decisions.md#current-decision-index), [direction](../direction.md) (the one roadmap)
- Current plans: [line 2 B5–B8](../plans/line2-b5-b8.md), [Split-rock Works and Roundhouse](../plans/split-rock-roundhouse.md)
- [Production core](../plans/production-core.md), [slice 3 plan](../research/slice3-plan-2.md), [room-owned time plan](../research/room-time-plan-2.md)
- [Round 4 tracker](../plans/round-4-notes.md), [playtests](../playtests.md), [replay guide](https://claude.ai/artifact/TAb4PhNz2E9g1DiZD5bHoF)
- Briefs:
  - proposed: [money](../brainstorms/money.md), [cart first](../brainstorms/cart-first.md), [first evening](../brainstorms/first-evening.md);
  - approved: [recovery rack](../brainstorms/recovery-rack.md), [signposts](../brainstorms/signposts.md);
  - building: [tunables](../brainstorms/tunables.md), [cart whistle](../brainstorms/cart-whistle.md).

## Running

Claude only until 12 November (`npm run models`). Agents run in `.claude/worktrees/agent-*`; ship with the scratchpad's ship-q.

| Job | Status | Blocker or next step |
| --- | --- | --- |
| Town T3: the museum | implementer | Captures queued; next C2 after C1, K1 after C1 |
| C1: station boxes and curio shelf | implementer, long run rerun | Ship when it passes; then C2 (stowaway) and K1 |
| Split-rock J4: Works and Roundhouse live | implementer, final probe and bench | Includes the breaker/boiler plume and whistle (home-flow finding 3); J5 after |
| Queued | | Glider piece B (rules, next WORLD_NS, after J4; batch with any other bump); Home flow fixes (cart 16→24 rails, bot route); C2, K1 → F1 → F2, then D1 and R1–R3 |

## Merged 9 November

- Docs split: decisions.md + direction.md (#1232), research index with top blocks (#1235), Godot evaluation notes (#1246).
- Agents: designer agent with a level-design and flow pass grounded in research, lenses not rules (#1241–#1244, #1250); tidy skill (#1237); progression-flow research (#1249); Home flow audit (#1251, docs/reviews/home-flow.md).
- Game: hook scoring fix (#1234); glider brief and design review (#1238); glider piece A, off in production (#1247); render/audio tidy (#1248); town T1, Pip's house live (#1252); Split-rock J3 rules, WORLD_NS v22, live (#1253); wardrobe T4 (#1254); buoys and telescope F3 (#1256); Fine Prices shop T5 (#1257); ambience and M flag A1 (#1258); residents T2, town back under its draw budget (#1259).
- Tooling: X1, verification on the production game (#1239, #1245).

## Merge queue

Ship each branch as it passes. Run `ship-branch.sh` under Node 26 (`export PATH=~/.nvm/versions/node/v26.13.0/bin:$PATH`); the default shell Node 24 fails the level check. Keep merging while the owner plays; only a `WORLD_NS` bump waits while they are mid-session (owner, 9 November). The 30-minute heartbeat loop runs in the coordinator session; durable notes are in `boogle-daily/.look/coordinator/resume.md`.

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

- **Great beam first build (owner approved 7 Nov):** after the track-chunk and pile-culling fixes land (they share railway-line.ts and sources.ts). Spec: docs/brainstorms/great-beam-clarity.md, first build then the rope drag; WORLD_NS bump.
- **Co-op abilities, option E (owner approved 6 Nov):** after R1b, the smallest first build on the double jump: finder-only card, a non-stopping flourish for everyone else (fills on landing if mid-air), a late joiner's flourish on first landing, a one-time apex prompt, and a greybox trophy plinth at Home. Spec: docs/brainstorms/coop-abilities.md. Touches src/render/reward-reveal.ts and src/entities/railway/tools.ts.
- **Owner's 6 November order (tool assignment clarified 7 November: Claude or Codex by task fit):** (1) replication R1a, railway replicated with no prediction, after slice 4 part 1 merges; (2) R1b, predicted mine, chop, take and drop, plus instant local feedback for waking the track layer and pulling levers (owner, 6 November: the wake felt delayed); (3) smaller track chunks (towards one rail pair per commit), shorter gantry beam; (4) track-layer seats working in the production railway (chairs are decorative today); (5) slice 4 part 2 (Q4–Q6, cart trip, pack chest, trains) on replication. Island throwing, mushrooms and frisbee wait for replication R3 (owner: low priority). Fly shared-cpu 60 Hz check approved by the owner as a staging deploy (separate app; never touch boogle-server).
- **Answered 6 November (end-of-day brief, https://claude.ai/artifact/9SG7GBxEgoChpamS3vCuvj):** ECS-shaped E, queued after R1b and before slice 4 part 2 adds more kinds; Fresh palette default (agent running); after the line 2 playtest: Split-rock Works (2D page first), the smallest Roundhouse, then the approved jump upgrades and gate puzzles briefs. Still open: the old experiment worktrees (recommend keep).
- **Paused world and away credit, after R1b** (owner, 6 November, [economy principles amended](../decisions.md#progress-and-rewards)). Code the approved amendments, each with its own proof:
  - stop simulating a room when its last player leaves, after a short grace for reloads (`server/src/host/rooms.ts` ticks empty rooms for `roomIdleMs`, 10 minutes);
  - replace R1a's offline catch-up (`server/src/host/world-host.ts`, "Catch up the time nobody hosted, once, for the funded job") with one away credit on the next join, filling each producer's yard `H × (1 − e^(−away/H))` hours (H a tunable, 2 h), never past the yard, and finishing the funded job;
  - keep the supply pulse's catch-up of up to 24 hours of regrowth and drop recovery (`src/sim/railway-supply.ts`), because it guards against lockout; apply it on join;
  - bring the forge and depot cart into the away credit (`src/sim/railway-line2.ts`: "the forge and depot never produce offline");
  - retire or isolate classic's helper bank (`src/sim/bank.ts`, `bank.wake` in `world-host.ts`) with classic.
- **Playable 2D economy prototype, after the map layout is picked and the economy amendments land** (owner, 6 November: "With these 2D simulations, we should be able to simulate the entire economy to understand the flow of the upgrades, and what the game would feel like before building it in 3D"). A top-down HTML page on the chosen layout (`docs/world/map-prototypes.html` data), driven by `dev/economy/ring-data.ts` and `ring-sim.ts` as the one source of truth. The player hauls by hand, connects places, upgrades producers, spends the shared wallet and takes the order choices, in real time or fast-forward, with 1, 2 and 3-player modes, so the owner can feel the flow and the hand-versus-machine crossovers.
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

- **Tidy:** last code pass `ca3212d0` (render/audio, #1248, 9 November). Next: the other areas since `1af61213`, then architecture, docs, memory.

## Next moves

- Keep about three agents running; T3, C1 and J4 now. As each lands: C2 and K1 after C1; J5 after J4; glider B after J4 (one WORLD_NS bump, never while the owner is mid-session).
- `../boogle-trusted/node_modules` and one old agent worktree symlink to the main checkout's node_modules; an `npm ci` in either empties it (seen twice on 9 November). Reinstall with `npm ci` in the main checkout if `node dev/playtest/cli.ts` can't find playwright.
- Home flow fixes from docs/reviews/home-flow.md go to an implementer when a slot frees.
- Keep the playtest guide current: https://claude.ai/artifact/Ud7yddruEMLszCgModu4WC
- Tidy: run the remaining code areas, then architecture, docs and memory.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage.
