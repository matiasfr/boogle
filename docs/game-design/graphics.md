# 6.18 Graphics and devices

- **Opt-in frozen demo sky.** `sky=demo` on any page lazily loads Ultra Water's Hillaire atmosphere and cloud cube,
  with the sun frozen at `tod=0.24` unless specified (the game's clock: 0 sunrise, 0.3 noon, 0.6 sunset).
  The cube supplies background, directional fog and environment; its upper/lower mip supplies hemisphere fill
  for the Lambert toys. It hides the game's dome, sun/moon billboards and faceted clouds, and drives the real
  sun and shadows. `tod=0.56` is golden hour; `tod=0.605` is dusk. Reload to change it deliberately.
  This is a Local comparison, not the default integration. Combine with `tone=neutral|agx` for the matched meter
  and curve trims below. Without the sky flag, behaviour is unchanged. Outside `proto=water`, the old sea remains.
  `skyBake=1&prof=1` measures the initial six cube draws with GPU timestamps. Reproduction and limits:
  [sky comparison](../research/sky-comparison.md).

- **What.** The island draws with WebGPU only: Chrome and Edge, Safari 26 on iPhone, iPad and Mac, Firefox on
  Windows and Apple Silicon. Any other browser sees a note in the lobby naming the browsers that work. A loading screen
  (key art, the title, a progress bar and a gear that keeps turning: download, graphics device, shaders) paints before the game's code arrives and
  covers the lobby while the graphics device, player's body, shaders and first GPU frame prepare; the room connects meanwhile ([src/boot/](../../src/boot/)).
  Shader warm-up keeps a 16 s escape deadline (a cold Metal cache needs about 14 s on an M1 Max) after the frozen sky bake. It awaits water and particle compute,
  submits the real caustics/post passes, then compiles the whole scene while those native pipelines build.
  Hidden objects and objects outside the provisional camera are included.
  If the deadline expires, unfinished compute stays dormant until its native pipelines exist; remaining warm-ups
  continue after reveal. This is a bounded wait, not a guarantee of stall-free startup on every device.
  `?dpr=fixed`
  keeps the render resolution at full (for testing). Light is linear HDR through Neutral tone mapping (exposure 1.0, up to 1.12 at night),
  with 4x MSAA and PCF sun shadows (2048 px, 1024 on touch). The render resolution follows the frame rate: it starts where this
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
  "Continue in room x · prototype y" under Jump in instead) ([src/features/home-app.ts](../../src/features/home-app.ts)). If the GPU device is lost (an iPhone backgrounding the tab, a driver reset), the page reloads when visible, at most
  once a minute.
- **Sync kind.** Local: nothing about rendering crosses the network.
- **Production-water Looks.** `water=new` with Dev or `tune=1` adds the [Looks dock comparison](dev-menu.md#looks) at the active water-post owner: Current, metered Neutral, restrained Sunny AgX, AgX Punchy and Sunshine water. All use the procedural frozen sky and one shared meter/output pass. A/B only changes uniforms; saved choices prepare behind loading. This is a Local preview, not a default change. Ordinary visits keep the shipped graph and do not load comparison code.
- **Opt-in tone comparison.** Add `tone=neutral`, `tone=agx`, `tone=agx-sat` or `tone=aces` to any game page.
  A lazy module uses the water demo's metered exposure with fixed middle-grey-matched trims (1 / 0.771116 /
  0.771116 / 0.729587). AgX is the demo's existing contrast/saturation look; AgX-sat adds up to 30% chroma,
  fading the extra lift out in highlights. ACES uses Three.js's filmic curve. All four share the existing output
  pass; the meter adds two tiny draws except on water, which already has it. Absent or invalid flags leave the
  page's original appearance unchanged. The unflagged game still uses Neutral; the water demo still uses its
  original AgX. See [comparison rationale and reproduction](../research/tone-comparison.md).
- **Files.** [src/render/scene.ts](../../src/render/scene.ts), [src/features/adaptive-res.ts](../../src/features/adaptive-res.ts),
  [src/features/wake-lock.ts](../../src/features/wake-lock.ts);
  rules for drawing things in [src/render/README.md](../../src/render/README.md).
- **Limits.** No quality setting yet; post effects (bloom, ambient occlusion, reflections) are planned as tiers.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
