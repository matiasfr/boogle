# World scale: do Boogle's proportions hold up?

*Research report, 7 November 2026. The owner asked whether the world's scale makes sense for the little guys, if not for
Buddy, given that the game is cartoonish and exaggerated, and whether the current greybox is good to move ahead with.
Numbers come from the code at `97914968` and from the running game; references come from web sources. Analysis only:
no game code was changed. The capture evals are throwaway look scripts that were not committed.*

**Markers.** **[V]** means the page or code was fetched and the point matches it. **[S]** means it was seen only in a
search summary, a fan wiki or a forum, so check it before relying on it. **[C]** means it was computed here. **BH** is
body heights: Buddy's body is 1.59 m (taken as 1.6) and a little guy is 0.96 m.

## TL;DR

**Yes: the proportions are reasonable, and the Sickle Isles greybox is good to move ahead with.** Three findings and three
numbers to change.

1. **Buddy-scale things are right.** Buddy's body is 1.6 m. Doors are 1.56 BH (2.5 m), at the top of the 1.25–1.56×
   band that engines and level-design references use. His jog is 3.5 BH/s and his sprint 5.9 BH/s, about Mario's
   roughly 6 BH/s. His jump is 1 BH, or 1.9 BH with the second jump. Village trees are 6–11 BH. Nothing needs changing for him.
2. **The village is built for Buddy, not for the little guys.** A cottage door is 2.6 times a little guy's height,
   about what a 4.4 m door would be for a person. The little guys read as toddlers living in grown-ups' houses.
   **Change:** give the four cottages (which nobody enters) a two-row door, 1.67 m, which is 1.7× a little guy. Make
   the little guys 1.1 m (0.69 BH, up 15%). Buildings Buddy walks into keep their doors.
3. **The greybox's big things are at real-world size**, and that is fine where it is: the White Wall is about as tall
   as the cliffs of Dover. The one place it fails at Buddy's size is **Canopy Town**. Its 150 m crowns stand 94 BH over
   his head, so from the ground the forest reads as a few thin poles on a bare plain (captures below). **Change:** keep
   a handful of 150 m "mother trees" as the skyline lure over the Wall, and make the town's walkable forest
   **50–70 m with crowns starting at 20–30 m**, three to five times as dense.
4. **The 0.5–2 km spacing is right for the train and is never walked.** A typical 1–1.2 km link is a 70–80 s ride
   (plus boarding), about the 61 s Wind Waker's boat takes to sail one sea square, and the train-to-jog ratio (3.6×) is
   close to Wind Waker's sail-to-walk ratio (3.2×). **Keep it.** Inside each island, keep Home's walk rule of
   45–85 m between points of interest.
5. **The skyline needs the greybox's fog.** The Wall is 1.9 km from spawn and High Port's crane 1.4 km. Under the live
   game's 1.5 km fog and camera far plane, the Wall does not draw from Home at all. **Change:** when the Sickle Isles
   go live, keep the far range at about 3.6 km for this map.

## 1. What we have, in metres

### Bodies and speeds

| Thing | Metres | Buddy (BH) | Little guy (BH) | Source |
| --- | --- | --- | --- | --- |
| Buddy, drawn body (`buddy_skin`) | 1.59; 1.72 with the carrying kit on his back | 1 | 1.7 | measured in game [C] |
| Buddy's face / follow camera | face 1.24–1.42 (eyes about 1.33); camera 2.5 up, 5.6 back, 62° | 0.83 | — | measured in game [C] |
| Buddy collider | 1.70 tall (two 0.45 m spheres, 0.8 m apart) | — | — | `makePlayerBody`, `constants.ts` |
| Little guy (townsfolk, residents) | 0.96 (two thirds head and hat) | 0.6 | 1 | measured in game; `folk.ts` says "about 0.95 m" |
| The Boogler | 0.54 body + 0.9 m hat | 0.34 | 0.56 | `game-design/boogler.md` |
| Jump, held | about 1.67 | 1.04 | 1.7 | 7.6 m/s at 18 m/s², apex float [C] |
| Jump plus the second jump | about 3.0 | 1.9 | 3.1 | 6.8 m/s second launch [C] |
| Buddy jog (the default) / sprint | 5.6 / 9.5 m/s | 3.5 / 5.9 BH/s | — | `entities/player/state.ts` |
| Rig blends: walk to / jog from / sprint from | 2 / 3.2 / 8.5 m/s | 1.25 / 2.0 / 5.3 BH/s | — | `buddy/rig.ts` |
| Little guy walk / run | 1.7 / 4.6 m/s | — | 1.8 / 4.8 BH/s | `folk.ts` |
| Track layer: lays / runs | 5 / 7 m/s | 3.1 / 4.4 BH/s | — | `layout.ts` `TUNE` |
| Handcart: alone / ridden | 9 / 13 m/s | 5.6 / 8.1 BH/s | — | `layout.ts` `CART`, `depot.ts` |
| Train | 20 m/s, 3.5 m/s² | 12.5 BH/s | — | `TUNE.cruise`; map JSON `ride` |

