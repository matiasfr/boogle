// Catalog marks for leg 4. Steps 4 and 5 add the placed platforms, hood and flood.
import { readFileSync, writeFileSync } from 'node:fs';
import { ORIGIN } from '../../src/place/layout.ts';
import { inside, layout, parseMapPage, type XZ } from '../../src/sickle/map-data.ts';
import { consistOf } from '../../src/entities/railway/cars.ts';
import { ENGINE_BOILER, ENGINE_CAB } from '../../src/entities/railway/engine.ts';
import { HEAD_BACK_CM, RAIL_LEGS, legFrame, legRack, rowPoint, rowSide } from '../../src/sim/railway-route.ts';
import { WORLD_LINES } from '../../src/sim/railway-world-lines.ts';
import prefabInput from '../../content/built/prefabs.json' with { type: 'json' };
import { validateArtifact, loadLevelArtifact } from '../../src/prefab/validate.ts';
import { heightAt, resolvePlacedColliders, reserveVolume, volumesOverlap } from './prefab-colliders.ts';
import { flood } from './flood.ts';
import { MOVER } from './mover.ts';
import type { Reserve } from '../../src/content/levels/leg2.ts';

function shoreDistance(p: XZ, outline: XZ[]) {
  const distances = outline.map(([x, z], i) => {
    const q = outline[(i + 1) % outline.length]!,
      dx = q[0] - x,
      dz = q[1] - z;
    const t = Math.max(0, Math.min(1, ((p[0] - x) * dx + (p[1] - z) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(p[0] - x - t * dx, p[1] - z - t * dz);
  });
  return Math.min(...distances) * (inside(p, outline) ? 1 : -1);
}

function bake() {
  const map = layout(
    parseMapPage(readFileSync(new URL('../../docs/world/map-prototypes.html', import.meta.url), 'utf8')),
    'sickle',
    'A',
  );
  const round = (v: number) => Math.round(v * 100) / 100;
  const land = (id: string) => {
    const ring = map.land
      .find((l) => l.id === id)!
      .outline.map(([x, z]) => ({ x: round(x + ORIGIN.x), z: round(z + ORIGIN.z) }));
    const centre = {
      x: round(ring.reduce((n, p) => n + p.x, 0) / ring.length),
      z: round(ring.reduce((n, p) => n + p.z, 0) / ring.length),
    };
    const beach = ring.map((a, i) => {
      const b = ring[(i + 1) % ring.length]!,
        dx = b.x - a.x,
        dz = b.z - a.z,
        length = Math.hypot(dx, dz);
      const mx = (a.x + b.x) / 2,
        mz = (a.z + b.z) / 2;
      const outward = Math.sign(dz * (mx - centre.x) - dx * (mz - centre.z));
      const nx = (outward * dz) / length,
        nz = (-outward * dx) / length;
      return {
        x: round(mx + nx * 4),
        z: round(mz + nz * 4),
        yaw: Math.round(Math.atan2(nx, nz) * 1e5) / 1e5,
        w: round(length + 2),
      };
    });
    return { ring, centre, beach: id === 'port-top' ? [] : beach };
  };
  const stop = WORLD_LINES.find((l) => l.id === 'cave')!.stops[1]!;
  const salt = [-580, 580].map((lat) =>
    [-2000, 0, 2000].map((offset) => {
      const p = rowSide('cave', stop + offset, lat, 0, 0);
      return { x: p.x / 100, z: p.z / 100 };
    }),
  );
  return { saltLand: land('salt-land'), portIsle: land('port-isle'), portTop: land('port-top'), salt };
}

function bakedBlocks(write: boolean) {
  const { saltLand, portIsle, portTop, salt } = bake();
  const shore = ({ centre, beach }: typeof saltLand) => ({ centre, beach });
  const outline = ({ centre, ring }: typeof saltLand) => ({ centre, ring });
  const files = [
    [new URL('../../src/content/levels/leg4.ts',import.meta.url), { saltLand: shore(saltLand), portIsle: shore(portIsle), salt }],
    [new URL('../../src/content/prefabs/leg4-lands.ts',import.meta.url), { saltLand: outline(saltLand), portIsle: outline(portIsle), portTop: outline(portTop) }],
  ] as const;
  return files
    .map(([path, data]) => {
      const source = readFileSync(path, 'utf8');
      const block =
        '// <baked>\n// prettier-ignore\nconst shores = ' + JSON.stringify(data, null, 1) + ';\n// </baked>';
      const result = source.replace(/\/\/ <baked>[\s\S]*?\/\/ <\/baked>/, block);
      if (write) writeFileSync(path, result);
      return source.replaceAll('\r\n', '\n') === result.replaceAll('\r\n', '\n');
    })
    .every(Boolean);
}
if (import.meta.main && process.argv.includes('--bake')) bakedBlocks(true);

function coastalReach(check: (message: string, passed: boolean) => void, id: 'saltpan' | 'quay') {
  const defs: unknown = prefabInput;
  validateArtifact(defs);
  const level = loadLevelArtifact(
    JSON.parse(readFileSync(id==='quay'?new URL('../../content/built/levels/quay.json', import.meta.url):new URL('../../content/built/levels/saltpan.json', import.meta.url), 'utf8')),
    defs.prefabs,
  );
  const { colliders } = resolvePlacedColliders(level, defs.prefabs);
  const salt = id === 'saltpan',
    s = salt ? 73900 : 122180;
  const at = (cm: number, lat: number) => {
    const p = rowSide('cave', cm, lat, 0, 0);
    return { x: p.x / 100, z: p.z / 100 };
  };
  const outside = at(s, 580),
    home = at(s, -580);
  const centre = salt ? { x: 550, z: 700 } : { x: 70, z: 970 };
  const n = 451,
    cell = 1,
    h = new Float32Array(n * n).fill(-1.5);
  const ix = (x: number) => Math.round((x - centre.x) / cell) + (n - 1) / 2;
  const iz = (z: number) => Math.round((z - centre.z) / cell) + (n - 1) / 2;
  for (const c of colliders) {
    const tris = c.volume.triangles;
    for (const tri of tris) {
      const pts = [tri.a, tri.b, tri.c];
      const xs = pts.map((p) => ix(p.x)),
        zs = pts.map((p) => iz(p.z));
      for (let i = Math.max(0, Math.min(...xs) - 1); i <= Math.min(n - 1, Math.max(...xs) + 1); i++)
        for (let j = Math.max(0, Math.min(...zs) - 1); j <= Math.min(n - 1, Math.max(...zs) + 1); j++) {
          const y = heightAt([tri], { x: centre.x + (i - (n - 1) / 2) * cell, z: centre.z + (j - (n - 1) / 2) * cell });
          if (y !== null && y > h[i * n + j]!) h[i * n + j] = y;
        }
    }
  }
  const node = (p: { x: number; z: number }) => ix(p.x) * n + iz(p.z);
  const reach = (p: { x: number; z: number }, swim = false) => flood({ n, cell, h }, MOVER, [node(p)], { swim });
  const seen = reach(outside);
  for (const [name, p] of Object.entries(
    salt
      ? { home, flats: { x: 575, z: 720 } }
      : {
          home,
          slab: at(s - 2200, 0),
          apron: at(s, -1600),
          foot: { x: 104, z: 973 },
          head: { x: 10, z: 996 },
          top: { x: 0, z: 1000 },
        },
  ))
    check(id + ' on foot from outward platform to ' + name, !!seen[node(p)]);
  for (const [name, p] of Object.entries(
    salt
      ? { east: { x: 760, z: 700 }, west: { x: 340, z: 700 } }
      : { east: { x: 220, z: 970 }, north: { x: 70, z: 820 } },
  )) {
    check(
      id + ' swimmer from ' + name + ' reaches both platforms',
      h[node(p)]! < 0 && !!reach(p, true)[node(home)] && !!reach(p, true)[node(outside)],
    );
  }
  if (!salt)
    for (const r of (level.analysis as unknown as { reserves: Reserve[] }).reserves) {
      const intruders = colliders.filter((c) => volumesOverlap(c.volume, reserveVolume(r)));
      check('Port Quay ' + r.id + ' reserve clear', intruders.length === 0);
    }
}

export function checkLeg4() {
  const leg = RAIL_LEGS.find((l) => l.id === 'cave')!,
    row = WORLD_LINES.find((l) => l.id === leg.row)!;
  const entries: { message: string; passed: boolean }[] = [];
  const check = (message: string, passed: boolean) => entries.push({ message, passed });
  check('Baked island outlines and Saltpan chords match the map and railway', bakedBlocks(false));
  coastalReach(check, 'saltpan');
  coastalReach(check, 'quay');
  const rack = legRack(leg, 0),
    frame = legFrame(leg, 0);
  const carry = Math.hypot(rack.x - frame.x, rack.z - frame.z) / 100;
  check(`West landing cave rack to plug frame ${carry.toFixed(2)} m`, carry < 7);
  for (const [k, section] of leg.sections.slice(0, -1).entries()) {
    const s = section.toCm - HEAD_BACK_CM;
    const y = rowPoint('cave', s).y;
    check(
      `Cave head ${k + 1} platform level at ${y / 100} m`,
      [-2000, -1000, 1000, 2000].every((offset) => rowPoint('cave', s + offset).y === y),
    );
  }
  const map = layout(
    parseMapPage(readFileSync(new URL('../../docs/world/map-prototypes.html', import.meta.url), 'utf8')),
    'sickle',
    'A',
  );
  for (const [index, isle, minimum] of [
    [1, 'salt-land', 0],
    [2, 'port-isle', 10],
  ] as const) {
    const h = row.halts[index]!,
      outline = map.land.find((l) => l.id === isle)!.outline;
    const distance = shoreDistance([h.x / 100 - ORIGIN.x, h.z / 100 - ORIGIN.z], outline);
    check(`${h.name} stop ${distance.toFixed(2)} m inside the shore`, distance > minimum);
  }
  const crossover = row.ends.find((e) => e.at === 'start')!.sCm / 100;
  const consist = consistOf({ line: leg.line, steel: false, wagon: false });
  const side = 6.5 - (2 + Math.max(...consist.map((c) => c.spec.hx)));
  const trainTop = Math.max(
    ENGINE_CAB.roofTop,
    ENGINE_BOILER.chimney.y,
    ENGINE_BOILER.top,
    ...consist.map((c) => c.spec.top),
  );
  const overhead = 7 - trainTop;
  check(
    `Planned hood over crossover at ${crossover} m: ${side.toFixed(2)} m side, ${overhead.toFixed(3)} m overhead`,
    crossover - 10 >= 45 && crossover + 10 <= 80 && side > 0 && overhead > 0,
  );
  return { level: 'route leg 4 (planned)', entries, failures: entries.filter((e) => !e.passed).length };
}
