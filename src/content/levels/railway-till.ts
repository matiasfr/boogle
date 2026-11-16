import { defineLevel } from '../../prefab/types.ts';
// Owner placements: home-station.ts supplies the station frame; riders-view supplies the current route ends.
export const levels = [
  defineLevel({
    place: 'railway-till',
    placements: [
      { id: 'railway.till', prefab: 'railway.till', pos: [0, 0, 0], labels: { sign: 'balance' } },
      { id: 'railway.till-coins', prefab: 'railway.till-coins', pos: [-0.17, 1.02, 0] },
      { id: 'railway.waiting-0', prefab: 'railway.waiting-board', pos: [0, 0, 0], labels: { sign: 'waiting' } },
      { id: 'railway.waiting-1', prefab: 'railway.waiting-board', pos: [0, 0, 0], labels: { sign: 'waiting' } },
    ],
  }),
];
