# Town K1: the economy seen

17 November 2026. Captured current `origin/main` **`2f8e8ce1bf3a03249f158a0b00c44fd580074e92`**, including #2013,
world v58. Branch: `codex/town-k1-economy-seen`. Docs and curated evidence only; no game code, design, strings or
test files changed. Not tested on a device.

**K1 is ticked.** Its three parts are now present: the economy stills were opened, a real-speed Home island
arrival/unload was recorded and inspected through sheets/frames, and `game-design/place.md` now describes A1 and
C2 on main. The owner clarified that the clip means the **Village/Home island platform**, not the separate far
halt named Ring Island. This closes the three evidence gaps in the [16 November report](town-checkpoints-k1-k2.md),
without upgrading that report's other unverified behavior.

## Opened stills

Seven stills cover the requested six subjects, with waiting riders and the hall till separated for legibility.
Each selected PNG was opened at its raw local path before copying it unchanged here. Cameras use ground + 1.7 m,
the hall's floor + 1.7 m, or platform-level eye height; the train camera follows the loaded car at ground + 1.7 m.
Accepted server seeds provide all stock, passengers and money; no rows were edited.

| Opened still | What it shows; what reads wrong or is limited |
| --- | --- |
| [Camp](assets/town-k1/camp.png) | Brown full stack beside the ramp, timber icon and **8** board, matching `Yard.stock=8`; touching vertical crates merge into tall columns, so eight separate cubes cannot be counted from this side. |
| [Quarry](assets/town-k1/quarry.png) | Grey pile behind the platform, stone icon and **8** board, matching the yard row; the near platform edge hides the pile's lower part. |
| [Freight train](assets/town-k1/train.png) | Two brown freight cubes on the kit car's solid cargo deck at the Camp, matching `freight=2`, drawn crate count **2**; shelter furniture/posts obscure part of the car, but the load is visible. |
| [Round plot](assets/town-k1/plot.png) | First plot's red corner stakes/string, delivered timber pile, outlined empty ground and front-facing offer board; the board is small at this hall-front distance, with the pile covering its lower part. The row reports timber **8**, stone **0**, staked plot **0**. |
| [Waiting riders](assets/town-k1/riders.png) | Two small waiting figures on the Home platform, matching `wait0=2` / drawn **2**; the large red player is separate from them. No boarding-motion claim from this still. |
| [Hall till](assets/town-k1/till.png) | Counter against the end wall, low coin column and readable **105 Boogles / Sack 1**, cap **600**; a hall post fills the left edge without hiding the counter. The one-coin sack came from the seeded room's startup away credit. |
| [Waiting sack](assets/town-k1/sack.png) | Sack beside the almost-empty coin column and readable **18 Boogles / Sack 630**, cap **1,200**; the rigid sack silhouette reads rather like a jar. No Empty press was exercised in this job. |

## Opened arrival evidence

The final recording used `--real --video --seconds 50`, with no warp or speed conversion. Its WebM container is
**53.733 seconds**, including recording setup/finalization around the 50-second sampled window. The fixed camera
is an explicitly **elevated diagnostic view**, `(895,36,5)` looking at `(911,19.3,19)`, FOV 100; the seven stills
above retain standing-height views. This angle keeps the deck and receiving plots together, without a foreground
roof post or the plot board's blank back dominating the view.

Opened the raw 20-frame motion sheet, the full final still, encoded video frames at **39, 41 and 43 seconds**, and
deck crops of the 39/41-second frames. Also opened the committed [dense motion sheet](assets/town-k1/home-unload-motion.png):
six nominal encoded-second samples **37–42**, each with the full frame above a deck crop (left) and receiving-pile
crop (right). It is a 1 fps sampling of the unchanged real-speed recording, not a played-back timing test.

**Yes: the freight cubes are seen being removed from the train.** The arrival has two raised brown cubes on the
last car; the stopped car's deck is then empty, and a two-crate timber pile appears beside the next plot's board.
The first plot's already-full pile stays. The accompanying replicated diagnostics bracket the handoff at ticks
**4142 → 4152**: train freight **2 → 0**, drawn deck crates **2 → 0**, Town timber **8 → 10**. These sampled ticks
bracket the change; they are not a measurement of exact presentation time.

**No freight journey through space is drawn.** The cubes disappear from the deck and appear through the delivered
counts; there is no walking porter or flight to follow. This is the plan's existing N3 greybox behavior, not a new
design decision. The view owner is [`train-view.ts`, `drawLoad`](../../src/entities/railway/train-view.ts);
[`freightArrives`](../../src/sim/railway-sys-trade.ts) transfers the count and
[`plots.ts`](../../src/entities/town/plots.ts) draws its per-plot share. Kit cargo has separate flights.

