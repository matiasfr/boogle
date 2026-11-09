// Local scenery only: no bodies, state, review controls or frame work. Keep the walkable dev greybox separate.
import { defineKind, spawn } from '../../entity/entity.ts';
import { createBackdrop } from './view.ts';

defineKind('sickle-backdrop', {});
// The dev review builds these same islands, including its own collision and labels.
const reviewing = import.meta.env.DEV && new URLSearchParams(location.search).has('greybox');
if (!reviewing) spawn({ kind: 'sickle-backdrop', mesh: createBackdrop() });
