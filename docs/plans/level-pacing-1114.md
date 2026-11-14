> **Status: proposed (2026-11-14). Design only; nothing built.** Four notes from the owner's 14 November play session,
> each with a diagnosis from the code and his session data, three options and one recommendation. Base: `origin/main`
> at `643548676`. Steps A1, B1, C1, C2 and D1 are view-only and need no bump; step A2 moves a sim constant and takes the
> next free `WORLD_NS` (v45).

# Level pacing, 14 November: the great tree, the pinnacle, Q5's rails and the station boxes

## Goal

Answer three things the owner felt while playing, without adding a mechanic: the first tree you meet should be one you
can use; the climb the hook invites should end on something that says what comes next; and the last station before the
sea should not leave you wondering whether to walk back for rails. Serves DESIGN.md 7 (Telegraph everything) and 11
(Show, don't tell). Owner calls applied: "Place for the look, not the cost; terrain may change", "Block out spacing
first, details later", "Playtest before bespoke functionality", "Small rulings are the orchestrator's".

**Research:** [progression-flow-layout](../research/progression-flow-layout.md#the-rules-as-lenses), lens 4 ("Tease the
lock, use the key in sight, keep the return short") is the one all three notes touch; its "Home, beat by beat" table
gives the legs used below. [route-contract](../research/route-contract.md): no option here lets movement skip work. No
departure from either. Nothing here is a new port from Place, so no fit check is owed; the great tree and the sealed
glider are already in the live game.

## The owner's words (verbatim)

1. "I think the great log tree position should change. It's weird that it's the first tree that you get to, but you
   can't do anything with it. So it gives weird feedback to the player. It should be maybe a little differently spaced
   out or in a different location."
2. "As soon as I unlock the grapple hook, the player wants to go up to the top of the pinnacle, but there isn't the
   glider to get there, which feels like weird pacing. We should have a designer look at that and think of a better
   solution for the pacing there or the design of the level."
3. "I'm wondering what the game design is for the station before Far Ahead, where I have to get 24 rails. The cart only
   brings 16. So they're expecting I have to go back and get them, or not. Why not? I think we also should think about
   what the wagon is like. Is that supposed to be like a preview of what the train can offer, as far as the design
   goes?" ("Far Ahead" is Far Head; the station is line 2's Q5; "the wagon" is the depot cart.)
4. "I wonder if the station at deposit boxes should either go away once that area is built, or they should act as
   shared resource drop boxes for when I have extra resources I want to put back into the system."

## Evidence

- `npm run level-check -- --place=place` on `643548676`: exit 0, "All progression assertions passed". Lines used below
  are quoted where they matter.
- The owner's sessions today, `node dev/playtest/cli.ts <id>`: `mwg4tvn7-4hw3kbae` (the camp, wake to the proper axe,
  6 min 32 s) and `mwg52ang-huyqsr06` (Q1 to Q4 with the hook climb, 7 min 39 s), both solo on an iPad with a keyboard.
- Positions measured from `src/place/layout.ts`, `src/place/tree-sources.ts`, `src/place/terrain.ts` (`H`) and
  `src/sim/railway-line-layout.ts` by a throwaway script (not committed). Coordinates are local metres (world x is
  local + 1000); walk-seconds at 5.6 m/s.
- One still, `npm run look -- --rail-seed awake --cam 990,33.2,-158 --look 997,36,-136`: from behind the woken
  machine, the great tree fills the middle of the frame directly over the machine and Station 1's frame, and the
  ordinary trees stand behind it. A second still (the summit on the first climb, seed `hook-taken`) was queued behind
  other runs and is not read here; the sealed device is described from
  [place.md](../game-design/place.md#production-glider-9-november-2026-piece-b) and its code. Not seen: the prow
  (Problem 1's recommended spot) from the footbridge or the village; that is step A2's proof look.

## Problem 1: the great tree

### Today, step by step

| Step | Where | What the player gets |
| --- | --- | --- |
| Arrive, walk the bold path | Dock (−199, 10) to the path's end (−14, −154): 431 m, 77 s | 18 ordinary trees stand within 12 m of the path, but nothing can be chopped before the wake |
| Wake the machine | (−6.3, −149.2), line 1 at s 191 | The multi-axe; Station 1's frame lights up at (−4.4, −141.9) wanting 24 logs |
| Look for a tree | The great tree at (−4, −138): **11.5 m** from the wake spot and **3.9 m** from Station 1's frame | It is the nearest tree to the path's end (18.9 m against 24.3 m), to the machine (11.5 m against 17.3 m) and to the frame (3.9 m against 9.7 m), 2.1 times the size of the others, and it stands on the straight line from the frame to Station 1's grove (trees at 9.7 to 18.1 m) |
| Swing at it | Within 4.6 m | No prompt. The axe rebounds with its sound and no chips. No words, no rope, nothing that says when or why |
| Station 3 opens | Two stations later; Station 3's frame is at (−22.6, −88.7), 52.6 m away | Only now does the tree wear its gold rope and take strokes |

In `mwg4tvn7` the machine woke at 0:12 and Station 1 took its first logs at 0:28. At 0:34 to 0:35 he pressed four times
with nothing in reach, the nearest known prompt being `place-tree28` (the great tree) at 4 m. Station 3 opened at 1:55
on that run; for a first-time pair on 9 November Station 1 alone took 3 min 7 s.

**Was it the Home flip?** No. `GREAT_TREE` (−4, −138), Station 1's frame and the camp end of line 1 are unchanged since
Place's round 4 (`43fe481c9`), and the flip's X1 kept all 362 scenery trees and the starter table
([home-flip](home-flip.md), problem 1). The flip moved the village end only. The tree has been first since it was put
here; an older spot 29 m from Station 3 was replaced by this one.

### Why it misfires

The tree was placed for its haul (53 m to Station 3) and nobody checked what stands beside Station 1. The biggest,
nearest tree at the first place you ever need logs is the one tree that refuses you, and the refusal names nothing.
Lens 4 allows a tease passed long before it opens, but a tease has to read as a lock; this one reads as a broken tree.

### Options

| | What | Numbers | Cost and what it touches | Bump |
| --- | --- | --- | --- | --- |
| **A. Move it to the prow beyond Station 3** | The plateau narrows north of Station 3 into a prow over the gorge. The tree stands alone on it, above the footbridge of the first walk and beyond the last frame of line 1, so it is seen first and reached when Station 3 opens | (0, −62), ground 29.7 m. 35 m from Station 3's frame, 80 m from Station 1's, 87 m from the wake spot; nearest ordinary tree 52 m. The prow is level, about 10 m wide at the tree and wider to the south; 3 of 16 fall headings are clear, the rest collapse in place (`safeTreeFall`). The haul falls from 53 m to 35 m: 24 s to 16 s solo at 2.2 m/s | `GREAT_TREE` (`src/place/layout.ts:507`), `LINE1_GREAT_TREE` and `BEAM_AREA` (`src/sim/railway-line-layout.ts:35-41`), the pinned source table, the golden fixture, `dev/loop/graph.ts` (beam 1x53), tests, place.md. Sim tier | **Yes, v45** |
| B. Move it beside Station 2's grove | Out of Station 1's way, met one station early | (−46, −124): 42 m from Station 3, 47 m from Station 1's frame, 49 m from the wake spot, 19 m north of Station 2's grove, 18 m off the line. Haul 42 m, 19 s | The same files as A | **Yes, v45** |
| C. Leave it, and make the refusal honest | Before Station 3 opens the tree offers its prompt shown blocked with a reason, the pattern ruling E already uses for "Feed the works" | Within the existing 4.6 m: `Chop`, blocked, "For Station 3's beam" (draft UI copy for the owner, not a Boogler line). The rebound and its sound stay; the gold rope still arrives when Station 3 opens | `src/entities/railway/sources.ts` and the prompt registration. View tier, Local | No |

Considered and not offered: letting the tree fall or give something at once. The owner decided on 5 November that it
cannot be felled or shouldered early and on 7 November that it falls "as soon as Station 3 opens"
([rail](../decisions-rail.md#d-2026-11-07-the-great-beam-any-axe-any)); an early yield would also make it a log source,
which the 3 November trees entry rules out.

### Recommendation: C now, then A

C ships first because it needs no bump and fixes the "weird feedback" wherever the tree stands. A then fixes the
spacing: Station 1's nearest tree becomes an ordinary one at 9.7 m, and the great tree stands on the rim above the footbridge you cross on the way
in (to be confirmed by A2's proof look). B still puts a tree you cannot use beside a grove you
are working. A shortens the haul by 18 m; if the owner wants the old length, (−46, −124) is the fallback, or the prow
with Station 3's bill unchanged and the pair speed left alone (the haul is one trip either way).

## Problem 2: the pinnacle (Needle Bell)

### Two readings, and what the data says

His sentence can be read as "the hook can't reach the top" or as "I reach the top and the glider isn't there to get".
**The first is not what the game does.** level-check, "With the hook": `ok t0 … t5`, `ok summit: a ring in range from
where you can stand`: the hook alone reaches the summit, 0 m short. In `mwg52ang` he gained the hook at 3:01, was
pulled to t0 at 3:03, reached the summit at 3:35 (34 s, with a side pull to the nook) and pulled the sea switch at
3:41. So this plan takes the second reading: the climb's peak arrives 34 s after the unlock and the thing a 102 m
summit promises is not there. If he meant something else, question 2 below is where to say so.

### Today, step by step

| Step | Where | What the player gets |
| --- | --- | --- |
| Station Q2 is laid | Q2 at (−51, 31) | The walk to pillar p2 opens; Needle Bell is 72 m off (13 s), its eight rings visible since the start |
| Take the hook | p2, line 2 at s 89.5 | The card, then an automatic pull to t0 (24 m up) |
| Climb | t1 37 m, t2 50, t3 63, t4 76, t5 89, summit deck 102.4 m: 13 m a pull | About 30 s. The nook's crate at t3 |
| The summit | Sea switch (11.8, −6); sealed glider (16, −4.5), 4.5 m apart | **Pull** opens the sea gate with its 3.2 s camera move. The glider is a dark drum with a dark furled vane: no ring, light, shaft or prompt (by design, 9 November: "reads as a thing that isn't on yet") |
| Leave | | Pull back down t5 to t0, or step off: a fall lands on the upper bank 44 m from p2, unhurt. Nothing up here points at the next job |
| The glider wakes | When Q5 is laid, three stations later (Q3 16 logs + 12 rails, Q4 16 + 16, Q5 24 + 24) | A banner and a 70 m locator, with the room at the rim or Far Head; Far Head to Needle Bell is about 406 m, then the climb again |

Gap from the first summit to the wake: 4 min 19 s for the pair on 9 November (hook 8:58, Q5 laid 13:17), and nobody
took the glider that night. Today he was 4 min 30 s past the hook with Q5 still to build when the session ended.

What the glider adds, from level-check: the balcony and the sea stack ("balcony: by air", "stack: by air"), and from
the summit "the sea gate, the frame beside it: 167 m away, budget 188 m", "home, the village: 117 m away, budget
203 m", "Far Head can't be flown to from the tower: 411 m, budget 188 m".

### Why it misfires

The first want after the unlock is answered: the top in 34 s. What fails is the top itself. It holds a lock that names
nothing (lens 4's tease, without the reading), and the two decisions that made it so pull against each other: the
owner's "spread abilities out: hook to glider was 49 s" (3 November) and "wanted it later in the game" (8 November)
keep the glider at Q5, while the 8 November early sea switch makes the summit the first thing the hook does. The
9 November default that the drum stays dark "so it doesn't read as a second switch" removed the last hint.

### Options

| | What | Numbers | Cost and what it touches | Bump |
| --- | --- | --- | --- | --- |
| **A. The seal that counts down** | The sealed device shows what it is and what it waits for. The furled cloth is in the glider's cream and teal, bound by three brass bands. Its prompt is shown blocked with a reason. One band falls as each of Q3, Q4 and Q5 is laid, with a small flare on the summit seen from line 2, so the three stations ahead read as unsealing it. The last band is today's wake | Prompt within the take's 3.2 m: `Take it`, blocked, "Sealed until the line reaches Far Head" (draft UI copy). Band flare: the wake flare at one third (opacity about 0.3, 1.5 times the shaft's width, 2 s). A late join or reload snaps to the right band count with no flare | `src/entities/railway/glide-device-view.ts` and the prompt; bands read accepted Q3 to Q5 completions. View tier, Local. Reverses the open 9 November default "the sealed drum has no prompt and a dark vane" | No |
| B. The glider wakes on the first summit pull | The hook climb ends in a flight: pull the switch, watch the gate open, take the glider, fly | Flight targets from level-check: the village 117 m (budget 203 m), the sea gate 167 m (budget 188 m). Hook to glider about 40 s | `rail.glide`'s condition (after Q5 becomes after the sea switch) in `src/sim/railway-systems.ts`, the wake edge, the bot's order, seeds `glide-earned` and `q5-*`. Sim tier. Q5's completion loses its ability; the first flight no longer lands at the new boiler. **Contradicts the owner's 3 and 8 November calls**, so it waits for him | Yes (a rule's meaning changes) |
| C. Split the climb | The sea switch moves down to a ledge at t3 (63 m), beside the nook; t4, t5 and the summit ring stay dark until Q5 lights them with the glider, so the top and the glider arrive together | First climb 4 pulls, about 15 s; the top 39 m higher, later | Switch position and the server's reach check, three rings' state, the bot. Sim tier. Contradicts 8 November ("the sea switch stays on the summit") and refuses the first want outright | Yes |

Considered and not offered: a new ring line down from the summit toward the quarry lever (98 m across, 76 m down, six
new slabs). Stepping off already works and costs nothing; six slabs is bespoke level before a playtest asks for it.

### Recommendation: A, and ask the owner about B

A satisfies both tests in the brief: the first want is answerable within a minute (it already is), and the tease now
names what is missing. It keeps his own spacing, turns Q3 to Q5 into a visible promise instead of a silence, and is a
view-only change that ships today. B is the direct fix and I think it would feel better at the summit, but it undoes
two things he asked for and bunches hook and glider 40 s apart, which is the exact 3 November complaint; it is one
rule line later if the seal is not enough. C is worse than today.

## Problem 3: Q5's 24 rails and the depot cart

### (a) What the code does today

- **The cart holds 24 rails, and the live rule was not regressed.** `CART.rails: 24` (`src/sim/railway-cart.ts:22`,
  since `09e49f6f8`); the Home flip (`a87c0dff5`) changed the cart's road, not its load. The view reads the same
  constant (`src/entities/railway/cart-view.ts:17, 99, 137`). `test/railway-cart.test.ts:204-205` pins "a full rack
  fills a cart" and "one shipment brings Q5's whole rail bill".
- **It never leaves the forge short.** At the forge stop it takes what the rack holds and stays while it still wants
  more (`src/sim/railway-sys-line2.ts:370-380`, "waiting for the forge"); the forge pours a rail every 0.5 s up to 24
  (`LINE2_FORGE.pourTicks: 5`, `rackMax: 24`). What it wants is the stretch's unmet rail bill, capped at 24
  (`cartWants`, `src/sim/railway-queries.ts:160`).
- **In a normal order:** Q4 is laid; the cart loads 24 logs at the camp, runs to the forge, takes 24 rails (waiting up
  to 12 s if the rack was raided by hand), runs to Q5's rack and unloads 24 logs and 24 rails in one visit. The player
  lifts them 7 m to the frame; a back holds 16, so each material is two lifts (16 and 8). **Nobody is expected to walk
  back.**
- **Where the 16 he saw comes from: not determined.** Two things in the game are exactly 16: Q4's rail bill is 16, so
  the cart's shipment one station earlier is 16 rails (he lifted rails off that rack at 7:14 today), and a back holds 16 of the
  24 on Q5's rack. His recorded sessions today end when Q4 is laid (7:33), so the data does not show him at Q5.
- **The label:** the rack's tag reads `Loading`, `On the way`, `Unloading` or `Waiting for forge`, always over the
  fixed second line `More coming` (`cart-view.ts:34-40, 335`). It never shows a number, so it cannot answer "is the
  rest coming?".
- **Stale, not regressed:** `docs/game-design/place.md:47` ("its 24 rails take two trips of 16 and 8") predates glider
  piece B and contradicts lines 542 and 597 of the same file. `src/place/layout.ts:61` still has `CART … rails: 16`;
  that is Place's old constant and nothing in the live cart reads it (the live cart imports `src/sim/railway-cart.ts`).

### (b) What Q5 should feel like

| | What | Judged |
| --- | --- | --- |
| **One full shipment, labelled with numbers** | What the rule already does, plus a tag that says it: the second line becomes the load, "24 logs, 24 rails" while it travels (draft UI copy) | DESIGN's core loop: "you still haul for each track segment, with the network bringing materials closer". The cart is the network; the 7 m lift is the haul. Matches the 9 November call (16 to 24) and the 10 November late-game answers, which each cut a go-back (the cradle takes only its 8 rails; two footings by hand, not sixteen) |
| Two visible trips, "16 of 24, more coming" | The old behaviour with honest labelling | Adds a 125 s cart cycle of standing at the rim (home-flow finding 1: the bot stood 216 s) for no decision |
| A reason to go back for the last 8 | Carry them from the forge yourself | 2 x 254 m by hand (the loop graph's by-hand figure for Q5). The owner called the same walk for Q6 "the longest grind" on 9 November |

**Recommendation:** keep the single shipment (Decided in practice: built on the 9 November call) and replace
`More coming` with the load's numbers (Default). View tier, no bump.

### (c) The cart as a preview of trains

What the cart teaches before trains exist, as built: track you laid carries goods to the railhead without you; the
load is visible on the cart and on the rack; a crew does it; you do the last few metres. What trains then add: riding,
stops you ask for, freight on a timetable (Q6's kit comes by train, `feed: 'train'`), cars and the garage. The
1 November "the wagon is transportation" and 2 November "show and bench are cut" entries are about the old ride
prototype's wagon, not this cart; they do say the owner did not want a seat or a show on a goods wagon.

**Recommendation (Default):** the cart previews freight and nothing else. It stays small and crewed, its loads grow
with the bills (16 rails at Q4, 24 at Q5, now readable on the tag), and riding stays the train's own reveal; no ride is
added to the cart and no schedule. The hand-over is already in the rules: once trains run the cart stops serving and
Q6's kit arrives by train. Whether the cart can be stood on today was not checked.

## Problem 4: the station boxes once their build is done

### What he means, and what each does today

| Deposit point | While its bill is open | Once its stretch is funded and laid |
| --- | --- | --- |
| The **frame** beside the track, one per station (T1 to T3, Q1 to Q7; `src/entities/railway/stations.ts`): four amber posts, a board, a roller feeder | Takes logs, stone, rails or the beam; a sign with have/need | **Stays standing as an empty prop.** Its sign goes off "when it's not its turn or it's done" (`stations.ts:344`); it has no prompt and takes nothing. I found no code that removes or changes a finished frame. This is the box he is looking at |
| The **depot rack** and the **rail shelf** by the frame (Q2 on; `line2-view.ts:298`, `shelf-view.ts:116`) | The cart fills them; Pick up | There is one of each and it moves on to the next station, so none is left behind. Rails left on the shelf or the cart go back to the forge rack when the stretch funds (`src/sim/railway-sys-line2.ts:173-180`) |
| The **forge's frame** | 24, then 32 logs | The forge stands in its place |

**Extra logs or rails on your back today.** They go into the next open bill, which is where most surplus ends up. With
no open bill for them: tap Drop for one piece, hold Drop 0.4 s for the whole back; piles of up to eight lie where you
stood, persist, and anyone can pick them up; a pile left 21 minutes with nobody within 12 m is recovered (rails to the
forge rack). So nothing is ever stuck on a back. What does not exist: a place that takes spares as stock. No op puts
rails back on the forge rack or logs on a rack by hand.

**Is surplus real?** Yes, but it is small and it comes from one cause. The depot's Pick up is capped by the bill (today:
16 + 7 + 1 logs for Q2's 24, 12 + 4 for Q3's 16), so the cart never makes spares. Spares come from trees and from the
forge rack, which fill a back of 16 whatever the bill wants, and one back holds every material: left-over logs block
the rails you need next, so you drop them. He pressed Drop 7 times in today's 7 min 39 s session and none in the camp
session (a back of 8 against bills of 24, 32 and 40). He raised the same thing on 10 November ("I was carrying extra
resources and had to drop them in place").

### Options

| | What | Kind | Cost |
| --- | --- | --- | --- |
| **(a) A finished frame packs up** | When its stretch is laid the frame folds away in about a second (posts down, board off, a puff) and leaves a small tidy stack of spare sleepers beside the track as dressing; at a halt site the halt's own build replaces it. A reload shows it already gone | Default | View tier, Local, from accepted completions; the frame's colliders go with it. No bump |
| (b) Shared drop boxes where the stations are | **Already decided, not built:** the owner's 10 November answers put a **yard at each halt**: "take it where it lies; trains later carry it to where their line needs it", never full, appearing "when the track reaches the halt site" ([rail](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts); [station-deposit](../brainstorms/station-deposit.md) build 1). "The system" there is the yard's own visible stock: anyone adds or takes, and build 2 lets trains draw from it. No wallet payout, so until build 2 a give-back is tidying that a friend can use | Decided | Sim state, server-owned like the racks; one `WORLD_NS` bump (station-deposit build 1) |
| (c) One drop-off, station boxes gone | The Village yard only (station-deposit turns the recovery rack at world (905, 1) into it), with (a) for every frame | New (narrows a decided answer) | The same sim state for one yard; a bump. Spares made at Far Head are 546 m from it |

### Recommendation: (a) now; (b) is the owner's own answer and should be built as decided, not parked

The orchestrator's lean was (a) now and (b)/(c) parked unless surplus is common. Tested: (a) holds, and "never stuck"
already holds through Drop. But (b) is not a new idea to park: the owner decided it four days ago and has now asked for
it a second time in different words. It is still bespoke shared storage, so it keeps its place in the queue as
station-deposit build 1 with its own bump; this plan adds nothing to it except the reading that a finished frame is not
the yard (yards stand at halt sites, of which there are fewer than frames). (c) saves little and puts the box far from
where spares are made. Co-op: with (a) alone, handing a friend spare rails stays a pile on the ground, which works
today; the yard is what makes it read.

## Steps

Each is one sitting and leaves `node dev/ship-check.ts` green. Run `npm run inflight` first: the Round's blockout
([home-flip](home-flip.md)) is in flight in the town; none of these steps touches the town's ground or
`src/place/home-station.ts`.

- [ ] **A1. The great tree's honest refusal. View tier, no bump.** `src/entities/railway/sources.ts`: while
  `railBeamChoppable` is false and the tree stands, register its `Chop` prompt as blocked with the reason "For
  Station 3's beam" within the existing 4.6 m; the rebound is unchanged. Test: the prompt's state for T1 active, T3
  active and the tree felled. Proof look: `--rail-seed awake`, Buddy 3 m from the tree, the blocked prompt in frame.
- [ ] **A2. The great tree on the prow. Sim tier, `WORLD_NS` v45 (not mid-session; batch with any other v45 work).**
  `GREAT_TREE` to (0, −62) in `src/place/layout.ts`; `LINE1_GREAT_TREE` to `{ id: 28, x: 100000, z: -6200 }` and its
  ground height 2970 where 3000 is written beside it (`railway-line-layout.ts:45`, `railway-components.ts:87`,
  `railway-sys-line1.ts:283`, `railway-sys-away.ts:251`); re-derive `BEAM_AREA` so the prow and the 35 m to Station 3
  are inside it; regenerate the pinned source table and `test/fixtures/railway-golden.json`; `dev/loop/graph.ts` beam
  1x35; `src/world/namespace.ts` v45 with a dated line; place.md's Station 3 paragraph. Verify: `npm run level-check --
  --place=place` ("the great tree" still `ok` at the start); `npm run loop -- run`; the bot's beam leg
  (`dev/look/bots/railway.ts`, which reads `LINE1_GREAT_TREE`). Proof looks (two): from the footbridge
  (world 952, 3.4, −82) looking up at the prow (world 1000, 45, −62), and `--rail-seed awake` from the wake spot looking north, to confirm the tree
  shows over Station 1's grove and that an ordinary tree is now the nearest. If the prow tree cannot fall clear in
  play, widen the search to (0, −60) to (2, −74) before changing the rule.
- [ ] **B1. The glider's seal. View tier, no bump.** `src/entities/railway/glide-device-view.ts`: sealed look in cream
  and teal under three brass bands; bands = 3 minus the laid count of Q3, Q4, Q5; the band flare; the blocked `Take it`
  prompt with its reason. Test: band count per seed (`hook-taken` 3, `q3-done` 2, `q4-done` 1, `q5-done` woken). Proof
  looks: the summit on `hook-taken` from the switch, and the flare from Q4's frame on the edge. Update place.md's
  glider section and the 9 November row it reverses.
- [ ] **C1. The cart tag's numbers. View tier, no bump.** `src/entities/railway/cart-view.ts:335`: the second line
  shows the load aboard or owed for the served stretch instead of `More coming`. Proof look: `--rail-seed q5-arriving`
  at Q5's rack.
- [ ] **D1. Finished frames pack up. View tier, no bump.** `src/entities/railway/stations.ts` and its callers
  (`line2-view.ts`, line 1's view): on the laid edge of a stretch its frame plays a one-second fold and is removed
  with its colliders (`stationColliders`), leaving a three-sleeper stack as dressing; a snapshot with the stretch
  already laid builds no frame. The forge's frame and Q7's own frame on the pier are left alone. Test: no frame
  collider remains for a laid stretch. Proof look: `--rail-seed q3-done` along line 2 from Q1 to Q3, and a short
  video of the edge on `q3-stocked`. Check the bot's route does not path through a removed collider's old position.
- [ ] **C2. Docs only.** Correct `docs/game-design/place.md:47`; note at `src/place/layout.ts:61` is a code comment and
  is left for whoever next touches Place's constants.

## Design review (designer, 2026-11-14)

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The great tree cannot be felled before Station 3 opens | Decided | [rail, 7 November](../decisions-rail.md#d-2026-11-07-the-great-beam-any-axe-any); core loop, 5 November "after the solo iPhone run" |
| 2 | The great tree moves to the prow at (0, −62), with `WORLD_NS` v45 | New | Recommended; the build proceeds on it when a bump is convenient |
| 3 | The beam's haul shortens from 53 m to 35 m (24 s to 16 s solo) | Default | A side effect of 2; fallback (−46, −124) at 42 m |
| 4 | Before Station 3 the great tree's `Chop` is shown blocked, "For Station 3's beam" | Default | Draft UI copy; signposting, 9 November: words allowed sparingly |
| 5 | The glider stays at Q5, after the hook | Decided | Playtest 3 November "spread abilities out"; [process, 8 November](../decisions-process.md#d-2026-11-08-the-glider-is-deferred-not-cut) |
| 6 | The sea switch stays on the summit and opens early | Decided | [process, 8 November](../decisions-process.md#d-2026-11-08-the-summit-switch-opens-early-switch) |
| 7 | The sealed glider shows three bands for Q3 to Q5 and a blocked `Take it`, "Sealed until the line reaches Far Head" | New | Recommended; reverses the open 9 November default (dark drum, no prompt) |
| 8 | A band's flare is the wake flare at one third | Default | Tunable |
| 9 | Q5's rails come in one shipment of 24 | Decided in practice | Open 9 November call, built; unchanged here |
| 10 | The rack tag's second line shows the load, not "More coming" | Default | Draft UI copy |
| 11 | The cart previews freight only: no ride, no schedule | Default | 2 November "show and bench are cut" in spirit; riding is the train's reveal |
| 12 | A finished frame packs up in about a second and leaves a small sleeper stack | Default | Recommended; view-only |
| 13 | Spares go to a yard at each halt, taken where they lie | Decided, not built | [rail, 10 November](../decisions-rail.md#d-2026-11-10-open-calls-answered-yards-at-halts); station-deposit build 1 |

**Findings.**

1. The brief's premise that the hook falls short of the top is wrong: level-check and today's session both show the
   summit reached by hook alone. The design above answers the summit's missing payoff instead.
2. Flow, rule 1 (the next goal can be found): after the first summit nothing points at Q3. The seal's reason line
   ("until the line reaches Far Head") is the only pointer this plan adds; evidence is thin (one 9 s idle at the spire
   at 3:04, before the climb), so nothing more is proposed.
3. Lens 4 at the camp: the great tree is a tease with no reading. A1 fixes the reading, A2 the placement.
4. Co-op: A1, B1 and C1 are Local views over accepted state, so each player sees the same blocked prompt, band count
   and tag from their own snapshot; a late joiner gets the current band count with no flare. A2 changes nothing about
   Help carry except a shorter haul. Solo is unchanged in every step.
5. Problem 4: finished frames are dead props on the main line (nine by the time the pier is laid). Removing them is not a new
   mechanic; the shared drop box is one, and it is already decided.
6. Reach is proved only for today's layout. A2's reach (the prow is walkable from Station 3, the beam's ground covers
   it) is a claim until its step's level-check and bot leg run.
7. Suspect copy: none of these lines is The Boogler's. Four draft UI strings are listed in calls 4, 7 and 10.

**Owner questions.**

1. The great tree on the prow shortens the beam's haul from 53 m to 35 m. Keep the shorter haul? **Recommended: yes**;
   the beam chain was "unclear" on 6 November, and nobody has asked for it longer.
2. Did "there isn't the glider to get there" mean the glider is missing at the top (this plan's reading), or that you
   could not get up? And if the first: keep the glider at Q5 behind a seal that counts down, or wake it on the first
   summit pull, 40 s after the hook? **Recommended: the seal first**, and move the wake only if the next session still
   feels flat at the top; moving it undoes your 3 and 8 November calls.
3. Should the cart ever be ridden, as a taste of trains? **Recommended: no**; it previews freight, and the first ride
   stays the train's.
4. Your 10 November answer already gives spares a home: a yard at each halt, shared, taken where it lies. Is that
   still the drop box you mean, with finished frames simply packing away? **Recommended: yes**, and build the yards as
   decided (one bump) rather than turning every frame into a box.
