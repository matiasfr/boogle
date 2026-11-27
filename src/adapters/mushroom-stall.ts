// The mushroom stall, where you take a bag of seeds (the bags sprout src/adapters/mushrooms.ts's mushrooms). A record
// (content/prefabs/mushrooms.ts), standing where content/levels/mushrooms.ts puts it. Local scenery: no state, no sync.
// Its own module, apart from the mushrooms: the input code imports those, and the prefab door leads back to it.
import { REACH } from '../constants.ts';
import { groundHeight } from '../island/terrain.ts';
import { defineKind, spawn } from '../entity/entity.ts';
import { obstacles } from '../entities/props/state.ts';
import { me } from '../player/state.ts';
import { take, heldId } from '../player/inventory.ts';
import type { Interactable } from '../player/hands.ts';
import { NO_TARGETS } from '../sim/interact-pick.ts';
import { createOwnedView, type OwnedView } from '../render/owned-view.ts';
import { instantiate } from '../prefab/instantiate.ts';
import type { Placement } from '../prefab/types.ts';
import { definitions } from '../prefab/catalogue.ts';
import { loadLevelArtifact } from '../prefab/validate.ts';
import level from '../../content/built/levels/mushrooms.json' with { type: 'json' };

let stall: ReturnType<typeof instantiate> | null = null;

// What interacting at the stand can do (see interactTarget in src/player/hands.ts): take a bag, unless you carry one.
function takeSeeds(instance: ReturnType<typeof instantiate>): Interactable[] {
  const w = instance.attach('pickup').at;
  if (!me.entered || !me.body || heldId() === 'seeds') return NO_TARGETS;
  const p = me.body.interpolatedPosition;
  const dx = w.x - p.x,
    dz = w.z - p.z;
  if (dx * dx + dz * dz >= (REACH + 0.6) * (REACH + 0.6)) return NO_TARGETS;
  return [{ id: 'stall-seeds', verb: 'Take', at: w.clone().setY(w.y + 0.35), run: () => take('seeds') }];
}

export function placeSeedStall(owner: OwnedView, placed: Placement) {
  const instance = instantiate('mushrooms.stall', placed, {
    owner,
    handlers: { 'mushrooms.take-seeds': (): Interactable[] => takeSeeds(instance) },
  });
  return instance;
}

defineKind('mushroom-stall', {}); // no methods: it just stands there
export function createStall() {
  const placed = loadLevelArtifact(level, definitions).placements.find((p) => p.prefab === 'mushrooms.stall');
  if (!placed) throw new Error('mushrooms: no stall placed');
  const [x, lift, z] = placed.pos;
  const owner = createOwnedView();
  stall = placeSeedStall(owner, { ...placed, pos: [x, groundHeight(x, z) + lift, z] });
  stall.setEnabled(true);
  spawn({ kind: 'mushroom-stall', mesh: owner.root, dispose: owner.dispose });
  obstacles.push({ x, z, r: definitions[placed.prefab]!.footprint! });
}

export const stallTargets = () => stall?.targets() ?? NO_TARGETS;
