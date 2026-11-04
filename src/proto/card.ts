// Resolve the running card before historical aliases: the retired ride card also links to ?proto=wagon.
// Keep the protos page's store intact; spawn, counters and both trace readers share this Local selection.
import { PROTOS } from '../../protos/protos.ts';
import { cardFor } from '../../protos/store.ts';
import { PROTO, pageQuery } from './flags.ts';

export const currentCard = PROTOS.find((card) => card.id === PROTO) ?? cardFor(pageQuery().toString());
