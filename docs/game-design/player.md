# 4. Player

Files: [src/player/player.ts](../../src/player/player.ts), [src/physics/physics.ts](../../src/physics/physics.ts), [src/player/avatars.ts](../../src/player/avatars.ts),
[src/player/hud.ts](../../src/player/hud.ts), [src/features/feel.ts](../../src/features/feel.ts),
[src/physics/platforms.ts](../../src/physics/platforms.ts).

## Movement and jump

- Body: two spheres of radius 0.45 m stacked 0.8 m apart, 70 kg, fixed rotation, zero friction (velocity is steered,
  not pushed).
- Gravity 18 m/s². Walk 5.6 m/s, sprint 9.5 m/s, both × 0.55 in water. Acceleration 70 m/s² on the ground, 14 in the
  air, 18 swimming. Braking against your velocity uses 115 m/s².
- Falls top out at 20 m/s (about an 11 m drop), so a step never moves the body further than its radius and long falls
  can't tunnel through the ground. A player or ball whose centre still ends up under the terrain is put back on top
  (`catchFallThrough`, [src/physics/physics.ts](../../src/physics/physics.ts); `npm run scenario -- falls`).
- Jump: 7.6 m/s up, with 0.1 s of ledge grace (coyote) and a 0.15 s jump buffer. Jumps add to an upward
  bounce (capped at 6 m/s before adding), so mushroom bounces chain.
- Jump shape: 1.7× gravity falling, 2.5× rising after letting go (short hop), 0.5× near the apex (under
  1.6 m/s) while held. Ground snap pulls you back onto a crest within 0.45 m,
  measured to the floor under you (terrain, stair, deck or cave floor), so ramps and stairs don't trigger it; rising
  faster than 6 m/s is a launch (a mushroom bounce), which it leaves alone.
- Pad sprint is a latch: click L3 once and it stays on until the stick rests.
- A soft wall 18 m inside the map edge turns you back from the open sea.

## Swim

- You swim when the water surface (the sea or the cave pond) is above your body point + 0.35 m. Buoyancy pushes up to 2.4× your weight with
  damping. Jump swims up at 4.5 m/s.
- There is no dive (removed 2026-10-30, [plans/done/cleanup-dig-water-junk.md](../plans/done/cleanup-dig-water-junk.md)).

## Flops (cosmetic)

Every avatar gets a render-only spring: landing squash (about 15 % on a normal landing, max 45 %), take-off stretch,
lean toward acceleration (max 0.35 rad). Your own client starts flops and publishes them as presence `fl`:

| Flop | Trigger | Length |
|---|---|---|
| splat | Landing faster than 13.5 m/s | 700 ms |
| stomp | A friend landing on your head | 550 ms |
| bonk | Losing 6.5 m/s in one frame while sprinting over 7 m/s | 650 ms |
| tumble | Landing above 3 m/s after jumping off a moving deck (the wagon, the ride) | 700 ms |

The tumble opens on a held beat (docs/research/comedy-in-games.md, rec 4): 70 ms frozen squashed flat where you landed
(capped at 120 ms), shivering sideways, while your body slides on underneath; then a few frames' blend into a
face-plant tipped forward on your nose while the skid carries you, and a pop back up as it ends. With reduced motion
there is no shiver and no freeze in place (the pose still holds).

A ball to the head faster than 11 m/s knocks you flat for 800 ms with stars, then 1 s of immunity
([src/features/impact.ts](../../src/features/impact.ts), presence `kd`). While down you cannot move or jump.

## Riding a moving deck

Standing on a moving deck, like the wagon's cars, carries you
([src/physics/platforms.ts](../../src/physics/platforms.ts)): your steering is relative to the deck point under you,
the deck's turn turns you and the camera, and you stay snapped to its floor. Landing on a
moving deck blends you to its speed over 0.12 s. Jump or walk off and you keep its speed through the air; on plain
ground it bleeds away at 9 m/s² (a short skid), and landing above 3 m/s tumbles you (the tumble flop).

## Prototype: double jump and glide (&jump2=1, &glide=1)

