// Cosmetic/Local over the replicated till and room tunables; no money or time is accumulated here.
import { Vector3 } from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { Interactable } from '../../player/hands.ts';
import { me } from '../../player/state.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { compiled } from '../../prefab/catalogue.ts';
import kit from '../../../content/built/levels/railway-till.json' with { type: 'json' };
import { HALL, TILL } from '../../place/home-station.ts';
import { ORIGIN } from '../../place/layout.ts';
import { Till } from '../../sim/railway-components.ts';
import { boxCap } from '../../sim/railway-queries-trade.ts';

export function createTill(adapter: RailwayAdapter, owner: OwnedView) {
  const point = { x: ORIGIN.x + TILL.x, y: HALL.floor + 1.4, z: TILL.z };
  let at: Vector3 | undefined;
  const rowNow = () => {
    const w = adapter.read.world(),
      id = w.ids(Till)[0];
    return id === undefined ? undefined : w.get(Till, id);
  };
  const targets = (): Interactable[] => {
    const row = rowNow(),
      body = me.body;
    if (
      !row ||
      row.sack <= 0 ||
      !body ||
      Math.hypot(body.position.x - point.x, body.position.z - point.z) > 3 ||
      Math.abs(body.position.y - point.y) > 2.5
    )
      return [];
    return [
      {
        id: 'railway.till-sack',
        verb: 'Empty',
        at: (at ??= new Vector3(point.x, point.y, point.z)),
        run: () => {
          adapter.sack();
        },
      },
    ];
  };
  const [counterRecord, coinsRecord] = loadLevelArtifact(kit, compiled.prefabs).placements;
  const counter = instantiate(
    'railway.till',
    {
      ...counterRecord!,
      pos: [ORIGIN.x + TILL.x, HALL.floor, TILL.z],
      rot: [TILL.yaw, 0, 0],
    },
    { owner, texts: { balance: ['0', 'Boogles'] }, handlers: { 'railway.sack': targets } },
  );
  // Keep both on the counter, with the column beside the sack rather than inside it.
  const coins = instantiate('railway.till-coins', { ...coinsRecord!, pos: [-0.17, 1.02, -0.22] }, { owner });
  coins.root.name = 'railway:till-coins';
  const sack = instantiate(
    'railway.till-sack',
    {
      id: 'railway.till-sack',
      prefab: 'railway.till-sack',
      pos: [-0.17, 1, 0.28],
    },
    { owner },
  );
  sack.root.name = 'railway:till-sack';
  counter.root.add(coins.root);
  counter.root.add(sack.root);
  counter.setEnabled(false);
  coins.setEnabled(false);
  sack.setEnabled(false);
  let drawn = -1;
  let drawnSack = -1;
  let shown = false;
  return {
    targets: counter.targets,
    update() {
      const w = adapter.read.world(),
        id = w.ids(Till)[0],
        row = id === undefined ? undefined : w.get(Till, id);
      if (shown !== !!row) {
        shown = !!row;
        counter.setEnabled(shown);
        coins.setEnabled(shown);
      }
      if (!row) {
        coins.root.visible = false;
        coins.root.scale.y = 0;
        drawn = -1;
        drawnSack = -1;
        sack.setEnabled(false);
        return;
      }
      const limit = boxCap(w, adapter.read.trade()),
        cap = Number.isFinite(limit) ? Math.max(0, limit) : 0,
        n = Number.isFinite(row.boogles) ? Math.max(0, Math.min(cap, row.boogles)) : 0,
        waiting = Number.isFinite(row.sack) ? Math.max(0, row.sack) : 0;
      coins.root.visible = n > 0 && cap > 0;
      coins.root.scale.y = cap > 0 ? n / cap : 0;
      if (waiting !== drawnSack) sack.setEnabled(waiting > 0);
      if (n !== drawn || waiting !== drawnSack) {
        drawn = n;
        drawnSack = waiting;
        counter.relabel('sign', waiting > 0 ? [`${n} Boogles`, `Sack ${waiting}`] : [String(n), 'Boogles']);
      }
    },
  };
}
