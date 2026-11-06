// Local presentation derived from the same Buddy stride as the feet. No events enter room state.
import * as THREE from 'three/webgpu';
import type { Avatar } from '../player/avatars.ts';
import type { BuddyMotion } from '../player/buddy/rig.ts';
import { cam, me } from '../player/state.ts';
import { PLAYER_R } from '../constants.ts';
import { dbToGain, getAudio } from './audio.ts';
import { audioSettings as settings } from './audio-tuning.ts';
import { stepSurfaceAt, type StepSurface } from './locomotion-surfaces.ts';
import { renderLocomotionSound, type LocomotionKind } from './locomotion-sound.ts';

type History = {
  x: number;
  y: number;
  z: number;
  air: boolean;
  apex: number;
  airFor: number;
  groundedY: number;
  jumpSequence: number;
  lastAt: number;
  contextAt: number;
  bags: Map<StepSurface, number[]>;
  recent: Map<StepSurface, number[]>;
};
type Voice = { avatar: Avatar; local: boolean; gain: number; end: number; stop(): void };
const histories = new WeakMap<Avatar, History>();
const voices: Voice[] = [];
const footPoint = new THREE.Vector3();
const events: {
  kind: LocomotionKind;
  surface: StepSurface;
  local: boolean;
  gainDb: number;
  take: number;
  time: number;
}[] = [];
const totals = { walk: 0, run: 0, jump: 0, land: 0, culled: 0, stolen: 0, resets: 0 };
export const locomotionState = () => ({
  totals: { ...totals },
  active: voices.length,
  caps: { total: settings.stepEventCap, perEmitter: settings.stepEmitterCap, localReserved: 2 },
  emitters: Array.from(new Set(voices.map((v) => v.avatar))).map((a) => ({
    local: a === me.avatar,
    voices: voices.filter((v) => v.avatar === a).length,
  })),
  events: events.slice(),
});

export function stopLocomotion(a: Avatar) {
  for (const voice of voices) if (voice.avatar === a) voice.stop();
  histories.delete(a);
}

function take(h: History, surface: StepSurface) {
  let bag = h.bags.get(surface);
  const recent = h.recent.get(surface) ?? [];
  if (!bag?.length) {
    bag = [0, 1, 2, 3, 4, 5];
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag[i], bag[j]] = [bag[j]!, bag[i]!];
    }
    // At a bag boundary the next two choices must still avoid the previous two takes.
    h.bags.set(surface, bag);
  }
  let i = bag.findIndex((n) => !recent.includes(n));
  if (i < 0) i = 0;
  const selected = bag.splice(i, 1)[0]!;
  recent.push(selected);
  if (recent.length > 2) recent.shift();
  h.recent.set(surface, recent);
  return selected;
}

function trim(surface: StepSurface) {
  switch (surface) {
    case 'grass':
      return settings.surfaceGrassDb;
    case 'sand':
      return settings.surfaceSandDb;
    case 'wood':
      return settings.surfaceWoodDb;
    case 'rail':
      return settings.surfaceRailDb;
    case 'water':
      return settings.surfaceWaterDb;
  }
}

