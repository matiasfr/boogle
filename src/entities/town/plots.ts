// The RoundÃ¢â‚¬â„¢s delivered freight and B2 house purchase. Local views follow accepted Plot rows; a hold only sends an intent.
import { Color, Vector3, Matrix4, type BoxGeometry, type Mesh, type MeshStandardMaterial } from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import { paintBoard } from './plot-board.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import level from '../../../content/built/levels/town-plot-stakes.json' with { type: 'json' };
import { TOWN_CENTRE, TOWN_PLOTS, TOWN_SLOTS, townBuilding, townLocal } from '../../place/town-plan.ts';
import { HALL } from '../../place/home-station.ts';
import { toWorld } from '../../place/layout.ts';
import { H } from '../../place/terrain.ts';
import { TRADE, validPlotKind } from '../../sim/railway-trade-layout.ts';
import type { TownLook } from './town-read.ts';
import { addSite, startSite, snapSite, type Site } from '../../place/sites.ts';
import { createGhostOutlines } from '../../render/ghost-outline.ts';
import { advanceHold } from '../../components/hold/view.ts';
import { railwayCommands, railwayWorldRead, onRailwayCommands } from '../railway/state.ts';
import { Plot, Till } from '../../sim/railway-components.ts';
import { loaderBuilt, plotPrice } from '../../sim/railway-queries-trade.ts';
import { JIB_SOLIDS, LOADER_PAINT, YARD, footingHulls, shedEnvelope, type YardBox } from '../../place/yard-shape.ts';
import { knock } from '../../render/fanfare.ts';
import { splash } from '../../render/splash.ts';
import { townChoice, TOWN_BOARD, townPlotBoard } from '../../place/town-plan.ts';
import { me } from '../../player/state.ts';
import { interactTarget, type Interactable } from '../../player/hands.ts';

const drawn = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n))) : 0);

const TIMBER = new Color('#ab6b34'),
  STONE = new Color('#96a5ad');


/** `opened`: the plots whose building is a walk-in room (./rooms.ts builds it, on the same clock): its site, read here
 * for the ghost and the inspection. Their board, stakes, piles and ghost stay here; their shell and hulls are the room's. */
