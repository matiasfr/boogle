// Round 4's local material and movement cues. Finite native sources on the existing SFX bus; no game state.
// Research: construction-sound recommendations 1-5, 10; audio-architecture 11; collect-sounds section 3.
import { dbToGain, getAudio } from './audio.ts';
import { noiseBuffer } from './noise.ts';
import { camera } from './scene.ts';

type Layer = { kind: 'tone' | 'noise'; hz: number; to: number; seconds: number; db: number; delay: number };
const tone = (hz: number, to: number, seconds: number, db: number, delay = 0): Layer => ({
  kind: 'tone',
  hz,
  to,
  seconds,
  db,
  delay,
});
const noise = (hz: number, to: number, seconds: number, db: number, delay = 0): Layer => ({
  kind: 'noise',
  hz,
  to,
  seconds,
  db,
  delay,
});

// Bigger rewards add a phrase, not gain. Repeated work has dry, short tails.
const recipes = {
  rockBreak: [noise(1900, 420, 0.24, -21), tone(180, 70, 0.22, -22), noise(2800, 800, 0.12, -29, 0.1)],
  treeFall: [tone(230, 85, 0.65, -26), noise(1100, 260, 0.42, -25), tone(410, 170, 0.24, -32, 0.14)],
  treeLand: [tone(105, 48, 0.32, -22), noise(650, 180, 0.35, -25), noise(2100, 700, 0.24, -30, 0.08)],
  shoulder: [tone(180, 115, 0.16, -26), noise(500, 1200, 0.18, -29), tone(270, 320, 0.16, -32, 0.06)],
  boxCommon: [tone(523, 523, 0.22, -28), noise(1800, 700, 0.06, -29), tone(1046, 1046, 0.16, -35, 0.035)],
  boxRare: [
    tone(523, 523, 0.26, -29),
    noise(1800, 700, 0.06, -29),
    tone(784, 784, 0.3, -30, 0.1),
    tone(1568, 1568, 0.17, -37, 0.135),
  ],
  boxWonder: [
    tone(523, 523, 0.3, -30),
    noise(1800, 700, 0.06, -29),
    tone(784, 784, 0.32, -31, 0.11),
    tone(1046, 1046, 0.45, -30, 0.22),
    tone(2092, 2092, 0.24, -38, 0.255),
  ],
  pickupJump: [tone(392, 523, 0.13, -29), tone(784, 1046, 0.22, -29, 0.13), noise(1400, 2400, 0.1, -35)],
  pickupHook: [tone(523, 523, 0.2, -29), tone(1442, 1442, 0.1, -37), tone(784, 784, 0.3, -30, 0.1)],
  pickupGlider: [noise(900, 2100, 0.4, -31), tone(523, 523, 0.38, -32, 0.08), tone(784, 784, 0.42, -33, 0.15)],
  secondJump: [noise(700, 1800, 0.13, -29), tone(270, 470, 0.13, -32)],
  hookFire: [noise(2200, 650, 0.16, -29), tone(760, 310, 0.15, -33)],
  hookLatch: [tone(740, 610, 0.12, -29), tone(2042, 1684, 0.06, -37)],
  gliderOpen: [noise(700, 2200, 0.3, -28), tone(170, 100, 0.12, -33)],
  gliderClose: [noise(1900, 400, 0.16, -31), tone(230, 150, 0.08, -35)],
  cartRoll: [tone(160, 125, 0.09, -34), noise(650, 400, 0.08, -36), tone(190, 140, 0.08, -36, 0.12)],
  cartPush: [noise(540, 330, 0.19, -32), noise(680, 400, 0.17, -34, 0.18)],
  cartStop: [noise(1250, 480, 0.21, -30), tone(190, 95, 0.14, -30, 0.1)],
  pathOpen: [
    tone(262, 262, 0.42, -30),
    tone(392, 392, 0.48, -31, 0.1),
    tone(523, 523, 0.62, -32, 0.2),
    noise(1200, 2100, 0.25, -35),
  ],
  seesaw: [tone(190, 460, 0.24, -29), noise(850, 400, 0.14, -32), tone(380, 230, 0.17, -36, 0.08)],
} satisfies Record<string, Layer[]>;
export type PlaceCue = keyof typeof recipes;
export const placeCues: Record<PlaceCue, string> = {
  rockBreak: 'A dry stone crack, low body and a short scatter of grit.',
  treeFall: 'A descending wooden groan and splinter as the great tree tips.',
  treeLand: 'A broad, dull trunk impact with a soft crown rustle.',
  shoulder: 'A wooden knock and brief rising effort as the trunk reaches the shoulder.',
  boxCommon: 'One warm bell with a tiny bright bounce.',
  boxRare: 'A root and fifth, with a short metal sparkle.',
  boxWonder: 'A three-note rising reveal with a longer, quiet shimmer.',
  pickupJump: 'Two rising elastic notes announce the second jump.',
  pickupHook: 'A small metal strike resolves upward for the hook.',
  pickupGlider: 'An airy swell opens into a soft fifth for the glider.',
  secondJump: 'A short air puff with a subtle rising body.',
  hookFire: 'A tight cable zip dropping away from the hand.',
  hookLatch: 'A dry metal tug as the cable releases or finishes its pull.',
  gliderOpen: 'A cloth-like snap opening into a short breath of air.',
  gliderClose: 'A small folding swish that settles quickly.',
  cartRoll: 'Quiet paired wooden wheel knocks while the cart moves.',
  cartPush: 'Two soft breathy efforts, one for each pusher.',
  cartStop: 'A brief brake rub and a wooden settling knock.',
  pathOpen: 'A restrained root, fifth and octave as the first path opens.',
  seesaw: 'A springy wooden creak rising into the launch.',
};

