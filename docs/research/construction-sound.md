# Construction sound: materials, machines and a living railway

_Research report, 2 November 2026. How Boogle's logs, sleepers, rails, cranes, crystal supports, trains and inhabited places should sound. Live web research and inspection of checkout `5f8b9009`, grounded in the 1 November listening audit and the new railway direction. Recommendations and listening experiments, not an implementation or new owner decisions._

**Verification.** **[V]** means fetched primary text supports the statement; an interview establishes the speaker's account, not access to the game's code. **[S]** means secondary, translated/reproduced testimony, search-only text or a video index whose underlying demonstration was not watched. **[C]** means inspected repository code or recorded owner decision. **[H]** means a hypothesis, proposed setting or calculation. All uncited design prescriptions and numerical budgets below are **[H]**, not measured properties of the reference games or an iPad. No games, audio examples or GDC videos were auditioned in this research; no device performance or listening result is claimed.

## The bet

**Make the railway sound like matter being moved into useful places.** A log should announce its wooden body and the frame receiving it; a rail should ring, then become restrained by its fastenings; a crane should exert, stop and release. The town should subsequently sound inhabited because that delivery changed it. Musical coherence comes from recurring gestures, compatible resonances and space between events. It does not require a backing beat.

Serves [DESIGN.md](../../DESIGN.md) **1, Toys before chores; 4, Cooperation is automatic; 7, Telegraph everything; 8, Designed for drop-in, drop-out; and 9, Leave something for the next visitor**. Sound never introduces timing accuracy, hazards, upkeep or a reason to lengthen a job. Important consequences remain visible when muted. The first target is one station and one crossing, not six fully commissioned eras.

## 1. Binding decisions and the code we actually have

