// Where Home's heightfield shows rock (docs/plans/cliff-kit-everywhere.md, the census): the walls of
// dev/ground/cliff-walls.ts as a table. Plain Node, no browser, no game code changed.
//   node dev/ground/cliff-census.ts            the table
//   node dev/ground/cliff-census.ts --json     the walls as JSON (.look/cliff-census.json too)
//   node dev/ground/cliff-census.ts --min 40   only walls of at least 40 vertices (default 25, 100 m²)
//   node dev/ground/cliff-census.ts --anchors  also trial a 6 m face every ANCHOR_SPACING m along each wall's seen toe,
//                                              against the cliff kit's own piece rules (dev/prefab/cliff-kit.ts
//                                              kitPieceProblems, as level-check runs them) and 6 m from the rails'
//                                              centre lines; .look/cliff-anchors.json
import fs from 'node:fs';
import { NX, NZ, at, heights } from '../../src/place/terrain.ts';
import type { Placement } from '../../src/prefab/types.ts';
import { SEEN, censusWalls, dressed } from './cliff-walls.ts';

const argv = process.argv.slice(2);
const MIN = argv.includes('--min') ? Number(argv[argv.indexOf('--min') + 1]) : 25;
const { walls, toes, views, nearest } = censusWalls(MIN);

if (argv.includes('--json')) console.log(JSON.stringify(walls, null, 1));
else {
  const total = walls.reduce((s, w) => s + w.vertices, 0);
  console.log(`Home heightfield rock: ${walls.length} walls of ${MIN}+ vertices, ${total} vertices, ${total * 4} m²`);
  console.log(
    'id  name                          vertices  Place-local box (x0..x1, z0..z1)    y (min..max)   gorge  path shore rail sea (m)  toe/seen/dressed rim/seen (m)',
  );
  for (const w of walls)
    console.log(
      [
        String(w.id).padEnd(3),
        w.name.padEnd(30),
        String(w.vertices).padStart(7),
        `  (${w.box.x0}..${w.box.x1}, ${w.box.z0}..${w.box.z1})`.padEnd(36),
        `${w.y[0]}..${w.y[1]}`.padEnd(14),
        (w.inGorge ? 'yes' : 'no').padEnd(6),
        ...(['path', 'shore', 'rail', 'sea'] as const).map((v) => String(w.nearest[v]).padStart(5)),
        `  ${w.edge.toe}/${w.edge.toeSeen}/${w.edge.toeDressed}`.padEnd(18),
        `${w.edge.rim}/${w.edge.rimSeen}`,
      ].join(' '),
    );
}
fs.mkdirSync('.look', { recursive: true });
fs.writeFileSync('.look/cliff-census.json', JSON.stringify(walls, null, 1));

// Trial anchors: not a kit, only where one would stand and what it would break today. A 6 m face at the toe, sunk 0.5 m,
// turned to face downhill (+z out of the wall, as src/content/prefabs/terrain.ts has it), is checked by the kit's piece
// rules and against every rail's centre line (RAIL_CLEAR m from the face's footprint centre).
if (argv.includes('--anchors')) {
  const { kitPieceProblems } = await import('../prefab/cliff-kit.ts');
  const ANCHOR_SPACING = 8,
    RAIL_CLEAR = 6;
  const out: {
    wall: number;
    name: string;
    tried: number;
    clean: number;
    problems: Record<string, number>;
    anchors: unknown[];
  }[] = [];
  for (const wall of walls) {
    const picked: [number, number][] = [];
    const anchors: unknown[] = [];
    const problems: Record<string, number> = {};
    for (const { k, x, z } of (toes.get(wall) ?? []).filter((c) => dressed(c, SEEN))) {
      const i = k % NX,
        j = (k - i) / NX;
      if (picked.some(([px, pz]) => Math.hypot(px - x, pz - z) < ANCHOR_SPACING)) continue;
      picked.push([x, z]);
      const h = (a: number, b: number) =>
        heights[at(Math.max(0, Math.min(NX - 1, a)), Math.max(0, Math.min(NZ - 1, b)))]!;
      const gx = h(i + 1, j) - h(i - 1, j),
        gz = h(i, j + 1) - h(i, j - 1);
      const yaw = Math.atan2(-gx, -gz);
      const p: Placement = {
        id: `trial.${wall.id}.${anchors.length}`,
        prefab: 'terrain.face-6',
        pos: [x, heights[k]! - 0.5, z],
        rot: [yaw, 0, 0],
      };
      const found: string[] = [
        ...new Set(
          kitPieceProblems(p).map((m) =>
            m.includes('narrows the tread') ? 'tread' : m.includes('gauge') ? 'rail gauge' : 'gated place',
          ),
        ),
      ];
      if (nearest(views.rail, x, z) < RAIL_CLEAR) found.push('rail');
      for (const f of found) problems[f] = (problems[f] ?? 0) + 1;
      anchors.push({
        pos: p.pos.map((n) => Math.round(n * 10) / 10),
        yaw: Math.round(yaw * 100) / 100,
        problems: found,
      });
    }
    out.push({
      wall: wall.id,
      name: wall.name,
      tried: anchors.length,
      clean: anchors.filter((a) => !(a as { problems: string[] }).problems.length).length,
      problems,
      anchors,
    });
  }
  console.log(`\nTrial 6 m faces along each seen toe, every ${ANCHOR_SPACING} m:`);
  for (const w of out)
    console.log(
      `${String(w.wall).padEnd(3)} ${w.name.padEnd(30)} ${String(w.tried).padStart(4)} tried ${String(w.clean).padStart(4)} clean  ${JSON.stringify(w.problems)}`,
    );
  fs.writeFileSync('.look/cliff-anchors.json', JSON.stringify(out, null, 1));
}
