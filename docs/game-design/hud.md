# 6.25 HUD feedback: sounds, motion, notices

The HUD answers every press within the frame, quietly, so the toys stay louder than the UI
([docs/research/ui-patterns.md](../research/ui-patterns.md), recs 1-5). Was the `?proto=uisfx` prototype ("UI that
answers"); the owner kept it (2026-11-01). Local and cosmetic: nothing here is synced.

- **Corners**: name chips and the Live count live in Pause on every platform. Only touch keeps the corner menu button; keyboard and gamepad use their menu controls. The HUD has no Boogle logo.
- **Sounds** ([src/ui/ui-sound.ts](../../src/ui/ui-sound.ts)): synthesized, C major pentatonic, on a bus about 8 dB under
  the master, each kind rate-limited.
  - _tick_ when something new lands in your hand: one soft E5 sine, 45 ms (`TICK = false` silences it).
  - _pop_ when the interact prompt appears or a notice arrives (at most one per 220 ms).
  - _thunk_ when a press acts (Take logs, Pick up): a marimba-like wooden tok on G4 over a soft low knock.
  - _deny_ (falling two notes) when a press can't act ("Can't grow here").
  - _count_ per step of the haul count: a small bright clink, climbing with the run (falling when you pour), resetting
    after 0.6 s.
  - _flap_ when a work-site plaque turns a row over: a quiet split-flap flutter (four tiny card clicks), louder the
    nearer you stand, silent past about 28 m.
- **Motion** ([src/ui/ui-kit.css](../../src/ui/ui-kit.css)): shared duration and easing tokens and a `linear()` spring
  (about 8% overshoot); things arrive in 240 ms and leave in 160 ms. The prompt sticker pops in, squashes on a press and
  shakes its head on a refusal; the name tag bounces when something new lands in your hand. Reduced motion turns the squash and shake off.
- **Legibility**: text read during play is 18 px (the held thing's name, the haul chip, notices), the prompt's verb 20 px,
  and every glass panel is 0.72 opaque so white text holds over clouds and foam.
- **Haul chip** ([src/features/haul-stack.ts](../../src/features/haul-stack.ts)): a wood pill above the name tag (above the action rows on narrow portrait touch screens) with a log
  icon, a big tabular count and the material, only while you carry something. The count ticks one by one toward the
  host-confirmed one (about 300 ms per change, a clink and a pop per step); at the hard cap it turns sun-yellow and says
  "full". Place replaces this chip with its [temporary carried-resource tag](place.md#carried-resource-display): four columns of material-coloured slots on no background, two rows without the frame and four with it. Empty cells remain visible; landed pickups pop for 200 ms with a 35 ms minimum stagger, disabled under reduced motion. "Full" and big cargo names use outlined display type. Exact contents remain in Pause; the existing 2-second hold and 200 ms fade stay. Classic Haul and its variants retain this chip unchanged.
- **One notification lane** ([src/ui/notify.ts](../../src/ui/notify.ts)): a single pill where the held thing's name tag is
  (under it on touch), for things only you need to know. One notice at a time, at most three waiting,
  the same text refreshing instead of stacking, 2.5 s by default. A hands note ("Can't grow here", "Nothing to plant
  here") is a coral _deny_ that goes first; "Boogle was updated" is a sticky _news_ notice with a Reload sticker
  ([telemetry-and-updates.md](telemetry-and-updates.md)) that waits under anything newer. The name tag gives way while
  a notice shows.
- **World first**: shared news stays in the world, never in the lane. When a pour earns points the site's plaque turns
  the changed rows over like a departures board (staggered, a sun glow fading as each settles), with a puff of motes
  over the board, and plays the flap. While you keep pouring (one pour every 300 ms) it flips at most once every 1.2 s;
  the pours in between just change the numbers ([haul.md](haul.md)).
- **Files.** [src/ui/](../../src/ui/), [src/features/held.ts](../../src/features/held.ts),
  [src/features/prompt.ts](../../src/features/prompt.ts), [src/features/haul-stack.ts](../../src/features/haul-stack.ts),
  [src/features/work-sites.ts](../../src/features/work-sites.ts), [src/features/updates.ts](../../src/features/updates.ts).
  Stills at desktop and iPad size: `npm run scenario -- hud-glance` is known stale (skipped; it drives classic edits the railway room refuses; what a port needs is in its header). Listening pack: `node dev/audio/render.ts --only ui`.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
