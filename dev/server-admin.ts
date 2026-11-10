// The game server's operator tools: list, reset, back up and restore room saves without a deploy
// (server/src/admin.ts; server/README.md, "Operator tools").
//
//   npm run server -- rooms                    saved rooms (players, last save) and the backups kept
//   npm run server -- reset <room>|--all       back the save up, then start the room fresh
//   npm run server -- backup <room>|--all      keep a copy of the save as it is now
//   npm run server -- restore <room> [backup]  put a backup back (default: that room's newest)
//     --force   also when players are in the room (they reconnect into the new world)
//
// <room> is the name in the URL (?room=) or a full id from `rooms`. Server: BOOGLE_SERVER (default production).
import { reportToken } from '../scripts/report-token.ts';

const SERVER = process.env.BOOGLE_SERVER || 'https://boogle-server.fly.dev';
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};
const force = flag('--force');
const all = flag('--all');
const [cmd = 'rooms', name, backup] = args;

type Room = { id: string; bytes: number; savedAt: string; loaded: boolean; players: number; tick?: number };
type List = { ns: string; rail: string; rooms: Room[]; backups: { name: string; room: string; bytes: number }[] };

const fail = (text: string): never => {
  console.error(text);
  process.exit(1);
};
const token = reportToken() ?? fail('No REPORT_TOKEN: set it in the environment or in .env.local (the Fly secret).');
async function call(path: string, method = 'POST') {
  const r = await fetch(`${SERVER}/admin/rooms${path}`, { method, headers: { authorization: `Bearer ${token}` } });
  const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: r.status, body };
}

const listed = await call('', 'GET');
if (listed.status !== 200) fail(`${SERVER}: ${listed.status} ${JSON.stringify(listed.body)}`);
const list = listed.body as unknown as List;
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} kB`;

if (cmd === 'rooms') {
  console.log(`${SERVER} (world ${list.ns}, railway ${list.rail})`);
  for (const r of list.rooms)
    console.log(
      `  ${r.id.padEnd(32)} ${kb(r.bytes).padStart(10)}  saved ${r.savedAt}  ` +
        (r.loaded ? `loaded, ${r.players} playing` : 'unloaded'),
    );
  if (!list.rooms.length) console.log('  no saved rooms');
  console.log(`backups (${list.backups.length}, newest first):`);
  for (const b of list.backups) console.log(`  ${b.name}  ${kb(b.bytes)}`);
  process.exit(0);
}
if (!['reset', 'backup', 'restore'].includes(cmd)) fail(`unknown command: ${cmd} (rooms, reset, backup, restore)`);

// A full id, or the plain room name under either current namespace. A restore may name a room that has no save now.
const known = [...new Set([...list.rooms.map((r) => r.id), ...list.backups.map((b) => b.room)])];
const ids = all
  ? list.rooms.map((r) => r.id)
  : known.filter((id) => name && [name, `${list.ns}-${name}`, `${list.rail}-${name}`].includes(id));
if (cmd === 'restore' && ids.length !== 1)
  fail(`restore needs one room; "${name ?? ''}" matches: ${ids.join(', ') || 'none'}`);
if (!ids.length) fail(all ? 'no saved rooms' : `no saved room matches "${name ?? ''}" (npm run server -- rooms)`);

let failed = false;
for (const id of ids) {
  const query = [force ? 'force=1' : '', cmd === 'restore' && backup ? `backup=${encodeURIComponent(backup)}` : '']
    .filter(Boolean)
    .join('&');
  const { status, body } = await call(`/${id}/${cmd}${query ? `?${query}` : ''}`);
  if (status === 200) console.log(`${cmd} ${id}: ${JSON.stringify(body)}`);
  else {
    failed = true;
    const hint = status === 409 && body.players ? ' (add --force to reset it under them)' : '';
    console.error(`${cmd} ${id}: ${status} ${JSON.stringify(body)}${hint}`);
  }
}
process.exit(failed ? 1 : 0);
