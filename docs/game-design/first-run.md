# 6.14 Arrival and the first-run card

- **First visit.** With no name saved on this device (`boogle.name`), you fall into the world (below). The card asks for
  nothing but a name box already filled with a friendly random name ("Sunny Otter", "Jolly Puffin", ...), the eight colour
  swatches (one picked at random) and one big Jump in. Pressing Jump in straight away is fine. The loading screen covers it
  until the island can be drawn; Jump in reads "Loading island" until then. Pad A presses it. In the Home Screen app, a first
  visit there (the app's storage starts empty) also offers "Continue in room x · prototype y" under Jump in. A `?proto=` or
  `?play` page, and an automated browser, get the plain card over the island instead, with the Boogle title.
- **Returning visit.** With a name saved, there is no card and no fall: the game goes in on its own as soon as the island
  can be drawn, with the saved name and colour, where you last stood in this room and facing the same way (the pause view's Get unstuck forgets that spot)
  ([src/features/return-spot.ts](../../src/features/return-spot.ts)). Only a place you were standing counts, not a deck, a
  seat or the water; with no record, a different world namespace, or ground that has moved or gone under the sea, you get
  the usual spawn (or the room or prototype's own, from the URL). A bare launch of the Home Screen app goes straight back to
  the room or prototype it was last in.
- **Leaving and starting fresh.** The pause view's Leave goes to a small menu page (`/menu/`) with the game stopped: nothing
  renders and you leave the room. Back to the island returns to the same address; a lobby picker can go here if there are
  ever more lobbies. Start fresh ([identity.md](identity.md)) forgets you on this device and replays the first visit.
- **Welcome back.** A returning player gets a small paper card at the top centre (under the name tag on touch) for
  3.5 s, plus 0.8 s for each line: "Welcome back, <name>", then what changed in this room since this browser was last
  here, when that is known: "Ana and Bo were here" (players new to the room's roster, or whose plaque points rose),
  "3 new stretches of track were laid", "Opening day happened while you were away". Nothing changed, or no memory of
  the room: just the greeting. It waits up to 4 s for the room's state, takes no clicks and blocks nothing.
- **First-run card.** The first time you play with each input kind (keyboard, pad, touch) a small paper card lists the
  basics (groups move, camera, ball, hands, from the registry) and points at the menu. Only its close button takes
  clicks; it leaves after 3 s of walking, 15 s, a click on the close button, or when the menu opens. It sits at the
  lower left (above the name tag on screens under 960 px wide; mid-left on touch). On short screens (under 520 px tall)
  and upright phones it drops the hands group and sits higher, clear of the held-item buttons.
- **Hooks for later** ([src/player/arrival.ts](../../src/player/arrival.ts)): `isFirstVisit()`, `showCard()`,
  `lastVisit` (`{ at, room }` of the previous visit, localStorage `boogle.lastVisit`), and `addWelcomeItem({ key,
  save, since })`: `save()` says what to remember about the room now, `since(then)` turns last visit's value into a
  line or null. Each room's memory is `boogle.visit.<room>`, written every 5 s while the room's state is known and on
  page hide. Persistent progress, a mailbox or a postcard add their lines here.
- **The fall** ([src/fall/](../../src/fall/); `?proto=fall` replays it on every load, with your saved name). Your Buddy rides a track layer's flat trolley along a rail above the clouds, already travelling while you pick (the rail's sleepers and the clouds slide past at 5 m/s, and its open deck shows your whole Buddy), with the card beside it (no logo on
  it) and no HUD. It takes your colour live and hops when you change it, and your name floats over it as you type. Jump in
  runs it off the end of the rail (about 1.2 s, speeding up to 10 m/s) while the camera swings round from your face to behind you, one shot with no cut. The stronger light on your Buddy's front on the card eases down to the usual fill ([player.md](player.md)) over that swing.
  You steer on the way down (the usual air control, inside a funnel that closes on the title, so you can't miss), drop
  through the cloud into the island's daylight, and see BOOGLE in timber hanging 55 m up. You smash through it (a burst, a thump
  and a shake) and the letters tumble in a loose ring around you at your speed. You land flat with stars (1.8 s; any input
  stands you up after 0.9 s), the letters crash down around you and the cart lands next to you 0.8 s later. You can kick the letters around for 20 s, then they shrink away one at a time. Falls are capped at the player's usual 20 m/s, so the 150 m drop is about 7.5 s in the air. The controls card waits until you land. Local: only
  your body and the existing flop and knockdown presence go to others, so a friend sees you land on nothing.
- **History.** `?proto=arrive` (1 Nov 2026; wordless-onboarding recs 1, 2, 3, 8) tried skipping the lobby on every
  visit, a south-of-the-court arrival with the ball rolled toward you, a two-group card and timings. It was retired
  (merged) on 2 Nov: its direct entry is how returning players arrive now and its rename editor is the pause view's
  You section; the arrival spot, the ball roll, the trimmed card and the timings went with it.
- **Sync kind.** Local (localStorage `boogle.name`, `boogle.color`, `boogle.lastVisit`, `boogle.visit.<room>` (your spot among them),
  `boogle.firstRun.<kind>`). The welcome back reads lockstep state (roster, sites, opening) and never changes it.
- **Files.** [src/player/arrival.ts](../../src/player/arrival.ts), [src/player/hud.ts](../../src/player/hud.ts) (the
  card), [src/features/welcome-back.ts](../../src/features/welcome-back.ts),
  [src/features/first-run.ts](../../src/features/first-run.ts),
  [src/features/home-app.ts](../../src/features/home-app.ts), [src/features/fall.ts](../../src/features/fall.ts). Scenarios: `arrival`, `first-run`, `home-app`. Identity:
  [identity.md](identity.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
