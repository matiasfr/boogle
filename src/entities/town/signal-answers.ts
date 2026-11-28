import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { windChime } from '../../render/machine-sfx.ts';
import { onRoomReady } from '../../netplay/net.ts';
import { CANOPY_CHIME, GORGE_HORN } from '../../sim/railway-route.ts';
import { RING_HANGOUT, ringAt } from '../../sim/railway-ring-layout.ts';
import { createLimiter } from '../../sim/social.ts';
import { Plot } from '../../sim/railway-components.ts';
import { plotBuilt } from '../../sim/railway-queries-trade.ts';
import { PLOT_KIND } from '../../sim/railway-trade-layout.ts';
import { railwayWorldRead } from '../railway/state.ts';
import { localTownPulls, answerFor } from './signal-state.ts';

export function createSignalAnswers(owner: OwnedView) {
  const rope = ringAt(RING_HANGOUT.u, RING_HANGOUT.lat);
  const sites = [
    {
      slot: 16,
      event: 'bell',
      kind: PLOT_KIND.bell,
      at: { x: rope.x / 100, y: RING_HANGOUT.floor / 100 + 1, z: rope.z / 100 },
    },
    { slot: 32, event: 'echo', kind: PLOT_KIND.echo, at: GORGE_HORN },
    { slot: 48, event: 'chime', kind: PLOT_KIND.chime, at: CANOPY_CHIME },
  ].map((site) => {
    const material = new THREE.MeshBasicMaterial({ color: 0xffde91, transparent: true, depthWrite: false });
    const pulse = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), material);
    pulse.rotation.x = Math.PI / 2;
    pulse.visible = false;
    owner.add(pulse);
    owner.cleanup(() => material.dispose());
    return { ...site, answer: answerFor(site.slot), pulse, sounded: -Infinity };
  });
  function receive(slot: number) {
    const read = railwayWorldRead();
    if (!read?.ready()) return;
    const w = read.world();
    for (const s of sites)
      if (s.slot !== slot && plotBuilt(w, s.slot, read.tick()) && w.get(Plot, w.lookup(Plot, s.slot)!)?.kind === s.kind)
        s.answer.call(performance.now());
  }
  localTownPulls.add(receive);
  owner.cleanup(() => localTownPulls.delete(receive));
  const limiter = createLimiter(1, 1500);
  onRoomReady((room) => {
    if (owner.alive)
      owner.cleanup(
        room.onMessage((raw, from) => {
          const m = raw as { t?: unknown; id?: unknown } | null;
          const s = sites.find((s) => m?.id === s.slot && m.t === s.event);
          if (s && typeof from === 'string' && limiter.allow(from, performance.now())) receive(s.slot);
        }),
      );
  });
  owner.animate(() => {
    const now = performance.now();
    for (const s of sites) {
      if (s.answer.update(now)) {
        s.sounded = now;
        windChime(s.at.x, s.at.z, 1, true);
      }
      const age = (now - s.sounded) / 1500;
      s.pulse.visible = age < 1;
      if (s.pulse.visible) {
        s.pulse.position.set(s.at.x, s.at.y + 7 + age * 15, s.at.z);
        s.pulse.scale.setScalar(2 + age * 6);
        s.pulse.material.opacity = 1 - age;
      }
    }
  }, 12);
}
