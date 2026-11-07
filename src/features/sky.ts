// The sky: the summer sky at one fixed time of day everywhere in the world (src/render/water/frozen-sky.ts; owner
// calls, 3–6 November). There is no day/night cycle. The entity keeps the placeholder dome in the scene and refreshes
// the frozen day's fog and sun state each frame, after the world tick (order -10), before the other per-frame features,
// and holds the one outdoor fog range again late, after any route's update, before the sea reads it.
import { defineKind, spawn } from '../entity/entity.ts';
import { sky } from '../render/scene.ts';
import { holdOutdoorFog, updateFrozenDay } from '../render/water/frozen-sky.ts';

defineKind('sky', { update: -5, lateUpdate: -8 });
spawn({ kind: 'sky', mesh: sky, update: updateFrozenDay, lateUpdate: holdOutdoorFog });
