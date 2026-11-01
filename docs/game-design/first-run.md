# 6.14 Arrival and the first-run card

- **First visit.** With no name saved on this device (`boogle.name`), a small paper card over the island asks for
  nothing else: the Boogle title, a name box already filled with a friendly random name ("Sunny Otter", "Jolly
  Puffin", ...), the eight colour swatches (one picked at random) and one big Jump in. Pressing Jump in straight away
  is fine. The loading screen covers it until the island can be drawn; Jump in reads "Loading island" until then.
  Pad A presses it. In the Home Screen app, a first visit there (the app's storage starts empty) also offers
  "Continue in room x · prototype y" under Jump in.
- **Returning visit.** With a name saved, there is no card: the game goes in on its own as soon as the island can be
  drawn, at the usual spawn (or the room or prototype's own, from the URL), with the saved name and colour. A bare
  launch of the Home Screen app goes straight back to the room or prototype it was last in. The pause view's Leave
  reloads onto the card once (session storage `boogle.leaving`), so a player can still change name or colour there.
- **Welcome back.** A returning player gets a small paper card at the top centre (under the hotbar on touch) for
  3.5 s, plus 0.8 s for each line: "Welcome back, <name>", then what changed in this room since this browser was last
  here, when that is known: "Ana and Bo were here" (players new to the room's roster, or whose plaque points rose),
  "3 new stretches of track were laid", "Opening day happened while you were away". Nothing changed, or no memory of
  the room: just the greeting. It waits up to 4 s for the room's state, takes no clicks and blocks nothing.
- **First-run card.** The first time you play with each input kind (keyboard, pad, touch) a small paper card lists the
  basics (groups move, camera, ball, hands, from the registry) and points at the menu. Only its close button takes
  clicks; it leaves after 3 s of walking, 15 s, a click on the close button, or when the menu opens. It sits at the
  lower left (above the hotbar on screens under 1180 px wide; mid-left on touch). On short screens (under 520 px tall)
  and upright phones it drops the hands group and sits higher, clear of the held-item buttons.
- **Hooks for later** ([src/player/arrival.ts](../../src/player/arrival.ts)): `isFirstVisit()`, `showCard()`,
  `lastVisit` (`{ at, room }` of the previous visit, localStorage `boogle.lastVisit`), and `addWelcomeItem({ key,
  save, since })`: `save()` says what to remember about the room now, `since(then)` turns last visit's value into a
  line or null. Each room's memory is `boogle.visit.<room>`, written every 5 s while the room's state is known and on
  page hide. Persistent progress, a mailbox or a postcard add their lines here.
- **History.** `?proto=arrive` (1 Nov 2026; wordless-onboarding recs 1, 2, 3, 8) tried skipping the lobby on every
  visit, a south-of-the-court arrival with the ball rolled toward you, a two-group card and timings. It was retired
  (merged) on 2 Nov: its direct entry is how returning players arrive now and its rename editor is the pause view's
  You section; the arrival spot, the ball roll, the trimmed card and the timings went with it.
- **Sync kind.** Local (localStorage `boogle.name`, `boogle.color`, `boogle.lastVisit`, `boogle.visit.<room>`,
  `boogle.firstRun.<kind>`). The welcome back reads lockstep state (roster, sites, opening) and never changes it.
- **Files.** [src/player/arrival.ts](../../src/player/arrival.ts), [src/player/hud.ts](../../src/player/hud.ts) (the
  card), [src/features/welcome-back.ts](../../src/features/welcome-back.ts),
  [src/features/first-run.ts](../../src/features/first-run.ts),
  [src/features/home-app.ts](../../src/features/home-app.ts). Scenarios: `arrival`, `first-run`, `home-app`. Identity:
  [identity.md](identity.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