### Built things (production Place)

| Thing | Metres | Buddy (BH) | Little guy (BH) |
| --- | --- | --- | --- |
| Cottage door (four start cottages) | 1.5 wide × 2.5 tall, on a 0.5 m slab | 1.56 | 2.6 |
| Cottage eave / ridge / footprint | 3.0 / about 5.9 / 5.4 × 4.4 | 1.9 / 3.7 | 3.1 / 6.1 |
| Walk-in house door (`DOOR`, rooms) | 2.6 × about 2.7 | 1.7 | 2.8 |
| Hall door / stone-house door / shed door | 2.6 × 3.1 / 1.6 × 1.8 / 3.2 × 2.6 | 1.95 / 1.13 / 1.6 | 3.3 / 1.9 / 2.7 |
| Forge: walls / ridge / footprint / door | 4.6 / about 7 / 10 × 8 / 2.8 × 2.5 | 2.9 / 4.4 | 4.8 / 7.3 |
| Forge crane: mast / jib | 13 / 19 | 8.1 | 13.5 |
| Clock tower / keep | 19 + about 10 of roofs / 22 + 10 | about 18 / 20 | — |
| Station frame | 2.6 × 2.0, crossbar at 1.31, cheeks to 1.72 | 1.07 | 1.8 |
| Track gauge (rail centres) / sleepers | 1.0 / 2.3 × 0.42 every 1.2 m | 0.63 / 1.44 | 1.0 / 2.4 |
| Ordinary tree (size 0.8–1.5) | 10–18, 12.3 at size 1 | 6–11 | 10–19 |
| Forge oak / great tree | 13.5 / 26 | 8.4 / 16 | 14 / 27 |

The track's 1 m gauge is real-world metre gauge, and Buddy stands next to it at a person's height. The trees are
about 0.6 of a real mature oak, which keeps their crowns inside the follow camera's view.

### The greybox (Sickle Isles, `docs/world/map-prototypes.html`)

| Thing | Metres | Buddy (BH) | From spawn |
| --- | --- | --- | --- |
| White Wall islets (six) | 120 tall, about 500 × 130 each | 75 | 1.9 km, 3.5° tall [C] |
| Canopy Town's giant crowns | 150 | 94 | 1.9 km, crowns just over the Wall |
| High Port cliff / crane on it | 55 / 75 (top 130 above the sea) | 34 / 47 | 1.4 km, 5.1° [C] |
| Dock crane / warehouses | 28 / 12 tall, 34 × 18 | 17.5 / 7.5 | — |
| Basalt stacks (High Gorge) / Bell Rock pinnacle | 85 / 40 on 14 | 53 / 25 | 2.2 km / 1.2 km |
| Lantern Notch arch | 58 tall, 34 span | 36 | — |
| Mainland ridge / city towers | 220 / 55–110 | 138 / 34–69 | 3.6 km to the city |
| Islands | Home 730 × 595; Canopy 720 × 600; Port 720 × 480; Bell 240 × 190 | — | — |

| Leg | Length | Train (ride + 18 s accelerate/dwell, +20 s boarding) | Jog / sprint on foot |
| --- | --- | --- | --- |
| Home – timber camp (Line 1) | 170 m | 26 s | 30 / 18 s |
| Split-rock – pier | 554 m | 46 s | 99 / 58 s |
| Pier – Ring Island | 752 m | 56 s | 134 / 79 s |
| Saltpan – Port Quay / quay – High Port (lift) | 505 / 483 m | 43 / 42 s | 90 / 86 s |
| Home – Bell Rock (bay shortcut) | 1,210 m | 79 s | 216 / 127 s |
| Bell Rock – Canopy Town | 1,187 m | 77 s | 212 / 125 s |
| High Port – Canopy (White Wall line, south) | 1,740 m | 105 s | 311 / 183 s |
| Canopy – High Gorge (White Wall line, north) | 1,968 m | 116 s | 351 / 207 s |

