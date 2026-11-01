# 6.23 Prototype: the groove (`?proto=groove`)

*The first prototypes from [audio-and-music research](../research/audio-and-music.md) (recs 1-3, 5, 7, 9, 12). Gut
question: "Does the island feel more alive and fun with the groove?" Serves DESIGN.md 4 (Cooperation is automatic:
everyone hears the same downbeat) and 10 (Slapstick over precision). Without the flag nothing loads:
`src/features/proto-groove.ts` imports `src/proto/groove/` (and the wagon, `src/proto/wagon/`) only with it. Play it
at `/?room=proto-groove&proto=groove`.*

## What you hear

- **One shared beat.** An 8-bar house loop at 122 BPM in A minor (Am7, Fmaj7, Dm7, Em7, two bars each), with a
  garage shuffle (off 16ths at 56%). Bars are counted from shared world time (`sharedSeconds()`), so every tab hears
  the same downbeat (two tabs agree within about 6 ms once settled; a joining tab settles in about two seconds).
- **Four layers by what you're doing**, changing on bar lines:
  - standing idle: *silent* near spawn (within 22 m), *sparse* elsewhere (offbeat open hats, a soft stab every two
    bars);
  - moving (over 1.2 m/s, or holding a move input; kept 3 s after you stop): *groove* (kick, hats, offbeat bass);
  - standing on a moving deck (the wagon, any platform): *full* (adds chord stabs through a dotted-8th delay).
- **Wipeouts** (a hard landing, being knocked flat by the ball, a tumble off a deck) cut the music for one beat with a
  slide-whistle drop through it, then it comes back.
- **Sound effects on the beat and in key:** your honk and every honk you hear plays on the next 16th note and on the
  nearest note of the current chord (the note icon still pops at once); the honk chord snaps the same way. Wagon
  clacks land on the next 8th note.
- **Mixer:** music, sfx, ui and voice buses (music at -13 dB). Every sound effect goes through the sfx bus, and
  anything over -24 dBFS there ducks the music by 9 dB, easing back in about half a second.
- **The chip** at the top right, under the net pill, shows the state and bar.beat with a dot pulsing on the beat; click it to turn the
  music off or on.

## Variants

- `&v=silent-first`: silent until you first move, and never silent after (idle is sparse).
- `&v=always`: always some music, idle is sparse even at spawn.

## The owner's stems

A manifest and stems in `assets/audio/` replace the placeholder (format: [assets/audio/README.md](../../assets/audio/README.md)):
the clock takes the manifest's tempo, the honks its chords, and its `states` say which stems play when.
