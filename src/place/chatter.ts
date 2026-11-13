// The little guys' chatter (owner: "they could sort of chatter with each other using the same audio mechanism as the NPC
// talking to each other"). A short babble line through the NPC voice's own plan and lane (src/render/npc-voice.ts), small
// and high, on the voice bus at a low level and without ducking anything, so a passing exchange never pumps the mix
// (docs/research/little-guys.md, "a silence budget"). Silent until the player's first gesture, like all audio: getAudio
// returns null till then. ./folk.ts decides who talks, how rarely and for how long. Local.
import { dbToGain, getAudio } from '../render/audio.ts';
import { buildPlan, createLane, folkVoice, type VoiceSpec } from '../render/npc-voice.ts';
import { camera } from '../render/scene.ts';

/** The tunes to listen for. `levelDb` is against the voice bus, where The Boogler talks at 0. */
export const CHATTER = {
  levelDb: -13,
  earshot: 13, // m from the camera: silent beyond, full inside `near`
  near: 4,
  baseHz: 300, // the lowest guy; each is a step up from it (The Boogler is 155)
  stepHz: 22,
  steps: 6,
};
// Nonsense, never shown: the plan reads its vowels, stops and punctuation. A question lifts, a statement drops.
const LINES = [
  'Mip mop?',
  'Oh, bobo!',
  'Wibby dee.',
  'Nuh nuh!',
  'Tika tika?',
  'Hup, hup.',
  'Bibble ba!',
  'Oo, dobby?',
  'Mm. Mm-hm.',
  'Pok a pok.',
  'Ya ya ya!',
  'Dee? Doo.',
];

export function voiceOf(k: number): VoiceSpec {
  return folkVoice(CHATTER.baseHz + (k % CHATTER.steps) * CHATTER.stepHz, 15, 1.3 + (k % 3) * 0.06, 4200);
}

/** Says one line at (x, z); returns how long it runs in ms, and a stop for when it's cut off. Silent is fine: the same length. */
export function babble(n: number, k: number, x: number, z: number) {
  const text = LINES[n % LINES.length]!;
  const v = voiceOf(k);
  const { syllables } = buildPlan(text, 'smile', v);
  const last = syllables[syllables.length - 1];
  const ms = last ? last.at + last.ms : 300;
  const d = Math.hypot(camera.position.x - x, camera.position.z - z);
  const fade = 1 - Math.max(0, Math.min(1, (d - CHATTER.near) / (CHATTER.earshot - CHATTER.near)));
  const audio = fade > 0 ? getAudio('voice') : null;
  if (!audio) return { ms, stop: () => {} };
  const out = audio.ctx.createGain();
  out.gain.value = dbToGain(CHATTER.levelDb) * fade * fade;
  out.connect(audio.out);
  const lane = createLane(audio.ctx, out, v);
  const zero = audio.ctx.currentTime + 0.02;
  for (const s of syllables) lane.grain(s, zero + s.at / 1000);
  const endAt = zero + ms / 1000 + 0.05;
  lane.end(endAt);
  const drop = setTimeout(() => out.disconnect(), ms + 300);
  return {
    ms,
    stop() {
      clearTimeout(drop);
      lane.stop(audio.ctx.currentTime);
      setTimeout(() => out.disconnect(), 80);
    },
  };
}
