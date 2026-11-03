# 6.28 Prototype: a real place (`?proto=place`)

*A throwaway greybox, round 4 ([plan](../plans/round-4.md)): "Did you get hungry for a better way, and did finding one feel great?" The owner and Grant after round 3: "the only thing asked of me was to just chop 1 or 2 trees, so I wasn't feeling hungry for more efficiency yet"; "seeing a path between two areas open up which was previously tedious was satisfying"; the trains were "too much too soon". So: a good slog by hand, a path you can walk, a ladder of relief, and trains last. Chop, carry, stacking and laying keep their feel from round 2 ("it felt like my work became the track"), and the crates and little guys from round 3 stay. The decision log's rules bind it: nothing consumed and vanishing, construction that drops into place, what looks solid is solid, a small prompt is direction enough, first gifts are cosmetic.
Serves DESIGN.md 1 (Toys before chores), 7 (Telegraph everything) and 9 (Leave something for the next visitor). Layout:
Threefold Reach (`.look/previz/home-redesign/`, section 3). Research: [construction you can watch](../research/construction-you-can-watch.md),
[harvest feel](../research/harvest-feel.md), [big walk level design](../research/big-walk-level-design.md), [maximal rewards](../research/maximal-rewards.md) (Gift Freight), [growing towns](../research/growing-towns.md). The stations are
Death Stranding's auto-pavers; the look of the frame, feeder and cradle follows `.look/previz/visible-materials/`; the little guys take the stubby proportions of Castle Story's Bricktrons, as our own character. Without the
flag nothing loads: `src/features/proto-place.ts` imports `src/proto/place/` only with it, in the room `proto-place`.*

## The place

An island about 440 m across, 1 km east of today's, in the crossing's sea. A Y-shaped gorge, with walls about 16-30 m high
and a river at the bottom, splits it into three lobes: the village (west, 18 m), the timber camp (north ridge, 30 m) and the
quarry (east table, 24 m). Needle Bell, a leaning 105 m spire, stands where the gorge forks. Two low footbridges cross the
river. Past the quarry, across about 170 m of sea, is **Far Head**, a low headland you can't walk to until the line gets there. Across the sea to the north, about a kilometre out and out of reach, stands a dark island with a broken ring on it
and a bright shard in the ring's middle. Two physical things point at it: a line of orange buoys straight out from the end of the pier, and an old brass telescope on the ridge's top, aimed at it; **Look through it** (Interact) flies the view out along the barrel, and any input brings you back.

## The run

All numbers are hypotheses until played, set with `node dev/economy/model.ts round4` and recorded in [round-4.md](../plans/round-4.md). The model's walking-only floor for the first path is 6.4 min; the target is 6-9 min of real play.

1. **Goal up front, lightly, and shown** (DESIGN.md 11). An orange beacon, a floating crystal on a beam, stands over the next thing, and a chevron at the screen's edge turns you back. A small line of words comes up only for what nothing in the world can say (the orange band, the first time; "Walk home across your bridge"; "Stand on a platform"), when it changes, when you've stood still for 16 s or when you press Interact with nothing in reach, and fades after 5.5 s. No line narrates a machine waking, logs going in or a cart coming. In view at spawn: a wide path, a half-built forge with little guys hammering on its poles, a crane, a rail stub, and the **curio shelf**: shapes under dust sheets and a row of dull crystals. The numbers stand small at the top right: **logs, kilometres of track, the town, and a running money count**.
2. **Walk and wake.** The path winds north, down the wall, over a footbridge under where the trestle will go, up and round the ridge: 431 m, about 78 s, with gold finds, crystals and a rock arch (the "moment of discovery": nothing marks it). The machine sits at the camp end of line 1, rusty and dusty, a rusted train behind it. **Wake it up**: about 3 s, and you keep control: shudder, rust shaking off, the boiler coughing faster, the wheels slipping, a burst of steam, the headlamps, a whistle.
3. **By hand, and it gets long.** Your back holds 8. Trees with an orange band take **5 strokes** at **2 logs** a stroke, swing feel unchanged. Felled trees stay felled: the crown bursts into leaves as it lands and a bare trunk stays. The near ones run out and you walk further, so the carries lengthen as the track advances:
   - **Station 1:** 24 logs. The grove's about 20 m off.
   - **Station 2:** 32 logs and 8 **stone**, from rocks with an orange band near it (Interact: **Break**; 4 strokes, 2 stones each; sparks, and a lump comes off with each stroke).
   - **Station 3,** at the rim: 40 logs and **the great beam**. The great tree stands apart, twice the size, and takes 12 strokes; it comes down slowly and shakes the ground. **Shoulder the trunk**: one big thing on your shoulder, no sprinting, and whatever was on your back is left behind. It lands across the frame with a thud.
   Each frame's logs stack up, roll along its feeder into the machine's cradle, and it drives, dropping sleepers and rails; bents go in ahead of it over the gorge. You can ride it or stand on the fresh track. Stations 1 and 2 each hand down a **box** (below).
