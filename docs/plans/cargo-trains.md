> **27 November 2026. Planner; docs only, nothing built.** Read against main `7883c7b98` (world v75). The backlog row
> "Cargo trains of their own, after the greybox route" (P3; owner, 12 November: "A now, C later"), from the
> [brief](../brainstorms/cargo-trains.md), whose five open questions the owner answered with their recommendations on
> 26 November ([decision desk, item 11](../decisions-process.md#d-2026-11-26-decision-desk-answers)). It also builds
> [halt-yard](halt-yard.md)'s build 2 (cargo cars carry a yard's goods). Two builds: **build 1** (steps 1 to 5, one
> `WORLD_NS` bump) and **build 2**, the Quarry siding (steps 6 and 7, a second bump). **The lap's steps 1 and 2 ship
> before step 2 here** ([order](#order-and-what-waits)). Design review [near the end](#design-review-2026-11-27); one
> owner question, which does not wait.

# Cargo trains: line 2's own freight train

**Goal.** Once steel is home, the room can commission line 2's own cargo train at the Roundhouse for steel from the
pool. From the tick it rolls out, the trains you ride stop doing freight on line 2. A squat work train with open cars
takes over. It stops at the Quarry for a whole trainload of stone. It picks up the logs and rails players left in the
Quarry and Far Head halt yards, carries them out to line 2's open leg, and puts them on that leg's rack. It patrols end to
end when there is nothing to fetch. Levers and riders ignore it, and you can still jump onto its crates. Build 2 adds a
short siding at the Quarry, so a passenger train runs past it while it loads stone. This serves DESIGN.md's **core
loop** ("the rail builds the world": the player stops carrying what a train can carry, in the owner's words "player
shouldnt have to be carrying that"), **6. Communal world** (one friend's spares ride out to another friend's build),
**7. Telegraph everything** (you see the train, its open cars and what is on them) and **11. Show, don't tell** (the
loaded deck is the count). It bends nothing. One decided wording needs a reading:
[owner question 1](#open-questions) ("steady, slow patrol").

**Read for this.** AGENTS.md; `npm run map -- --kind feature-fix` (the CLI has no `plan` kind; its design and
code rows apply); the planner agent; DESIGN.md; owner-calls; decisions.md's routing table; the rewards, rail and
core-loop Current rules, in full: 12 November (cargo trains, the town economy), 10 November (yards at halts, "on
rails"), 15 November (garage choices, trade), 23 November (service health) and 26 November (desk answers); the brief and
its design review; [station-deposit](../brainstorms/station-deposit.md) (build 2's four conditions, finding 7);
halt-yard (rule, positions, Level findings); [shared-pool](shared-pool.md) sections 0, 3, 5;
[garage-choices](garage-choices.md) sections 0 and 6; [port-quay-roundhouse](port-quay-roundhouse.md) (steps 1 to 5 on
main, the second table); [greybox-lap](greybox-lap.md) (the line model, step 2, risks); `src/sim/AGENTS.md`.
Code: `src/sim/railway-lines.ts` (`RAIL_TRAINS`, `RailHalt`, `trainPlaces`, the fleet validator),
`railway-train.ts` (`TRAIN`, `TRAIN_PHASE`, `BOILER`, `fleetOf`), `railway-trains.ts` (`LINE_SLOTS`,
`servingSlots`, `blockFree`, `trainServes`, `trainGaps`, `balancedHold`, `fleetJoin`, `trainStepLine`,
`lineSpacing`), `railway-sys-trains.ts` (`call`, `serviceOf`, `trainIO`), `railway-queries-trade.ts`
(`freightStop`), `railway-sys-trade.ts` (`freightLoads`, `freightArrives`, `ridersBoard`, `ridersArrive`),
`railway-trade-layout.ts` (`TRADE`), `railway-sys-route-kit.ts` (`legKitLoad`, `legKitArrive`, `legKitHome`,
`kitHome`), `railway-queries-route.ts` (`legMintChain`, `legKitDrop`, `legKitRoom`, `legKitCap`, `legKitTrains`,
`legKitCarriers`), `railway-yard-layout.ts`, `railway-queries-yard.ts`, `railway-components.ts` (`Train`, `Line`,
`Shed`, `HaltYard`), `railway-works-layout.ts` (`INSTALL_STEEL`, `installAdmits`), `railway-sys-steel.ts`
(`install`, `boilerAdopt`), `railway-queries-works.ts` (`tableFree`, `tableBusy`), `railway-queries-line2.ts` (the
witnesses), `src/world/railway-server.ts` (`rail.install`'s admission), `src/entities/railway/garage-data.ts`,
`freight-view.ts`, `src/place/layout.ts` (`LINES.east`, `OFFSET_HALTS`, `FORMATION`), `src/place/tech-layout.ts`
(`GATES`, `LEVER`, `PADS`).

**Research.** [rail-network-depth](../research/rail-network-depth.md) ("the railway runs itself"; no orders, filters or
quotas): followed. Nobody routes the cargo train. The draw rule picks its loads. The room's one choice is whether to
commission it. [roundhouse-management](../research/roundhouse-management.md) (one small configuration choice per line):
followed. [train-riding](../research/train-riding.md) ("a ride is a stage"): build 2's passing beat is a lineside moment
on line 2's busiest stretch. [route-contract](../research/route-contract.md): the train supplies no work a gate keeps
([Level findings](#level-findings)).

**The rail route as it stands** (`npm run loop`, `npm run loop -- node <id>`). `steelhome` and `install` have no bill.
After the steel, line 2's train-fed bills are `stack-1` to `stack-4` (20 logs + 20 rails each, "line 2's kit car from the
Village to the railhead rack") and the incline's kit, which rides ahead to High Gorge's yard (`incline-1`, `incline-2`).
Later legs are other lines' bills. So line 2's halt-yard draws matter from steel home through the incline's kit, and
after that the cargo train hauls stone only ([finding 5](#findings)). The Quarry stone yard's `after: 'pier'` and
the `footingsOwed` pause both clear before the rivet, so neither can bite once steel is home ([finding 4](#findings)).

**In flight** (`npm run inflight`, 27 November): nothing unmerged on `wip/`, `ship/` or `claude/`. Planned and unbuilt,
sharing files: [greybox-lap](greybox-lap.md) steps 1 and 2 (`railway-trains.ts`, `railway-sys-trains.ts`,
`railway-lines.ts`, `railway-queries-trade.ts`, `railway-sys-route-kit.ts`, the bump), and
[port-quay-roundhouse](port-quay-roundhouse.md) step 6 (`garage-view.ts`, `garage-data.ts` reads, views only).

## What it is, measured

From a scratch probe over `src/place` (`LINES.east`, `H`, `railY`, `GATES`, `LEVER`, `PADS`, the freight view's
anchors and `HALT_YARDS`), deleted afterwards. Place-local metres. `s` is along line 2. `lat` is positive on the
outward platform's side; line 2's path is the outward track (lat 0), the homeward track is at lat −4.

**The Quarry's two loads stand on opposite sides of the line.** The brief put "one Quarry freight siding on the down
side beside the Quarry yard and `HaltYard` slot 2". On main:

| Thing | s | lat | Side |
| --- | --- | --- | --- |
| The stone yard's crate pile (`freight-view.ts` `CENTRES[1]`) | 170.3 | −9.4 | Homeward, behind the up platform |
| The up platform (`OFFSET_HALTS`, homeward trains) | 154 to 174.5 | −6.95 | Homeward |
| The outward platform (sim halt 1's first platform) | about 164 to 186 | +3.5 | Outward |
| The Quarry halt yard's bay (`HALT_YARDS[2]`) | 170.6 | +13.5 | Outward, behind the outward platform's back ramp |
| Q4's frame | 175 to 178 | −6.5 to −8.5 | Homeward |
| The quarry gate (both tracks, `GATES.quarry`) | 186 | −2 centre | Across |
| The gate lever, the apron pad | about 190, about 192 | +6 to +10 | Outward |
| Far Head's bay (`HALT_YARDS[3]`) | 519.9 | +10.9 | Outward, behind the outward platform |

The line turns 22° between s 170 and 180 (`FORMATION.quarry.bend` 156 to 200). One siding can't be beside both loads.
The plan follows the sides as built. The **stone** loads going home, from the homeward platform track, as passenger
trains load it today (build 1), and later from a homeward siding (build 2). **Spares** load going out, from the
outward platform track, beside each bay. Both bays are on the outward side, and line 2's open bills lie outward too.

**The bay to the outward track:** Quarry 13.4 m (nearest at s 171.5), Far Head 10.9 m (s 520). The view flies the
pieces across the outward platform onto the deck (call 19).

**Where a Quarry siding fits (build 2).** The homeward side, s 200 to 270, centred 4 m outside the homeward track
(lat −8), with smoothstep turnouts over 20 m at each end (the formation's own turnout shape) and a straight standing
stretch from s 220 to 250. Under its centreline the ground is level with the rail (24.21 to 24.25 m against rail 24.30
m). The line runs straight-ish there (headings −34° to −37°). Nearest things: the gate's south pillar 14.2 m, Q5's frame
16.3 m, the lever 18.6 m, Q4's frame 19.7 m, the apron 20.2 m, the up platform's end 20.9 m, today's crate pile 25.4 m,
the Quarry bay 36.1 m. Rejected: s 60 to 150 on either side, because s 80 to 110 is the trestle's gap (ground up to 25 m
below the rail). The outward side from s 176 on, because it runs 6.0 m from the lever and 8.4 m from the apron, a
teaching beat's ground. Far Head: −s of the halt is sea from s 420 to 480, so no siding there (parked).

**The pile beside the siding (build 2):** s 235, lat −12.5, world (1123.0, −3.3); the ground under a 4 × 2.4 m footprint
is 24.41 to 24.91 m (0.1 to 0.6 m above the rail). The crates stand on a timber plinth levelled to 24.9 m (step 7).

**Clear behind.** A cargo train makes a middle-halt stop only when no train behind it would have to brake for it. The
test is the circuit gap from the nearest serving train behind it to the stop, which must be at least
`G = TRAIN.sepCm + v²/(2·b) + v·(TRAIN.dwellTicks + ⌈v/(2a)⌉ + ⌈v/(2b)⌉)`, where `v` is the fastest boiler's cruise
(`BOILER` row 3, 300 cm a tick) and `a` and `b` are 3.5 cm a tick². That is 2,740 + 12,857 + 300 × (50 + 43 + 43) =
**56,397 cm, about 564 m**. Line 2's circuit is about 6.4 km. With six passenger trains and the cargo train, the
average spacing is about 917 m, so most passes qualify, and a bunched pass waits for the next one. Integer math, whole
cm. The step 2 fuzz reports the share of offered stops taken.

## Design

### What a player sees and does

- **Steel lands; the garage grows a tile.** Under line 2's **Cargo** category, a new part, `[placeholder: Cargo
  train]`, shows "STEEL n/2" until the pool holds two. Holding Install at either table (Home's or Port Quay's) spends
  two steel. At Home the table's hold plays as for any install. The cargo train then rolls out of Home's Roundhouse
  onto line 2 at the Village, after the wagon's roll-out time (`WORKS.upgradeTicks + WORKS.rollTicks`, 19 s) and once the
  join gap is clear.
- **It runs end to end like any train,** at the line's fit, carrying no riders, with no seats. Levers never call it
  and riders never board it. Its open cars are solid, so you can jump onto the stack and ride it to the next end
  (decided). With nothing to fetch, it makes no middle stop.
- **Going home past the Quarry,** when the stone yard holds a whole trainload (8) and its car has room, it stops at the
  homeward platform track and takes the crates, if the gap behind it is clear. It drops them at the Village as freight
  is dropped today. The passenger trains on line 2 stop making the stone stop, and stop loading stone, from the tick the
  cargo train leaves the shed.
- **Going out past the Quarry or Far Head,** when that bay holds logs or rails that line 2's open leg still owes, it
  stops beside the bay (clear behind), and the pieces fly from the bins onto its deck. They ride out visibly to the leg's
  rack, the stack railhead's or the Gorge yard's, and unload onto the rack. Players feed the frame from there by hand,
  as with any train-fed kit (decided, answer 5). What it carries means the Village mints that much less kit, so a deposit
  shortens the wait for the next kit train.
- **Build 2:** a short siding appears at the Quarry with the cargo train's roll-out, and the crate pile moves beside it.
  The cargo train loads stone in the siding while passenger trains pass on the main line.

### State and sync

Everything is **Server** state in the existing railway world: rows the server owns, saves and replicates. Rule ticks are
the room's. The views are **Local** over accepted rows. Standing on a cargo deck stays **Owner** physics through
`solidTrainLoad`. There is no client lead, no classic edit generator and no client state registration.

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| The cargo slot (catalog: `RAIL_TRAINS` row with `role: 'cargo'`, `CARGO_SLOTS`) | Server (catalog, pure) | server | `railway-lines.ts` |
| Its row (`Train`: pose, `freight`, `logs`, `rails`, `legKit`, `boiler`) | Server (replicated, saved) | server | existing fields; no new `Train` field |
| `Line.cargo`: the tick its cargo train was commissioned (−1 never) | Server (replicated, saved) | server | `railway-components.ts`, new int field |
| The install (`rail.install`, part 7) | Server command, confirmed, not predicted (as every install) | server | `railway-sys-steel.ts`, `railway-server.ts` |
| Roll-out, stops, loads, draws, unloads | Server, in the trains' rule tick | server | `railway-sys-trains.ts`, `railway-cargo.ts` |
| `HALT_YARDS[k].halt` (the line stop beside a bay) | Server (catalog, pure) | server | `railway-yard-layout.ts` |
| Build 2: `RailHalt.siding` (catalog), "in the siding" derived from the row | Server (catalog, pure) | server | `railway-lines.ts`, `railway-cargo.ts` |
| The consist, the garage tile, roll-out show, flights, siding track, moved pile, map dot, horn | Local | each tab | `src/entities/railway/*` |

**Pure logic** (new `src/sim/railway-cargo.ts`, a review path):

- `CARGO = { steel: 2, lines: [LINE2] }` and `CARGO_PART = 7`.
- `isCargo(slot)`: `RAIL_TRAINS[slot].role === 'cargo'`. `passengerSlots(line)`: a line's slots without cargo slots.
  After the lap it filters `io.slots(line)`.
- `cargoRunning(rows, line)`: the line's cargo slot is out of `TRAIN_PHASE.SHED`.
- `clearBehindCm()` (the `G` above, computed once from `BOILER` and `TRAIN`), and
  `clearBehind(rows, line, stops, slot, k, dir, tick)`. It is true when every other serving slot behind train `slot`
  on its circuit is at least `G` short of halt `k`'s platform point that way. It runs over `servingSlots`; a build 2
  row in the siding is skipped.
- `drawAmount(owed, stock, room)`: per kind, the least of the three, never negative.
- `cargoStoneStop(w, slot, r, k, dir)`, `cargoDrawStop(w, slot, r, k, dir)`, `cargoDraw(w, slot)` (world reads, below).
- Build 2: `inSiding(row, line, tick)`, `sidingRejoinFree(rows, line, stops, slot, tick)`.

**The cargo train's rules, against today's code:**

| Rule | Passenger slots | The cargo slot |
| --- | --- | --- |
| `fleetJoin` | `passengerSlots` (it must never pick the cargo slot out of the shed) | `cargoJoin(io, line, tick)`: when `io.line(line).cargo >= 0`, `tick >= cargo + WORKS.upgradeTicks + WORKS.rollTicks`, and `fleetJoin`'s gap test passes at stop 0; same row reset |
| Block rule (`blockFree`), spacing (`lineSpacing`, `trainSpacing`), `protectedBlocks`, `endBlocks` | every serving slot, cargo included | the same |
| `trainServes` (lever asks), `call`'s platform `wait` loop | `passengerSlots` | never; `call` with `e.train` on a cargo slot is refused (0) |
| Headway hold, `headTicks`'s `n`, `balancedHold`'s gaps (`trainGaps`), `Line.left0/left1`, service health | `passengerSlots` only | `headExempt`; its departures do not stamp `left0`/`left1` |
| `serviceOf` | as today, but `freightStop` is false on a line whose cargo train runs | `cargoStoneStop \|\| cargoDrawStop \|\| legKitService(...)`; any middle-halt reason also needs `clearBehind`; ends need none |
| `freightLoads` | not on a line whose cargo train runs | as today (homeward, at the yard's stop) |
| `freightArrives` (at the Village) | as today | as today |
| `ridersBoard`, `ridersArrive`, `ridersAboard` | as today | never |
| Wagon coupling, `footCarrier`, Q kit, `steelLoads`, `legKitLoad` (minting), `legKitTrains`/`legKitCarriers` | as today | never (it mints no kit and carries no steel, footing or wagon) |
| `legKitArrive` (unload at a drop) | as today | as today: its draws are `legKit` units |
| `legKitHome` at the Village | as today (unmade, rails to the forge rack) | the surplus goes to the Village yard instead: logs to `Rail.rack`, rails to `HaltYard` row 0 (call 18) |
| `boilerAdopt` at the Village | as today | as today (the line's fit; call 13) |

**`cargoStoneStop(w, slot, r, k, dir)`.** The line's `TRADE.yards` row exists, `k === yard.stop`, `dir < 0`, the
yard's `after` is met, `stock >= TRADE.loadStop`, the room aboard is at least `TRADE.loadStop`, and `clearBehind`
holds. Ruling D's errand clauses and the `footingsOwed` pause don't apply, since a cargo train runs no build errand.

**Halt-yard build 2 (`cargoDrawStop`, `cargoDraw`).** Each `HALT_YARDS` row gains `halt?: { line: number; stop:
number }`: Quarry `{ LINE2, 1 }`, Far Head `{ LINE2, 2 }`. The Village and Camp rows get none in this plan (call 16). For
the cargo train going out (`dir > 0`) at stop `k` with bay `y` beside it (open, `haltYardOpen`):

1. The leg is the first of `legMintChain(w, LINE2)`'s legs that is loading **and `legOpen`** (condition iii: never a
   gated bill; the incline's kit ahead counts only once its leg is open), and whose `legKitDrop(w, LINE2, leg) !== k`
   (condition iv: never empty a yard at the bill's own halt).
2. `owed` is that leg's `ch.owed[i]` (already less every line 2 train's kit aboard, the cargo train's included).
   `room` is `legKitCap(w, leg, 1)` less what the cargo train carries.
3. `n = drawAmount(owed, haltYardStock(w, y, kind), room)` for logs and rails. Stone is never drawn: no line 2 bill
   after the steel takes stone (call 16).
4. The stop is a reason when `n > 0` and `clearBehind` holds. Standing there, `cargoDraw` moves `n` from the
   `HaltYard` row to `Train.logs`/`rails` and sets `legKit`, inside the tick's apply.

Condition i (yard stock before the source's own) holds because drawn units count as aboard kit in
`legMintChain`, so the Village mints that much less. Condition ii (the goods ride and are unloaded, never credited at a
distance) holds because they unload only at the drop through `legKitArrive`, onto the rack (`legKitRoom`'s rack share
first), never into the frame (answer 5).

**Commands.** `rail.install` with `{ site, line: LINE2, part: 7, revision: 0 }`. `installAdmits` admits part 7 on
`ROW_LINE.ring` only. `install` (part 7) refuses (0) when: the table is not open or busy; the site's copy is not line
2; `Shed.steel < 1`; `upgradePool < CARGO.steel`; `Line.cargo >= 0`; or `revision !== 0`. When accepted:
`Line.cargo = tick`, `spendUpgrade(w, CARGO.steel)`. It doesn't change `Line.rev`, `boiler` or `fitted`, so line 2's
"rev equals its boiler row" stays true. `tableFree` adds `Line.cargo + WORKS.upgradeTicks` to its hold, so the
roll-out holds the table. The server's admission (`railway-server.ts`, `rail.install`) goes through `installAdmits`
unchanged. Validation and actor facts come from the existing coordinator. Receipts are as for any install: accepted
1, refused 0, and the garage's existing refusal text. Nothing is predicted.

**Checkpoint state.** No new key. `Line.cargo` and the extra `Train` row are ordinary rows of the checkpointed world.
New save rules (`railway-check.ts`): the cargo row is `SHED` while `Line.cargo < 0`; `Line.cargo` is −1 or no later than
the tick; a cargo row has `riders === 0`, `wagon === false`, `foot === 0`, `steel === 0`, and `logs`/`rails` only with
`legKit`. The witnesses (`railCounts`, `line2Logs`, `line2Rails`, the stone count) need no new term: the cargo train's
goods are `Train.freight`, `logs` and `rails`, which `aboard` already counts, and bays and the rack are already counted.

**Lockstep.** Integers only (whole cm and ticks, ⌈⌉ by integer division). No float, trig, random or wall time. Fixed
order: `cargoJoin` runs right after `fleetJoin` in `trainStepLine`, and `cargoDraw` in `standing` right after
`freightLoads`. `railway-cargo.ts` is in `src/sim/**`, so `LOCKSTEP_FILES` and the server image's `src/sim` cover it
(`test/server-image.test.ts` confirms).

**Wire, saves and bumps.** Build 1 adds a `Train` row (catalog), a `Line` field (schema) and install part 7 (op
meaning): **`WORLD_NS` bumps once, in step 2**, which steps 2 and 3 share, with a dated history line. Build 2 adds a
catalog field and changes where a train stands: **a second bump in step 6**. Dev phase: no compatibility code; rooms
start fresh (`docs/agents/mixed-builds.md`).

### Controls and copy

No new action, pad slot, key or guide row: the install is the garage's existing hold. Copy, all placeholders and marked
as such, none The Boogler's:

| Where | Text (placeholder) |
| --- | --- |
| Garage tile name | `[placeholder: Cargo train]` |
| Tile description | `[placeholder: Its own engine and two open cars. Hauls the Quarry's stone and the halt yards' spares out to line 2's open bills.]` |
| Pill | "STEEL n/2", "Ready", "Rolling out", "Running" (the garage's existing pill words where one fits) |
| Install refusal (already commissioned) | the garage's existing "Installed" standing; no new string |

## Steps

Each step leaves `node dev/ship-check.ts` green. The full check, the bots and `test:net` belong to the checkpoints.
Every step that touches `src/sim`, `src/world` or the wire gets an **independent review** before merge, on the
independent-review row of `npm run models` (today a fresh gpt-6.2-astra delegate). The builder rows below are as of 27
November.

- [ ] **1. The cargo rules, pure and unwired (S; review; "Implementation from a brief or an approved plan": Codex
      gpt-6.2-sol medium).** May build now, beside the lap. New `src/sim/railway-cargo.ts` with `CARGO`, `CARGO_PART`,
      `clearBehindCm`, `clearBehind`, `drawAmount`, and `passengerSlots`/`isCargo` over an explicit role table argument,
      so no catalog row is needed yet. New `test/railway-cargo.test.ts` on fixture lines (`RailLineDef` fixtures, as
      `test/railway-trains.test.ts` builds them): `clearBehindCm() === 56397`; `clearBehind` false when a follower is
      `G − 1` behind and true at `G`, both ways round a circuit, a shed row ignored; `drawAmount` per kind including 0
      and negatives clamped. No catalog, wire or bump. Look: none.
- [ ] **2. The cargo train in the rules, its install and the hand-over, with the bump (L; review; "High-risk
      implementation": Codex gpt-6.2-astra high).** After the lap's step 2 is on main ([order](#order-and-what-waits)).
      Files:
      - `src/sim/railway-lines.ts`: `RAIL_TRAINS` rows gain `role?: 'cargo'`, and one line 2 cargo row is appended last
        (`home: 0, track: 0, shed: true, role: 'cargo'`). `CARGO_SLOTS`. The fleet validator and `lineRows` ignore
        cargo rows.
      - `railway-trains.ts`: `TrainIO.line` rows gain `cargo`. `fleetJoin` over passenger slots. `cargoJoin`.
        `trainServes`, `trainGaps` for `balancedHold`, and `headTicks`'s `n` over passenger slots. Cargo
        departures skip `left0`/`left1`. The block rule and spacing stay over every serving slot.
      - `railway-train.ts`, if `fleetOf` or `trainPlaces` needs the role.
      - `railway-components.ts`: `Line.cargo: 'int'`, default −1.
      - `railway-works-layout.ts`: `INSTALL_STEEL[7] = CARGO.steel`; `installPart` and `installAdmits` (part 7 on line 2
        only).
      - `railway-sys-steel.ts`: `install`'s part 7 branch, as in [Commands](#state-and-sync).
      - `railway-queries-works.ts`: `tableFree` counts `Line.cargo`.
      - `railway-sys-trains.ts`: `serviceOf`'s cargo branch; `trainIO.standing`/`arrive` skip the wagon, kit, steel
        and riders for a cargo slot; `headExempt`; `call` refuses `e.train` on a cargo slot and skips it in `wait`.
      - `railway-queries-trade.ts`: `freightStop` is false once the line's cargo train runs; `cargoStoneStop`.
      - `railway-sys-trade.ts`: `freightLoads` on such a line only for the cargo slot; `ridersBoard`, `ridersArrive`
        and `ridersAboard` skip cargo.
      - `railway-queries-route.ts`: `legKitTrains` and `legKitCarriers` over passenger slots.
      - `railway-check.ts`: the save rules above.
      - `src/world/namespace.ts`: the bump, dated. Fixtures and golden shards are regenerated in the same commit.

      Every read of a slot list gets a one-line comment, `// every train` or `// passengers`, as the lap's step 2 does
      for running and origin lines. Verify with new cases in `test/railway-cargo.test.ts` on the catalog:
      - (a) the install is refused before steel, at 1 steel in the pool, twice, at a busy table, on a trade line's copy
        and with revision 1; it is accepted at either site with 2 in the pool and spends 2;
      - (b) the cargo train joins at the Village at `cargo + 190` ticks or later, never inside the end block or `sepCm`
        of a train, and `fleetJoin` never picks its slot;
      - (c) a lever ask at every line 2 halt is never served by it, and riders never board it;
      - (d) passenger trains make no stone stop and load no crate once it runs, while it takes a whole trainload homeward
        at the Quarry only with `clearBehind` true; delivered stone equals made stone over a seeded run;
      - (e) no follower ever brakes for a middle-halt cargo stop: across the fuzz, every serving train's planned leg
        before and after a cargo stop's commit is unchanged (the step's key test);
      - (f) passenger headway holds and `balancedHold` are unchanged by its position (a seeded run with and without the
        cargo train gives the same passenger departures from the Village within the step's measured spread, reported
        here);
      - (g) save and restore across the roll-out tick;
      - (h) the witnesses hold every tick.

      The service fuzz (`test/helpers/railway-route-rules.ts`) gains a cargo group in its own shard: the stack stage with
      the cargo train running, lever asks at 75% headway, seeds `c0ffee`, `777`, `5eed` and `badd` at 20,000 ticks. The
      long run, the share of offered cargo stops taken, and the passenger end waits with and without the cargo train are
      pasted into this plan before the bump ships. `npm run loop -- run` (rule changes). Because the catalog and sim
      change: the whole server suite, `npm run test:net` and the built-site boot probe. Look: none (views in step 5);
      the builder says so in its report.
- [ ] **3. Halt-yard build 2: the cargo train draws spares toward line 2's open leg (M; review; "High-risk
      implementation": Codex gpt-6.2-astra medium).** Ships with step 2's bump (one branch, or step 3 rebased on step 2
      before either merges). Files: `src/sim/railway-yard-layout.ts` (`halt` on the Quarry and Far Head rows; the
      load-time check: each `halt` names a line 2 stop whose platform lies within 15 m of the bay), `railway-cargo.ts`
      (`cargoDrawStop`, `cargoDraw`), `railway-sys-trains.ts` (`standing`: `cargoDraw` after `freightLoads`; `serviceOf`'s
      cargo branch), `railway-sys-route-kit.ts` (`legKitHome`'s cargo branch to the Village yard), `railway-check.ts`.
      Verify with new cases:
      - (a) 8 logs and 8 rails in the Quarry bay with `stack-2` open draw `min(owed, 8, room)` going out, never going
        home, and land on the stack rack at the railhead;
      - (b) nothing is drawn for a leg that is not open (the incline before its barrier), nor at the drop's own halt;
      - (c) the Village mints less by exactly what was drawn: `Leg.loadedLogs` grows by the mint only, and the next kit
        train's load is smaller by the draw;
      - (d) a hand-fed frame is never filled by a draw; the rack is;
      - (e) a cargo train's surplus at the Village goes to `Rail.rack` and `HaltYard[0].rails`, and `depotProduced` is
        unchanged;
      - (f) a player's predicted `rail.haltTake` racing a draw is corrected by replication (`sameTarget`), with no
        double take;
      - (g) the witnesses every tick, including through a save and restore with drawn kit aboard.

      Look: none here.
- [ ] **4. Seeds, the jump and the loop (S; "High-risk implementation": Codex gpt-6.2-astra medium, because it
      touches the seed stages).** Files:
      - `src/sim/railway-seed-steel.ts` or `railway-seed-legs.ts`: new stage `cargo-run` (steel home, the install
        taken, the cargo train out and the stack leg open with its first section laid), plus `cargo-draw` (`cargo-run`
        with 8 logs and 8 rails in the Quarry bay and the cargo train approaching the Quarry outward);
      - `SEED_STAGES` and its golden shard;
      - `src/world/railway-jump.ts`: a "Cargo train" row on the Quarry's outward platform;
      - `dev/loop/graph.ts`: an optional node `cargo*` after `steelhome` ("Commission line 2's cargo train", no bill,
        cue "the Cargo tile in the garage"), with no rule depending on it;
      - `dev/look/bots/railway-legs.ts`: none (the bot doesn't commission it, call 24).

      Verify: `test/railway-jump.test.ts`, each stage's invariant check, the whole server suite, `npm run loop -- node
      cargo` and `npm run loop -- run`.
- [ ] **5. The cargo train's look and sound (M to L; "Player-visible implementation": Codex gpt-6.2-astra medium, high
      for the consist).** Files:
      - `src/entities/railway/cars.ts`, `line-cargo.ts` and `train-view.ts`: the cargo slot's consist. A squat work
        engine with an amber lamp and no coach, then two open slatted flats inside `TRAIN_EXTENT` (24.3 m). Crates and
        strapped bundles from `Train.freight`/`logs`/`rails` stand solid through `solidTrainLoad`. No seats.
      - `garage-data.ts` and `garage-view.ts`: the Cargo tile, with its standings "STEEL n/2", "Ready", "Rolling out"
        and "Running".
      - `roundhouse-view.ts` / `boiler-install-view.ts`: the roll-out from Home's Roundhouse onto line 2 at the Village.
      - `freight-view.ts`: crates fly to the cargo train's deck.
      - `halt-yard-flights.ts`: bin-to-deck flights at the Quarry and Far Head (13.4 m and 10.9 m arcs over the outward
        platform), playing once from the accepted row change.
      - `halts-view.ts`: the levers are unchanged (their lamp reads `Line.req`).
      - The halt boards' and Home's line maps: a distinct dot for the cargo train.
      - The audio module that plays the engines' chuff: a deeper two-tone horn as it leaves an end.
      - `docs/game-design/` (the rail chapter: cargo trains; `place.md`: build 2 of the halt yards).

      Verify: the full ship check; `npm run perf` at the Quarry on desktop and the phone profile, reported (a guide, not
      a gate); `.look/` stills from `cargo-run` and `cargo-draw`:
      - the garage tile at 1 and at 2 steel;
      - the roll-out at the Village;
      - from the Quarry outward platform as the cargo train stands beside the bay and the pieces fly;
      - the loaded deck passing the Far Head bay;
      - the stack railhead as it unloads onto the rack;
      - a player standing on its crates;
      - a lever pulled at the Quarry with the cargo train approaching: it passes and the lamp stays lit;
      - a `--video` of it leaving the Village beside a passenger train (the two silhouettes must read apart at 60 m).
- [ ] **Checkpoint A (build 1 playable).** After steps 1 to 5 are on main; named proofs, once:
  - [ ] `npm run loop -- run` for one to three players: the route's minutes beside main's before the bump (route minutes
        per area, #2592), with no area slower by more than its run-to-run spread.
  - [ ] The bot segments `--from steel-home --to stack` and the stack leg's long segment pass with a cargo train seeded
        running (`cargo-run`).
  - [ ] `npm run test:net` with `railwayLegRejoin` at `stack` while the cargo train carries drawn kit: rows exact at every
        checkpoint.
  - [ ] The cargo fuzz's long run (pasted in step 2) and the stack stage's existing fuzz beside it.
  - [ ] Step 5's stills and clip on one sheet; the perf rows.
  - [ ] The boot probe. A device line on the Mac, reported, not a gate.
- [ ] **6. The Quarry siding in the rules, with the second bump (L; review; "High-risk implementation": Codex
      gpt-6.2-astra high).** Files:
      - `src/sim/railway-lines.ts`: `RailHalt.siding?: { inCm: number; outCm: number; standCm: number }` on the Quarry
        halt: `inCm` 27000 (homeward trains leave the main line there), `outCm` 20000 (they rejoin), `standCm` 23800
        (the train's extent, s 221.9 to 246.2 m, inside the straight from 220 to 250); a load-time check that the extent
        at `standCm` lies between `outCm + 2000` and `inCm − 2000`.
      - `railway-cargo.ts`: `inSiding(row, line, tick)` is a cargo row on track 1 that is standing at `standCm`, or
        running with `dest === standCm` and its leading extent past `inCm`. It is derived, with no new field.
        `sidingRejoinFree` holds when no other serving train on track 1 is behind `outCm` within `G` of it, or behind it
        with its planned `dest` past `outCm − TRAIN.sepCm`.
      - `railway-trains.ts`: `blockFree`'s gap loop, `trainGaps`, `lineSpacing` and `trainSpacing` skip rows
        `inSiding`. A cargo train whose `dest` is `standCm` departs only when `sidingRejoinFree` and `blockFree` both hold.
      - `railway-queries-trade.ts`: `cargoStoneStop`'s destination becomes `standCm`, and it no longer needs
        `clearBehind`.
      - `railway-check.ts`: the siding rows' save rules.
      - `src/world/namespace.ts`: the bump, dated. Fixtures and goldens.

      Verify with new cases:
      - (a) a passenger train homeward behind the cargo train passes it while it stands in the siding, and its arrival at
        the Village is tick-for-tick the same as with no cargo train (the passing beat's proof);
      - (b) the cargo train rejoins behind it, never inside `sepCm` of any train, and waits at most the step's measured
        worst (reported here) under the fuzz;
      - (c) the circuit order changes once per pass and every spacing invariant holds;
      - (d) save and restore with the cargo train in the siding, standing and running in;
      - (e) the witnesses.

      The service fuzz's cargo shard re-run, long run pasted here. `npm run loop -- run`, the whole server suite,
      `npm run test:net` and the boot probe.
- [ ] **7. The siding's track, the pile's move and the passing beat (M; "Player-visible implementation": Codex
      gpt-6.2-astra medium).** Files:
      - `src/entities/railway/line2-path.ts` (`line2Lat` follows the siding for a row `inSiding`: −4 m to −8 m and back,
        with the formation's smoothstep over 20 m);
      - `line2-view.ts` or `leg-view.ts`: the siding's rails, sleepers and two turnouts, s 200 to 270, dropping in with
        the halt kit's drop-set at the cargo train's roll-out; before that, nothing is drawn;
      - `freight-view.ts`: `CENTRES[1]` becomes the siding's anchor (s 235, lat −12.5, on a timber plinth at 24.9 m)
        from the roll-out, the halt platform's spot before it;
      - `dev/level/quarry-siding.ts`, new and wired into the place check: the siding's centreline ground within 0.2 m of
        the rail; at least 14 m from the gate's pillars, 16 m from Q5's frame, 19 m from Q4's frame and 18 m from the
        lever; the pile's footprint off every deck and ramp and at least 3 m from the siding's centreline; the start
        flood unchanged;
      - `docs/game-design/` (the passing beat).

      Verify: `npm run level-check` (the whole suite, exit 0, the new check "ok"); `.look/` stills from `cargo-run`:
      - the siding from the Quarry's up platform;
      - the cargo train standing with the pile beside it;
      - from a passenger train's cab as it passes;
      - a `--video` from the gate's apron of the passing beat (no lateral jump at either turnout, the crates flying in);
      - mesh and collider counts at the Quarry before and after.
- [ ] **Checkpoint B (the passing beat).** After steps 6 and 7: `npm run loop -- run` (minutes beside Checkpoint A's);
      the cargo fuzz's long run; `npm run test:net` with the cargo train in the siding across a leaver's rejoin; step
      7's stills and clip; the boot probe.

### Order, and what waits

| Step | Needs on main first | Why |
| --- | --- | --- |
| 1 | nothing | A new file and its test; no catalog |
| 2 and 3 | [greybox-lap](greybox-lap.md) steps 1 and 2 | **The lap ships first.** Its step 2 sorts about 94 reads of a slot's line across 25 files into running and origin lines and adds `io.slots`; this plan's step 2 sorts the same reads into every-train and passenger. Doing both at once doubles the hotspot risk (`railway-trains.ts`, `railway-sys-trains.ts`, `railway-lines.ts`). The lap is planned, its prerequisites (Port Quay step 4, prefeed's rule) are on main, and it is the larger. Each takes its own `WORLD_NS` |
| 4 | 2 and 3 | Seeds are built from the rules |
| 5 | 4; Port Quay step 6 if it is building | Stills come from `cargo-run`; both edit `garage-view.ts` |
| 6 | Checkpoint A | The siding changes the stone stop build 1 proves |
| 7 | 6 | Stills of the siding come from its rules |

**After the lap joins** (wall-6 laid), line 2 runs Village to the West landing and the cargo train patrols all of it.
Nothing in this plan changes for that: its stops are the Quarry's and Far Head's, its drops are line 2's legs' (none
open by then), and the join rewrites only cave rows (`lapRow`). The lap's test (h), "`runLine` never names the cave line
once joined", extends to the cargo slot, which runs line 2 throughout.

## Level findings

From [What it is, measured](#what-it-is-measured). The probe ran on the planned positions. `npm run level-check --
--place=place` on main passes (exit 0) and doesn't yet contain the siding; step 7 adds it as a check.

1. **The brief's one siding beside both loads can't exist.** The stone pile is on the homeward side (lat −9.4) and the
   Quarry bay on the outward side (lat +13.5), with both tracks and both platforms between. The plan loads stone going
   home and spares going out (changed the brief's shape; see [finding 1](#findings)).
2. **Bays to the track:** Quarry 13.4 m, Far Head 10.9 m, both across the outward platform. Drawn as flights (call 19);
   no prop is placed and nothing new is reachable.
3. **The siding (build 2), s 200 to 270 at lat −8, homeward side:** flat ground level with the rail, 14.2 m or more from
   the gate's pillars and 16.3 m or more from every frame. It stands clear of the up platform's end (20.9 m), its
   crossing (s 146.8) and the formation's tight bend (s 170 to 190). No collider stands on the walk between the up
   platform and Q5. The bot's walk past it is checkpoint B's run.
4. **The moved pile:** s 235, lat −12.5, ground 24.41 to 24.91 m under its footprint, so a plinth levels it (step 7).
   It is 4.5 m from the siding's centre and 8.5 m from the homeward track.
5. **Route contract.** The cargo train supplies only what a train-fed bill already takes by train: line 2's leg kit,
   which is minted at the Village anyway. It never feeds a frame, opens a gate or draws for a gated leg, so no gate
   loses its work. Riding its crates is the same travel edge as a passenger train on the same track, so nothing is
   reached earlier. **Nobody is stranded.** It stops only at ends and at brief middle stops, and a rider steps off at
   either. Every Quarry and Far Head spot it serves is reachable by passenger trains.
6. **Not checked:** stills from the player's eye (no browser in this docs job): the first thing steps 5 and 7 do.
   Colliders and props aren't in the probe, as with the halt yards' probe. Far Head's +s side past the up crossing (s
   538.5), where a second siding might go, is not probed (parked).

## Risks

- **The slot sort (the plan's largest).** About as many reads as the lap's (`LINE_SLOTS`, `lineSlots`,
  `servingSlots`, `RAIL_TRAINS[slot].line` across about 25 files), now sorted into every-train and passenger. A read left
  as every-train where it should be passengers (`fleetJoin`, `trainServes`, the riders, `legKitTrains`) is a quiet
  bug: the cargo train taken from the shed as a fleet train, called by a lever, or counted as a kit car. Tests (b), (c)
  and (f), the fuzz and the save rules catch these. Hotspots are `railway-trains.ts` (724 lines), `railway-lines.ts`
  (757) and `railway-sys-trains.ts` (300).
- **Shared ends.** The cargo train is one more train through the end blocks. Exempt from the holds, it can still stand
  in the Village end block while the block ahead is busy, and an arriving passenger train then waits at the signal.
  Step 2's test (f) and the fuzz report the passenger end waits with and without it. If they grow past the service
  health gate (23 November), the remedy is a stabling road at Home's Roundhouse, a later plan, not a hold on
  passengers.
- **Build 2's rejoin.** A train committed across the rejoin points blocks the cargo train's exit until it passes. With
  line 2's headway (40 to 57 s) the window recurs every pass. The fuzz reports the worst wait. The siding never holds a
  passenger train: it is off the main line, and `sidingRejoinFree` checks behind as well as `blockFree` ahead.
- **Room safety.** No effect in an apply. Draws and loads are rule-tick moves between rows inside one apply, and
  flights play from accepted row changes or receipts, once each. Malformed `rail.install` parts are refused, never
  thrown. The load-time catalog checks (the cargo row, `halt`, `siding`) throw at import, never in a room. A rule that
  threw would block checkpoints; `drawAmount` and `clearBehind` are total.
- **Mixed builds.** Two dated `WORLD_NS` bumps (steps 2 and 6), no compatibility code. Rooms start fresh at each.
- **Steel.** The pool's 12 now has one more sink: Big boiler 6, two trade fits 1 each, the cave line's pick, and this
  plan's 2. A room that commissions the cargo train with the first 6 home waits for the second trip for the Big boiler.
  That is a choice the garage was built to offer (call 10).
- **Performance.** One more consist on line 2 (reused engine, flatbed, crate and bundle batches) and, in build 2, about 70
  m of rails, sleepers and two turnouts. `npm run perf` at steps 5 and 7, reported. A guide, not a gate.
- **New shared file.** `src/sim/railway-cargo.ts` is inside `LOCKSTEP_FILES` and the server image's `src/sim`.

## Open questions

One for the owner. It doesn't wait: the build goes ahead on the recommendation, and the call is logged.

1. **"A steady, slow patrol loop": how slow?** His 26 November answer took the brief's wording. On line 2's shared
   double track, a cargo train slower than the line's fit holds every passenger train behind it until the next end, up
   to one Village-to-far-end trip, because nothing overtakes it except at build 2's one siding. **Recommended: it runs
   at the line's fit like every train, and "slow" is in how it looks and sounds** (the work engine, the heavier chuff
   and the deeper horn). If he wants it slower, it gets its own boiler row (one catalog number) and the plan adds
   passing sidings first.

## Design review (2026-11-27)

The planner ran this in the same context, per the design-review skill. It read DESIGN.md; owner-calls; the decision
routing table; the rewards, rail and core-loop Current rules, with the 12 November cargo-trains and town-economy
entries, the 10 November yards entry, the 15 November garage entries, the 23 November service decision and the 26
November desk answers in full; docs/direction.md; the newest playtest entries (Grant, 14 November); the brief and its
review; station-deposit; halt-yard; shared-pool; garage-choices; port-quay-roundhouse; greybox-lap; the research top
blocks above; `npm run loop` and the nodes above; the probe; and the code listed. Nothing is ported from Place. No still
was taken.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Cargo trains of their own, after the greybox route; until then the trains you ride carry the crates | Decided | 12 November, "A now, C later" ([entry](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered)) |
| 2 | Commissioned per line at the Roundhouse for steel from the shared pool, never Boogles; line 2 first, once steel is home | Decided | 26 November, desk item 11, brief Q1 ([entry](../decisions-process.md#d-2026-11-26-decision-desk-answers)); materials never Boogles (10 November) |
| 3 | Halt-yard build 2 is in the first build | Decided | 26 November, brief Q2 |
| 4 | No player seats; levers and riders ignore it; its crates are solid to ride | Decided | 26 November, brief Q3 |
| 5 | With nothing to fetch it keeps patrolling, passing through without stopping, never parked in the shed | Decided | 26 November, brief Q4 (its speed: call 13) |
| 6 | Unloaded spares land on the bill's rack, never filling a hand-fed frame | Decided | 26 November, brief Q5 |
| 7 | The stone stop is the full-load stop: a whole trainload (8) waiting at a middle-halt source | Decided | 12 November (same entry), `TRADE.loadStop` |
| 8 | Trains carry a yard's goods toward where their line needs them | Decided | 10 November ([yards at halts](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts)) |
| 9 | One `WORLD_NS` bump per build, shipped between sessions | Decided | Owner-calls, "Nothing waits on a world bump" (10 November) |
| 10 | The commission costs 2 steel, at either table, needing steel home | Default | Fits the pool of 12 beside the Big boiler's 6 and the trade fits; a real choice against the Big boiler (Grant: "no real decisions") |
| 11 | It rolls out at Home onto line 2 at the Village after the wagon's roll-out time (19 s), whichever table took the install | Default | One Roundhouse holds the stalls today; reuses the wagon's beat |
| 12 | The hand-over: line 2's passenger trains stop freight the tick its cargo train leaves the shed; line 1 stays "A" | Default | The brief's call 12; line 1's cargo train is parked |
| 13 | It runs at the line's fit (boilerAdopt), not slower; "slow" is its look and sound | New | Finding 2; owner question 1 |
| 14 | A middle-halt cargo stop happens only when no train behind would brake (`G` about 564 m); ends need no test | New | Finding 3; meets "freight never slows the route" without track, so build 1 needs no siding |
| 15 | Exempt from the headway and balanced holds; not counted in the passengers' headway, balance or service health | Default | Keeps passenger departures as today; measured in step 2 (f) |
| 16 | Draws come only from the Quarry and Far Head bays, going out; never stone, the Village rack or the Camp | Default | Both bays face the outward track and line 2's bills lie outward; no line 2 bill after the steel takes stone |
| 17 | A draw takes up to one section's kit, what the open leg still owes, never for a gated leg or at the bill's own halt | Default | Station-deposit's conditions (finding 7 there), applied through `legMintChain` |
| 18 | A cargo train's leftover drawn kit goes to the Village yard, never unmade | Default | "Nothing vanishes": players carried those logs |
| 19 | Pieces fly from a bay's bins to the deck across the outward platform (13.4 m, 10.9 m) | Default | "Sources load by cargo loaders" (10 November) read as a loader's throw; still in step 5 |
| 20 | The consist: a squat work engine, an amber lamp, no coach, two open slatted flats, a deeper two-tone horn | Default | The brief's call 11; Principles 7 and 11 |
| 21 | Build 2: one siding at the Quarry, homeward side, s 200 to 270, where passenger trains overtake it | New | The brief's call 7, kept as build 2 after finding 1 moved it off the pile's and bay's sides |
| 22 | The stone pile moves beside the siding (s 235, lat −12.5) | Default | Its 16 November spot was a designer's placement for platform loading |
| 23 | The siding and the pile's new spot drop in with the cargo train's roll-out | Default | Telegraphs the change; nothing new stands before it is used |
| 24 | An optional loop node `cargo*`; the bot doesn't commission it | Default | It gates nothing |
| 25 | The placeholder strings above | Default | Placeholders for the owner, none The Boogler's |

**Counts: 9 Decided, 13 Default, 3 New.**

### Findings

1. **The brief's siding stood beside neither load** (level). The stone pile is on the homeward side of the Quarry and the
   bay on the outward side; one siding can't serve both. Changed the plan: stone loads going home and spares going out.
   Build 2's siding is homeward only, at s 200 to 270, with the pile moved beside it (steps 3, 6 and 7; Level findings
   1 to 4).
2. **"Slow" patrol against a shared double track** (decided wording). A slower cargo train would hold every train behind
   it for up to a whole run. The plan runs it at the line's fit and asks the owner (question 1). Step 2 carries it.
3. **Where freight can still slow passengers.** Middle stops are made free by `clearBehind` (step 2 test (e)). Ends are
   shared: the cargo train passes through the end blocks. The plan exempts it from every hold, measures the passenger
   end waits (test (f)), and names the remedy if they grow (Risks). Nothing is assumed free.
4. **The brief's "zero lockout during footings" moment can't happen after steel.** The pier's, the bents' and the
   counterweight's footings are all owed before the rivet, and the cargo train comes after steel. The plan drops that
   proof (the brief's Done means 3) and keeps the lifted clause for the cargo train only, harmlessly.
5. **Halt-yard draws matter for one stretch.** After the steel, line 2's train-fed bills are the stack leg and the
   incline's kit (`npm run loop`). After those, line 2 has no open bill, and the cargo train hauls only stone. Logged
   plainly: from then on a bay is a tidy bin again, as halt-yard said before build 2. Line 1's and the greybox lines'
   cargo trains are parked, as the brief parks them.
6. **First meeting and learning it untold.** The Cargo tile appears in the garage the moment steel lands, with "STEEL
   n/2". The roll-out is the reveal. The first sight in service is from a passenger train or a platform: a train with
   no coach and open cars stopping by the bay you left logs in. The pieces flying onto the deck teach the rest. Build
   2's passing beat repeats the lesson on every homeward ride (Principle 11). No helper text.
7. **Solo and co-op.** Solo: you leave spares at the Quarry, ride out to the stack railhead, and they arrive on the rack
   behind you. Co-op: one friend harvests and deposits at the Quarry while another feeds the stack frame. The cargo train
   is the relay between them, with no routing. A friend arriving late sees the train and its load from replicated rows.
   Two players at one bay as a draw happens: each take is its own op, and a raced take is corrected (step 3 test (f)).
8. **Playtest evidence.** Grant (14 November): "running errands with no real decisions" and "running back for rails".
   Here the room decides whether to commission the cargo train (2 steel against the Big boiler's 6), and spares stop
   being an errand. No session has measured the stack leg's kit waits with draws; Checkpoint A's loop run is the first
   number.
9. **Research.** Followed: rail-network-depth (no routing, automatic service, a physical improvement the room chooses)
   and roundhouse-management (one small choice per line). Nothing contradicts them.
10. **Copy.** No line of The Boogler's is added or touched, and none was found in the files read. The new strings are
    placeholders.

### Owner questions

1. The patrol's speed: [open question 1](#open-questions). Recommended: the line's fit. Does not wait.

## Suspect or placeholder lines (none rewritten; none The Boogler's)

- `[placeholder: Cargo train]` and its description (the garage tile), and the pill words, if any is new. Neon may draft
  options with the other garage hold strings (26 November, desk item 12).
