# 6.18 Graphics and devices

- **Production frozen sky.** Place and crossing use the [graduated water](water.md) and its one-bake
  late-morning atmosphere at `tod=0.24`, with metered Neutral. The cube supplies background, directional fog,
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
  with 4x MSAA on desktop, no MSAA on touch, and PCF sun shadows (2048 px, 1024 on touch). Smooth edges in Pause can override MSAA on either device.
  The render resolution follows the frame rate: it starts where this
  device last settled (0.8x on a first touch visit), drops in 10 % steps to 0.6x after 2 s of slow frames and climbs back
  after 5 s at the display's cadence. Slow is over 18.5 ms, or over 1.08x the cadence the browser delivers frames at, a
  cadence that stops at 34 ms (Safari's 30 Hz in Low Power Mode is a cap, not a slow GPU; anything slower is the
  device); a step up that turns slow again within 10 s doubles the wait before the next one (up to a minute).
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
- **Base-colour diagnostic.** `?view=unlit` swaps lit surfaces to their authored albedo/texture and vertex colours,
  retaining masks, transparency, skinning and instance transforms. Lighting, shadows, environment, material AO,
  emissive light, fog and water-receiver caustics/wetness are excluded. `?view=raw` also bypasses the post chain,
  exposure and tone mapping, retaining the required linear-to-sRGB display encoding. Existing unlit effects keep
  their authored output. The current procedural sky and water remain by default; `viewSky=off` and
  `viewWater=off` hide them independently. In Dev, Local Tunables `view.mode` (0 lit / 1 unlit / 2 raw),
  `view.sky` and `view.water` (0 hidden / 1 current) switch live. First use compiles diagnostic materials.
  Returning all three to defaults removes the render/draw hooks. Ordinary visits load no diagnostic chunk and
  add no frame work. No assets, palettes or shipped defaults change. Frozen comparisons do not establish feel
  or device performance; not tested on a device.
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
- **Four player controls.** Resolution (Auto / 100 / 80 / 60%), Frame limit (Display / 60 / 30), Smooth edges
  (On / Off) and Seabed light (On / Off). The last uses the real caustics producer skip, hidden with an
  explanation when its route owner is absent. Smooth edges shows requested versus current state and a
  Reload now button, including after reset; it never mutates live sample-count attachments. Reduced shadow
  maps, 30 Hz caustics and camera-comfort adapters from the research are not implemented, so the page does
  not advertise them. Spray and point lights remain Dev-only because their visible effect was unverified
  in the Mac review; there is no aggregate ambient switch that promises those savings. Presets keep the
  other water effects. This narrows recommendations 1, 2 and 6 of [graphics settings](../research/graphics-settings.md)
  to the current adapters and [measured limitations](../research/graphics-switch-costs.md).
- **Production-water Looks.** Place or crossing with Dev or `tune=1` adds the [Looks dock comparison](dev-menu.md#looks) at the active water-post owner: Current, metered Neutral, restrained Sunny AgX, AgX Punchy and Sunshine water. All use the procedural frozen sky and one shared meter/output pass. A/B only changes uniforms; saved choices prepare behind loading. This is a Local preview, not a default change. Ordinary visits keep the shipped graph and do not load comparison code.
  Explicit Graphics bloom overrides survive look selection, including Neutral. A saved bloom-on choice uses
  the same prepared comparison graph as bloom-off. Graphics meter-off holds exposure and skips meter work;
  Looks exposure lock independently freezes adaptation. Neither control selects the other tool's settings.
- **Opt-in classic tone comparison.** Add `tone=neutral`, `tone=agx`, `tone=agx-sat` or `tone=aces` to classic.
  A lazy module uses the archived demo's metered exposure with fixed middle-grey-matched trims (1 / 0.771116 /
  0.771116 / 0.729587). AgX retains that contrast/saturation look; AgX-sat adds up to 30% chroma,
  fading the extra lift out in highlights. ACES uses Three.js's filmic curve. All four share the existing output
  pass; the meter adds two tiny draws. Absent or invalid flags leave classic's original Neutral appearance
  unchanged. Production water ignores `tone=` and uses its own post owner; use Looks for comparisons there.
  See the historical [comparison rationale and reproduction](../research/tone-comparison.md).
