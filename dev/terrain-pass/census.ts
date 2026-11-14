// Page setup for dev/terrain-pass/contact-shots.ts, in two parts.
// 1. Buddy at the foot of the rock face where the terrain pass's drawn ground was furthest from its collider along the
//    normal with walkable ground below (dev/terrain-pass/contact.ts --no-cap): Place-local (-43.33, 102.67), on the
//    gorge's floor by the south footbridge. He is dropped against the face and left to settle on the collider.
// 2. A census of the running game's static bodies: every one whose base is on the terrain gets the drawn ground
//    sampled under it and 1 m around, against the collider. A body the keep list (island.ts GROUND_KEEPS) missed shows
//    up here as a gap over 5 cm. It sees the bodies of this page's state only (a fresh arrival unless a seed is given).
const { me, cam } = await import('/src/player/player.ts' as string);
const { teleport, forEachStatic } = await import('/src/physics/engine.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const { drawnHome, collider } = await import('/dev/terrain-pass/drawn.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(80);
const x = 957.15,
  z = 102.67;
teleport(me.body, x, H(x, z) + 0.9, z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.PI / 2;
await wait(1500);

type V = { x: number; y: number; z: number };
type Q = V & { w: number };
type AnyShape = { kind: string; offset?: V; rotation?: Q } & Record<string, number>;
const rotate = (q: Q, v: V): V => {
  const tx = 2 * (q.y * v.z - q.z * v.y),
    ty = 2 * (q.z * v.x - q.x * v.z),
    tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
};
const times = (a: Q, b: Q): Q => ({
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
});
const home = drawnHome(new URLSearchParams(location.search).get('terrainCap') !== '0');
const ORIGIN_X = 1000;
let bodies = 0,
  shapes = 0,
  grounded = 0;
const misses: { at: number[]; kind: string; r: number; gap: number; where: number[] }[] = [];
forEachStatic(-1, (body: { position: V; quaternion: Q }, list: AnyShape[]) => {
  bodies++;
  for (const shape of list) {
    if (shape.kind === 'heightfield' || shape.kind === 'trimesh') continue; // the ground itself, and meshes with no box
    shapes++;
    const q = shape.rotation ? times(body.quaternion, shape.rotation) : body.quaternion;
    const off = shape.offset ? rotate(body.quaternion, shape.offset) : { x: 0, y: 0, z: 0 };
    const centre = { x: body.position.x + off.x, y: body.position.y + off.y, z: body.position.z + off.z };
    const half: V =
      shape.kind === 'box'
        ? { x: shape.hx!, y: shape.hy!, z: shape.hz! }
        : shape.kind === 'cylinder'
          ? { x: Math.max(shape.rTop!, shape.rBottom!), y: shape.h! / 2, z: Math.max(shape.rTop!, shape.rBottom!) }
          : { x: shape.r!, y: shape.r!, z: shape.r! };
    const axes = [
      rotate(q, { x: half.x, y: 0, z: 0 }),
      rotate(q, { x: 0, y: half.y, z: 0 }),
      rotate(q, { x: 0, y: 0, z: half.z }),
    ];
    const ex = axes.reduce((n, a) => n + Math.abs(a.x), 0),
      ey = axes.reduce((n, a) => n + Math.abs(a.y), 0),
      ez = axes.reduce((n, a) => n + Math.abs(a.z), 0);
    // A box's footprint reaches its corner; an upright cylinder's or a sphere's is its radius.
    const r = shape.kind === 'box' ? Math.hypot(ex, ez) : Math.max(ex, ez),
      base = centre.y - ey,
      top = centre.y + ey;
    const lx = centre.x - ORIGIN_X,
      lz = centre.z;
    if (lx < -255 || lx > 515 || lz < -275 || lz > 255) continue; // off Home's grid
    // On the terrain: somewhere under its footprint the collider ground is between its base (less 0.3 m) and its top.
    let onGround = false;
    let gap = 0,
      where = [0, 0];
    const reach = r + 1;
    for (let dz = -reach; dz <= reach; dz += 0.5)
      for (let dx = -reach; dx <= reach; dx += 0.5) {
        const d = Math.hypot(dx, dz);
        if (d > reach) continue;
        const ground = collider(lx + dx, lz + dz).height;
        if (d <= r && ground >= base - 0.3 && ground <= top + 0.1) onGround = true;
        const found = Math.abs(home.heightAt(lx + dx, lz + dz) - ground);
        if (found > gap) {
          gap = found;
          where = [lx + dx, lz + dz];
        }
      }
    if (!onGround) continue;
    grounded++;
    if (gap > 0.05)
      misses.push({
        at: [lx, base, lz].map((v) => +v.toFixed(2)),
        kind: shape.kind,
        r: +r.toFixed(2),
        gap: +gap.toFixed(3),
        where: where.map((v) => +v.toFixed(2)),
      });
  }
});
misses.sort((a, b) => b.gap - a.gap);
console.log(
  'PLAY TERRAIN_CENSUS ' +
    JSON.stringify({ bodies, shapes, grounded, misses: misses.length, worst: misses.slice(0, 25) }),
);
// Buddy against the face: where his body is, the collider under him and the drawn ground under him.
const p = me.body.position;
console.log(
  'PLAY TERRAIN_CONTACT ' +
    JSON.stringify({
      body: [p.x - ORIGIN_X, p.y, p.z].map((v: number) => +v.toFixed(3)),
      collider: +collider(p.x - ORIGIN_X, p.z).height.toFixed(3),
      drawn: +home.heightAt(p.x - ORIGIN_X, p.z).toFixed(3),
    }),
);
export {};
