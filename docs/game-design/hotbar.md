# 6.6 Hotbar and items

- **What and how it plays.** Five slots; whatever is selected is drawn in your hand and everyone sees it. New players
  start empty-handed. Pick-ups go into a free slot (seeds stack to 20); the ball takes a slot while you
  hold it and leaves when ownership does. Using what you hold: the can waters, seeds plant, anything
  else winds up a throw. A full hotbar greys the prompt ("Hotbar full").
- **Controls.** 1-5 (same key again for empty hands), pad LB / RB, tap a slot; use (click / X); Toss on touch.
- **Sync kind.** Local for the contents (localStorage `boogle.hotbar`); Owner for what is in your hand (presence `hd`,
  a catalog index or −1). Items cross into the world only through `gift.take` and `gift.toss`.
- **On touch.** Only filled slots show; in portrait they make a column on the right. Toss appears only when the main
  button would do something other than throw.
- **Files.** [src/player/inventory.ts](../../src/player/inventory.ts), [src/player/hands.ts](../../src/player/hands.ts), [src/features/hotbar.ts](../../src/features/hotbar.ts),
  [src/player/item-models.ts](../../src/player/item-models.ts), [src/player/item-icons.ts](../../src/player/item-icons.ts), [src/features/prompt.ts](../../src/features/prompt.ts),
  [src/sim/interact-pick.ts](../../src/sim/interact-pick.ts).
- **The interact pick.** Every provider (ball, gifts and palms, stall, Boogler) lists targets in reach each frame;
  something that would act beats something blocked, then the nearest wins with a nudge toward where you look.
- **Known issues and limits.** One `boogle.hotbar` key for every room: you are global, the world is per room. Every item is listed in 7.1.


## Prototype: UI that answers (?proto=uisfx)

Asks "does the UI feel alive and satisfying without getting in the way?" ([docs/research/ui-patterns.md](../research/ui-patterns.md), recs 1-5). With `?proto=uisfx`:
- **Sounds** ([src/render/ui-sound.ts](../../src/render/ui-sound.ts)), synthesized, C major pentatonic, about 8 dB under the master: a *tick* on hotbar select (one soft E5 sine, 45 ms, the same for every slot; `TICK = false` silences it), a *pop* when the interact prompt appears (at most one per 220 ms), a *thunk* when a press acts (Take logs, Pick up: a marimba-like wooden tok on G4 over a soft low knock), a *deny* (falling two notes) when it can't ("Hotbar full") or a hotbar note shows, and a *count* per step of the haul count (a small bright clink, rising with the run, resetting after 0.6 s).
- **Motion** ([src/render/ui-kit.css](../../src/render/ui-kit.css)): shared duration and easing tokens and a `linear()` spring (about 8% overshoot); the prompt sticker squashes on a press (shakes on a refusal), a hotbar slot bounces when selected.
- **Haul chip**: a wood pill with a log icon and a big tabular count that ticks one by one toward the host-confirmed count (about 300 ms per change, a pop per step), sun-yellow with "full" at the hard cap, above the hotbar's name and note.
- **One notification lane** ([src/render/notify.ts](../../src/render/notify.ts), rec 5): a single pill where the hotbar note was (above the hotbar; under it on touch), one notice at a time, at most three waiting, the same text refreshing instead of stacking, 2.5 s by default. The hotbar note is a coral *deny* that goes first; the "Boogle was updated" toast is a sticky *news* notice (sun edge, a Reload sticker) that waits under anything newer. It pops in with the shared spring and leaves faster.
- **World first** (rec 5): shared news stays in the world. When a pour earns points, the work-site plaque turns the changed rows over like a departures board (staggered, a sun glow fading as each settles), the board swells a little with a puff of motes, and a quiet split-flap flutter plays (four tiny card clicks), louder the nearer you stand (silent past about 28 m). No HUD note for it.
- **Legibility**: in-play text at 18 px (hotbar name and note, chip) and glass at 0.72 opacity. (The rings' shape cue from this prototype, dashed Track and double Helper, is on for everyone: [haul.md](haul.md).)

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
