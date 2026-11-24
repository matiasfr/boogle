> **Status: built. Steps 1–3 on main (#2300, #2321); steps 4–6 on main (#2324, 23 November); verification below.** Backlog row (P3): "The rails' own capacity upgrade: rails start at 8 on
> everyone's back, and a later upgrade raises them". Brief: [rails-capacity-upgrade](../brainstorms/rails-capacity-upgrade.md).
> Decision: [rewards, 18 November](../decisions-rewards.md#d-2026-11-18-decisions-page-rewards). Base: `origin/main`
> `99207c548`, world `v62`. Steps 1 and 2 change rules, wire, save and seeds (one `WORLD_NS` bump, independent review).
> Steps 3 to 5 change only what players see. Step 6 teaches the bot.

# The Rail yoke

## Goal

Once Q1's (Station 4's) bill is in, the forge's little guy makes the Rail yoke beside the forge rail rack. Whoever
takes it takes it for the room, and every back carries 16 rails from then on instead of 8. Q2's and Q3's forge hauls
become one trip each for a solo player.

It serves **11. Show, don't tell**: you watch the forge make the thing that ends the walk you just did twice. It also
serves **8. Enjoyable alone and together**: it mostly helps a player alone (measured below). **6. Communal world** is
unchanged: the yoke is the room's. It bends no principle. One reading of the owner's words is open (question 1).

**What is decided** (quoted from [the 18 November entry](../decisions-rewards.md#d-2026-11-18-decisions-page-rewards)
and not reopened): "the rails' upgrade raises rails from 8 to 16, made by the forge's little guy beside the forge rail
rack once Q1's (Station 4's) bill is in and shown on Q1's board beforehand, picked up like the pack (a new op, a field
on the saved `Rail` row and a world reset), and named the Rail yoke, an iron yoke over the pack frame's shoulders";
"Canopy Town's carry sling stays a separate later grant". The owner's picks, word for word: "The forge's little guy,
after Q1's bill"; "A pickup"; "Rail yoke (an iron yoke)". Every reveal gives each page online the card
([cutscenes for everyone](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone)).

**Research:** [progression-flow-layout](../research/progression-flow-layout.md). The plan holds its three rules: the
yoke is in sight of the rack where Q2's rails are taken, it gates nothing, and it strands nobody. It also uses the
"key in sight of the lock" lens. [route-contract](../research/route-contract.md): the upgrade removes trips, not work,
because every rail is still carried into its frame. [communal-progression](../research/communal-progression.md):
progress shows as world state (the yoke on every back), not as a number.

## What stands today (read from code, 19 November)

| Thing | Where | Code |
| --- | --- | --- |
| Rails capacity 8, no upgrade | `RAILWAY_CAPACITY.rails` | `src/sim/railway-layout.ts:8`; `capacityOf` `src/sim/railway-queries.ts:91-96` |
| Wire bounds | `MAX_KIND_CAPACITY` = max(16, 16, 8) = 16; `MAX_ACCEPTED` = 48; `CARRY_MAX` = 16 | `railway-queries.ts:85-88`; `src/adapters/railway-intents.ts:65` |
| The forge rail rack (`rail.forgeTake`, reach 340 cm) | world (918.55, 15.74); axis (a −2.95, c 11.2); 3.6 m from road 2 | `LINE2_FORGE.rackX/rackZ`; `PROPS.rack` in `src/place/home-station.ts:307`; `src/world/railway-server.ts:257` |
| Q1's frame and bill (16 logs + 6 rails) | world (925.07, 17.51), 6.8 m from the rack | `LINE2_STATIONS[0]`; `fundQ` sets `QJob.start` in the deposit that completes the bill (`railway-sys-line2.ts:177-187`) |
| The pack: the pattern to copy | `rail.pack`, `Rail.pack`, order 26, predicted; reach 340 cm from `LINE2_PACK` | `railway-sys-line2.ts:303`; `railway-server.ts:120,268`; `railway-predict.ts:68`; `railway-effects.ts:110`; `railway-marks.ts:26`; `railway-intents.ts:37,103,186,252`; `ability-arrival.ts:93`; `tools.ts:177-262,276-295`; `forge-rewards.ts` (the errand) |
| Where the seeds take the pack | only in `stockQ6` (and `railwayAtForgeLast('lit')`), so every seed from `q2` to `q6-stocked` has no pack | `src/sim/railway-seed-route.ts:95,244` |
| Q frames' boards | `frame.setTag(on, status)`, with no marks; off once funded; the frame folds when its stretch is laid | `src/entities/railway/line2-view.ts:1310`; `stations.ts:454`; "Finished frames pack up" in `docs/game-design/place.md` |
| Worn rails | instanced, `MAX_RAILS` = `CAPACITY.rails`. With the frame: two upright banks of `k % 2`, 6.5 cm deep a pair. Without it: rows of 4 across | `src/render/carry-models.ts:14,88-112`; `line-cargo.ts:217` |
| The squares' rails row | as long as `capacityOf(RAILS)`; a row that grows holds for 2 s | `src/entities/railway/sources.ts:673-675`; `src/features/haul-stack.ts:157-183` |

`npm run loop -- node Q1`: "16 logs + 6 rails, carries 1x41, 1x7, requires: forge". `node Q2`: "2x10 (cart), 2x44,
grind 109 / 54". `node Q3`: "1x3 (cart), 2x110, grind 223 / 113". `node pack`: "optional, requires: forge".

## Measured: what changes for the player

Method: on `origin/main` (rack at its new spot), I ran `npm run loop` and `npm run loop -- run --players 1|2`, then
the same with `RAILWAY_CAPACITY.rails` set to 16 in a scratch edit. The edit was reverted and nothing was committed;
outputs are in the scratchpad. Rails at 16 from the start is the same as the yoke at Q1's bill for every beat after Q1,
because Q1's 6 rails are carried before the yoke exists. The loop graph has no yoke node yet; step 2 adds one.

**Line 2's carries and loaded metres** (the graph: straight-line, one way, for the busiest player, logs and rails
together; rail carries × metres from the forge rack or the vehicle that brings them):

