# 6.20 Prototype: soapbox (`?proto=soapbox`)

*A mechanics-only prototype for [find-the-fun](../plans/find-the-fun.md), step 5: "Is driving a vehicle fun?" Feel
first, no rewards. Serves DESIGN.md 1 (Toys before chores), with 2 (Physics toys first) and 10 (Slapstick over
precision). Third try (2026-11-01): after two "no"s the cart drives as a suspensiony RC car with analog triggers
([boogle-2.md](../proposals/boogle-2.md); research: [vehicle-feel.md](../research/vehicle-feel.md), "RC cars"). If
this is still a no, driving waits. Without the flag the cart never loads: `src/features/proto-soapbox.ts` imports `src/proto/soapbox/` only with
it (and otherwise only hides a remote driver; see Sync).*

## What you see and do

- A greybox RC-style cart (a plank tub, a red seat back and bonnet, on four big coconut wheels hung from pale struts,
  so you can see the body ride on its springs) is parked on the summit of the rocky
  massif in the north-west (about 19 m up, the island's highest ground), facing east along its ridge. The course
  (`src/proto/soapbox/course.ts`): east along the ridge, a right-hander, down the south face's east edge (a crest at
  its foot gives about half a second of air), a kink past a palm, and a long right across the lowland, finishing as it
  opens out while the ground still falls. About 100 m, marked by orange cones every 5 m, 3.2 m either side of the line
  (one instanced mesh, no colliders). The start is a white board across the line, the finish a red one, each laid in
  eight short planks tilted to the ground under them (so it lies on a slope instead of standing proud of it), with
  knee-high flags: nothing tall for the chase camera to clip. (The course used to go on through a palm slalom and along
  the bay's flat shore: its last 8 s were kicking along at 5 m/s.)
- **Get in:** Interact (E, pad X, touch Grab) within 2.6 m. **Get out:** Interact again. Stopped (under 1.5 m/s) more
  than 4 m from the start, Interact reads **Back to the top** instead: you and the cart are put back on the start.
- **Driving** (vehicle-feel.md, RC cars 4-6): left and right on the stick or A/D steer. **Throttle** is RT (analog), W
  or ↑, or the stick pushed forward; **brake, then reverse** from a crawl is LT (analog), S or ↓, or the stick pulled
  back. The most of each input counts; throttle and brake together cancel. The motor pulls 12 m/s² from a standstill,
  falling to nothing at 13 m/s (the hill takes you past it); reverse tops out at 5 m/s. While seated RT and LT do only
  this: Bump and the guest's crouch wait until you get out (`wrapAction`). **In the air** throttle lifts the nose and
  brake drops it (real RC jumping), damped so it never tumbles; on landing the angle goes into the springs, so a
  nose-first landing slams the front. **Jump** (Space, pad A, touch Jump) is
  the handbrake while moving, and hops you out once stopped. The arrow keys only steer here (no arrow-key camera turn)
  and a two-finger scroll does not look: the chase camera owns the view. A stick pulled back brakes only past 0.35 of
  its travel (a bowtie dead zone; steering keeps the stick's own 0.12), so a thumb drifting down doesn't stop the cart.
- **Driving touch layout** while seated: the main button reads **Get out** (or Back to the top), Jump reads
  **Drift / Brake**, and Bump, Toss, Honk and Ping hide.
- **Drift boost** (all three variants): holding the handbrake on the ground charges a drift, faster with the stick
  held hard (0.7 or more) into the slide (Mario Kart's counter: 5 a step, 2 otherwise, at 60 steps a second). The rear
  wheels' sparks tell the charge: yellow, then **blue** at 120 (0.4 s at best: "ready"), then **pink** at
  240 (0.8 s: "big"). Let go of the handbrake whenever you like (no timing window): ready pushes you
  +3 m/s forward over 0.35 s, big +5 m/s over 0.6 s, as acceleration that drag takes back; a burst and a jet of sparks
  in the tier's colour and a field-of-view kick (+5° or +9°). The default and grip get 0.75x those speeds,
  drifty the full. A bump in the middle of a drift keeps the charge (it just stops growing in the air). An empty-handed click does nothing while seated (it would
  otherwise get you out); holding something, the click still throws it from the cart.
- **The run:** seated on the start, the HUD shows "Ready". The clock starts once you have rolled 3 m and stops on the
  finish line, after which the cart brakes itself to a stop; your best time is kept in localStorage (`boogle.soapbox.best`) and shown
  beside it, with "New best!" when you beat it. A wipeout ends the run ("Wipeout!"); getting out ends it quietly. No
  prize, no hat. Each finished run counts once on the prototype bar (`runs`).
- **The ghost** (`src/proto/soapbox/ghost.ts`): your best run, replayed as a see-through pale blue cart on the next one
  (Trackmania's ghost; [minigames research](../research/minigames-and-physics-minigames.md), shortlist #1). It waits on
  the spot where the clock starts while you are Ready and goes when your clock does, so it is exactly where you were at
  that time on your best run; it is gone once you finish (or a second after its own finish). At the finish a small
  split under the time says how you did against it: green "−0.40 s" ahead, red "+0.40 s" behind. The pose (position,
  rotation, front-wheel angle) is recorded at 20 Hz while the clock runs and kept in localStorage
  (`boogle.soapbox.ghost`) whenever a run beats the saved ghost. Local only: nobody else sees it, it has no collider.
- **Crashes are a show:** a hard hit (a palm trunk, a rock) freezes the cart, you and the camera for 70 ms (hit-stop;
  the physics runs on), shakes the camera, pops a rear wheel off to bounce away and splinters planks; then you
  are thrown out: up 11 m/s, keeping 55% of the cart's speed and a sideways shove, flipping as you go. For 2.4 s the
  camera stays back and turns after you, so you see the flight and the landing. The empty cart rolls to a stop and goes
  back to the start, wheel back on, after 2 s. Once you have landed, Interact reads **Back to the top** for 20 s,
  wherever you are: you are put in the cart on the start, Ready. No walk back up the massif, no cost per crash.
- **Suspension you can see:** the body rolls out of a turn (about 9° in a hard one), squats on the throttle, dives on
  the brake, squashes and rebounds on a landing, and rocks over crests while the wheels follow the ground on their own
  (a wheel hangs up to 20 cm below rest). The same ride shows on other players' carts.
- **Feel:** dust from the rear wheels growing with speed (more, bigger, longer-lived, trailing behind you from 12 m/s),
  sparks while the rear slides, a dust burst and sparks on a crash. **No sound for now:** the rolling rumble and rattle, the wind, the charge ticks, the boost whoosh and the crash were cut in the sound audit (2026-11-02); better ones come later, from references.
- **Camera:** it aims ahead of the cart along its velocity (0.3 s of it, at most 4 m: where the cart will be), turns
  with your steering (up to 0.25 rad, faded in over 0.3 s), swings in behind where the cart is going (so a drift shows
  from outside), and keeps its distance nearly fixed (8.5 m, at most 0.5 m more at speed); it pulls in short of any
  rock or trunk between it and you. Leafy crowns (palm fronds, broadleaf blobs) have no colliders, so the camera checks
  the course's canopies as spheres (`canopies` in `src/render/props.ts`, kept 0.9 m clear): with one in the way it
  first ducks down toward your head height (crowns are overhead, a lower camera often passes under them), then pulls
  in short of what is still in the way, never closer than 3 m; it goes in at 8/s and back out at 3.5/s (ducking out
  2.5/s), so a tree passing glides instead of popping. The field of view widens 0.6° per m/s over 6 m/s, plus a boost's kick, capped at
  +12° together; it opens at 4/s and closes at 2/s. **Shake** is trauma²: a landing from over 6 m/s of fall adds 0.25,
  a crash 0.6, and it decays 1.5 a second; rotation only (2° yaw and pitch, 1° roll at full trauma) from smooth noise
  at 12 Hz. Nothing shakes with reduced motion on.
- **Seated** you sit low in the tub, leaning back and tilting with the cart, with no walk cycle (remote drivers too).
  World labels (work-site rings and plaques, signs) hide while you drive and come back when you get out.

The scripted pilot's run (`dev/look/evals/soapbox-run.ts`, on the triggers: throttle up to 12 m/s, braking for the
bends) takes about 9 s, with a top speed near 15 m/s. It sometimes runs off the line into a palm or up a rock: a
wipeout or a stop that a player would steer out of.

## Handling variants (`&v=`)

For comparing in one sitting, each changing one thing; no `&v` is the tuning below. They switch live from the
prototype bar.

- **`&v=bouncy`:** soft, long-travel springs: spring 16, damper 0.9 (damping ratio about 0.2, so it bounces twice), a
  wheel hangs up to 34 cm, landings jolt up to 7 m/s. Big roll and bounce, a monster truck.
- **`&v=tight`:** stiff, short springs and more grip: spring 70, damper 5 (ratio 0.6), 9 cm of droop, grip 46,
  handbrake grip 9, and less grip lost with wheels off the ground (0.8x). Planted.
- **`&v=drift`:** a loose rear: grip 32 (letting go only to 0.8x when sideways), handbrake grip 3, drift turn x1.7,
  nose up to 1.35 rad out, 75% of a slide carried forward, handbrake drag 1.0, the full drift boost.

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
- **Speed:** the motor (above), rolling resistance 0.35 m/s², air drag 0.014 v², handbrake 1.6 m/s², brake 16 m/s²
  (enough to hold the cart on the massif's steep face).
- **Suspension** (all cosmetic but the grip; vehicle-feel.md, RC cars 1-3): the mesh is two layers. The frame sits on
  the sphere, facing the heading and tilted to the plane through the ground under the four wheels (a straight-down ray
  at each; the sphere's own normal when one misses or the plane is steeper than n.y 0.8, a wheel on a rock). Each frame
  a ray per wheel down the frame finds its ground, and a spring-damper per wheel (k 30, c 2.2 per unit mass: about
  1.7 Hz, damping ratio 0.4; never pulling; a stiff, damped bump stop at 6 cm) holds up a chassis with heave, pitch and
  roll, integrated at 120 Hz. The chassis feels the frame's motion the other way: 0.6 of each sudden change in the
  sphere's vertical speed (at most 5 m/s; a landing, a dip), the forward acceleration x2 as pitch (squat, dive) and the
  wheels' sideways grip x1.5 as roll. With no wheel down it eases back to rest. Limits: heave 0.35 m, pitch 0.4 rad,
  roll 0.32 rad. Grip is multiplied by 0.55-1 by the share of wheels on the ground, so a bounce after a landing is
  briefly loose. An empty cart, or one past the finish, brakes at 5 m/s².
- **Crash:** the speed the physics solver knocks off in a step (a leaky sum over a few steps), over 9 m/s while you were
  doing at least 6 m/s, or a landing that adds 15 m/s upward in one step. Driving into water gets you out.
- **Seated,** your own body leaves the physics world and is put on the seat each frame, so the camera, your avatar and
  your presence follow the cart.
- Tuning lives in `T` at the top of `src/proto/soapbox/index.ts` (`window.__soapbox.T` in the console).

## Sync

Owner kind. The driver publishes the cart as presence `soapbox: [x, y, z, qx, qy, qz, qw, wheel angle, speed]` (null
when not seated; the frame, without the ride) and the ride as `soapboxRide: [heave, pitch, roll, four wheel heights]`
(a separate key, so an older build still draws the cart, stiffly); other tabs with the flag draw both with
`createSnaps` at `now - INTERP_MS`. Each tab has its own
parked cart; an empty cart is local. Tabs without the flag draw no carts: they hide a remote player's avatar while
their `soapbox` presence is set (`src/features/proto-soapbox.ts`, the only part that runs without the flag).

## Look at it

`BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-run.ts --hud --warm 0.2 --seconds 13 --frames 16`
(also `soapbox-drift.ts`, `soapbox-crash.ts` and `soapbox-ghost.ts`, a first run that sets the ghost and a second
beside it; each eval's header has its timing; add `&v=bouncy`, `&v=tight` or `&v=drift` to the query for a variant,
and `--size 1180x820` for iPad size). The pilot,
`dev/look/evals/soapbox-pilot.ts`, drives through the real input.

## Not built

The muddy shortcut, the plank tally, The Boogler's Puff Boost, pushing a cart with friends, carrying
the ball, races, rewards and the era hat (proposals: [vertical-slice.md](../proposals/vertical-slice.md) S5 and S6,
[vehicles.md](../proposals/vehicles.md)).
