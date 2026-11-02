// A real place (docs/plans/find-the-fun.md, step 8; loaded by src/features/proto-place.ts behind ?proto=place). A slice
// of Threefold Reach with the crossing's sea: a village, a gorge, two camps smoking across it and a spire to steer by.
// You walk there, plant a stake, haul for each track segment while the trestle goes up, and ride home with the cargo; the
// town grows differently for timber and stone, and the second link is less work because the first feeds a depot.
// Gut question: having found that place on foot, did you want to connect it? Serves DESIGN.md 1 (Toys before chores) and
// 9 (Leave something for the next visitor). Research: docs/research/big-walk-level-design.md, sections 5 and 9, recs 5-7
// and 10; docs/research/compounding-infrastructure.md, summary 1, recs 1-2; docs/research/level-design.md.
//
// What's shared and what isn't: your back bundle and the bundles' charges are the room's (`src.take`, poured off with
// `site.stock` into a ring nobody sees, on a site far away with its cost tuned up), and the numbers are `tune.set`. Which
// camp you claimed, the trestle, trains, crates and town are this tab's, in localStorage per room: `sites` lays one
// fixed route in one order, so two links in the order you choose can't be expressed in it.
import './place.css';
import * as THREE from 'three/webgpu';
import { flat } from '../flat.ts';
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { onApplied, submitEdit, world, worldStatus } from '../../world/sync.ts';
import { getRoomId, net } from '../../netplay/net.ts';
import { isProtoRoom } from '../../sim/tune.ts';
import { TRACK } from '../../sim/route.ts';
import { materialOf } from '../../sim/materials.ts';
import { PLAYER_R } from '../../constants.ts';
import { me, cam, camConstraints } from '../../player/player.ts';
import { identity } from '../../player/identity.ts';
import { registerInteractable, NO_TARGETS, type Interactable } from '../../player/hands.ts';
import { haulHooks } from '../../player/haul-variant.ts';
import { setCcd, teleport } from '../../physics/engine.ts';
import { softWall } from '../../entities/player/state.ts';
import { carry } from '../../physics/platforms.ts';
import { fly } from '../../render/haul-pieces.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { thump, whistle } from '../../render/machine-sfx.ts';
import { FOG_FAR } from '../../constants.ts';
import { dressSea } from '../crossing/sea.ts';
import { extendSky } from '../crossing/sky.ts';
import { fanfare, pop } from '../minis/common.ts';
import { draw } from '../net/boxes.ts';
import {
  clearCrates,
  deckFree,
  drawHeaps,
  heap,
  hopOff,
  hopOn,
  hopTo,
  nextSlot,
  topSlot,
  updateCrates,
  type Heap,
  type Kind,
} from '../net/crates.ts';
import { playPanel } from '../flags.ts';
import { protoCount } from '../count.ts';
import { protoMark } from '../mark.ts';
import { H, PATH_SAMPLES, addStatic, buildLand, insidePlace } from './land.ts';
import { HEAP, LINKS, ORIGIN, SPAWN, TUNE, VILLAGE, lineAt, railY, toWorld, type LinePoint } from './layout.ts';
import { buildMachine, buildPlatform, buildTrains, buildTrestle, cycleOf, drawTrestle, runSeconds } from './rail.ts';
import { campBlocks, makePart, rise, snapTown, updateTown } from './town.ts';

buildLand();
dressSea();
extendSky();

// ---------------------------------------------------------------- the far distance, and past the edge of the map
// Hazier than the crossing: the place is the view, and today's island behind you should be a far shape.
onFrame(
  () => {
    const fog = scene.fog as THREE.Fog;
    if (fog.near === 180 || fog.far === FOG_FAR) {
      fog.near = 320;
      fog.far = 1700;
    }
  },
  { phase: 'update', order: -3 },
);
softWall.at = Infinity; // this world runs well past the 510 m square the player's soft wall guards
camConstraints.push((_, pos) => {
  if (insidePlace(pos.x, pos.z)) pos.y = Math.max(pos.y, H(pos.x, pos.z) + 0.5);
  return false;
});

// ---------------------------------------------------------------- what stands in each link
const FLAT = (color: string) => flat(color, 0.9);
const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const wx = (x: number) => toWorld(x);
const v3 = (x: number, z: number, up = 0) => new THREE.Vector3(wx(x), H(wx(x), z) + up, z);

type Link = {
  spec: (typeof LINKS)[number];
  k: number;
  state: 0 | 1 | 2; // untouched, staked, open
  funded: number; // segments paid for
  logs: number; // in the ring, toward the next
  built: number; // metres along the line the machine has reached (it comes from the far end)
  trestle: ReturnType<typeof buildTrestle>;
  machine: ReturnType<typeof buildMachine>;
  trains: ReturnType<typeof buildTrains>;
  pile: Heap;
  depot: Heap;
  depotOn: boolean;
  camp: {
    asleep: ReturnType<typeof makePart>;
    awake: ReturnType<typeof makePart>;
    smoke: { x: number; y: number; z: number };
  };
  flag: THREE.Group;
  ring: THREE.Group;
  ringLogs: THREE.InstancedMesh;
  bundleMeshes: THREE.InstancedMesh[];
  groups: number[][]; // source ids per bundle
  plinth: THREE.Group;
  bentAt: number;
};

const logGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.2, 6).rotateZ(Math.PI / 2);
const logMat = FLAT('#a9794c');
const LOGS_PER_BUNDLE = 6;

function cable(a: THREE.Vector3, b: THREE.Vector3, color: string, thick: number) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(thick, thick, len, 5), FLAT(color));
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  scene.add(m);
  return m;
}

const hubMast = new THREE.Vector3(wx(HEAP.x), VILLAGE.y + 9, HEAP.z + 4);
const hubMastMesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.5), FLAT('#7f5630'));
hubMastMesh.position.set(hubMast.x, VILLAGE.y + 4.5, hubMast.z);
hubMastMesh.visible = false;
scene.add(hubMastMesh);

function buildLink(spec: (typeof LINKS)[number], k: number): Link {
  const { line } = spec;
  const { asleep, awake } = campBlocks(spec);
  const campX = wx(spec.camp.x);
  const sleep = makePart(asleep, campX, spec.camp.z),
    wake = makePart(awake, campX, spec.camp.z);
  draw(sleep, () => 1);
  const stack = asleep[1]!;
  const smoke = { x: stack.x, y: H(stack.x, stack.z) + (stack.y ?? 0) + stack.h, z: stack.z };

  // The stake to plant: a tall flagged pole, the thing you walked here for.
  const flag = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 5, 0.22), FLAT('#f4f1e8'));
  pole.position.y = 2.5;
  const pennant = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 1.9), FLAT('#f0752c'));
  pennant.position.set(0, 4.3, 0.95);
  flag.add(pole, pennant);
  flag.position.copy(v3(spec.stake.x, spec.stake.z));
  flag.traverse((o) => void (o.castShadow = true));
  scene.add(flag);

  // The ring: where hauled logs go, with what's in it as the readout.
  const ring = new THREE.Group();
  const torus = new THREE.Mesh(new THREE.TorusGeometry(TUNE.ringR, 0.14, 6, 28).rotateX(Math.PI / 2), FLAT('#f0752c'));
  torus.position.y = 0.2;
  const ringLogs = new THREE.InstancedMesh(logGeo, logMat, TUNE.cost);
  ringLogs.count = 0;
  ringLogs.castShadow = true;
  ringLogs.frustumCulled = false;
  ring.add(torus, ringLogs);
  ring.position.copy(v3(spec.ring.x, spec.ring.z));
  ring.visible = false;
  scene.add(ring);

  const bundleMeshes = spec.bundles.map((b) => {
    const m = new THREE.InstancedMesh(logGeo, logMat, LOGS_PER_BUNDLE);
    m.castShadow = true;
    m.frustumCulled = false;
    const at = new THREE.Object3D();
    const c = v3(b.x, b.z);
    for (let n = 0; n < LOGS_PER_BUNDLE; n++) {
      const row = n < 3 ? 0 : n < 5 ? 1 : 2,
        col = row === 0 ? n : row === 1 ? n - 3 : 0;
      at.position.set(c.x, c.y + 0.22 + row * 0.36, c.z + (col - (2 - row) / 2) * 0.42);
      at.updateMatrix();
      m.setMatrixAt(n, at.matrix);
    }
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3, 0.14), FLAT('#f0752c'));
    mark.position.set(c.x + 1.3, c.y + 1.5, c.z);
    m.add(mark);
    m.visible = false;
    scene.add(m);
    return m;
  });

  // The depot: a plinth, a flag and whatever the cable has brought.
  const plinth = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 6), FLAT('#bdb8ac'));
  base.position.y = 0.15;
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9, 0.5), FLAT('#7f5630'));
  mast.position.set(3.4, 4.5, 0);
  plinth.add(base, mast);
  plinth.position.copy(v3(spec.depot.x, spec.depot.z));
  plinth.visible = false;
  scene.add(plinth);

  // Stakes along the way, from the first: where a line could go.
  lineAt(line, 0, P);
  const stakes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), FLAT('#f0752c'), 30);
  const o = new THREE.Object3D();
  let n = 0;
  for (let s = 22; s < line.len - 8 && n < 30; s += 11) {
    lineAt(line, s, P);
    const x = wx(P.x) - P.uz * 5.5,
      z = P.z + P.ux * 5.5,
      y = H(x, z);
    if (railY(line, s) - y > 2) continue; // over the gorge
    o.position.set(x, y + 0.75, z);
    o.updateMatrix();
    stakes.setMatrixAt(n++, o.matrix);
  }
  stakes.count = n;
  stakes.frustumCulled = false;
  scene.add(stakes);

  buildPlatform(line, 2, 26, -5);
  buildPlatform(line, line.len - 26, line.len - 2, line.len + 5);

  const pileAt = lineAt(line, line.len - TUNE.stopIn, { ...P });
  const pileX = wx(pileAt.x) - pileAt.uz * 6.5 * (k ? 1 : -1),
    pileZ = pileAt.z + pileAt.ux * 6.5 * (k ? 1 : -1);

  return {
    spec,
    k,
    state: 0,
    funded: 0,
    logs: 0,
    built: line.len,
    trestle: buildTrestle(line),
    machine: buildMachine(line),
    trains: buildTrains(line),
    pile: heap(pileX, pileZ, 3, H(pileX, pileZ)),
    depot: heap(wx(spec.depot.x) - 0.5, spec.depot.z, 3, H(wx(spec.depot.x), spec.depot.z) + 0.3),
    depotOn: false,
    camp: { asleep: sleep, awake: wake, smoke },
    flag,
    ring,
    ringLogs,
    bundleMeshes,
    groups: [],
    plinth,
    bentAt: Infinity,
  };
}
const links = LINKS.map(buildLink);
const hub = heap(wx(HEAP.x), HEAP.z, 5, VILLAGE.y);
const allHeaps: Heap[] = [hub, ...links.map((l) => l.pile), ...links.map((l) => l.depot)];

