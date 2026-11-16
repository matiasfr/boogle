// npm run look -- --rail-seed q1-done --query grantStation=Q2 --action dev/look/evals/grant-station.ts --warm 1 --frames 2 --seconds 0.2 --name grant-c4-q2
// Action for C4: a player's approach along the line, looking over the receiver at its existing bill.
const { LINKS } = await import('/src/place/layout.ts' as string);
const { frameBesideLine } = await import('/src/place/spatial-station.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const { me } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const id = new URLSearchParams(location.search).get('grantStation') ?? 'T1';
const line = LINKS.find((l: { stations: { id: string }[] }) => l.stations.some((s) => s.id === id));
const spec = line.stations.find((s: { id: string }) => s.id === id);
const p = frameBesideLine(spec, line.line, line.dir);
while (!me.body) await new Promise((r) => setTimeout(r, 50));
const x = p.x - Math.sin(p.yaw) * line.dir * 7 + p.lx * 2;
const z = p.z - Math.cos(p.yaw) * line.dir * 7 + p.lz * 2;
teleport(me.body, x, H(x, z) + 0.6, z);
me.body.velocity.set(0, 0, 0);
await new Promise((r) => setTimeout(r, 500));
window.__debugCam?.set([x, H(x, z) + 2.2, z], [p.x, H(p.x, p.z) + 1.7, p.z]);
console.log(`GRANT station ${id}: ${spec.label}`);
export {};
