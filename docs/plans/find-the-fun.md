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
  shipping ([AGENT-VERIFICATION.md, See it before you ship](../agents/verification.md#see-it-before-you-ship), required by AGENTS.md). Tests only for lockstep code; `perf` only for heavy rendering.
- **On the protos page.** [boogle.club/protos/](https://boogle.club/protos/) lists every
  prototype with its Play link, one gut question and a copyable playtest entry (no checklists: the owner is an
  experienced player and judges feel fast); its entry lives in `protos/protos.ts` ([AGENT-SHIPPING.md, Shipping](../agents/shipping.md#shipping)).
- **Into the verb in seconds.** On a `?proto=` page, `src/proto/session.ts` drops you at the variant's or card's
  `spawn`, next to the thing to try: give every live card one. Place owns its spawn, and the fall arrival takes
  precedence. Variants remain addressable with `&v=<name>`. Count what the owner does (`protoCount('rides')`,
  `src/proto/count.ts`): time in the prototype is counted already; the counts go into the copied playtest entry.
  Feedback comes from playtests and feedback forms; the in-game verdict bar was removed on 4 November.
- **A trace of every sitting.** Each `?proto=` page load records where the owner went (1 Hz, 1 m), idled, failed
  and quit, and the seconds to the verb (`src/proto/trace/`, research: [playtest-telemetry.md](../research/playtest-telemetry.md)),
  kept in this browser only; the protos page draws it as a heat map under the card and adds one line to the entry.
  Failures are `protoMark('crash')` one-liners where they already happen; a verb that isn't a ride, drive or carry is
  the card's `verb` counter. `&trace=1` draws the last sitting's path on the ground.
- **Options, not one guess.** Where the feel is uncertain, a prototype carries 2–3 variants (`&v=<name>`) the owner
  compares in one sitting.
- **From [finding-the-fun.md](../research/finding-the-fun.md):** each question is about a feeling; every "no" is
  logged with one line on what felt wrong, and the card goes `retired` with that reason (most prototypes should). Variants
  differ in one thing; "can't tell" means that setting doesn't matter. The prototype drops you straight into its verb
  (no walk to reach it). A card goes `live` only after its builder has played it at iPad size. No feel or art pass until
  its question gets a "yes".
- **No twice → change it or cut it.** Never add rewards to prop up a mechanic that isn't fun.

## One path: the playtest playlist (`/?play`)

> **Removed 4 November 2026, by owner request.** The top-centre bar wasted space in prototype plays; playtests and
> feedback forms now carry feedback. The `?play` playlist and in-game verdict controls are gone. Prototype addresses,
> spawn placement, counters and traces remain. The design below is a historical record, not current implementation guidance.

Designed 1 November, after the owner's first round: testing went page → Play (a reload) → lobby → walk to the toy →
switch variant (another reload) → back to the page to copy notes. Research recs 5–7, 9 and 10.

1. **One link.** `/?play` opens the island in its own room (`proto-play`) with every prototype that fits on it at once
   (`ISLAND`, `src/proto/flags.ts`: haul, wagon, lay, soapbox, minis, assets, moves), each at its own spot;
   returning players skip the lobby (`src/player/arrival.ts`), and the Home Screen app reopens it.
2. **Chapters.** A card that reshapes the world or clashes with a toy (era, look, layout, uisfx, board with its own
   wagon, ride whose flatbed crosses the minis) says why in `chapter`; the playlist opens its own address with
   `&play`, and Next leads back to the island.
3. **The playlist** is `PLAYTEST_ORDER`, one step per card: the bar shows "3/14", the title, the gut question, the
   variant buttons (ticked once judged), Yes / No / Can't tell with a one-line note (a plain text box: iOS dictation
   works) and ◀ Prev · Copy all · Next ▶. Next teleports you to the next toy's spawn, facing it.
   It keeps only open questions: after the 1 November run-through, settled cards are `graduated`, `answered` or
   `parked` (protos/protos.ts, each with the owner's verdict) and sit in the protos page's compact Answered list; their
   toys stay on the island but out of the playlist. The playing variant's one line shows under its buttons, and the
   wagon's step puts you on its deck.
4. **Pad and touch.** Everything is a button on the bar; on the Backbone, D-pad ↓ opens the bar as a modal (D-pad
   between buttons, A presses, LB / RB previous / next toy, B closes); P and arrows on a keyboard.
5. **Variants switch live** where the prototype registers `onVariant(id, names, fn)`: Local feel (wagon calm, lively
   and fast, soapbox grip and drifty, minis, moves, board) and room-wide tune ops (lay's run kinds, the wagon's pace).
   The rest (the haul's five ways, wagon stoke and grind, look, layout) reload into the same spot.
6. **Where you are is remembered** in this browser (`boogle-play-v1`: the step and each card's variant);
   `/?play=<card>:<variant>` jumps to a step (the protos page's Start here buttons).
7. **Feedback per variant:** verdict, note, counters and trace sittings are kept per card and variant
   (`protos/store.ts`); one Copy all, in the bar and on the page, writes the whole playtests.md entry (`protos/entry.ts`).
8. **Only the current toy's panel shows** on the island (`playPanel`); counters and the trace follow the current step,
   and the wagon runs only the really laid line while the laying run is up.
9. **Verdicts go to the server** (owner's OK, boogle-2.md): each verdict tap and finished note is also a `playtest`
   report (`src/proto/bar/send.ts`, POST /report), with a small "✓ sent" by the verdict; `npm run verdicts` reads them
   back (`--md` drafts the playtests.md lines). Copy all stays for the full entry; a failed send is silent.
10. Standalone `?proto=<name>` pages work as before, for builders and their scenarios (`dev/scenarios/play-playlist.ts`
    walks the playlist).

- [x] **The playlist:** `/?play`, chapters, live variants, the bar's playlist and pad, feedback per variant.

## How the work is split

- **Build in parallel, playtest in order.** Steps 2b (platform carry), 4 (era swap) and 5 (soapbox) don't depend on
  each other or on step 1's code, so they're built at once; step 3 waits for `wagonAt` and platform carry.
- **Greybox first, with a seam for depth.** Each prototype is boxes and code-built shapes, but keeps the thing that
  will later get depth behind one module (the wagon's look, the cart's body, the avatar), so an art or feel pass
  swaps that module without touching the mechanic.

## Depth tracks (off the critical path)

- [x] **Procedural sky (3 November, owner verdict revision):** `?proto=sky` keeps the original lighter blue,
  improves five rounded cloud groups and softens the sea horizon across the normal day/night cycle. Owner question:
  “Do these clouds and this horizon keep the sky you liked and make it better?” [As built](../game-design/sky-proto.md).
  This completes the revised prototype build, not look approval. Parked the same day: the owner prefers the original
  sky and cloud shape (`docs/proposals/boogle-2.md`).

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
- **One thing in your hands (2 November, answered):** the owner didn't miss the hotbar, so it is cut and picking
  something up dropping what you hold is the game ([docs/game-design/held.md](../game-design/held.md)).
- **Feel passes** on whatever a playtest says is close: one facet per agent (the stack's sway, the wagon's clack).

## 1. Is hauling fun as a toy? (the haul playtest kit)

Already built ([docs/game-design/haul.md](../game-design/haul.md)); this step adds no mechanics, only a way to tune
and test it.

- [x] **Haul kit:** `?proto=haul` opens a live tuning panel (sway, spill, pour speed, section cost, caps, bundle
      yield and refill) and a playtest checklist ([docs/playtest-kits/haul.md](../playtest-kits/haul.md)). Room-wide
      numbers change for everyone in the room at once.
- [x] **Haul variants:** a wheelbarrow (`&v=barrow`) and throwing logs (`&v=toss`) beside the back bundle, compared
      in the same playtest ([haul.md](../game-design/haul.md), "Prototype: haul variants").
- [x] **Playtest 1** (solo); findings in playtests.md, answer in boogle-2.md.

## 2. Is riding fun? (the rail spike)

- [x] **`wagonAt`:** `src/sim/wagon.ts`, the wagon's place on the laid rails as a pure function of the tick, with its
      test. No render.
- [x] **Platform carry:** the player stands on a kinematic Rapier body and is carried without jitter; jumping off
      keeps the platform's speed. Proved on a test platform behind `?proto=ride`.
- [x] **Placeholder wagon:** a greybox wagon on `wagonAt` you can ride, behind `?proto=wagon`.
- [x] **Playtest 2.**

## 3. Does what you built feel like yours?

- [x] **Departures board:** stations are the fast-travel board; a flap-display sign per laid station off `wagonAt`,
      with `&v=hop` (instant travel) and `&v=ride` (catch the highlighted wagon) (`?proto=board`;
      archived: tag `archive/board`).
- [x] **Riding only on laid sections:** the wagon's run grows with each laid section (`?proto=wagon`).
- [x] **Laying-run variants:** is the 50 s laying run satisfying or dead time? Crawl (today's, juicier), quick (14 s)
      and push (lays only while pushed), rideable, compared in one sitting (`?room=proto-lay&proto=lay&v=`).
- [x] **Playtest 3.**

## 4. Does the island change enough at an era's end?

- [x] **Greybox era swap:** an opening-day trigger any player can start; blocks swap and the wagon starts running. No
      ceremony (`?proto=era`).
- [ ] **Playtest 4.**

## 5. Is driving a vehicle fun?

- [x] **Soapbox cart:** an Owner vehicle down the lighthouse path (`?proto=soapbox`;
      [docs/game-design/soapbox.md](../game-design/soapbox.md)).
- [x] **Playtest 5.**

## 6. Does the line feed the town? (the rail loop)

The rail builds the world ([boogle-2.md](../proposals/boogle-2.md), Decided, 2 November). Throwaway greybox on today's
island: prototypes stay outside the entity plan until they're promoted, so this doesn't wait for its steps 10–12. The
real slice does.

- [x] **`?proto=net`:** connect a camp, crates ride to the village, the village steps up and the train speeds up; then
      the rail fills the next work site for you (`&v=haul` keeps hauling by hand, to tell which part is the fun).
- [x] **`&v=depot`:** the owner's lean after playing it (boogle-2.md, 2026-11-02): junctions unlock the network, you
      still haul. Each camp connected puts up a depot the wagon stocks; one press, one load, one carry to the ring.
- [ ] **Playtest 6.**

## 7. Does a long crossing feel vast?

- [x] **`?proto=crossing`:** a fast train over a long viaduct to a far greybox island, with the same distance at two
      speeds and a much longer one, to find what "vast" means in seconds and metres.
- [x] **Playtest 7.**

## 8. Having found a place on foot, do you want to connect it?

- [x] **`?proto=place`:** a slice of Threefold Reach in greybox: a village, a gorge, two camps smoking across it and a
      spire to steer by. You walk there, plant a stake, haul while the trestle goes up and ride home with the cargo.
- [x] **Playtest 8.** Yes, but it wasn't clear what connecting would do ([playtests.md](../playtests.md), 2 November).

## 9. Does carrying materials out to the track feel like building something?

- [x] **`?proto=place`, second round:** a sign at the village, a stranded track layer to wake, chop, three auto-paver
      stations along the route, the same logs laid as sleepers, and a forge your cargo builds, whose rails start line 2.
- [x] **Playtest 9.** Yes: "it felt like my work became the track" ([playtests.md](../playtests.md), 2 November).

## 10. Did the crates and the little guys give you a reason to keep carrying?

- [x] **`?proto=place`, third round:** the same job with motivation and life around it. The look by default, a machine that
      wakes with drama, a first-line celebration with the one camera move, a forge you can't miss from the train, a solid town
      built on scaffolding, a crate with a cosmetic gift per stretch, a curio shelf and empty mounts that promise them, little
      guys and crystals.
- [x] **Playtest 10.** "Nice, but I would have carried on anyway" ([playtests.md](../playtests.md), 2 November).
