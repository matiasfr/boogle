# Order picks — audit measurements (2026-11-25)

1. **Loader yard (audit row 14):** Bought in order after plot 1 (150 then 800 Boogles), plot 2 is affordable **after the weights** for 1, 2 and 3 players — at **41:40** solo (+1:08 after weights end at 40:32), **36:16** for 2p (+1:31 after 34:45), and **35:46** for 3p (+1:38 after 34:08) on the calibrated loop clock. Bought directly by skipping plot 1 (400 Boogles, allowed by `TRADE.stakedAtOnce = 2`), it is affordable **before the bents start** — at **33:39** solo (−0:27 before 34:07), **28:16** for 2p (−0:20 before 28:36), and **27:45** for 3p (−0:20 before 28:05).
2. **Boilers (audit rows 15 and 17):** Row 15 (longer boiler, 20 → 25 m/s) saves **10.3 s to 25.5 s a one-way ride** across the four stack-leg kit drops (Ring Island through Stack head 3; 20.6 s to 51.0 s a round trip) and **30.7 s a ride** to High Gorge. Row 17 (big boiler, 25 → 30 m/s) saves **19.9 s a one-way ride** on Village ↔ High Gorge non-stop (39.8 s a round trip; 20.0 s mean homeward with the Quarry stone stop) and **2.0 s to 16.5 s** on intermediate line 2 spans.
3. **Unmeasured:** Human detours between `trains` and `weights` (`dev/loop/detour.json` has no calibration past `Q5`), walking back to the Village board to buy a plot, and whole-leg wall-clock deltas for the two boilers (only per-ride and round-trip seconds were measured).

All measurements were run against `origin/main` commit `d88237879d1ca9ea1cd9d9277fd2dd701808810b` (world v67, Node `v26.13.0`). No game code, tests, tools or plans were edited; scratch scripts were kept uncommitted under `.look/`.

---

## Method and commands

### Baseline loop run

`npm run loop -- run --order canonical --no-probes` (on `d88237879`) establishes the calibrated and straight-line clocks for 1 to 4 players through the real rules (`src/world/railway-server.ts` via `dev/loop/host.ts`, tunables at `src/sim/tune.ts` defaults: `railFarePct = 100`, `railRiderPct = 100`, `railPricePct = 50`).

### Measurement 1: loader yard buy time

Run with `node --import ./test/helpers/rail-no-audit.ts .look/measure.ts` (on `d88237879`). The script calls `playOrder` from `dev/loop/run.ts` on the canonical order for 1, 2 and 3 players, both calibrated (`detour: true`) and straight-line (`detour: false`), wrapping `h.advance()` to read `town(w, 0).wood`, `plotsStaked(w, 0)`, `plotPrice(w, 0, k, 50)` and `till(w)` on every tick.

Two purchase paths were measured because `TRADE.stakedAtOnce = 2` (`src/sim/railway-trade-layout.ts:51`) stakes plot 2 (`k = 1`, `wood >= 24`, `base: 800`) alongside plot 1 (`k = 0`, `wood >= 8`, `base: 300`):

- **In order:** Buy plot 1 (`rail.buy { id: 0 }`) on the exact tick it is staked and affordable (150 Boogles). Buying plot 1 immediately doubles plot 2's price (`TRADE.houseOrder = 2`, `src/sim/railway-queries-trade.ts:119`) to 800 Boogles, and adds +1 building (2 → 3) after `TRADE.buildTicks = 100` (10.0 s). Record the earliest tick plot 2 is staked and `till.boogles >= 800`.
- **Direct (skip plot 1):** Leave plot 1 unbought so plot 2 stays at 400 Boogles. Record the earliest tick plot 2 is staked and `till.boogles >= 400`.

For cross-checking against the static trade seed, the same script also ran `railwayAtTrains('trains-on')` and `railwayAtTrade('house-ready' | 'house-built' | 'yard-ready')` from `src/sim/railway-seed-trade.ts`.

### Measurement 2: boiler ride times

Two sources, both on `d88237879`:

1. **Sim leg and cycle functions** (`node --import ./test/helpers/rail-no-audit.ts .look/measure.ts`): calls `trainLegTicks(dist, 0, stopKin(LINE2, to, 0, boiler))` (`src/sim/railway-train.ts:279-282`) and `cycleTicks(LINE2, stops, boiler)` (`src/sim/railway-trains.ts:112-114`) over line 2's catalog halt positions (`RAIL_LINES[LINE2].halts`, `src/sim/railway-lines.ts:476-532`) and boiler profiles (`BOILER[1..3]`, `src/sim/railway-train.ts:39-41`).
2. **Live 6-train sim check** (`node --import ./test/helpers/rail-no-audit.ts .look/measure-live-boilers.ts`): starts from `railwayAtGarage('trade-ready')` (line 2 open to High Gorge with 6 trains in service and 12 steel home), installs `part: 2` (row 2) and `part: 3` (row 3) through accepted `rail.install`, waits for all 6 trains to adopt the boiler at Village (`halt 0`), and records every completed Village ↔ High Gorge ride over a 6,000-tick (10-minute) window.

