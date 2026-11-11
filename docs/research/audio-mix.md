# Mixing Boogle: feet, friends and headroom

> **Verdict:** Keep five buses, make levels tunable, measure before adding material footsteps.
> **Top recommendations:** 1. Make the baseline trustworthy first. 2. Calibrate existing families before adding more layers. 3. Adopt the five-bus table through local tunables.
> **Status:** partly adopted. See [audio-architecture](audio-architecture.md).

_Research report, 5 November 2026. Owner-requested character-sound, complete source-inventory and mixing study of checkout `3048c9242883a4ec792d492c6ed4f34c717363bb`. Live primary-source research, native Web Audio signal renders and a repeatable measurement/build plan. Research only; no runtime changes. Not tested on a device._

**Recommendation:** retain the five existing category buses, make their effective levels locally tunable, and establish a measured reference before adding quiet, material-specific locomotion. A nearby friend should be audible without six walkers turning the world into a percussion loop. Normalize comparable assets within a family; calibrate the complete game separately.

## Scope and evidence

- **[C]** inspected source or owner record; **[M]** measured signal under the stated fixture; **[V]** fetched primary source; **[S]** search-index evidence whose underlying document could not be fetched; **[H]** proposed Boogle setting or interpretation. Unmarked proposed numbers are **[H]**, not standards, measured preferences or device limits.
- Read [research index](README.md), [audio architecture](audio-architecture.md), [collect sounds](collect-sounds.md), the [audio-design skill](../../.claude/skills/audio-design/SKILL.md), root and applicable nested agent instructions, [owner calls](../agents/owner-calls.md), and the current [Sound decisions](../decisions.md#sound-listening-pack-audit-2026-11-01). This updates the measurement and character-mix portion of the architecture report; it does not adopt its historical six-era roadmap.
- **[C]** `git ls-files` contains **zero recorded audio assets** (`wav`, `mp3`, `ogg`, `opus`, `m4a`, `aac`, `flac`, `aif`, `aiff`). `src` has no sample decoding or HTML audio playback. Nineteen `.ts` files create oscillators or buffer sources. Generated noise/impulse buffers are listed below. [assets/audio/README.md](../../assets/audio/README.md) contains example filenames for the archived groove, not installed samples or a playing soundtrack.
- Keep the approved honk, UI, miniature-game, hut and machine identities. Preserve the undecided wave. Do not restore cut wagon/freight/stoke/grind/soapbox/opening-day sounds or the archived groove. The later procedural sound/music direction still stands; requested sample sources below are audition candidates, not an unrecorded change of direction. The Boogler's words are untouched; no suspect copy was identified by this audio audit.
- Serves [DESIGN](../../DESIGN.md): **Toys before chores**, **Cooperation is automatic, not negotiated**, **Telegraph everything**, and **Designed for drop-in, drop-out**. Audio remains Local presentation; it does not drive physics or progress.

## 1. Character sounds: use the feet already being drawn

### Cadence and material

**[C]** [Buddy rig](../../src/player/buddy/rig.ts) already advances a common walk/jog/sprint phase by `speed * dt / blendedStride`, with scale correction and phase-preserving blends. It detects airborne transitions and has a landing clip. There is no general walk/run/first-jump/ordinary-landing audio system. [Place moves](../../src/proto/place/moves-view.ts) supplies second-jump, hook, glider and wind cues; the [opening fall](../../src/fall/index.ts) and [impact feature](../../src/features/impact.ts) have special crash/faceplant sounds. These do not cover ordinary locomotion.

**[V]** Unity's [animation events](https://docs.unity3d.com/6000.0/Documentation/Manual/AnimationEventsOnImportedClips.html) and Unreal's [Animation Notifies](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-notifies-in-unreal-engine) attach effects to the relevant animation times. **[S]** Audiokinetic's [Wwise Project Adventure](https://www.audiokinetic.com/download/documents/WwiseProjectAdventure_en.pdf) describes foot-contact animation events and character/step/surface switches; the official PDF returned 403 here. **[V]** Godot's [AudioStreamRandomizer](https://docs.godotengine.org/en/stable/classes/class_audiostreamrandomizer.html) supplies no-immediate-repeat selection and pitch/volume variation. Boogle can implement these small policies around its existing rig and Web Audio without importing middleware.

**[H]** Emit one contact when the unwrapped stride crosses each authored left/right foot marker. Measure the markers against the actual clips; `0` and `0.5` are only initial candidates. Do not run an independent wall-clock footstep timer, emit once per frame of contact, or emit from every blended clip. Use support-relative speed so riding a train does not sound like running. Suppress contacts while airborne, swimming, seated, down or effectively stationary. Reset the previous phase after teleport, first observation, context resume and remote rejoin. A long frame may cross several markers: play at most one current contact, dropping the missed backlog. A 110 ms minimum interval is a safety gate, not the normal cadence.

| Surface       | Proposed sound and initial set                                                               | Contact classification                                                        |
| ------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Grass         | Six dry, soft heel/toe compressions with restrained leaf texture; avoid constant hiss        | Ground/support material tag, not grass colour                                 |
| Sand          | Six dull sand compressions/scrapes; slightly softer than grass                               | Sand support; retain transient detail without boosting white noise            |
| Wood          | Six short hollow knocks with low-mid body; no reward bell                                    | Plank/deck support, including moving wooden decks                             |
| Rail panel    | Six compact sole-on-metal contacts over a quiet wood body if appropriate; short ringing tail | Authored walkable rail-panel support, not proximity to a rail                 |
| Shallow water | Six soft splashes with a sole/body layer; no surf-sized burst                                | Feet below local water surface while grounded; swimming has a different state |

Select the support under the contact foot, falling back to the body's known support. Resolve thin decks above water before classifying submerged ground. Prefer existing support/material metadata; add one bounded contact query only if the presentation lacks it. Start with an explicit grass fallback and log unknown surfaces in development. There is no reason to query physics for every audio voice every frame.

Use a shuffled round-robin bag per emitter/surface, avoiding the previous two takes across bag boundaries. Strict `1,2,3,4` cycling makes its own pattern. Start with six takes, pitch **±35 cents** (`2 ** (cents / 1200)`) and gain **±1.5 dB**. These are variations around the designed impact, not random timing offsets. Running uses the same stride markers but stronger performed contacts or a run layer, initially **+3 dB**, with shorter scrape tails; do not make it a faster, louder identical loop. With six friends, offset their bags/seeds so simultaneous contact does not select the same waveform. Pitch variation alone cannot disguise one repeated recording.

### Jump and landing

Give every deliberate first jump a small sole-release/cloth effort, approximately **−3 dB relative to a reference walking contact**; retain the existing restrained second-jump air cue. An upward takeoff transition identifies a jump; walking off an edge should not play the same effort. A jump cannot know its future fall height: scale takeoff by current effort/upward velocity, then scale the landing by the descent actually observed.

Track the airborne apex and support-relative downward speed in Local presentation. On a grounded transition, choose soft/normal/heavy landing, combining surface contact with a quiet body layer. Relative impact speed is preferable on moving platforms; apex-to-contact height is the fallback. Do not infer a hard landing from an upward teleport or a remote interpolation correction. Proposed height bands: **under 0.2 m** tiny step-down; **0.2–1.5 m** soft-to-normal; **1.5–4 m** normal-to-heavy; above **4 m** cap the gain and increase texture/body. Start at **−6, 0, +4 dB** relative to the normal landing, with smooth transitions. Preserve the difference between a hop and a fall without mapping metres directly to amplitude.

A landing consumes that foot-contact moment so it cannot also fire two ordinary steps. Ignore brief support flicker, reset on swimming/teleport/rejoin, and let the next stride continue. Water landings use a splash appropriate to depth and impact, not the wood body. These are playback policies only; do not change jump height, gravity, damage or the owner's movement experiment to make the sound fit.

### Friends and crowds

**[V]** [FMOD's event controls](https://www.fmod.com/docs/studio/event-macro-controls-reference.html) combine instance caps, cooldowns, priority and stealing by age, distance or audibility. [Factorio's audio development account](https://www.factorio.com/blog/post/fff-396) describes aggregation and higher priority for player actions when many sources compete. These are transferable mechanisms, not evidence for a universal co-op footstep level. **[S]** [Overwatch's GDC deck](https://ubm-twvideo01.s3.amazonaws.com/o1/vault/gdc2016/Presentations/Lawlor_Neumann_Overwatch_Play_by_Sound.pdf) is a useful play-by-sound reference, but its fetch failed; no exact enemy/ally gain or voice budget is borrowed here.

**[H]** For Boogle, start other players' steps **−6 dB** below the local step at equal distance, with positional pan. Give a friend's nearby landing/honk more priority than their continuous walking. Remote footsteps convey company, not competitive enemy detection. Derive ordinary cadence from the same smoothed remote animation; no per-foot network packet. If a future important landing needs an explicit one-off event, use the existing room contract, deduplicate it and avoid replay on snapshots.

Use listener **position at the player's head/body** and orientation from camera yaw: camera zoom must not change footstep loudness. Proposed footstep attenuation is unity within **1.5 m**, then `((18 - d) / 16.5)²`, clamped to `[0,1]`, with explicit culling at **18 m**. This gives approximately −5 dB at 6 m and −17.6 dB at 12 m, in addition to the remote trim. Permit heavier landings to **30 m**; preserve the machine's existing **45 m** while calibrating. Full 3D distance prevents hearing an overhead bridge as if it were beside the player. Start with equal-power panning, audition HRTF on headphones later. Do not multiply an authored distance curve by an unintended second PannerNode falloff.

Footsteps: **two overlapping events per player, eight across the room**, of which two slots are available to local contact. Admit the nearest/most audible remote steps; release a stolen tail over 5–10 ms. No backlog, and no resurrection of a virtualized old footstep. Six friends running is the stress fixture; budget values are hypotheses, not measured browser limits.

### Shipping-compatible sample candidates

- **[V, publisher's indexed asset page] [Kenney Impact Sounds](https://kenney.nl/assets/impact-sounds)** declares 130 files under CC0. Use as a first footstep/material audition bank; the archive's individual surface coverage and sound quality were not downloaded or auditioned here. Do not assume it covers all five surfaces.
- **[S] [OpenGameArt Footsteps](https://opengameart.org/content/footsteps-0)** is indexed as CC0; direct content access was blocked. Treat it as a candidate until its downloaded licence and included files are checked. A different similarly named multi-surface pack is CC-BY, so a search result's general “free” label is insufficient.
- **Owned Foley** is the most direct way to fill grass, sand, wood, short metal-panel contacts and shallow-water gaps: record the same shoes on safe small props/trays, six walk and six stronger contacts per surface. Preserve dry 48 kHz/24-bit originals, full decays and recorded ownership; deliver small mono runtime derivatives. [Rare's own behind-the-scenes description](https://www.youtube.com/watch?v=llAPbXfh9mw) names turf and pool Foley for Sea of Thieves **[V, description only; video not watched]**—useful process inspiration, not samples to extract.

Keep URL, author, downloaded licence, original hash and edit history beside imported assets. No ROM data or extracted game audio. Do not replace the selected formant Boogler with a recorded syllable bank.

## 2. Inventory and measured baseline

### Current graph and what the numbers mean

**[C]** [audio.ts](../../src/render/audio.ts) already owns one gesture-unlocked context and `music`, `ambience`, `sfx`, `ui`, `voice`. Their bus trims are **−13, 0, 0, 0, −12 dB** respectively. Music and ambience pass through a shared **−9 dB** voice duck; attack/release `setTargetAtTime` constants are **30/250 ms**, not completed ramp durations. Master is **`0.8 * volume²`** (−1.94 dB at full volume), followed by a DynamicsCompressor threshold **−20 dB**, ratio **6:1**; knee/attack/release remain browser defaults. The UI kit additionally multiplies by **0.4 (−7.96 dB)**. Voices and ambience therefore cannot be compared using one envelope coefficient alone.

**[C]** The compressor follows the user volume, so changing volume also changes compression. Its makeup gain means output is not simply the sum of authored dB values. Web Audio's [compressor specification](https://www.w3.org/TR/webaudio/#DynamicsCompressorNode) includes makeup gain; it does **not** promise a −1 dBTP brickwall. Measure the output rather than assuming the ceiling.

The source ledger below includes every generator family and its callers, including currently retained prototype code. Linear values are envelope coefficients before bus/master processing, not LUFS. A parameterized voice has no one immutable duration or loudness; measurements use explicitly named representative inputs. Helper noise/impulses and individual partials are not independently triggered game sounds.

| Source / cue family                                                                  | Actual trigger                                                                                                             | Current gain and routing [C]                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ui-sound.ts](../../src/ui/ui-sound.ts): tick, pop, thunk, deny, count, flap         | Held item/menu step; prompt appears; accepted action; denied action; haul counter change; plaque row turns                 | UI ×0.4. Tick sine .13; pop .3; thunk .42 body + .1 partial + .38 knock + .12 noise; deny two .12 square notes; count clink .16; flap four noise clicks `.2 * arg * (1 - .2*k)`. Gaps 30/220/80/250/35/240 ms respectively. `TICK=true`, despite stale introductory comment. |
| [honk.ts](../../src/features/honk.ts): normal, toot, double, low                     | Local and received honk                                                                                                    | SFX; own .16, remote `.14/(1+d²/500)`, unknown-position ×.3. Normal .27 s; toot ×.9/.15 s; double ×.85/.11 s then full/.2 s at +.125; low ×1.15/.34 s. Internal wave partials .5 saw or .32 square plus .7 triangle sub; own cooldown 300 ms.                                |
| honk chord                                                                           | Three distinct honkers inside one second                                                                                   | SFX; .17 outer envelope, notes divided by `sqrt(n)`, partial coefficients .35/.25/.5 and glitter ×.25; stops at 1 s.                                                                                                                                                         |
| [ping.ts](../../src/features/ping.ts): ball/look, own/remote                         | Context ping message                                                                                                       | SFX; own .09, remote .065, second note ×.75 at +75 ms; no distance curve in this renderer; final source ends .275 s.                                                                                                                                                         |
| [impact.ts](../../src/features/impact.ts): ball boing, water/low boing, faceplant    | Ball impact or local/remote faceplant                                                                                      | SFX; body `.62*vol`, overtone ×.35; duration `.13+.14*clamp(speed/24)` plus .03 tail. Impact `.3*k/(1+d²/300)`; local faceplant .35, remote `.25/(1+d²/300)`; 60 ms gate and four-event burst cap.                                                                           |
| [machine-sfx.ts](../../src/render/machine-sfx.ts): chuff                             | Machine warmup/movement and Place wake                                                                                     | SFX; noise peak `.28+.15*heavy`; .35 s source. All four machine recipes use camera-XZ `max(0,1-d/45)²`, discard below .003.                                                                                                                                                  |
| machine thump                                                                        | Sleeper/material placement                                                                                                 | Sine .75 plus filtered noise .45; .3/.15 s sources.                                                                                                                                                                                                                          |
| machine clank                                                                        | Rail placement                                                                                                             | Three partials .12/.072/.036 plus .096 noise; .5 s tail.                                                                                                                                                                                                                     |
| machine whistle                                                                      | Run completion/wake                                                                                                        | Three sine voices through .18 envelope plus .09 noise, 1.6 s sources; no shared machine concurrency cap.                                                                                                                                                                     |
| [hut-build.ts](../../src/features/hut-build.ts): piece, pitched knock, phase chord   | Visible hut piece lands; construction phase finishes                                                                       | SFX; `.45*max(0,1-playerDistance/40)` body; noise ×.6; optional .32 pitched knock; phase chord four notes ×.2. Three landings/site/300 ms, phase chord bypasses that cap.                                                                                                    |
| [fall/index.ts](../../src/fall/index.ts): title crash, ground crash                  | First-run trolley/title contact, then landing                                                                              | SFX; sine `.75*strength`, nine staggered timber triangles `.2*strength*(1-k/11)`; strength .7/1, last tail about .62 s.                                                                                                                                                      |
| [pickup-feel.ts](../../src/proto/haul/pickup-feel.ts): thock                         | Nonmagnet pickup arrives, delayed with visible flight                                                                      | SFX; .26 sine + clink .13, metal .5/ring .16/strike 1.2; pitch degree from carried count.                                                                                                                                                                                    |
| [magnet-sound.ts](../../src/proto/haul/magnet-sound.ts): departure whoosh            | Pieces leave pile                                                                                                          | UI; `.035*min(1,.6+n/20)`, .26 s.                                                                                                                                                                                                                                            |
| magnet arrival tick / fourth-piece accent                                            | Each piece reaches bundle                                                                                                  | UI; clink .1, every fourth ×1.25, ring .22, bounce .3/.5; alternating pan; run resets after 700 ms. Eight magnet events, oldest faded over a 4 ms time constant.                                                                                                             |
| magnet closing chord                                                                 | Burst of at least four closes                                                                                              | UI; three/four clinks .08 at 40 ms intervals, shimmer .012 and low knock .16; same event cap.                                                                                                                                                                                |
| [wave.ts](../../src/proto/haul/wave.ts): warning horn one/two                        | Wave warning phases                                                                                                        | SFX; three saw voices through .22 envelope; one 1.8 s blast or two .55 s blasts 750 ms apart.                                                                                                                                                                                |
| wave rumble / sweep / catch                                                          | Wave approaches, sweeps, catches player                                                                                    | SFX; rumble loop `.9*level`, lowpass 70–330 Hz; sweep `.5*strength` with strength 1/.7, 1.7 s source.                                                                                                                                                                        |
| [minis/common.ts](../../src/render/fanfare.ts): knock                            | Export retained; no current `src` caller found, listening pack calls it                                                    | SFX; noise `.5*vol*(.4+k)` plus triangle `.35*vol*(.4+k)`, .2–.24 s.                                                                                                                                                                                                         |
| minis pop                                                                            | Golf tee/reset/stroke, hop start or denied Place move                                                                      | SFX; sine `.32*vol`, triangle `.08*vol`, up to .16 s; golf stroke vol .5, hop start .6, denied Place move .25.                                                                                                                                                               |
| minis fanfare small/big                                                              | Golf success/hop finish, record or hole-in-one                                                                             | SFX; four/seven notes, triangle `.22*vol` plus sine `.06*vol`, 75 ms spacing, .565/.79 s.                                                                                                                                                                                    |
| minis womp                                                                           | Mini-game failure                                                                                                          | SFX; four saw notes `.22*vol`, .32 s spacing, final .9 s note; ends 1.88 s. Golf vol .6, hop .9.                                                                                                                                                                             |
| minis mushroom boing                                                                 | Mushroom bounce                                                                                                            | SFX; triangle `.3*vol` then `.24*vol`, .33 s; `vol=1/(1+d²/400)`.                                                                                                                                                                                                            |
| [folk.ts](../../src/place/folk.ts): hammer tap                                 | Worker hammer/stamp animation cycle                                                                                        | SFX; triangle `.07*max(0,1-d/16)²`, .06 s, global .2 s gate.                                                                                                                                                                                                                 |
| [tech.ts](../../src/proto/place/tech.ts): activation/distant bells                   | Ancient device activation; distant tech ring                                                                               | SFX; four modes `vol*.28/(k+1)`; root330/vol.45 or root880/vol`.18*(1-d/40)`; 2.6 s source stop.                                                                                                                                                                             |
| [moves-view.ts](../../src/proto/place/moves-view.ts): glider wind                    | Local glide speed                                                                                                          | Ambience; looped filtered noise `.12*level`, bandpass `300+45*speed`, smoothing .12 s.                                                                                                                                                                                       |
| [npc-voice.ts](../../src/render/npc-voice.ts): Boogler and resident formant voices   | Text streams through [Boogler dialogue](../../src/boogler/dialogue.ts) and [residents](../../src/proto/place/residents.ts) | Voice bus −12 dB; each syllable `.9*dbToGain(s.db)` through three vowel filters, stop consonant .5/18 ms, hiss .14/78 ms. Boogler155 Hz; Pip330, Button285, Nell370, Moss240, Wren350 Hz. Exact phrase/mood controls duration and level. Foreground voice requests ducking.  |
| [chatter.ts](../../src/place/chatter.ts): six folk timbres / twelve utterances | Alternating local folk chat exchange                                                                                       | Same voice recipe; another −13 dB, full within 4 m, squared fade to 13 m; pitches300–410 Hz. No foreground duck.                                                                                                                                                             |
| [Place ambience](../../src/proto/place/ambience.ts): surf A/B, breeze                | Continuous Place environment, spatial exposure                                                                             | Ambience; bed 0 dB plus URL trim; surf crests −21 dB×random .4–1, rest−38; inland attenuation up to−11 dB. Breeze−32 dB×random .35–1, shore−9 dB.                                                                                                                            |
| Place gull mew/pair/long/answered                                                    | Sparse scheduled spots or exported `gullCall`                                                                              | −29 dB peak with up to−9 far; dry .7→.45, wet .25→.4; mew .75–1.05 s, pair .42–.55/.36–.48, long3–5 calls, answered reply after1.8–4 s. Usually28–75 s between patterns, ×1.7 inland; reverb adds tail.                                                                      |
| [Era ambience](../../src/proto/era/ambience.ts): surf/foam, breeze                   | Retained era prototype's continuous wood bed                                                                               | Ambience with .5 bed output and dry/reverb/delay paths. Surf .03–.045 peaks/.008 rest; foam ×.25. Breeze .004–.012, retarget3–7 s.                                                                                                                                           |
| era pad                                                                              | Sparse chord swells                                                                                                        | Ten oscillators, shared .006,18–26 s,20% skipped chords.                                                                                                                                                                                                                     |
| era mallet/pluck / motif                                                             | Sparse1–3-note phrases / five-note motif                                                                                   | Sine .035–.06, tok×.3;1.3–1.9 s envelope. Motif .05. Phrases7–16 s apart, motif45–75 s.                                                                                                                                                                                      |
| era gull / knock / creak                                                             | Sparse environment spots                                                                                                   | Gull .012–.022/.45 s; knock .05–.08 plus noise×.4/.3 s; creak .03–.05/.7–1.3 s; reverberant tails remain.                                                                                                                                                                    |
| [clink.ts](../../src/render/clink.ts) / [noise.ts](../../src/render/noise.ts)        | Shared recipe components, not additional events                                                                            | Clink used by UI count/pickup/magnet; ±6 cents fundamental, ±1.5% modes, ±1.5 dB, bounce25–45 ms. Cached white/brown noise and dark impulse response are generated data, used through the callers' envelopes.                                                                |

All 24 [Place recipes](../../src/render/place-sfx.ts) use the SFX bus and finite tone/noise layers. Numbers below are **each layer's envelope peak dB**, in source order, before distance. Actual source duration includes layer delays; measured audible duration appears in the next table. `placeSound` applies camera-XZ squared fade to 45 m, rejects gain below .02, admits eight active events (at most forty native sources), and rate-limits per cue. Repeated rebound/bag cues within one second multiply by .55. Default cooldown .08 s, cartRoll .36, cartPush1.1, seesaw .3.

| Cue          | Trigger / owning presentation                       | Layer peaks dB          |
| ------------ | --------------------------------------------------- | ----------------------- |
| treeBite     | Axe bites ordinary tree                             | −25, −28, −33           |
| hardwoodBite | Proper axe bites hardwood                           | −25, −27, −32           |
| treeRebound  | Blade rebounds without a cut                        | −30, −38, −35           |
| bagFull      | Full bundle rejects another log                     | −32, −36                |
| rockBreak    | Rock breaks                                         | −21, −22, −29           |
| treeFall     | Great tree starts tipping                           | −26, −25, −32           |
| treeLand     | Trunk reaches ground                                | −22, −25, −30           |
| shoulder     | Trunk reaches carrying shoulder                     | −26, −29, −32           |
| boxCommon    | Common box reveal                                   | −28, −29, −35           |
| boxRare      | Rare box reveal                                     | −29, −29, −30, −37      |
| boxWonder    | Wonder box reveal                                   | −30, −29, −31, −30, −38 |
| pickupJump   | Second-jump ability acquisition (not ordinary jump) | −29, −29, −35           |
| pickupHook   | Hook ability acquisition                            | −29, −37, −30           |
| pickupGlider | Glider acquisition                                  | −31, −32, −33           |
| secondJump   | Extra airborne jump                                 | −29, −32                |
| hookFire     | Hook shoots                                         | −29, −33                |
| hookLatch    | Cable release/pull finishes                         | −29, −37                |
| gliderOpen   | Glider opens                                        | −28, −33                |
| gliderClose  | Glider folds                                        | −31, −35                |
| cartRoll     | Cart moving                                         | −34, −36, −36           |
| cartPush     | Co-op cart push effort                              | −32, −34                |
| cartStop     | Cart settles/brakes                                 | −30, −30                |
| pathOpen     | First path opens                                    | −30, −31, −32, −35      |
| seesaw       | Seesaw launch                                       | −29, −32, −36           |

Prototype callers are in [Place](../../src/proto/place/): `chop.ts`, `gifts.ts`, `tech.ts`, `moves-view.ts`, `depot.ts`, `pair.ts` and `celebrate.ts`. Production [railway sources](../../src/entities/railway/sources.ts) also use treeBite/bagFull, and [railway rewards](../../src/entities/railway/reward.ts) use boxCommon. Keep those production consumers distinct from prototype callbacks; the latter must not be described as already server-accepted events. Source coefficients and rendered sound prove the recipe, not every gameplay path. The ordinary footstep/first-jump/landing bank is absent, so its existing loudness/length is **N/A**, not measured silence. Removed/cut sounds have no active sample to normalize.

### Measurement conventions and actual results

**[M]** Two complementary captures were made: the existing [listening renderer](../../dev/audio/render.ts) recorded the live graph, while temporary offline fixtures rendered actual recipe code in Chromium's `OfflineAudioContext`, without game physics or GPU rendering. No recipes were replaced by approximate synthesis. Offline fixtures intercept context/routing and extract otherwise private recipe functions; they are signal evidence, not proof that a gameplay trigger fires.

The live renderer exports peak-normalized PCM16 previews. Their `manifest.json` records `gainDb`; analysis applies its inverse **to the waveform before metering**. This recovers the recorded level subject to PCM16 quantization, not the original float samples. Subtracting `gainDb` from normalized LUFS alone is unsafe because the absolute gate can change. Captures contain sequences, ambient context and trimmed boundaries; the table labels them as such. The comment saying peak normalization gives equal loudness is incorrect.

Offline one-shots use an explicit reference distance and raw pre-master route. Their tables specify whether the existing UI 0.4 stage or chatter/voice trims are included. Mono raw values are **not directly interchangeable with stereo master readings**. Short events in table A receive a clearly labelled **I400** diagnostic: trimmed content zero-padded to at least 400 ms so a gated loudness block exists. This is not a standards-defined single-hit normalization target. Native shorter-than-400-ms integrated LUFS is marked unavailable, not −70 LUFS or a fabricated value. Peak and RMS are the useful normalization evidence for those sounds.

#### A. Isolated Place, UI and voice recipes [M]

**45 cases**, Chromium **148.0.7778.96**, FFmpeg **8.1**, 48 kHz mono, LCG seed **20261105**, raw before shared bus/master/compressor. UI's internal 0.4 and chatter's −13 dB are retained; the common voice bus's −12 dB is **not** included. Active length spans first-to-last sample above −100 dBFS. `*` means I400 (minimum 400 ms zero-padded window); other I values use the active-length file. RMS uses that same active span, including internal gaps. No gain normalization.

Boogler/residents use the same diagnostic sentence, “Hello, friend! The railway is ready.” This is fixture text, not a new Boogler line. Boogler moods use the actual voice specification; five residents use their actual specs. Shore Worker reuses `CAST.pip.voice`, so Pip covers its timbre. Six chatter timbres use the existing first utterance “Mip mop?” at zero distance. A family has many possible phrases; these are controlled comparisons, not an exhaustive render of every line of dialogue.

| Cue             | Active s | I / I400 LUFS | True peak dBTP | Active RMS dBFS |
| --------------- | -------: | ------------: | -------------: | --------------: |
| treeBite        |    0.094 |        -48.5* |          -24.0 |           -41.6 |
| hardwoodBite    |    0.133 |        -47.1* |          -24.0 |           -41.2 |
| treeRebound     |    0.085 |        -53.5* |          -29.2 |           -47.5 |
| bagFull         |    0.129 |        -58.7* |          -37.7 |           -52.8 |
| rockBreak       |    0.218 |        -39.7* |          -18.9 |           -36.6 |
| treeFall        |    0.642 |         -41.6 |          -23.7 |           -40.5 |
| treeLand        |    0.313 |        -40.0* |          -22.1 |           -37.2 |
| shoulder        |    0.215 |        -44.6* |          -25.4 |           -40.9 |
| boxCommon       |    0.215 |        -45.2* |          -26.1 |           -42.0 |
| boxRare         |    0.395 |        -42.9* |          -26.8 |           -42.5 |
| boxWonder       |    0.665 |         -42.0 |          -27.6 |           -42.9 |
| pickupJump      |    0.345 |        -44.8* |          -27.9 |           -43.6 |
| pickupHook      |    0.395 |        -43.7* |          -26.8 |           -43.2 |
| pickupGlider    |    0.565 |         -45.2 |          -31.5 |           -45.6 |
| secondJump      |    0.125 |        -51.7* |          -29.0 |           -46.0 |
| hookFire        |    0.145 |        -50.4* |          -28.9 |           -46.3 |
| hookLatch       |    0.115 |        -48.5* |          -27.7 |           -43.0 |
| gliderOpen      |    0.270 |        -52.1* |          -31.0 |           -49.9 |
| gliderClose     |    0.129 |        -54.4* |          -32.1 |           -49.8 |
| cartRoll        |    0.193 |        -53.6* |          -33.6 |           -49.3 |
| cartPush        |    0.319 |        -62.9* |          -44.0 |           -63.0 |
| cartStop        |    0.231 |        -49.5* |          -30.9 |           -46.5 |
| pathOpen        |    0.815 |         -42.6 |          -28.5 |           -43.2 |
| seesaw          |    0.244 |        -46.2* |          -28.4 |           -43.2 |
| ui-tick         |    0.065 |        -50.3* |          -26.5 |           -41.9 |
| ui-pop          |    0.120 |        -39.8* |          -18.6 |           -34.3 |
| ui-thunk        |    0.240 |        -33.1* |          -11.4 |           -30.1 |
| ui-deny         |    0.230 |        -42.5* |          -25.1 |           -39.7 |
| ui-count        |    0.163 |        -40.7* |          -20.3 |           -37.3 |
| ui-flap         |    0.101 |        -61.0* |          -36.3 |           -57.6 |
| boogler-smile   |    1.117 |         -21.4 |           -7.3 |           -20.1 |
| boogler-joy     |    1.030 |         -21.0 |           -7.5 |           -19.6 |
| boogler-grump   |    1.234 |         -23.0 |           -7.7 |           -21.9 |
| boogler-worry   |    1.118 |         -23.4 |           -7.9 |           -21.5 |
| resident-pip    |    1.399 |         -20.4 |           -5.6 |           -18.9 |
| resident-button |    1.248 |         -21.7 |           -6.8 |           -20.5 |
| resident-nell   |    1.532 |         -18.4 |           -3.2 |           -17.5 |
| resident-moss   |    1.707 |         -22.9 |           -8.2 |           -21.9 |
| resident-wren   |    1.208 |         -20.0 |           -5.4 |           -18.8 |
| chatter-0       |    0.338 |        -34.2* |          -19.1 |           -32.9 |
| chatter-1       |    0.339 |        -33.6* |          -18.8 |           -32.3 |
| chatter-2       |    0.339 |        -33.0* |          -18.8 |           -31.7 |
| chatter-3       |    0.339 |        -32.3* |          -19.8 |           -31.0 |
| chatter-4       |    0.339 |        -32.4* |          -20.0 |           -31.2 |
| chatter-5       |    0.339 |        -32.6* |          -20.4 |           -31.4 |

#### B. Other isolated procedural recipes [M]

**55 cases**, native Chromium, **48 kHz stereo**, seed **0x5b00**. These use actual extracted source with context and camera/player positions injected at the origin, default event volume unless the call specifies otherwise. Internal recipe processing is retained; shared category/master/compressor stages are absent. Era rows include their .5 bed gain, dry/reverb/delay returns; unrelated looping sources remain connected at zero initial gain and other spot events are unscheduled. The era-surf/breeze fixtures schedule one swell/gust and observe its tail/rest level; they do not run the continuous gameplay updater. Integrated measurements are FFmpeg `loudnorm` **input** metrics on the stated full window (usually four seconds, including silence), not normalized output. Consequently they are diagnostic fixture I values, **not I400**. `active s` spans samples above −100 dBFS; for loops it is the observation window, not a finite asset length.

Most centered mono sources are duplicated into the stereo destination: integrated loudness is roughly **3.01 LU higher** than a single-channel measurement of the same signal. Do not compare these directly with table A or subtract only bus gains to predict the compressed live output. Pan, gates and different windows can change that relation.

| ID                  | Actual source                                                          | Call / parameters                                                                                            | I LUFS | TP dBTP | active s | window s |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -----: | ------: | -------: | -------: |
| fall-title          | [src/fall/index.ts](../../src/fall/index.ts)                           | `thump(.7)`                                                                                                  | -24.06 |   -5.71 |    0.599 |        4 |
| fall-land           | [src/fall/index.ts](../../src/fall/index.ts)                           | `thump(1)`                                                                                                   | -21.17 |   -2.62 |    0.599 |        4 |
| folk-tap            | [src/proto/place/folk.ts](../../src/place/folk.ts)               | `tapSound(0,0,0)`                                                                                            | -45.45 |  -23.61 |    0.060 |        4 |
| tech-activation     | [src/proto/place/tech.ts](../../src/proto/place/tech.ts)               | `chord(330,.45)`                                                                                             | -28.13 |  -12.55 |    2.600 |        4 |
| tech-distant-near   | [src/proto/place/tech.ts](../../src/proto/place/tech.ts)               | `chord(880,.18)`                                                                                             | -34.37 |  -20.21 |    2.600 |        4 |
| glider-wind         | [src/proto/place/moves-view.ts](../../src/proto/place/moves-view.ts)   | `windAt(1,12)`                                                                                               | -30.15 |  -22.22 |   10.000 |       10 |
| machine-chuff       | [src/render/machine-sfx.ts](../../src/render/machine-sfx.ts)           | `chuff(0,0,0)`                                                                                               | -41.55 |  -21.45 |    0.350 |        4 |
| machine-chuff-heavy | [src/render/machine-sfx.ts](../../src/render/machine-sfx.ts)           | `chuff(0,0,1)`                                                                                               | -38.15 |  -19.74 |    0.350 |        4 |
| machine-thump       | [src/render/machine-sfx.ts](../../src/render/machine-sfx.ts)           | `thump(0,0)`                                                                                                 | -20.55 |   -3.14 |    0.300 |        4 |
| machine-clank       | [src/render/machine-sfx.ts](../../src/render/machine-sfx.ts)           | `clank(0,0)`                                                                                                 | -29.15 |  -13.49 |    0.500 |        4 |
| machine-whistle     | [src/render/machine-sfx.ts](../../src/render/machine-sfx.ts)           | `whistle(0,0)`                                                                                               | -11.56 |   -4.91 |    1.600 |        4 |
| minis-knock-soft    | [src/proto/minis/common.ts](../../src/render/fanfare.ts)           | `knock(.2)`                                                                                                  | -31.85 |  -14.97 |    0.200 |        4 |
| minis-knock-hard    | [src/proto/minis/common.ts](../../src/render/fanfare.ts)           | `knock(1)`                                                                                                   | -23.45 |   -5.67 |    0.240 |        4 |
| minis-pop-low       | [src/proto/minis/common.ts](../../src/render/fanfare.ts)           | `pop(0)`                                                                                                     | -26.35 |   -8.30 |    0.160 |        4 |
| minis-pop-high      | [src/proto/minis/common.ts](../../src/render/fanfare.ts)           | `pop(7)`                                                                                                     | -25.65 |   -9.57 |    0.160 |        4 |
| minis-fanfare       | [src/proto/minis/common.ts](../../src/render/fanfare.ts)           | `fanfare(false)`                                                                                             | -23.54 |  -11.50 |    0.565 |        4 |
| minis-fanfare-big   | [src/proto/minis/common.ts](../../src/render/fanfare.ts)           | `fanfare(true)`                                                                                              | -20.77 |  -10.78 |    0.790 |        4 |
| minis-womp          | [src/proto/minis/common.ts](../../src/render/fanfare.ts)           | `womp()`                                                                                                     | -18.76 |  -12.26 |    1.880 |        4 |
| minis-boing-low     | [src/proto/minis/common.ts](../../src/render/fanfare.ts)           | `boing(0)`                                                                                                   | -28.43 |  -10.55 |    0.330 |        4 |
| minis-boing-high    | [src/proto/minis/common.ts](../../src/render/fanfare.ts)           | `boing(1)`                                                                                                   | -28.23 |  -10.93 |    0.330 |        4 |
| honk-normal         | [src/features/honk.ts](../../src/features/honk.ts)                     | `honkSound(261.63,.16,0,0,392)`                                                                              | -28.29 |  -17.55 |    0.300 |        4 |
| honk-toot           | [src/features/honk.ts](../../src/features/honk.ts)                     | `honkSound(261.63,.16,1,0,392)`                                                                              | -29.75 |  -18.58 |    0.180 |        4 |
| honk-double         | [src/features/honk.ts](../../src/features/honk.ts)                     | `honkSound(261.63,.16,2,0,392)`                                                                              | -27.83 |  -18.04 |    0.355 |        4 |
| honk-low            | [src/features/honk.ts](../../src/features/honk.ts)                     | `honkSound(261.63,.16,3,0,392)`                                                                              | -26.84 |  -16.47 |    0.370 |        4 |
| honk-chord          | [src/features/honk.ts](../../src/features/honk.ts)                     | `chordSound([261.63,329.63,392],.17)`                                                                        | -31.14 |  -16.48 |    1.000 |        4 |
| ping-ball-own       | [src/features/ping.ts](../../src/features/ping.ts)                     | `chime(0,'ball',true)`                                                                                       | -35.34 |  -21.07 |    0.275 |        4 |
| ping-ball-remote    | [src/features/ping.ts](../../src/features/ping.ts)                     | `chime(0,'ball',false)`                                                                                      | -38.00 |  -23.90 |    0.275 |        4 |
| ping-look-own       | [src/features/ping.ts](../../src/features/ping.ts)                     | `chime(0,'look',true)`                                                                                       | -35.44 |  -21.07 |    0.275 |        4 |
| ping-look-remote    | [src/features/ping.ts](../../src/features/ping.ts)                     | `chime(0,'look',false)`                                                                                      | -38.12 |  -23.90 |    0.275 |        4 |
| ball-impact         | [src/features/impact.ts](../../src/features/impact.ts)                 | `boing(18,.3,false)`                                                                                         | -29.05 |  -12.14 |    0.265 |        4 |
| faceplant           | [src/features/impact.ts](../../src/features/impact.ts)                 | `boing(18,.35,true)`                                                                                         | -28.45 |  -11.07 |    0.265 |        4 |
| pickup-0            | [src/proto/haul/pickup-feel.ts](../../src/proto/haul/pickup-feel.ts)   | `thock(0)`                                                                                                   | -25.85 |  -10.00 |    0.200 |        4 |
| pickup-30           | [src/proto/haul/pickup-feel.ts](../../src/proto/haul/pickup-feel.ts)   | `thock(30)`                                                                                                  | -25.45 |   -9.31 |    0.200 |        4 |
| pickup-60           | [src/proto/haul/pickup-feel.ts](../../src/proto/haul/pickup-feel.ts)   | `thock(60)`                                                                                                  | -24.85 |   -8.62 |    0.200 |        4 |
| magnet-whoosh-5     | [src/proto/haul/magnet-sound.ts](../../src/proto/haul/magnet-sound.ts) | `whooshIn(5)`                                                                                                | -53.05 |  -37.71 |    0.260 |        4 |
| magnet-whoosh-12    | [src/proto/haul/magnet-sound.ts](../../src/proto/haul/magnet-sound.ts) | `whooshIn(12)`                                                                                               | -51.75 |  -36.31 |    0.260 |        4 |
| magnet-tick         | [src/proto/haul/magnet-sound.ts](../../src/proto/haul/magnet-sound.ts) | `arrivalTick()`                                                                                              | -36.05 |  -17.39 |    0.240 |        4 |
| magnet-tick-accent  | [src/proto/haul/magnet-sound.ts](../../src/proto/haul/magnet-sound.ts) | `step=2;lastAt=performance.now();arrivalTick()`                                                              | -32.35 |  -16.63 |    0.246 |        4 |
| magnet-chord        | [src/proto/haul/magnet-sound.ts](../../src/proto/haul/magnet-sound.ts) | `step=4;burstChord()`                                                                                        | -30.26 |  -15.57 |    0.537 |        4 |
| magnet-chord-big    | [src/proto/haul/magnet-sound.ts](../../src/proto/haul/magnet-sound.ts) | `step=11;burstChord()`                                                                                       | -28.27 |  -15.57 |    0.553 |        4 |
| wave-horn-one       | [src/proto/haul/wave.ts](../../src/proto/haul/wave.ts)                 | `horn(1)`                                                                                                    | -13.62 |   -3.53 |    1.851 |        4 |
| wave-horn-two       | [src/proto/haul/wave.ts](../../src/proto/haul/wave.ts)                 | `horn(2)`                                                                                                    | -16.90 |   -3.53 |    1.351 |        4 |
| wave-rumble         | [src/proto/haul/wave.ts](../../src/proto/haul/wave.ts)                 | `setRumble(1)`                                                                                               | -20.47 |   -9.97 |   10.000 |       10 |
| wave-sweep          | [src/proto/haul/wave.ts](../../src/proto/haul/wave.ts)                 | `whoosh(1)`                                                                                                  | -25.17 |  -12.87 |    1.699 |        4 |
| wave-catch          | [src/proto/haul/wave.ts](../../src/proto/haul/wave.ts)                 | `whoosh(.7)`                                                                                                 | -28.04 |  -15.96 |    1.699 |        4 |
| hut-piece           | [src/features/hut-build.ts](../../src/features/hut-build.ts)           | `thump({at:{x:0,z:0},voices:[]},{w:1,h:1,d:1},1,0,false)`                                                    | -22.45 |   -5.08 |    0.250 |        4 |
| hut-phase           | [src/features/hut-build.ts](../../src/features/hut-build.ts)           | `thump({at:{x:0,z:0},voices:[]},{w:1,h:1,d:1},1,4,true)`                                                     | -23.84 |   -5.32 |    1.028 |        4 |
| era-pad             | [src/proto/era/ambience.ts](../../src/proto/era/ambience.ts)           | `const b=setup();pad(b,0,CHORDS[0],20)`                                                                      | -46.86 |  -34.47 |   22.101 |       24 |
| era-mallet          | [src/proto/era/ambience.ts](../../src/proto/era/ambience.ts)           | `const b=setup();mallet(b,0,349.23,.05,0,.2)`                                                                | -47.74 |  -34.03 |    4.463 |        8 |
| era-gull            | [src/proto/era/ambience.ts](../../src/proto/era/ambience.ts)           | `const b=setup();gull(b,0,0,.017)`                                                                           | -64.26 |  -51.42 |    3.136 |        5 |
| era-knock           | [src/proto/era/ambience.ts](../../src/proto/era/ambience.ts)           | `const b=setup();knock(b,0,0,.065)`                                                                          | -60.93 |  -39.13 |    3.210 |        5 |
| era-creak           | [src/proto/era/ambience.ts](../../src/proto/era/ambience.ts)           | `const b=setup();creak(b,0,0,.04)`                                                                           | -68.59 |  -57.66 |    3.571 |        5 |
| era-motif           | [src/proto/era/ambience.ts](../../src/proto/era/ambience.ts)           | `const b=setup();motif(b,0)`                                                                                 | -43.27 |  -31.28 |    6.866 |       10 |
| era-surf            | [src/proto/era/ambience.ts](../../src/proto/era/ambience.ts)           | `const b=setup();for(const k in next)next[k]=1000;b.surf.forEach(s=>s.next=0);bed(b,0,.15)`                  | -54.54 |  -35.83 |   14.997 |       15 |
| era-breeze          | [src/proto/era/ambience.ts](../../src/proto/era/ambience.ts)           | `const b=setup();for(const k in next)next[k]=1000;b.surf.forEach(s=>s.next=1000);next.breeze=0;bed(b,0,.15)` | -68.29 |  -56.57 |    9.958 |       10 |

#### C. Isolated Place ambience [M]

**12 cases**, stereo 48 kHz, seed `0x5b00`, source bus before master/compressor. Actual filters, convolution and 1.5-second startup fade retained. Surf/breeze isolated by disconnecting the other paths, with shore wash 1/inland wash 0 and zero directional water bias. Beds are 30-second observations, not loop-asset lengths. Gull patterns start at 8 seconds inside a 16-second window after startup settles, at near distance parameter 0/far 1. The answered call's delayed reply is scheduled using offline suspend/resume. RMS includes the full capture's silence; active length includes gaps between calls and the reverb tail. These different windows are recorded deliberately.

| Cue                | Capture s | Active s | LUFS-I |   dBTP | RMS dBFS |
| ------------------ | --------: | -------: | -----: | -----: | -------: |
| surf-shore         |        30 |   29.996 | -42.01 | -26.00 |    -44.2 |
| surf-inland        |        30 |   29.976 | -53.22 | -37.04 |    -55.4 |
| breeze-shore       |        30 |   29.829 | -61.89 | -50.28 |    -64.4 |
| breeze-inland      |        30 |   29.896 | -52.94 | -41.28 |    -55.4 |
| gull-mew-near      |        16 |    1.772 | -43.73 | -33.69 |    -60.4 |
| gull-mew-far       |        16 |    1.772 | -57.68 | -46.35 |    -72.9 |
| gull-pair-near     |        16 |    2.083 | -45.85 | -34.23 |    -61.2 |
| gull-pair-far      |        16 |    2.055 | -59.22 | -47.19 |    -73.7 |
| gull-long-near     |        16 |    3.121 | -46.38 | -33.93 |    -58.8 |
| gull-long-far      |        16 |    3.071 | -59.00 | -46.07 |    -70.7 |
| gull-answered-near |        16 |    4.716 | -47.56 | -34.23 |    -60.0 |
| gull-answered-far  |        16 |    4.693 | -59.03 | -47.19 |    -70.6 |

#### D. Actual graph, restored original gain [M]

The existing renderer ran on this checkout through its normal WebGPU game harness. These are **28 exported takes**, not 28 individual sounds; one was silent. Fresh audio context defaults/master volume 1, no saved mute, current shared buses/compressor; Place ambience-only takes explicitly mute other buses. Exact sequences/positions are in `PAGES` in [render.ts](../../dev/audio/render.ts). No random seed was fixed for live takes. Numbers below were metered after reversing each preview's recorded `gainDb` in FFmpeg. They establish one captured output, not a bound on all combinations.

| Live take (sequence/context) | Capture s |              I LUFS | True peak dBTP |
| ---------------------------- | --------: | ------------------: | -------------: |
| ui-tick                      |     2.322 |               -45.0 |          -26.6 |
| ui-pop                       |     1.582 |               -36.9 |          -18.6 |
| ui-thunk                     |     1.465 |               -30.3 |          -11.6 |
| ui-deny                      |     1.186 |               -40.5 |          -25.2 |
| ui-count                     |     3.199 |               -32.6 |          -19.0 |
| ui-flap                      |     1.744 |               -58.7 |          -27.4 |
| honk                         |     3.719 |               -26.4 |          -16.3 |
| honk-chord                   |     3.725 |               -26.0 |          -11.3 |
| honk-jam                     |    10.926 |               -25.5 |          -11.4 |
| ping                         |     1.935 |               -35.3 |          -21.2 |
| ball-boing                   |     3.122 |               -30.8 |          -11.4 |
| wave                         |    32.498 |               -20.8 |           -4.7 |
| pickup-thock                 |     3.134 |               -25.5 |           -9.1 |
| magnet-burst                 |     3.051 |               -25.9 |          -13.9 |
| minis-knock                  |     1.371 |               -26.1 |           -8.2 |
| minis-pop                    |     1.802 |               -23.8 |           -8.8 |
| minis-fanfare                |     2.146 |               -22.2 |          -11.1 |
| minis-womp                   |     1.297 |               -19.3 |          -12.6 |
| minis-boing                  |     1.561 |               -26.6 |           -9.5 |
| build-hut                    |    34.000 | N/A: silent fixture |            N/A |
| era-wood-bed                 |    24.000 |               -43.8 |          -27.2 |
| era-wood-bed-60              |    60.000 |               -45.0 |          -30.5 |
| era-opening-day              |    43.915 |               -45.0 |          -29.3 |
| place-mix                    |    30.000 |               -41.9 |          -25.0 |
| place-coast                  |    45.000 |               -41.2 |          -24.5 |
| place-river                  |    45.000 |               -46.1 |          -28.5 |
| place-inland                 |    45.000 |               -48.4 |          -33.8 |
| place-gulls                  |    26.204 |               -48.3 |          -31.9 |

**Harness failures, not passing gameplay verification:** `soapbox-silent` recorded sample peak **−18.7 dBFS** (no WAV exported for a failed silence check); its source was not attributed. `build-hut` exported 34 seconds of silence; LUFS/true peak are **N/A**, despite the meter's floor value. `track-machine` timed out waiting for `rules.sites.kind() === 1`, so its live measurement is **N/A**. The isolated hut/machine renders above prove those recipes produce sound but do not repair their live trigger fixtures. The command exited 1 with these three problems. In addition, `minis-womp` captures only 1.297 seconds of a recipe whose sources last 1.88 seconds: the generic 1.2-second post-trigger tail cuts its last note. Treat that live row as a truncated excerpt; table B contains the complete recipe. Replace fixed recorder tails with cue completion/tail metadata. No whole-session loudness conformance is claimed.

The current live UI thunk peaks about **15 dB above tick** and **16 dB above flap**. In the same mono source fixture, rockBreak peaks **25.1 dB above cartPush**. These differences identify audition candidates, not automatic faults: perceived loudness depends on spectra and duration. The wave sequence reaches **−4.7 dBTP** at the existing master; preserve its owner-pending identity while checking overlaps. There were no clipping claims inferred from envelope coefficients.

Scratch evidence remains at `/tmp/boogle-audio-mix/`: `offline/manifest.json`, `extra/measurements.json`, `extra2/measurements.json`, `offline-place-bed/measurements.json`, `full/manifest.json` and `full/metrics.json`, with WAVs. Reproduction scripts are `offline-render.ts`, `extra-render.cjs`, `extra2-render.cjs`, and `offline-place-bed.ts`; they contain exact extracted-source boundaries/inputs. These are temporary local artifacts, not committed runtime/tooling changes. The committed tables retain the results and fixture definitions; the next subsection specifies their durable harness implementation. Source HEAD and source hashes are in the offline manifests. Node 26.13.0 was used for the repository harness; FFmpeg 8.1 for analysis.

### Normalization targets and repeatable script plan

**[V]** [ITU-R BS.1770-5](https://www.itu.int/dms_pubrec/itu-r/rec/bs/R-REC-BS.1770-5-202311-I!!PDF-E.pdf) defines K-weighted programme loudness and true-peak measurement; [EBU R128](https://tech.ebu.ch/publications/r128) specifies −23 LUFS for broadcast programmes. Neither says every game footstep should be −23 LUFS. Use gated integrated readings for sufficiently long samples/loops, and peak plus a fixed-window/active RMS comparison for short one-shots.

**[H] Asset preparation:** keep originals unchanged. For future music bounces and continuous ambience, begin with an import reference of **−24 LUFS integrated, maximum −3 dBTP**, then route ambience quieter. Normalize a stem group with one common gain derived from its reference sum; never independently normalize its drums, bass and pad. Do not force sparse files with mostly silence to the same target. For footstep families, start with **−12 dBFS sample peak** at the source and inspect RMS over the same onset-aligned 100 ms window; adjust outliers by ear at matched context levels, retaining intentional soft/heavy differences. Use true peak as a ceiling as well, since pitch shifting and filtering can raise peaks. A short tick's loudness is not rescued by boosting it until a gated meter registers.

**[H] Normalization order:** first preserve/measure the retained UI, pickup, honk and babble reference; compare hot pickup/minigame/impact bodies against quieter Place work cues. Correct family outliers and unnecessary layer overlap before bus gain. Next prepare the first footstep and landing family against that reference. Normalize a future owner music bounce as a whole; leave stems together. The pending wave gets measurement only until the owner has played it.

Extend the existing harness, not a second game audio engine. Proposed `dev/audio/analyze.ts` and recipe fixtures should:

1. Enumerate tracked sample paths and all registered procedural cue IDs; retain an explicit legacy-generator list until migration finishes. Fail/report a missing fixture rather than silently calling a partial catalogue complete. Correct `--offline-place`'s hardcoded **21** expectation: today **24 cues + one overlap fixture = 25**. Keep cut-moment checks distinct from playable sound definitions.
2. Render actual context-injected recipes at **48 kHz**, fixed inputs, fixed seed, fresh context per case; keep mono source layout and separately capture stereo output. Record source commit/hash, browser/FFmpeg versions, seed, exact parameters, support/listener, bus/user/duck/profile values and tap position. For random families use at least five seeds and report range plus median, not just a lucky take.
3. Write **unnormalized float32 WAV first**. Keep full windows for beds and play sessions; store onset/end/threshold and active length separately for one-shots. Do not cut reverb tails, clamp overs, or let preview normalization overwrite raw evidence. Count finite/nonfinite samples and samples beyond full scale.
4. Run FFmpeg separately for integrated/true peak and RMS. [FFmpeg's filter documentation](https://ffmpeg.org/ffmpeg-filters.html#ebur128) specifies `ebur128` true-peak analysis. Capture tool stderr plus structured JSON results. Use the [EBU test set](https://tech.ebu.ch/loudness) to check a proposed new meter; RMS alone is not a LUFS implementation.
5. Generate a Markdown/JSON ledger: `id, source, trigger, parameters, bus, authoredDb, seconds, activeSeconds, I, I400, maxM, maxS, LRA, samplePeak, truePeak, RMS100, rmsWindow, clipped, seed, provenance`. Null with a reason for short/silent/untriggered cases. Include a raw-level audition and a separate optional timbre comparison; never confuse their levels.
6. Capture a repeatable **30-minute representative route**: walking/running, repeated chopping and pickups, quiet shore, town chatter, dialogue, construction, a crossing and six-player overlap. Also retain a 60-second busy excerpt for iteration. Solo and co-op, both profiles, stereo and mono are separate readings; a tiny fixture cannot establish whole-game conformance.

Example analysis commands for a raw file; they do not alter the asset:

```sh
ffprobe -v error -show_entries format=duration:stream=sample_rate,channels -of json raw.wav
ffmpeg -hide_banner -nostats -i raw.wav -af ebur128=peak=true -f null -
ffmpeg -hide_banner -nostats -i raw.wav -af astats=metadata=0:reset=0 -f null -
```

Use `spawnSync` argument arrays for batch paths. For a long file, compute `trimDb = min(targetLUFS - measuredI, ceilingDbTP - measuredTP)` and write a derivative with constant gain; if peak headroom prevents reaching target, report that constraint rather than secretly compressing it. Re-measure the encoded/decoded shipping derivative. A production two-pass `loudnorm` workflow must record whether it stayed linear; do not assume a target automatically preserves dynamics.

## 3. A mix the owner can dial

### Bus structure and relative level table

**[V]** [Unity's Audio Mixer](https://docs.unity3d.com/6000.0/Documentation/Manual/AudioMixer.html), [Godot's buses](https://docs.godotengine.org/en/stable/tutorials/audio/audio_buses.html), and [FMOD mixing](https://www.fmod.com/docs/2.04/studio/mixing.html) provide category routing and grouped processing. Boogle already has that graph's core; its missing pieces are controlled calibration, ownership of transient mix changes, and global admission—not a middleware dependency.

```text
source → asset/recipe calibration → variation → distance/pan → category authored trim
  → category user gain → category duck gain → sum → profile processing/calibration
  → output guard if justified → user master/mute → output meter → destination

categories: music, ambience, SFX, UI, voice/Boogler
SFX children: character, work/machines, social (only where separate control helps)
```

First extract the existing graph with **identical effective gain**. Then audition the following calibrated candidate, with user sliders at unity. The “candidate” column assumes each family has been prepared to the source references above; it must **not** be pasted onto the present unequal recipes. Preserve the UI kit's 0.4 stage during migration, then fold it into one documented authored trim exactly once. Calibrate the representative babble phrase before removing its present −12 dB compensation.

| Route/category                    | Current authored level                  | Candidate starting trim                                              | Reason                                                                                               |
| --------------------------------- | --------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Master                            | −1.94 dB at volume 1; before compressor | 0 dB user reference after processing; separate measured profile trim | Volume control should not alter compression character; final trim comes from whole-route measurement |
| Music                             | −13 dB; no current track                | −8 dB under calibrated content; reveal snapshot up to −3 dB          | Make room for material contacts and speech; lower masking before raising a highlight                 |
| Ambience                          | 0 dB; already quiet layered recipes     | −12 dB                                                               | Continuous beds occupy time; preserve pauses and avoid competing with footsteps                      |
| SFX parent / work                 | 0 dB                                    | 0 dB                                                                 | Reference for consequential physical work; calibration occurs at recipe/family level                 |
| Local walking / running           | Missing                                 | −8 / −5 dB within SFX                                                | Feedback remains audible but repeated steps stay below deliberate work                               |
| Other players' steps              | Missing                                 | Additional −6 dB plus distance                                       | Hear company nearby without six equally loud rhythmic streams                                        |
| Jump / normal landing             | First jump and normal landing missing   | −11 / −4 dB within SFX                                               | Small takeoff, stronger contact; soft/heavy landing adds −6/+4 dB with a cap                         |
| UI                                | 0 dB bus ×0.4 internal = −7.96 dB       | −8 dB                                                                | Personal confirmations are clear and short; no positional falloff                                    |
| Foreground Boogler/resident voice | −12 dB plus syllable envelopes          | 0 dB after phrase calibration                                        | Foreground speech sets the perceptual reference without making every bark foreground                 |
| Ambient resident babble           | Voice −12 dB, then −13 dB chatter       | −13 dB under calibrated foreground voice, plus distance              | Inhabited world texture, no global duck                                                              |
| Social honk/ping                  | SFX with event-specific levels          | −3 dB within SFX, preserve chord balance                             | Friends remain legible; no automatic attenuation of chord notes into a different harmony             |

These are **relative trim hypotheses**, not predicted output LUFS. At any moment the sum, spectra, concurrency and compressor alter the measured result. Avoid compensating quiet transients with a raised SFX bus that also raises the wave and machinery. Keep important feedback visible when muted.

### Ducking and voice admission

Replace `duckForVoice(boolean)` with releasable claims internally while keeping a compatibility facade. Foreground dialogue requests **music −9 dB, ambience −4 dB, sustained machinery −3 dB**; local contacts, UI and friends' short honks remain readable. Start with **40 ms attack and 350 ms release durations**, hold through the last audible syllable/tail, and merge overlapping claims by strongest attenuation rather than addition. Release on skip, leave, disposal and interruption. Background chatter never ducks the whole world. Ordinary footsteps do not repeatedly pump music. Optional crossing/reward duck: ambience/work beds −3 dB, release 500 ms.

Implement ducks with a separate GainNode and `AudioParam` ramps; never restore a player's muted category to unity. Web Audio's DynamicsCompressor has one signal input, not a public external sidechain socket; gain automation is sufficient for these semantic events. Do not route the voice signal into the music compressor expecting it to work as a key input. If actual player voice chat is added later, give it separate user control and capture policy; `voice` currently means synthesized NPC voice.

Adopt the earlier [audio-architecture](audio-architecture.md) **24 steady / 32 peak logical voices, 96 native source nodes** as an initial instrumented ceiling, not a performance result. Include scheduled sources, LFOs, releases and overlapping stems. Reserve four logical voices and sixteen sources for foreground contacts/UI/dialogue; limits apply to total cost, not each subsystem independently. A clink can create many oscillators from one logical event.

Priority order: foreground dialogue and essential local contact/UI; nearby honk/landing and focal work; remote footsteps/construction; distant chatter/ambience detail. Within each tier use effective audibility, then age. Footsteps have the 2-per-emitter/8-total sublimit; foreground speech one plus one ambient exchange; keep Place's eight-event limit and magnet's eight-event limit while moving them under the global ceiling. Releasing sources still count. Drop stale one-shots instead of virtualizing them for later playback; persistent ambience can maintain a cheap virtual state and resume at an appropriate phase. Report legacy bypasses until all callers participate.

### Phone speakers versus headphones

**[V]** Sony's current [ASWG-R001 v1.2, March 2024](https://github.com/Sony-ASWG/Loudness/blob/main/ASWG-R001%20v1.2.pdf), recommendations 4–11 and note 1, specifies **−24 ±2 LKFS home**, **−18 ±2 LKFS portable**, **≤−1 dBTP**, and at least **30 minutes** of representative whole-game measurement. Its note accepts BS.1770-3 or later meters; LKFS and LUFS are interchangeable. This is guidance for SIE platforms, not an Apple/browser certification rule. Garry Taylor's [GDC 2013 slides](https://media.gdcvault.com/gdc2013/slides/824764Garry_Taylor_Loudness_and_how.pdf) explain representative measurement; their older **−23** home figure is superseded by the linked ASWG document. Slides read; talk not watched.

**[H]** Offer **Full** (headphones/quiet room, reference −24 LUFS) and **Compact** (phone speakers/noisy room, reference −18 LUFS), selectable independently of device detection. Start with Full; the owner's target listening setup chooses the eventual default. Do not infer headphones from a mobile user agent. Suggested audition LRA bands are **8–12 LU Full, 4–7 LU Compact**; they are not ASWG requirements and should not be forced onto naturally quiet scenes. Preserve silence and transients; Compact is not simply every source +6 dB.

Use less background density and a gentle sustained-SFX compressor for Compact, with an initial **2:1 ratio, 10 ms attack, 200 ms release**, threshold chosen from recorded bus levels. Retain existing processing for the first baseline, then compare profiles at matched loudness before choosing dynamics. Recheck output peaks after profile gain. If measured overs remain, evaluate an oversampled/lookahead output limiter; the existing DynamicsCompressor alone is not a true-peak limiter. User master comes last so it changes listening level, not the artistic balance. A new processing order requires fresh calibration, because native compressor makeup gain is not transparent.

For small speakers, put landing/wood weight in audible low-mid harmonics rather than only 50–100 Hz, shorten overlapping tails, and avoid bright sand/water hiss masking speech. Check mono fold-down and modest stereo width; do not solve weak phone bass by making impacts louder everywhere. Headphones keep spatial detail and more dynamic contrast. Digital LUFS does not predict acoustic SPL at a user's volume setting. Actual speaker/headphone balance, comfort and fatigue are unverified.

### Metering and local tunables

An optional development AudioWorklet can tap the final output and category sums, passing audio through unchanged. Use K-weighting, channel-energy sums, 400 ms blocks/100 ms hops with −70 LUFS absolute and −10 LU relative gating for integrated loudness; maintain 3-second short-term and 400 ms momentary views. True peak needs an oversampled reconstruction filter, not `max(abs(sample))`. Validate against the EBU files and the offline reference before calling it a BS.1770 meter. Reuse a vetted implementation where practical; send compact aggregates to the UI a few times per second and avoid allocation/logging on the audio thread. The [Web Audio specification](https://www.w3.org/TR/webaudio/#AudioWorklet) supplies the execution mechanism, not a built-in LUFS meter. Keep it development-only until runtime metering has a demonstrated use.

**[C]** Boogle already has [typed catalogue metadata](../../src/tunables/catalog.ts), [local bindings in the Dev adapter](../../src/debug/dev/tunables.ts), and [the tune CLI](../../dev/tune.ts). Audio has only master volume/mute today. **[H]** add metadata beside `audio.ts` (proposed `audio-tuning.ts`) and one typed `get/set/snapshot/reset` owner interface. The current Local Dev route assumes a registered live binding; adding catalogue rows alone would show unavailable controls. Wire the actual audio binding, validate bounds/finite values, and retain pending values before context unlock without constructing a second context.

Initial keys: `audio.musicDb`, `ambienceDb`, `sfxDb`, `uiDb`, `voiceDb` (−40…+6 dB); `footstepsDb` (−24…0), `remoteStepsDb` (−18…0), `landingDb` (−18…+6); `duck.musicDb` (−18…0), attack/release (5…200/50…1500 ms); footstep distance (6…30 m), jitter cents (0…80), jitter dB (0…3), event cap (4…12), and profile calibration trim. Keep metadata names fully prefixed in the actual catalogue. Defaults live with owners; bounds are experiment limits, not invitations to raise everything.

All mix keys are **Local**, including random selection and the device profile. They never go into `sim/tune.ts`, room saves or accepted gameplay operations. Convert dB to gain only at the Web Audio edge; smooth live gain edits over 20–50 ms to avoid clicks. A development session can snapshot/diff/reset them; promotion to a source default remains an explicit reviewed edit. Store user category settings separately from authoring calibration and duck state. The existing pause master and mute must survive.

Proposed commands after those bindings exist (not functional audio commands today):

```sh
npm run tune -- set audio.footstepsDb -8 --session
npm run tune -- set audio.remoteStepsDb -6 --session
npm run tune -- snapshot --session --out /tmp/boogle-audio-favourite.json
```

Expose the same values in the existing Dev controls for the owner, with dB units, reset and named A/B snapshots. Show effective gain and active voice counts, not only requested settings. This satisfies the owner's “anything playtests could tune is tunable” call without a new mixer editor.

## 4. Ordered build plan and numbered recommendations

1. **Make the baseline trustworthy first.** Extend [dev/audio/render.ts](../../dev/audio/render.ts) with raw float output, cue-complete fixtures, correct Place counts and explicit failed-trigger reporting. Retain the measurements above as one snapshot. Prove one pickup, one babble line, ordinary repeated work and the existing cut checks at original relative levels; do not rebalance from normalized previews.
2. **Calibrate existing families before adding more layers.** Start with [UI](../../src/ui/ui-sound.ts), [pickup/clink](../../src/render/clink.ts), [minis](../../src/render/fanfare.ts), [machine](../../src/render/machine-sfx.ts) and [Place cues](../../src/render/place-sfx.ts). Correct within-family outliers using peak/RMS for hits and LUFS for sustained material. Keep the wave unchanged pending its playtest, retain kept timbres, and normalize future music as a summed programme.
3. **Adopt the five-bus table through local tunables.** In [audio.ts](../../src/render/audio.ts), separate authored, user and duck gains; add real bindings to [catalogue](../../src/tunables/catalog.ts) and [Dev tunables](../../src/debug/dev/tunables.ts). Preserve effective levels first, then audition the candidate table and post-processing master order. Show actual node values and snapshot the owner's settings.
4. **Add grass/wood walking and running, plus first jump and normal landing.** Tie contacts to [Buddy stride](../../src/player/buddy/rig.ts), with shuffled takes or equivalent procedural variations, support-relative speed and landing deduplication. Then add sand, rail panels and shallow water, and soft/heavy impacts. Start with owned/CC0 comparisons under the existing procedural direction; do not quietly replace it. Update the owning [Place sound description](../game-design/place.md#sound) only when implemented.
5. **Bound co-op sound before expanding the library.** Apply local/remote step trims, 18 m falloff and 2/8 footstep caps, then integrate [Place](../../src/render/place-sfx.ts), [magnet](../../src/proto/haul/magnet-sound.ts), machinery and honks into the 32-event/96-source ceiling. Verify six walkers, several pickups and a protected local landing without queued stale sounds.
6. **Make speech clear with owned duck claims.** Replace the boolean duck behind [audio.ts](../../src/render/audio.ts) and the [NPC voice](../../src/render/npc-voice.ts) lifecycle. Compare −9/−4/−3 dB music/ambience/machine dips with the current shared −9 dB duck, including overlap, skip and interruption; background chatter gets no global claim.
7. **Calibrate Full and Compact from a representative route.** Use the raw capture and optional validated worklet, target −24/−18 LUFS respectively and ≤−1 dBTP, then audition speaker/headphone and mono output. Agent checks cover signals, event timing, caps and lifecycle; the owner chooses the balance. Stop at that playtest before further taste tuning. Not tested on a device.
