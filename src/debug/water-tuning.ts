// The sea's look and the output's controls. Values belong to their renderer bindings, not this UI.
import { Color } from 'three/webgpu';
import { defineKind, spawn, despawn } from '../entity/entity.ts';
import { releaseInput, requestLock } from '../player/input.ts';
import { devInput } from '../player/dev-input.ts';
import { cancelCharge } from '../player/throw.ts';
import { releaseJump } from '../entities/player/state.ts';
import { waterReady } from '../render/water-render.ts';

import { bindings, bindingDefaults, type Value } from '../render/water/live.ts';
import { hasLookChoice } from '../render/water/looks.ts';

type Spec = { key: string; label: string; min: number; max: number; step: number; color?: boolean; toggle?: boolean };
type Group = { name: string; note?: string; specs: Spec[] };
const spec = (key: string, label: string, min: number, max: number, step = 0.01): Spec => ({
  key,
  label,
  min,
  max,
  step,
});
const color = (key: string, label: string): Spec => ({ ...spec(key, label, 0, 1), color: true });
const groups: Group[] = [
  {
    name: 'Water',
    note: 'Band levels are log2 texels per pixel of the first layer. Absorption is per metre: the underwater fog and the ground under the sea.',
    specs: [
      color('sun.shallow', 'shallow'),
      color('sun.middle', 'middle'),
      color('sun.deep', 'deep'),
      color('sun.foam', 'foam'),
      spec('sun.middleDepth', 'middle depth m', 0.5, 12, 0.1),
      spec('sun.deepDepth', 'deep depth m', 2, 40, 0.5),
      spec('sun.clearDepth', 'clear shallows m', 0, 6, 0.1),
      spec('sun.clearMin', 'waterline opacity', 0, 1),
      spec('sun.scale1', 'layer 1 tiles/m', 0.01, 0.4, 0.001),
      spec('sun.scale2', 'layer 2 tiles/m', 0.01, 0.4, 0.001),
      spec('sun.speed1', 'layer 1 scroll', -0.2, 0.2, 0.001),
      spec('sun.speed2', 'layer 2 scroll', -0.2, 0.2, 0.001),
      spec('sun.bandNear', 'band near', -3, 4),
      spec('sun.bandPeak', 'band peak', -2, 5),
      spec('sun.bandFar', 'band far', -1, 7),
      spec('sun.sparkle', 'sparkle', 0, 8),
      spec('sun.threshold', 'sparkle threshold', 0, 3),
      spec('sun.cling', 'cling-film lines', 0, 0.5),
      spec('sun.lane', 'sun lane cos', 0.7, 1, 0.001),
      spec('sun.laneGain', 'sun lane gain', 0, 10),
      spec('sun.reflect', 'sky reflection', 0, 2),
      spec('sun.foamDepth', 'foam lip m', 0, 1),
      spec('sun.edgeFoam', 'edge foam m', 0, 1.5),
      spec('sun.macro', 'macro variation', 0, 0.5),
      spec('sun.caustics', 'seabed caustics', 0, 8),
      spec('sun.causticLines', 'caustic lines', 0, 3),
      spec('water.caustics', 'caustics on the ground', 0, 2),
      spec('water.absorption', 'absorption RGB', 0.001, 3, 0.001),
    ],
  },
  {
    name: 'Sun & sky',
    note: 'Changing these rebakes the sky cube and matching lighting after editing. This can briefly stall; it is not a day/night cycle.',
    specs: [
      spec('sky.time', 'time of day', 0, 1, 0.001),
      spec('sky.elevation', 'elevation', -90, 90, 0.1),
      spec('sky.azimuth', 'azimuth', -180, 360, 0.5),
      spec('sky.sunIntensity', 'sunIntensity', 0, 20, 0.1),
      spec('sky.cloudCoverage', 'cloudCoverage', 0, 1),
      spec('sky.turbidity', 'turbidity', 1, 10, 0.1),
    ],
  },
  {
    name: 'Light fill',
    note: 'Local sun and open-shade fill only. No sky rebake; keep exposure locked while comparing.',
    specs: [
      spec('sky.keyGain', 'key gain', 0.5, 1.5),
      color('sky.keyTint', 'key tint'),
      spec('sky.fillGain', 'fill gain', 0.5, 4),
      color('sky.fillTint', 'fill tint'),
    ],
  },
  {
    name: 'Post',
    note: 'Bloom and exposure run before the active Looks curve. AgX controls affect AgX looks. Bloom starts off; first enable builds its filters and may briefly stall. Off or zero strength skips them.',
    specs: [
      { ...spec('post.bloom', 'bloom on', 0, 1, 1), toggle: true },
      spec('post.bloomStrength', 'bloomStrength', 0, 0.5, 0.001),
      spec('post.bloomThreshold', 'bloomThreshold', 0, 10),
      spec('post.centre', 'fixed gain', 0.01, 2, 0.001),

      spec('post.agxPower', 'agxPower', 0.5, 2),
      spec('post.agxSaturation', 'agxSaturation', 0, 2),
      spec('post.contrast', 'contrast', 0.7, 1.6),
      spec('post.saturation', 'saturation', 0, 2),
    ],
  },
  { name: 'Quality', specs: [spec('quality.resolution', 'resolution', 0.25, 1, 0.05)] },
];
const STORAGE = 'boogle.water-tuning.v1';
const UI_STORAGE = 'boogle.dev.water-ui.v1';
const clone = (v: Value): Value => (Array.isArray(v) ? [...v] : v);
const same = (a: Value, b: Value) => JSON.stringify(a) === JSON.stringify(b);
const node = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
};
defineKind('water-tuning', {});

