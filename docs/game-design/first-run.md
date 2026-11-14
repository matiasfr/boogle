# 6.14 Arrival

## Round 4 shore arrival

The bare URL (room `boogle`; a retired `?proto=place` address opens the same game) lands a newcomer's existing trolley/title fall on
the west-shore clearing at local `(-199,10)`, facing inland. Its level 16 m clearing is 3 m high; a broad
ramp reaches village height by x=-150. The village is reached by walking a 130 m path between the
cottages, with one low optional rock hop. The target is 25–35 seconds with looking; the measured walk
is 27.34 seconds including a three-second look. Mesh, collision and Node tools use one default height grid. Tree IDs retain their original seeded order;
trees cleared for the shore stay in the catalog but have no local mesh or collider. This terrain, clearance
and prop placement are local; no sim state or shared snapshot shape changes. Old tabs retain their local coast.
Production contact shading also excludes those cleared trees, so their square contact planes do not remain
on the dock's grass or coastal cliffs. This is Local presentation only.
SPAWN stays at the village: returning players skip the fall, valid saved positions restore, and unsafe
positions fall back there. Position saves include the ground height; moved ground, water, or an older
save without that sample falls back to SPAWN. Get unstuck keeps its existing nearby-ground/path recovery.

Each newcomer has their own fall while partners keep playing. The `v=village` comparison (the previous landing in
its own room) went with Place (M13e). `&greeting=off` keeps the shore and removes the ask.
The classic island has no entry of its own (6 November). Automated browsers skip the intro and start at the landing unless capturing it; `look --island` starts at the island's SPAWN.
A threshold worker gives a grounded newcomer one visible passing wave and a five-second bubble while
the machine sleeps: “Machine's asleep. Give us a hand?” Optional Talk can recover it. The ask and heard
history are Local; a partner waking the shared machine cancels it. There is no camera lock or response gate.
Playtest marks record stood up, reached town, ask heard, machine woken and entered water, including
stand-up-to-town and town-to-machine durations. The shore follows option A in
[shore-arrival research](../research/shore-arrival.md), recommendations 1–6.

## Existing arrival