// ---------------------------------------------------------------- local state, kept per room
const KEY = `boogle-place-v1:${getRoomId()}`;
const s = { wood: 0, stone: 0, finds: [] as number[] };
function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        s,
        hub: hub.list,
        links: links.map((l) => ({
          state: l.state,
          funded: l.funded,
          logs: l.logs,
          pile: l.pile.list,
          depot: l.depot.list,
        })),
      }),
    );
  } catch {
    // private mode: a reload starts over
  }
}
const stepsOf = (n: number) => (n >= TUNE.stepAt[1]! ? 2 : n >= TUNE.stepAt[0]! ? 1 : 0);
function restore() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!j) return;
    Object.assign(s, j.s);
    hub.list = j.hub ?? [];
    j.links?.forEach(
      (q: { state: 0 | 1 | 2; funded: number; logs: number; pile: Kind[]; depot: Kind[] }, k: number) => {
        const l = links[k];
        if (!l) return;
        l.state = q.state;
        l.funded = q.funded;
        l.logs = q.logs;
        l.pile.list = q.pile ?? [];
        l.depot.list = q.depot ?? [];
        l.built = l.spec.line.len * (1 - l.funded / TUNE.segments);
      },
    );
  } catch {
    // an old shape: start fresh
  }
}
function snapLink(l: Link) {
  l.flag.visible = true;
  l.flag.position.y = H(l.flag.position.x, l.flag.position.z);
  l.ring.visible = l.state === 1;
  drawRingLogs(l);
  for (const m of l.bundleMeshes) m.visible = l.state === 1;
  drawTrestle(l.trestle, l.built);
  draw(l.camp.awake, () => (l.state === 2 ? 1 : 0));
  if (l.state === 2) {
    l.machine.hide();
    l.trains.start(cycleOf(l.spec.line) / 2);
  } else {
    l.trains.stop();
    if (l.state === 1 && l.built < l.spec.line.len) l.machine.show(l.built);
    else l.machine.hide();
  }
  l.plinth.visible = l.depotOn = depotWanted(l);
  if (l.depotOn) ensureCable(l);
}
const anyOpen = () => links.some((l) => l.state === 2);
const depotWanted = (l: Link) => l.state === 1 && l.funded < TUNE.segments && anyOpen();

function drawRingLogs(l: Link) {
  const n = Math.min(TUNE.cost, Math.round(l.logs * 0.5));
  l.ringLogs.count = n;
  const o = new THREE.Object3D();
  for (let k = 0; k < n; k++) {
    o.position.set((k % 3) * 0.5 - 0.5, 0.26 + Math.floor(k / 3) * 0.3, (k % 2) * 0.4);
    o.rotation.y = (k % 3) * 0.4;
    o.updateMatrix();
    l.ringLogs.setMatrixAt(k, o.matrix);
  }
  l.ringLogs.instanceMatrix.needsUpdate = true;
}

