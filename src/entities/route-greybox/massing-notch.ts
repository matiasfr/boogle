import notch from '../../../content/built/levels/notch.json' with { type: 'json' };
import original from '../../../content/built/levels/original.json' with { type: 'json' };
import { coastalArea } from './massing-saltpan.ts';
import type { OwnedView } from '../../render/owned-view.ts';

export const notchAreas = [
  {
    ...coastalArea('notch', notch),
    extras: async (owner: OwnedView) => (await import('./notch-shoulders.ts')).notchShoulders(owner),
  },
  {
    ...coastalArea('original', original),
    extras: async (owner: OwnedView) => (await import('./original-abutment.ts')).originalAbutment(owner),
  },
];
