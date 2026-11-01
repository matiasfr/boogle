// Stoking the wagon (?proto=wagon&v=stoke; docs/research/roblox-patterns.md, pattern 2: Dead Rails' furnace). Walk up
// to the firebox on the back of the loco's cab with logs on your back and press the interact button: up to PER_PRESS
// logs fly off your stack into the fire. Steam is speed (src/sim/wagon-steam.ts): a fed wagon runs at 6.5 m/s, a cold
// one at walking pace. Serves DESIGN.md 1 (Toys before chores) and 4 (Cooperation is automatic: anyone's log counts).
//
// The steam is lockstep (src/world/rules/wagon.ts); everything here is Local and cosmetic: the logs' flight, the
// fire's glow and embers, the gauge. ./index.ts reads `heat()` for the chimney's smoke.
import * as THREE from 'three/webgpu';
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { submitEdit, onApplied } from '../../world/sync.ts';
import { reducedMotion } from '../../constants.ts';
import { me } from '../../player/player.ts';
import { identity } from '../../player/identity.ts';
import { remotes } from '../../netplay/net.ts';
import { registerInteractable, NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { STEAM_MAX, STEAM_FULL, STOKE_MAX } from '../../sim/wagon-steam.ts';
import { LOGS } from '../../world/rules/wagon.ts';
import { FIREBOX, type Firebox } from './look.ts';

const PER_PRESS = 3; // logs one press puts in (30 s of steam)
const REACH = 2.3; // m from you to the firebox's mouth
const FLY = { flight: 0.42, stagger: 0.13, apex: 0.7 }; // s in the air, s between logs, m the arc rises
const { steam } = rules.wagon;

const logMat = new THREE.MeshStandardNodeMaterial({ color: '#8a5a32', roughness: 0.9 });
const logGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.42, 8).rotateZ(Math.PI / 2);
const ember = new THREE.Color('#ffb04a'),
  spark = new THREE.Color('#ffe08a');
type Flying = { mesh: THREE.Mesh; t: number; from: THREE.Vector3; spin: number };
const flying: Flying[] = [];
const pool: THREE.Mesh[] = [];

let heat = 0, // 0 cold .. 1 full speed, smoothed
  level = 0, // the gauge: 0 empty .. 1 a full firebox, smoothed
  flare = 0, // a log just landed: the fire flares, decaying
  emberAcc = 0;
/** How hot the fire burns now, 0..1 (full speed from 1): the chimney's smoke and chuffs follow it. */
export const fireHeat = () => heat;

const mouthAt = new THREE.Vector3(),
  promptAt = new THREE.Vector3(),
  mouthDir = new THREE.Vector3();