4. **The first path opens, with no train.** Station 3's stretch is the whole trestle and the run home, and when the machine gets there: whistles wherever you stand, the view shakes, a big "A way across!", rockets down the gorge and over the village, the pull-out (about 4 s; any input ends it), lamps coming on one by one along both edges of the deck from the near rim, the village pouring out, and five little guys running out across it (from then on they walk it, there and back, all day). The new way from the village to the machine is **191 m against 431**. The first time you walk it end to end, a banner gives your time against your own long way round.
5. **The ladder.** Each rung is earned, physical and arrives as you start wanting it:
   - **A proper axe:** an iron-banded chest with a blue shaft over it, at the village end of the path, beside the old oak. You can see which axe you've got while you swing it. Bigger, brighter, rings: **3 strokes, 5 logs a stroke** (2.5x the logs a swing, half again the logs a tree), with more chips and a little kick. Try it on the oak, right there.
   - **The forge, by hand:** its frame stands by its north wall. Logs roll in and its pieces drop, no scaling: 24 logs for the timber frame. Only the oak's on this side, so it's back over your bridge with 8 on your back.
   - **A pack frame:** a chest when the frame's up. Poles and a crossbar over your shoulders, **16 on your back**. Then 32 logs for walls and chimney, and the forge lights, roofless, and pours rails. The machine turns on the turntable for line 2.
   - **Line 2, station 1:** 16 logs and 6 rails: a long walk for logs, a short one for rails. When it's laid, **the depot**: the camp builds its sawmill, and two little guys start shoving a cart of 24 logs down your track, over the turntable, to **a rack by the next frame**. You do the last carry. Rails stay yours to fetch from the forge.
6. **The long second route.** Four more frames, each bigger: 24 logs and 12 rails, over the stem of the gorge; 16 and 12, to the quarry; 16 and 16, across the table; 24 and 24, out over the sea, 260 m of trestle in one go, all the way to Far Head. The rack saves the logs; the rails get further and further from the forge, about 100 s there and back by the last, and that's the point. Machine speeds rise, 5 m/s on line 1 to 9 m/s on the sea. Far Head gets rockets at both ends, a big "Far Head!" and lamps along the trestle.
7. **Trains come last.** The forge has cast a boiler. It's 546 m home, about 98 s, and the walk is meant to be felt. **Shoulder the boiler**, carry it over your bridge to the old train at the camp, **Fit the boiler**: it wakes as the machine did, with steam, wheels and whistle, and no words. Then the biggest show since the first path: **TRAINS**, and the stations drop into place all along both lines. Line 1's train runs camp to village, line 2's village to quarry to Far Head, at 20 m/s. With someone aboard a train runs straight through to the end of the line.
8. **Stations and calling a train.** There are no platforms until there are trains, so what they're for is obvious: a platform with a bright edge, a roof, a bench, a signal and a board, one at each stop. **Stand on one and a train comes straight there:** the signal drops, it clanks, and the board says how long. No timetable to learn and nothing to operate. Otherwise trains shuttle with their cargo.
9. **Cargo.** Timber crates land on the dock and the crane lifts each onto the forge: 8 of them put its **roof** on, the poles come down, and it pours rails twice as fast (hands started it, trains finish it). After that timber goes to the village's heap and the town answers at 6 and 16 crates, buildings rising on scaffolding. Stone from the quarry builds the stone street the same way. A crate sails to the first plot of each step-up.
10. **The pier.** The first train out of the village carries the whole kit, 8 crates, to the rack at Far Head: 32 rails and 32 logs, a short carry to the last frame. The machine lays the pier north over the sea towards the shard. Rockets, and a pull-out down the buoys to the island, with "Thanks for playing!". The beacon goes to the shard and nothing stops: the trains keep running.

