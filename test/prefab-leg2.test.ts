import { compiled, definitions } from '../src/prefab/catalogue.ts';
import { prefabGolden, recordMatrices } from './helpers/prefab-golden.ts';
// Owner-requested migration proof. Record the old draw boundary before changing its authoring.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import { LEG2_TEXT } from '../src/entities/route-greybox/leg2-layout.ts';
import type { Placement } from '../src/prefab/types.ts';
import type { Shape } from '../src/physics/engine.ts';
import * as validation from '../src/prefab/validate.ts';
import { names } from '../src/prefab/names.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };
import bellRaw from '../content/built/levels/bell.json' with { type: 'json' };
import westRaw from '../content/built/levels/west.json' with { type: 'json' };

validation.validateArtifact(artifact);
const bellLevel = validation.loadLevelArtifact(bellRaw, artifact.prefabs),
  westLevel = validation.loadLevelArtifact(westRaw, artifact.prefabs);
const expected = {
  bell: {
    colliders: fs.readFileSync('test/fixtures/prefab-bell-colliders.json', 'utf8'),
    placements: fs.readFileSync('test/fixtures/prefab-bell-placements.json', 'utf8'),
    counts: fs.readFileSync('test/fixtures/prefab-bell-counts.json', 'utf8'),
  },
  west: {
    colliders: fs.readFileSync('test/fixtures/prefab-west-colliders.json', 'utf8'),
    placements: fs.readFileSync('test/fixtures/prefab-west-placements.json', 'utf8'),
    counts: fs.readFileSync('test/fixtures/prefab-west-counts.json', 'utf8'),
  },
};

