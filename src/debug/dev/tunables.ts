// Bounded agent adapter. Owners keep execution and state; no catalog work runs per frame.
import { CATALOG, TUNE_COMMANDS, tunableSpec, sharedTunableSpec, validValue } from '../../tunables/catalog.ts';
import { emitTuneRecord, tuneDigest } from '../../tunables/events.ts';
import { createTuneStartup } from '../../tunables/startup.ts';
import { BUILD_ID } from '../../build-id.ts';
import { WORLD_NS } from '../../world/namespace.ts';
import { RAILWAY_PLAY_NS } from '../../world/railway-namespace.ts';
import { rules, railTune } from '../../world/game-world.ts';
import { railwayCommands, onRailwayCommands } from '../../entities/railway/state.ts';
import { world, worldStatus, submitEdit, onApplied, onSnapshot, onRejected } from '../../world/sync.ts';
import { getRoomId, onNetState } from '../../netplay/net.ts';
import { me } from '../../player/state.ts';
import { onEntered } from '../../entities/player/state.ts';
import { snapshotFeelSpring, setFeelSpring, onFeelSpringChange } from '../../player/feel-tuning.ts';
import { bindings, onChange } from '../../render/water/live.ts';
import { exposureSettings } from '../../render/exposure.ts';
import { tuningVisit } from '../../dev-preferences.ts';
import {
  AUDIO_SPECS,
  audioSettingKey,
  audioSettings,
  setAudioSetting,
  onAudioSettingChange,
} from '../../render/audio-tuning.ts';
import { audioSnapshot } from '../../render/audio.ts';
import { el, button, more, note, download } from './ui.ts';
import { background } from '../../async.ts';
import { CARD, pageQuery, productionRailway } from '../../proto/flags.ts';
import { ok, no, type Tool, type Args, type Result } from './types.ts';

// Audio is available on every route, including before gesture unlock. It must not inherit the water binding gate.
function localBinding(id: string) {
  const key = audioSettingKey(id);
  return key
    ? {
        get: () => audioSettings[key],
        set: (value: unknown) => {
          setAudioSetting(id, value);
        },
      }
    : bindings.get(id);
}
const local = new Map(
  CATALOG.filter((s) => s.scope === 'local').map((s) => [
    s.id,
    { value: localBinding(s.id)?.get() ?? s.default, revision: 0, source: 'default' },
  ]),
);
let localWrite: { id: string; source: string } | null = null;
let snapshotSequence = 0;
let startingSetup: ReturnType<typeof setup> | null = null;
let startupReady = false;
let finishStartup: () => void = () => {};
const startup = new Promise<void>((resolve) => {
  finishStartup = resolve;
});
const queryResults: Result[] = [];
const requests = new Map<
  string,
  { status: string; at: number; revision?: number; appliedTick?: number; code?: string }
