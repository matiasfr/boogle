// Parses the narrative files (docs/atlas/concepts.json and docs/atlas/stories/*.json) given as raw text. PURE and
// never throws: a file that does not parse is skipped and reported in loadProblems, so the page and the build
// survive a broken edit.

import type { Concept, Narrative, Story } from './types.ts';

type Obj = Record<string, unknown>;
const EMPTY_CONCEPTS = { intro: null, kinds: {}, channels: {}, folders: {}, boxes: {}, concepts: [] };

const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x);
const msg = (err: unknown) => (err instanceof Error ? err.message : String(err));

// conceptsText: string | undefined. storyTexts: { [path]: text }.
// Returns N: the concepts object plus `stories` (sorted by order, then id) and `loadProblems`.
export function parseNarrative({
  conceptsText,
  storyTexts,
}: { conceptsText?: string; storyTexts?: Record<string, string> } = {}): Narrative {
  const loadProblems = [];
  let c: Omit<Narrative, 'stories' | 'loadProblems'> = { ...EMPTY_CONCEPTS };
  try {
    const j: unknown = JSON.parse(conceptsText ?? '');
    if (!isObj(j)) throw new Error('top level must be an object');
    c = {
      intro: isObj(j.intro) ? j.intro : null,
      kinds: isObj(j.kinds) ? (j.kinds as Narrative['kinds']) : {},
      channels: isObj(j.channels) ? (j.channels as Narrative['channels']) : {},
      folders: isObj(j.folders) ? (j.folders as Narrative['folders']) : {},
      boxes: isObj(j.boxes) ? (j.boxes as Narrative['boxes']) : {},
      concepts: Array.isArray(j.concepts) ? (j.concepts.filter(isObj) as unknown as Concept[]) : [],
    };
  } catch (err) {
    loadProblems.push(`docs/atlas/concepts.json: ${msg(err)} (the page shows no concept text until it parses)`);
  }
  const stories: Story[] = [];
  for (const [path, text] of Object.entries(storyTexts ?? {})) {
    const file = path.replace(/^.*docs\/atlas\//, 'docs/atlas/');
    try {
      const j: unknown = JSON.parse(text);
      if (!isObj(j)) throw new Error('top level must be an object');
      if (typeof j.id !== 'string' || !j.id) throw new Error('missing "id"');
      if (!Array.isArray(j.steps)) throw new Error('missing "steps" array');
      stories.push({ ...(j as unknown as Story), _file: file });
    } catch (err) {
      loadProblems.push(`${file}: ${msg(err)} (this story is skipped until it parses)`);
    }
  }
  stories.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.id).localeCompare(String(b.id)));
  return { ...c, stories, loadProblems };
}