Neighbouring places are 470–1,140 m apart, and every one of those links crosses sea.

## 2. Reference games

| Game | Hero | Doors and props | Speed | Travel and landmarks |
| --- | --- | --- | --- | --- |
| **Boogle** | 1.6 m (1.7 m collider) | Door 1.56 BH (Buddy), 2.6 (little guys) | 3.5 BH/s jog, 5.9 sprint | Train link 70–80 s ≈ 1.2 km; Wall 75 BH |
| Minecraft | 1.8 blocks (1 block = 1 m), eye height 1.62 [S] | Door 2 blocks = 1.1 BH [S] | 4.317 m/s walk = 2.4 BH/s; sprint 5.612 = 3.1 BH/s [S] | Measured in blocks; real-metre world |
| Unreal (template) | Capsule 192 cm [S]; Level Design Book table: 176 cm [V] | 220 cm door = 1.25 BH [V] | 600 cm/s default = 3.1 BH/s [S] | — |
| Unity (Level Design Book table) | 1.8 m [V] | 2.5 m door = 1.39 BH; hallway 2 m [V] | — | — |
| Quake / Half-Life / Source | 72 in [V] | 112 in door = 1.56 BH [V] | — | — |
| Real life (US) | 69 in [V] | 80 in door = 1.16 BH [V] | about 1.4 m/s walk | — |
| Super Mario Odyssey | Mario about half a New Donker's height [V] | Lamp posts about 5 Marios; bins about 1 Mario; doors sized for New Donkers, not Mario [V] | Top run about 5.9–6 BH/s ([third-person-platformer-movement.md](third-person-platformer-movement.md)) | Kingdoms are dense "sandboxes" ([level-design.md](level-design.md)) |
| Zelda: BotW / TotK | — | — | TotK run about 5 m/s, sprint about 8 m/s, community-measured [S] (about 2.9 / 4.7 BH if Link is about 1.7 m, an assumption) | Hyrule sized by overlaying Kyoto and timing the walk [V]; about 60–80 km², fan estimates [S] |
| Wind Waker | — | — | Walk 17 units/frame, sail 55: sail is 3.2× walk [V] | 7 × 7 sea, one island per square [S]; a square is 100,000 units and takes 61 s to sail [V] |
| Sea of Thieves | — | — | Sloop about 7.5–8 knots ≈ 4 m/s, community-timed [S] | About 74 islands; crossing estimates conflict [S] |
| Fortnite | Player height not documented | Build wall 512 × 384 cm, quarter wall 96 cm [V] | — | — |

Townscaper and Tiny Glade have no avatar, so they set no body scale. Human Fall Flat, A Hat in Time and Animal Crossing
had no reliable published metrics in what I found. Searches for door sizes, villager tiles and island walk times
returned fan estimates that contradict each other, so I left them out.

**What the references agree on:**

- **Doors run 1.25–1.56× the hero** in engine and level-design tables ([Level Design Book][ldb]). Real life is 1.16×. The
  oversize helps a chase camera and a capsule fit through. Buddy's 1.56× is at the band's top: right for a 1.7 m
  collider and a camera 5.6 m behind him.
- **"Game metres" are not real metres.** The [Level Design Book][ldb] says "don't follow real world scale": real
  proportions make levels feel too big and implausible, and games rely on an exaggerated sense of scale. It cites
  Skyrim, about half the size of Manhattan, which still feels vast. Build "at the player's scale", which need not be a
  human scale, and keep stylised metrics consistent inside one world.
- **Build for the people who live there.** In New Donk City the doors fit New Donkers and Mario is a visitor. Lake Lamode
  is the cautionary case: its doors fit Mario, not the Lochladies who live there, and the place reads as wrong
  ([Game Developer, "What Mario learned from Mickey Mouse", part 2][mario-metrics]). Boogle's village is the reverse
  case: it fits the visitor (Buddy), not the residents.
