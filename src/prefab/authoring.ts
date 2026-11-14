import type { JsonObject } from './types.ts';
export type Scalar =
  number | { compute: 'line2EndY'; offset: number } | { compute: 'add' | 'sub' | 'mul'; a: Scalar; b: Scalar };
export type Axis =
  | { x: number; z: number }
  | { compute: 'unit' | 'perp'; axis: Axis; sign?: number }
  | { compute: 'mix'; a: Axis; b: Axis; wa: number; wb: number };
export type Frame = { o: { x: number; z: number }; u: Axis; v: Axis };
export type Point =
  | { x: number; z: number; y?: Scalar }
  | { compute: 'point'; frame: Frame; at: readonly [number, number]; y?: Scalar }
  | { compute: 'offsetPoint'; point: Point; dx: number; dz: number };
export const add = (a: Scalar, b: Scalar): Scalar => ({ compute: 'add', a, b });
export const sub = (a: Scalar, b: Scalar): Scalar => ({ compute: 'sub', a, b });
export const mul = (a: Scalar, b: Scalar): Scalar => ({ compute: 'mul', a, b });
export const unit = (x: number, z: number): Axis => ({ compute: 'unit', axis: { x, z } });
export const perp = (axis: Axis, sign = 1): Axis => ({ compute: 'perp', axis, sign });
export const mix = (a: Axis, b: Axis, wa: number, wb: number): Axis => ({ compute: 'mix', a, b, wa, wb });
export const offset = (point: Point, dx: number, dz: number): Point => ({ compute: 'offsetPoint', point, dx, dz });
export function frame(o: { x: number; z: number }, u: Axis, v: Axis) {
  const basis: Frame = { o, u, v };
  const rect = (a0: number, a1: number, b0: number, b1: number) => ({
    compute: 'rect' as const,
    frame: basis,
    bounds: [a0, a1, b0, b1],
  });
  return {
    basis,
    at: (a: number, b: number): Point => ({ compute: 'point', frame: basis, at: [a, b] }),
    box: (id: string, a0: number, a1: number, b0: number, b1: number, top: Scalar, h: Scalar, tone: string) => ({
      id,
      ...rect(a0, a1, b0, b1),
      top,
      h,
      tone,
    }),
    ramp: (id: string, a0: number, y0: Scalar, a1: number, y1: Scalar, b0: number, b1: number, tone: string) => ({
      id,
      ...rect(a0, a1, b0, b1),
      top: a0 < a1 ? y0 : y1,
      rise: a0 < a1 ? sub(y1, y0) : sub(y0, y1),
      h: 0.3,
      tone,
    }),
    reserve: (id: string, a0: number, a1: number, b0: number, b1: number, y0: Scalar, y1: Scalar) => ({
      id,
      ...rect(a0, a1, b0, b1),
      y0,
      y1,
    }),
    yaw: { compute: 'yaw' as const, axis: u },
    u,
    v,
  };
}
// Type-level view of resolved examiner metadata; runtime resolution still validates the complete result.
export type Evaluated<T> = T extends { compute: 'point' | 'offsetPoint' }
  ? { x: number; z: number }
  : T extends { compute: 'rect' }
    ? { id: string; x: number; z: number; yaw: number; w: number; d: number; y0: number; y1: number }
    : T extends { compute: string }
      ? number
      : T extends (...args: never[]) => unknown
        ? never
        : T extends readonly unknown[]
          ? { [K in keyof T]: Evaluated<T[K]> }
          : T extends object
            ? { [K in keyof T]: Evaluated<T[K]> }
            : T;
export const layoutData = (data: unknown) => data as JsonObject;
