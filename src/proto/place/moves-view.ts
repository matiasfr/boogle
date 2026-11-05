// How the moves of ./moves.ts look and sound, on you and on a partner: the canopy overhead with your arms up to it, the cable from
// your hand to the ring, the puff under a second jump, what you wear once you've found them, and the camera while you glide.
// No new rig: arm poses are set on the existing bones after the mixer, from directions in the world, and the root follows the
// physics. Presence `placeMove` carries only what isn't in a position: the mode, the ring and a puff counter; a missing key is
// off. Local, and Owner for what a partner reads.
import * as THREE from 'three/webgpu';
import { reducedMotion, PLAYER_R } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { addPresenceField, onPeerRemoved, onRemotePresence, type Remote } from '../../netplay/net.ts';
import { cam, camConstraints, me } from '../../player/player.ts';
import { getAudio } from '../../render/audio.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { noiseBuffer } from '../../render/noise.ts';
import { emit } from '../../render/particles.ts';
import { warmDraw } from '../../render/precompile.ts';
import { camera, scene } from '../../render/scene.ts';
import { glyph } from '../../player/glyphs.ts';
import { pop } from '../minis/common.ts';
import { makeCanopy, makeGear, wearGear, placeCanopy, armToRing, type Canopy } from './gear-models.ts';
import { COOP, count, job } from './job.ts';
import { RINGS, move } from './moves.ts';

const TEAL = '#39e6c6';
type Named = THREE.Object3D;
// ---------------------------------------------------------------- the cable
const cableMat = new THREE.MeshStandardNodeMaterial({ color: '#2b2a33', emissive: TEAL, emissiveIntensity: 0.5 });
const cableGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5).translate(0, 0.5, 0);
type Cable = { m: THREE.Mesh; t: number; on: boolean };
function makeCable(): Cable {
  const m = new THREE.Mesh(cableGeo, cableMat);
  m.visible = false;
  m.frustumCulled = false;
  scene.add(m);
  return { m, t: 0, on: false };
}
const ORIENT_UP = new THREE.Vector3(0, 1, 0),
  dd = new THREE.Vector3();
/** From a hand to a ring. It reaches in 70 ms and winds back in 110: presentation, and the body has already gone. */
function drawCable(c: Cable, from: THREE.Vector3, to: THREE.Vector3 | null, dt: number) {
  c.t = to ? Math.min(1, c.t + dt / 0.07) : Math.max(0, c.t - dt / 0.11);
  if (c.t <= 0 || (!to && !c.on)) {
    c.m.visible = false;
    return;
  }
  if (to) lastTo.copy(to);
  dd.subVectors(lastTo, from);
  const len = dd.length();
  c.m.visible = true;
  c.m.position.copy(from);
  c.m.quaternion.setFromUnitVectors(ORIENT_UP, dd.divideScalar(len || 1));
  c.m.scale.set(1, len * c.t, 1);
}
const lastTo = new THREE.Vector3();

// ---------------------------------------------------------------- what you wear once you've found them
// Rings at the ankles, a spool on the forearm and a folded pack: you can see what you've got, as with the axe.
const gear = makeGear();
// Detached until earned. The real loading frame also warms the wing's double-sided shadow pipeline.
warmDraw(() => {
  const g = makeCanopy().g;
  g.add(...Object.values(gear).map((m) => m.clone()));
  g.traverse((o) => {
    o.visible = true;
    o.frustumCulled = false;
  });
  scene.add(g);
  return () => g.removeFromParent();
});
// ---------------------------------------------------------------- the puff and the sounds
const PUFF = new THREE.Color('#f4efe4'),
  PUFF2 = new THREE.Color(TEAL);
/** Under your feet: nothing to stand on, so the air gave. */
function puff(x: number, y: number, z: number) {
  for (let k = 0; k < 14; k++) {
    const t = (k / 14) * Math.PI * 2;
    emit({
      x,
      y,
      z,
      vx: Math.cos(t) * 2.8,
      vy: -0.7,
      vz: Math.sin(t) * 2.8,
      life: 0.42,
      size: 0.24,
      color: k % 3 ? PUFF : PUFF2,
      alpha: 0.85,
      drag: 4,
      grow: [1, 2],
      fade: 0.6,
    });
  }
}
// The air going past while you glide: a low band of noise that follows your speed, so a glide isn't silent.
let wind: { g: GainNode; f: BiquadFilterNode } | null = null;
function windAt(level: number, speed: number) {
  if (!wind && level > 0.01) {
    const au = getAudio('ambience');
    if (au) {
      const { ctx, out } = au;
      const n = ctx.createBufferSource();
      n.buffer = noiseBuffer(ctx, 2);
      n.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.value = 0;
      n.connect(f).connect(g).connect(out);
      n.start();
      wind = { g, f };
    }
  }
  if (!wind) return;
  const ctx = wind.g.context;
  wind.g.gain.setTargetAtTime(level * 0.12, ctx.currentTime, 0.12);
  wind.f.frequency.setTargetAtTime(300 + speed * 45, ctx.currentTime, 0.2);
}

