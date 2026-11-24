# Garage step 4 — Checkpoint proofs (2026-11-24)

> **For the owner, the table first.** Fitted by accepted `rail.bring` and `rail.install` on `trade-ready`, **Strong saves
> 55.2 s solo over Standard and 19.7 s over Quick**, both above the plan's 15 s line. Fitted once the bay cut is laid
> (`trade-ready` run on to `bay-reached`), **Strong saves 6.0 s over Standard and is 29.0 s slower than Quick.** The
> proof's own test fails: the Strong row (mean 2726.0 ticks) is **15.5 s off** Checkpoint G's `bay-mid` row (2880.9), not
> within a second. The stage moved, not the rule: `bay-mid` cannot pay for a fit, so the fit runs on `trade-ready`.
> There Standard alone is 16.0 s faster than at `bay-mid` (3277.6 against 3437.6), because the trains stand elsewhere
> when the 12 steel are home. The Standard baselines at `bay-mid` and `bay-reached` reproduce Checkpoint G to the tick.

| Fitted at (by accepted ops) | Fit | Feeders | Rack 1 | Rack 2 | Rack 3 | Total ticks | Mean total | Early departures |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `trade-ready` | Standard (0) | 1 | 412–1092 | 720 | 921 | 2956–3636 | 3277.6 | 0/8 |
| `trade-ready` | Standard (0) | 2 | 412–1093 | 721 | 922 | 2955–3636 | 3277.5 | 0/8 |
| `trade-ready` | Quick (4) | 1 | 412–1015 | 577–578 | 739 | 2631–3235 | 2923.0 | 0/8 |
| `trade-ready` | Quick (4) | 2 | 412–1016 | 578–579 | 740 | 2630–3235 | 2922.9 | 0/8 |
| `trade-ready` | **Strong (5)** | 1 | 412–1107 | 366–720 | 309–692 | 2344–3068 | **2726.0** | 0/8 |
| `trade-ready` | Strong (5) | 2 | 412–1108 | 366–721 | 309–693 | 2342–3067 | 2724.9 | 0/8 |
| `trade-ready` → `bay-reached` | Standard (0) | 1 | 0 | 641–1166 | 921 | 2465–2990 | 2727.5 | 0/8 |
| `trade-ready` → `bay-reached` | Standard (0) | 2 | 0 | 410–1092 | 922 | 2232–2914 | 2631.9 | 0/8 |
| `trade-ready` → `bay-reached` | Quick (4) | 1 | 0 | 581–963 | 738–739 | 2222–2605 | 2378.0 | 0/8 |
| `trade-ready` → `bay-reached` | Quick (4) | 2 | 0 | 582–964 | 739–740 | 2221–2604 | 2377.0 | 0/8 |
| `trade-ready` → `bay-reached` | Strong (5) | 1 | 0 | 581–1106 | 921 | 2405–2930 | 2667.5 | 0/8 |
| `trade-ready` → `bay-reached` | Strong (5) | 2 | 0 | 582–1107 | 922 | 2404–2929 | 2666.5 | 0/8 |
| `bay-mid` (Checkpoint G's baseline) | Standard (0) | 1 | 792–915 | 720 | 921 | 3336–3459 | 3437.6 | 0/8 |
| `bay-mid` | Standard (0) | 2 | 793–916 | 721 | 922 | 3336–3459 | 3437.6 | 0/8 |
| `bay-reached` (Checkpoint G's baseline) | Standard (0) | 1 | 0–16 | 436–1118 | 921 | 2260–2942 | 2581.4 | 0/8 |
| `bay-reached` | Standard (0) | 2 | 0–16 | 437–1119 | 922 | 2259–2941 | 2580.4 | 0/8 |

Savings, mean total, positive = faster (10 ticks = 1 s):

| Fitted at | Feeders | Strong vs Standard | Strong vs Quick | Quick vs Standard | Checkpoint G (`bay-mid`, `bay-reached`) |
| --- | ---: | ---: | ---: | ---: | --- |
| `trade-ready` | 1 (solo) | +55.2 s | **+19.7 s** | +35.5 s | +55.7 s, +13.5 s, +42.2 s |
| `trade-ready` | 2 | +55.3 s | +19.8 s | +35.5 s | +55.8 s, +13.6 s, +42.2 s |
| `trade-ready` → `bay-reached` | 1 (solo) | +6.0 s | −29.0 s | +35.0 s | +7.7 s, −17.9 s, +25.6 s |
| `trade-ready` → `bay-reached` | 2 | −3.5 s | −29.0 s | +25.5 s | +7.7 s, −17.9 s, +25.6 s |

Branch `claude/garage-step4-checkpoint` on main `56138efa6` (world v67), Node v26.13.0, HOTBOX. **Not tested on a
device.** Raw logs and clips are under `.look/step4-checkpoint/` (local).

## Summary

| # | Proof | Command | Verdict |
| --- | --- | --- | --- |
| 1 | Two peers at the post, then the departure and the railhead | `npm run look -- --players 2 --real --rail-seed trade-ready --hud --eval dev/look/evals/garage-trade-two.ts --until window.__twoDone --seconds 100 --frames 25 --wall 900 --name gt-two`; `npm run look -- --players 2 --real --rail-seed trade-held --hud --eval dev/look/evals/trade-held.ts --action dev/look/evals/trade-held.ts --query view=platform --until window.__tradeTrain --wall 900 --name th-two` | **Pass** (both looks), with what was not seen below |
| 2 | The trade table by accepted ops | `node --import ./test/helpers/rail-no-audit.ts dev/sim/leg3-trade.ts` | **Fail as worded**: Strong 15.5 s off Checkpoint G's row (above) |
| 3 | Network suite | `npm run test:net` | **Pass**, 292/292 checks, namespace v67 |
| 4 | Perf at the Roundhouse | `npm run perf -- --view roundhouse` and `-- --view roundhouse --hardware` | Reported (not a gate) |
| 5 | Loop run, 1 to 3 players | `npm run loop -- run` | **Pass**, exit 0 |
| 6 | Frame time on the Mac at the Roundhouse | — | **Not measured** (no Mac in the loop) |

## 1. Two peers at the post (`--real`)

`gt-two`, verdict pass on `1ee36111`, load 1.92 → 3.52, players seen each other. Each page's log, as `look` echoed it:

- **The bring.** Player 1 clicked the Bay line chip, and `rail.bring` was accepted at tick 23474. Both pages then read
  `tableLine` 3 (the bay line), the Bay line chip `aria-pressed="true"`, the chips' title "The table’s busy", and no
  Install button. Engine tab: "Quick boiler Ready · Strong boiler Ready", bill "STEEL 1/1". Player 1's sheet shows the
  bay copy on its table from 4 s. Player 2's table is read from its state (the view draws `tableLine`'s copy), not seen
  in a still.
- **The other's install during the swap.** Player 2 selected Strong and held Interact for a second at tick 23491, with
  the hold ending at 23534. The screen showed no Install, only "The table’s busy" on the chips. Nothing was sent: the
  bay row stayed 0 and the phase idle. Note the refusal is the screen's: the Install button is withheld, so the
  server's refusal path is never reached from the UI (the plan's words: "refuses with The table's busy").
