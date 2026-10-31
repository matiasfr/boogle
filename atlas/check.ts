// The citation report: everything in docs/atlas/ that no longer matches the code or the layout. PURE.
// `npm run atlas -- --check` prints it and always exits 0; nothing ever fails a build because of it.
import { BOX, CHANNEL_IDS, KINDS, LANES, VIEWS, validRef } from './layout.ts';
import { buildModel, resolveCite } from './model.ts';
import { linksOf, parseChanges } from './changes.ts';
import type { Facts, Model, Narrative, Story } from './types.ts';

const isStr = (x: unknown): x is string => typeof x === 'string' && x.trim() !== '';
const CONCEPTS = 'docs/atlas/concepts.json';
const CHANGES = 'docs/atlas/changes.md';

function validDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

// Folders that exist in the facts but have no note in concepts.json "folders": a to-do list, not errors.
export function foldersToDo(facts: Facts, concepts?: Narrative): string[] {
  const model = buildModel(facts);
  return Object.keys(model.dirs).filter((d) => !isStr(concepts?.folders?.[d]));
}

// -> string[] of problems, each naming the file and the fix.
export interface AtlasInput {
  facts: Facts;
  concepts?: Narrative;
  stories?: Story[];
  changes?: string;
  loadProblems?: string[];
}

export function checkAtlas({ facts, concepts, stories = [], changes, loadProblems = [] }: AtlasInput): string[] {
  const out: string[] = [];
  const model = buildModel(facts);
  out.push(...loadProblems);
  for (const f of model.files)
    if (f.parseError) out.push(`${f.f}: could not parse it (${f.parseError}); the atlas skips its facts`);
  if (facts?.error) out.push(`extractor failed: ${facts.error}`);

  const cite: CiteFn = (where, c) => {
    const r = resolveCite(c, model);
    if (r.error) out.push(`${where}: cite ${JSON.stringify(c)}: ${r.error}`);
  };

  if (!loadProblems.some((p) => p.startsWith(CONCEPTS))) checkConcepts(out, model, concepts, cite);

  const seen = new Set();
  for (const s of stories) {
    const file = s._file ?? `docs/atlas/stories/${s.id}.json`;
    const base = file
      .split('/')
      .pop()!
      .replace(/\.json$/, '');
    if (s.id !== base) out.push(`${file}: id "${s.id}" must equal the file name "${base}" (rename one)`);
    if (seen.has(s.id)) out.push(`${file}: duplicate story id "${s.id}"`);
    seen.add(s.id);
    if (!isStr(s.title)) out.push(`${file}: title must be a non-empty string`);
    if (s.kind !== null && !(String(s.kind) in KINDS))
      out.push(`${file}: kind ${JSON.stringify(s.kind)} must be null or one of ${Object.keys(KINDS).join(', ')}`);
    if (typeof s.order !== 'number') out.push(`${file}: order must be a number`);
    const steps = Array.isArray(s.steps) ? s.steps : [];
    if (steps.length < 1 || steps.length > 10) out.push(`${file}: needs 1 to 10 steps (has ${steps.length})`);
    steps.forEach((st, i) => {
      const where = `${file} step ${i + 1}`;
      if (!isStr(st.text)) out.push(`${where}: text must be a non-empty string`);
      else if (st.text.length > 240)
        out.push(`${where}: text is ${st.text.length} characters; keep it to 240 or fewer`);
      if (st.go === undefined && st.hl === undefined)
        out.push(`${where}: needs go (routes) and/or hl (boxes to highlight)`);
      if (st.go !== undefined) {
        if (!Array.isArray(st.go)) out.push(`${where}: go must be a list of routes`);
        else
          st.go.forEach((route) => {
            if (!Array.isArray(route) || route.length < 2)
              out.push(`${where}: a go route needs at least 2 refs (${JSON.stringify(route)})`);
            else
              for (const ref of route)
                if (!validRef(ref))
                  out.push(
                    `${where}: unknown box or lane ${JSON.stringify(ref)} in go (boxes: ${Object.keys(BOX).join(', ')}; lanes: ${Object.keys(
                      LANES,
                    )
                      .map((k) => 'lane:' + k)
                      .join(', ')})`,
                  );
          });
      }
      if (st.hl !== undefined) {
        if (!Array.isArray(st.hl)) out.push(`${where}: hl must be a list of box ids`);
        else
          for (const ref of st.hl)
            if (!(ref in BOX))
              out.push(`${where}: unknown box ${JSON.stringify(ref)} in hl (boxes: ${Object.keys(BOX).join(', ')})`);
      }
      if (!Array.isArray(st.cite) || st.cite.length === 0) out.push(`${where}: cite must be a non-empty list`);
      else for (const c of st.cite) cite(where, c);
    });
  }

  checkChanges(out, changes, new Set(stories.map((s) => s.id)), new Set((concepts?.concepts ?? []).map((c) => c.id)));

  if (!facts?.error && !facts?.loop)
    out.push(
      'src/main: the extractor could not find the frame function (the one given to setAnimationLoop, which calls runFrame); the Frame view shows no pre-step row',
    );
  return out;
}

