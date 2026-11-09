// Bounded agent client. Uses an existing session, or an explicitly requested fresh broker capture.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CATALOG, TUNE_COMMANDS } from '../src/tunables/catalog.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const argv = process.argv.slice(2);
function option(name: string) {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const value = argv[i + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} needs a value`);
  argv.splice(i, 2);
  return value;
}
function flag(name: string) {
  const i = argv.indexOf(name);
  if (i < 0) return false;
  argv.splice(i, 1);
  return true;
}

function main() {
  const broker = flag('--broker');
  const session = flag('--session'); // Never starts a browser.
  flag('--json'); // Output is always structured JSON.
  const wait = flag('--wait');
  const query = option('--query');
  const room = option('--room');
  const output = option('--out');
  const revision = option('--expect-revision');
  const [command = 'list', id, value, ...extra] = argv;
  if (!(TUNE_COMMANDS as readonly string[]).includes(command) || extra.length)
    throw new Error(
      'tune list|get|validate|set|status|snapshot|diff|reset-local [id] [JSON value] [--session|--broker]',
    );
  if (query && !broker) throw new Error('--query requires --broker (a fresh capture, not an existing session)');
  if (room && !broker) throw new Error('--room requires --broker (a fresh capture, not an existing session)');
  if (['get', 'validate', 'set', 'status'].includes(command) && !id) throw new Error(`${command} needs an id`);
  if (['set', 'validate'].includes(command) && value === undefined) throw new Error(`${command} needs a JSON value`);
  const args: Record<string, unknown> = command === 'status' ? { requestId: id } : id ? { id } : {};
  if (value !== undefined) args.value = JSON.parse(value);
  if (revision !== undefined) {
    const n = Number(revision);
    if (!Number.isSafeInteger(n) || n < 0) throw new Error('--expect-revision needs a nonnegative integer');
    args.expectedRevision = n;
  }
  if (command === 'list' && !broker && !session) {
    const json = JSON.stringify(
      { ok: true, message: 'Authored defaults; no running session queried.', data: CATALOG },
      null,
      2,
    );
    if (output) fs.writeFileSync(path.resolve(output), `${json}\n`);
    console.log(json);
    return;
  }
  const expression = `
    for (let attempt = 0; !window.boogle?.dev && attempt < 200; attempt++)
      await new Promise(resolve => setTimeout(resolve, 50));
    const api = window.boogle?.dev;
    if (!api) throw new Error('No Dev API. Open this session with dev=1 or tune=1.');
    let result = await api.run('tunables', ${JSON.stringify(command)}, ${JSON.stringify(args)});
    if (${wait} && result.data?.status === 'pending' && result.data?.requestId) {
      const deadline = performance.now() + 10000;
      const requestId = result.data.requestId;
      while (result.data?.status === 'pending' && performance.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 50));
        result = await api.run('tunables', 'status', {requestId});
      }
    }
    return result;
  `;
  let raw: string;
  if (broker) {
    console.error('Broker transport opens a fresh page; local values last only for this capture.');
    const launchQuery = new URLSearchParams(query ?? 'tune=1');
    const queryRooms = launchQuery.getAll('room');
    if (queryRooms.length > 1 || (room && queryRooms[0] && room !== queryRooms[0]))
      throw new Error('Use one room: --room or the matching room query parameter.');
    const launchRoom = room ?? queryRooms[0];
    // look puts its room parameter before query parameters; forward it through its actual option.
    launchQuery.delete('room');
    const dir = path.join(root, '.look', 'tune-cli');
    fs.mkdirSync(dir, { recursive: true });
    const script = path.join(dir, `${randomUUID()}.ts`);
    fs.writeFileSync(script, `console.log('TUNE ' + JSON.stringify(await (async () => {${expression}})()));`);
    try {
      const log = execFileSync(
        process.execPath,
        [
          '.look/see-client.ts',
          'look',
          ...(launchRoom ? ['--room', launchRoom] : []),
          '--query',
          launchQuery.toString(),
          '--eval',
          script,
        ],
        { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'inherit'] },
      );
      console.error(log);
      const line = log.split('\n').find((entry) => entry.startsWith('TUNE '));
      if (!line) throw new Error('Broker returned no observed result; see its evidence manifest.');
      raw = line.slice('TUNE '.length);
    } finally {
      fs.unlinkSync(script);
    }
  } else {
    raw = execFileSync(process.execPath, ['dev/look/session.ts', 'eval', expression], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'inherit'],
    }).trim();
  }
  const result = JSON.parse(raw) as { ok?: boolean; data?: { status?: string } };
  const json = JSON.stringify(result, null, 2);
  if (output) fs.writeFileSync(path.resolve(output), `${json}\n`);
  console.log(json);
  if (!result.ok || ['pending', 'rejected', 'unknown', 'superseded'].includes(result.data?.status ?? ''))
    process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(String(error));
  process.exitCode = 1;
}
