import { definePrefab } from '../../prefab/types.ts';
import shores from '../levels/leg4-shores.json' with { type: 'json' };
import { landPrism } from './canopy-lands.ts';

const land = (isle: typeof shores.saltLand, top: number) => landPrism(isle.ring, top, isle.centre.x, isle.centre.z);
export const prefabs = [
  definePrefab({
    key: 'greybox.salt-land',
    visual: { none: true },
    colliders: [land(shores.saltLand, 3)],
    scope: 'place',
  }),
  definePrefab({
    key: 'greybox.quay-lands',
    visual: { none: true },
    colliders: [land(shores.portIsle, 3), land(shores.portTop, 55)],
    scope: 'place',
  }),
];
