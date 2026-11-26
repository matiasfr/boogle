import {
  STACK_CROSSING,
  STACK_WEST,
  STACK_WEST_LEVER,
  stackPieces,
  westStands,
} from '../../src/entities/route-greybox/stack-halts.ts';
import { line2Lat, line2World, line2Y } from '../../src/entities/railway/line2-path.ts';
import { LINE2, RAIL_LINES, TRAIN_EXTENT } from '../../src/sim/railway-lines.ts';
import { seaCrossovers, crossoverPlan } from '../../src/place/junctions.ts';
import { WALKABLE_NY } from '../../src/constants.ts';
import type { GreyBox } from '../../src/entities/route-greybox/boxes.ts';
import { legFrame, legRack, RAIL_LEGS } from '../../src/sim/railway-route.ts';
import { stackDisplays } from '../../src/entities/railway/halt-map.ts';

/** Horizontal penetration of two walking faces; a negative result is a separating gap. */
function faceOverlap(a: GreyBox, b: GreyBox) {
  function projection(box: GreyBox, x: number, z: number) {
    const pitch = box.pitch ?? 0,
      along = x * Math.sin(box.yaw) + z * Math.cos(box.yaw);
    const center = box.x * x + box.z * z - ((along * box.h) / 2) * Math.sin(pitch);
    const half =
      ((Math.abs(along) * box.d) / 2) * Math.cos(pitch) +
      (Math.abs(x * Math.cos(box.yaw) - z * Math.sin(box.yaw)) * box.w) / 2;
    return [center - half, center + half] as const;
  }
  let depth = Infinity;
  for (const box of [a, b])
    for (const angle of [box.yaw, box.yaw + Math.PI / 2]) {
      const x = Math.sin(angle),
        z = Math.cos(angle),
        first = projection(a, x, z),
        second = projection(b, x, z);
      depth = Math.min(depth, first[1] - second[0], second[1] - first[0]);
    }
  return depth;
}

