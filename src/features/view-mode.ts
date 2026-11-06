// Diagnostic code is absent from ordinary visits, including the frame and draw paths.
import { tuningVisit } from '../dev-preferences.ts';
import { background } from '../async.ts';

if (tuningVisit) background(import('../debug/view-mode.ts'), 'view mode');
