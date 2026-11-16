// The Round’s delivered freight and B2 house purchase. Local views follow accepted Plot rows; a hold only sends an intent.
import { Color, Vector3, Matrix4 } from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { SignBoard } from '../../render/sign-board.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import level from '../../../content/built/levels/town-plot-stakes.json' with { type: 'json' };
import { TOWN_CENTRE, TOWN_PLOTS, TOWN_SLOTS, townBuilding, townLocal } from '../../place/town-plan.ts';
import { HALL } from '../../place/home-station.ts';
import { toWorld } from '../../place/layout.ts';
import { H } from '../../place/terrain.ts';
import { TRADE } from '../../sim/railway-trade-layout.ts';
import type { TownLook } from './town-read.ts';
import { addSite, startSite, snapSite } from '../../place/sites.ts';
import { createGhostOutlines } from '../../render/ghost-outline.ts';
import { advanceHold } from '../../components/hold/view.ts';
import { railwayCommands, railwayWorldRead, onRailwayCommands } from '../railway/state.ts';
import { Plot, Till } from '../../sim/railway-components.ts';
import { plotPrice } from '../../sim/railway-queries-trade.ts';
import { TOWN_BOARD, townPlotBoard } from '../../place/town-plan.ts';
import { me } from '../../player/state.ts';
import { type Interactable } from '../../player/hands.ts';

const drawn = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n))) : 0);

const TIMBER = new Color('#ab6b34'),
  STONE = new Color('#96a5ad');

