> **26 November 2026. Plan, not built.** Planner, against main `5997c5cd9` (world v74). Step 5 of the approved
> [garage-choices](garage-choices.md#7-steps) (section 5, "Port Quay"; step 5's row), with
> [shared-pool](shared-pool.md#6-steps)'s step 2 built inside it, as that plan says. Steps 1 to 3 stand the Roundhouse
> with no sim change and no bump; step 4 is the sim and the bump; steps 5 and 6 are the garage at Port Quay. Design
> review [near the end](#design-review-2026-11-26); [open questions](#open-questions) last. Nothing here waits for the owner.

# Port Quay's Roundhouse: five bays, standing at arrival, and a garage that works there

**Goal.** When a room's cave line reaches Port Quay, the second Roundhouse is already there: the same kit as Home's
(bay, door, pit, bridge, 16 m table), five bays on the decided order, standing and complete. A player steps off the
platform onto its yard, walks to its post and installs or brings a line's copy exactly as at Home's table, paying
from the one pool. Serves DESIGN.md **6. Communal world** (two posts, one pool and every line's fits, for anyone),
**7. Telegraph everything** (the copies stand behind open doors facing the platform) and **8. Enjoyable alone and
together** (players split between two Roundhouses can both act). It bends nothing.

**Read for this.** AGENTS.md; `npm run map -- --kind docs` and `--kind poi` (no plan kind; their level and design
rows apply); DESIGN.md; owner-calls' index; garage-choices sections 0, 4, 5, 6, 7, 8 and its design review's findings
1, 10 and calls 27 to 30; garage-step4 (the tables, `rail.bring`, the copies); shared-pool sections 3, 4 and step 2;
greybox-leg4's massing, "Beside the garage and the shared pool" and its level findings; the core-loop and rewards
Current rules with the 15 November garage answers, the 16 November "Port Quay has five bays" (rail), and the 25
November order-picks answers (the bigger cradle dropped; the trade holds while its line builds; the cave line is
offered Quick or Strong in its own garage step) and shared-pool answers; the nested AGENTS.md of src/sim,
src/world and src/entities. Code on main: `src/place/rotunda.ts`, `src/place/home-station.ts` (`TABLE`,
`ROTUNDA_HOME`), `src/entities/railway/rotunda-stage.ts`, `rotunda-view.ts`, `roundhouse-view.ts` (`bayCopies`, the
garage mount), `garage-geo.ts`, `garage-state.ts`, `garage-view.ts` (its sends), `src/features/garage.ts`,
`dev/prefab/rotunda.ts`, `dev/level/rotunda.ts`, `dev/level/route-leg4.ts`, `src/content/levels/leg4.ts` (the quay
frame, its apron and reserves), `src/entities/route-greybox/massing-quay.ts` and `massing-saltpan.ts`
(`coastalArea`), `src/sim/railway-works-layout.ts` (`SHED_TABLE`, `INSTALL_STEEL`, `installAdmits`, `BRING_TICKS`),
`railway-sys-steel.ts` (`install`, `fitTrade`, `spendUpgrade`), `railway-sys-works.ts` (`bring`),
`railway-queries-works.ts` (`tableFree`, `tableBusy`, `upgradePool`), `railway-components.ts` (`Shed`),
`railway-check-steel.ts`, `src/world/railway-server.ts` (admission for both ops), `src/adapters/railway-intents.ts`,
`server/src/host/railway-requests.ts`. Pattern followed: garage step 4 (`rail.bring`, the table's hold, bay copies)
and Home's rotunda steps 1b to 5.

**Research.** [route-contract](../research/route-contract.md) (travel never supplies work): used, the reason Port
Quay's post refuses until the cave line arrives ([level finding 6](#level-findings)).
[level-design](../research/level-design.md) (walk-seconds; something to notice every few seconds): the yard is 39 m
from the halt, about 7 s, with the copies in view the whole way.
[roundhouse-management](../research/roundhouse-management.md) ("one small configuration choice per line"): unchanged;
this plan adds a second place to make the existing choice, not a new choice. Not a port from Place: no fit check is
needed.

**The rail route as it stands** (`npm run loop -- node cave-3`, 26 November): "West landing to Port Quay, section 3 of
3; bill 20 logs + 20 rails; supply by a cave train from the West landing; requires cave-2". That node is Port Quay's
arrival; this plan adds no loop node (call 14).

**In flight** (`npm run inflight`, 26 November): one ship branch touching `docs/agents/orchestrator-state.md` and
`docs/backlog.md` only; nothing touches these files.

## What it is, measured

**The reserve as built** (`src/content/levels/leg4.ts:991`): `quay.reserve('Roundhouse', -30, 30, -69, -9, 3.02, 12)`
in the quay frame (origin Port Quay's stop (137.60, 942.25), `a` outbound `unit(-17.6, 17.75)`, `b` its perpendicular,
`b` negative landward). Its middle, `a` 0 `b` −39, is world **(109.91, 914.79)**, 39.0 m straight landward of the halt.
Under it the quay's `apron` box is level at **3.02 m**, 0.88 m below both platforms' 3.90 m tops; platform 1 (the
landward one) spans `a` −20 to 20, `b` −7.8 to −3.8. Past the stop the cave line runs on to the White Wall and bends
landward from `a` 28 (`b` −0.7 at `a` 33, −10.6 at `a` 56): the reserve's corner (30, −9) is 4.80 m from its formation
(`level-check`, as built).

**The site row.** Centre on the reserve's middle; the table's road leaves toward the platforms; the arc faces away
from it, as garage-choices section 5 asks:

```ts
// src/place/port-quay.ts (new): Port Quay's Roundhouse, local static data. Centre in Home's place frame, as every
// RotundaSite's (world x less ORIGIN.x), from the server's one reach point.
export const ROTUNDA_PORT_QUAY: RotundaSite = {
  id: 'port-quay',
  centre: { x: QUAY_TABLE.x / 100 - ORIGIN.x, z: QUAY_TABLE.z / 100 }, // world (109.91, 914.79)
  y: 3.9, // the yard, level with the platforms (finding 3)
  tableR: 8, // Home's: one table record
  approach: 135, // toward platform 1, square to it (134.8° measured)
  mid: 315, // approach + 180
  order: [0, -1, 1, -2, 2], // 315°, 295°, 335°, 275°, 355°: five bays, 100°
  stages: [5], // one stage: standing and complete at arrival
  grows: false, // no ruins, no painted outlines past the ends (Home: true)
};
// src/sim/railway-works-layout.ts: the server's second reach point, at the table's centre as SHED_TABLE is.
export const QUAY_TABLE = { x: 10991, z: 91479, y: 420, reach: 1000 } as const;
```

**The yard.** The quay's apron is 0.88 m below the platforms and the kit's pit is 0.9 m deep. Rather than cut a pit
into the isle's baked prism, the Roundhouse stands on a **yard at 3.90 m**, level with the platforms, over the apron:
the pit floor is the apron itself (3.02 m) inside the table's kerb ring, whose authored bottom (−0.9) lands 2 cm
inside it. A player walks straight off platform 1 onto the yard and faces the table, the bays' open doors behind it.

**What each bay holds** (garage-choices sections 4 and 5; the 15 November answer 4: "both Roundhouses fit every line
and keep a works copy of each"; the 25 November answers: no cradle, the cave line's trade is its own garage step):

| Bay (offset, bearing) | Holds | Door |
| --- | --- | --- |
| 0, 315° (working) | The engine built at Port Quay, once one exists ([open question 2](#open-questions)); empty until then | Open, as every working bay |
| −1, 295° | Line 2's works copy, while another line's stands on Port Quay's table | Open while it stands there |
| 1, 335° | The north–south line's copy, once its trade is open | Open while it stands there |
| 2, 355° | The bay line's copy, once its trade is open | Open while it stands there |
| −2, 275° | Kept for the cave line's copy: its trade arrives with its own garage step (25 November, answer 6) | Shut until then |

The three copy bays keep Home's signed offsets and plate colours (`COPY_BAYS`), so the same line stands in the same
place relative to the working bay at both Roundhouses. Port Quay's table starts with line 2's copy, as Home's does
(`Shed.tableLine`'s default). No steel stands at Port Quay: the pool lies in Home's bay 150° (shared-pool section 3:
"Nothing appears at Port Quay, which holds no stack of its own").

## Design

**Sync kinds** (docs/agents/sync.md, "Pick a sync kind"):

| Piece | Kind | Where |
| --- | --- | --- |
| The site row, the yard, the bays, the doors, which copies stand where | Local static and derived from replicated rows | `src/place/port-quay.ts`, `src/place/rotunda.ts`, the quay level, `rotunda-view.ts` |
| Which line's copy stands on Port Quay's table (`Shed.quayLine`), its bring revision (`Shed.quayRev`), the tick of its last bring (`Shed.quayBrought`) | **Server** (checkpointed `Shed` fields) | `railway-components.ts` |
| `rail.install` and `rail.bring` at either table | **Server** command, existing ops with the existing `site` field (0 Home, 1 Port Quay) | `railway-sys-steel.ts`, `railway-sys-works.ts`, `railway-server.ts` |
| The pool an install spends | Server, unchanged: one pool, Home's bay (shared-pool step 1) | `spendUpgrade`, `upgradePool` |
| The table copy, post, jib, stand and the screen at Port Quay | Local, from replicated rows | `garage-geo.ts`, `garage-view.ts`, a new quay mount, `src/features/garage.ts` |

**Authority and rules.** The server owns both tables. No client lead, classic edit generator, presence field, message
or client state registration is added; neither op is predicted (`src/world/railway-predict.ts`), so the screen waits
for the receipt as today.

- **Ops and validation.** `rail.install { line, part, revision, site }` and `rail.bring { line, revision, site }`;
  `site` reuses `RailEvent.site` (`rail.footSet`'s field), required, `railInt(e.site, 1)`. Admission
  (`railway-server.ts`): `at(e.site === 1 ? QUAY_TABLE : SHED_TABLE)`. Intents (`railway-intents.ts`) and the host's
  request cleaner (`railway-requests.ts`) carry `site`. A missing or out-of-range `site` is refused, never defaulted.
- **The rules.** `const table = e.site === 1 ? h.quayLine : h.tableLine` replaces `h.tableLine` in `install`; `bring`
  compares and bumps the site's own revision and line (`quayRev`/`quayLine`/`quayBrought` at site 1). Port Quay refuses
  both ops until the cave leg is complete: `e.site === 1 && !legDone(w, QUAY_LEG)` with `QUAY_LEG =
  RAIL_LEGS.findIndex((l) => l.id === 'cave')` (call 6). Part 1 (the 20 m/s upgrade at the table turn) stays site 0
  only. Everything else is as at Home: the line's revision, the line's copy on that site's table, the pool, the
  trade's hold and re-pick (`tradeSwapRefusal`), the big boiler's High Gorge gate.
- **The table's hold, per site.** `tableFree(w, site)` and `tableBusy(w, tick, site)`: a site's own last bring
  (`brought` or `quayBrought`) plus `BRING_TICKS`, and every line's `Line.fitted` plus `WORKS.upgradeTicks` at both
  sites (an install anywhere holds both tables for 5 s: call 9); the wagon's roll-out holds site 0 only.
- **Checkpoint state.** Three new `Shed` fields, `quayLine: u8` (default `LINE2`), `quayRev: int` (0),
  `quayBrought: int` (−1). No new component, no new rule tick, no projection change beyond the replicated `Shed` row.
  Saves are the server's as today.
- **Invariants** (`railway-check-steel.ts`, beside line 123's): `quayLine` is `LINE2` or an open trade line;
  `quayLine !== LINE2` implies `quayRev > 0`; `quayBrought` is −1 exactly when `quayRev` is 0, and never in the future.
- **Receipts.** Accepted: the replicated `Shed` row moves the copy (bring) or the line's row moves its fit (install);
  the hold's local moment plays at every table whose copy is that line's, the hanging part only at the post that held
  (call 10). Refused: the screen's existing deny (`roundhouse-view.ts:69`); the trade's named refusals unchanged.
- **Mixed builds.** A wire meaning and checkpoint shape change: `WORLD_NS` bumps with a dated history line in step 4,
  no compatibility code. Fixtures and goldens regenerate in that commit after an old/new comparison (as garage step 3).
- **Lockstep.** Integers only; no float, trig, random or wall time in the rules. `QUAY_TABLE` is pinned centimetres.
- **Server image.** No new sim file (every change lands in existing files); if the builder must add one, it goes in
  `server/Dockerfile`, `dev/server-build.ts` and `deploy-server.yml` (`test/server-image.test.ts`).

**Controls.** No new action, pad slot, key or touch target: Port Quay's post uses the garage's existing Interact hold
and screen. The guide's garage row is unchanged.

## Steps

Each step leaves `node dev/ship-check.ts origin/main HEAD` green. Tiers are `npm run review-stamp`'s rule: any change
under `src/sim`, `src/world`, `src/net`, `server/src`, or a test whose assertions changed and whose imports reach them
(`test/rotunda.test.ts` reaches `src/sim` through `src/place/rotunda.ts`). Model rows from `npm run models` (26
November). Steps 1 to 3 ship together or one by one, with no bump; step 4 after them; 5 and 6 after 4.

- [ ] **1. The site row, the yard and the level check (S; review: the test reaches src/sim; "Implementation of an
      approved plan": Codex gpt-6.2-sol medium).** Files: new `src/place/port-quay.ts` (`ROTUNDA_PORT_QUAY` as
      [above](#what-it-is-measured)); `src/sim/railway-works-layout.ts` (`QUAY_TABLE`, a pure constant read by no
      rule yet); `src/place/rotunda.ts` (`RotundaSite.grows`; `rotundaPieces` emits ruins and outlines only when
      `grows`; `rotundaShows`' ruin case also asks `site.grows`; `COPY_BAYS` stays, read through a new `copyBays(site)`
      returning it for both sites; `bayOccupants` drops its `site.id !== 'home'` early return: waiting engines stay
      Home's (`site.grows`), copies are `copyBays(site)` filtered as now); `src/place/home-station.ts`
      (`ROTUNDA_HOME.grows = true`); `src/content/levels/leg4.ts` (the yard, below; the Roundhouse reserve leaves, the
      town reserve stays); `src/content/prefabs/roundhouse.ts` (a `roundhouse.yard-ring` record: the `pit-ring` layout
      kind with inner 8.6, outer 12.7, bottom −0.88, top 0, 48 segments, if its loader takes these numbers; otherwise
      the builder says why and plans the corners as four boxes); `content/built/levels/quay.json` and prefab outputs
      regenerated; `dev/level/rotunda.ts` (`checkRotunda(site)` takes the site's running tracks and ground: Home's as
      now; Port Quay's are the `cave` row over its whole length and the quay level's colliders under the outline) and
      `dev/level/check.ts` (report `rotunda/port-quay`); `dev/level/route-leg4.ts` (floods below).
      **The yard** (quay frame, metres; tops 3.90): four boxes round a square hole for the pit, `a` −22 to 22 and `b`
      −66 to −7.8 less the hole `a` −8.6 to 8.6, `b` −47.6 to −30.4; the yard ring at the table's centre covers the
      hole's corners (they reach 12.16 m; the ring 12.7 m); one ramp down to the apron on the `a`+ edge, `a` 22 to 25,
      `b` −40 to −34, 3.90 to 3.02 (the platform steps' pitch). The yard meets platform 1 along its landward edge.
      Verify: `test/rotunda.test.ts`, one case beside "the kit also serves a translated, turned nine-bay hub": Port
      Quay's five bays at 315°, 295°, 335°, 275°, 355°; no ruin or outline piece; every bay shell, door and the
      working bay's open doors present; `bayOccupants(ROTUNDA_PORT_QUAY, { serving: 1, copies: [LINE2] })` puts line
      2's copy in bay −1 and no waiting engine; Home's pieces and shows unchanged (the existing cases). `npm run
      level-check`: `rotunda/port-quay: ok; 5 bays (100°)`, nearest running rail 30.39 m (Home's 3.5 m asked), ground
      within 0.10 m of 3.90 under every bay; `route-leg4` gains "on foot from outward platform to the Roundhouse
      post" (local `a` 7.2, `b` −33.0), "from the apron up the yard ramp", "out of the pit" (a plain jump from the
      table's floor at r 7.2 clears the kerb, as Home's pit-escape sweep), and the yard's corner clears the Wall
      formation by at least 3.9 m (measured 3.94 m at s 1231.6, the same line as platform 1's edge); every existing
      quay line still "ok".
- [ ] **2. The generated level (S; none unless a hand-kept list's test reaches src/sim through its imports, then review; "Implementation of an approved plan": Codex gpt-6.2-sol medium).** Files:
      `dev/prefab/rotunda.ts` (`SITES = [ROTUNDA_HOME, ROTUNDA_PORT_QUAY]`; copy plates and flatbeds from
      `copyBays(site)` for every site, not `site.id === 'home'`; waiting engines from `bayOccupants` as now, none at
      Port Quay; the ruins' `BROKEN` pairs unused there); new `content/built/levels/rotunda-port-quay.json` from
      `npm run prefabs`; the hand-kept level lists that name every level (`test/prefab-portability.test.ts` and
      siblings, rule 41) only where they list rotunda levels. Verify: `npm run prefabs` is clean on a second run; the
      prefab validation in `node dev/ship-check.ts`; the new level has the table, five shells, four doors, the open
      working doors, three copy plates and flatbeds, and no ruin or outline placement (read the JSON).
- [ ] **3. The Roundhouse stands at Port Quay (M; none; "Player-visible implementation": Codex gpt-6.2-astra
      medium).** Files: `src/entities/railway/rotunda-view.ts` (`createRotundaView(owner, kit, { site, level })`:
      Home passes `ROTUNDA_HOME` and `rotunda-home.json`; nothing else in it names Home); new
      `src/entities/route-greybox/quay-roundhouse.ts`, mounted through the quay area's extras
      (`massing-quay.ts`, `coastalArea`'s `extras`), resident at the quay's `coverNear` like the rest of the area: the
      Port Quay rotunda view at stage 0, every bay built, the working doors open, and the copies of every open line
      other than the table's (line 2's until step 5 reads `Shed.quayLine`), from the same `bayCopies` rule as Home
      (move it from `roundhouse-view.ts` to `rotunda-view.ts` so both import it); the table record standing, its
      bridge parked on road 0 (the approach); the approach road: a view-only rail pair on the yard from the kerb at
      135° out to buffers 2 m short of platform 1 (r 8.6 to about r 29), no sim track. Every solid that switches on
      near a player keeps `rotunda-view.ts`' copy hold and goes through `liftOrWait` where it is new (do not write
      another). `docs/game-design/place.md` (Port Quay's yard and Roundhouse, as built). No new unit test (rule 36).
      Verify: `npm run level-check` still green; `npm run perf` with a `PLACES` entry at Port Quay's platform (draws,
      triangles, the added batches; reported, not a gate); `.look/` stills at player height (1.7 m) from the
      `port-reached` seed, opened and read: from platform 1's middle toward the table (the open doors and copies in
      view), from the approach road's buffers, from the yard ramp's foot, and from the High Port ramp's head down on
      the whole yard; one still from an arriving cave train.
- [ ] **4. The second table in the rules, and the bump (M; review; "High-risk implementation": Codex gpt-6.2-astra
      medium; then the independent review row).** Files: `src/sim/railway-components.ts` (`Shed.quayLine`, `quayRev`,
      `quayBrought`); `src/sim/railway-queries-works.ts` (`tableFree(w, site)`, `tableBusy(w, tick, site)`, every
      caller passes its site); `src/sim/railway-sys-steel.ts` (`install`: `site`, the site's table line, Port Quay's
      cave-leg gate, part 1 at site 0 only; `fitTrade` takes the site for its hold); `src/sim/railway-sys-works.ts`
      (`bring` per site); `src/sim/railway-check-steel.ts` (the three invariants); `src/sim/railway.ts` (the `site`
      doc comment names both uses); `src/world/railway-server.ts` (admission); `src/adapters/railway-intents.ts`,
      `server/src/host/railway-requests.ts` (`site` carried for both ops); every sender adds `site: 0` (Home's
      `garage-view.ts` sends through `roundhouse-view.ts`, `src/sim/railway-seed-garage.ts`, `railway-seed-works.ts`,
      `railway-seed-steel.ts`, `dev/loop/graph.ts`, `dev/look/bots/railway-fit.ts`, `dev/look/evals/garage-*.ts`,
      `dev/peer-test/ws-page.ts`, `dev/sim/leg3-trade.ts`); `src/world/railway-jump.ts` (a tooling row `quay-garage`
      landing on the yard beside the post, placeholder label, not in the menu, as garage step 4's call 8);
      `src/world/namespace.ts` (the next free version and a dated line: "Port Quay's Roundhouse table: install and
      bring name their table; Shed keeps Port Quay's copy"); fixtures and goldens (seed hashes, schema, op streams,
      tick-order, M12, the host trace with `HOST_TRACE_RECORD=1`) regenerated in the same commit after comparing old
      and new as garage step 3 did. Verify: `test/railway-install.test.ts`: at Port Quay from `port-reached`, a bring
      of an open trade line accepted and `quayLine` moves while `tableLine` does not; an install of the line on Port
      Quay's table accepted, spending the pool, and refused when the line is only on Home's table; both refused at
      site 1 before the cave leg is complete (from `cave-mid`), with `site` missing, 2 or −1, and part 1 at site 1;
      a Home bring does not hold Port Quay's table, an install at either holds both for `WORKS.upgradeTicks`; a stale
      `quayRev` loses to the first accepted bring. `server/test/railway-steel-host.test.ts`, shared-pool step 2's
      case updated for the dropped cradle: "pool host: an install at Port Quay's post spends Home's bay through
      r:edit; refused when short and from neither post", with the Big boiler (6) or a trade line's first fit (1) as
      the seed allows, a second session seeing the `Shed` row; then short: refused, nothing spent; then 30 m from
      both posts: refused. The invariant checks over every seed stage.
- [ ] **5. Port Quay's table and garage pieces (M; review: `test/garage-geo.test.ts` imports `SHED_TABLE`; "Player-visible implementation": Codex gpt-6.2-astra
      medium).** Files: `src/entities/railway/garage-geo.ts` (`GARAGE_ROWS` by site: Home's `GARAGE_GEO`, and Port
      Quay's from a pure `turnGeo(GARAGE_GEO, ROTUNDA_PORT_QUAY.mid - ROTUNDA_HOME.mid)`, 125°: post at 185° r 9.4
      (local `a` 7.2, `b` −33.0), jib and stand at 210° (`a` 11.8 `b` −35.9; `a` 10.0 `b` −36.4), crew at 213° and
      206°, camera at 140°; `garageRow(site)`; `installHere(post, site)` against `SHED_TABLE` or `QUAY_TABLE`); the
      quay mount of step 3 gains the table copy (the line `Shed.quayLine` names, wearing its row, as Home's table copy
      does in `garage-view.ts`), the post, the jib and the stand; the bay copies now read `quayLine`. Port Quay's post
      shows no prompt until the cave leg is complete (no new string). Verify: `test/garage-geo.test.ts`, one case:
      Port Quay's post is within `QUAY_TABLE.reach − 40` of `QUAY_TABLE`, and the turned row keeps Home's distances;
      `.look/` stills from `quay-garage`: the post, jib and stand beside the table at player height, and the copy
      on the table after a `rail.bring` at site 1 through the jump row's tab (the eval harness, not a bot).
- [ ] **6. The garage screen at Port Quay, paying from Home's bay (M; none; "Player-visible implementation": Codex
      gpt-6.2-astra medium).** Files: `src/entities/railway/garage-state.ts` (facts per site: `tableLine` and
      `bringRev` read `Shed.tableLine`/`bringRev` at Home, `quayLine`/`quayRev` at Port Quay); `garage-view.ts` (one
      instance per table, its row and site passed in; its sends name its site; the moment plays at every table whose
      copy's line was fitted, the hanging part only at the post that held); `roundhouse-view.ts` (Home's instance,
      site 0) and the quay mount (site 1); `src/features/garage.ts` (opens for whichever post was held; the chips
      bring to that table); `garage-data.ts` (when the paying post's site holds none of the pool, the bill's need
      line adds the draft **"in Home's bay"**, shared-pool's draft, marked for the owner). Verify: two-tab look
      (shared-pool step 2's): tab A at Port Quay's post (`quay-garage`) holds Install for a part the pool can pay;
      tab B at Home's bay 150° from the steel-home camera; stills before and after the receipt, opened: the stack
      falls by the price and tab A reads Installed; then tab A brings another line and tab B's Home table does not
      change. `npm run review-stamp` would mark this step `none` unless a test under its rule changes.
- [ ] **Checkpoint (after step 6; with shared-pool's Checkpoint B).** `npm run check:full`, `npm --prefix server
      test`, `npm run test:net` (`server/src` changed), `npm run loop -- run` (1 to 4 players; no node added, a
      regression check of the `site` field in its sends), the level check. Proofs to read: the host test's real
      `r:edit` from Port Quay, the two-tab stills, the arrival stills. Real-time feel, audio and device behaviour are
      not claimed by any of these.

## Level findings

`npm run level-check` on main (26 November): 27 reports, all passing, including "Port Quay Roundhouse reserve clear"
and "clears Wall formation by 4.80 m". It has no rule for a second rotunda, so the planned positions were measured with
a scratch script over the kit (`rotundaFootprint`, `bayFrame`), the built quay level's colliders (`heightAt` over
`content/built/levels/quay.json`), the `cave` row (`rowPoint`, every 20 cm) and Home's garage row turned by 125°
(`.look/pq-rotunda-check.ts`, `.look/pq-plinth.ts`, `.look/pq-row.ts`). Step 1 makes these the level check's own lines.

1. **The five bays fit the reserve.** The keep-clear outline (pit, kerb, five bays) spans `a` −19.2 to 19.1 and `b`
   −63.6 to −30.4: inside the reserve (`a` ±30, `b` −69 to −9) by 10.8 m each side and 5.4 m landward. Bay backs stand
   25 m out, at `b` −64.0 (315°), −62.5 (295° and 335°) and −58.2 (275° and 355°).
2. **No running rail comes near.** The nearest rail is the cave line at Port Quay's stop, 30.39 m from the outline
   (Home asks 3.5 m). The White Wall's continuation bends landward past `a` 28; the planned yard's corner is 7.79 m
   from its centreline at s 1231.6, 3.94 m from its formation: the same line as platform 1's own edge.
3. **The ground is level but 0.88 m low.** 2,809 samples under the outline, all on the apron at 3.020 m, none
   without ground. The platforms are at 3.90 m and the kit's pit is 0.9 m. Hence the yard at 3.90 m with the apron as
   the pit floor (the alternative, cutting the isle's baked prism, is more work and leaves the yard below the
   platforms). Step 1 checks the yard within 0.10 m of 3.90 under every bay.
4. **What is seen first.** From platform 1 the table is 39 m away (about 7 s at 5.6 m/s), the arc behind it facing
   the platform: the open doors and the copies inside are in view from the train's stop. The town reserve (`a` 33 to
   63) is 14 m beyond the outline's `a`+ edge, and the High Port ramp runs off at `a` 48 to 128, so neither hides it.
5. **The post.** Port Quay's post at 185°, r 9.4 (local `a` 7.2, `b` −33.0), 28 m from platform 1's middle, on the
   yard; jib (`a` 11.8, `b` −35.9) and stand (`a` 10.0, `b` −36.4) behind it, all inside the reserve. `QUAY_TABLE` at
   the table's centre with Home's 10 m reach: only the yard is within it.
6. **Reachable early, by swimming.** The quay is reached by swimmers from east and north ("quay swimmer from east
   reaches both platforms", as built), so the yard and the post are reachable before the cave line is. The post
   refuses until the cave leg is complete (rule 2 of the flow check: travel never supplies work, leg 4's finding 8).
   Nothing at Port Quay offers what Home does not, so even an open post would skip no work; the gate keeps leg 4's
   "every post there refuses" true.
7. **The pit.** A player who falls into the pit (0.88 m) jumps out as from Home's (0.9 m, its pit-escape sweep);
   step 1 adds the same sweep for Port Quay.
8. **Nothing gated by an ability, no secret.** No reach claim here rests on a stronger move.

## Risks

- **Room safety.** Effects follow the replicated `Shed` row or the accepted receipt, never `apply`; a queued install
  at Port Quay is not done. Malformed `site` is refused, never defaulted, and never crashes the room.
- **Two tables, one shared fit.** Two players at the two posts hold the same line: the line's revision and the pool
  check settle it (the second press is `noop` or refused and spends nothing), as at one post (shared-pool section 3).
- **Hotspots:** `garage-view.ts` (1,385 lines), `roundhouse-view.ts`, `railway-sys-steel.ts`,
  `railway-queries-works.ts`. Step 6 splits Home assumptions out of `garage-view.ts`; the builder lists what it found.
- **Solids near players.** The yard is static and arrives with the area's mount far from players (`coverNear`); a
  player put into it by a jump or return is the return check's. Copies and doors keep `rotunda-view.ts`' hold.
- **Fixtures.** Three `Shed` columns and the `site` field change every seed hash, op stream and the host trace;
  compare before regenerating (rule 15), as garage step 3 did.
- **Performance.** A second rotunda (five shells, doors, up to three copies) resident with the quay area only.
  `npm run perf` in step 3 reports it; the cost is not a reason to cut ([owner call](../agents/owner-calls.md#performance-guides-not-gates)).
- **Mixed builds.** Step 4 bumps; no compatibility code.

## Suspect or placeholder lines (none rewritten; none The Boogler's)

New: **"in Home's bay"** (shared-pool's draft, first shown here). The jump row's label `quay-garage` (tooling only).
Existing and reused unchanged: the garage's Ready, Later, Installed, Install and "The table's busy". No sign, board or
character line is added at Port Quay; its station dressing is [open question 3](#open-questions).

## Design review (2026-11-26)

Planner, in the same context that wrote the plan. Read this session: DESIGN.md, owner-calls' index, the decision
routing table and the core-loop, rail and rewards entries cited above (15, 16 and 25 November), garage-choices with its
review, garage-step4, shared-pool, greybox-leg4, direction.md's Now and Next rows, the research tops named above, the
quay level and the code listed. Ran `npm run loop -- node cave-3`, `npm run level-check` and the scratch measurements
above. Not seen: no still was taken (the plan places static greybox on an apron already proven walkable; step 3's
stills are the first look, and the plan asks for them at the platform, the buffers, the ramp foot and from High Port).
`node dev/playtest/cli.ts` holds no session at Port Quay.

### Calls: 5 decided, 6 new, 10 default

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Port Quay has a Roundhouse with the same kit, five bays, standing and complete at arrival | Decided | [15 November garage choices](../decisions-core-loop.md#d-2026-11-15-garage-choices), answer 4; [16 November](../decisions-rail.md#d-2026-11-16-batch2-port-quay-five-bays) |
| 2 | Both Roundhouses fit every line and keep a works copy of each | Decided | 15 November, answer 4 |
| 3 | An install at Port Quay spends the one pool, which lies in Home's bay; nothing stacks at Port Quay | Decided | 15 November answer 2; [shared-pool](shared-pool.md) section 3, its questions answered [25 November](../decisions-rewards.md#d-2026-11-25-recommendations-taken-pool) |
| 4 | No bigger cradle at either post; the trade holds while its line builds, one re-pick | Decided | [25 November order picks](../decisions-core-loop.md#d-2026-11-25-order-picks-answers), answers 3 and 5 |
| 5 | The cave line's copy waits for the cave line's own garage step (its Quick or Strong) | Decided | 25 November, answer 6 |
| 6 | Port Quay's post refuses until the cave leg is complete | New | Recommend: keeps leg 4's "every post there refuses" and route-contract's travel-never-supplies-work true for swimmers (level finding 6) |
| 7 | Each table keeps its own copy (`Shed.quayLine`): a bring at one table never moves the other's | New | Recommend over one shared selection, which would swap Home's copy with nobody at its post (DESIGN 7, 11) |
| 8 | Both ops name their table (`site`), refused when missing | Default | Engineering shape with a rule meaning; the existing field |
| 9 | An install at either table holds both tables 5 s; a bring holds only its own | Default | `Line.fitted` is per line, not per table; the hold is short; cheap to split later |
| 10 | The install moment plays at every table showing the fitted line's copy; the part drops only at the post that held | New | Recommend: a friend at the other Roundhouse sees the room's upgrade land (DESIGN 6, 7); the alternative needs a saved "where" |
| 11 | The yard stands at 3.90 m, level with the platforms, over the apron as the pit floor | New | Recommend: the kit's pit needs 0.9 m and the apron has 2 cm; it also makes "step off the platform and face the table" the first meeting (level finding 3) |
| 12 | Site row: centre on the reserve's middle, approach 135° toward platform 1, arc at 315° facing away | Default | garage-choices section 5's form; level findings 1, 2 and 4 |
| 13 | Copy bays keep Home's offsets and colours (line 2 at −1, `ns` at 1, `bay` at 2); bay −2 kept for the cave line | Default | One layout for both Roundhouses; garage-step4's plates |
| 14 | No loop node and no bot beat for Port Quay's garage | Default | It offers nothing Home does not; shared-pool step 2: "Bots: none" |
| 15 | Port Quay's table starts with line 2's copy | Default | `Shed.tableLine`'s default; the cave line has no copy yet |
| 16 | The working bay stands open and empty until an engine is built at Port Quay | New | Recommend: the working bay's door is the kit's, and an empty open bay is the one place the room's next engine is promised (DESIGN 7). [Open question 2](#open-questions) |
| 17 | The approach road is a view-only stub to buffers 2 m short of platform 1, no sim track | New | Recommend: no train ever drives into Port Quay's table (works copies only); a real turnout is the station plan's. [Open question 4](#open-questions) |
| 18 | The garage row at Port Quay is Home's turned by 125° (post at 185°, jib and stand at 210°, camera at 140°) | Default | Keeps every measured distance of Home's row; level finding 5 |
| 19 | One yard ramp on the `a`+ edge; the yard meets platform 1 along its edge | Default | Walk from the apron and the town reserve; flood-proved in step 1 |
| 20 | Port Quay's post shows no prompt before the cave leg is complete | Default | No new string; the refusal is the rule's |
| 21 | Draft copy "in Home's bay" under the bill at Port Quay | Default | shared-pool's draft, the owner's to word |

### Findings

1. **(changed the design, step 1) The apron is 0.88 m below the platforms; the kit's pit has no floor to sink into.**
   The quay's isle is a baked prism at 3 m, the apron 3.02 m. Standing the rotunda at 3.02 m would bury its pit.
   Raising the yard to the platforms' 3.90 m fixes the pit and gives the best first meeting: step off the platform,
   face the table. Step 1 carries the yard, its ring and ramp, and the level check's lines.
2. **(changed the design, steps 4 to 6) Two copies of each line mean two tables.** The approved plan's "a second
   reach point" alone would let a bring at Port Quay swap Home's copy for a friend standing at Home, unexplained
   (DESIGN 11). Port Quay's table keeps its own line and revision (call 7). The ops name their table rather than the
   server inferring it from position, so the rule, not admission, owns which table is meant.
3. **(changed step 4) A swimmer reaches Port Quay before its line.** Without a gate the post would work early. It
   skips no work (Home offers the same), so this is a consistency call, not a broken gate: the post opens with the
   cave leg's completion (call 6).
4. **(changed step 4 and step 6) shared-pool step 2's proof names the bigger cradle, which the owner dropped on 25
   November.** The host test and the two-tab look use the Big boiler or a trade line's first fit instead.
5. **(no change) The co-op version.** Two players at one post: first accepted hold wins, as at Home. Split between
   the two posts: each table answers its own brings; an install on the same line resolves by the line's revision; both
   tables play the moment (call 10). Solo: everything works with one player; the post is 28 m from the platform. A
   friend arriving late sees the copies and the table as rows.
6. **(no change, flagged) What a player does at Port Quay that they could not at Home.** Nothing, until the engine
   built there exists. The Roundhouse is a convenience on arrival and a promise in its working bay. The faster engine
   is the payoff that gives the place its own reason ([open question 2](#open-questions)).
7. **Flow.** Rule 1: the Roundhouse stands beside the halt the line ends at and is seen from the stop. Rule 2: the
   gate in call 6. Rule 3: the pit is escapable, the yard has a ramp, nothing is one-way. Lenses: it ends the cave
   leg facing something new (5, "end a beat facing the next"), and gives a split room a second place to meet (8).

### Owner questions

None that block: every call above proceeds on its recommendation and is logged. The plan's [open
questions](#open-questions) are scope this plan was told not to decide.

## Open questions

Scope this plan does not decide; each has a recommendation and none blocks a step.

1. **The hub town at Port Quay** (12 November, hub towns grow and receive freight; leg 4 left a 30 × 30 m reserve).
   Recommended: leave it to the one stand-in towns plan for High Gorge, Canopy Town and Port Quay (leg 3's open
   question 5); this plan keeps the town reserve clear (14 m from the outline) and adds nothing to it.
2. **The faster engine "built at High Port"** (junction-stations, 10 November; garage-choices calls it "the engine
   built there" in Port Quay's working bay, and Home's bay 250° when it first comes home). Undecided: its speed (the
   2D page leaves room at 35 to 40 m/s), what it costs, who builds it and when. Recommended: its own brief after the
   route reaches the ending, starting from the step 0 page's row; until then Port Quay's working bay stands open and
   empty (call 16), and nothing here reserves state for it.
3. **Port Quay's station dressing** (designed stations, 10 November: "each may have its own works"; the halt is a
   greybox halt with levers and boards). Recommended: leave the station house, canopy, signs, its stone and trim
   (garage-choices section 5's "its stone and trim") to a Port Quay station plan with the hub town; this plan uses the
   kit's records unchanged, so the Roundhouse reads as Home's until then.
4. **A real road from the cave line into the table.** "Met head-on, not on a spur" could mean a turnout off the cave
   line. Recommended: not now: no train runs to Port Quay's table, and a turnout on the cave row is a catalog and sim
   change for nothing a player does. The view-only stub (call 17) reads as a road; the station plan can join it.
5. **The cave line's copy and chip at Port Quay.** Recommended: its own garage step (25 November answer 6) adds the
   cave line to `TRADE_LINES`, its copy to bay −2 at Port Quay and to bay 130° at Home (garage-choices' stage 3a), with
   no change to this plan.
