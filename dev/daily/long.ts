// The daily long job's reading of a playthrough (dev/look/playthrough.ts --long): its verdict, total game time, the
// production route's checkpoints with the game time each was first reached, and the bot's last lines and errors.
// dev/daily/run.ts owns delivery (worktree, lock, bot slot, GitHub).
import fs from 'node:fs';
import path from 'node:path';
import { RAIL_STOPS } from '../look/segments.ts';

type Verdict = { verdict: string; wall?: number; game?: number; error?: string };

/** The lines of one report section: from its heading to the next blank line. */
function section(lines: string[], heading: string) {
  const at = lines.findIndex((l) => l.startsWith(heading));
  if (at < 0) return [];
  const end = lines.findIndex((l, i) => i > at && l === '');
  return lines.slice(at + 1, end < 0 ? undefined : end);
}

/** Each RAIL_STOPS checkpoint and the game time of its first beat (`  27:17  +1 s       hook taken x2`), if reached. */
export function checkpoints(report: string) {
  const beats = section(report.split('\n'), 'Beats (');
  return Object.entries(RAIL_STOPS).map(([stop, label]) => {
    const line = beats.find((l) => l.replace(/ x\d+$/, '').endsWith(' ' + label));
    return { stop, label, at: line?.trim().split(/\s+/)[0] ?? null };
  });
}

export function longReport(run: string, { base, dir }: { base: string; dir: string }) {
  const read = (file: string) =>
    fs.existsSync(path.join(run, file)) ? fs.readFileSync(path.join(run, file), 'utf8') : '';
  const verdict: Verdict = JSON.parse(read('verdict.json') || '{"verdict":"no verdict.json"}');
  const report = read('report.txt');
  const lines = report.split('\n');
  const head = lines.slice(
    0,
    Math.max(
      0,
      lines.findIndex((l) => l.startsWith('Beats (')),
    ),
  );
  const stops = checkpoints(report);
  const reached = stops.filter((s) => s.at);
  const minutes = typeof verdict.game === 'number' ? (verdict.game / 60).toFixed(1) : '?';
  const passed = verdict.verdict === 'pass';
  const body = [
    `Nightly long playthrough ${passed ? 'passed' : `failed (${verdict.verdict})`} on ${base}: \`npm run playthrough -- --long --stall 6000\`, ` +
      `${minutes} game-minutes in ${typeof verdict.wall === 'number' ? Math.round(verdict.wall / 60) + ' wall minutes' : '?'}; ` +
      `${reached.length} of ${stops.length} checkpoints reached.`,
    '',
    ...(verdict.error ? ['```', verdict.error.slice(0, 800), '```', ''] : []),
    ...(head.filter(Boolean).length ? ['```', ...head.filter(Boolean).slice(0, 12), '```', ''] : []),
    '| checkpoint | beat | first reached (game time) |',
    '| --- | --- | --- |',
    ...stops.map((s) => `| ${s.stop} | ${s.label} | ${s.at ?? 'not reached'} |`),
    '',
    ...["The bot's last lines:", 'Errors ('].flatMap((h) => {
      const part = section(lines, h);
      return part.length
        ? [
            `<details><summary>${h.replace(/[:(]$/, '').trim()}</summary>`,
            '',
            '```',
            ...part.slice(0, 12),
            '```',
            '</details>',
            '',
          ]
        : [];
    }),
    `Mac run: ${dir} (report.txt, verdict.json, bot.txt and the end still under playthrough/long/).`,
  ];
  return { passed, verdict: verdict.verdict, gameMinutes: minutes, checkpoints: stops, body: body.join('\n') + '\n' };
}
