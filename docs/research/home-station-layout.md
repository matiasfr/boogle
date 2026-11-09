# Home station layout: one station, a real throat, a roundhouse that fits

> **Verdict:** Home's two halts, the table-centre junction and the kinked stall road are what read as unreal, not the sizes. Recommend option B: one terminus with an island platform for both lines, the forge as its goods side, and the turntable moved onto its own engine spur with radial stalls.
> **Top recommendations:** 1. One island platform serving both lines at buffer stops by a concourse that faces the town. 2. Keep every line's arc length (stagger the buffers) so no `s` constant moves. 3. Take the turntable off the running lines; stall roads radial, stalls about 1.0× the table deep. 4. Keep the 9.6 m table. 5. Fit the station's ratios to Boogle's short trains, not real platform lengths.
> **Status:** adopted, with the plan's changes: the owner picked B on 9 November, and [the home-station plan](../plans/home-station.md) builds it (joins at s 60 and s 84, a 4.3 m island, the table on a spur off road 2, stalls at 160°, 190° and 220°, the cart's leg). [home-layout.html](../world/home-layout.html) now shows today and B as planned, generated from the code; options A and C and the numbers below are this report's, not the plan's.

_Research report, 9 November 2026. The owner asked, with a screenshot of Home: "visual pass on home here should be done so
the town is coherent, the rails feel more realistic, instead of 2 stations maybe it's one unified one, where the rails also
make sense with the rotunda and is to scale. we can adjust placement as needed". "Rotunda" is the Roundhouse stall and its
turntable. Measurements come from the code at `edef8289` (`src/proto/place/layout.ts` and the `src/sim/railway-*.ts`
catalogs, imported and sampled, not read off screenshots). Options were laid out with straight and arc track (fixed-radius
Dubins paths) joined onto today's lines. Analysis only: no game code was changed; no browser, GPU or bot run was made._

**Markers.** **[V]** the page was fetched and the point matches it. **[S]** seen only in a search summary, a forum or a
fan wiki; check it before relying on it. **[C]** computed here from the code. **BH** is Buddy's height, 1.6 m. Coordinates
are Place-local metres (world x = local x + 1000), north is −z, bearings are clockwise from north.

## TL;DR

1. **What reads as unreal is the arrangement, not the sizes** [C]. Two 22 m halts stand 30.5 m apart on the _outer_ sides of
   two lines that both start at the turntable's centre and leave it 94° apart. No line train ever turns on the table, the
   stall road kinks twice to reach a stall that is not radial, and goods (crane, dock, boiler pedestal) are handled from the
   passenger side of line 1. Meanwhile every town door already faces the junction.
2. **Real small stations solve this one way** [V/S]: one platform face per line, both on one island or one concourse;
   buffer stops by the station building, which faces the town; a goods shed with a dock on its own road; the engine shed on a
   spur near the buffer end, its stalls radial to a table about as long as the longest engine. Bembridge (Isle of Wight) is
   the precedent for a turntable doing a junction's work where there was no room for points [V].
3. **Option B does all of that and moves no lockstep `s` value**: staggering the two buffer stops by 1.74 m and 0.59 m keeps
   each line's arc length to its join (s 82 and s 86) unchanged, so `TRAIN_STOPS`, the station spans and `CART_ROAD`'s
   distances keep their meaning. It still re-pins every x/z anchor inside s 86 and reroutes the cart (a crossover instead of
   the table turn), so plan for a `WORLD_NS` bump at a session boundary.
4. **Option C is the cheap fallback** (no bump, no stop change): one station in the vee between the lines and the stall made
   radial where it is. **Option A** (an island with the table at its head, on the square) costs the most: every `s` constant
   on both lines grows by 15–16 m.
5. **Keep the 9.6 m table.** It is 3.2× the 3.0 m loco, but the longest thing it turns is the shunter with a footing wagon
   (7.6 m), and 1.26× that is close to the real 1.03–1.15× band.

## Home today, measured [C]

