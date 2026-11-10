> **Status: proposed (2026-11-10).**

# Pause wardrobe: dress Buddy from the menu

**Seed** (owner, 10 November): "Instead of having to change your clothes at a wardrobe or at the curio shelf, we
should be able to customize our character with the cosmetics we've unlocked in the pause screen. ... maybe by default it
should just be your inventory, and then there's also a separate options button for all the options that we have today.
... And then you should be able to cycle through the different accessories that you have and apply them to your
character."

**Pitch.** Pause opens on **You**: Buddy turns to face the camera in the world behind a light pane, and you flick
through what you own one slot at a time (hat, accessory, outfit, pet, colour). Each change is on you at once, and your
friends see it on their screens straight away. Everything Pause holds today moves one press away, behind **Options**.
Finding a cosmetic stays in the world: the box, the reveal card and the sheet coming off the curio shelf are untouched.
Only putting things on gets easier. This serves **6. Communal world, personal things** (your look is yours, and it's
shown on your body, where others see it) and "Input gets instant feedback". It bends **11. Show, don't tell** a
little, since it makes a menu the main place to change clothes. The shelf stays the place in the world where your
collection shows.

**Gut question.** With the wardrobe one press away, did you change your look during a session without being asked to,
and did your friend notice?

## What exists today (read from the code)

**The pause view** is one local `<dialog>` (`src/features/pause.ts`):

- **Main page** (`renderMain`, pause.ts:239–278): the roster and connection pill, then `pauseSections`, then Resume
  (focused first, pause.ts:472–479), Controls, Graphics, Room, More, Leave (press twice within 3 s, pause.ts:240–254)
  and the World/build line. The header holds the room id, the subtitle "The island keeps going while you're here"
  (pause.ts:536) and, on the main page only, mute and fullscreen icons (pause.ts:419–425).
- **`pauseSections`**: the voice row (src/features/voice.ts:377), the carry readout (src/features/haul-stack.ts:268) and
  Place's signs (src/proto/place/signs.ts:84).
- **More** (pause.ts:280–306): Get unstuck (hidden while seated, pause.ts:283), Start fresh (src/player/fresh-button.ts),
  the volume slider, and the extra pages from `pausePages` (src/player/pause-pages.ts:9). Those are Graphics, Jump in
  (src/features/jump-in.ts:72), Dev (src/debug/dev-menu.ts:389, where the tunables live) and Place's Debug
  (src/proto/place/panel.ts:243).
- **Controls** (pause.ts:308–330): Keyboard, Gamepad and Touch tabs, the drawn pad with LB/RB situations, and Show as a
  list.
- **Room** (pause.ts:375–400): who's here, Copy invite link, and **You** (src/player/you-editor.ts:24–68): the name
  box and colour swatches, saved to `boogle.name`/`boogle.color` and carried by presence.
- **Opening it.** Esc through losing pointer lock (pause.ts:614–628, which alt-tab also triggers), H on Controls
  (pause.ts:601–609), pad Menu (the `pause` action, pause.ts:591–597), and the 44 px corner button, shown on touch only
  (pause.ts:636–645, pause.css:414–436, in `.hud-tr` beside the voice pill).
- **Navigating it.** Up and down move focus; left and right switch tabs or nudge the slider; A clicks; B goes back a
  page or closes from main; Menu closes from anywhere (pause.ts:494–529). Esc on the main page does nothing, because it
  can't take the pointer lock back; only a Resume click can (pause.ts:497–499, pause.ts:578, research
  controls-guide-and-pause-menu.md).
- **Layout.** A 440 px card, safe-area padding (pause.css:21–22), a phone layout at 600 px (pause.css:358) and a short
  landscape layout (pause.css:386).
- **The world never pauses.** `openModal` (src/player/modal.ts:18–32) only takes this player's keys and pad. Physics,
  presence and the lockstep tick go on, and you stand where you were.

**Cosmetics today** (all personal):

