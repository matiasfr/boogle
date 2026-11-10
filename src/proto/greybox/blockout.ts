// ?blockout=world, in any build: the whole map's walkable massing in the live game (docs/plans/world-blockout.md). The
// greybox's islands, landmarks, harbour and halt platforms as local static colliders for your own body, and every future
// line as visual track with a walkable deck. Nothing else: no review panel, labels, rides or fog change, no ops, state,
// saves or sim. Other players without the flag see none of it. The live trains are server-owned, so riding a future line
// stays in the dev greybox (`?greybox=sickle`). It replaces the default horizon silhouette (src/entities/sickle-backdrop/).
import { defineKind, spawn } from '../../entity/entity.ts';
import { background } from '../../async.ts';
import { precompile } from '../../render/precompile.ts';
import { MAP } from './page.ts';
import { layout } from './map-data.ts';
import { createGround } from './ground.ts';
import { buildGreybox, refreshMaterials } from './build.ts';

const map = layout(MAP, 'sickle', new URLSearchParams(location.search).get('pick') === 'B' ? 'B' : 'A');
const box = buildGreybox(map, createGround(map), { review: false });
box.markers.visible = false;
// Shown once its pipelines are built, as the game does for its lazy parts (see ./index.ts).
box.root.visible = false;
background(
  precompile(box.root).then(() => {
    box.root.visible = true;
  }),
  'world blockout pipelines',
);

defineKind('world-blockout', { lateUpdate: 1002 });
let clock = 0,
  shown = 0;
spawn({
  kind: 'world-blockout',
  lateUpdate({ dt }) {
    clock += dt;
    if (box.root.visible && ++shown === 30) refreshMaterials(box.root);
    box.animate(dt, clock);
  },
});
const api = { root: box.root, refresh: () => refreshMaterials(box.root), lines: box.lines.map((l) => l.id) };
(window as unknown as { __blockout: typeof api }).__blockout = api;
console.log('BLOCKOUT', JSON.stringify({ lines: api.lines.length, meshes: box.root.children.length }));
