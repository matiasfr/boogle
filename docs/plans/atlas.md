# Boogle Atlas

## Goal

An internal knowledge base at https://boogle.club/atlas for the people and agents building Boogle. It is not a player
feature. It explains how Boogle fits together for someone who learns by looking. It opens on a "How it works" concept
diagram with step-through stories, and code-level views sit underneath for drilling down: Map, Focus, Network flow and
Frame. A script extracts the facts on every build. A daily agent keeps the narrative current and fixes broken
citations. Nothing about the atlas ever fails a build or CI.

Principle: a new technical principle, **Understandable at a glance**, added to DESIGN.md in step 1 (its own commit,
with the reason, per "How we work").

The atlas bends **Small and readable**'s "few dependencies": it adds six d3 modules (and their type packages). That is acceptable
for three reasons. The atlas is an internal page; d3 is imported only from `atlas/` and never reaches the game bundle
(step 5 checks this); the reader uses `typescript`, already a devDependency. The new principle states this exception in one
sentence.

Approved prototype (the look and UX to port): `v4-template.html`, `extract.mjs` and `data.json` in
`/private/tmp/claude-501/-Users-matiasfranco-Developer-boogle/327e8d76-c850-4874-b9bf-860be5cab2ca/scratchpad/atlas/`
(screenshots `v4-*.png` and `v3-*.png` in the same folder). Step 0 copies them into the repo's gitignored `.look/`,
because `/private/tmp` does not survive a reboot.

## Adjusted for main at 98c072e

The plan was written before the WebGPU renderer migration landed. Re-read against `AGENTS.md`, `src/README.md`,
`src/loop.ts` and `src/main.ts` on that commit:
- The render pass is `renderFrame()` (from `src/render/scene.js`), not `renderer.render`; the Frame view's last slice
  is named `renderFrame`. The pre-step list is no longer a constant: the extractor reads it from `src/main.ts` (`facts.loop`).
- The Frame view's core hooks come from the extractor (`isCoreHook` in `dev/scan/read.mjs`: outside `src/features/`, with
  an order below −10 or from 3000 up, the ranges `src/loop.ts` reserves), the same predicate the registry check uses.
- New folders (`src/boot/`, `src/decomp/`, `src/guest/`, `src/island/`, `src/pois/`) must have a `LAYERS` home in
  `atlas/layout.js` (the unknown-folder fallback to "Game systems" stays as a safety net, not the plan).
- `npm run registry` (in `check`) and `dev/registry/scan.mjs` scan presence keys, messages and pads. They used a regex
  scanner; both now project one acorn reader, `dev/scan/read.mjs` (see "One reader" below), and
  `npm run registry -- --json` is a handy cross-check for step 3. Presence keys now "name the feature"; existing short
  keys (`b`, `g`) stay, so story cites are checked against the extractor's output, never memory.
- `docs/game-design.md` is now `docs/game-design/` (a file per system). Nothing changes for the atlas (no player-visible
  change).

## Design

### Sync kinds, authority, controls, visibility

- The atlas is a separate static page, not a game feature. It has **no game state**: nothing is Owner, Host, Lockstep
  or a message, and it adds no presence keys, ops or wire changes. Its only state is **Local**: the selection and view
  in memory, the theme in `localStorage` (`boogle.atlas.theme`), and the URL hash.
- No controls: no `registerAction`, no pad slot, no guide row. Keys work only on the atlas page (`/` search, arrows to
  step through a story, Esc). `freeSlots()` is unaffected.
- The game is untouched: `index.html`, `src/main.ts` and `src/style.css` are not edited, nothing under `src/` imports
  the atlas, and **the game never links to it**. Anyone with the link can open `/atlas/`, and
  `<meta name="robots" content="noindex">` keeps it out of search engines. (A site-wide `robots.txt` is a separate
  decision and is not part of this plan.)

### Three layers of content

| Layer | Who writes it | Where | Committed? |
|---|---|---|---|
| **Facts** (files, imports, sync kind inputs, keys, ops, states, messages, actions, interactables, frame hooks, routes, git head and commit count) | `dev/atlas/extract.mjs`, deterministic | Vite virtual module `virtual:atlas-facts` at build and dev time; `npm run atlas` writes `.look/atlas/facts.json` for inspection | **No** |
| **Narrative** (concepts, stories, box subtitles, folder notes, kind and channel copy, "what changed" digest) | Agents and people, kept current by the daily agent | `docs/atlas/concepts.json`, `docs/atlas/stories/<id>.json`, `docs/atlas/changes.md` | Yes |
| **Layout and mechanics** (box geometry, lanes, layers, colours, view code) | Code | `atlas/*.js` | Yes |

