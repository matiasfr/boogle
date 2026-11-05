> **Status: ready to playtest (owner choices applied, 2026-11-05).**
>
> The owner chose lit boards and round two's lights **for now**, using round five's 0.12 pick: key 1.12,
> fill 3.2, grass pigment .35, grass albedo .7, selective colour and underwater +0.81 EV held.
> Real-sea Place/crossing defaults now own the result; classic home stays unchanged. The dated exploration below
> records the experiment, not a second preview path or a new tuning brief.

# A brighter, more vibrant world

## Pitch

The sea already feels inviting; the land should too. Owner's brief: "a bit dark and dull compared to the ideal", with colours "more vibrant and saturated and brighter". The panel's shared finding is that dullness may be mostly lighting: on the last comparison board, greens look strong while cream walls read tan and shaded equipment goes very dark. Boosting saturation alone could make grass fluorescent and leave shade muddy. So light the world first with the existing controls, then add colour selectively, strongest on characters and things you handle. Serves **Show, don't tell** and **Telegraph everything**: a friend, their load and the path should stay readable from the shore through shade into town.

## Gut question

**Does the island now feel as sunny and inviting as the sea?**

Variants, each changing one thing against the one before: Current; brighter shade; the same brightness plus selective colour.

## Best suggestions

1. **Brighten shade first** (all three). Probe existing key and fill controls in `src/render/water/frozen-sky.ts`. No new lights, passes or shading style. Keep Buddy round and his contacts grounded.
2. **Selective colour second** (design, creative, systems). Light cream, honey timber, coherent fresh greens, with the richest reds, purples and yellows on characters and useful objects. Astroneer's broad vibrant shapes and TF2's restrained fields with saturated accents are the precedents.
3. **Tune sky properties where they visibly help** (systems, per the owner's correction). The sky's implementation stays. Sun intensity, turbidity and cloud coverage are existing controls, but they rebake and change background, environment light, fog and water reflections together, so every sky candidate shows the shore too.
4. **Check it survives the exposure meter** (systems). The meter measures the whole scene, so brighter land can lower its gain and darken the sea and sky. Compare with exposure locked, then repeat with it running while turning from town to horizon.
5. **One shore-to-town walk as the acceptance moment** (design, creative). A friend carrying timber from the shore through tree shade into town. Check it before the owner chooses, since a still winner that loses the face in shade isn't ready.

## Tensions

- **Lightness before chroma, or side by side?** Design first wanted the two compared independently. Round two converged on brightness first, because weak light shouldn't be compensated with aggressive pigment. Recommendation: light first, but show a colour step in the same first round, because the owner asked for saturation explicitly.
- **Is fill the answer?** `sky.fillGain` changes hemisphere light, not environment intensity, and the 1.25 starting value is uncalibrated. Recommendation: treat it as a probe and check which surfaces respond, separately for Buddy, foliage and cream walls.
- **Use an existing Dev Look?** Clean toys raises the whole image by +0.375 EV, and Sunshine retunes the water. An earlier board judged both better than Current, though they mix variables. Recommendation: include Clean toys as one reference cell only.
- **Are tone mapping changes on the table?** The panel kept Neutral as the baseline, and the owner's "safe option until we figure it out" leaves it open. Recommendation: keep Neutral this round.

## Shape

- **Sync:** Local only. No ops, presence or saves.
- **Reuses:** `frozen-sky.ts`, `selectLook()` and `lockExposure()` in `src/render/water/looks.ts`, `dev/look/shots.ts` and `dev/look/beats/`. Colour owners are separate, so `src/render/materials.ts` alone isn't enough: Place's `groundMaterial()` and `paint()` in `src/proto/place/look.ts`, `land.ts`, and tree materials in `chop.ts`.
- **Smallest first build:** Dev-only settings on `proto=place&dev=1`, a saved beat for shaded Buddy carrying, town and shore, then three matched boards and one walking check.
- **Risks:** bleached cream, flattened Buddy, fluorescent grass, a meter that darkens the sea, and sky rebakes shifting water reflections. Frozen captures say nothing about GPU cost.

## Done means

Frozen boards with `dev/look/shots.ts` at native pixels, at most three cells per row, exposure locked per view, on `proto=place&water=new&dev=1`:

- **Shaded Buddy carrying:** face, body and load all readable, with colour identifiable in shade and contact shadows kept.
- **Town at play distance:** cream reads light rather than tan, timber and greens stay distinct, and no channel clips broadly. Measured on static regions against Current.
- **Shore:** sea depth, caustics and foam intact. If water pixels change, say why, and any sky change is shown here.
- **Exposure running:** a turn from town to horizon with the meter on, reporting gain before and after; the sea must not darken noticeably.
- **Motion:** a shore-to-town walk with a carried load in consecutive frames, naming any flashing or adaptation pumps.
- **Cost and default:** warmed on/off GPU on the M1 Max, with contention labelled. Default graph and first-load list unchanged. Whether it feels better is the owner's call.

## Open questions

1. Run the first comparison now? **Recommended: yes, Dev-only, stopping at your choice.** Answer (owner): "Yes as recommended."
2. Which comes first if only one can win: brighter or more saturated? **Recommended: brighter shade, then selective colour.** Answer (owner): "Yes as recommended."
3. May sky properties change in this first round? **Recommended: yes, shown as a separate labelled step with the shore beside it.** Answer (owner): "Yes as recommended."
4. Water: must it stay as is, or can it follow if the land change shifts it? **Recommended: keep its settings, and accept only small changes that come from the new light.** Answer (owner): "Yes as recommended."
5. Is there a picture of "the ideal" to match? **Recommended: if you have one in mind, name it; otherwise I'll use the earlier previz as a reference, not a target.** Answer (owner): "Yes as recommended."

## Parked

- A `/codex` previz of one town frame, if the palette target stays unclear after this round.
- Reopening Neutral against AgX, after the land reads right.
- Family-specific colour controls across every material owner, after a yes.
- Applying the result to the classic island.

## Disposition

**Ready for the owner's playtest.** The 5 November choice graduates round five's pick to the owning defaults.
This graphics change leaves the round 4 replay gate and gameplay flow intact. The panel's earlier claims above
remain exploration history; implementation evidence belongs in `docs/research/color-defaults.md`. Local commits
do not establish shipping, deployment or device verification.
