import level from '../../../content/built/levels/quay.json' with { type: 'json' };
import { coastalArea } from './massing-saltpan.ts';
export const quayArea = coastalArea('quay', level);
