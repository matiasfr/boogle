// Resolve the running card before historical aliases: the retired ride card also links to ?proto=wagon.
// Spawn, counters and both trace readers share this Local selection.
import { PROTOS } from '../../protos/protos.ts';
import { urlParam } from '../../protos/store.ts';
import { CARD } from './flags.ts';

export const currentCard =
  PROTOS.find((card) => card.id === CARD) ??
  (CARD ? PROTOS.find((card) => urlParam(card, 'proto') === CARD) : undefined);
