# 6.27 Prototype: the line feeds the town (`?proto=net`)

> **Retired, 13 November 2026:** server-owned-state step 5 removed the classic haul, gifts, bank and opening
> systems and the net/wagon prototypes. The account-based railway is the live game. The text below is a dated
> design record, not current runtime behavior; paths to retired implementations name their historical owners.
> The eight haul tuning keys remain until the classic transport is retired. The Boogler's copy is preserved in
> [gift-catalog.ts](../../src/sim/gift-catalog.ts); see [retired copy](retired-classic-copy.md).

*A greybox prototype for [find-the-fun](../plans/find-the-fun.md), step 6, from the owner's rail-loop direction in
[decisions.md](../decisions.md) ("Trains and the world", 2026-11-02), after Death Stranding's auto-pavers and
monorails: building infrastructure makes it easier to build more. Gut question: "When the village steps up, do you want
to go connect the next camp?" Serves DESIGN.md 1 (Toys before chores) and 9 (Leave something for the next visitor).
Without the flag nothing loads: `src/features/proto-net.ts` imports `src/proto/net/` only with it. Research:
[carrying and logistics](../research/carrying-and-logistics-play.md) (finding 2, rec 7), [construction you can
watch](../research/construction-you-can-watch.md), [era progression](../research/era-progression.md).*

## The place

`?layout=net-line` ([dev/layouts/net-line.json](../../dev/layouts/net-line.json)) moves the three route sections into a
line of about 255 m on today's island, legs of 81 to 91 m: the village on the south-west beach, Camp 1 north of it, Camp
2 on the north shore, the frontier on the east shore. The layout also leaves trees and rocks out along the line and in
the camps' yards. An address without the layout or a `proto-net` room reloads with them.

## The run

1. **Start.** You land in a small village of low huts by the first Track ring. A tall column of white smoke and a row of
   orange-flagged stakes show where the line goes next.
2. **First link, by hand.** Take logs from the palms (back bundle, as in [haul](haul.md)), pour them in the Track ring,
   and start the machine. A section costs 24 logs, six takes. There is no Helper ring on this line.
3. **Camp 1 wakes.** When the machine reaches the camp, a sawmill goes up piece by piece in about 5 s: scaffolding,
   ground, frame, walls, roof, flying in from the railhead. Then it makes a brown crate every couple of seconds, which
   hop onto a pile.
4. **Crates ride.** The wagon runs by itself. At a camp's stop, on its way home, crates hop from the pile onto its rear
   flatbed (8 slots); at the village's stop they hop off into a heap. The wagon's fixed crates are gone on this page, so
   you see only what it really carries.
5. **The village steps up.** After 6 wood crates the huts sink and timber halls with red roofs rise, rippling out from
   the middle, then a 30 m clock tower. Fanfare and fireworks over the tower; chimneys start to smoke.
6. **It gives back.** The train goes from 6.5 to 10 m/s, taking over at the stop it stands at. And (not in `&v=haul`) the
   village loads 4 yellow crates onto the flatbed; they ride to the railhead, hop into the open Track ring, and fill it
   (`tune.fill`). You walk or ride there and press Start.
7. **Second link, second camp.** A quarry goes up on the north shore and makes grey crates. After 6 of them the town
   steps up again: streets of stone blocks with window bands, a works stack and a 48 m keep with a gold crown. The clock
   tower and one hut from the first day stay.
8. **Third link, the frontier.** The last section ends at a buffer stop and a jetty, pointing at a far island silhouette.
   Reaching it makes the town its biggest: more blocks up the hill behind a red-and-white signal mast. The prototype
   ends there with the network running.

The world is the readout: no counters or progress bars for goods or stages. The Track ring's sign is the game's own.

**`&v=haul`** is the same run, except the rail never fills the ring: you haul every section by hand. Comparing them tells
whether the fun is the rail doing the work or the town growing. It uses the same room, so switching keeps your place.

**`&v=depot`** asks "Does the haul feel good now that the network is helping?", after the owner's lean
([decisions.md](../decisions.md), "junctions unlock the network") and Death Stranding's auto-pavers fed from
nearby stock ([compounding infrastructure](../research/compounding-infrastructure.md), summary 1, recs 1 and 5). Same run,
town and camps, and the rail never fills the ring:

1. The first section is hauled by hand from the palms, as above. Bundles more than 45 m from the first stop have moved to
   the depots, so the later rings aren't served by palms next to them.
2. When Camp 1 connects, a depot (a plinth and an orange flag) goes up in about 4 s beside the line, 56 m short of the
   ring. At the village the wagon takes on 4 yellow crates and throws up to 3 off onto the stack as it passes.
3. Interact at the depot (Take logs) takes a whole section's load in one press: 3 crates, 24 logs on your back, never more
   than the open ring still wants. Carry it to the ring, about 10 s on foot, and press Start as usual.
4. Camp 2's depot stands 28 m short of its ring, takes up to 4 crates a pass and goes up already holding a load: about
   4.5 s on foot. The train still speeds up after the first step-up.

Scripted at iPad size, walking, from the machine's whistle to the ring full: about 28 s for the second section (3 s of it
waiting for the first crates) and 14 s for the third. The first, by hand on a straight route, takes about 12 s.

**The panel** has Start over and Skip the haul (fills the open ring).

## Numbers

| Tuning | Value |
|---|---|
| Section cost (`tune.set cost0`) | 24 logs |
| Train cruise (`wagonCruise`) | 65, then 100 cm per tick after the first step-up |
| Train speed-up (`wagonAccel`) | 20 ticks |
| Step-ups | 6 wood crates, 6 stone crates, then the line reaching the frontier |
| Crates to fill a ring | 4 |
| A working camp makes a crate every | 1.8 s, up to 14 on its pile |
| `&v=depot`: a crate gives | 8 logs (2 `src.take`s); up to 9 on depot 1, 14 on depot 2 |

## How it's built

No new lockstep. Laid sections are `rules.sites`; cost and pace are `tune.set`, a filled ring `tune.fill`, Start over
`tune.reset`. Crates, piles and the town's stage are Local, counted in this tab and kept in localStorage per room, so a
reload keeps your place and a second tab sees its own town. The stages are one table
(`src/proto/net/stages.ts`, the shape of `src/proto/era/blocks.ts`). The wagon is `src/proto/wagon/` with its own
timetable (`src/proto/net/timetable.ts`), because its timetable moves the wagon when the pace changes. Blocks have no
colliders: you walk through them. `&v=depot` (`src/proto/net/depot.ts`) adds no lockstep either: bundles away from the
village move to the depots through `haulHooks.moved`, as in the haul prototype's wave, so a load is six `src.take`s at
once. The crates are Local, and a reload finds a standing depot stocked.

Era and Net share the pure box placement and growth-drawing functions in `src/render/box-plan.ts`.
Their building recipes, geometry, timing and state owners remain separate.