export function createTownPlots(owner: OwnedView, opened: ReadonlyMap<number, Site> = new Map()) {
  // Placeholder building names and board words, pending the owner's copy.
  const choiceNames = ['', 'Seed Shed', 'Horn Pavilion', 'Frisbee Boathouse', 'Caddy Shed', 'Dunk Bakery'];
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
    heldKind = 0,
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
    const start = (kind: number) => {
      if (holding < 0 && waiting !== k && near(at)) {
        heldKind = kind;
        holding = k;
        progress = 0;
      }
    };
    const run = () => start(0);
    const target: Interactable = { id: `town.plot.${k}`, verb: 'Hold to build', at, run, release };
    const one = [target];
    const params = { x: toWorld(building.x), y: H(toWorld(building.x), building.z), z: building.z, yaw: building.yaw };
    const loader = 'gives' in need && need.gives === 'loader';
    // The loader yard is a works building (an open shed, a jib, footings), not a house shell: no door, no windows.
    const shellPrefab = loader ? 'town.plot-yard' : 'town.plot-house',
      hullPrefab = loader ? 'town.plot-yard-hull' : 'town.plot-house-hull';
    const jib = loader
      ? instantiate(
          'town.loader-jib',
          {
            id: `plot.${k}.jib`,
            prefab: 'town.loader-jib',
            pos: [params.x, params.y, params.z],
            rot: [building.yaw, 0, 0],
          },
          { owner },
        )
      : null;
    jib?.setEnabled(false);
    const jibPaint = (jib?.root.getObjectByName('mast') as Mesh<BoxGeometry, MeshStandardMaterial> | undefined)
      ?.material;
    jibPaint?.color.set(LOADER_PAINT.bare);
    const room = opened.get(k);
    const site = room ?? ownSite();
    const plan = site.plan;
    function ownSite() {
      const shell = ['scaffold', 'pieces'].map((phase) =>
        instantiate(
          shellPrefab,
          {
            id: `plot.${k}.${phase}`,
            prefab: shellPrefab,
            pos: [0, 0, 0],
            params: { ...params, phase },
          },
          { owner },
        ),
      );
      const hull = instantiate(
        hullPrefab,
        {
          id: `plot.${k}.hull`,
          prefab: hullPrefab,
          pos: [params.x, params.y, params.z],
          rot: [building.yaw, 0, 0],
        },
        { owner },
      );
      hull.setEnabled(false);
      return addSite(`plot.${k}`, shell[0]!.construction[0]!.plan, (TRADE.buildTicks / 10 - 0.3) / 9.1, {
        hulls: [hull],
        poles: [],
      });
    }
    const ghost = createGhostOutlines(owner, 1024, 0.32, 0.14, 0.09);
    if (loader) {
      // The yard's silhouette: the shed as one box, each footing, the jib's solids and its rope.
      const frame = new Matrix4()
        .makeTranslation(params.x, params.y, params.z)
        .multiply(new Matrix4().makeRotationY(building.yaw));
      const { jib: j, floor } = YARD;
      const outlines: YardBox[] = [
        shedEnvelope(),
        ...footingHulls(),
        ...JIB_SOLIDS,
        {
          dx: j.hookX,
          dy: (floor + j.hookY + j.top) / 2,
          dz: j.z,
          hx: 0.03,
          hy: (j.top - floor - j.hookY) / 2,
          hz: 0.03,
        },
      ];
      for (const b of outlines)
        ghost.outline(
          frame.clone().multiply(new Matrix4().makeTranslation(b.dx, b.dy, b.dz)),
          b.hx * 2,
          b.hy * 2,
          b.hz * 2,
        );
    } else {
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
    }
    ghost.commit();
    ghost.mesh.visible = false;
    const previous = prices[k - 1];
    const woodNeed = need.wood - (previous?.wood ?? 0),
      stoneNeed = need.stone - (previous?.stone ?? 0);
    const layout = townChoice(k);
    const choices =
      'choices' in need
        ? need.choices.map((kind, i) => {
            const point = layout.boards[k === 2 ? Number(kind === 3) : i]!;
            const position = new Vector3(toWorld(point.x), at.y - 0.85, point.z);
            const action: Interactable = { id: `town.plot.${k}.${kind}`, verb: 'Hold to build', at: position, release };
            const begin = () => start(kind);
            const topper = instantiate(
              'town.choice-board',
              {
                id: action.id,
                prefab: 'town.choice-board',
                params: { kind },
                labels: { label: 'plot' },
                pos: [position.x, params.y, position.z],
                rot: [building.yaw, 0, 0],
              },
              {
                owner,
                texts: { plot: [`Plot ${k + 1}`] },
                paintLabel: paintBoard,
                handlers: { 'town.plot-buy': () => [action] },
              },
            );
            const toy = createGhostOutlines(owner, 128, 0.32, 0.14, 0.09);
            if (kind === 1) {
              const x = toWorld(layout.stall.x),
                z = layout.stall.z;
              toy.box(x, params.y + 0.5, z, 2.8, 1, 0.9, building.yaw);
              toy.box(x, params.y + 2.35, z, 3.2, 0.1, 1.4, building.yaw);
            } else if (kind === 3) {
              toy.box(toWorld(layout.stall.x), params.y + 0.8, layout.stall.z, 1.2, 0.16, 0.65, building.yaw);
            } else if (kind === 4 || kind === 5) {
              const { x, z } = layout.stall;
              if (kind === 4) {
                toy.box(toWorld(x), params.y + 0.05, z, 1.25, 0.1, 1.18, building.yaw);
                toy.box(toWorld(x), params.y + 0.8, z, 0.08, 1.55, 0.08, building.yaw);
              } else {
                toy.box(toWorld(x), params.y + 2.64, z, 1, 0.63, 0.85, building.yaw);
                toy.box(toWorld(x), params.y + 1.35, z, 1.38, 2.7, 0.12, building.yaw);
              }
            } else
              for (const pad of layout.pads) {
                toy.box(toWorld(pad.x), params.y + 0.06, pad.z, 1.1, 0.12, 1.1, building.yaw);
                toy.box(toWorld(pad.x) + 1, params.y + 2.2, pad.z, 0.55, 0.5, 0.5, building.yaw);
              }
            toy.commit();
            toy.mesh.visible = false;
            return { kind, action, begin, topper, toy };
          })
        : [];
    const parts = kit
      .filter((p) => p.id !== 'board' || !choices.length)
      .map((p) => {
        const framePiece = p.id === 'stakes' || p.id === 'bands' || p.id === 'string';
        const at =
          p.id === 'board' ? board : townLocal(building, p.pos[0], p.pos[2] + (framePiece ? 0 : building.d / 2));
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
      /** An opened plot's seconds since its accepted buy, for its room; undefined while unbought or unread. */
      since: undefined as number | undefined,
      loader,
      jib,
      jibPaint,
      painted: false,
      previous,
      woodNeed,
      stoneNeed,
      parts,
      choices,
      preview: 0,
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
    /** An opened plot's seconds since its accepted buy, as of the last `update`; undefined while it stands unbought. */
    done: (k: number) => plots[k]?.site.state === 'done',
    since: (k: number) => plots[k]?.since,
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

      const firstKind = w?.get(Plot, w.lookup(Plot, 0) ?? -1)?.kind ?? 0;
      const staked = read?.staked;
      let next = -1;
      for (let k = 0; k < prices.length; k++)
        if (!staked?.includes(k) && (!w || (w.get(Plot, w.lookup(Plot, k) ?? -1)?.at ?? -1) < 0)) {
          next = k;
          break;
        }
      // The Works arm's own test, once a frame for every jib.
      const yardBuilt = !!w && loaderBuilt(w, tick);
      for (const p of plots) {
        const id = w?.lookup(Plot, p.k),
          row = id === undefined ? undefined : w?.get(Plot, id);
        const valid = !!read && !!row && !!till;
        const bought = valid ? row.at : -1;
        const offered = valid && bought < 0 && (staked?.includes(p.k) ?? false),
          visible = valid && bought < 0 && (offered || p.k === next);
        const price = valid ? drawn(plotPrice(w!, 0, p.k, pricePct)) : 0;
        // An opened plot's room raises itself from `since` (./rooms.ts); the rest are built here.
        if (opened.has(p.k)) p.since = bought < 0 ? undefined : (tick - bought) / 10;
        else if (bought < 0) {
          if (p.site.state !== 'none') snapSite(p.site, false);
        } else if (tick >= bought + TRADE.buildTicks) {
          if (p.site.state !== 'done') snapSite(p.site, true);
        } else if (p.site.state === 'none') startSite(p.site, -(tick - bought) / 10);
        if (waiting === p.k && bought >= 0) waiting = -1;
        p.ghost.mesh.visible = offered && money >= price;
        // The jib stands once the yard's frame is up and solid (its solids are the site's), bare until the yard is
        // built, then in the Works arm's yellow at the same tick. It never swings: nothing loads in town.
        p.jib?.setEnabled(p.site.bodies.length > 0);
        if (p.jibPaint && yardBuilt !== p.painted) {
          p.painted = yardBuilt;
          p.jibPaint.color.set(yardBuilt ? LOADER_PAINT.built : LOADER_PAINT.bare);
        }
        const chosen = p.choices.find((c) => c.kind === heldKind);
        if (holding === p.k) {
          if (!offered || money < price || !near(p.at) || (chosen && !near(chosen.action.at))) release();
          else {
            progress = advanceHold(progress, dt, true, 1);
            if (progress >= 1) {
              waiting = p.k;
              release();
              if (!railwayCommands()?.buy(p.k, heldKind || undefined)) waiting = -1;
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
        const wood = Math.min(p.woodNeed, drawn((read?.wood ?? 0) - (p.previous?.wood ?? 0)));
        const stone = Math.min(p.stoneNeed, drawn((read?.stone ?? 0) - (p.previous?.stone ?? 0)));
        if (p.choices.length) {
          for (const c of p.choices) {
            c.action.blocked = p.target.blocked;
            c.action.run = p.target.run ? c.begin : undefined;
            c.action.verb = holding === p.k && heldKind === c.kind ? p.target.verb : 'Hold to build';
            const allowed = validPlotKind(prices[p.k]!, c.kind, firstKind);
            const boardChanged = c.topper.root.visible !== (visible && allowed);
            if (boardChanged) c.topper.setEnabled(visible && allowed);
            if (!allowed) continue;
            if (offered && near(p.at) && near(c.action.at) && (holding !== p.k || chosen === c))
              targets.push(...c.topper.targets());
            if (p.visible && bought >= 0 && p.bought < 0) splash(c.action.at.x, c.action.at.z, 0.2, c.action.at.y - 1);
            if (
              visible &&
              (boardChanged ||
                visible !== p.visible ||
                offered !== p.offered ||
                money !== p.money ||
                price !== p.price ||
                (!offered && (wood !== p.wood || stone !== p.stone)))
            ) {
              const title = choiceNames[c.kind]!;
              c.topper.relabel(
                'label',
                offered
                  ? [title, '+1 rider / minute', `Price ${price}`, `Box ${money}`]
                  : [
                      title,
                      `Timber ${wood} / ${p.woodNeed}`,
                      ...(p.stoneNeed ? [`Stone ${stone} / ${p.stoneNeed}`] : []),
                    ],
              );
            }
          }
        }
        if (offered) {
          if (near(p.at)) for (const target of p.offeredTargets) targets.push(target);
        }
        p.bought = bought;
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
                ? [`Plot ${p.k + 1}`, p.loader ? 'Every train' : '+1 rider / minute', `Price ${price}`, `Box ${money}`]
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
      for (const p of plots) {
        if (!p.choices.length) continue;
        let preview = 0;
        if (p.ghost.mesh.visible && near(p.at)) {
          if (holding === p.k) preview = heldKind;
          else {
            const selected = interactTarget();
            preview = p.choices.find((c) => c.action === selected)?.kind ?? 0;
          }
        }
        if (p.preview && preview && p.preview !== preview) knock(0.3, 0.5);
        p.preview = preview;
        for (const c of p.choices) c.toy.mesh.visible = preview === c.kind;
      }
    },
  };
}
