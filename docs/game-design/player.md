# 4. Player

Files: [src/entities/player/state.ts](../../src/entities/player/state.ts), [view.ts](../../src/entities/player/view.ts), [src/player/state.ts](../../src/player/state.ts), [src/physics/physics.ts](../../src/physics/physics.ts), [src/player/avatars.ts](../../src/player/avatars.ts),
[src/player/hud.ts](../../src/player/hud.ts), [src/features/feel.ts](../../src/features/feel.ts),
[src/physics/platforms.ts](../../src/physics/platforms.ts).

## Movement and jump

The physics facade uses current-pose contacts, with the previous 0.002 m prediction distance. Grounding still requires
a walkable normal; stale contacts cannot renew jump eligibility after takeoff. After airborne grace expires, a new
landing needs current geometric support at both the start and end of the fixed step. Player support admits only the
solver's 2 mm prediction envelope: Rapier can rest beside Q6 with a positive separation, so exact-overlap queries
otherwise disable standing jumps. Other contact consumers retain strict overlap; stale manifolds and distant or
wall-only contacts cannot grant support. `npm run sim -- player-support` covers the resting gap, takeoff and rejection
boundaries. An eligible stationary launch uses falling gravity on its first step: held jump 1.552 m, hop 0.664 m. That holds on all ground: the 1.70 m flat-ground jump before Rapier 0.21 came from exact-zero resting speed, and the owner chose one height (4 November).
Carried-deck launches keep their existing first-step shaping and upward deck motion.
Version comparisons and verification limits live in the [upgrade assessment](../research/rapier-021-upgrade.md).

- Body: two spheres of radius 0.45 m stacked 0.8 m apart, 70 kg, fixed rotation, zero friction (velocity is steered,
  not pushed).
- Gravity 18 m/s². Walk 5.6 m/s, sprint 9.5 m/s, both × 0.55 in water. Acceleration 70 m/s² on the ground, 14 in the
  air, 18 swimming. Braking against your velocity uses 115 m/s². Ground steering lasts 0.1 s plus one fixed step
  after support, independently of jump eligibility. A supported jump, or one within the existing 6 cm floor-snap
  deadband, retains ground steering for its first 0.1 s. A coyote jump over empty air gets no new steering grace.
  These separate clocks preserve takeoff and run-off inertia without granting another jump.
- Falls top out at 20 m/s (about an 11 m drop), so a step never moves the body further than its radius and long falls
  can't tunnel through the ground. A player or ball whose centre still ends up under the terrain is put back on top
  (`catchFallThrough`, [src/physics/physics.ts](../../src/physics/physics.ts); `npm run scenario -- falls`).
- Jump: 7.6 m/s up, with 0.1 s of ledge grace (coyote) and a 0.15 s jump buffer. Jumps add to an upward
  bounce (capped at 6 m/s before adding), so mushroom bounces chain.
- Jump shape: 1.7× gravity falling, 2.5× rising after letting go (short hop), 0.5× near the apex (under
  1.6 m/s) while held. Ground snap pulls you back onto a crest within 0.45 m,
  measured to the floor under you (terrain, stair, deck or cave floor), so ramps and stairs don't trigger it; rising
  faster than 6 m/s is a launch (a mushroom bounce), which it leaves alone.
- Pad sprint is a latch: click L3 once and it stays on until the stick rests. Touch sprint is automatic: pushing the
  stick to the edge of its travel sprints ([controls.md](controls.md)).
- A soft wall 18 m inside the map edge turns you back from the open sea.

## Swim

- You swim when the water surface (the sea or the cave pond) is above your body point + 0.35 m. Buoyancy pushes up to 2.4× your weight with
  damping. Jump swims up at 4.5 m/s.
- On Place and crossing, that surface is a bounded asynchronous sample of the visible waves, and damping
  is relative to bounded surface velocity. The threshold and Jump swim-up stay the same; stale samples ease to mean
  water. Classic home keeps its original sea forces. Query limits and cave composition: [island water](island.md).
