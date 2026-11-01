# 6.20 Prototype: soapbox (`?proto=soapbox`)

*A mechanics-only prototype for [find-the-fun](../plans/find-the-fun.md), step 5: "Is driving a vehicle fun?" Feel
first, no rewards. Serves DESIGN.md 1 (Toys before chores), with 2 (Physics toys first) and 10 (Slapstick over
precision). Without the flag the cart never loads: `src/features/soapbox.ts` imports `src/proto/soapbox/` only with
it (and otherwise only hides a remote driver; see Sync).*

## What you see and do

- A greybox cart (a plank tub, a red seat back and bonnet, four coconut wheels) is parked on the summit of the rocky
  massif in the north-west (about 19 m up, the island's highest ground), facing east along its ridge. The course
  (`src/proto/soapbox/course.ts`): east along the ridge, a right-hander, down the south face's east edge (a crest at
  its foot gives about half a second of air), a kink past a palm, a long right and a left-right slalom through the
  palms of the lowland, onto the sand by the bay and along its west shore. About 145 m, marked by orange cones every
  5 m, 3.2 m either side of the line (one instanced mesh, no colliders). The start is a flat white board across the
  line, the finish a red one short of the sea, each with knee-high flags: nothing tall for the chase camera to clip.
- **Get in:** Interact (E, pad B, touch Grab) within 2.6 m. **Get out:** Interact again. Stopped (under 1.5 m/s) more
  than 4 m from the start, Interact reads **Back to the top** instead: you and the cart are put back on the start.
- **Driving** uses the move input, relative to the cart: left and right steer, forward kicks off (up to 5 m/s, to get
  off the flat shoulder), back brakes (and creeps backwards from a standstill). **Jump** (Space, pad A, touch Jump) is
  the handbrake while moving, and hops you out once stopped. An empty-handed click does nothing while seated (it would
  otherwise get you out); holding something, the click still throws it from the cart.
- **The run:** seated on the start, the HUD shows "Ready". The clock starts once you have rolled 3 m and stops on the
  finish line, after which the cart brakes itself to a stop; your best time is kept in localStorage (`boogle.soapbox.best`) and shown
  beside it, with "New best!" when you beat it. A wipeout ends the run ("Wipeout!"); getting out ends it quietly. No
  prize, no hat.
- **Crashes:** a hard hit (a palm trunk, a rock) throws you out: up 11 m/s, keeping 55% of the cart's speed and
  a sideways shove, flipping as you go. The empty cart rolls to a stop and goes back to the start by itself after 3.5 s.
- **Feel:** dust from the rear wheels at speed, sparks while the rear slides, a dust burst and sparks on a crash; the
  cart tilts to the ground, rolls out of turns and bounces on landings; the camera swings in behind where the cart is
  going (so a drift shows from outside), pulls back to 8.5 m, pulls in short of any rock or trunk between it and you,
  and widens the field of view with speed.
- **Seated** you sit low in the tub, leaning back and tilting with the cart, with no walk cycle (remote drivers too).
  World labels (work-site rings and plaques, signs) hide while you drive and come back when you get out.

The scripted pilot's run (`dev/look/evals/soapbox-run.js`, braking for the bends, kicking along on the flat shore)
takes about 20.5 s with a top speed near 13 m/s. The last stretch along the shore is flat: you kick along at 5 m/s.

## Handling variants (`&v=`)

For comparing in one sitting; no `&v` is the tuning below.

- **`&v=grip`:** planted and precise. Grip 48, handbrake grip 14, drift turn x1.15, nose at most 0.55 rad out,
  handbrake drag 2.2: short, tidy drifts.
- **`&v=drifty`:** loose rear, long drifts. Grip 26, handbrake grip 3, drift turn x1.7, nose up to 1.35 rad out, 75%
  of a slide carried forward, handbrake drag 1.0. A drift held 0.6 s charges (the sparks turn hot and thicker); letting
  go adds 3 m/s forward (up to 4.5 for a long one) with a spark burst and a field-of-view kick.

## How it works

- **One body:** a frictionless 0.5 m sphere, 120 kg, that gravity rolls downhill; grip, steering and drag are added by
  hand each fixed step (vehicles.md rule 1: fake the stability, keep the physics). It cannot flip; the mesh is posed on
  top. Parked, it is kinematic (a solid thing you walk into).
- **Steering** is a bicycle model (turn rate = speed x tan(wheel angle) / 1.44 m), the wheel angle easing from 0.55 rad
  below 4 m/s to 0.17 rad at 16 m/s. **Grip** cancels up to 36 m/s² of sideways speed (6 with the handbrake), and 60% of
  what it cancels carries on forward, so turning keeps your speed. With the handbrake the turn rate is 1.4x, but the
  nose never swings more than 1 rad from the direction of travel: drifts hold, they don't spin out.
- **Speed:** rolling resistance 0.35 m/s², air drag 0.014 v², handbrake 1.6 m/s², brake 16 m/s² (enough to hold the
  cart on the massif's steep face). An empty cart, or one past the finish, brakes at 5 m/s².
- **Crash:** the speed the physics solver knocks off in a step (a leaky sum over a few steps), over 9 m/s while you were
  doing at least 6 m/s, or a landing that adds 15 m/s upward in one step. Driving into water gets you out.
- **Seated,** your own body leaves the physics world and is put on the seat each frame, so the camera, your avatar and
  your presence follow the cart.
- Tuning lives in `T` at the top of `src/proto/soapbox/index.ts` (`window.__soapbox.T` in the console).

## Sync

Owner kind. The driver publishes the cart as presence `soapbox: [x, y, z, qx, qy, qz, qw, wheel angle, speed]` (null
when not seated); other tabs with the flag draw it with `createSnaps` at `now - INTERP_MS`. Each tab has its own
parked cart; an empty cart is local. Tabs without the flag draw no carts: they hide a remote player's avatar while
their `soapbox` presence is set (`src/features/soapbox.ts`, the only part that runs without the flag).

## Look at it

`BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-run.js --hud --warm 0.2 --seconds 24 --frames 16`
(also `soapbox-drift.js` and `soapbox-crash.js`; each eval's header has its timing; add `&v=drifty` to the query for a
variant). The pilot,
`dev/look/evals/soapbox-pilot.ts`, drives through the real input.

## Not built

The muddy shortcut, the plank tally, The Boogler's Puff Boost, pushing a cart with friends, carrying
the ball, races, rewards and the era hat (proposals: [vertical-slice.md](../proposals/vertical-slice.md) S5 and S6,
[vehicles.md](../proposals/vehicles.md)).
