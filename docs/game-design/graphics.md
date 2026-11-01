# 6.18 Graphics and devices

- **What.** The island draws with WebGPU only: Chrome and Edge, Safari 26 on iPhone, iPad and Mac, Firefox on
  Windows and Apple Silicon. Any other browser sees a note in the lobby naming the browsers that work. A loading screen
  (key art, the title and a progress bar: download, graphics device, shaders) paints before the game's code arrives and
  covers the lobby until the graphics device is up and every shader is built (8 s at most), so Jump in is the moment
  nothing is left to stall a frame; the room connects meanwhile ([src/boot/](../../src/boot/)). `?dpr=fixed`
  keeps the render resolution at full (for testing). Light is linear HDR through Neutral tone mapping (exposure 1.0, up to 1.12 at night),
  with 4x MSAA and PCF sun shadows (2048 px, 1024 on touch). The render resolution follows the frame rate: it drops
  in 10 % steps to 0.6x after 2 s of slow frames (over 18.5 ms) and climbs back after 5 s of fast ones (under 14 ms).
  If the GPU device is lost (an iPhone backgrounding the tab, a driver reset), the page reloads when visible, at most
  once a minute.
- **Sync kind.** Local: nothing about rendering crosses the network.
- **Files.** [src/render/scene.ts](../../src/render/scene.ts), [src/features/adaptive-res.ts](../../src/features/adaptive-res.ts);
  rules for drawing things in [src/render/README.md](../../src/render/README.md).
- **Limits.** No quality setting yet; post effects (bloom, ambient occlusion, reflections) are planned as tiers.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