Along the way, seven **crystals** are tucked at spots worth stopping at, the same blue as the far island's shard: a lookout, an arch, a river bank, the top of the ridge, behind the old kiln, by the old cart, the far table. Walk near one and it comes to you, slowly then all at once, with a chime, and a stub on the shelf's bottom row lights up. They do nothing yet.

**Boxes** (DESIGN.md 11's world, not a menu; numbers from [cosmetic rarity](../research/cosmetic-rarity.md), hypotheses): cosmetic only, seven in the run, handed down by the machine: Common, Common, Rare, Common, Rare, Common, Wonder. You can tell a box before you open it: one, two or three marks on its face, the seal's shape (round, diamond, spike) and its colour. Odds across Common, Rare and Wonder items: Common box 60/30/10, Rare 0/70/30, Wonder 0/0/100. The first is the conductor's hat and the second the scarf; a Wonder by the third; an outfit by the fourth if you've none; never more than five in a row without a Wonder, counted in the save, which is written before the show. No repeats. Reveals are about 0.8, 1.3 and 2.0 s by tier and you keep control. **Slots:** hat (conductor's hat, beanie, teacup), accessory (scarf, round glasses, headphones), outfit (work overalls, raincoat, festival overalls), and the stowaway has its own. An empty slot puts the new thing on; a slot with something in it keeps it. **The curio shelf is your wardrobe:** what you've got stands on it, what you haven't is under dust sheets (two shapes never come out this run), and Interact there swaps a slot, through nothing too. Train ornaments wait for the roundhouse. In co-op your partner sees your equipped hat, accessory and outfit; gifts remain personal (DESIGN.md 6).

**Money** is a comic score: $15 a log, $25 a stone, $40 a rail, $1,500 for the beam, $500 a stretch. It means nothing yet. `earn`, `spend`, `money` and `onMoney` are in `score.ts`, for The Boogler's prices.

**The little guys** are mostly life, not labour; the depot's two are the one exception, a real but small job (the owner's "hungry" ladder). Round and stubby, in six colours, carrying logs, hammering at scaffolds, riding the machine and the trains' cab roofs, strolling, waving and following you for a few seconds (at most two at a time), and hopping at milestones. They stand on the ground at the frames. The village's number is how many you can see, up to 28, with someone new coming out of a cottage door each time it rises; three more at each camp, two helpers, four riders, five walking the first path, two at the cart. They walk round buildings and have no colliders. Their walk is a waddle driven by how fast they really go: a rock from foot to foot, a bob over each step, feet that lift, hands swinging against them.

Their hammering is a small tap, heard only within 16 m and at most five a second, so distant work stays quiet.

Now and then two of them near you stop and **chatter**: two to four short lines of babble, turn about, facing each other, with whoever's speaking bobbing and talking with a hand. It's the same babble as The Boogler's (`src/render/npc-voice.ts`), small and high, about 15 dB under him and with a pitch of its own for each, and it ducks nothing. One exchange at a time, none in the first 10 s, 20-38 s of quiet after each, only struck up within 11 m of you, silent past 13 m and hushed while a crate opens or a cheer goes up. Numbers: `CHATTER` (`chatter.ts`), `TALK` and `WALK` (`folk.ts`).

**The town and camps are solid**: every building has a collider, its walls from when its frame is up. Standing in a plot when they go up moves you to the nearest edge.

**Everything that looks solid is solid** (round 4 audit): trees and stumps, a felled tree's bare trunk (its crown bursts into leaves as it lands, so a cut grove shows what you've done), crate stacks as far as they're stacked, frames as high as their stack can get, feeders, rail bearers, survey stakes, bridge rails, and scaffold poles and walkways while they stand. Little guys and pickups aren't solid; gift crates open when you walk into them.

**The day moves.** One day is 28 minutes of play (`DAY`, `look.ts`): mostly the accepted look's daylight with the sun swinging across, then a short golden hour, a brief moonlit night and a dawn. `&day=off` holds the morning.

**The stowaway rides.** It stays small, and on a moving deck it hops up onto your shoulder, rather than chasing the train along the ground.

