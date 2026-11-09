> **Status: designer-reviewed (2026-11-09).** Planned against `c8a171fe` (world v22). Nothing here is built. The
> designer's rulings are folded into the steps ([Design review](#design-review-designer-2026-11-09)): option B, no
> breaker stand. **Build order:** steps 1 and 3, then 9, then 4 to 6, then 8; step 7 rides the next planned reset; step 2
> is the guard only.

# The boiler is the first upgrade choice

## Goal

Make fitting the boiler the first upgrade a player chooses: station 6 visibly waits for a train, the boiler is hauled to
the old train on the great beam's gold rope, and the fit gets the upgrade treatment (an instant press response, the
little guys bolting it on, one flourish for everyone, a mark that stays).

It serves DESIGN.md **6, Communal world** (one fit applies to everyone), **7, Telegraph everything** and **11, Show,
don't tell**, under the owner calls "Machines show their work physically" and "Input gets instant feedback". It bends
none. Sources: the owner's "Yes, boiler first" (9 November), the [upgrade-choices brief](../brainstorms/upgrade-choices.md)
(design review, smallest first build (b)), the rope call at the top of [decisions](../decisions.md#decided), and the two
P1 rows in [round-4 notes](round-4-notes.md#owner-session-9-november-desktop-live-build-ranked).

**Research:** [upgrade-economy](../research/upgrade-economy.md) recommendation 2 (an upgrade repays an inconvenience
the player has felt, and keeps paying) and its line that "a menu purchase followed by a sparkle is insufficient": used
for parts 1 and 4. [great-beam-clarity](../brainstorms/great-beam-clarity.md) (the frame shows the gap, the same gold
rope ties the gap and the carry, a friend's lift makes it level and fast): used for part 3, and its "take away before
adding" for part 1. [home-flow](../reviews/home-flow.md) verdict 2 and the "log rack beside Q6 reads as clutter" note:
part 1 gives that rack its meaning. Departure: the brief says "no `WORLD_NS` bump"; one optional step here (the pace as
room tunables, step 7) needs one, and is split out so everything else ships without it.

## What the code does today

- **Station 6 (Q6)** is `LINE2_STATIONS[5]`, `feed: 'train'`, bill 32 logs and 32 rails
  (`src/sim/railway-line2-layout.ts`). `cartServing` skips it, so the cart brings nothing. Line 2's train loads the kit
  at the village and unloads it onto Q6's rack and shelf at Far Head (`trainStep` in `src/sim/railway-systems.ts`,
  `kitServing`). The player still carries rack to frame.
- **Nothing refuses hand delivery before trains.** `deposit2` takes logs and rails at the active frame whatever
  `rail.trains` is; `forgeTake` hands out the forge rack's rails; `fundQ` starts the run when the bill is full. The
  frame's tag reads "Station 6, logs 0/32 rails 0/32" and the view unloads your back automatically within reach
  (`line2-view.ts`, "Auto-unload"). Taking rails by hand also starves the train's kit, which loads from the same rack.
- **The boiler** is one `Boiler` row (`src/sim/railway-world.ts`): `state` `none | pedestal | held | ground | fitted`,
  `holder`, `epoch`, `revision`, `x y z`, `age`. It appears on `LINE2_BOILER`'s pedestal when Q5 is laid. `held` rides
  on the back at full walking speed with sprint (no speed rule). A leaver's boiler goes back to the pedestal after
  `railBeamGraceS` (`maintainBoiler` in `server/src/host/world-host.ts` → `railBoilerRelease`). A dropped one lies on
  the ground inside `LINE2_BOILER_AREA` and returns to the pedestal after 21 untouched minutes.
- **The breaker** is `works.breaker` 0/1/2, set to 1 when Q6 is laid (`layLine2`), with the invariant
  `breaker > 0 ⇔ line2Completed ≥ 6` (`src/sim/railway-works.ts`). `WORKS_BREAKER` is the same point as `LINE2_BOILER`
  (91900, 540). `rail.breaker` and `rail.strike` are in the adapter's `NOT_MATERIAL` set and their rules ignore what
  you carry, which is how the owner struck a seam with the boiler on his back.
- **The great beam's rope** is view-only: `createBeamDrag` (`src/entities/railway/beam-drag.ts`) poses the trunk from
  the carrier's hip to a far end on the ground, `createRope` (`src/render/gold-rope.ts`) draws the rope to the hand
  socket, `line-cargo.ts` owns the help grip (presence field `railwayBeamHelp`, the holder's pid) and the pace
  (`prePhysics`: `me.wish × speed / 5.6`, sprint off) from `railBeamSoloSpeed` 220 and `railBeamHelpSpeed` 500. The
  server follows a held beam once a second (`railBeamStood`) and puts it down where the carrier last stood after the
  grace (`railBeamPutDown`).
- **The fit** is `rail.boilerFit` (not predicted): the holder within 8 m of `LINE2_OLD_TRAIN` presses "Fit the
  boiler"; on acceptance `rail.trains = tick`, both trains stand, `train-view.ts` plays the 3.1 s wake
  (`createWakePresentation`) and shows a boiler on each loco while `trains` is true. Nothing happens on the press frame.
- **The co-op flourish** (`ability-arrival.ts`) is a table: one row per ability with its op, its `has(state)` and a
  badge model. The finder is marked as shown; everyone else gets the puff, two notes and badge where they stand, live
  or once on their first landing. It never holds input.

## Design

### Sync kinds

| Piece | Kind | API | Authority |
| --- | --- | --- | --- |
| Boiler row, `rail.trains`, Q6's job, `works.breaker` | Server (replicated railway) | existing ops `rail.boilerTake`, `rail.boilerDrop`, `rail.boilerFit`, `rail.deposit`, `rail.forgeTake`, `rail.breaker`, `rail.strike`; host maintenance `railBoilerStood` and `railBoilerPutDown` (new, not ops) | The server |
| Where the hauled boiler is drawn, its rope, dust, scrape | Local | derived from the holder's smoothed avatar pose | Each tab |
| Who is helping haul | Owner | `addPresenceField('railwayBoilerHelp', …)`: the holder's pid or `null` | The helper's tab |
| The haul pace | Local movement from a shared number | step 6: constants in `railway-line2-layout.ts`; step 7: room tunables | The mover's tab; the number is the room's |
| The press response, the flight to the saddle, the bolting, the engine's lashing, the flourish, "what I've been shown" | Local | `adapter.onAccepted`, `adapter.inspect()`, `localStorage` through `createSeen` | Each tab |

No new op, no change to `CART`, no new component field. The railway is Server kind, so no lockstep op is added
(docs/agents/sync.md). Everything a player sees of the fit except the press-frame response hangs off the accepted
`rail.boilerFit` event or the `trains` fact, not off where the press happened: if the owner later lets choices be made
from a menu, the same bolting, flourish, late-join flourish and mark still play, and only step 8's press response would
need a second caller.

### Controls

None new. Interact (X/Square, `E`, the touch Interact button) takes, helps, lets go and fits; the existing big-cargo
drop (`bindBigDrop`: right click, R3, the touch Drop button) puts the boiler down. No pad slot, key or guide row.

### Words on screen

No new strings. The boiler's prompts become the beam's existing ones: **Pick up** (replacing "Shoulder the boiler"),
**Help carry**, **Let go**, and the blocked line **Empty your back first** from the prompt fix. "Fit the boiler" and
the haul HUD's "Boiler" stay. Proposed copy, built only if the owner approves it (open question 5):

- Q6's frame tag while it waits for trains: "Comes by train".
- A "You got" card for the player who fits it: name "Steam", line "Trains run both lines."

### Part 1: station 6 waits for the train

**Ruled: option B** (designer, 9 November; see the Design review). Both options start with the same view work (step
1), because the view's auto-unload would otherwise spam refused deposits under option B. The designer added three
things to the view, all while Q6 waits for the train:

- Station 6's depot rack offers no "Pick up". The rack often holds logs left over from Q5 (the owner took 24 off it in
  his 9 November session and deposited them in Q6); under B they would fill a back the frame refuses and the boiler's
  take then blocks. No rule change: `depotNeed` already counts rack stock as part of the kit.
- The first time a loaded player comes into reach, the rack sign bobs once and its loco puffs one steam puff, with a soft
  tick. One response per approach, no words. There is no press to answer (unloading is automatic), so this is what
  stops the refusal reading as broken.
- The sign is the old train's own locomotive (its tall chimney and cab, as the player has seen it rusting at the camp
  since the wake), its boiler a dashed gold outline (`GOLD_ROPE`), pulling one wagon heaped with a log icon and a rail
  icon; no number. It flips back to the log count when the first train unloads at Far Head, so the consequence teaches
  what it meant. While the boiler is hauled, the old train's empty saddle shows the same dashed gold outline (step 6),
  so the rope, the pedestal's motes, the sign and the saddle share one gold.

**Option A, view only (no rule change).** While Q6 is the active stretch, unfunded, and `trains` is false:

- Q6's frame tag is hidden, so nothing asks for "logs 0/32 rails 0/32".
- The sign over Q6's rack shows a locomotive pictogram instead of the count "0": a new `'train'` kind of `stockSign`,
  drawn on the canvas like the log and rail icons, with the boiler drawn as a dashed gold outline (`GOLD_ROPE`), the
  same gold as the pedestal's motes and the rope. Once trains run it goes back to the log count.
- The view stops auto-unloading at Q6's frame, and the forge rack's "Take rails" is not offered (nothing else uses
  rails then: the cradle comes after the breaker).

Cost: about 60 lines in `line2-view.ts` and `stock-sign.ts`, no `src/sim`, no review beyond the usual. Weakness: the
server would still accept a deposit, so the order is only as firm as the client; a second player on a stale tab, or a
bot calling the adapter, can still lay Q6 by hand.

**Option B, option A plus the rule (ruled: the plan).** In `src/sim/railway-systems.ts`:

- `deposit2` returns 0 when the active station has `feed: 'train'` and `rail.trains < 0`.
- `forgeTake` gives nothing in the same window (the rails stay on the rack for the kit).

Cost: two guarded lines, three unit tests, one host test, an independent review (`src/sim`). No state or wire shape
changes and no `WORLD_NS` bump. `fundQ` and `depotNeed` are untouched: "not fundable" was considered and rejected,
because a player could then haul 64 pieces and have nothing happen.

**A world already past this point** (both options): Q6 funded or laid before the fit is untouched; its boiler still
waits and can be fitted any time. Q6 part-filled by hand keeps what is in the frame (`depotNeed` subtracts `stock`, so
the first train brings only the rest); under B the frame takes nothing more until the fit. Rails already on a back can
be put down as a pile (`rail.drop`) and picked up after. Nothing breaks an invariant, so old saves load. If glider B's
v23 reset lands first, every world starts over anyway.

### Part 2: one thing per pedestal

**Ruled: no stand; the breaker stays on the pedestal** (designer, 9 November). The planner proposed moving the breaker
to its own stand 3.4 m south (91900, 200, y 1802), because the boiler can return to the pedestal after a bad drop, a
leaver or 21 minutes on the ground. Under option B that cannot meet a breaker: Q6 takes nothing until trains run, so it
cannot be laid before the fit, and the breaker is cast the tick Q6 is laid. A cast breaker therefore means the boiler
is fitted, and a fitted boiler never returns to the pedestal. Keeping one pedestal also keeps the forge rhythm ("the
forge made something, go home": rails, the boiler, the breaker, at the same spot under the same plume; home-flow
finding 3), and puts no new prop on an apron the owner's one-station Home redesign may move.

- You cannot take the breaker or strike a seam while you haul the boiler: the rules refuse it (`boilerHeld`), the
  adapter stops sending it (`rail.breaker` and `rail.strike` leave `NOT_MATERIAL`), and the view offers neither prompt.
  Under B this is a cheap guard for worlds started before step 3 shipped.
- The invariant `breaker > 0 ⇔ line2Completed ≥ 6` is unchanged. An op-level test pins the new consequence: a cast
  breaker means trains are on.
- **When the stand comes back:** if option A replaces B, or a later fork lets trains be skipped or reordered, the two
  can share the pedestal again; then build the stand, sited by the Home station layout, not at (919.0, 2.0).

A world already past this point (started before step 3): a cast breaker and a waiting boiler can still share the
pedestal, as in the owner's session; the guard stops the strike-while-hauling half of it.

### Part 3: the rope

**State.** The `Boiler` row is unchanged. `held` now means "on `holder`'s rope". While held, the server writes where
the holder stands into `x y z` once a second, exactly as it does for the beam.

**Rules** (`src/sim/railway-systems.ts`, mirroring `beamStood` and `beamPutDown`):

- `railBoilerStood(w, pid, x, y, z): boolean`: phase `'boiler'`, order 1; writes `x y z` when held by `pid` and changed.
- `railBoilerPutDown(w, pid): number`: phase `'boiler'`, order 2; when held by `pid` and `boilerReleasable`, calls
  `boilerPedestal(w)` then, if `line2BoilerGround(x, y, z)` of the last stood point, sets `state: 'ground'` there.
- `railBoilerRelease` and its `boilerRelease` system are deleted (the host was its only caller).
- Take, drop and fit are unchanged. A take still needs an empty back and no beam or footing.

**A drop.** The existing Drop input sends `rail.boilerDrop` with the point where the boiler is being drawn (it trails
within the server's 3.2 m of the holder), so it stays where you saw it. Outside `LINE2_BOILER_AREA` it returns to the
pedestal, as today.

**A leaver.** The beam's rule (owner, 6 November: "you keep your load, or it goes down where you stood"): back within
`railBeamGraceS` (180 s) they still hold it (`railSession` already moves the epoch); past it the boiler is put down
where they last stood, or on the pedestal if that is outside the area. Then anyone may take it, and it still returns to
the pedestal after 21 untouched minutes.

**The view.** `createBeamDrag` gains an options argument so one module poses both loads:

```ts
export type DragShape = { length: number; radius: number; scrape: PlaceCue; drop: PlaceCue };
export const BEAM_SHAPE: DragShape = { length: 5.4, radius: 0.24, scrape: 'beamScrape', drop: 'beamDrop' };
export function createBeamDrag(world, mesh, ground, ropeMaterial, shape: DragShape = BEAM_SHAPE)
```

`BEAM_LENGTH` stays exported (`line-cargo.ts` reads it). The boiler is a short, fat rod on the same rope: its nose
hangs at the hauler's hip, its tail drags and scuffs, the rope runs from the hand socket to the nose, the hauler takes
the `beamGrip = 'rope'` pose and a helper `'lift'`, and with help it rides level between two shoulders. Its `length`
and `radius` are measured once from the model (`new THREE.Box3().setFromObject(makeBoiler())`: the long horizontal
extent, and half the height), and the model sits in a group whose +Z is that long axis. It reuses the beam's scrape and
drop sounds.

**On a slope, a deck or a train.** The beam's `ground` is the terrain `H`, which is wrong for the boiler's route over
line 1's raised deck and the bridge. The boiler's ground function is

```ts
const support = (x: number, z: number) => (H(x, z) >= feetY - 1.2 ? H(x, z) : feetY);
```

where `feetY` is the hauler's feet height that frame (`avatar.position.y - PLAYER_R`). On a hillside the terrain is
within 1.2 m of the feet and the tail follows the slope; on a deck, a bridge, the machine's deck or a train car the
terrain is far below and the tail rides at feet height, on the deck. Before the fit nothing a player can ride is
moving on the haul route (the trains are cold and the cart serves no train-fed stretch), so a moving deck is an edge
case this rule covers without special code. A hauler cannot glide (`glide.ts` already keeps the canopy shut).

**Help.** A new small module, `src/entities/railway/help-carry.ts`, holds the pattern that `line-cargo.ts` and
`footing-view.ts` each wrote by hand:

```ts
export function createHelpCarry(field: string, o: {
  holds: (pid: string) => boolean;      // is this pid carrying the thing now
  canHelp: () => boolean;               // my back and hands are empty
  avatarOf: (pid: string) => THREE.Object3D | null;
}): { helping(): string | null; start(holder: string): void; stop(): void; valid(): boolean;
      helperOf(holder: string): THREE.Object3D | null; dispose(): void }
```

Same numbers as the beam: within 5 m flat and 2 m of height, a remote's claim goes stale after 1.5 s, the presence
value is the holder's pid (at most 64 characters) and is `null` when not helping. Only the boiler uses it in this job;
folding the beam and the footing onto it is a note for the daily tidy, not part of this plan.

**Pace.** Solo and helped speeds are two numbers the designer picks. Proposed defaults: **300 cm/s solo, 540 cm/s
helped**. The beam is 220 and 500; free walking is 560. The haul from the pedestal to the old train is about 185 m
along the bot's route (179 m straight):

| Solo pace | Haul time | Note |
| --- | --- | --- |
| 220 (the beam's) | 84 s | |
| 260 | 71 s | |
| **300 (proposed)** | **62 s** | 36% over the beam |
| 340 | 54 s | |
| 540 helped (proposed) | 34 s | just under a free walk, so help never beats walking empty |
| 560, today on the back, sprint allowed | 33 s or less | what the rope replaces |

Step 6 ships the pace as `LINE2_BOILER_HAUL = { solo: 300, help: 540 }` in `src/sim/railway-line2-layout.ts`, read
through `railMovement` like the beam's. Step 7 turns the two numbers into room tunables `railBoilerSoloSpeed` and
`railBoilerHelpSpeed`; that is the plan's only saved-shape change (below).

### Part 4: the fit

- **Press** (the holder, within 7 m of the old train, "Fit the boiler"): on the press frame the boiler leaves the
  rope and arcs to the empty saddle in 0.45 s (apex 0.8 m), the rope drops away, a thump sounds at the hauler and a
  clank and dust ring at the saddle as it lands. It then sits in the saddle until the answer comes.
- **Accepted** (`rail.boilerFit` arrives, for every tab): the flown boiler is swapped for the engine's own (already
  driven by `trains`), two of the camp's little guys run to the loco and hammer at the saddle for about five seconds
  (the sparks and taps `folk.ts` already makes), and the existing 3.1 s wake plays. The fitter's flourish is this
  moment; they get no card unless the owner approves the proposed copy.
- **Refused or no answer** (`onCorrected` for that request, or 1.5 s with nothing pending and `trains` still false):
  the boiler hops back onto the rope in 0.3 s with `uiSound('deny')`.
- **Everyone else in the room**: one ability flourish where they stand (teal puff, the pickup's two notes, a small
  boiler popping up over Buddy for 1.5 s). It never holds input.
- **A late joiner**, or a friend who was away: the same flourish once, on their first landing, recorded per room in
  `localStorage` by the existing `createSeen`. A reload gives no second one.
- **The mark**: the gold rope it was hauled on stays lashed round the fitted boiler, two gold rings and a knot on each
  loco's boiler, drawn whenever `trains` is true. So it is there after a reload and for every later visitor. The rings
  sit a few centimetres off the boiler's surface (the owner already reported z-fighting on the engine); the engine's
  visual pass inherits the lashing as a requirement.

Only the holder can press, and a second accepted fit is impossible (`rail.trains >= 0` returns 0), so "two presses in
one tick" reduces to the holder double-pressing: the second is a no-op.

### Saved and wire shape

| Step | Change | Bump? |
| --- | --- | --- |
| 5 | Two host maintenance calls replace one; no op, no field | No |
| 6 | One new presence field, `railwayBoilerHelp` (additive; a tab without it shows nobody helping) | No |
| 7 | `TUNABLES` gains `railBoilerSoloSpeed` and `railBoilerHelpSpeed`, appended. `loadTune` rejects a save whose key count differs and `hashTune` folds every key, so an old save cannot load | **Yes** |
| all others | None | No |

Step 7 never bumps on its own. It rides the next bump: glider B's v23 if that has not shipped (add the two keys to
v23's history line in `src/world/namespace.ts`), otherwise the next one that is already planned (part 2 of the
"Call cart to forge" cut is waiting for the same thing). Never a second reset on the day v23 ships, and never while the
playdata shows the owner in a session.

## Steps

Each step ships on its own and leaves `npm run check` green. **Review** marks the steps that touch `src/sim`,
`src/world` or `server/` and need an independent review. Steps 1, 6 and 8 edit `boiler-view.ts` and `line2-view.ts`
and start after the boiler prompt fix (`worktree-agent-a2a60dbcf837da4a3`) is on main; steps 2, 3 and 5 edit
`railway-systems.ts` and `world-host.ts` and rebase onto the lockstep fixes (`worktree-agent-ab58edf2110b2b435`) if
those land first. Log every default taken in `docs/agent-calls.md`.

**Build order** (designer): steps 1 and 3 first (the P1 order fix, with the rack fix), then 9 (independent and small),
then 4 to 6 (the owner's rope call), then 8 (it flies step 6's hauled boiler). Step 7 rides the next planned reset.
Step 2 is the guard only and can ship with step 3.

### Stage A: order and the pedestal

- [ ] **1. Station 6 shows it waits for the train (view).**
  - `src/entities/railway/stock-sign.ts`: `stockSign(owner, kind)` returns `{ sprite, set(n), show(kind), nudge() }`;
    add the `'train'` drawing: the old train's own locomotive side-on (its tall chimney and cab, matching
    `train-view.ts`'s loco silhouette) in `#edcf8c` line work, its boiler a dashed `GOLD_ROPE` outline, pulling one
    wagon heaped with the existing log icon and rail icon; no number. `show` redraws only on change. `nudge()` plays
    one bob of the sprite and one small steam puff from the drawn chimney (under `reducedMotion`, the puff only).
  - `src/entities/railway/line2-view.ts`: add `const trainOwed = (l) => l.active >= 0 && LINE2_STATIONS[l.active]!.feed
    === 'train' && !l.trains && l.stations[l.active]!.start < 0`. In `drawDepot`, key the cache on it too and call
    `depotSign.show(trainOwed ? 'train' : 'logs')`; the sign returns to the log count when trains run, so the first
    kit's unloading is the moment it flips. In the frame loop pass `now && k === l.active && job.start < 0 &&
    !(trainOwed(l) && k === l.active)` to `frame.setTag`. In the auto-unload block return before the Q deposits when
    `trainOwed(l)`. In `targets()` skip `railway-forge-rails`, and the depot rack's `railway-depot-logs` and
    `railway-depot-rails` at Q6, when `trainOwed(l)`. **Arrival response:** when `trainOwed(l)` and the local player
    enters the auto-unload reach of Q6's frame carrying logs or rails, call `depotSign.nudge()` and a soft tick
    (`uiSound('tick')` or the quietest existing UI cue; not `deny`) once; re-arm only after they leave reach. Add
    `trainOwed` to `inspect()`.
  - `docs/game-design/place.md`, "Trains come last": say the frame and rack wait for the train, the sign, the arrival
    nudge and the flip.
  - Verify: `npm run look -- --rail-seed q5-done --eval dev/look/evals/railway-b5b8-at.ts --query 'b58at=q6'
    --question "Does station 6 read as waiting for a train, with no bill asked for?"` and the same with
    `--rail-seed trains-on` (tag and log count back). **Seed leftover rack stock** for the first still (in the eval
    or a seed variant, put 24 logs on the depot rack, as in the owner's session): the rack shows its logs, no "Pick up"
    is offered there, and `inspect()` shows `trainOwed`. Walk in carrying rails: one nudge, nothing unloads. Open the
    stills. A second still from the normal approach along the deck: `--query 'b58at=head'`. **And a look the designer
    could not take:** from Far Head (`b58at=head`), aim at the forge apron (919, 18, 5) just after Q5 is laid: is the
    forge's call plume visible against the tree line? Say plainly if it is not (progression-flow-layout rule 1).
- [ ] **2. No breaker and no strike while hauling the boiler (the guard; no stand). Review (`src/sim`).**
  - The stand is not built: under option B a cast breaker means the boiler is fitted, so the two never share the
    pedestal in a world started after step 3 (Part 2). It comes back only if option A replaces B or a fork lets trains
    be skipped, sited by the Home station layout. `WORKS_BREAKER` and `test/railway-works-layout.test.ts` stay as they
    are.
  - `src/sim/railway-systems.ts`: `breaker` and `strike` declare `reads: [Account, Boiler]`, take `{ a: aid }` and
    return 0 when `boilerHeld(w, w.get(Account, aid)!.pid)`.
  - `src/adapters/railway.ts`: remove `'rail.breaker'` and `'rail.strike'` from `NOT_MATERIAL`.
  - `src/entities/railway/breaker-view.ts`: return no targets while `s.line2.boiler.state === 'held' &&
    s.line2.boiler.holder === s.pid`.
  - `test/railway-works.test.ts`: "no breaker and no strike while hauling the boiler" (a doctored state with the
    boiler held and the breaker cast, standing for a world from before step 3: `rail.breaker` returns 0 for the holder
    and 1 for another player). With step 3 in, an op-level test that a cast breaker means trains are on: drive a world
    through ops from `q5-done` to Q6 laid and assert `breaker > 0` only once `trains >= 0`.
    `test/railway-adapter.test.ts`: `takeBreaker()` and `strike(0)` return false while you hold the boiler.
    `server/test/railway-works-host.test.ts` must pass unchanged.
  - Verify: `npm run check`; `npm --prefix server test`.
- [ ] **3. Station 6 takes nothing before trains (option B, ruled). Review (`src/sim`).**
  - `src/sim/railway-systems.ts`: add `const trainOwed = (w: World) => { const k = qActive(w); return k >= 0 &&
    LINE2_STATIONS[k]!.feed === 'train' && w.get(Rail, railId(w))!.trains < 0; }`. In `deposit2`, after the forge
    branch: `if (trainOwed(w)) return 0;` (`deposit2` already writes `Rail`). In `forgeTake`, before
    `room` is used: `if (trainOwed(w)) return 0;` (`forgeTake` already reads `Rail`).
  - `test/railway-boiler.test.ts`: from `railwayAtTrains('boiler')`: `rail.deposit` of logs and of rails at Q6 returns
    0 and `rail.forgeTake` returns 0; after `rail.boilerFit` both work; an old save with hand-carried stock in Q6's
    frame (serialize the fixture, set `jobs[5].stock` and `delivered` in the JSON, `restore` it) still validates and
    its first kit is `32 - stock`; if the invariant cannot be met by a doctored save, drop this case and say so.
  - `server/test/railway-line-host.test.ts`, in "the boiler and trains": one rejected `rail.deposit` at Q6 before the
    fit.
  - Verify: `npm run check`; `npm --prefix server test`; `npm run checkpoints` (the `q5-done` and `trains-on` seeds
    still build); `npm run playthrough -- --from q5-done --to Q6` (the seeded bot fits first, then the kit comes by
    train).

### Stage B: the rope

- [ ] **4. One drag for two loads (refactor, no behaviour change).**
  - `src/entities/railway/beam-drag.ts`: add `DragShape`, `BEAM_SHAPE` and the fifth parameter as in Design; replace
    the module constants `BEAM_LENGTH` and `RADIUS` inside the factory with `shape.length` and `shape.radius`, and the
    two `placeSound` cues with `shape.scrape` and `shape.drop`. Keep `export const BEAM_LENGTH = BEAM_SHAPE.length`.
  - Verify: `npm run check`; the beam looks as before in `npm run playthrough -- --to T3` (open the beam checkpoint
    stills).
- [ ] **5. The server follows the hauled boiler and puts it down where the hauler stood. Review (`src/sim`,
  `src/world`, `server/`).**
  - `src/sim/railway-systems.ts`: add `boilerStood` and `boilerPutDown` and export `railBoilerStood`,
    `railBoilerPutDown` as in Design; delete `boilerRelease` and `railBoilerRelease`; update the header comment.
  - `src/world/railway-server.ts`: replace `boilerRelease` with `boilerStood(pid, x, y, z)` (commit only when it
    returns true, like `beamStood`) and `boilerPutDown(pid)`.
  - `server/src/host/world-host.ts`: rewrite `maintainBoiler` on `maintainBeam`'s pattern with its own `boilerStoodAt`
    clock: while the holder's session is active, once a second read their presence row (`positions()`, fresh within
    2 s) and call `api.boilerStood(holder, x, y - 45, z)` in cm; when away for `railBeamGraceS`, `api.boilerPutDown`.
  - `test/railway-boiler.test.ts`: replace the release test with: stood moves `x y z` only for the holder; put-down
    inside the area leaves `ground` at the stood point with `holder ''` and a bumped revision; outside the area leaves
    `pedestal`; neither does anything for a non-holder; `invariant` stays null throughout.
  - `server/test/railway-line-host.test.ts`: the leaver case now ends `ground` at the apron (the presence row the test
    supplies), and a second case with presence outside the area ends `pedestal`; a holder back within the grace still
    holds it.
  - Verify: `npm run check`; `npm --prefix server test`; `npm run test:net`.
- [ ] **6. The boiler on the rope.**
  - `src/sim/railway-line2-layout.ts`: `export const LINE2_BOILER_HAUL = { solo: 300, help: 540 } as const` (cm/s).
    This is the step's only `src/sim` line: a constant, read by the view.
  - `src/adapters/railway.ts`: `railMovement` and `RailwayMovement` gain `boilerSoloSpeed` and `boilerHelpSpeed`
    (`LINE2_BOILER_HAUL.x / 100`), and `sameMovement` compares them. Rename `shoulderBoiler` to `takeBoiler`.
  - New `src/entities/railway/help-carry.ts` as in Design, with `test/help-carry.test.ts` for the pure parts (stale
    claim, distance, holder no longer holding).
  - `src/entities/railway/boiler-view.ts`: drop the on-the-back model (`worn`, `makeCarryModels`). Hold one hauled
    boiler group in a world-space `THREE.Group`, a `createBeamDrag(world, group, support, ropeMaterial, BOILER_SHAPE)`
    per holder pid (as `line-cargo.ts` keeps `drags`), and `createHelpCarry('railwayBoilerHelp', …)`. In `update`:
    find the holder's avatar, set `feetY`, build `hip` and `trail` exactly as `line-cargo.ts` does (1.05 m behind,
    35° off the shoulder side), pass the helper's two shoulders when `helperOf` returns one, set
    `avatar.userData.beamGrip` to `'rope'` and the helper's to `'lift'`, and clear both when not held. Add
    `lateUpdate()` (rope to `avatar.userData.handSocket`, the load-frame fallback as in `line-cargo.ts`) and
    `prePhysics()` (holder: sprint off, `me.wish.multiplyScalar((helper ? s.boilerHelpSpeed : s.boilerSoloSpeed) /
    5.6)`; helper: sprint off). `targets()`: the take is `verb: 'Pick up'` (keeping the fix's blocked variant); add
    `railway-boiler-help` ("Help carry", at the drag's `grip`) and `railway-boiler-help-release` ("Let go"). `drop()`
    sends the drag's trailing end, rounded to cm, with `land.H` for `y`. Show the take optimistically like the beam:
    for 1.5 s after your own press while `s.pending > 0`, hide the loose boiler and start the drag. `inspect()` keeps
    `mine` and `saddle` and adds `hauled`, `helper` and the drawn `at`. **Saddle echo:** while the boiler is `held`
    (by anyone), draw a dashed `GOLD_ROPE` outline of the boiler at `saddle` on the old train (the same dashes as the
    station 6 sign, a few gold motes like the pedestal's), hidden when not held and once `trains` is true. `inspect()`
    adds `saddleEcho`.
  - `src/entities/railway/line2-view.ts`: expose `boiler.prePhysics` and `boiler.lateUpdate` on the line-2 view;
    `src/entities/railway/view.ts`: call them beside `sources.prePhysics()` and `sources.lateUpdate()`.
  - `dev/look/bots/railway.ts`, `boilerToPier`: the only edits are the prompt regex (`/^Pick up$/`) and the two beat
    names ("pick up the boiler", "boiler on its rope"). Its waypoint budget (12 s of page time per 3 m) already covers
    3 m/s.
  - New `dev/look/evals/railway-boiler-haul.ts` (an `--action`): with `makeBot`, press Interact at the pedestal, walk
    the first 40 m of the bot's route (the village bypass and up onto line 1's deck), stop, press Drop.
  - `docs/game-design/place.md` ("Trains come last" and "Putting big cargo down"): the rope, the pace, help, the drop.
  - Verify: real-time video, solo: `npm run look -- --rail-seed boiler --action dev/look/evals/railway-boiler-haul.ts
    --video --question "Does the boiler drag on its rope without popping, on the ground and up onto the deck?"`; watch
    it, and say what was seen at the ground-to-deck change. Two players: the same with `--players 2`, the second peer
    pressing "Help carry": the boiler lifts level and the pair moves at the helped pace. A still on the slope below the
    camp (`--rail-seed boiler-camp`, take it there and walk downhill 10 m). `npm run playthrough -- --from q5-done --to
    trains` for the bot's haul and fit. `npm run check`. **And a look the designer could not take:** a still from the
    pedestal at eye height (`b58at=apron`, aimed at the old train's saddle, about 179 m away and 12 m up) with the
    boiler held: can the old train, or the saddle echo, be seen from where the haul starts (lens 4, key in sight of the
    lock)? Say plainly if not.
- [ ] **7. The pace as room tunables. Review (`src/sim`, `server/`). Needs the shared `WORLD_NS` bump.**
  - `src/sim/tune.ts`: append `{ key: 'railBoilerSoloSpeed', def: 300, min: 10, max: 1000, label: 'Railway solo boiler
    speed (centimetres per second)' }` and `{ key: 'railBoilerHelpSpeed', def: 540, min: 10, max: 2000, label: 'Railway
    helped boiler speed (centimetres per second)' }` after the last key on main at that time (the order is hashed).
  - `src/tunables/catalog.ts`: entries `railway.boilerSoloSpeed` and `railway.boilerHelpSpeed`, on the beam entries'
    pattern. `server/src/host/world-host.ts`: add both to `RAIL_TUNE_KEYS`. `src/adapters/railway.ts`: `railMovement`
    reads `tune.get(...)`; delete `LINE2_BOILER_HAUL`.
  - `src/world/namespace.ts`: no bump of its own. Add "two `railBoiler*` tunables" to the history line of the bump it
    ships with (v23 if unshipped, else the next planned one).
  - `test/tune.test.ts`: the two keys load, hash and bound-check; `test/railway-adapter.test.ts`: a tune edit changes
    `boilerSoloSpeed` in `inspect()`.
  - Verify: `npm run check`; `npm --prefix server test`; `npm run test:net`; `npm run tune -- list` shows both.

### Stage C: the fit

- [ ] **8. The press, the bolting and the mark.**
  - `src/entities/railway/boiler-view.ts`: the fit target's `run` records `fitting = performance.now()` only when
    `adapter.fitBoiler(b.revision)` returns true, hides that holder's drag and rope, and starts the 0.45 s arc of the
    hauled boiler group from where it was drawn to `saddle` (`thump` at the start; `clank` and `pieces.dustRing` on
    landing; under `reducedMotion` it is placed, not flown). While `fitting` is set and `trains` is false the group
    stays at the saddle. Clear it when `trains` turns true (hide the group: the engine's own boiler shows). Reverse it
    (0.3 s hop back, `uiSound('deny')`, drag resumes) on `corrected()` for `rail.boilerFit` or when 1.5 s pass with
    `s.pending === 0`. Remove the `clank` from `accepted()` for the fitter (it already played) and keep it for others.
    `inspect()` adds `fitting`.
  - `src/proto/place/folk.ts`: `export function boltAt(x: number, z: number, y: number, seconds = 5)`: the two `on`
    camp-0 `campGuys` nearest the point get targets 0.9 m either side of it, run there with `steer(g, dt, SPEED.run)`,
    then face it and `hammerAt(g, dt)` until the clock (which never ends less than 2 s after they arrive) runs out,
    then go back to `shuttle`. Handle it at the top of the `'camp'` case. `resetFolk` clears it.
  - `src/entities/railway/train-view.ts`: in `accepted` for `rail.boilerFit`, call `folk.boltAt` at the old loco's
    side (the first train's `cars[0]` position, offset `spec.hx + 0.5` along the track normal, `land.H` for `y`); the
    module is already loaded by `opening-view.ts`, import it the same way. Add the lashing to each `tr.boiler`: two
    `TorusGeometry` rings and a small knot box in one shared `flat(GOLD_ROPE, 0.7)` material, sized from the boiler's
    `Box3` with the rings' inner radius a few centimetres (about 3 cm) clear of the boiler's surface so they never
    z-fight, disposed in the existing cleanup. `inspect()` adds `lashed: tr.boiler.visible`.
  - New `dev/look/evals/railway-boiler-fit.ts` (an `--action`): pick up the boiler where the `boiler-camp` seed leaves
    it, walk to the saddle, press Interact, and log the frame of the press and the frame the boiler first moves.
  - `docs/game-design/place.md`: the fit's beats and the lashing.
  - Verify: `npm run look -- --rail-seed boiler-camp --action dev/look/evals/railway-boiler-fit.ts --video --question
    "Does the boiler leave the rope on the press frame, and do two little guys hammer at the saddle before the wake
    ends?"`; the eval's log shows the boiler moving on the press frame, before acceptance. A still after a reload of
    the same room (`--rail-seed trains-on --eval dev/look/evals/railway-b5b8-at.ts --query 'b58at=camp'`): the lashing
    is on the engine. `npm run perf` once, compared with main (a few small meshes and two walkers; expect no change).
- [x] **9. One flourish for everyone else, once for a late joiner.** Built before step 8, so
  `dev/look/evals/railway-boiler-fit.ts` is new here: an `--eval` on both pages (player 2 fits, player 1's page is
  filmed); step 8 adds the press-frame log to it. Its reload and third-identity checks are not in it yet.
  - `src/entities/railway/ability-arrival.ts`: add `{ key: 'boiler', op: 'rail.boilerFit', cue: 'pickupHook', has:
    (s) => s.line2.trains, badge: true }` to `ABILITIES` (after glider B's row if that is on main) and `'boiler'` to
    the header's list of keys. Nothing else changes: the existing code marks the fitter as shown, plays it live for
    everyone else and once on a first landing for anyone who missed it.
  - `src/entities/railway/reward.ts`: build one boiler badge model (`makeProp('boiler')` from
    `src/proto/place/prop-kit.ts`), dispose it in `owner.cleanup`, and pass `axeModel: (key) => (key === 'boiler' ?
    boilerBadge : tools.axeModel(key))`.
  - `dev/look/evals/railway-boiler-fit.ts`: with `--players 2`, peer 2 stands at the village; log
    `inspectRailway().reward.arrival` on both peers before the fit, after it, and after peer 2 reloads.
  - Verify: `npm run look -- --rail-seed boiler-camp --players 2 --action dev/look/evals/railway-boiler-fit.ts --video`:
    peer 1 (the fitter) has `flourishes` unchanged and `seen` including `boiler`; peer 2 has one flourish with key
    `boiler` and keeps moving through it; after peer 2's reload `flourishes` is 0 and `late` is 0. A fresh third
    identity joining the fitted room (`--rail-seed trains-on`, `--until` the first landing) gets exactly one, `late: 1`.
    `npm run check`.

## Level findings

`npm run level-check` passes on this branch (4 reports, "All progression assertions passed"). It does not model the
forge apron's props, so the one thing this plan moves was probed with the game's own terrain (`H`) and line data:

| Spot | World (m) | Ground | Slope over 1 m | Nearest rail | Nearest things |
| --- | --- | --- | --- | --- | --- |
| The pedestal, unchanged | (919.0, 5.4) | 18.15 | 0.05 | 3.5 m | forge rack 4.5, turntable 6.7 |
| **The breaker's stand, proposed** | **(919.0, 2.0)** | **18.02** | **0.03** | **5.7 m** | pedestal 3.4, forge rack 5.6, Q1's frame 11.9, pack chest 12.1, recovery rack 14.0 |
| Rejected: east | (921.8, 5.4) | 18.03 | 0.04 | 1.4 m | inside the track's clearance |
| Rejected: north | (919.0, 8.2) | 18.21 | 0.05 | 1.7 m | turntable 3.9 |

- **Ruled (designer): the stand is not built** under option B (Part 2). The probes below stay as the record for the day
  it comes back.
- The stand is on flat town ground the player walks from the first minute; nothing gates reaching the spot, and nothing
  needs to: the stand and the breaker are only drawn once Q6 is laid. No ability is bypassed.
- Clearance between the pedestal's collider (radius 1.3 m) and the stand (about 0.6 m) is 1.5 m; the player is 0.9 m
  wide. Both prompts can be in reach at once from between them; they aim at points 3.4 m apart. The designer should
  look at step 2's still for that.
- The stand is 0.2 m further from the line-2 village halt and the same walk from Far Head; the forge's call still marks
  it (its plume moves with `WORKS_BREAKER`).
- Station 6's train sign uses the rack's existing sign position; nothing is placed.
- The haul route is unchanged: pedestal 18.15 m up, old train 30.22 m up, 179 m apart in a line, over line 1's raised
  deck (grades up to 26.5%, from the level check's rail grades). `LINE2_BOILER_AREA` already contains it.

## Risks

- **Hot files.** `railway-systems.ts`, `world-host.ts`, `line2-view.ts`, `boiler-view.ts`, `ability-arrival.ts`,
  `tune.ts` and `adapters/railway.ts` are all in unmerged branches: the boiler prompt fix (`boiler-view.ts`, one line
  of `line2-view.ts`), the cinematics fix (`line2-view.ts`), glider B (`ability-arrival.ts`, `tune.ts`,
  `railway-systems.ts`, `world-host.ts`, `forge-call.ts`, `namespace.ts`, the bot) and the lockstep fixes (`forgeTake`
  in `railway-systems.ts`, the leaver clocks in `world-host.ts`). `npm run inflight` shows nothing on `wip/`, `ship/`
  or `claude/`; these are worktree branches. The edits here are small and local to different functions except two:
  step 3's `forgeTake` line sits beside the lockstep fix's, and step 5's `maintainBoiler` sits beside its
  `boilerAway = now()` change (keep that fix's assignment when rewriting). The Pier halt branch has no diff against
  main.
- **Room safety.** Effects stay out of the rules: every sound, flight and flourish is in a view's `accepted` or
  `update`. `submit` returning true is not acceptance: step 8's press response is undone on a refusal, and the engine's
  boiler, the lashing and the flourish read accepted state only. The new presence field returns `null` when not
  helping. No `Math.random` or wall clock enters `src/sim`; the two new host calls take positions the host already
  rounds to integer centimetres.
- **Mixed builds.** One additive presence field. `WORKS_BREAKER` no longer moves (no stand), so the server hears
  `rail.breaker` where it does today.
- **A hauler stranded.** The boiler is slow and blocks the back. The Drop input always works, a dropped boiler outside
  the area returns to the pedestal, and the grace and the 21-minute recovery are unchanged, so nothing can hold it
  hostage.
- **The slower haul.** The rope adds about 30 s solo to a leg that is a free walk today. That is the owner's call
  ("like the great log, but maybe a little faster"); the pace is the lever (open question 3).
- **The bolting needs the camp's little guys nearby.** They work 10 to 15 m from the old train; if they are indoors or
  culled, `boltAt` finds fewer than two and the wake plays without them. Step 8's video is the check.
- **Old worlds get one late flourish.** In a world whose trains already run, each player sees the boiler flourish once
  on their next landing after step 9. Harmless, and moot after a reset.
- **Performance.** A handful of meshes (the train sign, the saddle echo, the lashing, one badge), one more rope while a boiler is hauled, two
  walkers for five seconds. `npm run perf` in step 8.
- **Not verified in this plan:** no look was run (the designer's station 6 still was stuck behind the look queue); the
  stills and videos above are the first sight of each change, including whether the forge plume reads from Far Head
  (step 1) and whether the old train reads from the pedestal (step 6). Not tested on a device.

## Open questions

1. **Station 6 before trains: view only (A) or the rule as well (B)?** **Ruled (designer): B.** The 9 November data
   shows the bill pulled the owner into hauling Q6 by hand, and only the rule holds for every client; with the rack's
   "Pick up" hidden and one arrival nudge so the refusal never reads as broken.
2. **The breaker: its own stand 3.4 m south of the pedestal at (919.0, 2.0)?** **Ruled (designer): no stand.** Under B a
   cast breaker means the boiler is fitted, so they never share the pedestal, and one pedestal keeps the forge rhythm;
   step 2 is the guard only.
3. **The pace.** **Ruled (designer): 300 cm/s solo, 540 helped** (62 s and 34 s for the haul; the beam is 220 and 500).
   The owner's literal "a little faster", once per world, and help makes it as quick as walking.
4. **Ship the pace as constants now and as room tunables with the next reset?** Recommended: **yes**: step 6 without a
   bump, step 7 with the next planned bump. (Owner or orchestrator, since it touches a reset.)
5. **Words.** **Ruled (designer): wordless, with staging** (the old train's own loco on the sign, the saddle echo, the
   flip on the first unload); words only if the owner's next session shows confusion at Far Head (owner question 10).
6. **The mark: the gold rope lashed round the fitted boiler, on both engines?** **Ruled (designer): yes, now**, a few
   centimetres off the surface; it keeps showing up with no new art, and the engine's visual pass inherits it.
7. **A menu for choices** stays open with the owner. Nothing here depends on the answer: see Design, "Sync kinds".

From the designer's review, for the owner:

8. **Station 6 refuses hand delivery until trains run, unlike your 8 November "fill before the switch" for gated
   stretches?** Recommended: **yes**: the train hauls station 6's kit, not you. Answer: ___
9. **Should whoever fits the boiler get a "You got" card after the wake, with copy you approve** (suggested "Steam" /
   "Trains run both lines.")? Recommended: **yes** ("Rewards should be maximal", 2 November). Answer: ___
10. **Wordless at station 6 now, adding a "Comes by train" tag only if your next session shows confusion there?**
    Recommended: **yes**. Answer: ___

## Design review (designer, 2026-11-09)

Read: DESIGN.md; owner-calls; decisions (9 November: boiler first, the rope, one coherent station; 8 November: fill a
gated stretch before its switch); playtests 2026-11-09 and the round-4 ranked rows; the upgrade-choices design review;
progression-flow-layout (the Far Head row and the forge rhythm), home-flow findings 2 and 3 and its "What I couldn't
see"; the top blocks of route-contract, level-design, wordless-onboarding, upgrade-economy and great-beam-clarity; the
code (`cartServing`, `depotNeed`, `boiler-view.ts`, `forge-call.ts`, the layouts); session `mw9prlct` event by event.

**Ported from Place:** nothing new. Reused pieces keep their place: the boiler model and pedestal (they are the thing),
the camp's little guys bolting it on (already live; fits the owner's "helpers as part of the camps"), the prop-kit badge
(the ability flourish's pattern).

**Evidence (session `mw9prlct`).** Q5 laid at 6:02, Far Head at 6:03. From 6:24 to 6:32 he took 24 logs off **station
6's own depot rack** (prompt at 1372, −181), left over from earlier deliveries, and deposited them in Q6. At 11:28 he
stood at the pedestal with "Shoulder the boiler" and "Take rails" both offered, and took rails. Q6 funded at 12:28:
about 6.5 minutes of hand hauling. Home-flow still 11 shows the same rack full of logs.

### Rulings

1. **Station 6 before trains: B, with conditions.** A view alone can't stop a stale tab, the bot or a second player,
   and the data shows the bill pulled him into the grind. It departs from the 8 November gated-fill call (that call is
   about gates opened by a lever; station 6's kit is the train's job), so it is logged New. Conditions: (a) **must
   fix:** while trains are off, station 6's depot rack offers no "Pick up"; otherwise the leftover logs land on a back
   the frame refuses, and that back then blocks the boiler's take 490 m away (`depotNeed` already counts rack stock as
   kit, so no rule change); verification seeds leftover rack stock. (b) The refusal must not read as broken (the 8
   November data has 41 drops and re-picks to make rails register): the first time a loaded player comes into reach,
   the sign bobs and its loco puffs once, with a soft tick (Default). (c) No bill, and no "Take rails" at the forge.
   Solo with a full back: they keep it and drop it when the boiler says "Empty your back first"; nothing is lost. A
   friend arriving mid-way: their job becomes "Help carry". A part-filled Q6 keeps its stock and the train brings the
   rest; after the v23 reset only worlds started before step 3 can hold one. *Would change my mind:* the owner saying
   the 8 November call covers Q6 too (then hand deposits, funding waits for trains, bill still hidden).
2. **The breaker's stand: no; it stays on the pedestal.** Under B, Q6 can't be laid before the fit, and the breaker is
   cast when Q6 is laid, so the two never meet in a new world. One pedestal keeps the forge rhythm (rails, the boiler,
   the breaker, same spot, same plume; home-flow finding 3) and puts no prop on an apron the Home station redesign may
   move. Keep the guard; replace the layout test with an op test that a cast breaker means trains are on. As proposed,
   a 1.5 m gap with both prompts in reach would crowd the apron, and the shed table (918, 12), 6.6 m from the
   pedestal, was missing from the probe table. *Would change my mind:* A instead of B, or a fork that lets trains be
   skipped; then a stand sited by the Home station layout.
3. **The pace: 300 solo and 540 helped (Default).** The literal "a little faster" (+36% over the beam); +29 s solo,
   once per world in a six-hour game, and a heavy haul makes the press land harder. Help at 540 makes it cost what
   walking does (34 s against 33 s), a strong co-op reward, and a late joiner lands on the haul route at the village.
   *Would change my mind:* drops and re-takes or idle on the haul in session data, the owner saying "still slow" (go
   to 340, 54 s), or the rope snagging on the 26.5% climb onto line 1's deck (step 6's video).
4. **The mark: lash it now (Default).** It passes "keeps showing up" with no new art; the engine's visual pass (P2)
   inherits it. Rings a few centimetres off the surface (the engine already z-fights). *Would change my mind:* the
   engine pass starting before step 8; then fold it in.
5. **Words: wordless with staging; a pictogram alone is not enough.** My upgrade-choices review (9 November) asked the frame to say
   "plainly" that the kit comes by train; wordless works only if each link is something already seen: (a) the sign is
   the old train's own loco (tall chimney, cab), its boiler a dashed gold outline, pulling a wagon heaped with a log
   and a rail icon; (b) while the boiler is hauled, the old train's empty saddle shows the same dashed gold outline
   (Default), so rope, pedestal motes, sign and saddle share one gold; (c) the sign flips to the count when the first
   train unloads at Far Head. Suggested copy for the owner only (not The Boogler's lines): the tag "Comes by train" (or
   "By train"); the fitter's card "Steam" / "Trains run both lines." *Would change my mind:* idle over 30 s at Far
   Head before trains, or more hand hauling for Q6, in the owner's next session; then add the tag.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The boiler fit is the first upgrade choice; the cart stays at 24 | Decided | decisions, 9 November, "Yes, boiler first" |
| 2 | The boiler is hauled on the beam's gold rope, a little faster, and help speeds it | Decided | decisions, 9 November, the rope |
| 3 | A leaver keeps it through the 180 s grace, then it goes down where they stood | Decided | the beam rule, 6 November |
| 4 | Choices are made in the world; one press fits it for the room; a menu stays open | Decided | 9 November; open question 7 |
| 5 | The 3.1 s wake is the fit's long response | Decided | owner calls, "Input gets instant feedback" |
| 6 | The pace is tunable; no reset mid-session | Decided | owner calls, "Anything playtests could tune is tunable", "Nothing waits for a playtest" |
| 7 | Station 6's tag hidden while trains are off | Default | the bill pulled him into the hand haul |
| 8 | The rack sign: the old train's loco and a loaded wagon; back to the count when trains run | Default | ruling 5a |
| 9 | No auto-unload at Q6 and no "Take rails" at the forge while trains are off | Default | as planned |
| 10 | **Added:** station 6's depot rack offers no "Pick up" while trains are off | Default | must fix (ruling 1a) |
| 11 | **Added:** one wordless nudge when a loaded player arrives at Q6 | Default | ruling 1b |
| 12 | **Added:** the saddle echoes the gold outline while the boiler is hauled | Default | ruling 5b; lens 4 |
| 13 | A part-filled Q6 keeps its stock; the first train brings the rest | Default | as planned |
| 14 | No breaker take and no strike while hauling the boiler | Default | the guard |
| 15 | 300 cm/s solo, 540 helped | Default | ruling 3 |
| 16 | Sprint off for hauler and helper; help within 5 m flat and 2 m up; 1.5 s stale | Default | the beam's numbers |
| 17 | Prompts: Pick up, Help carry, Let go, Empty your back first | Default | existing strings |
| 18 | A drop stays where drawn inside the area, else the pedestal; 21-minute return | Default | as today |
| 19 | The tail rides at feet height on decks; the beam's scrape and drop sounds | Default | as planned |
| 20 | Press: 0.45 s arc (0.8 m apex), thump, clank, dust. Refusal: 0.3 s hop back and deny; 1.5 s silence counts as a refusal | Default | as planned |
| 21 | Two camp little guys bolt it on for about 5 s | Default | agent-calls 9 November |
| 22 | Everyone else's flourish; once for a late joiner; none on reload; old worlds one late one | Default | ability-arrival's pattern |
| 23 | The gold lashing on both locos while trains run, a few cm off the surface | Default | ruling 4 |
| 24 | Constants now, room tunables with the next planned reset | Default | as planned |
| 25 | Station 6 refuses hand deposits and forge rails until trains run (B) | **New** | ruling 1; departs from the 8 November gated-fill pattern for this one station |
| 26 | The breaker's own stand | **New** | not built under B (ruling 2) |
| 27 | The fitter gets no "You got" card unless copy is approved | **New** | recommend a card after the wake ("Rewards should be maximal", 2 November); copy is the owner's |
| 28 | Wordless at station 6 where my brief said "plainly" | **New** | ruling 5's staging |

Counts: 6 Decided, 18 Default, 4 New.

### Flow from Q5 laid to the first train unloading at Far Head

Positions from `railway-line2-layout.ts`; walking 5.6 m/s.

| Leg | Where the player stands | Distance and time | What's seen first | Rule or lens |
| --- | --- | --- | --- | --- |
| 1. Q5 lays | Q5's frame (1166.7, −28.3), following to Far Head (1363.6, −163.5) | 260 m of trestle, 33 s lay | Lamps, rockets; on the tick, the whistle (heard to 900 m) and the 62 m plume at the forge | Lens 7 ✓ |
| 2. First sight of station 6 | The Far Head halt | 10 m to the frame (1372.9, −183.6) | The frame, the rack (often with leftover logs), the train sign | Rule 1 rests on the plume reading from here: **unverified** (still 11 predates the plume); a look in step 1 |
| 3. Back to the forge | Far Head to the pedestal (919, 5.4) | About 490 m straight, 536 m along the line: about 96 s, less by glider | A quiet stretch | Lens 6 broken on purpose (walked once, then trains cut it): a working exception |
| 4. The pedestal | The forge apron | The forge rack 4.5 m away | The boiler; under B no "Take rails" (at 11:28 he took rails here) | Rule 2 ✓ under B |
| 5. The haul | Pedestal to the old train (1009.6, −149) | 185 m and 12 m up: 62 s solo, 34 s helped | Passes the village spawn, so a late joiner's first job is "Help carry" | Lens 4: the saddle from the pedestal is **unverified**; a look in step 6. Lens 5 ✓: a place known since minute one becomes playable |
| 6. The fit | The camp | — | Arc, bolting, wake, trains | All four tests |
| 7. The kit | Camp to village to Far Head by train | About 67 s village to Far Head | Crates on the rack; the sign flips to the count | Lens 7 ✓: the pier points at Ring Island |

Legs 3 and 5 run past the 10–20 s "something to do" guide; both are deliberate ceremony, not a finding. Co-op: two
players haul and help, meeting under the plume; a third has no job on this beat, which is acceptable; one who goes
ahead to Far Head watches the kit arrive. Reach: nothing new reaches anything; the haul area is unchanged and the rope
keeps the glider shut; with no stand there is nothing new to prove.

### The four tests by step

| Step | Felt the limit first | Big local response | Payoff within seconds | Keeps showing up |
| --- | --- | --- | --- | --- |
| 1 and 3 (station 6 waits) | ✓ The 536 m walk back is the limit trains repay; the sign names it without asking for the haul | — | — | The kit's arrival and the flip, later |
| 4 to 6 (the rope) | ✓ The haul's weight | The rope pickup | — | — |
| 8 (the fit) | — | ✓ The arc on the press frame | ✓ Wake and bolting | ✓ The lashing, the trains running |
| 9 (the flourish) | — | ✓ For everyone else | ✓ | ✓ Once for a late joiner |

**Half a week:** steps 1 and 3 with the rack fix (the P1 order fix), then 9, then 4 to 6 (the owner's rope call); 8
after, since it flies step 6's hauled boiler. Step 2 is the guard only; step 7 waits for the next planned reset.
**Waiting on the owner:** step 7's timing (with the orchestrator) and the copy (open questions 8 to 10).

**Not seen:** no stills were taken; the station 6 still waited 12 minutes behind about 12 queued look jobs and was
stopped. The plume from Far Head and the old train from the pedestal are now looks in steps 1 and 6.
