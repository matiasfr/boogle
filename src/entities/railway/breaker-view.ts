// The breaker: the forge's third thing, on the boiler's old pedestal with the forge's call, taken once for the room,
// and swung at a seam. The swing is Local on the press; the seams open from accepted state (works-view.ts,
// roundhouse-view.ts), timed to this swing's contact frame.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { heldId } from '../../player/inventory.ts';
import { thump, clank } from '../../render/machine-sfx.ts';
import { emit } from '../../render/particles.ts';
import { chips, dustRing } from '../../render/particle-effects.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { WORKS_BREAKER, WORKS_RACK, WORKS_SEAMS } from '../../sim/railway-works-layout.ts';
import { SEAM_STALL, SEAM_THROAT } from '../../sim/railway-works.ts';
import { reducedMotion } from '../../constants.ts';
import { createForgeCall } from './forge-call.ts';
import { STALL_SLAB, THROAT_SLAB } from './works-shape.ts';
import { account, beam, boiler, works as worksRow } from '../../sim/railway-rows.ts';

/** Seconds: the wind-up ends, the head meets the seam, the swing is put away. */
export const SWING = { raise: 0.42, contact: 0.58, end: 0.85 } as const;
const GOLD = new THREE.Color('#ffdc7a');
/** The pedestal's gold mote, rising and fading: the breaker's "this is for that" wherever it points (the seams it
 * hasn't struck, the bowl's rocks while the kiln wants stone). Larger where it must read from further off. */
export function goldMote(x: number, y: number, z: number, side: number, size = 0.09) {
  emit({
    x,
    y,
    z,
    vx: side * 0.025,
    vy: 0.35,
    vz: 0,
    life: 1.6,
    size,
    color: GOLD,
    intensity: readableIntensity() * 1.4,
    alpha: 0.75,
    grow: [0.6, 1],
    shrink: 0.5,
    fade: 0.7,
  });
}
/** Seconds between motes on each unstruck seam while the breaker is out: under seven a second each,
 * far inside the pool's budget (the pier already runs about 440). */
const SEAM_MOTE_S = 0.15;
const RAISED = -2.5,
  DOWN = 1.35;

