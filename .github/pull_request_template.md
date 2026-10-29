## What and why

<!-- One or two sentences. What changes, and why does the game need it? -->

## Design

- **Principle served** (see [DESIGN.md](../DESIGN.md)):
- **Principle bent, if any** (and why it is worth it):
- **PLAN.md item** (ticked in this PR?):

## How I tested

<!-- Commands run, and what you did by hand. For anything networked: two or more tabs, ?netdebug=1. -->

- [ ] Solo
- [ ] Two or more tabs / people in the same room
- [ ] `npm run test:net` (networking changes)

## Screenshots / GIF

<!-- Required for visual changes. Delete if not applicable. -->

## Checklist

- [ ] `npm run check` passes
- [ ] Shared sim code is deterministic (no `Math.random()`, integers, fixed order)
- [ ] Game code uses the room interface, not PeerJS
- [ ] PLAN.md / docs updated if needed
- [ ] `main` stays playable after this merges (it auto-deploys)
