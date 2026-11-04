// Local opt-in shell. Each tool owns its descriptor, commands and lifetime.
import './dev-menu.css';
import { pausePages, pauseNavigation } from '../player/pause-pages.ts';
import { defineKind, spawn, despawn } from '../entity/entity.ts';
import { BUILD } from '../build-id.ts';
import { me } from '../player/state.ts';
import { fixture, fixtureReason, setup, launch, scenarioName, destinationName, VERSION } from './dev/fixtures.ts';
import { el, button, note } from './dev/ui.ts';
import { no, type Args, type Context, type Tool, type Result } from './dev/types.ts';

const entries = [
  { id: 'water', label: 'Water', load: () => import('./dev/water.ts') },
  { id: 'destinations', label: 'Go to', load: () => import('./dev/destinations.ts') },
  { id: 'camera', label: 'Free camera', load: () => import('./dev/camera.ts') },
  { id: 'inspect', label: 'Inspect and overlays', load: () => import('./dev/inspect.ts') },
  { id: 'performance', label: 'Performance and startup', load: () => import('./dev/performance.ts') },
  { id: 'room', label: 'Room health', load: () => import('./dev/room.ts') },
  { id: 'report', label: 'Copy test report', load: () => import('./dev/report.ts') },
  { id: 'scenarios', label: 'Test scenarios', load: () => import('./dev/scenarios.ts') },
];
const loaded = new Map<string, Tool>();
const history: { tool: string; command: string; at: string; result: Result }[] = [];
let select: ((id?: string) => Promise<void>) | null = null;
let selected: string | undefined;
async function tool(id: string) {
  const existing = loaded.get(id);
  if (existing) return existing;
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  const value = (await entry.load()).tool;
  loaded.set(id, value);
  return value;
}
async function run(id: string, command: string, args: Args = {}): Promise<Result> {
  let result: Result;
  try {
    const value = await tool(id);
    result = !value
      ? no('Unknown tool.')
      : !value.commands.includes(command)
        ? no('Unknown command.')
        : await value.run(command, args);
  } catch (error) {
    result = no(error instanceof Error ? error.message : String(error));
  }
  history.push({ tool: id, command, at: new Date().toISOString(), result: { ok: result.ok, message: result.message } });
  if (history.length > 40) history.shift();
  return result;
}
const context: Context = {
  run,
  close: () => pauseNavigation.close?.(),
  snapshot: () => ({
    build: BUILD,
    fixture: fixture(),
    selected,
    tools: Object.fromEntries([...loaded].map(([id, value]) => [id, value.snapshot?.() ?? null])),
    commands: [...history],
  }),
};
function mount(parent: HTMLElement, resume: () => void) {
  const page = el('section', '', 'dev-page');
  page.dataset.devPage = '';
  const bar = el('div', '', 'dev-bar'),
    body = el('div', '', 'dev-tools');
  const back = button('Back', () => {
    if (selected) void show();
    else pauseNavigation.open?.('main');
  });
  bar.append(back, button('Resume', resume));
  page.append(bar, body);
  parent.append(page);
  let dispose = () => {},
    generation = 0,
    alive = true;
  async function show(id?: string) {
    const token = ++generation;
    dispose();
    dispose = () => {};
    selected = id;
    body.replaceChildren();
    if (!id) {
      body.append(el('h2', 'Dev'));
      note(body, 'Local tools. The room keeps running. Movement and stage setup require a disposable solo TEST run.');
      const proposed = setup();
      if (proposed) {
        note(body, `${proposed.warning} Proposed: ${proposed.scenario} / ${proposed.destination}.`);
        const start = button('Start this setup in a disposable run', () =>
          launch(proposed.scenario, proposed.destination),
        );
        start.disabled =
          proposed.version !== VERSION || !scenarioName(proposed.scenario) || !destinationName(proposed.destination);
        body.append(start);
      }
      for (const entry of entries) {
        const b = button(entry.label, () => show(entry.id));
        b.dataset.devTool = entry.id;
        body.append(b);
      }
      return;
    }
    note(body, 'Loading…');
    const value = await tool(id);
    if (!alive || token !== generation) return;
    body.replaceChildren();
    if (!value) {
      note(body, 'Unknown tool.');
      return;
    }
    body.append(el('h2', value.label));
    note(body, value.scope);
    const unavailable = value.available();
    if (unavailable) note(body, unavailable);
    const cleanup = await value.mount(body, context);
    if (!alive || token !== generation) cleanup();
    else dispose = cleanup;
  }
  select = show;
  void show(selected);
  return () => {
    alive = false;
    generation++;
    dispose();
    select = null;
    selected = undefined;
    page.remove();
  };
}
defineKind('dev-launch', { update: 10 });
export function installDevMenu() {
  pausePages.push({ id: 'dev', label: 'Dev', mount });
  window.boogle.dev = {
    tools: () =>
      entries.map(({ id, label }) => ({ id, label, scope: loaded.get(id)?.scope, commands: loaded.get(id)?.commands })),
    async open(id) {
      selected = id;
      if (!select && !pauseNavigation.open?.('dev')) return false;
      if (select) await select(id);
      return true;
    },
    run,
    snapshot: context.snapshot,
    close: context.close,
  };
  const current = fixture();
  if (current.launched && current.version === VERSION) {
    const badge = el('div', `TEST · ${current.scenario} · disposable solo`, 'dev-test');
    badge.dataset.devTest = '';
    document.body.append(badge);
    let started = false;
    const pending = spawn({
      kind: 'dev-launch',
      update() {
        if (started || fixtureReason() || (!me.swimming && (me.coyote <= 0 || Math.abs(me.body!.velocity.y) > 0.5)))
          return;
        started = true;
        despawn(pending);
        void (async () => {
          if (scenarioName(current.scenario)) await run('scenarios', 'apply', { scenario: current.scenario });
          if (destinationName(current.destination) && current.destination !== 'spawn')
            await run('destinations', 'go', { destination: current.destination });
        })();
      },
    });
  }
}
