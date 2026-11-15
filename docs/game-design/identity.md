# 6.24 Identity: name and colour

- **What.** No mandatory sign-up. You have a server-issued player id (pid, [src/player/identity.ts](../../src/player/identity.ts);
  [multiplayer.md](multiplayer.md), 8.6) plus a name (up to 16 characters) and one of eight colours, kept in this
  browser (`boogle.name`, `boogle.color`). You pick them on your first visit's card (a friendly random name, which
  the die button beside it can reroll, and a
  random colour are already there; [first-run.md](first-run.md)), and every later visit goes straight in with them.
- **Changing them.** The pause view's Room page has a You section: a name box and the colour swatches, saved as you
  type or tap. The roster, the HUD list, your avatar, the floating name over you and plaque lines follow (presence on
  its next beat; `who.set` within 3 s, [src/features/identity.ts](../../src/features/identity.ts)).
- **Starting fresh.** On the main pause page, Start fresh turns into "Yes, start fresh" with a warning for 6 s; pressing it again forgets
  this device's sign-in and reloads as a new guest. Name, colour, room visits, The Boogler's memory, mini-game and
  soapbox bests are cleared before the new game loads. Settings stay. Pid-keyed finds, wardrobe, reward claims and
  positions remain with their original person; they are never copied to the new guest. The server account and room
  remain intact, even with no partner. The warning says this starts a new player on this device and the room keeps
  its progress. Other tabs, including tab-only credential fallbacks, close the old room and forget the old sign-in.
  No shared reset is sent.
  If both browser stores reject the new credential, the current visit is kept with an explanatory message.
- **World wipes.** A world namespace bump resets local room visits and saved spots, ability flourishes and teach
  moments, cosmetics claimed in old worlds, and The Boogler's memory of you. Name, colour, account/session, last-visit info,
  device and graphics tuning, sound and control preferences, dev settings and prototype bests stay. Each boot prunes
  stale namespaced progress; plain memories reset only when a previously recorded world changes, so the first boot
  after this feature ships preserves current-world memories. Profile pruning requires the same cross-tab Web Lock
  as reward claims. Player-supplied engine files, session plumbing and service-worker caches are untouched.
- **No rank on the player.** Contribution tiers ([haul.md](haul.md)) stay as data; nothing shows them until rewards
  are designed (owner, 2 Nov 2026).
- **Sync kind.** Local storage for this browser; Owner presence (`name`, colour) updates avatars immediately. In the live railway, the durable roster is Server kind: authenticated `who.set` commands share the railway request sequence, and acceptance waits for the checkpoint. Global player rows mirror names, colours and stable ordinals to every peer, including late joins and reconnects. The server accepts at most one changing roster command per authenticated player every 3 seconds, including across reconnects. Every peer records one budgeted mark per changed row, including remote edits. Recordings start with a complete roster; later changes and refills coalesce into one complete trailing snapshot per 30-second window, preserving the latest state even if marks were dropped. Names use one canonical trim/control/space/length rule in validation, storage and mirrors. The classic roster registration retired at v40; nonproduction previews have an empty read-only roster.
- **Files.** [src/player/you-editor.ts](../../src/player/you-editor.ts), [src/player/arrival.ts](../../src/player/arrival.ts),
  [src/player/hud.ts](../../src/player/hud.ts), [src/features/identity.ts](../../src/features/identity.ts).

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
