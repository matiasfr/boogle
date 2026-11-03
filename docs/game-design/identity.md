# 6.24 Identity: name and colour

- **What.** No sign-up. You are a random player id (pid, [src/player/identity.ts](../../src/player/identity.ts);
  [multiplayer.md](multiplayer.md), 8.6) plus a name (up to 16 characters) and one of eight colours, kept in this
  browser (`boogle.name`, `boogle.color`). You pick them on your first visit's card (a friendly random name and a
  random colour are already there; [first-run.md](first-run.md)), and every later visit goes straight in with them.
- **Changing them.** The pause view's Room page has a You section: a name box and the colour swatches, saved as you
  type or tap. The roster, the HUD list, your avatar, the floating name over you and plaque lines follow (presence on
  its next beat; `who.set` within 3 s, [src/features/identity.ts](../../src/features/identity.ts)).
- **Starting fresh.** On the main pause page and under You, Start fresh turns into "Yes, start fresh" with a warning for 6 s; pressing it again forgets
  you on this device (name, colour, pid and key, room memories, The Boogler's friendship, mini-game and soapbox bests) and
  reloads into the first visit's fall. Settings and the controls cards you've seen stay. In round 4, every solo/co-op save
  on this device is cleared too: your back, dropped pieces, gifts, finds, crystals, conversations and saved position.
  Solo restarts the railway; co-op moves you to a new room, leaving partners and their railway intact, as the confirmation
  explains. On classic, the island keeps everything and your old plaque lines keep your old name. There's no undo.
- **No rank on the player.** Contribution tiers ([haul.md](haul.md)) stay as data; nothing shows them until rewards
  are designed (owner, 2 Nov 2026).
- **Sync kind.** Local storage for this browser; presence (`name`, colour) and the lockstep roster carry them to others.
- **Files.** [src/player/you-editor.ts](../../src/player/you-editor.ts), [src/player/arrival.ts](../../src/player/arrival.ts),
  [src/player/hud.ts](../../src/player/hud.ts), [src/features/identity.ts](../../src/features/identity.ts).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
