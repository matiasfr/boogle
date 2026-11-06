// Meter raw capture derivatives without modifying the evidence. FFmpeg owns BS.1770, not a new JS meter.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Our capture format is explicitly float32 WAV, with no header-dependent conversion or peak clamping.
function samples(file: string) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 8, 12) !== 'WAVE' || b.readUInt16LE(20) !== 3 || b.readUInt16LE(34) !== 32)
    throw new Error(`Expected raw float32 WAV: ${file}`);
  const channels = b.readUInt16LE(22),
    sr = b.readUInt32LE(24),
    frames = b.readUInt32LE(40) / (4 * channels);
  let peak = 0,
    sum = 0,
    nonfinite = 0,
    overs = 0,
    first = frames,
    last = -1;
  for (let f = 0; f < frames; f++)
    for (let c = 0; c < channels; c++) {
      const v = b.readFloatLE(44 + (f * channels + c) * 4);
      if (!Number.isFinite(v)) {
        nonfinite++;
        continue;
      }
      peak = Math.max(peak, Math.abs(v));
      sum += v * v;
      if (Math.abs(v) > 1) overs++;
      if (Math.abs(v) > 1e-5) {
        first = Math.min(first, f);
        last = f;
      }
    }
  const windowFrames = Math.min(Math.round(sr * 0.1), frames - first);
  let onsetEnergy = 0;
  for (let f = first; f < first + windowFrames; f++)
    for (let c = 0; c < channels; c++) {
      const v = b.readFloatLE(44 + (f * channels + c) * 4);
      onsetEnergy += Number.isFinite(v) ? v * v : 0;
    }
  const db = (v: number) => (v > 0 ? 20 * Math.log10(v) : null);
  return {
    sha256: createHash('sha256').update(b).digest('hex'),
    sampleRate: sr,
    channels,
    seconds: frames / sr,
    activeSeconds: Math.max(0, last - first + 1) / sr,
    onsetSeconds: first < frames ? first / sr : null,
    activeThresholdDbFS: -100,
    samplePeakDbFS: db(peak),
    rmsWindowDbFS: db(Math.sqrt(sum / (frames * channels))),
    rms100DbFS: windowFrames ? db(Math.sqrt(onsetEnergy / (windowFrames * channels))) : null,
    rms100WindowSeconds: windowFrames / sr,
    nonfinite,
    finiteSamples: frames * channels - nonfinite,
    overs,
  };
}

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
        ...samples(path.join(directory, wav)),
        integratedLUFS: finite('input_i'),
        truePeakDbTP: finite('input_tp'),
        lraLU: finite('input_lra'),
        reason: finite('input_i') === null ? 'Below integrated loudness gate; use source peak/RMS.' : null,
      };
    });
  fs.writeFileSync(path.join(directory, 'metrics.json'), JSON.stringify(rows, null, 2) + '\n');
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const cue = row.id.replace(/-s\d+$/, '');
    if (!groups.has(cue)) groups.set(cue, []);
    groups.get(cue)!.push(row);
  }
  const stats = (values: (number | null)[]) => {
    const a = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
    return a.length ? { min: a[0], median: a[Math.floor(a.length / 2)], max: a.at(-1) } : null;
  };
  const ranges = Array.from(groups, ([cue, takes]) => ({
    cue,
    takes: takes.length,
    peak: stats(takes.map((t) => t.samplePeakDbFS)),
    rms100: stats(takes.map((t) => t.rms100DbFS)),
    integrated: stats(takes.map((t) => t.integratedLUFS)),
    truePeak: stats(takes.map((t) => t.truePeakDbTP)),
  }));
  fs.writeFileSync(path.join(directory, 'ranges.json'), JSON.stringify(ranges, null, 2) + '\n');
  fs.writeFileSync(
    path.join(directory, 'meter-tool.json'),
    JSON.stringify(
      {
        ffmpeg: spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' }).stdout.split('\n')[0],
        format: 'IEEE float32 WAV; complete windows; no gain change',
        integrated: 'FFmpeg loudnorm input (BS.1770)',
        rms100: '100 ms starting at first sample above -100dBFS; no zero padding',
      },
      null,
      2,
    ) + '\n',
  );
  fs.writeFileSync(
    path.join(directory, 'measurements.md'),
    [
      '# Raw audio measurements',
      '',
      'FFmpeg loudnorm input metrics on full, unnormalized float WAV windows. Short-hit LUFS is diagnostic, not a normalization target. No device audition.',
      '',
      '| Cue | I LUFS | True peak dBTP | Sample peak dBFS | Onset RMS100 dBFS |',
      '| --- | ---: | ---: | ---: | ---: |',
      ...rows.map(
        (r) =>
          `| ${r.id} | ${r.integratedLUFS ?? 'N/A'} | ${r.truePeakDbTP ?? 'N/A'} | ${r.samplePeakDbFS?.toFixed(2) ?? 'N/A'} | ${r.rms100DbFS?.toFixed(2) ?? 'N/A'} |`,
      ),
      '',
    ].join('\n'),
  );
  return rows;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const directories = process.argv.slice(2);
  if (!directories.length) throw new Error('Usage: npm run audio:analyze -- <raw-directory> [...]');
  for (const directory of directories) analyze(path.resolve(directory));
}
