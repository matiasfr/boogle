# Direction: where Boogle is

**This is Boogle's one roadmap** (owner, 8 November). Other docs that list what's next link here instead of keeping their own list. It is a derived view, not decision authority: decisions live in [decisions.md](decisions.md#decided), standing calls in [owner-calls](agents/owner-calls.md), principles in [DESIGN.md](../DESIGN.md), tasks in each plan, evidence in [playtests.md](playtests.md). Live job status is in [orchestrator-state](agents/orchestrator-state.md). Consult with the [game-direction skill](../.claude/skills/game-direction/SKILL.md). Background: [research](research/game-direction.md). The owner's view of this is the [Line Map](https://claude.ai/artifact/2znk2jAgbsyu7so8vA3v5C).

Reviewed: 27 November 2026, at `5c4ab2023` (world v75), for the [course change](decisions-core-loop.md#d-2026-11-27-course-change): the Phase and the Now and Next rows below were rewritten against [backlog.md](backlog.md) and the 27 November decisions. The sections from "Target-quality pass" down are as reviewed on 17 November. This is a snapshot, not a second job queue.

## How we got here

The Place prototype proved the loop over playtest rounds 1–4, with its state owned by a browser tab. From 4 November, production core rebuilt the same design on server authority; the railway moved onto the ECS, players, seats and The Boogler became server-owned (v44), and `src/proto/place` is gone. On that base the route grew from the first stretch to Ring Island and High Gorge. The first prototype order is kept under [History](#history).

## Phase

**1. Production core: the whole route exists rough, and a guest cannot yet read it.** The greybox route reaches the ending: the loop finishes all nine areas in 110 to 121 minutes for one to three players ([route-minutes](reports/route-minutes.md)), and the lap that closes the ring is building. The built route to High Gorge, the town loop (freight, fares, plots, the first house) and the garage are live. What is missing is not route.

**The gap, and the focus (owner, 27 November, [decision](decisions-core-loop.md#d-2026-11-27-course-change)).** Guests love dropping in and cannot find the progression, so the owner does it while they play around. The critique he agreed with names why: one critical path with no guidance, a different rule at every step, no way to read the room or to help from where you stand, towns that grow as a counter, and the toys stranded on the old island. So the next work makes the rail one guided line that closes into a ring, makes any work anywhere count, and moves choice and hanging out into the towns ([plan](plans/course-change.md)). This replaces the 16 November focus, choice and payoff ([entry](decisions-process.md#d-2026-11-16-focus-choice-and-payoff)): the garage trade measured hollow on the lines as built, and the rail gets no new trades.

**How we work now:** keep building continuously, one pass then refinement, with fresh players as the proof ([flow](decisions-process.md#d-2026-11-27-flow-one-pass-then-refine); [why](reports/why-slow-2026-11-27.md)). Playtests happen whenever the owner can, on whatever is live, and feed adjustments back in; they are not gates (owner, 9 November). Ships hold only on the owner's word.

## Now, next, later

The list of what the owner has committed to, ranked, with each effort's status and next step, is [backlog.md](backlog.md); pick what's next from there. P1 there is the focus, at most five rows. The table below is the phase view.

|           | What | Status | Done when | Plan |
| --------- | ---- | ------ | --------- | ---- |
| **Now** | **A guest helps in two minutes.** Know where the work is (the works signal, the station board, the train to the works, one grammar for every step); any work anywhere counts; towns are the hangout; the ring closes; the first-contribution measure | Planned 27 November; the lap is building; the measure is the first job | A fresh player’s first accepted contribution comes within a median of 120 seconds of landing, and they can say what the room is building. A playtest adjusts this; it does not gate it | [course-change](plans/course-change.md), [greybox-lap](plans/greybox-lap.md) |
| **Next**  | The town catalogue to depth (every hub town gets buildings that add something to do); the world leaves greybox, one area a pass; the ride-minutes rule applied to the map in one layout pass if any town fails it | The Round’s blockout and the first house are on main; High Gorge’s stacks are in the cliff kit | Each hub town has something to do that the room chose; no town is more than four minutes from Home by the shorter way | [course-change](plans/course-change.md), [greybox-look](plans/greybox-look.md), [town-layout](plans/town-layout.md) |
| **Later** | The target-quality pass (a full session at target quality, watched with a fresh player); areas to depth, one at a time; then Alpha, which needs saves that survive an update | Not planned in detail. Its art and character work is listed below | Owner accepts the experience and quality | [campaign-outline](plans/campaign-outline.md#5-order-of-work) |

**Production core.** Slices 1–4 are done (server spine, lines 1 and 2 to the pier), as is retirement of `src/proto/place` (slice 7's main job). Slice 5's replacement town work shipped through #2018, including the real empty-host/away/return sack proof; see [town-economy-visible](plans/town-economy-visible.md). Slice 6 (object lifetime and presentation dependencies) has not been re-checked for this review. See the [promotion slices](plans/production-core.md#reviewable-promotion-slices).

**Known cost while iterating:** every `WORLD_NS` bump wipes the room, by decision ([8 November](decisions-process.md#d-2026-11-08-a-world-wipe-is-a-new)), and a deploy reloads the page (twelve reloads in the owner's 88-minute session on 14 November). Save migration waits for Alpha ([campaign-outline](plans/campaign-outline.md#4-campaign-critical-systems)).

**Superseded:** the 8 November table (B5–B8 live at v21, Split-rock Works next) is long done; "Don't start new areas yet" was replaced on 8 November, and "Stop at the owner's playtest" on 9 November. The 10–15 November spread of eleven P1 efforts was replaced on 16 November by the focus above.

## Target-quality pass: art and characters

Not yet planned in detail. This is unrelated to the historical eras 1–2 [vertical-slice spec](archive/proposals/vertical-slice.md) (31 October, never built). This lists what's on `main` and what's left, checked against `git log origin/main`.

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
- **Townsfolk:** the little guys, code-built and instanced (`src/place/folk.ts`), kept as they are by the 5 November "some lo-fi is character" call; they sleep beyond 150 m (#1152).
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
| Historical build spec for eras 1–2                                                                                                          | [vertical-slice.md](archive/proposals/vertical-slice.md)                                                                                                                                                                                                                                                                                                           |
| Historical eras 1–2 draft, never approved                                                                                                   | [rail-slice.md](archive/plans/rail-slice.md)                                                                                                                                                                                                                                                                                                          |
| Story, gags and finales                                                                                                                     | [story-and-finale.md](proposals/story-and-finale.md), [fourth-melon.md](proposals/fourth-melon.md)                                                                                                                                                                                                                                                                   |
| Progression without mini-games                                                                                                              | [progression-paths.md](proposals/progression-paths.md)                                                                                                                                                                                                                                                                                                     |
| Venues and the hub                                                                                                                          | [hub-and-minigames.md](proposals/hub-and-minigames.md)                                                                                                                                                                                                                                                                                                     |
| Does the engine fit?                                                                                                                        | [docs/plans/boogle-2-architecture-fit.md](plans/boogle-2-architecture-fit.md)                                                                                                                                                                                                                                                                 |
| Build plan for "find the fun", one checkbox per PR                                                                                          | [docs/plans/find-the-fun.md](archive/plans/find-the-fun.md)                                                                                                                                                                                                                                                                                           |
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

- The shared pool: does it replace halt yards for upgrades, or cover only goods carried to a hub ([entry](decisions-rewards.md#d-2026-11-12-upgrades-pay-from-a-shared-pool))? Garage step 3 spends steel from one pool by his 15 November answer; the plan ([shared-pool](plans/shared-pool.md), 19 November) recommends that halt yards join no pool until an upgrade is priced in their kinds; its three questions are his.
- Right-hand running: the plan's three questions ([running-side](plans/running-side.md)).
- The Round: his walk of the blockout may move plots before houses are built on them.
- From the 8 November list, not re-checked for this review: the jump-upgrade balcony and the ankle rings (his call after playing B5–B8), and the unanswered [cart first, then trains](plans/cart-then-trains.md) proposal.
- Beam carry: pick a Godot-style option after reading the [comparison](research/beam-carry-godot-comparison.md).

## History

### Next: find the fun (agreed direction, 1 November)

_Historical: the first prototype order, agreed 1 November and moved here from the decision log on 8 November. The now, next and later table above replaces it._

Prototype mechanics only, in this order. Build order and PRs: [find-the-fun.md](archive/plans/find-the-fun.md). Each step goes behind a `?proto=` flag, gets a `/look` motion sheet, and asks one playtest question. If the answer is no twice, change it or cut it instead of adding rewards.

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
