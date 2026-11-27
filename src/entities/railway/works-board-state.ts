// All station faces and Pause read one local presentation of the room's accepted work.
import type { OwnedView } from '../../render/owned-view.ts';
import type { RoomWorks } from '../../sim/railway-queries-room.ts';
import { RAIL_LINES } from '../../sim/railway-lines.ts';
import { WORKS_ACTIONS, WORKS_COMPLETE, WORKS_GIFTS, WORKS_LABELS as label, WORKS_LINES } from './works-lines.ts';

type Place = { x: number; z: number };
type Halt = { line: number; stop: number };
const haltName = (h: Halt) => RAIL_LINES[h.line]!.halts[h.stop]!.name;
let work: RoomWorks | null = null;
let giftRows: string[] = [];
const faces = new Set<() => void>();
const posts = new Map<string, Set<Place>>();

export function boardToward(line: number, stop: number, from: Place) {
  return [...(posts.get(line + '/' + stop) ?? [])].sort(
    (a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z),
  )[0];
}
export function worksBoardRows(at: Place): string[] {
  if (!work) return [];
  if (work.done) return [WORKS_COMPLETE];
  const { site, needs, gives, halt } = work;
  const gift =
    gives.what === 'halt'
      ? haltName(gives)
      : gives.what === 'opens'
        ? WORKS_LINES[gives.site].name
        : WORKS_GIFTS[gives.what === 'ability' ? gives.id : gives.what];
  const train =
    !halt || Math.hypot(at.x - work.at.x / 100, at.z - work.at.z / 100) < 150
      ? label.walk
      : label.line + ' ' + (halt.line + 1) + ' · ' + haltName(halt);
  return [
    label.work + ' · ' + WORKS_LINES[site].name,
    label.needs +
      ' · ' +
      (needs.map((n) => n.what + ' ' + n.have + '/' + n.of).join('   ') || WORKS_ACTIONS[work.kind]),
    label.gives + ' · ' + gift,
    ...giftRows,
    label.train + ' · ' + train,
  ];
}

export function createWorksBoard(owner: OwnedView) {
  let last = '';
  owner.cleanup(() => {
    work = null;
    giftRows = [];
  });
  return (next: RoomWorks, thanks: string[], cargo?: [number, number]) => {
    const rows: string[] = [];
    if (thanks.length) rows.push(label.thanks + ' \u00b7 ' + thanks.join(', '));
    if (cargo)
      rows.push(label.way + ' \u00b7 ' + cargo[0] + ' ' + label.queued + '   ' + cargo[1] + ' ' + label.aboard);
    const key = JSON.stringify([next, rows]);
    if (key === last) return;
    last = key;
    work = next;
    giftRows = rows;
    for (const paint of faces) paint();
  };
}
export function registerWorksFace(owner: OwnedView, at: Place, halts: readonly Halt[], paint: () => void) {
  for (const h of halts) {
    const key = h.line + '/' + h.stop;
    const sites = posts.get(key) ?? new Set<Place>();
    posts.set(key, sites);
    sites.add(at);
    owner.cleanup(() => {
      sites.delete(at);
      if (!sites.size) posts.delete(key);
    });
  }
  faces.add(paint);
  owner.cleanup(() => faces.delete(paint));
  paint();
}
