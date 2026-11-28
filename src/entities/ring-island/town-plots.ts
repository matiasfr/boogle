import * as THREE from 'three/webgpu';
import type { FrameCtx } from '../../loop.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { bell } from '../../render/machine-sfx.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { me } from '../../player/state.ts';
import { interactTarget, type Interactable } from '../../player/hands.ts';
import { ringPlotTargets as targets } from './state.ts';
import { Plot, Till } from '../../sim/railway-components.ts';
import { plotsStaked, plotPrice } from '../../sim/railway-queries-trade.ts';
import { roomWorks } from '../../sim/railway-queries-room.ts';
import { rowHalt } from '../../sim/railway-route.ts';
import { PLOT_KIND, TRADE } from '../../sim/railway-trade-layout.ts';
import { advanceHold } from '../../components/hold/view.ts';
import { net } from '../../netplay/net.ts';
import { railwayCommands, railwayWorldRead } from '../railway/state.ts';
import { fixedTelescope } from '../lookout/view.ts';
import { standWhenClear } from '../railway/frame-occupied.ts';
import type { IslandGround } from './ground.ts';
import { ringUL } from './ground.ts';
import { RING_HANGOUT } from '../../sim/railway-ring-layout.ts';
import { createHangoutBuilding, floor, hangoutPoint, yaw } from './hangout-building.ts';
import { paintBoard } from '../town/plot-board.ts';

