// M12c's review (branch review/m12c, cut from 54fee05ba): each test below fails on that commit.
//
// 1. boogle/inspect-legacy ignores all of src/entities/railway/, so any railway view may start calling the legacy door
//    unlisted; only state.ts defines it (index.ts mounts it through setRailwayLegacy, a different name).
// 2. The ratchet closes one door of two: railwayRead() in state.ts hands any file the same wide object (the adapter's
//    inspect()), unrestricted, so a D batch can leave the list by switching doors.
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
import { INSPECT_LEGACY_IMPORTERS } from '../dev/lint/policy.ts';
import { createRailwayAdapter, railMovement } from '../src/adapters/railway.ts';
import { createRailwayMirror } from '../src/world/railway-replicate.ts';
import { specOf } from '../src/sim/tune.ts';

// Built at runtime: this file is not on the list, and the rule matches the name inside strings too.
const DOOR = ['inspectRailway', 'Legacy'].join('');
const flagged = (code: string, file: string) => lintSafety(code, file).some((d) => d.rule === 'boogle/inspect-legacy');

test('a railway view may not call the legacy door unlisted: only state.ts defines it', () => {
  const code = `import { ${DOOR} } from './state.ts';\nexport const peek = () => ${DOOR}()?.line2;\n`;
  assert.equal(flagged(code, 'src/entities/railway/zz-probe.ts'), true, 'a new file in the railway entity');
  assert.equal(flagged(code, 'src/entities/railway/train-view.ts'), true, 'an existing railway view');
});

test('an unlisted tool cannot take the wide object through the other door, railwayRead()', () => {
  const code =
    "const { railwayRead } = (await import('/src/entities/railway/state.ts' as string)) as typeof import('../../../src/entities/railway/state.ts');\n" +
    'console.log(railwayRead()?.line2.completed);\nexport {};\n';
  const d = lintSafety(code, 'dev/look/evals/zz-probe.ts');
  assert.ok(d.length > 0, 'railwayRead() is the same wide object as the legacy door and is not held by any rule');
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
  assert.equal(adapter.inspect().prediction.log.length, 0, 'a tool wrote the adapter log');
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

// Passes on 54fee05ba; the guard the list's "only loses lines" lacks: a converted file must leave the list with the
// name, or it keeps the door open for its next edit.
test('every file on INSPECT_LEGACY_IMPORTERS still names the door', () => {
  const stale = INSPECT_LEGACY_IMPORTERS.filter((f) => !fs.readFileSync(f, 'utf8').includes(DOOR));
  assert.deepEqual(stale, []);
});
