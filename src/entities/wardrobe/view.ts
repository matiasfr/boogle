// What you and your partners wear, drawn on each avatar where its bone has got to in its clip. Local presentation of
// ./state.ts: this tab's wardrobe (with what you're trying on) and each partner's validated `wardrobe` presence.
// Fits are Place's (gifts.ts updateWorn): the conductor's hat follows Head rigidly; other hats sit on the head's centre;
// the rest hang from their bone, upright.
// The stowaway (C2) is Place's follower too (gifts.ts updateCritter, updatePartnerPets): it hops along behind you and,
// on a moving deck, sits on the deck right beside you (beside your stool when you sit). Each tab animates its own copy
// of a partner's, from their `stowaway` flag and their already interpolated avatar.
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
// rx, rz: riding, where it is from you; it moves in your frame, so the deck's motion carries it exactly.
type Follow = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  hop: number;
  t: number;
  riding: boolean;
  rx: number;
  rz: number;
};
type Pet = { mesh: THREE.Mesh; at: Follow };
const PET: GiftId = 'critter';
// Place's size. Riding, it sits `side` m to your right on the deck: Buddy's head is wider than his shoulders, so a
// shoulder perch read as a pet on his head (owner, 10 November); out here it clears his body and a stool's top.
const CRIT = { scale: 0.55, side: 0.62 };
const follow = (p: { x: number; y: number; z: number }): Follow => ({
  x: p.x,
  y: p.y - 0.5,
  z: p.z,
  yaw: 0,
  hop: 0,
  t: 0,
  riding: false,
  rx: 0,
  rz: 0,
});
// src/entities/railway/seat.ts stamps `seatedAt` and `seatRise` on a seated avatar each frame: its body is held seatRise m
// above where it would stand on that deck, so the deck under a sitter is that much further down.
const seatedNow = (avatar: THREE.Object3D | null | undefined) =>
  !!avatar && performance.now() - ((avatar.userData.seatedAt as number | undefined) ?? -1e9) < 200;
const seatRise = (avatar: THREE.Object3D | null | undefined) =>
  seatedNow(avatar) ? ((avatar!.userData.seatRise as number | undefined) ?? 0) : 0;
/** A seated avatar's seat: seat.ts draws a bench's rider `seatAhead` m forward of it, the way they face (yaw 0 faces
 * -z), and the stowaway stays on the bench beside the seat. Anyone else: their position. */
const bySeat = (avatar: THREE.Object3D, out: THREE.Vector3) => {
  const ahead = seatedNow(avatar) ? ((avatar.userData.seatAhead as number | undefined) ?? 0) : 0;
  return out.set(
    avatar.position.x + Math.sin(avatar.rotation.y) * ahead,
    avatar.position.y,
    avatar.position.z + Math.cos(avatar.rotation.y) * ahead,
  );
};
const seatAt = new THREE.Vector3(),
  partnerSeatAt = new THREE.Vector3();

/** One frame of Place's follower, behind and beside `p` (facing `yaw`); on a deck it sits beside you on the deck. */
function stepPet(
  dt: number,
  c: Follow,
  mesh: THREE.Mesh,
  p: { x: number; y: number; z: number },
  yaw: number,
  riding: boolean,
  rise = 0,
) {
  // On a train (standing or seated) it sits on the deck at your right side, hopping after you as you walk about the
  // deck: no chasing a train along the ground and through its wheels. It moves in your frame, so the train carries it.
  if (riding) {
    const tx = Math.cos(yaw) * CRIT.side,
      tz = -Math.sin(yaw) * CRIT.side;
    if (!c.riding) {
      c.rx = c.x - p.x;
      c.rz = c.z - p.z;
      // Boarding a moving train leaves it far behind: it hops straight in beside you.
      if (Math.hypot(c.rx - tx, c.rz - tz) > 3) {
        c.rx = tx;
        c.rz = tz;
      }
    }
    c.riding = true;
    const dx = tx - c.rx,
      dz = tz - c.rz,
      d = Math.hypot(dx, dz);
    const moving = d > 0.12;
    if (moving) {
      const sp = Math.min(d * 6, 8) * dt;
      c.rx += (dx / d) * Math.min(sp, d);
      c.rz += (dz / d) * Math.min(sp, d);
    }
    c.t += dt * (moving ? 11 : 2.4);
    c.hop = moving ? Math.abs(Math.sin(c.t)) * 0.25 : Math.max(0, Math.sin(c.t) * 0.02);
    c.x = p.x + c.rx;
    c.z = p.z + c.rz;
    c.y = p.y - 0.5 - rise; // the deck: where your feet would be standing
    c.yaw = yaw + Math.PI;
    poseCritter(mesh, c, moving);
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
  poseCritter(mesh, c, moving);
}
/** Draws the follower where `c` says, squashing as it hops. */
function poseCritter(mesh: THREE.Mesh, c: Follow, moving: boolean) {
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
    import('../../render/part-geometry.ts'),
    import('../../render/fanfare.ts'),
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
      // Seated, the chair draws you on the moving deck's frame (seat.ts drawAtSeat): sit by that, not the body.
      const p = seatedNow(me.avatar) ? bySeat(me.avatar!, seatAt) : body.interpolatedPosition;
      const pet = petOf('self', p);
      stepPet(dt, pet.at, pet.mesh, p, me.yaw, riding, seatRise(me.avatar));
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
      stepPet(dt, view.at, view.mesh, bySeat(avatar, partnerSeatAt), avatar.rotation.y, pet.riding, seatRise(avatar));
    }
    // Sweep partners who left, and anyone whose stowaway went back.
    for (const key of [...pets.keys()]) if (key !== 'self' && !partnerStowaway(key)) dropPet(key);
  }

  return {
    root,
    /** `riding`: you're on a moving deck (your stowaway sits beside you on the deck). */
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
