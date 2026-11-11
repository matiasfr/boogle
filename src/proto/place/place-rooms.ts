// ?proto=place's rooms (./rooms.ts), mounted once on a never-disposed owner, so the Place modules that read them at load
// (./house.ts via ./town-life.ts, ./shop.ts, ./museum.ts, ./residents.ts, ./town.ts) keep one instance. The live game
// mounts its own in src/entities/town/. Goes with Place in place-retirement D1.
import { createOwnedView } from '../../render/owned-view.ts';
import { scene } from '../../render/scene.ts';
import { createRooms } from './rooms.ts';
import type { RoomId } from '../../place/layout.ts';

export {
  DOOR,
  ROOM_CAM,
  addSolid,
  plankFloor,
  plate,
  roomMesh,
  roomToWorld,
  worldToRoom,
  type Part,
  type Room,
} from './rooms.ts';

const owner = createOwnedView();
scene.add(owner.root);
/** Which rooms stand. Set by ./town-life.ts from what's shared; the house is there from the start. */
export const roomEnv: { up: (id: RoomId) => boolean } = { up: (id) => id === 'house' };
export const placeRooms = createRooms(owner, { up: (id) => roomEnv.up(id) });
export const { rooms, indoors, onRoom, indoorCamera, stakeBoard } = placeRooms;
export const updateRooms = (dt: number) => {
  placeRooms.update(dt);
  placeRooms.cull();
};
export const warmRooms = placeRooms.warm;
export const snapRooms = placeRooms.snap;
/** The owner, for ./town-life.ts's house. */
export const placeRoomsOwner = owner;
