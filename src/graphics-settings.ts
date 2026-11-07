// Local settings only. Resource owners register bounded adapters; this module never imports rendering or Dev UI.
import { devEnabled } from './dev-preferences.ts';

export type GraphicsValue = boolean | number | string;
export type GraphicsAdapter = {
  id: string;
  label: string;
  choices: readonly GraphicsValue[];
  default: GraphicsValue;
  audience?: 'dev';
  scope?: 'Local';
  applyMode: 'live' | 'rebuild' | 'reload';
  cost: string;
  skips: string;
  hitch?: string;
  available?(): string | null;
  read(): GraphicsValue;
  apply(value: GraphicsValue): void | Promise<void>;
  prepare?(value: GraphicsValue): void | Promise<void>;
};
const KEY = 'boogle.dev.graphics.v1';
const PLAYER_KEY = 'boogle.graphics.v1';
// Deliberate player allow-list: no look, gameplay or unverified cosmetic switches.
const playerChoices: Record<string, readonly GraphicsValue[]> = {
  resolution: ['auto', 1, 0.8, 0.6],
  frameLimit: ['display', 60, 30],
  msaa: [true, false],
  caustics: [true, false],
  detail: ['auto', 'full', 'sea', 'shadows', 'lowest'],
};
// Owner call, 7 November 2026: a device that must shed load drops render resolution first (features/adaptive-res.ts),
// then sea detail, then sun shadows, then scene MSAA. Each rung keeps the ones before it. `detail` Auto lets the
// frame-time governor in adaptive-res.ts pick the rung; any other choice fixes it. Explicit Dev/player values win.
export const DETAIL_RUNGS = ['full', 'sea', 'shadows', 'lowest'] as const;
const DETAIL_CHOICES: readonly GraphicsValue[] = ['auto', ...DETAIL_RUNGS];
const RUNG_VALUES: readonly Record<string, GraphicsValue>[] = [
  {},
  { seaDetail: 'low' },
  { seaDetail: 'low', shadows: false },
  { seaDetail: 'low', shadows: false, msaa: false },
];
const AUTO_KEY = 'boogle.detail.v1'; // the governor's rung on this device, so the next visit starts there
// MSAA is reload-only, so the governor's last rung is a sticky flag for the next load rather than a live rung.
let auto = { rung: 0, msaaOff: false };
// The look/scenario harness (?dpr=fixed) keeps comparable images: no remembered rung.
if (new URLSearchParams(location.search).get('dpr') !== 'fixed')
  try {
    const saved = JSON.parse(localStorage.getItem(AUTO_KEY) ?? 'null');
    if (Number.isInteger(saved?.rung) && saved.rung >= 0 && saved.rung <= 2)
      auto = { rung: saved.rung, msaaOff: saved.msaaOff === true };
  } catch {
    /* Storage is optional. */
  }
