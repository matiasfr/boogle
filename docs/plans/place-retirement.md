# Plan: retire `?proto=place`, port what is left into the live game

Prepared 9 November 2026 against `origin/main` `46eb7125`. Planning only; no code changed. Jobs are sized for one
agent each (Codex gpt-6.1-sol or a Claude subagent, per `npm run models`).

**Owner calls behind this plan (9 November 2026):**
- **"Yes now. Then implement"**: approves writing this plan and then building it.
- **"Then delete proto place"**: the last jobs delete `src/proto/place/index.ts`, the `?proto=place` entry
  (`src/features/proto-place.ts` and the flags), every Place-only module and every tool that drives it. Still-used
  modules move to proper homes. No legacy entry is left behind.
- **"Town in for playtest!"**: the town jobs come first and stay small enough to land soon.
- **"In general I do not want anything held up for playtest."** This replaces the pre-playtest/post-playtest split.
  Every job proceeds in order and none waits for a playtest. Split-rock J3 also starts now, in parallel
  ([split-rock-roundhouse](split-rock-roundhouse.md)).

**Binding earlier calls** (read from [the decision log](../decisions.md), split from boogle-2.md on 9 November into
`docs/decisions.md` and `docs/direction.md`; the dates stay the same):
- **2026-11-02, numbers go on what everyone shares.** Town population and level are shared.
- **2026-11-02, the town you can go into**: house, shop and museum, all three ([place](../game-design/place.md),
  "The town you can go into"). **2026-11-02, gifts hint at themselves and start as cosmetics.**
- **2026-11-04, move across in steps on main**: "Let's not keep having old prototype code in the build".
  `src/proto/place` goes with the last slice ([production-core](production-core.md), slices 5–7).
- **2026-11-06, economy principles amended**: progression is completely shared, and a shared currency's upgrades
  apply to everyone. What you wear from secret crates, and certain wearables, stay personal. Money in dialogue
  stays a joke.
