import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { localTownPulls } from '../town/signal-state.ts';
import { townGreeting } from '../town/greeting.ts';
import { bell, canyonHorn } from '../../render/machine-sfx.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { interactTarget, type Interactable } from '../../player/hands.ts';
import { me } from '../../player/state.ts';
import { net, onRoomReady } from '../../netplay/net.ts';
import { createLimiter } from '../../sim/social.ts';
import { GORGE_HANGOUT as site, gorgeAt } from '../../sim/railway-route.ts';
import { Plot, Till } from '../../sim/railway-components.ts';
import { plotsStaked, plotPrice } from '../../sim/railway-queries-trade.ts';
import { TRADE } from '../../sim/railway-trade-layout.ts';
import { railwayCommands, railwayWorldRead } from '../railway/state.ts';
import { createHangoutBuilding } from '../ring-island/hangout-building.ts';
import { gorgeHookRings, type HookRing } from '../railway/hook-path.ts';
import { paintBoard } from '../town/plot-board.ts';

const vec = (p: { x: number; y: number; z: number }) => new THREE.Vector3(p.x, p.y, p.z);
const point = (u: number, l: number, y: number) => vec(gorgeAt(site.a + l, site.c + u, site.floor + y));
const yaw = Math.atan2(-0.5162, 0.8565);
export function createGorgeTownPlots(owner: OwnedView) {
  const footing = { point, yaw, floor: site.floor, deck: 4, flat: true };
  const buildings = [false, true].map((perch) =>
    createHangoutBuilding(owner, { islandH: () => site.floor }, perch, footing),
  );
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
  const boards = ['Echo Horn House', 'Canyon Hook-Perch'].map((name, i) => {
    const kind = 8 + i,
      p = point(i === 0 ? -1.2 : 1.2, 4, 0);
    const begin = () => {
      release();
      held = kind;
    };
    const action: Interactable = {
      id: 'gorge.plot.' + kind,
      at: p.clone().add(new THREE.Vector3(0, 1, 0)),
      verb: 'Hold to build',
      run: begin,
      release,
    };
    const record = instantiate(
      'town.choice-board',
      {
        id: action.id,
        prefab: 'town.choice-board',
        pos: [p.x, p.y, p.z],
        rot: [yaw + Math.PI / 2, 0, 0],
        params: { kind },
        labels: { label: 'offer' },
      },
      { owner, texts: { offer: [name] }, paintLabel: paintBoard, handlers: { 'town.plot-buy': () => [action] } },
    );
    record.setEnabled(false);
    return { name, kind, begin, record, action };
  });
  const hornAt = point(0, 0, 1);
  const gold = new THREE.MeshStandardMaterial({ color: 0xe7af4a, metalness: 0.5, roughness: 0.35 });
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.11, 1.6, 24, 1, true), gold);
  gold.side = THREE.DoubleSide;
  horn.position.copy(hornAt);
  horn.rotation.z = -1.12;
  const roofHorn = new THREE.Group();
  roofHorn.position.copy(point(0, 0, 3.05));
  roofHorn.rotation.y = yaw;
  const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 1.2, 16), gold);
  riser.position.y = 0.6;
  const flare = new THREE.Mesh(new THREE.CylinderGeometry(1.04, 0.19, 2.2, 32, 1, true), gold);
  flare.rotation.x = 1.24;
  flare.position.set(0, 1.53, 1);
  roofHorn.add(riser, flare);
  const crank = new THREE.Group();
  crank.position.copy(hornAt);
  crank.position.z += 0.48;
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), gold);
  arm.position.y = 0.25;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.24, 10), gold);
  handle.position.set(0, 0.5, 0.1);
  handle.rotation.x = Math.PI / 2;
  crank.add(arm, handle);
  const wave = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.08, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0xb7f4ef }),
  );
  const raft = new THREE.Group();
  const buoy = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.35, 0.62, 5), gold);
  raft.position.copy(vec(gorgeAt(19, -26, 0.32)));
  buoy.position.y = 0.56;
  raft.add(buoy);
  owner.add(horn, roofHorn, crank, wave, raft);
  owner.cleanup(() => {
    gold.dispose();
    wave.material.dispose();
  });
  const rings: HookRing[] = [
    [6, -14, 11],
    [16, -17, 15],
    [19, -26, 12],
  ].map(([a, c, y], i) => {
    const at = gorgeAt(a!, c!, y!),
      land = { ...at, y: i === 2 ? 1 : at.y - 0.8 };
    return {
      id: 'gorge-' + i,
      at,
      land,
      pad: { id: 'gorge-' + i, x: land.x, z: land.z, top: land.y - 0.65, hx: 1, hz: 1, look: 'float' },
    };
  });
  owner.cleanup(() => {
    for (const r of rings) gorgeHookRings.delete(r);
  });
  const calls = new Set<{ from: string; start: number; beat: number }>();
  let echoed = -Infinity,
    sounded = false;
  const greet = townGreeting(
    owner,
    32,
    hornAt,
    () => active === 8,
    () => {
      echoed = performance.now();
      canyonHorn(hornAt.x, hornAt.z, 2, false);
    },
  );
  function echo(from: string) {
    const now = performance.now();
    const harmony = [...calls].some((call) => call.from !== from && now - call.start < 3000);
    canyonHorn(hornAt.x, hornAt.z, 0, harmony);
    calls.add({ from, start: now, beat: 0 });
    echoed = now;
  }
  const limiter = createLimiter(1, 1500);
  onRoomReady((room) => {
    if (owner.alive)
      owner.cleanup(
        room.onMessage((raw, from) => {
          const m = raw as { t?: unknown; id?: unknown } | null;
          if (
            active === 8 &&
            m?.t === 'echo' &&
            m.id === 32 &&
            typeof from === 'string' &&
            limiter.allow(from, performance.now())
          )
            echo(from);
        }),
      );
  });
  const pull: Interactable = {
    id: 'gorge.echo',
    verb: 'Blow echo horn',
    at: hornAt,
    run: () => {
      if (active !== 8 || !near(hornAt) || performance.now() - lastPull < 1500) return;
      lastPull = performance.now();
      echo('');
      for (const hear of localTownPulls) hear(32);
      net.room?.send({ t: 'echo', id: 32 });
    },
  };
  return {
    targets,
    update(dt: number) {
      greet(performance.now());
      const read = railwayWorldRead();
      const w = read?.ready() ? read.world() : null;
      const row = w?.get(Plot, w.lookup(Plot, 32) ?? -1);
      const tick = read?.tick() ?? 0;
      const offered = !!(row && w && row.at < 0 && plotsStaked(w, 2).includes(0));
      const money = w?.get(Till, w.single(Till))?.boogles ?? 0;
      const price = w && read ? plotPrice(w, 2, 0, read.trade().pricePct ?? 50) : 0;
      targets.length = 0;
      const label = offered ? price + '/' + money : '';
      for (const b of boards) {
        b.record.setEnabled(offered);
        if (!offered) continue;
        if (label !== lastLabel)
          b.record.relabel('label', [b.name, '+1 rider / minute', 'Price ' + price, 'Box ' + money]);
        b.action.run = money >= price ? b.begin : undefined;
        b.action.blocked = money < price ? 'Need ' + (price - money) + ' more Boogles' : undefined;
        b.action.verb = held === b.kind ? 'Hold ' + Math.floor(progress * 100) + '%' : 'Hold to build';
        if (near(middle) && near(b.action.at)) targets.push(...b.record.targets());
      }
      lastLabel = label;
      if (held) {
        if (!targets.some((t) => t.id === 'gorge.plot.' + held) || money < price) release();
        else if ((progress += dt) >= 1) {
          railwayCommands()?.buy(32, held);
          release();
        }
      }
      const focused = targets.length ? interactTarget() : null;
      const preview = offered
        ? held || (targets.length ? boards.find((b) => b.action.id === focused?.id)?.kind : 8)
        : 0;
      active = 0;
      buildings.forEach((b, i) => {
        b.preview(preview === 8 + i);
        if (b.construction(row && row.at >= 0 && row.kind === 8 + i ? (tick - row.at) / TRADE.buildTicks : -1))
          active = 8 + i;
        const p = me.body?.position;
        if (p) {
          const dx = p.x - hornAt.x,
            dz = p.z - hornAt.z;
          b.interior(
            Math.abs(dx * 0.8565 + dz * 0.5162) < 2.1 &&
              Math.abs(-dx * 0.5162 + dz * 0.8565) < 2.6 &&
              p.y >= site.floor &&
              p.y < site.floor + 3,
          );
        }
      });
      horn.visible = roofHorn.visible = crank.visible = active === 8;
      crank.rotation.z = Math.min(1, (performance.now() - echoed) / 600) * Math.PI * 2;
      if (horn.visible && near(hornAt)) targets.push(pull);
      for (const r of rings)
        if (active === 9) gorgeHookRings.add(r);
        else gorgeHookRings.delete(r);
      raft.visible = active === 9;
      buoy.position.y = 0.56 + 0.12 * Math.sin(performance.now() / 400);
      const touching = raft.visible && !!me.body && raft.position.distanceTo(me.body.position) < 2.3;
      if (touching && !sounded) bell(raft.position.x, raft.position.z);
      sounded = touching;
      const now = performance.now();
      const age = (now - echoed) / 1000;
      wave.visible = horn.visible && age < 3;
      if (wave.visible) {
        const side = Math.floor(age) % 2 === 0 ? 1 : -1;
        const p = gorgeAt(5, side * ((age % 1) * 90 - 45), 10);
        wave.position.copy(vec(p));
        wave.scale.setScalar(1 + age);
      }
      for (const call of calls) {
        const elapsed = now - call.start;
        while (horn.visible && call.beat < 3 && elapsed >= (call.beat + 1) * 820) {
          call.beat++;
          const wall = gorgeAt(5, call.beat % 2 ? 45 : -45, 10);
          canyonHorn(wall.x, wall.z, call.beat, false);
        }
        if (!horn.visible || elapsed >= 3000) calls.delete(call);
      }
    },
  };
}