function play(a: Avatar, h: History, motion: BuddyMotion, kind: LocomotionKind, level: number) {
  const audio = getAudio('character');
  if (!audio) return;
  const { ctx, out } = audio,
    now = ctx.currentTime,
    local = a === me.avatar;
  for (let i = voices.length - 1; i >= 0; i--) if (voices[i]!.end <= now) voices.splice(i, 1);
  const listener = me.avatar?.position ?? me.body?.interpolatedPosition;
  if (!listener) return;
  const p = a.position,
    dx = p.x - listener.x,
    dy = p.y - listener.y,
    dz = p.z - listener.z;
  const distance = Math.hypot(dx, dy, dz),
    far = kind === 'land' ? settings.landingDistance : settings.stepDistance;
  const near = Math.min(settings.stepNearDistance, far - 0.01);
  const attenuation = local ? 1 : Math.max(0, Math.min(1, (far - distance) / (far - near))) ** 2;
  if (!attenuation) {
    totals.culled++;
    return;
  }
  let x = p.x,
    z = p.z;
  if (motion.foot) {
    motion.foot.getWorldPosition(footPoint);
    x = footPoint.x;
    z = footPoint.z;
  }
  const surface = stepSurfaceAt(x, (kind === 'jump' ? h.groundedY : p.y) - PLAYER_R, z, p.x, p.z);
  const gainDb =
    level + trim(surface) + (local ? 0 : settings.remoteStepsDb) + (Math.random() * 2 - 1) * settings.jitterDb;
  const gain = dbToGain(gainDb) * attenuation;
  const cap = Math.max(4, Math.floor(settings.stepEventCap)),
    perEmitter = Math.max(1, Math.floor(settings.stepEmitterCap));
  const same = voices.filter((v) => v.avatar === a);
  const remote = voices.filter((v) => !v.local);
  let victim: Voice | undefined;
  if (same.length >= perEmitter) victim = same[0];
  else if (!local && remote.length >= Math.max(0, cap - 2))
    victim = remote.reduce((a, b) => (a.gain < b.gain ? a : b), remote[0]!);
  else if (voices.length >= cap)
    victim = remote.length ? remote.reduce((a, b) => (a.gain < b.gain ? a : b), remote[0]!) : voices[0];
  if (victim) {
    if (!local && victim.avatar !== a && victim.gain >= gain) {
      totals.culled++;
      return;
    }
    victim.stop();
    voices.splice(voices.indexOf(victim), 1);
    totals.stolen++;
  }
  const pan = ctx.createStereoPanner();
  // Listener at the body, camera orientation only: zoom cannot change audibility.
  pan.pan.value =
    local || distance < 0.01
      ? 0
      : Math.max(-1, Math.min(1, (dx * Math.cos(cam.yaw) - dz * Math.sin(cam.yaw)) / distance));
  pan.connect(out);
  const selected = take(h, surface);
  const voice = renderLocomotionSound(ctx, pan, {
    surface,
    kind,
    take: selected,
    gain,
    at: now + (victim ? 0.008 : 0),
    pitch: 2 ** (((Math.random() * 2 - 1) * settings.jitterCents) / 1200),
    onEnded() {
      pan.disconnect();
      const i = voices.indexOf(admitted);
      if (i >= 0) voices.splice(i, 1);
    },
  });
  // A replacement begins after the stolen source's 8 ms release, maintaining the native playing-voice cap.
  const admitted: Voice = { avatar: a, local, gain, end: voice.end, stop: voice.stop };
  voices.push(admitted);
  h.lastAt = now;
  totals[kind]++;
  events.push({ kind, surface, local, gainDb, take: selected, time: now });
  if (events.length > 48) events.shift();
}

export function updateLocomotion(a: Avatar, motion: BuddyMotion) {
  if (!me.entered || a.userData.audioRole === 'preview') return;
  const audio = getAudio('character');
  const p = a.position,
    now = audio?.ctx.currentTime ?? -1;
  let h = histories.get(a);
  const blocked =
    motion.swimming ||
    motion.seated ||
    a.userData.riding ||
    (a === me.avatar && me.down) ||
    (a.userData.flopAmt ?? 0) > 0.1;
  const reset =
    !h ||
    !audio ||
    blocked ||
    motion.dt > 0.25 ||
    Math.hypot(p.x - h.x, p.y - h.y, p.z - h.z) > 4 ||
    Math.abs(p.y - h.y) > Math.max(0.6, motion.dt * 30) ||
    now - h.contextAt > 0.3 ||
    now < h.contextAt;
  if (reset) {
    histories.set(a, {
      x: p.x,
      y: p.y,
      z: p.z,
      air: motion.airborne,
      apex: p.y,
      airFor: 0,
      groundedY: p.y,
      jumpSequence: a.userData.jumpSequence ?? 0,
      lastAt: now,
      contextAt: now,
      bags: h?.bags ?? new Map(),
      recent: h?.recent ?? new Map(),
    });
    totals.resets++;
    return;
  }
  h = h!;
  const jumpSequence = a.userData.jumpSequence ?? 0;
  // The controller counts accepted ground/coyote launches. Terrain crests and failed button
  // presses cannot produce takeoff effort. Remote presence has no intent, so it supplies only
  // contacts and landings rather than guessing a jump from upward interpolation.
  if (a === me.avatar && jumpSequence !== h.jumpSequence) play(a, h, motion, 'jump', settings.jumpDb);
  h.jumpSequence = jumpSequence;
  let landing = false;
  if (motion.airborne) {
    h.airFor += motion.dt;
    h.apex = Math.max(h.apex, p.y);
  } else {
    const height = h.apex - p.y;
    if (h.air && h.airFor >= 0.06 && height >= settings.landingMinHeight) {
      const impact =
        height < 1.5
          ? settings.landingSoftDb *
            (1 - Math.max(0, (height - settings.landingMinHeight) / (1.5 - settings.landingMinHeight)))
          : settings.landingHeavyDb * Math.min(1, (height - 1.5) / 2.5);
      play(a, h, motion, 'land', settings.landingDb + impact);
      landing = true;
    }
    h.groundedY = p.y;
    h.airFor = 0;
    h.apex = p.y;
    if (
      !landing &&
      !h.air &&
      motion.contact &&
      motion.speed >= settings.stepMinSpeed &&
      now - h.lastAt >= settings.stepIntervalMs / 1000
    ) {
      const running = motion.speed >= 3.2;
      play(a, h, motion, running ? 'run' : 'walk', running ? settings.runningDb : settings.footstepsDb);
    }
  }
  h.air = motion.airborne;
  h.x = p.x;
  h.y = p.y;
  h.z = p.z;
  h.contextAt = now;
}
