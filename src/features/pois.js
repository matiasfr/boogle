// Points of interest: loads every src/pois/<name>/index.js. Each one builds its own meshes, colliders and lights and
// registers its own onStart/onFrame hooks (like a feature). Their ground is shaped earlier, by site.js, when the
// terrain is built (src/island/). See src/island/README.md to add or remove one.
import.meta.glob('../pois/*/index.js', { eager: true });