**[C]** The [sound audit](../playtests.md#2026-11-01-sound-audit-listening-pack) and [Sound decisions](../decisions.md#sound-listening-pack-audit-2026-11-01) retain the track machine, hut build, honk, prompt/deny, haul count, mini-game sounds and board whoosh. They reject every placeholder groove take, the old wagon whistle/clacks, freight/stoke/grind/soapbox sounds and opening-day soundscape. Wood ambience needs less white noise; pickup/magnet sounds should move toward Ratchet & Clank. Honks should vary and form chords together. Keep these as the reference condition in every comparison; a new train bank is a replacement proposal, not permission to turn the cut sounds back on.

**[C]** The [current decision log](../decisions.md) calls for physical assembly, materials visibly contributing, six eras, and towns growing from cargo. Its crystal direction is one carried crystal set by crane into an iron collar, then sections growing down toward the seabed with clicks, light and bubbles. This is not a built crystal system. The [rail-slice plan](../plans/rail-slice.md) is explicitly awaiting approval: its receiving-frame → cradle → track and freight → forge sequences are useful integration targets, not authority to implement its proposed rules.

| Inspected surface                                                                                                                                  | What exists; implication                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [audio.ts](../../src/render/audio.ts)                                                                                                              | One gesture-unlocked context; `music`, `ambience`, `sfx`, `ui`, `voice`; music −13 dB, voice −12 dB; music/ambience duck −9 dB during dialogue; global volume/mute; master compressor threshold −20 dB, ratio 6. No global voice allocator or true-peak guarantee. Reuse the graph.                                                 |
| [machine-sfx.ts](../../src/render/machine-sfx.ts)                                                                                                  | Camera XZ distance, squared fade to 45 m; no panning, height or obstruction. Sleeper: 95–115 Hz falling to 38 Hz plus low-passed noise. Rail: three triangle oscillators at approximately 1:2.76:5.4 plus noise, despite the “two” comment. Chuff: filtered noise. Completion whistle: three pitched oscillators, an LFO and noise. |
| [track-machine.ts](../../src/features/track-machine.ts)                                                                                            | Sleeper contact triggers `land()`; every other sleeper also clanks. Large catches-up are placed without falling sounds. This already supplies a useful landing seam; do not replace it with a timer unrelated to the pieces.                                                                                                        |
| [hut-build.ts](../../src/features/hut-build.ts)                                                                                                    | Landings, per-phase note ascent and phase chords already exist. `VOICES = 3` is three ordinary landing events per site per 0.3 s, with chords exempt; it is not a global concurrent-source cap. Distance uses player position, unlike machine audio.                                                                                |
| [clink.ts](../../src/render/clink.ts), [noise.ts](../../src/render/noise.ts)                                                                       | Shared modal strike/body/bounce and cached noise. A mixed wood/metal clink can schedule seven modes twice plus noise: **up to 15 sources**, before high-frequency/low-gain omissions. A logical “one sound” is not one oscillator.                                                                                                  |
| [honk.ts](../../src/features/honk.ts), [npc-voice.ts](../../src/render/npc-voice.ts)                                                               | Honk variations/chord response and formant dialogue exist. No music installs a beat snap today. NPC lines reuse a voice graph and explicitly disconnect it; preserve this economy and all Boogler copy.                                                                                                                             |
| [place/rail.ts](../../src/proto/place/rail.ts), [place/forge.ts](../../src/proto/place/forge.ts), [place/index.ts](../../src/proto/place/index.ts) | The prototype reuses machine thump/clank/whistle for many interactions, including assembly and freight. Add semantic material/contact identities at these call sites before globally changing a sound used by unrelated actions. Prototype economy remains Local.                                                                   |
| [crossing](../game-design/crossing.md)                                                                                                             | A ride prototype with no train sound beyond ambience. New rolling/traction audio can be compared against actual silence.                                                                                                                                                                                                            |
| [listening-pack renderer](../../dev/audio/render.ts)                                                                                               | Captures the real graph and records original peak/RMS, but exported takes are peak-normalized to −1 dBFS and one-shots trimmed. Peak normalization does **not** loudness-match different timbres; these exports cannot establish in-world mix balance or contact latency.                                                           |

### Relationship to the earlier reports

- [Audio and music](audio-and-music.md) supplies useful sources and ambience history, but its “no buses” baseline, eight-era arc and groove prototype recommendations are stale. A global pad is not the automatic answer to “less hiss.”
- [Collect sounds](collect-sounds.md) owns short reward arrivals. Keep their sparkle separate from construction weight; do not make a rail sound like a collected bolt. Its per-fourth-hit accents and ascending runs are not a mandatory grammar for forty sleepers.
- [Journey music](journey-music.md) owns the occasional That Franco crossing cue. Its links to `src/proto/groove/` are now historical: that directory is absent here, and [the design record](../decisions.md) names `archive/groove`. Recover only needed pieces later; the live mixer is still present.
- [Harvest feel](harvest-feel.md) separates contact from pickup and labels the online acknowledgement delay. Preserve that distinction; sound design cannot remove server scheduling latency.
- [Construction you can watch](construction-you-can-watch.md) supplies phase/contact staging. This report tests bounded pitch and quieter repeated tails instead of assuming every piece should keep climbing a scale. The kept hut is the comparison baseline, not a failed sound to discard.
- [Little guys](little-guys.md) and [growing towns](growing-towns.md) supply purposeful inhabitants and visible cargo causality. Sound should depict those actions without inventing a staffing simulation.

## 2. Findings from the references

### Tiny Glade: tactile sources, chosen for the gesture

**[V]** Martin Kvale describes real bricks, doors and planks, but also notebook pages for moving roof tiles and fingertips/chess pieces for fences. Four audio directions included instrumental and mouth-only versions; the team selected the physically grounded one, with playful substitutions. [Developer diary, 29 November 2023, full text in Steam's feed](https://store.steampowered.com/news/posts/?enddate=1701258211&feed=steam_community_announcements); [individual entry](https://steamcommunity.com/games/2198150/announcements/detail/3887232108503707092).

**[H] Boogle:** record small, controllable props to imply big objects. A handled plank and a resonant wooden box may communicate a sleeper better than a noisy railway field recording. The test is whether the sound belongs to the visible gesture, not whether the microphone faced the literal object. Preserve useful irregularities instead of replacing every attack with noise.

### Townscaper: a small answer can carry the whole toy

**[S, primary announcement available in search text; fetched page returned only an image]** Oskar Stålberg credits Kvale with the game's plops and blips and describes their increased pleasantness in [“Plop plop plop!”](https://steamcommunity.com/games/1291340/announcements/detail/2950386280138711217). It does not disclose sample counts, tuning or a synthesis recipe.

**[H] Boogle:** borrow the compact, rounded acknowledgement for logs finding their slot. Keep rail and crane sounds more material-specific. “Plonk” is a useful creative brief, not evidence that Townscaper uses a sine pitch dive or a pentatonic allocator.

### Astro Bot: texture and timing are part of the verb

**[V, director interview]** Nicolas Doucet describes refining sequences of jumps, punches and coins until their pace feels melodic, and explains the sound-based relationship between DualSense vibration and audible feedback. [One More Game interview, September 2024](https://onemoregame.ph/2024/09/astro-bot-director-nicolas-doucet-interview/).

**[H] Boogle:** aim for a readable lift → landing → settling sequence. An iPad comparison must work with haptics absent; do not compensate for missing controller vibration by turning up sub-bass. This interview supports integrated pacing, not an exact Astro Bot impact-frequency recipe.

### Ratchet & Clank: authored identity plus small real mechanisms

**[V]** Somatone's 2016 production account distinguishes Insomniac's supplied signature servos from Clank's Foley. Tools and scrap metal were tried, but handled kitchen forks and butter knives supplied the chosen body movement. This account covers their cutscene work, **not** a reverse-engineering of bolt pickups. [Somatone interview](https://somatone.com/the-audio-development-of-ratchet-clank/).

**[H] Boogle:** a crane can have a recognisable powered gesture over irregular little ratchets and cable movement. Keep the owner's Ratchet bolt reference for collection; use a heavier, less sparkly response when the same material leaves the bundle and becomes structure. Reusing a material family does not mean reusing the same reward sound everywhere.

### Zelda's Ultrahand: consistent success, variable physical consequences

**[V]** Hajime Wakai says the glue visual suggested a tangible sound; repeated attachment needed a consistent cue conveying readiness and accomplishment across object combinations. The team favoured texture over abstract sound. [Nintendo, Ask the Developer part 4](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-9-the-legend-of-zelda-tears-of-the-kingdom-part-4/).

**[V, session scope only]** Nintendo's [GDC 2024 “Tunes of the Kingdom”](https://gdcvault.com/play/1034667/Tunes-of-the-Kingdom-Evolving) documents a talk by Dohta, Takayama and Osada on physics and sound. Its accessible abstract does not establish the detailed collision/audio algorithms; the talk was not watched here.

**[H] Boogle:** one small “seated securely” gesture can unify construction, while material, size and receiver change the body. Crane pickup, attached load, swing, release and contact are separate states. Do not trigger an impact every physics frame or an attachment flourish on every collision.

### Death Stranding: infrastructure remains audible after completion

**[V]** Kojima describes players continuing to build highways years later and the sequel adding monorails for that interest. [PlayStation interview, May 2025](https://blog.playstation.com/2025/05/08/death-stranding-2-an-interview-with-hideo-kojima/). **[S, gameplay guide]** Upgraded structures can play selected music when approached. [Structure customization guide](https://www.gamesradar.com/death-stranding-holograms-how-to/). Neither source specifies the auto-paver's sound layers or mix.

**[H] Boogle:** split acceptance, physical assembly and useful operation. A forge's first clank should become its quieter recurring work identity. The enduring reward is hearing the railway do something, not repeating a giant completion sting on approach. Do not import a loudspeaker song at every structure or claim a Death Stranding printer recipe was verified.

### Factorio: machine accents, scale control and environmental relevance

**[V]** Wube's [FFF #396](https://www.factorio.com/blog/post/fff-396) describes short sounds keyed to animation frames, including twelve foundry accents, rather than forcing a working loop to follow every speed. Activity controls working layers; trains differ on elevated rails. Environmental sounds depend on relevant tiles/entities and time, with pauses. Aggregation limits or reduces duplicate sounds; player building receives higher priority.

**[H] Boogle:** keep the nearest machine's visible contact intelligible, replace distant copies with one restrained work bed, and stop it when work stops. The heritage railway should retain its own character after later machinery arrives. Richness comes from different actions and distances, not a source for every piston and sleeper across the map.

### Satisfactory: a factory occupies a space

**[V]** Coffee Stain's [1.1 update notes](https://store.steampowered.com/news/posts/?appgroupname=Satisfactory&appids=526870&enddate=1747071355&feed=steam_community_announcements) describe factory sounds muffled by foundations/walls, with different treatment for materials such as glass and metal. Indoor detection changes factory/player sound with the surrounding space; the HUB has its own setup. The same feed records a fix for excessive snapping sounds at railway blueprint connections: event admission matters alongside spatial richness.

**[S, developer-video index; demonstration not fetched]** Coffee Stain's [“Why does Satisfactory sound like that?”](https://www.youtube.com/watch?v=mYB5dR7Pl_s) has documented sections on Wwise, dynamic reverb, outdoor reflections and occlusion, with an off/on demonstration at 12:33. The [dated archive index](https://archive.satisfactory.video/2025-11-11/) provides these chapter boundaries. The video's actual processing and resource costs remain unverified here.

**[H] Boogle:** a workshop under a roof, exposed quay and gorge should not share one wet factory loop. Begin with authored shelter/space tags, gentle obstruction filtering and one shared short reflection return. Satisfactory's richer propagation is a reference to audition, not a justification for building ray-traced acoustics into Boogle now.

### Mini Metro and Dorfromantik: distinguish generative sound from calm sound

**[V]** Disasterpeace's [Mini Metro postmortem](https://disasterpeace.com/blog/mini-metro.postmortem.html) maps station count/order/type, occupancy and position to sound. It also records a limitation: line rhythm did not communicate enough meaningful gameplay, and the system largely supported steady pulses. Audio even influenced passenger timing. That last relationship is unsuitable for Boogle's Local audio and authoritative world separation.

**[V]** Dorfromantik's Timo Falcke says the most repeated interaction deserves satisfying animation and sound while preserving calm. [Developer interview](https://www.gamedeveloper.com/business/sparking-joy-through-tile-placement-in-idyllic-village-builder-i-dorfromantik-i-). **[S, primary portfolio text available in search; direct fetch timed out]** Its composer describes “Hofgarten” as inspired by a train journey through nature. [Felix Bachlinger's portfolio](https://felixbachlinger.de/). **No checked source establishes a Mini Metro-like generative music engine in Dorfromantik.** Procedural tiles do not establish procedural composition.

**[H] Boogle:** let heard activity mean actual activity; remove an audible role when the mechanism rests. Keep work rhythm pleasant without making a listener feel assessed or rewarded on every beat. Test musical work with all music disabled before combining it with a song.

### Pikmin, Animal Crossing and A Short Hike: life at different scales

**[V]** Pikmin 4 adjusts voices/footsteps with camera perspective and carrying sounds with group, type and environment. It explicitly sought a balance between impact and the creatures' smallness. [Nintendo developer interview](https://www.nintendo.com/us/whatsnew/ask-the-developer-vol-10-pikmin-4-part-3/).

**[S, translated primary interview]** Animal Crossing's Taro Bando describes field recording insects, numerous surface footsteps and their combination with water; sounds convey being in a place. [2001 sound-team interview translation](https://shmuplations.com/animalcrossing/). **[V]** A Short Hike's developer implemented Mark Sparling's annotated music map, fading instruments by location and adding layers during flight/boat acceleration. [Adam Robinson-Yu's account](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/).

**[H] Boogle:** a few feet, handoffs and brief exertions near the player do more than constant town babble. Locate each sound; activity beyond the camera can be heard without every visible resident vocalizing. Use a producer-annotated map for the station, shore, grove and crossing. This borrows A Short Hike's authoring method, not a requirement to play its kind of score continuously.

### Trains: source, surface and listening position

**[V]** Dovetail documents dedicated recording trips for locomotives and passenger-car details in its [Train Sim World 4 audio/source-trip report](https://live.trainsimworld.com/news/tsw4-roadmap-part2-24th-august). This establishes separate captured components, not a universal cab/trackside mix ratio. Factorio's activity layers and elevated-rail changes provide the stronger checked implementation precedent above.

**[H] Boogle:** author three perspectives—approach/pass-by, rider, distant route—using one train identity. Separate traction/load from wheel speed and structure resonance. Wheels continue while coasting; a motor should not sound fully loaded whenever speed is high. A rider hears stable deck/body texture, while the stationary listener hears an approach and departure. Do not play an additional exterior pass-by at full level on the same train's rider.

### Why a small procedural model can still convey weight

**[V, research abstracts]** Traer, Cusimano and McDermott report perceptually convincing material/mass/motion cues from a statistical contact-sound model without a full physical simulation. [DAFx 2019 author abstract](https://mcdermottlab.mit.edu/bib2php/pubs/makeAbs.php?loc=traer19). Qu and James identify cases where the receiving ground contributes perceptually important impact sound. [On the Impact of Ground Sound](https://arxiv.org/abs/1909.09235).

**[H] Boogle:** use object **and receiver**, with a few controlled parameters. These papers support the approach, not the exact frequency bands below. A material preset plus contact intensity and one recorded attack is enough to test; neither full modal mesh analysis nor audio-rate Rapier simulation is justified.

## 3. Five physical gestures: starting recipes

All bands, durations and variation ranges are **[H] audition settings**. The first attack belongs to the rendered contact, with no beat snap. Pre-mix fixed layers into one mono buffer when their independent runtime control buys nothing. Keep the kept machine/hut sounds available for level-matched comparison.

| Gesture                        | Body and material                                                                                                                                                            | Motion/settle; device translation                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Log into receiving frame**   | Dry wood contact, 2–5 ms attack; hollow 180–400 Hz body, 100–180 ms decay; restrained 0.8–2 kHz grain. Record log/plank against a separate resonant frame/box.               | One quieter secondary contact 25–60 ms later only if the piece rocks; short creak as the frame takes weight. Avoid a sub-drop that suggests an explosion.                                    |
| **Sleeper dropping**           | Broader, duller body around 160–300 Hz; short end-grain knock around 0.7–1.5 kHz; 120–220 ms total main body. Optional quiet low reinforcement for headphones.               | Dust/grit for ground, hollow knock for timber trestle. Make the receiver different without changing sleeper identity. The iPad must retain weight when the sub layer is muted.               |
| **Rail seating**               | A blunt metal contact plus sparse inharmonic ring, initially 450–1500 Hz for body and restrained upper modes. Start with a 250–450 ms ring.                                  | A fastening damps the tail; one 35–80 ms secondary rattle if visually warranted. Less 3–7 kHz energy than the current bright clank is a comparison, not a blanket EQ cut.                    |
| **Crane hoist and release**    | Ratchet/cable Foley, restrained geared or steam effort following **load and movement**, not only a pitch sweep. Start, sustain and stop assets/states.                       | A little tension creak before lift; brake/latch at stop; brief release; then material-specific landing. No impact on grab, and no motor loop when stationary unless the model visibly idles. |
| **Crystal section locking on** | Stone/ceramic or glass contact under an iron-collar clack; short modal “tik–konk,” with an optional consonant ring at 400–1200 Hz. Crystal stays mineral, not a reward coin. | Each visible section gets a restrained click/pulse; lower sections grow darker/quieter, ending in one larger settle. Bubbles stay soft and local; no giant underwater sub-boom required.     |

**Weight on iPad [H].** Give the first 30–80 ms a clear midrange mass cue, preserve a brief contrast before impact, and let the tail describe the object. A 38 Hz sine may help headphones but must not carry the whole message. Do not present a high-pass mockup as a measured iPad speaker curve: audition actual built-in speakers at normal and quiet volume, then headphones and mono. Avoid widening the attack to fake size; keep its mono identity, using a quieter reflection/settle for space.

**Intensity [H].** Use a bounded weak/normal/heavy presentation parameter from accepted action or motion. Raise gain only about 3 dB from normal to heavy initially, alongside a different attack/receiver response. A larger piece may ring lower and longer; increasing only bass and level makes every action a kick drum. Never derive conserved material counts from this parameter.

## 4. Make the fortieth sleeper welcome

**[V]** Godot's [AudioStreamRandomizer](https://docs.godotengine.org/en/stable/classes/class_audiostreamrandomizer.html) provides weighted selection, no immediate repeat, pitch and volume variation. This is a useful baseline, not enough by itself to prevent a distinctive recording repeating every few seconds.

**[H] Proposed variation policy:**

1. **Six to eight performed takes per frequent family**, with weak/normal/heavy tags. Start the smallest test with four; do not label them sufficient for hours of play. Shuffle without immediate repeats, including across bag boundaries, and exclude the previous two when the bank allows it.
2. Keep perceived size stable: ordinary wood/rail body pitch initially **±3%**, gain **±1.5 dB**, tail **±15%**. Vary transient, contact point and receiver first. Tonal sweeteners use the chosen pitch set with at most **±6 cents**, not random semitone drift.
3. **Do not jitter the main impact away from contact.** Vary the secondary rattle/bounce, and vary the animation only where it is already an authored cosmetic choice. The physical action supplies timing.
4. Thin repeated tails as density rises. At six or more contacts/second nearby, preserve the focal attacks, shorten or omit their decorative rings, and coalesce remote contacts in approximately **80 ms** windows. Do not queue skipped sounds for later.
5. Keep a familiar successful seating gesture; spend accents on actual phase changes. No louder fourth hit just because a counter reached four, no upward scale that turns the fortieth sleeper shrill, and no completion chord per log.
6. Group by semantic event and emitter: contact de-duplication prevents a settling physics body retriggering every frame. For free impacts, a **100–150 ms** retrigger guard plus a fresh-contact/intensity condition is a starting point; construction's accepted piece ID is stronger than a timer alone.

**Smallest fatigue comparison:** the same visible sequence of forty sleepers, unchanged camera/cadence, current sound versus four-take variation versus variation with shorter dense tails. Match perceived loudness in context; play at quiet iPad volume, then headphones. One question: **“Do you still enjoy the last ten?”** The implementing agent checks duplicate contacts, co-op bursts and missed frames separately. A favourable minute is evidence for the next test, not for an eight-hour fatigue claim.

## 5. Musical work without a music track

**[H] Keep three independent controls:** physical cadence, harmonic colour and actual score playback. With the score off, no hidden drums or pad should continue simply to make the world sound composed.

- **Cadence comes from the mechanism.** Sleeper → rail → latch is a short phrase because the assembly has those phases. For a cosmetic crane cycle, a roughly 55:45 long/short pairing can be compared with equal spacing, with visual and sound contact authored together. Do not force all machines into the same tempo or alter production rates to fit it.
- **Pitch belongs to selected resonances.** Start the experiment with a root/fifth/octave set; add a sixth or ninth only after the owner chooses a colour. Keep broadband wood attacks and most metal modes untuned. Use a repeating/returning contour within a narrow register, rather than endless ascent. Different machines occupy low body, middle knock and high latch roles, with at most three tonal work roles foregrounded.
- **Material first, harmony second.** A repeated rail can retain an inharmonic metal body while a much quieter resonant component agrees with nearby honks. Compare no pitch organization against this; an audible chord progression at every site is not automatically desirable.
- **Honks remain immediate and voluntary.** Use compatible chord tones/registers for the existing variations. When an approved song is actually playing, select from its active harmony; otherwise use the standalone honk palette. Do not route all contact through `onBeat()`, or let music change [social simulation](../../src/sim/social.ts).
- **Only optional replies wait.** A decorative answering latch or short tail can wait for a compatible subdivision if the visible gesture supports it. At 132 BPM, a sixteenth is about **114 ms**; that delay on a log landing is conspicuous. A scheduling lookahead is not feedback latency permission.
- **Work rests.** A stopped machine contributes nothing except an occasional physically justified cooling/settling sound. Farther activity becomes sparser, not a constant percussion loop. Another friend adds useful audible activity without adding a permanent musical stem.

This narrows the older “world on the grid” suggestion. Mini Metro deliberately changes simulation timing from audio; Boogle explicitly keeps sound Local. Use [Web Audio's clock-based scheduling](https://web.dev/articles/audio-scheduling) for future predictable accents, with a short replenishment pass; direct contacts start promptly. Cancel stale scheduled accents when the action stops or the context resumes.

## 6. A world with air, water, neighbours and history

### Layers and distance

**[H]** Use a stable listener position near the player's head for distance, with camera orientation for left/right. Compare this against camera position in the current 5.2 m third-person rig; choose one shared convention so circling the camera does not radically alter a log's loudness. Vertical distance matters for cranes and crystals. Protect the player's direct action from disappearing just because the camera backs away.

| Layer                                | Initial treatment                                                                                  | What keeps it alive                                                                              |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Air                                  | One very quiet, band-limited bed; slow gust envelopes, exposed coast stronger than sheltered yard. | Changes in exposure; intervals near silence. Not constant bright noise or a compulsory pad.      |
| Water                                | Nearest relevant shore/river wash, with discrete laps/surges over a subdued bed.                   | Irregular arrivals and different shore/height perspectives; do not spawn a loop per water tile.  |
| Immediate work, roughly 0–12 m       | Clear attack/body, moderate pan, little wet signal.                                                | The visible object and receiver; protected local feedback.                                       |
| Yard/town, roughly 12–45 m           | Softer attacks, shorter selected accents, low-pass darkening; only a few focal emitters.           | Real crane cycles, forge work and handoffs, with gaps.                                           |
| District, roughly 45–120 m           | One blended activity texture or occasional identifiable event.                                     | Replace detail with a district identity; do not sum every nearby machine.                        |
| Distant route, initially up to 250 m | At most one restrained train silhouette/approach at a time, selected from actual operating trains. | Appears and passes; no invented train if none runs. Beyond that, visual scale can remain silent. |

These are audition radii, not physical propagation claims. Start gain/low-pass changes over **0.3–1 s**, with entry/exit hysteresis. Use authored shelter/obstruction zones first; perform no raycast per voice per frame. At a ridge, reduce/directly filter the train rather than abruptly muting it. Open sea wants a dry perspective; a gorge may earn a single quiet reflection. One shared return, not reverb on every sleeper.

**[H] Little guys:** foreground at most two nearby residents' footstep/handling gestures and one short ambient vocal response; use group texture farther away. A load handoff gets a little effort and a hand/object sound, followed by silence. The dialogue voice remains distinct and readable. Keep the owner's formant approach; do not commission a syllable bank or duplicate the Boogler's dialogue. The first person finishing a conversation must not release ducking while another foreground voice still holds it: use a shared claim/count if overlapping speakers are introduced.

### Era changes replace roles

**[H]** Keep natural layers and old places recognisable; change the machinery people can actually see and use. Crossfade active work identities on a real upgrade/next activation, not an instantaneous full-world orchestra switch. No opening-day fanfare is reinstated.

| Era from the current decision log | New identity to test                                                                   | Restraint                                                                 |
| --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Wood                              | Handled timber, small iron fittings, rope/cable, light rolling.                        | Large enough to support the player; not all tiny toy clicks.              |
| Steam                             | Pressure, valve release and effort pulses around the same contact vocabulary.          | Fresh recordings/design; not the rejected wagon chuffs/whistle.           |
| Iron and harbour                  | Chains, thicker metal seating, hoist load, dock water.                                 | Keep clang tails bounded and leave speech space.                          |
| Diesel and concrete               | Compact engine/load texture, heavier receiver bodies, rubber/metal transitions.        | More midrange mass, not continuous sub rumble.                            |
| Electric                          | Smooth traction rise, relays, restrained wheel/rail and overhead detail where present. | Still mechanical and grounded; progress need not erase industry.          |
| Future                            | Sparse coherent resonances, precise locks and crystal/mineral identity.                | Not a louder science-fiction drone; the heritage loco can still be heard. |

## 7. Train mix: one crossing, three perspectives

**[H]** Replace the rejected train bank only after comparing fresh material to silence. Four roles suffice initially: **rolling**, **traction**, **structure/body**, **one transient** (brake, joint or departure cue). That is four admitted logical voices for the foreground train, not four voices per carriage.

- **Station approach:** gain and spectral openness rise with distance. One understandable arrival/departure cue if needed; it is transport information, not a hazard warning. No automatic horn every lap by default.
- **Riding:** rolling follows speed, traction follows effort, and intermittent deck/body movement supplies intimacy. At steady cruise, reduce the engine's foreground after departure. Air grows with exposure without turning into constant hiss. Hearing a friend honk must not require shouting over the locomotive.
- **Trackside pass:** one moving emitter near the train's acoustic centre plus a bounded body spread. Test modest Doppler only here; derive it from relative radial motion, smooth it, and suppress on teleports. No self-Doppler for the rider. Do not mistake a stereo pan for full acoustic simulation.
- **Rail joints and bridge seams:** cadence follows travelled distance and actual joints, **not every visual sleeper**. A 0.7 m sleeper spacing at 20 m/s would be about 29 events/second; that is texture, not a readable series of clacks. Use selected joints/structure transitions or a speed-layered rolling loop at cruise. This arithmetic is an example, not a measured Boogle joint spacing.
- **Bridge/gorge transition:** replace or blend a body-resonance layer rather than adding another full-volume train. A brief, quiet change when crossing a joint communicates surface. Avoid a persistent tonal ring that competes with a song.
- **Arrival:** traction releases before stop; rolling decays with speed; brake/settle completes the motion. Ambient shore and people emerge again. An optional [journey cue](journey-music.md) yields at arrival; familiar return rides may remain music-free.

When a highlight song is playing, lower sustained train/air masking by **3–6 dB** initially, leaving contact and honks legible. This is a musical scene choice, not permanent master pumping. Keep enough train identity that music-off travel sounds complete.

## 8. Mix architecture and actual voice accounting

### What standard engines do, and Boogle's smaller equivalent

| Checked primary documentation                                                                                                                                                                                                            | Boogle application / difference                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Unity Audio settings](https://docs.unity.com/en-us/engine/6000.0/manual/unity-editor/editor-settings-reference/comp-manager-group/class-audio-manager) expose separate real and virtual voice counts.                                   | Track audible allocations separately from logical emitters that still exist. A distant machine can retain phase/state without running a silent source graph. Do not borrow a desktop default as an iPad benchmark. |
| [Unreal concurrency](https://dev.epicgames.com/documentation/en-us/unreal-engine/sound-concurrency-reference-guide) supports maximum counts, per-owner restrictions, priority/quietest stealing, retrigger time and steal-release fades. | One small shared allocator before source creation; per-family and per-emitter caps; fade a victim instead of abrupt `stop()`. No full middleware dependency needed.                                                |
| [Godot AudioStreamPlayer3D](https://docs.godotengine.org/en/stable/classes/class_audiostreamplayer3d.html) exposes max polyphony, listener choice, distance attenuation/filtering and distance culling.                                  | A shared spatial helper replaces today's camera-versus-player inconsistency. Equal-power stereo is the initial output; HRTF is a later headphone comparison with a measured cost.                                  |

**[V] Web Audio distinction.** [The API specification](https://www.w3.org/TR/webaudio/) describes a node graph, not a portable guaranteed count of game voices. Output channel limits are not concurrent sound limits. [Buffer sources](https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode) are single-use; reuse decoded buffers and routing resources, create a fresh source for each playback. These documents do **not** certify “32 voices on iPad.”

**[H] Definitions and enforceable starting caps:** a **logical voice** is one admitted gesture/loop with a shared envelope and lifetime; a **source** is each scheduled/active buffer source or oscillator, including LFOs and delayed bounces. Track both, plus panners, filters and decoded bytes. Start at **24 steady logical voices, 32 peak; 96 scheduled/active sources total; 8 spatial panners; one shared short reverb return**. All are provisional M4 test ceilings. The source cap wins even if the event cap has room. Reserve capacity before expanding a multilayer gesture.

| Peak allocation                     | Logical slots | Admission rule                                                                                                             |
| ----------------------------------- | ------------: | -------------------------------------------------------------------------------------------------------------------------- |
| Local construction/harvest contacts |             6 | Protect the contact; sacrifice its decorative tail first.                                                                  |
| Other players/remote construction   |             4 | Nearest/most relevant, group duplicate family events.                                                                      |
| Machines                            |             4 | One detailed foreground machine; others reduced/virtual.                                                                   |
| Foreground train                    |             4 | Rolling, traction, body and a transient; no per-car multiplication.                                                        |
| Environment/town                    |             4 | Up to two beds plus two spot/group events.                                                                                 |
| UI confirmations                    |             3 | Short, protected, never repeatedly retrigger on held input.                                                                |
| Honks/voices                        |             3 | Foreground dialogue plus two social/group gestures; dense honks reduce timbral layers rather than erase chord tones first. |
| Optional music                      |             4 | Includes overlapping tails; a six-role highlight must borrow lower-priority slots explicitly.                              |
| **Total peak**                      |        **32** | Quiet scenes use much less; empty allocations are not reasons to play sound.                                               |

**[H] Source reserve:** keep **24 of the 96 sources** available to UI, the immediate local action and foreground voice/social responses. Everything else shares at most 72, reclaimable by priority. Future live voice chat is not included; re-budget when it exists. A six-note chord made from three oscillators per note already costs 18; a blended clink costs up to 15. Pre-render fixed modal/body combinations to short buffers or simplify decorative modes under load. Do not claim the current unmodified synths fit this budget automatically.

**[H] Priority:** immediate local confirmation and addressed dialogue → local material contact and nearby honk → visible near work/arrival → own train continuity → remote work → town/nature detail → optional tonal ornament. A highlight music cue is an explicit mix state; it does not erase direct feedback. Rate-limit ambient barks before they contend with dialogue. Eight friends doing things should sound busier, not eight times louder.

**[H] Stealing/lifetime:** compare semantic priority then post-distance audibility; steal a low-priority tail with a **5–15 ms fade**, leaving room under the hard source cap for release. Bound one-shot future scheduling to about **100 ms**; scheduled bounces count immediately. Stop/disconnect graphs and release accounting on end/cancel, including interruption/teardown. A virtual loop stores phase and resumes at the current phase with a fade; a culled one-shot is forgotten. Never replay a backlog after returning to a tab or walking toward a finished build.

### Buses, ducking and level

**[H]** Keep the five existing user-facing categories. Internally add only the subgroups needed for balance: `contact`, `machine/train`, and `social` under SFX; `natural` and `town` under ambience. Separate user settings gain from transient mix automation. The current dialogue duck affects music/ambience only; it cannot clear loud machine SFX. Test a **3–6 dB** reduction of sustained machine/train sound during addressed dialogue, about **30 ms attack / 300 ms release**, without ducking the local contact. Ordinary sleepers do not sidechain the whole island; only a rare major seating moment may briefly reduce its competing work layer by **2–3 dB**.

**[V]** [Sony ASWG-R001 v1.10](https://gameaudiopodcast.com/ASWG-R001.pdf) recommends −18 ±2 LKFS for portable platforms, ≤−1 dBTP, and measuring the complete mix over at least 30 representative minutes. It is Sony guidance, not an iPad requirement. **[H]** Use roughly **−18 LUFS integrated / ≤−1 dBTP** as a first portable mix reference, then judge quiet details and fatigue on the device. Do not normalize each effect or stem to this target or make every quiet scene equally loud.

**[H]** Set the ordinary local landing as the reference, then initially place work beds roughly **10–14 dB below** its short-window level, and natural beds **16–22 dB below**, comparing like measurement windows. These are listening trims, not bus values to paste into `MIX_DB`. Leave at least **6 dB summing headroom** in a busy pre-master test. Inspect the output with a true-peak meter. The current [DynamicsCompressorNode](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode) is a compressor with one input, not a guaranteed brickwall limiter or an external sidechain processor. Prefer explicit subgroup gain automation for ducking; do not solve every overload with a harder master ratio.

### Memory and iPad validation

**[H, arithmetic]** Decoded float PCM costs `seconds × sampleRate × channels × 4`, independent of encoded file size. At 48 kHz, eight mono half-second takes cost about **0.73 MiB**; six such families about **4.39 MiB**. Three 12-second stereo beds cost about **13.18 MiB**. A proposed **20 MiB SFX/ambience PCM bank** can therefore cover a modest station/crossing palette, excluding decode workspace and temporary copies. It is separate from journey-music's proposed **40 MiB steady music** cap: combined steady PCM would be **60 MiB**, not 40. Limit transition residency to **80 MiB combined**, unloading old banks before full new banks when necessary; this narrows journey-music's more generous transition allowance and needs measurement.

Load just the active material/era/area bank; never decode all six eras. Archive dry 48 kHz/24-bit WAV masters; choose browser delivery after decode/onset/seam tests on the target Safari. Short lossless hits are a reasonable first fixture; compression is a later transfer optimization, not a memory solution. The 20 MiB is a ceiling, not a loading-screen payload target.

**Smallest hardware check:** on the M4 iPad, play one 14 s build and one crossing while the scene renders, then repeat the busy station at 16, 24 and 32 logical voices with the same source policy. Record Safari/iPadOS, sample rate, active/scheduled-source peaks, memory, audible glitches and scheduling misses. Warm for ten minutes before choosing a tier. Test speakers and headphones separately; record Bluetooth separately because output delay differs. If 32 glitches, reduce to the last clean tier and simplify source graphs before raising caps. A desktop offline render cannot prove this.

## 9. Sound list: one station and one crossing

All entries are **[H] candidates**, not an asset commission or added scope. **C** below means procedural code, **R** recorded/produced material, **Hyb** a hybrid. The owner gets one gut question for each scene; row tests are the builder's short isolated checks. Preserve absolute game level in mix captures; use level-matched comparisons only when judging timbre.

### Station: one receiving frame, crane, short build and inhabited platform

**One line on what is new:** your delivered material can be followed by ear from the frame into the track, while a few neighbours make the station feel occupied.

**Gut question:** **“Does feeding this station feel like building something real?”**

| Sound / suggested first bank                                           | Trigger and ownership                                     | Smallest listening test                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Log seating, 4 takes initially (R/Hyb)                                 | Accepted log reaches its visible frame slot; SFX/contact. | Six deliveries alternating empty/full frame receiver; identify wood and seating on quiet speakers. |
| Crane engage/hoist/stop/release, 3 states plus 2 ratchets (Hyb)        | Actual crane motion/load; SFX/machine.                    | Lift once, stop halfway, continue and release; hear effort end at each stop.                       |
| Sleeper landing, 4 takes (Hyb)                                         | One accepted piece's visible contact; SFX/contact.        | Forty drops; compare first and last ten, then two simultaneous sites.                              |
| Rail seating, 4 takes and a damped ending (Hyb)                        | Rail meets support/fastening; SFX/contact.                | Alternate eight sleepers/rails; identify each with the screen hidden and check no piercing tail.   |
| Run-start and final latch, 1 each (Hyb)                                | One start/completion transition, not every visit; SFX.    | One complete run, then stand idle and reload: no repeated completion burst.                        |
| Cargo rack/forge handoff, 3 takes (R/Hyb)                              | Visible accepted unloading/conversion; SFX.               | Follow one crate into the forge; hear material transfer, not a duplicate pickup reward.            |
| Working forge/mechanism, 1 quiet bed plus 3 accents (Hyb)              | Current work cycle; SFX/machine.                          | Work/idle/work for 30 s, then four machines: clear state without fourfold wash.                    |
| Resident feet, handling and short effort (R for handling; C for voice) | At most two near actors' visible actions; ambience/town.  | Two handoffs during Boogler dialogue; dialogue remains clear without constant chatter.             |
| Sheltered air and nearby water, 1 bed each plus 3 laps (R/C)           | Area/exposure; ambience/natural.                          | Idle 30 s, walk behind the shed and to the quay; hear place change without hiss jumping.           |
| Kept honks and UI acknowledgement (C, existing)                        | Existing local/room events; social/UI.                    | Feed a frame while three nearby honks form a chord; neither input nor contact waits for a beat.    |

Build the four material/contact sounds first, then crane, one natural layer and one inhabitant. The forge and social-density cases are acceptance checks as those systems join, not reasons to commission every asset before the first listen.

### Crossing: depart, travel, arrive; crystal as a separate construction insert

**One line on what is new:** the train has a restrained physical identity that changes from the platform to its deck and gives the shore back at arrival.

**Gut question:** **“Would you take this ride again with the music off?”**

| Sound / suggested first bank                              | Trigger and ownership                                       | Smallest listening test                                                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Rolling, 2 speed textures (R/Hyb)                         | Distance/speed, foreground train; SFX.                      | Accelerate, cruise, coast and stop; wheel continuity survives traction fading.                                          |
| Traction start/load/release, 3 states (Hyb)               | Effort/state rather than speed alone; SFX.                  | One departure and coast; no motor-on drone while standing.                                                              |
| Deck/bridge body, 2 materials and 3 joint hits (R/Hyb)    | Relevant structure transition or selected real joint; SFX.  | Cross one seam at low/high speed; no per-sleeper machine-gun clack.                                                     |
| Brake/settle, 2 takes (R/Hyb)                             | Deceleration/stop; SFX.                                     | Arrive twice, once with a honk; stop is readable without a squeal dominating.                                           |
| Passing/distant train, reuse above as reduced mix (Hyb)   | Real train trajectory; SFX/ambience by perspective.         | Hear the same pass from platform, deck and 100 m away; no doubled exterior train on deck.                               |
| Exposed wind, 1 bed with gust control (C or R/Hyb)        | Exposure and speed, ambience.                               | Default crossing with music off; no urge to lower volume halfway through.                                               |
| Sea and far-shore life, 1 wash plus 3 spot sounds (R/Hyb) | Actual shoreline/area distance; ambience.                   | Leave and return; shore details recede then emerge, rather than follow the rider.                                       |
| Crystal collar/section/finish, 3 gestures (Hyb)           | Separate future crane/click/pulse/bubble construction; SFX. | One collar and six visible sections; first listen without tonal shimmer, then with it; every click has a visible cause. |
| Optional owner crossing passage (R, later)                | Journey-music eligibility; music.                           | Same ride with an approved passage, then silence; train remains intelligible without fighting the hook.                 |

The crystal insert can use a six-section cosmetic fixture without claiming a crystal economy or changing the crossing's timetable. Music is not needed to approve this sound pass. The existing [crossing look setup](../../dev/look/evals/crossing.ts) can frame the route; a PNG cannot validate sound or real-time synchronization.

## 10. To Matias, as the producer

**[H] Your highest-value contribution is the sound of the materials and the gaps between them.** Treat the first station like a small playable percussion instrument whose hits come from useful work. Bring the house/UK garage ear for pocket, low-mid body, ghost detail and restrained high end. Leave the landing where the picture puts it; put swing into the authored mechanism and quieter follow-through. A convincing raw log is worth more here than another eight-bar groove proposal.

First make **one 20–30 second station reference**: four log arrivals, a short hoist, several sleeper/rail contacts, one finished latch, then enough silence to hear the place. Supply a dry physical version and a version with very light tonal colour at matched loudness. No need to write a track. Then make a **roughly one-minute crossing soundscape**, music off, with marked departure, cruise and arrival. We implement the relationships, not a looping full-scene bounce.

**Record/produce:** wood-on-wood and wood-on-frame at different contact points; metal-on-timber and restrained metal rattle; cable/ratchet/handle movement; small stone/ceramic/glass locks; short water laps and a clean location bed. Small props are useful. Give frequent contacts several performances, including quieter ones, and record enough tail to choose the damping later. Avoid recording the entire scene with an inseparable hum behind every hit. Your taste decides how much processing still sounds physical.

**Code should handle:** the accepted contact hook; variation/no-repeat history; material/receiver selection; bounded intensity; pitch of a few resonators; crane/train state envelopes; distance, density culling and voice admission; quiet procedural air/steam/bubbles when they pass listening. [clink.ts](../../src/render/clink.ts) is a starting resonator, [noise.ts](../../src/render/noise.ts) the shared noise source. High-rate fixed sounds can be generated once into buffers. Live synthesis is not automatically cheaper than samples, and samples are not automatically better than the kept machine sound.

**Delivery:** dry mono 48 kHz/24-bit WAV for positional impacts, stereo only where width belongs to the bed; named material, receiver, intensity, take, contact marker, intended tail and nominal trim. Include one unmastered scene reference preserving the relationships. Do not normalize every take independently or bake a club limiter across each impact; keep that nonlinear processing in an optional audition reference. A small browser bank manifest can later carry the same metadata—this report does not create one.

The later That Franco music pass remains [journey-music's separate brief](journey-music.md). Audition its chosen harmony against these materials and the kept honks before committing a key palette. First prove wood plus one contrasting powered machine; six era banks can follow the actual built places.

## 11. Numbered recommendations, in priority order

Each is **[H]** and names the smallest listening comparison. Existing kept sounds remain the baseline; these are not approval claims.

1. **Make material contact the first sound milestone.** Give log/frame, sleeper/support and rail/fastening distinct bodies with audible midrange weight; compare six mixed contacts on iPad speakers and headphones. Touches [machine-sfx.ts](../../src/render/machine-sfx.ts) and [place's material handoffs](../../src/proto/place/index.ts); serves **Toys before chores**.
2. **Trigger sound from the visible accepted action.** Keep landing hooks, deduplicate piece events and discard snapshot/resume backlogs; compare one normal run, a late join and a render hitch. Touches [track-machine.ts](../../src/features/track-machine.ts), [hut-build.ts](../../src/features/hut-build.ts) and the [rail-slice authority boundary](../plans/rail-slice.md); serves **Telegraph everything**.
3. **Design variation for the fortieth sleeper.** Use performed takes, bounded pitch/level changes and shorter dense tails; compare the final ten of forty contacts at equal listening level. Touches [clink.ts](../../src/render/clink.ts) and [machine-sfx.ts](../../src/render/machine-sfx.ts); serves **Toys before chores**.
4. **Give cranes and crystals a readable physical sequence.** Separate exertion, release, contact and locking; audition one interrupted lift and six crystal sections. Touches [place/rail.ts](../../src/proto/place/rail.ts), [place/forge.ts](../../src/proto/place/forge.ts) and the [crystal decision](../decisions.md); serves **Telegraph everything**.
5. **Make work musical through phrasing and restrained resonance.** Compare natural contacts against root/fifth/octave sweeteners with music off; keep immediate honks and all tactile attacks off the beat quantizer. Touches [audio.ts](../../src/render/audio.ts), [honk.ts](../../src/features/honk.ts) and [journey music](journey-music.md); serves **Automatic cooperation**.
6. **Build ambience from places and purposeful activity.** Start with one quiet natural bed, local water and two residents' handoffs; listen idle, behind a shed and at the quay. Touches [era ambience](../../src/proto/era/ambience.ts), [NPC voice](../../src/render/npc-voice.ts) and [little guys](little-guys.md); serves **Drop-in, drop-out**.
7. **Replace the train sound as a whole journey.** Mix rolling, traction, body and transients for rider, trackside and distant views; compare one music-free crossing to silence, including a repeat ride. Touches [crossing](../../src/proto/crossing/index.ts) and [its train](../../src/proto/crossing/train.ts); serves **Toys before chores**.
8. **Make era progress change timbre rather than loudness.** Compare the same station in wood and steam with natural layers retained and matched level; expand to the six palettes only as places exist. Touches [decisions.md](../decisions.md), [growing towns](growing-towns.md) and the [rail-slice plan](../plans/rail-slice.md); serves **Leave something for the next visitor**.
9. **Enforce both event and source budgets.** Start with 24 steady/32 peak logical voices, a 96-source ceiling and explicit priority/stealing; stress one busy station on M4 and reduce to the last clean tier if needed. Touches [audio.ts](../../src/render/audio.ts), machine/clink callers and the hut's event-rate limiter; serves **Small and readable**.
10. **Mix for intelligibility before master loudness.** Duck sustained machinery under addressed dialogue, preserve local contact, and measure raw stereo/mono output; compare a build with honks and babble at quiet volume. Touches [audio.ts](../../src/render/audio.ts) and [the listening-pack renderer](../../dev/audio/render.ts); serves **Telegraph everything**.
11. **Commission a small hybrid material kit from That Franco.** Produce the station reference, frequent contact takes and one quiet crossing palette; compare recorded attack plus procedural body against the kept synthesis before expanding the bank. Touches [assets/audio](../../assets/audio/README.md), [noise.ts](../../src/render/noise.ts) and [clink.ts](../../src/render/clink.ts); serves **Toys before chores**.
12. **Approve one station and one crossing by listening in context.** Use the scene questions above, then check forty contacts, repeat rides, co-op density, mute and interruption recovery on-device; save findings in [playtests.md](../playtests.md). Use [dev/audio/render.ts](../../dev/audio/render.ts) for isolated timbre comparisons and an unnormalized real-time capture for mix/timing; serves **Light tests, real playtests**.

## Evidence still missing

No source establishes a universal Web Audio voice limit on M4, the correct Boogle loudness, or the proposed variation/culling thresholds. Tiny Glade's implementation video, the Zelda GDC presentation and Satisfactory's spatial-audio demonstration remain unauditioned. Townscaper's precise plonk recipe, Astro Bot's material-layer recipes, Death Stranding's auto-paver mix and a generative Dorfromantik music engine were not verified. The plans above intentionally do not fill these gaps with invented internals.

The report changes no sound, game state, plan checkbox or shipped behaviour. The next builder should cite the numbered recommendation being tested, retain the audit baseline, and report what they actually heard before asking the owner for the artistic verdict.
