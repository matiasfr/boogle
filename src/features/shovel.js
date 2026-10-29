// Phase 3 shovel: dig / pile / aim (logic in src/world/terrain-edits.js).
import './shovel.css';
import { onFrame } from '../loop.js';
import { updateShovel } from '../world/terrain-edits.js';

onFrame(() => updateShovel());
