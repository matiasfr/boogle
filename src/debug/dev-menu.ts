// Local opt-in shell. Panels own UI lifetime; camera owns a separate Dev session lifetime.
import './dev-menu.css';
import { pausePages, pauseNavigation } from '../player/pause-pages.ts';
import { defineKind, spawn, despawn } from '../entity/entity.ts';
import { BUILD } from '../build-id.ts';
import { DEV_SETTINGS, clearDevPreferences, devOffUrl } from '../dev-preferences.ts';
import { me } from '../player/state.ts';
import { releaseInput, requestLock } from '../player/input.ts';
import { devInput } from '../player/dev-input.ts';
import { isTyping } from '../player/controls.ts';
import { modalOpen } from '../player/modal.ts';
import { canvas } from '../render/scene.ts';
import { el, button, note, more } from './dev/ui.ts';
import { no, type Args, type Context, type Tool, type Result, type DockPanel } from './dev/types.ts';

const entries: DockPanel[] = [
  { id: 'water', label: 'Water', load: () => import('./dev/water.ts') },
  { id: 'camera', label: 'Camera', load: () => import('./dev/camera.ts') },
  { id: 'inspect', label: 'Inspect', load: () => import('./dev/inspect.ts') },
  { id: 'performance', label: 'Perf', load: () => import('./dev/performance.ts') },
  { id: 'tunables', label: 'Audio mix', load: () => import('./dev/tunables.ts') },
  { id: 'room', label: 'Room', load: () => import('./dev/room.ts') },
  { id: 'report', label: 'Report', load: () => import('./dev/report.ts') },
];
/** Register a lazy panel before or after installation, using the same bounded commands as its agent API. */
export function registerDockPanel(panel: DockPanel) {
  if (entries.some((entry) => entry.id === panel.id)) throw new Error(`Dev panel already registered: ${panel.id}`);
  entries.push(panel);
  refreshTabs();
  return () => {
    const i = entries.indexOf(panel);
    if (i >= 0) entries.splice(i, 1);
    loaded.get(panel.id)?.dispose?.();
    loaded.delete(panel.id);
    if (selected === panel.id) {
      selected = 'water';
      if (!collapsed) void select?.('water');
    }
    refreshTabs();
  };
}
const loaded = new Map<string, Tool>();
const loading = new Map<string, Promise<Tool>>();
const history: { tool: string; command: string; at: string; result: Result }[] = [];
let select: ((id?: string) => Promise<void>) | null = null;
let collapse = () => {};
let refreshTabs = () => {};
let selected: string | undefined;
let alive = true;
let prepareCamera: (() => Promise<unknown>) | null = null;
// Uses the same public extension seam as other optional dock panels. Graphics code stays lazy.
registerDockPanel({ id: 'graphics', label: 'Graphics', load: () => import('./dev/graphics.ts') });
type Position = 'left' | 'right' | 'bottom';
let position: Position = 'right',
  collapsed = true,
  settingsNotice = '';
