---
name: concept-art
description: Generate images from text prompts with the OpenAI Images API or Codex CLI, for design exploration. Painted concept art and storyboards (eras, places, characters, vehicles), plus asset drafts - transparent icons and sprite cut-outs, seamless tiles, matcaps, and orthographic reference sheets for modelling in Blender. Use when asked for concept art, mood images, a style board, a storyboard, or a draft icon, sprite, texture, matcap or turnaround.
---

# Concept art and asset drafts

`npm run concepts` turns a prompts file into images, a `manifest.json` (the exact prompt per image, plus checks) and an `index.html` contact sheet. Output goes to `.look/concepts/` (or `--out`), which is gitignored. Everything here is a draft. Boogle builds things in code first, and a generated image ships only once a person has approved it (DESIGN.md, "Code first, images by approval"; see Rules).

## Routes

The script picks the first one that is available. Force one with `--via api` or `--via codex`.

1. **OpenAI Images API.** Needs `OPENAI_API_KEY` in the environment. It works in cloud sessions too, because `api.openai.com` is reachable from them. Add the key as an environment secret in the environment's settings (cloud), or export it in your shell (local). Never paste a key into chat or commit it.
   - The script calls `POST /v1/images/generations`, or `/v1/images/edits` when an item has reference images (multipart `image[]`; untested so far).
   - Defaults: `gpt-image-2`, `medium` quality, size from the kind (below).
   - GPT image models return base64 PNGs.
   - It bills at API rates. `--quality low` is cheap for drafts; use `high` for keepers.
2. **Codex CLI.** For a machine with Codex installed and logged in with ChatGPT. The script runs `codex exec ... "$imagegen <prompt>"` in the output folder, which uses the subscription, not the API key. Tested with Codex CLI 0.166.0: imagegen saves to `~/.codex/generated_images/<session>/` and copies the PNG into the output folder. It picks its own size (about 1672x941 for 16:9, 1254x1254 for square) and ignores `--quality`; each image takes about a minute. Reference images are copied next to the output and Codex is asked to open them first (untested so far).

## Use

```
npm run concepts -- --dry                         # print the prompts, generate nothing
npm run concepts -- --only era-3 --quality low    # one cheap draft
npm run concepts                                  # every prompt in dev/concepts/eras.json
npm run concepts -- --prompts my.json --n 3       # three variations each
npm run concepts -- --prompts dev/concepts/assets.json --out .look/assets --only icon-crate
npm run concepts -- --prompts dev/concepts/assets.json --out .look/assets --recut   # redo cleanup, no generating
```

A prompts file is `{ "style", "kind"?, "chroma"?, "refs"?, "items": [{ "id", "prompt", "kind"?, "chroma"?, "refs"? }] }`. Flags (`--kind`, `--chroma`, `--ref a.png,b.png`, `--size`) beat items, and items beat the file.
- Copy `dev/concepts/eras.json` for concept sets and `dev/concepts/assets.json` for asset drafts.
- Keep `style` the same across a set, so the images read as one world. Change only the subject per item.
- Hold the viewpoint fixed for before-and-after series.

Read the images (open `index.html`, or Read the PNGs). Iterate on wording, not on the script, and change one thing per retry.

## Kinds

A kind adds an asset-type spec to the prompt and sets the default size. `--dry` shows the full prompt.

| Kind | Size | What you get |
|---|---|---|
| `concept` (default) | 1536x864 | The painted scene, unprocessed. |
| `icon` | 1024x1024 | Keyed cut-out of one object, trimmed and centred on a square with a small margin. Hotbar, interact prompts, the controls guide. |
| `sprite` | 1024x1024 | Keyed cut-out of one subject standing on the bottom edge: billboards, far-off props, decals. |
| `tile` | 1024x1024 | Seamless top-down texture with no baked lighting. Writes `<id>.tiled.png` (2 x 2) and a seam score. |
| `matcap` | 1024x1024 | A lit sphere of one material that fills the square, for `MeshMatcapMaterial` or Blender's matcap view. |
| `refsheet` | 1536x1024 | Front, side and back views at one scale on one ground line, flat light, no perspective: a modelling reference for Blender (load it as a reference image) or for building a mesh in code. |

### Keyed kinds (icon, sprite)

Image models can't be trusted with real alpha, and the Codex route has no transparency option at all, so ask for a flat key colour and remove it locally. `dev/concepts/chroma.ts` (tested in `test/chroma.test.ts`) does this:
1. It keys out pixels near the key, then grows the cut into the anti-aliased halo.
2. It unmixes the rim: each edge pixel becomes the subject colour just inside it, with the background's share turned into transparency. That removes the pink or green outline.
3. It bleeds colour into the transparent pixels. three.js samples RGB under alpha 0 when it filters, so leaving magenta there draws a pink outline.

The model's original is kept as `<id>.raw.png`, and `--recut` redoes the cleanup from it.

Pick a key colour that isn't in the subject (per item: `"chroma": "#00ff00"`):

| Subject has | Avoid | Use |
|---|---|---|
| Purple or pink (The Boogler, flowers) | `#ff00ff` | `#00ff00` |
| Green (grass, palms, leaves) | `#00ff00` | `#ff00ff` |
| Blue (water, sky, ice) | `#0000ff` | `#ff00ff` |
| Both purple and green | | `#0000ff` or `#ffff00` |

Default is magenta (`#ff00ff`). The island is green, so never default to green.

### Warnings

Each warning prints on the run and shows in red on the contact sheet:

| Warning | Cause | Fix |
|---|---|---|
| background is not the key colour | The model drew a scene, a floor or a fake checkerboard. | Regenerate, and make the subject simpler. |
| N separate subjects | The model drew variations or extra props. | Add "one object only, nothing else in the frame", and use a single reference at most. |
| key-coloured edge | The key is too close to the subject's colours. | Pick another key from the table above. |
| seam score above 3 | The wrap edge of a tile shows. | Look at `<id>.tiled.png`. The first generated tile scored 2.4 with no visible line. |

### Prompting assets

Prompting rules for assets:
- The kind already adds "one object, no text, no shadow, no grid" and where the subject sits. Your `prompt` only describes the subject: material, pose, view (three-quarter for icons, front for sprites).
- Detailed request: tidy the wording, don't add to it. Vague request: add only framing or use, never extra props or story.
- References (`refs`) are for matching style. They are labelled "Image 1..n: style reference only" in the prompt. Use one to three, and upscale tiny ones first: a 32 px reference is all but invisible to the model.
- Repeat the constraints that matter when you retry, so they don't drift.

## Rules

- Shipping an image follows DESIGN.md, "Code first, images by approval":
  - Show the candidates (contact sheet, an artifact or a doc), and ship only the one a person picks. Never ship an image nobody approved.
  - Commit its prompts file under `dev/concepts/`.
  - Downscale it to the size it is drawn at (`sips -Z <px>` on macOS) and keep it under about 100 KB.
  - Import it from the feature that uses it, so Vite hashes it.
  - Concepts and reference sheets never ship.
- Don't commit raw generations or contact sheets; they stay in `.look/`.
- Respect cost: draft at `low`, and only regenerate what changed (`--only`, `--recut`).