- **The fit.** Install lit on player 2 at tick 23534, exactly when the bring's hold ends. Holding at once fitted Strong
  on the first hold, accepted at 23546 (`rev` 1). Player 1's screen played the watched moment, and its sheet at 8 s
  shows "Strong boiler · Installed".
- **The next departure, not mid-run.** Train 9 was running when the fit landed (`wasPhase` 1). It changed 0 → 5 only
  standing at the West landing (phase 0, at 0, tick 23885), on both pages. It left at 23935 (player 1 read 23936):
  **4 cars, `engine, player, kit, cargo`, 5 crates on the flatbed**, the same on both pages. Player 1's sheet shows it
  arriving at about 37 s and gone by 46 s.
- **Later, at a leg 3 railhead.** This look starts on `trade-held`, because no look plays the bay cut and the Canopy
  gate by real input after the fit. So "later" is this seed, not the same train after the departure above. `th-two`,
  verdict pass on `1ee36111`, load 2.25 → 4.05: on both pages a Strong bay train is held at Bell Rock's upper platform
  (boiler 5, `tailCrates` 5, cars `engine, player, kit, cargo`). Player 1's framed still shows five crates on the
  flatbed and the empty kit car, with player 2 on the platform. Player 2's own camera sat against the engine's cab roof
  beside it, so its still shows only the engine's edge; its sight of the train is its state.

Stills: [two-peers-bring-fit-departure.png](garage-step4-checkpoint/two-peers-bring-fit-departure.png) (player 1's
sheet: the bring, the watched fit, the West landing departure),
[held-strong-flatbed.png](garage-step4-checkpoint/held-strong-flatbed.png). Gut check: the bay chip and copy, the
Installed tile and a four-car train at the landing read as the plan describes. The first `gt-two` run passed too, but
its page logs were dropped: look echoes only lines matching `^[A-Z]{3,} ` and the prefix was `TRADE2`, now renamed.

## 2. The trade table (`dev/sim/leg3-trade.ts`)

The tool as on main fitted Strong and Quick by writing `Line` by hand. Since world v67 that breaks the trade's
invariants (`Line.rev`, steel spent), and the run stopped at "lay and restore" on its first Quick row. So it could not
run as worded. Changed: every fit is now `rail.bring` then `rail.install`, each after the table's hold, on
`trade-ready` and on `trade-ready` run on to `bay-reached` by the leg seed's own steps. `bay-mid` and `bay-reached`
stay as Standard only, as Checkpoint G's baseline. Why `trade-ready`: `bay-mid`'s steel pool is 0 (the works unlit, its
8 logs and 12 rails in Ring Island's yard), so no fit is affordable there by accepted ops (garage step 4's as-built
note). Figures are in the table above. 128 runs, 2 min 24 s, no failure.