const graphicsPresets = {
  quality: { resolution: 1, frameLimit: 60, caustics: true },
  performance: { resolution: 0.8, frameLimit: 60, caustics: true },
  battery: { resolution: 0.6, frameLimit: 30, caustics: true },
} satisfies Record<string, Record<string, GraphicsValue>>;
let playerValues: Record<string, GraphicsValue> = {};
let preset = 'auto';
let storageFailed = false;
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((fn) => fn());
export function onGraphicsChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
try {
  const saved = JSON.parse(localStorage.getItem(PLAYER_KEY) ?? 'null');
  if (saved?.version === 1 && saved.values && typeof saved.values === 'object') {
    for (const [id, value] of Object.entries(saved.values))
      if (playerChoices[id]?.includes(value as GraphicsValue)) playerValues[id] = value as GraphicsValue;
    if (Object.keys(playerValues).length) {
      preset = 'custom';
      for (const [name, values] of Object.entries(graphicsPresets))
        if (saved.preset === name && Object.entries(values).every(([id, value]) => playerValues[id] === value))
          preset = name;
    }
  }
} catch {
  /* Storage is optional. */
}
function savePlayer() {
  storageFailed = false;
  try {
    if (Object.keys(playerValues).length)
      localStorage.setItem(PLAYER_KEY, JSON.stringify({ version: 1, preset, values: playerValues }));
    else localStorage.removeItem(PLAYER_KEY);
  } catch {
    storageFailed = true;
  }
}
export const playerGraphics = () => ({ preset, values: { ...playerValues }, storageFailed });
const owners = new Map<string, GraphicsAdapter>();
const errors = new Map<string, string>();
let overrides: Record<string, GraphicsValue> = {};
if (devEnabled) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (saved?.version === 1 && saved.values && typeof saved.values === 'object') {
      for (const [id, value] of Object.entries(saved.values))
        if (
          typeof value === 'boolean' ||
          typeof value === 'string' ||
          (typeof value === 'number' && Number.isFinite(value))
        )
          overrides[id] = value;
    }
  } catch {
    // Storage is optional; no global/player preference is consumed here.
  }
  const msaa = new URLSearchParams(location.search).get('graphicsMsaa');
  if (msaa === '0' || msaa === '1') overrides.msaa = msaa === '1';
  // ?graphics=id:value,id:value: Dev overrides for matched captures and the bench (saved only if Dev then changes one).
  for (const pair of (new URLSearchParams(location.search).get('graphics') ?? '').split(',')) {
    const [id, raw] = pair.split(':');
    if (!id || raw === undefined) continue;
    overrides[id] = raw === 'true' ? true : raw === 'false' ? false : Number.isFinite(Number(raw)) ? Number(raw) : raw;
  }
}
// Reload-only comparison stays reproducible when storage is unavailable. Never consume this flag without Dev.
function syncMsaaUrl(value: GraphicsValue | undefined, explicit = false) {
  const url = new URL(location.href);
  if (!explicit && !url.searchParams.has('graphicsMsaa')) return;
  if (typeof value === 'boolean') url.searchParams.set('graphicsMsaa', value ? '1' : '0');
  else url.searchParams.delete('graphicsMsaa');
  history.replaceState(history.state, '', url);
}
function save() {
  try {
    if (Object.keys(overrides).length) localStorage.setItem(KEY, JSON.stringify({ version: 1, values: overrides }));
    else localStorage.removeItem(KEY);
  } catch {
    /* private storage */
  }
}
function explicitValue(id: string, choices: readonly GraphicsValue[]) {
  const dev = devEnabled ? overrides[id] : undefined;
  if (dev !== undefined && choices.includes(dev)) return dev;
  const value = playerValues[id];
  return value !== undefined && choices.includes(value) ? value : undefined;
}
/** What the detail ladder asks of other owners now: the fixed rung, or the governor's under Auto. */
function rungValues(): Record<string, GraphicsValue> {
  const pick = explicitValue('detail', DETAIL_CHOICES) ?? 'auto';
  const fixed = DETAIL_RUNGS.indexOf(pick as (typeof DETAIL_RUNGS)[number]);
  if (fixed >= 0) return RUNG_VALUES[fixed]!;
  return { ...RUNG_VALUES[auto.rung], ...(auto.msaaOff ? { msaa: false } : {}) };
}
export function graphicsInitial(id: string, choices: readonly GraphicsValue[], baseline: GraphicsValue) {
  const value = explicitValue(id, choices);
  if (value !== undefined) return value;
  const rung = rungValues()[id];
  return rung !== undefined && choices.includes(rung) ? rung : baseline;
}
/** The governor's state, and whether Auto is in charge (no fixed Detail choice). */
export const autoDetail = () => ({
  ...auto,
  governing: (explicitValue('detail', DETAIL_CHOICES) ?? 'auto') === 'auto',
});
/** Allocation-free, for the governor's frame check. */
export const autoRung = () => auto.rung;
/** The governor moves its rung; owners the ladder names follow unless something explicit holds them. */
export function setAutoDetail(rung: number, msaaOff: boolean) {
  const next = { rung: Math.max(0, Math.min(2, Math.round(rung))), msaaOff };
  if (next.rung === auto.rung && next.msaaOff === auto.msaaOff) return;
  auto = next;
  try {
    if (auto.rung || auto.msaaOff) localStorage.setItem(AUTO_KEY, JSON.stringify(auto));
    else localStorage.removeItem(AUTO_KEY);
  } catch {
    /* Storage is optional. */
  }
  void reapplyAll();
}
async function reapplyAll() {
  try {
    for (const owner of owners.values())
      await apply(owner, graphicsInitial(owner.id, owner.choices, owner.default)).catch(() => {});
  } finally {
    changed();
  }
}
async function apply(owner: GraphicsAdapter, value: GraphicsValue) {
  errors.delete(owner.id);
  if (owner.applyMode === 'reload' || owner.read() === value) return;
  try {
    await owner.prepare?.(value);
    await owner.apply(value);
  } catch (error) {
    errors.set(owner.id, String(error));
    throw error;
  }
}
export function registerGraphics(owner: GraphicsAdapter) {
  if (owners.has(owner.id)) throw new Error(`Graphics owner already registered: ${owner.id}`);
  if (!owner.choices.includes(owner.default)) throw new Error(`Invalid graphics baseline: ${owner.id}`);
  owners.set(owner.id, owner);
  const saved = overrides[owner.id];
  if (saved !== undefined && !owner.choices.includes(saved)) {
    delete overrides[owner.id];
    save();
  }
  const value = graphicsInitial(owner.id, owner.choices, owner.default);
  const explicit =
    (devEnabled && overrides[owner.id] !== undefined) ||
    playerValues[owner.id] !== undefined ||
    rungValues()[owner.id] !== undefined;
  if (explicit && !owner.available?.())
    void apply(owner, value)
      .catch(() => {})
      .finally(changed);
  changed();
  return () => {
    if (owners.get(owner.id) === owner) owners.delete(owner.id);
    errors.delete(owner.id);
    changed();
  };
}
export function graphicsSnapshot() {
  return [...owners.values()].map((owner) => {
    const effective = owner.read();
    const requested = graphicsInitial(owner.id, owner.choices, owner.default);
    const reason = owner.available?.() ?? null;
    return {
      id: owner.id,
      label: owner.label,
      choices: owner.choices,
      baseline: owner.default,
      audience: playerChoices[owner.id] ? 'player' : 'dev',
      scope: 'Local' as const,
      persistence: playerChoices[owner.id] ? 'Local player and Dev' : 'Dev only',
      playerRequested: playerValues[owner.id] ?? owner.default,
      devOverride: devEnabled && overrides[owner.id] !== undefined,
      applyMode: owner.applyMode,
      cost: owner.cost,
      skips: owner.skips,
      hitch: owner.hitch ?? null,
      available: reason === null,
      reason,
      requested,
      effective,
      pending: requested !== effective,
      error: errors.get(owner.id) ?? null,
    };
  });
}
export async function setGraphics(id: string, value: GraphicsValue) {
  const owner = owners.get(id);
  if (!devEnabled || !owner) throw new Error(`Graphics setting unavailable: ${id}`);
  if (!owner.choices.includes(value)) throw new Error(`Invalid value for ${id}`);
  const reason = owner.available?.();
  if (reason) throw new Error(reason);
  overrides[id] = value;
  if (id === 'msaa') syncMsaaUrl(value, true);
  save();
  await apply(owner, value);
  if (id === 'detail') await reapplyAll();
  changed();
  return graphicsSnapshot().find((row) => row.id === id)!;
}
export const graphicsOverrides = () => ({ ...overrides });
export async function restoreGraphics(values: Record<string, GraphicsValue>) {
  overrides = {};
  for (const [id, value] of Object.entries(values)) {
    const owner = owners.get(id);
    if (!owner || owner.choices.includes(value)) overrides[id] = value;
  }
  syncMsaaUrl(overrides.msaa);
  save();
  const failures: unknown[] = [];
  // Availability gates user edits, not restoring the owner's setting for a later preset.
  for (const owner of owners.values()) {
    try {
      await apply(owner, graphicsInitial(owner.id, owner.choices, owner.default));
    } catch (error) {
      failures.push(error);
    }
  }
  changed();
  if (failures.length) throw new AggregateError(failures, 'Some graphics owners could not restore; see their errors.');
}
export const resetGraphics = () => restoreGraphics({});

