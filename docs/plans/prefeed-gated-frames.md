> **Status: planned (2026-11-26).** From the [plug-second-player brainstorm](../brainstorms/plug-second-player.md)
> (its three open questions taken on their recommendations), answering the owner's decision-desk item 8
> ([26 November](../decisions-process.md#d-2026-11-26-decision-desk-answers)). Docs only so far; nothing built.

# Pre-feed a gated greybox frame

## Goal

A player may feed a greybox frame while its barrier is still shut; the section starts laying on the tick the barrier
opens with the bill full. This applies to all six gated frames on the built route: the incline, Canopy, the sea-cave
plug, the deep span, the Notch and the causeway. It gives a second player a real job during a barrier approach (take
the rack's 20 logs and 20 rails into the frame while a friend fetches the key or walks to the barrier). It extends the
owner's Line 2 rule, ["fill a gated stretch before its switch"](../decisions-process.md#d-2026-11-08-fill-a-gated-stretch-before-its)
(8 November), to the greybox. It serves DESIGN **8. Enjoyable alone and together**: co-op gets a parallel job and solo
is unchanged. It also serves **7. Telegraph everything**, because a full frame waiting on a shut barrier points at the
barrier ([17 November](../decisions-rail.md#d-2026-11-17-finished-deposits-read)). It bends no principle.

**What the loop says (measured while planning, not on main).** The rules change and the loop policy in step 3 were
prototyped in this worktree and reverted. On origin/main `e3861d195`, `npm run loop -- run --order canonical
--no-probes` gave these results:

| Barrier, its gate node plus its gated section | 1 player | 2 players | 3 players |
| --- | ---: | ---: | ---: |
| Incline: idle s per player, before → after | 33.7 → 33.7 | 80.7 → 61.4 | 71.2 → 51.9 |
| Canopy | 33.7 → 33.7 | 132.3 → 33.7 | 136.0 → 33.4 |
| Sea-cave plug | 33.7 → 33.7 | 356.9 → 38.7 | 363.6 → 45.4 |
| Deep span | 307.7 → 307.7 | 144.6 → 33.6 | 148.0 → 33.2 |
| Notch | 29.7 → 29.7 | 293.4 → 31.6 | 295.4 → 29.8 |
| Causeway | 29.7 → 29.7 | 273.1 → 62.9 | 287.0 → 76.8 |
| Plug: elapsed s, gate node start to cave 1 laid | 389.8 → 389.8 | 692.8 → 374.6 | 692.8 → 374.6 |
| Whole route, simulated s | 7,230.0 → 7,230.0 | 7,684.1 → 6,596.0 | 7,659.1 → 6,570.4 |

Solo matched tick for tick at every node (0 of the nodes differ). Two and three players finish about 18 minutes sooner.
Co-op no longer runs slower than solo: before, the route took 7,684 s for two players against 7,230 s for one. No run
softlocked. The after column reflects the loop's seat policy, which is a model. See finding 1: in real play, any player can already open
the plug.

## Sources read

DESIGN.md (principles 7, 8, 11); docs/decisions.md routing; the rail topic's current rules
([finished deposits, 17 November](../decisions-rail.md#d-2026-11-17-finished-deposits-read); order choice and the
[25 November recommendations](../decisions-rail.md#d-2026-11-25-recommendations-taken-rail)); the process entries
[8 November](../decisions-process.md#d-2026-11-08-fill-a-gated-stretch-before-its) and
[26 November](../decisions-process.md#d-2026-11-26-decision-desk-answers); owner calls
[no bump waits](../agents/owner-calls.md#no-bump-hold), [greybox before detail](../agents/owner-calls.md#mechanisms-systems-greybox-details),
[shared progression](../agents/owner-calls.md#shared-wallet); docs/agents/lockstep.md, sync.md, room-safety.md ("Don't"),
mixed-builds.md; src/sim/AGENTS.md, src/world/AGENTS.md; src/world/README.md "Server replay and prediction";
[order-choice](order-choice.md) (step 5 and its checkpoint); docs/reports/wall-waits.md.
`npm run loop -- node` for `incline-gate`, `canopy-gate`, `plug-gate`, `cave-1`, `deep-gate`, `notch-gate`,
`causeway-gate`. `npm run inflight` showed one in-flight branch, which touches bot-queue files only and nothing here.
`codex/order-choice-bot` (order choice's step 5) has no commits yet. It will edit `dev/loop/graph.ts`, `dev/loop/run.ts` and
`dev/look/bots/railway-legs.ts`.

**Research:** [route-contract](../research/route-contract.md) section 1, "protect the work, permit the shortcut".
Delivered materials still count by any route; the work edge (the lay) keeps waiting for its mechanism (the barrier).
The plan follows it: feeding early skips nothing, and the barrier still gates the lay.
[progression-flow-layout](../research/progression-flow-layout.md)'s rule 2, "a gate keeps its meaning", holds the same way.
Nothing else relevant.

### What the brainstorm names, checked against origin/main

- `src/sim/railway-sys-route.ts` `legStock` (`:46`). It refuses while the section's barrier is shut at `:54`, and a full bill sets
  `m.start = tick` at `:66`. `gate` (`:164`) declares `reads: [Leg, Aperture], writes: [Route]` (`:166`). It opens
  only with the room holding its grant, the leg open and the gated section current (`legRow(...).laid === at.section`).
  This matches the brainstorm.
- `src/sim/railway-check-route.ts` `leg laying` (`:68`: laying exactly while the bill is full) and `leg gate` (`:74`:
  nothing fed while shut). This matches.
- `src/entities/route-greybox/leg-view.ts`: the feed target is skipped on a shut frame (`:1395`, `!shut`). The barrier
  prompts are `GATE_AT` for the incline (`:1435`) and the `gate()` helper for the other five (`:1463`). Each barrier stands on its
  frame (`barrier(f, …)`, `CANOPY_SITE`, `plugSite`, `deepSite`, `notch.frames[0]`, `causeway.frames[0]`), so the feed
  and barrier prompts share one spot. The bill's fourth line is `where` (`:1159`). This matches. The brainstorm did not say that the
  prompts share a spot, or that Canopy's blocked reason is always "No line beyond yet", even while the seeds are not
  held. Both are handled in step 2.
- `dev/loop/graph.ts`: six section edges read "legStock: refused while the frame's barrier is shut" (`:551`, `:602`,
  `:646`, `:671`, `:695`, `:728`). `dev/loop/run.ts`: `legSection` waits for `gateOpen()` (`:614`). `device()`
  returns at once for every seat but the first (`:387`), and `routePolicy` (`:678`) uses it for every barrier. This matches.
- Leg rule tests that assert the refusal: `test/railway-leg2-rules.test.ts:146` (incline),
  `test/railway-leg4-rules.test.ts:56` (plug), `test/railway-leg5-rules.test.ts:78` (deep span).
  `test/railway-leg6-rules.test.ts` presses its gates without feeding first and keeps its meaning. The brainstorm's
  `legKitNeed` and `legRackNeed` claim also holds. `legRackNeed` (`railway-queries-route.ts:254`) gates on
  `row.start >= 0`, never on the barrier, so a shut frame's kit is already owed, racked and taken as for an open one.
- The brainstorm's numbers: `plug-gate` 172.3 s per player idle at 2p and 229.7 s at 3p; `cave-1` 184.6 s and 133.9 s. These
  match the baseline run. The brainstorm puts `cave-1` at 152.8 s and 102.8 s, which are lower than these.
- `legRailheadHold`'s Kit 6 rule (`railway-sys-route-kit.ts:270`) reads the fifth Wall frame (`laid === 4`), which is not
  gated, so pre-feeding the sixth does not touch it.

## Design

### The rule

- **`rail.legStock` on a shut frame.** It is accepted as on an open frame: logs and rails up to what the section's bill
  lacks, refused only for the existing reasons (leg not open, already laying, nothing the bill lacks, hauling the
  boiler). A full bill starts the section laying only if its barrier is open or it has none. A full bill behind a shut
  barrier keeps `start = -1`.
- **`rail.gate` starts a waiting lay.** After setting the barrier's bit, if the gated section's row has
  `start < 0`, `logs === sec.logs` and `rails === sec.rails`, it sets `start = tick`. The lay clock (`legTick`) then lays it
  `LEG_TUNE.layTicks` later, exactly as a lay started by the last fed unit. A partly fed frame stays as it is, and its
  last fed unit starts it, as today.
- **The load check.** `leg laying` becomes "laying exactly while the bill is full **and** the section's barrier is open
  or absent". `leg gate` is deleted. With that, a laying section behind a shut barrier is caught by `leg laying`.
- Integers and ticks only; no new state, op, field, component, presence key or play-record mark.

### Sync kind and authority

**Server state, unchanged rows.** The `Leg` row (`logs`, `rails`, `start`) and the `Route` row (`gates`) stay
server-owned and replicated as now.

- **Pure logic and rules:** `src/sim/railway-sys-route.ts` (`legStock`, `gate`), with a new query `gateMayOpen(w, g)`
  in `src/sim/railway-queries-route.ts`. The query holds the barrier's existing open condition (grant held, leg open, its
  section current, not yet open). The `gate` system and the leg view both use it, so the prompt and the rule cannot
  disagree.
- **Command adapter and validation:** unchanged. `rail.legStock`'s reach is still judged at the current section's frame
  (`src/world/railway-server.ts:348`), and `rail.gate`'s at the barrier.
- **Checkpoint state:** none new. Every v74 save satisfies the relaxed `leg laying`, because no save can hold a fed shut frame.
- **Prediction:** `rail.legStock` stays predicted (`src/world/railway-predict.ts:80`). Its threshold (`Leg.start`) is
  already held back for the server (`:222`, `:271`), and on a shut frame it does not move anyway. `rail.gate` stays
  unpredicted: the lay start it now writes is the server's, arriving with the `Leg` row in the same replica as the
  `Route` bit. No predicted effect plays twice. The view's "LAYING THE SECTION" reads the replicated `start`.
- **Who ticks:** the server's rule tick (`legTick`), as now.
- **Replay and invariant tests:** listed in step 1.

No client lead, classic edit generator or client state registration is introduced. No new control: the existing
interact button, "Feed the frame" and the barrier prompts.

### What a player sees (the leg view, Local)

- **One prompt per spot.** At a shut frame, when your back holds something the bill lacks, the frame offers "Feed the
  frame", and the barrier's own prompt is withheld there. Otherwise the barrier's prompt stands as now: "Open the
  barrier", or greyed with its reason. This follows the 8 November words, "I should be able to fill resources and then
  pull the switch". Arriving with kit, you feed; with empty hands, you open. The prompt does not flip between the two co-located
  targets, and a bot or player arriving empty-handed sees today's prompts.
- **A full frame waiting on its barrier** (bill full, `start < 0`, barrier shut). It offers no Feed, which is the intake
  shut that the 17 November decision asks for. Its bill's fourth line reads `FULL: WAITING ON THE BARRIER`, a placeholder for the owner. The barrier's red panel
  stands on that frame, and its prompt names what it lacks. The objective line already names the barrier.
  That is the decided "a full frame waiting on a gate points at the gate", with no new HUD, sign, colour or sound.
- **Canopy's blocked reason.** When the room lacks the crystal seeds it reads "Needs the crystal seeds", as the deep
  span's already does, instead of "No line beyond yet". That fixes a pre-existing wrong pointer, which this plan would otherwise put in front of a full frame.
- **The lay kickoff.** When the barrier opens on a full frame, the panel lifts and the bill reads `LAYING THE
  SECTION` in the same replica. No new sound or motion: the greybox carries no effects or sound
  ([greybox before detail](../agents/owner-calls.md#mechanisms-systems-greybox-details)). The brainstorm's suggestion 3
  waits for the details phase.

### The loop (dev tooling)

- **The graph.** Each gated section's barrier edge becomes a `finish` edge whose source is the lay:
  "legTick: a full frame lays once its barrier opens". The canonical order is unchanged, because a finish edge still orders the canonical
  play. The order probes no longer try `rail.legStock` before the barrier: it is accepted now, and an unchanged start
  edge would report a false mismatch. This edit ships with the rule in step 1.
- **The policy.** In a barrier node (`incline-gate`, `canopy-gate`, `plug-gate`, `deep-gate`, `notch-gate`,
  `causeway-gate`), seat 1 walks and presses as now. Every other seat runs that barrier's gated section
  (`legSection` for `gateLeg(id)`): it walks to the rack and feeds the frame. `legSection` no longer waits for the barrier. Solo
  has no other seat, so its run is unchanged.

## Steps

Each step leaves `node dev/ship-check.ts` green. Models come from `npm run models` (26 November). Each step that touches `src/sim`,
`src/world` or `server/` gets an independent review before merge: a fresh gpt-6.2-astra medium delegate (the
"Independent review before merge" row). **Ordering:** order choice's step 5 (`codex/order-choice-bot`) edits
`dev/loop/graph.ts`, `dev/loop/run.ts` and `dev/look/bots/railway-legs.ts`. Step 1 edits six lines of `graph.ts` and
step 3 edits `run.ts`, so both are rebased onto order choice's step 5 and ship after it is on main. Steps 1 and 2 may be
built before that, on their own branch. Step 1 ships alone or with step 2, since step 1 changes nothing on screen.

- [ ] **1. The rule (S; "High-risk implementation (server, sync, src/world, src/net)": gpt-6.2-astra medium).**
      Files:
      - `src/sim/railway-queries-route.ts`: `gateMayOpen(w, g)` (the existing condition, moved out of `gate`) and a
        line in the header list.
      - `src/sim/railway-sys-route.ts`: `legStock` drops the shut-barrier refusal and starts the lay only with the
        barrier open or absent. `gate` declares `writes: [Route, Leg]` (Leg leaves `reads`), uses `gateMayOpen` and sets
        `start = tick` on a full waiting bill. Update the header table's `legStock` and `gate` lines and both doc comments.
      - `src/sim/railway-check-route.ts`: `leg laying` with the barrier; `leg gate` deleted; the header line.
      - `dev/loop/graph.ts`: the six section edges become `finish` edges with the lay as source.
      - Tests, as cases in existing files (no new unit test file).
        - `test/railway-leg2-rules.test.ts:137`: renamed. The incline takes kit while shut, the bill fills with `start === -1`
          and nothing lays after `layTicks`, and `rail.gate` with the pick starts it on that tick.
        - `test/railway-leg4-rules.test.ts:56`: the plug frame takes the carried logs while shut; the ledger holds.
        - `test/railway-leg5-rules.test.ts:78`: accepted while shut.
        - One new case in `test/helpers/railway-route-rules.ts` that walks all six `RAIL_GATES`. From the seed where each one's section is
          current and shut (`gorge-reached`, `bay-open`, `bay-reached`, the Wall's sixth frame reached from `cave-mid` as
          `test/railway-leg5-rules.test.ts` does, and leg 6's `legStagesOn` stages), it checks four things. First, a partly fed shut frame opened stays `start === -1` until its last unit.
          Second, a full shut frame opened has `start` equal to the gate's tick and is laid `layTicks` later. Third, the
          invariant holds throughout. Fourth, a hand-written `start >= 0` behind a shut barrier throws `leg laying`.
      - Every seed reaches its stage at the same tick, because the seeds open each barrier before feeding. If a golden or mirror
        fixture moves, find the changed input before re-pinning it (lockstep rule).

      Checks: the per-leg rule files, `test/railway-route-rules.test.ts`, the replay test, `test/loop-graph.test.ts`;
      `npm test` in `server/` and `npm run test:net`, because the branch touches a seed helper's rules (the 18 November
      workflow fix 3). Then `npm run loop -- run --players 1 --order canonical` with probes: no probe mismatch and solo
      identical to the baseline above. Proof: nothing on screen changes in this step (the view still hides Feed
      on a shut frame), so there is no still. The proof is the rule case and `npm run loop -- node cave-1`, which
      shows the plug edge as a finish edge.

- [ ] **2. The view (S; "Player-visible implementation": gpt-6.2-astra medium).** Files:
      - `src/entities/route-greybox/leg-view.ts`:
        - In `targets()`, a shut frame pushes Feed only when `fills`. The barrier helpers (the incline's at `:1435`, and
          `gate()`) skip a barrier whose frame pushed that Feed.
        - The bill's `where` line gets the waiting case.
        - Canopy's `gate()` call passes `r.grants & (1 << SEEDS) ? NO_LINE : 'Needs the crystal seeds'`.
        - The `targets()` doc comment and the file header's prompt line are updated.
        The view's barrier helpers call step 1's `gateMayOpen` (through the existing `railway-queries-route.ts`
        import) instead of repeating its condition.
      - `docs/game-design/place.md`: the greybox route's barrier paragraph says a frame takes kit while shut and lays when the barrier opens.

      Checks: the full ship check and the boot probe on the built site (rule 61). The prompts change, so
      rule 53 applies: run the bot from `bay-reached` (canonical) on this branch before it ships. It must pass the plug, and the
      Canopy, Notch and causeway barriers, each pressed empty-handed as the bot does today.

      Proof look (`.look/` stills, one sheet), from `bay-reached`, advanced until the cave rack holds 20 and 20, with the
      plug shut. An eval in `dev/look/evals/` takes and feeds both kinds through the adapter. It shows four things:
      - (a) on the apron, carrying logs, the prompt reads "Feed the frame", not "Open the barrier";
      - (b) the full frame: 20 logs and 20 rails stacked, the bill reading `FULL: WAITING ON THE BARRIER`, the red panel shut, and the
        prompt reading "Open the barrier";
      - (c) after the press, the panel up and the bill reading `LAYING THE SECTION`. The eval asserts `Leg.start` equals the
        accepted gate's tick;
      - (d) the Canopy frame in a room without the seeds, greyed "Needs the crystal seeds".

      Not tested on a device.

- [ ] **3. The loop and the bot (S; "Implementation from a brief or an approved plan": gpt-6.2-sol medium).** After
      order choice's step 5 is on main, rebased onto it.
      - `dev/loop/run.ts`: `legSection` stops waiting for `gateOpen()`. `routePolicy` gives every seat but the first the
        gated section's `legSection` (via `gateLeg`) in a barrier node. When the node ends, a partner's carried units are fed
        first in the section node: `carry()` reads the back before fetching. Check this with a 2p trace.
      - `dev/loop/graph.ts`: each gated section's cue gains "a full frame waiting reads FULL: WAITING ON THE BARRIER".
      - `dev/look/bots/railway-legs.ts`: no change expected; edit it only if step 2's bot run shows a barrier pressed
        with kit on the back.
      - `test/loop-graph.test.ts`: a 2-player `playOrder` case to `cave-1`. At the moment the plug opens, cave 1's frame already holds
        fed units. Seat 1's `plug-gate` ticks match the 1-player run's.

      Checks: `test/loop-graph.test.ts`; `npm run loop -- run` (canonical and cave-first, one to three players) shows
      no softlock and no probe mismatch. Proof: the loop's table for two players, against the baseline above.

### Checkpoint

On HOTBOX, once, after step 3:
- [ ] `npm run loop -- run --players N --order canonical --no-probes --json` for N = 1, 2, 3 on main before step 1 and
      after step 3. Paste here the six barriers' gate-plus-section idle per player and elapsed, as in the table above,
      and the whole route. Pass: solo every node's tick equal (not slower); two and three players lower at every barrier.
      Repeat with `--order cave-first`, which order choice's step 5 adds.
- [ ] The bot segments over the barriers from `bay-reached` and `canopy-reached` pass (timings under load are not
      evidence).
- [ ] `railwayLegRejoin` (`dev/peer-test/ws-railway.ts`) at a shut plug, with two tabs. One tab feeds 20 logs while shut, leaves, the
      server restarts and it rejoins. The frame's fed count, the rack and both backs are exact, and every tab's mirror matches.
      The other tab then opens the plug, and both tabs read the lay starting on one tick.
- [ ] Step 2's stills on one sheet. Not tested on a device.

## Level findings

The plan places, moves or reveals nothing: no new frame, rack, barrier or reach. A frame still accepts only while its
section is current (the reach check at `railway-server.ts:348` and `legOpen`), so nothing becomes reachable or workable
earlier than today. `npm run level-check` was not run, because it covers placement and there is none.

## Risks

- **Room safety ("Don't").** None applies: there is no effect in apply, no new presence, no new server file, and no wall clock. `rail.gate`
  writes `Leg` inside the same accepted apply. A queued `rail.gate` is not treated as done; the view shows the lay only
  from the replicated `start`.
- **The world bump: none needed.** No wire shape, op, field, component, catalog row, halt or saved column changes. The
  load check only relaxes, so every v74 save stays valid. Server checkpoints hold state, not command logs
  (src/world/README.md), so no refused pre-gate feed is ever replayed under the new rule. Mixed builds: dev phase, no
  compatibility code. Server and client ship together as usual. An old tab feeding a shut frame is not offered Feed, and a
  new tab on an old server sees its predicted feed refused and corrected. If the owner prefers a clean room anyway,
  [no bump waits](../agents/owner-calls.md#no-bump-hold) allows one, but nothing here needs it.
- **Hotspots.** `leg-view.ts` (1,558 lines) and `dev/loop/run.ts` (1,404) are shared with order choice's step 5; that
  is why steps 1 and 3 rebase onto it.
- **The bot.** It presses barrier prompts by id and waits up to 6 s for that id. If it arrives at a barrier carrying kit, it
  is offered Feed instead. Step 2's bot run catches that, and step 3 then fixes the beat's order.
- **Performance.** No meshes, lights or tick work are added: the gate system's extra read runs once per accepted press.

## Open questions

1. **Should the loop let any seat press a barrier or pickup, not only seat 1?** In play, the room's grants are shared, so
   anyone at the plug, the deep span or the Notch (once the cloth is held) can already open it. The loop's
   one-presser model is what makes those waits look long (finding 1).
   **Recommended: yes, as its own small loop-policy row after this plan.** The measured gains above are then partly
   available today. This plan's real-play gain is where the key is still out: the incline before the pick, Canopy before
   the seeds, the Notch before the cloth, and the causeway before the lantern.
2. **The waiting line's words**, `FULL: WAITING ON THE BARRIER`, and Canopy's "Needs the crystal seeds" are placeholders. They are agent words, not
   The Boogler's. **Recommended: keep them until the details phase**, and list them with Neon's placeholder drafts (decision desk item 12) if the owner wants options.

## Design review (2026-11-26)

Reviewed by the planner in the same context, after rereading this plan from the top. Inputs were DESIGN.md, the
owner calls, the rail and process decision entries cited above, the research index (route contract, progression flow) and the
loop runs. The latest playtests are older than the greybox route and have no barrier beat. 11 calls: 4 Decided, 5
Default, 2 New.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | A greybox frame takes logs and rails while its barrier is shut; only the lay waits | **New** | Extends [8 November](../decisions-process.md#d-2026-11-08-fill-a-gated-stretch-before-its) (Line 2) to the greybox. It is the brainstorm's recommendation, which goes straight to building; logged |
| 2 | All six gated frames, the incline included (the brainstorm named five) | Default | The brainstorm's question 1 recommends every gated frame. The incline is the sixth; leaving it out would make the first barrier break the rule |
| 3 | The lay starts on the tick the barrier opens with the bill full; a partial bill waits for its last unit | Default | 8 November: "only its funding and laying wait for the gate" |
| 4 | At a shut frame, Feed when your back holds what the bill lacks; otherwise the barrier's prompt | Default | 8 November's words; one prompt per spot (finding 2) |
| 5 | A full waiting frame offers no Feed and points at its barrier | Decided | [17 November](../decisions-rail.md#d-2026-11-17-finished-deposits-read) |
| 6 | Its bill reads `FULL: WAITING ON THE BARRIER` (placeholder) | Default | Line 2's bill states its wait ("Pull the lever to start"); open question 2 |
| 7 | Canopy's barrier says "Needs the crystal seeds" while the room lacks them | Default | The deep span's existing reason; finding 3 |
| 8 | No new sound or motion on the lay kickoff | Decided | [Greybox before detail](../agents/owner-calls.md#mechanisms-systems-greybox-details) |
| 9 | Any player may open the plug as soon as the bay cut is laid (today's rule kept) | Decided | [25 November](../decisions-rail.md#d-2026-11-25-recommendations-taken-rail) (order choice); [shared progression](../agents/owner-calls.md#shared-wallet) |
| 10 | Solo plays exactly as today | Decided | DESIGN 8; the plug press stays at West Landing (the brainstorm's rejected Bell Rock move) |
| 11 | The co-op job is hauling the rack's 40 units into a shut frame; no other second-player job at the plug | **New** | The brainstorm's comparison of three jobs. Recommended because it is real work with zero solo cost and the loop's evidence above |

### Findings

1. **The plug wait is mostly the loop's model** (changed the Goal's note, step 3's framing and open question 1). Every
   grant is the room's, and the plug, the deep span and the Notch (once the cloth is held) can be opened the moment
   their frame is current. So in play, a second player can already ride to West Landing and open the plug while a
   friend takes the cloth. The loop shows 172 s because `device()` lets only seat 1 press. Pre-feeding still gives the
   rule one shape, gives a partner who arrives with kit a job, and matters most where the key is still out (the four
   barriers in open question 1). The rule is still worth building, but the plug numbers should not be sold as the play gain.
2. **Co-located prompts** (changed step 2). Each barrier stands on its frame. Two runnable targets on one spot would flip with the nearest
   distance, so step 2 names one prompt per spot.
3. **Canopy's wrong pointer** (added to step 2). Its blocked reason is always "No line beyond yet". A full frame
   waiting on the seeds would point at nothing true.
4. **Co-op and late arrival.** A friend arriving at a full waiting frame reads why from the bill and the barrier's
   prompt, with no explanation. A friend arriving mid-feed sees Feed only if carrying, and the rack's "Take logs" otherwise.
   Solo meets the same frame in either order. Splitting up (one at the key, one at the frame) is the new co-op shape. Meeting again happens at
   the frame, where the barrier is.
5. **Flow rules.** The next goal stays findable: the objective still names the barrier. The gate keeps its meaning,
   because the lay waits ([route-contract](../research/route-contract.md) section 1). Nobody is stranded: kit fed while shut stays
   on the frame and is spent by the lay, and nothing can be lost.

Owner questions: the two under [Open questions](#open-questions). Neither blocks the build.