## 3. Network suite

`npm run test:net`: `PASS: 292/292 checks passed`, rooms `rail-v67-*`, exit 0 (`.look/step4-checkpoint/test-net.txt`).

## 4. Perf at the Roundhouse (not a gate)

A `roundhouse` place was added to `dev/look/perf.ts`: seed `trade-fitted` (`ns` Quick, `bay` Strong, both copies in
their bays, the bay copy and its flatbed on the table), the body by the garage post. Still:
[perf-roundhouse.png](garage-step4-checkpoint/perf-roundhouse.png).

- Counts (`--view roundhouse`, load 12.52 → 2.26, above the 12 "bench quiet" mark at the start): 568 draw calls, 241
  shadow calls, 1,441,205 triangles, 1,499 geometries, 247 programs.
- Frame time on HOTBOX (`--hardware`, NVIDIA Ampere, 960×600, MSAA 4; load 1.88 → 13.72, so the end of the sample was
  not quiet): main-thread CPU a frame 20.5 ms average, p95 36.7, max 71.1 (231 samples); GPU render 4.26 ms average,
  p95 6.26, max 6.40 (229 samples). A HOTBOX figure, not the Mac's.

## 5. Loop run

`npm run loop -- run`, exit 0 (`.look/step4-checkpoint/loop-run.txt`). All 46 order probes at 1 player refused by the
real rules as the graph says. Played areas 1–6, canonical order, straight-line / calibrated: 1 player 1:11:16 /
1:17:31, 2 players 1:10:47 / 1:14:38, 3 players 1:10:11 / 1:14:07. Whole route with stand-ins: 2:40, 2:34, 2:32
(44%, 43%, 42% of the 360-minute target). The trade has no node of its own (`rail.bring` is a generic op), so the loop
plays no fit.

## 6. Frame time on the Mac

Not measured: no Mac in the loop. No HOTBOX figure stands in for it.

## The early Install (garage step 4's finding): did not reproduce at real speed

At real speed, in one two-peer run, Install lit exactly when the bring's hold ended (both clocks 23534 against a hold
ending at 23534) and the first hold fitted. Its log is `gt-two` above. Two warped repeats (5x, then 3x) both failed on
harness clock capacity: the pages drifted 36 to 46 game s behind, and the 3x run ended under load. So no valid
warped repeat exists. The finding stands only from step 4's warped bot runs. On the Quick run, Install lit and the hold
began before tick 23252 by the action clock (`railAt`), while the bring's hold ends at 23255. Mid-crank the screen's
table hold came back (`holding+held` → `holding-can+tablehold` → `idle`).

The cause, from the code and those logs: the screen and the server judge the table's hold on different clocks.

- The screen: `roundhouse-view.ts:740` builds the garage's facts with `adapter.read.tickNow()`, and
  `garage-state.ts:53` sets `held: tick < tableFree(w)`. `garage-view.ts:537` (`canInstall`) requires `!facts.held`,
  and `features/garage.ts:315` shows Install only when `canInstall`. `garage-view.ts:1073` drops a running hold the
  moment `canInstall` turns false.
- `tickNow` (`railway-session.ts:145–147`) is the movers' RTT-compensated room time. It is an estimate, and unlike the
  action tick (`tick()`, kept monotonic by `Math.max` at `railway-session.ts:138`) nothing stops it stepping back. In
  the failed 5x run it read 43 ticks behind `railAt` mid-swap (23809 against 23852) and 13 behind at the bring.
- The server: `railway-sys-steel.ts:214` refuses the install on `tableBusy(w, tick)` (`railway-queries-works.ts:75`,
  `tableFree` at `:65`), on the room's own tick when the op arrives.

So when `tickNow` runs ahead of the room's tick, Install lights early. When it then steps back, the screen's hold
returns and line 1073 drops the crank, as the bot logged. At real speed with a steady clock the two agreed to the
tick. Not fixed here; the fix is a separate reviewed job.

## What changed (dev tooling only)

- `dev/sim/leg3-trade.ts`: fits by accepted ops (above). Hand-written fits are gone.
- `dev/look/evals/garage-trade-two.ts` (new): the two-peer look of proof 1, plus the early-Install probe.
- `dev/look/perf.ts`: one `roundhouse` place.

## Not seen or unverified

- Player 2's table copy and player 2's view of the held train are read from state, not seen in a still.
- The same Strong train from its departure to a leg 3 railhead: the railhead is a separate seed (`trade-held`).
- The server's refusal of an install during a swap: the UI never sends one.
- The Mac frame time; any real device.
