# Plan: does the architecture fit Boogle 2.0?

> **Status: proposal (2026-11-01).** An audit of the engine against the Boogle 2.0 design (eight eras, timetabled
> trains, a growing archipelago, a mainland port city; [vertical-slice.md](../proposals/vertical-slice.md),
> [story-and-finale.md](../proposals/story-and-finale.md)). It ends with a proposed re-ordering of
> [architecture.md](architecture.md) phases 3–4 for the owner to approve. Code read on 2026-11-01 at `main` `3bd4617`.

## Verdict

**The core is sound, and nothing needs rebuilding.**

- The vertical slice (eras 1–2 on today's island) can be built on what exists, with one technical risk: carrying a
  player on a moving wagon.
- Four foundation pieces are missing. None of them bites before era 3, when the world has to grow past one island.
- Don't do foundation work before the slice: the slice decides whether the game is worth scaling. Do two cheap things
  now (below).

## What already fits

| Boogle 2.0 needs | What exists | Where |
| --- | --- | --- |
| The island grows while nobody plays | The server hosts every room and saves it to disk; the helper bank runs offline | `server/src/host/`, [server-host.md](server-host.md), `src/sim/bank.ts` |
| Shared projects, eras, order of events | Pure, replay-tested lockstep rules that run the same on the server and in tabs | `src/sim/`, `src/world/rules/`, `test/world-replay.test.mjs` |
| Timetabled, ride-only trains | Scripted runs as a pure function of the tick: any number of trains costs no network traffic | `src/sim/scripted-run.ts` (`runAt`) |
| Personal coin, knacks, hats | A stable player id across visits, and a roster of who's in the room | `src/player/identity.ts`, `src/world/rules/roster.ts` |
| Physics comedy, vehicles | Rapier (6× faster steps than cannon-es, ~2 KB garbage per step) behind a facade with kinematic bodies | `src/physics/engine.ts`, [rapier.md](rapier.md) |
| Smoke, sparks, steam | WebGPU compute particles behind `emit()` | `src/render/particles.ts` |
| A frame budget as content grows | Per-hook profiling (`?prof=1`, `perf`, `hitches`), instance pools | [game-loop.md](game-loop.md) |

## The slice's one risk: riding

The local player is a dynamic Rapier body (`src/player/player.ts`, `makePlayerBody`). Nothing yet carries it on a
moving object.

**Standing on a moving wagon without jitter needs explicit platform carry:**
- add the platform's motion to the player each physics step;
- snap to the platform's floor;
- handle boarding and leaving: inherit its velocity when you jump off, so the tumble works.

Every era's ride depends on this, so it's the rail spike's first task (vertical-slice S2). A kinematic body for the
wagon is already supported (`BODY.KINEMATIC`, `setMotion`).

**Done when:** a `/look` motion sheet shows no jitter at the wagon's top speed, and a jump-off carries the wagon's
speed.

## What's missing, in the order it bites

### 1. A baseline on the target devices (now; cheap)

All recorded numbers are from a Mac ([open-world.md](open-world.md), "Frame-loop audit"). The target is a 2021 iPad
and a mid-range Android phone (architecture.md, "Assumptions"). That baseline is still unchecked in phase 1.

- **How:** run `npm run hitches` and `npm run perf` against both devices with `--url`.
- **Record:** draw calls, frame time and heap per frame.
- **Why now:** it sets each era's budget for smoke, props, trains and view distance, before the art direction commits
  to any of it.

### 2. A world bigger than one island (from era 3)

**Today:** the ground is one 510 m square heightfield (409 × 409 cells, `src/world/grid.ts`), one physics body, and
`src/world/home-land.json`.

**Boogle 2.0 needs:**
- reclaimed land;
- a new island most eras (Mine Isle, Melon Isle, Gary's Yard, the Outer Isles);
- sea crossings;
- a mainland port city you can walk around.

**It takes:**
- **Terrain per island, or in chunks:** a heightfield and static colliders per island, as data both the server and
  the renderer load (net-roadmap phase 3, "The world as data").
- **Cheap distant islands:** far islands and the mainland drawn as simple meshes or impostors until you're near
  (architecture phase 4, `THREE.LOD`).
- **Load and unload by distance:** chunk-aware hooks and pools (game-loop step 6), so a far island costs nothing.
- **Water per island:** the sea and water fields run near the player, not across the whole archipelago.

This is the largest foundation job, and it should be designed before era 3 content starts.

### 3. A pipeline for authored models (when era art goes in)

Every shape today is built in code (DESIGN.md, "Build shapes in code first"). The style board's eight eras of
buildings, vehicles and a city need:

- **Models:** glTF with meshopt compression; KTX2 textures.
- **Build:** hashed outputs and a size budget in CI (`npm run assets`; open-world.md, section 2).
- **Levels of detail** for anything seen from across the sea.

Start it with the first authored model, which is likely era 2's steam wagon once its feel is proven with a
code-built placeholder.

### 4. Sending each player only the state near them (when the world is big)

**Today:** every tab receives and ticks every lockstep state. That's fine for one island with a few hundred piles and
sites, but not for eight eras of construction across many islands.

**The plan:** rules state serialized per chunk, the server sending nearby dirty chunks, and clients mirroring the
rest without ticking it (architecture phase 3, net-roadmap phase 5). Timetabled trains stay free, because they're
functions of the tick, not state.

## Smaller gaps

- **Construction is hard-coded to rail sections.**
  - **Today:** work sites only know "lay this route section" (`src/sim/route.ts`, `src/sim/sites.ts`).
  - **Boogle 2.0 needs:** projects defined as data (a bazaar, a foundry, a bridge) with a cost, a site, scaffolding,
    pieces that appear, and what changes when it's done.
  - **When:** this is game-system work, not engine work. It comes right after the slice proves the loop.
- **The Boogler runs on the "lead" tab.** He hands off when that player leaves (`addHostField`). Net-roadmap phase 3
  moves him onto the server. Not a blocker; it matters more once he walks between islands.
- **WebGPU only.** Some browsers can't play (older Safari, some Firefox and Linux setups). The decision stands; check
  that every regular player's device runs it.
- **A stale checkbox.** In architecture.md, phase 3's "Dedicated server" is unchecked, but the switch shipped in #144
  (every room on the server, no PeerJS). It should be ticked, and its wording ("PeerJS stays the fallback") updated.

## The roadmap was written for a different game

[net-roadmap.md](net-roadmap.md) (2026-10-31) targets a creature-and-survival co-op direction (Palworld, Fortnite,
Big Walk). The Boogle 2.0 design thread is now authoritative on design, and it changes what matters:

| Roadmap item | For Boogle 2.0 |
| --- | --- |
| Server kind for creatures and AI (phase 3) | Still useful for The Boogler and NPCs; creatures aren't planned |
| Co-op authority: combat and hit checks (phase 4) | Mostly unneeded: no combat. Keep the presence sanity checks |
| World as data (phase 3) | **More important:** it's the base for multi-island terrain |
| Interest management and chunks (phase 5) | Needed, but after multi-island terrain and distant islands |
| Proximity voice (phase 8) | Optional; the honk and signal tools carry communication (story-and-finale, "Communication as play") |
| SQLite storage (phase 2) | Useful once per-player data grows (som, knacks, hats); JSON is fine for the slice |

## Proposed re-ordering of architecture.md (for approval)

This keeps everything already done, replaces phases 3–4 with the order below, and changes nothing until the owner
says yes.

**Phase 3: the slice's needs (now)**
- [ ] Tick "Dedicated server" (done in #144) and update its wording.
- [ ] Baseline on the target devices (moved up from phase 1).
- [ ] Platform carry for the player on kinematic bodies (the rail spike's first step).
- [ ] Allocation-free hot path: our hooks under 1 KB/frame (carried over from phase 1).

**Phase 4: a world of islands (after the slice playtest, before era 3)**
- [ ] The world as data: per-island heightfields and static colliders that the server and the renderer both load
      (net-roadmap phase 3, first half).
- [ ] Multi-island terrain and water: more than one heightfield; sea and water fields near the player.
- [ ] Chunk grid, and chunk-aware hooks and pools (game-loop step 6).
- [ ] Distant islands and the mainland as `THREE.LOD` levels and impostors.
- [ ] Projects as data: a general construction system with scaffolding and pieces (game-system work, listed here
      because era 3 depends on it).

**Phase 5: art at scale (when the first authored model lands)**
- [ ] Asset pipeline: `npm run assets` (glTF + meshopt, KTX2), hashed outputs, a size budget in CI.
- [ ] GPU culling with indirect draws for large pools, if `perf` shows draw calls climbing.

**Phase 6: state by relevance (when the archipelago outgrows one tab)**
- [ ] Interest-managed lockstep state per chunk; clients mirror far chunks without ticking.
- [ ] The Boogler (and any NPC) as Server kind; delete the lead and `addHostField`.
- [ ] SQLite for per-player data, when som, knacks and hats outgrow the room JSON.

**Dropped or parked (no Boogle 2.0 need yet)**
- Server-checked combat, and client prediction and reconciliation for your own player (co-op, no PvP).
- Physics in a worker (only if profiling ever shows physics in the top hooks).
- Proximity voice.

## Open questions for the owner

1. Approve the re-ordering above, or keep architecture.md as is?
2. Who has the iPad and the Android phone for the baseline?
3. Should net-roadmap.md get a note that Boogle 2.0 supersedes its creature-and-survival framing?
