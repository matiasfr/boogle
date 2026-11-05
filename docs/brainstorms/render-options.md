> **Status: answered (2026-11-04).** Owner chose Current over both Buddy light ramps. Ground boards and outline cost remain unanswered. Ramp code: tag `archive/buddy-light-ramp`. [Findings](../research/buddy-light-ramp.md).

# Rendering options we never really tried

## Pitch

The post looks were tested fairly at strength: haze and shade colour didn't earn a place, and toy outlines cost too much for what they gave. What was never tested is treating surfaces and light rather than the finished image. A diffuse light ramp on Buddy is untried, because the old "bands" only quantized finished colour. The ground's soft edges come from colours blended across its 2 m grid, not from a post effect. Outline cost was measured but never broken down. Keep Current as the default, and test these separately. Serves **Show, don't tell**: my friend, what they're carrying and the path should read at a glance, with the sea still rich behind them.

## Gut question

**Can I read my friend, their load and the path at a glance, without losing the sea?**

Variants on Buddy, differing only in diffuse response: Current; a soft ramp; an unmistakable two-band ramp.

## Best suggestions

1. **True diffuse ramp on Buddy and one carried prop** (all three lenses). Hold specular, fill, colours, camera and exposure fixed. No new screen buffers. Post bands never answered this, and stock `MeshToonNodeMaterial` also changes specular, so it's a diagnostic rather than the deciding comparison. TF2's light warping and Nintendo's cel-animation characters against dense backgrounds are the precedents.
2. **Ground boundaries before ground texture** (systems, then all). Carry explicit grass/path/sand weights into `groundMaterial()` and narrow the transitions; add restrained world-space detail only if a gap remains. A Short Hike's strongest-channel splat selection is the precedent. An earlier terrain transplant erased paths and changed the palette, so this reuses detail beneath path masks instead.
3. **Break down the outline cost before replacing outlines** (systems, adopted by design and creative). The archived layer gathers a square neighbourhood of mask taps around a four-neighbour depth test; systems counts 121 taps. Measure coverage, guard and ink separately. That's a lead rather than a proven saving, and crawl stays a rejection criterion.
4. **Buddy fill, separately** (creative, design). Compare his existing emissive fill with sky fill after the ramp, so brighter shadows don't pass as a better ramp.
5. **Combined readability beat** (design, creative). A friend carrying a bulky load past the rack, across the grass/path edge, water behind. Pick each treatment alone before combining winners.

## Tensions

- **Ground or Buddy first?** Systems first put ground first, then all three converged: Buddy can run now, while ground adoption belongs to the terrain pass the owner already deferred. Recommendation: Buddy first. Ground stills are cheap and could inform that pass, but ship nothing to terrain yet.
- **Optimize ink or try hulls?** Round one, design and creative wanted hull outlines. Round two, all three moved to diagnosing cost first, because hulls lose the intersection lines that helped at the rack. Recommendation: diagnose first, hulls as a bounded fallback.
- **Ramp on one shared material or Buddy alone?** Creative preferred the shared painted-toy material. Recommendation: Buddy plus one prop, because of a smaller blast radius and Buddy's existing per-avatar clone.

## Shape

- **Sync:** Local presentation only. No ops, presence or saves.
- **Reuses:** Buddy's material clone in `src/player/buddy/rig.ts`, `patchNode`, `groundMaterial()` in `src/proto/place/look.ts`, `dev/look/shots.ts`, `dev/look/asset-motion.ts`, the archived layers on tag `archive/post-looks-round2`.
- **Smallest first build:** a Dev-only ramp on Buddy and one prop, with Current, soft and strong in a shot list at the 5.2 m play camera, plus motion review of the survivor.
- **Risks:** hard ramps snap across Buddy's round body; his dark paint can read as shadow; frozen stills flatter what motion breaks; a win on M1 Max may not survive the M4 iPad.

## Done means

Frozen-frame boards from `dev/look/shots.ts` on `proto=place&water=new&dev=1&shot=pack`, native pixels, at most three cells per row:

- **Buddy at play distance:** several Buddy colours, Current, soft and strong. Visible on a phone, face and shoulders still readable, colours preserved, and a static-region difference from Current that can be seen.
- **Loaded Buddy at the rack:** the load separates from his body without new outlines.
- **Water check:** shore frame matches Current exactly apart from any Buddy or prop in view.
- **Motion:** `dev/look/asset-motion.ts` on the survivor through walk, carry and jump. Name any band snapping with frame numbers.
- **Cost:** warmed on/off GPU repeats on the M1 Max, target at most 0.5 ms. Label contention. Whether it's more appealing stays the owner's call.

## Open questions

1. Run the Buddy ramp comparison now, or hold everything for the later rendering pass? **Recommended: run it now as stills and motion only, since it costs little and doesn't touch the replay.** Answer (owner): "Yes, run it now."
2. Make ground boundary comparison stills now, with adoption left to the terrain pass? **Recommended: yes, one board only.** Answer: not answered; recommendation is not approval.
3. Measure the outline cost breakdown now? **Recommended: no, wait until the ramp result, unless outlines are still wanted after it.** Answer: not answered; recommendation is not approval.

## Parked

- Hull outlines on a few smooth, opaque objects, if the ink breakdown finds no savings.
- Small-radius AO, only if a visible contact problem survives at play distance. The contact recipe never built AO, but its gate wasn't met, and a separate GTAO effort had poor return.
- Baked cavity or vertex contact shading.
- One previz of the shop-to-shore beat, if the surface language stays unclear.
- Reconsidering haze or shade colour: not recommended, round two tested them at clear strengths.
- Buddy rim light stays excluded by the owner's 2 November call.

## Disposition

**Bounded experiment.** Independent of the round 4 replay gate, as graphics work alongside it. Current stays the default and nothing ships to players from this. Ground adoption is deferred to the terrain and level design pass. Stop after the first comparison for the owner's choice. Panel claims and proposed budgets are untested, with no new renders or device runs behind them.
