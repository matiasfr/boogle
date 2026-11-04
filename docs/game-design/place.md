# 6.28 Prototype: a real place (`?proto=place`)

_A throwaway greybox, round 4 ([plan](../plans/round-4.md)): "Did you get hungry for a better way, and did finding one feel great?" The owner and Grant after round 3: "the only thing asked of me was to just chop 1 or 2 trees, so I wasn't feeling hungry for more efficiency yet"; "seeing a path between two areas open up which was previously tedious was satisfying"; the trains were "too much too soon". So: a good slog by hand, a path you can walk, a ladder of relief, and trains last. Chop, carry, stacking and laying keep their feel from round 2 ("it felt like my work became the track"), and the crates and little guys from round 3 stay. The decision log's rules bind it: nothing consumed and vanishing, construction that drops into place, what looks solid is solid, a small prompt is direction enough, first gifts are cosmetic.
Serves DESIGN.md 1 (Toys before chores), 7 (Telegraph everything) and 9 (Leave something for the next visitor). Layout:
Threefold Reach (`.look/previz/home-redesign/`, section 3). Research: [construction you can watch](../research/construction-you-can-watch.md),
[harvest feel](../research/harvest-feel.md), [big walk level design](../research/big-walk-level-design.md), [maximal rewards](../research/maximal-rewards.md) (Gift Freight), [growing towns](../research/growing-towns.md). The stations are
Death Stranding's auto-pavers; the look of the frame, feeder and cradle follows `.look/previz/visible-materials/`; the little guys take the stubby proportions of Castle Story's Bricktrons, as our own character._

**Entry (4 November):** the bare `https://boogle.club/` opens round 4 with the clean tester view and co-op enabled in the shared room `boogle`. Its pause title is **boogle**, and its invite is the bare URL. Alone, you still do the whole job; co-op snapshots are skipped until a partner is present. `?classic=1` opens the old island in `beach`, retaining its existing saved world; headless tools also default to `beach`. Explicit `?proto=` and `?play` links keep their behaviour, `?room=` always wins, and explicit `fresh` or `coop` values override the defaults. The protos page stays available. Explicit `?proto=place&coop=1` still uses `proto-place-coop`, and `?proto=place` alone still uses `proto-place` without the clean-view/co-op defaults. Old `?room=proto-place-coop` invites still open that room. `src/features/proto-place.ts` still imports `src/proto/place/`; retiring it and reviewing the architecture come later.

**Existing progress:** on the first co-op restore in `boogle`, an existing `boogle-place-coop-v2:proto-place-coop` save is copied to `boogle-place-coop-v2:boogle` only if that new key is absent. The old key stays, and an existing new-room save always wins. A fresh co-op room can take the joining player's saved railway through the existing snapshot exchange. Identity is already global; visit memories stay in their original rooms, while Place's own saved pose travels with its progress. An installed app recalling the old room-only default returns to the new bare entry; explicit prototype, classic and variant bookmarks retain their destinations. Playdata and reports record/group the actual room, including `boogle`.

**First run and restart:** a new player gets the existing name/colour card on the sky trolley, falls through the timber BOOGLE lettering and lands at this round's village spawn, then follows the same opening walk. The opening is shared with classic, with this place supplying its spawn, facing and ground height. Returning players skip it and resume their safe saved position. Automated tools keep skipping it unless `intro=1` requests a first-run capture; `intro=0` explicitly skips it. `fresh=1` remains the clean view, including on explicit `?proto=place` links. The main pause menu's confirmed **Start fresh** clears this device's solo and co-op saves, every personal slice and character identity before replaying the opening. Solo restarts the railway in this room. Co-op reloads the same room as a newcomer and receives an existing partner's railway through the normal snapshot; with no partner, the railway starts fresh too. No shared reset is sent, and the warning explains both cases. The hidden tester panel's solo **Start over** resets Place directly; **Start over (both)** keeps its existing separately confirmed shared reset message. Neither needs a tuning op, so both work in `boogle`; public rooms still reject tuning and `open.lay` ops. Rules, wire shapes and the world namespace are unchanged.

Playtest reports label the default visit as `place` and include its effective flags. Update notices keep reloading the current address, preserving either entry and any explicit flags.

## The place

An island about 440 m across, 1 km east of today's, in the crossing's sea. A Y-shaped gorge, with walls about 16-30 m high
and a river at the bottom, splits it into three lobes: the village (west, 18 m), the timber camp (north ridge, 30 m) and the
quarry (east table, 24 m). Needle Bell, a leaning 105 m spire, stands where the gorge forks. Two low footbridges cross the
river. Past the quarry, across about 170 m of sea, is **Far Head**, a low headland you can't walk to until the line gets there. Across the sea to the north, about a kilometre out and out of reach, stands a dark island with a broken ring on it
and a bright shard in the ring's middle. Two physical things point at it: a line of orange buoys straight out from the end of the pier, and an old brass telescope on the ridge's top, aimed at it; **Look through it** (Interact) flies the view out along the barrel, and any input brings you back.

## The run

The sleeping machine and old trains use solid, dull oxidized paint and iron, with no spatial rust pattern. Their existing wake uniforms restore paint roughness and the wheels' steel response. Timber decks and sleepers retain their grain while the engine sleeps. This is Local material presentation (DESIGN.md 11, Show, don't tell); wake timing and shared progression are unchanged.

