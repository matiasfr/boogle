# Engine mock-ups: the largest current-era engine and the end game

> **Status: mock-up, not decided (10 November 2026).** These are greybox renders for the owner's question "Can we also mock up what the largest engine size will be? and maybe a simple blocked out end game look?". Nothing here is built or chosen.

**How they were made.** There was no OpenAI key in the environment and Codex usage was out, so the painted concepts (`npm run concepts`) were not generated. Instead, a scratch Blender script (`.look/endgame/lineup.py`, gitignored) loads the real built `assets/built/engine.glb` and `buddy.glb` and adds box blockouts on a 1.0 m gauge track, with a Home-style halt deck (top 0.72 m, near edge 1.65 m from the track centre). The renders are in `.look/endgame/` and are not committed. Buddy shows in his bind pose (arms out).

## Dimensions assumed (metres, rail top = 0)

| Train | Length | Width | Height | Notes |
| --- | --- | --- | --- | --- |
| Today's engine A (built GLB) | 4.7 over buffers | 2.3 over steps | 3.3 cab roof | the reference |
| Largest current era | about 8.4 with tender (engine 5.0 plus plough, tender 2.8) | 2.4 | 3.4 | engine A with the longer boiler, Ring Island steel boiler bands, smokebox ring, plough and roof, a headlamp, and a red four-wheel tender with steel rails |
| End game, freight "Hauler" | 10.7 with plough | 2.4 | 3.5 | orange hood unit, full-width front cab, two three-axle bogies, cream stripe and nose chevrons |
| End game, high speed "Dart" | 11.0 | 2.3 | 3.1 (fin 3.45) | white wedge nose over 4 m, teal stripe, skirts over two two-axle bogies |
| End game, dystopian "Warden" | 14.0 with ram (3 × 4.2 m segments) | 2.4 (ribs 2.55) | 3.6 (stacks 4.1) | trapezoid gunmetal plated segments with ribs, amber slot lights, a sloped ram and a visor slit |

The widths stay within 2.4 to 2.55 m, so they clear the halt deck edge at 1.65 m. Heights above 3.1 m (1.5× today, the height Home's canopy and the gates were sized for) would need those structures rechecked; see `docs/plans/engine-previz.md`.

## Prompts for when an image route is available

- Style for every image: chunky flat-shaded low-poly toy world, bright saturated colours, soft daylight, narrow-gauge railway, a small round cyan character in a conductor's cap for scale, no text, no logos.
- (a) Today's small red tank engine next to its fully upgraded self: a longer boiler with brushed-steel bands, a steel smokebox ring and cow-catcher plough, a steel cab roof, a brass headlamp and a small red coal tender. Side-by-side three-quarter view on one track.
- (b1) An end-game heavy freight locomotive on the same narrow track: a chunky orange hood unit, a full-width cab with big windows, six-wheel bogies, a cream stripe and white nose chevrons, toy-like and friendly.
- (b2) An end-game high-speed train on the narrow track: a white wedge nose, a teal stripe, a wraparound canopy and side skirts. It reads fast but stays chunky and cute.
- (b3) An end-game dystopian industrial train on the narrow track: three brutalist gunmetal plated segments with raised ribs, amber slot lights, a sloped ram plough and a single visor slit. It is menacing but goofy, an original design that is not based on any game's train.
