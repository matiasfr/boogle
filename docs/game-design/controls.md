# 5. Controls

The registry in [src/player/controls.ts](../../src/player/controls.ts) is the source of truth: `registerAction` binds a pad
slot, handlers, its keyboard codes (`key`, one shared listener that skips repeats, Ctrl/Cmd/Alt and text fields) and,
with `touch: { label, className }`, builds its own touch button; `describeControl` adds display-only rows; `onKey`
binds a key with no pad action of its own (hotbar digits). Held keys (move, sprint, Space) and E and R are still read by hand in [src/player/input.ts](../../src/player/input.ts). The pause view's controls page and the first-run card are generated
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
| Talk, pick up, take (`interact`) | action | E | B | Grab (the main button; its label follows the target) | Hands | |
| Use what you hold (`use`) | action | Left click | X | main button when it has no target | Hands | |
| Hold from your hotbar (`hotbar`) | described | 1-5 (same key again: empty hands) | LB / RB (`slot-prev`, `slot-next`, hidden actions) | Tap a slot | Hands | |
| Throw what you hold (`toss`) | described | (use) | X | Toss | Hands | holding |
| Crouch, ground pound (`guest-crouch`) | action | Left Shift (read by hand) | LT | none | Getting around | as the guest |
| Punch, kick, dive (`guest-punch`) | described | Left click (the `use` action, wrapped) | X | Grab, when nothing is in reach | Getting around | as the guest |
| Answer The Boogler (`boogler-answer`) | described | 1-8 (E or Esc walks away) | D-pad ↑ ↓, A (B walks away) | Tap an answer | Friends | talking |
| Honk (`honk`) | action | T | Y | Honk | Friends | |
| Ping where you look (`ping`) | action | G, middle click | D-pad ← | Ping | Friends | |
| Menu and controls (`pause`) | action | Esc, H (opens on Controls) | Menu | corner menu button | Menu | |
| Reload for the new version (`update-reload`) | action, hidden | (toast button) | first free slot, only while the update toast shows | toast button | none | |

Notes:

- **Free pad slots** (`grep -rn "pad: '" src`): D-pad ↑, ↓ and →. The update toast borrows the first free one
  (D-pad ↓) while it is up, so AGENTS.md requires at least one to stay unclaimed.
- Touch buttons for Bump, Honk and Ping are built by the registry; Jump and the main button are in `index.html`;
  Toss is built by the hotbar feature.
- **Seated in a vehicle** (`setSeated` in [src/player/input.ts](../../src/player/input.ts); the soapbox): ← → only
  steer (no arrow-key camera turn), a two-finger scroll does not look, and `body.seated` shows the driving touch layout:
  Jump takes the vehicle's label, and Bump, Toss, Honk and Ping hide.
- The talk box is not a modal ([src/boogler/dialogue.ts](../../src/boogler/dialogue.ts)): the game keeps playing, and it
  takes only the keys and pad buttons it answers with. Number keys 1-9 answer (not the hotbar while it is open), Enter
  skips the typing, E or Esc walks away (Esc with the pointer locked just ends the lock, which also ends the talk); the
  move keys, mouse look and Space still work. On the pad (`setPadGrab` in
  [src/player/controls.ts](../../src/player/controls.ts)), D-pad ↑ ↓ picks, A or X skips the typing then answers, Y pets,
  B walks away; the sticks and other buttons keep playing. The pause view is still a modal
  ([src/player/modal.ts](../../src/player/modal.ts)), and opening it ends a talk.
- While a pad is in use the touch overlay hides and the reticle shows; the next touch brings the touch controls back
  ([src/features/gamepad.ts](../../src/features/gamepad.ts)). Analog triggers count as pressed at 0.4.
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
