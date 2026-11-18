// Remote device tests (docs/plans/remote-device-tests.md), the side of whichever machine holds REPORT_TOKEN: it makes a link, lists the runs a device
// uploaded and turns one into a report. The device does the measuring; this reads a few kilobytes of JSON.
//
//   npm run device -- new [--suite quick] [--label "iphone 15"] [--query 'terrain=1'] [--site <origin>]
//       prints the link to open on the device; writes .look/device/<id>/run.json (the id is the upload token) and
//       registers the run with the server's stills endpoint (POST /device/runs, server/src/device.ts)
//   npm run device -- list
//       the device runs on the server, newest first: code, label, device, build, state, pulled or not
//   npm run device -- pull <run id or its last six characters>      one run -> .look/device/<id>/
//   npm run device -- pull --new                                     every run not yet pulled
//   npm run device -- new ... --cold      the page clears its service worker and caches, reloads once, then measures (a private tab is cleaner)
//   npm run device -- new ... --wait      also blocks until that run finishes (up to 30 minutes), then pulls and prints it
//   npm run device -- baseline <code>     marks a pulled run as this machine's baseline for its suite (~/.boogle/device/baseline/)
//   npm run device -- waiting             one line for npm run heartbeat: device runs on the server not yet pulled
//   The board link `https://boogle.club/?device=new` needs no command: the page makes its own id (self-minted).
//
// Reads need REPORT_TOKEN (scripts/report-token.ts), like `npm run playtest`; the device never has it. Server:
// BOOGLE_SERVER if set, else production. A pull writes session.jsonl, result.json (typed), report.md and one
// <scene>.jpg per still the run uploaded (GET /device/runs/<id>/stills).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { cleanText } from '../../server/src/clean-text.ts';
import { ROOT, reportToken } from '../../scripts/report-token.ts';
import { cleanLabel, makeRunId, SUITE_NAMES, shortCode } from '../../src/debug/device/id.ts';
import { NO_TOKEN, OUT as PLAYTEST_OUT, SERVER, playdata, resolveSession } from '../playtest/fetch.ts';
import type { DeviceStills } from '../../server/src/device.ts';
import { parseSession, str } from '../playtest/read.ts';
import { loadBaseline, loadBenchHistory, saveBaseline } from './baseline.ts';
import { previousRun, type Pulled } from './compare.ts';
import { readDevice, type DeviceResult } from './read.ts';
import { pasteLine, report } from './report.ts';
import { WAIT_MS, planPull, waitForRun } from './runs.ts';

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
const resultFile = (id: string) => path.join(dirOf(id), 'result.json');
/** What is on disk for a run: pulled, finished when pulled, and when (the copy's age, for "has the server more?"). */
function local(id: string) {
  try {
    const r = JSON.parse(fs.readFileSync(resultFile(id), 'utf8')) as { complete?: unknown };
    return { pulled: true, complete: r.complete === true };
  } catch {
    return { pulled: pulled(id), complete: false };
  }
}
const pulledAt = (id: string) => {
  try {
    return fs.statSync(path.join(dirOf(id), 'session.jsonl')).mtimeMs;
  } catch {
    return 0;
  }
};
/** Every pulled run on disk with its pull time, for the "previous run of this device" section. Bad files skipped. */
function pulledRuns(): Pulled[] {
  if (!fs.existsSync(OUT)) return [];
  return fs.readdirSync(OUT).flatMap((id) => {
    try {
      const result = JSON.parse(fs.readFileSync(resultFile(id), 'utf8')) as DeviceResult;
      return Array.isArray(result.scenes) ? [{ result, at: pulledAt(id) }] : [];
    } catch {
      return [];
    }
  });
}
// A scene name the server accepts; anything else from the server is never a file name here either.
const SCENE_RE = /^[a-z0-9-]{1,24}$/;
const stillsOnDisk = (id: string) =>
  fs.existsSync(dirOf(id))
    ? fs
        .readdirSync(dirOf(id))
        .filter((f) => f.endsWith('.jpg') && SCENE_RE.test(f.slice(0, -4)))
        .map((f) => f.slice(0, -4))
    : [];
const context = (result: DeviceResult) => ({
  baseline: loadBaseline(result.suite),
  bench: loadBenchHistory(),
  host: os.hostname(),
  previous: previousRun(result, pulledAt(result.id), pulledRuns()),
  stills: stillsOnDisk(result.id),
});

const authHeader = () => {
  const token = reportToken();
  if (!token) throw new Error(NO_TOKEN);
  return { authorization: `Bearer ${token}` };
};

