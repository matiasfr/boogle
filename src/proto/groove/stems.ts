// The owner's stems, kept from the cut groove prototype for his own music later (docs/proposals/boogle-2.md, "Sound";
// the synthesized placeholder is gone, so nothing plays until a manifest exists and something imports this). Drop a
// manifest and its stems into assets/audio/ (format: assets/audio/README.md):
//
//   assets/audio/island.json
//   {
//     "name": "island",
//     "bpm": 122,                       // the shared clock runs at this tempo
//     "key": "A minor",                 // for people; the sound effects read "chords"
//     "bars": 8,                        // every stem is exactly this long (tails may ring past the end)
//     "swing": 0.56,                    // optional: where the off 16ths land (0.5 = straight)
//     "chords": ["Am7", "Am7", "Fmaj7", "Fmaj7", "Dm7", "Dm7", "Em7", "Em7"],  // one per bar
//     "layers": { "kick": "island-kick.m4a", "hats": "island-hats.m4a", "bass": "island-bass.m4a", "stabs": "island-stabs.m4a" },
//     "gainDb": { "bass": -2 },         // optional trim per layer
//     "states": { "silent": [], "sparse": ["hats", "stabs"], "groove": ["kick", "hats", "bass"], "full": ["kick", "hats", "bass", "stabs"] }
//   }
//
// Stems are found by Vite at build time (import.meta.glob), so a new bounce is picked up by the dev server on reload.
// `?stems=<name>` picks a manifest when there are several (default: the first by name).
import type { Song } from './grid.ts';

export type GrooveState = 'silent' | 'sparse' | 'groove' | 'full';

export type StemsManifest = Song & {
  name: string;
  key?: string;
  layers: Record<string, string>; // layer -> file, relative to assets/audio/
  states: Record<GrooveState, string[]>;
  gainDb?: Record<string, number>;
};

const DEFAULTS = {
  swing: 0.5,
  chords: ['Am7'],
  gainDb: {} as Record<string, number>,
  states: { silent: [], sparse: [], groove: [], full: [] } as Record<GrooveState, string[]>,
};

const manifests = import.meta.glob<Partial<StemsManifest>>('/assets/audio/*.json', { eager: true, import: 'default' });
const files = import.meta.glob<string>('/assets/audio/**/*.{m4a,mp3,ogg,opus,webm,wav,flac}', {
  eager: true,
  query: '?url',
  import: 'default',
});

// The manifest to play (the owner's, from assets/audio/), or null when there is none.
export function pickManifest(): StemsManifest | null {
  const want = new URLSearchParams(location.search).get('stems');
  const paths = Object.keys(manifests).sort();
  const path = paths.find((p) => want && p.endsWith(`/${want}.json`)) ?? paths[0];
  if (!path) return null;
  const m = manifests[path];
  if (!m.bpm || !m.bars || !m.layers) {
    console.warn(`[music] ${path} needs bpm, bars and layers`);
    return null;
  }
  return {
    ...DEFAULTS,
    ...m,
    name: m.name ?? path.replace(/^.*\/|\.json$/g, ''),
    chords: m.chords?.length ? m.chords : DEFAULTS.chords,
    states: { ...DEFAULTS.states, ...m.states },
  } as StemsManifest;
}

// Fetch and decode every stem (decoded buffers start sample-exact on the grid; research section 10). Missing or
// undecodable files are skipped with a warning, so the rest still play.
export async function loadStems(ctx: AudioContext, m: StemsManifest) {
  const out: Record<string, AudioBuffer> = {};
  await Promise.all(
    Object.entries(m.layers).map(async ([layer, file]) => {
      const url = files[`/assets/audio/${file}`];
      if (!url) return console.warn(`[music] stem ${file} (${layer}) is not in assets/audio/`);
      try {
        const data = await (await fetch(url)).arrayBuffer();
        out[layer] = await ctx.decodeAudioData(data);
      } catch (e) {
        console.warn(`[music] could not decode ${file}`, e);
      }
    }),
  );
  return out;
}