| What                    | Number                                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Line-1 halt (Village)   | s 8–30, 22 m, outer (north-west, forge) side, deck centre (−71.81, −4.34)                                                    |
| Line-2 halt             | s 6–28, 22 m, outer (south-west) side, deck centre (−72.21, 26.17); half of it beside a 47–55 m curve                        |
| Halt to halt            | 30.51 m between deck centres; 19.3 m and 17.2 m from the table's centre                                                      |
| Trains                  | three cars 10.5 m (loco 3.0 × 1.6 m, cars 3.2 × 2.2 m); with the footing wagon 14.2 m. Platforms are 2.1× and 1.55× those    |
| Train at its stop       | line 1 s 14 covers s 8.7–19.2; line 2 s 17 covers 11.7–22.2 (8.0–22.2 with the wagon)                                        |
| Gauge, sleepers         | rails ±0.5 m (1.0 m gauge, 0.63 BH), sleepers 2.3 m; platform edge 1.65 m from the track centre, deck 0.72 m above rail      |
| Leaving the table       | line 1 at 40.6°, line 2 at 135°: both from the table's centre, 94.4° apart; 8.8 m apart at s 6                               |
| Curves                  | line 2's tightest 15–15.3 m at s 32–34, just past its platform; line 1 about 66 m near Home (16 m at s 139)                  |
| Turntable               | r 4.8 m (9.6 m), a raised 0.24 m disc; turned by the cart (26 ticks) and the shunter, never by a line train                  |
| Stall                   | a 4 × 9 m ruin at (−90.5, 18.5), 12 m from the table; its road leaves the rim at 225°, then kinks about 25° and 70°          |
| Forge                   | 10 × 8 m at (−87, −3); 15.3 m to halt 1, 32.7 m to halt 2, 23.8 m to the stall                                               |
| Town to platforms       | museum – halt 1 53.3 m, Pip's house – halt 1 44.9 m, shop – halt 2 44.1 m; forge – museum 38.3 m, forge – house 30.4 m        |
| Walks (straight line)   | forge rack – Q2 rack 36.2 m (6.5 s at 5.6 m/s); boiler pedestal – line-1 platform 13.4 m, then a 179 m ride to the old train; footing wagon – stall door 11.3 m |

**What is off, by measurement:**

1. **Two stations.** The halts face away from each other on the outside of the fork, 30.5 m apart. Changing lines means
   walking round the fork or across the table.
2. **No throat.** Both lines begin at the table's centre; there is no turnout anywhere at Home, so the table is the only
   thing joining them, yet no line train uses it.
3. **The stall is not on the table.** Real stall roads run straight off the rim; this one bends twice to reach a ruin that
   is not radial.
4. **The train is toy-short, not toy-small.** A car is 2 BH long and 1.4 BH wide; a real coach is about 11 BH long and 1.7 BH
   wide. Length is compressed about 5× and width hardly at all, so the whole train is about the forge's 10 m length. This is
   why real platform and turntable ratios look wrong here: they must be taken against Boogle's train, not a real one.
5. **The turntable is 3.2× the loco** (real: about 1.1×) and a raised disc with rails across it rather than a pit.
6. **Goods share the passenger side.** The crane (−80, 2.5), dock (−78.6, −1.5) and boiler pedestal (−81, 5.4) stand
   3.5–6 m off line 1 on the same side as the line-1 platform.
7. **Q1's frame (−72.8, 10.6) stands inside the fork**, between both lines.
8. **The cart-call handle (−84.8, 14.8) is 3.96 m from the table's centre**, inside the 4.8 m disc's footprint. (The handle
   is being cut: [orchestrator state](../agents/orchestrator-state.md), 9 November.)
9. **The town faces a junction with no station in it.** Pip's house (yaw 1.42), the shop (2.05), the museum (0.97) and the
   wood-1 hall (2.73) all turn their doors toward the table, but the nearest platform is 44–53 m from each.

## What real small stations do

