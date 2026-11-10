> **Status: plan, not built (2026-11-10).** Ring Island build 1, "the line reaches the island", `WORLD_NS` v27. Written
> on main at 52373179, with v26 (generic-lines step 4) still being built and not yet on any pushed branch
> (`npm run inflight`: nothing unmerged). R1 and R2 are planned against today's main; R3–R5 against v26's shape as
> [generic-lines](generic-lines.md) describes it. **Designer reviewed, 10 November** ([the review](#design-review-designer-2026-11-10)):
> its changes are folded into R1–R4, the steps and "Level findings" below. Step 0, R1, R2a, R2b and R2c are cleared to
> build now; R3a–R5 wait only for v26 on main.

# Ring Island build 1: the line reaches the island

**Goal.** Line 2 runs on from the pier head over seven more bents, bowing down at 4%, to meet the island folk's
orange half-crossing. One player glides the gap and braces their raised leaf, the jib hangs four footings on its
counterweight, the leaf drops onto the bents, anyone strikes the gold rivet and the whole room gets the shot; then
trains run to the island halt and turn on its loop. Serves **7. Telegraph everything** (the raised leaf reads from
Home and the telescope before you reach it; every new step has a cue in the world) and **8. Enjoyable alone and
together** (the glide and the railhead face each other across the gap; brace and counterweight in either order; the
shot is the room's). The missed glide and the swim round are **10. Slapstick over precision**. It bends nothing; one
budget in the brief can't hold as written (open question 2).

**Source of truth.** [ring-island](../brainstorms/ring-island.md): Shape (R1–R5), Done means, "The layout,
greyboxed", "Rulings (10 November, greybox)", and the design review's "Calls in build 1", ranked findings 1–7 and the
orchestrator's acceptance of all five recommendations; all binding. The greybox (`?ring=greybox`,
`src/proto/greybox/ring.ts`, `RING_LAYOUT`). [generic-lines](generic-lines.md): sequencing (v26 alone, this as v27),
the state shape (catalog rows, halts, `RailEnd.kind = 'loop'`), the wait bound that sizes line 2's trains, the pier's
second track deferred to v27. [agent-calls](../agent-calls.md) rows for 10 November (ring-island rulings 1–6, review
findings 1–5, defaults row 77). [decisions](../decisions.md#current-decision-index): 10 November "the railway is double
track", "Ring Island", "trains stop on request", "Turn the table only when ready", "shared moments play for everyone",
"the sea is rebuilt small"; 9 November "a cinematic can't be interrupted by accident".

**Read for this.** AGENTS.md's table rows: owner-calls (the orchestrator makes design calls; nothing waits for a
playtest; no `WORLD_NS` bump mid-session; signs in the world; port from Place only what still fits), DESIGN.md,
`npm run map -- --kind lockstep-system` (its must-reads: src/sim, src/world AGENTS, lockstep, room-safety's "Don't",
mixed-builds, sync's "Pick a sync kind", rules README contract), plugins (entities), rendering (coast texture),
registries (prompts), verification. Code: `src/sim/railway-lines.ts`, `railway-works-layout.ts`,
`railway-line2-layout.ts`, `railway-systems.ts` (`footTake`, `footSet`, `strike`, the `OPS` table, `railApply`'s
first-non-zero dispatch), `railway-world.ts` (`Works`, `Train`), `src/world/railway-server.ts` (the reach `switch`),
`railway-predict.ts`, `railway-jump.ts`, `src/render/water/coast.ts` and `shore-providers.ts`,
`src/proto/place/land.ts` (`buildFar`), `src/entities/lookout/` (buoys, telescope), `src/entities/railway/`
(`hook-shot.ts`, `hook-view.ts`, `glide.ts`, `arrival.ts`, `shared-moment.ts`, `crossing-view.ts`), the bot's
`railway-glide.ts`, `dev/economy/place-level.ts` (the ability envelopes), `dev/loop/`.
**Port from Place:** the designer's fit check ran in the design review ("Ported from Place, piece by piece"): keep
the buoys (they gain a job), `buildFar` as the far view (with the leaf added to the far view), the telescope, the
glide. Nothing else comes over.

**Research.** [route-contract](../research/route-contract.md): travel edges never supply work edges; used for the brace
(accepted only once the gap is footed), the hook (the pull always ends on our pad) and the early swim (nothing on the
island works). [friction-without-failure](../research/friction-without-failure.md) rec 1 (a nearby, loss-free
recovery): the sea ramps and the hook back. [shared-moments-and-events](../research/shared-moments-and-events.md) rec
3 (waiting at the spot is rewarded): the joint is where the room meets; departs from its "late joiners get the missed
beat on arrival" in favour of the decided "on their own first crossing" (call 11). [botw-glide-target](../research/botw-glide-target.md):
10 m/s and 3.2 m/s are the envelopes' numbers. [train-riding](../research/train-riding.md) rec 6: the wait bound that
sets line 2's third train.

**Not in this plan.** Build 2 (v28: the steel works, the longer boiler, the saddle, threading, the shard's one
reaction, `Aperture.threaded`); the branch lines and their platforms (build 1 only leaves room west of the halt);
retiring `?ring=greybox` (a follow-up once R4 ships: delete `src/proto/greybox/ring.ts`,
`src/features/ring-greybox.ts` and step 0's eval in one PR).

## Design

### Sync kinds and authority

| Piece | Kind | Authority | API / where |
| --- | --- | --- | --- |
| Q7 (the laying job over the six built bents) | Server | server | one more `QJob` slot (6), `LINE2_STATIONS[6]`, train-fed like Q6 |
| The bent footings, the railhead rack, the counterweight, the leaf (`Aperture`) | Server | server | new component `Aperture`, systems in new `src/sim/railway-ring.ts`, replicated like `Works` |
| The moving railhead halt and its lever, the island halt, the loop | Server | server | line 2's catalog row in `src/sim/railway-lines.ts` (v26 shape), opened by `ringOpen(w)` |
| The rivet | Server | server | `WORKS_SEAMS` row 2 under the existing `rail.strike` |
| Line 2's third train | Server | server | the catalog's `trains: 3` (v26's spacing rules) |
| Your body, the glide, the hook back | Owner | you | today's `glide.ts`, `hook-shot.ts`; one more hook ring in `hook-view.ts` |
| Island near view and colliders, the folk's stub, leaf, hinge pier, brace platform, halt, loop, path, lookout | Local | each tab | new `src/entities/ring-island/` (static geometry, static colliders, a shore provider) |
| The far leaf | Local | each tab | new `src/entities/ring-island-far/` |
| The leaf's swing, the rivet's glint, buoy lifts, bents rising, the Meet shot, the first-crossing pull-out | Local, from accepted state | each tab | the railway adapter's accepted edges (`onAccepted`), snapped on restore |
| The staring rota's swap | Shared schedule (no state) | pure function of the railway room tick | `floor(tick / 450)` |
| "You glided the gap", "you got the Meet shot" | Local memory | you | localStorage per room, like the Boogler's memory |

Nothing here is Lockstep: there is no `src/world/rules/` file, `Rules` entry, `edits` generator or `env` fact. The
railway is Server-kind (sync.md); its sim is in `src/sim/`, so its math follows lockstep.md (integer cm and ticks,
`+ - * /`, no trig). New invariants go in `validateRailway`; the random-sequence check is a seeded `mulberry32` op
fuzz in `test/railway-ring.test.ts`.

### R1: the layout (`src/sim/railway-ring-layout.ts`, pure, integer cm)

Coordinates are the greybox's: `u` metres out from the pier head (ruling 5's datum: `HEAD` (1402.0, −372), heading
x +0.0272 per metre of −z), `lat` metres east of line 2's track. In cm: `ringAt(ucm, latcm) -> { x, z }`
(integer, `Math.round` of `+ - * /` only). Every deck is the 7.6 m double formation (lat −5.8..+1.8, tracks at lat 0
(down, track 1) and −4 (up, track 0), left-hand running per generic lines).

```ts
export const RING_S_HEAD = 74200; // line 2's s at the pier head (Q6's toCm); s = RING_S_HEAD + 100 * u
export const ringDeckY: (ucm: number) => number; // 2430 to u 20 m, then 2430 - (4 * (ucm - 2000)) / 100, floored at 800
export const RING_BENTS: readonly { x: number; z: number; y: number }[]; // bents 7..13 (u 140..260), centres at lat -2
export const RING_PATH: readonly number[]; // x, z cm every 10 m from u 10 to the island halt's north end (u 468)
export const RING_LOOP: { x: number; z: number; r: number; neckCm: number; loopCm: number }; // centre (146200, -82200), r 4000
/** k = bents footed past bent 6 (0..7): where line 2 ends while the gap is open. */
export const RING_HEAD: readonly {
  s: number; mergeCm: number; // the end stop and its stub merge 20 m short
  platform: RailPlatform;     // the railhead platform's middle (lat +1.8..+6.3, 25 m long, deck + 90 cm)
  rack: { x; z; y; reach };   // the railhead rack, at u - 18, lat +4.8
  jib: { x; z; y; reach };    // the jib's foot (rail.footSet site 3), at u - 3, lat +3.6; rack to jib 15 m
  ramp: { foot: XZ; flights: ... }; // the railhead's sea ramp (ruling 2's "last bent"), slipway at u - 28..-22, lat 14
}[]; // 8 rows: u 120, 140, ..., 260
/** The side walkway the railhead platform leaves behind as it moves: lat +1.8..+6.3, from u 100 to RING_HEAD[k]'s
 * end; each bent adds 20 m and none is ever removed (design review finding 2). */
export const RING_WALK: (k: number) => { u0: number; u1: number; lat0: number; lat1: number };
export const RING_GAP = { hinge: 27700, leaf: 1700, toe: 26000 }; // the leaf 17 m, toe on bent 13
export const RING_BRACE = { x, z, y: 800, reach: 400 };        // the gold strut's foot, brace platform, u 284.5, lat +3.4
export const RING_BRACE_PLATFORM = { u0: 28400, u1: 29400, lat0: 220, lat1: 1020, y: 800 }; // design review finding 1
export const RING_HOOK = { u: 27600, lat: 1200, y: 1750, pad: { u: 25820, lat: 500 } };      // design review finding 1
export const RING_RIVET = { x, z, y: 1500, reach: 500 }; // the joint at the toe, u 259.5, lat -2, just over the deck
export const RING_HALT = { u0: 42800, u1: 46800, y: 800, up: RailPlatform /* west, lat -9.3..-5.8 */, down: RailPlatform /* east, lat +1.8..+5.3 */ };
export const RING_JOINT_UP = RailPlatform; // the west platform at the last bent, opened on joined (call 14)
export const RING_PIER_UP = RailPlatform;  // the pier's up platform, lat -6.9, s 700..741 (generic lines' v27 note)
export const RING_Q7_FRAME = { x, z }; // the pier head's east edge, s 720, lat +4.5 (level-checked)
export const RING_RECOVERY: readonly { x; y; z }[]; // dry spots, never water (Level findings)
export const RING_BUOYS: readonly ({ head: number } | { joined: true } | { start: true })[]; // per buoy 1..7
export const RING_RAMPS: readonly { foot: XZ; flights: ... }[]; // the hinge pier's (ruling 2); the railhead's is RING_HEAD[k].ramp
```

`RING_BUOYS`: buoys 1–2 lifted from the start of v27 (call 23); buoy 3 (about u 156) when the railhead reaches bent 8
(`head >= 2`); buoy 4 (about u 218) at bent 11 (`head >= 5`); buoys 5–7 (past the gap) on `joined`.

The bow: `ringDeckY` reproduces `CROSSING_DECK_Y` for bents 1–6 (test), gives 19.5, 18.7, 17.9, 17.1, 16.3, 15.5 and
14.7 m for bents 7–13, 14.0 m at the hinge and 8.0 m from u 428 through the halt and the loop. The brace platform is
at **8.0 m**, 7.6 m under the take-off (the railhead platform's end, 15.6 m) and about 6 m under the hinge deck, from
u 284 to 294 (design review finding 1: lower and farther than the greybox's 10.0 m from u 276.5, so the double jump
falls short and every glide that starts with a jump lands). Steps climb from its far end (u 294) to the folk's deck by
about u 304.

### R2: the island near view, default on (Local)

- **`src/entities/ring-island/`** (`index.ts`, `view.ts`, `ground.ts`, `shore.ts`, `state.ts`), spawned on
  `productionRailway` unless `?ring=greybox` or `?blockout=world` is on (they draw their own). `buildFar`'s cones stay
  as the far view; the near view draws over them, matching their surface.
  - `ground.ts`: the island's heights on a 2 m grid over its waterline box (about 720 × 720 m, 361² cells): the max of
    the four cones' surfaces (`RING_CONES`), graded to a fill under the halt (u 428–468) and under the loop's west arc
    (Level finding 3), clamped to the sea bed off the shore. One static `heightfield` collider (`addStatic`), and
    `islandH(x, z)` for recovery and the saved pose.
  - `shore.ts`: `registerShoreProvider({ id: 'ring', bounds, extent: 1024, bedAt: gridBedAt(...) })` (needs R2a).
  - `view.ts`: geometry merged per colour (the greybox's builders, as an entity view): their stub (the Pilgrims' Way,
    u 277–470, laid double track, truss posts), the hinge pier, the brace platform at R1's numbers with the gold strut
    and one waving folk, the hinge pier's ramp out of the sea, the raised leaf (a pivot group the R4 leaf view
    turns, its empty bracket and painted outline), the island halt's two platforms with the RINGWORKS board, the
    fingerpost (emblems only, names left for the owner), the low map table, the 40 m loop deck, the path to the summit
    lookout, the lookout, the steel stack under a tarp, the drop hammer (Local loop: lift 0.6 s, drop, thump, 2.4 s
    cycle, sound within 120 m), the prophecy mural on the works wall, the shore's sand band. Colliders: decks, ramps,
    platforms, the leaf as a kinematic body. No hook ring on the folk's side (ruling 1).
  - `state.ts`: a Local pose record other views write, `ringIslandPose = { leaf: number /* degrees up, 78 raised */,
    bracket: 0..4, braced: boolean }`, read by `view.ts` each frame; R4 writes it, so R4 never edits R2's files.
  - Mounted (meshes added, colliders built) once the camera is within 500 m of the hinge or the halt, or once the
    railway state has Q7 laid; unmounted past 650 m with Q7 unlaid (hysteresis). The pier head is 277 m from the hinge.
- **Recovery and saved pose** (`src/entities/railway/arrival.ts`, one hunk): `posePolicy` and `getUnstuck` accept a
  pose on the island (`islandH` where Place's `H` is sea), and `consider` adds `RING_RECOVERY`. **Before the Meet,
  Get unstuck from anywhere past the gap (u > 262, or on the island) puts you on our side** (design review finding 3,
  call 31): in R2b, before v27 has a railhead, on bent 6's deck (u 120); from R4b on, on the current railhead's gold
  land pad (`RING_HOOK.pad` once bent 13 stands, else `RING_HEAD[head]`'s platform end). After `joined`, the nearest
  `RING_RECOVERY` point as above. Line 2's path points past the built deck (beyond `RING_HEAD[head]`'s u before
  `joined`) are never recovery candidates: `laidPath()` stops at the railhead.
- **R2a, the coast** (`src/render/water/coast.ts`): see "The sea's shore texture" under Risks for the option and why.
- **R2c, the far leaf** (`src/entities/ring-island-far/`): always on in the production railway, a 17 × 7.6 m orange
  plate and its pier at the hinge in the readable-glow orange, its angle read from `ringIslandPose.leaf`. A toe pennant
  only if the proof look fails at Home (call 20). The glow fades with distance to the near leaf's own orange by 500 m,
  so the swap to the near view at the mount distance doesn't pop (design review finding 8).

### R3: rules, v27 (Server)

**The catalog (line 2's row, `railway-lines.ts`).** `path` gains `RING_PATH`; `trains: 3` (call 10); halts appended
after Pier: **Railhead** (`s` from `RING_HEAD[head].s`, platforms `RING_HEAD[head].platform` for down and, once
joined, `RING_JOINT_UP` for up; `end: { kind: 'stub', mergeCm: RING_HEAD[head].mergeCm }` while not joined; opens on
Q7) and **Ring Island** (`RING_HALT`'s two platforms; `end: { kind: 'loop', mergeCm, loopCm: RING_LOOP.loopCm }`;
opens on `joined`). The Pier halt gains its up platform (`RING_PIER_UP`) and loses its `end` once Q7 is laid. Type
change: `RailHalt.opens` becomes `RailOpen = { job: number } | { ring: 'joined' } | 'start'`, and a halt may have
`at?: 'ringHead'` (its `s`, platform and merge read `RING_HEAD[ringHead(w)]`). `trainStopsOf(line, open)` takes
`{ laid, head, joined }`; `ringOpen(w)` (railway-ring.ts) builds it from `QJob` and `Aperture`. Until `joined`, the
island halt's two levers and `RING_JOINT_UP`'s lever are drawn chained, show no prompt and are refused by the server,
as Far Head's up-platform lever is before Q6 (generic-lines call 31; design review call 32).

**Trains.** The moving end: advancing `head` changes only the stop table, never a train's pose (`from`, `v0`, `dest`
are cm), and a train standing at the old railhead plans its next leg from where it is. The loop: v26's pseudo-track 2
(far end), a leg from the island halt's up platform round the loop to the down track, at its own `{ speed:
railLoopSpeed, accel }` (tunable, default 100 cm/tick, 10 m/s: 2.5 m/s² sideways on the 40 m radius). A train arriving
on track 0 always stands at the up (west) platform, as an end; on track 1 it stops at the down (east) platform only on
request, as a middle halt (call 15). `cycleTicks` includes the loop leg.

**`Aperture`** (kind `'aperture'`, one row, replicated; `src/sim/railway-ring.ts`):

| Field | Type | Meaning |
| --- | --- | --- |
| `set` | int 0..14 | bent footings set past bent 6; `head = floor(set / 2)` |
| `rack` | int 0..6 | footings on the railhead rack |
| `cw` | u8 0..4 | counterweight footings hung |
| `brace` | u8 | 1 raised on the pawl (default), 2 braced, 0 down (brief's encoding) |
| `joined` | int | tick the rivet was struck, −1 not yet |

**Ops** (all additive; existing systems already refuse the new ids):
- `rail.footTake { rack: 2 }`: a footing off the railhead rack (`ringFootTake`, appended after `footTake` in `OPS`).
- `rail.footSet { site: 3 }`: the railhead jib. While `set < 14` it sets the next bent's footing (needs Q7 complete);
  then, while `cw < 4`, it hangs a counterweight footing (`ringFootSet`). One site, its meaning by state (call 7).
  The second footing of a bent advances `head`; hanging the fourth with `brace === 2` sets `brace = 0` (down).
- `rail.brace { revision }` (new op, `brace`): accepted only when `set === 14`, `brace === 1` and `revision === 1`
  (the brace the actor saw); sets `brace = 2`, or `0` if `cw === 4` (call 9).
- `rail.strike { id: 2 }` (`ringStrike`): needs `Works.breaker === 2`, `brace === 0` and `joined < 0`; sets
  `joined = tick`, which opens the island halt and the joint's up platform.
- The wagon: after Q7 is laid and the pier is footed, the line's end is the railhead; the wagon unloads there into
  `Aperture.rack` (cap `WORKS.wagonCap`), owed `14 + 4 − set − cw − rack − aboard − carried`. The wagon's train is
  never held by the headway rule while the ring still owes footings (v26's pier exception, extended); the block rule
  (`sepCm`) still holds it, since that is safety, not spacing.
- `WORKS.total` 14 → **32** (call 18); the kiln's one fill casts them, no second bill.

**Server** (`railway-server.ts`): reach checks for `footTake` rack 2 and `footSet` site 3 against the current
`RING_HEAD[head]` rack and jib, `rail.brace` against `RING_BRACE`, `strike` id 2 against `RING_RIVET`; `rail.brace`
joins the op allow-list; malformed fields refused (`railInt(e.rack, 2)`, `railInt(e.site, 3)`, `railInt(e.id, 2)`,
`e.revision === 1`). Prediction (`railway-predict.ts`): rack 2 and site 3 as racks 0–1 and sites 0–2 are; `rail.brace`
and strike id 2 as the seams are.

**Invariants** (`validateRailway`): `0 <= set <= 14`; `0 <= cw <= 4`; `brace` is 0, 1 or 2; `cw > 0` or `brace !== 1`
only with `set === 14` (no counterweight or brace before the gap is footed); `brace === 0` only with `cw === 4`, and
`cw === 4` with a driven brace is always `brace === 0`; `joined >= 0` only with `brace === 0`; island halt open iff `joined >= 0`; `rack <= wagonCap`;
footings conserved: `WORKS.total = uncast + Works.rack + pierRack + pierSet + stall + cradle + aboard + carried +
Aperture.rack + set + cw`.

**Seeds** (new `src/sim/railway-seed-ring.ts`, stages appended in `railway-seeds.ts`): `deck-laid` (crossing done, Q7
laid, railhead at bent 6, the wagon at the Village with 6 footings racked at the Works), `gap-footed` (`set = 14`,
railhead at bent 13, nothing on its rack), `leaf-raised` (`gap-footed` plus 4 footings on the railhead rack, the wagon
away), `ring-joined` (leaf down, `joined` set, three trains running to the island). `JUMPS` rows for `deck-laid` and
`ring-joined` (`railway-jump.ts`).

### R4: views (Local, from accepted state)

Each piece is its own entity, auto-loaded by `main.ts`'s glob, so no step edits another's files; each reads
`inspectRailway()` and the adapter's accepted edges, snaps on restore and plays effects only from `onAccepted`.

- **The line out** (`crossing-view.ts`, `pier-view.ts`, `train-view.ts` hunks): Q7's double deck laid panel by panel
  over bents 1–6 by the machine; the pier's second track, its up platform and the moved rack; trains posed round the
  loop.
- **The railhead** (`src/entities/ring-railhead/`): bents 7–13, each rising when its second footing is set (the jib
  swings the bent's prefabricated span out and drops it on its caps: owner call "machines show their work
  physically"), the railhead platform, rack, lever and jib moving out with `head`, the next bent's stake and socket
  glowing at the jib while `set < 14`; each footing set drops visibly into one of the next bent's two sockets, and the
  span comes down on the second. **The railhead platform never leaves a player over the sea** (design review finding
  2): its 20 m behind the new railhead stays as the side walkway (`RING_WALK`), and the rack, jib and lever slide
  forward along it over about 3 s with no collider while they move (the rack's footings ride with it); the railhead's
  sea ramp (`RING_HEAD[head].ramp`) moves with it, from bent 6 on. With bent 13: the hook pile and its gold land pad,
  the take-off rail along the platform's last 5 m, and the joint's west platform (`RING_JOINT_UP`) with its chained
  lever and plank crossing. Buoys lift (`lookout/view.ts` hunk: splash, the crane's little guy bows). The pile's ring
  joins `hook-view.ts`'s rings (hunk) once `set === 14`.
- **The leaf** (`src/entities/ring-leaf/`): the brace prompt **only** once `set === 14` (gold strut lit, the folk waves
  with an elbow); counterweight footings on the jib's hook dipping the leaf a quarter each once braced, creaking on
  the pawl before; the bracket's painted outline lit while a footing is on the railhead rack; the jib prompt only with
  a footing on your back and on the rack's side (call 22); the swing down (2.5 s, ease-in, a thump and a splash);
  the rivet's gold glint and prompt only once `brace === 0`. Writes `ringIslandPose`. The leaf's kinematic body never
  pins anyone: a player under its toe's landing (bent 13's deck end, u 255–260) is lifted or shoved clear with a tumble
  before it settles (design review finding 4). The folk waving on the brace platform is one of the lookers, never
  Rivet.
- **The Meet** (`src/entities/ring-meet/`, `shared-moment.ts` gains `'the meet'`): on the `joined` live edge, every page
  plays one 6 s shot (the leaf settled, the rivet's glint, the camera running along the joined line to the halt and the
  RINGWORKS board; `createCameraPullOut`, one highlighted skip), with the banner. Never on restore. Each player's
  first ride over the joint plays a 5 s pull-out (local memory per room); a player who missed the Meet gets the Meet
  shot's framing then instead (call 11).
- **The island's folk** (`src/entities/ring-folk/`): 4 lookers on the rota, heads back, swapped by Hooter's whistle
  every 45 s (the shared schedule), a nod at a player who stands still within 8 m looking up over 50° for 1.5 s;
  Rivet, Squint and Hooter with Talk lines, each line tied to its fact (call 29, "Copy"); hard hats; the rivet toss.

### Controls

No new action. The brace, the jib and the rivet are Interact prompts (`registerInteractable`), shown only when usable
(Turn the table's rule): **Knock out the pawl**, **Hang the weight**, **Set the footing** (today's words), **Strike the
rivet**. No pad slot, key, touch control or guide row changes.

## Steps

Shipping: step 0, R1, R2a, R2b and R2c each ship alone with no `WORLD_NS` bump, now, in parallel with v26 (R2b and R2c
after R1, R2b after R2a). R3a–R5 are one branch and one ship, the v27 bump, after v26 is on main and never
mid-session; each is reviewed on its own (R3 headless, by the independent sim reviewer per `npm run models`). Each step
leaves `npm run check` green.

**Files per step** (no file is in two steps):

| Step | Creates | Edits |
| --- | --- | --- |
| 0 | `dev/look/evals/ring-greybox.ts` | none |
| R1 | `src/sim/railway-ring-layout.ts`, `test/railway-ring-layout.test.ts`, `dev/level/ring.ts` | `dev/level/check.ts` (one hunk) |
| R2a | `test/coast-regions.test.ts` | `src/render/water/coast.ts` |
| R2b | `src/entities/ring-island/{index,view,ground,shore,state}.ts`, `dev/look/evals/ring-island-walk.ts` | `src/entities/railway/arrival.ts` (one hunk) |
| R2c | `src/entities/ring-island-far/{index,view}.ts` | none |
| R3a | none | `src/sim/railway-lines.ts`, `railway-train.ts`, `railway-trains.ts`, `test/railway-lines.test.ts`, `test/railway-trains.test.ts`, `src/tunables/catalog.ts`, `src/sim/tune.ts` |
| R3b | `src/sim/railway-ring.ts`, `src/sim/railway-seed-ring.ts`, `test/railway-ring.test.ts`, `server/test/railway-ring-host.test.ts` | `railway-systems.ts` (hunks below), `railway-world.ts`, `railway-works-layout.ts`, `railway-line2-layout.ts`, `railway-seeds.ts`, `src/world/railway-jump.ts`, `railway-server.ts`, `railway-predict.ts`, `namespace.ts`, `test/railway-jump.test.ts` |
| R4a | none | `src/adapters/railway.ts` (one hunk), `src/entities/railway/crossing-view.ts`, `pier-view.ts`, `train-view.ts` |
| R4b | `src/entities/ring-railhead/{index,view}.ts` | `src/entities/lookout/view.ts`, `src/entities/railway/hook-view.ts` (one hunk each) |
| R4c | `src/entities/ring-leaf/{index,view}.ts` | none |
| R4d | `src/entities/ring-meet/{index,view}.ts` | `src/entities/railway/shared-moment.ts` (the union) |
| R4e | `src/entities/ring-folk/{index,view,lines}.ts` | none |
| R5 | `dev/look/bots/railway-ring.ts`, `dev/look/evals/ring-glide.ts` | `dev/look/bots/railway.ts`, `dev/look/segments.ts` (or wherever `RAIL_STOPS` lives), `dev/loop/graph.ts` |
| R6 | `docs/game-design/ring-island.md` | `docs/game-design.md` (index line), `docs/brainstorms/ring-island.md` (status), `docs/atlas/stories/railway.json`, this plan's status |

- [ ] **0. The greybox's owed and untested items (no game code, no bump).** New eval `dev/look/evals/ring-greybox.ts`,
  run as `npm run look -- --query ring=greybox --rail-seed crossing-done --eval dev/look/evals/ring-greybox.ts`. It
  does, by real input, writing `__ringResult`: (a) **walk the last bent's ramp**: teleport swimming at its slipway foot
  (u 232, lat 14), walk up the three flights to the railhead platform, assert no jump was pressed and it arrives
  within 10 s; (b) the same at the hinge pier's ramp to the brace platform; (c) **a swimmer walking out**: start 6 m
  out from each slipway's foot, swim in, assert `me.swimming` ends on the slipway and the walk continues; (d) **the hook
  from the water**: swimming within 16 m of the hook pile's foot, press Hook; expected refused (`hook-shot.ts`'s
  `canPress` needs `!me.swimming`), recorded; (e) the hook from the brace platform's four corners (all four connect
  and land on the pad); (f) a sprint plus double jump off the railhead platform's end straight down the lane, twice:
  the second jump pressed at the first's apex, and pressed late, while falling, about 1.0 s after take-off (record
  each landing's u; the design review's model predicts about u 276.4 and u 279.3, plus up to 0.9 m with the coyote
  grace, so on the greybox both land); (g) a glide after a sprint jump and air jump, and (g2) a glide opened straight
  off the edge with no jump (record both landings). These run on the greybox as it stands (platform u 276.5–289 at
  10.0 m); R1 moves it, and if (f)'s late press lands more than 0.3 m past the prediction, R1 moves the platform and
  the ring out by the difference (logged). Stills, re-shot after the landing fix (2347c882): `views.bentRamp`
  and `views.hingeRamp` (the greybox's `__ring.views`), `views.gap`, `views.hook`. **The raised leaf from Home and the
  telescope:** `npm run look -- --query ring=greybox --rail-seed crossing-done --cam 1015,104,-6 --look 1408,25,-649`
  (Home's summit) and `npm run look -- --query 'ring=greybox&shot=play' --rail-seed crossing-done --eval
  dev/look/evals/lookout.ts` at zoom 1 and 2, at phone size (`--size 844x390`). Done: results and
  stills logged in the ring-island brief's greybox section by R6; (f) confirms the design review's ruling on Level
  finding 1 (R1 need not wait for it). Checks: `npm run check`. Proof look: the eval's `gap` still.
- [ ] **1. R1, the layout (no sim rule, no bump).** Create `src/sim/railway-ring-layout.ts` with everything under
  "R1" above, integer cm, importing only `./railway-works-layout.ts` and the `RailPlatform` type from
  `./railway-lines.ts`. Numbers: the greybox's `RING_LAYOUT` with ruling 5's datum and the design review's ruling on
  Level finding 1 (the brace platform at 8.0 m from u 284 to 294, its gold strut's foot at u 284.5, the hook ring at
  u 276, the hinge pier's ramp moved with the platform), `RING_WALK` and the per-railhead ramp. Test
  `test/railway-ring-layout.test.ts`: `ringDeckY` equals `CROSSING_DECK_Y` at bents 1–6 and is 4% (±1 cm) between
  every pair of bents, 800 from u 428; `RING_PATH` starts within 1 cm of line 2's last path point carried 10 m on and
  its spacing is 1000 ± 5 cm; each `RING_HEAD[k]` rack is within 1500 cm of its jib; `RING_HEAD[k].s` is 2000 apart;
  every `RING_RECOVERY` point stands on a planned deck or on island ground over 50 cm above the sea; the hook ring is
  within 2300 cm of all four brace-platform corners at eye height; every `RING_WALK(k)` covers `RING_WALK(k − 1)`.
  New `dev/level/ring.ts`, called from `dev/level/check.ts` (one hunk) as its own report "Ring Island (planned)": it
  asserts with the place model's own envelopes (`GLIDE`, `MOVE`, `WALKABLE_NY`) and **one new one, the late double
  jump**: the farthest a sprint double jump lands on a surface `drop` below, over every second-press time, stepped at
  1/240 s with the controller's numbers (jump 7.6 m/s, gravity 18 m/s² ×0.5 while rising under 1.6 m/s and ×1.7
  falling, the air jump setting `vy` to at least 6.8 m/s even while falling, 9.5 m/s across), plus 0.1 s of coyote
  grace and `PLAYER_R`. `COURSE_DOUBLE` presses at the apex and is about 3 m short of that here, so it can't prove a
  "falls short" (design review finding 1). Assertions: the late double jump from the railhead platform's end falls at
  least 1.5 m short of the brace platform (expected 21.8 m against 24 m), and so does one from a stopped train's cab
  roof at the end stop, measured on the diagonal that clears the leaf; a glide after a sprint jump and air jump reaches
  the near edge on the conservative budget (expected 28.1 m); a glide after one sprint jump reaches it raw (33.9 m);
  at `head <= 5` no glide reaches anything on the folk's side (at `head` 6 a sprint jump, air jump and glide can reach
  the brace platform, 45 m raw against 44 m: reported, not failed, since nothing there works before `set === 14`);
  the hook ring is in range from every corner; every ramp flight is at most 30° and every slipway at most 15°; no hook
  target on the folk's side within 24 m of our deck; nothing standable over the railhead platform's last 30 m stands
  more than 1.6 m above it (the jib's mast and arm are out of a double jump's 3.03 m reach); each recovery point is
  dry. Proof: `npm run level-check` prints the report (no player-visible change, no look).
- [ ] **2a. R2a, the coast in regions (no bump).** `coast.ts`: providers group into regions (a provider whose bounds,
  grown by `MARGIN`, overlap another's joins its region; home and place are one region today). Each region bakes at
  `max(1, side / 1024)` m a texel with its own margin of open sea, and the regions pack as rows of one RG16F texture
  under the 2048 cap; `at(xz)` picks the region whose rect holds `xz` (two `select`s for two regions, a small uniform
  array) and does **one** texture read; outside every region it reads the nearest region's open-sea margin. The CPU
  `sampleAt` uses the same pick. `inspect()` reports each region's rect, cell and `bakeMs`. Test
  `test/coast-regions.test.ts`: with today's two providers the texture, transform and every sampled `bed`/`normal`
  equal today's (byte for byte); with a fake 700 m provider 1.5 km away there are two regions, both at 1 m a texel,
  and a point between them reads open sea. Checks: `npm run check`, `npm run perf` before and after at
  `--rail-seed crossing-done` (no frame-time change expected; report `bakeMs` and texture bytes). Proof look: the pier
  head toward Far Head's shore, `--rail-seed crossing-done`, identical to before.
- [ ] **2b. R2b, the island near view, default on (no bump).** Create `src/entities/ring-island/` as under "R2" above,
  reading R1's layout; arrival.ts's one hunk for recovery and the saved pose. Before and after, `npm run perf` at the
  pier head and at the island halt (desktop and phone tier), budget: no more than 14 draws and 1 ms CPU added at the
  pier head with the near view mounted. Test (node): `ground.ts`'s heights equal `ringHeight` within 5 cm off the fills
  and stay 50 cm under every planned deck. Eval `dev/look/evals/ring-island-walk.ts` (`--rail-seed crossing-done`):
  teleport onto the island's south shore, walk up onto the halt by its ramp, along the path to the summit lookout,
  asserting grounded and never swimming; reload the page there and check the saved pose restores on the island; Get
  unstuck from the brace platform's edge and from the island halt both land on bent 6's deck (before v27: our side,
  call 31), and Get unstuck from the sea beside the island's shore lands dry. Checks: `npm run check`, `npm run
  level-check`. Proof look: from the island halt's west platform toward the shard and the ring
  (`--rail-seed crossing-done --eval dev/look/evals/ring-island-walk.ts`, its halt still).
- [ ] **2c. R2c, the far leaf (no bump).** `src/entities/ring-island-far/` as under "R2"; it is drawn whenever the near
  view is not mounted. Checks: `npm run check`, `npm run perf` (two draws). Proof look: through the telescope at zoom 2,
  phone size (`--size 844x390`), `--rail-seed crossing-done --query shot=play --eval dev/look/evals/lookout.ts`: the orange leaf reads
  raised against the ring. (Home's summit and the finale's last frame are R6's stills; the finale is re-shot only
  after its rockets fix lands, review finding 7.)
- [ ] **3a. R3a, the catalog, the moving end, the loop and three trains (v27 branch, after v26 is on main).** In
  `railway-lines.ts`: line 2's row as under "R3" (path, halts, `trains: 3`, `RailOpen`, `at: 'ringHead'`); in
  `railway-train.ts`: `trainStopsOf(line, open)`; in `railway-trains.ts` (v26's file): the loop leg on pseudo-track 2
  with `railLoopSpeed`, the loop in `cycleTicks` and `circuitCm`, the moving end's block from `RING_HEAD[head]`.
  Tunable `railLoopSpeed` (default 100) in `src/tunables/catalog.ts` and `src/sim/tune.ts`. Tests:
  `test/railway-lines.test.ts`: halt ids 0–5 unchanged, the two new halts appended, every platform from R1;
  `test/railway-trains.test.ts`: v26's 2,000-tick random-ask run on line 2 with the island open reports the worst
  wait each way at every halt, **under 600 ticks with 3 trains** (if not, the test names the halt and the catalog goes
  to 4 trains: a logged Default); a train round the loop keeps `sepCm` and comes back on track 1 with no pose jump
  (`trainAlong` continuous across the leg boundary); advancing `head` while a train stands at the railhead moves no
  pose; the loop leg never exceeds `railLoopSpeed`. Checks: `npm run check`. Proof: headless, no look.
- [ ] **3b. R3b, the Meet's rules and the bump (v27).** New `src/sim/railway-ring.ts`: `Aperture`, `ringHead`,
  `ringOpen`, `ringOwed`, `ringFootTake`, `ringFootSet`, `brace`, `ringStrike`. In `railway-systems.ts`, hunks only:
  the `OPS` table (`'rail.footTake': [footTake, ringFootTake]`, `'rail.footSet': [footSet, ringFootSet]`,
  `'rail.strike': [strike, ringStrike]`, `'rail.brace': [brace]`), `stopsOf` passing `ringOpen(w)`, and the wagon's
  unload target and owed count calling `ringOwed`. If v26 moved `stopsOf` or the wagon's unload into
  `railway-trains.ts`, which R3a owns, R3a and R3b become one step R3 (one review), so no file is in two steps. `railway-world.ts`: `Aperture` in `ARCHETYPES`, `railwayView.ring = { head, set, rack,
  cw, brace, joined }`, `railwayCheck` count, the invariants. `railway-works-layout.ts`: `WORKS.total: 32`, `ring: 14,
  counterweight: 4`, `WORKS_SEAMS` row 2 from `RING_RIVET`. `railway-line2-layout.ts`: `Q7` (`bill: [20, 20]`,
  `fromCm: 74200`, `toCm: 86200`, `panels: 20`, `crate`, `depot`, `shelf`, `feed: 'train'`, frame at `RING_Q7_FRAME`,
  `Line2StationId` gains `'Q7'`), opening once `Works.crossing >= 0`. Server, prediction, seeds and jump rows as under
  "R3". `namespace.ts`: `WORLD_NS = 'v27'` with the dated line ("Ring Island build 1: Q7, the bents to the gap,
  `Aperture`, the island halt and its loop, line 2's third train; no migration"). Tests (`test/railway-ring.test.ts`):
  each op refused before its gate (brace and counterweight before `set === 14`, strike before `brace === 0`, site 3
  before Q7) and accepted after; brace then four weights, and four weights then brace, both end with `brace === 0` on
  the last accepted op; a repeat brace or strike moves nothing; `head` advances on each bent's second footing; the
  island halt opens on `joined` and only then; footing conservation over a seeded 5,000-op random run of footTake,
  footSet, brace, strike and wagon ticks across 1–3 accounts; an account leaving keeps `Aperture` (call 15);
  round-trip through `railwayView` and the replicated components; each seed stage passes `validateRailway`.
  `server/test/railway-ring-host.test.ts`: reach refused off the current railhead, malformed `rack`/`site`/`id`/
  `revision` refused without a throw, a stale brace refused. Checks: `npm run loop -- run` (rail rules change: Q7, the
  ring's footings, the wagon's end; report the wagon laps' time), `npm run checkpoints`, `npm run check`, `npm run
  check:full`, `test/server-image.test.ts` green with no list edits (both new files are under `src/sim/`). Proof:
  headless, no look.
- [ ] **4a. R4a, the line goes out (views).** `src/adapters/railway.ts` (one hunk): mirror `Aperture` and the new halts
  into `inspect()`, and expose `ring` accepted edges (`footSet` site 3, `brace`, strike id 2). `crossing-view.ts`: Q7's
  double deck over bents 1–6, laid panel by panel. `pier-view.ts`: the pier's up track, its up platform at lat −6.9
  and the rack 2 m beyond, widened west 6 m. `train-view.ts`: a train on the loop leg posed round `RING_LOOP`, three
  line-2 trains. Checks: `npm run check`, `npm run perf` at the pier head, `npm run checkpoints -- deck-laid`. Proof look:
  `npm run look -- --rail-seed deck-laid` from the pier head along the laid double deck to the bent-6 railhead.
- [ ] **4b. R4b, the railhead and the gap.** `src/entities/ring-railhead/` as under "R4"; `lookout/view.ts` lifts buoys
  by `RING_BUOYS`; `hook-view.ts` adds the pile's ring once `set === 14`. Before and after stills of the finished bow
  from Home's summit and the telescope, logged (brief risk "the bow changes a finished view"). Checks: `npm run check`,
  `npm run perf` at the railhead, `npm run level-check`. Test (in the eval below or a node test of the view's
  colliders): a player standing on the railhead platform's back half while `head` advances is still standing on the
  walkway afterwards, never in the sea; Get unstuck from the brace platform before `joined` lands on the gold land pad.
  Proof look: `--rail-seed gap-footed` from the take-off (the greybox's `views.gap` camera, moved with the platform):
  the brace platform, the gold strut and the waving folk straight ahead and 7.6 m down, the leaf on your left.
- [ ] **4c. R4c, the leaf.** `src/entities/ring-leaf/` as under "R4". Checks: `npm run check`, `npm run test:net` (the leaf's
  state mirrored on three tabs). Proof look (Done means): `npm
  run look -- --players 2 --rail-seed leaf-raised`, one player braced on the island side, the other hanging the last
  counterweight footing: the leaf swings down onto the bents on both pages. Also in the eval: a third player standing on
  bent 13's deck end at u 258 as the leaf lands ends on top of it or beside it, never inside it.
- [ ] **4d. R4d, the Meet and the first crossing.** `src/entities/ring-meet/` and the union in `shared-moment.ts`.
  Checks: `npm run check`, `npm run test:net`. Proof look (Done means): the same two-page room, then strike: the
  rivet glints, the 6 s shot plays on both pages, uninterruptible but for the one skip, `inspectRailway().ring.joined`
  set; a third page joining after gets the snapped state, no shot, then the Meet framing on its own first crossing.
- [ ] **4e. R4e, the island's folk.** `src/entities/ring-folk/` as under "R4", lines in `lines.ts` (Copy, below).
  Checks: `npm run check`, `npm run perf` at the island halt. Proof look (Done means): `--rail-seed ring-joined`, the
  camera in the island square: four lookers stare straight up; the whistle swaps them; standing still and looking up
  gets a nod.
- [ ] **5. R5, the bot and the loop graph.** `dev/look/bots/railway-ring.ts` (registered in `bots/railway.ts`): from
  `deck-laid`, waits for the wagon, carries rack to jib 14 times, rides each new railhead; from `gap-footed`, glides
  the gap (reusing `railway-glide.ts`'s flight), braces, hooks back to the pad; hangs four weights; strikes; rides
  from the railhead to the island halt and round the loop, **standing over the bow** (review finding 6), logging any
  fall, and the seconds it stands at the railhead between wagon loads (finding 5: over 60 s a load, the ring's
  railhead rack and the wagon's load go to 9, a logged Default). `RAIL_STOPS` gain `deck-laid`, `gap-footed`,
  `leaf-raised`, `ring-joined`, `ring-ride`. New eval `dev/look/evals/ring-glide.ts` (from
  `railway-glide-first.ts`): a sprint double jump misses into the sea with the second press at the apex and pressed
  late, a glide after one jump lands on the brace platform dry, the hook back connects from the platform, a missed
  glide swims to the hinge pier's ramp and walks out. `dev/loop/graph.ts`: nodes `Q7`, `bents` (14 footings, wagon, cue: the next bent's
  stake and socket), `gap` (glide, cue: the gold strut and the waving folk), `brace` (cue: the gold strut),
  `counterweight` (4 footings, cue: the bracket's lit outline), `rivet` (cue: the glint), `ring` (first ride), with
  their order facts. Checks: `npm run loop -- run` (no softlock, no "NO CUE" among the new nodes), `npm run playthrough
  -- --from deck-laid --to gap-footed`, `--from gap-footed --to ring-joined`, `--players 2 --from leaf-raised --to
  ring-joined` (hashes agree), `npm run perf` on the stub and at the island halt. Proof look (Done means):
  `--rail-seed gap-footed --eval dev/look/evals/ring-glide.ts`, its landing still. Then `npm run ship` for R3a–R5
  together, not mid-session.
- [ ] **6. R6, docs.** New `docs/game-design/ring-island.md` (what exists: the Meet, the rules, the numbers, the folk)
  and its index line; the brief's status (build 1 built, the greybox findings answered: step 0's results); the atlas
  railway story (a footing set at the railhead jib through `Aperture` to the leaf); this plan's status. Stills: the
  raised leaf from Home's summit, the telescope and (after its rockets fix) the Split-rock finale's last frame, at
  phone size (Done means). The calls the designer accepted are logged by the designer at review, not here.

## Calls

Every gameplay call this plan makes, for the designer's review. **Kind:** Decided (cited), Default (implied, made
concrete), New (this plan's).

| # | Call | Kind | Why |
| --- | --- | --- | --- |
| 1 | Sequence: Q7 lays the double deck over the six footed bents (u 0–120); then the 14 footings extend the line bent by bent, each pair raising one bent with its span, and the railhead (halt, lever, rack, jib) moves out 20 m with each; then the gap, brace and counterweight, then the rivet | New | Matches the brief's seed order (`deck-laid` before `gap-footed`), "the railhead halt moves", "the wagon delivers to wherever the line ends" and "no second laying job"; the six built bents carry no deck today |
| 2 | Q7: 20 logs + 20 rails, 20 panels, train-fed like Q6, its frame on the pier head's east edge (s 720, lat +4.5); opens once the pier is footed | New | 120 m at Q6's rate (32 a material for 196 m) is about 20 |
| 3 | The brace platform moves from u 276.5–289 at 10.0 m to **u 284–294 at 8.0 m**, its gold strut's foot to u 284.5, and the hook ring from u 270 to **u 276** (the planner proposed u 280–290 at 10.0 m and the ring at u 272) | New | Design review finding 1: a late-pressed double jump reaches 20.7 m at 10.0 m, so u 280 didn't separate it; at 8.0 m and 24 m out the double jump falls 2.2 m short and every glide that starts with a jump lands; the ring stays within 22.0 m of every corner |
| 4 | The bow's numbers: bents 7–13 at 19.5, 18.7, 17.9, 17.1, 16.3, 15.5, 14.7 m; hinge 14.0; halt and loop 8.0 | Decided | Ruling 5 |
| 5 | The 14 bent footings and the 4 counterweight footings come by the wagon to the railhead rack (cap 6, three loads); rack to jib 15 m; each footing carried by hand once | Default | Review call 19 and finding 6; the grind budget's "twice" and "60 m" hold |
| 6 | `WORKS.total` 14 → **32** (14 + 14 + 4); the kiln's one fill casts them | Default | Corrects the logged "34" (agent-calls row 77), which counted the cradle's two footings that the 10 November late-game answer removed |
| 7 | One footing site at the railhead jib: it sets bents until the gap is footed, then hangs counterweights | New | One prompt, one place; the order follows from state |
| 8 | Four counterweight footings; once braced the leaf dips a quarter (19.5°) per footing; on the pawl it creaks and strains | Decided | Review recommendation 5 |
| 9 | Brace and counterweight in either order, each accepted only once the gap is footed; the leaf is down when both are done; the rivet needs it down | Decided | Review recommendation 2 |
| 10 | Line 2 runs **3 trains** in v27, set by v26's 60 s wait bound (R3a's test may push it to 4) | Default | generic-lines call 34 and open question 5 |
| 11 | The Meet shot is 6 s, the room's, on the `joined` edge; each player's first ride over the joint is a 5 s pull-out; whoever missed the Meet gets its framing then | Decided | Review finding 3 and call 11 |
| 12 | The loop runs at 10 m/s (`railLoopSpeed` tunable), 2.5 m/s² sideways on its 40 m radius | New | 20 m/s on 40 m is 10 m/s², which throws a standing rider; the open "came off moving trains" P1 |
| 13 | The near view mounts within 500 m of the hinge or the halt, or once Q7 is laid; unmounts past 650 m | Default | Review call 24 |
| 14 | After the rivet the railhead stays a halt, with a new up platform on the last bent's west side (lat −9.6..−5.8) and a plank crossing at its end; before, it is a stub end with one platform | New | v26 gives each direction its own platform; without one, nobody at the joint could ride to the island |
| 15 | At the island halt a train on the up track always stands at the west platform (the end); round the loop, it stops at the east platform only on request | New | The loop makes the halt both an end and a middle halt; the branch side (west) is where you arrive |
| 16 | Buoys 1–2 start lifted; buoy 3 lifts at bent 8, buoy 4 at bent 11, buoys 5–7 on the rivet | Default | Review call 23, with R1's positions (buoy 3 at about u 156, 4 at u 218) |
| 17 | The staring rota: 4 lookers, a swap every 45 s from the railway room clock (all pages see the same swap); a nod after 1.5 s standing still within 8 m, looking up over 50° | Default | Review call 27; the clock makes it the same in co-op |
| 18 | The hook does not work from the water (today's rule); a swimmer comes out by the ramps | Default | `hook-shot.ts`; ruling 1's "a swimmer within 17 m is in reach too, if the hook works from the water" is answered no |
| 19 | The drop hammer cycles every 2.4 s, heard within 120 m; steel under a tarp and the mural at the halt | Decided | Review recommendation 4 |
| 20 | The far leaf is drawn in the readable-glow orange; a toe pennant only if R2c's look fails | New | Level finding 5: 8 px tall from Home's summit at phone size |
| 21 | Accepted: from the island side, a partly lowered leaf (39° or 19.5°) is a walkable ramp up to a toe 5 m over our railhead | Default | Only after the brace, so after the gap is footed; slapstick, and the joint is walked anyway once down |
| 22 | The jib's prompt shows only with a footing on your back near it; the bracket's outline lights while a footing is on the railhead rack; the rivet's gold only once the leaf is down | Decided | "Turn the table only when ready"; review finding 2 |
| 23 | Pacing: Q7 about 3 min, the 14 footings about 6 min (three wagon laps of about 2 min, 8 s a set), gap and brace about 1 min, counterweight and rivet about 1 min, the first ride about 40 s: **about 12 minutes** of the six hours | Default | Review "Pacing" (10–15 min) |
| 24 | `rail.brace { revision }` names the brace state the actor saw (1); a stale or repeat press is refused | Default | Brief's Shape (gate-puzzles' revision rule) |
| 25 | `Aperture.threaded` is not added in v27 | New | Build 2 bumps anyway; no unused field |

### Copy (drafts for the owner; none of The Boogler's)

| Where | Draft | Note |
| --- | --- | --- |
| Halt plaques | **Railhead**, **Ring Island** | |
| Jump-in rows | "The deck is laid" / *Q7 is down over the six bents; the rest go out one footing at a time*; "Ring Island joined" / *The leaf is down and riveted; ride to the island* | |
| Prompts | **Knock out the pawl**, **Hang the weight**, **Strike the rivet** | **Set the footing** is today's |
| Meet banner | **Ring Island** over *The line has arrived*, 4.5 s | Like "Next stop: Ring Island" |
| Board at the halt | **RINGWORKS** | The brief's word |
| Rivet (High Looker) | "Don't look at me. Look up. Thank you. Now you can look at me." (any time); "We set every bolt a little wrong. Out of respect." (any time); "Your railway bowed on the way in. Good manners." (after `joined`); **new, before `joined`:** "You're early. The railway isn't. Look up while you drip." | Suspect: "drip" assumes you swam; tie it to "arrived wet" (local: last swim within 60 s) |
| Squint | "I've watched the south for the whistling thing my whole life. Also I watched you." (any time); "You fell out of the sky." (only if you glided the gap, local memory); **new, if you swam over and never glided:** "I watched you swim the whole way. Very slowly. Very bravely."; "It was bigger in the picture. It's fine. Pictures are always bigger." (after your first ride); co-op: "Two of you? The picture only had one box." (after `joined`, two or more in the room) | |
| Hooter | "Shift change! Eyes up!" / "Nobody blink!" / "Shift change! Same eyes." (with the whistle, rotating) | |
| Fingerpost | emblems only (the Gorge's fork, Canopy's tree); names left blank for the owner | Ruling 4 |

**Suspect lines for the owner:** the two new early-arrival lines (above); the character named Rivet beside "strike
the rivet" (two meanings in one place); "The picture only had one box" in a room of three or four.

## Level findings

`npm run level-check` on main passes (9 reports, place progression all passed), but its terrain grid stops at
Far Head: it sees none of Ring Island, so R1 adds `dev/level/ring.ts`. The findings below are its envelopes
(`dev/economy/place-level.ts`: sprint 9.5 m/s, fall gravity 30.6 m/s², `COURSE_DOUBLE`, `GLIDE(drop) = (drop − 2) ×
3.125 × 0.8 − 2.8`, hook 24 m, walk limit 56°, the swimmer's 0.56 m) applied to the planned positions (the greybox
with ruling 5's datum), as R1's report will reproduce them. Step 0 checks the first and third by real input. **Updated
by the design review (10 November):** `COURSE_DOUBLE` presses the air jump at the first jump's apex, but the air jump
sets `vy` to 6.8 m/s even while falling, so a late press goes about 3 m farther over a drop; rows 1, 2, 4, 6, 9 and 10
carry the review's numbers and rows 12–13 are new. The planner's original numbers are in the review's finding 1.

| # | Planned | Found | Proposed |
| --- | --- | --- | --- |
| 1 | **The gap**: take-off at the railhead platform's end (u 260, 15.6 m), brace platform from u 276.5 at 10.0 m (greybox) | At the greybox's 5.6 m drop a sprint double jump pressed at the apex reaches 16.4 m (17.4 m with coyote grace), and **pressed late, while falling, 19.3 m (20.2 m with grace, 20.7 m with the body)**: the planner's u 280 (20 m) is inside it. A glide opened straight off the edge reaches 17.5 m, so at that height no near edge separates "any glide lands" from "no double jump lands" | **Ruled (design review finding 1): the platform at 8.0 m from u 284 to 294** (24 m out, a 7.6 m drop). Late double jump with grace and body 21.8 m: **2.2 m short**. Glides: after a sprint jump and air jump 42.5 m raw, 28.1 m conservative (4.1 m spare); after one sprint jump 33.9 m raw (9.9 m spare); straight off the edge 23.7 m raw (lands on the edge or just misses: a splash, accepted). Call 3 |
| 2 | Hook ring at u 270, lat 12, 17.5 m (ruling 1) | Corners of the greybox platform: 13.3, 9.2, 22.3, 20.1 m (in range). With the platform at 8.0 m from u 284 to 294, the ring at u 272 leaves the far west corner 25.3 m from eye height (**out of range**); with the ring at **u 276** (lat 12, 17.5 m): near west 14.9, near east 11.4, far west 22.0, far east 19.7 m. The pile stands 1 m short of the hinge and 10 m east of the hinge pier, east of the glide lane; no collider above 3 m | Ring to u 276 (call 3); the pile's 3 m top can be glided onto: from there you jump in or hook home (accepted, slapstick) |
| 3 | The hook from the water | `hook-shot.ts`'s `canPress` needs `!me.swimming`, and a pull cancels while swimming: **no hook from the sea** | Call 18; the ramps are the way out. Step 0 records it, R5's eval relies on the ramp |
| 4 | Missed glide or double jump (splash about u 280–283, lat 5) | About 12–14 m to the hinge pier's ramp foot (4–5 s at 3.1 m/s), then 8 m up two flights (about 4 s). Jumping in at the railhead and swimming round: about 32 m (10 s) plus the climb, about 14 s against the glide's 3 s (ruling 2's accepted slow way) | None; R5's eval walks it |
| 5 | The raised leaf, 17 m, from afar (hinge at (1408, −649)) | From the pier head 277 m: 23 px tall on a 390 px phone view; telescope at 612 m (8.7° right of its aim, in view): 13 px at zoom 1, 26 px at zoom 2; **Home's summit 753 m: 8 px; the village 812 m: 8 px** (4 px wide) | R2c's far leaf in readable-glow orange; toe pennant if the look fails (call 20) |
| 6 | Bents 7–13 decks and the railhead | 19.5 … 14.7 m at u 140 … 260, 4% (ruling 5). The planner's "60+ m" was wrong: at `head` 6 (bent 12, platform end u 240 at 16.4 m) a sprint jump, air jump and glide reach the brace platform (45 m raw against 44 m; 38.8 against 40 m at the greybox's numbers, inside the grace). At `head <= 5` nothing on the folk's side is in reach (64 m or more) | Accepted as early access (like row 7): the brace is refused and shows no prompt before `set === 14`, there is no hook ring yet, and Get unstuck brings you back (call 31). R1's report prints it and asserts only `head <= 5` |
| 7 | **Early access by swimming** | The stub meets the island's shore at u 439 (8.0 m deck); the halt's south half (u 428–439) stands over 1.6–2.4 m of water (the fill), its north half on 2–6 m ground; the west platform's ramp reaches the slope. **From the shore, any swimmer walks up onto the halt, along the Way to the hinge and down the steps to the brace platform at any time after R2b ships** | Accepted (brief, review call 16): the brace is refused before the gap is footed, the rivet before the leaf is down, the halt opens on `joined`, and no prompt shows early (call 22). No travel edge supplies a footing |
| 8 | The island halt's loop, centre (1462, −822), r 40, deck 8.0 m | Ground under the ring from the sea bed up to **7.1 m on its west arc**, 0.4 m under the deck's underside and one jump (1.68 m) below its top: the loop's track can be walked onto from the island there | R2b's `ground.ts` grades the cone 1.5 m under the loop deck there; walking onto the track is slapstick (a train at 10 m/s), accepted |
| 9 | Ramps: the railhead's (slipway at u − 28..−22, lat 14, moving with the railhead from bent 6; at bent 13 u 232–238) and the hinge pier's (moved with the platform: slipway u 287.5–293.5, lat 16, two flights up 8.0 m) | Both feet stand in 6 m of water; slipways 15°, flights at most 30° (`rampGrades` in the greybox); the hinge pier's foot stays on its far east side, so the swim from the railhead (about 32 m) goes round. Without the moving ramp, a fall off bents 7–12 has no way out of the sea nearer than Far Head's shore (about 2 min) | The railhead's ramp moves with the head (call 29); piles under each slipway foot (view); step 0 walks both |
| 10 | Recovery points | Today's Get unstuck searches Place's `H`, which is sea here, then the nearest path point: on the island it would put you back on Far Head or the pier. Saved poses off Place's grid aren't kept (`posePolicy` uses `insidePlace`). Nearest-dry alone would keep an early arrival on an island with no way home but the swim | `RING_RECOVERY`: the brace platform (u 289, lat 6, 8.0 m deck), the island halt's west platform (8.9 m), the halt's east platform (8.9 m), the path's foot on the slope (about 3 m ground), the summit lookout (66.3 m). Before `joined`, Get unstuck from past the gap puts you on our side instead (call 31); line 2's path points past the built deck are never candidates. R2b's arrival.ts hunk |
| 11 | Railhead platform (25 m × 4.5 m, beside the track) | Rack, jib and lever at u − 18, − 3 and − 22, lat +4.8, +3.6, +2.8: all off the track, room for three players and the wagon's unload (review finding 6) | None |
| 12 | The railhead platform moving out 20 m with `head` (design review) | It stands beside the formation, over open sea (lat +1.8..+6.3). Moved as one piece, anyone on its back 20 m when a bent's second footing goes in drops about 15–20 m into the sea | It stays behind as the side walkway (`RING_WALK`) and only the rack, jib and lever slide on (call 28). The walkway also keeps walkers beside the track rather than on it once three trains run over the stub |
| 13 | Other launch points at the gap (design review) | The jib's mast (9 m) and arm (8.5 m up) are out of a double jump's 3.03 m; the rack's 1.6 m top is 42 m back. A stopped train's cab roof (about 3.5 m over the rail) stands on the track with the raised leaf ahead, so a jump from it has to go diagonally, about 29 m to the platform's near edge, against about 23.6 m for a late double jump off a braking train | Nothing to change; R1's report checks the roof from the end stop's real position |

## Risks

- **The sea's shore texture.** Adding the island's provider stretches today's single union (home and Place, 2016 ×
  660 texels at 1 m, 6.3 MB) to about 2166 × 1960 m: 1.06 m a texel, about 15 MB and three times the bake. Options:
  (a) one union, coarser cell: no code, but each later area widens it (Canopy alone, 1.6 km west, takes Home's foam
  past 1.5 m a texel); (b) **regions packed in one texture, picked by position, one read**: the island adds about
  0.9 M texels (3.4 MB) at 1 m, Home and Place unchanged; (c) no foam lip on the island: refused by the logged Default
  "every island a player lands on keeps the foam lip and cyan shallows". **Picked (b)** (step R2a): it keeps the owner's
  must-keeps at 1 m on every island you land on, its cost grows with land rather than with the sea between, and the
  water shader still makes one coast read. It is the sea owner's call (agent-calls, 10 November): open question 6.
- **Hotspot files.** `src/sim/railway-systems.ts` (1,639 lines): R3b adds three small hunks (the `OPS` table,
  `stopsOf`, the wagon's unload) and no logic; all rules are in `railway-ring.ts`. `src/adapters/railway.ts` (1,207):
  one hunk (R4a). `railway-world.ts` (701): `Aperture` registration, the view and invariants. Every view piece is its
  own entity, so `src/entities/railway/view.ts` is untouched.
- **Room safety ("Don't").** No effect in a system: the leaf's thump and splash, the rivet's clang, the buoys' splash,
  the shot and the first-crossing pull-out play from the adapter's accepted edges, never in `apply` or on restore.
  `submitEdit` is not success: footings leave your back on prediction, return on `onCorrected`. No `Math.random`, wall
  clock or per-peer counter in `railway-ring.ts`; the rota reads the room tick, the hammer and lookers' sway are Local.
  Verified-save guards untouched. New shared files are under `src/sim/` (already in the server image); no server import
  reaches `src/entities/`.
- **Mixed builds.** v27 is a clean break (`Aperture`, the catalog row, three trains, `WORKS.total`) in one bump with a
  dated line, no migration; the wire is additive (`rail.brace`, rack 2, site 3, seam 2), refused cleanly by v26 rules.
  Not shipped mid-session, nor before v26.
- **Early access.** Finding 7: accepted. Swimming never sets a footing; the brace is the only island-side op and needs
  the gap footed.
- **The grind budget.** Footings: each carried by hand once, 15 m. Q7's kit: two carries of 7 m (Q6's pattern). Train
  waits: the brief's "no train wait longer than one leg" cannot hold with request stops on a line whose longest leg is
  about 14–20 s (open question 2); the plan holds v26's 60 s bound for riders and exempts the wagon's train from the
  headway hold while the ring owes footings.
- **Riders.** Standing over the bow at 20 m/s and round the loop (call 12); R5 tests both; the joint's west platform
  keeps players off the track at the railhead after the rivet.
- **Performance.** The near view (about a dozen draws merged per colour, a 361² heightfield), the far leaf (two draws),
  the bents and railhead (instanced), the folk (4–7 figures): `npm run perf` in R2a, R2b, R2c, R4a, R4b, R4e and R5,
  desktop and phone tier. The coast's bake time at load is reported in R2a.
- **The bow and the horizon.** The finished bents are already on the bow (generic-lines step 3); R4b's before and
  after stills of the new bents from Home are logged; the finale is re-shot after its rockets fix (finding 7).
- **v26's shape may differ from its plan.** R3a/R3b are written against generic-lines' description; re-read v26 on
  main before starting them (open question 5).

## Open questions

All seven are answered in the [design review](#design-review-designer-2026-11-10) (finding 1 and calls 6, 14, 26 and
27); question 6 stays with the sea owner. The planner's text is kept below as asked.

1. **Level finding 1:** move the brace platform to u 280–290 and the hook ring to u 272, so the double jump falls
   short? Recommended: **yes** (step 0's sprint-jump test confirms it first). The alternative is a lower platform,
   which helps the glide but also lengthens the jump's fall.
2. **The train-wait budget:** the brief's "no train wait longer than one leg" against generic-lines' "no wait for a
   train your way over about a minute". Recommended: **the minute** for riders, and the wagon's train never held while
   footings are owed. Bends nothing in DESIGN.md; it amends the brief's grind budget.
3. **After the rivet, keep the railhead as a halt with a west up platform** (call 14)? Recommended: **yes**; the
   alternative closes it and the joint is walked (about 30 s to the island halt).
4. **`WORKS.total` 32, not the logged 34** (call 6)? Recommended: **32**, and correct agent-calls row 77.
5. **v26 isn't on any pushed branch yet.** R3–R5 wait for it on main; if its shapes differ (`RailOpen`, the loop's
   pseudo-track, where `serviceOf` lives), R3a/R3b re-plan those lines before building.
6. **The coast option is the sea owner's.** Recommended: regions in one texture (Risks); confirm before R2a.
7. **The pier's second track lands in v27** (generic lines' "Migrating", the pier rack row), widening the pier west by
   6 m with its up platform. Recommended: **yes**, in R4a; it is the one finished view besides the bents that changes.

## Design review (designer, 2026-11-10)

Read: [DESIGN](../../DESIGN.md) (7, 8, 10, 11); [owner calls](../agents/owner-calls.md) ("The orchestrator makes design
calls too" #1396, "Nothing waits for a playtest", "Nothing waits on a world bump", "Port from Place only what still
fits", "Signs in the world", "Machines show their work physically", "Wary of material grinds"); the
[decision index](../decisions.md#current-decision-index) and its 10 November entries (Ring Island, the railway is
double track, trains stop on request, Turn the table only when ready, shared moments play for everyone, the sea is
rebuilt small) and 9 November (a cinematic can't be interrupted by accident); the [brief](../brainstorms/ring-island.md)
with its rulings and the first review; [generic-lines](generic-lines.md) (the wait bound, "Migrating", sequencing);
[agent-calls](../agent-calls.md)' 10 November rows; [direction](../direction.md); the
[round 4 notes](round-4-notes.md) (10 November co-op, ranked); find-the-fun 7–10 via the first review. Research tops:
[route-contract](../research/route-contract.md), [progression-flow-layout](../research/progression-flow-layout.md),
[level-design](../research/level-design.md), [friction-without-failure](../research/friction-without-failure.md),
[train-riding](../research/train-riding.md), [botw-glide-target](../research/botw-glide-target.md). Code read: the
controller's jump (`src/entities/player/state.ts`: `JUMP`, coyote 0.1 s, 9.5 m/s sprint, air accel 14), the air jump
(`src/proto/place/moves.ts` `secondJump`: `vy = max(vy, 6.8)`), `MOVE` (`tech-layout.ts`), `dev/economy/place-level.ts`
(`COURSE_DOUBLE`, `GLIDE`), `PLAYER_R`, the greybox's railhead, jib, pile and brace platform
(`src/proto/greybox/ring.ts`), `src/physics/platforms.ts` (carry includes the deck's yaw), `arrival.ts` (Get unstuck),
`WORKS` and the kiln's `worksTick`, `TRAIN`. Tools: `npm run level-check` (9 reports, all passed, none sees the
island), `npm run loop -- node crossing` (12 × 11 m carries by wagon), `node dev/playtest/cli.ts` (no session has
reached past the pier), and a stepped jump model (1/240 s, the controller's numbers) for every envelope below.

**Not seen:** `npm run look` fails in this worktree as it did for the first review (`express` isn't installed, and
the main checkout's `node_modules` lacks it too), so there are no stills from the take-off, the platform or Home. Every
distance comes from the greybox's data and the model, and step 0 is where they meet real input.

**Ported from Place**, piece by piece (owner call "Port from Place only what still fits"): the buoys keep a job (lifted
per stretch); `buildFar` stays the far view with the leaf added; the telescope is needed for call 12's read; the glide
is this area's main-line use; the double jump and coyote grace come with the controller and are the reason for
finding 1. Get unstuck's nearest-path search is Place's, and finding 3 changes it here. Nothing else comes over.

### Flow, beat to beat

| Leg | From → to | Length | Time |
| --- | --- | --- | --- |
| 1 | Village or Works → pier halt | 700–900 m | 35–45 s ride |
| 2 | Pier halt → Q7's frame (pier head's east edge) | about 20 m | 4 s walk; two kit carries of 7 m |
| 3 | Pier head → the railhead (bent 6 → bent 13, u 120 → 260) | 120–260 m | 6–13 s ride after Q7, or 21–46 s on the walkway |
| 4 | Rack → jib, 18 times | 15 m | 5 s at the footing's 3 m/s |
| 5 | Waiting for the wagon's next load, twice | — | about 70 s each (finding 5) |
| 6 | Take-off → brace platform | 24–30 m | about 3 s glide |
| 7 | Brace platform → land pad (hook) | about 30 m | 2–3 s pull |
| 8 | Brace platform → the rivet (steps up at its far end, back along their deck, over the lowered leaf) | about 64 m | 11–12 s walk |
| 9 | The joint → island halt | 168–208 m | about 14 s ride (wait up to 60 s), or 30–37 s walk |
| 10 | Round the loop | 251 m at 10 m/s | 25 s |

The three rules: **the next goal can be found** (the next bent's glowing stake and socket, the gold strut and the
waving folk, the bracket's lit outline, the glint: each in sight from where the last beat ends); **the gate keeps its
meaning** once finding 1 lands (a glide, a swim or an early arrival reaches the platform, but the brace is refused
until the gap is footed and no ring hooks onto their side); **nobody is stranded** only with findings 2 and 3 (as
planned, the moving platform can drop you in the sea, and an early arrival's only way home is a long swim). The
lenses hold: key and lock in sight (rack to jib 15 m; the platform 24 m ahead of the take-off); one main line; the
world shortens behind you (the halt moves out, trains cover legs 3 and 9); the beat ends facing the next (the Meet shot
ends on the halt, the steel under its tarp and the mural); the joint is where the room meets. The walk-seconds guide
holds everywhere except leg 5, which is waiting, not walking.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Sequence: Q7 over bents 1–6, then 14 footings bent by bent with the railhead moving out, then gap, brace and counterweight, then the rivet | Default | Follows the brief's Shape and seeds; Q7's span (u 0–120) is the planner's concrete pick |
| 2 | Q7: 20 logs + 20 rails, 20 panels, train-fed, frame at s 720 lat +4.5, opens once the pier is footed | Default | A bill size and a placement, cheap to change |
| 3 | Brace platform at 8.0 m, u 284–294; strut foot u 284.5; hook ring u 276 | New | Finding 1. **Recommendation: take it.** Replaces the planner's u 280–290 at 10.0 m |
| 4 | The bow's heights | Decided | Ruling 5 (orchestrator, #1396) |
| 5 | Wagon to the railhead rack (cap 6, three loads), rack to jib 15 m, each footing carried once | Default | First review call 19 (accepted); grind budget's "twice" and "60 m" hold |
| 6 | `WORKS.total` 32 | Default | **32 is right**: `WORKS.total` is 14 today (pier 12 + stall 2; the owner's 10 November late-game answer 1 took the cradle's 2), plus 14 + 4. The logged 34 (agent-calls row 77) added the cradle's 2. The kiln at one footing per 8 s takes about 2.4 min more to cast the extra 18 |
| 7 | One site at the jib: bents, then counterweights | New | Recommended: one prompt, one place, its meaning from state |
| 8 | Four counterweight footings, a quarter dip each once braced, creak before | Decided | First review rec 5 (orchestrator, #1396) |
| 9 | Brace and counterweight in either order, both after the gap is footed; rivet needs the leaf down | Decided | First review rec 2 (orchestrator, #1396) |
| 10 | Line 2 runs 3 trains, sized by the minute (R3a's test may make it 4) | Default | generic-lines call 34 |
| 11 | The Meet: 6 s for the room on `joined`; first ride a 5 s pull-out; a late friend gets the framing then | Decided | First review rec 3; 10 November shared moments; 9 November cinematics |
| 12 | Loop at 10 m/s (`railLoopSpeed`) | Default | Keep 10 m/s, **for a different reason** (finding 6): carry rides in the deck's frame, yaw included, so riders aren't thrown sideways; the case is camera spin (14°/s against 29°/s at 20 m/s, train-riding rec 10) and 25 s of the ring sweeping past (rec 2, a ride is a stage) |
| 13 | Near view mounts within 500 m or once Q7 is laid; off past 650 m | Default | First review call 24 |
| 14 | The railhead stays a halt after the Meet, with a west up platform on the last bent and a plank crossing | New | **Recommendation: keep it.** The striker is standing there when the Meet ends and should ride to the island; v26 gives each direction its own platform; it costs nothing unless asked. Draw the platform with bent 13 and chain its lever until `joined` (call 32). Its plaque "Railhead" stops being true then: copy for the owner |
| 15 | Island halt: up-track trains always stand at the west platform; after the loop, the east platform on request | New | Recommended |
| 16 | Buoys 1–2 start lifted, 3 at bent 8, 4 at bent 11, 5–7 on the rivet | Default | First review call 23 |
| 17 | Rota: 4 lookers, swap every 45 s on the room clock; nod at 8 m, 50° up, 1.5 s still | Default | First review call 27 |
| 18 | No hook from the water; out by the ramps | Default | `hook-shot.ts` |
| 19 | Drop hammer every 2.4 s within 120 m; steel under a tarp; mural | Decided | First review rec 4 |
| 20 | Far leaf in a brighter orange; toe pennant only if the look fails | Default | Finding 8: the glow fades to the near leaf's orange by 500 m, so the swap doesn't pop |
| 21 | A partly lowered leaf is walkable from the island side down to its toe | Default | Travel only; the toe is 4 m over our platform, out of a double jump from below |
| 22 | Jib, bracket outline and rivet show only when usable | Decided | Turn the table only when ready (10 November) |
| 23 | Pacing about 12 minutes | Default | Inside the first review's 10–15 min; finding 5 watches the waits |
| 24 | `rail.brace { revision }`, stale or repeat refused | Default | Gate-puzzles' revision rule |
| 25 | `Aperture.threaded` not added in v27 | Engineering | Not a gameplay call |
| 26 | Train waits: v26's one-minute bound for riders replaces the brief's "no train wait longer than one leg"; the wagon's train is never held by the headway rule while footings are owed (the block rule still applies) | New | **Recommendation: yes.** "One leg" was written for v25's early turn-back, which generic lines removed (its call 18); with request stops and a 1.2 km line the minute is the bound the train count is sized by. The brief's Done means ("no train wait over one leg") is amended by R6 |
| 27 | The pier's second track, up platform and moved rack in v27 | Decided | 10 November "the railway is double track": the width "carries over bridges, cuttings and the pier crossing" and "each track carries one direction ... not passing rules"; a single-track pier between two double sections would need the passing rules that decision ruled out. Generic lines' "Migrating" deferred it here on purpose. In scope; stills before and after, like the bow |
| 28 | The railhead platform stays behind as a side walkway; rack, jib and lever slide on over about 3 s | Default | Finding 2 |
| 29 | The railhead's sea ramp moves with the railhead from bent 6 | Default | Ruling 2's "the last bent", read as whichever bent is last; finding 2 |
| 30 | The hook pile, pad and take-off rail appear with bent 13; the ring hooks only once `set === 14` | Default | The plan's R4b, unlisted |
| 31 | Before the Meet, Get unstuck from past the gap puts you on our side (bent 6's deck before v27; then the railhead's land pad); path points past the built deck are never recovery targets | New | **Recommendation: yes.** Finding 3. It only ever carries you back toward the work, so it skips none (route contract) |
| 32 | The island halt's levers and the joint's west-platform lever are chained, with no prompt, until `joined` | Default | generic-lines call 31's pattern; only when ready |
| 33 | The landing leaf lifts or shoves a player clear, never pins | Default | Finding 4 |
| 34 | Each footing visibly seats in one of the next bent's two sockets; the span drops on the second | Default | Machines show their work physically |
| 35 | The leaf's swing 2.5 s ease-in with thump and splash; the Meet banner 4.5 s | Default | Motion and timing, tunable |
| 36 | Steps from the brace platform's far end up to their deck; about 11 s from the brace to the rivet | Default | Follows from call 3 |
| 37 | The waving folk on the brace platform is a looker, never Rivet; Rivet keeps to the square | Default | Keeps the name Rivet away from the rivet's prompt (owner question 5) |
| 38 | The folk's lines tied to facts: "arrived wet" is a swim within the last 60 s; "glided the gap" is local memory; the co-op line counts the room | Default | First review's suspect-lines note |
| 39 | At `head` 6 a sprint jump, air jump and glide can reach the brace platform early | Default | Accepted as early access, like the swim (Level finding 7): nothing there works or prompts, and call 31 brings you back |

Count: **7 decided, 25 default, 6 new** (38 gameplay calls; call 25 is engineering). The plan listed 25; 14 were
unlisted (26–39).

### Findings, ranked

1. **The double jump crosses the planner's u 280; lower the platform too. Change before building (R1, folded).** The
   level model's `COURSE_DOUBLE` presses the air jump at the first jump's apex, but `secondJump` sets `vy` to at least
   6.8 m/s even while falling. Over a drop, a press about 1.0 s after take-off (the natural "I'm short" press) goes
   about 3 m farther:

   | Drop to the platform | Double jump, apex | Late press | + grace + body | Glide, straight off | Glide after one jump | Glide after both, conservative |
   | --- | --- | --- | --- | --- | --- | --- |
   | 5.6 m (10.0 m deck) | 16.4 m | 19.3 m | 20.7 m | 17.5 m | 27.6 m | 23.1 m |
   | 7.6 m (8.0 m deck) | 17.2 m | 20.5 m | 21.8 m | 23.7 m | 33.9 m | 28.1 m |

   At 10.0 m no near edge works: one 2 m past the late double jump (u 283) leaves the conservative glide 0.1 m to
   spare and a glide straight off the edge 5 m short. A deeper drop helps the glide about five times as much as the jump
   (3.1 m per metre of drop against about 0.6). So: **the platform at 8.0 m from u 284 to 294**, the strut's foot at u 284.5, the
   ring at u 276 (all four corners within 22.0 m), the hinge pier's ramp with it. Margins: the late double jump falls
   2.2 m short; a glide after any jump lands with 4–10 m spare. **Is 2 m enough?** Yes, against this envelope: to come
   close takes a full sprint from the very edge, all of the coyote grace and a well-timed late press, and a miss costs a
   splash and a 5 s swim to the ramp. A moving train doesn't change it: trains reach the take-off only as they brake to
   the end stop, standing on the track with the raised leaf straight ahead, so a jump off the cab roof (about 3.5 m
   higher, plus a braking train's carry) has to go diagonally, about 29 m against its 23.6 m reach. Nothing standable on
   the railhead platform is high enough to launch from (Level finding 13). The cost: the platform is 6 m under the
   hinge deck, not "about 4 m" (first review finding 1); the strut reads taller from the take-off, which helps. R1's
   report gets a stepped late-double-jump envelope. Beyond this plan: Home's level-check uses `COURSE_DOUBLE` for its
   jump course; that is safe where it proves a gap *can* be crossed, but it would be optimistic in any "can't reach"
   assertion (for the level tool's owner).
2. **The moving railhead drops players into the sea. Change before building (R1, R4b, folded).** The railhead
   platform stands beside the formation over open sea. Moved 20 m as one piece when a bent's second footing goes in,
   anyone on its back 20 m (the rack is there, at u − 18) falls 15–20 m into the water, a few seconds from a ramp that
   only exists at bent 13. The platform stays behind as a walkway (`RING_WALK`); only the rack, jib and lever slide on.
   The walkway is also where people walk to the railhead once three trains run over the stub, beside the track
   rather than on it (first review finding 6). The railhead's sea ramp moves with the railhead from bent 6, so a fall
   at any railhead is a short swim, not two minutes to Far Head (friction-without-failure rec 1).
3. **An early arrival has no way home but a long swim. Change before building (R2b, folded).** Nearest-dry Get
   unstuck keeps anyone on the island there, and before bent 13 there is no hook ring, and no ramp on our side beyond
   the railhead's. Swimmers chose the swim, but a glider at `head` 6 (now possible, call 39) didn't. Before `joined`,
   Get unstuck from past the gap returns you to our side (call 31). Also, line 2's path points past the built deck must
   never be recovery targets, or Get unstuck could place you over open sea (the 9 November "nine recoveries in a row
   put him back in the sea").
4. **The leaf lands on whoever stands at bent 13's end (R4c, folded).** The rivet is struck there and the jib's user
   stands 3 m away, so in co-op someone is often there as the last weight goes on. A kinematic leaf must lift or shove
   them clear with a tumble (slapstick), never pin them. R4c's eval checks it.
5. **About 70 s of idle at the railhead between wagon loads, twice (pacing, R5, folded).** 18 footings in loads of 6:
   about 50 s of setting, then the wagon's lap (about 2 min) with nothing to do but ride along. That is the one leg over
   the "something to do every 10–20 s" guide, at the point in the game where players were already lost (10 November
   P1). Not blocking: R5 logs it, and over 60 s a load the ring's rack and the wagon's load go to 9 (two loads; a logged
   Default). The early peek at `head` 6 (call 39) is an unplanned thing to do while waiting.
6. **The loop's reason is wrong; its number is right (call 12).** `platforms.ts` carries a rider in the deck's frame,
   yaw included, so 2.5 m/s² sideways isn't what throws people (the open "came off moving trains" P1 is a separate
   bug). Keep 10 m/s for camera spin and the view. R5's standing rider over the bow and round the loop stays.
7. **Copy (for the owner; none is The Boogler's, and none is changed here).** Suspect lines: Rivet's "You're early.
   The railway isn't. Look up while you drip." ("drip" assumes a swim: tied to arriving wet, call 38; a glider who
   arrives early at `head` 6 gets neither early line, which is fine); Squint's "I watched you swim the whole way. Very
   slowly. Very bravely." ("the whole way" is an exaggeration if you swam 17 m from the railhead, possibly the joke);
   "Two of you? The picture only had one box." with three players (owner to give a count-aware variant); the
   character **Rivet** beside **Strike the rivet** (they are 180 m apart, so no prompt clash; it's only a doubled word
   in the area's copy: keep it unless the owner renames); the halt plaque **Railhead** after the Meet, when it's no
   longer the railhead (call 14).
8. **The far leaf shouldn't pop (R2c, folded).** A brighter far leaf swapped for the near one at 500 m would visibly
   change colour from the pier head's approach; fade the glow out with distance instead. From Home the lowered leaf is
   seen end-on along the line and vanishes, so the change reads as "the upright is gone", which is enough.

**The swimmer who reaches the island early** (planner's question 6): accepted as built. They find the rota, the hammer,
the mural, the steel under its tarp and the raised leaf facing home, with no prompts and nothing gold; the two early
lines; and call 31 to get home. Nothing there supplies work.

### Cleared to build

- **Step 0: now**, with (f) extended to the late press and (g2) added (folded).
- **R1: now**, on the numbers above; it need not wait for step 0, whose (f) only confirms them.
- **R2a: now, on design.** The coast option is the sea owner's engineering call (open question 6), not the owner's.
- **R2b: now**, after R1 and R2a, with call 31's recovery (folded).
- **R2c: now**, after R1, with the fade (folded).
- **R3a, R3b, R4a–R4e and R5:** cleared on design; they wait only for v26 on main (sequencing) and never ship
  mid-session.

Nothing waits for the owner: no step is direction, unapproved scope or irreversible.

### Owner questions

1. **Should only a glide cross the gap?** Recommended: **yes**, with the brace platform at 8.0 m from u 284 to 294 and
   the hook ring at u 276. The alternative is to leave the greybox's platform (10.0 m from u 276.5) and accept the
   double jump as a third way across, alongside the glide and the swim. The work gate holds either way, but then the
   glider's one main-line use is optional.
2. **Before the Meet, does Get unstuck from the island take you back to our railhead?** Recommended: **yes**, so an
   early arrival never faces a two-minute swim home.
3. **Is the train-wait budget the minute rather than "one leg"?** Recommended: **the minute** for riders, and the
   wagon's train is never held while the ring owes footings.
4. **Does the railhead stay a halt after the Meet (west platform added), and what does its plaque say then?**
   Recommended: **keep it**; the name is yours ("Railhead" is a placeholder once the line runs through).
5. **Do you keep the name Rivet for the foreman, beside the gold rivet you strike?** Recommended: **keep it** (they are
   never in the same place), and reword the early-arrival and co-op lines as you like.
