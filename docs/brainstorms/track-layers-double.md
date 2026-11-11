> **Status: proposed (2026-11-11).** Light brainstorm (one agent, three lenses). Look and read only: the rule that one
> action lays both tracks ([decision](../decisions-rail.md#d-2026-11-10-the-railway-is-double-track)) stays as it is,
> with no bill, timing, wire, save or `WORLD_NS` change.

# Laying both tracks plausibly (track-layers-double)

The owner's seed, 11 November: "P3 we'll have to fix reworking the track layer(s) system so that the dual track laying
works plausibly". Asked whether this was about the look or the rule, he confirmed it is the look: today one machine
appears to produce two parallel tracks.

## What a player sees today

From the code ([machine-panels.ts](../../src/entities/railway/machine-panels.ts) `pose`,
[track.ts](../../src/entities/railway/track.ts) `seatUp`, [place.md](../game-design/place.md), "The second track,
drawn"): both lines lay through the same `Machine.layPanel`. The loco and the 2.2 m flatbed run on today's (down)
track. One slewing beam (7.0 m, up from 5.8 m for this) carries one trolley with one pair of jaws. On a double panel it
lifts the top two pairs off the one stack, sweeps and seats the down pair, lets go, hops 0.35 m and crosses 4 m left to
seat the up pair. The up pair's crossing is the last 17% of a cycle that lasts 0.39–0.62 s at cruise, so it takes
about 0.1 s. Line 1 is double from s 36 to 182, line 2 from s 34 to 556 (with Far Head's crossover); the turntable,
Village platforms, Camp end and pier stay single.

**One look** (`proto=place&machineView=lay`, the track-layer evals, 8 s, `--wall 240`; `.look/lay-double-still.png`,
not committed): the machine sits on the near track with its cream beam swung out left over the second track. Both
tracks run up to the same point beside the machine, and the up track's end lies under nothing but the tip of a thin
boom. At cruise the motion sheet never catches the jaws over the up track. It reads as one small machine pulling two
tracks out of itself, with the second one just appearing. That is the owner's complaint, confirmed.

## Pitch

Give the machine a **second hand where the second track is**. A wing folds out of the flatbed's left side, rides the
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

1. **The wing: one machine, two hands** (all three lenses). A telescoping outrigger off the flatbed's left with a
   second trolley and jaws, a small up-track stack on it, and a two-wheel trailing truck on the up rails it has just
   laid (as the machine rides the rails it lays). Both mechanisms run the existing `panelPose` on the same phase,
   with no crossing. Costs: new parts (arm, sleeve, truck, second trolley and jaws, second stack), a second
   `panelMechanism` instance, and the main beam goes back to 5.8 m. Laying time is unchanged, and each cycle now has
   room to be read. From a distance it reads as a wider machine with its arms out. For a second player, the left
   chair now faces a working hand. Bridges: the trestle decks are 7.6 m and span both tracks, so the truck rides deck.
   Pier and Village: folded, so the parked machine is no longer or wider than today (line 2's engine still stops 1 m
   clear). Curves: the arm follows the up seat's yaw (the up track is on the inside of left curves, the outside of
   right ones), and the sleeve's length is `upLat` at the head. The footing wagon is unaffected. Later lines, and the
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
- **Risks:** the crossover at Far Head (s 490–512), whose rails nobody carries today (decide in the build: the wing
  lays the crossing rails as it folds in); the level check on the 7.0 m beam ([machine-panels.ts](../../src/entities/railway/machine-panels.ts)
  `PANEL_BEAM_LENGTH`) must follow the shorter beam; the hook pillar p2 (11 m out) and the gates (10.4 m) clear a 5 m
  wing, but the Quarry and Far Head up platforms stand just outside the up track, so the wing must stay inside its
  rails (truck on the rails, arm above platform height). Performance (guide, not gate): one more mechanism is about 4
  more draws and up to 72 more rail instances in an existing batch, against the machine's 196-call upper bound.

## Done means

Captured with `look` on `proto=place` and the track-layer evals (`dev/look/evals/track-layer.ts`,
`track-layer-action.ts`), plus `&layer=wing`:

- `machineView=lay` mid double panel: two trolleys over two tracks, each pair seated under its own jaws, both stacks
  visibly lower than at the start.
- `machineView=side` through line 1's turnout (s 36–56): the wing grows from folded to 4 m in step with the up track.
- `machineView=normal` from the left chair, video at cruise: both seats land in the same beat, and the up hand is
  readable at real speed (no crossing hop).
- Line 2 on the gorge trestle: the truck rides the 7.6 m deck.
- Parked at the pier halt: folded, with the engine still clear by 1 m.

## Open questions

1. **One machine with a wing, or two yoked layers?** Recommended: the wing. One machine reads as one action, folds for
   single track, and costs about a third of the twin. Answer: \_\_\_
2. **Do both hands lay in the same beat, or down then up a half-beat apart?** Recommended: the same beat. One clank,
   two pairs, is what makes "the same effort" visible. Answer: \_\_\_
3. **Should the wing get a chair** (a third seat facing the up hand)? Recommended: not now. The two chairs stay, the
   left one faces the wing, and a chair can come after a yes. Answer: \_\_\_
4. **Does the wing go into the GLB and `track-layer.py` after a yes, with the parts sheet and storyboard the owner call
   asks for?** Recommended: yes, as a second step once the greybox reads. Answer: \_\_\_
5. **Does the stack split into two (down on the gantry, up on the wing), with deliveries landing alternately?**
   Recommended: yes. Each hand empties its own stack, and the room sees both go down. Answer: \_\_\_

## Parked

- The wing opening at the pier head as Ring Island's laying sets off over the bents: a clip moment, after a yes.
- A gag where the wing knocks a lamp on a single stretch and folds in a hurry: after a yes, never on its first build.
- A twin layer as a later upgrade ("a second layer for the network") if the garage ever sells machines.
