// Local launch flags: ?proto=<id>[&v=<variant>] runs one prototype. Cheap for eager loaders.
import { DEFAULT_ROOM, CLASSIC_ROOM } from '../constants.ts';

/** Effective launch flags. The address always wins; headless tools keep the classic island.
 * Round 4 is the default entry, without rewriting the URL or moving prototype code. */
export function pageQuery(search = typeof location === 'undefined' ? 'classic=1' : location.search): URLSearchParams {
  const q = new URLSearchParams(search);
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
    if (q.get('v') === 'village' || villageRoom) {
      q.set('v', 'village');
      q.set('room', villageRoom ? room : q.get('coop') === '1' ? 'proto-place-village-coop' : 'proto-place-village');
    } else if (!room) q.set('room', q.get('coop') === '1' ? 'proto-place-coop' : 'proto-place');
  }
  return q;
}

/** The explicit address selects authority; the effective Place flag alone cannot distinguish the two entries. */
export function isProductionRailway(search: string) {
  return !new URLSearchParams(search).has('proto') && pageQuery(search).get('classic') !== '1';
}

/** Invite the same entry and variant without copying local debug, save or presentation flags. */
export function roomInviteQuery(room: string, search: string): string {
  const address = new URLSearchParams(search);
  const flags = pageQuery(search);
  const invite = new URLSearchParams();
  if (address.has('proto')) {
    invite.set('proto', address.get('proto')!);
    for (const key of ['v', 'coop']) if (flags.has(key)) invite.set(key, flags.get(key)!);
    invite.set('room', room);
  } else if (flags.get('classic') === '1') {
    invite.set('classic', '1');
    if (flags.get('island') === 'low') invite.set('island', 'low');
    if (room !== CLASSIC_ROOM) invite.set('room', room);
  } else {
    for (const key of ['v', 'coop']) if (address.has(key)) invite.set(key, address.get(key)!);
    if (room !== DEFAULT_ROOM) invite.set('room', room);
  }
  const query = invite.toString();
  return query ? `?${query}` : '';
}

const q = pageQuery();
/** The current game promotes T1; an explicit prototype keeps its isolated regression entry. */
export const productionRailway = typeof location !== 'undefined' && isProductionRailway(location.search);
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
