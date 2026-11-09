# Graphics switches: Mac observations

> **Verdict:** Mac measurements of graphics switch costs; MSAA and lab grass largest.
> **Top recommendations:** none; measurements only, no proposals.
> **Status:** reference. See [plan graphics-switches](../plans/graphics-switches.md).

## Mac verification — 4 November 2026

**Partial sign-off: the gable gap is real; the native Looks PNGs do not reproduce severe posterization. Sunny’s blotchy grass is real surface shading. MSAA and lab grass are the largest clearly resolved costs.** Shadows and bloom now have visible on/off evidence; spray and active point-light removal remain unverified. No game code changed.

Tested production build `88a7b8e5d894fdf67f1743d614586669ed7d9840`, tree `7d57970cd29f4498fdde06c970ec710127dd961c` (main at the start), on **Apple M1 Max**, Darwin 27, Chromium 156 / Apple Metal WebGPU, non-fallback adapter. All runs used this worktree and the existing broker. Every completed manifest records unchanged source during its run. This report-only commit changes the final tree fingerprint; the game/build inputs are unchanged. Earlier sections below are historical.

**Since fixed:** the gable gap (#861) and the production `--curves` and bot failures (#862). The findings below describe the build tested. Spray, active point lights and the startup stalls remain open.

### Contention and method

Before measuring, process inspection found idle Vite/broker processes and no competing Chromium capture. Other local jobs then started: `call-feedback` playthrough and `coop-route` two-player captures, plus short Chromium jobs. No other cold-start job was observed. I waited for the competing renderer to exit and reran the shore sweep; contention returned during that retry and town/MSAA sampling. A later snapshot contained only this job’s renderer. Thus contention was intermittent and **did not stay clear through the full sweeps**; other jobs were left alone.

1440×900, DPR 1, Current look, locked exposure, fixed camera, default graphics except the tested switch. Shore: camera `(770,10,110)` → `(850,0,90)`; town: `(910,28,38)` → `(885,21,10)`, FOV 62. Each live switch used **three warmed ABBA measurements**, preparing both variants and continuously rendering through at least one second of warm-up per state, then one-second sample windows. The original town shadow measurement could overlap construction; the table replaces it with three measurements after all construction settled. MSAA used three matched four-sample/one-sample reload pairs per view, two seconds of additional settling and five-second measurements. Lab grass/post used three ABBA repetitions on `proto=look&look=ipad&water=old`.

Tables show **median [minimum, maximum] of the three window means**, in milliseconds. Δ is the median of paired on-minus-off results, not subtraction of independently sorted medians. Live results are unresolved unless every paired delta exceeds both 0.10 ms and the largest same-state drift within its ABBA repetitions. MSAA reload spread is a separate, weaker control. GPU spans include the frame’s timestamped render/compute extent; missing span samples were zero. These are observations, **not a budget**, and an unresolved or negative delta does not establish free work.

#### Shore GPU span

| Switch   | On, ms               | Off, ms              | Paired Δ, ms        | Verdict           |
| -------- | -------------------- | -------------------- | ------------------- | ----------------- |
| shadows  | 11.34 [10.39, 11.57] | 10.81 [9.67, 10.89]  | 0.68 [0.52, 0.72]   | Unresolved: noise |
| msaa     | 10.98 [10.05, 11.01] | 9.59 [9.37, 9.89]    | 1.39 [0.15, 1.65]   | Unresolved: noise |
| caustics | 10.92 [10.64, 11.45] | 11.28 [10.52, 11.99] | -0.36 [-0.54, 0.11] | Unresolved: noise |
| spray    | 10.61 [9.21, 11.07]  | 10.78 [8.77, 11.40]  | -0.17 [-0.33, 0.44] | Unresolved: noise |
| snow     | 10.83 [10.50, 11.37] | 10.78 [10.49, 11.42] | 0.01 [-0.04, 0.05]  | Unresolved: noise |
| shafts   | 10.89 [9.83, 11.79]  | 10.92 [9.50, 11.52]  | 0.27 [-0.03, 0.33]  | Unresolved: noise |
| lens     | 10.77 [9.74, 11.69]  | 10.70 [8.95, 10.93]  | 0.76 [0.07, 0.79]   | Unresolved: noise |
| bloom    | 11.27 [9.89, 11.69]  | 10.89 [9.86, 11.01]  | 0.38 [0.03, 0.68]   | Unresolved: noise |
| meter    | 9.67 [9.26, 11.36]   | 9.76 [9.41, 10.71]   | -0.09 [-0.16, 0.65] | Unresolved: noise |
| lights   | 9.51 [8.26, 11.92]   | 9.44 [6.95, 10.62]   | 1.31 [0.08, 1.31]   | Unresolved: noise |

#### Town GPU span

| Switch   | On, ms              | Off, ms           | Paired Δ, ms         | Verdict                   |
| -------- | ------------------- | ----------------- | -------------------- | ------------------------- |
| shadows  | 9.73 [9.70, 9.93]   | 9.30 [9.28, 9.36] | 0.42 [0.37, 0.63]    | Resolved in these samples |
| msaa     | 9.67 [9.63, 9.84]   | 7.07 [6.79, 7.31] | 2.60 [2.32, 3.05]    | Resolved in these samples |
| caustics | 9.54 [7.83, 9.88]   | 9.45 [8.32, 9.67] | 0.09 [-0.49, 0.21]   | Unresolved: noise         |
| spray    | 9.80 [8.64, 9.88]   | 9.40 [8.61, 9.78] | 0.10 [0.02, 0.39]    | Unresolved: noise         |
| snow     | 9.20 [9.00, 9.84]   | 9.55 [8.48, 9.74] | 0.09 [-0.35, 0.51]   | Unresolved: noise         |
| shafts   | 8.27 [7.61, 9.89]   | 8.73 [7.95, 9.95] | -0.34 [-0.46, -0.06] | Unresolved: noise         |
| lens     | 9.60 [6.92, 9.79]   | 9.74 [7.31, 9.89] | -0.29 [-0.39, 0.05]  | Unresolved: noise         |
| bloom    | 10.43 [7.64, 10.54] | 9.77 [7.57, 9.87] | 0.66 [0.07, 0.67]    | Unresolved: noise         |
| meter    | 9.57 [7.49, 9.72]   | 9.40 [7.42, 9.60] | 0.12 [0.07, 0.17]    | Unresolved: noise         |
| lights   | 9.23 [7.68, 9.75]   | 8.96 [7.38, 9.37] | 0.29 [0.27, 0.38]    | Unresolved: noise         |

#### Lab GPU span

| Switch      | On, ms            | Off, ms           | Paired Δ, ms      | Verdict                   |
| ----------- | ----------------- | ----------------- | ----------------- | ------------------------- |
| foliage     | 2.91 [2.90, 3.09] | 1.40 [1.38, 1.48] | 1.50 [1.43, 1.71] | Resolved in these samples |
| lab-effects | 3.07 [2.89, 3.11] | 2.87 [2.87, 3.06] | 0.02 [0.01, 0.25] | Unresolved: noise         |

Lab owners are absent on place, so their shore/town cells are not applicable. Conversely, these above-water shore/town samples do not establish underwater snow/shaft/lens cost. Point-light intensities were both zero on place. The resolved town shadow Δ is 0.42 ms (same-state drift ≤0.13 ms); lab grass is 1.50 ms (drift ≤0.19 ms). Town MSAA is 2.60 ms, versus 0.21/0.52 ms on/off reload ranges. Bloom’s 0.66 ms town median is still unresolved because one repeat was only 0.07 ms.

**Total frame interval:** approximately 16.666 ms throughout these warmed captures (headless callback cadence, not physical presentation). Place median CPU window times were approximately 3.97–4.87 ms; lab approximately 2.29–2.63 ms. CPU submission and GPU execution overlap; do not add them. Cold/transition stalls are reported separately.

Raw samples and settings: [initial shore](../../.look/evidence/1793812600075-44510/evidence.json), [shore retry](../../.look/evidence/1793812904585-48484/evidence.json), [town](../../.look/evidence/1793813223419-57942/evidence.json), [settled shadows](../../.look/evidence/1793815003416-86138/evidence.json), [lab](../../.look/evidence/1793815235856-89537/evidence.json). All twelve MSAA manifests and derived ranges are indexed in [measurement data](../../.look/evidence/1793812600075-44510/mac-review/summary.json).

### Switch appearance and baseline

Question: does the named effect disappear at a fixed camera and return to baseline? The following images were actually opened. Standard sheets show on at 0 s, off at 5.3 s, restored baseline at 10.7/16 s. Waves/residents advance, so these are not pixel-identical whole-scene comparisons. Bloom’s baseline is off. All completed switch captures passed WebGPU/advancing-frame checks without page or console errors. All 23 inspected reset snapshots matched the available owners’ requested/effective baselines.

| Switch      | Observation                                                                                                                                                                   | Opened evidence                                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shadows     | Player shadow disappears and returns. The shadow frustum follows the player; the detached town camera alone missed it.                                                        | [PNG](../../.look/evidence/1793814216616-73003/mac-switch-shadows-motion.png) · [manifest](../../.look/evidence/1793814216616-73003/evidence.json)     |
| MSAA        | Single-sample roof/tree edges are visibly rougher; scene remains intact. Baseline reset clears the URL override, honestly stays pending, then reload restores four samples.   | [PNG](../../.look/evidence/1793815071204-88151/mac-msaa-native-off-still.png) · [manifest](../../.look/evidence/1793815071204-88151/evidence.json)     |
| Caustics    | Bright floor lace disappears to flat illumination and returns.                                                                                                                | [PNG](../../.look/evidence/1793814272712-73962/mac-switch-caustics-motion.png) · [manifest](../../.look/evidence/1793814272712-73962/evidence.json)    |
| Spray       | Unresolved. Closer shore stills and consecutive recorded frames show a thin foam line, but no confidently separable airborne spray change. Do not count foam as a spray pass. | [PNG](../../.look/evidence/1793815543216-91556/mac-final-spray-motion.png) · [manifest](../../.look/evidence/1793815543216-91556/evidence.json)        |
| Snow        | Faint underwater flecks disappear off and return.                                                                                                                             | [PNG](../../.look/evidence/1793815116911-88657/mac-second-snow-motion.png) · [manifest](../../.look/evidence/1793815116911-88657/evidence.json)        |
| Shafts      | Underwater medium becomes darker off and brighter after reset; distinct rays remain hard to resolve.                                                                          | [PNG](../../.look/evidence/1793815146582-88861/mac-second-shafts-motion.png) · [manifest](../../.look/evidence/1793815146582-88861/evidence.json)      |
| Lens        | Droplets disappear off and return after reset plus a fresh dunk. Compare 0 / 7.2 / 14.4 s at the same emerged camera; 10.8 s is the deliberate dunk.                          | [PNG](../../.look/evidence/1793815629708-92126/mac-lens-restored-motion.png) · [manifest](../../.look/evidence/1793815629708-92126/evidence.json)      |
| Bloom       | Subtle but real broader sun halo on; off and reset are narrower. Daylight town/stars were insufficiently discriminating.                                                      | [PNG](../../.look/evidence/1793815572871-91752/mac-final-bloom-motion.png) · [manifest](../../.look/evidence/1793815572871-91752/evidence.json)        |
| Meter       | Steady-view stills stay stable as expected. GPU gain remains exactly held through a large reframe while disabled, then adapts after reset; see readbacks below.               | [PNG](../../.look/evidence/1793814486585-78517/mac-switch-meter-motion.png) · [manifest](../../.look/evidence/1793814486585-78517/evidence.json)       |
| Lights      | No visible change; both pooled PointLights have intensity 0 at the origin on place. No active source owner here, so visible light removal is unverified.                      | [PNG](../../.look/evidence/1793814522807-78821/mac-switch-lights-motion.png) · [manifest](../../.look/evidence/1793814522807-78821/evidence.json)      |
| Foliage     | Lab grass disappears and returns; trees/terrain stay.                                                                                                                         | [PNG](../../.look/evidence/1793814579425-79864/mac-switch-foliage-motion.png) · [manifest](../../.look/evidence/1793814579425-79864/evidence.json)     |
| Lab effects | Subtle contrast/colour change with geometry intact; baseline returns.                                                                                                         | [PNG](../../.look/evidence/1793814611043-80822/mac-switch-lab-effects-motion.png) · [manifest](../../.look/evidence/1793814611043-80822/evidence.json) |

MSAA comparison uses the four-sample Current town PNG below; [PNG](../../.look/evidence/1793815601603-91938/mac-msaa-restore-still.png) · [manifest](../../.look/evidence/1793815601603-91938/evidence.json) shows the restored Graphics dock. Bloom also has opened native [on](../../.look/evidence/1793815572871-91752/mac-final-bloom-still.png) / [off](../../.look/evidence/1793815785173-93692/mac-bloom-native-off-matched-still.png) PNGs and unamplified sun crops. In the same-run static sky crop, on-minus-off is 0–8 RGB code values (mean 0.59); reset-versus-off is exactly zero. [Crop arithmetic](../../.look/evidence/1793815572871-91752/sun-difference.json) supports the subtle visual judgment; it is not a GPU measurement.

### Looks, grass, banding and stars

All fifteen native PNGs linked here were opened: five looks at both requested views, plus the actual knockdown stars. Sky gradients look smooth at native capture size; the conspicuously posterized-board appearance does **not** reproduce. Sand’s broad triangular facets and strata are real geometry/shading. This does not rule out fine 8-bit quantization or prove the cause of an unavailable original board.

Sunny’s grass blotches **are in the game**, also present in Current/Clean at the same locations. `src/proto/place/look.ts:53–106` combines slow/mid/fine sine tint and dry-patch modulation over vertex colour; Sunny’s smooth 8% midtone chroma lift (`src/render/water/looks.ts:195–218`) makes that pattern more noticeable. It is not a capture artifact or a posterization operation. Clean/Sunshine give warmer, lighter sand and cream walls; Punchy darkens the scene. No look is selected for shipping.

| Look           | Shore native                                                                                                                                              | Town native                                                                                                                                              | Knockdown stars native                                                                                                                            |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current        | [PNG](../../.look/evidence/1793813541486-65022/mac-looks-shore-current-0-still.png) · [manifest](../../.look/evidence/1793813541486-65022/evidence.json)  | [PNG](../../.look/evidence/1793813624490-66795/mac-looks-town-current-0-still.png) · [manifest](../../.look/evidence/1793813624490-66795/evidence.json)  | [PNG](../../.look/evidence/1793815306285-89789/mac-stars-current-still.png) · [manifest](../../.look/evidence/1793815306285-89789/evidence.json)  |
| Clean toys     | [PNG](../../.look/evidence/1793813558378-65470/mac-looks-shore-clean-1-still.png) · [manifest](../../.look/evidence/1793813558378-65470/evidence.json)    | [PNG](../../.look/evidence/1793813661591-67208/mac-looks-town-clean-1-still.png) · [manifest](../../.look/evidence/1793813661591-67208/evidence.json)    | [PNG](../../.look/evidence/1793815322028-89977/mac-stars-clean-still.png) · [manifest](../../.look/evidence/1793815322028-89977/evidence.json)    |
| Sunny toys     | [PNG](../../.look/evidence/1793813574847-65914/mac-looks-shore-sunny-2-still.png) · [manifest](../../.look/evidence/1793813574847-65914/evidence.json)    | [PNG](../../.look/evidence/1793813699322-67408/mac-looks-town-sunny-2-still.png) · [manifest](../../.look/evidence/1793813699322-67408/evidence.json)    | [PNG](../../.look/evidence/1793815337831-90156/mac-stars-sunny-still.png) · [manifest](../../.look/evidence/1793815337831-90156/evidence.json)    |
| AgX Punchy     | [PNG](../../.look/evidence/1793813591271-66123/mac-looks-shore-punchy-3-still.png) · [manifest](../../.look/evidence/1793813591271-66123/evidence.json)   | [PNG](../../.look/evidence/1793813736966-67696/mac-looks-town-punchy-3-still.png) · [manifest](../../.look/evidence/1793813736966-67696/evidence.json)   | [PNG](../../.look/evidence/1793815353606-90343/mac-stars-punchy-still.png) · [manifest](../../.look/evidence/1793815353606-90343/evidence.json)   |
| Sunshine water | [PNG](../../.look/evidence/1793813608122-66587/mac-looks-shore-sunshine-4-still.png) · [manifest](../../.look/evidence/1793813608122-66587/evidence.json) | [PNG](../../.look/evidence/1793813774758-68652/mac-looks-town-sunshine-4-still.png) · [manifest](../../.look/evidence/1793813774758-68652/evidence.json) | [PNG](../../.look/evidence/1793815369424-90524/mac-stars-sunshine-still.png) · [manifest](../../.look/evidence/1793815369424-90524/evidence.json) |

Stars are readable gold with a darker outline, brighter under Clean/Sunshine and more muted under Punchy; no blown-out white blobs. This is the real local knockdown pose held for capture, not a collision-trigger test or a pre-fix brightness comparison. Current source uses an sRGB texture and linear feedback gain 6 on new water.

A/B Clean ↔ Sunny and saved Clean / A=Clean / B=Sunny / exposure lock survived an actual child-page reload at both views: [PNG](../../.look/evidence/1793814838314-82761/mac-reload-shore-still.png) · [manifest](../../.look/evidence/1793814838314-82761/evidence.json); [PNG](../../.look/evidence/1793814867975-83546/mac-reload-town-still.png) · [manifest](../../.look/evidence/1793814867975-83546/evidence.json). The broker owns the top-level route, so reload/default/character checks used visible same-origin child pages; their own readiness and advancing frames were asserted.

Fresh GPU meter readback after three seconds at a different sky framing: shore **0.112349 → 0.112349 locked → 0.112349 meter-off → 0.437162 restored/adaptive**; town **0.093138 → 0.093138 → 0.093138 → 0.433147**. [Shore readback](../../.look/evidence/1793815384884-90703/evidence.json) and [town readback](../../.look/evidence/1793815410928-90890/evidence.json). Their restored-scene native stills were also opened.

### Production regressions, failures and limits

- **Default Dev off passes:** bare default route with `dev=0`, secure loopback production context, no dock/API or lazy Dev menu/Graphics/Looks/Perf chunks, 60 advancing frames in one second. Small normal graphics-registry/preferences and gameplay camera modules remain expected. [PNG](../../.look/evidence/1793815512086-91362/mac-default-final-still.png) · [manifest](../../.look/evidence/1793815512086-91362/evidence.json). This is HTTPS-equivalent secure-context behavior, not a deployed TLS/CDN test.
- **Gable defect reproduced:** [PNG](../../.look/evidence/1793814939631-85418/mac-character-still.png) · [manifest](../../.look/evidence/1793814939631-85418/evidence.json) versus [PNG](../../.look/evidence/1793814964884-85824/mac-gable-world-still.png) · [manifest](../../.look/evidence/1793814964884-85824/evidence.json). Both show open stepped gaps under the roof, through which the background is visible. The asset example and placed cottage share `housePlan`; their dimensions/materials differ. The three rectangular gable strips at `src/proto/place/building-plans.ts:158–164` do not meet the sloped roof continuously. No geometry fix attempted.
- **No-freeze sign-off fails:** the requested one cold/warm pair loaded in **12.751 / 9.420 s**, with longest post-visibility intervals **316.7 / 267.1 ms**, zero graphics/page health errors and no pipelines pending at reveal. One cold 258.7 ms interval overlaps 222 ms of pointer-triggered audio initialization; the other stall is not causally attributed to graphics. [Cold-start manifest](../../.look/evidence/1793814642650-81007/evidence.json), [report](../../.look/evidence/1793814642650-81007/report.json). Opened cold ready/loading and cold/warm 30-second PNGs. The tool used exclusive nonempty Metal-cache clears/writes, but exits **2**, `trueCold:false`, `measurable:false`: its proof rule requires three or more pairs. One pair is a startup observation, not verified cache-effect proof or a physical-display freeze verdict.
- **Production harness failures:** `--curves` requests `/src/player/player.ts` ([failure](../../.look/evidence/1793815105368-88455/evidence.json)); the production playthrough requests `/src/render/scene.ts` ([failure](../../.look/evidence/1793815670178-92349/evidence.json)). Both imports fail on the production server before useful curves/bot progress. The bot log was read; no report, end still or saves were produced. No expected beats were verified. No new scenario harness or game-code workaround was added.
- Two default-page assertions falsely classified normal modules as Dev chunks; corrected filename matching produced the passing capture above. Initial classic-island shore framing, an extra daytime sky shot intended as night, and one mismatched bloom-off camera were rejected, not used as visual evidence. `look --at list` found no usable latest checkpoint index in this worktree.
- Spray video succeeded without the broken curves option. Opened its sheet and extracted consecutive `spray-on-01/02.png`, plus `spray-off-01.png` and `spray-reset-01.png`, beside the [video manifest](../../.look/evidence/1793815543216-91556/evidence.json). Real-time feel/smoothness, active place point lights, visible spray removal, isolated full-sweep timing, Safari/mobile, and a production bot pass remain unverified.
- **Checks:** `npx prettier --write --ignore-path /dev/null` and `npm run check` passed: lint, typecheck, **298/298 tests**, registries, level/assets checks and production build. The ignore override formats the requested Markdown despite the repository’s Markdown exclusion. [Check log](../../.look/evidence/1793812600075-44510/mac-review/check.log). No new tests; only this research document is committed.
- **Departure:** the early required `npm run inflight` command fetched GitHub despite the local-network-only instruction. This was disclosed and not repeated. All browser work thereafter used the local broker. No push, ship, upload or game-code change.

The remaining work is owner review of the visual evidence and a separately scoped fix for the gable/startup findings; no default or graphics preset is approved by these numbers.

---

## Follow-up: baseline restore and Looks merge

The reported reset bug is fixed in `705d270d`: restore reaches every registered owner, including one whose
effect is temporarily absent. Direct edits to unavailable effects remain rejected. The focused registry
test reproduced both stranded flags before the change and passes afterward, without rendering or DOM.

`07e98363` merges fetched `origin/main` at `88eae7a3`. The conflicts retain both Dev preference keys/URL flags,
the exposure meter's readback and work-skipping controls, and both Graphics adapters at the water post owner.
Explicit Graphics bloom overrides survive Looks selection. Looks preparation rebuilds both output variants,
so a saved bloom-on choice uses Neutral/AgX comparison correctly from startup. Meter-off remains independent
of Looks exposure lock. Main's Node 26 toolchain is retained; private dependencies were refreshed **offline**.

Fresh evidence below supersedes earlier integration evidence. All runs tested tree
`dc7a8d20327ea35c763914da0f5b745231003a80`, exactly matching the merge commit's tree; every manifest records
`changedDuringRun: false`. Subsequent edits are documentation only. **The cost table below was not rerun**
on the busy Mac and remains historical, not a measurement of this merged build.

- `npm run check`: **298 tests passed**, lint/typecheck/registry/level/assets/build passed. [Fresh log](../../.look/graphics-followup-check.log).
- **55 paired switch checks**, using executed context counts and effective/requested settings, not timing:
  all five Looks with shadows, caustics, spray, snow, shafts, lens, bloom, meter and lights at 4× MSAA;
  all five Looks with bloom/meter at 1× MSAA. Resolution/cap commands and lock → meter off → on → unlock
  also ran for every look. Bloom removed 12 render contexts and meter-off removed two, including both
  Neutral looks. Foliage/lab effects remain route-specific and were checked in the lab separately.
- **Real reload:** saved Clean toys (Neutral), bloom on and meter off returned with matching requested/effective
  settings and 17 executed render contexts. This exercises bloom creation before Looks preparation.
- **One place bot invocation:** passed every expected beat, no errors; 24 game minutes in 3m35s at 7×,
  77 checkpoints. [Report](../../.look/evidence/1793783953096-59779/run/report.txt),
  [manifest](../../.look/evidence/1793783953096-59779/evidence.json). No failed follow-up bot or capture runs.

The following PNGs were actually opened. Capture success establishes WebGPU execution and no graphics
errors; the observations are separate visual judgments, not look approval or proof of smoothness.

| Opened image                                                                                                | Observation                                                                                                                                                                                                           | Fresh manifest                                                     |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [Lab reset sheet](../../.look/evidence/1793783804942-56349/graphics-followup-lab-motion.png)                | Grass present → absent → restored after resetting while Today makes grass/post unavailable, then returning to iPad. Post contrast returns; trees and rocks remain. Both internal flags assert true while unavailable. | [manifest](../../.look/evidence/1793783804942-56349/evidence.json) |
| [Current sheet](../../.look/evidence/1793783828685-57303/graphics-followup-current-motion.png)              | Normal shoreline remains drawn through bloom/meter off/on.                                                                                                                                                            | [manifest](../../.look/evidence/1793783828685-57303/evidence.json) |
| [Clean toys sheet](../../.look/evidence/1793783868512-57700/graphics-followup-clean-motion.png)             | Lighter Neutral sand and intact water/scene through toggles.                                                                                                                                                          | [manifest](../../.look/evidence/1793783868512-57700/evidence.json) |
| [Sunny toys sheet](../../.look/evidence/1793783941244-59364/graphics-followup-sunny-motion.png)             | Sunny grade remains; no blank or broken output after toggles.                                                                                                                                                         | [manifest](../../.look/evidence/1793783941244-59364/evidence.json) |
| [Punchy sheet](../../.look/evidence/1793784003342-60530/graphics-followup-punchy-motion.png)                | Darker, stronger contrast remains through toggles.                                                                                                                                                                    | [manifest](../../.look/evidence/1793784003342-60530/evidence.json) |
| [Sunshine water sheet](../../.look/evidence/1793784279746-62386/graphics-followup-sunshine-motion.png)      | Neutral sand and brighter turquoise water remain intact.                                                                                                                                                              | [manifest](../../.look/evidence/1793784279746-62386/evidence.json) |
| [MSAA-off sheet](../../.look/evidence/1793783905522-58569/graphics-followup-msaa-off-motion.png)            | Sunshine water remains drawn with one scene sample; all five look checks precede this final view.                                                                                                                     | [manifest](../../.look/evidence/1793783905522-58569/evidence.json) |
| [Saved Neutral reload still](../../.look/evidence/1793783829839-57387/graphics-followup-reloaded-still.png) | Both tool tabs present, Clean toys selected, bright intact scene with the saved bloom/meter state.                                                                                                                    | [manifest](../../.look/evidence/1793783829839-57387/evidence.json) |
| [Bot end still](../../.look/evidence/1793783953096-59779/run/end-still.png)                                 | Player and built structures remain rendered; report confirms progression.                                                                                                                                             | [manifest](../../.look/evidence/1793783953096-59779/evidence.json) |

Remaining limits: bloom's daylight visual difference is subtle even though its work removal is asserted.
These sheets do not establish mobile behavior, real-time smoothness, every effect's visual quality, or new
isolated performance costs. The lab Graphics panel can retain an old availability caption after an external
preset change until reopened; this is a display-refresh limitation, separate from the repaired internal
setting. No push or ship; no new network departure in this follow-up (only the requested main fetch).

## Original cost observations (before the follow-up merge)

4 November 2026. Build-order steps 1–2 are implemented on `codex/graphics-switches` and committed for owner review; nothing was pushed or shipped. The Local registry, single resolution/cap owner and lazy Graphics dock panel are working. These measurements are **contended observations**, not isolated feature costs or an approved low look. Some visual effects remain unverified in the captured views.

## Results

Apple M1 Max, hardware WebGPU (`apple`, `metal-3`, `isFallbackAdapter: false`), Chromium 156 broker, 1440×900 canvas and scene pixels, DPR 1, place with new water. Other browser jobs were active on this Mac. Every row is labelled **contended** and was repeated. GPU numbers are the per-frame **earliest start to latest end span**, including intervening gaps, never summed pass timers. CPU is main-thread frame work/submission. Neither is display latency, and CPU and GPU must not be added.

Values below are **on minus off**, milliseconds. A/B are repeated observations. Small or negative differences do not establish a saving or regression. No total is meaningful across these different poses and sessions.

| Switch              | CPU Δ A / B (ms) | GPU span Δ A / B (ms) | Work-count evidence, on → off (B)                          | Interpretation                                                     |
| ------------------- | ---------------: | --------------------: | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Shadows             |    +0.39 / +0.56 |         +1.62 / +1.60 | 7 → 6 render contexts                                      | Consistent measurable difference in these runs                     |
| Scene MSAA, 4× / 1× |    +0.12 / +0.33 |         +2.02 / +0.97 | Actual scene sample count 4 → 1; caustics samples retained | Separate reload pairs; substantial drift                           |
| Caustics producer   |    +0.27 / −0.14 |         −0.13 / −0.10 | 7 → 5 contexts; three producer draws removed               | Removal verified; timing difference buried in contention           |
| Spray               |    −0.12 / −0.13 |         +0.28 / +0.40 | 7 → 7; shared particle pool retained                       | Scan/emission switch; visible spray not established                |
| Underwater snow     |    +0.34 / −0.03 |         +0.84 / −0.39 | 8 → 8; sprite draw is within scene context                 | Timing sign changes                                                |
| Shafts              |    −0.13 / −0.12 |         −0.42 / +0.24 | 8 → 7                                                      | Timing sign changes                                                |
| Wet lens            |    +0.15 / −0.19 |         −0.06 / −0.03 | 8 → 8; shared boundary compute retained                    | Deep-water timing pose does not establish wet-surface droplet cost |
| Bloom               |    +0.57 / −0.13 |         −0.50 / +0.58 | 19 → 7                                                     | Twelve contexts removed; timing sign changes                       |
| Exposure meter      |    +0.12 / +0.23 |         +0.34 / +0.26 | 7 → 5, plus history copy skipped                           | Consistent small difference; exposure held                         |
| Point lights        |    +0.13 / −0.27 |         +0.09 / −0.18 | 7 → 7; selection/membership skipped                        | Daylight view; active illuminated pixels not established           |
| Foliage             |      unavailable |           unavailable | Owner absent from place                                    | Existing lab grass only; never loads lab onto place                |
| Lab effects         |      unavailable |           unavailable | Owner absent from place                                    | Existing lab post only; never installs another place post owner    |

Frame-interval means were approximately **16.666 ms** throughout, with on/off differences below **0.001 ms** for all measured switches. This is the headless broker's callback cadence for completed renders, not proof of 60 fps on a display. All accepted sample windows had complete GPU span coverage (zero missing timestamps). Unsupported, stale or partially covered timestamps report **unavailable**, never zero. The failed preliminary sweep is excluded.

### Final-tree on/off means

B is the final source tree. Means below preserve the CPU/GPU distinction and make the deltas reviewable; full snapshots include every frame, render/compute spans, settings, pixels, route and camera.

| Switch      | CPU on / off (ms) | GPU span on / off (ms) |
| ----------- | ----------------: | ---------------------: |
| Shadows     |     5.141 / 4.580 |          9.445 / 7.842 |
| Caustics    |     4.869 / 5.008 |          9.345 / 9.445 |
| Spray       |     4.801 / 4.931 |        10.574 / 10.177 |
| Snow        |     4.460 / 4.486 |          7.393 / 7.785 |
| Shafts      |     4.543 / 4.660 |          7.568 / 7.333 |
| Lens        |     4.310 / 4.502 |          8.089 / 8.115 |
| Bloom       |     5.061 / 5.192 |        11.235 / 10.653 |
| Meter       |     4.874 / 4.639 |        11.213 / 10.954 |
| Lights      |     4.823 / 5.097 |          8.639 / 8.818 |
| MSAA pair A |     4.674 / 4.554 |         11.575 / 9.552 |
| MSAA pair B |     5.704 / 5.377 |          7.949 / 6.975 |

## Method and provenance

Graphics **Measure on/off** uses `src/debug/dev/performance.ts` and the existing `hardwareTiming` path. It temporarily fixes full route resolution and Display cadence, prepares both variants, then collects **on/off/off/on**, each with at least two seconds of continuously advancing rendered frames and a three-second sample. Delayed warm-up polls reset the stability period; a blocked pipeline cannot consume the whole warm-up as idle wall time. Route, camera, pixels and unrelated settings must match. Controls are locked, invalid samples have no deltas, and `finally` restores the previous overrides.

The button copies a JSON snapshot; the broker denied clipboard access, so the selectable-text fallback was exercised and the same JSON was recorded in each `output.txt`. OS clipboard contents were not independently verified.

- [Sweep A manifest](../../.look/evidence/1793781017507-47256/evidence.json), [raw snapshots](../../.look/evidence/1793781017507-47256/output.txt): healthy preliminary repeat, before the final warm-up poll-gap guard and scene-sample inheritance compatibility adjustment. Retained for drift comparison, not final-tree certification.
- [Sweep B manifest](../../.look/evidence/1793781368678-62848/evidence.json), [raw snapshots](../../.look/evidence/1793781368678-62848/output.txt): final source commit `ea476b5eb2c0dee405a5fa471f5bcfe79e2dcf79`, tree `2d2283fd9e2cd6a9fd34b7355db6c3d27c8a137b`. Its own ABBA run repeats both states. No source changed during any accepted run. Later commits add documentation only.
- Shore pose: camera `(770,10,110)`, looking at `(850,0,90)`, FOV 62. Snow/shafts/lens timing pose: `(850,-2,90)` looking at `(880,-2,90)`. The sea, day clock and residents continue moving; matching camera does not freeze scene time.
- MSAA requires reload. Four fresh pages used `graphicsMsaa=1/0/0/1` in that order with the shore pose, four seconds of warm-up and two three-second windows per page. Weighted means use sample counts. Manifests: [on 1](../../.look/evidence/1793781681162-75916/evidence.json), [off 2](../../.look/evidence/1793781776130-78173/evidence.json), [off 3](../../.look/evidence/1793781822705-79992/evidence.json), [on 4](../../.look/evidence/1793782116980-88965/evidence.json). Disposable Dev room IDs differ between reloads; scene route/pose/pixels and settings match apart from MSAA. These pairs are more exposed to temporal contention than the live ABBA samples.

The profiler observes existing timestamp buffers, deduplicates frame IDs, rejects non-advancing stale query ranges and requires full render/compute context coverage. It adds no draw, query or fence. Spans include gaps and competing queue work; this is why contention cannot be subtracted out by arithmetic. Headless hardware rendering is confirmed, but physical occlusion, actual presentation, thermal isolation and device exclusivity are not.

## What each switch removes

Every switch below removes named work; **none is a strength-zero substitute**. Allocated resources may remain so restoring the baseline is cheap. Modes and hitch caveats appear in each panel row.

| Switch      | Mode    | Actual removal and retained work                                                                                                                                                         |
| ----------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shadows     | rebuild | Sun shadow draw and receiver shadow sampling; sunlight/day clock retained. Shadow-key material variants can hitch.                                                                       |
| MSAA        | reload  | Single scene sample instead of four; independent caustics MSAA retained. Renderer/backend sample inheritance remains authoritative. Reload compiles sample-count pipelines.              |
| Caustics    | live    | Clear to flat illumination once, then skip recurring producer draws and mip work. Receiver sample remains.                                                                               |
| Spray       | live    | Skip optional shore/rock emitter preparation, scans and emissions. Existing drops drain; impact cues/shared particles stay. Enabling after off-at-start can defer first-use preparation. |
| Snow        | live    | Hide 6000 sprites and skip projection update. Water volume/boundary remains.                                                                                                             |
| Shafts      | live    | Skip half-resolution target update and branch around composite samples. Medium classification/fog remains. Off-at-start can defer first-use pipeline creation.                           |
| Lens        | live    | Uniform branch skips droplet/distortion fragment evaluation. Shared 64×36 water-boundary/depth kernel remains.                                                                           |
| Bloom       | rebuild | Bypass HDR materialization and entire bloom chain, retaining allocated targets until disposal. First enable allocates/compiles and can hitch. Baseline on this route is off.             |
| Meter       | live    | Skip meter/adaptation/history copy; hold last valid exposure. One initialization result may still be needed.                                                                             |
| Lights      | rebuild | Skip pooled-light selection and exclude both point lights from lit draws. Source registrations/emissive glows and sun remain. Light-count variants can hitch.                            |
| Foliage     | live    | Existing lab decorative grass draw/update only; no trees, colliders or resource population removed.                                                                                      |
| Lab effects | rebuild | Existing lab post layers bypass their graphs; no second post owner. Enabling a new variant can compile.                                                                                  |

Shadow warm-up on the final tree took about **11.1 seconds** for one transition, including the required stable period; this is evidence of substantial first-use delay, not an exact GPU compile duration. The cold Metal cache was not cleared. The existing 16-second loading escape and late native-pipeline risks in [water-metal-cold](water-metal-cold.md) still apply. Live never means guaranteed hitch-free.

## Opened images and visual verdict

Question: does the named cosmetic effect disappear while geometry, water boundary and framing remain intact, and does baseline restore work? Contact sheets show on / off / baseline at approximately 0 / 3.5 / 7 seconds. Bloom's baseline is off, so its last panel is deliberately still off. All image links below were actually opened, not inferred from successful commands. Waves and residents move between frames; these are targeted stills, not frame-perfect pixel diffs or real-time motion validation.

| Image actually opened                                                                                                                                        | Observation                                                                                                                                 | Manifest                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Final Graphics panel](../../.look/evidence/1793781368678-62848/graphics-sweep-final-b-still.png)                                                            | Legible right dock, cost/mode labels, baseline/copy/Measure/reload controls; lower rows scroll. Existing place feedback UI remains visible. | [manifest](../../.look/evidence/1793781368678-62848/evidence.json)                                                          |
| [Controls/baseline panel](../../.look/evidence/1793781854698-81402/graphics-controls-still.png)                                                              | Panel restored to Auto/Display; normal scene intact.                                                                                        | [manifest](../../.look/evidence/1793781854698-81402/evidence.json)                                                          |
| [Caustics](../../.look/evidence/1793781424762-65205/graphics-caustics-motion.png)                                                                            | Bright moving floor pattern disappears to flat turquoise and returns; shore geometry stays.                                                 | [manifest](../../.look/evidence/1793781424762-65205/evidence.json)                                                          |
| [MSAA on](../../.look/evidence/1793781681162-75916/graphics-msaa-1-1-still.png), [off](../../.look/evidence/1793781776130-78173/graphics-msaa-2-0-still.png) | Single-sample tree/silhouette edges are rougher; scene remains intact.                                                                      | [on](../../.look/evidence/1793781681162-75916/evidence.json), [off](../../.look/evidence/1793781776130-78173/evidence.json) |
| [Snow](../../.look/evidence/1793781687383-76079/graphics-snow-motion.png)                                                                                    | Faint underwater flecks disappear off and return; blue medium remains.                                                                      | [manifest](../../.look/evidence/1793781687383-76079/evidence.json)                                                          |
| [Shafts](../../.look/evidence/1793781798338-79300/graphics-shafts-motion.png)                                                                                | Blue medium darkens off and brightens again. Distinct rays are not resolved in this flat view.                                              | [manifest](../../.look/evidence/1793781798338-79300/evidence.json)                                                          |
| [Lens at waterline](../../.look/evidence/1793782399170-96180/graphics-lens-waterline-motion.png)                                                             | Droplets absent off and visible after restore. Waves cross the camera, changing medium coverage; only droplet presence is a useful verdict. | [manifest](../../.look/evidence/1793782399170-96180/evidence.json)                                                          |
| [Bloom](../../.look/evidence/1793782318255-93585/graphics-bloom-motion.png)                                                                                  | Geometry intact; glow difference too subtle in daylight for a confident visual pass. Twelve removed contexts verify work, not appearance.   | [manifest](../../.look/evidence/1793782318255-93585/evidence.json)                                                          |
| [Meter](../../.look/evidence/1793782425885-97676/graphics-meter-motion.png)                                                                                  | No obvious exposure jump at this steady view, consistent with holding exposure. Response to a large lighting change is unverified.          | [manifest](../../.look/evidence/1793782425885-97676/evidence.json)                                                          |
| [Shadows, camp](../../.look/evidence/1793782460566-730/graphics-shadows-camp-motion.png)                                                                     | Buildings/ground intact; shadow difference not clearly resolved. Pass removal is measured; visible shadow coverage is unverified.           | [manifest](../../.look/evidence/1793782460566-730/evidence.json)                                                            |
| [Lights, camp](../../.look/evidence/1793782513382-4023/graphics-lights-camp-motion.png)                                                                      | Daylight scene intact; no clearly active point-light footprint, so visible lighting removal is unverified.                                  | [manifest](../../.look/evidence/1793782513382-4023/evidence.json)                                                           |
| [Spray, low shore](../../.look/evidence/1793782238872-91680/graphics-spray-low-motion.png)                                                                   | No clear emission difference after three views. Visual spray verdict remains unverified.                                                    | [manifest](../../.look/evidence/1793782238872-91680/evidence.json)                                                          |
| [Lab foliage](../../.look/evidence/1793781853623-81399/graphics-foliage-lab-motion.png)                                                                      | Grass disappears to bare ground and returns; trees/rocks remain. Separate `proto=look&look=ipad&water=old` route, not place timing.         | [manifest](../../.look/evidence/1793781853623-81399/evidence.json)                                                          |
| [Lab post effects](../../.look/evidence/1793782188635-90731/graphics-lab-effects-lab-motion.png)                                                             | Subtle contrast/colour change; grass and scene geometry remain. Separate lab route.                                                         | [manifest](../../.look/evidence/1793782188635-90731/evidence.json)                                                          |
| [Without Dev](../../.look/evidence/1793782326893-93700/graphics-without-dev-still.png)                                                                       | Normal shore/water, no Dev dock. Resource inspection confirms no Dev menu/Graphics panel module loaded.                                     | [manifest](../../.look/evidence/1793782326893-93700/evidence.json)                                                          |
| [Place bot end](../../.look/evidence/1793781796229-79202/run/end-still.png)                                                                                  | Built place progression remains visible; report verifies expected beats.                                                                    | [manifest](../../.look/evidence/1793781796229-79202/evidence.json)                                                          |

