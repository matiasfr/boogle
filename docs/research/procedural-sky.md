# Procedural sky: a small, sunny prototype

3 November 2026. Serves DESIGN.md 1, **Toys before chores**: “Every system must be fun to mess with before it has goals.” A place worth lingering in supports that play. Build behind `?proto=sky`; no change to the shared clock.

## Evidence and references

Read [sunshine-look](sunshine-look.md) first: its verified interview and rendering references establish the warm sunlight / cool open shade direction; they do not establish Nintendo's cloud shaders. This task prohibits external network access, so this is an offline synthesis of the repository's research, inspected Boogle code and Beautiful Corner shot 1. Links below are source references, **not newly fetched verification**. Engine summaries are established API descriptions recalled offline; exact current versions remain unchecked.

- **Super Mario Sunshine:** saturated blue negative space, luminous horizon, small chunky white cloud groups and a hot sun. These are visual targets, not a claim about its implementation. The [developer interview](https://shmuplations.com/mariosunshine/) cited by sunshine-look supports the holiday-place intent. Keep glare near the sun rather than washing out the entire sky.
- **The Wind Waker / HD:** edit the sky into clear masses and silhouettes. The [Nintendo interview](https://www.nintendo.com/en-za/Iwata-Asks/Iwata-Asks-The-Legend-of-Zelda-The-Wind-Waker-HD/The-Legend-of-Zelda-The-Wind-Waker-HD/5-Over-designed/5-Over-designed-807330.html), already assessed in sunshine-look, discusses warmth and breeze through light and colour. Rounded cloud lobes and generous gaps are our interpretation, not a reconstruction of its shader.
- **Breath of the Wild:** the useful visual lesson is clouds and distant land belonging to the same changing light, while foreground shapes stay readable. [Nintendo's GDC talk](https://www.gdcvault.com/play/1024562/Breaking-Conventions-with-The-Legend) is a primary development reference, not evidence here for a specific cloud algorithm. The repo's [broader survey](bang-for-buck-aesthetics.md) has only secondary rendering leads; don't turn those into a claim that this prototype implements BotW clouds.
- **A Short Hike:** cohesive simplified forms and summer colour beat fine noise. The [developer's account](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/), already read in sunshine-look, supports the simplification; it does not document a cloud renderer. Keep our clean resolution and use soft shape shading.
- A concrete mesh-cloud precedent is **Sea of Thieves**: opaque cloud geometry and fake scattering, described in [the technical-art paper](https://history.siggraph.org/wp-content/uploads/2022/09/2018-Talks-Ang_The-Technical-Art-of-Sea-of-Thieves.pdf) assessed in [bang-for-buck aesthetics](bang-for-buck-aesthetics.md). We use simple lobes, without its reduced-resolution compositing system.

## Standard engines, and this choice

| Engine | Standard approach | Boogle's smaller choice |
| --- | --- | --- |
| [Unity Procedural Skybox](https://docs.unity3d.com/Manual/shader-skybox-procedural.html) | Sun size/convergence, atmosphere thickness, sky/ground tint and exposure; scattering-based sky, separate scene lighting. | Keep palette controls and an analytic sun halo; no scattering model or skybox texture. |
| [Unreal Sky Atmosphere](https://dev.epicgames.com/documentation/en-us/unreal-engine/sky-atmosphere-component-in-unreal-engine) | Physical atmosphere tied to directional lights; [Volumetric Clouds](https://dev.epicgames.com/documentation/en-us/unreal-engine/volumetric-cloud-component-in-unreal-engine) are a separate participating medium. | Couple light and sky colour, but use the existing dome and five mesh groups. No volume integration or additional pass. |
| [Godot ProceduralSkyMaterial](https://docs.godotengine.org/en/stable/classes/class_proceduralskymaterial.html) | Art-directed top/horizon/ground colours and curves, with directional-light sun controls. PhysicalSkyMaterial is separate. | Closest fit: extend our gradient with a distinct horizon shoulder and zenith ramp; keep the established sun, moon and stars. |

## Build recommendations

1. Start with `place/look.ts` LIGHT: top `#2a6fe0`, horizon `#a8d0f5`, curve `0.42`, sun `#ffe6bf` at 3.1, hemisphere sky `#b4cffa` / ground `#c4b48c` at 2.3. Blend out above sunset, leaving its existing palette and night readability. Hold local time at 0.2 unless `tod` is supplied.
2. Replace the single daylight power ramp with two smooth bands, preserving the existing curve outside daylight. A narrow bright horizon and deeper upper sky should read even when looking away from the sun.
3. Use five merged rounded mesh groups, camera-relative with slow continuous drift. Soft wrapped directional shading plus a cool underside gives body without lighting every lobe through a shadow map. Opaque geometry, no textures, no raymarching, no cloud shadow casters. Hide the original nine groups only in the prototype. This avoids both full-screen cloud noise cost and the origin-ring limitation.
4. Let a localized sun halo exceed 1 in linear HDR during daylight; keep the existing sunset glow and moon/stars. No global bloom. Inspect the sun-facing view as well as the requested reference view.
5. Defer ground shadows unless their footprint can stay coherent with these camera-relative clouds. Adding an unrelated dark scrolling patch would not establish that link. First judge sky, clouds and light; report draw counts, not an assumed iPad budget.