let closeCurrent: (() => void) | null = null;
let visit = 0;
export async function showWaterTuning(
  restorePointer: () => void,
  parent: HTMLElement = document.body,
  retainAppearance = false,
) {
  const token = ++visit;
  closeCurrent?.();
  await waterReady;
  if (token !== visit) {
    restorePointer();
    return () => {};
  }
  const panel = node('section');
  panel.dataset.waterPanel = '';
  panel.setAttribute('aria-label', 'Water tuning');
  const style = node(
    'style',
    `
    [data-water-panel] { position:fixed; z-index:110; top:12px; right:12px; width:300px; max-width:calc(100vw - 24px);
      max-height:calc(100dvh - 24px); overflow:auto; padding:12px; border:1px solid #ffffff40; border-radius:14px;
      background:#17252af0; color:#edf3e8; box-shadow:0 6px 24px #0006; font:12px/1.4 system-ui,sans-serif;
      pointer-events:auto; overscroll-behavior:contain; text-align:left; box-sizing:border-box; }
    [data-water-panel] * { box-sizing:border-box; }
    [data-water-panel] h2 { margin:0; font-size:16px; }
    [data-water-panel] p { margin:7px 0; color:#c7d5d0; }
    [data-water-panel] button { min-height:44px; cursor:pointer; color:inherit; background:#ffffff13; border:1px solid #ffffff35;
      border-radius:7px; padding:5px 8px; font:inherit; }
    [data-water-panel] button:hover { background:#ffffff28; }
    [data-water-panel] button:focus-visible, [data-water-panel] input:focus-visible,
    [data-water-panel] textarea:focus-visible, [data-water-panel] select:focus-visible,
    [data-water-panel] summary:focus-visible { outline:2px solid #b7e4c7; outline-offset:2px; }
    [data-water-panel] details { margin-top:7px; border-top:1px solid #ffffff25; padding-top:7px; }
    [data-water-panel] summary { min-height:44px; cursor:pointer; font-weight:700; padding:3px 0; }
    [data-water-panel] input { min-height:44px; }
    [data-water-panel] select { min-height:44px; color:inherit; background:#0c181d; font:inherit; border-radius:5px; }
    [data-water-panel] .water-control { display:grid; grid-template-columns:28px minmax(0,1fr); gap:4px; align-items:start; }
    [data-water-panel] .water-control > div { min-width:0; }
    [data-water-panel] .water-row { display:grid; grid-template-columns:minmax(60px,.9fr) minmax(35px,1fr) 52px; align-items:center; gap:4px; margin:2px 0; min-width:0; }
    [data-water-panel] .water-row label { min-width:0; overflow-wrap:anywhere; font-size:11px; }
    [data-water-panel] .water-row input[type=range] { width:100%; min-width:0; margin:0; padding:0; accent-color:#b7e4c7; }
    [data-water-panel] .water-row-simple { grid-template-columns:minmax(0,1fr) 52px; }
    [data-water-panel] .water-row:has([data-water-reset]:not([hidden])) { grid-template-columns:minmax(55px,.9fr) minmax(30px,1fr) 48px 26px; }
    [data-water-panel] .water-row-simple:has([data-water-reset]:not([hidden])) { grid-template-columns:minmax(0,1fr) 52px 26px; }
    [data-water-panel] [data-water-reset] { padding:0; font-size:16px; min-width:26px; }
    [data-water-panel] [data-water-pin] { padding:0; width:28px; color:#a4b9b4; font-size:17px; }
    [data-water-panel] [data-water-pin][aria-pressed=true] { color:#f6db8a; }
    [data-water-panel] [data-water-search] { width:100%; min-width:0; margin:0 0 3px; padding:5px 7px; }
    [data-water-panel] .water-count { display:flex; align-items:center; justify-content:space-between; gap:5px; }
    [data-water-panel] [data-water-changed] { font-size:11px; color:#b3c6c0; }
    [data-water-panel] [hidden] { display:none !important; }
    [data-water-panel] .water-agx { display:flex; align-items:center; justify-content:space-between; gap:6px; }
    [data-water-panel] input[type=number], [data-water-panel] textarea { width:100%; min-width:0; border:1px solid #ffffff35;
      color:inherit; background:#0c181d; border-radius:5px; padding:4px; font:inherit; }
    [data-water-panel] input[type=color] { width:52px; height:26px; border:0; padding:0; background:none; }
    [data-water-panel] textarea { min-height:90px; resize:vertical; font:11px/1.4 ui-monospace,monospace; }
    [data-water-panel] .water-actions { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0; }
    [data-water-panel] [role=status] { min-height:1.4em; color:#d5edbc; overflow-wrap:anywhere; }
    [data-water-panel] [role=status]:empty { display:none; }
    @media (pointer:fine) and (min-width:701px) {
      [data-water-panel] button, [data-water-panel] input, [data-water-panel] select, [data-water-panel] summary { min-height:28px; }
      [data-water-panel] summary { padding:4px 0; }
      [data-water-panel] .water-row input { padding:3px; font-size:11px; }
    }
    @media (pointer:coarse), (max-width:700px) {
      [data-water-panel] .water-control { grid-template-columns:44px minmax(0,1fr); }
      [data-water-panel] [data-water-pin] { width:44px; }
      [data-water-panel] .water-row { grid-template-columns:minmax(55px,.9fr) minmax(30px,1fr) 50px; }
      [data-water-panel] .water-row:has([data-water-reset]:not([hidden])) { grid-template-columns:minmax(40px,.9fr) minmax(25px,1fr) 45px 44px; }
      [data-water-panel] .water-row-simple:has([data-water-reset]:not([hidden])) { grid-template-columns:minmax(0,1fr) 52px 44px; }
    }
  `,
  );
  document.head.append(style);
  parent.append(panel);
  let removeStatusListener = () => {};
  let restoreOverrides = () => {};
  let playToggle: HTMLButtonElement | null = null;
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    panel.remove();
    playToggle?.remove();
    if (parent === document.body) devInput.cursor = false;
    style.remove();
    removeStatusListener();
    restoreOverrides();
    restorePointer();
    if (closeCurrent === close) closeCurrent = null;
  };
  const entity = spawn({
    kind: 'water-tuning',
    dispose: cleanup,
  });
  const close = () => {
    cleanup();
    despawn(entity);
  };
  closeCurrent = close;
  const release = () => {
    releaseInput();
    releaseJump();
    cancelCharge();
  };
  panel.addEventListener('focusin', release);
  panel.addEventListener('pointerdown', release);
  for (const event of [
    'keydown',
    'keyup',
    'keypress',
    'pointerdown',
    'pointerup',
    'pointermove',
    'pointercancel',
    'mousedown',
    'mouseup',
    'mousemove',
    'click',
    'dblclick',
    'wheel',
    'touchstart',
    'touchmove',
    'touchend',
  ])
    panel.addEventListener(event, (e) => e.stopPropagation());
  const more = node('details');
  more.dataset.waterSection = 'More';
  const moreContent = node('div');
  more.append(node('summary', 'More'), moreContent);
  if (parent === document.body) panel.append(node('h2', 'Water tuning'));
  const closeButton = node('button', 'Close water tuning');
  closeButton.type = 'button';
  closeButton.addEventListener('click', close);
  if (parent === document.body) panel.append(closeButton);
  if (parent === document.body) {
    devInput.cursor = true;
    if (document.pointerLockElement) document.exitPointerLock();
    playToggle = node('button', 'Play · ` for mouse');
    playToggle.type = 'button';
    playToggle.dataset.waterPlay = '';
    playToggle.style.cssText =
      'position:fixed;z-index:111;left:12px;top:12px;min-height:44px;padding:8px;border-radius:8px;pointer-events:auto';
    playToggle.onclick = () => {
      panel.hidden = !panel.hidden;
      devInput.cursor = !panel.hidden;
      release();
      playToggle!.textContent = panel.hidden ? 'Water · ` for mouse' : 'Play · ` for mouse';
      if (panel.hidden) requestLock();
      else if (document.pointerLockElement) document.exitPointerLock();
    };
    document.body.append(playToggle);
  }
  moreContent.append(
    node('p', 'Only your view. The game keeps running. Saved settings apply only in Dev or tuning visits.'),
  );
  moreContent.append(
    node(
      'p',
      parent === document.body
        ? 'Drag the scene to look; the cursor stays free while tuning.'
        : 'Drag the scene with Free cam, or click the scene to play. Play hides the dock; Esc gives the mouse back.',
    ),
  );

  const available = groups.flatMap((g) => g.specs).filter((s) => bindings.has(s.key));
  const byKey = new Map(available.map((s) => [s.key, s]));
  const knownGroups = new Set([...groups.map((g) => g.name), 'Pinned', 'More']);
  const pinned = new Set<string>(),
    openGroups = new Set<string>();
  try {
    const saved = JSON.parse(localStorage.getItem(UI_STORAGE) ?? 'null') as {
      version?: number;
      pinned?: unknown[];
      open?: unknown[];
    } | null;
    if (saved?.version === 1) {
      if (Array.isArray(saved.pinned))
        for (const key of saved.pinned) if (typeof key === 'string' && byKey.has(key)) pinned.add(key);
      if (Array.isArray(saved.open))
        for (const name of saved.open) if (typeof name === 'string' && knownGroups.has(name)) openGroups.add(name);
    }
  } catch {
    /* Optional UI preferences do not affect the sea. */
  }
  const saveUi = () => {
    try {
      localStorage.setItem(UI_STORAGE, JSON.stringify({ version: 1, pinned: [...pinned], open: [...openGroups] }));
    } catch {
      /* The current panel remains usable without storage. */
    }
  };
  saveUi();
  const previous = new Map(available.map((s) => [s.key, clone(bindings.get(s.key)!.get())]));
  const defaults = new Map(available.map((s) => [s.key, clone(bindingDefaults.get(s.key)!)]));
  if (parent !== document.body && !retainAppearance)
    restoreOverrides = () => {
      for (const [key, value] of previous) bindings.get(key)?.set(clone(value));
    };
  const refreshers: (() => void)[] = [];
  const status = node('p');
  status.setAttribute('role', 'status');
  const say = (message: string) => {
    status.textContent = message;
  };
  const onStatus = (event: Event) => say((event as CustomEvent<string>).detail);
  window.addEventListener('water-tuning-status', onStatus);
  removeStatusListener = () => window.removeEventListener('water-tuning-status', onStatus);
  const json = node('textarea');
  json.setAttribute('aria-label', 'Water settings JSON');
  json.dataset.waterJson = '';
  json.spellcheck = false;
  const snapshot = () => {
    const changes: Record<string, Value> = {};
    for (const [key, initial] of defaults) {
      const value = bindings.get(key)!.get();
      if (!same(value, initial)) changes[key] = clone(value);
    }
    return { version: 1, changes };
  };
  const persist = () => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(snapshot()));
    } catch {
      say('Settings apply, but browser storage is unavailable. Copy them before leaving.');
    }
  };
  const refresh = () => {
    for (const f of refreshers) f();
  };
  const set = (s: Spec, value: Value) => {
    bindings.get(s.key)!.set(value);
    refresh();
    persist();
  };
  const button = (label: string, action: () => void, key?: string) => {
    const b = node('button', label);
    b.type = 'button';
    if (key) b.dataset.waterAction = key;
    b.addEventListener('click', action);
    return b;
  };
  const reset = (specs: Spec[]) => {
    for (const s of specs) {
      const initial = defaults.get(s.key);
      if (initial !== undefined && !same(bindings.get(s.key)!.get(), initial)) bindings.get(s.key)!.set(clone(initial));
    }
    refresh();
    persist();
    say('Defaults restored.');
  };
  const search = node('input');
  search.type = 'search';
  search.placeholder = 'Search water controls';
  search.dataset.waterSearch = '';
  search.setAttribute('aria-label', 'Search water controls');
  panel.append(search);
  const changed = (specs: Spec[]) =>
    specs.filter((s) => !same(bindings.get(s.key)!.get(), defaults.get(s.key)!)).length;
  const counts = node('div');
  counts.className = 'water-count';
  const count = node('span');
  count.dataset.waterChanged = '';
  const resetAll = button('Reset changes', () => reset(available), 'reset');
  counts.append(count);
  panel.append(counts);
  moreContent.append(resetAll);
  refreshers.push(() => {
    const total = changed(available);
    count.textContent = `${total} changed`;
    resetAll.hidden = total === 0;
    counts.hidden = total === 0;
  });
  const pinGroup = node('details');
  pinGroup.dataset.waterSection = 'Pinned';
  const pinSummary = node('summary', 'Pinned');
  const pinBody = node('div');
  pinGroup.append(pinSummary, pinBody);
  panel.append(pinGroup);
  type Control = { key: string; element: HTMLElement; home: HTMLElement; search: string; pin: HTMLButtonElement };
  const controls: Control[] = [];
  const sections: { name: string; details: HTMLDetailsElement; body: HTMLElement; extra?: HTMLElement }[] = [];
  const programmaticOpen = new WeakMap<HTMLDetailsElement, boolean>();
  const setOpen = (details: HTMLDetailsElement, open: boolean) => {
    if (details.open === open) return;
    programmaticOpen.set(details, open);
    details.open = open;
  };
  const rememberOpen = (details: HTMLDetailsElement, name: string) => {
    setOpen(details, openGroups.has(name));
    details.addEventListener('toggle', () => {
      const expected = programmaticOpen.get(details);
      programmaticOpen.delete(details);
      if (expected === details.open) return;
      if (search.value.trim()) return;
      if (details.open) openGroups.add(name);
      else openGroups.delete(name);
      saveUi();
    });
  };
  rememberOpen(pinGroup, 'Pinned');
  rememberOpen(more, 'More');
  const layout = () => {
    const query = search.value.trim().toLowerCase();
    for (const control of controls) {
      const isPinned = pinned.has(control.key);
      const target = isPinned ? pinBody : control.home;
      if (control.element.parentElement !== target) target.append(control.element);
      control.element.hidden = !!query && !control.search.includes(query);
      control.pin.textContent = isPinned ? '★' : '☆';
      control.pin.setAttribute('aria-pressed', String(isPinned));
    }
    for (const section of sections) {
      const hasRows = [...section.body.children].some((child) => !(child as HTMLElement).hidden);
      if (section.extra) section.extra.hidden = !!query && !'post agx look current stock punchy custom'.includes(query);
      const hasExtra = !!section.extra && !section.extra.hidden;
      section.details.hidden = !hasRows && !hasExtra;
      setOpen(section.details, query ? hasRows || hasExtra : openGroups.has(section.name));
    }
    const visiblePins = [...pinBody.children].filter((child) => !(child as HTMLElement).hidden).length;
    pinGroup.hidden = !visiblePins;
    pinSummary.textContent = `Pinned · ${pinned.size}`;
    setOpen(pinGroup, query ? !!visiblePins : openGroups.has('Pinned'));
    const rareMatch = sections.some((s) => more.contains(s.details) && !s.details.hidden);
    moreContent.hidden = !!query;
    more.hidden = !!query && !rareMatch;
    setOpen(more, query ? rareMatch : openGroups.has('More'));
  };
  search.addEventListener('input', layout);
  for (const group of groups) {
    const specs = group.specs.filter((s) => bindings.has(s.key));
    if (!specs.length) continue;
    const details = node('details');
    details.dataset.waterSection = group.name;
    rememberOpen(details, group.name);
    const summary = node('summary', group.name);
    details.append(summary);
    if (group.note) moreContent.append(node('p', `${group.name}: ${group.note}`));
    const groupReset = button(`Reset ${group.name}`, () => reset(specs));
    groupReset.dataset.waterGroup = group.name;
    moreContent.append(groupReset);
    refreshers.push(() => {
      const total = changed(specs);
      summary.textContent = group.name + (total ? ` · ${total} changed` : '');
      groupReset.hidden = total === 0;
    });
    const body = node('div');
    const section: (typeof sections)[number] = { name: group.name, details, body };
    sections.push(section);
    if (group.name === 'Post' && bindings.has('post.agxPower') && bindings.has('post.agxSaturation')) {
      const looks = [
        { name: 'Current', power: 1.12, saturation: 1.3 },
        { name: 'Stock AgX', power: 1, saturation: 1 },
        { name: 'Punchy', power: 1.35, saturation: 1.4 },
      ];
      const row = node('label', 'AgX look ');
      row.className = 'water-agx';
      const select = node('select');
      select.setAttribute('aria-label', 'AgX look');
      for (const look of looks) select.append(node('option', look.name));
      const custom = node('option', 'Custom');
      custom.disabled = true;
      select.append(custom);
      refreshers.push(() => {
        select.value =
          looks.find(
            (look) =>
              look.power === bindings.get('post.agxPower')!.get() &&
              look.saturation === bindings.get('post.agxSaturation')!.get(),
          )?.name ?? 'Custom';
      });
      select.addEventListener('change', () => {
        const look = looks.find((look) => look.name === select.value);
        if (!look) return;
        bindings.get('post.agxPower')!.set(look.power);
        bindings.get('post.agxSaturation')!.set(look.saturation);
        refresh();
        persist();
      });
      row.append(select);
      details.append(row);
      section.extra = row;
    }
    for (const s of specs) {
      const initial = defaults.get(s.key)!;
      const resetControl = button('↺', () => reset([s]));
      resetControl.dataset.waterReset = s.key;
      resetControl.setAttribute('aria-label', `Reset ${s.label}`);
      resetControl.title = `Reset ${s.label}`;
      refreshers.push(() => {
        resetControl.hidden = same(bindings.get(s.key)!.get(), initial);
      });
      const wrapper = node('div');
      wrapper.className = 'water-control';
      wrapper.dataset.waterControl = s.key;
      const fields = node('div');
      const pin = button('☆', () => {
        if (pinned.has(s.key)) pinned.delete(s.key);
        else {
          pinned.add(s.key);
          openGroups.add('Pinned');
        }
        saveUi();
        layout();
      });
      pin.dataset.waterPin = s.key;
      pin.setAttribute('aria-label', `Pin ${s.label}`);
      pin.title = `Pin ${s.label}`;
      wrapper.append(pin, fields);
      body.append(wrapper);
      controls.push({
        key: s.key,
        element: wrapper,
        home: body,
        search: `${group.name} ${s.label} ${s.key}`.toLowerCase(),
        pin,
      });
      if (s.toggle) {
        const row = node('div');
        row.className = 'water-row water-row-simple';
        const label = node('label', s.label);
        const input = node('input');
        input.type = 'checkbox';
        input.id = `water-${token}-${s.key}`;
        label.htmlFor = input.id;
        input.dataset.waterKey = s.key;
        input.setAttribute('aria-label', s.label);
        refreshers.push(() => {
          input.checked = bindings.get(s.key)!.get() === 1;
        });
        input.addEventListener('change', () => set(s, Number(input.checked)));
        row.append(label, input, resetControl);
        fields.append(row);
      } else if (s.color) {
        const row = node('div');
        row.className = 'water-row water-row-simple';
        const label = node('label', s.label);
        const input = node('input');
        input.type = 'color';
        input.id = `water-${token}-${s.key}`;
        label.htmlFor = input.id;
        input.dataset.waterKey = s.key;
        input.setAttribute('aria-label', s.label);
        refreshers.push(() => {
          input.value = '#' + new Color().fromArray(bindings.get(s.key)!.get() as number[]).getHexString();
        });
        input.addEventListener('input', () => set(s, new Color(input.value).toArray()));
        row.append(label, input, resetControl);
        fields.append(row);
      } else {
        const components = Array.isArray(initial) ? initial.length : 1;
        for (let c = 0; c < components; c++) {
          const row = node('div');
          row.className = 'water-row';
          const label = s.label + (components > 1 ? ` ${'RGB'[c]}` : '');
          const labelNode = node('label', label);
          const number = node('input');
          number.type = 'number';
          number.dataset.waterKey = s.key;
          if (components > 1) number.dataset.waterComponent = String(c);
          const range = node('input');
          range.type = 'range';
          range.dataset.waterSlider = s.key;
          range.id = `water-${token}-${s.key}-${c}`;
          labelNode.htmlFor = range.id;
          for (const input of [number, range]) {
            input.min = String(s.min);
            input.max = String(s.max);
            input.step = String(s.step);
            input.setAttribute('aria-label', label + (input === range ? ' slider' : ''));
            input.addEventListener('input', () => {
              const value = input.valueAsNumber;
              if (!Number.isFinite(value) || value < s.min || value > s.max) return;
              if (components === 1) set(s, value);
              else {
                const values = [...(bindings.get(s.key)!.get() as number[])];
                values[c] = value;
                set(s, values);
              }
            });
          }
          refreshers.push(() => {
            const current = bindings.get(s.key)!.get();
            const value = Array.isArray(current) ? current[c]! : current;
            number.value = String(value);
            range.value = String(value);
          });
          row.append(labelNode, range, number);
          if (c === 0) row.append(resetControl);
          fields.append(row);
        }
      }
    }
    details.append(body);
    if (group.name === 'Quality') more.insertBefore(details, moreContent);
    else panel.append(details);
  }
  const parse = (text: string, saved = false) => {
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a settings object.');
    const data = value as Record<string, unknown>;
    if (data.version !== 1 || Object.keys(data).some((key) => key !== 'version' && key !== 'changes'))
      throw new Error('Expected version 1 and changes.');
    if (!data.changes || typeof data.changes !== 'object' || Array.isArray(data.changes))
      throw new Error('Expected a changes object.');
    const changes: Record<string, Value> = {};
    for (const [key, candidate] of Object.entries(data.changes)) {
      const s = byKey.get(key),
        initial = defaults.get(key);
      if (!s || initial === undefined) {
        if (saved) continue;
        throw new Error(`Unknown setting: ${key}`);
      }
      const validNumber = (n: unknown): n is number =>
        typeof n === 'number' && Number.isFinite(n) && n >= s.min && n <= s.max;
      if (Array.isArray(initial)) {
        if (!Array.isArray(candidate) || candidate.length !== initial.length || !candidate.every(validNumber)) {
          if (saved) continue;
          throw new Error(`Invalid RGB value: ${key}`);
        }
        changes[key] = [...candidate] as number[];
      } else {
        if (!validNumber(candidate) || (s.toggle && candidate !== 0 && candidate !== 1)) {
          if (saved) continue;
          throw new Error(`Out of range: ${key} (${s.min}–${s.max})`);
        }
        changes[key] = candidate;
      }
    }
    return changes;
  };
  const apply = (changes: Record<string, Value>) => {
    for (const [key, initial] of defaults) bindings.get(key)!.set(clone(changes[key] ?? initial));
    refresh();
    persist();
  };
  const transfer = node('details');
  transfer.append(node('summary', 'Copy / paste settings'));
  transfer.append(
    node(
      'p',
      'One JSON block containing only changes from production defaults. Paste replaces your current overrides.',
    ),
  );
  const transferActions = node('div');
  transferActions.className = 'water-actions';
  transferActions.append(
    button(
      'Copy settings',
      () => {
        json.value = JSON.stringify(snapshot(), null, 2);
        transfer.open = true;
        json.focus();
        json.select();
        void navigator.clipboard?.writeText(json.value).then(
          () => say('Settings copied.'),
          () => say('Select and copy the JSON below; clipboard permission was unavailable.'),
        );
        if (!navigator.clipboard) say('Select and copy the JSON below.');
      },
      'copy',
    ),
  );
  transferActions.append(
    button(
      'Apply settings',
      () => {
        try {
          apply(parse(json.value));
          say('Pasted settings applied.');
        } catch (e) {
          say(e instanceof Error ? e.message : 'Invalid settings.');
        }
      },
      'paste',
    ),
  );
  transfer.append(transferActions, json);
  moreContent.append(transfer);
  const limits = node('details');
  limits.append(node('summary', 'Not live controls'));
  limits.append(
    node(
      'p',
      'The sea grid, the coast texture and the wave and caustic tiles are built once; MSAA and auto resolution belong to the shared renderer. Neutral is the production curve; AgX stays a comparison.',
    ),
  );
  const unavailable = groups.flatMap((group) => group.specs).filter((s) => !bindings.has(s.key));
  if (unavailable.length)
    limits.append(node('p', `No live production binding: ${unavailable.map((s) => s.label).join(', ')}.`));
  const restored = node('p');
  moreContent.append(limits, restored);
  panel.append(more, status);
  layout();
  refresh();
  try {
    const saved = localStorage.getItem(STORAGE);
    if (saved && !hasLookChoice()) {
      apply(parse(saved, true));
      restored.textContent = 'Supported saved viewer settings restored; unsupported settings dropped.';
    } else if (hasLookChoice()) {
      restored.textContent = 'The selected Look owns this visit; older Water overrides were not reapplied.';
    }
  } catch (e) {
    try {
      localStorage.removeItem(STORAGE);
    } catch {
      /* storage unavailable */
    }
    say(`Saved settings not applied: ${e instanceof Error ? e.message : 'storage unavailable'}`);
  }
  return close;
}
