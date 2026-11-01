// `?layout=<name>` (src/island/layout.ts): a tag naming the layout you're walking, and the lockstep land pinned to the
// server's (src/world/home-land.json). A moved POI can shift the home palms or the frisbee's deck; the rules must still
// see the cells the server sees, so the hashes match. Its onStart runs after gifts.ts and log-sources.ts fill the land
// (features load in file order). Without the flag this does nothing.
// Serves DESIGN.md 7 (telegraph everything: walk a layout to judge what you see from where).
import { land } from '../world/game-world.ts'; // first: the lockstep rules register before anything else
import { onStart } from '../loop.ts';
import { layout } from '../island/layout.ts';
import './walk-layout.css';

// The server's land, in its own chunk: only a layout walk needs it.
const home = layout ? (await import('../world/home-land.json')).default : null;

if (layout && home) {
  onStart(() => {
    const { trees, perches } = land.layout;
    const moved = trees.filter((c, k) => c.i !== home.layout.trees[k]?.i || c.j !== home.layout.trees[k]?.j).length;
    if (moved || trees.length !== home.layout.trees.length)
      console.info(`?layout: ${moved} palm cells differ from home-land.json; the rules use home-land.json's`);
    trees.splice(0, trees.length, ...home.layout.trees);
    perches.splice(0, perches.length, ...home.layout.perches);
  });
  const tag = document.createElement('div');
  tag.className = 'walk-layout';
  tag.textContent = `Layout: ${layout.name}`;
  document.body.append(tag);
}
