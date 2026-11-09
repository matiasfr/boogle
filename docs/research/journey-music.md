# Journey music: a crossing worth listening to

> **Verdict:** Prove one owner track against the crossing before building a music system.
> **Top recommendations:** 1. Prove one owner track against the crossing before building a music system. 2. Make highlights occasional and keep player control.
> **Status:** open. No decision cites it yet.

*Research report, 2 November 2026. Music as the reward of a long train ride, and an arrangement that changes as friends connect the world. Studies Death Stranding, Journey, Sable, Wipeout, Hi-Fi Rush, Tetris Effect, Rez, Forza Horizon radio, Grand Theft Auto, Cyberpunk, Sayonara Wild Hearts, Big Walk and Fortnite. Builds on [audio-and-music.md](audio-and-music.md), [train-riding.md §20](train-riding.md#20-death-stranding-and-snowrunner-rides-as-journeys) and [vast-world-scale.md](vast-world-scale.md); does not reopen their general audio, vehicle or world-scale briefs. Recommendations, not owner decisions or an implementation.*

**Verification.** Following [sea-crossings.md](sea-crossings.md), **[V]** means the source was fetched and supports the attributed statement; **[S]** means search-only evidence, a guide, a forum or a reporter's paraphrase. A fetched interview verifies what its speaker said, not the game's source code. **[C]** marks this checkout's inspected code or owner decision; **[D]** marks a proposal, calculation or inference. No games were played, recordings auditioned, GDC videos watched or devices benchmarked for this report. API documentation is not an iPad measurement. External sources are linked beside their claims; internal links identify the implementation a recommendation would touch.

## Summary

- **[D]** Let a song briefly become the foreground when a familiar piece of the owner's music meets an expansive view. Keep the player free to look, move, honk and leave. Music must improve a good ride, not justify a longer commute.
- **[D]** Treat a highlight, a sparse travel arrangement and silence as distinct choices. A returning player should sometimes hear the place without a build-up announcing the same drop again.
- **[D]** Schedule the reveal backwards from the train's timetable. Change the arrangement's length when the train gets faster; keep the track's tempo and groove intact.
- **[D]** Network growth should change a small set of musical roles, with a recognisable motif across eras. It should not add another simultaneous stem for every rail segment or player.
- **[D]** First prove one existing That Franco track on `?proto=crossing`. Commission a small stem kit only after that works. This checkout contains no track to use yet.

## 1. What is binding, and what actually exists

**[C]** [DESIGN.md](../../DESIGN.md) makes the relevant tests clear: **Toys before chores**, automatic cooperation, drop-in play, and leaving something for the next visitor. A musical reward cannot require a rhythm score, a party waiting together, or extra time on a train. [Find the fun, step 7](../plans/find-the-fun.md#7-does-a-long-crossing-feel-vast) is the existing crossing experiment, not a request to build a soundtrack system now.

**[C]** The newer [owner decisions](../decisions.md) supersede several ideas in the earlier reports:

- The default crossing is about a minute, nominally 1.2 km at 20 m/s. The owner found 4 km at 50 m/s a novelty that could become annoying; 50 m/s over 1.2 km belongs nearer the endgame.
- The audit retains **six eras**: wood; steam; iron and harbour; diesel and concrete; electric; future. The older eight-era music and speed ladders are not the current commissioning list. Opening-day ceremonies and the mayor framing are parked.
- In **Sound**, the owner cut all five synthesized groove takes, keeping the clock, mixer and stem loader for their own music later. **No placeholder music plays.** The cut whistle, clacks, freight thumps, stoke, grind, soapbox and era-call sounds do not return as musical percussion. Honk chords stay; NPC babble exists.
- Sitting on a train is desired with the real train and final character animation. It does not authorize a forced side-on camera for a song.

| Inspected surface | Current fact | Consequence for this report |
| --- | --- | --- |
| [Crossing line](../../src/proto/crossing/line.ts), [tuning](../../src/proto/crossing/tuning.ts) | Stops are 24 m from either end; acceleration and braking count. Default moving time is 64.27 s, express 29.29 s, vast 85.29 s. | Compose to moving time, excluding station dwell; do not use distance divided by cruise speed alone. |
| [Crossing train](../../src/proto/crossing/train.ts), [adapter](../../src/proto/crossing/index.ts) | Its advancing `clock.t` is local to this tab. The prototype has no music. | A shared-world music clock cannot simply be attached to this local train and assumed aligned. |
| [Groove clock](../../src/proto/groove/clock.ts), [grid](../../src/proto/groove/grid.ts) | Retained mapping from shared seconds to audio time; harmony and swung sixteenth grid, currently measured from time zero. | Useful parts, not a running transport. A crossing needs its own cue epoch and section position. |
| [Stem loader](../../src/proto/groove/stems.ts), [asset instructions](../../assets/audio/README.md) | URL discovery and parallel fetch/decode; manifest has BPM, bars, chords, layers and four layer states. Missing files are skipped. `assets/audio/` contains only its README. | No verified owner track, BPM, key or stems; no existing sequencer, tail player, cache budget or strict bank validation. |
| [Audio mixer](../../src/render/audio.ts) | Music, ambience, SFX, UI and voice buses; gesture-unlocked context; music/ambience ducking; global mute/volume. Music bus starts at −13 dB. | Reuse it. The mixer is here, not in a fourth `groove/mixer.ts` file. A separate music-volume setting is not yet present. |
| [Network prototype](../../src/proto/net/index.ts), [town stages](../../src/proto/net/stages.ts) | Laid sites use shared rules, but town stages and several economy values are still prototype-local saves. | “Music reflects the shared network” is a future mapping, not proof that a complete authoritative progression system already exists. |

## 2. Findings by source: what to borrow

### 2.1 Death Stranding: let the song become the subject

**[V, primary composer interview]** Ludvig Forssell identifies the vocal tracks, including Low Roar, as central to Death Stranding's musical identity in [Kojima Productions' interview](https://kojimaproductions.jp/en/strands_of_harmony_interview). This supports preserving an artist's recognisable song rather than reducing everything to an interchangeable ambience layer.

**[V, scholarly close reading]** Andra Ivanescu's [*A Playlist for the Apocalypse: Popular Music in Death Stranding*](https://bura.brunel.ac.uk/bitstream/2438/27903/3/FullText.pdf), especially PDF pages 7–8, describes songs introduced at particular moments, then continuing while the player retains control. A less prominent interface, expanded framing and reduced effects foreground the music. The paper treats these moments as recurrent and central; it does **not** establish a rare-event cooldown algorithm or the game's exact trigger logic.

**[D] Boogle:** use one strong musical passage at a view, with room around it. Do not import Sam's hardship, forced camera framing or a claim that scarcity alone made Death Stranding work. Our quiet-repeat rule below is a proposed answer to repeated commuting, not a reverse-engineered Kojima system.

### 2.2 Journey: write for the player who lingers

**[V, composer account]** In [*From Journey to Erica*](https://awintory.medium.com/from-journey-to-erica-214355002896), Austin Wintory describes area-specific solutions. An early bass-flute melody plays once, leaving texture if the player takes longer. Later music can loop and shed elements rather than repeat its full statement indefinitely; another player can introduce instrumentation. The composition follows the place and the player's progress, not one universal intensity machine.

**[D] Boogle:** a neutral four-bar holding section may extend a ride; a riser cannot. After a highlight, remove the melodic foreground and eventually return to silence. Another connected place can supply a musical voice without making eight riders eight times louder.

### 2.3 Sable: distinguish a departure song from an ambient loop

**[V, composer interview]** Michelle Zauner describes “Glider” as a major leaving-home moment, distinguishes memorable pop writing from loops that must tolerate repetition, and discusses day/night biome music and close collaboration using game builds. [The Verge interview](https://www.theverge.com/2021/9/23/22688375/sable-soundtrack-music-composer-japanese-breakfast-interview).

**[D] Boogle:** ask for two functions: a recognisable crossing hook and a companion arrangement that can tolerate another ride. Do not demand that one chorus perform both jobs.

### 2.4 Wipeout: the owner's musical identity is an asset

**[V, co-creator account]** Nick Burcombe recalls playing Mario Kart with its music muted while “Age of Love” peaked at the finish, and the importance of electronic music to Wipeout's conception. The account also describes adapting an Orbital track for the disc. [PlayStation's history with its creators](https://blog.playstation.com/2017/06/07/how-the-iconic-wipeout-series-was-born/).

**[D] Boogle:** That Franco's house and UK garage can give the railway a specific identity. This source does not establish that Wipeout dynamically moves every drop to a finish line. Boogle needs an explicit timing solution rather than hoping every journey happens to meet the best part of a song.

### 2.5 Hi-Fi Rush: author the grid, but keep Boogle's controls free

**[V, developer oral history]** Tango's [Xbox Wire oral history](https://news.xbox.com/en-us/2023/10/04/hi-fi-rush-exclusive-oral-history/) describes choosing musical direction alongside levels, with BPM, instruments and references in the brief. The team found loop points in licensed music and anticipated transitions that could cut through a vocal phrase; sometimes music looped or an animation lengthened to make the join work. This is authored transition work, not just a BPM label.

**[D] Boogle:** verify the owner's bounce against its actual bar markers and usable edit points. A constant-tempo electronic master is convenient; if it contains tempo automation, retain a marker map or select a constant section. Adapt the music without lengthening the ride. Movement, jumping, grabbing and honking remain responsive without beat accuracy; only decorative replies and musical entrances wait for a grid.

### 2.6 Tetris Effect: compose with the view in the loop

**[V, composer account]** Hydelic describes a music-to-visuals-to-music iteration cycle, numerous rejected versions for Deep Sea, and different rhythmic choices for energetic and calm stages. The final relationship came from iteration, not one preset labelled “synesthesia.” [Hydelic on PlayStation Blog](https://blog.playstation.com/2020/05/28/inside-the-creation-of-tetris-effects-original-soundtrack-out-today/).

**[D] Boogle:** send the producer a real-time crossing capture with departure, view and arrival marked. Compare their track against that capture before asking for six eras. This source does not verify an exact latency or quantization rule for every Tetris action; those remain outside this report's claims.

### 2.7 Rez: musical answers can join a shared backing track

**[V, translated creator interview]** Tetsuya Mizuguchi describes arranging effects against subdivisions of an underlying beat and a prototype in which repeated hits changed the backing track. He also explains that quantization alone was insufficient. [Denfaminicogamer interview, part 3](https://news.denfaminicogamer.jp/english/170612/3?noamp=mobile).

**[D] Boogle:** a honk can sound compatible with the song and receive a small musical answer. Do not turn every pickup into a compulsory drum hit, or convert construction into a score-attack rhythm game. A coherent backing arrangement must work before reactive notes are added.

### 2.8 Forza Horizon: radio is a different promise

**[V, publisher sources]** The [2024 Forza review](https://forza.net/news/forza-year-in-review-2024) describes Horizon Wave as a curated synthwave station with 21 songs and a host. [Forza's accessibility documentation](https://support.forza.net/hc/en-us/articles/4409280058259-Forza-Horizon-5-Accessibility-Support) lists separate radio, car, dialogue and ambience levels. Neither document explains the radio's internal sequencing or race-loop rules.

**[S, player report]** A [Forza forum complaint](https://forums.forza.net/t/please-remove-the-annoying-looping-effect-and-unfair-censorship-in-fh5/565089) objects to extended repetition. It is useful as a failure hypothesis, not evidence of a particular engine implementation or representative player sentiment.

**[D] Boogle:** curated radio could later make a familiar commute pleasant, but always-on choice and rare authored highlights are different features. Start with highlights and a music-volume control. Do not build a station catalogue to compensate for one overplayed loop.

### 2.9 Grand Theft Auto: keep radio and adaptive score conceptually separate

**[V, institutional co-announcement]** [Film at Lincoln Center and Rockstar's GTA V music event](https://www.filmlinc.org/press/fslc-and-rockstar-games-to-host-a-live-music-event-panel-discussions-to-exa/) distinguishes its original dynamic score from radio programming and DJs, including Flying Lotus and Gilles Peterson. It establishes the two musical roles, not the implementation of transitions between them.

**[D] Boogle:** an eventual train radio plays songs because the player chose to listen; a world-growth score changes because the place changed. Give them explicit priority and never sum a full radio song with a full adaptive bed. This research recommends only the latter's small crossing experiment now.

### 2.10 Cyberpunk: the commute can carry music across contexts

**[V, shipped patch documentation]** [Cyberpunk 2077 update 2.1](https://www.cyberpunk.net/en/news/49597/update-2-1-patch-notes) added rideable NCART travel and Radioport listening on foot and on the metro. Radioport continues vehicle-radio listening and yields when quest-specific music plays; it has a volume control.

**[D] Boogle:** define what owns the music before adding sources. One crossing cue should survive a harmless hop on the same deck, then yield at arrival or when the rider truly leaves. A future town cue must not compete with the crossing outro. This is a priority policy, not a reason to add portable radio now.

### 2.11 Sayonara Wild Hearts: ask for an authored passage first

**[V, composer postmortem]** Daniel Olsén describes composing music and effects together, repeatedly exchanging sections with Simon Flesser, and developing supplied guitar and vocal material into electronic arrangements while preserving its identity. [Simogo's composer account](https://simogo.com/work/sayonara-wild-hearts/daniel-about-sayonara-wild-hearts/).

**[D] Boogle:** the first deliverable should be a convincing minute, not dozens of decontextualised stems. Preserve the owner's hook, groove and transition judgement. Extract reusable parts after the passage works, and let the producer hear every permitted sparse combination.

### 2.12 Big Walk: music can belong to a place friends share

**[V, reproduced composer statement]** A report reproduces Luke Neher's explanation that House House wanted music to come from actual speakers in the world so nearby players hear it together, leaving communication central. This is an attributed statement, not a technical postmortem: [Explosion Network](https://explosionnetwork.com/house-house-explains-how-their-new-game-big-walk-works/).

**[V, artist release]** Neher's [Radio Blueprint release](https://aksfx.bandcamp.com/album/radio-blueprint-original-music-from-big-walk) labels pieces by times of day. Those labels alone do not establish how the game schedules or synchronizes them.

**[D] Boogle:** a later station speaker could make the town's musical identity tangible. The crossing highlight can remain a local score, with no distance attenuation. Do not build both first, claim sample-perfect peer playback, or crowd out voices merely because a source is diegetic.

### 2.13 Fortnite: fixed roles scale better than arbitrary additions

**[V, feature documentation]** [Fortnite Festival's launch description](https://www.fortnite.com/news/take-your-stage-in-fortnite-festival?lang=en-US) gives Jam Stage four roles—lead, drums, vocals and bass—with tempo, key and major/minor controls. Up to four tracks can be combined. That supports a small compatible role vocabulary; it does not document the underlying stretch algorithm.

**[V, event instructions]** The [Astronomical creator guide](https://www.fortnite.com/news/travis-scott-astronomical-content-creator-guide) describes a scheduled event and recommends arriving early. It establishes an appointment-based musical gathering, not its synchronization architecture.

**[D] Boogle:** borrow compatible roles and one clear shared musical climax. Reject appointment pressure: closing a network connection can alter later rides for everyone, including tomorrow's visitor. No one should miss the world's new musical identity because they were absent for a concert.

## 3. The crossing cue: when to begin, end and stay quiet

All values in this section are **[D] starting settings**, to be judged against the owner's crossing preference, not proven engagement numbers.

| Situation | Proposed behaviour |
| --- | --- |
| Waiting at the station | No crossing song. Prepare the chosen asset without holding the train for a download. |
| Departure | Leave roughly the first 6 s of a default ride for the place and friends. The existing HUD fade is related in mood, not the audio clock. |
| First ride on a new connection, or first ride after a major era arrangement change | Eligible for the authored highlight, if the listener has music enabled and the assets are ready before the start deadline. |
| Familiar outbound ride | Usually silence; occasionally a sparse instrumental travel arrangement. Never silently restart a full hook each time the rider steps on the platform. |
| Immediate return | No repeat of the same highlight. Let the return feel like inhabiting a place already reached. |
| Arrival | Remove rhythmic foreground by the stop; allow a musical release/tail for at most 4 s. Do not delay disembarking to finish a song. |
| Rider genuinely leaves, falls away or changes route | Fade in about 0.5–1 s. A brief jump on the same train must not retrigger or chop the cue; use ride identity and short exit grace, not raw contact every frame. |
| Late boarding, late join or slow download | Enter a safe sparse phrase if enough ride remains, otherwise stay quiet. Never play a missed build and drop in a catch-up burst. |
| Tab suspension, seek or interrupted context | Invalidate pending starts, resample the train/audio relationship, and resume only at a safe future phrase or remain quiet. |

**After the tenth ride.** Start with at least two quiet departures between full highlights and a ten-minute per-route highlight cooldown. First exposure to a genuinely new connection or era can bypass that cooldown once; stepping off and on cannot. These are caps, not a promise to play every third ride. Keep a small local listening history by cue/route revision; count a highlight as heard after eight audible bars, so a failed load or immediate fall does not consume it. Muting must not accumulate delayed rewards. After two distinct arrangements have been heard, silence is a valid alternative to inventing more random combinations.

Repeated rides should reveal changed context: the same motif over a fuller town, a new counterline after a junction, or a quieter return. Randomly shuffling harmony and instrumentation is not sufficient variation. The owner's track must still sound authored. Evaluate rides 1, 2 and 10, including a session with conversation; do not judge only the first cinematic recording.

**Co-op policy.** World progress can select the arrangement for everyone while hearing history and volume remain local. On a future shared train, derive section position from the same route/departure identity; late listeners enter that position rather than restarting everyone else's song. Two friends may hear different subsets because one chose silence. No beat packets, music lockstep state, or requirement that everyone board together. This follows [DESIGN.md's state table](../../DESIGN.md) and [shared-time.ts](../../src/netplay/shared-time.ts); the existing local crossing is not yet such a shared train.

## 4. Fitting house and garage to the actual ride

### Phrase arithmetic, not a mandatory genre formula

**[V]** Ableton's [song-structure lesson](https://learningmusic.ableton.com/song-structure/song-structure.html) describes common groups of 4, 8 and 16 bars. **[D]** For this commission, 4/4 gives `seconds = bars × 240 / BPM`. These are useful edit boundaries, not rules that every house or garage track obeys.

| Phrase | 128 BPM | 132 BPM |
| --- | ---: | ---: |
| 1 bar | 1.875 s | 1.818 s |
| 4 bars | 7.500 s | 7.273 s |
| 8 bars | 15.000 s | 14.545 s |
| 16 bars | 30.000 s | 29.091 s |
| 32 bars | 60.000 s | 58.182 s |

**[D]** Start future original writing at **132 BPM**, comfortable for a skippy garage treatment with a house alternative. A half-time feel can serve early eras without changing the clock. **Preserve the existing track's native tempo in the first prototype**; 132 is a commissioning suggestion, not a discovered property of the owner's music. A house-first 128 BPM version is also natural, but 32 bars filling exactly 60 seconds leaves no room for quiet departure and arrival. Arrangement matters more than that numerical coincidence.

**[C + D]** The current line's moving duration is `(length − 48) / cruiseSpeed + cruiseSpeed / acceleration`, giving 64.267, 29.290 and 85.290 s for the three presets. [Line profile](../../src/proto/crossing/line.ts), [preset values](../../src/proto/crossing/tuning.ts). An illustrative default cut at 132 BPM is:

| Moving time | Music | Purpose |
| --- | --- | --- |
| 0–6.00 s | Quiet | Notice departure and the water. |
| 6.00–13.27 s | 4-bar intro | One recognisable texture, not the whole hook. |
| 13.27–27.82 s | 8-bar travel | Bass and groove settle; leave room for honks and conversation. |
| 27.82–35.09 s | 4-bar build | A finite promise; no indefinitely repeating riser. |
| 35.09–49.64 s | 8-bar drop/hook | The main view and the track's identity. |
| 49.64–56.91 s | 4-bar release | Remove foreground rather than end on a hard mute. |
| 56.91–64.27 s | Tail, then quiet | Hear arrival and regain attention for the destination. |

That is a **28-bar playable cut**, made of conventional four/eight-bar sections, not a request for a producer to write a strangely truncated club master. Deliver a 32-bar reference arrangement with an optional four-bar travel extension; the game can omit it. At 29 s, use roughly 12 bars: four-bar preparation, four-bar hook, four-bar release. At 85 s, extend neutral travel by one or two four-bar blocks or begin later; do not stretch the chorus to fill every second.

### Put the drop at the view when speed changes

**[D]** Name a **view interval along the route**, with a preferred drop point inside it. This is a landscape view the rider can choose to look at, not a forced camera turn. Before committing a cue:

1. Derive `Tview`, the predicted train-clock time at that route position, from the acceleration-aware timetable. [The current `timeAtS`](../../src/proto/crossing/line.ts) is an outbound inverse and includes dwell; a return leg needs a direction-aware inverse. Do not pass return travel through the outbound function unchanged.
2. Choose a cut with `N` bars before its drop. Its start is `Tview − N × 240 / BPM`. Map that instant into the AudioContext timeline and schedule ahead. For an existing bounce, use its measured drop offset in seconds instead of assuming a new bar layout.
3. If the resulting start would be before boarding, asset readiness or the quiet departure, choose a shorter authored lead-in. If none fits, skip the highlight. Never accelerate playback or change train speed just to rescue it.
4. Once music is playing, its bar grid is fixed. Choose a bar inside the view interval; do not continuously slide or restart the song as an ETA estimate changes.

**Worked example [D].** The default table's drop at 35.09 s corresponds to roughly route position `s = 659 m` under the current acceleration profile. That is a timing example, **not a verified beautiful view**. At 50 m/s, the train reaches the same position about 15.83 s after departure. A four-bar lead-in at 132 BPM could begin at 8.56 s, preserving quiet departure; a sixteen-bar lead-in could not. A twelve-bar short cut would end around 30.37 s, about 1.08 s after the express stop, within the proposed tail allowance if its rhythmic foreground has already released.

At cruise, a one-bar window occupies about **36 m at 20 m/s** or **91 m at 50 m/s** at 132 BPM. Prefer a view available for at least two bars. If the environment offers only a single exact instant and the score is already playing, arbitrary train timing and exact bar alignment cannot both be guaranteed. Start the cue at a different epoch, use an authored shorter transition, or accept a nearby musical accent within the view. Do not claim a quantizer solves this contradiction.

**Variable speed after departure [D].** Before the last four-bar build, extend a neutral holding loop at four-bar boundaries if needed. Once the build starts, commit to its drop. If a stop or major timing discontinuity moves the view outside the committed window, let the music resolve naturally and abandon the exact hit; do not repeat the build, scrub stems independently or jump backwards. Future transport may need this policy; today's crossing has a predictable preset speed rather than free throttle.

## 5. Music that grows with the network

**[D]** Keep three independent inputs: **era selects the sound palette; completed connections select available roles; the current ride selects which of those roles are audible now**. A fully developed network can still have a quiet departure.

| Durable world change | Musical consequence on a later eligible phrase/ride |
| --- | --- |
| First useful connection | A complete small arrangement: groove plus harmonic identity. The game must not sound broken until the player grinds out a bass stem. |
| Another destination becomes connected | An answering motif or bass variation identifies the wider route. |
| A junction links previously separate branches | Introduce a complementary counterline or new drum variation. |
| A connected town visibly upgrades | Replace a texture with a richer voicing; keep the familiar motif. |
| The ring closes or an era's key connection completes | One full authored statement becomes available on the next suitable ride; the new palette persists for absent friends. |

These are **role replacements or authored states**, not five endlessly additive layers. Cap the regular mix at four to six roles. More rail after the cap changes arrangement choices, register or timbre, not gain and voice count. Give each connection a stable musical role independent of the order friends build it; otherwise the tenth line could accidentally become ten bass parts. Pre-author valid combinations, including the quiet version, rather than expose every possible subset.

Read **confirmed applied world state**, never a queued `submitEdit` or every individual cargo deposit. Coalesce changes at the next eight-bar boundary; defer a major era-bank change to a new cue, with the old tail allowed to finish. Music remains Local and does not change inventory or progression. Before promoting the [network prototype's local town stages](../../src/proto/net/stages.ts), establish which canonical system owns those facts; do not synchronize its localStorage values by musical presence messages.

### Six eras, one identity

**[D]** These are timbre briefs for the six current eras in [decisions.md](../decisions.md), not six album commissions. First prove two contrasting palettes from one motif. Keep 132 BPM and compatible harmony during that test; early eras can feel slower through space and half-time phrasing.

| Era | Arrangement direction | What remains recognisable |
| --- | --- | --- |
| Wood | Plucked chord fragments, light hand percussion, a warm bass with audible harmonics; spacious half-time feel. | The same short melodic contour. |
| Steam | Softer swung drums, rounded chords and a restrained answering line. No resurrected whistle or rail clack. | Motif rhythm and harmonic cadence. |
| Iron and harbour | Tuned metallic mallets, wider voicing, a syncopated bass response. | Same motif, moved between instruments. |
| Diesel and concrete | Firmer house kick pattern, tighter low end, more midrange rhythmic weight. | The original hook still arrives at the view. |
| Electric | Skippy two-step drums, chopped chord responses and more mobile bass. | Same section boundaries and compatible tonal centre. |
| Future | Airier chord extensions, selective breaks and surprising gaps; maturity can mean more space. | A clear final reading of the motif, not simply the loudest mix. |

Don't keep all six banks decoded. Don't pitch-shift an entire old arrangement to manufacture a new era. Later tempo/key changes are possible between cues, with authored exits and entries; they are not required to communicate progress.

## 6. Browser implementation: what the retained pieces need

### Compare to standard engines

| Verified engine practice | Boogle equivalent and difference |
| --- | --- |
| **[V]** Unity's [`AudioSource.PlayScheduled`](https://docs.unity.com/en-us/engine/6000.0/script-reference/unityengine/audiosource/playscheduled) schedules against DSP time, allowing preparation before a transition rather than depending on the current rendered frame. | **[D]** Schedule `AudioBufferSourceNode.start(when, offset)` on the existing AudioContext. Do not start each stem from separate frame callbacks. Browser decoding and lifecycle still need handling. |
| **[V]** Unreal's [Quartz overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-quartz-in-unreal-engine) separates quantized audio scheduling from game-thread timing. | **[D]** Keep a small audio scheduler and a separate visual readout. Sample-aligned sources do not remove device output delay or synchronize two computers. No Unreal-like subsystem is needed for one cue. |
| **[V]** Godot's [`AudioStreamSynchronized`](https://docs.godotengine.org/en/stable/classes/class_audiostreamsynchronized.html) starts component streams together and offers per-stream volume. Its [audio synchronization guide](https://docs.godotengine.org/en/stable/tutorials/audio/sync_with_audio.html) distinguishes playback, mix and output timing. | **[D]** All active stems share one cue epoch and sample offset, with individual gains. Apply output-time knowledge when relating the audible beat to a visible view. Godot's supported stream count is not an iPad budget. |

This follows the [audio-design skill](../../.claude/skills/audio-design/SKILL.md) without adding FMOD, Wwise, another AudioContext or a second rendering loop. A future shared helper belongs outside `src/proto/` when normal gameplay uses it; prototype-only consumers stay dynamically loaded, respecting [AGENTS.md](../../AGENTS.md).

### Clock and loader audit

**[V]** [Web Audio scheduling guidance](https://web.dev/articles/audio-scheduling) uses a short timer to schedule audio ahead, rather than trusting timer callbacks as audible event times. **[D]** Begin with a 25 ms scheduling pass and 100–150 ms lookahead in the foreground, measure missed deadlines, and allow a longer preparation lead for decoding. Lead time for a visible reveal must also cover the output path: skip a start whose mapped audio time is already behind the render head. A large lookahead is not permission to delay direct input feedback by that amount.

**[C]** The retained clock estimates a mapping from [shared world time](../../src/netplay/shared-time.ts), which interpolates a 10 Hz simulation. The crossing instead advances a local clock through physics updates. **[D]** The first prototype needs a mapping from that local train clock to audio time, invalidated on pause, seek and discontinuity. Audio can advance through a render stall while the train's local simulation advances differently; assuming the original offset is permanent will produce drift.

**[V]** [`getOutputTimestamp()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp) relates an output sample's context time to a performance timestamp. It is not merely an alias for the render head. **[C + D]** Before reusing [clock.ts](../../src/proto/groove/clock.ts), review its truthiness check for timestamp fields—zero is a possible value—and its fallback selecting `outputLatency || baseLatency`: those properties describe different portions of the path, not guaranteed interchangeable totals. Prefer valid output timestamps; label any fallback estimate and measure it. Do not apply output compensation twice.

**[D]** Extend the manifest only when implementing the experiment. Required metadata beyond today's [loader](../../src/proto/groove/stems.ts): explicit asset/cue ID; native tempo or marker map; exact loop-body and tail boundaries; section entry/drop/exit markers; per-section harmony; decoded channel/sample expectations; and permitted layer combinations. Use sample positions referenced to the source rate, converted consistently to the actual AudioContext rate. The current single `bars` value and four state lists do not describe a whole short song with transitions.

The prototype must select its named owner asset explicitly. Today's alphabetical fallback and “skip failed stems” behaviour are unsuitable for an approved authored bank: a misspelled selection must not choose another track, and a missing required bass/drum stem must not produce an accidental alternate mix. Fail to silence, report a development diagnostic, and let the train leave. Make optional layers explicit. Track pending and active nodes so leaving or resuming cannot produce duplicate cues.

### Counts, formats and memory

**[V]** An [`AudioBuffer`](https://developer.mozilla.org/en-US/docs/Web/API/AudioBuffer) contains floating-point PCM; [`decodeAudioData`](https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData) decodes complete files and resamples to the context's sample rate. **[D]** Compression lowers transfer size, not decoded memory: `bytes = seconds × sampleRate × channels × 4`. Count the actual channels and rate, not the source WAV's bit depth.

**[D] Calculated examples at 48 kHz and 132 BPM**, excluding tails, encoded input, decoder workspace and nodes:

| Decoded bank | Approximate PCM memory |
| --- | ---: |
| One 60 s stereo reference cue | 21.97 MiB |
| Four stereo stems, each 8 bars / 14.55 s | 21.31 MiB |
| Six stems: two mono + four stereo, each 8 bars | 26.63 MiB |
| Same six-stem bank, 16 bars | 53.27 MiB |
| Six stereo stems, each 60 s | 131.84 MiB |

An eight-bar six-stem bank with two-second tails adds about 3.66 MiB. Two such banks during an era change are about 60.6 MiB before overhead. Sharing unchanged buffers between arrangements is preferable to decoding duplicated kick and bass exports.

**[D]** Count overlapping tails as voices: six roles can briefly require twelve playing buffer sources at a loop seam. Keep at most two banks resident during a handover, and let the old cue release before starting the new full arrangement. Measure the actual source count and audio interruptions; six musical roles is not a claim of six nodes or a proven CPU ceiling.

**Proposed budgets [D], not measured device limits:** zero music payload required for initial play; first compact bank at most **2 MiB compressed**; normally **four roles**, up to **six** for a highlight; music PCM at most **40 MiB steady / 80 MiB during a transition**. Log decoded bytes separately from total page memory. Evict an old bank after its final tail; bound decode concurrency instead of launching every era through the current `Promise.all`. Background download completion must not force playback. If a bank would exceed the cap, load fewer authored sections or use a single bounce, not arbitrary missing stems.

**[D] Delivery distinction:** archive **48 kHz, 24-bit WAV** stems and a stereo reference. Derive browser files separately. Start with **AAC-LC `.m4a`, roughly 160 kb/s stereo or 80 kb/s mono**, subject to audition; ten channels across the six-stem example total roughly 1.45 MB for eight bars before tails/container overhead. **[V]** [WebKit's Safari 18.4 notes](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) document Ogg Opus/Vorbis support on the corresponding Apple platforms. That makes Opus a candidate, not proof that a particular file decodes and loops correctly on the target iPad.

Compare each decoded compressed asset with its WAV reference for first onset, body duration, padding and seam. Equal file durations do not prove phase alignment; lossy encoding can complicate exact boundaries. If a tiny prototype's compressed seam is unreliable, use a lossless short asset while measuring the transfer cost. Do not fetch six full-length club mixes and call them stems.

**Tails [D].** Schedule the next loop body at its exact musical boundary while the previous tail releases. A tail must not contain another loop's dry kick/bass. Keep delay/reverb ownership explicit so shared returns are not counted twice. All stems use the same rounded loop-body sample count for that bank; a fractional ideal bar duration must not be rounded independently per layer. Use a common boundary calculation across repetitions, rather than accumulating separately rounded durations. Crossfades need listening: an equal-power overlap of correlated material can gain-bump; it is not automatically a clean edit.

### What must be measured on iPad

**[C]** [audio.ts](../../src/render/audio.ts) already unlocks/resumes audio from gestures. **[D]** Use that route; don't construct a context during asset discovery. Test Safari on the target M4 iPad Pro, both normal and installed app presentation if supported, with built-in speakers, wired output and Bluetooth separately. Record OS/browser version, context sample rate, reported latencies, cold decode time, deadline misses and audio interruptions. Bluetooth results must not become a universal “iPad latency” number.

Use a marked audio transient and visible marker in real-time capture to estimate audible-versus-visible alignment, stating the capture method and its error; OS screen capture may not represent the acoustic speaker/Bluetooth path. Aim initially for a repeatable reveal hit within **±50 ms on built-in/wired output**, a proposed acceptance target rather than a claim that the web always achieves it. If Bluetooth misses it, a broad view window should still work. Direct input feedback remains immediate; never require timing skill to compensate.

Exercise mute, first gesture after the cue deadline, background/foreground, headphones reconnecting, a render hitch, leaving the train and repeated rides. The pass condition includes no bursts of overdue notes, no second copy of the song, no forgotten buffers and no audible click at a section join. These listening/device checks have **not** been performed by this research.

## 7. Honks, effects and the mix

**[C]** [Honk](../../src/features/honk.ts) already communicates a small reliable event and detects nearby combinations. Its base pitch/chord selection is separate from the song; a second note uses a fixed 125 ms delay. [audio.ts](../../src/render/audio.ts) exposes note-snap and beat hooks, while [grid.ts](../../src/proto/groove/grid.ts) can parse chords and find nearby chord tones. Keeping these hooks is not evidence that song-aware harmony is installed.

**[D]** For the first experiment, **pitch-match the honk while leaving its attack immediate**. Select the active chord at the note's scheduled musical position, including section/loop offset; the human-readable key alone is insufficient. Use a restricted register and compatible chord tones so the existing three-honk response does not collapse into three unison notes. Outside a cue, retain today's honk harmony. Do not change [social simulation](../../src/sim/social.ts) to follow local audio or add pitches to existing wire messages.

Only later try a quiet decorative reply on a swung sixteenth or straight eighth. At 132 BPM a straight sixteenth is 113.64 ms; with `swing = 0.58`, the longer interval is about 131.82 ms. Waiting that long can make a direct honk feel late even before device latency. Today's fixed 125 ms second note also isn't a tempo-derived subdivision. Keep action acknowledgement immediate, and evaluate any musical echo by ear.

Swing belongs in one place: a bounced garage stem already contains its groove. The manifest's swing informs synthesized replies; it must not re-swing the audio. Leave footsteps, collisions and other tactile events at contact time. Pitch only sounds that benefit from a stable note; noisy impacts do not all need to become instruments. Do not restore the owner's cut train sounds to fill rhythmic gaps.

**[D] Mix brief:** retain the existing bus/duck arrangement. Use about **−18 LUFS integrated and no more than −1 dBTP for an isolated full-cue reference** as an initial delivery target, then balance its actual in-game level by ear through the music bus. This is a proposed reference level, not a rule that every stem or final game mix should be normalized there. Keep stem relationships intact; summing the supplied stems should reproduce the supplied reference mix before intentional runtime trims.

**[C]** The existing voice duck is about −9 dB, with roughly 30 ms attack and 250 ms release time constants; the master uses a compressor, not a guaranteed true-peak limiter. **[D]** Audition full music with several honks and babble; adjust the mix instead of relying on that compressor to rescue overload. A −13 dB music-bus setting is a starting implementation value, not evidence the track is balanced. Keep bass harmonics audible on small speakers, preserve space for midrange voices, and avoid excessive stereo-only cues. Separate music volume from master volume before general release; no modal permission or forced listening step.

## 8. Evidence limits that affect the decision

- **[C]** There is no owner music file in this checkout. No track name, BPM, key, loudness, stem availability or rights clearance was inferred from unrelated creative files. Asset selection is a dependency of a future prototype, not a reason to substitute stock or synthesized music.
- **[V/S]** Sources establish artistic intent and several shipped behaviours; none establishes Death Stranding's complete trigger logic, Forza's precise loop algorithm, Fortnite's stretch engine or sample-accurate Big Walk peer playback. No such architecture is copied by assumption.
- **[D]** The suggested 132 BPM, chord palette, cooldowns, decoded budgets and ±50 ms target are hypotheses. The geometry at `s ≈ 659 m` is a computed timing example, not an inspected sightline. A still cannot establish musical timing or fatigue.
- **[C]** Shared progression and the local crossing clock need distinct integration work. This report neither promotes prototype town state to Lockstep nor changes any existing message, state or op.
- This commit is documentation only. It does not complete a gameplay checkbox in `find-the-fun.md`, enable a prototype, or ship sound.

## 9. Numbered recommendations for Boogle

1. **Prove one owner track against the crossing before commissioning a system.** Use an approved existing stereo bounce, native tempo and measured drop marker on [`?proto=crossing`](../../src/proto/crossing/index.ts); missing asset means silence. Serves **Toys before chores**; do not restore the cut groove in [Sound](../decisions.md#sound-listening-pack-audit-2026-11-01).
2. **Make highlights occasional and keep control.** Start after departure, release at arrival, and test two quiet rides plus a ten-minute route cooldown between repeat highlights. Bind eligibility to ride identity and local listening history, not platform contact or forced camera changes in [crossing/index.ts](../../src/proto/crossing/index.ts).
3. **Schedule backwards from a view, with shorter cuts for faster trains.** Use the [line timetable](../../src/proto/crossing/line.ts), an authored reveal interval and explicit pre-drop markers; test the 64 s, 29 s and 85 s [presets](../../src/proto/crossing/tuning.ts). Never stretch the track or slow the train to fit it.
4. **Write a short arrangement with safe extension and exit points.** Commission a 32-bar reference at a proposed 132 BPM, yielding a 28-bar default cut and a 12-bar express cut; extend neutral four-bar travel, never an endless riser. Add section metadata beyond the [current stem manifest](../../src/proto/groove/stems.ts).
5. **Let completed connections change four to six musical roles.** Map confirmed connection/town milestones to authored variations, with constant mix headroom; don't add a stem for every track segment or cargo delivery. Verify ownership of [network prototype state](../../src/proto/net/index.ts) before using it as shared progress.
6. **Carry one motif through the six current eras.** Prove wood and electric palettes first; keep tempo/harmony compatible initially, then replace timbres and grooves rather than multiplying voices. Follow the current audit in [decisions.md](../decisions.md), not the historical eight-era list.
7. **Reuse the mixer and audit the clocks before playback.** Give the local crossing its own audio-time mapping, explicit cue epoch and cancellation on seek/resume; review timestamp validity and latency fallback in [clock.ts](../../src/proto/groove/clock.ts). Music stays Local, with no beat traffic or second AudioContext.
8. **Budget short banks and reject incomplete mixes.** Target four normal/six peak roles, ≤2 MiB first compressed bank and 40/80 MiB steady/transition music PCM; validate the explicit asset choice, loop bodies and tails, and evict old banks in a successor to [stems.ts](../../src/proto/groove/stems.ts).
9. **Keep honks immediate and harmonically compatible.** Use the current song section's chord for local pitch matching; reserve quantization for optional decorative replies. Preserve [honk.ts](../../src/features/honk.ts) responsiveness and existing messages, and leave [social.ts](../../src/sim/social.ts) independent of local music.
10. **Mix for friends and small speakers.** Route through [audio.ts](../../src/render/audio.ts), retain voice ducking, audition the summed mix with honks/babble, and add independent music volume before general release. Keep the owner's cut effects cut.
11. **Require real-time listening and iPad evidence before expanding.** Inspect rides 1, 2 and 10, all three speeds, interrupted playback and built-in/wired/Bluetooth output. Use the existing [look harness](../../dev/look/evals/crossing.ts) for the scene and a verified audible capture for timing; follow [AGENTS.md's test diet](../../AGENTS.md), with no new UI unit tests or scenario for this local feature.

## 10. One-page brief to the owner as producer

**That Franco — write the moment when a line you built carries you somewhere worth looking at.** It should feel like your house/UK garage, relaxed enough for friends to talk over, with one passage that makes them look up. We want your hook and your swing. A bigger network should reveal another part of the same musical identity.

**First, send an existing track.** Pick one approved stereo bounce with a passage you want in Boogle. Keep its native BPM/key; give us a clean start and the exact drop/bar marker. A 30–60 s passage is enough. We will try it against the real default crossing before asking you to write anything new. No placeholder music fills the gap.

**If the moment works, write one small kit.** Suggested starting point: **132 BPM, 4/4, D minor**, with F major as a relative colour, not a required modulation. Try an eight-bar cycle of `Dm9, Dm9, Bbmaj7, Bbmaj7, Fmaj7, Fmaj7, Csus2, Csus2`; replace it freely if the hook wants something else, but document the actual chord for each bar. For new garage material, try **56–58% sixteenth swing**, baked into the performance. The game will not straighten it or swing it twice. The existing track does not have to match this suggestion.

**Arrange 32 bars:** 4 intro, 8 travel, 4 optional travel extension, 4 build, 8 hook/drop, 4 release. Omitting the optional extension gives the 28-bar crossing cut, about **50.91 s at 132 BPM**, following roughly 6 s of quiet departure. Also print a **12-bar express edit**: 4 preparation, 4 hook, 4 release. Supply a neutral four-bar hold with no escalating riser and an exit that feels intentional. The full reference should be satisfying before we mute any layer.

**Six roles maximum:** (1) kick, mono; (2) bass, mono; (3) hats/shaker/snare, stereo; (4) chords/pad, stereo; (5) lead or vocal hook, stereo; (6) counterline/transition texture, stereo. Start with four roles if that says enough. Print reusable bodies at **8 bars**, with four-bar fills/holds and authored transitions separately. A 16-bar melodic phrase may span two bodies; mark which halves must stay in order. Approve a sparse combination as well as the full mix. Keep useful bass harmonics for iPad speakers.

**Delivery:** aligned **48 kHz / 24-bit WAV**, identical bar-one start and named loop-body end, plus clearly marked tails up to **2 s** where practical. Include stereo references and a cue sheet with BPM, key, per-bar chords, swing, sample markers, permitted combinations and stem gains. Do not normalize stems separately. Bake essential kick-driven sidechain into the affected stems using a silent trigger if needed, so muted kick does not alter the bass envelope; keep shared FX ownership explicit. Supply stems without the nonlinear master loudness chain, and a matching unmastered sum reference. An optional listening master around **−18 LUFS / ≤−1 dBTP** is a starting reference, not the stem target. Browser encoding is our separate task.

**Scope:** one track, one motif, then two palettes—wood and electric. Six eras can wait until those sound good in the game. Leave arrival and some repeat rides quiet.

## 11. Smallest prototype: an existing track on `?proto=crossing`

**Gut question:** does hearing this particular That Franco passage at this view make the ride feel like a reward, including after the novelty wears off?

**Prerequisite [C].** The owner supplies or identifies the approved existing bounce and its native tempo/drop marker; there is no usable asset in `assets/audio/` today. Do not invent a filename or silently search unrelated archives for a supposedly approved track. This is a specification for a later implementation, not an asset request blocking this research commit.

**Build only this [D]:**

1. Add one explicitly selected stereo excerpt and cue metadata through [the audio asset area](../../assets/audio/README.md). A roughly 60 s stereo buffer at 48 kHz costs about 22 MiB, acceptable for the first proposed budget. Do not require stems, source separation, a radio, era logic or new world state.
2. Add a dynamically loaded local music module under [the crossing prototype](../../src/proto/crossing/index.ts), using the existing [audio context/music bus](../../src/render/audio.ts). Preload near the station; if unavailable at the scheduling deadline, that ride stays silent. Use the track's measured lead-in to its drop, not a fabricated 132 BPM grid.
3. Mark one actual view interval after looking at the existing route. Derive its arrival time from [line.ts](../../src/proto/crossing/line.ts); schedule the source once against the local train clock. Use another approved starting point in the same bounce for express if needed, or omit its highlight if the musical cut cannot fit. Do not alter geometry, camera, speed or controls for the first comparison.
4. Expose a development-only comparison in the existing proto controls/query handling: quiet versus timed cue, plus a repeat-history reset for evaluation. Production eligibility still prevents stepping off/on from restarting it. Fade on genuine departure from the train; clear scheduled nodes on seek, context interruption and teardown.
5. Update the existing entry in [protos/protos.ts](../../protos/protos.ts) with the gut question and one line on the music experiment, and [crossing's game-design file](../game-design/crossing.md) when this behaviour is implemented. Do not mark it built in this report.

**Listen before expanding.** Compare quiet and timed-cue runs at default and express speed, then use vast to expose overlong holding. Listen through ten default departures with the proposed quiet-repeat policy; record which rides actually played a highlight. Repeat with honks and babble, with a mid-ride jump/fall, mute/unmute, a missed preload and a background/resume. Use [the existing crossing look setup](../../dev/look/evals/crossing.ts) for framing and real-time motion; separately confirm the recording contains the actual audible game output. A successful PNG capture cannot validate a drop.

Record the view interval, scheduled drop time, observed audible alignment, decode/memory figures and whether the hook still feels welcome on the later eligible ride in [playtests.md](../playtests.md). The agent implementing it should listen and inspect artifacts before asking the owner for an artistic verdict. Pass means the default cue resolves before arrival, express sounds intentionally shorter, controls stay immediate, silence is comfortable, and interruptions do not produce clicks or duplicate playback. If the cue only makes an otherwise tedious crossing tolerable, return to the crossing design.

**Only the next experiment** needs stems: reuse four supplied roles from this same track and compare two manually selected arrangement states representing a small and a connected network. Keep that preview local; no new progression op. If those two mixes clearly communicate growth, then commission the two era palettes and connect the arrangement to verified world milestones.
