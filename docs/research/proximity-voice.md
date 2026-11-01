# Proximity voice with a short range

*Research report, 1 November 2026. Proximity voice in shipped games (Big Walk, Lethal Company, Content Warning, Peak, R.E.P.O., Sea of Thieves, Rust, DayZ, VRChat, Rec Room, the Among Us CrewLink mod, Fortnite, Roblox, Valheim) and the browser technology behind it (WebRTC mesh vs SFU, Web Audio spatialisation, echo cancellation, iPad Safari, Bluetooth, costs), turned into recommendations for [net-roadmap.md](../plans/net-roadmap.md) phase 8. Builds on [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md) (section 1.2, House House keeping the range short) and [system-cohesion.md](system-cohesion.md) (section 1.1, the short range is what gives the tools a job) without repeating them. Recommendations only; no design decisions.*

**Markers.** **[V]**: the page was fetched and the words match. **[S]**: seen only in a search summary, a fan wiki, a vendor page or a forum; check before quoting. Boogle numbers come from the code: walk 5.6 m/s, sprint 9.5 m/s ([src/physics/physics.ts](../../src/physics/physics.ts)), presence at 20 Hz (`SEND_MS`), at most 8 players per room (`MAX_PLAYERS`, [server/src/server.js](../../server/src/server.js)), and the shared `AudioContext` in [src/render/audio.ts](../../src/render/audio.ts), which sets iOS's `navigator.audioSession.type = 'playback'`.

## Summary

1. Every game in this survey that makes voice part of play uses a **short range and a long-range tool**: walkie-talkies (Big Walk, Lethal Company, Peak, DayZ), a megaphone (Big Walk, Rust), a trumpet (Sea of Thieves). The short range is never a technical limit; it gives the tools a job.
2. The **published ranges cluster around 25 m to silence**: VRChat's default far distance is 25 m [V], DayZ's normal voice 25 m (whisper 7, shout 45) [S], Fortnite's UEFN default is full volume to 5 m, silent at 35 m [V], Roblox's legacy voice 7 to 80 studs [S]. At Boogle's walking speed, 25 m is about 4.5 s apart.
3. **Comedy comes from what voice does to bodies and items**: mouths that flap when you talk (Peak, R.E.P.O.), a helium voice as a status effect (R.E.P.O.), a voice cut off mid-sentence on the walkie (Lethal Company), a camera that records what you say (Content Warning).
4. **Players who fall out of range need something other than voice**: gestures, pings, text that obeys the same range (Big Walk, Lethal Company), dead players staying in voice as ghosts (Peak). Boogle's honk and ping already are such tools.
5. **For 2 to 8 players, a WebRTC peer mesh is enough for audio**: about 30 to 40 kbit/s per stream, so 7 streams up and 7 down at worst, much less with Opus DTX in silence. An SFU only pays off for bigger rooms or bad uploads.
6. If an SFU is wanted, **Cloudflare Realtime** costs $0.05 per GB of egress after 1,000 GB a month free [V]; a full 8-player room talking non-stop is roughly 1 GB an hour, so the free tier covers about a thousand such hours. Its TURN shares the same price and allowance; Boogle deleted its own TURN with the server switch.
7. **Echo cancellation is the hardest technical risk.** Chrome cancels echo only of remote WebRTC audio, not of audio routed through Web Audio (crbug 687574, long open [V via focused.io]), so spatialising voices and playing game sounds through Web Audio can leak both back into the mic on speakers. A local loopback `RTCPeerConnection` is the known workaround.
8. **iPad Safari specifics:** opening the mic lowers Web Audio's volume and can reroute output (WebKit bug 218012, reports through iOS 18.6 [V]); `HTMLMediaElement.volume` can't be set on iOS (Apple [S]), so per-player gain has to go through Web Audio; Boogle's `audioSession.type = 'playback'` will have to switch to `'play-and-record'` while the mic is live.
9. **Bluetooth headphones drop to call quality** (HFP) when their mic opens; game sound and music get worse for that player [S]. Using the iPad's built-in mic with Bluetooth headphones keeps playback in A2DP.
10. **Moderation in a friends' room is local and consentful**: per-player mute and volume, a mute-all, voice off until the player turns it on, and no recording. Fortnite's rolling five-minute recording for reports [S] and Rec Room's AI moderation [S] fit public lobbies, not a room of friends.