try {
  const saved = JSON.parse(localStorage.getItem(DEV_SETTINGS) ?? 'null');
  if (saved?.version === 1) {
    if (['left', 'right', 'bottom'].includes(saved.position)) position = saved.position;
    if (typeof saved.collapsed === 'boolean') collapsed = saved.collapsed;
    if (typeof saved.selected === 'string') selected = saved.selected;
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
const allTools = () => entries;
const known = (entry: DockPanel) => entries.includes(entry);
async function tool(id: string) {
  if (!alive) return null;
  const existing = loaded.get(id);
  if (existing) return existing;
  const entry = allTools().find((e) => e.id === id);
  if (!entry) return null;
  let pending = loading.get(id);
  if (!pending) {
    pending = entry.load().then(({ tool: value }) => {
      loading.delete(id);
      if (alive && known(entry)) loaded.set(id, value);
      else value.dispose?.();
      return value;
    });
    loading.set(id, pending);
  }
  const value = await pending;
  return alive && known(entry) ? value : null;
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
    selected,
    position,
    collapsed,
    tools: Object.fromEntries([...loaded].map(([id, value]) => [id, value.snapshot?.() ?? null])),
    commands: [...history],
  }),
};
defineKind('dev-dock', {});
export function installDevMenu() {
  // Optional panels register after this module loads, before installation.
  if (selected && !entries.some((entry) => entry.id === selected)) {
    selected = undefined;
    settingsNotice = 'An unavailable panel preference was dropped.';
  }
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
  const tabs = el('nav', '', 'dev-tabs');
  tabs.setAttribute('aria-label', 'Dev tools');
  const toolSelect = el('select', '', 'dev-tool-select');
  toolSelect.dataset.devToolSelect = '';
  toolSelect.setAttribute('aria-label', 'Dev tool');
  toolSelect.onchange = () => void show(toolSelect.value);
  body.id = 'dev-tool-panel';
  let disposePanel = () => {},
    generation = 0;
  const waterReady = (async () => {
    const water = await import('../render/water-render.ts');
    await water.waterReady;
    const looks = await import('../render/water/looks.ts');
    if (!looks.looksReady())
      await new Promise<void>((resolve) => {
        const off = looks.onLookChange(() => {
          if (looks.looksReady()) {
            off();
            resolve();
          }
        });
      });
    let saved = false;
    try {
      saved = !!localStorage.getItem('boogle.water-tuning.v1');
    } catch {
      /* optional storage */
    }
    if (!saved) return;
    const settings = await import('./dev/water.ts');
    if (alive) await settings.restoreWaterSettings();
  })();
  void waterReady.then(async () => {
    const tuning = await import('./dev/tunables.ts');
    if (alive) tuning.applyTuneQuery();
  });
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
    toolSelect.value = selected ?? 'water';
    for (const tab of tabs.querySelectorAll<HTMLButtonElement>('[data-dev-tool]'))
      tab.setAttribute('aria-pressed', String(tab.dataset.devTool === selected));
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
    id ??= entries.some((entry) => entry.id === selected) ? selected : 'water';
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
    note(body, 'Loading…');
    try {
      if (id === 'water') await waterReady;
      if (id === 'camera') await ensureCamera();
      const value = await tool(id!);
      if (!alive || token !== generation) return;
      body.replaceChildren();
      if (!value) {
        note(body, 'Unknown tool.');
        return;
      }
      const unavailable = value.available();
      if (unavailable) note(body, unavailable);
      const parent = el('div');
      parent.dataset.devPanel = value.id;
      body.append(parent);
      const cleanup = await value.mount(parent, context);
      if (!alive || token !== generation) cleanup();
      else {
        disposePanel = cleanup;
        const info = more(body, 'Info');
        note(info, value.scope);
        if (settingsNotice) note(info, settingsNotice);
      }
    } catch (error) {
      if (token === generation) note(body, error instanceof Error ? error.message : String(error));
    }
  }
  select = show;
  refreshTabs = () => {
    tabs.replaceChildren();
    toolSelect.replaceChildren();
    for (const entry of entries) {
      const tab = button(entry.label, () => show(entry.id));
      tab.dataset.devTool = entry.id;
      tab.dataset.devTab = entry.id;
      tab.setAttribute('aria-controls', body.id);
      tab.setAttribute('aria-pressed', String(entry.id === selected));
      tabs.append(tab);
      const option = el('option', entry.label);
      option.value = entry.id;
      toolSelect.append(option);
    }
    toolSelect.value = selected ?? 'water';
  };
  refreshTabs();
  const positionLabel = el('label', 'Dock', 'dev-position');
  const positionSelect = el('select');
  positionSelect.setAttribute('aria-label', 'Dock position');
  positionSelect.dataset.devPosition = '';
  for (const side of ['left', 'right', 'bottom'] as const) {
    const option = el('option', side[0]!.toUpperCase() + side.slice(1));
    option.value = side;
    positionSelect.append(option);
  }
  positionSelect.value = position;
  positionSelect.onchange = () => {
    position = positionSelect.value as Position;
    layout();
  };
  positionLabel.append(positionSelect);
  bar.append(toolSelect, positionLabel);
  const hide = button('Collapse', () => collapse());
  hide.dataset.devCollapse = '';
  bar.append(hide);
  dock.append(bar, tabs, body);
  const play = button('Play · ` for mouse', () => {
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
  const reportStatus = el('span', '', 'dev-strip-status');
  reportStatus.setAttribute('role', 'status');
  const report = button('Report', async () => {
    const result = await run('report', 'copy');
    reportStatus.textContent = result.message;
    const data = result.data as { copied?: boolean } | undefined;
    if (!result.ok || !data?.copied) {
      await show('report');
      await run('report', 'read');
    }
  });
  report.dataset.devReport = '';
  strip.append(
    cameraButton,
    returnButton,
    report,
    button('Tools', () => show()),
    play,
    off,
  );
  strip.append(reportStatus);
  shell.append(strip, cameraControls, dock);
  document.body.append(shell);
  const pauseEntry = { id: 'dev', label: 'Dev', mount: () => () => {}, open: () => void show() };
  pausePages.push(pauseEntry);
  let shellEntity: ReturnType<typeof spawn> | null = null;
  const dispose = () => {
    if (!alive) return;
    alive = false;
    generation++;
    disposePanel();
    disposeCameraControls();
    cameraModule?.returnCamera();
    for (const value of loaded.values()) value.dispose?.();
    shell.remove();
    removeEventListener('dev-camera-change', updateCamera);
    removeEventListener('pagehide', dispose);
    removeEventListener('keydown', toggleMouse, { capture: true });
    window.removeEventListener('pointerdown', sceneFocus, { capture: true });
    pausePages.splice(pausePages.indexOf(pauseEntry), 1);
    devInput.cursor = devInput.dock = false;
    releaseInput();
    delete window.boogle.dev;
    select = null;
    refreshTabs = () => {};
    prepareCamera = null;
    if (shellEntity) despawn(shellEntity);
    shellEntity = null;
  };
  // ` (Backquote) frees or takes back the mouse. Esc can't: the browser spends the first press on the lock, and the next
  // opens Pause. A freed cursor stays free (scene clicks don't re-lock) until ` again or Play.
  const toggleMouse = (e: KeyboardEvent) => {
    if (e.code !== 'Backquote' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || !me.entered) return;
    if (modalOpen() || isTyping(e)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (document.pointerLockElement) {
      devInput.cursor = true;
      document.exitPointerLock();
    } else {
      devInput.cursor = false;
      (document.activeElement as HTMLElement | null)?.blur?.();
      devInput.dock = false;
      requestLock();
      canvas.focus({ preventScroll: true });
    }
  };
  addEventListener('keydown', toggleMouse, { capture: true });
  shellEntity = spawn({ kind: 'dev-dock', dispose });
  addEventListener('pagehide', dispose);
  window.boogle.dev = {
    tools: () =>
      allTools().map(({ id, label }) => ({
        id,
        label,
        scope: loaded.get(id)?.scope,
        commands: loaded.get(id)?.commands,
      })),
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
}
