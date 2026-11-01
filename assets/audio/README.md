# Music stems

Drop a manifest (`<name>.json`) and its stems here and `?proto=groove` plays them instead of the synthesized
placeholder (`src/proto/groove/stems.ts`). Reload the page to hear a new bounce.

- **Stems**: same start, same length (`bars` bars at `bpm`), one file per layer. Tails may ring past the loop end: each
  pass starts on the shared downbeat and its tail overlaps the next. `.m4a` (AAC) plays everywhere; check Opus or Ogg
  on the iPad before using them. Keep loops short (8 or 16 bars): each is held decoded in memory (~6 MB per 8-bar
  stereo stem).
- **Manifest**:

```json
{
  "name": "island",
  "bpm": 122,
  "key": "A minor",
  "bars": 8,
  "swing": 0.56,
  "chords": ["Am7", "Am7", "Fmaj7", "Fmaj7", "Dm7", "Dm7", "Em7", "Em7"],
  "layers": { "kick": "island-kick.m4a", "hats": "island-hats.m4a", "bass": "island-bass.m4a", "stabs": "island-stabs.m4a" },
  "gainDb": { "bass": -2 },
  "states": {
    "silent": [],
    "sparse": ["hats", "stabs"],
    "groove": ["kick", "hats", "bass"],
    "full": ["kick", "hats", "bass", "stabs"]
  }
}
```

- `chords` (one per bar) puts the honks in key; `swing` (0.5 = straight) is where honks land on the off 16ths.
- Layer names are yours. `states` says which layers play when: `silent` or `sparse` standing idle, `groove` moving,
  `full` riding the wagon. Changes land on bar lines; a wipeout drops everything for one beat.
- Several manifests: `&stems=<name>` picks one (default: the first by name).
- Encode from WAV: `ffmpeg -i island-kick.wav -c:a aac -b:a 160k island-kick.m4a`.
