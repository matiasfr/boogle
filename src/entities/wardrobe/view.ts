// What you and your partners wear, drawn on each avatar where its bone has got to in its clip. Local presentation of
// ./state.ts: this tab's wardrobe (with what you're trying on) and each partner's validated `wardrobe` presence.
// Fits are Place's (gifts.ts updateWorn): the conductor's hat follows Head rigidly; other hats sit on the head's centre;
// the rest hang from their bone, upright.
import * as THREE from 'three/webgpu';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { HAT_SEAT, headCenter, seatConductorHat } from '../../render/head-clearance.ts';
import { WEAR, cosmetic, type GiftId } from '../../render/cosmetic-parts.ts';
import { T1_REWARD } from '../../render/t1-reward-parts.ts';
import { CLOTHES_SLOTS, partnerWearing, type ClothesSlot, type WardrobeApi, type Worn } from './state.ts';

type Dressed = { avatar: THREE.Object3D | null; items: Map<ClothesSlot, { id: GiftId; mesh: THREE.Mesh }> };
const SOUND: Partial<Record<string, [number, number]>> = {
  try: [4, 0.5],
  wear: [5, 0.5],
  off: [2, 0.5],
};

export async function createWardrobeView(wardrobe: WardrobeApi) {
  const [{ merged }, { pop }] = await Promise.all([
    import('../../proto/place/part-geometry.ts'),
    import('../../proto/minis/common.ts'),
  ]);
  const giftMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 });
  const clothMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.92 });
  const geos = new Map<GiftId, THREE.BufferGeometry>();
  const geoOf = (id: GiftId) => {
    let g = geos.get(id);
    if (!g) {
      geos.set(id, (g = merged(cosmetic(id)!.parts)));
      g.computeBoundingBox();
    }
    return g;
  };
  const dressed = new Map<string, Dressed>();

  // The same feedback as Place's: a pop as it goes on or comes off. A swap to nothing is the quiet one.
  const offEvents = wardrobe.onWardrobe((e) => {
    const kind = e.kind === 'swap' ? (e.id ? 'wear' : 'off') : e.kind;
    const sound = SOUND[kind];
    if (sound) pop(...sound);
  });

  function strip(entry: Dressed) {
    for (const { mesh } of entry.items.values()) mesh.removeFromParent();
    entry.items.clear();
  }
  function dress(key: string, avatar: THREE.Object3D | null | undefined, worn: Worn | null) {
    let entry = dressed.get(key);
    if (!entry) dressed.set(key, (entry = { avatar: null, items: new Map() }));
    if (entry.avatar !== (avatar ?? null)) {
      strip(entry);
      entry.avatar = avatar ?? null;
    }
    if (!avatar) return;
    for (const slot of CLOTHES_SLOTS) {
      const id = worn?.[slot] as GiftId | undefined;
      const had = entry.items.get(slot);
      if (had && had.id !== id) {
        had.mesh.removeFromParent();
        entry.items.delete(slot);
      }
      if (!id || entry.items.has(slot)) continue;
      const mesh = new THREE.Mesh(geoOf(id), slot === 'outfit' ? clothMat : giftMat);
      mesh.castShadow = true;
      mesh.scale.setScalar(WEAR[id]!.scale);
      mesh.rotation.y = Math.PI;
      if (slot === 'hat') mesh.name = 'wear_place_hat';
      avatar.add(mesh);
      entry.items.set(slot, { id, mesh });
    }
    fit(avatar, entry);
  }
  /** In the avatar's own space, so a fast train can't leave it a frame behind. */
  function fit(avatar: THREE.Object3D, entry: Dressed) {
    avatar.updateWorldMatrix(true, false);
    for (const { id, mesh } of entry.items.values()) {
      const w = WEAR[id]!;
      if (id === T1_REWARD.id) {
        seatConductorHat(avatar, mesh);
        continue;
      }
      if (cosmetic(id)!.slot === 'hat') {
        avatar.worldToLocal(headCenter(avatar, mesh.position));
        // Enclosing shells (beanies, helmets) keep their authored seating depth; shallow brims clear the forehead.
        const seat = mesh.geometry.boundingBox!.min.y < -0.02 ? w.y : Math.max(HAT_SEAT, w.y);
        mesh.position.y += seat - 0.24;
        mesh.position.z += w.z;
        continue;
      }
      const bone = avatar.getObjectByName(w.bone);
      if (bone) avatar.worldToLocal(bone.getWorldPosition(mesh.position));
      else mesh.position.set(0, 0.9, 0);
      mesh.position.y += w.y;
      mesh.position.z += w.z;
    }
  }

  return {
    lateUpdate() {
      dress('self', me.avatar, wardrobe.wearing());
      for (const remote of remotes.values())
        dress(remote.peer, remote.entered ? remote.avatar : null, partnerWearing(remote.peer));
      // Sweep partners who left (onPeerRemoved clears their presence; their meshes go here).
      for (const [key, entry] of dressed)
        if (key !== 'self' && !remotes.has(key)) {
          strip(entry);
          dressed.delete(key);
        }
    },
    inspect: () => ({
      dressed: [...dressed].map(([key, entry]) => ({
        who: key,
        items: [...entry.items.values()].map((item) => item.id),
      })),
    }),
    dispose() {
      offEvents();
      for (const entry of dressed.values()) strip(entry);
      dressed.clear();
      for (const g of geos.values()) g.dispose();
      giftMat.dispose();
      clothMat.dispose();
    },
  };
}
export type WardrobeView = Awaited<ReturnType<typeof createWardrobeView>>;
