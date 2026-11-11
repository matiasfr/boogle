// Review of M3b's lint rules (docs/plans/ecs-migration-railway.md, M3b; the P3s folded into M3c). The view import()
// ban sees every literal path, not only a quoted one; src/net is not one of the places that may run a railway system
// (rule 2); and the check's helper files are not a way around the read model's closed importer list (rule 5). The
// review's migration-script findings are listed in the plan's leftovers, not tested here: the script is a one-off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lintSafety } from '../dev/lint/safety.ts';

const flagged = (code: string, file: string, rule: string) =>
  lintSafety(code, file).some((d) => d.rule === rule && /M3b/.test(d.message));

test("a view's import() of the railway's check, read model or systems is banned however the path is written", () => {
  const file = 'src/entities/railway/zz-probe.ts';
  for (const code of [
    "export const load = () => import('../../sim/railway-read-model.ts');",
    'export const load = () => import(`../../sim/railway-check.ts`);',
    "export const load = () => import('/src/sim/railway-sys-works.ts' as string);",
  ])
    assert.ok(flagged(code, file, 'no-restricted-syntax'), `not flagged: ${code}`);
});

test('src/net does not import a railway system file (rule 2: src/sim, src/world, server, test and dev only)', () => {
  for (const code of [
    "import { railTick } from '../sim/railway-systems.ts';\nvoid railTick;\n",
    "import { railSettle } from '../sim/railway-sys-core.ts';\nvoid railSettle;\n",
  ])
    assert.ok(flagged(code, 'src/net/zz-probe.ts', 'no-restricted-imports'), `not flagged: ${code}`);
  assert.ok(
    !flagged(
      "import { railTick } from '../sim/railway-systems.ts';\nvoid railTick;\n",
      'src/world/zz-probe.ts',
      'no-restricted-imports',
    ),
    'src/world may still run the systems',
  );
});

test("the check's own files (M8b's railway-check-*.ts) do not import the read model; railway-check.ts still may", () => {
  const code = "import { railwayView } from './railway-read-model.ts';\nvoid railwayView;\n";
  assert.ok(flagged(code, 'src/sim/railway-check-line2.ts', 'no-restricted-imports'), 'railway-check-*.ts not flagged');
  assert.ok(!flagged(code, 'src/sim/railway-check.ts', 'no-restricted-imports'), 'railway-check.ts is on the list');
});