- **Walk speeds of about 2.5–6 BH/s.** Minecraft and Unreal's default sit at about 2.5–3 BH/s, and Mario at about 6.
  Buddy's 3.5 jog and 5.9 sprint are the lively end of that range, as a cartoon hero should be.
- **Travel is designed in time, not distance** (BotW's Kyoto timing; Wind Waker balanced ship speed against island
  spacing and loading, [level-design.md](level-design.md)). A sea crossing of about a minute between islands is the
  Wind Waker benchmark. Critics fault Wind Waker's longer empty crossings.

## 3. The judgement

**Landmark readability.** At the 62° camera and a 1,000-pixel-tall view, one degree is about 16 pixels [C]. A landmark
reads as a silhouette from about 2° (30 px) and feels towering from about 15°. The White Wall is 3.5° from spawn: a
long low band on the horizon (capture 2), which is correct for a far goal. It becomes towering within about 450 m,
which is where the Wall lines run. High Port's crane, at 5.1°, rising over the Wall-side horizon, is the right day-one
lure. **Keep 120 m and 75 m.**

**Canopy Town is where the scale breaks.** From Buddy's eye, the 150 m trees are bare dark poles. Their crowns are
above the frame unless you look straight up, and the forest floor is an empty plain (captures 4 and 5). The
crowns-over-the-Wall skyline is the design intent ([map-prototypes.md](../world/map-prototypes.md)), and it needs only
a few trees. **Split the forest:** keep three to five 150 m mother trees in the island's middle as the lure, and make
the walkable town forest 50–70 m tall (30–45 BH), with crowns from 20–30 m and trunks 3–5 m thick, three to five times
as dense. That continues the tree ladder, 13 m (ordinary) → 26 m (great tree) → about 60 m (Canopy) → 150 m (mother
trees), at roughly 2–2.5× a step.

**High Port is fine.** From the quay (capture 3), the 55 m sheer cliff fills the view and the 12 m warehouses read as
real port sheds, seven and a half Buddies tall. The crane lift exists because the cliff is not climbable. Dressing will need people-sized
things on the quay (bollards, crates, lamps of about 1–2 BH) so it doesn't read as an empty slab.

**The little guys.** Next to Buddy (capture 1) a little guy reaches his hip. The cottage door is more than twice his height
and the eaves are three times it. As the town's residents, they are under-scaled for their own houses. Two changes,
each one number:

- the four start cottages (`opening-plans.ts`, `case 'cottage'`): `door: { w: 1.5, rows: 2 }`, a door 1.67 m tall,
  1.7× a little guy and about Buddy's height. Buddy never enters a cottage, so nothing breaks.
- the little guys' scale: 1.1 m (×1.15). They still reach only Buddy's chest and stay clearly "little", and the
  cottage door becomes 1.5× their height, inside the reference band.

Walk-in buildings (house, shop, museum, forge, halls) keep Buddy-sized doors: those are the places the visitor uses.

**Speeds.** The ladder is jog 5.6 → sprint 9.5 → train 20 m/s, a clean 1 : 1.7 : 3.6. One oddity, which is not a
greybox matter: the handcart running alone (9 m/s) is slower than Buddy's sprint, so you can outrun it on the way to
the rack. Ridden it does 13, which is fine.

## 4. What to change

| Change | From | To | Why |
| --- | --- | --- | --- |
| Canopy walkable forest (`terrain` forest `h`) | 150 m everywhere | 50–70 m, crowns from 20–30 m, 3–5× as dense; 3–5 mother trees stay at 150 m | Reads as forest from the ground, and keeps the skyline lure |
| Start-cottage doors | 3 rows, 2.5 m | 2 rows, 1.67 m | Houses fit the people who live in them |
| Little guys | 0.96 m | about 1.1 m | Door at 1.5× their height; still half of Buddy |
| Far range when the Sickle Isles go live | 1.5 km fog and camera far | about 3.6 km for this map | Otherwise the Wall (1.9 km) never draws from Home |

## 5. What to keep

- Buddy's 1.6 m body, 1.56–1.7 BH doors on walk-in buildings, jog 3.5 and sprint 5.9 BH/s, and the 1 / 1.9 BH jumps.
- The 1 m gauge, 2.3 m sleepers and 1.7 m station frames: they are human-scale working kit that Buddy handles.
- The White Wall at 120 m, the High Port cliff at 55 m with its 75 m crane, the 85 m stacks, the 58 m arch and the
  220 m mainland ridge.
