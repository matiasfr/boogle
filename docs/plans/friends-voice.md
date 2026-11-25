# Friends hear and signal each other

*Plan, 25 November 2026. Backlog row "Friends hear and signal each other" (P2, scoped), from
[friends-drop-in](../proposals/friends-drop-in.md) ideas 7, 9 and 10. Owner, 25 November: "Although let's have proximity
chat off by default so everyone can hear each other". Docs only; nothing here is built.*

**Goal.** Voice stays room-wide by default, and a player can choose to hear only friends near them. A ping can be
answered, and a ping at rails or a train says so. Serves DESIGN 8 (enjoyable alone and together) and 10 (slapstick:
shouting to someone who has wandered out of earshot, then honking at them). Bends nothing: all of it is optional, and a
player alone sees no change.

**Research.** [proximity-voice](../research/proximity-voice.md): ranges cluster around 25 m to silence (Fortnite: full to
5 m, silent at 35 m); players out of range need something other than voice, and honk and ping already are that
(summary 4); Chrome does not echo-cancel audio routed through Web Audio (summary 7), so desktop keeps the `<audio>`
element; iOS ignores element volume and lowers Web Audio while the mic is open (summary 8). The proposal's
Deep Rock note (a one-way ping needed a reply) is the reason for step 4.

## What exists today