- On Place and crossing, swimming stays at the surface unless you enter falling at least **14 m/s**. Slower entries shed
  downward momentum to **1 m/s relative to the surface**, so walking in and ordinary low-bank jumps stay afloat.
  Fast entries retain momentum (the existing fall cap is **20 m/s**); downward water drag is **1.2/s**, versus **3/s**
  upward. Existing depth buoyancy (up to **2.4× weight**) arrests the fall: faster hits go deeper, bounded by the bed.
  Passive ascent targets at most **2.5 m/s**, gain **8/s**, then settles back to wave-following surface swimming.
  Space/A/Jump retains its existing swim-up impulse and bypasses that passive cap. No input is needed to resurface;
  no breath mechanic. This is the existing Owner body, with no new presence field or lockstep state.
  Manual Dive, C, D-pad Right and its touch/guide entry are removed, and the demo is archived.
  Classic home retains its old sea forces; water URL selectors are ignored.

## Flops (cosmetic)

Every avatar gets a render-only spring: landing squash (about 15 % on a normal landing, max 45 %), take-off stretch,
lean toward acceleration (max 0.35 rad). Your own client starts flops and publishes them as presence `fl`:

The owner-written `feel.spring.stiffness` tunable captures a new profile at the next landing, takeoff or Place chop.
Its default remains 298 /s² (allowed 50–600). A chop already underway keeps its captured profile until the existing
chop presentation ends or the next swing begins; changing this cosmetic setting never changes contact, rewards,
physics or railway timings. Presence `feelSpring` carries the active profile so peers and late joiners render that
player with the same stiffness. The configured and active revisions are separately inspectable in the tuning API.

| Flop   | Trigger                                                                   | Length |
| ------ | ------------------------------------------------------------------------- | ------ |
| splat  | Landing faster than 13.5 m/s                                              | 700 ms |
| stomp  | A friend landing on your head                                             | 550 ms |
| bonk   | Losing 6.5 m/s in one frame while sprinting over 7 m/s                    | 650 ms |
| tumble | Landing above 3 m/s after jumping off a moving deck (the wagon, the ride) | 700 ms |

Bonk recoil ends when you jump or leave the ground, so its left/right roll does not continue through a wall jump. Player physics and jump height are unchanged.

The tumble opens on a held beat (docs/research/comedy-in-games.md, rec 4): 70 ms frozen squashed flat where you landed
(capped at 120 ms), shivering sideways, while your body slides on underneath; then a few frames' blend into a
face-plant tipped forward on your nose while the skid carries you, and a pop back up as it ends. With reduced motion
there is no shiver and no freeze in place (the pose still holds).