**Why facts are generated, not committed:** they change with almost every `src/` commit, so a committed facts file
would conflict on nearly every rebase while friends ship in parallel. The deploy build can have git history:
`deploy.yml` builds from `actions/checkout@v4` at the default depth 1 today, and step 10 sets `fetch-depth: 0` (the
`.git` folder is about 9 MB). Without history (CI's shallow clones) the extractor returns `git: null` and
only the head, and the UI hides the commit count.

**Parser:** the TypeScript compiler API (`typescript`, already a devDependency), which reads `.js` and `.ts` alike. The
first version used acorn; it cannot parse TypeScript, so once `main` converted `src/` the reader moved to `ts.createSourceFile`
and a small `forEachChild` walker. Everything below that says "acorn" now means this reader. A parse of all 159 files
takes well under a second, with no failures.

**Box/lane layout stays in code** (`atlas/layout.js`). It is SVG geometry tied to the renderer, and an agent should not
move coordinates. The citation report checks every reference to it. What a box *says* (its subtitle) is narrative and
lives in `concepts.json` under `boxes`.

**d3:** six d3 modules (`d3-selection`, `d3-transition`, `d3-interpolate`, `d3-hierarchy`, `d3-shape`, `d3-sankey`)
instead of the `d3` umbrella. They are the same code `d3@7.8.5` ships, but about 12 packages in the lockfile instead
of about 31. They are imported only from `atlas/`, so Rollup puts them in the atlas chunk; `manualChunks` in
`vite.config.js` returns `undefined` for them. Pin exact versions: `d3-selection@3.0.0 d3-transition@3.0.1
d3-interpolate@3.0.1 d3-hierarchy@3.1.2 d3-shape@3.2.0 d3-sankey@0.12.3` (the set `d3@7.8.5` uses). If npm resolves
newer patch versions, take them. Put them in `dependencies` (they ship to users, like `three`).

**Hosting:** Vite multi-page. `atlas/index.html` sits at the repo root, so the build writes `dist/atlas/index.html`.
GitHub Pages serves a directory's `index.html` and redirects `/atlas` to `/atlas/`, the same way `/updates/<tag>/` works
today (`dev/video/site.mjs`). The Vite dev server serves `/atlas/` too.

### Never fail the build, never crash the page

Stale narrative is a chore for the daily agent, never a red build.
- **Extractor:** a file acorn cannot parse gets `{ f, loc, parseError: '<message>' }` with empty arrays, and extraction
  goes on. `gitFacts` never throws. The Vite plugin wraps `extractFacts` in `try`, and on failure emits
  `{ schema: 1, git: null, files: [], error: '<message>' }`. The page then shows a banner and the
  narrative-only views.
- **Narrative loading:** a broken JSON file must not fail the Vite build, so `atlas/main.js` imports
  `concepts.json` and the stories as raw text (`?raw`, and
  `import.meta.glob('../docs/atlas/stories/*.json', { eager: true, query: '?raw', import: 'default' })`) and parses
  each one in a `try`. A file that fails to parse is skipped (concepts fall back to
  `{ intro: null, kinds: {}, channels: {}, folders: {}, boxes: {}, concepts: [] }`) and is listed in a small "Atlas
  problems" note at the bottom of the root inspector.
- **Rendering with broken references** (`resolveCite` returns an error instead of throwing):
  - A cite that doesn't resolve renders as a greyed chip with a `stale` tag and a `title` that explains it. It is not
    clickable.
  - A story route with an unknown box or lane is not drawn; the step's caption gets a small "part of this picture is
    out of date" note. A step with no drawable route still shows its text.
  - A BOX whose concept id is missing from `concepts.json` draws with the id as its title, and its card says "No
    description yet".
  - An unknown story `kind` draws in the accent colour.
  - A `#story/…` link in `changes.md` that points nowhere renders as plain text.
  - A missing folder note, kind text or channel copy renders as nothing.
- **Citation report** (`npm run atlas -- --check`): lists every problem found by `checkAtlas` (below) and **always
  exits 0**. The daily agent runs it first thing and fixes everything it lists. People and agents may run it before
  shipping a big change, but nothing requires it.

### Files

```
atlas/                       the page (browser code; nothing under src/ imports it)
  index.html                 shell markup (prototype lines 144-167) + noindex meta + Geist font link + <script type="module" src="./main.js">
  atlas.css                  prototype CSS (lines 7-141) + theme button, changes panel, stale chip, banner styles
  layout.js                  PURE: LAYERS, KINDS, BOX, LANES, CHANNEL_IDS, VIEWS, REFS, ROUTE_VIA
  ../dev/scan/read.mjs       the shared acorn reader (readFile, isCoreHook); also behind `npm run registry`
  model.js                   PURE: dirOf, kindOf, layerOf, buildModel, wireOf, registrations, hooks, resolveCite, searchIndex
  narrative.js               PURE: parseNarrative({ conceptsText, storyTexts }) -> { N, loadProblems } (never throws)
  check.js                   PURE: checkAtlas({ facts, concepts, stories, changes }) -> string[] of problems
  changes.js                 PURE: parseChanges(md) -> [{ date, body }]; renderChanges(entries, known)
  main.js                    state, render(), event delegation, search, keyboard, theme, hash links
  views/how.js               concept diagram + stories (prototype howView, routePts, edgeToward, conceptCard, howIntro)
  views/map.js               mapLayers, mapPack, mapTree, hier, fillFor, litFor
  views/focus.js             focusView
  views/flow.js              flowView (sankey)
  views/frame.js             frameView
  views/inspector.js         inspector() for every selection type, legend, fileList, stackBar, citeChip
dev/atlas/
  extract.mjs                extractFile, listSources, extractFacts, gitFacts, factsAt, diffFacts
  git.mjs                    no dependencies: the git wrapper, `sinceRef`, and the `gate` for `--gate`
  cli.mjs                    `npm run atlas` (summary), `--json`, `--check`, `--changes [--since <ref>]`, `--gate [--event <name>]`
  vite-plugin.mjs            atlasFacts(): the virtual:atlas-facts module
  agent-prompt.md            what the daily agent does
docs/atlas/
  README.md                  schemas and editing rules for agents and people
  concepts.json
  stories/frame.json honk.json ball.json mush.json boogler.json join.json
  changes.md
test/atlas.test.mjs          pure logic only, on in-memory fixtures; never reads docs/atlas/ or src/
dev/scenarios/atlas.mjs      nightly stills of every view, light and dark
.github/workflows/atlas.yml  the upkeep agent
```

"PURE" means no DOM, d3 or `import.meta` at module level, so `test/atlas.test.mjs` and `dev/atlas/cli.mjs` can import
these files in Node.

### Facts schema (`extractFacts` output, `schema: 1`)

```js
{
  schema: 1,
  git: { head: 'b969888', commits: 198, first: '2026-10-28T…' } | null,   // commits and first are null if shallow
  loop: { pre: ['updateRemotes', …, 'world.step'], render: 'renderFrame' } | null, // main.js's frame function
  files: [{                                                 // sorted by path; arrays in source order, deduped
    f: 'src/features/honk.js', loc: 300,
    head: 'leading // comment block, joined, ≤260 chars',
    imports: ['src/…'],          // static `import … from './x.js'` and `export … from`, resolved to repo paths; .js only
    lazy: ['src/…'],             // import('./x.js') with a string literal
    exports: ['honkNow'],        // exported names ('default' for export default)
    names: ['honkNow', 'update'],// every function/class/variable declarator id and function-valued object key, any depth
    frames: [{ phase: 'late', order: 0, name: 'update', core: false }], // core: a reserved order outside src/features/
    owner: ['b'], host: ['g'],   // addPresenceField / addHostField first arg (string literal); owner also has buildPresence's core keys
    ops: [], states: [], ticks: [], // *.registerOp / *.registerState first arg; *.onTick second arg
    msgs: ['honk'], onMessage: true, submits: false, // msgs: `t: '...'` sent from a file that calls .send(, plus types compared with .t
    lockstep: false,             // the path matches eslint's LOCKSTEP_FILES
    actions: ['honk'],           // registerAction first arg (string literal)
    interact: 0,                 // registerInteractable call count
    routes: [],                  // server only: app.get|put|post|delete|use('<path>') -> 'PUT /rooms/:roomId/snapshot'
    parseError: undefined,       // set (and every array empty) only when acorn failed on this file
  }],
}
```

Extraction rules, so the implementer does not have to guess:
- `extractFacts({ root, git = true, sources })`: `sources` is an optional `[{ path, text }]` that replaces reading the
  tree, so tests can feed fixtures. Without it, `listSources(root)` walks `src/` and `server/src/` with
  `fs.readdirSync(…, { recursive: true })`, keeps `*.js`, and returns posix paths sorted with `localeCompare`.
- Parse with `acorn.parse(text, { ecmaVersion: 'latest', sourceType: 'module', locations: true, onComment })`, inside
  a `try` (see "Never fail the build").
- Calls are matched by callee name, either an `Identifier` (`onFrame(…)`) or a `MemberExpression` property
  (`sync.registerOp(…)`, `net.room?.send(…)`). Unwrap `ChainExpression` around callees and member expressions.
  Definitions (`export function addPresenceField`) are not calls, so they never count.
- `onFrame(fn, opts)`: `phase` and `order` come from `opts` properties that are literals (`order: -280` is a
  `UnaryExpression` `-` on a `Literal`). Missing values default to `'update'` and `0`; a non-literal gives `null`.
  `name`: `fn` as an `Identifier` gives its name. For an arrow or function, use the callee of the expression body (or of
  the first statement of a block body) when it is a call, taking an `Identifier` name or a member property name.
  Otherwise use the file's basename without `.js`.
- `msgs`, only in files that call `send` (identifier or member) or `onMessage`: string values of object properties
  keyed `t`, plus string literals compared (`===`/`!==`) with a `.t` member (`msg?.t !== 'honk'`).
- `head`: `Line` comments before the first token, joined with spaces, trimmed, sliced to 260.
- `gitFacts(root)`: return null when `git rev-parse` fails. When `git rev-parse --is-shallow-repository` prints
  `true`, return `{ head, commits: null, first: null }`. Otherwise add the commit count (`rev-list --count HEAD`) and the
  date of the first commit. (The per-commit file-count `growth` series was removed after review: nothing drew it. The
  time slider in the follow-ups needs it back, as one `git log --name-status --diff-filter=AD` pass, never a
  `git ls-tree` per commit.) `factsAt(root, ref)` unpacks a ref with one `git archive` into a temp dir.
- No timestamps, no `Date.now()`: the same tree and history give the same JSON.

### One reader (`dev/scan/read.mjs`)

`readFile(path, text)` is the single acorn pass over a file. It returns a raw record (names with line numbers, `sends`
apart from `reads`, `explicit` on frames with a literal order). `dev/atlas/extract.mjs` projects it into the facts
above, and `dev/registry/scan.mjs` into the registry. Where the two scanners differed, one definition now rules:
- **Messages:** a type belongs to the files that send it (`.send(` plus `t: '...'`); receivers' `.t ===` comparisons
  are `reads`, shown by the atlas but never counted as a second sender. The registry skips `src/net/` (the room's own
  protocol).
- **Presence:** includes the core keys of `buildPresence()` in `src/netplay/net.js`, in both.
- **Core hook:** `isCoreHook(file, order)`: outside `src/features/` and an order below −10 or from 3000 up.
- **Parse errors:** the registry reports a file it cannot parse; it no longer skips it.
`npm run atlas -- --gate` imports none of this, so it runs before `npm ci`.

### Derived model (`atlas/model.js`)

- `dirOf(path)`: `server/…` gives `'server'`; `src/x.js` gives `'(core)'`; `src/world/rules/…` gives `'world/rules'`;
  everything else gives the first segment after `src/`. This matches the prototype.
- `kindOf(file)` (the prototype's heuristic, corrected so `src/world/sync.js` stops showing as "Message" and
  `src/netplay/net.js` stops showing as "Local"):
  1. `ops`, `states` or `ticks` non-empty, a `w:` message, or the file's `lockstep` flag (it matches eslint's
     `LOCKSTEP_FILES`, read from `eslint.config.js` as text): `'lock'`
  2. `host` non-empty: `'host'`
  3. `owner` non-empty (this includes the core keys of `buildPresence` in `src/netplay/net.js`): `'owner'`
  4. `msgs` non-empty or `onMessage`: `'msg'`
  5. `submits`: `'adapter'`
  6. otherwise `'local'`
