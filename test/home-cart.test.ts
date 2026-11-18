// R1b review regressions: drift pins must fail independently of generous clearance minima.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { checkHomeCart, COACH_STOP, HOME_STATIC } from '../dev/level/home-cart.ts';

test('Home pins cover every measured minimum and reject a 5 cm collider or stop drift', () => {
  const baseline = checkHomeCart();
  assert.deepEqual(baseline.problems, []);
  for (const m of baseline.designMinima)
    assert.ok(
      baseline.pins.some((p) => p.name === m.name),
      m.name,
    );
  const shifted = checkHomeCart({ obstacle: (id, b) => ({ ...b, x: b.x + (id === 'forge rack full' ? 0.05 : 0) }) });
  for (const phase of ['standing', 'operating'])
    assert.ok(
      shifted.problems.some((p) => p.startsWith(`${phase}/forge rack full: pin`)),
      phase,
    );
  // The fixture still clears the minima: only pins catch this regression.
  assert.ok(shifted.designMinima.every((m) => (m.strict ? m.value > m.minimum : m.value >= m.minimum)));
  const moved = checkHomeCart({ stop: COACH_STOP + 0.05 });
  assert.ok(moved.problems.some((p) => p.startsWith('nose s: pin')));
  assert.ok(moved.problems.some((p) => p.startsWith('players short of arc: pin')));
});

test('renderer-local Home envelope literals agree with production construction sites', () => {
  // These renderer factories cannot be imported into a pure Node test: scene/DOM/physics ownership.
  // Whitespace-insensitive construction guards fail closed on a changed value OR a rewritten construction;
  // review the new production expression before updating an envelope, never auto-refresh these guards.
  const has = (file: string, fragment: string) => {
    const text = fs.readFileSync(file, 'utf8').replace(/\s/g, '');
    assert.ok(text.includes(fragment.replace(/\s/g, '')), `${file}: ${fragment}`);
  };
  const { lever: l, forge: f, depot: d, sign: s, tree: t } = HOME_STATIC;
  const home = 'src/entities/railway/home-station-view.ts';
  has(home, 'const yaw = home.HALL.yaw');
  has(home, `box(p.x, ground(p) + 0.18, p.z, ${l.w}, 0.36, ${l.d}, yaw)`);
  has(home, `side(0, home.LEG.from + ${l.along}, -${l.lat})`);
  has(home, `side(1, home.LEG.to + ${l.along}, ${l.lat})`);
  has(home, `side(1, home.SPUR.s - ${l.along}, ${l.lat})`);
  const forge = 'src/place/opening-models.ts';
  has(forge, `[-${f.postZ}, ${f.postZ}]`);
  has(forge, `[-${f.postX}, ${f.postX}]`);
  // Each post reaches down to its own ground; its footprint is unchanged.
  has(forge, `new THREE.BoxGeometry(${f.postW}, 1.8 + drop, ${f.postW})`);
  has(forge, `new THREE.BoxGeometry(${f.beamW}, 0.14, ${f.postW})`);
  has(
    'src/entities/railway/opening-view.ts',
    `{ kind: 'box', hx: ${Math.max(f.postX + f.postW / 2, f.beamW / 2)}, hy: 0.45, hz: ${f.postZ + f.postW / 2} }`,
  );
  const depot = 'src/entities/railway/line2-view.ts';
  has(depot, `[-${d.postX}, ${d.postX}]`);
  has(depot, `[-${d.postZ}, ${d.postZ}]`);
  has(depot, `['b', x, 0.08, 0, ${d.bearerW}, 0.16, 1.6,`);
  has(depot, `['b', x, 0.65, z, ${d.postW}, 1.3, ${d.postW},`);
  has(depot, `f.x - Math.sin(f.yaw) * ${d.along} - Math.cos(f.yaw) * side * ${d.out}`);
  has(depot, `f.z - Math.cos(f.yaw) * ${d.along} + Math.sin(f.yaw) * side * ${d.out}`);
  has(depot, `.set(${s.x}, 0, ${s.z})`);
  has(depot, 'depotYaw(k) + Math.PI / 2');
  has('src/entities/railway/stock-sign.ts', `signBoard(owner, { w: ${s.w},`);
  has('src/render/sign-board.ts', `BORDER = ${s.border}, DEPTH = ${s.depth}, POST = ${s.post}`);
  has('src/render/sign-board.ts', 'o.w + 2 * BORDER');
  has('src/render/sign-board.ts', 'DEPTH / 2 + 0.004');
  has('src/render/place-tree-view.ts', `new THREE.CylinderGeometry(0.28, ${t.pine}, 5, 6)`);
  has('src/render/place-tree-view.ts', `new THREE.CylinderGeometry(0.52, ${t.hardwood}, 5, 12, 1)`);
  has('src/render/place-tree-view.ts', `const ridge = 1 + ${t.barkRelief} * Math.cos(Math.atan2(z, x) * 6)`);
});
