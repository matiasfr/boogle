> **Status: plan for the designer's review (12 November 2026). Nothing here is built.**

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

- [ ] **1. The data, the list and the level report (S).** `leg2-layout.ts`: the frames, every box above as named
      data (`LEG2.bell`, `.west`, `.gorge`), the reserves, pads and posts. `index.ts`: an `AREAS` list of `{ id,
      centre, build, signs }`, the Gorge first; signs by `signBoard`; `describe()` gains `bell`, `west`. `stack-at.ts`
      waits for the area within 380 m. `dev/level/route-leg2.ts` (`checkLeg2`, `printLeg2`, from `check.ts`): `flood`
      with `MOVER` over the boxes; asserts finding 2 and the reserves. Verify: `npm run level-check`; one Gorge look.
- [ ] **2. Bell Rock in the map data (S).** In `map-prototypes.html` replace `bell-land` with `bell-w` and `bell-e`
      (`poly` for `c`, `r`, `seed`, `rough`), point the shoal at `bell-w`, move the pinnacle to [-1024, -870]; run
      the generator. Verify: `git diff --exit-code src/sim`; `test/world-lines.test.ts`; the cut in one look.
- [ ] **3. Bell Rock, the lower level (M).** `massing-bell.ts`: the bed, platforms, lower deck, ramp, slipway, rock
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
