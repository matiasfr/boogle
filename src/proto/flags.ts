// Local launch flags: ?proto=<id>[&v=<variant>] runs one prototype. Cheap for eager loaders.
import { DEFAULT_ROOM } from '../constants.ts';

/** Effective launch flags. The address always wins; the bare address, and headless tools, open the current game in
 * the room `boogle`. The retired `?proto=place` entry opens the current game too (ecs-m12-m13 M13e). */
export function pageQuery(search = typeof location === 'undefined' ? '' : location.search): URLSearchParams {
  const q = new URLSearchParams(search);
  if (q.get('proto') === 'place') q.delete('proto');
  if (!q.has('proto') && !q.has('room')) q.set('room', DEFAULT_ROOM);
  return q;
}

/** The current game runs wherever the effective flags name no prototype. */
export function isProductionRailway(search: string) {
  return !pageQuery(search).has('proto');
}

/** Invite the same entry and variant without copying local debug, save or presentation flags. */
export function roomInviteQuery(room: string, search: string): string {
  const flags = pageQuery(search);
  const invite = new URLSearchParams();
  if (flags.has('proto')) invite.set('proto', flags.get('proto')!);
  for (const key of ['v', 'coop']) if (flags.has(key)) invite.set(key, flags.get(key)!);
  if (flags.has('proto') || room !== DEFAULT_ROOM) invite.set('room', room);
  const query = invite.toString();
  return query ? `?${query}` : '';
}

const q = pageQuery();
/** The current game promotes T1; an explicit prototype keeps its isolated regression entry. */
export const productionRailway = typeof location !== 'undefined' && isProductionRailway(location.search);
/** The page's `?proto=` ('' for none). */
export const PROTO = q.get('proto') ?? '';
/** The page's card id: its `?proto=`, or `place` for the current game (playtest history is keyed by it). */
export const CARD = PROTO || (productionRailway ? 'place' : '');
/** Whether prototype `id` runs on this page. */
export const protoOn = (id: string): boolean => PROTO === id;
/** The addressed variant ('' for the default). */
export const protoV = (id: string): string => (PROTO === id ? (q.get('v') ?? '') : '');
