// Owner-requested migration proof. Record the old draw boundary before changing its authoring.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { sourceFunction, sourceModule } from '../dev/level/source.ts';
import { LEG2, PAD_SIZE, bellRockOutlines } from '../src/entities/route-greybox/leg2-layout.ts';
import type { Shape } from '../src/physics/engine.ts';
import * as validation from '../src/prefab/validate.ts';
import { names } from '../src/prefab/names.ts';
import artifact from '../content/built/prefabs.json' with { type: 'json' };
import workshop from '../content/built/levels/workshop.json' with { type: 'json' };
import gorge from '../content/built/levels/gorge.json' with { type: 'json' };

for (const area of ['bell', 'west'] as const)
  test(`${area} collider and placement bytes match the old leg 2`, async () => {
    const colliders: unknown[] = [],
      signs: { mesh: THREE.Group; options: unknown; lines: string[] }[] = [];
    const record = (shape: Shape, at: { x: number; y: number; z: number }, q?: THREE.Quaternion) => {
      colliders.push({ shape, at: [at.x, at.y, at.z], rotation: q?.toArray() });
    };
    const createOwnedView = sourceFunction<typeof import('../src/render/owned-view.ts').createOwnedView>(
      'src/render/owned-view.ts',
      'createOwnedView',
      { THREE, owners: new WeakMap(), addBody() {}, removeBody() {} },
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
    const runtime = sourceModule<typeof import('../src/prefab/instantiate.ts')>(
      fs.readFileSync('src/prefab/instantiate.ts', 'utf8'),
      { THREE, artifact, workshop, gorge, names, ...validation, builders, staticBody: record },
    );
    const boxes = sourceModule<typeof import('../src/entities/route-greybox/boxes.ts')>(
      fs.readFileSync('src/entities/route-greybox/boxes.ts', 'utf8'),
      runtime,
    );
    const draw = sourceModule<typeof import('../src/entities/route-greybox/leg2-draw.ts')>(
      fs.readFileSync('src/entities/route-greybox/leg2-draw.ts', 'utf8'),
      { ...boxes, PAD_SIZE, signBoard },
    );
    const source = fs
      .readFileSync(`src/entities/route-greybox/massing-${area}.ts`, 'utf8')
      .replace("await import('../../place/land.ts')", 'land');
    const massing = sourceModule<Record<string, (owner?: ReturnType<typeof createOwnedView>) => unknown>>(source, {
      THREE,
      LEG2,
      ...draw,
      bellRockOutlines,
      mapPage: fs.readFileSync('docs/world/map-prototypes.html', 'utf8'),
      land: { addStatic: record },
    });
    const owner = createOwnedView();
    const { mesh, solids } = await boxes.drawGreyBoxes(
      owner,
      massing[`${area}Massing`]!() as ReturnType<typeof draw.leg2Boxes>,
    );
    await massing[`${area}Extras`]!(owner);
    owner.root.updateWorldMatrix(true, true);
    const placements = Array.from({ length: mesh.count }, (_, i) => {
      const matrix = new THREE.Matrix4(),
        colour = new THREE.Color();
      mesh.getMatrixAt(i, matrix);
      mesh.getColorAt(i, colour);
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
      ['counts', { visible: mesh.count, bodies: colliders.length, signs: signs.length, batches: 1 }],
    ] as const) {
      const file = `test/fixtures/prefab-${area}-${suffix}.json`,
        bytes = JSON.stringify(value, null, 2) + '\n';
      if (process.env.GOLDEN === '1') fs.writeFileSync(file, bytes);
      assert.equal(bytes, fs.readFileSync(file, 'utf8'), file);
    }
    owner.dispose();
  });