type CiteFn = (where: string, c: unknown) => void;

function checkConcepts(out: string[], model: Model, concepts: Narrative | undefined, cite: CiteFn) {
  const list = concepts?.concepts ?? [];
  const ids = new Set();
  list.forEach((c, i) => {
    const where = `${CONCEPTS} concept ${c?.id ?? `#${i + 1}`}`;
    if (!isStr(c.id) || !/^[a-z][a-z0-9-]*$/.test(c.id))
      out.push(`${CONCEPTS} concept #${i + 1}: id ${JSON.stringify(c.id)} must match ^[a-z][a-z0-9-]*$`);
    if (ids.has(c.id)) out.push(`${where}: duplicate id`);
    ids.add(c.id);
    for (const k of ['title', 'one', 'like'] as const)
      if (!isStr(c[k])) out.push(`${where}: ${k} must be a non-empty string`);
    if (!Array.isArray(c.rules) || !c.rules.length || !c.rules.every(isStr))
      out.push(`${where}: rules must be a non-empty list of strings`);
    if (!Array.isArray(c.code) || !c.code.length) out.push(`${where}: code must be a non-empty list of cites`);
    else for (const x of c.code) cite(where, x);
    if (c.view !== undefined && !VIEWS.includes(c.view))
      out.push(`${where}: view ${JSON.stringify(c.view)} must be one of ${VIEWS.join(', ')}`);
  });
  for (const [id, b] of Object.entries(BOX)) {
    if (!ids.has(b.c)) out.push(`atlas/layout.ts BOX ${id}: unknown concept "${b.c}" (add it to ${CONCEPTS} concepts)`);
  }
  for (const k of Object.keys(concepts?.boxes ?? {}))
    if (!(k in BOX)) out.push(`${CONCEPTS} boxes: "${k}" is not a BOX id in atlas/layout.ts`);
  same(out, 'kinds', Object.keys(concepts?.kinds ?? {}), Object.keys(KINDS));
  same(out, 'channels', Object.keys(concepts?.channels ?? {}), CHANNEL_IDS);
  for (const w of concepts?.intro?.ways ?? [])
    if (!(String(w?.kind) in KINDS))
      out.push(`${CONCEPTS} intro.ways: kind ${JSON.stringify(w?.kind)} is not a KINDS key`);
  for (const d of Object.keys(concepts?.folders ?? {}))
    if (!model.dirs[d])
      out.push(`${CONCEPTS} folders: "${d}" is not a folder in the code any more (remove or rename the note)`);
}

function same(out: string[], name: string, have: string[], want: string[]) {
  for (const k of want) if (!have.includes(k)) out.push(`${CONCEPTS} ${name}: missing "${k}"`);
  for (const k of have) if (!want.includes(k)) out.push(`${CONCEPTS} ${name}: "${k}" is not one of ${want.join(', ')}`);
}

function checkChanges(out: string[], text: string | undefined, stories: Set<string>, concepts: Set<string>) {
  if (typeof text !== 'string' || !text.trim()) {
    out.push(`${CHANGES}: missing or empty (start it with "# What changed")`);
    return;
  }
  if (text.split('\n')[0].trim() !== '# What changed') out.push(`${CHANGES}: the first line must be "# What changed"`);
  let prev = null;
  for (const e of parseChanges(text)) {
    if (!validDate(e.date)) out.push(`${CHANGES}: "## ${e.date}" is not a valid YYYY-MM-DD date`);
    else {
      if (prev && e.date > prev) out.push(`${CHANGES}: ## ${e.date} comes after ## ${prev}; newest first`);
      prev = e.date;
    }
    if (!e.body) out.push(`${CHANGES}: ## ${e.date} has no text`);
    for (const { kind, id } of linksOf(e.body)) {
      const ok = kind === 'story' ? stories.has(id) : kind === 'concept' ? concepts.has(id) : VIEWS.includes(id);
      if (!ok) out.push(`${CHANGES} ## ${e.date}: link #${kind}/${id} points at nothing (fix the id or drop the link)`);
    }
  }
}