- **The wardrobe (T4)** is a store, not a piece of furniture. `src/entities/wardrobe/state.ts` holds `got`, `bought`,
  `worn` (hat, accessory, outfit, pet), `dry` and `opened` (state.ts:28). It's Personal Local in localStorage
  `boogle.railway-wardrobe.v0:<railwayRoomId>:<pid>` (index.ts:20–28), which a world bump clears. A malformed save
  starts empty (state.ts:46–89).
- **The operations** are `tryOn`, `keepTried`, `wearOwned`, `takeOff`, `swapSlot` (forward only, ending on nothing),
  `grant` and `unbox` (state.ts:172–265).
- **What's worn** is Owner presence `wardrobe` (`{hat?, accessory?, outfit?}`, which includes a try-on, state.ts:268
  and 319). Peers validate it with `parseWorn` (state.ts:93). The pet is the `stowaway` presence `{riding}`
  (state.ts:328). `view.ts` draws both on every avatar.
- **The catalog** (src/render/cosmetic-parts.ts) has **25 wearables**: 11 hats, 9 accessories, 4 outfits and 1 pet
  (the stowaway). That's 10 from claims and boxes, 10 secrets and 5 shop items, plus two placeholder shapes with no
  slot. The research target is 48 items in three tiers (docs/research/cosmetic-rarity.md, recommendation 4).
- **How you get them.**
  - The T1 hat and T2 scarf go on as they arrive (src/entities/railway/reward.ts:279, 336).
  - Station boxes Q2–Q6 are each player's own roll, saved before the reveal (src/entities/railway/crates-view.ts:115–135).
  - Secret crates and the finders' bay (src/entities/finds/secrets-view.ts:331, 344).
  - An item from a box or secret goes on when you put its card away, but only if its slot is empty (`unbox`). A second
    hat goes to the shelf, not onto you.
- **Fine Prices** (src/proto/place/shop.ts:240–290): Try on, then Take it, then Wear it or Take it off at each stand.
  The rail swaps clothes. Walking out wearing something keeps it.
- **The curio shelf and the finders' bay** (src/entities/town/curio-shelf.ts): what you own stands on them, the rest
  under dust sheets. A sheet puffs off when a card is put away nearby. Within 4.4 m, "Swap hat / accessory / outfit /
  pet" cycles what you own (curio-shelf.ts:259–275). In Place's fiction the shelf *is* your wardrobe
  (src/proto/place/gifts.ts:5).
- **Crystals** (K1) are personal, in the finds store, and light a stub on the shelf. They do nothing yet.
- **Colour and name** are only in Pause → Room → You.

**Briefs that depend on walking to the shelf:** only the shelf's own design (docs/game-design/place.md, "Station boxes
and the curio shelf") and its placement plan (docs/plans/curio-shelves-placement.md). Both treat it as the display and
a place to swap. Nothing gates progress on it.

**Decisions that bear on it.**

- **Upgrades are chosen at the machine, with no menu** (decisions.md:78, upgrade-choices brief Q1, owner 9 November).
  The reason was that one player could change *everyone's* machine where nobody sees it. Cosmetics are different in
  kind: personal (DESIGN 6; "Shared progression and one shared wallet" keeps secret-crate finds and certain wearables
  personal), and the result shows on your body, in the world, to everyone. That decision also says Pause may show a
  read-only list.
- **Gifts hint at themselves** (decisions.md:252) and **swappable slots: hat, accessory, outfit** (decisions.md:175).
- **One thing in your hands, no hotbar** (decisions.md:84). That argues against carried items in an inventory.
- **Input gets instant feedback**, **Input goes through the action interface** (owner-calls), and **Small and
  readable** (DESIGN).
- **Phone layout** (docs/game-design/pause.md, "Phone layout"): a bounded card with a scrolling body and every action
  reachable. The touch corner button is the only HUD way in.

## Best suggestions

1. **Pause opens on You; Options is one press away** (all three lenses). It's one way in on every device, and no new
   binding or touch button.
2. **Cycle per slot, applied at once, on Buddy facing you** (design, creative). Your avatar is the display, as in Fall
   Guys. The reward reveal already turns Buddy to the camera and frames him (src/render/reward-reveal.ts:116, 200–214),
   so the "mirror" costs no second render. Left and right are the verb on every device.
