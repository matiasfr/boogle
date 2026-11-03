// npm run playtest                       recent sessions on the server, newest first
// npm run playtest -- latest             download the newest session (and whoever played in its room at the same time)
// npm run playtest -- <id or tail>       the same for one session; prints a summary, keeps it all in .look/playtest/
// npm run playtest -- --compare <a> <b>  two sessions side by side
//   --all     in the list and `latest`, include automated browsers (the look and scenario harnesses)
//   --solo    only this session, not its room-mates
//   --no-map  skip the heat map (it starts headless Chromium for a second)
// What's recorded: src/proto/playdata/record.ts. The server: server/src/playdata.ts. Token: scripts/report-token.ts.
// Server: BOOGLE_SERVER if set, else the production server.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, reportToken } from '../../scripts/report-token.ts';
import type { PlaySession } from '../../server/src/playdata.ts';
import { sketchOf } from './beats.ts';
import { writeHeatMap } from './heat.ts';
import { parseSession, span, str, type Session } from './read.ts';
import { compare, summarize } from './summary.ts';

const SERVER = process.env.BOOGLE_SERVER || 'https://boogle-server.fly.dev';
const OUT = path.join(ROOT, '.look/playtest');
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
};
const all = flag('--all');
const solo = flag('--solo');
const noMap = flag('--no-map');
const comparing = flag('--compare');

const token = reportToken();
if (!token) {
  console.error('No REPORT_TOKEN: set it in the environment or as REPORT_TOKEN=... in .env.local (the Fly secret).');
  process.exit(1);
}
const headers = { authorization: `Bearer ${token}` };

async function get(p: string) {
  const r = await fetch(`${SERVER}${p}`, { headers });
  if (r.status === 401) throw new Error('the server refused the token (401)');
  if (!r.ok) throw new Error(`GET ${p}: ${r.status}`);
  return r;
}
const listSessions = async (): Promise<PlaySession[]> =>
  (await get('/playdata?limit=200')).json() as Promise<PlaySession[]>;
const isPerson = (s: PlaySession) => all || !s.meta?.bot;

async function download(id: string): Promise<Session> {
  const text = await (await get(`/playdata/${id}`)).text();
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${id}.jsonl`), text);
  return parseSession(id, text);
}

function resolve(list: PlaySession[], want: string) {
  if (want === 'latest') {
    const hit = list.find(isPerson);
    if (!hit) throw new Error('no sessions yet');
    return hit;
  }
  const hit = list.find((s) => s.id === want) ?? list.find((s) => s.id.endsWith(want) || s.id.startsWith(want));
  if (!hit) throw new Error(`no session like "${want}" among the newest ${list.length}`);
  return hit;
}

function printList(list: PlaySession[]) {
  const rows = list.filter(isPerson).slice(0, 25);
  if (!rows.length) return console.log('No sessions yet.');
  for (const s of rows) {
    const when = s.first.slice(0, 16).replace('T', ' ');
    const secs = (Date.parse(s.last) - Date.parse(s.first)) / 1000;
    const m = s.meta ?? {};
    console.log(
      [
        s.id.padEnd(24),
        when,
        (s.card || '?').padEnd(10),
        (str(m.name) || '?').padEnd(12),
        (str(m.device) || '?').padEnd(8),
        span(secs).padEnd(11),
        `${Math.round(s.bytes / 1024)} KB`,
        str(m.room),
      ].join('  '),
    );
  }
}

try {
  const list = await listSessions();
  if (comparing) {
    const [a, b] = args;
    if (!a || !b) throw new Error('--compare needs two sessions');
    const left = await download(resolve(list, a).id);
    const right = await download(resolve(list, b).id);
    console.log(compare(left, right).join('\n'));
  } else if (!args[0]) {
    printList(list);
  } else {
    const row = resolve(list, args[0]);
    const session = await download(row.id);
    // Others in the same room at the same time.
    const mates: Session[] = [];
    if (!solo && str(row.meta?.room))
      for (const o of list) {
        if (o.id === row.id || str(o.meta?.room) !== str(row.meta?.room)) continue;
        if (Date.parse(o.first) > session.end || Date.parse(o.last) < session.start) continue;
        mates.push(await download(o.id));
      }
    const sketch = await sketchOf(session.card);
    const places = sketch?.places ?? [];
    const lines = summarize(session, mates, places);
    for (const m of mates) lines.push('', ...summarize(m, [], places));
    const text = lines.join('\n');
    console.log(text);
    fs.writeFileSync(path.join(OUT, `${row.id}.txt`), text + '\n');
    if (!noMap) {
      const png = await writeHeatMap(path.join(OUT, `${row.id}.png`), [session, ...mates], sketch, ROOT);
      if (png) console.log(`\nHeat map: ${png}`);
    }
    console.log(`Saved in ${OUT}`);
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
