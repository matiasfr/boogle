# 6.27 Prototype: the line feeds the town (`?proto=net`)

*A greybox prototype for [find-the-fun](../plans/find-the-fun.md), step 6, from the owner's rail-loop direction in
[boogle-2.md](../proposals/boogle-2.md) ("Trains and the world", 2026-11-02), after Death Stranding's auto-pavers and
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

## How it's built

No new lockstep. Laid sections are `rules.sites`; cost and pace are `tune.set`, a filled ring `tune.fill`, Start over
`tune.reset`. Crates, piles and the town's stage are Local, counted in this tab and kept in localStorage per room, so a
reload keeps your place and a second tab sees its own town. The stages are one table
(`src/proto/net/stages.ts`, the shape of `src/proto/era/blocks.ts`). The wagon is `src/proto/wagon/` with its own
timetable (`src/proto/net/timetable.ts`), because its timetable moves the wagon when the pace changes. Blocks have no
colliders: you walk through them.
