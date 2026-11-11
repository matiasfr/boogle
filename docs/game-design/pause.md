# 6.13 Pause view and controls guide

- **What.** A local overlay (the island keeps running) with Resume, Controls (the generated guide with Keyboard,
  Gamepad and Touch tabs, starting on your input kind; the Gamepad tab is a drawn controller with labelled callouts,
  see [controls.md](controls.md), with Show as a list for the old list), Room (who is here and an invite link; `?room=` is left out for
  the default room), a mute button and volume slider for every sound in the game (remembered in this browser; left and
  right move it on a pad), Fullscreen (toggles the whole page, so the HUD stays; it reads Exit fullscreen while on, and is
  hidden where the page can't go fullscreen, such as iPhone Safari or a frame without it, and in the installed app,
  which is already fullscreen; a gamepad press is refused by the browser, so the button asks for a click or tap; on
  iPad the first press explains that Safari's fullscreen there turns off the keyboard's letter keys (WebKit grants
  iPad fullscreen without keyboard access: only Space, the arrows, Tab, Enter and the modifiers reach the page, so
  W A S D, E, R, H, the digits and Esc go dead) and a controller's shoulder buttons and triggers (WebKit bug 311151),
  and suggests Add to Home Screen; the button then reads Fullscreen anyway (touch only)) and
  Leave (press twice within 3 s). The title is the room id. It opens on Esc (when the pointer
  lock ends), H (on the Controls page), pad Menu and the corner menu button. The Room page ends with a You section: a
  name box and the colour swatches, saved as you type or tap ([identity.md](identity.md)). Get unstuck on the main page puts you back at the usual spawn with one press and forgets your saved spot, and you keep what you carry (it's not there while you're in a vehicle's seat). Start fresh is on the main page: it asks once more, then replays the first visit as someone new. Round 4 clears this device's solo/co-op saves; co-op rejoins the same room and any partners' railway. With no partner, the railway starts fresh too, as the warning says. Leave goes to
  a small menu page with the game stopped ([first-run.md](first-run.md)).
- **You page (10 November, pause-wardrobe step 1; production railway only; owner's answers the same day).** Pause always opens on **You** (never the last page used), even before you own anything: then every row reads Nothing. You has Resume, a row each for Hat, Accessory, Outfit and Pet, a Colour row and an Options button. Left and right step what you own in that slot (Nothing at the left end, wrapping both ways), applied at once and shown to partners through the usual `wardrobe` and `stowaway` presence. Under each value the pips are Nothing plus what you own, the current one larger; nothing you don't own shows, and a slot with fewer than two things owned shows no pips. The roster, the Live pill and mute sit in its header; Options (the old main list; RB on a pad and Esc on a keyboard from You; B and Esc, or its Back button, return to You; H still opens Controls) has fullscreen in its header and doesn't repeat the roster. Colour moved here from Room, which keeps the name box (and keeps colour wherever You doesn't exist). The world's interaction prompts are hidden while any menu is open. On foot, Buddy turns to the camera and the camera eases in with him beside the panel (right half on a desktop, left in phone landscape, the top of the screen in portrait, where he stands further off); never when seated, swimming, in the air, knocked down or the guest, never over a reveal or a cinematic, and after an alt-tab only from your first change. The world behind You isn't dimmed, so Buddy shows his true colour while you pick it (owner, 10 November); Options and the other pages keep the dim, which fades in and out over 200 ms as you switch. In phone landscape the room id is hidden so the card fits inside a notch's safe area without scrolling. Place and builds without a wardrobe keep today's main list. Draft copy for the owner: Hat, Accessory, Outfit, Pet, Colour, Nothing, Options, Back.
- **Version.** A faint World vNN · build line sits at the foot of the main page and can be selected for bug reports.
- **Sync kind.** Local, through [src/player/modal.ts](../../src/player/modal.ts) (one modal at a time; it takes keys and pad).
- **Phone layout.** The bounded card keeps a scrolling body whose contents cannot shrink underneath it. Short landscape screens use smaller padding and a compact heading, keeping every final action reachable by scrolling.
- **Play HUD moved here (5 November).** The main page holds the live name chips and connection/Live count on every platform. Place keeps money and nonempty carried contents; track distance, town population and empty-load bookkeeping are no longer main-menu stats. Touch alone shows the corner menu button during play. The money increase pill uses the freed top row instead of leaving a blank band above it.
- **Optional pages.** The opt-in [Dev menu](dev-menu.md) shares this modal. Navigation skips disabled controls and closed details; focused controls scroll into view on optional pages. Leaving a page disposes its tools.
- **Files.** [src/features/pause.ts](../../src/features/pause.ts), [src/player/guide.ts](../../src/player/guide.ts),
  [src/player/pad-diagram.ts](../../src/player/pad-diagram.ts),
  [src/player/glyphs.ts](../../src/player/glyphs.ts), [src/player/controls.ts](../../src/player/controls.ts).
- **Related research.** [research/controls-guide-and-pause-menu.md](../research/controls-guide-and-pause-menu.md).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