/** Tells the server about a run made here, so its stills are expected. Says plainly when it cannot. */
async function registerRun(id: string, suite: string, label: string) {
  try {
    const r = await fetch(`${SERVER}/device/runs`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify({ id, suite, label }),
    });
    if (r.status === 201 || r.status === 200)
      return console.log('Registered with the server: it takes stills for 7 days.');
    console.log(
      `The server refused to register the run (${r.status}${r.status === 507 ? ': its device storage is full' : ''}). The link still works for numbers; the stills may be refused.`,
    );
  } catch (e) {
    console.log(
      `Could not register the run (${cleanText(e instanceof Error ? e.message : String(e)).slice(0, 120)}). The link still works for numbers.`,
    );
  }
}

/** Saves the run's stills as <scene>.jpg beside the report; returns how many. A server without stills is no error. */
async function pullStills(id: string): Promise<number> {
  const headers = authHeader();
  const r = await fetch(`${SERVER}/device/runs/${id}/stills`, { headers });
  if (r.status === 404) return 0; // no stills arrived, or a server from before the endpoint
  if (!r.ok) throw new Error(`GET /device/runs/<id>/stills: ${r.status}`);
  const list = (await r.json()) as DeviceStills;
  let n = 0;
  for (const s of Array.isArray(list.stills) ? list.stills : []) {
    if (typeof s.scene !== 'string' || !SCENE_RE.test(s.scene)) continue;
    const one = await fetch(`${SERVER}/device/runs/${id}/still/${s.scene}`, { headers });
    if (!one.ok) throw new Error(`GET still ${s.scene}: ${one.status}`);
    fs.writeFileSync(path.join(dirOf(id), `${s.scene}.jpg`), Buffer.from(await one.arrayBuffer()));
    n++;
  }
  return n;
}

async function makeLink(): Promise<string> {
  const suite = option('--suite') ?? 'quick';
  if (!(SUITE_NAMES as readonly string[]).includes(suite)) throw new Error(`suite is one of ${SUITE_NAMES.join(', ')}`);
  const label = cleanLabel(option('--label'));
  const query = (option('--query') ?? '').replace(/^[?&]/, '');
  const site = (option('--site') ?? SITE).replace(/\/$/, '');
  const cold = flag('--cold');
  const id = makeRunId();
  const link = new URL(`${site}/`);
  link.searchParams.set('device', id);
  link.searchParams.set('suite', suite);
  if (label) link.searchParams.set('label', label);
  if (cold) link.searchParams.set('cold', '1');
  const url = link.toString() + (query ? `&${query}` : '');
  fs.mkdirSync(dirOf(id), { recursive: true });
  fs.writeFileSync(
    path.join(dirOf(id), 'run.json'),
    JSON.stringify({ id, suite, label, query, made: new Date().toISOString() }, null, 2) + '\n',
  );
  console.log(url);
  await registerRun(id, suite, label);
  if (cold)
    console.log(
      "Cold run asked for: the page clears its service worker and caches and reloads once. The browser's HTTP cache stays, so for a true first visit open the link in a private tab instead; the report says Cold launch only if no worker or cache served the first page.",
    );
  console.log(`run ${shortCode(id)}: open it on the device, tap Run; then: npm run device -- pull ${shortCode(id)}`);
  return id;
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
        pulled(s.id) ? (local(s.id).complete ? 'pulled' : 'pulled (cut off)') : 'not pulled',
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
  let stillNote = '';
  try {
    const n = await pullStills(row.id);
    if (n) stillNote = `  ${n} still${n === 1 ? '' : 's'} saved beside it`;
  } catch (e) {
    stillNote = `  stills not pulled: ${cleanText(e instanceof Error ? e.message : String(e)).slice(0, 120)}`;
  }
  const result = readDevice(
    parseSession(row.id, fs.readFileSync(path.join(dirOf(row.id), 'session.jsonl'), 'utf8')),
    minted(row.id),
  );
  fs.writeFileSync(resultFile(row.id), JSON.stringify(result, null, 2) + '\n');
  fs.writeFileSync(path.join(dirOf(row.id), 'report.md'), report(result, context(result)));
  console.log(pasteLine(result));
  console.log(`  ${path.relative(ROOT, path.join(dirOf(row.id), 'report.md'))}`);
  if (stillNote) console.log(stillNote);
  return result;
}

