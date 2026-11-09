# Direction: where Boogle is

**This is Boogle's one roadmap** (owner, 8 November). Other docs that list what's next link here instead of keeping their own list. It is a derived view, not decision authority: decisions live in [decisions.md](decisions.md#current-decision-index), standing calls in [owner-calls](agents/owner-calls.md), principles in [DESIGN.md](../DESIGN.md), tasks in each plan, evidence in [playtests.md](playtests.md). Live job status is in [orchestrator-state](agents/orchestrator-state.md). Consult with the [game-direction skill](../.claude/skills/game-direction/SKILL.md). Background: [research](research/game-direction.md). The owner's view of this is the [Line Map](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

Reviewed: 8 November 2026, at `46eb7125`, against decisions.md's entries to 8 November, [line2-b5-b8.md](plans/line2-b5-b8.md), [split-rock-roundhouse.md](plans/split-rock-roundhouse.md), [production-core.md](plans/production-core.md) and `git log origin/main`. Compare these sources before quoting anything here.

## How we got here

The Place prototype (`?proto=place`) proved the loop over playtest rounds 1–4, with its state owned by a browser tab. From 4 November, production core rebuilt the same design on server authority, so progress stays built when players leave and rejoin. Line 2 is built on that. The first prototype order is kept under [History](#history).

## Phase

**1. Production core, with the next area starting.** Line 1 and line 2 run on the server railway, from the first stretch to the pier facing Ring Island. Split-rock Works, the next area, has started by the owner's 8 November call.

**How we work now:** keep building out the vision continuously. Playtests happen whenever the owner can, on whatever is live, and feed adjustments back in. They are not gates (owner, 9 November: "We want to build out as much as possible of the vision and then playtest everything we have whenever I can and make adjustments."). The only hold: don't ship a `WORLD_NS` bump while the owner is mid-session.

## Now, next, later

|           | What                                                                                                                                                                                    | Status                                                                                                                                                                                                                                                                 | Done when                                                                                  | Plan                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| **Now**   | Live for the owner to play when they can: the 8 November solo-test fixes plus line 2 part 2 B5–B8 (halts, trains on both lines, the boiler, Q6 and the pier), at world v21              | All merged. The final long playthrough is being fixed ([decision](decisions.md#process), 8 November, "the next playtest")                                                                                                                                     | The long playthrough passes; the owner's notes, whenever they come, become adjustments      | [line2-b5-b8.md](plans/line2-b5-b8.md), [proof record](plans/line2-part2-greybox.md#b5b8-proof-record-8-november) |
| **Next**  | Split-rock Works and the smallest Roundhouse: the breaker, footings carried alone or together, twelve footings and six bents toward Ring Island. Alongside it, the town port off `src/proto/place` (plan being written: `docs/plans/place-retirement.md`) | J1 (layout) and J2 (default-on blockout) are merged. J3's rules (world v22) proceed now; J4 and J5 follow J3. The town port proceeds now                                                                                                                          | The area plays end to end, and the bot times it against the six-hour target                | [split-rock-roundhouse.md](plans/split-rock-roundhouse.md)                                             |
| **Later** | The target-quality pass: a full session at target quality on the finished home island, watched with a fresh player, and a second area's cost measured                              | Not yet planned in detail. Its art and character work is listed below                                                                                                                                                                                                 | Owner accepts the experience and quality                                                   | None yet                                                                                               |

**Production core.** Slices 1–3 (the server spine, T1, line 1 and its walk home) merged 5–6 November. Slice 4's construction is complete through the pier at world v21. Still open: slice 5 (schedules, town delivery and growth on the server), slice 6 (object lifetime and presentation dependencies) and slice 7 (retiring `src/proto/place`, which the railway still borrows views and layout from). See the [promotion slices](plans/production-core.md#reviewable-promotion-slices).

**Superseded:** the round-4 replay "Now" is long done. "Don't start new areas yet" was replaced by the 8 November call to start Split-rock Works and the Roundhouse now. "Stop at the owner's playtest" was replaced on 9 November: nothing waits for a playtest.

## Target-quality pass: art and characters

Not yet planned in detail. This is unrelated to the historical eras 1–2 [vertical-slice spec](proposals/vertical-slice.md) (31 October, never built). This lists what's on `main` and what's left, checked against `git log origin/main`.

**Done:**

- **Track-layer machine.** Crawler shell (`85af518a`), flanged rail wheels (`6657c5f6`, `4fa38246`), rigid panel magazine and hoist (`528560d4`), all in #1018. Seats as plain stools (#1197).
- **Fresh material palette** as the default for every family (#1109).
- **Baked wood grain** on a shared tile for visible timber (#1093).
- **Sickle Isles backdrop** on the horizon by default, built to a phone draw budget (#1223).
- **3.6 km fog** for the outdoor view (`fc69843c`, #1167).
- **The starter cove's terrain.** The west cove is every entry's shore (`97db0d0d`), composed after station grading (#1034), and recorded as the terrain direction (`fa4674c8`).

**Characters: done, and spread across several places.**

- **Buddy**, the one player figure: the 2 November calls in [Characters and story](decisions.md#characters-and-story) (no ears or cheeks, gaze, soft shoulders, conductor hats). As built: [player](game-design/player.md).
- **Asset and animation stage** at `/character/` (`917291fe`; [asset-stage](game-design/asset-stage.md)), with Buddy's equipment fitted (`035e5aee`) and the axes and two-handed chop posed (`3e139d2d`).
- **Townsfolk:** the little guys, code-built and instanced (`src/proto/place/folk.ts`), kept as they are by the 5 November "some lo-fi is character" call; they sleep beyond 150 m (#1152).
- **Sleeves**, the town entrance greeter (`8ec6531a`; [place](game-design/place.md)).
- Research: [characters](research/characters.md), [motion references](research/motion-references.md). [decomp-characters](plans/decomp-characters.md) is an unbuilt plan for more engine-run guest characters.

**Characters: left.** Outfits on Buddy's other slots: only head (hats) is used of head, body, hands and feet (1 November, "the bare hero base before outfits"). Animation polish, starting simple (owner-calls). Any further townsfolk modelling needs its own brief.

**Open:**

- **Terrain on the rest of the island.** The cove is done. The rest can be looked at, toward smooth sculpted forms with banded, height-driven strata (5 November, "smooth, textured terrain"; [terrain texturing](research/terrain-texturing.md)).

**OK for now:** lighting and post (owner, 8 November). The broader pass across every visual layer after a [look-dev loop](research/lookdev-loop.md) (5 November) is not scheduled.

**Deferred:** iPad and iPhone measurement of the full look is not prioritized yet (owner, 8 November). The backdrop's phone draw budget stays a build constraint; only the measurement pass waits.

## Where things are

| What                                                                                                                                        | Where                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The interactive concept page: map by era, deep dive, venue paintings, the current round of questions                                        | Boogle 2.0 artifact, https://claude.ai/artifact/JvHs1aHAiGyvZ61PF6ZgoG (private to the owner)                                                                                                                                                                                                                                                    |
| Island layout lab: home and archipelago maps, layout options with pick buttons                                                              | https://claude.ai/artifact/BQuFyGfrXwuzSm9KeKq1fT (private to the owner); options in [island-layout.md](proposals/island-layout.md)                                                                                                                                                                                                                        |
| Level design previz: real renderer captures, image generation matched to them, and the painted first round (home concepts, network layouts) | Boogle Island Previz artifact, https://claude.ai/artifact/UWXyVfLBbG9NMY5uBe1j1C (private to the owner); images and boards in `.look/previz/` (`home-redesign`, `network-ring-chain`, `network-branching`, `places-engine-look`, `islands-*`), the rough blockout in `.look/env-ref/` (both gitignored, in the main checkout on the owner's Mac) |
| Earlier concept pages                                                                                                                       | "Boogle Grows Up" https://claude.ai/artifact/9iQwPsUqWHxzy5TLENNZwK, "Boogle Crossroads" https://claude.ai/artifact/DMWtrTw6N8vBjKREKYwLcC                                                                                                                                                                                                       |
| Painted concepts: 8 eras, the era-2 opening day, the mainland port, 13 venue close-ups                                                      | Branch `claude/concept-images`, `concepts/` (a scratch branch, never merged to `main`); prompts in `dev/concepts/`                                                                                                                                                                                                                               |
| Historical build spec for eras 1–2                                                                                                          | [vertical-slice.md](proposals/vertical-slice.md)                                                                                                                                                                                                                                                                                                           |
| Historical eras 1–2 draft, never approved                                                                                                   | [rail-slice.md](plans/rail-slice.md)                                                                                                                                                                                                                                                                                                          |
| Story, gags and finales                                                                                                                     | [story-and-finale.md](proposals/story-and-finale.md), [fourth-melon.md](proposals/fourth-melon.md)                                                                                                                                                                                                                                                                   |
| Progression without mini-games                                                                                                              | [progression-paths.md](proposals/progression-paths.md)                                                                                                                                                                                                                                                                                                     |
| Venues and the hub                                                                                                                          | [hub-and-minigames.md](proposals/hub-and-minigames.md)                                                                                                                                                                                                                                                                                                     |
| Does the engine fit?                                                                                                                        | [docs/plans/boogle-2-architecture-fit.md](plans/boogle-2-architecture-fit.md)                                                                                                                                                                                                                                                                 |
| Build plan for "find the fun", one checkbox per PR                                                                                          | [docs/plans/find-the-fun.md](plans/find-the-fun.md)                                                                                                                                                                                                                                                                                           |
| The game as built; playtest findings                                                                                                        | [docs/game-design.md](game-design.md); [docs/playtests.md](playtests.md)                                                                                                                                                                                                                                                                   |
| Research behind it                                                                                                                          | [docs/research/README.md](research/README.md) (rail-as-play, progression-models, discovery-progression, system-cohesion, big-walk-and-communal-endings)                                                                                                                                                                                       |
| Every research doc by topic, with status and verdict (maps past research against this direction) | [docs/research/README.md](research/README.md) |

## Phase map

The graph can step back for an affected risk. Exit evidence for each is in the [research](research/game-direction.md#proposed-phase-map-from-here-to-a-finished-boogle).

| Phase                       | Proves                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------ |
| 0. Close round 4 discovery  | Done: the notes were reconciled and the changed loop played                          |
| **1. Production core (now)** | One durable shared construction path, solo and two players                          |
| 2. Target-quality pass      | A representative session at target quality, with a fresh player and second-unit cost |
| 3. Controlled content       | Small playable batches at a known rate, with a rough route to the ending             |
| 4. Alpha                    | Every campaign-critical feature works end to end; placeholders allowed               |
| 5. Beta                     | All intended content in; pacing, readability and devices checked                     |
| 6. Release                  | Remaining blockers fixed; the owner approves known limits                            |

## Owner decisions that change the next work

- The jump-upgrade balcony and the ankle rings are the owner's call after playing B5–B8 (Split-rock answers, 8 November); the rest of Split-rock does not depend on them.
- Beam carry: pick a Godot-style option after reading the [comparison](research/beam-carry-godot-comparison.md).
- Cart first, then trains: the [proposal](plans/cart-then-trains.md) was never answered. Line 2 already runs the depot cart before its trains, so ask before running it.

## History

### Next: find the fun (agreed direction, 1 November)

_Historical: the first prototype order, agreed 1 November and moved here from the decision log on 8 November. The now, next and later table above replaces it._

Prototype mechanics only, in this order. Build order and PRs: [find-the-fun.md](plans/find-the-fun.md). Each step goes behind a `?proto=` flag, gets a `/look` motion sheet, and asks one playtest question. If the answer is no twice, change it or cut it instead of adding rewards.

1. **Is hauling fun as a toy?**
   - This is already built, so it needs a playtest before any code.
   - Ask: does carrying a wobbly stack feel good with no goal? Does a rail section feel like effort or a chore?
   - Tune the sway, the spill, the pour speed and the 60-log cost.
   - If hauling is a chore, test a different core loop before building trains on it.
2. **Is riding fun?** This is the rail spike.
   - Its first task is platform carry for the player on a kinematic wagon.
   - Ask: does anyone ride twice for no reason?
3. **Does what you built feel like yours?**
   - The wagon runs only on laid sections, so every section extends the ride.
   - Ask: is the 50 s laying run satisfying or dead time?
4. **Does the island change enough at an era's end?**
   - A greybox swap: blocks change and the wagon starts running. No ceremony.
5. **Is driving a vehicle fun?** The soapbox cart.

The mayor, era props, hats, gags, the ceremony and painted art all wait until these pass.
