// A second jump in the air and a glide (docs/research/ratchet-and-clank-feel.md rec 6), on any ?proto= page with
// &jump2=1 and/or &glide=1 (loaded by src/features/proto-moves.ts). Same button as the jump, no new pad slot.
//   jump2  a press in the air sets vy = max(vy, 0) + 6.0 m/s (about 80 % of the first jump, never stacking into a
//          super-jump), once per airtime; landing (or a grind rail) gives it back
//   glide  hold jump after an air press (the double jump's, or a fresh one) and your fall is capped at 4 m/s
// Serves DESIGN.md 1 (moving around is a toy). Owner kind for your own body: others see it through your presence.
// Runs after the controller's step hook (a lazy module), so a press it didn't take (no ground under you) is ours.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { onPreStep } from '../../physics/engine.ts';
import { GRAVITY, PLAYER_MASS, PLAYER_R, reducedMotion } from '../../constants.ts';
import { me } from '../../player/player.ts';
import { inputState } from '../../player/input.ts';
import { emit } from '../../render/particles.ts';
import { getAudio } from '../../render/audio.ts';
import { ON_ISLAND, PROTO, currentStep, onStep, onVariant, protoV } from '../flags.ts';
import { protoCount } from '../count.ts';

const q = new URLSearchParams(location.search);
export const MOVES = {
  jump2: q.get('jump2') === '1',
  glide: q.get('glide') === '1',
  second: 6.0, // m/s added to max(vy, 0)
  glideFall: 4, // m/s: the fastest you fall while gliding
  glideEase: 0.12, // s: the time constant a faster fall slows to it with
};
// The moves card (`?proto=moves`, or the island while the playlist is at it) switches them by variant, live: the
// default is both, `jump2` the second jump alone. Any other prototype's page keeps its &jump2=1 / &glide=1.
function apply(v = protoV('moves')) {
  if (!ON_ISLAND && PROTO !== 'moves') return;
  const on = !ON_ISLAND || currentStep() === 'moves';
  MOVES.jump2 = on;
  MOVES.glide = on && v !== 'jump2';
}
onVariant('moves', ['', 'jump2'], apply);
onStep(() => apply());

const st = {
  used: false, // the second jump, this airtime
  held: false, // an air press is still held (the glide's trigger)
  gliding: false,
  jumps: 0, // second jumps (the frame hook puffs and whoops on a change)
  shown: 0,
};

onPreStep(() => {
  const b = me.body;
  if (!b) return;
  if (me.coyote > 0 || me.swimming || inputState.seated) {
    st.used = st.held = st.gliding = false;
    return;
  }
  if (me.jumpQueued > 0) {
    if (MOVES.jump2 && !st.used) {
      st.used = true;
      b.velocity.y = Math.max(b.velocity.y, 0) + MOVES.second;
      st.jumps++;
      protoCount('second jumps', 1, 'moves');
      me.jumpQueued = 0;
    }
    st.held = true; // (a press we didn't take stays queued: it still jumps if you land within the buffer)
  }
  if (!me.jumpHeld) st.held = false;
  st.gliding = MOVES.glide && st.held && b.velocity.y < -MOVES.glideFall + 0.3;
  // Gliding: gravity off, and the fall eased toward the cap (the feel pass's heavier fall is dropped too).
  if (st.gliding)
    b.force.y = PLAYER_MASS * GRAVITY + (PLAYER_MASS * (-MOVES.glideFall - b.velocity.y)) / MOVES.glideEase;
});

// ---------------------------------------------------------------- feel: a puff of air (seen and heard); a wisp trail gliding
const PUFF = new THREE.Color('#f4efe4');
// The second jump's sound: an air puff (Fortnite-style), not a pitched whoop. Band-passed noise whose centre rises a
// little, a soft swell and a short fade, with a faint low thump for the push; quiet, under the world.
let air: AudioBuffer | null = null;
export function whoop() {
  const a = getAudio();
  if (!a) return;
  const { ctx, out } = a;
  if (air?.sampleRate !== ctx.sampleRate) {
    air = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.25), ctx.sampleRate);
    const d = air.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = ctx.currentTime + 0.005;
  const j = 0.94 + Math.random() * 0.12;
  const n = ctx.createBufferSource();
  n.buffer = air;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.1;
  bp.frequency.setValueAtTime(700 * j, t);
  bp.frequency.exponentialRampToValueAtTime(1500 * j, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.11, t + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
  n.connect(bp).connect(g).connect(out);
  n.start(t);
  n.stop(t + 0.2);
  const o = ctx.createOscillator();
  o.frequency.setValueAtTime(140 * j, t);
  o.frequency.exponentialRampToValueAtTime(90 * j, t + 0.08);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.06, t + 0.006);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  o.connect(og).connect(out);
  o.start(t);
  o.stop(t + 0.1);
}
let wisp = 0;
onFrame(
  ({ dt }) => {
    const b = me.body;
    if (!b || reducedMotion) return;
    const p = b.interpolatedPosition;
    if (st.shown !== st.jumps) {
      st.shown = st.jumps;
      whoop();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        emit({
          x: p.x,
          y: p.y - PLAYER_R,
          z: p.z,
          vx: Math.cos(a) * 2.4,
          vy: -0.6,
          vz: Math.sin(a) * 2.4,
          life: 0.4,
          size: 0.22,
          color: PUFF,
          alpha: 0.85,
          drag: 4,
          grow: [1, 2],
          fade: 0.6,
        });
      }
    }
    if (!st.gliding) return;
    // Two contrails off your sides (left in the air where you passed), so the glide's slow slope reads.
    const sx = Math.cos(me.yaw) * 0.55,
      sz = -Math.sin(me.yaw) * 0.55;
    for (wisp += dt * 30; wisp >= 1; wisp--)
      for (const side of [-1, 1])
        emit({
          x: p.x + sx * side,
          y: p.y + 0.55,
          z: p.z + sz * side,
          vx: 0,
          vy: 0.2,
          vz: 0,
          life: 0.6,
          size: 0.12,
          color: PUFF,
          alpha: 0.8,
          grow: [1, 0.4],
          fade: 0.6,
        });
  },
  { phase: 'update', order: 10 },
);

window.__moves = { MOVES, st };