// ---------------------------------------------------------------- the bundles and the depot: the room's logs
let claimed = false;
function claim() {
  if (claimed) return true;
  const list = rules.sources.list();
  if (list.length < 24) return false;
  claimed = true;
  let id = 0;
  for (const l of links) l.groups = l.spec.bundles.map(() => [id++, id++, id++]);
  depotIds = list.map((_, n) => n).slice(id);
  haulHooks.moved = () => true;
  rules.sources.sources.rev++;
  return true;
}
let depotIds: number[] = [];
const chargesOf = (ids: number[]) => ids.reduce((t, id) => t + rules.sources.charges(id), 0);
const yieldN = () => rules.tune.get('yield') ?? 4;
let flyFrom = new THREE.Vector3();
function takes(ids: number[], want: number, from: THREE.Vector3) {
  let sent = 0;
  for (const id of ids)
    for (let c = rules.sources.charges(id); c > 0 && sent < want; c--)
      if (submitEdit({ op: 'src.take', i: 0, j: 0, id })) sent++;
  if (sent) flyFrom = from;
  return sent;
}
onApplied((e: { op: string; p: string }, _t: number, r: { n?: number } | null) => {
  if (e.op === 'src.take' && r?.n && e.p === (net.room?.selfId ?? 'local')) fly(flyFrom, r.n, true);
});
let pourInto: Link | null = null;
onApplied((e: { op: string; p: string }, _t: number, r: { n?: number } | null) => {
  if (e.op !== 'site.stock' || !r?.n || e.p !== (net.room?.selfId ?? 'local') || !pourInto) return;
  const l = pourInto;
  l.logs += r.n;
  while (l.logs >= TUNE.cost && l.funded < TUNE.segments) {
    l.logs -= TUNE.cost;
    fund(l);
  }
  drawRingLogs(l);
  thump(l.ring.position.x, l.ring.position.z);
  save();
});
function fund(l: Link) {
  l.funded = Math.min(TUNE.segments, l.funded + 1);
  whistle(l.ring.position.x, l.ring.position.z);
  protoCount('segments');
  mark(`segment ${l.spec.id} ${l.funded}`);
}

// ---------------------------------------------------------------- the verbs
const log: [string, number][] = [];
const mark = (name: string) => void log.push([name, performance.now()]);
const dustCol = new THREE.Color('#d8c49a');
function puffAt(x: number, y: number, z: number, n = 10) {
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2;
    emit({
      x,
      y: y + 0.2,
      z,
      vx: Math.cos(a) * 3,
      vy: 1.2,
      vz: Math.sin(a) * 3,
      life: 0.9,
      size: 0.6,
      color: dustCol,
      alpha: 0.8,
      grow: [1, 2.6],
      drag: 2,
      fade: 0.5,
    });
  }
}
function plant(l: Link) {
  l.state = 1;
  l.flag.position.y = H(l.flag.position.x, l.flag.position.z) + 3;
  plantAnim = { l, t: 0 };
  l.ring.visible = true;
  for (const m of l.bundleMeshes) m.visible = true;
  thump(l.flag.position.x, l.flag.position.z);
  fanfare(false);
  protoCount('stakes');
  protoMark('verb');
  mark(`stake ${l.spec.id}`);
  save();
}
let plantAnim: { l: Link; t: number } | null = null;

const atPrompt = new THREE.Vector3();
const prompts = new Map<string, THREE.Vector3>();
const promptAt = (id: string, p: THREE.Vector3, up: number) => {
  let v = prompts.get(id);
  if (!v) prompts.set(id, (v = new THREE.Vector3()));
  return v.set(p.x, p.y + up, p.z);
};
const nearest = (x: number, z: number) => {
  let bd = Infinity,
    best: [number, number, number] = [SPAWN.x, SPAWN.z, VILLAGE.y];
  for (const path of PATH_SAMPLES)
    for (let n = 0; n < path.length; n += 2) {
      const q = path[n]!;
      const d = (q[0] + ORIGIN.x - x) ** 2 + (q[1] - z) ** 2;
      if (d < bd && q[2] > 1.6) {
        bd = d;
        best = q;
      }
    }
  return best;
};
function backUp() {
  const b = me.body;
  if (!b) return;
  const q = nearest(b.position.x, b.position.z);
  teleport(b, q[0] + ORIGIN.x, Math.max(H(q[0] + ORIGIN.x, q[1]), q[2] + 0.12) + PLAYER_R + 0.4, q[1]); // a bridge's samples are over water
  b.velocity.set(0, 0, 0);
  carry.x = carry.z = 0;
}
registerInteractable(() => {
  if (!me.body || !claim()) return NO_TARGETS;
  const p = me.body.interpolatedPosition;
  let out: Interactable[] | null = null;
  if (me.swimming) {
    atPrompt.set(p.x, p.y + 1.2, p.z);
    return [{ id: 'place-back', verb: 'Back up the path', at: atPrompt, run: backUp }];
  }
  const pid = identity.pid;
  const room = pid ? rules.stacks.room(pid, materialOf(rules.sites.age())) : 0;
  for (const l of links) {
    if (l.state === 0 && Math.hypot(p.x - l.flag.position.x, p.z - l.flag.position.z) < 3.4)
      (out ??= []).push({
        id: `stake${l.k}`,
        verb: 'Plant survey stake',
        at: promptAt(`stake${l.k}`, l.flag.position, 2),
        run: () => plant(l),
      });
    if (l.state !== 1 || l.funded >= TUNE.segments) continue;
    l.spec.bundles.forEach((b, n) => {
      const ids = l.groups[n]!;
      if (chargesOf(ids) <= 0) return;
      const at = bundleAt(l, n);
      if (Math.hypot(p.x - at.x, p.z - at.z) > 3) return;
      const t = { id: `bundle${l.k}.${n}`, verb: 'Take logs', at: promptAt(`bundle${l.k}.${n}`, at, 1.2) };
      const want = Math.min(2, Math.floor(room / yieldN()));
      (out ??= []).push(
        want <= 0
          ? { ...t, blocked: 'Full' }
          : {
              ...t,
              run: () => {
                if (takes(ids, want, at)) pop(1, 0.6);
              },
            },
      );
    });
    if (l.depotOn) {
      const at = l.plinth.position;
      if (Math.hypot(p.x - at.x, p.z - at.z) < 5.5) {
        const t = { id: `depot${l.k}`, verb: 'Take a load', at: promptAt(`depot${l.k}`, at, 2.4) };
        const want = Math.min(TUNE.depotTake / 4, Math.floor(room / yieldN()));
        (out ??= []).push(
          want <= 0 || l.depot.list.length < 3
            ? { ...t, blocked: want <= 0 ? 'Full' : 'Crates on the way' }
            : {
                ...t,
                run: () => {
                  if (!takes(depotIds, want, at)) return;
                  l.depot.list.splice(-3, 3);
                  drawHeaps(allHeaps);
                  protoCount('depot loads');
                  save();
                },
              },
        );
      }
    }
  }
  return out ?? NO_TARGETS;
});
const bundleAts = new Map<string, THREE.Vector3>();
function bundleAt(l: Link, n: number) {
  const key = `${l.k}.${n}`;
  let v = bundleAts.get(key);
  if (!v) {
    const b = l.spec.bundles[n]!;
    bundleAts.set(key, (v = v3(b.x, b.z)));
  }
  return v;
}