| Beat | Rail carries before → after | Loaded m, 1 player | Loaded m, 2 players |
| --- | --- | ---: | ---: |
| Q1 (6 rails, before the yoke) | 1×7 → 1×7 | 48 → 48 | 48 → 48 |
| Q2 (12 rails, forge rack) | 2×44 → **1×44** | 109 → **64** | 54 → 54 |
| Q3 (12 rails, forge rack) | 2×110 → **1×110** | 223 → **113** | 113 → 113 |
| Q4 (16, cart shelf) | 2×3 → 1×3 | 10 → 7 | 7 → 7 |
| Q5 (24, cart shelf) | 3×10 → 2×10 | 50 → 40 | 30 → 20 |
| Q6 (32, train) | 4×3 → 2×3 | 20 → 14 | 10 → 7 |
| Q7 (20, train) | 3×3 → 2×3 | 17 → 14 | 10 → 7 |
| **Line 2, Q1 to Q7** | **17 → 10 carries** | **477 → 300 (−177 m)** | **272 → 256 (−16 m)** |
| Steel works (12 rails, train) | 2×7 → 1×7 | 20 → 13 | 13 → 13 |

Rails alone over line 2 go from 372 to 196 loaded metres solo, and from 196 to 180 for the busier of two players. At
5.6 m/s there and back, 177 m is about **63 s solo** and 16 m about **6 s for two**. This agrees with the brief's
184 m / 66 s, which also counted the steel works.

**The real rules in Node** (`npm run loop -- run`, straight-line lower bound, no terrain):

| | 1 player | 2 players |
| --- | --- | --- |
| Whole built route | 38:56 → 38:18 (−38 s) | 35:28 → 35:21 (−7 s) |
| Q2 took | 1:23 → 1:20 | 0:55 → 0:55 |
| Q3 took | 1:34 → **0:49** | 1:27 → 1:07 |
| Q4 · Q5 · Q6 · Q7 took | 0:39 · 2:10 · 2:05 · 1:32 → 1:01 · 2:08 · 1:57 · 1:28 | 1:11 · 2:01 · 1:53 · 1:41 → 1:29 · 2:00 · 1:48 · 1:39 |
| Calibrated by human detours | 46:03 → 44:29 | 42:04 → 39:13 |

Notes. Q4 "took" grows only because the room reaches Q4 sooner (11:13 against 11:37) and then waits for the cart's
shelf. The scratch run also saved 13 m at Q1, which the real yoke can't (139 → 126 walked); step 2's yoke node removes
that. The calibrated rows multiply walked metres by thin detour factors (Q2 ×7.54, n 2), so they are weak evidence.
Q3's detour is uncalibrated (n 0). The brief asked for a bot run to measure the real solo saving at Q2 and Q3; it
belongs to the checkpoint.

**What it shows:** the yoke is a solo relief, as the brief said. Q3's haul halves (about 40 s solo), and two players
gain almost nothing because they already split the two carries. Nothing in the order or the softlock probes changed:
every probe still refuses its out-of-order node.

## Design

### Sync kinds and authority

| Piece | Kind | API / owner |
| --- | --- | --- |
| `Rail.yoke` (bool) | Server state, replicated on the `rail` row, saved with the checkpoint | the `yoke` system (`rail.yoke`) in `src/sim/railway-sys-line2.ts`; read by `capacityOf` |
| Who may take it | Server validation | `railway-server.ts`: `near(LINE2_YOKE.x, LINE2_YOKE.z, LINE2_YOKE.reach)`; the rule refuses before Q1's bill and once taken |
| The rails capacity, 8 → 16 | derived from `Rail.yoke` (no new field) | `capacityOf(w, RAILS)`; save validation reads it (`railway-check.ts:169-183`) |
| The yoke waiting, the little guy, the card, the worn yoke, the board mark | Local presentation over accepted state | `forge-rewards.ts`, `tools.ts`, `ability-arrival.ts`, `carry-models.ts`, `line2-view.ts` |

Nothing new is added to presence, messages, tunables or client state registrations. There is no client lead and no
classic edit generator. The server owns rule ticks and saves.

**The rule** (`src/sim/railway-sys-line2.ts`, beside `pack`):

```ts
/** The Rail yoke: made at the forge rail rack once Q1's bill is in (forge-made rewards); one take gives every back
 * RAILWAY_CAPACITY.railsYoke rails instead of 8. */
export const yoke = defineSystem('rail.yoke', { reads: [QJob], writes: [Rail], phase: 'act', order: 27 }, (w) => {
  if (!line2YokeReady(w) || w.get(Rail, railId(w))!.yoke) return 0;
  w.mut(Rail, railId(w))!.yoke = true;
  return 1;
});
```

`line2YokeReady(w)` in `src/sim/railway-queries-line2.ts` reads `qjob(w, 0).start >= 0 || !!qjob(w, 0).completion`
(the `keenEdge` pattern: "Q1's bill in"). Order 27 is free among the `act` systems (26 is `pack`, 28 the sea switch).
It needs Q1's bill only, not the pack (question 1).

**Capacity:** `RAILWAY_CAPACITY` gains `railsYoke: 16`. `capacityOf`'s RAILS branch becomes
`rail.yoke ? CAPACITY.railsYoke : CAPACITY.rails`. `MAX_KIND_CAPACITY` lists `railsYoke` in place of `rails`, so it is
still 16, `MAX_ACCEPTED` is still 48, and **no wire bound moves**. The cradle clamp in `forgeTake` (`:258-260`) is
unchanged: it caps by what the cradle still needs. `depotRailTake` and the leg racks take up to `roomOf`, so a full
16-rail shelf (Q4) comes off in one take.

**Validation:**

- **Command.** `rail.yoke` joins the server's op list (`railway-server.ts:120`), `RailwayIntent`'s no-field union
  (`railway-intents.ts:37`), its validator branch (`:103`) and `NOT_MATERIAL` (`:186`). Reach is
  `case 'rail.yoke': return near(LINE2_YOKE.x, LINE2_YOKE.z, LINE2_YOKE.reach);`, with
  `LINE2_YOKE = { x: 91958, z: 1856, reach: 340 } as const` in `src/sim/railway-line2-layout.ts`. That file is already
  in the server image, so the image lists don't change.
- **Save.** `railway-check-line2.ts` gains `if (r0.yoke && !line2YokeReady(w)) bad("yoke before Q1's bill")`. The
  accounts check already fails a save holding 9 to 16 rails without the yoke and 17 or more with it, because it reads
  `capacityOf`.