**Trees, 3 November (owner's approved comparison):** 391 trees now share one harvest catalog:
388 ordinary conifers, two optional hardwoods and the great tree. The original 29 IDs stay fixed;
the 362 former scenery positions append as IDs 29–390. Hardwood IDs **209** and **232** stand
at world **(898.824, −46.766)** and **(921.228, −45.184)**, north of the forge on the return route.
They have broad crowns, forked thick trunks, ridged grey-brown bark and a small fallen branch
with a pale end. Starter contact rebounds without output or a deepening notch. The proper axe
fells either in three productive swings for **15 ordinary construction logs**: a remembered
source close to later work, not a new material or a required gate. The great tree still takes
twelve starter strokes and yields its beam. Rock bands stay, identifying breakable rocks.

Ordinary work uses integer fifteenths: starter adds 3, proper adds 5. The starter extraction
ceiling is 10; a proper-axe hit on an unfinished tree raises it to 15 minus already issued logs.
A clipped bag payout leaves its remainder on the standing tree; it fells only when work and
output are complete. Thus the eight-slot proper-axe example yields **5 + 3**, then after unloading
**5 + 2**, rather than losing two logs. A full bag advances nothing. There is no regrowth,
bill increase, carry reduction or new ordinary-tree tier. This follows [tree-tiers](../research/tree-tiers.md).

The internal `objective.ts` label is now **“Chop an ordinary tree.”**, replacing the false
**“Chop a tree with an orange band.”** with the owner's authorization on 4 November.
This telemetry-only correction is complete; no copy is held for a later change. No conflicting
resident or Boogler tree-band line was found; their player-facing copy is unchanged.

**Beautiful-corner rough kit comparison (3 November):** `&corner=1` adds two existing timber runners beneath Station 3's feeder, giving the receiver-to-machine link a stronger silhouette. They reuse the kit's bottom pivots and fit inside the existing feeder collider, below the exposed rollers. This is Local presentation only; the default round, route, costs, material travel, saves and co-op are unchanged. The [approved plan](../plans/beautiful-corner.md) records the baseline/contact audit and stops after steps 1–2; final banks/materials wait for the real sea, demo-sky/AgX bake and terrain decision.

All numbers are hypotheses until played, set with `node dev/economy/model.ts round4` and recorded in [round-4.md](../plans/round-4.md). The model's walking-only floor for the first path is 6.4 min; the target is 6-9 min of real play.

1. **The world gives direction** (DESIGN.md 11; owner's decision after round 4, 3 November). There is no objective text box, orange objective beacon or screen-edge arrow, including after idling or pressing Interact with nothing nearby. The internal objective calculation and `objective` playdata events remain for progression reporting and checkpoints; those strings are not displayed. In view at spawn: a wide path, a half-built forge with little guys hammering on its poles, a crane, a rail stub, and the **curio shelf**: shapes under dust sheets and a row of dull crystals. The numbers stand small at the top right: **logs, kilometres of track, the town, and a running money count**.
2. **Walk and wake.** The path winds north, down the wall, over a footbridge under where the trestle will go, up and round the ridge: 431 m, about 78 s, with gold finds, crystals and a rock arch (the "moment of discovery": nothing marks it). The machine sits at the camp end of line 1, rusty and dusty, a rusted train behind it. **Wake it up**: about 3 s, and you keep control: shudder, rust shaking off, the boiler coughing faster, the wheels slipping, a burst of steam, the headlamps, a whistle.
3. **By hand, and it gets long.** Your back holds 8. All **388 ordinary conifers**, including former decorative land trees, work with the equipped starter axe: **5 productive strokes**, **2 logs** per full stroke, **10 logs** total. Trees have no orange bands. **Click / RT** chops directly; **E / X / Square** also chops with empty hands when there is no ordinary interaction in reach. An ordinary interaction, even a blocked one, takes priority over a tree. Touch uses that same priority and its label and the floating Interact glyph describe what will run. Trees stay finite and felled trees stay felled. Partial work and unclaimed output persist; a full bag spends neither. Nearby sources now participate, so the lengthening carries are a playtest question, not a guaranteed pacing claim:
   - **Station 1:** 24 logs. The grove's about 20 m off.
   - **Station 2:** 32 logs and 8 **stone**, from rocks with an orange band near it (click: **Break**, once you have the multi-axe; 4 strokes, 2 stones each; sparks, and a lump comes off with each stroke).
   - **Station 3,** at the rim: 40 logs and **the great beam**. The great tree stands apart, twice the size, at local `(-4, -138)`, about 53 m from the receiver, and takes 12 strokes; it comes down slowly and shakes the ground. **Shoulder the trunk**: one big thing on your shoulder, **2.2 m/s solo**, no sprinting, and whatever was on your back is left behind. In co-op, an empty-handed partner uses **Help carry** near its free end: the same beam spans both shoulders and its owner walks at **5 m/s** while the helper stays within 5 m and 2 m vertically. **Let go**, moving apart, or either player leaving releases the helper. The helper moves independently; there are no chained physics bodies and the beam never changes owner. Helper departure leaves a solo carry; carrier departure returns the unconsumed trunk to its source through the existing recovery rule. It lands across the unchanged frame with a thud. This source move changes beautiful-corner's old 29 m approach composition, not its receiver, feeder, machine, crossing or landing fit. The separate village seesaw remains unchanged.
     **The multi-axe** comes when the machine first wakes, as its show ends, since nothing can be chopped before then: "You got the multi-axe!", with a pick on the back of the axe's head. Rocks offer **Break** only once you have it. It's a rung (`job.rung.multi`), shared in co-op like the others.
     **Drop:** right click (pad R3, the touch **Drop** button while something's on your back) puts one piece on the ground in front of you, rails first, then stone, then logs. Dropped pieces stay in a pile where they land, saved with your back; Interact there (**Pick up**) takes back what fits. Your own, not shared in co-op.
     **Ping:** G, middle click and D-pad left retain their own action. Its touch button sits beside Drop, including fresh play, and stays available with an empty back.
     Each frame's logs stack up, roll along its feeder into the machine's cradle, and it drives, dropping sleepers and rails; bents go in ahead of it over the gorge. You can ride it or stand on the fresh track. Stations 1 and 2 each hand down a **box** (below).
4. **The first path opens, with no train.** Station 3's stretch is the whole trestle and the run home, and when the machine gets there: whistles wherever you stand, the view shakes, a big "A way across!", rockets down the gorge and over the village, the pull-out (about 4 s; E, pad X, a mouse click or a tap outside touch controls ends it after 0.6 s; movement, jumping and looking do not), lamps coming on one by one along both edges of the deck from the near rim, the village pouring out, and five little guys running out across it (from then on they walk it, there and back, all day). The new way from the village to the machine is **191 m against 431**. The first time you walk it end to end, a banner gives your time against your own long way round.
5. **The ladder.** Each rung is earned, physical and arrives as you start wanting it:
   - **A proper axe:** an iron-banded chest with a low blue glimmer over its lid, at the village end of the path, beside the old oak. You can see which axe you've got while you swing it. Bigger, brighter, rings: **3 strokes, 5 logs a stroke** (2.5x the logs a swing, half again the logs a tree), with more chips and a little kick. Try it on the oak, right there.
   - **The forge, by hand:** its frame stands by its north wall. Logs roll in and its pieces drop, no scaling: 24 logs for the timber frame. The oak and former decorative trees on this side can supply it; which nearby trees remain changes the next carry.
   - **A pack frame:** a chest when the frame's up. A low canvas pack with a rolled top and two straps, below the shoulders so it stays clear of the follow view, **16 on your back**. Then 32 logs for walls and chimney, and the forge lights, roofless, and pours rails. The machine turns on the turntable for line 2.
   - **Line 2, station 1:** 16 logs and 6 rails: finite nearby trees for logs, the forge for rails. When it's laid, **the depot**: the camp builds its sawmill, and two little guys start shoving a cart of 24 logs down your track, over the turntable, to **a rack by the next frame**. You do the last carry. Rails stay yours to fetch from the forge through station 3, unless a partner loads the cart.
6. **The long second route.** Four more frames, each bigger: 24 logs and 12 rails, over the stem of the gorge; 16 and 12, to the quarry; 16 and 16, across the table; 24 and 24, out over the sea, 260 m of trestle in one go, all the way to Far Head. **From station 4, the little guys bring rails too:** the same cart stops at the forge, loads real forge stock onto its logs, and heaves both onto the frontier rack. Rails land on their own low timber shelf beside the log cradle, visible even after the logs are taken. You still take the pieces and carry them into the frame. The cart holds 16 rails: station 4 fits one mixed shipment; station 5 gets a second rail shipment unless a partner brings the balance. An empty forge makes the cart wait for production. Bills, automatic-cart speed (9 m/s) and forge output are unchanged; a manually loaded cart with a rider now earns the co-op bonus below. Machine speeds rise, 5 m/s on line 1 to 9 m/s on the sea. Far Head gets rockets at both ends, a big "Far Head!" and lamps along the trestle.
7. **Trains come last.** The forge has cast a boiler. It waits on the open apron beside the rail rack and return track, at local (-81, 5.4), rather than behind the forge. The mesh and pickup share that position. It's 546 m home, about 98 s, and the walk is meant to be felt. **Shoulder the boiler**, carry it over your bridge to the old train at the camp, **Fit the boiler**: it wakes as the machine did, with steam, wheels and whistle, and no words. Then the biggest show since the first path: **TRAINS**, and the stations drop into place all along both lines. Line 1's train runs camp to village, line 2's village to quarry to Far Head, at 20 m/s. With someone aboard a train runs straight through to the end of the line.
8. **Stations and calling a train.** There are no platforms until there are trains, so what they're for is obvious: a platform with a bright edge, a roof, a bench, a signal and a board, one at each stop. **Stand on one and a train comes straight there:** the signal drops, it clanks, and the board says how long. No timetable to learn and nothing to operate. Otherwise trains shuttle with their cargo.
9. **Cargo.** Timber crates land on the dock and the crane lifts each onto the forge: 8 of them put its **roof** on, the poles come down, and it pours rails twice as fast (hands started it, trains finish it). After that timber goes to the village's heap and the town answers at 6 and 16 crates, buildings rising on scaffolding. Stone from the quarry builds the stone street the same way. A crate sails to the first plot of each step-up.
10. **The pier.** The first train out of the village carries the whole kit, 8 crates, to the rack at Far Head: 32 rails and 32 logs, a short carry to the last frame. The machine lays the pier north over the sea towards the shard. Rockets, and a pull-out down the buoys to the island, with "Thanks for playing!". The pier and buoys point toward the shard and nothing stops: the trains keep running.

Train cargo survives saves and corrective co-op snapshots, including boarding and unloading: a crate stays reserved until its destination receives it. Restoring settles outstanding cargo back onto its train, then the ordinary stop delivers it once. This includes timber on the sleeping train, stone, and the dock crane's reserved timber (returned to the dock when its flight is cancelled). `trainCargoV1` and `craneCargoV1` are additive shared save slices inside the existing prototype authority/localStorage model; animation remains Local. Inventory corrections restore cargo, train motion and destination stock together. Old saves without cargo records recover only the missing pier-kit logs and rails, subtracting surviving rack stock, Q6 stock and this save's personal bag; a completed pier is never refilled. Old lost timber/stone cannot be reconstructed from their unrecorded loads, but future shipments persist. No bill, timing or copy changes (DESIGN.md 8, Designed for drop-in, drop-out; 9, Leave something for the next visitor).

Along the way, seven **crystals** are tucked at spots worth stopping at, the same blue as the far island's shard: a lookout, an arch, a river bank, the top of the ridge, behind the old kiln, by the old cart, the far table. Walk near one and it comes to you, slowly then all at once, with a chime, and a stub on the shelf's bottom row lights up. They do nothing yet.

**Boxes** (DESIGN.md 11's world, not a menu; numbers from [cosmetic rarity](../research/cosmetic-rarity.md), hypotheses): cosmetic only, seven in the run, handed down by the machine: Common, Common, Rare, Common, Rare, Common, Wonder. You can tell a box before you open it: one, two or three marks on its face, the seal's shape (round, diamond, spike) and its colour. Odds across Common, Rare and Wonder items: Common box 60/30/10, Rare 0/70/30, Wonder 0/0/100. The first is the conductor's hat and the second the scarf; a Wonder by the third; an outfit by the fourth if you've none; never more than five in a row without a Wonder, counted in the save, which is written before the show. No repeats. The lid rattles for 0.12, 0.18 or 0.3 s by tier, then the reward starts with a **0.45 s anticipation beat**: a gathering glow while the camera approaches to frame you and the item. The item rises for **0.45 s**, then its existing **"You got \___"** name, line and fanfare arrive. You face the camera and hold it up with both hands, turning and glowing in a fan of light. You stand still until you put it away (E, Enter, pad X, a click or a tap outside touch controls, after the reveal has been readable for 0.6 s, 1.5 s total; an already-held press, movement, jump mashing and looking do not dismiss it; Escape opens the menu over it instead, and the card is still there when the menu closes); then it goes on the shelf, and on you if its slot's empty. The camera eases back when dismissed. Reduced motion preserves anticipation and deliberate dismissal but disables camera travel, item spin/bob/scale travel, decorative reward particles and card/hint animations. The same show comes for every new thing that isn't a counted find: chests (the proper axe, the pack frame), the multi-axe, the three devices (their demo plays after you put it away), secrets and shop items. Logs, stone, rails, money, crystals and gold finds don't get one. **Slots:** hat (conductor's hat, beanie, teacup), accessory (scarf, round glasses, headphones), outfit (work overalls, raincoat, festival overalls), and the stowaway has its own. An empty slot puts the new thing on; a slot with something in it keeps it. **The curio shelf is your wardrobe:** what you've got stands on it, what you haven't is under dust sheets (two shapes never come out this run), and Interact there swaps a slot, through nothing too. Train ornaments wait for the roundhouse. In co-op your partner sees your equipped hat, accessory and outfit; gifts remain personal (DESIGN.md 6).

**Shared unlock arrival** (DESIGN.md 4 and 11): when a partner earns the multi-axe, proper axe, pack or movement device, your own copy appears above you through the same reward queue, with its existing name and model. Partner devices do not replay the local tutorial. A newly accepted snapshot transition also presents it, so a snapshot arriving before the event cannot make it silent. Local presentation keys prevent duplicate shows within the run, including a regressed snapshot followed by recovery; reset clears those keys. Initial join/reload snapshots silently remember existing unlocks. No new prose, messages or saved fields; earning remains shared state and the show is Local.

Waiting crates and tool chests have a soft 1.8 m glimmer just above the lid, replacing the 34 m columns. Their physical seals, bob, sparkles and landing flare remain; the brief opening burst is unchanged. Secret crates still have no glimmer. This is Local presentation only.

Shop clothes use the same remote validation as box gifts, so a partner also sees the paper hat and other shop stock.

**Money** is a comic score: $15 a log, $25 a stone, $40 a rail, $1,500 for the beam, $500 a stretch. It buys nothing: the shop's tags chase it (below). `earn`, `spend`, `money` and `onMoney` are in `score.ts`, for The Boogler's prices.

**The little guys** are mostly life, not labour; the depot's two are the one exception, a real but small job (the owner's "hungry" ladder). Round and stubby, in six colours, carrying logs, hammering at scaffolds, riding the machine and the trains' cab roofs, strolling, waving and following you for a few seconds (at most two at a time), and hopping at milestones. They stand on the ground at the frames. The village's number is how many you can see, up to 28, with someone new coming out of a cottage door each time it rises; three more at each camp, two helpers, four riders, five walking the first path, two at the cart. They walk round buildings and plots not yet built, by the nearer corner, give up on a goal that takes far too long, and have no colliders. Their walk is a waddle driven by how fast they really go: a rock from foot to foot, a bob over each step, feet that lift, hands swinging against them.

Their boots stay planted during each stance while the other foot returns, separately from the torso's smaller rock and bob; soles follow the ground or their existing deck. Idle weight shifts and bounded glances at a nearby player are Local poses. A wave raises its hand first; milestone cheers stagger a crouch, a small hop and a soft landing with a grounded pause between hops. Workers give one brief cheer when their building finishes. These poses follow existing routes and construction facts; they change no deliveries, costs or round timing (DESIGN.md 11, Show, don't tell; little-guys research recommendations 3 and 7).

Their hammering is a small tap, heard only within 16 m and at most five a second, so distant work stays quiet.

Now and then two of them near you stop and **chatter**: two to four short lines of babble, turn about, facing each other, with whoever's speaking bobbing and talking with a hand. It's the same babble as The Boogler's (`src/render/npc-voice.ts`), small and high, about 15 dB under him and with a pitch of its own for each, and it ducks nothing. One exchange at a time, none in the first 10 s, 20-38 s of quiet after each, only struck up within 11 m of you, silent past 13 m and hushed while a crate opens or a cheer goes up. Numbers: `CHATTER` (`chatter.ts`), `TALK` and `WALK` (`folk.ts`).

**The town and camps are solid**: every building has a collider, its walls from when its frame is up. Standing in a plot when they go up moves you to the nearest edge.

**Everything that looks solid is solid** (round 4 audit): trees and stumps, a felled tree's bare trunk (its crown bursts into leaves as it lands, so a cut grove shows what you've done), crate stacks as far as they're stacked, frames, feeders, rail bearers, survey stakes, bridge rails, and scaffold poles and walkways while they stand. An empty material frame has a low 0.56 m base and four 1.52 m posts; its log collider rises with the visible rows and goes away when empty. There is no head-high invisible block across the empty frame at the first path's opening. Little guys and pickups aren't solid; gift crates open when you walk into them.

