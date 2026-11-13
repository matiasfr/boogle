// Load the actual dev tuning controller in an isolated tab context. Only renderer/browser entry points are stubbed;
// the catalog, event recorder, startup gate, command adapter and server are production modules.
import type { TestContext } from 'node:test';
import { registerHooks } from 'node:module';
import type { fixture } from './rail-tune.ts';
import type { TuneFields, TuneRecordKind } from '../../../src/tunables/events.ts';

type Client = ReturnType<Awaited<ReturnType<typeof fixture>>['join']>;
type Context = { client: Client };
const contexts = new Map<string, Context>();
let sequence = 0;
export function panelContext(id: string) {
  const context = contexts.get(id);
  if (!context) throw new Error(`missing panel context ${id}`);
  return context;
}

export async function loadTunePanel(t: TestContext, client: Client) {
  const id = String(++sequence);
  contexts.set(id, { client });
  t.after(() => contexts.delete(id));
  const panelURL = new URL('../../../src/debug/dev/tunables.ts', import.meta.url);
  const eventsURL = new URL('../../../src/tunables/events.ts', import.meta.url);
  // Literal module paths keep the CI closure complete; only their per-tab module-cache identity varies.
  panelURL.searchParams.set('panel-test', id);
  eventsURL.searchParams.set('panel-test', id);
  const context = `import { panelContext } from ${JSON.stringify(import.meta.url)}; const c = panelContext(${JSON.stringify(id)});`;
  const stubs: Record<string, string> = {
    '../../build-id.ts': `export const BUILD_ID='test';`,
    '../../world/game-world.ts': `${context} export const railwayMirror=c.client.mirror; export const railTune=railwayMirror.tune; export const rules={tune:{tune:{v:{},revision:0}}};`,
    '../../entities/railway/state.ts': `${context} export const railwayCommands=()=>c.client.adapter; export const onRailwayCommands=fn=>{fn(railwayCommands());return ()=>{}};`,
    '../../world/sync.ts': `export const world={tick:0}; export const worldStatus=()=>({mode:'client',ready:true}); export const submitEdit=()=>{throw new Error('rail tuning entered lockstep')}; export const onApplied=()=>{}; export const onSnapshot=()=>{}; export const onRejected=()=>{};`,
    '../../netplay/net.ts': `export const getRoomId=()=> 'proto-rail-tune'; export const onNetState=()=>{};`,
    '../../player/state.ts': `export const me={entered:true,body:{position:{x:0,y:0,z:0}}};`,
    '../../entities/player/state.ts': `export const onEntered=()=>{};`,
    '../../render/water/live.ts': `export const bindings=new Map(); export const onChange=()=>{};`,
    '../../render/exposure.ts': `export const exposureSettings={centre:0};`,
    '../../dev-preferences.ts': `export const tuningVisit=true;`,
    '../../render/audio.ts': `export const audioSnapshot=()=>({});`,
    './ui.ts': `export const el=()=>{}; export const button=()=>{}; export const more=()=>{}; export const note=()=>{}; export const download=()=>{};`,
    '../../proto/flags.ts': `export const CARD=null; export const pageQuery=()=>new URLSearchParams(); export const productionRailway=true;`,
  };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (context.parentURL === panelURL.href) {
        if (specifier === '../../tunables/events.ts') return { url: eventsURL.href, shortCircuit: true };
        const source = stubs[specifier];
        if (source)
          return { url: `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`, shortCircuit: true };
      }
      return next(specifier, context);
    },
  });
  const records: { kind: TuneRecordKind; fields: TuneFields }[] = [];
  try {
    const events = (await import(eventsURL.href)) as typeof import('../../../src/tunables/events.ts');
    const off = events.onTuneRecord((kind, fields) => records.push({ kind, fields }));
    t.after(() => {
      off();
    });
    const panel = (await import(panelURL.href)) as typeof import('../../../src/debug/dev/tunables.ts');
    panel.applyTuneQuery();
    return { panel, records };
  } finally {
    hooks.deregister();
  }
}
