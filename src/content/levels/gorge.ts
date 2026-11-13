import { defineLevel, type Placement } from '../../prefab/types.ts';
import { LINE2_END_S, line2World, line2Y } from '../../entities/railway/line2-path.ts';

// The existing north platform's five chords, authored in world metres. Its support posts stay legacy for step 6.
const placements: Placement[] = [];
const a = { x: 0, z: 0 },
  b = { x: 0, z: 0 };
for (let s = LINE2_END_S - 40; s < LINE2_END_S - 1e-6; s += 8) {
  line2World(s, 4.05, a);
  line2World(s + 8, 4.05, b);
  placements.push({
    id: `gorge.platform-n.${placements.length}`,
    prefab: 'greybox.box',
    pos: [(a.x + b.x) / 2, line2Y(LINE2_END_S) + 0.9 - 0.25, (a.z + b.z) / 2],
    rot: [Math.atan2(b.x - a.x, b.z - a.z), 0, 0],
    scale: [4.5, 0.5, Math.hypot(b.x - a.x, b.z - a.z)],
    params: { colour: '#b4b6b8' },
  });
}
export const levels = [defineLevel({ place: 'gorge', placements })];
