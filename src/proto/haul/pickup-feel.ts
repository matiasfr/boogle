// Pickup feel for the haul prototype (?proto=haul, every variant): each pickup (Take logs, a pile walked or scooped
// up) gives your avatar a small squash and a wooden "thock", its pitch rising with what you carry
// (docs/research/carrying-and-logistics-play.md rec 3: 5-8% vertical over 80-120 ms, a sound per pickup, about +-8%
// pitch variation). Local only. Serves DESIGN.md 1 (toys before chores: the pickup itself should feel like something).
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { onFly } from '../../render/haul-pieces.ts';
import { getAudio } from '../../render/audio.ts';
import { me } from '../../player/player.ts';
import { identity } from '../../player/identity.ts';

const SQUASH = 0.07; // vertical share (rec 3: 5-8%)
const SQUASH_MS = 110; // rec 3: 80-120 ms
const ARRIVE_MS = 300; // about when the flying pieces reach you (haul-feel flyMs is 380)

let squashAt = -1e9;
const pending: number[] = []; // ms a pickup's pieces arrive

function thock(count: number) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.005;
  const pitch = (1 + Math.min(count, 60) / 120) * (1 + (Math.random() - 0.5) * 0.16); // rises with the load, +-8%
  // a knock: a short sine drop for the body, a filtered noise tick for the wood
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(240 * pitch, t);
  o.frequency.exponentialRampToValueAtTime(110 * pitch, t + 0.09);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.32, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.15);
  const len = Math.floor(ctx.sampleRate * 0.04);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / len) ** 2;
  const n = ctx.createBufferSource();
  n.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400 * pitch;
  bp.Q.value = 3;
  const ng = ctx.createGain();
  ng.gain.value = 0.25;
  n.connect(bp).connect(ng).connect(out);
  n.start(t);
}

onFly(() => pending.push(performance.now() + ARRIVE_MS));

onFrame(
  ({ now }: { now: number }) => {
    if (pending.length && now >= pending[0]) {
      pending.shift();
      squashAt = now;
      thock(identity.pid ? rules.stacks.count(identity.pid) : 0);
    }
    // after the walk cycle and feel.ts have set the avatar's scale this frame
    const u = (now - squashAt) / SQUASH_MS;
    const inner = (me.avatar?.userData as { inner?: { scale: { x: number; y: number; z: number } } } | undefined)
      ?.inner;
    if (u < 0 || u >= 1 || !inner) return;
    const s = 1 - SQUASH * Math.sin(u * Math.PI);
    inner.scale.y *= s;
    inner.scale.x /= Math.sqrt(s);
    inner.scale.z /= Math.sqrt(s);
  },
  { phase: 'late', order: -150 },
);