- `layerOf(dir)`: the `LAYERS` entry listing `dir`. An unknown folder falls back to `L1` ("Game systems"), so a new
  `src/<folder>/` never crashes the page (the prototype would throw).
- `wireOf(file)`: as in the prototype (skip `src/net/` and `src/debug/`), except that `w:`-prefixed `msgs` go to the
  `lock` channel (the lockstep wire).
- `hooks(model)`: every extracted frame, plus `facts.loop.pre` as phase `'pre'` (in call order) and `facts.loop.render`
  as phase `'render'`; without `facts.loop` there is no pre or render row. `core` comes from the extractor
  (`frames[].core`). Hook id: `` `${file}#${n}` `` (the nth `onFrame` in that file), because `src/features/boogler.js`
  has two hooks with the same phase and order.
- `resolveCite(cite, model) -> { files: string[], error: string | null }`. It never throws, including on a malformed
  cite. A cite has exactly one of these keys: `file` (with optional `symbol`, which must be in that file's `exports`
  or `names`), `dir` (a repo path such as `"src/world/rules"` or `"server"`; some file must start with `dir + '/'`),
  `op`, `state`, `presence`, `hostField`, `message`, `action` (matched against `actions[].id`) or `route` (e.g.
  `"PUT /rooms/:roomId/snapshot"`).
- `searchIndex(model, narrative)`: the prototype's INDEX, plus concept titles (`c:<id>`) and story titles
  (`s:<id>`).

### Layout constants (`atlas/layout.js`)

Copy from the prototype, with these changes:
- `BOX`: keep `x, y, w, h, c, lock` and **drop `t` and `s`**. The title comes from `concepts[c].title` (falling back to
  `c`) and the subtitle from `concepts.json` `boxes[<box id>]`. Box ids stay exactly: `you.features you.registries
  you.loop you.systems you.world you.netplay you.input you.screen fr.features fr.systems fr.netplay fr.world fr.screen
  server`.
- `LANES`: `{ msg: { y: 97 }, owner: { y: 222 }, host: { y: 262 }, lock: { y: 362 } }`. Labels come from
  `channels[k].name`.
- `ROUTE_VIA`: the prototype's special case (between `you.world` and `lane:lock`, pass through `[378, 362]`) as data:
  `[{ a: 'you.world', b: 'lane:lock', via: [378, 362] }]`. `routePts` in `views/how.js` applies it in both
  directions.
- `KINDS`: `{ lock, adapter, host, owner, msg, local }` with `name` and `c` (CSS variable). The descriptions move to
  `concepts.json` `kinds`.
- `CHANNEL_IDS = ['owner', 'host', 'lock', 'msg']`; `VIEWS = ['how', 'map', 'focus', 'flow', 'frame']`.
- `LAYERS`: as in the prototype (`id, name, short, c, dirs, note`).
- `REFS`: the prototype's design-reference strings. They describe the atlas, not Boogle, so they stay in code.

### Narrative schemas

`docs/atlas/concepts.json`:
```json
{
  "intro": { "title": "Boogle in one picture", "lead": "…", "question": "…", "foot": "Cheapest first: …",
             "ways": [{ "kind": "local", "says": "Only you see it", "eg": "particles, sky, sounds" }] },
  "kinds": { "lock": "Deterministic shared state; …", "adapter": "…", "host": "…", "owner": "…", "msg": "…", "local": "…" },
  "channels": { "owner": { "name": "Presence", "d": "…", "tag": "20 Hz · per player" }, "host": {…}, "lock": {…}, "msg": {…} },
  "folders": { "features": "Self-contained plug-ins. …", "world/rules": "…" },
  "boxes": { "you.features": "{features} plug-ins: honk, hotbar, ping, gifts, mushroom garden…", "fr.features": "the same plug-ins" },
  "concepts": [
    { "id": "world", "title": "Shared world", "one": "…", "like": "Chess by post: …",
      "rules": ["…"], "code": [{ "dir": "src/world" }, { "file": "src/world/sync.js", "symbol": "submitEdit" }], "view": "flow" }
  ]
}
```
`{features}` in a box subtitle is replaced with the number of `src/features/*.js` files, so the count never goes stale.

