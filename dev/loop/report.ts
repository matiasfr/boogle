// `npm run loop`: every node of the loop graph with its bill, straight-line distance and cue; grind per beat; the
// nodes with no cue; and the order facts. `--json` prints the same as one object.
import { NODES, grindFor, grindOf, hasCue, proposeOrders, type LoopNode, type NodeId } from './graph.ts';

const fmt = (n: number) => String(Math.round(n));
const billText = (bill: LoopNode['bill']) =>
  Object.entries(bill)
    .map(([k, v]) => `${v} ${k}`)
    .join(' + ') || '-';
const cueText = (n: LoopNode) => {
  if (hasCue(n)) return n.cue.filter((c) => c.kind === 'world' && c.state !== 'decided').map((c) => c.what)[0]!;
  const why = n.cue.map((c) =>
    c.kind === 'unknown' ? 'unknown' : c.state === 'decided' ? 'decided, not built' : c.kind,
  );
  return `NO CUE (${[...new Set(why)].join(', ')})`;
};

export function loopReport() {
  const canonical = proposeOrders()[0]!.order;
  const packAt = canonical.indexOf('pack');
  const packed = (id: NodeId) => canonical.indexOf(id) > packAt;
  const nodes = NODES.map((n) => {
    const g = grindOf(n, packed(n.id));
    return {
      id: n.id,
      label: n.label,
      area: n.area,
      optional: !!n.optional,
      bill: n.bill,
      grind: g.map((r) => ({ ...r, metres: Math.round(r.metres) })),
      perPlayer: [1, 2, 3, 4].map((k) => Math.round(grindFor(g, k))),
      cue: hasCue(n),
      cueText: cueText(n),
      cues: n.cue,
    };
  });
  const noCue = nodes.filter((n) => !n.cue).map((n) => ({ id: n.id, why: n.cueText }));
  const edges = NODES.flatMap((n) => n.requires.map((e) => ({ node: n.id, ...e })));
  const defects = edges.filter((e) => e.status === 'decided' && e.by === 'none');
  const ranked = [...nodes].sort((a, b) => b.perPlayer[0]! - a.perPlayer[0]!);
  return {
    note: 'Distances are straight-line (one way, metres), from the nearest sources holding the bill or the rack by the frame.',
    nodes,
    noCue,
    largestGrind: ranked[0]!.id,
    grindRank: ranked.filter((n) => n.perPlayer[0]! > 0).map((n) => ({ id: n.id, perPlayer: n.perPlayer })),
    defects,
    free: edges.filter((e) => e.status === 'free'),
    unruled: edges.filter((e) => e.status === 'unruled'),
    worldOnly: edges.filter((e) => e.status === 'decided' && e.by === 'world'),
    orders: proposeOrders().map((o) => o.name),
  };
}

export function printReport(json: boolean) {
  const r = loopReport();
  if (json) return console.log(JSON.stringify(r, null, 2));
  const out: string[] = [`Loop graph: ${r.nodes.length} nodes, today's Home. ${r.note}`, ''];
  out.push('node      bill                          carries x straight-line m             cue');
  for (const n of r.nodes) {
    const g = n.grind.map((x) => `${x.carries}x${x.metres}${x.by === 'hand' ? '' : ` (${x.by})`}`).join(', ') || '-';
    out.push(
      `${(n.id + (n.optional ? '*' : '')).padEnd(9)} ${billText(n.bill).padEnd(29)} ${g.padEnd(32)} ${n.cueText}`,
    );
  }
  out.push('  (* optional: no rule needs it)', '');
  out.push(
    'Grind per beat: loaded carry-metres per player (one way, straight-line). Headline 1-3 players; 4 secondary.',
  );
  for (const g of r.grindRank)
    out.push(
      `  ${g.id.padEnd(9)} 1p ${fmt(g.perPlayer[0]!).padStart(6)}  2p ${fmt(g.perPlayer[1]!).padStart(6)}  3p ${fmt(g.perPlayer[2]!).padStart(6)}   (4p ${fmt(g.perPlayer[3]!)})`,
    );
  out.push(`Largest grind: ${r.largestGrind}`, '');
  out.push(`No cue (${r.noCue.length}):`);
  for (const n of r.noCue) out.push(`  ${n.id.padEnd(9)} ${n.why}`);
  out.push('', 'Order facts (authored from the code; `npm run loop -- run` probes them through the rules):');
  out.push(`  Defects, a decided order the rules accept out of order (${r.defects.length}):`);
  for (const e of r.defects) out.push(`    ${e.node} after ${e.on}: ${e.source}`);
  out.push(`  Free, the owner chose either order (${r.free.length}):`);
  for (const e of r.free) out.push(`    ${e.node} / ${e.on}: ${e.source}`);
  out.push(`  Unruled, for the owner (${r.unruled.length}):`);
  for (const e of r.unruled) out.push(`    ${e.node} / ${e.on}: ${e.source}`);
  out.push(`  Decided, held by the world only, not the sim (${r.worldOnly.length}):`);
  for (const e of r.worldOnly) out.push(`    ${e.node} after ${e.on}: ${e.source}`);
  out.push('', `Orders the solver proposes (${r.orders.length}): ${r.orders.join('; ')}`);
  console.log(out.join('\n'));
}
