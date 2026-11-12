// `npm run loop`: every node of the loop graph with its bill, straight-line distance and cue; grind per beat; the
// nodes with no cue; and the order facts. `--json` prints the same as one object.
import {
  DETOUR,
  DETOUR_MIN_N,
  NODES,
  detourOf,
  grindFor,
  grindOf,
  hasCue,
  proposeOrders,
  vehicleFed,
  vehicleOnly,
  type LoopNode,
  type NodeId,
} from './graph.ts';
import { STAND_IN_IDS, standInLines, standInRoute } from './standins.ts';

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

function loopReport() {
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
      grind: g.map((r) => ({ ...r, metres: Math.round(r.metres), handMetres: Math.round(r.handMetres) })),
      perPlayer: [1, 2, 3, 4].map((k) => Math.round(grindFor(g, k))),
      byHand: [1, 2, 3, 4].map((k) => Math.round(grindFor(g, k, true))),
      vehicleFed: vehicleFed(n),
      vehicleOnly: vehicleOnly(n),
      cue: hasCue(n),
      cueText: cueText(n),
      cues: n.cue,
    };
  });
  const noCue = nodes.filter((n) => !n.cue).map((n) => ({ id: n.id, why: n.cueText }));
  const edges = NODES.flatMap((n) => n.requires.map((e) => ({ node: n.id, ...e })));
  const defects = edges.filter((e) => e.status === 'decided' && e.by === 'none');
  const ranked = [...nodes].sort((a, b) => b.perPlayer[0]! - a.perPlayer[0]!);
  const handRanked = [...nodes].filter((n) => n.vehicleFed).sort((a, b) => b.byHand[0]! - a.byHand[0]!);
  return {
    note: 'Distances are straight-line (one way, metres), from the nearest sources holding the bill or the rack by the frame.',
    nodes,
    noCue,
    largestGrind: ranked[0]!.id,
    largestByHand: handRanked[0]?.id,
    vehicleOnly: nodes.filter((n) => n.vehicleOnly).map((n) => n.id),
    grindRank: ranked
      .filter((n) => n.perPlayer[0]! > 0)
      .map((n) => {
        const d = detourOf(n.id);
        return {
          id: n.id,
          perPlayer: n.perPlayer,
          byHand: n.byHand,
          vehicleFed: n.vehicleFed,
          detour: d,
          calibrated: d ? n.perPlayer.map((v) => Math.round(v * d.median)) : null,
          measured: DETOUR?.nodes[n.id]?.n ?? 0,
        };
      }),
    detourSessions: DETOUR?.sessions.length ?? 0,
    defects,
    free: edges.filter((e) => e.status === 'free'),
    unruled: edges.filter((e) => e.status === 'unruled'),
    worldOnly: edges.filter((e) => e.status === 'decided' && e.by === 'world'),
    orders: proposeOrders().map((o) => o.name),
  };
}

