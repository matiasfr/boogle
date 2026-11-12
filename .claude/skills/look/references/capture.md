## 1. Inspect: `npm run look`

In Codex, use `--query 'shot=play'` (or `--query 'proto=<name>'` for a prototype) rather than `BOOGLE_QUERY=`, since its rules don't see past an environment variable (docs/agents/codex.md, "Codex").

```
npm run look -- --view hill                           # startup/capture check only
npm run look -- --cam -10,12,-14 --look -22,3.5,-21 --question "Does the feature read from here?"
# setup.ts and action.ts are task-specific page-code bodies:
npm run look -- --eval setup.ts --action action.ts --video --seconds 5 --question "Does the action visibly complete?"
npm run look -- --heatmap --region 0.3,0.3,0.4,0.4 --question "Does this stationary prop flicker?"
```

Default outputs are `<name>-still.png` and `<name>-motion.png` (8 timestamped screenshots over 2 seconds). A sheet shows coarse poses; it can miss brief glitches and does not prove smoothness. Use `--video` for `<name>-realtime.webm`, recorded after warm-up without advancing a fake clock. Playback answers the visible-motion question; recording overhead and encoded frame cadence mean it is not a performance benchmark. Use the live game and `npm run hitches` for frame stalls.

`--eval setup.ts` runs before camera placement and warm-up. `--action action.ts` runs after warm-up and after video starts; it should initiate the action and return so the sheet samples the action too. Page-code bodies may use top-level await, end in `export {};`, and must not contain a top-level return (Node strips the types before evaluation). Ready-made setup files: `dev/look/evals/particles.ts` (each eval opens with its exact command). Use a camera that keeps the action in view, `--hud` for UI, `--name` for distinct captures, and `--url` for an existing game.

**Warm-ups run warped by default** (dev/look/warp.ts, about 35x solo, one frame in 30 drawn): `--warm` and an eval's own waits cost almost nothing, then the capture runs at real speed, and a page error stops it at once. `--until "window.__placeDone"` ends the warm-up when a page expression is true, and `PLAY ...`-style console lines print as they happen. `--real` keeps the warm-up in real time; external `--url` sites always are. Two local players default to a measured 10x cap and an accelerated server (below). Warping is not for judging feel or frame rate.