`docs/atlas/stories/<id>.json`:
```json
{ "id": "mush", "title": "You plant a mushroom", "kind": "lock", "order": 40,
  "steps": [
    { "go": [["you.features", "you.world"]], "text": "It submits the edit: plant at cell i, j. …",
      "code": "submitEdit({ op: 'mush.plant', i, j })",
      "cite": [{ "file": "src/world/sync.js", "symbol": "submitEdit" }, { "op": "mush.plant" }] },
    { "hl": ["you.world", "fr.world"], "text": "…", "cite": [{ "file": "src/world/rules/mushrooms.js" }] }
  ] }
```
`go` is a list of routes, each a list of box ids or `lane:<msg|owner|host|lock>`; `hl` lists box ids to highlight.
`code` is a free-text snippet shown in mono, and `cite` holds the structured links shown as chips under it.

`docs/atlas/changes.md`: `# What changed` heading, then one `## YYYY-MM-DD` section per update, newest first. Plain
paragraphs and `- ` bullets, `` `code` ``, and links of the form `[text](#story/<id>)`, `[text](#concept/<id>)` or
`[text](#view/<id>)`.

### Citation report (`atlas/check.js`)

`checkAtlas({ facts, concepts, stories, changes })` is pure and returns a list of problems. Each message
names the file and the fix, e.g. `docs/atlas/stories/mush.json step 3: cite {"op":"mush.plant"}: no file registers op
mush.plant (renamed? update the cite)`. `npm run atlas -- --check` prints them (or "0 problems") and exits 0; the
unit test runs it only on fixtures. It reports:
- **Load problems** from `parseNarrative` (a file that isn't valid JSON or lacks `id`/`steps`), and extractor
  `parseError`s.
- **concepts:** ids unique and `^[a-z][a-z0-9-]*$`; `title`, `one` and `like` are non-empty strings; `rules` is a
  non-empty string array; `code` is a non-empty array of cites that all resolve; `view`, when set, is in `VIEWS`.
- **Layout references:** every `BOX[*].c` is a concept id (unknown concept). The keys of `boxes` are BOX ids. The keys
  of `kinds` equal the `KINDS` keys, and the keys of `channels` equal `CHANNEL_IDS`. `intro.ways[*].kind` is in
  `KINDS`. The keys of `folders` are folders that exist in the facts. Folders with no note are listed as a separate
  "to do" section, not as errors.
- **stories:** `id` equals the filename and is unique; `title` is non-empty; `kind` is a `KINDS` key or `null`;
  `order` is a number; there are 1 to 10 steps. Each step has `text` (≤ 240 chars), `go` and/or `hl`, and a non-empty
  `cite` where every cite resolves. Each `go` route has ≥ 2 refs, and every ref is a BOX id or `lane:` + a `LANES` key
  (unknown box, unknown lane). `hl` holds BOX ids.
- **changes.md:** first line `# What changed`; `## YYYY-MM-DD` dates are valid and non-increasing; no section is empty;
  every `#story/<id>`, `#concept/<id>` and `#view/<id>` link resolves.
- **Frame loop:** the extractor found it (`facts.loop`); if not, one problem says so (exit 0 as ever) and the Frame view
  shows no pre-step row.

## Steps

Each step is one commit and leaves `npm run check` green. After step 1, commit bodies name "Understandable at a
glance".

- [x] **0. Set up a clean worktree.** The main checkout has unrelated uncommitted work: `package.json` and
  `package-lock.json` (a `pngjs` devDependency hunk), `DESIGN.md` (a new "Code first, images by approval" section),
  `.claude/skills/concept-art/SKILL.md`, `dev/concepts/generate.mjs`, and untracked `dev/concepts/assets.json`,
  `dev/concepts/chroma.mjs` and `test/chroma.test.mjs` (which `npm run check` would pick up). **Never commit those
  hunks or files.** `npm run ship` also refuses to run with uncommitted changes. So work in a worktree:
  `git fetch origin main && git worktree add .claude/worktrees/atlas -b atlas origin/main` (`.claude/worktrees/` is
  gitignored), then `npm ci` inside it. Copy the prototype in, without committing it:
  `mkdir -p .look/atlas/prototype && cp <scratchpad>/atlas/{v4-template.html,extract.mjs,data.json,v4-*.png,v3-*.png} .look/atlas/prototype/`
  (`.look/` is gitignored). Verify: `git status` in the worktree is clean.

- [x] **1. Add the principle.** In the **worktree's** `DESIGN.md` (which has none of the user's uncommitted edits),
  insert a new section under "Technical principles", **between "### PeerJS only" and "### Small and readable"**. That
  spot is a few lines away from the user's uncommitted insertion *after* "Small and readable", so the two merge
  cleanly later. Text:

  > ### Understandable at a glance
  > Boogle is built by a handful of friends and their agents shipping at once, so how it fits together has to be
  > something you can see, not only read. The atlas ([boogle.club/atlas](https://boogle.club/atlas)) is our internal
  > map: one picture of the pieces, stories that follow a single action through them, and code views underneath. It's
  > a tool for the people and agents building Boogle, never part of the game. Facts in it come from the code on every
  > build; the explanations live in `docs/atlas/` and a daily agent keeps them current, so a stale explanation is that
  > agent's chore, never a red build. A new way of sharing state, or a big feature, comes with a story. Internal tools
  > like this may use a library the game doesn't (the atlas draws with d3), as long as it never reaches the game
  > bundle.

  Commit alone: "Add the Understandable at a glance principle", body: "The atlas needs a principle to serve: many
  agents ship to one codebase, and the people steering them learn it visually. Also records why an internal page may
  carry dependencies the game doesn't." Verify: `npm run check`.

- [x] **2. Extractor + parser tests.**
  - `npm install --save-dev --save-exact acorn@8.19.0`. Check that `package-lock.json` only moves acorn's entry to a
    direct dependency. Commit body: "acorn (already installed through eslint) pinned so the atlas extractor reads
    real syntax instead of regexes."
  - Create `dev/atlas/extract.mjs` with `extractFile(path, text)`, `listSources(root)`,
    `extractFacts({ root, git = true, sources })`, `gitFacts(root)` and a private `walk(node, fn)`, following "Facts
    schema" above. Imports: `acorn`, `node:fs`, `node:path` (use `path.posix` for repo paths), `node:child_process`
    (`execFileSync`, only in `gitFacts`).
  - Create `test/atlas.test.mjs`. **Pure logic on in-memory fixtures only: it never reads `docs/atlas/` or `src/`.**
    - `'extractFile reads every registration kind'`: a template-string fixture at path `src/features/sample.js`
      containing a leading `//` comment; `import { a } from '../x/y.js'`; `import './sample.css'` (ignored);
      `export { b } from './z.js'`; `onStart(() => import('../lazy/part.js'))`; `addPresenceField('zz', () => null)`;
      `addHostField('hh', get, hear)`; `sync.registerOp('x.poke', {…})`; `sync.registerState('x', {…})`;
      `sync.onTick(fn, 'x')`; a multi-line `onFrame(\n () => update(dt),\n { phase: 'world', order: -280 },\n)`; an
      `onFrame(tick)` with no options; `registerAction('act', { pad: 'y', key: 'KeyT' })`; `registerInteractable(fn)`;
      `room.onMessage((m) => { if (m?.t !== 'yo') return; })`; `net.room?.send({ t: 'yo' })`; `submitEdit({ op })`;
      `export function honkNow() {}`. `assert.deepEqual` the whole record (frames
      `[{ phase: 'world', order: -280, name: 'update', line: … }, { phase: 'update', order: 0, name: 'tick', line: … }]`).
    - `'extractFile reads server routes'`: path `server/src/s.js`, `app.put(\n '/rooms/:roomId/snapshot', h)` and
      `app.get('/ice', h)` give routes `['PUT /rooms/:roomId/snapshot', 'GET /ice']`.
    - `'extractFile survives a syntax error'`: `'const = ;'` gives a record with `parseError` set and empty arrays.
    - `'extractFacts is deterministic'`: two `extractFacts({ git: false, sources: [three fixtures, unsorted] })` runs
      are `deepEqual`, the files come back sorted by path, and `imports` resolve between the fixtures.
  - Verify: `node --test test/atlas.test.mjs` (well under a second), then `npm run check`.

- [x] **3. `npm run atlas` CLI.** Create `dev/atlas/cli.mjs`. Default mode: `extractFacts({ root, git: true })`, write
  `.look/atlas/facts.json`, and print one summary line (files, lines, ops, states, presence keys, host fields, message
  types, actions, hooks, routes, parse errors). `--json` prints the facts to stdout. Add
  `"atlas": "node dev/atlas/cli.mjs"` to `package.json` scripts. Every mode exits 0 unless the CLI itself crashes.
  Verify: `npm run atlas` prints the summary; `.look/atlas/facts.json` contains `mush.plant` under
  `src/world/rules/mushrooms.js` and frames for `src/physics/ball.ts` at world −300 and −280.

- [x] **4. Pure atlas core, narrative content, citation report.**
  - Create `atlas/layout.js`, `atlas/model.js`, `atlas/narrative.js`, `atlas/check.js` and `atlas/changes.js` as
    specified above. `parseChanges(md)` returns `[{ date, body }]`. `renderChanges(entries, known)` returns escaped
    HTML (`##` sections, paragraphs, `- ` lists, `` `code` ``, `[t](#…)` links only, all other text escaped with the
    prototype's `esc`). `known = { stories: Set, concepts: Set }` decides whether a link is live or plain text.
  - Create `docs/atlas/concepts.json`, porting the prototype's CONCEPTS, `howIntro`, KINDS `d` strings, CHANNELS
    copy plus the sankey tags (`flowView` line 419), DIRNOTE and the BOX `s` subtitles into the schema above. **Fix
    stale copy while porting:** terrain and water are retired stubs (2026-10-30), so the `world` concept, the
    `you.world` subtitle and the intro's lockstep example say "mushrooms, gifts, prototype flags", not "terrain,
    water". The `you.features` subtitle uses `{features}`, not "28". Every `code` entry becomes a cite (`['d',
    'features']` becomes `{ "dir": "src/features" }`; `['f', path]` becomes `{ "file": path }`; `['d', 'server']`
    becomes `{ "dir": "server" }`).
  - Create `docs/atlas/stories/{frame,honk,ball,mush,boogler,join}.json` from the prototype's STORIES (`order` 10, 20,
    30, 40, 50, 60; `t` becomes `text`; `code` stays as the snippet) and add `cite` to every step. Correct facts
    against `npm run atlas -- --json`, never from memory. Known fixes: the join story's save route is
    `PUT /rooms/:roomId/snapshot`; honk cites `{ "action": "honk" }` and `{ "message": "honk" }`; the ball cites
    `{ "presence": "b" }` and `{ "file": "src/constants.ts", "symbol": "INTERP_MS" }`; the Boogler cites
    `{ "hostField": "g" }`; mush steps cite `{ "op": "mush.plant" }`, `{ "message": "w:edits" }`,
    `{ "message": "w:hash" }`, `{ "message": "w:need" }`; the frame story cites `{ "file": "src/main.ts", "symbol":
    "frame" }` and `{ "file": "src/loop.ts", "symbol": "onFrame" }`.
  - Create `docs/atlas/changes.md`: `# What changed`, then `## <today>` with two or three plain-language lines
    introducing the atlas and linking `[watch an edit travel](#story/mush)`.
  - Create `docs/atlas/README.md`: what each file is, both schemas, and the editing rules (stable ids; minimal edits;
    every step cites; use only existing boxes and lanes, and a new box means editing `atlas/layout.js` plus a concept;
    preview with `npm run dev` then `/atlas/`; report with `npm run atlas -- --check`, which never fails anything).
  - CLI: add `--check`. It reads `docs/atlas/concepts.json`, `docs/atlas/stories/*.json`, `docs/atlas/changes.md` and
    `src/main.ts`, runs `parseNarrative` then `checkAtlas`, prints the problems grouped by file plus the folder "to
    do" list, ends with `N problems`, and exits 0.
  - Extend `test/atlas.test.mjs` (fixtures only):
    - `'checkAtlas passes a good narrative'`: a minimal in-memory facts object (two files) and a narrative that covers
      every BOX concept give `[]`.
    - One test per problem, each asserting that exactly one message matches a regex: unknown file, unknown symbol,
      unknown op, malformed cite (two keys), unknown box in `go`, unknown lane, unknown `hl` box, BOX concept missing
      from concepts, story id that doesn't match its filename, changes.md dates out of order, a dead `#story/` link,
      and a missing frame loop.
    - `'parseNarrative never throws'`: invalid JSON concepts text and a story without `steps` give fallbacks plus two
      `loadProblems`.
    - `'resolveCite never throws'`: `null`, `{}`, `{ file: 1 }` all return an `error`.
    - `'kindOf classifies'` on fixture records: ops → lock, `src/world/sync.js` → lock, host → host,
      `src/netplay/net.js` → owner, onMessage → msg, submits → adapter, none → local.
  - Verify: `npm run check`; `npm run atlas -- --check` reports 0 problems. Break one cite by hand: `--check` lists it
    with file, step and fix, and still exits 0 (`echo $?`). Revert.

- [x] **5. Page shell + "How it works".**
  - `npm install --save-exact d3-selection@3.0.0 d3-transition@3.0.1 d3-interpolate@3.0.1 d3-hierarchy@3.1.2
    d3-shape@3.2.0 d3-sankey@0.12.3`. Commit body: "d3 modules draw the atlas page's diagrams (map, circle pack,
    treemap, sankey, story routes). Internal page only: imported only from atlas/, so they never reach the game
    bundle (Understandable at a glance)."
  - Create `dev/atlas/vite-plugin.mjs` exporting `atlasFacts()`. It resolves `virtual:atlas-facts` to
    `'\0virtual:atlas-facts'`, and `load` returns
    `` `export default ${JSON.stringify(safeFacts())}` ``. `safeFacts` wraps `extractFacts({ root, git: true })` in
    `try` and falls back as described in "Never fail the build" (`root` comes from `import.meta.url`, two levels up).
    In `configureServer(server)`, on watcher `change`/`add`/`unlink` of a path under `/src/` or `/server/src/`,
    invalidate that module (`server.moduleGraph.getModuleById(id)` then `invalidateModule`) so a dev reload shows
    fresh facts.
  - `vite.config.js`: import `atlasFacts`, add it to `plugins`, and add
    `rollupOptions.input: { main: resolve('index.html'), atlas: resolve('atlas/index.html') }` (`resolve` =
    `fileURLToPath(new URL(p, import.meta.url))`). Leave `manualChunks` as it is.
  - Create `atlas/index.html` (prototype markup, plus `<meta name="robots" content="noindex">` and
    `<meta name="viewport" content="width=device-width,initial-scale=1">` in `<head>`,
    `<button id="theme" aria-label="Theme">` in `.top` after the search, and a `<button data-changes>What
    changed</button>` before it), `atlas/atlas.css`, `atlas/main.js`, `atlas/views/how.js` and
    `atlas/views/inspector.js`.
  - `main.js` imports: `facts from 'virtual:atlas-facts'`; `conceptsText from '../docs/atlas/concepts.json?raw'`;
    `import.meta.glob('../docs/atlas/stories/*.json', { eager: true, query: '?raw', import: 'default' })`;
    `changesMd from '../docs/atlas/changes.md?raw'`; and `./atlas.css`. `parseNarrative` builds `N` (stories sorted by
    `order`, then `id`), and `buildModel` builds `M`. State lives in one object `S = { view: 'how', mapStyle:
    'layers', sel: { t: 'root' }, openDir: 'features', focusFile, story: null, stepI: 0, focusBack: [] }`.
    `focusFile` defaults to `'src/netplay/net.js'`, or the first file if that is missing. Rename the prototype's
    top-level `history` to `S.focusBack`. Views receive `ctx = { S, M, N, select, render, css, kc, esc }` instead of
    reading globals.
  - Port `howView`, `routePts` (using `ROUTE_VIA`), `edgeToward`, `conceptCard` and `howIntro`. Box titles and
    subtitles come from the narrative and lane labels from `channels`. Story captions show `code` plus cite chips, via
    `citeChip(cite)` in `views/inspector.js`: a resolved cite becomes a `<button data-file>` labelled with the cite
    value; an unresolved one becomes the greyed `stale` chip. Apply every fallback in "Never fail the build, never
    crash the page". Port the shell: `render`, `select`, `crumbs`, click delegation, `/` search (with
    `searchIndex`, `c:` and `s:` hits opening the concept or story), arrow keys and Esc.
  - The root inspector shows "N commits since <date>" only when `facts.git?.commits`. It shows the "Atlas problems"
    note when `N.loadProblems` or `facts.error` is set. `#rev` shows `facts.git?.head ?? ''`.
  - Theme button: it cycles auto, light and dark, sets or removes `document.documentElement.dataset.theme`, and stores
    the choice in `localStorage['boogle.atlas.theme']`. Every colour reaches the SVG as a `var(--x)` string, so a theme change needs no re-render.
  - Until steps 6 and 7 land, the other tabs render "Coming in the next commit" in the canvas.
  - Verify: `npm run dev`, open `/atlas/`: the diagram matches `.look/atlas/prototype/v4-concept.png`, every story
    steps through with the animated dot, and clicking a box opens its concept card. In a scratch edit (reverted), break
    a cite, a box ref and the JSON syntax of one story. The page still renders, shows a stale chip, skips the route
    with the out-of-date note, and lists the bad story under "Atlas problems"; `npm run build` still succeeds.
    `npm run build`: `dist/atlas/index.html` exists and contains `noindex`; `grep -l linkHorizontal
    dist/assets/*.js` lists no file referenced by `dist/index.html`; the game's `dist/assets/index-*.js` size is
    unchanged from a `main` build. `npm run check`.

