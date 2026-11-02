# 6.22 Prototype: departures board (`?proto=board`)

*A mechanics-only prototype for [find-the-fun](../plans/find-the-fun.md), from the decision in
[boogle-2.md](../proposals/boogle-2.md) that stations are the fast-travel board and trains are ride-only and timetabled.
Gut question: "Does the board make the island feel connected and quick to get around?" Serves DESIGN.md 8 (Designed for
drop-in, drop-out) and 7 (Telegraph everything). Without the flag nothing loads: `src/features/proto-board.ts` imports
`src/proto/board/` only with it.*

## What you see and do

- **A sign at each laid station.** Stations are the wagon's stops ([wagon.ts](../../src/sim/wagon.ts)): the first work
  site (Court), each later site (Palm Walk, Ridge) and the far end of the last laid section (Lighthouse). The sign stands
  5.6 m west of the station, facing the line: dark board, red cap, 3.2 x 1.6 m face. With nothing laid only Court's sign
  stands, reading NO SERVICE YET.
- **The face** is a split-flap display: the station's name, then one row per direction the wagon leaves from here
  (`> LIGHTHOUSE 0:42`, `< COURT 1:10`; `BOARDING` in green while it stands here), and a line map of the whole route
  with the laid part solid, the rest dashed, this station ringed (YOU ARE HERE) and the wagon as a yellow marker.
  Changed letters riffle three flaps (70 ms each), a ticking digit one.
- **Interact** (E, pad X, touch action) within 3.4 m of the face opens a picker of every laid station (keys 1–4,
  arrows, Enter; Esc or E closes; pad up/down, A, B; a Switch pad swaps A and B).
- **`&v=hop`** (default): choosing a station travels there: a puff, a whoosh, a 0.16 s fade to warm white, and you
  stand in front of that station's sign, facing it, with its name big on screen for 1.8 s.
- **`&v=ride`**: no teleport. The picker says which wagon to catch (`▶ wagon towards Lighthouse in 0:05 · 2 stops`);
  choosing one puts a plan line at the top of the screen ("Catch the wagon towards ... / Due in 0:42", then
  "Riding to ... / 2 stops to go", then a green "Get off here!" while it stands at your stop, then "Arrived" with the
  time it took), a yellow beam and spinning arrow over the wagon until you board, and a green column on the
  destination. Get off elsewhere and the plan starts again from the nearest station.
- **The wagon** (both variants) is a greybox flatbed (2.2 x 3.6 m deck, a lamp at each end) on a kinematic body
  following `wagonAt` with platform carry ([physics/platforms.ts](../../src/physics/platforms.ts)): stand on it and you
  ride. Palm Walk to Lighthouse takes about 26 s on the wagon.

## Testing alone

- In a `proto-` room (`?room=proto-board&proto=board`) a **Lay the whole route** button lays every section for the
  room (`open.lay`).
- `&laid=N` (0–3) shows N laid sections on this tab only, to try one or two sections without hauling.

## How it works

Local only: every tab computes the same board and wagon from the shared tick (`sharedSeconds`), nothing is sent.
`src/proto/board/departures.ts` reads the timetable's dwells off `wagonAt` once per laid count and answers "when does
the wagon next stand at stop k leaving in direction d" (tested in `test/board-departures.test.ts`). The deck keeps its
own clock stepped with physics and pulled gently onto shared time, so fixed steps in one frame never land on the same
instant. `window.__board` exposes `hop(k)`, `openPicker(k)`, `choose(k)` and the plan for the look evals.
