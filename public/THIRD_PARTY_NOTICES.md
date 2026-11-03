# Third-party notices

Served with the game at `/THIRD_PARTY_NOTICES.md`. Scope: code adapted into Boogle from other projects. Dependencies carry their own licences in their packages.

## Ultra Water

- Source: https://github.com/Humpalumps/Ultra-Water, revision `30ea65ecb0a66b137aa200d099965634bdd84d51`
- Adapted in: `src/proto/water/` (`shore.ts` from `src/water/shoreMap.js`; `surface.ts`, `shore-nodes.ts` and `island.ts` from `src/water/OceanSurface.js` and `src/scene/terrain.js`; `spectrum.ts` from `src/water/OceanSim.js`; `foam.ts` from `src/water/bakeTextures.js`; `spray.ts` from `src/water/Spray.js`; `height.ts` from `src/scene/islandHeight.js` and `src/scene/noise.js`; values in `tuning.ts`), rewritten in TypeScript and TSL.
- Copyright (c) 2026 Humpalumps
- MIT License

## Hash without Sine (Dave Hoskins)

- Source: https://www.shadertoy.com/view/4djSRW
- Used in: `src/proto/water/shore-nodes.ts` (`hash12`), `src/proto/water/foam.ts` (`hash22`), through Ultra Water
- Copyright (c) 2014 David Hoskins
- MIT License

## three.js

- Source: https://github.com/mrdoob/three.js
- The renderer of the whole game. Ultra Water's own three.js-derived code (its cloud layer and AgX) is not adapted here so far.
- Copyright (c) 2010-2026 three.js authors
- MIT License

## Not adapted so far

Ultra Water's atmosphere follows Sebastien Hillaire's UnrealEngineSkyAtmosphere, Copyright (c) 2020 Epic Games, Inc., MIT License. Boogle has not taken it. Add its entry here if it comes over.

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
