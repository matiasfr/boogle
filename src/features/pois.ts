// Points of interest: loads every src/pois/<name>/index.ts. Each one stands its prefab records (meshes, colliders)
// and lights under its own entity (like a feature). Their ground is shaped earlier, by site.ts, when the
// terrain is built (src/island/). See src/island/README.md to add or remove one.
//
// The caves are far from spawn and build themselves over a few frames anyway, so they load after start, in their own
// chunk (faster first load; src/loop.ts, "Lazy parts"). Their site.ts (the ground) stays eager, in src/island/.
import { onStart } from '../loop.ts';
import { background } from '../async.ts';

import.meta.glob(['../pois/*/index.{js,ts}', '!../pois/caves/index.{js,ts}'], { eager: true });
onStart(() => background(import('../pois/caves/index.ts'), 'caves'));
