// The adapter limits a device report records, each with the short field name a playdata event allows (24 characters at
// most). Pure; src/debug/gpu-info.ts shows the same list in its panel. Local, debug only.
export const LIMIT_KEYS = {
  maxTextureDimension2D: 'tex2d',
  maxBufferSize: 'buffer',
  maxStorageBufferBindingSize: 'storage_bind',
  maxUniformBufferBindingSize: 'uniform_bind',
  maxStorageBuffersPerShaderStage: 'storage_bufs',
  maxStorageBuffersInFragmentStage: 'storage_bufs_frag',
  maxStorageTexturesPerShaderStage: 'storage_tex',
  maxSampledTexturesPerShaderStage: 'sampled_tex',
  maxBindGroups: 'bind_groups',
  maxColorAttachments: 'color_att',
  maxColorAttachmentBytesPerSample: 'color_att_bytes',
  maxComputeWorkgroupStorageSize: 'wg_storage',
  maxComputeInvocationsPerWorkgroup: 'wg_invocations',
  maxComputeWorkgroupsPerDimension: 'wg_per_dim',
  maxVertexBuffers: 'vertex_bufs',
  maxInterStageShaderVariables: 'inter_stage',
} as const;
export type LimitName = keyof typeof LIMIT_KEYS;
export const LIMITS = Object.keys(LIMIT_KEYS) as LimitName[];
