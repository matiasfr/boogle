# 5. Controls

The registry in [src/player/controls.ts](../../src/player/controls.ts) is the source of truth: `registerAction` binds a pad
slot, handlers, its keyboard codes (`key`, one shared listener that skips repeats, Ctrl/Cmd/Alt and text fields) and,
with `touch: { label, className }`, builds its own touch button; `describeControl` adds display-only rows; `onKey`
binds a key with no pad action of its own (hotbar digits). Held keys (move, sprint, Space) and E and R are still read by hand in [src/player/input.ts](../../src/player/input.ts). The pause view's controls page (its Gamepad tab as a drawn controller) and the first-run card are generated
from it ([src/player/guide.ts](../../src/player/guide.ts)), and [src/features/controls-check.ts](../../src/features/controls-check.ts) warns
in dev about gaps. Registrations live in [src/player/input.ts](../../src/player/input.ts), [feel.js](../../src/features/feel.ts),
[hotbar.js](../../src/features/hotbar.ts), [bump.js](../../src/features/bump.ts), [honk.js](../../src/features/honk.ts),
[ping.js](../../src/features/ping.ts), [pause.js](../../src/features/pause.ts), [dino.js](../../src/features/dino.ts) and [updates.js](../../src/features/updates.ts).

| Control (id) | Kind | Keyboard / mouse | Pad | Touch | Group | Context |
|---|---|---|---|---|---|---|
| Move (`move`) | described | WASD, ↑ ↓ (← → too while the mouse is locked) | Left stick | Drag on the left | Getting around | |
| Jump, or swim up (`jump`) | action | Space | A | Jump | Getting around | |
| Sprint (`sprint`) | action | Left Shift | L3 (latches) | none | Getting around | |
| Look around (`look`) | described | Mouse; unlocked: drag, two-finger scroll, ← → | Right stick | Drag on the right | Camera | |
| Camera distance (`zoom`) | action | none | R3 (4 / 6.5 / 10 m) | none | Camera | |
| Bring the ball back (`respawn`) | action | R | View | none | The ball | |
| Bump the ball up (`bump`) | action | V | RT | Bump | The ball | |
| Talk, pick up, take (`interact`) | action | E | X (nothing in reach: uses what you hold, like the touch main button) | Grab (the main button; its label follows the target) | Hands | |
| Use what you hold (`use`) | action | Left click | D-pad → (even with something in reach) | main button when it has no target | Hands | |
| Hold from your hotbar (`hotbar`) | described | 1-5 (same key again: empty hands) | LB / RB (`slot-prev`, `slot-next`, hidden actions) | Tap a slot | Hands | |
| Throw what you hold (`toss`) | described | (use) | D-pad → | Toss | Hands | holding |
| Crouch, ground pound (`guest-crouch`) | action | Left Shift (read by hand) | LT | none | Getting around | as the guest |
| Punch, kick, dive (`guest-punch`) | described | Left click (the `use` action, wrapped) | X | Grab, when nothing is in reach | Getting around | as the guest |
| Answer in a talk (`talk-answer`) | described | 1-8, ↑ ↓ (E, Space, Enter: next or say it; Esc leaves) | D-pad ↑ ↓ or left stick, A: next or say it (B leaves; X does nothing) | Tap an answer | Friends | talking |
| Honk (`honk`) | action | T | Y | Honk | Friends | |
| Ping where you look (`ping`) | action | G, middle click | D-pad ← | Ping | Friends | |
| Menu and controls (`pause`) | action | Esc, H (opens on Controls) | Menu | corner menu button | Menu | |
| Prototype bar (`proto-bar`) | action, prototype pages only | P (then arrows, Enter, [ ] for previous / next toy, Esc) | D-pad ↓ (then D-pad between buttons, A presses, LB / RB previous / next toy, B closes) | tap the bar | Menu | `?proto=` and `?play` pages |
| Back (`back`) | action | (Esc, in each menu and talk) | B: closes talks and menus, leaves a text box, puts a wound-up throw away | close buttons | Menu | |
| Reload for the new version (`update-reload`) | action, hidden | (notice button) | first free slot, only while the update notice shows | notice button | none | |

Notes:

- **Gamepad diagram** ([src/player/pad-diagram.ts](../../src/player/pad-diagram.ts), 2026-11-01): the pause view's
  Gamepad tab draws a generic controller (two sticks, D-pad, four face buttons, bumpers, triggers, View / Menu, stick
  clicks) between two columns of callouts, one per slot and stick, each with a leader line to its button. The callouts
  come from the registry (`listControls`, plus hidden actions such as `slot-prev` / `slot-next` as the detail of the
  shared hotbar row), so a rebound action moves its callout. A slot nobody claims is dimmed and reads Free (today
  D-pad ↑ and ↓). Glyphs and the drawn face buttons follow the pad's brand: Xbox letters, PlayStation shapes, Switch
  letters; with no pad yet the face buttons are a diamond of four dots with the meant one filled. Situations sit
  above it as chips (LB / RB cycle them on the pad): On foot; Driving when a `driving` row exists (the soapbox,
  `?proto=soapbox`); Talking (A or X says the picked answer, A also skips the typing, B leaves, the D-pad and left
  stick pick; confirm and back swap on a Switch pad). A situation's own buttons get a sun label and a sea line; the
  rest keep their on-foot callout, since they still work there. Another context (`as the guest`) shows on foot only
  on a slot nothing else uses, with the context in brackets. Keyboard and touch players see the diagram on the Gamepad
  tab; Show as a list gives the generated list back. Under 700 px wide the callouts stack under the controller.

