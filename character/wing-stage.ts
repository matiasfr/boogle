// Inspection stage for the track-layer wing: the real shell (dressed, its hand posed) with the wing mounted on its
// header, the gap between the flatbed and the up track swept folded to open and back, both hands on the machine's own
// panel cycle. The inputs are synthetic (not game timing); the poses come from machine-wing.ts and machine-panels.ts.
import * as THREE from 'three/webgpu';
import { dressMachine } from '../src/entities/railway/machine-model.ts';
import { WING, panelMechanism } from '../src/entities/railway/machine-panels.ts';
import { buildWing } from '../src/entities/railway/machine-wing.ts';
import { carriedPiece, MAX_PANEL_LENGTH } from '../src/entities/railway/track-panels.ts';

/** One review loop: parked folded, opening, open, closing, folded. */
export const WING_REVIEW_SECONDS = 12;
const CYCLE = 2.866667;
/** Gap (m) between the flatbed and the up track at review time `t`. */
export const wingReviewGap = (t: number) => {
  const u = ((t % WING_REVIEW_SECONDS) + WING_REVIEW_SECONDS) % WING_REVIEW_SECONDS;
  return 4 * (u < 1 ? 0 : u < 5 ? (u - 1) / 4 : u < 7 ? 1 : u < 11 ? 1 - (u - 7) / 4 : 0);
};

export function wingStage(wingScene: THREE.Object3D, shellScene: THREE.Object3D) {
  const group = new THREE.Group();
  const rail = new THREE.BoxGeometry(0.1, 0.12, 3.05).translate(0, 0.06, 0);
  const steel = new THREE.MeshStandardNodeMaterial({ color: '#4c5058', roughness: 0.45, metalness: 0.6 });
  const batch = (n: number) => new THREE.InstancedMesh(rail, steel, n);
  const shell = shellScene.clone(true);
  const shellFinish = dressMachine(shell);
  group.add(shell);
  const down = panelMechanism(shell, batch);
  const parts = new Map<string, THREE.Object3D>();
  shell.traverse((part) => {
    if (part.name.startsWith('lay_')) parts.set(part.name, part);
  });
  down.install(parts);
  const wing = buildWing(group, batch);
  wing.install(wingScene);
  const length = MAX_PANEL_LENGTH,
    piece = carriedPiece(length);
  const lengths = Array<number>(12).fill(length);
  down.drawStack(12, lengths, true);
  wing.mech.drawStack(12, lengths, true);
  const seat = new THREE.Vector3(),
    start = new THREE.Vector3();
  return {
    group,
    seek(t: number) {
      const gap = wingReviewGap(t),
        phase = (t % CYCLE) / CYCLE,
        back = 16.733333 - phase * length;
      wing.place(1, gap);
      seat.set(0, 0.1, piece.centre + back);
      start.set(0, 0.1, 1.5 + back);
      down.pose(phase, 12, seat, 0, 0, start, piece.length);
      if (gap >= WING.set) {
        // The up track runs under the post: the same seat, seen from the post's frame.
        seat.z -= WING.postZ;
        start.z -= WING.postZ;
        wing.mech.pose(phase, 12, seat, 0, 0, start, piece.length);
      } else wing.mech.home(1, 12);
    },
    dispose() {
      shellFinish.dispose();
      wing.dispose();
      steel.dispose();
      rail.dispose();
    },
  };
}
