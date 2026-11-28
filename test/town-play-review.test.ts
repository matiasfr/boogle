import assert from 'node:assert/strict';
import test from 'node:test';
import { Line3, Object3D, Vector3 } from 'three';
import { sourceFunction } from '../dev/level/source.ts';
import { continuous, cupStroll } from '../src/entities/town/play.ts';

test('the dunk paddle leaves a grounded player with held input in place', () => {
  const body = { position: new Vector3(0, 0.8, 0), velocity: new Vector3() };
  const ball = { e: 1, held: false, pose: { p: new Vector3(-0.2, 1.5, 0.05), v: new Vector3(10, 0, 0) } };
  let clanks = 0;
  const create = sourceFunction<(...args: unknown[]) => { update(kind: number, now: number): void }>(
    'src/entities/town/ball-targets.ts',
    'createBallTargets',
    {
      ball,
      Vector3,
      Line3,
      continuous,
      cupStroll,
      GOLF_CUPS: [],
      PLOT_KIND: { dunk: 5 },
      inputState: { held: true, holder: 'conversation', seated: false },
      me: { body, coyote: 0.1 },
      toWorld: (x: number) => x,
      surfaceHeight: () => 0,
      document: new EventTarget(),
      discPath: () => () => null,
      enters: () => false,
      cheerSite: () => () => {},
      cheerAround() {},
      splash() {},
      clank: () => clanks++,
      instantiate() {
        const root = new Object3D();
        const pivot = new Object3D();
        pivot.name = 'bucket';
        root.add(pivot);
        return { root, setEnabled() {} };
      },
    },
  );
  const view = create({ cleanup() {} }, { x: 0, z: 0 }, 0);
  view.update(5, 0);
  ball.pose.p.x = 0.78;
  view.update(5, 100);
  assert.equal(clanks, 1);
  assert.equal(body.velocity.y, 0);
});

test('a toy cheer leaves both participants in a folk exchange talking', () => {
  const guys = [1, 2].map((chat) => ({ on: true, x: 1, z: 0, chat, job: 'stroll', site: null, cheer: 0 }));
  const cheer = sourceFunction<(x: number, z: number, r: number, s: number) => void>(
    'src/place/folk.ts',
    'cheerAround',
    { guys, crew: null },
  );
  cheer(0, 0, 16, 1.4);
  assert.deepEqual(
    guys.map((g) => g.cheer),
    [0, 0],
  );
});

test('a disc crossing a pad on its landing frame still hits it', () => {
  const disc = {
    p: new Vector3(-0.7, 0.14, 0),
    v: new Vector3(8, -2, 0),
    enabled: true,
    held: false,
    mine: true,
    e: 1,
  };
  const sample = sourceFunction<(owner: unknown) => (now: number) => Line3 | null>(
    'src/entities/town/disc-path.ts',
    'discPath',
    { disc, Line3, continuous, document: new EventTarget() },
  )({ cleanup() {} });
  const enters = sourceFunction<(path: Line3 | null, p: Vector3, r: number) => boolean>(
    'src/entities/town/disc-path.ts',
    'enters',
    { closest: new Vector3() },
  );
  sample(0);
  disc.p.set(-0.3, 0.04, 0);
  disc.v.setScalar(0);
  assert.ok(enters(sample(50), new Vector3(0, 0.16, 0), 0.55));
});
