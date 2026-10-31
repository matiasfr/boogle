# 5. Controls

The registry in [src/player/controls.js](../../src/player/controls.js) is the source of truth: `registerAction` binds a pad
slot, handlers, its keyboard codes (`key`, one shared listener that skips repeats, Ctrl/Cmd/Alt and text fields) and,
with `touch: { label, className }`, builds its own touch button; `describeControl` adds display-only rows; `onKey`
binds a key with no pad action of its own (hotbar digits). Held keys (move, sprint, Space) and E and R are still read by hand in [src/player/input.js](../../src/player/input.js). The pause view's controls page and the first-run card are generated
from it ([src/player/guide.js](../../src/player/guide.js)), and [src/features/controls-check.js](../../src/features/controls-check.js) warns
in dev about gaps. Registrations live in [src/player/input.js](../../src/player/input.js), [feel.js](../../src/features/feel.js),
[hotbar.js](../../src/features/hotbar.js), [bump.js](../../src/features/bump.js), [honk.js](../../src/features/honk.js),
[ping.js](../../src/features/ping.js), [pause.js](../../src/features/pause.js), [dino.js](../../src/features/dino.js) and [updates.js](../../src/features/updates.js).

| Control (id) | Kind | Keyboard / mouse | Pad | Touch | Group | Context |
|---|---|---|---|---|---|---|
| Move (`move`) | described | WASD, arrows | Left stick | Drag on the left | Getting around | |
| Jump, or swim up (`jump`) | action | Space | A | Jump | Getting around | |
| Sprint (`sprint`) | action | Left Shift | L3 (latches) | none | Getting around | |
| Look around (`look`) | described | Mouse | Right stick | Drag on the right | Camera | |
| Camera distance (`zoom`) | action | none | R3 (4 / 6.5 / 10 m) | none | Camera | |
| Bring the ball back (`respawn`) | action | R | View | none | The ball | |
| Bump the ball up (`bump`) | action | V | RT | Bump | The ball | |
| Talk, pick up, take, shake a palm (`interact`) | action | E | B | Grab (the main button; its label follows the target) | Hands | |
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
- The talk box is not a modal ([src/boogler/dialogue.js](../../src/boogler/dialogue.js)): the game keeps playing, and it
  takes only the keys and pad buttons it answers with. Number keys 1-9 answer (not the hotbar while it is open), Enter
  skips the typing, E or Esc walks away (Esc with the pointer locked just ends the lock, which also ends the talk); the
  move keys, mouse look and Space still work. On the pad (`setPadGrab` in
  [src/player/controls.js](../../src/player/controls.js)), D-pad ↑ ↓ picks, A or X skips the typing then answers, Y pets,
  B walks away; the sticks and other buttons keep playing. The pause view is still a modal
  ([src/player/modal.js](../../src/player/modal.js)), and opening it ends a talk.
- While a pad is in use the touch overlay hides and the reticle shows; the next touch brings the touch controls back
  ([src/features/gamepad.js](../../src/features/gamepad.js)). Analog triggers count as pressed at 0.4.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
