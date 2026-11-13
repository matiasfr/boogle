---
name: video
description: Record clips and GIFs of the running game and cut them into trailers or patch-notes videos (title cards, captions, crossfades, music). Use when asked for a clip, GIF, video, trailer or promo of Boogle, or to show a feature in motion.
---

# Clips and videos

Commands built on the look harness (`dev/look/lib.ts`: Vite, a local game server, headless Chromium). Output
goes to `.look/` (gitignored).

| What | Command | Source | Output |
| --- | --- | --- | --- |
| Record clips | `npm run clip -- <shot>... [--gif]` | `dev/video/shots/<shot>.ts` | `.look/clips/<label>.mp4` (+ `.gif`) |
| Cut a video | `npm run reel -- <name>` | `.look/reels/<name>.mjs` (never committed) | `.look/reels/<name>.mp4` |
| What's new since the last video | `npm run video:changes` | git log since the newest `video-*` tag | a flagged list |
| Publish and get a share link | `npm run video:publish -- <mp4> --title ...` | a finished video | a GitHub release + share page |

Shots are committed and reused from video to video. Edit lists (reels) are one-off working files in `.look/reels/`:
once a video is published its release keeps the mp4, so the edit list is never committed. `npm run clip` also takes a
path to a shot kept outside the repo (`npm run clip -- .look/wip/x.ts`): use that for one-off or prototype-branch
footage that shouldn't be committed.

## 1. Record: `npm run clip`

Options: `--gif` (palette GIF next to each mp4), `--size 1280x720`, `--fps 30`, `--root <checkout>` (serve another checkout, e.g. `git worktree add <dir> origin/<branch>` with `node_modules`
symlinked; the harness itself still comes from this checkout).

Clips are smooth whatever the render speed: the page clock is faked and each frame advances it by exactly 1/fps
before the screenshot. Real GPU on a Mac renders at ~60 fps, so recording runs at about real time.

A shot (`dev/video/shots/island.ts` is the simplest example) drives the game the way a player or a scenario does:
`window.boogle` (me, ball, net, remotes, `sync`), the controls registry (`actionById(id).down()` from
`/src/player/controls.ts`, the same press as a key or pad button), real input (`g.key`) and `submitEdit` for shared edits.
Reach into a game module only for what nothing public offers (a debug pose, a tuning table), so a refactor of game
internals doesn't break the shots:

```ts
import type { Shot } from '../clip.ts';

export default {
  about: 'one line',
  query: 'tidefast=1', // extra URL params for every player
  async run(c) {
    const g = await c.open({ room: 'clipx', hud: 'play', init: () => localStorage.setItem('k', 'v') });
    await g.wait(3); // page time passes (virtual once recording started)
    return [await g.record('x-intro', { seconds: 6, each: c.move('overview', { cam: [0, 9, 30], look: [0, 1, 0] }, 6) })];
  },
} satisfies Shot;
```

- `c.open(opts)`: a player (`Game`, see the look skill) with the clock installed. `hud: false` hides the HUD,
  `'play'` keeps hints, dialogue and pocket (hides the roster and net pill), `true` keeps all. `init` runs
  before the page's code (seed localStorage: Boogler memories, pocket).
- `g.record(label, { seconds, each(t, k) })`: `each` runs before every frame. Move the camera (`g.view({ cam, look }, fov)`),
  send input (`g.key`, `g.down/up`), call game modules (`g.eval`), or fast-forward the shared sim for a time-lapse
  (`updateWorld(0.1)` in a loop from `/src/world/sync.ts`).
- `c.move(a, b, seconds, c.ease.inOut)`: an `each` that glides the debug camera between two poses (or `VIEWS` names).
- The player's body drives shadows and the sun's focus: teleport it near what you film, out of frame.

## 2. Check every clip

Never trust a clip you haven't looked at. Make a contact sheet and Read it:

```
ffmpeg -v error -y -i .look/clips/x.mp4 -vf "fps=2,scale=480:-1,tile=5x3" .look/sheet.png
```

Look for: the payoff actually on screen (hearts, splash, launch), occlusion by palms or the player's capsule, HUD
over the subject, things too small to read, dead time. Things that wander (The Boogler, gulls) change between runs:
recheck after re-recording.

## 3. Cut: `npm run reel`

An edit list, `.look/reels/<name>.mjs` (a patch video, shortened):

```js
export default {
  size: [1280, 720], fps: 30, fade: 0.45, bpm: 112, // music: true by default
  segments: [
    { card: { kicker: 'Patch notes · Oct 29', title: 'Boogle', sub: 'A bigger island and a new friend' },
      seconds: 3, bg: 'island-reveal' },                                         // title card over blurred footage
    { clip: 'island-reveal', from: 0, to: 7, speed: 1.15,
      caption: { title: 'The island grew 12×', sub: 'Home is now a peninsula of a big mainland' } },
    { clip: 'boogler-talk', from: 0.6, to: 6.4,
      caption: { title: 'Talk and bring presents', sub: 'He has stories from home', top: true } }, // UI at the bottom
    { card: { kicker: 'Also in this patch', title: 'Quality of life', list: ['Gamepad sprint is a click toggle'] },
      seconds: 5.5, bg: 'island-windmills', bgFrom: 1 },
    { card: { kicker: 'Out now', title: 'Come play', sub: 'boogle.club' },
      seconds: 3.6, bg: 'island-lighthouse', bgFrom: 5 },
  ],
};
```