>();
const audioSlots = new Map<'A' | 'B', { name: string; values: { id: string; value: number }[] }>();
function setup() {
  const p = me.body?.position;
  return {
    room: getRoomId(),
    proto: CARD,
    position: p ? { x: p.x, y: p.y, z: p.z } : null,
  };
}
function read(id: string) {
  const spec = tunableSpec(id);
  if (!spec) return null;
  const feel = snapshotFeelSpring();
  const shared = spec.scope === 'lockstep';
  const rail = shared && spec.sharedKey.startsWith('rail');
  const sharedTune = rail ? railTune : rules.tune;
  const value = shared
    ? (sharedTune?.tune.v[spec.sharedKey] ?? spec.default)
    : spec.scope === 'owner'
      ? feel.value
      : ((localBinding(id)?.get() as number | undefined) ??
        (id === 'post.centre' ? exposureSettings.centre : spec.default));
  return {
    ...spec,
    value,
    source: shared ? 'room' : spec.scope === 'owner' ? (feel.revision ? 'session' : 'default') : local.get(id)!.source,
    revision: shared
      ? (sharedTune?.tune.revision ?? 0)
      : spec.scope === 'owner'
        ? feel.revision
        : local.get(id)!.revision,
    available: shared
      ? rail
        ? !!railTune && !!railwayCommands()?.read.ready()
        : worldStatus().ready
      : spec.scope === 'owner' || !!localBinding(id),
    ...(spec.scope === 'owner' ? { active: feel.active, chopLocked: feel.chopLocked } : {}),
  };
}
export function tuneSnapshot() {
  return {
    schema: 1,
    build: BUILD_ID || 'dev',
    namespace: productionRailway ? RAILWAY_PLAY_NS : WORLD_NS,
    revision: (productionRailway ? railTune : rules.tune)?.tune.revision ?? 0,
    tick: world.tick,
    setup: startingSetup ?? setup(),
    values: CATALOG.map((spec) => read(spec.id)!),
    queryResults: [...queryResults],
    audio: audioSnapshot(),
  };
}
export function recordTuneSnapshot() {
  if (!tuningVisit) return;
  if (startupReady && me.entered && me.body) startingSetup ??= setup();
  const data = tuneSnapshot(),
    snapshot = `${++snapshotSequence}`;
  emitTuneRecord('tune.begin', {
    snapshot,
    build: data.build,
    namespace: data.namespace,
    revision: data.revision,
    tick: data.tick,
    count: data.values.length,
  });
  const s = data.setup;
  emitTuneRecord('tune.setup', {
    snapshot,
    room: s.room,
    proto: s.proto,
    x: s.position?.x ?? null,
    y: s.position?.y ?? null,
    z: s.position?.z ?? null,
  });
  for (const row of data.values)
    emitTuneRecord('tune.value', {
      snapshot,
      id: row.id,
      value: row.value,
      default: row.default,
      scope: row.scope,
      source: row.source,
      revision: row.revision,
      available: row.available,
      ...(row.active
        ? {
            activeValue: row.active.value,
            activeRevision: row.active.revision,
            action: row.active.action,
            chopLocked: row.chopLocked ?? false,
          }
        : {}),
    });
  // Canonical numeric rows are short enough for the existing flat playdata string bound.
  const digest = tuneDigest(data.values);
  emitTuneRecord('tune.end', { snapshot, count: data.values.length, digest });
}
function rejected(code: string): Result {
  return { ok: false, message: code, data: { status: 'rejected', code } };
}
function validate(args: Args): Result {
  const spec = tunableSpec(args.id);
  if (!tuningVisit) return rejected('disabled');
  if (!spec || !validValue(spec, args.value)) return rejected('invalid-value');
  if (
    args.expectedRevision !== undefined &&
    (!Number.isSafeInteger(args.expectedRevision) || args.expectedRevision !== read(spec.id)!.revision)
  )
    return rejected('stale-revision');
  if (
    spec.scope === 'lockstep' &&
    spec.sharedKey !== 'yield' &&
    spec.sharedKey !== 'railRegrowMinutes' &&
    spec.sharedKey !== 'railRecoveryMinutes'
  )
    return rejected('read-only-in-first-proof');
  if (spec.id.startsWith('railway.') && !productionRailway) return rejected('unsupported-route');
  if (!read(spec.id)!.available) return rejected(spec.scope === 'local' ? 'reload-required' : 'not-ready');
  return ok('Valid request; shared acceptance remains host-owned.', { status: 'validated' });
}
function set(args: Args, source = 'session'): Result {
  const validation = validate(args);
  if (!validation.ok) return validation;
  const spec = tunableSpec(args.id)!,
    value = args.value as number;
  if (spec.scope === 'owner') {
    const result = setFeelSpring(value, args.expectedRevision as number | undefined);
    return { ok: result.ok, message: result.status, data: result };
  }
  if (spec.scope === 'local') {
    localWrite = { id: spec.id, source };
    try {
      localBinding(spec.id)!.set(value);
    } finally {
      localWrite = null;
    }
    return ok('Applied locally.', { status: 'applied', ...read(spec.id) });
  }
  if (requests.size >= 32) requests.delete(requests.keys().next().value!);
  const requestId = crypto.randomUUID();
  requests.set(requestId, { status: 'pending', at: performance.now() });
  const fields = {
    key: spec.sharedKey,
    v: value,
    expectedRevision: args.expectedRevision ?? read(spec.id)!.revision,
    requestId,
  };
  const session = railwayCommands();
  const queued = spec.sharedKey?.startsWith('rail')
    ? !!session && session.act('tune.commit', fields) !== false
    : submitEdit({ op: 'tune.commit', i: 0, j: 0, ...fields });
  if (!queued) requests.set(requestId, { status: 'rejected', at: performance.now() });
  return {
    ok: queued,
    message: queued ? 'Queued; use status to observe acceptance.' : 'Not queued.',
    data: { requestId, status: queued ? 'pending' : 'rejected' },
  };
}
function localChanged() {
  for (const [id, state] of local) {
    const value = localBinding(id)?.get();
    if (typeof value !== 'number' || value === state.value) continue;
    const old = state.value as number;
    state.source = localWrite?.id === id ? localWrite.source : 'owner';
    state.value = value;
    state.revision++;
    emitTuneRecord('tune.change', { id, old, value, revision: state.revision, source: state.source });
  }
}
onChange(localChanged);
onAudioSettingChange(localChanged);
onFeelSpringChange((event, state) => {
  emitTuneRecord(event === 'change' ? 'tune.change' : 'tune.active', {
    id: 'feel.spring.stiffness',
    value: state.value,
    revision: state.revision,
    activeValue: state.active.value,
    activeRevision: state.active.revision,
    action: state.active.action,
  });
});
onApplied(
  (
    e: { op: string; requestId?: string; key?: string; v?: number },
    tick,
    result: { status?: string; revision?: number } | null,
  ) => {
    if (e.op !== 'tune.commit' && e.op !== 'tune.set') return;
    if (e.requestId && requests.has(e.requestId))
      requests.set(e.requestId, {
        status: result?.status ?? 'rejected',
        at: performance.now(),
        revision: result?.revision,
        appliedTick: tick,
      });
    if (result && result.status !== 'rejected') {
      const spec = sharedTunableSpec(e.key);
      if (!spec) return;
      emitTuneRecord('tune.change', {
        id: spec.id,
        value: e.v ?? null,
        revision: rules.tune.tune.revision,
        tick,
        source: 'room',
      });
      recordTuneSnapshot();
    }
  },
);
onSnapshot(() => {
  queryStartup.snapshot();
  recordTuneSnapshot();
});
onRejected((event) => {
  if (event.op !== 'tune.commit') return;
  const request = requests.get(event.requestId);
  if (request?.status === 'pending')
    requests.set(event.requestId, { ...request, status: 'rejected', ...(event.reason ? { code: event.reason } : {}) });
});
onEntered(() => recordTuneSnapshot());
onNetState((state) => {
  if (state !== 'live')
    for (const [id, request] of requests)
      if (request.status === 'pending') requests.set(id, { ...request, status: 'unknown' });
});

