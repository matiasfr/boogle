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
  railhead: number; dest: number; // halt indexes on its line: the moving railhead and the halt the last section opens
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
sections complete; `logs`, `rails`: fed into the current section; `start`: its lay clock, -1 idle). `Yard { slot,
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
fixed by the catalog: the `Leg`, `Yard` and `Route` components, the four ops, **every** row of `RAIL_LINES`,
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

- [ ] **1. The map data (P0; Mac, S).** In `dev/level/world-blockout.ts` set `SERVICES` to rail-map's five services:
      no Ring top; line 2 runs on from the Ring Island halt along the west shore; the Gorge halt at 3 m in the split;
      one West landing halt; the cave line ends at Port Quay; decks meet islands at their height; no span over 4%.
      Regenerate `src/sickle/world-lines.ts`, the legs table and `docs/world/world-blockout.html`. Verify:
      `test/world-lines.test.ts` gains "no future span is steeper than 4%"; `npm run level-check` lists none of today's
      12 would-fail reports for `stack-centre`.
- [ ] **2. The catalog, pure (HOTBOX, S).** `git mv src/sickle/world-lines.ts src/sim/railway-world-lines.ts` (it is
      written to the sim's rules; update the generator's path and the three readers). Create
      `src/sim/railway-route.ts` with the types above and all six legs' rows derived from it: `sectionsOf(leg, n)`
      cuts a leg into `n` equal sections on whole centimetres; `pathOf(pts)` samples a line every 10 m with
      `Math.sqrt` only. Verify: new `test/railway-route.test.ts`: every leg's sections cover its length exactly; bills
      match the table in section 1; each `after` and `needs` points backwards; the three long-range gates equal
      `standins.ts`'s `GATES`.
- [ ] **3. The rules (HOTBOX, L).** `railway-components.ts`: `Leg`, `Yard`, `Route`, spawned in catalog order in
      `createRailwayWorld`. New `railway-sys-route.ts`: `rail.legStock`, the lay tick (a section lays over
      `layTicks`, as a QJob does), `rail.grant`, `rail.gate`, `rail.arrive`. `railway-lines.ts`: line 2 gains a
      `Stack railhead` halt (`heads`, a stub end) and `High Gorge` (buffers, a crossover before it), `fleet` of 3, 4, 5
      and 5 trains as sections 1 to 4 lay, and the `ns`, `bay` and `cave` rows with every halt closed. `railway-train.ts`
      and `railway-queries.ts` as section 2. `railway-server.ts` validates the four ops (`railInt` on every id; a
      malformed value is refused, never thrown). `railway-check-route.ts`. `namespace.ts`: the bump and one dated
      line. Verify: `test/railway-route-rules.test.ts`: each refusal above; a section lays and the railhead halt
      moves; the Gorge opens on the fourth; `pick` is refused before it and granted after; the existing mixed-fleet
      fuzz, 20,000 ticks under random lever asks on the grown line, keeps `sepCm`, the end blocks and a 105 s worst wait.
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
Rejoin proofs run where a component first appears (leg 1 for `Leg` and kit aboard, leg 2 for `Yard`, leg 6 for
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
