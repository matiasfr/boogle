// Local scenery only: no bodies, state, review controls or frame work. Keep the walkable dev greybox separate.
import { defineKind, spawn } from '../../entity/entity.ts';
import { createBackdrop } from './view.ts';

defineKind('sickle-backdrop', {});
// The dev review and the walkable ?blockout=world build these same islands, with their own collision.
const q = new URLSearchParams(location.search);
const reviewing = (import.meta.env.DEV && q.has('greybox')) || q.get('blockout') === 'world';
if (!reviewing) spawn({ kind: 'sickle-backdrop', mesh: createBackdrop() });
