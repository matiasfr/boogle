import level from '../../../content/built/levels/quay.json' with { type: 'json' };
import { coastalArea } from './massing-saltpan.ts';
import type { OwnedView } from '../../render/owned-view.ts';

const quay = coastalArea('quay', level);
// Dress the existing surfaces so the pigment follows the ramp pitch and the turntable cutout.
const yard = quay.build().map((piece) => {
  const id = piece.id;
  let colour: string;
  if (id.startsWith('quay.apron') || id === 'quay.yard-ramp') colour = '#817566';
  else if (id.startsWith('quay.yard-')) colour = '#69635c';
  else if (id.startsWith('quay.foot-plank-')) colour = '#816144';
  else return piece;
  return { ...piece, params: { ...piece.params, colour } };
});
export const quayArea = {
  ...quay,
  build: () => yard,
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
