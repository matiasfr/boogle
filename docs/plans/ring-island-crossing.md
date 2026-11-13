# Ring Island: a foot crossing, and what a train does to a player on the track

**Goal.** Give Ring Island's two platforms a walked way across both tracks, so changing platform is not a drop into
the bed and a jump at a 0.9 m kerb, and stop a train carrying a player off the island and into the sea. Serves DESIGN 7
(the way on is visible) and 11 (the world shows it, no text); step 2 keeps DESIGN 10 (a bump stays a bump).

**Measured** (world v32, seed `stack-laid-4`; eval `dev/look/evals/ring-crossing-walk.ts`, local branch
`tools/ring-crossing-walk`, c974c605a, not on main): the bed is the only way across (20 of 20 jumps took the kerb, 38
to 61 ticks platform to platform); a train does not stop for a player in the bed and shoves them 5.7 m (stopping),
33 m (passing up train, to u 482) or 166 m down the Way and into the sea (passing down train).

**Research:** none relevant. **Port from Place:** nothing ported. **Rail route:** no bill, supply or cue changes. **In flight** (`npm run inflight`): no branch
touches `src/entities/ring-island/`, `src/entities/railway/car.ts` or `dev/level/ring.ts`; `car4/*` (world v33) changes
`cars.ts` and `TRAIN_EXTENT` only, see finding 2.

## Design

### 1. The crossing (view and local physics only; no sim state, no wire, no WORLD_NS bump)

It sits at the platforms' south end, inside their own footprint, in ring coordinates (u along the line, lat across, m;
deck 8.0 m, rail tops 8.22, platforms 8.9; tracks at lat -4 and 0; bed lat -5.8..1.8):

| Piece | u | lat | top | Solid |
| --- | --- | --- | --- | --- |
| Planks, 5 spans with a flangeway by each rail | 428.1..430.5 | 1.8..0.58, 0.42..-0.42, -0.58..-3.42, -3.58..-4.42, -4.58..-5.8 | 8.22 (0.12 thick) | drawn only |
| One slab under them | 428.1..430.5 | -5.8..1.8 | 8.22, down to the deck | yes |
| West landing / east landing | 428.0..430.6 | -9.3..-5.8 / 1.8..5.3 | 8.22 | yes |
| West ramp / east ramp, full platform width | 430.6..434.6 | as the landings | 8.22 rising north to 8.9 | yes |
| Platforms, shortened from u 428 | 434.6..468 | unchanged | 8.9 | yes |

World: west landing (1406.1, 8.22, -801.4), east landing (1417.2, 8.22, -801.0), planks' middle (1411.7, 8.22, -801.2).
The measurer's u 430..436 is moved 2 to 5 m south: from v33 a standing train's tail reaches u 435.3 (finding 2).

- **Sync kind:** none. Static scenery built by `createRingIslandView`; its colliders go into the view's one static
  body (`parts.solid`), which is physics and never lockstep (docs/agents/sync.md). Every client builds the same shapes
  from constants. Nothing in `src/sim/` or `src/world/rules/` changes: `RING_HALT` (u0, the boarding points at u 448
  with their 12.6 m reach, `RING_RECOVERY`) is untouched, so no golden moves and no namespace bump.
- **Numbers live once:** `RING_CROSSING` in `src/entities/ring-island/state.ts` (beside `RING_MAP_TABLE`):
  `{ u0: 428.1, u1: 430.5, landing: [428, 430.6], rampTop: 434.6, top: RING_HALT.y / 100 + 0.22 }` and
  `ringCrossingPlanks()` returning the five lat spans from `RING_FORMATION.tracks` (rail at +-0.5, 0.08 clear each
  side, as `crossingPlanks` in `src/place/layout.ts`). The view and the level check both read them.
- **What a rider sees.** From the east platform (where trains stand; the passenger car stops at u 448): 13 m south of
  the car the platform slopes down 0.68 m over 4 m to a timber-coloured band across both orange beds. From the west
  platform: the same, 1.4 m past the fingerpost (u 436). Planks in the file's `TIMBER`. No sign, prompt or control.

### 2. The shove

- **Today, everywhere:** a car is a kinematic body (`src/entities/railway/car.ts`); trains are lockstep and know
  nothing of players; a player in front is pushed by the contact for as long as they stay in front. The generic halts'
  plank crossings (Quarry, Far Head, `up-platforms.ts`) do nothing more: generic-lines ruled "being bumped by a train
  there is slapstick (DESIGN 10)", but also "being hit while walking to the only way out is not" (its finding 5). On
  open ground the push ends when the player slides off the rails; in Ring Island's bed and on the Way there is a kerb
  or a deck edge each side, so it does not end.