**You can sit.** On a train's or the machine's deck, with nothing nearer to press for, Interact reads **Sit**: you sit down on the deck in the avatars' seated pose, a little inboard if you were at the edge, and stay there through curves and stops. The stick does nothing and the camera works as ever, so you can look around. Interact (**Stand up**) or Jump gets you up.

**The decks hold you.** Stop at the edge of a train's or the machine's deck and you're eased a few centimetres back inside, so standing never takes you off, moving or not. Push the stick off the side or jump and you leave as ever; there are no railings.

**The way back.** The beacon's beam and crystal grow with distance, so they read across the place. Turn away from where to go and a small orange chevron at the screen's edge turns you back; while the machine sleeps it leads along the path rather than straight at it over the gorge.

Falling is harmless: in the water, or down on a shore or a river bank more than 20 m from any path or laid track, Interact reads **Back up the path**. **The panel** has Start over, Skip the walk, Skip chop and carry (fills the current frame), and Skip to the first path, to line 2, to Far Head and to trains.

**The tester's link** adds `&fresh=1`: no prototype bar (so no gut question or verdict buttons, and its D-pad and P do nothing), no panel, and no Honk or Ping touch buttons. The counters and the numbers still run. On touch, the main button dims while nothing's in reach, and the objective sits above the buttons. On every `?proto=place` page the first-run card lists only what this place uses, and the objective and numbers wait until you're in.

**Two players, one railway** (`&coop=1`, its own room `proto-place-coop`; throwaway): waking the machine, trees and rocks felled, every deposit, the machine's run, laid track, the bills, the rungs (one chest, for you both; a newcomer inherits them), the money, the cart and rack, the forge, the boiler, trains and the town are shared, and the costs stay the same. Your back, chopping response, crates and gifts (each of you gets your own crate), crystals and gold finds are yours; you see your partner's logs on their back and them on your copy of a moving deck. Calling a train calls it for you both. The oldest visible tab decides what a deposit gets and when a run starts, so the last log can't start two, and what doesn't fit stays on your back; if it leaves, the next tab takes over. How: `src/proto/place/coop.ts`, reliable room messages and a whole-state message once a second, built from the slices in `job.ts`. Serves DESIGN.md 4 (Cooperation is automatic).

## Departures from the brief

The machine doesn't come back by train: line 1 ends at the village, so it's already there, and a turntable hands it to line 2.
Far Head and the extended grid aren't in `npm run level-check`, which doesn't know this land: `node dev/economy/place-level.ts` floods it from spawn at the player's slope limit and lists what's reachable in each state of the job.
Its cradle isn't solid, unlike the rest of it: a second shape on the flatbed's body made you fall through the deck (see below).
Buildings are solid blocks you can't go inside; plots leave room for interiors.

## Measured

`npm run playthrough`: a bot at a person's stroke rate that already knows the way, walking, never sprinting. So a floor for a first-timer, not an estimate; nothing here is a person's time yet. Seconds from its start; `node dev/economy/model.ts round4` said 6.4, 10.7 and 22.1 min for the first three milestones before it was run.

| Beat | Time | The work before it |
|---|---|---|
| At the machine | 81 | the long way, 431 m |
| Station 1 laid | 115 | 20 s chop and carry |
| Station 2 laid | 201 | 75 s |
| Felled the great tree | 326 | |
| **First path open** | 357 (5:57) | station 3: 136 s |
| Proper axe | 384 | a walk across the new path |
| Pack frame | 528 | forge frame, 24 logs: 141 s |
| Forge lit | 689 (11:29) | walls and chimney, 32 logs: 159 s |
| Depot (line 2, station 1 laid) | 859 | 158 s |
| Stations 2, 3, 4 laid | 919, 977, 1110 | 44, 45, 117 s |
| **Far Head open** | 1380 (23:00) | station 5: 238 s |
| Walked home | 1533 | |
| **Trains** | 1597 (26:37) | boiler to the camp |
| The pier out, the end | 1772 (29:32) | 27 s to carry its kit |

