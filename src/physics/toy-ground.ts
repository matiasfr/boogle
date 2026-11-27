import { BALL_SPAWN, HALF } from '../constants.ts';
import { groundHeight } from '../island/heights.ts';

type ToyGround = {
  under: typeof groundHeight;
  /** Classic caves supply their own floor below the body. */
  floorBelow?(x: number, y: number, z: number): number;
  inside(x: number, z: number): boolean;
  spawn: typeof BALL_SPAWN;
  sproutable(x: number, z: number): boolean;
};
export let toyGround: ToyGround = {
  under: groundHeight,
  inside: (x: number, z: number) => Math.abs(x) <= HALF - 3 && Math.abs(z) <= HALF - 3,
  spawn: BALL_SPAWN,
  sproutable: () => true,
};
let placeBall: (() => void) | undefined;
export function bindToySpawn(place: () => void) {
  placeBall = place;
  place();
}
export function setToyGround(next: ToyGround) {
  toyGround = next;
  placeBall?.();
}