// Placeholder words for The Boogler; icons and counts follow the depot boards. Paint only: instantiate owns signs.
function paintBoard({ g, cw, ch }: Pick<SignBoard, 'g' | 'cw' | 'ch'>, lines: readonly string[]) {
  if (lines.length === 4) {
    g.fillStyle = '#493522';
    g.fillRect(0, 0, cw, ch);
    g.strokeStyle = '#edcf8c';
    g.lineWidth = ch * 0.025;
    g.strokeRect(ch * 0.04, ch * 0.04, cw - ch * 0.08, ch - ch * 0.08);
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.font = `900 ${ch * 0.19}px Figtree, system-ui, sans-serif`;
    for (let i = 0; i < lines.length; i++) {
      const y = ch * (0.15 + i * 0.235);
      g.fillStyle = i === 1 ? '#edcf8c' : '#fff5dc';
      g.fillText(lines[i]!, cw * 0.18, y, cw * 0.77);
      if (i === 1) {
        // one rider silhouette, no font-dependent icon
        g.beginPath();
        g.arc(cw * 0.1, y - ch * 0.04, ch * 0.035, 0, Math.PI * 2);
        g.fill();
        g.fillRect(cw * 0.1 - ch * 0.035, y + ch * 0.005, ch * 0.07, ch * 0.065);
      } else if (i > 1) {
        g.beginPath();
        g.arc(cw * 0.1, y, ch * 0.045, 0, Math.PI * 2);
        g.stroke();
      }
    }
    return;
  }
  const timberOnly = lines.length === 2;
  g.fillStyle = '#493522';
  g.fillRect(0, 0, cw, ch);
  g.strokeStyle = '#edcf8c';
  g.lineWidth = ch * 0.025;
  g.strokeRect(ch * 0.04, ch * 0.04, cw - ch * 0.08, ch - ch * 0.08);
  g.fillStyle = '#fff5dc';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 ${ch * (timberOnly ? 0.3 : 0.24)}px Figtree, system-ui, sans-serif`;
  g.fillText(lines[0]!, cw / 2, ch * (timberOnly ? 0.28 : 0.2));
  lines.slice(1).forEach((line, i) => {
    const y = ch * (timberOnly ? 0.7 : i === 0 ? 0.51 : 0.8),
      r = ch * 0.055;
    g.fillStyle = i === 0 ? '#eac28a' : '#a9b9c1';
    if (i === 0) {
      for (const [x, dy] of [
        [cw * 0.1, r],
        [cw * 0.1 + r * 2.1, r],
        [cw * 0.1 + r, -r],
      ]) {
        g.beginPath();
        g.arc(x!, y + dy!, r, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.beginPath();
      g.moveTo(cw * 0.08, y + r);
      g.lineTo(cw * 0.09, y - r);
      g.lineTo(cw * 0.15, y - r * 1.4);
      g.lineTo(cw * 0.18, y + r);
      g.closePath();
      g.fill();
    }
    g.fillStyle = '#fff5dc';
    g.textAlign = 'left';
    g.font = `900 ${ch * (timberOnly ? 0.26 : 0.22)}px Figtree, system-ui, sans-serif`;
    g.fillText(line, cw * 0.23, y, cw * 0.71);
  });
}

export function createTownPlots(owner: OwnedView) {
  const kit = loadLevelArtifact(level, definitions).placements;
  const prices = TRADE.plots[0];
  const slotsPerPlot = kit.reduce((n, p) => {
    const visual = definitions[p.prefab]!.visual;
    return n + ('builder' in visual ? (visual.instances?.length ?? 1) : 0);
  }, 0);
  const batch = createPrefabBatch('town.plot-stakes', prices.length * slotsPerPlot, owner);
  batch.mesh.name = 'town:plot-stakes-and-piles';
  batch.mesh.castShadow = true;
  let index = 0;
  const targets: Interactable[] = [];
  let holding = -1,
    progress = 0,
    waiting = -1;
  let quotedTick = -1,
    pricePct = 100;
  const release = () => {
    holding = -1;
    progress = 0;
  };
  const near = (at: Vector3) =>
    !!me.body && Math.hypot(me.body.position.x - at.x, me.body.position.z - at.z) <= TOWN_BOARD.reach;
  let unsubscribe: (() => void) | undefined;
  const off = onRailwayRefusal();
  owner.cleanup(() => {
    off();
    unsubscribe?.();
    release();
  });
  function onRailwayRefusal() {
    // The subscription follows session mount/replacement and is removed with this owner.
    return onRailwayCommands((session) => {
      unsubscribe?.();
      waiting = -1;
      release();
      const offRefused = session?.onRefused((event) => {
        if (event.intent.op === 'rail.buy' && event.intent.id === waiting) waiting = -1;
      });
      // A whole-state refill settles unknown outcomes through rows; a dropped queue has no refusal receipt.
      const offReset = session?.onReset(() => {
        waiting = -1;
        release();
      });
      unsubscribe = () => {
        offRefused?.();
        offReset?.();
      };
    });
  }

  const plots = prices.map((need, k) => {
    const building = townBuilding(TOWN_PLOTS.order[k]!);
    // Ring plots are approached from the ring road; the road plot beside the hall faces arrivals from the
    // hall/platform. Board centres stay at their authored townLocal offsets; only their facing changes.
    const approach = TOWN_SLOTS.find((s) => s.id === TOWN_PLOTS.order[k])!.ring ? TOWN_CENTRE : HALL;
    const board = townPlotBoard(k);
    const at = new Vector3(toWorld(board.x), H(toWorld(building.x), building.z) + 1.1, board.z);
    const run = () => {
      if (holding < 0 && waiting !== k) {
        holding = k;
        progress = 0;
      }
    };
    const target: Interactable = { id: `town.plot.${k}`, verb: 'Hold to build', at, run };
    const one = [target];
    const params = { x: toWorld(building.x), y: H(toWorld(building.x), building.z), z: building.z, yaw: building.yaw };
    const shell = ['scaffold', 'pieces'].map((phase) =>
      instantiate(
        'town.plot-house',
        {
          id: `plot.${k}.${phase}`,
          prefab: 'town.plot-house',
          pos: [0, 0, 0],
          params: { ...params, phase },
        },
        { owner },
      ),
    );
    const plan = shell[0]!.construction[0]!.plan;
    const hull = instantiate(
      'town.plot-house-hull',
      {
        id: `plot.${k}.hull`,
        prefab: 'town.plot-house-hull',
        pos: [params.x, params.y, params.z],
        rot: [building.yaw, 0, 0],
      },
      { owner },
    );
    hull.setEnabled(false);
    const site = addSite(`plot.${k}`, plan, (TRADE.buildTicks / 10 - 0.3) / 9.1, { hulls: [hull], poles: [] });
    const ghost = createGhostOutlines(owner, 1024, 0.32, 0.14, 0.09);
    ghost.box(
      params.x,
      params.y + plan.hulls[0]!.hy,
      params.z,
      building.w,
      plan.hulls[0]!.hy * 2,
      building.d,
      building.yaw,
    );
    // Roof slopes from the same construction recipe, so the ghost reads as this house's pitched roof.
    for (let i = plan.WALLS + 6; i < plan.ROOFED; i++) {
      const b = plan.pieces[i]!;
      ghost.outline(
        new Matrix4()
          .makeTranslation(b.x, b.y, b.z)
          .multiply(b.local)
          .multiply(new Matrix4().makeTranslation(0, 0.5, 0)),
        1,
        1,
        1,
      );
    }
    ghost.commit();
    ghost.mesh.visible = false;
    const previous = prices[k - 1];
    const woodNeed = need.wood - (previous?.wood ?? 0),
      stoneNeed = need.stone - (previous?.stone ?? 0);
    const parts = kit.map((p) => {
      const framePiece = p.id === 'stakes' || p.id === 'bands' || p.id === 'string';
      const at = p.id === 'board' ? board : townLocal(building, p.pos[0], p.pos[2] + (framePiece ? 0 : building.d / 2));
      const visual = definitions[p.prefab]!.visual;
      const batched = 'builder' in visual;
      const instance = instantiate(
        p.prefab,
        {
          ...p,
          id: `${TOWN_PLOTS.order[k]}.${p.id}`,
          pos: [toWorld(at.x), H(toWorld(building.x), building.z) + p.pos[1], at.z],
          rot: [p.id === 'board' ? Math.atan2(approach.x - at.x, approach.z - at.z) : building.yaw, 0, 0],
          ...(framePiece ? { scale: [(building.w + 0.6) / 8, 1, (building.d + 0.6) / 8] } : {}),
        },
        {
          owner,
          ...(batched ? { batch: { target: batch, index } } : {}),
          texts: {
            plot: [`Plot ${k + 1}`, `Timber 0 / ${woodNeed}`, ...(stoneNeed ? [`Stone 0 / ${stoneNeed}`] : [])],
          },
          paintLabel: paintBoard,
          handlers: { 'town.plot-buy': () => one },
        },
      );
      if (batched) index += visual.instances?.length ?? 1;
      return { id: p.id, instance, index: index - 1 };
    });
    return {
      k,
      previous,
      woodNeed,
      stoneNeed,
      parts,
      offeredTargets: [] as Interactable[],
      site,
      ghost,
      at,
      target,
      run,
      visible: false,
      offered: false,
      wood: -1,
      stone: -1,
      price: -1,
      money: -1,
      bought: -1,
      shortfall: -1,
      waiting: false,
      percent: -1,
    };
  });
  return {
    release,
    targets: () => targets,
    inspect: () =>
      plots.map((p) => ({
        slot: p.k,
        board: p.at.toArray(),
        visible: p.visible,
        offered: p.offered,
        price: p.price,
        money: p.money,
        at: p.bought,
        state: p.site.state,
        bodies: p.site.bodies.length,
        ghost: p.ghost.mesh.visible,
        blocked: p.target.blocked,
        progress: holding === p.k ? progress : 0,
      })),
    update(read: TownLook['plots'] | null, dt = 0) {
      targets.length = 0;
      const facade = railwayWorldRead();
      if (!facade || facade.status() === 'connecting' || facade.status() === 'starting') {
        waiting = -1;
        release();
      }
      const w = facade?.world();
      const tillId = w?.ids(Till)[0];
      const till = tillId === undefined ? undefined : w?.get(Till, tillId);
      const money = drawn(till?.boogles ?? 0);
      const tick = facade?.tick() ?? 0;
      if (tick !== quotedTick) {
        quotedTick = tick;
        pricePct = facade?.trade().pricePct ?? 100;
      }

      const staked = read?.staked;
      let next = -1;
      for (let k = 0; k < prices.length; k++)
        if (!staked?.includes(k) && (!w || (w.get(Plot, w.lookup(Plot, k) ?? -1)?.at ?? -1) < 0)) {
          next = k;
          break;
        }
      for (const p of plots) {
        const id = w?.lookup(Plot, p.k),
          row = id === undefined ? undefined : w?.get(Plot, id);
        const valid = !!read && !!row && !!till;
        const bought = valid ? row.at : -1;
        const offered = valid && bought < 0 && (staked?.includes(p.k) ?? false),
          visible = valid && bought < 0 && (offered || p.k === next);
        const price = valid ? drawn(plotPrice(w!, 0, p.k, pricePct)) : 0;
        if (bought < 0) {
          if (p.site.state !== 'none') snapSite(p.site, false);
        } else if (tick >= bought + TRADE.buildTicks) {
          if (p.site.state !== 'done') snapSite(p.site, true);
        } else if (p.site.state === 'none') startSite(p.site, -(tick - bought) / 10);
        if (waiting === p.k && bought >= 0) waiting = -1;
        p.ghost.mesh.visible = offered && money >= price;
        if (holding === p.k) {
          if (!offered || money < price || !near(p.at)) release();
          else {
            progress = advanceHold(progress, dt, true, 1);
            if (progress >= 1) {
              waiting = p.k;
              release();
              if (!railwayCommands()?.buy(p.k)) waiting = -1;
            }
          }
        }
        const shortfall = Math.max(0, price - money);
        p.target.run = offered && !shortfall && waiting !== p.k ? p.run : undefined;
        if (shortfall !== p.shortfall || (waiting === p.k) !== p.waiting) {
          p.shortfall = shortfall;
          p.waiting = waiting === p.k;
          p.target.blocked = shortfall ? `Need ${shortfall} more Boogles` : p.waiting ? 'Waiting for town' : undefined;
        }
        const percent = holding === p.k ? Math.floor(progress * 100) : -1;
        if (percent !== p.percent) {
          p.percent = percent;
          p.target.verb = percent < 0 ? 'Hold to build' : `Hold ${percent}%`;
        }
        if (offered) {
          if (near(p.at)) for (const target of p.offeredTargets) targets.push(target);
        }
        p.bought = bought;
        const wood = Math.min(p.woodNeed, drawn((read?.wood ?? 0) - (p.previous?.wood ?? 0)));
        const stone = Math.min(p.stoneNeed, drawn((read?.stone ?? 0) - (p.previous?.stone ?? 0)));
        if (
          visible === p.visible &&
          offered === p.offered &&
          wood === p.wood &&
          stone === p.stone &&
          price === p.price &&
          money === p.money
        )
          continue;
        p.price = price;
        p.money = money;
        p.visible = visible;
        p.offered = offered;
        p.wood = wood;
        p.stone = stone;
        // Eight crates at most per pile; the board keeps the exact count beyond eight and the drawn mix
        // keeps stone visible from its first delivery.
        const count = Math.min(8, wood + stone);
        const stoneCrates = stone ? Math.max(1, Math.round((count * stone) / (wood + stone))) : 0;
        let crate = 0;
        for (const part of p.parts) {
          if (part.id === 'board') {
            part.instance.relabel(
              'label',
              offered
                ? [`Plot ${p.k + 1}`, '+1 rider / minute', `Price ${price}`, `Box ${money}`]
                : [
                    `Plot ${p.k + 1}`,
                    `Timber ${wood} / ${p.woodNeed}`,
                    ...(p.stoneNeed ? [`Stone ${stone} / ${p.stoneNeed}`] : []),
                  ],
            );
            part.instance.setEnabled(visible);
            // Prefabs start disabled. Cache the registered targets only after the board first becomes visible.
            if (visible && !p.offeredTargets.length) p.offeredTargets = part.instance.targets();
          } else if (part.id.startsWith('crate.')) {
            // The shared batch owns its material; per-instance colour changes never mutate that material.
            batch.mesh.setColorAt(part.index, crate < count - stoneCrates ? TIMBER : STONE);
            batch.mesh.instanceColor!.needsUpdate = true;
            part.instance.setEnabled(visible && crate < count);
            crate++;
          } else part.instance.setEnabled(visible && offered);
        }
      }
    },
  };
}
