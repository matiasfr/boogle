# 6.26 Prototype: the long crossing (`?proto=crossing`)

*A throwaway greybox for [find-the-fun](../plans/find-the-fun.md), step 7: "Does the crossing feel vast in a good way,
and would you ride it again?" The owner's direction is that the train is far faster than walking and islands may be
vastly far apart ([boogle-2.md](../proposals/boogle-2.md), "Trains and the world"); this finds what that means in
seconds and metres. Serves DESIGN.md 1 (Toys before chores). Research: [sea-crossings.md](../research/sea-crossings.md)
(the destination in view, control kept), [train-riding.md](../research/train-riding.md), section 20 (Death Stranding's
quiet screen). Without the flag nothing loads: `src/features/proto-crossing.ts` imports `src/proto/crossing/` only with
it. Its own room, `proto-crossing`, and Local: no ops, states, presence or messages.*

## What you see and do

- You start on a platform off home's south-east shore, beside a train about to leave (10 s), looking down a long
  viaduct at an island on the horizon. Step left onto a flatbed, level with the platform. A ramp leads down to the land.
- **The ride.** The wagon's look: a loco and four flatbeds, the last with crates. It stands 10 s at each end and runs
  push-pull, so the loco pulls going out and pushes coming home. No verbs, no sound beyond the ambience, no shake and no
  cutscene: you keep your movement and camera. The view widens a few degrees with speed, and after 6 s of riding the
  HUD's corners fade.
- **The line.** A gentle S, 3.2 m over the sea at the stations and 15 m (18 m in `vast`) at mid-span, on pillars every
  27 m. Sleepers, plank seams, red markers and a thin mast at each pillar go past close by.
- **The walkway.** A 1.8 m deck beside the rails, level with the flatbeds. You can walk or sprint the whole way, and it
  has no railings. The rails' bed is walkable too, until a train comes.
- **The far stop.** A small concrete quay around the end of the line, to step off on and look back from. The island
  behind it (about 300 m wide and 120 m tall, a tower on its summit taller still, a blocky town at its foot) is a
  silhouette with no colliders.
- **The look.** A first pass at the owner's pick from the previz (shot 2, after Super Mario Sunshine): a late-morning
  sky, honey timber, pale piers, and the sea below. The card opens at `&tod=0.07`, which holds the sun ahead and to the
  right; without it the sky follows the world clock, and golden hour and the moonlit night are the game's own.
- **The sea's colour.** Blue by depth and drifting toward the sky at a low angle, with a lane of sun glitter under the
  sun: world-locked flecks up close that fade into a soft sheen far off. Numbers: `LOOK` in `tuning.ts`.
- **The sea.** Mostly open: one islet, three rock stacks, one big far islet and a wreck, none of them solid.
- **Falling off** puts you in the sea. Jumping off the train keeps its speed: you fly alongside it, plunge, and skim on
  with spray for about 8 s (one fall from 45 m/s went about 200 m). A jump straight up lands you back on your flatbed. In open sea,
  Interact reads **Back on the line** and puts you on the walkway nearest you.

## Variants

Each differs in one thing, and all the numbers are in `src/proto/crossing/tuning.ts`.

| | length | cruise | accel | ride |
| --- | --- | --- | --- | --- |
| default | 1.2 km | 20 m/s | 3 m/s² | 64 s |
| `&v=express` | 1.2 km | 50 m/s | 8 m/s² | 29 s |
| `&v=vast` | 4 km | 50 m/s | 8 m/s² | 85 s |

On foot: sprinting (9.5 m/s) takes about 2 min over 1.2 km and 7 min over 4 km; walking is 5.6 m/s.

Counters: `rides` (the verb), `crossings` (on the train at the far stop) and `falls`.

## How it reaches that far

All at runtime, under the flag:

- `camera.far` goes from 1500 m to 1.3 × the fog's far (4.7 km, or 12 km in `vast`) and `camera.near` from 0.1 to
  0.25 m, for depth precision.
- The fog is set after `sky.ts` rewrites it each frame: 180 to 3600 m (9200 m in `vast`).
- Four flat rectangles of sea surround the game's fixed 1300 m plane, out to where the fog is solid. They wear the
  plane's own material (`src/proto/crossing/sea.ts`), so nothing shows where they meet at 650 m.
- Past the map's 237 m soft wall (`src/entities/player/state.ts`), a later pre-step hook puts back the speed the wall took.
- The player body's CCD goes off: it stops whole steps on a falling deck at train speed.
- The camera stays above the water in open sea.
