# Buddy diffuse ramp — first comparison

> **Verdict:** Owner kept Current; ramp code archived on tag.
> **Top recommendations:** 1. Keep the Current diffuse; the ramp is not adopted.
> **Status:** superseded by the owner calls in [Look](../decisions.md#look).

**Decision: owner kept Current.** The ramp code is not on `main`; it is on tag `archive/buddy-light-ramp`.

2026-11-04. Question 1 only of [render options](../brainstorms/render-options.md). **Current wins this comparison.** This is a Local Dev experiment, awaiting the owner's choice; no default change, ground work, outlines, haze, rim light or fill adjustment.

| Rank | Treatment | What I saw                                                                           | Worst failure                                                                                             |
| ---- | --------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1    | Current   | Round head and shoulders, continuous volume, readable bright paint and logs.         | Dark paint still reads as shadow; shaded frontal views lose shape.                                        |
| 2    | Soft      | A broader, flatter lit crown from behind; little gain in the frontal or loaded view. | Too little readability benefit to justify adoption. Drop it as a candidate, retain it in this comparison. |
| 3    | Two-band  | Unmistakable head band and stronger log-end separation.                              | The head becomes a flattened dome; hard cheek/neck and limb patches undermine the soft character.         |

## Matched boards

All nine boards were opened. Each has three 640×480 native-pixel cells in one column, large labels, Current / Soft / Two-band top to bottom. The main camera is 5.2 m from its look target, FOV 62. Close is secondary. At phone overview size the strong crown change remains apparent; Soft's small change does not earn a win. No physical phone test was performed.

- Play distance: [coral](buddy-light-ramp/coral.png), [blue](buddy-light-ramp/blue.png), [violet](buddy-light-ramp/violet.png).
- Dark diagnostic, **outside the player palette**: [rear](buddy-light-ramp/dark-rear.png), [face](buddy-light-ramp/dark-face.png). All three look nearly silhouetted; the ramp does not solve paint-versus-shadow ambiguity.
- Loaded at the forge rack: [rear](buddy-light-ramp/loaded-rear.png), [face](buddy-light-ramp/loaded-face.png), [close](buddy-light-ramp/close.png). The train partly enters the foreground, but Buddy and the log bundle remain visible. Strong separates some log ends while sacrificing the round head. No band crosses the eyes in these matched views; the strong forehead/crown boundary and stage cheek/neck boundary are still objectionable.
- [Shore control](buddy-light-ramp/shore.png): **zero changed pixels** for both ramps across all 307,200 pixels, including water.

Differences are measured on a 160×220 Buddy/load rectangle, not diluted across the scene (close: 320×420). Loaded rear: Soft changes 3,986 pixels, max channel difference 19/255; Strong changes 4,212, max 47/255. Full-frame counts equal the subject counts here. Coral/blue/violet maximum differences are 20/16/16 for Soft and 51/36/35 for Strong. Dark rear is only 5/9. All 27 cells pass immediate and away/back **exact** repeat checks; frozen compute dispatches are zero. [Raw metrics and manifests](buddy-light-ramp/evidence.json).

## What changes, and what stays fixed

The Dev Graphics panel registers **Buddy diffuse ramp** and **Buddy ramp shape**; Current is off. `buddy.ramp` is the saved-shot numeric binding: 0 Current, 1 Soft, 2 Two-band. The Dev module operates on Buddy's existing `M_Main` clone and clones the carried log-bundle material only. It wraps the Standard node lighting model's direct-diffuse accumulator; original direct specular and indirect lighting run unchanged. Soft warps N·L with smoothstep(0.18, 0.78); Strong uses two levels with a narrow 0.49–0.51 transition. Both retain a short terminator fade and existing shadow attenuation. No MeshToon replacement or post effect is used.

Skinning/geometry, eyes, hat, accessories, fog, material colours, emissive fill, ambient and scene lights remain on their original paths. The [two-subject material audit](buddy-light-ramp/audits.json) verifies unchanged serialized material properties, geometry and shadow flags through all modes; Current restores the exact original material objects. Camera, exposure and output-node identity also remain fixed. The GPU samples retain the same eleven target IDs and seven render passes. This is code/runtime isolation evidence, not a claim that every lighting condition was visually tested.

Normal startup requested **no ramp module**. The lazy Dev import leaves all **113 first-load entries** unchanged, including their normalized contents: only generated asset hashes/build IDs differ. Gzip totals change by one byte (1,836,926 → 1,836,927, Node zlib level 9). [Per-file hashes and comparison method](buddy-light-ramp/first-load.json). The production Buddy rig and default renderer graph are untouched. Reapply the switch after a new avatar arrives; this bounded experiment deliberately adds no discovery loop.

## Motion evidence and limits

All three modes ran `asset-motion.ts` with shipped lighting, a conductor hat, Walk_Loop, carrying pose, Jump_Start, and a turning camera against the fixed sun. Twelve runs retain native consecutive sheets, cycle sheets, WebM, decoded consecutive video frames, curves and outliers in the [motion manifest index](buddy-light-ramp/evidence.json). The review opened all 36 sheets across the primary agent and delegated reviewer, including all twelve Strong sheets directly.

No isolated lighting flash or independently identifiable band snap appeared in the inspected windows. Strong's patches visibly move across limbs and the cheek/neck: the turn cycle's profile at frame 99 is its clearest failure (Current 98, Soft 100). This is not evidence of real-time smoothness.

Frame-numbered discontinuities that must not be mistaken for ramp flicker:

- Soft walk f5→6 and Strong walk f5→6 have ~0.194–0.195 s capture gaps and ~1.197 rad calf changes. Current's startup calf change is f23, 0.539 rad. Strong's moving limb bands are harsh, but these jumps also involve pose timing.
- Carry settlement: Current f22, Soft f23, Strong f22, lower-arm changes 0.868/0.766/0.849 rad.
- Jump transition f22: calf changes 1.285/1.420/1.284 rad; another at f29, 0.471/0.428/0.440 rad. Strong turn f22: 0.467 rad.
- Encoded orbit frames 7/13 show ghosted edges across controls too; native sheets do not. Treat those as capture/encoding defects.

Hat socket drift stays below 1.2e-15 m in sampled curves. The stage carrying test has **no cargo**, and jump is grounded animation playback, not a physics jump. Loaded motion, actual display smoothness and mobile remain unverified. Frozen in-game boards, not stage lighting, decide the ranking.

## Cost and checks

Apple M1 Max, Apple Metal-3 non-fallback adapter, 1440×900, DPR 1, MSAA 4. Existing real-frame `measureGraphics` ran warmed on/off/off/on repeats: 2 s warmup, 3 s sample, 180 GPU frames per sample, 720 per mode. No simultaneous broker run; **contention unknown**, physical occlusion unknown, actual presentation timestamps unavailable.

| Mode     | On GPU span | Off GPU span |     Delta |
| -------- | ----------: | -----------: | --------: |
| Soft     |    7.993 ms |     8.048 ms | −0.055 ms |
| Two-band |    7.860 ms |     7.767 ms | +0.094 ms |

Both observed deltas meet 0.5 ms. The negative result is noise, not a speedup claim. [Samples, conditions and resource snapshots](buddy-light-ramp/gpu.json).

`npm run check` passes; no new unit tests or scenarios. The full Current-control place bot **fails** its completion contract: “found a crystal” and “did something together” never marked, despite reaching the pier/run-ended beat. Report and end still were inspected; no graphics errors. [Bot report](buddy-light-ramp/bot-report.txt), [broker manifest](buddy-light-ramp/manifests/bot.json). No gameplay fix is included.

Rejected capture attempts remain under `.look`: r1 had a bad eval import; r2 staged the wrong rack; the first final attempt detected a 202-pixel repeat drift. Per-camera frozen priming resolved it without relaxing exact comparisons. An initial bot invocation omitted `shot=play` and ran the hat fixture; a `dev=0` startup audit also failed because it removed the broker camera. Corrected runs above supersede those attempts. Evidence records the tested dirty tree, not a later documentation commit; [final visual source bytes match that captured tree](buddy-light-ramp/source-proof.json).

Reproduce with Node 26 and the existing broker:

```sh
node dev/look/shots.ts dev/look/beats/buddy-light-ramp.ts --name buddy-ramp-review-new
node dev/look/asset-motion.ts --broker --asset buddy --mode played --light shipped --ramp strong --clip Walk_Loop --hat conductor --name ramp-strong-walk-new
```

Repeat motion with `--ramp current` and `soft`; use `--pose carrying`, `--clip Jump_Start`, or `--turn-camera` for the other runs. The saved manifests retain exact commands. GPU reproduction uses the saved fixture and `dev/look/evals/buddy-ramp-cost.ts` action with `--real`, `prof=1` and 1440×900.

**Can you read your friend and their load at a glance, and which Buddy do you want to walk around as?**
