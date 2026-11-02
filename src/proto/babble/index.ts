// ?proto=babble: a voice for The Boogler's talk box, Animal Crossing's text-shaped babble as our own (no recordings).
// The default speaks a syllable per vowel group as the line types out; &v=letters speaks every letter, the text slowed
// to suit. Local and cosmetic: each player hears only their own talk, and no bubble speaks.
import { PROTO } from '../flags.ts';
import { setLineVoice } from '../../boogler/dialogue.ts';
import { speak, type VoiceSpec } from './voice.ts';

const q = new URLSearchParams(location.search);
const num = (key: string, or: number) => Number(q.get(key)) || or;

// A comic, grandiose host (docs/research/npc-babble-voices.md, section 9). &hz=, &scale= and &cps= to audition others.
const BOOGLER: VoiceSpec = {
  baseHz: num('hz', 155),
  rangeSemis: 2,
  formantScale: num('scale', 0.9),
  brightnessHz: 3500,
  cps: num('cps', 48),
  grainMs: [65, 95],
  gainDb: -12,
  vowels: [0.3, 0.15, 0.1, 0.25, 0.2],
};
const LETTERS: VoiceSpec = { ...BOOGLER, cps: num('cps', 20), grainMs: [38, 46], everyLetter: true };

const voice = PROTO === 'babble' && q.get('v') === 'letters' ? LETTERS : BOOGLER;
setLineVoice((text, mood) => speak(text, mood, voice));
