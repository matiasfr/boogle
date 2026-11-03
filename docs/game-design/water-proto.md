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
  a sun lane that breaks into glitter, wind slicks and foam.
- **The surf** follows the shelf: fronts slow, bunch and bend round the island and the rock, break in peeling sections, and
  leave lace behind. Each crest churns a skirt of foam at the rock and throws spray up its face.
- **The land** (their terrain, `src/proto/water/ground.ts`): sand, seabed, grass and rock by height and slope, sand ripples,
  banded rocks with a tide line. Each wave runs up the beach, drains back and leaves a darker band that dries in seconds; rocks
  shelter a dry wedge behind them.
- **Splashes** ripple through the game's own splash slots and throw a crown of droplets.
- **The underside shader** now has Ultra Water's rough Snell window, transmitted sun and total internal reflection.
  A diagnostic camera can inspect it; the regular camera still stays above until the volume treatment is connected.
  Above-water objects through the window are omitted until an opaque colour read exists.

## Options

- `&v=raw`: the demo's own water numbers, no grade.
- `&terrain=toy`: today's faceted island instead of their terrain; `&groundFlat=1`, `&rockFlat=1` facet theirs.
- `&waves=fft`: the FFT ocean instead of analytic waves. `&n=128|256`, `&cascades=1..4`, `&band=0..3`.
- `&ocean=off`, `&grid=192`: for measuring cost.

## Stages

1. Surface, slope moments, foam and shore field, over a few analytic waves and frozen slope tiles. **Built.**
2. FFT as native compute, in `fft.ts`: all cascades in one compute pass and one queue submission. **Built, opt-in.**
3. Reading the opaque scene for refraction and depth contact, and the underwater treatment. Not built; changes the frame graph.

## Numbers

[tuning.ts](../../src/proto/water/tuning.ts): `ULTRA` is the demo's values, `GRADE` is ours over them.