**The day moves.** One day is 28 minutes of play (`DAY`, `look.ts`): mostly the accepted look's daylight with the sun swinging across, then a short golden hour, a brief moonlit night and a dawn. `&day=off` holds the morning.

**The stowaway rides.** It stays small, and on a moving deck it hops up onto your shoulder, rather than chasing the train along the ground. Partners see the same follower and shoulder pose through Owner cosmetic presence `placePet`; its animation follows their interpolated avatar.

**You can sit.** On a train's or the machine's deck, with nothing nearer to press for, Interact reads **Sit**: you sit down on the deck in the avatars' seated pose, a little inboard if you were at the edge, and stay there through curves and stops. The stick does nothing and the camera works as ever, so you can look around. Interact (**Stand up**) or Jump gets you up.

**The decks hold you.** Stop at the edge of a train's or the machine's deck and you're eased a few centimetres back inside, so standing never takes you off, moving or not. Push the stick off the side or jump and you leave as ever; there are no railings.

When a halt appears, anyone intersecting its new foundation, ramps, bench or posts is moved onto its clear middle lane, at the same place along the platform. Each player's tab checks their own body, including when a partner unlocks trains or a snapshot restores a halt. Players already clear of the new solids stay put.

The track layer's flatbed is already standable: a held normal jump from beside it lands on its deck and stays attached. The round-4 report of being unable to board was not reproduced in the local capture; its collider and jump tuning are unchanged.

First-use carry meshes and the glider's cloth and shadow pipelines warm behind loading; temporary canopy samples are removed before play. The 16-second escape deadline is unchanged. See [first-use measurements](../research/round4-first-use.md) for warm-cache counts and device limits.

**The way back.** The first bridge has its reveal, edge lamps and commuters. Far Head has rockets at both ends and lamps sequencing along the trestle toward home; its reveal does not turn the player's camera. The continuous track is the lasting route home. Rails remain visible at the forge rack and its nearby Interact prompt remains **Take rails**. No replacement arrow, new instruction or marker was added. The Boogler's copy, gift lines, other prompts and banners are unchanged.

### Guidance after removing the objective

**Walking-in composition, 4 November:** Station 3's existing bill sits on the source side of its pile so
the unchanged `great beam 0/1` row stays visible. The 53 m uphill great-tree source, receiver, feeder,
machine and crossing fit are retained; seeing the source still requires turning uphill. The proper-axe
chest sits on the forge side of the oak, and the pack sits beside the receiver's feeder, so their pickup
approaches face the next work. The forge's existing bill sits on the frontage above the work. Its output
rack and mouth retain their original positions: moving the rack changed cart-cycle pacing in the full
comparison, so the rail-pickup sightline remains unresolved. The hook pedestal sits toward the first floating
slab, keeping its ring and onward railway in the approach view. The camp's large shed moves south of the
boarding approach, exposing the locomotive and platform. These are Local placement changes using the
existing objects, materials and colliders, with no new copy, markers, rules, bills, unlocks or timing.
The Q2 depot rack sits 8 m farther back along the track, putting the receiving pile in the same approach
view as the coming cart. Cart stops, route, pushers and arrival sounds stay unchanged; a restored still
cannot show the fresh arrival or explain the wait by itself. [Walking evidence and remaining limits](../plans/world-cues.md).

Stage-by-stage audit of what the objective text or marker used to explain. These are physical cues already in the round unless a change is stated. A cue's existence does not establish that a blind player understands it.

| Stage / former direction                         | What in the world points there now                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Opening: follow the path to the sleeping machine | Wide path, existing Timber Camp sign, footbridge, camp smoke and rusty machine at the path's end.                                                                                                                                                                                                                                                                           |
| Wake the machine; start chopping                 | Machine and its nearby interaction, physical multi-axe reward, consistently choppable ordinary conifers. Tree bands are removed; rock bands remain.                                                                                                                                                                                                                         |
| Station 1: carry logs to the receiver            | Nearby grove, visible back load, frame's material board and feeder leading into the machine.                                                                                                                                                                                                                                                                                |
| Station 2: find logs and stone                   | Next receiver, material board, banded rocks and pieces breaking off under the multi-axe.                                                                                                                                                                                                                                                                                    |
| Station 3: fell and shoulder the great beam      | Oversized tree standing apart, receiver's existing great-beam bill, then the fallen trunk and shoulder interaction. Recognition without the former sentence needs playtesting.                                                                                                                                                                                              |
| Feeding, laying and moving                       | Logs roll through the feeder; machine moves and builds track. No extra cue.                                                                                                                                                                                                                                                                                                 |
| First path: walk home                            | Reveal toward the village, rockets, continuous bridge, edge lamps and commuters.                                                                                                                                                                                                                                                                                            |
| Proper axe and pack frame                        | Physical reward chests with low blue glimmers over their lids.                                                                                                                                                                                                                                                                                                              |
| Double-jump device                               | Pillar beside the new path, device and its existing demonstration.                                                                                                                                                                                                                                                                                                          |
| Forge frame and chimney                          | Scaffolding, receiver/feeder and pieces assembling as the player supplies logs.                                                                                                                                                                                                                                                                                             |
| Turn onto line 2; get rails                      | Turning machine and forge pouring rails onto the familiar rack.                                                                                                                                                                                                                                                                                                             |
| Line 2 station 1                                 | Receiver and material board, rail stub and survey stakes.                                                                                                                                                                                                                                                                                                                   |
| Line 2 stations 2–3                              | Log cart travels to the frontier rack; next receiver and laid track show the destination. Players still fetch rails from the forge unless a partner loads the cart.                                                                                                                                                                                                         |
| Hook and quarry gate                             | Device by the route, rings, slab and lever mechanism.                                                                                                                                                                                                                                                                                                                       |
| Line 2 stations 4–5; glider and sea gate         | From station 4, the little guys' cart brings forge rails with its logs and visibly unloads them onto the separate rail shelf beside the frame. The player does the final carry; the cart waits when forge stock runs dry. Next receivers, tower's rings and summit device, sea gate and visible Far Head remain the route cues.                                             |
| Far Head: head home                              | Rockets at the home end, continuous laid trestle and lamps running homeward. The route persists after the celebration; the reason to return remains a question. The optional Happy Clam sea-stack detour now has a visible return hook beside the trestle, within hook range and at rail height; it solves leaving the stack without a swim, not the reason to travel home. |
| Find and shoulder the boiler                     | **Changed:** the actual boiler and pickup move from behind the forge to the open apron beside the rail rack and return track. No new text or symbol.                                                                                                                                                                                                                        |
| Carry boiler to the old camp train               | Existing rusty locomotive and nearby Fit the boiler interaction. The distant relationship between pickup and receiver is still weak; placement alone does not explain the repair.                                                                                                                                                                                           |
| Trains unlock; stand on a platform               | Wake/reveal, platforms appearing, signals and arriving trains.                                                                                                                                                                                                                                                                                                              |
| Use the second train to Far Head                 | The pier kit physically loads at the village and unloads into the Far Head rack. That shows its cargo payoff once witnessed; its value before boarding remains unresolved.                                                                                                                                                                                                  |
| Supply and build the pier                        | Delivered logs and rails beside the last receiver, followed by the familiar construction sequence.                                                                                                                                                                                                                                                                          |
| End: look toward the shard                       | Pier, buoys, distant shard and existing ending pull-out.                                                                                                                                                                                                                                                                                                                    |

**Owner questions:** round 4's “that's my objective” was carrying the late stretch. Boiler discovery is easier to inspect after relocation, but recognizing the old locomotive as its destination, wanting the second train before seeing its delivery, and wanting to return from Far Head still need a human playtest. A full bot run follows known destinations and cannot verify a blind first-time run. These gaps have not been filled with new helper text. That earlier guidance pass left bands and tree rules unchanged; the approved tree comparison above supersedes those two details. Cart/train naming remains unchanged; crate glows are described above.