// ---------------------------------------------------------------- pouring, the machine, the link opening
let lastPour = 0;
function pour(now: number) {
  const pid = identity.pid;
  if (!me.body || !pid || now - lastPour < 350) return;
  const carried = rules.stacks.count(pid);
  if (carried <= 0) return;
  const p = me.body.position;
  for (const l of links) {
    if (l.state !== 1 || l.funded >= TUNE.segments) continue;
    if (Math.hypot(p.x - l.ring.position.x, p.z - l.ring.position.z) > TUNE.ringR + 0.4) continue;
    const site = rules.sites.sites.open;
    if (rules.sites.room(site, TRACK) <= 0) continue;
    pourInto = l;
    lastPour = now;
    submitEdit({ op: 'site.stock', i: 0, j: 0, s: site, ring: TRACK, n: Math.min(carried, TUNE.cost * 2) });
    return;
  }
}
function layOn(l: Link, dt: number) {
  if (l.state !== 1) return;
  const { len } = l.spec.line;
  const to = len * (1 - l.funded / TUNE.segments);
  if (l.built <= to) {
    if (l.funded < TUNE.segments) return;
    return open(l);
  }
  l.built = Math.max(to, l.built - ((len / TUNE.segments) * dt) / TUNE.layS);
  drawTrestle(l.trestle, l.built);
  l.machine.show(l.built);
  if (l.bentAt - l.built > 6.5) {
    l.bentAt = l.built;
    lineAt(l.spec.line, l.built, P);
    thump(wx(P.x), P.z);
    puffAt(wx(P.x), H(wx(P.x), P.z), P.z, 6);
  }
}
function open(l: Link) {
  l.state = 2;
  l.built = 0;
  drawTrestle(l.trestle, 0);
  l.ring.visible = false;
  for (const m of l.bundleMeshes) m.visible = false;
  l.machine.hide();
  l.plinth.visible = l.depotOn = false;
  l.trains.start(0);
  rise(l.camp.awake);
  fanfare(true);
  whistle(wx(l.spec.camp.x), l.spec.camp.z);
  madeAt[l.k] = performance.now() + 4000;
  protoCount('links');
  mark(`open ${l.spec.id}`);
  save();
}

// ---------------------------------------------------------------- crates
const madeAt = links.map(() => 0);
const door = new THREE.Vector3(),
  landAt = new THREE.Vector3(),
  ground = new THREE.Vector3();
