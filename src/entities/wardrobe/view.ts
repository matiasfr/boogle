// What you and your partners wear, drawn on each avatar where its bone has got to in its clip. Local presentation of
// ./state.ts: this tab's wardrobe (with what you're trying on) and each partner's validated `wardrobe` presence.
// Fits are Place's (gifts.ts updateWorn): the conductor's hat follows Head rigidly; other hats sit on the head's centre;
// the rest hang from their bone, upright.
// The stowaway (C2) is Place's follower too (gifts.ts updateCritter, updatePartnerPets): it hops along behind you and,
// on a moving deck, up onto your shoulder. Each tab animates its own copy of a partner's, from their `stowaway` flag and
// their already interpolated avatar.
import * as THREE from 'three/webgpu';
import type { FrameCtx } from '../../loop.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { HAT_SEAT, headCenter, seatConductorHat } from '../../render/head-clearance.ts';
import { WEAR, cosmetic, type GiftId } from '../../render/cosmetic-parts.ts';
import { T1_REWARD } from '../../render/t1-reward-parts.ts';
import {
  CLOTHES_SLOTS,
  partnerStowaway,
  partnerWearing,
  type ClothesSlot,
  type WardrobeApi,
  type Worn,
} from './state.ts';

type Dressed = { avatar: THREE.Object3D | null; items: Map<ClothesSlot, { id: GiftId; mesh: THREE.Mesh }> };
type Follow = { x: number; y: number; z: number; yaw: number; hop: number; t: number; riding: boolean };
type Pet = { mesh: THREE.Mesh; at: Follow };
const PET: GiftId = 'critter';
// Place's: small; and smaller up on your shoulder, riding.
const CRIT = { scale: 0.55, shoulderScale: 0.42, side: 0.3, up: 0.78 };
const follow = (p: { x: number; y: number; z: number }): Follow => ({
  x: p.x,
  y: p.y - 0.5,
  z: p.z,
  yaw: 0,
  hop: 0,
  t: 0,
  riding: false,
});