3. **The page belongs to the wardrobe entity, not pause.ts** (systems). It registers through `pausePages` with a "start
   here" flag, the way Jump in and Dev already do. pause.ts (658 lines) learns nothing about cosmetics, and Place keeps
   its own pause.
4. **Keep the finding in the world, and add a "new" mark** (creative, design). Boxes, cards and sheets stay. A row
   holding something you haven't seen in the menu gets a dot until you cycle onto it. That bridges "a second hat went to
   the shelf" and the menu without a line of text.
5. **Locked items as hollow pips, not names** (creative). Under each row, one filled pip for each owned item and a
   hollow one for each still under a sheet. It matches the shelf's dust sheets and the 2 November "hint at itself".
   Thumbnails can come after a yes.
6. **Colour joins as the fifth row** (design). It's part of your look and the swatches already exist. The name box
   stays in Room, so the phone keyboard never pops up on this page.

**Tensions.**

- **Opening on You, or Resume first?** The pause research puts Resume first, and on desktop only a Resume click takes
  the pointer lock back. Recommendation: Resume stays the page's first button on keyboard and mouse. On a pad and on
  touch, focus starts on the first slot, and B, Menu or Resume close.
- **The camera swing on every pause.** Alt-tab opens Pause too, so a swing could feel heavy. Recommendation: swing only
  when you're standing on foot. Seated, gliding, swimming or falling, keep the follow camera. With reduced motion, cut
  instead of easing. Ease in over about 0.4 s and give the camera back on close.
- **Shelf swaps alongside the menu.** Two ways in is redundant, but removing them costs work and loses an in-world
  moment ("look what I've got"). Recommendation: keep them.

## Menu shapes (question 1)

**A. Pause opens on You; Options is a button** (recommended).

```
Desktop / pad (panel left, Buddy faces you on the right, light dim)
+----------------------------+------------------------+
| boogle          [mute][fs] |                        |
| [ Resume ]                 |                        |
|  Hat       < Straw hat  >  |       Buddy, turned    |
|            * * o o o o o   |       to the camera,   |
|  Accessory < Scarf      >  |       in the world     |
|  Outfit    < Nothing    >  |                        |
|  Pet       < Out        >  |                        |
|  Colour    o o * o o o     |                        |
| [ Options ]                |                        |
+----------------------------+------------------------+

Phone portrait                     Phone landscape (panel on the right, thumb side)
+-----------------------+          +----------------------+---------------+
|               [mute]  |          |                      | Hat  < .... > |
|      Buddy, framed    |          |   Buddy, framed      | Acc  < .... > |
|      in the top half  |          |   left of centre     | Out  < .... > |
|-----------------------|          |                      | Pet  < .... > |
| Hat       < ....   >  |          |                      | Col  o * o o  |
| Accessory < ....   >  |          |                      | [Resume][Opt] |
| Outfit    < ....   >  |          +----------------------+---------------+
| Pet       < ....   >  |
| Colour    o * o o o   |
| [ Resume ] [Options]  |  <- bottom, in thumb reach, above the safe area
+-----------------------+
```

- *Keyboard:* Esc opens it, Resume relocks, and arrows or Enter cycle. *Pad:* Menu opens it; the d-pad moves and
  cycles; B, Menu or Resume close.
- *Phone:* the rows sit in the bottom sheet, within thumb reach in portrait. In landscape the right-hand column is
  under the existing top-right menu button. Each `<` and `>` is at least 44 px.
- *Cost:* one page, and the current main list becomes the Options page.

**B. Two entry points** (Menu opens Options; a second control opens the wardrobe).

```
Pad:   Menu -> today's pause      D-pad up (free in play) or View -> wardrobe
Touch: [voice][Live][hanger][menu]   <- a second 44 px corner button
```

- *Pad:* fine, since D-pad up is free in play, but View is "Bring the ball back" (src/player/input.ts:331).
- *Keyboard:* fine with a new key.
- *Phone:* worse. The top-right corner is already crowded, portrait has little room, and it's a second target that
  teaches nothing. It's a new action and new guide rows. Rejected for the first build.

**C. Tabs, You first** (`[ You | Options ]` across the top of the card).

