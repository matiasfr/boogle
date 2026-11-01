# 6.20 Prototype: soapbox (`?proto=soapbox`)

*A mechanics-only prototype for [find-the-fun](../plans/find-the-fun.md), step 5: "Is driving a vehicle fun?" Feel
first, no rewards. Serves DESIGN.md 1 (Toys before chores), with 2 (Physics toys first) and 10 (Slapstick over
precision). Without the flag the cart never loads: `src/features/soapbox.ts` imports `src/proto/soapbox/` only with
it (and otherwise only hides a remote driver; see Sync).*

## What you see and do

- A greybox cart (a plank tub, a red seat back and bonnet, four coconut wheels) is parked on the summit of the rocky
  massif in the north-west (about 19 m up, the island's highest ground), facing east along its ridge. The course
  (`src/proto/soapbox/course.ts`): east along the ridge, a right-hander, down the south face's east edge (a crest at
  its foot gives about half a second of air), a kink past a palm, and a long right across the lowland, finishing as it
  opens out while the ground still falls. About 100 m, marked by orange cones every 5 m, 3.2 m either side of the line
  (one instanced mesh, no colliders). The start is a white board across the line, the finish a red one, each laid in
  eight short planks tilted to the ground under them (so it lies on a slope instead of standing proud of it), with
  knee-high flags: nothing tall for the chase camera to clip. (The course used to go on through a palm slalom and along
  the bay's flat shore: its last 8 s were kicking along at 5 m/s.)
- **Get in:** Interact (E, pad B, touch Grab) within 2.6 m. **Get out:** Interact again. Stopped (under 1.5 m/s) more
  than 4 m from the start, Interact reads **Back to the top** instead: you and the cart are put back on the start.
- **Driving** uses the move input, relative to the cart: left and right steer, forward kicks off (up to 5 m/s, to get
  off the flat shoulder), back brakes (and creeps backwards from a standstill). **Jump** (Space, pad A, touch Jump) is
  the handbrake while moving, and hops you out once stopped. The arrow keys only steer here (no arrow-key camera turn)
  and a two-finger scroll does not look: the chase camera owns the view. A stick pulled back brakes only past 0.35 of
  its travel (a bowtie dead zone; steering keeps the stick's own 0.12), so a thumb drifting down doesn't stop the cart.
- **Driving touch layout** while seated: the main button reads **Get out** (or Back to the top), Jump reads
  **Drift / Brake**, and Bump, Toss, Honk and Ping hide.
- **Drift boost** (all three variants): holding the handbrake on the ground charges a drift, faster with the stick
  held hard (0.7 or more) into the slide (Mario Kart's counter: 5 a step, 2 otherwise, at 60 steps a second). The rear
  wheels' sparks tell the charge: yellow, then **blue** at 120 (0.4 s at best: "ready", with a tick), then **pink** at
  240 (0.8 s: "big", a higher tick). Let go of the handbrake whenever you like (no timing window): ready pushes you
  +3 m/s forward over 0.35 s, big +5 m/s over 0.6 s, as acceleration that drag takes back; a burst and a jet of sparks
  in the tier's colour, a whoosh, and a field-of-view kick (+5° or +9°). The default and grip get 0.75x those speeds,
  drifty the full. A bump in the middle of a drift keeps the charge (it just stops growing in the air). An empty-handed click does nothing while seated (it would
  otherwise get you out); holding something, the click still throws it from the cart.
- **The run:** seated on the start, the HUD shows "Ready". The clock starts once you have rolled 3 m and stops on the
  finish line, after which the cart brakes itself to a stop; your best time is kept in localStorage (`boogle.soapbox.best`) and shown
  beside it, with "New best!" when you beat it. A wipeout ends the run ("Wipeout!"); getting out ends it quietly. No
  prize, no hat.
- **Crashes are a show:** a hard hit (a palm trunk, a rock) freezes the cart, you and the camera for 70 ms (hit-stop;
  the physics runs on), shakes the camera, pops a rear wheel off to bounce away, splinters planks, and thumps; then you
  are thrown out: up 11 m/s, keeping 55% of the cart's speed and a sideways shove, flipping as you go. For 2.4 s the
  camera stays back and turns after you, so you see the flight and the landing. The empty cart rolls to a stop and goes
  back to the start, wheel back on, after 2 s. Once you have landed, Interact reads **Back to the top** for 20 s,
  wherever you are: you are put in the cart on the start, Ready. No walk back up the massif, no cost per crash.
- **Feel:** dust from the rear wheels growing with speed (more, bigger, longer-lived, trailing behind you from 12 m/s),
  sparks while the rear slides, a dust burst and sparks on a crash; the cart tilts to the ground, rolls out of turns
  and bounces on landings. **Sound** (synthesized, quiet, local; `src/proto/soapbox/sound.ts`): the wheels roll in two
  crossfaded layers (a low rumble up to 8 m/s, a wooden rattle above it, each pitched only 0.8-1.3), wind from 10 m/s,
  silent in the air; ticks for the charge, a whoosh for a boost, a thump and clatter for a crash.
- **Camera:** it aims ahead of the cart along its velocity (0.3 s of it, at most 4 m: where the cart will be), turns
  with your steering (up to 0.25 rad, faded in over 0.3 s), swings in behind where the cart is going (so a drift shows
  from outside), and keeps its distance nearly fixed (8.5 m, at most 0.5 m more at speed); it pulls in short of any
  rock or trunk between it and you. The field of view widens 0.6° per m/s over 6 m/s, plus a boost's kick, capped at
  +12° together; it opens at 4/s and closes at 2/s. **Shake** is trauma²: a landing from over 6 m/s of fall adds 0.25,
  a crash 0.6, and it decays 1.5 a second; rotation only (2° yaw and pitch, 1° roll at full trauma) from smooth noise
  at 12 Hz. Nothing shakes with reduced motion on.
- **Seated** you sit low in the tub, leaning back and tilting with the cart, with no walk cycle (remote drivers too).
  World labels (work-site rings and plaques, signs) hide while you drive and come back when you get out.

The scripted pilot's run (`dev/look/evals/soapbox-run.js`, braking for the bends) takes about 10.5 s in all three
variants, with a top speed near 14 m/s, finishing at about 8 m/s.

## Handling variants (`&v=`)

For comparing in one sitting; no `&v` is the tuning below.

- **`&v=grip`:** planted and precise. Grip 48, handbrake grip 14, drift turn x1.15, nose at most 0.55 rad out,
  handbrake drag 2.2: short, tidy drifts.
- **`&v=drifty`:** loose rear, long drifts, the full drift boost. Grip 32 (letting go only to 0.8x when sideways),
  handbrake grip 3, drift turn x1.7, nose up to 1.35 rad out, 75% of a slide carried forward, handbrake drag 1.0.

## How it works

- **One body:** a frictionless 0.5 m sphere, 120 kg, that gravity rolls downhill; grip, steering and drag are added by
  hand each fixed step (vehicles.md rule 1: fake the stability, keep the physics). It cannot flip; the mesh is posed on
  top. Parked, it is kinematic (a solid thing you walk into).
- **Steering** is a bicycle model (turn rate = speed x tan(wheel angle) / 1.44 m), the wheel angle easing from 0.55 rad
  below 4 m/s to 0.17 rad at 16 m/s. **Grip** cancels up to 36 m/s² of sideways speed (6 with the handbrake), and 60% of
  what it cancels carries on forward, so turning keeps your speed. It is a curve, not a cap (Rocket League, via
  vehicle-feel.md): full while the slip ratio (sideways speed / (sideways + forward)) is under 0.25, falling to 0.65x by
  0.5 so the grip lets go once you are properly sideways, and times 0.85 on ground as steep as the massif's face (n.y
  0.8; full from 0.95). The handbrake's grip has no curve. The research's first guesses (0.15, 0.55, 0.7) let a landing
  on the face snowball into a slide you could not steer out of. With the handbrake the turn rate is 1.4x, but the
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

`BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-run.js --hud --warm 0.2 --seconds 13 --frames 16`
(also `soapbox-drift.js` and `soapbox-crash.js`; each eval's header has its timing; add `&v=drifty` to the query for a
variant). The pilot,
`dev/look/evals/soapbox-pilot.ts`, drives through the real input.

## Not built

The muddy shortcut, the plank tally, The Boogler's Puff Boost, pushing a cart with friends, carrying
the ball, races, rewards and the era hat (proposals: [vertical-slice.md](../proposals/vertical-slice.md) S5 and S6,
[vehicles.md](../proposals/vehicles.md)).
