// A2: the Round's delivered freight, on the ground where it will become a house. Local presentation of the
// adapter's Town/plotsStaked read: no interaction, state, physics or system reads this view.
import { Color } from 'three/webgpu';
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

const TIMBER = new Color('#ab6b34'),
  STONE = new Color('#96a5ad');

// Placeholder words for The Boogler; icons and counts follow the depot boards. Paint only: instantiate owns signs.
function paintBoard({ g, cw, ch }: Pick<SignBoard, 'g' | 'cw' | 'ch'>, lines: readonly string[]) {
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
  const plots = prices.map((need, k) => {
    const building = townBuilding(TOWN_PLOTS.order[k]!);
    // Ring plots are approached from the ring road; the road plot beside the hall faces arrivals from the
    // hall/platform. Board centres stay at their authored townLocal offsets; only their facing changes.
    const approach = TOWN_SLOTS.find((s) => s.id === TOWN_PLOTS.order[k])!.ring ? TOWN_CENTRE : HALL;
    const previous = prices[k - 1];
    const woodNeed = need.wood - (previous?.wood ?? 0),
      stoneNeed = need.stone - (previous?.stone ?? 0);
    const parts = kit.map((p) => {
      const framePiece = p.id === 'stakes' || p.id === 'bands' || p.id === 'string';
      const at = townLocal(building, p.pos[0], p.pos[2] + (framePiece ? 0 : building.d / 2));
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
        },
      );
      if (batched) index += visual.instances?.length ?? 1;
      return { id: p.id, instance, index: index - 1 };
    });
    return { k, previous, woodNeed, stoneNeed, parts, last: '' };
  });
  return {
    update(read: TownLook['plots'] | null) {
      const staked = read?.staked ?? [];
      const next = prices.findIndex((_, k) => !staked.includes(k));
      for (const p of plots) {
        const offered = staked.includes(p.k),
          visible = !!read && (offered || p.k === next);
        const wood = Math.max(0, Math.min(p.woodNeed, (read?.wood ?? 0) - (p.previous?.wood ?? 0)));
        const stone = Math.max(0, Math.min(p.stoneNeed, (read?.stone ?? 0) - (p.previous?.stone ?? 0)));
        const key = `${visible}:${offered}:${wood}:${stone}`;
        if (key === p.last) continue;
        p.last = key;
        // Eight crates at most per pile; the board keeps the exact count beyond eight and the drawn mix
        // keeps stone visible from its first delivery.
        const count = Math.min(8, wood + stone);
        const stoneCrates = stone ? Math.max(1, Math.round((count * stone) / (wood + stone))) : 0;
        let crate = 0;
        for (const part of p.parts) {
          if (part.id === 'board') {
            part.instance.relabel('label', [
              `Plot ${p.k + 1}`,
              `Timber ${wood} / ${p.woodNeed}`,
              ...(p.stoneNeed ? [`Stone ${stone} / ${p.stoneNeed}`] : []),
            ]);
            part.instance.setEnabled(visible);
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
