# Audio mix and locomotion build — 5 November 2026

> **Verdict:** Audio mix and locomotion build record, rebased 5 November.
> **Top recommendations:** none; build record for the audio mix and locomotion commits.
> **Status:** reference. See [audio-mix](audio-mix.md).

## Rebase follow-up — 6 November 2026 UTC

Rebased all six audio commits onto fetched `origin/main` at `766c94d5`, staying
on `codex/audio-build`. The tested rebased runtime is `abe08c55`; the subsequent
report commit changes documentation only. The original measurements and route
reports below remain historical evidence, not verification of this new base.

- Retained the cleanup's shared `tuningVisit` gate, railway namespace and
  regrowth/recovery tunables alongside all audio bindings, controls and A/B
  snapshots. Removed the conflicting duplicate local gate.
- Resolved the additional slab conflict by keeping main's configurable collider
  overlap and audio's surface tag as separate arguments. Main's zero-overlap
  panel calls remain unchanged; grass halt ramps pass the surface explicitly.
- Formatted the three resolved files. `npm run check` passed **377 tests, zero
  failures**, plus lint/typecheck, registry, level, asset and build checks.
- [Fresh mixer proof](../../.look/evidence/1793931705258-10550/evidence.json):
  five audio controls, live SFX/child gains, mute/reset, volume and A recall
  passed. Both railway tunables were available and validated after room
  readiness. Opened `audio-rebase-mixer-still.png`: the five bus fields and
  save/recall controls are readable. Two earlier setup attempts selected the
  classic route or inspected shared tunables before room readiness; their
  failures did not require runtime changes.
- [Fresh movement proof](../../.look/evidence/1793931812757-11594/evidence.json):
  actual walk/jog/sprint/jump input produced **8 walk, 11 run, 1 takeoff and
  1 landing** after spawn, with zero active voices at the end. Opened
  `audio-rebase-movement-motion.png` and `consecutive-jump.png`: Buddy crosses
  wood, runs onto grass, takes off and lands. WebGPU capture checks passed
  without page/console/GPU errors. Video and curves are retained; the initial
  debug-camera reset is setup, not performance evidence.
- [Fresh raw audio proof](../../.look/evidence/1793931787895-11110/evidence.json):
  UI thunk, pickup and Boogler phrase all triggered, with zero clipped or
  nonfinite samples. The manifest's `audio/` directory retains all three WAVs,
  hashes, settings and metering results.

| Cue | Integrated LUFS | True peak dBTP | Sample peak dBFS |
| --- | ---: | ---: | ---: |
| UI thunk | −37.95 | −19.36 | −19.37 |
| Pickup thock | −29.53 | −12.52 | −12.52 |
| Boogler phrase | −30.64 | −19.93 | −19.93 |

The optional [Dev-off probe](../../.look/evidence/1793931726609-10662/evidence.json)
could not reach its assertions: `dev=0` removes the debug camera that the
trusted look harness waits for. The shared gate is preserved in code; that
negative browser case remains unverified. No new runtime failure was observed
in the completed checks. Full-route bots and the complete measurement suite
were not repeated for this narrow rebase; their earlier failures are not
declared fixed. Device listening, smoothness and six-player saturation remain
unverified. No push or ship. Only the requested Git fetch used external network
access; browser checks used the restarted local broker.

## Original implementation and evidence

Implements ordered steps 1–4 of [audio-mix](audio-mix.md), plus the explicitly
requested remote-step trim, pan and contact cap. Procedural Web Audio only; no
recorded samples, ROM data or extracted game audio. The wave recipe and the
Boogler's formant identity/copy are retained. Not tested on a device.

## Reproduction and evidence

Use Node 26 and the existing browser broker. `npm run audio:measure` writes raw
float32 WAVs, signal statistics, FFmpeg input loudness/true-peak readings and
broker provenance. Audio runs use the actual final output, including the
compressor/master. `--offline-place` renders the 24 source recipes and an
eight-event overlap at five fixed seeds, mono 48 kHz, before category/master
processing. Live fixture captures are reproducible commands, not promises of
sample-identical real-time game scheduling.

```sh
npm run audio:measure -- --only ui,pickup-thock,magnet-burst,minis,machine,voice,soapbox-silent,build-hut,track-machine --out .look/audio-after
npm run audio:measure -- --offline-place --out .look/audio-after-place
npm run audio:measure -- --offline-locomotion --out .look/audio-listening
```