const queryStartup = createTuneStartup(() => {
  const status = worldStatus();
  return status.mode === 'client' && status.ready && (!productionRailway || !!railwayCommands()?.read.ready());
}, submitTuneQuery);

let offCommands: (() => void)[] = [];
// A receipt belongs to its sender. Recording follows the authoritative mirror on every peer instead.
railTune?.onChange(({ changes, revision, tick }) => {
  for (const change of changes) {
    const spec = sharedTunableSpec(change.key);
    if (spec)
      emitTuneRecord('tune.change', {
        id: spec.id,
        old: change.old,
        value: change.value,
        revision,
        tick,
        source: 'room',
      });
  }
  recordTuneSnapshot();
});
onRailwayCommands((session) => {
  for (const off of offCommands) off();
  offCommands = [];
  if (!session) return;
  offCommands = [
    session.onAccepted((event) => {
      if (event.op !== 'tune.commit' && event.op !== 'tune.set') return;
      const id = event.fields.requestId;
      if (typeof id === 'string' && requests.has(id))
        requests.set(id, {
          status: 'applied',
          at: performance.now(),
          revision: railTune?.tune.revision,
          appliedTick: event.tick,
        });
    }, 'command'),
    session.onRefused((event) => {
      const id = event.fields.requestId;
      if (typeof id !== 'string') return;
      const request = requests.get(id);
      if (request)
        requests.set(id, {
          ...request,
          status: event.reason === 'unknown' || event.reason === 'storage' ? 'unknown' : 'rejected',
          code: event.reason,
        });
    }, 'command'),
    session.onReady(() => queryStartup.snapshot()),
  ];
});

