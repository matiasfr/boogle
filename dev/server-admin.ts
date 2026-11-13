// The game server's operator tools: list, reset, back up and restore room saves without a deploy
// (server/src/admin.ts; server/README.md, "Operator tools").
//
//   npm run server -- rooms                    saved rooms (players, last save) and the backups kept
//   npm run server -- reset <room>|--all       back the save up, then start the room fresh
//   npm run server -- backup <room>|--all      keep a copy of the save as it is now
//   npm run server -- restore <room> [backup]  put a backup back (default: that room's newest)
//   npm run server -- replace <room> <stage>  replace the room with a stage, after typing its name
//     --override   replace while players are in the room (10 s countdown)
//   npm run server -- release <backup>        return a pinned backup to normal retention
//     --force   also when players are in the room (they reconnect into the new world)
//
// <room> is the name in the URL (?room=) or a full id from `rooms`. Server: BOOGLE_SERVER (default production).
import { reportToken } from '../scripts/report-token.ts';
import { createInterface } from 'node:readline/promises';
import { RAILWAY_PLAY_NS, isRailwayRoom, railwayRoomId } from '../src/world/railway-namespace.ts';

const SERVER = process.env.BOOGLE_SERVER || 'https://boogle-server.fly.dev';
const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};
const force = flag('--force');
const all = flag('--all');
const override = flag('--override');
const [cmd = 'rooms', name, backup] = args;

type Room = { id: string; bytes: number; savedAt: string; loaded: boolean; players: number; tick?: number };
type List = {
  ns: string;
  rail: string;
  rooms: Room[];
  backups: { name: string; room: string; bytes: number; pinned?: boolean }[];
};

function fail(text: string): never {
  console.error(text);
  process.exit(1);
}
async function request(path: string, token: string, method = 'POST', payload?: unknown) {
  const r = await fetch(`${SERVER}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: r.status, body };
}

if (cmd === 'replace') {
  const key =
    process.env.ADVANCE_KEY || fail('No ADVANCE_KEY: set it in the environment. REPORT_TOKEN cannot replace a room.');
  if (!name || !backup || all || force) fail('usage: npm run server -- replace <room> <stage> [--override]');
  const id = isRailwayRoom(name) ? name : railwayRoomId(name);
  if (!isRailwayRoom(id)) fail('not a current railway room name');
  const plain = id.slice(RAILWAY_PLAY_NS.length + 1);
  const response = await fetch(`${SERVER}/rooms/${id}/host`);
  const host = (await response.json()) as { players?: number };
  if (response.status !== 200) fail(`${SERVER}: room status ${response.status}`);
  console.log(`${SERVER}: Replace room with stage ${backup} (${id}); ${host.players ?? 0} players here now.`);
  console.log(`1. The world: everything built, stocked or earned, the trains, cart, wagon and town economy become the stage's.
   Progress past the stage is lost: "forward" is checked against the last record, never against play.
2. What is carried: everything on anyone's back, and every account row.
3. Personal to this room, in each browser that was here: wardrobe and finds (their claims pruned), the saved
   pose, seen state, the visit marker, and The Boogler's memory of the player. Nothing puts these back.
4. On an operator restore: the old world returns with its old born. Browsers that joined the replaced world
   reset again; browsers that never joined it keep everything. Play after the replacement is discarded.`);
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  let confirm: string;
  try {
    confirm = await terminal.question(`Type the room name (${plain}) to replace it: `);
  } finally {
    terminal.close();
  }
  if (confirm !== plain) fail('Room name did not match; nothing was sent.');
  const { status, body } = await request(`/admin/rooms/${id}/replace`, key, 'POST', {
    stage: backup,
    confirm,
    override,
  });
  if (status !== 200) fail(`replace ${id}: ${status} ${JSON.stringify(body)}`);
  console.log(`replace ${id}: ${JSON.stringify(body)}`);
  console.log(`Pinned backup: ${String(body.backup)}\nRestore: ${String(body.restore)}`);
  process.exit(0);
}

const token = reportToken() ?? fail('No REPORT_TOKEN: set it in the environment or in .env.local (the Fly secret).');
const call = (path: string, method = 'POST') => request(`/admin/rooms${path}`, token, method);
if (cmd === 'release') {
  if (!name || backup || all || force || override) fail('usage: npm run server -- release <backup>');
  const { status, body } = await request(`/admin/backups/${encodeURIComponent(name)}/release`, token);
  if (status !== 200) fail(`release: ${status} ${JSON.stringify(body)}`);
  console.log(`release: ${JSON.stringify(body)}`);
  process.exit(0);
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
  for (const b of list.backups) console.log(`  ${b.name}  ${kb(b.bytes)}${b.pinned ? '  [pinned]' : ''}`);
  process.exit(0);
}
if (!['reset', 'backup', 'restore'].includes(cmd))
  fail(`unknown command: ${cmd} (rooms, reset, backup, restore, replace, release)`);

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
