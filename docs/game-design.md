# Boogle: game design document (as built)

*It describes what exists on `main` today, not what is planned, and is kept current by the rule in
[AGENTS.md](../AGENTS.md) (player-facing changes update their section here in the same commit). Every number below is read from the code or the docs it links. Where the code does not say,
this file says "unclear from code". Plans live in [PLAN.md](../PLAN.md) and [tech-plan.md](tech-plan.md); undecided
ideas live in [proposals/](proposals/README.md) and are only linked here as "related ideas".*

## Contents

1. [Overview](#1-overview)
2. [Pillars](#2-pillars)
3. [The island](#3-the-island)
4. [Player](#4-player)
5. [Controls](#5-controls)
6. [Systems](#6-systems)
7. [Content inventory](#7-content-inventory)
8. [Multiplayer and persistence](#8-multiplayer-and-persistence)
9. [Tech and tooling](#9-tech-and-tooling)
10. [Status](#10-status)
11. [Glossary](#11-glossary)
12. [Doc and code mismatches found while writing this](#12-doc-and-code-mismatches-found-while-writing-this)

---

## 1. Overview

Boogle is a drop-in browser island for 1 to 6 friends. You pick a name and a colour, press "Jump in", and land next to a
sand volleyball court with one shared beach ball. Today the loop as actually played is: throw, bump and chase the ball;
pick up fruit and throw it at each other; plant mushroom seeds from the stall and bounce on what grows; befriend The Boogler, a purple
blob NPC from Samarqand who wanders the island, talks in chapters, takes presents and launches you if you ride him;
honk and ping to friends; climb the lighthouse for the frisbee; walk through the caves. There are no scores, timers or
goals. The tide, weather and crops from the plan are not built.

It runs on desktop (keyboard and mouse, pointer lock), touch screens (virtual stick and buttons) and a Backbone-style
gamepad (W3C standard mapping, aimed at iPhone and iPad). One player's browser hosts the room over PeerJS. Live at
**https://matiasfr.github.io/boogle/** (`?room=<name>` picks an island, default `beach`).

## 2. Pillars

The principles are in [DESIGN.md](../DESIGN.md); read it there. In one line each:

| # | Principle | What it means in practice today |
|---|---|---|
| 1 | Toys before chores | Ball, throwing and the Boogler have no score. |
| 2 | The ball stays the star | Ball floats, knocks fruit off palms, bounces on mushrooms. |
| 3 | Farming is never required | Mushrooms are optional; nothing is gated on them. |
| 4 | Cooperation is automatic | Shared mushrooms and items; the honk chord needs 3 people but no coordination. |
| 5 | Only the world is the antagonist | No PvP state damage. |
| 6 | Communal world, personal rewards | Hotbar and Boogler friendship are per player, in localStorage. |
| 7 | Telegraph everything | Interact prompt, ping markers. (No world events exist yet to telegraph.) |
| 8 | Drop-in, drop-out | No lobby; host migration; mixed-build reloads. |
| 9 | Leave something for the next visitor | Water, mushrooms and items persist in snapshots. |
| 10 | Slapstick over precision | Face-plants, flops, sail bonks, Boogler launches. |

Technical principles (sync kinds, determinism, sync edits not state, PeerJS only, small and readable) are in the same
file, and section 8 maps every feature to its kind.

## 3. The island

### Shape and size

- The world is a **510 m square** heightfield of **409 × 409 cells, 1.25 m each**, centred on the origin
  ([src/world/grid.js](../src/world/grid.js)). +x is east, **+z is south** (towards home), −z is north. Sea level is
  0 m, the seabed −7.5 m.
- The ground is a pure function in layers ([src/island/README.md](../src/island/README.md)): natural shape
  ([src/island/shape.js](../src/island/shape.js)), then each POI's stamps ([src/island/stamps.js](../src/island/stamps.js)),
  then the court levelled and everything quantised to whole centimetres once ([src/island/ground.js](../src/island/ground.js)).
  Every client builds identical integers.
- After the 2026-10-29 playtest the land was cut to about a third, roughly **23,300 m²**
  ([playtests.md](playtests.md)). Everything is meant to be a 10 to 15 s sprint from spawn (comment in `shape.js`).

### Regions

| Region | Where | Notes |
|---|---|---|
| **Home** | The original island around the origin, radius about 52 m (`HOME_R`). | Within 22 m of the origin (`HOME_KEEP`) the ground never changes. Spawn, court, stall and garden are here. |
| **HOME square** | x and z in −80..80 m (`HOME` in grid.js). | Used to be the only place with beach wash-ups (removed). |
| **Mainland** | Noisy ellipse centred (6, −66), radii 96 × 56 m, plus an east lobe at (86, −36) and a west point at (−78, −20). | Meadows, the eastern plain (windmill farm), the west cove. Only ever raises the ground (smooth max) outside `HOME_KEEP`. |
| **North-west massif** | Ellipse at (−54, −92), 42 × 30 m, up to 15 m high with ridges. | Rocky upland; the caves run under it. |

Scenery ([src/render/props.js](../src/render/props.js)): up to 36 fruit palms and 22 rocks on home (seed 20261028), plus up to 55
coastal palms, 70 round meadow trees and 55 boulders on the mainland (seed 20261029). Only the home palms bear fruit.
Trees, rocks and POI keep-out discs go into `obstacles`, which the Boogler walks around.

### Points of interest

Coordinates are world metres (x, z). POI folders are in [src/pois/](../src/pois/); the stall, court and garden are
built outside the POI system.

| POI | Where | What is there | What you can do |
|---|---|---|---|
| **Spawn** | (14, 26), random within 3 m | [src/constants.js](../src/constants.js) `SPAWN` | Land here; fall below −25 m and you are put back. |
| **Volleyball court** | Centre (12, 21), radius 8 m | Ground levelled to its centre height and painted sand ([ground.js](../src/island/ground.js), [terrain.js](../src/adapters/terrain.js)). No net or lines. | The ball spawns at (12, 20). |
| **Mushroom stall** | (15.2, 13.4), yaw 3.0 | Wooden counter, striped awning, "Mushroom seeds" sign, seed bags and a watering can ([src/adapters/mushroom-garden.js](../src/adapters/mushroom-garden.js)). | Take 5 seeds per press (stack up to 20) and the watering can. |
| **Garden patch** | Cells i 218..237, j 192..211: about x 17.5..42.5, z −9..15, centre (30, 2.5) | A dirt patch (`PATCH` in [src/sim/mushrooms.js](../src/sim/mushrooms.js)). Kept clear of trees. | Plant and water seeds (they also grow anywhere else dry). It is the Boogler's home. |
| **Lighthouse** | (6, −58), on a 7.4 m hill with a flat top at 11 m | Striped 18 m tower, spiral stair of 2.5 turns round the outside, gallery deck at about 29.3 m with railings, lamp and two sweeping beams at night ([src/pois/lighthouse/](../src/pois/lighthouse/)). Paths to home, the windmill farm and the upland. | Climb; the **frisbee** waits on the deck at (7.9, 29.3, −56) and refills 60 s after it is taken. |
| **Windmill farm** | Site centre (82, −46), facing west | Three wooden windmills (7.2 m towers, 7.2 m sails at 0.55 rad/s on the shared clock) on knolls, striped fields (wheat, greens, ploughed earth), cart tracks, hay bales, a fence ([src/pois/windmills/](../src/pois/windmills/)). | The sails are solid: they bonk players and bat the ball. Nothing else to do. |
| **Caves** | Under the massif; mouths below | Tunnels of radius 2.3 m joining a hub (−50, −88), an abandoned mine (−35, −93: rails, minecart of ore, glowing veins), an underground pond (−64, −90: water at 3.0 m, crystals, glowing mushrooms, stalactites, a rowboat) and a wine cellar (−49, −99: barrel racks, bottle shelves, a cask, a candlelit table). Lanterns, timber mouth frames with name boards, a signpost ([src/pois/caves/](../src/pois/caves/)). | Walk in and explore; throw and float the ball on the pond. Purely a place: no items or ops. |

Cave mouths ([network.js](../src/pois/caves/network.js)):

| Mouth | Position | Board |
|---|---|---|
| south | (−37, −80) | Caves |
| east | (−26, −95) | Old mine |
| west | (−71, −83) | Pond cave |
| north | (−44.5, −104.5) | Cellar |

## 4. Player

Files: [src/player/player.js](../src/player/player.js), [src/physics/physics.js](../src/physics/physics.js), [src/player/avatars.js](../src/player/avatars.js),
[src/player/hud.js](../src/player/hud.js), [src/features/feel.js](../src/features/feel.js).

### Movement and jump

- Body: two spheres of radius 0.45 m stacked 0.8 m apart, 70 kg, fixed rotation, zero friction (velocity is steered,
  not pushed).
- Gravity 18 m/s². Walk 5.6 m/s, sprint 9.5 m/s, both × 0.55 in water. Acceleration 70 m/s² on the ground, 14 in the
  air, 18 swimming. With the `feel` flag, braking against your velocity uses 115 m/s².
- Jump: 7.6 m/s up, with 0.1 s of ledge grace (coyote) and a 0.15 s jump buffer. With `feel`, jumps add to an upward
  bounce (capped at 6 m/s before adding), so mushroom bounces chain.
- `feel` jump shape: 1.7× gravity falling, 2.5× rising after letting go (short hop), 0.5× near the apex (under
  1.6 m/s) while held. Ground snap pulls you back onto a crest within 0.45 m,
  measured to the floor under you (terrain, stair, deck or cave floor), so ramps and stairs don't trigger it.
- Pad sprint is a latch: click L3 once and it stays on until the stick rests.
- A soft wall 18 m inside the map edge turns you back from the open sea.

### Swim

- You swim when the water surface (the sea or the cave pond) is above your body point + 0.35 m. Buoyancy pushes up to 2.4× your weight with
  damping. Jump swims up at 4.5 m/s.
- There is no dive (removed 2026-10-30, [plans/cleanup-dig-water-junk.md](plans/cleanup-dig-water-junk.md)).

### Flops (cosmetic, `feel`)

Every avatar gets a render-only spring: landing squash (about 15 % on a normal landing, max 45 %), take-off stretch,
lean toward acceleration (max 0.35 rad). Your own client starts flops and publishes them as presence `fl`:

| Flop | Trigger | Length |
|---|---|---|
| splat | Landing faster than 13.5 m/s | 700 ms |
| stomp | A friend landing on your head | 550 ms |
| bonk | Losing 6.5 m/s in one frame while sprinting over 7 m/s | 650 ms |

A ball to the head faster than 11 m/s knocks you flat for 800 ms with stars, then 1 s of immunity
([src/features/impact.js](../src/features/impact.js), presence `kd`). While down you cannot move or jump.

### Camera

Third-person orbit, looking past your right shoulder. Distance 6.5 m by default, 3 to 12 m with the wheel, or pad R3
cycling 4, 6.5 and 10 m. Pitch −1.25 to 0.9 rad. Mouse 0.0024 rad/px when locked, 0.005 when dragging unlocked; touch
0.006; pad right stick 2.8 rad/s yaw, 1.8 rad/s pitch, 0.15 deadzone. It stays above the ground (and above the sea
unless you swim). Features can take it over through `camConstraints` (the caves keep it inside the tunnels). Before
you enter, it slowly circles the island.

### Avatar, colours and names

- Avatar: a coloured capsule with two eyes, bobbing and squashing with speed ([avatars.js](../src/player/avatars.js)).
- Eight colours ([constants.js](../src/constants.js) `COLORS`): `#ff6b5a`, `#ffc23d`, `#7fd14a`, `#19c3b3`,
  `#3d9bff`, `#9b6bff`, `#ff6fb5`, `#ff9a3d`. The colour also sets your honk note.
- Name: up to 16 characters, control and format characters stripped, default "Dat Frinco". Name and colour are kept
  in localStorage (`boogle.name`, `boogle.color`); a first visit gets a random colour.
- Remote players show a floating name label; the HUD roster lists everyone, and the net chip says "Live · N on the
  island", "Connecting" or "Solo".

## 5. Controls

The registry in [src/player/controls.js](../src/player/controls.js) is the source of truth: `registerAction` binds a pad
slot, handlers, its keyboard codes (`key`, one shared listener that skips repeats, Ctrl/Cmd/Alt and text fields) and,
with `touch: { label, className }`, builds its own touch button; `describeControl` adds display-only rows; `onKey`
binds a key with no pad action of its own (hotbar digits). Held keys (move, sprint, Space) and E and R are still read by hand in [src/player/input.js](../src/player/input.js). The pause view's controls page and the first-run card are generated
from it ([src/player/guide.js](../src/player/guide.js)), and [src/features/controls-check.js](../src/features/controls-check.js) warns
in dev about gaps. Registrations live in [src/player/input.js](../src/player/input.js), [feel.js](../src/features/feel.js),
[hotbar.js](../src/features/hotbar.js), [bump.js](../src/features/bump.js), [honk.js](../src/features/honk.js),
[ping.js](../src/features/ping.js), [pause.js](../src/features/pause.js) and [updates.js](../src/features/updates.js).

| Control (id) | Kind | Keyboard / mouse | Pad | Touch | Group | Context |
|---|---|---|---|---|---|---|
| Move (`move`) | described | WASD, arrows | Left stick | Drag on the left | Getting around | |
| Jump, or swim up (`jump`) | action | Space | A | Jump | Getting around | |
| Sprint (`sprint`) | action | Left Shift | L3 (latches) | none | Getting around | |
| Look around (`look`) | described | Mouse | Right stick | Drag on the right | Camera | |
| Camera distance (`zoom`) | action | Wheel | R3 (4 / 6.5 / 10 m) | none | Camera | |
| Bring the ball back (`respawn`) | action | R | View | none | The ball | |
| Bump the ball up (`bump`) | action | V | RT | Bump | The ball | |
| Talk, pick up, take, shake a palm (`interact`) | action | E | B | Grab (the main button; its label follows the target) | Hands | |
| Use what you hold (`use`) | action | Left click | X | main button when it has no target | Hands | |
| Hold from your hotbar (`hotbar`) | described | 1-8 (same key again: empty hands) | LB / RB (`slot-prev`, `slot-next`, hidden actions) | Tap a slot | Hands | |
| Throw what you hold (`toss`) | described | (use) | X | Toss | Hands | holding |
| Answer The Boogler (`boogler-answer`) | described | 1-8 (E or Esc walks away) | D-pad ↑ ↓, A (B walks away) | Tap an answer | Friends | talking |
| Honk (`honk`) | action | T | Y | Honk | Friends | |
| Ping where you look (`ping`) | action | G, middle click | D-pad ← | Ping | Friends | |
| Menu and controls (`pause`) | action | Esc, H (opens on Controls) | Menu | corner menu button | Menu | |
| Reload for the new version (`update-reload`) | action, hidden | (toast button) | first free slot, only while the update toast shows | toast button | none | |

Notes:

- **Free pad slots** (`grep -rn "pad: '" src`): LT, D-pad ↑, ↓ and →. The update toast borrows the first free one
  (D-pad ↓) while it is up, so AGENTS.md requires at least one to stay unclaimed.
- Touch buttons for Bump, Honk and Ping are built by the registry; Jump and the main button are in `index.html`;
  Toss is built by the hotbar feature.
- The talk box is not a modal ([src/boogler/dialogue.js](../src/boogler/dialogue.js)): the game keeps playing, and it
  takes only the keys and pad buttons it answers with. Number keys 1-9 answer (not the hotbar while it is open), Enter
  skips the typing, E or Esc walks away (Esc with the pointer locked just ends the lock, which also ends the talk); the
  move keys, mouse look and Space still work. On the pad (`setPadGrab` in
  [src/player/controls.js](../src/player/controls.js)), D-pad ↑ ↓ picks, A or X skips the typing then answers, Y pets,
  B walks away; the sticks and other buttons keep playing. The pause view is still a modal
  ([src/player/modal.js](../src/player/modal.js)), and opening it ends a talk.
- While a pad is in use the touch overlay hides and the reticle shows; the next touch brings the touch controls back
  ([src/features/gamepad.js](../src/features/gamepad.js)). Analog triggers count as pressed at 0.4.

## 6. Systems

Sync kinds are defined in [DESIGN.md](../DESIGN.md), "Pick how each feature shares state". "Tick" means a lockstep
tick of 100 ms (10 per second).

### 6.1 Beach ball

- **What and how it plays.** One shared beach ball (radius 0.45 m, 0.6 kg). Grab it (E or click with empty hands),
  carry it (it rides on your back while something else is in your hand), throw it with a charged throw, bump it like a
  volleyball dig, or steal it from whoever holds it. It floats in the sea and the cave pond, drifts along the shore and
  washes back in, knocks ripe fruit off palms, bounces on
  mushrooms (restitution 0.95) and off the Boogler and windmill sails. Walking into a slow ball takes it over so the
  push resolves locally. It respawns at (12, 20) on R, or by itself when it leaves the map (3 m from the edge) or
  falls below −15 m.
- **Controls.** E / pad B grab or steal; click / pad X charge and throw; V / pad RT bump; R / View respawn.
- **Sync kind.** Owner. The tab that simulates it publishes presence `b: { e, p, v, q, h }` (epoch, position,
  velocity, quaternion, held); others smooth the owner's snapshots with `createSnaps` ([src/netplay/snaps.js](../src/netplay/snaps.js))
  120 ms behind with up to 150 ms of extrapolation. Ownership: highest epoch wins, ties to the larger peer id. An
  orphaned ball is claimed after 600 ms by the visible peer with the lowest id.
- **Tuning.** Linear damping 0.12, angular 0.3; ground friction 0.6, restitution 0.55 (ground), 0.45 (players), 0.95
  (mushrooms). Reach 2.4 m. Throw: full charge in 0.9 s, power 8 + 20 × charge m/s, aimed at a point 30 m along the
  camera, plus half your velocity and 1.5 m/s up, spin 8 rad/s. Bump: reach 3.4 m, 9.2 m/s up, 3.4 m/s forward, keeps
  25 % of old velocity, capped at 10.4 m/s, 300 ms cooldown. Rolling friction on the ground: velocity × (1 − 1.2 × dt),
  × (1 − 10 × dt) under 0.5 m/s. Buoyancy 3.2× weight at full submersion.
- **Files.** [src/physics/ball.js](../src/physics/ball.js), [src/physics/physics.js](../src/physics/physics.js), (respawn when off the island, auto-claim when you walk into it: `onFrame` hooks at
  orders −300 and −280 in the `world` phase, listed in [src/loop.js](../src/loop.js)), [src/features/bump.js](../src/features/bump.js), [src/features/impact.js](../src/features/impact.js)
  (squash, hit-stop, sand puff, boing, face-plant), [src/render/splash.js](../src/render/splash.js).
- **Known issues and limits.** Ball latency for non-owners is unmeasured (PLAN Phase 1). The ball is not persisted: it
  starts at its spawn each session. Keepy-uppy streak was built and cut (PLAN Phase 2). The tab that owns the ball keeps
  sending presence even before it enters the island (`keepPresenceWhile` in [src/netplay/net.js](../src/netplay/net.js)).

### 6.2 Sand digging and the shovel

Removed 2026-10-30 ([plans/cleanup-dig-water-junk.md](plans/cleanup-dig-water-junk.md)). The ground is fixed. The
`terrain` state key stays in `RULES` as a stub (loads any save, ignores old sand deltas, hashes a constant), and
`GIFTS[24]` (the shovel) stays in the catalog as `retired` so item indices do not shift.

### 6.3 Water sim

Removed 2026-10-30 ([plans/cleanup-dig-water-junk.md](plans/cleanup-dig-water-junk.md)). The sea (a shader and the
`SEA` level) and the cave pond stay: swimming, buoyancy, ball floating, splashes and fish all read the surface through
[src/physics/water-field.js](../src/physics/water-field.js) (`surfaceAt`, the sea, plus the cave pond at 3.0 m). The
`water` state key stays in `RULES` as a stub (loads any save, ignores the cells, hashes a constant), and the `slosh` op
is gone.

### 6.4 Mushrooms and the stall

- **What and how it plays.** Take seeds and a watering can from the stall. Use seeds to plant one in front of you on
  dry, open ground (the patch or anywhere else); use the can to water the nearest buried seed in reach. A watered seed
  grows into a big flat-topped mushroom that bounces players and the ball, and shoves you out from under it as it grows.
  A thrown seed plants itself where it lands. The Boogler likes seeds as a present.
- **Controls.** E / pad B "Take" at the stall; click / pad X with seeds (Plant) or can (Water).
- **Sync kind.** Lockstep. Ops `mush.plant`, `mush.water`; state `mushrooms` (`[i, j, g]` per plot). The host's
  render-side spot check (no water, rock, tree or cap) is passed in through `setEnv` as `env.canPlantAt`.
- **Tuning.** Growth 120 ticks (12 s) after watering; a dry seed waits forever. At most 60 plots, at least 3 cells
  apart (Chebyshev). 5 seeds per take, stack of 20. Cap radius 1.9 m, stem 0.85 m. Player bounce 15 × (0.55 + 0.45 ×
  growth) m/s; growth push at least 5.5 m/s. Pour animation 600 ms. A second seed waits 500 ms for the first to land.
- **Files.** [src/sim/mushrooms.js](../src/sim/mushrooms.js), [src/world/rules/mushrooms.js](../src/world/rules/mushrooms.js),
  [src/adapters/mushroom-garden.js](../src/adapters/mushroom-garden.js), [src/features/mushroom-garden.js](../src/features/mushroom-garden.js).
- **Known issues and limits.** Watering is only by can (not sim water or the ball). Growth counts ticks, which only run
  while someone is online, so nothing grows while the island is empty (see 8.6). Mushrooms never wilt or get
  harvested. The rest of Phase 5 (soil, crops, visitor bonus) is on hold.

### 6.5 Gifts

- **What and how it plays.** Home palms grow fruit you can shake loose (E within 2.1 m of the trunk) or knock down with
  a ball moving at 3 m/s or more; fruit falls on the side you shook from. Nothing washes up on the beach any more (removed 2026-10-30; items saved
  before that age out). The frisbee twinkles so you can spot it. Anything lying around can be picked up (if your hotbar
  has room) or was thrown there by someone.
- **Controls.** E / pad B: Pick up, or shake a palm.
- **Sync kind.** Lockstep. Ops `fruit.drop` (`t` tree, `d` direction 0..7), `gift.take` (`id`), `gift.toss`
  (`k` kind, `i, j`, `y` resting height or −1 ground / −3 lost, `l` launch, `n` nonce); state `gifts`. Palms and
  the frisbee perch are a static layout filled before tick 1.
- **Tuning** ([src/sim/gifts.js](../src/sim/gifts.js)). Regrow 2400 ticks (4 min) after a drop; ripening fruit visibly
  grows from 25 % to 80 % size. At most 64 trees, 48 items. Saved shore items still age out after 12,000 ticks
  (20 min); the wash-up schedule is pinned to never (`NEVER`). Fruit and thrown things last 6,000 ticks (10 min);
  perched items never expire; a perch refills 600 ticks (60 s) after its item is taken. When full, a new throw sweeps
  away the oldest thrown item. Fruit per tree is fixed by a hash over the cycle coconut, mango, coconut, banana,
  pomegranate, coconut, apricot.
- **Files.** [src/sim/gifts.js](../src/sim/gifts.js), [src/sim/gift-catalog.js](../src/sim/gift-catalog.js),
  [src/world/rules/gifts.js](../src/world/rules/gifts.js), [src/adapters/gifts.js](../src/adapters/gifts.js), [src/features/gifts.js](../src/features/gifts.js).
- **Known issues and limits.** Items saved on the old 129-cell grid stay at their old cells (now far-corner sea) until
  they rot ([tech-plan.md](tech-plan.md) B3).

### 6.6 Hotbar and items

- **What and how it plays.** Eight slots; whatever is selected is drawn in your hand and everyone sees it. New players
  start empty-handed. Pick-ups go into a free slot (seeds stack to 20); the ball takes a slot while you
  hold it and leaves when ownership does. Using what you hold: the can waters, seeds plant, anything
  else winds up a throw. A full hotbar greys the prompt ("Hotbar full").
- **Controls.** 1-8 (same key again for empty hands), pad LB / RB, tap a slot; use (click / X); Toss on touch.
- **Sync kind.** Local for the contents (localStorage `boogle.hotbar`); Owner for what is in your hand (presence `hd`,
  a catalog index or −1). Items cross into the world only through `gift.take` and `gift.toss`.
- **On touch.** Only filled slots show; in portrait they make a column on the right. Toss appears only when the main
  button would do something other than throw.
- **Files.** [src/player/inventory.js](../src/player/inventory.js), [src/player/hands.js](../src/player/hands.js), [src/features/hotbar.js](../src/features/hotbar.js),
  [src/player/item-models.js](../src/player/item-models.js), [src/player/item-icons.js](../src/player/item-icons.js), [src/features/prompt.js](../src/features/prompt.js),
  [src/sim/interact-pick.js](../src/sim/interact-pick.js).
- **The interact pick.** Every provider (ball, gifts and palms, stall, Boogler) lists targets in reach each frame;
  something that would act beats something blocked, then the nearest wins with a nudge toward where you look.
- **Known issues and limits.** The hotbar is not per room (one `boogle.hotbar` key for every room), unlike the Boogler
  friendship. An old `boogle.pocket` save migrates once. Every item is listed in 7.1.

### 6.7 Throwing and flight

- **What and how it plays.** Hold to charge (a meter and a dotted aim preview show), release to throw. Everything but
  the ball flies on a scripted path that bounces off scenery up to 6 times and comes to rest; a thing that lands in
  water is lost; a seed plants itself where it lands. The frisbee is thrown flatter and glides: lift with airspeed,
  heavy drag and a fade to the left as it slows.
- **Controls.** Click or pad X (hold, release); touch Toss.
- **Sync kind.** Local flight, Lockstep landing. The thrower computes the path and submits `gift.toss` with the launch
  and the landing cell; every client replays the flight from the launch; only the landing is shared state.
- **Tuning** ([src/physics/flight.js](../src/physics/flight.js), [src/player/player.js](../src/player/player.js)). Throws leave from head height.
  Power 8 + 20 × charge (frisbee 9 + 15 × charge) m/s. Drag 0.002/m; frisbee lift 0.05 per (m/s)², max 0.85 g, drag
  0.009, fade 1.6 m/s² below 18 m/s. Bounce keeps 30 % into the surface and 55 % along it (frisbee 12 % and 80 %);
  rests under 2 m/s on a surface flatter than about 53°. Max 8 s of flight.
- **Files.** [src/physics/flight.js](../src/physics/flight.js), [src/adapters/gifts.js](../src/adapters/gifts.js), [src/player/hands.js](../src/player/hands.js).
- **Known issues and limits.** Paths on different machines only need to look alike (raycasts use cannon-es).

### 6.8 The Boogler

A lavender blob (`#b99cff`, about three times as wide as tall) with a face and feet, who speaks with Uzbek words and
dreams of a restaurant. His HUD shows a bouncy name tag with your friendship hearts, his speech bubbles and the interact
prompt, and an edge-of-screen pointer with his distance when he is off screen (full within 35 m, gone by 60 m).

#### Wander

- **Sync kind.** Host. The host's brain publishes `g: { p: [x, z], r, w, m }` with `addHostField`; others
  interpolate. Solo tabs and clients that hear no host for 3 s walk him locally. He has a kinematic body, so the ball
  bounces off him and you can stand on him.
- **Behaviour.** Starts on dry land near (6, 22). Home is the garden centre (30, 2.5): he potters within 22 m and is
  pulled back the further he strays; each stop near home has an 8 % chance to start a trip, 70 % of the time to a POI
  (stopping 6 m outside its keep-out disc), otherwise a random mainland spot; he gives up a trip 3 % of the time per
  stop. Walks 1.5 m/s, turns 3.2 rad/s, stays on land between 0.45 and 30 m high, avoids slopes over 0.55 per metre,
  obstacles and the garden patch. Stops and faces anyone talking within 5 m; turns to look at players within 7 m;
  hurries at 2.3 m/s while ridden; flees at 3.4 m/s from wary players within 9 m.
- **Files.** [src/boogler/boogler.js](../src/boogler/boogler.js), [src/boogler/hud.js](../src/boogler/hud.js),
  [src/boogler/fx.js](../src/boogler/fx.js), [src/features/boogler.js](../src/features/boogler.js).

#### Friendship

- **Sync kind.** Local (localStorage `boogle.boogler.<room>`); each player publishes `bg: [act, wary, ev, evN]` so the
  host's brain knows who is talking, riding or wary, and every client plays the pets, hearts and launches.
- **Levels** ([src/boogler/friendship.js](../src/boogler/friendship.js)):

| Level | Name | Points |
|---|---|---|
| 0 | Stranger | 0 |
| 1 | Familiar face | 20 |
| 2 | Pal | 60 |
| 3 | Friend | 120 |
| 4 | Close friend | 190 |
| 5 | Best friend | 270 |

- **Points.**

| Action | Points | Limits |
|---|---|---|
| Pet (inside the talk) | +3 | 2.5 s apart, 8 scoring pets per 10 min |
| Present: love / like / meh / dislike | +12 / +7 / +3 / −3 (doppi +10 extra) | Repeats of the same kind halve each time; 4 scoring presents per 20 min |
| New story chapter | +6, plus answer points | once per chapter |
| Answers | about −2 to +3 each | small talk scores at most every 3 min (rude answers still cost) |
| Kicked off (launched) | −6 | |
| Too nosy | −4 | goes quiet for 90 s |

Points never drop below 0. Each new level bursts hearts and plays a level-up line. A typical 15-minute visit (a pet
every 2.5 min, a talk every 5, a mango and a coconut) reaches Best friend in about four visits.

#### Talk

- Open with E / pad B within 3.6 m ("Talk" shows in his name tag). The talk box types his line at 48 characters per
  second and lists answers; a present answer offers what is in your hand (he turns down key items: the ball). His portrait can be petted.
  On a phone the card keeps off the move stick (the left 45 %): to the right in landscape, at the top in portrait.
- **Easy in, easy out.** Talks are short and you keep playing: walk more than 4.6 m away, hop on his back, open the
  pause view, or press E / Esc / pad B / the close button (on a phone, the main button, which says Leave while you
  talk) and the talk ends at once, with his farewell (by level) as a
  speech bubble over his head (none while he is cross: a kick-off, wary or quiet talk). A finished chapter, small talk
  or present also ends the talk, with a "What else?" line as a bubble (or the level-up line); E opens the menu again.
  The kick-off telling-off ignores distance (you may have flown far), but E / Esc still close it.
- **Bookmarks.** Leave a story chapter halfway and he remembers where (flag `at.<thread>` = `<chapter>.<node>`); asking
  about that thread again picks it up there, opened with "Now, where was I? Ah, yes." or "As I was saying, before you
  ran off..." (`RESUME`).
- **Menu:** "How's it going?" (small talk), one entry per story thread, a present, and goodbye (one press: his farewell
  is a bubble). Greetings and farewells change with your level.
- **Loading.** The conversations (`talk.js` and `lines.js`) are their own chunk, fetched right after start; a talk
  opened before it arrives waits for it. What he says outside a talk (level-ups, pats, ride complaints, "Nope!") is in
  the small eager [src/boogler/barks.js](../src/boogler/barks.js) ([src/boogler/play.js](../src/boogler/play.js)).
- **Story threads** ([src/boogler/lines.js](../src/boogler/lines.js), [src/boogler/talk.js](../src/boogler/talk.js)):
  `home`, `mom`, `biz`, six, five and six chapters, each unlocking at a level (list in 7.2). The `mom` thread shows
  from level 1 or once `home` has started.
- **Nosiness.** Asking for a chapter above your level deflects (+1 nosy); pushing ("Oh, come on, tell me!") is +2
  nosy and −2 points; some answers are trust-gated and send you elsewhere below a level (+1 nosy). At 5 nosy he goes
  quiet for 90 s. Nosiness wears off at one per minute.
- **Flags** set by answers fill later lines: `mom`, `idea`, `slogan`, plus `kicked` (count) and `recent` (last three
  small-talk topics, so they rotate).

#### Riding and launch

- Stand on him and he carries you. He puts up with a rider for 3.5 + 1.2 × level seconds (1.5 s if wary), complaining
  at 35 %, 60 % and 82 % of that ("Um.", "Hey. Hey!", "Okay, that is enough..."). Then he puffs up for 750 ms and, if
  you are still on, launches you at 10.5 m/s up and 5.5 m/s out (air control is locked for up to 1.1 s), and tells you
  off once you land. Jump off in time and he says "Hmph. Smart."
- Patience recovers at half speed while you are off. Talking while riding: "Get off me first!"

#### Forgiveness

- Three unforgiven launches make him **wary**: he runs from you and the talk opens on a "Stay back!" menu with only
  "I'm really sorry about the rides.", a present, and goodbye.
- One launch is forgiven every 4 minutes; a present forgives two; an apology forgives one, at most every 10 minutes.

#### Known issues and limits

His position restarts with whoever hosts next. Friendship is per room and per browser. The `ACT` value 3 (old PET)
must never be reused. Related ideas: [proposals/boogler-tech-tree.md](proposals/boogler-tech-tree.md).

### 6.9 Social: honk and ping

- **Honk.** T / pad Y / touch Honk: a short cartoon honk with a note over your head, pitched from your colour on a
  major pentatonic from C4 (261.63 to 659.27 Hz). When 3 or more different players honk within about 1 s, every
  client plays a chord with 14 sparkles per player involved (cooldown 1.2 s). Your own honks are capped at one per
  300 ms; received honks at 3 per sender per second. Distance fades the volume.
- **Ping.** G / middle click / pad D-pad ← / touch Ping: a marker where you aim, labelled "Ball!" (the aim passes
  within 1.6 m of the ball), or "Look!" (anything else), in your colour with your name, for
  4 s (0.5 s fade), pinned to the screen edge with an arrow when off screen. Range 90 m, own cooldown 1 s, received
  one per 800 ms per sender.
- **Sync kind.** Neither is state: reliable room messages `{ t: 'honk' }` and `{ t: 'ping', x, y, z, k }`, validated
  and rate limited on receipt ([src/sim/social.js](../src/sim/social.js)).
- **Files.** [src/features/honk.js](../src/features/honk.js), [src/features/ping.js](../src/features/ping.js),
  [src/sim/social.js](../src/sim/social.js).
- **Related ideas.** [research/communal-progression.md](research/communal-progression.md) uses the honk chord as the
  template for together moments.

### 6.10 Critters

All are Local cosmetics (Math.random allowed), each behind a room-wide prototype flag that defaults to on.

| Critter | Flag | What | Numbers |
|---|---|---|---|
| Fish | `fish` | A boids school in water at least 0.4 m deep (sea, flooded beach); scatters from swimmers and a splashing ball. | 36 fish, 1.8 m/s cruise, 6 m/s flee, scare within 3.5 m. |
| Gulls | `gulls` | Idle and peck on the sand, burst up when a player runs at them (3 m/s or more within 4.5 m) or the ball lands within 5 m, circle 6 to 12 s, resettle. | 7 gulls, 7 m/s, circle radius 8 to 14 m, 6 to 10 m up. |
| Fireflies | `fireflies` | Blinking lights around the garden and over grass at night. | 60, shown when daylight is under 0.35. |

Files: [critter-fish.js](../src/features/critter-fish.js), [critter-gulls.js](../src/features/critter-gulls.js),
[critter-fireflies.js](../src/features/critter-fireflies.js). Related research:
[research/creature-ai-and-ecosystems.md](research/creature-ai-and-ecosystems.md).

### 6.11 Day and night

- **What.** A 20-minute day on the shared world clock: the sun is up for 60 % of it (12 min), the night lasts 8 min.
  World time 0 is early morning. A smiling sun and a sleepy moon cross the sky; the moon's phase cycles every 8 days
  (2 h 40 min of play) and the first night has a waxing half moon. Key light, ambient, fog, sky, clouds and water follow.
  At night the lighthouse lamp comes on (up to 26 m of light) and two beams sweep; the shadow pass turns off and blob
  shadows (flag `shadows`) mark where players and the ball are.
- **Sync kind.** Lockstep without state: a pure function of `world.tick` ([src/sim/sky-clock.js](../src/sim/sky-clock.js)),
  so everyone sees the same sky. Lighting is Local. Windmill sails and the lighthouse beam use
  [src/netplay/shared-time.js](../src/netplay/shared-time.js) (ticks filled in with local time).
- **Files.** [src/render/sky.js](../src/render/sky.js), [src/features/day-night.js](../src/features/day-night.js),
  [src/render/lights.js](../src/render/lights.js) (a small pool of point lights handed to the glowing sources nearest the camera),
  [src/features/blob-shadows.js](../src/features/blob-shadows.js).
- **Limits.** The clock only advances while someone hosts, so the time of day stops while the island is empty.

### 6.12 Caves

- **What.** A separate little world under the heightfield, loaded lazily in its own chunk after start
  ([src/features/pois.js](../src/features/pois.js); its `site.js` ground stays eager): one seamless mesh, built a little
  each frame once loaded,
  is both the look and a trimesh collider. The ground is cut open at the four mouths (`setTerrainHoles`), and a ring
  of rock round each mouth (look only) hides the seam where the hillside's hole meets the tunnel. Bodies switch
  between the surface's collision group and the cave's when they cross a mouth (1 m out counts as in); a safety net
  puts anything stuck in rock back. Inside, the camera stays in the tunnel, the fog closes in and the sky light dims
  (`atmosphere.underground`); darkness is baked per vertex by distance from the nearest mouth (full daylight within 2 m,
  60 % from 14 m in). Cave rock casts shadows so the sun no longer lights the tunnels.
- **Sync kind.** Local and cosmetic, apart from collisions, which only affect bodies this client simulates.
- **Files.** [src/pois/caves/](../src/pois/caves/) (`network.js`, `mesh.js`, `decor.js`, `index.js`, `site.js`),
  [src/physics/physics.js](../src/physics/physics.js) (`GROUP`, `groundProbe`).
- **Known issues.** The phone playtest asked for an audit of the caves' look and the walk in and out; the owner keeps
  the caves but wants that audit before more is added ([tech-plan.md](tech-plan.md), "Decided").

### 6.13 Pause view and controls guide

- **What.** A local overlay (the island keeps running) with Resume, Controls (the generated guide with Keyboard,
  Gamepad and Touch tabs, starting on your input kind), Room (who is here and an invite link; `?room=` is left out for
  the default room) and Leave (press twice within 3 s; it reloads the page). The title is the room id. It opens on Esc
  (when the pointer lock ends), H (on the Controls page), pad Menu and the corner menu button.
- **Sync kind.** Local, through [src/player/modal.js](../src/player/modal.js) (one modal at a time; it takes keys and pad).
- **Files.** [src/features/pause.js](../src/features/pause.js), [src/player/guide.js](../src/player/guide.js),
  [src/player/glyphs.js](../src/player/glyphs.js), [src/player/controls.js](../src/player/controls.js).
- **Related research.** [research/controls-guide-and-pause-menu.md](research/controls-guide-and-pause-menu.md).

### 6.14 First-run card

- **What.** The first time you play with each input kind (keyboard, pad, touch) a small paper card lists the basics
  (groups move, camera, ball, hands, from the registry) and points at the menu. It never takes input and leaves after
  3 s of walking or 15 s.
- **Sync kind.** Local (localStorage `boogle.firstRun.<kind>`).
- **Files.** [src/features/first-run.js](../src/features/first-run.js).

### 6.15 Telemetry and updates

- **Telemetry.** Sends JS errors, desyncs (which states, which tick), snapshot load failures and connection outcomes
  (with `hadTurn`, `role`, `mixedBuilds`) to `POST /report`, only when `VITE_BOOGLE_SERVER` is set. Nothing personal.
  At most 20 reports per page load, each duplicate at most twice, batched every 10 s and on pagehide with
  `sendBeacon`. A join still "connecting" after 30 s reports as stuck. Local.
  File: [src/features/telemetry.js](../src/features/telemetry.js).
- **Mixed builds.** Each tab checks `version.json` on start, every 5 min and when it comes back into view. A hidden tab
  reloads onto a newer build at once; a visible one shows "Boogle was updated – reload to stay in sync with friends"
  with a Reload button and reloads the next time it is hidden. Each player's build rides in presence `bv`.
  Files: [src/features/updates.js](../src/features/updates.js), [src/netplay/builds.js](../src/netplay/builds.js).
- **Desync visibility (dev).** `?netdebug=1` shows an overlay of role, hash checks and per-state status, and on a
  mismatch saves both sides' diverging state as JSON. The stub [src/features/syncsafety.js](../src/features/syncsafety.js)
  loads [src/debug/netdebug.js](../src/debug/netdebug.js) only with the flag; `?debugcam=1` likewise loads
  [src/debug/debug-cam.js](../src/debug/debug-cam.js).
- **Limits.** Whether a TURN relay was actually used is not observed, only whether one was configured.

### 6.16 Prototype flags

Room-wide toggles for experimental features: `feel`, `fish`, `gulls`, `fireflies`, `shadows`, all on by default.
`?proto=0` turns all off, `?off=feel,gulls` turns some off. The host's URL wins: the bitmask is the Lockstep state
`proto` (no ops), adopted by joiners with the snapshot. Files: [src/sim/proto.js](../src/sim/proto.js),
[src/world/rules/proto.js](../src/world/rules/proto.js), [src/adapters/proto-flags.js](../src/adapters/proto-flags.js).

## 7. Content inventory

### 7.1 Items (gift catalog)

From [src/sim/gift-catalog.js](../src/sim/gift-catalog.js), in catalog order (the index is the wire id: append only).
Source `sea` items used to wash up on the beach (retired 2026-10-30: they no longer appear, but held ones can still be given and thrown). Points are the friendship value of a first present.

| # | Id | Name | Source | Weight (chance) | Boogler taste | Points |
|---|---|---|---|---|---|---|
| 0 | coconut | coconut | tree (3 of 7 palms' cycle slots) | | meh | 3 |
| 1 | mango | mango | tree | | like | 7 |
| 2 | banana | banana | tree | | like | 7 |
| 3 | pomegranate | pomegranate | tree | | love | 12 |
| 4 | apricot | apricot | tree | | love | 12 |
| 5 | shell | seashell | sea (retired: no longer washes up) | | like | 7 |
| 6 | starfish | starfish | sea (retired: no longer washes up) | | like | 7 |
| 7 | driftwood | piece of driftwood | sea (retired: no longer washes up) | | meh | 3 |
| 8 | seaweed | clump of seaweed | sea (retired: no longer washes up) | | dislike | −3 |
| 9 | flipflop | flip-flop | sea (retired: no longer washes up) | | meh | 3 |
| 10 | boot | old boot | sea (retired: no longer washes up) | | dislike | −3 |
| 11 | duck | rubber duck | sea (retired: no longer washes up) | | like | 7 |
| 12 | sunglasses | pair of sunglasses | sea (retired: no longer washes up) | | like | 7 |
| 13 | sponge | sea sponge | sea (retired: no longer washes up) | | meh | 3 |
| 14 | float | glass float | sea (retired: no longer washes up) | | like | 7 |
| 15 | bottle | message in a bottle | sea (retired: no longer washes up) | | like | 7 |
| 16 | card | soggy business card | sea (retired: no longer washes up) | | like | 7 |
| 17 | melon | melon | sea (retired: no longer washes up) | | love | 12 |
| 18 | teacup | tea bowl (piyola) | sea (retired: no longer washes up) | | love | 12 |
| 19 | book | waterlogged book ("Business for Beginners") | sea (retired: no longer washes up) | | love | 12 |
| 20 | abacus | little abacus (cho't) | sea (retired: no longer washes up) | | love | 12 |
| 21 | doppi | embroidered cap (doppi) | sea (retired: no longer washes up) | | love, bonus 10 | 22 |
| 22 | seeds | mushroom seed | stall | | like | 7 |
| 23 | can | watering can | stall | | meh | 3 |
| 24 | shovel | shovel | tool (retired 2026-10-30: not obtainable, dropped from saved hotbars) | | meh | n/a |
| 25 | frisbee | frisbee | perch (lighthouse deck) | | like | 7 |
| 26 | ball | beach ball | ball (key: refused) | | meh | n/a |

Every item has a line he says when you hand it over (or why he refuses it).

### 7.2 The Boogler's lore and chapters

**Characters and places**

| Name | Who or what | Where it comes up |
|---|---|---|
| The Boogler | A blob from Samarqand, Uzbekistan; "a good brand needs a 'The'". Entrepreneur "between ventures". | Everywhere |
| Oyijon | His mother: small, loud, carries four melons at once; "if you walk into her house, you eat"; ran a bazaar stall for thirty years and sells suzani. | `mom` thread, `home2`, bottle and apricot lines |
| Gary | "Gary. Boats." Only on the soggy business card. | `card` item line only |
| Samarqand | His home city. | `home` thread, pomegranate line, `biz5` |
| The Registon | A square with three huge blue-tiled buildings. | `home1` |
| The bazaar | Where he learned business. | `home1` |

**Lore facts** (from [src/boogler/lines.js](../src/boogler/lines.js)): he started a melon export business without
knowing Uzbekistan is doubly landlocked; four trucks, two trains, one very small boat and seven hundred golden melons,
then a storm; he floated for three days holding one melon and ate it on the first night. He promised Oyijon to come
back "a big success" (she said "Come back fed"); there are no boats on the island. Every week he writes her a letter in
a coconut shell. He misses osh (plov), cooked in a qozon, and Navro'z, when the apricot tree Oyijon planted the year he
was born flowers. A book, "Business for Beginners", washed up with its pages stuck together. Uzbek words he uses:
Assalomu alaykum, do'stim (my friend), Xayr (goodbye), Ko'rishguncha, anor, o'rik, qovun, piyola, cho't, doppi.

**Ventures** (`biz1`): a coconut water stand (zero customers), seashell consulting, professional napping. His plan
(`biz3`): "The Boogler's Osh and Coconut Emporium". His offer (`biz5`): when the Emporium makes enough money, buy a boat
to Samarqand, with you as his business partner.

**Idea and slogan flags.** `idea` (`biz2`): "fruit smoothies" or "ball insurance" (default "fruit smoothies").
`slogan` (`biz3`): "Come hungry, leave round." (default), "Rice to meet you." or "No free rides.". `mom` is set when
you ask about Oyijon.

**Chapters**

| Thread (menu question) | Chapter | Unlocks at | Opens with |
|---|---|---|---|
| home ("Where are you from?") | home0 | 0 Stranger | Uzbekistan, far from the sea |
| | home1 | 1 Familiar face | The Registon and the bazaar |
| | home2 | 2 Pal | Osh in a qozon; first mention of Oyijon |
| | home3 | 3 Friend | How he got here: the melons |
| | home4 | 4 Close friend | Navro'z and the apricot tree |
| | home5 | 5 Best friend | The island has become home |
| mom ("Do you have any family?") | mom0 | 1 | Oyijon and the four melons |
| | mom1 | 2 | Her one rule: you eat |
| | mom2 | 3 | No boats, and the promise |
| | mom3 | 4 | Letters in coconut shells |
| | mom4 | 5 | Helping him write a letter |
| biz ("What do you do here?") | biz0 | 0 | Entrepreneur between ventures |
| | biz1 | 1 | The three-business portfolio |
| | biz2 | 2 | "Business for Beginners"; pick an idea |
| | biz3 | 3 | The Emporium; pick a slogan |
| | biz4 | 4 | Doubt: "just a blob who lost some melons" |
| | biz5 | 5 | The partnership offer |

Finished threads offer a retelling ("Tell me about Samarqand again."): he tells one of the thread's chapters again
(never the one he retold last; trust-gated answers now open), scoring like small talk, then a retell line. The last
retold chapter per thread is the `retold.<thread>` flag.

**Small talk** ("How's it going?"): `ball`, `mushrooms`, `fruit` (level 0), `name` (level 1),
`visitors` (level 2), `rides` (needs the `kicked` flag).

### 7.3 POIs

| POI | Folder or file | Position | Interactive parts |
|---|---|---|---|
| Spawn and court | [constants.js](../src/constants.js), [grid.js](../src/world/grid.js) | (14, 26); court (12, 21) r 8 | Ball spawn |
| Mushroom stall | [mushroom-garden.js](../src/adapters/mushroom-garden.js) | (15.2, 13.4) | Seeds, watering can |
| Garden patch | [sim/mushrooms.js](../src/sim/mushrooms.js) | centre (30, 2.5) | Planting |
| Lighthouse | [pois/lighthouse/](../src/pois/lighthouse/) | (6, −58) | Stair, deck, frisbee perch, night lamp |
| Windmill farm | [pois/windmills/](../src/pois/windmills/) | (82, −46) | Solid turning sails |
| Caves | [pois/caves/](../src/pois/caves/) | mouths at (−37, −80), (−26, −95), (−71, −83), (−44.5, −104.5) | Walk-through, pond for the ball |

## 8. Multiplayer and persistence

### 8.1 Topology

A star around a host peer over PeerJS ([src/net/peer-room.js](../src/net/peer-room.js),
[src/net/README.md](../src/net/README.md)). The host registers the PeerJS id `boogle-<room>-host`; others register a
random id and connect to it with two data channels: `u` (unordered presence) and `r` (reliable, ordered messages,
heartbeats). The host relays presence and messages. Ids in messages are each tab's stable `selfId`, not PeerJS ids.
Heartbeats every 500 ms; a peer silent for 3 s is gone. Messages are capped at 16,000 characters. Without
`VITE_BOOGLE_SERVER`, PeerJS's public signaling server and default STUN are used ([src/netplay/net.js](../src/netplay/net.js)). A
failed join drops to "Solo" and retries.

### 8.2 Host migration

When the host goes, every client waits a random 200 to 1200 ms and tries to claim the host id; the winner hosts and the
rest reconnect. Peers that do not come back within 9 s are reported as left. The new host continues from its own world
state, bumps the edit sequence and hashes soon. Edits the old host never stamped are lost; edits made while
reconnecting are held (up to 64, 5 s) and released one per 210 ms.

### 8.3 Sync kind per feature

| Feature | Kind | Channel / API |
|---|---|---|
| Your avatar (name, colour, position, yaw, state) | Owner | presence `n`, `c`, `p`, `r`, `s` |
| Beach ball | Owner (epoch rule) | presence `b` |
| What you hold | Owner | presence `hd` |
| Flops, face-plant | Owner | presence `fl`, `kd` |
| Your build id | Owner | presence `bv` |
| How you treat the Boogler | Owner | presence `bg` |
| The Boogler's position and mode | Host | `addHostField('g')` |
| Sand | none | retired 2026-10-30; `terrain` is a stub state |
| Water | none | retired 2026-10-30; `water` is a stub state |
| Mushrooms | Lockstep | ops `mush.plant`, `mush.water`; state `mushrooms` |
| Fruit, thrown things, frisbee | Lockstep | ops `fruit.drop`, `gift.take`, `gift.toss`; state `gifts` |
| Prototype flags | Lockstep | state `proto` |
| Sky, sails, lighthouse beam | Lockstep without state | function of `world.tick` |
| Flights of thrown things | Local replay, Lockstep landing | `gift.toss` |
| Honk, ping | Messages (not state) | `room.send` `{ t: 'honk' }`, `{ t: 'ping' }` |
| Hotbar, Boogler friendship, first-run flags | Local | localStorage |
| Critters, splashes, impact juice, blob shadows, pause view, guide | Local | none |

Presence goes out every 50 ms (20 Hz, `SEND_MS`); remote poses are drawn 120 ms behind (`INTERP_MS`).

### 8.4 Lockstep world, snapshots and saves

[src/world/sync.js](../src/world/sync.js), [src/world/README.md](../src/world/README.md),
[src/world/rules/README.md](../src/world/rules/README.md).

- 10 ticks per second. Clients send `w:edit`; the host validates, stamps each edit 3 ticks ahead and broadcasts
  `w:edits`. Everyone applies edits in tick and sequence order, then runs ticks in `RULES` order: terrain, mushrooms,
  gifts, proto, water (append only: it is the wire order). Clients run about 2 to 3 ticks behind the host.
- Every 20 ticks (2 s) the host sends per-state hashes; a client that disagrees (or gets an edit for a past tick) asks
  for a snapshot (`w:need`) and replaces its state. Snapshots travel in 7,000-character chunks.
- States have versions and migrations (`registerState(key, { version, migrate })`); all are at version 0 today. A
  state that fails to load starts fresh; a state from a newer build is skipped and that tab stops persisting.
- The world seed is the constant 20261028 for every room.

### 8.5 What persists and where

| What | Where | Key or route | Scope |
|---|---|---|---|
| World snapshot (terrain, water, mushrooms, gifts, proto, tick) | localStorage on every ready peer, every 30 s and on pagehide if changed (clients only save hash-verified ticks) | `boogle.world.<room>` | per room, per browser |
| World snapshot | Server, host only, bodies under 250 KB | `PUT /rooms/:id/snapshot` | per room, only with `VITE_BOOGLE_SERVER` |
| Name, colour | localStorage | `boogle.name`, `boogle.color` | global |
| Hotbar | localStorage | `boogle.hotbar` (old `boogle.pocket` migrated once) | global, not per room |
| Boogler friendship | localStorage | `boogle.boogler.<room>` | per room |
| First-run card seen | localStorage | `boogle.firstRun.<kind>` | global |
| Update reload guard | sessionStorage | `boogle-update-reloaded-for` | per tab session |

A tab that becomes host without state loads the newest, by tick, of its local copy and the server's (it waits up to 3 s
for the server). Not persisted: the ball, the Boogler's position.

The server ([server/README.md](../server/README.md)) is one Node service: PeerJS signaling at `/peerjs`, snapshots
(256 KB max, 30 PUTs per minute per IP, 1,000 rooms), `/report` and `/reports`, `/ice` (Google STUN plus optional
TURN) and `/healthz`.

### 8.6 Known gaps

- **`world.epochMs` is never read.** It is set when a host starts fresh, saved and loaded with snapshots, and checked
  as an integer, but no game logic reads it. Nothing grows from elapsed wall-clock time: growth, regrowth, wash-ups and
  the day all count ticks, which only run while someone hosts. DESIGN principle 9 ("growth is computed from elapsed
  time") is not met yet.
- **The server is not deployed, as far as the repo shows.** PLAN Phase 1 "Deploy `server/` (Fly.io) and add TURN
  credentials" is unchecked, every human step in the server README checklist is unchecked, `fly.toml` still has the
  placeholder app name, and the owner's call on deploying is pending ([tech-plan.md](tech-plan.md)). The deploy
  workflow skips without a `FLY_API_TOKEN` secret. (The repo variables could not be read from here.) So today the live
  site most likely uses public PeerJS signaling, no TURN, no server snapshots and no telemetry: an empty island
  survives only in players' localStorage.
- No TURN: players behind strict NATs may not connect; the failure rate is unmeasured.
- The sim is not in a Web Worker (tech plan C4 decided: no worker). Hidden tabs keep
  ticking through a worker heartbeat ([src/world/background.js](../src/world/background.js)), catching up at most 5 s.
- Mixed builds: presence guards for `fl` and `kd` stay until every tab runs b0a3a7b or later (comments in `feel.js`,
  `impact.js`).
- Trust: host validation checks ranges, rates and state, but not the player's reach (PLAN's "Key decision" mentions
  reach). Fine among friends, per PLAN.

## 9. Tech and tooling

Brief; the rules for contributors are in [AGENTS.md](../AGENTS.md) (imported by [CLAUDE.md](../CLAUDE.md)) and the
folder map in [src/README.md](../src/README.md).

- **Stack.** three.js 0.186.1, cannon-es 0.20.0, PeerJS 1.5.5, bundled with Vite ([package.json](../package.json));
  the build splits three, cannon-es and peerjs into vendor chunks ([vite.config.js](../vite.config.js)).
- **Layout.** `src/` is grouped by domain: `features/` (auto-loaded plug-ins), `world/` and `world/rules/` (lockstep),
  `sim/` (pure logic), `net/` and `netplay/`, `island/` and `pois/`, `adapters/` (the game side of lockstep state),
  `physics/`, `player/`, `render/`, `boogler/`, `debug/`.
- **Plug-ins.** A feature registers `onFrame(fn, { phase, order })` and `onStart(fn)` ([src/loop.js](../src/loop.js),
  which lists the core hooks' orders; features use −10 and up). `main.js` only wires modules and renders. Heavy or
  rarely used parts load with a dynamic `import()` ("Lazy parts" in `loop.js`): today the caves, the Boogler's
  conversations and the debug tools; never sync ops, state, rules or anything seen in the first seconds. Shared
  registries: controls (`registerAction`), interactables (`registerInteractable`) and particles (`emit('soft' |
  'clump', ...)` in [src/render/particles.js](../src/render/particles.js)).
- **Checks.** `npm run check`: lint (determinism rules on lockstep files, import boundaries, `registerOp`/
  `registerState`/`onTick` only in `world/rules/`), unit tests (`node:test`, pure logic only) and build.
  `npm run check:full` adds server tests and the headless network test. Key tests:
  [test/world-replay.test.mjs](../test/world-replay.test.mjs) (seeded edits for every op, host killed midway, late
  joiner, identical hashes) and [test/world-snapshots.test.mjs](../test/world-snapshots.test.mjs).
- **Scenarios.** `npm run scenario -- <name>` and `npm run look` (stills, motion sheets, heatmaps). Scenarios in
  [dev/scenarios/](../dev/scenarios/): caves, controls-guide, hotbar, interact,
  lighthouse, particles, pause, reconnect-edit, shared-kinds, smoke, two-player-edit, world-inputs. CI runs
  `world-inputs`, `smoke` and `two-player-edit` on every PR (they must pass); the rest run nightly in
  `scenarios-nightly.yml` and never block. `npm run island-map` renders the composed island.
- **Perf.** `npm run perf`: draw calls, triangles and ms per lockstep tick, with rows tagged by handler.
- **Video.** `npm run clip`, `reel`, `video:changes`, `video:publish` ([dev/video/](../dev/video/)).
- **Shipping.** `npm run ship` and self-merging PRs; the steps are in AGENTS.md, "Shipping". `smoke.yml` runs the
  nightly live two-tab test; `deploy-server.yml` deploys `server/` when a token exists.

## 10. Status

The roadmap and its checkboxes are in [PLAN.md](../PLAN.md); the tech plan's items and the owner's keep/cut and server
decisions are in [tech-plan.md](tech-plan.md) ("Decided"). This file does not copy them, so they have one place to be
ticked.

### Related ideas (not built)

[proposals/directions.md](proposals/directions.md) (storm tide, landmark restoration, coconut post, raft and buggy),
[proposals/boogler-tech-tree.md](proposals/boogler-tech-tree.md), [proposals/vehicles.md](proposals/vehicles.md),
[proposals/hub-and-minigames.md](proposals/hub-and-minigames.md), [proposals/methodology.md](proposals/methodology.md);
research in [research/](research/README.md).

## 11. Glossary

| Term | Meaning |
|---|---|
| Adapter | The render and input side of a lockstep system; reacts through `onApplied`, `onAfterTick`, `onSnapshot`. |
| Cell | One 1.25 m square of the world grid, `(i, j)` at x = i × 1.25 − 255, z = 255 − j × 1.25. |
| Edit | A small op (`mush.plant`, `gift.toss` ...) a client submits; the host stamps and broadcasts it. |
| Epoch | The ball ownership counter; the highest claim wins. |
| Host | The browser holding `boogle-<room>-host`; authority for lockstep stamping, the Boogler and server saves. |
| HOME | The −80..80 m square where wash-ups exist. `HOME_KEEP` (22 m) is the untouched core. |
| Host field | Host-kind state published in the host's presence (`addHostField`). |
| Key item | A catalog item the Boogler refuses (ball). |
| Local / Owner / Host / Lockstep | The four sync kinds (DESIGN.md). |
| Perch | A spot that always gets its item back (the frisbee on the lighthouse deck). |
| POI | Point of interest: a folder in `src/pois/` with a site and content. |
| Presence | Each player's small JSON state, sent 20 times a second, latest wins. |
| Proto flag | A room-wide toggle for an experimental feature. |
| Rules module | The lockstep half of a system in `src/world/rules/`. |
| Snapshot | The serialized world (every registered state, tick, seed, versions), for joiners and saves. |
| Stamp | A terrain shape a POI applies to the ground. |
| Tick | 100 ms of lockstep time. |
| Wary | The Boogler's state after 3 unforgiven launches: he runs from you. |

## 12. Doc and code mismatches found while writing this

Still open:

- PLAN Phase 0 says three.js 0.160.0 is pinned; `package.json` has 0.186.1. The peer-room header cites peerjs 1.5.4;
  the package has 1.5.5.
- DESIGN.md's authority table names "weather", which does not exist yet.
- DESIGN principle 9 and `src/world/README.md` mention offline growth through `world.epochMs`; nothing reads it.
- The hotbar is global while the Boogler friendship is per room; nothing documents whether that is intended.

Fixed since: the spring API and `dev/water-lab/` are gone (#31), frame logic left `main.js` (#29); the lighthouse
header, DESIGN's Lockstep examples, PLAN Phase 4's slosh and worker items and the tech plan's legacy-code line now match
the code.