**Platforms for two lines.** A side platform serves one road; an island platform between two roads serves both from one
deck, which is the usual way to give two routes one station without a footbridge [S]
([Railway platform](https://en.wikipedia.org/wiki/Railway_platform)). The Minories model terminus packs two roads either
side of an island into the throat of a city terminus and is the standard compact layout [S]
([Minories](<https://en.wikipedia.org/wiki/Minories_(model_railway)>)).

**Releasing the engine at a terminus.** A run-round loop has to be as long as the longest set of cars [V]
([Run-round loop](https://en.wikipedia.org/wiki/Run-round_loop)). Where there was no room, Withernsea, Ventnor and Bembridge
used a turntable at the platform end instead [V]; at Bembridge on busy Saturdays the table "revolved continuously because the
station area was too small to contain points" [V] ([Bembridge](https://en.wikipedia.org/wiki/Bembridge_railway_station)).
Ventnor had a side platform plus a narrow island, its goods sidings away from the building, and later replaced the table
with a three-way point [V] ([Ventnor](https://en.wikipedia.org/wiki/Ventnor_railway_station)). Boogle's trains shuttle
(the loco stays at the outer end and propels back), so no run-round is needed at all.

**Where things sit.** On a branch terminus the engine shed sits on a spur, usually at the buffer-stop end; the goods shed
and its dock sit on their own road, often at the town end; the basics are a platform, somewhere to run round and somewhere
to handle goods [S] ([RMweb thread](https://www.rmweb.co.uk/forums/topic/166269-goods-shed-and-engine-shed-locations-for-branch-line-terminus/)).
Model designers compress lengths and keep these relationships ("selective compression") [S]
([Layout design elements](https://www.trains.com/wp-content/uploads/2020/10/618204LayoutDesignElements.pdf)).

**Turntables and roundhouses.** Bridges ranged from 6 to 120 ft; examples are 100 ft at Spencer and Raleigh, 70 ft at
Didcot, 65 ft at Swindon, 60 ft at Peak Rail and 55 ft at Swanage; tables were replaced when engines outgrew them [V]
([Railway turntable](https://en.wikipedia.org/wiki/Railway_turntable)). Spencer's 1924 roundhouse has 37 stalls on a
100 ft table with stalls about 106 ft deep, replacing a 60 ft table [V]
([NC DNCR](https://www.dncr.nc.gov/blog/2016/12/02/new-roundhouse-spencer-1924),
[ASME landmark](https://www.asme.org/wwwasmeorg/media/ResourceFiles/AboutASME/Who%20We%20Are/Engineering%20History/Landmarks/248-Southern-Railway-Spencer-Shops.pdf)).
Modellers' rule of thumb is a table slightly longer than the longest engine, stall angles of 7.5–12° on big houses, and
stall doors about 13–14 ft for 10 ft wide engines [S]
([Trains forum](https://forum.trains.com/t/turntables-roundhouses-and-expansion/176462),
[MRR forum](https://cs.trains.com/mrr/f/11/t/271752.aspx)).

**Platform length.** A platform is the longest train plus a stopping allowance: Rail Baltica specifies a 200 m physical
platform for a 210 m nominal one with reserves for stopping [S]
([Rail Baltica design guide](https://www.railbaltica.org/wp-content/uploads/2023/02/RBDG-MAN-025-0107_InfrastructureFacilities.pdf));
UK practice allows about 4 m [S]. Narrow-gauge England engines on the Ffestiniog run on 597 mm gauge with a 4 ft 6 in
wheelbase, a real railway at nearly toy scale [S] ([Festipedia](https://www.festipedia.org.uk/wiki/England_Engines)).

## Ratios that survive toy scale

Take each against Boogle's own train and Buddy, not against real sizes.

| Ratio                                      | Real                                    | Boogle today [C]                          | Use                                                     |
| ------------------------------------------ | --------------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| Table length ÷ longest thing it turns      | 1.03–1.15 [S]                           | 9.6 ÷ 7.6 (shunter + wagon) = 1.26        | keep 9.6 m                                              |
| Stall depth ÷ table length                 | 1.06 (Spencer) [V]                      | 9 ÷ 9.6 = 0.94                            | 0.9–1.1: a 9 m stall                                    |
| Stall door ÷ engine width                  | about 1.3–1.4 [S]                       | none (ruin)                               | 3.1 m for the 2.2 m car                                 |
| Stall angle                                | 2·asin(door ÷ 2·door radius) [C]        | none                                      | 3.1 m door at 6 m: 30°, so three stalls fill a 60° fan  |
| Platform ÷ longest train                   | about 1.05, plus a fixed allowance [S]  | 22 ÷ 14.2 = 1.55                          | train + about 2 m each end: 18–23 m                     |
| Run-round loop ÷ train                     | at least 1.0 [V]                        | none needed (trains shuttle)              | none                                                    |
| Station building to platform               | across or beside the buffer end [S]     | no building                               | the concourse across the buffer ends, facing town       |
| Track centres either side of an island     | platform width + 2 × edge offset        | none (lines 8.8 m apart at s 6)           | 4 m island + 2 × 1.65 m = 7.3 m                         |

## How toy-railway games handle it

- **The Legend of Zelda: Spirit Tracks** [S]: the villages are a handful of buildings (Aboda has three houses,
  [Zelda Wiki](https://zeldawiki.wiki/wiki/Aboda_Village)) with one station each, and the director has said the look came
  from a picture book ([Iwata Asks](https://iwataasks.nintendo.com/interviews/ds/zelda/0/0)). That the station is each town's
  front door is from general knowledge of the game, unverified here. **Take:** one station per place, and the town arranged
  around its front.
- **Dragon Quest Builders 2** [S]: players build the stations that link areas, from a loading station at Khrumbul-Dun to a
  long railway on Scarlet Sands ([Let's Play Index](https://www.letsplayindex.com/video/dragon-quest-builders-2-ps4-commentary-068-scarlet-sands-Qd2gw8Isyl4)).
  **Take:** the station is a building you can name and point at, not a strip of platform.
- **Railway Empire 2** [S]: a station is a building with platforms added out from it, and warehouses beside it
  ([magicgameworld guide](https://www.magicgameworld.com/?p=128164)). **Take:** one building, platforms running away from
  it, goods next door: the shape of option B's concourse and forge.
- **Unrailed!** [S]: each station is one block on the line where the train stops and wagons are bought
  ([Steam](https://store.steampowered.com/app/1016920/Unrailed/), [wiki](https://unrailed-wiki.com/page/Wagons)).
  **Take:** one stop per place, big and readable from above.
- **Townscaper** [S]: an irregular grid where blocks turn into houses by rule
  ([Steam](https://store.steampowered.com/app/1291340/Townscaper/)). **Take:** a toy town reads coherent because every
  piece follows the same proportions, not because the proportions are real. For Boogle that means the ratios table above.

## The options

All three were drawn to scale on the first version of [home-layout.html](../world/home-layout.html) (git history), with
today's layout, walk lines, trains, a Buddy figure, a clearance check and each option's moves; the page now shows only
today and B as planned. The clearance check's results are repeated here.

**A: through island with the rotunda at its head.** The table moves 14.6 m west onto the square (−96.6, 12.3). Both lines
start at it and splay into parallel roads 7.3 m apart either side of a 4 × 23 m island, then rejoin today's lines at s 82
(line 1) and s 86 (line 2) on R 22 m curves (R 15 m in the splay). Every `s` past the station grows: line 1 by 16.3 m, line 2
by 15.15 m, so `TRAIN_STOPS`, `LINE1_STATIONS`, `LINE2_STATIONS`, `CART_ROAD`, `WAGON_S` and `PIER_STOP_CM` all change,
which needs a `WORLD_NS` bump and invalidates every railway bot route and seed down both lines. The spawn and the square's
path hub fall inside the table (the square becomes the turntable) and the curio shelf ends 1.2 m from line 1. Walks
shrink: rails 11 m, boiler 8 m; footings grow to 19 m.

**B (recommended): terminus with one concourse; the forge is the goods side.** Both lines end at buffer stops by a 13 × 7 m
concourse at (−88.4, 8.7), where the town's doors already point; the island is 4 × 23 m between the roads. Buffers are
staggered 1.74 m (line 1) and 0.59 m (line 2) so each line's length to its join is unchanged: `TRAIN_STOPS` and every `s`
constant keep their values. The table moves 21 m to (−64.3, 23.4) on an engine spur off road 2 (R 10 m, 90°), with three
radial stalls at 130°, 160° and 190°, the 160° one open. Crane, dock, forge rack and boiler pedestal move to the forge side of
road 1. Re-pinned (x/z catalog values): `LINE_HALTS`, Q1 and Q2 frames, `LINE2_FORGE` rack, `LINE2_BOILER`, `SHED_TABLE`,
`SHED_STALL`, `WORKS_SEAMS[0]`. The cart needs a crossover at the throat and a reversal instead of the table turn, which
changes `CART_ROAD`'s phases. Bump: likely (the cart's road changes shape); a planner should confirm whether it can be folded
into `CART_ROAD` distances without a new phase. The stone yard (−62, 20) is under the new table and moves (scenery). Proofs
invalidated: the Home legs of the railway bot route (forge, racks, boiler, stall, footings), cart-route proofs and the
shunter/stall seeds; line proofs past s 86 hold. Walks: rails 24 m (from 36), boiler 8 m (from 13); footings grow from 11 m
to 24 m because the stall moves out to the spur.

**C: one station in the vee (minimum move).** Lines unchanged. One wedge platform runs s 5–28 on the inner faces of both
lines, with an 8 × 6 m building at (−60.0, 11.2) on the bisector and a canopy over the forecourt. The trains' doors face each
other across the forecourt, 19 m apart. The stall becomes radial where it is: the open stall at 235° (its centre 2.5 m from
today's `SHED_STALL`, over today's cracked slab) and a ruin outline at 265° (a third at 295° would land on the curio shelf).
Q1's frame moves out of the vee (13.9 m). Only `LINE_HALTS`, the Q1 frame and
`SHED_STALL` change, all position values: no `WORLD_NS` bump, no stop change. Proofs invalidated: bot waypoints for the
halts, Q1 and the stall. The table stays a junction, which Bembridge makes plausible, but it remains 3.2× the loco on the
running lines.

## Recommendations

1. **Build option B.** It is the only option that gives the owner one station, a throat where the lines meet, a turntable
   that "makes sense" (an engine spur with radial stalls) and a station building where the town already faces, while keeping
   every `s` value, so the line-side work past s 86 is untouched.
2. **Keep arc length when re-laying track near a station.** Absorb the difference in the buffer-stop position (B's 1.74 m and
   0.59 m stagger). This is what keeps lockstep catalogs and bot proofs valid outside the edited area.
3. **Take the turntable off the running lines.** Line trains never use it; give it its own spur, stall roads radial off the
   rim, stalls about as deep as the table (9 m), doors 3.1 m, 30° apart.
4. **Keep the 9.6 m table** (1.26× the shunter with a wagon). Sink it to a pit with a rim if the art allows; that alone reads
   more like a turntable than the raised disc.
5. **Size platforms to Boogle's train**: about 23 m on the island (the 14.2 m train plus about 2 m each end and the stop's
   tolerance). Don't lengthen the train to fit real ratios; it is a toy train and the ratios above already account for it.

## Owner questions

1. **Which layout?** Recommended: **B**. C if you want it this week with no reset; A only if you want the table on the square.
2. **When does B's world reset ship?** Recommended: **as its own `WORLD_NS` bump at a session boundary once B is built**;
   don't hold glider B's v23 for it.
3. **Keep the 9.6 m turntable?** Recommended: **yes** (it turns the shunter and a footing wagon with 1 m to spare).
4. **One open stall and two ruin outlines, or a full three-stall shed now?** Recommended: **one open, two outlines**, so the
   shed can grow when more engines arrive.
5. **Should line trains ever turn on the table?** Recommended: **no**; it is for the shunter and the cart, and the trains keep
   shuttling.