**Pre-rebase verification (3 November; historical):** `npm run check` passed (292 tests). The full solo place bot finished all expected beats, saved 77 checkpoints and reported no graphics or page errors. Its on-screen text log contained no objective elements while its internal objective timeline retained nonempty labels and empty transitions. Inspected stills covered the opening after 18 seconds idle, receivers/great tree, first bridge, forge, hook platform/tower, Far Head return, relocated boiler, platforms/train and finished pier. They showed no objective box, orange objective beam or edge arrow; other HUD and world copy stayed visible. The boiler was visibly clear of the rail, rack and crane. The restored train checkpoint showed an empty deck: train cargo is not restored with its saved pose, so these stills do not verify the moving cargo payoff. The full live bot did finish the pier. These results predate the rebase onto `0e4376b1`; use the follow-up job's new manifests for the combined build. Blind discovery, real-time feel, co-op and device play remain unverified.

Falling is harmless: in the water, or down on a shore or a river bank more than 20 m from any path or laid track, Interact reads **Back up the path**. **Get unstuck** in the pause view searches nearby dry, level ground using the same safety validator as rejoining, with a clear landing checked against solid scenery. It falls back to the nearest path or laid track if no safe ground is found within 40 m. Classic mode keeps its spawn reset. **The panel** has Start over, Skip the walk, Skip chop and carry (fills the current frame), and Skip to the first path, to line 2, to Far Head and to trains.

**The tester's link** adds `&fresh=1`: no prototype bar (so no gut question or verdict buttons, and its D-pad and P do nothing), no panel, and no Honk touch button. Ping has its own touch button beside Drop. The counters and the numbers still run. On touch, the main button dims while nothing's in reach. On every `?proto=place` page the pause view's controls (every tab, and the drawn pad) list only what this place uses, without the ball, Use, Toss or the guest's Crouch and Punch, and with a Chop row for E/left click, X/RT and touch. The numbers wait until you're in. Objective presentation is absent on both the default URL and explicit place links.

**Two players, one railway** (default entry in `boogle`; explicit `?proto=place&coop=1` remains in `proto-place-coop`): waking the machine, trees and rocks felled, every deposit, the machine's run, laid track, the bills, the rungs (one chest, for you both; a newcomer inherits them), the money, the cart and rack, the forge, the boiler, trains and the town are shared, and the costs stay the same. Your back, chopping response, crates and gifts (each of you gets your own crate), crystals and gold finds are yours; you see your partner's logs on their back and them on your copy of a moving deck. Calling a train calls it for you both. The oldest visible tab decides what a deposit gets and when a run starts, so the last log can't start two, and what doesn't fit stays on your back; if it leaves, the next tab takes over. How: `src/proto/place/coop.ts`, reliable room messages and a whole-state message once a second, built from the slices in `job.ts`. Serves DESIGN.md 4 (Cooperation is automatic).

Completing the forge's first bill places the waiting pack chest on both peers as the bill event arrives. Receiving that event after a snapshot or after the pack was opened does not create another chest.

The forge rack holds 24 rails, including reserved slots for rails still flying out of its mouth. When a co-op correction replaces the rack, older flights no longer add rails to the corrected stock. Its visible stack updates immediately, and production continues from the corrected count.

In co-op, after the depot opens and before trains, **Whistle for the cart** at the turntable calls it to the forge even when the far end needs no materials, reversing an outbound cart immediately. Its round trip can be ridden in either direction, loaded or empty. **Load the cart** sends up to 16 needed rails from the forge rack onto its logs; it leaves three seconds after loading (eight seconds if empty). Rails fly onto the frontier rack, and a partner can ride the cart. A cart loaded by hand runs at **13 m/s while ridden**, accelerating at the existing 3 m/s²; automatic loads and unridden carts keep **9 m/s**. Manual eligibility lasts only until unloading. Bills stay fixed. Without `coop=1`, these verbs are absent.

Automatic rail loading at Q4/Q5 uses that same cargo and loading path in solo and co-op. The co-op authority alone transfers forge stock; existing reliable take/load events carry it to partners. An explicit whistle takes over automatic dispatch, preserving the manual split. Additive `placeRailCart` capability presence enables automatic service only when all active co-op peers support it; a room with an older participating build keeps the existing manual loading path. Already loaded cargo finishes safely. This is prototype shared state and Local presentation, not lockstep. Snapshots include rails still unloading, invalidate stale landing callbacks and reconcile frontier rail counts as well as logs, so a correction cannot duplicate an in-flight shipment.

Ride corrections preserve the rider's place on the deck. A car pose change faster than 1.5 times its cruise speed
(13.5 m/s for an ordinary cart, 19.5 m/s during its ridden bonus, 30 m/s for trains) is a relocation, never a collision
velocity to inherit on leaving. Ordinary turns follow the new heading at at most 2 rad/s and ease into it, rather than snapping at a junction. The physical deck and its drawn pose turn together, so riders follow that same bounded turn. Explicit snapshot relocations still move the rider with the deck and clear correction velocity. The cart reconciles progress, leg, load and speed on every authority snapshot, so a
partner rides the cart everyone sees. Routine reconciliation adjusts motion, leaving delivery transitions to the existing
events and settled-inventory correction. Riders follow the cargo deck's height when it unloads. Snapshot cart speed and
train express status are additive; older snapshots retain the predicted values. Train corrections also retain velocity
and dwell, so a follower does not independently stop at an intermediate halt while the authority runs express.
The objective and automatic train call share one halt detector: entry keeps its existing bounds, while leaving requires
another 0.4 m of clearance. Moving along the detection edge does not repeatedly ring the bell; leaving and returning does.

Historical Q5 measurement (3 November, local two-tab broker, real inputs, fixed 24-log/24-rail bill): solo 162.40 s; two walkers 115.14 s; split 80.90 s. The mixed-cart remeasurement uses the same bill and starting positions: solo at the forge, both two-player modes one at each end, empty backs and frontier rack. The forge-side walker/solo player still takes available rails before leaving, then uses frontier supply. The porter loads 16, takes nine on their back as the forge replenishes, double-jumps aboard, rides, and jumps off before walking to the frame. No teleports after positioning. Authority times, at measured 1x, one successful trial per strategy:

| Q5 strategy | Historical before | Mixed cart |   Change |
| ----------- | ----------------: | ---------: | -------: |
| Solo        |          162.40 s |    73.78 s | -88.62 s |
| Two walkers |          115.14 s |    69.16 s | -45.98 s |
| Split       |           80.90 s |    75.80 s |  -5.10 s |

**That mixed-cart baseline lost the split advantage:** 6.64 s slower than walkers and 2.02 s slower than solo. The owner subsequently authorized a 12–13 m/s manually loaded, ridden-cart comparison. The implemented choice is **13 m/s**, the smaller tested speed that consistently beat walkers. Same real-input fixture, fixed 24/24 bill and starting positions, measured at 1x; authority times in seconds:

| Ridden bonus |  Solo |  Two walkers |        Split |
| ------------ | ----: | -----------: | -----------: |
| 12 m/s       | 73.75 |        68.40 | 68.94, 69.08 |
| 13 m/s       | 73.73 | 71.52, 69.02 | 67.02, 67.28 |

At 12, both splits lost to the fresh walkers. At 13, both won: even the slower split beat the fastest walker across all trials by 1.12 s, and the fastest walker at 13 by 1.74 s. The payoff is modest, not a large separation; walking varied by 3.12 s across trials. All split runs actually loaded by hand, carried nine extra rails, boarded and dismounted through real input, and recorded zero lost-contact samples on the trip. No bills, forge rates, capacity, copy or tree code changed. Full manifest IDs and limitations are in the [plan's follow-up](../plans/little-guys-rails.md#ridden-cart-follow-up-4-november).

The bonus is prototype Host-like shared state under the existing co-op authority, not lockstep. Additive Owner presence `placeCartRide` advertises support (1) or riding (2); absent or invalid values disable the bonus for active peers using the existing authority freshness rules. Only the authority chooses and reliably broadcasts `cartRide`; followers accept it only from that authority. Additive validated `manual`/`boost` snapshot fields preserve eligibility and the decision, and existing speed/position reconciliation keeps the carts together. Old fields and events keep their meaning; missing flags mean off. An older participating build keeps 9 m/s with its cargo intact. Capability absence was tested, not an actual old binary. The existing `moveCar`/`snapCar` and bounded junction turn remain unchanged; the correction threshold follows the current or just-prior cruise so ordinary boosted motion is not mistaken for a relocation.

Fresh before-build attempts are retained rather than substituted for the historical numbers: solo observed 160.86/162.46 s, but the manifests were invalidated by a plan-file write and then an external harness-checkout change respectively; walkers twice fell after an accidental cart ride, and split missed the forge stop. The new code fixes the forge-stop target under snapshot nudges. The existing split fixture now uses a real jump to dismount before asking its ground path planner to walk; its first after-run failed there. Successful after manifests: split `1793774770414-85885`, walkers `1793774914460-89372`, solo `1793775002116-91592`, under `.look/evidence/`. These fixture times are not whole-run estimates or human playtest timings.

Deposit replies are matched to their sender and request, even after the active frame or temporary authority changes. A stalled tab does not refund accepted goods: rejected pieces (including the great beam) return once, and unanswered requests return when their authority actually leaves. This prevents a five-second stall from leaving the same logs both on a back and in the frame.

If a partner leaves holding the great beam or the boiler, it returns to its pickup spot so the remaining player can finish. Already delivered beams and fitted boilers stay consumed. Owner presence `placeBig` identifies the carrier; snapshots propagate the return and clear stale cargo from a returning shoulder. Reconnecting tabs rejoin behind the surviving authority, including when the carrier used to be the authority. A shoulder retained across a disconnect also yields if a survivor has already reclaimed that cargo or delivered the beam, so a quick re-pick cannot duplicate it on the returning player. A lone/transient reconnect retains its cargo when nobody reclaimed it; unanswered/accepted deposits still use their existing request settlement. Serves DESIGN.md 8 (Designed for drop-in, drop-out).

**See a partner's load.** Logs, rails, stone, the great beam, boiler and upgraded pack use the same worn meshes and avatar frame as your own. Logs keep `placeBack`, big cargo keeps `placeBig`, and the additive Owner cosmetic field `placeLoad` carries bounded rail/stone counts and the pack flag. None enters lockstep. Missing or invalid fields hide that part, and departure removes attachments and pets. Older builds ignore the new fields and still show legacy logs; new builds show whatever valid fields an older partner sends. Serves DESIGN.md 11 (Show, don't tell).