Card fields: `kicker`, `title`, `sub`, `list`, `foot`. Caption fields: `title`, `sub`, `tag`, `top`.

`caption.tag` adds a pill in the top right (e.g. "Coming soon"); `caption.top` moves the caption up when the game's
own UI fills the bottom (dialogue boxes). `quiet: true` on a segment drops the drums while it plays. Cards and
captions are HTML in the game's fonts and colours (`dev/video/reel.ts`); the backing track is synthesized
(`dev/video/music.ts`) and loudness-normalized. Put each payoff inside its caption's on-screen time, keep segments
3-8 s, and make a contact sheet of the final video (`fps=1/2.5,...tile=6x5`) before sharing it. Over 30 MB, also
make a smaller copy (`-crf 23`) for sending.

## 4. Publish: `npm run video:publish`

```
npm run video:publish -- .look/reels/x.mp4 --title "Patch notes: Nov 5" --summary "One sentence." \
  --feature "The island grew 12x" --feature "Meet The Boogler" [--target <commit>] [--dry]
```

Hosting: the video file lives on a GitHub release `video-<date>` (video.mp4 about 15-25 MB, poster.jpg, meta.json),
never in git. The Pages deploy (`.github/workflows/deploy.yml` runs `dev/video/site.ts`) turns every `video-*`
release into a share page at `https://boogle.club/updates/<tag>/` (player, link-preview tags, a "Play
Boogle" button) and an index at `/updates/`. The script starts that deploy, waits for the page to answer, and prints
the share link. `--dry` makes the files under `.look/publish/<tag>/` without releasing. Publishing is public: only
publish when asked to (or by the patch video loop below). Pages has a 1 GB site limit: past about 40 videos, delete
old `video-*` releases. To preview pages locally: copy `.look/publish/<tag>` into `<dir>/updates/`, run
`node dev/video/site.ts <dir>` and serve `<dir>`.

## 5. Patch video loop

`npm run daily -- patch-video` runs this on command on the owner's Mac with Codex on the owner's subscription; it is not on the launchd schedule (`dev/daily/jobs.ts`, `scheduled`). The director
installs the launchd calendar with `npm run daily:install`; [setup, schedule and recovery](../../../dev/daily/README.md).
`--dry-run` previews without side effects; `--force` bypasses the three-game-commit gate and `--notes "..."` adds
editorial instructions. The daily loop covers main only, never prototypes. It always uses a fresh worktree and skips
overlapping runs. Codex records and cuts the video; a separate Codex session checks and fixes the cut. It writes
`.look/publish.json` rather than publishing itself. The runner checks and ships changed shots with `npm run ship`,
publishes the approved video, then posts to the "Patch videos" issue mentioning the owner. CI still deploys Pages.
For the daily agent, the runner owns steps 5-7 below and the separate
review session. New edit lists use `.look/reels/<name>.ts` and `npm run reel -- .look/reels/<name>.ts`.
The following describes the editorial sequence; the daily agent must not pull or switch the caller's checkout.

1. Start from fresh `origin/main` (the daily runner does this), then `npm run video:changes`. Count the new things a player would notice and enjoy (a new
   place, creature, toy, mechanic or interaction). A `+` line is a lead, not a count. Fixes, tuning, performance,
   tooling and QoL don't count (they can go on a QoL card). Fewer than 3: stop and report "not enough yet" (no video,
   no notification).
2. For each feature, read its commit and code, then write or extend a shot in `dev/video/shots/` (one shot file per
   area, a few clips each). Record with `npm run clip`, read every contact sheet (section 2), and fix framing until
   each payoff is clearly on screen.
3. Write `.look/reels/patch-<mon><day>.ts` (the structure of the example in section 3): an intro card, one captioned
   clip per feature, a QoL card if there are enough small changes, an outro card. 45-75 s. It is not committed.
4. `npm run reel -- .look/reels/patch-<mon><day>.ts`, then have a reviewer subagent check the cut (framing, captions vs. what's shown, pacing, payoffs
   inside captions, HUD overlap). Apply its fixes, re-render, and check the final contact sheet yourself.
5. `npm run video:publish` with a title, a one-sentence summary, one `--feature` per feature and `--target` set to
   the newest commit the video covers (`npm run video:changes` starts from that tag next time).
6. Commit the new or changed shots in `dev/video/shots/` ("Add the <date> patch video shots"), `npm run ship`; nothing
   to commit if the existing shots covered every feature. The edit list stays in `.look/`.
7. Send the share link with a push notification (and say it in the final message).

