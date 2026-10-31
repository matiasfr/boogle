// Atlas types: the facts the extractor writes (dev/atlas/extract.ts, schema in docs/plans/atlas.md), the model the views
// draw, and the narrative read from docs/atlas/. Types only; nothing here runs.

export interface FrameFacts {
  phase: string | null;
  order: number | null;
  name: string;
  core: boolean;
}

/** What one file registers. `f` is the repo path with its real extension. */
export interface FileFacts {
  f: string;
  loc: number;
  head: string;
  imports: string[];
  lazy: string[];
  exports: string[];
  names: string[];
  frames: FrameFacts[];
  owner: string[];
  host: string[];
  ops: string[];
  states: string[];
  ticks: string[];
  msgs: string[];
  onMessage: boolean;
  submits: boolean;
  actions: string[];
  interact: number;
  routes: string[];
  lockstep: boolean;
  parseError?: string;
}

export type KeyKind = 'ops' | 'states' | 'owner' | 'host' | 'msgs' | 'actions' | 'routes';

export interface GitFacts {
  head: string;
  commits: number | null;
  first: string | null;
}

export interface Facts {
  schema: number;
  git: GitFacts | null;
  loop?: { pre: (string | null)[]; render: string | null } | null;
  files: FileFacts[];
  error?: string;
}

export interface FactsDiff {
  filesAdded: string[];
  filesRemoved: string[];
  foldersAdded: string[];
  foldersRemoved: string[];
  keys: Partial<Record<KeyKind, { added: string[]; removed: string[] }>>;
}

export type Kind = 'lock' | 'adapter' | 'host' | 'owner' | 'msg' | 'local';

export interface ModelFile extends FileFacts {
  dir: string;
  kind: Kind;
  name: string;
  uses: Set<string>;
  users: string[];
}

export interface Model {
  facts: Facts;
  files: ModelFile[];
  byPath: Map<string, ModelFile>;
  byBare: Map<string, ModelFile>;
  dirs: Record<string, ModelFile[]>;
  featureCount: number;
}

export interface Hook {
  id: string;
  phase: string | null;
  order: number | null;
  name: string;
  file: string;
  base: string;
  core: boolean;
  kind?: Kind;
}

export interface Layer {
  id: string;
  name: string;
  short: string;
  c: string;
  dirs: string[];
  note: string;
}

/** One thing in the code a concept or story step points at; exactly one key besides `symbol`. */
export interface Cite {
  file?: string;
  symbol?: string;
  dir?: string;
  op?: string;
  state?: string;
  presence?: string;
  hostField?: string;
  message?: string;
  action?: string;
  route?: string;
}

export interface Step {
  text?: string;
  code?: string;
  go?: string[][];
  hl?: string[];
  cite?: Cite[];
}

export interface Story {
  id: string;
  title?: string;
  kind?: string | null;
  order?: number;
  steps: Step[];
  _file?: string;
}

export interface Concept {
  id: string;
  title?: string;
  one?: string;
  like?: string;
  rules?: string[];
  code?: Cite[];
  view?: string;
}

export interface Intro {
  title?: string;
  lead?: string;
  question?: string;
  foot?: string;
  ways?: { kind: string; says?: string; eg?: string }[];
}

export interface Channel {
  name?: string;
  d?: string;
  tag?: string;
}

/** concepts.json plus the stories folder, parsed. */
export interface Narrative {
  intro: Intro | null;
  kinds: Record<string, string>;
  channels: Record<string, Channel>;
  folders: Record<string, string>;
  boxes: Record<string, string>;
  concepts: Concept[];
  stories: Story[];
  loadProblems: string[];
}

export interface ChangeEntry {
  date: string;
  body: string;
}

/** What is selected: the root, or one thing by kind and id ('changes' has no id). */
export type Selection =
  { t: 'root' | 'changes' } | { t: 'concept' | 'layer' | 'dir' | 'file' | 'channel' | 'hook'; id: string };

/** The page's one shared state. */
export interface State {
  view: string;
  mapStyle: string;
  sel: Selection;
  openDir: string | null;
  focusFile: string | null;
  story: string | null;
  stepI: number;
  focusBack: (string | null)[];
}

/** What every view gets: the state, the code model, the narrative and the page's own helpers. */
export interface Ctx {
  S: State;
  M: Model;
  N: Narrative;
  changesMd: string;
  select: (s: Selection, rebuild?: boolean) => void;
  render: (rebuild?: boolean) => void;
  kc: (kind: string) => string;
  esc: (s: unknown) => string;
}

/** A view returns this to be told about a selection change without a rebuild, or null to be redrawn instead. */
export type Update = ((ctx: Ctx) => void) | null;
