# Procedural sky: a small, sunny prototype

> **Verdict:** Small sunny procedural sky; replaced by the summer sky default.
> **Top recommendations:** 1. Keep the plain game's lighter blue palette, gradient curve, sun, hemisphere and fog colour at every time of day. 2. Add a soft low band derived solely from the existing horizon colour. 3. Keep five merged rounded mesh groups with slow continuous drift, following camera x/z at fixed world heights.
> **Status:** superseded by [skybox](skybox.md); see [Look](../decisions.md#look).

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
| [Godot ProceduralSkyMaterial](https://docs.godotengine.org/en/stable/classes/class_proceduralskymaterial.html) | Art-directed top/horizon/ground colours and curves, with directional-light sun controls. PhysicalSkyMaterial is separate. | Closest fit: keep our existing gradient and colours, adding only a soft horizon shoulder; retain the established sun, moon and stars. |

## Build recommendations

Revised 3 November after the owner's verdict: “the original is looking pretty nice, honestly.” The deeper-blue take is superseded; these are the revised build recommendations, using the same offline sources above.

1. Keep the plain game's lighter blue palette, gradient curve, sun, hemisphere and fog colour at every time of day. Remove the LIGHT override, local time hold and full-moon default; let the existing `tod`/`moon` preview and world clock work normally.
2. Add a soft low band derived solely from the existing horizon colour. Blend the dome into it after glow so the sea-facing horizon matches at sunset and night too. Keep the original graph without the flag.
3. Keep five merged rounded mesh groups with slow continuous drift, following camera x/z at fixed world heights. Soft wrapped directional shading gives white daylight tops, slightly cool undersides, glowing orange sunset shapes and the existing quiet moonlit night. Opaque geometry, no textures, raymarching or cloud shadow casters; hide the original nine groups only in the prototype.
4. Fade the far sea's existing colour, glints and alpha into the dome's horizon inside its material, using distance plus a shallow-angle fade to avoid compressing the transition into a line from the shore. Distant land shares the existing fog colour with a shorter far range; caves keep their own range. No new pass, palette or water redesign: `?proto=water` owns that. Retain the plain game's sun glow above the haze.
5. Defer ground shadows unless their footprint can stay coherent with these camera-relative clouds. Adding an unrelated dark scrolling patch would not establish that link. First judge sky, clouds and light; report draw counts, not an assumed iPad budget.
