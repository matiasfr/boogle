# Boogle 2.0: the design record

*Decision log, 1 November 2026. The owner's picks from the Boogle 2.0 design thread (rounds 1–8, 29 October to 1 November 2026), written down so another agent can pick it up. On design, this file is authoritative over [docs/research/0.1/SETTLED.md](../research/0.1/SETTLED.md), where the two disagree; `main`'s code is the architecture to build on. Nothing here is built unless [docs/game-design.md](../game-design.md) says so.*

## Where things are

| What | Where |
| --- | --- |
| The interactive concept page: map by era, deep dive, venue paintings, the current round of questions | Boogle 2.0 artifact, https://claude.ai/artifact/JvHs1aHAiGyvZ61PF6ZgoG (private to the owner) |
| Island layout lab: home and archipelago maps, layout options with pick buttons | https://claude.ai/artifact/BQuFyGfrXwuzSm9KeKq1fT (private to the owner); options in [island-layout.md](island-layout.md) |
| Earlier concept pages | "Boogle Grows Up" https://claude.ai/artifact/9iQwPsUqWHxzy5TLENNZwK, "Boogle Crossroads" https://claude.ai/artifact/DMWtrTw6N8vBjKREKYwLcC |
| Painted concepts: 8 eras, the era-2 opening day, the mainland port, 13 venue close-ups | Branch `claude/concept-images`, `concepts/` (a scratch branch, never merged to `main`); prompts in `dev/concepts/` |
| Build spec for eras 1–2 | [vertical-slice.md](vertical-slice.md) |
| Story, gags and finales | [story-and-finale.md](story-and-finale.md), [fourth-melon.md](fourth-melon.md) |
| Progression without mini-games | [progression-paths.md](progression-paths.md) |
| Venues and the hub | [hub-and-minigames.md](hub-and-minigames.md) |
| Does the engine fit? | [docs/plans/boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md) |
| Build plan for "find the fun", one checkbox per PR | [docs/plans/find-the-fun.md](../plans/find-the-fun.md) |
| The game as built; playtest findings | [docs/game-design.md](../game-design.md); [docs/playtests.md](../playtests.md) |
| Research behind it | [docs/research/README.md](../research/README.md) (rail-as-play, progression-models, discovery-progression, system-cohesion, big-walk-and-communal-endings) |

## How the owner works

These are standing preferences from the thread.

- **Feel first.** "Game feel is tantamount." Every interactive thing gets a feel pass before it gets rewards.
- **Mechanics before narrative.** Find the fun in the core loop and its feel first (1 November). Story, characters and gags come later and are easy to fill in. Don't commit to them before the loop works.
- **Think ambitiously.** Early mocks were "too simplistic". The owner wants clear technological stratification between eras, a bigger island, and a city.
- **Likes:** vehicles, exploration, construction you can watch, goofiness, Palworld's take on materials.
- **Wary of:** material grinds.
- **Collaborators may write the narrative.** Don't lock story details in alone. Draft options for them to react to.
- **Decides through HTML pages with pick buttons.** The concept page ends with a round of questions and a copyable summary. Keep its localStorage key `boogle-2-v5`: changing it wipes the owner's picks.
- **Solo first** (1 November). Every prototype must work and be fun for one person playing alone; multiplayer builds on top.
- **Fast iteration over test coverage** (1 November). Agents run many tasks in parallel, see their own results and ship by themselves; tests only where lockstep needs them.
- **Research before deep facets** (1 November). A facet with real depth (level design, vehicle feel, construction, rendering, asset pipelines) starts with deep research into industry practice, written to `docs/research/`, before its options are drafted.
- **Painted concepts** come from `npm run concepts` (the `concept-art` skill). They run through Codex CLI on the owner's Mac, using a session started on that Mac. They're references, not game art.

## Decided

### The shape of the game

- **The island grows through eight technology eras.** It expands outward (reclaimed land) and new islands rise around it.
  1. **The wood age** (in the game; "castaway camp" is a name for its look only)
  2. Steam wagons
  3. Iron and coal
  4. Steel and harbour
  5. Diesel and concrete
  6. Electric
  7. Monorail city
  8. Maglev
- **Steam comes early and keeps getting better.** The industrial eras (3–5) are grimy and smoky, but goofy. The electric era clears the air.
- **The mainland port city** is visible from the start, reachable at the end, and you can walk around it.
- **Old lines upgrade with the eras**, and a heritage narrow-gauge loco keeps running.
- **Pace: fast.** About 1–3 evenings per era.
- **After the finale,** the archipelago stays open as a toy box.
- **The ending is open** (see [story-and-finale.md](story-and-finale.md), section 2).

### Trains and the world

- **2026-11-01, an archipelago, not one big open map.** Islands vary in size (home small and dense, later islands several times larger, the mainland port the one big walkable place). Reaching a new island is an era's payoff, telegraphed by seeing it across the water. Connections are physical (reclaimed land, bridges, causeways you can walk and drive), so late game reads as one connected place. Why: the 29 October playtest found a big island empty; the sea gives natural loading boundaries (architecture-fit, "A world bigger than one island").

- **Trains are ride-only and timetabled.** Their position is a pure function of the world tick, so they cost nothing on the network. You don't drive them.
- **Crates visibly ride the trains** to construction sites.
- **Construction shows both scaffolding and pieces appearing.**
- **Stations are the fast-travel board** (a departures board).
- **Rails from the start.** The wood age lays light rails; there's no plank road.
- **The rail spike comes first,** and its job is to prove that riding feels good.

### Progress and rewards

