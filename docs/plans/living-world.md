# A breeze at Home

1. Share a renderer-clock wind node in `src/render/wind.ts`. In `src/place/look.ts` let Home's existing green crowns read the passing wave. A fixed 1200 × 750 Camp ridge motion sheet should show neighbouring tips bending together above steady trunks. Capture the same camera with reduced motion.
2. Let a verge of grass beside the Camp path read the same node. Extend the near tuft batch in `src/place/meadow-flowers.ts`, using the blade study in `src/debug/look-world.ts`. Keep the walked surface clear. One low camera looking along the path should catch the gust in grass and crowns together.
3. Extend `src/render/particles.ts` and `src/render/particle-effects.ts` with round puffs and local emitters at the track machine and chimneys. One working-machine look should show puffs drifting away while the operator stays visible.

All three steps use local presentation. Shared rules, wire, saves, WORLD_NS and railway files are outside this work. Low Detail retains crowns and the existing tuft batch. The near blades now use one sine in place of two and reuse the same texture samples. Thin puff emission in step 3. With reduced motion keep foliage still and omit ambient puffs.

## Design review (2026-11-28)

Decided (2): the living-world pass fits the owner's work beyond railway rules ([28 November](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules)). The meadow already dresses Home and keeps clear of work and walking surfaces ([14 November](../decisions-look.md#d-2026-11-14-the-meadow-is-the-default-ground)). Step 2 therefore extends the existing tufts. The [research](../research/living-world-shaders.md) supplies the order.

Defaults (3): one gentle wave about every four seconds, up to 0.24 m at a crown tip; one grassy verge beside the Camp path; retain crowns at low Detail and suppress optional motion under reduced motion. New calls: none.

Step 1 adds zero draws, vertices, textures or custom uniforms. Each crown vertex samples one sine using the existing renderer time uniform and its horizontal position, weighted toward the top. No per-object updates or per-frame allocations.

Step 2 reuses the spare keep-map channel for the Camp ridge bend and the tread mask for its verge. The near tuft batch before and after is one draw and 23,000 triangles on desktop, one draw and 9,200 triangles on phone. No new texture, render pass, per-frame allocation or CPU update.