async function applyPlayer() {
  savePlayer();
  try {
    // Every owner: a Detail choice moves owners that are not player choices themselves (sea detail, shadows).
    for (const owner of owners.values()) await apply(owner, graphicsInitial(owner.id, owner.choices, owner.default));
  } finally {
    changed();
  }
}
export async function setPlayerGraphics(id: string, value: GraphicsValue) {
  const owner = owners.get(id);
  if (!owner || !playerChoices[id]?.includes(value) || !owner.choices.includes(value))
    throw new Error('This graphics choice is unavailable.');
  const reason = owner.available?.();
  if (reason) throw new Error(reason);
  playerValues[id] = value;
  preset = 'custom';
  if (id === 'detail') forgetAuto();
  await applyPlayer();
}
export async function setGraphicsPreset(name: string) {
  if (name === 'auto') playerValues = {};
  else {
    if (!Object.hasOwn(graphicsPresets, name)) throw new Error('Unknown graphics preset.');
    const values = graphicsPresets[name as keyof typeof graphicsPresets];
    playerValues = { ...values, ...(playerValues.msaa === undefined ? {} : { msaa: playerValues.msaa }) };
  }
  preset = name;
  forgetAuto();
  await applyPlayer();
}
/** A player's Detail or preset choice starts the governor over from full detail. */
function forgetAuto() {
  auto = { rung: 0, msaaOff: false };
  try {
    localStorage.removeItem(AUTO_KEY);
  } catch {
    /* Storage is optional. */
  }
}
