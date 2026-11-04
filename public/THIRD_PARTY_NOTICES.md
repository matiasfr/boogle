# Third-party notices

Served with the game at `/THIRD_PARTY_NOTICES.md`. Scope: code adapted into Boogle from other projects. Dependencies carry their own licences in their packages.

## Ultra Water

- Source: https://github.com/Humpalumps/Ultra-Water, revision `30ea65ecb0a66b137aa200d099965634bdd84d51`
- Adapted in: `src/proto/water/` (`shore.ts` from `src/water/shoreMap.js`; `surface.ts`, `shore-nodes.ts` and `island.ts` from `src/water/OceanSurface.js` and `src/scene/terrain.js`; `spectrum.ts` and `fft.ts` from `src/water/OceanSim.js`; `foam.ts` from `src/water/bakeTextures.js`; `ground.ts` from `src/scene/terrain.js`; `caustics.ts` from `src/water/Caustics.js`; `atmosphere.ts` and `sky.ts` from `src/scene/atmosphere.js` and `src/scene/sky.js`; `post.ts` from the metered exposure and AgX in `src/engine/PostFX.js`; `spray.ts` from `src/water/Spray.js`; `underwater.ts` from `src/water/UnderwaterPass.js` and the lens droplets in `src/engine/PostFX.js`; `snow.ts` from `src/water/MarineSnow.js`; `height.ts` from `src/scene/islandHeight.js` and `src/scene/noise.js`; values in `tuning.ts`), rewritten in TypeScript and TSL.
- Copyright (c) 2026 Humpalumps
- Production bloom: `src/render/water/bloom.ts`, adapted from the six-level filter chain in `src/engine/PostFX.js`.
- MIT License

## Hash without Sine (Dave Hoskins)

- Source: https://www.shadertoy.com/view/4djSRW
- Used in: `src/proto/water/shore-nodes.ts` (`hash12`), `src/proto/water/foam.ts` (`hash22`), `src/proto/water/underwater.ts` and `post.ts` (`hash33`), `sky.ts` (cloud gradient hash), through Ultra Water
- Copyright (c) 2014 David Hoskins
- MIT License

## three.js

- Source: https://github.com/mrdoob/three.js
- The renderer of the whole game. The cloud layer in `src/proto/water/sky.ts` and AgX in `src/proto/water/post.ts` are adapted through Ultra Water from three.js's Sky and AgXToneMapping implementations (Filament/Blender AgX, iolite contrast approximation).
- Copyright (c) 2010-2026 three.js authors
- MIT License

## UnrealEngineSkyAtmosphere (Sebastien Hillaire)

- Source: https://github.com/sebh/UnrealEngineSkyAtmosphere
- Used in: `src/proto/water/atmosphere.ts`, through Ultra Water's Hillaire 2020 transmittance, multiple-scattering and sky-view LUT implementation, with Earth coefficients also following Bruneton 2017.
- Copyright (c) 2020 Epic Games, Inc.
- MIT License

## MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
