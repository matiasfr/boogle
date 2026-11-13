# Leg 1: the lay ask can expire before boarding

13 November 2026, `codex/leg1-lost-ask`. The original diagnosis below is the **v34 baseline**, committed at
`7c28778a`. The [v35 correction candidate](#v35-correction-candidate) follows it; its unresolved anti-spam conflict
prevents a clean check. **The original failure was reproduced in the sim.**
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

## V35 correction candidate

The orchestrator accepted the correction on 13 November. This branch implements it for independent review;
**not pushed, shipped or rebased**. The original diagnosis above is retained as historical evidence, not a claim
that the current tree still has a TODO or lacks an outward lever.

- `src/sim/railway-sys-route.ts:85`: redirecting a standing stub train sets `depart` to the lay tick, retaining
  `arrived`. The reduced head-2 case now has an immediate boarding window at arrival +10; the TODO is removed.
- `src/sim/railway-sys-trains.ts:99`: the platform branch refreshes matching standing trains before testing the
  pending request digit, and returns accepted when the dwell actually changes. No new request digit, op or saved
  field. Aboard duplicates, same-tick duplicates and duplicates while no matching train stands remain no-ops.
- `src/entities/railway/halts-view.ts:583`: each still-open stub head gets the existing outward lever after the
  next section opens. Heads 1 and 2 now match head 3. No new literal copy; **suspect placeholder for the owner:**
  the newly offered use of “Request stop: to Stack railhead” at heads 1 and 2.
- `dev/look/bots/railway-legs.ts:158`, `dev/look/bots/railway-ride.ts:73`: use the real lever if no outward train
  stands, and re-request if the signal is consumed during the walk to the platform edge. The bot no longer assumes
  that the lay's ask is still pending. This is implemented, not yet proven by a browser playthrough.
- `src/world/namespace.ts:77`: v35, dated history, no shape change or migration. The cart-save namespace test
  now expects v35. `test/helpers/rail-rows.ts:95` mirrors the production repeat-call rule, exposing its conflict below.

The lay regression verifies a full 49 standing ticks, a pending-call refresh, another 49 standing ticks and departure
on tick 50, while `arrived` never changes. The former stub is now a middle halt, with no Ring control flag, so neither
end hold nor Ring control hold applies to the redirected train. Separate finite-call end and real-host Ring tests
verify that a late repeated ask receives its full dwell across the original hold deadline and then leaves with no
additional hold. The existing rule gives dwell priority over the hold deadline; keeping `arrived` does not truncate
an asker's 50 ticks.

### Repeat-call conflict still open

**Two existing anti-spam tests fail, without weakened assertions or new skips.** In
`test/railway-r3b1-review.test.ts:38` and `:46`, repeated platform calls were formerly accepted only once while the
request digit remained set. Moving refresh ahead of the duplicate check means an ask every tick continuously moves
`depart`; both probes remain standing for 50,000 ticks. `arrived` and the hold cap stay fixed, but the dwell check
runs before the hold and is never satisfied. A finite repeated call works; continuous repeats can stall the fleet.

A clarification is pending: preserve the bounded anti-spam rule with a limit on repeated refreshes, or explicitly
allow every repeat a fresh 50 ticks. The former needs a concrete acceptance/window rule; an unlimited full dwell
for every repeat and a finite departure bound cannot both hold. No extra request state, tunable or exception was
invented to conceal this conflict. The literal repeat-refresh candidate is committed for review, **not ready to ship**.

### The same 960 cases, before and after

Same stages, 16 seeds, lay schedule, five arrival delays, two policies and 3,600-tick observation limit as the baseline.
The opt-in assertion now requires all 480 arrival-call cases to have a ten-tick boarding window and wait **<1,600**.
Both the audited and faster sweep produce this identical table. Times are ticks from rider arrival; quantiles exclude
censored cases. Every minimum is zero. `miss` means no window by 3,600; `>1200` includes misses.

| Lay / n per policy | v34 auto median / p95 / max; miss; >1200 | v35 auto median / p95 / max; miss; >1200 | v34 one-call median / p95 / max; miss | v35 one-call median / p95 / max; miss |
| ------------------ | ---------------------------------------- | ---------------------------------------- | ------------------------------------- | ------------------------------------- |
| 1 / 80             | 364 / 1730 / 1961; 0; 14                 | 365 / 1678 / 2007; 0; 14                 | 290 / 945 / 1961; 0                   | 280 / 845 / 995; 0                    |
| 2 / 80             | 236 / 484 / 534; 23; 23                  | 271 / 493 / 543; 20; 20                  | 225 / 407 / 534; 1                    | 232 / 414 / 543; 0                    |
| 3 / 160            | 45 / 342 / 436; 95; 95                   | 29 / 326 / 436; 76; 76                   | 182 / 476 / 980; 7                    | 118 / 426 / 619; 0                    |
| 4 / 160            | 301 / 471 / 488; 58; 58                  | 315 / 679 / 1001; 43; 43                 | 311 / 638 / 997; 2                    | 346 / 851 / 1001; 0                   |

One-call misses fall **10 → 0**, maximum served wait **1961 → 1001** (100.1 nominal seconds). Automatic misses fall
**176 → 139**; one-shot asks still do not cover arbitrarily late arrival. This is why the repeatable outward lever
matters. All **153** v35 cases over 1,200 are automatic-only and have transition traces in
`.look/lost-ask-v35/over-1200.jsonl`; all 960 cases and distributions are beside it. The baseline's historical bot
seconds above are unchanged; no new browser pacing claim is inferred from these headless results.

### Route gates, unchanged limits

`RAIL_AUDIT=1 FUZZ_STRIDE=1 ROUTE_GATES=1 LEG_ASK_FUZZ=1 UNIT_ONLY=test/railway-route-rules.test.ts timeout 1200 node dev/test-unit.ts --test-timeout=600000`
passed **77/77**, no TODOs, in 452.5 seconds. Gate 8 fixed stages / gate 9 settled worst waits are below;
parentheses give mean, and the last column is settled waits over 1,050. The gate limits remain 1,350 fixed,
1,400 four-seed settled, 1,600 growing. The 48-seed light/heavy checkpoint sheet was not rerun.

| Seed   | 0 laid    | 1         | 2         | 3          | 4          | Settled    | Settled >1050 |
| ------ | --------- | --------- | --------- | ---------- | ---------- | ---------- | ------------- |
| c0ffee | 796 (248) | 607 (234) | 982 (343) | 887 (320)  | 1062 (405) | 1160 (435) | 6/307         |
| 777    | 735 (335) | 596 (218) | 868 (271) | 839 (322)  | 914 (384)  | 1319 (455) | 19/302        |
| 5eed   | 725 (329) | 544 (198) | 875 (263) | 1034 (352) | 974 (392)  | 1157 (418) | 5/322         |
| badd   | 741 (355) | 623 (225) | 812 (304) | 766 (360)  | 982 (399)  | 1247 (432) | 6/325         |

- Growing fuzz worst **1379**, longest stand **628**, six 20,000-tick schedules, all within unchanged limits.
- Gate 10: each quiet stage's lap ≤1.2× non-stop, pass. Gates 5 (stone) and 12 (fleet joins ≤1050), pass.
- Gate 14: rivet to Gorge **3618 ≤3700**; frame idle **1129/559/363/363**, below **1200/600/600/600**.
- Call 88: old-head to new-head journey **559/363/363/368 ≤1158**.
- Gate 15: steel kit in yard **+651**; first steel home/install **+1823 idle / +2396 fed** versus **+1824** build-2
  baseline, fed penalty 572 ≤1050. These are sim ticks, not warped browser seconds.

### Fixtures, final checks and browser evidence

Only `test/fixtures/railway-golden.json` moved: namespace v35 plus `gorge-mid` and `gorge-reached` stage/after hashes.
`gorge-mid` stays at tick 13085; `gorge-reached` moves **15269 →15313**. Regenerated with that fixture helper's
`GOLDEN=1` command scoped to shard 8:
`GOLDEN=1 UNIT_ONLY=test/railway-golden-8.test.ts timeout 180 node dev/test-unit.ts --test-concurrency=1`.
The prior pinned-fixture check found only those two changed stages; schema, M12, ops and tick-order pins did not move.
Formatting then normalized the JSON; regeneration was not used to hide any rule failure.

The requested visual question was whether still-open head 1 shows separate homeward/outward levers after section 2.
The client timed out in the shared queue; the broker later completed with status 1 before rendering:
`--clock-url requires two-player warp`. The [broker manifest](../../.look/evidence/1794562452463-67714/evidence.json)
and output record this failure. **No new PNG was produced or opened.** The original legs2 still is historical v34
only. No updated bot playthrough, physical boarding, prompt reach/placement, live repeat-call delivery or visual
quality is claimed. No direct Chromium or broker bypass was used.

Final verification after the last code/test edit (all runs bounded by `timeout`):

- `npm run check` with `UNIT_ONLY` naming route-rules, trains, r3b1-review, cart and golden shard 8: lint and
  typecheck pass; the scoped unit run has **149 passes / 2 anti-spam failures / 0 TODOs** (151 tests). It stops there, so this final check
  does **not** establish a fresh level/assets/build pass.
- `timeout 600 node dev/ship-check.ts 7c28778a`: registry, changed-file lint and typecheck pass; affected-test closure
  has **1061 passes / 2 failures / 1 pre-existing TODO** (1064 tests), with the same two anti-spam failures.
  The unrelated all-longer installation TODO in `test/railway-install.test.ts:434` remains unchanged. The explicit base scopes the accepted follow-up, not inherited pre-rebase work.
- Four real-host hold tests pass: late join, save/restart, finite repeated-call dwell and assigned-ask release.
  The finite end-platform repeat test also passes. The six-train fleet/join gates and all route-rules tests pass.
- `npm run registry` passes; `npm run loop -- run` passes the headless route model (future route areas remain
  explicitly modeled stand-ins; not browser traversal). The audited 960-case gates above match the final runtime
  sources; subsequent edits changed only documentation and test expectations/coverage.
- Prettier ran on every changed file, including the Markdown files with the repository's Markdown ignore overridden.
  No full suite, checkpoint 48-seed sheet, direct browser, push, ship, rebase, stash or ROM input.

Headless logs, distributions, every >1200 trace, source hashes and final check counts are indexed in the
[worker-authored manifest](../../.look/lost-ask-v35/manifest.json). It is explicitly not a broker manifest.
Implementation commit: `84414729e6a367976a339e3624c4bacbab8e6d1b`. The report is committed separately.

`review stamp be3cdffd536a (41 files since origin/main).`

Generated by `npm run review-stamp -- /Users/matiasfranco/Developer/boogle-codex/leg1-lost-ask --no-fetch` after the
implementation commit. It includes inherited pre-rebase work as intended; no rebase or network fetch was performed.
This is the fingerprint for an independent review, not a claim that one has occurred. Recompute after later edits.