The unchanged-runtime baseline is recorded under `.look/audio-before`, with
the corrected construction fixtures in `.look/audio-before-repaired`, and the
125 source renders under `.look/audio-before-place`. Every capture's manifest
identifies the tested commit/tree and exact broker artifacts. Baseline runtime:
`5849325991f5b62077fc52406fff8313e03806bc`; harness repair commit `f45ff31d`.
Temporary harness failures are preserved in `.look/evidence`; they are not
passing evidence.

## Harness corrections

- The live capture path now uses the broker rather than launching Chromium.
- Soapbox checks isolate its cut SFX from retained UI confirmations and assert
  that the rider was seated: measured silent.
- Hut construction runs in its actual classic fixture, asserts accepted stock,
  and waits for the build audio to settle: 16.742 s capture, 14.591 s active,
  −8.91 dBFS peak. The former 34-second silent fixture was not evidence.
- The track fixture uses the broker's explicit prototype-room argument and
  current site API: 17.217 s capture, 14.101 s active, −4.29 dBFS peak.
- Completion follows source stops and natural finite-buffer ends, including
  delayed notes. The sad trombone retains 1.880 s of active audio in a 2.150 s
  capture, replacing the truncated 1.297-second historical preview.
- Raw float evidence is never normalized or clipped for previews. Silence and
  untriggered cues remain explicit failures/null metrics. Full windows and
  active lengths are reported separately.

## Calibration choices

Recipe trims precede the bus. UI thunk −6 dB also reduces its low body from
0.38 to 0.2 and shortens redundant decay; pickup −4 dB; machine sleeper −6 dB,
whistle −12 dB; minigames −3 dB with another −3 dB for the sustained womp;
Place rock break and trunk landing −3 dB. Clink's identical wood/metal
fundamental is rendered once at the same combined level. Soft versus heavy
contacts, rarity phrases, honk chords and quiet effort cues keep their shape.

The candidate bus table is installed through real Local bindings. The UI kit's
0.4 factor is removed exactly once; physical magnet/pickup/hut/machine/Place
work uses the Work child. Voice's former bus compensation is a live phrase
trim, preserving the formants while the Voice bus starts at 0 dB. The post-
processing user master no longer changes the compressor's input. Full/Compact
profiles, owned duck claims and the global non-footstep voice budget remain
later ordered work.

## Baseline and final live measurements

Full, unnormalized stereo 48 kHz windows at the final output. I is FFmpeg's
input integrated LUFS; TP is input true peak in dBTP. Short-hit I is diagnostic,
not a gain target. These real-time takes contain noise and scheduling variation;
small changes in untrimmed cues are not evidence of an authored gain change.
The machine's peak and integrated level respond differently to overlapping
layers and the retained compressor. Silence is intentionally null.


| Cue | Before I | After I | Before TP | After TP |
| --- | ---: | ---: | ---: | ---: |
| ball-boing | -31.07 | -31.10 | -11.35 | -11.48 |
| build-hut | -25.33 | -25.49 | -8.89 | -9.21 |
| honk-chord | -26.57 | -29.56 | -11.40 | -14.27 |
| honk-jam | -25.67 | -28.66 | -11.51 | -14.38 |
| honk | -26.24 | -29.24 | -16.27 | -19.26 |
| machine-reference | -13.48 | -24.82 | -4.76 | -9.15 |
| magnet-burst | -25.50 | -25.38 | -14.22 | -14.19 |
| minis-boing | -27.99 | -30.78 | -10.95 | -14.10 |
| minis-fanfare | -22.62 | -25.33 | -11.15 | -14.02 |
| minis-knock | -26.18 | -28.91 | -7.16 | -10.29 |
| minis-pop | -23.91 | -26.66 | -8.79 | -11.69 |
| minis-womp | -18.90 | -24.78 | -12.56 | -18.43 |
| pickup-thock | -25.70 | -29.47 | -9.30 | -12.66 |
| ping | -35.26 | -38.26 | -21.23 | -24.23 |
| soapbox-silent | — | — | — | — |
| track-machine | -27.51 | -33.21 | -4.29 | -4.84 |
| ui-count | -32.97 | -32.80 | -19.82 | -19.55 |
| ui-deny | -40.68 | -40.75 | -25.19 | -25.25 |
| ui-flap | -63.38 | -64.37 | -35.42 | -38.16 |
| ui-pop | -37.05 | -37.04 | -18.82 | -18.68 |
| ui-thunk | -30.44 | -37.94 | -11.68 | -19.38 |
| ui-tick | -45.13 | -45.22 | -26.60 | -26.64 |
| voice-boogler | -30.64 | -30.69 | -19.01 | -19.57 |