export function createRingPlot(owner: OwnedView, ground: IslandGround) {
  const tower = createHangoutBuilding(owner, ground, true),
    house = createHangoutBuilding(owner, ground, false);
  const boardAt = hangoutPoint(0, 4, 0);
  let held = 0,
    progress = 0,
    active = 0,
    lastPull = -Infinity,
    rang = -Infinity;
  const release = () => {
    held = 0;
    progress = 0;
  };
  const near = (at: THREE.Vector3, radius: number) => !!me.body && at.distanceTo(me.body.position) < radius;
  const boards = ['Lookout Tower', 'Signal Bellhouse'].map((name, i) => {
    const kind = i === 0 ? PLOT_KIND.lookout : PLOT_KIND.bell;
    const at = hangoutPoint(i === 0 ? -1.2 : 1.2, 4, 0);
    at.y = ground.islandH(at.x, at.z);
    const action: Interactable = {
      id: 'ring.plot.' + kind,
      verb: 'Hold to build',
      at: at.clone().add(new THREE.Vector3(0, 1, 0)),
      run: () => {
        release();
        held = kind;
      },
      release,
    };
    const record = instantiate(
      'town.choice-board',
      {
        id: action.id,
        prefab: 'town.choice-board',
        params: { kind },
        labels: { label: 'offer' },
        pos: [at.x, at.y, at.z],
        rot: [yaw + Math.PI / 2, 0, 0],
      },
      { owner, texts: { offer: [name] }, paintLabel: paintBoard, handlers: { 'town.plot-buy': () => [action] } },
    );
    record.setEnabled(false);
    return { action, begin: action.run, record, kind, name };
  });
  const scopeAt = hangoutPoint(0, 0, 6);
  const eye = scopeAt.clone().add(new THREE.Vector3(0, 2.57, 0));
  const direction = new THREE.Vector3();
  let lastAimSecond = -1;
  const focus = () => {
    const read = railwayWorldRead();
    const works = read?.ready() ? roomWorks(read.world()) : null;
    const p = works && !works.done ? works.at : rowHalt('ring', 1);
    return direction.set(p.x / 100, p.y / 100 + 1, p.z / 100);
  };
  const modal = fixedTelescope(owner, eye, () => direction);
  const look: Interactable = {
    id: 'ring.lookout',
    verb: 'Look through it',
    at: eye,
    run: () => {
      focus();
      modal.lookThrough();
    },
  };
  const scope = instantiate(
    'lookout.telescope',
    { id: look.id, prefab: 'lookout.telescope', pos: [scopeAt.x, scopeAt.y, scopeAt.z], params: { aim: 0 } },
    { owner, handlers: { 'lookout.look': () => [look] } },
  );
  scope.setEnabled(false);
  const rope = hangoutPoint(0, 0, 1.25);
  const metal = new THREE.MeshStandardMaterial({ color: 0xe1ab46, metalness: 0.48, roughness: 0.39 });
  const fibre = new THREE.MeshStandardMaterial({ color: 0xd1a375 });
  const signal = new THREE.MeshBasicMaterial({ color: 0xffdc58 });
  const pendulum = new THREE.Group();
  pendulum.position.copy(hangoutPoint(0, 0, 5.45));
  function part(geo: THREE.BufferGeometry, mat: THREE.Material, y: number) {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    pendulum.add(m);
    owner.cleanup(() => geo.dispose());
  }
  part(new THREE.CylinderGeometry(0.44, 0.88, 1.1, 24), metal, -0.55);
  part(new THREE.SphereGeometry(0.2, 12, 8), metal, -1.22);
  part(new THREE.CylinderGeometry(0.045, 0.045, 3.25, 8), fibre, -2.9);
  const wave = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 8, 60), signal);
  wave.name = 'ring:bell-signal';
  wave.rotation.x = Math.PI / 2;
  owner.add(pendulum, wave);
  owner.cleanup(() => {
    metal.dispose();
    fibre.dispose();
    signal.dispose();
  });
  pendulum.visible = wave.visible = false;
  function ring() {
    rang = performance.now();
    bell(rope.x, rope.z, 400);
  }
  const pull: Interactable = {
    id: 'ring.bell',
    verb: 'Ring bell',
    at: rope,
    run: () => {
      const now = performance.now();
      if (active !== PLOT_KIND.bell || !near(rope, 3.2) || now - lastPull < 1500) return;
      lastPull = now;
      ring();
      net.room?.send({ t: 'bell', id: 16 });
    },
  };
  const ropeRecord = instantiate(
    'ring.bell-rope',
    { id: pull.id, prefab: 'ring.bell-rope', pos: [rope.x, rope.y, rope.z] },
    { owner, handlers: { 'ring.pull-bell': () => [pull] } },
  );
  ropeRecord.setEnabled(false);
  let lastLabel = '';
  function hide() {
    active = 0;
    release();
    targets.length = 0;
    lastLabel = '';
    for (const b of boards) b.record.setEnabled(false);
    tower.construction(-1);
    house.construction(-1);
    tower.preview(false);
    house.preview(false);
    modal.stepBack();
    scope.setEnabled(false);
    ropeRecord.setEnabled(false);
    pendulum.visible = wave.visible = false;
  }
  return {
    hide,
    incoming: () => {
      if (active === PLOT_KIND.bell) ring();
    },
    update(ctx: FrameCtx) {
      const read = railwayWorldRead();
      if (!read?.ready()) {
        release();
        targets.length = 0;
        return;
      }
      const w = read.world(),
        tick = read.tick();
      const row = w.get(Plot, w.lookup(Plot, 16) ?? -1);
      targets.length = 0;
      if (!row) {
        hide();
        return;
      }
      const offered = row.at < 0 && plotsStaked(w, 1).includes(0);
      const money = w.get(Till, w.single(Till))!.boogles,
        price = plotPrice(w, 1, 0, read.trade().pricePct ?? 50);
      const label = price + '/' + money;
      const body = me.body;
      for (const b of boards) {
        b.record.setEnabled(offered);
        if (!offered) continue;
        if (label !== lastLabel)
          b.record.relabel('label', [b.name, '+1 rider / minute', 'Price ' + price, 'Box ' + money]);
        b.action.blocked = money < price ? 'Need ' + (price - money) + ' more Boogles' : undefined;
        b.action.run = money < price ? undefined : b.begin;
        b.action.verb = held === b.kind ? 'Hold ' + Math.floor(100 * progress) + '%' : 'Hold to build';
        if (near(b.action.at, 3.2) && near(boardAt, 3.2)) targets.push(...b.record.targets());
      }
      lastLabel = offered ? label : '';
      if (held) {
        if (!offered || money < price || !targets.some((t) => t === boards.find((b) => b.kind === held)?.action))
          release();
        else if ((progress = advanceHold(progress, ctx.dt, true, 1)) >= 1) {
          railwayCommands()?.buy(16, held);
          release();
        }
      }
      const fraction = row.at >= 0 ? (tick - row.at) / TRADE.buildTicks : -1;
      // From the approach, show the default blueprint. At the boards, follow the Interact prompt.
      const focused = targets.length ? interactTarget() : null;
      const choice = targets.length ? boards.find((b) => b.action.id === focused?.id)?.kind : PLOT_KIND.lookout;
      const preview = offered ? held || choice : 0;
      tower.preview(preview === PLOT_KIND.lookout);
      house.preview(preview === PLOT_KIND.bell);
      const towerOn = tower.construction(row.kind === PLOT_KIND.lookout ? fraction : -1);
      const houseOn = house.construction(row.kind === PLOT_KIND.bell ? fraction : -1);
      active = towerOn ? PLOT_KIND.lookout : houseOn ? PLOT_KIND.bell : 0;
      if (body && active) {
        const p = ringUL(body.position.x, body.position.z);
        const inside =
          Math.abs(p.u - RING_HANGOUT.u / 100) < 2.6 &&
          Math.abs(p.lat - RING_HANGOUT.lat / 100) < 2.1 &&
          body.position.y >= floor &&
          body.position.y < floor + 3;
        tower.interior(inside);
        house.interior(inside);
      }
      if (towerOn) {
        const second = Math.floor(tick / 10);
        if (!scope.root.visible || second !== lastAimSecond) {
          const dest = focus();
          scope.root.rotation.y = Math.atan2(dest.x - eye.x, dest.z - eye.z);
          lastAimSecond = second;
        }
        if (!scope.root.visible) standWhenClear(scope.solids, () => scope.setEnabled(true));
        if (scope.root.visible && near(eye, 3.2) && !modal.open) targets.push(...scope.targets());
      } else modal.stepBack();
      if (!towerOn) scope.setEnabled(false);
      pendulum.visible = houseOn;
      ropeRecord.setEnabled(houseOn);
      if (houseOn && near(rope, 3.2)) targets.push(...ropeRecord.targets());
      const age = (performance.now() - rang) / 1000;
      if (houseOn && age < 2.4) {
        pendulum.rotation.z = Math.sin(age * 9) * Math.exp(-age * 2) * 0.4;
        wave.visible = true;
        wave.position.copy(pendulum.position);
        wave.position.y += 2 + age * 6;
        wave.scale.setScalar(1 + age * 3);
      } else {
        wave.visible = false;
        pendulum.rotation.z = 0;
      }
    },
  };
}
