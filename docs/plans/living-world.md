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

## Lit particles (after step 3)

Ordinary timber chips read almost black against the grass, landing dust darkened the timber behind it and the forge's rail-conversion exhaust drew charcoal against blue sky. Fresh-cut chips already read pale through exposure compensation. Physical effects now declare `daylight: true`. The pool multiplies all three colour keys by the stack puffs' sun and sky at birth, using reusable colours and the existing draw. Emissive and reward calls keep their authored RGB and intensity.

The four matched views replay the production birth recipes at the Camp and forge. The chop stays pale, timber shows its three browns, the landing ring reads sandy and the conversion exhaust reads pale against the sky. The sheets exercise the view independently of the progression triggers. [Before](living-world/particles-before.jpg) · [After](living-world/particles-after.jpg).

With the Dev sun below the horizon (`sky.time = 0.75`) and sky fill reduced to 0.45, the dust is dim ochre against the grass and the nearby teal reward motes stay bright. The game normally holds its summer lighting. [Night lighting check](living-world/particles-night.jpg).

<details>
<summary>Pool callers and their authored sRGB colours</summary>

| Lighting | Effect | Colours |
| --- | --- | --- |
| Daylight | Landing, rail lay, construction, hauling, impacts and other shared contact rings | `#cdbb9a → #d8cbb1 → #e0d8c5` |
| Daylight | Ordinary timber, fresh-cut wood and bark, stone, shed leaves | Timber `#e5b77c #bb793e #f2d2a0`; cut `#f0d7a4 #e3c48b #f6e2b8 #7a5430`; stone `#9caaa9`; leaves `#4f9c44 #3f8a3a` |
| Daylight | Guest dust, skid/splat and title dust, sand impact, crate landing, sea gate, title splinters, fall streaks | `#e9dcc0`, `#e8d6a6`, `#f1dca8`, `#d8c49a`, `#d8cdb4`, `#a97a48`, `#ffffff` respectively |
| Daylight | Wake rust, flake, dust, soot and steam | `#8a5a34 #6d4426 #cdb48c #7c7770 #f6f4ee` |
| Daylight | Forge whistle, conversion exhaust, garage steam, roundhouse steam, Works ash and demolition dust | `#f6f4ee`, light-look `#d9d5cc` or `#5d5a55`, `#e9eef2`, `#ece8e0`, `#d9d4cb`, `#cfc6b3` |
| Daylight | Water-entry foam, crossing prototype spray and loco smoke, glider wingtip wisps | sRGB (0.96, 0.99, 1), `#ffffff`, `#ece8e0`, `#f4efe4` |
| Already daylight | Ambient track-machine, forge and kiln stacks | `#eee8dc`, now through the shared path |
| Authored glow | Axe aura and second jump, find, great tree, boiler, breaker, roundhouse, Ring rivet | Axe `#fff4bd #ffd36b #c9b8ff`; find `#bfe9ff`; tree `#ffd76a`; boiler/breaker/roundhouse `#ffdc7a`; rivet `#ffd25a` |
| Authored glow | Workshop fire, Works flame and embers, forge reward sparks, garage sparks, folk and dino sparks | Workshop `#ffe9a8 → #ff8a1c → #a8260a`; Works `#ff7a1c #ffb14a`; forge `#ffb347 #fff1c2`; garage `#ffd27a`; folk `#ffd98a`; dino `#fff4b8` |
| Authored glow | Crossing, pier and Far Head fireworks and trails | `#ffcc63 #39e6c6 #ff7272 #b9a0ff`, trail `#ffe9b0` |
| Authored celebration | Reward/chest sparkles and opening dust ring, ability motes and plinth, fanfare and box confetti | Gold `#ffd76a`, teal `#39e6c6`, ability tints `#428bff #ac72ff #ff9466` and ivory `#fff4dc`; ring uses the contact dust keys; confetti `#ff4f4f #ffcf33 #2f8cff #4fdc7a #ff7ad9 #ffffff` |
| Protected, original path | Train kit steam and running smoke, curio paper and glints, workshop flue smoke | `#e9eef2 #ece8e0`, `#ded5c2 #ffe9a8`, `#5d5a55` |

Only fresh and ordinary timber, landing dust and rail-conversion smoke were replayed for this comparison. The ambient stacks have step 3's looks. Rail-lay contacts, stone, leaves, the other dust and smoke callers, spray, air wisps, protected effects and glows beyond the teal reward motes were audited in source only in this pass.

</details>
