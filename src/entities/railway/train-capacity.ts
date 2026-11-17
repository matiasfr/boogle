// Shared wheel storage, including shed slots: train-view creates every train's look before it joins the line.
import { LINE2, RAIL_TRAINS } from '../../sim/railway-lines.ts';
import { consistOf } from './cars.ts';
export const WHEELS_PER_CAR = 4;
export const TRAIN_WHEEL_CAPACITY = RAIL_TRAINS.reduce(
  (capacity, { line }) => {
    // Bound every slot by its largest consist, even though the wagon/steel views currently own separate wheels.
    capacity[line === LINE2 ? 'answer' : 'train'] +=
      consistOf({ line, wagon: true, steel: true }).length * WHEELS_PER_CAR;
    return capacity;
  },
  { train: 0, answer: 0 },
);
export function assertWheelCapacity(needed: number, capacity: number) {
  if (needed > capacity) throw new Error(`Train wheel batch overflow: need ${needed}, capacity ${capacity}`);
}
