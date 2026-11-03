// Local sky/light study; see docs/research/procedural-sky.md. The base island keeps its existing look.
import { protoOn } from '../proto/flags.ts';

if (protoOn('sky')) void import('../proto/sky/index.ts');
