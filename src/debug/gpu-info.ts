// What the GPU offers this tab, as text: the adapter's info, features and limits, the limits three actually asked
// for (its defaults), and whether transient (memoryless) attachments exist. `?prof=1` logs it to the console once;
// `?gpuinfo=1` also shows it in a panel, so it can be read and copied on an iPad without Web Inspector
// (docs/research/webgpu-on-ipad.md, recommendation 1). Local, debug only.
import { renderer, rendererReady } from '../render/scene.ts';

const LIMITS = [
  'maxTextureDimension2D',
  'maxBufferSize',
  'maxStorageBufferBindingSize',
  'maxUniformBufferBindingSize',
  'maxStorageBuffersPerShaderStage',
  'maxStorageBuffersInFragmentStage',
  'maxStorageTexturesPerShaderStage',
  'maxSampledTexturesPerShaderStage',
  'maxBindGroups',
  'maxColorAttachments',
  'maxColorAttachmentBytesPerSample',
  'maxComputeWorkgroupStorageSize',
  'maxComputeInvocationsPerWorkgroup',
  'maxComputeWorkgroupsPerDimension',
  'maxVertexBuffers',
  'maxInterStageShaderVariables',
] as const;

type Limits = Record<string, number | undefined>;
// The DOM lib has no WebGPU types (and no @webgpu/types here): just the parts read below.
type Adapter = {
  info?: { vendor?: string; architecture?: string; device?: string; description?: string };
  features: Set<string>;
  limits: Limits;
};
type Gpu = { requestAdapter(o?: { powerPreference?: string }): Promise<Adapter | null> };

export async function gpuInfo(): Promise<string> {
  const gpu = (navigator as Navigator & { gpu?: Gpu }).gpu;
  if (!gpu) return 'navigator.gpu: missing';
  const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) return 'requestAdapter: null';
  await rendererReady.catch(() => {});
  const device = (renderer.backend as unknown as { device?: { limits: Limits } }).device;
  const info = adapter.info;
  const al = adapter.limits;
  const dl = device?.limits;
  const mib = (n: number | undefined) =>
    n === undefined ? '-' : n >= 1 << 20 ? `${Math.round(n / (1 << 20))} MiB` : String(n);
  const lines = [
    `adapter  ${info ? [info.vendor, info.architecture, info.device, info.description].filter(Boolean).join(' / ') : '?'}`,
    `screen   ${screen.width}x${screen.height} @${devicePixelRatio}, drawing ${renderer.domElement.width}x${renderer.domElement.height}`,
    `ua       ${navigator.userAgent}`,
    `transient attachments  ${'TRANSIENT_ATTACHMENT' in ((globalThis as { GPUTextureUsage?: object }).GPUTextureUsage ?? {})}`,
    `timestamps  ${(renderer.backend as unknown as { trackTimestamp?: boolean }).trackTimestamp ? 'on' : 'off'}`,
    '',
    'features',
    ...[...adapter.features].sort().map((f) => `  ${f}`),
    '',
    'limits         adapter / device (what three requested)',
    ...LIMITS.map((k) => `  ${k}  ${mib(al[k])} / ${mib(dl?.[k])}`),
  ];
  return lines.join('\n');
}

// Taps go through the panel (it may sit over the lobby's Enter button); only its close button takes them. Two columns,
// so it fits an iPad screen without scrolling: read it there, or take a screenshot.
export async function showGpuInfo() {
  const text = await gpuInfo();
  const el = document.createElement('pre');
  el.style.cssText =
    'position:fixed;left:8px;top:8px;max-width:calc(100vw - 16px);margin:0;padding:8px 10px;border-radius:6px;' +
    'background:rgba(0,0,0,.75);color:#d8f3ff;font:10px/1.3 ui-monospace,monospace;z-index:51;white-space:pre-wrap;' +
    'pointer-events:none;columns:2 300px;column-gap:16px';
  el.textContent = text;
  const close = document.createElement('button');
  close.textContent = 'close';
  close.style.cssText = 'float:right;font:inherit;pointer-events:auto';
  close.onclick = () => el.remove();
  el.prepend(close);
  document.body.append(el);
}
