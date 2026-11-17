// Existing visual-only records and moving envelope collider; canonical geometry is the Blender asset.
import { coachParts } from '../../entities/railway/coach-kit.ts';
import { registerBuilder } from '../builders.ts';
declare module '../names.ts' {
  interface BuilderNames {
    'railway.coach-parts': true;
  }
}
registerBuilder('railway.coach-parts', (p) => {
  if (p.kind !== 'body' && p.kind !== 'underframe') throw new Error('coach-parts: unknown kind');
  return { object: coachParts(p.kind), dispose() {} };
});
