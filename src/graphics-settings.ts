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
  /** Effective settings deliberately controlled by this composite cost switch. */
  costDependencies?: readonly string[];
  skips: string;
  hitch?: string;
  available?(): string | null;
  read(): GraphicsValue;
  apply(value: GraphicsValue): void | Promise<void>;
  prepare?(value: GraphicsValue): void | Promise<void>;
};
const KEY = 'boogle.dev.graphics.v1';
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
export function graphicsInitial(id: string, choices: readonly GraphicsValue[], baseline: GraphicsValue) {
  const value = overrides[id];
  return devEnabled && value !== undefined && choices.includes(value) ? value : baseline;
}
async function apply(owner: GraphicsAdapter, value: GraphicsValue) {
  errors.delete(owner.id);
  if (owner.applyMode === 'reload' || (owner.read() === value && !owner.costDependencies?.length)) return;
  try {
    await owner.prepare?.(value);
    await owner.apply(value);
  } catch (error) {
    errors.set(owner.id, String(error));
    throw error;
  }
}
export function registerGraphics(owner: GraphicsAdapter) {
  if (!devEnabled) return () => {};
  if (owners.has(owner.id)) throw new Error(`Graphics owner already registered: ${owner.id}`);
  if (!owner.choices.includes(owner.default)) throw new Error(`Invalid graphics baseline: ${owner.id}`);
  owners.set(owner.id, owner);
  const saved = overrides[owner.id];
  if (saved !== undefined && !owner.choices.includes(saved)) {
    delete overrides[owner.id];
    save();
  }
  if (overrides[owner.id] !== undefined && !owner.available?.())
    void apply(owner, overrides[owner.id]!).catch(() => {});
  return () => {
    if (owners.get(owner.id) === owner) owners.delete(owner.id);
    errors.delete(owner.id);
  };
}
export function graphicsSnapshot() {
  return [...owners.values()].map((owner) => {
    const effective = owner.read();
    const requested = overrides[owner.id] ?? owner.default;
    const reason = owner.available?.() ?? null;
    return {
      id: owner.id,
      label: owner.label,
      choices: owner.choices,
      baseline: owner.default,
      audience: 'dev' as const,
      scope: 'Local' as const,
      persistence: 'Dev only',
      applyMode: owner.applyMode,
      cost: owner.cost,
      costDependencies: owner.costDependencies ?? [],
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
      await apply(owner, overrides[owner.id] ?? owner.default);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw new AggregateError(failures, 'Some graphics owners could not restore; see their errors.');
}
export const resetGraphics = () => restoreGraphics({});