Knocked flat (the first visit's landing, [src/fall/](../../src/fall/index.ts)), you lie on your back with stars until you get up
([src/features/knockdown.ts](../../src/features/knockdown.ts), presence `kd`). While down you cannot move or jump. A ball
to the head no longer knocks you down (cut 2026-11-06).
The four gold head stars use an sRGB canvas and explicit linear HDR brightness: 6 with new water's metered Neutral,
1.5 with the default sea's Neutral output. One shared material gives your own and other players' stars the same
Local appearance; the lower default-sea value keeps the gold from washing out.

## Riding a moving deck

Standing on a moving deck, like the wagon's cars, carries you
([src/physics/platforms.ts](../../src/physics/platforms.ts)): your steering is relative to the deck point under you,
the deck's turn turns you and the camera, and you stay snapped to its floor. Landing on a
moving deck blends you to its speed over 0.12 s. Jump or walk off and the kept horizontal speed bleeds away at
9 m/s² for the first six fixed steps (3 becomes 2.1 m/s), then stays through the rest of the flight. This explicit
departure skid preserves the old carry loss without false ground contacts. On plain ground it bleeds away at the
same rate; landing above 3 m/s tumbles you (the tumble flop).

Deck acceleration and turns transport an attached rider before their own steering; a descending deck is not a jump.
Boarding can close a small air gap, but only actual walkable contact refreshes jump eligibility.
On a shared deck, a partner's interpolated collision proxy cannot push its co-rider off. Ordinary player collisions
return when they stop sharing that deck.

## Camera

Third-person orbit, looking past your right shoulder. One distance, 5.2 m, with no control to change it: the
wheel, trackpad and pinch don't zoom either. Pitch −1.25 to 0.9 rad. Mouse 0.0024 rad/px when locked, 0.005 when dragging unlocked; touch
0.006; pad right stick 2.8 rad/s yaw, 1.8 rad/s pitch, 0.15 deadzone. While the mouse is not locked (always on iPad,
which has no Pointer Lock) a two-finger trackpad scroll turns the camera (0.0035 rad/px yaw, 0.0028 pitch; fingers
right look right with natural scrolling), and ← → turn it at 2 rad/s instead of stepping sideways. The touch stick
has a scaled radial dead zone of 12% of its travel (50 px on phones, 60 px on tablets). It stays above the ground (and above the sea
unless you swim). Features can take it over through `camConstraints` (the caves keep it inside the tunnels). Before
you enter, it slowly circles the island.

## Avatar, colours and names

- Avatar: the Buddy (below). Its model and clips preload from the HTML, alongside the game modules. Local players,
  partners, late arrivals and the sky-card preview stay hidden until Buddy is ready. The loading screen waits for its
  preparation, including on saved-name returns, for up to 45 seconds. That long escape marks the capsule `load-deadline`
  without cancelling or retrying the pending preparation; its eventual success dresses the same avatar once. A genuine load failure
  permits entry with the older coloured capsule; automatic retries after 1.5 s and 5 s replace it with Buddy if loading
  recovers. Session telemetry marks the local player and arrival preview's body and reason whenever they change.
  `?body=capsule` explicitly selects that capsule with two eyes, bobbing and squashing with speed
  ([avatars.ts](../../src/player/avatars.ts)). This loading visibility is Local, with no presence or physics changes.
- Eight colours ([constants.ts](../../src/constants.ts) `COLORS`): `#ff6b5a`, `#ffc23d`, `#7fd14a`, `#19c3b3`,
  `#3d9bff`, `#9b6bff`, `#ff6fb5`, `#ff9a3d`. The colour also sets your home voice in the honk chord. Every avatar also
  gives off a little of its own colour (emissive 0.15, day and night), so its shaded side and a player at night still read.
- Name: up to 16 characters, control and format characters stripped. Name and colour are kept in localStorage
  (`boogle.name`, `boogle.color`); a first visit's card offers a friendly random name and a random colour, later
  visits go straight in with them, and the pause view's Room page changes them ([identity.md](identity.md)).
- Remote players show a floating name label; the HUD roster lists everyone, and the net chip says "Live · N on the
  island", "Connecting" or "Solo".

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.

## The Buddy and the follow camera

Every avatar plays hand-made animation ([src/player/buddy/body.ts](../../src/player/buddy/body.ts)): Quaternius's Universal
Animation Library (CC0). Idle, walk (to 2 m/s), jog (from 3.2) and sprint (from 8.5) blend by speed and play by distance at each clip's
stride (1.3, 5 and 5.5 m per cycle), so feet keep to the ground; it needs no new presence. The controller is today's, and
the camera ([src/player/buddy/camera.ts](../../src/player/buddy/camera.ts), `&cam=old` for the older one) sits at the same 5.2 m, stays locked across the ground, follows height softly in the air (0.2 s) and widens up to 5° at a sprint. Solid things can't come between it and you ([src/player/camera-arm.ts](../../src/player/camera-arm.ts)): anything static that you collide with pulls it in at once, then it eases back out (0.12 s, then a 0.3 s time constant), and a slope lifts it first. Things under 1.6 m across, like trunks, only move it when they're right at the lens. What moves doesn't block it. Widening goes by your speed over what you stand on, so a train doesn't trigger it.

The Buddy is a simple, slightly plump figure in the player's colour ([assets/src/buddy.py](../../assets/src/buddy.py)): one
smooth skin blended by a voxel remesh, with softened weights, soft shading (the normals of a smoother copy) and a head and mitts that hold their shape, plus a face moulded to
the head, two eyes and nothing else (no ears, no cheeks); two draw calls, no textures, on the same clips. It has no rim light. Its head looks straight ahead: each clip's average
pitch comes off the head (the library's idle looks down about 13°) and its bob stays. Most of the butt's weight rides on the
pelvis, and half the clips' hip roll, twist and sway comes off, so its mass stays put at a walk. It blinks, and in the air
([src/player/buddy/life.ts](../../src/player/buddy/life.ts)) it tucks a knee and reaches up while rising (the other knee on the next
jump) and spreads its arms while falling, blended from its vertical speed. `&hat=cap` wears a conductor's cap and `&hat=beanie` a
beanie, parts on the head bone hidden until worn, each one more draw call or two.

The earned railway conductor hat retains its blue-and-gold outer shape at 0.86 scale, with a hollow brim and
crown so it fits around the head instead of cutting through it or floating above it. Its brim origin sits at
Head-local y=0.43 m and follows that bone rigidly, so idle, walk, run, jump and chop cannot slide the head through
it. All eight player colours share this geometry and fit. The capsule fallback seats the same hollow hat at
y=1.20 m on its animated inner group, preserving clearance during bob, lean and squash. Local players,
partners and legacy Place use the same fitting function; the character stage's **Earned conductor hat** option
inspects that production geometry and fit, distinct from the separate cap trial.

The rest of the game fits this body. A haul bundle rides its spine,
lower, deeper and a little shorter than on the capsule, so its head shows over the top from the follow camera. It leans
forward under a load (5° to 11° by 16 logs, head level) with both hands gripping at its chest. A held item hangs from its right
mitt: a bag of seeds carried down at the hip by the handle, anything else with that arm out in front; holding the beach ball, both arms reach for it. It swims on the library's swim clips with its
eyes clear of the water. The Buddy holds the swim pose through up to 0.3 s of wave-induced airborne input; landing/wading or an upward exit faster than 3 m/s clears that presentation grace immediately. Both the clips and the procedural airborne pose use this filtered input; physics and presence still use the original swimming state. It wades where it can stand, and sits in the soapbox on the library's driving clip with its hands down at its sides, instead of
being squashed into the tub. Throwing, its arm winds up behind its shoulder and flings forward. The beach ball rides lower on its back. Knocked down, it lies flat, sprawled, with the stars over its head.

Foot contacts use quiet synthesized low-mid thumps with brief surface texture. Local
`character.footstepStyle` selects A soft (0), B textured (1), or C toy tick (2); walk/run trims are
11 dB below the first shipped footsteps. Jumps and landings stay slightly more present.
The [contact and mix recipe](place.md#local-mix-and-buddy-contacts-5-november-2026) owns the levels and listening command.

Dry landings also emit a soft dust billow using that same apex-to-contact height and minimum landing
threshold. The 4–12 particles grow with fall height up to 4 m and fade within 0.9 s, without covering Buddy.
Water contacts do not emit dust; distant avatars are culled at the landing-sound distance. The Local
contact clock runs even before audio unlock, so muting sound does not disable dust. Teleports, swimming,
seating and preview avatars retain the locomotion reset guards. Reduced motion suppresses the effect.

`/character/` is the isolated [asset and animation stage](asset-stage.md), with every Buddy clip, Raw/As played playback through the real body functions, exact seek/frame stepping, hats, views, a crowd of 8 and inspection overlays. Existing clip/time/view/pose/hat links remain supported; `/assets/` redirects to it.
