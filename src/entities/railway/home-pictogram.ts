// Which road goes where, without words (docs/plans/home-station.md, design review call 38): a painted plaque on each
// island edge's signal mast. Road 1 shows the timber camp's machine; road 2 the quarry, Far Head and the pier. Local.
import * as THREE from 'three/webgpu';

const PAPER = '#fff3d6',
  INK = '#2a1c10',
  SEA = '#3f6f8f';

function drawCamp(g: CanvasRenderingContext2D) {
  // The track layer on its rails, its arm out over the next pair, and a pine behind: the camp.
  g.fillStyle = INK;
  g.fillRect(40, 190, 432, 10);
  g.beginPath();
  g.moveTo(400, 180);
  g.lineTo(440, 70);
  g.lineTo(480, 180);
  g.fill();
  g.fillRect(80, 120, 260, 50);
  g.fillRect(250, 70, 90, 50);
  g.fillRect(90, 90, 22, 30);
  g.lineWidth = 12;
  g.strokeStyle = INK;
  g.beginPath();
  g.moveTo(110, 120);
  g.lineTo(40, 60);
  g.stroke();
  for (const x of [120, 210, 300]) {
    g.beginPath();
    g.arc(x, 178, 16, 0, Math.PI * 2);
    g.fill();
  }
}
function drawQuarryHeadPier(g: CanvasRenderingContext2D) {
  g.fillStyle = INK;
  // The quarry: dressed blocks, stacked.
  for (const [x, y] of [
    [24, 160],
    [80, 160],
    [52, 118],
  ] as const)
    g.fillRect(x, y, 50, 36);
  // Far Head: a headland with its lamp.
  g.beginPath();
  g.moveTo(170, 200);
  g.quadraticCurveTo(250, 90, 330, 200);
  g.fill();
  g.fillRect(244, 60, 12, 60);
  g.beginPath();
  g.arc(250, 56, 14, 0, Math.PI * 2);
  g.fill();
  // The pier: a deck on posts over the sea.
  g.fillRect(360, 128, 130, 14);
  for (const x of [372, 410, 448, 480]) g.fillRect(x, 142, 8, 46);
  g.strokeStyle = SEA;
  g.lineWidth = 8;
  for (const y of [190, 210]) {
    g.beginPath();
    for (let x = 352; x <= 500; x += 4) g.lineTo(x, y + Math.sin(x / 9) * 4);
    g.stroke();
  }
}

/** A double-sided plaque, 1.4 x 0.7 m, for `road`. The caller owns the returned geometry and material. */
export function roadPlaque(road: 0 | 1) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, 512, 256);
  g.strokeStyle = INK;
  g.lineWidth = 12;
  g.strokeRect(6, 6, 500, 244);
  if (road === 0) drawCamp(g);
  else drawQuarryHeadPier(g);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshStandardNodeMaterial({ map, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const geometry = new THREE.PlaneGeometry(1.4, 0.7);
  const mesh = new THREE.Mesh(geometry, material);
  return {
    mesh,
    dispose() {
      geometry.dispose();
      map.dispose();
      material.dispose();
    },
  };
}
