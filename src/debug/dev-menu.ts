// Local opt-in shell. Panels own UI lifetime; camera owns a separate Dev session lifetime.
import './dev-menu.css';
import { pausePages, pauseNavigation } from '../player/pause-pages.ts';
import { defineKind, spawn, despawn } from '../entity/entity.ts';
import { BUILD } from '../build-id.ts';
import { DEV_SETTINGS, clearDevPreferences, devOffUrl } from '../dev-preferences.ts';
import { me } from '../player/state.ts';
import { releaseInput, requestLock } from '../player/input.ts';
import { devInput } from '../player/dev-input.ts';
import { canvas } from '../render/scene.ts';
import { PROTO } from '../proto/flags.ts';
import { fixture, fixtureReason, setup, launch, scenarioName, destinationName, VERSION } from './dev/fixtures.ts';
import { islandLinks } from './dev/routes.ts';
import { el, button, note } from './dev/ui.ts';
import { no, type Args, type Context, type Tool, type Result, type DockPanel } from './dev/types.ts';

const entries: DockPanel[] = [
  { id: 'water', label: 'Water', load: () => import('./dev/water.ts') },
  { id: 'destinations', label: 'Go to', load: () => import('./dev/destinations.ts') },
  { id: 'camera', label: 'Free camera', load: () => import('./dev/camera.ts') },
  { id: 'inspect', label: 'Inspect and overlays', load: () => import('./dev/inspect.ts') },
  { id: 'performance', label: 'Performance and startup', load: () => import('./dev/performance.ts') },
  { id: 'room', label: 'Room health', load: () => import('./dev/room.ts') },
  { id: 'report', label: 'Copy test report', load: () => import('./dev/report.ts') },
  { id: 'scenarios', label: 'Test scenarios', load: () => import('./dev/scenarios.ts') },
];
/** Register a lazy panel before or after installation, using the same bounded commands as its agent API. */
export function registerDockPanel(panel: DockPanel) {
  if (entries.some((entry) => entry.id === panel.id)) throw new Error(`Dev panel already registered: ${panel.id}`);
  entries.push(panel);
  if (select && !selected) void select();
  return () => {
    const i = entries.indexOf(panel);
    if (i >= 0) entries.splice(i, 1);
    loaded.get(panel.id)?.dispose?.();
    loaded.delete(panel.id);
    if (selected === panel.id) void select?.();
  };
}
const loaded = new Map<string, Tool>();
const loading = new Map<string, Promise<Tool>>();
const history: { tool: string; command: string; at: string; result: Result }[] = [];
let select: ((id?: string) => Promise<void>) | null = null;
let collapse = () => {};
let selected: string | undefined;
let alive = true;
let prepareCamera: (() => Promise<unknown>) | null = null;
type Position = 'left' | 'right' | 'bottom';
let position: Position = 'right',
  collapsed = true,
  settingsNotice = '';
