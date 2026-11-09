# Orchestrator state

The living status for whoever is orchestrating, Claude or Codex: read it first, update it as jobs start, merge and finish, and ship it with docs. How to work is in the [orchestrate skill](../../.claude/skills/orchestrate/SKILL.md). It's a snapshot, not authority: decisions live in [owner calls](owner-calls.md) and the [decision index](../decisions.md#current-decision-index).

**Updated:** 9 November 2026, 21:05 UTC. The owner finished playing at about 20:56 UTC (his notes are ranked in the tracker); a `WORLD_NS` bump may ship once `npm run heartbeat` shows no newer session. The roadmap (now, next, later) is [direction.md](../direction.md), not this file. Public copy: https://boogle.club/development/ The owner sees the same status on the [Line Map board](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

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

Claude only until 12 November (`npm run models`). Agents run in `.claude/worktrees/agent-*`, resumed in their existing worktrees after the 9 November restart (ship order where files overlap: glider B, F2, jump-ins); `npm run heartbeat` lists them with their queued bot runs. Ship with `npm run ship-queue -- <worktree> --wait`.

| Job | Status | Blocker or next step |
| --- | --- | --- |
| F2: secrets and the finders' bay | running, built | `.claude/worktrees/agent-af6410c7219d14e16`. Rebased; `f2-long2` and six stills are queued behind glider B's long run. Then the designer's layout call (three secrets reachable before their ability: lookout, alcove, sea stack), an independent review and ship. Cuts the gold finds from the live game |
| Glider B + Home flow fixes | running, review back | `.claude/worktrees/agent-a1c64a5b32fc10f09`. `gb-long2` running. The independent review says ship after one fix (`holds` in `src/adapters/railway.ts` lacks `rail.glide`: a lost race plays the reward twice) plus four small tests and a plume fix; sent to the agent for after the run. Then a re-review of the fix, and ship with WORLD_NS v23 when no owner session is live. Prefer landing "a reset starts players fresh" first |
| A reset starts players fresh | running | Owner, 9 Nov: after a world reset a returning player gets the opening and character creation, not their old spot in town. Implementer dispatched; touches `src/boot/world-reset.ts`, `src/features/return-spot.ts`, the arrival. Lands before glider B's v23 if it can |
| Playtest jump-ins | running, part built | `.claude/worktrees/agent-a1abf1ff2a1170b5a`. Owner ask, 9 Nov. Plan: docs/plans/playtest-jump-in.md. Rebased onto J5; working through the plan's seven owed runs and step 7's `land` values. The glider B rows wait until glider B is on main (message the agent then). Needs an independent review; lands before D1 |
| Lockstep merges: fixes | running | The review is finished (`docs/reviews/lockstep-merges-2026-11-09.md`, shipping): one real bug (the forge rack gives a full back after the cradle is fitted, blocking the footings), one narrow one (a carrier back for under a rule tick keeps an old grace), one test nit. An implementer is building fixes A–C; needs an independent review. Findings 3–5 are not fixed ([agent-calls](../agent-calls.md)) |
| Workflow pass: nightly triage | running | The nightly scenarios failed 5–9 Nov ([issue 916](https://github.com/matiasfr/boogle/issues/916)) and perf has been invalid since 7 Nov. Diagnose each scenario, fix the runner (9 Nov: its worktree vanished mid-run), make perf wait for a quiet GPU, add a nightly `long` job. After it ships: reinstall the daily jobs, post the triage on issue 916 |
| Workflow pass: bot queue | running | The queue waits for load under 30 itself; every `verdict.json` records commit, tree, load and command; a killed run says "killed". When it lands, drop the "check uptime" line from briefs |
| The cart carries 24 rails | on main (#1280) | Owner, 9 Nov: split out of glider B (its commit `14f0ccb9`, branch `cart-24-rails`, `.claude/worktrees/cart-24`) so station 5's rails come in one trip without waiting for v23. Reviewed under glider B's review (stamp `ba0b9058db92`). When it is on main, tell the glider B agent to rebase (its cart commit becomes empty) |
| Cinematics can't be lost | running | Owner, 9 Nov: "the cinematic should be uninterruptible unless by maybe a specific highlighted button press". `createCameraPullOut` ended on any input, mouse movement included (the pinnacle lever's gate shot). The same agent adds a celebration shot at the rail's end at Far Head, where rockets fire with no camera and the owner saw nothing, and checks the rockets draw |
| Cut "Call cart to forge" | running | Owner, 9 Nov: cut the handle. Part 1 (the handle, its prompts, docs; no sim or wire change) ships now. Part 2 (`rail.cartCall`, `Cart.recall`) goes with the next `WORLD_NS` bump: fold it into v23 if glider B hasn't shipped |
| Boiler pickup and smoke | running | Owner, 9 Nov. "Shoulder the boiler" shows nothing unless you carry nothing at all: show it blocked with the reason. The forge's call plume moves from the boiler to the forge so the boiler doesn't read as running. Then "Boiler on a rope" under Queued, in the same files |
| No ring under the double jump | running | Owner, 9 Nov: keep the glints, drop the blue ring. Not found by reading; the agent captures the jump to identify it |
| Pier halt: the pad and the train in the track layer | running, P2 | Owner screenshot, 9 Nov. The empty pier rack pad (`crossing-view.ts` about line 225) overhangs the deck; line 2's last stop overlaps the parked track layer. May change sim layout constants: needs an independent review |
| Quarry gate's top | running, P2 | Owner screenshot, 9 Nov. The slab sinks and leaves bare jambs and a chain to nowhere (`line2-view.ts` about 380-432); a headstock with a sheave, and the chain follows the slab. The sea gate gets the same check |
| Home: one coherent station | running, P2 | Owner direction, 9 Nov ([decision](../decisions.md#decided)). Research (`docs/research/home-station-layout.md`) and a 2D options page (`docs/world/home-layout.html`) first; publish the page for him to pick, then the designer, then a plan. Nothing in the game changes before his pick |
| Next | | One long playthrough on main after glider B, F2 and jump-ins land (not one per branch). Then the hot-file split and the train stools under "Queued", D1 (delete `?proto=place`, with D1c per the jump-in plan) → R1–R3; kiln mouth polish; Split-rock cleft placement; the leftovers below |

## Merged 9 November

- Docs split: decisions.md + direction.md (#1232), research index with top blocks (#1235), Godot evaluation notes (#1246).
- Agents: designer agent with a level-design and flow pass grounded in research, lenses not rules (#1241–#1244, #1250); tidy skill (#1237); progression-flow research (#1249); Home flow audit (#1251, docs/reviews/home-flow.md).
- Game: hook scoring fix (#1234); glider brief and design review (#1238); glider piece A, off in production (#1247); render/audio tidy (#1248); town T1, Pip's house live (#1252); Split-rock J3 rules, WORLD_NS v22, live (#1253); wardrobe T4 (#1254); buoys and telescope F3 (#1256); Fine Prices shop T5 (#1257); ambience and M flag A1 (#1258); residents T2, town back under its draw budget (#1259); Split-rock J4, the Works live (#1261); museum T3 (#1262); station boxes and curio shelf C1 (#1263); Q6 bot trap fix (#1265); the stowaway C2 (#1266); personal crystals K1 (#1267); gold finds F1 (#1269, cut again by the owner the same day, #1270); Split-rock J5, the wagon, Pier halt and crossing (#1272).
- Tooling: X1, verification on the production game (#1239, #1245); orchestration pass (ship queue, heartbeat report, short bot runs ahead of long ones).

## How merging works

`npm run ship-queue -- <worktree> --wait`, in the background, one branch after another ([orchestrate skill](../../.claude/skills/orchestrate/SKILL.md), "Merge"). It finds Node 26 itself; the default shell's Node 24 fails the level check. Keep merging while the owner plays; only a `WORLD_NS` bump waits while they are mid-session (owner, 9 November).

`../boogle-trusted/node_modules` and one old agent worktree symlink to the main checkout's node_modules; an `npm ci` in either empties it (seen twice on 9 November). Reinstall with `npm ci` in the main checkout if `node dev/playtest/cli.ts` can't find playwright.

## Leftovers

Small things jobs reported and didn't fix. Fold each into the next job that touches its area, and delete it here when it lands.

- **Home flow** ([audit](../reviews/home-flow.md)): the paper hat floats about 10 cm above the head; the telescope view is half sea with the pier just off its right edge; the log rack beside Q6 at Far Head reads as clutter. Check what glider B's Home flow batch fixed before queuing these.
- **Split-rock Works (J4):** the kiln mouth is a flat peach square and needs a glow; particles reach about 440 a second at the pier. Suspect copy for the owner: "Take the breaker", "Strike the seam", "Fill the kiln", "Shoulder a footing", "Set the footing", "Fit the cradle", "Turn the table", "Help carry", "Let go", "Empty your back first".
- **Wagon, Pier halt and crossing (J5):** a footing trip takes about 2.5 minutes; about 2 ms extra GPU time at the pier; an orange-posted cart near the turntable that nobody identified; wagon performance unmeasured; the shunt wagon has no collider; the throat photo is badly framed; line 2 stops at every stop while footings are owed.
- **iPad:** the cart and rack don't draw, and rockets weren't seen (owner sessions, 9 November). Not reproduced on the Mac.
- **Ability pickups** have no particles. The **sea-gate camera** is hidden by pines.
- **`rail-seed.ts`** conflicts on almost every ship, because each job appends to the same lists. A table keyed by seed name would stop that.
- **For the D1 brief**, still on Place after X1: `sheet.ts` (Place saves and beats), `saves.ts`, `restore-pair.ts`, `coop-playthrough.ts`, `coop-warp.ts`'s `__place` read, railway-halts `skipTrains`, `dev/codex/see.ts`, `dev/audio/render.ts`, the video shots, and the level, economy and scan tools. The production co-op runner has no reload or rejoin. `--from` knows only `q5-done` and `trains-on`. Short runs print "Never marked" noise from the Place playdata card. The cold-start shore camera is unverified on production. Two peers hold 3x warp, not 5x (one sample each).

## Queued

Owner notes from the 9 November session, ranked in [the tracker](../plans/round-4-notes.md#owner-session-9-november-desktop-live-build-ranked) (owner call "Rank every note P1, P2 or P3"); pick by rank, and each needs a slot (the GPU queue is long). Running jobs by rank: P1 cinematics, the boiler prompt, a reset starts fresh; P2 the cart handle, Pier halt, quarry gate; P3 the double-jump ring.

- **P1, the back half's order** (from the session data): station 6 can be funded and laid by hand before the boiler is fitted, which is how the owner's "longest grind" happened, and the breaker is then cast onto a pedestal the boiler still stands on. Designer first: gate station 6 on trains, or make the boiler the only thing to do at that point; one item per pedestal. With the Works signposting below, which now also covers "Fill the kiln" never showing after the second strike.
- **P2, pier performance and the resolution scaler** (owner: "performance dips ... past the pier"): at the pier head p95 30–55 ms and the scale down to 1.2x on a Mac at 2712×2110, GPU-bound (about 200 draw calls, CPU 5–6 ms); the scale then took over four minutes to start recovering. Also a 464–483 ms hitch at each load and 286 ms boarding at Home (P3). Needs a quiet machine: start it when the bot queue is empty.
- **P2, a recovery loop in water**: nine falls and recoveries in 3.5 s at about (1000, 28) in session `mw9prlct` at 7:30.
- **P3, cosmetics fitting pass** (owner: low priority, later): the conductor hat sits a bit above the head; the paper hat floats about 10 cm (Home flow leftover).
- **P2, train stools** also covers his pet: it trails behind when he rides and should sit beside him on a stool.
- **P2, Boiler on a rope** ([decision](../decisions.md#decided), 9 Nov): hauled like the great log on the gold rope, a little faster. After the boiler pickup job lands (same view). Planner, then the designer for the pace, then build; touches the boiler's carry rule, so it needs an independent review.
- **P1, Split-rock Works signposting** (owner: "confused on what's supposed to occur with the breaker once I hit it next to rotunda"). The first strike only opens the stall; the next step is the second seam at the quarry halt, about 500 m away, and nothing points there, and the empty sockets don't say what fills them. Designer pass first. He is rechecking the slab's fall animation: add it if it reads wrong.
- **P2, Train engine visual pass** (owner: "it looks a bit lackluster"; also P3 z-fighting where the red body meets its dark base). Previz and a front/side/back sheet first (owner call "Previz before modelling"; Codex is out until 13 November, try anyway), then the model.
- **P2, Station 5's wait** (owner: getting rails to Far Head was "the longest grind"; he took rails by hand six times). After the 24-rail cart is live, measure the wait at the rim and have the designer judge it and whether the rack's status reads; the expected 80–125 s may still be too long.
- **Train stools (owner, 9 November: "positioning is weird and sitting feels broken").** The two stools on each empty flat car (`src/entities/railway/train-view.ts`, `stool.position.set(car.spec.hx - 0.2, car.hy, z)`; seats from `src/proto/place/seat.ts`) stand at the car's edge, and in the owner's screenshot the player stands half inside one while seated. A pass on where they stand, which way a sitter faces, the sit pose and getting on and off a moving car; prove it with real-time video on a moving train, one and two players. Start when a GPU slot frees.
- **Split the hot files, and start the bot from any seed (owner call "Workflow pass", items 2 and 6).** After glider B, F2 and jump-ins land, since all three edit these files: `dev/look/rail-seed.ts` as a table keyed by seed name; `dev/look/bots/railway.ts` (1,900 lines) by segment, each segment startable from its jump-in seed so `playthrough --from <stage>` works for every stage; `docs/game-design/place.md` (1,411 lines, 66 commits in three days) as one file per feature. Planner first.

From 5–7 November and not on the roadmap anywhere else, so kept here; check each against [direction.md](../direction.md) before starting it.

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

From 5–6 November; drop each when answered.

1. **Look choices:** gain/key cell from the town wedge, then cloud brightness and warmth.
2. **First-path verdict** on slice 3.
3. **Brief questions** in money, cart first and first evening.
4. **Suspect copy:** `SHOP.kept[0]` says "the hat" for any item; "Chops trees, breaks rocks, and more" appears before rocks exist in T1; the Works verbs under Leftovers.
5. **Museum:** inspect the miniature, the crystal specimen, or both.
6. **Worktrees left after the 9 November cleanup** (30 archived as local `archive/worktree/<branch>` tags, 39 merged ones removed): three with uncommitted changes (`codex/hook-swing-prototype`, `codex/two-player-track`, `worktree-agent-aad5cd795cee72677`) and four recent ones (`claude/godot-assumptions`, `claude/glider-b-plan`, `claude/idea-land-ack`, `claude/playtest-jump-in-plan`). Commit-and-archive, or keep?
7. **Model routes:** the main session, planner and pre-merge review now run on Fable ([agent-calls](../agent-calls.md)); say if any should go back to Opus.

- **Tidy:** last code pass `ca3212d0` (render/audio, #1248, 9 November). Next: the other areas since `1af61213`, then architecture, docs, memory.

## Next moves

- Keep about three agents running. Next: D1, then R1–R3. Every Place port gets its fit check before planning (owner-calls).
- Glider B's WORLD_NS v23 ships only while no owner session is live.
- Keep the playtest guide current: https://claude.ai/artifact/Ud7yddruEMLszCgModu4WC
- Tidy: run the remaining code areas, then architecture, docs and memory.

## Peers

Codex orchestrators record cross-session notes here. Claude sessions use SendMessage.
