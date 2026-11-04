// Two actual clients on the default main game. Stage the job, then use its interactions.
// DESIGN.md 4: cooperation is automatic; 10: slapstick over precision.
import type { ClipGame, Shot } from '../clip.ts';
import { PRE, record, requireState } from './round4.ts';

async function press(g: ClipGame, verb: string) {
  await g.eval(`const h=await import('/src/player/hands.ts');
    if(h.interactTarget()?.verb !== ${JSON.stringify(verb)})
      throw new Error('Expected ${verb}, got '+h.interactTarget()?.verb);
    h.interactDown();h.interactUp();`);
}

async function ready(g: ClipGame, expression: string) {
  if ((await g.waitFor(expression, { timeout: 45000 })) < 0) throw new Error(`Timed out: ${expression}`);
}

// A recording advances both page clocks one frame at a time. The WebSocket server remains real.
async function pause(g: ClipGame) {
  if (g.paused) return;
  await g.page.clock.pauseAt((await g.page.evaluate(() => Date.now())) + 2000);
  g.paused = true;
}

export default {
  about: 'Two players split the forge/frontier work, then launch each other on the see-saw',
  query: 'classic=0',
  async run(c) {
    const out = [];
    const selected = process.env.ROUND4_SHOTS?.split(',');
    for (const scene of ['split', 'seesaw']) {
      if (selected && !selected.includes(scene)) continue;
      const a = await c.open({ name: 'Pip', room: `r4-pair-${scene}`, hud: 'play' });
      const b = await c.open({ name: 'Nell', room: `r4-pair-${scene}`, hud: 'play' });
      for (const g of [a, b]) {
        await ready(g, 'window.__place?.coop.debug().peers.length > 0');
        await g.page.addStyleTag({ content: '.place-objective,.place-proto {display:none !important}' });
        await g.eval(`${PRE} P.day.hold=true;P.day.u=0.26;`);
      }
      await a.wait(2);
      const authority = (await a.eval(`${PRE} return P.coop.debug().amAuthority;`)) ? a : b;

      if (scene === 'seesaw') {
        // An already-built see-saw is the starting beat; the launch must come from a real partner landing.
        for (const g of [a, b])
          await g.eval(`${PRE}
          const {BEAM}=await import('/src/proto/place/pair.ts');
          window.__beamSetup=()=>{
            P.skipPath();
            Object.assign(P.job.longBeam,{x:P.ORIGIN.x+BEAM.site.x,z:BEAM.site.z,yaw:0,set:true});
          };
          P.coop.skips({videoBeam:window.__beamSetup});`);
        await authority.eval(`${PRE} P.coop.skip('videoBeam',window.__beamSetup);`);
        for (const [i, g] of [a, b].entries()) {
          await ready(g, 'window.__place.job.longBeam.set');
          await g.eval(`${PRE} const {beamPad}=await import('/src/proto/place/pair.ts');
            const p=beamPad(${i});put(p.x,p.y+1.2,p.z);
            window.__peak=0;`);
        }
        await a.wait(2);
        const beam = await a.eval(`${PRE} const b=P.job.longBeam;return [b.x,P.H(b.x,b.z),b.z];`);
        await a.view({ cam: [beam[0] + 12, beam[1] + 7, beam[2] + 5], look: [beam[0], beam[1] + 3, beam[2]] });
        await pause(a);
        await pause(b);
        out.push(
          await record(a, 'seesaw', 8, async (_t, k) => {
            if (k === 15) await a.eval(`const p=await import('/src/entities/player/state.ts');p.pressJump();`);
            if (k === 28) await a.eval(`const p=await import('/src/entities/player/state.ts');p.releaseJump();`);
            await b.page.clock.runFor(1000 / c.fps);
            for (const g of [a, b])
              await g.eval(
                `${PRE} window.__peak=Math.max(window.__peak,me.body.position.y-P.H(me.body.position.x,me.body.position.z));`,
              );
          }),
        );
        await requireState(b, 'window.__peak > 5', 'Partner never launched from the see-saw');
        console.log('seesaw peaks', await a.eval('return window.__peak'), await b.eval('return window.__peak'));
      } else {
        await authority.eval(`${PRE} P.coop.skip('q5',P.skipQ5);`);
        for (const g of [a, b]) await ready(g, "window.__place.activeFrame()?.spec.id === 'Q5'");
        // Stock from an earlier delivery, while another load is fetched at the forge.
        await authority.eval(`${PRE} P.rack.logs=16;const d=await import('/src/proto/place/depot.ts');d.drawRack();`);
        await a.eval(`${PRE} const {TX,TY,TZ}=await import('/src/proto/place/lines.ts');
          put(TX+2,TY+1.2,TZ+1,-Math.PI/2);`);
        await b.eval(`${PRE} const r=P.rack;put(r.x+2.4,r.y+1.2,r.z,Math.PI/2);`);
        await a.wait(2);
        await press(a, 'Whistle for the cart');
        await ready(a, "window.__place.cart.leg === 'forge'");
        await a.eval(`${PRE} const {TX,TY,TZ}=await import('/src/proto/place/lines.ts');
          window.__debugCam.set([TX+7,TY+4,TZ+8],[TX,TY+1,TZ]);`);
        await pause(a);
        await pause(b);
        out.push(
          await record(a, 'split-forge', 6, async (_t, k) => {
            if (k === 15) await press(a, 'Load the cart');
            if (k === 30) await press(b, 'Take from the rack');
            await b.page.clock.runFor(1000 / c.fps);
          }),
        );
        await requireState(b, 'P.back.logs > 0', 'Frontier player did not collect logs');
        await requireState(a, 'P.cart.rails > 0', 'Forge player did not load rails');
        await b.eval(`${PRE} const st=P.activeFrame();const y=P.H(st.x,st.z);
          put(st.x+4,P.H(st.x+4,st.z)+1,st.z,Math.PI/2);
          window.__debugCam.set([st.x+9,y+7,st.z-9],[st.x+1,y+1,st.z]);`);
        out.push(
          await record(b, 'split-frontier', 6, async (_t, k) => {
            if (k === 15) await b.down('KeyW');
            if (k === 45) await b.up('KeyW');
            await a.page.clock.runFor(1000 / c.fps);
          }),
        );
        await requireState(b, 'P.activeFrame().have.logs > 0', 'Frontier deposit did not land');
      }
      for (const g of [a, b]) {
        if (g.healthErrors().length) throw new Error(g.healthErrors().join('; '));
        await requireState(g, 'window.boogle.remotes.size === 1', 'Partner disconnected');
      }
      await a.close();
      await b.close();
    }
    return out;
  },
} satisfies Shot;
