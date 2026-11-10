# 6.9 Social: honk and ping

- **Honk.** T / pad Y / touch Honk: a short cartoon honk with a note over your head. Every honk takes a tone from
  a shared chord that changes every 10 s of shared world time (Am7, Em7, Dm7, C6/9, looping; eight voices from A3 to
  G5, none a semitone apart), so honks heard together always make a chord. Your colour sets your home voice and a
  flavour (reedier on odd colours); each press picks a different shape (honk, short toot, honk-honk up a chord tone,
  low bwomp an octave down) that also steps your voice, so a honk isn't the same twice running. It plays at once,
  never waiting for a beat. When 3 or more different players honk within about 1 s, every client plays their notes
  as a held chord with 14 sparkles per player involved (cooldown 1.2 s). Your own honks are capped at one per
  300 ms; received honks at 3 per sender per second. Distance fades the volume.
- **Ping.** G / middle click / pad D-pad ← / touch Ping: a marker where you aim, labelled "Ball!" (the aim passes
  within 1.6 m of the ball), or "Look!" (anything else), in your colour with your name, for
  4 s (0.5 s fade), pinned to the screen edge with an arrow when off screen. Range 90 m, own cooldown 1 s, received
  one per 800 ms per sender.
- **Ping sound.** Two soft sine notes in your colour's pitch an octave up (a fifth for "Ball!", a third for "Look!"),
  quiet, with a gentle onset and a short tail.
- **Sync kind.** Neither is state: reliable room messages `{ t: 'honk', v }` (v: the shape, 0 to 3; missing reads as
  0) and `{ t: 'ping', x, y, z, k }`, validated
  and rate limited on receipt ([src/sim/social.ts](../../src/sim/social.ts)).
- **Files.** [src/features/honk.ts](../../src/features/honk.ts), [src/features/ping.ts](../../src/features/ping.ts),
  [src/sim/social.ts](../../src/sim/social.ts).
- **Related ideas.** [research/communal-progression.md](../research/communal-progression.md) uses the honk chord as the
  template for together moments.

## Voice chat

Added for the 9 November playtest. Voice is room-wide, not by distance, and off until you press **Join voice** in the
Pause main page. That press opens the mic prompt; on iOS, media is also allowed to play while the mic is open. After
that you hear everyone else in voice and they hear you. Pause shows **Mute** / **Unmute** and **Leave voice**, plus a
chip for each person in voice: a green dot glows while they talk, grey means connecting or muted, and coral reads
"Can't connect". While you are in voice a small pill sits beside the corner menu: a mic icon (dimmed when muted) and
the names of whoever is talking, or the count of people in voice. Tapping the pill mutes or unmutes. Desktop players
use Pause, because the pointer is locked during play.

- **How.** Audio-only WebRTC between every pair of tabs in voice (a mesh: fine for 2 to 4). Echo cancellation, noise
  suppression and auto gain are on. Public STUN only (Google, Cloudflare), with no TURN relay, so strict NATs and some
  cellular networks can't connect. That pair retries twice, then shows "Can't connect" instead of hanging.
- **Sync kind.** Presence `vc` (1 in voice, 2 muted; missing means not in voice) says who to link to. Of each pair, the
  smaller tab id offers. Offer, answer and ICE are room messages `{ t: 'rtc', to, k, n, ... }` addressed to one tab.
  The server relays each one only to that tab ([src/net/rtc-wire.ts](../../src/net/rtc-wire.ts) shape and size caps,
  its own 20/s bucket) and never into the world or a save. A tab that never presses the button opens no mic and no
  connection, because nobody offers to a tab without `vc`.
- **Lifecycle.** Voice stays on while the tab is hidden, if the browser keeps it alive. Leaving voice, closing the page,
  or losing the room closes every link, and the player rejoins whoever is there when the room comes back. A reload is
  a new tab: the old link closes about 5 s after its presence goes, and the new one is offered to at once.
- **Sound.** Each voice plays from its own `<audio>` element. The game's WebAudio context only meters levels for the
  talking dots. On Safari the audio session switches to play-and-record while the mic is open and back to playback
  after. One volume point per peer (`peerVolume` in voice.ts) is the seam for a later proximity fade. Element volume is
  read-only on iOS, so proximity there would route voices through WebAudio.
- **Files.** [src/features/voice.ts](../../src/features/voice.ts), [voice.css](../../src/features/voice.css),
  [src/netplay/voice-mesh.ts](../../src/netplay/voice-mesh.ts), [src/net/rtc-wire.ts](../../src/net/rtc-wire.ts), the
  relay in [server/src/host/hosted-room.ts](../../server/src/host/hosted-room.ts). Proof: `node dev/look/voice-proof.ts`.

---

Part of the [game design document](../game-design.md) (as built). Update this file in the same commit as a change a player can see.