The first 90-second recording was rejected as unloading proof: its engine hid the deck at the stop and the plots
were off-screen. The second 55-second view was also rejected: roofs hid too much. Both raw sheets were opened and
remain local. The third view and dense sheet establish the visible count-driven unload. **Smoothness, brief
glitches, sound, feel and fun remain unverified**: this agent inspected frames/sheets, not real-time video playback.
Timing or performance under machine load is not evidence here.

## Commands and local evidence

Node **26.13.0** on Windows. `git fetch origin`, then
`git checkout -b codex/town-k1-economy-seen origin/main`; `npm ci` because dependencies were absent. PowerShell's
`npm.ps1` was blocked by execution policy, so setup used `npm.cmd`. `npm run map -- --kind look` reported an unknown
kind; `npm run map -- --kind` listed routes, then `npm run map -- --kind docs` supplied the applicable must-reads.
Also ran `npm run inflight`. The look skill, verification, tools/Codex, shipping, tests and triggered GPU/simulation
instructions were read. The C2 source was located with `git show --stat dbf0060a`; no separate C2 eval was added,
so the existing A3 till eval was reused with the accepted `sack-waiting` seed.

Every look was wrapped in GNU `timeout 360` (Git Bash), with `--wall 240`; runs were serial, at most one look
active. No files were edited during a run. The first discarded Camp run used the header's warped warm-up; all
subsequent runs used `--real`. Camp's initial `stock >= 4` gate was not reached in that running seed, and a pause
menu spoiled the first image. The final Camp view reused the existing full-yard `sack-waiting` seed and reached
the original stock gate. The first rider view had no Home crowd; the final view uses the same accepted seed with
two waiting riders. Capture health alone was never treated as proof of the requested subject.

Local copies of `town-a1.ts`, `town-a2.ts` and `town-a3.ts` retain their existing setup/read paths. The only capture
adaptations are camera placement, closing the pause UI through its existing `closePause()` API, and read-only
diagnostics. They contain no game-rule changes or fabricated stock. Exact arguments, questions, source SHA and
clean-tree status are retained in the logs and `*-verdict.json` files. All selected captures passed WebGPU,
advancing completed game frames, and no page/console/graphics errors; this is not a performance verdict.

The following scripts retain the subsequent look commands, including discarded passes, with this PATH
(the first Camp command remains in its `town-k1-camp-verdict.json`):

```sh
export PATH="$HOME/AppData/Local/nvm/v26.13.0:$PATH"
bash .look/run-k1-yards.sh
bash .look/run-k1-remaining.sh
bash .look/run-k1-final-stills.sh
bash .look/run-k1-clip.sh
bash .look/run-k1-clip-r2.sh
bash .look/run-k1-clip-r3.sh
```

Absolute raw root: **`C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\`**.
The scripts above are files directly under that root. The exact selected raw still paths are:

```text
C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\town-k1-camp-final-still.png
C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\town-k1-quarry-still.png
C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\town-k1-train-still.png
C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\town-k1-plot-still.png
C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\town-k1-riders-r2-still.png
C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\town-k1-till-still.png
C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\town-k1-sack-still.png
C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\town-k1-home-unload-r3-realtime.webm
C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97\.look\town-k1-home-unload-r3-motion.png
```

The final clip's log/verdict share the last basename. Earlier raw recordings/sheets/logs use
`town-k1-home-unload` and `town-k1-home-unload-r2` in the same absolute root; extracted frames use
`town-k1-home-r3-{39,41,43}.png` and `town-k1-home-r3-{39,41}-deck.png`. Raw videos, dumps and capture scripts stay
local. Curated evidence: **7 stills at 960 × 600 + 1 sheet at 1200 × 800, 2,467,918 bytes total (2.35 MiB)**.
The sheet uses FFmpeg `fps=1`, full-frame scaling plus labelled deck/pile crops and a 3 × 2 tile; no speed filter.

Suspect placeholder copy, unchanged for The Boogler: `Plot 1`, `Plot 2`, `Plot 3`, `Timber <have> / <need>`,
`Stone <have> / <need>`, `+1 rider / minute`, `Price <n>`, `Box <n>`, `Boogles`, `Waiting`, `Hold to build`,
`Hold <percent>%`, `Need <n> more Boogles`, `Waiting for town`, `Every train`, `Empty`, `Sack <count>`.
The existing residents' lines and all player-facing strings are preserved.

Final validation: `node dev/ship-check.ts origin/main HEAD` passed the docs/evidence gate: registry and **46/46**
agent/change-class checks, no gameplay test suites. Scoped lint reported **0 problems**; `git diff --check` passed,
and all **12** report-local file links resolve. Existing links into the old v54 heading keep an explicit anchor.
Commit and rebase stay local; no push, ship or PR. Worktree:
**`C:\Users\matia\.t3\worktrees\boogle\t3-bc981e65-352f286ea06d5d97`**.
