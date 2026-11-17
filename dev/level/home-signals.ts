// Held Home trains: actual car poses, plus the shared conservative reservation. R2b review finding 5.
import { coachTrain } from './rider-coach.ts';
import { obstacles } from './rail-network.ts';
import { consistOf } from '../../src/entities/railway/cars.ts';
import {
  CAR_BUFFERS,
  ENGINE_BUFFERS,
  trainPlaces,
  deckAt,
  deckGap,
  type Deck,
} from '../../src/entities/railway/car-spacing.ts';
import { LINKS, ORIGIN, FORMATION, offsetLat, lineSmoothAt, CART, pathLamps } from '../../src/place/layout.ts';
import { legPoints, CROSSING, ROAD2_S } from '../../src/place/home-station.ts';
import { frameBesideLine, stationColliders } from '../../src/place/spatial-station.ts';
import { RAIL_LINES, TRAIN_EXTENT } from '../../src/sim/railway-lines.ts';
const box = (x: number, z: number, yaw: number, hx: number, hz: number): Deck => ({
  x,
  z,
  yaw,
  hx,
  back: hz,
  front: hz,
});
export function checkHomeSignals(signalShift = 0) {
  const rows: { name: string; value: number; minimum: number; pin: number; source: string }[] = [];
  const problems: string[] = [];
  const row = (name: string, value: number, minimum: number, pin: number, source: string) => {
    if (!Number.isFinite(value) || !Number.isFinite(pin)) throw new Error(`${name}: missing finite measurement/pin`);
    rows.push({ name, value, minimum, pin, source });
    if (value < minimum - 1e-9) problems.push(`${name}: ${value} m < minimum ${minimum} m (${source})`);
    if (Math.abs(value - pin) > 0.01) problems.push(`${name}: ${value} m; pin ${pin} ±0.01 m`);
  };
  for (const line of [0, 1] as const) {
    const data = LINKS[line]!,
      signal = RAIL_LINES[line]!.halts[0]!.end!.signalCm / 100 + signalShift;
    const name = `Home line ${line + 1} held at ${signal.toFixed(2)}`;
    const tail = signal - TRAIN_EXTENT.behindCm / 100;
    const c = consistOf({ line, wagon: line === 1, steel: line === 1 });
    const at = (s: number, o: { x: number; z: number }) => {
      const p = lineSmoothAt(data.line, s, { x: 0, z: 0, ux: 0, uz: 1 });
      const l = offsetLat(FORMATION[data.id], s, true) ?? 0;
      o.x = p.x - p.uz * l;
      o.z = p.z + p.ux * l;
    };
    const vehicles = c.map((v) => ({
      d: v.offset,
      hx: v.spec.hx,
      back: v.spec.hz,
      front: v.spec.hz,
      buffers: v.role === 'engine' ? ENGINE_BUFFERS : CAR_BUFFERS,
    }));
    const positions = trainPlaces(at, signal, vehicles, [], true);
    const decks =
      line === 1 ? coachTrain(signal, true) : vehicles.map((v, i) => deckAt(at, positions[i]!, v, {} as Deck));
    const gap = (b: Deck) => Math.min(...decks.map((d) => deckGap(d, b)));
    // The network audit's no-overlap rule applies to the whole reservation, not just the drawn rear car.
    const pins = line === 0 ? [61.53, 0, 0] : [56.6, 45.5, 26, 0];
    for (const [k, o] of obstacles(line ? 'line2' : 'line1')
      .filter((o) => o.s0 < 100)
      .entries())
      row(
        `${name}: reserved tail / ${o.what}`,
        tail - o.s1,
        0,
        pins[k]!,
        'rail-network.ts no overlap; railway-install.test.ts held end-block tail',
      );
    if (line === 1)
      row(
        `${name}: reserved tail / Home crossing`,
        tail - (CROSSING.s + CROSSING.len / 2),
        1,
        50.4,
        'home-station.test.ts crossing behind train tail >1 m',
      );
    // Colliders remain after completion. Include feeder and rail rack, not only the frame posts.
    const frames =
      line === 0
        ? [93.622721, 73.204917, 37.624265]
        : [40.378443, 13.257593, 39.636117, 93.501693, 177.430852, 415.635251];
    for (const [k, station] of data.stations.entries()) {
      const f = frameBesideLine(station, data.line, data.dir),
        colliders = stationColliders(f, 0, line === 1);
      const value = Math.min(
        ...[...colliders.frame, colliders.feeder, ...(colliders.rails ? [colliders.rails] : [])].map((p) =>
          gap(box(p.position.x - ORIGIN.x, p.position.z, p.yaw, p.shape.hx, p.shape.hz)),
        ),
      );
      row(
        `${name}: whole train / ${station.id} frame and racks`,
        value,
        0.25,
        frames[k]!,
        'home-cart.ts R1b static furniture clearance',
      );
    }
    const leg = legPoints();
    let clear = Infinity;
    for (let k = 1; k < leg.length; k++) {
      const a = leg[k - 1]!,
        b = leg[k]!;
      clear = Math.min(
        clear,
        gap(
          box(
            (a.x + b.x) / 2,
            (a.z + b.z) / 2,
            Math.atan2(b.x - a.x, b.z - a.z),
            CART.hx,
            Math.hypot(b.x - a.x, b.z - a.z) / 2 + CART.hz,
          ),
        ),
      );
    }
    row(
      `${name}: whole train / swept cart leg`,
      clear,
      0.25,
      line === 0 ? 11.617058 : 21.394727,
      'home-cart.ts static clearance (stronger than R1a cart/train phase exclusion)',
    );
    if (line === 0) {
      let lamps = Infinity;
      for (const lamp of pathLamps((s) => offsetLat(FORMATION.timber, s) ?? 0)) {
        const p = lineSmoothAt(data.line, lamp.s, { x: 0, z: 0, ux: 0, uz: 1 });
        // Enclose both the .12 m post and .26 m lamp head, ignoring their vertical separation.
        lamps = Math.min(lamps, gap(box(p.x - p.uz * lamp.l, p.z + p.ux * lamp.l, 0, 0.13, 0.13)));
      }
      row(
        `${name}: whole train / ridge lamps`,
        lamps,
        0.25,
        0.455655,
        'home-cart.ts static furniture clearance; path.ts .26 m lamp envelope',
      );
      // Project every body corner onto the main curve. track.ts widens the 3.6 m trestle by the up-track offset.
      let edge = Infinity;
      for (const d of decks)
        for (const x of [-d.hx, d.hx])
          for (const z of [-d.back, d.front]) {
            const px = d.x + x * Math.cos(d.yaw) + z * Math.sin(d.yaw),
              pz = d.z - x * Math.sin(d.yaw) + z * Math.cos(d.yaw);
            let nearest = Infinity,
              margin = Infinity;
            for (let s = signal - 20; s < signal + 12; s += 0.01) {
              const p = lineSmoothAt(data.line, s, { x: 0, z: 0, ux: 0, uz: 1 }),
                dist = Math.hypot(px - p.x, pz - p.z);
              if (dist >= nearest) continue;
              nearest = dist;
              const lat = -(px - p.x) * p.uz + (pz - p.z) * p.ux;
              margin = Math.min(1.8 - lat, lat - ((offsetLat(FORMATION.timber, s) ?? 0) - 1.8));
            }
            edge = Math.min(edge, margin);
          }
      row(
        `${name}: whole train / ridge trestle outer edge`,
        edge,
        0,
        0.703967,
        'track.ts DECK_W=3.6; rider-coach audit bridge containment (no overhang)',
      );
    }
  }
  return {
    name: 'Home held signals',
    failures: problems.length,
    problems,
    rows,
    notes: [
      'Signal marks are 72.10 / 70.10 m; 80.30 / 78.30 m are reserved nose limits. The whole reservation starts at 56 / 54 m, exactly beyond each turnout and line 1 cart leg.',
      'Line 1 has its full three-car consist on the ridge bridge approach/trestle; line 2 has the six-car long-boiler train on its bank/rising approach. Neither held train spans the Home foot crossing or spur points.',
      `Line 2 Home service mark ${ROAD2_S} m is distinct from its held signal. Cart and running trains are phase-exclusive (R1a).`,
    ],
  };
}