## 1. Games

### 1.1 Big Walk (House House, 2026)

The earlier reports cover the range and the tools ([big-walk-and-communal-endings.md](big-walk-and-communal-endings.md), 1.2 and 1.3). New here:

- **The press kit** describes the voice system as fading across distance, echoing down corridors, muffling through walls and crackling through walkie-talkies ([press kit](https://bigwalk.game/presskit/)) [S]. So occlusion and reverb are part of the identity, not polish.
- **Fan guides put the hearing range at roughly 15 to 25 m** ([Big Walk wiki](https://big-walk-wiki.wiki/en/proximity-voice-chat/voice-chat-explained/)) [S]; no primary source gives a number.
- **Text chat follows the same distance rules** as voice, so a player without a mic isn't shut out ([bigwalkgamewiki.org](https://bigwalkgamewiki.org/guides/proximity-chat)) [S].
- **The walkie is louder than a voice beside you**, according to one guide, and the megaphone takes your only hand slot ([bigwalkwiki.wiki](https://bigwalkwiki.wiki/tools/walkie-talkie/), [games.gg](https://games.gg/news/big-walk-megaphone-how-to-get/)) [S]. The tool rewards using it, and costs something.
- A review calls proximity voice "the puzzle", not a comfort feature ([Tech Times](https://www.techtimes.com/articles/323135/20260805/big-walk-review-house-house-turned-proximity-chat-puzzle-mechanic.htm)) [S].

### 1.2 Lethal Company (Zeekerss, 2023)

- **Range plus a walkie** is the whole system: you hear crewmates only nearby, or when both hold walkie-talkies. A voice cut off mid-sentence over the walkie is what players remember ([Steam discussion](https://steamcommunity.com/app/1966720/discussions/0/4032472803475132187/), [Game Design Library](https://www.gamedesignlibrary.com/post/proximity-chat-changes-the-game-how-lethal-company-s-game-design-innovated-multiplayer-horror-games)) [S].
- **Text chat obeys the same radius** and travels over active walkies [S].
- **The cost of realism:** players ask for an accessibility option because the distortion makes speech "tinny" and hard to follow, and many groups move to Discord ([Steam discussion](https://steamcommunity.com/app/1966720/discussions/0/4032473196480609497/)) [S]. Effects that make voices funny can also make them unintelligible.
- Voice is reported to run on Dissonance, an off-the-shelf Unity voice library [S].

### 1.3 Content Warning (Landfall, 2024) and Peak (Aggro Crab and Landfall, 2025)

- **Content Warning** turns voice into material: the handheld camera records what nearby players say, so the group has to stay close and talk to the camera ([Landfall press kit](https://landfall.se/content-warning-press-kit), [fan wiki](https://content-warning-landfall.fandom.com/wiki/Content_Warning)) [S]. Made by five people in about three months.
- **Peak, from Aggro Crab's GDC talk** as reported by Game Developer [V] ([article](https://www.gamedeveloper.com/business/peak-co-developer-aggro-crab-shares-lessons-in-friendslop)):
  - The first-person camera makes proximity chat land harder because eyes follow players and **mouths animate when they speak**.
  - Friction that forces talk: items can't be taken out of your own backpack alone; a guidebook only one player can read must be read out.
  - **Dead players stay in voice as ghosts** and can still help.
  - Rule Zero, "Never abandon a friend in need", is something players say in character.
- Peak's range is "pretty big" by one player's account, with walkie-talkies for long distance ([Steam](https://steamcommunity.com/app/3527290/discussions/0/592901506443934608/)) [S].

### 1.4 R.E.P.O. (semiwork, 2025)

- Robots **flap their mouths exaggeratedly** while their player talks ([TheGamer](https://www.thegamer.com/proximity-chat-is-incredible-peak-repo-lethal-company-phasmophobia-among-us/)) [S].
- **Voice as a status effect:** a monster that holds your gaze pitches your voice up to helium ([Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3449852510)) [S]. Changing how a friend sounds is a cheap, reliable laugh.

### 1.5 Sea of Thieves, Rust, DayZ, Valheim

- **Sea of Thieves:** proximity voice with a player setting for **directional or non-directional** voice; guides suggest turning direction off if voices are hard to hear ([Game8](https://game8.co/games/Sea-of-Thieves/archives/451193), [GameSkinny](https://www.gameskinny.com/tips/how-to-set-up-voice-chat-in-sea-of-thieves/)) [S]. The speaking trumpet throws your voice further; players disagree on how far ([forum](https://www.seaofthieves.com/community/forums/topic/60202/the-trumpet-and-current-voice-chat)) [S]. No Rare talk on voice was found.
- **Rust:** the Voice Props DLC sells a held megaphone and a powered microphone stand with voice modes ([Facepunch](https://rust.facepunch.com/news/wounding-and-voice-props), [wiki](https://wiki.facepunch.com/rust/item/megaphone)) [S]. Voice range is about 40 m by a third-party estimate [S].
- **DayZ:** three voice levels on a key, **whisper 7 m, normal 25 m, shout 45 m**; handheld transceivers on matching frequencies reach about 5 km, but every radio transmission is also heard by people standing next to you ([radio guide](https://gamers.wiki/en/games/dayz/guides/dayz-radio-guide-your-transceiver-is-not-a-private-channel), [wiki](https://dayz.fandom.com/wiki/Handheld_Transceiver)) [S].
- **Valheim** has no voice. Text has a local range and a `/s` shout to the whole server; a chat mod uses whisper 5 m, say 25 m, shout 125 m. Players complain that text vanishes if you weren't looking ([Prima](https://primagames.com/gaming/can-you-use-voice-chat-in-valheim), [Steam](https://steamcommunity.com/app/892970/discussions/0/3102389184723675507)) [S]. The no-mic path needs a way to catch what you missed.

### 1.6 VRChat, Rec Room, Fortnite, Roblox: numbers and safety

- **VRChat world voice settings** [V] ([creator docs](https://creators.vrchat.com/worlds/udon/players/player-audio/)): gain 15 dB by default (0 to 24); **near distance kept at 0 for realistic spatialisation; far distance 25 m**; volumetric radius 0 (makes a voice come from an area, not a point); an optional **low-pass on distant voices** to keep them understandable in noisy worlds.
- **VRChat safety** ([wiki](https://wiki.vrchat.com/wiki/Trust_and_Safety)) [S]: per-user volume and mute (the muted person sees a "deafened" indicator), block, and Safe Mode, a panic switch that silences everyone except friends.
- **Rec Room** (shut down 1 June 2026 per Wikipedia [S]) ran Modulate's ToxMod in all public rooms and reported 70% fewer toxic voice incidents; an instant one-hour mute did most of the work ([GamesBeat](https://gamesbeat.com/how-rec-room-reduced-toxicity-in-player-voice-chat-by-70/)) [S, vendor-sourced]. It also had a personal-space bubble.
- **Fortnite / UEFN proximity chat** [V] ([island settings](https://dev.epicgames.com/documentation/fortnite/island-settings-in-unreal-editor-for-fortnite)): off by default per island; **Full Volume Distance 5 m, Falloff Distance 35 m**, attenuation curve Linear by default (or Log Reverse, Natural). It works only in the island's game channel and respects parental controls. Epic keeps a rolling five-minute recording on each device, sent only when someone reports, and caps under-13s at friends and team ([Epic safety](https://safety.epicgames.com/parental-controls)) [S].
- **Roblox spatial voice** requires age verification (13+, by ID or a facial age estimate) and was rolled out slowly while moderation tools were built ([TechCrunch](https://techcrunch.com/?p=2205706), [GamesBeat](https://gamesbeat.com/roblox-introduces-age-verification-for-its-43m-daily-users/)) [S]. Its default curve is inverse; the legacy curve ran from 7 to 80 studs ([enum docs](https://create.roblox.com/docs/reference/engine/enums/VoiceChatDistanceAttenuationType)) [S].

### 1.7 CrewLink (the Among Us mod, 2020)

A fan mod that read positions out of the game's memory and connected players by WebRTC, with a small voice server for signaling ([Daily Dot](https://dailydot.com/among-us-crewlink-voice-chat), [BetterCrewLink](https://github.com/OhMyGuus/BetterCrewLink)) [S]. Later forks added walls blocking voice and "hear only who you can see", plus automatic WebRTC reconnects. It shows that a hobby team can ship browser-grade proximity voice over a peer mesh, and that reconnects are the work that follows.

## 2. Technology

### 2.1 Mesh or SFU for 2 to 8 players

- **Mesh cost** is (N − 1) streams up and down per player. Guides put the practical mesh limit at 4 to 6 participants, but for video; for audio only, the cost is the Opus bitrate ([Ant Media](https://antmedia.io/webrtc-network-topology/)) [S].
- **Opus for speech** sits at about 28 to 40 kbit/s for full-band speech; one estimate is about 30 kbit/s with packet overhead at 50 packets a second ([RFC 7587](https://www.rfc-editor.org/rfc/rfc7587.html), [issue](https://github.com/experintellia/basicwebrtc/issues/14)) [S]. **DTX** (`usedtx=1`, off by default) sends about one packet every 400 ms in silence instead of every 20 ms [S].
- Worked out for Boogle (my arithmetic): 7 peers × ~35 kbit/s ≈ 250 kbit/s up and down while everyone talks, near zero in silence with DTX. Each `RTCPeerConnection` encodes separately, so a mesh costs 7 encoders on the speaker's device.
- **An SFU** takes one upload per player and forwards. **Cloudflare Realtime** [V] ([pricing](https://developers.cloudflare.com/realtime/sfu/pricing/)): $0.05 per GB from Cloudflare to clients, publishing free, 1,000 GB a month free, shared with Cloudflare TURN. **LiveKit Cloud's** free plan is reported as 5,000 participant-minutes a month, then $50 a month for 150,000 [S, aggregators]; LiveKit and mediasoup can also be self-hosted, at the cost of UDP ports and another machine to run.
- **Fly egress** is $0.02 per GB in North America and Europe ([Fly blog](https://fly.io/blog/we-cut-bandwidth-prices-go-nuts/)) [S], relevant if audio were relayed through Boogle's own server.

### 2.2 Web Audio spatialisation

- `PannerNode` distance models [V] ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/PannerNode/distanceModel)): linear `1 − rolloff·(d − ref)/(max − ref)`, inverse (the default) `ref/(ref + rolloff·(max(d, ref) − ref))`, exponential `(max(d, ref)/ref)^−rolloff`. Only linear reaches silence at a set distance; inverse never does, so a hard cut-off needs a separate gain.
- `panningModel` is `'equalpower'` by default; `'HRTF'` gives front/back cues on headphones but costs more per voice and sounds odd on a speaker.
- **Chrome bug 933677:** a remote WebRTC stream fed to `createMediaStreamSource` is silent unless the stream is also attached to a (muted) `<audio>` element ([three.js forum](https://discourse.threejs.org/t/positionalaudio-setmediastreamsource-with-webrtc-question-not-hearing-any-sound/14301?page=2)) [S].
- **Speaking indicators** can read `RTCRtpReceiver.getSynchronizationSources()[i].audioLevel` (0 to 1, the last packet played), available in all browsers since 2020 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSynchronizationSource)) [S], or an `AnalyserNode`.

### 2.3 Echo cancellation with game audio

- **Chrome** [V] ([focused.io](https://focused.io/lab/echo-cancellation-with-web-audio-api-and-chromium), 2020, quoting crbug 687574): "Chromium does not apply echo cancellation to any remote streams- including WebAudio Api streams". A Chromium engineer called changing this "a big task" ([discuss-webrtc](https://groups.google.com/g/discuss-webrtc/c/nVLTS-U-tmM)) [S]. The workaround: send the Web Audio output (`createMediaStreamDestination()`) through a **local loopback `RTCPeerConnection`** and play the result in an `<audio>` element, so Chrome sees it as remote audio and cancels it. No source confirms a fix.
- **iOS Safari** applies its own voice processing; reports say the `echoCancellation` constraint is largely ignored and audio quality changes once capture starts ([WebKit 311451](https://bugs.webkit.org/show_bug.cgi?id=311451)) [S]. Whether iOS cancels Web Audio game sounds as well as voices was **not confirmed** by any source; it has to be measured on the device.
- On headphones none of this matters, which is why most voice games quietly assume them.

### 2.4 iPad and iPhone Safari

- **WebKit bug 218012** [V] ([bug](https://bugs.webkit.org/show_bug.cgi?id=218012)): granting the mic lowers the volume of Web Audio and other playback and can move output to the earpiece; reported from iOS 13 to 18.6. Workarounds people report, each working for some: route Web Audio through a `MediaStreamAudioDestinationNode` into an `<audio>` element (the WebKit engineer's suggestion), set `navigator.audioSession.type = 'play-and-record'` before capture and back to `'playback'` after, or turn off `autoGainControl`/`echoCancellation`/`noiseSuppression`.
- **No per-element volume:** on iOS the `volume` property can't be set from script and always reads 1 ([Apple](https://developer.apple.com/library/safari/documentation/audiovideo/conceptual/using_html5_audio_video/Device-SpecificConsiderations/Device-SpecificConsiderations.html)) [S, archived guide]. Distance gain has to be a Web Audio `GainNode`.
- **Permission:** Safari can remember a per-site Allow; home-screen web apps re-ask more often, and the prompt can hide behind fullscreen ([WebKit list](https://lists.w3.org/Archives/Public/public-webrtc-logs/2025Jun/0089.html), [bug 215884](https://lists.webkit.org/pipermail/webkit-unassigned/2024-September/1183557.html)) [S]. iOS shows its own orange mic dot while capturing.

### 2.5 Bluetooth, battery, latency

- Opening a Bluetooth headset's mic switches it from A2DP (stereo) to HFP (call quality, "closer to AM radio" in Microsoft's words) for all audio; using the device's own mic keeps the headphones in A2DP ([Gcore](https://gcore.com/docs/streaming-platform/troubleshooting/real-time-video-issues/audio-quality-is-reduced-when-using-bluetooth-headsets-in-video-call-apps), [MakeUseOf](https://www.makeuseof.com/windows-bluetooth-classic-audio-limitations/)) [S]. Bluetooth also adds its own output delay. LE Audio headsets avoid the switch where supported [S].
- **Latency target:** ITU-T G.114 treats under 150 ms one way, mouth to ear, as unnoticeable for most conversation; 400 ms is a planning ceiling ([G.114](https://www.cs.columbia.edu/%7Eandreaf/new/documents/other/T-REC-G.114-200305.pdf)) [S].
- **Battery:** no measurement of WebRTC audio on an iPad was found. The costs are the mic and voice processing running constantly, one Opus encoder per outgoing link, and the radio staying awake; DTX and stopping senders to out-of-range peers reduce the last two.

## What this means for Boogle

Recommendations, not decisions. Voice is multiplayer-only, so it sits outside the solo-first prototypes ([boogle-2.md](../proposals/boogle-2.md)); it should never be needed to contribute (DESIGN.md 4, "Cooperation is automatic") or to enjoy a drop-in (8).

### Architecture (2 to 8 players, a server per room)

1. **Start with a peer mesh of plain `RTCPeerConnection`s, audio only**, as net-roadmap phase 8 already sketches. At the 8-player cap it is at most 7 links of ~35 kbit/s, no new vendor and no new machine. Signaling travels as room messages over the existing WebSocket (`room.send` reaches every peer, so offers carry a `to` field and others ignore them; a server-side direct message is cleaner if added).
2. **Connect to every voice-enabled peer, gate by range locally.** With 8 players, keeping all links open avoids a connect delay when someone walks into range. For a peer out of range, stop sending (`RTCRtpSender.replaceTrack(null)` or `encodings[0].active = false`) instead of tearing the link down, and resume with a margin (start at 35 m, stop at 50 m) so walking along the edge doesn't flap.
3. **Turn on Opus DTX** (`usedtx=1` in the SDP), mono, around 24 to 32 kbit/s. Silence then costs almost nothing, which matters with open mics.
4. **TURN is needed for some links** (phones on carrier networks, strict NATs). The server-host switch deleted Boogle's own TURN; Cloudflare's TURN at $0.05/GB with the shared 1,000 GB allowance is the cheapest return, with the Fly server minting short-lived credentials.
5. **Keep Cloudflare Realtime SFU as the upgrade path,** not the start: it is worth it if `npm run load` or playtests show uploads choking, rooms grow past 8, or many players are on phones. Cost for an 8-player room talking non-stop is about 1 GB an hour, so the free tier covers about a thousand such hours a month. LiveKit Cloud's free plan (5,000 participant-minutes, about ten full 8-player hours) runs out far sooner.
6. **Don't relay audio over Boogle's WebSocket.** It's cheap on Fly, but TCP stalls the whole stream on one lost packet, and Chrome would not echo-cancel audio played from it (2.3).
7. **Voice is a Local feature on top of Owner data.** Positions already arrive at 20 Hz through presence; gain is computed per frame from the smoothed remote pose (`createSnaps`). A presence field (`voice`: on/off, maybe shouting) tells others whether to expect audio; the field returns `null` when voice is off.

### Falloff and sound (starting numbers to tune)

8. **Full volume to 4 m, linear fade to silence at 25 m** (VRChat's far default; DayZ's normal voice; Fortnite's 5/35 m a little longer). At walking speed, 25 m is about 4.5 s apart, short enough that drifting off happens, long enough to talk across a small clearing. Use the linear model or a custom gain curve so silence really is silence.
9. **A low-pass on distant voices**, starting to close past about 10 m (VRChat's option): far voices sound far and stay intelligible, and the fade reads as distance rather than a bad connection.
10. **Shouting as a mode, not a louder mic:** a held action that stretches the range to about 45 to 60 m (DayZ shouts reach 45 m) and plays a visible cue (cupped hands, a squash on the head). It fits the honk family: a social signal everyone can see.
11. **Occlusion and reverb only after the basic fade feels right.** Big Walk's walls and corridors are identity for a game of buildings; Boogle is mostly outdoors. A cheap first step is one raycast per speaker per few frames to dim and low-pass voices behind terrain.
12. **Equal-power panning first, HRTF as an option.** HRTF helps only on headphones and costs per voice; Sea of Thieves exposes direction as a setting because some players find it harder to hear.

### Drifting apart and comedy

13. **Show voice you can't hear.** A speaking indicator (mouth flap or sound lines from `audioLevel`) on every avatar, including those out of range, tells you a friend is talking over there; this is Peak's and R.E.P.O.'s comedy and Big Walk's "go find them" prompt at once.
14. **Honk and ping are the long-range tools already**; a walkie-talkie item (a pair, crackly, louder than nearby voice, as Big Walk does) or a megaphone are the natural first voice items, and should cost a hand like Big Walk's.
15. **Voice effects as toys:** a helium pitch shift from an item or a balloon (R.E.P.O.), a megaphone's band-pass. Keep them short and optional, given Lethal Company's complaint that distortion hurt intelligibility.
16. **A no-mic path with the same range:** emotes, honk, ping and, if text exists, text that obeys the same radius and stays readable for a few seconds (Valheim's vanishing text is the warning).

### UX defaults

17. **Voice off until the player turns it on.** The mic prompt comes from a tap on a "voice" toggle, never at load, so drop-in stays one click and iOS's prompt doesn't land behind fullscreen. Remember the choice in localStorage.
18. **Open mic with a mute toggle** once on, since iPad and phone players have no spare thumb; push-to-talk as a setting for keyboard players. A mute toggle needs a pad slot through `registerAction` (AGENTS.md, "Controls").
19. **Hear only those who turned voice on, and only if you did** (mutual opt-in), so nobody is listened to without having joined voice.
20. **Suggest headphones** in the voice toggle's card on speakers-only devices until echo is proven fine (2.3), and on iOS **suggest the built-in mic** when Bluetooth headphones are connected (2.5).

### Moderation, consent and privacy

21. **Per-player volume and mute, remembered by `pid` in localStorage, plus a mute-all panic button** (VRChat's Safe Mode). No server-side moderation is needed for a friends' room.
22. **No recording anywhere.** Audio never touches Boogle's server in the mesh design (an SFU forwards without storing). Say so in one line on the voice toggle.
23. **The default room is public by URL** (`?room=beach`), so strangers can join; voice could stay off in `beach` and on only in named rooms, or be opt-in per room. A wider audience later would bring age questions (Roblox's 13+ check, Fortnite's under-13 cap) that a friends' game can avoid for now.

### iPad Safari specifics

24. **Switch `navigator.audioSession.type` to `'play-and-record'` while the mic is live** and back to `'playback'` after; today [src/render/audio.ts](../../src/render/audio.ts) sets `'playback'` once.
25. **Route the shared Web Audio output through `createMediaStreamDestination()` into one `<audio>` element** if the volume drop from bug 218012 shows up; it is also the Chrome loopback path (2.3), so one routing may serve both.
26. **All per-voice gain through `GainNode`s**, never element volume (ignored on iOS); every remote stream still goes to a muted `<audio>` element so Chrome delivers it to Web Audio.

### Costs

27. **Mesh:** STUN is free; TURN on Cloudflare for the links that need it, likely well inside 1,000 GB a month for a friends' game. **SFU later:** about 1 GB per full room-hour, $0.05/GB past the free tier. Self-hosting LiveKit or mediasoup on Fly adds a machine with UDP ports and egress at $0.02/GB.

### The smallest prototype that tests the feel

`?proto=voice`, one Local feature in `src/features/`, no new dependency:

- A "voice" button on the HUD; a tap calls `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })` and sets a `voice` presence field.
- A full mesh between voice-enabled peers, signaled through room messages with a `to` field; Google's or Cloudflare's public STUN only, so it is tested on one Wi-Fi network first.
- Per remote: a muted `<audio>` element holding the stream, then `MediaStreamSource → BiquadFilter (low-pass) → GainNode → PannerNode (equal-power) → the shared master`. Gain from distance to the remote's smoothed pose: 1 to 4 m, linear to 0 at 25 m, low-pass from 10 m. A key or slider changes the far distance live (15, 25, 35 m).
- A mouth-flap or sound-lines cue on each avatar from `audioLevel`, shown at any distance.
- A debug line per peer: distance, gain, `audioLevel`, round-trip time from `getStats()`.

Test with two devices (the owner's iPad and a laptop or phone), then three or four people:

- **Feel:** walk apart while talking. Does the fade at 25 m read as "they're far away" and lead to honking or walking back, or does it feel like a broken connection? Which far distance felt best?
- **Echo:** on the iPad's speaker with game sounds playing, does the other side hear itself or the game? Then the same on Chrome on a laptop speaker.
- **iOS:** does game audio drop in volume when the mic opens? Does `'play-and-record'` or the `MediaStreamDestination` routing fix it?
- **Latency:** a clap between two devices in the same room, recorded on a phone; under 150 ms is the bar.

If the fade feels good and echo is fixable, the next steps are shouting, the walkie pair and TURN; if echo can't be fixed on speakers, voice ships as headphones-recommended.

## Gaps

- No primary House House source on Big Walk's range numbers, voice technology or occlusion method; Rare and Zeekerss were not found talking about voice design either.
- Peak, R.E.P.O., Lethal Company, DayZ and Rust details come from guides and forums.
- Whether iOS Safari cancels Web Audio game sounds (not just voices) from the mic, and whether Chrome has fixed crbug 687574, were not confirmed: both need a device test.
- LiveKit prices come from aggregators, not livekit.io. No battery measurement of WebRTC audio on an iPad was found.
- The share of links that need TURN depends on players' networks and wasn't researched.
