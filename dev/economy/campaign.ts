// Event-driven design arithmetic. No game imports, runtime state, timers or browser physics.
import type { Campaign, CampaignOptions, Kind, Path, Policy, Profile, Stock, Task } from './campaign-types.ts';
import { number } from './options.ts';

const sum = (s: Stock) => Object.values(s).reduce((a, b) => a + b, 0);
function add(s: Stock, good: string, n: number) {
  s[good] = (s[good] ?? 0) + n;
  if (!Number.isSafeInteger(s[good]) || s[good] < 0) throw new Error(`Invalid stock ${good}: ${s[good]}`);
}
const positive = (n: number, label: string, integer = false, zero = false) => {
  try {
    number(n, label, zero ? 0 : Number.MIN_VALUE, integer);
  } catch {
    throw new Error(`Invalid ${label}: ${n}`);
  }
};

export function validateCampaign(c: Campaign) {
  const ids = new Set(c.tasks.map((t) => t.id));
  if (ids.size !== c.tasks.length || !ids.has(c.terminal)) throw new Error('Duplicate task or missing terminal');
  const sources = new Set(c.sources.map((s) => s.good));
  if (sources.size !== c.sources.length) throw new Error('One source per material required by this paper model');
  const nodes = new Set(c.sources.map((s) => s.node));
  for (const line of c.lines) {
    nodes.add(line.from);
    nodes.add(line.to);
  }
  const dependencies = (list: string[]) => {
    for (const id of list) if (!ids.has(id)) throw new Error(`Unknown prerequisite ${id}`);
  };
  positive(c.targetS, 'targetS');
  positive(c.horizonS, 'horizonS');
  positive(c.maxPurchases, 'maxPurchases', true);
  positive(c.warningGapS, 'warningGapS');
  for (const [key, value] of Object.entries(c.profile))
    if (typeof value === 'number') positive(value, key, ['carry', 'rack', 'wagon', 'extraJumps'].includes(key), true);
  for (const key of ['walkMps', 'hookMps', 'carry', 'rack', 'wagon', 'sourceRate', 'trainRate'] as const)
    positive(c.profile[key], key);
  for (const t of c.tasks) {
    dependencies(t.requires);
    if (!nodes.has(t.site)) throw new Error(`Unknown site ${t.site}`);
    for (const [good, n] of Object.entries(t.bill)) {
      if (!sources.has(good)) throw new Error(`Missing source ${good}`);
      positive(n, `${t.id} bill`, true);
    }
    for (const k of ['authoredS', 'buildS', 'carryM'] as const) positive(t[k], `${t.id} ${k}`, false, true);
    for (const p of t.paths ?? []) {
      positive(p.metres, 'path metres', false, true);
      positive(p.puzzleS, 'puzzleS', false, true);
      if (p.needs?.unlock) dependencies([p.needs.unlock]);
    }
    for (const [key, value] of Object.entries(t.effect?.profile ?? {}))
      if (typeof value === 'number')
        positive(value, `effect ${key}`, ['carry', 'rack', 'wagon', 'extraJumps'].includes(key), true);
  }
  for (const s of c.sources) {
    dependencies(s.requires);
    positive(s.reserve, 'reserve', true, true);
    positive(s.seed, 'seed', true, true);
    positive(s.batch, 'batch', true);
    positive(s.seconds, 'production seconds');
    if (s.batch > c.profile.rack || s.seed > c.profile.rack) throw new Error('Source batch/seed exceeds rack');
  }
  for (const l of c.lines) {
    dependencies(l.requires);
    for (const key of ['metres', 'speedMps', 'accelerationMps2', 'capacity', 'trains'] as const)
      positive(l[key], `line ${key}`, key === 'capacity' || key === 'trains');
    positive(l.dwellS, 'dwellS', false, true);
    positive(l.transferS, 'transferS', false, true);
  }
  const seen = new Set<string>(),
    visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error(`Circular prerequisite ${id}`);
    if (seen.has(id)) return;
    visiting.add(id);
    c.tasks.find((t) => t.id === id)!.requires.forEach(visit);
    visiting.delete(id);
    seen.add(id);
  };
  c.tasks.forEach((t) => visit(t.id));
  // A core task may not hide an optional activity/purchase in its ancestry.
  for (const t of c.tasks.filter((t) => !t.optional))
    for (const id of t.requires)
      if (c.tasks.find((d) => d.id === id)!.optional) throw new Error(`Core ${t.id} needs optional ${id}`);
}

