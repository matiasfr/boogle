import * as THREE from 'three/webgpu';

const FRAMES = 12;
const WIDTH = 96;
const HEIGHT = 64;

export function furnaceMouthBox() {
  const box = new THREE.BoxGeometry(2.8, 1.8, 0.1);
  const uv = box.getAttribute('uv');
  const normals = box.getAttribute('normal');
  for (let vertex = 0; vertex < uv.count; vertex++) {
    if (!normals.getZ(vertex)) uv.setXY(vertex, 0.5, 0.96);
  }
  return box;
}

export function furnaceMouthAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT * FRAMES;
  const ctx = canvas.getContext('2d')!;
  function polygon(color: string, ...points: number[]) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0]!, points[1]!);
    for (let index = 2; index < points.length; index += 2) ctx.lineTo(points[index]!, points[index + 1]!);
    ctx.closePath();
    ctx.fill();
  }
  for (let frame = 0; frame < FRAMES; frame++) {
    const phase = (frame / FRAMES) * Math.PI * 2;
    ctx.fillStyle = '#24191b';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    polygon('#552821', 3, 58, 5, 25, 16, 13, 77, 13, 90, 23, 93, 58);
    polygon('#973620', 4, 58, 7, 40, 20, 34, 34, 38, 56, 28, 73, 35, 89, 33, 92, 58);
    for (let tongue = 0; tongue < 5; tongue++) {
      const base = 14 + 17 * tongue;
      const sway = Math.sin(phase + tongue * 2);
      const tip = 25 + 6 * Math.cos(phase + tongue * 2.6) - (tongue % 2) * 8;
      polygon('#f46721', base - 11, 55, base - 8, 39, base, 32, base + sway * 5, tip, base + 9, 37, base + 12, 55);
      polygon('#ffc454', base - 7, 52, base - 4, 42, base + 3 * sway, tip + 10, base + 7, 43, base + 9, 52);
    }
    ctx.fillStyle = '#f38a35';
    ctx.fillRect(4, 51, 88, 8);
    for (let coal = 0; coal < 7; coal++) {
      const left = 4 + coal * 13;
      const top = 50 - ((coal * 5) % 7);
      polygon('#712721', left, 56, left + 2, top + 2, left + 8, top, left + 13, 54, left + 10, 58);
      polygon('#342222', left + 1, 56, left + 4, top + 4, left + 10, top + 3, left + 13, 54, left + 10, 58);
    }
    ctx.translate(0, HEIGHT);
  }
  const atlas = new THREE.CanvasTexture(canvas);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.generateMipmaps = false;
  atlas.minFilter = THREE.LinearFilter;
  atlas.repeat.y = 1 / FRAMES;
  let elapsed = 0;
  return {
    atlas,
    advance(dt: number) {
      elapsed = (elapsed + dt * 8) % FRAMES;
      atlas.offset.y = Math.floor(elapsed) / FRAMES;
    },
  };
}