**Great-beam verification, 4 November:** actual full-bot solo pickup-to-deposit rose from **5.1 s to 21.7 s**. The same 15 m segment took **7.574 s solo / 3.416 s assisted**. Both carrier departure roles and helper departure passed recovery checks; follower-carrier and helper-departure runs also waited for accepted delivery to open the crossing. Final full bot had no missed expected beats or errors. Opened carry stills, motion, curves and consecutive frames show one beam spanning both shoulders; source and `corner=1` feed views retain the receiver fit. Real-time feel and device testing remain unverified. [Full evidence, compare times, failures and limits](../plans/beam-weight.md#verification-record--4-november).

The optional **9 m beam** starts at the village's west edge (868, -30). **Lift** an end or **Let go** with Interact. Alone, one end lifts while the other stays planted; two people carry it at walking speed. Being more than 11 m apart for a second drops it. A departing partner leaves it at its last midpoint, saved, with the remaining player's grip intact. Carrying its midpoint within 5 m of (944, 6) sets it on a fulcrum. Nothing in progression requires it or pays for it. Once set, it is a see-saw: land from a jump on one end to launch a partner on the other at 15 m/s (pads 3.6 m from its centre, 1.6 m reach; minimum landing speed 5 m/s; 0.5 s cooldown). Alone it only tilts and thumps. The neutral beam is solid; tilt is local and cosmetic, and each tab launches only its own player.

## Ancient technology (round 4, exploring)

The platforms remain visible from the start. Warm stone bodies, pale landing caps and brass corner keys match the island stone and device brass; the existing hook rings and teal undersides identify puzzle surfaces. The relief shares each pad's existing draw call. Device shafts use 0.1 opacity instead of 0.32, keeping a quiet distant cue in the spawn view. The tower nook's red cloth was a screen in front of its cosmetic crate, not a finish/checkpoint flag; it is removed so the crate and hook ring explain the side trip. These material changes are Local presentation; the optional double-jump course below replaces the first pillar's old reward ledge. Serves DESIGN.md 7 and 11.

The jump rings track the animated foot pivots, including during a running jump. The first pillar's approach lip sits 4 cm below its landing top, avoiding overlapping coplanar faces. The sea-stack secret has a return hook slab beside the trestle, within 24 m of the stack; the hook returns you to rail height so leaving does not require a swim. Recovery selects existing track surface colliders, including stubs, rather than treating an open line's unfinished pier as built.

Numbers and places: `src/proto/place/tech-layout.ts`. Research: [movement abilities](../research/movement-abilities.md), [BotW glide target](../research/botw-glide-target.md). Connecting a line gets you to where a device is; you still go and take it (**Take it**, Interact). Devices are one family: a stone drum, turning rings of teal light and a thin teal shaft you can see across the place. All three are shared; what you wear for them shows (rings at the ankles, a spool on the forearm, a pack).

1. **A second jump.** On a pillar beside the first path's deck, seen from the footbridge on your first walk, with a stone lip reaching for where the trestle will go. Taking it hops you up and up again, once. Press Jump in the air: at least 6.8 m/s up, once per take-off, back when you stand on something, and it turns you towards the stick. Its old single higher ledge is now a eight-hop optional course folding west and south: eight 6 × 6 m warm stone blocks, level with the device, separated by 10 m clear gaps. Run, jump and jump again to reach the next broad landing. The existing lamp-cap box waits on the final block; its secret ID, personal ownership and missed-prize delivery remain unchanged. A dry stone ribbon 3.4 m below catches missed jumps, with a lower return walkway and a ramp to the starting pillar. The main route stays open beside it; ability acquisition and subsequent unlocks are unchanged. The short-course pacing target is 20–40 seconds for a competent player, to be judged in play. Serves DESIGN.md 3 (Side activities are never required), 10 (Slapstick over precision) and 11 (Show, don't tell); layout and recovery geometry are shared with the checks through `JUMP_COURSE` and `JUMP_RECOVERY` in `tech-layout.ts`.
2. **The hook shot** (RB, F, or the touch button). On a second pillar beside line 2 over the stem, 2.2 m above the deck, so it takes two jumps. Taking it pulls you across to the first slab, onto a box. A press pulls you to the ring nearest the middle of the view: 24 m, 25 degrees, 16 m/s, one press, no aim needed beyond that. Same ring everywhere: brass until you've got the hook, teal in range, bright when it's the pick. Jump, Back or the button lets go. The button's glyph shows on the ring for your first three pulls.
3. **The glider** (LB, Q, or the touch button: a toggle). At the top of Needle Bell, six pulls up slabs that hang in the air; every drum of the spire is solid now. Toggle in the air: 10 m/s at full stick, 3.2 m/s down moving or not, 18 m/s² up to speed, 12 m/s² stopping when you let go, heading up to 360 degrees a second, opening in 0.1 s from any fall, closing keeps your velocity. It never gives height back and has no boost. Landing, water or sitting closes it. The camera eases to Breath of the Wild's normal framing, 5.2 m and 50 degrees (`&glidecam=pull` or `off` to compare). The glyph shows under you if you're falling with it shut, until you've flown twice.

**Two gates on the line, both slabs across the track bed.** You can walk round one; the machine can't, and its frame takes nothing until it's down. _The quarry:_ a chain runs from the slab up to a lever on a ledge 2.2 m high, banded in the devices' teal (**Pull**). _The rim, before the sea:_ dark posts lead from the slab back to the tower. Taking the glider sends light down them, one by one, and the slab falls. It's a 76 m, 24 s glide from the top to the frame. While a gate waits the beacon stands at its answer. No line of words says any of this.

Both sealed gates have paired stone leaves, recessed courses, pale edge strips and a brass circular seal over dim teal. The relief is merged into the existing face mesh, with a faint fill in shadow; no additional draw or light.

**Secrets**, each a cosmetic that comes only from its own place, outside the boxes' odds and order, with no shaft over it: _village:_ a yard behind a cottage, past the washing line (walk), a balcony on a column under a canopy-shaped vane (glide). _Timber:_ the final block of the first device's optional course (eight double jumps), a shelf by the lookout with a scarf on a branch (two jumps), a bell you hear from the footbridge, on the far bank (walk), a catwalk under the trestle (hook). _Tower:_ the first slab (hook), a side slab with a visible crate and ring (hook). _Quarry:_ up on the low rock (hook). _Far Head:_ a sea stack with a flag off the trestle (glide). **Missed prizes** turn up as boxes at the **finders' bay**, in the village across the path from the wardrobe, once you've gone on past: village and timber walks with the hook, the rest with the glider, trains or the end. Open either box and the other goes. The bay shows them under sheets until they're yours; swap at the shelf as ever.

**Shared:** `job.tech` and `job.gate`, so the save and the `&coop=1` snapshot have them, and `coop.tech` says so at once: a partner gets the ability and a small cue where they stand, and a newcomer inherits it. Physics is Owner; presence `placeMove` carries mode, ring and a puff count, so a partner sees the wing, the cable and the puff. Finds are personal.

**Reach:** `node dev/economy/place-level.ts` checks what each state of the run can stand on, and that nothing is reachable early. Known harmless skip: riding the machine across the stem as it lays gets you up onto the second pillar with one jump. The second device is still there on your way.

## The town you can go into

Corner posts sink with whichever adjacent wall is cut away, using the same reveal timing and easing. Roof lift, the retained bottom course, wall collisions and shadow proxies are unchanged.

An optional side activity: nothing here gates the job (DESIGN.md 3), and it adds no line to the objective. Serves DESIGN.md 1, 6, 9 and 11; research: [town interiors](../research/town-interiors.md). Open doors, in the same world, no loading.

**The house** stands from the start, by the spawn. **Pip**, the first resident, stamps a leaf the size of a tray at a very tidy desk beside an ordinary mug: "I just moved in here for the jobs." A bed, a very senior chair, a stove, a board that says JOBS, none yet. As the town grows, Pip's desk changes: a model of your bridge, a rail for a paperweight, a toy train and a suitcase, a second mug.

The room dressing stays on existing furniture footprints: a folded quilt, reading lamp, drawer pulls and kettle at home; folded cloth, hangers and a panelled counter in Fine Prices; brass-edged display cabinetry, reflector dishes and bench cushions in the museum. The shop's striped awning has a scalloped edge. Furniture shares one rough material with restrained ambient fill, and town walls retain their instanced construction mesh. This is visual dressing only: solids, prices, objectives and dialogue are unchanged.

Work and festival overalls have a fitted low waist, curved front/back bibs, open sides, shoulder straps and one small pocket. Festival overalls use pink cloth with brass buttons; the blue/green front blocks and contrasting yellow panels are gone. The raincoat retains its continuous hem, collar and pockets. They use a shared matte cloth material on the existing Buddy attachment. The pack's reward model and worn silhouette share an open timber frame, shoulder straps, buckles and a low canvas cradle. It uses the load's back socket with no extra stand-off, so logs remain visible inside the frame. Capacity and unlocks are unchanged.

**The shop, Fine Prices,** and **the museum** rise when the first path opens, each with a board on its plot till then (Fine Prices, coming soon; A museum, once there is something to show). You can tell them by their shape: an awning, a table of goods and a big tag; columns, a pediment and a sliver of blue through the door.