- **2026-11-01, carrying is a simple back bundle** (haul playtest, solo). Logs sit on the character's back in a compact bundle that fills out rather than towering; no sway, and so no jump spill (nothing would warn you of it). Don't over-index on Death Stranding's carrying. Replaces the wobbly stack, see Changed.

- **"Play is the material"** is the long-term direction (round 2): playing produces what builds the island.
  - **For the slice:** no prize piles; venues give personal rewards only (round 7).
  - **Open:** how play feeds progress is left to the mini-games pass (below).
- **Three things you earn, none of them a shared wallet:**
  - **shared progress**, the island's;
  - **som**, a personal coin, earned only and spent on looks;
  - **knacks**, personal skill per activity, which unlock options and never power.
- **No sponsor plaques.** Work-site plaques credit contributions, but nobody pays for naming rights.
- **Kept from SETTLED:**
  - every system is ignorable;
  - mini-games never gate progress;
  - nothing decays;
  - the beach ball never produces income.

### Characters and story

- **The Boogler is the mayor** (from era 2). His personal friendship ladder stays separate from the economy.
- **Opening days end each era:**
  - any player can start one (round 7);
  - everyone sees the same scripted ceremony;
  - physics props do the comedy.
- **Art:** a painted concept per era, then a building kit and a vehicle kit per era.

### Process

- **2026-11-01, start the asset pipeline now** (owner), ahead of the first authored model: glTF with meshopt or Draco geometry and KTX2 (Basis Universal) textures, ready for Blender (and Blender MCP) to feed it, including animated construction (scaffolding, pieces). Code stays the default where code is quicker or better; the split is written in [asset-pipeline.md](../plans/asset-pipeline.md). Was "when the first authored model lands" (architecture-fit, phase 5), see Changed.

- **2026-11-02, don't over-index on the iPad** (owner). Desktop and iPad both matter; the iPad is one target among others, not the design constraint. Keep it working well, but don't make iPad-specific compromises unless something is clearly too heavy everywhere.
- **2026-11-01, the lowest target device is an M4 iPad Pro** (owner: "likely"). Replaces the 2021 iPad and mid-range Android phone in [architecture.md](../plans/architecture.md)'s assumptions. The visual quality target is set by a code-only graphics spike measured against it (find-the-fun.md, "Depth tracks").

- **2026-11-01, playtests are solo-first.** Each find-the-fun question must be answerable by one person; multiplayer comes after. (Replaces "playtest with 2–4 people", see Changed.)
- **2026-11-01, a lighter test load.** `npm run ship` no longer runs smoke on the Mac by default (`-- --gpu` opts in); smoke runs against the live site after each deploy and nightly. New tests only for lockstep code; features and feel get looked at, not tested. `perf` only for heavy rendering changes.
- **2026-11-01, agents check their own work.** Implementers (Opus, medium effort) look at their own `/look` stills, gut-check, iterate up to three rounds and ship themselves (AGENTS.md, "See it before you ship").
- **2026-11-01, build prototypes in parallel, playtest in order.** Prototypes are built side by side; their questions are still answered in order, and a "no" on hauling still reshapes what follows.

- **Next deliverable:** the vertical slice for eras 1–2, built on the 0.1 haul loop.
- **Mini-games get their own design pass later.** Court ball and the other venues wait for it.

## Changed

- **2026-11-01:** "Playtest constantly with 2–4 real people" (DESIGN.md, How we work) became "solo first": the owner wants each prototype to work for one person before building out.
- **2026-11-01:** the haul stack's sway and jump spill (0.1 groundwork) were cut after the first solo haul playtest: the owner wants a plain back bundle.
- **2026-11-01:** the asset pipeline moved from "when the first authored model lands" to now, so Blender work can start as soon as a look is picked.
- **2026-11-01:** implementers moved from Sonnet to Opus at medium effort.

## Parked by the owner

- **The fourth melon:** the reveal, and whether to keep melons at all ([fourth-melon.md](fourth-melon.md)). Waiting on collaborators.
- **The ending.**
- **All narrative detail** until the core loop is fun.

## Open questions (round 8 and the architecture review)

1. Keep the short bell countdown before opening day (about 10 s)? Research recommends a ~45 s gathering call (smoke column, a bell that carries; ends early once everyone online is at the platform; solo goes straight to the bell) followed by the 10 s bell ([shared-moments-and-events.md](../research/shared-moments-and-events.md), rec 1). Being tried in the era prototype's round 2.
2. When does the mini-games design pass happen?
3. Apply the proposed re-ordering of [architecture.md](../plans/architecture.md) from [boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md)?
4. ~~Who runs the baseline on a 2021 iPad and a mid-range Android phone?~~ Now the M4 iPad Pro (Decided, 1 November). Do phones stay supported at a lower quality, or drop?
5. Should [net-roadmap.md](../plans/net-roadmap.md) get a note that Boogle 2.0 replaces its creature-and-survival framing?
6. ~~Island layout~~ started 1 November as the layout lab ([island-layout.md](island-layout.md), once it exists).
7. A character look track alongside the prototypes (concept art, then Blender modelling and rigging of the player and The Boogler), kept off the game until a look is picked? (Proposed 1 November; see find-the-fun.md, "Depth tracks".)

## Next: find the fun (agreed direction, 1 November)

Prototype mechanics only, in this order. Build order and PRs: [find-the-fun.md](../plans/find-the-fun.md). Each step goes behind a `?proto=` flag, gets a `/look` motion sheet, and asks one playtest question. If the answer is no twice, change it or cut it instead of adding rewards.

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