On any `?proto=` page ([src/proto/moves/](../../src/proto/moves/index.ts); rec 6 of the same research). With
`&jump2=1` a jump press in the air sets your upward speed to max(current, 0) + 6.0 m/s, once per airtime (landing gives it back), with a puff ring and a quiet puff of air (band-passed noise, no pitch). With `&glide=1`, holding jump after an air press
(the double jump's, or a fresh one) caps your fall at 4 m/s, trailing two contrails. Same button; no new controls.

## Camera

Third-person orbit, looking past your right shoulder. Distance 6.5 m by default; pad R3 cycles 4, 6.5 and
10 m. The wheel, trackpad and pinch don't zoom. Pitch −1.25 to 0.9 rad. Mouse 0.0024 rad/px when locked, 0.005 when dragging unlocked; touch
0.006; pad right stick 2.8 rad/s yaw, 1.8 rad/s pitch, 0.15 deadzone. While the mouse is not locked (always on iPad,
which has no Pointer Lock) a two-finger trackpad scroll turns the camera (0.0035 rad/px yaw, 0.0028 pitch; fingers
right look right with natural scrolling), and ← → turn it at 2 rad/s instead of stepping sideways. The touch stick
has a scaled radial dead zone of 12% of its travel (50 px on phones, 60 px on tablets). It stays above the ground (and above the sea
unless you swim). Features can take it over through `camConstraints` (the caves keep it inside the tunnels). Before
you enter, it slowly circles the island.

## Avatar, colours and names

- Avatar: a coloured capsule with two eyes, bobbing and squashing with speed ([avatars.ts](../../src/player/avatars.ts)).
- Eight colours ([constants.ts](../../src/constants.ts) `COLORS`): `#ff6b5a`, `#ffc23d`, `#7fd14a`, `#19c3b3`,
  `#3d9bff`, `#9b6bff`, `#ff6fb5`, `#ff9a3d`. The colour also sets your home voice in the honk chord.
- Name: up to 16 characters, control and format characters stripped. Name and colour are kept in localStorage
  (`boogle.name`, `boogle.color`); a first visit's card offers a friendly random name and a random colour, later
  visits go straight in with them, and the pause view's Room page changes them ([identity.md](identity.md)).
- Remote players show a floating name label; the HUD roster lists everyone, and the net chip says "Live · N on the
  island", "Connecting" or "Solo".

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.

## Prototype: the hero (`?proto=hero`)

Behind the flag, every avatar plays hand-made animation ([src/proto/hero/clips.ts](../../src/proto/hero/clips.ts)):
Quaternius's Universal Animation Library (CC0), on the Buddy; `&body=mannequin` plays it on the library's own figure, to
compare motion apart from our model. Idle, walk (to 2 m/s), jog (from 3.2) and sprint (from 8.5) blend by speed and play by distance at each clip's
stride (1.3, 5 and 5.5 m per cycle), so feet keep to the ground; it needs no new presence. The controller is today's, and
the camera ([src/proto/hero/camera.ts](../../src/proto/hero/camera.ts), `&cam=old` for today's) sits at 5.2 m instead of
6.5, stays locked across the ground, follows height softly in the air (0.2 s) and widens up to 5° at a sprint.

The Buddy is a simple, slightly plump figure in the player's colour ([assets/src/buddy.py](../../assets/src/buddy.py)): one
smooth skin blended by a voxel remesh, with softened weights, soft shading (the normals of a smoother copy) and a head and mitts that hold their shape, plus a face moulded to
the head; two draw calls, no textures, on the same clips. It has no rim light. Its head looks straight ahead: each clip's average
pitch comes off the head (the library's idle looks down about 13°) and its bob stays. Most of the butt's weight rides on the
pelvis, and half the clips' hip roll, twist and sway comes off, so its mass stays put at a walk. It blinks, and in the air
([src/proto/hero/life.ts](../../src/proto/hero/life.ts)) it tucks a knee and reaches up while rising (the other knee on the next
jump) and spreads its arms while falling, blended from its vertical speed. `&hat=cap` wears a conductor's cap and `&hat=beanie` a
beanie, parts on the head bone hidden until worn, each one more draw call or two.

The rest of the game fits this body behind the flag (`&buddy` adds it to any other prototype). A haul bundle rides its spine,
lower, deeper and a little shorter than on the capsule, so its head shows over the top from the follow camera. It leans
forward under a load (5° to 11° by 16 logs, head level) with both hands gripping at its chest. A held item hangs from its right
mitt: the can and seeds carried down at the hip by the handle (the can lifts to pour), anything else with that arm out in front; holding the beach ball, both arms reach for it. It swims on the library's swim clips with its
eyes clear of the water, wades where it can stand, and sits in the soapbox on the library's driving clip with its hands down at its sides, instead of
being squashed into the tub. Throwing, its arm winds up behind its shoulder and flings forward; a bump is both forearms up, like a volleyball dig (seen on your own only, as no presence says so). The beach ball rides lower on its back. Knocked down, it lies flat, sprawled, with the stars over its head. The capsule is unchanged and still
the body in normal play.

boogle.club/character/ shows the Buddy alone, with every clip, a full jump (Hop), blink, hats and hat colours, views, a crowd of 8 and render switches.