export function wagonStoke(fire: Firebox, shown: () => boolean): void {
  // ---------------------------------------------------------------- the press
  registerInteractable((): Interactable[] => {
    if (!me.body || !shown()) return NO_TARGETS;
    fire.mouth.getWorldPosition(mouthAt);
    const p = me.body.interpolatedPosition;
    if (Math.hypot(p.x - mouthAt.x, p.y - mouthAt.y, p.z - mouthAt.z) > REACH) return NO_TARGETS;
    promptAt.set(mouthAt.x, mouthAt.y + 0.95, mouthAt.z);
    const mine = rules.stacks.kind(identity.pid) === LOGS ? rules.stacks.count(identity.pid) : 0;
    const n = Math.min(PER_PRESS, mine);
    const room = rules.wagon.stokable(identity.pid, n);
    const t = { id: 'wagon-stoke', verb: 'Stoke', at: promptAt };
    if (!mine) return [{ ...t, blocked: 'Bring logs' }];
    if (!room) return [{ ...t, blocked: 'Firebox full' }];
    return [{ ...t, verb: `Stoke (${room})`, run: () => void submitEdit({ op: 'wagon.stoke', i: 0, j: 0, n }) }];
  });

  // ---------------------------------------------------------------- logs into the fire, from whoever stoked
  onApplied((e: { op: string; u?: string }, _tick: number, r: { n: number } | null) => {
    if (e.op !== 'wagon.stoke' || !r?.n || !shown()) return;
    fire.mouth.getWorldPosition(mouthAt);
    const mine = e.u === identity.pid;
    const who = mine ? me.body?.interpolatedPosition : [...remotes.values()].find((x) => x.pid === e.u)?.target;
    // A stoker out of sight (or too far to have reached): the logs come from just behind the door.
    const from = new THREE.Vector3();
    if (who && Math.hypot(who.x - mouthAt.x, who.y - mouthAt.y, who.z - mouthAt.z) < 6)
      from.set(who.x, who.y + 0.6, who.z);
    else fire.mouth.localToWorld(from.set(0, 0.3, -1.4));
    for (let k = 0; k < Math.min(r.n, STOKE_MAX); k++) {
      const mesh = pool.pop() ?? new THREE.Mesh(logGeo, logMat);
      mesh.castShadow = true;
      mesh.visible = false;
      scene.add(mesh);
      flying.push({ mesh, t: -k * FLY.stagger, from: from.clone(), spin: (Math.random() - 0.5) * 14 });
    }
  });

  onFrame(
    ({ dt }) => {
      const on = shown();
      fire.mouth.getWorldPosition(mouthAt);
      // the mouth's outward direction (the cab's -z), for embers
      fire.mouth
        .localToWorld(mouthDir.set(0, 0, -1))
        .sub(mouthAt)
        .normalize();
      // the logs' arcs: up from the stoker's hands, down into the mouth, a flare and a burst of sparks on landing
      for (let k = flying.length - 1; k >= 0; k--) {
        const f = flying[k];
        f.t += dt;
        const u = f.t / FLY.flight;
        if (u < 0) continue;
        if (u >= 1 || !on) {
          f.mesh.visible = false;
          scene.remove(f.mesh);
          pool.push(f.mesh);
          flying.splice(k, 1);
          if (!on) continue;
          flare = Math.min(1.5, flare + 0.6);
          burst(10);
          continue;
        }
        f.mesh.visible = true;
        f.mesh.position.lerpVectors(f.from, mouthAt, u);
        f.mesh.position.y += Math.sin(Math.PI * u) * FLY.apex;
        f.mesh.rotation.set(f.spin * f.t, Math.atan2(mouthAt.x - f.from.x, mouthAt.z - f.from.z), 0);
        f.mesh.scale.setScalar(1 - 0.35 * u * u); // into the dark of the mouth
      }
      // the fire: glow, the gauge's needle, a trickle of embers, all eased toward the steam
      const s = steam.steam;
      heat += (Math.min(1, s / STEAM_FULL) - heat) * Math.min(1, dt * 2);
      level += (s / STEAM_MAX - level) * Math.min(1, dt * 3);
      flare *= Math.exp(-dt * 2.5);
      const flicker = reducedMotion ? 0 : (Math.random() - 0.5) * 0.25 * (0.3 + heat);
      fire.glow.emissiveIntensity = 0.2 + heat * 1.6 + flare * 1.4 + flicker;
      fire.needle.rotation.z = -FIREBOX.sweep / 2 + FIREBOX.sweep * level;
      if (on && !reducedMotion) {
        emberAcc += dt * (heat * 5 + flare * 20);
        for (; emberAcc >= 1; emberAcc--) burst(1);
      }
    },
    { phase: 'update', order: 9 }, // after ./index.ts places the cars and ./look.ts animates them
  );
}

// Sparks and embers out of the mouth, rising and drifting back as the wagon moves.
function burst(n: number) {
  for (let k = 0; k < n; k++)
    emit({
      x: mouthAt.x + (Math.random() - 0.5) * 0.3,
      y: mouthAt.y + (Math.random() - 0.3) * 0.2,
      z: mouthAt.z + (Math.random() - 0.5) * 0.3,
      vx: mouthDir.x * (0.6 + Math.random()) + (Math.random() - 0.5) * 0.8,
      vy: 0.8 + Math.random() * 1.6,
      vz: mouthDir.z * (0.6 + Math.random()) + (Math.random() - 0.5) * 0.8,
      life: 0.5 + Math.random() * 0.7,
      size: 0.06 + Math.random() * 0.06,
      color: Math.random() < 0.4 ? spark : ember,
      alpha: 1,
      drag: 1.5,
      gravity: -1.5,
      shrink: 1,
    });
}

// The fire's roar and the chimney's chuffs are silent for now (cut in the sound audit, 2026-11-02); better ones
// come later.
