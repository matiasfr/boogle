// Meter raw capture derivatives without modifying the evidence. FFmpeg owns BS.1770, not a new JS meter.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export function analyze(directory: string) {
  const rows = fs
    .readdirSync(directory)
    .filter((f) => f.endsWith('.wav'))
    .map((wav) => {
      const run = spawnSync(
        'ffmpeg',
        [
          '-hide_banner',
          '-nostats',
          '-i',
          path.join(directory, wav),
          '-af',
          'loudnorm=print_format=json',
          '-f',
          'null',
          '-',
        ],
        { encoding: 'utf8' },
      );
      fs.writeFileSync(path.join(directory, wav.replace('.wav', '.meter.txt')), run.stderr);
      if (run.status !== 0) throw new Error(`FFmpeg failed for ${wav}: ${run.stderr.slice(-600)}`);
      const match = run.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
      if (!match) throw new Error(`No loudness result for ${wav}`);
      const meter = JSON.parse(match[0]) as Record<string, string>;
      const finite = (key: string) => (Number.isFinite(Number(meter[key])) ? Number(meter[key]) : null);
      return {
        id: wav.slice(0, -4),
        wav,
        integratedLUFS: finite('input_i'),
        truePeakDbTP: finite('input_tp'),
        lraLU: finite('input_lra'),
        reason: finite('input_i') === null ? 'Below integrated loudness gate; use source peak/RMS.' : null,
      };
    });
  fs.writeFileSync(path.join(directory, 'metrics.json'), JSON.stringify(rows, null, 2) + '\n');
  fs.writeFileSync(
    path.join(directory, 'measurements.md'),
    [
      '# Raw audio measurements',
      '',
      'FFmpeg loudnorm input metrics on full, unnormalized float WAV windows. Short-hit LUFS is diagnostic, not a normalization target. No device audition.',
      '',
      '| Cue | I LUFS | True peak dBTP | LRA LU |',
      '| --- | ---: | ---: | ---: |',
      ...rows.map(
        (r) => `| ${r.id} | ${r.integratedLUFS ?? 'N/A'} | ${r.truePeakDbTP ?? 'N/A'} | ${r.lraLU ?? 'N/A'} |`,
      ),
      '',
    ].join('\n'),
  );
  return rows;
}
