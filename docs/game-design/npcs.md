# 6.16 Talking to NPCs

Every NPC talk shares one input layer, [src/player/conversation.ts](../../src/player/conversation.ts), so a talk
works the same on a pad, a keyboard and a touch screen, and the next NPC gets it for free. The Boogler
([boogler.md](boogler.md)) is the first user. Serves DESIGN.md 7 (telegraph everything: the box always shows which
button does what) and 8 (designed for drop-in). Local: no sim or network state.

## Controls in a talk

| | Pad | Keyboard | Touch |
|---|---|---|---|
| Open | X / □ / Y (the interact button) | E | the main button (it says Talk) |
| Skip the typing | A / ✕ (or X) | E, Space, Enter | tap the box |
| Pick an answer | D-pad ↑ ↓ or the left stick (repeats while held) | ↑ ↓ or W S; 1-9 answer at once | tap it |
| Say the picked answer | A / ✕ (or X) | E, Space, Enter | (the tap) |
| Leave | B / ○ | Esc (with the mouse locked, Esc ends the lock, which also leaves) | the close button |

- A Switch pad swaps confirm and back (its A is on the right): `menuSlot` in
  [src/player/controls.ts](../../src/player/controls.ts), shared with the pause view and the other menus.
- The first answer is selected when the answers appear (a sun-yellow fill with an outline; not drawn on touch).
  Skipping the typing never also answers.
- A hint row on the box shows the buttons for the input in use, named for the pad's brand: "A Say, ↑↓ Pick, B
  Leave" (✕ / ○ on a PlayStation pad), "E Say, ↑↓ Pick, Esc Leave" on a keyboard, nothing on touch. While the line
  types, Say reads Skip.
- **You stand still.** Move and jump are held for the whole talk (`inputState.held`); looking around still works.
  In the first 1.4 s the camera eases round to face the NPC (a little to one side, so you share the shot) and you turn
  to face them; while the box covers the middle of the screen the view tilts down so you both sit above it.
- H still opens the pause view, which ends the talk. The prompt over things hides while a talk is open.

## Adding an NPC

1. Give it an interactable (`registerInteractable` in [src/player/hands.ts](../../src/player/hands.ts)) whose `run`
   opens your talk box: that puts "Talk" on the interact button for every input.
2. Build the box, then `openConversation(talk)` when it opens and `closeConversation()` however it ends:

   ```ts
   openConversation({
     box, // the card element: a tap on no button skips the typing
     typing: () => typing, // is the line still typing out?
     skip, // show the whole line now
     choices: () => [...box.querySelectorAll('button.answer')], // [] while typing; saying one clicks it
     close: leave, // back was pressed: end the talk your way (and call closeConversation)
     extra: { y: pet }, // optional: more pad buttons the box answers
     focus: () => npc.center, // optional: where the camera turns to
     hints, // optional element for the hint row (class talk-hints for the default look)
   });
   ```

   It returns false while another talk or a modal (the pause view) is open: do not show your box then.
3. Answer buttons are plain `<button>`s that answer on `click`; the layer adds the `talk-sel` class to the selected
   one (restyle it if you like). The talk-answer row of the controls guide already covers every NPC.

Reference: [src/boogler/dialogue.ts](../../src/boogler/dialogue.ts) (box, typing, portrait, pet) and
[src/boogler/play.ts](../../src/boogler/play.ts) (when a talk opens and ends).
