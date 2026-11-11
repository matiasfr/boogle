// Bounded opt-in physical audit. Incomplete creator coverage is a failure, never a regional green result.
import fs from 'node:fs';
import path from 'node:path';
import { parseSync, visitorKeys } from 'oxc-parser';
import { openScene, type Solid, type Source, type Finding } from './scene.ts';
import { sourceFunction } from './source.ts';
import type { V3 } from '../../src/physics/engine.ts';
import { PLAYER_R } from '../../src/constants.ts';
import { sourceBuild } from './build.ts';

// Each unadapted creator is conservative unknown coverage. We cannot prove its regional bounds by its filename.
// Including every unknown prevents a newly introduced creator silently disappearing from the denominator.
function creators(): Source[] {
  const out = new Map<string, Source>();
  for (const file of fs.globSync('src/proto/place/*.ts').sort()) {
    const text = fs.readFileSync(file, 'utf8');
    const ast = parseSync(file, text).program;
    type Node = { type: string; start: number; end: number; [key: string]: unknown };
    const visit = (n: Node, owner: string) => {
      const id = n.id as Node | null;
      if (n.type === 'FunctionDeclaration' && id) owner = text.slice(id.start, id.end);
      if (
        n.type === 'VariableDeclarator' &&
        n.init &&
        ['ArrowFunctionExpression', 'FunctionExpression'].includes((n.init as Node).type)
      )
        owner = (id!.name as string | undefined) ?? text.slice(id!.start, id!.end);
      if (
        n.type === 'CallExpression' &&
        /^(addStatic|addStatics|addSolid|createBody|slab|plank)$/.test(
          text.slice((n.callee as Node).start, (n.callee as Node).end),
        )
      ) {
        const symbol = owner || '<module>';
        out.set(`${file}:${symbol}`, { file, symbol });
      }
      for (const key of visitorKeys[n.type] ?? []) {
        const child = n[key];
        if (Array.isArray(child)) child.forEach((item: Node | null) => item && visit(item, owner));
        else if (child) visit(child as Node, owner);
      }
    };
    visit(ast as unknown as Node, '');
  }
  return [...out.values()];
}

