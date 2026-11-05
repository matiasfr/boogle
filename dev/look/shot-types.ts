import type { GraphicsValue } from '../../src/graphics-settings.ts';
import type { Value } from '../../src/render/water/live.ts';

export type ShotCamera = {
  name: string;
  anchor?: 'player';
  cam: [number, number, number];
  look: [number, number, number];
  fov?: number;
};
export type ShotVariant = {
  name: string;
  look?: string;
  values?: Record<string, Value>;
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
};
export type ShotList = { question: string; size?: [number, number]; beats: ShotBeat[] };
export type ShotGroup = ShotBeat & { size: [number, number]; query: string };
export const SHOT_LIMIT = 'Frozen stills only: no evidence of motion, GPU cost, load stalls or feel.';