- [x] **6. Map views.** Create `atlas/views/map.js` by porting `mapLayers`, `stackBar`, `hier`, `nodeSel`, `fillFor`,
  `litFor`, `mapPack` and `mapTree`. Replace `d3.hierarchy/pack/treemap/treemapSquarify` with `d3-hierarchy` imports,
  `d3.select` with `d3-selection`, `d3.interpolateZoom` with `d3-interpolate`, and `import 'd3-transition'` for
  `.transition()`. Folder notes come from `N.folders` (missing renders as nothing); layers use `layerOf` with its
  fallback. Verify in `/atlas/`: Layers, Circles and Treemap match `v3-layers.png`, `v3-pack.png` and `v3-tree.png`;
  selecting a file lights its uses (blue) and used-by (orange). `npm run check`.

- [x] **7. Focus, Network flow, Frame.** Create `atlas/views/focus.js` (port `focusView` and `registrations`, with
  actions are plain ids), `atlas/views/flow.js` (port `flowView` with `sankey` from `d3-sankey` and `linkHorizontal` from
  `d3-shape`, channel names and tags from `N.channels` falling back to the `KINDS` name, and `wireOf` from model.js)
  and `atlas/views/frame.js` (port `frameView` over `hooks(M)`, removing `CORE`; slices are grey when `core`,
  `data-hook` is the hook id, and the inspector looks the hook up by id). Remove the "Coming" placeholder. Verify
  against `v3-focus.png`, `v3-flow.png` and `v3-frame.png`: the Frame view now shows multi-line hooks the prototype
  missed (for example `src/features/impact.js`, `src/render/particles.js`). `npm run check`.