- **Options.** (a) Leave: free; 166 m and a swim back stays possible on the only way across. (b) Push sideways: the
  player's own client steers them out of the car's path; local physics, no wire. (c) Recover to the nearest platform:
  local teleport to `RING_RECOVERY` once carried some distance; hides the bump and reads as a glitch. (d) The train
  slows or stops: the rules would need player positions, which are not lockstep state: a new op, a rules change, a
  WORLD_NS bump, new goldens, and any player could hold the railway for the room. Not recommended.
- **Recommended: (b), on every line.** A "fender" in `car.ts` beside the deck-hold `onPreStep`: local to `me.body`,
  cosmetic to everyone else (they see my presence pose as now). Cost: one loop over the cars already in `decks` per
  physics step, no meshes, no wire, not lockstep. Fit, measured from the layout: the six-foot between the tracks is
  1.8 m against a 0.9 m player; the outer gaps are 0.7 m (too narrow), so in the bed the push must end in the six-foot.

## Steps

- [x] **0. Land the eval.** Cherry-pick c974c605a (`dev/look/evals/ring-crossing-walk.ts`, modes
  `cross=walk|kerb|bed|round|above|platform`) onto the build branch. Verify: `cross=above` reproduces
  `.look/cross-above-still.png` (no crossing yet).
- [x] **1. Constants and level check.** `src/entities/ring-island/state.ts`: `RING_CROSSING`, `ringCrossingPlanks()`.
  `dev/level/ring.ts`: a section "The island halt's foot crossing" after the terminus, failing on any of: ramp steeper
  than 15 degrees or past `WALKABLE_NY`; planks' north edge less than 3 m short of the standing tail
  (`RING_END.u - TRAIN_EXTENT.behindCm`); ramp top north of that tail; crossover end (`RING_END.cross.u1`) less than
  5 m south of the planks; a plank span over a rail; landing top not equal to the rail top; fingerpost
  (`RING_HALT.u0 + 800`) less than 1 m past the ramp top. `test/ring-crossing.test.ts`: the five spans cover
  -5.8..1.8 less four flangeways, none within 0.08 m of a rail. Verify: the test, `npm run level-check`.
- [ ] **2. Build it.** `src/entities/ring-island/view.ts`, the island halt block (line 402): the two platform `block`
  calls start at `RING_CROSSING.rampTop`; per side a `block(CONCRETE, 428, 430.6, l0, l1, HALT_Y - 0.8, top)` landing
  and a `beam(CONCRETE, p3(430.6, mid, top), p3(434.6, mid, PLATFORM_Y), 3.5, 0.4)` ramp with a
  `block(..., HALT_Y - 0.8, top)` fill under it (no gap shows); the five plank `block`s with `isSolid` false; one
  `block` slab u0..u1, lat -5.8..1.8, `HALT_Y..top`, solid, drawn in `BED` under the planks. Colliders come from the
  builders' `solid`, in the same static body. Update `docs/game-design/place.md` (the Ring Island halt paragraph, near
  line 749). Verify: `cross=walk` crosses on the planks with no jump, both ways; `cross=above` and `cross=platform`
  stills show the band from each platform and a standing train's tail north of the ramp top; `cross=round` unchanged.
- [ ] **Checkpoint A (ships alone):** full check, `railway-ring-bot` and `ring-island-walk` evals, `npm run perf`
  (9 boxes in the merged mesh, 6 shapes in the existing static body: report the delta), the three stills.
- [ ] **3. The fender (separate, after A).** `src/entities/railway/car.ts`: `FEND = { ahead: 0.6, speed: 4, min: 0.5,
  flipTicks: 8 }` and a second `onPreStep` at order 15 (after the decks move, before the hold at 20). For each car in
  `decks` moving faster than `FEND.min` m/s and not `carry.on`: in the car's frame (as the hold computes `lx`, `lz`),
  if `|lx| < spec.hx + PLAYER_R`, my feet are below the deck top, and `lz` is within `spec.hz + FEND.ahead` of the
  leading end, set my velocity across the car to `FEND.speed` toward `sign(lx)` (left of travel at 0), keeping the
  along component the contact gives; if `|lx|` has not grown after `flipTicks`, push the other way (the kerb side of
  the bed). One `pop` on entry (slapstick), not per tick. Export a pure `fendSide(lx, stalledTicks, side)` and test it
  in `test/railway-fender.test.ts`. Verify: `cross=bed` on each track: carried under 3 m, ends in the six-foot or on
  the planks, never past u 468 or below 8.0 m; a rider on a deck and a seated rider are untouched
  (`railway-ring-train` eval).