**Arithmetic check (inputs):** `BOILER[1]` = `{ speed: 200, accel: 3.5, brake: 3.5 }` (20 m/s), `BOILER[2]` = `{ speed: 250, accel: 3.5, brake: 3.5 }` (25 m/s), `BOILER[3]` = `{ speed: 300, accel: 3.5, brake: 3.5 }` (30 m/s), all in cm/tick and cm/tick² (10 ticks = 1 s; `src/sim/railway-train.ts:39-41`). Dwell at each end is `TRAIN.dwellTicks = 50` (5.0 s; `src/sim/railway-train.ts:23`). None of Ring Island, Stack heads 1–3 or High Gorge sets a custom `brake` (`src/sim/railway-lines.ts:168-194, 521-532`). Since every measured span exceeds the accelerate-and-brake distance `v² / a` (114.3 m at 20 m/s, 178.6 m at 25 m/s, 257.1 m at 30 m/s), the sim's `profile()` (`src/sim/railway-train.ts:248-254`) evaluates to `Math.ceil(distCm / speed + speed / 3.5)` ticks. For Village → High Gorge (`323040 - 2165 = 320875` cm): `ceil(320875/200 + 200/3.5) = 1662` ticks (166.2 s), `ceil(320875/250 + 250/3.5) = 1355` ticks (135.5 s), and `ceil(320875/300 + 300/3.5) = 1156` ticks (115.6 s).

---

## Tables

### Measurement 1: loader yard buy time (calibrated loop clock)

All times are `mm:ss` from wake, read from the sim loop run on `d88237879`. Plot 2 finishes building 10.0 s (`TRADE.buildTicks = 100`) after purchase. Strongbox losses (`till.lost`) were `0` in every run.

| Players | Path (price) | Trains wake | Wood ≥ 24 | Plot 1 bought | Plot 2 affordable (built) | Bents (start..end) | Weights (start..end) | Plot 2 vs bents start | Plot 2 vs weights end | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1p | In order (800 B) | 21:21 | 25:47 | 27:21 | **41:40** (41:50) | 34:07..39:46 | 39:55..40:32 | +7:34 (+453.5 s) | **+1:08 (+68.0 s)** | After weights |
| 2p | In order (800 B) | 15:58 | 20:23 | 21:58 | **36:16** (36:26) | 28:36..34:15 | 34:24..34:45 | +7:41 (+460.8 s) | **+1:31 (+91.3 s)** | After weights |
| 3p | In order (800 B) | 15:28 | 19:53 | 21:28 | **35:46** (35:56) | 28:05..33:45 | 33:54..34:08 | +7:41 (+460.8 s) | **+1:38 (+98.3 s)** | After weights |
| 1p | Direct (400 B) | 21:21 | 25:47 | — | **33:39** (33:49) | 34:07..39:46 | 39:55..40:32 | **−0:27 (−27.3 s)** | −6:53 (−412.8 s) | Before bents |
| 2p | Direct (400 B) | 15:58 | 20:23 | — | **28:16** (28:26) | 28:36..34:15 | 34:24..34:45 | **−0:20 (−20.0 s)** | −6:30 (−389.5 s) | Before bents |
| 3p | Direct (400 B) | 15:28 | 19:53 | — | **27:45** (27:55) | 28:05..33:45 | 33:54..34:08 | **−0:20 (−20.0 s)** | −6:23 (−382.5 s) | Before bents |

### Measurement 1: straight-line loop clock and trade seed cross-check

Because `dev/loop/detour.json` has no calibrated detours past `Q5`, every interval after `trains` is identical between the calibrated and straight-line runs; only the absolute clock shifts earlier.

| Run | Path (price) | Trains wake | Plot 2 affordable (built) | Bents (start..end) | Weights end | Plot 2 vs bents start | Plot 2 vs weights end |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1p straight-line | In order (800 B) | 15:06 | 35:25 (35:35) | 27:51..33:31 | 34:17 | +7:34 (+453.5 s) | +1:08 (+68.0 s) |
| 2p straight-line | In order (800 B) | 12:07 | 32:26 (32:36) | 24:45..30:24 | 30:54 | +7:41 (+460.8 s) | +1:31 (+91.3 s) |
| 3p straight-line | In order (800 B) | 11:17 | 31:50 (32:00) | 24:09..29:48 | 30:11 | +7:41 (+460.8 s) | +1:38 (+98.3 s) |
| 1p straight-line | Direct (400 B) | 15:06 | 27:24 (27:34) | 27:51..33:31 | 34:17 | −0:27 (−27.3 s) | −6:53 (−412.8 s) |
| 2p straight-line | Direct (400 B) | 12:07 | 24:25 (24:35) | 24:45..30:24 | 30:54 | −0:20 (−20.0 s) | −6:30 (−389.5 s) |
| 3p straight-line | Direct (400 B) | 11:17 | 23:49 (23:59) | 24:09..29:48 | 30:11 | −0:20 (−20.0 s) | −6:23 (−382.5 s) |
| Trade seed (`yard-ready`) | In order (800 B) | 5:39 | 32:00 (+26:22 from trains) | — | — | — | — |