Additional opened diagnostic images: [initial panel](../../.look/evidence/1793780493027-13771/graphics-panel-still.png), [sweep A panel](../../.look/evidence/1793781017507-47256/graphics-sweep-final-a-still.png), [wide spray](../../.look/evidence/1793781663670-75603/graphics-spray-motion.png), [spray camera inside cliff, rejected](../../.look/evidence/1793781828446-80270/graphics-spray-close-motion.png), [deep lens, no useful visible distortion](../../.look/evidence/1793782088810-87837/graphics-lens-motion.png), and [failed bot fixture end](../../.look/evidence/1793781680255-75904/run/end-still.png). No motion video was reviewed; real-time feel/smoothness remains unverified.

## Checks, failures and limits

- `npx prettier --write` on changed source; `npm run check` passed on the final source: **293 tests, 293 passed, 0 failed**, plus typecheck, lint, registries, levels, assets and production build. [Check log](../../.look/graphics-check-final.log). No new tests or scenario harness.
- [Control capture](../../.look/evidence/1793781854698-81402/output.txt): invalid resolution `-1` rejected; 60% changed canvas from 1440×900 to 864×540. At cap 30, exactly 90 completed renders occurred in three seconds while accepted water queries increased by 540 (three consumers across 180 callbacks), failed queries zero. Reset returned 1440×900 and cleared the separate Dev storage key.
- [Fresh non-Dev capture](../../.look/evidence/1793782326893-93700/output.txt): `dev:false`, loaded Dev modules `[]`, saved override `null`, canvas 1440×900. The Dev-only MSAA URL override was ignored. Default ownership preserves existing rendering choices; exact pixel equality against a pre-change build was not tested.
- [Full place bot report](../../.look/evidence/1793781796229-79202/run/report.txt): **passed every expected beat**, no errors; 30 minutes of game in 3m52s at 8×, 78 checkpoints. The end still was opened. This is one player and accelerated time, not co-op or real-time feel validation.
- [First bot invocation](../../.look/evidence/1793781680255-75904/evidence.json) failed because replacing the query omitted `shot=play`, leaving the bot in an idle fixture. Its report and end still were inspected. Corrected query `proto=place&water=new&shot=play` produced the passing run above.
- [Preliminary sweep](../../.look/evidence/1793780599125-24462/evidence.json) was rejected in full: live MSAA changes invalidated cached depth attachments/bind groups; the no-tuning bloom threshold needed a node wrapper; fixed sleeps admitted a blocked first-use transition; stale query slots produced absurd spans. These led to reload-only MSAA, `float(threshold)`, advancing-frame warm-up and stale-range rejection. Healthy final-tree captures followed, with no graphics errors.
- [Explicit `dev=0` harness attempt](../../.look/evidence/1793781871400-81732/evidence.json) timed out because that flag removes the debug camera required by the broker. The fresh page with no Dev opt-in above is the valid lazy-loading check.
- No mobile/Safari run, cold-cache guarantee, isolated device timing, multiplayer scenario, storage-denial browser test, exact baseline pixel diff or physical display/occlusion measurement. No geometry/wave/query experiments, player Pause page or presets were added. Some visual effects remain unverified as listed above.
- **Departure:** early `npm run inflight` fetched GitHub despite the task's local-network-only instruction. This was disclosed during work and not repeated. All browser evidence thereafter used the existing local broker. No push, ship or screenshot upload occurred.

Implementation and built behavior: [plan](../plans/graphics-switches.md), [game design](../game-design/graphics.md). Stop here for the owner's review/playtest; no look or preset is selected by these numbers.
