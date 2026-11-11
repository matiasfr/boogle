// Focused evidence through the existing look/playthrough broker. Synthetic setup is logged separately from input travel.
// &auditRegion=T3|stack &auditView=contact|topdown|play. No recovery teleport is allowed during the travel leg.
const q = new URLSearchParams(location.search);
const region = q.get('auditRegion') ?? 'T3';
const view = q.get('auditView') ?? 'contact';
if (!['T3', 'stack'].includes(region)) throw new Error(`Unknown audit region ${region}`);
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { prepareDevStage } = (await import(
  '/src/proto/place/panel.ts' as string
)) as typeof import('../../../src/proto/place/panel.ts');
const { job, save } = (await import(
  '/src/proto/place/job.ts' as string
)) as typeof import('../../../src/proto/place/job.ts');
const { techApi: tech } = (await import(
  '/src/proto/place/tech.ts' as string
)) as typeof import('../../../src/proto/place/tech.ts');
const { syncControls } = (await import(
  '/src/proto/place/moves.ts' as string
)) as typeof import('../../../src/proto/place/moves.ts');
const { L1 } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { ORIGIN, LINES, lineAt, railY } = (await import(
  '/src/place/layout.ts' as string
)) as typeof import('../../../src/place/layout.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { playMark } = (await import('/src/proto/mark.ts' as string)) as typeof import('../../../src/proto/mark.ts');
const { gettingItem } = (await import(
  '/src/proto/place/got.ts' as string
)) as typeof import('../../../src/proto/place/got.ts');
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
while (!me.body) await wait(80);
const body = me.body;
const pose = () => ({ x: body.position.x, y: body.position.y, z: body.position.z });
const mark = (what: string, details: unknown = {}) => console.log(`AUDIT ${what} ${JSON.stringify(details)}`);
const setup = region === 'T3' ? 'path' : 'head';
prepareDevStage(setup);
if (region === 'stack') job.ended = true; // explicitly synthetic enabled secret, never represented as earned progress
save();
syncControls();
await wait(1200);
const st = L1.stations.find((s) => s.spec.id === 'T3');
const secret = tech.SECRETS.find((s) => s.id === 'stack');
const pad = tech.PADS.find((p) => p.id === 'stack');
if (!st || !secret || !pad) throw new Error('Missing source-owned audit target');
const start =
  region === 'T3'
    ? { x: st.x + 3, y: H(st.x + 3, st.z - 10) + 1.2, z: st.z - 10 }
    : { x: ORIGIN.x + secret.from.x, y: (secret.from.y ?? 24.3) + 1.2, z: secret.from.z };
const target = region === 'T3' ? { x: st.x, y: st.y, z: st.z } : { x: ORIGIN.x + pad.x, y: pad.top, z: pad.z };
mark('SYNTHETIC_SETUP', { region, stage: setup, ended: job.ended, abilities: job.tech, line1Open: L1.open });
mark('SETUP_TELEPORT', { from: pose(), to: start, excludedFromTravel: true });
teleport(body, start.x, start.y, start.z);
body.velocity.set(0, 0, 0);
await wait(900);
const face = (x: number, z: number) => {
  cam.yaw = me.yaw = Math.atan2(-(x - body.position.x), -(z - body.position.z));
};
face(target.x, target.z);
cam.pitch = -0.15;
mark('STATE_READY', { region, player: pose(), target, abilities: job.tech, ended: job.ended });
const label = document.createElement('div');
label.dataset.tool = 'placement-audit';
label.style.cssText =
  'position:fixed;left:8px;bottom:8px;background:#111e;color:white;padding:8px;font:12px monospace;z-index:9999';
label.textContent = `${region} | SYNTHETIC ${setup}${region === 'stack' ? ' + ended' : ''} | one setup teleport | no recovery teleport`;
document.body.append(label);
if (view !== 'play') {
  const camera: [number, number, number] =
    view === 'topdown'
      ? [target.x, target.y + (region === 'stack' ? 75 : 40), target.z + 0.01]
      : [target.x + (region === 'stack' ? 22 : 13), target.y + (region === 'stack' ? 10 : 7), target.z + 17];
  setTimeout(() => window.__debugCam!.set(camera, [target.x, target.y, target.z], 48), 650);
} else {
  setTimeout(() => window.__debugCam!.clear(), 650);
  const bot = makeBot(); // deliberately no recover callback
  const checkpoint = (name: string) => {
    save();
    playMark(`placement ${region} ${name}`);
    mark(name, { player: pose() });
  };
  const key = async (code: string) => {
    mark('INPUT', { code, player: pose() });
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
    await wait(60);
    window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
  };
  let discontinuities = 0;
  let wet = false;
  let previous = pose();
  const trace = setInterval(() => {
    const current = pose();
    if (Math.hypot(current.x - previous.x, current.y - previous.y, current.z - previous.z) > 12) {
      discontinuities++;
      mark('UNEXPECTED_DISCONTINUITY', { from: previous, to: current });
    }
    if (me.swimming && !wet) mark('WATER_CONTACT_NO_RECOVERY', current);
    wet ||= me.swimming;
    previous = current;
  }, 100);
  void (async () => {
    let approached: boolean;
    let returned = false;
    try {
      bot.note(`${region}: synthetic setup complete; approach starts; setup teleport excluded`);
      checkpoint('approach start');
      if (region === 'T3') {
        approached = await bot.walk(st.x, st.z, 2.8, { limit: 20000 });
        bot.check('T3 approach reaches receiver frontage', approached);
        checkpoint(approached ? 'contact' : 'approach failed');
        returned = await bot.walk(start.x, start.z, 1.2, { limit: 20000 });
      } else {
        face(target.x, target.z);
        input.keys.add('KeyW');
        const left = await bot.until(() => me.coyote <= 0, 5000, 'left the trestle for the stack');
        await wait(150);
        await key('KeyQ');
        bot.check('registered glide input opens canopy', tech.move.open);
        const deadline = performance.now() + 15000;
        while (left && me.coyote <= 0 && !me.swimming && performance.now() < deadline) {
          face(target.x, target.z);
          await wait(40);
        }
        input.keys.delete('KeyW');
        await wait(500);
        approached =
          Math.abs(body.position.x - target.x) <= pad.hx &&
          Math.abs(body.position.z - target.z) <= pad.hz &&
          Math.abs(body.position.y - pad.top - 0.7) < 1.5 &&
          !me.swimming;
        bot.check('stack contact lies on the actual pad', approached);
        checkpoint(approached ? 'contact' : 'approach failed');
        if (approached) {
          // The helmet's crate stands mid-pad: bump it, read the card, put it away. The card holds you and takes no other key.
          await bot.straight(target.x, target.z, 0.9, 2500);
          const awarded = await bot.until(gettingItem, 3000, 'the helmet is awarded on the stack');
          await wait(2200);
          await key('KeyF');
          bot.check('the hook does not skip the reward card', gettingItem() && !tech.move.pull);
          await key('KeyE');
          await wait(300);
          bot.check('Interact puts the reward card away', awarded && !gettingItem());
          checkpoint('reward put away');
          const ring = tech.RINGS.find((r) => r.pad.id === 'stack-return');
          if (!ring) throw new Error('Missing stack-return ring');
          face(ring.at.x, ring.at.z);
          cam.pitch = Math.min(
            0.85,
            Math.atan2(ring.at.y - (body.position.y + 1.35), bot.dist(ring.at.x, ring.at.z)) - 0.3,
          );
          // The reward's camera is still easing back: wait until the ring is the one on offer, as a person looking at it does.
          await bot.until(() => tech.move.pick === ring, 3000, 'the return ring is on offer');
          mark('RETURN_AIM', { picked: tech.move.pick?.pad.id, rejection: tech.whyNot(ring), player: pose() });
          await key('KeyF');
          const pulling = !!tech.move.pull;
          bot.check('registered hook input starts stack return', pulling);
          await bot.until(() => !tech.move.pull, 5000, 'stack return hook finishes');
          const point = { x: 0, z: 0, ux: 0, uz: 1 };
          lineAt(LINES.east, 477, point);
          returned = pulling && (await bot.walk(point.x + ORIGIN.x, point.z, 1.2, { limit: 12000 }));
          returned &&= Math.abs(body.position.y - railY(LINES.east, 477)) < 2;
        }
      }
      bot.check(`${region} return reaches safe approach route`, returned);
      checkpoint(returned ? 'returned' : 'return failed');
      bot.check('travel has no water contact or unexpected teleport', !wet && discontinuities === 0);
      mark('RESULT', { region, approached, returned, wet, discontinuities, setupTeleports: 1, recoveryTeleports: 0 });
      bot.finish(
        `${region}: approached=${approached}, returned=${returned}, water=${wet}, unexpectedDiscontinuities=${discontinuities}`,
      );
    } catch (error) {
      bot.never(String(error));
      mark('ERROR', String(error));
      bot.finish(`${region} failed with error`);
    } finally {
      clearInterval(trace);
      input.keys.delete('KeyW');
    }
  })();
}
export {};
