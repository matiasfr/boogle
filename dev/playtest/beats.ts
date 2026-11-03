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
    ['passed a gate', /gate/],
    ['found a secret', /secret/],
    ['entered a building', /building/],
    ['talked to a resident', /resident/],
    ['visited shop or museum', /shop|museum/],
    ['did something together', /co-?op/],
  ],
};
export const beatsOf = (card: string) => BEATS[card] ?? [];

export type Place = { name: string; x: number; z: number; r: number };
export type Sketch = { lines: [number, number][][]; rails: [number, number][][]; places: Place[] };

/** The card's named places and a sketch of its map, world coordinates; null when there's nothing to draw it from. */
export async function sketchOf(card: string): Promise<Sketch | null> {
  if (card !== 'place') return null;
  try {
    const L = await import('../../src/proto/place/layout.ts');
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
