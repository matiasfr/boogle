// Local comparison only: no atmosphere chunk or changed defaults without this flag.
import { newWaterEnabled } from '../render/water/flags.ts';
if (!newWaterEnabled && new URLSearchParams(location.search).get('sky') === 'demo') void import('../proto/demo-sky.ts');