- **First visit.** With no name saved on this device (`boogle.name`), you fall into the world (below). The card asks for
  nothing but a name box already filled with a friendly random name ("Sunny Otter", "Jolly Puffin", ...), the eight colour
  swatches (one picked at random) and one big Jump in. Pressing Jump in straight away is fine. The loading screen covers it
  until the island can be drawn; Jump in reads "Loading island" until then. Pad A presses it. In the Home Screen app, a first
  visit there (the app's storage starts empty) also offers "Continue in room x · prototype y" under Jump in. The bare URL
  uses this same opening, landing on the shore before the walk into the village.
  Other `?proto=` and `?play` pages, and automated browsers, get the plain card instead. `intro=1` lets a harness inspect
  a new player's opening; `intro=0` skips the fall. These debug flags are not kept by the Home Screen launch memory.
  The loading screen waits up to 45 seconds for Buddy to finish preparing, then permits a recoverable `load-deadline` capsule.
  A genuine load failure also allows the card to open with a capsule;
  a successful automatic retry replaces it with Buddy ([player.md](player.md#avatar-colours-and-names)).
- **After a world reset.** The first load after a `WORLD_NS` bump (this browser's `boogle.worldSeen` names an older
  world; [src/player/world-reset.ts](../../src/player/world-reset.ts)) is a first visit too: the fall, then the card,
  pre-filled with the saved name and colour, landing on the shore. The reset forgets what it always has (room progress,
  wardrobe, reward claims, The Boogler) and keeps identity and preferences. A reload after that is a returning visit
  ([decisions](../decisions.md#controls), 9 November). An operator's reset of one room
  (`npm run server -- reset <room>`) does the same for that room only: the server names each room's world (`born` in
  `welcome`), and a browser that last joined a different one reloads into a first visit, forgetting that room's
  progress, wardrobe and reward claims, and The Boogler's memory
  ([src/features/room-reset.ts](../../src/features/room-reset.ts)). A restore brings the backup's world back under its own id, so it starts over only
  browsers that joined a different world in between.
- **Returning visit.** With a name saved (and no world reset since the last load), there is no card and no fall: the game goes in on its own as soon as the island
  can be drawn, with the saved name and colour, where you last stood in this room and facing the same way (the pause view's Get unstuck forgets that spot)
  ([src/features/return-spot.ts](../../src/features/return-spot.ts)). Only a place you were standing counts, not a deck, a
  seat or the water; with no record, a different world namespace, or ground that has moved or gone under the sea, you get
  the usual spawn (or the room or prototype's own, from the URL). A bare launch of the Home Screen app goes straight back to
  the room or prototype it was last in.
- **Leaving and starting fresh.** The pause view's Leave goes to a small menu page (`/menu/`) with the game stopped: nothing
  renders and you leave the room. Back to the island returns to the same address; a lobby picker can go here if there are
  ever more lobbies. Start fresh on the main pause page asks for confirmation, forgets you on this
  device and replays the first visit ([identity.md](identity.md)). Round 4 also forgets all solo/co-op saves, including
  personal slices, gifts and position. In co-op it reloads the same room as a new person, rejoining an existing partner's
  railway through the normal snapshot. With no partner, the railway starts fresh too; the warning explains both cases.
  It never sends the shared reset.
- **Welcome back.** A returning player gets a small paper card at the top centre (under the name tag on touch) for
  3.5 s, plus 0.8 s for each line: "Welcome back, <name>", then what changed in this room since this browser was last
  here, when that is known: "Ana and Bo were here" (players new to the room's roster, or whose plaque points rose),
  "3 new stretches of track were laid" (in the railway room, stations laid on both lines, read from the railway),
  "Opening day happened while you were away". In the railway room the plaque points and opening day never change, so
  only the roster and the stretches can speak; the rest still runs on a classic `?proto=` entry. Nothing changed, or
  no memory of the room: just the greeting. It waits up to 4 s for the room's state (in the railway room, the
  railway's too), takes no clicks and blocks nothing.
- **Hooks for later** ([src/player/arrival.ts](../../src/player/arrival.ts)): `isFirstVisit()`, `showCard()`,
  `lastVisit` (`{ at, room }` of the previous visit, localStorage `boogle.lastVisit`), and `addWelcomeItem({ key,
  save, since })`: `save()` says what to remember about the room now, `since(then)` turns last visit's value into a
  line or null. Each room's memory is `boogle.visit.<room>`, written every 5 s while the room's state is known and on
  page hide. Persistent progress, a mailbox or a postcard add their lines here.
- **The fall** ([src/fall/](../../src/fall/); `?proto=fall` replays it on every load, with your saved name). Your Buddy rides a track layer's flat trolley along a rail above the clouds, already travelling while you pick (the rail's sleepers and the clouds slide past at 5 m/s, and its open deck shows your whole Buddy), with the card beside it (no logo on
  it) and no HUD. It takes your colour live and hops when you change it, and your name floats over it as you type. Jump in
  runs it off the end of the rail (about 1.2 s, speeding up to 10 m/s) while the camera swings round from your face to behind you, one shot with no cut. The stronger light on your Buddy's front on the card eases down to the usual fill ([player.md](player.md)) over that swing.
  The ride has quiet procedural axle clacks every 3.8 m, loose-metal rattle and occasional timber creaks on the existing
  SFX bus (after audio unlock). Small camera roll and bob follow the travel, with a damped bump on each axle contact;
  they fade out over the last 0.25 s of the roll. Reduced motion suppresses these camera offsets and the trolley's
  existing rail tremble. All are Local, with no extra wait, input gate or change to the fall's timing (DESIGN.md 10 and 11).
  You steer on the way down (the usual air control, inside a funnel that closes on the title, so you can't miss), drop
  through the cloud into the island's daylight, and see BOOGLE in timber hanging 55 m up. You smash through it (a burst, a thump
  and a shake) and the letters tumble in a loose ring around you at your speed. You land flat with stars (1.8 s; any input
  stands you up after 0.9 s), the letters crash down around you and the cart lands next to you 0.8 s later. You can kick the letters around for 20 s, then they shrink away one at a time. Falls are capped at the player's usual 20 m/s, so the 150 m drop is about 7.5 s in the air. Local: only
  your body and the existing flop and knockdown presence go to others, so a friend sees you land on nothing. The same
  director uses round 4's landing, facing and terrain height for the player, letters and trolley. Round 4 waits for the landing before starting its objective and local interactions. Returning players skip the
  opening and restore their round 4 position; no sky position is saved, including a reload during the fall. During the
  opening, your body collides with terrain rather than other arrivals or loose props: simultaneous arrivals cannot land
  on each other in the sky. Knockdown requires ground proximity; normal contacts return when you stand up.
- **History.** `?proto=arrive` (1 Nov 2026; wordless-onboarding recs 1, 2, 3, 8) tried skipping the lobby on every
  visit, a south-of-the-court arrival with the ball rolled toward you, a two-group card and timings. It was retired
  (merged) on 2 Nov: its direct entry is how returning players arrive now and its rename editor is the pause view's
  You section; the arrival spot, the ball roll, the trimmed card and the timings went with it. The first-run controls card was removed on 3 Nov: the pause view covers the controls.
- **Sync kind.** Local (localStorage `boogle.name`, `boogle.color`, `boogle.lastVisit`, `boogle.visit.<room>` (your spot among them)). The welcome back reads lockstep state (roster, sites, opening) and never changes it.
- **Files.** [src/player/arrival.ts](../../src/player/arrival.ts), [src/player/hud.ts](../../src/player/hud.ts) (the
  card), [src/features/welcome-back.ts](../../src/features/welcome-back.ts),
  [src/features/home-app.ts](../../src/features/home-app.ts), [src/features/fall.ts](../../src/features/fall.ts). Scenarios: `arrival`, `home-app`. Identity:
  [identity.md](identity.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.

## Acts

The room's story is cut into acts (owner, 11 November: [the game has acts](../decisions-controls.md#d-2026-11-11-the-game-has-acts)).
`storyAct(w)` (`src/sim/railway-queries-story.ts`) derives the act from the railway: Act 1 until Q5 is laid (Far Head's
show), Act 2 after. Nothing is saved or sent. `src/features/acts.ts` shows the card; the card is a variant of the moment
banner (`src/ui/moment-banner.ts`): a quiet full-screen title, the number small above, the title light and widely
spaced, a thin rule, a slow fade with a slight drift, no panel, no input taken. Only "Act 1 · The beginning" is titled
(the owner's words); an act he has not titled shows "Act N" alone, with no line under it ("keep it a bit mysterious").

- **First visit:** once Buddy is back up from the landing (about 1.8 s after the impact) a 4.8 s crane of your own
  camera: it starts and ends at the follow camera (no cut) and rises and pulls back along a smooth arc, looking so that
  Buddy stays a little below the middle of the frame whatever the camera's real distance and field of view (solved each
  frame, `src/render/crane-aim.ts`). Wide: the apex is about 14 m out and 29 degrees down (about 48 px tall at 960 wide).
  Upright phone: about 15 m out and 40 degrees down (about 63 px tall at 390 wide). Eased; the turn peaks near 13 and
  21 degrees a second. Touch hints, prompts and the like wait while it plays (`momentBusy`). The title fades in
  0.6 s after it starts and is gone before the hand-back completes. The portrait view uses a closer, lower apex. It is the
  same slot for a late joiner, who sees the room's current act. Nobody else in the room is held. Reduced motion or a
  seated player: no move, the title over the plain view. Automated browsers skip it like the fall (`intro=1` asks for it).
- **A live change** (the room lays Q5): every page's existing Far Head shot (5 s) carries the card from 1.5 s in.
  No second camera move. The shot plays for a player riding the track layer in its chair too (14 November: the owner
  arrived at Far Head that way and got the card with no camera move; [place](place.md), "The way back"). The act waits for any other full-screen moment (`momentBusy`: a playing pull-out, a reward
  card, a banner more than half shown, the open pause view). A banner raised in the same moment (the glider's) waits
  until the card has finished; world prompts stay down while the card shows.
- **Returning player:** the act ("Act 2") is the first line of the Welcome back card, not a second full-screen card.
- **Memory:** each browser keeps the highest act shown in the room's visit memory and shows the current act once when it
  goes up. One procedural sting (`actSting`), silent within 10 s of a fanfare (Far Head's show plays one).
- Acts 3 to 5 are not in the code: an act has a card only when its opening content is built.