```
+----------------------------+
| [ You ]  Options    [mute] |   <- LB/RB or left/right on the strip; tap on touch
|  Hat       < Straw hat  >  |
|  ...                       |
```

- *Pad:* LB and RB are good. *Keyboard:* fine.
- *Phone portrait:* the tabs sit at the top, out of thumb reach. It also nests tabs, because Controls already has
  Keyboard, Gamepad and Touch tabs plus LB/RB situations.
- It's A with a different button, at a higher cost. Take it later if Options grows.

## Shape

- **Sync:** nothing new. What you own stays Personal Local (the wardrobe store), and what you wear stays Owner presence
  `wardrobe` plus `stowaway`. The menu calls the operations that exist, so a partner sees the change on the next
  presence beat (within about 50 ms of the send). Colour already rides presence (you-editor.ts:12–21). The camera swing
  and the page are Local.
- **Wire, saves and WORLD_NS:** no op, presence key or wire shape changes, and no `WORLD_NS` bump. The "new" mark
  needs a seen list. Keep it in its **own** key (`boogle.railway-wardrobe-seen.v0:<railwayRoomId>:<pid>`). If it were a
  field on the wardrobe save, `parseWardrobe` rejects an unexpected shape whole and would empty everyone's wardrobe.
- **Reuses:**
  - `pausePages` and `pauseNavigation` (src/player/pause-pages.ts).
  - The wardrobe API, including `owned(slot)` and `isWorn`.
  - The swatches from you-editor.ts, split out of the name box.
  - The reveal card's camera constraint and face-the-camera turn. Fold it into one small helper rather than copying it
    (owner-calls, "Fold copies into one helper").