- **2026-11-06, first prototype answers**: keep the telescope's fixed view and drop the panning variant.
- **2026-11-07, line 2 part 2 answers** ([line2-part2-greybox](line2-part2-greybox.md#open-questions-for-the-owner-answered-7-november)):
  the glider stays out of part 2 and its spot is kept for the movement slice. Train cargo and town growth stay with
  production-core slice 5.
- **2026-11-08, a world wipe is a new save**: a `WORLD_NS` bump resets progress-like local data.
- **The Boogler's copy and the town's words are never edited.** `town-lines.ts` moves verbatim, and so do the gift
  names and lines in `gifts.ts`.

## Goal

Every system a player can meet in `?proto=place` either runs in the live game (boogle.club with no `?proto`) or is
dropped, with the decision that allows dropping it. After that, `src/proto/place/` and its entry are deleted. The
town comes first: buildings, interiors, residents, then the shop and museum opening on the server's first-path fact.

This serves DESIGN.md **6, Communal world, personal things**: the town's state comes from the shared railway, while
finds, cosmetics and what residents told you stay personal. It also serves **9, Leave something for the next
visitor**, and the technical principles **Understandable at a glance** and **Small and readable**: one game, one
entry, no second copy of the railway. It bends no principle.

## What the live game already has (verified on `46eb7125`)

- The bare address runs the production railway. `isProductionRailway(search)` in `src/proto/flags.ts` is true only
  when the address has no `proto`. `src/features/proto-place.ts` imports `src/proto/place/index.ts` only when
  `protoOn('place') && !productionRailway`. **Caveat:** `pageQuery()` still sets the effective `proto=place` for the
  bare address. Production therefore has `PROTO === 'place'`, and several consumers depend on it (listed under D1).
- **Reachability**, computed from `src/boot/index.ts` through `main.ts`'s globs with `index.ts` excluded (method:
  static and dynamic relative imports):
  - **86 of 97** files in `src/proto/place/` are reachable. 35 of them are reachable only through the Dev menu's Place
    adapter, `src/debug/dev/place.ts`, which `camera.ts`, `inspect.ts`, `room.ts` and `scenarios.ts` load whenever
    `PROTO === 'place'`, so also in production.
  - **51** are reachable from gameplay alone (50 `.ts` files plus `place.css`), almost all through
    `src/entities/railway/*` dynamic imports.
  - The brief's "84" matches the Dev-inclusive count.
- The per-frame systems (`updateTownLife`, `updateGifts`, `updateCrystals`, `updateFinds`, `updateTech`, `updateLamps`,
  `updateBuoys`, …) are started only by `src/proto/place/index.ts`.

## Inventory: every Place module

**Port** means the job named brings it to production. **Replaced** names the production file that already does
it. **Drop** names the decision that allows it. **Move** means production already uses it, and it moves out of
`src/proto/place` in R1–R3.

### Town (port; jobs T1–T6)

| Module | Verdict |
| --- | --- |
| `rooms.ts` (shells, cutaway, indoor camera, stake boards) | Port, T1 |
| `house.ts` | Port, T1 |
| `growth.ts` (facts the town notices) | Port as pure `src/sim/town-facts.ts`, T1. Place keeps its own copy until D1. |
| `town-life.ts` (wiring) | Replaced by the new `src/entities/town/` entity in T1. Kept as Place's wiring until D1. |
| `residents.ts` (Pip, Button, Nell, Moss, Wren, notices, rumours, street chatter) | Port, T2. Its shore-worker block is already **replaced** by `src/entities/railway/greeter.ts` (Sleeves). |
| `town-lines.ts` | Port verbatim, T2. Never edited. |
| `museum.ts` | Port, T3. It opens on the first-path fact. |
| `shop.ts` (Fine Prices) | Port, T5, after the wardrobe (T4). It opens on the first-path fact. |
| `town.ts` (cargo-built rows `TOWN.wood`/`TOWN.stone`, camps waking, fireworks, chimney smoke) | Port, T6, driven by railway milestones (**owner question 1**). `TOWN.start` and `camps[].asleep` are already **replaced** by `opening-view.ts`'s static `openingBuildings()`. |
| `workshop.ts` (the walk-in forge) | Port, T6 (owner-approved 5 November). Its trigger depends on **owner question 1**. |

### Gifts and cosmetics (port; jobs T4, C1, C2)

| Module | Verdict |
| --- | --- |
| `gifts.ts`: catalog (`GIFTS`, `STOCK`, parts, tiers, odds, `PITY`) | Port verbatim to `src/render/cosmetic-parts.ts`, T4 |
| `gifts.ts`: what you wear (`placeClothes`, try on, wear, swap) | Port to `src/entities/wardrobe/`, T4. This unifies production's `railwayCosmetic`/`railwayScarf` (in `reward.ts`). |
| `gifts.ts`: the crate, its roll, the curio shelf | Port, C1. Boxes after T2 depend on **owner question 3**. The first two boxes (hat, scarf) are already **replaced** by `reward.ts`'s T1/T2 claims. |
| `gifts.ts`: the stowaway (`placePet`) | Port, C2 |
| `gifts.ts`: tool chests (`EXTRAS`, `dropChest`) | Replaced by `reward.ts`, `tools.ts` and `ability-arrival.ts` (axe, pack, jump, hook) |
| `got.ts` | Replaced by `reward.ts`'s `createRewardReveal` instance |

### Crystals and finds (port; jobs K1, F1–F3)

**Fit check first** (owner, 9 November): every port still to build gets a designer check (keep, change or cut) before it starts; see owner-calls, "Port from Place only what still fits".

| Module | Verdict |
| --- | --- |
| `crystals.ts` | Port, K1. Personal by default (**owner question 2**). |
| `props.ts`: gold finds and the finds board | **Cut** (owner, 9 November). F1 shipped them in #1269; they come out again. |
| `tech.ts`: secrets and the finders' bay | Port, F2. Glide-only secrets go straight to the bay (**owner question 5**). |
| `props.ts`: buoys; `props.ts` + `telescope.ts` + `telescope.css`: the telescope | Port, F3, with the fixed view only (6 November) |
| `props.ts`: the boiler by the forge | Replaced by `boiler-view.ts` |

### Small Local pieces (port; job A1)

| Module | Verdict |
| --- | --- |
| `ambience.ts` (sea, gulls, breeze) | Port, A1. The 1 November sound call asked for a tweaked ambience, not a cut one. |
| `flag.ts` (playtest bookmark, M or d-pad right) | Port, A1 |

### Replaced in production (deleted in D1)

| Module | Production replacement |
| --- | --- |
| `run.ts`, `lines.ts`, `verbs.ts` | `entities/railway/view.ts`, `line2-view.ts`, `src/sim/railway-*` |
| `job.ts`, `score.ts` | The Server railway (`src/world/railway-server.ts`); `counts.score`. One live read, `look-kit.ts`'s `job.boiler`, is cut in D1. |
| `coop.ts`, `coop-identity.ts`, `big-cargo.ts`, `train-nudge.ts` | Replication (`railway-replicate.ts`, `adapters/railway.ts`) |
| `chop.ts` | `entities/railway/sources.ts`. Its motion lives on in `chop-motion.ts`, which moves. |
| `drop.ts` | `sources.ts` drop → `adapter.drop` (`rail.drop`) |
| `forge.ts` | `line2-view.ts` (forge) and `boiler-view.ts` |
| `depot.ts` | `cart-view.ts`, `line2-view.ts` |
| `cargo.ts` | `train-view.ts`, `line-cargo.ts`. Cargo-built town is slice 5, see owner question 1. |
| `halts.ts` | `halts-view.ts` |
| `ladder.ts` | `reward.ts`, `tools.ts`, `ability-arrival.ts` |
| `pair.ts`, `great-carry.ts` | `beam-drag.ts` (`railwayBeamHelp`) |
| `celebrate.ts` | `src/render/camera-pull-out.ts`, `src/render/wake-presentation.ts` |
| `lamps.ts` | `path.ts` (line 1's lamps), `far-head-view.ts` (line 2's) |
| `moves.ts`, `moves-view.ts` | `tools.ts` (second jump), `hook-shot.ts`, `hook-view.ts`. The glider is **dropped** (7 November; **owner question 5**). |
| `tech.ts` (devices, slabs, rings) | `tools.ts`, `hook-view.ts`, `sea-gate-view.ts`, `line2-view.ts` (quarry lever) |
| `objective.ts` | `adapters/railway-marks.ts` journey marks. The player-facing objective was removed on 3 November. |
| `nearest.ts` | Used only by the Place bot and `objective.ts`; goes with them |
| `panel.ts` | Dev only. Production uses `--rail-seed` and `src/debug`. |
| `dismiss-pointer.ts` | A re-export of `src/player/dismiss-pointer.ts` |
| `look-gtao.ts` | Drop: 2 November look test, "GTAO wasn't worth it" |
| `index.ts` | Deleted in D1 |

### Already live (move in R1–R3; 51 files)

`axe-models` `axe-sparkle` `building-plans` `carry-models` `chatter` `chop-motion` `chop-timing` `cove` `cove-ground`
`cove-material` `cove-sand` `cove-stop` `cove-textures` `cove-tuning` `cove-view` `far-ground` `folk` `gear-models`
`head-clearance` `job`¹ `land` `layout` `look` `look-kit` `machine-model` `machine-panels` `opening-models`
`opening-plans` `opening-stops` `part-geometry` `pieces` `place.css` `pose` `prop-kit` `rail` `seat` `seat-claims`
`shore-layout` `signs` `sites` `spatial-station` `stations` `support` `talk` `tech-layout` `terrain` `track-panels`
`train-load` `tree-catalog` `tree-sources` `water`.

¹ `job.ts` is live only through `look-kit.ts`'s boiler visibility. D1 cuts that read and deletes `job.ts`.

These also import shared prototype helpers that must graduate with them: `src/proto/flat.ts`, `src/proto/net/boxes.ts`,
`src/proto/net/box-plan.ts`, `src/proto/net/crates.ts`, `src/proto/wagon/look.ts` and `src/proto/minis/common.ts`.
Town code also uses `src/proto/net/town-fx.ts` and `src/proto/era/blocks.ts` (types).

## Design

### Sync kind and authority, per piece of state

| State | Kind | Authority and API |
| --- | --- | --- |
| Shop open, museum open (the first path is open) | **Server**, read only | `line2Open(s)` (T3's completion), the fact `view.ts`'s `opened()` already uses. It is a threshold the server owns. Clients never predict completions. |
| Town facts, level and population | **Server**, derived | Pure functions of replicated railway components in `src/sim/town-facts.ts`. Every client computes the same result from the mirror. No new component, op or save. |
| Town growth rows and the workshop | **Server**, derived | The same facts (owner question 1). The building show is Local presentation. |
| Which room you're in, the indoor camera, wall cutaway | **Local** | `rooms.ts` |
| Speech bubbles, street chatter, a conversation | **Local** | `folk.ts` barks, `talk.ts` / `src/player/conversation.ts` |
| What residents told you (met, noticed, said, rumour, hello, street) | **Personal Local** | localStorage `boogle.railway-town.v0:<railwayRoomId>:<pid>`, pruned by `world-reset.ts` |
| Trying something on | **Local** | The wardrobe's `tried` |
| What you own and wear (shop, boxes, secrets) | **Personal Local** for ownership; **Owner** for what is worn | localStorage `boogle.railway-wardrobe.v0:<railwayRoomId>:<pid>`. Presence key `wardrobe`. T1/T2's hat and scarf stay in `railway-profile.ts` claims. |
| The stowaway following you | **Owner** | Presence key `stowaway` (`{ riding: boolean }` or null) |
| Opened station boxes, box roll and pity | **Personal Local** | The wardrobe store (`opened`, `dry`). Eligibility comes from server completions, as T1/T2 do. |
| Found crystals, gold finds, secrets, missed-prize boxes taken | **Personal Local** (owner question 2 for crystals) | localStorage `boogle.railway-finds.v0:<railwayRoomId>:<pid>`, with separate `crystals`, `finds`, `secrets` and `hubbed` fields. This fixes the audit's duplicate `finds` key by design ([state-ownership audit](../research/state-ownership-audit.md), rows 25–27). |
| Buoys, telescope view, ambience, playtest flag | **Local** | No state |

Why the coordinator's "server-owned crates, crystals and secrets" is not the default:
- The 2026-11-06 call keeps secret crates and wearables personal.
- The audit (rows 22–27) and DESIGN 6 ("Personal finds … stay yours") say the same.
- Each player keeps the moment of discovery.
- No railway file changes, so this plan does not collide with J3.

Owner question 2 offers shared crystals as the alternative.

### WORLD_NS

**No job in this plan bumps `WORLD_NS` (v21).** Every shared fact the town needs is already in replicated
components (`job.completion`, `forge.lit`, `rail.trains`, `qjob.completion`). Every personal store is a localStorage
key that contains `railwayRoomId(...)`, so `world-reset.ts` prunes it on any bump. J3 keeps "the next free version",
which will be v22.

The only exception is owner question 2 answered "shared". In that case K1 adds a `crystals` int bitmask to the `Rail`
component and a `rail.crystal { id }` op. It validates reach on the server, predicts on the client, and bumps
`WORLD_NS` **on merge**: v22 if J3 hasn't merged, v23 if it has. It adds a dated history line, and it rebases over
J3's files (`railway-world.ts`, `railway-systems.ts`, `railway-server.ts`, `railway-predict.ts`, `adapters/railway.ts`).

### The town facts (T1)

`src/sim/town-facts.ts` is pure. It imports only `./railway.ts` (type) and `./railway-line2.ts`.

```ts
export const TOWN_FACTS = ['path', 'forge', 'depot', 'head', 'trains', 'town', 'stone', 'pier'] as const; // town-lines.ts's Fact, same order
export type TownFact = (typeof TOWN_FACTS)[number];
export const TOWN_PEOPLE = { start: 12, path: 8, head: 6, pier: 6 } as const; // Place: TUNE.people, run.ts +8/+6, cargo.ts +6
export function townHas(s: Railway, f: TownFact): boolean;
export function newestTownFact(s: Railway): TownFact | null; // the last true one in TOWN_FACTS order
export function townLevel(s: Railway): number;               // how many facts are true
export function townPopulation(s: Railway): number;          // start + 8·path + 6·head + 6·pier
```

| Fact | Production rule |
| --- | --- |
| `path` | `line2Open(s)` (T3 complete) |
| `forge` | `line2Lit(s)` |
| `depot` | `line2Completed(s) >= 1` (Q1 done; the cart starts serving Q2) |
| `head` | `line2Completed(s) >= 5` (Q5 reaches Far Head) |
| `trains` | `(s.line2?.trains ?? -1) >= 0` |
| `pier` | `line2Completed(s) >= 6` |
| `town`, `stone` | `false` until T6. With owner question 1 = yes: `town` is `line2Lit`, `stone` is `head`. |

Facts read only completion and threshold fields, never predicted counts.

### The town entity

- `src/entities/town/`: `index.ts` (`defineKind('town', { update: 11 })`, after the railway's `update: 10`),
  `state.ts` (`inspectTown()`, `setTownView()`) and `view.ts` (`createTownView(read)`).
- It spawns only when `productionRailway`. It registers `registerInteractable(() => active?.targets() ?? NO_TARGETS)`
  and calls `warmUp(() => loaded, { beforeScene: true })`, as `entities/railway/index.ts` does.
- It reads the railway through a new cheap accessor in `src/entities/railway/state.ts`:
  `railwayRead = () => read?.() ?? null`, set by `setRailwayRead(adapter.inspect)` in `entities/railway/index.ts`.
  `adapter.inspect()` is cached and returns the same object until something changes. `inspectRailway()` walks the
  whole railway scene (`owner.counts()`), so the town calls it at most every 0.5 s, for the museum table and
  `reward.busy` only.
- The town never imports the railway's `view.ts` and never edits it.
- Until R3, the view loads the Place modules with `import()`, as `entities/railway/view.ts` does today.
- Each Place module the town mounts becomes a factory that takes an `OwnedView` and an env, following the
  `land.buildLand(owner)` and `rail.buildMachine(owner, …)` precedent:
  - `scene.add` → `owner.add`;
  - `addStatic(…, owner)`;
  - `registerInteractable` → a returned `targets()`;
  - `camConstraints` push/splice and `registerStepFloor` unregister go in `owner.cleanup`.
- Place's `town-life.ts` mounts the same factories with a Place env until D1, so `?proto=place` and its tooling stay
  green until X1 has moved the tooling.

`TownEnv`, passed to every town factory:

```ts
type TownEnv = {
  has(f: Fact): boolean; newest(): Fact | null; level(): number; people(): number;
  awake(): boolean;      // the machine is awake (Place: job.awake; production: phase not asleep/waking)
  money(): number;       // Place: money(); production: counts.score
  hush(): boolean;       // a reveal or conversation is up (production: reward.busy sampled at 4 Hz, || conversation.open)
};
```

### Personal stores

Each store has one module with `load()`, which validates and returns empty on bad data, and a debounced `save()`.
Keys are built as `ability-arrival.ts` does: `` `boogle.railway-<x>.v0:${railwayRoomId(getRoomId())}:${identity.pid}` ``.
Add the three prefixes to `ROOM_PREFIXES` in `src/player/world-reset.ts` and add one case to
`test/world-reset.test.ts`. Write no migrations (mixed-builds).

### Presence keys (new; untaken on `46eb7125`)

- `wardrobe`: `{ hat?: id, accessory?: id, outfit?: id }`, or null when nothing is worn. It replaces
  `railwayCosmetic` and `railwayScarf` (dev phase, no compatibility).
- `stowaway`: `{ riding: boolean }` or null.
- Receivers accept only catalog ids. They sweep per-remote meshes in `onPeerRemoved`. Getters return null when off.

### Interactable ids and playdata

- **Interactable ids** keep Place's names (`place-talk-<id>`, the shop's verbs), so evals carry over.
- **Marks** keep Place's names: `entered building <id>`, `talked to resident`, `rumour heard`, `rumour overheard`,
  `resident noticed`, `shop tried on`, `shop kept`, `shop swapped`. New marks: `crate opened`, `crystal found`,
  `find found`, `secret found`, `secret at the hub`.
- **`RAILWAY_BEATS`** in `dev/playtest/beats.ts` gains, in the job that emits each mark:
  - `entered a building` /^entered building/
  - `visited shop or museum` /^entered building (shop|museum)$/
  - `talked to a resident` /^talked to resident$/
  - `heard a rumour` /rumour/
  - `a resident noticed` /^resident noticed$/
  - `tried something on` /^shop tried on$/
  - `took something from the shop` /^shop kept$/
  - `swapped on the rail` /^shop swapped$/
  - `opened a crate` /^crate opened$/
  - `found a crystal` /^crystal found$/
  - `found a find` /^find found$/
  - `found a secret` /^secret found$/

### Homes for moved modules (the end state)

`src/proto/place/` no longer exists. The prototype helpers it used graduate.

| Destination | What goes there | Why |
| --- | --- | --- |
| `src/place/` (new domain, like `src/island/`) | Land and layout shared by several entities: `layout`, `terrain`, `shore-layout`, `tech-layout`, `spatial-station`, `support`, `chop-timing`, `tree-catalog`, `tree-sources`, `pose`, `cove*`, `far-ground`, `land`, `water`; and the village presentation used by both the railway and town entities: `folk`, `chatter`, `talk`, `sites`, `signs`, `building-plans`, `opening-plans`, `opening-models`, `opening-stops`, `look`, `look-kit`, `pieces` | `src/world/` is lint-headless and holds shared sync state, so land geometry doesn't belong there. Entities may not import each other's internals. A domain module is the shared home `src/README.md` already uses for the classic island. |
| `src/entities/railway/` | `rail`, `stations`, `seat`, `seat-claims`, `track-panels`, `machine-model`, `machine-panels`, `train-load`, `chop-motion` | Used only by the railway entity |
| `src/entities/town/` | `rooms`, `house`, `shop`, `museum`, `residents`, `town-lines` (verbatim), growth rows, `workshop`, curio shelf | Used only by the town entity |
| `src/entities/wardrobe/`, `src/entities/finds/`, `src/entities/lookout/` | New in T4, K1/F1/F2 and F3 | |
| `src/render/` | `part-geometry`, `prop-kit`, `gear-models`, `axe-models`, `carry-models`, `axe-sparkle`; Place's `head-clearance.ts` merged into the existing `src/render/head-clearance.ts`; `proto/flat.ts`, `proto/net/boxes.ts`, `proto/net/box-plan.ts`, `proto/net/crates.ts`, `proto/wagon/look.ts`; `proto/minis/common.ts`'s sounds as `src/render/fanfare.ts`; `proto/net/town-fx.ts`'s shells | Render primitives. Other prototypes import them from the new home. |
| `src/entities/railway/railway.css`, `src/entities/town/town.css` | The live rules of `place.css` (`.place-talk*`, `.place-bark`, `.place-nums`, …) | `place.css` goes |

Moved files may not keep `else scene.add`/`onFrame`/`addBody` fallbacks. `boogle/use-an-entity` applies outside
`src/proto`, and `lint-suppressions.json` never grows. The owner parameter becomes required, and module-level frame
work becomes a method the entity calls: `seat.ts`'s two `onFrame`s, `rail.ts:1341`, `look-kit.ts:532/550`,
`folk.ts:55` and `look.ts:332`.

## Jobs and order

```
T1 town entity, facts, rooms, house ─► T2 residents ─► T3 museum ─────────────────────────────┐
T4 wardrobe ─► T5 shop (needs T1) ─► C1 boxes + curio shelf ─► C2 stowaway                     │
T1 ─► T6 growth rows + workshop (owner Q1)                                                     │
C1 ─► K1 crystals ─► F1 gold finds ─► F2 secrets + finders' bay                                ├─► D1 delete Place ─► R1 render ─► R2 src/place ─► R3 entity views; dir gone
F3 buoys + telescope, A1 ambience + flag: any time                                             │
X1 tooling onto production: any time; must land before D1 ────────────────────────────────────┘
J3 (split-rock) runs in parallel throughout; no shared file unless owner Q2 = shared.
```

- **Start at once:** T1, T4, A1, F3 and X1. They share no files.
- **In order:** T2 → T3, T4 → T5 → C1 → C2, and C1 → K1 → F1 → F2. T6 waits only for T1 and owner question 1.
- **D1 waits for every port and for X1.** R1–R3 follow D1, in order. Each R job is mechanical and short-lived: land it
  the day it is rebased, and announce it to the orchestrator so J4/J5 rebase onto it.

Every job:
- branches from `origin/main`, lands on main by itself and leaves the game playable;
- runs `npm run check`;
- leaves `npm run playthrough -- --long --eval dev/look/evals/railway-job.ts --query 'shot=play'` (the production bot,
  `dev/look/bots/railway.ts`) passing, with no new missing beat;
- updates the owning game-design section (`docs/game-design/place.md`, "The town you can go into", and its siblings);
- ships with a still in the commit body (`npm run ship`).

Where a job adds meshes, it runs before and after:
- `npm run bench -- --poses town,spawn`;
- the phone profile, `npm run bench -- --poses town --size 375x812 --query 'q=mobile&dev=1&graphics=msaa:false'`.

---

### Job T1: the town entity, facts, rooms and house

**Files.**
- New: `src/sim/town-facts.ts`, `test/town-facts.test.ts`, `src/entities/town/index.ts`, `src/entities/town/state.ts`,
  `src/entities/town/view.ts`, `dev/look/evals/railway-town.ts`.
- Edited:
  - `src/entities/railway/state.ts` (`railwayRead`, `setRailwayRead`);
  - `src/entities/railway/index.ts` (two lines);
  - `src/entities/railway/opening-view.ts` (population from `townPopulation`);
  - `src/proto/place/rooms.ts`, `house.ts`, `sites.ts`, `town-life.ts`;
  - `docs/game-design/place.md`.

**Steps.**
- [x] **T1a. Facts.** Write `src/sim/town-facts.ts` as in Design. Write `test/town-facts.test.ts` on the seed helpers
  `dev/look/rail-seed.ts` uses (`test/helpers/railway-q2.ts`, `test/helpers/railway-trains.ts`):
  - `'a fresh railway has no facts and 12 people'`;
  - `'the first path opens on T3 completion: path, 20 people'`;
  - `'q1-done: path, forge, depot'`;
  - `'trains-on adds trains'`;
  - `'q6-done: every milestone fact, 32 people'`;
  - `'town and stone stay false'`;
  - `'newest is the last true fact in TOWN_FACTS order'`.
- [x] **T1b. Railway read.** Add `railwayRead` and `setRailwayRead` to `entities/railway/state.ts`. In
  `entities/railway/index.ts`, call `setRailwayRead(adapter.inspect)` after `createRailwayAdapter`, and
  `setRailwayRead(null)` in `dispose`. In `opening-view.ts`, replace `layout.TUNE.people + (pathOpen ? 8 : 0)` with
  `townPopulation(env.progress())` for both `setPopulation` and `signs.setNumbers`.
- [x] **T1c. Sites take an owner.** In `sites.ts`, `buildSites(owner?: OwnedView)` keeps the owner for `dropSet(boxes,
  onLand, owner)` and for every `hullBodies(…, owner)` in `solid()`, and returns a disposer that removes `sites`
  entries added since its last call. Place calls it with no owner, as now.
- [x] **T1d. Rooms as a factory.** In `rooms.ts`, replace module-level construction with
  `createRooms(owner: OwnedView, env: { up(id: RoomId): boolean })`. It returns `{ rooms, indoors, onRoom,
  indoorCamera, update(dt), warm(), snap(), stakeBoard, plankFloor, roomMesh, plate, addSolid, roomToWorld,
  worldToRoom, DOOR }`.
  - Import `merged` from `./part-geometry.ts`, not `./gifts.ts`.
  - Move `camConstraints.push(indoorCamera)` here, with a splice in `owner.cleanup`. Put `registerStepFloor`'s return
    in `owner.cleanup`.
  - `house.ts` becomes `createHouse(owner, rooms, env)`. Its `stageOf(FACTS)` reads `env.has`.
  - Place's `town-life.ts` builds both with a Place env (`L1.open`, `growth.ts`) and a never-disposed owner.
- [x] **T1e. The town entity.**
  - `view.ts` builds an owner and imports `rooms`, `house` and `sites`.
  - `up = (id) => id === 'house'`. In T1 the shop and museum keep their stake boards (the town's words: "Fine Prices,
    coming soon"; "A museum, once there is something to show").
  - Call `sites.buildSites(owner)` and `rooms.warm()`.
  - `update(ctx)` runs `rooms.update(dt)` and `house.update()`.
  - `inspect()` returns `{ facts, level, population, rooms: { house: { up }, … }, indoors }`.
- [x] **T1f. Eval.** Write `dev/look/evals/railway-town.ts`, modelled on `railway-b5b8-at.ts`. It waits for
  `inspectTown()` and `railwayRead()?.ready`. `townat=house|shop|museum|street` puts Buddy 1 m inside that door,
  facing in, with the debug camera behind. `townact=talk|try|take|walkout` then presses Interact with
  `interactDown()`/`interactUp()` from `src/player/hands.ts` (as `dev/look/bot.ts`'s `press()` does) once the matching
  target is offered, and `walkout` walks Buddy
  3 m out of the door. It prints `TOWN <json>`. T2 and T5 add their `townact` cases.

**Proofs.**
- `npm run check`.
- `node --test test/town-facts.test.ts`.
- Stills:
  - `npm run look -- --question "Can I walk into the house, and does the roof lift?" --eval dev/look/evals/railway-town.ts --query 'townat=house'`;
  - the same with `townat=street` on a fresh world (shop and museum boards);
  - `--rail-seed q1-done` (boards still up in T1).
- Real time: `--video` walking in and out once, to check the cutaway.
- The railway bot.
- `npm run bench -- --poses town,spawn` before and after: at most +10 draw calls at `town`.
- `?proto=place` still boots and its house works (`npm run look -- --query 'proto=place' --eval dev/look/evals/place-town-coop.ts`).

**Done means.** On boogle.club you can walk into the house, the roof and the camera-side walls cut away, and the
furniture changes with the facts. The shop and museum show their boards. The railway bot passes and Place still
works.

### Job T2: residents, talk, notices and rumours

**Files.**
- Edited: `src/proto/place/residents.ts`, `src/proto/place/town-life.ts`, `src/entities/town/view.ts`,
  `src/player/world-reset.ts`, `test/world-reset.test.ts`, `dev/playtest/beats.ts`, `docs/game-design/place.md`.
- New: `src/proto/place/shore-worker.ts` (Place-only, deleted in D1), `src/entities/town/memory.ts`,
  `docs/atlas/stories/town.json`.

**Steps.**
- [x] **T2a.** Move the shore-worker block (`shoreWorker`, `shoreGreeting`, `heardShoreAsk`, the `place-talk-shore`
  target and the `shoreNewcomer`/`shoreAsk` memory) out of `residents.ts` into Place's `shore-worker.ts`, unchanged.
  Production has Sleeves (`greeter.ts`).
- [x] **T2b.** `createResidents(owner, rooms, env, memory: { load(): Seen | null; save(s: Seen): void })` returns
  `{ guys, update(dt), targets(), reset() }`.
  - `newestFact()` → `env.newest()`; `job.awake` → `env.awake()`; `showing() || pullOn()` → `env.hush()`.
  - Place passes a `personalSlice('town')`-backed memory; production passes `memory.ts` (key
    `boogle.railway-town.v0:…`).
- [x] **T2c.** Mount in the town entity; add its targets.
  - Production `env.hush` = `conversation.open || (inspectRailway()?.reward.busy ?? false)`, sampled at 4 Hz.
  - Add the prefix to `world-reset.ts` plus a test case
    (`'town memory from an old rail namespace is removed'`).
- [x] **T2d.** Add the resident and building beats to `RAILWAY_BEATS`. Add `docs/atlas/stories/town.json` (the town
  reads railway facts; memory is personal).

**Proofs.**
- `npm run check`.
- Stills with `townat=house&townact=talk`, with Pip's line visible.
- `--rail-seed q1-done`, then talk to Pip: the `path` or `forge` notice plays once, and a second talk gives an
  ordinary line.
- Reload: the notice doesn't repeat (personal memory).
- The railway bot passes, with no stray Talk target on its village walk (it asserts target ids).
- `npm run atlas -- --check`.

**Done means.** Residents stand in their rooms and talk. Each notices the newest fact once per player, and rumours
rotate. Speech bubbles are Local, memory survives reload and is cleared by a world bump, and playdata records the
beats.

### Job T3: the museum opens on the first path

**Files.** `src/proto/place/museum.ts`, `src/proto/place/town-life.ts`, `src/entities/town/view.ts`,
`docs/game-design/place.md`.

**Steps.**
- [x] **T3a.** `createMuseum(owner, rooms, env: TownEnv & MuseumEnv)`, with:

  ```ts
  type MuseumEnv = {
    buildings(): Iterable<{ plan: Plan; grow: number }>;           // 0..1
    forgeLit(): boolean;
    trees(): Iterable<{ x: number; z: number; great: boolean }>;
    rails(): Iterable<{ line: Line; lo: number; hi: number }>;     // metres along LINKS[k].line
    movers(): Iterable<{ x: number; y: number; z: number; kind: 'machine' | 'train' }>;
  };
  ```

  - Remove its imports of `job`, `lines`, `run`, `forge`, `chop` and `sites`. The people count is `env.people()`.
- [x] **T3b. Production env**, sampled at 2 Hz:
  - buildings: `plans.openingBuildings()` at `grow: 1`, plus T6's sites when they exist;
  - forge lit: `line2Lit`;
  - trees: `inspectRailway().trees` not `cleared` (the great tree has id 28);
  - rails: line 1 is the union of `[toCm, fromCm] / 100` over completed `LINE1_STATIONS` plus the village stub
    `[0, 30]`; line 2 is `[fromCm, toCm] / 100` over completed `LINE2_STATIONS`;
  - movers: `inspectRailway().machine` and the trains from `line2View`.
  - Place's env reads its own modules.
- [x] **T3c.** `up = (id) => id === 'house' || (id === 'museum' && env.has('path'))`. Add `'museum'` to `inspect().rooms`.

**Proofs.**
- `npm run check`.
- Stills `townat=museum`:
  - fresh: the board is up;
  - `--rail-seed q1-done`: the museum stands, and the table shows the line-1 track and the lit forge;
  - `--rail-seed q6-done`: both lines and the trains.
- Real time: the crystal-cave core's slow light.
- `npm run bench` (the museum interior draws only within 34 m).
- The railway bot.

**Done means.** On the shared first-path fact the museum rises for everyone in the room, and the 1:120 table shows
the live railway.

**As built (9 November).**
- `createMuseum(owner, rooms, env: MuseumEnv)`. `MuseumEnv` carries `people()` itself, rather than importing
  `TownEnv` from `entities/town/view.ts` into `src/proto`. Positions are world metres. The factory disposes of the
  geometry it makes, and the shared materials stay module-level.
- Buildings: `openingBuildings()` at `grow: 1`, plus the town's three room sites as they stand or rise. T6's sites
  join through the same iterator.
- Rails also include line 1's camp stub `[T1.fromCm / 100, len]` and line 2's turntable stub `[0, Q1.fromCm / 100]`,
  which Place drew too. Track shows by completed station, not at the live laying head.
- Movers: `inspectRailway().machine` and `line2View.trains[k].cars[0]` once `trains`. Trees and movers are sampled at
  2 Hz only while the interior draws. `RailwayViewInspection.line2View`'s type now includes `train-view.ts`'s
  `inspect()`, which `view.ts` already spread into it.
- `inspectTown().museumBits` counts what the table drew last, for evals.
- Draw calls: `town` pose 221 → 221 fresh, 279 → 278 at `q1-done`; 18 m from the museum 312 → 335 (the interior,
  within 34 m only). The long production playthrough finished with no errors.

### Job T4: the wardrobe (what you own and wear)

**Files.**
- New: `src/render/cosmetic-parts.ts`, `src/entities/wardrobe/index.ts`, `src/entities/wardrobe/state.ts`,
  `src/entities/wardrobe/view.ts`.
- Edited: `src/entities/railway/reward.ts`, `src/proto/place/gifts.ts` (imports the catalog),
  `src/player/world-reset.ts`, `test/world-reset.test.ts`, `docs/game-design/place.md`.

**Steps.**
- [x] **T4a.** Move the catalog verbatim, names and lines included, from `gifts.ts` to `cosmetic-parts.ts`:
  `GiftId`, `Slot`, `Tier`, `GIFTS`, `STOCK`, `Stock`, `BOXES`, `ODDS`, `PITY`, and each item's `parts`. The `hat` and
  `scarf` entries point at `T1_REWARD` (`t1-reward-parts.ts`) and `T2_REWARD` (`reward-data.ts`) rather than holding a
  second copy. `gifts.ts` imports from it.
- [x] **T4b.** `wardrobe/state.ts`:
  - The store `boogle.railway-wardrobe.v0:…` holds `{ got, bought, worn: { hat?, accessory?, outfit? }, dry, opened }`.
  - API: `owned(slot)`, `isOwned(id)`, `isWorn(id)`, `tried()`, `tryOn(id)`, `keepTried()`, `wearOwned(id)`,
    `takeOff(id)`, `swapSlot(slot)`, `swapLabel(slot)`, `grant(id, { wear })` and `onWardrobe(fn)`. Semantics are
    copied from `gifts.ts` lines 644–830.
  - Ownership of `hat`/`scarf` also counts accepted `railway-profile.ts` claims.
  - Presence `wardrobe`. Null when nothing is worn and nothing is tried.
- [x] **T4c.** `wardrobe/view.ts` draws the worn items, and an item being tried on, on the local avatar and on each
  remote, using `seatConductorHat` and head clearance. It sweeps on `onPeerRemoved`. `index.ts` spawns it in
  production (`defineKind('wardrobe', { lateUpdate: 5 })`; confirm the order with `npm run registry`).
- [x] **T4d.** In `reward.ts`, drop `localCosmetics`, `railwayCosmetic` and `railwayScarf` and their remote rendering.
  An accepted T1/T2 claim calls `grant('hat' | 'scarf', { wear: true })`.

**Proofs.**
- `npm run check`.
- `npm run registry`: the presence keys show `wardrobe`; `railwayCosmetic` and `railwayScarf` are gone.
- `npm run test:net`.
- Two tabs (`npm run look -- --players 2 --rail-seed awake`, with the T1 hat claimed through the bot or the existing
  T1 eval): tab B sees A's hat, and it goes when A leaves.
- The railway bot (T1/T2 reward beats unchanged).

**Done means.** One personal wardrobe holds every wearable, and other players see what you wear. The T1 and T2
rewards still arrive and are worn as before.

**As built (9 November).**
- An entity's `state.ts` may not import `src/render/` (lint, `dev/lint/policy.ts`), so `wardrobe/index.ts` hands the
  catalog to `startWardrobe(catalog, storage)`. Ids are plain strings in `state.ts`.
- The scarf's one copy is the catalog entry; `reward-data.ts`'s `T2_REWARD` points at it, so `src/render` never
  imports an entity. The hat is still `T1_REWARD`.
- `swapLabel(slot, offVerb)` takes the shop's `SHOP.offVerb`, since `state.ts` can't import `town-lines.ts`.
- A claim grants at its reveal's end, so the hat isn't on your head behind its own card. A claim the wardrobe hasn't
  heard of (an earlier visit, a reload mid-reveal) is granted and worn on load.
- **The seam for T5 and C1:** `wardrobe()` in `src/entities/wardrobe/state.ts` returns the `WardrobeApi` (`null`
  before the production railway starts it). `onWardrobe` sends `try`, `untry`, `keep`, `wear`, `off`, `swap`,
  `grant` and `load`. The view plays Place's pops; `keepTried()`'s "You got" card belongs to the shop, through
  `reward.youGot`. Nothing under `src/entities/town/` was touched.

### Job T5: the shop opens on the first path

**Files.** `src/proto/place/shop.ts`, `src/proto/place/town-life.ts`, `src/entities/town/view.ts`,
`dev/playtest/beats.ts`, `docs/game-design/place.md`.

**Steps.**
- [x] **T5a.** `createShop(owner, rooms, env, wardrobe: WardrobeApi, say: (id, line) => void)`.
  - `WardrobeApi` is the T4 surface. Place adapts `gifts.ts` to it.
  - `hasFact` → `env.has`; `money()` → `env.money()` (production: `counts.score`).
  - `residentSay` comes from T2's residents.
  - Prices stay as they are: the joke list price climbs with the wallet, and you pay $0 (**owner question 4**).
- [x] **T5b.** `up` adds `shop` on `env.has('path')`. Add the shop beats.

**Proofs.**
- `npm run check`.
- Stills `townat=shop` with `--rail-seed q1-done`: tags, the counter and the rail.
- `townat=shop&townact=try`, then `townact=walkout`, then reload: the item is still owned (`inspectTown()` prints the
  wardrobe).
- Two tabs: the partner sees the worn item.
- The railway bot.

**Done means.** Fine Prices opens with the first path. Try on, Take it, Wear and Swap work. What you take is personal,
and what you wear is shown to others.

**As built (9 November).**
- `createShop(owner, rooms, env, wardrobe, say)` takes `ShopWardrobe` (a `Pick` of `WardrobeApi`) and
  `env = { has, money, youGot }`. The shop no longer imports `gifts.ts` or `score.ts` (their module side effects are
  Place's): the stock comes from `cosmetic-parts.ts` and `dollars` moved to `signs.ts`.
- The "You got" card: `railwayYouGot` in `entities/railway/state.ts`, registered by the railway view on its one
  reveal queue (`registerRailwayYouGot`). Place passes `got.ts`'s `youGot`; `gifts.ts`'s `keepTried` no longer
  shows the card itself, and `placeWardrobe` adapts `gifts.ts` to the shop.
- The rail swaps the three clothes slots. Place's stowaway is no longer on the shop's rail (it still swaps at Place's
  shelf); production's comes with C2.
- **Button is silent in production** until T2: the town view passes a no-op `say`. T2 should pass its
  `residentSay` as `createShop`'s last argument in `entities/town/view.ts`. The lines are unchanged.
- Town files touched: `entities/town/view.ts` (the shop's import, `up`, `createShop`, targets, update, inspect) and
  `entities/town/state.ts` (`wardrobe` in `TownInspection`).
- `railway-town.ts`: `townact=try|take`, chained acts (`try,walkout`), `partners` in the after-act print, and the
  debug camera held through look's warm-up (look otherwise reframes to its `--view`).

### Job T6: town growth rows and the forge workshop (needs owner question 1)

**Files.** `src/proto/place/town.ts`, `src/proto/place/workshop.ts`, `src/sim/town-facts.ts`,
`test/town-facts.test.ts`, `src/entities/town/view.ts`, `docs/game-design/place.md`.

**Steps** (with question 1 = yes):
- [ ] **T6a.** `createTownGrowth(owner, sites, env)` adds sites only for `TOWN.wood`, `TOWN.stone` and
  `camps[].awake`; `opening-view.ts` already draws `start` and `asleep`.
  - Steps: wood 1 at `forge`, wood 2 at `trains`, stone 1 at `head`, stone 2 at `pier`. Camps wake with their lines:
    camp 0 at `path`, camp 1 at Q3 completion.
  - On first sight of a fact the rows build with the show (`startSite`); on load they snap.
  - In `town-facts.ts`, `town` = wood ≥ 1 and `stone` = stone ≥ 1. Extend the test.
- [ ] **T6b.** `createWorkshop(owner, rooms, env)` opens when `forge` is true. Production's forge has no freight roof;
  the roof stage returns with slice 5's cargo.

**Proofs.**
- `npm run check`.
- Stills `townat=street` on the `q1-done` and `q6-done` seeds.
- `--video` of a row building (the show).
- `npm run bench` at `town` and the phone profile: at most +15 draw calls over T1.
- The railway bot.

**Done means.** The village visibly grows as the shared railway does, the same for everyone, and the workshop opens
with the forge. If question 1 is "wait for cargo", T6 is skipped and the rows come with slice 5.

### Job C1: station boxes and the curio shelf (box rule: owner question 3)

**Files.**
- New: `src/entities/town/curio-shelf.ts`, `src/entities/railway/crates-view.ts`.
- Edited: `src/entities/railway/view.ts` (one mount hunk), `src/entities/wardrobe/state.ts`, `dev/playtest/beats.ts`,
  `docs/game-design/place.md`.

**Steps.**
- [x] **C1a.** The curio shelf, from `gifts.ts`'s "the curio shelf" block, at `SHELF` in the village. It shows what you
  own; what you don't own stands under dust sheets. `Swap <slot>` targets call `swapSlot`. It exposes `shelfGroup`
  and `crystalPeg` for K1 and F1.
- [x] **C1b.** Crates. For each completed stretch after T2 (T3, Q1–Q6) not in `wardrobe.opened`, one personal crate
  stands beside that stretch's frame.
  - Placement follows `run.ts`'s `handCrate` ground search, on `LINE1_STATIONS` and `LINE2_STATIONS` positions.
  - Walking into it (1.25 m, as Place) opens it: `nextGift()` rolls from `cosmetic-parts.ts` with `Math.random`
    (personal and Local), updates `dry`, and records `opened` **before** the reveal. This fixes the audit's
    mid-reveal save defect.
  - The reveal goes through `reward.ts`'s queue (`youGot`). Mark `crate opened`.
- [x] **C1c.** Late joiners and reloads see unopened crates for every completion already reached.

**Proofs.**
- `npm run check`.
- `--rail-seed q3-done`: crates at T3, Q1–Q3. Open one in a still; reload, and it's gone and owned.
- A second tab in the same room sees its own crates.
- The railway bot: it never walks into a crate on its route; if it does, the reveal mustn't stall it, so check the beat
  times.

**Done means.** Boxes behave as Place's did, personal and from shared progress, and the shelf is the wardrobe.

**As built (9 November).**
- **Which stretches:** Q2–Q6, not "T3, Q1–Q6". Place's crate flags (`layout.ts`, and the same `crate` field in
  `LINE1_STATIONS`/`LINE2_STATIONS`) give T1, T2 and Q2–Q6, seven boxes, matching `BOXES`' seven tiers; T3 and Q1
  never had one, so "as Place's did" wins over the list. `STATION_BOXES` in `crates-view.ts` reads the flags, so
  adding T3 or Q1 later is a catalog change. Tiers: Q2 Rare, Q3 Common, Q4 Rare, Q5 Common, Q6 Wonder.
- **Mounted from `reward.ts`**, not `view.ts`: `createRailwayReward` owns the one reveal queue and the T1/T2 boxes,
  so the station boxes sit beside them (`reward.inspect().stationBoxes`). `view.ts` is unchanged.
- **The roll** is `boxGift(n, tier, got, dry)` in `cosmetic-parts.ts` (Place's `nextGift`, now shared; `gifts.ts`
  calls it). Production's `n` is `2 + boxesOpened()`; the hat and scarf never roll. With no Wonder yet, the first box
  opened is a Wonder (Place's "a Wonder by the third").
- **Wardrobe:** `openBox(box, id, wonder)` saves `opened`, `got` and `dry` at once, before the rattle; `unbox(id)` at
  the card's end wears it if its slot is empty and sends `grant`, which uncovers it on the shelf. A reload
  mid-reveal leaves it owned and on the shelf but not worn (Place wore it).
- **Placement:** `rewardSeat` takes any station index. The last station (Q6, whose stretch ends on the pier) uses its
  own frame's far side; Place's `handCrate` put that box in the sea. Line two's boxes stand **across the track**
  (`rewardSeat(…, across)`): beside the frame they sat by its depot rack, and on the long run the Q5 box's "Open the
  crate" (0.4 m nearer) took the bot's press for "take Q6 depot logs". A player would have hit the same.
- **The shelf** is `src/entities/town/curio-shelf.ts`, mounted by the town view, which returns it as `shelf`
  (`shelfGroup`, `crystalPeg`) for K1 and F1. Swap ids are Place's `place-swap-<slot>`; the pet slot waits for C2.
- **The bot walks round waiting boxes** (`makeBot`'s new `avoid`, 1.4 m, just outside the 1.25 m bump): a box's
  card stopping it mid-walk by the Q6 frame left it stuck. If it does bump one, it puts the card away after 1.6 s.
- **Eval:** `railway-town.ts` gained `townat=shelf|crates`, `townact=open|swap|reload`, `townown=`, `townactor=`.
  The reload proof: `--query '…townat=crates&townbox=Q2&townact=open,reload' --until "window.__townReloaded ??
  (import('/dev/look/evals/railway-town.ts'), false)"`.

### Job C2: the stowaway

**Files.** `src/entities/wardrobe/view.ts`, `src/entities/wardrobe/state.ts`, `docs/game-design/place.md`.

**Steps.**
- [x] **C2a.** Port `gifts.ts`'s follower (`updateCritter`, `updatePartnerPets`) with presence `stowaway` (riding flag
  only). Each client animates its own copy of a remote's pet.

**Proofs.**
- `npm run check`.
- `npm run registry`.
- `npm run test:net`.
- Two-tab still: the partner's pet follows them and rides a train.

**Done means.** Owning the stowaway shows it on you and to others, and it goes when you leave.

**As built (9 November).**
- **Wardrobe:** a `pet` slot beside the clothes (`WORN_SLOTS`, `WornSlot`). It's saved in `worn.pet` (an added
  optional field, so no `WORLD_NS` change), cycles with `swapSlot('pet')`, and `unbox` brings it out when the slot is
  empty, as for clothes. `wearing()` (the `wardrobe` presence) still carries clothes only; `pet()` is the new getter.
  `tryOn` stays clothes only.
- **Presence `stowaway`** (`{ riding }`, null when away) is registered in `state.ts` beside `wardrobe`, with
  `parseStowaway` and `partnerStowaway(peer)`. Riding is `carry.on !== null` (Place's rule), handed in by `index.ts`
  through `startWardrobe(…, onDeck)` so `state.ts` stays headless.
- **View:** `stepPet` is `updateCritter` verbatim apart from names and a 0.1 s cap on `dt`. The pets live in one
  group that is the wardrobe entity's `mesh`, so despawn takes them; a partner's goes when their presence drops it or
  they leave. Mesh name `place-pet`, as in Place.
- **Shelf:** `place-swap-pet` at Place's `SLOT_X.pet` (2). The shop's rail still swaps clothes only.

### Job K1: crystals (owner question 2)

**Files.**
- New: `src/entities/finds/index.ts`, `src/entities/finds/state.ts`, `src/entities/finds/view.ts`.
- Edited: `src/entities/town/curio-shelf.ts`, `src/player/world-reset.ts`, `test/world-reset.test.ts`,
  `dev/playtest/beats.ts`, `docs/game-design/place.md`.

**Steps.**
- [x] **K1a.** Port `crystals.ts` (`SPOTS`, the magnet and chime, the glowing shelf row through `crystalPeg`) into the
  finds view. The finds store is `boogle.railway-finds.v0:…`, field `crystals`. Mark `crystal found`.
- [ ] **K1b.** Cut: the owner chose personal crystals (owner question 2, 9 November). If the owner chooses shared crystals instead, follow "WORLD_NS" above. Use the lockstep-system /
  Server recipe: a field on `Rail`, op `rail.crystal`, server reach validation, prediction, adapter method
  `takeCrystal(id)`, a `test/railway-crystals.test.ts` (`'a crystal is taken once'`, `'out of reach is refused'`), and
  the namespace bump on merge.

**Proofs.**
- `npm run check`.
- A still at a spot, then the shelf row after pickup. Reload keeps it.
- A second tab still sees its own crystal (personal) or sees it gone (shared).

**Done means.** The seven crystals can be found in production and fill the shelf.

**As built (9 November).** Owner question 2: personal, so K1a only (no `Rail` field, op or `WORLD_NS` bump).
- **Store:** `src/entities/finds/state.ts` (`createFinds`, `parseFinds`, `startFinds`, `finds()`, `inspectFinds()`),
  key `FINDS_PREFIX` + `<railwayRoomId>:<pid>`, with `crystals`, `finds`, `secrets` and `hubbed` from the start. Each
  field is validated on its own (a bad `finds` never costs your crystals). `CRYSTAL_SPOTS` (Place's `SPOTS`) is data in
  state.ts. F1 and F2 add their `take…`/`has…` methods and events beside `takeCrystal`.
- **Saved before the show:** the crystal is recorded the moment it starts to fly (as C1's boxes are), so a reload
  mid-flight keeps it; the stub lights when it lands. The view follows every store change (another tab, a reload).
- **The shelf:** the town's `state.ts` gained `townShelf()` (set with `setTownView(view)`), so the finds view reaches
  the shelf without importing the town's view; it puts its row on whichever shelf is mounted. `curio-shelf.ts`'s only
  change is a C1 fix: a player who owned nothing saw an empty shelf (no dust sheets), since `redraw`'s first call
  matched its starting key.
- **Eval:** `dev/look/evals/railway-finds.ts`: `findk=`, `findsact=walk|shelf|reload`, `findsdefer=1`,
  `findsactor=1` (two players stand a quarter turn apart).
- **The bot** passes within 4.2 m of crystal 1 (the arch) on its walk in and takes it at 24 s without slowing; the long
  run (`k1-long`) finished, 111 game minutes against C1's 114, the same longest waits.

### Job F1: gold finds and the finds board

**Files.** `src/entities/finds/{state,view}.ts`, `src/entities/town/curio-shelf.ts`, `dev/playtest/beats.ts`,
`docs/game-design/place.md`.

**Steps.**
- [x] **F1a.** Port `props.ts`'s `FIND_SPOTS`, `trinket()`, `updateFinds` and the pinned board on the shelf. Use the
  `finds` field and the mark `find found`.

**Proofs.**
- `npm run check`.
- A still of a find on the path and of the board.
- `npm run bench`: the finds are one instanced mesh if more than 6 draws are added.

**Done means.** The gold finds work as in Place, personally.

**Cut (9 November, owner):** "Yeah, I think I would cut them in that case." The gold finds, the finds board and
`findPeg` are gone (the crystals stay). Kept: the shelf layout fix, and the store's `finds` field, still parsed and
unused, so existing saves keep their other fields. The notes below are history.

**As built (9 November).**
- **Store:** `takeFind(id)`/`hasFind(id)`/`finds()` beside `takeCrystal`, written at once; event kind `find`.
  `test/railway-finds.test.ts`. Ids are Place's (0–2, 10–12, 50–52: `PATH_SAMPLES` has two paths, so nine finds).
- **View** (`src/entities/finds/view.ts`): `FIND_SPOTS` computed from `PATH_SAMPLES` as Place did. The trinket is one
  geometry and one material: a `glow` vertex attribute (1 on the disc, 0 on the crossed stamp) picks the stamp's colour,
  roughness, metalness and no emissive, so the finds are one instanced mesh in the world and one (`pins`) on the shelf.
  Reach, clank and spark ring are Place's; mark `find found`.
- **The board** is part of the curio shelf's frame (`curio-shelf.ts`, no draw of its own), where Place pinned it,
  now on two posts (Place's hung in the air). The shelf's `findPeg(k, out)` is where pin k goes. No collider, as in
  Place.
- **The shelf's layout** (orchestrator default, `docs/agent-calls.md`): each gift is lifted by how far its shape reaches
  below its origin, so it stands on its board, and the top board is 16 cm higher (`ROWS_Y[1]` 2.2 → 2.36) so the tall
  sheeted outfits fit under it. The crystals' row is clear.
- **Bench, `town` pose:** 233 → 236 calls (+2 main, +1 shadow: the world finds cast shadows, as Place's did).
- **Eval:** `railway-finds.ts` takes `findgold=<id>`, and `findsact=board` frames the shelf and board.
- **The bot:** K1's long-run trace passes 2.8 m from find 1 and 3.3 m from find 0 (one-second samples), so `f1-long`
  ran: 109 game minutes (K1's 111), the same stalls (still 76 min, pushing 2 s), no `find found`. The bot takes none.
- **Note for F2:** gold find 0 stands 2 m from crystal 1 (the arch): walking into one takes both.

### Job F2: secrets and the finders' bay

**Files.** `src/entities/finds/{state,view}.ts`, `src/entities/town/curio-shelf.ts`, `dev/playtest/beats.ts`,
`docs/game-design/place.md`.

**Steps.**
- [x] **F2a.** Port `tech.ts`'s secrets (`tech-layout.ts`'s `SECRETS` / `FINDERS` data) and the finders' bay.
  - Each secret grants its cosmetic through `wardrobe.grant`.
  - Hook and double-jump secrets use production's `hook-shot.ts` rings and the `rail.jump` ability.
  - Glide-only secrets (the village balcony, Far Head's sea stack) never spawn in the world. They appear at the bay
    once `trains` is true (**owner question 5**).
  - "Open either box and the other goes" uses the store's `hubbed`. Marks: `secret found`, `secret at the hub`.

**Proofs.**
- `npm run check`.
- Stills of one walk secret and the bay with a `q6-done` seed.
- The level check still passes (`npm run level-check`).

**Done means.** Every Place secret is either reachable in production or waiting at the bay.

**Designer fit check (9 November; [agent calls](../agent-calls.md)).** Changes the step above:
- The glide-only two do stand in the world, once the room has the glider; their bay crates wait for the end of the run
  (line 2 complete). Owner question 5 assumed no glider; glider B grants one on Needle Bell's summit.
- Bay timing follows production's ability order: yard and bell at the hook; alcove and firstpull at the glider; nook
  and loft at trains; the lookout once the double jump is yours plus a later milestone (built: line 2 complete).
- **Deferred to job E:** the jump course (j1–j7, the end block, the catch ribbon, the ramp) and its lamplighter's cap
  (the "block" secret, `lampcap`). Build them wherever the double jump ends up.
- Not ported: Place's Far Head glide pad and ramp (`glide-home`, `GLIDE_RAMP`).
- The ten secret gifts have no line: cards are name-only.

**As built (9 November).**
- **Store** (`src/entities/finds/state.ts`): `takeSecret`/`hasSecret`/`secrets()` and `hubSecret`/`isHubbed`/`hubbed()`,
  each written at once, events `secret` and `hub`; ids validated (`[A-Za-z0-9-]{1,24}`, at most 32).
  `test/railway-finds.test.ts`.
- **View** (`src/entities/finds/secrets-view.ts`, mounted by the finds view): nine secrets (`block` filtered out).
  The ground (the lookout's shelf, the loft's rock, the balcony's column and wood deck, the sea stack, the tower
  plinths) and every clue are one merged mesh with Place's colliders; the crates, world and bay, are three instanced
  meshes (one per tier), refilled each frame. Walk into one in the world (1.25 m) or Open it (3.4 m, 2.6 m of height); at the bay, Open only (the crates are 1.1 m apart). The store is
  written, then `wardrobe.grant(id, {wear: false})`, then the show; putting the card away calls `unbox` (worn if the
  slot's empty). The bell rings near the bridge until you have it. `glider()` reads the railway's `glide`, which is false
  in production until glider B (a TODO names it).
- **The reveal** is now shared with the station boxes: `src/render/crate-show.ts` (`createCrateShow`), used by
  `crates-view.ts` and the secrets.
- **Hook rings:** `hook-path.ts` `HOOK_SIDE = ['alcove', 'nook', 'loft', 'stack-return']` after the climb's eight;
  the hook view draws their rings and slabs as it does the climb's. Presence names rings by id, so an older build
  just shows no cable for them.
- **The bay** is part of the curio shelf (`curio-shelf.ts`): its frame is in the shelf's frame and its sheeted gifts in
  the shelf's two meshes. `bayPeg(k)` places missed crates either side of the trophy plinth that stands where Place's
  first ones did. The town's `townShelf()` exposes it; the shelf's inspection gains `bay`.
- **Level check** (`dev/economy/place-level.ts`): firstpull (t0), nook and loft are out of reach before the hook, and
  the balcony and stack before the glider (also with the line to Far Head). Three are reached early in Place's
  layout and print as `EARLY` findings (an open layout call): the lookout with one jump, the alcove from the bank
  without the hook, the stack by a double jump down from the stack-return slab.
- **Eval:** `railway-finds.ts` `findsecret=<id>`, `findsecretbay=1`, `findsact=open|bay|spot`, `findsworldfrom=`.
- **Bench, `town` pose** (fresh world, against the gold-find cut): 233 → 240 calls (+4 main, +3 shadow: the merged
  ground, the crate tiers in view and a side slab), 1.35 → 1.36 M triangles. The bay adds none.
- **Proofs** (`.look/f2-*`): the yard crate behind the cottage and its pickup (the straw hat over Buddy); the bay at
  `q6-done` with six crates (yard, bell, nook, loft, balcony, stack; no glider or double jump in that seed); yard's
  bay crate opened, then its world crate gone; a real reload keeps the bell's; two players, player 2 still sees their
  own yard crate after player 1 takes theirs.

### Job F3: buoys and the telescope

**Files.** New `src/entities/lookout/{index,view}.ts` and `src/entities/lookout/telescope.css`;
`docs/game-design/place.md`.

**Steps.**
- [x] **F3a.** Port the buoys (`BUOYS`, `updateBuoys`) and the telescope at `SCOPE`, with its `Look` target, using
  `telescope.ts`'s **fixed** view as the only view. Drop `v=pan` and the v1 fly-out (6 November call).

**Proofs.**
- `npm run check`.
- A still through the telescope.
- `--video` of the buoys bobbing.

**Done means.** Both exist in production with no flags.

### Job A1: ambience and the playtest flag

**Files.** New `src/render/ambience.ts`, `src/features/ambience.ts` and `src/features/playtest-flag.ts`;
`docs/game-design/place.md`.

**Steps.**
- [x] **A1a.** Move `ambience.ts`'s body to `src/render/ambience.ts` as `startAmbience()`. The feature calls it from
  `onStart`. It uses the ambience bus, as now.
  *Built:* an entity with no mesh (`ambience`, update -3), started in Place's world (`productionRailway ||
  protoOn('place')`), so `?proto=place` uses it too and its own copy is gone. Place's land comes in by `import()`.
- [x] **A1b.** Register `registerAction('playtest-flag', { key: 'KeyM', pad: 'right', label: 'Flag', group: 'menu' })`.
  Confirm `freeSlots()` still lists `right` on the production page. Carried counts come from `railwayRead()`
  (`carry`, `stoneCarry`, `railsCarry`). Mark `flag`, with the same fields as Place.
  *Built:* `right` was free before; after, `freeSlots()` is lb, rb, up, down on a fresh production page. `big` is
  `'footing'` when a footing is on your back. Production only: `src/proto/place/flag.ts` stays for `?proto=place`
  until D1 deletes it.

**Proofs.**
- `npm run check`.
- Listen: three walk, jump and landing repetitions (the audio routing in `checks-for`).
- `npm run playtest` shows a `flag` mark from a production session.

**Done means.** The live game has the sea bed and the M flag. The controls guide shows Flag under menu.

### Job X1: verification tooling onto production (before D1)

Today `npm run checks-for` routes every gameplay, render, terrain and audio change through the **Place** bot:
`playthrough --from at-cove`, `npm run checkpoints`, and `playthrough.ts`'s default `proto=place&shot=play` and
`place-job.ts`. D1 would break all of them.

**Files.**
- `dev/checks-for.ts`
- `dev/look/playthrough.ts`, `dev/look/bots/railway.ts`, `dev/look/evals/railway-job.ts`
- `dev/look/saves.ts`, `dev/look/restore-pair.ts`, `dev/look/coop-playthrough.ts`
- `dev/look/shots.ts`, `dev/look/sheet.ts`, `dev/tune.ts`, `dev/cold-start.ts`, `dev/look/perf.ts`
- `docs/agents/test-details/bot-segments.md`, `docs/agents/tools.md`, `.claude/skills/look/references/*.md`

**Steps.**
- [ ] **X1a.** The railway bot.
  - `play()` stops after the beat named by `?botTo=` (`wake`, `t1-done`, `t2-funded`, `T2`, `T3`, `forge-lit`,
    `Q1` … `Q6`, `pier`, `audio-loop`) and sets `__placeDone`.
  - With `--rail-seed <stage>`, it starts from the seeded beat, following `railway-b5b8-bot.ts`.
- [ ] **X1b.** `playthrough.ts`.
  - Defaults: query `shot=play`, eval `dev/look/evals/railway-job.ts`, room from the production entry.
  - `--from <stage>` maps to `--rail-seed`; `--to` sets `botTo`. Remove the `proto !== 'place'` guard.
- [ ] **X1c.** `checks-for.ts` routes:
  - render → `look --rail-seed awake --hud` and `playthrough --to wake`;
  - terrain and gameplay → `--to t1-done`;
  - shared → `--players 2 --to T2`;
  - audio → `--to audio-loop`.
  - Replace the checkpoint fixtures hint: no client fixtures, since seeds are server saves.
- [ ] **X1d.** Point the defaults of `shots.ts`, `sheet.ts`, `tune.ts`, `cold-start.ts` and `perf.ts` at the
  production entry. Update the docs listed above.

**Proofs.**
- `npm run checks-for -- --files src/render/sky.ts,src/entities/railway/sources.ts --run` passes on production.
- `npm run playthrough -- --to t1-done`.
- `npm run playthrough -- --players 2 --to T2`.
- The full railway bot.

**Done means.** No routed check or default tool opens `?proto=place`.

### Job D1: delete the Place entry and every Place-only module

**Files** (deleted unless marked):
- `src/proto/place/index.ts`, `src/features/proto-place.ts`
- The replaced modules in the inventory: `run`, `lines`, `verbs`, `job`, `score`, `coop`, `coop-identity`, `big-cargo`,
  `train-nudge`, `chop`, `drop`, `forge`, `depot`, `cargo`, `halts`, `ladder`, `pair`, `great-carry`, `celebrate`,
  `lamps`, `moves`, `moves-view`, `tech`, `objective`, `nearest`, `panel`, `dismiss-pointer`, `look-gtao`, `got`,
  `gifts`, `crystals`, `props`, `growth`, `town-life`, `town`, `workshop`, `ambience`, `flag`, `shore-worker`,
  `telescope`, `telescope.css`
- The ported modules: `rooms`, `house`, `shop`, `museum`, `residents` and `town-lines` are now production's. They
  stay until R3 moves them.
- Edited: `src/proto/flags.ts`, `src/features/{pause,fall,proto-session,playdata,return-spot}.ts`,
  `src/render/asset-manifest.ts`, `src/proto/card.ts`, `src/proto/playdata/record.ts`, `protos/protos.ts`,
  `src/globals.d.ts` (`__place`), `src/player/haul-back.ts` (comment), `src/proto/place/look-kit.ts` (cut `job.boiler`),
  `src/debug/dev/{place,camera,inspect,room,report,scenarios,fixtures}.ts`, `src/debug/prof-overlay.ts`, `src/README.md`
- The tools and tests in "Every reference" below.

**Steps.**
- [ ] **D1a. Flags.** `pageQuery()` stops injecting `proto=place`. The bare address keeps `room=boogle` only. Delete
  the `v=village` and `proto-place*` room rules.
  - Every consumer that meant "the current game" reads `productionRailway`: `fall.ts` (`PROTO === 'place'`),
    `proto-session.ts` (`PROTO || productionRailway`), `playdata.ts` (`q.has('proto') || productionRailway`),
    `return-spot.ts`, `asset-manifest.ts` (`proto: PROTO || (productionRailway ? 'place' : null)`) and `card.ts`.
  - The playdata card id stays `place`: playtest history is keyed by it, and it names the place, not the prototype.
  - In `protos/protos.ts`, the `place` card's URL becomes `/` and its variants go.
- [ ] **D1b. Pause.** `pause.ts`'s Get unstuck keeps `getRailwayUnstuck()` and `backToSpawn()`; the Place branch goes.
- [ ] **D1c. Dev menu.** `src/debug/dev/place.ts` is rewritten as a production read-only adapter: destinations from
  `layout`; inspect from `inspectRailway()` and `inspectTown()`. Or delete it, and have `camera.ts`, `inspect.ts`,
  `room.ts`, `report.ts` and `scenarios.ts` use `productionRailway` branches only. Then, per
  [playtest-jump-in](playtest-jump-in.md#ordering-and-d1):
  - **Delete:** `src/debug/dev/fixtures.ts`; `src/debug/dev/scenarios.ts` (the dock's Tests panel) and its
    `registerDockPanel` line; `src/debug/dev/destinations.ts`, whose Start test, Go and Return are Place-only; the TEST
    badge and `dev-launch` block in `src/debug/dev-menu.ts` (the `fixture()` and `VERSION` imports); `setup`, `fixture`,
    `test`, `scenario` and `destination` from `dev-preferences.ts`'s `debugFlags`, and its `boogle.dev.launch.v1` clear.
  - **Keep:** `src/features/jump-in.ts`, `src/boot/jump-in.ts`, `src/world/railway-jump.ts`, `src/sim/railway-seeds*.ts`,
    `server/src/jump.ts` and `server/src/seeds/`. People's setups are jump-ins; agents' setups are `--rail-seed`, and
    both come from `buildSeedWorld`.
- [ ] **D1d. look-kit.** It takes `boilerShown: () => boolean` from its caller instead of reading `job.boiler`.
- [ ] **D1e.** Delete or retarget the tools and tests listed under "Every reference to `?proto=place`".
  `npm run level-check`'s place progression (`dev/level/check.ts --place=place`, `replay.ts`, `timber-track.ts`)
  re-derives its states from railway seeds, or that mode is removed and the layout checks stay.

**Proofs.**
- `npm run check`, which includes `level-check`.
- `npm run check:full` (flags feed `net.ts`'s room id).
- `rg "proto=place|protoOn\('place'\)|proto-place|__place" src dev test server protos .claude docs/agents docs/game-design`
  returns nothing outside dated history.
- `?proto=place` now opens the production game: unknown protos fall through.
- The full railway bot.
- `npm run bench` (no change expected).
- `npm run unused` lists no newly orphaned Place file.

**Done means.** There is no `?proto=place` entry, no Place-only code and no tool that needs either. boogle.club
behaves the same.

### Jobs R1–R3: move what's left to proper homes

Each R job does the same five things:
1. `git mv` the files.
2. Rewrite imports with a script, recorded in the commit body. It covers both `'../../proto/place/x.ts'` and
   `'/src/proto/place/x.ts' as string` forms in `src`, `dev`, `test`, `character`, `docs/world/*.html` and the
   `docs/game-design` code links.
3. Make the owner parameter required and remove `else scene.add`/`onFrame` fallbacks.
4. `npm run lint -- --prune-suppressions`, which only shrinks.
5. Prove it: `npm run check`, the railway bot, `npm run bench -- --poses town,spawn`, with counts identical to the
   job's base.

- [ ] **R1. Render primitives** to `src/render/`:
  - Place: `part-geometry`, `prop-kit`, `gear-models`, `axe-models`, `carry-models`, `axe-sparkle`, and
    `head-clearance` merged into `src/render/head-clearance.ts`.
  - Prototype helpers: `proto/flat.ts`, `proto/net/{boxes,box-plan,crates,town-fx}.ts`, `proto/wagon/look.ts`, and
    `proto/minis/common.ts`'s sounds as `src/render/fanfare.ts`.
  - Other prototypes (`greybox`, `net`, `wagon`, `minis`) import from the new homes.
  - `character/` imports update.
- [ ] **R2. `src/place/`**: the land, layout and shared village modules in the table above.
  - `src/proto/greybox/*` and `src/proto/playdata/record.ts` imports update.
  - `src/README.md` gains a `place/` line.
  - Make `land.ts`'s `addStatic` take the owner (`owner.body`) instead of calling `addBody`.
- [ ] **R3. Entity homes**: the railway-only modules to `src/entities/railway/` and the town modules to
  `src/entities/town/`.
  - Split `place.css` into `railway.css` and `town.css`, imported by their views.
  - The town and railway views now import statically, with no `import()` of `proto/`.
  - Delete `src/proto/place/`.
  - Update `docs/game-design/place.md`'s file pointers, `production-core.md` (slices 6–7 done) and the atlas stories.

**Done means** (end of R3, and of this plan): `src/proto/place/` doesn't exist. `rg "proto/place" src dev test
character server protos` is empty. No file outside `src/proto/` imports `src/proto/` except `flags.ts` and `mark.ts`.
The game, the railway bot and every routed check pass on boogle.club's entry.

## Every reference to `?proto=place` (for X1 and D1)

**Entry and flags (D1):**
- `src/proto/flags.ts`, `src/features/proto-place.ts`, `src/features/pause.ts`, `src/features/fall.ts`
- `src/proto/card.ts` and `protos/protos.ts` (the `place` card, telescope `v=fixed`/`v=pan` and `v=village`)
- `src/proto/session.ts`, `src/globals.d.ts`, `src/player/haul-back.ts` (comment)

**Dev menu and debug (D1):**
- `src/debug/dev/place.ts`, `camera.ts`, `inspect.ts`, `room.ts`, `report.ts`, `scenarios.ts`, `fixtures.ts`
- `src/debug/prof-overlay.ts`

**Bots and harness (X1):**
- `dev/look/playthrough.ts`, `coop-playthrough.ts`, `coop-warp.ts`, `saves.ts`, `restore-pair.ts`, `observe.ts`
- `dev/look/look.ts` (help text), `shots.ts`, `sheet.ts`, `perf.ts`
- `dev/look/bots/place.ts`, `place-landing.ts`, `double-jump.ts`
- `dev/checks-for.ts`, `dev/tune.ts`, `dev/cold-start.ts`, `dev/codex/see.ts`, `dev/audio/render.ts`
- `dev/video/shots/place.ts`, `round4.ts`, `round4-pair.ts`
- `dev/scan/task-routes.ts` (example `src/features/proto-place.ts`), `dev/scan/retained.ts`
- `dev/economy/model.ts`, `dev/economy/place-level.ts`, `dev/level/check.ts`, and `dev/level/*` (Place states)
- `dev/patch.ts`

**Evals (X1 retargets the live ones; D1 deletes the Place-only ones):**
- Place-only, delete:
  - `place-big-reload`, `place-cart-whistle`, `place-contact`, `place-coop`, `place-corner`, `place-cues`
  - `place-early-beam`, `place-exploring`, `place-forge-reconcile`, `place-great-carry`, `place-job`, `place-kit-draws`
  - `place-partner-load`, `place-personal-saves`, `place-seats-workshop`, `place-split`, `place-tech`
  - `place-town-coop`, `place-trees`, `place-trees-coop`, `placement-audit`
  - `replay-bridge`, `replay-idle-landing`, `replay-pause-talk`
  - `sheet-glide`, `sheet-hook`, `sheet-ride`, `sheet-opening`, `double-jump`
  - `track-layer`, `track-layer-action`, `track-panel-contract`, `tunables-chop`
- Retarget to production, or delete if superseded by a `railway-*` eval:
  - `axe-chop`, `carry-tag`
  - `color-defaults-capture`, `color-defaults-motion`, `color-defaults-unlit`, `color-defaults-walk`
  - `draw-overflow`, `fixed-exposure-review`, `gpu-portability`, `gpu-reload`
  - `sky`, `terrain-cove`, `tone`, `water-fft-check`
- `railway-halts` uses `window.__place.skipTrains()`: retarget it to `--rail-seed trains-on`.
- Beats that pass `proto=place`, retarget:
  - `dev/look/beats/chair-comparison`, `cloud-warmth`, `colour-textures`, `dev-looks`, `lighting-wedge`
  - `material-palettes`, `sky-evening`, `terrain-cove`, `unlit`, `visual-pipeline`
  - `dev/look/fixtures/chair-comparison.ts`
- `railway-job.ts`'s comment and `bots/railway.ts:993`'s `__place` assertion stay valid. After D1 the assertion is
  trivially true; keep it.

**Tests (D1):**
- Delete: `test/big-cargo.test.ts`, `test/train-nudge.test.ts`, `test/place-coop-snapshot.test.ts`,
  `test/restore-pair.test.ts`, `test/checkpoint-pair.test.ts`.
- `test/invite-flags.test.ts`: update for the new `pageQuery`.
- `test/namespace.test.ts`, `server/test/room-ids.test.ts`, `server/test/playdata.test.ts`: `'proto-place'` is only
  an arbitrary room string; keep it.
- R2/R3 update import paths in:
  - `test/railway*.test.ts`, `test/seat-claims.test.ts`, `test/works-shape.test.ts`
  - `test/greybox-works.test.ts`, `test/railway-works-layout.test.ts`

**Docs (D1 updates current docs; dated history is left alone):**
- `docs/agents/tools.md`, `.claude/skills/look/references/{capture,comparison-multiplayer,playthrough-motion}.md`
- `dev/look/README.md`, `dev/look/playtester.md`, `dev/codex/README.md`, `src/README.md`, `src/render/reference/cost.md`
- `docs/game-design.md`, `docs/game-design/{place,first-run,dev-menu,multiplayer,tech,water}.md`
- `docs/atlas/stories/{coop,dev-menu,seats}.json`
- Active plans: `production-core.md`, `little-guys-rails.md`, `water-graduation.md`, `review-inbox.md`, `dev-menu.md`
- `docs/world/world-map.html`, `docs/world/roundhouse-layout.html`: source-path provenance, updated in R2/R3.
- Left alone: `docs/research/**`, `docs/plans/done/**`, `docs/playtests.md`, `docs/atlas/changes.md`, the decision log
  and older plans and briefs. They are history.

## Risks

- **The production bot** (`dev/look/bots/railway.ts`) walks the village stub (`point(0, 14)`, `railAt(14)`) and
  asserts interact target ids. New solid rooms, residents' Talk targets and crates could block a path or steal a
  target. Every job runs the full bot. T1 checks the house, shop and museum footprints against the bot's village
  waypoints, and against the Roundhouse stall and table at world (909.5, 20.5) and (918, 12) (`SHED_STALL`,
  `SHED_TABLE`). The house sits at about (886, 11).
- **The phone draw budget.** No numeric draw budget exists yet; `npm run counts` and `bench` give counts only.
  - The town adds:
    - room shells, as pieces in the one sites drop set;
    - three shadow proxies;
    - per-room interior, outside and over meshes, interiors only within 34 m;
    - the museum's instanced table and core;
    - resident folk;
    - growth rows (T6);
    - finds and crystals.
  - Ceilings at the `town` pose: T1 +10, T3 +6, T5 +6, T6 +15, F1/K1 +2 each, measured on the phone profile too.
  - Over a ceiling, merge each room's `outside`/`over` meshes into one.
  - The 8 November backdrop call says the far map must run on phones; report each job's counts in its commit.
- **Dev tools and evals on `?proto=place`**: about 40 evals, 10 beats, 3 bots, the checkpoint system and `checks-for`
  (listed above). X1 must land before D1, or every agent loses its routed checks. Meanwhile T1–T5 keep Place working
  by mounting the same factories with a Place env.
- **Playdata beats.** `dev/playtest/beats.ts`'s `RAILWAY_BEATS` has no town, crate or find beats. Each job adds its own
  rows. Keep the card id `place` (D1a), or `npm run playtest` loses history continuity.
- **Effective `PROTO === 'place'` in production.** It is load-bearing (fall intro, proto session, playdata, the asset
  manifest's place and the Dev menu loading `src/debug/dev/place.ts`, which pulls in `run.ts` and `coop.ts` in
  production today). D1a changes it in one commit, with `check:full`.
- **Room safety** (`room-safety.md`, "Don't"):
  - Presence getters (`wardrobe`, `stowaway`) return null when off.
  - Receivers validate catalog ids and sweep departed peers.
  - localStorage loads validate and start empty on bad data.
  - Crate roll and storage happen once, before the show.
  - No effects run on a server apply, since no op is added. K1-shared would add one: effects go in `onAccepted`, never
    in `apply`, with no `Math.random` or wall clock in `src/sim`.
- **Mixed builds:** dev phase, so no compatibility code. The presence-key swap in T4 is a clean replacement. No wire
  shape or op changes, except K1-shared, which bumps on merge.
- **Hotspots and parallel work:**
  - J3 owns `src/sim/railway-*`, `src/world/railway-*`, `src/adapters/railway.ts`, `server/src/host/world-host.ts`,
    `dev/peer-test/ws-page.ts`, `dev/look/rail-seed.ts` and `dev/look/evals/railway-works-at.ts`. This plan touches
    none of them, except R2/R3's import-path rewrite in `rail-seed.ts`/`railway-works-at.ts` and K1 if shared.
  - J4/J5 edit `works-view.ts`, `roundhouse-view.ts`, `train-view.ts`, `halts-view.ts`, `sources.ts`, `view.ts` and
    the railway bot. C1 adds one hunk to `view.ts`, X1 edits the bot, and R1–R3 rewrite imports across
    `entities/railway/*`. Land each R job within a day and tell the orchestrator so J4/J5 rebase.
- **The docs split** (`ship/matias-franco-9c6521e`) edits one comment line each in `town-lines.ts`, `crystals.ts`,
  `tech.ts`, `sites.ts`, `rail.ts`, `pieces.ts` and `forge.ts` (`boogle-2.md` → `decisions.md`). Rebase over it.
  Moving `town-lines.ts` verbatim means moving whatever header has landed.
- **Copy.** `town-lines.ts`, gift and stock names and lines, and `GREETER_LINES` are moved, never edited. `SHORE_ASK`
  becomes unused in production once Sleeves replaces the shore worker; it is left in place, not deleted. No suspect
  lines found.
- **Performance of reads.** Calling `inspectRailway()` per frame walks the railway scene. The town uses
  `railwayRead()` per frame and `inspectRailway()` at most at 2–4 Hz (T1, T2, T3).
- **Glider code.** Deleting `moves.ts`/`moves-view.ts` removes the only glider implementation (BotW-curve physics,
  canopy). The gear model stays in `gear-models.ts`, and the code stays in Git history at this plan's base,
  `46eb7125`, for the movement slice.

## Design review (designer, 2026-11-09)

Read against DESIGN.md, [owner-calls](../agents/owner-calls.md), [decisions.md](../decisions.md) (index, then The shape
of the game, Trains and the world, Progress and rewards, Characters and story), [direction.md](../direction.md), the
newest [playtests](../playtests.md) (3, 4, 6, 7 and 8 November), [find-the-fun](find-the-fun.md) steps 6 and 10, and
the research index's town, reward and movement entries. `node dev/playtest/cli.ts` doesn't run in this checkout (it
can't find `playwright`), so playtest data comes from the written entries. Every Default and New call below is in
[agent-calls](../agent-calls.md), status `open`.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Three enterable buildings: house, shop and museum | Decided | 2 Nov, "the direction after round 3" (Towns), and "the town you can go into" |
| 2 | Shop and museum rise on the shared first-path fact (T3 done); until then their stake boards show the town's words | Default | Place's rule. Shared, so co-op sees one town |
| 3 | The house stands from the start; its furniture follows the facts | Default | Place's rule |
| 4 | Fact milestones: path = T3, forge = forge lit, depot = Q1, head = Q5, trains = trains on, pier = Q6 | Default | Nearest production equivalents. The `depot` lines talk about a cart, which production has |
| 5 | Town sign population: 12, +8 at path, +6 at Far Head, +6 at the pier (32) | Default | Place's numbers. Production adds the Far Head and pier steps |
| 6 | Each resident notices the newest fact once per player; rumours rotate; memory is personal, survives reload and is cleared by a world bump | Default | DESIGN 6. Copy unchanged |
| 7 | Residents hold their tongue while a reward reveal or a conversation is up | Default | Keeps the reveal readable (3 Nov: cards closed by accident) |
| 8 | Production keeps Sleeves at the shore in place of Place's shore worker; `SHORE_ASK` stays in `town-lines.ts` | Default | 8 Nov greeter call (agent-calls) |
| 9 | Museum: a 1:120 table of the live railway, drawn within 34 m | Default | town-interiors rec 1, "shared spectacle". The owner loved the museum (4 Nov) |
| 10 | One personal wardrobe; others see what you wear and what you're trying on | Decided | 6 Nov economy amendment ("certain wearables stay personal"); Design Table slots (hat, accessory, outfit) |
| 11 | The T1 hat and T2 scarf go into the wardrobe and are worn as they arrive | Decided | 4 Nov production core: one recoverable cosmetic per player, later visitors included |
| 12 | The shop is free; the list price is a joke that climbs with the score | Decided | 6 Nov "roughly six hours": "the shop stays free until the shared wallet ships"; money in dialogue stays a joke |
| 13 | Station boxes for T3 and Q1–Q6, personal, each player rolling their own | New | **Yes** (owner question 3) |
| 14 | Box odds and pity from Place's catalog (a Wonder by the third box) | Default | cosmetic-rarity recs 1–2 |
| 15 | A box opens when you walk into it (1.25 m); it's saved before the reveal, which joins the reward queue | Default | Place's rule, plus the audit's mid-reveal fix |
| 16 | Late joiners and reloads find an unopened box for every completion already reached | Default | Same spirit as the 4 Nov "later visitors" call; DESIGN 8 |
| 17 | The curio shelf shows what you own; what you don't stands under dust sheets | Decided | 2 Nov, gifts hint at themselves |
| 18 | The stowaway follows you, partners see it, and it rides trains | Decided | Design Table: the pet hops on your shoulder when you board a train. Fixes 3 Nov "a partner's pet not shown" |
| 19 | Crystals are personal: seven spots, the magnet and chime, a shelf row | New | **Personal** (owner question 2) |
| 20 | Gold finds are personal, with the pinned finds board | Default | DESIGN 6. The brass look is decided (5 Nov) |
| 21 | Each secret grants a cosmetic only it gives; hook and jump secrets use production's abilities | Default | Place's rule; DESIGN 6 |
| 22 | Missed prizes wait at the finders' bay; open either box and the other goes | Default | Place's rule |
| 23 | The two glide-only secrets wait at the bay from trains on | Default | Follows question 5. They return to the world with the glider |
| 24 | The telescope keeps only its fixed view; the buoys come across | Decided | 6 Nov, first prototype answers |
| 25 | The sea, gulls and breeze ambience plays in the live game | Decided | 1 Nov sound audit: tweak the ambience, don't cut it |
| 26 | The playtest flag (M or d-pad right) shows as "Flag" in every player's controls guide | Default | Owner calls, call-first feedback: flag moments without typing |
| 27 | The wood and stone growth rows build on railway milestones now | New | **No: they wait for cargo in slice 5** (owner question 1; finding 1) |
| 28 | Camps wake with their lines (camp 0 at path, camp 1 at Q3), with fireworks and chimney smoke | Default | Driven by what you connect, not by cargo, so it doesn't touch the 7 Nov call |
| 29 | A growth show plays on first sight of a fact and snaps on load | Default | Place's rule (applies when the rows come) |
| 30 | The forge workshop opens when the forge is lit | Decided | 5 Nov design proposals: "finishing it opens a tiny walk-in workshop" |
| 31 | The glider's code leaves `main` with D1, archived, and returns in the movement slice | New | **Yes, with an archive tag** (owner question 5; finding 2) |
| 32 | Interactable verbs, marks and every town, gift and stock line move verbatim | Decided | Owner calls: keep The Boogler's copy; plan header |

**Count:** 10 Decided, 18 Default, 4 New.

### Findings

1. **T6's growth rows contradict a dated owner call (changes T6, not T1).** On 7 November the owner approved "Train
   cargo and town growth: keep them for slice 5"
   ([line2-part2-greybox](line2-part2-greybox.md#open-questions-for-the-owner-answered-7-november), question 4). In
   Place the rows were cargo-built (`town.ts` line 1: "Cargo builds it"). DESIGN's core loop says "Towns grow from what
   arrives", and [growing-towns](../research/growing-towns.md) rec 1 ties each cargo to a district. Rows on milestones
   would teach that the town grows from milestones, and slice 5 would then change what that means. **Call:** T6 ships
   the workshop (decided 5 November) and the camps waking (call 28), and leaves the rows for slice 5. `town` and
   `stone` stay false until then; T1's test `'town and stone stay false'` already says so. Without the rows, the
   village still visibly changes: shop and museum, population, workshop, camps. D1 deletes `town.ts`'s row code with
   the rest; slice 5 restores it from the archive tag in finding 2. If the owner prefers milestones, T6a as written is
   the switch, and it's reversible.
2. **The glider is deferred, not dropped.** The inventory's "The glider is **dropped** (7 November …)" misstates
   it. On 7 November its spot was "kept for the movement slice", and the owner has since said he just wanted it later
   in the game. The 1 November ("glide is an unlock") and 5 November ("glider speed" upgrades) calls keep it in the
   vision, and it was a 3 November highlight ("The glider, stop and reopen"). The code survives in history at
   `46eb7125`, but a base commit is easy to lose track of. **Call:** D1 deletes it as planned. Before deleting, D1
   tags its parent commit `archive/place` and pushes the tag (owner calls, prototype lifecycle; the precedent is
   `archive/moves`). D1 names the tag in its commit body and in `docs/game-design/place.md`. That file's glider
   paragraph (the BotW tuning: 10 m/s, 3.2 m/s sink, 5.2 m camera) becomes a short "Deferred: the glider" note, not a
   deletion. The movement slice restores `moves.ts`/`moves-view.ts` from that tag and puts the two glide secrets
   back in the world.
3. **Question 4 is already decided.** The 6 November "roughly six hours" entry says the shop stays free until the
   shared wallet ships. No wallet ships today: `src` has no wallet. Revisit this when the wallet lands.
4. **Two kinds of crystal.** Open question 19's crystals are a shared building resource you mine and carry to make
   pillars. Seven personal shelf crystals are fine now. When pillars come, the shelf ones need a distinct name or
   look (shards, specimens), or must fold into the pillar crystals, so "crystal" doesn't mean two things. No change
   to K1.
5. **Players walked past the town last time (adds a T1 proof, no step change).** Round 4 (3 November): house 5 s,
   shop 7 s, the museum never, `Talk` shown 11 times and pressed 0, nothing tried on. Solo, with time, the owner loved
   the NPCs and the museum (4 November). This plan ports Place as it was, so that discovery gap comes along.
   - T1 adds one still from the path at Sleeves, on a fresh world: does the house door read as open and lit from
     there? (DESIGN 11; [town-interiors](../research/town-interiors.md) rec 1.)
   - T2's talk still checks that a resident's bark is visible from the doorway. Players learn to go in from that pull,
     not from a prompt.
6. **Different boxes for each friend is a call, not an accident.** In round 4 Grant asked about it. C1 keeps a
   personal roll. [cosmetic-rarity](../research/cosmetic-rarity.md) ("give each friend their own result from the
   same shared accomplishment") and the 6 November personal-wearables call support it. It's logged with call 13.
7. **Conversation framing indoors.** [town-interiors](../research/town-interiors.md) rec 3 asks the conversation
   camera to respect indoor clearance. T2 mounts conversations inside rooms, so T2's talk still should be taken
   indoors in the house, not only at a door.
8. **The playtest flag is visible to everyone.** "Flag" in the controls guide on boogle.club means nothing to a
   visitor who isn't playtesting. This is a default, so it ships, but it's on the owner's small-calls list.

**Copy.** No line of The Boogler's or the town's is edited or lost. In `src/proto/place`, The Boogler appears only in
comments (`shop.ts`, `score.ts`, `folk.ts`, `chatter.ts`). Suspect lines for the owner: player-facing lines in modules
D1 deletes. Each is replaced or removed by a decision, but none moves anywhere:

- `objective.ts` prompts such as "Follow the path." and "That was the whole test. Wander as long as you like." (the
  objective was removed 3 November);
- `celebrate.ts` banners "Far Head!" and "Thanks for playing!";
- `coop.ts` buttons "Start over (both)" and "Really? Resets you both";
- `moves.ts` control labels "Open or close the glider, in the air" and "Hook shot, at a ring". The glider's label
  comes back with the archive tag.

### Owner questions

None new. The designer decided the plan's five, below, and logged each one. None blocks a job.

## Owner questions

1. **Town growth and the forge workshop.** Production has no train cargo yet; that's production-core slice 5, as you
   agreed on 7 November. Should the village's new buildings rise from railway milestones now (forge lit, trains, Far
   Head, the pier), with the workshop opening when the forge lights? Or should they wait until trains carry cargo to
   town? *Recommended: milestones now.* The same buildings rise for everyone, no new state, and slice 5 swaps the
   trigger for real deliveries later.
   **Status:** Decided by designer, logged in agent-calls; owner may revisit. **Call:** the workshop opens when the
   forge is lit (decided 5 November), and the camps wake with their lines. The wood and stone rows wait for cargo in
   slice 5, as the owner approved on 7 November. See design review, finding 1. T6a as written is the switch if
   the owner wants milestones.
2. **Crystals: yours, or everyone's?** Personal means each player finds all seven, with their own magnet-and-chime
   moment and their own shelf. Shared means the first finder takes it for the whole world; that needs new server state
   and a world reset. *Recommended: personal for now.* Crystals do nothing yet, and when they become the pillar
   resource (open question 19) they become shared state then.
   **Status:** Decided by designer, logged in agent-calls; owner may revisit. **Call:** personal, as recommended. No
   `WORLD_NS` bump and no J3 overlap. When pillars come, the shelf crystals get a distinct name or look (finding 4).
3. **Station boxes after the scarf.** In Place, every finished stretch after T2 handed you a personal box: common,
   rare or Wonder, with a guaranteed Wonder by the third. Production stops after the hat and scarf. Bring the boxes
   for T3 and Q1–Q6 back? *Recommended: yes, as personal wearables.* This matches 6 November ("what you wear …
   stays personal"). The alternative is to keep only secret crates and the shop.
   **Status:** Decided by designer, logged in agent-calls; owner may revisit. **Call:** yes, personal, with each
   player rolling their own box (finding 6). This fits "Rewards should be maximal" (2 November) and the Design Table's
   boxes with rarity.
4. **Does the shop cost anything?** In Place, Fine Prices shows absurd prices that climb with the money and charges $0.
   *Recommended: keep it free and the prices a joke* (6 November: money in dialogue stays a joke; NPC copy unchanged).
   The alternative is to charge the shared wallet for shop wearables.
   **Status:** Decided by designer, logged in agent-calls; owner may revisit. **Call:** free, with joke prices. The
   owner's 6 November "roughly six hours" entry already covers this ("the shop stays free until the shared wallet
   ships"); revisit when the wallet lands (finding 3).
5. **The glider.** It isn't in the live game (left out of line 2 part 2 for the movement slice). Deleting
   `?proto=place` deletes its code, which stays in Git history, and the two glide-only secrets would wait at the
   finders' bay instead. *Recommended: yes, delete it now and rebuild it in the movement slice.* The alternative is to
   park the glide physics in production, unused, until then.
   **Status:** Decided by designer, logged in agent-calls; owner may revisit. **Call:** delete it in D1, deferred and
   not cut. Before deleting, D1 tags its parent commit `archive/place` and pushes the tag. It names the tag in its
   commit and in `docs/game-design/place.md`, keeps the glider's tuning as a "Deferred: the glider" note, and the
   movement slice restores the code from that tag (finding 2). `46eb7125` also has it.
