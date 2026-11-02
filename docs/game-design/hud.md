# 6.25 HUD feedback: sounds, motion, notices

The HUD answers every press within the frame, quietly, so the toys stay louder than the UI
([docs/research/ui-patterns.md](../research/ui-patterns.md), recs 1-5). Was the `?proto=uisfx` prototype ("UI that
answers"); the owner kept it (2026-11-01). Local and cosmetic: nothing here is synced.

- **Sounds** ([src/ui/ui-sound.ts](../../src/ui/ui-sound.ts)): synthesized, C major pentatonic, on a bus about 8 dB under
  the master, each kind rate-limited.
  - *tick* on hotbar select: one soft E5 sine, 45 ms, the same for every slot (`TICK = false` silences it).
  - *pop* when the interact prompt appears or a notice arrives (at most one per 220 ms).
  - *thunk* when a press acts (Take logs, Pick up): a marimba-like wooden tok on G4 over a soft low knock.
  - *deny* (falling two notes) when a press can't act ("Hotbar full").
  - *count* per step of the haul count: a small bright clink, climbing with the run (falling when you pour), resetting
    after 0.6 s.
  - *flap* when a work-site plaque turns a row over: a quiet split-flap flutter (four tiny card clicks), louder the
    nearer you stand, silent past about 28 m.
- **Motion** ([src/ui/ui-kit.css](../../src/ui/ui-kit.css)): shared duration and easing tokens and a `linear()` spring
  (about 8% overshoot); things arrive in 240 ms and leave in 160 ms. The prompt sticker pops in, squashes on a press and
  shakes its head on a refusal; a hotbar slot bounces when selected. Reduced motion turns the squash and shake off.
- **Legibility**: text read during play is 18 px (the hotbar name, the haul chip, notices), the prompt's verb 20 px,
  and every glass panel is 0.72 opaque so white text holds over clouds and foam.
- **Haul chip** ([src/features/haul-stack.ts](../../src/features/haul-stack.ts)): a wood pill above the hotbar with a log
  icon, a big tabular count and the material, only while you carry something. The count ticks one by one toward the
  host-confirmed one (about 300 ms per change, a clink and a pop per step); at the hard cap it turns sun-yellow and says
  "full".
- **One notification lane** ([src/ui/notify.ts](../../src/ui/notify.ts)): a single pill where the hotbar's name tag is
  (above the hotbar; under it on touch), for things only you need to know. One notice at a time, at most three waiting,
  the same text refreshing instead of stacking, 2.5 s by default. A hotbar note ("Hotbar full", "Nothing to plant
  here") is a coral *deny* that goes first; "Boogle was updated" is a sticky *news* notice with a Reload sticker
  ([telemetry-and-updates.md](telemetry-and-updates.md)) that waits under anything newer. The name tag gives way while
  a notice shows.
- **World first**: shared news stays in the world, never in the lane. When a pour earns points the site's plaque turns
  the changed rows over like a departures board (staggered, a sun glow fading as each settles), swells a little with a
  puff of motes and plays the flap. While you keep pouring (one pour every 300 ms) it flips at most once every 1.2 s;
  the pours in between just change the numbers ([haul.md](haul.md)).
- **Files.** [src/ui/](../../src/ui/), [src/features/hotbar.ts](../../src/features/hotbar.ts),
  [src/features/prompt.ts](../../src/features/prompt.ts), [src/features/haul-stack.ts](../../src/features/haul-stack.ts),
  [src/features/work-sites.ts](../../src/features/work-sites.ts), [src/features/updates.ts](../../src/features/updates.ts).
  Stills at desktop and iPad size: `npm run scenario -- hud-glance`. Listening pack: `node dev/audio/render.ts --only ui`.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
