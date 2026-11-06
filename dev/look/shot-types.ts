import type { GraphicsValue } from '../../src/graphics-settings.ts';
import type { Value } from '../../src/render/water/live.ts';

export type ShotCamera = {
  name: string;
  snapshot?: string;
  anchor?: 'player';
  cam: [number, number, number];
  look: [number, number, number];
  fov?: number;
};
export type ShotVariant = {
  name: string;
  cell?: number;
  look?: string;
  values?: Record<string, Value>;
  tunables?: Record<string, number>;
  graphics?: Record<string, GraphicsValue>;
  query?: string;
  size?: [number, number];
};
export type ShotBeat = {
  name: string;
  at?: string;
  saves?: string;
  setup?: string;
  query?: string;
  warm?: number;
  cameras: ShotCamera[];
  variants: ShotVariant[];
  /** Explicit row-major comparison; does not synthesize numeric wedge variants. */
  grid?: { rows: string[]; columns: string[]; baseline: number; legend?: string };
  wedge?: {
    baseline?: number;
    rows: { id: string; label: string; values: [number, number, number] };
    columns: { id: string; label: string; values: [number, number, number] };
    legend?: string;
  };
  reference?: { image: string; path: string; sha256: string; provenance: string; colorSpace: string; crop: string };
  keepPaused?: boolean;
  sampleObjects?: string[];
};
export type ShotList = { question: string; size?: [number, number]; beats: ShotBeat[] };
export type ShotGroup = ShotBeat & { size: [number, number]; query: string };
export const SHOT_LIMIT = 'Frozen stills only: no evidence of motion, GPU cost, load stalls or feel.';
