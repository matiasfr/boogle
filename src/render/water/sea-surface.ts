// The seam between the one sea's shared core (water-render.ts: frozen sky, quality, underwater, snow, post, ripples,
// spray, the waterField install) and the surface a `?water=` choice draws (docs/plans/water-sunshine.md, step 1).
import type { WaterProvider } from '../../physics/water-field.ts';
import type { CausticSample } from './caustics.ts';
import type { ShoreFields } from './shore-nodes.ts';
import type { ShoreAtlas } from './shore-providers.ts';
import type { Ocean, WaterSky } from './surface.ts';
import type { N } from './tsl.ts';

export const WATER_CHOICES = ['ultra', 'sun', 'sun-depth'] as const;
export type WaterChoice = (typeof WATER_CHOICES)[number];
export type SurfaceContext = { sky: WaterSky; fog: (distance: N) => N; far: number };
export type SeaSurface = {
  ocean: Ocean;
  provider: WaterProvider;
  receivers: { field: ShoreFields; caustics: CausticSample };
  /** How far the drawn seabed lies below the real one at a world point on it (zero off it), for the underwater fog. */
  shelf?: (world: N) => N;
  /** The breaker and rock spray's shore sites; null keeps only impact crowns. */
  sprayAtlas: ShoreAtlas | null;
  /** Before physics, after the sea clock is set. */
  publish(elapsed: number): void;
  /** Start of the sea's late update: bring shore data up to date. */
  sync(): void;
  /** After the ocean's own update: per-frame GPU producers and queries. */
  afterOcean(elapsed: number): void;
  /** GPU compiles awaited inside the loading warm-up. */
  prepare(): Promise<void>;
  /** The first frame's state, once prepared. */
  start(): void;
  /** Loading-screen draws of the surface's own passes. */
  warmDraw(): void;
  describe(): Record<string, unknown>;
  dispose(): void;
};