/** `npm run loop -- node <id>`: one node in a dozen lines, for an agent touching that beat. */
export function printNode(id: string, json: boolean) {
  if (STAND_IN_IDS.includes(id)) {
    const s = standInRoute().nodes.find((x) => x.id === id)!;
    return console.log(json ? JSON.stringify(s, null, 2) : standInLines(undefined, id).join('\n'));
  }
  const r = loopReport();
  const n = r.nodes.find((x) => x.id === id);
  if (!n)
    throw new Error(
      `no node "${id}". Nodes: ${r.nodes.map((x) => x.id).join(', ')}. Stand-ins: ${STAND_IN_IDS.join(', ')}`,
    );
  const edges = [...r.defects, ...r.free, ...r.unruled, ...r.worldOnly].filter((e) => e.node === id || e.on === id);
  const requires = NODES.find((x) => x.id === id)!.requires;
  const g = r.grindRank.find((x) => x.id === id);
  if (json) return console.log(JSON.stringify({ ...n, requires, grind: g ?? null }, null, 2));
  const out = [
    `${n.id}${n.optional ? ' (optional)' : ''}: ${n.label} [${n.area}]`,
    `  bill: ${billText(n.bill)}`,
    `  carries x straight-line m: ${n.grind.map((x) => `${x.carries}x${x.metres}${x.by === 'hand' ? '' : ` (${x.by})`}`).join(', ') || '-'}`,
    ...(n.vehicleFed
      ? [`  by hand if the vehicle is away: ${n.grind.map((x) => `${x.carries}x${x.handMetres}`).join(', ')}`]
      : []),
    `  grind 1-4 players: ${n.perPlayer.join(' / ')}${n.vehicleFed ? `; by hand ${n.byHand.join(' / ')}` : ''}${g?.detour ? `; humans walk x${g.detour.median.toFixed(2)} the prediction (n ${g.detour.n})` : ''}`,
    `  cue: ${n.cueText}`,
    `  requires: ${requires.map((e) => `${e.on} (${e.status}, held by ${e.by})`).join(', ') || 'nothing'}`,
    ...edges
      .filter((e) => e.status !== 'decided' || e.by !== 'rules')
      .map((e) => `  order note: ${e.node} / ${e.on}: ${e.status}, ${e.source}`),
  ];
  console.log(out.join('\n'));
}

export function printReport(json: boolean) {
  const r = loopReport();
  if (json) return console.log(JSON.stringify({ ...r, standIns: standInRoute().nodes }, null, 2));
  const out: string[] = [`Loop graph: ${r.nodes.length} nodes, today's Home. ${r.note}`, ''];
  out.push(
    'node      bill                          carries x straight-line m       by hand if the vehicle is away       cue',
  );
  for (const n of r.nodes) {
    const g = n.grind.map((x) => `${x.carries}x${x.metres}${x.by === 'hand' ? '' : ` (${x.by})`}`).join(', ') || '-';
    const hand = n.vehicleFed
      ? n.grind.map((x) => `${x.carries}x${x.handMetres}${x.foot ? ` (${x.foot})` : ''}`).join(', ')
      : '';
    out.push(
      `${(n.id + (n.optional ? '*' : '')).padEnd(9)} ${billText(n.bill).padEnd(29)} ${g.padEnd(26)} ${hand.padEnd(36)} ${n.cueText}`,
    );
  }
  out.push('  (* optional: no rule needs it)', '');
  out.push(
    'Grind per beat: loaded carry-metres per player (one way, straight-line). Headline 1-3 players; 4 secondary.',
    'By hand: the same with every vehicle away, each vehicle material fetched on foot from its nearest source.',
    `Calibrated: straight-line times the node's median detour (walked over predicted) from ${r.detourSessions} human session(s), dev/loop/detour.json; a node needs ${DETOUR_MIN_N}.`,
  );
  for (const g of r.grindRank) {
    const row = (v: number[]) =>
      `1p ${fmt(v[0]!).padStart(6)}  2p ${fmt(v[1]!).padStart(6)}  3p ${fmt(v[2]!).padStart(6)}   (4p ${fmt(v[3]!).padStart(5)})`;
    const cal = g.calibrated
      ? `calibrated 1p ${fmt(g.calibrated[0]!).padStart(6)} (x${g.detour!.median.toFixed(2)}, n ${g.detour!.n})`
      : `uncalibrated (n ${g.measured})`;
    out.push(
      `  ${g.id.padEnd(9)} straight-line ${row(g.perPlayer)}   ${cal.padEnd(34)}${g.vehicleFed ? `   by hand ${row(g.byHand)}` : ''}`,
    );
  }
  out.push(`Largest grind: ${r.largestGrind}. Largest by hand: ${r.largestByHand ?? 'none'}.`);
  out.push(`All on a vehicle (nothing on the bill comes on foot today): ${r.vehicleOnly.join(', ') || 'none'}`, '');
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
  out.push(
    '',
    'Past the built graph, to the ending: STAND-INS (dev/loop/standins.ts; modelled by `npm run loop -- run`, never played).',
    ...standInLines(),
  );
  console.log(out.join('\n'));
}
