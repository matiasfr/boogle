# Choosing/running browser scenarios or GPU checks

- Browser scenarios (`dev/scenarios/`, `npm run scenario -- <name>`, `npm run look`; `.claude/skills/look/SKILL.md`) run on the owner's Mac, outside CI. `world-inputs` moved from software WebGPU CI into `dev/daily/jobs.ts` on 8 November; multiplayer scenarios also run daily there or explicitly with `check:gpu`. Failed runs retain images and Playwright traces (`npx playwright show-trace <zip>`) in their run folder. Commit scenarios, not ad-hoc Playwright scripts.
