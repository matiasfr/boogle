// Dev → Room: the room's health (read-only), and Replace room with stage (docs/plans/room-fast-forward.md;
// docs/game-design/dev-menu.md). The replacement is the server's: this tab sends one authenticated HTTP request
// (./room-replace.ts) and shows the answer. Everyone in the room then sees the countdown and reloads into the stage
// (src/features/room-replace.ts). Local; no room message, op or world write.
import { worldStatus } from '../../world/sync.ts';
import { net, getRoomId, remotes } from '../../netplay/net.ts';
import { BUILD } from '../../build-id.ts';
import { productionRailway } from '../../proto/flags.ts';
import { railwayDump } from './inspect.ts';
import { command, el, note, more } from './ui.ts';
import { no, ok, type Args, type Result, type Tool } from './types.ts';
import {
  LOSSES,
  REPLACE_STAGES,
  refusal,
  replaceArgs,
  replaceRequest,
  replacedReply,
  stageLabel,
} from './room-replace.ts';

export async function roomSummary() {
  const status = worldStatus();
  return {
    room: getRoomId(),
    connection: net.state,
    transport: net.room?.transport ?? 'none',
    roomLead: net.room?.isLead() ? net.myPeer : 'another tab; identifier unavailable',
    localIsLead: net.room?.isLead() ?? false,
    build: BUILD,
    remoteBuilds: [...remotes].map(([peer, p]) => ({ peer, build: p.build ?? 'unavailable' })),
    peers: net.room?.peers().map((p) => p.peer) ?? [],
    clockReady: status.ready,
    placeAuthority: productionRailway ? railwayDump() : 'not a place route',
    note: productionRailway ? 'Shared state is replicated from the server.' : 'Server room clock; local preview.',
  };
}

// The server's ADVANCE_KEY, for this tab only (./room-replace.ts's header says where it may and may not go).
const KEY = 'boogle.dev.advance-key';
let key = '';
try {
  key = sessionStorage.getItem(KEY) ?? '';
} catch {
  // no storage: the key lasts until the reload
}
function setKey(value: string) {
  key = value;
  try {
    if (value) sessionStorage.setItem(KEY, value);
    else sessionStorage.removeItem(KEY);
  } catch {
    // as above
  }
}

let pending = false;
async function replace(args: Args): Promise<Result> {
  if (!productionRailway) return no('Only the live game has rooms the server can replace.');
  const server = import.meta.env.VITE_BOOGLE_SERVER;
  if (!server) return no('This page has no game server.');
  const parsed = replaceArgs(args);
  if (typeof parsed === 'string') return no(parsed);
  if (!key) return no('Enter the key first.');
  if (pending) return no('This room is already being replaced.');
  pending = true;
  try {
    const { url, init } = replaceRequest(server, getRoomId(), key, parsed);
    // The answer comes after the countdown; this page is usually reloading into the new world by then.
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(90_000) });
    const body: unknown = await response.json().catch(() => null);
    const done = response.ok ? replacedReply(body) : null;
    if (!done) return no(refusal(response.status, body));
    return ok(`Replaced with ${stageLabel(done.stage)}.`, { backup: done.backup, restore: done.restore });
  } catch {
    return no('Could not reach the server. If the room was replaced, this page reloads on its own.');
  } finally {
    pending = false;
  }
}

function field<T extends HTMLElement>(parent: HTMLElement, label: string, input: T) {
  const row = el('label', `${label} `);
  row.append(input);
  parent.append(row);
  return input;
}

function mountReplace(parent: HTMLElement, ctx: Parameters<Tool['mount']>[1]) {
  const group = el('section');
  group.dataset.devReplace = '';
  group.append(el('h3', 'Replace room with stage'));
  const room = getRoomId();
  if (room === 'boogle') note(group, 'This is the shared island. Everyone who plays here gets this world.');
  const list = el('ol', '', 'dev-note');
  for (const loss of LOSSES) list.append(el('li', loss));
  group.append(list);

  const stage = field(group, 'Stage', el('select'));
  for (const j of REPLACE_STAGES) {
    const option = el('option', `${j.label}: ${j.line}`);
    option.value = j.stage;
    stage.append(option);
  }
  const confirm = field(group, `Type the room name (${room}) to replace it`, el('input'));
  confirm.autocomplete = 'off';
  confirm.spellcheck = false;
  const secret = field(group, 'Key', el('input'));
  secret.type = 'password';
  secret.autocomplete = 'off';
  secret.value = key;
  secret.addEventListener('input', () => setKey(secret.value.trim()));

  // The server asks for the override whenever anyone is in the room, this tab included; alone, the typed name is it.
  const others = () => remotes.size;
  const under = el('input');
  under.type = 'checkbox';
  const crowd = el('label');
  const count = el('span');
  crowd.append(under, count);
  group.append(crowd);
  const button = command(group, ctx, 'room', '', 'replace', () => ({
    stage: stage.value,
    confirm: confirm.value.trim(),
    override: others() === 0 || under.checked,
  }));
  // The answer takes the countdown's ten seconds: say so, over whatever the last attempt left.
  const status = button.parentElement?.querySelector('.dev-status');
  button.addEventListener('click', () => {
    if (status) status.textContent = 'Asking the server. Everyone here sees the countdown first.';
  });
  const refresh = () => {
    const n = others();
    crowd.hidden = n === 0;
    count.textContent = ` ${n} ${n === 1 ? 'other is' : 'others are'} here now. Replace it under them`;
    button.textContent = `Replace this room with ${stageLabel(stage.value)}`;
  };
  stage.addEventListener('change', refresh);
  refresh();
  const timer = window.setInterval(refresh, 1000);

  const fresh = el('button', 'New empty room', 'pause-btn');
  fresh.type = 'button';
  fresh.addEventListener('click', () => location.assign('/?from=start'));
  group.append(fresh);
  note(group, 'New empty room opens a fresh private room and replaces nothing.');
  parent.append(group);
  return () => clearInterval(timer);
}

export const tool: Tool = {
  id: 'room',
  label: 'Room health',
  scope: 'Health is read-only. Replace room with stage asks the server, which checks the key and the room name.',
  commands: ['read', 'replace'],
  available: () => null,
  async run(name, args) {
    if (name === 'replace') return replace(args);
    return ok('Room health snapshot.', await roomSummary());
  },
  mount(parent, ctx) {
    command(parent, ctx, 'room', 'Refresh room health', 'read');
    const dispose = productionRailway ? mountReplace(parent, ctx) : () => {};
    note(more(parent), 'Read refreshes this snapshot. Unknown metrics stay unavailable.');
    return dispose;
  },
};
