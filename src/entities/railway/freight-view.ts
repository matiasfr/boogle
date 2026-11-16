// Cosmetic/Local: yard piles and their boards follow the adapter's mirror, never accumulate stock.
import { Color } from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { SignBoard } from '../../render/sign-board.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { Yard } from '../../sim/railway-components.ts';
import { TRADE } from '../../sim/railway-trade-layout.ts';
import { toWorld } from '../../place/layout.ts';
import { H } from '../../place/terrain.ts';

// Plan A1's Place-local centres; A2's 0.78 m crates and 0.84 m pitch, in two layers of four.
const CENTRES = [
  { x: 9.64, z: -143.1 },
  { x: 66.59, z: 29.74 },
] as const;
const TINT = { wood: '#a8703a', stone: '#8f959c' }; // the existing train crate goods palette

function paintCount({ g, cw, ch }: Pick<SignBoard, 'g' | 'cw' | 'ch'>, lines: readonly string[], stone: boolean) {
  g.fillStyle = '#493522';
  g.fillRect(0, 0, cw, ch);
  g.strokeStyle = '#edcf8c';
  g.lineWidth = ch * 0.045;
  g.strokeRect(ch * 0.05, ch * 0.05, cw - ch * 0.1, ch * 0.9);
  g.fillStyle = stone ? '#a9b9c1' : '#eac28a';
  if (stone) {
    g.beginPath();
    g.moveTo(cw * 0.12, ch * 0.7);
    g.lineTo(cw * 0.14, ch * 0.35);
    g.lineTo(cw * 0.29, ch * 0.25);
    g.lineTo(cw * 0.36, ch * 0.7);
    g.closePath();
    g.fill();
  } else {
    for (const [x, y] of [
      [0.17, 0.63],
      [0.31, 0.63],
      [0.24, 0.39],
    ]) {
      g.beginPath();
      g.arc(cw * x!, ch * y!, ch * 0.13, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.fillStyle = '#fff5dc';
  g.font = `900 ${ch * 0.6}px Figtree, system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(lines[0]!, cw * 0.69, ch * 0.53, cw * 0.49);
}

export function createFreight(adapter: RailwayAdapter, owner: OwnedView) {
  const yards = TRADE.yards.map((yard, slot) => {
    const centre = CENTRES[slot]!;
    const x = toWorld(centre.x),
      z = centre.z;
    const batch = createPrefabBatch('town.plot-crate', 8, owner);
    batch.mesh.name = `freight:yard${slot}`;
    batch.mesh.castShadow = batch.mesh.receiveShadow = true;
    const tint = new Color(TINT[yard.goods]);
    const crates = Array.from({ length: 8 }, (_, i) => {
      const cx = x + (i % 2 ? 0.42 : -0.42),
        cz = z + (Math.floor(i / 2) % 2 ? 0.42 : -0.42);
      const crate = instantiate(
        'town.plot-crate',
        {
          id: `freight:yard${slot}:crate${i}`,
          prefab: 'town.plot-crate',
          pos: [cx, H(cx, cz) + 0.39 + Math.floor(i / 4) * 0.78, cz],
          scale: [0.78, 0.78, 0.78],
        },
        { owner, batch: { target: batch, index: i } },
      );
      batch.mesh.setColorAt(i, tint);
      return crate;
    });
    batch.mesh.instanceColor!.needsUpdate = true;
    const board = instantiate(
      'railway.waiting-board',
      {
        id: `freight:yard${slot}:board`,
        prefab: 'railway.waiting-board',
        pos: [x + 1.5, H(x + 1.5, z), z],
        labels: { sign: 'count' },
      },
      { owner, texts: { count: ['0'] }, paintLabel: (sign, lines) => paintCount(sign, lines, yard.goods === 'stone') },
    );
    board.root.name = `freight:yard${slot}:board`;
    return { slot, crates, board, count: -1, shown: false };
  });
  return {
    update() {
      const w = adapter.read.world();
      for (const yard of yards) {
        const id = w.lookup(Yard, yard.slot),
          row = id === undefined ? undefined : w.get(Yard, id);
        const count = row && Number.isFinite(row.stock) ? Math.max(0, Math.floor(row.stock)) : 0;
        if (count === yard.count && !!row === yard.shown) continue;
        yard.count = count;
        yard.shown = !!row;
        yard.board.setEnabled(!!row);
        yard.board.relabel('sign', [String(count)]);
        // The true count stays on the board even above eight; no crate goes outside the fixed 2 x 2 x 2 layout.
        yard.crates.forEach((crate, i) => crate.setEnabled(!!row && i < Math.min(8, count)));
      }
    },
  };
}
