# 6.18 Graphics and devices

- **What.** The island draws with WebGPU only: Chrome and Edge, Safari 26 on iPhone, iPad and Mac, Firefox on
  Windows and Apple Silicon. Any other browser sees a note in the lobby naming the browsers that work. A loading screen
  (key art, the title, a progress bar and a gear that keeps turning: download, graphics device, shaders) paints before the game's code arrives and
  covers the lobby until the graphics device is up, the player's body is on, every shader is built and the GPU has
  finished the first frame (8 s at most), so Jump in is the moment nothing is left to stall a frame; the room connects meanwhile ([src/boot/](../../src/boot/)). `?dpr=fixed`
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
