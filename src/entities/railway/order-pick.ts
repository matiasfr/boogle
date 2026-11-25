import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import { me } from '../../player/player.ts';
import { inputState } from '../../player/input-state.ts';
import { momentBusy } from '../../render/buddy-frame.ts';
import { createCameraPullOut } from '../../render/camera-pull-out.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { instantiate, liftOrWait } from '../../prefab/instantiate.ts';
import { addLooker, folk } from '../../place/folk.ts';
import { H } from '../../place/terrain.ts';
import { LINE1_PICK_STANDS, LINE1_JUMP_DEVICE } from '../../sim/railway-line-layout.ts';
import { LINE2_PACK } from '../../sim/railway-line2-layout.ts';
import { line1PickReady } from '../../sim/railway-queries.ts';
import { job } from '../../sim/railway-rows.ts';

type Part = keyof typeof LINE1_PICK_STANDS;
export function createOrderPick(adapter: RailwayAdapter, owner: OwnedView, models: Record<Part, THREE.Object3D>) {
  const guy = addLooker(0, 0, 0, 0, '#e4574a', { on: false });
  const shot = createCameraPullOut();
  owner.cleanup(shot.dispose);
  const keys: readonly Part[] = ['pack', 'jump'];
  let hold: { part: Part; start: number } | undefined;
  const cancel = () => {
    hold = undefined;
  };
  const near = (part: Part) => {
    const at = LINE1_PICK_STANDS[part],
      p = me.body?.position;
    return !!p && Math.hypot(p.x - at.x / 100, p.z - at.z / 100) <= at.reach / 100 && Math.abs(p.y - at.y / 100) <= 2.2;
  };
  function makeStand(part: Part) {
    const p = LINE1_PICK_STANDS[part],
      x = p.x / 100,
      z = p.z / 100;
    const y = H(x, z);
    const record = instantiate(
      'railway.pick-stand',
      {
        prefab: 'railway.pick-stand',
        id: 'railway-pick-' + part,
        pos: [x, y, z],
      },
      {
        owner,
        handlers: {
          'railway.take-part': () => {
            if (
              stage !== 'idle' ||
              !keys.every((k) => models[k].visible) ||
              !near(part) ||
              inputState.held ||
              momentBusy() ||
              !adapter.read.ready() ||
              !line1PickReady(adapter.read.world())
            )
              return [];
            return [
              {
                id: 'railway-pick-' + part,
                at,
                verb: 'Take',
                // Placeholder instruction for the owner. Keyboard, pad and touch share this hold.
                note:
                  hold?.part === part ? Math.min(100, Math.floor((performance.now() - hold.start) / 10)) + '%' : 'Hold',
                run: () => {
                  hold ??= { part, start: performance.now() };
                },
                release: cancel,
              },
            ];
          },
        },
      },
    );
    const at = record.attach('pickup').at;
    const model = models[part];
    owner.add(model);
    const box = new THREE.Box3().setFromObject(model);
    const foot = new THREE.Vector3(x, y + 0.7 - box.min.y, z);
    model.position.copy(foot);
    model.visible = false;
    let clear: ReturnType<typeof liftOrWait> | undefined;
    return {
      record,
      model,
      x,
      z,
      enable() {
        clear ??= liftOrWait([{ shapes: record.solids, on: () => record.setEnabled(true) }], me.body, { lift: true });
        return !clear.retry(me.body);
      },
      show() {
        model.visible = this.enable();
        model.position.copy(foot);
      },
      reset() {
        record.setEnabled(false);
        clear = undefined;
        model.position.copy(foot);
        model.visible = false;
      },
    };
  }
  const stands = { pack: makeStand('pack'), jump: makeStand('jump') };
  let stage: 'idle' | 'pack' | 'jump' | 'waiting' | 'framing' | 'fetch' | 'away' = 'idle';
  let other: Part = 'jump';
  const carryEnd = new THREE.Vector3();
  let funded: boolean | undefined;
  const placeGuy = (x: number, z: number) => {
    guy.x = x;
    guy.z = z;
    guy.fy = H(x, z);
  };
  const walk = (x: number, z: number, dt: number) => {
    const dx = x - guy.x,
      dz = z - guy.z,
      distance = Math.hypot(dx, dz);
    const step = Math.min(1, (dt * 3.4) / Math.max(distance, 0.001));
    guy.yaw = Math.atan2(dx, dz);
    guy.mood = 'walk';
    placeGuy(guy.x + dx * step, guy.z + dz * step);
    return step === 1;
  };
  const off = adapter.onAccepted((e) => {
    if ((e.op !== 'rail.pack' && e.op !== 'rail.jump') || e.station !== 'T1' || !e.accepted || e.predicted) return;
    const picked = e.op === 'rail.pack' ? 'pack' : 'jump';
    other = picked === 'pack' ? 'jump' : 'pack';
    stands[picked].model.visible = false;
    if (!guy.on) placeGuy(stands[picked].x, stands[picked].z + 1);
    guy.on = true;
    guy.mood = 'idle';
    stage = 'waiting';
    cancel();
  });
  function reset() {
    for (const part of keys) stands[part].reset();
    guy.on = false;
    stage = 'idle';
    funded = undefined;
    cancel();
  }
  const offReset = adapter.onReset((soft) => {
    shot.reset();
    if (!soft || job(adapter.read.world(), 0).start < 0) reset();
    else {
      cancel();
      stage = 'idle';
      guy.on = false;
    }
  });
  window.addEventListener('blur', cancel);
  owner.cleanup(() => {
    off();
    offReset();
    window.removeEventListener('blur', cancel);
    const i = folk.guys.indexOf(guy);
    if (i >= 0) folk.guys.splice(i, 1);
  });
  return {
    targets: () => keys.flatMap((part) => stands[part].record.targets()),
    cardDone(key: string) {
      if (stage === 'waiting' && key !== other && (key === 'pack' || key === 'jump')) stage = 'framing';
    },
    update(dt: number) {
      shot.update(dt);
      if (!adapter.read.ready()) return cancel();
      const w = adapter.read.world(),
        ready = line1PickReady(w),
        paid = job(w, 0).start >= 0;
      if (ready && funded === false) {
        stage = 'pack';
        placeGuy(stands.pack.x, stands.pack.z - 2);
        guy.on = true;
      }
      funded = paid;
      if (hold) {
        if (!ready || !near(hold.part) || inputState.held || momentBusy() || document.hidden) cancel();
        else if (performance.now() - hold.start >= 1000) {
          const part = hold.part;
          cancel();
          if (part === 'pack') adapter.openPack('T1');
          else adapter.claimJump('T1');
        }
      }
      if (stage === 'pack' || stage === 'jump') {
        const part = stage,
          stand = stands[part];
        if (part === 'jump') stands.pack.show();
        const arrived = walk(stand.x, stand.z - 0.9, dt);
        stand.model.visible = true;
        stand.model.position.set(guy.x + 0.18, guy.fy! + 0.95, guy.z);
        if (arrived) {
          stand.show();
          stage = part === 'pack' ? 'jump' : 'idle';
          guy.mood = 'idle';
        }
      } else if (ready) {
        for (const part of keys) stands[part].show();
      } else if (stage === 'framing') {
        if (inputState.held || momentBusy()) return;
        const stand = stands[other];
        const at = new THREE.Vector3(stand.x, H(stand.x, stand.z) + 1, stand.z);
        const dest = other === 'pack' ? LINE2_PACK : LINE1_JUMP_DEVICE;
        const dir = new THREE.Vector3(dest.x / 100 - stand.x, 0, dest.z / 100 - stand.z).normalize();
        carryEnd.copy(at).addScaledVector(dir, 10);
        carryEnd.y = H(carryEnd.x, carryEnd.z) + 1;
        const side = new THREE.Vector3(dir.z * 8, 3, -dir.x * 8);
        const fetchSeconds = Math.hypot(guy.x - stand.x, guy.z - stand.z + 0.85) / 3.4;
        shot.play(at.clone().add(side), carryEnd.clone().add(side), carryEnd, fetchSeconds + 3.3, 3, {
          atFrom: at,
          lead: fetchSeconds,
          cutIn: true,
          back: 0.15,
        });
        stage = 'fetch';
      } else if (stage === 'fetch' || stage === 'away') {
        if (inputState.held || shot.inspect().pending) return;
        const stand = stands[other];
        if (stage === 'fetch') {
          stand.show();
          if (walk(stand.x, stand.z - 0.85, dt)) stage = 'away';
        } else {
          const done = walk(carryEnd.x, carryEnd.z, dt);
          stand.model.position.set(guy.x + 0.18, guy.fy! + 1, guy.z);
          if (done) {
            stand.model.visible = guy.on = false;
            stage = 'idle';
          }
        }
      } else if (stage === 'idle') {
        for (const part of keys) {
          if (paid) stands[part].enable();
          stands[part].model.visible = false;
        }
        guy.on = false;
      }
    },
  };
}
