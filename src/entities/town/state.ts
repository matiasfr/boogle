// Read-only observation of the mounted town (the house, shop and museum you can walk into). Debug and evals read this;
// the town's own state is derived from the shared railway (src/sim/town-facts.ts) and Local presentation.
import type { TownFact } from '../../sim/town-facts.ts';

export type TownRoomInspection = { up: boolean; ready: boolean };
export type TownInspection = {
  facts: TownFact[];
  newest: TownFact | null;
  level: number;
  population: number;
  rooms: { house: TownRoomInspection; shop: TownRoomInspection; museum: TownRoomInspection };
  /** The room whose cutaway is on for this tab, and the one you're over the threshold of. */
  indoors: { room: string | null; inside: string | null };
  /** The house desk's stage: how many of its facts are true. */
  houseStage: number;
};
let current: (() => TownInspection) | null = null;
export const inspectTown = () => current?.() ?? null;
/** Lifecycle owner only. */
export function setTownView(view: (() => TownInspection) | null) {
  current = view;
}