async function pull(server: ReturnType<typeof playdata>) {
  const all = flag('--new');
  const rows = (await server.list()).filter((s) => s.card === 'device');
  if (all) {
    const plan = planPull(rows, local, pulledAt, Date.now());
    if (plan.running.length)
      console.log(
        `${plan.running.length} still running, left for later: ${plan.running.map((s) => shortCode(s.id)).join(', ')}`,
      );
    if (!plan.pull.length) return console.log('No device runs waiting.');
    // One bad run (a download that fails, a session that will not parse) must not stop the rest.
    let failed = 0;
    for (const s of plan.pull) {
      try {
        await pullOne(server, s);
      } catch (e) {
        failed++;
        console.error(`run ${shortCode(s.id)}: ${cleanText(e instanceof Error ? e.message : String(e))}`);
      }
    }
    if (failed) throw new Error(`${failed} of ${plan.pull.length} runs could not be pulled`);
    return;
  }
  const want = args[0];
  if (!want) throw new Error('pull <run id or its last six characters>, or pull --new');
  await pullOne(server, resolveSession(rows, want));
}

/** Block until the run finishes, then pull and print it. A run that went quiet part-way is pulled as cut off. */
async function wait(server: ReturnType<typeof playdata>, id: string) {
  console.log(`waiting for run ${shortCode(id)} (up to ${WAIT_MS / 60_000} minutes; Ctrl-C to stop, pull later)...`);
  let last = '';
  const res = await waitForRun(id, {
    list: () => server.list(),
    now: Date.now,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    tick: (seen, ms) => {
      if (seen === last) return;
      last = seen;
      console.log(
        `  ${Math.round(ms / 1000)} s: ${seen === 'none' ? 'nothing yet' : seen === 'started' ? 'the run has started' : 'finished'}`,
      );
    },
  });
  if (res.status === 'timeout')
    throw new Error(
      `run ${shortCode(id)} did not arrive in ${WAIT_MS / 60_000} minutes; later: npm run device -- pull ${shortCode(id)}`,
    );
  if (res.status === 'error') throw new Error(`stopped waiting: ${res.error}`);
  if (res.status === 'cut-off')
    console.log('The run stopped sending before it finished (tab closed or device locked); pulling what arrived.');
  await pullOne(server, res.session);
}

/** Marks a pulled run as the baseline for its suite. Local only: the run must be on disk (pull it first). */
function baseline() {
  const want = args[0];
  if (!want) throw new Error('baseline <run id or its last six characters> (a pulled run)');
  const ids = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter((d) => fs.existsSync(resultFile(d))) : [];
  const hits = ids.filter((id) => id === want || id.endsWith(want));
  if (hits.length > 1) throw new Error(`"${want}" matches ${hits.length} pulled runs; use more characters`);
  const id = hits[0];
  if (!id) throw new Error(`no pulled run like "${want}" in .look/device/: npm run device -- pull ${want} first`);
  const result = JSON.parse(fs.readFileSync(resultFile(id), 'utf8')) as DeviceResult;
  const file = saveBaseline(result);
  fs.writeFileSync(path.join(dirOf(id), 'report.md'), report(result, context(result)));
  console.log(
    `Baseline for suite ${result.suite}: run ${result.code}${result.label ? ` (${result.label})` : ''}, ${result.device || 'device'}, build ${result.build || '?'}.`,
  );
  console.log(`  ${file}`);
  if (result.selfMinted) console.log('  (self-minted: the numbers are what the page sent)');
}

/** One line for the heartbeat; never an error exit, since the heartbeat reads many things. */
async function waiting() {
  try {
    const rows = (await playdata().list()).filter((s) => s.card === 'device');
    const plan = planPull(rows, local, pulledAt, Date.now());
    const codes = plan.pull.map((s) => shortCode(s.id)).join(', ');
    console.log(
      `device runs not pulled: ${plan.pull.length}${codes ? ` (${codes}); npm run device -- pull --new` : ''}${plan.running.length ? `; ${plan.running.length} still running` : ''}`,
    );
  } catch (e) {
    console.log(
      `device runs not pulled: unknown (${cleanText(e instanceof Error ? e.message : String(e)).slice(0, 80)})`,
    );
  }
}

try {
  if (cmd === 'new') {
    const wantWait = args.includes('--wait');
    // Fail before making a link nobody will wait for when this machine cannot read the server.
    const server = wantWait ? playdata() : null;
    flag('--wait');
    const id = await makeLink();
    if (server) await wait(server, id);
  } else if (cmd === 'baseline') baseline();
  else if (cmd === 'waiting') await waiting();
  else if (cmd === 'list' || cmd === 'pull') {
    const server = playdata();
    if (cmd === 'list') await list(server);
    else await pull(server);
  } else {
    console.error(
      'npm run device -- new [--suite quick] [--label x] [--query a=b] [--wait] [--cold] | list | pull <id|code> | pull --new | baseline <id|code> | waiting',
    );
    process.exit(cmd ? 1 : 0);
  }
} catch (e) {
  console.error(cleanText(e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
