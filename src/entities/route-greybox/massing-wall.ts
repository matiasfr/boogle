import south from '../../../content/built/levels/wall-south.json' with { type: 'json' };
import north from '../../../content/built/levels/wall-north.json' with { type: 'json' };
import { coastalArea } from './massing-saltpan.ts';

export const wallAreas = [coastalArea('wall-south', south), coastalArea('wall-north', north)];
