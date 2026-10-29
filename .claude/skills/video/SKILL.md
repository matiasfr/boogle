---
name: video
description: Record clips and GIFs of the running game and cut them into trailers or patch-notes videos (title cards, captions, crossfades, music). Use when asked for a clip, GIF, video, trailer or promo of Boogle, or to show a feature in motion.
---

# Clips and videos

Commands built on the look harness (`dev/look/lib.mjs`: Vite, local signaling, headless Chromium). Output
goes to `.look/` (gitignored).

| What | Command | Source | Output |
| --- | --- | --- | --- |
| Record clips | `npm run clip -- <shot>... [--gif]` | `dev/video/shots/<shot>.mjs` | `.look/clips/<label>.mp4` (+ `.gif`) |
| Cut a video | `npm run reel -- <name>` | `dev/video/reels/<name>.mjs` | `.look/reels/<name>.mp4` |
| What's new since the last video | `npm run video:changes` | git log since the newest `video-*` tag | a flagged list |
| Publish and get a share link | `npm run video:publish -- <mp4> --title ...` | a finished video | a GitHub release + share page |

Either command also takes a path to a shot or reel kept outside the repo (`npm run clip -- .look/wip/x.mjs`): use that
for one-off or prototype-branch footage that shouldn't be committed.

## 1. Record: `npm run clip`

Options: `--gif` (palette GIF next to each mp4), `--size 1280x720`, `--fps 30`, `--sw` (software GL instead of the
GPU), `--root <checkout>` (serve another checkout, e.g. `git worktree add <dir> origin/<branch>` with `node_modules`
symlinked; the harness itself still comes from this checkout).

Clips are smooth whatever the render speed: the page clock is faked and each frame advances it by exactly 1/fps
before the screenshot. Real GPU on a Mac renders at ~60 fps, so recording runs at about real time.

A shot (`dev/video/shots/island.mjs` is the simplest example):

```js
export default {
  about: 'one line',
  query: 'tidefast=1', // extra URL params for every player
  async run(c) {
    const g = await c.open({ room: 'clipx', hud: 'play', init: () => localStorage.setItem('k', 'v') });
    await g.wait(3); // page time passes (virtual once recording started)
    return [await g.record('x-intro', { seconds: 6, each: c.move('overview', { cam: [0, 9, 30], look: [0, 1, 0] }, 6) })];
  },
};
```

- `c.open(opts)`: a player (`Game`, see the look skill) with the clock installed. `hud: false` hides the HUD,
  `'play'` keeps hints, dialogue and pocket (hides the help card, roster, net pill), `true` keeps all. `init` runs
  before the page's code (seed localStorage: friendship, pocket).
- `g.record(label, { seconds, each(t, k) })`: `each` runs before every frame. Move the camera (`g.view({ cam, look }, fov)`),
  send input (`g.key`, `g.down/up`), call game modules (`g.eval`), or fast-forward the shared sim for a time-lapse
  (`updateWorld(0.1)` in a loop from `/src/world/sync.js`).
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

An edit list (`dev/video/reels/patch-oct29.mjs` is a full example):

```js
export default { size: [1280, 720], fps: 30, fade: 0.45, bpm: 112, music: true, segments: [
  { card: { kicker, title, sub, list: [...], foot }, seconds: 3, bg: 'clip-label', bgFrom: 1 }, // over blurred footage
  { clip: 'clip-label', from: 0, to: 6, speed: 1.2, caption: { title, sub, tag, top } },       // footage + caption
] };
```

`caption.tag` adds a pill in the top right (e.g. "Coming soon"); `caption.top` moves the caption up when the game's
own UI fills the bottom (dialogue boxes). `quiet: true` on a segment drops the drums while it plays. Cards and
captions are HTML in the game's fonts and colours (`dev/video/reel.mjs`); the backing track is synthesized
(`dev/video/music.mjs`) and loudness-normalized. Put each payoff inside its caption's on-screen time, keep segments
3-8 s, and make a contact sheet of the final video (`fps=1/2.5,...tile=6x5`) before sharing it. Over 30 MB, also
make a smaller copy (`-crf 23`) for sending.

## 4. Publish: `npm run video:publish`

```
npm run video:publish -- .look/reels/x.mp4 --title "Patch notes: Nov 5" --summary "One sentence." \
  --feature "The island grew 12x" --feature "Befriend The Boogler" [--target <commit>] [--dry]
```

Hosting: the video file lives on a GitHub release `video-<date>` (video.mp4 about 15-25 MB, poster.jpg, meta.json),
never in git. The Pages deploy (`.github/workflows/deploy.yml` runs `dev/video/site.mjs`) turns every `video-*`
release into a share page at `https://matiasfr.github.io/boogle/updates/<tag>/` (player, link-preview tags, a "Play
Boogle" button) and an index at `/updates/`. The script starts that deploy, waits for the page to answer, and prints
the share link. `--dry` makes the files under `.look/publish/<tag>/` without releasing. Publishing is public: only
publish when asked to (or by the patch video loop below). Pages has a 1 GB site limit: past about 40 videos, delete
old `video-*` releases. To preview pages locally: copy `.look/publish/<tag>` into `<dir>/updates/`, run
`node dev/video/site.mjs <dir>` and serve `<dir>`.

## 5. Patch video loop

`.github/workflows/patch-video.yml` runs this daily (and on demand from the Actions tab, with `force` to skip the
gate). A shell gate first counts commits touching game files since the last video (`npm run video:changes --
--count`, at least 3), so quiet days cost nothing. Claude then does steps 1-4 and opens a `claude/*` PR instead of
step 6. It writes `.look/publish.json` (the `video:publish` fields as JSON) instead of step 5. The workflow then
publishes with `--from .look/publish.json` and comments the share link in the "Patch videos" issue, mentioning the
owner, instead of step 7. CI has no GPU: clips record in software GL, slower but just as smooth. To run the loop by
hand, follow the steps below. It is unattended: never stop to ask.

1. `git pull` on `main`, then `npm run video:changes`. Count the new things a player would notice and enjoy (a new
   place, creature, toy, mechanic or interaction). A `+` line is a lead, not a count. Fixes, tuning, performance,
   tooling and QoL don't count (they can go on a QoL card). Fewer than 3: stop and report "not enough yet" (no video,
   no notification).
2. For each feature, read its commit and code, then write or extend a shot in `dev/video/shots/` (one shot file per
   area, a few clips each). Record with `npm run clip`, read every contact sheet (section 2), and fix framing until
   each payoff is clearly on screen.
3. Write `dev/video/reels/patch-<mon><day>.mjs` (copy the structure of `patch-oct29.mjs`): an intro card, one
   captioned clip per feature, a QoL card if there are enough small changes, an outro card. 45-75 s.
4. `npm run reel`, then have a reviewer subagent check the cut (framing, captions vs. what's shown, pacing, payoffs
   inside captions, HUD overlap). Apply its fixes, re-render, and check the final contact sheet yourself.
5. `npm run video:publish` with a title, a one-sentence summary, one `--feature` per feature and `--target` set to
   the newest commit the video covers (`npm run video:changes` starts from that tag next time).
6. Commit the new shots and reel ("Add the <date> patch video shots"), `npm run ship`.
7. Send the share link with a push notification (and say it in the final message).

