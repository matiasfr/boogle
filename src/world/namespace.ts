// The world namespace moves room transport and durable saves together on a clean development break.
// The URL (?room=) and everything shown to players keep the plain room name. No old-save migration is maintained.
// History: v01 (0.1 groundwork); v02 (2026-11): refocus cleanup: no fruit, no shore leftovers, catalog renumbered;
// v03 (2026-11-01): one 14 s laying run: the crawl and push variants, site.push and the `run` tune key removed;
// v04 (2026-11-01): the wagon's steam gone (stoke cut after the second run-through): the `wagon` state and wagon.stoke.
// v05 (2026-11-02): mushrooms stopped being shared state: the `mushrooms` state, mush.plant and mush.water gone.
// v06 (2026-11-02): the watering can left the catalog, renumbered: frisbee 1, ball 2.
// v07 (2026-11-05): classic tunables pin full defaults, revision and catalog; incompatible catalogs cannot join.
// v08 (2026-11-05): panel track and machine deck seats cannot share a room lead with continuous-track builds.
// v09 (2026-11-05; encoding corrected 2026-11-06): line-one material/beam authority and panel timings;
// production uses rail-v09, disjoint from every classic v09-<room> name. No save migration.
// v10 (2026-11-05): remove state versions/migrations, frozen recovery and tuning catalog fingerprints.
// v11 (2026-11-06): the ball stopped being saved: the `ball` state and ball.rest gone.
// v12 (2026-11-06): src.take spends a charge only when the whole handful still fits.
// v13 (2026-11-06): line two's forge, Q1-Q3, depot, lever and hook join the railway state; rails ride the back.
// v14 (2026-11-06): replication R1a: the railway is Server-kind state (replicated, saved by pid with the server's
// checkpoint), its lockstep ops and hash gone; the isolated t1v01 railway rooms removed.
// v15 (2026-11-06): the `railBeamGraceS` tunable (an absent carrier keeps the beam, then it goes down where they stood).
// v16 (2026-11-07): the great beam pass: the first axe fells the great tree in either order with the 40 logs, and the
// proper axe comes from the lit forge (a save holding the axe before the forge no longer loads).
// v17 (2026-11-07): the railway's state is an E world (docs/plans/ecs-e.md): saved as its schema snapshot, catalog
// kinds and accounts replicated by entity id with their slot or pid.
// v18 (2026-11-07): line 2 part 2's first playable: the pack (`rail.pack`, a back of 16 for everyone) and Q4 behind
// the quarry gate, its depot shelf of rails moved from the forge rack (`rail.depotRailTake`); new `rail` fields.
// v19 (2026-11-08): the depot cart's real trip (line 2 part 2, B3): a new `cart` component (`rail.cartCall`), the
// depot's load clock (`railClock.depotLast`) gone.
// v20 (2026-11-08): line 2 part 2, B4: Q5 joins line two (a fifth qjob slot) behind the sea gate; new rail fields
// `sea` and `out4`; `rail.seaSwitch`.
// Pure: read by room routing and tests.
// v21 (2026-11-08): line 2 part 2, B5-B8: boiler and train components; rail.boilerTake/boilerDrop/boilerFit,
// rail.call; Q6 (sixth qjob) fed by the line-2 kit; new rail fields trains and out5.
// v22 (2026-11-09): Split-rock Works and the smallest Roundhouse: new `works` and `shed` components
// (rail.breaker, rail.strike, rail.kiln, rail.footTake, rail.footSet, rail.cradle, rail.turn), `foot` on accounts
// and trains, the train's `wagon`, rock slots 3-4, pile kind 3, line 2's pier stop.
// v23 (2026-11-09): the glider's rules (piece B): rail.glide, a glide field on rail, eight railGlide* tunables; the
// depot cart holds 24 rails.
// v24 (2026-11-10): two railBoiler* tunables (the boiler's haul pace on its rope, boiler-first-choice step 7).
// v25 (2026-11-10): trains stop on request (docs/plans/works-late-game.md, steps 1-3): `train.call` becomes `req` (two
// digits a stop, a safe integer with room for 26 stops), each leg gains its start, entry speed and destination in cm
// (`from`, `v0`, `dest`); `rail.call` carries `dir`. The cradle takes no footings (`WORKS.total` 14); two appended
// railFoot* tunables; `rail.turn` only once the cradle is fitted and before the wagon rolls out. `rail.cartCall` and
// `cart.recall` removed (the "Call cart to forge" handle was cut on 9 November).
// v26 (2026-11-10): generic lines and double track (docs/plans/generic-lines.md, step 4): `train.sweep` becomes
// `track`, a third train row (line 2 runs two), a new `line` component (the halts' lever asks and the ends' last
// departures), `rail.call` splits lever asks from riders' (`train`), the railTrainHeadPct tunable; LOOK's turn-back gone.
// v27 (2026-11-11): Ring Island build 1 (docs/plans/ring-island-build1.md, R3): Q7 (a seventh qjob, its kit by train
// to the Pier; rail `out6`), the bents to the gap, `Aperture` (rail.footTake rack 2, rail.footSet site 3, rail.brace,
// rail.strike id 2), the Railhead and Ring Island halts (buffers and a crossover), the Pier homeward-only and east of
// the down track, line 2's third train with the balanced hold, `WORKS.total` 32; no migration.
// v28 (2026-11-11): slice 5's town economy, R1 (docs/plans/slice5-town-economy.md, bump A): `yard` (+`yardClock`) and
// `town` components, `train.freight`, the rail.yardTick system; freight loads only where a train already stands (no
// new stop); no migration.
// v29 (2026-11-12): slice 5's R2b (docs/plans/slice5-town-economy.md): line 2's homeward trains make a full-load stone
// stop at the Quarry once the pier's twelve footings are set (`loadStop` 8, build-errand trains exempt, none while the
// wagon is owed footings); a rule change, no shape change; no migration.
// v30 (2026-11-12): slice 5's R3 (docs/plans/slice5-town-economy.md): riders between the Village and line 2's current
// end, distance fares and the one strongbox (`till`; `train.riders`; the town's `wait0`, `wait1`, `boarded`,
// `alighted`; a `townClock` for its riders' accrual, not replicated), the rail.tradeTick system, the railFarePct,
// railRiderPct and railPricePct tunables; riders add no stop; no migration.
// v31 (2026-11-12): Ring Island build 2 (docs/plans/ring-island-build2.md, R1 to R5): `steel` (+`steelClock`) components,
// `train.steel` and `train.boiler`, `line.boiler` and `line.fitted`, `shed.steel`; rail.steelTake, rail.steel and
// rail.install; the steel works' cast tick and its away credit; `TRAIN_EXTENT.aheadCm` 820; no migration.
// v32 (2026-11-12): the greybox route, leg 1 (docs/plans/greybox-route.md, bump G1): `leg`, `legYard` and `route`
// components for the whole catalog; rail.legStock, rail.grant, rail.gate and rail.arrive; the lay tick; line 2 grows
// past Ring Island over the stack line's heads to High Gorge with a fleet of 3 then 5 (two rows wait in the shed) and
// block signals; `ns`, `bay` and `cave` as lines 2 to 4, shut; `train.legKit` (the steel works' kit first);
// `leg.heldLogs`, `leg.heldRails`, `account.legLogs` and `account.legRails` (2026-11-12, the step 3 review's P2-2
// and its re-review, in the same bump: v32 has not shipped);
// no migration.
// v33 (2026-11-12): the fourth car (docs/plans/fourth-car.md, R1 and R2): steel's car behind a train on the longer
// boiler, derived from `train.boiler` (no field, no op); `TRAIN_EXTENT.behindCm` 1270 and `RIDER_SPAN` 1110; line 2's
// Village stop 17.0 to 18.25 m (a v32 save's train standing there no longer loads); no shape change, no migration.
// v34 (2026-11-12): train spacing (docs/plans/short-turn.md, the ruling on step 1's sheet, step 2): line 2 runs six
// trains from the first section of leg 1 laid (`fleet.trains` 3, 6, 6, 6, 6: a third shed row), and the Ring Island
// hold (`RailHalt.control`; the railTrainHoldCap and railTrainHoldPct tunables, 200 and 15); the hold's cap runs from
// `train.arrived`, so no shape change beyond the row and the two tunables; no migration.
// v35 (2026-11-13): a lay redirects a standing stack train with a full boarding dwell; repeat platform requests
// may extend an unextended stand once, even with an ask pending; later calls cannot re-extend it.
// Arrival-based hold caps and headway stay fixed; no shape change or migration.
// v36 (2026-11-13): Home's terminus station is the only layout: both path heads, yard and platform anchors,
// the cart's longer road and the 110-tick shunt; tree planting frozen before station clearance, with stable IDs.
// A clean reset for the moved station and tree table; no shape change or migration.
// v37 (2026-11-13): rail tunables move from lockstep tune into Server-kind railTune, replicated as tuneValue/tuneRev.
// v38 (2026-11-13): roster leaves classic snapshots/hashes; durable who.set uses r:edit and global player rows.
// v39 (2026-11-13): retire gifts, stacks, piles, sites, sources, bank and opening and their classic ops.
// v40 (2026-11-13): retire the eight haul tunables, classic roster registration and classic transport; server-only
// checkpoints replace the classic recovery tail. Rail tune row ids now start at zero; no migration.
// v41 (2026-11-13): transient Server seat rows replace the lead's placeSeatGrants and placeSeatRequest presence;
// placeSeatPose stays Owner. No migration.
// v42 (2026-11-13): The Boogler's Server leg and saved position/facing replace the lead's g presence.
// v43 (2026-11-13): present/puff server commands and timed reaction events; bg shrinks to [act, wary].
// v44 (2026-11-13): remove the lead election, welcome field and notification; all shared authority is server-owned.
// v45 (2026-11-14, shipped #1827): rotunda 1a moves the table, stall and seam reach points,
// the table landing and the shunt's 140-tick rule. No shape change or migration.
// Running-side step 3 adds right-hand platform acceptance and directional ring-track order; views follow in step 4.
// Running-side review adds Train.origin (accepted departure stop, replicated and saved), and step 5 adds
// the Pier west platform catalog entry for homeward service after Q7. Retained departures keep their old
// block and original-side boarding authority until the entire train clears; no second reset or migration.
// v46 (2026-11-14, shared reset): the Aperture row carries the railhead haul's start tick and origin.
// No migration. This reset shipped before the great-tree move.
// v47 (2026-11-14): move the great tree to the prow and its beam's initial/recovery ground to 29.7 m;
// extend the beam work area around the new source. No migration.
// v48 (2026-11-15): authenticated room admission uses server-issued principals and device sessions.
// Fresh identities at this development cutover; accounts.sqlite stays independent of room resets. No migration.
// v49 (2026-11-15 integration): main already uses v48 for authentication. Heavy loads widen the accepted cargo
// domain from 8/16 to 12/24; retain the intended fresh checkpoint domain after rebase. Current builds only.
// Before shipping that change: uncapped recovery piles, Q2/Q5 depot reach and stub-arrival continuation fixed.
// Still before shipping v49 (2026-11-15): 128 local piles of <=8 pieces, with one reserved slot per excess
// carried piece. No drop-triggered recovery; at saturation pickups stop before unreserved overfill.
// v50 (2026-11-15): terrain-clean benches clear twelve ordinary harvest sources, preserving all surviving IDs.
// Follows heavy-load v49; the source catalog changes with the ground. No migration.
// v51 (2026-11-15): Works flow step 1 casts the breaker at the boiler fit, not Q6; the save invariant follows.
// No shape change or migration.
// v52 (2026-11-15): train progression adds 14/20/25 boiler rows and a train per early extension.
// v53 (2026-11-16): the free 20 m/s garage install replaces the automatic table upgrade; the wagon waits for it.
// v54 (2026-11-16): priced Plot rows and rail.buy; houses build in 100 ticks, riders 1/min/building, room prices 50%.
// v55 (2026-11-16): plot 2 is the loader yard (no riders); with it built and the wagon coupled every line 2 train
// loads footings at the quarry going out; rooms that bought plot 2 as a house start fresh. No shape change or migration.
// v56 (2026-11-16): line two and the breaker wake only after the fitted boiler and the cart at rest.
// v57 — 2026-11-16: riders' coach, eight rider places (was four), 16.1 m rear reach;
// Home line 2 stop 21.65 m and Ring Island stop +3.4 m, keeping freight positions fixed;
// High Gorge's crossover 3.4 m toward Home keeps the full coach train straight at the terminal turn.
// v58 (2026-11-17): capped away-fare sack and rail.sack pour into the shared strongbox; no migration.
// v59 (2026-11-17): garage steel spending, Shed.spent and Line.cradle; priced installs share a fit revision,
// the bigger footing cradle and 30 m/s boiler. No save migration.
// v60 (2026-11-18): separate capacities: logs 8 (16 with the pack), stone 8 (16 with the breaker), rails 8; no heavy
// load or drop reservations; a hit yields 1 until Station 3 is funded, then 2 (the proper axe 5); Station 3 takes 32
// logs. No migration.
// v61 (2026-11-18): the railhead re-route (docs/plans/railhead-reroute.md): the Aperture row carries the trains'
// Railhead bent (`stop`), which moves when the haul settles (rail.ringStop), not at the pair; no migration.
// v62 (2026-11-18): greybox leg 2's rules (docs/plans/greybox-leg2.md, steps 1 to 3): the ns and bay lines built to
// Bell Rock with their halts reindexed (home, a head, Bell Rock), four new shed train rows, the ns Gorge stop at s 36
// and the bay's Bell Rock stop at s 1217; the incline's kit relays through the Gorge yard. No migration.
// v63 (2026-11-19): a laying machine eases out of its stop over 50 ticks (railDepartureTicks 20 -> 50, G31/G32): the
// saved tune and the job rows' default timing change, so live rooms take the new start. No migration.
// v64 (2026-11-19): the Rail yoke: `Rail.yoke` and `rail.yoke`, rails 8 -> 16 once taken
// (docs/plans/rail-yoke.md); no migration.
// v65 (2026-11-19): halt yards (docs/plans/halt-yard.md): `HaltYard` rows and `rail.haltPut`/`rail.haltTake`;
// abandoned logs and stone recover to the nearest open yard; no migration.
// v66 (2026-11-22): the bay line runs through Bell Rock to Canopy. The eased row, halt indices,
// and fleet slots change the meaning of saved railway rows. A train records a middle service
// stand before unloading so a restored room can finish the same spacing hold.
// The v66 tune snapshot also retires both Ring Island hold settings (23 November).
// v67 (2026-11-24): garage step 4's rules (docs/plans/garage-step4.md, step 2): `Line.rev` (the install revision,
// replacing boiler + cradle), `Shed.tableLine`, `Shed.bringRev` and `Shed.brought`; rail.install widened to the trade
// lines' Quick (5) and Strong (6) boilers on `Line.rev`; the new rail.bring; the table's hold; a train adopts a lower
// row at halt 0 unless its kit aboard would not fit.
// v68 (2026-11-25): T1 offers the room's first pack or jump. These takes can name T1, and Q1 costs 32 logs.
// v69 (2026-11-25): trade fits hold through their line's last lay and allow one free re-pick. Retire the bigger cradle.
// v70 (2026-11-25): the cave line gains two train rows and a head, Saltpan's arc and the plug's frame reach.
// v71 (2026-11-25): the cave line grows from Port Quay to High Gorge, with new halt ids, three trains and the deep-span reach.
// v72 (2026-11-25): the Notch and causeway extend two lines, four reach points move and Route saves the island train's first stop.
// v73 (2026-11-25): homeward platform points at the three Stack heads move to the west decks.
export const WORLD_NS = 'v73';

// The id a room's world lives under. The server takes [a-z0-9-]{1,32}: a room name too long to fit keeps
// its start plus a short hash of the whole name, so two long names practically never share a world.
const MAX = 31 - WORLD_NS.length;
function shortHash(s: string): string {
  let h = 2166136261;
  for (let k = 0; k < s.length; k++) h = Math.imul(h ^ s.charCodeAt(k), 16777619);
  return (h >>> 0).toString(36);
}
export function worldRoomId(room: string): string {
  const r = String(room);
  const id = r.length <= MAX ? r : `${r.slice(0, MAX - 8)}-${shortHash(r).padStart(7, '0').slice(0, 7)}`;
  return `${WORLD_NS}-${id}`;
}
