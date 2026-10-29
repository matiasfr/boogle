---
name: video
description: Record clips and GIFs of the running game and cut them into trailers or patch-notes videos (title cards, captions, crossfades, music). Use when asked for a clip, GIF, video, trailer or promo of Boogle, or to show a feature in motion.
---

# Clips and videos

Two commands, both built on the look harness (`dev/look/lib.mjs`: Vite, local signaling, headless Chromium). Output
goes to `.look/` (gitignored).

| What | Command | Source | Output |
| --- | --- | --- | --- |
| Record clips | `npm run clip -- <shot>... [--gif]` | `dev/video/shots/<shot>.mjs` | `.look/clips/<label>.mp4` (+ `.gif`) |
| Cut a video | `npm run reel -- <name>` | `dev/video/reels/<name>.mjs` | `.look/reels/<name>.mp4` |

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
