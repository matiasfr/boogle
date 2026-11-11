# Decisions

This is the owner's decision log. The roadmap is [direction.md](direction.md); working preferences are in [owner-calls](agents/owner-calls.md). Moved from `docs/proposals/boogle-2.md` on 8 November 2026, text and order unchanged.

_Decision log, 1 November 2026. The owner's picks from the Boogle 2.0 design thread (rounds 1–8, 29 October to 1 November 2026), written down so another agent can pick it up. On design, this file is authoritative over [docs/research/0.1/SETTLED.md](research/0.1/SETTLED.md), where the two disagree; `main`'s code is the architecture to build on. Nothing here is built unless [docs/game-design.md](game-design.md) says so._

Split by topic on 10 November 2026 (owner: "Should we optimize storage of decisions to keep the record but save context reads?", "Yes"). Every entry moved word for word, by `dev/decisions/split.ts` from `origin/main` (874c0b8c); `npm run decisions` proves nothing was lost.

## Decided

Find your task's topic, read that file's **Current rules** (`npm run map -- --section docs/decisions-<topic>.md current-rules`), and open a dated entry only for its full words. Later explicit owner calls win; [owner calls](agents/owner-calls.md) bind every task; [DESIGN](../DESIGN.md) owns principles, plans own tasks, and [game-design](game-design.md) records what exists.

| Topic | File | Holds |
| --- | --- | --- |
| Core loop, pacing and progression | [decisions-core-loop.md](decisions-core-loop.md#current-rules) | The audit picks; The shape of the game; length, abilities, upgrades and the train garage, finds, signposting, loop order |
| Rail, construction, levels and travel | [decisions-rail.md](decisions-rail.md#current-rules) | Trains and the world; track, stations and halts, Home station, Ring Island, the map blockout, the express, construction |
| Rewards, co-op and town roles | [decisions-rewards.md](decisions-rewards.md#current-rules) | Progress and rewards; the shared wallet, Boogles and fares, resources and hauling |
| Characters, cosmetics and story | [decisions-characters.md](decisions-characters.md#current-rules) | Characters and story; Buddy, The Boogler, wearables and the Pause wardrobe |
| Graphics, water, sky and devices | [decisions-look.md](decisions-look.md#current-rules) | Look; water, sky, light and shading, terrain, browsers and devices |
| Audio | [decisions-audio.md](decisions-audio.md#current-rules) | Sound (listening-pack audit, 2026-11-01) |
| Controls, HUD and arrival | [decisions-controls.md](decisions-controls.md#current-rules) | Controls; one thing in hand, cinematics and shared moments, first visit, resets, the pause menu |
| Architecture, tools and prototype lifecycle | [decisions-process.md](decisions-process.md#current-rules) | Process; architecture, ECS and replication, prototypes, playtests, tooling and how agents work |
| Open questions and parked | [decisions-open-questions.md](decisions-open-questions.md) | Parked by the owner; Open questions (round 8 and the architecture review) |
| Calls made without the owner, still open | [agent-calls.md](agent-calls.md) | One table per topic above |
| Archive (history, not for current work) | [decisions-archive.md](decisions-archive.md) | Superseded entries, calls the owner has ruled on, the "Changed" record, the retired current-decision index |

## Recording a decision

- An owner decision is a dated entry at the top of its topic file's "Decided": `- <a id="d-YYYY-MM-DD-short-slug"></a>**YYYY-MM-DD, the rule in a few words** (owner: "his words"). The rule.` Add its line to that file's "Current rules", linking to the anchor. A decision for two topics goes in the one it changes most, with a link from the other's rules.
- When it supersedes an entry by name: move the old entry, word for word, to its topic's section of the archive with an `_Archived ..._` note, and drop its rules line; if it replaces only part, keep the entry and add an italic note to its rules line.
- A call made without the owner is a row at the top of its topic's table in [agent-calls.md](agent-calls.md). When he confirms or overrules it, record his decision as above and move the row, word for word, to its topic's archive section.
- Nothing is added to this file. `npm run decisions` (also run by `npm run registry`) fails on an entry here, a ruled row left in the live calls table, an entry without a rules line, or a link to a heading that does not exist.

## Moved sections

Links into the old single file land here; each points to where its section went.

### Current-decision index

Retired 10 November 2026: use the table above. Its text: [archive](decisions-archive.md#current-decision-index).

### The audit picks (2 November)

[decisions-core-loop.md](decisions-core-loop.md#the-audit-picks-2-november)

### The shape of the game

[decisions-core-loop.md](decisions-core-loop.md#the-shape-of-the-game)

### Trains and the world

[decisions-rail.md](decisions-rail.md#trains-and-the-world)

### Progress and rewards

[decisions-rewards.md](decisions-rewards.md#progress-and-rewards)

### Characters and story

[decisions-characters.md](decisions-characters.md#characters-and-story)

### Look

[decisions-look.md](decisions-look.md#look)

### Sound (listening-pack audit, 2026-11-01)

[decisions-audio.md](decisions-audio.md#sound-listening-pack-audit-2026-11-01)

### Controls

[decisions-controls.md](decisions-controls.md#controls)

### Process

[decisions-process.md](decisions-process.md#process)

### Changed

[decisions-archive.md](decisions-archive.md#changed)

### Parked by the owner

[decisions-open-questions.md](decisions-open-questions.md#parked-by-the-owner)

### Open questions (round 8 and the architecture review)

[decisions-open-questions.md](decisions-open-questions.md#open-questions-round-8-and-the-architecture-review)
