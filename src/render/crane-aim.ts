// Where a crane shot (src/render/camera-pull-out.ts, `crane`) looks so that Buddy stays where we want him on screen.
// Pure: plain {x, y, z} points and degrees, so a unit test can check it with measured numbers. The camera's vertical
// field of view is fixed (src/render/scene.ts); only the width changes with the window, so the vertical framing is the
// same at 960x600 and 390x844.

export type Pt = { x: number; y: number; z: number };

const RAD = Math.PI / 180;

/** The look-at point on the ray that turns `cam` to face `point` horizontally, pitched so `point` lands at `ndcY` on
 * screen (+1 the top edge, 0 the middle, -1 the bottom edge) for a camera of vertical field of view `fovDeg`.
 * `distance` is how far along that axis the point is put. Written into `out`. */
export function craneAim(cam: Pt, point: Pt, fovDeg: number, ndcY: number, distance: number, out: Pt): Pt {
  const dx = point.x - cam.x,
    dz = point.z - cam.z;
  const h = Math.hypot(dx, dz) || 1e-6;
  // Pitch below the horizontal of the ray to the point, then of the axis: a point shown above the middle (positive
  // ndc) is above the axis, so the axis points lower than the ray to it.
  const toPoint = Math.atan2(cam.y - point.y, h);
  const axis = toPoint + Math.atan(ndcY * Math.tan((fovDeg * RAD) / 2));
  out.x = cam.x + (dx / h) * Math.cos(axis) * distance;
  out.y = cam.y - Math.sin(axis) * distance;
  out.z = cam.z + (dz / h) * Math.cos(axis) * distance;
  return out;
}

/** Where `point` lands vertically on screen (-1..1) for a camera at `cam` looking at `aim`. */
export function ndcYOf(cam: Pt, aim: Pt, point: Pt, fovDeg: number): number {
  const ax = aim.x - cam.x,
    ay = aim.y - cam.y,
    az = aim.z - cam.z;
  const al = Math.hypot(ax, ay, az) || 1e-6;
  const f = { x: ax / al, y: ay / al, z: az / al };
  // right = f x up(0,1,0); camera up = right x f
  let rx = -f.z,
    rz = f.x;
  const rl = Math.hypot(rx, rz) || 1e-6;
  rx /= rl;
  rz /= rl;
  const ux = -rz * f.y,
    uy = rz * f.x - rx * f.z,
    uz = rx * f.y;
  const vx = point.x - cam.x,
    vy = point.y - cam.y,
    vz = point.z - cam.z;
  const depth = vx * f.x + vy * f.y + vz * f.z;
  const up = vx * ux + vy * uy + vz * uz;
  return up / depth / Math.tan((fovDeg * RAD) / 2);
}