for (const area of ['bell', 'west'] as const)
  test(`${area} collider and placement values match the old leg 2`, async () => {
    const matrices = recordMatrices();
    const colliders: unknown[] = [],
      signs: { mesh: THREE.Group; options: unknown; lines: string[] }[] = [];
    const active = new Set<unknown>();
    const record = (shape: Shape, at: { x: number; y: number; z: number }, q?: THREE.Quaternion) => {
      colliders.push({ shape, at: [at.x, at.y, at.z], rotation: q?.toArray() });
      return {};
    };
    const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
      'src/render/owned-view.ts',
      'createOwnedView',
      {
        THREE,
        owners: new WeakMap(),
        addBody: (body: unknown) => active.add(body),
        removeBody: (body: unknown) => active.delete(body),
      },
    );
    const signBoard = (
      owner: ReturnType<typeof createOwnedView> | undefined,
      options: { px: number; w: number; h: number },
    ) => {
      const mesh = new THREE.Group(),
        lines: string[] = [];
      owner?.add(mesh);
      signs.push({ mesh, options, lines });
      return {
        mesh,
        cw: options.px,
        ch: Math.round((options.px * options.h) / options.w),
        painted() {},
        dispose() {},
        g: {
          fillRect() {},
          strokeRect() {},
          measureText: (s: string) => ({ width: s.length * 100 }),
          fillText: (s: string) => lines.push(s),
        },
      };
    };
    const builders = new Map();
    sourceModule(fs.readFileSync('src/prefab/builders/greybox-box.ts', 'utf8'), {
      THREE,
      material: () => new THREE.MeshStandardNodeMaterial(),
      registerBuilder: (name: string, build: unknown) => builders.set(name, build),
    });
    builders.set('seat.chair', () => new THREE.Group());
    builders.set('town.workshop-parts', () => new THREE.Group());
    builders.set('town.shop-parts', () => new THREE.Group());
    builders.set('town.curio-parts', () => new THREE.Group());
    builders.set('town.museum-parts', () => new THREE.Group());
    builders.set('town.museum-exhibit', () => new THREE.Group());
    builders.set('town.house-parts', () => new THREE.Group());
    builders.set('town.room-shell', () => new THREE.Group());
    builders.set('town.room-proxy', () => new THREE.Group());
    builders.set('railway.halt-parts', () => new THREE.Group());
    builders.set('railway.halt-ramp', () => new THREE.Group());
    const { makeGreyboxLabel } = sourceModule<typeof import('../src/prefab/builders/greybox-label.ts')>(
      fs.readFileSync('src/prefab/builders/greybox-label.ts', 'utf8'),
      { signBoard },
    );
    const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
      fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
      {
        THREE,
        artifact,
        compiled,
        definitions,
        workshop,
        gorge,
        names,
        ...validation,
        builders,
        makeGreyboxLabel,
        staticBody: record,
      },
    );
    const boxes = sourceModule<typeof import('../src/entities/route-greybox/boxes.ts')>(
      fs.readFileSync('src/entities/route-greybox/boxes.ts', 'utf8'),
      { ...runtime, artifact, compiled, definitions, ...validation },
    );
    const draw = sourceModule<typeof import('../src/entities/route-greybox/leg2-draw.ts')>(
      fs.readFileSync('src/entities/route-greybox/leg2-draw.ts', 'utf8'),
      { ...runtime, artifact, compiled, definitions, records: compiled, ...validation, LEG2_TEXT },
    );
    type Massing = Record<string, (owner?: ReturnType<typeof createOwnedView>) => unknown>;
    const massing = {
      bell: sourceModule<Massing>(fs.readFileSync('src/entities/route-greybox/massing-bell.ts', 'utf8'), {
        ...draw,
        level: bellLevel,
      }),
      west: sourceModule<Massing>(fs.readFileSync('src/entities/route-greybox/massing-west.ts', 'utf8'), {
        ...draw,
        level: westLevel,
      }),
    }[area];
    const owner = createOwnedView();
    const { mesh, solids } = await boxes.drawGreyBoxes(owner, massing[`${area}Massing`]!() as readonly Placement[]);
    await massing[`${area}Extras`]!(owner);
    owner.root.updateWorldMatrix(true, true);
    const placements = Array.from({ length: mesh.count }, (_, i) => {
      const matrix = matrices.get(mesh, i),
        colour = matrices.colour(mesh, i);
      return { matrix: matrix.toArray(), colour: colour.toArray() };
    });
    for (const [suffix, value] of [
      ['colliders', colliders],
      [
        'placements',
        {
          boxes: mesh.count,
          solids,
          placements,
          signs: signs.map(({ mesh, options, lines }) => ({ matrix: mesh.matrixWorld.toArray(), options, lines })),
        },
      ],
      [
        'counts',
        {
          visible: mesh.count,
          bodies: colliders.length,
          signs: signs.length,
          batches: owner.root.children.filter((child) => child instanceof THREE.InstancedMesh).length,
        },
      ],
    ] as const) {
      const file = `test/fixtures/prefab-${area}-${suffix}.json`,
        bytes = JSON.stringify(value, null, 2) + '\n';
      if (process.env.GOLDEN === '1') fs.writeFileSync(file, bytes);
      prefabGolden(JSON.parse(bytes), JSON.parse(process.env.GOLDEN === '1' ? bytes : expected[area][suffix]), file);
    }
    matrices.restore();
    owner.dispose();
    assert.equal(active.size, 0, 'all boxes and rim colliders leave with the owner');
    if (area === 'bell') {
      assert.throws(() => draw.leg2Massing({ ...bellLevel, version: 99 }), /version/);
      assert.throws(
        () =>
          draw.leg2Massing({
            ...bellLevel,
            placements: bellLevel.placements.map((p) =>
              'labels' in p ? { ...p, labels: { label: 'missing.copy' } } : p,
            ),
          }),
        /missing label text/,
      );
      const nextOwner = createOwnedView();
      const pad = (massing.bellMassing!() as readonly Placement[]).find((p) => p.prefab === 'greybox.pad')!;
      const target = runtime.createPrefabBatch('greybox.box', 8, nextOwner);
      const first = runtime.instantiate(pad.prefab, pad, { owner: nextOwner, batch: { target, index: 0 } });
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < 4; i++) {
        target.mesh.getMatrixAt(i, matrix);
        assert.equal(matrix.determinant(), 0);
      }
      first.setEnabled(true);
      for (let i = 0; i < 4; i++) {
        target.mesh.getMatrixAt(i, matrix);
        assert.ok(matrix.determinant() > 0);
      }
      const roots = nextOwner.root.children.length;
      assert.throws(
        () => runtime.instantiate(pad.prefab, pad, { owner: nextOwner, batch: { target, index: 2 } }),
        /occupied/,
      );
      assert.equal(nextOwner.root.children.length, roots, 'overlapping slots reject before allocation');
      first.setEnabled(false);
      for (let i = 0; i < 4; i++) {
        target.mesh.getMatrixAt(i, matrix);
        assert.equal(matrix.determinant(), 0);
      }
      first.dispose();
      runtime.instantiate(pad.prefab, pad, { owner: nextOwner, batch: { target, index: 0 } }).setEnabled(true);
      nextOwner.dispose();
      assert.equal(target.slots.size, 0, 'disposing the owner releases every compound slot');
      assert.equal(active.size, 0);
    }
  });
