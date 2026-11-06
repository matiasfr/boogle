// Local launch flags: ?proto=<id>[&v=<variant>] runs one prototype. Cheap for eager loaders.
import { DEFAULT_ROOM } from '../constants.ts';

/** Effective launch flags. The address always wins; the bare address, and headless tools, open the current game.
 * The current game is Place's world run by the production railway, without rewriting the URL. */
export function pageQuery(search = typeof location === 'undefined' ? '' : location.search): URLSearchParams {
  const q = new URLSearchParams(search);
  if (!q.has('proto')) {
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
  return !new URLSearchParams(search).has('proto');
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
/** The page's `?proto=` ('' for none). */
export const PROTO = q.get('proto') ?? '';
/** Whether prototype `id` runs on this page. */
export const protoOn = (id: string): boolean => PROTO === id;
/** The addressed variant ('' for the default). */
export const protoV = (id: string): string => (PROTO === id ? (q.get('v') ?? '') : '');