**Prediction and correction:** `rail.yoke` joins `RAIL_PREDICTED` (`railway-predict.ts:68`), exactly as `rail.pack`.
On the press the presser's view shows the 16-square row and the worn yoke at once. The card waits for the accepted
receipt (`tools.ts` `onAccepted`), so a queued press is never treated as done. If the server refuses (out of reach,
or an old tab), replication restores `yoke: false`: the worn yoke and the extra squares go, and no card shows. If two
players press, the loser's press is `noop` and the yoke stays on, because it is the room's. `railway-effects.ts:110`
gains `op === 'rail.yoke' ? railRow(w).yoke`, so confirmation doesn't repeat a predicted effect.

**Receipts and marks:** `railway-marks.ts`: `'rail.yoke': 'yoke gained'`. `dev/playtest/beats.ts`:
`['gained the rail yoke', /^yoke gained$/]`. `dev/loop/trace.ts`: `yoke: 'yoke gained'`.

**Command adapter:** `railwayActs` gains `takeYoke: () => submit({ op: 'rail.yoke' })`. `dev/peer-test/ws-page.ts`
gains `case 'rail.yoke': return adapter.takeYoke();`.

### Where it waits (a placement)

`PROPS.yoke = { ...axisPoint(-2.95, 14.2), yaw: rad(90 - AXIS.bearing) }` in `src/place/home-station.ts`, which is
world (919.58, 18.56) and sim `(91958, 1856)` cm. That is on the rack's outer side, square to it, 1.7 m past the
rails' ends (c 12.5). Measured from that point:

- 3.0 m from the rack's centre.
- 5.6 m from Q1's frame.
- 6.6 m from road 2's centre, so it is clear of the cart at its forge stop and of the laying machine on line 2.
- 14.5 m from line 1.

`test/home-station.test.ts` pins `LINE2_YOKE` to `PROPS.yoke`, as it pins the rack.

Its 3.4 m reach overlaps the rack's. Standing between them, a player can be offered both "Take rails" and the yoke;
the existing facing pick (`interact-pick.ts`) chooses, as at the pedestal. Both are real actions, so nothing is
stolen, and the overlap puts the yoke exactly where Q2's rails are taken.

### What players see (Local over accepted state)

