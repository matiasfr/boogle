# docs/atlas/: the words in the atlas

The atlas (boogle.club/atlas, code in `atlas/`) shows how Boogle fits together. Two kinds of content meet there:

- **Facts** (files, imports, presence keys, ops, messages, actions, frame hooks, routes) are read from the code on every
  build by `dev/atlas/extract.ts`. Nothing here is committed; `npm run atlas` writes them to `.look/atlas/facts.json`.
- **Narrative** is this folder: the explanations people read. A daily agent (`dev/atlas/agent-prompt.md`) keeps it
  current using Codex on the owner's Mac (`npm run daily -- atlas`), and people and agents may edit it any time.
  A stale explanation is a chore, never a red build. [Daily setup and recovery](../../dev/daily/README.md) covers
  launchd, credentials and dry runs. CI only reports stale citations; it no longer runs a model after merges.

| File | What it is |
|---|---|
| `concepts.json` | The intro, sync kind and channel copy, folder notes, box subtitles and the concept cards |
| `stories/<id>.json` | One story: an action followed step by step through the diagram |
| `changes.md` | "What changed", newest first, in plain language |

Where boxes, lanes, colours and geometry live: `atlas/layout.ts` (code, not narrative; do not move coordinates).

## concepts.json

```json
{
  "intro": { "title": "…", "lead": "…", "question": "…", "foot": "…", "ways": [{ "kind": "local", "says": "…", "eg": "…" }] },
  "kinds": { "lock": "…", "adapter": "…", "owner": "…", "msg": "…", "local": "…" },
  "channels": { "owner": { "name": "Presence", "d": "…", "tag": "20 Hz · per player" }, "lock": {}, "msg": {} },
  "folders": { "features": "one line per src/ folder (and \"server\")" },
  "boxes": { "you.features": "{features} plug-ins: …" },
  "concepts": [
    { "id": "world", "title": "Shared world", "one": "…", "like": "An analogy", "rules": ["…"],
      "code": [{ "dir": "src/world" }, { "file": "src/world/server-ops.ts", "symbol": "createServerOps" }], "view": "flow" }
  ]
}
```

- `kinds` has exactly the keys of `KINDS` in `atlas/layout.ts`; `channels` exactly `owner lock msg`. `lock` is the stable diagram id for the Server channel; adapters and messages are reading aids, not extra state kinds. The three state kinds are Local, Owner and Server.
- `boxes` keys are the box ids of `BOX` in `atlas/layout.ts`. `{features}` becomes the number of `src/features/*.{js,ts}`
  files, so the count never goes stale.
- Each concept needs `title`, `one`, `like`, non-empty `rules` and `code`. `view` (optional) is one of
  `how map focus flow frame`. Every box in `BOX` points at a concept id.

## stories/<id>.json

```json
{ "id": "seat", "title": "You sit down", "kind": "lock", "order": 40,
  "steps": [
    { "go": [["you.features", "server"]], "text": "It submits the command. …",
      "code": "railwayCommands()?.act('seat.sit', { id })",
      "cite": [{ "file": "src/entities/railway/seat.ts" }, { "op": "seat.sit" }] },
    { "hl": ["you.world", "fr.world"], "text": "…", "cite": [{ "file": "src/world/rules/seats.ts" }] }
  ] }
```

- `id` equals the file name. `kind` is a reading category (`lock adapter owner msg local`) or `null`. `order` sorts the
  story chips. 1 to 10 steps.
- `text` is at most 240 characters. `go` is a list of routes (each at least 2 refs: a box id, or `lane:` plus
  `msg owner lock`); `hl` lists box ids to highlight. A step has `go` and/or `hl`.
- `code` is a free-text snippet shown in mono. `cite` is the structured proof, shown as chips: exactly one key per
  cite. `file` (+ optional `symbol`), `dir`, `op`, `state`, `presence`, `message`, `action`, `route`
  (e.g. `"PUT /rooms/:roomId/snapshot"`). A cite that no longer resolves shows as a grey "stale" chip.

## changes.md

`# What changed`, then one `## YYYY-MM-DD` section per update, newest first. Plain paragraphs and `- ` bullets,
`` `code` ``, and links `[text](#story/<id>)`, `[text](#concept/<id>)` or `[text](#view/<id>)`.

## Editing rules

- Keep ids stable. Make minimal edits: fix what is wrong, do not reword working copy.
- Every story step cites something. Use only boxes and lanes that exist in `atlas/layout.ts`. A new box means editing
  `atlas/layout.ts` plus adding a concept.
- Facts are looked up by name, so get them right: `npm run atlas -- --json` lists every key, op, message, action and
  route that exists.
- Preview with `npm run dev`, then open `/atlas/`.
- Check with `npm run atlas -- --check`. It lists every broken cite, box, lane, concept or link, plus folders with no
  note, and always exits 0. Nothing requires it; the daily agent fixes what is left.
