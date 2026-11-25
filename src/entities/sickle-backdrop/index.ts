// Local scenery only: no bodies, state or review controls. Keep the walkable dev greybox separate.
import { defineKind, spawn } from '../../entity/entity.ts';
import { routeAreas } from '../route-greybox/state.ts';
import { createBackdrop } from './view.ts';

defineKind('sickle-backdrop', { update: 14 });
// The dev review and the walkable ?blockout=world build these same islands, with their own collision.
const q = new URLSearchParams(location.search);
const reviewing = (import.meta.env.DEV && q.has('greybox')) || q.get('blockout') === 'world';
if (!reviewing) {
  const { horizon, playableVertices } = createBackdrop();
  spawn({
    kind: 'sickle-backdrop',
    mesh: horizon,
    update() {
      horizon.geometry.setDrawRange(0, routeAreas.get('quay')?.mounted ? playableVertices : Infinity);
    },
  });
}