- **Q1's board, before its bill** (`line2-view.ts:1310`): `frame.setTag(on, status, k === 0 && job.start < 0 ?
  [{ kind: 'yoke', ready: false }] : [])`. `reward-glyph.ts` gains `'yoke'`: an outline of a shoulder bar with two
  hanging hooks. After the bill the board goes as it does today. A ready mark has nowhere to stay, because Q1's frame
  folds when its stretch is laid; the glimmering yoke on its block is the cue from then on.
- **The little guy makes it**, on the live crossing of `line2YokeReady` false → true (never on restore, reload, late
  join or resync). The bare yoke shows on a timber block at `PROPS.yoke` and is offered from that frame. The pack's
  errand, generalised into one errand with two users (no second copy): `folk.crewStart(at, 1, false)` takes the
  nearest villager within 30 m. He walks to the rack's east end, lifts an iron offcut (a 1 m dark bar, a separate prop;
  the rack's drawn rails don't change), carries it on his shoulder to the block and hammers for 1.4 s. Then the
  hooks go on with a `clank` and about 8 sparks from the shared pool, and `crewEnd()`. The fallbacks are the pack's as
  built: with nobody within 30 m, or the crew still busy with the lit forge's roof, it finishes itself after 1.5 s; a
  leg counts as arrived after 10 s; the errand stops at 16 s. A claim accepted mid-errand ends it. Reduced motion and
  `restore()` snap to done. While it waits, it stands scaled about 2× with the pack's coral glimmer.
- **The card:** the opener's `reveal.youGot({ key: 'yoke', ...YOKE_REWARD, model, from: yokeTarget })` in `tools.ts`,
  on the accepted receipt. Every friend online gets the same card through `ability-arrival.ts` (`{ key: 'yoke', op:
  'rail.yoke', cue: 'pickupHook', has: rail(w).yoke, badge: true, card: true }`) under the free rule. A friend who was
  away gets the flourish with a small yoke (`axeModel('yoke')`). There is no camera cut: like the pack.
- **On every back** (`backSeam.yoke`, derived from `Rail.yoke` for you and every friend, with no presence key): an
  iron bar across the shoulders over the pack frame, with two short arms. Rails hang in two banks from the arms, up to
  8 a side (4 a side at 8 rails). If the pack was skipped, the yoke sits on bare shoulders and the rails hang the same
  way. `MAX_RAILS` becomes `CAPACITY.railsYoke`.
- **The squares:** the rails row grows from 8 to 16 with the existing 2 s grown-row hold (`haul-stack.ts:178`). No
  new code.

**Copy, all placeholders for the owner** (in `src/entities/railway/reward-data.ts`, marked as the forge guide's are):
`YOKE_REWARD = { name: '[Rail yoke]', line: '' }`. The line is empty, as the pack's is. The prompt verb is
`YOKE_VERB = '[Take]'`. The board shows only a glyph. No line of The Boogler's is touched, and no character speaks.

### Mixed builds and the world bump

Reading `server/src/room-ids.ts` and `server/src/host/rooms.ts:48`: the server hosts a room only when
`currentRoomId(id)` holds. For an id that carries a namespace, as every railway room's does, that means it starts with
the server's own `rail-<WORLD_NS>-`.

- **New client, old server** (the web client deploys in minutes, the server about 20 minutes later): the new tab asks
  for `rail-<next>-…`. The old server doesn't host it, so the tab can't join the railway room until the server
  deploys. It retries; I did not verify what it shows meanwhile. Tabs already joined to the old room keep playing the
  old world.
- **Old client, new server:** the old tab's `rail-v63-…` is no longer a current room, so it is refused. The update
  notice (`version.json`) brings it onto the new build. Boot cleanup retires the v63 saves: the world reset the
  decision accepted.
- **Ship order:** steps 1 and 2 in one ship (one review), with nothing ordered by hand. Pages and the server deploy
  from the same merge. For about 20 minutes new tabs wait for the server; that gap is accepted under "No old builds in
  development". No compatibility code. Steps 3 to 6 are client and dev only and ship on their own. Until step 4 ships,
  nothing in the live room offers the yoke, so live backs stay at 8 rails; seeded jump-ins from `q2` on already have it.

`WORLD_NS`: **the next free version**, `v64` (the track layer's slower start took v63 first), with a dated history line in
`src/world/namespace.ts`: "the Rail yoke: `Rail.yoke` and `rail.yoke`, rails 8 → 16 once taken
(docs/plans/rail-yoke.md); no migration."

## Steps

Each step leaves `node dev/ship-check.ts` green. The extra checks named for a step are its builder's. Looks use a
disposable production room.

- [x] **1. The rule, the wire, the save and the world bump.** Seeds unchanged.
  - `src/sim/railway-layout.ts`: `railsYoke: 16`.
  - `src/sim/railway-components.ts`: `Rail` gains `yoke: 'bool'`, appended after `shelfOut`.
  - `src/sim/railway-line2-layout.ts`: `LINE2_YOKE`, with its comment (Place's `PROPS.yoke`, pinned by
    `test/home-station.test.ts`).
  - `src/place/home-station.ts`: `PROPS.yoke`.
  - `src/sim/railway-queries-line2.ts`: `line2YokeReady`.
  - `src/sim/railway-queries.ts`: `capacityOf`, `MAX_KIND_CAPACITY` and its comment ("rails 8, 16 with the yoke").
  - `src/sim/railway-sys-line2.ts`: `yoke`.
  - `src/sim/railway-systems.ts`: `'rail.yoke': [yoke]`.
  - `src/sim/railway-check-line2.ts`: the save rule.
  - `src/world/railway-server.ts`: the op list and the reach case.
  - `src/world/railway-predict.ts`: `RAIL_PREDICTED`.
  - `src/adapters/railway-intents.ts`, `railway-effects.ts`, `railway-marks.ts`: the union, validator, `NOT_MATERIAL`,
    `takeYoke`, the done check and the mark.
  - `dev/playtest/beats.ts`, `dev/loop/trace.ts`, `dev/peer-test/ws-page.ts`: the mark, the beat and the case.
  - `src/world/namespace.ts`: the next free version (`v64`) and its line.
  - `src/sim/railway-seed-route.ts`: split `railwayAtQ2` into two exported helpers, neither of them a stage:
    - `railwayAtQ1Last(): Seed`: forge lit, axe taken, Q1's 16 logs and 5 of its 6 rails in, `a` still carrying rails;
    - `railwayAtQ1Funded(): Seed`: the same plus the last rail, then `need(qjob(w, 0).start >= 0, "Q1's bill in")`.
    `railwayAtQ2` calls `railwayAtQ1Funded` and lays Q1. The op stream is unchanged, so no golden moves for this.
  - Tests, each in an existing file:
    - `test/railway-capacity.test.ts`, new test "the rail yoke lifts rails to 16 once Q1's bill is in". On
      `railwayAtQ1Last`, `rail.yoke` gives 0. After the last rail's deposit it gives 1, `caps` reads
      `[8, 8, 16]` and a second opener gets 0. `forgeTake` gives up to 16 (the rack's count permitting). A save with 16
      rails loads, and a copy with `yoke: false` fails on `accounts`. The existing "rails stay 8" assertions in that
      file keep 8, because the seeds have no yoke yet.
    - `test/fixtures/railway-bad-worlds.ts`: `{ site: 'line2 yoke', message: "railway: yoke before Q1's bill", break:
      (w) => set(w, Rail, { yoke: true }) }` on a world before Q1's bill. `test/railway-check.test.ts` runs it.
    - `test/railway-replicate.test.ts`, in the route test after Q1's rails (`:420-440` pattern). The yoke is refused
      before Q1's bill and predicted on a's mirror copy (`press.n === 1`, `capacityOf(predicted, RAILS) === 16`). The
      confirmed mirror waits for the server, a gets 1 and b gets 0, and the late joiner gets it (`:563` pattern).
    - `test/railway-marks.test.ts`: `'yoke'` in the op list (`:30-41`).
    - `test/home-station.test.ts`: the pin.
    - **Host test**, `server/test/railway-line-host.test.ts`: a new test beside the pack's (`:470-540` harness). It
      loads `railwayAtQ1Funded()` into a real host, opens a session and sends each op through
      `host.deliver({ t: 'r:edit', e: { op: 'rail.yoke', epoch, request, at, ms } }, sid)`:
      - from Q4's frame: `rejected`, `yoke` false;
      - from `LINE2_YOKE`: `accepted`, `yoke` true;
      - again: `noop`;
      - `rail.forgeTake` from the rack, after ticking until the rack holds 9 or more: `accepted` with more than 8;
      - a host restart (`close({ save: true })`, recreate) keeps `yoke` true and the rails on the back.
  - Fixtures that move with the bump: `test/fixtures/rail-schema.json` (`GOLDEN=1 node --test
    test/railway-schema.test.ts`), `test/fixtures/railway-golden.json`, `test/fixtures/railway-ops-golden.json`,
    `test/fixtures/railway-m12-trace.json`, `test/fixtures/railway-tick-order-heads.json` and
    `server/test/fixtures/world-host-trace.jsonl.gz`. Each gets its dated note: `test/railway-m12.test.ts`'s header,
    `server/test/world-host-trace.test.ts`'s header, and `test/railway-ops.test.ts`'s first line. Before regenerating,
    a keyed comparison against the v63 fixtures (main's when built; the plan was written at v62) must show only a `false` `yoke` column added and the hashes that
    follow from it. No tick, length, input or result may change, because no seed takes the yoke yet.
  - **Check:** ship-check. Then the whole server suite (`cd server && npm test`), `npm run test:net` (goldens moved),
    `npm run level-check`, and `npm run loop -- run` (unchanged order, no softlock).
  - *Risk: **high** (rule, wire, save and server validation). **Independent review required**: room-safety "Don't",
    mixed-builds, the keyed fixture comparison and the host test.*

- [x] **2. The seeds and the loop take the yoke** (seed data only: no bump,
  [seed goldens](../agents/owner-calls.md#seed-goldens)).
  - `src/sim/railway-seed-route.ts`: in `railwayAtQ2`, straight after `railwayAtQ1Funded()`, add
    `need(act(s, 'a', 'rail.yoke') === 1, 'the rail yoke')`. `act` returns 0 silently on a refusal, so the `need` is
    required. The `stockQ6` comment changes to "rails 16 with the yoke". Every stage from `q2` on now has 16-rail backs.
  - `src/sim/railway-seeds.ts`: a look stage `q1-last` from `railwayAtQ1Last()` (not in `JUMPS`), added to the last
    shard in `test/helpers/railway-golden.ts`'s `SHARDS`, so a look's deposit plays the live edge.
  - `dev/loop/graph.ts`: a `yoke` node (optional, `at: p(LINE2_YOKE)`, `ops: ['rail.yoke']`, mark `yoke gained`). It
    requires Q1 funded (`dec('Q1', 'rules', …)` with the predicate on `QJob.start`) and is declared after `Q1`, so the
    canonical order takes it there. Its cue is `decided`, not on main, until step 4 flips it.
  - `Upgrades` gains `yoke`, and `carryOf('rails')` reads it.
  - `dev/loop/run.ts`: `done.yoke` and a `device(g, pl, LINE2_YOKE, 'rail.yoke', () => qjob(w(), 0).start >= 0)`
    policy. Also read `dev/loop/report.ts:34`'s canonical-index use.
  - Assertions that move because seeds now carry 16 (each listed in the commit message for the reviewer; none
    weakened):
    - `server/test/railway-line-host.test.ts:503-518`: "a row of 8 rails: half the shelf" becomes 16, the whole shelf,
      and the "emptied row takes the shelf rest" and restart lines follow.
    - `server/test/railway-steel-host.test.ts:868-887`: the 8-rail expectations.
    - `test/railway-capacity.test.ts`: `works-arrive`'s `caps` become `[16, 8, 16]` and `[16, 16, 16]`.
    - Whatever else ship-check's affected tests show in `test/railway-cart.test.ts`, `railway-works.test.ts`,
      `railway-steel.test.ts`, `railway-leg2-*.test.ts` and `recheck*-greybox-leg2.test.ts`.
  - Regenerate the seed golden (`GOLDEN=1 node --test --test-concurrency=1 'test/railway-golden-*.test.ts'`), and the
    ops golden and M12 traces if their seed-built worlds moved, each with a dated "seed data only" note.
  - **Check:** ship-check. Then the whole server suite (the seeds also build the jump-in worlds), `npm run test:net`,
    and `npm run loop -- run` (the yoke node is taken after Q1, with no softlock; the graph reads Q2 64 and Q3 113 at
    1 player).
  - *Risk: medium. **Independent review required**: the keyed golden comparison must show that only stages built on
    `railwayAtQ2` moved, and every moved assertion is checked against its reason. Steps 1 and 2 may share one review
    and one ship.*

- [x] **3. The yoke on the back** (Local only). Before starting, run `npm run inflight` again (see open question 3).
  - `src/render/carry-models.ts`: `MAX_RAILS = CAPACITY.railsYoke`. `cargoCapacity('rails', frame, yoke)` and
    `setRails(amount, frame, yoke)`: with the yoke, rails hang in two banks from the yoke's arms (up to 8 a side, the
    first 8 as 4 a side). Without it, the seating is unchanged. The yoke mesh: an iron bar across the shoulders with
    two arms, the metal of the worn rails, built in `gear-models.ts` beside `packFrameMesh`.
  - `src/player/haul-back.ts`: `backSeam.yoke`.
  - `src/entities/railway/sources.ts`: `backSeam.yoke = () => railRow(world()).yoke`.
  - `line-cargo.ts:217` passes it.
  - `tools.ts` wears the yoke on every avatar beside `wearPack`.
  - `dev/look/evals/pack-frame.ts` gains `&yokeOn=1&railLoad=0|8|16`.
  - **Look** (`npm run look -- --rail-seed q2-done --eval dev/look/evals/pack-frame.ts`; after step 2 that seed has
    the yoke and no pack). Back and side stills of each case:
    - yoke with 8 and with 16 rails, with the pack frame and without it;
    - 16 logs, 16 stone and 16 rails at once (48 pieces);
    - with the glider worn (a `q6-done` seed).
    Each must read as "an iron yoke over the shoulders, two stacks of rails". Nothing may cross the head in the follow
    view, or clash with the glider roll or the log bundle. Allow up to three rounds of tuning (verification.md).
  - Update `docs/game-design/place.md`'s pack line ("rails stay 8" becomes the yoke's) and its worn-load paragraph.
  - *Risk: low. Self-review on the stills.*
  - **Built 19 November 2026** (`claude/rail-yoke-back`, view only): `yokeParts`/`yokeMesh` in `src/render/gear-models.ts`
    (darker `#56616b` iron bar over `#69472e` shoulder pads, arms at `x ±0.42`, `y 0.80`, hung stirrups), `setRails` and
    `cargoCapacity` in `src/render/carry-models.ts` (hiding the pack's `railSeat` while the yoke holds the rails),
    `backSeam.yoke` in `src/player/haul-back.ts`, wired in `src/entities/railway/sources.ts`, `line-cargo.ts` and
    `tools.ts` (`wornOn` helper shared with the pack frame, `inspect().yokesWorn`), and `pack-frame.ts` (`yokeOn`,
    `railLoad`, `stoneLoad`, `packCam=follow`). **Stills** ([rail-yoke/](rail-yoke/), `q2-stocked` because no `q2-done`
    seed exists, and `q6-done` for the glider): `step3-y8-pack-back.png`, `step3-y16-pack-back.png`,
    `step3-y16-pack-side.png`, `step3-y16-bare-back.png`, `step3-48-back.png`, `step3-48-side.png`,
    `step3-follow-16.png`, `step3-glider-back.png`. All cases read as an iron yoke with two rail banks, clear of the
    head in follow view and clear of the glider roll and log bundle. Weakest read: from behind with the pack frame worn,
    the pack's shoulder straps and log bundle mostly hide the yoke's cross-bar (it reads clearly on bare shoulders and
    from the side). **Not verified:** a remote player's avatar wearing the yoke in a two-page look, motion while running
    or riding, phone width; not tested on a device.

- [x] **4. The yoke waits at the rack, and Q1's board shows it** (Local, plus one placed prop).
  - Built on `codex/rail-yoke-rack`. Opened `.look/yoke-board-still.png` (16/16 logs, 5/6 rails, two-hook outline) and `.look/yoke-wait-still.png` (glimmering iron on the block across the paid frame). Level check reported 21 reports, the yoke reachable, and 5,244 grounding placements with zero problems. The prefab owns the interaction. Its reach is 3.4 m. Both objects use point scoring for the facing pick.
  - `reward-glyph.ts`: the `'yoke'` kind. `stations.ts`'s `RewardMark` kind widens to include it.
  - `line2-view.ts:1310`: Q1's marks.
  - `forge-rewards.ts`: the yoke's block and model at `PROPS.yoke`, shown once `line2YokeReady` and `!rail.yoke`, with
    the coral glimmer, plus `yokeAt()` and `yokeTarget()`. No errand yet: on the live edge it simply appears done.
  - `tools.ts`: `yokeAvailable()`; the target `{ id: 'railway-yoke', verb: YOKE_VERB, at: yokeTarget(), r: 3.4,
    run: adapter.takeYoke }` (offered when `inReach(yokeAt)`); the opener's card on `onAccepted`; `cardFor('yoke')`,
    `axeModel('yoke')`, and `inspect().yokeStand`.
  - `ability-arrival.ts`: the entry. `reward-data.ts`: `YOKE_REWARD`, `YOKE_VERB` (placeholders).
  - `dev/economy/place-level.ts`: `check('the rail yoke', open, PROPS.yoke.x, PROPS.yoke.z)` beside the forge rack's.
  - `dev/level/home-station-page.ts`: `yoke: pt(cm(LINE2_YOKE))`, and regenerate `docs/world/home-layout.html`.
  - `dev/loop/graph.ts`: the yoke's cue becomes on main ("the yoke on its block beside the forge rail rack",
    `forge-rewards.ts`).
  - **Check:** ship-check, then `npm run level-check` (the new reach line must pass; `grounding-props` if the block is
    a prop builder).
  - **Look:**
    - `--rail-seed q1-last`, from the rack's approach at follow height: Q1's board shows the yoke's outline beside its
      counts (one rail short), readable at 8 m.
    - The same seed with one `--action` deposit of the last rail: from Q1's frame facing the rack, the yoke on its
      block is in view and offered within 3 m, and the board is off.
    - Standing between rack and yoke: facing the rack offers "Take rails", and facing the yoke offers the yoke.
    - Take it: the opener's card, then the 16-square rails row.
  - *Risk: low to medium (a reach target in a busy yard). Self-review, plus the level check.*

