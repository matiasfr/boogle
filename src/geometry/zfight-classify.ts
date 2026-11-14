import type { Contact, Point } from './zfight.ts';
export type ZfightClass = 'a' | 'b' | 'c';
export type Finding = Contact & {
  id: string;
  class: ZfightClass;
  count: number;
  members: Contact[];
  reasons: string[];
};
export const className = { a: 'likely visible', b: 'joints', c: 'hidden' } as const;
const category = (c: Contact): ZfightClass => (c.hidden ? 'c' : c.differences?.length === 0 ? 'b' : 'a');
/** Group orientations first. Then group one anchor against repeated instances of a declared part family.
 * Every group retains all original contacts and coordinates. Never merge a chain of different anchors.
 */
export function classifyZfights(contacts: readonly Contact[]): Finding[] {
  const pairs = new Map<string, Contact[]>();
  for (const c of contacts) {
    const key = JSON.stringify([c.a, c.b]);
    const list = pairs.get(key) ?? [];
    list.push(c);
    pairs.set(key, list);
  }
  const rows = [...pairs.values()]
    .map((members) => {
      const visible = members.filter((m) => !m.hidden);
      const selected = [...(visible.length ? visible : members)].sort((a, b) =>
        Math.abs(b.area - a.area) < 1e-4 ? b.normal[1] - a.normal[1] : b.area - a.area,
      )[0]!;
      const cls: ZfightClass = visible.some((m) => category(m) === 'a') ? 'a' : visible.length ? 'b' : 'c';
      return { selected, members, cls };
    })
    .sort(
      (a, b) =>
        b.selected.area - a.selected.area ||
        a.selected.a.localeCompare(b.selected.a) ||
        a.selected.b.localeCompare(b.selected.b),
    );
  const used = new Set<number>(),
    result: Finding[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (used.has(i)) continue;
    const first = rows[i]!;
    const pattern = (c: Contact) =>
      c.assembly && c.familyA && c.familyB ? JSON.stringify([c.assembly, ...[c.familyA, c.familyB].sort()]) : null;
    const patternKey = pattern(first.selected);
    const choices = [
      { anchor: first.selected.a, family: first.selected.familyB ?? first.selected.b },
      { anchor: first.selected.b, family: first.selected.familyA ?? first.selected.a },
    ].map((choice) => ({
      ...choice,
      indices: rows.flatMap((r, j) =>
        !used.has(j) &&
        r.cls === first.cls &&
        (patternKey
          ? pattern(r.selected) === patternKey
          : (r.selected.a === choice.anchor && (r.selected.familyB ?? r.selected.b) === choice.family) ||
            (r.selected.b === choice.anchor && (r.selected.familyA ?? r.selected.a) === choice.family))
          ? [j]
          : [],
      ),
    }));
    choices.sort((a, b) => b.indices.length - a.indices.length || a.anchor.localeCompare(b.anchor));
    const choice = choices[0]!;
    const members = choice.indices.flatMap((j) => {
      used.add(j);
      return rows[j]!.members;
    });
    const representative = first.selected;
    result.push({
      ...representative,
      id: patternKey
        ? JSON.stringify([first.cls, 'pattern', patternKey])
        : JSON.stringify([first.cls, choice.anchor, choice.family]),
      class: first.cls,
      count: members.length,
      members,
      reasons: [
        ...new Set(
          members.flatMap((m) =>
            m.hidden ? ['occluded by closed solid or drawn terrain'] : (m.differences ?? ['unknown appearance']),
          ),
        ),
      ],
      area: choice.indices.reduce((sum, j) => sum + rows[j]!.selected.area, 0),
    });
  }
  return result.sort((a, b) => b.area - a.area || a.id.localeCompare(b.id));
}
export type Baseline = { version: 1; entries: { id: string; pairs: string[]; position: Point; area: number }[] };
export const pairKey = (c: Contact) => JSON.stringify([c.a, c.b]);
export function makeBaseline(findings: readonly Finding[]): Baseline {
  return {
    version: 1,
    entries: findings
      .filter((f) => f.class === 'a')
      .map((f) => ({
        id: f.id,
        pairs: [...new Set(f.members.filter((m) => !m.hidden && m.differences?.length !== 0).map(pairKey))].sort(),
        position: f.position,
        area: f.area,
      })),
  };
}
export function baselineDelta(findings: readonly Finding[], baseline: Baseline) {
  const known = new Set(baseline.entries.flatMap((e) => e.pairs));
  const actionable = findings.filter((f) => f.class === 'a');
  const present = new Set(
    actionable.flatMap((f) => f.members.filter((m) => !m.hidden && m.differences?.length !== 0).map(pairKey)),
  );
  return {
    newFindings: actionable.filter((f) =>
      f.members.some((m) => !m.hidden && m.differences?.length !== 0 && !known.has(pairKey(m))),
    ),
    stalePairs: [...known].filter((key) => !present.has(key)),
  };
}
