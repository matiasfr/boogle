// Pickup feel for the haul prototype (?proto=haul, every variant): each pickup (Take logs, a pile walked or scooped
// up) gives your avatar a small squash and a wooden "thock" with a clink on top, rising with what you carry
// (docs/research/carrying-and-logistics-play.md rec 3: 5-8% vertical over 80-120 ms, a sound per pickup, about +-8%
// pitch variation). Local only. Serves DESIGN.md 1 (toys before chores: the pickup itself should feel like something).
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { onFly } from '../../render/haul-pieces.ts';
import { getAudio } from '../../render/audio.ts';
import { clink, pentatonic } from '../../render/clink.ts';
import { me } from '../../player/player.ts';
import { identity } from '../../player/identity.ts';
import { haulVariant } from '../../player/haul-variant.ts';

const SQUASH = 0.07; // vertical share (rec 3: 5-8%)
const SQUASH_MS = 110; // rec 3: 80-120 ms
const ARRIVE_MS = 300; // about when the flying pieces reach you (haul-feel flyMs is 380)

let squashAt = -1e9;
const pending: number[] = []; // ms a pickup's pieces arrive

// v2 (2026-11-02 audit: "juice it better"; docs/research/collect-sounds.md): the low wooden knock stays, tuned two
// octaves under a clink, half wood and half metal, that steps up the pentatonic scale every 6 logs you carry (in key,
// where v1 slid ±8 % off it), with its bounce two steps higher: "tok-ting".
export function thock(count: number) {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  const t = ctx.currentTime + 0.005;
  const deg = Math.min(9, Math.floor(Math.min(count, 60) / 6));
  const f = pentatonic(deg);
  // the knock: a sine falling into the root two octaves down
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime((f / 4) * 1.8, t);
  o.frequency.exponentialRampToValueAtTime(f / 4, t + 0.06);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.26, t + 0.004);
  g.gain.setTargetAtTime(0, t + 0.004, 0.03);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.2);
  clink(ctx, out, {
    at: t,
    freq: f,
    level: 0.13,
    metal: 0.5,
    ring: 0.16,
    strike: 1.2,
    bounceFreq: pentatonic(deg + 2),
  });
}

// The magnet variant (magnet.ts) sounds each piece as it lands and calls squash() itself.
onFly(() => haulVariant !== 'magnet' && pending.push(performance.now() + ARRIVE_MS));
/** Squashes your avatar now (a pickup landing on your back). */
export const squash = (): void => void (squashAt = performance.now());

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