- [x] **5. The forge's little guy makes it** (Local).
  - The pack and yoke share the fetch, carry, hammer and self-finish sequence. The yoke's offcut is 1 m, its hammer time 1.4 s, and its finishing burst eight sparks. The 14.005 s Q1 motion sheet showed the bare bar first, then both hooks, with the machine advancing behind it. The first camera hid most of the worker behind the block. His hammer position moved to the Q1 side. The reduced-motion still shows the complete yoke as Q1 starts laying.
  - `forge-rewards.ts`: generalise the pack errand into one `errand({ at, fetchAt, carried, hammer, done })` used by
    both, so there is no second copy. Wire the yoke's live edge, its fallbacks and `restore()`.
  - `src/place/folk.ts`: nothing new (`crewStart(x, z, 1, false)` exists).
  - **Look:** from `q1-last`, `--action` deposits the last rail, `--video --seconds 14` from Q1's frame
    facing the rack, watched at 1×. Expect:
    1. the board's outline;
    2. the bill in and the board off;
    3. the guy fetching the offcut from the rack's end, carrying it and hammering;
    4. the hooks going on with the clank and sparks;
    5. the machine laying Q1 behind, untouched.
    Then a reload still (done, no guy) and reduced motion (done at once). Then the pack's own errand once more
    (`forge-frame-last`, the 24th log), to show the shared errand didn't change it.
  - Update place.md's Q1 and forge-reward paragraphs.
  - *Risk: low to medium (the shared crew global). Self-review against the restore rules.*

