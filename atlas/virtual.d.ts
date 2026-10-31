// `virtual:atlas-facts`: the extracted facts, made by the Vite plugin in dev/atlas/vite-plugin.ts.
declare module 'virtual:atlas-facts' {
  import type { Facts } from './types.ts';
  const facts: Facts;
  export default facts;
}
