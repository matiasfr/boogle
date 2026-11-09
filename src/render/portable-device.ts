// Development-only validation on the real device, with optional features disabled.
// This constrains Dawn's validation; it does not emulate WebKit's WGSL/Metal compiler or an iPad GPU.
import type * as THREE from 'three/webgpu';

export async function installPortableDevice(renderer: THREE.WebGPURenderer) {
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('Portable GPU check needs a WebGPU adapter');
  // Keep core semantics where available; no optional filtering, blending, compression, f16 or subgroups.
  const requiredFeatures: GPUFeatureName[] = adapter.features.has('core-features-and-limits')
    ? ['core-features-and-limits']
    : [];
  const device = await adapter.requestDevice({
    requiredFeatures,
    requiredLimits: {
      maxStorageBuffersPerShaderStage: 8,
      maxVertexBuffers: 8,
      maxColorAttachmentBytesPerSample: 32,
    },
  });
  // WebGPURenderer's documented device parameter is consumed by backend.init(). Supply it before init,
  // without top-level await in scene.ts's cyclic scene/loop imports, and without a second renderer.
  const backend = renderer.backend as unknown as { parameters: { device?: GPUDevice } };
  backend.parameters.device = device;
  console.info(
    'PORTABLE GPU ' +
      JSON.stringify({
        adapter: { vendor: adapter.info.vendor, architecture: adapter.info.architecture, device: adapter.info.device },
        features: [...device.features],
        limits: {
          maxStorageBuffersPerShaderStage: device.limits.maxStorageBuffersPerShaderStage,
          maxVertexBuffers: device.limits.maxVertexBuffers,
          maxColorAttachmentBytesPerSample: device.limits.maxColorAttachmentBytesPerSample,
        },
      }),
  );
}
