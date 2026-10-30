# Vehicles: feel sheet and starting numbers

*Proposal, 29 October 2026. Starting values and feel rules for the vehicles in [boogler-tech-tree.md](boogler-tech-tree.md), chapter 4. The cannon-es behaviour and example values were read from source (see [progression-feel-exploration.md](../research/progression-feel-exploration.md), §3.6). The Boogle numbers below are derived from those and from `src/constants.js`. They are first guesses to tune in play, not tested values. Updated 30 October 2026 for `main` at `8b3517c`: one-button interactions, pad layers, the Owner/Host APIs and the storm tide.*

## Five rules

1. **Fake the stability, keep the physics** (Lonely Mountains: Downhill). Megagon's fully simulated bike was "solid and stable, however, not really believable". They "faked the lateral balancing ... and the suspension". For Boogle that means:
   - a self-righting torque;
   - a clamped roll rate;
   - an automatic flip-back after about 1.5 s upside down.
   Crashes stay funny but never stall the fun (principle 10).
2. **Simple input, no new buttons** ("good controls are key"). Pad slots are close to full on `main`; check `freeSlots()` in `src/controls.js`.
   - **Board and leave** with the existing interact button and its glyph prompt. Every interaction already goes through that one button.
   - **While seated,** a context layer re-points existing actions: the left stick steers, the jump button brakes or drifts, and throw does a hop or the Puff Boost. Use `wrapAction`, the way `src/features/feel.js` turns pile into a dive while swimming.
   - Describe the seated rows with `describeControl(..., { context: 'driving' })` so the pause view's controls page shows them.
3. **Readability beats truth** (TotK enlarged a board so players could see it, even though it became too heavy). Make the wheels big, the suspension visible and the sparks loud.
4. **Telegraph the boost** (MKWii sparks at fixed charge values). Show the charge and the "ready" state with sparks and a sound, not a HUD bar.
5. **Vehicles give the ball more to do** (principle 2). Every vehicle carries the ball, bumps it or races it.

## How cannon-es numbers behave (from `RaycastVehicle.ts`)

- **Suspension is scaled by chassis mass.** `suspensionForce = (stiffness × compression − damping × velocity) × chassisMass`. Stiffness and damping are therefore accelerations, so the same wheel settings feel the same on a light cart and a heavy boat.
- **Static sag with 4 wheels** = g / (4k). Boogle's `GRAVITY` is 18, nearly twice real gravity, so springs need to be stiffer than the cannon example's. The example's k = 30 sags 0.15 m here.
- **Heave frequency** ω ≈ √(4k) rad/s. **Damping ratio** ζ ≈ 2d / ω. Use the compression damping d for bumps and the relaxation damping for rebound.
- **Grip** per wheel = `suspensionForce × dt × frictionSlip`, so `frictionSlip` acts like μ. A wheel that is unloaded or airborne has no grip, so landing on two wheels does the slapstick for you.
- `rollInfluence` near 0 resists rolling. Keep it low, and do the rest with the faked self-righting torque.
- `maxSuspensionForce` clamps landing spikes. Leave it unbounded (the default is `Number.MAX_VALUE`) and a hard landing can launch the car.
- Boogle pins **cannon-es 0.20.0**. Everything here was read from `master`, so check the 0.20.0 source before relying on details.

## The soapbox buggy (pages 4.3 and 4.4)

Gravity-powered, raced downhill from the lighthouse. With a rider aboard the chassis mass doesn't change the suspension (see above), but it does change momentum.

| Setting | Start at | Why |
| --- | --- | --- |
| Chassis mass | 120 (plus 70 per rider) | Heavier than the ball (0.6) and the player (70), so it bulldozes the ball |
| Wheel radius | 0.35 | Coconut-sized; reads clearly |
| `suspensionRestLength` | 0.35 | |
| `suspensionStiffness` | 45 | Sag = 18 / 180 = 0.10 m, and ω ≈ 13.4 rad/s (about 2.1 Hz) |
| `dampingCompression` | 3.4 | ζ ≈ 0.5: absorbs bumps |
| `dampingRelaxation` | 1.7 | ζ ≈ 0.25: a bouncy rebound, on purpose |
| `maxSuspensionTravel` | 0.25 | |
| `maxSuspensionForce` | 6000 | About 5× the static load per wheel with a rider (190 × 18 / 4 ≈ 855 N); stops landing launches |
| `frictionSlip` | 1.2 (sand), 1.6 (grass and rock paths) | Sand slides more; paths become the "fast line" |
| `rollInfluence` | 0.05 | Plus the faked righting torque |
| Centre of mass | about wheel-axle height | Offset the chassis shape upward. A COM "just slightly above wheel height provides a stable but responsive feel" (Vehicle System docs) |
| Steering | 0.5 rad below 4 m/s, easing to 0.15 rad at 15 m/s | A speed curve, as in the Vehicle System docs |
| Engine | none; push-start impulse 400 N·s per pushing player | More pushers, faster start: cooperation without asking |
| Brake | 40 per wheel | |

