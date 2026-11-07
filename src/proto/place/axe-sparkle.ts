// Local magic around the floating axe: a burst when it appears, a steady aura and blade trail while it exists,
// and a smaller burst when it vanishes. Cosmetic only; reduced motion suppresses all of it.
import * as THREE from 'three/webgpu';
import type { Particle } from '../../render/particle-pool.ts';

const ivory = new THREE.Color('#fff4bd');
const gold = new THREE.Color('#ffd36b');
const lilac = new THREE.Color('#c9b8ff');
const auraColors = [ivory, gold, lilac] as const;
/** Per second while out, plus extra per metre the blade travels so the strike leaves a trail. */
export const AXE_AURA = { perSecond: 36, perMetre: 16, maxPerFrame: 8, appear: 10, vanish: 8 };

const blade = new THREE.Vector3(),
  grip = new THREE.Vector3(),
  root = new THREE.Vector3();
type Memory = { acc: number; last: THREE.Vector3; grip: THREE.Vector3; has: boolean };
const memory = new WeakMap<THREE.Object3D, Memory>();
// emit copies every field, so one record is reused for each birth.
const p: Particle = { x: 0, y: 0, z: 0, life: 0, size: 0, color: ivory };

function glint(x: number, y: number, z: number, speed: number, life: number, size: number, intensity: number) {
  const a = Math.random() * Math.PI * 2,
    up = Math.random() * 2 - 1;
  const across = Math.sqrt(1 - up * up);
  p.x = x;
  p.y = y;
  p.z = z;
  p.vx = Math.cos(a) * across * speed;
  p.vy = up * speed * 0.6 + 0.25;
  p.vz = Math.sin(a) * across * speed;
  p.life = life * (0.8 + Math.random() * 0.4);
  p.size = size * (0.8 + Math.random() * 0.4);
  p.color = ivory;
  p.colorCurve = auraColors;
  p.intensity = intensity;
  p.drag = 2.2;
  p.gravity = 0;
  p.shrink = 0.6;
  p.fade = 0.5;
  p.shape = 'glint';
  p.rotation = Math.random() * 0.6 - 0.3;
  p.spin = (Math.random() < 0.5 ? -1 : 1) * 2;
  p.alphaCurve = [1, 0.85, 0];
  p.sizeCurve = [1, 0.9, 0.4];
}

/** The same glints as the axe's appear burst, thrown outward from a point (the second jump's puff under the feet). */
export function sparkleBurst(
  x: number,
  y: number,
  z: number,
  emit: (particle: Particle) => void,
  intensity: number,
  count = 14,
) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    glint(x + Math.cos(a) * 0.2, y + 0.05, z + Math.sin(a) * 0.2, 1.3, 0.5, 0.17, intensity);
    p.vx = Math.cos(a) * 1.6;
    p.vz = Math.sin(a) * 1.6;
    p.vy = 0.3 + Math.random() * 0.5;
    emit(p);
  }
}

export function sparkleAxe(
  axe: THREE.Object3D,
  wasVisible: boolean,
  reducedMotion: boolean,
  emit: (particle: Particle) => void,
  intensity: number,
  dt = 0,
) {
  let m = memory.get(axe);
  if (!m) {
    m = { acc: 0, last: new THREE.Vector3(), grip: new THREE.Vector3(), has: false };
    memory.set(axe, m);
  }
  if (reducedMotion) {
    m.has = false;
    return;
  }
  const bladeMarker = axe.getObjectByName('axe-blade-contact'),
    gripMarker = axe.getObjectByName('axe-grip-left');
  if (!bladeMarker || !gripMarker) return;
  if (!axe.visible) {
    if (wasVisible && m.has) {
      // Pop out where it last was: small, quick glints from head to handle.
      for (let i = 0; i < AXE_AURA.vanish; i++) {
        const u = i / (AXE_AURA.vanish - 1);
        root.lerpVectors(m.grip, m.last, u);
        glint(root.x, root.y, root.z, 0.9, 0.3, 0.085, intensity);
        emit(p);
      }
    }
    m.has = false;
    m.acc = 0;
    return;
  }
  axe.updateWorldMatrix(true, true);
  bladeMarker.getWorldPosition(blade);
  gripMarker.getWorldPosition(grip);
  if (!wasVisible || !m.has) {
    for (let i = 0; i < AXE_AURA.appear; i++) {
      root.lerpVectors(grip, blade, i / (AXE_AURA.appear - 1));
      glint(root.x, root.y, root.z, 1.1, 0.38, 0.12, intensity);
      emit(p);
    }
    m.last.copy(blade);
    m.grip.copy(grip);
    m.has = true;
    m.acc = 0;
    return;
  }
  const travelled = m.last.distanceTo(blade);
  m.acc += dt * AXE_AURA.perSecond + travelled * AXE_AURA.perMetre;
  const n = Math.min(AXE_AURA.maxPerFrame, Math.floor(m.acc));
  m.acc -= n;
  if (m.acc > AXE_AURA.maxPerFrame) m.acc = 0;
  for (let i = 0; i < n; i++) {
    const u = (i + 1) / n;
    if (i % 3 === 2) {
      // Aura: anywhere along the handle and head.
      root.lerpVectors(grip, blade, Math.random());
    } else {
      // Trail: spaced along the blade's path since last frame.
      root.lerpVectors(m.last, blade, u);
    }
    glint(
      root.x + (Math.random() - 0.5) * 0.08,
      root.y + (Math.random() - 0.5) * 0.08,
      root.z + (Math.random() - 0.5) * 0.08,
      0.22,
      0.42,
      0.075,
      intensity,
    );
    emit(p);
  }
  m.last.copy(blade);
  m.grip.copy(grip);
}
