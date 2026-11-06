// The default game at round four, without proto/play flags. DESIGN.md 11: Show, don't tell.
// Reuse the look harness's staged beats, then exercise the real controls and physics.
// ROUND4_SHOTS=path,axe,... selects clips for reframing without repeating the whole shoot.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import type { ClipGame, Shot } from '../clip.ts';

export const PRE = `const P = window.__place;
  const { me, cam } = await import('/src/player/player.ts');
  const { teleport } = await import('/src/physics/engine.ts');
  const put = (x,y,z,yaw=0) => {
    teleport(me.body,x,y,z); me.body.velocity.set(0,0,0); cam.yaw=me.yaw=yaw;
  };`;

export async function requireState(g: ClipGame, expr: string, label: string) {
  if (!(await g.eval(`${PRE} return !!(${expr});`))) throw new Error(label);
}

async function stage(g: ClipGame, kind: 'job' | 'tech') {
  const source = readFileSync(new URL(`../../look/evals/place-${kind}.ts`, import.meta.url), 'utf8');
  await g.eval(stripTypeScriptTypes(source).replace(/export\s*\{\s*\};?/, ''));
  await g.wait(1);
}

export async function record(
  g: ClipGame,
  name: string,
  seconds: number,
  each?: (t: number, k: number) => Promise<void>,
) {
  const before = await g.eval('return window.boogle.prof.last.frames');
  const result = await g.record(`r4-${name}`, { seconds, each });
  await requireState(g, `window.boogle.prof.last.frames > ${before}`, `${name}: renderer stopped`);
  const errors = g.healthErrors();
  if (errors.length) throw new Error(`${name}: ${errors.join('; ')}`);
  console.log(`${name}: WebGPU, advancing completed frames, no page/console errors`);
  return result;
}

export default {
  about: 'Round 4: walk first, earn better tools, find abilities, enter town, ride late, play together',
  // The default route: the current game, as the bare address opens it.
  query: '',
  async run(c) {
    const out = [];
    const selected = process.env.ROUND4_SHOTS?.split(',');
    const wants = (name: string) => !selected || selected.includes(name);
    const open = async (name: string, query = '') => {
      const g = await c.open({ name: 'Pip', room: `r4-${name}`, query, hud: 'play' });
      if ((await g.waitFor('window.__place?.tech && window.boogle.me.body')) < 0)
        throw new Error(`${name}: default game did not load`);
      await requireState(
        g,
        `!new URLSearchParams(location.search).has('proto') && P.coop.on`,
        'not the default co-op game',
      );
      await g.page.addStyleTag({ content: '.place-objective, .place-proto { display:none !important }' });
      await g.eval(`${PRE} P.day.hold = true; P.day.u = 0.26;`);
      return g;
    };

    if (wants('path')) {
      const g = await open('path');
      await g.eval(`${PRE} P.skipPath(); P.job.chest=null;
        const {lineAt,railY}=await import('/src/proto/place/layout.ts');
        const l=P.lines[0].spec.line, p={}; lineAt(l,85,p);
        put(P.ORIGIN.x+p.x,railY(l,85)+1,p.z,Math.atan2(-p.ux,-p.uz));`);
      await g.wait(2);
      out.push(
        await record(g, 'path', 8, async (_t, k) => {
          if (k === 20) await g.down('KeyW');
          if (k === 200) await g.up('KeyW');
          const p = await g.eval(`${PRE} return [me.body.position.x,me.body.position.y,me.body.position.z];`);
          await g.view({ cam: [p[0] + 13, p[1] + 8, p[2] + 15], look: [p[0], p[1], p[2]] });
        }),
      );
      await requireState(g, 'P.lines[0].open && !P.job.rung.trains && me.body.position.y > 22', 'path crossing failed');
      await g.close();
    }

    for (const name of ['axe', 'pack', 'jump', 'doublejump', 'climb', 'glide', 'shop', 'museum', 'train']) {
      if (!wants(name)) continue;
      const tech = ['jump', 'doublejump', 'climb', 'glide'].includes(name);
      const query =
        name === 'shop'
          ? 'shot=press&in=shop&stand=1.8,-1.9&face=3.8,-1.9&press=2'
          : name === 'museum'
            ? 'shot=roomcam&in=museum&cam=0,4.2,4.5&at=0,1,-1&stand=4,0,2'
            : `shot=${name === 'train' ? 'pet' : name}`;
      const g = await open(name, query);
      await stage(g, tech ? 'tech' : 'job');
      if (name === 'climb')
        await g.eval(`${PRE} window.__techAct=async()=>{
        const r=P.tech.RINGS.find(r=>r.pad.id==='t1'), b=me.body.position;
        cam.yaw=me.yaw=Math.atan2(-(r.at.x-b.x),-(r.at.z-b.z));
        cam.pitch=Math.min(.85,Math.atan2(r.at.y-(b.y+1.35),Math.hypot(r.at.x-b.x,r.at.z-b.z))-.3);
        await new Promise(resolve=>setTimeout(resolve,320)); P.tech.fireHook();
      };`);
      const seconds = name === 'climb' ? 4.5 : name === 'glide' ? 9 : 6;
      out.push(
        await record(g, name, seconds, async (_t, k) => {
          if (k === 15) await g.eval(`void window.${tech ? '__techAct' : '__placeAct'}?.();`);
          if (name === 'climb') await g.view({ cam: [985, 35, 20], look: [1000, 31, 3] });
          if (name === 'pack' && k === 30) await g.down('KeyW');
          if (name === 'pack' && k === 70) await g.up('KeyW');
        }),
      );
      const payoff: Record<string, string> = {
        axe: 'P.back.logs === 8 && P.job.rung.axe === 1',
        pack: 'P.back.logs === 16 && P.job.rung.pack === 1',
        jump: 'P.job.tech.jump',
        doublejump: 'P.tech.move.jumps > 0',
        climb: 'P.tech.move.pulls > 0 && me.body.position.y > 37',
        glide: 'P.tech.move.open && P.tech.move.holding',
        shop: "P.town.indoors.inside?.id === 'shop' && P.giftState.bought.length > 0",
        museum: "P.town.indoors.inside?.id === 'museum'",
        train: 'P.job.rung.trains',
      };
      await requireState(g, payoff[name]!, `${name}: payoff did not happen`);
      console.log(name, await g.eval(`${PRE} return {position:me.body.position,tech:P.job.tech,rung:P.job.rung};`));
      await g.close();
    }
    return out;
  },
} satisfies Shot;
