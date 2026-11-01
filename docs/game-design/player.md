# 4. Player

Files: [src/player/player.ts](../../src/player/player.ts), [src/physics/physics.ts](../../src/physics/physics.ts), [src/player/avatars.ts](../../src/player/avatars.ts),
[src/player/hud.ts](../../src/player/hud.ts), [src/features/feel.ts](../../src/features/feel.ts),
[src/physics/platforms.ts](../../src/physics/platforms.ts), [src/features/proto-ride.ts](../../src/features/proto-ride.ts).

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
  measured to the floor under you (terrain, stair, deck or cave floor), so ramps and stairs don't trigger it.
- Pad sprint is a latch: click L3 once and it stays on until the stick rests.
- A soft wall 18 m inside the map edge turns you back from the open sea.

## Swim

- You swim when the water surface (the sea or the cave pond) is above your body point + 0.35 m. Buoyancy pushes up to 2.4× your weight with
  damping. Jump swims up at 4.5 m/s.
- There is no dive (removed 2026-10-30, [plans/cleanup-dig-water-junk.md](../plans/cleanup-dig-water-junk.md)).

## Flops (cosmetic)

Every avatar gets a render-only spring: landing squash (about 15 % on a normal landing, max 45 %), take-off stretch,
lean toward acceleration (max 0.35 rad). Your own client starts flops and publishes them as presence `fl`:

| Flop | Trigger | Length |
|---|---|---|
| splat | Landing faster than 13.5 m/s | 700 ms |
| stomp | A friend landing on your head | 550 ms |
| bonk | Losing 6.5 m/s in one frame while sprinting over 7 m/s | 650 ms |

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
ground it bleeds away at 9 m/s² (a short skid), and landing above 3 m/s wobbles you (the bonk flop).

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

- Avatar: a coloured capsule with two eyes, bobbing and squashing with speed ([avatars.js](../../src/player/avatars.ts)).
- Eight colours ([constants.js](../../src/constants.ts) `COLORS`): `#ff6b5a`, `#ffc23d`, `#7fd14a`, `#19c3b3`,
  `#3d9bff`, `#9b6bff`, `#ff6fb5`, `#ff9a3d`. The colour also sets your honk note.
- Name: up to 16 characters, control and format characters stripped, default "Dat Frinco". Name and colour are kept
  in localStorage (`boogle.name`, `boogle.color`); a first visit gets a random colour.
- Remote players show a floating name label; the HUD roster lists everyone, and the net chip says "Live · N on the
  island", "Connecting" or "Solo".

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
