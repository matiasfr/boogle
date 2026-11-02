# 4. Player

Files: [src/player/player.ts](../../src/player/player.ts), [src/physics/physics.ts](../../src/physics/physics.ts), [src/player/avatars.ts](../../src/player/avatars.ts),
[src/player/hud.ts](../../src/player/hud.ts), [src/features/feel.ts](../../src/features/feel.ts),
[src/physics/platforms.ts](../../src/physics/platforms.ts), [src/proto/ride/index.ts](../../src/proto/ride/index.ts).

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

## Prototype: riding (?proto=ride)

Behind the flag only ([docs/plans/find-the-fun.md](../plans/find-the-fun.md), step 2). A greybox flatbed (2.5 × 4 m,
deck about 0.6 m up) shuttles along a 33 m route past the court's west side and along its north edge: two gentle
right-hand corners, a grade that follows the ground, 3 m/s cruise (`?ridespeed=6` or `__ride.RIDE.cruise`), 1 m/s²
starts and stops, 5 s stopped at each end to hop on. Each tab runs its own flatbed (Local).

Standing on it carries you ([src/physics/platforms.ts](../../src/physics/platforms.ts)): your steering is relative to
the deck point under you, the deck's turn turns you and the camera, and you stay snapped to its floor. Landing on a
moving deck blends you to its speed over 0.12 s. Jump or walk off and you keep its speed through the air; on plain
ground it bleeds away at 9 m/s² (a short skid), and landing above 3 m/s tumbles you (the tumble flop).

## Prototype: grinding the laid rails (?proto=wagon&grind=1)

Behind the flag only ([src/proto/grind/](../../src/proto/grind/index.ts); docs/research/ratchet-and-clank-feel.md, rec
5). Land on a laid section while falling, within 0.7 m of its centreline and heading within 50° of it (either way),
and you lock onto the track, sliding onto it over 0.08 s. You keep your speed along it, at least 6 m/s; it eases
toward 9 m/s (at 4 m/s² from below, 1 on a climb, 1.5 from above) plus part of gravity along the grade (30% uphill,
80% downhill), never under 4 m/s and capped at 13: the climb to the lighthouse slows you to about 5 m/s but carries
you over the top. Pulling the stick back reverses at once (again only after letting go). Jump leaves at any time with
the rail's speed plus the normal jump; running off the railhead flings you off with 3 m/s of lift; either way, landing
on the ground above 3 m/s is the tumble flop. Running into the wagon, the track machine while it's laying or another
player on the line is a bonk: knocked back 4 m/s and up 4.5 m/s, with the bonk flop. The track machine standing on the
line is hopped instead: you're lifted over it (clearing its boiler by 0.2 m, rising and falling over 1.8 m either
side) with a puff of sparks. While grinding you stand sideways to the rail, 20 to 40 orange sparks a second fly from your feet
(more with speed), and the camera drops 0.5 m, swings behind your travel and looks 3 m ahead along the rail. Grinding
is silent for now: the hiss, joint clacks, screech and bonk were cut in the sound audit (2026-11-02). The rail counts as ground (jump works, a double jump
comes back). Others see you through your normal presence.

## Prototype: double jump and glide (&jump2=1, &glide=1)

On any `?proto=` page ([src/proto/moves/](../../src/proto/moves/index.ts); rec 6 of the same research). With
`&jump2=1` a jump press in the air sets your upward speed to max(current, 0) + 6.0 m/s, once per airtime (landing, or
a grind rail, gives it back), with a puff ring and a quiet puff of air (band-passed noise, no pitch). With `&glide=1`, holding jump after an air press
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

Behind the flag, every avatar is the jointed hero ([assets/src/hero2-rig.py](../../assets/src/hero2-rig.py),
[src/proto/hero/platformer.ts](../../src/proto/hero/platformer.ts)): a big separate head, a stout body, long arms, legs
with knees, no mouth. It's posed from motion alone, so remote players need no new presence. Planted feet stay where they
land (a stride of `0.74 · v^0.6` m per cycle, at most 0.62 m of it on one foot), the swing is hand-keyed, and the hips
drop into each stance. The body leans at most 10° and banks at most 9°, and the head stays level and looks into turns.

The page also uses a modern-Mario controller ([src/physics/physics.ts](../../src/physics/physics.ts), `&ctl=old` for
today's; `?ctl=odyssey` tries it on any page): you run where you face (turning at most 390°/s, 510°/s at sprint), speed
builds at 30 m/s² to 7.5 m/s (10.5 sprinting), pulling back past 95° above 4 m/s skids and then pivots, air control is
35 m/s², and jumps start at 8.6 m/s plus 0.08 × speed. The camera ([src/proto/hero/camera.ts](../../src/proto/hero/camera.ts),
`&cam=old` for today's) sits at 5.2 m, trails the body by 0.07 s (0.3 s in height while airborne) and widens up to 7° at
a sprint. `&steps=1` adds quiet footsteps; `&body=standin` and `&body=pill` swap the figure.
