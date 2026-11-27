import level from '../../../content/built/levels/quay.json' with { type: 'json' };
import { coastalArea } from './massing-saltpan.ts';
import type { OwnedView } from '../../render/owned-view.ts';

const quay = coastalArea('quay', level);
export const quayArea = {
  ...quay,
  async extras(owner: OwnedView) {
    const solids = quay.extras(owner);
    const { mountQuayRoundhouse } = await import('./quay-roundhouse.ts');
    return mountQuayRoundhouse(owner, solids);
  },
};
