// Independent review of town-economy-visible B2: a house that is already part-built when this tab first sees its Plot row
// (a join, a reload or a tab come back mid-build) must show its stage, not replay the pieces that already landed.
// src/place/sites.ts and src/place/pieces.ts run from their source; render and sound are counted stubs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceModule, sourceFunction } from '../dev/level/source.ts';
import { housePlan } from '../src/place/building-plans.ts';
import { TRADE } from '../src/sim/railway-trade-layout.ts';

function harness() {
  const sounds = { thump: 0, dust: 0 };
  const dropSet = sourceFunction<typeof import('../src/place/pieces.ts').dropSet>('src/place/pieces.ts', 'dropSet', {
    THREE,
    GRAVITY: 24,
    pos: new THREE.Matrix4(),
    tilt: new THREE.Matrix4(),
    e: new THREE.Euler(),
    ZERO: new THREE.Matrix4().makeScale(0, 0, 0),
    makeSet: () => ({ mesh: { visible: false, setMatrixAt() {}, instanceMatrix: {} } }),
  });
  const sites = sourceModule<typeof import('../src/place/sites.ts')>(fs.readFileSync('src/place/sites.ts', 'utf8'), {
    THREE,
    PLAYER_R: 0.45,
    ROOM_GROUP: 8,
    me: { body: null },
    H: () => 18,
    addStatic: () => ({}),
    teleport() {},
    paintSite() {},
    dustRing: () => void sounds.dust++,
    thump: () => void sounds.thump++,
    dropSet,
    planHouse: housePlan,
  });
  // The B2 house: the closed 7.4 m shell and its pace, as src/entities/town/plots.ts builds it.
  const plan = housePlan(
    {
      x: 909.5,
      z: 33,
      yaw: -Math.PI / 2,
      w: 7.4,
      d: 7.4,
      high: 3.7,
      rise: 2.5,
      wall: '#e8dcc0',
      post: '#7f5630',
      roof: '#c9a86a',
      door: { w: 2.6, rows: 3 },
      closed: true,
      windows: '#3f4a57',
      floor: 0.5,
    },
    18,
  );
  const none = { bodies: [], setEnabled() {} };
  const site = sites.addSite('plot.0', plan, (TRADE.buildTicks / 10 - 0.3) / 9.1, { hulls: [none], poles: [] });
  sites.buildSites({ cleanup() {}, add() {} } as never);
  return { sites, site, sounds };
}

test('review B2: a house first seen 6 s into its build lands no burst of thuds in its first frame', () => {
  const fresh = harness();
  fresh.sites.startSite(fresh.site, 0);
  fresh.sites.updateSites(1 / 60);
  const late = harness();
  late.sites.startSite(late.site, -6); // plots.ts: startSite(site, -(tick - bought) / 10)
  late.sites.updateSites(1 / 60);
  assert.ok(fresh.sounds.thump <= 1, `a fresh build starts quietly (${fresh.sounds.thump})`);
  assert.ok(
    late.sounds.thump <= 1 && late.sounds.dust <= 1,
    `a late view replays ${late.sounds.thump} thuds and ${late.sounds.dust} dust rings in one frame`,
  );
});
