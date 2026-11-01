// The jointed hero (assets/src/hero-rig.py, built by `npm run assets`): load it once, make as many as needed. Each one
// is a clone sharing geometry and the shared materials, with its own body material in the player's colour, its own
// outfit and its own bones to pose. Used by the hero prototypes (src/features/proto-hero-rig.ts, the hero standing in
// ?proto=assets, and src/features/proto-hero.ts, playing as it). Lazy: import it with import().
//
// Looks are picked from the URL, the same for every hero in the tab:
//   &eyes=bead|googly|flat      eye style ("Face" in hero-rig.py; bead, the owner's pick, by default)
//   &shade=clay|matte|plastic   the body's shading (below; clay by default)
//   &hero=bare|work|castaway    outfit (bare by default; the standing hero in ?proto=assets starts in work)
import * as THREE from 'three/webgpu';
import { color, float, materialColor, normalView, positionViewDirection, vec3 } from 'three/tsl';
import { patchNode } from '../render/material-patch.ts';
import { loadAsset } from '../render/assets.ts';
import rigUrl from '../../assets/built/hero-rig.glb?url';
import castawayUrl from '../../assets/built/hero-outfit-castaway.glb?url';

export const OUTFITS = ['bare', 'work', 'castaway'] as const;
export type Outfit = (typeof OUTFITS)[number];
const EYES = ['bead', 'googly', 'flat'] as const;
const SHADES = ['clay', 'matte', 'plastic'] as const; // the first of each list is the default
const q = new URLSearchParams(location.search);
export const pick = <T extends string>(list: readonly T[], key: string) => {
  const v = q.get(key) as T | null;
  return v && list.includes(v) ? v : list[0];
};
export const eyes = pick(EYES, 'eyes');
const shade = pick(SHADES, 'shade');

/** The bones code poses, by name (hero-rig.py, "Rig conventions"). */
export const BONES = [
  'root',
  'hips',
  'body',
  'arm_l',
  'arm_r',
  'forearm_l',
  'forearm_r',
  'hand_l',
  'hand_r',
  'thigh_l',
  'thigh_r',
  'shin_l',
  'shin_r',
  'foot_l',
  'foot_r',
] as const;
export type BoneName = (typeof BONES)[number];

export type Hero = {
  /** A group at the origin holding the figure; its feet are on y = 0 and it faces -Z. */
  holder: THREE.Group;
  bones: Record<BoneName, THREE.Object3D>;
  /** The body's own material: the player's colour. */
  mat: THREE.MeshStandardNodeMaterial;
  /** The visible eye style's pupils (they look at things) and every part of it (blinks squash them). */
  pupils: THREE.Object3D[];
  eyeParts: THREE.Object3D[];
  outfit: Outfit;
  dress(o: Outfit): void;
  wave: THREE.AnimationClip;
};

// Shading. Every hero gets a cool rim of sky light, the soft edge the previz renders have and the game's lighting
// lacks: (1 - N.V)^p, so it shows only where a surface turns away from the camera. The body then differs:
// - matte: as exported (roughness 0.5).
// - plastic: glossy vinyl (Astro Bot): roughness 0.22 for a tight highlight, a stronger, sharper rim.
// - clay: soft and chalky (Fall Guys' fuzzy jelly): roughness 0.9, shade lifted by a little of its own colour, and a
//   warm edge, as if light scattered through it.
// Eye whites glow a little too: warm sun and grading tint them peach (eggs, not eyes).
function shadeOnce(root: THREE.Object3D) {
  const edge = float(1).sub(normalView.dot(positionViewDirection).saturate());
  const rim = edge
    .pow(shade === 'plastic' ? 2.5 : 3)
    .mul(color('#cfe6ff'))
    .mul(shade === 'plastic' ? 0.6 : 0.45);
  // Materials are told apart by a mesh that wears them (glTF material names don't survive every loader step).
  const matOf = (name: string) => (root.getObjectByName(name) as THREE.Mesh | undefined)?.material;
  const eye = matOf('eyes_googly_white_l_part'),
    body = matOf('body_part');
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardNodeMaterial | undefined;
    if (!m || seen.has(m)) return;
    seen.add(m);
    patchNode(m, 'emissiveNode', (prev) => (prev ?? vec3(0)).add(rim));
    if (m === eye) patchNode(m, 'emissiveNode', (prev) => prev.add(vec3(0.35)));
    if (m !== body) return;
    if (shade === 'plastic') m.roughness = 0.22;
    if (shade === 'clay') {
      m.roughness = 0.9;
      patchNode(m, 'emissiveNode', (prev) =>
        prev.add(materialColor.mul(0.12)).add(edge.pow(2).mul(color('#ffb48a')).mul(0.22)),
      );
    }
  });
}

