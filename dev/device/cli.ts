// Remote device tests (docs/plans/remote-device-tests.md), the Mac's side: it makes a link, lists the runs a device
// uploaded and turns one into a report. The device does the measuring; this reads a few kilobytes of JSON.
//
//   npm run device -- new [--suite quick] [--label "iphone 15"] [--query 'terrain=1&home=b'] [--site <origin>]
//       prints the link to open on the device; writes .look/device/<id>/run.json (the id is the upload token)
//   npm run device -- list
//       the device runs on the server, newest first: code, label, device, build, state, pulled or not
//   npm run device -- pull <run id or its last six characters>      one run -> .look/device/<id>/
//   npm run device -- pull --new                                     every run not yet pulled
//   The board link `https://boogle.club/?device=new` needs no command: the page makes its own id (self-minted).
//
// Reads need REPORT_TOKEN (scripts/report-token.ts), like `npm run playtest`; the device never has it. Server:
// BOOGLE_SERVER if set, else production. A pull writes session.jsonl, result.json (typed) and report.md.
import fs from 'node:fs';
import path from 'node:path';
import { cleanText } from '../../server/src/clean-text.ts';
import { ROOT } from '../../scripts/report-token.ts';
import { cleanLabel, makeRunId, SUITE_NAMES, shortCode } from '../../src/debug/device/id.ts';
import { OUT as PLAYTEST_OUT, playdata, resolveSession } from '../playtest/fetch.ts';
import { parseSession, str } from '../playtest/read.ts';
import { readDevice } from './read.ts';
import { pasteLine, report } from './report.ts';

const OUT = path.join(ROOT, '.look/device');
const SITE = 'https://boogle.club';
const args = process.argv.slice(2);
const cmd = args.shift();

function flag(name: string): boolean {
  const i = args.indexOf(name);
  if (i < 0) return false;
  args.splice(i, 1);
  return true;
}
function option(name: string): string | undefined {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`${name} needs a value`);
  args.splice(i, 2);
  return v;
}
const dirOf = (id: string) => path.join(OUT, id);
const pulled = (id: string) => fs.existsSync(path.join(dirOf(id), 'session.jsonl'));
const minted = (id: string) => fs.existsSync(path.join(dirOf(id), 'run.json'));

function makeLink() {
  const suite = option('--suite') ?? 'quick';
  if (!(SUITE_NAMES as readonly string[]).includes(suite)) throw new Error(`suite is one of ${SUITE_NAMES.join(', ')}`);
  const label = cleanLabel(option('--label'));
  const query = (option('--query') ?? '').replace(/^[?&]/, '');
  const site = (option('--site') ?? SITE).replace(/\/$/, '');
  if (flag('--wait')) throw new Error('--wait is step 2 of the plan: not built yet');
  const id = makeRunId();
  const link = new URL(`${site}/`);
  link.searchParams.set('device', id);
  link.searchParams.set('suite', suite);
  if (label) link.searchParams.set('label', label);
  const url = link.toString() + (query ? `&${query}` : '');
  fs.mkdirSync(dirOf(id), { recursive: true });
  fs.writeFileSync(
    path.join(dirOf(id), 'run.json'),
    JSON.stringify({ id, suite, label, query, made: new Date().toISOString() }, null, 2) + '\n',
  );
  console.log(url);
  console.log(`run ${shortCode(id)}: open it on the device, tap Run; then: npm run device -- pull ${shortCode(id)}`);
}

type Row = Awaited<ReturnType<ReturnType<typeof playdata>['list']>>[number];

async function list(server: ReturnType<typeof playdata>) {
  const rows = (await server.list()).filter((s) => s.card === 'device');
  if (!rows.length) return console.log('No device runs yet.');
  console.log('(Untrusted: what the devices sent; the endpoint is public.)');
  for (const s of rows.slice(0, 25)) {
    const m = s.meta ?? {};
    console.log(
      [
        shortCode(s.id),
        s.first.slice(0, 16).replace('T', ' '),
        (cleanText(str(m.label)) || '-').padEnd(16),
        (cleanText(str(m.device)) || '?').padEnd(8),
        (cleanText(str(m.browser)) || '?').padEnd(8),
        (cleanText(str(m.build)) || '?').padEnd(12),
        m.state === 'done' ? `done ${String(m.pass ?? '?')}/${String(m.total ?? '?')}` : cleanText(str(m.state)) || '?',
        pulled(s.id) ? 'pulled' : 'not pulled',
        m.self === true ? 'self-minted' : '',
      ]
        .join('  ')
        .trimEnd(),
    );
  }
}

async function pullOne(server: ReturnType<typeof playdata>, row: Row) {
  await server.download(row.id); // the playtest cache copy is the raw text; keep ours beside the report
  const raw = path.join(PLAYTEST_OUT, `${row.id}.jsonl`);
  fs.mkdirSync(dirOf(row.id), { recursive: true });
  fs.copyFileSync(raw, path.join(dirOf(row.id), 'session.jsonl'));
  fs.rmSync(raw, { force: true });
  const result = readDevice(
    parseSession(row.id, fs.readFileSync(path.join(dirOf(row.id), 'session.jsonl'), 'utf8')),
    minted(row.id),
  );
  fs.writeFileSync(path.join(dirOf(row.id), 'result.json'), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(path.join(dirOf(row.id), 'report.md'), report(result));
  console.log(pasteLine(result));
  console.log(`  ${path.relative(ROOT, path.join(dirOf(row.id), 'report.md'))}`);
}

async function pull(server: ReturnType<typeof playdata>) {
  const all = flag('--new');
  const rows = (await server.list()).filter((s) => s.card === 'device');
  if (all) {
    const fresh = rows.filter((s) => !pulled(s.id));
    if (!fresh.length) return console.log('No device runs waiting.');
    for (const s of fresh.reverse()) await pullOne(server, s);
    return;
  }
  const want = args[0];
  if (!want) throw new Error('pull <run id or its last six characters>, or pull --new');
  await pullOne(server, resolveSession(rows, want));
}

try {
  if (cmd === 'new') makeLink();
  else if (cmd === 'list' || cmd === 'pull') {
    const server = playdata();
    if (cmd === 'list') await list(server);
    else await pull(server);
  } else {
    console.error(
      'npm run device -- new [--suite quick] [--label x] [--query a=b] | list | pull <id|code> | pull --new',
    );
    process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error(cleanText(e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