- [x] **6. The bot takes it** (dev only).
  - The bot walks to the block after Q1 funding, uses the offered verb, dismisses the card and checks 16 rails. The second player checks their card and capacity. A two-player Q3 stop and `yokeTaker=friend` exercise the other pickup order. Node canonical runs took 1:21 / 0:51 for Q2 / Q3 solo and 0:45 / 1:07 with two players. All five alternate orders finished in the solo run. These are rule-run times.
  - `dev/look/bots/railway.ts`, after `checkpoint('Q1 funded')` (`:1886`): an `openYoke()` like `openPack()`:
    - walk to `read().reward.tools.yokeStand`;
    - `require(await bot.use(x, z, 'take the rail yoke', new RegExp('^' + escape(YOKE_VERB))))`;
    - `require(await bot.work(() => R.rail(R.rw()).yoke, 5000, 380))`;
    - dismiss the card;
    - `require(R.capacityOf(R.rw(), RAILS) === 16)`;
    - `checkpoint('yoke')`.
    The friend's branch (`:1719-1726`) gains `friendYoke()` after `friendPack()`: it waits for `rail.yoke`, then
    `shown('yoke') && !read().reward.showing`, and requires 16. `takeRails(n)` already waits for
    `min(n, capacityOf(RAILS))`, so Q2's and Q3's loops become one trip with no other change.
  - `dev/look/bots/coop-unlock.ts`: **no change**. Its finder runs `play()` only up to the jump or the forge's axe
    (`coopShot=axe`), both before Q1's bill, so it never walks past the yoke. Checked against its shots list (`:7-15`).
  - **Check:** ship-check. Then the bot segment `npm run checks-for` names for the Q1-to-Q3 legs, solo.
  - *Risk: low. Orchestrator read (dev only).*

**Checkpoint (after step 6).** Its proofs:

1. `npm run check:full`.
2. `npm run loop -- run --players 1` and `--players 2`: the yoke is taken after Q1 with no softlock. Compare with the
   table above.
