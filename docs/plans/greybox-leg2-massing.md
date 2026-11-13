> **Status: cleared by the designer (12 November 2026); steps 2, 1 and 3 are built (13 November), 4 to 6 are not. See
> "Build notes" at the end for where the build left the plan's numbers.**

# Greybox leg 2, the massing: High Gorge's incline platforms, Bell Rock, Home's West landing

**What leg 2 covers** ([greybox-route](greybox-route.md), section 3, row 2; area 5): the incline (`ns` row, High Gorge
to Bell Rock, 2 sections of 568 m) and the bay cut (`bay` row, West landing to Bell Rock, 2 of 604 m). Three places,
four halts: **High Gorge**'s `ns` halt, **Bell Rock**'s two (`ns` at 4 m, `bay` at 15 m), **Home's West landing**.
**Layout only** (owner, 12 November: playtest before much bespoke functionality is built; greyboxing continues).
**Out of scope, a later plan:** the `ns` and `bay` rules, the yard, frames, racks, `seeds`, barriers, levers, trains,
departure boards, seeds, jump rows, the loop node, the bot.

**Goal.** The owner can walk leg 2's three places in grey and judge the layout before any rule is written. Serves
DESIGN 7 (the next connection stands in the world) and 11 (the two levels explain the junction). Bends nothing.
**Research:** [level-design](../research/level-design.md) (big shapes to steer by: the pinnacle, the bridge) and
[route-contract](../research/route-contract.md) (a travel edge supplies no work), both used. **Port from Place:**
nothing. **Rail route:** no bill, supply or cue changes. **In flight:** no branch touches the files below.

## Design

**Sync kind: Local, all of it.** Static boxes and signs each tab builds for itself: no state, op, rule, message or
save, nothing under `src/sim`, `src/world`, `src/net` or `server/`, no `WORLD_NS` bump, no controls, no authority.
One instanced mesh an area with real bounds (P3), resident within 400 m and freed past 550 m (P1), as the Gorge's is.
**Track:** the catalog has these rows as alignment with nothing laid, so no rails are drawn: each place gets the
row's **unlaid bed** (a darker slab 7.6 m wide, 0.1 m under rail height), and sea spans are the rules plan's.
Platforms are the blockout's: 40 m, 4 m deep, centred on the stop, 5.8 m off the row, 0.9 m over the rail.

**Frames (world m).** *Bell Rock:* origin (−50, −850); `n` along the `ns` row, + south, unit (−0.0612, 0.9981); `e`
across, + east. The `bay` row meets it as two halves, in (back to the West landing, unit (0.855, 0.519)) and out (to
Canopy, (−0.934, 0.357)): `t` from the origin, `lat` square to it. *West landing:* `s` from the rows' root (801, 10)
along (−0.6155, −0.7881), stop at s 20. *Gorge:* massing.ts's `a`, `c`; `t` along `ns` (a 0.741 t, c 0.672 t), stop t 20.

**Bell Rock is cut in two in the map data** (the lower line runs at 4 m under a solid 14 m skerry): `bell-land`
becomes two `poly` lands, so the backdrop, `?blockout=world` and the 2D map all show the cut. Local m (x − 1000):
`bell-w` [[-1065,-751],[-1099,-757],[-1142,-774],[-1158,-806],[-1183,-839],[-1180,-874],[-1141,-896],[-1122,-930],
[-1087,-941],[-1053,-949],[-1057,-877],[-1072,-877],[-1076,-826],[-1061,-825]]; `bell-e` [[-916,-850],[-947,-820],
[-968,-796],[-981,-756],[-1033,-772],[-1046,-766],[-1034,-959],[-1025,-962],[-979,-948],[-972,-902],[-945,-880]].
The cut is e −9..9, widened to e −24 for n −26..26, and it is sea: decks stand on posts. **Tried today:** with this
edit the generator rewrote only the two HTML files; `src/sim` came out byte-identical and its two tests passed (18).

