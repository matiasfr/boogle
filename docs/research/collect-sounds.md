# Collect sounds: the Ratchet & Clank bolt and the recipe behind a good pickup

*Research report, 2 November 2026. A deep dive behind the owner's 2026-11-02 sound audit ([docs/playtests.md](../playtests.md), [docs/proposals/boogle-2.md](../proposals/boogle-2.md) "Sound"): "pickup thock: juice it better", "magnet burst: more Ratchet & Clank-y", "haul count run: keep, towards Ratchet & Clank". What is known about how Insomniac's bolt pickup sounds, how other collect sounds are built (Mario coins, Sonic rings, Spyro gems, Peggle's pegs, slot-machine payouts), the general recipe, and the numbers Boogle now uses in [src/render/clink.ts](../../src/render/clink.ts), [src/proto/haul/pickup-feel.ts](../../src/proto/haul/pickup-feel.ts), [src/proto/haul/magnet-sound.ts](../../src/proto/haul/magnet-sound.ts) and the `count` voice in [src/render/ui-sound.ts](../../src/render/ui-sound.ts). Builds on [ratchet-and-clank-feel.md](ratchet-and-clank-feel.md) (recs 2 and 9) and [audio-and-music.md](audio-and-music.md) without repeating them. **No Insomniac audio talk, interview or postmortem about the bolt sound was found**; the bolt's character below comes from reviews, the PlayStation Blog and a fan wiki, and the recipe from synthesis physics and comparable games. Nothing was measured from game audio.*

**Markers.** **[V]**: the page was fetched and the point matches it. **[S]**: seen only in a search summary, a review quoted secondhand or a fan wiki; check before quoting. **[C]**: computed or chosen here. Findings are paraphrased.

## Summary

1. **The bolt is a metallic "ting", not a note.** Reviewers describe a crisp "ting-ting" per bolt [S, GameSpot] and, for a big haul, the "kachinging of a slot machine spitting out coins" [V, EGM]. The 2002 original's bolts were heavy and clanky, and the sound changes from game to game [S, fan wiki]. Insomniac's own description is about the pairing: a tiny haptic impulse from each bolt with a subtle sound from the controller speaker [V, PlayStation Blog].
2. **One sound per piece is the whole trick** (already in ratchet-and-clank-feel.md). What makes many at once pleasant rather than noise is a short strike, a ringing tail that overlaps the next one, and a cap on voices.
3. **A good collect sound has three layers:** a strike (a few ms of bright noise), a tonal body (the resonance of the object) and a sparkle (a quieter, higher second hit or tail). Game audio guides name the same parts attack, body, tail and sweetener [S]; Mario's coin is the minimal version, a short note then a longer one a fourth higher [S].
4. **Metal and wood differ in their overtones, not just their brightness.** A free metal bar rings at 1 : 2.756 : 5.404 : 8.933 times its fundamental (inharmonic, long); an undercut marimba bar is tuned near 1 : 4 : 10 (round, short); higher modes die faster [S, modal synthesis references]. Blending the two sets gives "a log that clinks".
5. **Pitch: climb for the first few, then vary.** Peggle climbs a diatonic scale in the music's current harmony per peg [V]; a combo's pitch should rise with its length [V, Game Developer]. A climb that never stops gets shrill, so Boogle climbs one octave (6 pentatonic steps) and then shimmers among the top three notes at random: the climb says "more", the shimmer says "payout".
6. **Stereo alternation is old and cheap:** the classic Sonic games swap the ring sound between left and right channels on each pickup [V, SRB2 forum; S, sound rips].
7. **Cadence:** coin hoppers pay out 4 to 12 coins a second [S, manufacturer sheets]; Boogle's magnet lands pieces 40 ms apart (25 a second) for 8 drawn pieces, then 45 ms. That is faster than a slot machine, so each tick must be short in its strike (under 5 ms) and quiet in its tail, or the run blurs.

## 1. What is known about the bolt sound

- **Per bolt, from the hands.** "Picking up bolts from a defeated enemy is that much more satisfying when you feel a tiny impulse from each", with a subtle sound from the controller [V, [PlayStation Blog, 2021-05-13](https://blog.playstation.com/2021/05/13/devs-reveal-their-upcoming-dualsense-wireless-controller-implementations/)]. Every bolt makes a sound as it flies into your hands [V, TheGamer, in ratchet-and-clank-feel.md].
- **Words players use.** GameSpot: the controller speaker gives a crisp, satisfying "ting-ting" of collecting bolts [S, [GameSpot review](https://www.gamespot.com/reviews/ratchet-clank-rift-apart-review-a-riveting-adventure/1900-6417686/), page refused the fetch]. EGM: a big haul is the kachinging of a slot machine [V, [EGM review](https://egmnow.com/ratchet-clank-rift-apart-review/)]. A Japanese player felt Rift Apart's bolt collection less exhilarating than the 2016 game's [S, [note.com](https://note.com/papalonia/n/n63bcd829216a?hl=en)].
- **It changes per game.** The original's bolts were big silver and copper pieces with a small attraction radius and a heavy, clanky noise; look, value, radius and sound change from game to game [S, [fan wiki](https://ratchetandclank.fandom.com/wiki/Bolts), page refused the fetch]. Many collectible and impact sounds of the 2016 remake are close to the original's [S, [The Sound Architect](https://www.thesoundarchitect.co.uk/ratchet-clank-2016-a-game-audio-review/)]. The remake's Clank Foley was recorded with ratchets, screwdrivers, wrenches and scrap metal [S, [Somatone](https://somatone.com/the-audio-development-of-ratchet-clank/)]: real small metal, not tones.
- **Not found:** the bolt's layers, its pitch handling (random or climbing), a counter tick sound, or any number. Listening to the games suggests a short bright metallic clink with small random pitch and no audible scale; treat that as an impression, not a finding.

## 2. Comparable collect sounds

| Game | What it does | Lesson | |
|---|---|---|---|
| Super Mario Bros. coin | two square-wave notes, B5 then E6 (a fourth up), the first about 80 ms, the second longer and fading | the upward second hit is the "juice"; the first is the strike | [S, [electro-tech forum](https://www.electro-tech-online.com/threads/8-bit-mario-coin-sound-effect-on-pic.117231/page-2), [Berkeley lab](https://courses.ischool.berkeley.edu/i262/s13/content/chan/lab5-super-mario-coin-bank)] |
| Sonic rings (Mega Drive) | the ring sound alternates left and right channels per pickup | free width and separation for streams | [V, [SRB2 forum](https://mb.srb2.org/threads/stereo-rings.27820/)] |
| Spyro gems | gem colour sets value (1, 2, 5, 10, 25); a pickup sound players remember for decades | not found whether pitch follows value | [S, [Spyro wiki](https://spyro.fandom.com/wiki/Gems)] |
| Crash wumpa | its developer credits the sound effects for making crate smashing rewarding, with collected fruit still ringing out seconds later | tails that overlap make a haul feel big | [S, [Andy Gavin's blog](https://all-things-andy-gavin.com/tag/platform/)] |
| Peggle 2 / Blast | each peg hit steps up a diatonic scale in the current music phrase's harmony; Blast layers harp on every peg plus marimba on orange pegs | climb in key; a second layer marks the special one | [V, [Audio Gang](https://www.audiogang.org/peggle2-sonic-joy/); S, [Audiokinetic](https://blog.audiokinetic.com/en/peggle-blast-peg-hits-and-the-music-system)] |
| Slot machine payout | hoppers pay 4-12 coins a second | the "kaching" stream rate; Boogle's 25 a second needs shorter ticks | [S, Suzohapp and CPI datasheets] |
| Astro Bot, Fortnite | no source on their coin or pickup design turned up (Astro Bot won Best Audio Design at the 2024 Golden Joysticks) | | [S] |

## 3. The recipe

**Layers** (attack, body, tail, sweetener in game-audio terms [S]; a hit lives in its first 20 ms [S]):

1. *Strike*: band-passed noise, Q about 0.9. Metal: centred near 7 kHz, decay time constant about 1.2 ms. Wood: near 1.8 kHz, about 3.7 ms (the "tok"). Level about 0.7 of the body's peak; more for a woodier, punchier hit [C].
2. *Body*: sine modes with a 1.5 ms linear attack and an exponential decay. Metal (free bar): ratios 1, 2.756, 5.404, 8.933, gains 1, 0.5, 0.3, 0.16, ring times (to −60 dB) 1, 0.5, 0.28, 0.16 of the fundamental's. Wood (marimba): 1, 3.93, 9.2, gains 1, 0.28, 0.1, ring 1, 0.35, 0.15 [S for the ratios, C for gains and times]. The fundamental is pitched in key; the inharmonic upper modes make it read as metal without detuning it. A 2 % pitch drop into place over the first 12 ms gives the snap of a hard hit [C].
3. *Sparkle*: the bounce, a second strike 25-45 ms later at 0.25-0.5 of the level, an octave up (or two scale steps up, Mario's upward second note). This is the "ting-ting" [C].

**Variation** (per hit): fundamental ±6 cents (in tune; the old ±2-8 % slid off the key), inharmonic modes ±1.5 %, level ±1.5 dB, bounce delay 25-45 ms, pan alternating ±0.3 with ±0.05 jitter [C].

**Pitch over a run**: one pentatonic step per piece for an octave, then random among the top three without repeats; reset after 700 ms of silence. Accent every 4th (+2 dB, a louder bounce): a run of 16ths at the groove's tempo groups in fours [C].

**End of a burst**: a "cha-ching": root, fifth and octave clinks 40 ms apart (add the tenth after 10 pieces), a shimmer of octave and fifth each doubled at ±6 cents (a 20 ms swell, 0.6 s ring), and a low wooden knock three octaves under the root so the logs land with weight [C].

**Mix**: ui bus; strikes short so 40 ms spacing stays separate; at most 8 voices, the oldest cut with a 4 ms fade; about −18 dBFS a tick at the master [C, from ratchet-and-clank-feel.md rec 9].

## 4. What Boogle does now (v2)

- **Pickup thock** ([pickup-feel.ts](../../src/proto/haul/pickup-feel.ts)): the low knock kept (a sine falling 1.8× into the root two octaves down, 4 ms attack, 30 ms time constant) under a clink half wood, half metal (ring 0.16 s, strike 1.2) whose bounce is two scale steps up. The note is a pentatonic step per 6 logs carried, from C5 to A6. Rendered peak −9.4 dBFS (v1: −9.7).
- **Magnet burst** ([magnet-sound.ts](../../src/proto/haul/magnet-sound.ts)): a swell as pieces leave the pile (noise band-passed 500 → 3200 Hz over 0.2 s); per landing a clink 80 % metal from C6 climbing to C7, then the payout shimmer; every 4th accented; the cha-ching above after 4 or more. Peak −14.5 dBFS for a 5- and a 12-piece burst (v1: −15.9).
- **Haul count** ([ui-sound.ts](../../src/render/ui-sound.ts) `count`): the kept climb, now a small clink (65 % metal, ring 0.14 s, a quiet bounce) instead of a sine blip, and in tune (no ±4 % jitter). Peak −19.3 dBFS (v1: −18.0).

## Not found

- Any Insomniac audio talk, interview or blog post on the bolt sound (GDC Vault, A Sound Effect, Designing Sound and the PlayStation Blog were searched); whether bolts climb in pitch; the bolt counter's sound.
- Astro Bot's coin and Fortnite's pickup design; whether Spyro's gem pitch follows value.