- [x] **8. What changed + hash links.** In `atlas/main.js`: `[data-changes]` sets `S.sel = { t: 'changes' }`, and the
  inspector renders `renderChanges(parseChanges(changesMd).slice(0, 8), known)`. Hash routes are read on load and on
  `hashchange`: `#story/<id>` (view how, that story, step 0), `#concept/<id>`, `#view/<id>`, `#file/<path>`. An unknown
  id is ignored. Clicking a story or a view tab writes the hash with `history.replaceState`. Verify:
  `/atlas/#story/mush` opens on step 1 of the mushroom story; the link in changes.md works; `/atlas/#story/nope`
  opens the default view. `npm run check`.

- [x] **9. Scenario for stills.** `dev/scenarios/run.mjs`: add `base: stack.base` to `t`, plus
  `async page(pathname, { size = [1280, 900], colorScheme = 'light' } = {})`. It opens `browser.newPage({ viewport,
  colorScheme })`, collects `pageerror` messages into a list the runner checks the same way as `g.errors`, goes to
  `new URL(pathname, stack.base)`, and is closed by the runner. Create `dev/scenarios/atlas.mjs`: open `atlas/` in
  light and dark; wait for `.diagram svg`; take a still of How it works, of the mush story at step 3, and of each tab
  (Map in all three styles, Focus, Flow, Frame) into `t.out`; check that every story's last step renders and that
  there are no page errors. Add `- atlas` to the matrix in `.github/workflows/scenarios-nightly.yml` (never to
  `ci.yml`; it never blocks a merge). Verify: `npm run scenario -- atlas`, then Read the stills. `npm run check`.

