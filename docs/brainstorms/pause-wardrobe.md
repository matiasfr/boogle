> **Status: answered by the owner (2026-11-10); step 1 built, step 2 built, step 3 (the "new" dot) not built.** The
> [owner's answers](#owner-questions-answered-10-november) override the design review where they differ: Pause opens on You
> even when empty (question 2b), and unowned items show nothing, no hollow pips (4b).

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
- **Smallest first build** (amended by the design review below; where the Tensions above differ, this wins):
  - **Step 1.** Pause opens on a You page registered by the wardrobe entity: four slot rows and a colour row, cycling
    left and right with a new `cycleSlot(slot, dir)` beside `swapSlot` in state.ts (today's cycle goes forward only),
    applied at once. The cycle is the slot's owned items in catalog order with Nothing at the left end, wrapping both
    ways. The rows redraw whenever the wardrobe changes while the page is open (a reveal finishing behind it).
  - **Pause always opens on You** on the production railway (owner, 10 November, question 2b, overruling the design
    review's "Options until the first wearable"), even when you own nothing and every row reads Nothing. It never
    remembers the last page. Options is one press away (the button, Esc, RB) and H still opens Controls directly.
  - **The roster and connection pill stay on the page Pause opens on** (5 November: name chips and the Live count are
    in Pause on every platform): a compact row in the You header, beside the mute icon. Options doesn't repeat them.
  - The colour swatches move to You; Room keeps only the name box.
  - Pips (owner, 10 November, question 4b: nothing you don't own shows): one for Nothing, then one per item you own in
    cycle order, the current one drawn larger, so the row doubles as "where am I in the cycle". Nothing reveals how many
    items exist. With fewer than two things owned the cycle is too short to need them, so the pip row is hidden. The
    pips sit inside the row under the value, so each row stays one 44 px target.
  - Options holds today's main list unchanged otherwise: sections, Controls, Graphics, Room, More and Leave, plus the
    World/build line. Get unstuck stays in More (one press deeper than today, accepted).
  - **Options shortcuts:** RB on a pad and Esc on a keyboard go from You to Options (Esc does nothing there today, since
    it can't relock). B and Esc on Options go back to You. The Options button shows the RB glyph on a pad.
  - **The camera swing**, on foot only, with the conditions under "Camera" below, framed per layout.
  - Only the production railway gets it. Place, and any build without a wardrobe, opens on today's main list,
    unchanged.
  - **Step 2 (built; owner, 10 November, question 3b).** The curio shelf's and finders' bay's four "Swap …" prompts go (curio-shelf.ts `targets()`); the
    shelf keeps everything else: what you own on show, the dust sheets, the puff at a reveal nearby, the crystal row and
    the missed secrets waiting at the bay. The shop's Try on, Take it, Wear it and Take it off stay: trying on what you
    don't own is the shop's job. (Port-from-Place verdict: the shelf as display, keep; its swap prompts, cut.)
  - **Step 3.** The "new" dot, with its own seen key, cleared by the same world and room resets that clear the
    wardrobe key.
- **Camera** (design review): Buddy turns to face the camera and the camera eases in over about 0.4 s (a cut with
  reduced motion), reusing the reveal's constraint with a **screen-space framing offset**: Buddy sits in the right
  half on desktop, the left half in phone landscape, and the top third in phone portrait. Today's reveal constraint
  centres him, which would put him on the bottom sheet's top edge in portrait. The swing runs only when all of these
  hold; otherwise the follow camera stays and nothing turns:
  - standing on foot (on ground or a moving deck, as the reveal already allows): not seated (`inputState.seated`,
    which covers the cab cutaway and every vehicle seat), swimming, gliding, falling, on a hook rope or knocked down
    (`me.down`), and not playing as the guest character;
  - no reward reveal or camera pull-out has weight: a shared cinematic (owner, 9 November: uninterruptible) plays
    behind the pane and the swing starts when it ends, if the page is still open;
  - the page wasn't opened by the window losing focus (alt-tab ends the pointer lock and opens Pause): then the swing
    waits for your first change to a row.
  - Closing hands the camera back over the reveal's return blend. Buddy stays turned until you move.
- **Your body while the page is open** (the world never pauses): you stand where you were, with keys and pad released
  as today. A moving deck or a seat carries you; the ball and other toys can still hit you; nothing new can pick you up
  or move you. Partners see you turn to face your camera and every change you make, as they would in the world.
- **Files:**
  - `src/entities/wardrobe/menu.ts` (new: the DOM page) and `src/entities/wardrobe/index.ts` (registers it).
  - `src/entities/wardrobe/state.ts` (`cycleSlot`) and `test/wardrobe.test.ts`.
  - `src/player/pause-pages.ts` (a `start` flag), `src/features/pause.ts` (open on the start page; main becomes
    `options`; left and right reach a focused row; header icons on the start page) and `src/features/pause.css` (side
    panel and bottom sheet, a lighter dim on You).
  - `src/player/you-editor.ts` (export the swatches) and a shared face-camera helper drawn out of
    `src/render/reward-reveal.ts`.
  - `docs/game-design/pause.md` and place.md's wardrobe section.
  - Step 2: `src/entities/town/curio-shelf.ts` (`targets()` loses the swaps). Step 3: the seen key beside the wardrobe
    key's reset in `src/player/world-reset.ts` and `src/features/room-reset.ts`.
- **Proposed copy, all drafts for the owner, none of it The Boogler's:**
  - Slot labels: "Hat", "Accessory", "Outfit", "Pet", "Colour".
  - Values: "Nothing" for an empty slot, and the button "Options". The pet row reads like the others: the stowaway's
    catalog name when it's out, "Nothing" when it isn't (design review; replaces "Out" or "Away").
  - Item names reuse the catalog's `name`s verbatim (for example "A brass diving helmet"). The page shows no `line`s.
- **Input and a11y:**
  - Focus order is Resume, then Hat, Accessory, Outfit, Pet and Colour, then Options, then the header icons, as
    `stops()` builds it.
  - Up and down move between rows. Left and right (and A or Enter for next) cycle the focused row. Pad focus wraps.
  - Each row is one focus stop with `aria-live="polite"` on its value, and the `<` and `>` buttons stay clickable for
    touch and mouse.
  - Esc and RB on You open Options (Esc can't relock, so Resume is still the way back in on desktop); Esc and B on any
    Options page go back one level, ending on You; B on You closes; Menu and Resume close from anywhere. H still opens
    Controls, now under Options. Focus starts on Resume with keyboard and mouse, on Hat with a pad or touch.
  - The page keeps the dialog's `cancel` guard (pause.ts:540).
  - Respect reduced motion, and give `[data-focus]` the same outline as `:focus-visible`.
- **Risks:**
  - The panel could cover Buddy on narrow portrait screens. Frame him in the top half, and test at 390 px.
  - The swing could fight the camera while seated, in a cinematic or after an alt-tab. Keep to the conditions under
    Camera.
  - pause.ts is a hotspot. Keep cosmetics out of it.
  - A changed save shape could wipe owned cosmetics. Use a separate key for seen items.
  - Fewer trips to the shelf mean fewer people see the collection there. The shelf stays the trophy wall.

## Done means

One proof look per player-visible change (owner-calls, "Fast ships"). Each look starts from an `--eval` setup that
grants the hat, scarf, glasses, raincoat and stowaway through `wardrobe().grant(id, { wear: false })` on the production
railway and calls `pauseNavigation.open()`.

- **(owner answers, 10 November) Empty You:** a new player's first pause lands on You with every row Nothing and no pip
  rows; Options is one press, Esc or RB away. This replaces the design review's "new player lands on Options" look.
  Pips show Nothing plus what is owned only.
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
- **(design review, superseded by question 2b) A new player** (a fresh wardrobe, nothing granted): the review had Pause
  open on Options until a first wearable. Now it opens on You, empty.
- **(design review) Framing:** in the portrait still, Buddy's head and hat are above the sheet's top edge; in the
  landscape still, the pips sit inside each 44 px row and nothing scrolls.
- **(design review) Roster:** the You page's header shows the name chips and the Live pill (a two-player scenario).
- **(design review) Shortcuts:** RB (pad) and Esc (keyboard) on You show Options; B and Esc there return to You.
- **(design review) A cinematic:** with the page open, a camera pull-out started by `--eval` plays without the swing,
  and the swing starts after it ends. An alt-tab open (window blur, then lock loss) shows no swing until the first
  change.
- **(design review) Step 2:** at the curio shelf, no "Swap …" prompt shows within 4.4 m; the sheets still puff when a
  card is put away there.
- **(owner answers) Prompts behind the menu:** the world's interaction prompts are hidden while Pause is open.

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

## Owner questions answered (10 November)

The owner's words, as the coordinator relayed them (verbatim): "1. The menu's shape: (a) Pause opens on You; Options is
one button. 2. What a new player sees first: (b) You always, even when empty. 3. The curio shelf: (b) Remove the
prompts; keep it as the display. 4. Items you don't own yet: (b) Nothing shown. 5. The camera: (a) Buddy turns to face
you when the page opens."

| # | Question | Answer | Differs from the design review? |
| --- | --- | --- | --- |
| 1 | The menu's shape | A: Pause opens on You, Options is one button | No |
| 2 | What a new player sees first | **You always, even when empty** | **Yes.** The review (call 6, finding 1) had Options until the first wearable. |
| 3 | The curio shelf | Remove the prompts; keep it as the display | No (call 25); built as step 2 |
| 4 | Items you don't own | **Nothing shown** | **Yes.** The review (call 20) had hollow pips. Now the pips are Nothing plus what you own, and hidden below two owned. |
| 5 | The camera | A: Buddy turns to face you when the page opens | No |

Recorded in [decisions.md](../decisions.md) and [agent-calls.md](../agent-calls.md).

## Parked

- Thumbnails or a grid per slot once a slot holds about 12 or more items (the catalog is heading for 48).
- A read-only abilities and upgrades list on You (the upgrade-choices brief allows it), and the crystals count.
- Saved outfits ("looks") you switch between in one press.
- A train-looks page, once train cosmetics exist; it would be shared, so it stays in the world first.
- An `away` pose or "zzz" over a player who has Pause open (from the pause research; the world keeps running).
- A short emote when you close the menu in a new look (a twirl your friends see).
- Moving the name box onto You if players look for it there.

## Design review (designer, 2026-11-10)

Read: DESIGN.md; owner-calls; the decision index and its Controls, Characters/cosmetics and Rewards entries
(decisions.md:78, 84, 156, 175–176, 252, 386, 395–398 and the 9 November cinematic call); game-design/pause.md; the
research tops of [controls-guide-and-pause-menu](../research/controls-guide-and-pause-menu.md) ("Four items: Resume
first"), [cosmetic-rarity](../research/cosmetic-rarity.md) (catalogue, "4–6 voluntary equip decisions/hour", "a pause
wardrobe previews swaps immediately and allows cancellation", "a discoverable hint for an unowned item") and
[ui-patterns](../research/ui-patterns.md) (opaque paper over the dim; "the pause view as a toy … the character could
pose, as Persona's menu does"). Code: pause.ts (focus, `onKey`, `onPad`, `openPause`, the lock-loss opener),
modal.ts, pause.css (dialog, safe areas, phone and short-landscape rules, `.hud-tr`), reward-reveal.ts (the camera
constraint and `me.yaw = cam.yaw + Math.PI`), camera-pull-out.ts, wardrobe/state.ts and view.ts (`swapSlot`,
`nextInSlot`, the pop per swap), curio-shelf.ts `targets()`, knockdown.ts. Playtest data: the owner's iPad sessions of
10 November (`mwa8zhlg`, 27 min, pad 45 / touch 17; `mwa9y7pw`, 20 min).

**Not seen:** the page doesn't exist, so there are no stills of it. I didn't take a still of the reveal's framing on a
phone; the framing finding below comes from the constraint's code (it centres Buddy) and the wireframe's proportions.
No level-design pass: the brief places nothing in the world. Its only world change (step 2, the shelf's prompts) moves
nothing, and the shelf keeps its route role (the bay where missed secrets wait).

**Fit and order** (game-direction check). The owner seeded it, so the scope is approved. It doesn't touch the six-hour
target, the main route or the 1–3 player tuning. It runs beside the Works and Ring Island without blocking them.
Overlaps: the town port (place-retirement) owns curio-shelf.ts, so step 2 rebases on it; and pause.ts is a hotspot.

### Calls

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Pause opens on You; Options is one button (shape A) | New | Owner seed, 10 November. Recommend A, with the shortcuts in 7–8. B needs a new action, a second corner target on a crowded phone and new guide rows; C nests tabs over Controls' tabs and puts them out of thumb reach in portrait |
| 2 | Options holds today's main list otherwise unchanged | Default | Cheapest; nothing moves twice |
| 3 | Roster and Live pill sit on the page Pause opens on (You header), not under Options | Decided | 5 November (decisions.md:156, pause.md "Play HUD moved here"). The brief moved them under Options, contradicting it: finding 2 |
| 4 | Focus starts on Resume with keyboard and mouse, on Hat with pad and touch | Default | Research "Resume first"; only a Resume click relocks (pause.ts:497–499). On a pad and on touch nothing needs relocking |
| 5 | Always open on You; never remember the last page; H still opens Controls | Default | Owner: "by default it should just be your inventory". Remembering would turn the owner's default into the last chore's page |
| 6 | Until you own a wearable, Pause opens on Options | New | Recommended: finding 1. The 3 November call made Pause the only place the controls are listed |
| 7 | Esc on You opens Options; Esc on Options goes back to You | Default | Esc on the main page is dead today (pause.ts:497). "Esc twice for settings" costs nothing |
| 8 | RB on You opens Options (glyph on the button); B on Options returns to You | Default | The owner plays on a pad most (45 pad presses against 17 touch); without this, Options is five d-pad presses from Hat |
| 9 | B on You closes; Menu and Resume close from anywhere | Default | Matches today's B on main (pause.ts:526) |
| 10 | Left and right cycle a slot, applied at once, no confirm, no revert button | New | Recommended. A deliberate departure from cosmetic-rarity's "allows cancellation": only owned items are in the cycle and cycling back is the undo. Partners see the steps in between, which is the fun of it (DESIGN 10) |
| 11 | Cycle order: owned items in catalog order, Nothing at the left end, wrapping both ways | Default | `owned()` is catalog order (state.ts:155) |
| 12 | A or Enter steps to the next item | Default | Brief |
| 13 | Each change is live to partners on the next presence beat | Decided | Owner presence `wardrobe`/`stowaway`; DESIGN 6 ("personal things", shown on your body) |
| 14 | The pop on every change, at once, on your screen | Decided | "Input gets instant feedback" (6 November); view.ts already pops on `swap` |
| 15 | Buddy turns to face the camera and the camera swings in, on foot only | New | Recommended (ui-patterns: "the character could pose, as Persona's menu does"). It's the mirror that makes this a toy rather than a list |
| 16 | No swing when seated (cab cutaway included), swimming, gliding, falling, on a rope, knocked down, as the guest, during a reveal or pull-out, or after an alt-tab until the first change | Default | Finding 4; the 9 November cinematic call |
| 17 | Ease in about 0.4 s; a cut with reduced motion; the reveal's return blend on close; Buddy stays turned until you move | Default | Brief; ui-patterns motion timing |
| 18 | Framing offset: Buddy right half on desktop, left half in phone landscape, top third in portrait | Default | Finding 3 |
| 19 | A lighter dim on You; the rows stay on opaque paper | Default | ui-patterns and the pause research (text on paper holds contrast over a moving scene) |
| 20 | Unowned items as hollow pips, no names or shapes; owned pips first, worn one larger | Default | 2 November "gifts hint at themselves"; cosmetic-rarity's "discoverable hint". Counts motivate (10 of 11 hats are secrets or boxes) and the pips grow honestly as the catalog does |
| 21 | Cycling only; a grid once any slot owns more than about 8 | Default | At today's 11 hats the worst case is 11 presses; most players own 2–5 per slot mid-game. Research target 12 hats, so the grid stays parked until a slot actually crosses 8 |
| 22 | Colour is the fifth row and leaves Room; Room keeps the name box | Default | One home per setting; the phone keyboard never opens on You |
| 23 | Your look only: no carried items, crystals or upgrades on You | Decided | Hotbar cut, one thing in your hands (2 November); upgrades in the world, Pause read-only at most (9 November) |
| 24 | Finding stays in the world: box, card, sheet puff, auto-wear into an empty slot only | Decided | 2 November "gifts hint"; Design Table boxes; cosmetic-rarity "auto-equip only into an empty slot" |
| 25 | The shelf's and bay's four Swap prompts go (step 2); the shelf stays the display | New | Recommended: finding 6. Port-from-Place verdict: display keep, swap prompts cut |
| 26 | The shop keeps Try on, Take it, Wear it, Take it off | Default | Trying on what you don't own is the shop's job; the menu shows only owned items |
| 27 | Cycling a slot in the menu drops a shop try-on in that slot | Default | `swapSlot` already calls `untry()` |
| 28 | The rows redraw when the wardrobe changes while open | Default | A reveal can finish behind the pane (a shared T1 hat) |
| 29 | The "new" dot, its own seen key, step 3 | Default | Brief; the separate key protects the wardrobe save |
| 30 | The seen key is cleared by the same world and room resets as the wardrobe | Default | Otherwise a re-found hat after a reset never gets its dot |
| 31 | Production railway only; Place and builds without a wardrobe keep today's main list | Default | Brief |
| 32 | Pet row reads the stowaway's name or "Nothing" | Default | Same grammar as the other rows; replaces "Out or Away" |
| 33 | Slot labels and "Options" as drafted; catalog `name`s verbatim, no `line`s | Default | Brief; none of it The Boogler's |
| 34 | Mute on You's header; fullscreen under Options | Default | Mute is the one setting people reach for in a hurry |
| 35 | Get unstuck stays in More, one press deeper than today | Default | Rare; a stuck player has time. Revisit if a session shows a search for it |
| 36 | The world doesn't pause: you stand, a seat or moving deck carries you, toys can hit you, partners see you turn | Decided | pause.md "local overlay (the island keeps running)", the pause research; the `away` pose stays parked |
| 37 | Phone: portrait bottom sheet with Resume and Options at the foot; landscape right column; 44 px targets; pips inline in short landscape | Default | Finding 7 |

**Counts:** 37 calls: 6 Decided, 5 New, 26 Default.

### Findings, ranked

1. **(Change before build) A new player's Pause lands on an empty dress-up page.** Before the T1 hat (3–5 minutes in)
   the You page is five rows of "Nothing" and hollow pips, and the controls, which the 3 November call made Pause's
   job, move one press deeper. The first pause is the one most likely to be "how do I…". Open on Options until the
   first wearable is owned; from then on, You (call 6). The owner's default holds for everyone who has something to
   wear, and the first time a player meets the page it has a hat on it.
2. **(Change before build) The brief moves the roster and Live pill under Options**, against the 5 November call that
   put them on Pause's first page on every platform. Keep a compact row of them in the You header (call 3).
3. **(Change before build) The reveal's camera centres Buddy**, and the wireframes need him off-centre. In portrait
   the sheet's top is about half the screen's height, so a centred Buddy sits on its edge. On desktop and in
   landscape the panel covers one side. The shared face-camera helper needs a screen-space offset per layout (call 18),
   and Done-means checks the portrait still.
4. **(Change before build) When to swing.** "On foot" alone isn't enough. A shared camera pull-out can start while
   your menu is open (the 9 November call makes it uninterruptible), and a reveal can finish behind it. Both push a
   constraint onto the same `camConstraints`, so two lerps would fight. Alt-tab also opens Pause through lock loss,
   which on You would swing your camera every time you come back to the window. Rule: the swing yields to any
   reveal or pull-out, waits for the first change after a blur-caused open, and skips knockdown, ropes and the guest
   (call 16). Seated covers the cab cutaway (`inputState.seated`).
5. **(Change before build) "One press away" is five presses on a pad.** The owner's sessions are mostly pad on
   iPad. RB from You and Esc on a keyboard go to Options (calls 7–8). That answers "maybe that's harder on mobile"
   without B's second button. The cost of the extra step for someone pausing to change volume or Leave is one press,
   or one Esc, which is acceptable: those are once or twice a session (2–3 pause presses per owner session on
   10 November).
6. **The shelf's swap prompts weaken the seed and clutter the town.** The owner said "instead of having to change at
   a wardrobe or the curio shelf". In `mwa9y7pw` the shelf's Swap prompts showed seven times and were never pressed
   ("Swap outfit: Take it off … kept showing, never pressed"). In `mwa8zhlg` he pressed a shelf swap 14 times, but
   through a forward-only cycle that passes "Take it off" on the way: the menu does that job better. The shelf doesn't
   lose its reason to be visited. It's still where your collection stands, its sheets puff off at a reveal, its crystal
   row lights, and missed secrets wait at the bay. Cut the four prompts as step 2 (call 25), and keep the shop's,
   which sell things rather than swap them. The unlock moment is untouched: nothing in the menu grants, reveals or
   previews an unowned item.
7. **Short landscape doesn't fit pip rows.** 844×390 minus the safe areas leaves about 350 px. Five rows plus the
   Resume/Options row at 44 px, with gaps and padding, is about 330 px before any pip row under them. Put the pips
   inside the row under the value (call 37). Portrait fits as drawn (about 400 px of sheet under a 420 px Buddy
   half). The top-right menu button sits under the modal while Pause is open, so it doesn't collide with either
   layout; the landscape column starts where your right thumb just tapped it.
8. **Research departure, logged rather than fixed.** cosmetic-rarity says a pause wardrobe "previews swaps
   immediately and allows cancellation". The brief applies at once with no cancel. That's right here, because the
   cycle holds only what you own and cycling back is the undo, but it's a choice (call 10). The same doc's "source
   stamp and discoverable hint for an unowned item" is lighter here (pips only), which is fine at 25 items. Revisit
   with the grid.
9. **The pet row's copy was undecided** ("Out" or "Away"). Use the stowaway's own name or "Nothing", like every
   other row (call 32).
10. **Missed as design, parked rather than added:** a twirl your friends see when you close in a new look (already
    parked), and the co-op moment of two friends dressing side by side, which the swing already gives you (each
    faces their own camera). No change.

### The smallest first build I'd clear

Step 1 as now written in Shape: the You page with four slot rows and colour, two-way `cycleSlot`, instant apply, the
pips, the roster in its header, Options as a button plus the RB and Esc shortcuts, opening on Options until the first
wearable, and the swing with its conditions and per-layout framing. Step 2 cuts the shelf's swap prompts. Step 3 adds
the "new" dot. Each step ships alone. No wire, op, save-shape or `WORLD_NS` change in any of them.

### Owner questions

1. **The menu's shape?** (a) A: Pause opens on You, Options one button, with RB and Esc as shortcuts to it.
   (b) B: a second way in (D-pad up and a second corner button). (c) C: You and Options as tabs across the top.
   **Recommended: a.**
2. **What does a new player see first, before owning anything?** (a) Options, until the first wearable; You from
   then on. (b) You always, even empty. (c) Whichever page you used last. **Recommended: a.**
3. **The curio shelf once the menu dresses you?** (a) Keep its four Swap prompts as a second way. (b) Remove them;
   the shelf stays the display, the sheets and the bay. (c) Replace them with one prompt that opens the You page.
   **Recommended: b.**
4. **What shows for items you don't own?** (a) Hollow pips only, counting them. (b) Nothing; only what you own.
   (c) Silhouettes or names. **Recommended: a.**
5. **The camera when Pause opens?** (a) Buddy turns and the camera swings on open, on foot only, holding off for
   cinematics and after an alt-tab. (b) Swing only on your first change. (c) Never swing; dress from behind.
   **Recommended: a.**
