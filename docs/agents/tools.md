Before using tools or writing a shot, script or workaround, read this tool table.

## Tools and skills

Start ownership discovery with `npm run map -- --kind <kind>` (bare `--kind` lists routes); `--docs <text>` searches docs with authority labels and current replacement pointers.
**Check here before writing a shot, a script or a workaround.** Details: `.claude/skills/look/SKILL.md`.

| You want to                                    | Use                                                                                                                                                                        |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| See a beat of the run                          | `npm run look -- --at "<beat>"` (`--at list` names them); warm-ups are warped, so `--warm` costs little                                                                    |
| Pacing, what never happened, on-screen text    | `npm run playthrough` (about 90 s); new beats go in `dev/look/bots/place.ts`                                                                                               |
| Ask several questions of the running game      | `npm run session -- start`, then `keys`, `press`, `state`, `still` (under a second each)                                                                                   |
| Judge motion or feel from evidence             | `look --curves`, `--target glide`; `look --filmstrip N` for exact frames                                                                                                   |
| Compare with an earlier build                  | `npm run before-after -- <ref>`                                                                                                                                            |
| Two players                                    | `look --players 2` (warped at 5x)                                                                                                                                          |
| Continuous two-player route, reload and rejoin | `node .look/see-client.ts playthrough --players 2 --long --warp-speed 5 --query 'proto=place&shot=play'` (requires a launcher/broker with this extension; `--real` for 1x) |
| Know a folder without reading it               | `npm run map -- <folder>`, then `grep` and line ranges                                                                                                                     |
| Check level coverage or a placement            | `npm run level-check`; `-- --place=place --region=T3 --state=empty --physics --json`; `-- --replay`                                                                        |
| Make many edits at once                        | `npm run patch -- <file>`                                                                                                                                                  |
| See where a session's time and tokens went     | `npm run transcript -- <id>`                                                                                                                                               |

- `npm run friends-report -- [--since YYYY-MM-DD]` lists friends’ merged PRs and flags sensitive paths; it remembers the last report date in `.look/`.
- `npm run transcript -- <path|id>` summarizes a finished Claude or Codex session; `--latest claude|codex`, `--compare a b`, and `--json` select other views.
- `.agents/skills` links to `.claude/skills`, so Codex and other agents that read it get the same skills: the workflows plus `threejs-*` (use the WebGPU/TSL parts), `game-feel`, `camera-systems` and `audio-design`. They're written for Claude Code; "Codex" below maps the names.
- `npm run concepts`: painted concept images. `npm run clip`, `npm run reel`: clips and trailers. `npm run playtest`: what `?proto=` sessions did, uploaded on their own (`-- latest` prints the summary and a heat map; prototypes add beats with `playMark` from `src/proto/mark.ts`). `npm run verdicts`: the owner's notes from the prototype bar; read them from a checkout with the token rather than asking the owner to paste them.
- `npm run patch -- <file>`: many edits across files in one go. Nothing is written if any edit's text is missing or appears twice, then it runs Prettier, the full lint runner and a typecheck. Use it instead of a throwaway script, whose `replace` misses in silence and which skips the format hook. The format is at the top of `dev/patch.ts`.
- One Mac GPU is shared: `look` runs are fine in parallel but slower; `perf` and `hitches` numbers need the machine to themselves.

The two-player playthrough alternates station and forge bills between peers, reloads player 2 after Q2, and has player 1 leave the page for five seconds and rejoin after Q4. It uses real inputs, no staged game state or recovery teleports, and stops at the pier. It checks both peers' contributions, dry arrival, stations, rack, shared rewards and moving trains (2 m position tolerance). Personal cosmetics are recorded separately. Each uninterrupted clock segment retains achieved rates and drift; navigation runs at 1x. Ordinary broker runs retain the seven-minute cutoff. `playthrough --long` explicitly allows 30 minutes of work, with a 35-minute broker cutoff and 36-minute client wait. Reports, per-peer observers, checkpoints, clock samples and end stills survive failures. A worker's edits do not upgrade the already-running trusted broker: the caller must review these commits and relaunch with the updated harness before this command is supported.

### Vite build contract

Vite is pinned to **8.3.5**, with `vite-plugin-wasm` pinned to **3.6.0** (latest at the upgrade). `vite.config.ts`
uses `build.rolldownOptions` and `output.codeSplitting.groups`: three.js core gets a reusable `three` chunk,
while its add-ons follow their consumers. Prototype/debug entry points stay dynamic; only `proto/flags.ts`
and `proto/mark.ts` are eager. Keep `target: 'es2022'`, rather than adopting Vite's moving browser baseline;
the CSS target inherits it (including Safari/iOS 16.4), below our WebGPU Safari requirement. Safari/iPad
still need device verification when browser compatibility changes.

The atlas virtual module and five HTML entries remain in the build. Keep esbuild: the `boogle-sw` plugin
bundles `src/boot/sw-worker.ts` directly, and `dev/peer-test/harness.ts` also uses it. The service worker
collects the main page, game and SIMD Rapier chunks by emitted module membership, then follows static imports,
CSS and assets. The build requires the game and SIMD WASM in `first` and excludes plain WASM.
Check that list when changing chunking (`npm run counts` gzips each file at level 9;
`npm run counts -- --build-only` skips browser/render counts). Plain Rapier
remains a lazy fallback. Preserve `BOOGLE_SW=off`, `VITE_BUILD`, `VITE_BOOGLE_SERVER`, `BASE=/`, and
deploy.yml's `keep-old-assets` step. After dependency updates, run `npm ci --dry-run` and retain the
`@emnapi` pins/overrides and optional WASM lock entries, including packages for platforms other than this Mac.
