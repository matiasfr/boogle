import level from '../../../content/built/levels/quay.json' with { type: 'json' };
import { coastalArea } from './massing-saltpan.ts';
import type { OwnedView } from '../../render/owned-view.ts';

const quay = coastalArea('quay', level);
export const quayArea = {
  ...quay,
  async extras(owner: OwnedView) {
    const [{ mountQuayRoundhouse }, { mountQuayEdges }] = await Promise.all([
      import('./quay-roundhouse.ts'),
      import('./quay-edges.ts'),
    ]);
    if (!owner.alive) return;
    mountQuayEdges(owner);
    return mountQuayRoundhouse(owner);
  },
};