export async function runSpatialAudit(args: string[]) {
  const start = performance.now();
  const option = (name: string, fallback: string) =>
    args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1] ?? fallback;
  const region = option('region', 'T3'),
    state = option('state', region === 'stack' ? 'glide' : 'empty');
  const fixture = option('fixture', '');
  if (region === 'cove') {
    if (fixture) throw new Error('Cove audit does not accept fixtures');
    const { auditCove } = await import('./cove.ts');
    await auditCove();
    return;
  }
  if (!['T3', 'stack'].includes(region) || !['empty', 'stocked', 'path-built', 'glide'].includes(state))
    throw new Error('Supported regions: T3, stack; states: empty, stocked, path-built, glide');
  if (fixture && !['support-gap', 'blocked-stance', 'missing-descriptor'].includes(fixture))
    throw new Error('Unknown fixture');
  const L = await import('../../src/place/layout.ts');
  const T = await import('../../src/place/terrain.ts');
  const tech = await import('../../src/place/tech-layout.ts');
  const station = await import('../../src/place/spatial-station.ts');
  const build = sourceBuild();
  const issues: Finding[] = [];
  const source = (file: string, symbol: string): Source => ({ file: `src/proto/place/${file}.ts`, symbol });
  const issue = (
    rule: string,
    object: string,
    src: Source,
    p: V3,
    evidence: Record<string, unknown>,
    surface: string | null = null,
  ) =>
    issues.push({
      rule,
      object,
      source: src,
      surface,
      world: [p.x, p.y, p.z],
      requiredState: state,
      evidence,
      suggestion: 'Inspect the source-linked geometry and exact-build witness; no automatic layout change.',
    });
  const link = L.LINKS.find((l) => l.stations.some((s) => s.id === 'T3'))!;
  const spec = link.stations.find((s) => s.id === 'T3')!;
  const frame = station.frameBesideLine(spec, link.line, link.dir);
  const stack = tech.padById('stack');
  const center =
    region === 'T3'
      ? { x: frame.x, y: T.H(frame.x, frame.z), z: frame.z }
      : { x: stack.x + L.ORIGIN.x, y: stack.top, z: stack.z };
  const margin = region === 'T3' ? 18 : 32;
  const bounds = { x0: center.x - margin, x1: center.x + margin, z0: center.z - margin, z1: center.z + margin };
  const intersects = (p: V3, radius: number) =>
    p.x + radius >= bounds.x0 && p.x - radius <= bounds.x1 && p.z + radius >= bounds.z0 && p.z - radius <= bounds.z1;
  const solids: Solid[] = [];
  const hf: number[][] = [];
  for (let i = 0; i < T.NX; i++) {
    const col: number[] = [];
    for (let j = 0; j < T.NZ; j++) col.push(T.heights[T.at(i, T.NZ - 1 - j)]!);
    hf.push(col);
  }
  solids.push({
    id: 'terrain',
    source: source('land', 'buildMesh'),
    shape: { kind: 'heightfield', heights: hf, cell: T.CELL },
    position: { x: L.ORIGIN.x + L.GRID.x0, y: 0, z: L.ORIGIN.z + L.GRID.z1 },
    support: 'embedded',
  });
  const assembly = station.stationColliders(frame, center.y, Boolean(spec.rails));
  if (region === 'T3') {
    for (const c of [...assembly.frame, assembly.feeder, ...(assembly.rails ? [assembly.rails] : [])])
      solids.push({
        ...c,
        id: `T3/${c.id}`,
        source: source('stations', 'buildStation'),
        rotation: { x: 0, y: Math.sin(c.yaw / 2), z: 0, w: Math.cos(c.yaw / 2) },
        support: c === assembly.frame[0] ? 'grounded' : 'assembly',
      });
    if (state === 'stocked') {
      // Obtain the original slot function and constants without importing pieces' renderer and animation setup.
      const piece = sourceFunction<{ r: number }>('src/render/haul-pieces.ts', 'PIECE', {});
      const stackLog = sourceFunction<{ thick: number }>('src/place/pieces.ts', 'STACK_LOG', {});
      const logH = sourceFunction<number>('src/place/pieces.ts', 'logH', { PIECE: piece, STACK_LOG: stackLog });
      const slot = sourceFunction<
        (n: number, perRow: number, at: V3, yaw: number, out: { set: (x: number, y: number, z: number) => V3 }) => V3
      >('src/place/pieces.ts', 'stackSlot', { logH });
      const at = { ...center, y: center.y + 0.12 },
        out = { set: (x: number, y: number, z: number) => ({ x, y, z }) };
      const radius = slot(0, station.PER_ROW, at, frame.yaw, out).y - at.y;
      const top =
        slot(
          (Math.ceil(Math.min(56, spec.logs) / station.PER_ROW) - 1) * station.PER_ROW,
          station.PER_ROW,
          at,
          frame.yaw,
          out,
        ).y + radius;
      const c = station.stationStockCollider(frame, center.y, top);
      solids.push({
        ...c,
        id: 'T3/stock',
        source: source('stations', 'drawStock'),
        support: 'assembly',
        rotation: { x: 0, y: Math.sin(c.yaw / 2), z: 0, w: Math.cos(c.yaw / 2) },
      });
    }
  }
  // Pure pad data, faithful buildPads box/tile adapter. Its column and other tech solids stay missing below.
  for (const pad of tech.PADS) {
    const p = { x: pad.x + L.ORIGIN.x, y: pad.top, z: pad.z };
    if (!intersects(p, Math.hypot(pad.hx, pad.hz))) continue;
    const thick = pad.look === 'float' ? 0.9 : pad.look === 'wood' ? 0.4 : 1.2;
    const nx = pad.ring ? Math.ceil(pad.hx / 0.75) : 1,
      nz = pad.ring ? Math.ceil(pad.hz / 0.75) : 1;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        solids.push({
          id: `pad/${pad.id}/${i}/${j}`,
          source: source('tech', 'buildPads'),
          support: 'suspended',
          shape: { kind: 'box', hx: pad.hx / nx, hy: thick / 2, hz: pad.hz / nz },
          position: {
            x: p.x - pad.hx + (pad.hx / nx) * (i * 2 + 1),
            y: p.y - thick / 2,
            z: p.z - pad.hz + (pad.hz / nz) * (j * 2 + 1),
          },
        });
    if (pad.ring) {
      const r = tech.ringAt(pad);
      solids.push({
        id: `ring/${pad.id}`,
        source: source('tech', 'buildRings'),
        support: 'assembly',
        shape: { kind: 'box', hx: 0.11, hy: (r.y - 0.55 - pad.top) / 2, hz: 0.11 },
        position: { x: r.x + L.ORIGIN.x, y: (r.y - 0.55 + pad.top) / 2, z: r.z },
      });
    }
  }
  const expected = creators();
  // T3's adapter does not cover every buildStation caller (notably the forge). Keep that creator partial.
  const fullyIncluded = new Set(['land:buildMesh']);
  const missing = expected.filter((s) => !fullyIncluded.has(`${path.basename(s.file, '.ts')}:${s.symbol}`));
  for (const s of missing)
    issue('coverage-missing', `${s.file}:${s.symbol}`, s, center, {
      reason: 'Creator not fully exported; intersection with region unproven. Regional clearance is inconclusive.',
    });
  if (fixture === 'missing-descriptor')
    issue('coverage-missing', 'scratch/missing', source('stations', 'buildStation'), center, {
      fixture,
      reason: 'Expected scratch solid intentionally absent',
    });
  if (fixture === 'support-gap')
    solids.push({
      id: 'scratch/support-gap',
      source: source('stations', 'buildStation'),
      shape: { kind: 'box', hx: 0.4, hy: 0.2, hz: 0.4 },
      position: { x: center.x + 8, y: T.H(center.x + 8, center.z) + 2, z: center.z },
      support: 'grounded',
    });
  if (fixture === 'blocked-stance')
    solids.push({
      id: 'scratch/blocked-stance',
      source: source('verbs', 'registerInteractable'),
      shape: { kind: 'box', hx: 5, hy: 2, hz: 5 },
      position: { ...center, y: center.y + 2 },
      support: 'embedded',
    });
  const exportMs = performance.now() - start;
  const scene = await openScene(solids);
  const queryStart = performance.now();
  const probes: Record<string, unknown> = {};
  try {
    for (const s of solids.filter((s) => s.support === 'grounded' && s.shape.kind === 'box')) {
      if (s.shape.kind !== 'box') continue;
      const b = s.shape;
      for (const dx of [-b.hx, b.hx])
        for (const dz of [-b.hz, b.hz]) {
          const yaw = s.rotation ? 2 * Math.atan2(s.rotation.y, s.rotation.w) : 0;
          const foot = {
            x: s.position.x + Math.cos(yaw) * dx + Math.sin(yaw) * dz,
            y: s.position.y - b.hy,
            z: s.position.z - Math.sin(yaw) * dx + Math.cos(yaw) * dz,
          };
          const hit = scene.below({ ...foot, y: foot.y + 0.3 }, 4, s.id, 'terrain');
          if (!hit || foot.y - hit.y > 0.35)
            issue(
              'support-gap',
              s.id,
              s.source,
              foot,
              { gapM: hit ? foot.y - hit.y : null, toleranceM: 0.35, fixture: fixture || undefined },
              hit?.solid.id ?? null,
            );
        }
    }
    const stances: V3[] = [],
      swept: V3[] = [];
    for (let n = 0; n < 32; n++) {
      const a = (n * Math.PI) / 16,
        dx = Math.cos(a),
        dz = Math.sin(a);
      const p = { x: center.x + dx * 2.3, y: center.y, z: center.z + dz * 2.3 };
      const hit = scene.below({ ...p, y: p.y + 0.5 }, 1.5);
      if (!hit || Math.abs(hit.y - center.y) > 1) continue;
      p.y = hit.y;
      if (scene.clear(p)) continue;
      stances.push(p);
      const from = { x: center.x + dx * 6, y: p.y, z: center.z + dz * 6 };
      const ground = scene.below({ ...from, y: from.y + 1 }, 3);
      if (!ground) continue;
      from.y = ground.y;
      if (!scene.sweep(from, p)) swept.push(p);
    }
    probes.stance = {
      status: stances.length ? 'sample-found-in-partial-scene' : 'no-sample',
      samples: 32,
      valid: stances,
      note: 'Geometric candidate stances only; runtime inventory, target priority and vertical hand reach unverified.',
    };
    probes.approach = {
      straightSweeps: swept,
      note: 'Both makePlayerBody spheres; clearance only. Support between endpoints, controller/jump and path-search unverified.',
    };
    if (!stances.length)
      issue('stance-blocked', region, source('verbs', 'registerInteractable'), center, {
        samples: 32,
        fixture: fixture || undefined,
      });
    if (region === 'T3' && stances.length && !swept.length)
      issue('approach-blocked', region, source('stations', 'buildStation'), center, {
        samples: 32,
        note: 'No collision-free straight sweep in sampled directions; continuous support and curved paths untested',
      });
    if (region === 'stack') {
      probes.approach = {
        status: 'ability-witness-required',
        note: 'Sea stack intentionally requires glide; an absent ground approach is not a defect.',
      };
      const target = tech.PADS.find((p) => p.ring === 'stack');
      const ring = target && tech.ringAt(target);
      const distance = ring ? Math.hypot(ring.x - stack.x, ring.z - stack.z, ring.y - (stack.top + PLAYER_R)) : null;
      probes.dryReturn = {
        target: target?.id ?? null,
        distance,
        range: tech.MOVE.hookRange,
        status: target && distance !== null && distance <= tech.MOVE.hookRange ? 'range-only' : 'no-edge',
        note: 'Directed stack-to-ring; camera acquisition, pull sweep and track connection remain unverified.',
      };
      if (!target || distance === null || distance > tech.MOVE.hookRange)
        issue('dry-return-missing', 'stack', source('tech-layout', 'PADS'), center, {
          distance,
          range: tech.MOVE.hookRange,
        });
    }
    probes.recovery = {
      status: 'coverage-blocked',
      source: source('verbs', 'nearestSample'),
      reason: 'Active buildTrack solids not exported; cannot certify recovery candidates.',
    };
    if (region === 'T3') {
      const { auditCurrentCrate } = await import('./replay.ts');
      const crate = await auditCurrentCrate();
      probes.crate = crate;
      if (crate.unsafeApproach)
        issue('crate-footprint-unsafe', 'T3/reward-crate', source('run', 'handCrate'), crate.delivered, {
          samples: crate.samples,
          maximumHeightResidualM: crate.maximumHeightResidualM,
          marginM: crate.marginM,
          toleranceM: crate.toleranceM,
          method: crate.method,
        });
    }
    probes.overlap = {
      status: 'player-tested',
      note: 'Two-sphere intersections at every stance; assembly overlap policy not established.',
    };
    const coverage = {
      expected: expected.length + (fixture === 'missing-descriptor' ? 1 : 0),
      included: expected.length - missing.length,
      missing: [
        ...missing.map((s) => `${s.file}:${s.symbol}`),
        ...(fixture === 'missing-descriptor' ? ['scratch/missing'] : []),
      ],
      excluded: [
        { name: 'dynamic trains, cargo, players', reason: 'No dynamic gameplay simulation in bounded static audit' },
      ],
      scannerLimit: 'Syntactic place creator inventory; aliases/external creators and runtime parity not certified',
    };
    const report = {
      schema: 1,
      build: { ...build, dependencies: undefined },
      selection: { place: 'place', region, state, fixture: fixture || undefined },
      status: issues.length ? 'findings' : 'incomplete',
      coverage,
      issues,
      probes,
      timingMs: { export: exportMs, physicsInit: scene.physicsInit, queries: performance.now() - queryStart },
    };
    const dir = path.resolve(
      '.look/level-check',
      build.sourceHash,
      region,
      fixture ? `${state}-fixture-${fixture}` : state,
    );
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, 'manifest.json'),
      JSON.stringify(
        {
          schema: 1,
          build,
          selection: report.selection,
          bounds,
          stateFacts: {
            logs: region === 'T3' ? (state === 'stocked' ? spec.logs : 0) : null,
            track: 'not exported',
            stateCoverage:
              'Partial static selection only; path-built/glide track activation is not represented. Stack stock is not meaningful.',
            abilities: state === 'glide' ? ['jump', 'hook', 'glide'] : [],
          },
          player: scene.player,
          solids,
          coverage,
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
    const esc = (v: string) => v.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
    const scale = 700 / (margin * 2),
      sx = (x: number) => 30 + (x - bounds.x0) * scale,
      sz = (z: number) => 60 + (z - bounds.z0) * scale;
    const rects = solids
      .filter((s) => s.shape.kind === 'box')
      .map((s) => {
        if (s.shape.kind !== 'box') return '';
        return `<rect x="${sx(s.position.x) - s.shape.hx * scale}" y="${sz(s.position.z) - s.shape.hz * scale}" width="${2 * s.shape.hx * scale}" height="${2 * s.shape.hz * scale}" fill="#488ea780" stroke="#93d2de" transform="rotate(${-(s.rotation ? (2 * Math.atan2(s.rotation.y, s.rotation.w) * 180) / Math.PI : 0)} ${sx(s.position.x)} ${sz(s.position.z)})"><title>${esc(s.id)}</title></rect>`;
      })
      .join('');
    fs.writeFileSync(
      path.join(dir, 'map.svg'),
      `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="820"><rect width="760" height="820" fill="#17232b"/><g fill="#fff" font-family="monospace"><text x="30" y="25">${region} / ${state} / ${build.sourceHash.slice(0, 12)}</text><text x="30" y="46">INCOMPLETE: ${missing.length} creator coverage failures</text></g>${rects}${stances.map((p) => `<circle cx="${sx(p.x)}" cy="${sz(p.z)}" r="3" fill="#b3e079"/>`).join('')}<circle cx="${sx(center.x)}" cy="${sz(center.z)}" r="4" fill="#ffd166"/><text x="30" y="790" fill="white" font-family="monospace">cyan solids; green stance candidates; north up; no runtime parity</text></svg>`,
    );
    if (args.includes('--json')) console.log(JSON.stringify({ ...report, artifacts: dir }, null, 2));
    else console.log(`${region}/${state}: ${issues.length} findings; ${missing.length} missing creators; ${dir}`);
    if (issues.length) process.exitCode = 1;
  } finally {
    scene.world.free();
  }
}