All **23 final live takes passed** their trigger/silence checks, with **zero
clipped or nonfinite samples**. The baseline uses the repaired hut/track takes
above instead of the earlier failed fixtures. Full raw files, hashes, onsets,
active lengths and meter versions are in the ledgers beside the
[final live manifest](../../.look/evidence/1793929608951-97258/evidence.json)
and [hut manifest](../../.look/evidence/1793929582450-96910/evidence.json).
The former also contains `baseline/` and the final `audio-check.txt`.

## Seeded source measurements

Five fixed seeds per cue, each in a fresh OfflineAudioContext: **24 Place cues
plus one eight-event overlap, 125 renders** before and after. The table gives
median source sample peak and median onset-aligned 100 ms RMS in dBFS, before
category/master processing. The after peak range shows variation across seeds.
Quiet effort and large impacts intentionally differ; they are not all boosted
to the same gated loudness. All final samples are finite and below full scale.

| Cue | Peak before | Peak after | RMS100 before | RMS100 after | After peak range |
| --- | ---: | ---: | ---: | ---: | --- |
| bagFull | -37.59 | -37.59 | -51.46 | -51.46 | -38.00…-37.51 |
| boxCommon | -26.00 | -26.00 | -38.70 | -38.70 | -26.65…-25.64 |
| boxRare | -26.68 | -26.68 | -39.61 | -39.61 | -27.41…-26.35 |
| boxWonder | -27.34 | -27.34 | -39.97 | -39.97 | -28.12…-27.04 |
| cartPush | -42.94 | -42.94 | -59.34 | -59.34 | -43.32…-41.99 |
| cartRoll | -33.25 | -33.25 | -48.39 | -48.39 | -33.44…-32.86 |
| cartStop | -30.89 | -30.89 | -54.32 | -54.32 | -30.89…-30.87 |
| gliderClose | -31.72 | -31.72 | -48.79 | -48.79 | -32.88…-31.30 |
| gliderOpen | -29.94 | -29.94 | -45.48 | -45.48 | -30.79…-28.98 |
| hardwoodBite | -24.45 | -24.45 | -40.00 | -40.00 | -25.31…-24.26 |
| hookFire | -29.91 | -29.91 | -44.88 | -44.88 | -30.57…-27.42 |
| hookLatch | -27.68 | -27.68 | -42.36 | -42.36 | -27.75…-27.63 |
| overlap-eight | -14.16 | -16.00 | -27.05 | -28.64 | -16.74…-15.49 |
| pathOpen | -29.48 | -29.48 | -38.73 | -38.73 | -29.66…-28.87 |
| pickupGlider | -31.49 | -31.49 | -43.40 | -43.40 | -31.61…-31.35 |
| pickupHook | -26.83 | -26.83 | -40.39 | -40.39 | -26.85…-26.79 |
| pickupJump | -28.20 | -28.20 | -42.42 | -42.42 | -28.92…-27.75 |
| rockBreak | -18.34 | -21.34 | -33.27 | -36.12 | -22.76…-21.17 |
| secondJump | -30.05 | -30.05 | -44.97 | -44.97 | -31.43…-29.37 |
| seesaw | -28.24 | -28.24 | -39.42 | -39.42 | -28.58…-27.05 |
| shoulder | -25.23 | -25.23 | -37.60 | -37.60 | -25.76…-24.62 |
| treeBite | -24.43 | -24.43 | -41.99 | -41.99 | -24.92…-22.47 |
| treeFall | -23.71 | -23.71 | -33.24 | -33.24 | -24.54…-23.00 |
| treeLand | -21.56 | -24.53 | -32.22 | -35.06 | -24.93…-24.28 |
| treeRebound | -29.84 | -29.84 | -48.15 | -48.15 | -30.09…-29.15 |