- The 0.5–2 km sea spacing and 20 m/s trains: links of about a minute, like a Wind Waker square, never walked.
- Inside islands, Home's walk rule: 45–85 m (8–15 s) between points of interest, something small every 15–30 m
  ([level-design.md](level-design.md)). An island of 700 m is two minutes across at a jog, so each town should cluster
  within about 150 m of its station.

## 6. Open questions for the owner

1. **Who are the cottages for?** *Recommended: the little guys.* Two-row doors on the four start cottages and the
   little guys at 1.1 m. Buddy-sized doors stay on the buildings he walks into. The alternative is to keep the cottages
   as they are and accept toddlers in grown-ups' houses as part of the joke.
2. **Split Canopy's forest into a few 150 m mother trees and a 50–70 m walkable forest?** *Recommended: yes*, in the
   greybox JSON before dressing. The alternative, all 150 m, keeps the skyline but leaves Canopy Town looking like a
   field of poles from the ground.
3. **Does the live game take the greybox's 3.6 km far range for the Sickle Isles?** *Recommended: yes for this map*,
   with the GPU cost measured on an iPad first. Without it, the Wall and the crane are only greybox views.

## Captures

All are at 1600 × 1000 on WebGPU, with no page or console errors; each still was opened and inspected. The lineup copies
real instances (a little guy, the forge's station frame and the forge oak) into one row in front of the first cottage,
beside a 6 m pole in 1 m red and white bands, so perspective does not distort the comparison. The greybox views are
from 1.45 m above Buddy's feet (about 0.1 m above his eyes) with the 62° camera and the greybox's 3.6 km fog.

1. [Lineup: little guy, Buddy, little guy, pole, cottage door, station frame, oak](world-scale/lineup.jpg)
2. [The White Wall from spawn (West landing)](world-scale/wall-from-spawn.jpg)
3. [High Port: the cliff, warehouses and dock crane from the quay](world-scale/high-port-quay.jpg)
4. [Canopy Town toward the cleft](world-scale/canopy-cleft.jpg)
5. [Canopy Town looking up: the 150 m crowns and the chalk islet](world-scale/canopy-up.jpg)

Not verified: how any of this feels in motion with the follow camera, iPad far-range cost, and the reference figures
marked [S].

## Sources

- [The Level Design Book, "Metrics"][ldb] [V]
- [Game Developer, "What Mario learned from Mickey Mouse, part 2: architecture and metrics"][mario-metrics] [V]
- [ZeldaSpeedRuns, Wind Waker movement mechanics](https://www.zeldaspeedruns.com/tww/general-knowledge/movement-mechanics) [V]
- [Epic, architectural modeling guidelines in UEFN](https://dev.epicgames.com/documentation/en-us/uefn/architectural-modeling-guidelines-in-unreal-editor-for-fortnite) [V]
- [Minecraft Wiki, Player](https://minecraft.wiki/w/Person) and [TrueCraft, entity movement](https://github.com/ddevault/TrueCraft/wiki/Entity-Movement-And-Physics) [S]
- [Unreal forums, default capsule and walk speed](https://forums.unrealengine.com/t/the-big-question-about-unreal-4-scale/2184/14) [S]
- [Zelda Wiki, The Wind Waker](https://zeldawiki.wiki/wiki/The_Legend_of_Zelda:_The_Wind_Waker), [Zelda Dungeon, the Great Sea](https://www.zeldadungeon.net/the-legend-of-zelda-the-wind-waker-an-ocean-of-missed-potential/) [S]
- [Sea of Thieves forum, ship speed](https://www.seaofthieves.com/forum/post/421495) and [map size](https://seaofthieves.com/forum/post/347306) [S]
- [TotK run-speed experiment](https://www.reddit.com/r/tearsofthekingdom/comments/16svd42/the_speed_of_link_tears_of_the_kingdom/) [S], via [botw-glide-target.md](botw-glide-target.md)
- BotW's Kyoto sizing and the Wind Waker interviews, via [level-design.md](level-design.md) [V there]

[ldb]: https://book.leveldesignbook.com/process/blockout/metrics
[mario-metrics]: https://www.gamedeveloper.com/design/what-mario-learned-from-mickey-mouse---part-2-architecture-and-metrics
