// The Round's blockout (docs/plans/home-flip.md, B3): plain grey blocks at the true size and place of the eight bought
// plots, a pale door panel and a dark mat on each door side, and the footing at G with The Boogler's unfinished
// statue on it: a sheeted shape in a scaffold (owner, 15 November) until he has been met, then his stone statue
// (owner, 14 November; the switch is `BOOGLER_STATUE_UNVEILED` in content/levels/town-blockout.ts). Local and static: the blocks read no fact. Where each stands is src/place/town-blockout.ts; a block leaves when its real building is mounted.
import type { OwnedView } from '../../render/owned-view.ts';
import { createPrefabBatch, instantiate } from '../../prefab/instantiate.ts';
import { loadLevelArtifact } from '../../prefab/validate.ts';
import { definitions } from '../../prefab/catalogue.ts';
import level from '../../../content/built/levels/town-blockout.json' with { type: 'json' };
import { H } from '../../place/terrain.ts';
import { addFoot } from '../../place/sites.ts';
import { blockoutFeet, standBlockout } from '../../place/town-blockout.ts';

/** The builders' notice on the scaffold. DRAFT for the owner: the builders' words, not The Boogler's. */
export const STATUE_WORKS_COPY = {
  statueWorks: ['STATUE NOT FINISHED', 'Ordered by The Boogler. Out of stone.'],
};

/** Draw every block and mark in one batch and the statue; the blocks, the footing and the statue are solid and walked
 * round, the marks are not. */
export function createTownBlockout(owner: OwnedView) {
  const placements = standBlockout(loadLevelArtifact(level, definitions).placements, H);
  // The boxes share one draw; the statue is its own mesh (it casts and receives through its builder).
  const boxed = (p: { id: string }) => p.id !== 'town.statue';
  const batch = createPrefabBatch('greybox.box', placements.filter(boxed).length, owner);
  let solids = 0,
    index = 0;
  placements.forEach((p) => {
    const instance = instantiate(
      p.prefab,
      p,
      boxed(p) ? { owner, batch: { target: batch, index: index++ } } : { owner, texts: STATUE_WORKS_COPY },
    );
    instance.setEnabled(true);
    solids += instance.bodies.length;
  });
  // The little guys steer round footprints, not colliders: one for each block and the footing, gone with the owner.
  for (const f of blockoutFeet(placements)) addFoot(f.x, f.z, f.yaw, f.hw, f.hd, owner);
  // This batch is the blockout's own draw, so casting costs one more draw in each shadow pass and none in the main one.
  batch.mesh.castShadow = true;
  batch.mesh.computeBoundingBox();
  batch.mesh.computeBoundingSphere();
  return { boxes: placements.length, solids };
}
