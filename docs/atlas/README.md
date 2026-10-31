# docs/atlas/: the words in the atlas

The atlas (boogle.club/atlas, code in `atlas/`) shows how Boogle fits together. Two kinds of content meet there:

- **Facts** (files, imports, presence keys, ops, messages, actions, frame hooks, routes) are read from the code on every
  build by `dev/atlas/extract.mjs`. Nothing here is committed; `npm run atlas` writes them to `.look/atlas/facts.json`.
- **Narrative** is this folder: the explanations people read. A daily agent (`dev/atlas/agent-prompt.md`) keeps it
  current, and people and agents may edit it any time. A stale explanation is a chore, never a red build.

| File | What it is |
|---|---|
| `concepts.json` | The intro, sync kind and channel copy, folder notes, box subtitles and the concept cards |
| `stories/<id>.json` | One story: an action followed step by step through the diagram |
| `changes.md` | "What changed", newest first, in plain language |

Where boxes, lanes, colours and geometry live: `atlas/layout.js` (code, not narrative; do not move coordinates).

## concepts.json

```json
{
  "intro": { "title": "…", "lead": "…", "question": "…", "foot": "…", "ways": [{ "kind": "local", "says": "…", "eg": "…" }] },
  "kinds": { "lock": "…", "adapter": "…", "host": "…", "owner": "…", "msg": "…", "local": "…" },
  "channels": { "owner": { "name": "Presence", "d": "…", "tag": "20 Hz · per player" }, "host": {}, "lock": {}, "msg": {} },
  "folders": { "features": "one line per src/ folder (and \"server\")" },
  "boxes": { "you.features": "{features} plug-ins: …" },
  "concepts": [
    { "id": "world", "title": "Shared world", "one": "…", "like": "An analogy", "rules": ["…"],
      "code": [{ "dir": "src/world" }, { "file": "src/world/sync.js", "symbol": "submitEdit" }], "view": "flow" }
  ]
}
```

- `kinds` has exactly the keys of `KINDS` in `atlas/layout.js`; `channels` exactly `owner host lock msg`.
- `boxes` keys are the box ids of `BOX` in `atlas/layout.js`. `{features}` becomes the number of `src/features/*.js`
  files, so the count never goes stale.
- Each concept needs `title`, `one`, `like`, non-empty `rules` and `code`. `view` (optional) is one of
  `how map focus flow frame`. Every box in `BOX` points at a concept id.

## stories/<id>.json

```json
{ "id": "mush", "title": "You plant a mushroom", "kind": "lock", "order": 40,
  "steps": [
    { "go": [["you.features", "you.world"]], "text": "It submits the edit. …",
      "code": "submitEdit({ op: 'mush.plant', i, j })",
      "cite": [{ "file": "src/world/sync.js", "symbol": "submitEdit" }, { "op": "mush.plant" }] },
    { "hl": ["you.world", "fr.world"], "text": "…", "cite": [{ "file": "src/world/rules/mushrooms.js" }] }
  ] }
```

- `id` equals the file name. `kind` is a sync kind (`lock adapter host owner msg local`) or `null`. `order` sorts the
  story chips. 1 to 10 steps.
- `text` is at most 240 characters. `go` is a list of routes (each at least 2 refs: a box id, or `lane:` plus
  `msg owner host lock`); `hl` lists box ids to highlight. A step has `go` and/or `hl`.
- `code` is a free-text snippet shown in mono. `cite` is the structured proof, shown as chips: exactly one key per
  cite. `file` (+ optional `symbol`), `dir`, `op`, `state`, `presence`, `hostField`, `message`, `action`, `route`
  (e.g. `"PUT /rooms/:roomId/snapshot"`). A cite that no longer resolves shows as a grey "stale" chip.

## changes.md

`# What changed`, then one `## YYYY-MM-DD` section per update, newest first. Plain paragraphs and `- ` bullets,
`` `code` ``, and links `[text](#story/<id>)`, `[text](#concept/<id>)` or `[text](#view/<id>)`.

## Editing rules

- Keep ids stable. Make minimal edits: fix what is wrong, do not reword working copy.
- Every story step cites something. Use only boxes and lanes that exist in `atlas/layout.js`. A new box means editing
  `atlas/layout.js` plus adding a concept.
- Facts are looked up by name, so get them right: `npm run atlas -- --json` lists every key, op, message, action and
  route that exists.
- Preview with `npm run dev`, then open `/atlas/`.
- Check with `npm run atlas -- --check`. It lists every broken cite, box, lane, concept or link, plus folders with no
  note, and always exits 0. Nothing requires it; the daily agent fixes what is left.