/** Appearance and initial authoritative room state may arrive in either order. */
export function applyTuneQuery() {
  const shared = [...pageQuery()].some(
    ([key]) => key.startsWith('t.') && tunableSpec(key.slice(2))?.scope === 'lockstep',
  );
  queryStartup.start(shared);
}

function submitTuneQuery() {
  startupReady = true;
  try {
    const entries = [...pageQuery()].filter(([key]) => key.startsWith('t.'));
    if (!entries.length) {
      recordTuneSnapshot();
      return;
    }
    if (
      entries.length > 32 ||
      JSON.stringify(entries).length > 4096 ||
      new Set(entries.map(([key]) => key)).size !== entries.length
    ) {
      queryResults.push(rejected('invalid-query'));
      return;
    }
    const edits = entries.map(([key, text]) => ({ id: key.slice(2), value: text.trim() ? Number(text) : NaN }));
    for (const edit of edits) {
      const check = validate(edit);
      if (!check.ok) {
        queryResults.push(check);
        return;
      }
    }
    for (const edit of edits) queryResults.push(set(edit, 'url'));
    recordTuneSnapshot();
  } finally {
    finishStartup();
  }
}
export const tool: Tool = {
  id: 'tunables',
  label: 'Tunables',
  scope: 'Local, Owner and host-accepted Lockstep settings',
  commands: [...TUNE_COMMANDS],
  available: () => (tuningVisit ? null : 'Tuning is disabled.'),
  async run(command, args) {
    await startup;
    if (command === 'list') return ok('Resolved catalog.', tuneSnapshot().values);
    if (command === 'snapshot') return ok('Resolved starting setup and values.', tuneSnapshot());
    if (command === 'diff')
      return ok(
        'Review only; source defaults are unchanged.',
        tuneSnapshot()
          .values.filter((row) => row.value !== row.default)
          .map((row) => ({ id: row.id, owner: row.owner, from: row.default, to: row.value })),
      );
    if (command === 'get') {
      const row = typeof args.id === 'string' ? read(args.id) : null;
      return row ? ok('Effective value.', row) : rejected('unknown-id');
    }
    if (command === 'validate') return validate(args);
    if (command === 'set') return set(args);
    if (command === 'status') {
      const request = typeof args.requestId === 'string' ? requests.get(args.requestId) : null;
      if (!request) return rejected('unknown-request');
      if (request.status === 'pending' && performance.now() - request.at > 10_000) request.status = 'unknown';
      return {
        ok: request.status === 'applied' || request.status === 'pending',
        message: request.status,
        data: { ...request },
      };
    }
    if (command === 'reset-local') {
      const spec = tunableSpec(args.id);
      return spec && spec.scope !== 'lockstep' ? set({ ...args, value: spec.default }) : rejected('local-id-required');
    }
    return no('Unknown command.');
  },
  snapshot: tuneSnapshot,
  mount(parent, context) {
    note(parent, 'Audio mix · local to this tab. Buses change live; individual hits use the next trigger.');
    const status = el('p', '', 'dev-status');
    status.setAttribute('role', 'status');
    parent.append(status);
    const controls = el('div', '', 'dev-actions');
    const name = el('input');
    name.value = 'My mix';
    name.setAttribute('aria-label', 'Audio snapshot name');
    parent.append(name, controls);
    for (const slot of ['A', 'B'] as const) {
      controls.append(
        button(`Save ${slot}`, () => {
          audioSlots.set(slot, {
            name: name.value.trim() || slot,
            values: AUDIO_SPECS.map((spec) => ({ id: spec.id, value: read(spec.id)!.value as number })),
          });
          status.textContent = `Saved ${slot}: ${audioSlots.get(slot)!.name}`;
        }),
      );
      controls.append(
        button(`Recall ${slot}`, () => {
          const saved = audioSlots.get(slot);
          if (!saved) {
            status.textContent = `Save ${slot} first.`;
            return;
          }
          for (const row of saved.values) set(row);
          status.textContent = `Recalled ${slot}: ${saved.name}`;
        }),
      );
    }
    controls.append(
      button('Reset audio', () => {
        for (const spec of AUDIO_SPECS) set({ id: spec.id, value: spec.default });
        status.textContent = 'Audio defaults restored; player volume and mute retained.';
      }),
    );
    controls.append(
      button('Download snapshot', () =>
        download(
          'boogle-audio-mix.json',
          new Blob([JSON.stringify(tuneSnapshot(), null, 2)], { type: 'application/json' }),
        ),
      ),
    );
    const advanced = more(parent, 'Recipe, distance and variation');
    const primary = new Set([
      'musicDb',
      'ambienceDb',
      'sfxDb',
      'uiDb',
      'voiceDb',
      'characterDb',
      'workDb',
      'socialDb',
      'footstepsDb',
      'footstepStyle',
      'runningDb',
      'jumpDb',
      'landingDb',
      'remoteStepsDb',
    ]);
    const inputs = new Map<string, HTMLInputElement>();
    const inputRows = el('div');
    parent.insertBefore(inputRows, advanced);
    let timer: ReturnType<typeof setTimeout> | undefined;
    for (const spec of AUDIO_SPECS) {
      const row = el('label');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0';
      const name = spec.id.slice(spec.id.lastIndexOf('.') + 1);
      row.append(el('span', `${name} (${spec.units})`));
      const input = el('input');
      input.type = 'number';
      input.min = String(spec.min);
      input.max = String(spec.max);
      input.step = spec.integer ? '1' : '0.1';
      input.style.cssText = 'width:84px;min-height:36px';
      input.setAttribute('aria-label', spec.id);
      inputs.set(spec.id, input);
      input.addEventListener('change', () => {
        void context.run('tunables', 'set', { id: spec.id, value: input.valueAsNumber }).then((result) => {
          status.textContent = result.message;
          refresh();
          clearTimeout(timer);
          timer = setTimeout(refresh, 60);
        });
      });
      row.append(
        input,
        button('Reset', () => {
          set({ id: spec.id, value: spec.default });
          refresh();
        }),
      );
      (primary.has(name) ? inputRows : advanced).append(row);
    }
    const signal = more(parent, 'Actual audio nodes');
    const output = el('pre', '', 'dev-output');
    let active = true;
    let voices: unknown = null;
    const refreshSignal = async () => {
      const { locomotionState } = await import('../../render/locomotion.ts');
      voices = locomotionState();
      if (active) refresh();
    };
    signal.append(
      button('Refresh signal', () => background(refreshSignal(), 'audio signal snapshot')),
      output,
    );
    function refresh() {
      for (const [id, input] of inputs) input.value = String(read(id)!.value);
      output.textContent = JSON.stringify({ ...audioSnapshot(), locomotion: voices }, null, 2);
    }
    const unlisten = onAudioSettingChange(refresh);
    refresh();
    background(refreshSignal(), 'audio signal snapshot');
    return () => {
      active = false;
      clearTimeout(timer);
      unlisten();
    };
  },
};
