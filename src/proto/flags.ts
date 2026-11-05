// Local launch flags: ?proto=<id>[&v=<variant>] runs one prototype. Cheap for eager loaders.
import { DEFAULT_ROOM } from '../constants.ts';

/** Effective launch flags. The address always wins; headless tools keep the classic island.
 * Round 4 is the default entry, without rewriting the URL or moving prototype code. */
export function pageQuery(): URLSearchParams {
  const q = new URLSearchParams(typeof location === 'undefined' ? 'classic=1' : location.search);
  // Explicit prototypes win over the home comparison and may never join its reserved room.
  if (q.has('proto')) {
    q.delete('island');
    if (q.get('room') === 'island-low') q.delete('room');
  } else if (q.get('island') === 'low' || q.get('room') === 'island-low') {
    // One terrain per comparison room, including a visitor following only its room link.
    q.set('island', 'low');
    q.set('room', 'island-low');
    q.set('classic', '1');
  }
  if (!q.has('proto') && q.get('classic') !== '1') {
    q.set('proto', 'place');
    if (!q.has('room')) q.set('room', DEFAULT_ROOM);
    if (!q.has('fresh')) q.set('fresh', '1');
    if (!q.has('coop')) q.set('coop', '1');
  }
  if (q.get('proto') === 'place') {
    const room = q.get('room');
    const villageRoom = room === 'proto-place-village' || room === 'proto-place-village-coop';
    // The old coast stays in its own comparison room, including room-only invite links.
    if (q.get('v') === 'village' || villageRoom) {
      q.set('v', 'village');
      q.set('room', villageRoom ? room : q.get('coop') === '1' ? 'proto-place-village-coop' : 'proto-place-village');
    } else if (!room) q.set('room', q.get('coop') === '1' ? 'proto-place-coop' : 'proto-place');
  }
  return q;
}

const q = pageQuery();
export const LOW_ISLAND = q.get('island') === 'low' && !q.has('proto');
/** The page's `?proto=` ('' for none). */
export const PROTO = q.get('proto') ?? '';
/** Whether prototype `id` runs on this page. */
export const protoOn = (id: string): boolean => PROTO === id;
/** The addressed variant ('' for the default). */
export const protoV = (id: string): string => (PROTO === id ? (q.get('v') ?? '') : '');
/** Real Place/crossing sea. Classic home clients retain their cheaper sea pending CI qualification.
 * Retired water=old/new parameters are deliberately ignored. Shared with headless Owner physics. */
export const newWaterEnabled = protoOn('place') || protoOn('crossing');
