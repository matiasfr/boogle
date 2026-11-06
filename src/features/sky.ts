// The sky: the summer sky at one fixed time of day everywhere in the world (src/render/water/frozen-sky.ts; owner
// calls, 3–6 November). There is no day/night cycle. The entity keeps the placeholder dome in the scene and refreshes
// the frozen day's fog and sun state each frame, after the world tick (order -10), before the other per-frame features.
import { defineKind, spawn } from '../entity/entity.ts';
import { sky } from '../render/scene.ts';
import { updateFrozenDay } from '../render/water/frozen-sky.ts';

defineKind('sky', { update: -5 });
spawn({ kind: 'sky', mesh: sky, update: updateFrozenDay });