| Bell Rock piece | n | e (or t, lat) | Top y |
| --- | --- | --- | --- |
| `ns` bed; lower platforms east, west | −60..60; −20..20 (west from −28) | ±3.8; 3.8..9, −7.8..−3.8 | 3.9; 4.9 |
| Lower deck; the slipway from the sea | −26..26; −48 up to −28 | −24..−7.8; −7.7..−5.3 | 4.9; −1.4 to 4.9 |
| Ramp, 3 m wide, a parapet on its open side (5.4 in 10) | −5.6 up to −26 | −24..−21 | 4.9 to 15.9 |
| `bay` bed, two halves (a bridge over the cut) | t −4..70 each | lat ±3.8 | 14.9 |
| Upper platforms, four; their end ramps to the rock | in t −3..20, ramp to 24; out t −3..30, ramp to 34 | lat ±(3.8..7.8) | 15.9; to 14 |
| Upper deck; the ramp's landing; a step to the rock | −30..3; −30..−26; −15..−11 | −46..−24; −24..−21; −46 to −50 | 15.9; 15.9; to 14 |
| The rock, four hidden colliders inside the polys | −55..80; −77..−27; 27..82; −100..75 | −85..−25; −70..−10; −85..−10; 10..65 | 14 |
| The pinnacle, a hidden collider (22 × 18 m, yaw 0.4) | its map point, moved 6 m east | | 54 |

**Pads and posts (Ruling 2; every label a placeholder, none The Boogler's).** A pad is a 6 × 4 m pale outline with
one `signBoard`: `Stall: <place> (placeholder)` over `Not connected yet`. Lower deck: High Gorge (n −20, e −14), Ring
Island (n −12, e −14); 16.7 and 10.6 m from the ramp's foot. Upper deck: Home (n −22, e −34), Canopy Town (n −13,
e −34), Port Quay (n −4, e −34); 12.2, 17.4 and 24.8 m from its head. A post at the head (n −28, e −24): `Market
board (placeholder)`, inert. West landing, at the bed's sea end: `LINE TO BELL ROCK` / `UNDER CONSTRUCTION`.

**West landing** (Home's 3.0 m shelf under the commons' cliff): bed s 0..60, lat ±3.8, top 3.9; platforms s 0..40,
lat ±(3.8..7.8), top 4.9, on posts past s 20 where the ground falls under the sea; one end ramp, platform A's
(landward, lat +5.8), s 0 down to −4 at 3.0; an apron behind A, s 4..16, lat 7.8..11.8. **High Gorge:** two platforms
t 16..56, lat ±(3.8..7.8), top 3.9, on posts, in the Gorge's own mesh (lat −5.8 joins leg 1's south platform, lat +5.8
the barrier's pad); one dark unsolid box, 9 × 7 m, on the south wall at a 49.6, c 45, where the row enters the rock.

**Room left for the rules plan** (kept clear; the level report fails a box inside): each row's ±3.8 m; a 3 × 3 m
`seeds` spot on Bell Rock's lower deck (n −4, e −15) and the Canopy frame and barrier on the upper deck's south edge
(n −2..3, e −30..−24), their catalog points set with that plan's bump as `pick`'s was; each platform's homeward 3 m
(lever, board); the West landing's apron (rack, first frame); the `cave` row's corridor. No `Leg.laid` is read here.

**Files.** New: `src/entities/route-greybox/leg2-layout.ts` (pure numbers, no three.js), `massing-bell.ts`,
`massing-west.ts`, `dev/level/route-leg2.ts`. Edited: `massing.ts`, `index.ts`, `dev/level/check.ts`,
`docs/world/map-prototypes.html` and its generated page, `dev/look/evals/stack-at.ts`, `docs/game-design/place.md`.
**The way in, with no rules.** Looks: `npm run look -- --rail-seed stack-pick --eval dev/look/evals/stack-at.ts
--query 'stackat=x,y,z'` (exists; it stands the body anywhere). By hand: the West landing is a walk from the commons
at https://boogle.club/; Bell Rock and the Gorge by the DEV strip's Free cam (a camera within 400 m mounts an area).

