// Prototype: mini-game toys near the court, behind `?proto=minis` (docs/game-design/minis.md): a topple stack, one hole
// of ball golf, a mushroom hop line. They load only with the flag (src/proto/minis/); without it nothing changes.
import { protoOn } from '../proto/flags.ts';
if (protoOn('minis')) void import('../proto/minis/index.ts');
