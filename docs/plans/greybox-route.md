> **Status: plan for the owner's and the designer's review (11 November 2026).** Nothing here is built. Phase B of
> [campaign-outline](campaign-outline.md): the whole route, rough. Its owner questions were answered on 12 November
> (UTC) ([below](#owner-questions)); the open questions below are the planner's own.

# The greybox route: every remaining area playable, wake to the ending

**Owner direction, binding here (11 November,
[owner call](../agents/owner-calls.md#mechanisms-systems-greybox-details)):** "now we're proving out the mechanisms of
the game, then we need to build out all the systems, and then once we have the full graybox, we start filling in
details"; and "if we have the full outline of the game experience, and feel good about the shape and its systems,
it'll be much easier to color in the lines and flesh out detail, characters, narrative etc." So every step is a
mechanism or a system on blockout geometry. No character quirks, barks, idle animations, bespoke props, copy beyond
placeholder labels, or polish steps. Every label below is a placeholder and is marked as one in the game.

**Goal.** Areas 4 to 9 become playable in greybox on real server lines, so the owner can ride from wake to the ending
and judge the shape and length before any detail is built. It serves DESIGN.md's core loop ("The rail builds the
world"), **7. Telegraph everything** (each next leg's frame and barrier stand in the world) and **8. Enjoyable alone
and together** (measured for one to three players, with a rejoin proof per area). It bends nothing.

**Read for this.** AGENTS.md; `npm run map -- --kind docs`; DESIGN.md; [campaign-outline](campaign-outline.md) in
full; `dev/loop/standins.ts` and `graph.ts`; [world-blockout](world-blockout.md) (areas, legs, rulings, "Future lines
as data"); [rail-map](rail-map.md) (the ends audit and its five services); [generic-lines](generic-lines.md) and its
built steps; [ring-island-build1](ring-island-build1.md) and [build 2](ring-island-build2.md) (rulings A to F);
[slice5-town-economy](slice5-town-economy.md); [map-prototypes](../world/map-prototypes.md); sync, mixed-builds,
room-safety, lockstep, rendering, the level check; `src/world/railway-jump.ts` and
[dev-menu](../game-design/dev-menu.md). Code: `src/sim/railway-lines.ts`, `railway-train.ts`,
`railway-components.ts`, `railway-queries.ts` (`kitJob`, `kitStop`, `kitOwed`), `railway-sys-trains.ts`,
`railway-ring-layout.ts` (`RING_HEAD`), `railway-seeds.ts`, `src/sickle/world-lines.ts`, `src/features/world-blockout.ts`.
Pattern followed: Q7 (a train-fed job at a moving railhead) and build 1's `Aperture`.

**Research.** [vast-world-scale](../research/vast-world-scale.md) (legs of 1 to 3 km, rail decisively faster than
feet): used, the legs are the blockout's. [route-contract](../research/route-contract.md) (travel edges never supply
work edges): used, a swimmer who reaches an island early finds nothing to take
([Level findings](#level-findings), 3). [rail-network-depth](../research/rail-network-depth.md) (the railway runs
itself): used, no player routes a train or a kit. [map-prototypes](../world/map-prototypes.md), "Streaming and draw
distance": used as the streaming default. Departs from the outline's "every future line becomes a real server line":
rail-map's answered question 1 makes three of the legs line 2 growing on, so the route needs three new rows, not seven.

**Port from Place.** Nothing is ported. No fit check is needed.

> **Hub towns (12 November):** the owner decided the larger hubs each have a town that grows and receives freight. The
> stand-in town each hub leg owes is listed in [campaign-outline](campaign-outline.md#towns-at-the-hubs), section 4; this
> plan is not otherwise changed.

## 1. What "greybox" means for one area

A reviewer ticks all ten per area. Nothing else is in scope.

- [ ] **A real server line.** The area's leg is laid track on a `RAIL_LINES` row (a new row, or line 2 grown), along
      the blockout's corridor, with trains that stop at its halts. Sync kind: Server.
- [ ] **A stand-in bill, in sections.** The leg is cut into sections; each is one frame at the railhead with a bill of
      logs and rails only, brought by the kit train to a rack beside it (Q7's pattern: the last carry is under 15 m).
- [ ] **A walkable massing with a halt.** The blockout's island as static colliders, a 40 m platform each side, a
      request lever and a departure board. No interiors, no folk.
- [ ] **One placeholder pickup** that grants the area's ability as a flag for the room.
- [ ] **One stand-in gate** that takes an ability: a barrier across a frame, opened with Interact by anyone once the
      room holds the flag. No new movement, tool or physics.
- [ ] **The loop-graph node is built, not a stand-in.** Its entry leaves `dev/loop/standins.ts` and joins `NODES`.
- [ ] **A bot segment and a jump-in row** for the area's start and its end.
- [ ] **A join, leave and rejoin proof** at the area's mid-state (a section half fed, kit aboard a train).
- [ ] **Measured minutes** for one, two and three players, beside the model's allowance.
- [ ] **A device line:** one frame-time reading at the area's halt on the Mac (reported, not a gate).

### The bill: no hand-carried footings

The outline's finding: 228 footings on the stand-in bills are 82 of 157 modelled solo minutes, at 21.6 s a footing
against 2.9 s for any other unit. Friends barely shorten that, because the kiln and one wagon set the pace. Build 2's
design review already removed footings from the steel bill for the same reason (ruling B: 70 to 199 s idle at the
rack), and the owner called the one-at-a-time carry "the most pain". A greybox whose length is mostly footing carries
would measure the grind, not the route.

**The stand-in unit is the kit unit: a log or a rail on a train's kit car.** Why this one:

- It exists and is measured. `LINE2_KIT` holds 32 logs and 32 rails; Q6 and Q7 are fed this way today.
- A section's bill is **20 logs + 20 rails** (Q7's bill), so one train brings a whole section in one trip, and two
  or three players split the rack-to-frame carries evenly.
- It adds no material. Steel, copper, fibre and crystal on the model's bills are charged as rails. Each new
  material's producer is that area's depth design, so the greybox does not invent one.
- A sea leg's trestle bents rise with the section as view, from the section's laid state. Nobody casts or carries
  them. Whether far legs ever take footings by hand is [question 1](#open-questions).

Bills keep the model's total within one section, so the table stays comparable with the outline's:

| Area | Model's bill (units, of which footings) | Greybox bill | Sections | Haul at 2.9 s a unit (arithmetic) |
| --- | --- | --- | --- | --- |
| 4 High Gorge | 160 (32) | 160: 80 logs + 80 rails | 4 of 425 m | 8 min |
| 5 Bell Rock and the bay shortcut | 154 (48) | 160 | 2 + 2, about 600 m | 8 min |
| 6 Canopy Town | 156 (24) | 160 | 4 of 300 m | 8 min |
| 7 Sea cave, Saltpan, Port Quay | 270 (66) | 280 | 7 of 171 m | 14 min |
| 8 The White Wall | 252 (50) | 240 | 6 of 637 m | 12 min |
| 9 The Notch and the causeway | 25 (8) | 24: two sections of 6 + 6 | 1 + 1 | 1 min |
| **Total** | **1,017 (228)** | **1,024, no footings** | **24** | **about 50 min** |

So the greybox should read near the outline's floor row (2:00 solo) before rides and waits. That is the intended
result: it shows the gap that authored play has to fill (the model budgets 160 minutes of it), which is the outline's
decision 2 as recommended ("never larger bills").

## 2. Design

**Sync kinds.** The railway is Server kind ([sync](../agents/sync.md)): no `src/world/rules/` file, no `Rules`
entry in `src/world/rules/types.ts`, no `edits` generator, no `env` fact. The sim stays in `src/sim/` under
[lockstep](../agents/lockstep.md) math (integer cm and ticks, `+ - * /`, `Math.sqrt`).

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| Each leg's sections, stock and lay clock | Server | server | new component `Leg`, systems in new `src/sim/railway-sys-route.ts` |
| Grants, gates opened, the arrival | Server | server | new component `Route` (`grants`, `gates` bit masks; `arrived` tick, -1 never) |
| Halts opened by a leg, trains by stage | Server | server | `RailHalt.leg`, `RailLineDef.fleet` in `railway-lines.ts` |
| Massing, platforms, frames, racks, barriers, pickups, trestle | Local, from accepted state | each tab | new `src/entities/route-greybox/` |
| The thanks card | Local, on the `arrived` edge | each tab | `src/features/ending-card.ts` |

**The catalog** is new `src/sim/railway-route.ts`, pure integers, the only place a leg, grant or gate is defined:

```ts
export type RouteSection = { toCm: number; logs: number; rails: number; gate?: number }; // gate: RAIL_GATES index
export type RouteLeg = {
  id: string; area: number; line: number; fromCm: number; sections: readonly RouteSection[];
  railheadHalt: number; // a halt index on the SIM line: the moving railhead
  destRowHalt: number; // a halt index on the CATALOG row (WORLD_LINES): the halt the last section opens
  after: number; // RAIL_LEGS index that must be complete first; -1: Ring Island joined
  kit: 'home' | number; // where its trains load: the line's Home halt, or a junction yard (a RAIL_YARDS index)
};
export const RAIL_LEGS: readonly RouteLeg[];
export const RAIL_GRANTS: readonly { id: string; label: string; leg: number; at: RailPlatform }[];
export const RAIL_GATES: readonly { id: string; label: string; needs: number; at: RailPlatform }[];
export const RAIL_YARDS: readonly { id: string; halt: number; fedBy: number }[]; // a junction: fedBy's trains unload here
export const ROUTE = { branchFirst: 'gorge', branches: 'both', ending: 'card', upgrades: 'one' } as const;
```

**State.** `Leg { slot, laid, logs, rails, start }` keyed by `slot`, one row per `RAIL_LEGS` entry (`laid`:
sections complete; `logs`, `rails`: fed into the current section; `start`: its lay clock, -1 idle). `LegYard { slot,
logs, rails }` per `RAIL_YARDS` entry. `Route { grants, gates, arrived }`, one row.

**Ops** (validated in `src/world/railway-server.ts`, predicted in `railway-predict.ts` as `rail.footSet` is):

- `rail.legStock { leg }`: put what you carry into the current section's frame. Refused when the leg is not open
  (`after` incomplete), the section's gate is shut, the back is empty or wrong, or the player is out of the frame's reach.
- `rail.grant { id }`: take a pickup. Refused until its leg's last section is laid, whoever is standing there.
- `rail.gate { id }`: open a barrier. Refused unless the `needs` grant bit is set.
- `rail.arrive {}`: at the meeting marker. Refused until the causeway's last section is laid and a train has stopped
  at the Original Island halt; sets `arrived` once.

Carrying, the rack and the lever use today's ops (`rail.rackTake`, `rail.call`) unchanged.

**Rules that change.** `trainStopsOf(line, laid, ring, legs)` gains the legs' `laid` counts: a halt with
`leg: { slot, section }` opens when that section is laid, and a leg's railhead halt takes `heads[laid]`, as the
Railhead halt does with `RING_HEAD`. `kitJob`, `kitStop` and `kitOwed` become per line: the active section's bill
loads at the line's kit halt (or its yard) and unloads at the leg's railhead. `RailLineDef.fleet` lists how many
trains run at each stage, so a longer line wakes more trains (`trainPlaces` checks every stage at load).

**Invariants** (`src/sim/railway-check-route.ts`, called from `railwayCheck`): `0 <= laid <= sections`; fed stock
never over the section's bill; a gate bit only with its grant bit; a grant bit only with its leg complete; `arrived`
only with the causeway complete; kit units loaded equal units aboard, racked, in yards and fed.

**Controls.** No new action, pad slot, key or touch button: every press is the existing Interact, with a guide row
per prompt ("Feed the frame", "Take", "Open"; placeholders). Blocked prompts show with their reason (build 2's
ruling E).

**Cosmetic.** Everything in `route-greybox`: grey boxes, a striped barrier, a coloured post for a pickup, a white
post for the meeting marker, trestle decks drawn from `laid`. Effects play from the prediction or the mirrored change
in the adapter, never in a system.

**Each default is one switch.** `ROUTE` holds the outline's unanswered defaults (both branch areas, High Gorge first,
fixed order; the ending as a ride, a marker, one shared moment and a card; one upgrade per ability). The mainland
stays the backdrop mesh, and the three kept double-backs are the three long-range rows of `RAIL_GATES`. Changing a
switch regenerates the catalog and costs one `WORLD_NS` bump; no rule reads the switch at run time.

## 3. The legs, in route order

The line shapes follow [rail-map](rail-map.md)'s five services (owner's answers, 10 November), not the eight catalog
lines. Size is the outline's U (Split-rock Works = 1); a greybox leg is far under its area's depth size.

| # | Leg (area) | Rail | Length | Built from | Needs that does not exist | Reuses | Size |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Stack line to High Gorge (4) | Line 2 grows on from Ring Island | 1.70 km, all sea | Ring Island's west shore | The leg and route systems; the sea trestle as view; fleet by stage; massing on by default | Q7's kit, `RING_HEAD`'s moving railhead, build 1's halt kit | **L** (carries every shared system) |
| 2 | The incline and the bay shortcut (5) | New row `ns` (High Gorge to Bell Rock); new row `bay` (West landing to Bell Rock) | 1.16 + 1.23 km | The Gorge; Home's West landing | A junction yard at the Gorge; a second kit halt at Home; Bell Rock on two levels | Leg 1's systems | **M** |
| 3 | Bell Rock to Canopy Town (6) | `bay` grows on | 1.20 km | Bell Rock | Canopy's cleft as a cut in the massing; a loop end | Leg 1's systems | **S** |
| 4 | The cave line (7) | New row `cave` (West landing, Saltpan, Port Quay) | 1.20 km (the 0.48 km lift is not rail) | West landing | The cave as a covered stretch; the plug | Leg 2's Home kit halt | **M** |
| 5 | The White Wall (8) | Line 2 grows on from the Gorge to Canopy and Port Quay | 3.82 km | The Gorge end | Twelve trains on one line; six islets from one kit | Leg 1's systems | **M** |
| 6 | The Notch and the causeway (9) | `bay` grows to Lantern Notch; `ns` grows to the Original Island | 0.88 + 0.75 km | Canopy; Bell Rock | The arrival fact; the card | Leg 2's yard | **S** |

**Where a leg meets a new mechanism.** Each is marked, and its stand-in decides nothing about it:

| Leg | The mechanism | Status | The stand-in |
| --- | --- | --- | --- |
| 1 | The Gorge's vertical play: the stair, the lift, mining | **Needs `/brainstorm --panel`** (a big new area) | The halt, the pickup and the gate all stand at platform level in the split. The 85 m tops are massing nobody is sent to |
| 1 | The powered pick as a tool | Needs `/brainstorm` | A flag, `pick`. It opens barriers with Interact |
| 2 | Bell Rock as a junction on two levels | Decided as a layout (rail-map question 3); its play needs `/brainstorm` | Two decks and a plain ramp between them |
| 2 | How goods cross Home to the West landing | Needs `/brainstorm` (Home's seam, ruling 6) | The West landing's kit halt draws on the same depot stock as the Village's |
| 3 | Canopy's town in the trees; the carry sling | Needs `/brainstorm --panel` | A flat deck at 12 m; `cloth` is a flag |
| 4 | Breaking the sea-cave plug | Needs `/brainstorm` | A barrier on the cave leg's first frame that takes `pick` |
| 4 | Salt sliding; the crane lift to High Port | Needs `/brainstorm` | Saltpan is a halt. The leg ends at Port Quay; High Port's top is massing with a plain ramp |
| 5 | Crystal collars for the deep span | Needs `/brainstorm` | A barrier on the fourth section's frame that takes `seeds` |
| 5 | The lap: the ring's two halves joined | A technical plan, not a brainstorm (rail-map finding 5) | Line 2 and the cave row end at buffers side by side on Port Quay; you change trains ([question 2](#open-questions)) |
| 6 | The glide to the arch; lighting the lantern | Needs `/brainstorm` | A barrier on the Notch frame that takes `cloth`; a pickup `lantern` at the Notch opens the causeway's barrier |
| 6 | The meeting with The Boogler | The owner's (story and characters) | A white post, labelled "Meeting (placeholder)". No Boogler line is written or changed |

**Pickups and gates, all of them.** Five pickups, six barriers; each area has one of each kind it needs.

| Area | Pickup, at its halt once the leg is laid | The barrier in that area, and what it takes |
| --- | --- | --- |
| 4 High Gorge | `pick` | The incline's first frame, at the Gorge halt: `pick` |
| 5 Bell Rock | `seeds` | Bell Rock to Canopy's first frame: `seeds` |
| 6 Canopy Town | `cloth` | The Notch frame at Canopy: `cloth` (it stands shut, in view, until leg 6) |
| 7 The Port | none (the crane and the faster engine are components; not in the greybox) | The cave plug at Home's West landing: `pick` (the main double-back) |
| 8 The White Wall | none | The deep span: `seeds` |
| 9 The ending | `lantern`, at the Notch | The causeway's frame at Bell Rock: `lantern` |

The hook reel and the carry sling are named in `RAIL_GRANTS` beside `pick` and `cloth` and do nothing in the greybox.

## 4. World-scale prerequisites

| # | Prerequisite | Smallest first step | When | Lane |
| --- | --- | --- | --- | --- |
| P0 | **The map data is stale.** `src/sickle/world-lines.ts` still has Ring top, the rail lift to High Port and 63 of its 109 spans steeper than the ruled 4% | Edit `SERVICES` in `dev/level/world-blockout.ts` to rail-map's five services and the three grade rules; regenerate; add the test world-blockout asks for (no future span over 4%). The owner approved this as "its own small reviewed change" | Before leg 1 | Mac |
| P1 | **Streaming: one island resident at a time** (map-prototypes question 3, unanswered; default yes) | Split the blockout's massing by area. `route-greybox` loads an area's colliders and near mesh when you are within 400 m of its shore or aboard a train bound for it, and frees the last one; the default silhouette stays for the rest. Proved at the Gorge with a mesh and collider count before and after | Leg 1, step 4 | Mac |
| P2 | **The coast texture** covers 2 km round Home; every island past Ring Island is outside it (world-blockout conflict 9; ruling 9 keeps the foam lip and shallows on any landed island) | Greybox massing registers no shore, so nothing breaks and far islands have no foam. First step: one measurement at the Gorge of a second coast texture bound to the resident island (P1's switch), reported to the sea's owner. Not built in the greybox unless it is cheap | After leg 1 | Mac |
| P3 | **Far ground for new islands** ([rendering](../agents/rendering.md): tiles with real bounds, three levels, stitched borders) | Greybox massing is boxes: one merged mesh per island and material, with real bounds, never `frustumCulled = false`. Tiling starts only when an island gets real ground in phase C | Leg 1, step 4 | Mac |
| P4 | **Save resets** | See below | Each bump | HOTBOX |

**`WORLD_NS` bumps: two planned, six at most.** Bump G1 ships with leg 1 and installs everything whose order is
fixed by the catalog: the `Leg`, `LegYard` and `Route` components, the four ops, **every** row of `RAIL_LINES`,
`RAIL_LEGS`, `RAIL_GRANTS` and `RAIL_GATES` for legs 1 to 6, and all the train rows, with nothing laid. A leg not yet
built is closed by its `after` chain, so later legs change rules and unlaid positions, not the saved shape (the
world-blockout brief's point 8). Bump G2 is held in reserve for the first leg whose build has to reorder or add a
catalog row; taken once, it carries every pending reorder. The ceiling is one bump per leg. Each bump ships when
ready, outside the owner's sessions (`npm run heartbeat` first), under "Nothing waits on a world bump". **Combine
where timing allows:** if build 2's v28 or one of slice 5's two bumps is review-clean in the same batch, G1 shares
its bump; none of the three waits for another.

## 5. The ending in greybox

Nothing authored. Four pieces, all in leg 6:

1. **The causeway** is the `ns` row grown 0.75 km from Bell Rock to a loop on the Original Island, as one section of
   6 logs + 6 rails behind the `lantern` barrier.
2. **The arrival fact** is `Route.arrived`, set by `rail.arrive` at the marker, saved with the world.
3. **The meeting marker** is a white post 12 m from the island's platform, labelled "Meeting (placeholder)".
4. **The thanks card** is a Local DOM card on the `arrived` edge: "Thanks for playing (placeholder)" and a Close
   button. Everyone in the room sees it at once, which is the one shared moment. A player who joins later sees no
   card; the post reads "Arrived". Trains keep running and the world stays open.

The classic island's geometry (`src/island`) is not loaded: the Original Island is the blockout's massing. Whether
The Boogler's island is the classic terrain is the ending's own depth plan.

## 6. Order, lanes and what the owner can play

Two machines, about three agents each. The Mac judges anything seen; HOTBOX takes rules, server and tests. Slice 5
and build 2 run beside this on HOTBOX and are not touched here: this plan adds files rather than editing
`railway-sys-steel.ts`, the trade files or `Steel`. The shared files are `railway-components.ts`, `railway-lines.ts`,
`railway-queries.ts`, `railway-server.ts` and `namespace.ts`; edits there are appended blocks.

| Order | HOTBOX | Mac | The owner can play |
| --- | --- | --- | --- |
| Now | P0's test; leg 1 steps 1 to 3 | P0's map data; leg 1 step 4; `/brainstorm --panel` High Gorge | |
| Leg 1 ships (G1) | Leg 2's `ns` and `bay` rules, the yard | Leg 2 and 3 massing; P2's measurement | https://boogle.club/?from=gorge-open and https://boogle.club/?from=gorge-reached |
| Legs 2 and 3 | Leg 4's rules; leg 5's fleet test | Leg 4 and 5 massing | https://boogle.club/?from=bell-reached and https://boogle.club/?from=canopy-reached |
| Legs 4 and 5 | Leg 6: the arrival; the loop to the ending | Leg 6 massing; the card | https://boogle.club/?from=port-reached and https://boogle.club/?from=wall-closed |
| Leg 6 | The exit table | The device runs | https://boogle.club/?from=causeway-open, then the whole ride from https://boogle.club/?from=ring-joined |

Legs 2 and 4 both start at Home and do not depend on each other's rules, so HOTBOX may build 4 before 3 lands. Each
jump link works once its leg has shipped; a new jump room each time.

### Leg 1 in detail: the stack line to High Gorge

Each step leaves `node dev/ship-check.ts` green. Steps 1 and 2 ship on their own; 3 to 5 ship together as bump G1.

- [x] **1. The map data (P0; Mac, S).** In `dev/level/world-blockout.ts` set `SERVICES` to rail-map's five services:
      no Ring top; line 2 runs on from the Ring Island halt along the west shore; the Gorge halt at 3 m in the split;
      one West landing halt; the cave line ends at Port Quay; decks meet islands at their height; no span over 4%.
      Regenerate `src/sickle/world-lines.ts`, the legs table and `docs/world/world-blockout.html`. Verify:
      `test/world-lines.test.ts` gains "no future span is steeper than 4%"; `npm run level-check` lists none of today's
      12 would-fail reports for `stack-centre`.
      *As built (11 November):* the catalog is five rows, `ring` (ringx to the halt, then the ledge to the Gorge), `ns`
      (incline, causeway), `bay` (bay-cut, bell-canopy, notch-tunnel), `bay-trestle`, and `cave`, which per the design
      review carries the White Wall from Port Quay to the Gorge (not "the cave line ends at Port Quay"). The lift is in no
      row. Leg 1 is 2.05 km (458 m of bow to the halt, then 2.05 km of ledge), sections to be cut at places in step 2. Heights
      come from the rulings in the generator (station decks, island plateaus, sea deck 4 m, eased at 3.9%), not the map JSON,
      which the 2D page and the live blockout still draw; the Gorge halts are 3.0 m. All 299 spans are at or under 4%
      (was 63 of 109 over). The redrawn links (ringx trimmed, ledge round the island's south and west shore with a
      cutting for its first 300 m, ring-bell from the same halt, seacave from the bay's West landing, wall-s from the quay)
      live in `ROUTES`. Bell Rock is on two levels as rail-map has it: the `ns` halt at the water (4 m), the `bay` halt on the
      skerry (15 m). One place, two halt positions: the Ring Island halt differs by 30 m between `ring` and `bay-trestle`
      and West landing by 37 m between `bay` and `cave`, so step 2's sectioning must treat each pair as one place. The
      map JSON's rails were not regenerated then; see "Map JSON rails" at the end of this plan. Row ids changed, so `dev/level/rail-map.ts` follows (its prose maps, `rail-map.html` regenerated).
- [x] **2. The catalog, pure (HOTBOX, S).** `git mv src/sickle/world-lines.ts src/sim/railway-world-lines.ts` (it is
      written to the sim's rules; update the generator's path and the three readers). Create
      `src/sim/railway-route.ts` with the types above and all six legs' rows derived from it: `sectionsOf(leg, n)`
      cuts a leg into `n` equal sections on whole centimetres; `pathOf(pts)` samples a line every 10 m with
      `Math.sqrt` only. Verify: new `test/railway-route.test.ts`: every leg's sections cover its length exactly; bills
      match the table in section 1; each `after` and `needs` points backwards; the three long-range gates equal
      `standins.ts`'s `GATES`.
      *As built (11 November):* `src/sim/railway-route.ts` holds eight `RAIL_LEGS` (stack, incline, bay-cut, bell-canopy,
      cave, wall, notch-tunnel, causeway: legs 2 and 6 are two rows each, so "six legs" are eight entries) and 22 sections, per
      the design review (change 4, call 21: 20 + 20 a section, the ending 6 + 6), not the section 1 table's 24 sections and
      1,024 units. Sections end at places: equal cuts (`sectionsOf`) where the leg has no place on the way (the stack leg's
      four of 510 m; the incline 2 x 568 m; bay-cut 2 x 604 m; bell-canopy 3 x 401 m), halts, and the Wall's islets
      (each islet's closest pass to the `cave` row, cm 210027, 253697, 417718, 471680, held by a test to within 1 m of the
      map JSON; the Wall's sections are 850, 437, 822, 818, 540 and 593 m. Four of them are over the 650 m guide because
      4.06 km in six cannot average less; both ending sections, 865 m and 726 m, are over it too. The sixth, the deep
      gap, carries the `seeds` barrier, not "the fourth"). The
      cave's far mouth is not in the map data: the West landing to Saltpan span is cut in halves. `RAIL_GRANTS` are four
      (`pick`, `seeds`, `cloth`, `lantern`; the hook reel and sling are out, per the review) and `RAIL_GATES` six, standing
      at their halt or frame (placeholder positions; step 4 moves pickups off the platform). `RAIL_PLACES` lists the pairs
      that are one place (Ring Island halt, West landing, Gorge, Bell Rock, Canopy), tested within 40 m. Step 3 needs:
      `ROW_LINE` (`ns`, `bay`, `cave` appended after line 2 as lines 2, 3, 4), one railhead halt per leg appended after each
      row's catalog halts in `RAIL_LEGS` order (line 2: `railheadHalt` 6, then High Gorge as `destRowHalt` 1 of the catalog row, which
      step 3 maps to its own halt index), and the one yard (`gorge`, fed by the stack leg) used by the incline and causeway
      kits. Nothing here is read by the sim yet. The catalog file moved with `git mv` to `src/sim/railway-world-lines.ts`; its generator's `--check` (and any rerun) needs
      `node --import ./dev/sim/hooks.ts dev/level/world-blockout.ts`. A `RouteLeg` carries `railheadHalt` (a sim-line halt
      index) and `destRowHalt` (a catalog-row halt index), kept apart on purpose.
- [ ] **3. The rules (HOTBOX, L).** `railway-components.ts`: `Leg`, `LegYard` (kind `'legYard'`: `Yard` is the town economy's crate yard on main), `Route`, spawned in catalog order in
      `createRailwayWorld`. New `railway-sys-route.ts`: `rail.legStock`, the lay tick (a section lays over
      `layTicks`, as a QJob does), `rail.grant`, `rail.gate`, `rail.arrive`. `railway-lines.ts`: line 2 gains a
      `Stack railhead` halt (`heads`, a stub end) and `High Gorge` (buffers, a crossover before it), `fleet` of 3, 4, 5
      and 5 trains as sections 1 to 4 lay, and the `ns`, `bay` and `cave` rows with every halt closed. `railway-train.ts`
      and `railway-queries.ts` as section 2. `railway-server.ts` validates the four ops (`railInt` on every id; a
      malformed value is refused, never thrown). `railway-check-route.ts`. `namespace.ts`: the bump and one dated
      line. Verify: `test/railway-route-rules.test.ts`: each refusal above; a section lays and the railhead halt
      moves; the Gorge opens on the fourth; `pick` is refused before it and granted after; the existing mixed-fleet
      fuzz, 20,000 ticks under random lever asks on the grown line, keeps `sepCm`, the end blocks and a 105 s worst wait.
      *As built so far (12 November; not shipped, held at the gates; no bump, no fixtures yet):* the rules are on the
      local branch `wip/greybox-leg1-step3`. **Held:** the 105 s worst wait on the grown line fails (line 2 up to 1,169
      ticks with four trains and 1,130 with five at the Gorge, the WAIT_BOUND way; 1,440 in the whole-leg fuzz), and
      stone stops while the leg is built (every train carries a waiting kit and slice 5's call 4 refuses it a freight
      stop); both await rulings. In plain words, for the designer:
      - **When a leg opens:** the stack leg opens the moment Ring Island's rivet is struck (its `after` is -1). A leg
        whose rules are not built yet (legs 2 to 8: their line holds no railhead halt) never opens, whatever its `after`.
      - **What a train loads, and where:** at the Village (line 2's home halt) a train loads one section's kit (20 logs,
        20 rails; logs minted as the depot's, rails off the forge rack, holding up to 11 s for rails as Q6's kit did)
        while the leg still owes kit: all its remaining sections at once (`kitLead`, "all remaining", the longest leg's
        section count). It keeps running its service with the kit aboard. At the leg's rack (Ring Island's halt while
        nothing is laid, then the stack railhead) it unloads only what the current section still lacks; the rest rides
        on until a later railhead opens. The rack is Q6's and Q7's depot rack (`Rail.depot`, `Rail.depotRails`), taken
        with today's `rail.depotTake` and `rail.depotRailTake`, judged at the current frame once the Q jobs are done.
      - **`kitOwed`, per line:** a Q job's kit first (Q6, Q7: before any leg opens); with none, an empty train is owed a
        kit when its line's open leg still has kit to load. Slice 5's freight rule reads it: a train owed a kit, or
        carrying one, makes no stone stop.
      - **When the stack railhead is a stop:** from the first section laid, at the last section laid's end (10 m short
        of it, a stub end that moves on with each section); once the Gorge opens on the fourth it stays a stop at the
        third section's end, as the Railhead stays at bent 13 (a departure the orchestrator accepted).
      - **The fleet by stage:** 3, 4, 5, 5 and 5 trains with 0 to 4 sections laid (call 26; since ruled 3, then 5:
        below). The extra two are rows
        that wait in a shed (phase `SHED`, hidden, on no board) and join at the Village on the up track, one at a time,
        once their stage runs them and the Village's end block is clear and every train is a block's gap away.
      - **Lay time:** a section lays 30 s after its last unit is fed (`LEG_TUNE.layTicks` 300), whatever its length.
        `kitLead` and the lay time are constants in `src/sim/railway-route.ts`, not room tunables (accepted for now).
      Built: `Leg`, `LegYard` (nothing feeds it until leg 2) and `Route`, spawned last; `src/sim/railway-sys-route.ts`
      (`rail.legStock`, the lay tick, `rail.grant`, `rail.gate`, `rail.arrive`), `railway-sys-route-kit.ts` (the kit on
      the trains), `railway-queries-route.ts`, `railway-check-route.ts`; line 2's stack railhead and High Gorge halts
      and its path on to the Gorge; `ns`, `bay` and `cave` as lines 2 to 4, every halt shut, no trains (their train
      rows come with leg 2 and its own bump). The server validates the four ops (catalog indexes, judged at the frame,
      the post or the marker). Departures, accepted by the orchestrator: the "gate shut" refusal of `rail.legStock`
      cannot be tested yet (no built leg has a barrier on a section; the incline's opens only once leg 2 is built);
      conservation (`railCounts`, the depot and shelf sums) stands in for "kit loaded equals aboard, racked and fed",
      which units carried off break; `rail.arrive` checks that a train stands at the causeway's end now; the `ring`
      row's centimetres run 100 cm ahead of line 2's s (the generator measured the pier head along Place's sampled
      path, line 2 counts from RING_S_HEAD), so the rules shift the row rather than regenerate the catalog or move
      line 2's halts (a comment in `railway-route.ts`; a test ties the shift to the catalog and to line 2).
      **Not predicted:** `railway-predict.ts` is unchanged, so `rail.legStock`, `rail.grant`, `rail.gate` and
      `rail.arrive` wait for the server: the player's press shows nothing until the reply, about one round trip later
      (a feed whose units leave the back late, a post or barrier that answers late). Acceptable for the greybox, not
      final: the views step decides. **The endMoved test** (`test/railway-trains.test.ts`, "endMoved at Far Head is
      v26's Q6 hunk, row for row"): it drives `endMoved` with its own rows for line 2's first three trains only and
      checks the world's tick moves them exactly as v26's Q6 hunk did. With the fleet rows, `endMoved` and `stopMoved`
      walked slots the test's IO holds no row for and threw; they now skip a slot with no row (a shed train is never
      moved anyway), so the test passes unedited and every train it holds moves as before.
      *As built after the step 3 rulings (rounds 1 to 3, 12 November; still local, no bump, no fixtures, not rebased
      onto build 2):* the rules the designer ruled, in plain words. **Fleet:** 3 trains, then 5 from the first section
      laid (A.4). **Kit:** all remaining kit owed at once, one kit a train, carried on at most the running trains less
      one (`kitTrains`, C): a room that does nothing after the rivet rests by +1,500 with kit 1 on the rack, two trains
      carrying a kit each and one empty kit car (60 logs and 60 rails loaded, not 80). **Stone (D):** a train makes no
      stone stop while it is owed a kit or carries one it can unload at a halt open now; a train whose kit waits for a
      railhead not yet open is an ordinary train and stops for stone (one line in slice 5's `freightStop`; no slice 5
      test assertion moved). **Prediction (F):** `rail.legStock` is predicted on the client; a press that fills the
      frame shows it full and the lay starts only when the server says so. `rail.grant`, `rail.gate` and `rail.arrive`
      still wait for the server (once a leg, once a game). **Block signals (round 2):** line 2 has holds with no
      platform at the stack line's section ends but the last (`RailLineDef.signals`). The block rule lets a train plan
      a leg only when its whole length is clear of the train ahead, and the 1.5 km from Ring Island to the railhead had
      nowhere to stop, so followers stood at Ring Island until the leader reached the end (5,408 standing ticks there in
      8,000 at three laid); at the signals a train follows block by block, and the quiet lap is within 3.3% of non-stop
      at every stage. Riders cannot step off at a signal. The headway hold is unchanged: it is worked out every tick from
      the open stops' non-stop lap and the running fleet (73 to 74% of an even split of the measured lap at 75%), and it
      barely binds under the fuzz's asks (0, 0, 19, 416 and 932 standing ticks over 20,000 at 0, 25, 50, 75 and 100%).
      **Gates (round 3's list, base `a82a0d6e`, four seeds at 75%):** 1 to 4 pass (every stage before the rivet on
      main's tick and rows; at `ring-joined` only the kit, depot and forge fields and the new rows differ). 5 passes:
      a full load's longest wait 1,266 at the rivet inside its first-lap allowance (the quiet lap, 1,426), then at most
      1,136; landed 32, 32, 40, 32, 32 at 0 to 4 laid; 32 from `crossing-done` and the idle rivet; no stone stop on a kit
      errand. 6, 7, 10 to 14 and 16 pass (ride 1.03, 1.02, 1.03, 1.03, 1.01; whole-leg worst 1,478; a train at the new
      railhead within 1,135 ticks of every lay; joins 449 ticks after section 1; rivet to Gorge 3,055, idle 651, 536,
      355 and 309). **8 and 9 fail at 75%** and are printed, not asserted, until the owner answers question 1: fixed
      stages worst 1,395 (two laid, 5eed), 1,307 (four laid); settled worst 1,430 and mean 543 (badd), 1,217 (777);
      typical waits about 50 s, 1.5 to 1.8% of waits over 1,158. None of 0, 25 and 50% passes them either. The stage-0
      part of 9 passes (worst 908, means 340 to 384). 15 is not run (build 2 is not on main). **Open owner question 1:**
      the grown line's wait bound.
- [ ] **4. The views and the massing (Mac, M; P1 and P3).** New `src/entities/route-greybox/`: `index.ts` (plug-in
      lifecycle), `massing.ts` (the Gorge's stacks and split from `src/proto/greybox/blockout.ts`, one merged mesh per
      material, resident by P1's rule), `leg-view.ts` (deck and trestle bents from `laid`, the frame, rack, bill sign
      reading "0 of 20", the barrier, the pickup post). `src/adapters/railway-read.ts` and `railway-intents.ts`: the
      mirrored `legs` and `route`, three prompts through the interaction registry. `?blockout=world` keeps the areas
      not yet built. Verify: `/look` at `--rail-seed gorge-open` (the first frame and rack on the island's west shore)
      and `gorge-reached` (the platform in the split); the look harness's mesh and collider counts with the Gorge
      resident and not.
- [ ] **5. Seeds, jump rows, the loop and the bot (HOTBOX, M).** New `src/sim/railway-seed-legs.ts` from
      `ring-joined`, accepted ops only: `gorge-open` (the leg open, nothing fed), `gorge-mid` (two sections laid, kit
      aboard a train), `gorge-reached` (four laid, `pick` not taken). `SEED_STAGES`; two `JUMPS` rows ("Stack line
      open", "High Gorge reached"; placeholder UI text, logged in agent-calls by the orchestrator).
      `dev/loop/graph.ts`: nodes `stack-1` to `stack-4`, `gorge` and `pick`, bills and positions imported from
      `RAIL_LEGS`; `standins.ts` drops a slot whose area has built nodes. New `dev/look/bots/railway-legs.ts`, one bot
      driven by `RAIL_LEGS` for every leg; `dev/look/segments.ts` gains `gorge`. Verify: `npm run loop -- node
      stack-1` and `-- node gorge` print the bill, the train supply and the cue; `npm run loop -- run` plays area 4
      through the rules and models 5 to 9.

**Checkpoint A (leg 1 playable).** Named proofs, run once: `npm run loop -- run` for one to four players, with idle
seconds per wait beside minutes per section; the bot segment `--from ring-joined --to gorge`; `npm run test:net`;
`npm run scenario -- reconnect-edit` extended to take `--rail-seed gorge-mid` (a second tab joins; the first leaves
carrying a log and rejoins after a server restart; `Leg` and the kit aboard are unchanged); the two stills above;
one frame-time reading at the Gorge halt; `npm run perf` if step 4 added more than the measured blockout's 58 draws.
The independent review covers steps 2, 3 and 5 as one batch before they reach main.

Legs 2 to 6 repeat steps 3 to 5 on the systems leg 1 built, each with its own checkpoint of the same proofs at its
`-mid` seed. Their extra work is the "needs that does not exist" column of section 3, and each gets its level check
before its design review.

## 7. Exit evidence

- `npm run loop -- run` reports no stand-in: areas 4 to 9 are played through the rules, for one to four players.
- The bot rides wake to `arrived` with no skip, as a chain of segments (the long run is on command, once, here,
  because this checkpoint changes the whole flow).
- This table, filled from those runs, with idle seconds per area:

| Area | Model's allowance | Outline's stand-in (1 / 2 / 3 players) | Measured 1 | Measured 2 | Measured 3 |
| --- | --- | --- | --- | --- | --- |
| 4 High Gorge | 72 | 25 / 23 / 23 | | | |
| 5 Bell Rock | 30 | 27 / 25 / 25 | | | |
| 6 Canopy Town | 42 | 21 / 19 / 19 | | | |
| 7 The Port | 48 | 41 / 37 / 37 | | | |
| 8 The White Wall | 48 | 35 / 32 / 32 | | | |
| 9 The ending | 18 | 7 / 7 / 7 | | | |

- A join, leave and rejoin proof per area, and one empty-room proof (the room left for an hour mid-leg: nothing moved).
- The owner rides it once, from https://boogle.club/?from=ring-joined to the card, and rules on the outline's
  decisions 1, 2 and 7 with the table in hand.

## Level findings

`npm run level-check` was run on this branch (11 November, world v27). The pickups, barriers and frames are placed
relative to halts in the catalog; their exact positions are step 1 and step 2's output, and each leg reruns the check
on them before its design review.

1. **Planned track would fail today: 12 reports**, all on the future lines as drawn. On leg 1: a 124° kink at s 1700
   and grades of 4.4% to 209.6% within 5 m where the stack line meets the split. The others: an 87° and a 132° kink and
   grades to 342% on the wall at Canopy's cleft; kinks of 52° on the bay line at Bell Rock and 49° and 27° on the cave
   line. Measured separately: 63 of 109 future spans are over 4%. Step 1 (P0) has to clear leg 1's; each later leg
   clears its own.
2. **The check does not walk the far islands.** It composes Home and `dev/layouts/*.json`; the blockout's massing is
   not in it. Each leg adds its island to the check with three assertions: the pickup and the frame are reachable
   on foot from the platform; the barrier's far side is not; nothing is under the sea or on ground too steep.
3. **Every far island can be reached early by swimming**, and by a glide wherever a deck is high enough. So no
   pickup or frame is gated by geometry: `rail.grant` and `rail.legStock` refuse until the leg's own sections are
   laid, and an early visitor finds a post that reads "Not yet" (placeholder). For the designer: is an island you can
   swim to and stand on, hours early, acceptable in the greybox? The plan assumes yes.
4. **The Gorge's halt is at 3 m in a 90 m split under 85 m walls.** The greybox sends nobody up; a player who climbs
   the massing finds nothing. The stair and lift are the Gorge's brainstorm.
5. **The Ring Island loop report stands** (the neck's 165° reversal): build 1's, not this plan's; the stack line
   leaves the halt's west side and does not use it.

## Risks

- **Room safety ("Don't").** No effect in a system; a prediction is "queued, not done" (the server owns a section
  completing); no wall clock in the lay tick; `src/sim/railway-world-lines.ts` is under `src/sim/`, which the server
  image already carries whole, so `test/server-image.test.ts` needs no edit.
- **Mixed builds.** G1 is a clean break with no migration or fence. Every new op is refused by an older server.
- **Generic lines may not stretch** (outline risk 4): the v27 unit job already passed 10 minutes, and `lineStages`
  grows with every halt and head. Sign: step 3's fuzz or the unit shards slow by more than a minute. Then fix the
  line model before leg 2, not after.
- **Kit supply may add waiting.** 1,024 units come from Home's forge and depot, and every section waits for one train.
  Checkpoint A logs idle seconds; any wait over 60 s with nothing to do is a finding for the designer (build 1's
  bound), not a reason to add footings.
- **Hot files.** `railway-components.ts`, `railway-lines.ts`, `railway-queries.ts`, `dev/loop/graph.ts` and
  `dev/look/segments.ts`. `npm run inflight` shows one branch (`ship/matias-franco-17cd34b`, 0 h old) editing
  `graph.ts`, `segments.ts` and the ring bot: step 5 rebases on it.
- **Duplication, logged.** `Leg`'s moving railhead repeats `RING_HEAD`'s. Folding Ring Island's bents into `Leg` is a
  ranked leftover (P3) for after build 2, not done here, because build 2 is being built on those files now.
- **Performance.** The blockout measured +58 draws at Home with everything loaded; P1 keeps one island resident.
  Reported per leg; nothing is cut for it without the owner's word.
- **The greybox goes live.** Real server lines mean every player sees grey islands past Ring Island
  ([question 3](#open-questions)).

## Decided, default, new

| # | Call | Kind | Source |
| --- | --- | --- | --- |
| 1 | No quirks, barks, idles, bespoke props, copy or polish | Decided | Owner, 11 November |
| 2 | The whole map blocked out before areas go to depth | Decided | Owner, 10 November |
| 3 | The ring is one line; five services; Bell Rock on two levels | Decided | Owner's answers to rail-map, 10 November |
| 4 | 4% ruling grade; no Ring top; the Gorge halt low; the cave line ends at the quay | Default (orchestrator's rulings) | world-blockout rulings |
| 5 | Both branch areas, High Gorge first, fixed order | Default, a switch | Outline decision 1, unanswered |
| 6 | The ending: the ride, a marker, one shared moment, a card | Default, a switch | Outline decision 3, unanswered |
| 7 | The mainland is a backdrop; three double-backs; one upgrade per ability | Default | Outline decisions 4 and 7, unanswered |
| 8 | One island resident at a time | Default | map-prototypes question 3, unanswered |
| 9 | Stand-in bills are logs and rails on the kit train; no hand-carried footings | **New** | This plan; question 1 |
| 10 | Sections of 20 + 20, one train load each | New | This plan |
| 11 | The White Wall is built from the Gorge end as line 2 growing on; the lap changes trains at Port Quay | **New** | This plan; question 2 |
| 12 | A gate is a barrier that takes a flag; a pickup is a post | New | This plan; decides no mechanic |
| 13 | The whole catalog installs in one bump, closed | New | world-blockout brief, point 8 |
| 14 | The greybox route is on for every player as it ships | **New** | This plan; question 3 |

## Open questions

Closed (step 1 leftover, 12 November): the map JSON's rails are written from the catalog; see "Map JSON rails" below.

### Map JSON rails (12 November)

`node dev/level/world-blockout.ts` also writes the Sickle Isles option's rails in `docs/world/map-prototypes.html` (points
and heights, the ruling's corner vertices included) for every link a service runs over, from the catalog it builds. What
those links were before is in `dev/level/world-blockout-authored.json`, the generator's own input (the live game imports the
page raw, so the copies are not in it). `ringx` is copied into the option's own lines; `common` and the other options
(`eight`, `spine`, `climb`, `stones`) are as authored, and `layout` lets an option's line replace the shared one of its id.
`wall-s` now runs `quay` to `canopy` (it was `port` to `canopy`: the Wall grows from Port Quay and the lift is its own link,
so a trip over both is not counted twice). `test/world-lines.test.ts` fails if a rail is more than 0.25 m off a catalog
vertex or halt.

**The economy model follows the ruled route, on purpose.** `dev/economy/play-map.ts` takes each link's length from its
points, so the prototype's lengths and every reference run moved; the new lengths are the ruled route.

| Link | Before | After |
| --- | --- | --- |
| ringx (pier to ring) | 761 m | 458 m |
| ledge (ring to gorge) | 1,700 m | 2,050 m |
| ring-bell | 1,427 m | 1,579 m |
| seacave | 688 m | 740 m |
| wall-s (was port to canopy) | 1,849 m | 2,109 m (quay to canopy) |

| Reference run | mainH | endH | wallet |
| --- | --- | --- | --- |
| 1p gorge first | 5.699 to 5.710 | 12.072 to 12.083 | 8 to 10 |
| 2p gorge first | 5.219 to 5.217 | 11.673 to 11.671 | 11 to 8 |
| 3p gorge first | 5.166 to 5.165 | 11.624 to 11.626 | 11 to 10 |
| 1p canopy first | 5.635 to 5.629 | 12.021 to 12.014 | 8 to 9 |
| 2p canopy first | 5.046 to 5.049 | 11.532 to 11.532 | 8 to 9 |
| 3p canopy first | 4.863 to 4.876 | 11.324 to 11.334 | 9 to 11 |
| 1p eager, gorge first | 5.773 to 5.770 | 12.117 to 12.115 | 10 to 9 |
| 2p eager, gorge first | 4.581 to 4.598 | 11.038 to 11.052 | 9 to 9 |
| 3p eager, gorge first | 4.408 to 4.406 | 10.880 to 10.879 | 10 to 12 |

The closed-form model's figures are unchanged. `dev/loop/standins.ts` reads the catalog, not these lengths, so it is
unaffected. Figures in `docs/plans/campaign-outline.md` from the old lengths are corrected there (lines 88, 91, 92, 182 and 188, marked "ruled route, 12 November"); its modelled times are not recomputed, and a line under its table says so.

1. **Do far legs ever take footings by hand?**
   - **No footings on any greybox bill; a sea leg's trestle rises with its section (recommended).** The route then
     measures play, not the kiln's pace, and the footing rule is decided later with real numbers.
   - Footings packed like logs. Adds about nothing to the time and keeps the Works in use.
   - One per back, as built. Adds about 80 solo minutes of carries, the grind the outline warns of.
2. **Which end is the White Wall built from, and does the lap run through at greybox?**
   - **From the Gorge, as line 2 growing on; the two halves meet at Port Quay as two platforms (recommended).** No kit
     transfer and no reversed half; through-running is its own technical plan.
   - From High Port north, as the outline says. Needs a junction yard at the quay and the reversed half now.
   - Join the halves in the greybox. The first true lap, at the cost of the line model's hardest step.
3. **Is the greybox route visible to everyone as each leg ships?**
   - **Yes: it is the live game past Ring Island, grey and labelled as placeholder (recommended).** It is the only way
     he rides it on real trains, and nothing waits for a playtest.
   - Behind a room flag until leg 6. Hides the grey islands, and adds a second world shape to keep working.
   - **Answered (owner, 12 November UTC): live for everyone, grey and labelled (recommended)**; see owner question 1
     below.

4. **How do the ring's goods reach Bell Rock, the market hub?** (Open design item, not an owner question: with High Gorge first only the bay and north–south lines meet there; settle before the lines past leg 2 are laid, as it affects line layout; [outline](campaign-outline.md#the-market-hub-bell-rock).)

## Contradictions found while checking

1. The outline asks for "every future line as a real server line"; rail-map's answered question 1 makes the stack
   line and the White Wall part of line 2. `standins.ts` and world-blockout still list eight lines.
2. `src/sickle/world-lines.ts` was never regenerated after the 10 November rulings (Ring top at 63 m, the rail lift,
   grades to 342%), though the owner approved that change.
3. `standins.ts` counts the 0.48 km lift as area 7's track; the rulings make it a lift, so the rail is 1.20 km.
4. "Generic-line components" cover lines, trains and halts. Bills do not: `QJob` is keyed to `LINE2_STATIONS` and the
   bents to `RING_HEAD`, so a generic leg job is new work, the largest part of leg 1.
5. The outline builds the White Wall "from High Port north"; rail-map builds the ring from both ends at Home.
6. [dev-menu](../game-design/dev-menu.md) lists jump rows to "Crossing built"; `JUMPS` also has "Deck laid" and
   "Ring joined".

## Design review (designer, 2026-11-11)

**Verdict: cleared to build.** Steps 1 and 2 start now. Seven changes below go into the catalog and the rules before
bump G1, so G2 is not spent on this review. Two questions are the owner's; neither holds leg 1. Where this section
differs from the text above, this section is what gets built. The steps above are left as the planner wrote them.

**Read:** DESIGN.md; owner-calls; the Current rules for core loop, rail and controls, and the full entries for the
rail map, the junction answers, the blockout, three trains, hauling and the network; campaign-outline in full;
world-blockout (legs, telegraphing, rulings 5 to 7, knock-ons); rail-map's network shape and answered questions;
build 2's design review; `dev/loop/standins.ts`; `railway-queries.ts` (`kitJob`, `kitOwed`, `depotNeed`),
`railway-sys-trains.ts`, `railway-sys-line2.ts` (the forge pours a rail every 0.5 s unasked) and
`railway-line2-layout.ts` (Q7). Research: [route-contract](../research/route-contract.md),
[progression-flow-layout](../research/progression-flow-layout.md),
[vast-world-scale](../research/vast-world-scale.md); the plan follows all three except where flow finding 1 says.

**Ran:** `npm run loop -- node Q7` and `-- node gorge`; ride arithmetic from `rideS` in `dev/economy/ring-sim.ts`.
**Could not see:** `npm run look` does not start in this worktree (the server's packages are not installed), so there
are no stills. Sightlines below come from world-blockout's stills notes and the catalog's coordinates. Step 4's two
looks are the first eyes on leg 1; nothing here was judged from a picture.

### Is a two-hour greybox a fair test of the shape?

Yes for the skeleton, no for the play, and the plan's expected reading is right only by accident.

- **What a section costs a player, as built.** Q7 is the pattern, and the loop tool reads it as four carries of 7 m:
  28 s solo, 14 s for two. Logs are minted at the camp and the forge pours rails unasked, so nothing else is asked of
  anyone. The plan's "2.9 s a unit" is the built route's average, chopping included; Q7's rate is 0.7 s a unit.
- **So areas 4 to 9 hold about 11 minutes of hand work** (24 sections of 28 s), about 12 of watching sections lay,
  about 40 of rides, and whatever the kit trains make you wait. As planned that wait is 2 to 4 minutes a section
  ([leg 1's pacing](#leg-1-pacing)), so the route would read near two hours with over an hour of it spent at an empty
  rack. With the kit running ahead it reads about 1:35 to 1:45, which is the honest floor.
- **What that floor is good for:** the order, the distances, ride times, what you see from where, the shortcut and
  the double-back, the gates, and whether the line model stretches. That is the owner's "full outline of the game
  experience", and it is worth riding.
- **What it cannot tell:** how long the game is, or whether one area plays differently from the next. With every
  pickup and barrier on a platform, all six areas are the same forty seconds, and the outline's own risk ("another
  bill, further away") would be read off the greybox when the greybox built it in. Co-op tells nothing either: a third
  player has no carry to make.

**The minimum per area.** Three things, none of them a mechanism: a gate that takes the area's flag (the plan has it);
a reason to step off the train; and that reason standing where the area's contrast is, reached with verbs already
live (walk, jump, glide). It is a placement on the massing. Keep each walk under 60 s.

| Area | Its contrast (outline) | As planned | Smallest honest stand-in | Decides nothing about |
| --- | --- | --- | --- | --- |
| 4 High Gorge | Height | Halt, pickup and gate at platform level; "nobody is sent up" | `pick` stands at the bridge level, at the top of a plain box stair from the platform's end. The stair is ruling 5's (about 165 m of steps, 30 to 40 s); you come down by the glider you already hold | The lift, mining, the hook reel, the town |
| 5 Bell Rock | A junction on two levels; the first ride that passes Home | Two decks and a ramp | `seeds` on the lower deck by the north–south platform, the Canopy frame and its barrier on the top deck, so the ramp is walked once. The shortcut is the contrast: the exit table records Home to Bell Rock before and after `bay` (the outline claims 5.2 to 2.9 min) | The station plan, how seeds are picked |
| 6 Canopy Town | The largest footprint; range | A flat deck; the pickup at the halt | `cloth` at the west-shore ledge that faces the Notch, with the shut Notch frame beside it. Measure the walk on the map data and keep it under 60 s | The town, the sling, the glide |
| 7 The Port | The lock seen on day one | The plug barrier at the West landing | Enough as planned: the double-back is true in greybox. The Wall's first frame stands on Port Quay (ruling 2), so the leg ends facing the next | Breaking the plug, salt sliding, the crane |
| 8 The White Wall | One exceptional crossing; the lap | A `seeds` barrier on "the fourth section" | The barrier at the deep gap the map data draws, one section per islet. The lap is not in the greybox, and the exit table says so | Collars, through-running |
| 9 The ending | The last ride | Posts and a card | `lantern` at the arch's foot, off the platform. Enough | The glide, the lantern, the meeting |

### Changes the build takes

1. **Pickups stand off the platform** (New), as the table above. Step 4's massing gains the Gorge's plain stair.
2. **The kit runs ahead** (New). The next section's kit is owed as soon as the current section's kit is on its rack,
   and it waits aboard until that section's railhead halt opens. Target: after a leg's first kit, no wait over 60 s
   with nothing to do outside a ride (build 2's ruling F). Checkpoint A's idle log proves it.
3. **The Wall grows from Port Quay on the `cave` row** (New; ruling 2 below).
4. **Sections end at a place** (Default): a halt, an islet or a shore, 300 to 650 m each. Gorge 4, Bell Rock 2 + 2,
   Canopy 3, the Port 3 (the cave, Saltpan, the quay), the Wall 6 (one for each islet), the ending 1 + 1: 22 sections. The
   Port's seven stops of 171 m existed only to match the model's unit count, and the unit rates never matched.
5. **Each leg says where it is** (Default; near-universal rule 1). The objective line names the open leg's frame and
   the halt maps mark it. Twice the next frame is a ride away and out of sight: the bay frame at Home after the
   incline reaches Bell Rock, and the Notch frame at Canopy after the Wall closes.
6. **Get unstuck returns you to the leg's last open halt** (Default; rule 3). A fall from a railhead a kilometre out
   is otherwise a swim of minutes.
7. **The exit table splits each area's minutes** into hands, watching the lay, rides and waits (Default). One number
   an area would hide which of the four it is. It also gains a "not in the greybox" column: the lap, any new verb,
   co-op work.

Also, small: the hook reel and carry sling rows that "do nothing" are left out (a grant is a bit, added when it does
something). The Notch barrier's blocked prompt gives its real reason ("After the White Wall", placeholder), since the
room holds `cloth` from leg 3 and is still refused. The lay speed of a section is a named tunable, starting at Q7's
(about 25 to 35 s for these lengths). The card takes no input from a player who is not at the marker.

### The planner's three questions

1. **"Do far legs ever take footings by hand?" Default; proceed. Not asked now.** The greybox bill is a stand-in and
   decides no footing rule. The owner called the one-at-a-time carry "the most pain" and is wary of grinds, and Q7's
   train-fed pattern is already what the live game does. Ask it after he has ridden leg 1, with the idle log, as the
   outline suggests.
2. **"Which end is the White Wall built from, and does the lap run through at greybox?" Default; proceed, with a
   different answer.** No owner entry fixes the build direction: his answer is "one ring line, as the working map",
   and the outline is an unruled draft. Build it **from Port Quay, as the `cave` row growing on**, meeting line 2 at
   the Gorge as two platforms. Reasons:
   - Flow (lens: end a beat facing the next). Area 7 ends on the quay. From there the Gorge end is about five
     minutes and two changes away; the quay end is where you stand.
   - Kit. From the West landing the quay is 1.2 km; from the Village the Gorge is about 3.4 km before the Wall starts.
   - It needs no yard and no reversed half. The `cave` row's `s` just keeps growing; the reversal belongs to the lap.
   - Line 2 never needs "twelve trains on one line" in the greybox, the plan's stated risk.
   - The junction answers hold: a first ride from the station a line was built out of needs no change.

   No lap at greybox. The join stays rail-map's technical plan, written while legs 2 to 4 are built.
3. **"Is the greybox route visible to everyone as each leg ships?" The owner's.** It is what friends see on the live
   site, and the 10 November blockout entry kept the walkable layer behind a flag "so players can't reach unfinished
   areas". Recommendation: yes, live for everyone ([owner question 1](#owner-questions)). Until he answers, G1 ships
   with the route **closed in the shared room and open in jump-in rooms**: one saved bit on `Route` that the seeds
   set. He rides it by link the day it ships, friends see no change, and opening it later is one line and a bump.
   Either way a leg reaches main whole, so the live end of the route is a shut barrier at a halt, never a half-fed
   frame without its next leg's rules.

### The contradictions

| # | Contradiction | The decided source | Before leg 1 | The length model |
| --- | --- | --- | --- | --- |
| 1 | Eight lines or five services | The owner's rail-map answer (10 November): line 2 grows on, so the stack leg is line 2's. The outline and `standins.ts` are a draft and a model | Step 1 regenerates the catalog as five services. `standins.ts` groups legs by stage, not by line, so it keeps working; the line name is only a label | No change from the grouping |
| 2 | `world-lines.ts` never regenerated | The same entry ("Yes, as its own small reviewed change") and the blockout's rulings | Step 1, as planned, with one addition: restate leg 1's length and sections from the new data. The stack line now leaves the island halt, not Ring top, so expect about 2.0 km (1.91 km in a straight line between the catalog's two halts), and its first stretch is Ring Island's west shore, not sea | Area 4's rides rise about 1 min |
| 3 | The lift counted as rail | The same entry: the lift is one of the two ruled-out legs. Area 7's track is 1.20 km | Falls out of step 1. The outline's row 7 then reads 1.20 km | Area 7's rides fall about 1.6 min (41 to about 39) |
| 4 | Generic-line components cover no bills | "We should be reusing components there" (10 November), and "the codebase is the agents' to own": a second copy is a finding | `Leg` reuses the line schedule that `QJob` uses and is written so Q6 and Q7 can fold into it. The fold itself stays the logged leftover while build 2 holds those files. The outline's 3 U for the greybox assumed bills were covered, so leg 1 at L is right | None |
| 5 | The Wall from High Port, or the ring from both ends at Home | Neither is an owner decision on direction. They agree once the Wall grows on the `cave` half | Ruling 2, in the catalog before G1 | The Wall's south leg starts at the quay, not the 55 m top: about 0.1 km longer, 0.2 min |

**The 3:11 figure needs no correction for track:** the three changes net to about half a minute down, inside its
rounding (arithmetic from `rideS`; rerun `npm run loop -- run` after step 1 to confirm). Its weak part is the unit
rate, not the legs. The outline's "new track" column changes (area 4 about 2.0 km, area 7 1.20 km, about 12.3 km in
all), which is the outline's edit to make.

### Order

Leg 1 is the right first step. It is the route's next beat, and growing line 2 is the plan's largest risk, so it should
fail first if it is going to. A thinner first leg saves little: the grant, gate and arrive ops are a few lines, and the
size is in the leg job, the moving railhead and the kit per line, which any first leg needs.

What gets him to the ending sooner is splitting every leg into a **ride pass** and a **proof pass**:

| Order | What ships | He can ride |
| --- | --- | --- |
| 1 | Steps 1 and 2: the map data and the whole catalog | |
| 2 | Leg 1 rideable: steps 3 and 4 and step 5's seeds and jump rows (G1). Checkpoint A in full, once, because it carries every shared system. Alongside on the Mac: the arrival, the card, and each island's massing made resident | To the Gorge |
| 3 | Legs 2 and 3, and leg 4 beside them: rules, massing, a seed, a jump row and one look each | To Canopy and to the quay |
| 4 | Legs 5 and 6 the same way | **Wake to the card** |
| 5 | The proof pass: the loop-graph nodes, the bot chain, the exit table, device lines | |

Deferred to the proof pass: the per-leg bot segments and loop nodes for legs 2 to 6, and their measured minutes.
Rejoin proofs run where a component first appears (leg 1 for `Leg` and kit aboard, leg 2 for `LegYard`, leg 6 for
`arrived`), not once an area. A frame-time line is taken at the Gorge, where streaming is proved, and at one far
island; the owner called frame time low priority. The independent review still reads every sim and server batch
before main.

**Moved, not struck:** the High Gorge `/brainstorm --panel` waits until he has ridden leg 1. It is depth work, phase
C opens on his verdict on the shape, and the panel is better for his notes. **Parked as look, not system:** P2's
coast-texture measurement, until an island gets real ground. Nothing else in the plan is detail.

### Save resets

The batching is right and is decided ground: a bump ships when ready, outside his sessions, after `npm run
heartbeat`. Installing the whole catalog closed in G1 is the good part. Three notes for an owner who plays in the
evenings:

- Expect three or four resets across this plan, build 2 and slice 5, not nine, if the catalog changes above land
  before G1. "One bump per leg" is a ceiling to stay well under.
- A reset sends the shared room back to wake. Each bump's note to him carries the jump link nearest to where the room
  stood, so an evening is not spent replaying Home.
- No bump between the day leg 6 ships and his whole ride.

### Leg 1 pacing

Solo, from `ring-joined`, as the plan's rules stand (arithmetic from the built 65 s Village-to-island run and the
105 s worst wait; not measured):

| Beat | What you do | Seconds | Finding |
| --- | --- | --- | --- |
| The leg opens; the frame is on the island's west shore | Walk to it | Under 15 | In sight of the halt |
| The first kit comes from the Village | Nothing | 65 to 170 | Over a minute. In the real route build 2's steel work is on the same island; from a jump seed it is a bare wait. Accepted for the first kit only, and logged |
| Feed section 1 | Four carries of 7 m | About 30 | |
| It lays | Watch | About 30 | Construction you can watch |
| Section 2's kit: owed only now, loads at the Village, rides out | Nothing | 90 to 195 | **Finding** |
| Sections 3 and 4, the same | Nothing | 115 to 245 each | **Finding** |
| The Gorge opens; ride in | Ride | About 100 | The split end-on (ruling 5) |
| The stair, `pick`, the glide down, the incline's barrier | Climb, take, open | About 90 | With change 1 |

As planned that is 6 to 12 minutes of standing in a leg with 2 minutes of hand work. With the kit running ahead
(change 2) the waits after the first become the ride to the new railhead, and the leg reads about 9 to 11 minutes.

### Flow, beat to beat

Rides at 20 m/s with stops, from world-blockout's legs table; under ruling 2.

| From | To | How | About |
| --- | --- | --- | --- |
| Ring Island halt | High Gorge | Line 2, new | 2 min |
| High Gorge | Bell Rock, lower deck | `ns`, new | 1:10 |
| Bell Rock | Home's West landing, for the `bay` frame | The long way: `ns`, line 2, the walk across Home | 5 min, once |
| West landing | Bell Rock, top deck | `bay`, new | 1:12 |
| Bell Rock | Canopy Town | `bay` grows on | 1:11 |
| Canopy Town | West landing, for the plug | `bay` | 2:25 |
| West landing | Saltpan, Port Quay | `cave`, new | 1:20 |
| Port Quay | High Gorge, along the Wall | `cave` grows on | 3:35 |
| High Gorge | Canopy, for the Notch frame | `cave` | 1:50 |
| Canopy Town | Lantern Notch | `bay` grows on | 0:55 |
| Lantern Notch | Bell Rock, change, the Original Island | `bay`, then `ns` | 3 min |

**Findings.**

1. **The next goal can be found (rule 1): two beats need a pointer**, covered by change 5. The five-minute ride home
   from Bell Rock breaks the lens "end a beat facing the next", and it is an exception that works: it is the long way
   that the shortcut then removes, once. Keep it; do not shorten it.
2. **A gate keeps its meaning (rule 2): holds.** Every pickup and frame refuses until its own leg is laid, so a
   swimmer or a glide gains distance and no work ([route-contract](../research/route-contract.md)). An island you can
   stand on hours early with a post that says "Not yet" is acceptable in the greybox. The reach claims are unproved
   until each leg adds its island to the level check (level finding 2), which the plan already asks for.
3. **Nobody is stranded (rule 3): change 6.** All gates are one Interact and work solo. No key can be lost: grants
   are the room's.
4. **Co-op.** A friend who joins late at Home is three to six minutes of rides from the railhead and needs change 5's
   pointer as much as anyone. Bell Rock is the natural place to meet, as the map intends. Nothing in the greybox
   gives a second or third player work, so its two- and three-player minutes will sit on the solo figure. Report that
   as "not tested", not as "co-op adds nothing".
5. **The plan's reading of its own number.** "Near the outline's two-hour floor" should read "about 1:35 to 1:45, a
   floor on travel and logistics". Decision 2 of the outline is then read against hands, rides and waits apart.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | No quirks, barks, idles, bespoke props or polish; placeholder labels | Decided | Owner, 11 November |
| 2 | The whole route in greybox before depth; future lines are real server lines from line 1 and 2's components | Decided | [10 November](../decisions-rail.md#d-2026-11-10-block-out-the-whole-map-then) |
| 3 | The stack leg is line 2 growing on; one ring line as the working map; Bell Rock on two levels, the bay line on top | Decided | [Rail map, 10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-rail-map) |
| 4 | No Ring top halt; High Port is reached by a lift, the cave line ends at the quay | Decided | The same entry |
| 5 | A far island is first reached by building the line over the sea and riding it | Decided | [2 November](../decisions-core-loop.md#d-2026-11-02-first-reaching-a-far-island) |
| 6 | You haul for each segment and the network brings materials closer (the rack-to-frame carry) | Decided | [2 November](../decisions-core-loop.md#d-2026-11-02-hauling); Q7's pattern meets it |
| 7 | A grant applies to the whole room | Decided | Shared progression, 6 November |
| 8 | It ends on the Original Island with The Boogler; the world stays open; none of his copy is touched | Decided | The Design Table; "after the finale" |
| 9 | Ends have buffers and read as terminals; double track; no kinks | Decided | 10 November |
| 10 | Trains stop on request; a lever a platform side; a departure board | Decided | 10 and 9 November |
| 11 | A first ride to a new stop needs no change; the one planned change is at Bell Rock for the last leg | Decided | [Junction answers](../decisions-rail.md#d-2026-11-10-big-junctions-are-designed-stations-not); the plan and ruling 2 comply |
| 12 | The card shows for everyone in the room | Decided | [Shared moments](../decisions-controls.md#d-2026-11-10-shared-moments-play-for-everyone) |
| 13 | A bump ships when ready, outside his sessions | Decided | Owner calls, 10 November |
| 14 | Measured for one to three players | Decided | Owner calls, 6 November |
| 15 | Both branch areas in one fixed order, High Gorge first | **New** | Bends "your choice of order" (2 November). Proceed as a switch; owner question 2 |
| 16 | The greybox route and its massing on for every player | **New** | Bends the 10 November flag clause. Closed in the shared room until he answers; owner question 1 |
| 17 | The kit runs ahead of the section being fed | **New** | Change 2 |
| 18 | Pickups stand where each area's contrast is, off the platform | **New** | Change 1 |
| 19 | The Wall grows from Port Quay on the `cave` row; two platforms at the Gorge; no lap in the greybox | **New** | Ruling 2 |
| 20 | Bills are logs and rails on the kit train; no hand-carried footings | Default | Decides no footing rule |
| 21 | 20 + 20 a section, one train load; the ending's two at 6 + 6 | Default | Q7's bill |
| 22 | Sections end at a place; 22 of them | Default | Change 4 |
| 23 | A pickup is a post you Take; a gate is a barrier anyone Opens once the room holds the flag | Default | Decides no mechanic |
| 24 | Which flag opens what: `pick` the incline and the plug, `seeds` the Canopy frame and the deep span, `cloth` the Notch, `lantern` the causeway | Default | The outline's three long-range gates plus three local ones |
| 25 | The Notch frame stays shut until the Wall closes, and says so | Default | The fixed order; a true reason on the prompt |
| 26 | Line 2's fleet grows by stage: 3, 4, 5, 5 | Default | "3 for now" was for the line reaching Ring Island; a line twice as long keeps the same worst wait |
| 27 | A railhead halt moves out with each section; platforms 40 m a side | Default | `RING_HEAD`'s pattern |
| 28 | Islands can be reached early; a post reads "Not yet" | Default | Flow finding 2 |
| 29 | The ending: a marker 12 m from the platform, anyone may press once a train has stopped there, a card with Close, a late joiner reads "Arrived" | Default | The outline's decision 3 as recommended, unruled |
| 30 | The Original Island is blockout massing, not the classic terrain | Default | The ending's depth plan decides |
| 31 | The mainland is a backdrop; of the three kept double-backs only the sea cave is in the greybox | Default | The outline's decisions 4 and 7, unruled |
| 32 | No hook reel or carry sling rows | Default | Nothing uses them |
| 33 | One island resident at a time, from 400 m | Default | map-prototypes question 3 |
| 34 | The West landing's kit halt draws on the Village's depot stock | Default | Home's seam is its own brainstorm |
| 35 | Every label, prompt and jump row is a placeholder | Default | Listed for him; none is The Boogler's |
| 36 | The objective line and halt maps point at the open leg's frame; Get unstuck goes to the last open halt | Default | Changes 5 and 6 |
| 37 | A section lays at Q7's speed, as a tunable | Default | |
| 38 | The exit table splits minutes four ways and lists what the greybox leaves out | Default | Change 7 |
| 39 | A ride pass for all six legs, then one proof pass | Default | Order, above |
| 40 | The first kit of a leg may take up to about three minutes | Default | Leg 1's pacing; logged, measured at Checkpoint A |

**Counts:** 14 Decided, 5 New, 21 Default. **Suspect lines of The Boogler's:** none; the plan writes and changes none.
**Port from Place:** nothing is ported. Q7's kit and `RING_HEAD` are the live game's.

### Owner questions

Neither holds the build.

1. **"Is the greybox route visible to everyone as each leg ships?"**
   - **Yes: live for everyone past Ring Island, grey and labelled, each leg shipped whole, with a "line under
     construction" board at its end (recommended).** It is the route he wants to judge, friends' sessions give the
     co-op reading for free, and nothing waits for a playtest.
   - Jump-in rooms only until he has ridden wake to the card, then live. Friends see nothing half-made; he still
     rides each leg by link. This is what ships until he answers.
   - Never in the shared room as greybox; an area goes live when it is built to depth. Keeps the live game finished,
     and the whole shape is never played together until Alpha.
   - **Answered (owner, 12 November UTC): live for everyone, grey and labelled, each leg shipped whole (recommended).**
     So G1 does not need the "closed in the shared room" bit that was to ship until he answered. Recorded in the
     [decisions](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered).
2. **"Do both branch areas keep a choice of order?"** (the outline's decision 1; G1 installs the answer)
   - **Both areas, High Gorge first, fixed for the greybox (recommended).** The choice can come back later for one
     more line (the bay trestle) and a bump.
   - Both orders in the greybox now. Adds the bay trestle, a second route to prove and bills that take either
     material.
   - One branch only. The sea cave or the ending's glide loses its key.
   - **Answered (owner, 12 November UTC): both areas, High Gorge first, fixed order**, by the campaign outline's
     decision 1 ([decisions](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered)).

## Design review (designer, 2026-11-12)

Two rulings before the legs past leg 1 are built. Where this differs from the 11 November review, this is what gets
built. **Read:** this plan's legs table, step 2's as-built note and the first review; `src/sim/railway-route.ts`; the
outline's towns and market sections; the three 12 November rewards entries; rail-map and junction-stations on Bell
Rock; DESIGN.md's core loop. **Measured:** section lengths, kit distances and closest passes from the catalog and the
map JSON (a script over `WORLD_LINES` and `layout()`); seconds are arithmetic at 20 m/s and the 105 s worst wait, not
played. **Could not see:** no stills were taken; Bell Rock's two levels are judged from coordinates only.

### Ruling 1: section lengths stay as built, 22 sections

**What a long section costs, by leg 1's own arithmetic.** A section is three things to a solo player with the kit
on the rack: the feed (four carries of 7 m, about 30 s, whatever the length), the lay (about 30 s) and the ride to the
new railhead (length at 20 m/s plus about 15 s of starting and stopping).

| Section | Feed | Lay | Ride on | Total | Hands' share |
| --- | --- | --- | --- | --- | --- |
| 510 m (leg 1) | 30 s | 30 s | 40 s | 1:40 | 30% |
| 850 m (the Wall's first) | 30 s | 30 s | 58 s | 2:00 | 25% |
| 437 m (the Wall's second) | 30 s | 30 s | 37 s | 1:37 | 31% |

So 850 m adds about 18 s, all of it riding, and no hand work. Two more cuts on the Wall would add two more feeds, lays
and kit trips (about 2.5 minutes) and nothing new to see: more of "another bill, further away", which the first
review warned the greybox would build in.

**The wait for kit does not depend on section length. It depends on how far the frame is from the kit halt, and the
first review got it wrong.** With the kit one section ahead (change 2 as written), the next kit is owed when this one
is racked, loads at the kit halt within 0 to 105 s and then rides the whole line out. The player is ready for it about
100 to 120 s after the rack fills.

| Frame | From its kit halt | Kit's ride out | Idle at the rack, kit one ahead (mean; range) |
| --- | --- | --- | --- |
| Leg 1, section 2 | Village, 1.8 km | 91 s | 43 s (0 to 96) |
| Leg 1, section 4 | 2.8 km | 142 s | 94 s (42 to 147) |
| Wall 2, at wall-s2 | West landing, 2.08 km | 104 s | 38 s (0 to 91) |
| Wall 4, at Canopy | 3.34 km | 167 s | 103 s (51 to 156) |
| Wall 6, the deep gap | 4.70 km | 235 s | 185 s (133 to 238) |

Summed over the Wall that is about nine minutes at an empty rack, and leg 1's later sections already break the 60 s
target. "The waits after the first become the ride to the new railhead" (leg 1 pacing) holds only if the kit is
already out on the line.

**Rulings.**

1. **Keep the cuts as built: 22 sections** (Default). The guide in change 4 is reworded: a section ends at a place;
   where a leg has no place on the way it is cut near 500 m; length is otherwise free up to about 900 m. Two places
   were weighed and left as sights from the train, not stops: wall-cs (194 m off the line, 352 m past wall-s1) and
   wall-cn (98 m off, 268 m past Canopy, still on Canopy's shore).
2. **The bill does not grow with length** (Default): 20 + 20 is one train's kit car (32 + 32), and a larger bill is two
   trains for one frame.
3. **A section's lay time is per section, not per metre** (Default; replaces "at Q7's speed" in call 37): about 30 s,
   a tunable, so a long section's deck rolls out faster and is never a 50 s watch.
4. **The kit runs ahead by the whole leg, one kit a train** (New; amends change 2 and call 17). When a leg opens, each
   train that passes its kit halt with an empty kit car takes the next section's kit, in order, and keeps running its
   service with the kit aboard until that section's railhead halt opens, then unloads there. The wait at a new rack is
   then one headway at most, whatever the distance. Named tunable `kitLead` (sections owed ahead), starting at "all
   remaining", never under 2. The 60 s target stands and Checkpoint A's idle log judges it; step 3 is not built yet,
   so this costs no rework.
5. **The ending's two stay single sections** (Default): one barrier, one feed of 6 + 6 (about 10 s), one ride. A cut
   would put a frame in the tunnel or on the sunken causeway and a kit trip into the last ride.

**The table.** Cuts are cm along the row; "kit halt" distances are to the section's frame.

| # | Leg | Section ends at | Length | Bill | Frame from its kit halt |
| --- | --- | --- | --- | --- | --- |
| 14 | Wall | wall-s2's closest pass | 850 m | 20 + 20 | 1.23 km (Port Quay) |
| 15 | Wall | wall-s1's closest pass | 437 m | 20 + 20 | 2.08 km |
| 16 | Wall | Canopy Town halt | 822 m | 20 + 20 | 2.52 km |
| 17 | Wall | wall-n2's closest pass | 818 m | 20 + 20 | 3.34 km |
| 18 | Wall | wall-n1's closest pass | 540 m | 20 + 20 | 4.16 km |
| 19 | Wall | High Gorge, behind the `seeds` barrier | 593 m | 20 + 20 | 4.70 km |
| 21 | Notch tunnel | Lantern Notch, behind `cloth` | 865 m | 6 + 6 | 2.41 km from West landing by the bay line |
| 22 | Causeway | The Original Island, behind `lantern` | 726 m | 6 + 6 | 1.14 km from the Gorge yard |

Before them: leg 1 four of 510 m, the incline 2 of 568 m, the bay cut 2 of 604 m, Bell Rock to Canopy 3 of 401 m, the
cave 360, 360 and 510 m. **22 of 22: no change to the catalog or its test.**

**No owner question.** The idle log at Checkpoint A answers it better than he can from a table.

### Ruling 2: the ring's goods are shown at Bell Rock, not freighted there

| Option | Cost (outline's U) | What the player sees | Against the rules |
| --- | --- | --- | --- |
| (a) A stall rises when its place is connected; goods shown, no yard rows | About -0.25 (the market's 0.25 of systems goes) | A stall and its crates by the platform of the line that leads to that place | Holds "no routing or quotas" and one town a yard row: the market has no rows |
| (b) A transfer at the Gorge carries a token load down the north–south line | About +0.5 (a transfer stock, rows, R2b's proof twice: salt needs a second transfer at the West landing) | Crates changing trains at the Gorge for a market that never uses them | Breaks "freight never changes line" (outline, section 3); adds full-load waits on the incline for no purchase |
| (c) The bay trestle in both orders | About +1 (a seventh leg of 1.54 km, a second line on the skerry's top) | A third line into Bell Rock | Fixes steel only, salt still cannot arrive; reopens the answered fixed order; unapproved scope |

**Ruled: (a), with the stall's level as the improvement** (New). No line changes, which is the worry the owner raised.

- **Nothing is freighted to the market.** No `Town` row, no yard row, no stock. A stall is a view of the accepted
  route state. The market never sells or converts materials (Decided, 12 November), so a crate that arrived would have
  no use; carrying it would be logistics with nothing at the end. This replaces the outline's "it receives a little
  of what each line carries" and its Default "the market has yard rows of its own".
- **A stall rises by a fixed table, in data, one row a place.** Nobody chooses and nothing is computed at run time:

  | Stall (its goods) | Rises when | Level |
  | --- | --- | --- |
  | High Gorge (copper) | The incline is laid: the first north–south train in | Lower, by the north–south platform |
  | Ring Island (steel) | The same train | Lower |
  | Home (timber, stone) | The bay cut is laid | Upper, by the bay platform |
  | Canopy Town (fibre) | Bell Rock to Canopy is laid | Upper |
  | Port Quay (salt) | The cave line reaches the quay | Upper |

- **A stall stands on the level of the line you would ride to reach its place**, so the market is also the junction's
  signpost: steel is downstairs because Ring Island is by the north–south train and a change at the Gorge; salt is
  upstairs because the Port is by the bay train and a change at the West landing.
- **At depth, not now:** the little guys carry a stall's first crates off the train that raised it, once, so the goods
  are seen to come by rail (machines show their work). The network buys list the same connected places.
- **The Port's stall rises while nobody is there** (leg 4 never touches Bell Rock). Accepted: it is found on the next
  pass through, which the causeway forces.

**Map data.** The skerry is an ellipse of 240 × 190 m with a 14 m top; the pinnacle (40 m) stands 29 m from the halts.
Five stalls of about 6 × 4 m and a board are under 200 m² of roughly 35,000, so area is not the limit. **Unproven:**
the catalog puts both halts at the skerry's centre, 1 m apart in plan and 11 m apart in height, where rail-map says
the lower terminal is "at the skerry's foot"; so the lower platform is in a cut or under the upper one, and whether
that level has any open ground for two stalls is unknown. Also unproven: the top's flat area once two 80 m platforms,
the tower and the seed terraces are in, and what is seen from each platform. Leg 2's look settles these; if the lower
level has no ground, its two stalls go to the ramp's head and the level rule is dropped.

**What greybox leg 2 stands up at Bell Rock** (all Local views in `route-greybox`, read from `Leg.laid`; no sim row,
no op, no catalog change, no bump):

1. The two decks and the plain ramp, as planned; `seeds` on the lower deck, the Canopy frame and its barrier on top.
2. Five stall pads, outlined and labelled from the start ("Stall: High Gorge (placeholder)" and so on), two on the
   lower deck within 30 m of the ramp's foot, three on the upper within 30 m of its head. An empty pad reads "Not
   connected yet".
3. A grey box on a pad once its row above is true: two when the incline is laid, Home's when the bay cut is laid.
   Legs 3 and 4 add Canopy's and the Port's with one line each.
4. One post at the ramp's head, "Market board (placeholder)", which does nothing.
5. Two stills, one from each platform's lever end, and a profile across the skerry, in leg 2's look.

**Owner question (one).** "Is it right that the market shows each connected place's goods without a train carrying
them there?" **Recommended: yes**; it changes no line and keeps freight for the towns that use it. Until he answers:
stalls are views, no market yard rows, no transfer, and the bay trestle stays out of the greybox.
**Answered (owner, 12 November UTC): yes, for now (recommended).** Recorded in the [decisions](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered).

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 41 | You haul for each segment; the network brings materials closer | Decided | [2 November](../decisions-core-loop.md#d-2026-11-02-hauling) |
| 42 | Bell Rock is the market, built out in stages, network buys only, never materials | Decided | [12 November](../decisions-rewards.md#d-2026-11-12-market-hub-answered) |
| 43 | Bell Rock on two levels, the bay line on top | Decided | [10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-the-rail-map) |
| 44 | High Gorge first, fixed; no bay trestle | Decided | [12 November](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered) |
| 45 | No routing or quotas | Decided | DESIGN.md, the rail builds the world |
| 46 | The kit runs ahead by the whole leg, one kit a train (`kitLead`) | **New** | Ruling 1.4 |
| 47 | The market's stalls show goods; nothing is freighted there; no market yard rows | **New** | Ruling 2 |
| 48 | A stall rises by a fixed table and stands on the level of the line that leads to its place | **New** | Ruling 2 |
| 49 | Sections stay as built, 22; the length guide is "ends at a place, up to about 900 m" | Default | Ruling 1.1 |
| 50 | The bill does not grow with length; the ending's two stay single | Default | Rulings 1.2 and 1.5 |
| 51 | A section lays in about 30 s whatever its length | Default | Ruling 1.3 |
| 52 | Leg 2's Bell Rock markers: five labelled pads, boxes from `Leg.laid`, an inert board post | Default | Ruling 2; every label a placeholder |
| 53 | The Port's stall rises unseen and is found on the next pass | Default | Ruling 2 |

**Counts:** 5 Decided, 3 New, 5 Default. **Suspect lines of The Boogler's:** none written or changed. **Port from
Place:** nothing.

## Design review (designer, 2026-11-12): leg 1 step 3

Rules on step 3 as built on HOTBOX, stopped on three failed proof gates, and on line 2's wait bound as a whole. Where
this differs from the two reviews above or from the
[economy stops ruling](slice5-town-economy.md#design-review-designer-2026-11-12-economy-stops-r2b-and-r3), this is what
gets built. **Read:** the builder's measurement sheet and its three addenda (relayed by the orchestrator, 12 November
UTC, base `a82a0d6e`), this plan's step 3 and both reviews, the economy stops ruling and its seven gates, build 2's
outcome and rulings A to F, the 12 November owner entries (rewards, core loop, rail) and the 10 November "three trains
for now" entry. **Not read:** the step 3 code (another machine); every figure is the builder's, in ticks, 10 a second,
unit runs, no device. **Not run by me:** anything. **No stills:** nothing is placed, moved or gated. Lines marked
*arithmetic* are my sums from the sheet's ticks, not measurements.

**Verdict.** The fleet is 3, then 5 from the first section on; seven trains are refused. The wait bound is restated
for line 2 as a whole: 1,158 on the settled line, 1,600 while the line is growing, with a ride gate beside it. The leg
opens on the rivet, unasked, steel kit first. All kit is owed at once, on all but one of the running trains. A train
carrying a kit that cannot unload yet makes the stone stop. 7 decided, 5 new, 8 default.

### What the sheet says

- **Train count is not the lever.** Each end turns about one train per 800 ticks, so mean headway is about 803 quiet
  and 906 to 931 under asks with five trains or seven. Seven trains pass the settled fuzz (0 breaches) only by
  queueing: one train's round trip goes from 4,015 to 5,680 against 3,428 non-stop, about 80 s more aboard at each end
  (*arithmetic*). Five trains run 17% over non-stop and show one settled breach, 1,114.
- **The breaches are a growth effect.** They are asked while kit loads and trains join, or 1,000 to 3,000 ticks after
  the far end moves, nearly all "down" at old-line halts. The builder at the railhead waiting to ride on is not in the
  list.
- **The bound has no room for the stops since added to it.** Headway under asks is 920 to 930 with five trains, so
  1,050 holds only while gaps stay within 13% of even. One stone stop costs 108. The economy's riders (1,144), build
  2's mixed fleet (1,064 after its rebase onto the stone stop) and this step have each met it.
- **`stone` is free:** on either fleet, leg time, idle, waits, the fuzz, joins, fares and the wagon are identical;
  only stone moves, 0 to 32 at the rivet.
- **Slowing or capping the kit hard costs idle at the fourth frame:** `k2` and `two` 1,269, `one` 2,054, against 484.
- **The idle room is a stone failure and a steel risk, not a kit failure.** Kit 1 on the rack at +651 is the cue for
  the next goal. What is wrong is no stone stop, and no empty kit car left for build 2's steel.

### A. The wait bound for line 2, and the fleet

**What 1,050 was.** The owner accepted "about 105 s" as what three trains gave on the line to Ring Island
([10 November](../decisions-rail.md#d-2026-11-10-line-2-runs-three-trains-for-now)); the test figure was a regression
bound logged the same day. Two days later he ruled that trains stop at every resource source
([12 November](../decisions-rewards.md#d-2026-11-12-town-economy-answered)). The figure never contained that stop.

1. **What the bound measures** (New; replaces the flat 1,050 for every plan on line 2). Three things, so that none can
   be met by spoiling another:
   - **The worst wait:** lever ask to a train standing there, that way, every halt, in the 20,000-tick fuzz at both
     seeds, as today.
   - **The typical wait:** the mean of those waits, at most 525 (half the owner's figure: an even line).
   - **The ride:** one train's quiet round trip at most 1.2 times the non-stop round trip. Five trains to the Gorge
     are at 1.17; seven are at 1.66 and fail. Without this gate, trains queued outside the terminals pass the wait
     gate with the player sitting in them.
2. **The settled line: worst wait at most 1,050 plus 108 for each resource source a train on that line stops at.**
   Line 2 has one, the Quarry: **1,158.** The reason is his two entries read together, not room to pass: 108 is the
   measured cost of the one stop he added (50 dwell, about 57 braking and starting). Kit, riders, joins and slower
   trains get no allowance. "Settled" means no section laid, no train joined and no end moved in the last 3,000 ticks.
3. **The growth phase: worst wait at most 1,600**, from a leg opening until 3,000 ticks after its far end last moved,
   and **at most 1,158 for an ask up the line at the current railhead**, where the room that laid the section stands.
   The reason: 1,600 is two end turns, so growing the line may cost a waiting player one train's slot, never two. The
   worst measured is 1,440 on the planned fleet.
4. **Fleet 3, then 5, 5, 5, 5** (New; replaces call 26). Seven is refused by the ride gate. Five from the first
   section passes every measured fixed-stage cell under 1,158 (910/697, 822/845, 1,030/957, 1,130/973) where four
   trains at one section do not (1,169), and both extra trains join in one window, not three. **Not measured as a
   whole fleet: re-measure it.** If it fails at one section laid, the planned 3, 4, 5, 5, 5 ships and that stage is
   judged by the growth cap, since no room rests there.
5. **The joiner waits; the line does not** (Default): an extra train leaves the shed only into a gap, and no running
   train is held to make room.
6. **The real lever is the turn at each end** (finding 1). When a later plan brings the end turn under about 500
   ticks, item 2 returns to a flat 1,050 with three stops of margin, and the fleet is sized again.
7. **The settled fuzz the builder is running, both outcomes** (three fleets from 18,022; the sheet's second addendum
   has it, and a longer or third-seed run may still differ):
   - **Breaches only in the growth phase** (as measured): items 2 and 3 as written.
   - **Settled breaches persist over 1,158 on five trains:** do not add trains and do not move the figure. Gate 9 is
     recorded as failing with its table, G1 ships on the growth cap applied throughout, and the end turn becomes the
     next rail step before leg 2's fleet is set.

### B. When leg 1 opens

**On the rivet, as built, unasked; the steel kit loads first** (New).

| Option | What the player sees | Verdict |
| --- | --- | --- |
| On the rivet | The ring joins; the next train brings the steel kit, the one after brings the frame's first kit to a rack in sight of the halt; two bills on one island, one for each of two players | **Built.** It is the owner's "player shouldn't have to" call a train for freight, it is how build 2's kit already comes, and the first kit's ride is hidden behind the steel work |
| On a player act (the frame's prompt, a lever, the install) | A frame with nothing beside it, a press, then 65 to 170 s of nothing | No. It is calling a train for freight under another name, and it puts the bare first wait back |
| After the works is lit, or steel is home | Nothing on the west shore for 6 to 9 minutes | No. It makes steel a work edge on the main line and the two beats serial; a room that rushes may skip the boiler (owner, 12 November: a three-hour rush is fine) |

- **Order** (part of the same call): after the rivet the first train with an empty kit car takes the steel kit, and
  the steel kit has first call on the forge's rails. Build 2's 90 s test for its kit is not to move.
- **The idle room is redefined, not forbidden** (Default): a room that does nothing after the rivet comes to rest by
  +1,500 with kit 1 racked 20/20, at most two trains carrying one kit each, at least one train with an empty kit car,
  the fourth kit not loaded (60 logs and 60 rails taken in all, not 80), and from then no change to the `Leg` row, the
  rack or any train's cargo. The fixed order makes the stack line the only way on, so that kit is prepaid, not wasted.
- **Flow.** Rule 1 (the next goal can be found) is served by the racked kit. The lens "one main line" bends, with two
  open bills of the same materials at one halt; it is the co-op split this island lacked, and the bill signs name
  each. Watch in the first owner session for logs carried to the wrong site.

### C. Kit pacing

**All remaining kit owed at once, one kit a train, on at most `kitTrains` trains: the trains running minus one**
(New; amends call 46). So two at the rivet, then four.

- **Figures from the sheet, base and `stone` rows:** rivet to Gorge 3,230; idle at the frames 651 / 536 / 355 / 484;
  stone in 20 minutes 32 / 32 / 32 / 24 / 24; fares 59.3 a minute and up.
- **What the cap changes** (*arithmetic*): in a fed room nothing. Kit 1 is off its train at +651, before kit 3 loads
  at +945, and the fleet has grown before kit 4 loads at +1,345. In the idle room it keeps the third train's kit car
  empty for steel. It is not `two`: a flat cap of two starves the fourth frame (1,269, leg 4,015).
- **What steel-first changes** (*arithmetic*): the leg's first kit rides the second train, about 436 ticks later, so
  the first frame's idle is about 1,090 and rivet to Gorge about 3,670 from a jump seed. In the route that wait is the
  steel work, and call 40 allows three minutes.
- **Not `k2`, not `one`:** 4,123 and 6,287, with 127 s and 205 s at the fourth frame against a 60 s target.
- **Re-measure, on build 2's base, as one run of the sheet:** fleet 3, 5, 5, 5, 5 with `stone`, `kitTrains` and
  steel-first.
- **If the fed room's leg time comes out over 3,700 or a later frame over 600:** drop the cap to stage 0 only and
  report; the steel order stays.

### D. The stone stop with a kit aboard

**Amended** (New; amends the economy stops ruling's kit exemption, not an owner entry). A train makes no stone stop
while it is owed a kit, or carries one it can unload at a halt open now: somebody may be standing at that rack. A
train carrying a kit whose railhead is not open yet is an ordinary train and stops for stone. Q6's and Q7's kits can
always unload, so nothing before the rivet moves. This is nearer his words ("trains should be stopping at all
resource sources") than the rule it replaces. The footing clause stands untouched.

### E. The proof gate for step 3

Nothing asked, 12,000 ticks, against main with build 2 and the town economy in, unless said. Items 1 to 7 are slice
5's seven, re-run; A's bound replaces "under 1,050" in its item 4 and in build 2's mixed-fleet test.

1. **Stage ticks:** all 40 seed stages land on main's tick. At `ring-joined` the state may differ only in the `Leg`
   rows, kit aboard, and the depot and forge counters that kit moved; the builder lists the fields.
2. **The wagon, trip by trip,** on main's tick at every stage where footings are owed.
3. **Footing delivery ticks** match main.
4. **Waits, slice 5's six stages:** no higher than main's and at most 1,158.
5. **Stone:** at least 32 in 20 minutes from `crossing-done` and from the rivet (stage 0, fed or idle); at least 24 at
   one to four sections laid; no freight stop while footings are owed; none by a train owed a kit or carrying one it
   can unload now; timber unchanged.
6. **Fares:** at least 40 a minute at every stage, the five leg stages included; neither crowd at `crowdCap` for 1,200
   ticks running.
7. **`npm run loop -- run`:** order and bills unmoved.
8. **Waits, fixed stages:** the `WAIT_BOUND` way at 0 to 4 sections laid, both seeds, at most 1,158.
9. **The settled fuzz:** 20,000 ticks of random asks from 4,000 ticks after the Gorge opens, both seeds: worst at
   most 1,158, mean at most 525. The same at stage 0 with the leg open and nobody feeding.
10. **The ride:** quiet round trip at four sections laid at most 1.2 times non-stop (4,114); printed at the other
    stages.
11. **The whole-leg fuzz,** both seeds: the leg completes; `sepCm`, the end blocks and the load check never break;
    worst wait at most 1,600; no ask up the line at the current railhead waits over 1,158; no wait over 1,158 asked
    later than 3,000 ticks after the Gorge opens. Every wait over 1,158 is printed with its tick, halt and side.
12. **The join window:** both extra trains running within 1,050 ticks of the first section laying; no running train
    held for a join.
13. **The idle room:** B's rest state by +1,500, then 20 minutes with stone at least 32, fares at least 40 a minute
    and gate 9's figures, and no kit loaded after it.
14. **Leg timing, fed every tick:** rivet to Gorge at most 3,700; idle at the first frame at most 1,200 and at frames
    two to four at most 600 each.
15. **Build 2 with the leg open:** the steel kit reaches the yard on build 2's own tick; first steel home and the
    install no more than 1,050 ticks later than build 2 alone, printed.
16. **Step 3's own tests:** each refusal; a section lays and the railhead moves; the Gorge opens on the fourth; `pick`
    refused before and granted after; kit units loaded equal units aboard, racked and fed, every tick of gates 11
    and 13.

### F. What may wait

- **Ships with G1, though it may land after the rules are proven:** `rail.legStock` predicted on the client. It is
  pressed some eight times a section by everyone, and the route is live for every room (owner, 12 November).
- **A later step:** prediction of `rail.grant`, `rail.gate` and `rail.arrive` (once a leg, once a game; the prompt
  shows from the accepted state); legs 2 to 8 opening; `LegYard` in use; lay time or `kitLead` per leg; the
  `gorge-open` seed starting with kit 1 racked (step 5).
- **Not later:** the steel order, the cap, the stone amendment and the join rule. They are what the gates measure.

### Findings

1. **Line 2's ends set its service, and no plan owns them.** One train per 800 ticks at each end caps the line at
   about four trains' worth of service to the Gorge, whatever is added. Every later line inherits it, and rail-map's
   ring "sized by an even headway of about a minute" cannot be met through such an end. It needs a rail step of its
   own (the end block, the dwell, or a terminal that takes two trains). Owner question 1.
2. **The fare jump at the Gorge is a gameplay call nobody made.** Fares go from about 58 to 168 a minute when the
   fourth section lays, against the economy ruling's call 9 ("the fare stays 7 while the far end moves"). It ships as
   built and is reported, not gated (Default); the town economy's next table should show minutes to plot 3 before and
   after, since the first ruling counted three hours.
3. **Step 3's "105 s worst wait" line was never a settled-line test.** It ran one fuzz across the fleet changes.
   Gates 8 to 12 split it.
4. **Research.** [route-contract](../research/route-contract.md): holds, no ruling here lets movement supply work.
   [carrying-and-logistics-play](../research/carrying-and-logistics-play.md) rec 2 is the ground for B. The index was
   not otherwise re-read for this ruling.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 54 | Three trains when line 2 reaches Ring Island; about 105 s worst wait | Decided | [10 November](../decisions-rail.md#d-2026-11-10-line-2-runs-three-trains-for-now). Stage 0 and the bound's base figure |
| 55 | Freight is hauled by trains that stop at every source; the player does not carry it or call a train for it | Decided | [12 November](../decisions-rewards.md#d-2026-11-12-town-economy-answered). Why the leg opens unasked, and the 108 |
| 56 | The stone stop runs once the pier's footings are done | Decided | The same entry. D restores it after the rivet |
| 57 | High Gorge first, fixed order; a three-hour rush is fine | Decided | [12 November](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered). The idle room's kit is prepaid; steel does not gate the leg |
| 58 | The works takes logs and rails only; steel rides the kit car until the install | Decided | [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered). Why one kit car stays empty |
| 59 | The greybox route is live for everyone, each leg shipped whole | Decided | The same entry. Why `rail.legStock` is predicted before G1 |
| 60 | You haul for each segment; the network brings materials closer | Decided | [2 November](../decisions-core-loop.md#d-2026-11-02-hauling) |
| 61 | Line 2's wait bound: worst 1,050 plus 108 a source stop on the settled line (1,158), mean 525, and a round trip within 1.2 of non-stop | **New** | A.1, A.2. Owner question 1 |
| 62 | While a line grows the worst wait may reach 1,600, never over 1,158 up the line at the railhead | **New** | A.3 |
| 63 | Line 2's fleet is 3, then 5 from the first section; seven refused | **New** | A.4 |
| 64 | Leg 1 opens on the rivet, unasked; the steel kit loads first and has first call on the forge's rails | **New** | B. Owner question 2 |
| 65 | All remaining kit owed at once, one kit a train, on at most the running trains minus one (`kitTrains`); a train carrying a kit that cannot unload yet makes the stone stop | **New** | C and D. Amends call 46 and the economy ruling's kit exemption |
| 66 | The joiner waits and the line does not; both extra trains within 1,050 ticks | Default | A.5, gate 12 |
| 67 | If settled breaches persist, G1 ships on the growth cap and the end turn is the next rail step | Default | A.7 |
| 68 | The idle room's rest state | Default | B |
| 69 | Stone at least 24 in 20 minutes at one to four sections laid | Default | The measured figure; the longer line passes the Quarry less often |
| 70 | Leg timing limits: 3,700 to the Gorge, 1,200 at the first frame, 600 at the others | Default | C; the 60 s target stands |
| 71 | `rail.legStock` predicted before G1; the other three ops wait for the server through the greybox | Default | F |
| 72 | The Gorge fare jump ships as built, reported and not gated | Default | Finding 2 |
| 73 | The proof gate above, sixteen items | Default | E |

**Counts:** 7 Decided, 5 New, 8 Default. **Suspect lines of The Boogler's:** none written or changed. **Port from
Place:** nothing.

### Owner questions

Neither holds the build.

1. **"Trains now stop for stone, and each end of the line can only turn a train about every 80 s. What wait at a
   platform is acceptable?"**
   - **About 116 s at worst on a finished line, up to 160 s for the few minutes a line is being extended, and fixing
     how fast trains turn at the ends is the next rail job (recommended; built until he answers).** More trains were
     measured and only queue outside the stations.
   - Hold 105 s now: the end turn is fixed before leg 1 ships.
   - Leave it: waits up to about two and a half minutes are fine in a greybox, and the ends wait for the real
     stations.
   Answer: ___
   **Answered (owner, 12 November UTC): "A looser rate for the greybox"**, whose text was: "Ship build 2 and leg 1 now
   with waits up to about 2 minutes 15, and tighten when train spacing lands. The grey route arrives sooner and feels
   slow at the platforms." Orchestrator's reading: until train spacing lands, gates 8 and 9 (and build 2's) are a
   worst lever wait of 1,350 ticks settled and 1,600 while a line grows, mean and share over 1,050 printed and not
   gated; [train-spacing](train-spacing.md#c-the-limit-as-a-rate)'s table is the target they tighten to. Recorded
   in the [decisions](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered).
2. **"After the rivet, should the stack line's first kit come by itself while you work the steel, or only once the
   longer boiler is installed?"**
   - **By itself, the steel kit first (recommended; built until he answers).** Two jobs on the island at once; a
     room in a hurry can leave the boiler for later.
   - Only after the install. One job at a time, steel always done, and 6 to 9 minutes before the west shore wakes.
   Answer: ___
   **Answered (owner, 12 November UTC): by itself, the steel kit first (recommended).** Recorded in the
   [decisions](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered).

### Rulings on the re-measure (designer, 2026-11-12, later the same day)

The builder built the ruling above and stopped on gates 5, 8 and 9 without moving a limit, with two questions on
gates 10 and 11. **Read:** the re-measure sheet (relayed; base `a82a0d6e`, without build 2, so steel-first and gate 15
are not built or run). **Not run or read by me:** anything else. No limit below is raised. Two gates are restated
because they measured the wrong thing, and each restatement is at least as strict where it bites.

1. **Gate 8 stands; three laid fails, and the fault is in the rules.** A stage a room can stop at for twenty minutes
   is a settled line by A.2's own words. The sheet shows the cause without my guessing at code: the quiet round trip
   is 4,014 at three laid and 4,015 at four, on a line 520 ticks shorter (2,908 against 3,428 non-stop). Trains at
   three laid are held to the finished line's period, about 1,100 ticks a lap of standing still. The crowd at cap for
   512 ticks is the same thing seen from the platform. **Fix:** find what holds them (the builder prints hold ticks by
   halt at three and four laid) and bring three laid to gate 10. The 6 ticks are expected to go with it; if they do
   not, report, do not adjust.
2. **Gate 10 is per stage** (Default; tightens it). I wrote "at four laid, printed at the others", which was wrong: a
   player rides at every stage and a room may rest at any. Every stage at most 1.2: stages 0, 1, 2 and 4 pass (1.03,
   1.02, 1.14, 1.17); three laid fails at 1.38. It is the same defect as ruling 1, so one fix answers both.
3. **Gate 5 measured deliveries in a window, which shrinks with the ride, not whether stone is starved** (Default).
   - *Arithmetic:* a load is 8, so a 20-minute count moves in steps of 8. Stone is 24 at three and four laid with
     nothing asked, where no kit errand exists at four laid, and 32 on the short line; a fed room is on the finished
     line for 73% of its window. A load taken at the Quarry rides a 4,015 lap, not 1,426, before it lands, so the
     window's last load is still aboard. That reads as transit, not kit. It is a reading: the yard's interval is not
     on the sheet.
   - **The gate, restated:** (a) with no footings owed, a full load never waits in the Quarry's yard longer than
     1,158 ticks (one wait bound) at any stage, fed or idle; (b) stone landed at the Village in 20 minutes is at
     least the loads taken in the window's first 12,000 minus one round trip, times 8, printed beside the load ticks;
     (c) the two figures that were slice 5's stay as they were and pass: 32 from `crossing-done`, 32 from the rivet
     idle. "32 fed from the rivet" is withdrawn as a count.
   - **If (a) fails** (a full load sat while a train that could stop went by): stone is being starved; stop and
     report with the train's errand at that tick.
4. **Gate 9: A.7 confirmed, unchanged.** Settled worst 1,286 on five trains (seed badd; means 464 and 520 pass). The
   gate is recorded as failing with its table. G1 ships with 1,600 as the only worst-wait limit, the fleet stays at
   five, and the end turn is the next rail step, before leg 2's fleet is set. No figure moves.
5. **Gate 11's railhead clause was aimed at nothing** (Default; restated). While the railhead is the line's end its
   lever offers only the way back, so "an ask up the line at the current railhead" never occurs. The builder's
   direction reading is what I wrote, and it passes vacuously. What it should measure is the room that has just laid a
   section: **from each section laying, a train stands at the new railhead (or the Gorge) within 1,158 ticks.**
   Gate 14's idle figures imply it passes (kit racked there within 536); print it. The one breach, a down ask at the
   stack railhead for 1,412, was asked 232 ticks before the Gorge opened and was passed by trains that then ran on to
   the Gorge. It is under the growth cap and stays there; a player there can board the train to the Gorge.
6. **Still owed before G1 ships:** the rebase onto build 2, steel-first, and gate 15. Nothing on this sheet proves
   them.
7. **3, 5, 5, 5, 5 is confirmed** (554 / 679 at one laid).

**The gates as amended** (others as in E): **5** as ruling 3. **8** unchanged, failing at three laid until ruling 1's
fix. **9** unchanged, failing; ships under A.7. **10** every stage at most 1.2. **11** worst at most 1,600; a train at
the new railhead within 1,158 of each lay; no wait over 1,158 asked later than 3,000 ticks after the Gorge opens,
reported under gate 9's failure, not gated twice.

**What the owner is told.** Owner question 1 above said "about 116 s at worst". As built it is: a typical wait of 46
to 52 s; a worst case of about 129 s on the finished line (measured at the Quarry and the Railhead) and about 153 s
while the line is being extended; 116 s is what the end-turn fix is for. The question and its three answers stand
with those figures. **Nothing else here is his:** no direction, scope or irreversible step is added, and the build
proceeds.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 74 | The ride gate applies at every stage; three laid is to be fixed in the rules, not excused | Default | Rulings 1 and 2 |
| 75 | The stone gate is a full load never left over 1,158 ticks in the yard, with the landed count following from the round trip | Default | Ruling 3 |
| 76 | The railhead clause is a train at the new railhead within 1,158 ticks of each lay | Default | Ruling 5 |
| 77 | G1 ships with the settled wait gate recorded as failing (1,286) | Default | Ruling 4; call 67 confirmed |

**Counts:** 0 Decided, 0 New, 4 Default.

### Rulings on round 3 (designer, 2026-11-12, third sheet)

**Read:** the round 3 sheet (relayed; base `a82a0d6e`, still without build 2) and `railTrainHeadPct` in
`src/sim/tune.ts` on main (default 75, range 0 to 100, a room tuning knob, not a player setting). **Not run or read by
me:** anything else. This is the last ruling on waits unless the one run named in ruling 1 fails.

1. **The wait bound is owed at the shipped setting, on every seed; with the hold at 0% it is reported, and only the
   safety checks are asserted** (Default). The gates measured the wrong thing by accident: every sheet paired one seed
   with 75% and the other with 0%, so "both seeds" was half a test of the shipped game and half a test of a setting
   no room starts in. What they should measure is what a player meets: the default. A tuning knob is there to try
   states outside the shipped one; if every extreme of every knob had to pass the service gates, no knob could exist.
   So: service gates (8, 9, 11's waits) at 75%; never colliding, never blocking an end and finishing the leg at 75%
   and at 0%. The range is not narrowed and no rule changes. Main's short-line fuzz at both settings stays as it is.
   - **Owed, and it decides this ruling:** gates 8, 9 and 11 at 75% on all four seeds (c0ffee, 777, 5eed, badd). Seeds
     777 and badd have only ever run at 0%. If either breaches at 75%, the gate fails as written and the builder
     reports; nothing moves.
   - **Printed for whoever turns the knob:** the lowest hold, of 0, 25 and 50%, at which gates 8 and 9 pass on five
     trains, in the test's table and in the tunable's comment.
2. **Gate 5(a) at the rivet is an opening transient, allowed once a leg at one lap.** In the first lap after a leg
   opens a full load may wait up to that stage's quiet round trip (1,426 at the rivet; measured 1,266). The reason:
   opening a leg puts an errand on every train that can take stone for one lap, and the kit is for a player standing
   at a frame while the crates are watched by nobody. After that lap, 1,158 as written.
3. **A.7 is withdrawn, and finding 1 above was wrong.** The 800 ticks a train that looked like the end turn was the
   block rule. With block signals at the stack line's section ends, five trains lap the finished line in 3,467, a
   headway of 693, and the ride is within 3.3% of non-stop at every stage. The end turn is not the next rail step. If
   ruling 1's run breaches on the settled line, A.7 returns as written.
4. **The bound stays 1,158** and does not go back to 1,050: its reason is the stone stop, and four laid measures
   1,092.
5. **Block signals where a train may stand with no platform** (Default): accepted, at section ends only. Riders
   cannot step off there.

**The gate for step 3, whole** (replaces E and the amended list above). Nothing asked, 12,000 ticks, against main
with build 2 and the town economy in, unless said. "Four seeds" are c0ffee, 777, 5eed and badd, hold at 75%.

1. **Stage ticks:** all stages before the rivet land on main's tick; at `ring-joined` only the listed kit, depot and
   forge fields and the new rows differ.
2. **The wagon, trip by trip,** on main's tick wherever footings are owed.
3. **Footing delivery ticks** match main.
4. **Waits, the town economy's six stages:** main's committed fuzz, both hold settings, no higher than main's.
5. **Stone.** (a) With no footings owed, a full load never waits in the Quarry's yard over 1,158 ticks, at any stage,
   fed or idle; once a leg, in its first lap, up to that stage's quiet round trip. (b) Stone landed in 20 minutes is
   at least 8 times the loads taken in the window less one round trip, printed with the load ticks. (c) 32 from
   `crossing-done` and from the idle rivet. (d) No freight stop while footings are owed, and none by a train owed a
   kit or carrying one it can unload now. Timber unchanged.
6. **Fares:** at least 40 a minute at every stage; neither crowd at `crowdCap` for 1,200 ticks running.
7. **`npm run loop -- run`:** order and bills unmoved.
8. **Waits, fixed stages 0 to 4:** worst at most 1,158, four seeds. _Owner, 12 November: until train spacing lands,
   worst at most 1,350 on a settled stage and 1,600 while the line grows ([decisions](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered))._
9. **The settled fuzz,** 20,000 ticks from 4,000 after the Gorge opens, four seeds: worst at most 1,158, mean at most
   525. The same at stage 0 with the leg open and nobody feeding. _Owner, 12 November: until train spacing lands,
   worst at most 1,350; the mean and the share over 1,050 are printed, not gated (measured worst 1,343)._
10. **The ride:** quiet round trip at most 1.2 times non-stop at every stage.
11. **The whole-leg fuzz,** four seeds: the leg completes; worst wait at most 1,600; a train stands at the new
    railhead or the Gorge within 1,158 ticks of each section laying. With the hold at 0%, two seeds: the leg
    completes and the worst wait is printed. At both settings `sepCm`, the end blocks, the block signals and the load
    check never break.
12. **The join window:** both extra trains running within 1,050 ticks of the first section laying; no running train
    held for a join.
13. **The idle room:** at rest by +1,500 with kit 1 racked, at most two trains carrying a kit, one kit car empty and
    the fourth kit not loaded; then 20 minutes with stone at least 32, fares at least 40 a minute, gate 9's figures,
    and nothing loaded.
14. **Leg timing, fed every tick:** rivet to Gorge at most 3,700; idle at the first frame at most 1,200, at frames two
    to four at most 600 each.
15. **Build 2 with the leg open:** the steel kit reaches the yard on build 2's own tick; first steel home and the
    install no more than 1,050 ticks later than build 2 alone, printed.
16. **Step 3's own tests:** each refusal; a section lays and the railhead moves; the Gorge opens on the fourth; `pick`
    refused before and granted after; kit units balance on every tick of gates 11 and 13.

**Still owed before step 3 ships.** Ruling 1's four-seed run; the rebase onto Ring Island build 2; steel-first; gate
15; gates 1 to 4 and 14 again on that base; the G1 `WORLD_NS` bump with its dated line, outside the owner's session;
the pinned fixtures regenerated; the independent review of steps 2, 3 and 5 as one batch. Steps 4 and 5 ship with it.

**What the owner is told** (owner question 1, figures replaced again): a typical wait of about 50 s; at worst about
109 s on the finished line and about 148 s for the few minutes a line is being extended. The question's first answer
is what is built; "fix how trains turn at the ends" is no longer part of it.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 78 | Wait gates are owed at the shipped headway hold (75%) on four seeds; at 0% waits are printed and only safety is asserted; the knob keeps its range | Default | Ruling 1 |
| 79 | Once a leg, in its first lap, a full load of stone may wait one round trip | Default | Ruling 2 |
| 80 | The end turn is not the next rail step; call 67 withdrawn | Default | Ruling 3 |
| 81 | Trains may stand at block signals at the stack line's section ends | Default | Ruling 5 |

**Counts:** 0 Decided, 0 New, 4 Default.

### Rulings on the rebased sheet (designer, 2026-11-12, fourth sheet)

**Read:** the builder's figures as relayed by the orchestrator (step 3 rebased onto Ring Island build 2 with
steel-first built; the long gate run, four seeds, hold 75%), the rulings above, the
[greybox waits entry](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered) and the 12 November
rewards entries. **Not read:** the step 3 code or the sheet itself (another machine, branch not pushed). **Not run by
me:** anything. **No stills:** nothing is placed, moved or gated. Lines marked *arithmetic* are my sums from figures in
this plan, not measurements.

1. **Gate 9 measured the right thing, so it is not restated as a correction; the figure is the owner's, and the build
   proceeds on a recommended reading of his word "about"** (Default; owner question below).
   - **Measured:** settled worst 1,261, 1,340, 1,397 and 1,367 by seed; means 602 to 624; 8 to 12 of about 240 waits
     over 1,158. Growing worst 1,210 to 1,421 and fixed stages 1,166, both inside their limits.
   - **Where 1,350 came from:** it is 2 minutes 15 to the tick, and it sat 7 ticks above the one worst then measured
     (1,343). The four seeds here spread 136 ticks, so a limit that close to one seed's worst was going to fail on
     another whatever was built.
   - **What a player meets:** 1,397 is 2 minutes 20. Nobody at a platform can tell that from 2 minutes 15, and it
     happens on a few waits in a hundred. The mean is about a minute.
   - **Recommended reading, built until he answers:** "about 2 minutes 15" is **at most 1,400 ticks (2 minutes 20) on
     the settled line.** The figure is fixed from here until train spacing lands. A settled worst over 1,400 on any
     of the four seeds fails, and the answer then is a rule or the spacing work, not a third figure.
   - **Not moved:** 1,600 while the line grows; gate 8 at 1,350 (it passes at 1,166); build 2's own gate (worst
     1,100); the mean and the share over 1,050, still printed and not gated.
   - **Owed from the builder:** the tick, halt and side of every settled wait over 1,350, and which change moved the
     worst from 1,343 (the rebase or steel-first). Neither is on what I was given.
   - **Worth saying to the owner:** the mean was 464 to 520 before the rebase and is 602 to 624 now. No gate holds it
     since his answer, and it is the larger change for a player: about ten seconds more on a typical wait.
2. **Gate 5(a)'s opening allowance measured one lap where it meant the opening's errands; it is restated to them**
   (Default; amends call 79). Call 79 was written on a base without steel-first ("still without build 2") and gave
   its reason as "opening a leg puts an errand on every train that can take stone". One lap was that errand's length
   then. His answer the same day, steel kit first, puts one more kit at the front of the queue, so the last opening
   kit loads at +1,345 and the first full load waits 2,252 against 1,266.
   - **What a player meets:** at the rivet the room is on Ring Island with two bills in front of it. Stone goes to the
     Village's plot 3, which nobody there is watching and nobody has asked for. The first stone of the leg lands at
     about 3 minutes 45 instead of about 2 minutes, once.
   - **Why not let a train owed a kit make the stone stop:** each stop is 108 ticks taken from a kit somebody is
     standing at a frame for. Frame two's idle was 536 against a limit of 600, and the leg was estimated at 3,670
     against 3,700 (*arithmetic*, from C and the first sheet), so one stop on a kit train is likely to break gate 14.
     On the steel train it breaks gate 15 outright: the steel kit is to reach the yard on build 2's own tick. That
     trades a wait a player stands through for one nobody sees.
   - **Why it is bounded:** the kits owed at a leg's opening are a fixed, short list, and the last of them loads at a
     known tick. From there one quiet round trip brings a train with no errand past the Quarry.
   - **If the new gate fails,** stone is being starved by something other than the opening kits; stop and report with
     each train's errand at that tick.

**The gates as amended** (others as in the whole gate above):

- **5(a).** With no footings owed, a full load never waits in the Quarry's yard over 1,158 ticks, at any stage, fed or
  idle. Once a leg, at its opening, a full load may wait until the last kit owed at that opening has loaded and one
  quiet round trip of that stage after it: at the rivet, **2,805 ticks from the rivet** (1,345 plus 1,460). In that
  time no train passes a full load unless it is owed a kit or carries one it can unload now; each train that passes
  is printed with its errand. From then on, 1,158 as written. 5(b), (c) and (d) are unchanged, and 5(c)'s 32 from the
  idle rivet is still owed on this base.
- **9.** The settled fuzz, 20,000 ticks from 4,000 after the Gorge opens, four seeds, and the same at stage 0 with the
  leg open and nobody feeding. _Until train spacing lands: worst at most 1,400; the mean and the share over 1,050
  printed, not gated; every wait over 1,350 printed with its tick, halt and side._ After it, the train-spacing table.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 105 | Until train spacing lands, leg 1's settled worst wait is at most 1,400 ticks (2 minutes 20), read from "about 2 minutes 15"; fixed until then | Default | Ruling 1. Owner question 3 |
| 106 | At a leg's opening a full load of stone may wait until the last opening kit has loaded and one quiet round trip more (2,805 from the rivet); no train without a kit errand passes it | Default | Ruling 2; amends call 79 |
| 107 | A train owed a kit still makes no stone stop | Default | Ruling 2; call 65 kept |

**Counts:** 0 Decided, 0 New, 3 Default.

**Owner question** (it does not hold the build):

3. **"You said waits up to about 2 minutes 15 are fine for the greybox. After the steel kit went first, the worst
   wait on the finished line measures 2 minutes 20. Is that inside 'about'?"**
   - **Yes: up to 2 minutes 20, and no further until train spacing lands (recommended; built until he answers).**
   - No, 2 minutes 15 is the limit: leg 1 waits for a rule that buys back five seconds, or for train spacing.
   - Drop the finished-line limit for the greybox: only the 2 minutes 40 cap applies everywhere until train spacing.
   Answer: ___

**What the owner is told about stone:** with the steel kit first, the Village's first stone after the rivet arrives
about 1 minute 45 later than before, once a leg. The other choice was to make kit trains stop for stone, which slows
the kit to the frame you are standing at.

## Design review (designer, 2026-11-12): leg 1 step 4

Answers the step 4 reader's questions b, e, f, g, i, j, k and l before the views are built, and fixes the catalog
positions step 3 takes before its bump. Where this differs from step 4's text or the reviews above, this is what gets
built. The steps above are left as written.

**Read:** the reader's sheet (relayed, 12 November UTC); this plan's section 1, steps 3 to 5 and the reviews above;
`src/sim/railway-route.ts`, `railway-ring-layout.ts` and `railway-world-lines.ts` (the `ring`, `ns` and `cave` rows);
`src/entities/ring-island/view.ts` and `ground.ts` (what stands on the halt today); `halt-map.ts`; the map JSON's
Gorge entries (`stack-n`, `stack-s`, the `gorge` line, the falls); world-blockout ruling 5; junction-stations' High
Gorge; build 2's level findings. **Not read:** the step 3 branch and build 2's views (neither is on this base; build
2's positions are the ones the orchestrator relayed). **Ran:** a script over the catalog for the positions below.
**No stills:** this worktree has no packages, and nothing of step 3, build 2 or the Gorge is drawn on this base.
Every sightline here is arithmetic on the data. Step 4's first looks are the first eyes on it; the three stills it
owes are listed under Findings.

**Frames of reference.** At Ring Island: `u` and `lat` as `railway-ring-layout.ts` (lat + is east). Along the stack
line: `s` in metres along line 2 (the catalog's cm), `lat` square to the path, + to the right going out. In the split:
`a` metres along it from the row's end point (world −103.00, −1988.00), + back towards Ring Island; `c` metres across,
+ towards the south stack (the falls side). The walls are at `c` ±45.

### Verdict

Buildable as answered. **One thing must be settled in the rules before step 3's bump** (finding 1): how a body gets
from a head to the next one, 510 m on. **Two proofs are owed with it** (findings 2 and 3). 6 decided, 1 new, 16
default.

### b. Ring Island: two bills, one each side of the tracks

The steel works keeps the east side. The stack line takes the west platform, which is empty from u 444 to u 462
(the fingerpost is at u 436, the map table at u 442, the ramp to the path at u 464).

| Thing | Where | What the player reads |
| --- | --- | --- |
| The stack line's rack | u 446.0, lat −8.4, on the west platform (y 8.9) | A stack of logs and rails with a plate, straight across the tracks from the steel pallets |
| The first frame | u 453.0, lat −8.3; 2.6 m along, 2.0 m across, leaving 1.5 m of platform at the edge | An empty grey frame 7 m north of its rack, the buffers and end board 30 m beyond it |
| Its bill sign | On a post at the frame's north end, u 454.5, face to the tracks | The line's name and the count |
| The west lever | u 457, where it is: 2.7 m clear of the frame | |

- **Why west.** The tracks become the divider: east is the works, west is the line on. The fingerpost on the same
  platform already points at the Gorge. Rack to frame is 7 m, level, no track crossed (Q7's carry). From the train's
  door on the east platform the frame is 13 m away, straight across, in view as you step off.
- **The kit hop.** At stage 0 trains still stand at the east face, so the kit hops 8 m over the up track to its
  rack. A hop is a view; it is drawn as build 1's unload is.
- **The two signs (placeholder text, not The Boogler's).** East, a heading added over build 2's counts: `STEEL
  WORKS`. West: `LINE TO HIGH GORGE` / `SECTION 1 OF 4` / `LOGS 0/20   RAILS 0/20` / `KIT: ON A TRAIN` or `KIT: ON
  THE RACK`. Rack plates: `KIT 1` west, `STEEL KIT` east. The heading is the largest line on each sign.

**Catalog positions for step 3** (world cm; `reach` 400 on each, not the halt's 1,260):

| Row | Rule | Value |
| --- | --- | --- |
| Frame 0 | Explicit: `ringAt(45300, -830)`, y 890 | x 140602, z −82506 |
| Rack 0 | Explicit: `ringAt(44600, -840)`, y 890 | x 140573, z −81806 |
| Frames 1 to 3 | 8 m short of the railhead `R` (`sectionFromCm(leg, k)`), lat +4.8, y deck + 90 | (980.75, −921.38), (566.92, −1194.48), (226.63, −1566.30) m; y 4.9 m |
| Racks 1 to 3 | Abreast of the kit wagon at the head's stop, lat +4.8: `R` − 18 m on `RING_HEAD`'s stop | (990.56, −919.95), (574.42, −1187.87), (232.07, −1557.92) m |
| `pick` | The north stack's rim, `a` 1.5, `c` −53, y 8500 | x −7435, z −203262: 12 m east, 56 m north and 82 m above the `ring` row's Gorge halt point |
| Gate 0 (the incline's barrier) | The `ns` row's Gorge halt point, on a pad behind the south platform, y 390 | x −9726, z −196884 (`a` 15, `c` +13; unmoved in x and z) |

Frames 1 to 3 follow `RING_HEAD` exactly: the platform is lat +1.8 to +6.3, the frame's near edge 2 m back from the
platform's edge, the buffer's face at `R` − 1.8. The catalog's halt stop at Ring Island is u 449; `RING_END.u` is 448.
One of them is a metre out, and the builder says which.

### e. Block signals get a post

One grey post at each section end (s 1701, 2211, 2721), right of each track, 3 m beyond where an engine's nose
stands, with the halts' existing signal arm and a plate facing back down the train: `SIGNAL` over `TRAIN AHEAD`. The
arm is at danger while a train is held there and clear otherwise, from the accepted block state. A train standing at
sea then reads as held at a red signal. No platform, no deck to step onto.

### f. Shed trains: no shed

The two extra trains have no building in the greybox. A shed with a road to it is the Roundhouse's depth design
(junction-stations draws the engine sheds). The joiner is drawn from the moment it stands at the Village and comes in
over one second (a scale-in from the accepted join), so nobody sees a train blink into being. The room that caused the
join is at the first frame, 1.2 km away. Each departure board gains its marker on the same tick.

### g. The railhead as a halt

- **At each live head** (`RING_HEAD`'s kit, grey): one 25 m platform on the right going out (`R` − 25 to `R`, lat +1.8
  to +6.3, deck + 0.9), one lever (homeward; no chained up lever at a line's end), a departure board, the rack, the
  frame and its sign, the buffer with the board of answer i, and `railheadRamp`'s sea ramp, since the deck is 4 m over
  open water. This narrows call 27: 40 m both sides is for High Gorge, not for a stub.
- **At an old head:** the platform, lever, board, rack, ramp and buffer all go on with the head. The signal post of
  answer e stays. Nothing a rider could step onto is left: a slab where trains stop and no door opens to anything is
  a way to be stranded.
- **The third head once the Gorge opens:** kept as a request halt, as step 3's rules appear to have it (round 3's
  sheet has an ask standing there after the Gorge opened). Label `Stack halt` (placeholder). It keeps platform, lever,
  board and ramp and loses the rack, frame and buffer. Condition: it is served both ways. If up trains cannot stand
  at it, it closes with the others and the builder reports; a homeward-only platform 510 m short of the Gorge would
  mislead. Owner question 1.

### i. Ring Island's end, and the garage's run

- **Stage 0** (the leg open, nothing laid): the buffers stay. The blank end board reads `LINE TO HIGH GORGE` /
  `UNDER CONSTRUCTION`, the board the owner's answer on the live greybox asked for.
- **From the first section laid:** both buffers and the end board are hidden, the run-off bed is plain track, and
  the buffer and board stand at the current head, then at the Gorge's end without the second line. The crossover
  stays drawn.
- **The garage's run** follows the line's open stops, so it grows to each head and then the Gorge. No new art.

### j. Why a kit train passes the rack

A number, in two places. Each kit car carries a board with its section's number (`2`, `3`, `4`; `S` for the steel
kit), and each frame's sign and rack plate carry the same number at the same size. The sign's last line says where
this frame's kit is. Nothing else: no hovering label, no words on the train.

### k. The Gorge's stair

- **Is 165 m right?** As a length, yes: it is an 82 m climb (platform 3.9 m, rim 85 m) at 30 degrees. Built at the
  Ring ramps' proven pitch (5.4 in 10) with landings it is about 215 m walked from the platform, about 40 s, under the
  60 s guide. It stays, and it stays the full height. Height is the one thing the Gorge's stand-in tests.
- **The cut is in turns, not in metres:** four long flights, not sixteen short ones. Each runs 38 m along the wall and
  rises 20.3 m, 3 m wide, with a solid 1 m parapet on the open side. Stacked on one strip, they draw a zigzag on the
  canyon wall that an arriving train faces: a big shape to steer by.
- **On the north wall, not the falls side.** The `ns` row comes through the south wall at `a` 50 and the `cave` row
  at `a` 4, so a stair there sits on two later legs. The north wall is clear for its whole length, and the climb
  faces the falls. Ruling 5's falls-side stair is the Gorge's own build.
- **What stands where:**
  - a concourse behind the buffers joining both platforms (`a` −4 to 0, `c` −9.3 to +9.3, y 3.9);
  - a gangway from it to the wall (`a` 0 to 3, `c` −9.3 to −41.5);
  - flights along `c` −44.5 to −41.5 between `a` 3 and `a` 41, with landings of 3 m, the last ending at `a` 3 on
    the rim;
  - a level 6 m pad at the top with the `pick` post 8 m back from the edge;
  - one slipway from the water to the gangway (nobody is stranded: the glide down can end in the split's water).
- **Budget:** 16 boxes as colliders, merged into the massing's mesh, no draw added. If frame time objects, go to
  eight flights of half the length. Never a lift marker (a teleport is a new mechanism, and the lift is the Gorge's
  later shortcut), and never a lower pickup.
- **The barrier** stands on a pad behind the south platform, reached over the concourse. It is in view from the top
  of the stair and from where a glide lands.

### l. Maps and the objective line

- **The halt map** (every display, the Ring Island map table included): line 2 solid to the current head, dashed on
  to a dim High Gorge, the head a lit stop named `Stack railhead`, with a square frame mark beside it. One fit for the
  whole leg from the moment it opens, so the map does not rescale at each lay. High Gorge lights when it opens;
  `Stack halt` replaces the head's name.
- **The Home hall's line map:** the same marks. A friend who joins late at Home needs them most.
- **The pause map:** there is none in the game. Step 4 builds none.
- **The objective line** (placeholder text; it stays by the owner's entries, and step 4 adds no new HUD element for
  it: where the route has no on-screen line, these are the telemetry objective and the signs carry the direction):

| State | Text |
| --- | --- |
| Section 1 open | `Build the line to High Gorge: section 1 of 4. The frame is on Ring Island's west platform.` |
| Sections 2 to 4 | `Build the line to High Gorge: section N of 4. Ride line 2 to the railhead.` |
| The Gorge open, `pick` not taken | `High Gorge is open. Ride line 2 to its end and climb the stair.` |
| `pick` held, the barrier shut | `Open the barrier behind High Gorge's south platform.` |

### Findings

1. **Change before step 3's bump: a body has no stated way from one head to the next** (near-universal rule 3; rule
   1). Each lay moves the halt 510 m. The sheets measured idle with units fed every tick, not with someone standing
   on a platform that has just moved. On the bow the head moved 20 m and left a walkway; here the choice would be a
   91 s walk on a running double track or a menu. **Ruling (New):** the head's halt stays where it is until the first
   train after the lay has stood there and left; that train runs on to the new head. The views follow the accepted
   halt position, so the old platform goes as that train leaves. A straggler left behind uses Get unstuck (change 6).
   **Owed:** from each lay, a player standing at the old head and asking nothing more than the lever is at the new
   frame within 1,158 ticks, printed. If step 3 already does this, the proof is all that is owed.
2. **Proof owed: a unit lifted from one rack cannot short the other bill** (rule 3: keys can't be lost). Two racks of
   logs and rails stand 17 m apart with exactly a bill's worth on each. Either a unit taken from a rack feeds only
   its own bill, or a shortfall is owed again. State which, and test it.
3. **Proof owed: the stub stop with the long boiler fitted.** The steel is optional before this leg, so a long engine
   may arrive at a head. Its nose must stop short of the buffer, and the rack follows the kit wagon, which is why the
   rack's rule above is "abreast of the wagon".
4. **The lens "one main line" bends at Ring Island** (two open bills, as ruled in step 3's review B). The tracks
   between them and the headings are the answer. Watch the first owner session for logs carried across the tracks.
5. **The catalog draws three rows to one point in the split.** The `ns` and `cave` rows end on the `ring` row's own
   end point, across its south platform. Leg 1 lays neither, so nothing here breaks, but the Gorge's platform plan is
   leg 2's level check before its design review.
6. **Research.** [route-contract](../research/route-contract.md): holds. The stair is a travel edge, `pick` still
   refuses until the fourth section is laid, and a glide or a swim reaches the rim's pad early and finds a post that
   reads "Not yet" (call 28). [level-design](../research/level-design.md) and
   [progression-flow-layout](../research/progression-flow-layout.md): the zigzag is the big shape, the signs the small
   one; "the key in sight of the lock" holds at the Gorge (the barrier from the stair's top). Top blocks not re-read
   for this ruling.
7. **Stills owed by step 4, read before it ships:** from the east platform's door at Ring Island looking west (both
   signs in one frame); from a train 200 m out in the split (the zigzag and the platform); from the rim's pad looking
   down (the barrier).

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 82 | Grey, labelled, readable; no character detail | Decided | [Owner call, 11 November](../agents/owner-calls.md#mechanisms-systems-greybox-details) |
| 83 | Trains haul; the player does not carry freight or call a train for it: kit comes to a rack, the last carry is short | Decided | [12 November](../decisions-rewards.md#d-2026-11-12-town-economy-answered) |
| 84 | The greybox is live for everyone, with a "line under construction" board at its end | Decided | [12 November](../decisions-rail.md#d-2026-11-12-ring-island-build-2-and-the-greybox-route-answered) |
| 85 | Ends have buffers and read as terminals | Decided | 10 November (call 9) |
| 86 | Trains stop on request; a lever a platform side; a departure board | Decided | 10 and 9 November (call 10) |
| 87 | The objective line stays; words and signs sparingly | Decided | [10 November](../decisions-core-loop.md#d-2026-11-10-the-objective-marker-may-come-back), [9 November](../decisions-core-loop.md#d-2026-11-09-signposting-words-and-beacons-are-allowed) |
| 88 | A head's halt stays until the first train after the lay has stood there and left; that train runs on to the new head | **New** | Finding 1 |
| 89 | The first frame and its rack on Ring Island's west platform (u 453 and u 446); the works keeps the east | Default | b |
| 90 | Frames 1 to 3 stand 8 m short of the railhead at lat +4.8, racks abreast of the kit wagon; reach 4 m | Default | b |
| 91 | The two signs' headings and lines; rack plates | Default | b; placeholder text |
| 92 | `pick` on the north stack's rim, 82 m up, 8 m back from the edge | Default | k; places call 18 |
| 93 | The Gorge's stair: four long flights on the north wall, about 40 s; never a lift marker or a lower pickup | Default | k |
| 94 | A concourse behind the Gorge's buffers, a gangway, a slipway from the split's water; the barrier on a pad behind the south platform | Default | k |
| 95 | A block signal is a post with an arm and a plate | Default | e |
| 96 | No shed; a joining train comes in over one second at the Village | Default | f |
| 97 | A live head has one 25 m platform, one lever, a board, a buffer and a sea ramp; an old head keeps only its signal | Default | g; narrows call 27 |
| 98 | The third head stays as a request halt, `Stack halt`, if it is served both ways | Default | g. Owner question 1 |
| 99 | Ring Island's buffers and end board are hidden from the first lay; the board reads "under construction" before it and travels with the head | Default | i |
| 100 | The garage's run follows the open stops | Default | i |
| 101 | Kit cars and frames carry the section's number | Default | j |
| 102 | The halt map and the Home hall's line map mark the head and its frame, fitted once for the whole leg; no pause map | Default | l |
| 103 | The objective line's four texts; no new HUD element in step 4 | Default | l; placeholder text |
| 104 | Three stills and three proofs owed | Default | Findings 1, 2, 3 and 7 |

**Counts:** 6 Decided, 1 New, 16 Default. **Suspect lines of The Boogler's:** none written or changed. **Port from
Place:** nothing.

### Owner question

It does not hold the build.

1. **"Once the line reaches High Gorge, should the last building platform, out at sea three quarters of the way
   there, stay as a stop?"**
   - **Yes, as a request stop (recommended; built until he answers).** Trains pass it unless someone pulls the lever,
     so it costs no wait, and it is a place to get off over open water.
   - No: it goes when the Gorge opens, and the line is Ring Island to High Gorge with nothing between.
   Answer: ___
   **Answered (owner, 12 November UTC): yes, as a request stop (recommended).** Recorded in the
   [decisions](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered).
