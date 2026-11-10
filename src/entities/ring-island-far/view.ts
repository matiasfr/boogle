// Ring Island's far leaf: the raised orange leaf and the hinge pier it turns on, drawn from far away (docs/plans/
// ring-island-build1.md R2c). Local scenery, no state. Two draws; the toe pennant is a third, behind TOE_PENNANT.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createOwnedView } from '../../render/owned-view.ts';
import { camera } from '../../render/scene.ts';
import { RING_GAP, RING_FORMATION, ringAt, ringDeckY } from '../../sim/railway-ring-layout.ts';

/** Call 20: a cream pennant on the leaf's toe, drawn only if the proof look of the leaf alone fails at Home. Off until
 * the designer and owner pick (the step 0 measure: the raised leaf is 8 px from Home's summit at phone size). */
export const TOE_PENNANT = true;

/** The leaf's colours: the near view's own orange (R2b imports this one so the swap doesn't pop), and the readable-glow
 * orange it brightens to with distance. */
export const LEAF_ORANGE = '#e0701c';
const GLOW_ORANGE = '#ff8a1f';
const PENNANT = '#fff0c9';
/** The glow is off by FADE.from (the near view's mount distance, m) and full by FADE.to. At the near view's unmount
 * distance (650 m) the leaf is therefore partly glowing: a small colour step when the far leaf takes over again. */
const FADE = { from: 500, to: 900, glow: 0.9 } as const;
/** The raised leaf's angle, degrees up. R2b's `ringIslandPose.leaf` replaces this when it lands (it is not on main). */
const LEAF_UP_DEG = 78;

const LEAF = { width: 7.6, length: RING_GAP.leaf / 100, thick: 0.5 };
const PIER = { width: 8.6, length: 5, bottom: -6 };

const m = (cm: number) => cm / 100;
const hinge = ringAt(RING_GAP.hinge, RING_FORMATION.mid);
const deckTop = m(ringDeckY(RING_GAP.hinge));

/** The seam to the near view (R2b's `src/entities/ring-island/`): until it registers, the near view is never mounted and
 * the far leaf is always drawn. The near view calls `setNearViewMounted(() => <its meshes are mounted>)` once (and
 * `setNearViewMounted(null)` on dispose); it owns the mount distances (500 m in, 650 m out) and their hysteresis. */
let nearViewMounted: () => boolean = () => false;
export function setNearViewMounted(isMounted: (() => boolean) | null) {
  nearViewMounted = isMounted ?? (() => false);
}

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function createRingIslandFarView() {
  const owner = createOwnedView();
  // The line's frame: X across it (lat), Y up, Z back toward home (falling u), so the lowered leaf lies along +Z.
  const along = new THREE.Vector3(-0.0272, 0, 1).normalize(),
    across = new THREE.Vector3(1, 0, 0.0272).normalize();
  const root = new THREE.Group();
  root.matrixAutoUpdate = false;
  root.matrix.makeBasis(across, new THREE.Vector3(0, 1, 0), along).setPosition(m(hinge.x), 0, m(hinge.z));

  const leafMaterial = new THREE.MeshStandardNodeMaterial({
    color: LEAF_ORANGE,
    emissive: GLOW_ORANGE,
    emissiveIntensity: 0,
    roughness: 0.7,
  });
  const pierMaterial = new THREE.MeshStandardNodeMaterial({ color: '#8f8a80', roughness: 0.95, flatShading: true });

  // The leaf turns about its hinge edge at the deck's top: its plate lies from the hinge back along +Z, top flush.
  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(LEAF.width, LEAF.thick, LEAF.length).translate(0, -LEAF.thick / 2, LEAF.length / 2),
    leafMaterial,
  );
  leaf.name = 'Ring Island far leaf';
  const pivot = new THREE.Group();
  pivot.position.y = deckTop;
  pivot.rotation.x = -(LEAF_UP_DEG * Math.PI) / 180;
  pivot.add(leaf);

  const pierHeight = deckTop - LEAF.thick - PIER.bottom;
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(PIER.width, pierHeight, PIER.length).translate(
      0,
      PIER.bottom + pierHeight / 2,
      -PIER.length / 2,
    ),
    pierMaterial,
  );
  pier.name = 'Ring Island far leaf pier';
  root.add(pivot, pier);

  let pennantMaterial: THREE.MeshStandardNodeMaterial | null = null;
  if (TOE_PENNANT) {
    // A mast beyond the toe and a broadside flag on it, one geometry in the leaf's frame so it rides the leaf.
    const top = LEAF.length + 12;
    const mast = new THREE.BoxGeometry(0.4, 0.4, 12).translate(0, 0, LEAF.length + 6);
    const flag = new THREE.ShapeGeometry(
      new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(10, 2.5), new THREE.Vector2(0, 5)]),
    )
      .rotateX(Math.PI / 2)
      .translate(0, 0, top - 5);
    const merged = mergeGeometries([mast, flag])!;
    mast.dispose();
    flag.dispose();
    pennantMaterial = new THREE.MeshStandardNodeMaterial({
      color: PENNANT,
      emissive: PENNANT,
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide,
    });
    const pennant = new THREE.Mesh(merged, pennantMaterial);
    pennant.name = 'Ring Island far leaf pennant';
    pivot.add(pennant);
  }

  const near = new THREE.Color(LEAF_ORANGE),
    glow = new THREE.Color(GLOW_ORANGE);
  let mounted = false;
  root.visible = false;
  owner.add(root);

  return {
    root: owner.root,
    update() {
      const { x, z } = camera.position;
      mounted = nearViewMounted();
      root.visible = !mounted;
      if (mounted) return;
      const g = smooth(FADE.from, FADE.to, Math.hypot(x - m(hinge.x), z - m(hinge.z)));
      leafMaterial.color.copy(near).lerp(glow, g);
      leafMaterial.emissiveIntensity = g * FADE.glow;
    },
    inspect: () => ({ nearViewMounted: mounted, visible: root.visible, pennant: TOE_PENNANT, leafDeg: LEAF_UP_DEG }),
    dispose() {
      leafMaterial.dispose();
      pierMaterial.dispose();
      pennantMaterial?.dispose();
      owner.dispose();
    },
  };
}
