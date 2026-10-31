// Parses the narrative files (docs/atlas/concepts.json and docs/atlas/stories/*.json) given as raw text. PURE and
// never throws: a file that does not parse is skipped and reported in loadProblems, so the page and the build
// survive a broken edit.

export const EMPTY_CONCEPTS = { intro: null, kinds: {}, channels: {}, folders: {}, boxes: {}, concepts: [] };

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

// conceptsText: string | undefined. storyTexts: { [path]: text }.
// Returns { N, loadProblems }; N is the concepts object plus `stories` (sorted by order, then id) and
// `loadProblems` again for convenience.
export function parseNarrative({ conceptsText, storyTexts } = {}) {
  const loadProblems = [];
  let c = { ...EMPTY_CONCEPTS };
  try {
    const j = JSON.parse(conceptsText);
    if (!isObj(j)) throw new Error('top level must be an object');
    c = {
      intro: isObj(j.intro) ? j.intro : null,
      kinds: isObj(j.kinds) ? j.kinds : {},
      channels: isObj(j.channels) ? j.channels : {},
      folders: isObj(j.folders) ? j.folders : {},
      boxes: isObj(j.boxes) ? j.boxes : {},
      concepts: Array.isArray(j.concepts) ? j.concepts.filter(isObj) : [],
    };
  } catch (err) {
    loadProblems.push(
      `docs/atlas/concepts.json: ${err?.message ?? err} (the page shows no concept text until it parses)`,
    );
  }
  const stories = [];
  for (const [path, text] of Object.entries(storyTexts ?? {})) {
    const file = path.replace(/^.*docs\/atlas\//, 'docs/atlas/');
    try {
      const j = JSON.parse(text);
      if (!isObj(j)) throw new Error('top level must be an object');
      if (typeof j.id !== 'string' || !j.id) throw new Error('missing "id"');
      if (!Array.isArray(j.steps)) throw new Error('missing "steps" array');
      stories.push({ ...j, _file: file });
    } catch (err) {
      loadProblems.push(`${file}: ${err?.message ?? err} (this story is skipped until it parses)`);
    }
  }
  stories.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.id).localeCompare(String(b.id)));
  const N = { ...c, stories, loadProblems };
  return { N, loadProblems };
}