function make(l: Link, now: number) {
  if (l.state !== 2 || now < madeAt[l.k]! || l.pile.list.length >= TUNE.pileMax) return;
  madeAt[l.k] = now + TUNE.pileEvery * 1000;
  const kind = l.spec.kind as Kind;
  door.set(l.pile.x, (l.pile.y ?? 0) + 3, l.pile.z);
  nextSlot(l.pile, landAt);
  hopTo(kind, door, landAt, 0, () => {
    l.pile.list.push(kind);
    drawHeaps(allHeaps);
    save();
  });
}
function arrive(l: Link, tr: Link['trains']['trains'][number], stop: number) {
  if (stop === 0) {
    let n = 0;
    tr.load.held.forEach((c, k) => {
      if (!c) return;
      const kind = c.kind;
      nextSlot(hub, ground);
      hopOff(tr.load, k, ground, 0.5 + n++ * 0.2, () => landHub(kind));
    });
  } else {
    let n = 0;
    while (l.pile.list.length && deckFree(tr.load) >= 0) {
      topSlot(l.pile, ground);
      hopOn(tr.load, l.pile.list.pop()!, ground, 0.5 + n++ * 0.18);
    }
    if (n) {
      drawHeaps(allHeaps);
      save();
    }
  }
}
function landHub(kind: Kind) {
  hub.list.push(kind);
  if (kind === 'wood') s.wood++;
  if (kind === 'stone') s.stone++;
  if (hub.list.length > 60) hub.list.splice(0, hub.list.length - 60);
  drawHeaps(allHeaps);
  save();
}

// The cable: from the village's heap to the depot, crates sliding over the gorge. It's what makes the second site near.
const crateGeo = new THREE.BoxGeometry(0.82, 0.82, 0.82);
const crateMat: Record<string, THREE.MeshStandardNodeMaterial> = { wood: FLAT('#a8703a'), stone: FLAT('#8f959c') };
const riding: {
  mesh: THREE.Mesh;
  t: number;
  len: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  kind: Kind;
  l: Link;
}[] = [];
const cables = new Map<Link, THREE.Mesh>();
function ensureCable(l: Link) {
  hubMastMesh.visible = true;
  if (cables.has(l)) return (cables.get(l)!.visible = true);
  const to = l.plinth.position.clone().add(new THREE.Vector3(3.4, 9, 0));
  cables.set(l, cable(hubMast, to, '#3a302c', 0.08));
}
let sentAt = 0;
function serveDepots(now: number, dt: number) {
  const openLink = links.find((q) => q.state === 2);
  for (const l of links) {
    if (l.state === 1 && !l.depotOn && depotWanted(l)) {
      l.depotOn = true;
      l.plinth.visible = true;
      ensureCable(l);
      puffAt(l.plinth.position.x, l.plinth.position.y, l.plinth.position.z);
      mark(`depot ${l.spec.id}`);
    }
    if (!l.depotOn && cables.get(l)?.visible) cables.get(l)!.visible = false;
    if (!l.depotOn || !openLink || now < sentAt) continue;
    const inAir = riding.filter((c) => c.l === l).length;
    if (l.depot.list.length + inAir >= TUNE.depotCrates) continue;
    sentAt = now + 1100;
    const kind = openLink.spec.kind as Kind;
    const mesh = new THREE.Mesh(crateGeo, crateMat[kind]);
    mesh.castShadow = true;
    scene.add(mesh);
    const to = l.plinth.position.clone().add(new THREE.Vector3(3.4, 8.4, 0));
    riding.push({ mesh, t: 0, len: hubMast.distanceTo(to), from: hubMast.clone(), to, kind, l });
  }
  for (let k = riding.length - 1; k >= 0; k--) {
    const c = riding[k]!;
    c.t += dt;
    const u = Math.min(1, (c.t * TUNE.cableSpeed) / c.len);
    c.mesh.position.lerpVectors(c.from, c.to, u);
    c.mesh.position.y -= 0.7;
    if (u >= 1) {
      c.mesh.removeFromParent();
      riding.splice(k, 1);
      const { l, kind } = c;
      nextSlot(l.depot, landAt);
      hopTo(kind, c.mesh.position, landAt, 0, () => {
        l.depot.list.push(kind);
        drawHeaps(allHeaps);
        save();
      });
    }
  }
}