/** Trapezoidal speed profile (triangular if too short to cruise), including both ramps. */
export function railSeconds(metres: number, speed: number, acceleration: number) {
  return metres < (speed * speed) / acceleration
    ? 2 * Math.sqrt(metres / acceleration)
    : metres / speed + speed / acceleration;
}

export function pathAvailable(p: Path, profile: Profile, done: Set<string>) {
  const n = p.needs;
  return (
    (!n?.extraJumps || profile.extraJumps >= n.extraJumps) &&
    (!n?.glideMps || profile.glideMps >= n.glideMps) &&
    (!n?.hookM || profile.hookM >= n.hookM) &&
    (!n?.hookType || profile.hooks.includes(n.hookType)) &&
    (!n?.unlock || done.has(n.unlock)) &&
    (p.mode !== 'glide' || profile.glideMps > 0)
  );
}

type Packet = { good: string; units: number; node: string; task: string; moving: boolean };
type Job = { task: Task; bill: Stock; delivered: Stock; status: 'open' | 'funded' | 'done'; authored: boolean };
type Work = {
  left: number;
  role: 'authored' | 'haul';
  task: string;
  empty: number;
  loaded: number;
  handling: number;
  load?: Stock;
  finish: () => void;
};
type Event = { at: number; order: number; finish: () => void };
export type Trace = { atS: number; type: string; id: string; detail: string };
export type Interval = {
  fromS: number;
  toS: number;
  authored: number;
  hauling: number;
  idle: number;
  wants: number;
  players: number;
};
const priorities: Record<Policy, Kind[]> = {
  'route-first': ['R', 'M', 'C', 'F', 'A', 'E'],
  'tool-first': ['A', 'F', 'C', 'M', 'R', 'E'],
  'cart-first': ['C', 'F', 'M', 'R', 'A', 'E'],
  'town-first': ['M', 'E', 'C', 'R', 'F', 'A'],
  'optional-first': ['F', 'C', 'A', 'M', 'R', 'E'],
};

