// Review of M3b's lint rules (docs/plans/ecs-migration-railway.md, M3b; the P3s folded into M3c). The view import()
// ban sees every literal path, not only a quoted one; src/net is not one of the places that may run a railway system
// (rule 2). (Its third guard, the check's helper files and the read model's closed importer list, went with the read
// model's last importers in M12b-1.) The review's migration-script findings are listed in the plan's leftovers, not
// tested here: the script is a one-off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lintSafety } from '../dev/lint/safety.ts';

const flagged = (code: string, file: string, rule: string) =>
  lintSafety(code, file).some((d) => d.rule === rule && /M3b/.test(d.message));

test("a view's import() of the railway's check or systems is banned however the path is written", () => {
  const file = 'src/entities/railway/zz-probe.ts';
  for (const code of [
    "export const load = () => import('../../sim/railway-check-line1.ts');",
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