[Final source-render manifest](../../.look/evidence/1793929389631-91418/evidence.json).
Its `audio/` directory contains every WAV and the per-seed ledger.

## Owner controls and locomotion

The existing Dev Tunables dock contains the bounded Local keys under `audio.*`,
actual node gains, active locomotion voices, reset, named A/B snapshots and JSON
export. Live bus edits smooth over 30 ms. Pending edits apply when audio unlocks.
User mute/category gain, authored calibration and duck stages are separate;
reset cannot unmute the player. The retained −1.938 dB profile trim follows the
compressor, before the post-processing user volume squared.

| Default | dB |
| --- | ---: |
| Music | −8 |
| Ambience | −12 |
| SFX / character / work | 0 |
| Social child | −3 |
| UI | −8 |
| Voice | 0 |
| Calibrated voice phrase | −12 |
| Walk / run | −8 / −5 |
| First jump / normal landing | −11 / −4 |
| Remote contact trim | −6 |
| Soft / heavy landing additions | −6 / +4 |
| Grass / wood / rail / water | 0 |
| Sand | −1 |

The Buddy walk, jog and sprint clips supply contact phases; blended animation
emits one contact stream, with no backlog. Six procedural takes per surface
avoid the preceding two choices, with ±35 cents and ±1.5 dB jitter. Grounded
support metadata selects wood/rail before terrain, and shallow submerged soles
select water. Swimming, seated/riding, downed, airborne steps, stationary motion,
teleports and context resume are suppressed/reset. Support queries happen at
contact time. Untagged supports fall back to grass with one development notice.

Accepted local ground/coyote launches supply first-jump effort. An initial
motion proof exposed false effort at a terrain crest; the final version counts
accepted launches instead of inferring them from upward motion. Remote presence
has no jump intent, so it supplies steps and landings without speculative
remote takeoff effort or new wire fields. Descent height blends soft through
capped heavy landings. Existing second-jump audio is retained.

Remote contacts use body distance and camera-yaw stereo pan, additional −6 dB,
1.5 m near/18 m far falloff (30 m for landings), two voices per emitter and eight
in total, reserving two for local contacts. Voice stealing releases over 8 ms;
leaving disposes the emitter. These limits cover locomotion only: the global
work/social budget belongs to ordered step 5.

## Listening and focused proof

The [listening sheet](../../.look/evidence/1793929364729-90835/audio/listening.md)
links **25 raw mono 48 kHz WAVs**: source reference, walk, run, jump with landing,
and soft-to-heavy impacts on grass, sand, wood, rail and water. Each contains
six takes. Source references reach −12 dBFS; authored previews use the live
recipe settings before category/master. Cadence is illustrative, not a physics
simulation. No post-render normalization, clipping or nonfinite samples.
[Listening manifest](../../.look/evidence/1793929364729-90835/evidence.json).
No sample bank was downloaded, so no external audio licence is required.

- [Mixer proof](../../.look/evidence/1793929024609-87788/evidence.json): actual SFX
  gain became 0.2511886 at −12 dB, then 1 on reset; child gains followed. NaN was
  rejected, mute stayed zero through reset, volume 0.5 produced master 0.25,
  and A recall restored the saved mix. Opened `audio-mixer-still.png`: five dB
  controls and A/B/reset were visible and readable. Pre-unlock edits were
  inspected in code but not exercised before the browser's unlock gesture.
- [Solo movement](../../.look/evidence/1793929308601-90296/evidence.json): actual
  analog walk, jog, sprint and one queued jump emitted **8 walk, 11 run, 1 jump,
  1 landing** after the initial spawn. Opened `audio-movement-final-motion.png`
  and six consecutive video frames in `consecutive-jump.png`: Buddy crosses
  wood, runs uphill, takes off and lands on grass. The earlier movement sheet
  `1793929055875-88032/audio-movement-motion.png` was also opened and superseded
  after its extra takeoff was fixed. Curves and encoded video are retained;
  the initial debug-camera reset is setup, not a camera-performance result.
