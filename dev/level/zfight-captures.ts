// Orchestrates the existing trusted broker; no browser launch or replacement capture harness.
// node dev/level/zfight-captures.ts <classified-report.json>
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import type { checkZfights } from './zfight.ts';
const report = JSON.parse(fs.readFileSync(process.argv[2]!, 'utf8')) as Awaited<ReturnType<typeof checkZfights>>;
fs.mkdirSync('.look/zfight-top-ten', { recursive: true });
const results: { rank: number; status: number | null; manifest: string | null }[] = [];
for (const [index, finding] of report.findings.slice(0, 10).entries()) {
  const rank = index + 1,
    tag = `zfight-ranked-${String(rank).padStart(2, '0')}`;
  const [x, y, z] = finding.position,
    [nx, ny, nz] = finding.normal;
  const cam = ny > 0.7 ? [x + 4, y + 4, z + 5] : ny < -0.7 ? [x + 4, y - 5, z + 5] : [x + nx * 7, y + 2.5, z + nz * 7];
  const setup = `.look/zfight-top-ten/${tag}-setup.ts`,
    action = `.look/zfight-top-ten/${tag}-action.ts`;
  fs.writeFileSync(
    setup,
    `const {putPlayer}=await import('/src/debug/perf-poses.ts'); await putPlayer(${x},${y + 3},${z}); await window.boogle.dev.open('zfight'); window.boogle.dev.close();\nexport {};\n`,
  );
  fs.writeFileSync(
    action,
    `const at=${JSON.stringify(finding.position)}; const result=await window.boogle.dev.run('zfight','scan',{at}); console.log('ZFIGHT_RANK ${rank} '+JSON.stringify(result)); setTimeout(()=>{void window.boogle.dev.run('zfight','clear').catch(console.error)},1200); setTimeout(()=>{void window.boogle.dev.run('zfight','scan',{at}).catch(console.error)},1800);\nexport {};\n`,
  );
  console.log(`Capturing rank ${rank}: ${finding.a} <> ${finding.b}`);
  const result = spawnSync(
    process.execPath,
    [
      '.look/see-client.ts',
      'look',
      '--real',
      '--rail-seed',
      'q6-done',
      '--query',
      'dev=1',
      '--eval',
      setup,
      '--action',
      action,
      '--warm',
      '3',
      '--cam',
      cam.join(','),
      '--look',
      finding.position.join(','),
      '--hud',
      '--name',
      tag,
      '--question',
      `Rank ${rank}: does the scan tint identify the reported contact, and what seam/colour boundary is visible after clearing it?`,
    ],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  );
  fs.writeFileSync(`.look/zfight-top-ten/${tag}.log`, result.stdout + result.stderr);
  const manifest = result.stdout.match(/Evidence: (.+)/)?.[1] ?? null;
  results.push({ rank, status: result.status, manifest });
  fs.writeFileSync('.look/zfight-top-ten/results.json', JSON.stringify(results, null, 2) + '\n');
  console.log(`Rank ${rank}: status ${result.status}, ${manifest ?? 'no manifest'}\n${result.stdout.slice(-1600)}`);
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