- **Face buttons** (2026-11-02, owner's iPad + controller playtest; research in
  [cross-device-input.md](../research/cross-device-input.md), section 8): A jumps and confirms, **X / □ is the one
  hands button** (Talk, Pick up, Take, Get in; with nothing in reach it uses what you hold, as the touch main button
  does), **B / ○ is back** everywhere, Y honks. Slots are positions in the standard mapping; prompts name them for the
  pad's brand (`body[data-pad]`, set from `Gamepad.id` in [src/features/gamepad.ts](../../src/features/gamepad.ts)):
  Xbox letters, PlayStation shapes (✕ ○ □ △, L1, R2, Options), Switch letters (B A Y X by position, ZL, ZR, +, −). On
  a Switch pad confirm and back swap places in menus and talks (`menuSlot`), Nintendo's own convention.
- **Free pad slots** (`npm run registry -- --json`): D-pad ↑ (D-pad ↓ opens the prototype bar, registered only on
  prototype pages, src/proto/bar/pad.ts). The update notice borrows the first free one (D-pad ↑) while it is up, so
  AGENTS.md requires at least one to stay unclaimed.
- Touch buttons for Bump, Honk and Ping are built by the registry; Jump and the main button are in `index.html`;
  Toss is built by the hotbar feature.
- **Seated in a vehicle** (`setSeated` in [src/player/input.ts](../../src/player/input.ts); the soapbox): ← → only
  steer (no arrow-key camera turn), a two-finger scroll does not look, and `body.seated` shows the driving touch layout:
  Jump takes the vehicle's label, and Bump, Toss, Honk and Ping hide.
- Talk boxes are not modals: they share the NPC talk input ([npcs.md](npcs.md),
  [src/player/conversation.ts](../../src/player/conversation.ts)). The island keeps running and you can look around,
  but you stand still; it takes the keys it answers with (E, Space, Enter, Esc, ↑ ↓, W S, 1-9) and, on the pad
  (`setPadGrab(fn, slots, { stick: true })` in [src/player/controls.ts](../../src/player/controls.ts)), A, B, X (so
  interact does nothing mid-talk), the D-pad ↑ ↓ and the left stick, picking with repeat while held. The other buttons
  keep their actions (Y still honks). The pause view is still a modal ([src/player/modal.ts](../../src/player/modal.ts)), and opening it ends a talk.
- With a pad, B (back) also leaves a focused text field (the prototype bar's note) without doing anything else.
- While a pad is in use the touch overlay hides and the reticle shows; the next touch brings the touch controls back
  ([src/features/gamepad.ts](../../src/features/gamepad.ts)). Analog triggers count as pressed at 0.4. On an iPad
  `body.touch` stays on while the pad plays, so pad-only styles key on `body.gamepad`. A pad without the standard
  mapping that reports its D-pad as axes works like D-pad buttons 12-15: a hat axis (the one resting past ±1;
  SDL_GameControllerDB lists MFi pads, Backbone included, with a hat D-pad), or else a pair on axes 6 and 7.
- Finding the pad: with none known the game does no per-frame pad work; it asks the browser for pads on
  `gamepadconnected`, on any tap, click or key, when the page comes back (visible, focused, shown) and once after load,
  so a pad connected before the page opened is found too (browsers show a pad only after one of its buttons is pressed
  in the page). Once a pad is known it is read once a frame; when it disconnects the game goes back to waiting. With
  several pads it follows a standard-layout one, the one used last. In the Home Screen app the lobby card says
  "Playing with a controller? Press any button on it." until a pad is known.
- Touch mode (the stick and buttons overlay, no reticle or pointer lock) follows the input in use, not the device: a
  touch screen starts in it, a key press (outside a text field) or a mouse or trackpad click switches to keyboard and
  mouse, and so does a wheel or two-finger scroll; the next finger switches back
  ([src/player/input.ts](../../src/player/input.ts)). Hovering never switches. A trackpad click on the touch overlay
  never starts the stick or a touch look. So an iPad with a Magic Keyboard plays with the keyboard, trackpad look
  (Safari on iPad has no Pointer Lock: click-drag or two-finger scroll, and the hint says so until you have looked) and
  the keyboard guide. HUD buttons sit above the touch overlay in both modes.
- On tablets (both sides at least 700 CSS px) the touch buttons are 1.45 times their phone size (about 110 px on the
  11-inch iPad), 1.6 times on the 13-inch (about 122 px, XAG's 24 mm), and the stick ring grows with its travel
  ([src/player/touch.css](../../src/player/touch.css)).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
