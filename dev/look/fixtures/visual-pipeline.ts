import * as THREE from 'three/webgpu';

// Loaded by Vite so three resolves to the game's own module instance.
export async function setupVisualPipeline() {
  // Authored diagnostic fixture only; no gameplay progression or new environment dressing.
  await import('/dev/look/evals/place-job.ts' as string);
  const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
  const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
  const { material } = (await import(
    '/src/render/materials.ts' as string
  )) as typeof import('../../../src/render/materials.ts');
  const { readableUnlit } = (await import(
    '/src/render/readable-unlit.ts' as string
  )) as typeof import('../../../src/render/readable-unlit.ts');
  const origin = me.body!.position;
  const fixture = new URLSearchParams(location.search).get('fixture');
  if (fixture === 'calibration' || fixture === 'colour-textures') {
    const group = new THREE.Group();
    group.name = 'visual-pipeline-calibration';
    group.position.set(origin.x, origin.y - 0.8, origin.z);
    scene.add(group);
    const add = (
      geometry: THREE.BufferGeometry,
      mat: THREE.Material,
      x: number,
      y: number,
      z: number,
      name: string,
    ) => {
      const mesh = new THREE.Mesh(geometry, mat);
      mesh.name = name;
      mesh.position.set(x, y, z);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
      return mesh;
    };
    const owned = (color: THREE.Color, metalness = 0, roughness = 1) =>
      new THREE.MeshStandardNodeMaterial({ color, metalness, roughness });
    add(new THREE.BoxGeometry(10, 0.1, 6), owned(new THREE.Color(0.18, 0.18, 0.18)), 0, -0.1, -1, 'neutral plinth');
    for (const [i, preset] of (['timber', 'paintedToy', 'foliage', 'stone', 'steel'] as const).entries())
      add(new THREE.BoxGeometry(1.15, 1.15, 1.15), material(preset).clone(), (i - 2) * 1.7, 1, -2.4, preset);
    add(
      new THREE.SphereGeometry(0.7, 32, 16),
      owned(new THREE.Color(0.18, 0.18, 0.18)),
      -3.3,
      0.7,
      0.7,
      '18% linear diffuse',
    );
    add(new THREE.SphereGeometry(0.7, 32, 16), owned(new THREE.Color(1, 1, 1), 1, 0), 3.3, 0.7, 0.7, 'chrome');
    // Two rows of identical inputs: explicit linear RGB, then sRGB bytes decoded once by TextureNode.
    const colours =
      fixture === 'colour-textures'
        ? ['#fff6c2', '#ffb81f', '#ffffff', '#fffadc', '#fff0c8', '#ffd278', '#ffbe5a', '#808080', '#c83a2a']
        : ['#000000', '#202020', '#404040', '#808080', '#bcbcbc', '#ffffff', '#c83a2a', '#3f8a3a', '#2868ca'];
    for (const [i, hex] of colours.entries()) {
      const colour = new THREE.Color(hex);
      for (const row of fixture === 'colour-textures' ? [0, 1, 2] : [0, 1]) {
        const mat = new THREE.MeshBasicNodeMaterial({ color: row === 0 ? colour : 0xffffff, fog: false });
        if (row > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 8;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = hex;
          ctx.fillRect(0, 0, 8, 8);
          mat.map = new THREE.CanvasTexture(canvas);
          mat.map.colorSpace = row === 2 ? THREE.NoColorSpace : THREE.SRGBColorSpace;
        }
        add(
          new THREE.PlaneGeometry(0.85, 0.55),
          mat,
          (i - 4) * 1.02,
          2.9 - row * 0.65,
          -3.2,
          `${row === 2 ? 'untagged texture (before)' : row ? 'sRGB texture' : 'linear RGB'} ${hex}`,
        );
      }
    }
    // Paired scene-radiance / compensated ink controls expose clipping and the scoped readable policy.
    for (const [i, radiance] of [0.01, 0.18, 1, 2, 4, 8, 16, 32, 64].entries()) {
      const mat = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(radiance, radiance, radiance), fog: false });
      add(new THREE.PlaneGeometry(0.85, 0.4), mat, (i - 4) * 1.02, 3.65, -3.2, `HDR ramp ${radiance}`);
    }
    const ink = new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(0.18, 0.18, 0.18), fog: false });
    add(new THREE.PlaneGeometry(1, 0.4), readableUnlit(ink), 0, 4.3, -3.2, 'compensated 18% ink');
  }
}