// ---------------------------------------------------------------- the camera while you glide
// `&glidecam=` to compare: `frame` BotW's normal framing (5.3 m, 50 degrees; datamined, and not a glide shot), `pull` a pull-back
// to 6.5 m on our own lens, `off` today's camera. See docs/game-design/place.md for the pick and why.
const CAMS = { frame: { dist: 5.2, fov: 50 }, pull: { dist: 6.5, fov: 0 }, off: { dist: 0, fov: 0 } };
const camKind = (new URLSearchParams(location.search).get('glidecam') ?? 'frame') as keyof typeof CAMS;
const CAM = CAMS[camKind] ?? CAMS.frame;
let camW = 0,
  baseDist = 0,
  lens = 0, // degrees of the lens that are this camera's
  lastCam = 0;
camConstraints.push(() => {
  const now = performance.now(),
    dt = Math.min(0.1, (now - lastCam) / 1000);
  lastCam = now;
  const want = move.holding && CAM.dist && !reducedMotion ? 1 : 0;
  if (!camW && !want) return false;
  if (!camW) baseDist = cam.dist;
  camW += (want - camW) * (1 - Math.exp(-dt / 0.35));
  if (camW < 0.002 && !want) {
    camW = 0;
    cam.dist = baseDist;
    if (lens) {
      camera.fov -= lens;
      lens = 0;
      camera.updateProjectionMatrix();
    }
    return false;
  }
  cam.dist = baseDist + (CAM.dist - baseDist) * camW;
  if (CAM.fov) {
    const under = camera.fov - lens,
      next = (CAM.fov - under) * camW;
    if (Math.abs(next - lens) > 0.02) {
      camera.fov += next - lens;
      lens = next;
      camera.updateProjectionMatrix();
    }
  }
  return false;
});

// ---------------------------------------------------------------- a small mark for the button, the first few times
// Not a sentence: the button's own glyph, on the ring you're aiming at, or under you when the air's the thing. It goes once
// you've done it a couple of times (DESIGN.md 11).
const chip = document.createElement('div');
chip.className = 'place-key';
(document.querySelector('.hud') ?? document.body).append(chip);
const onScreen = new THREE.Vector3();
let chipOf = '';
function showChip(action: string | null, at: THREE.Vector3 | null) {
  const on = !!action && !!at && !document.body.classList.contains('touch');
  chip.classList.toggle('on', on);
  if (!on) return;
  if (chipOf !== action) {
    chipOf = action!;
    chip.innerHTML = glyph(action!);
  }
  onScreen.copy(at!).project(camera);
  chip.style.transform = `translate(calc(${((onScreen.x + 1) / 2) * innerWidth}px - 50%), calc(${((1 - onScreen.y) / 2) * innerHeight}px - 50%))`;
}

// ---------------------------------------------------------------- yours, each frame
const mine = makeCanopy();
const myCable = makeCable();
const hand = new THREE.Vector3(),
  below = new THREE.Vector3();
let jumps = 0,
  pulls = 0,
  ended = 0,
  denied = 0,
  wasOpen = false,
  wisp = 0,
  fallT = 0;
