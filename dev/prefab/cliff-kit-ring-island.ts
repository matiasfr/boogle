import type { Area } from './cliff-kit.ts';
import { r2 } from '../../src/math.ts';
import { createIslandGround } from '../../src/entities/ring-island/ground.ts';
import { formation, summitRimRocks, SUMMIT_BRIDGE } from '../../src/entities/ring-island/path.ts';
import { FAR, ORIGIN } from '../../src/place/layout.ts';
import { RING_CONES } from '../../src/proto/greybox/ring-cones.ts';

export const ringIsland: Area = {
  id: 'ring-island',
  walls: [], // Ring Island has its own heightfield outside the Home wall census.
  dress(kit) {
    const centre = { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z };
    const ground = createIslandGround(RING_CONES, centre);
    for (const r of summitRimRocks(ground, centre)) {
      const scale = r2(r.w / 5);
      // The low face's crown is 1.04 m behind its front at native scale.
      const x = r.x + 1.04 * scale * Math.sin(r.yaw),
        z = r.z + 1.04 * scale * Math.cos(r.yaw);
      kit.place(
        'terrain.low-face',
        [r2(x - ORIGIN.x), r2(r.y - 0.1), r2(z - ORIGIN.z)],
        [r2(r.yaw), 0, 0],
        'rim marker',
        [scale, r2(r.h / 2.9), scale],
      );
    }
    // Work from the rail toward the hillside. Find the drawn wall at each course's middle
    // on the actual 2 m grid, skipping shallow ground and the footbridge abutments.
    for (let cm = 121500; cm < 158000; cm += 1000) {
      if (Math.abs(cm - SUMMIT_BRIDGE.sCm) < 800) continue;
      const { middle, nx, nz, rail } = formation(cm);
      for (const side of [-1, 1]) {
        const at = (d: number) => [middle.x + nx * side * d, middle.z + nz * side * d] as const;
        for (const rise of [0, 6, 12, 18]) {
          const base = rail - 0.8 + rise;
          let d = 6;
          while (d < 17 && ground.islandH(...at(d)) < base + 3) d += 0.25;
          if (d >= 17 || ground.cone(...at(d)) < base + 6) break;
          const [x, z] = at(d - 0.8);
          kit.place(
            'terrain.sea-face-10',
            [r2(x - ORIGIN.x), r2(base), r2(z - ORIGIN.z)],
            [r2(Math.atan2(-side * nx, -side * nz)), 0, 0],
            'stack cut',
          );
        }
      }
    }
  },
};
