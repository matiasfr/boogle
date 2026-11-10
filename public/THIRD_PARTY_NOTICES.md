# Third-party notices

Served with the game at `/THIRD_PARTY_NOTICES.md`. Scope: code adapted into Boogle from other projects. Dependencies carry their own licences in their packages.

## Ultra Water

- Cove sand adaptation: `src/proto/place/cove-sand.ts` and the optional sand profile in `src/render/water/receivers.ts` adapt the damp pigment, sheen and warped sand ripples from `src/scene/terrain.js` at the revision below. They add no source assets.

- Source: https://github.com/Humpalumps/Ultra-Water, revision `30ea65ecb0a66b137aa200d099965634bdd84d51`
- Adapted in: `src/render/water/` (`receivers.ts`, the wet ground and its absorption tint, from `src/scene/terrain.js`; `atmosphere.ts` and `sky.ts` from `src/scene/atmosphere.js` and `src/scene/sky.js`; `post.ts` from the AgX in `src/engine/PostFX.js`; absorption values in `tuning.ts`), rewritten in TypeScript and TSL. The sea surface, swell, coast texture, caustic tile and underwater fog are Boogle's own (10 November 2026); the earlier adapted FFT sea, shore, spray, snow and underwater files were removed.
- Copyright (c) 2026 Humpalumps
- Production bloom: `src/render/water/bloom.ts`, adapted from the six-level filter chain in `src/engine/PostFX.js`.
- MIT License

## Hash without Sine (Dave Hoskins)

- Source: https://www.shadertoy.com/view/4djSRW
- Used in: `src/render/water/receivers.ts` (`hash12`), `src/render/water/art.ts` (`hash22`), `sky.ts` (cloud gradient hash), through Ultra Water
- Copyright (c) 2014 David Hoskins
- MIT License

## three.js

- Source: https://github.com/mrdoob/three.js
- The renderer of the whole game. The cloud layer in `src/render/water/sky.ts` and AgX in `src/render/water/post.ts` are adapted through Ultra Water from three.js's Sky and AgXToneMapping implementations (Filament/Blender AgX, iolite contrast approximation).
- Copyright (c) 2010-2026 three.js authors
- MIT License

## UnrealEngineSkyAtmosphere (Sebastien Hillaire)

- Source: https://github.com/sebh/UnrealEngineSkyAtmosphere
- Used in: `src/render/water/atmosphere.ts`, through Ultra Water's Hillaire 2020 transmittance, multiple-scattering and sky-view LUT implementation, with Earth coefficients also following Bruneton 2017.
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
