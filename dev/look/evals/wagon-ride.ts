// Film the wagon's riding variants (src/proto/wagon/show.ts, bench.ts, snatch.ts) from the deck, inside the playlist:
//   echo "return await (await import('/dev/look/evals/wagon-ride.ts')).run()" > e.js
//   BOOGLE_QUERY='play=wagon:show&wr=crane' npm run look -- --eval e.js --warm 2 --seconds 8 --frames 12
// (standalone works too: proto=wagon&laid=3&v=show&wr=crane). You stand on the middle flatbed, the game's camera behind
// you turned to the shot's side. wr= (the shot):
//   crane    just leaving the first stop, outbound: the jib swings over the line ahead
//   gulls    outbound, leaving the third stop: the gulls lift
//   figure   returning, leaving the third stop: the figure waves and loses their hat
//   quiet    outbound, the stretch with nothing on it
//   sit      seated on the bench, side= (1 or -1), running outbound; wr=sit&panned=1 pans the look 60° after 1 s
//   grab     outbound before the arm; presses Interact when the prompt shows (&hold=0: never, and you ride past)
//   throw    with the bag on your shoulder, before the hopper; throws when it's about tossat= m ahead (default 3.5)
// wait=<s> reports the toy's score after that long instead (grabs, whiffs, bags in). lx= stands you that far across the deck (+: the arm's side). d= overrides how far along the line (m) the shot starts; wide=1 puts a fixed camera beside the line instead.
import { me, cam } from '../../../src/player/player.ts';
import { carry } from '../../../src/physics/platforms.ts';
import { teleport } from '../../../src/physics/physics.ts';
import { groundHeight } from '../../../src/island/terrain.ts';
import { interactTarget } from '../../../src/player/hands.ts';
import { wagonAt, wagonCycle } from '../../../src/sim/wagon.ts';
import { ROUTE } from '../../../src/sim/route.ts';

type Win = {
  __debugCam: { set(c: number[], l: number[], fov?: number | null): void; clear(): void };
  __wagon: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
const win = window as unknown as Win;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const until = async (fn: () => unknown, ms = 10000) => {
  for (const t0 = performance.now(); !fn() && performance.now() - t0 < ms;) await sleep(50);
  return fn();
};

export async function run() {
  const q = new URLSearchParams(location.search);
  const num = (k: string, d: number) => (q.has(k) ? Number(q.get(k)) : d);
  const shot = q.get('wr') ?? 'crane';
  if (!(await until(() => win.__wagon?.state, 15000)))
    throw new Error('no wagon running: on the wagon step, or laid=3');
  const W = win.__wagon;
  await until(() => me.entered && me.body);
  await sleep(900); // past the playlist's own boarding

  // The timetable's phase where the train is `d` m along the line going `dir`.
  const pace = W.pace,
    n = ROUTE.length,
    cyc = wagonCycle(n, pace);
  const phaseAt = (d: number, dir: number) => {
    for (let p = 0; p < cyc; p++) {
      const s = wagonAt(n, p, 0, pace)!;
      if (s.stop < 0 && Math.sign(s.speed) === dir && s.dist / 100 >= d - 0.3 && s.dist / 100 <= d + 0.3) return p;
    }
    throw new Error(`no phase at ${d} going ${dir}`);
  };
  const stand = (yawOff: number) => {
    const c = W.cars[1],
      p = c.body.position,
      yaw = c.mesh.rotation.y,
      v = c.body.velocity;
    const lx = num('lx', 0); // across the deck: + the sea side at home (the arm's), - the far edge
    teleport(me.body!, p.x + lx * Math.cos(yaw), p.y + c.hy + 0.55, p.z - lx * Math.sin(yaw));
    me.body!.velocity.set(v.x, 0, v.z);
    carry.x = v.x;
    carry.z = v.z;
    me.yaw = yaw + Math.PI;
    cam.yaw = yaw + Math.PI + yawOff;
    cam.pitch = -0.18;
  };
  const starts: Record<string, [number, number, number]> = {
    // d, dir, the camera's turn off the way the train's facing
    crane: [1.5, 1, 0.5],
    gulls: [36.3, 1, 0.75],
    figure: [35.7, -1, -0.5],
    quiet: [22, 1, 0.75],
    sit: [19, 1, 0],
    grab: [19, 1, 0.5],
    throw: [26, 1, 0.8],
  };
  const [d0, dir, turn] = starts[shot];
  W.seekPhase(phaseAt(num('d', d0), dir));
  await sleep(150);
  stand(dir > 0 ? turn : Math.PI + turn);
  await sleep(100);
  const log: string[] = [];
  if (shot === 'sit') {
    const k = num('car', 1);
    // sitin=<ms>: stand that long first, to film the camera easing round
    setTimeout(() => W.bench.sit(k, num('side', 1)), num('sitin', 0));
    if (q.has('panned')) setTimeout(() => (cam.yaw += 1.05), 1000);
  }
  if (shot === 'grab' && q.get('hold') !== '0')
    void until(() => interactTarget()?.id === 'wagon-grab', 15000).then(() => {
      log.push('pressed at ' + (W.state.dist / 100).toFixed(1));
      interactTarget()?.run?.();
    });
  if (shot === 'throw') {
    // the bag on your shoulder; with the hopper `tossat` m ahead along the line, aim at its mouth and throw
    W.snatch.giveBag();
    const lead = num('tossat', 3);
    void until(() => W.state.dist / 100 + W.cars[1].off >= 33 - lead, 20000).then(() => {
      const m = W.snatch.mouth,
        p = me.body!.interpolatedPosition;
      cam.yaw = Math.atan2(-(m.x - p.x), -(m.z - p.z));
      cam.pitch = num('tosspitch', -0.2);
      log.push('thrown at ' + (W.state.dist / 100).toFixed(1));
      setTimeout(() => W.snatch.throwBag(), 150);
    });
  }
  // after the harness places its own frozen camera
  setTimeout(() => {
    if (q.get('wide') !== '1') return win.__debugCam.clear();
    const a = ROUTE[1];
    const y = groundHeight(a.x, a.z);
    win.__debugCam.set([a.x - 18, y + 9, a.z], [a.x, y + 1, a.z]);
  }, 400);
  // wait=<s>: stay here that long (no filming needed) and report how it went
  if (q.has('wait')) {
    await sleep(num('wait', 8) * 1000);
    return JSON.stringify({ shot, log, snatch: W.snatch.state, seated: W.bench.seated });
  }
  return JSON.stringify({ shot, dist: W.state.dist, scenes: W.show.scenes() });
}
