# A breeze at Home

1. Share a renderer-clock wind node in `src/render/wind.ts`. In `src/place/look.ts` let Home's existing green crowns read the passing wave. A fixed 1200 × 750 Camp ridge motion sheet should show neighbouring tips bending together above steady trunks. Capture the same camera with reduced motion.
2. Let a verge of grass beside the Camp path read the same node. Extend the near tuft batch in `src/place/meadow-flowers.ts`, using the blade study in `src/debug/look-world.ts`. Keep the walked surface clear. One low camera looking along the path should catch the gust in grass and crowns together.
3. Extend `src/render/particles.ts` and `src/render/particle-effects.ts` with round puffs and local emitters at the track machine and chimneys. One working-machine look should show puffs drifting away while the operator stays visible.

4. Drift one broad cloud field across Home’s meadow and exposed gorge slopes. Sample the existing cove tile in the ground material before the path layer. Inspect the ridge over 20 seconds and the forge in the deepest shade.
5. Give one river bend a downstream flow cue and gather foam where the current meets one rock.
6. Break up the wash on one beach and let foam collect around the piles of one pier.

These steps use local presentation. Shared rules, wire, saves, WORLD_NS and railway files are outside this work. Low Detail retains crowns and the existing tuft batch. The near blades now use one sine in place of two and reuse the same texture samples. Thin puff emission in step 3. With reduced motion keep foliage still and omit ambient puffs.

## Design review (2026-11-28)

Decided (2): the living-world pass fits the owner's work beyond railway rules ([28 November](../decisions-process.md#d-2026-11-28-backlog-beyond-rail-rules)). The meadow already dresses Home and keeps clear of work and walking surfaces ([14 November](../decisions-look.md#d-2026-11-14-the-meadow-is-the-default-ground)). Step 2 therefore extends the existing tufts. The [research](../research/living-world-shaders.md) supplies the order.

Defaults (3): one gentle wave about every four seconds, up to 0.24 m at a crown tip; one grassy verge beside the Camp path; retain crowns at low Detail and suppress optional motion under reduced motion. New calls: none.

Step 1 adds zero draws, vertices, textures or custom uniforms. Each crown vertex samples one sine using the existing renderer time uniform and its horizontal position, weighted toward the top. No per-object updates or per-frame allocations.

Step 2 reuses the spare keep-map channel for the Camp ridge bend and the tread mask for its verge. The near tuft batch before and after is one draw and 23,000 triangles on desktop, one draw and 9,200 triangles on phone. No new texture, render pass, per-frame allocation or CPU update.

Step 3 uses the existing particle pool and sprite draw. Only live puff slots sample the wind during compute. Each resident stack uses its existing view update, with births within 90 m of the camera. Ambient intervals are 0.65 s for the awake layer, 0.8 s for the lit forge and 0.85 s for the lit kiln. Lower Detail doubles those intervals. The operator's chuff still follows the machine's movement. Puffs expand and fade over three seconds.

The sun and sky fill light the cream pigment at birth so the puffs share the scene exposure. Two overlapping soft volumes give each puff one round outline. Births vary in diameter, orientation, rise and lateral velocity. [Working layer](living-world/working-stack-motion.jpg), [lit kiln](living-world/lit-kiln.jpg), [lit forge](living-world/lit-forge.jpg).

### Step 4 review

| Call | Kind | Reason |
| --- | --- | --- |
| Preserve the meadow dressing and packed-earth tread | Decided | The [meadow](../decisions-look.md#d-2026-11-14-the-meadow-is-the-default-ground) and [plain path](../decisions-look.md#d-2026-11-15-plain-path-climbs) remain readable while the player works. |
| Deepest shade multiplies linear RGB by 0.88, 0.90, 0.94 | Default | Cool the grass gently. The material tint affects both direct and indirect light. |
| Repeat every 112 m | Default | The warped lobes in the cove tile's blue channel give patches roughly half the repeat width. |
| Drift at 0.9 m/s along the shared wind | Default | The production sky bakes its clouds at load. Slow ground drift suggests the same weather without tracking individual cloud shapes. |

The local camera receives one filtered sample per ground fragment at every Detail level. Reduced motion fixes the UVs in world space. The existing tile, terrain draws and path overlay carry the effect. The forge and signs use their own materials.

From the ridge the clearest movement is on the open grass beside the logs. The broad cool patch slides away and the slope brightens. Both bends of the packed path stay clear. [Before](living-world/cloud-before.jpg) · [20-second ridge sheet](living-world/cloud-ridge-motion.jpg)

The fixed pattern reaches full strength at the forge bill board. Its log count and delivery frame are legible, and the grass stays steady as workers pass. [Forge](living-world/cloud-forge.jpg) · [12-second reduced-motion comparison](living-world/cloud-forge-reduced.jpg)