- [ ] **Checkpoint B:** full check, bots, `test:net` (two tabs: the other tab sees the shoved player's pose as today),
  `cross=bed` video for the feel, Quarry's plank crossing once by hand in `/look`.

## Level findings

`npm run level-check` here (12 November, v32): exit 0, Ring Island rows ok. It does not compose the island's view, so
the planned positions were measured against its envelopes and constants; step 1 adds these rows to it.

1. **Walkable.** Ramps 9.6 degrees (0.68 m over 4 m), cosine 0.986 against `WALKABLE_NY` 0.55; landings and planks at
   8.22 m, level with the rail tops; the deck is level at 8.0 m from u 427.5, so nothing slopes under the crossing.
2. **Clear of standing trains, also at v33.** `car4/rules` grows the tail (the steel car behind the footing wagon;
   `TRAIN_EXTENT.behindCm` 900 to 1270, `TRAIN_TAIL_M` 12.7; the nose is unchanged). Standing pose u 448: tail at
   u 439.0 today, 435.3 at v33 (436.0 on the measured outline). Planks' north edge 430.5: 8.5 m clear today, 4.8 m at
   v33. Ramp top 434.6: 0.7 m south of the v33 tail. The suggested u 430..436 would have had the steel car over it.
3. **Clear of the crossover:** it ends at u 417, 11.1 m south of the planks; both tracks are straight and parallel.
4. **Nothing is gated by it.** Both platforms were already reachable (jump), so the crossing opens no area early. The
   east platform's other edges are as measured: 2.2 m drop at the north end, 8.75 m behind the yard.
5. **The fingerpost** (u 436, lat -7.5) is 1.4 m past the west ramp's top, 1.6 m free each side; the map table (u 442),
   the levers (north end), the RINGWORKS board (u 448) and the yard's tarp (lat 7.1 on) are clear.
6. **The yard's west face** (lat 5.3, from u 430) stands 0 to 0.68 m over the east ramp: a low wall beside the ramp,
   inside one jump (1.7 m). The east landing's outer edge (u 428..430) is open to the shore, as the platform end is now.
7. **Trains run over the planks at line speed on both tracks** (the 33 m and 166 m shoves were through here): the
   crossing takes about 1.3 s to walk and the six-foot is the only refuge. Step 3 answers it; until then it is the
   generic halts' ruling (slapstick).
8. **Seen separately, not planned:** on the outward train, Interact offered "Request stop: Stack head 3" through the
   50-tick stand instead of Sit. `withSeatTargets` in `src/entities/railway/seat.ts` adds Sit only when no other
   target can act; the aboard request comes from `targets()` in `src/entities/railway/train-view.ts`. A fix is a
   design choice (which verb wins while standing), not a one-line change: call 7.

## Risks

- **Room safety:** nothing applies to steps 1 and 2 (no apply, effect, presence or save). Step 3 moves only my own
  body in a physics pre-step; it must not touch lockstep state or submit anything.
- **Mixed builds:** none on the wire. A v32 and a v33 tab differ only in where the tail stands; the crossing is clear
  of both. Two tabs on builds before and after step 2 disagree about a ramp: one sees the other 0.7 m in the air.
- **Hotspots:** `src/entities/ring-island/view.ts` (873 lines, one halt block) and `car.ts`; `car4/views` may touch
  `car.ts`: rebase step 3 on it.
- **Bots and evals** that walk the platforms' first 6.6 m at 8.9 m (`railway-ring-bot`, `ring-island-walk`) now walk
  a ramp: checkpoint A runs them.
- **Step 3 changes every line's feel**, including Quarry and Far Head, and the carry from a car's front (a player
  pushing against a moving engine for fun loses that toy: DESIGN 2's test).

## Open questions (the designer's calls)

1. **Where:** the south end, u 428.1..430.5, cut into the platforms' own first 6.6 m (recommended), rather than
   u 430..436, which the fourth car's tail covers.
2. **Ramps or steps:** 9.6 degree ramps the full 3.5 m width (recommended; a carried crate walks it) or a flight.
3. **Does it need a mark?** Timber band only (recommended); or a painted edge, a rail, or a board.
4. **The kerb jump stays** as a shortcut (recommended), or the bed gets a rail.
5. **The shove:** (b) push sideways (recommended), (a) leave, (c) recover to a platform, (d) trains slow (lockstep,
   v-bump, griefable).
6. **If (b): every line or the island only?** Every line (recommended, one rule); it changes Quarry and Far Head.
7. **Sit against Request stop** while a train stands (finding 8): Sit wins during a stand, both shown, or as is.
8. **Order:** the crossing ships at checkpoint A before the fender is built (recommended).

## Design review (designer, 2026-11-12)

Read: DESIGN 2, 7, 10, 11; the rail topic's Current rules; generic-lines' finding 5 and call 32; the open rows this
touches in agent-calls (short turn's `meet`, the landing leaf "shoves a player clear, never pins", the aboard request
prompt); the halt block in `src/entities/ring-island/view.ts`; `withSeatTargets` and the aboard `targets()`; the two
stills (taken before the crossing exists). Research: none on a foot crossing; [route-contract](../research/route-contract.md)
applies only as "opens nothing early", which level finding 4 covers. Not seen: the crossing itself (unbuilt), and the
first sight from a car door; step 2's stills are the check.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | The crossing sits at the south end, u 428.1..430.5, cut into the platforms' first 6.6 m | Default | Agreed. Same place and vocabulary as the Quarry and Far Head crossings (generic-lines call 32: the platforms' halt end), clear of the v33 tail, and it is the crossing the short turn's `meet` row asked to be "planned and level-checked first". It is the far end from the west platform's path ramp (u 464): about 11 s from a car door round by the planks. Accepted because the kerb jump stays and the fingerpost stands at this end |
| 2 | Full-width 9.6 degree ramps, not steps | Default | Agreed. A carried footing or crate walks it; two abreast fit |
| 3 | No mark beyond the timber band | Default | Agreed (DESIGN 11). It reads as the other halts' crossings do. If step 2's stills show the band hidden behind a standing tail from the car door, add a painted edge to the ramp top, nothing with words |
| 4 | The kerb jump stays | Default | Agreed. 20 of 20, slapstick, the short way to the path; no rail in the bed |
| 5 | The shove: (b) the player is pushed sideways out of the car's path | New | Agreed. Generic-lines finding 5: slapstick is fine, "being hit while walking to the only way out is not"; the island's own precedent is the landing leaf, which "shoves a player clear, never pins". (c) hides the bump, (d) lets one player hold the room's railway |
| 6 | Where the fender acts | New | **Not every line. The Ring Island halt's bed only** (about u 423..468: the planks, 5 m of lead, the platforms' length), where kerbs stop the push ending by itself. Elsewhere a train carries you as today |
| 7 | Sit against Request stop while a train stands | Decided, contradicted by the code | Owner, 2 November, "you can sit on the train": Interact sits you down. An open default (the aboard request prompt, 10 November) now hides it on any train whose next halt is a request stop. Sit wins while the train stands and a seat is free; Request stop returns once it moves. A separate small change, not this plan |
| 8 | The crossing ships at checkpoint A, before the fender | Default | Agreed. A is no worse than today (the bed is already the only way) |
| 9 | `FEND` numbers (0.6 m ahead, 4 m/s across, flip after 8 ticks) and one `pop` on entry | Default | Tunables. See finding 2 |

Decided 1, Default 6, New 2.

### Findings

1. **Step 3 as written must change before it is built: scope it to the halt.** "Every line" removes being carried
   on an engine's nose along open track and the trestle, a thing players can do today, to fix a problem measured only
   where kerbs pen the player in. That is DESIGN 2's test (does this break a toy that's already there?) and it
   overturns generic-lines' slapstick ruling for Quarry and Far Head with no evidence from them. Changing it everywhere
   is the owner's (question 1). Built on my recommendation: the pre-step tests the car's u against the halt's zone from
   `RING_CROSSING` and `RING_HALT`; a player caught south of it by a down train is carried as today; one carried in by
   an up train is fended at the zone's edge. Checkpoint B's Quarry look becomes "unchanged".
2. **The 3 m bar does not fit the numbers for a passing train.** Clearing a car's half width plus the player at 4 m/s
   takes about 0.4 s, which is about 8 m at 20 m/s. Keep the bar for a stopping train; for a passing one the bar is:
   out of the path within the platforms' length, standing in the six-foot or on the planks, never past u 468 or below
   8.0 m. Raise `FEND.speed` before lengthening `ahead`: a longer reach grabs players who would have made it across.
3. **The six-foot with both trains standing** (the hold makes this common): the plan's fit is against the tracks, not
   the cars. Step 3's eval should stand a player there between two standing trains and walk out south to the planks,
   including the 0.22 m step onto the slab. Nobody-stranded is the rule this proves.
4. **Sit is hidden by Request stop** (call 7): an owner decision shadowed by a default. Outside this plan; build it as
   its own change. Follow-up for the small-calls list: a seated rider is offered only "Stand up", so asking for a stop
   means standing first.
5. **Flow, one lens, no change asked:** the beat ends facing away from the way on (planks south, path north). It works
   here because the fingerpost that states the choice is at the planks and the jump is still the short way.

### Cleared

- **Steps 0 to 2 and checkpoint A: build now** on calls 1 to 4 and 8.
- **Step 3: build after A, scoped to the Ring Island halt** (findings 1 to 3). The every-line version waits for the
  owner.

### Owner questions

1. **Should a train push you aside on every line, or only in Ring Island's halt?** Recommended: only the halt. Being
   carried along by a train elsewhere stays as it is.
2. **While a train stands at a platform, should Interact offer Sit ahead of Request stop?** Recommended: yes (your
   2 November call). Not waiting on this.
