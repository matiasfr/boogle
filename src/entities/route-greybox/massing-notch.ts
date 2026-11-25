import notch from '../../../content/built/levels/notch.json' with { type: 'json' };
import original from '../../../content/built/levels/original.json' with { type: 'json' };
import { coastalArea } from './massing-saltpan.ts';

export const notchAreas = [coastalArea('notch', notch), coastalArea('original', original)];