**Fine Prices.** Button the clerk, and Nell, who's been saving for eleven years. Five things on stands, none from a box: a paper work hat, a very large button, a sandwich board, then a very tall hat after the forge and a station master's whistle after the trains (under a sheet till then). Each tag has a real price, $8,000,000 to $3,000,000,000 **plus $1,000 for each dollar on your counter**, so it climbs as you earn, and says TODAY: $0 under it. Nothing touches the money. **Try on** (it's on you), **Take it: $0** (it's yours; a shop item doesn't count towards what the next box is), then **Wear it** or **Take it off**. The rail at the back swaps anything you own, boxes' finds too (`swapSlot`). Walk out still trying something on and it's yours anyway: Button shouts after you.

**The museum.** Moss the curator, and Wren, who has opinions. A stone split in two and shown side by side in a dark alcove: rough rock, bands of agate, a cave of blue crystal with light going slowly up through it, a shard in the gap. A table with the whole place on it at 1:120, from the land's own heights: every building standing or going up (scaled up so you can see a village), the track as far as it's laid, the machine and trains moving, trees still standing, the village's people, an orange pin for you. Nothing here is collected.

**Talking** is the shared talk input (`src/player/conversation.ts`); each has their own babble. First meeting, then the newest change in the town you haven't heard about from them, then an ordinary line in turn. **The Boogler?** is always an answer, and gives a rumour: a prophet, a mystic, powers. They contradict each other, nothing confirms any, and only the prices hint at what's coming. They also say a line out loud in a bubble without being asked: hello the first time you walk in, what's changed when you walk in after, and now and then someone in the street, about the newest change or a rumour (70-120 s apart, in the village only, and only someone you can see). Every word is in `town-lines.ts`, as drafts for the writing pass.

**The camera indoors** is still yours. The roof lifts away and any wall on the camera's side sinks to its bottom course over 0.24 s, for you alone; a shadow proxy keeps the room shaded and the walls stay solid. The arm ignores the cut-away walls (`ROOM_GROUP`) and still minds furniture and everything else. The pitch eases to -0.4 as you come in and any look of yours ends that; it goes back on the way out only if you never touched it. They come back once the camera's 1.8 m clear of the building. Numbers: `ROOM_CAM` (`rooms.ts`).

**Two players:** which buildings stand, and everything in the miniature, come from what's shared; cameras, cutaways, talks, what you've heard and what you've taken are your own. Nobody can spend anybody's money, since nobody spends any. A partner doesn't see what you're wearing yet.

## Departures from the brief

The machine doesn't come back by train: line 1 ends at the village, so it's already there, and a turntable hands it to line 2.
Far Head and the extended grid aren't in `npm run level-check`, which doesn't know this land: `node dev/economy/place-level.ts` floods it from spawn at the player's slope limit and lists what's reachable in each state of the job.
Its cradle isn't solid, unlike the rest of it: a second shape on the flatbed's body made you fall through the deck (see below).
Most buildings are solid blocks you can't go inside; three you can (above).

## Measured

**Trees plus shipped rail cart, 4 November follow-up:** this supersedes the earlier tree-only
comparison below. Fresh main baseline was `37762c28`; while it ran, `origin/main` advanced to
`88c7c36b` with tooling/dependency changes only. The branch rebased onto that newer commit.
`git diff 37762c28 88c7c36b -- src dev/look` is empty: the measured main gameplay and bot are
identical to the rebase base. Installed the updated dependencies in this worktree.

| Beat                                    | Fresh main  | Rebased trees + cart |
| --------------------------------------- | ----------- | -------------------- |
| First path                              | 5:59.29     | 6:02.13              |
| Little guys / depot                     | 15:08.63    | 8:51.19              |
| **Path → little guys**                  | **9:09.34** | **2:49.06**          |
| Trains unlock                           | 24:19.33    | 18:01.81             |
| Pier / run ended                        | 27:09.04    | 20:51.53             |
| Entire bot, including the optional tour | 30:12.20    | 23:54.00             |

The hunger stretch loses **380.28 seconds (69%)**; **169.06 seconds (31%) remain**. First-path
time is effectively unchanged. The owner still needs to judge whether that remaining hauling
creates any desire for the little guys. No bills, carry quantities, forge rate, cart capacity,
cart speed, upgrade placement or tree yield were retuned. Both whole runs completed all expected
beats with zero runtime errors/water falls. Optional crystal/co-op marks were absent from the
after solo run. Both still waited **1:49 for Q5's second shipment**. Manifests:
[fresh main](../../.look/evidence/1793779930035-76662/evidence.json),
[rebased run](../../.look/evidence/1793781061236-48731/evidence.json).
Offline comparison: `npm run playthrough -- --compare .look/evidence/1793779930035-76662/run .look/evidence/1793781061236-48731/run`.

Q5 uses the existing real-input fixture at **1×**, unchanged 24-log/24-rail bill and starts:
solo at the forge; two-player strategies one at each end. Authority-clock seconds, one valid
trial per strategy. The split still manually loads 16 rails, carries nine, boards and dismounts
with actual input. It recorded zero lost-contact samples and reached the existing **13 m/s**.

| Q5 strategy |                                              Fresh main seconds |                                                 Rebased seconds |
| ----------- | --------------------------------------------------------------: | --------------------------------------------------------------: |
| Solo        | [73.74](../../.look/evidence/1793780071338-83449/evidence.json) | [73.78](../../.look/evidence/1793781272448-58229/evidence.json) |
| Two walkers |  [72.94](../../.look/evidence/1793780369968-3328/evidence.json) | [71.45](../../.look/evidence/1793781363546-62608/evidence.json) |
| Split       | [67.42](../../.look/evidence/1793780252718-95180/evidence.json) | [66.98](../../.look/evidence/1793781452107-65856/evidence.json) |

Split beat walkers by **4.47 seconds** and solo by **6.80 seconds** in the after trials. The
small before/after changes are within observed variation. This fixture sources logs from the
cart and does **not chop**, so it checks integration/strategy timing, not nearer-tree harvesting.

The rebase retains `placeRailCart`, `placeCartRide`, cart call/load/ride messages and automatic
rail waiting in the bot, within the `placeCoopTrees1` peer/message identity. Legacy beam grips
are now filtered by that identity too. Tree-capable peers missing a cart capability still get
the existing corresponding fallback; non-tree-version peers cannot alter this railway through
old messages or claimed cart/beam presence. Checks against the combined gameplay:

- [Tree co-op](../../.look/evidence/1793780766888-34935/evidence.json): finite final payout,
  duplicate receipt, pending-snapshot reservation, saves, both cart capabilities, old reset/chop/
  cart messages, and old-version ride/beam presence all passed.
- [Automatic cargo](../../.look/evidence/1793780784091-35405/evidence.json): both loaded 16 logs
  and 16 rails; a follower's pickup during an unload snapshot conserved 16 rails with no stale
  flight duplication.
- [Whole manual trip](../../.look/evidence/1793780986987-46094/evidence.json): follower whistled,
  loaded and rode; both reached 13 m/s, with zero rider-contact losses and 12 rails at both racks.
  Maximum sampled peer gap was 1.276 m / 0.35 m/s, within the existing fixture bounds.
- [Absent rail capability](../../.look/evidence/1793781558252-70669/evidence.json): both delivered
  16 logs / zero automatic rails. [Absent ride capability](../../.look/evidence/1793781619949-74526/evidence.json):
  both stayed at 9 m/s, lost no rider contact and delivered 12 rails.
- [world-inputs](../../.look/evidence/1793780762686-34768/evidence.json) passed. `npm run check`
  passed 293 tests, lint/typecheck, registry and build after installing main's dependencies.

Retained failures: the [first main walkers trial](../../.look/evidence/1793780156815-92379/evidence.json)
delivered in 68.48 s but failed world-clock health by about 3 s, so its timing is excluded above.
The [first manual-cart eval](../../.look/evidence/1793780856034-38596/evidence.json) timed out waiting
for the whistle target. A repeat passed without a gameplay change; its cause was not reproduced.
The fixture now prints target/position/cart state if that timeout returns. Initial check failures
were missing newly landed tooling dependencies and a fixture presence-spread type error; both
were resolved. No failures remain in the final selected runs.

Opened new PNGs: both full-bot end stills; main solo/split Q5 stills; rebased solo/walk/split Q5
stills; `rebased-tree-coop-still.png`; both `rebased-auto-rails-still.png` views; and both
`rebased-cart-trip-repeat-still.png` views. The Q5 board visibly reaches 24/24 logs and rails;
the rail shelf is empty after the conserved pickup while logs remain; the rider stays on the
unloaded cart deck in both trip views. The tree assertion view is obscured by neighbouring
crowns and does not establish felling quality. End stills contain debug overlays. Capture health
and numeric continuity passed; real-time feel/audio, device performance, actual old binaries and
the owner's hunger judgment remain unverified. Earlier tree-only stills/timings are historical.

**Earlier trees-only comparison, 4 November (historical):** broker runs on this worktree, compared with
`npm run playthrough -- --compare <before>/run <after>/run`.
The [before manifest](../../.look/evidence/1793776901007-75675/evidence.json) and
[after manifest](../../.look/evidence/1793778563313-67800/evidence.json) identify the tested trees;
both completed every expected beat. These are one run each, not human first-play times.

| Beat                                  | Before   | Universal ordinary trees + two hardwoods |
| ------------------------------------- | -------- | ---------------------------------------- |
| Equipped starter / awake              | 2:05     | 1:28                                     |
| First path                            | 6:38     | 6:02                                     |
| Awake → first path                    | 4:33     | 4:34                                     |
| Proper axe                            | 7:12     | 6:35                                     |
| Pack                                  | 9:49     | 7:09                                     |
| Forge lit                             | 12:37    | 7:48                                     |
| Depot / little guys                   | 15:53    | 8:51                                     |
| **First path → depot hunger stretch** | **9:14** | **2:48**                                 |
| Trains unlock                         | 26:56    | 19:52                                    |
| Pier / end                            | 29:45    | 22:42                                    |

The exact path→depot interval fell **554.4 → 168.4 seconds**, a **386-second (70%) reduction**.
Only about **2 minutes 49 seconds**, roughly one third of the historical eight-minute stretch,
remains. The earlier first path mostly reflects a shorter opening walk in this run: work after
waking was effectively unchanged. No bills, carry limits, upgrade placement or cart quantities
were retuned to recover the missing hunger. The owner still needs to answer:
**“Did you still want the little guys to take over, and did they help?”**

An [initial after run](../../.look/evidence/1793778199663-52346/evidence.json) failed one required
arrival across the gorge and fell in water three times. The bot now compares walkable route
lengths to eligible trees, rejects low river-shelf approaches and abandons repeated no-yield
swings. The final run had zero water falls/errors/missed expected beats, one tumble and two
recorded missed-train events. Optional crystal and co-op beats were not marked in that solo run.

**Frame samples:** same fixed village view, daylight 0.26, 960×600, Apple Metal WebGPU hardware,
three passes, 180 CPU/GPU samples each. Standing before/after use the same eval and cost action;
dense additionally settles all 390 non-great trees before sampling. Short captures are not a
benchmark or device-wide performance claim.

| Sample                                                                   | CPU avg / p95 ms | GPU avg / p95 ms | Frame typical / p95 ms | Draws / triangles |
| ------------------------------------------------------------------------ | ---------------- | ---------------- | ---------------------- | ----------------- |
| [Before](../../.look/evidence/1793777154862-90665/evidence.json)         | 3.91 / 4.20      | 1.70 / 2.00      | 16.7 / 17.4            | 247 / 657,427     |
| [Standing after](../../.look/evidence/1793779277620-20495/evidence.json) | 3.77 / 4.20      | 1.83 / 1.97      | 16.7 / 17.2            | 251 / 685,685     |
| [390 felled](../../.look/evidence/1793779314159-24160/evidence.json)     | 4.39 / 4.90      | 1.64 / 2.29      | 16.7 / 17.5            | 253 / 686,021     |

Standing tree collision is **391 shapes before and after**, but **30 → 391 static bodies**:
the 362 decorative colliders already existed on one compound body in this checkout. Afterward
they have removable individual bodies. The dense scene counted 1,088 static bodies / 2,379
shapes globally versus 714 / 2,005 in the standing fixture. Rendering remains instanced;
the extra draws are fixed species/notch batches, not one draw per tree.

**Acceptance and visual evidence:** the
[solo fixture](../../.look/evidence/1793779375555-31306/evidence.json) passed clipped payouts,
mid-tree upgrade, full bag, repeat rebound, partial/felled reload, accepted in-flight inventory,
the starter great beam, all catalog fall footprints and a player inside a settling log. At a
zero preferred yaw, 375 trees found safe long falls and 16 used compact collapse. All 32 sampled
great-tree approach headings retained a long fall. The
[two-player fixture](../../.look/evidence/1793779500291-45408/evidence.json) passed pending-snapshot
reservation, duplicate receipts, simultaneous final payout, legacy reset/chop isolation and
snapshot/local-save restoration. Its earlier opening-handshake timeout was fixed in the fixture.
[world-inputs](../../.look/evidence/1793779541900-48677/evidence.json) passed the existing core smoke
contract; it is not itself a place-harvest test.

Opened the [decorative stump](../../.look/evidence/1793778890091-81388/evidence.json),
[hardwood one](../../.look/evidence/1793778823191-80022/evidence.json),
[hardwood two](../../.look/evidence/1793778836256-79170/evidence.json),
[rebound](../../.look/evidence/1793778949498-82879/evidence.json),
[full bag](../../.look/evidence/1793778971540-83879/evidence.json) and
[bite](../../.look/evidence/1793779004999-81378/evidence.json) PNGs, plus consecutive video frames
for all three contacts. The chopped scenery tree leaves a pale stump and bare log clear of the
path; both hardwoods read as broad, forked, ridged-bark trees among conifers without paint bands.
The rebound lifts the blade back with a tiny fixed scuff; the bite emits splinters and wood with
a visible notch; the full bag pulls the hand back toward the bundle without wood or a notch.
Standing/dense village stills show clear routes. Solo/co-op assertion stills are partly occluded
by neighbouring crowns, so they are not the visual proof of felling. End-of-bot stills were also
opened. Audio balance, real-time feel, handheld performance, human species recognition and
hunger remain unverified. Actual old-binary play and crash/reconnect races were not exercised;
legacy messages and same-generation snapshot restoration were.

**Historical round-4 baseline below:** its grove distances and rung estimates predate universal
ordinary chopping. Keep it as design history, not the current pacing measurement.

`npm run playthrough`: a bot at a person's stroke rate that already knows the way, walking, never sprinting. So a floor for a first-timer, not an estimate; nothing here is a person's time yet. Seconds from its start; `node dev/economy/model.ts round4` said 6.4, 10.7 and 22.1 min for the first three milestones before it was run.

| Beat                           | Time                       | The work before it                                            |
| ------------------------------ | -------------------------- | ------------------------------------------------------------- |
| At the machine                 | 81                         | the long way, 431 m                                           |
| Station 1 laid                 | 115                        | 20 s chop and carry                                           |
| Station 2 laid                 | 201                        | 75 s                                                          |
| Felled the great tree          | 326                        |                                                               |
| **First path open**            | 357 (5:57)                 | station 3: 136 s                                              |
| Second jump                    | about 6:14                 | 13 s over the new deck                                        |
| Proper axe                     | 384                        | a walk across the new path                                    |
| Pack frame                     | 528                        | forge frame, 24 logs: 141 s                                   |
| Forge lit                      | 689 (11:29)                | walls and chimney, 32 logs: 159 s                             |
| Depot (line 2, station 1 laid) | 859                        | 158 s                                                         |
| Stations 2, 3, 4 laid          | 919, 977, 1110             | 44, 45, 117 s                                                 |
| The climb and the glide        | adds about 2:40 by the end | the hook after station 2, the lever, the tower                |
| **Far Head open**              | 1380 (23:00)               | station 5: 238 s; these rows' times are from before the climb |
| Walked home                    | 1533                       |                                                               |
| **Trains**                     | 1597 (26:37)               | boiler to the camp                                            |
| The pier out, the end          | 1772 (29:32)               | 27 s to carry its kit                                         |

**Mixed-cart model, 3 November:** `node dev/economy/model.ts round4 --json` retains the historical arithmetic; `node dev/economy/model.ts round4-cart --json` changes only Q4/Q5 to the 16 m rack carry and charges supply time. These are solo estimates in seconds from model start, not bot measurements.

| Model beat    |  Before | Mixed cart | Change |
| ------------- | ------: | ---------: | -----: |
| Q3 laid       |  875.46 |     875.46 |   0.00 |
| Q4 laid       |  970.74 |     966.01 |  -4.73 |
| Q5 laid       | 1230.02 |    1216.15 | -13.87 |
| Trains unlock | 1365.45 |    1351.58 | -13.87 |

This intentionally conservative variant starts each frame with the cart at camp and an empty forge, charges every shipment before the player's final carries, and credits no existing stock or overlap. Road lengths are 361/469 m; supply wait is `rails / 2 + (2 * batches - 1) * road / 9 + batches * 9.3`, with 24 logs/16 rails per cart and 3 s camp loading, 3 s forge departure and up to 3.3 s unloading. Q4/Q5 supply waits are 57.41/186.93 s; short-carry work is 16.71/25.06 s instead of 78.85/221.13 s. The small net gain exposes the cost of a second Q5 trip under that cold-start assumption. Real play can overlap delivery, production and carrying; the bot comparison below is the observation. The model also omits the ability detours. Train unlock is Q5 completion plus `546 / 5.6 + 190 / 5.6 + 4` for the trip home and boiler; the model's `trains.openS` includes the pier and must not be used as the unlock time.

**Mixed-cart full bot, 3 November:** measured through the local broker, same bills and full route. These station beats mark the **start of laying**, unlike the model's completed stations. Seconds from the saved game clock:

| Bot beat         |  Before | Mixed cart |  Change |
| ---------------- | ------: | ---------: | ------: |
| Q3 starts laying | 1047.62 |    1046.70 |   -0.92 |
| Q4 starts laying | 1160.03 |    1121.60 |  -38.43 |
| Q5 starts laying | 1452.20 |    1342.55 | -109.65 |
| Trains unlock    | 1578.42 |    1468.75 | -109.67 |

Both runs completed every expected bot action with no page or graphics errors. `npm run playthrough -- --compare .look/evidence/1793772548990-11068/run .look/evidence/1793774348050-66816/run` reproduces the comparison. The after bot uses frontier deliveries from Q4; earlier behavior is unchanged. Its walking share fell from 85% to 77%, but stationary time rose from 4:49 to 7:01, including a **1:49 Q5 shipment wait**. Thus the route is shorter overall, while the retained 16-rail capacity still leaves a noticeable second-trip wait. No capacity, speed, bill or forge-rate retune was made to hide that tradeoff. Whether seeing the shipment arrive feels like earned relief still needs the owner's playtest; this bot already knows where to go.

**Committed-build repeat:** `1793776017482-40382` tested clean commit `150d782e`, with all expected actions, no errors/falls and an inspected end still. The repeat includes more startup waiting; do not replace the first measured run or hide that variance. Raw checkpoint seconds and changes from the same baseline:

| Bot beat         | Baseline | Committed repeat | Change |
| ---------------- | -------: | ---------------: | -----: |
| Q3 starts laying |  1047.62 |          1088.38 | +40.77 |
| Q4 starts laying |  1160.03 |          1163.27 |  +3.23 |
| Q5 starts laying |  1452.20 |          1384.27 | -67.93 |
| Trains unlock    |  1578.42 |          1510.52 | -67.90 |

The repeat is already 41.68 s behind the first after-run at Q3. From Q3 to trains it takes 422.13 s, versus baseline 530.80 s and the first after-run 422.05 s: the affected interval improves by 108.67 s on the repeat. Q5 still waits 1:49; total stationary time is 7:54. Offline comparison: `npm run playthrough -- --compare .look/evidence/1793772548990-11068/run .look/evidence/1793776017482-40382/run`. The trusted harness changed between measurement rounds, with its exact version recorded in each manifest; these are observations, not a deterministic performance guarantee.

**Each rung, before and after** (from `layout.ts` and the model's sums; bills held fixed): the axe doesn't cut much time (a 24-log job 65 m out, 80 s to 77 s, 3%) and isn't meant to: **12 presses to 5**, 8 logs in 2 swings where it took 4, 1.6 trees to 2.4. The pack: the forge's 32-log bill 170 m out, **4 trips to 2, 253 s to 129 s (49%)**, with line 2's first bill (22 pieces) also down to 2. The cart: station 3's logs, 350 m to the trees against 16 m to the rack, **223 s to 104 s for the job's walking (53%)**.

**The train, door to door, Far Head to the village:** on foot 546 m, 98 s walking, 57 s sprinting. By train, measured with a called train at the far end (the worst wait): 31 s wait, 2 s to board, 3 s of dwell, 31 s ride: **68 s**. Already there: about 36 s. So it beats walking by 31 to 63%, and beats non-stop sprinting only when it's already near; the fair reason for it is cargo, and the sit. A missed train costs a return trip of about 70 s, less if you call it back at once. Camp to village: 18.6 s riding against 34 s walking.

Cost: not measured on an iPad this round. M1 Max held 60 fps in every capture (not a benchmark).

## Sound

Tree contact distinguishes three local cues: a dry bite with a low wooden body and splinters,
a short hard woody rebound with a blade ring, and a soft strap/wood rattle for a full bag.
The bite holds the axe pose briefly, bends the trunk and delays the crown; the rebound pulls
the axe back and leaves one shallow scuff; the full-bag gesture points back toward the bundle.
Repeated refusals within a second are quieter. Neither refusal plays a collection melody or
changes tree progress. These cues use the existing procedural SFX bus; heard balance and feel
remain owner listening/playtest questions.

Round 4's action cues use the existing SFX bus (`src/render/place-sfx.ts`), with camera-distance falloff and finite procedural sources. They replace the generic sounds at the same presentation beats; no gameplay timing, costs, routes or copy changes. The cart's quiet wheel and paired effort cues follow its travel in the existing render update; snapshot jumps skip accumulated contacts. At most eight of these new cue events overlap (at most forty sources), separate from legacy audio. Rarity adds notes and tail length, not level. This follows construction-sound recommendations 1–5 and 10, audio-architecture recommendation 11, and collect-sounds' attack/body/bounce recipe; DESIGN.md **11. Show, don't tell**.

Listening list for the owner (the implementing agent cannot hear; timbre, balance in play and fatigue need a person's judgment):

| Moment                         | Intended sound                                         |
| ------------------------------ | ------------------------------------------------------ |
| Rock breaks                    | Dry stone crack, low body and a short scatter of grit. |
| Great tree starts falling      | Descending wooden groan with a splintering attack.     |
| Great tree lands               | Broad, dull trunk impact with a soft crown rustle.     |
| Trunk reaches your shoulder    | Wooden knock and a brief rising effort.                |
| Common box reveal              | One warm bell with a tiny bright bounce.               |
| Rare box reveal                | Root and fifth with a short metal sparkle.             |
| Wonder box reveal              | Three rising notes with a longer, quiet shimmer.       |
| Second-jump pickup             | Two rising elastic notes.                              |
| Hook pickup                    | Small metal strike resolving upward.                   |
| Glider pickup                  | Airy swell opening into a soft fifth.                  |
| Second jump used               | Short air puff with a subtle rising body.              |
| Hook fired                     | Tight cable zip dropping away from the hand.           |
| Hook released or pull finished | Dry metal tug.                                         |
| Glider opened                  | Cloth-like snap and a short breath of air.             |
| Glider closed                  | Small folding swish that settles quickly.              |
| Cart rolling                   | Quiet paired wooden wheel knocks.                      |
| Cart pushers                   | Two soft breathy efforts as they shove.                |
| Cart stops                     | Brief brake rub and a wooden settling knock.           |
| First path opens               | Restrained root, fifth and octave.                     |
| See-saw bounces                | Springy wooden creak rising into the launch.           |

Render the same recipes without normalization via `node dev/audio/render.ts --offline-place` using this job's browser broker. Its manifest distinguishes raw SFX-bus peaks from the live master mix; it cannot establish perceived loudness or speaker quality. The existing glide wind remains on the ambience bus.

Quiet ambience under everything (`src/proto/place/ambience.ts`, on the ambience bus, so it starts with the first press, ducks under voices and follows the volume): slow swells of low-passed brown noise, one on each side on its own clock; far gulls every half a minute to two minutes (a lone mew, a pair, a long call, sometimes an answer), panned around; a faint wandering breeze that gives way to the sea at the shore. The sea is loudest within about 18 m of the shore, a little under that on the river bank, and fades by 150 m to 11 dB down, with height counting as distance; it leans towards the water's side as you turn. Numbers: `LEVELS` and `FEEL`. `&ambience=off` turns it off and `&ambience=-6` moves it in dB. Hear it away from the game: `node dev/audio/render.ts --only place`.

## How it's built

Trees remain instanced, with only active hit/fall poses updated. Standing trees have removable
static trunk bodies; this checkout already had the decorative colliders batched on one body,
so conversion adds body ownership rather than 362 previously absent trunk collisions.
The shared catalog retains planting exclusions. A fall tests its swept crown/trunk against
paths, future rails, station approaches, buildings and spawn, trying alternate directions.
Where no long footprint fits, an ordinary tree collapses at its base and leaves a low stump.
Settled logs are static; they are not a Rapier rigid-body pile. Contact blobs cover stumps
rather than retaining the old broad scenery-canopy patch.

Tree co-op stays inside the existing **prototype** authority/localStorage boundary. Its new
`placeCoopCargo1` message and presence identity isolates older place builds in the same room;
they cannot send tree hits or snapshots into this build's railway. They do not share this
prototype's changed progress. The authority orders harvest, returns a matching request receipt,
and records issued wood/work. A follower reserves offered bag room and awards only an accepted
receipt once. Saved `treeHarvestV1` partial records supplement legacy felled IDs. Accepted logs
belong to the personal bag immediately; log flights only present that award, so a mid-flight
save retains it. This is not server-durable lockstep persistence: an authority crash before
replication/save remains a prototype limitation. Normal reload, duplicates, final-hit races
and snapshot restoration are checked through the existing look harness.

Round 4 visual repairs: the avatar uses its articulated sun shadow without a second square terrain patch. Short timber feet support sleepers at shallow ground transitions. Settled train crates have box colliders on the car's existing kinematic body; the carry surface follows each crate top while keeping the same platform identity. Loading and unloading under a standing rider adjust their support height without adding launch velocity; flying crates have no collision. Cart cargo behavior is unchanged.

Local, all of it, in localStorage per room (`boogle-place-v4`, a new key so an old save can't break it). What's kept is in one place: `job.ts` holds `job` (the shared state, including `rung`, `score` and `ways`) and a list of **slices**: `sharedSlice(key, { get, set })` for what a `&coop=1` room has in common (saved and in the snapshot), `personalSlice` for what's this tab's own (saved only). Your position and facing are personal: while moving they save about every five seconds and on leaving. Reloading returns you to safe ground there; water, building footprints and moving platforms return you to spawn. Start over returns you to spawn. `index.ts` is thin; its comment maps the modules. Your back's log count is kept in `chop.ts` and drawn by the
game's bundle through `backSeam` (`src/features/haul-stack.ts`), with rails, a sack of stone, a pack frame and a big thing on your shoulder on the avatar. Pieces in the air are one instanced pool (`pieces.ts`, `send`); pieces joining a build fall from above
(`dropSet`), never scaled. Every building but the forge shares one construction set (`sites.ts`): its plan is the forge's, in a function. Boxes and the two tapered gable shapes use three instanced draws and three shadow draws for the town. Each house-plan gable keeps three roof-phase pieces: a base course and two tapered courses meeting the roof slopes. They fall separately, with the same build order, cutaway group and collider timing.

Each line's track is one instanced set sorted by where the machine drops each piece; 2 m slab colliders join as it passes. The
machine is the kit's look on two kinematic platforms; it advances in the physics step. Trains are the same kind of car on a small state machine (`rail.ts`: target stop, signed speed, dwell), not a clock, so a call can send one straight somewhere; `&coop=1` nudges it to the authority's. A flatbed with a compound shape lost its deck collider in testing, so the flatbed stays a single box.

The land is one height function on a 2 m grid (`terrain.ts`, no three.js; 760 x 540 m with Far Head), drawn as one faceted mesh and collided as one heightfield. From the crossing: the
sea, sky and far plane (`src/proto/crossing/sea.ts`, `sky.ts`), the speed put back past the 237 m soft wall, the player's CCD
off. Numbers: `TUNE`, the bills (`LINKS`, `FORGE_BILLS`) and the plots (`TOWN`) in `src/proto/place/layout.ts`. The run: `run.ts`. Rungs: `ladder.ts`. Cart and rack: `depot.ts`. Trains and cargo: `cargo.ts`; stations: `halts.ts`. Moments and the pull-out: `celebrate.ts`, through the existing `camConstraints` seam. Gifts, shelf and mounts: `gifts.ts`. Little guys: `folk.ts`. Crystals: `crystals.ts`. The town you go into: `town-life.ts` wires `rooms.ts`, `house.ts`, `shop.ts`, `museum.ts`, `residents.ts`, `talk.ts`, `growth.ts`; every word in `town-lines.ts`. Look evals: `dev/look/evals/place-job.ts`, `place-act.ts` and `place-town-coop.ts`.

The look (`src/proto/place/look.ts`) is the default. It overrides `tod`. `&look=off` gives the old look; `&look=ground,light,contact,kit,mats,gtao` gives single layers (`all`, the default, leaves `gtao` out). To-dos: [look-pass.md](../plans/look-pass.md).

The staged [water graduation](../plans/water-graduation.md) registers the finalized `terrain.ts` grid after
`buildLand()`, through `water.ts`. Its valid world bounds are x 740–1520, z −280–260; the last row and column are
included explicitly rather than accepting `H`'s exterior −6 fallback as real ground. The Local shore atlas uses a
1024 m / 512² core and an 80-texel halo (2 m/texel); all eight resident layers are bounded, and an overflow reports
instead of evicting a visible shore. Bed/coast stays separate from projected obstacles used by wave shelter.
This registration does not change the current sea or Round 4 terrain.

`?proto=place&water=new` uses the same staged replacement sea as [home](island.md), sampling the actual gorge/shore
provider. The old crossing material is hidden and its outer rectangles are not created while this opt-in sea is active;
the normal page keeps them. The fixed late-morning atmosphere and metered AgX described with home water replace
the place sky/light cycle on this path; existing camera clip distances, fog range, terrain and material palette remain.
In this opt-in, swimming follows bounded asynchronous samples of those waves, and splash depth uses the registered
bed rather than the home island. Query-age limits, fallback and diagnostics are described with [home water](island.md).
The beach ball's existing home-island return bounds remain unchanged; this does not introduce a place ball toy.

With the opt-in, the terrain includes its real submerged triangles and receives wave-driven caustics plus swash wetness
through material patches, preserving the look's colour/normal nodes. Only built trestle legs register water contacts;
resetting/removing their solids removes the corresponding contacts. Their analytic foam/spray footprints do not rebake
the shore atlas and never treat bridge decks as seabed. Dry bank/deck surfaces remain dry receivers.

### Shore profile comparison

`?proto=place&water=new&shelf=demo` is a Local geometry-only A/B experiment. It copies the owner's measured Ultra
Water bearing-95 beach profile onto the east shore at world (1219.513, 8.505), oriented 95° clockwise from north.
The exact-profile strip is 70 m wide, blending to unchanged terrain by 110 m; cross-shore blending runs from
−30 to −10 m inland and +60 to +90 m offshore. Its offshore bar is intentional. The finished 2 m height grid supplies
the existing faceted mesh, heightfield collider, ground lookup and shore bake. Colour rules and water code are unchanged.
Without both `proto=place` and `shelf=demo`, the original heights are retained. This is a comparison, not a new shore default.