## Steps

- [x] **1. The data, the list and the level report (S).** `leg2-layout.ts`: the frames, every box above as named
      data (`LEG2.bell`, `.west`, `.gorge`), the reserves, pads and posts. `index.ts`: an `AREAS` list of `{ id,
      centre, build, signs }`, the Gorge first; signs by `signBoard`; `describe()` gains `bell`, `west`. `stack-at.ts`
      waits for the area within 380 m. `dev/level/route-leg2.ts` (`checkLeg2`, `printLeg2`, from `check.ts`): `flood`
      with `MOVER` over the boxes; asserts finding 2 and the reserves. Verify: `npm run level-check`; one Gorge look.
- [x] **2. Bell Rock in the map data (S).** In `map-prototypes.html` replace `bell-land` with `bell-w` and `bell-e`
      (`poly` for `c`, `r`, `seed`, `rough`), point the shoal at `bell-w`, move the pinnacle to [-1024, -870]; run
      the generator. Verify: `git diff --exit-code src/sim`; `test/world-lines.test.ts`; the cut in one look.
- [x] **3. Bell Rock, the lower level (M).** `massing-bell.ts`: the bed, platforms, lower deck, ramp, slipway, rock
      colliders, two pads. Stills: from the west platform's north (lever) end at eye height; up the ramp from its foot.
- [ ] **4. Bell Rock, the upper level (M).** The bridge beds, platforms, end ramps, upper deck, step, the pinnacle's
      collider, three pads, the post. Stills: the in-half's landward platform (lever) end; **the profile** from 200 m north.
- [ ] **5. The West landing (S).** `massing-west.ts`: the bed, platforms, end ramp, apron, posts, the board. Stills:
      from platform A's root (lever) end along the row; from the commons' edge looking down; the way down walked.
- [ ] **6. The Gorge's incline platforms (S).** `massing.ts`: the two platforms and the portal box. Stills: from the
      lat −5.8 platform's root end (the portal, the barrier, the stair behind); step 4's "200 m out" again.

One sitting a step; each leaves `node dev/ship-check.ts` green and ends on its stills. **Checkpoint, once:** `npm run
level-check`; `stack-draws.ts` at each place; the stills on one sheet for the designer; `place.md`; no bots or `test:net`.

## Level findings

