// One small offscreen render on the stage's renderer per visible card. Cache lives only in this document.
import * as THREE from 'three/webgpu';
import { renderOutput, texture, uv } from 'three/tsl';
import type { CatalogueEntry } from './catalogue.ts';
import { inspectAsset } from './inspect.ts';

type Model = { group: THREE.Group; dispose(): void };
export function createThumbnails(renderer: THREE.WebGPURenderer, create: (entry: CatalogueEntry) => Promise<Model>) {
  const size = 112;
  const hdr = new THREE.RenderTarget(size, size, { type: THREE.HalfFloatType });
  const out = new THREE.RenderTarget(size, size, { type: THREE.UnsignedByteType, depthBuffer: false });
  const material = new THREE.NodeMaterial();
  material.fragmentNode = renderOutput(texture(hdr.texture, uv()), THREE.NeutralToneMapping, THREE.SRGBColorSpace);
  material.depthTest = material.depthWrite = false;
  const quad = new THREE.QuadMesh(material);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e6ebef');
  scene.add(new THREE.HemisphereLight('#ffffff', '#8a7a66', 2.2));
  const light = new THREE.DirectionalLight('#ffffff', 2.2);
  light.position.set(2, 3, 4);
  scene.add(light);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 1000);
  const cache = new Map<string, Promise<string>>();
  let queue: Promise<unknown> = Promise.resolve(),
    disposed = false;
  async function draw(entry: CatalogueEntry) {
    const model = await create(entry);
    if (disposed) {
      model.dispose();
      throw new Error('Thumbnail renderer closed');
    }
    let skeleton: THREE.SkeletonHelper | undefined;
    try {
      model.group.updateMatrixWorld(true);
      entry.triangles = inspectAsset(model.group).triangles;
      const box = new THREE.Box3().setFromObject(model.group);
      if (entry.id === 'hero-clips') {
        box.makeEmpty();
        model.group.traverse((o) => {
          if ((o as THREE.Bone).isBone) box.expandByPoint(o.getWorldPosition(new THREE.Vector3()));
        });
        skeleton = new THREE.SkeletonHelper(model.group);
        scene.add(skeleton);
      }
      if (box.isEmpty()) box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 2, 0.5));
      model.group.position.sub(box.getCenter(new THREE.Vector3()));
      model.group.updateMatrixWorld(true);
      const radius = Math.max(0.1, box.getSize(new THREE.Vector3()).length());
      const distance = (radius * 0.55) / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
      camera.position
        .set(0.8, 0.55, entry.id.startsWith('code:windmill') ? -1.15 : 1.15)
        .normalize()
        .multiplyScalar(distance);
      camera.lookAt(0, 0, 0);
      scene.add(model.group);
      const previous = renderer.getRenderTarget();
      try {
        renderer.setRenderTarget(hdr);
        renderer.render(scene, camera);
        renderer.setRenderTarget(out);
        quad.render(renderer);
      } finally {
        renderer.setRenderTarget(previous);
      }
      const pixels = await renderer.readRenderTargetPixelsAsync(out, 0, 0, size, size);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const context = canvas.getContext('2d')!;
      const image = context.createImageData(size, size);
      image.data.set(pixels);
      context.putImageData(image, 0, 0);
      return canvas.toDataURL('image/webp', 0.8);
    } finally {
      model.group.removeFromParent();
      skeleton?.removeFromParent();
      skeleton?.dispose();
      model.dispose();
    }
  }
  return {
    get(entry: CatalogueEntry) {
      if (!cache.has(entry.id)) {
        if (cache.size >= 96) cache.delete(cache.keys().next().value!);
        const job = queue.then(() => draw(entry));
        cache.set(entry.id, job);
        queue = job.catch(() => {
          cache.delete(entry.id);
        });
      }
      return cache.get(entry.id)!;
    },
    dispose() {
      disposed = true;
      void queue.finally(() => {
        hdr.dispose();
        out.dispose();
        material.dispose();
        cache.clear();
      });
    },
  };
}
