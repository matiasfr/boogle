// Review reproduction: missing/moved compiled placements must change the actual level-check verdict.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sourceModule } from '../dev/level/source.ts';
import { H } from '../src/place/terrain.ts';
import { inside, layout, parseMapPage } from '../src/sickle/map-data.ts';
import { ORIGIN } from '../src/place/layout.ts';
import { WORLD_LINES } from '../src/sim/railway-world-lines.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import bellRaw from '../content/built/levels/bell.json' with { type: 'json' };
import westRaw from '../content/built/levels/west.json' with { type: 'json' };
import gorgeRaw from '../content/built/levels/gorge.json' with { type: 'json' };
import * as validation from '../src/prefab/validate.ts';
import { flood } from '../dev/level/flood.ts';
import { Matrix4, Vector3 } from 'three';
import * as placed from '../dev/level/prefab-colliders.ts';
import { metadata, type LevelArtifact, type PrefabDef } from '../src/prefab/types.ts';
import { MOVER } from '../dev/level/mover.ts';

validation.validateArtifact(artifact);
const bell = validation.loadLevelArtifact(bellRaw, artifact.prefabs),
  west = validation.loadLevelArtifact(westRaw, artifact.prefabs),
  gorge = validation.loadLevelArtifact(gorgeRaw, artifact.prefabs);
function report(level: unknown, definitions: unknown = artifact) {
  const source = fs.readFileSync('dev/level/route-leg2.ts', 'utf8');
  assert.ok(source.includes('if (import.meta.main)'));
  const checker = sourceModule<typeof import('../dev/level/route-leg2.ts')>(
    fs.readFileSync('dev/level/route-leg2.ts', 'utf8').replace('if (import.meta.main)', 'if (false)'),
    {
      fs: {
        readFileSync: (file: string) =>
          file === 'content/built/levels/bell.json'
            ? JSON.stringify(level)
            : file === 'content/built/levels/west.json'
              ? JSON.stringify(west)
              : file === 'content/built/levels/gorge.json'
                ? JSON.stringify(gorge)
                : fs.readFileSync(file, 'utf8'),
      },
      H,
      inside,
      layout,
      parseMapPage,
      ORIGIN,
      WORLD_LINES,
      artifact: definitions,
      ...validation,
      flood,
      MOVER,
      Matrix4,
      Vector3,
      ...placed,
    },
  );
  return checker.checkLeg2();
}

test('compiled leg 2 still matches the old level report bytes', () => {
  assert.equal(
    JSON.stringify(report(bell), null, 2) + '\n',
    fs.readFileSync('test/fixtures/prefab-leg2-report.json', 'utf8'),
  );
});
for (const mutation of ['remove', 'move', 'height', 'lower', 'rotate', 'scale'] as const)
  test(`review P2: ${mutation} bell.rock fails with a rim finding`, () => {
    const changed = { ...structuredClone(bell), placements: structuredClone([...bell.placements]) };
    if (mutation === 'remove') changed.placements = changed.placements.filter((p) => p.id !== 'bell.rock');
    else {
      const rock = changed.placements.find((p) => p.id === 'bell.rock')!;
      if (mutation === 'move') rock.pos = [rock.pos[0] + 1000, rock.pos[1], rock.pos[2]];
      else if (mutation === 'height') rock.pos = [rock.pos[0], rock.pos[1] + 20, rock.pos[2]];
      else if (mutation === 'lower') rock.pos = [rock.pos[0], rock.pos[1] - 1, rock.pos[2]];
      else if (mutation === 'rotate') rock.rot = [Math.PI / 2, 0, 0];
      else rock.scale = [0.5, 1, 0.5];
    }
    const result = report(changed);
    assert.ok(result.failures > 0, `${mutation}: removed runtime rim bodies cannot pass the checker`);
    assert.ok(
      result.entries.some((e) => e.kind === 'assertion' && !e.passed && /widest unsolid rim/.test(e.message)),
      `${mutation}: name the rim`,
    );
  });

test('West and Gorge clearance use placed box dimensions, not assumed unit colliders', () => {
  const definitions = structuredClone(artifact);
  definitions.prefabs['greybox.box'].colliders[0]!.half[0] = 5;
  const result = report(bell, definitions);
  for (const name of ['platform-a', 'incline-n'])
    assert.ok(
      result.entries.some((e) => e.kind === 'assertion' && !e.passed && e.message.includes(name)),
      name,
    );
});

test('pad clearance follows the placed scale', () => {
  const changed = { ...structuredClone(bell), placements: structuredClone([...bell.placements]) };
  changed.placements.find((p) => p.id === 'bell.pad-gorge')!.scale = [20, 1, 1];
  assert.ok(
    report(changed).entries.some((e) => e.kind === 'assertion' && !e.passed && e.message.includes('pad-gorge')),
  );
});

test('placed box geometry composes instance TRS, collider offset, rotation and half extents', () => {
  const box: PrefabDef = {
    key: 'test.box',
    scope: 'place',
    visual: { none: true },
    colliders: [{ shape: 'box', at: [1, 0, 0], rot: [Math.PI / 2, 0, 0], half: [1, 2, 3] }],
  };
  const frame: PrefabDef = { key: 'test.frame', scope: 'place', visual: { none: true }, colliders: [] };
  const level: LevelArtifact = {
    ...metadata,
    format: 'boogle-level',
    place: 'test',
    placements: [
      { id: 'frame', prefab: frame.key, pos: [5, 0, 0] },
      { id: 'box', prefab: box.key, pos: [15, 20, 30], rot: [Math.PI / 2, 0, 0], scale: [2, 2, 2] },
    ],
  };
  const { colliders } = placed.resolvePlacedColliders(level, { [box.key]: box, [frame.key]: frame });
  const volume = colliders[0]!.volume;
  assert.ok(volume.centre.distanceTo(new Vector3(15, 20, 28)) < 1e-9);
  assert.equal(placed.heightAt(volume.triangles, { x: 15, z: 28 }), 24);
  assert.equal(placed.heightAt(volume.triangles, { x: 18, z: 28 }), null);
  level.placements[1]!.parent = 'frame';
  assert.throws(() => placed.resolvePlacedColliders(level, { [box.key]: box, [frame.key]: frame }), /parented greybox/);
});

for (const mutation of ['remove', 'move'] as const)
  test(`raw authored artifact: ${mutation} rock fails rim coverage`, () => {
    const changed = structuredClone(bellRaw);
    if (mutation === 'remove') changed.layout.data.extras = [];
    else changed.layout.data.extras[0]!.pos[0] = 1000;
    const result = report(changed);
    assert.ok(result.failures > 0);
    assert.ok(result.entries.some((e) => e.kind === 'assertion' && !e.passed && /widest unsolid rim/.test(e.message)));
  });
