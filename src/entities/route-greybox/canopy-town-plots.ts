import * as THREE from 'three/webgpu';
import { townGreeting } from '../town/greeting.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { localTownPulls, townHonks } from '../town/signal-state.ts';
import { windChime } from '../../render/machine-sfx.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { interactTarget, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/state.ts';
import { net, onRoomReady } from '../../netplay/net.ts';
import { createLimiter } from '../../sim/social.ts';
import { CANOPY_HANGOUT as site, canopyHangoutAt } from '../../sim/railway-route.ts';
import { Plot, Till } from '../../sim/railway-components.ts';
import { plotsStaked, plotPrice } from '../../sim/railway-queries-trade.ts';
import { TRADE } from '../../sim/railway-trade-layout.ts';
import { railwayCommands, railwayWorldRead } from '../railway/state.ts';
import { createHangoutBuilding } from '../ring-island/hangout-building.ts';
import { chimeCalls } from '../town/signal-timing.ts';
import { createCanopyToys } from './canopy-town-toys.ts';
import { paintBoard } from '../town/plot-board.ts';

const point = (u: number, l: number, y: number) => {
  const p = canopyHangoutAt(u, l, y);
  return new THREE.Vector3(p.x, p.y, p.z);
};
const yaw = Math.atan2(site.nx, site.nz);

export function createCanopyTownPlots(owner: OwnedView) {
  // The shell's box length is its local z axis, along the porch width.
  const footing = { point, yaw: yaw + Math.PI / 2, floor: site.floor, deck: 4, flat: true };
  const building = createHangoutBuilding(owner, { islandH: () => site.floor }, false, footing);
  const targets: Interactable[] = [];
  let held = 0,
    progress = 0,
    active = 0,
    lastLabel = '',
    lastPull = -Infinity;
  const release = () => {
    held = 0;
    progress = 0;
  };
  const near = (p: THREE.Vector3) => !!me.body && p.distanceTo(me.body.position) <= 3.2;
  const middle = point(0, 4, 1);
  // Placeholder building names, board text and interactions for the owner.
  const boards = ['Canopy Bounce Net', 'Treetop Wind Chime'].map((name, i) => {
    const kind = 10 + i,
      p = point(i === 0 ? -1.2 : 1.2, 4, 0);
    const begin = () => {
      release();
      held = kind;
    };
    const action: Interactable = {
      id: 'canopy.plot.' + kind,
      at: p.clone().add(new THREE.Vector3(0, 1, 0)),
      verb: '[Placeholder: Hold to build]',
      run: begin,
      release,
    };
    const record = instantiate(
      'town.choice-board',
      {
        id: action.id,
        prefab: 'town.choice-board',
        pos: [p.x, p.y, p.z],
        rot: [yaw, 0, 0],
        params: { kind },
        labels: { label: 'offer' },
      },
      {
        owner,
        texts: { offer: ['[Placeholder: ' + name + ']'] },
        paintLabel: paintBoard,
        handlers: { 'town.plot-buy': () => [action] },
      },
    );
    record.setEnabled(false);
    return { name, kind, begin, record, action };
  });
  const striker = point(0, 0, 1);
  const calls = chimeCalls();
  const toys = createCanopyToys(owner, point, yaw);
  let rang = -Infinity;
  const greet = townGreeting(
    owner,
    48,
    striker,
    () => active === 11,
    () => {
      rang = performance.now();
      windChime(striker.x, striker.z, 1, true);
    },
  );
  function ring(from: string) {
    rang = performance.now();
    calls.pull(rang, from);
  }
  const harmony = (from: string, now: number) => {
    if (active === 11 && calls.harmonizes(now, from)) {
      windChime(striker.x, striker.z, 0);
      windChime(striker.x, striker.z, 2);
    }
  };
  townHonks.add(harmony);
  owner.cleanup(() => townHonks.delete(harmony));
  const limiter = createLimiter(1, 1500);
  onRoomReady((room) => {
    if (owner.alive)
      owner.cleanup(
        room.onMessage((raw, from) => {
          const m = raw as { t?: unknown; id?: unknown } | null;
          if (
            active === 11 &&
            m?.t === 'chime' &&
            m.id === 48 &&
            typeof from === 'string' &&
            limiter.allow(from, performance.now())
          )
            ring(from);
        }),
      );
  });
  const pull: Interactable = {
    id: 'canopy.chime',
    verb: '[Placeholder: Ring wind chime]',
    at: striker,
    run: () => {
      const now = performance.now();
      if (active !== 11 || !near(striker) || now - lastPull < 1500) return;
      lastPull = now;
      ring('me');
      for (const hear of localTownPulls) hear(48);
      net.room?.send({ t: 'chime', id: 48 });
    },
  };
  return {
    targets,
    update(dt: number) {
      greet(performance.now());
      const read = railwayWorldRead();
      const w = read?.ready() ? read.world() : null;
      const row = w?.get(Plot, w.lookup(Plot, 48) ?? -1);
      const tick = read?.tick() ?? 0;
      const offered = !!(row && w && row.at < 0 && plotsStaked(w, 3).includes(0));
      const money = w?.get(Till, w.single(Till))?.boogles ?? 0;
      const price = w && read ? plotPrice(w, 3, 0, read.trade().pricePct ?? 50) : 0;
      targets.length = 0;
      const label = offered ? price + '/' + money : '';
      for (const b of boards) {
        b.record.setEnabled(offered);
        if (!offered) continue;
        if (label !== lastLabel)
          b.record.relabel('label', [
            '[Placeholder: ' + b.name + ']',
            '+1 rider / minute',
            'Price ' + price,
            'Box ' + money,
          ]);
        b.action.run = money >= price ? b.begin : undefined;
        b.action.blocked = money < price ? 'Need ' + (price - money) + ' more Boogles' : undefined;
        b.action.verb = held === b.kind ? 'Hold ' + Math.floor(progress * 100) + '%' : '[Placeholder: Hold to build]';
        if (money >= price && near(middle) && near(b.action.at)) targets.push(...b.record.targets());
      }
      lastLabel = label;
      if (held) {
        if (!targets.some((t) => t.id === 'canopy.plot.' + held) || money < price) release();
        else if ((progress += dt) >= 1) {
          railwayCommands()?.buy(48, held);
          release();
        }
      }
      const focused = targets.length ? interactTarget() : null;
      const preview = offered
        ? held || (targets.length ? boards.find((b) => b.action.id === focused?.id)?.kind : 10)
        : 0;
      building.preview(!!preview);
      active = row && row.at >= 0 && building.construction((tick - row.at) / TRADE.buildTicks) ? row.kind : 0;
      if (!row || row.at < 0) building.construction(-1);
      const p = me.body?.position;
      if (p) {
        const dx = p.x - striker.x,
          dz = p.z - striker.z;
        building.interior(
          Math.abs(dx * site.nz - dz * site.nx) < 2.6 &&
            Math.abs(dx * site.nx + dz * site.nz) < 2.1 &&
            p.y >= site.floor &&
            p.y < site.floor + 3,
        );
      }
      if (active === 11 && near(striker)) targets.push(pull);
      calls.update(performance.now(), (beat) => windChime(striker.x, striker.z, beat));
      toys.update(active, preview ?? 0, performance.now() - rang);
    },
  };
}
