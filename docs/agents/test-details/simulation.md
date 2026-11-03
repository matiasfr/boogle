# Headless simulation, player/ball physics or inspecting state

- `npm run sim -- <name>` (`dev/sim/`): game state and Rapier in Node, no browser or GPU, far faster than real time. For gameplay you'd otherwise test on the shared GPU; what can run: [dev/sim/README.md](../../../dev/sim/README.md).
- `npm run sim -- replay` (about a second; not in `check`): a real play session replayed on this build and compared, first differing frame and field. Run it when you touch player or ball physics; record your own with `?record=1`. What it can't check: [dev/sim/README.md](../../../dev/sim/README.md).
- `npm run inspect` (`-- --browser` for the real game, `-- --json`) lists entities, their state and per-kind cost; in a page, `window.boogle.inspect()`. Use it instead of reaching into the `window.boogle` grab bag, whose existing reads move over as agents touch them.
