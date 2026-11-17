import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sourceModule } from '../dev/level/source.ts';
import { consistOf, consistBounds } from '../src/entities/railway/cars.ts';

type Car = { role: string };
type Train = { line: number; carOn: boolean; steel: Car; carByRole(role: string): Car };
function fixture() {
  const base = Object.fromEntries(['engine', 'player', 'rider', 'kit'].map((role) => [role, { role }]));
  const wagonCar = { role: 'wagon' },
    steelCar = { role: 'steel' };
  const tr: Train = { line: 1, carOn: false, steel: steelCar, carByRole: (role) => base[role]! };
  let coupled = false,
    builds = 0;
  const source = readFileSync('src/entities/railway/train-view.ts', 'utf8');
  const start = source.indexOf('  const roleCar ='),
    end = source.indexOf('  /** The lateral', start);
  assert.ok(start >= 0 && end > start);
  const api = sourceModule<{ carsOf(tr: Train): readonly Car[]; grown(tr: Train): readonly Car[] }>(
    source.slice(start, end),
    {
      consistBounds,
      trains: [tr],
      wagonCar,
      wagonTrain: () => (coupled ? tr : null),
      consistOf: (options: Parameters<typeof consistOf>[0]) => {
        builds++;
        return consistOf(options);
      },
    },
    ['carsOf', 'grown'],
  );
  builds = 0;
  return {
    api,
    tr,
    builds: () => builds,
    reset: () => {
      builds = 0;
    },
    couple: (value = true) => {
      coupled = value;
    },
  };
}
test('real carsOf: 60 unchanged frames rebuild no descriptors and reuse the car collection', () => {
  const f = fixture(),
    initial = f.api.carsOf(f.tr);
  f.reset();
  for (let frame = 0; frame < 60; frame++) {
    assert.deepEqual(
      f.api.carsOf(f.tr).map((car) => car.role),
      ['engine', 'player', 'rider', 'kit'],
    );
  }
  assert.equal(f.builds(), 0);
  assert.equal(f.api.carsOf(f.tr), initial);
});
test('real carsOf selects cached collections when the wagon couples and steel arrives', () => {
  const f = fixture(),
    base = f.api.carsOf(f.tr);
  f.couple();
  const wagon = f.api.carsOf(f.tr);
  assert.deepEqual(
    wagon.map((car) => car.role),
    ['engine', 'player', 'rider', 'kit', 'wagon'],
  );
  assert.notEqual(wagon, base);
  assert.equal(f.api.carsOf(f.tr), wagon);
  f.tr.carOn = true;
  const both = f.api.carsOf(f.tr);
  assert.deepEqual(
    both.map((car) => car.role),
    ['engine', 'player', 'rider', 'kit', 'wagon', 'steel'],
  );
  assert.equal(f.api.carsOf(f.tr), both);
  f.couple(false);
  const steel = f.api.carsOf(f.tr);
  assert.deepEqual(
    steel.map((car) => car.role),
    ['engine', 'player', 'rider', 'kit', 'steel'],
  );
  assert.equal(f.api.carsOf(f.tr), steel);
  assert.equal(f.api.grown(f.tr), steel);
  f.tr.carOn = false;
  assert.equal(f.api.carsOf(f.tr), base);
  f.couple();
  assert.equal(f.api.carsOf(f.tr), wagon);
  f.tr.carOn = true;
  assert.equal(f.api.carsOf(f.tr), both);
  assert.equal(f.builds(), 0);
});