**Drift and Puff Boost** (MKWii's miniturbo as an integer, counted in fixed physics steps; Boogle's `FIXED` is 1/60, the same rate as MKWii's frames):

```js
// per physics step while drifting (rear wheels drop to frictionSlip 0.6)
charge += Math.abs(steer) >= 0.7 ? 5 : 2;
if (charge >= 150) sparks('small'); // cosmetic, like MKWii's early sparks
if (charge > 270) sparks('ready'); // release now: The Boogler is fully puffed
// on release, if charge > 270: max speed × 1.2 for 30 steps (0.5 s), plus his launch orb and a line
```

The charge is Owner-local state, so it needs no determinism. Only the driver's pose is broadcast.

**Juice list** (Juice It or Lose It and The Art of Screenshake both stack many small tweaks):

- sand spray from each wheel, reusing `sand-fx`;
- squash on landing;
- a field-of-view kick on boost;
- the honk (`honk.js`) works from the driver's seat;
- coconut wheels wobble;
- a predictive camera that aims ahead of the buggy (Lonely Mountains: "an imaginary future position of the rider"; see the `camera-systems` skill).

**Route** (Lonely Mountains' tiers):

- **scenic route:** lighthouse hill → path → beach;
- **official shortcut:** a visible muddy cut;
- **semi-official:** through a cave mouth;
- **unofficial:** whatever the sand walls players build make possible.

## The land yacht (page 4.5)

Three wheels, with one front steerer. Drive comes from the wind: `force = sailArea × max(0, windDir · sailNormal) × windSpeed`, capped at 18 m/s.

- The wind is a pure function of tick + seed (Lockstep without state, like the planned weather). The driver reads it as Owner, and every tab can draw the windmills from the same function, so they always agree with what the yacht feels.
- Start with mass 90, `suspensionStiffness` 40, `frictionSlip` 1.0, and a tall mast so tipping in gusts looks dramatic. Auto-right it after 1.5 s.
- Tacking against the wind is a skill toy. Running before the wind is the slapstick.

## The melon raft (page 4.6)

The ambitious-mechanics report calls rafts "the best next bundle", because they ride the storm tide's rising water. No RaycastVehicle. It's a box body that uses the sea buoyancy the ball and players already use.

- Mass 80. In water: linear damping 0.4, angular damping 0.6.
- Each paddle stroke is a 60 N·s impulse at the paddler's side, so two paddlers on one side spin it (slapstick), and two on opposite sides go straight.
- Clamp roll to about 25° unless a wave or the ball hits it.
- The ball sits on the deck under ordinary contact physics. Water polo from a moving raft is the toy.

## The melon cart (page 4.2)

A box with two wheels (cylinders on hinge constraints are fine; there is no suspension to tune). Mass 30. Pushing applies force at the handle in the pusher's facing direction. Items in the basket are kinematic children until a bump over a 3 m/s vertical change tips them out.

## Sync for every vehicle

- **Owner kind**, with the same epoch rule as the ball (`src/ball.js`). The driver or main pusher owns it and publishes its pose with `addPresenceField`; everyone else smooths it with `createSnaps` (`src/snaps.js`). Physics is never Lockstep.
- **Host kind, for seated multi-rider rafts.** The ambitious-mechanics report suggests a host-owned raft with paddle inputs, published with `addHostField`, like its king-tide crate. That avoids ownership hand-offs while three friends paddle. It costs a little input latency for non-host paddlers; slapstick hides that.
- **Riders** are attached to the vehicle in their own pose stream, so remote players see them seated, not falling.
- **The ball touching a vehicle** is the hard case, and it is Rocket League's whole problem. The simplest rule: the vehicle's owner takes ownership of the ball on contact. The epoch rule already handles a touch by a player. If it feels bad for the non-owner, look at Rocket League's GDC talk first.
- **Ruts and sand displacement** are rate-limited dig edits from the owner, a few per second at most.
- **Where it rests** when abandoned: the owner submits the final pose once as an edit, so it persists in the snapshot, the way a thrown thing's landing does today.

## Check it in the game

- Write a `dev/scenarios/` scenario: buggy down the lighthouse path, a hard landing, a flip and recover, and the ball hit at speed. Read the motion sheets with `npm run look`.
- Run `npm run perf` before and after adding vehicle meshes.
- **Playtest question:** do people race down the hill again without being asked, and does anyone try to bring the ball along?