`npm run level-check` ran here today: **12 reports, none new**; one is leg 2's (`bay` kinks 52.2° at Bell Rock's halt).
It does not compose far islands, so the planned boxes went through its `flood` and `MOVER` in a script (step 1's report).

1. **Nothing is gated by geometry, on purpose** (route finding 3): a swimmer reaches Bell Rock's slipway and every
   pad and deck today, and finds nothing to take. Without the slipway the 14 m rock cannot be climbed from the sea.
2. **Reach, on foot and back.** From the lower west platform: both lower pads, the `seeds` spot, the ramp, the three
   upper pads, the lower east platform (over the bed, a 1.0 m kerb), the west rock. From the upper deck: all four
   upper platforms, the east rock and the pinnacle's foot (by the bridge only). From the West landing's platforms:
   the shelf and the commons 60 m east; that cliff counts as walkable (14.6 m in 10 m, under the mover's 1.52), so
   step 5's walk is the proof, and a plain grey stair the fix if it fails.
3. **The pinnacle overhangs the cut:** as mapped its west corner reaches e 4.9, four metres over the lower east
   platform's north end. Moved 6 m east it clears (N3).
4. **The incline's first 165 m is a tunnel.** The `ns` row enters the south stack at s 67 at 4 m and leaves at s 232,
   under 85 m of rock, through leg 1's hidden collider and the silhouette's solid mesh. The route plan names no
   tunnel here. The massing marks the mouth and bores nothing (N2).
5. **The Gorge's `ns` stop has no room behind it** (step 4's finding 5, measured). The leg's track starts at the stop
   (t 20); a train there reaches back 9 m (`TRAIN_EXTENT`) to t 11, off its own track and inside leg 1's south
   platform, which the row crosses at t 8.6 to 15.3. The platforms fit a train only with the stop near t 36 (N5).
6. **Smaller.** Bell Rock's upper platforms are mostly bridge and bend 52° at the stop. Home's `cave` halt point is
   under the sea at −2 m (leg 4's). The rock's rim past the hidden boxes is drawn and not solid, up to 25 m.

## Risks

- **Room safety, mixed builds:** nothing applies (no apply, effect, presence, wire, catalog or save). **Rendering:**
  no new material or light; real bounds; signs cast no shadow. **Plugins:** each area mounts and disposes through
  `OwnedView`, precompiled before it shows. **Hot files:** `map-prototypes.html` (the rules lane regenerates it: step
  2 lands first, alone), `route-greybox/index.ts`, `massing.ts`.
- **Frame cost, expected (reported, not a gate).** Home today (`npm run counts`, overview): **251 draws, 142 of them
  shadow; 504,288 triangles.** One area is resident at a time. West landing: about 20 boxes and 1 sign: +3 draws,
  about 250 triangles, under 0.1% of Home's. Bell Rock: about 60 boxes and 6 signs: +8 draws, about 800 triangles.
  Gorge: +21 boxes in its mesh, no draw, +252 triangles on leg 1's measured 7 draws and 21,364.
- **Live:** this ships to everyone; the West landing's grey platform stands on finished Home from that day (N4).

## Calls for the designer

**Decided:** grey, labelled, no character detail, live for everyone with an "under construction" board (calls 82,
84); Bell Rock on two levels, the bay line on top, its stalls views by a fixed table (43, 47, 48). **Default, as
ruled:** five labelled pads, two lower and three upper, within 30 m of the ramp, and an inert board post (52); 40 m
platforms both sides (27); nobody stranded, so a slipway. **Default, this plan's:** (a) the lower level keeps open
ground: the cut widens west into a 52 × 16 m deck, so the stall level rule stands; (b) the ramp runs up the cut's
west wall north of the bridge, 20 m at the Ring ramps' pitch, its head at the upper pads; (c) unlaid beds only, no
rails or sea spans until a leg lays them; (d) every pad reads "Not connected yet" until the rules plan.
**New candidates:** **N1** Bell Rock is cut through for the lower line, as two lands in the map data, and the cut
is sea. **N2** The incline starts in a 165 m tunnel through the south stack: keep the row and bore it, or move the
row. **N3** Move the pinnacle 6 m east; or keep it and shorten the lower east platform. **N4** A grey platform on
Home's west shore before its line has rules; or mount it in jump rooms only. **N5** The Gorge's `ns` stop moves to
about t 36, so a train stands on its own track, at the platforms. **N6** The upper deck stands 1.9 m over the rock
with a step down; or the west rock is filled to deck height.

**Open questions.** None for the owner. N2 and N5 change the catalog: the designer rules them before the rules plan.
Is Bell Rock seen from the West landing at 995 m, or lost in fog: step 5's still. **Suspect lines:** none.

## Design review (designer, 2026-11-12)

**Verdict: cleared to build, all six steps, with the six changes under "Changes the build takes".** Layout only, as
the owner asked on 12 November ("I think we should continue with the gray boxing work"; owner-calls on main,
"Playtest before bespoke functionality"). **Nothing in this plan edits `src/sim`, `src/world`, `src/net` or `server/`,**
and none of the rulings below adds such an edit: N2 and N5 are ruled here for the later rules plan, which carries the
catalog change and its bump. Step 2's `git diff --exit-code src/sim` is a gate, widened to `src/world`.
**Read:** [level-design](../research/level-design.md) (recs 3, 5, 6, 9), [route-contract](../research/route-contract.md),
[progression-flow-layout](../research/progression-flow-layout.md); the plan uses the first two and contradicts neither.
**Port from Place:** nothing. **Seen:** the plan's numbers, the catalog rows (`ns`: stops 20 m, 1156 m; a crossover at
s 55), `massing.ts`. **Not seen:** any still. Nothing is built, and one look at Home's west shore from the commons did
not return in this sitting; the West landing is judged from the map numbers only, so step 5's stills carry that.

**The owner's words that settle calls here** (relayed by the orchestrator, 13 November UTC; it records them in the
decision log):

