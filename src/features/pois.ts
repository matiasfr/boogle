// Points of interest: loads every src/pois/<name>/index.js. Each one builds its own meshes, colliders and lights and
// registers its own onStart/onFrame hooks (like a feature). Their ground is shaped earlier, by site.js, when the
// terrain is built (src/island/). See src/island/README.md to add or remove one.
//
// The caves are far from spawn and build themselves over a few frames anyway, so they load after start, in their own
// chunk (faster first load; src/loop.ts, "Lazy parts"). Their site.js (the ground) stays eager, in src/island/.
import { onStart } from '../loop.ts';

import.meta.glob(['../pois/*/index.{js,ts}', '!../pois/{caves,era}/index.{js,ts}'], { eager: true }); // era: ?proto=era only (era-swap.ts)
onStart(() => import('../pois/caves/index.ts'));
