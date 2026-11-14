// The house: Pip's home office. A bed, a very senior chair, a stove and a desk where a little guy gravely stamps a leaf the size
// of a tray, next to an ordinary mug. Serves DESIGN.md 11: the joke reads with the sound off. It has no task and gives nothing.
// What's happened to the town turns up on Pip's desk: a model of your bridge, a rail for a paperweight, a toy train. Local.
import { createOwnedView, type OwnedView } from '../../render/owned-view.ts';
import { plate, roomMesh, type Room } from './rooms.ts';
import { BOARDS, type Fact } from './town-lines.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact, loadPrefabArtifact } from '../../prefab/validate.ts';
import artifact from '../../../content/built/prefabs.json' with { type: 'json' };
import level from '../../../content/built/levels/house.json' with { type: 'json' };
const definitions = loadPrefabArtifact(artifact).prefabs;
const placements = loadLevelArtifact(level, definitions).placements;
const FACTS: Fact[] = ['path', 'forge', 'trains', 'town'];

/** Pip's house in `rooms`' house, owned by `owner`; its desk follows `env.has`. */
export function createHouse(owner: OwnedView, r: Room, env: { has(f: Fact): boolean }) {
  if (r.w !== 7.4 || r.d !== 7.4) throw new Error('house: room dimensions differ from authored records');
  const fixtureOwner = createOwnedView();
  r.near.add(fixtureOwner.root);
  owner.cleanup(fixtureOwner.dispose);
  const pieces = new Map(
    placements.map((p) => {
      const instance = instantiate(p.prefab, p, {
        owner: fixtureOwner,
        makeLabel(a, key) {
          if (key !== 'pipDesk' && key !== 'pip') throw new Error('house: unknown label reference');
          return plate(BOARDS[key], a.w, a.h, a.at[0], a.at[1], a.at[2]);
        },
      });
      r.furnishings.push(instance);
      return [p.id.slice('house-'.length), instance] as const;
    }),
  );
  const get = (id: string) => {
    const p = pieces.get(id);
    if (!p) throw new Error(`house: missing piece ${id}`);
    return p;
  };
  const parts = (...ids: string[]) => ids.flatMap((id) => get(id).parts);
  const room = parts(
    'floor',
    'rug',
    'bed',
    'desk',
    'step',
    'leaf',
    'filed',
    'mug',
    'cabinet',
    'chair',
    'stove',
    'plant',
    'board',
    'quilt',
    'drawers',
    'lamp',
    'chair-trim',
    'stove-trim',
    'cabinet-pulls',
  );
  const LATER = ['later-bridge', 'later-rail', 'later-train', 'later-mug'].map((id) => get(id).parts);
  let stage = -1;
  const inside = roomMesh(room);
  r.near.add(inside, get('board').root);
  owner.cleanup(() => inside.geometry.dispose());
  function update() {
    let n = 0;
    for (const f of FACTS) if (env.has(f)) n++;
    if (n === stage) return;
    stage = n;
    inside.geometry.dispose();
    inside.geometry = roomMesh([...room, ...LATER.slice(0, n).flat()]).geometry;
  }
  r.outside.add(roomMesh(parts('mat', 'postbox', 'window-box')));
  r.over.add(get('sign').root);
  return { update, stage: () => stage };
}