export function simulateCampaign(c: Campaign, party: number, options: CampaignOptions = {}) {
  validateCampaign(c);
  positive(party, 'party', true);
  if (party > 4) throw new Error('Campaign comparison supports 1–4 players');
  const content = options.content ?? 1,
    cost = options.cost ?? 1,
    supply = options.supply ?? 1,
    distance = options.distance ?? 1;
  positive(content, 'content', false, true);
  positive(cost, 'cost', false, true);
  positive(supply, 'supply');
  positive(distance, 'distance', false, true);
  const policy = options.policy ?? 'route-first';
  const presence = options.presence ?? [{ atS: 0, players: Array.from({ length: party }, (_, i) => `p${i + 1}`) }];
  if (!presence.length || presence[0]!.atS !== 0) throw new Error('Presence must start at zero');
  for (const [i, p] of presence.entries()) {
    positive(p.atS, 'presence time', false, true);
    if (i && p.atS <= presence[i - 1]!.atS) throw new Error('Presence times must increase');
    if (p.players.length > 4 || new Set(p.players).size !== p.players.length)
      throw new Error('Invalid presence players');
  }
  const profile = structuredClone(c.profile);
  const done = new Set<string>(),
    jobs = new Map<string, Job>();
  let selected = c.tasks.filter((t) => (!t.optional || options.optional !== false) && !options.omit?.includes(t.id));
  for (const t of selected)
    if (t.requires.some((id) => !selected.some((d) => d.id === id))) {
      if (!t.optional) throw new Error(`Omitted prerequisite of core ${t.id}`);
    }
  // Omitting an optional prerequisite also omits its optional descendants (C5 -> U6).
  while (selected.some((t) => t.requires.some((id) => !selected.some((d) => d.id === id))))
    selected = selected.filter((t) => t.requires.every((id) => selected.some((d) => d.id === id)));
  const events: Event[] = [],
    trace: Trace[] = [],
    intervals: Interval[] = [];
  const initial: Stock = {},
    made: Stock = {},
    transformed: Stock = {},
    installed: Stock = {},
    carried: Stock = {};
  const sources = c.sources.map((s) => ({ ...s, rawLeft: s.reserve, stock: s.seed, processing: 0 }));
  for (const s of sources) {
    add(initial, s.raw, s.reserve);
    add(initial, s.good, s.seed);
  }
  const packets: Packet[] = [];
  const incoming = new Map<string, number>();
  const trains = c.lines.map((line) => ({
    line,
    fleet: Array.from({ length: line.trains }, () => ({ ready: 0, node: line.from })),
  }));
  const workers = new Map<string, Work | undefined>();
  const carryingByTask = new Map<string, Stock>();
  const personalCargo = new Map<string, Stock>();
  const interruptedActivities: Work[] = [];
  const eligible = new Map<string, Set<string>>();
  const reveals = new Map<string, Set<string>>();
  const unlocks: {
    id: string;
    label: string;
    kind: Kind;
    atS: number;
    firstUseS: number | null;
    pathsOpened: string[];
  }[] = [];
  const owners = new Map<keyof Profile, string>();
  const totals = {
    authoredPersonS: 0,
    haulingPersonS: 0,
    emptyTravelS: 0,
    loadedTravelS: 0,
    handlingS: 0,
    idlePersonS: 0,
    loads: 0,
    shipments: 0,
    transfers: 0,
    maxConcurrentDeliveries: 0,
  };
  let now = 0,
    serial = 0,
    terminalS: number | null = null,
    active = new Set<string>(),
    auditCount = 0;
  const log = (type: string, id: string, detail = '') => trace.push({ atS: now, type, id, detail });
  const schedule = (seconds: number, finish: () => void) => events.push({ at: now + seconds, order: serial++, finish });
  const ready = (requires: string[]) => requires.every((id) => done.has(id));
  const use = (...keys: (keyof Profile)[]) => {
    for (const key of keys) {
      const u = unlocks.find((u) => u.id === owners.get(key));
      if (u && u.firstUseS === null) u.firstUseS = now;
    }
  };
  const capacityKey = (node: string, good: string) => `${node}:${good}`;
  const occupancy = (node: string, good: string) =>
    packets.filter((p) => !p.moving && p.node === node && p.good === good).reduce((n, p) => n + p.units, 0) +
    (incoming.get(capacityKey(node, good)) ?? 0) +
    sources.filter((s) => s.node === node && s.good === good).reduce((n, s) => n + s.stock + s.processing, 0);
  const stockLedger = () => {
    const held: Stock = { ...carried };
    for (const s of sources) {
      add(held, s.raw, s.rawLeft);
      add(held, s.good, s.stock);
    }
    for (const p of packets) add(held, p.good, p.units);
    for (const j of jobs.values()) for (const [g, n] of Object.entries(j.delivered)) add(held, g, n);
    return held;
  };
  const audit = () => {
    const held = stockLedger();
    for (const g of new Set([
      ...Object.keys(initial),
      ...Object.keys(made),
      ...Object.keys(transformed),
      ...Object.keys(held),
      ...Object.keys(installed),
    ])) {
      if ((initial[g] ?? 0) + (made[g] ?? 0) - (transformed[g] ?? 0) !== (held[g] ?? 0) + (installed[g] ?? 0))
        throw new Error(`Conservation failed at ${now}: ${g}`);
    }
    // All modeled recipes are one-to-one; processing holds the transformed raw until its output event.
    if (sum(initial) !== sum(held) + sum(installed) + sources.reduce((n, s) => n + s.processing, 0))
      throw new Error(`Physical unit conservation failed at ${now}`);
    const nodes = new Set([...sources.map((s) => s.node), ...c.lines.flatMap((l) => [l.from, l.to])]);
    for (const node of nodes)
      for (const s of sources)
        if (occupancy(node, s.good) > profile.rack) throw new Error(`Rack overflow at ${node}: ${s.good}`);
    auditCount++;
  };
  const complete = (j: Job) => {
    j.status = 'done';
    done.add(j.task.id);
    const before = c.tasks
      .flatMap((t) => t.paths ?? [])
      .filter((p) => pathAvailable(p, profile, new Set([...done].filter((id) => id !== j.task.id))))
      .map((p) => p.id);
    for (const [key, value] of Object.entries(j.task.effect?.profile ?? {})) {
      const k = key as keyof Profile;
      Object.assign(profile, {
        [key]: Array.isArray(value) ? [...new Set([...(profile[k] as string[]), ...value])] : value,
      });
      owners.set(k, j.task.id);
    }
    if (j.task.effect?.chore) {
      if (profile.removedChores.includes(j.task.effect.chore)) log('duplicate-chore', j.task.id, j.task.effect.chore);
      else profile.removedChores.push(j.task.effect.chore);
    }
    const pathsOpened = c.tasks
      .flatMap((t) => t.paths ?? [])
      .filter((p) => !before.includes(p.id) && pathAvailable(p, profile, done))
      .map((p) => p.id);
    if (j.task.kind) {
      unlocks.push({ id: j.task.id, label: j.task.label, kind: j.task.kind, atS: now, firstUseS: null, pathsOpened });
      for (const claims of eligible.values()) claims.add(j.task.id);
      for (const p of active) reveals.get(p)!.add(j.task.id);
    }
    log('complete', j.task.id, j.task.kind ?? 'activity');
    if (j.task.id === c.terminal) terminalS = now;
  };
  const route = (from: string, to: string) => {
    const queue: { node: string; path: number[] }[] = [{ node: from, path: [] }],
      seen = new Set([from]);
    for (const q of queue) {
      if (q.node === to) return q.path;
      trains.forEach(({ line }, i) => {
        if (!ready(line.requires)) return;
        const next = line.from === q.node ? line.to : line.to === q.node ? line.from : undefined;
        if (next && !seen.has(next)) {
          seen.add(next);
          queue.push({ node: next, path: [...q.path, i] });
        }
      });
    }
    return undefined;
  };
  for (const p of presence) {
    events.push({
      at: p.atS,
      order: serial++,
      finish: () => {
        for (const id of active) {
          const w = workers.get(id);
          if (!p.players.includes(id) && w?.role === 'authored') {
            interruptedActivities.push(w);
            workers.set(id, undefined);
          }
        }
        for (const id of active) {
          const w = workers.get(id);
          if (!p.players.includes(id) && w?.role === 'haul') {
            const personal = personalCargo.get(id) ?? {};
            for (const [g, n] of Object.entries(w.load!)) {
              add(carryingByTask.get(w.task)!, g, -n);
              add(personal, g, n);
            }
            personalCargo.set(id, personal);
            workers.set(id, undefined);
            log('retained-cargo', id, JSON.stringify(personal));
          }
        }
        active = new Set(p.players);
        for (const id of active) {
          if (!workers.has(id)) workers.set(id, undefined);
          if (!eligible.has(id)) eligible.set(id, new Set());
          if (!reveals.has(id)) reveals.set(id, new Set());
          for (const u of unlocks) eligible.get(id)!.add(u.id);
        }
        log('presence', p.players.join('+') || 'empty', `current access: ${unlocks.map((u) => u.id).join(',')}`);
      },
    });
  }
  const ranked = () =>
    selected
      .filter((t) => !done.has(t.id) && ready(t.requires))
      .sort((a, b) => {
        if (policy === 'optional-first' && !!a.optional !== !!b.optional) return a.optional ? -1 : 1;
        if (policy === 'route-first' && !!a.optional !== !!b.optional) return a.optional ? 1 : -1;
        return priorities[policy].indexOf(a.kind ?? 'R') - priorities[policy].indexOf(b.kind ?? 'R');
      });
  while (now <= c.horizonS) {
    events.sort((a, b) => a.at - b.at || a.order - b.order);
    while (events[0] && events[0].at <= now) {
      events.shift()!.finish();
      audit();
    }
    for (const id of active) {
      const work = workers.get(id);
      if (work && now + work.left === now) {
        workers.set(id, undefined);
        work.finish();
        audit();
      }
    }
    // Fully contributed installations finish even in an empty room; nothing unfunded starts there.
    for (const j of jobs.values())
      if (j.status === 'open' && j.authored && Object.entries(j.bill).every(([g, n]) => (j.delivered[g] ?? 0) === n)) {
        for (const [g, n] of Object.entries(j.delivered)) {
          add(installed, g, n);
          j.delivered[g] = 0;
        }
        j.status = 'funded';
        log('funded', j.task.id);
        schedule(j.task.buildS, () => complete(j));
      }
    if (active.size && terminalS === null) {
      for (const t of ranked()) {
        if (jobs.has(t.id)) continue;
        if (
          [...jobs.values()].filter((j) => j.status !== 'done' && sum(j.bill) > 0).length >= c.maxPurchases &&
          sum(t.bill)
        )
          continue;
        const bill = Object.fromEntries(Object.entries(t.bill).map(([g, n]) => [g, Math.ceil(n * cost)]));
        jobs.set(t.id, { task: t, bill, delivered: {}, status: 'open', authored: false });
        log('purchase', t.id, JSON.stringify(bill));
      }
      // Raw reserves are finite. Manufacturing is demand driven and cannot create units beyond the paid recipe.
      for (const s of sources) {
        if (!ready(s.requires)) continue;
        const needed = [...jobs.values()]
          .filter((j) => j.status === 'open')
          .reduce((n, j) => n + (j.bill[s.good] ?? 0) - (j.delivered[s.good] ?? 0), 0);
        const committed =
          packets.filter((p) => p.good === s.good).reduce((n, p) => n + p.units, 0) +
          [...carryingByTask.values()].reduce((n, held) => n + (held[s.good] ?? 0), 0);
        const n = Math.min(
          s.batch,
          s.rawLeft,
          profile.rack - occupancy(s.node, s.good),
          needed - committed - s.stock - s.processing,
        );
        if (!s.processing && n > 0) {
          s.rawLeft -= n;
          s.processing = n;
          add(transformed, s.raw, n);
          use('sourceRate');
          log('process', s.id, `${n} ${s.raw} -> ${s.good}`);
          schedule((s.seconds * n) / s.batch / (supply * profile.sourceRate), () => {
            s.processing = 0;
            s.stock += n;
            add(made, s.good, n);
            log('produced', s.id, `${n} ${s.good}`);
          });
        }
        for (const t of ranked()) {
          const j = jobs.get(t.id);
          if (!j || j.status !== 'open' || !s.stock) continue;
          const path = route(s.node, t.site);
          if (!path) continue;
          const assigned = packets.filter((p) => p.task === t.id && p.good === s.good).reduce((n, p) => n + p.units, 0);
          // Bills in flight are tracked separately from delivered; no duplicate final unit reservations.
          const held = carryingByTask.get(t.id)?.[s.good] ?? 0;
          const n = Math.min(
            (j.bill[s.good] ?? 0) - (j.delivered[s.good] ?? 0) - assigned - held,
            s.stock + s.processing + s.rawLeft,
            profile.rack,
            profile.wagon,
            ...path.map((i) => trains[i]!.line.capacity + profile.wagon - c.profile.wagon),
          );
          if (n > 0 && s.stock >= n) {
            s.stock -= n;
            packets.push({ good: s.good, units: n, node: s.node, task: t.id, moving: false });
          }
        }
      }
      for (const p of packets) {
        if (p.moving || p.units === 0) continue;
        const destination = jobs.get(p.task)!.task.site;
        const path = route(p.node, destination);
        if (!path?.length) continue;
        const service = trains[path[0]!]!,
          line = service.line;
        const train = service.fleet.find((t) => t.ready <= now);
        const next = line.from === p.node ? line.to : line.from;
        if (!train || occupancy(next, p.good) + p.units > profile.rack) continue;
        const travel = railSeconds(line.metres * distance, line.speedMps * profile.trainRate, line.accelerationMps2);
        const reposition = train.node === p.node ? 0 : travel + line.dwellS;
        const duration = reposition + travel + line.dwellS + line.transferS;
        train.ready = now + duration + travel + line.dwellS;
        train.node = p.node;
        // The empty return owns this train even after delivery; wake the scheduler when it returns.
        schedule(duration + travel + line.dwellS, () => {});
        const key = capacityKey(next, p.good);
        incoming.set(key, (incoming.get(key) ?? 0) + p.units);
        p.moving = true;
        totals.shipments++;
        if (p.node !== sources.find((s) => s.good === p.good)!.node) totals.transfers++;
        use('trainRate', 'wagon', 'rack');
        log('dispatch', line.id, `${p.units} ${p.good} to ${next} for ${p.task}`);
        schedule(duration, () => {
          incoming.set(key, incoming.get(key)! - p.units);
          p.node = next;
          p.moving = false;
          log('arrival', line.id, `${p.units} ${p.good} at ${next}`);
        });
      }
      totals.maxConcurrentDeliveries = Math.max(totals.maxConcurrentDeliveries, packets.filter((p) => p.moving).length);
      for (const id of active) {
        if (workers.get(id)) continue;
        const interrupted = interruptedActivities.shift();
        if (interrupted) {
          workers.set(id, interrupted);
          continue;
        }
        const tasks = ranked()
          .map((t) => jobs.get(t.id))
          .filter((j): j is Job => !!j && j.status === 'open');
        let assigned = false;
        // One authored route lane: extra people can build/haul alongside it, not divide every puzzle by headcount.
        if (![...workers.values()].some((w) => w?.role === 'authored')) {
          for (const j of tasks) {
            if (j.authored) continue;
            const paths = j.task.paths?.filter((p) => pathAvailable(p, profile, done));
            if (paths && !paths.length) continue;
            const duration = (p: Path) =>
              (p.metres * distance) /
                (p.mode === 'walk' ? profile.walkMps : p.mode === 'glide' ? profile.glideMps : profile.hookMps) +
              p.puzzleS * content;
            const path = paths?.sort((a, b) => duration(a) - duration(b))[0];
            const seconds = j.task.authoredS * content + (path ? duration(path) : 0);
            if (path) {
              log('path', j.task.id, path.id);
              if (path.needs?.extraJumps) use('extraJumps');
              if (path.needs?.hookM) use('hookM');
              if (path.needs?.hookType) use('hooks');
              use(path.mode === 'glide' ? 'glideMps' : path.mode === 'hook' ? 'hookMps' : 'walkMps');
              const u = unlocks.find((u) => u.id === path.needs?.unlock);
              if (u && u.firstUseS === null) u.firstUseS = now;
            }
            workers.set(id, {
              left: seconds,
              role: 'authored',
              task: j.task.id,
              empty: 0,
              loaded: 0,
              handling: 0,
              finish: () => {
                j.authored = true;
                log('activity', j.task.id, j.task.practice ?? j.task.label);
              },
            });
            assigned = true;
            break;
          }
        }
        if (assigned) continue;
        for (const j of tasks) {
          const local = packets.filter(
            (p) => !p.moving && p.node === j.task.site && p.task === j.task.id && p.units > 0,
          );
          const load: Stock = {};
          let space = profile.carry;
          for (const p of local) {
            const n = Math.min(space, p.units);
            add(load, p.good, n);
            p.units -= n;
            space -= n;
          }
          const units = sum(load);
          if (!units) continue;
          const held = carryingByTask.get(j.task.id) ?? {};
          carryingByTask.set(j.task.id, held);
          for (const [g, n] of Object.entries(load)) {
            add(carried, g, n);
            add(held, g, n);
          }
          const empty = (j.task.carryM * distance * profile.carryDistance) / profile.walkMps;
          const loaded = empty,
            handling = profile.pickupS + units * profile.unloadS;
          const seconds = empty + loaded + handling;
          use('carry', 'carryDistance', 'pickupS', 'unloadS');
          totals.loads++;
          log('carry', j.task.id, `${id}: ${JSON.stringify(load)}`);
          workers.set(id, {
            left: seconds,
            role: 'haul',
            load,
            task: j.task.id,
            empty: seconds ? empty / seconds : 0,
            loaded: seconds ? loaded / seconds : 0,
            handling: seconds ? handling / seconds : 0,
            finish: () => {
              for (const [g, n] of Object.entries(load)) {
                add(carried, g, -n);
                add(held, g, -n);
                add(j.delivered, g, n);
              }
              log('deposit', j.task.id, id);
            },
          });
          break;
        }
      }
    }
    audit();
    if (now === c.horizonS) break;
    const next = Math.min(
      c.horizonS,
      ...events.map((e) => e.at),
      ...[...active].map((id) => now + (workers.get(id)?.left ?? Infinity)),
    );
    const dt = next - now;
    const work = [...active].map((id) => workers.get(id));
    const authored = work.filter((w) => w?.role === 'authored').length,
      hauling = work.filter((w) => w?.role === 'haul').length;
    const idle = active.size - authored - hauling;
    intervals.push({
      fromS: now,
      toS: next,
      authored,
      hauling,
      idle,
      wants: ranked().filter((t) => t.kind).length,
      players: active.size,
    });
    if (terminalS === null) {
      totals.authoredPersonS += authored * dt;
      totals.haulingPersonS += hauling * dt;
      totals.idlePersonS += idle * dt;
      for (const w of work)
        if (w?.role === 'haul') {
          totals.emptyTravelS += w.empty * dt;
          totals.loadedTravelS += w.loaded * dt;
          totals.handlingS += w.handling * dt;
        }
    }
    for (const w of work) if (w) w.left = Math.max(0, w.left - dt);
    now = next;
  }
  const elapsedS = terminalS ?? c.horizonS;
  const beforeEnd = intervals.filter((i) => i.fromS < elapsedS);
  const authoredS = beforeEnd.reduce((n, i) => n + (i.authored ? Math.min(i.toS, elapsedS) - i.fromS : 0), 0);
  const haulOnlyS = beforeEnd.reduce(
    (n, i) => n + (!i.authored && i.hauling ? Math.min(i.toS, elapsedS) - i.fromS : 0),
    0,
  );
  const waitS = beforeEnd.reduce(
    (n, i) => n + (!i.authored && !i.hauling && i.players ? Math.min(i.toS, elapsedS) - i.fromS : 0),
    0,
  );
  const absentS = beforeEnd.reduce((n, i) => n + (!i.players ? Math.min(i.toS, elapsedS) - i.fromS : 0), 0);
  const hourly = Array.from({ length: Math.ceil(Math.max(c.targetS, elapsedS) / 3600) }, (_, hour) => ({
    hour: hour + 1,
    kinds: Object.fromEntries(
      (['F', 'C', 'A', 'M', 'R', 'E'] as const).map((kind) => [
        kind,
        unlocks.filter((u) => u.kind === kind && u.atS >= hour * 3600 && u.atS < (hour + 1) * 3600).length,
      ]),
    ) as Record<Kind, number>,
  }));
  const gaps: { fromS: number; toS: number; next: string }[] = [];
  let last = 0;
  for (const u of unlocks.filter((u) => u.kind !== 'E')) {
    if (u.atS - last >= c.warningGapS) gaps.push({ fromS: last, toS: u.atS, next: u.id });
    last = u.atS;
  }
  if (elapsedS - last >= c.warningGapS) gaps.push({ fromS: last, toS: elapsedS, next: 'ending' });
  return {
    route: c.id,
    party,
    options,
    policy,
    complete: terminalS !== null,
    terminalS,
    elapsedS,
    authoredS,
    haulOnlyS,
    waitS,
    absentS,
    totals,
    hourly,
    unlocks,
    gaps,
    intervals,
    trace,
    profile,
    auditCount,
    blocked: selected
      .filter((t) => !done.has(t.id))
      .map((t) => ({ id: t.id, missing: t.requires.filter((d) => !done.has(d)) })),
    people: [...eligible].map(([id, claims]) => ({
      id,
      eligible: [...claims],
      unexperienced: [...claims].filter((k) => !reveals.get(id)!.has(k)),
      retainedCargo: personalCargo.get(id) ?? {},
    })),
    ledger: {
      initial,
      produced: made,
      recipeInputs: transformed,
      held: stockLedger(),
      installed,
      processing: sources.reduce((n, s) => n + s.processing, 0),
    },
  };
}
