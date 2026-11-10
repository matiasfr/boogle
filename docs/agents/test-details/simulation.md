# Headless world, the rail loop in Node, or inspecting state

- `dev/sim/` is the game's state and Rapier in Node, no browser or GPU ([dev/sim/README.md](../../../dev/sim/README.md)). The headless ball and player runs and the golden replay were retired on 9 November 2026; player and ball physics changes are checked by looking (`/look`), and `npm run level-check` for reachability.
- `npm run loop -- run [--players N]` plays the rail loop's orders through the real host rules in Node (time per node, softlocks, order probes); `-- trace <session>` lines it up with a bot run and a playtest. Run it when you change the loop's bills, edges, stations or rail actions.
- `npm run inspect` (`-- --browser` for the real game, `-- --json`) lists entities, their state and per-kind cost; in a page, `window.boogle.inspect()`. Use it instead of reaching into the `window.boogle` grab bag, whose existing reads move over as agents touch them.
