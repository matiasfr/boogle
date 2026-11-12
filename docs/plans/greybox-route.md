> **Status: plan for the owner's and the designer's review (11 November 2026).** Nothing here is built. Phase B of
> [campaign-outline](campaign-outline.md): the whole route, rough. Three owner questions are open
> ([below](#open-questions)); leg 1 does not wait for them.

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
