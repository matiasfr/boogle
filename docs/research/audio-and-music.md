# Audio and music: identity for a goofy co-op island in the browser

*Research report, 1 November 2026. How shipped games use adaptive music, beat sync, sparse and diegetic music, procedural sound, gibberish voices and comedy timing, plus the Web Audio facts (clocks, memory, formats, loudness) that decide what fits in a browser on an M4 iPad Pro. Written for an owner who produces house and UK garage. Sources were found with web search and, where marked, fetched and read. The search budget ran out before Civilization VI, Tetris Effect, GTA radio and Breath of the Wild's score could be checked further, so those rest on thinner evidence. No design decisions here; recommendations only.*

**Markers.** *Fetched*: I loaded the page and read the claim there. *Secondary*: seen only in a search summary or a third-party write-up, not the primary source. *Reasoning*: my own inference or arithmetic, not from a source.

## Summary

1. The best-loved adaptive scores react to a few **coarse states**, not to every event. Untitled Goose Game has three (silent, low energy, chased), A Short Hike swaps instruments by place, and both feel hand-scored.
2. **Silence is a state.** Goose is silent when nothing is happening, Breath of the Wild drops field music, and Animal Crossing keeps its music sparse. With 1–3 evenings per era, music that waits for moments won't wear thin.
3. **Put sound effects in the music's key and on its grid** (Mario Galaxy, Rez, Hi-Fi Rush). Boogle's honk already uses a pentatonic scale, so tying it to the current chord and the 16th-note grid is a small step.
4. **One motif across all eras, re-arranged each time** (Animal Crossing's hourly music, Civilization VI's four era arrangements per theme). The eight technology eras line up with the history of electronic music, which plays to the owner's strengths.
5. **Make the world play the rhythm.** Mini Metro turns your network into the score, and Ape Out turns action into drumming. In Boogle, rail clacks, chuffs, hammers and the bell can be the rhythm section.
6. **Gibberish voices are cheap and loved:** Banjo-Kazooie's pitched syllables, Animal Crossing's Animalese, Undertale's per-character blips. The Boogler has text and no voice.
7. **Comedy comes from contrast and timing:** a harsh honk against gentle props (Goose), and music that stops for a beat on a mishap (Ape Out).
8. **Keep SFX procedural and stream the music.** Farnell's case and ZzFX show synthesis suits impacts, engines and whooshes, which is how Boogle works today. Music is a producer's stems. A decoded stereo minute costs about 23 MB of RAM, so stems should be short bar-length loops.
9. **The browser needs one shared clock.** Schedule on `AudioContext.currentTime` with a lookahead (the "two clocks" pattern), and derive the bar grid from the shared world time, so every player hears the downbeat together.
10. **Mix for the device:** about −18 LUFS for handheld, −1 dBTP peaks, and basslines that still read on tablet speakers. The owner's DAW workflow maps cleanly to a stem manifest plus an encode script.

---

## 1. Adaptive music: states, layers, transitions