- **Smallest first build:**
  - Pause opens on a You page registered by the wardrobe entity: four slot rows and a colour row, cycling left and
    right with a new `cycleSlot(slot, dir)` beside `swapSlot` in state.ts (today's cycle goes forward only), applied at
    once.
  - Hollow and filled pips. Options holds today's main list unchanged: roster and pill, sections, Controls, Graphics,
    Room, More and Leave.
  - The camera swing when on foot.
  - The "new" dot as its own small step after that.
  - Only the production railway gets it. Place, and any build without a wardrobe, opens on today's main list,
    unchanged.
- **Files:**
  - `src/entities/wardrobe/menu.ts` (new: the DOM page) and `src/entities/wardrobe/index.ts` (registers it).
  - `src/entities/wardrobe/state.ts` (`cycleSlot`) and `test/wardrobe.test.ts`.
  - `src/player/pause-pages.ts` (a `start` flag), `src/features/pause.ts` (open on the start page; main becomes
    `options`; left and right reach a focused row; header icons on the start page) and `src/features/pause.css` (side
    panel and bottom sheet, a lighter dim on You).
  - `src/player/you-editor.ts` (export the swatches) and a shared face-camera helper drawn out of
    `src/render/reward-reveal.ts`.
  - `docs/game-design/pause.md` and place.md's wardrobe section.
- **Proposed copy, all drafts for the owner, none of it The Boogler's:**
  - Slot labels: "Hat", "Accessory", "Outfit", "Pet", "Colour".
  - Values: "Nothing" for an empty slot, "Out" or "Away" for the stowaway, and the button "Options".
  - Item names reuse the catalog's `name`s verbatim (for example "A brass diving helmet"). The page shows no `line`s.
- **Input and a11y:**
  - Focus order is Resume, then Hat, Accessory, Outfit, Pet and Colour, then Options, then the header icons, as
    `stops()` builds it.
  - Up and down move between rows. Left and right (and A or Enter for next) cycle the focused row. Pad focus wraps.
  - Each row is one focus stop with `aria-live="polite"` on its value, and the `<` and `>` buttons stay clickable for
    touch and mouse.
  - Esc on You does nothing (it can't relock); Esc and B on any Options page go back one level; B on You closes; Menu
    and Resume close from anywhere. H still opens Controls, now under Options.
  - The page keeps the dialog's `cancel` guard (pause.ts:540).
  - Respect reduced motion, and give `[data-focus]` the same outline as `:focus-visible`.
- **Risks:**
  - The panel could cover Buddy on narrow portrait screens. Frame him in the top half, and test at 390 px.
  - The swing could fight the camera while seated or on a moving deck. Keep it to standing on foot.
  - pause.ts is a hotspot. Keep cosmetics out of it.
  - A changed save shape could wipe owned cosmetics. Use a separate key for seen items.
  - Fewer trips to the shelf mean fewer people see the collection there. The shelf stays the trophy wall.

## Done means

One proof look per player-visible change (owner-calls, "Fast ships"). Each look starts from an `--eval` setup that
grants the hat, scarf, glasses, raincoat and stowaway through `wardrobe().grant(id, { wear: false })` on the production
railway and calls `pauseNavigation.open()`.

- **Desktop (1440×900), standing on the hill:** the You page is open, Buddy faces the camera and is unobscured, and the
  rows read Hat, Accessory, Outfit, Pet and Colour with pips. An `--action` presses right on Hat. In the same video
  second the hat on Buddy changes and the row's name updates.
- **Phone width, portrait 390×844 and landscape 844×390:** the bottom sheet (portrait) or right column (landscape)
  sits clear of the safe areas, every target is at least 44 px, and Buddy is visible above or beside it. Resume and
  Options are reachable without scrolling.
- **Two players** (a `test:net` or scenario assertion, not a still): player A cycles the outfit in the menu, and
  `partnerWearing(A)` on player B reflects it within 1 s. A reload keeps the worn set.
- **Pad navigation** (a scripted `--action` of d-pad presses): focus walks Resume, Hat ... Colour, Options. B on
  Options → Controls returns to Options, then to You, then closes.
- **Seated on a train:** Pause opens on You with the follow camera, without a swing.

## Open questions

1. **The menu's shape?** **Recommended: A. Pause opens on You, with Resume first for keyboard and mouse, slot focus
   first on pad and touch, and Options as one button that holds everything Pause has today.** Alternatives are a second
   entry point (B: D-pad up and a touch corner button) or tabs (C). Answer: ___
2. **How dressing works?** **Recommended: cycle per slot with left and right, applied instantly with no confirm. Buddy
   turns to the camera in the world behind a light pane, but only when standing on foot. Partners see each change live.
   Locked items show as hollow pips, not names.** The alternatives are a grid with thumbnails (after the catalog passes
   about 12 per slot) or trying on privately until you confirm. Answer: ___
3. **The wardrobe and the curio shelf?** **Recommended: keep both as they are. Finding something stays in the world:
   the box, the "You got" card and the sheet puffing off the shelf. The shelf, bay and shop rail keep their swap
   prompts as a second way in. The menu adds a "new" dot for anything you haven't seen there yet.** The alternative is
   removing the shelf's swaps so it's only a display. Answer: ___
4. **What does "inventory" hold?** **Recommended: your look only (four cosmetic slots and colour); the name stays in
   Options → Room.** Abilities, crystals, the line map and a read-only upgrade list are parked. Carried items stay out,
   since there's one thing in your hands and no hotbar. Train looks are shared and wallet-bought, so they stay in the
   world. Answer: ___
5. **Sync, saves and the first build?** **Recommended: the equipped set stays Owner presence (`wardrobe`, `stowaway`),
   with no wire, op or save-shape change and no `WORLD_NS` bump. The seen list goes in its own localStorage key. The
   first build is the You page owned by the wardrobe entity plus `cycleSlot`, with the "new" dot as the next step,
   touching the files listed in Shape.** Answer: ___

## Parked

- Thumbnails or a grid per slot once a slot holds about 12 or more items (the catalog is heading for 48).
- A read-only abilities and upgrades list on You (the upgrade-choices brief allows it), and the crystals count.
- Saved outfits ("looks") you switch between in one press.
- A train-looks page, once train cosmetics exist; it would be shared, so it stays in the world first.
- An `away` pose or "zzz" over a player who has Pause open (from the pause research; the world keeps running).
- A short emote when you close the menu in a new look (a twirl your friends see).
- Moving the name box onto You if players look for it there.
