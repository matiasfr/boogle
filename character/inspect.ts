// Selected asset resources, not scene draw calls or total device VRAM. Hidden wear parts remain resident and count here.
import * as THREE from 'three/webgpu';

export type TextureStats = { name: string; width: number; height: number; format: string; bytes: number | null };
export type AssetStats = {
  triangles: number;
  vertices: number;
  materialSlots: number;
  geometries: number;
  textures: TextureStats[];
  geometryBytes: number;
  textureBytes: number | null;
  estimatedBytes: number | null;
};

export function formatBytes(bytes: number | null) {
  if (bytes === null) return 'unknown';
  if (bytes < 1024) return `${bytes} B`;
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

const formats = new Map(
  Object.entries(THREE)
    .filter(([name, value]) => name.endsWith('Format') && typeof value === 'number')
    .map(([name, value]) => [value as number, name]),
);
const types = new Map(
  Object.entries(THREE)
    .filter(([name, value]) => name.endsWith('Type') && typeof value === 'number')
    .map(([name, value]) => [value as number, name]),
);
function textureStats(texture: THREE.Texture): TextureStats {
  const image = texture.image as { width?: number; height?: number } | undefined;
  const width = image?.width ?? 0;
  const height = image?.height ?? 0;
  let bytes: number | null = null;
  let format = `${formats.get(texture.format) ?? `format ${texture.format}`} / ${types.get(texture.type) ?? `type ${texture.type}`}`;
  if ((texture as THREE.CompressedTexture).isCompressedTexture) {
    const mips = (texture as THREE.CompressedTexture).mipmaps;
    // KTX2Loader has already transcoded these bytes to this device's actual compressed target format.
    if (mips.length && mips.every((mip) => ArrayBuffer.isView(mip.data)))
      bytes = mips.reduce((sum, mip) => sum + mip.data.byteLength, 0);
    format += `; ${mips.length} supplied mips`;
  } else if (!(texture as THREE.CubeTexture).isCubeTexture && width > 0 && height > 0) {
    const channels =
      texture.format === THREE.RGBAFormat
        ? 4
        : texture.format === THREE.RGFormat
          ? 2
          : texture.format === THREE.RedFormat
            ? 1
            : null;
    const channelBytes =
      texture.type === THREE.UnsignedByteType || texture.type === THREE.ByteType
        ? 1
        : texture.type === THREE.HalfFloatType ||
            texture.type === THREE.UnsignedShortType ||
            texture.type === THREE.ShortType
          ? 2
          : texture.type === THREE.FloatType || texture.type === THREE.UnsignedIntType || texture.type === THREE.IntType
            ? 4
            : null;
    // Ordinary image uploads are an estimate of GPU allocation, not their PNG/JPEG download size.
    if (channels !== null && channelBytes !== null) {
      bytes = 0;
      let w = width,
        h = height,
        level = 0;
      const levels = texture.generateMipmaps ? Infinity : Math.max(1, texture.mipmaps.length);
      do {
        bytes += w * h * channels * channelBytes;
        level++;
        if ((w === 1 && h === 1) || level >= levels) break;
        w = Math.max(1, Math.floor(w / 2));
        h = Math.max(1, Math.floor(h / 2));
      } while (level < levels);
      format += `; estimated ${level} mip${level === 1 ? '' : 's'}`;
    }
  }
  return { name: texture.name || texture.uuid.slice(0, 8), width, height, format, bytes };
}

/** All meshes in this root, including hidden parts. Repeated meshes count geometry per instance, buffers only once. */
export function inspectAsset(root: THREE.Object3D): AssetStats {
  let triangles = 0,
    vertices = 0,
    materialSlots = 0,
    geometryBytes = 0;
  const geometries = new Set<THREE.BufferGeometry>();
  const arrays = new Set<ArrayBufferView>();
  const textures = new Set<THREE.Texture>();
  const attribute = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
    const array = (a as THREE.InterleavedBufferAttribute).isInterleavedBufferAttribute
      ? (a as THREE.InterleavedBufferAttribute).data.array
      : (a as THREE.BufferAttribute).array;
    if (!arrays.has(array)) {
      arrays.add(array);
      geometryBytes += array.byteLength;
    }
  };
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry;
    vertices += geometry.attributes.position?.count ?? 0;
    triangles += Math.floor((geometry.index?.count ?? geometry.attributes.position?.count ?? 0) / 3);
    if (!geometries.has(geometry)) {
      geometries.add(geometry);
      if (geometry.index) attribute(geometry.index);
      for (const a of Object.values(geometry.attributes)) attribute(a);
      for (const morphs of Object.values(geometry.morphAttributes)) for (const a of morphs ?? []) attribute(a);
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materialSlots += materials.length;
    for (const material of materials)
      for (const value of Object.values(material))
        if (value && typeof value === 'object' && (value as THREE.Texture).isTexture)
          textures.add(value as THREE.Texture);
  });
  const textureRows = [...textures].map(textureStats);
  const textureBytes = textureRows.some((texture) => texture.bytes === null)
    ? null
    : textureRows.reduce((total, texture) => total + texture.bytes!, 0);
  return {
    triangles,
    vertices,
    materialSlots,
    geometries: geometries.size,
    textures: textureRows,
    geometryBytes,
    textureBytes,
    estimatedBytes: textureBytes === null ? null : geometryBytes + textureBytes,
  };
}

/** Materials are preview-owned; geometry and textures stay with the asset loader. */
export function cloneMaterials(root: THREE.Object3D) {
  const clones = new Map<THREE.Material, THREE.Material>();
  const clone = (original: THREE.Material) => {
    let material = clones.get(original);
    if (!material) {
      material = original.clone();
      clones.set(original, material);
    }
    return material;
  };
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) mesh.material = Array.isArray(mesh.material) ? mesh.material.map(clone) : clone(mesh.material);
  });
  const materials = new Set(clones.values());
  return {
    materials,
    dispose: () => {
      for (const material of materials) material.dispose();
      materials.clear();
    },
  };
}
