# 6.26b Prototype: Ultra Water in our renderer (`?proto=water`)

*Ultra Water's ocean rewritten in TypeScript and TSL inside Boogle's renderer, in stages, to find how much of it should
become the real sea. It starts from that water's own numbers and moves toward toon by changing parameters. Serves DESIGN.md 1
(Toys before chores). Research: [ultra-water.md](../research/ultra-water.md). Without the flag nothing loads:
`src/features/proto-water.ts` imports `src/proto/water/` only with it. Its own room, `proto-water`, and Local: no ops,
states, presence or messages. Adapted code's notices ship at `/THIRD_PARTY_NOTICES.md`.*

## What you see and do

- You start on a beach of a test island 2.4 km from home, facing a rock in the surf. Walk, wade and swim as usual; home is a
  smudge on the horizon.
- **The water** replaces the sea on this page: a camera-centred mesh to the horizon, a body colour from depth, sky reflection,
  a sun lane that breaks into glitter, and foam.
- **The surf** follows the shelf: fronts slow, bunch and bend round the island and the rock, break in peeling sections, and
  leave lace behind. Each crest churns a skirt of foam at the rock.
- **The wet sand:** each wave runs up the beach, drains back and leaves a darker band that dries in seconds.
- **Splashes** ripple through the game's own splash slots.
- **Spray** follows the actual shore-wave phase: real breakers shed individual droplets and crests hitting the surf rock
  throw water up its seaward face. Each fresh splash slot also launches a small outward crown, without replacing its ring.
  This serves DESIGN.md 11 (Show, don't tell). `spray.ts` adapts Ultra Water's `Spray.js` through the shared particle emitter;
  no extra pool, mesh, renderer or network state.
- `&v=raw` plays the demo's own water numbers with no grade.

## Stages

1. Surface, slope moments, foam and shore field, over a few analytic waves and frozen slope tiles. **Built.**
2. FFT as native TSL compute, replacing the frozen tiles. Not built.
3. Reading the opaque scene for refraction and depth contact, and the underwater treatment. Not built; changes the frame graph.

## Numbers

[tuning.ts](../../src/proto/water/tuning.ts): `ULTRA` is the demo's values, `GRADE` is ours over them. `&ocean=off` and
`&grid=192` are for measuring cost.

### Spray

The CPU reads bilinear, clamp-to-edge copies of the shore textures' **half-float values**, including travel time and surf
shelter. Its first-train amplitude, peeling/breaking gate, `hash12`, `vnoise`, `shoreNoisePhase` and `shoreGroup` mirror
`surface.ts` / `shore-nodes.ts`. Noise uses world coordinates and float32 intermediate arithmetic; the phase is
`omega * (tau + t) + noisePhase`, using the surface's own time uniform. This also follows `&v=raw`'s wave settings.

Source launch speeds, gravity (9.81), drag (breakers 1.7, rock 1.6, crowns 1.2), lifetimes, amplitude gates and the 350 m
distance cutoff are retained. Small separate dots replace the source's expanding, noise-masked droplet-cloud quads:
the shared emitter cannot reproduce its forward-scattering lighting, soft depth intersection, fade-in or exact analytic
ballistic integration. No growing smooth puffs. Boogle's impact slots lack `uImpactSize`, so crowns use the same 0.5 m
radius as this port's ripple shader.

Bounds: 768 fixed breaker emission points and 128 points on the surf rock; at most **180 emits in any rolling second**
and **48 per frame**, including up to 32 droplets per fresh impact. Camera distance and near-lens fades suppress invisible
work, stale crests are discarded after a pause, and the emitter reuses its descriptor and bookkeeping arrays each frame.
The shared `emit()` implementation still performs its own queue writes. All of this is Local and cosmetic.

The rock path includes the source's beach-swash arrival branch (`Rf = 2.1 * R`, 0.6 reach), but the configured `ROCK` is
offshore. Other shore rocks are private to `island.ts`; wiring those to spray needs an exported placement list there, outside
this task's file scope. That branch and the rendered spray still need the director's visual check.

Director view: `/?proto=water&dpr=fixed`, camera `(2571.58, 7, -53.15)` looking at `(2553.58, 2, -41.15)` for 12 seconds;
compare `&v=raw`. Crest arrivals should produce separate upward droplets falling seawards, while small unbroken open-water
crests remain quiet. Entering the water creates a brief outward crown over the existing ripple rings.

CPU verification: the actual TSL helper bodies evaluated with float32 scalar/vector operations matched the JS `hash12`,
`vnoise`, phase noise and group on 10,000 world-coordinate/time inputs (zero measured error). This is expression parity,
not a GPU readback or visual check. A 60-second CPU exercise with the real shore bake emitted 5,768 droplets, peaked at
180 in a rolling second and 33 in one frame, consumed a fresh impact once (32 crown droplets), and emitted zero with a
distant camera. A synthetic shallow-rock field exercised the swash branch with both raw and graded wave settings.