export function checkStackHalts() {
  const rows: { head: number; name: string; value: number; expected: number; ok: boolean }[] = [];
  const pitches = [
    [8.91554, 8.83944],
    [8.87429, 8.92047],
    [8.89387, 8.88121],
  ];
  const colours = { deck: 'deck', ramp: 'ramp', pile: 'pile', slab: 'slab', plank: 'plank' };
  for (const [index, h] of RAIL_LINES[LINE2]!.halts.slice(6, 9).entries()) {
    const head = index + 1,
      r = h.s / 100 + 10;
    const crossing = seaCrossovers().find((c) => c.id === `J12.${head}`)!;
    const plan = crossoverPlan(crossing),
      built = stackPieces(r, true, -20, colours);
    const { from, to } = STACK_CROSSING,
      home = r - from;
    function pin(name: string, value: number, expected: number, min = -Infinity, max = Infinity) {
      rows.push({
        head,
        name,
        value,
        expected,
        ok: Math.abs(value - expected) <= 0.01 && value >= min && value <= max,
      });
    }
    pin('timber clearance', home - Math.max(...plan.timbers.map((t) => t.s)) - 0.15, 0.17, 0.1);
    const toe = plan.toes[1]!,
      pivot = toe.t.lever;
    const at = { x: 0, z: 0 },
      ahead = { ...at };
    line2World(toe.j.s, -2, at);
    line2World(toe.j.s + 1, -2, ahead);
    const dx = ahead.x - at.x,
      dz = ahead.z - at.z;
    const leverS = toe.j.s + ((pivot.x - at.x) * dx + (pivot.z - at.z) * dz) / Math.hypot(dx, dz);
    pin('lever box clearance', home - leverS - 0.4, 0.9, 0.5);
    pin('arm clearance', home - leverS - 0.04, 1.26);
    pin('blade clearance', home - toe.j.s, 1.5);
    pin('stopped tail', h.s / 100 - TRAIN_EXTENT.behindCm / 100 - (r - to), 0.8, 0.6);
    const signal = RAIL_LINES[LINE2]!.signals![index]! / 100;
    pin('signal tail', signal - TRAIN_EXTENT.behindCm / 100 - (r - to), 10.8, 0.6);
    const stops = RAIL_LINES[LINE2]!.halts.slice(0, 6 + head).map((stop) => stop.s);
    pin(
      'retained departure lateral',
      line2Lat({ track: 1, origin: 0 }, r - (from + to) / 2, stops, undefined, true),
      0,
    );
    pin('plank spans', built.planks.length, 5);
    pin('crossing length', from - to, 1.6);
    pin('plank top', built.planks[0]!.y + built.planks[0]!.h / 2 - line2Y(r), 0.29);
    for (const [i, rail] of [-4.5, -3.5, -0.5, 0.5].entries()) {
      const center = line2World(r - (from + to) / 2, rail, { x: 0, z: 0 });
      for (const plank of built.planks.slice(i, i + 2)) {
        const distance = Math.abs(
          (center.x - plank.x) * Math.cos(plank.yaw) - (center.z - plank.z) * Math.sin(plank.yaw),
        );
        pin('flangeway', distance - plank.w / 2 - 0.06, 0.08);
      }
    }
    const deckPieces = built.boxes.filter((b) => b.colour === colours.deck);
    const faces = built.boxes.filter((b) => b.colour !== colours.pile);
    const leverBox: GreyBox = { x: pivot.x, y: pivot.y, z: pivot.z, yaw: pivot.yaw, w: 0.5, h: 0.3, d: 0.8 };
    const armBox = { ...leverBox, w: 0.82, d: 0.08 };
    pin(
      'points lever overlaps',
      faces.filter((b) => faceOverlap(b, leverBox) > 0 || faceOverlap(b, armBox) > 0).length,
      0,
    );
    const board = stackDisplays().find((b) => b.stop === 5 + head)!.at;
    const onDeck = (site: { x: number; z: number }) =>
      deckPieces.some((box) => {
        const x = site.x - box.x,
          z = site.z - box.z;
        return (
          Math.abs(x * Math.cos(box.yaw) - z * Math.sin(box.yaw)) < box.w / 2 &&
          Math.abs(x * Math.sin(box.yaw) + z * Math.cos(box.yaw)) <= box.d / 2 + 0.005
        );
      });
    pin(
      'board and east levers on flat deck',
      Number([board, line2World(r - 10, 2.45, { x: 0, z: 0 }), line2World(r - 6, 2.45, { x: 0, z: 0 })].every(onDeck)),
      1,
    );
    const interior = faces.flatMap((a, i) => faces.slice(i + 1).map((b) => faceOverlap(a, b)));
    // Adjacent rectangular chords can meet at a slight angle along the curved track.
    // The largest shared edge is 0.02464 m at head one's 5 m flat panels.
    pin('overlaps beyond chord seams', interior.filter((d) => d > 0.025).length, 0);
    for (const [name, site, half, expected] of [
      ['rack pallet', legRack(RAIL_LEGS[0]!, head), 1.3, 3.7],
      ['rack plate', legRack(RAIL_LEGS[0]!, head), 1.6, 3.4],
      ['frame', legFrame(RAIL_LEGS[0]!, head), 1.3, 13.7],
    ] as const) {
      const foot = line2World(r - STACK_CROSSING.rampTop, 4.8, { x: 0, z: 0 });
      const dir = line2World(r - STACK_CROSSING.rampTop + 1, 4.8, { x: 0, z: 0 });
      const ax = dir.x - foot.x,
        az = dir.z - foot.z;
      const along = ((site.x / 100 - foot.x) * ax + (site.z / 100 - foot.z) * az) / Math.hypot(ax, az) - half;
      pin(name + ' clears ramp', Number(along > 0.5 && Math.abs(along - expected) < 0.35), 1);
    }
    pin('flat deck panels and landings', deckPieces.length, 12);
    pin('end head crossing slabs', Number(!!stackPieces(r, false, -20, colours).slab), 0);
    for (const [side, ramp] of built.ramps.entries()) {
      const angle = ramp.pitch!;
      pin(`${side ? 'west' : 'east'} ramp pitch`, (angle * 180) / Math.PI, pitches[index]![side]!, 0, 15);
      pin('walkable ramp', Number(Math.cos(angle) > WALKABLE_NY), 1);
      const top = ramp.y + (ramp.h / 2) * Math.cos(angle);
      pin('foot height', top - (ramp.d / 2) * Math.sin(angle) - line2Y(r), 0.29);
      pin('top height', top + (ramp.d / 2) * Math.sin(angle) - line2Y(r), 0.9);
    }
    pin('flat deck length', STACK_WEST.len, 23);
    pin('sea slips', built.boxes.filter((b) => (b.pitch ?? 0) < 0 && Math.cos(b.pitch!) > WALKABLE_NY).length, 2);
    const slips = built.boxes.filter((b) => (b.pitch ?? 0) < 0);
    const landings = built.boxes.filter((b) => b.w === 2 && b.pitch === 0);
    const slipPitches = [
      [28.5683, 28.0688],
      [28.266, 28.5306],
      [28.3967, 28.3263],
    ];
    for (const [side, slip] of slips.entries()) {
      const landing = landings[side]!;
      pin('sea landing beside flat deck', landing.y + landing.h / 2 - line2Y(r), STACK_WEST.up);
      pin('sea slip pitch', (-slip.pitch! * 180) / Math.PI, slipPitches[index]![side]!);
      const waterEnd = slip.y + (slip.h / 2) * Math.cos(slip.pitch!) + (slip.d / 2) * Math.sin(slip.pitch!);
      pin('sea slip toe', waterEnd, -1.3);
    }
    pin('lever past ramp top', STACK_WEST.len - STACK_WEST_LEVER.back, 1, 0.5);
    pin('lever inside deck', STACK_WEST.lat + STACK_WEST.w / 2 - STACK_WEST_LEVER.lat, 0.5);
    const platform = h.platforms[1];
    const center = line2World(r - 12.5, STACK_WEST.lat, { x: 0, z: 0 });
    const lever = line2World(r - STACK_WEST_LEVER.back, STACK_WEST_LEVER.lat, { x: 0, z: 0 });
    const offset = Math.hypot(center.x - platform.x / 100, center.z - platform.z / 100);
    const reach = Math.hypot(lever.x - platform.x / 100, lever.z - platform.z / 100);
    pin('catalog west point offset', offset, [0.125, 0.005, 0.044][index]!, 0, 0.25);
    pin('catalog height', platform.y / 100 - line2Y(r), STACK_WEST.up);
    pin('whole prompt inside reach', Number(reach + 1.8 <= platform.reach / 100), 1);
    for (let laid = 0; laid <= 4; laid++)
      pin(`west at lay ${laid}`, Number(westStands(head, laid)), Number(laid === head + 1 || (head === 3 && laid > 3)));
  }
  return { level: 'stack halts', rows, failures: rows.filter((row) => !row.ok).length };
}