- **Files.** [src/render/scene.ts](../../src/render/scene.ts), [src/features/adaptive-res.ts](../../src/features/adaptive-res.ts),
  [src/features/wake-lock.ts](../../src/features/wake-lock.ts);
  rules for drawing things in [src/render/README.md](../../src/render/README.md).
- **Dev cost controls.** With Dev enabled, the lazy **Graphics** dock panel exposes owned Local settings for
  resolution, frame limit, shadows, MSAA, caustics, spray, snow, shafts, wet lens, bloom, exposure meter and the
  two pooled point lights. Lab grass and lab post effects are available only when their existing owner and
  effects are present; they do not load onto the place page. Each row states the work skipped and whether the
  change is live, rebuild or reload. These are cost experiments, not player presets or an approved low look.
  The separate player page above offers only its four bounded controls. No geometry, waves, queries,
  world population or gameplay controls are included.
- **One Local resolution/cap owner.** `render/quality.ts` combines adaptive resolution with the water ceiling
  using their minimum, preserving the existing default scale. Dev offers Auto / 100 / 80 / 60% and Display /
  60 / 30 rendered fps. A cap skips only scene/output rendering: input, physics, networking, FFT and water
  query callbacks continue. Adaptive observations retain uncapped callback timing. Dev choices are bounded
  and stored separately in `boogle.dev.graphics.v1`; **Restore baseline** clears them, and Dev Off removes them.
  Closing the dock preserves them. Adapters register without Dev for player choices; the Dev panel chunk
  is still not loaded. Precedence is route baseline → player choice → explicit Dev override while Dev is on.
  Dev's Restore baseline removes only Dev overrides, returning to player choices; player reset leaves Dev
  overrides intact and explains their priority. Dev Off clears only Dev keys, retaining player choices.
  Baseline restore also resets registered owners whose effect is temporarily absent from the current lab
  preset, so returning to a grass/post preset restores those effects too.
- **Actual work removed.** Caustics clear once before skipping producer draws; spray skips ambient scans
  while preserving impact cues; snow skips update/draw; shafts skip their target update and composite;
  wet lens skips droplet fragment evaluation while retaining the shared depth/water-boundary compute.
  Bloom bypasses its chain but retains allocations; meter holds its last valid exposure and skips meter,
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
  fill `3.2`; Neutral tone mapping and underwater `+0.81 EV` remain. Cloud radiance is reduced before atmospheric
  compositing and the sky-derived fill is re-read at loading; shape and coverage stay fixed. Neutral replaces
  key, upper-fill and ground-fill chromaticity with equal linear RGB while preserving each source light's
  luminance. It is not a Kelvin setting or a warm post grade. Material colours and the separate airborne arrival
  cloud deck are unchanged. `dev/look/beats/cloud-defaults.ts` compares the old `1/0` settings against unpatched
  production defaults at spawn, town and shore on the same frozen current-source scene. Device appearance and
  real-time feel require owner replay; a successful capture is not device validation.
- **Measurement and hitches.** Graphics **Measure on/off** uses Performance's real-frame profiler for warmed
  on/off/off/on samples, freezes resolution and Display cadence during collection, then restores prior Dev
  overrides. It reports frame-interval proxy, CPU submission and GPU timestamp span separately, never summed
  pass timers. Incomplete GPU spans are unavailable; actual display presentation and physical occlusion are
  unknown. The copied snapshot includes settings, route, camera, pixels, device and all samples. Repeated
  samples and a contention label do not prove machine exclusivity. MSAA requires separate matched reload
  captures and cannot use the live Measure button. Shadow/light membership, MSAA reload and first bloom
  enable can compile or allocate; spray/shafts disabled at startup can defer first-use pipelines.
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
