# Plan: find the fun

> **Status: in progress (started 2026-11-01).** The build plan for "Next: find the fun" in
> [boogle-2.md](../proposals/boogle-2.md): five mechanics-only prototypes, each behind a `?proto=` flag, each asking
> one playtest question. The design record owns the questions and what the answers decide; this file owns the order of
> work and one checkbox per PR. Findings go in [docs/playtests.md](../playtests.md).

## Rules for every prototype

- **Solo first.** One person can run every prototype and answer its question alone; multiplayer comes after.
- **Mechanics only.** No mayor, era props, hats, gags, story, authored art, multi-island or chunk work until the
  playtests say the loop is fun.
- **Behind a flag.** `?proto=<name>` turns it on; without the flag the game is unchanged. A prototype that changes
  lockstep numbers runs in its own room (`?room=proto-<name>`) so it never touches the real world's save.
- **Evidence before a playtest.** The builder looks at its own `/look` stills and motion sheets and iterates before
  shipping (AGENTS.md, "See it before you ship"). Tests only for lockstep code; `perf` only for heavy rendering.
- **On the protos page.** [boogle.club/protos/](https://boogle.club/protos/) lists every prototype with its Play link,
  one gut question and a copyable playtest entry (no checklists: the owner is an experienced player and judges feel
  fast); its entry lives in `protos/protos.ts` (AGENTS.md, "Shipping").
- **Options, not one guess.** Where the feel is uncertain, a prototype carries 2–3 variants (`&v=<name>`) the owner
  compares in one sitting.
- **From [finding-the-fun.md](../research/finding-the-fun.md):** each question is about a feeling; every "no" is
  logged with one line on what felt wrong, and the card goes `retired` with that reason (most prototypes should). Variants
  differ in one thing; "can't tell" means that setting doesn't matter. The prototype drops you straight into its verb
  (no walk to reach it). A card goes `live` only after its builder has played it at iPad size. No feel or art pass until
  its question gets a "yes".
- **No twice → change it or cut it.** Never add rewards to prop up a mechanic that isn't fun.

## How the work is split

- **Build in parallel, playtest in order.** Steps 2b (platform carry), 4 (era swap) and 5 (soapbox) don't depend on
  each other or on step 1's code, so they're built at once; step 3 waits for `wagonAt` and platform carry.
- **Greybox first, with a seam for depth.** Each prototype is boxes and code-built shapes, but keeps the thing that
  will later get depth behind one module (the wagon's look, the cart's body, the avatar), so an art or feel pass
  swaps that module without touching the mechanic.

## Depth tracks (off the critical path)

Work that can run beside the prototypes when there's attention or agents to spare. None of it ships into the game
until a look is picked; none of it blocks a playtest.

- **Characters (proposed, waiting on the owner):** concept sheets of the player and The Boogler (`/concept-art`),
  then modelling and rigging in Blender, then a glTF swap behind the avatar module once the asset pipeline exists.
- **Island layout lab (started 1 November):** an interactive map artifact on the real island data, at two scales
  (home in detail for eras 1–2; a rough archipelago), with `?layout=<name>` to walk an option in greybox.
- **Graphics ceiling spike (started 1 November):** a code-only scene behind `?proto=look` using what WebGPU and TSL
  offer, measured per effect, to set the visual quality target on an M4 iPad Pro.
- **Construction you can watch (built 1 November):** the helper hut goes up piece by piece as its ring fills,
  scaffolding first, behind `?room=proto-build&proto=build` (one gut question: is watching it go up satisfying?).
- **Feel passes** on whatever a playtest says is close: one facet per agent (the stack's sway, the wagon's clack).

## 1. Is hauling fun as a toy? (the haul playtest kit)

Already built ([docs/game-design/haul.md](../game-design/haul.md)); this step adds no mechanics, only a way to tune
and test it.

- [x] **Haul kit:** `?proto=haul` opens a live tuning panel (sway, spill, pour speed, section cost, caps, bundle
      yield and refill) and a playtest checklist ([docs/playtest-kits/haul.md](../playtest-kits/haul.md)). Room-wide
      numbers change for everyone in the room at once.
- [x] **Haul variants:** a wheelbarrow (`&v=barrow`) and throwing logs (`&v=toss`) beside the back bundle, compared
      in the same playtest ([haul.md](../game-design/haul.md), "Prototype: haul variants").
- [ ] **Playtest 1** (solo); findings in playtests.md, answer in boogle-2.md.

## 2. Is riding fun? (the rail spike)

- [x] **`wagonAt`:** `src/sim/wagon.ts`, the wagon's place on the laid rails as a pure function of the tick, with its
      test. No render.
- [x] **Platform carry:** the player stands on a kinematic Rapier body and is carried without jitter; jumping off
      keeps the platform's speed. Proved on a test platform behind `?proto=ride`.
- [x] **Placeholder wagon:** a greybox wagon on `wagonAt` you can ride, behind `?proto=wagon`.
- [ ] **Playtest 2.**

## 3. Does what you built feel like yours?

- [x] **Riding only on laid sections:** the wagon's run grows with each laid section (`?proto=wagon`).
- [ ] **Playtest 3.**

## 4. Does the island change enough at an era's end?

- [x] **Greybox era swap:** an opening-day trigger any player can start; blocks swap and the wagon starts running. No
      ceremony (`?proto=era`).
- [ ] **Playtest 4.**

## 5. Is driving a vehicle fun?

- [x] **Soapbox cart:** an Owner vehicle down the lighthouse path (`?proto=soapbox`;
      [docs/game-design/soapbox.md](../game-design/soapbox.md)).
- [ ] **Playtest 5.**
