import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { BufferGeometry, Group, MeshBasicMaterial, type InstancedMesh } from 'three/webgpu';
import { ringAnchor } from '../src/place/ring-wildlife-sites.ts';
import { LINE2 } from '../src/sim/railway-lines.ts';
import { lapSlots } from '../src/sim/railway-lap.ts';

const stub = (path: string, exports: object) => mock.module(path, { exports });
stub('../src/render/draw-count.ts', { guardInstances: (mesh: InstancedMesh) => mesh });
const { createPool } = await import('../src/render/instances.ts');
type View = { mesh: Group; update(ctx: { dt: number }): void; dispose(): void };
let mount: () => View;
let trainId = '';
const perch = ringAnchor('flock', 3);
const ball = { x: 0, y: 0, z: 0 };
stub('../src/entity/entity.ts', { defineKind() {}, spawn: (view: View) => view });
stub('../src/graphics-settings.ts', { onGraphicsChange: () => () => {} });
stub('../src/entities/railway/railhead-state.ts', { railheadDrawn: { live: true, u: 260 } });
stub('../src/entities/railway/glide.ts', { railwayGlideOpen: () => false });
stub('../src/entities/ball/view.ts', { ballMesh: { position: ball } });
stub('../src/netplay/net.ts', { remotes: new Map() });
stub('../src/physics/platforms.ts', {
  platformById: (id: string) => (id === trainId ? { body: { position: perch, velocity: { z: -5 } } } : null),
});
stub('../src/player/state.ts', { me: {} });
stub('../src/render/sky.ts', { skyNow: { day: 1 } });
stub('../src/place/wildlife.ts', {
  reducedWildlife: () => false,
  wildlifePool: (_kind: string, count: number) => createPool(new BufferGeometry(), new MeshBasicMaterial(), count),
  wildlifeZone: (...args: [string, number, number, number, number, () => View]) => {
    mount = args[5];
  },
});
await import('../src/features/critter-ring.ts');

test('incoming trains from the joined fleet lift the gull on the finished bent', () => {
  for (const slot of lapSlots(LINE2, true)) {
    const view = mount();
    trainId = 'railway:train' + slot + '-0';
    view.update({ dt: 0.1 });
    const flock = view.mesh.getObjectByName('critter-ring-flock') as InstancedMesh;
    const y = flock.instanceMatrix.array[3 * 16 + 13]!;
    view.dispose();
    assert.ok(y > perch.y + 1, 'no lift for slot ' + slot);
  }
});

test('the same descending ball scatters fish at 60 and 120 frames per second', () => {
  const fish = ringAnchor('school', 0);
  function positionAfterSplash(fps: number) {
    Object.assign(ball, { x: fish.x - 1, y: 0.6, z: fish.z });
    const view = mount();
    for (let i = 0; i < fps / 4; i++) {
      ball.y -= 2 / fps;
      view.update({ dt: 1 / fps });
    }
    const school = view.mesh.getObjectByName('critter-ring-school') as InstancedMesh;
    const x = school.instanceMatrix.array[12]!;
    view.dispose();
    return x;
  }
  assert.ok(Math.abs(positionAfterSplash(60) - positionAfterSplash(120)) < 0.1);
});
