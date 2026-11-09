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
  /** How many bits the museum's 1:120 table drew last (0 until the museum stands and you're near it). */
  museumBits: number;
  /** What this player owns and wears (src/entities/wardrobe/state.ts), for Fine Prices' evals. */
  wardrobe: ReturnType<typeof import('../wardrobe/state.ts').inspectWardrobe>;
  /** Where each resident stands, and whether they're drawn and can be talked to (only near their standing room). */
  residents: Record<'pip' | 'button' | 'nell' | 'moss' | 'wren', { on: boolean; x: number; z: number }>;
  /** The bubble that's up, if any: who (a folk index) and what. */
  bark: { k: number; text: string } | null;
  /** What the residents have told this player (Personal Local; ./memory.ts). */
  memory: {
    met: Partial<Record<string, boolean>>;
    noticed: Partial<Record<string, TownFact>>;
    said: Partial<Record<string, number>>;
    rumour: Partial<Record<string, number>>;
    hello: Partial<Record<string, boolean>>;
    street: TownFact | null;
    streetRumour: number;
  };
  /** The curio shelf in the village: where it stands, what's uncovered and how many are still under sheets. */
  shelf: { x: number; y: number; z: number; yaw: number; uncovered: string[]; covered: number } | null;
};
let current: (() => TownInspection) | null = null;
export const inspectTown = () => current?.() ?? null;
/** Lifecycle owner only. */
export function setTownView(view: (() => TownInspection) | null) {
  current = view;
}
