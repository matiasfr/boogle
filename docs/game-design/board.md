# 6.22 Prototype: departures board (`?proto=board`)

*A mechanics-only prototype for [find-the-fun](../plans/find-the-fun.md), from the decision in
[boogle-2.md](../proposals/boogle-2.md) ("Trains and the world") that only hub stations are fast travel: a macro jump
between places, so the trains stay the way to get around nearby. Gut question: "Do hubs-only jumps make you want to
ride between stops?" Serves DESIGN.md 8 (Designed for drop-in, drop-out) and 7 (Telegraph everything). Without the flag
nothing loads: `src/features/proto-board.ts` imports `src/proto/board/` only with it.*

## Hubs and stops

Stations are the wagon's stops ([wagon.ts](../../src/sim/wagon.ts)): Court (the first work site), Palm Walk, Ridge and
Lighthouse (the far end of the last section). On today's single island the **hubs** are the two ends of the line:

- **Court**, home: where the work starts and where everyone already is.
- **Lighthouse**, the far end: the place you lay track to reach, and the longest ride, so the jump saves the most.

Palm Walk and Ridge are **stops**, reached by riding. A hub opens for jumps once the line reaches it (Lighthouse needs
all three sections).

## What you see and do

- **A hub's board** stands 5.6 m west of the station (Court's 6 m south of that, clear of a palm), facing the line: a 4 x 2.25 m split-flap face on two posts under
  a red cap, and beside it a 6.6 m mast with a red HUB roundel you spot from across the island. The face reads the
  station's name and a red `HUB · FAST TRAVEL` tag; one flap row with the next departure (`> LIGHTHOUSE      0:42`,
  `BOARDING` in green while it stands here) and one with the stops it calls at (`VIA PALM WALK RIDGE`); and a line map:
  hubs as red-edged squares, stops as dots, the laid part solid, the rest dashed, this station ringed (YOU ARE HERE)
  and the wagon as a yellow marker at its live position. Changed letters riffle three flaps (70 ms each), a ticking
  digit one.
- **Interact** (E, pad X, touch action) within 3.6 m of a hub's board opens one picker, "Where to?", of every station
  along the line (keys 1–4, arrows, Enter; Esc or E closes; pad up/down, A, B; a Switch pad swaps A and B):
  - **another hub**: "Jump there now". A puff, a whoosh, a 0.16 s fade to warm white, and you stand in front of that
    hub's board, facing it, with its name big on screen for 1.8 s.
  - **a stop**: "Ride: next wagon in 0:12 · 1 stop". Choosing it puts a plan line under the prototype bar ("Catch the
    wagon towards ... / Due in 0:42", then "Riding to ... / 1 stop to go", a green "Get off here!" while it stands at
    your stop, then "Arrived" with the time it took), a yellow beam and spinning arrow over the wagon until you board,
    and a green column on the stop. Get off elsewhere and the plan starts again from the nearest station.
  - Not laid yet: greyed, "Opens when the line reaches it".
- **A stop's sign** is minimal and has no picker (Interact there says "Ride the wagon to a hub to jump"). The variants
  differ only in how it tells you when the next wagon leaves:
  - **`&v=pole`** (default): a 1.6 x 0.75 m flap face on one post: the name, `NEXT WAGON`, and one row each way
    (`>LIGHTHOUSE 0:07`, `<COURT 0:49`, `NOW` in green while it stands here), the next to leave on top.
  - **`&v=plaque`**: a painted cream plank on two short posts: the name, `WAGON STOP`, and a timetable dial. One turn is
    one round trip; a red band (to Lighthouse) and a blue band (to Court) mark when the wagon stands here, each ending
    in the mark where it leaves; the hand is now. A key and "Leaves when the hand hits its mark · round trip 1:05".
- **The wagon** is a greybox flatbed (2.2 x 3.6 m deck, a lamp at each end) on a kinematic body following `wagonAt` with
  platform carry ([physics/platforms.ts](../../src/physics/platforms.ts)): stand on it and you ride. It runs at the
  wagon prototype's fast pace (6.5 m/s cruise, 2 s to speed up): Court to Lighthouse in about 25 s, a round trip with
  its 6 s stops in about 1:05.

## Testing alone

- In a `proto-` room (`?room=proto-board&proto=board`) a **Lay the whole route** button lays every section for the
  room (`open.lay`).
- `&laid=N` (0–3) shows N laid sections on this tab only, to try one or two sections without hauling (Lighthouse's
  hub then stays closed).

## How it works

Local only: every tab computes the same board and wagon from the shared tick (`sharedSeconds`) and the room's wagon
pace, nothing else is sent. The pace is the room's tune state (`wagonCruise`, `wagonAccel`; `src/sim/tune.ts`): in a
`proto-` room the board sets it to the fast pace once on load (`tune.set`), as the wagon prototype's `v=fast` does.
`src/proto/board/departures.ts` reads the timetable's dwells off `wagonAt` once per laid count and pace and answers
"when does the wagon next stand at stop k leaving in direction d" (tested at both paces in
`test/board-departures.test.ts`). The deck keeps its own clock stepped with physics and pulled gently onto shared time,
so fixed steps in one frame never land on the same instant. `window.__board` exposes `hop(k)`, `openPicker(k)`,
`choose(k)`, `arrival(k)`, `pace()` and the plan for look evals.