**Each rung, before and after** (from `layout.ts` and the model's sums; bills held fixed): the axe doesn't cut much time (a 24-log job 65 m out, 80 s to 77 s, 3%) and isn't meant to: **12 presses to 5**, 8 logs in 2 swings where it took 4, 1.6 trees to 2.4. The pack: the forge's 32-log bill 170 m out, **4 trips to 2, 253 s to 129 s (49%)**, with line 2's first bill (22 pieces) also down to 2. The cart: station 3's logs, 350 m to the trees against 16 m to the rack, **223 s to 104 s for the job's walking (53%)**.

**The train, door to door, Far Head to the village:** on foot 546 m, 98 s walking, 57 s sprinting. By train, measured with a called train at the far end (the worst wait): 31 s wait, 2 s to board, 3 s of dwell, 31 s ride: **68 s**. Already there: about 36 s. So it beats walking by 31 to 63%, and beats non-stop sprinting only when it's already near; the fair reason for it is cargo, and the sit. A missed train costs a return trip of about 70 s, less if you call it back at once. Camp to village: 18.6 s riding against 34 s walking.

Cost: not measured on an iPad this round. M1 Max held 60 fps in every capture (not a benchmark).

## Sound

Quiet ambience under everything (`src/proto/place/ambience.ts`, on the ambience bus, so it starts with the first press, ducks under voices and follows the volume): slow swells of low-passed brown noise, one on each side on its own clock; far gulls every half a minute to two minutes (a lone mew, a pair, a long call, sometimes an answer), panned around; a faint wandering breeze that gives way to the sea at the shore. The sea is loudest within about 18 m of the shore, a little under that on the river bank, and fades by 150 m to 11 dB down, with height counting as distance; it leans towards the water's side as you turn. Numbers: `LEVELS` and `FEEL`. `&ambience=off` turns it off and `&ambience=-6` moves it in dB. Hear it away from the game: `node dev/audio/render.ts --only place`.

## How it's built

Local, all of it, in localStorage per room (`boogle-place-v4`, a new key so an old save can't break it). What's kept is in one place: `job.ts` holds `job` (the shared state, including `rung`, `score` and `ways`) and a list of **slices**: `sharedSlice(key, { get, set })` for what a `&coop=1` room has in common (saved and in the snapshot), `personalSlice` for what's this tab's own (saved only). `index.ts` is thin; its comment maps the modules. Your back's log count is kept in `chop.ts` and drawn by the
game's bundle through `backSeam` (`src/features/haul-stack.ts`), with rails, a sack of stone, a pack frame and a big thing on your shoulder on the avatar. Pieces in the air are one instanced pool (`pieces.ts`, `send`); pieces joining a build fall from above
(`dropSet`), never scaled. Every building but the forge shares one instanced mesh (`sites.ts`): its plan is the forge's, in a function, so a whole town is one draw and one shadow draw.

Each line's track is one instanced set sorted by where the machine drops each piece; 2 m slab colliders join as it passes. The
machine is the kit's look on two kinematic platforms; it advances in the physics step. Trains are the same kind of car on a small state machine (`rail.ts`: target stop, signed speed, dwell), not a clock, so a call can send one straight somewhere; `&coop=1` nudges it to the authority's. A flatbed with a compound shape lost its deck collider in testing, so the flatbed stays a single box.

The land is one height function on a 2 m grid (`terrain.ts`, no three.js; 760 x 540 m with Far Head), drawn as one faceted mesh and collided as one heightfield. From the crossing: the
sea, sky and far plane (`src/proto/crossing/sea.ts`, `sky.ts`), the speed put back past the 237 m soft wall, the player's CCD
off. Numbers: `TUNE`, the bills (`LINKS`, `FORGE_BILLS`) and the plots (`TOWN`) in `src/proto/place/layout.ts`. The run: `run.ts`. Rungs: `ladder.ts`. Cart and rack: `depot.ts`. Trains and cargo: `cargo.ts`; stations: `halts.ts`. Moments and the pull-out: `celebrate.ts`, through the existing `camConstraints` seam. Gifts, shelf and mounts: `gifts.ts`. Little guys: `folk.ts`. Crystals: `crystals.ts`. Look evals: `dev/look/evals/place-job.ts` and `place-act.ts`.

The look (`src/proto/place/look.ts`) is the default. It overrides `tod`. `&look=off` gives the old look; `&look=ground,light,contact,kit,mats,gtao` gives single layers (`all`, the default, leaves `gtao` out). To-dos: [look-pass.md](../plans/look-pass.md).