/** One frame of Place's follower, behind and beside `p` (facing `yaw`); on a deck it hops up to the shoulder. */
function stepPet(
  dt: number,
  c: Follow,
  mesh: THREE.Mesh,
  p: { x: number; y: number; z: number },
  yaw: number,
  riding: boolean,
) {
  // On a train it hops up onto your shoulder and stays small: no chasing a train along the ground and through its wheels.
  if (riding) {
    const sx = p.x + Math.cos(yaw) * CRIT.side,
      sz = p.z - Math.sin(yaw) * CRIT.side,
      sy = p.y + CRIT.up;
    if (!c.riding) c.t = 0;
    c.riding = true;
    c.t = Math.min(1, c.t + dt / 0.28); // the hop up
    const u = c.t;
    c.x += (sx - c.x) * u;
    c.z += (sz - c.z) * u;
    c.y += (sy - c.y) * u;
    c.yaw = yaw + Math.PI;
    mesh.position.set(c.x, c.y + (u < 1 ? Math.sin(u * Math.PI) * 0.7 : 0), c.z);
    mesh.rotation.y = c.yaw;
    mesh.scale.setScalar(CRIT.shoulderScale);
    return;
  }
  c.riding = false;
  const bx = p.x + Math.sin(yaw) * 1.1 + Math.cos(yaw) * 0.7,
    bz = p.z + Math.cos(yaw) * 1.1 - Math.sin(yaw) * 0.7;
  const dx = bx - c.x,
    dz = bz - c.z,
    d = Math.hypot(dx, dz);
  if (d > 24) {
    c.x = bx;
    c.z = bz;
    c.y = p.y - 0.5;
  }
  const moving = d > 0.5;
  if (moving) {
    const sp = Math.min(d * 3.2, 14);
    c.x += (dx / d) * sp * dt;
    c.z += (dz / d) * sp * dt;
    c.yaw = Math.atan2(dx, dz);
  }
  c.t += dt * (moving ? 11 : 2.4);
  c.hop = moving ? Math.abs(Math.sin(c.t)) * 0.36 : Math.max(0, Math.sin(c.t) * 0.02);
  c.y += (p.y - 0.5 - c.y) * Math.min(1, dt * 10);
  mesh.position.set(c.x, c.y + c.hop, c.z);
  mesh.rotation.y = c.yaw;
  const sq = 1 + (moving ? 0.1 * Math.cos(c.t * 2) : 0.03 * Math.sin(c.t));
  mesh.scale.set(CRIT.scale / sq, CRIT.scale * sq, CRIT.scale / sq);
}
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
  // The stowaways, yours and each partner's, in world space: the entity's mesh (./index.ts adds it).
  const root = new THREE.Group();
  root.name = 'wardrobe-stowaways';
  const pets = new Map<string, Pet>();
  function petOf(key: string, from: { x: number; y: number; z: number }) {
    let pet = pets.get(key);
    if (!pet) {
      // First appearance starts beside its owner, as a reveal's does in Place.
      const mesh = new THREE.Mesh(geoOf(PET), giftMat);
      mesh.name = 'place-pet';
      mesh.castShadow = true;
      root.add(mesh);
      pets.set(key, (pet = { mesh, at: follow(from) }));
    }
    return pet;
  }
  function dropPet(key: string) {
    pets.get(key)?.mesh.removeFromParent(); // the geometry and material are the view's, not this pet's
    pets.delete(key);
  }

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

  function walkPets(dt: number, riding: boolean) {
    const body = me.body;
    if (wardrobe.pet() === PET && body) {
      const p = body.interpolatedPosition;
      stepPet(dt, petOf('self', p).at, pets.get('self')!.mesh, p, me.yaw, riding);
    } else dropPet('self');
    for (const remote of remotes.values()) {
      const pet = partnerStowaway(remote.peer);
      const avatar = remote.avatar;
      if (!pet || !remote.entered || !avatar) {
        dropPet(remote.peer);
        continue;
      }
      const view = petOf(remote.peer, avatar.position);
      view.mesh.visible = avatar.visible;
      stepPet(dt, view.at, view.mesh, avatar.position, avatar.rotation.y, pet.riding);
    }
    // Sweep partners who left, and anyone whose stowaway went back.
    for (const key of [...pets.keys()]) if (key !== 'self' && !partnerStowaway(key)) dropPet(key);
  }

  return {
    root,
    /** `riding`: you're on a moving deck (your stowaway rides on your shoulder). */
    lateUpdate(ctx: FrameCtx, riding: boolean) {
      dress('self', me.avatar, wardrobe.wearing());
      for (const remote of remotes.values())
        dress(remote.peer, remote.entered ? remote.avatar : null, partnerWearing(remote.peer));
      // Sweep partners who left (onPeerRemoved clears their presence; their meshes go here).
      for (const [key, entry] of dressed)
        if (key !== 'self' && !remotes.has(key)) {
          strip(entry);
          dressed.delete(key);
        }
      walkPets(Math.min(ctx.dt, 0.1), riding);
    },
    inspect: () => ({
      dressed: [...dressed].map(([key, entry]) => ({
        who: key,
        items: [...entry.items.values()].map((item) => item.id),
      })),
      stowaways: [...pets].map(([key, pet]) => ({
        who: key,
        riding: pet.at.riding,
        x: pet.mesh.position.x,
        y: pet.mesh.position.y,
        z: pet.mesh.position.z,
        visible: pet.mesh.visible,
      })),
    }),
    dispose() {
      offEvents();
      for (const key of [...pets.keys()]) dropPet(key);
      for (const entry of dressed.values()) strip(entry);
      dressed.clear();
      for (const g of geos.values()) g.dispose();
      giftMat.dispose();
      clothMat.dispose();
    },
  };
}
export type WardrobeView = Awaited<ReturnType<typeof createWardrobeView>>;