The static trade seed (`src/sim/railway-seed-trade.ts`) takes longer from `trains-on` (+26:22 vs +20:19 solo in the live loop) because it stays on 1 train at 14 m/s to Far Head (7 Boogles a fare), while the live loop opens the Pier and Railhead (longer route, higher fare), upgrades to 20 m/s, and adds trains 2 and 3.

### Measurement 2: Row 15 — longer boiler (20 → 25 m/s) on stack-leg kit rides

Read from `trainLegTicks` on `RAIL_LINES[LINE2].halts` (`d88237879`). Round-trip savings double the one-way savings because `TRAIN.dwellTicks` (5.0 s at each end) is unchanged.

| Leg (from Village, `s = 21.65 m`) | Distance | 20 m/s (`BOILER[1]`) | 25 m/s (`BOILER[2]`) | Saved / one-way ride | Saved / round trip |
| --- | ---: | ---: | ---: | ---: | ---: |
| Village → Ring Island (`stack-1` kit, `s = 1193.40 m`) | 1,171.75 m | 64.4 s (644 t) | 54.1 s (541 t) | **10.3 s** | 20.6 s |
| Village → Stack head 1 (`stack-2` kit, `s = 1690.10 m`) | 1,668.45 m | 89.2 s (892 t) | 73.9 s (739 t) | **15.3 s** | 30.6 s |
| Village → Stack head 2 (`stack-3` kit, `s = 2200.20 m`) | 2,178.55 m | 114.7 s (1147 t) | 94.3 s (943 t) | **20.4 s** | 40.8 s |
| Village → Stack head 3 (`stack-4` kit, `s = 2710.30 m`) | 2,688.65 m | 140.2 s (1402 t) | 114.7 s (1147 t) | **25.5 s** | 51.0 s |
| Village → High Gorge (full line, `s = 3230.40 m`) | 3,208.75 m | 166.2 s (1662 t) | 135.5 s (1355 t) | **30.7 s** | 61.4 s |

### Measurement 2: Row 17 — big boiler (25 → 30 m/s) on line 2 rides after High Gorge

Read from `trainLegTicks` and `cycleTicks` on `RAIL_LINES[LINE2].halts` (`d88237879`).

| Line 2 span after High Gorge | Distance | 25 m/s (`BOILER[2]`) | 30 m/s (`BOILER[3]`) | Saved / one-way ride | Saved / round trip |
| --- | ---: | ---: | ---: | ---: | ---: |
| Village → High Gorge (full line, non-stop) | 3,208.75 m | 135.5 s (1355 t) | 115.6 s (1156 t) | **19.9 s** | **39.8 s** (`cycleTicks` 281.0 → 241.2 s) |
| Village → Ring Island | 1,171.75 m | 54.1 s (541 t) | 47.7 s (477 t) | **6.4 s** | 12.8 s |
| Ring Island → High Gorge | 2,037.00 m | 88.7 s (887 t) | 76.5 s (765 t) | **12.2 s** | 24.4 s |
| Village → Stack head 3 (Stack halt) | 2,688.65 m | 114.7 s (1147 t) | 98.2 s (982 t) | **16.5 s** | 33.0 s |
| Stack head 3 → High Gorge | 520.10 m | 28.0 s (280 t) | 26.0 s (260 t) | **2.0 s** | 4.0 s |

**Live 6-train sim check (`trade-ready`, 10-minute window):** Every outbound Village → High Gorge ride ran non-stop with zero signal holds (8 rides at 20 m/s, 10 at 25 m/s, 12 at 30 m/s), matching `trainLegTicks` savings exactly (**30.7 s** for row 15, **19.9 s** for row 17). Homeward High Gorge → Village rides included 2 Quarry stone-yard full-load stops (`TRADE.yards[1]`, `loadStop: 8`) in each 10-minute window and zero signal holds, giving mean homeward savings of **32.9 s** (row 15) and **20.0 s** (row 17).

---

## Limits

- **Earliest-tick lower bound for plot 2:** The hook fires `rail.buy` on the exact tick the strongbox reaches the price, with zero walking time to the Village board. Any real room that visits the board later buys plot 2 later — or, if it delays plot 1, earns fewer fares before plot 2.
- **No human detours after `Q5`:** `dev/loop/detour.json` leaves every node from `glider` through `weights` at `x1`. Slower human play between `trains` and `bents` would give riders more wall-clock minutes to pay fares before `bents` starts, which could pull plot 2 earlier relative to the bents and weights.
- **No rider asks in the live boiler check:** The 10-minute `trade-ready` run had no player stop requests (`rail.call`). Intermediate passenger stops add braking, dwell and re-acceleration, which shrinks the per-span saving to the intermediate table's figures.
- **Per-ride only for boilers:** Whole-leg completion time saved on `stack-1`..`stack-4` (row 15) or `incline-1`..`incline-2` (row 17) was not measured.
