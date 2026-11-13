// Ring Island's far leaf: the raised orange leaf and the hinge pier it turns on, drawn from far away (docs/plans/
// ring-island-build1.md R2c). Local scenery, no state. Two draws; the pennant on its own pole is a third and the pole's
// footing a fourth, behind POLE_PENNANT.
import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createOwnedView } from '../../render/owned-view.ts';
import { camera } from '../../render/scene.ts';
import { smoothstep } from '../../math.ts';
import { RING_GAP, RING_FORMATION, ringAt, ringDeckY } from '../../sim/railway-ring-layout.ts';

/** Call 20: a cream pennant so the raised leaf reads from Home (the step 0 measure: the leaf alone is 8 px from Home's
 * summit at phone size). It stands on its own fixed pole beside the hinge pier, not on the leaf: the owner, 11 November
 * ("on it's own pole"), after the leaf's toe flag swept the railhead deck and the camera. */
export const POLE_PENNANT = true;

/** Where the pennant pole stands, and its size: ONE definition, the near view (ring-island/view.ts) and this far view
 * both read it. (u, lat) in metres on the line's frame, 4 m island-side of the hinge edge (u 277) and 1.8 m outboard of
 * the Way's left edge (lat -5.8), out over the sea, so it clears the leaf's whole swing (the leaf lies at u <= 278.4
 * counting its girders), the deck, both lanes and the railhead; the flag flies outboard (toward -lat), broadside to Home. */
export const PENNANT_POLE = {
  u: 282,
  lat: -7.8,
  /** Mast height above the deck top at u. */
  mast: 26,
  /** The flag: 10 m out from the mast, 5 m tall, its top at the mast top. */
  flag: { len: 10, tall: 5 },
  mastThick: 0.4,
  /** The footing: a pile from the sea (y -6) up to a plinth whose top is 0.2 m over the deck top. */
  pile: 1.6,
  plinth: 2.4,
  plinthDeck: [-0.6, 0.2],
  pileBottom: -6,
} as const;

/** The mast and flag in the line's frame (x lat, y up, z toward Home), origin at the deck top below the mast. */
export function pennantGeometry() {
  const { mast, flag, mastThick } = PENNANT_POLE;
  const pole = new THREE.BoxGeometry(mastThick, mast, mastThick).translate(0, mast / 2, 0);
  const cloth = new THREE.ShapeGeometry(
    new THREE.Shape([
      new THREE.Vector2(0, 0),
      new THREE.Vector2(-flag.len, flag.tall / 2),
      new THREE.Vector2(0, flag.tall),
    ]),
  ).translate(0, mast - flag.tall, 0);
  pole.deleteAttribute('uv');
  cloth.deleteAttribute('uv');
  const merged = mergeGeometries([pole, cloth])!;
  pole.dispose();
  cloth.dispose();
  return merged;
}

/** The footing's two blocks as (u, lat, y) spans in metres, y absolute, for the deck top `deckTop` at the pole's u. */
export function pennantFooting(deckTop: number) {
  const { u, lat, pile, plinth, plinthDeck, pileBottom } = PENNANT_POLE;
  const span = (w: number, y0: number, y1: number) => ({
    u0: u - w / 2,
    u1: u + w / 2,
    lat0: lat - w / 2,
    lat1: lat + w / 2,
    y0,
    y1,
  });
  return [
    span(pile, pileBottom, deckTop + plinthDeck[0]),
    span(plinth, deckTop + plinthDeck[0], deckTop + plinthDeck[1]),
  ];
}

/** The leaf's colours: the near view's own orange (R2b imports this one so the swap doesn't pop), and the readable-glow
 * orange it brightens to with distance. */
export const LEAF_ORANGE = '#e0701c';
const GLOW_ORANGE = '#ff8a1f';
export const PENNANT_CREAM = '#fff0c9';
/** The glow is off by FADE.from (the near view's mount distance, m) and full by FADE.to. At the near view's unmount
 * distance (650 m) the leaf is therefore partly glowing: a small colour step when the far leaf takes over again. */
const FADE = { from: 500, to: 900, glow: 0.9 } as const;
/** The raised leaf's angle, degrees up. R2b's `ringIslandPose.leaf` replaces this when it lands (it is not on main). */
const LEAF_UP_DEG = 78;

const LEAF = { width: 7.6, length: RING_GAP.leaf / 100, thick: 0.5 };
const PIER = { width: 8.6, length: 5, bottom: -6 };

const m = (cm: number) => cm / 100;
const hinge = ringAt(RING_GAP.hinge, RING_FORMATION.mid);
/** The hinge edge's u and the formation's middle lat, metres: the root's origin in the line's frame. */
const hingeU = m(RING_GAP.hinge),
  FORM_MID = m(RING_FORMATION.mid);
const deckTop = m(ringDeckY(RING_GAP.hinge));

/** The seam to the near view (R2b's `src/entities/ring-island/`): until it registers, the near view is never mounted and
 * the far leaf is always drawn. The near view calls `setNearViewMounted(() => <its meshes are mounted>)` once (and
 * `setNearViewMounted(null)` on dispose); it owns the mount distances (500 m in, 650 m out) and their hysteresis. */
let nearViewMounted: () => boolean = () => false;
export function setNearViewMounted(isMounted: (() => boolean) | null) {
  nearViewMounted = isMounted ?? (() => false);
}

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
  if (POLE_PENNANT) {
    // The pennant on its own pole in the root's frame (x across from the formation's middle, z toward Home from the
    // hinge edge), not in the pivot: it does not turn with the leaf. The footing is the pier's grey.
    const { u, lat } = PENNANT_POLE;
    const deck = m(ringDeckY(Math.round(u * 100)));
    const at = new THREE.Vector3(lat - FORM_MID, 0, hingeU - u);
    pennantMaterial = new THREE.MeshStandardNodeMaterial({
      color: PENNANT_CREAM,
      emissive: PENNANT_CREAM,
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide,
    });
    const pennant = new THREE.Mesh(pennantGeometry(), pennantMaterial);
    pennant.name = 'Ring Island far leaf pennant';
    pennant.position.set(at.x, deck, at.z);
    const blocks = pennantFooting(deck).map((f) =>
      new THREE.BoxGeometry(f.lat1 - f.lat0, f.y1 - f.y0, f.u1 - f.u0).translate(
        (f.lat0 + f.lat1) / 2 - FORM_MID,
        (f.y0 + f.y1) / 2,
        hingeU - (f.u0 + f.u1) / 2,
      ),
    );
    const footing = new THREE.Mesh(mergeGeometries(blocks)!, pierMaterial);
    footing.name = 'Ring Island far leaf pennant footing';
    blocks.forEach((g) => g.dispose());
    root.add(pennant, footing);
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
      const g = smoothstep(FADE.from, FADE.to, Math.hypot(x - m(hinge.x), z - m(hinge.z)));
      leafMaterial.color.copy(near).lerp(glow, g);
      leafMaterial.emissiveIntensity = g * FADE.glow;
    },
    inspect: () => ({ nearViewMounted: mounted, visible: root.visible, pennant: POLE_PENNANT, leafDeg: LEAF_UP_DEG }),
    dispose() {
      leafMaterial.dispose();
      pierMaterial.dispose();
      pennantMaterial?.dispose();
      owner.dispose();
    },
  };
}