// ---------------------------------------------------------------- small finds on the way
const FIND_SPOTS = PATH_SAMPLES.flatMap((path, n) =>
  [0.2, 0.47, 0.82].map((f, k) => {
    const q = path[Math.floor(path.length * f)]!,
      side = k % 2 ? 3.2 : -3.2;
    const x = wx(q[0] + side),
      z = q[1] + (k % 2 ? 1 : -1);
    return { id: n * 10 + k, x, z, y: H(x, z) + 1 };
  }),
);
const findGeo = new THREE.OctahedronGeometry(0.42);
const findMat = new THREE.MeshStandardNodeMaterial({
  color: '#ffcf33',
  roughness: 0.35,
  metalness: 0.4,
  emissive: '#7a5a08',
});
const findMeshes = FIND_SPOTS.map((f) => {
  const m = new THREE.Mesh(findGeo, findMat);
  m.position.set(f.x, f.y, f.z);
  m.castShadow = true;
  scene.add(m);
  return m;
});
const sparkle = new THREE.Color('#ffe08a');
function updateFinds(dt: number) {
  const b = me.body;
  FIND_SPOTS.forEach((f, k) => {
    const m = findMeshes[k]!;
    if (s.finds.includes(f.id)) return void (m.visible = false);
    m.visible = true;
    m.rotation.y += dt * 2;
    if (!b || Math.hypot(b.position.x - f.x, b.position.z - f.z) > 2.2) return;
    if (Math.abs(b.position.y - f.y) > 3) return;
    s.finds.push(f.id);
    pop(5, 0.6);
    protoCount('finds');
    for (let n = 0; n < 14; n++) {
      const a = (n / 14) * Math.PI * 2;
      emit({
        x: f.x,
        y: f.y,
        z: f.z,
        vx: Math.cos(a) * 3.2,
        vy: 3 + (n % 3),
        vz: Math.sin(a) * 3.2,
        life: 0.8,
        size: 0.3,
        color: sparkle,
        gravity: 7,
        shrink: 0.4,
      });
    }
    save();
  });
}
// A few places to stop at, greybox: a lookout over the gorge, an old cart, a rock arch the path goes through.
function buildStops() {
  const rock = '#9a9184',
    wood = '#7f5630';
  const row = (x: number, z: number, w: number, h: number, d: number, color: string, y = 0, yaw = 0) => ({
    kind: 'stop',
    x: wx(x),
    z,
    y,
    w,
    h,
    d,
    yaw,
    color,
  });
  const part = makePart(
    [
      // an arch on the commons, north path
      row(-146.5, -70, 3, 6.5, 3.4, rock),
      row(-137.5, -70, 3, 7.2, 3.4, rock),
      row(-142, -70, 13, 2.2, 4, rock, 6.5, 0.05),
      // a lookout on the rim
      row(-104, -122, 5, 0.3, 2.2, wood, 0.6),
      row(-106, -122, 0.3, 0.6, 2, wood),
      row(-102, -122, 0.3, 0.6, 2, wood),
      row(-110, -128, 0.25, 6, 0.25, wood),
      row(-109.1, -128, 1.6, 0.9, 0.08, '#f0752c', 5),
      // an old cart at the bank, south path
      row(-68, 150, 2.4, 1, 4, wood, 0.5, 0.5),
      row(-69.5, 148, 0.3, 1.2, 1.2, '#3a302c'),
      row(-66.5, 152, 0.3, 1.2, 1.2, '#3a302c'),
      // an arch at the far shoulder, east path
      row(16, 156, 3, 6, 3.2, rock),
      row(25, 164, 3, 7, 3.2, rock),
      row(20.5, 160, 13.5, 2.2, 3.8, rock, 6.2, -0.72),
    ],
    wx(0),
    0,
  );
  draw(part, () => 1);
  // Colliders for the arches' legs, so the path threads them.
  for (const [x, z] of [
    [-146.5, -70],
    [-137.5, -70],
    [16, 156],
    [25, 164],
  ] as const)
    addStatic({ kind: 'box', hx: 1.5, hy: 3.5, hz: 1.7 }, { x: wx(x), y: H(wx(x), z) + 3.5, z });
}
buildStops();

// ---------------------------------------------------------------- start over and the frame
function startOver() {
  for (const l of links) {
    l.state = 0;
    l.funded = 0;
    l.logs = 0;
    l.built = l.spec.line.len;
    l.pile.list = [];
    l.depot.list = [];
    l.depotOn = false;
    l.bentAt = Infinity;
    l.trestle.drawnAt = Infinity;
    for (const tr of l.trains.trains) {
      clearCrates(tr.load);
      tr.lastStop = -1;
    }
    snapLink(l);
  }
  s.wood = s.stone = 0;
  s.finds = [];
  hub.list = [];
  for (const c of riding) c.mesh.removeFromParent();
  riding.length = 0;
  drawHeaps(allHeaps);
  snapTown(0, 0);
  log.length = 0;
  atSpawn();
  save();
}
onApplied((e: { op: string }) => e.op === 'tune.reset' && startOver());
function atSpawn() {
  const b = me.body;
  if (!b) return;
  teleport(b, wx(SPAWN.x), H(wx(SPAWN.x), SPAWN.z) + PLAYER_R + 0.4, SPAWN.z);
  b.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = SPAWN.yaw;
  cam.pitch = -0.14;
}

let lastSet = 0;
const proto = isProtoRoom(getRoomId());
function tuneRoom(now: number) {
  if (!proto || now - lastSet < 1000) return;
  const { tune } = rules.tune;
  const want: [string, number][] = [
    ['cost0', 600],
    ['hard', anyOpen() ? TUNE.depotTake : TUNE.bundleTake],
  ];
  for (const [key, v] of want)
    if (tune.v[key as keyof typeof tune.v] !== v) {
      submitEdit({ op: 'tune.set', i: 0, j: 0, key, v });
      lastSet = now;
    }
}

