# Plan: find the fun

> **Status: in progress (started 2026-11-01).** The build plan for "Next: find the fun" in
> [boogle-2.md](../proposals/boogle-2.md): five mechanics-only prototypes, each behind a `?proto=` flag, each asking
> one playtest question. The design record owns the questions and what the answers decide; this file owns the order of
> work and one checkbox per PR. Findings go in [docs/playtests.md](../playtests.md).

## Rules for every prototype

- **Mechanics only.** No mayor, era props, hats, gags, story, authored art, multi-island or chunk work until the
  playtests say the loop is fun.
- **Behind a flag.** `?proto=<name>` turns it on; without the flag the game is unchanged. A prototype that changes
  lockstep numbers runs in its own room (`?room=proto-<name>`) so it never touches the real world's save.
- **Evidence before a playtest.** A `/look` motion sheet for anything that moves, `npm run perf` before and after for
  anything rendered, `npm run check:full` for `src/sim`, `src/world`, `src/net*` or `server/`.
- **No twice → change it or cut it.** Never add rewards to prop up a mechanic that isn't fun.

## 1. Is hauling fun as a toy? (the haul playtest kit)

Already built ([docs/game-design/haul.md](../game-design/haul.md)); this step adds no mechanics, only a way to tune
and test it.

- [ ] **Haul kit:** `?proto=haul` opens a live tuning panel (sway, spill, pour speed, section cost, caps, bundle
      yield and refill) and a playtest checklist ([docs/playtest-kits/haul.md](../playtest-kits/haul.md)). Room-wide
      numbers change for everyone in the room at once.
- [ ] **Playtest 1** with 2–4 people; findings in playtests.md, answer in boogle-2.md.

## 2. Is riding fun? (the rail spike)

- [ ] **`wagonAt`:** `src/sim/wagon.ts`, the wagon's place on the laid rails as a pure function of the tick, with its
      test. No render.
- [ ] **Platform carry:** the player stands on a kinematic Rapier body and is carried without jitter; jumping off
      keeps the platform's speed. Proved on a test platform behind `?proto=ride`.
- [ ] **Placeholder wagon:** a greybox wagon on `wagonAt` you can ride, behind `?proto=ride`.
- [ ] **Playtest 2.**

## 3. Does what you built feel like yours?

- [ ] **Riding only on laid sections:** the wagon's run grows with each laid section (`?proto=ride`).
- [ ] **Playtest 3.**

## 4. Does the island change enough at an era's end?

- [ ] **Greybox era swap:** an opening-day trigger any player can start; blocks swap and the wagon starts running. No
      ceremony (`?proto=era`).
- [ ] **Playtest 4.**

## 5. Is driving a vehicle fun?

- [ ] **Soapbox cart:** an Owner vehicle down the lighthouse path (`?proto=soapbox`).
- [ ] **Playtest 5.**