export type HeroKit = { make(hex: THREE.ColorRepresentation, outfit?: Outfit): Hero };

let kit: Promise<HeroKit> | null = null;
export function loadHeroKit(): Promise<HeroKit> {
  return (kit ??= (async () => {
    const [rig, castaway] = await Promise.all([loadAsset(rigUrl), loadAsset(castawayUrl)]);
    shadeOnce(rig.gltf.scene);
    shadeOnce(castaway.gltf.scene);
    const wave = rig.clip('wave');
    return {
      make(hex, start = pick(OUTFITS, 'hero')) {
        const holder = rig.instance('hero');
        const root = holder.children[0];
        const find = (n: string) => {
          const b = root.getObjectByName(n);
          if (!b) throw new Error('hero: no node ' + n);
          return b;
        };
        const bones = Object.fromEntries(BONES.map((n) => [n, find(n)])) as Record<BoneName, THREE.Object3D>;

        // The body material, cloned so this hero has its own colour; every part that wore the shared one swaps.
        const shared = (find('body_part') as THREE.Mesh).material as THREE.MeshStandardNodeMaterial;
        const mat = shared.clone();
        mat.color.set(hex);
        root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && m.material === shared) m.material = mat;
        });

        // Outfits. Clothes are separate parts (`wear_<slot>_<item>_...`) over a complete bare figure. The work outfit
        // comes in the hero's own file; another outfit's file has the same armature, so each of its wear_ parts moves
        // onto this hero's bone of the same name, keeping its transform (the rest poses match). Clothes win over the
        // body: a head item hides the top of the head, a feet item the bare feet, so nothing pokes through.
        const wear = (from: THREE.Object3D) => {
          const parts: THREE.Object3D[] = [];
          from.traverse((o) => {
            if (o.name.startsWith('wear_')) parts.push(o);
          });
          return parts;
        };
        const outfits: Record<Outfit, THREE.Object3D[]> = { bare: [], work: wear(root), castaway: [] };
        for (const part of wear(castaway.instance())) {
          find(part.parent!.name).add(part);
          outfits.castaway.push(part);
        }
        const covers = { head: [find('crown_part')], feet: ['foot_l_part', 'foot_r_part'].map(find) };

        // Eye styles: one shows.
        const pupils: THREE.Object3D[] = [];
        const eyeParts: THREE.Object3D[] = [];
        root.traverse((o) => {
          if (!o.name.startsWith('eyes_')) return;
          o.visible = o.name.startsWith(`eyes_${eyes}_`);
          if (!o.visible) return;
          if (!o.name.includes('_blush_')) eyeParts.push(o);
          if (o.name.includes('_pupil_')) pupils.push(o);
        });

        const hero: Hero = {
          holder,
          bones,
          mat,
          pupils,
          eyeParts,
          outfit: start,
          wave,
          dress(name) {
            hero.outfit = name;
            for (const parts of Object.values(outfits)) for (const p of parts) p.visible = false;
            for (const p of outfits[name]) p.visible = true;
            for (const [slot, regions] of Object.entries(covers)) {
              const worn = outfits[name].some((p) => p.name.startsWith(`wear_${slot}_`));
              for (const r of regions) r.visible = !worn;
            }
          },
        };
        hero.dress(start);
        return hero;
      },
    };
  })());
}
