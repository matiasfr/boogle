# 5. Controls

The registry in [src/player/controls.ts](../../src/player/controls.ts) is the source of truth: `registerAction` binds a pad
slot, handlers, its keyboard codes (`key`, one shared listener that skips repeats, Ctrl/Cmd/Alt and text fields) and,
with `touch: { label, className }`, builds its own touch button; `describeControl` adds display-only rows; `onKey`
binds a key with no pad action of its own. Held keys (move, sprint, Space) and E and R are still read by hand in [src/player/input.ts](../../src/player/input.ts). The pause view's controls page (its Gamepad tab as a drawn controller) is generated
from it ([src/player/guide.ts](../../src/player/guide.ts)), and [src/features/controls-check.ts](../../src/features/controls-check.ts) warns
in dev about gaps. Registrations live in [src/player/input.ts](../../src/player/input.ts), [feel.ts](../../src/features/feel.ts),
[held.ts](../../src/features/held.ts), [honk.ts](../../src/features/honk.ts),
[ping.ts](../../src/features/ping.ts), [pause.ts](../../src/features/pause.ts), [dino.ts](../../src/features/dino.ts),
and [updates.ts](../../src/features/updates.ts).

| Control (id)                                 | Kind           | Keyboard / mouse                                       | Pad                                                                      | Touch                                                      | Group          | Context      |
| -------------------------------------------- | -------------- | ------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------------- | -------------- | ------------ |
| Move (`move`)                                | described      | WASD, ↑ ↓ (← → too while the mouse is locked)          | Left stick                                                               | Drag on the left                                           | Getting around |              |
| Jump, or swim up (`jump`)                    | action         | Space                                                  | A                                                                        | Jump                                                       | Getting around |              |
| Hook shot, at a ring (`hook`) | action, after finding hook | F | RB | Hook | Getting around | |
| Open or close the glider, in the air (`glide`) | action, after the room has the glider | Q; Jump in the air once no air jump is left | LB | Glide | Getting around | |
| Sprint (`sprint`)                            | action         | Left Shift                                             | L3 (latches)                                                             | Push the stick far                                         | Getting around |              |
| Look around (`look`)                         | described      | Mouse; unlocked: drag, two-finger scroll, ← →          | Right stick                                                              | Drag on the right                                          | Camera         |              |
| Bring the ball back (`respawn`)              | action         | R                                                      | View                                                                     | none                                                       | The ball       |              |
| Talk, pick up, take (`interact`)             | action         | E                                                      | X                                                                        | Grab (the main button; its label follows what it would do) | Hands          |              |
| Use what you hold (`use`)                    | action         | Left click                                             | RT                                                                       | the main button: Throw or Sprout when it has no target     | Hands          |              |
| Throw what you hold (`toss`)                 | described      | (use)                                                  | RT                                                                       | Toss                                                       | Hands          | holding      |
| Crouch, ground pound (`guest-crouch`)        | action         | Left Shift (read by hand)                              | LT                                                                       | none                                                       | Getting around | as the guest |
| Punch, kick, dive (`guest-punch`)            | described      | Left click (the `use` action's empty hands)            | RT                                                                       | Grab, when nothing is in reach                             | Getting around | as the guest |
| Answer in a talk (`talk-answer`)             | described      | 1-8, ↑ ↓ (E, Space, Enter: next or say it; Esc leaves) | D-pad ↑ ↓ or left stick, A: next or say it (B leaves; X does nothing)    | Tap an answer                                              | Friends        | talking      |
| Honk (`honk`)                                | action         | T                                                      | Y                                                                        | Honk                                                       | Friends        |              |
| Ping where you look (`ping`)                 | action         | G, middle click                                        | D-pad ←                                                                  | Ping                                                       | Friends        |              |
| Menu and controls (`pause`)                  | action         | Esc, H (opens on Controls)                             | Menu                                                                     | corner menu button                                         | Menu           |              |
| Back (`back`)                                | action         | (Esc, in each menu and talk)                           | B: closes talks and menus, leaves a text box, puts a wound-up throw away | close buttons                                              | Menu           |              |
| Reload for the new version (`update-reload`) | action, hidden | (notice button)                                        | first free slot, only while the update notice shows                      | notice button                                              | none           |              |

Notes:

- **Great trunk availability (owner update, 5 November):** both Chop and shoulder prompts appear only while the active frame needs its beam at Station 3. Earlier strokes are refused. Already-felled old saves stay valid, and Drop still frees an early-held trunk. Ground cargo that later becomes unreachable returns to its pickup spot.
- Conversations capture all four D-pad directions (and arrow keys); left/right move across answers without firing Ping or Flag. All four grabbed directions repeat while held.

- **Place chopping:** E and X/Square first choose an ordinary interaction, including a blocked one. With no ordinary target and empty hands, they chop/break the nearest harvest target. RT/left click still harvest directly. Touch uses the same priority, so its label and the floating prompt describe the action that will run; one press cannot interact and chop together. The Place `Chop` guide row lists E/left click, X/RT and touch Chop using existing labels.
- **Place Ping and Drop:** Ping remains G/middle click/D-pad left; Drop remains right click/R3. Fresh play shows both separate touch buttons beside each other, with Drop visible while carrying a load, including the great beam or boiler. Drop puts big cargo on reachable dry ground in front of you; either player can use its existing shoulder interaction to reclaim it. Unsafe ground returns it to its pickup spot, and dropping a helped beam releases the helper. Ordinary back piles keep their existing behavior. Ping remains available with an empty back. D-pad up remains free for the update notice.
- **Place Ping and Drop:** Ping remains G/middle click/D-pad left; Drop remains right click/R3. Fresh play shows both separate touch buttons beside each other, with Drop visible while carrying a load. Ping remains available with an empty back. D-pad up remains free for the update notice.
  Ping hits actual scenery within 90 m, including Place outside the classic island grid; a miss marks 30 m along the view without clamping to that grid. The cosmetic message validator accepts these world coordinates; older tabs may ignore pings outside their smaller envelope.
- **Playtest Flag** (the live game, `src/features/playtest-flag.ts`): M / D-pad right records a `flag` playData mark with time, position, activity, back contents (logs, rails, stone and a footing, from the railway's read) and the ridden platform. A soft UI tick is the only acknowledgement; no prompt or typed note. The generated pause controls guide lists Flag under Menu, for every player, playtester or not (a default; on the owner's small-calls list). Touch omits it: the action area already holds Jump, the main action, Drop and Ping. F remains Hook; D-pad up remains free for updates.

- **Dev free camera:** after explicitly enabling Dev, Free cam owns movement and interaction until Return, even with the dock collapsed. WASD flies, Space rises, Shift lowers, and dragging the scene looks. Touch has held Forward/Back/Left/Right/Up/Down buttons outside the dock; pad sticks fly/look, LB lowers, RB rises, and B returns. Speed is adjustable. Dock inputs retain their normal text/slider behavior. Tapping the scene releases dock focus, including after Return on touch. Blur clears held camera input. The camera never moves the avatar; other players still see its ordinary physical position. Camera bookmarks and speed persist locally, but active camera/input ownership does not.

- **Gamepad diagram** ([src/player/pad-diagram.ts](../../src/player/pad-diagram.ts), 2026-11-01): the pause view's
  Gamepad tab draws a generic controller (two sticks, D-pad, four face buttons, bumpers, triggers, View / Menu, stick
  clicks) between two columns of callouts, one per slot and stick, each with a leader line to its button. The callouts
  come from the registry (`listControls`, plus hidden actions), so a rebound action moves its callout. A slot nobody claims is dimmed and reads Free (today
  LB, RB, R3, D-pad ↑, ↓ and →). Glyphs and the drawn face buttons follow the pad's brand: Xbox letters, PlayStation shapes, Switch
  letters; with no pad yet the face buttons are a diamond of four dots with the meant one filled. Situations sit
  above it as chips (LB / RB cycle them on the pad): On foot; Driving when a `driving` row exists (the soapbox,
  `?proto=soapbox`); Talking (A or X says the picked answer, A also skips the typing, B leaves, the D-pad and left
  stick pick; confirm and back swap on a Switch pad). A situation's own buttons get a sun label and a sea line; the
  rest keep their on-foot callout, since they still work there. Another context (`as the guest`) shows on foot only
  on a slot nothing else uses, with the context in brackets. Keyboard and touch players see the diagram on the Gamepad
  tab; Show as a list gives the generated list back. Under 700 px wide the callouts stack under the controller.

- **Face buttons** (2026-11-02, owner's iPad + controller playtest; research in
  [cross-device-input.md](../research/cross-device-input.md), section 8): A jumps and confirms, **X / □ acts on what's
  in front of you** (Talk, Pick up, Take, Get in), **B / ○ is back** everywhere, Y honks. **RT and the left click are one
  main action** (2026-11-02): holding something it uses or throws it, hold to charge; with empty hands it does nothing (the ball bump, a volleyball dig, was cut the same day).
  To grab the ball, talk or pick something up, it's E / X. Touch has one
  button for both, so its label says what it would do: a target in reach (Talk, Pick up, Grab, a ball resting or in the air) wins; then Throw or Sprout for what you hold. Slots are positions in the standard mapping; prompts name them for the
  pad's brand (`body[data-pad]`, set from `Gamepad.id` in [src/features/gamepad.ts](../../src/features/gamepad.ts)):
  Xbox letters, PlayStation shapes (✕ ○ □ △, L1, R2, Options), Switch letters (B A Y X by position, ZL, ZR, +, −). On
  a Switch pad confirm and back swap places in menus and talks (`menuSlot`), Nintendo's own convention.
- **Free pad slots** (`npm run registry -- --json`): D-pad ↑ and D-pad ↓. Production Hook owns RB after acquisition, Glide owns LB once the room has the glider (Jump while it's open does nothing); Drop owns R3; Flag owns D-pad →.
  Place uses LB, RB and R3 for its moves, and D-pad → for its own Flag. Claims in `src/proto/` don't count as taken
  and can't clash with the game's in the registry. The update notice borrows D-pad ↑ while it is up (or the first free
  slot if that is ever taken), so AGENTS.md requires at least one to stay unclaimed.
- Touch buttons for Honk and Ping are built by the registry; Jump and the main button are in `index.html`;
  Toss is built by [held.ts](../../src/features/held.ts).
- There is no Dive action, C binding, touch button or guide row. On Place and crossing, high falls plunge and resurface
  automatically; ordinary entries stay at the surface ([player swimming](player.md#swim)).
- **Seated in a vehicle** (`setSeated` in [src/player/input.ts](../../src/player/input.ts); the soapbox): ← → only
  steer (no arrow-key camera turn), a two-finger scroll does not look, and `body.seated` shows the driving touch layout:
  Jump takes the vehicle's label, and Toss, Honk and Ping hide.
- Talk boxes are not modals: they share the NPC talk input ([npcs.md](npcs.md),
  [src/player/conversation.ts](../../src/player/conversation.ts)). The island keeps running and you can look around,
  but you stand still; it takes the keys it answers with (E, Space, Enter, Esc, ↑ ↓, W S, 1-9) and, on the pad
  (`setPadGrab(fn, slots, { stick: true })` in [src/player/controls.ts](../../src/player/controls.ts)), A, B, X (so
  interact does nothing mid-talk), the D-pad ↑ ↓ and the left stick, picking with repeat while held. The other buttons
  keep their actions (Y still honks). The pause view is still a modal ([src/player/modal.ts](../../src/player/modal.ts)), and opening it ends a talk.
- With a pad, B (back) also leaves a focused text field without doing anything else.
- While a pad is in use the touch overlay hides and the reticle shows; the next touch brings the touch controls back,
  and a key press (outside a text field, and not while a pad button is held) or a mouse click brings keyboard and mouse
  back: prompts, the pause view's first tab and the pointer lock follow. The next pad press or stick push returns to
  the pad ([src/features/gamepad.ts](../../src/features/gamepad.ts)). Analog triggers count as pressed at 0.4. On an iPad
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
  (Safari on iPad has no Pointer Lock: click-drag or two-finger scroll) and
  the keyboard guide. HUD buttons sit above the touch overlay in both modes.
  On a touch device, look guidance appears only while touch is active; keyboard, trackpad and pad input hide it.
  Returning to touch brings it back until the first touch look drag, which retires it for the visit.
- **Touch sprint** (2026-11-02; [cross-device-input.md](../research/cross-device-input.md), rec 9): the stick is one
  control for walk and sprint. A push to 90% of its travel (45 px on a phone, 54 px on a tablet) sprints, and it holds
  until the push falls under 80%, so a thumb at the edge doesn't flicker it. Below that the stick walks, in proportion
  to the push. While it sprints the ring lights up in sun yellow. No button, so the screen stays clear. It writes the
  same `input.sprint` as the pad, so it does whatever sprint does elsewhere, on a moving deck too; seated in a vehicle
  (the stick steers) and in a talk (you stand still) it doesn't sprint or light up.
- On tablets (both sides at least 700 CSS px) the touch buttons are 1.45 times their phone size (about 110 px on the
  11-inch iPad), 1.6 times on the 13-inch (about 122 px, XAG's 24 mm), and the stick ring grows with its travel
  ([src/player/touch.css](../../src/player/touch.css)).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
