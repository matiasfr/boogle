// Every station the railway views seat something at can be seated (11 November 2026: world v27 appended Q7, whose
// reward box crates-view.ts seated through Place's LINKS, which stop at Q6; createStationBoxes threw at startup, the
// lobby said "Can't draw the island", and lint, unit, net, build and the live smoke all passed).
// The views need a DOM at import, so this runs their source, as dev/level/grounding-props.ts does: STATION_BOXES as
// written, rewardSeat as written, and the very expression createStationBoxes seats each box with, bound to the same
// layout functions (place/land.ts and rail-kit.ts re-export terrain.ts's H and line-geometry.ts's besideLine).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { parseSync } from 'oxc-parser';
import * as THREE from 'three/webgpu';
import { sourceTextFunction } from '../dev/level/source.ts';
import { LINKS, railY } from '../src/place/layout.ts';
import { H } from '../src/place/terrain.ts';
import { OUT } from '../src/place/spatial-station.ts';
import { besideLine } from '../src/entities/railway/line-geometry.ts';
import { LINE1_STATIONS } from '../src/sim/railway-line-layout.ts';
import { LINE2_STATIONS } from '../src/sim/railway-line2-layout.ts';

const CRATES = 'src/entities/railway/crates-view.ts';
const crates = fs.readFileSync(CRATES, 'utf8');
type Node = { type: string; start: number; end: number; [k: string]: unknown };
const program = parseSync(CRATES, crates).program as unknown as { body: Node[] };

function* walk(node: unknown): Generator<Node> {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) yield* walk(n);
    return;
  }
  const n = node as Node;
  if (typeof n.type === 'string') yield n;
  for (const [key, value] of Object.entries(n)) if (key !== 'parent') yield* walk(value);
}

/** crates-view.ts's static imports by local name, so the source run below can use any Node-safe one it names. */
const imports = new Map<string, { from: string; imported: string | null }>();
for (const node of program.body) {
  if (node.type !== 'ImportDeclaration' || node.importKind === 'type') continue;
  const from = (node.source as { value: string }).value;
  for (const s of node.specifiers as { type: string; local: { name: string }; imported?: { name: string } }[])
    imports.set(s.local.name, {
      from,
      imported: s.type === 'ImportNamespaceSpecifier' ? null : (s.imported?.name ?? 'default'),
    });
}
async function importsNamedIn(js: string, bound: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [name, { from, imported }] of imports) {
    if (name in bound || !new RegExp(`\\b${name}\\b`).test(js)) continue;
    const mod = (await import(
      from.startsWith('.') ? new URL(from, new URL(`../${CRATES}`, import.meta.url)).href : from
    )) as Record<string, unknown>;
    out[name] = imported === null ? mod : mod[imported];
  }
  return out;
}

/** The expression createStationBoxes gives each box's `at`, as it stands in the source. */
function seatExpression() {
  const mount = program.body
    .map((n) => (n.type === 'ExportNamedDeclaration' ? (n.declaration as Node) : n))
    .find((n) => n?.type === 'FunctionDeclaration' && (n.id as { name: string }).name === 'createStationBoxes');
  assert.ok(mount, `${CRATES} has createStationBoxes`);
  const seats = [...walk(mount)].filter(
    (n) =>
      n.type === 'VariableDeclarator' &&
      (n.id as { name?: string }).name === 'at' &&
      crates.slice((n.init as Node).start, (n.init as Node).end).includes('rewardSeat'),
  );
  assert.equal(seats.length, 1, 'createStationBoxes seats its boxes in one `const at = ...rewardSeat(...)`');
  const init = seats[0]!.init as Node;
  return `${stripTypeScriptTypes(`const at = ${crates.slice(init.start, init.end)};`)}\nreturn at;`;
}
/** A top-level declaration's source, for finding which imports it uses. */
function declaration(name: string) {
  const node = program.body.find((n) => crates.slice(n.start, n.end).match(new RegExp(`^(export )?const ${name}\\b`)));
  assert.ok(node, `${CRATES} declares ${name}`);
  return crates.slice(node.start, node.end);
}

test("every station box createStationBoxes mounts gets a seat (the boot's own seat expression)", async () => {
  const STATION_BOXES = sourceTextFunction<{ id: string; line: 0 | 1; station: number }[]>(
    crates,
    'STATION_BOXES',
    await importsNamedIn(declaration('STATION_BOXES'), {}),
  );
  const rewardSeat = sourceTextFunction<(...args: unknown[]) => THREE.Vector3>(
    fs.readFileSync('src/entities/railway/reward.ts', 'utf8'),
    'rewardSeat',
    { THREE },
  );
  // What the mount destructures from its dynamic imports, and the rewardSeat it is handed.
  const locals = { LINKS, railY, H, besideLine, OUT, rewardSeat, THREE };
  const js = seatExpression();
  const bindings = { ...locals, ...(await importsNamedIn(js, locals)) };
  const seat = new Function('spec', ...Object.keys(bindings), js) as (spec: unknown, ...v: unknown[]) => THREE.Vector3;
  const crating = [...LINE1_STATIONS, ...LINE2_STATIONS].filter((s) => s.crate).length;
  assert.equal(STATION_BOXES.length, crating - 2, 'a box for every crate station after the hat and the scarf');
  for (const spec of STATION_BOXES) {
    let at: THREE.Vector3;
    try {
      at = seat(spec, ...Object.values(bindings));
    } catch (error) {
      assert.fail(
        `${spec.id} (line ${spec.line + 1}, station ${spec.station}): the boot's seat throws: ${String(error)}`,
      );
    }
    assert.ok([at.x, at.y, at.z].every(Number.isFinite), `${spec.id} seats at a finite point: ${at.toArray()}`);
  }
});

// Stations the views seat without a Place LINKS row. A station added to the sim catalog needs a row in Place's layout
// (src/place/layout.ts) or an entry here, once every view that indexes LINKS[line].stations by number handles it.
const OFF_PLACE = new Set(['Q7']); // v27: Q7 stands on the Pier's piled deck (ring-island-build1 R4a)

test("every sim station has a Place layout row the views can index by number, or is seated off Place's", () => {
  for (const [line, stations] of [LINE1_STATIONS, LINE2_STATIONS].entries()) {
    const place = LINKS[line]!.stations;
    stations.forEach((s, k) => {
      if (OFF_PLACE.has(s.id)) return;
      assert.equal(place[k]?.id, s.id, `line ${line + 1} station ${k} (${s.id}) has LINKS[${line}].stations[${k}]`);
    });
  }
});
