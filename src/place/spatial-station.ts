// The station's existing physical assembly as numbers, shared by its renderer and the regional placement audit.
// Keep the order and arithmetic here aligned with the visible frame; this is not a second station layout.
import { ORIGIN, lineAt, type Line, type LinePoint, type Station } from './layout.ts';

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
export const FRAME_W = 2.6, // along the line
  FRAME_D = 2, // across
  OUT = 7.5; // m from the track to the frame's middle; clear the whole-panel magazine through bends
export const PER_ROW = 5;
export const SPAN = OUT - FRAME_D / 2 - 5.8; // terminate outside the loaded machine's swept footprint
export const RAIL_OUT = FRAME_D / 2 + 0.9; // m from the frame's middle to the rails' bearers

/** Where a frame stands: `yaw` along the thing it feeds, (lx, lz) the way out from it. */
export type FrameAt = {
  x: number;
  z: number;
  yaw: number;
  lx: number;
  lz: number;
  /** The deck it stands on, where that is not the ground (Q7's frame on the pier's piled deck). */
  y?: number;
};
export function frameBesideLine(spec: Station, line: Line, dir: number): FrameAt {
  lineAt(line, spec.s - dir * 1.5, P);
  const lx = -P.uz * spec.side,
    lz = P.ux * spec.side;
  return { x: P.x + ORIGIN.x + lx * OUT, z: P.z + ORIGIN.z + lz * OUT, yaw: Math.atan2(P.ux, P.uz), lx, lz };
}

export type StationCollider = {
  /** Stable within one station; the caller prefixes its authored station ID. */
  id: string;
  shape: { kind: 'box'; hx: number; hy: number; hz: number };
  position: { x: number; y: number; z: number };
  yaw: number;
};

/** Groups preserve the renderer's registration order, including its footprint between frame and feeder. */
export function stationColliders(place: FrameAt, y: number, hasRails: boolean) {
  const { x, z, yaw, lx, lz } = place;
  const frame: StationCollider[] = [
    {
      id: 'frame-base',
      shape: { kind: 'box', hx: FRAME_D / 2 + 0.1, hy: 0.28, hz: FRAME_W / 2 + 0.1 },
      position: { x, y: y + 0.28, z },
      yaw,
    },
  ];
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const px = (sx * FRAME_D) / 2,
        pz = (sz * FRAME_W) / 2;
      frame.push({
        id: `frame-post-${sx}-${sz}`,
        shape: { kind: 'box', hx: 0.21, hy: 0.76, hz: 0.21 },
        position: {
          x: x + Math.cos(yaw) * px + Math.sin(yaw) * pz,
          y: y + 0.76,
          z: z - Math.sin(yaw) * px + Math.cos(yaw) * pz,
        },
        yaw,
      });
    }
  const feeder: StationCollider = {
    id: 'feeder',
    shape: { kind: 'box', hx: 0.5, hy: 0.28, hz: SPAN / 2 },
    position: { x: x - lx * (FRAME_D / 2 + SPAN / 2), y: y + 0.28, z: z - lz * (FRAME_D / 2 + SPAN / 2) },
    yaw: yaw + Math.PI / 2,
  };
  const rails: StationCollider | null = hasRails
    ? {
        id: 'rail-bearers',
        shape: { kind: 'box', hx: 0.5, hy: 0.45, hz: 1.35 },
        position: { x: x + lx * RAIL_OUT, y: y + 0.45, z: z + lz * RAIL_OUT },
        yaw,
      }
    : null;
  return { frame, feeder, rails };
}

/** `top` comes from the renderer's stackSlot spacing; callers omit this body while the stock is empty. */
export function stationStockCollider(place: FrameAt, y: number, top: number): StationCollider {
  const { x, z, yaw } = place;
  return {
    id: 'stock',
    shape: { kind: 'box', hx: FRAME_D / 2, hy: (top - y) / 2, hz: FRAME_W / 2 },
    position: { x, y: (top + y) / 2, z },
    yaw,
  };
}
