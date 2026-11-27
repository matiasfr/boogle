import south from '../../../content/built/levels/wall-south.json' with { type: 'json' };
import north from '../../../content/built/levels/wall-north.json' with { type: 'json' };
import { coastalArea } from './massing-saltpan.ts';
import type { OwnedView } from '../../render/owned-view.ts';

export const wallAreas = (
  [
    [coastalArea('wall-south', south), 'wall-s2'],
    [coastalArea('wall-north', north), 'wall-n1'],
  ] as const
).map(([area, islet]) => ({
  ...area,
  extras: async (owner: OwnedView) => (await import('./wall-chalk.ts')).wallChalk(owner, islet),
}));
