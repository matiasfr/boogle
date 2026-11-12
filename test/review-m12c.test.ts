// M12c's review (branch review/m12c, cut from 54fee05ba): each test below fails on that commit.
//
// 1. (Closed by M12e: the legacy door, its list and its rule are deleted with inspect(). What stands in for them is
//    boogle/retired-railway-names: no file under src/ exports the old names again.)
// 2. (Closed by M12d: the second door, railwayRead(), is deleted with its list and rule.)
// 3. read.debug().prediction is the adapter's live counters: a tool that writes to it, or holds it and compares later,
//    changes or sees the session's own stats.
// 4. A tool that casts inspectRailway() past the typecheck still reads fields the narrow inspection no longer holds
//    (railway-leaf-act.ts reads `ring`, the census's "no dev/ file reads ring"); typecheck cannot name it, so it reads
//    undefined in silence.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { lintSafety } from '../dev/lint/safety.ts';
import { createRailwayAdapter } from '../src/adapters/railway-session.ts';
import { railMovement } from '../src/adapters/railway-read.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { specOf } from '../src/sim/tune.ts';

const flagged = (code: string, file: string) =>
  lintSafety(code, file).some((d) => d.rule === 'boogle/retired-railway-names');

test('no file under src/ exports a retired railway name (M12e)', () => {
  const at = 'src/adapters/zz-probe.ts';
  assert.equal(flagged('export type RailwayInspection = { carry: number };\n', at), true, 'a type');
  assert.equal(flagged('export function buildState() {\n  return 0;\n}\n', at), true, 'a function');
  assert.equal(flagged('export const validateRailWorks = () => true;\n', at), true, 'a const, by prefix');
  assert.equal(flagged('const railwayView = 1;\nexport { railwayView };\n', at), true, 'a specifier');
  assert.equal(flagged('const x = 1;\nexport { x as Railway };\n', at), true, 'a renamed specifier');
  assert.equal(flagged('export type RailwayMovement = { a: number };\n', at), false, 'a name that only starts alike');
  assert.equal(flagged('export type RailwayInspection = number;\n', 'test/zz-probe.ts'), false, 'outside src/');
});

test('read.debug().prediction is detached: writing to it does not change the session counters', () => {
  const adapter = createRailwayAdapter({
    mirror: createRailwayMirror(),
    movement: () => railMovement({ get: (k) => specOf(k)!.def }),
    pid: 'a',
    pose: () => ({ x: 0, y: 0, z: 0 }),
    now: () => 0,
  });
  const held = adapter.read.debug().prediction;
  const corrected = held.corrected;
  held.corrected += 5;
  held.log.push({ request: 0, op: 'probe', lost: 0, reason: 'probe' });
  assert.equal(adapter.read.debug().prediction.corrected, corrected, 'a tool wrote the adapter counter');
  assert.equal(adapter.read.debug().prediction.log.length, 0, 'a tool wrote the adapter log');
});

// The narrow inspection's keys (docs/plans/ecs-m12-m13.md, section 2): the session's 13 scalars and the scene walk.
const NARROW = new Set([
  ...['pid', 'status', 'ready', 'pending', 'stalled', 'tick', 'connected', 'synced', 'step', 'hash', 'epoch', 'next'],
  'prediction',
  ...['owned', 'head', 'targetHead', 'panelCursor', 'machineSetback', 'station', 'machine', 'trees', 'pathOpen'],
  ...['line2View', 'reward', 'hookShot', 'glider', 'worksView', 'crossingView'],
]);
/** The top-level keys of the type literal starting at `from` (its `{`). */
function keysAt(text: string, from: number) {
  const keys: string[] = [];
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') {
      if (--depth === 0) break;
    } else if (depth === 1 && /[A-Za-z_]/.test(c!) && /[{;,\s]/.test(text[i - 1]!)) {
      const m = /^([A-Za-z_$][\w$]*)\??\s*:/.exec(text.slice(i));
      if (m) {
        keys.push(m[1]!);
        i += m[0].length - 1;
      }
    }
  }
  return keys;
}
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
}

test('no tool casts inspectRailway() to read a field the narrow inspection no longer holds', () => {
  const missed: string[] = [];
  for (const file of files('dev')) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(/inspectRailway\(\)\s+as\s+unknown\s+as\s+(\{|([A-Z]\w*))/g)) {
      let at = m.index + m[0].length - 1;
      if (m[2]) {
        const alias = new RegExp(`type ${m[2]} = \\{`).exec(text);
        if (!alias) continue;
        at = alias.index + alias[0].length - 1;
      }
      for (const key of keysAt(text, at)) if (!NARROW.has(key)) missed.push(`${file}: ${key}`);
    }
  }
  assert.deepEqual(missed, []);
});