- [Real two-player movement](../../.look/evidence/1793930317179-1506/evidence.json):
  both peers saw each other, with no page/console/GPU errors. Each emitted one
  deliberate local takeoff; the retained event windows contain 21 and 20 remote
  contacts respectively, within the intended quieter gain bands. Both ended
  with zero active voices. Opened `audio-coop-movement-motion.png` and
  `p2-audio-coop-movement-still.png`, and six consecutive encoded frames in
  `consecutive-coop-jump.png`: both Buddies remain visible while walking,
  jumping and stopping near the cliff. Neither this short run nor the WAV sheet
  proves six-player voice saturation, perceived pan or smoothness.
- [World-inputs scenario](../../.look/evidence/1793930358370-1898/evidence.json):
  all assertions passed against this running build; no errors. It emitted no
  PNG. This is a world-contract check, not an audio listening verdict.

## Whole-route bots and limits

- [Solo route](../../.look/evidence/1793929763182-98819/evidence.json): **FAIL /
  incomplete**, default 300-second wall limit. It ran 28 game minutes, reached
  the pier ending at 24:51, then visited house/shop/museum and several secrets.
  The full report says crystal and together beats were not marked; zero runtime
  errors, 7:41 game-time stillness and 6 seconds pushing. Opened `run/end-still.png`:
  Buddy was aloft in a glider over the coast; this is not a finished exploration
  route. No unrelated gameplay fix is claimed.
- [Co-op at 5×](../../.look/evidence/1793930119821-437/evidence.json): **FAIL** at
  checkpoint 6, `NEVER: dry co-op landing`. The failed player had no contacts
  despite approximately 0.0016 m support gap. Reported peak clock deficits were
  101.092 game seconds for player 1 and 1.095 for player 2; the harness rejected
  the rate as well. Reload/rejoin had not occurred. Opened `run/end-still.png`
  and `run/p2-end-still.png`: one Buddy stood on the constructed bridge and the
  other appeared over dry grass. These images cannot establish grounding.
- An earlier observer-only invocation replaced the route driver and stalled
  without performing the bot. Its [setup failure manifest](../../.look/evidence/1793929658939-98091/evidence.json)
  is preserved, and the real solo route above supersedes it. A rejected
  `playthrough --name` invocation never started a run and was retried without
  that unsupported argument.
- [Co-op rerun at 2×](../../.look/evidence/1793930386224-2227/evidence.json):
  **route reached all 23 checkpoints; overall FAIL on the clock-rate guard**.
  Both bots reported the pier ending after reload and leave/rejoin, in 826.143 s
  wall time, without route skips. There were no page/console/GPU errors, though
  grounding diagnostic messages occurred. Segment peak page-clock deficits
  reached 5.584 s; the final segment ended player 1 approximately 3.72 game
  seconds short of the requested rate. The clock guard throws before the
  final convergence assertion, so this is not a certified co-op pass. Opened
  `run/end-still.png` and `run/p2-end-still.png`: both Buddies appear together
  beside the train platform, with both bot overlays recording THE END.

## Checks, scope and remaining owner proof

`npx prettier --write` was run on the changed files. Final runtime
`3d2c23da95a50adccd3655772f6513bcf739f490` passed `npm run check`: **376 tests,
zero failures**, TypeScript/lint, registry checks, six level reports, asset
validation and Vite build. The full log is retained beside the live manifest.
The last commit adds only this report; no runtime source changed after those
checks or the final audio/visual captures. The evidence's dirty flag covers
this report while it was still untracked; each final manifest records
`changedDuringRun: false`.

Implementation steps 1–4 are present, with the requested remote-footstep subset
of step 5. Whole-route verification remains **partial** because the solo route
timed out and both warped co-op runs returned failure. The lower-speed run
completed the gameplay checkpoints, but does not establish stable clocks or
final convergence. No unrelated physics/network workaround was introduced.

Not tested on a device. Speaker/headphone balance, perceived pan, real-time
feel/smoothness, quiet-machine performance, six-player saturation and a full
live route on every surface remain unverified. All five surfaces have recipe
listening renders; the focused live movement proof covers wood and grass.
Full/Compact programme loudness, global voice budgets and owned duck claims
remain later ordered work. Stop here for the owner's audition before taste
adjustments. No compatibility work, samples, external network access, push or
ship. `npm run inflight` was not invoked because it fetches GitHub and this task
prohibits that network access. All work stayed on `codex/audio-build`.
