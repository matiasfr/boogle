> **Status: cleared to build by the design review below (12 November 2026); G1 and G2 are built, G3 to G5 and the
> checkpoint are not.** G2's stand does not fit as the review placed it: [G2 as built](#g2-as-built-12-november-2026). The next Ring
> Island item after greybox leg 1 step 3 (owner, 12 November: "yes, plain for now", "but prioritize the garage
> moment"). View only: no sim, wire or save change, no `WORLD_NS` bump.

# The garage's install moment

## 1. Goal

When steel is home, the longer boiler is installed at the Roundhouse table in the garage, with the designed moment
(the hold lifts the part, it drops, the engine answers), seen by whoever is there, instead of a bar on a grey post. It
ships at today's Home and carries over to the Home flip with one data row deleted.

Serves DESIGN.md **6. Communal world** (one install for the room), **7. Telegraph everything** (the part waits by the
table; the works copy wears the room's fit), **11. Show, don't tell** (the part going on says it, not a banner) and
**8. Enjoyable alone and together**. It bends none; one line it keeps short of is under [owner question 1](#owner-questions).

**Read for this.** `npm run map -- --kind interactable` (there is no `plan` kind; this is the nearest: a target for the
existing Interact) and its must-reads; DESIGN.md; [ring-island-build2](ring-island-build2.md) (V1 to V3 as built, call
18); [engine-garage](../brainstorms/engine-garage.md) (sections 4 to 6, Shape, "The install moment", its review); the
Current rules of [core loop](../decisions-core-loop.md#current-rules) and [rail](../decisions-rail.md#current-rules)
and the entries cited below; [home-station](home-station.md) steps 3 to 6 (the flip); [town-layout](town-layout.md)
(P1, "the Home flip moves under this plan"); [orchestrator-state](../agents/orchestrator-state.md) (the P3 leftovers);
agent-calls (the 12 November plain-hold row). Code: `src/entities/railway/garage-view.ts`, `garage-state.ts`,
`garage-data.ts`, `boiler-install-view.ts`, `roundhouse-view.ts`, `works-live.ts`, `train-view.ts`,
`shared-moment.ts`, `src/features/garage.ts`, `src/place/home-station.ts`, `src/sim/railway-works-layout.ts`
(`SHED_TABLE`), `src/world/railway-server.ts` (the reach check), `dev/look/bots/railway-steel.ts`,
`dev/loop/graph.ts`. `npm run loop -- node install`: no bill, no carries, requires `steelhome` (held by rules); its
cue names the grey post, which step G3 rewrites.

**Research.** [upgrade-economy](../research/upgrade-economy.md) rec 2 (an upgrade repays a visible inconvenience) and
[construction-sound](../research/construction-sound.md) rec 2 (each sound fired by the visible thing): used, as the
install spec uses them. Their top blocks were not re-read for this plan; it adds no new claim from research.

**Port from Place.** Nothing is ported; the crew figures are `garage-view.ts`'s own, already on main.

**In flight.** `npm run inflight` (12 November): four unmerged `ship/*` branches, none touching a file below.

## 2. What the player sees and does

| Beat | The one who installs | A friend at the table | A friend elsewhere |
| --- | --- | --- | --- |
| Before steel | The works copy of the engine stands on the table from the day the footing wagon coupled. The post opens the garage; Longer boiler reads "Needs steel" with the lighter Try it | The same | Nothing |
| Steel comes home | Orange blocks on the pallet (built). New: the long boiler lies on its stand by the jib, the two crew stand at the jib, the post's knob turns orange. The tile reads "Ready" | The same | Nothing |
| The hold | Interact at the post opens the garage on Engine, Longer boiler. Hold Install 1.2 s: the hold is the lift; letting go lowers it | Nothing until the commit (the hold is not shared: [call 9](#3-calls)) | Nothing |
| The commit | The part hangs over its seat while `rail.install` is out; the drop starts when the server accepts | A 0.4 s catch-up lift, then the same drop | Nothing |
| The moment | Drop, clank, hit-stop, bolts, steam, wheels run up, whistle, one full turn of the table, rows count to ink, "Installed". Skip from `c+800`. About 4 s locked | The same in the world on their own camera, at the table: no camera taken, no input taken. In the garage view: the same on the garage camera, and Back still leaves | The whistle, quiet, and the existing banner ("Longer boiler installed / Line 2's trains take it at the Village"). Camera and input untouched |
| The train takes it | Each line 2 train, standing at the Village (0.1 to 91 s after, measured in build 2): a puff covers the swap, a clank, a short squash, a toot. Riders keep their seats | The same | The same when they next see it happen; no card |
| The fitted train leaves | At 25 m/s, wearing the long barrel and tall chimney | | |
| A late join or a restore | Rows only: the copy wears the long boiler with its bolts, the stand is empty, the knob is green, trains wear what their rows say. No moment, no banner | | |

**Co-op rule held** ("never freeze a friend for someone else's find"; owner, 10 November: players away "keep their
camera, hear the whistle, and see the part go onto their train at Home"): the only camera or input taken is the
installer's own, from the commit to rest or skip.

## 3. Calls

| # | Call | Kind | Source |
| --- | --- | --- | --- |
| 1 | Hold about a second, the hold lifts the part, letting go lowers it, no dialog | Decided | [train upgrade screen, 10 November](../decisions-core-loop.md#d-2026-11-10-open-calls-answered-the-train-upgrade) |
| 2 | Players away keep their camera, hear the whistle, see the part go onto their train at Home | Decided | Same entry |
| 3 | Try it stays for parts you can't install yet, in a lighter form | Decided | Same entry. Built here: Try it loses the whistle and the table's turn |
| 4 | The table's engine is a works copy wearing every fit the room has; real trains take a fit at their next Home stop | Decided | [the train garage, 10 November](../decisions-core-loop.md#d-2026-11-10-the-train-garage-a-works-copy) |
| 5 | The longer boiler is free; anyone installs, for the room | Decided | 10 November; 6 November |
| 6 | Plain hold until the Home flip; the garage moment is prioritised | Decided | [12 November](../decisions-rail.md#d-2026-11-12-greybox-waits-and-build-2-answered). This plan ships the moment before the flip; the plain prompt goes when it lands ([question 2](#owner-questions)) |
| 7 | The garage mounts at today's table as well as layout B's, with its own placement row; the plain post becomes the garage's post | **New** | Replaces the 12 November agent call "the garage's install moment waits for the flip" |
| 8 | The works copy stands on the table always (from the wagon coupling), at rest on the bridge rails, solid; the bridge turns with it in the garage and in the show-off | **New** | Needed for call 4 to be seen, and for a friend at the table to see the install. Today it is drawn only while the garage is open |
| 9 | A friend does not see the hold, only the moment from the commit (a 0.4 s catch-up lift) | **New** | The spec's I11 shares the hold by presence: a wire addition, left out to keep this view only. [Question 3](#owner-questions) |
| 10 | The drop waits for the server's accept; the hang covers the wait; 2.5 s with no answer lowers the part with `deny` | **New** | Departs from the spec's "plays at once from the prediction": `rail.install` is not predicted (build 2, R4), and what is on screen stays true |
| 11 | A friend whose own install lost the race sees the winner's moment as theirs | Default | Spec, "The commit" |
| 12 | Players away get the existing room-wide banner as their note; players at the table or in the garage get none | Default | The banner is built; the spec's "small corner note" |
| 13 | The whistle carries room-wide, quiet at distance (`whistle`'s `hear` widened) | Default | Tunable |
| 14 | The platform beat is a puff, a clank, a squash and a toot inside the dwell; no crew at the platform, no departure-board line | Default | Spec I12, cut to what needs no new prop |
| 15 | No new sound recipes: clicks are `cordPull`, the rest `clank`, `thump`, `chuff`, `whistle`, `uiSound` as the Try it plays them | Default | Greybox order (11 November); the ratchet, creak and whoosh wait for the detail pass |
| 16 | No card for a late joiner or on first sight of a fitted train | Default | The Large card's words are the owner's; parked |
| 17 | After the install the old Boiler tile reads "Replaced" and cannot be put back | Default | "Cars are added or upgraded, never removed" (garage review, call 28) |
| 18 | The crew, the jib and the post's knob colours are the first build's lo-fi shapes | Default | "Some lo-fi is character" |
| 19 | Placement at today's table (section 5) | Default | Set at G2's still; the designer rules on the findings |
| 20 | "Cars it pulls 3 to 4" still lands as a readout with no fourth car to couple | Default, bends an open call | Build 2's call 16. [Question 1](#owner-questions) |

Six decided, ten default, four new. None of the new ones is a mechanic: no `/brainstorm` is needed.

## 4. Design

**Sync kinds. Nothing new is shared.**

| Piece | Kind | Authority | Where |
| --- | --- | --- | --- |
| `Shed.steel`, `Line.boiler`, `Line.fitted`, `Train.boiler`; op `rail.install { line, part, revision }` | Server (as built, v31) | server | unchanged |
| The garage, the hold's ring, the lift, the hang | Local | each tab | `garage-view.ts`, `src/features/garage.ts` |
| The moment for everyone | Local, from the accepted `rail.install` | each tab | `garage-view.ts` via `roundhouse-view.ts`'s `accepted` |
| The works copy's fit, the part on its stand, the knob | Local, from the rows | each tab | `garage-state.ts` `roomFacts` |
| The platform beat | Local, from each train row's `boiler` going 0 to 1 on a live tick | each tab | `train-view.ts` |

- **No sim, wire or save change; no bump.** No file under `src/sim`, `src/world`, `src/net` or `server/` is edited.
  The server keeps judging the install within 6 m of `SHED_TABLE`.
- **Why it works before the flip.** `createGarageView(owner, geo)` already takes its table and post as data. Today's
  table is `SHED_TABLE` itself, so a garage post 5.2 m from its centre is inside the server's reach. Layout B's table
  is 29 m away, which is why build 2 could not use it.
- **One predicate, both layouts.** `installHere = hypot(post, SHED_TABLE) <= reach - 0.4 m`. True at today's table
  now; true at layout B's table the day the flip moves `SHED_TABLE`. Where false (`?home=b` before the flip) the
  garage stays a Try it and build 2's plain prompt remains, so the preview still installs.
- **Controls.** No new action, pad slot, key, touch control or guide row. Interact opens the garage (`railway-garage`),
  Interact held is the hold, Interact is the skip, Back leaves: all as the Try it today. The prompt id
  `railway-install` survives only on the `?home=b` fallback.
- **Effects only from accepted edges.** The moment plays from `accepted(e)` for `rail.install`, never from a restore,
  rejoin or late join; `restore()` snaps the copy, stand, bolts and knob to the rows. The platform beat compares each
  train's last-drawn `boiler` with its row and plays only when the view has drawn that train before (a restore resets
  the memory).

**New or changed shapes (all view code).**

```ts
// garage-data.ts
type RoomFacts = { boilerFitted; wagonCoupled; tableBusy; steelHome: boolean; longFitted: boolean; boilerRev: number };
type Standing = 'installed' | 'free' | 'steel' | 'ready' | 'replaced' | 'later';
type Phase = 'idle' | 'holding' | 'moment' | 'rest' | 'undo';           // unchanged
// BOILERS.*.speed read BOILER_SPEED (src/sim/railway-train.ts); rowsFor(cat, chosen, fitted) so a fitted room's rows are ink.
// garage-geo.ts (new, pure)
type GarageGeo = { post: Polar; jib: Polar; stand: Polar; crew: [Polar, Polar]; camBearing: number };
export const GARAGE_GEO: { a: GarageGeo; b: GarageGeo };  // b is today's BEARING numbers, unchanged
export const installHere: (post: XZ) => boolean;
// garage-view.ts
createGarageView(owner, geo, deps: { restYaw(): number; install(rev: number): boolean; installHere: boolean })
// returns also: accepted(mine: boolean), deckYaw(): number | null, restore()
// GarageSnap gains: real (this moment is an accepted install), waiting (hanging for the server), canInstall
```

## 5. Level findings

`npm run level-check` on this branch's base (main at aa9a18881): exit 0, 12 reports, "place: ok", "ring (planned): ok",
machine clearance 0 problems, grounding 5,277 placements 0 problems, "track continuity: ok (18 tracks, 8 joins)". With
`BOOGLE_HOME=b`: the grounding and timber problems main already reports for B, nothing new. **The tool reads the
built layout and cannot take planned positions** (builds 1 and 2 found the same), so the rows below are arithmetic on
`layout.ts`'s lines and one top-down still of today's table taken for this plan
(`npm run look -- --rail-seed steel-home --cam 918,44,12.2 --look 918,18,12`). G2 repeats that still with the garage
drawn and adds the copy's footprint to `dev/level/` if a place check can take it.

Today's table: centre (918, 12), radius 4.8 m. Bearings clockwise from north. Line 1 leaves at 41°, line 2 at 135°,
the stall road at 225°. Line 1's platform lies north of its track and line 2's south of its track, both from the rim.
The breaker pedestal is at 9°, 6.7 m; the forge 10 m north. The east wedge (41° to 135°) is open grass holding the
steel pallet (72°, 6.0 m), the plain post (92°, 5.2 m) and a timber frame at 9.6 m east.

| # | Planned (`GARAGE_GEO.a`) | Found | Proposed |
| --- | --- | --- | --- |
| 1 | The works copy, 8.5 m, at rest along the bridge (seen at 41° to 221° in the `steel-home` still) | Its corners reach 4.4 m, inside the 4.8 m deck. A line 2 train stands with its tail at s 8.0 (halt s 17, 9.0 m behind), 3.2 m off the rim; line 1's at s 8.7. Nothing rolls over the table after the wagon couples ("Turn the table" is not offered again) | Accept. G2 asserts both tails in a test |
| 2 | **The fourth car** (decided, not built) | Its tail would stand at s 4.3 on line 2: 0.5 m onto the deck. Clear of a copy resting on the stall axis by 2.1 m; it would touch a copy resting along line 2 | Rest yaw is read from the bridge each frame, never assumed. The fourth-car step re-checks this; noted there, not solved here |
| 3 | The post stays where the plain post is: 92°, 5.2 m | Looked at in build 2's stills; inside the 6 m reach. The opening prompt keeps build 2's test (within 2.6 m of the post and 5.6 m of the centre), and the player is held while the garage is open, so every hold is sent from inside the reach | Accept |
| 4 | The jib at 120°, 5.8 m; the stand at 120°, 3.9 m | Layout B's 105° puts the jib 0.4 m from the `steel-home` jump landing (108°, 5.5 m). At 120° it is 1.5 m off line 2's centre (0.4 m off the sleeper ends), 1.2 m from the landing, 2.7 m from the post. The stand is on the stone deck, as in B's first build: the turning bridge's rails pass through its legs in the show-off | For the designer: accept the stand on the deck for now, or move it to 5.3 m (then the landing moves, a `src/world` edit with a review) |
| 5 | The crew at 116°, 6.6 m and 112°, 4.3 m | B's offsets (jib +18°) would stand one on line 2's rails. These are 2.1 m off the track and 1.2 m or more from the landing. No colliders | Accept |
| 6 | The garage camera from 180° (south), 10.8 m out, 2.7 m up | B's 15° puts the camera against the forge's front with the breaker pedestal 0.7 m off the sight line. From the east the player at the post stands in the middle of the frame and the camera sits over the timber frame. From the south the ground is open grass 3.8 m east of the stall's end; the forge and its crane are the backdrop; post, pallet and jib fall to the right. The camera crosses line 2's platform end, which is low | G2's still decides between south and east. The nose and side are picked so the camera lands nearest `camBearing` whatever axis the bridge rests on |
| 7 | The copy is solid: one static box per vehicle | A player standing on the deck when the wagon couples would be pushed out; after that the copy is always there. Nothing a player must reach lies across the table | Accept |
| 8 | **Reached before the ability that should gate it** | None. The garage opens once the boiler is fitted and the wagon has coupled; Install needs `Shed.steel >= 1`, judged by the server. No route, reach or ability is added | None |

<a id="g2-as-built-12-november-2026"></a>

### G2 as built (12 November 2026)

Measured on the build (`test/garage-geo.test.ts` pins them; stills in `.look/`, named in the hand-over). Bearings
clockwise from north, metres from the table's centre (918, 12).

| Piece | As built | Clearances |
| --- | --- | --- |
| The works copy | At rest along the bridge on the stall road's axis, nose at 45° (toward line 1). Two static boxes at that pose, which never turn: the engine 2.0 by 4.0 by 2.5 m (4.5 m long once the longer boiler is on), the car 2.2 by 3.2 by 0.8 m | Corners 4.4 m, inside the 4.8 m deck. Each box is added only once this tab's player is clear of it by 0.55 m |
| The post | 92°, 5.2 m (where build 2's plain post stood) | 0.4 m inside the reach the prompt keeps (5.6 m); 1.5 m from the landing |
| The stand | 118°, middle 6.5 m, along the radius, the barrel nose to the table: it spans 4.93 m to 8.08 m. Legs at 6.1 m and 7.6 m, 0.5 m either side of the axis (G2b, ruling R2) | Did not fit as first ruled (below); accepted as built by the [ruling](#design-ruling-on-g2-as-built-designer-2026-11-12). Its side overhangs line 2's sleeper ends by 0.34 m and passes 0.316 m from the landing point (the test's measure; first written as 0.33) |
| The jib | 118°, 8.4 m; mast 4.4 m, arm 10.6 m. Parked, the arm points along 100° from its mast, over the grass east-south-east; it points at the hook only while a part is in sight and through a moment (G2b, R3) | 2.5 m from line 2's centre. The arm reaches the engine's seat at any turn of the table (8.4 + 1.9 m) and clears the tall chimney (3.5 m over the grass) |
| The pallet | 64°, 7.0 m (G2b, R6; it was 72°, 6.0 m) | 2.8 m from line 1's centre |
| The crew | 121°, 9.4 m and 114°, 8.7 m, by the mast | 2.3 m and 3.1 m from line 2's centre; 3.2 m or more from the landing |
| The camera | From 85° (east), 9.2 m out, 2.7 m up (G2b, R4; first built at 100°) | Below |
| `TABLE_LAND` | Untouched: (923.2, 18.1, 13.7), asserted | |
| Train tails | Line 2 at s 8.0. Line 1 at s 5.0 by the catalogue (`halts[0].s` 14.0 m less `TRAIN_EXTENT.behindCm`), not the 8.7 of row 1: 0.2 m off the rim, 0.6 m from a longer boiler's nose at rest | Arithmetic on the catalogue; the tails assertion was dropped at the test review |

**The stand: finding 3's numbers do not fit, for the designer.** The review placed the stand radially at 5.6 m with
legs 0.9 m either side. The part that lies on it is the longer barrel, 3.15 m long and 1.25 m across (`engine.ts`), so
at 5.6 m its inner end is at 4.0 m, inside the copy's 4.4 m sweep, which is what call 24 forbids. With the inner end
off the deck (4.93 m) the barrel needs 1.78 m from line 2's centre at that end to clear the sleepers (bearing 113.8° or
less) and 0.98 m from the landing to clear a landing player (118.2° or more): no bearing does both, and anything
further out on the landing's own bearing stands in the jump-in camera. Built: the test-asserted rules first (4.8 m,
the landing untouched, every point off the sleepers), 118° as the even split of what is left. The overhang is over
track no train stands on (the tails stop at s 8.0) and 0.13 m clear of the rail. Choices for the ruling: accept; move
the view-only pallet and stand the part where it is (62° to 81° is free of both lines once the pallet goes, but that is
in front of the east camera); or stand it on line 2's far side, by the platform end.

**The reach proof (finding 2).** `dev/look/evals/garage-walk.ts`, forge door to the post, real time, the Mac at load
6.5 to 10 (the seconds are not evidence; the metres are). Today's straight walk over the empty deck (`stall-done`):
14.8 m, 2.7 s. With the copy solid (`steel-home`): the bot's own planner hops onto the flat car and over it, 15.9 m,
3.1 s, rising 0.91 m; sent round the engine's nose on line 1's track bed instead it walks 17.0 m in 3.3 s and rises
0.33 m, the same rise as that route with no copy (17.0 m, 3.1 s). So the copy adds about 2 m and well under a second
and needs no jump: the first car's box stays. The flat car can be stood on, like the wagon.

**The camera (finding 7).** East at 85°: the engine is clear from the wheels up and nothing meets the chimney, but the
stand and jib are out of frame (only the arm crosses the top) and the pallet fills the lower right. **100° is built:**
the waiting barrel on its stand is the left foreground under the arm, trolley and chain, the engine stands clear
right of centre, the post and its knob fall right of centre, nothing meets the chimney. What is wrong in it: the
barrel covers about a quarter of the frame and hides the car's wheels; the mast is out of frame; the pallet still
shows in the lower right corner; the engine is seen side on (the deck turns it only 3° from rest); no line 2 train
is in frame from any east camera at this distance (it stands behind the camera's left shoulder). South (180°),
taken for comparison: the engine three-quarter front and the stand in frame on the right, but the forge crane's mast
rises behind the cab and line 2's platform slab is the foreground. The camera row is one number
(`GARAGE_GEO.a.camBearing`).

**G2b, after the ruling (12 November).** One yaw by state on `armPivot`, as the ruling expected: it eases at 1.5 rad
a second (about 2 s for the swing), follows a part on the hook at 9, snaps on a restore, and a swing in on a live tick
plays one `cordPull` and one `clank` at the mast. The trolley and chain show once the arm is over the hook. The camera
stays at 85°: the nudge to 92° was not tried, since at 85° the frame already meets R5. Looked at:
`g2b-cam-waiting-still` (steel home: the engine clear from the wheels up, nothing at the chimney, the post and orange
knob low centre, the arm, trolley and chain in from the top left; the barrel's nose takes about a seventh of the
frame at the lower left and ends just short of the car; the pallet is a sliver in the lower right corner),
`g2b-cam-empty-still` (fitted: the arm out of frame, one stand leg and line 2's platform end at the left, the pallet
a corner), `g2b-top-parked-still` (the arm off the table over open grass, running out of frame to the east-south-east;
both legs outside 6 m) and `g2b-jump-still` (the jump-in's own camera: the player whole and in the clear with the
barrel alongside on the left, its near end large in the lower left; the mast and a crew figure's head are at the
frame's left edge and the timber cart at the lower right). Not seen: the swing itself in motion.

**What `wagonCoupled` means, and when the copy shows.** `wagonCoupled` is "some line 2 train row carries `wagon`"
(`garage-state.ts`). `deckK === null` is not the rest test: once the wagon has coupled `deckK` is never null again (it
is 0 at rest), and the coupling can land while the shunter is still backing over the deck. The copy shows when
`wagonCoupled` and the deck is at rest: no choreography turn (`deckK` null or 0), the table not turning, the shunter
home in its stall (`roundhouse-view.ts`, `restYaw`). First shown on a live tick: 26 steam particles along the train
and `whistle`; after a restore: no effect.

**Calls made building it (defaults, for the log).** The garage opens only once the copy stands (it used to open from
the boiler's fit, on an empty table). The jib and empty stand are there whenever the copy is; the crew from steel
home, and while the garage is open. The copy's wheels and chuff run only in the garage. The camera's side and the
copy's nose are picked from the bridge's rest so the deck turns least on opening; the engine shot's camera now lands
exactly on the row's bearing, which moves layout B's by about 10°. The hook takes the barrel on top at its middle,
and with no part in sight the arm rests over the stand. `GarageGeo` gained `mast`, `arm` and `standAlong` beside the
plan's fields; `restYaw()` returns null while the deck is not at rest.

**Not seen.** The copy's arrival on a live tick (the puff and whistle), a restore mid-shunt, a player on the deck as
the boxes arrive, the show-off turn at today's table, a second player, a phone. Not tested on a device.

<a id="g3-as-built-12-november-2026"></a>

### G3 as built (12 November 2026)

- **The intent path needed nothing outside views.** `adapter.installBoiler(revision)` was already there
  (`railway-intents.ts`); the garage calls it through `deps.install`. No adapter, sim, net, world or server edit.
- **The wait.** The completed hold sends `rail.install` on `Line.boiler` as this tab saw it; the moment's clock runs
  to `MOMENT.quiet` (180 ms) and holds there until `accepted(true)`; the hanging part sways and the button's ring
  breathes (`.garage-ui.waiting`). `MOMENT.answerBy` (2.5 s from the commit) with no answer, the adapter's
  correction for the install, an unsent intent or `adapter.read.ready()` going false lowers the part down the lift's
  own path (`uiSound('deny')`), and the hold can be made again at once: Back is free as soon as it starts down.
- **A real moment ends fitted**: no rest, no undo; the copy wears the rows. The whistle and the full turn are the
  real install's only (a Try it has neither).
- **Press-to-drop, measured** (`dev/look/evals/railway-install-act.ts`, `--real`, a local server, the Mac at load 10
  to 14, three captures): commit 1211 to 1219 ms after the press, the accept 14 to 15 ms later, the drop's start at
  1375 to 1385 ms, the hit at 1526 to 1537 ms. The designed figure is 1380 (1200 hold, 180 quiet): the wait cost
  nothing here. A real room's round trip is not measured; over about 180 ms it adds to the hang.
- **The camera's side is fixed** (G2's pick of a side is gone): seen from the other side the engine stood under the
  panel on the right, which the first capture showed. The engine shot now always has the engine on the left, three
  quarters from the front, so at today's table the deck turns the copy 92° on opening (nose to 137°, toward the
  stand), at a quarter turn a second. That replaces "the deck turns least".
- **The banner stays** in `boiler-install-view.ts` for a page whose garage is shut (the plan moved it to G4): without
  it a friend away would get nothing between G3 and G4.
- **A tab's own accept that lands after its hang gave up**, and anyone else's accept, just show in the rows for now:
  no moment. That is G4.
- **Labels.** "Install" (idle, and through the moment until the whistle), "Keep holding", "Installed" from c+1800
  with `uiSound('pop')`; the button's aria label "Hold to install". The "Trying it on" tag is not shown for a real
  install.
- **Looked at** (`g3-install-realtime.webm`, its 16-frame sheet and a 20-frame strip; `g3-cam-waiting-still`,
  `g3-cam-empty-still`): the hold lifts the barrel from the lower left across to the engine; the drop lands with the
  tile turning "Installed" and the knob green; the rows count (24 then 25 m/s, 14.4 then 15.3); "Installed" on the
  button at about 3.2 s; the engine turns once round between about 3.6 and 5.2 s and comes back to the pose; then the
  button is gone and the rows are ink. **Wrong in it:** the player and the post stand in front of the engine's front
  wheels and buffer in the garage's frame; the waiting barrel's nose covers the lower left eighth and the corner of
  the buffer; the pallet is a band in the lower right, more than a corner, partly under the parts strip; on the way
  over, the barrel passes close to the camera and hides the engine for about a third of a second; the stall's roof
  line sits behind the chimney's cap; the button reads "Install" for 1.8 s after the commit. Sound was not heard
  (a capture has none). Not seen: a deny, the 2.5 s timeout, a lost connection, a second player, touch.
- **The bot and the loop.** `railway-steel.ts` presses `railway-garage`, checks it opened on the Longer boiler ready,
  holds Interact until `Line.boiler` is 1, waits the moment out and closes the garage; its playthrough was not run
  (the checkpoint's). `railway-install.ts` (eval) does the same with a tap that must install nothing first: passed
  on `steel-home`. It waits 14 s first, because a player seeded into a room is shown each ability's flourish in turn
  (`ability-arrival.ts`), the last a small boiler over Buddy, which the first capture caught beside the engine.
  `npm run loop -- node install`: the cue names the garage's post; no rule changed.

**After the review of G1 to G3 (12 November; no P1, one fix before shipping).**

- **The engine stays at the opening pose while the Longer boiler is chosen and can be installed** (the reviewer's
  P2-1: after 17 s in the garage the Engine category's idle turn had carried the boiler, drop and bolts under the
  right-hand panel). No idle turn in that state; a table already turned (the player came from another tile) comes
  home at a quarter turn a second, through the hold too, and a real install's drop waits at the quiet until it is
  home. Looked at: `g3-dwell-install-realtime.webm` and its sheet, a 17 s wait and then the hold: the lift, drop,
  bolts, whistle and turn all left of the panel. The come-home from a turned table was not staged.
- **The button reads "Installed" from the hit** (it read "Install" beside an "Installed" pill until the whistle); the
  `pop` moved with it.
- **A part hanging for the answer rises 0.9 m over the designed hang**, clear of the boiler that is on, with the
  seat's ghost left showing under it; at 0.6 m it sat inside the old barrel and read as fitted. **"Keep holding" is
  shown only while the press is down**, not while the part lowers after a refusal or the timeout. Looked at
  (`g3-timeout-realtime.webm`, the reviewer's held-back wire): the part 0.96 m higher through the wait, lowered 2.5 s
  after the commit, the button reading "Install" on the way down.

**Left for G4 or a follow-up (from the review; not built).**

- A refusal runs the full 2.5 s: the adapter's correction for an unpredicted `rail.install` does not reach the view in
  time to end the hang early.
- A late accept, after the hang gave up, turns the tile to "Installed" with no moment.
- A socket drop in the middle of a moment shuts the garage on the reconnect (the restore).
- The barrel may blink off its stand for a frame after a deny.
- The phone frame (440 by 796): Install can be reached, but only the ghost boiler and the buffer show; it wants a
  portrait camera row. A real touch hold is untested.
- "Look at the engine" is the post's prompt even with the boiler ready to install: suspect copy for the owner.
- The framing ruled as built: the barrel's nose in the lower left, the player and post before the front wheels, the
  pallet's band, the barrel passing the camera in the lift. For G4 or the flip.

<a id="g4-as-built-12-november-2026"></a>

### G4 as built (12 November 2026)

- **Everyone else's moment.** `garage-view.ts` `accepted(own)`: this tab's hold, still hanging, drops as before;
  anything else is watched (`watch`). Whatever this tab was trying is dropped, the part lifts off its stand in
  `MOMENT.catchUp` (0.4 s) and the same moment plays: in the garage on the garage's camera with Back live, or with the
  garage shut out in the world, the copy turning about its rest for the show-off. A watched moment is never `mine`:
  no skip chip, no lock, and leaving the garage lets it play on in the world. The whistle's hearing range is 400 m.
- **The banner moved** to `roundhouse-view.ts` with the shared-moment mark: a page gets it only when its garage is
  shut and its player is more than 30 m from the table.
- **A refusal comes back at once.** Why it did not: the adapter's corrections are made only for predicted actions
  (something shown to give back), and `rail.install` is not predicted, so a refusal settled in silence and the view
  waited out its 2.5 s. `railway-session.ts` now has `onRefused`: an action that is not predicted and was refused, or
  acknowledged with no accepted event of yours in the packet. Local delivery only, in `src/adapters`; no wire, sim or
  server change. Staged out of reach: the part lowered 32 ms after the commit, and the retry installed.
- **A late accept** (after the hang gave up) plays the brief version: the catch-up lift, the drop, the bolts and the
  steam, ending at c+1950 with no whistle and no turn. Staged with the wire held back 3.5 s: seen in the rows of the
  run's log and its sheet.
- **A restore no longer shuts the garage.** An install in the air is settled by the rows on the next frame (fitted:
  the copy wears it; not: the part is back on its stand). Staged: a socket dropped during the hang, the garage still
  open 5.5 s later and the retry installing. A drop after the accept, mid-moment, was not staged.
- **The barrel's blink after a deny** was real: the lowering ended a frame before the idle rule put the part back on
  its stand. It is placed there in the same frame now.
- **The race.** Two tabs holding from the same server tick: the winner's moment is `mine`; the loser's hang is refused
  (the deny sound plays), then the winner's accept arrives and the loser watches it, not `mine`, and Back left the
  garage during it. The deny sound before the winner's moment is the one thing that does not read as "theirs".
- **Looked at** (`dev/look/evals/garage-two.ts`, two players, real time): `g4-two-motion.png` and
  `g4-two-realtime.webm`, the bystander's own camera 12 m east of the table: the barrel on its stand until the
  installer's commit, then gone from the stand, the engine wearing the long boiler, turning once round between about
  8.3 and 9.9 s, and the jib's arm swinging back to its park; the bystander's camera, position and input hold read
  the same before and after. It is small in that frame: the table is 17 m from the camera and the timber cart stands
  in front of the player. `p2-g4-two-still.png`, the installer's garage after: fitted, the rows in ink. Not seen: the
  catch-up lift itself (it falls between two frames of the sheet), a watcher inside the garage, a friend on the deck
  through the turn, sound.

<a id="g5-as-built-12-november-2026"></a>

### G5 as built (12 November 2026)

- `train-view.ts`, per train: when its own row's `boiler` goes 0 to 1 on a frame after the view has drawn it since the
  last restore, 18 bright steam particles at the chimney, the swap to the long body and barrel 0.4 s later with
  `clank`, a 0.18 s squash of the engine's group, `whistle` at 1.2 s. A restore or a late join clears the memory and
  shows the rows. No collider, seat, crew or departure-board change. Reduced motion: the swap only.
- The puff is drawn brighter than the train's own smoke (`readableIntensity`): at plain intensity a steam-coloured
  particle draws dark grey against the sky, which the first capture showed. The garage's own steam puffs
  (`steamPuff`, the copy's arrival) still draw that way; left for the detail pass.
- **Looked at** (`dev/look/evals/garage-platform.ts`; `g5-platform-realtime.webm`, `g5-platform-strip.png`, real
  time, the Mac at load 8 to 10): the first standard-boiler train ran in 48 s after the install; standing at the
  Village it wore the short barrel, a white puff rose at the chimney, and under it the engine was the longer one with
  the taller chimney. **Wrong in it:** the puff sits at and above the chimney, so the barrel's swap shows beneath it
  rather than behind it; the squash is too short to pick out at 6 frames a second; the whistle is the full 1.5 s
  one (no short recipe, call 15). Sound was not heard. Not seen: a second player, a restore during the beat.

### The phone frame (12 November 2026)

Held upright (taller than 1.15 times its width) the garage uses a portrait camera row: the engine shot stands further
back (15 m, 4.2 m up) and aims at the engine itself, so it sits whole in the band between the panel and the rail; the
other categories pull back 1.8 times along their own line. Looked at 440 by 796 with steel home (`g-phone-still.png`):
the engine with its ghost boiler, the post, the player and the waiting barrel's nose in the band, "Install" above
them. Wrong in it: the timber cart is under the camera and fills the frame's foot behind the rail and the parts
strip; the engine's nose points at the barrel, which covers the lower left. A real touch hold, the other categories
in portrait and the moment in portrait were not looked at. Not tested on a device.

## 6. Steps

Sizes: S under half a day, M about a day. Each step is one implementer and leaves `node dev/ship-check.ts` green and
the live install working. One proof look each; the full check, the bot and the two-player look are the checkpoint's.

- [x] **G1. The room's facts and a true tile (S).** Edit `garage-data.ts` (`RoomFacts`, `Standing`, `partsOf`,
      `BOILERS` from `BOILER_SPEED`, `rowsFor`'s `fitted`), `garage-state.ts` (`roomFacts` reads `shed(w).steel`,
      `line(w, LINE2).boiler`; the header's "nothing is read" line corrected), `src/features/garage.ts` (pass the fact;
      pill classes), `garage.css` (two pill colours), `test/garage-data.test.ts`. Longer boiler: "Needs steel", then
      "Ready", then "Installed"; Boiler becomes "Replaced". No install yet: the button stays Try it. This alone clears
      the leftover "the tile in `?home=b` still reads Needs steel". Tests: the three standings from three fact sets;
      a fitted room's rows carry no arrow. Proof: `npm run look -- --rail-seed boiler-long --query home=b --eval
      dev/look/evals/garage-open.ts`, the tile reading "Installed".
      **As built (12 November):** as planned. `boilerRev` is `Line.boiler` itself (what `adapter.installBoiler` is
      sent on). The Longer boiler is not tryable once fitted (no button). Looked at: `boiler-long` under `?home=b`,
      Longer boiler "Installed", Boiler "Replaced" struck through, rows 25 m/s, 4 cars, 2.9, 15.3 in ink with no
      arrow. Still wrong there until G2: the copy wore the short boiler with the yellow ghost over it.
- [x] **G2. The garage and the works copy at today's table (M).** As built: [below](#g2-as-built-12-november-2026). Create `src/entities/railway/garage-geo.ts`
      (section 4; `a` from section 5). Edit `garage-view.ts` (take the geo row; `restYaw`; the copy shown from
      `wagonCoupled`, wearing `longFitted`, bolts on when fitted; two static boxes through `addStatic(..., owner)`;
      the long boiler on the stand and the knob orange when `steelHome && !longFitted`, green when fitted;
      `deckYaw()`; `restore()`), `roundhouse-view.ts` (mount in both layouts; draw the bridge at
      `garageView.deckYaw() ?? tableYaw`; the `railway-garage` prompt uses build 2's reach test in layout A, and is
      not offered while steel waits uninstalled, so the plain Install prompt still owns that state until G3),
      `boiler-install-view.ts` (stop drawing its grey post, lamp and bar where the garage has a post; keep the
      pallet and the prompt). Still Try it only. Test: `test/garage-geo.test.ts`: `installHere` true for `a` and
      false for `b` against today's `SHED_TABLE`; every `a` point outside both lines' sleepers and off the landing;
      both train tails off the deck. Proof: the top-down still of section 5 with the garage drawn, and its numbers
      written back into section 5 as built. **Visual review** per `npm run models`.
- [x] **G3. The real Install (M).** As built: [below](#g3-as-built-12-november-2026). Edit `garage-view.ts` (`deps.install`; with `canInstall` the completed hold calls
      `install(facts.boilerRev)` and the moment's clock holds at `MOMENT.quiet` until `accepted(true)` arrives;
      2.5 s with none: the part lowers, `uiSound('deny')`; a real moment ends fitted, with no rest-and-undo; Try it
      skips the whistle and the turn), `src/features/garage.ts` (button "Install", "Keep holding", "Installed" with
      the pop at `c+1800`; opening lands on the Longer boiler when it is ready), `roundhouse-view.ts` (`accepted`
      forwards `rail.install` with `mine`; the garage prompt is offered in every state), `boiler-install-view.ts`
      (post, lamp, bar, prompt and banner only where `!installHere`; the banner call moves to G4),
      `dev/look/bots/railway-steel.ts` and `dev/look/evals/railway-install.ts` (press `railway-garage`, wait for
      `garage.api.snap().open`, hold Interact until `Line.boiler` is 1), `dev/loop/graph.ts` (the `install` node's
      cue text and file; no rule changes, so `npm run loop -- node install`, not `-- run`),
      `docs/game-design/place.md` (the V3 paragraph). Proof: `npm run look -- --rail-seed steel-home --video --eval
      dev/look/evals/railway-install.ts`, read in real time: press frame, first movement, the hit against the clank,
      and the rows `Line.boiler` 1 after. **Visual review.**
- [x] **G4. Everyone else's moment (M).** As built: [below](#g4-as-built-12-november-2026). Edit `garage-view.ts` (`accepted(false)`: any Try it or hold of this tab's
      is dropped, the part shows at the stand, lifts in 0.4 s and the same moment plays; in the garage view on the
      garage camera with input free and Back live; out of it, in the world, with no camera constraint and sounds
      placed at the table; the whistle with the widened `hear`), `src/features/garage.ts` (`leave()` allowed when the
      moment is not `mine`), `roundhouse-view.ts` (`playSharedMoment('longer boiler', ...)` with the banner only for
      a tab neither in the garage nor within 30 m of the table). Proof: one two-player look from `steel-home`
      (the look skill's comparison-multiplayer reference): one installs, the
      second stands 8 m off; the second page's video shows the drop and the turn with its own camera unmoved.
- [x] **G5. The platform beat (S).** As built: [below](#g5-as-built-12-november-2026). Edit `train-view.ts`: per train, remember the last drawn `boiler`; on 0 to 1 while
      the view has drawn that train before, emit the steam puff at the chimney, swap under it at 400 ms, `clank`, a
      180 ms squash of the engine group, `whistle` short at 1200 ms; reset the memory in `restore()`. No collider or
      seat change. Proof: `--rail-seed steel-home --video`, install by the eval, camera on the Village's line 2
      platform until the first train takes it (build 2 measured 0.1 to 91 s).
- [ ] **Checkpoint (the garage moment).** Proofs, and only these: `npm run check`; `npm run playthrough -- --from
      steel-home --to boiler-long` (the steel bot through the garage); G4's two-player look; one real-time capture
      of the whole install at desktop width for the owner (motion is judged in motion); `npm run perf` at the
      Roundhouse before and after, reported; one device run or the line "not tested on a device". Then ship; no bump,
      so no mid-session hold.

**At the Home flip (home-station step 6, not this plan):** `SHED_TABLE` moves with the flip's own bump; delete
`GARAGE_GEO.a`, the `installHere` fallback and what is left of `boiler-install-view.ts`'s post and prompt (its pallet
moves to B's bay); re-take section 5's still for `b`.

## 7. Now, and what truly waits for the flip

| Ships now, kept after the flip | Waits for the flip |
| --- | --- |
| The Install hold, the hang, the moment, the accepted-edge wiring, everyone else's view, the platform beat, the tile's truth, the works copy standing on the table | The table and the server's install point at layout B's spur end (a rules change) |
| `GARAGE_GEO.b` and `installHere` | The camera facing the open stall (garage review, finding 12b), judged at B |
| | The jib's final place at B's rim, inside the keep-clear for a grown Roundhouse |
| | Road 2 holding the fourth car beside the copy (finding 2) |

Thrown away at the flip: one data row (`GARAGE_GEO.a`) and the `?home=b` fallback prompt.

## 8. Risks

- **Room safety ("Don't").** No effect in a system; the moment and the beat play from accepted edges and row changes
  on live ticks, never on restore. A queued action is not success: nothing drops until the server accepts (call 10).
  No new op, field, presence or message.
- **Mixed builds.** None: no wire shape changes. An old tab still shows the plain post and installs through it; a new
  tab plays the moment for that install from the same accepted event.
- **A copy that lies.** The copy must wear exactly the rows outside a Try it, and a Try it is Local and tagged. G2's
  `restore()` and G4's drop of a running Try it hold that.
- **The hang on a slow link.** Up to 2.5 s of a part hanging. It reads as the designed quiet; the timeout is tunable.
- **Touch.** Build 2 found the Grab button's release does not reach the action's `up`. The garage's own button uses
  `touchHold`, which does; the checkpoint's capture includes one touch hold, or says it did not.
- **Hotspot files.** `roundhouse-view.ts` (845 lines; G2 to G4 in order, one branch), `train-view.ts` (G5 only),
  `dev/loop/graph.ts`. None is in flight.
- **Performance.** The copy is about a dozen meshes with shadows, always drawn at Home, plus two static boxes; the
  moment's particles use the pool (at most 40). `npm run perf` reports the cost at the checkpoint; it does not gate.
- **The bot.** The steel bot's last phase changes with G3; the checkpoint's playthrough is its proof.

## Open questions

Suspect or placeholder lines for the owner, none The Boogler's: "Ready", "Replaced", "Install", "Installed" (new
here); "Keep holding", "Hold to install", "Trying it on", "Look at the engine", the banner's two lines (on main); and
the tile's "It runs faster and pulls one more car." (question 1). "Bring logs or rails" and its family are the island's
and stay as they are.

<a id="owner-questions"></a>

1. **Ship the moment before the fourth car exists?** The readout lands "Cars it pulls: 4" and the tile says "pulls one
   more car" with nothing to couple yet.
   - **Yes, now; the fourth car follows as its own step and adds its coupling to the platform beat (recommended).**
   - Hold the cars row and that sentence back until the car is built.
   - Build the car first, then the moment.
2. **When the garage's Install lands, does the plain grey post go from the live game?**
   - **Yes: one place and one way to install; the post becomes the garage's (recommended).**
   - Keep both until the flip.
3. **Should a friend see your hold as you hold it** (the part rising, "Pip is installing the longer boiler")? It
   needs one small presence field, the only wire change this could have.
   - **Not now; friends see it from the commit. Add it with the second install (recommended).**
   - Now, as an additive presence field.

## Design review (designer, 2026-11-12)

**Verdict: cleared to build, with the changes under "What the build takes".** Nothing waits for the owner: no sim,
wire or save change, nothing irreversible, and the order is his ("but prioritize the garage moment").

**Read.** DESIGN.md; the 10 and 12 November entries cited in section 3, in full; agent-calls' garage rows (I9 to I26,
calls 17 and 21, the 12 November plain-hold row); engine-garage's install spec and both reviews; the top blocks of
[upgrade-economy](../research/upgrade-economy.md) (rec 2, used below in finding 6) and
[construction-sound](../research/construction-sound.md) (rec 2, "trigger sound from the visible accepted action":
supports call 10); `garage-view.ts`, `garage-data.ts` (`MOMENT`), `garage-state.ts`, `railway-jump.ts` (`TABLE_LAND`);
`npm run loop -- node install`. **Port from Place:** nothing new; the crew stays as ruled on 10 November (I13).

**Looked at.** Four stills of today's table from `steel-home` on fe04ff83b: the plan's top-down; the planned south
camera (918, 21, 22.8); the east camera (928.8, 21, 12); the approach from the north-east. **Not seen:** the garage,
the copy, the jib or the stand at today's table (none is drawn there yet), a train standing at either platform from
the two camera spots, anything in motion, a second player. Every placement below is arithmetic on the plan's numbers
and those stills; G2's still is the proof.

### The calls

Calls 1 to 20 are sorted as the plan has them, with these rulings and four added.

| # | Call | Kind | Ruling |
| --- | --- | --- | --- |
| 1 to 5 | As the plan | Decided | Agreed; the entries say what the plan says |
| 6 | Plain hold "for now"; the moment prioritised | Decided | The entry's "until the Home flip" is the orchestrator's framing; his words are "yes, plain for now" and "but prioritize the garage moment". Ending the plain hold early is call 7, logged, not a contradiction |
| 7 | The garage mounts at today's table; the plain post becomes the garage's | **New** | **Take it.** It is the only way to prioritise the moment without a rules change, and it costs one data row. See finding 1 for what is really thrown away |
| 8 | The works copy always on the table, solid | **New** | **Take it, with findings 2 and 3.** The table has had no play since "Turn the table" stopped being offered (10 November); the copy gives it a job and is the 10 November decision made visible |
| 9 | A friend sees the moment from the commit, not the hold | **New** | **Take it for this build.** No owner decision covers the shared hold (I11 is my open call, now deferred to the second install). No friend's camera or input is touched, so "never freeze a friend" holds. Finding 4 |
| 10 | The drop waits for the accept; 2.5 s lowers the part | **New** | **Take it.** A drop that could be untrue is worse than a hang. Finding 5 sets what keeps it from reading as a stall |
| 11 to 18 | As the plan | Default | Agreed |
| 19 | Placement at today's table | Default | Changed by finding 3 |
| 20 | "Cars it pulls 3 to 4" with no fourth car | Default | Ships. Finding 6 |
| 21 | The installer's camera and input are taken from the commit to rest or skip, about 4 s, skip from `c+800` | Decided | The shot rule (9 November) as engine-garage I5 and I21 record it; it is the installer's own choice, the world does not pause. With the wait of call 10 the worst case is 6.5 s; the lock must end on a deny, a timeout and a lost connection |
| 22 | The copy's first appearance on a live tick: behind one steam puff with a short toot, once the shunt is finished | Default | Added. Rolling it out of the stall is the detail pass |
| 23 | The copy's collider stays at the rest pose while the table turns; nobody is pushed, carried or moved | Default | Added. Finding 2 |
| 24 | Nothing fixed stands within 4.8 m of the table's centre | Default | Added. Finding 3 |

**Seven decided, thirteen default, four new.**

### Findings

1. **Call 7, and what goes at the flip.** Thrown away: `GARAGE_GEO.a`, its test rows, the `installHere` fallback, the
   camera bearing and section 5's still, and every placement this review rules on. Kept: all the behaviour. That is
   about a day of placement work spent twice, against the moment waiting for a rules change with its own bump. Worth
   it. Mixed builds are safe: the garage's post stands where the plain post stands.
2. **The solid copy (call 8) needs three things the plan does not have.**
   - **Reach is claimed, not proven.** The post is on the critical path and stands in the east wedge; an 8.5 m solid
     copy now lies across a 9.6 m deck between it and the village, with a platform slab at each end of the bridge
     (seen in the top-down still). From either platform the wedge is one track-crossing away, so nobody is stranded,
     but the walk from the village is not measured. G2 proves it: a walk from the forge door to the post with the
     copy solid, in seconds, with no jump. If it adds more than 3 s over today or needs a jump, the first car's box
     comes off.
   - **Never push or trap a player.** Add each box only once no player of this tab stands in it; no pop-out.
   - **Not before the shunt is done.** `wagonCoupled` alone may be true while the shunter is still backing over the
     deck; show the copy only when the deck is at rest (`deckK === null`), on call 22's puff.
   A friend on the deck during the show-off is passed through by the turning copy for 2.2 s. Accepted (call 23):
   moving them would be a sim change, and it is funny once.
3. **The copy sweeps the stand and one crew figure (changes section 5, rows 4 and 5).** The copy's corners reach
   4.4 m and turn a full circle in the show-off and at 6° a second whenever the garage is open on a turning category.
   The stand at 3.9 m (legs 0.9 m either side, the part lying at 0.85 m) and the crew figure at 4.3 m are inside that
   circle: the engine's nose passes through the waiting boiler on every half turn, in the hero shot. The plan saw only
   the rails through the legs. **Ruling:** nothing fixed within 4.8 m (call 24). The stand goes off the deck, lying
   along the radius (the part pointing at its seat) at about 120°, centre 5.6 m; the jib behind it at about 6.6 m with
   its arm lengthened to match; both crew rest spots at 5.0 m or more (they may step onto the deck to bolt and step
   back before the turn, as the spec has them). **No `src/world` edit:** `TABLE_LAND` (108°, 5.5 m) is the owner's
   jump-in landing and stays; the stand has no collider, and lying radially its edge is about 0.9 m from the landing
   and 0.1 m clear of line 2's sleeper ends. If G2's still shows that does not fit, the view-only pallet and post move,
   never the landing. The jib at 120° instead of B's 105° (the landing; a crew figure on the rails) is right.
4. **Call 9, co-op.** What a friend at the table gets before the commit: the part on its stand, the orange knob, a
   Boogle held at the post. What they lose is the anticipation. Fine for one install. Two things to hold: a friend in
   the garage whose own Try it is dropped keeps input and Back (as G4 says), and the loser of a race is never camera
   locked (their moment is not `mine`). The shared hold returns with the second install as an additive presence field.
5. **Call 10, feel.** The plan already lets the clock run through the designed 180 ms quiet and holds only at its end,
   so an accept inside 180 ms costs nothing; keep that exactly. Past it, the part must look held, not frozen: a slow
   sway on the hook and the ring pulsing, view only. After a deny or the 2.5 s timeout the hold can be retried at
   once. The checkpoint capture reports press-to-drop in a real room; over about 400 ms typical, say so.
6. **The fourth car.** The owner decided the car arrives with the install, in the step straight after build 2 (12
   November, answer 2), then put the moment first the same day. The readout already ships (build 2's call 16). So
   the moment goes first and the fourth car is the next Ring Island step after it, with nothing between: upgrade-economy
   rec 2 (an upgrade repays a visible inconvenience) is not met until something couples. Two notes for that step, not
   this one: the tail at s 4.3 stands 0.5 m on the deck, inside the copy's 4.4 m sweep and against the jib's side of
   line 2, so that step moves line 2's stop mark out (a rules change, its bump) and does not ask the garage to
   move; and the car's coupling joins the platform beat.
7. **The camera (section 5, row 6).** Both stills have a fault. South: the forge crane's yellow mast stands dead
   centre behind where the chimney will be, line 2's platform fills the lower right, and a train standing on line 2
   takes the right third. East: the open stall is the backdrop, which is what the garage review asked for (finding
   12b, said to wait for the flip; it need not), and the two standing trains frame it left and right; but the post and
   the installer sit low centre, over the wheels that run up in the moment, and the timber frame's capped post is in
   the bottom of the frame at 10.8 m. **Ruling:** try east first, at 80° to 90° so the post falls right of centre,
   clear of the timber frame; south is the fallback. G2's still passes when the engine is clear from the wheels up,
   the stand and jib are in frame, and no mast or post meets the chimney.
8. **Flow.** No route, reach or ability is added, so rules 1 to 3 hold apart from finding 2's proof. The next goal can
   be found: arriving on line 2 with steel, the 3.4 m jib and the copy stand at the rim beside the platform end,
   seconds from the pallet and the post (key in sight of the lock). Solo and late join are the same rows. Reduced
   motion keeps what the Try it already does (I25); G3 and G4 must not add a push, shake or turn outside it.

### Suspect and placeholder lines (for the owner; none rewritten, none The Boogler's)

- "It runs faster and pulls one more car." True by the rules, with nothing to couple until the fourth car.
- "Ready", "Replaced", "Install", "Installed": placeholders, ship as they are.
- On main already: "Keep holding", "Hold to install", "Trying it on", "Look at the engine", "Longer boiler installed"
  over "Line 2's trains take it at the Village".

### Owner questions

None blocks the build; each proceeds on its recommendation and is logged in [agent-calls](../agent-calls.md).

1. **Ship the moment before the fourth car?** Recommended and taken: yes, the fourth car is the very next step.
2. **Does the plain grey post go when the garage's Install lands?** Recommended and taken: yes, one place to install.
3. **Should a friend see your hold?** Recommended and taken: not now; with the second install.

### What the build takes

- **G1.** As planned.
- **G2.** `GARAGE_GEO.a` per finding 3 (stand radial at about 120°, 5.6 m; jib about 6.6 m; crew at 5.0 m or more);
  camera east first (finding 7). The copy appears only with the deck at rest, on a puff and a toot (call 22); each
  box is added only when the local player is clear of it; the collider does not turn. The test also asserts every
  fixed piece is 4.8 m or more from the centre and that `TABLE_LAND` is untouched. Proofs added: the village-to-post
  walk in seconds with the copy solid, and stills from the camera with a train standing on line 2.
- **G3.** The clock runs through the 180 ms quiet before holding; the hanging part sways and the ring pulses; a deny,
  a timeout or a lost connection ends the lock and the hold can be retried at once.
- **G4.** As planned; the proof also shows the friend on the deck during the turn (passed through, not moved) and a
  race where the second holder keeps camera and input.
- **G5.** As planned.
- **Checkpoint.** Report press-to-drop from the real-time capture. The fourth car is the next Ring Island step.

## Design ruling on G2 as built (designer, 2026-11-12)

**My finding 3 was wrong in its numbers.** I sized the stand by its legs (0.9 m either side), not by the 3.15 m by
1.25 m barrel that lies on it, so "radial at 5.6 m" put the barrel's inner end inside the sweep it was meant to
clear. The rule (call 24, nothing fixed within 4.8 m) stands; the placement is replaced by this ruling.

**Looked at** (the builder's stills on a46c987cf): `g2-top-still`, `g2-cam-still` (100°), `g2-cam-east85-still`,
`g2-cam-180-still`. **Not seen:** the arm parked, the barrel from 86° to 92°, the jump-in's first frame, anything
moving, the empty stand beside a car. Those are G3's stills, named below.

| # | Ruling | Kind |
| --- | --- | --- |
| R1 | **The stand stays as built:** 118°, middle 6.5 m, along the radius, the barrel nose to the table (4.93 to 8.08 m). The 0.34 m over line 2's sleeper ends and the 0.33 m from the landing point are accepted | Default |
| R2 | **The stand's legs must clear a car on line 2:** legs at 6.0 m or further out, no wider than 0.5 m either side of the barrel's axis, asserted in `test/garage-geo.test.ts` | Default |
| R3 | **The jib keeps its size** (mast 4.4 m at 8.4 m, arm 10.6 m) **but the arm parks off the table.** It points at the table only while a part waits (steel home, not yet fitted) and through the install; otherwise it is swung away from the table over the open grass east-south-east. It swings in over about 2 s when steel comes home on a live tick, with one `cordPull` and a `clank`; swings back after the show-off; snaps on a restore | Default |
| R4 | **The camera is 85°, not 100°.** The builder may nudge it to at most 92° if the barrel's nose then enters the left edge, takes a tenth of the frame or less and stays off the car's wheels; otherwise 85° | Default |
| R5 | **What the camera still must show:** the engine clear from the wheels up; nothing meeting the chimney; the post and its knob; with a part waiting, the arm in frame leading to the engine. Dropped: the mast in frame, the whole stand in frame, a line 2 train in frame | Default |
| R6 | **The pallet may move** (it is view only) within 60° to 75°, 6 to 7 m, so it is no more than a corner of the 85° frame | Default |
| R7 | The builder's own calls stand: the garage opens only once the copy stands; the jib and empty stand are there whenever the copy is; the crew from steel home; wheels and chuff only in the garage; the flat car can be stood on; the first car's box stays (the walk is 2 m longer, no jump); the copy shows on "coupled and the deck at rest" (the builder's test, not my `deckK === null`) | Default |

**Why, option by option.**

- **Accept the stand (the builder's option 1): yes.** Line 2 inside s 8.0 is track no train stands on, the barrel has
  no collider, and the landing is the owner's jump-in, not a place a player arrives at in play. The barrel and the
  fourth car never meet: the car arrives with the install, which takes the barrel off the stand. What is left is the
  empty stand, hence R2. At its inner end the barrel's axis is 1.39 m from line 2's centre, which a car's side (about
  1.25 m) all but touches; at 6.0 m it is 1.75 m, room for legs 0.5 m wide.
- **Option 2 (62° to 81°, the pallet moved): no.** A barrel whose top is about 2.1 m up, 3.6 m in front of a camera
  2.7 m up, hides the engine below about 1.2 m: the wheels that run up in the moment. It would force the south
  camera, which has the forge crane's mast behind the cab (seen in `g2-cam-180-still`).
- **Option 3 (line 2's far side, by the platform end): no.** That slab end is the walk from a line 2 train to the
  table; a barrel there is walked through or blocks it.
- **Along the rim or on end: no.** Along the rim needs 3.15 m of arc that the wedge only has where option 2 puts it.
  On end it fits (118°, 6.2 m) but stands 3 m tall half a metre off the jump-in's camera line and stops reading as a
  boiler waiting to go on.
- **The arm.** A mast behind a radial stand is 8.4 m from the centre and must reach a seat 1.9 m past it; no smaller
  jib does that, and there is no room for a mast at the rim beside the stand (the landing one side, the sleepers the
  other). So the size is kept and the fault is fixed in time, not space: the arm crosses the copy only while there is
  something to install. That also turns the crane swinging round into the telegraph that steel is home, seen from
  line 2's platform. `armPivot` already exists, so this is one yaw by state.
- **The camera.** `g2-cam-east85-still` is the best frame taken: the engine large and clear with the open stall
  behind it, the post and knob low centre, off the wheels. At 100° the barrel is a quarter of the frame and hides the
  car's wheels. The part is not lost at 85°: it comes in from the left along the arm that is already in frame.
- **The line 2 train condition** was there to catch a standing train blocking the frame. None is in frame from the
  east, so it is dropped.

**Fallback.** If parking the arm is more than a small edit, the arm stays fixed over the stand for this build and
that is logged as built; nothing else here depends on it.

**For the Home flip, not this plan.** Layout B's row has the stand at 3.9 m, inside the 4.8 m rule; the flip re-places
it. Line 1's tail stands 0.2 m off the rim (s 5.0, not the 8.7 of section 5's row 1): clear of the 4.4 m sweep by
0.6 m, accepted.

**What the builder changes (G3 carries it, or a small G2b first).**

1. `GARAGE_GEO.a.camBearing`: 100 to 85 (up to 92 under R4's test).
2. The stand's legs per R2, with the test.
3. The arm's park and swing per R3; the parked arm out of the garage frame or only at its top edge.
4. The pallet per R6 if it is more than a corner of the frame.
5. Stills: the garage camera with a part waiting and with the stand empty and the arm parked; the top-down with the
   arm parked; the `steel-home` jump-in's first frame (the barrel must not stand between the camera and the player).
6. Section 5 and "G2 as built" updated with the numbers as built.
