> **Status: plan for the owner's and the designer's review (12 November 2026).** Nothing here is built. The next Ring
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

## 6. Steps

Sizes: S under half a day, M about a day. Each step is one implementer and leaves `node dev/ship-check.ts` green and
the live install working. One proof look each; the full check, the bot and the two-player look are the checkpoint's.

- [ ] **G1. The room's facts and a true tile (S).** Edit `garage-data.ts` (`RoomFacts`, `Standing`, `partsOf`,
      `BOILERS` from `BOILER_SPEED`, `rowsFor`'s `fitted`), `garage-state.ts` (`roomFacts` reads `shed(w).steel`,
      `line(w, LINE2).boiler`; the header's "nothing is read" line corrected), `src/features/garage.ts` (pass the fact;
      pill classes), `garage.css` (two pill colours), `test/garage-data.test.ts`. Longer boiler: "Needs steel", then
      "Ready", then "Installed"; Boiler becomes "Replaced". No install yet: the button stays Try it. This alone clears
      the leftover "the tile in `?home=b` still reads Needs steel". Tests: the three standings from three fact sets;
      a fitted room's rows carry no arrow. Proof: `npm run look -- --rail-seed boiler-long --query home=b --eval
      dev/look/evals/garage-open.ts`, the tile reading "Installed".
- [ ] **G2. The garage and the works copy at today's table (M).** Create `src/entities/railway/garage-geo.ts`
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
- [ ] **G3. The real Install (M).** Edit `garage-view.ts` (`deps.install`; with `canInstall` the completed hold calls
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
- [ ] **G4. Everyone else's moment (M).** Edit `garage-view.ts` (`accepted(false)`: any Try it or hold of this tab's
      is dropped, the part shows at the stand, lifts in 0.4 s and the same moment plays; in the garage view on the
      garage camera with input free and Back live; out of it, in the world, with no camera constraint and sounds
      placed at the table; the whistle with the widened `hear`), `src/features/garage.ts` (`leave()` allowed when the
      moment is not `mine`), `roundhouse-view.ts` (`playSharedMoment('longer boiler', ...)` with the banner only for
      a tab neither in the garage nor within 30 m of the table). Proof: one two-player look from `steel-home`
      (the look skill's comparison-multiplayer reference): one installs, the
      second stands 8 m off; the second page's video shows the drop and the turn with its own camera unmoved.
- [ ] **G5. The platform beat (S).** Edit `train-view.ts`: per train, remember the last drawn `boiler`; on 0 to 1 while
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
