# Tone comparison, 3 November 2026

Serves DESIGN.md **Show, don't tell** and **Small and readable**. The owner's [Look decision](../proposals/boogle-2.md#look)
opens Neutral to comparison, not automatic replacement. This change is Local. `src/render/scene.ts` is untouched.

## Evidence and scope

This task permits local networking only. No fresh web research or remote inflight fetch was performed. The following
are existing repo research and installed source, not newly verified claims about other games or engine releases:

- [Sunshine look, section 5](sunshine-look.md#5-palette-and-tone-mapping) records Khronos Neutral's palette-preserving
  intent, highlight compression and source links. The installed Three.js `ToneMappingFunctions.js` confirms that
  Boogle's Neutral already uses this curve: adding “Khronos Neutral” would duplicate the baseline.
- [Stylized rendering research](stylized-rendering-on-a-budget.md) records Sable's authored palette, fog and day/night
  work. It does **not** establish Sable's exact tone curve. The useful lesson is to judge colour groupings and
  readability together; a generic filmic transform does not establish an art direction.
- [Sunshine look's engine comparison](sunshine-look.md#why-this-architecture-compared-with-standard-engines) and [Ultra Water](ultra-water.md) retain
  their linked Unity, Unreal and Godot documentation about compositing and render cost. Boogle's comparison stays
  within its existing linear-HDR output chain, with no second renderer or scene render. It does not introduce an
  engine-style general post-processing stack.
- Installed `three/src/nodes/display/ToneMappingFunctions.js` supplies ACES Filmic and Neutral. The water demo's
  AgX implementation moves unchanged into `src/render/tone.ts`, including its power 1.12 / saturation 1.3 look.
  “AgX” on these boards therefore means **water-demo AgX**, not stock Three.js AgX. Attribution remains in
  `public/THIRD_PARTY_NOTICES.md`.

## Numbered recommendations

1. Compare `tone=neutral|agx|agx-sat|aces` on each requested scene. ACES Filmic is a useful fourth candidate because
   it is already installed and offers a different shoulder/contrast response without a new implementation.
2. Reuse the water meter for **all four** curves: 32×32 log-luminance, 16 samples per texel, 1×1 adaptation with 256
   samples, clamped exposure 0.05–20; darkening rate 2.5/s, brightening 1/s. A 15-second warmup settles it.
3. Match middle grey rather than the whole image histogram, which would hide the curve's contrast. At input 0.18,
   Neutral at 1 maps to linear 0.14. Numerical evaluation of the installed equations gives trims Neutral 1,
   water AgX 0.771116, AgX-sat 0.771116, ACES 0.729587 for the same output luminance. Keep these constant across
   scenes. This matches one reference luminance, not every pixel. `tone=neutral` is **metered Neutral**, not an exact
   screenshot of the unflagged game's exposure 1 / night lift. Capture an unflagged reference separately.
4. For `agx-sat`, increase chroma around Rec.709 luminance by up to 30% in linear display colour, tapering the extra
   lift from luminance 0.45 to 0.9. Keep the white end unboosted; clamp out-of-gamut values. Inspect purple hue,
   green intensity and wood warmth, not saturation alone.
5. Change the curve before sRGB encoding, exactly once. Water retains the underwater HDR composite, vignette,
   dithering and resolution profile. The look lab applies the selected curve before its optional display-space
   effects and retains it when its panel rebuilds. Place GTAO supplies its existing HDR texture to the meter,
   avoiding a duplicate scene pass. An absent or invalid flag does not install the comparison.
6. Budget two added tiny draws on ordinary pages, no added full-screen pass; water already pays for both meter
   draws, so switching curves there adds none. The meter uses 16,384 HDR samples plus 256 reduction samples and
   one output exposure fetch per frame, a 16-byte history copy, about 8 KiB RGBA16F meter storage plus two RGBA32F
   texels (excluding allocation overhead). AgX's matrices, log/powers and polynomial cost ALU in the existing
   output draw; the saturation lift adds luma/mix/smoothstep ALU only. Use the existing GPU observer for actual
   pass counts; shared-Mac timing and screenshot FPS are not isolated performance benchmarks.
7. View boards in this order: home avatar, train/timber, crossing sea, water beach/avatar, sunset, night. Same
   camera per row; allow animated water/cloud differences between runs. Use the owner's one question: **Which
   version keeps the toys inviting while making the light look better?** The default remains the owner's call.

## Reproduction

`dev/look/evals/tone.ts` holds the camera, recolours the actual avatar purple, stages the real train and timber,
and uses the existing sunset/night evals. The train is parked for colour comparison; this is not a progression
playthrough. Through the job's broker, run `node .look/see-client.ts look --query 'classic=1&tone=agx-sat&toneShot=home'
--eval dev/look/evals/tone.ts --warm 15 --frames 2 --seconds 0.2`. Use `proto=place&toneShot=place`,
`proto=crossing&toneShot=crossing`, `proto=water&toneShot=beach`, or `classic=1&toneShot=home&toneTime=sunset|night`.
Optional `--action dev/look/evals/tone-cost.ts` with `prof=1` reports counts and bounded timing through the existing
observer. Boards use ffmpeg `hstack`, ordered Neutral / AgX / AgX-sat / ACES; source manifests stay beside them.

No prototype card: `test/protos.test.ts` governs `?proto=` playlist entries; this cross-page query is not a new chapter.