**Untitled Goose Game (Dan Golding, House House).**
- *Fetched* ([Game Developer](https://www.gamedeveloper.com/audio/getting-goosey-with-debussy-creating-an-adaptive-score-for-i-untitled-goose-game-i-)):
  - Golding recorded two versions of each of six Debussy Préludes, one normal and one "low energy".
  - He split them into stems with reverb baked in, so a cut doesn't sound like a cut. He said it "just sounds like the piano is holding down the sustain pedal."
  - The game has three states: silent when the goose wanders, low energy when it plans mischief, active when it's chased. Transitions are instant, so every player hears a slightly different score.
- *Fetched, writer's description* ([Byteside](https://www.byteside.com/2020/10/dan-golding-untitled-goose-game-aria-interview/)): more than 400 stems, each about two beats long, picked on the fly.
- **Lesson:** a few coarse states and very short, tail-baked fragments make music that seems to follow the action without anyone scripting each moment. [big-walk-and-communal-endings.md](big-walk-and-communal-endings.md) section 2.3 already cites this; [story-and-finale.md](../proposals/story-and-finale.md) drafts "music as narrator" from it.

**A Short Hike (Mark Sparling; Adam Robinson-Yu implemented it).**
- *Fetched* ([PlayStation Blog](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/)):
  - Sparling handed over an annotated map of where each layer should play.
  - "Instruments will fade in and out depending on where you are, creating variations on the main theme."
  - Strings come in while you fly, and trumpets swell as the motorboat speeds up.
- *Fetched* ([ResetEra repost of an interview](https://www.resetera.com/threads/interview-with-the-creator-of-a-short-hike-on-the-art-style-music-a-possible-sequel-and-breath-of-the-wild-being-a-huge-inspiration.308638/)): Robinson-Yu says Sparling "created unique layers for each piece that fade in and out depending on where you are."
- **Lesson:** vertical layering keyed to **place and vehicle**. A tiny island with vehicles is exactly Boogle's shape. The composer's annotated map was the whole spec.

**Banjo-Kazooie (Grant Kirkhope, Rare).** *Secondary* (search summary of Kirkhope interviews): it was an early vertical-remix game, where layers fade by location. The audio budget was about 2 MB compressed on the cartridge.

**Wwise transition practice.** *Secondary* (search summaries of [Audiokinetic](https://www.audiokinetic.com/learn/videos/GZl_vPeGz6I/) material and the [Wwise CUBE chapter](https://gameaudioresource.com/2019/08/28/chapter-20-music/)):
- Transitions resolve at a sync point: the next beat, the next bar, or a custom cue.
- The exit cue sits at the end of the musical body, and the tail plays out after it.
- Keep transitions to about a bar. A custom cue in the middle of long segments makes them respond faster.
- **Lesson:** "switch on the next bar, let the tail ring" is the standard pattern. It's about 60 lines of Web Audio code; Boogle doesn't need middleware for it.

## 2. Beat sync: the world on the grid

**Hi-Fi Rush (Tango Gameworks).**
- *Fetched* ([Game Anim, from CEDEC 2023](https://www.gameanim.com/2023/09/08/hi-fi-rush-music-synced-animation/)): animation was authored at 120 BPM and 60 fps with "key poses hit on the beat", and "all elements were matched to the BPM and could be sped up and down in sync."
- *Secondary* ([GameSpot review](https://www.gamespot.com/reviews/hi-fi-rush-review-good-vibes-only/1900-6418023/), [a third-party summary of a John Johanas talk](https://github.com/nick-vas/Godot_TestSuite/pull/60)): attacks land on the beat even when the press is early or late. On-beat play is rewarded, and the game never shows "miss" text.
- **Lesson:** snap the *result* to the beat, not the *input*. It feels musical and never punishes. This fits Boogle's principle 10 (slapstick over precision).

**Rez (United Game Artists, sound by Keiichi Sugiyama's team).** *Secondary* ([Giant Bomb](https://giantbomb.com/wiki/Games/Rez), [GameSpot](https://www.gamespot.com/reviews/rez-review/1900-2838815/)): every lock-on and shot makes a sound "tonally aligned with the music and synched up with the beat". Shots release on time, so you can't play off the beat. I didn't confirm the grid resolution.

**Super Mario Galaxy (Masafumi Kawamura, Nintendo).** *Secondary* ([Iwata Asks, Galaxy sound team](https://iwataasks.nintendo.com/interviews/wii/super_mario_galaxy/2/0/), seen through a search summary because the page's certificate failed to load; [Wikipedia](https://en.wikipedia.org/wiki/Super_Mario_Galaxy_Original_Soundtrack)):
- The team synced effects to the music by reading MIDI data alongside the streamed track, a technique built up on Wind Waker and Jungle Beat.
- The Star Ring harp lands on the beat, and effects take their notes from the track's key.
- A [Game Audio Lookout article](https://medium.com/game-audio-lookout/musical-sound-effects-in-the-super-mario-series-b14872fb2d94) says later Mario games go further and follow tempo and chord changes. It returned 403, so this is secondary too.
- **Lesson:** a **chord-per-bar table** published alongside the music lets every sound effect pick a note that fits.

**Tetris Effect (Tetsuya Mizuguchi, Enhance).** *Secondary* ([PC Gamer](https://www.pcgamer.com/japan-week-mizuguchi-on-the-magic-of-tetris-effect/), [Wccftech](https://wccftech.com/interview-tetsuya-mizuguchi-synesthesia-tetris-effect-rez-lumines/)): music is core to the design. Mizuguchi counts it as a failure if players think it's "Tetris with good music". I couldn't verify that piece sounds are quantized, because the search budget ran out.

**Sayonara Wild Hearts (Daniel Olsén, Jonathan Eng, Simogo).**
- *Fetched* ([Simogo](https://simogo.com/work/sayonara-wild-hearts/daniel-about-sayonara-wild-hearts/)):
  - The team discussed "almost every section and transition in every level", so music and visuals "take turns to lead".
  - Arpeggios and glittery sounds run through both the effects and the songs. Olsén likes projects where "the lines between music and sounds are blurred".
- *Secondary* ([NPR](https://www.npr.org/2020/09/14/908365152/sayonara-wild-hearts-pop-music-lockdown-depression-recovery)): Olsén wrote less than a minute of music at a time and sent it to be laid under a level in progress.
- **Lesson:** a producer and a level builder working in short loops of a minute or less. That is how a DAW sketch can become a prototype the same evening.

## 3. Sparse music, time and place

**Animal Crossing (Kazumi Totaka, Taro Bando).**
- *Fetched* ([2001 developer interview, shmuplations](https://shmuplations.com/animalcrossing/)):
  - The game has 199 songs.
  - The team rejected acoustic music for the field as "too relaxed". They chose synth sounds arranged in an "acoustic" way.
  - Rooms stay silent until you switch something on.
  - Bando recorded over 500 sound effects, including 100+ footsteps for different terrains.
  - Footsteps mix with rivers and waterfalls: "there's music hiding in all these spaces".
- *Secondary* ([Billboard interview with Totaka](https://www.billboard.com/culture/lifestyle/animal-crossing-composer-new-horizons-music-interview-9390953/), via search summary):
  - The music cuts what isn't needed, to leave room for imagination.
  - One melody runs, in some form, through every hourly track and through the sound effects.
  - Fan analyses say each hour also has rain and snow variants.
- **Lesson:** a theme tied to the clock and the weather tells returning players "time passed here" (principle 9). One recurring melody gives the whole game an identity.

**Breath of the Wild (Hajime Wakai, sound director).**
- *Secondary* ([GoNintendo](https://gonintendo.com/archives/300029-zelda-breath-of-the-wild-sound-designer-on-finding-the-right-music-for-the-game-and), [Nintendo Everything](https://nintendoeverything.com/breath-of-the-wild-composers-on-changing-up-zeldas-music-formula-and-more/), search summaries): the open field has almost no music by design, leaving it to ambience and scenery. The piano was chosen as an instrument you couldn't carry.
- *Fetched* ([Zelda Universe](https://zeldauniverse.net/2017/03/15/part-two-of-the-making-of-breath-of-the-wild-discusses-open-air-game-scale-and-sound-design/)): "The sound of Link's steps is a constant for the player". The team even made a sound for a Bokoblin picking its nose.
- **Lesson:** in an exploration game, footsteps and ambience carry most of the sound. Sparse music makes the moments it does play count.

**Death Stranding (licensed Low Roar and Silent Poets songs).** *Secondary* ([Line of Best Fit](https://www.thelineofbestfit.com/features/articles/death-stranding-hideo-kojima-soundscapes), [48 Hills](https://48hills.org/2019/12/meet-low-roar-hideo-kojimas-favorite-bay-bred-indie-rocker/)): full songs score set-pieces and quiet stretches of travel, coming in when the coast is clear. I found no source for the exact trigger rules.
- **Lesson:** a *whole song* that arrives rarely, during travel, is a memorable reward. For Boogle that could be the first ride after an opening day.

## 4. Systems that sing what you built

**Mini Metro (Rich Vreeland / Disasterpeace).** *Fetched* ([postmortem](https://disasterpeace.com/blog/mini-metro.postmortem.html)):
- Each line is a loop of same-pitch pulses with one pulse per station; the station's shape sets the timbre.
- Occupancy sets dynamics, and screen position sets panning. One in-game hour is 0.8 s of pulse.
- Most sounds are procedural (random variations on sine samples through effect chains); trains and a kick drum are sampled.
- Audio fed back into the game: the music clock paces passenger spawns.
- Regrets: the line rhythms didn't mean anything in gameplay terms, and the system could only do steady pulses.

**Lesson:** your network, sonified, makes the thing you built audible. That is close to Boogle's rails (what's laid is the ride). Map data to sound with simple, consistent analogies.

**Ape Out (Matt Boch).** *Fetched* ([MusicTech interview](https://musictech.com/features/interviews/ape-out-matt-boch-game-soundtrack/)):
- Composed loops were dropped because enough of them to stay reactive would have bloated the file size.
- A neural net generated hours of drum MIDI, which plays through sampled kits (7 velocity layers × 12 round-robins).
- Intensity follows the violence. When you're shot, the drummer "stops for a couple of beats". A cymbal crash comes with a screen shake.
- If a new pattern can't cue yet, hits on the current one get harder, so it still feels responsive.

**Lesson:** a stop or a fill on a mishap reads as comedy and as feedback. "Play harder until the next bar" covers the wait for a quantized change.

## 5. Music across eras

**Civilization VI (Geoff Knorr).** *Fetched* ([Wikipedia](https://en.wikipedia.org/wiki/Civilization_VI)): each civilization has a "core melody" in four variations that change with the era the player is in. The instrumentation per era wasn't on the page, and the search budget ran out before I could check further.

**Animal Crossing** (above): one melody across all the hourly music.

**Boogle's draft.** [story-and-finale.md](../proposals/story-and-finale.md) already sketches "a band that sounds like the era (an accordion in era 1, brass and steam whistles in era 3, a synthesiser in era 7)". *Reasoning:* Boogle's eras run from wood to maglev, and the electric eras overlap with the history of house and garage. One possible mapping:
- era 6 (electric): drum machines and early house;
- era 7 (monorail city): 2-step garage;
- era 8 (maglev): future garage.

The owner can make that arc credibly. It is an option, not a decision.

## 6. Big shared moments

**Fortnite's Astronomical (Travis Scott with Epic).** *Secondary* ([Wikipedia](https://en.wikipedia.org/wiki/Astronomical_(Fortnite_event)), [Billboard](https://www.billboard.com/pro/travis-scott-fortnite-billboard-cover-story-interview-2020/), [Pollstar](https://news.pollstar.com/2020/05/14/game-changer-how-travis-scotts-astronomical-fortnite-performance-could-be-the-years-biggest/)):
- It was a roughly 10-minute scripted show, run at set times across time zones.
- During it, players could fly and swim, which the normal game doesn't allow.
- It took over a year to make.

**Lesson:** a scripted moment on the shared clock, where the music drives the world and players get a temporary new verb, becomes the thing people remember. Boogle's opening day already runs as a scripted moment that late joiners see in sync (vertical-slice.md, "The scene"). It's the natural place for this, at a far smaller scale.

## 7. Voices without voice acting

- **Banjo-Kazooie.** *Fetched* ([Game Developer](https://www.gamedeveloper.com/audio/how-i-goldeneye-i-s-composer-used-tech-limitations-to-create-an-iconic-sound)):
  - The team recorded single-syllable noises and played them at random pitches as characters spoke.
  - "At the time, we all thought it sounded so terrible", and players loved it.
  - *Secondary:* a mechanical whale reused Banjo's samples pitched way down.
- **Animal Crossing.** *Fetched* ([shmuplations](https://shmuplations.com/animalcrossing/)):
  - Real voice synthesis spoke too fast to match the subtitles.
  - Bando reasoned players only needed "the feel and tone", so the team invented an animal language and filed a patent on it.
  - *Secondary* ([Nookipedia](https://nookipedia.com/wiki/Animalese)): Wild World mapped each letter to a random syllable. Later games went back to synthesis, pitched differently for each language.
- **Undertale.** *Secondary* (fan tools and [an analysis piece](https://thesolarprincess.substack.com/p/undertale-dialogue)): one blip per revealed character, a different sound per speaker, silence on spaces, and pauses at punctuation. Fans agree on each character's "voice" without any voice acting.

**Lesson:** text speed, pauses, and a pitch and timbre per speaker make a voice. About 20 recorded syllables, or a small formant synth, would do for The Boogler and every helper.

## 8. Comedy in sound

**Untitled Goose Game (Em Halberstadt).** *Fetched* ([A Sound Effect](https://www.asoundeffect.com/untitled-goose-game-sound/)):
- "The harshness of the honk is made funnier by the subtlety and niceness" of the props and character sounds.
- The honk changes with context: down a well (echo), through a walkie-talkie (EQ, an impulse response, static, plus a button click so the goose seems to press it on purpose), through a harmonica (her own bad notes layered with honks).
- Props share grab, release, impact and drag sets, recorded on three surfaces.
- Each prop's impact reads impact velocity through its own pitch and volume curve, tuned by dropping things over and over, with per-prop instance limits and cooldowns.
- For a collapse, the team asked for a cartoonish feel (a Simpsons reference); she gave it heavy muffling. A desk collapse got extra weight because "the Goose doesn't actually destroy much".

**Lessons:**
- The base world sounds gentle so the silly sound stands out.
- The same gag sounds different in different places.
- Impacts follow velocity curves, which Boogle's ball "boing" already does (`src/features/impact.ts`).
- Ape Out (section 4) adds the musical version: stop for a beat.

## 9. Procedural versus samples

**Andy Farnell.** *Fetched* ([Designing Sound interview, 2012](https://designingsound.org/2012/01/18/procedural-audio-interview-with-andy-farnell/)):
- "Not enough CPU" is a straw man: his 2005 demo ran fire, water, wind, rain, footsteps and vehicles on a 533 MHz CPU.
- Procedural sound is strongest where memory or bandwidth is tight, and where sound must encode changing information. His example is a car whose sound tells you its speed or size.
- It's "a complimentary technology and not a replacing technology". Sound designers should direct the aesthetics.
- Successful work mixes samples, granular and resynthesis.
- Fluids, impacts and engines suit synthesis best.

**ZzFX (Frank Force).** *Secondary* ([GitHub](https://github.com/KilledByAPixel/ZzFX)):
- A sound generator of about 1 KB with ~20 parameters per sound, MIT-licensed, made for js13k.
- ZzFXM is a companion music renderer of under 500 bytes ([Keith Clark](https://keithclark.co.uk/articles/zzfxm/)).

**Boogle today** (read from the code):
- Every sound is synthesized live: honk, ping, ball boing, wagon clack and whistle, era bell, the build prototype's thump.
- They play through one shared `AudioContext` in `src/render/audio.ts`: master gain, then a compressor, with iOS `audioSession.type = 'playback'` and unlock on the first gesture.
- There are no buses, no music and no samples. Each feature builds its own oscillators.

**Lesson:** Boogle is already on Farnell's side for SFX. Its gaps are a shared vocabulary (a tiny synth-preset layer so sounds share a character) and a mixer. Samples earn their place for voices, crowd reactions and the music itself.

## 10. Web Audio technical facts

**Timing ("A tale of two clocks").** *Fetched* ([web.dev](https://web.dev/articles/audio-scheduling)):
- Never start musical events straight from `setTimeout`. The main thread stalls for tens of milliseconds on layout and garbage collection.
- Instead, a timer wakes about every 25 ms and schedules everything due in the next ~100 ms on `AudioContext.currentTime`. The audio thread then plays it on time even while the main thread is stalled.
- Visuals read `currentTime` too, so they line up with what you hear.

**Long audio and memory.**
- *Fetched* ([MDN best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)): use `<audio>` with `MediaElementAudioSourceNode` for long tracks, since it streams and doesn't hold the decoded track in memory. Use `AudioBuffer` for short sounds.
- *Reasoning:* an `AudioBuffer` stores 32-bit float samples.
  - At 48 kHz stereo, one minute is 48,000 × 2 × 4 × 60 ≈ **23 MB**.
  - An 8-bar loop at 124 BPM lasts 15.5 s and costs ≈ 6 MB decoded. Six stems of that are ≈ 36 MB.
  - Sample-accurate layering needs decoded buffers, because media elements can't be started on a sample-exact grid. So **short bar-length loops** are what make stems affordable.
  - Compressed, at 96 kbps, a minute is ≈ 0.7 MB.

**Formats on Safari.** *Secondary* (WebKit bugs [238546](https://bugs.webkit.org/show_bug.cgi?id=238546) and [226922](https://bugs.webkit.org/show_bug.cgi?id=226922), [AppleInsider](https://appleinsider.com/articles/21/08/10/apple-adds-webm-web-audio-support-to-safari-in-latest-ios-15-beta), a project doc):
- WebM Opus in `decodeAudioData` has been inconsistent across Safari versions. It is reported consistent from about 17.4 and works for stereo on recent iOS.
- `canPlayType` has disagreed with what actually decodes.
- Safari 18.4 added the Ogg container for Opus and Vorbis.
- AAC in `.m4a` is the long-standing safe choice. Test on the device rather than trusting `canPlayType`.

**Autoplay.** *Fetched* (MDN): create or resume the context inside a user gesture. Boogle already does this. Players should get a mute control and a volume control.

**Loudness.** *Secondary* ([ASWG-R001 PDF](http://gameaudiopodcast.com/ASWG-R001.pdf) via summaries; the audio-design skill quotes the same figures):
- Portable target is −18 LKFS (±2), true peak −1 dBTP, measured over the full mix across about 30 minutes or more.
- Some phones lack the gain for quieter targets.
- The skill adds: −24 LUFS for TV and speaker play, and streaming-music targets like −14 LUFS are not game targets.

## 11. A producer's workflow, mapped to a web game (reasoning)

These pieces come from Golding (tails baked in), Wwise exit cues and Sayonara Wild Hearts (short loops sent to the level builder), applied to the owner's tools:
- **Stems from the DAW**: the same start, the same length in bars, one tempo per piece, and tails rendered past the loop end (or reverb baked into the loop, Golding-style).
- **A manifest per piece**: tempo, bars, key, a chord per bar (for sound effects in key), the stem files, and which coarse state turns each stem on.
- **An encode script** turning the DAW's WAVs into the shipped format (`ffmpeg`), plus a dev page that hot-reloads a new bounce.
- **Loops of 8 or 16 bars suit house and garage**, which are built from loops anyway. That's the genre's strength here: the music's own grammar is the adaptive system.

---

## What this means for Boogle

Each recommendation names the source idea and the smallest prototype that would test it. They follow find-the-fun's rules: solo first, behind `?proto=`, and one gut question.

1. **One shared music clock.**
   - Derive tempo, bar and beat from `sharedSeconds()` (`src/netplay/shared-time.ts`), so every player's downbeat lands together.
   - Schedule on `currentTime` with a ~100 ms lookahead (two clocks).
   - Publish "the current chord" and "the next 16th note" for any feature to read.
   - *Prototype:* `?proto=groove`, a synthesized four-on-the-floor kick and hats at one tempo, with no stems yet. Gut question: does the island feel more alive with a pulse, or noisier?
2. **Sound effects in key and on the grid** (Galaxy, Rez, Hi-Fi Rush).
   - Honk, ping, bell and pickups pick their notes from the current chord.
   - The *sound* snaps to the next 16th note; the action itself never waits.
   - The honk chord becomes a real chord.
   - *Prototype:* inside `?proto=groove`, the honk quantized and harmonized. Gut question: does honking with the beat make you honk more?
3. **Music by coarse state, with silence as a state** (Goose, A Short Hike, BotW, Animal Crossing).
   - Pick 3–4 states, for example alone and idle (silent or ambience only), working (low), riding (full), opening day (everything).
   - Change at bar lines and fade layers by place or vehicle; don't score individual events.
   - *Prototype:* one 8-bar house loop as 4 stems from the owner's DAW, with layers following the haul and wagon prototypes' states. Gut question: does it follow you, and is it still pleasant after 20 minutes?
4. **A motif that changes with the eras** (Animal Crossing, Civilization VI).
   - One short Boogle melody, re-arranged per era with that era's instruments.
   - The late eras could trace house into garage into future garage (section 5); the early eras could use hand percussion, steam and brass.
   - The opening day plays the transition from one arrangement to the next.
   - *Prototype:* the same 8 bars in three arrangements (era 1, era 2, era 7), swapped by `?proto=era`'s greybox switch. Gut question: does the island feel like it moved forward in time?
5. **The world plays the rhythm** (Mini Metro, Ape Out, Sayonara Wild Hearts).
   - Rail clacks, chuffs, hammers on work sites and the build thump become the percussion, locked to the grid when you're near.
   - Laid track could add a voice to the loop, so your network is audible.
   - *Prototype:* in `?proto=wagon`, set clack spacing so it lands on 8th notes at cruising speed, with the music's hats ducking while you ride. Gut question: is riding more fun with it?
6. **A voice for The Boogler** (Banjo, Animal Crossing, Undertale).
   - Per-letter syllables at a pitch and timbre per speaker, with pauses at punctuation, keyed to the existing text reveal.
   - Either ~20 recorded syllables (the owner's voice, pitched) or a small formant synth.
   - *Prototype:* `?proto=voice` on The Boogler's existing lines, with both options as `&v=samples` and `&v=synth`. Gut question: is it charming or grating after five lines?
7. **Comedy rules for sound** (Halberstadt, Ape Out).
   - A gentle base world so silly sounds stand out.
   - Context variants of the same gag (honk in a cave, honk on a moving wagon).
   - A beat of musical silence or a fill on a pratfall (face-plant, dropped bundle, a ribbon gone wrong on opening day).
   - *Prototype:* the face-plant (`src/features/impact.ts`) cuts the music's top layers for one beat and plays a fill. Gut question: does it make you laugh?
8. **Opening day as the music event** (Fortnite, Death Stranding).
   - The scripted ceremony is a build-up and a drop on the shared clock.
   - The first ride afterwards gets a complete track, played only then.
   - *Prototype:* wait until the greybox era swap passes its playtest, then score `?proto=era`'s swap with a 16-bar riser and drop.
9. **A small mixer before more sounds.**
   - Buses for music, SFX, ambience, voice and UI into the existing master compressor.
   - Duck the music under voice and the bell.
   - A mute toggle and a music-volume slider in the pause view.
   - Shared synth presets (in the spirit of ZzFX, written in our own code) so sounds share a character.
   - This is plumbing, not a prototype; the first one that needs music should bring it.
10. **Delivery and memory.**
    - Music as 8–16-bar stems in AAC (`.m4a`) by default; add Opus only if a device test on the target iPad passes.
    - Load each era's stems lazily.
    - Budget about 40 MB of decoded audio, checked on the M4 iPad Pro.
    - Use `<audio>` only for the rare whole-song moments, which don't need sample-exact sync.
11. **Mix for the iPad.**
    - Integrated around −18 LUFS, peaks ≤ −1 dBTP.
    - Check the mix on the iPad's speakers and in mono.
    - *Reasoning:* sub-bass doesn't carry on small speakers, so basslines need harmonics that still read without it (standard production practice, not sourced here).
12. **The producer workflow** (section 11).
    - A stems-plus-manifest format, an encode script and a hot-reload dev page, so a DAW bounce is audible in the game within a minute.
    - This is what turns the owner's main skill into iteration speed. Build it alongside recommendation 3.

## Not checked

The search budget ran out before these could be checked:
- Civilization VI's instrumentation per era.
- Whether Tetris Effect quantizes piece sounds.
- GTA-style radio as diegetic music.
- Breath of the Wild's piano (Manaka Kataoka) beyond search summaries.
- Nintendo's jingle practice in Wii Sports.
- iPad speaker frequency response.
- Current Safari codec behaviour from an Apple source.

A follow-up pass should start there.
