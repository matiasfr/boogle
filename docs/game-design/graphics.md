# 6.18 Graphics and devices

- **Production frozen sky.** Place and crossing use the [graduated water](water.md) and its one-bake
  late-morning summer sky (owner, 6 November; original cumulus art, no flag) at `tod=0.24`, with metered Neutral. The cube supplies background, directional fog,
  environment and hemisphere fill, with the matching real sun and shadows. Live tuning and Looks remain.
  The separate `sky=demo` loader, `skyBake` diagnostic and `proto=water` demo are archived; the
  [sky comparison](../research/sky-comparison.md) is historical evidence. Classic retains its own sea/sky
  under the owner's scenario-cost exception. `water=new` and `water=old` no longer select a renderer.

- **What.** The island draws with WebGPU only: Chrome and Edge, Safari 26 on iPhone, iPad and Mac, Firefox on
  Windows and Apple Silicon. Any other browser sees a note in the lobby naming the browsers that work. A loading screen
  (key art, the title, a progress bar and a gear that keeps turning: download, graphics device, shaders) paints before the game's code arrives and
  covers the lobby while the graphics device, player's body, shaders and first GPU frame prepare; the room connects meanwhile ([src/boot/](../../src/boot/)).
  A readiness or startup failure removes the loading screen and shows the existing graphics failure note in the lobby,
  with Jump in disabled. This recovery is Local.
  A physics download returning HTTP 503 gets two retries after 0.5 and 1.5 seconds, without delaying successful loads.
  Exhaustion shows a physics-download message in that same lobby, with the HTTP status and a request to reload;
  an HTTP error page is never passed to the WASM compiler. Game-chunk download failures also use the lobby failure route.
  Shader warm-up keeps a 16 s escape deadline (a cold Metal cache needs about 14 s on an M1 Max) after the frozen sky bake. It awaits water and particle compute,
  submits the real caustics/post passes, then compiles the whole scene while those native pipelines build.
  Hidden objects and objects outside the provisional camera are included.
  If the deadline expires, unfinished compute stays dormant until its native pipelines exist; remaining warm-ups
  continue after reveal. This is a bounded wait, not a guarantee of stall-free startup on every device.
  Buddy readiness precedes that shader deadline, so slow body downloads stay behind loading and avatar warm-ups use
  the dressed body. A separate 45 s Buddy deadline releases that wait with a recoverable capsule if preparation stalls;
  it keeps the original preparation alive and dresses the avatar when it finishes. The water resolution ceiling applies
  before warm-up to avoid resizing its targets on the first frame.
  Loading retains the original key art, title, decorative bar, gear and one label, per the
  [4 November owner call](../brainstorms/load-screen.md). No public groups, room row, details/copy or post-entry notice.
  Draft labels follow real work: “Loading the game” before modules; “Building the island” then “Planting the trees”
  during world construction; “Waking up the graphics” during initialization. On the default Place route,
  “Baking the sky” is selected during the frozen sky bake, before precompile.
  Shader progress selects “Warming up the shaders”, “Filling the sea”, “Oiling the train”, “Waking up the island”
  in order: thematic warm-up drafts, not separate sea/train task measurements. New labels are at least two seconds
  apart; the current line stays visible during that short hold even if its phase finishes, per the owner's follow-up.
  The next eligible label describes current work; completed steps are not queued. Failure still hides the line.
  No wait or yield is added for copy; synchronous world steps can finish without painting. New warm-up labels stop
  being selected at actual completion. Reduced motion disables gear, fades and bar creep. Pause → Dev → Perf alone retains load groups,
  navigation-relative timings and Copy last load, with its expanded preference, backed by the same invisible marks
  and telemetry. Entry gates, retries, avatar behavior and gameplay are unchanged.
  Resolution changes and bounded first-20-second hitch diagnostics join the invisible session marks; CPU section and
  pipeline labels identify observed work, while an unexplained callback gap remains unassigned rather than blamed on water.
  `?dpr=fixed`
  keeps the render resolution at full (for testing). Light is linear HDR through Neutral tone mapping (exposure 1.0, up to 1.12 at night),
  with 4x MSAA on desktop, no MSAA on touch, PCF sun shadows (2048 px, 1024 on touch) and a 512 sky cube everywhere
  (owner, 9 November; [the summer sky](water.md#the-summer-sky-6-november-2026)). Smooth edges in Pause can override MSAA on either device.
  The render resolution follows the frame rate: it starts where this
  device last settled (0.8x on a first touch visit), drops in 10 % steps to 0.6x after 2 s of slow frames and climbs back
  after 5 s of calm frames. Slow is a moving average over max(18.5 ms, 1.08x the browser cadence), or more than 10%
  of intervals over max(18.5 ms, 1.5x cadence). The 18.5 ms floor keeps high-refresh callback jitter from shedding
  detail on a fast GPU. Calm allows a median within 18.5 ms or the cadence's jitter tolerance and at most 5% late
  intervals. Cadence stops at 34 ms (Safari's 30 Hz in Low Power Mode is a cap, not a slow GPU; anything slower is
  the device); a step up that turns slow again within 10 s doubles the wait before the next one (up to 40 s).
  While the game is open and visible, a Screen Wake Lock (taken on the first input) keeps the screen from dimming
  and locking where the browser offers one (Safari, Home Screen apps from iOS 18.4, Chrome); hiding the tab lets
  it go. In a Home Screen web app (standalone) the canvas, HUD and overlays are sized to the whole screen, since iOS
  lays fixed full-screen layers out a status bar short there and left an unrendered strip along the bottom
  ([src/boot/app-fill.ts](../../src/boot/app-fill.ts)). The Home Screen app opens its bare start URL, so a visit to
  a `?room=` or `?proto=` is remembered and a bare launch of the app goes back there (a first visit in the app offers
  "Continue in room x · prototype y" under Jump in instead) ([src/features/home-app.ts](../../src/features/home-app.ts)).
  Hidden tabs skip the game frame callback, including compute and drawing; the existing background world clock remains.
  A lost GPU device, thrown game frame or 60 consecutive GPU-checked failing draw submissions stops local frame work and shows
  "The graphics stopped. Reload to keep playing in this room." with a Reload button in the lobby.
  It never automatically reloads or resets the room. Reload uses the same URL and existing server-owned progress;
  it does not promise to restore unsaved personal state. The renderer's own lost-device guard is retained.
  Visibility transitions and failures record cause, visibility, time since transition and draw counts in session marks.
  A single uncaptured error only logs and arms checks; gameplay continues. While armed, WebGPU error scopes cover
  synchronous frame work, including compute, and queue completion fences submitted work without blocking the loop.
  A checked clean draw resets the streak and disarms checks; a new error arms them again. At most eight checks are
  pending, processed in submission order. An unchecked draw, unavailable result or visibility transition invalidates
  the streak instead of inferring failure from a busy GPU. This counts failed draw submissions, not elapsed time,
  rAF callbacks or repeated console messages. Recovery and the failed-draw count join session marks.
- **Sync kind.** Local: nothing about rendering crosses the network.
- **Material palette review (6 November, stage 2).** Dev/`tune=1` exposes six independent Local Tunables:
  `material.grass`, `material.sand` (sand and paths), `material.timber`, `material.stone` (stone and cliffs),
  `material.walls` (cream plaster), and `material.roofs`. Each selects 0 Current, 1 Fresh, 2 Cool or 3 Soft.
  The owner picked 1 Fresh as the default for every family on 6 November; every visit applies it as a constant ratio
  and the other candidates stay selectable through the tunables. The
  material boards (`dev/look/beats/material-palettes.ts`, a Place fixture deleted at M13c; in git history) paired lit and `view=raw` at calibration, town,
  shore and the first gameplay spawn view. Lighting stays at the owner's cell 5: cloud radiance 0.8,
  neutral light profile 1, gain 0.12, key 1.12 and fill 3.2, with Neutral, bloom off and fixed resolution.
  Each family applies a linear RGB ratio between decoded sRGB anchor swatches, retaining authored colour
  variation, grain and existing roughness/metalness/normal response. Town pieces use semantic construction
  tags, so a roof and a scaffold sharing an authored colour remain independently selectable. The six
  calibration anchors are controlled samples; Buddy, reference presets, grey/chrome balls and charts stay fixed.
  Coverage is the default Place terrain, town buildings, bridges and arrival timber. Tree foliage,
  signs, painted accents, coloured shop plaster, special props and the cove shore retain their
  own palettes, and so do logs (piles, stacks, carried bundles): their bark, amber band and cut ends are their own
  colours, and the timber ratio turned them grey and darker (6 November playtest: a pile's lit bark 57,36,32 and
  cut ends 180,174,163 return to 70,42,17 and 192,166,114). Ordinary visits multiply by the Fresh ratio as a constant; tuning swaps it for live uniforms
  and instance-colour uploads. These boards are owner review, not a device test.
- **Base-colour diagnostic.** `?view=unlit` swaps lit surfaces to their authored albedo/texture and vertex colours,
  retaining masks, transparency, skinning and instance transforms. Lighting, shadows, environment, material AO,
  emissive light, fog and water-receiver caustics/wetness are excluded. `?view=raw` also bypasses the post chain,
  exposure and tone mapping, retaining the required linear-to-sRGB display encoding. Existing unlit effects keep
  their authored output. The current sky and water remain by default; `viewSky=off` and
  `viewWater=off` hide them independently. In Dev, Local Tunables `view.mode` (0 lit / 1 unlit / 2 raw),
  `view.sky` and `view.water` (0 hidden / 1 current) switch live. First use compiles diagnostic materials.
  Returning all three to defaults removes the render/draw hooks. Ordinary visits load no diagnostic chunk and
  add no frame work. No assets, palettes or shipped defaults change. Frozen comparisons do not establish feel
  or device performance; not tested on a device.
- **Overlap view (z-fighting).** `?view=overlap`, Local Tunables `view.mode` 3, or Dev → Z-fighting → Overlap
  view on/off. Pass 1 stores each opaque pixel's draw id, instance and view depth; pass 2 redraws without a depth
  test and keeps fragments of a *different* draw or instance within 2 mm + 0.05 % of depth of that surface. The
  screen shows grey shaded by facing, solid magenta where such fragments cover an area, faint pink on edge-on seams
  where meshes only meet. Hovering (or the screen centre under pointer lock) names the pair within 12 px. Contacts
  inside one merged draw share an id and do not show: use the Dev scan or `npm run zfight`. Code loads only when the
  mode is chosen; off, it adds nothing to any frame. Proof: [yard sleepers](../reviews/overlap-view/yard-sleepers-overlap.png)
  beside the [normal view](../reviews/overlap-view/yard-sleepers-normal.png) (`--rail-seed house-built`).
- **Player Graphics.** Pause → Graphics lazily loads a small page using the existing modal's keyboard,
  gamepad and touch navigation. Desktop puts it beside the scene; phone uses a scrollable card with the
  scene visible above. No new bindings. Choices are Local, bounded, and stored in `boogle.graphics.v1`;
  storage failures keep live choices for the visit and explain that reload-only changes cannot apply.
  Auto (also Reset to Auto) removes that key and uses the existing adaptive resolution, water ceiling,
  Display cadence and route defaults. With no saved choice, opening the page changes nothing.
  Quality requests 100% / 60 fps; Performance requests 80% / 60 fps; Battery Saver requests 60% / 30 fps.
  All three retain seabed light: the native shore comparison found that removing it noticeably flattened
  shallow water, while the research's cost measurements were unresolved. Its individual control remains
  optional. The existing water ceiling still wins (normally
  60% on touch); the page explains a constrained request. These are bounded starting presets, not measured
  optimal device tiers. They change no tone, colour, bloom, exposure, shadows, geometry, waves, queries,
  colliders, gameplay or state seen by peers. Smooth edges stays independent across explicit presets;
  Auto resets it to the device default. Individual changes display Custom.
- **Five player controls.** Resolution (Auto / 100 / 80 / 60%), Frame limit (Display / 60 / 30), Smooth edges
  (On / Off), Seabed light (On / Off) and Detail (above). Seabed light switches the caustic tile off, hidden with an
  explanation when its route owner is absent. Smooth edges shows requested versus current state and a
  Reload now button, including after reset; it never mutates live sample-count attachments. Reduced shadow
  maps and camera-comfort adapters from the research are not implemented, so the page does
  not advertise them. Point lights remain Dev-only because their visible effect was unverified
  in the Mac review; there is no aggregate ambient switch that promises those savings. This narrows recommendations 1, 2 and 6 of [graphics settings](../research/graphics-settings.md)
  to the current adapters and [measured limitations](../research/graphics-switch-costs.md).
- **Detail ladder (phone tier, 7 November owner call).** When a device must shed load it drops resolution first,
  then sea detail, then sun shadows, then MSAA. Adaptive resolution is the first rung; below its 0.6x floor the
  governor in [adaptive-res.ts](../../src/features/adaptive-res.ts) steps `detail` down after 4 s of slow frames
  (Simpler sea: `seaDetail` low, half the sea grid's spokes and rings; No shadows; then MSAA off for the next
  load) and restores the last rung after 10 s at the display's cadence, doubling that wait when a restore does
  not hold; resolution climbs only once every rung is back. The rung is remembered per device
  (`boogle.detail.v1`); the MSAA flag is never lifted by the governor, only by a player Detail or preset choice.
  It is measured rather than detected: the M4 iPad Pro should never reach the floor, so it keeps full detail.
  Pause → Graphics → Detail (Auto / Full / Simpler sea / No shadows / Lowest) fixes a rung; `?dpr=fixed`
  harness pages ignore the remembered rung. Sun shadows switch through shadow intensity and map updates while
  the light's shader key stays fixed: no receiver-pipeline rebuild or missing-model interval. Off retains receiver
  sampling but skips the shadow pass; the frozen sky leaves these controls to the Graphics owner.
  Chromium on Mac verification and limits: [Detail governor fix](../research/detail-governor-1115.md).
  Not tested on Grant's device.
- **Coarser far ground (on by default since 11 November).** `farGround`: the Place ground draws as 192 m tiles with
  bounds (out of view culled) and far tiles use 4 m cells from 180 m and 8 m from 420 m, full resolution on every
  tile border so there are no cracks ([far-ground.ts](../../src/place/far-ground.ts); the pattern is Chunked LOD, see
  [rendering](../agents/rendering.md)). Matched stills: [performance research](../research/performance.md), section 10.
  `?dev=1&graphics=farGround:false` is the old one-mesh ground. (`farSea` went with Ultra Water.)
- **Home's ground (14 November).** Grass runs down to a per-pixel beach line; sandstone, with subtle beds, thin
  seams and the cove's rock tile, appears where the collider is unwalkable or the broad slope is steep. The material
  inputs are packed on the land's own vertices; geometric cliff ledges and the wedge variants are removed. The land
  draws the collider's own grid, including the unchanged fine cove patch, with the far-ground tiles described above.
  The ledge removal preserved heights and colliders; the later bench grading below deliberately reshapes them.
  `?terrain=0` keeps the earlier ground material.
  The lower gorge wall has broader, more continuous green patches without the ledges; the orchestrator accepted that
  difference after opening matched camera-9 stills. The cliffs retain their warm banded-rock character. Not tested on
  a device. [Plan and proofs](../plans/terrain-clean.md); earlier rounds are [history](../archive/plans/terrain-pass.md).
  Sand meets the gorge's bank across a nominal 7 m distance blend with per-pixel wander. The same packed attribute
  carries unsaturated gorge distance; no extra texture or geometry is added. The broad-slope rock rule remains
  unchanged: its proposed gate failed visual review and is unfinished in Part 2a.
- **Paths read as paths (14 November; owner: "it should be more clearly looking like a path").** Every footpath on
  Home is drawn per pixel from a distance field of the path lines ([path-surface.ts](../../src/place/path-surface.ts);
  one 781 × 541 RGBA16F texture, 3.4 MB), over whatever ground is underneath and winning over slope rock within its
  width: cool grey-brown packed earth (Fresh edge `#6e5f50`, middle `#93836f`), lighter where feet go and distinct
  from the warm sandstone; a dark cut edge with a painted bank, a darker verge, small
  stones. Climbs use the same plain packed earth as level paths, with no painted timber risers or their highlights
  ([owner, 15 November](../decisions-look.md#d-2026-11-15-plain-path-climbs)). Bold paths are 6 m wide, the others
  3.8 m. The graded shoulders extend one 2 m cell diagonal beyond those widths (5.9/8.8 m bold inner/outer,
  4.8/7.7 m plain). Paint widths remain independent. The Round's lowered green and ability-pad approaches retain
  their previous grading. Twelve ordinary trees are cleared, with surviving harvest IDs unchanged.
  Both quarry descents have a 4 m bench, eased into flat bends and bridge run-ins, with a 6 m square level landing
  at local (-10, 150). The shore ramp uses the same eased profile for terrain and paint, with level turns at
  (-177, 28) and the hop's (-165, 32). Narrow prop-support blends keep the cart wheels and shore footing grounded
  without raising the tread. One more tree beside the quarry turn is hidden locally; its harvest slot is retained.
  The path field's own height bounds the painted bench, with the original ground-facing facet cutoff retained so
  tread colour, stones and painted normals do not climb the wall. The verge darkens only the bench outside the
  horizontal tread footprint; a wall rejected by the bench never becomes a dark verge. Exterior cut-bank paint is
  removed: the sandstone keeps its own colour right down to its foot. The canyon, quarry and shore treads are regraded; short path-end/bend irregularities elsewhere and the
  dotted crease remain recorded findings in Part 2b.
- **Canyon kit: Chunky Sunshine blocks** ([owner, 24 November](../decisions-look.md#d-2026-11-24-canyon-kit-chunky-sunshine);
  [terrain-clean](../plans/terrain-clean.md#part-3-custom-meshes-to-dress-the-world-proposal-not-a-commitment), Part 3).
  The canyon climb's east wall, from 4.5 m above the bridge round the top bend, is faced with big sandstone slabs
  (`assets/src/terrain-kit.py`: 2.4 m courses stepping back 0.32 m each, a third of the blocks two courses tall, 0.22 m
  bevels, a broken top), with boulders at its foot, broken caps on the plateau's lip and low rock at the waterline. The
  pieces wear the cliff's own rock (`rockLayers` in [ground-material.ts](../../src/place/ground-material.ts)), each block
  shaded a little lighter or darker and its sky-facing faces sun-bleached. They are scenery with box solids: the tread
  keeps its full width (every solid 0.4 m outside its edge), the river side stays open, nothing within 6 m of any
  gated place in the layout (pads, secrets and where each is fetched from, devices, pillars, sites), no solid in a
  rail's loading gauge, and no piece a new way up (every standable top flush, out of reach or a low perch, the gate in
  `npm run level-check`).
  Records: `terrain.*` (src/content/prefabs/terrain.ts), placed by the cliff kit's generator
  [dev/prefab/cliff-kit.ts](../../dev/prefab/cliff-kit.ts), one level an area (the canyon is the first), from the
  ground; each area its own instance batches (the canyon's seven, 6,688 triangles a pass). The kit goes on every cliff
  area by area ([cliff-kit-everywhere](../plans/cliff-kit-everywhere.md)). At the rim lookout, two-course faces follow
  the height contours on both riverbanks and above the camp path. The climb's existing faces meet those upper courses.
  The crowns are too steep to stand on, and the descent, bridge approach and climb keep their full tread width.
- **Lighting model: three's plain Standard lighting** (10 November owner call: baseline shading, after trying toon
  style B live as the default). No stepped light, cool shade side or rim on characters or the world. The comparison
  is kept as research: [toon-shading](../research/toon-shading.md).
- **Production-water Looks.** Place or crossing with Dev or `tune=1` adds the [Looks dock comparison](dev-menu.md#looks) at the active water-post owner: Current, metered Neutral, restrained Sunny AgX, AgX Punchy and Sunshine water. All use the procedural frozen sky and one shared meter/output pass. A/B only changes uniforms; saved choices prepare behind loading. This is a Local preview, not a default change. Ordinary visits keep the shipped graph and do not load comparison code.
  Explicit Graphics bloom overrides survive look selection, including Neutral. A saved bloom-on choice uses
  the same prepared comparison graph as bloom-off. Graphics meter-off holds exposure and skips meter work;
  Looks exposure lock independently freezes adaptation. Neither control selects the other tool's settings.
- **Tone comparison.** The classic-only `tone=` comparison was removed with classic home (6 November); every route
  uses the production water's post owner, so use Looks for comparisons. History:
  [comparison rationale and reproduction](../research/tone-comparison.md).
- **Files.** [src/render/scene.ts](../../src/render/scene.ts), [src/features/adaptive-res.ts](../../src/features/adaptive-res.ts),
  [src/features/wake-lock.ts](../../src/features/wake-lock.ts);
  rules for drawing things in [src/render/README.md](../../src/render/README.md).
- **Dev cost controls.** With Dev enabled, the lazy **Graphics** dock panel exposes owned Local settings for
  resolution, frame limit, shadows, MSAA, caustics, bloom, exposure meter and the
  two pooled point lights. Lab grass and lab post effects are available only when their existing owner and
  effects are present; they do not load onto the place page. Each row states the work skipped and whether the
  change is live, rebuild or reload. These are cost experiments, not player presets or an approved low look.
  The separate player page above offers only its five bounded controls. No geometry, waves, queries,
  world population or gameplay controls are included.
- **One Local resolution/cap owner.** `render/quality.ts` combines adaptive resolution with the water ceiling
  using their minimum, preserving the existing default scale. Dev offers Auto / 100 / 80 / 60% and Display /
  60 / 30 rendered fps. A cap skips only scene/output rendering: input, physics, networking and the water field
  continue. Adaptive observations retain uncapped callback timing. Dev choices are bounded
  and stored separately in `boogle.dev.graphics.v1`; **Restore baseline** clears them, and Dev Off removes them.
  Closing the dock preserves them. Adapters register without Dev for player choices; the Dev panel chunk
  is still not loaded. Precedence is route baseline → player choice → explicit Dev override while Dev is on.
  Dev's Restore baseline removes only Dev overrides, returning to player choices; player reset leaves Dev
  overrides intact and explains their priority. Dev Off clears only Dev keys, retaining player choices.
  Baseline restore also resets registered owners whose effect is temporarily absent from the current lab
  preset, so returning to a grass/post preset restores those effects too.
- **Actual work removed.** Caustics skip the receivers' two tile reads. (Ultra's spray, marine snow, shafts and wet
  lens were removed with it on 10 November; see [water](water.md#the-sea-10-november-2026).) Bloom bypasses its chain but retains allocations; meter holds its last valid exposure and skips meter,
  adaptation and history copy (one initialization result remains necessary). Point lights skip selection and
  lit membership, retaining emissive source glows. Shadows skip shadow rendering; MSAA chooses stored 4x or
  1x samples at reload. Live sample-count changes are unsupported: a broker check exposed cached depth-copy
  and bind-group mismatches, so the requested value stays pending until reload. With Dev enabled,
  `graphicsMsaa=0|1` selects the startup value for matched reload captures. Water, colliders, navigation and
  interaction cues stay intact.
- **Agent lighting comparisons.** The existing numeric Tunables API also exposes Local `sky.keyGain` and
  `sky.fillGain` (0–8, defaults 1.12 and 3.2). It reports per-control revisions and sources; no in-game UI is added.
  The frozen-shot queue validates patches, flushes the light owner's presentation without advancing simulation
  or shader time, and records actual directional/hemisphere light state. Exposure stays `post.centre=0.12` in
  the first town wedge.
- **Owner-selected cloud and light defaults (6 November).** The production late-morning sky uses cloud/warmth
  cell 5: `sky.cloudBrightness=0.8` and `sky.lightColourProfile=1` (neutral). Runtime startup and the tunables
  catalog share those defaults. The owner kept the earlier town board's cell 1: surface gain `.12`, key `1.12`,
  fill `3.2`; Neutral tone mapping remains (the underwater `+0.81 EV` went with Ultra on 10 November). Cloud radiance is reduced before atmospheric
  compositing and the sky-derived fill is re-read at loading; shape and coverage stay fixed. Neutral replaces
  key, upper-fill and ground-fill chromaticity with equal linear RGB while preserving each source light's
  luminance. It is not a Kelvin setting or a warm post grade. Material colours and the separate airborne arrival
  cloud deck are unchanged. `dev/look/beats/cloud-defaults.ts` (deleted at M13c, in git history) compared the old `1/0` settings against unpatched
  production defaults at spawn, town and shore on the same frozen current-source scene. Device appearance and
  real-time feel require owner replay; a successful capture is not device validation.
- **Measurement and hitches.** Graphics **Measure on/off** uses Performance's real-frame profiler for warmed
  on/off/off/on samples, freezes resolution and Display cadence during collection, then restores prior Dev
  overrides. It reports frame-interval proxy, CPU submission and GPU timestamp span separately, never summed
  pass timers. Incomplete GPU spans are unavailable; actual display presentation and physical occlusion are
  unknown. The copied snapshot includes settings, route, camera, pixels, device and all samples. Repeated
  samples and a contention label do not prove machine exclusivity. MSAA requires separate matched reload
  captures and cannot use the live Measure button. Shadow/light membership, MSAA reload and first bloom
  enable can compile or allocate.
  Live does not mean hitch-free. The 16-second startup escape remains in force.
- **Unchanged instance data.** Station stock rebuilds its fixed log, rail and stone slots only when their
  displayed counts change. The continuous track layer's rack keeps its construction-time matrices when
  its visible count changes. Contact-shadow blobs skip writes only when all sixteen Float32 matrix values
  already match; moving blobs still update. Geometry, materials, caster coverage and gameplay state are unchanged.
- **Instance-write measurements (2026-11-05).** At town/T1/cove, in solo and co-op, 300-frame samples reduced
  rack/log/rail buffer dirty marks from 300 each to 0, and contact-blob marks from 600 to 0. These are dirty
  marks, not GPU transfer counts. Native-clock co-op town stayed at 212 draws / 67 shadow draws before and
  after; solo town was 209 → 207 as moving actors varied. Texture allocation estimates stayed at 217,111,689
  bytes solo / 217,199,048 co-op. Solo town CPU frame work was 4.756 → 4.682 ms under contention, so no timing
  improvement is established. Three frozen identical-upload controls had zero changed pixels; these prove
  same-state buffer equivalence, not all animated cross-build states. Working solo and the T1 segment replay
  passed; working co-op failed the same recovery guard before and after. Quiet-machine timing and device
  validation remain unavailable. Full pose counts, cost owners and manifests: [optimization report](../research/perf-pass-2026-11-05.md).
- **Limits.** Presets are owner-requested starting settings, not an approved final look or device budget. No physical mobile validation. Device
  cost observations and inspected visual evidence are in the [Mac graphics switch report](../research/graphics-switch-costs.md).
  The repeated 1440×900 captures were contended; smaller differences often changed sign. Spray, daylight
  light/shadow footprints and bloom appearance were not clearly resolved in the inspected views. These
  observations do not select a performance tier or replace the owner's playtest.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
