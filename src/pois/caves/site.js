// Cave system under the north-west massif (see network.js). The terrain part: keep enough rock over every tunnel and
// chamber, and dig a trench down to each of the four mouths so you can walk in.
import { NODES, MOUTHS, TRENCH, COVER, coverPaths } from './network.js';
import { naturalHeight } from '../../island/shape.js';

const stamps = [];
// Rock over the tunnels and chambers (only ever raises the ground).
for (const c of coverPaths()) stamps.push({ shape: 'path', points: c.pts, w: c.w, fade: 10, max: 'path' });
for (const n of Object.values(NODES)) {
  if (n.kind === 'mouth') continue;
  const top = n.kind === 'cellar' ? n.y + n.half[1] + n.half[2] : n.y + n.r[1] * 1.35;
  const r = n.kind === 'cellar' ? Math.max(n.half[0], n.half[2]) + 2 : Math.max(n.r[0], n.r[2]) + 1;
  stamps.push({ shape: 'disc', x: n.x, z: n.z, r, fade: 12, max: top + COVER });
}
// Trenches: from the open hillside down to each mouth's floor; the hill rises steeply behind the mouth.
for (const m of MOUTHS) {
  const ox = m.x + m.ox * m.trench,
    oz = m.z + m.oz * m.trench;
  const outer = naturalHeight(ox, oz); // ramps from the hillside down (or up) to the mouth's floor
  const ex = m.x + m.ox * (TRENCH.w / 2),
    ez = m.z + m.oz * (TRENCH.w / 2); // floor reaches exactly to the mouth
  stamps.push({
    shape: 'path',
    points: [
      [ox, oz, outer],
      [ex, ez, m.y],
    ],
    w: TRENCH.w,
    fade: 2.2,
    set: 'path',
  });
  stamps.push({
    shape: 'path',
    points: [
      [ox, oz],
      [ex, ez],
    ],
    w: TRENCH.w - 1,
    fade: 1,
    paint: '#8d7b62',
    strength: 0.7,
  });
}

// Site frame is the identity (dir +z, origin 0,0), so the stamps above are in world coordinates.
export default {
  name: 'Caves',
  x: 0,
  z: 0,
  stamps,
  keepOut: MOUTHS.map((m) => ({ x: m.x + m.ox * 6, z: m.z + m.oz * 6, r: 9 })),
};