- **Voice** ([social.md, Voice chat](../game-design/social.md#voice-chat); [voice.ts](../../src/features/voice.ts)):
  room-wide, opt-in with **Join voice** in Pause, an audio-only WebRTC mesh ([voice-mesh.ts](../../src/netplay/voice-mesh.ts)),
  presence `vc` (1 in voice, 2 muted), signals `{ t: 'rtc', ... }` validated by [rtc-wire.ts](../../src/net/rtc-wire.ts)
  and relayed one-to-one by [hosted-room.ts](../../server/src/host/hosted-room.ts) only between two tabs in voice. Each
  remote voice plays from its own `<audio>` element; `peerVolume(peer, v)` is the one volume point and is always 1.
  Talking dots read `getStats`, never Web Audio. `micSession()` in [audio.ts](../../src/render/audio.ts) switches
  Safari's audio session to `play-and-record` while the mic is open.
- **Ping** ([ping.ts](../../src/features/ping.ts)): G / middle click / D-pad ← / touch Ping. Two kinds, `ball`
  ("Ball!") and `look` ("Look!") in `PING_KINDS` ([social.ts](../../src/sim/social.ts)). Message
  `{ t: 'ping', x, y, z, k }`; the server relays it only after `validatePing` (hosted-room.ts line ~279), so a new kind
  or field is a server behaviour change. One live ping per sender, 4 s; own gap 1 s, received one per 800 ms per sender.
- **Honk** ([honk.ts](../../src/features/honk.ts)): `{ t: 'honk', v }`, distance-faded with `farGain`, chord on three
  players.
- **Settings**: the Pause main page holds the voice row (`pauseSections`); Graphics and Account are their own pages.
  There is no voice setting.

## Design

| Piece | Sync kind | Notes |
| --- | --- | --- |
| Hear everyone / nearby | Local (localStorage) | The listener's own choice; nothing sent, nobody else changes |
| Each voice's gain | Local | From my body and the speaker's `remotes.get(peer).target`, as honk does |
| Rail ping kinds | One-off event | Two new `k` values in `PING_KINDS`; the relay picks them up through `validatePing` |
| Ping reply | One-off event | `{ t: 'ping', k: 'omw', of }`; `of` names the pinger's tab; no position |
| Honk answers a ping | Local | Each client pairs the honks and pings it already receives |

All links stay open in nearby mode: the gain goes to 0, the connection doesn't close, so walking back in is instant and
nothing in the mesh, presence or signalling changes.

**Gain curve (Default).** Full volume to 6 m, a smoothstep down to silent at 30 m (about 4 s apart at walking speed).
No floor: out of earshot is silent, which gives honk and ping their job. Pure, in a new `src/netplay/voice-gain.ts`
(`voiceGain(d)`), not in `src/features/` (every file there auto-loads) and not in `src/sim/` (no lockstep math).

## Steps

Each step leaves `node dev/ship-check.ts` green and updates the owning section of
[social.md](../game-design/social.md) in the same commit.

- [x] **1. Nearby voice on desktop and Android.** Shipped in #2441 with per-listener gain and far chips.
  `src/netplay/voice-gain.ts` (`voiceGain`, `NEAR_M = 6`, `FAR_M = 30`).
  In voice.ts: a `hear: 'all' | 'near'` setting read and written through a guarded localStorage key (`boogle.voiceHear`,
  missing reads as `all`); the 200 ms `tick()` sets `peerVolume(peer, hear === 'near' ? voiceGain(d) : 1)` for each
  voice, with `d` the 2D distance from `me.body` to the remote's target (no body or no target: 1). The Pause chip of a
  peer whose gain is under 0.05 gets state `far` (dimmed, placeholder suffix, see Settings UI). Element volume only:
  iOS is step 2. **Check:** `node dev/look/voice-proof.ts` stays green with `hear` unset. **Proof look:** two tabs in
  voice, one set to nearby: the talking dot keeps glowing while the other walks away, the chip dims to far at about
  30 m, and the voice fades in as they walk back (heard, not stilled: a short screen recording with sound, or the
  probe's per-peer volume read in the proof).
- [x] **2. Nearby voice on iOS.** Shipped in #2443 with a Web Audio gain path. Device proof remains open.
  Element volume is read-only there, so in nearby mode only, a voice plays through Web
  Audio: `ctx.createMediaStreamSource(stream) → GainNode → ctx.destination`, straight to the destination and not
  through the game's buses, so game volume and mute leave friends alone as on desktop. Pick the path once with a probe
  (set a detached element's `volume` to 0.5 and read it back). Switching the setting mid-call reroutes live: to Web
  Audio, clear the element's `srcObject` (Safari can silence an element whose stream also feeds the context); back,
  disconnect the source, restore `srcObject` and `play()` (the toggle press is the gesture). Gains move with
  `setTargetAtTime(g, now, 0.1)`. `replayAll()` also resumes the context, so any voice press brings an `interrupted` context back. Everyone mode on iOS keeps today's element path unchanged. **Check:** voice-proof
  green on desktop (the path is never taken there). **Proof:** a real iPhone in voice with a desktop tab, nearby on, on
  the loudspeaker without headphones: the friend's voice is audible, fades with distance, causes no echo for the
  desktop player, and survives a lock and unlock; also record how loud it is next to Everyone mode (WebKit bug 218012).
  Until that session the step reports "not tested on a device". Only players who switch to nearby on iOS take the risk.
- [x] **3. Rail-aware ping labels.** `PING_KINDS` gains `rails` and `train` (placeholder labels below).
  A new `src/player/ping-hints.ts` (`addPingHint(fn)`, `pingHint(from, to)`), a list like `pauseSections`, so ping.ts
  imports no railway code: the train view ([train-view.ts](../../src/entities/railway/train-view.ts)) registers
  `train` when the aim segment passes within 3 m of a train's deck; the halt yards
  ([halt-yard-view.ts](../../src/entities/railway/halt-yard-view.ts)) and the railhead register `rails` within 3 m of a
  rail stack or the next section's bed. Ball wins, then train, then rails, then `look`. `chime()` gets a note pair per
  kind (rails a fourth, train a sixth). **Check:** `test/social.test.ts` cases: the new kinds pass `validatePing`, an
  unknown kind still fails. **Proof look:** stills of each label from the pinger's and a friend's view, on screen and
  pinned to the edge.
- [x] **4. Reply to a ping.** Press Ping while a friend's ping is live and your aim passes within 6° of its marker (or
  tap its card on touch) and you send `{ t: 'ping', k: 'omw', of: <their tab id> }` instead of a new ping. `validatePing`
  returns `Ping | PingReply`; `of` is a string of at most 64 characters; the relay's `{ t, ...cosmetic }` copy needs no
  change. Receivers with a live ping from `of` add the replier's name, in their colour, under that ping's card, extend
  its life by 2 s and play the replier's chime; with no live ping it is ignored. Your own reply shows the same on your
  screen. Same limiter and own gap as a ping. **Check:** `test/social.test.ts`: a reply passes, a reply missing `of` or
  with a 65-character one fails, and the clean copy carries no other field. **Proof look:** two tabs, one
  pings, the other replies from 40 m away: stills of the card with the reply on both screens.
- [x] **5. A honk answers a ping.** Both tabs showed the honker's name and ♪ in the existing reply row on a rail ping.
  [Pinger](friends-ping/honk-still.png) · [Honker](friends-ping/friend-honk-still.png).
  Local only. A honk from anyone but the pinger, while a ping is live, adds a small
  note and their name to the newest live ping's card (no reply message). ping.ts hears remote honks through its own
  `room.onMessage` and your own through `wrapAction('honk', ...)` in `onStart`, counting only when `me.entered` and not
  `me.down`. **Proof look:** stills of a honk reply on both screens.

**Checkpoint after step 4** (owner-calls "Build more, test less"): `npm run check:full` (the relay's behaviour
changed), `node dev/look/voice-proof.ts`, and a two-tab look covering a rail ping, a reply and nearby voice.
Voice proof passed all 14 checks. Two WebGPU tabs 40 m apart received audio at Nearby volume 0 and saw both
the aimed reply and the honk on the rail card. Checkpoint open on Windows: all 274 unit files passed, then
the server account crash test expected `SIGKILL` and received a null signal (406 passed, 1 failed, 2 skipped).

## Settings UI

One line in the Pause voice row, under Join / Mute / Leave, shown whether or not you are in voice so you can choose
before joining:

`Hear  [Everyone] [Nearby]` — a two-button toggle in the row's existing `pause-btn` style, the current one pressed
(`aria-pressed`). Reachable by pad and keyboard like the row's other buttons. No new action, key or guide row. While in
Nearby, a far friend's chip reads `Name · far` and dims; the HUD pill is unchanged (it still names whoever is talking,
far or not, so you know to go find them).

**Copy (all placeholders, for the owner; none is The Boogler's):** `Hear`, `Everyone`, `Nearby`, `far`,
`Rails here`, `Train!`, `On my way`.

## iOS Safari audio

- **Autoplay.** An element plays only after a gesture. Join voice is one; a friend who joins later arrives without one,
  and `replayAll()` retries on the next press. While the mic is open, iOS lets media play, so this mostly holds already.
- **The audio session.** `micSession(true)` sets `navigator.audioSession.type = 'play-and-record'` while the mic is
  open and back to `playback` after. In that mode iOS lowers Web Audio (WebKit 218012) and may route to the earpiece:
  step 2's device proof checks the loudspeaker and the level.
- **Web Audio path only in nearby mode.** The context must be `running`; it can go `interrupted` (a call, Siri, the lock
  screen). Each press that already calls `replayAll()` also resumes the context.
- **Echo.** Safari's echo cancellation with Web Audio output is unmeasured; the device proof listens for it from the
  desktop side. If it echoes, nearby stays desktop-only and iOS shows the toggle disabled (owner question 5).
- **Bluetooth.** Opening the mic drops Bluetooth headphones to call quality (research summary 9); unchanged by this plan.

## Reviews, wire and mixed builds

- **No step touches `src/net`.** Steps 1, 2 and 5 are Local and change no wire, presence or server code.
- **Steps 3 and 4 change what the server relays**, through `src/sim/social.ts`, which `server/src/host/hosted-room.ts`
  imports, and `src/sim` is in `REVIEW_PATHS` (dev/review-stamp.ts). Each needs an independent review before shipping;
  steps 3 and 4 ready together take one reviewer and one ship. The image copies all of `src/sim`, so `server/Dockerfile`,
  `dev/server-build.ts` and `deploy-server.yml` need nothing new. The builder reads [lockstep](../agents/lockstep.md)
  for these two steps: `validatePing` stays plain validation, with no trig or `Math.random` in `src/sim`.
- **Mixed builds** ([mixed-builds](../agents/mixed-builds.md)): dev phase, no compatibility code. Pings are not durable,
  so no `WORLD_NS` bump. The client and the server deploy separately: until the server image ships, the new kinds and
  replies are dropped by the old relay (counted in `dropped`, no crash), and an old tab drops them in its own
  `validatePing`. Both are accepted.
- **Room safety**: every receipt is validated and rate limited by the existing limiter; a reply for a ping you never saw
  is ignored; nothing enters the world or a save.

## Risks

- Hotspots: voice.ts (one owner at a time); hosted-room.ts is read, not edited.
- Performance: none measurable; a few gain nodes on iOS in nearby mode, one hint check per ping press.
- The iOS path can't be proven without a real iPhone; it is opt-in so the default stays as today.

## Open questions

1. **Whose choice is nearby?** Recommend each listener's own (Local), as planned; a room-wide switch would need Server
   state and makes one player's preference everyone's.
2. **Should listening work without a mic?** "Everyone can hear each other" could read as auto-joining. Recommend
   keeping Join voice: browsers need the press, and the server's rule that nobody listens in unseen stays.
3. **Which reply?** Recommend both as planned: "On my way" by pinging at a friend's marker (step 4), and a honk while a
   ping shows counts as "heard" (step 5). A salute emote waits for emotes.
4. **Which rail labels?** Recommend two: `Rails here` (a rail stack or the next bed) and `Train!` (a train). "Train
   coming" for track ahead of a moving train needs the schedule and can follow.
5. **If iOS nearby echoes or is too quiet,** recommend shipping nearby for desktop and Android only, with the toggle
   disabled on iOS and a note, rather than holding the row.

## Design review (2026-11-25)

Run by the planner on its own plan, with DESIGN.md, the owner-calls index, the decision routing table, the
[proximity-voice](../research/proximity-voice.md) research and the proposal read this session. No decision covers
voice or ping beyond the 2 November Design Table call ("rough proximity voice chat", decisions-core-loop) and the
25 November row words. No place is laid out, so no level check.

| # | Call | Kind | Source or recommendation |
| --- | --- | --- | --- |
| 1 | Voice is room-wide by default; nearby is an option | Decided | Owner, 25 November (backlog row): "proximity chat off by default so everyone can hear each other" |
| 2 | Nearby is each listener's own Local choice | New | Recommend: no player's setting silences anyone for anyone else (open question 1) |
| 3 | Join voice stays a press; no listen-only | New | Recommend: browser gesture and consent; the no-unseen-listeners rule holds (open question 2) |
| 4 | Gain full to 6 m, silent at 30 m, smoothstep, no floor | Default | Research: 25 m cluster, Fortnite 5/35 m; silence gives honk and ping a job |
| 5 | Far friends' chips dim and read `far`; the pill still names far talkers | Default | You can tell someone is talking and go find them |
| 6 | The setting shows before joining | Default | Choose before you speak |
| 7 | Game volume and mute don't touch friends' voices, on iOS too | Default | Matches desktop today |
| 8 | Rail labels `Rails here` and `Train!`; ball, then train, then rails, then look | New | Recommend two kinds now (open question 4) |
| 9 | Rail hints within 3 m of the aim; new chime intervals (fourth, sixth) | Default | Same idea as the ball's 1.6 m; chimes stay in the honk palette |
| 10 | Reply: ping at a friend's marker within 6° or tap its card; adds your name, +2 s | New | Recommend (open question 3); Deep Rock's lesson from the proposal |
| 11 | A honk while a ping shows counts as "heard" on the newest ping | Default | Local, free, uses the existing honk; any distance, since replies matter most when far |
| 12 | Placeholder copy: `Hear`, `Everyone`, `Nearby`, `far`, `Rails here`, `Train!`, `On my way` | Default | Copy for the owner; none is The Boogler's |

**Counts:** 1 Decided, 7 Default, 4 New.

**Findings.**

1. *First meeting.* Nobody learns nearby exists unless they open Pause; that is fine for an option the owner wants off
   by default. The reply needs no teaching beyond the card: the step 4 proof should check that a friend's card shows a
   hint of how to answer. Not added: helper text goes against DESIGN 11 until a playtest shows nobody finds it.
2. *Solo.* A lone player sees only the two new labels; nothing else changes. Holds DESIGN 8.
3. *Co-op split.* In nearby mode on a train, riders are within a few metres, so a shared ride is a shared call. Two
   players working opposite ends of a line are silent to each other, which is the point; ping, the reply and honk cover
   it (research summary 4). No change.
4. *iOS risk.* The Web Audio path is taken only in nearby mode, so the default on iPhone is unchanged. Step 2 was written
   that way after this check; open question 5 covers a failed device proof.
5. *Long-range tool.* The research's strongest pattern is short range plus a long-range tool (walkie, megaphone,
   whistle). Out of scope for this row; parked in the proposal's idea 7 ("a train whistle or megaphone") and worth
   revisiting if nearby gets used.