try {
  const saved = JSON.parse(localStorage.getItem(DEV_SETTINGS) ?? 'null');
  if (saved?.version === 1) {
    if (['left', 'right', 'bottom'].includes(saved.position)) position = saved.position;
    if (typeof saved.collapsed === 'boolean') collapsed = saved.collapsed;
    if (typeof saved.selected === 'string' && entries.some((entry) => entry.id === saved.selected))
      selected = saved.selected;
    else if (saved.selected) settingsNotice = 'An unavailable panel preference was dropped.';
  } else if (saved) settingsNotice = 'Unsupported dock settings were dropped; Dev stays on.';
} catch {
  settingsNotice = 'Dock preferences unavailable; this visit still works.';
}
function remember() {
  try {
    localStorage.setItem(DEV_SETTINGS, JSON.stringify({ version: 1, position, collapsed, selected }));
  } catch {
    /* storage is optional */
  }
}
async function tool(id: string) {
  if (!alive) return null;
  const existing = loaded.get(id);
  if (existing) return existing;
  const entry = entries.find((e) => e.id === id);
  if (!entry) return null;
  let pending = loading.get(id);
  if (!pending) {
    pending = entry.load().then(({ tool: value }) => {
      loading.delete(id);
      if (alive && entries.includes(entry)) loaded.set(id, value);
      else value.dispose?.();
      return value;
    });
    loading.set(id, pending);
  }
  const value = await pending;
  return alive && entries.includes(entry) ? value : null;
}
async function run(id: string, command: string, args: Args = {}): Promise<Result> {
  let result: Result;
  try {
    if (id === 'camera') await prepareCamera?.();
    const value = await tool(id);
    result = !value
      ? no('Dev is off or tool is unavailable.')
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
  close: () => collapse(),
  snapshot: () => ({
    build: BUILD,
    fixture: fixture(),
    selected,
    position,
    collapsed,
    tools: Object.fromEntries([...loaded].map(([id, value]) => [id, value.snapshot?.() ?? null])),
    commands: [...history],
  }),
};
defineKind('dev-launch', { update: 10 });
defineKind('dev-dock', {});
export function installDevMenu() {
  const shell = el('section', '', 'dev-shell');
  shell.dataset.devShell = '';
  shell.dataset.devUi = '';
  const strip = el('div', '', 'dev-strip');
  strip.dataset.devStrip = '';
  strip.append(el('strong', 'DEV'), el('small', BUILD));
  const dock = el('aside', '', 'dev-page dev-dock');
  dock.dataset.devDock = '';
  dock.setAttribute('aria-label', 'Developer tools');
  const bar = el('div', '', 'dev-bar'),
    body = el('div', '', 'dev-tools');
  let disposePanel = () => {},
    generation = 0;
  const waterReady = (async () => {
    let saved = false;
    try {
      saved = !!localStorage.getItem('boogle.water-tuning.v1');
    } catch {
      /* optional storage */
    }
    if (!saved || new URLSearchParams(location.search).get('tune') !== '1') return;
    const water = await import('./dev/water.ts');
    if (alive) await water.restoreWaterSettings();
  })();
  const cameraControls = el('div', '', 'dev-camera-controls');
  cameraControls.dataset.devCameraControls = '';
  let cameraModule: typeof import('./dev/camera.ts') | null = null;
  let cameraLoading: Promise<typeof import('./dev/camera.ts') | null> | null = null;
  let disposeCameraControls = () => {};
  const ensureCamera = () => {
    cameraLoading ??= import('./dev/camera.ts').then((value) => {
      if (!alive) return null;
      cameraModule = value;
      disposeCameraControls = value.mountCameraControls(cameraControls);
      loaded.set('camera', value.tool);
      return cameraModule;
    });
    return cameraLoading;
  };
  prepareCamera = ensureCamera;
  const cameraButton = button('Free cam', async () => {
    const camera = await ensureCamera();
    if (camera) await run('camera', camera.cameraActive() ? 'return' : 'start');
  });
  cameraButton.dataset.devFreecam = '';
  const returnButton = button('Return', () => cameraModule?.returnCamera());
  returnButton.dataset.devReturn = '';
  const updateCamera = () => {
    const active = cameraModule?.cameraActive() ?? false;
    cameraButton.setAttribute('aria-pressed', String(active));
    returnButton.hidden = !active;
    cameraControls.hidden = !active;
  };
  addEventListener('dev-camera-change', updateCamera);
  updateCamera();
  const release = () => {
    devInput.dock = true;
    releaseInput();
  };
  shell.addEventListener('pointerdown', release);
  shell.addEventListener('focusin', release);
  shell.addEventListener('focusout', () =>
    queueMicrotask(() => {
      devInput.dock = shell.contains(document.activeElement);
    }),
  );
  for (const event of [
    'keydown',
    'keyup',
    'pointerdown',
    'pointerup',
    'pointermove',
    'mousedown',
    'mouseup',
    'mousemove',
    'click',
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
  ])
    shell.addEventListener(event, (e) => e.stopPropagation());
  const sceneFocus = (event: PointerEvent) => {
    const target = event.target;
    if (target !== canvas && !(target instanceof Element && target.closest('#touch') && !target.closest('button')))
      return;
    devInput.dock = false;
    (document.activeElement as HTMLElement | null)?.blur?.();
  };
  window.addEventListener('pointerdown', sceneFocus, { capture: true });
  const layout = () => {
    dock.dataset.position = position;
    dock.hidden = collapsed;
    shell.dataset.collapsed = String(collapsed);
    remember();
  };
  collapse = () => {
    collapsed = true;
    generation++;
    disposePanel();
    disposePanel = () => {};
    body.replaceChildren();
    devInput.dock = devInput.cursor = false;
    layout();
  };
  async function show(id?: string) {
    if (!alive) return;
    devInput.cursor = true;
    releaseInput();
    if (document.pointerLockElement) document.exitPointerLock();
    pauseNavigation.close?.();
    collapsed = false;
    const token = ++generation;
    disposePanel();
    disposePanel = () => {};
    selected = id;
    body.replaceChildren();
    layout();
    if (!id) {
      body.append(el('h2', 'Tools'));
      note(
        body,
        'Local tools; friends see your ordinary avatar. Movement and stage setup require a disposable solo TEST run.',
      );
      if (settingsNotice) note(body, settingsNotice);
      islandLinks(body);
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
    try {
      if (id === 'water') await waterReady;
      if (id === 'camera') await ensureCamera();
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
      const parent = el('div');
      body.append(parent);
      const cleanup = await value.mount(parent, context);
      if (!alive || token !== generation) cleanup();
      else disposePanel = cleanup;
    } catch (error) {
      if (token === generation) note(body, error instanceof Error ? error.message : String(error));
    }
  }
  select = show;
  bar.append(button('Tools', () => show()));
  for (const side of ['left', 'right', 'bottom'] as const) {
    const b = button(side[0]!.toUpperCase() + side.slice(1), () => {
      position = side;
      layout();
    });
    b.dataset.devPosition = side;
    bar.append(b);
  }
  const hide = button('Collapse', () => collapse());
  hide.dataset.devCollapse = '';
  bar.append(hide);
  dock.append(bar, body);
  const play = button('Play · Esc for mouse', () => {
    cameraModule?.returnCamera();
    collapse();
    requestLock();
    canvas.focus();
  });
  play.dataset.devPlay = '';
  const off = button('Off', () => {
    clearDevPreferences();
    dispose();
    location.assign(devOffUrl().href);
  });
  off.title = 'Turn Dev off';
  off.setAttribute('aria-label', 'Turn Dev off');
  off.dataset.devOff = '';
  strip.append(
    cameraButton,
    returnButton,
    button('Report', () => show('report')),
    button('Tools', () => show()),
    play,
    off,
  );
  shell.append(strip, cameraControls, dock);
  document.body.append(shell);
  const pauseEntry = { id: 'dev', label: 'Dev', mount: () => () => {}, open: () => void show() };
  pausePages.push(pauseEntry);
  let pending: ReturnType<typeof spawn> | null = null;
  let badge: HTMLElement | null = null;
  let shellEntity: ReturnType<typeof spawn> | null = null;
  const dispose = () => {
    if (!alive) return;
    alive = false;
    generation++;
    disposePanel();
    disposeCameraControls();
    cameraModule?.returnCamera();
    for (const value of loaded.values()) value.dispose?.();
    if (pending) despawn(pending);
    badge?.remove();
    shell.remove();
    removeEventListener('dev-camera-change', updateCamera);
    removeEventListener('pagehide', dispose);
    window.removeEventListener('pointerdown', sceneFocus, { capture: true });
    pausePages.splice(pausePages.indexOf(pauseEntry), 1);
    devInput.cursor = devInput.dock = false;
    releaseInput();
    delete window.boogle.dev;
    select = null;
    prepareCamera = null;
    if (shellEntity) despawn(shellEntity);
    shellEntity = null;
  };
  shellEntity = spawn({ kind: 'dev-dock', dispose });
  addEventListener('pagehide', dispose);
  window.boogle.dev = {
    tools: () =>
      entries.map(({ id, label }) => ({ id, label, scope: loaded.get(id)?.scope, commands: loaded.get(id)?.commands })),
    async open(id) {
      await show(id);
      return alive;
    },
    run,
    snapshot: context.snapshot,
    close: context.close,
  };
  layout();
  if (!collapsed) void show(selected);
  if (new URLSearchParams(location.search).get('devshore') === '1') {
    let starting = false;
    pending = spawn({
      kind: 'dev-launch',
      update() {
        if (starting || !me.entered || !me.body || (PROTO === 'place' && !window.__place)) return;
        starting = true;
        if (pending) despawn(pending);
        pending = null;
        void (async () => {
          await ensureCamera();
          const result = await run('camera', 'bookmark', { destination: 'shore' });
          if (!alive) return;
          const url = new URL(location.href);
          url.searchParams.delete('devshore');
          window.history.replaceState(window.history.state, '', url);
          await show('water');
          if (!result.ok) note(body, result.message);
        })();
      },
    });
  }
  const current = fixture();
  if (current.launched && current.version === VERSION) {
    badge = el('div', `TEST · ${current.scenario} · disposable solo`, 'dev-test');
    badge.dataset.devTest = '';
    document.body.append(badge);
    let started = false;
    pending = spawn({
      kind: 'dev-launch',
      update() {
        if (started || fixtureReason() || (!me.swimming && (me.coyote <= 0 || Math.abs(me.body!.velocity.y) > 0.5)))
          return;
        started = true;
        if (pending) despawn(pending);
        pending = null;
        void (async () => {
          if (scenarioName(current.scenario)) await run('scenarios', 'apply', { scenario: current.scenario });
          if (destinationName(current.destination) && current.destination !== 'spawn')
            await run('destinations', 'go', { destination: current.destination });
        })();
      },
    });
  }
}
