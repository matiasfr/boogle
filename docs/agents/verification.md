Before any player-visible or feel change, read this verification procedure and the look skill.

## See it before you ship
For anything a player can see or feel, close the loop yourself before shipping; don't hand it to a human to check.
1. Name the visual question, frame the changed feature and exercise its action. `npm run look -- --question "..."` captures a still and a motion sheet (`--eval` sets up; `--action` runs after warm-up, behind `?proto=` if needed). Open the artifacts. A default hill capture only checks startup; heatmaps are optional diagnostics (`--heatmap --region x,y,w,h`), never acceptance scores.
2. Judge against the brief's feel target. For motion or feel, observe the action in real time (`--video` records it); a sparse contact sheet or virtual-time promo clip cannot establish smoothness. Say what you saw and what remains unverified. Capture success means WebGPU, advancing completed game frames and no page/console errors; visual quality still needs inspection. See `.claude/skills/look/SKILL.md`.
3. Fix what's off and look again, up to three rounds. Still unsure after that: ship it behind its flag and say what you're unsure of in your report.
4. Ship it yourself (`npm run ship`) with a still in the commit body.

Sandboxed and can't do this (`npm run look` needs a local port, `npm run inflight` and commits need to write `.git`, `ship` needs the network)? Ask for the access if your tool can. Otherwise don't ship a change a player can see without having seen it: commit it, say what you couldn't check, and leave it for whoever gave you the job.

Unresolved visual quality stays behind its flag.
