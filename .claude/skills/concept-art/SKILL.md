---
name: concept-art
description: Generate painted concept art (eras, places, characters, vehicles) from text prompts with the OpenAI Images API or Codex CLI, for design exploration. Use when asked for concept art, mood images, painted concepts or a style board. Not for in-game assets.
---

# Concept art

`npm run concepts` turns a prompts file into images, a `manifest.json` (the exact prompt per image) and an `index.html` contact sheet. Output goes to `.look/concepts/`, which is gitignored. These are design references, not game assets: Boogle builds everything in code.

## Routes

The script picks the first one that is available. Force one with `--via api` or `--via codex`.

1. **OpenAI Images API.** Needs `OPENAI_API_KEY` in the environment. It works in cloud sessions too, because `api.openai.com` is reachable from them. Add the key as an environment secret in the environment's settings (cloud), or export it in your shell (local). Never paste a key into chat or commit it.
   - The script calls `POST /v1/images/generations`.
   - Defaults: `gpt-image-2`, `1536x864` (16:9), `medium` quality.
   - GPT image models return base64 PNGs.
   - It bills at API rates. `--quality low` is cheap for drafts; use `high` for keepers.
2. **Codex CLI.** For a machine with Codex installed and logged in with ChatGPT. The script runs `codex exec ... "$imagegen <prompt>"` in the output folder, which uses the subscription, not the API key. Tested with Codex CLI 0.166.0: imagegen saves to `~/.codex/generated_images/<session>/` and copies the PNG into the output folder. It picks its own size (about 1672x941 for 16:9) and ignores `--quality`; each image takes about a minute.

## Use

```
npm run concepts -- --dry                         # print the prompts, generate nothing
npm run concepts -- --only era-3 --quality low    # one cheap draft
npm run concepts                                  # every prompt in dev/concepts/eras.json
npm run concepts -- --prompts my.json --n 3       # three variations each
```

To write a new prompts file:
- Copy `dev/concepts/eras.json`. It is `{ "style": "...", "items": [{ "id", "prompt" }] }`.
- Keep `style` the same across a set, so the images read as one world. Change only the scene per item.
- Hold the viewpoint fixed for before-and-after series.

Read the images (open `index.html`, or Read the PNGs). Iterate on wording, not on the script.

## Rules

- Concepts are for deciding, not shipping. To make a concept a game asset, follow the art-style note DESIGN.md will need first.
- Publish picks to the team as an artifact or a doc. Don't commit big PNGs to the repo.
- Respect cost: draft at `low`, and only regenerate what changed (`--only`).