- [x] **10. Deploy with history.** (Workflow edit and the local checks are done; shipping and the post-deploy look at https://boogle.club/atlas/ are left to the user.) `.github/workflows/deploy.yml`: give the build job's `actions/checkout@v4`
  `with: fetch-depth: 0`. Verify: locally, with full history, `npm run build` and `npm run atlas` show `git.commits`. In a `git clone --depth 1` scratch copy, `commits` is null and the page still renders. Ship
  steps 0–10 with `npm run ship` from the worktree, then check https://boogle.club/atlas/ after deploy.

- [x] **11. Agent upkeep.**
  - CLI `--changes [--since <ref>]`: `<ref>` defaults to `git log -1 --format=%H -- docs/atlas/`. It prints, in
    order: (1) the `--check` report; (2) the commits since `<ref>` (`git log --no-merges --format='%h %s'`); (3)
    `diffFacts(factsAt(root, ref), extractFacts({ root, git: false }))`, meaning files added and removed, folders
    added, and keys added and removed for ops, states, owner, host, msgs, actions and routes; (4) folders without a
    note. `factsAt` lists files with `git ls-tree -r --name-only <ref> -- src server/src` and reads each with
    `git show <ref>:<path>`, passing them as `sources` (about 130 calls, under 2 s). It exits 0. Test `diffFacts` in
    `test/atlas.test.mjs` on two small in-memory facts objects.
  - Create `dev/atlas/agent-prompt.md` for an unattended run, telling the agent to:
    1. Read AGENTS.md, `docs/atlas/README.md`, and DESIGN.md's "Understandable at a glance" and "Pick how each
       feature shares state".
    2. **First, run `npm run atlas -- --check` and fix every problem it lists** (broken citations, unknown boxes,
       lanes or concepts, bad changes.md links, load problems) in `docs/atlas/`. Use `git log --follow` / `git show`
       to find where a renamed file or symbol went. Every fix lands in this run's PR. Remove a cite only when the
       thing it pointed at is gone, and then reword the step.
    3. Run `npm run atlas -- --changes` and read the diffs of the commits that matter (`git show <sha>`).
    4. Update `concepts.json` and stories **minimally**: keep every id, fix only text that is now wrong, never reorder
       or reword working copy, and keep JSON formatting (`npx prettier --write` on the files touched).
    5. Add a story (3–7 steps, every step cited, existing boxes and lanes only) for any new sync system (a new op,
       state, presence key, host field or message type that belongs to a new system) or major feature (a new
       `src/features/` file a player sees that has its own sync, or a new folder). Add a folder note for any folder the
       output lists. When a story needs a box that doesn't exist, say so in the PR body instead of editing
       `atlas/layout.js`.
    6. **Always** add a `## <today>` entry at the top of `changes.md`: 2–6 bullets in plain language for a visual
       learner. Say what you'd notice or what it means, offer an analogy where it helps, link stories
       (`#story/<id>`), and keep file paths to a minimum. When only small fixes landed, write one line saying so (it
       moves the "since" marker).
    7. Run `npm run atlas -- --check` again (0 problems expected), then `npm run check`, and fix until both are clean,
       touching only `docs/atlas/`.
    8. Commit only `docs/atlas/` on branch `claude/atlas-<yyyy-mm-dd>` with message "Update the atlas for
       <yyyy-mm-dd>" (body names "Understandable at a glance" and lists the citations fixed), push, and open a
       non-draft PR with `gh pr create` (automerge.yml merges it when green).
    9. Run Bash one command per call (no `&&`, `;` or redirection), use Write/Edit for files, and never run anything in
       the background. End with a short summary.
  - Create `.github/workflows/atlas.yml`, modelled on `patch-video.yml` (same `claude-code-action@v1` step,
    `claude_code_oauth_token`, `show_full_output: true`, **`--model claude-opus-5-5`**), on `ubuntu-latest`,
    `timeout-minutes: 45`:
    - `on`: `schedule: - cron: '7 13 * * *'` (daily, before the patch video at 14:23 UTC); `workflow_dispatch` with
      input `force` (boolean); `push: branches: [main]` with `paths:
      [src/world/rules/**, src/net/**, src/netplay/**, server/**]` (direct pushes only; see the automerge note below).
    - `permissions`: `contents: write`, `pull-requests: write`, `actions: read`, `id-token: write`.
    - `concurrency: { group: atlas, cancel-in-progress: false }`. GitHub keeps one running and one pending run (a newer
      pending run replaces the older), so a burst of merges yields at most two runs, and Claude is never killed
      mid-push.
    - Steps: (1) `actions/checkout@v4` with `ref: main`, `fetch-depth: 0`; (2) gate: `node dev/atlas/cli.mjs --gate
      --event "$EVENT"` (dev/atlas/git.mjs, plain git, so it needs no install) prints `last=<sha>` (the last commit
      touching `docs/atlas/`, else `HEAD~20`; the same ref `--changes` uses) and `go=0|1` for `$GITHUB_OUTPUT`. go is 0
      when `git rev-list --count "$last"..HEAD -- src server` is 0 (citations only break through such commits, so this
      never skips a needed fix for long), and, for non-schedule events, unless `src/world/rules`, `src/net`,
      `src/netplay` or `server` changed or a `src/features` file was added or removed. `force` sets go=1. (3) Check the
      open atlas PRs (`gh pr list --state open --json number,headRefName,createdAt`, head starting with
      `claude/atlas-`): skip when one is **less than a day old**; an older one is stuck (CI red or conflicting), so close
      it with `gh pr close <n> --delete-branch --comment "..."` saying the upkeep run is replacing it, and carry on.
      (4) Only when still going and the event is not `schedule` or `force`: debounce `sleep 600`, then
      `git pull --ff-only` so the agent sees main's tip.
      Outputs: `go`, `last`, `date=$(date -u +%F)`. (5) setup-node + `npm ci` (with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`)
      if going; (6) Claude if going, with prompt "You are the atlas upkeep loop for Boogle, running unattended. Today is
      ${{ steps.gate.outputs.date }}; the last atlas update is ${{ steps.gate.outputs.last }}. Read
      dev/atlas/agent-prompt.md and follow it." and `--allowed-tools
      "Read,Write,Edit,Glob,Grep,Bash(npm run *),Bash(npm ci),Bash(node *),Bash(npx prettier *),Bash(git *),Bash(gh pr create:*),Bash(gh pr view:*),Bash(gh pr list:*),Bash(ls *),Bash(cat *)"`.
  - `.github/workflows/automerge.yml`, step "Deploy, and run CI on main": merges made with `GITHUB_TOKEN` never fire
    `push` workflows (the file's own header says so), so the `push` trigger alone would miss nearly every merge. After
    the `deploy-server.yml` lines, add:
    ```bash
    if [[ "$BRANCH" != claude/atlas-* ]]; then
      gh workflow run atlas.yml --ref main
    fi
    ```
    The gate decides whether a merge matters.     Atlas PRs touch only `docs/atlas/`, so they never dispatch another run.
  - Verify: `npm run atlas -- --changes --since HEAD~10` prints the report and sensible diffs and exits 0;
    `npm run check`. After merge, run the workflow by hand with `force: true` and confirm it opens a
    `claude/atlas-<date>` PR that CI checks and automerge merges.

- [x] **12. Tell agents.** `AGENTS.md`, one bullet at the end of "Tests": `- **Atlas** (internal, boogle.club/atlas;
  docs/atlas/README.md): shipping a new sync system or a big feature, add or update a story in docs/atlas/stories/.
  \`npm run atlas -- --check\` lists citations your change broke; fixing them is welcome but never blocks (the daily
  agent fixes what's left).` Root `README.md`, "Code layout": one line, `atlas/: the internal architecture explainer at
  /atlas (facts from dev/atlas/, narrative in docs/atlas/).` No `docs/game-design.md` change (players never see it)
  and no `PLAN.md` item (not on the roadmap). Verify: `npm run check`; ship.

## Risks

- **Unrelated uncommitted work** in the main checkout: `package.json` and `package-lock.json` already have a `pngjs`
  hunk; `DESIGN.md` (the user's new section), the concept-art skill and `dev/concepts/generate.mjs` are modified;
  `test/chroma.test.mjs`, `dev/concepts/chroma.mjs` and `dev/concepts/assets.json` are untracked. Installing acorn or
  d3 there would mix lockfile hunks, and `npm run ship` refuses to run with a dirty tree. Step 0's worktree avoids all
  of this. Never `git add -A`, never stage those files, never stash or reset them.
- **DESIGN.md merge:** the new principle goes *before* "Small and readable", and the user's uncommitted section goes
  *after* it, so the two edits are three lines apart and merge cleanly. Do not move it next to "How we work".
- **Prototype in `/private/tmp`** can vanish. Step 0 copies it to `.look/atlas/prototype/`; do this before anything
  else.
- **Citations rot between agent runs.** Nothing blocks a PR that renames a cited symbol, so the live page can show
  stale chips for up to a day (an atlas PR stuck open for over a day is closed and replaced by the next run). That is the accepted trade-off for never turning
  someone's build red. The fallbacks in "Never fail the build, never crash the page" keep the page usable meanwhile.
  The scenario's stills (nightly) show the stale chips.
- **The build must never fail because of the atlas.** The extractor catches parse errors per file, the Vite plugin
  catches everything, and the narrative is imported as raw text. Step 5's verification exercises all three.
- **Hotspots:** `index.html`, `src/main.ts`, `src/style.css`, `PLAN.md` and `src/world/rules/index.js` are untouched.
  Shared config edits stay small: `vite.config.js` (one import, one plugin, `input`), `deploy.yml` (two lines: `fetch-depth: 0` and `filter: blob:none`),
  `automerge.yml` (one `if`), `scenarios-nightly.yml` (one line), `AGENTS.md` and `README.md` (one line each),
  `DESIGN.md` (one section, its own commit).
- **The game bundle must not grow.** d3 and the virtual facts module are imported only from `atlas/`. Step 5 checks
  that the game chunk is byte-identical apart from the build hash. No meshes, lights or tick work are added, so
  `npm run perf` is not needed.
- **Mixed builds:** no wire changes (no ops, states, presence keys or messages). An old game tab never loads the atlas.
- **Agent loop safety:** the gate skips while an atlas PR under a day old is open (an older one is closed with a comment and replaced);
  atlas PRs never dispatch; `cancel-in-progress:
  false` never kills a run mid-push. The Claude step must push with the action's app token (as `patch-video.yml`
  does), because a branch pushed with `GITHUB_TOKEN` would not start CI, and automerge would never see it.
- **Cost:** one Opus run per day at most from the schedule, plus debounced merge-triggered runs on busy days. Every
  run that passes the gate opens a PR, because it always writes a `changes.md` entry.
- **Build cost:** extraction takes about 100 ms plus one `git log`. Unit tests: well under 100 ms (fixtures only).
- **Heuristic kinds:** `kindOf` is a reading aid, not a contract. A misclassified file looks the wrong colour but breaks
  nothing; the rules are listed in `atlas/model.js`'s header.
- **Stale prototype copy** (terrain and water, "28 plug-ins", `:id` in the save route) must not be ported as is (step 4).

## Rework onto the TypeScript codebase

`main` converted `src/sim`, `src/world`, `src/netplay` and more to `.ts` (and Rapier replaced cannon-es) after this plan was
written. The atlas was reworked to match, with these decisions:

- **One reader for `.js` and `.ts`:** `dev/scan/read.ts` parses with the TypeScript compiler API. Type-only imports and
  exports are skipped (they are erased, so they are not dependencies); `as`, `satisfies` and `!` are looked through.
  The registry (`dev/registry/scan.mjs`) projects the same reader, and `npm run registry -- --json` is byte-identical to
  what `main`'s regex scanner produced.
- **Paths survive a move from `.js` to `.ts`:** facts carry real paths (imports name their file as it is), but cites,
  hash links and the frame loop look a file up without its extension (`fileAt`/`bare` in `atlas/model.ts`), as the
  registry does. `diffFacts` treats an extension change as the same file.
- **The frame loop** is now read as "the calls before the first `runFrame`" and "the call after the last one", skipping
  the profiling marks, because `world.step` became `stepPhysics`.
- **Lockstep globs** from `eslint.config.js` use `{js,ts}` choices, which the extractor's glob matcher expands.
- **New files are `.ts`:** the atlas page (`atlas/*.ts`, typed in `atlas/types.ts`), the extractor, CLI, Vite plugin,
  scenario and test. `@types/d3-*` are devDependencies. `npm run atlas` and the upkeep gate run `.ts` with Node itself,
  so the gate job sets up Node first.

## Follow-ups (not in this plan)

- "Changed since you last looked" badges: store the newest `changes.md` date and a facts digest in `localStorage`, and
  mark new boxes, files and stories.
- Git-history time slider over the Map, which needs the per-commit file-count series (`growth`) extracted again; it was dropped because nothing drew it.
- "Which sync kind?" wizard: DESIGN.md's table as questions, ending on the matching concept card and an example story.
- Writing the hash for every selection (shareable links to files and hooks).
