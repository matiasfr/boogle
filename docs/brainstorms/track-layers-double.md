> **Status: greybox built behind `?layer=wing` (11 November 2026, branch `layer/wing-greybox`); GLB step awaits a yes.**
> Light brainstorm (one agent, three lenses). Look and read only: the rule that one action lays both tracks
> ([decision](../decisions-rail.md#d-2026-11-10-the-railway-is-double-track)) stays as it is, with no bill, timing, wire,
> save or `WORLD_NS` change. Built: [machine-wing.ts](../../src/entities/railway/machine-wing.ts), the flag path in
> [track-machine.ts](../../src/entities/railway/track-machine.ts), `WING*` and the stack offset in
> [machine-panels.ts](../../src/entities/railway/machine-panels.ts), `panelStartUp` in
> [track.ts](../../src/entities/railway/track.ts); eval `dev/look/evals/track-wing.ts`; test `test/track-wing.test.ts`.

# Laying both tracks plausibly (track-layers-double)

The owner's seed, 11 November: "P3 we'll have to fix reworking the track layer(s) system so that the dual track laying
works plausibly". Asked whether this was about the look or the rule, he confirmed it is the look: today one machine
appears to produce two parallel tracks.

## What a player sees today

From the code ([machine-panels.ts](../../src/entities/railway/machine-panels.ts) `pose`,
[track.ts](../../src/entities/railway/track.ts) `seatUp`, [place.md](../game-design/place.md), "The second track,
drawn"): both lines lay through the same `Machine.layPanel`. The loco and the 2.2 m flatbed run on today's (down)
track. One slewing beam (7.0 m, up from 5.8 m for this) carries one trolley with one pair of jaws. On a double panel it
lifts the top two pairs off the one stack, sweeps and seats the down pair, lets go, hops 0.35 m and crosses 4 m to the up track's side
to seat the up pair. The up pair's crossing is the last 17% of a cycle that lasts 0.39–0.62 s at cruise, so it takes
about 0.1 s. Line 1 is double from s 36 to 182, line 2 from s 34 to 556 (with Far Head's crossover); the turntable,
Village platforms, Camp end and pier stay single.

**One look** (`proto=place&machineView=lay`, the track-layer evals, 8 s, `--wall 240`; `.look/lay-double-still.png`,
not committed): the machine sits on the near track with its cream beam swung out left over the second track. Both
tracks run up to the same point beside the machine, and the up track's end lies under nothing but the tip of a thin
boom. At cruise the motion sheet never catches the jaws over the up track. It reads as one small machine pulling two
tracks out of itself, with the second one just appearing. That is the owner's complaint, confirmed.

## Pitch

Give the machine a **second hand where the second track is**. A wing folds out on the up track's side (the machine's right on line 1, which is laid toward Home, and its left on line 2), rides the
new up rails on a little trailing truck, and carries its own small stack and its own trolley. Both trolleys pick,
sweep and seat in the same beat, so every clank is two pairs going down, one under each hand, and the stacks on both
sides shrink together. On single track the wing is folded against the side; at a turnout it telescopes out over 20 m
as the up track eases from 0 to 4 m away. It serves **Machines show their work physically**
([owner-calls](../agents/owner-calls.md)) and **7, Telegraph everything**: you can see from far off which stretch is
double and where the second track starts.

## Gut question

Watching it lay, does a player (and a friend riding the flatbed) see where the second track comes from without being
told?

## Best suggestions, ranked

1. **The wing: one machine, two hands** (all three lenses). A telescoping outrigger on the up track's side with a
   second trolley and jaws, a small up-track stack on it, and a two-wheel trailing truck on the up rails it has just
   laid (as the machine rides the rails it lays). Both mechanisms run the existing `panelPose` on the same phase,
   with no crossing. Costs: new parts (arm, sleeve, truck, second trolley and jaws, second stack), a second
   `panelMechanism` instance, and the main beam goes back to 5.8 m. Laying time is unchanged. Each hand's cycle is still 0.39–0.62 s at cruise, so a single cycle is no easier to follow; what changes is that a hand and a stack stand over each track the whole time. From a distance it reads as a wider machine with its arms out. For a second player, the chair on the up track's side now has a working hand in view (the right chair on line 1, the left on line 2). Bridges: the trestle decks are 7.6 m and span both tracks, so the truck rides deck.
   Pier and Village: folded, so the parked machine is no longer or wider than today (line 2's engine still stops 1 m
   clear). Curves: the arm follows the up seat's yaw (on line 2 the up track is on the inside of left curves and the outside of right ones; on line 1, laid the other way, the reverse), and the sleeve's length is `upLat` at the head. The footing wagon is unaffected. Later lines, and the
   Ring Island laying over the pier bents, get the same wing. Opening it at the pier head for the crossing is a free
   moment.
2. **Twin layers, yoked** (design + creative). A second slim layer on the up track, joined to the first by a
   cross-beam, with its own two chairs. It reads best of all ("layer(s)" in the seed, and each friend rides one), but
   on single track the twin has no rail: it must ride piggyback and be craned down at each turnout. That doubles the
   model, seats and draws, and makes the machine as long and wide again at the pier halt. Second if the owner wants
   two machines to look at.
3. **Portal gantry straddling both tracks** (creative). The header becomes a 6–7 m portal with a leg on each side, the
   outer leg on a truck on the up rails, and two trolleys under it. It has the strongest silhouette (a real
   track-renewal gantry), but on single track the outer leg needs somewhere to go (it has to fold up and over), and
   it is the biggest model change. It is the wing done heavier.
4. **Retime the one beam** (systems; the floor). Keep one hand but give the crossing about half the cycle and a
   visible pause over the up track. Cheapest, with no model change, but at 0.2–0.3 s a pair it is still a blur at
   cruise, and one hand doing double work is the very thing that looks implausible.
5. **Not recommended: two passes.** Lay down track, come back and lay up track. It doubles the wait or halves the per
   pass time, needs the turn-back, and breaks "the same action". It is a rule change, so it is out of this brief.

Tension: the twin (2) reads strongest for two players and matches "layer(s)"; the wing (1) keeps one machine, one
silhouette, one set of chairs and a folded state for single track at about a third of the cost. Question 1.

## Shape

- **Sync kind: none new.** View only, driven by the same accepted head and panel phase both views already use. No op,
  wire, save, sim or `WORLD_NS` change. Commit timing, stock and bills are unchanged.
- **Reuse:** `panelMechanism` instanced twice (down on the flatbed rig, up on the wing frame); `Track.seatUp` and
  `panelStart` for the up seat; `upLat`/`FORMATION` for the sleeve length and fold; `poseCarOnLine` for the truck at
  its own s. The magazine already counts pairs a track (`rackPairs`); split it into a down stack and an up stack.
- **Smallest first build (greybox, behind a flag):** `?layer=wing` read in `track-machine.ts`. With the flag, code
  boxes for the arm, sleeve and truck; a second mechanism on the wing whose `pose` takes the up seat as its own
  `seat` (and `second: null` on the main one); the main beam back at 5.8 m; and the stack split. No GLB or
  `track-layer.py` edit until a yes. Files: `track-machine.ts`, `machine-panels.ts` (export what the wing needs),
  `track.ts` (an up `panelStart`).
- **Risks:** the crossover at Far Head (s 490–512), whose rails nobody carries today (the wing does not fold there: the up track runs on to s 556 and the fold is at s 536–556; in the greybox the crossing rails drop under the arm, see the design review); the level check on the 7.0 m beam ([machine-panels.ts](../../src/entities/railway/machine-panels.ts)
  `PANEL_BEAM_LENGTH`) must follow the shorter beam; the hook pillar p2 (11 m out) and the gates (10.4 m) clear a 5 m
  wing, but the Quarry and Far Head up platforms stand just outside the up track, so the wing must stay inside its
  rails (truck on the rails, arm above platform height). Performance (guide, not gate): one more mechanism is about 4
  more draws and up to 72 more rail instances in an existing batch, against the machine's 196-call upper bound.

## Done means

Captured with `look` on `proto=place` and the track-layer evals (`dev/look/evals/track-layer.ts`,
`track-layer-action.ts`), plus `&layer=wing`:

- `machineView=lay` mid double panel: two trolleys over two tracks, each pair seated under its own jaws, both stacks
  visibly lower than at the start.
- `machineView=side` through a turnout: the wing grows from folded to 4 m in step with the up track (on line 1 the machine meets the s 182 end first and folds at s 56–36; on line 2 it opens at s 34–54 and folds at s 536–556).
- `machineView=normal` from the chair on the up track's side, video at cruise: both seats land in the same beat, and the up hand is
  readable at real speed (no crossing hop).
- Line 2 on the gorge trestle: the truck rides the 7.6 m deck.
- Parked at the pier halt: folded, with the engine still clear by 1 m.

## Open questions

1. **One machine with a wing, or two yoked layers?** Recommended: the wing. One machine reads as one action, folds for
   single track, and costs about a third of the twin. Answer: \_\_\_
2. **Do both hands lay in the same beat, or down then up a half-beat apart?** Recommended: the same beat. One clank,
   two pairs, is what makes "the same effort" visible. Answer: \_\_\_
3. **Should the wing get a chair** (a third seat facing the up hand)? Recommended: not now. The two chairs stay, the one on the up track's side has the wing in view, and a chair can come after a yes. Answer: \_\_\_
4. **Does the wing go into the GLB and `track-layer.py` after a yes, with the parts sheet and storyboard the owner call
   asks for?** Recommended: yes, as a second step once the greybox reads. Answer: \_\_\_
5. **Does the stack split into two (down on the gantry, up on the wing), with deliveries landing alternately?**
   Recommended: yes. Each hand empties its own stack, and the room sees both go down. Answer: \_\_\_

## Owner questions (none blocking)

From the design review below; the build proceeds on the recommendations.

1. Wing or twin layers? Recommended: the wing, built as a second small gantry on a post.
2. Is it fine that the wing works on the right on line 1 and the left on line 2? Recommended: yes, it follows the second track, and each chair gets a turn beside it.
3. Should players be able to stand on the wing once it is real? Recommended: yes.

## Parked

- The wing opening at the pier head as Ring Island's laying sets off over the bents: a clip moment, after a yes.
- A gag where the wing knocks a lamp on a single stretch and folds in a hurry: after a yes, never on its first build.
- A twin layer as a later upgrade ("a second layer for the network") if the garage ever sells machines.

## Design review (designer, 11 November 2026)

Calls: 9 decided, 9 default, 4 new; rows in [agent-calls](../agent-calls.md#rail-construction-levels-and-travel).
Nothing waits for the owner. Answers: 1 the wing; 2 the same beat; 3 no chair; 4 yes, after a yes; 5 yes.

Change before the greybox:

1. **The side flips.** Line 1 is laid at dir −1, so its up track is on the machine's right; line 2's is on the left.
   One machine serves both. Take the side from the up seat, and stow the wing along the header at the GLB step.
   The Pitch's "left side" and "left chair" hold on line 2 only.
2. **The hand needs its own pivot.** The up seat is 5.73 m ahead of the flatbed. The second mechanism is a small
   gantry on a post over the up track, tied back by the arm; extended it is a portal. Draw the post in the greybox.
   Add a parts table (part, pivot, range) and a six-beat storyboard here first (owner call, 5 November).
3. **Leave `PANEL_BEAM_LENGTH` at 7.0 in the greybox.** `dev/level/machine-clearance.ts` compares the built GLB beam
   with it to 0.02 m. The flag path keeps its own 5.8 m length and reach assertions for both hands.

Corrections and gaps:

4. The wing does not fold at the crossover (s 490–512); the up track runs to s 556. Crossing rails drop under the
   arm in the greybox, judged from a Far Head still.
5. Platform clearance is unproven: the clearance check samples line 1 only. Outboard of the up rail there is 0.95 m
   to the platforms, so the up stack goes between the tracks. The machine stands with its head at s 178 through
   Q4's haul, flatbed beside the Quarry up platform's range: capture it.
6. For about the first 15 m of a turnout the truck has no rail clear of the flatbed: it sets down at a gap of about
   1.8 m.
7. "What looks solid is solid": after a yes the truck and stack platform are solid and standable.
8. The cycle is still 0.39–0.62 s. What the wing adds is a hand and a stack over each track at all times; judge
   that, not whether one cycle can be followed.

Done means, added: the side follows the up track on line 1; one real-time motion sheet (eight frames over one double
panel at cruise, eye height, 12–15 m off the front quarter on the down side, with a no-flag control) in which the up
jaws hold a pair over the up track in at least three frames and no up pair lies under empty air; stills parked at
s 178 and side-on from 50 m; a Far Head crossover panel.

Not seen: the wing itself, the distance view, the chair view and line 2 at the platforms.

## Wing greybox: parts and storyboard (step A, 11 November 2026)

Written before the code, as the review requires. Frame: the flatbed's rig frame (rail level, +z the machine's heading,
+x its left; the up track is at +x on line 2 and at -x on line 1). `side` is the sign of the up seat's x. Everything is
a plain box, behind `?layer=wing`; no colliders. `PANEL_BEAM_LENGTH` stays 7.0 (the GLB beam is untouched and still
drawn); the flag path asserts its own 5.8 m reach for both hands.

| Part | Pivot (rig frame) | Range | Colour |
| --- | --- | --- | --- |
| Arm | hinge on the flatbed's up-side rail, x = side * 1.1, y 1.3, z 1.2 | telescopes from 0.3 m (folded) to 2.9 m (gap 4 m); its tip is the post | orange |
| Post | tip of the arm, x = side * max(gap, 1.4), z 1.2 ahead of the flatbed centre; head at y 4.0 | fixed 4.0 m tall; moves with the arm only | orange |
| Truck (frame, stem, two wheels, one per rail at +/-0.5 m) | foot of the post | vertical slide 0.9 m (lifted) to 0 (on the rails); lifted at gap <= 1.4 m, down at gap >= 1.8 m | orange frame, dark wheels |
| Wing beam | post head, y 4.0, yaws to keep the trolley on it | 5.8 m long, yaw about +/-40 deg | cream |
| Wing trolley, 3 hoist sleeves, 2 jaws | on the beam, as the main hand's | trolley 0 to 5.8 m; sleeves 3 x 1.45 m stroke; jaws 0.05 to 0.5 m | cream |
| Up stack | on the platform, 1.5 m ahead of the post, y 2.86 | one pair per up panel still to lay (up to 36); centre x = side * (1.95 folded to 2.9 open), i.e. outboard of the flatbed when folded and between the tracks when open | steel rails on an orange platform |
| Platform | bracket off the post, y 2.78 | follows the stack's x | orange |
| Main hand | unchanged GLB rig, `second: null` | down pair only, no crossing | as today |

The gap is `-upLat` at the post's s (the flatbed's s plus 1.2 m toward the head); the side follows the up seat (the
machine's right on line 1, laid toward Home at dir -1; its left on line 2). Folded (single line, or gap 0): post at
x = side * 1.4, truck lifted, hand home over its stack, beam parallel to the main beam. The up hand reaches the up seat
from the post whatever the truck is doing (cantilevered while the truck is lifted); worst case about 4.7 m of the 5.8.

Storyboard, one double panel at cruise (about 0.5 s; both hands run the same `panelPose` on the same phase, so every
beat happens twice at once, one under each hand):

1. **Rest.** Head at the panel's start; the truck stands on the up rails (gap 4 m), arm out, both trolleys home over
   their stacks (down on the gantry's shoulders, up on the platform between the tracks), jaws open.
2. **Lower and pick.** Both trolleys reach down into their stacks and close on the top pair; both stacks lose a pair.
3. **Lift to sweep height.** Both hoists retract; the pairs rise clear of the stacks. The truck does not move.
4. **Travel.** Each trolley runs out along its beam to its track's panel start; the wing beam yaws a few degrees toward
   the up track, the main beam toward the down track.
5. **Sweep.** Both hands run along their track over the panel; the sleepers and other pieces fall from under the
   passing jaws (the track still keys them to the main hand's frame).
6. **Seat and contact.** Both hoists lower and set their pairs on the sleepers in the same beat (view offset between
   the two, tunable, default 0); the track shows both pairs at once, one clank; the hands rise and return. Each stack
   is one lower.

At a turnout (about the first 15 m): the arm grows with the gap while the truck stays lifted beside the flatbed and
the up hand works cantilevered; at gap 1.8 m the truck sets down on the new rails, and on the way in it lifts at the
same gap. At Far Head (s 490 to 512) the crossover's rails drop under the arm as sleepers drop under the jaws.

## Greybox result (11 November 2026)

Built as the sheet above says, with these differences: the arm and platform are scaled boxes (greybox only); the wing
stack's lateral position is `WING.stackFolded` to `stackOpen` (outboard of the flatbed when folded, between the tracks
when open), so it never overlaps the gantry's own; the side is taken from the up seat once its x passes 1 m (the first
metres of a turnout flip sign on a curve), before that from the heading. The magazine splits in the flag path only:
`rig` draws one pair per panel, the wing one per up panel, deliveries alternate. The track still keys sweeping pieces to
the main hand's frame, and both pairs appear at the panel's commit, which is the same beat for both hands.
Live reach (`machine.wingStats`, all of line 1's first two stretches and line 2 to Far Head): down hand at most 5.01 m,
up hand at most 4.81 m, of the 5.8 m beam; the unit test covers every panel of both lines on straight ground (4.98 m and
3.84 m).