export function createRailwayBreaker(
  adapter: RailwayAdapter,
  owner: OwnedView,
  shapes: typeof import('../../render/part-geometry.ts'),
) {
  const bx = WORKS_BREAKER.x / 100,
    by = WORKS_BREAKER.y / 100,
    bz = WORKS_BREAKER.z / 100;
  // A broad-faced hammer, 1.4 m: ash handle, a squat iron head with brass bands. Origin at the grip's end.
  const geometry = shapes.merged([
    ['c', 0, 0.62, 0, 0.055, 1.24, 0.055, '#9a7448'],
    ['b', 0, 1.36, 0, 0.62, 0.34, 0.36, '#646a70'],
    ['b', -0.33, 1.36, 0, 0.06, 0.4, 0.42, '#767c82'],
    ['b', 0.33, 1.36, 0, 0.06, 0.4, 0.42, '#767c82'],
    ['b', -0.18, 1.36, 0, 0.05, 0.36, 0.38, '#c79a3e'],
    ['b', 0.18, 1.36, 0, 0.05, 0.36, 0.38, '#c79a3e'],
    ['c', 0, 0.06, 0, 0.075, 0.12, 0.075, '#3c3a36'],
  ]);
  const mat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.7, flatShading: true });
  const breaker = new THREE.Mesh(geometry, mat);
  breaker.castShadow = true;
  owner.add(breaker);
  geometry.dispose();
  owner.cleanup(() => mat.dispose());
  const call = createForgeCall({ x: bx, y: by, z: bz }, owner);
  let mote = 0,
    side = 1,
    shown = false,
    seamMote = 0,
    glint = 0,
    onBack = false;
  // Each seam's slab, from the shape both seams' views draw, and the face you come at it from: the stall's toward the
  // pedestal, the throat's toward the halt rack. Motes rise off that face along the crack, never inside the stone.
  const slabs = [STALL_SLAB, THROAT_SLAB[1]!] as const;
  const from = [WORKS_BREAKER, WORKS_RACK] as const;
  const faces = slabs.map((b, k) => {
    const cx = Math.cos(b.yaw),
      sx = Math.sin(b.yaw);
    const side = Math.sign(sx * (from[k]!.x / 100 - b.x) + cx * (from[k]!.z / 100 - b.z)) || 1;
    return { cx, sx, off: side * (b.d / 2 + 0.12) };
  });
  function seamMotes(dt: number, seams: number) {
    seamMote -= dt;
    if (seamMote > 0) return;
    seamMote = SEAM_MOTE_S;
    side *= -1;
    for (const seam of WORKS_SEAMS) {
      if (seams & (seam.id === 0 ? SEAM_STALL : SEAM_THROAT)) continue;
      const b = slabs[seam.id]!,
        { cx, sx, off } = faces[seam.id]!,
        u = (Math.random() - 0.5) * b.w * 0.2;
      // The slab's yaw turns its local x (width) and z (depth) into the world.
      goldMote(
        b.x + cx * u + sx * off,
        b.y - b.h * 0.35 + Math.random() * b.h * 0.7,
        b.z - sx * u + cx * off,
        side,
        seam.id === 0 ? 0.3 : 0.45,
      );
    }
  }
  // The swing: t seconds since the press (-1 idle), the seam aimed at, and where the contact lands.
  const swing = { t: -1, id: -1, contactAt: 0, struck: false };
  const pivot = new THREE.Vector3(),
    toward = new THREE.Vector3(),
    contact = new THREE.Vector3(),
    axis = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    q2 = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0);
  const seamAt = (id: number) => {
    const s = WORKS_SEAMS[id]!;
    return new THREE.Vector3(s.x / 100, s.y / 100 + 1.2, s.z / 100);
  };
  const ease = (u: number) => 1 - (1 - u) ** 3;
  function swingAngle(t: number) {
    if (t < SWING.raise) return RAISED * ease(t / SWING.raise);
    if (t < SWING.contact) {
      const u = (t - SWING.raise) / (SWING.contact - SWING.raise);
      return RAISED + (DOWN - RAISED) * u * u; // accelerating into the stone
    }
    // A small recoil off the stone, then rest.
    const u = Math.min(1, (t - SWING.contact) / (SWING.end - SWING.contact));
    return DOWN - Math.sin(u * Math.PI) * 0.25;
  }
  function impact() {
    const s = WORKS_SEAMS[swing.id];
    if (!s) return;
    contact.copy(seamAt(swing.id));
    if (me.body) {
      // The face of the seam nearest Buddy, not its centre inside the stone.
      toward.set(me.body.position.x - contact.x, 0, me.body.position.z - contact.z);
      const d = toward.length();
      if (d > 0.01) contact.addScaledVector(toward, Math.min(d, s.id === 0 ? 0.6 : 0.9) / d);
    }
    chips(contact.x, contact.y, contact.z, 14, contact.y - 1.4, undefined, true, 1.2);
    dustRing(contact.x, contact.y - 0.8, contact.z, 10, 1.6, 0.3);
    placeSound('rockBreak', contact.x, contact.z);
    thump(contact.x, contact.z);
    swing.struck = true;
  }
  function pose(dt: number) {
    const rows = adapter.read.world(),
      pid = adapter.read.pid;
    const w = worksRow(rows);
    const swinging = swing.t >= 0 && !!me.body;
    if (swinging) {
      const before = swing.t;
      // Land exactly on the contact frame (it shows for that frame) before the recoil. Never hold `t` short of
      // contact: with a steady dt it would never get there, and the swing (and every strike after it) froze.
      swing.t = before < SWING.contact && before + dt >= SWING.contact ? SWING.contact : before + dt;
      if (swing.t >= SWING.contact - 1e-6 && !swing.struck) {
        swing.t = SWING.contact + 1e-4;
        impact();
      }
      if (swing.t >= SWING.end) swing.t = -1;
    }
    if (swing.t >= 0 && me.body) {
      const p = me.body.interpolatedPosition;
      const target = seamAt(swing.id);
      toward.set(target.x - p.x, 0, target.z - p.z).normalize();
      me.yaw = Math.atan2(-toward.x, -toward.z);
      pivot.set(p.x + toward.x * 0.25, p.y + 0.55, p.z + toward.z * 0.25);
      axis.crossVectors(up, toward).normalize();
      // Upright, then pitched over the shoulder and down toward the seam about the sideways axis.
      q.setFromUnitVectors(up, up);
      q2.setFromAxisAngle(axis, swingAngle(swing.t));
      breaker.position.copy(pivot);
      breaker.quaternion.copy(q2).multiply(q);
      breaker.scale.setScalar(1);
      breaker.visible = true;
      return;
    }
    // On the pedestal: lying across its top while the room has not taken it.
    if (w.breaker === 1) {
      breaker.visible = true;
      breaker.position.set(bx - 0.7, by + 1.05, bz);
      breaker.quaternion.setFromAxisAngle(axis.set(0, 0, 1), -Math.PI / 2);
      breaker.scale.setScalar(1);
      return;
    }
    // Taken: slung on your back between strikes while your back is otherwise empty.
    const back = (me.avatar?.userData as { loadFit?: { frame: THREE.Object3D } } | undefined)?.loadFit?.frame;
    const mine = account(rows, pid);
    const free = !mine?.carry && !mine?.stone && !mine?.rails && !mine?.foot && beam(rows).holder !== pid && !heldId();
    if (w.breaker === 2 && (w.seams & 3) !== 3 && back && free) {
      back.updateWorldMatrix(true, false);
      contact.set(0.08, 0.05, 0.42);
      back.localToWorld(contact);
      back.getWorldQuaternion(q);
      breaker.position.copy(contact);
      breaker.quaternion.copy(q).multiply(q2.setFromAxisAngle(axis.set(0, 0, 1), 0.5));
      breaker.scale.setScalar(0.8);
      breaker.visible = onBack = true;
      return;
    }
    breaker.visible = false;
  }
  return {
    /** Seconds until your swing at seam `id` meets the stone (0 if none is under way): the seam opens on contact. */
    contactIn(id: number) {
      return swing.t >= 0 && swing.id === id && !swing.struck ? Math.max(0, SWING.contact - swing.t) : 0;
    },
    restore() {
      const w = worksRow(adapter.read.world());
      swing.t = -1;
      mote = 0.8;
      call.restore(w.breaker === 1);
      shown = w.breaker === 1;
    },
    update(dt: number) {
      const w = worksRow(adapter.read.world());
      call.update(dt, w.breaker === 1);
      onBack = false;
      pose(dt);
      shown = w.breaker === 1;
      mote -= dt;
      if (shown && mote <= 0) {
        mote = 0.35;
        side *= -1;
        goldMote(bx + side * 0.42, by + 1.4, bz + side * 0.5, side);
      }
      if (reducedMotion || w.breaker !== 2) return;
      seamMotes(dt, w.seams);
      // A glint off the head's brass bands on the carrier's back while a seam is left.
      glint -= dt;
      if (onBack && glint <= 0) {
        glint = 0.7 + Math.random() * 0.4;
        // On a brass band's top edge, outside the head (a glint inside the iron is never seen).
        side *= -1;
        contact.set(side * 0.18, 1.6, 0);
        breaker.localToWorld(contact);
        emit({
          x: contact.x,
          y: contact.y,
          z: contact.z,
          vx: 0,
          vy: 0.05,
          vz: 0,
          life: 0.45,
          size: 0.22,
          color: GOLD,
          intensity: readableIntensity() * 2,
          alpha: 0.9,
          shrink: 0.6,
          fade: 0.5,
          shape: 'glint',
        });
      }
    },
    accepted(e: RailwayAccepted) {
      if (e.op === 'rail.breaker') {
        thump(bx, bz);
        clank(bx, bz);
        dustRing(bx, by + 0.6, bz, 8, 1.5, 0.25);
      }
    },
    /** A strike the server refused: the head rings off the stone. */
    refused() {
      uiSound('deny');
    },
    targets(): Interactable[] {
      const rows = adapter.read.world(),
        w = worksRow(rows),
        pid = adapter.read.pid,
        p = me.body?.position;
      // Not while you haul the boiler (docs/plans/boiler-first-choice.md, Part 2); the rule refuses it too.
      if (!adapter.read.ready() || !p || swing.t >= 0 || (boiler(rows).state === 'held' && boiler(rows).holder === pid))
        return [];
      if (w.breaker === 1 && Math.hypot(p.x - bx, p.z - bz) <= 3.6)
        return [
          {
            id: 'railway-breaker',
            verb: 'Take the breaker',
            at: new THREE.Vector3(bx, by + 1.9, bz),
            run: () => void adapter.takeBreaker(),
          },
        ];
      if (w.breaker !== 2) return [];
      const out: Interactable[] = [];
      for (const seam of WORKS_SEAMS) {
        if (w.seams & (seam.id === 0 ? SEAM_STALL : SEAM_THROAT)) continue;
        const at = seamAt(seam.id);
        if (Math.hypot(p.x - at.x, p.z - at.z) > seam.reach / 100 - 0.4 || Math.abs(p.y - seam.y / 100) > 2.6) continue;
        // The rule takes a strike whatever you carry (the J5 route arrives with logs for the kiln).
        out.push({
          id: `railway-strike-${seam.id}`,
          verb: 'Strike the seam',
          at,
          run: () => {
            swing.t = 0;
            swing.id = seam.id;
            swing.struck = false;
            if (!adapter.strike(seam.id)) uiSound('deny');
          },
        });
      }
      return out;
    },
    inspect: () => ({
      breaker: {
        state: worksRow(adapter.read.world()).breaker,
        shown: breaker.visible,
        swinging: swing.t >= 0,
        x: breaker.position.x,
        y: breaker.position.y,
        z: breaker.position.z,
      },
    }),
  };
}
