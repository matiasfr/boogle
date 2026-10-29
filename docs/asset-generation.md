# Generating image assets

*Note, October 2026. Boogle has no image files today: everything is built in code with three.js. This records a route we have if that changes.*

## The route: Codex CLI on a ChatGPT subscription

Codex CLI can generate images (`gpt-image-2` by default) through a ChatGPT Plus-or-higher login, with no separate OpenAI API key.

- Interactive: run `codex` in the repo and ask for the image; add `$imagegen` to the prompt to force the image tool.
- Scripted: `codex exec "<prompt>"`, so another agent (Claude Code included) can call it from a terminal.
- Output is a PNG saved in the working directory.

Most of this comes from third-party write-ups, not official OpenAI docs. Check the details against your installed version.

## Limits

- **Runs on a dev machine, not in the game.** Codex and the ChatGPT login live on someone's computer. Cloud agent sessions and players' browsers can't call it. Generate assets during development and commit the files.
- **Subscription limits.** Fine for one asset at a time. For bulk generation use `OPENAI_API_KEY` and the Images API instead, which bills at API rates.
- **2D only.** You get textures, sprites, decals, UI icons and skyboxes, not meshes.

## If we start using it

- Put files in `public/` (served as-is) or import them from `src/` (bundled by Vite).
- Before the first asset lands, add a short art-style note to DESIGN.md (palette, look, resolution, transparency) and reuse that prompt, so assets from different people and agents match.
- Keep each file small: compress PNGs, prefer 512 or 1024 px, and use power-of-two sizes for textures.
