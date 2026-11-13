# Leg 1: the lay ask can expire before boarding

13 November 2026, `codex/leg1-lost-ask`. The original diagnosis below is the **v34 baseline**, committed at
`7c28778a`. The [v35 bounded correction](#v35-bounded-correction) below supersedes the unrestricted-repeat
candidate at `77bb44f3`. The owner ruled that the existing anti-spam assertions win unchanged.
**The original failure was reproduced in the sim; the corrected rule is committed for independent review.**
The failure is a consumed one-shot request, not an ask left permanently assigned to a held train.

## Deterministic failure

Replay `gorge-mid`, feed section 3 using the existing rack-take/frame-stock ops, then arrive at head 2 ten ticks
after the lay. At tick **13748**, train slot **4** stands at halt **7**, outward, with `depart=13705` and only **7**
of its 50 dwell ticks left. At **13755** it leaves and clears the lay's ask. At **13758** the rider arrives;
no outward boarding opportunity occurs in the following 1,201 ticks. The longer probe also found none in 3,600.
A new outward `rail.call` after that departure restores service with the same fleet.

- `src/sim/railway-sys-route.ts:84`: the lay redirects a standing stub-end train outward without restarting dwell.
- `src/sim/railway-sys-route.ts:89`: it adds an outward **line** ask at the old head, using the **new** stop count.
- `src/sim/railway-trains.ts:530`: departure still judges the old dwell; `:555` clears the line ask when leaving.
- `test/railway-route-rules.test.ts:1227`: the existing call-88 watch assumes a rider is already aboard a train
  standing at the lay. It cannot detect this arrival race.

The desired-behaviour regression remains an explicitly failing **TODO**, because this task prohibits a sim fix.
`LEG_ASK_RED=1` removes TODO and exits 1: two mechanism/index checks pass and the boarding assertion fails.

## Bounded sweep

The existing route-rules test now has an opt-in fuzz: 16 Mulberry32 schedules (0–15), both `gorge-open` and
`gorge-mid`, every remaining section, random pre-feed offsets up to 1,199 ticks, ordinary take/feed ops with gaps,
and quiet/every-other-seed 5% background asks while building. After each lay the timeline branches for arrivals at
0, 10, 50, 150 and 600 ticks, with either the automatic ask alone or one arrival-time outward call. No further lay
or background call rescues that observer. Defaults: six-train fleet, 75% headway, Ring hold 200/15.

**960 cases**, 480 per policy. Every case runs at most delay + 3,600 ticks. A boarding opportunity means ten
consecutive tick observations standing at the old halt on the outward track. This is a one-second sim proxy;
passenger-car jumping, collision and physical boarding are unverified. A single standing frame is insufficient.

Waits below are **from rider arrival**, in ticks (divide by ten for nominal seconds). Quantiles include served
cases only; `>3600` is censored, never counted as a successful 3,600-tick wait.

| Lay       | Automatic n | min / median / p95 / max served | No window >3600 | All >1200 | Arrival-call median / max | Arrival-call no window |
| --------- | ----------: | ------------------------------- | --------------: | --------: | ------------------------- | ---------------------: |
| 1, Ring   |          80 | 0 / 364 / 1730 / 1961           |               0 |        14 | 290 / 1961                |                      0 |
| 2, head 1 |          80 | 0 / 236 / 484 / 534             |              23 |        23 | 225 / 534                 |                      1 |
| 3, head 2 |         160 | 0 / 45 / 342 / 436              |              95 |        95 | 182 / 980                 |                      7 |
| 4, head 3 |         160 | 0 / 301 / 471 / 488             |              58 |        58 | 311 / 997                 |                      2 |

Automatic misses by arrival delay: **14, 17, 28, 37, 80** respectively; **176/480** overall. The ten arrival-call
misses occur with the ask still pending and too little dwell left: `railway-sys-trains.ts:96` returns before its
`wait` helper on a duplicate. Calling is not a guaranteed dwell refresh. All 96 arrival calls at delay 600 serve,
worst 997 ticks. The 1,961-tick Ring case likewise misses a short initial stand and eventually boards a later one.

All **201** cases over 1,200 ticks (190 automatic, 11 arrival-call) have full transition traces in
`.look/lost-ask/over-1200.jsonl`, indexed by stage/seed/section/delay/policy. They include request presence and
assignment, every train's phase, halt, destination, track, centimetres, departure, request, turn, cargo and
errand/control exemption. `.look/lost-ask/cases.json` lists all 960 waits; `manifest.json` records provenance.
All censored traces end with the ask **absent**. No persistent-assignment starvation was found in this sample.

The hypotheses resolve as follows: departures consume the ask before arrival or before a usable boarding window;
no re-raise follows. Halt indices stay fixed and the lay asks using the grown count, so the request does not move.
`railway-train.ts:327` deliberately maps both queried directions at an open end to its one outgoing digit; after
growth the old head has distinct direction digits. `trainServes` assigns by braking-distance/circuit order;
`controlFree` exempts the assigned train, and errands also exempt control holds. Neither explains the reduced
case: slot 4 is already at head 2, carrying kit, and departs after seven ticks.

## Bot, player recovery and spacing gates

Read the original `legs2/report.txt`, `verdict.json`, `bot.log` and session events in
`/Users/matiasfranco/Developer/boogle/.claude/worktrees/agent-a52980de4ef5f72b2/.look/playthrough/`.
Opened `legs2/end-still.png`: the rider is on the grey platform beside a lever, with no train alongside and
“section 3 laid” the last checkpoint. This supports the location, not proof of which train consumed the ask.
The report's **49 minutes** is total still time across six stalls; section 3's checkpoint to run end is about
**34.6 page-clock minutes**. No section-3 world snapshot or request trace survives there, so exact historical
causation remains unproven. The current seed reproduces the mechanism independently.

The as-built note's **157–554 seconds** is not a clean platform-wait distribution. In `legs4/bot.log`, 553.9 s is
**feeding/waiting for section 4 to lay**. The actual lay-to-next-frame/Gorge checkpoint intervals are:

| After lay | Bot page seconds, including ride/walk | Sim ticks / nominal seconds | First sampled outward stand             |
| --------- | ------------------------------------: | --------------------------- | --------------------------------------- |
| 1         |                                 507.4 | 821 / 82.1 s                | by +486 ticks                           |
| 2         |                                 326.9 | 543 / 54.3 s                | by +193 ticks                           |
| 3         |                                 157.3 | 333 / 33.3 s                | between samples; departure at +17 ticks |
| 4         |                                 380.9 | 631 / 63.1 s                | by +293 ticks                           |

Page-clock and sim-clock rates differ roughly sixfold in these warped logs; do not compare page seconds directly
with tick gates. These four completed journeys fit call 88's 1,158 ticks. The sweep's missed opportunities expose
a gap in that ready-at-lay gate, rather than proving the spacing algorithm's ask-to-first-stand bound failed.
The as-built six-hold gates are 1,350 light/1,500 heavy settled, 1,600 growing, and 200 past dwell at Ring; none
promises another outward stop after a request has been consumed. Some **player** waits exceed all these bounds.

`halts-view.ts:563` offers only homeward levers at heads 1 and 2; head 3 **does gain an outward lever after the
Gorge opens**. `railway-legs.ts:164` passes `asked: true` at the heads, and `railway-ride.ts:73` consequently skips
the platform call. Its aboard prompt is available only after boarding; it cannot rescue this wait. The normal
prompt path uses `adapter.callTrain` (`railway-intents.ts:252`) and the server validates platform/aboard reach
(`railway-server.ts:217`); no new live delivery test was run. At head 2 there is simply no outbound prompt to send.
A player can call homeward and ride the circuit back to the current end, or traverse the built railway on foot;
waiting for an outward stop at head 2 has no promised bound. Those recovery journeys were not timed here.

## Smallest proposed correction, not implemented

Restart `depart` at the lay tick for the stub-end train redirected outward; retain `arrived` so existing hold caps
are not moved. This restores a full 50-tick boarding dwell and addresses the one-second regression. It does
**not** solve arbitrary late arrival. The designer also needs a repeatable outward request at each still-open old
head, using the existing head-3 lever pattern and `rail.call`; no new persistent sim request state is necessary.
Do not increase the fleet or loosen spacing gates to conceal a consumed request.

## Reproduce and checks

```sh
UNIT_ONLY=test/railway-route-rules.test.ts LEG_ASK_RED=1 timeout 120 node dev/test-unit.ts --test-name-pattern='lost ask:|lost ask mechanism|open end shares'
UNIT_ONLY=test/railway-route-rules.test.ts LEG_ASK_FUZZ=1 timeout 900 node dev/test-unit.ts --test-name-pattern='lost ask fuzz'
UNIT_ONLY=test/railway-route-rules.test.ts timeout 300 npm run check
```

`dev/test-unit.ts` now honors explicit `UNIT_ONLY` in local mode too; previously only `--ship` selected files,
which would make the requested `npm run check` run the whole suite. No existing assertion was weakened.
The fuzz is opt-in, not added to every check. **Final validation:** scoped `npm run check` exits 0: 43 tests pass,
one known-defect TODO fails as expected; lint, typecheck, registry, level, assets and build pass. Red mode exits 1
with exactly the intended failure (two other checks pass). The final-tree fuzz exits 0, 33 tests and all 960 cases,
with the same distribution as the first sweep. Artifact hashes and commands are in the worker-authored headless
evidence manifest; there is no broker/browser manifest for these Node runs.
No new browser/broker run, push, ship, stash, WORLD_NS change or ROM input. The initial required `npm run inflight`
was invoked before noticing that it can query GitHub; no further network command was used.

## V35 bounded correction

Policy retained on this branch: **at most one dwell extension per stand**, not unrestricted repeat refresh and not
the drop-refresh fallback. Nothing has been pushed, shipped or rebased. The owner explicitly ruled on the conflict
found at `77bb44f3`; the original two anti-spam assertions at `test/railway-r3b1-review.test.ts:38` and `:46` are
unchanged and now pass. The earlier candidate's two failures remain in its archived logs, not the current results.

- `src/sim/railway-sys-trains.ts:90`: `depart === arrived` admits only an unextended stand. The first eligible call
  writes `depart=tick`; later calls cannot move it again. A request may predate arrival, so a pending digit does not
  itself prove that the standing train already received its boarding extension. The guard is on the shared wait
  helper, before either platform or aboard calls can change dwell. It uses no new saved field, op or per-player state.
- `src/sim/railway-sys-route.ts:85`: the lay still gives a redirected train its full 50 ticks, retaining `arrived`.
  That departure clock already differs from arrival, so a later platform call cannot re-extend that same stand.
  The regression checks all 49 standing ticks, refuses a repeat on tick 49, and departs exactly on tick 50.
- `railway-trains.ts:513`: the next real arrival resets `depart` and `arrived` together. Save/load preserves both,
  so it does not replenish the allowance. Signal stands cannot match a platform call. Neither end headway timestamps
  nor the end/Ring hold caps are changed. The original late-call assertion still permits the existing one asker's
  dwell across an end hold deadline: 649 + 50 = 699; it does not permit a second extension. The cap is not restarted.
- The added save/stand test starts with a request pending before arrival, permits one extension, restores the world,
  then spams until departure without prolonging the original hold. A second real stand gets its own allowance.
  The real Ring host test permits the first call, refuses a second near the cap, and leaves on the original cap.
- `src/entities/railway/halts-view.ts:583`: the previous correction still offers an outward lever at every still-open
  old head after the next section opens, including heads 1 and 2. `dev/look/bots/railway-ride.ts:73` and
  `railway-legs.ts:158` use it when no outward train stands, and recover a consumed ask during the walk.
- `test/railway-jump.test.ts:37`: pin all **24 menu rows** literally, in order, plus the 23 offered seed stages.
  The expectation is not derived from the seed catalog. Adding a buildable seed cannot silently add a menu item;
  `gorge-mid` remains unoffered. No menu source or wording changed.
- `src/world/namespace.ts:77`: retain the unshipped **v35** boundary, revising its dated history to describe the
  bounded rule. No extra bump or migration. The v35 golden (only the two Gorge stages changed from v34) still passes;
  **no pinned fixture moved or was regenerated in this follow-up**.

No new prompt literal was introduced. **Suspect placeholder lines for the owner:** the existing outward-lever
wording now offered at heads 1 and 2, “Request stop: to Stack railhead” (`halts-view.ts:654`, `:808`). The homeward prompts are unchanged.

### Final 960-case table beside the baseline

Same stages (`gorge-open`, `gorge-mid`), 16 schedules, every remaining lay, delays 0/10/50/150/600, two policies,
3,600-tick observation limit and ten-tick boarding window. Quantiles include served cases only; minima are zero.
Waits are ticks from rider arrival, not warped browser seconds. `miss` means no window by 3,600; `>1200` includes misses.

| Lay / n per policy | v34 auto median / p95 / max; miss; >1200 | Bounded v35 auto median / p95 / max; miss; >1200 | v34 one-call median / p95 / max; miss | Bounded v35 one-call median / p95 / max; miss |
| ------------------ | ---------------------------------------- | ------------------------------------------------ | ------------------------------------- | --------------------------------------------- |
| 1 / 80             | 364 / 1730 / 1961; 0; 14                 | 364 / 1575 / 2007; 0; 14                         | 290 / 945 / 1961; 0                   | 280 / 845 / 995; 0                            |
| 2 / 80             | 236 / 484 / 534; 23; 23                  | 264 / 484 / 534; 20; 20                          | 225 / 407 / 534; 1                    | 232 / 414 / 534; 0                            |
| 3 / 160            | 45 / 342 / 436; 95; 95                   | 22 / 326 / 436; 76; 76                           | 182 / 476 / 980; 7                    | 118 / 426 / 619; 0                            |
| 4 / 160            | 301 / 471 / 488; 58; 58                  | 294 / 660 / 1001; 45; 45                         | 311 / 638 / 997; 2                    | 334 / 851 / 1024; 0                           |

The arrival-call assertion is retained: **480/480 boardable; zero misses; worst 1024 <1600** (102.4 nominal seconds).
Automatic-only misses are **141/480**: the lever is still needed for late arrivals. All **155** cases over 1,200 are
in the automatic-only policy and retain full transition traces. No assertion, observation window or spacing limit
was weakened. The original bot timing analysis above remains historical; there is no new browser pacing measurement.

### Final route gates and checks

The final audited run passes **77/77**, no TODOs, in 388.3 s. Its 960-case distribution is identical to the quick
sweep above. Exact command (timeout bounds the entire process):

```sh
RAIL_AUDIT=1 FUZZ_STRIDE=1 ROUTE_GATES=1 LEG_ASK_FUZZ=1 UNIT_ONLY=test/railway-route-rules.test.ts timeout 1800 node dev/test-unit.ts --test-timeout=1200000
```

Gate 8 fixed-stage / gate 9 settled worst waits, with means in parentheses. Limits remain **1350 fixed / 1400
four-seed settled / 1600 growing**; the final column is settled waits over 1050. No gate was loosened.

| Seed   | 0 laid    | 1         | 2         | 3          | 4          | Settled    | Settled >1050 |
| ------ | --------- | --------- | --------- | ---------- | ---------- | ---------- | ------------- |
| c0ffee | 734 (329) | 607 (234) | 982 (343) | 887 (320)  | 1062 (405) | 1160 (443) | 6/303         |
| 777    | 749 (320) | 596 (227) | 868 (282) | 839 (321)  | 877 (390)  | 1319 (459) | 18/298        |
| 5eed   | 697 (351) | 662 (198) | 875 (263) | 1034 (373) | 974 (392)  | 1157 (426) | 5/312         |
| badd   | 726 (352) | 623 (225) | 812 (306) | 766 (360)  | 982 (406)  | 1138 (419) | 4/324         |

Growing fuzz: six 20,000-tick schedules; worst **1431**, longest stand **590**. Gate 10's ≤1.2× non-stop lap, gate 5's
stone delivery, and gate 12's three joining trains within 1050 all pass. Gate 14: rivet to Gorge **3618 ≤3700**;
frame idle **1129/559/363/363**, below **1200/600/600/600**. Call 88 old-to-new-head journey **559/363/363/368 ≤1158**;
its four fuzz journeys peak at **1076**. Gate 15: steel kit **+651**; first steel home/install **+1823 idle / +2396 fed**,
versus build-2 **+1824**, fed penalty **572 ≤1050**. The 48-seed light/heavy checkpoint sheet was not rerun.

Final checks after the last runtime/test edit:

| Check                                                            | Result                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run check`, scoped `UNIT_ONLY`                              | exit 0: 160/160, no TODOs; lint, typecheck, registry, level, assets and build pass                     |
| `timeout 600 node dev/ship-check.ts 7c28778a`                    | exit 0: 1065 pass, 0 fail, one unchanged all-longer-fleet TODO; 91 affected files                      |
| Six-train fleet/join, train/hold units, original anti-spam tests | pass in route gates and scoped check; both original anti-spam test bodies byte-identical to `7c28778a` |
| Real hold-host tests                                             | 4/4: late join, restart, bounded repeat, assigned-ask release                                          |
| Pinned golden shard 8 and menu checks                            | pass; no golden regeneration or new fixture edits                                                      |
| `npm run registry`                                               | pass; 22 presence keys, 16 message types, 16 ops, 9 states                                             |
| `npm run loop -- run`                                            | pass; headless model, later areas still flagged stand-ins                                              |

The scoped check used `UNIT_ONLY='test/railway-route-rules.test.ts test/railway-trains.test.ts
test/railway-r3b1-review.test.ts test/railway-cart.test.ts test/railway-jump.test.ts test/railway-golden-8.test.ts'`
and `timeout 600 npm run check`. Hold-host used
`timeout 240 node --import ./test/helpers/rail-no-audit.ts --test --test-timeout=120000 --test-name-pattern='hold host' server/test/railway-steel-host.test.ts`.
The ship-check base scopes this job rather than inherited pre-rebase work; its output includes the unchanged
`test/railway-install.test.ts:434` all-longer TODO, not a new skip or a passing assertion. Prettier ran on changed files.
No whole-suite run. Logs, all 155 >1200 traces, distributions and source hashes are indexed in the
[worker-authored headless manifest](../../.look/lost-ask-bounded/manifest.json), which is not a broker manifest.

Implementation commit: `2e6e4a8189be3310fd34eabde64e548a6a0f58a2`; report committed separately.

`review stamp f0ee8b15ec47 (41 files since origin/main).`

Generated with `timeout 120 npm run review-stamp -- /Users/matiasfranco/Developer/boogle-codex/leg1-lost-ask --no-fetch`.
This includes inherited pre-rebase work, as intended. It is a fingerprint for the independent review, not a claim
that review has happened. No fetch, push, ship, rebase, stash, new op, saved field or ROM input.

### Browser work owed

Per the owner's latest instruction, **no browser retry or new PNG**. The lever-placement look at still-open head 1
and the `ring-joined` → `gorge` bot playthrough are owed, including real boarding and prompt/server delivery. The
[previous broker capture](../../.look/evidence/1794562452463-67714/evidence.json) failed before rendering with
`--clock-url requires two-player warp`; it provides no visual verdict. Only the historical v34 `legs2/end-still.png`
was inspected earlier (rider at a platform, no adjacent train). No current lever placement, visual quality, bot
success, live repeat-call delivery or real-time feel is claimed. Independent review remains required before shipping.