onFrame(
  ({ dt, now }) => {
    const body = me.body,
      root = me.avatar as Named | null | undefined;
    if (!body || !root) return;
    const p = body.interpolatedPosition;
    if (jumps !== move.jumps) {
      jumps = move.jumps;
      puff(p.x, p.y - PLAYER_R, p.z);
      placeSound('secondJump', p.x, p.z);
    }
    if (pulls !== move.pulls) {
      pulls = move.pulls;
      placeSound('hookFire', p.x, p.z);
    }
    if (ended !== move.ended) {
      ended = move.ended;
      placeSound('hookLatch', p.x, p.z);
    }
    if (denied !== move.denied) {
      denied = move.denied;
      pop(0, 0.25);
    }
    if (move.open !== wasOpen) {
      wasOpen = move.open;
      placeSound(move.open ? 'gliderOpen' : 'gliderClose', p.x, p.z);
    }
    placeCanopy(root, mine, move.open || showCanopy > 0 ? 1 : 0, dt, now);
    showCanopy = Math.max(0, showCanopy - dt);
    // The cable, and the arm that throws it.
    const ring = move.pull?.ring.at ?? null;
    if (ring) {
      armToRing(root, ring, 0.9);
      myCable.on = true;
    }
    const h = root.getObjectByName('hand_r');
    if (h) h.getWorldPosition(hand);
    else hand.set(p.x, p.y + 0.6, p.z);
    drawCable(myCable, hand, ring, dt);
    if (!ring && myCable.t <= 0) myCable.on = false;
    // What you've found, on you.
    wearGear(root, me.avatar?.userData.loadFit?.frame, gear, {
      rings: job.tech.jump,
      spool: job.tech.hook,
      glider: job.tech.glide,
      frame: !!job.rung.pack,
      canopy: move.open,
    });
    // Two threads of air off the wing's tips while you're moving: it reads as speed, against the sky.
    const speed = Math.hypot(body.velocity.x, body.velocity.z);
    if (move.holding && !reducedMotion) {
      const sx = Math.cos(me.yaw) * 1.25,
        sz = -Math.sin(me.yaw) * 1.25;
      for (wisp += dt * 50 * Math.min(1, speed / 8); wisp >= 1; wisp--)
        for (const side of [-1, 1])
          emit({
            x: p.x + sx * side,
            y: p.y + 1.45,
            z: p.z + sz * side,
            vx: 0,
            vy: 0.1,
            vz: 0,
            life: 0.35,
            size: 0.035,
            color: PUFF,
            alpha: 0.5,
            drag: 0,
            fade: 0.5,
          });
    }
    windAt(move.holding ? 0.25 + 0.75 * Math.min(1, speed / 10) : 0, speed);
    // The button's glyph: on the ring, until you've pulled a couple of times; under you, falling, until you've flown.
    fallT = job.tech.glide && !move.open && me.coyote <= 0 && body.velocity.y < -6 ? fallT + dt : 0;
    if (move.pick && !move.pull && move.pulls < 3) showChip('hook', move.pick.at);
    else if (fallT > 0.25 && move.flights < 2) showChip('glide', below.set(p.x, p.y - 1.4, p.z));
    else showChip(null, null);
  },
  { phase: 'update', order: 13 },
);
let showCanopy = 0;
/** The show at the summit: the wing opens over your head, on the ground, for a moment. */
export const flashCanopy = (s: number) => void (showCanopy = s);

// ---------------------------------------------------------------- a partner's
type Theirs = { r: Remote; canopy: Canopy; cable: Cable; serial: number; mode: number; ring: number };
const others = new Map<string, Theirs>();
if (COOP) {
  // [mode, ring, puffs]: mode 1 canopy out, 2 on a hook. Null once there's nothing to show and no puff to catch up on.
  addPresenceField('placeMove', () => {
    const mode = move.pull ? 2 : move.open ? 1 : 0;
    if (!mode && !move.jumps) return null;
    return [mode, move.pull ? RINGS.indexOf(move.pull.ring) : -1, move.jumps % 1000];
  });
  onRemotePresence((r: Remote, pr) => {
    const v = (pr as { placeMove?: unknown }).placeMove;
    let t = others.get(r.peer);
    if (!Array.isArray(v) || v.length !== 3 || !count(v[0], 2) || !count(v[2], 1000)) {
      if (t) t.mode = 0;
      return;
    }
    if (!t) others.set(r.peer, (t = { r, canopy: makeCanopy(), cable: makeCable(), serial: v[2], mode: 0, ring: -1 }));
    t.mode = v[0];
    t.ring = count(v[1], RINGS.length - 1) ? v[1] : -1;
    if (t.serial !== v[2]) {
      t.serial = v[2];
      const av = r.avatar;
      if (av) puff(av.position.x, av.position.y, av.position.z);
    }
  });
  onPeerRemoved((r: Remote) => {
    const t = others.get(r.peer);
    if (!t) return;
    t.canopy.g.removeFromParent();
    t.cable.m.removeFromParent();
    others.delete(r.peer);
  });
  const theirHand = new THREE.Vector3();
  onFrame(
    ({ dt, now }) => {
      for (const t of others.values()) {
        const root = t.r.avatar as unknown as Named | null | undefined;
        if (!root) continue;
        placeCanopy(root, t.canopy, t.mode === 1 ? 1 : 0, dt, now);
        const ring = t.mode === 2 && t.ring >= 0 ? RINGS[t.ring]!.at : null;
        if (ring) {
          armToRing(root, ring, 0.9);
          t.cable.on = true;
        }
        root.getObjectByName('hand_r')?.getWorldPosition(theirHand);
        drawCable(t.cable, theirHand, ring, dt);
        if (!ring && t.cable.t <= 0) t.cable.on = false;
      }
    },
    { phase: 'update', order: 14 },
  );
}