3. The railway bot from Q1 funded to Q3 laid, solo, and with `--players 2`, varying who takes the yoke. Expect one card
   for the taker, the friend's card once free, both backs at 16, Q2's and Q3's rails one trip each. Note the bot's Q2
   and Q3 times against the run's: this is the real solo saving the brief asked for.
4. Two rejoin looks: once with the yoke waiting (the block, the glimmer, no errand, no card), and once after the take
   (the worn yoke, no card).

### Branch measurements

- The solo browser bot finished at Q3. On the bot clock Q1 was paid at 776.4 s, the yoke was taken and its card dismissed by 779.8 s, and Q1 was laid at 789.4 s. Q2 was laid at 902.0 s (1:53 after Q1). Q3 was laid at 1089.4 s (3:07 after Q2, including the hook and glider route, or 2:02 from gliding home). The replay is in `.look/yoke-solo/report.txt`.
- The solo browser recorded 12 rail deposits at each frame. Q2 received 4 then 8 during depot deliveries. Q3 received 4 around the log deliveries and the remaining 8 in one later delivery. The current depot supplies rails alongside logs, so the run did not reproduce two dedicated forge trips becoming one at each frame.
- The same solo bot route on base `d7903de53`, with capacity 8, also passed (`.look/playthrough/yoke-solo-before/report.txt`). Measured from the preceding laid checkpoint, Q2 took 115.5 s before and 112.6 s with the yoke (2.9 s faster). Q3 took 221.2 s before and 187.4 s with the yoke (33.8 s faster). Q2 laid to Q3 funded was **170.1 s in both runs**. All 33.8 s of the Q3 difference came after funding, while the machine laid track. These single warped-browser runs do not establish a Q3 hauling-time saving.
- At the same point between rack and block, turning selected “Take rails” or “[Take]”. The accepted card opened and the rails row displayed 16 squares. Both saved states restored with zero errands, a fully hooked yoke, no worker and no card. The two re-entry stills (`.look/yoke-reload-yard-still.png` and `.look/yoke-reload-taken-yard-still.png`) show the offered yoke and the worn yoke respectively.
- The revised maker sheet runs 14.010 s. The blue-capped worker is at the front of the block by 7.542 s, the hooks are upright by 8.618 s, and Q1's frame folds by 11.857 s. The pack control still shows its worker and the straps appearing on the frame. Motion at normal playback speed and the clank are unverified.
- In the real-time two-player browser run the second player took the yoke. Both peers passed the card and capacity checks at 716.5/716.7 s. The leader laid Q2 at 786.3 s (1:10 after Q1) and both peers reached Q3 at 967.0 s (3:01 after Q2 or 1:56 after gliding home). Their mirrored hashes matched at all 1,132 sampled server steps. Report: `.look/playthrough/e52144bd5/report.txt`.
- `npm run check` passed with 2,250 unit passes, one TODO and a successful production build. The change-scoped gate passed 1,332 tests in 152 files. The additional server stage of `check:full` had 406 passes, two skips and one Windows failure in the accounts crash test: the child process returned a null signal where the test expects SIGKILL. The standalone network suite passed 268/268.

`npm run perf` is not needed: one small model, one instanced count raised from 8 to 16, and no light.

## Level findings

- Scratch check (reverted) on `origin/main`: three candidate spots were added to `dev/economy/place-level.ts`'s
  far-head-line flood and all passed (`ok scratch yoke A (rack far side)`, B, C). `npm run level-check` on the
  unchanged tree gives 21 reports and exit 0 (track kinks on planned lines, none in the forge yard). The chosen spot A
  is (a −2.95, c 14.2).
- Clearances at A: 6.6 m from road 2 (the rack, at 3.6 m, already passes machine-clearance and the cart pins), 14.5 m
  from line 1, 5.6 m from Q1's frame, and 3.0 m from the rack's centre. The block is drawn only, with no collider, as
  the pack's stand is. Step 4 adds the reach line to the level check.
- Nothing becomes reachable early. The yoke gates no place and opens no route; the sim holds it behind Q1's bill.
  Every rail is still carried into its frame (route contract).

## Risks

- **Room safety.** There is no effect in `apply`. The card follows the accepted receipt, and the worn yoke and squares
  follow replicated state or the declared prediction. A queued `rail.yoke` is never taken as done. Reach is measured
  from one point on both sides, so the client never offers a prompt the server refuses. No new server import, so
  `server/Dockerfile`, `dev/server-build.ts` and the deploy paths are unchanged (`test/server-image.test.ts`).
- **Mixed builds:** above. One bump in step 1, the next free version, with its dated line and no compatibility code.
- **Fixtures:** step 1 moves six pinned fixtures and step 2 re-pins the seed golden. "Never re-pin replay fixtures
  without identifying the changed inputs": the keyed comparisons are the review's evidence.
- **Hotspots:**
  - `line2-view.ts` (1,556 lines) gains one marks argument.
  - `forge-rewards.ts` (397) gains the yoke half and loses its pack-only errand to the shared one.
  - `dev/look/bots/railway.ts` (2,229) gains one leg.
- **The shared crew global** (`folk.ts`): the yoke's errand can't overlap the pack's, since the pack comes at 24 logs
  and the yoke after the forge is lit and Q1's 16 logs are in. It can meet the roof show's crew; then `crewStart`
  returns 0 and the yoke finishes itself.
- **A 48-piece back** (16 logs, 16 stone, 16 rails) is new. Step 3's still decides the seating.
- **Copy:** placeholders only (above). No suspect Boogler lines were found; none mentions rails capacity.

## Open questions

1. **Does the yoke need the pack?** The owner's words put it "over the pack frame's shoulders", but the pack is
   optional and the seeds skip it until Q6. *Recommended:* no. Q1's bill alone makes it ready. With no pack, the yoke
   sits on bare shoulders and the rails hang the same way. A pack requirement would make one optional pickup gate
   another and move every seed's logs to 16.
2. **The words on screen.** The card's name `[Rail yoke]` and the prompt's verb `[Take]` are placeholders, and the
   card's line is empty, as the pack's is. *Recommended:* write them when you see step 4's still; until then the
   placeholders ship.
