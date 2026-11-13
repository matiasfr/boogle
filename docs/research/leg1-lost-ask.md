# Leg 1: the lay ask can expire before boarding

13 November 2026, `codex/leg1-lost-ask`, on six-hold/world v34. **Reproduced in the sim; no production code changed.**
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

| Lay | Automatic n | min / median / p95 / max served | No window >3600 | All >1200 | Arrival-call median / max | Arrival-call no window |
| --- | ---: | --- | ---: | ---: | --- | ---: |
| 1, Ring | 80 | 0 / 364 / 1730 / 1961 | 0 | 14 | 290 / 1961 | 0 |
| 2, head 1 | 80 | 0 / 236 / 484 / 534 | 23 | 23 | 225 / 534 | 1 |
| 3, head 2 | 160 | 0 / 45 / 342 / 436 | 95 | 95 | 182 / 980 | 7 |
| 4, head 3 | 160 | 0 / 301 / 471 / 488 | 58 | 58 | 311 / 997 | 2 |

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

| After lay | Bot page seconds, including ride/walk | Sim ticks / nominal seconds | First sampled outward stand |
| --- | ---: | --- | --- |
| 1 | 507.4 | 821 / 82.1 s | by +486 ticks |
| 2 | 326.9 | 543 / 54.3 s | by +193 ticks |
| 3 | 157.3 | 333 / 33.3 s | between samples; departure at +17 ticks |
| 4 | 380.9 | 631 / 63.1 s | by +293 ticks |

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
