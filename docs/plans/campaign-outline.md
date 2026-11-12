> **Status: draft for the owner's review (11 November 2026); the seven owner decisions in [section 7](#7-owner-decisions)
> were answered on 12 November (UTC).** A proposal. Nothing else here is decided until he rules;
> the orchestrator then refreshes [direction.md](../direction.md) and the decision files. No code, no world positions.

# Campaign outline: from today to Alpha

**Goal.** One page that scopes the road from main at `439612f5d` (world v27) to an Alpha build of the whole game, so
the owner can rule on the area list, the cuts and the order (owner, 11 November: "I want you to scope the future beyond
the current tasks. What will bring us to an Alpha build of the complete game?"). It serves DESIGN.md's core loop
("The rail builds the world") and principle 8 (enjoyable alone and together). It bends nothing; the proposed cuts that
touch a decision are under [Owner decisions](#7-owner-decisions).

**How to read the labels.** **Decided** cites its entry. **Default** is my recommendation inside existing direction,
taken under "Pick and log" unless he objects. **New** needs his word. Story, characters and names are his
([decision, 11 November](../decisions-characters.md#d-2026-11-11-the-story-and-characters-are-the-owner-s)): every
option offered here is a placeholder for his pick.

**Research.** Uses the phase map and exit evidence in
[game-direction](../research/game-direction.md#proposed-phase-map-from-here-to-a-finished-boogle) (phases 2 to 4);
the Sickle Isles map and art-surface numbers in [map-prototypes](../world/map-prototypes.md); the area table, legs and
double-backs in [world-blockout](world-blockout.md); the six-hour pacing model in
[ring-and-economy](../brainstorms/ring-and-economy.md#six-hours-for-one-two-or-three). Departs from game-direction's
order in one place: the whole-route greybox comes before the target-quality pass is finished, because the owner asked
for the whole map blocked out first
([10 November](../decisions-rail.md#d-2026-11-10-block-out-the-whole-map-then)).

**Level findings.** None: this outline places nothing in the world. Each area's plan runs its own level check.

## 1. What Alpha means for Boogle

Decided frame: about six hours for one to three players, a rough target
([6 November](../decisions-core-loop.md#d-2026-11-06-roughly-six-hours-close-for-one)); it ends back on the original
island, meeting The Boogler ([Design Table](../decisions-core-loop.md#d-2026-11-02-the-call-on-the-design-table)); every
area is visited in one playthrough ([6 November](../decisions-rail.md#d-2026-11-06-ring-and-economy-answers)). The
roadmap's phase map defines Alpha as "every campaign-critical feature works end to end; placeholders allowed".

**The acceptance run (default).** Alpha is reached when all four pass on the live site, default URL, no flags, no
jump-in seeds, no debug skips:

| Run | What it proves |
| --- | --- |
| Solo, fresh room, wake to the ending, over at least three sittings with the room left empty between them and at least one deploy between sittings | One person can finish; the paused world and away credit behave; the save survives an update |
| Two or three players: one joins after Ring Island, one leaves while carrying and comes back after a server restart, all reach the ending | Drop-in, drop-out and rejoin at every area's state; shared progression and wallet |
| The bot, wake to the ending, plus `npm run loop -- run` for one to four players | The route is completable by the rules in every allowed order; timings per area |
| A device run per area on the Mac, on HOTBOX and on an iPad; a phone run recorded as best effort | Frame time reported against the 60 fps target ([owner call](../agents/owner-calls.md#frame-time-60)); nothing reads as broken |

| May be placeholder at Alpha | May not |
| --- | --- |
| Terrain and buildings as greybox massing past Ring Island; interiors as empty rooms (the walk-in rule still holds) | A missing gate, bill, ability, line, halt or the ending trigger |
| Folk, names and lines as marked drafts for the owner; no new Boogler lines | Any change to The Boogler's existing copy |
| Music as one or two states; ambience beds per area | A save lost to a deploy during the run; a rejoin that loses carried goods or progress |
| Cosmetics, station houses, train looks, the wardrobe's later slots | A point where a player cannot find the next goal (a P1 by the ranking rule) |
| Prices and bills as stand-ins tuned on the model | A stall a player feels as broken (seconds, not a slow frame) |

## 2. As built today

World v27 on main. Abilities live in the rules: axe, double jump, pack, hook, glider, breaker (`rail.axe`, `rail.jump`,
`rail.pack`, `rail.hook`, `rail.glide`, `rail.breaker`).

| Stretch | Measured (people) | Bot-timed (headless loop, a lower bound) | Model's allowance |
| --- | --- | --- | --- |
| Home: wake to the pier (lines 1 and 2, forge, hook, glider, boiler, trains) | 24.0 min, two players, v24, 10 November; a fresh pair reached Far Head in 13.3 min on 9 November | 17:28 solo, 13:07 for three, 12:37 for four | 36 min |
| Split-rock Works and the smallest Roundhouse: breaker to the last pier footing | 17.3 min, the same two players (before v25's request stops) | 8:28 solo, 9:11 for three | 36 min |
| Ring Island build 1: Q7, the bents, the Meet | None yet | 8:05 solo, 8:07 for three | 36 min, with build 2 |
| **Whole route, wake to the rivet** | **About 50 to 60 min, estimated**: 43.5 min measured to the last footing plus the Ring stretch | 34:01 solo straight-line, 40:09 calibrated; 29:12 and 32:51 for four | 108 min |

Sources: [playtests](../playtests.md) (10 November, wake 05:19:00 to the last footing 06:02:32 UTC; 9 November co-op);
`npm run loop -- run` on this branch (it walks straight lines at 5.6 m/s, never rides and has no regrowth); the
allowances are [world-blockout](world-blockout.md#areas)'s, from the economy model.

**Share of six hours: about 15% (estimated), against the model's 30% for the same three areas.** The built route
plays at roughly half its allowance for experienced players. No fresh player has played the whole route, so the
first-time figure is unknown. This is the outline's largest open number (decision 2).

## Whole-route lower bound (stand-ins)

Step 1 of [section 5](#5-order-of-work), run on 11 November at `7d51689d0` (world v27): `npm run loop -- run`. Areas
1 to 3 are played through the real rules, as in section 2. Areas 4 to 9 are **stand-ins**
(`dev/loop/standins.ts`, each flagged `standIn: true`): a bill, the area's legs and a gate, nothing else, and they are
modelled, not played. It uses this outline's defaults (both branch areas, High Gorge first, fixed order); the
alternatives are flags (`--branch-first canopy`, `--one-branch`, `--bills 1.5`).

| # | Area | Basis | Bill units | New track | 1 player | 2 players | 3 players | Model's allowance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Home | Bot-timed (built) | | | 17 | 14 | 13 | 36 |
| 2 | Split-rock Works | Bot-timed (built) | | | 8 | 9 | 9 | 36 |
| 3 | Ring Island, build 1 | Bot-timed (built) | | | 8 | 8 | 8 | 36 |
| 4 | High Gorge | Modelled | 160 | 1.70 km | 25 | 23 | 23 | 72 |
| 5 | Bell Rock and the bay shortcut | Modelled | 154 | 2.38 km | 27 | 25 | 25 | 30 |
| 6 | Canopy Town | Modelled | 156 | 1.20 km | 21 | 19 | 19 | 42 |
| 7 | Sea cave, Saltpan, High Port | Modelled | 270 | 1.68 km | 41 | 37 | 37 | 48 |
| 8 | The White Wall line | Modelled | 252 | 3.82 km | 35 | 32 | 32 | 48 |
| 9 | Lantern Notch, the causeway, the Original Island | Modelled | 25 | 1.63 km | 7 | 7 | 7 | 18 |
| | **Whole route, minutes** | | 1,017 | 12.4 km | **191** | **173** | **175** | 366 |
| | **Hours, and share of the six-hour target** | | | | **3:11 (53%)** | **2:53 (48%)** | **2:55 (49%)** | 6:06 |

**Measured:** rows 1 to 3 only, and by a bot: straight-line walking at 5.6 m/s, no rides, every press right first
time. Nothing here is a person's time. **Modelled:** rows 4 to 9. Each bill is the main-route bill the economy model
charges that area's steps (`ring-sim.ts`), so it is the bill the allowance was sized on, not a designed one. Each unit
costs what a unit cost the bot on the built route at that player count: 21.6 s a footing solo (one per back, cast by
the kiln, brought by the wagon) and 2.9 s for any other unit (the rest of the built run spread over its logs, stone
and rails). New materials (steel, copper, fibre, crystal) are charged as ordinary units. Legs are the generated line
catalog's lengths (`src/sickle/world-lines.ts`), ridden out and back once per model step at 20 m/s.

| Sensitivity (whole route, h:mm) | 1 player | 2 players | 3 players |
| --- | --- | --- | --- |
| As above | 3:11 | 2:53 | 2:55 |
| Walking at the human detours measured so far (`dev/loop/detour.json`) | 3:28 | 3:09 | 3:06 |
| Canopy Town first, both areas (adds the bay trestle) | 3:18 | 3:00 | 3:01 |
| One branch only: High Gorge (the ending's glide loses its key) | 2:50 | 2:34 | 2:35 |
| One branch only: Canopy Town (the sea cave loses its key) | 2:52 | 2:36 | 2:37 |
| Every stand-in bill 1.5 times larger | 4:11 | 3:46 | 3:48 |
| Floor: footings carried in packs like logs, as the economy model reads them | 2:00 | 1:53 | 1:51 |

**The range: 1.9 to 3.5 hours for one to three players as a bot plays it; 3.8 to 4.2 with bills half again as large.**
One assumption carries most of it: the 228 footings on the stand-in bills, at the built rate, are 82 of the 157
modelled minutes solo.

**What this cannot tell.** Puzzles, discovery, looking for the next goal, first-time confusion, falls and retries,
the ending, and any new verb (the lift, salt sliding, the lap): the stand-ins hold none. The economy model budgets
160 of its 258 minutes for areas 4 to 9 as that authored play, and all of it is absent here. It also leaves out Ring
Island build 2, town growth and Boogle goals, the five double-backs, waiting for trains beyond the 25 s of dwell and boarding each ride already counts, and the rides between areas.
People are slower than the bot: the one measured pair took 43.5 minutes to the last pier footing, where two bots take
22:40, so 1.9 times. If that held for the whole route (an extrapolation from one session on a third of the game), two
experienced players would take about 5.5 hours, and 3.6 at the floor.

**What it suggests for decision 2 (a recommendation; the decision text is unchanged).** Risk 1's sign is met: the
rough route reads under four hours solo. The recommended answer still fits, and the numbers say where to spend it.

- The gap for a bot is about three hours, and for experienced people perhaps half an hour to two and a half. That
  is no more than the authored play the model already assumed (160 minutes), so puzzles and discovery in the small
  areas can fill it without larger bills. Bills do work as a lever (half again as large adds an hour), but about two
  thirds of that hour would be footing carries, the grind he is wary of.
- Friends barely shorten it (2:53 against 3:11), because the kiln and the wagon set the pace of footings, not hands.
  That keeps one to three players close, as the six-hour entry asks.
- Two areas are out of proportion to their allowance: Bell Rock's bill is as large as High Gorge's for under half
  the allowance (27 modelled minutes against 30, so no room for anything else), and the ending is 7 against 18. Bell
  Rock's bill is the first to cut or move.
- Cutting a branch saves about 20 minutes of a bot's time, not the 40 to 70 in decision 1, and loses a gate.
- The footing rule for areas 4 to 9 (one per back or packed) is worth an hour and more. It should be decided on the
  greybox's first leg, before any bill is designed.

## 3. The finite area list

**Decided:** the Sickle Isles map ([6 and 7 November](../world/map-prototypes.md#owner-decisions-after-the-greybox-7-november));
the Original Island is the classic island, reached last by a lantern causeway from Bell Rock; materials replace eras;
big areas unlock a component that upgrades several systems and smaller areas carry puzzles, abilities and discovery
([5 November](../decisions-core-loop.md#d-2026-11-05-progression-direction)); a far island is first reached by building
the line over the sea ([2 November](../decisions-core-loop.md#d-2026-11-02-first-reaching-a-far-island)); every building
can be walked into ([10 November](../decisions-core-loop.md#d-2026-11-10-every-building-can-be-walked-into)). The order
below (High Port after both branches) is an open agent call ([agent-calls](../agent-calls.md), world-blockout conflict 7).
**Everything in areas 4 to 9 beyond its name and place on the map is a proposal** from the briefs.

Size is relative to one unit, U, the cost of Split-rock Works (section 6): S about half, M one, L two to three.

| # | Area | Player outcome | Unlocks, and the systems it upgrades | New verb or contrast | First reached by | Target (model) | Exists | Size |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Home** | You wake a machine, lay two lines and start trains | Logs, stone, rails; axe, double jump, pack, hook, glider | Chop, haul, lay; drag the beam | The arrival | 36 min | Built; town growth from cargo is not (slice 5) | Done |
| 2 | **Split-rock Works** and the Roundhouse | You cast footings and start a line over the sea | Footings: the pier, the crossing's bents, the wagon | Strike seams; carry heavy, alone or helped | Line 2's quarry halt | 36 min | Built (v22 to v25) | Done (1 U) |
| 3 | **Ring Island** | The line meets the islanders' half; you bring steel home | Steel: the longer boiler (20 to 25 m/s, one more car), the bigger cradle, the first real garage install | The Meet: glide the gap, brace, rivet; then thread the ring | Building the crossing | 36 min | Build 1 on main bar R5b and R6; build 2 (steel works, boiler fit, the saddle) not built | Build 2: M |
| 4 | **High Gorge** | You climb a split sea stack and wire it with copper | Copper: powered pick (harvest rate, breaks plugs), hook reel (longer pulls), the station lift | Vertical play: hook up, mine, ride a lift | The stack line from Ring Island's halt, 1.7 km | 72 min as first branch | Map, blockout massing, a line catalog entry; station concept (agent call) | L |
| 5 | **Bell Rock** and the bay shortcut | You close the first loop: Home is a minute away | The shortcut (rides fall from 5.2 to 2.9 min); crystal seeds, by hand | A junction on two levels; the first ride that passes Home | The stack incline down from the Gorge | 30 min | Map, blockout, catalog | M |
| 6 | **Canopy Town** | You reach the forest town behind the Wall | Fibre: carry sling (back capacity), glider cloth (glide speed), seat bills | Carry more, glide further; a town in trees | The bay line from Bell Rock, 1.2 km | 42 min as second branch | Map, blockout, catalog | L |
| 7 | **Sea cave, Saltpan, High Port** | You break the plug you saw on day one and build the port | Town services, the harbour crane, the faster engine; a four-material refit | The big double-back; salt-flat sliding; a harbour | The cave line from Home's West landing | 48 min | Map, blockout, catalog | L, the largest |
| 8 | **The White Wall line** | The ring closes and trains lap the whole map | Crystal collars for the one deep span; the lap; the service train as express | One exceptional crossing; the first full lap, through Ring Island's ring | From High Port north over six chalk islets, 3.8 km | 48 min | Map, blockout (one islet kit), catalog | M to L |
| 9 | **Lantern Notch, the causeway, the Original Island** | You light the lantern, ride to The Boogler's island and meet him | The ending; the world stays open after ([decided](../decisions-core-loop.md#d-undated-after-the-finale)) | A long glide to the arch; the last ride | The Notch line, then the causeway from Bell Rock, 0.75 km | 18 min | Classic island geometry (`src/island`); map, blockout, catalog; no ending flow | M |

Targets sum to 366 minutes (6.1 h); they are the model's allowances, not measurements.

### High Gorge and Canopy Town, side by side

[docs/world/README.md](../world/README.md) still describes the two as substitutes ("High Gorge **or** Canopy Town").
The map the owner chose later visits both, with a choice of order at Ring Island, and his 6 November answer is that
every area is visited. So the live question is the order choice, not which area exists.

| | High Gorge | Canopy Town |
| --- | --- | --- |
| Land | Two basalt stacks, 370 × 300 m each, 85 m tall, a 90 m split | A 720 × 600 m forest isle at 12 m, mother trees to 150 m |
| Gives | Copper; powered pick; hook reel | Fibre; carry sling; glider cloth |
| Changes the play by | Height and machines: builds on the hook and the breaker | Range and load: builds on the glider, just used at the Meet |
| Later locks it opens | The sea cave at Home (seen from spawn), the route's main double-back | The glide from Canopy's ledge to the Notch, the ending's approach |
| If first, the rail built | Stack line 1.7 km, then the incline to Bell Rock 1.16 km | Bay trestle 1.43 km (built in this order only), then Bell Rock to Canopy 1.2 km |
| Hard parts | The halt is at 3 m and the town at 85 m (a stair always, a lift from copper) | The largest walkable footprint; the line enters through a 70 m cleft in the Wall |
| If cut | The sea cave and High Port lose their key; the Port's bill loses a material | The ending loses its glide and its ledge; seats lose fibre |

**Recommendation (new): build both, High Gorge first, as one fixed order through the greybox and Alpha.** It gives the
biggest contrast after a glide-heavy Ring Island, puts the day-one lock's key in hand earliest, and places glider cloth
next to the glide that uses it. It cuts the bay trestle (1.43 km of single-use track), the second service plan, the
second branch's either-material bills and one whole bot route and acceptance run: about half a unit of build and a
quarter of the proving. The order choice stays in the data (`src/sickle/world-lines.ts` already carries both stage
numbers) and can return for Beta if he wants it. This bends "your choice of order"
([2 November](../decisions-core-loop.md#d-2026-11-02-the-network)), so it is decision 1. Cutting either area outright
is not recommended: each holds a key the route needs.

### Proposed cuts

| # | Cut for Alpha | Saves | Status |
| --- | --- | --- | --- |
| 1 | The order choice at Ring Island (fixed Gorge first) | About 0.5 U and one acceptance route | New (decision 1) |
| 2 | The mainland stays a backdrop, never walked | A whole extra L area | New (decision 4): two entries disagree |
| 3 | The end-game tier of goals after the ending (5.8 h in the model) | The economy's second half; the world still stays open | Default; say if you object |
| 4 | Double-backs: keep three (the sea cave, the first branch's hidden section, the train through the ring), move the Closest Pew and Split-rock's upper seam to Beta | Two set pieces, about 0.5 U | New (decision 7) |
| 5 | Ability upgrades: one per ability (hook reel, glider cloth), no ladders; no bombs (the breaker is the wall tool) | Two or three abilities and their gates | New (decision 7) |
| 6 | The express as the service train with a headboard only; the bought passenger set waits | A train set, a bay and its bills | Default: it is stage one of the [decided](../decisions-rail.md#current-rules) express |
| 7 | Saltpan is a halt with one verb, not an area with a town | About 0.5 U | Default |
| 8 | Mini-games, opening days, Som and knacks, the dino and guest, day and night with a purpose, rarity boxes | Unbounded | Already parked by decision; listed so Alpha's scope is closed |

### Story and character placeholders (the owner's pick; none decided)

| Where the route needs one | Option A | Option B | Option C |
| --- | --- | --- | --- |
| High Gorge's folk | Lift operators who have never been to the top and are fine with that | Two stacks that have not spoken since the split, with one shared clothesline | Echo collectors who rate your shout out of ten |
| Canopy Town's folk | Everyone lives one branch higher than they can afford | A town run by its laundry rota | Tree surgeons who ask the tree first and wait for an answer |
| High Port's folk | A harbourmaster with no boats who logs every wave | Dockers on a strike nobody remembers starting | Customs officers who only inspect hats |
| The meeting on the Original Island | He has been waiting to cut a ribbon and has lost the scissors | The railway turns out to be his franchise, and you were the contractors (the frame parked in [ideas](../ideas.md)) | He does not remember inviting you and tries to sell you a ticket home |

Ring Island's shard religion and its folk are already drafted for him
([10 November](../decisions-rail.md#d-2026-11-10-ring-island-the-meet-the-shard)). No option above writes a Boogler line.

## 4. Campaign-critical systems

| System | Status on main (checked in code) | Decided | Smallest first build |
| --- | --- | --- | --- |
| Roundhouse, garage and upgrades | The smallest Roundhouse is in the rules (v22). The train garage's first build is view only: `garage-state.ts` says "nothing here is sent, saved or read by the simulation"; no install op exists | The works copy, Install as a one-second hold, the longer boiler free as the first steel install ([10 November](../decisions-core-loop.md#d-2026-11-10-the-train-garage-a-works-copy)) | One install op for the longer boiler in Ring Island build 2; trains take it at their next Home stop |
| Economy and town growth on the server (production-core slice 5) | Not built. `town-facts.ts` keeps `town` and `stone` false "until production-core slice 5 brings train cargo". No fares, wallet or Boogles in `src/sim` | Fares only, shared strongbox, houses bought on plots, first buy a 300-Boogle house ([rewards rules](../decisions-rewards.md#current-rules)); model and 2D page first | Train cargo grows the Village on the server; then the wallet as integers and one plot buy |
| Paused world and away credit | Built: `railway-away.ts`, `railway-sys-away.ts`, a 30 s pause grace, H of 2 hours, host tests. Not checked here: the forge and depot inside the credit | [6 November](../decisions-rail.md#d-2026-11-06-ring-and-economy-answers) | Each new producer joins the credit in its own area's plan; one empty-room proof per area |
| The ability set and its gates | Six live (section 2). Not built: powered pick, hook reel, carry sling, glider cloth, crystal collars. Co-op ability grants (option E, approved 6 November) are queued, not built | Abilities are unlocks that open paths; each gets iterative upgrades | Each arrives with its area; option E's flourish lands with the powered pick, the first new one |
| The ending and the return | Nothing. The classic island exists as geometry only | Ends on the original island with The Boogler; the world stays open | The causeway as a generic server line, an arrival fact, one shared moment and a thanks card; in the greybox first |
| Onboarding and the first evening | The arrival card, the cart intro, Sleeves, acts derived from progress. [first-evening](../brainstorms/first-evening.md) is proposed and unanswered | Late-arrival onboarding is not a milestone (DESIGN 8) | One watched fresh-player session on the built route; fix only what stops them |
| Drop-in, drop-out and rejoin | Server-hosted rooms, reconnect scenarios, a restart mid-Works survived in play (10 November) | DESIGN 8: must stay reliable | One join, leave and rejoin proof per area, at its checkpoint |
| Saves that survive updates | None: the world is at v27 and every bump wipes, by decision | "A world wipe is a new save... in the future we can change this once the game is in a more complete phase" ([8 November](../decisions-process.md#d-2026-11-08-a-world-wipe-is-a-new)) | See below |
| Audio minimum | Buses (music, ambience, sfx and five more), locomotion and machine sounds. Music content not verified. Firefox throws once a session from the audio | Procedural sound and music | Per area: one ambience bed and its verb's sounds; two music states (arrival, ending) |
| Phone tier and 60 fps | A detail ladder with a governor; remote device runs. A 27 s freeze on an iPhone at Far Head (9 November); frame time unmeasured for 11 November's perf changes | Lowest target an M4 iPad Pro; phones best effort; frame time is the measure; numbers guide and do not gate ([owner call](../agents/owner-calls.md#performance-guides-not-gates)) | A device run at each area's greybox; the streaming rule below; the pass when he calls it |
| World streaming | Far ground chunked; Ring Island tiled. One coast texture cannot cover islands past Ring Island (world-blockout conflict 9) | Chunk, cull and stream after the migration ([10 November](../decisions-process.md#current-rules)) | "One island resident at a time" (map-prototypes question 3, unanswered): default yes, proved at High Gorge |

**Saves.** A six-hour campaign is played over several evenings, and main deploys many times a day. The acceptance run
cannot pass while a bump wipes the room. The migration path has to exist **before the first multi-sitting run, so at
the start of the Alpha phase**, not before: until then jump-in seeds (`playthrough --from`) stand in for a save and the
standing "wipe at will" call keeps iteration fast. What it needs: additive changes to the railway's saved snapshot by
default, a versioned migration step for the rest, and personal things (wardrobe, claims) kept outside the world
version. This reverses a standing call at its own stated trigger, so it is decision 5.

## 5. Order of work

| Phase | Enters when | Work | Exit evidence |
| --- | --- | --- | --- |
| **A. Close what is open** | Now | Ring Island build 1 (R5b, R6); the migration (M13e to g) | The bot plays wake to the island halt on main; `src/proto/place` is gone |
| **B. The whole route, rough** | A done | Every future line becomes a real server line from the generic-line components with stand-in bills; each area a walkable massing with one stand-in gate for its ability; the causeway and an ending fact; the loop graph and the bot extended to the ending | `npm run loop -- run` and the bot reach the ending with no skips; a table of minutes per area for one to three players against six hours; the owner rides it once. This is the proof of length and pacing before art |
| **Q. The target-quality session** (alongside B) | Ring Island build 2 playable | One full session on Home, the Works and Ring Island at the quality he accepts, watched with a fresh player | His verdict on experience and quality; a first-time duration for the built route; the cost of a second area (already measured: section 6) |
| **C. Areas to depth, one at a time** | B's table accepted, cuts ruled | Areas 4 to 9 in route order, each: brainstorm, 2D page, rules, views, bot segment, device run. Systems land with the area that first needs them | Per area: the bot segment, a join and rejoin proof, measured minutes; the remaining areas still fit the rate |
| **D. Alpha** | Area 9 playable | The save path; the four acceptance runs; P1 fixes only | Section 1's runs pass; the owner freezes or cuts remaining features |

**Two machines, about three agents each.** The Mac judges anything seen; HOTBOX takes rules, server and tests.

| Phase | Mac | HOTBOX |
| --- | --- | --- |
| A | Ring Island views and looks; the R6 docs | M13e to g; the full eval sweep; the frame-time pass |
| B | Walkable massing and gates per area; the route's looks | Server lines and stand-in bills; the loop graph and bot to the ending |
| Q, with B | The fresh-player session and its fixes; Ring Island build 2's views | Build 2's rules and the first install op; slice 5 (cargo to town growth) |
| C | The current area's terrain, views and station; the next area's brainstorm and 2D page | The current area's rules and bot segment; the system that area needs; streaming |
| D | Device runs; readability fixes | The save path; the acceptance scenarios |

**The first three steps after Ring Island build 1 and the migration close:**

1. **Extend the loop graph to the ending with stand-in nodes** (`dev/loop/graph.ts`; areas 4 to 9 with allowance-sized
   bills and the legs' real lengths) and run it. A day's work that gives the first whole-campaign lower bound and tells
   decision 2 how short the route really is, before any line is built. **Done, 11 November:**
   [Whole-route lower bound](#whole-route-lower-bound-stand-ins).
2. **Ring Island build 2**, with the first real install: the steel works, the longer boiler through the garage, the
   train through the ring. It closes the first "big area unlocks a component" loop end to end and makes the garage real.
3. **The greybox route's plan and first leg**: the stack line to High Gorge as a server line with a stand-in bill,
   while `/brainstorm --panel` runs on High Gorge (a big new area, so the owner call asks for it) and slice 5 starts
   on HOTBOX.

## 6. Sizing

**The basis, measured from `git log origin/main`** (counts are by keyword on merge titles, so approximate):

| Area | Elapsed | Merged PRs | Commits | Play it added |
| --- | --- | --- | --- | --- |
| Split-rock Works and the Roundhouse (J1 to J5, signposting, the late game) | About 2.5 days, 8 to 10 November; first playable in about one | About 25 | About 100 | 17.3 min measured |
| Ring Island build 1 (R1 to R5 part 1), unfinished | About 2 days so far, 10 to 11 November | About 40 | About 130 | 8 min, bot lower bound |

Main took 131 to 136 PRs a day on 9 to 11 November, so each area used a tenth to a sixth of the studio's merges while
the migration, Home's station, water and tooling ran beside it. One unit, U, is about 2.5 elapsed days for a
medium area.

**Applied.** Remaining areas: 13 U (Ring build 2 at 1, Gorge 2.5, Bell Rock 1, Canopy 2.5, the Port 3, the Wall 1.5,
the ending 1.5). Systems: about 8 U (garage 1, economy 2, saves 1, audio 1, streaming and the perf pass 2, onboarding
and rejoin proofs 1). The greybox route: about 3 U. That is 24 U, or 60 lane-days; two lanes halve it to about 30.

**The range: roughly 5 to 14 weeks of days like 9 to 11 November** (both machines, the owner answering the same day).
The low end assumes units run two abreast and large areas cost what the sizes say. The high end assumes large areas
cost half again as much, which nothing yet contradicts, and that rulings and reviews keep areas mostly serial.

**How weak this is.** Two samples, both medium, both beside Home on line 2's kit, neither with a town of walk-in
buildings, new island terrain, a new material's producers or streaming. No large area has been built. The minutes are
experienced players'. Elapsed days were set as much by his answers and by reviews as by building. Usage limits and a
new model can move the rate either way. Phase B replaces this estimate with a measured one; do not plan against a date
before then.

## Towns at the hubs

**Proposal (designer, 12 November 2026).** Decided
([12 November](../decisions-rewards.md#d-2026-11-12-hub-towns-grow-and-receive-freight)): the larger hubs each have a
town that grows and receives freight like the Village; other areas are sources. The rest is logged in
[agent-calls](../agent-calls.md) and builds proceed on it. Nothing is placed: each hub's plan runs its level check.

**What this outline and the greybox plan had dropped.** Two records already describe the hubs: the
[10 November decision](../decisions-rail.md#d-2026-11-10-big-junctions-are-designed-stations-not) (six designed
stations; rotundas with the upgrade screen at Home and Port Quay; an engine shed where a line never reaches Home) with
[junction-stations](../brainstorms/junction-stations.md), and [town-layout](town-layout.md)'s "pattern for other
towns". The trade model (`dev/economy/trade-data.ts`) already plays five towns; the rules have one
(`TRADE_TOWNS = 1`). **Where the map and the owner's memory differ:** the rail map's data (`dev/level/rail-map.ts`)
draws a Roundhouse at Home only; Port Quay's rotunda and the sheds are decided but not drawn, and join the map data
with each hub's plan.

### 1. Which places have a town

| Place | Kind | Reason |
| --- | --- | --- |
| **Home (the Village)** | Town, built | The starter town; the Round, eight plots, the first rotunda |
| **Ring Island** | Town | A designed station with folk and the Ringworks; in the trade model; town-layout draws it as a crescent facing the shard |
| **High Gorge** | Town | A large area and a junction; a street across the bridge or a terrace on the lip |
| **Canopy Town** | Town | A large area and a junction; platforms round a trunk |
| **Port Quay** (with High Port above) | Town | The largest area; a one-sided quay street and the second rotunda |
| Bell Rock, West landing | Station, no town (Bell Rock: now the market, [below](#the-market-hub-bell-rock)) | A skerry on two levels; Home's second front. Town-layout: "stations, not towns" |
| Camp, Quarry, Saltpan, the Wall's islets, Lantern Notch | Source or halt | One reason to stop; no building. The Original Island is the ending |

All five towns stand on the ring (line 2 grown: Village, Quarry, Far Head, Ring Island, High Gorge, Canopy Town, Port
Quay, Saltpan, West landing), so one line can feed every town with no transfer.

### 2. What each town receives, grows into and gives

**The Village's rules are the shape for all (Decided,
[11 November](../decisions-rewards.md#d-2026-11-11-boogles-the-five-open-questions-answered)):** a town arrives with
its station and two buildings; later houses are bought on plots deliveries stake, each double the last; one wallet.
**Default:** three priced plots a hub town at Alpha, at the trade model's prices; a buy is the hold at the plot's
board on the one wallet (no second strongbox or ticket window).

| Town | Receives by train, from | First freight arrives | Its own shape (each needs its brief) |
| --- | --- | --- | --- |
| The Village | Timber (Camp, line 1); stone (Quarry); later steel (Ringworks, homeward), for plots 4 to 8 | As built (R1, R2) | The Round |
| Ring Island | Stone (Quarry, outward); copper (the Gorge, homeward) | With slice 5 on today's line; copper at stage 3 | Crescent facing the shard |
| High Gorge | Steel (Ringworks, outward); fibre (Canopy, homeward) | The leg's first train; fibre at stage 7 | Street on the bridge or lip terrace |
| Canopy Town | Copper (the Gorge, outward) | **Stage 7 only** (finding 1) | Platforms round a trunk |
| Port Quay | Salt (Saltpan, on the cave line); fibre (Canopy, outward) | The cave leg's first train; fibre at stage 7 | Quay street, the rotunda |

Goods are counters that stake plots, never carried. Salt is a placeholder name. Bell Rock's seeds stay by hand.

- **New: a hub town's first plot is staked when its station opens**, by the first train in, with no goods; later
  plots need the goods above. That is the first meeting: you step off, and the stakes and board are on your way.
- **New: what growing a hub town gives.** More riders and so more fares, and longer rides between towns pay more
  (decided mechanism); a building to walk into with one character (roles and lines are the owner's); and the town's
  board offers the source upgrades of the yards that feed it
  ([decided](../decisions-rewards.md#d-2026-11-10-boogles-build-houses-and-upgrade-sources) that Boogles buy them).
  Nothing on the route gains a Boogle price, so a solo room that ignores every town still finishes; a friend who
  joins late sees the same stakes and houses.

### 3. How freight picks its town

Options: the nearest town on its line; a fixed destination per yard; routing the player sets. **Recommended (New): a
fixed destination per yard row, in data, authored as "the next town along its own line the way the train is
going".** It is the code's shape already (`TradeYard.home`). A source between two towns is two rows, one each way,
each with its own stock, so towns never compete for a crate. Freight never changes line and nobody chooses: "no
routing or quotas" (DESIGN) holds, which rules out player routing; a computed "nearest" adds a rule to explain.
**Default:** a freight stop follows R2b's rule (a middle halt only when a whole trainload waits; never a train on a
build errand), so waits stay inside R2b's gate of 108 ticks a leg.

### 4. Notes for the other plans (pointers only; neither plan is rewritten here)

**[greybox-route](greybox-route.md): a stand-in town per hub leg (New).** Legs 1 (High Gorge), 3 (Canopy Town) and 4
(Port Quay), and Ring Island with slice 5. The minimum, an eleventh tick on those legs' checklist:

- a `Town` row and section 2's yard rows, unloading at the hub's halt; a source-only place gets a yard marker only;
- a flat pad within 60 m of the platform (about 11 s on foot), on the way to the area's pickup, with two box
  buildings (no interior, no folk), three sets of stakes and one board;
- plot 1 staked by the leg's first train (the bot asserts it); the buy works once slice 5's R4 is on main.

**[slice5-town-economy](slice5-town-economy.md): what R2b, R3, R4 and the views must not hard-wire to one town.**

- R2b: a yard row names its town and direction (never town 0 inferred from `home`); unloading must work at a through
  halt. To prove: the Quarry's outward stop needs its up platform.
- R3: `routes`, the waiting counts, `boarded` and `alighted` are per town; `tillRate`, `boxCap` and `sackCap` scan
  every town; the `Till` stays one (decided). At bump B, make `Town.wood` and `Town.stone` two counters whose meaning
  comes from the town's `TRADE` row.
- R4: `Plot.slot = town × 16 + k` and `plotPrice(town, k)` are already per town; keep them so. The facts `town` and
  `stone` stay the Village's. V1 to V3 read plot sites and the board from a per-town table.

### 5. Cost, and the modelled route time

Estimates in section 6's units, none measured: 0.5 U to take slice 5's rules from one town to five, 0.5 U for four
stand-in towns, and 0.5 U a hub town at depth (a centre, three walk-in houses, the board), 2 U. **About 3 U on 24, so
27 U; the range of 5 to 14 weeks becomes roughly 6 to 16.** The main route's time does not change: no bill, gate or
wait depends on a town and freight stops stay inside R2b's gate, so a three-hour rush stands. For a player who
engages, my estimate is 15 to 25 minutes over four hub towns, inside the four-to-five-hour target; not modelled.

### The market hub: Bell Rock

**Direction (owner, [12 November](../decisions-rewards.md#d-2026-11-12-a-market-hub-in-the-middle)), hedged:** "maybe"
the final hub unlocked is in the middle of the ring, built out "as like a market hub", "a good junction ultimately";
when it opens is open. This replaces Bell Rock's row in section 1: it is the sixth hub that is built out.

**The place.** Bell Rock (halts at about −50, −850 m) is the only junction inside the ring: the north–south line at
the water, the bay line on the skerry at 15 m, the round stair tower between. The Original Island is also inside and
nearer the middle (about −6, −135 m), but it is a loop terminus and the ending. **A limit to know:** Gorge first,
only two lines meet at Bell Rock. The ring never touches it, so "every line meets there" is true of the bay and
north–south lines and, through them, of Home, High Gorge, Canopy Town and the Original Island.

**What a market hub is here (New).**

- **It grows by connection, not by plots.** One stall for each place whose line reaches Bell Rock, put up by the
  little guys when the first train from that place arrives: no stakes, no price, no thresholds. This is the thing
  that grows because a train came, beside towns that grow because the room paid.
- **It receives a little of what each of those lines carries.** A stall shows its place's crates. Reachable goods,
  Gorge first: copper (north–south line), fibre (bay line), timber and stone (the bay line from West landing). Steel
  and salt do not reach it without a change of line; their stalls wait for a later brief or stay absent.
- **What is bought there:** the wallet's network buys, in one place and in view: source upgrades for any connected
  source and station fit-outs. Houses stay at each town's own plots. It never sells materials or turns goods into
  Boogles ("materials and Boogles never convert", decided), and Fine Prices stays free.
- **What is traded there is riders.** Most town-to-town trips change at Bell Rock, so its platforms are the busiest
  and its fare trays the fullest; it is also where two or three players meet again after splitting up.

**The two timings.**

| | (a) Opened last, as the final hub | (b) A bare junction early, built out as each line arrives |
| --- | --- | --- |
| Route order | Unchanged only if "opened" means built out at stage 7 or 8. Reaching it last would move the incline and the bay shortcut after the Wall, undoing the answered fixed order and area 5's first loop | Unchanged |
| Greybox | Leg 2 first touches Bell Rock, as planned; nothing added until leg 6 | Leg 2 first touches it and puts up two stall markers (the Gorge's, Home's); leg 3 adds Canopy's; leg 6 the causeway's |
| The ending | The causeway leaves from Bell Rock, so the market's opening and the ending's fall in the same 18 minutes and compete | The market is already whole when the lantern is lit; the ending stays the last new thing, and the one planned change of train on the way to The Boogler happens in a full market |
| Cost | About 0.5 U, all in the last area | About 1 U: 0.5 at depth (Bell Rock from 1 to 1.5 U), 0.25 systems, 0.25 greybox markers. 27 U becomes 28 |

**Recommended: (b).** It makes the first loop's junction a place worth returning to as each line arrives, spreads the cost,
and keeps the ending alone at the end. It does not make Bell Rock the final hub unlocked; it makes it the last one
finished.

**The destination rule does not change.** A yard row still has one town. The market adds rows of its own on the two
lines that reach it (a hub on two lines has a row on each); no crate is split and nothing is routed. **Default:** the
main route gains no wait: R2b's full-load rule applies to these rows.

**Finding.** The skerry is 240 × 190 m on two levels, carrying two lines' platforms. Whether five stalls and a board fit on the
upper deck round the tower is unproven; Bell Rock's own plan runs the level check before anything is placed.

**Owner question (one).** Is the market Bell Rock, built out in stages as lines arrive (recommended), or did you mean
the last place unlocked, which on this map is the Original Island? Until he answers: Bell Rock, timing (b), as
greybox markers only; nothing is built on the Original Island beyond the recorded ending.

### Findings

1. **Canopy Town gets no freight until the Wall closes.** It is reached at stage 5 by the bay line, which carries no
   freight; its ring neighbour arrives at stage 7, so until then it has plot 1 only. Its brainstorm should give the
   bay line a yard or accept the wait (a fair reason to return). This blocks nothing.
2. **The town buys were tuned for six hours** (last buy at hour 5.7 to 5.9, 11 November) and the target is now four
   to five: re-run the model with five towns before prices reach the hubs. No yard row above exists, so reach is
   unproven; each needs R2b's proof when its leg lands.

### Calls and owner questions

Eight Decided (hub towns and sources; the stations and rotundas; starting buildings, bought houses, the doubling and
one wallet; freight by train; no routing; the build order; the three-hour rush; source upgrades). Six New and two
Default are in [agent-calls](../agent-calls.md#rewards-co-op-and-town-roles), open. "Every area or only the larger
hubs?" is answered: larger hubs only.

1. **Does the Village also receive what the far sources make?** Recommended: no; each town takes its neighbours'
   goods, so the Village keeps timber and stone and later gains steel. Until he answers: neighbours only.
2. **What should growing a hub town give?** Recommended: riders and fares, a building with a character, and its
   sources' upgrades; nothing the route needs. Until he answers: that list.
3. **Do the stand-in towns go into the greybox now, or wait for each area's depth pass?** Recommended: now, at the
   minimum above. Until he answers: each hub leg not yet built carries one; nothing already built is redone.

## 7. Owner decisions

**Blocks the outline**

1. **Do both branch areas keep a choice of order?**
   - **Both areas, High Gorge first, fixed for Alpha (recommended).** Saves about half a unit and a second route to
     prove; the choice can return for Beta.
   - Both, with the choice at Ring Island, as the map is drawn. Adds the bay trestle, a second service plan and bills
     that take either material.
   - One branch only. Saves a large area and 40 to 70 minutes, but the sea cave or the ending's glide loses its key,
     and the Port's bill is redrawn.
   - **Answered (owner, 12 November UTC): both areas, High Gorge first, fixed order (recommended).** Recorded in the [decisions](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered).
2. **If the rough route measures well under six hours, what gives?** (The built third plays at about half its
   allowance.)
   - **Measure first in phase B, then add puzzles and discovery to the small areas; never larger bills (recommended).**
     Follows "smaller areas carry puzzles" and his wariness of grinds.
   - Accept a shorter game, four to five hours. Costs nothing; changes the decided target.
   - Hold six hours with the economy: town growth and Boogle goals on the main path. Leans on the least-built system.
   - **Answered (owner, 12 November UTC): add puzzles and discovery to the small areas (recommended).** His note: "we
     dont need to author the puzzles now but it feels ok that someone could bum rush the game at 3 hours, but if they
     interact with the world, npcs, abilities, puzzles, it will be closer to 4-5". The orchestrator's reading: a
     three-hour rush is acceptable; the target for a player who engages is four to five hours, not six; puzzles are
     not authored during the greybox. Recorded in the [decisions](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered).
3. **What happens on the Original Island at Alpha?**
   - **The causeway ride, a meeting with The Boogler, one shared moment and a thanks card; the world stays open
     (recommended).** One medium area. The meeting's premise is his pick from section 3's table or his own.
   - That, plus a communal finale (the parade in [story-and-finale](../proposals/story-and-finale.md), parked). Adds a
     ritual system and an absent-friend echo.
   - A stand-in card only, the real ending at Beta. Smallest, but Alpha then proves no ending flow.
   - **Answered (owner, 12 November UTC): the ride, the meeting, one shared moment, a thanks card (recommended).** His
     note: "don tknow about the thanks card, bu tmeeting the boogler is a fun ending potentially. although im
     interested in scoping a sort of post-game twist at some point, its cool when games do that". The orchestrator's
     reading: the meeting with The Boogler is the ending; the thanks card is undecided; a post-game twist is an idea to
     scope later ([ideas](../ideas.md)). Recorded in the [decisions](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered).
4. **Is the mainland ever walked?** The log says both: "reachable at the end, and you can walk around it"
   ([undated](../decisions-archive.md#archive-core-loop-pacing-and-progression)) and, on 7 November, "never reached in the
   main game".
   - **A backdrop only; the 7 November call stands and the older entry is archived (recommended).** High Port is the
     port you walk.
   - Reached after the ending, post-Alpha. Keeps the old entry as a Beta goal.
   - Reached in the main game. Adds an area larger than any here.
   - **Answered (owner, 12 November UTC): a backdrop only (recommended).** Recorded in the [decisions](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered); the older entry is archived.

**Can wait**

5. **When do saves start surviving updates?**
   - **At the start of the Alpha phase (recommended).** Wipes stay free through phases B and C.
   - When the first far island is content-complete. Earlier safety for his own evening play; slows every later change.
   - Not until Beta; Alpha's runs use a frozen build. Cheapest, but the solo acceptance run stops proving updates.
   - **Answered (owner, 12 November UTC): at the start of the Alpha phase (recommended).** Recorded in the [decisions](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered).
6. **When is the fresh-player session at target quality?**
   - **After Ring Island build 2, on the built route, alongside the greybox (recommended).** Earliest read on
     readability and first-time length.
   - After the rough route exists, so the fresh player can see the whole shape.
   - At Alpha only. Risks finding a readability problem six areas late.
   - **Answered (owner, 12 November UTC): after Ring Island build 2, on the built route (recommended).** Recorded in the [decisions](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered).
7. **Which of the remaining cuts stand?** (Cuts 4 and 5 in section 3: three double-backs instead of five; one upgrade
   per ability and no bombs.)
   - **Both (recommended).** About one unit and several gates saved.
   - Keep all five double-backs. They reuse built places, about half a unit.
   - Keep ability ladders. Each rung needs its own gate somewhere on the route.
   - **Answered (owner, 12 November UTC): both cuts (recommended).** Three double-backs instead of five (the sea cave,
     the first branch's hidden section, the train through the ring; the Closest Pew and Split-rock's upper seam move to
     Beta); one upgrade per ability (hook reel, glider cloth) and no bombs. Recorded in the [decisions](../decisions-core-loop.md#d-2026-11-12-campaign-outline-answered).

## 8. Risks, and what sends us back a phase

| Risk | Sign | Back to |
| --- | --- | --- |
| The route is far shorter than six hours | Phase B's table reads under four hours solo | Decision 2, before phase C starts |
| A large area costs far more than 2.5 U | High Gorge passes 8 elapsed days | Re-size section 6; offer cuts before Canopy Town |
| The next area does not change the play | High Gorge plays as "another bill, further away" in his session | That area's brainstorm, not the whole outline |
| Generic server lines do not stretch to eight lines and 21 halts | Train rules or the fuzz tests blow up (v27 already pushed the unit job past 10 minutes) | Phase B's first leg; fix the line model before more lines |
| Streaming: islands past Ring Island break the coast texture or the frame time | The device run at High Gorge's greybox | The streaming step, ahead of Canopy Town; gameplay is not cut for it without his word |
| A late save path corrupts or wipes during the acceptance run | Any loss in phase D | Phase D's first step; the runs restart |
| Hot files (`rail-seed.ts`, the bot, `place.md`) make two lanes collide | Rebase conflicts on most ships | Split them before phase C (already queued) |
| Rulings become the limiter | Areas wait on answers more than a day | Fewer, larger decision pages per area; more defaults logged |
| Usage limits or a GitHub outage | A paused lane | The standing calls already cover both; the range's high end assumes some |

**Room safety and mixed builds.** Nothing here changes a wire shape. Each area's plan carries its own `WORLD_NS` bump
under the standing calls until decision 5's trigger.

## Contradictions found while checking

1. [docs/world/README.md](../world/README.md) version 2 calls High Gorge and Canopy Town substitutes; the chosen map
   and [world-blockout](world-blockout.md) visit both.
2. The mainland: two entries in force disagree (decision 4). "A last link from Home to the port" (2 November) also
   predates the causeway ending.
3. [direction.md](../direction.md) is at 8 November (phase 1, world v21, Split-rock "next"), and orders the
   target-quality pass before any route, which the 10 November blockout call overtook.
4. Ring Island's entry says build 1 is v26 and build 2 v27; build 1 shipped as v27.
5. [money](../brainstorms/money.md) (Bucks, a comic score) is still listed as an open brief, but the Boogles decisions
   of 10 and 11 November replaced its premise; the six-hours entry still says "Bucks".
6. [world-blockout](world-blockout.md)'s tables keep the Ring top halt and the crane-lift leg, which the 10 November
   rail-map ruling removed; `src/sickle/world-lines.ts` still has "Ring top".
7. [production-core](production-core.md)'s slices 2 to 4 are unticked though built; slice 7 is M13e.
8. DESIGN.md's four sync kinds have no row for the railway's server-replicated state (`namespace.ts`, v14).
