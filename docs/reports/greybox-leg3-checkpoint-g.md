# Greybox leg 3 — Checkpoint G proofs (2026-11-24)

> **Owner callout (garage step 4 / [open question 1](../plans/greybox-leg3.md#open-questions)):** **Strong fitted at `bay-reached` saves under 15 s solo.** Across the eight start offsets (0 to 525 by 75), Strong fitted at `bay-reached` averages **2504.9 ticks** solo vs **2581.4 ticks** for Standard (a saving of **7.7 s**, 76.5 ticks) and **2325.6 ticks** for Quick (**17.9 s slower** than Quick, −179.3 ticks). Only offset 0 improves over Standard (`1948` vs `2560`); offsets 75–525 match Standard tick-for-tick because kit ahead has already loaded leg 3's first sections onto standard trains. Fitted at `bay-mid`, Strong averages **2880.9 ticks** solo, saving **55.7 s** vs Standard (`3437.6`) and **13.5 s** vs Quick (`3016.0`). Per Checkpoint G, this goes to the owner with the table below before garage step 4's screen is built.

Verified against `origin/main` (`661e339c6`, world v66, containing #2327 and #2328) on Node `v26.13.0`. Not tested on a device.

## Summary

| # | Proof | Exact command | Result | Log |
| --- | --- | --- | --- | --- |
| 1 | Step 3 trade table | `node --import ./test/helpers/rail-no-audit.ts dev/sim/leg3-trade.ts` | PASS (96/96 runs) | `.look/checkpoint-g/leg3-trade.txt` |
| 2 | Step 3 hold tests | `UNIT_ONLY=test/railway-leg3-hold.test.ts node dev/test-unit.ts` | PASS (2/2 tests) | `.look/checkpoint-g/hold-test.txt` |
| 3 | Step 2 fuzz (`ROUTE_GATES=1`) | `ROUTE_GATES=1 UNIT_ONLY=test/railway-leg2-rules.test.ts node dev/test-unit.ts` | PASS (16/16 tests) | `.look/checkpoint-g/step2-fuzz.txt` |
| 4 | Loop run | `npm run loop -- run` | PASS (exit 0) | `.look/checkpoint-g/loop-run.txt` |
| 5 | Network suite | `npm run test:net` | PASS (268/268 checks) | `.look/checkpoint-g/test-net.txt` |

## 1. Step 3 trade table (`dev/sim/leg3-trade.ts`)

Command:

```sh
node --import ./test/helpers/rail-no-audit.ts dev/sim/leg3-trade.ts
```

Each row summarizes the eight start offsets (`0, 75, 150, 225, 300, 375, 450, 525` ticks) printed in `.look/checkpoint-g/leg3-trade.txt` (10 ticks = 1 s). Rack columns are min–max ticks from opening the Canopy gate (or the prior lay) until that section's full bill was racked; total ticks run from opening the gate to the third lay.

| Fitted at | Fit | Feeders | Rack 1 | Rack 2 | Rack 3 | Total ticks | Mean total | Early departures |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `bay-mid` | Standard (0) | 1 | 792–915 | 720 | 921 | 3336–3459 | 3437.6 | 0/8 |
| `bay-mid` | Standard (0) | 2 | 793–916 | 721 | 922 | 3336–3459 | 3437.6 | 0/8 |
| `bay-mid` | Quick (4) | 1 | 700–823 | 578 | 739 | 2920–3043 | 3016.0 | 0/8 |
| `bay-mid` | Quick (4) | 2 | 701–824 | 579 | 740 | 2920–3043 | 3016.0 | 0/8 |
| `bay-mid` | Strong (5) | 1 | 822–945 | 366 | 692 | 2783–2906 | 2880.9 | 0/8 |
| `bay-mid` | Strong (5) | 2 | 823–946 | 366 | 693 | 2782–2905 | 2879.9 | 0/8 |
| `bay-reached` | Standard (0) | 1 | 0–16 | 436–1118 | 921 | 2260–2942 | 2581.4 | 0/8 |
| `bay-reached` | Standard (0) | 2 | 0–16 | 437–1119 | 922 | 2259–2941 | 2580.4 | 0/8 |
| `bay-reached` | Quick (4) | 1 | 0–16 | 436–975 | 738–739 | 2077–2617 | 2325.6 | 0/8 |
| `bay-reached` | Quick (4) | 2 | 0–16 | 437–976 | 739–740 | 2076–2616 | 2324.6 | 0/8 |
| `bay-reached` | Strong (5) | 1 | 0–16 | 436–1118 | 309–921 | 1948–2942 | 2504.9 | 0/8 |
| `bay-reached` | Strong (5) | 2 | 0–16 | 437–1119 | 309–922 | 1946–2941 | 2503.8 | 0/8 |

### Hold savings (mean total, positive = faster)

| Fitted at | Feeders | Strong vs Standard | Strong vs Quick | Quick vs Standard |
| --- | ---: | ---: | ---: | ---: |
| `bay-mid` | 1 (solo) | +55.7 s (+556.8 ticks) | +13.5 s (+135.1 ticks) | +42.2 s (+421.6 ticks) |
| `bay-mid` | 2 (pair) | +55.8 s (+557.8 ticks) | +13.6 s (+136.1 ticks) | +42.2 s (+421.6 ticks) |
| `bay-reached` | 1 (solo) | +7.7 s (+76.5 ticks) | −17.9 s (−179.3 ticks) | +25.6 s (+255.8 ticks) |
| `bay-reached` | 2 (pair) | +7.7 s (+76.6 ticks) | −17.9 s (−179.1 ticks) | +25.6 s (+255.8 ticks) |

At `bay-reached`, Strong only beats Standard at offset 0 (solo `1948` vs `2560`, rack 3 `309` vs `921`; pair `1946` vs `2559`). On all seven other offsets (`75`–`525`), Strong matches Standard identically.

## 2. Step 3 hold tests (`test/railway-leg3-hold.test.ts`)

Command:

```sh
UNIT_ONLY=test/railway-leg3-hold.test.ts node dev/test-unit.ts
```

Result: **PASS (2/2 tests, 0 failed)**.

- `Strong loads two bills, holds at Bell Rock and unloads at the next head`: PASS
  - `pressure departure at 21349, deadline 21959`
  - `head 1 racked 366 ticks after the lay; deadline 21959`
- `a train carrying one Canopy bill tops up at West landing when it adopts Strong`: PASS

## 3. Step 2 fuzz (`test/railway-leg2-rules.test.ts`, `ROUTE_GATES=1`)

Command:

```sh
ROUTE_GATES=1 UNIT_ONLY=test/railway-leg2-rules.test.ts node dev/test-unit.ts
```

Result: **PASS (16/16 tests, 0 failed)** across the four ruled seeds (`c0ffee`, `777`, `5eed`, `badd`), 20,000 ticks per mode at 75% headway.

**Extra seeds note:** `test/railway-leg2-rules.test.ts` hardcodes `SEED_LIST = [0xc0ffee, 0x777, 0x5eed, 0xbadd]` and does not accept `FUZZ_SEEDS` or any seed option (consistent with `test/helpers/fuzz.ts`: *"Their seeds are the four ruled ones in every mode (`FUZZ_SEEDS` does not replace them)"*). No 24-seed sweep was run because the test takes no seed option and code was not modified.

### Service health worst waits (ticks, `settled / growing`)

| Suite | Seed | `ns` worst | `bay` worst | `held` ticks |
| --- | --- | ---: | ---: | ---: |
| Leg 2 standard | `c0ffee` | 741 / 839 | 856 / 1083 | 0 / 0 |
| Leg 2 standard | `777` | 743 / 1199 | 901 / 1250 | 0 / 0 |
| Leg 2 standard | `5eed` | 788 / 1201 | 759 / 1039 | 0 / 0 |
| Leg 2 standard | `badd` | 734 / 743 | 770 / 1467 | 0 / 0 |
| Leg 2 mixed | `c0ffee` | 741 / 839 | 791 / 1344 | 1277 / 1469 |
| Leg 2 mixed | `777` | 742 / 1199 | 901 / 1279 | 2470 / 2049 |
| Leg 2 mixed | `5eed` | 788 / 1201 | 806 / 1069 | 2092 / 1474 |
| Leg 2 mixed | `badd` | 734 / 743 | 1058 / 1468 | 1836 / 1487 |
| Canopy standard | `c0ffee` | 742 / 742 | 1675 / 1324 | 0 / 0 |
| Canopy standard | `777` | 702 / 748 | 1410 / 1439 | 0 / 0 |
| Canopy standard | `5eed` | 737 / 738 | 1415 / 1486 | 0 / 0 |
| Canopy standard | `badd` | 717 / 760 | 1248 / 1484 | 0 / 0 |
| Canopy mixed | `c0ffee` | 750 / 769 | 1632 / 1579 | 0 / 0 |
| Canopy mixed | `777` | 844 / 717 | 1431 / 1249 | 0 / 0 |
| Canopy mixed | `5eed` | 759 / 737 | 1206 / 1277 | 0 / 266 |
| Canopy mixed | `badd` | 763 / 760 | 1269 / 1278 | 0 / 0 |

### Mixed bay riders: early departures vs second full rack

- `c0ffee`: `releases 1, second bill 2148 vs 2148 ticks, extra 0`
- `777`: `releases 1, second bill 2052 vs 2052 ticks, extra 0`
- `5eed`: `releases 1, second bill 2045 vs 2045 ticks, extra 0`
- `badd`: `releases 1, second bill 2089 vs 2089 ticks, extra 0`

## 4. Loop run (`npm run loop -- run`)

Command:

```sh
npm run loop -- run
```

Result: **PASS (exit 0)**.

- All 41 order probes at 1 player refused by the real rules as expected.
- Played areas 1–5 (canonical order, straight-line / calibrated):
  - 1 player: `1:03:07` / `1:09:22`
  - 2 players: `1:01:32` / `1:05:23`
  - 3 players: `1:00:56` / `1:04:53`
  - 4 players: `59:42` / `1:04:53`
- Whole route (areas 1–5 played, areas 6–9 stand-ins including Canopy Town until step 7): `2:54` (1p), `2:46` (2p), `2:44` (3p), `2:45` (4p) — 48% / 46% / 46% / 46% of the 360-minute target.

## 5. Network suite (`npm run test:net`)

Command:

```sh
npm run test:net
```

Result: **PASS (`268/268 checks passed`, exit 0)** on room namespace `v66` (after installing missing worktree dependencies with `npm ci --no-audit --no-fund`).
