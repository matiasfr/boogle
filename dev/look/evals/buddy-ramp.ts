// Authored comparison fixture, not a bot success or production gameplay state.
await import('/dev/look/evals/place-job.ts' as string);
const q = new URLSearchParams(location.search);
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { paintAvatar } = (await import(
  '/src/player/avatars.ts' as string
)) as typeof import('../../../src/player/avatars.ts');
import type { Mesh } from 'three/webgpu';
await import('/src/debug/dev/buddy-ramp.ts' as string);
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const place = window.__place as unknown as { RACK: { x: number; z: number }; H(x: number, z: number): number };
const rack = { ...place.RACK, y: place.H(place.RACK.x, place.RACK.z) };
const { back } = (await import(
  '/src/proto/place/chop.ts' as string
)) as typeof import('../../../src/proto/place/chop.ts');
if (!me.avatar || !me.body) throw new Error('Buddy unavailable');
me.avatar.traverse((object) => {
  const mesh = object as Mesh;
  if (mesh.isMesh && !Array.isArray(mesh.material) && mesh.material.name === 'M_Main')
    paintAvatar(mesh.material as Parameters<typeof paintAvatar>[0], Number(q.get('paint') ?? 0));
  if (q.get('dark') === '1' && mesh.isMesh && !Array.isArray(mesh.material) && mesh.material.name === 'M_Main') {
    const material = mesh.material as Parameters<typeof paintAvatar>[0];
    material.color.set('#263847');
    material.emissive.copy(material.color);
  }
});
if (q.get('loaded') !== '1') back.logs = 0;
else {
  teleport(me.body, rack.x + 4, rack.y + 1, rack.z + 5);
  me.body.velocity.set(0, 0, 0);
}
// Let the production rig settle into idle/carry before freezing all settings and camera variants.
await new Promise((resolve) => setTimeout(resolve, 1800));
if (q.get('loaded') === '1') {
  back.logs = 16;
  await new Promise((resolve) => setTimeout(resolve, 200));
}
console.log(
  'RAMP FIXTURE ' +
    JSON.stringify({ logs: back.logs, rack: [rack.x, rack.y, rack.z], player: { ...me.body.position } }),
);
export {};
