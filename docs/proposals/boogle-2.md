# Boogle 2.0: the design record

*Decision log, 1 November 2026. The owner's picks from the Boogle 2.0 design thread (rounds 1–8, 29 October to 1 November 2026), written down so another agent can pick it up. On design, this file is authoritative over [docs/research/0.1/SETTLED.md](../research/0.1/SETTLED.md), where the two disagree; `main`'s code is the architecture to build on. Nothing here is built unless [docs/game-design.md](../game-design.md) says so.*

## Where things are

| What | Where |
| --- | --- |
| The interactive concept page: map by era, deep dive, venue paintings, the current round of questions | Boogle 2.0 artifact, https://claude.ai/artifact/JvHs1aHAiGyvZ61PF6ZgoG (private to the owner) |
| Earlier concept pages | "Boogle Grows Up" https://claude.ai/artifact/9iQwPsUqWHxzy5TLENNZwK, "Boogle Crossroads" https://claude.ai/artifact/DMWtrTw6N8vBjKREKYwLcC |
| Painted concepts: 8 eras, the era-2 opening day, the mainland port, 13 venue close-ups | Branch `claude/concept-images`, `concepts/` (a scratch branch, never merged to `main`); prompts in `dev/concepts/` |
| Build spec for eras 1–2 | [vertical-slice.md](vertical-slice.md) |
| Story, gags and finales | [story-and-finale.md](story-and-finale.md), [fourth-melon.md](fourth-melon.md) |
| Progression without mini-games | [progression-paths.md](progression-paths.md) |
| Venues and the hub | [hub-and-minigames.md](hub-and-minigames.md) |
| Does the engine fit? | [docs/plans/boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md) |
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

- **Trains are ride-only and timetabled.** Their position is a pure function of the world tick, so they cost nothing on the network. You don't drive them.
- **Crates visibly ride the trains** to construction sites.
- **Construction shows both scaffolding and pieces appearing.**
- **Stations are the fast-travel board** (a departures board).
- **Rails from the start.** The wood age lays light rails; there's no plank road.
- **The rail spike comes first,** and its job is to prove that riding feels good.

### Progress and rewards

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

- **Next deliverable:** the vertical slice for eras 1–2, built on the 0.1 haul loop.
- **Mini-games get their own design pass later.** Court ball and the other venues wait for it.

## Parked by the owner

- **The fourth melon:** the reveal, and whether to keep melons at all ([fourth-melon.md](fourth-melon.md)). Waiting on collaborators.
- **The ending.**
- **All narrative detail** until the core loop is fun.

## Open questions (round 8 and the architecture review)

1. Keep the short bell countdown before opening day (about 10 s)?
2. When does the mini-games design pass happen?
3. Apply the proposed re-ordering of [architecture.md](../plans/architecture.md) from [boogle-2-architecture-fit.md](../plans/boogle-2-architecture-fit.md)?
4. Who runs the baseline on a 2021 iPad and a mid-range Android phone?
5. Should [net-roadmap.md](../plans/net-roadmap.md) get a note that Boogle 2.0 replaces its creature-and-survival framing?

## Next: find the fun (agreed direction, 1 November)

Prototype mechanics only, in this order. Each step goes behind a `?proto=` flag, gets a `/look` motion sheet, and asks one playtest question. If the answer is no twice, change it or cut it instead of adding rewards.

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