3. **In flight.** `npm run inflight` lists `claude/forge-rack-move` (27 h old, 17 files, `dev/look/bots/railway.ts`
   and `dev/level/rail-map.ts` among them). Its rack is already on main at `(91855, 1574)`, so it reads as shipped
   through its `ship/` branch and left behind. The running `claude/greybox-leg2-views` (local in another worktree,
   unpushed) edits `kit-board.ts`, `leg-yard.ts`, `row-path.ts`, `train-view.ts` and `route-greybox/leg-view.ts`, plus
   uncommitted level files. It touches none of this plan's files. *Recommended:* treat the first as merged (the
   orchestrator may delete it), and have steps 3 to 5 re-run `npm run inflight` before starting, rebasing if
   `line2-view.ts`, `tools.ts` or `forge-rewards.ts` shows up there.

## Design review (2026-11-19)

Run by the planner after rereading this plan from the top. Sources: DESIGN.md, the owner-calls index (no old builds,
seed goldens, save resets, mechanisms before details, Boogler copy, pick and log), the rewards and core-loop Current
rules, the 18 November entry and the brief and its review, the forge-made-rewards plan as built, the separate-capacities
plan's whole-route measure, place.md's pack, shared-abilities and finished-frames paragraphs, the loop graph and run
above, and the scratch level check. I took no stills: the plan places one drawn prop beside an existing rack, and
steps 3 to 5 take its stills.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Rails go 8 → 16 | Decided | [18 Nov](../decisions-rewards.md#d-2026-11-18-decisions-page-rewards) |
| 2 | The forge's little guy makes it beside the forge rail rack once Q1's bill is in | Decided | Same entry ("The forge's little guy, after Q1's bill") |
| 3 | Q1's board shows it before its bill | Decided | Same entry; [forge-made rewards](../decisions-rewards.md#d-2026-11-17-forge-made-rewards) |
| 4 | A pickup like the pack: an op, a `Rail` field, a world reset | Decided | Same entry ("A pickup") |
| 5 | Named the Rail yoke, an iron yoke over the shoulders | Decided | Same entry; the name on screen stays a placeholder (call 17) |
| 6 | The room's; late joiners have it | Decided | [6 Nov, shared progression](../decisions-rewards.md#d-2026-11-06-economy-principles-amended); DESIGN.md 6 |
| 7 | Every page online gets the card under the free rule | Decided | [17 Nov, cutscenes for everyone](../decisions-rewards.md#d-2026-11-17-cutscenes-for-everyone) |
| 8 | Canopy Town's carry sling stays a separate later grant | Decided | 18 Nov entry |
| 9 | Ready the moment Q1's bill is in (`QJob.start`), not when Q1 is laid | Default | "After Q1's bill"; the keener edge's funding precedent; the only free beat before Q2's rails |
| 10 | It needs Q1's bill only, not the pack | New | Recommend; open question 1 |
| 11 | It waits at axis (a −2.95, c 14.2), on the rack's outer side, 3.0 m from it; reach 3.4 m overlapping the rack's, with the facing pick choosing | Default | Key in sight of the lock; clear of road 2 by 6.6 m |
| 12 | No camera cut; the opener's card, friends' cards, a flourish for the away | Default | The pack precedent ("picked up like the pack"); a cut stays the axe's |
| 13 | The little guy fetches an iron offcut from the rack's end, hammers 1.4 s, `clank` and ~8 sparks; the pack's fallbacks (30 m, 1.5 s self-finish, 10 s a leg, 16 s cap) | Default | Forge-made rewards as built; iron sounds like the axe's arrival |
| 14 | While waiting it stands about 2× on a timber block with the pack's coral glimmer | Default | The pack's waiting language |
| 15 | Q1's board drops its mark at the bill (the frame folds when laid); the waiting yoke is the cue after | Default | Finding 4 |
| 16 | Rails hang in two banks from the yoke's arms, up to 8 a side; on bare shoulders without the pack | Default | The look on the back; the still settles it |
| 17 | Copy placeholders: `[Rail yoke]`, `[Take]`, empty line | Default | The owner's words; none The Boogler's |
| 18 | The rails' squares row grows to 16 with the existing grown-row hold | Default | Separate-capacities' squares rules |
| 19 | Seeds and the bot take it right after Q1's bill, as a player meets it | Default | The axe lesson (18 Nov: seeds that skipped a pickup broke a bot) |

**Counts: 8 Decided, 10 Default, 1 New.**

**Findings.**

1. **It is a solo relief, now measured on today's rack.** Line 2 loses 177 loaded metres solo (about 63 s) and 16 m
   for two (about 6 s); the Node run is 38 s faster solo and 7 s for two. It sits on an existing beat and adds no bill
   or chore (DESIGN.md 8; wary of grinds). *No change:* it confirms the brief.
2. **The pack is optional and the seeds skip it until Q6.** A rule needing the pack would gate one optional pickup on
   another. Most seeds from `q2` on would also show the yoke with no frame for it to sit over. *Changed:* call 10 and
   open question 1; step 3's looks include the yoke without the frame.
3. **The yoke's reach overlaps the rack's.** That is the point (key in sight of the lock), but a player who only wants
   rails must still get "Take rails". *Changed:* step 4's look checks both facings.
4. **Q1's frame folds when its stretch is laid.** So the forge's "board stays up until claimed" rule can't carry over
   to Q1. *Changed:* call 15. The board foreshadows before the bill (decided), and the glimmering yoke is the cue
   after.
5. **A refused act in the seeds is silent.** `act()` returns 0 on a refusal, so a seed that asks for the yoke at the
   wrong moment would carry on without it. *Changed:* step 2 wraps it in `need`, as the axe and the pack are.
6. **Flow.** Q1's frame → the rack is 5.6 m (1 s), and the yoke stands on that walk. The legs are unchanged except
   that Q2's and Q3's second forge trips disappear (Q3 is 2 × 110 m to 1 × 110 m solo). In co-op, two players at Q1's
   bill both see the guy at work. A friend chopping elsewhere gets the card when free. A late joiner finds the yoke
   on every back, or waiting at the rack with no errand. Nobody is stranded: the yoke is optional and gates nothing.
7. **Copy.** No Boogler line is touched, and none was found that mentions rails capacity.

**Owner questions:** the three under Open questions, each proceeding on its recommendation.

**Rows for [docs/agent-calls.md](../agent-calls.md)** (rewards topic, status `open`): calls 9 to 19, one row each,
citing this section.