/** Same recipe live and offline. Gain is distance only; the authored levels above stay comparable. */
export function renderPlaceSound(ctx: BaseAudioContext, out: AudioNode, cue: PlaceCue, at: number, gain = 1) {
  let seconds = 0;
  for (const layer of recipes[cue]) {
    const t = at + layer.delay;
    const end = t + layer.seconds;
    seconds = Math.max(seconds, layer.delay + layer.seconds);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(dbToGain(layer.db) * gain, t + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.00001, end - 0.005);
    amp.gain.linearRampToValueAtTime(0, end);
    amp.connect(out);
    if (layer.kind === 'tone') {
      const src = ctx.createOscillator();
      const vary = 2 ** ((Math.random() * 8 - 4) / 1200);
      src.frequency.setValueAtTime(layer.hz * vary, t);
      src.frequency.exponentialRampToValueAtTime(layer.to * vary, end);
      src.connect(amp);
      src.onended = () => {
        src.disconnect();
        amp.disconnect();
      };
      src.start(t);
      src.stop(end);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx, 1);
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 0.8;
      filter.frequency.setValueAtTime(layer.hz, t);
      filter.frequency.exponentialRampToValueAtTime(layer.to, end);
      src.connect(filter).connect(amp);
      src.onended = () => {
        src.disconnect();
        filter.disconnect();
        amp.disconnect();
      };
      src.start(t, Math.random() * 0.3, layer.seconds);
    }
  }
  return { seconds, sources: recipes[cue].length };
}

const cooldown: Partial<Record<PlaceCue, number>> = { cartRoll: 0.36, cartPush: 1.1, seesaw: 0.3 };
const last = new Map<PlaceCue, number>();
let context: AudioContext | null = null;
let active: number[] = [];
/** Cosmetic admission only: at most eight new cue events / forty native sources; legacy sounds are separate. */
export function placeSound(cue: PlaceCue, x: number, z: number) {
  const a = getAudio('sfx');
  if (!a) return;
  const gain = Math.max(0, 1 - Math.hypot(camera.position.x - x, camera.position.z - z) / 45) ** 2;
  if (gain < 0.02) return;
  if (context !== a.ctx) {
    context = a.ctx;
    last.clear();
    active = [];
  }
  const now = a.ctx.currentTime;
  active = active.filter((until) => until > now);
  if (now - (last.get(cue) ?? -Infinity) < (cooldown[cue] ?? 0.08) || active.length >= 8) return;
  last.set(cue, now);
  const { seconds } = renderPlaceSound(a.ctx, a.out, cue, now + 0.005, gain);
  active.push(now + 0.005 + seconds);
}