- On N4: "So, I should think the gray under construction platform can appear on the live game".
- On greybox places in the shared room: "Yes, I think it should. In general, we should consider this like a live
  service game where we have a working game and then we're working on something in the background. We're fully in the
  midst of development and so we should make any changes on the live game so that when we playtest we're seeing
  everything live and everything that we've progressed on", corrected by him to "we shouldn't consider this like a
  liver service game*". Development is in the open: changes go on the live game.
- On jump rooms: "In general, I'm not a fan of the jump-in rooms as separate rooms. We should just have a live game and
  then we should maybe have a mechanism to fast-forward progress for testing in the game to move the server in the
  same room".

So no ruling here puts a greybox place behind a flag or in a test room, and N4's "jump rooms only" option is dropped.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 105 | Grey, labelled, no character detail; live for everyone with an "under construction" board | Decided | Calls 82 and 84; the owner's words above |
| 106 | Bell Rock on two levels, the bay line on top; stalls are views, by a fixed table, on the level of their line | Decided | Calls 43, 47, 48 ([12 November](../decisions-rewards.md#d-2026-11-12-cargo-trains-and-hub-towns-answered)) |
| 107 | Layout only; new bespoke mechanics wait until he has played leg 1 | Decided | Owner, 12 November |
| 108 | **N4** The grey "under construction" platform stands on Home's west shore in the live game | Decided | Owner, 13 November UTC, quoted above. No agent-calls row |
| 109 | Five labelled pads, two lower and three upper, within 30 m of the ramp; an inert board post; 40 m platforms both sides; a slipway | Default, as ruled | Calls 52, 27; route finding 3 |
| 110 | (a) The cut widens west into a 52 × 16 m lower deck | Default | Ship. Ruling 2's test ("if the lower level has no ground the level rule is dropped") is met: the stall level rule stands |
| 111 | (b) The ramp up the cut's west wall, 20 m, 3 m wide, its head at the upper pads | Default | Ship. Platform to platform is about 65 m, 12 s on foot; change 3 |
| 112 | (c) Unlaid beds only; no rails or sea spans | Default | Ship. Shows the before (level-design rec 9) |
| 113 | (d) Every pad reads "Not connected yet"; the pad boxes from `Leg.laid` wait for the rules plan | Default | Ship. Amends call 52's timing only: no leg row exists to read |
| 114 | The West landing's board, `LINE TO BELL ROCK` / `UNDER CONSTRUCTION`; all pad and post labels | Default | Placeholder text, none The Boogler's. Change 4 |
| 115 | **N1** Bell Rock is cut through for the lower line, two lands in the map data, sea in the cut | **New** | Yes, sea. Question 1 |
| 116 | **N2** The incline's first 165 m is a tunnel: keep the row and bore it | **New**, for the rules plan | Bore. Built here: the dark mouth only. Question 2 |
| 117 | **N3** The pinnacle moves 6 m east; the lower east platform keeps its 40 m | Default | Move it. Six metres does not show at 200 m; call 27 holds |
| 118 | **N5** The Gorge's `ns` stop moves to about t 36, its crossover with it | **New**, for the rules plan | Move it. Built here: the platforms at t 16..56. Change 6 |
| 119 | **N6** The upper deck stays 1.9 m over the rock, with a short ramp down | Default | Step, not fill: the fill is a second map edit to hide 1.9 m |
| 120 | The West landing's way down: walked both ways, and a plain grey stair if the way up fails | Default | Change 1 |
| 121 | The rock's rim past the colliders is drawn and not solid | Default | Accepted off the route only. Change 2 |
| 122 | The `bay` row's 52° kink at Bell Rock's halt: four straight platform halves for now | Default | The track plan clears it (route finding 1). Change 5 |

**Counts:** 4 Decided, 11 Default (1 as ruled before), 3 New. **Suspect lines of The Boogler's:** none.

### Findings

1. **N4, against what a leg 1 playtester sees at Home.** Decided, so this is what to watch. He sees a grey platform
   and a bed stub 60 m west of the commons pointing at open sea, for a line whose turn comes after High Gorge (call
   44). It serves DESIGN 7. The risk is one misreading: "this is the next thing to build", then a look for a rack that
   is not there. The board answers it if it is read on the way in, so it faces the commons (change 4).
2. **The West landing's cliff is 56° (14.6 m in 10 m).** The flood calls it walkable by 0.06. Going down is a slide;
   coming back up is the question, and this is finished Home where anyone can wander. Near-universal rule 3 (nobody
   stranded) is not left to a margin that thin.
3. **Reach is proven by the flood, not by a body, and not from the sea.** Finding 2 covers the platforms. It does not
   say a swimmer who falls into the cut on its east side gets out, or that every ramp foot lands on solid rock.
4. **The rim.** Up to 25 m of drawn rock that drops a walker into the sea reads as a bug to an owner walking it in
   grey. It is harmless where nobody is led and wrong at the feet of the end ramps, the step and the path to the
   pinnacle.
5. **The 52° kink binds leg 3, not leg 2.** Leg 2's `bay` train ends on the in half. Easing the bend later moves the
   bed south, away from the upper deck: about 11 m at a 100 m radius (arithmetic). The upper level round the origin
   is provisional and gets no polish.
6. **N2 and N5 meet at the Gorge.** Platforms to t 56, the tunnel mouth at s 67: 11 m. The row's crossover (s 55 today)
   has no open track to stand on once the stop moves. The rules plan decides: a crossover inside the bore, or a plain
   terminal. The first frame stays outside (the first railhead is at s 568; Ruling 1 keeps frames out of tunnels).
7. **The bore as a reveal.** A train from Bell Rock comes out of 8 s of dark into the 90 m split under 85 m walls:
   the strongest arrival on the route so far (level-design rec 3, shapes that block the view). Moving the row means
   leaving by the split's east mouth beside line 2 and curving round the stack. The cave line needs a covered stretch
   anyway (leg 4). The bore gates nothing: the `pick` barrier is at the frame, and a walker finds bed and then sea.
8. **Is Bell Rock seen from the West landing?** 995 m against fog opaque at 520 m. The pinnacle is the area's one
   tall landmark (rec 5) and the lure across the sea (rec 6). Step 5 reports it; this plan fixes nothing.

### Changes the build takes

1. **Step 5:** the way between the commons and the platform is walked **up and down** by a body at walk speed with no
   jump. If up fails, or takes more than one line, the plain grey stair ships in the same step.
2. **Steps 3 and 4:** every ramp foot, the step's foot and the walk to the pinnacle's foot land at least 6 m inside a
   collider. The level report prints the widest unsolid rim.
3. **Step 1's report** also asserts: from the sea on each side of the cut, the slipway is reached and the lower deck
   from it; from the West landing's platforms, the commons (once change 1 has its answer).
4. **Step 5:** the board stands where the walk in from the commons reads it before the platform is reached, facing
   east. No prompt, no rack, nothing to press.
5. **Step 4:** the upper platforms and the deck's south edge are marked provisional in `leg2-layout.ts` (one comment).
6. **Step 6:** the platforms at t 16..56 are built on call 118. If the owner reverses it, two boxes move.

### Cleared steps, in order, and what each still must show

**2, then 1, 3, 4, 5, 6.** Step 2 goes first and alone (the plan's own risk: the rules lane regenerates that file).

| Step | Its stills must show |
| --- | --- |
| 2 Map data | The cut from above or from 200 m north: two lands, sea between; `src/sim` and `src/world` unchanged |
| 1 Data and report | The level report's lines for leg 2 (reach, reserves, change 3); one Gorge look unchanged |
| 3 Lower level | From the west platform's lever end at eye height: the deck, both pads' labels readable, the ramp's foot in frame. Up the ramp from its foot: the parapet, the head. From the water at the slipway's foot |
| 4 Upper level | From the in half's lever end: the three pads, the board post, the ramp's head. The profile from 200 m north: two levels read as two, the bridge over the cut, the pinnacle clear of the platform. Looking down from the ramp's head to the lower pads |
| 5 West landing | From the commons' edge, eye height: the platform, the board readable, the way down. From platform A's lever end along the row: whether Bell Rock or its pinnacle is there. The walk, both ways, as frames |
| 6 Gorge | From the lat −5.8 platform's root end: the mouth, the barrier's pad, the stair behind, the join to leg 1's south platform with no step. Step 4's 200 m view again |

### Owner questions

Neither holds the build. Nothing here is direction, unapproved scope or irreversible: map data is two polygons.

1. **"Bell Rock is a solid 14 m rock and the lower line runs through its middle at 4 m. Cut the rock in two, with sea
   in the cut?"**
   - **Yes (recommended; built until he answers).** The junction's two levels are seen from the sea, the lower deck
     is a harbour in a cleft, and a swimmer has a way up.
   - No: the lower platform moves outside to the rock's foot, as rail-map first said; that is a catalog change.
   Answer: ___
2. **"The line from High Gorge to Bell Rock leaves through 165 m of the south stack. Tunnel through it?"**
   - **Yes (recommended; only the mouth is marked now, the bore comes with the line's rules).** A train from Bell
     Rock bursts out of the dark into the Gorge.
   - No: the line leaves by the split's open end and goes round the stack, longer and beside line 2.
   Answer: ___

## Build notes (implementer, 13 November 2026)

Steps 2, 1 and 3 are built. Where the build left the plan's numbers, for the designer:

1. **The rim is far wider than the plan says.** The level report measures drawn rock with no collider under it up to
   **68.5 m** from the nearest solid box (the east land's tip, world (83.5, -850.5)), about 11,800 m² in all, against
   finding 6's "up to 25 m": the four boxes stop at e -85 and e 65 and the two lands run to e -132 and e 134. The
   four boxes are built as planned; more boxes inside the outlines are a call for step 4.
2. **Three trims for the plan's own reserves** (the report fails a box in a row's ±3.8 m). The two upper platforms on
   the inside of the 52° kink start at t 2, not t -3 (their corners stood in the other half's bed). The West
   landing's platform B starts at s 2, not s 0 (its root corner stood 1 m inside the `cave` row's corridor, which
   leaves the same root). The Gorge's `ns` reserve ends at t 62, short of the mouth's mark.
3. **The rock colliders' faces on the cut are flush with the decks** (e -24, n ±26, e 9, not e -25, n ±27, e 10): the
   plan's left a 1 m slot behind the drawn wall along three sides of the lower deck.
4. **Change 2's "6 m inside a collider"** is measured to the nearest rim over 2 m wide: slivers under 2 m between a
   collider's edge and the outline at the cut's walls are not counted.
5. **Step 2 regenerates four pages, not two:** `rail-map.html` and `economy-prototype.html` embed the land list too,
   and their tests fail stale otherwise. `src/sim` and `src/world` are unchanged.
6. **A shared file the plan did not list:** `leg2-draw.ts` (layout pieces to boxes, posts, pad outlines and signs),
   for `massing-bell.ts` and step 5's `massing-west.ts`.
