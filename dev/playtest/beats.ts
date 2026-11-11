// What the reader knows about a card beyond the events: the beats worth asking "did they ever?" about, the places worth
// naming, and a sketch of its map. Only `place` so far. The prototype's layout may change under this: anything missing
// just means fewer names, and a prototype can name places itself with `playWhere` (src/proto/mark.ts).

/** Beat label -> the mark names that count as it. */
const BEATS: Record<string, [string, RegExp][]> = {
  place: [
    ['woke the machine', /^(woke|wake)$/],
    ['chopped', /^chops?$/],
    ['delivered', /deposit|^links$/],
    ['laid a stretch', /^(laid |stretches|stretch laid)/],
    ['opened a path', /^(open |path opened)/],
    ['earned a rung', /rung/],
    ['unlocked trains', /train unlocked/],
    ['called a train', /train called/],
    ['missed a train', /missed train/],
    ['opened a crate', /crate|^gifts?$/],
    ['found a crystal', /crystal|^finds$/],
    ['lit the forge', /forge/],
    ['rode the train', /^(ride|rides|train boarded|ride start)$/],
    ['gained an ability', /ability/],
    ['used the second jump', /^double jumped$/],
    ['pulled on a hook ring', /^hook pulled$/],
    ['opened the glider', /^glide opened$/],
    ['passed a gate', /gate/],
    ['found a secret', /secret/],
    ['entered a building', /building/],
    ['talked to a resident', /resident/],
    ['visited shop or museum', /shop|museum/],
    ['heard a rumour', /rumour/],
    ['a resident noticed', /resident noticed/],
    ['tried something on', /shop tried on/],
    ['took something from the shop', /shop kept/],
    ['swapped on the rail', /shop swapped/],
    ['did something together', /co-?op/],
  ],
};
const RAILWAY_BEATS: [string, RegExp][] = [
  ['woke the machine', /^woke$/],
  ['chopped', /^chop$/],
  ['delivered', /^deposit$/],
  ...['T1', 'T2', 'T3', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'].flatMap((id): [string, RegExp][] => [
    [`funded ${id}`, new RegExp(`^stretch funded ${id}$`)],
    [`laid ${id}`, new RegExp(`^stretch laid ${id}$`)],
  ]),
  ['lit the forge', /^forge lit$/],
  ['gained the proper axe', /^proper axe gained$/],
  ['gained the hook shot', /^hook shot gained$/],
  ['gained the glider', /^glider gained$/],
  ['gained the second jump', /^second jump gained$/],
  ['pulled on a hook ring', /^hook pulled$/],
  ['reached Needle Bell summit', /^needle bell summit reached$/],
  ['pulled the quarry lever', /^quarry lever pulled$/],
  ['gained the pack', /^pack gained$/],
  ['called the cart', /^cart called$/],
  ['rode the cart', /^cart ride$/],
  ['picked up at the depot', /^depot pick up$/],
  ['pulled the sea switch', /^sea switch pulled$/],
  ['pressed the sea switch before Q4', /^sea switch refused$/],
  ['reached Far Head', /^Far Head reached$/],
  ['took the boiler', /^boiler taken$/],
  ['fitted the boiler', /^boiler fitted$/],
  ['unlocked trains', /^trains unlocked$/],
  ['called a train', /^train called$/],
  ['rode a train', /^train ride$/],
  ['reached the pier', /^pier reached$/],
  // Split-rock Works and the Roundhouse (dev/loop/graph.ts nodes; test/loop-graph.test.ts keeps these in step).
  ['took the breaker', /^breaker taken$/],
  ['struck a seam', /^seam struck$/],
  ['filled the kiln', /^kiln filled$/],
  ['set a footing', /^footing set$/],
  ['footed the crossing', /^crossing footed$/],
  ['braced the leaf', /^leaf braced$/],
  ['footed the gap', /^gap footed$/],
  ['joined Ring Island', /^ring joined$/],
  ['saw the crossing finale', /^crossing finale$/],
  ['saw a shared moment', /^moment played$/],
  ['fitted the cradle', /^cradle rails$/],
  ['turned the table', /^table turned$/],
  ['tried something on', /^shop tried on$/],
  ['took something from the shop', /^shop kept$/],
  ['swapped on the rail', /^shop swapped$/],
  // The town (place-retirement T2): src/entities/town/residents.ts's marks, as in Place.
  ['entered a building', /^entered building/],
  ['visited shop or museum', /^entered building (shop|museum)$/],
  ['talked to a resident', /^talked to resident$/],
  ['heard a rumour', /rumour/],
  ['a resident noticed', /^resident noticed$/],
  ['opened a crate', /^crate opened$/],
  ['found a crystal', /^crystal found$/],
  ['found a secret', /^secret found$/],
  ['a secret went to the hub', /^secret at the hub$/],
];
export const beatsOf = (card: string, railway = false) => (railway ? RAILWAY_BEATS : (BEATS[card] ?? []));

export type Place = { name: string; x: number; z: number; r: number };
export type Sketch = { lines: [number, number][][]; rails: [number, number][][]; places: Place[] };

/** The card's named places and a sketch of its map, world coordinates; null when there's nothing to draw it from. */
export async function sketchOf(card: string): Promise<Sketch | null> {
  if (card !== 'place') return null;
  try {
    const L = await import('../../src/place/layout.ts');
    const ox = L.ORIGIN.x;
    const oz = L.ORIGIN.z;
    const lines = L.PATHS.map((p) => p.pts.map(([x, z]) => [x + ox, z + oz] as [number, number]));
    const rails = Object.values(L.LINES).map((l) => {
      const pts: [number, number][] = [];
      for (let i = 0; i < l.xs.length; i += 4) pts.push([l.xs[i]! + ox, l.zs[i]! + oz]);
      return pts;
    });
    const end = (p: { pts: number[][] } | undefined) => {
      const e = p?.pts.at(-1);
      return e ? { x: e[0]! + ox, z: e[1]! + oz } : null;
    };
    const named = (name: string, at: { x: number; z: number } | null, r: number): Place[] =>
      at ? [{ name, x: at.x, z: at.z, r }] : [];
    const places: Place[] = [
      ...named('the village', { x: L.VILLAGE.x + ox, z: L.VILLAGE.z + oz }, L.VILLAGE.r),
      ...named('the timber camp', end(L.PATHS[0]), 45),
      ...named('the quarry', end(L.PATHS[1]), 45),
      ...named('Far Head', { x: L.HEAD.x + ox, z: L.HEAD.z + oz }, L.HEAD.r),
      ...named('the spire', { x: L.SPIRE.x + ox, z: L.SPIRE.z + oz }, 30),
    ];
    return { lines, rails, places };
  } catch (e) {
    console.error(`(no map sketch: ${e instanceof Error ? e.message : String(e)})`);
    return null;
  }
}

/** The nearest named place you're inside, else 'out and about'. */
export function placeAt(places: Place[], x: number, z: number) {
  let best = 'out and about';
  let d = Infinity;
  for (const p of places) {
    const q = Math.hypot(p.x - x, p.z - z);
    if (q < p.r && q < d) {
      d = q;
      best = p.name;
    }
  }
  return best;
}