let ready = false,
  placed = false,
  wasRiding = false;
const smokeCol = new THREE.Color('#f2efe8');
let smokeAcc = 0;
onFrame(
  ({ dt, now }) => {
    const b = me.body;
    if (b && !placed) {
      placed = true;
      // Above a falling deck at train speed, the player body's CCD stops whole steps (src/proto/crossing/index.ts).
      setCcd(b, false);
      atSpawn();
    }
    // A spawn or a teleport lands by the old island's ground height, and that's under this land: lift it onto the top.
    if (b && insidePlace(b.position.x, b.position.z)) {
      const h = H(b.position.x, b.position.z);
      if (b.position.y < h - 0.8) {
        teleport(b, b.position.x, h + PLAYER_R + 0.3, b.position.z);
        b.velocity.set(0, 0, 0);
      }
    }
    if (!ready) {
      if (!worldStatus().ready || world.tick <= 0 || !claim()) return;
      ready = true;
      restore();
      links.forEach(snapLink);
      drawHeaps(allHeaps);
      snapTown(stepsOf(s.wood), stepsOf(s.stone));
    }
    tuneRoom(now);
    pour(now);
    serveDepots(now, dt);
    for (const l of links) {
      layOn(l, dt);
      make(l, now);
      if (l.state === 2)
        for (const tr of l.trains.trains) {
          if (tr.stop !== tr.lastStop) {
            if (tr.stop >= 0) arrive(l, tr, tr.stop);
            tr.lastStop = tr.stop;
          }
        }
    }
    if (plantAnim) {
      plantAnim.t += dt;
      const { l, t } = plantAnim;
      const y = H(l.flag.position.x, l.flag.position.z);
      const u = Math.min(1, t / 0.22);
      l.flag.position.y = y + 3 * (1 - u * u);
      if (u >= 1) {
        puffAt(l.flag.position.x, y, l.flag.position.z);
        thump(l.flag.position.x, l.flag.position.z);
        plantAnim = null;
      }
    }
    updateCrates(dt);
    updateTown(stepsOf(s.wood), stepsOf(s.stone), dt);
    updateFinds(dt);
    // The two smoke columns: tall, slow and white, the first thing you read across the gorge.
    smokeAcc += dt * 3;
    for (; smokeAcc >= 1; smokeAcc--)
      for (const l of links) {
        const c = l.camp.smoke;
        emit({
          x: c.x + (Math.random() - 0.5),
          y: c.y,
          z: c.z + (Math.random() - 0.5),
          vx: 0.5 + Math.random() * 0.5,
          vy: 6 + Math.random() * 1.6,
          vz: (Math.random() - 0.5) * 0.6,
          life: 11,
          size: 3.4,
          grow: [1, 3.6],
          alpha: 0.8,
          fade: 0.55,
          color: smokeCol,
          drag: 0.02,
        });
      }
    // What the owner does.
    const riding_ = links.some((l) => l.trains.onTrain(carry.on));
    if (riding_ && !wasRiding) {
      protoCount('rides');
      mark('ride');
    }
    if (!riding_ && wasRiding) mark('off');
    wasRiding = riding_;
  },
  { phase: 'update', order: 10 },
);

// ---------------------------------------------------------------- the panel
const box = document.createElement('div');
box.className = 'place-proto';
const btn = (text: string, fn: () => void) => {
  const e = document.createElement('button');
  e.type = 'button';
  e.textContent = text;
  e.addEventListener('click', fn);
  box.append(e);
};
btn('Start over', () => {
  if (!submitEdit({ op: 'tune.reset', i: 0, j: 0 })) startOver();
});
function skipWalk() {
  const l = links.find((q) => q.state === 0) ?? links.find((q) => q.state === 1);
  const b = me.body;
  if (!l || !b) return;
  const to = l.flag.position;
  teleport(b, to.x + 3, H(to.x + 3, to.z) + PLAYER_R + 0.4, to.z);
  b.velocity.set(0, 0, 0);
  carry.x = carry.z = 0;
}
function skipHaul() {
  const l = links.find((q) => q.state === 1 && q.funded < TUNE.segments);
  if (!l) return;
  fund(l);
  save();
}
btn('Skip the walk', skipWalk);
btn('Skip the haul', skipHaul);
(document.querySelector('.hud') ?? document.body).append(box);
playPanel('place', box);

// For the look evals (dev/look/evals/place.ts).
window.__place = {
  links,
  s,
  hub,
  log,
  TUNE,
  PATH_SAMPLES,
  ORIGIN,
  H,
  rideSeconds: runSeconds,
  cycleOf,
  skipWalk,
  skipHaul,
  plant,
  open,
  give: (kind: Kind, n: number) => {
    for (let k = 0; k < n; k++) landHub(kind);
  },
  backUp,
};
